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

## Phase 6: Code Review & Commit
- [ ] Run independent subagent code review
- [ ] Propose structured atomic commit descriptions for user pre-commit confirmation
- [ ] Execute git commits upon user confirmation
