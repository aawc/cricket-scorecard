# Walkthrough - Cricket Scorecard PWA

I have implemented the requested features and core files for the Cricket Scorecard PWA.

## Changes Made

### Core Application
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Added "Enable Leg Byes" checkbox in settings (off by default).
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**:
    - Updated `updateUI` to disable Screenshot and Reset buttons when on the settings page.
    - Updated `updateUI` to hide/show the Leg Bye button based on the "Enable Leg Byes" setting.

### PWA Support and License
- **[manifest.json](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/manifest.json)**: Created for installability.
- **[sw.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/sw.js)**: Implemented basic offline caching.
- **[LICENSE](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/LICENSE)**: Added MIT License.

## Verification Results

### Manual Verification Required
Please perform the following manual verification steps:

1.  **Open `index.html`** in a browser.
2.  **Verify Button States**: On the settings page, verify that "Screenshot" and "Reset" buttons in the header are disabled (grayed out or unclickable).
3.  **Verify Leg Byes Option (Off)**: Leave "Enable Leg Byes" unchecked. Start the match. Verify that the "Leg Bye" button is NOT visible on the scorecard.
4.  **Verify Leg Byes Option (On)**: Reset the match, check "Enable Leg Byes", and start the match. Verify that the "Leg Bye" button IS visible.

Please let me know if you encounter any issues!
