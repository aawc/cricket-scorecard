# Walkthrough - Toss Selection & Initial Roster Cleanup

I have successfully implemented the toss prompt and empty initial roster rules across clean, independent commits without any special tags.

## Changes Made

### 1. Empty Initial Rosters (Commit `app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Refactored `renderRosters()` to prevent automatic pre-population of placeholder names ("Player 1"). Rosters remain blank on initial page load without saved state, while correctly repopulating on match reset.

### 2. Toss Selection Modal (Commit `index.html`)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added `#tossModal` prompting for which team is batting first. Footer version updated to `v1.25.0`.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: `startMatch()` validates players and opens `#tossModal`. Selecting a team sets `currentBattingTeam` and initializes the match. `updateUI()` populates the scorecard dropdowns correctly based on the toss decision.

### 3. Documentation & Tests
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated to reflect toss selection and roster pre-population rules.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Automated tests fully verified.

## Verification Results

### Automated Verification
All 12 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
