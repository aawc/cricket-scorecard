# Walkthrough - Comprehensive Byes Handling

I have successfully updated the scoring rules for Byes in a clean commit without any special tags.

## Changes Made

### 1. Bye Delivery Scoring (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Refactored `byeBtn` to open `#extraRunsModal`. In the modal number listener, selecting any extra runs > 0 for a Bye instantly closes the modal and executes `finalizeDelivery('bye', runs, 'byes')`.
- **Ball Counts**: In accordance with user instructions, byes now correctly increment `live.balls`, `bowler.balls`, and `activeB.balls` (crediting a ball faced to the batsman without adding runs to their personal score or against the bowler).
- Removed obsolete `addBye()` function.

### 2. UI & Documentation
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Footer version updated to `v1.28.0`.
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated to reflect exact bye scoring rules.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Added Test 13 verifying that byes increment batsman balls without adding runs.

## Verification Results

### Automated Verification
All 13 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
