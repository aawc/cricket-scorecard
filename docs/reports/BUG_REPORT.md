# Bug Investigation and Resolution Report

**Repository**: `cricket-scorecard-pwa`  
**Date**: 2026-09-07  
**Status**: `[PASS]` All 41 Automated Tests Passing  
**Build**: `v20260907-001`  

---

## Executive Summary

During a detailed inspection of the match state machine, scoring engine, and UI layer of the Cricket Scorecard PWA, six distinct bugs were identified and resolved. The primary defect reported by the user involved a critical batsman active state desynchronization where both batsmen became marked as `active: true` simultaneously. When a dismissal subsequently occurred, the wrong batsman was marked as out.

All identified defects have been fixed in [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L1-L638) and [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1-L1142). Comprehensive automated unit and regression tests were added in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1-L1205), expanding test coverage from 34 to 41 assertions.

---

## Bug Inventory & Analysis

### 1. Dual Active / Inactive Batsmen on Slot Replacement & Dismissal
- **Severity**: `[CRITICAL]`
- **Affected Components**: [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L241-L246), [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L541-L555)
- **Primary Symbols**: [`assignBatsmanToSlot`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L373), [`getStriker`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L332), [`autoSelectEligiblePlayers`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L602)
- **Root Cause**:
  1. `CHANGE_BATSMAN` and `autoSelectEligiblePlayers` hardcoded `active: true` when `slot === 1` and `active: false` when `slot === 2`, under the flawed assumption that Slot 1 is permanently the striker and Slot 2 is permanently the non-striker.
  2. Because strike rotates dynamically throughout an innings, Slot 2 frequently becomes the active striker (`active: true`) while Slot 1 becomes the non-striker (`active: false`).
  3. When a dismissal occurred to the batsman in Slot 1 (e.g. non-striker run out), selecting a replacement batsman for Slot 1 unconditionally assigned `active: true` to the incoming player. Because the surviving batsman in Slot 2 was already `active: true`, **both batsmen became marked as `active: true`**.
  4. Conversely, if the striker in Slot 2 was dismissed while Slot 1 was `active: false`, assigning a replacement in Slot 2 set `active: false`, leaving **both batsmen marked as `active: false`**.
  5. The striker lookup formula `(live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active) ? live.currentBatsman1 : (live.currentBatsman2 || '')` always favored Slot 1 when both were `active: true`. When a wicket fell on the next ball, Slot 1 was dismissed regardless of who was actually on strike.
- **Resolution**:
  - Implemented [`assignBatsmanToSlot`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L373) which contextually assigns `active = !otherBatsman.active` whenever a batsman is selected or replaced, maintaining the single-active-batsman invariant.
  - Implemented [`getStriker`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L332) with automatic corruption self-healing across all delivery handlers.
- **Verification**: `[PASS]` Verified by Tests 35, 36, and 37 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L997-L1100).

---

### 2. Missing Batsman Balls Faced & Strike Rotation on Leg Byes
- **Severity**: `[HIGH]`
- **Affected Component**: [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L107-L135)
- **Primary Symbol**: Action handler for `ADD_LEG_BYE`
- **Root Cause**:
  `ADD_LEG_BYE` incremented team score, extras leg byes, innings balls, and bowler balls, but omitted:
  1. Incrementing the active striker's balls faced (`activeB.balls++`).
  2. Rotating the strike on the completed 1 run (`rotateStrike(live)`).
- **Resolution**:
  - Identified the active striker via [`getStriker`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L332), incremented `activeB.balls++`, and invoked [`rotateStrike`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L354).
- **Verification**: `[PASS]` Verified by Test 38 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1102-L1130).

---

### 3. Out-of-Order Over Completion & Duplicate Strike Rotation on 6th-Ball Byes
- **Severity**: `[MEDIUM]`
- **Affected Component**: [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L215-L235)
- **Primary Symbol**: Action handler for `FINALIZE_DELIVERY` (`type === 'bye'`)
- **Root Cause**:
  Inside `FINALIZE_DELIVERY` for byes, `checkOverComplete(nextState)` was invoked inside the `else if (type === 'bye')` branch *before* the outer strike rotation `if (physicalRuns % 2 !== 0) rotateStrike(live)`. On ball 6 with 1 bye:
  1. `checkOverComplete` executed first, archived the over, and rotated strike.
  2. The outer block then rotated strike a second time, leaving the wrong batsman on strike for the next over.
- **Resolution**:
  - Removed premature `checkOverComplete` call from the inner bye branch.
  - Standardized the post-delivery pipeline to rotate strike for physical runs first, followed by `checkMatchOver(nextState) || (type === 'bye' && checkOverComplete(nextState))`.
- **Verification**: `[PASS]` Verified by Test 39 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1132-L1147).

---

### 4. Omitted Strike Rotation for Odd Extra Runs Completed on Run Outs
- **Severity**: `[MEDIUM]`
- **Affected Component**: [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L540-L600)
- **Primary Symbol**: [`executeRunOutWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L540)
- **Root Cause**:
  When batsmen completed an odd number of runs (e.g. 1 completed run) before a run out occurred, `executeRunOutWicket` failed to adjust the surviving batsman's strike state to reflect that the batsmen had crossed ends.
- **Resolution**:
  - Updated [`executeRunOutWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L540) to assign `live.batsmen[survivingBatsman].active = (extraRuns % 2 !== 0) ? isStriker : !isStriker`.
- **Verification**: `[PASS]` Verified by Test 40 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1149-L1180).

---

### 5. Final Dismissal Missing from `outBatsmen` on All-Out Transitions
- **Severity**: `[MEDIUM]`
- **Affected Component**: [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L154-L167), [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L569-L586)
- **Primary Symbols**: `ADD_WICKET`, [`executeRunOutWicket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L540)
- **Root Cause**:
  In both `ADD_WICKET` and `executeRunOutWicket`, `handleAllOut(nextState)` was evaluated and returned *before* `live.outBatsmen.push(outBatsmanName)` and slot clearing were executed. Consequently, the last dismissed batsman was omitted from `outBatsmen` in archived innings.
- **Resolution**:
  - Moved `outBatsmen.push()`, `active = false`, and slot clearing to execute *before* checking the `handleAllOut` condition.
- **Verification**: `[PASS]` Verified by Tests 6, 8, and 40 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts).

---

### 6. Incorrect Winning Margin in Match Status Display for Single Batsman Mode
- **Severity**: `[LOW]`
- **Affected Component**: [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L732-L738)
- **Primary Symbol**: [`updateUI`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L580)
- **Root Cause**:
  Line 735 hardcoded `totalPlayers - 1 - live.wickets` for the winning wicket margin, assuming standard 2-batsman play where maximum wickets equals `totalPlayers - 1`. In Single Batsman mode, maximum wickets equals `totalPlayers`, causing the UI to report 1 fewer winning wicket than actual.
- **Resolution**:
  - Updated calculation to `maxWickets - live.wickets` with singular/plural formatting ("1 wicket" vs "2 wickets").
- **Verification**: `[PASS]` Verified by Test 41 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1182-L1203).

---

## Test & Verification Evidence

All unit tests executed through the test harness pass with zero regressions:

```
> cricket-scorecard-pwa@1.0.0 test
> node --loader ts-node/esm test/test.ts

Running tests...
Migration: Archiving live innings on load
All tests passed!
```

### Test Suite Coverage Breakdown

| Test ID | Test Scenario | Expected Outcome | Status |
| :--- | :--- | :--- | :--- |
| **Tests 1-7** | Scoring, odd run rotation, wide, wicket, max overs innings end, 2nd innings CRR/RRR | State updates accurately | `[PASS]` |
| **Tests 8-14** | Run out non-striker, wide extras, no ball extras, run out extras, lone batsman transition | Correct stats attribution | `[PASS]` |
| **Tests 15-29** | Incomplete over archiving, auto-selection, minification roundtrip, LZString permalinks | Clean serialization | `[PASS]` |
| **Tests 30-34** | Disabled leg byes validation, legacy permalink inference, collapsible overs, compact stats, active highlight | UI & state fidelity | `[PASS]` |
| **Test 35** | **Bug 1 Reproduction**: Non-striker run out with Slot 1 replacement | Only 1 batsman active; striker dismissed on next ball | `[PASS]` |
| **Test 36** | **Bug 1b Reproduction**: Striker in Slot 2 out with Slot 2 replacement | Exactly 1 batsman active; runs accrue to new striker | `[PASS]` |
| **Test 37** | **Bug 1c Reproduction**: Re-selecting initialized batsman in dropdown | Active flag set contextually | `[PASS]` |
| **Test 38** | **Bug 2 Reproduction**: Leg bye scoring | Batsman balls faced increments; strike rotates on 1 run | `[PASS]` |
| **Test 39** | **Bug 3 Reproduction**: 1 Bye on ball 6 of over | Over archives cleanly; correct batsman faces next over | `[PASS]` |
| **Test 40** | **Bug 4 & 5 Reproduction**: Run out with completed 1 run + all-out push order | Surviving striker crosses; out batsman recorded in outBatsmen | `[PASS]` |
| **Test 41** | **Bug 6 Reproduction**: Match status display in Single Batsman mode | Accurate winning wicket margin text | `[PASS]` |

---

## Code Diff Summary

### `src/reducer.ts`
```diff
--- a/src/reducer.ts:L330-L370
+++ b/src/reducer.ts:L330-L370
[+] function getStriker(live: LiveInnings): string {
[+]     if (live.currentBatsman1 && live.currentBatsman2) {
[+]         const b1Active = !!live.batsmen[live.currentBatsman1]?.active;
[+]         const b2Active = !!live.batsmen[live.currentBatsman2]?.active;
[+]         if (b1Active && !b2Active) return live.currentBatsman1;
[+]         if (!b1Active && b2Active) return live.currentBatsman2;
[+]         if (live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
[+]         if (live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = false;
[+]         return live.currentBatsman1;
[+]     }
[+]     if (live.currentBatsman1) {
[+]         if (live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
[+]         return live.currentBatsman1;
[+]     }
[+]     if (live.currentBatsman2) {
[+]         if (live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = true;
[+]         return live.currentBatsman2;
[+]     }
[+]     return '';
[+] }
[ ]
[+] function assignBatsmanToSlot(live: LiveInnings, slot: 1 | 2, name: string): void {
[+]     if (!name) return;
[+]     if (slot === 1) live.currentBatsman1 = name;
[+]     else live.currentBatsman2 = name;
[+]     const otherSlotName = slot === 1 ? live.currentBatsman2 : live.currentBatsman1;
[+]     let isActive = true;
[+]     if (otherSlotName && live.batsmen[otherSlotName]) {
[+]         isActive = !live.batsmen[otherSlotName].active;
[+]     }
[+]     if (!live.batsmen[name]) {
[+]         live.batsmen[name] = { runs: 0, balls: 0, active: isActive };
[+]     } else {
[+]         live.batsmen[name].active = isActive;
[+]     }
[+] }
```

---

### 7. Decentralized Versioning & Release Management Automation
- **Severity**: `[MEDIUM]`
- **Status**: `[PASS]` Resolved & Verified (Tests 73-77)
- **Affected Components**: [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1), [`src/release_notes.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/release_notes.ts#L1), [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1), [`src/feedback.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L1), [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L577), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1496)
- **Root Cause**:
  1. Version numbers were manually updated and hardcoded across disconnected files (`index.html`, `public/sw.js`, `src/feedback.ts`, `package.json`).
  2. The application lacked a standardized timestamped semantic tagging scheme (`v$yyyy.$mm.$nnn`) and automated repository tag generation/push mechanism.
  3. The page footer displayed static text with no interactive release notes dialog or colorblind-accessible change manifest.
- **Resolution**:
  1. Created [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1) as the single source of truth for semantic versioning (`APP_VERSION = 'v2026.09.001'`), dynamic tag sequence parsing, and release history.
  2. Authored [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1) to automate dynamic tag calculation (`v$yyyy.$mm.$nnn`), git log parsing, highlights extraction, file synchronization, pre-release test execution, and repository tag push.
  3. Implemented [`src/release_notes.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/release_notes.ts#L1) and `#releaseNotesModal` with colorblind-safe badges (`[FEAT]`, `[FIX]`, `[DOCS]`, `[TEST]`, `[PERF]`), commit hashes linked to GitHub, and keyboard/focus management.
  4. Embedded the interactive `#footer-release-badge` pill in `index.html` and `src/style.css`.
  5. Authored [`CONTRIBUTING.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/CONTRIBUTING.md#L1) providing clear developer instructions for issue reporting, TDD regression testing, and release management.
- **Verification**: `[PASS]` Verified by Tests 73, 74, 75, 76, and 77 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2145).

---

### 8. Empty Batsman Dropdown during Innings Break & Missing 2nd Innings Start Controls
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 81)
- **Affected Components**: [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L870), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L985), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1135), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1575), [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L182), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L645)
- **Diagnostic Context**:
  - Bug Report: 2026-09-09T02:05:42.934Z | App Version `v20260908-004`
  - Feedback: "After the first team got all out, there were no batsmen left to select. Expected: show batsmen from the second team in the drop-down."
  - Payload: Team 2 all out for 12 in Innings 1 (Target: 13). `phase = 'INNINGS_BREAK'`, `ci = 1`, `cbt = 2`, `outBatsmen = ['G', 'E', 'F']`.
- **Root Cause**:
  1. When Innings 1 concludes (all-out, max overs, early declaration), the state transitions to `INNINGS_BREAK`. In `INNINGS_BREAK`, `currentBattingTeam` is still Team 2 and `outBatsmen` contains all players of Team 2.
  2. The application previously lacked an on-screen Innings Break banner or explicit "Start 2nd Innings" button, relying exclusively on a transient alert modal callback. If the modal was dismissed, not triggered (e.g. on permalink/localStorage load), or viewed in spectator mode, the UI remained on the main scoreboard.
  3. `updateUI()` did not branch on `phase === 'INNINGS_BREAK'` and attempted to populate the batsman dropdowns using `battingTeam.players` (Team 2) filtered against `outBatsmen` (`['G', 'E', 'F']`). Because all players were out, 0 candidates were rendered in the dropdown and no mechanism was available to advance to the 2nd innings.
  4. In `generateScorecardSummary()`, `liveInnings` was rendered alongside archived Innings 1 during `INNINGS_BREAK`, causing duplicate summary display.
- **Resolution**:
  1. Added an interactive `#innings-break-banner` in [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L182) and [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L645) displaying the match target, chasing team requirement, and a prominent `▶ Start 2nd Innings` button (`#start-next-innings-btn`).
  2. Implemented and exported [`startNextInnings()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1575) in `src/ui.ts` which dispatches `START_NEXT_INNINGS` to transition the state machine to `PLAYING_INNINGS`, advance `currentInnings` to 2, flip `currentBattingTeam` to the chasing team, reset `liveInnings`, and clear `outBatsmen`.
  3. Updated `checkControlsState()` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1135) to lock keypad scoring controls and player dropdowns during `INNINGS_BREAK` while keeping `start-next-innings-btn` and `undo-btn` enabled (with spectator mode locks).
  4. Updated `populateDropdown` handling during `INNINGS_BREAK` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L870) to prompt "Innings Break - Click 'Start 2nd Innings'".
  5. Updated `generateScorecardSummary()` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L770) to prevent duplicate innings rendering during `INNINGS_BREAK`.
- **Verification**: `[PASS]` Verified by automated Test 81 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2595) reproducing the exact bug report state payload and asserting banner visibility, control locking, clean 2nd innings transition, and player dropdown population for both teams.


