# Live Scorecard Backend Setup & Deployment Guide

This guide provides step-by-step instructions for selecting, deploying, and configuring the remote real-time state synchronization backend for the **Cricket Scorecard PWA**.

Both supported solutions operate with **100% zero ongoing cost ($0.00 forever)**, require zero paid subscriptions, and strictly enforce single-writer / multi-reader security with 1-year (365-day) automatic data retention.

---

## 1. Choosing Between Cloudflare Workers KV vs. Google Apps Script

### 1.1 Comparison Matrix

| Evaluation Criteria | Option A: Cloudflare Workers KV [RECOMMENDED] | Option B: Google Apps Script [ALTERNATIVE] |
| :--- | :--- | :--- |
| **Financial Cost** | **[PASS] $0.00 Free Forever**: 100,000 requests/day, 100k KV reads/day, 1k KV writes/day included permanently with zero credit card required. | **[PASS] $0.00 Free Forever**: 20,000 executions/day included with any personal Google account or Google Workspace account. |
| **Edge Latency** | **[PASS] Sub-50ms**: Globally distributed across 300+ edge data centers with CDN response caching (`max-age=1`). | **[WARN] 400ms – 1,200ms**: Standard Apps Script execution overhead on Google infrastructure. |
| **Storage Capacity** | **[PASS] 1 GB Total Storage**: Up to 1 GB free KV storage (thousands of simultaneous match scorecards). | **[PASS] 500 KB Properties / 9 KB Match**: `PropertiesService` stores ~100–300 simultaneous active matches without external spreadsheets. |
| **Security & Authorization** | **[PASS] Edge Cryptographic Auth**: Verifies `X-Write-Key` header, enforces CORS preflight, blocks unauthorized overwrites, and protects against DDoS. | **[PASS] Script Cryptographic Auth**: Verifies `writeKeyHash` on `doPost(e)` before modifying `PropertiesService` records. |
| **1-Year Expiration (TTL)** | **[PASS] Native Server-Side TTL**: Cloudflare KV automatically evicts keys after 365 days via `expirationTtl: 31536000` without cron jobs. | **[PASS] Timestamp Guardrail**: Script checks `Date.now() > packet.expiresAt` and deletes expired entries on access. |
| **Setup Friction** | **Low (5 minutes)**: Requires a free Cloudflare account; deployable via CLI (`wrangler`) or Web Dashboard UI. | **Minimal (2 minutes)**: Requires only a standard Google account; 1-click paste into [script.google.com](https://script.google.com). |
| **Target Use Case** | Best for production deployments, multi-team leagues, high spectator concurrency, and real-time responsiveness. | Best for personal leagues, school/club cricket, and users who prefer managing everything within Google Drive / Workspace. |

---

### 1.2 Decision Framework

```
                          Do you want the fastest real-time performance
                          (<50ms edge latency) and native server-side TTL?
                                         /              \
                                       YES               NO
                                       /                  \
                        [RECOMMENDED: Cloudflare]   Do you prefer zero 3rd-party
                        Deploy cloudflare/worker.js accounts and Google Drive storage?
                                                             /              \
                                                           YES               NO
                                                           /                  \
                                            [ALTERNATIVE: Google Apps]   [Cloudflare]
                                            Deploy google-apps-script/Code.gs
```

- **Choose Cloudflare Workers KV if**:
  1. You want the fastest live update delivery for remote spectators (<50ms latency).
  2. You anticipate multiple concurrent matches or dozens of simultaneous spectators.
  3. You want native, automated 365-day key eviction at the edge without cron scripts.
- **Choose Google Apps Script if**:
  1. You already have a Google account and want to avoid creating a Cloudflare account.
  2. You want a 2-minute setup with zero CLI or terminal commands.
  3. 400ms–1s sync latency is completely acceptable for your cricket scoring flow.

---

### 1.3 How to Switch Backends in the Production App

The PWA is built with a pluggable storage architecture governed by [`LiveStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L49). You can switch backends at runtime using any of the following methods:

#### Method 1: URL Query Parameter (Instant Switching)
Append `?endpoint=` or `?backend=` to your PWA URL:

- **Cloudflare Endpoint (Production Default)**:
  ```
  https://varun.khaneja.org/cricket-scorecard/?endpoint=https://cricket-scorecard-live.khaneja.org/api/
  ```
- **Google Apps Script Endpoint**:
  ```
  https://varun.khaneja.org/cricket-scorecard/?endpoint=https://script.google.com/macros/s/AKfycb.../exec
  ```

[`initLiveProviderFromUrlOrStorage()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L619) automatically detects whether the endpoint is Google Apps Script (`script.google.com`) or Cloudflare KV, initializes the matching provider ([`GoogleSheetsStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L175) or [`CloudflareKVStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L98)), and caches the choice in `localStorage`.

#### Method 2: Browser LocalStorage Configuration
Open your browser developer console (F12) and run:

```javascript
// To use Cloudflare Workers KV (Production Default)
localStorage.setItem('custom_live_endpoint', 'https://cricket-scorecard-live.khaneja.org/api/');

// To use Google Apps Script
localStorage.setItem('custom_live_endpoint', 'https://script.google.com/macros/s/AKfycb.../exec');
```

#### Method 3: TypeScript Source Default Configuration
In [`src/sync.ts:L264`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L264), update the default instance initialized or call [`setLiveStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L266):

```typescript
// Default to your Cloudflare Worker:
setLiveStorageProvider(new CloudflareKVStorageProvider('https://cricket-scorecard-live.khaneja.org/api/'));

// Or default to your Google Apps Script:
setLiveStorageProvider(new GoogleSheetsStorageProvider('https://script.google.com/macros/s/AKfycb.../exec'));
```

---

## 2. Step-by-Step Setup: Cloudflare Workers KV

All source files for Cloudflare deployment are pre-packaged in the [`cloudflare/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare) directory:
- Worker Script: [`cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/worker.js)
- Wrangler Configuration: [`cloudflare/wrangler.toml`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/wrangler.toml)

### Option A: 1-Click CLI Deployment via Wrangler (Recommended)

1. **Install Wrangler**:
   ```bash
   npm install -g wrangler
   ```
2. **Authenticate with Cloudflare**:
   ```bash
   npx wrangler login
   ```
   (Follow the browser prompt to authorize Wrangler with your free Cloudflare account).

3. **Create the KV Namespace**:
   ```bash
   npx wrangler kv:namespace create SCORECARD_KV
   ```
   *Example Output*:
   ```toml
   [[kv_namespaces]]
   binding = "SCORECARD_KV"
   id = "8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
   ```

4. **Update `cloudflare/wrangler.toml`**:
   Open [`cloudflare/wrangler.toml`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/wrangler.toml) and replace the placeholder `id` with your generated KV namespace ID:
   ```toml
   name = "cricket-scorecard-live"
   main = "worker.js"
   compatibility_date = "2024-09-01"

   [[kv_namespaces]]
   binding = "SCORECARD_KV"
   id = "8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c"
   ```

5. **Deploy the Worker**:
   ```bash
   cd cloudflare && npx wrangler deploy
   ```
   *Example Output*:
   ```
   Uploaded cricket-scorecard-live (1.20 sec)
   Deployed cricket-scorecard-live triggers (0.45 sec)
     https://cricket-scorecard-live.your-subdomain.workers.dev
   ```

---

### Option B: Cloudflare Web Dashboard UI Deployment (Zero Terminal)

1. **Log in to Cloudflare**:
   Navigate to [dash.cloudflare.com](https://dash.cloudflare.com) and log in.
2. **Create the KV Namespace**:
   - In the left sidebar, click **Storage & Databases** > **KV**.
   - Click **Create Namespace**.
   - Enter Namespace Name: `SCORECARD_KV`.
   - Click **Add**.
3. **Create the Worker**:
   - In the left sidebar, click **Compute (Workers & Pages)** > **Create Application**.
   - Click **Create Worker**.
   - Name your worker: `cricket-scorecard-live` and click **Deploy**.
4. **Paste Worker Code**:
   - On the worker summary page, click **Edit code** (or **Quick Edit**).
   - Replace the default template by pasting the complete contents of [`cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/worker.js).
   - Click **Save and deploy**.
5. **Bind the KV Namespace**:
   - Go to your Worker's dashboard page (`cricket-scorecard-live`).
   - Click the **Settings** tab.
   - In the settings navigation menu, click **Bindings** (or in older dashboard versions, navigate to **Variables and Secrets** > **KV Namespace Bindings**).
   - Click **Add** (or **Add binding**).
   - **Select Binding Type (KV Namespace)**: In the modal or side drawer that appears, Cloudflare presents a selector for binding types (D1 Database, KV Namespace, R2 Bucket, Queue, Vectorize, etc.). If the dialog defaults to **D1 Database** (which shows SQL queries and database schemas), click the **Type** dropdown or card list and select **KV namespace** (or **KV**).
   - Fill in the two KV configuration fields:
     - **Variable name**: Type `SCORECARD_KV` (this maps to `env.SCORECARD_KV` in [`cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/worker.js)).
     - **KV namespace**: Select `SCORECARD_KV` from the dropdown list of namespaces created in Step 2.
   - Click **Deploy** (or **Save and deploy** / **Add binding**).
6. **Copy Worker URL**:
   - Copy your worker domain (e.g. `https://cricket-scorecard-live.your-subdomain.workers.dev`).

---

### 2.3 Verifying Your Cloudflare Deployment

Test the endpoint using `curl` (pointing to production `https://cricket-scorecard-live.khaneja.org` or your custom worker URL):

1. **Test Match Creation (POST)**:
   ```bash
   curl -X POST "https://cricket-scorecard-live.khaneja.org/api/match/test123" \
     -H "Content-Type: application/json" \
     -H "X-Write-Key: my_secret_key" \
     -d '{"matchId":"test123","seq":1,"updatedAt":1725753600000,"state":{"score":0}}'
   ```
   *Expected Output*: `{"success":true,"matchId":"test123","seq":1,"expiresAt":...}`

2. **Test Spectator Fetch (GET)**:
   ```bash
   curl "https://cricket-scorecard-live.khaneja.org/api/match/test123"
   ```
   *Expected Output*: HTTP 200 with the JSON match packet.

---

## 3. Step-by-Step Setup: Google Apps Script (Google Sheets / Drive)

The complete backend code is pre-packaged in [`google-apps-script/Code.gs`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/google-apps-script/Code.gs).

### 3.1 Deployment Walkthrough

1. **Open Google Apps Script**:
   Navigate to [script.google.com](https://script.google.com) and click **+ New project**.
2. **Name the Project**:
   Click "Untitled project" in the top-left and rename it to `Cricket Scorecard Live Sync`.
3. **Paste the Script Code**:
   - Select all existing placeholder code in `Code.gs` and delete it.
   - Copy the entire contents of [`google-apps-script/Code.gs`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/google-apps-script/Code.gs) and paste it into the editor.
   - Click the **Save** icon (diskette) or press `Ctrl+S` / `Cmd+S`.
4. **Deploy as Web App**:
   - In the top-right corner, click **Deploy** > **New deployment**.
   - In the "Select type" sidebar, click the **Gear** icon and select **Web app**.
   - Configure the deployment settings:
     - **Description**: `Cricket Scorecard Sync v1`
     - **Execute as**: `Me (your-email@gmail.com)`
     - **Who has access**: `Anyone` *(Crucial: This enables spectators and scorers to access match data without Google login prompts)*.
   - Click **Deploy**.
5. **Authorize Access**:
   - If prompted with "Authorization required", click **Authorize access**.
   - Select your Google account.
   - If a screen displays "Google hasn't verified this app", click **Advanced** (bottom left), then click **Go to Cricket Scorecard Live Sync (unsafe)**.
   - Click **Allow**.
6. **Copy the Web App URL**:
   - Copy the generated Web App URL under "Web app":
     `https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec`

---

### 3.2 Verifying Your Google Apps Script Deployment

Test the endpoint using `curl`:

1. **Test Match Creation (POST)**:
   ```bash
   curl -L -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
     -H "Content-Type: text/plain;charset=utf-8" \
     -d '{"action":"save","matchId":"test999","writeKey":"my_secret_key","packet":{"matchId":"test999","seq":1,"state":{"score":0}}}'
   ```
   *Expected Output*: `{"success":true,"matchId":"test999","seq":1,"expiresAt":...}`

2. **Test Spectator Fetch (GET)**:
   ```bash
   curl -L "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?action=fetch&matchId=test999"
   ```
   *Expected Output*: `{"success":true,"packet":{"matchId":"test999",...}}`

---

## 4. Security & Maintenance Best Practices

1. **Write Key Protection**:
   - The umpire's `writeKey` is generated randomly on match creation ([`generateWriteKey`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L30)) and stored exclusively in the scorer's local `localStorage`.
   - Never share the umpire URL (`?live=m_...&key=k_...`) publicly. Share only the spectator link (`?live=m_...`).
2. **Automatic 1-Year Cleanup**:
   - On Cloudflare: `expirationTtl: 31536000` guarantees automatic key eviction after 365 days.
   - On Google Apps Script: The script automatically checks `Date.now() > packet.expiresAt` and deletes expired match records from `PropertiesService`.
3. **CORS & Zero Third-Party Tracking**:
   - Both backend implementations use standard CORS headers (`Access-Control-Allow-Origin: *`) allowing direct browser access from GitHub Pages with zero analytics or tracking cookies.
