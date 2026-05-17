# Implementation Plan - Full Scorecard Mode & Bowler Extras

The goal is to rename the screenshot mode to "Full Scorecard" mode and enhance the bowler summary tables to display the total number of wides and no balls bowled by each bowler.

## Proposed Changes

### 1. Rename Screenshot Mode to Full Scorecard Mode
#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Change `#screenshot-mode-btn` text from "Screenshot" to "Full Scorecard".
- Change `#exit-screenshot-mode-btn` text from "Exit Screenshot Mode" to "Exit Full Scorecard".
- Change `#summary-section` card title from "Match Summary" to "Full Scorecard".
- Update footer version to `1.24.0`.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Update `initBowlerStats` to initialize `wides: 0` and `noballs: 0`.
- In `finalizeDelivery`, increment `bowler.wides` on a wide delivery and `bowler.noballs` on a no ball delivery.
- In `generateSummaryView`, update bowlers table headers to include `Wides` and `No Balls` columns and populate row data.

### 2. Documentation & Verification
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md) to reflect "Full Scorecard" terminology and bowler extras tracking.
- Add unit tests in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) verifying bowler wides and noballs count correctly.

## Verification Plan
- Run `node test.js` to verify unit tests pass.
- Manual verification: Click "Wide" and "No Ball", open "Full Scorecard", verify bowler row displays exact wide and no ball tallies.
