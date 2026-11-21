# Cricket Scorecard PWA - Canonical Agent & Developer Guidelines

This document is the single canonical source of architectural context, domain invariants, accessibility standards, and standing workflow rules for all AI coding agents and developers working in this repository. Tool-specific entry points ([`GEMINI.md`](GEMINI.md#L1), [`CLAUDE.md`](CLAUDE.md#L1), and [`.github/copilot-instructions.md`](.github/copilot-instructions.md#L1)) are zero-rule pointers to this file.

---

## 1. Project Overview

The **Cricket Scorecard PWA** is a mobile-first, standalone Progressive Web App (PWA) for offline and real-time live scoring of cricket matches. It executes entirely in the browser on static hosting (GitHub Pages) with zero-cost ($0.00) cloud synchronization, 1-year remote match retention, standalone LZString URI compression, and strict read-only spectator mode lockout.

- **Repository**: `https://github.com/aawc/cricket-scorecard`
- **Active Semantic Version**: Governed by [`APP_VERSION`](src/version.ts#L25) in [`src/version.ts`](src/version.ts#L1) (`v$yyyy.$mm.$nnn`)
- **Live Deployment**: `https://varun.khaneja.org/cricket-scorecard/`
- **Contributor Guide**: [`CONTRIBUTING.md`](CONTRIBUTING.md#L1)
- **System Design Blueprints**: [`docs/architecture/DESIGN.md`](docs/architecture/DESIGN.md#L1) and [`docs/architecture/LIVE_SYNC_DESIGN.md`](docs/architecture/LIVE_SYNC_DESIGN.md#L1)
- **License**: MIT ([`LICENSE`](LICENSE#L1))

---

## 2. Architecture & Modules

The client codebase is organized into modular TypeScript units (ES2022 target bundled via Vite into `dist/`) under `src/`:

1. **Application Entry Point (`src/app.ts`)**: Initializes global runtime error listeners ([`initGlobalErrorListeners()`](src/feedback.ts#L84)), boots the UI controller ([`initUI()`](src/ui.ts#L162) in [`src/app.ts`](src/app.ts#L8)), and registers the offline Service Worker (`public/sw.js`, pre-cached via [`scripts/build-sw.js`](scripts/build-sw.js#L1)).
2. **Statutory Cricket Rules Predicates (`src/rules.ts`)**: Pure ICC ODI Clause 12/13 bowler eligibility, synthetic delivery grammar, and quota predicates ([`getEligibleBowlers()`](src/rules.ts#L29), [`getSelectableBowlers()`](src/rules.ts#L60), [`isBowlingResourceExhausted()`](src/rules.ts#L86), [`findConsecutiveOverBreaches()`](src/rules.ts#L120)) shared by the reducer and UI without circular coupling.
3. **State Machine (`src/reducer.ts`)**: Pure deterministic state transitions ([`reducer()`](src/reducer.ts#L17)), God Mode payload validation and draft extraction ([`validateGodModePayload()`](src/reducer.ts#L971), [`buildGodModeDraftFromState()`](src/reducer.ts#L1158)), governing match phases (`SETUP`, `TOSS`, `PLAYING_INNINGS`, `INNINGS_BREAK`, `MATCH_OVER`) and queuing asynchronous modal/alert side effects in `gameState.uiEvents`.
4. **State Store (`src/state.ts`)**: Reactive state holder ([`gameState`](src/state.ts#L6), [`setGameState()`](src/state.ts#L47), [`dispatch()`](src/state.ts#L69)) coordinating undo history snapshots, `localStorage` persistence, and live stream synchronization.
5. **Domain Types (`src/types.ts`)**: Typed contracts for [`BatsmanStats`](src/types.ts#L5), [`BowlerStats`](src/types.ts#L13), [`LiveInnings`](src/types.ts#L36), [`Team`](src/types.ts#L55), [`Settings`](src/types.ts#L61), [`LiveMatchPacket`](src/types.ts#L78), [`GameState`](src/types.ts#L104), [`Action`](src/types.ts#L122), and [`GodModeState`](src/types.ts#L170).
6. **Persistence & Compression (`src/storage.ts`)**: `localStorage` serialization ([`saveState()`](src/storage.ts#L409), [`loadState()`](src/storage.ts#L431)), standalone LZString URI compression ([`generatePermalink()`](src/storage.ts#L528) for `?s=` links with legacy `?state=` support), key-aliased minification ([`minifyState()`](src/storage.ts#L596), [`unminifyState()`](src/storage.ts#L647)), and over healing ([`healInningsOvers()`](src/storage.ts#L547)).
7. **Real-Time Live Sync (`src/sync.ts`)**: Zero-cost single-writer / multi-reader live state streaming over Cloudflare Workers KV ([`CloudflareKVStorageProvider`](src/sync.ts#L98), [`backend/cloudflare/worker.js`](backend/cloudflare/worker.js#L1)) or Google Apps Script ([`GoogleSheetsStorageProvider`](src/sync.ts#L180), [`backend/google-apps-script/Code.gs`](backend/google-apps-script/Code.gs#L1)) with 1-year TTL ([`ONE_YEAR_SECONDS`](src/sync.ts#L4)), cryptographic write-key verification ([`hashWriteKey()`](src/sync.ts#L37)), single-umpire takeover/demotion ([`resumeUmpireSession()`](src/sync.ts#L622), [`demoteUmpireToSpectator()`](src/sync.ts#L385)), and offline dirty-queue recovery.
8. **Universal Modal Manager (`src/modal.ts`)**: Zero-dependency modal lifecycle controller ([`openModal()`](src/modal.ts#L30), [`closeModal()`](src/modal.ts#L131), [`cleanupModalScrollLock()`](src/modal.ts#L89)) with Bootstrap 5 CDN fallback and W3C WAI-ARIA focus trap / active-element blur compliance.
9. **Version Management (`src/version.ts`)**: Authoritative semantic version constants ([`APP_VERSION`](src/version.ts#L25)), timestamped tag sequencing ([`getNextSemanticVersion()`](src/version.ts#L72)), and structured release records ([`RELEASE_HISTORY`](src/version.ts#L92)).
10. **Release Notes View (`src/release_notes.ts`)**: Dynamic modal renderer ([`renderReleaseNotesHTML()`](src/release_notes.ts#L14), [`openReleaseNotesModal()`](src/release_notes.ts#L130)) for changelogs, highlights, commit manifests, and footer version badge interactions.
11. **Diagnostic Feedback (`src/feedback.ts`)**: Runtime error ring buffer ([`recordRuntimeError()`](src/feedback.ts#L21)) and structured Markdown diagnostic report compiler ([`generateBugReportMarkdown()`](src/feedback.ts#L107), [`getGitHubIssueUrl()`](src/feedback.ts#L281)).
12. **UI Controller (`src/ui.ts`)**: DOM event bindings, tactile scoring keypad, player selectors, 3D card-flip Full Scorecard toggle ([`toggleScreenshotMode()`](src/ui.ts#L703)), monospace text scorecard export ([`generateTextSummary()`](src/ui.ts#L1668)), spectator lockout ([`isSpectator()`](src/ui.ts#L157)), and post-match visual analytics ([`generateSummaryView()`](src/ui.ts#L754)).
13. **Umpire God Mode Controller (`src/god_mode.ts`)**: Modular match-state override dialog ([`initGodModeUI()`](src/god_mode.ts#L453), [`openGodModeModal()`](src/god_mode.ts#L272), [`applyGodModeModal()`](src/god_mode.ts#L308), [`syncGodModeVisibility()`](src/god_mode.ts#L178)) supporting full state hydration, strict pre-clamping validation, lossless partial merging, live-sync bootstrap/flush, and 4-layer spectator security lockout.
14. **v2 Event-Sourced Core & Analytics (`src/v2/`)**: Event-sourced [`DeliveryEvent`](src/v2/types.ts#L33) stream ([`src/v2/types.ts`](src/v2/types.ts#L1)), pure statistical projection engine ([`projectInnings()`](src/v2/stats.ts#L154)), zero-dependency SVG charts ([`renderWormChartSVG()`](src/v2/charts.ts#L23), [`renderManhattanChartSVG()`](src/v2/charts.ts#L124), [`renderPartnershipChartSVG()`](src/v2/charts.ts#L252)), hardware ergonomics ([`wakeLockController`](src/v2/hardware.ts#L240), [`haptics`](src/v2/hardware.ts#L241), [`audioSynth`](src/v2/hardware.ts#L242)), data portability exporters ([`formatMonospaceScorecard()`](src/v2/export.ts#L13), [`formatBallByBallCSV()`](src/v2/export.ts#L116), [`exportMatchJSON()`](src/v2/export.ts#L165)), and legacy state adapter bridge ([`getProjectionsFromGameState()`](src/v2/bridge.ts#L266)).

---

## 3. Cricket Domain, UI/UX & Accessibility Specifications

1. **ICC Men's One Day International Playing Conditions & Partial Coverage**:
   - All scoring mechanics, bowling quotas (1/5th of innings overs, no two consecutive overs unless strict relaxation is required to finish an innings), extras separation, maiden calculations, dismissals, and statistical projections MUST comply with the official **ICC Men's One Day International Playing Conditions** ([`docs/rules/icc_mens_odi_playing_conditions.pdf`](docs/rules/icc_mens_odi_playing_conditions.pdf), [`docs/rules/README.md`](docs/rules/README.md#L1)).
   - Coverage is partial by design. Always consult the authoritative per-clause status matrix in [`docs/rules/README.md`](docs/rules/README.md#L17) before claiming that any clause is implemented. Free hits (Clause 21.19), powerplays and fielding restrictions (Clause 28 / Appendix C), substitutes and concussion replacements (Clause 1), Super Over, Duckworth-Lewis-Stern (DLS), reserve days, and Net Run Rate are **not** implemented — never document them as compliant and never cite a fabricated line anchor for them.
2. **Delivery Accounting & MCC Law 21.18 Extras Separation**:
   - **Boundaries & Maidens**: Maintain distinct `4s` and `6s` counters per batsman; credit a bowler maiden over when 6 legal balls concede 0 bowler-attributed runs (byes and leg-byes do not break a maiden).
   - **MCC Law 21.18 Extras**: A No-Ball charges 1 penalty run (`settings.noBallPenalty`) to the bowler and counts as a ball faced by the striker, but does not count as a legal over ball; additional runs accrue either to the batsman (charged to bowler) or to fielding byes (not penalizing bowler figures). A Wide charges 1 penalty run (`settings.widePenalty`) to the bowler, counts toward neither legal over balls nor batsman balls faced, and accrues additional physical runs directly to byes. Byes and Leg Byes (1–6 runs, configurable via `settings.enableLegByes`) count as legal deliveries for both bowler and striker without charging bowler runs.
   - **Dismissals, Run Outs & Fall of Wickets (FOW)**: The ball of dismissal counts toward batsman balls faced. Run outs specify striker vs non-striker dismissal plus completed physical runs prior to dismissal ([`executeRunOutWicket()`](src/reducer.ts#L762)). Chronological FOW records team score, wicket number, dismissed batsman, and `over.ball` position ([`recordFallOfWicket()`](src/reducer.ts#L577)).
   - **Strike Rotation**: Rotate active strike at the end of every 6-ball over and whenever an odd number of physical runs (`1`, `3`, `5`) is completed across normal deliveries, Wides, No Balls, Byes, Leg Byes, and Run Outs ([`rotateStrike()`](src/reducer.ts#L508)).
3. **Match Setup, Rosters & Lifecycle Rules**:
   - Each match uses 1 innings per team (`totalInnings: 1`), configurable overs per innings (default `8`) and max overs per bowler (default `2`), optional Single Batsman play (`allowSingleBatsman: true` default, automatically moving a lone remaining batsman to the striker slot), and pre-match roster validation against bowling quotas and batting minimums.
   - Roster lists initialize empty on fresh load (no placeholder names), support SortableJS drag-and-drop ordering, bulk paste import, and dual-team shared player mirroring (`🔁`), and persist across `RESET_MATCH` alongside match settings while clearing innings/scoring history.
   - During the second innings, display target score, current run rate, and required run rate. Support early declaration/forfeit via `FORCE_END_INNINGS`, enforce normal scoring immutability upon `MATCH_OVER`, and render over logs as both collapsible cards on the main scoring screen (U1) and a monospace Over Log table in Full Scorecard mode (U2).
   - **Umpire God Mode (`APPLY_GOD_MODE`)**: Umpires can open `#godModeModal` ([`openGodModeModal()`](src/god_mode.ts#L272), [`applyGodModeModal()`](src/god_mode.ts#L308)) at any phase to configure or override match rules, rosters, phase (`SETUP`, `TOSS`, `PLAYING_INNINGS`, `INNINGS_BREAK`, `MATCH_OVER`), score, overs, batters, striker assignment, bowlers, extras, and archived first-innings summaries via [`APPLY_GOD_MODE`](src/reducer.ts#L468) with lossless partial merging, synthetic over-log reconciliation (`~` tokens that never award false Clause 17 maidens), undo support, and immediate live-sync propagation.
4. **Spectator Mode Controls Lockout**:
   - Joining via a read-only spectator link (`?live=<matchId>`) strictly disables and hides all umpire scoring controls, player selectors, innings declarations, match reset actions, and Umpire God Mode (`#god-mode-btn` and `#godModeModal`, enforced across CSS, DOM state, programmatic guards, and mid-edit umpire demotion via [`isSpectator()`](src/ui.ts#L157) and [`syncGodModeVisibility()`](src/god_mode.ts#L178)), providing a distraction-free live observation dashboard while preserving theme toggling (`light`, `dark`, `green`) and Full Scorecard / analytics viewing.
5. **Minimalist Mobile Ergonomics & `48px` Touch Targets**:
   - Maintain a clean Swiss/Bauhaus layout with tabular numerals, crisp `1px` borders, 3D card-flip Full Scorecard transition, and WCAG 2.1 AA minimum `48px` × `48px` touch targets on all interactive scoring keys and selector controls.
6. **Red-Green Colorblind Accessibility**:
   - Never rely on red vs green color alone in UI components, SVG charts, tables, diffs, or assistant output.
   - Primary high-contrast palette: Blue (`#0072B2`) vs Orange (`#D55E00`), paired with Yellow (`#F0E442`) and Purple (`#CC79A7`).
   - Encode active striker status with redundant visual cues (`●` striker dot / `[STRIKER]` label, `6px solid #0072B2` accent border, and tinted background).
   - Pair all status and category badges with explicit text indicators: `[PASS]`, `[FAIL]`, `[ADDED]`, `[REMOVED]`, `[MODIFIED]`, `[FEAT]`, `[FIX]`, `[DOCS]`, `[TEST]`.
7. **Final Scorecard Visual Analytics Integration**:
   - [`generateSummaryView()`](src/ui.ts#L754) embeds the match victory banner, comparative Match Trajectory Worm Chart, per-innings telemetry grid (Run Rate, Boundaries, Extras), Over-by-Over Manhattan bars, and Batting Partnerships stacked bars.
8. **Release Management, Footer Badge & Code-Only Version Bumps**:
   - Semantic version tags follow `v$yyyy.$mm.$nnn` via `npm run release` ([`scripts/release.js`](scripts/release.js#L1)) with [`src/version.ts`](src/version.ts#L1) as the single source of truth synchronized across `package.json`, `public/sw.js`, and `index.html`.
   - Keep the persistent `#footer-release-badge` ([`index.html`](index.html#L957)) opening `#releaseNotesModal` ([`src/release_notes.ts`](src/release_notes.ts#L130)) alongside Varun Khaneja (`github.com/aawc`) attribution.
   - **Code-Only Version Bumps**: Update version metadata (`APP_VERSION` and synchronized release files) **only** when making functional code changes — never increment or modify version numbers for documentation-only changes.

---

## 4. Standing Developer & Multi-Agent Workflow Mandates

1. **Phased Implementation Planning & Phase-Gate Verification**:
   - Break multi-step features, architectural updates, and cross-cutting changes into explicit sequential phases in a written implementation plan before modifying production code. Complete full phase-gate verification (`npm test`, `npm run build`, documentation sync, and independent subagent verification) before advancing to the next phase.
2. **Heavy Automated Testing (Strict Red-Green-Refactor TDD)**:
   - Follow strict Red-Green-Refactor Test-Driven Development in [`test/test_cases.ts`](test/test_cases.ts#L1) and [`test/v2_test_cases.ts`](test/v2_test_cases.ts#L1) for every new feature and bug fix: write a minimal failing test with concrete assertions on real function/reducer calls first, run `npm test` to confirm the expected `[FAIL]` (Red), implement minimal working production code (no `TODO` stubs or placeholders) to achieve `[PASS]` (Green), and refactor while keeping the suite green.
3. **Small Independent Atomic Commits & Explicit Commit Approval**:
   - Decompose work into small, self-contained atomic commits where every individual commit compiles cleanly (`npm run build`) and passes `npm test` on its own. Author structured commit messages stating technical rationale and verified root causes, omit internal tracking tags (`TAG=agy`, `CONV=<id>`), and obtain explicit user approval of the proposed commit message before executing `git commit`.
4. **Independent Subagent Verification**:
   - Dispatch an independent subagent audit (`reviewer` / `verifier`) for each completed action, phase gate, and pre-commit diff to verify behavioral correctness, ICC rule compliance, colorblind accessibility, and line-anchor validity prior to requesting commit approval.
5. **Universal Documentation Hierarchy & Directory Governance**:
   - [`AGENTS.md`](AGENTS.md#L1) is the sole canonical instruction file for AI and developer agents; [`GEMINI.md`](GEMINI.md#L1), [`CLAUDE.md`](CLAUDE.md#L1), and [`.github/copilot-instructions.md`](.github/copilot-instructions.md#L1) must remain pure zero-rule pointers, and [`README.md`](README.md#L1) must remain strictly human-facing (`0` agent rules).
   - Keep `AGENTS.md`, `README.md`, [`CONTRIBUTING.md`](CONTRIBUTING.md#L1), [`SECURITY.md`](SECURITY.md#L1), [`docs/DIRECTORY_STRUCTURE.md`](docs/DIRECTORY_STRUCTURE.md#L1), [`docs/README.md`](docs/README.md#L1), [`docs/architecture/DESIGN.md`](docs/architecture/DESIGN.md#L1), [`docs/reports/BUG_REPORT.md`](docs/reports/BUG_REPORT.md#L1), and [`docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md`](docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md#L1) synchronized, adhering strictly to [`docs/DIRECTORY_STRUCTURE.md`](docs/DIRECTORY_STRUCTURE.md#L1) with zero ad-hoc root files.
6. **Markdown, Prose & Code-Link Hygiene**:
   - **Strict Line-Anchored Code Links**: Every Markdown link referencing a specific source symbol MUST include an exact verified `#L<line>` anchor (for example, [`APP_VERSION`](src/version.ts#L25)). Bare file links for symbols are prohibited.
   - **No GitHub Alert Syntax**: Never use GitHub blockquote alert boxes (`> [!NOTE]`, `> [!WARNING]`, `> [!IMPORTANT]`, `> [!TIP]`, `> [!CAUTION]`), which break Google Docs synchronization.
   - **Formal Technical Prose**: Write concise, objective domain terminology and avoid informal chat shorthand or unexpanded abbreviations in documentation, code comments, and commit messages.

---

## 5. Testing, Build & Release Commands

- **Execute Automated Unit Tests**:
  ```bash
  npm test
  ```
- **Compile Production Build**:
  ```bash
  npm run build
  ```
- **Preview Standardized Release (Dry Run)**:
  ```bash
  npm run release -- --dry-run
  ```
