# Implementation Plan - No Ball Batsman Delivery Count

The goal is to refine the No Ball scoring logic so that no balls correctly increment the active batsman's balls faced count while ensuring they do not count towards the bowler's legal delivery count or the total balls in the over.

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.30.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- In `finalizeDelivery()`, update the `'noball'` handling branch to increment `activeB.balls++`.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) to explicitly document that no balls count towards batsman balls faced but not bowler/over balls.
- Update Test 10 in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) to verify that batsman balls faced is 1 on a no ball. Automated unit tests run automatically.

## Verification Plan
- Automated: Verify `node test.js` passes successfully.
- Manual: Open browser, start match. Note active batsman stats (e.g. `0 (0)`). Click "No Ball", select "0". Verify active batsman stats update to `0 (1)` while over balls remaining (`0.0/8`) and bowler stats (`0/0 (0.0)`) remain unchanged.
