# Task List - Batsman Strike Synchronization & Scorecard Bug Fixes

- [x] Create feature branch `fix-batsman-strike-and-scorecard-bugs`
- [x] Add reproduction tests 35-41 in `test/test_cases.ts` for dual-active batsmen, leg byes, bye 6th-ball ordering, and single batsman status
- [x] Verify red state failure on reproduction test suite
- [x] Fix batsman active state management (`assignBatsmanToSlot` and `getStriker`) in `src/reducer.ts`
- [x] Fix leg bye balls faced increment and strike rotation in `src/reducer.ts`
- [x] Fix 6th-ball bye delivery pipeline ordering in `src/reducer.ts`
- [x] Fix run out odd extra runs strike rotation in `src/reducer.ts`
- [x] Fix all-out dismissal recording in `src/reducer.ts`
- [x] Fix Single Batsman mode winning margin text calculation in `src/ui.ts`
- [x] Update version in `index.html` footer to `v20260907-001` and cache name in `public/sw.js`
- [x] Run unit tests and verify all 41 test assertions pass cleanly (`npm test`)
- [x] Run TypeScript type checking (`tsc --noEmit`)
- [x] Create comprehensive in-repo audit report `BUG_REPORT.md`
- [x] Synchronize `DESIGN.md`, `PROMPT.md`, `README.md`, and `task.md`
- [ ] Run independent subagent code review and pre-commit symbol verification
- [ ] Propose structured commit descriptions and obtain user approval prior to executing git commit
