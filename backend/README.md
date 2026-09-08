# Serverless Backend & Cloud Integrations

This directory contains serverless backend integration code and infrastructure configuration for real-time live match state synchronization.

---

## Architecture Overview

The Cricket Scorecard PWA supports dual zero-cost cloud storage providers for live streaming match states to spectators:

```
+-------------------------------------------------------------------------+
|                        Cricket Scorecard PWA                            |
|                  Client State Machine (src/reducer.ts)                  |
+------------------------------------+------------------------------------+
                                     |
                +--------------------+--------------------+
                |                                         |
                v                                         v
+-------------------------------+         +-------------------------------+
|  Cloudflare Workers KV        |         |  Google Apps Script           |
|  (backend/cloudflare/)        |         |  (backend/google-apps-script/)|
|                               |         |                               |
|  - Global Edge CDN Latency    |         |  - Google Sheets persistence  |
|  - 1-Year Native KV TTL       |         |  - PropertiesService Cache    |
|  - 100,000 requests/day free  |         |  - Zero infrastructure setup  |
+-------------------------------+         +-------------------------------+
```

---

## Directory Structure

- [`backend/cloudflare/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare#L1): Cloudflare Workers KV edge service.
  - [`backend/cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L1): Edge worker script handling CORS, GET, and POST endpoints with 1-year data retention (`expirationTtl = 31536000`).
  - [`backend/cloudflare/wrangler.toml`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/wrangler.toml#L1): Wrangler CLI deployment configuration.
- [`backend/google-apps-script/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/google-apps-script#L1): Google Apps Script serverless backend.
  - [`backend/google-apps-script/Code.gs`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/google-apps-script/Code.gs#L1): Apps Script Web App implementation supporting JSON payload ingest and retrieval.

---

## Deployment Instructions

For detailed step-by-step deployment instructions, refer to:
- [`docs/deployment/DEPLOYMENT_AND_BACKEND_SETUP.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/deployment/DEPLOYMENT_AND_BACKEND_SETUP.md#L1)
- [`docs/architecture/LIVE_SYNC_DESIGN.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/LIVE_SYNC_DESIGN.md#L1)
