# Implementation Plan - Fixed Wide & No Ball Penalties

The goal is to simplify match settings by removing custom penalty inputs for wides and no balls, hardcoding them to the official cricket standard of 1 run.

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Remove `#wide-penalty` and `#no-ball-penalty` input fields and their labels.
- Update footer version to `1.20.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Remove `widePenaltyInput` and `noBallPenaltyInput` DOM references.
- Ensure `gameState.settings.widePenalty` and `noBallPenalty` are hardcoded to `1`.
- Remove input assignments in `startMatch` and `resetMatch`.

### 3. Documentation
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) to state that extra penalty runs are fixed at 1.
- Update [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md) features list.

## Verification Plan
- Run automated tests (`node test.js`) to verify scoring logic remains unaffected.
- Verify UI loads cleanly with exactly 3 items aligned in the settings row.
