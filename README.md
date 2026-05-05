# PDF Export Service (MVP)

Standalone Node service that accepts signed export jobs from Laravel, processes them asynchronously with controlled concurrency, and exposes status/download links.

## Endpoints
- `GET /health`
- `POST /jobs` (HMAC authenticated)
- `GET /jobs/:jobId`
- `GET /jobs/:jobId/download`

## Auth Contract
Headers from Laravel:
- `X-Export-Timestamp`: unix epoch seconds
- `X-Export-Signature`: hex HMAC SHA256 of `timestamp + "." + rawBody`

## Run
```bash
cd pdf-export-service
npm install
cp .env.example .env
npm run dev
```

## Notes
- Current MVP stores generated files in local `storage/`.
- `generatePdf()` is intentionally a stub to be replaced with Playwright/Puppeteer section-render+merge logic.
