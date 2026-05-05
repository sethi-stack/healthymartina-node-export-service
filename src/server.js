const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const PORT = Number(process.env.PORT || 4300);
const EXPORT_SHARED_SECRET = process.env.EXPORT_SHARED_SECRET || '';
const MAX_CONCURRENCY = Math.max(1, Number(process.env.EXPORT_MAX_CONCURRENCY || 2));
const JOB_TIMEOUT_MS = Math.max(30_000, Number(process.env.EXPORT_JOB_TIMEOUT_MS || 180_000));
const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || path.join(__dirname, '..', 'storage'));

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

const app = express();
app.use(express.json({ limit: '10mb', verify: rawBodySaver }));

const jobs = new Map();
const queue = [];
let activeWorkers = 0;

function rawBodySaver(req, _res, buf) {
  req.rawBody = buf;
}

function signPayload(ts, rawBody) {
  const payload = `${ts}.${rawBody.toString('utf8')}`;
  return crypto.createHmac('sha256', EXPORT_SHARED_SECRET).update(payload).digest('hex');
}

function timingSafeEq(a, b) {
  const aBuf = Buffer.from(a || '', 'utf8');
  const bBuf = Buffer.from(b || '', 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function requireSignedRequest(req, res, next) {
  if (!EXPORT_SHARED_SECRET) {
    return res.status(500).json({ success: false, error: 'Service misconfigured: missing secret' });
  }

  const timestamp = req.header('X-Export-Timestamp');
  const signature = req.header('X-Export-Signature');

  if (!timestamp || !signature || !req.rawBody) {
    return res.status(401).json({ success: false, error: 'Missing signature headers' });
  }

  const now = Math.floor(Date.now() / 1000);
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > 300) {
    return res.status(401).json({ success: false, error: 'Timestamp outside accepted window' });
  }

  const expected = signPayload(timestamp, req.rawBody);
  if (!timingSafeEq(signature, expected)) {
    return res.status(401).json({ success: false, error: 'Invalid signature' });
  }

  next();
}

app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    active_workers: activeWorkers,
    queued_jobs: queue.length,
    max_concurrency: MAX_CONCURRENCY,
  });
});

app.post('/jobs', requireSignedRequest, (req, res) => {
  const body = req.body || {};
  if (!body.job_id || !body.user_id || !body.calendar_id || !body.payload) {
    return res.status(422).json({
      success: false,
      error: 'job_id, user_id, calendar_id and payload are required',
    });
  }

  const existing = jobs.get(body.job_id);
  if (existing) {
    return res.status(200).json({ success: true, job_id: existing.id, status: existing.status });
  }

  const job = {
    id: body.job_id,
    userId: Number(body.user_id),
    calendarId: Number(body.calendar_id),
    payload: body.payload,
    status: 'queued',
    progress: 0,
    error_message: null,
    file_path: null,
    file_size: null,
    metrics: {
      queued_at: Date.now(),
      started_at: null,
      completed_at: null,
      generation_ms: null,
      upload_ms: null,
      total_ms: null,
    },
  };

  jobs.set(job.id, job);
  queue.push(job.id);
  processQueue();

  return res.status(202).json({ success: true, job_id: job.id, status: job.status });
});

app.get('/jobs/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  return res.json({
    success: true,
    job_id: job.id,
    status: job.status,
    progress: job.progress,
    error_message: job.error_message,
    file_path: job.file_path,
    file_size: job.file_size,
    metrics: job.metrics,
  });
});

app.get('/jobs/:jobId/download', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ success: false, error: 'Job not found' });
  }

  if (job.status !== 'completed' || !job.file_path) {
    return res.status(409).json({ success: false, error: 'Job not completed yet' });
  }

  const abs = path.resolve(job.file_path);
  if (!fs.existsSync(abs)) {
    return res.status(410).json({ success: false, error: 'Export file no longer available' });
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="calendar-${job.calendarId}.pdf"`);
  return fs.createReadStream(abs).pipe(res);
});

function processQueue() {
  while (activeWorkers < MAX_CONCURRENCY && queue.length > 0) {
    const nextJobId = queue.shift();
    const job = jobs.get(nextJobId);
    if (!job || job.status !== 'queued') {
      continue;
    }

    activeWorkers += 1;
    runJob(job)
      .catch((err) => {
        job.status = 'failed';
        job.error_message = err.message || 'Unknown error';
      })
      .finally(() => {
        activeWorkers -= 1;
        processQueue();
      });
  }
}

async function runJob(job) {
  job.status = 'processing';
  job.progress = 10;
  job.metrics.started_at = Date.now();

  const started = Date.now();
  const generationStarted = Date.now();

  const pdfBuffer = await withTimeout(generatePdf(job), JOB_TIMEOUT_MS, 'PDF generation timed out');

  job.metrics.generation_ms = Date.now() - generationStarted;
  job.progress = 80;

  const uploadStarted = Date.now();
  const { filePath, fileSize } = await uploadPdf(job, pdfBuffer);
  job.metrics.upload_ms = Date.now() - uploadStarted;

  job.file_path = filePath;
  job.file_size = fileSize;
  job.status = 'completed';
  job.progress = 100;
  job.metrics.completed_at = Date.now();
  job.metrics.total_ms = Date.now() - started;
}

async function generatePdf(job) {
  // Placeholder generation so backend integration can proceed immediately.
  // Replace this with Playwright/Puppeteer render+merge implementation.
  const text = [
    '%PDF-1.1',
    '% Stub PDF generated by external export service',
    `Job: ${job.id}`,
    `Calendar: ${job.calendarId}`,
    `Template: ${job.payload?.template || 'unknown'}`,
    '%%EOF',
  ].join('\n');

  await sleep(1200);
  return Buffer.from(text, 'utf8');
}

async function uploadPdf(job, pdfBuffer) {
  const filename = `${job.id}-${uuidv4()}.pdf`;
  const filePath = path.join(STORAGE_DIR, filename);
  await fs.promises.writeFile(filePath, pdfBuffer);

  return {
    filePath,
    fileSize: pdfBuffer.length,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PDF export service listening on http://localhost:${PORT}`);
});
