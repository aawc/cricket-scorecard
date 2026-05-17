# Walkthrough - Byes Base Calculation Refinement

I have successfully refined the Byes scoring calculation in a clean commit without any special tags.

## Changes Made

### 1. Byes Base Calculation (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Updated `finalizeDelivery` so that Byes are calculated as `1 base bye + extraRuns`. Selecting 0 extra runs in the modal correctly scores exactly 1 standard bye; selecting 2 extra runs records 3 total byes.

### 2. Documentation & Tests
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Footer version updated to `v1.29.0`.
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md)** Updated to reflect base bye given rule.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Updated Test 13 (`mockExtraRuns = 2`) to verify 3 byes total (1 + 2).

## Verification Results

### Automated Verification
All 13 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
