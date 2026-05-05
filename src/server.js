require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const puppeteer = require('puppeteer');
const { v4: uuidv4 } = require('uuid');
const { renderLegacyBoldDocument } = require('./templates/legacy');

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
  const { html, model } = renderLegacyBoldDocument(job);
  job.rendered_model = model;
  job.rendered_html_bytes = Buffer.byteLength(html, 'utf8');

  if (process.env.EXPORT_WRITE_HTML_DEBUG === 'true') {
    const debugPath = path.join(STORAGE_DIR, `${job.id}.html`);
    await fs.promises.writeFile(debugPath, html, 'utf8');
    job.rendered_html_path = debugPath;
  }

  try {
    return await renderHtmlToPdf(html);
  } catch (error) {
    job.render_error = error.message;
    if (String(process.env.EXPORT_ALLOW_PDFKIT_FALLBACK || 'false') === 'true') {
      return buildPdfFromPayload(job);
    }
    throw new Error(`HTML render failed: ${error.message}`);
  }
}

async function renderHtmlToPdf(html) {
  const renderTimeoutMs = Number(process.env.EXPORT_HTML_RENDER_TIMEOUT_MS || 120000);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: renderTimeoutMs,
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(renderTimeoutMs);
    page.setDefaultTimeout(renderTimeoutMs);

    // `networkidle0` can hang with remote assets; `domcontentloaded` is safer for HTML-to-PDF.
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: renderTimeoutMs });
    await sleep(1200);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

function buildPdfFromPayload(job) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Calendar ${job.calendarId}` } });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    const payload = job.payload || {};
    const snapshot = payload.calendar_snapshot || {};
    const labels = snapshot.labels || {};
    const dayLabels = labels.days || {};
    const mealLabels = labels.meals || {};
    const exportParams = Array.isArray(payload.export_param) ? payload.export_param : [];
    const mainSchedule = snapshot.main_schedule || {};
    const sidesSchedule = snapshot.sides_schedule || {};
    const recipeIds = Array.isArray(snapshot.recipe_ids) ? snapshot.recipe_ids : [];

    const theme = {
      primary: '#D64550',
      primaryDark: '#A9313A',
      surface: '#FAF3F3',
      ink: '#1F2430',
      muted: '#667085',
      line: '#EAD4D6',
    };

    drawCover(doc, theme, {
      title: snapshot.title || 'Calendario',
      template: payload.template || 'bold',
      exportParams,
      generatedAt: new Date().toISOString(),
    });

    drawSummary(doc, theme, {
      calendarId: job.calendarId,
      userId: job.userId,
      recipeCount: recipeIds.length,
      selectedCount: Array.isArray(payload.selected_recipes) ? payload.selected_recipes.length : 0,
      heroRecipeId: payload.hero_recipe_id || 'none',
    });

    doc.addPage();
    drawHeaderBand(doc, theme, 'Calendario Semanal');

    const dayKeys = Object.keys(mainSchedule);
    if (dayKeys.length === 0) {
      doc.fillColor(theme.ink).fontSize(11).text('No schedule data available in payload.', 48, 140);
    } else {
      drawCalendarCards(doc, theme, dayKeys, dayLabels, mealLabels, mainSchedule, sidesSchedule);
    }

    doc.end();
  });
}

function drawCover(doc, theme, info) {
  doc.rect(0, 0, doc.page.width, 240).fill(theme.surface);
  doc.rect(0, 0, 20, doc.page.height).fill(theme.primary);

  doc.fillColor(theme.primaryDark).fontSize(14).text('Healthy Martina', 48, 54);
  doc.fillColor(theme.ink).fontSize(30).text(info.title, 48, 84, { width: 500 });
  doc.fillColor(theme.muted).fontSize(11).text(`Template: ${info.template}`, 48, 150);
  doc.text(`Generated: ${info.generatedAt}`, 48, 168);
  doc.text(`Export sections: ${info.exportParams.join(', ') || 'none'}`, 48, 186);
}

function drawSummary(doc, theme, meta) {
  const top = 270;
  const left = 48;
  const gap = 14;
  const cardW = (doc.page.width - 96 - gap) / 2;
  const cardH = 86;

  const cards = [
    ['Calendar ID', String(meta.calendarId)],
    ['User ID', String(meta.userId)],
    ['Recipes in Calendar', String(meta.recipeCount)],
    ['Selected Recipes', String(meta.selectedCount)],
  ];

  cards.forEach((card, idx) => {
    const row = Math.floor(idx / 2);
    const col = idx % 2;
    const x = left + col * (cardW + gap);
    const y = top + row * (cardH + gap);
    doc.roundedRect(x, y, cardW, cardH, 8).fillAndStroke('#FFFFFF', theme.line);
    doc.fillColor(theme.primaryDark).fontSize(10).text(card[0], x + 14, y + 14);
    doc.fillColor(theme.ink).fontSize(18).text(card[1], x + 14, y + 34);
  });

  doc.fillColor(theme.primaryDark).fontSize(10).text('Hero Recipe ID', left, top + 2 * (cardH + gap) + 8);
  doc.fillColor(theme.ink).fontSize(14).text(String(meta.heroRecipeId), left, top + 2 * (cardH + gap) + 24);
}

function drawHeaderBand(doc, theme, title) {
  doc.rect(0, 0, doc.page.width, 82).fill(theme.surface);
  doc.rect(0, 0, 20, 82).fill(theme.primary);
  doc.fillColor(theme.primaryDark).fontSize(21).text(title, 48, 32);
}

function drawCalendarCards(doc, theme, dayKeys, dayLabels, mealLabels, mainSchedule, sidesSchedule) {
  let y = 112;
  const x = 48;
  const width = doc.page.width - 96;

  dayKeys.forEach((dayKey) => {
    const meals = mainSchedule[dayKey] || {};
    const mealEntries = Object.keys(meals);
    const cardH = 44 + mealEntries.length * 18;

    if (y + cardH > doc.page.height - 70) {
      doc.addPage();
      drawHeaderBand(doc, theme, 'Calendario Semanal');
      y = 112;
    }

    doc.roundedRect(x, y, width, cardH, 8).fillAndStroke('#FFFFFF', theme.line);
    doc.roundedRect(x, y, 170, 28, 8).fill(theme.primary);
    doc.fillColor('#FFFFFF').fontSize(11).text(dayLabels[dayKey] || dayKey, x + 12, y + 9);

    let rowY = y + 36;
    mealEntries.forEach((mealKey) => {
      const mainId = meals[mealKey] || '-';
      const sideId = sidesSchedule?.[dayKey]?.[mealKey] || '-';
      const mealName = mealLabels[mealKey] || mealKey;

      doc.fillColor('#1F2430').fontSize(9).text(
        `${mealName}: main ${mainId} | side ${sideId}`,
        x + 12,
        rowY,
        { width: width - 24, ellipsis: true }
      );
      rowY += 16;
    });

    y += cardH + 12;
  });
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
