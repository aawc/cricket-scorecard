# Walkthrough - Full Scorecard Mode & Bowler Extras Tracking

I have successfully implemented the requested view renaming and enhanced bowler statistics across clean, independent commits without any special tags.

## Changes Made

### 1. UI Renaming & Header Updates (Commit `index.html`)
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Renamed `#screenshot-mode-btn`, `#exit-screenshot-mode-btn`, and `#summary-section` titles from "Screenshot" / "Match Summary" to "Full Scorecard". Footer version updated to `v1.24.0`.

### 2. Bowler Wides & No Balls Columns (Commit `app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Enhanced bowler data structures (`liveInnings.bowlers`) to track individual wide and no-ball counts. Updated `finalizeDelivery` to increment tallies on wide and no-ball deliveries. Updated `generateSummaryView` to render two new table columns: `Wides` and `No Balls`.

### 3. Documentation & Tests
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated to reflect "Full Scorecard" terminology and bowler extras columns.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Added Test 12 to verify bowler wide and no-ball tallies count accurately in memory.

## Verification Results

### Automated Verification
All 12 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
