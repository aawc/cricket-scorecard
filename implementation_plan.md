# Implementation Plan - Run Out & Extra Runs Specification

The goal is to implement two new scoring capabilities in the Cricket Scorecard PWA, committed separately without any special tags:
1. **Run Out Specification**: Allow specifying whether the striker or non-striker is run out when a run out occurs.
2. **Extra Runs Specification**: Allow specifying extra runs on Wides, No Balls, and Run Outs, asking whether runs accrue to the batsman or byes (always counting against the current bowler).

## User Review Required
- **UI/UX Workflow**: We will introduce two Bootstrap modals (`runoutModal` and `extraRunsModal`) to provide quick, touch-friendly prompts for on-field scoring without cluttering the main interface.
- **Commit Strategy**: As requested, changes will be made and committed in two distinct phases (Change 1, then Change 2).

## Open Questions
None. The requirements and cricket scoring rules are clear.

## Proposed Changes

### Phase 1: Run Out Specification (Striker vs Non-Striker)

#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Add a dedicated "Run Out" button in the `extra-buttons` row (adjusting columns from `col-4` to `col-3` to fit Wide, No Ball, Wicket, and Run Out).
- Add a Bootstrap modal (`#runoutModal`) with buttons to select either the Striker or Non-Striker.
- Update footer version to `1.18.0`.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Add event listener for the "Run Out" button to trigger `#runoutModal`.
- Add `processRunOut(isStriker)` function:
  - Increments team wickets.
  - Increments bowler balls and live balls (but does NOT credit the bowler with a wicket in bowler stats, per cricket laws).
  - Marks the selected batsman as out (`outBatsmen.push`).
  - Clears the current batsman slot to prompt selection of the incoming batsman.
  - Logs 'W-RO' in the over log.
- Save state to `localStorage` and update UI.

#### [MODIFY] [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)
- Add unit tests for Run Out (verifying correct batsman is removed, ball counts, but bowler wicket count does not increment).

---

### Phase 2: Extra Runs on Wides, No Balls, and Run Outs

#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Add `#extraRunsModal` Bootstrap modal. It will prompt for extra runs (0, 1, 2, 3, 4, 6) and whether they accrue to Batsman or Byes.
- Update footer version to `1.19.0`.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Refactor `addWide`, `addNoBall`, and `processRunOut` to trigger `#extraRunsModal`.
- When extra runs are specified:
  - If Wide: Add base wide penalty + extra runs to total score and to current bowler runs. (Ball does not count).
  - If No Ball: Add base no ball penalty + extra runs to total score and to current bowler runs. (Ball does not count).
  - If Run Out: Add extra runs to total score and current bowler runs. Ball counts. Wicket is taken.
  - If accrued to Batsman: Add extra runs to active batsman.
  - If accrued to Byes: Add extra runs to byes tally. (For byes, ball counts unless Wide/No Ball).

#### [MODIFY] [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)
- Add unit tests for Wide + extra runs (Batsman vs Byes), No Ball + extra runs, and Run Out + extra runs.

## Verification Plan

### Automated Tests
- Run `node test.js` to verify all unit tests pass.

### Manual Verification
1. Start match in browser.
2. Click "Run Out". Verify modal opens showing correct striker and non-striker names. Select one, verify they are marked out and wicket increases.
3. Click "Wide", select 2 extra runs accrued to Byes. Verify score increases by 3 (1 wide penalty + 2 byes), bowler runs increase by 3, balls do not increase.
