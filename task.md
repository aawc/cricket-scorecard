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

## Phase 3: UI, Accessibility & PWA Enhancements
- [x] Update Full Scorecard rendering in `src/ui.ts` to include 4s, 6s, SR, Maidens, Econ, and Fall of Wickets table
- [x] Implement `generateTextSummary()` and `copyTextScorecard()` in `src/ui.ts`
- [x] Add End Innings modal and event bindings in `src/ui.ts` and `index.html`
- [x] Add "Copy Text Scorecard" button in `index.html`
- [x] Implement red-green colorblind striker visual indicator (`[STRIKER]` badge, `6px solid #0d6efd` border, tint) in `src/style.css`
- [x] Ensure 48px minimum touch targets in `src/style.css`
- [x] Bump application version in `index.html` footer to `v20260907-002` and service worker cache in `public/sw.js`

## Phase 4: Automated Testing Suite Expansion
- [x] Add Test 42: Batsman 4s and 6s boundary counters and strike rates in `test/test_cases.ts`
- [x] Add Test 43: Bowler maiden overs tracking on 6 consecutive dot balls in `test/test_cases.ts`
- [x] Add Test 44: Maiden over breaking on bowler runs vs preserving on byes in `test/test_cases.ts`
- [x] Add Test 45: Fall of Wickets (FOW) tracking across dismissals and run outs in `test/test_cases.ts`
- [x] Add Test 46: Multi-run leg byes (3 leg byes rotating strike) in `test/test_cases.ts`
- [x] Add Test 47: MCC Law 21.18 no-ball extras separation in bowler figures in `test/test_cases.ts`
- [x] Add Test 48: Force End Innings (Declaration/Forfeit) in Innings 1 and Innings 2 in `test/test_cases.ts`
- [x] Add Test 49: State minification and unminification roundtrip in `test/test_cases.ts`
- [x] Add Test 50: Monospace text scorecard export generation in `test/test_cases.ts`
- [x] Verify all 50 test cases pass cleanly (`npm test`)

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
