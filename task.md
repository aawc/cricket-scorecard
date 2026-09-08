# Task List - Cricket Scorecard Domain Improvements, Issue Audit & Bug Fixes

## Phase 1: Investigation & Domain Auditing
- [x] Comprehensive review of MCC Laws of Cricket (Laws 18, 21, 22, 23, 16) vs current codebase
- [x] Identify boundary calculation gaps (4s & 6s tracking)
- [x] Identify bowler maiden calculation gaps (6 legal balls, 0 bowler runs)
- [x] Identify Fall of Wickets (FOW) sequence tracking absence
- [x] Identify multi-run leg bye handling limits
- [x] Identify MCC Law 21.18 no-ball extras separation issue (bowler vs fielding extras)
- [x] Identify early innings completion / declaration / forfeit mechanism gap
- [x] Identify text scorecard export gap for messaging / offline sharing
- [x] Audit UI/UX against WCAG 2.1 AA and Red-Green colorblind accessibility standards

## Phase 2: Domain Engine & Storage Implementation
- [x] Extend `src/types.ts` data structures (`fours`, `sixes`, `maidens`, `FallOfWicket`, `fow`)
- [x] Implement boundary increments in `src/reducer.ts` (`ADD_RUNS`, `FINALIZE_DELIVERY`)
- [x] Implement maiden over evaluation in `src/reducer.ts` (`checkOverComplete`)
- [x] Implement Fall of Wickets tracking in `src/reducer.ts` (`recordFallOfWicket`, `ADD_WICKET`, `executeRunOutWicket`)
- [x] Implement multi-run leg bye processing in `src/reducer.ts` (`FINALIZE_DELIVERY`)
- [x] Implement MCC Law 21.18 no-ball extras separation in `src/reducer.ts`
- [x] Implement early declaration / forfeit support in `src/reducer.ts` (`FORCE_END_INNINGS`)
- [x] Update state minification and de-minification in `src/storage.ts` (`bat`, `bowl`, `fw`) with backwards compatibility
- [x] Initialize initial state `fow: []` in `src/state.ts`

## Phase 3: Feedback & Diagnostic Bug Reporting Mechanism
- [x] Create `src/feedback.ts` module with runtime error buffer (`recordRuntimeError`, `getRuntimeErrors`, `clearRuntimeErrors`)
- [x] Implement Markdown diagnostic report generator (`generateBugReportMarkdown`) compiling user feedback, match state, striker/non-striker figures, bowler figures, FOW, minified JSON, and permalink
- [x] Implement clipboard copy utility (`copyBugReportToClipboard`) and GitHub issue URL builder (`getGitHubIssueUrl`)
- [x] Initialize `initGlobalErrorListeners()` in `src/app.ts` to capture `window.error` and `window.unhandledrejection`
- [x] Add Feedback / Bug button to header and footer in `index.html`
- [x] Implement `#feedbackModal` dialog with preview accordion, one-click copy, and GitHub issue opener in `src/ui.ts` and `index.html`
- [x] Add feedback modal styling in `src/style.css`
- [x] Bump version to `v20260907-003` in `index.html` footer and `public/sw.js` cache

## Phase 4: Automated Testing Suite Expansion
- [x] Add Tests 42-50 for boundaries, maidens, FOW, multi-run leg byes, no-ball figures, declaration, minification, and text export
- [x] Add Test 51: `generateBugReportMarkdown()` output structure and state inclusion/exclusion
- [x] Add Test 52: Runtime error ring buffer management and overflow protection
- [x] Add Test 53: `getGitHubIssueUrl()` creation, URL encoding, and body truncation
- [x] Verify all 53 test cases pass cleanly (`npm test`)

## Phase 5: Documentation & In-Repo Reports
- [x] Author comprehensive in-repo audit report `IMPROVEMENTS_AND_ISSUES_REPORT.md`
- [x] Update system architecture and roadmap in `DESIGN.md`
- [x] Update application specifications in `PROMPT.md`
- [x] Update project status and features in `README.md`
- [x] Update task progress in `task.md`

## Phase 6: Real-Time Multi-Reader Live State Sync & 4-Week Cloud Retention
- [x] Author comprehensive architecture design report `LIVE_SYNC_DESIGN.md` exploring 6 alternatives with pros/cons and 4-week TTL strategy
- [x] Implement `src/sync.ts` with `LiveSyncService`, `LiveStorageProvider`, `MemoryStorageProvider`, `RestKVStorageProvider`, 4-week TTL calculation, and monotonic sequence numbering
- [x] Extend `src/types.ts` with `LiveRole`, `LiveSyncStatus`, `LiveMatchPacket`, and `LiveSessionState`
- [x] Integrate auto-sync into `dispatch()` in `src/state.ts`
- [x] Implement `#liveModal` dialog, Spectator Mode banner, and connection badges in `index.html`, `src/style.css`, and `src/ui.ts`
- [x] Enforce read-only control locking and auto-polling in Spectator Mode in `src/ui.ts`
- [x] Add automated unit tests 54-62 in `test/test_cases.ts` and `test/test.ts`
- [x] Bump version to `v20260907-004` in `index.html` footer and `public/sw.js` cache
- [x] Synchronize `DESIGN.md`, `README.md`, and `PROMPT.md`
- [x] Verify all 62 automated unit tests pass (`npm test`) and production build succeeds (`npm run build`)

## Phase 7: Code Review & Verification
- [x] Run independent subagent code review (Verdict: `[APPROVED WITH SUGGESTIONS]`)
- [x] Address feedback suggestions (structured error logging, colorblind palette accents)

## Phase 8: Universal Modal Controller, Bulk Paste Fix & Accessibility Guardrail
- [x] Diagnose root cause of "nothing happens" on bulk paste (CDN script block preventing Bootstrap modal handler)
- [x] Diagnose root cause of Chromium `Blocked aria-hidden on an element because its descendant retained focus` console error
- [x] Resolve `<link rel="manifest">` CORS warning with `crossorigin="use-credentials"`
- [x] Create zero-dependency [`src/modal.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/modal.ts) with `openModal()`, `closeModal()`, native backdrop management, and automatic fallback
- [x] Implement W3C WAI-ARIA accessibility focus management in `src/modal.ts`: actively blur focused elements before applying `aria-hidden="true"` and restore focus on close
- [x] Implement embedded pure TypeScript LZString compression in [`src/storage.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/storage.ts) eliminating CDN reliance
- [x] Wire direct click handlers for `#team1-bulk-btn` and `#team2-bulk-btn` in `src/ui.ts`
- [x] Add automated unit tests 63–66 in `test/test_cases.ts`
- [x] Bump application version to `v20260907-005` in `index.html` and `public/sw.js`
- [x] Verify all 66 automated unit tests pass (`npm test`) and production build compiles cleanly (`npm run build`)

## Phase 9: Cloudflare Workers KV & Google Apps Script Storage Backends
- [x] Eliminate 14-day trial service dependencies; replace with permanent free tier Cloudflare Workers KV & Google Apps Script
- [x] Implement [`CloudflareKVStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L93) with sub-50ms edge latency and native `expirationTtl: 2419200` (28 days)
- [x] Implement [`GoogleSheetsStorageProvider`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L150) for turnkey Google ecosystem deployment
- [x] Create turnkey Cloudflare Worker script [`cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/worker.js) and [`cloudflare/wrangler.toml`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/cloudflare/wrangler.toml)
- [x] Create turnkey Google Apps Script script [`google-apps-script/Code.gs`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/google-apps-script/Code.gs)
- [x] Update architectural comparisons in `LIVE_SYNC_DESIGN.md` and document endpoints across `DESIGN.md`, `PROMPT.md`, and `README.md`
- [x] Verify all 66 automated unit tests pass (`npm test`) and production build succeeds (`npm run build`)
- [ ] Pre-Commit confirmation of atomic commits
- [ ] Execute atomic commits
