# Walkthrough - Strike Rotation on Extra Runs

I have successfully refined the strike rotation logic for extra runs in a clean commit without any special tags.

## Changes Made

### 1. Strike Rotation on Extras (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Extracted active switching into a reusable `rotateStrike()` helper. Updated `finalizeDelivery` to calculate physical runs run by batsmen (`extraRuns` for Wide/No Ball/Run Out, and `1 + extraRuns` for Byes). If physical runs are odd (`% 2 !== 0`), `rotateStrike()` successfully switches the active striker before concluding the delivery.

### 2. Documentation & Tests
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Footer version updated to `v1.31.0`.
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated to document exact strike rotation rules on extras.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Added Test 14 verifying strike rotation on 1 wide + 1 overthrow.

## Verification Results

### Automated Verification
All 14 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
