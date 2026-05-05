# Laravel Integration Notes

## Request
`POST /jobs` signed with:
- `X-Export-Timestamp`
- `X-Export-Signature` = `hex(hmac_sha256(timestamp + "." + raw_json, shared_secret))`

Body fields:
- `job_id`
- `user_id`
- `calendar_id`
- `payload`

## Status
`GET /jobs/:jobId` returns queued/processing/completed/failed state plus optional `progress`, `error_message`, `file_path`, and `file_size`.

## Download
`GET /jobs/:jobId/download` streams PDF when completed.
