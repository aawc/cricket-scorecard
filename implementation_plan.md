# Implementation Plan - Auto-Accrue Wide Extras to Byes

The goal is to streamline the extra runs workflow for Wides by automatically accruing any extra runs to Byes, skipping the "Batsman vs Byes" selection prompt since runs cannot be credited to a batsman on a wide delivery.

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.26.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- In the `extraRunValBtns` click listener inside `setupEventListeners()`:
  - Check if `currentDeliveryType === 'wide'`.
  - If it is a Wide and extra runs > 0 are selected, immediately dismiss `#extraRunsModal` and execute `finalizeDelivery('wide', selectedExtraRuns, 'byes')` rather than revealing the `accrualSection`.
  - For No Balls and Run Outs, continue to reveal `accrualSection` as normal when extra runs > 0.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) to explicitly document that wide extra runs always default to byes without prompting.
- Run automated unit tests (`node test.js`) to verify Test 9 and scoring stability.

## Verification Plan
- Automated: Verify `node test.js` passes successfully.
- Manual: Open browser, start match, click "Wide". Click "2" extra runs. Verify modal instantly closes (does not ask Batsman vs Byes), and total score increases by 3 runs (1 wide penalty + 2 byes).
