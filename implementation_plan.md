# Implementation Plan - Byes Base Run Calculation

The goal is to align the Byes extra runs calculation with Wides and No Balls, treating 1 bye as a base given. Selecting extra runs (e.g., 2) in the modal will add to the base 1 bye (resulting in 3 total byes). Selecting 0 extra runs will correctly score exactly 1 standard bye.

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.29.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- In `finalizeDelivery`, update the `'bye'` handling branch: `const totalByes = 1 + extraRuns;`
- Remove `if (extraRuns === 0) return;` so that selecting 0 extra runs correctly scores 1 base bye.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) to explicitly document that 1 bye is a base given.
- Update Test 13 in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) with `global.mockExtraRuns = 2` to verify 3 byes total (1 + 2). Automated unit tests run automatically.

## Verification Plan
- Automated: Verify `node test.js` passes successfully.
- Manual: Open browser, start match. Click "Bye", select "0". Verify score increases by 1 bye and over log shows `1b`. Click "Bye", select "2". Verify score increases by 3 byes and over log shows `3b`.
