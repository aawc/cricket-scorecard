# Walkthrough - Cricket Scorecard PWA

I have implemented the requested features and core files for the Cricket Scorecard PWA.

## Changes Made

### Core Application
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Updated `checkOverComplete` to check if the maximum allowed overs have been bowled for the first innings, and if so, it calls `endInnings()` to set the target and start the next innings.
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Updated the footer to display "Version: 1.14.0 | Deployed: 2026-05-13 08:02".

### PWA Support and License
- **[manifest.json](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/manifest.json)**: Created for installability.
- **[sw.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/sw.js)**: Implemented basic offline caching.
- **[LICENSE](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/LICENSE)**: Added MIT License.

## Verification Results

### Manual Verification Required
Please perform the following manual verification steps:

1.  **Open `index.html`** in a browser.
2.  **Verify Footer**: Verify that the footer displays "Version: 1.14.0 | Deployed: 2026-05-13 08:02".
3.  **Verify Innings End on Max Overs**:
    *   Start a match.
    *   Bowl the maximum allowed overs in the first innings.
    *   Verify that the app automatically ends the innings and prompts for the target, switching to the second innings.

Please let me know if you encounter any issues!
