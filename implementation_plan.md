# Implementation Plan - Comprehensive Byes Handling

The goal is to update the Bye scoring workflow so that byes correctly count as a valid delivery faced by both the bowler and the active batsman. Clicking "Bye" will trigger the extra runs modal, instantly auto-accruing any selected runs (1, 2, 3, 4) directly to byes without prompting for batsman vs byes.

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.28.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Update `setupEventListeners()`: point `byeBtn` click listener to `triggerExtraRunsModal('bye')`.
- In `extraRunValBtns` click listener: if `currentDeliveryType === 'bye'` and extra runs > 0, immediately dismiss modal and call `finalizeDelivery('bye', runs, 'byes')`. (Clicking 0 cancels).
- Update `finalizeDelivery`: Add `'bye'` handling branch that increments `live.balls`, `bowler.balls`, and `activeB.balls` while adding extra runs strictly to total score and byes tally (never against bowler runs or batsman runs).
- Remove obsolete `addBye()` function.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md).
- Add unit test in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) verifying that byes increment batsman balls faced without adding runs.

## Verification Plan
- Automated: Verify `node test.js` passes successfully.
- Manual: Open browser, start match. Note active batsman balls faced. Click "Bye", select "2". Verify modal instantly closes, score increases by 2 byes, active batsman balls faced increases by 1, and bowler runs do not increase.
