# Cricket Scorecard PWA

A standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

**🌐 Live App:** [https://varun.khaneja.org/cricket-scorecard/](https://varun.khaneja.org/cricket-scorecard/)

## Current Status

Fully functional and verified. Real-time multi-reader live state streaming with 1-year zero-cost cloud retention, advanced boundary tracking (4s/6s), bowler maidens, Fall of Wickets (FOW), multi-run leg byes, MCC Law 21.18 extras separation, early declaration/forfeit, plaintext scorecard exporter, feedback & diagnostic bug reporting mechanism, zero-dependency universal modal controller, embedded URI compression, and WCAG/colorblind accessibility improvements implemented. All 67 automated tests passing.

## Features (Implemented)

- **Universal Zero-Dependency Modal System & WAI-ARIA Focus Guardrail**: Robust native modal open/close controller with automated backdrop lifecycle, keyboard/click dismissal, automatic fallback when external CDNs fail, and strict W3C WAI-ARIA focus management (active element blurring before `aria-hidden` and focus restoration).
- **Embedded URI State Compression**: Standalone TypeScript LZString compression for ultra-compact permalinks (`?s=`) and storage minification with zero external runtime dependencies.
- **Real-Time Live Streaming & Multi-Reader Sync**: Stream live match scores to unlimited parallel spectators at 100% zero cost ($0.00). Spectators view updates in real-time in read-only Spectator Mode without disrupting scoring.
- **Serverless Cloud Storage Hosting**: Live match state packets are hosted remotely on high-performance Cloudflare Workers KV edge storage (`cloudflare/worker.js`) or Google Apps Script (`google-apps-script/Code.gs`) with zero hosting costs ($0.00).
- **1-Year Remote Retention (365-day TTL)**: Match state is persisted remotely for 1 year (31,536,000 seconds / 365 days) with automatic server-side eviction and client-side timestamp validation.
- **Cryptographic Role Separation**: Umpire holds private write credentials (`?live=<id>&key=<key>`) stored in `localStorage`, while spectators receive clean read-only links (`?live=<id>`).
- **Offline Resilience & Network Recovery**: Offline deliveries are queued in `localStorage` and automatically synchronized upon network restoration using monotonic sequence numbering.
- **Modular Architecture**: Code deconstructed into clean ES6 modules (`src/` directory) separating state, live sync, rules calculation, persistence, and DOM rendering.
- Formal State Machine: Centralized match phase flow (SETUP, TOSS, PLAYING_INNINGS, INNINGS_BREAK, MATCH_OVER) governed by a deterministic reducer inside `src/reducer.ts`.
- Score tracking: Complete ball-by-ball tallying (Runs, Wickets, Overs, Wides, No Balls, Byes, Leg Byes), with Byes counting towards batsman balls faced.
- Feedback & Diagnostic Bug Reporting: Dedicated "Feedback / Bug" modal generating comprehensive Markdown bug reports with user description, complete match state (striker/non-striker figures, bowler maidens/econ, FOW, extras), minified state JSON, LZString permalink, and captured runtime errors for instant reproduction.
- Boundary Tracking: Independent tracking of boundaries (4s and 6s) for each batsman, calculated in batting statistics, strike rates, and scorecard tables.
- Maiden Overs Calculation: Bowlers are automatically credited with a maiden over when completing a 6-ball legal over conceding 0 bowler runs (byes and leg-byes do not break a maiden).
- Fall of Wickets (FOW): Complete chronological tracking and display of each dismissal (Score, Wicket Number, Batsman Out, Over and Ball).
- Multi-run Leg Byes: Support for specifying 1 to 6 leg byes on a delivery.
- MCC Law 21.18 Extras Separation: Bowler is charged 1 penalty run for a No-Ball; additional fielding extras (byes/leg byes) are assigned to fielding extras without penalizing bowler figures.
- Early Declaration / Forfeit: "End Innings" feature to conclude an innings early with full confirmation safeguards for Innings 1 (triggers Innings Break with target) or Innings 2 (triggers Match Over).
- Monospace Text Scorecard Exporter: "Copy Text Scorecard" button to instantly format and copy a complete match summary to the clipboard for sharing via chat, SMS, or email.
- Red-Green Colorblind & Touch Accessibility: Explicit `[STRIKER]` badge, `6px solid #0d6efd` accent border, and `#e7f1ff` background tint for active striker; all scoring controls meet WCAG 2.1 AA 48px minimum touch target dimensions.
- Configurable match parameters (Overs per innings, Bowler limits). Wide and No Ball penalties fixed at official 1 run.
- Mobile-first design with large buttons.
- State persistence using `localStorage`.
- Full Scorecard mode: Clean monospace match summary featuring individual batsman 4s/6s/SR, bowler maidens/econ, wide and no-ball tallies, and Fall of Wickets summary.
- Full Scorecard Mode Toggle: Toggle and exit button for switching views.
- Undo functionality.
- Reset Match functionality (retains players).
- Web App Manifest for PWA installation.
- Service Worker for offline support.
- MIT License.
- Toss & Lineup Setup: Start match prompt for toss selection (batting team choice), empty initial rosters that auto-retain upon reset.
- Player Management: Interactive Drag & Drop lineup sorting, between-team transfers, bulk paste import modal, and shared player mirroring.
- Over Log: Display details of previous balls in the current over.
- Completed Overs History (U1): Interactive collapsible list of previous overs (runs, wickets, bowler, ball-by-ball log) on the main scoring screen.
- Over Log Table (U2): Detailed table in Full Scorecard (Screenshot Mode) showing all overs (with bowler name, runs, wickets, and ball sequence) for both innings.
- Selectable Active Players: Allow selecting current batsmen and bowler on the scorecard.
- Strike Rotation: Automatic strike rotation on odd physical runs scored (including extras) and at the end of each over.
- Dropdown Player Selection: Filtered for eligibility, with automatic selection when only one player is eligible, and strict dual-batsman enforcement (or lone striker transition).
- Controls Disabling: When selection is needed.
- Single Batsman Rule: Setting to allow a single batsman to play (default: true).
- Striker Indicator: Used background color/border instead of `*`.
- Run Out Specification: Select whether striker or non-striker is run out.
- Extra Runs Specification: Specify extra runs on Wides, No Balls, and Run Outs, and whether they accrue to the batsman or byes.
- Fixes: Count ball faced on wicket.
- Match Over Logic: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
- Permalink Sharing: Extremely compact, LZString-compressed permalink URL (minified state via `?s=`) for seamless session transfer.
- Bootstrap Integration: Visually pleasing layout.
- Themes: Support for Light, Dark, and Green themes.
- Flipping Page Effect: Smooth transition between score entry and screenshot mode.
- Enhanced Screenshot Layout: Uses tables and monospace font.
- Retain Players on Reset: Keep player names in settings inputs when hitting reset.
- Disable Leg Byes: Option in settings to disable leg byes (off by default).
- Disable Buttons on Settings: Screenshot and Reset buttons are disabled when match is not started.
- Visibility Fix: Scoreboard section is hidden when on the match settings page.
- Footer: Added version number, deployment date, and time.
- Max Overs Enforcement: Bowlers who reach their limit are filtered out.
- Player Count Validation: Ensures enough players to bowl all overs.
- Summary View Fix: No extra innings when match over.
- Credits: Added to footer with emojis.
- Automated Tests: Node.js test suite with 50 comprehensive unit tests covering all edge cases.
- Second Innings Stats: Show Target, CRR, RRR.

## Features (Planned / Future Architecture)

- **Reactive UI Rendering**: Migrate from manual DOM updates in `updateUI()` to a lightweight component/reactive rendering approach (e.g. Preact, Lit, or Mithril).

## Local Development

To run the application and execute tests locally:

### 1. Standard Node.js Workflow (If `npm` is allowed and installed)
1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.
3. **Execute Automated Unit Tests**:
   ```bash
   npm test
   ```
4. **Compile Production Build**:
   ```bash
   npm run build
   ```
   The compiled assets will be created in the `dist/` directory.
5. **Preview Production Build**:
   ```bash
   npm run preview
   ```

### 2. Zero-Installation Workflow (If global `npm` is not allowed or installed)
If you do not have `npm` installed globally, or are in a sandboxed environment where package managers are restricted, you can run a completely isolated local Node.js environment:

1. **Download Node.js Portable Binary**:
   Download the Node.js tarball directly (e.g. Linux x64):
   ```bash
   wget https://nodejs.org/dist/v20.11.0/node-v20.11.0-linux-x64.tar.xz -O node-dist.tar.xz
   ```
2. **Extract locally in the workspace**:
   ```bash
   mkdir -p node-env && tar -xf node-dist.tar.xz -C node-env && rm node-dist.tar.xz
   ```
3. **Run Package Installation using local npm**:
   Bypass custom proxies and fetch dependencies directly from the official registry:
   ```bash
   ./node-env/node-v20.11.0-linux-x64/bin/npm install --registry=https://registry.npmjs.org/
   ```
4. **Run Dev/Test scripts using local binaries**:
   *   **Start dev server**: `./node-env/node-v20.11.0-linux-x64/bin/npm run dev`
   *   **Execute tests**: `./node-env/node-v20.11.0-linux-x64/bin/npm test`
   *   **Build project**: `./node-env/node-v20.11.0-linux-x64/bin/npm run build`

## Deployment to GitHub Pages

Because the project utilizes Vite, the production output in the `dist/` folder is deployed:

### Option A: GitHub Actions (Recommended)
You can configure a GitHub Actions workflow to automatically build and deploy the project on every push to `main`. Create a `.github/workflows/deploy.yml` with:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: true
jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Option B: Manual Deploy via NPM script
You can use the `gh-pages` CLI package to push the build directory to the `gh-pages` branch:
```bash
npx gh-pages -d dist
```

## Documentation Structure

The repository maintains several core documentation files to manage the AI-assisted development lifecycle:

| Document | Phase | Primary Audience | Core Question Answered |
| :--- | :--- | :--- | :--- |
| **`LIVE_SYNC_DESIGN.md`** | Design & Architecture | User & AI | *How does zero-cost real-time multi-reader state sync and 1-year TTL work?* |
| **`DEPLOYMENT_AND_BACKEND_SETUP.md`** | Deployment & Operations | Scorer & Admin | *How do I choose, configure, and deploy Cloudflare vs Google Apps Script backends?* |
| **`implementation_plan.md`** | Planning | User & AI | *How are we going to build this feature technically?* |
| **`task.md`** | Execution | AI (Progress Tracking) | *What exact step are we working on right now?* |
| **`walkthrough.md`** | Verification | User | *What exactly did we build and how was it tested?* |
| **`DESIGN.md`** | Design | Future AI / Developers | *What is the current system architecture, data structures, and control flow?* |
| **`PROMPT.md`** | Project Lifecycle | Future AI / Developers | *What is this entire application and all of its rules?* |

## Tech Stack

- **Frontend**: TypeScript, Vanilla HTML5 & CSS3.
- **Build Toolchain**: Vite (for local development and bundling).
- **Libraries**: Bootstrap 5 (CSS & responsive grid), SortableJS (CDN), embedded LZString.
- **Testing**: Node.js test runner with `ts-node/esm` loaders.

## License

MIT License. See [LICENSE](LICENSE) for details.
