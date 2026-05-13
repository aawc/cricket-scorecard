# Walkthrough - Cricket Scorecard PWA

I have implemented the requested features and core files for the Cricket Scorecard PWA.

## Changes Made

### Core Application
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Removed the "Innings per Team" input field.
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**:
    - Hardcoded `totalInnings` to 1.
    - Updated `populateDropdown` for the bowler to filter out players who have reached the `maxOversPerBowler` limit.
    - Added validation in `startMatch` to ensure both teams have enough players to bowl all overs based on the limit.

### PWA Support and License
- **[manifest.json](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/manifest.json)**: Created for installability.
- **[sw.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/sw.js)**: Implemented basic offline caching.
- **[LICENSE](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/LICENSE)**: Added MIT License.

## Verification Results

### Manual Verification Required
Please perform the following manual verification steps:

1.  **Open `index.html`** in a browser.
2.  **Verify Innings Setting**: Confirm that the "Innings per Team" setting is no longer visible.
3.  **Verify Player Count Validation**:
    *   Set "Overs per Innings" to 8 and "Max Overs per Bowler" to 2.
    *   Enter only 3 players for Team 1.
    *   Try to start the match. Verify that an alert appears stating that Team 1 needs at least 4 players.
4.  **Verify Max Overs Enforcement**:
    *   Start a match with enough players.
    *   Bowl the maximum allowed overs with a specific bowler.
    *   Verify that for the next over, that bowler is no longer available in the dropdown list.

Please let me know if you encounter any issues!
