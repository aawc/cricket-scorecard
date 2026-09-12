# Bug Investigation and Resolution Report

**Repository**: `cricket-scorecard-pwa`  
**Date**: 2026-09-07  
**Status**: `[PASS]` Automated Tests Passing  
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

---

### 9. Live Sync Polling Lag & Stale HTTP Cache on Spectator Refresh
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 82)
- **Affected Components**: [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L10), [`backend/cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L84), [`public/sw.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public/sw.js#L45)
- **Diagnostic Context**:
  - Bug Report: 2026-09-10T06:36:30.325Z | App Version `v20260908-004`
  - Feedback: "Score updates are so slow that they appear to not be happening automatically - there seems to be a 10+ second lag, and the score doesn't always update even after hitting refresh (shows stale state still)"
  - Payload: Score `16 / 1` in 1.3 overs (Team 2 batting, Team 1 bowling).
- **Root Cause**:
  1. **Edge CDN `Cache-Control` Header in Edge Worker** ([`backend/cloudflare/worker.js#L84`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L84)): Returned `'Cache-Control': 'public, max-age=1, stale-while-revalidate=4'`. When spectators polled or refreshed, the browser and edge CDN served stale cached responses for up to 4–5 seconds instead of querying the Cloudflare KV store.
  2. **Missing `cache: 'no-store'` & Timestamp Query Parameter in Storage Providers** ([`src/sync.ts#L137`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L137), [`src/sync.ts#L224`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L224)): In `CloudflareKVStorageProvider.fetchPacket` and `GoogleSheetsStorageProvider.fetchPacket`, `fetch()` was invoked without cache-busting timestamp queries (`?_t=...`), `cache: 'no-store'`, or `Pragma: no-cache` headers. Repeated requests hit the browser memory/disk cache.
  3. **Overly Conservative Polling Cadence** ([`src/sync.ts#L10`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L10)): Active tab polling was set to 3500ms and umpire sync debounce to 250ms. Compounded by 4–5s stale HTTP caching, spectator score updates took 10+ seconds.
  4. **Service Worker Interception** ([`public/sw.js#L45`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public/sw.js#L45)): `public/sw.js` fetch listener did not explicitly bypass live sync API endpoints (`/api/match/`, `action=fetch`, `_t=`, `script.google.com`, `workers.dev`, `khaneja.org`).
- **Resolution**:
  1. Updated [`backend/cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L84) GET handler to return `'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0'`, `'Pragma': 'no-cache'`, and `'Expires': '0'`.
  2. Updated [`CloudflareKVStorageProvider.fetchPacket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L137) and [`GoogleSheetsStorageProvider.fetchPacket`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L224) in `src/sync.ts` to append dynamic `_t=${Date.now()}` query parameters, pass `cache: 'no-store'`, and rely strictly on CORS-safelisted request headers (`Accept: application/json`) to avoid CORS preflight rejection.
  3. Optimized polling cadence in [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L10): Decreased `ACTIVE_POLL_INTERVAL_MS` to 1500ms (1.5s) for real-time live score propagation, `DEBOUNCE_SYNC_MS` to 150ms for umpire action streaming, and `BACKGROUND_POLL_INTERVAL_MS` to 10000ms (10s) for background tabs.
  4. Added explicit bypass in [`public/sw.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public/sw.js#L45) fetch listener for `/api/match/`, `action=fetch`, `_t=`, and cloud backend hosts.
- **Verification**: `[PASS]` Verified by automated Test 82 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2675) reproducing the reported payload, validating cache-busting headers and query parameters, and asserting immediate state synchronization on manual refresh.

---

### 10. Multi-Device Umpire Link Resumption State Loss & Cloud Overwrite
- **Severity**: `[CRITICAL]`
- **Status**: `[PASS]` Resolved & Verified (Test 83)
- **Affected Components**: [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L408), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L180)
- **Diagnostic Context**:
  - Bug Report / Problem: Opening an umpire link (e.g. `https://varun.khaneja.org/cricket-scorecard/?live=m_qo74hk3a&key=k_4cpigb3r8o2x4i9w`) on a new device does not resume the existing match state, shows the blank "Start Match" setup form, and overwrites the remote match data with the blank state.
- **Root Cause**:
  1. **Premature `startLiveSession()` on Page Load** ([`src/ui.ts#L183`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L183)): When `liveParams.matchId && liveParams.writeKey` were detected in URL parameters during `init()`, the app invoked `startLiveSession(gameState, liveParams.matchId, liveParams.writeKey)`. On a new device or fresh browser session without existing `localStorage`, `gameState` is the blank initial setup state (`matchStarted: false`).
  2. **Remote Cloud Overwrite**: `startLiveSession()` immediately pushed the local state via `syncStateIfLive(state, true)`, permanently overwriting the live cloud storage packet with the unstarted blank state.
  3. **Missing Umpire Remote State Hydration**: There was no dedicated mechanism to fetch the remote `LiveMatchPacket`, verify write key authorization (`hashWriteKey(writeKey) === packet.writeKeyHash`), unminify and hydrate the match state into local `gameState` and `localStorage`, and synchronize sequence numbers before allowing new scoring actions.
- **Resolution**:
  1. Implemented and exported [`resumeUmpireSession()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L613) in `src/sync.ts`:
     - Halts existing timers via `stopLiveSync()`.
     - Fetches existing `LiveMatchPacket` from the active cloud storage provider.
     - Performs cryptographic authentication by asserting `hashWriteKey(writeKey) === packet.writeKeyHash`.
     - Decompresses and unminifies the remote state and sets `matchStarted = true`.
     - Updates `currentLiveSession` with `role: 'UMPIRE'`, `seq: packet.seq`, `status: 'SYNCED'`, and timestamp metadata.
     - Hydrates `localStorage` keys (`cricket_scorecard_state`, `activeLiveMatchId`, `liveWriteKey_${matchId}`) so page reloads on the new device maintain scoring credentials.
     - Invokes `onStateLoaded(decompressed)` callback to hydrate UI.
  2. Updated `init()` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L195) to invoke `resumeUmpireSession` when `liveParams.matchId && liveParams.writeKey` are present in the URL, updating `gameState`, unhiding scoreboard/flip-container, applying saved theme, and re-rendering UI without pushing unstarted state.
- **Verification**: `[PASS]` Verified by automated Test 83 in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2845) creating a match on Device 1, simulating Device 2 with blank state/cleared storage, verifying unauthorized write key rejection, verifying authorized resumption and state hydration (16/1 in 1.3 ov), asserting cloud packet is never overwritten with blank state, scoring 4 runs on Device 2, and verifying cloud packet synchronization with sequence number 3.

---

### 11. Single-Umpire Role Enforcement & Automatic Demotion to Spectator
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 84)
- **Affected Components**: [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L385), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L181)
- **Requirement / Problem**:
  - The live sync architecture requires strict single-writer enforcement (only 1 active Umpire per match). If an umpire link is opened in a new window, browser tab, or second device, the previous umpire session must automatically detect the takeover, revoke its write credentials, transition to Spectator mode, lock scoring controls, and continue receiving real-time live score updates.
- **Resolution**:
  1. **Unique Client Instance Identification (`umpireClientId`)**: Added `umpireClientId` generation (`generateRandomString('c_', 12)`) in `src/sync.ts` attached to `LiveSessionState` and `LiveMatchPacket`.
  2. **Takeover Announcement & Sequence Progression**: When `resumeUmpireSession` is invoked with a valid write key on a new device, it generates a new `umpireClientId`, creates a takeover packet with `seq: packet.seq + 1`, and publishes it to the storage provider to claim the active umpire token.
  3. **Continuous Takeover Polling & Liveness Monitoring**: Implemented `startUmpirePolling()` in [`src/sync.ts#L482`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L482) running an active polling loop during Umpire sessions.
  4. **Automatic Demotion Controller (`demoteUmpireToSpectator`)**: When the previous umpire client detects `packet.umpireClientId !== currentLiveSession.umpireClientId`, it executes [`demoteUmpireToSpectator()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L385):
     - Halts pending umpire write queues and timers.
     - Clears `liveWriteKey_${matchId}` from `localStorage`.
     - Sanitizes the browser URL via `history.replaceState` to strip `&key=...`.
     - Transitions `role` to `'SPECTATOR'` and clears write authorization.
     - Decompresses and updates local state from the latest remote packet.
     - Triggers demotion listeners (`onUmpireDemoted`) which display an alert/toast to the user and locks all scoring controls via `updateUI()`.
---

### 12. 0-Run Wicket Partnership Balls Display & Analytics Pane Scrolling Lock
- **Severity**: `[MEDIUM]`
- **Status**: `[PASS]` Resolved & Verified (Test 90)
- **Affected Components**: [`src/v2/charts.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L253), [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L37), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1091)
- **Diagnostic Context**:
  - Bug Report / Problem:
    1. In the second innings, the final partnership (e.g. 0 runs off 1 ball) displays as `0 runs off 0 balls` (`0 (0b)`) instead of `0 runs off 1 ball` (`0 (1b)`).
    2. The analytics page sometimes stops scrolling until a hard refresh occurs.
- **Root Cause Analysis**:
  1. **Hardcoded 0-Run Partnership Label** ([`src/v2/charts.ts#L253`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L253)): In `renderPartnershipChartSVG()`, when `pship.totalRuns === 0`, the label string was hardcoded to `0 (0b)` rather than dynamically interpolating `${pship.totalRuns} (${pship.totalBalls}b)`.
  2. **Fall of Wickets Batsman Dismissal Alignment** ([`src/v2/bridge.ts#L37`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L37)): `synthesizeEventsFromLiveInnings()` did not consult `innings.fow` records during event synthesis to attribute which batsman was dismissed, causing single-batsman final deliveries to lose their incoming/surviving striker attribution.
  3. **3D Flip Container Height Collapse & Scrolling Lock** ([`src/style.css#L1091`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1091)): `.front-face` and `.back-face` both had `position: absolute`, causing `.flip-container` to collapse to its min-height (`540px`). When tall analytics charts (~1100px) loaded, the content overflowed the container, causing mobile/desktop touch/mouse scrolling to trap or fail until page refresh.
- **Resolution**:
  1. Updated `renderPartnershipChartSVG()` in [`src/v2/charts.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L253) to dynamically format `${pship.totalRuns} (${pship.totalBalls}b)`.
  2. Enhanced `synthesizeEventsFromLiveInnings()` in [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L37) to look up `innings.fow` records and accurately advance striker/non-striker allocations on dismissals.
  3. Refactored `.flip-container`, `.front-face`, and `.back-face` in [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1091) so the currently active card face is in normal document flow (`position: relative`), allowing `.flip-container` to dynamically match the exact height of `#pane-analytics` and eliminate scrolling lockups.
- **Verification**: `[PASS]` Verified by automated Test 90 in [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L325) asserting 2nd innings 0-run 1-ball partnership calculation and `0 (1b)` SVG rendering.

---

### 13. Projected Total Calculation Mismatch & Innings Total Overs Display
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 91)
- **Affected Components**: [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L496), [`src/v2/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/types.ts#L122), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L955), [`src/v2/export.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/export.ts#L27)
- **Diagnostic Context**:
  - Bug Report / Problem:
    1. Projected Total in the Analytics telemetry card was displaying completely inflated numbers (e.g. 121 in a 4-over match where the team was 58/1 in 3.5 overs).
    2. Scoreboard header and summary cards displayed current overs without indicating total overs in the innings (e.g. `Overs: 3.5` instead of `Overs: 3.5 / 4`).
- **Root Cause Analysis**:
  1. **Hardcoded Projected Total Reference**: In [`src/ui.ts#L956`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L956), the telemetry stat card displayed `activeInngs.projectedScores.at8Overs` regardless of match settings (`oversPerInnings`). In a 4-over match at CRR 15.13 rpo, it computed `15.13 * 8 = 121` instead of `15.13 * 4 = 61`.
  2. **Missing Match Total Overs in Inngs Projections**: `projectedScores` lacked a dynamic `totalOvers` field calculated as $\text{round}(\text{CRR} \times \text{oversPerInnings})$, and `InningsProjection` omitted `oversPerInnings`.
  3. **Overs Text Formatting**: In [`src/ui.ts#L1005`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1005), `oversDisplay.textContent` set `Overs: ${overs}.${balls}` without showing ` / ${totalOvers}`.
- **Resolution**:
  1. Updated `projectInnings()` in [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L496) to compute dynamic `totalOvers` projection: `isCompleted ? totalScore : (legalBalls > 0 ? Math.round(crr * oversPerInnings) : 0)`, and added `oversPerInnings` to `InningsProjection`.
  2. Updated `renderVisualAnalytics()` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L955) to display `Projected Total (${gameState.settings.oversPerInnings} ov)` and bind `activeInngs.projectedScores.totalOvers`.
  3. Updated `updateUI()` and `generateSummaryView()` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1002) to format overs as `Overs: ${overs}.${balls} / ${totalOvers}` and `(${overs}.${balls} / ${totalOvers} ov)`.
  4. Updated monospace scorecard export in [`src/v2/export.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/export.ts#L27) to output `(${inngs.oversFormatted} / ${inngs.oversPerInnings} ov)`.
- **Verification**: `[PASS]` Verified by automated Test 91 in [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L371) asserting `oversPerInnings === 4`, `projectedScores.totalOvers === 61`, zero-ball edge case safety, and monospace scorecard format.

---

### 14. Wide + Bye Run Attribution Loss, Duplicated Partnership Batsman & Manhattan Colour Ambiguity
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 92)
- **Affected Components**: [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L78), [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L305), [`src/v2/charts.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L153), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L956)
- **Diagnostic Context**:
  - Reported state: `29 / 1` in `1.1 / 4` overs, 2nd innings, extras `wd 1, by 4`.
  - Bug Report / Problem:
    1. Partnership 1 rendered as **28** runs when the innings total was **29**.
    2. Extras rendered as **4** when the scoreboard recorded **5**.
    3. Manhattan chart colour coding was unreadable — wicket markers were the same hue as expensive overs.
    4. The Analytics telemetry label `Projected Total (4 ov)` was too long for the stat card.
- **Root Cause Analysis**:
  1. **Notation Grammar Mismatch in the v2 Bridge** ([`src/v2/bridge.ts#L78`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L78)): The over-log grammar is authoritatively emitted by the `FINALIZE_DELIVERY` case at [`src/reducer.ts#L212`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L212), specifically the wide handler at [`src/reducer.ts#L236`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L236) and the no-ball handler at [`src/reducer.ts#L259`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L259). The previous parser evaluated `parseInt('wd+4b'.replace('wd', ''), 10)`, which resolves to `4` (JavaScript accepts the leading `+`) and silently discarded the mandatory 1-run wide penalty. The token `wd+4b` therefore contributed 4 runs instead of 5, understating both the innings total and the partnership by exactly one run, and misfiling all four physically-run runs as wides rather than byes. The reducer's own inverse parser at [`src/reducer.ts#L499`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L499) already discriminated these tokens with `startsWith`, so the bridge was the sole outlier.

     | Token | Total runs | Attribution |
     | --- | --- | --- |
     | `wd` | 1 | Wide penalty |
     | `wd+N` | 1 + N | 1 wide + N credited to the striker |
     | `wd+Nb` | 1 + N | 1 wide + N byes |
     | `nb` | 1 | No-ball penalty |
     | `nb+N` | 1 + N | 1 no-ball + N credited to the striker |
     | `nb+Nb` | 1 + N | 1 no-ball + N byes |

  2. **Non-Striker Fallback Duplicated the Striker** ([`src/v2/bridge.ts#L47`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L47)): `synthesizeEventsFromLiveInnings()` derived the opening non-striker by indexing `battingTeamPlayers[1]` unconditionally. When batting slot 1 already held that same player (`currentBatsman1 === 'D'` in a `["C", "D"]` roster), both partnership slots resolved to `D`, so the surviving batsman's contribution could not be attributed.
  3. **Wide Extras Recorded as a Single Aggregate** ([`src/v2/stats.ts#L305`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L305)): `projectInnings()` added the entire `runsExtra` value to both `extras.wides` and `bowler.wides`. In the legacy model these are not the same kind of quantity: `bowler.wides` is a delivery count ([`src/reducer.ts#L225`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L225), `+1` per wide), while `live.extras.wides` accumulates penalty runs ([`src/reducer.ts#L222`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L222), `+= settings.widePenalty`) and therefore only equals the delivery count while `widePenalty === 1`. Adding the full `runsExtra` to both inflated the wide count to 5 and left `extras.byes` at zero.
  4. **Wicket Marker Shared the "Expensive Over" Hue** ([`src/v2/charts.ts#L153`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L153)): `renderManhattanChartSVG()` painted wicket pins `#D55E00`, the identical value used for high-scoring bars, and shipped no legend at all — so bar colour carried information that was never explained and collided with the wicket encoding.
- **Resolution**:
  1. Rewrote the illegal-delivery branch of `synthesizeEventsFromLiveInnings()` in [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L78) to match the suffix against `/^\+(\d+)(b?)$/`, always reserving the penalty run (`runsExtra = 1 + byes`) and routing the remainder to either byes or the striker. Strike rotation now mirrors `physicalRuns` in [`src/reducer.ts#L297`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L297).
  2. Changed the non-striker fallback in [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L47) to `battingTeamPlayers.find(p => p !== activeStriker)`, which cannot duplicate the striker regardless of roster ordering.
  3. Split wide accounting in [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L305) so `extras.wides` and `bowler.wides` increment by one delivery while the surplus runs land in `extras.byes`. The bowler remains charged the full `runsExtra`, matching the reducer.
  4. Made `formatDeliveryNotation()` in [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L110) round-trip wides faithfully as `wd`, `wd+N`, or `wd+Nb` instead of the misleading aggregate `5wd`.
  5. Added an explicit run-bracket legend and a dedicated wicket hue to [`src/v2/charts.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L153). Bar fills and legend swatches now share a single `bracketFor()` source of truth, and wickets use magenta `#CC79A7`, which is distinguishable from every run bracket under red-green colour blindness.

     | Encoding | Colour | Meaning |
     | --- | --- | --- |
     | Sky Blue | `#56B4E9` | `0-7 runs` |
     | Blue | `#0072B2` | `8-14 runs` |
     | Orange | `#D55E00` | `15+ runs` |
     | Magenta pin marked `W` | `#CC79A7` | Wicket |

  6. Shortened the telemetry label to `Projected (N ov)` in [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L956).
- **Verification**: `[PASS]` Verified by automated Test 92 in [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L421), which replays the reported payload and asserts `29/1` in `1.1` overs, extras `total 5 / wides 1 / byes 4`, a single `D` & `C` partnership of 29 runs off 7 balls, bowler figures `0.1-0-5-1`, the `wd+4b` notation round-trip, and the presence of every Manhattan legend token.
  - Red-state evidence (fixes reverted via `git stash`): Test 92 reported `Expected 29/1 in 1.1 ov, got: 28 1 1.1`, and the emitted Manhattan SVG contained both a 24-run bar and a wicket pin rendered `fill="#D55E00"`.

---

### 15. Run-Outs Silently Dropped from v2 Analytics
- **Severity**: `[HIGH]`
- **Status**: `[PASS]` Resolved & Verified (Test 93)
- **Affected Components**: [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L66), [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L98)
- **Diagnostic Context**:
  - Found during the Bug 14 review while enumerating every token the reducer can emit, rather than from a user report. Any match containing a run-out produced v2 analytics that disagreed with the v1 scorecard.
- **Root Cause Analysis**:
  1. **Run-Out Tokens Matched No Branch** ([`src/v2/bridge.ts#L66`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L66)): `executeRunOutWicket()` at [`src/reducer.ts#L730`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L730) emits `W-RO`, `{N}+W-RO`, and `{N}b+W-RO`. The bridge's wicket branch tested only `norm === 'W' || norm.startsWith('W(')`, so none of the three matched. `W-RO` fell through every branch to `parseInt('W-RO')`, yielding `NaN` and a runless non-wicket event, while `3b+W-RO` was captured by the bye branch and read as 3 plain byes. In both cases the dismissal vanished from the wicket count, the fall-of-wickets list, and the partnership breaks.
  2. **Case-Sensitive Dismissal Kind Probe**: Even had a token matched, the kind was derived from `norm.includes('ro')` in lower case, whereas the reducer emits upper-case `RO`. Every run-out would have been classified `bowled` and wrongly credited to the bowler by `isBowlerWicket()`.
  3. **A Third, Divergent Notation Grammar** ([`src/v2/stats.ts#L98`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L98)): `formatDeliveryNotation()` rendered run-outs as `{N}+ro` / `W(ro)`, matching neither the reducer's emitted grammar nor the bridge's parser.
- **Resolution**:
  1. Added run-out handling to `synthesizeEventsFromLiveInnings()` in [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L66). The delivery is marked legal, the prefix before `+W-RO` is parsed for runs completed before the dismissal, and a trailing `b` routes those runs to byes rather than the striker. Odd completed runs rotate the strike, consistent with every other branch. The dismissed batsman is resolved from the innings `fow` records.
  2. Classified these dismissals as `runout`, which [`isBowlerWicket()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L140) excludes, so the bowler is correctly denied credit. The `includes('ro')` substring probe was **removed** rather than repaired: it could never match any token the reducer emits, and it would misclassify any future `W(...)` token containing a fielder or bowler name such as Root, Rohit, or Rossouw as a run out — inverting the defect by denying the bowler a wicket he had earned. Only the exact `-RO` suffix now denotes a run out.
  3. Aligned `formatDeliveryNotation()` in [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L98) with the reducer grammar, emitting `W-RO`, `{N}+W-RO`, and `{N}b+W-RO`.
- **Verification**: `[PASS]` Verified by automated Test 93 in [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L558), replaying the over log `["3+W-RO", "2b+W-RO", "W-RO"]` against a four-man batting side. It asserts 3 wickets, 5 runs off 0.3 overs, extras of exactly 2 byes (the `3+W-RO` runs belong to the bat), bowler figures `0.3-0-3-0` with **zero** wickets credited, that odd completed runs rotate the strike while even ones do not, that every run-out is a legal delivery, and full notation round-trip.
  - The fixture deliberately runs out the **non-striker** on the first ball, so the fall-of-wickets name (`B`) cannot be produced by the `activeStriker` fallback, which would report `A`. Removing the `fow` lookup from the bridge makes the test fail with `B should be out having faced 0 balls`; an earlier draft of this test passed under that same mutation and was rewritten.
  - Red-state evidence (fix reverted via `git stash`): Test 93 reported `Expected 2 run-out wickets, got: 0` against the original two-wicket draft of the fixture.





