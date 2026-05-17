# Walkthrough - Run Out & Extra Runs Specification

I have successfully implemented both requested scoring features in the Cricket Scorecard PWA across two clean, independent commits without any special tags.

## Changes Made

### 1. Run Out Specification (Commit 1)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added a dedicated "Run Out" button in the `extra-buttons` grid and a touch-friendly Bootstrap modal (`#runoutModal`) prompting to select either the Striker or Non-Striker.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Implemented run-out processing logic where team wickets and balls bowled increase, but the bowler does not receive a wicket credit in bowling stats (conforming to official cricket laws). The selected batsman is correctly marked out and their slot cleared for the incoming player.

### 2. Extra Runs Specification (Commit 2)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added `#extraRunsModal` prompting for extra runs (0, 1, 2, 3, 4, 6) and whether they accrue to the Batsman or Byes. Footer version updated to `v1.19.0`.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Wides, No Balls, and Run Outs trigger the extra runs modal. Wides/No Balls add base penalty + extra runs to total score and bowler runs without incrementing balls. Run Outs add extra runs to total score and bowler runs while incrementing balls. If accrued to Batsman, active batsman runs increase; if Byes, byes tally increases.

### 3. Documentation & Tests
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated with confirmed requirements and features list.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Added comprehensive automated unit tests for Run Out (striker/non-striker), Wide + extra runs (byes), No Ball + extra runs (batsman), and Run Out + extra runs.

## Verification Results

### Automated Verification
All 11 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
