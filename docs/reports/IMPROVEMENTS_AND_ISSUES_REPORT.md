# Cricket Scorecard PWA: Comprehensive Issues & Domain Improvements Report

**Date**: 2026-09-07  
**Repository**: `cricket-scorecard-pwa`  
**Application**: Progressive Web App (PWA) Cricket Scorecard & Match Scorer  
**Author**: Jetski AI Assistant / vakh  
**Version**: `v20260907-002`

---

## Executive Summary

A comprehensive review of the `cricket-scorecard-pwa` codebase and scoring engine was conducted across domain accuracy (MCC Laws of Cricket compliance), state management, UI/UX interaction, mobile touch ergonomics, accessibility (red-green color blindness standards), and offline PWA resilience.

A total of **12 key issues and enhancements** were identified, categorized, implemented, and verified through an automated test suite (`npm test`), strict TypeScript type checking (`npx tsc --noEmit`), and production build verification (`npm run build`).

---

## Table of Contents

1. [Issue Severity & Categorization Matrix](#1-issue-severity--categorization-matrix)
2. [Detailed Issues, Root Cause Analysis & Fixes](#2-detailed-issues-root-cause-analysis--fixes)
   - [Bug 1 [CRITICAL]: Dual Active Batsman & Wrong Dismissal on Replacement](#bug-1-critical-dual-active-batsman--wrong-dismissal-on-replacement)
   - [Bug 2 [HIGH]: Leg Bye Extra Ball Accounting & Strike Rotation Defect](#bug-2-high-leg-bye-extra-ball-accounting--strike-rotation-defect)
   - [Bug 3 [HIGH]: Over-End Transition Out-of-Order Strike Inversion](#bug-3-high-over-end-transition-out-of-order-strike-inversion)
   - [Bug 4 [HIGH]: Run Out Strike Resolution with Completed Physical Runs](#bug-4-high-run-out-strike-resolution-with-completed-physical-runs)
   - [Bug 5 [MEDIUM]: Winning Margin Miscalculation in Single Batsman Mode](#bug-5-medium-winning-margin-miscalculation-in-single-batsman-mode)
   - [Improvement 1 [HIGH]: Individual Batsman Boundary Counters (4s & 6s) & Strike Rate](#improvement-1-high-individual-batsman-boundary-counters-4s--6s--strike-rate)
   - [Improvement 2 [HIGH]: Bowler Maiden Over Tracking & Economy Calculation](#improvement-2-high-bowler-maiden-over-tracking--economy-calculation)
   - [Improvement 3 [HIGH]: Fall of Wickets (FOW) Timeline & Partnership Tracking](#improvement-3-high-fall-of-wickets-fow-timeline--partnership-tracking)
   - [Improvement 4 [MEDIUM]: Multi-Run Leg Byes Support](#improvement-4-medium-multi-run-leg-byes-support)
   - [Improvement 5 [HIGH]: Accurate Bowler Runs on No-Balls with Byes](#improvement-5-high-accurate-bowler-runs-on-no-balls-with-byes)
   - [Improvement 6 [MEDIUM]: Early Declaration / Forfeit / Force End Innings](#improvement-6-medium-early-declaration--forfeit--force-end-innings)
   - [Improvement 7 [HIGH]: Red-Green Color Blindness Accessible Striker & Badge Indicators](#improvement-7-high-red-green-color-blindness-accessible-striker--badge-indicators)
   - [Improvement 8 [MEDIUM]: Plaintext Scorecard Generator & One-Click Copy](#improvement-8-medium-plaintext-scorecard-generator--one-click-copy)
3. [MCC Laws of Cricket Compliance Checklist](#3-mcc-laws-of-cricket-compliance-checklist)
4. [Automated Verification & Test Suite](#4-automated-verification--test-suite)
5. [Summary of File Modifications](#5-summary-of-file-modifications)

---

## 1. Issue Severity & Categorization Matrix

| ID | Issue Title | Category | Severity | Status |
|:---|:---|:---|:---|:---|
| **BUG-1** | Dual active batsman state & wrong dismissal on slot replacement | State / Scoring Engine | `[CRITICAL]` | `[PASS] Fixed` |
| **BUG-2** | Leg bye delivery balls faced & strike rotation defect | Scoring Engine | `[HIGH]` | `[PASS] Fixed` |
| **BUG-3** | 6th-ball extra over-end strike inversion race condition | State Machine | `[HIGH]` | `[PASS] Fixed` |
| **BUG-4** | Run out strike resolution with completed physical runs | Scoring Engine | `[HIGH]` | `[PASS] Fixed` |
| **BUG-5** | Single batsman winning margin calculation in match status | UI / Calculation | `[MEDIUM]` | `[PASS] Fixed` |
| **IMP-1** | Batsman individual boundary counters (`4s`, `6s`) and Strike Rate (`SR`) | Feature / Domain | `[HIGH]` | `[PASS] Added` |
| **IMP-2** | Bowler maiden over calculation (`M`) and Economy rate (`Econ`) | Feature / Domain | `[HIGH]` | `[PASS] Added` |
| **IMP-3** | Fall of Wickets (`FOW`) progression tracking in live and summary | Feature / Domain | `[HIGH]` | `[PASS] Added` |
| **IMP-4** | Multi-run leg byes support (1, 2, 3, 4, 6 leg byes) | Domain / UI | `[MEDIUM]` | `[PASS] Added` |
| **IMP-5** | No-ball bowler runs vs fielding byes extra separation | Domain / Scoring | `[HIGH]` | `[PASS] Fixed` |
| **IMP-6** | Early Declaration / Forfeit / Force End Innings support | Workflow / Match Engine | `[MEDIUM]` | `[PASS] Added` |
| **IMP-7** | Red-green colorblind accessibility with double-encoding & high contrast | Accessibility / UI | `[HIGH]` | `[PASS] Added` |
| **IMP-8** | Plaintext scorecard exporter for sharing to chat/social | Utility / UX | `[MEDIUM]` | `[PASS] Added` |

---

## 2. Detailed Issues, Root Cause Analysis & Fixes

### Bug 1 [CRITICAL]: Dual Active Batsman & Wrong Dismissal on Replacement

- **Location**: [`src/reducer.ts#L441-L463`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L441-L463) (`assignBatsmanToSlot`), [`src/reducer.ts#L400-L420`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L400-L420) (`getStriker`)
- **Symptoms**: When a non-striker was run out and a replacement batsman was chosen for Slot 1, both batsmen became marked as `active: true`. When a wicket subsequently fell, the non-facing incoming batsman was dismissed instead of the active striker facing the delivery.
- **Root Cause**: The slot assignment logic previously defaulted any newly instantiated batsman object in Slot 1 to `active: true` unconditionally, without inspecting the active state of the surviving batsman in Slot 2.
- **Resolution**:
  - Implemented strictly synchronized strike determination in [`assignBatsmanToSlot`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L441-L463):
    ```typescript
    const otherSlotName = slot === 1 ? live.currentBatsman2 : live.currentBatsman1;
    let isActive = true;
    if (otherSlotName && live.batsmen[otherSlotName]) {
        isActive = !live.batsmen[otherSlotName].active;
    }
    ```
  - Added self-healing invariant validation in [`getStriker`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L400-L420) to guarantee exactly one active striker at all times.
- **Verification**: Covered by Tests 35, 36, and 37.

---

### Bug 2 [HIGH]: Leg Bye Extra Ball Accounting & Strike Rotation Defect

- **Location**: [`src/reducer.ts#L141-L168`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L141-L168) (`ADD_LEG_BYE`), [`src/reducer.ts#L286-L308`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L286-L308) (`FINALIZE_DELIVERY`)
- **Symptoms**: Calling Leg Bye did not credit a ball faced to the batsman on strike and failed to rotate strike on odd leg bye runs.
- **Root Cause**: `ADD_LEG_BYE` incremented team score and extras, but omitted updating the striker's `balls` counter and did not call `rotateStrike(live)`.
- **Resolution**:
  - Incremented `activeB.balls++` on leg byes per MCC Law 24.2.2.
  - Added strike rotation on odd physical runs completed for leg byes.
- **Verification**: Covered by Tests 38 and 46.

---

### Bug 3 [HIGH]: Over-End Transition Out-of-Order Strike Inversion

- **Location**: [`src/reducer.ts#L295-L308`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L295-L308) (`FINALIZE_DELIVERY`)
- **Symptoms**: When a single bye/leg-bye occurred on the 6th ball of an over, the batsman who crossed was incorrectly left on strike for the start of the next over.
- **Root Cause**: `checkOverComplete` executed strike rotation before the delivery's physical run rotation had settled, causing strike to be inverted twice in the wrong order.
- **Resolution**: Ordered physical crossing rotation prior to over-end end-swap rotation:
  1. Batsmen cross during delivery (`physicalRuns % 2 !== 0`).
  2. Over completes, ends change (`checkOverComplete`).
- **Verification**: Covered by Test 39.

---

### Bug 4 [HIGH]: Run Out Strike Resolution with Completed Physical Runs

- **Location**: [`src/reducer.ts#L650-L715`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L650-L715) (`executeRunOutWicket`)
- **Symptoms**: When a run out occurred during the attempt of a second or third run, the surviving batsman was incorrectly assigned strike without considering completed crossings.
- **Root Cause**: `executeRunOutWicket` assumed the surviving batsman always retained their initial end regardless of how many runs were physically completed before the wicket was broken.
- **Resolution**: Evaluated `extraRuns % 2` to determine whether surviving batsman crossed to the striker's end prior to dismissal.
- **Verification**: Covered by Tests 40 and 45.

---

### Bug 5 [MEDIUM]: Winning Margin Miscalculation in Single Batsman Mode

- **Location**: [`src/ui.ts#L750-L772`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L750-L772) (`updateUI`)
- **Symptoms**: When `allowSingleBatsman` was enabled and a team won with 0 wickets down, the status text displayed "won by 1 wickets" instead of "won by 2 wickets".
- **Root Cause**: Calculation hardcoded `totalPlayers - 1` without checking `allowSingleBatsman`.
- **Resolution**: Updated `maxWickets = allowSingleBatsman ? totalPlayers : totalPlayers - 1` and computed remaining wickets dynamically.
- **Verification**: Covered by Test 41.

---

### Improvement 1 [HIGH]: Individual Batsman Boundary Counters (4s & 6s) & Strike Rate

- **Location**: [`src/types.ts#L1-L8`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L1-L8), [`src/reducer.ts#L125-L130`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L125-L130), [`src/ui.ts#L440-L460`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L440-L460)
- **Description**: Standard scorecards must record boundaries (`4s` and `6s`) per batsman and compute batting Strike Rate (`(runs / balls) * 100`).
- **Implementation**:
  - Added `fours: number; sixes: number;` to [`BatsmanStats`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L1-L8).
  - Tracked in [`ADD_RUNS`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L106-L140) and [`FINALIZE_DELIVERY`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L216-L308).
  - Serialized compactly (`f`, `s`) in [`minifyState`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/storage.ts#L172-L220).
  - Rendered in HTML summary tables and text scorecard export.
- **Verification**: Covered by Tests 42, 49, and 50.

---

### Improvement 2 [HIGH]: Bowler Maiden Over Tracking & Economy Calculation

- **Location**: [`src/types.ts#L9-L17`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L9-L17), [`src/reducer.ts#L500-L530`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L500-L530), [`src/ui.ts#L500-L525`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L500-L525)
- **Description**: Bowler figures must include completed maiden overs (`O - M - R - W`) and Economy rate (`runs / (balls / 6)`).
- **Implementation**:
  - Added `maidens: number;` to [`BowlerStats`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L9-L17).
  - Calculated in [`checkOverComplete`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L495-L558): an over is a maiden if 0 runs were conceded off the bat, wides, or no-balls across 6 legal balls. Byes and leg byes do not break a maiden.
- **Verification**: Covered by Tests 43, 44, and 50.

---

### Improvement 3 [HIGH]: Fall of Wickets (FOW) Timeline & Partnership Tracking

- **Location**: [`src/types.ts#L18-L24`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L18-L24), [`src/reducer.ts#L471-L480`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L471-L480), [`src/ui.ts#L480-L498`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L480-L498)
- **Description**: A standard scorecard requires a chronological Fall of Wickets section showing score, wicket number, batsman out, and overs elapsed (e.g. `1-10 (P1, 0.4 ov)`).
- **Implementation**:
  - Added `FallOfWicket` interface and `fow: FallOfWicket[]` to `LiveInnings`.
  - Automatically recorded upon every standard dismissal (`ADD_WICKET`) and run out (`executeRunOutWicket`).
  - Rendered in a responsive badge container in Full Scorecard and Text Scorecard.
- **Verification**: Covered by Tests 45, 49, and 50.

---

### Improvement 4 [MEDIUM]: Multi-Run Leg Byes Support

- **Location**: [`src/reducer.ts#L286-L308`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L286-L308), [`src/ui.ts#L948-L964`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L948-L964)
- **Description**: In cricket matches, batsmen can run 2, 3, or more leg byes. Previously, the app only supported a static 1-leg-bye button.
- **Implementation**:
  - Connected the leg-bye action to the Extra Runs modal, enabling scoring 1, 2, 3, 4, 5, or 6 leg byes.
  - Automatically accrues runs to fielding extras (`extras.legbyes`) without charging the bowler.
  - Odd leg byes rotate strike; even leg byes preserve strike.
- **Verification**: Covered by Test 46.

---

### Improvement 5 [HIGH]: Accurate Bowler Runs on No-Balls with Byes

- **Location**: [`src/reducer.ts#L238-L260`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L238-L260)
- **Description**: Under MCC Law 21.18, when byes or leg byes occur on a No-Ball delivery, only the 1-run penalty is charged to the bowler's figures; the additional byes belong strictly to fielding extras.
- **Implementation**:
  - In `FINALIZE_DELIVERY` (`type === 'noball'`):
    - If `accrueTo === 'batsman'`, `bowler.runs += totalRuns`.
    - If `accrueTo === 'byes'`, `bowler.runs += noBallPenalty` and `extras.byes += extraRuns`.
- **Verification**: Covered by Test 47.

---

### Improvement 6 [MEDIUM]: Early Declaration / Forfeit / Force End Innings

- **Location**: [`src/reducer.ts#L67-L104`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L67-L104), [`src/ui.ts#L995-L1000`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L995-L1000), [`index.html#L310-L330`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L310-L330)
- **Description**: Matches frequently conclude early due to declaration, forfeit, weather, or agreement.
- **Implementation**:
  - Added "End Innings" button and `#endInningsModal` confirmation dialog.
  - In Innings 1: archives live innings, sets target (`score + 1`), and transitions to Innings 2.
  - In Innings 2: archives live innings and declares match over with final result margin.
- **Verification**: Covered by Test 48.

---

### Improvement 7 [HIGH]: Red-Green Color Blindness Accessible Striker & Badge Indicators

- **Location**: [`src/style.css#L25-L65`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L25-L65), [`src/ui.ts#L680-L710`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L680-L710)
- **Description**: Ensure all status cues, active batsman strike indicators, and ball logs are distinguishable without relying on red-green hue differentiation.
- **Implementation**:
  - Active striker container features a prominent solid blue left border (`6px solid #0d6efd`), light blue background tint, and explicit `[STRIKER]` badge text.
  - Minimum 48px touch target height on mobile score buttons for touch ergonomics.
  - High-contrast ball log badges (wickets in dark charcoal `#212529` with bold border, extras in distinct secondary styling).

---

### Improvement 8 [MEDIUM]: Plaintext Scorecard Generator & One-Click Copy

- **Location**: [`src/ui.ts#L1001-L1065`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1001-L1065), [`index.html#L330-L345`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L330-L345)
- **Description**: Users needed a quick way to copy a formatted scorecard to clipboard for WhatsApp, SMS, or Discord.
- **Implementation**:
  - Implemented [`generateTextSummary()`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1001) formatting status, batsmen figures (with 4s, 6s, SR), extras, Fall of Wickets, and bowler figures (O-M-R-W, Econ).
  - Added "Copy Text Scorecard" button with clipboard integration and fallback alert display.
- **Verification**: Covered by Test 50.

---

## 3. MCC Laws of Cricket Compliance Checklist

- `[PASS]` **Law 18.11 (Batsman crossing on dismissal)**: Incoming batsman takes strike at striker's end on dismissals (other than run-out).
- `[PASS]` **Law 18.12 (Run out crossing)**: Surviving batsman's strike position reflects actual completed runs before wicket broken.
- `[PASS]` **Law 21.18 (No-ball runs distribution)**: Byes/leg-byes on No-Balls assigned to extras, only penalty charged to bowler.
- `[PASS]` **Law 22 (Wides)**: Wide penalties credited to extras and charged to bowler; extras from wide ball handled correctly.
- `[PASS]` **Law 23 (Byes & Leg Byes)**: Credited to team extras; leg byes count as balls faced by striker.
- `[PASS]` **Law 24.2.2 (Balls faced)**: Striker is credited with a ball faced on fair deliveries, leg byes, and dismissals.
- `[PASS]` **Maiden Overs**: Exactly 6 legal deliveries with 0 runs conceded by the bowler off the bat or bowler extras.

---

## 4. Automated Verification & Test Suite

The automated test runner executes unit and regression test cases:

```bash
export PATH="/usr/bin:$(pwd)/node-env/node-v20.11.0-linux-x64/bin:$PATH"
npm test
```

### Execution Log:
```
> cricket-scorecard-pwa@1.0.0 test
> node --loader ts-node/esm test/test.ts

Running tests...
Migration: Archiving live innings on load
Running Test 42...
Running Test 43...
Running Test 44...
Running Test 45...
Running Test 46...
Running Test 47...
Running Test 48...
Running Test 49...
Running Test 50...
All tests passed!
```

### TypeScript Compilation & Production Build:
```bash
npx tsc --noEmit && npm run build
```

```
✓ 9 modules transformed.
dist/index.html                 23.05 kB │ gzip:  3.66 kB
dist/assets/index-WBtIUA0O.css   3.02 kB │ gzip:  1.10 kB
dist/assets/index-Bc888zju.js   45.49 kB │ gzip: 12.24 kB
✓ built in 102ms
Successfully injected 8 assets into dist/sw.js
```

---

## 5. Summary of File Modifications

1. [`src/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts): Added boundary fields (`fours`, `sixes`), bowler maidens (`maidens`), `FallOfWicket` interface, and `fow` list to `LiveInnings`.
2. [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts):
   - Synchronized batsman active strike flags on slot replacements.
   - Added boundary counters tracking in `ADD_RUNS` and `FINALIZE_DELIVERY`.
   - Added maiden over calculation in `checkOverComplete`.
   - Added `FallOfWicket` recording in `ADD_WICKET` and `executeRunOutWicket`.
   - Separated bowler runs from fielding byes on No-Balls.
   - Added multi-run leg bye handling.
   - Handled early declaration/forfeit in `FORCE_END_INNINGS`.
3. [`src/storage.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/storage.ts): Updated state minification (`minifyState`) and restoration (`unminifyState`) for boundaries, maidens, and Fall of Wickets with full backward compatibility.
4. [`src/state.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/state.ts): Initialized `fow: []` in default initial state.
5. [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts):
   - Rendered 4s, 6s, SR, Maidens, Econ, and Fall of Wickets in scorecard summary.
   - Added `generateTextSummary()` and `copyTextScorecard()`.
   - Added End Innings event handlers and modal controls.
   - Updated match status resolution for all completion scenarios.
6. [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html):
   - Added "End Innings" button and `#endInningsModal`.
   - Added "Copy Text Scorecard" button in scorecard summary.
   - Bumped cache version to `v20260907-002`.
7. [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css):
   - Added colorblind-safe active striker border, badge, and background tint.
   - Enforced 48px touch targets for mobile score buttons.
   - Added `.fow-container` layout and high-contrast ball log badges.
8. [`public/sw.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public/sw.js): Updated cache name to `cricket-scorecard-v20260907-002` and included `src/style.css`.
9. [`test/test.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test.ts): Bound `generateTextSummary`, `executeEndInnings`, and `dispatch` into test environment.
10. [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts): Added Tests 42 to 50 covering boundaries, maidens, maiden breaking, Fall of Wickets, multi-run leg byes, no-ball bowler figures, force end innings, state minification roundtrip, and text scorecard formatting.

---

## 6. Milestone 8: Standardized Release Management & Contributor Guide (v2026.09.001)

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Dynamic Semantic Tagging** | [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1) | Centralized single-source-of-truth semantic versioning (`v$yyyy.$mm.$nnn`) with dynamic monthly sequence calculations. | `[PASS] Implemented` |
| **Automated Release CLI** | [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1) | `npm run release` tool for automated pre-release test gates, commit history parsing, highlights extraction, file synchronization, git tag creation, and remote tag push. | `[PASS] Implemented` |
| **Persistent Footer Release Badge** | [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L580), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1496) | Interactive release badge in page footer displaying active version pill, pulsing status indicator, and click-to-open modal interaction. | `[PASS] Implemented` |
| **Integrated Release Notes Modal** | [`src/release_notes.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/release_notes.ts#L1), [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L577) | Accessible dialog (`#releaseNotesModal`) featuring release highlights, complete commit history with short SHA links to GitHub, and colorblind-safe category badges. | `[PASS] Implemented` |
| **Comprehensive Contributor Guide** | [`CONTRIBUTING.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/CONTRIBUTING.md#L1) | Detailed developer documentation on bug diagnosis, Red-Green regression testing, state reducer rules, and release tagging workflows. | `[PASS] Implemented` |
| **Automated Regression Suite (Tests 73-77)** | [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2145) | 5 comprehensive automated tests verifying tag parsing, dynamic sequence calculation, release notes rendering, cross-module version synchronization, and modal opening. | `[PASS] Implemented` |

---

## 7. Milestone 9: Innings Break UI & 2nd Innings Transition Resilience

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Innings Break Banner & 2nd Innings CTA** | [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L182), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L645) | Interactive `#innings-break-banner` with target equation and prominent `▶ Start 2nd Innings` button (`#start-next-innings-btn`). | `[PASS] Implemented` |
| **Innings Break Control Locking & Dropdown Prompts** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L870), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1135) | Locks scoring keys and player selectors during `INNINGS_BREAK`, preventing empty dropdown rendering for all-out teams. | `[PASS] Implemented` |
| **2nd Innings State Transition Handler** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1575) | Implemented `startNextInnings()` dispatching `START_NEXT_INNINGS` to flip batting/bowling teams, reset live figures, and populate 2nd innings rosters. | `[PASS] Implemented` |
| **Innings Summary Duplicate Prevention** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L770) | Prevents duplicate rendering of live innings alongside archived Innings 1 in Full Scorecard mode during innings breaks. | `[PASS] Implemented` |
| **Automated Bug Reproduction & Verification (Test 81)** | [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2595) | Recreated exact user diagnostic payload verifying banner display, control locking, clean 2nd innings transition, and player dropdown population. | `[PASS] Implemented` |

---

## 8. Milestone 10: Live Sync Polling Cadence, Edge Cache Elimination & Instant Refresh

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Edge Cache Elimination** | [`backend/cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L84) | Replaced `stale-while-revalidate=4` with `Cache-Control: no-cache, no-store, must-revalidate, max-age=0`, `Pragma: no-cache`, `Expires: 0` to prevent CDN and browser caching of live matches. | `[PASS] Implemented` |
| **Client-Side Cache-Busting & no-store** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L137), [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L224) | Added dynamic `?_t=${Date.now()}` query parameter, `cache: 'no-store'`, and CORS-safelisted `Accept: application/json` headers to all storage provider `fetchPacket` requests. | `[PASS] Implemented` |
| **Optimized Polling & Debounce Cadence** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L10) | Reduced active polling interval from 3500ms to 1500ms (1.5s) and debounce from 250ms to 150ms for sub-2s score delivery to spectators. | `[PASS] Implemented` |
| **Service Worker API Bypass** | [`public/sw.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public/sw.js#L45) | Explicitly excluded `/api/match/`, `action=fetch`, `_t=`, and cloud backend hosts from Service Worker interception and caching. | `[PASS] Implemented` |
| **Instant Manual Refresh Synchronization** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1820), [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2675) | Verified immediate score update upon spectator manual refresh action without stale caching or lag. | `[PASS] Implemented` |

---

## 9. Milestone 11: Multi-Device Umpire Link Resumption & State Preservation

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Umpire Session Resume Controller** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L613) | Implemented `resumeUmpireSession()` to safely fetch existing cloud match packets, verify write key authorization (`hashWriteKey`), decompress state, and restore sequence numbers without overwriting live data. | `[PASS] Implemented` |
| **App Initialization Hydration** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L195) | Replaced premature `startLiveSession` in `init()` with `resumeUmpireSession` when `liveParams.matchId && liveParams.writeKey` are detected, hydrating `gameState`, unhiding scoreboards, applying themes, and preventing unstarted blank state overwrite. | `[PASS] Implemented` |
| **Local Scoring Authority Persistence** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L664) | Hydrates `localStorage` keys (`cricket_scorecard_state`, `activeLiveMatchId`, `liveWriteKey_${matchId}`) upon resuming on a new device, allowing subsequent page reloads to retain scoring authority and offline recovery. | `[PASS] Implemented` |
| **Automated Multi-Device Resumption Test (Test 83)** | [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L2845) | Automated test simulating live match creation on Device 1, transferring umpire link to Device 2 with clean storage, verifying invalid key rejection, asserting state hydration (16/1 in 1.3 ov), verifying cloud packet preservation, and validating scoring continuation with sequence progression. | `[PASS] Implemented` |

---

## 10. Milestone 12: Single-Umpire Role Enforcement & Automatic Demotion to Spectator

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Unique Client Instance ID (`umpireClientId`)** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L357), [`src/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L87) | Integrated `umpireClientId` into `LiveMatchPacket` and `LiveSessionState` to unambiguously distinguish individual browser windows and devices. | `[PASS] Implemented` |
| **Takeover Announcement & Token Claim** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L625) | When a new window connects with the umpire key, `resumeUmpireSession()` publishes a takeover packet with a fresh `umpireClientId` and `seq: packet.seq + 1`. | `[PASS] Implemented` |
| **Continuous Umpire Takeover Polling** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L482) | Implemented `startUmpirePolling()` running active liveness and takeover detection loops during Umpire sessions. | `[PASS] Implemented` |
| **Automatic Demotion to Spectator** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L385), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L181) | Implemented `demoteUmpireToSpectator()` which clears `localStorage` write keys, sanitizes the URL to `?live=...`, transitions `role` to `SPECTATOR`, locks UI scoring controls, and transitions to spectator live polling. | `[PASS] Implemented` |
| **Automated Single-Umpire Test (Test 84)** | [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L3013) | Automated test simulating Window 1 starting as Umpire, Window 2 claiming Umpire role, Window 1 automatically demoting to Spectator, asserting write key removal and URL sanitization, locking controls, and streaming updates from Window 2. | `[PASS] Implemented` |

---

## 11. Milestone 13: v2 Architecture & Cricket Domain Overhaul (Branch `v2`)

| Enhancement | Module | Description | Status |
| :--- | :--- | :--- | :--- |
| **Architectural Blueprint & Domain Report** | [`docs/architecture/V2_ARCHITECTURE_REPORT.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/V2_ARCHITECTURE_REPORT.md#L1) | Comprehensive 6-part technical report auditing the legacy system, modeling event-sourced delivery streams, deep cricket statistics, zero-dependency visual analytics, hardware integrations, and migration bridge. | `[PASS] Implemented` |
| **Event-Sourced Schemas** | [`src/v2/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/types.ts#L1) | Typed `DeliveryEvent`, `DeliveryWicket`, `InningsProjection`, `Partnership`, `WormChartData`, `ManhattanBar`, and `MatchV2State` domain entities. | `[PASS] Implemented` |
| **Pure Statistical Projection Engine** | [`src/v2/stats.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/stats.ts#L1) | Pure mathematical replay projecting multi-spell bowler figures, partnerships with run/ball breakdowns, Fall of Wickets, maiden overs, extras, and worm/manhattan datasets. | `[PASS] Implemented` |
| **Zero-Dependency SVG Visual Charts** | [`src/v2/charts.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/charts.ts#L1) | High-contrast, colorblind-safe SVG renderers for Match Worm Chart (with wicket indicators), Manhattan Chart (with wicket diamonds), and Partnerships Breakdown bars. | `[PASS] Implemented` |
| **Mobile Ergonomics & Hardware Engine** | [`src/v2/hardware.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/hardware.ts#L1) | Screen Wake Lock controller (`wakeLockController`), tactile Web Haptics engine (`haptics`), and zero-asset Web Audio Synthesizer (`audioSynth`) with defensive platform checks. | `[PASS] Implemented` |
| **Universal Data Portability Suite** | [`src/v2/export.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/export.ts#L1) | Monospace ASCII scorecard exporter, ball-by-ball CSV exporter, and lossless JSON match archives. | `[PASS] Implemented` |
| **Bidirectional Adapter Bridge** | [`src/v2/bridge.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2/bridge.ts#L1) | Seamless adapter translating v1 `GameState` into `DeliveryEvent` streams and v2 projections for backward compatibility. | `[PASS] Implemented` |
| **UI Subtabs & Scoring Telemetry** | [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L35), [`src/style.css`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/style.css#L1855), [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L18) | Added `Scoring` vs `Analytics` subtabs, Wake Lock / Haptics toggles, Export CSV action, and live SVG chart rendering. | `[PASS] Implemented` |
| **Automated Test Suite (Tests 85–89)** | [`test/v2_test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/v2_test_cases.ts#L1) | 5 comprehensive automated tests asserting statistical projections, partnership tracking, SVG chart generation, data export formats, and hardware abstractions. | `[PASS] Implemented` |


