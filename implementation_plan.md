# Implementation Plan - Strike Rotation on Extra Runs

The goal is to ensure that when extra runs are scored on any delivery (Wides, No Balls, Byes, Run Outs), the strike correctly rotates between active batsmen if the physical runs completed are an odd number (1, 3, 5).

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.31.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Extract strike rotation logic into a reusable `rotateStrike()` helper function.
- Update `addRuns()` and `checkOverComplete()` to use `rotateStrike()`.
- In `finalizeDelivery()`, calculate `physicalRuns` (`extraRuns` for Wides/No Balls/Run Outs, and `1 + extraRuns` for Byes).
- If `physicalRuns % 2 !== 0`, call `rotateStrike()` before finishing the delivery.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md) to document strike rotation on extras.
- Add unit Test 14 in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) verifying strike rotation on 1 wide + 1 overthrow. Automated tests run automatically.

## Verification Plan
- Automated: Verify `node test.js` passes cleanly.
- Manual: Open browser, start match. Note active striker (e.g. P1). Click "Wide", select "1". Verify score increases by 2 (1 wide + 1 run) and strike successfully rotates to non-striker (P2).
