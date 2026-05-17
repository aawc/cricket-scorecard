# Walkthrough - Feature Updates & Penalty Configuration Cleanup

I have successfully implemented the requested feature additions and UI simplifications across clean, independent commits without any special tags.

## Changes Made

### 1. Run Out Specification (Commit `abf1fb4`)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added a dedicated "Run Out" button in the `extra-buttons` grid and a touch-friendly Bootstrap modal (`#runoutModal`) prompting to select either the Striker or Non-Striker.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Implemented run-out processing logic where team wickets and balls bowled increase, but the bowler does not receive a wicket credit in bowling stats (conforming to official cricket laws).

### 2. Extra Runs Specification (Commit `35880aa`)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added `#extraRunsModal` prompting for extra runs (0, 1, 2, 3, 4, 6) and whether they accrue to the Batsman or Byes.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Wides, No Balls, and Run Outs trigger the extra runs modal. Wides/No Balls add base penalty + extra runs without incrementing balls. Run Outs add extra runs while incrementing balls.

### 3. Fixed Wide & No Ball Penalties (Current Commit)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Removed custom `#wide-penalty` and `#no-ball-penalty` input fields from match settings. Footer version updated to `v1.20.0`.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Hardcoded wide and no-ball penalties to official standard `1` run in `gameState.settings`. Removed input assignments in `startMatch` and `resetMatch`.

### 4. Documentation & Tests
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated with live hosting URL, documentation structure table, and fixed penalty rules.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Automated unit tests fully verified.

## Verification Results

### Automated Verification
All 11 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
