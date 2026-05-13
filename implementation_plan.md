# Implementation Plan - Cricket Scorecard PWA

Create a standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

## Confirmed Decisions

Based on your feedback, I will proceed with the following:

1.  **Tech Stack**: Vanilla HTML, CSS, and JavaScript (no build step, easy hosting on GitHub Pages). Use Bootstrap 5 via CDN for styling.
2.  **State Management**: `localStorage` will be used to persist the game state.
3.  **Cricket Rules**: Standard rules by default, but with **configuration options** in the UI.
    *   **Default Parameters**:
        *   Total number of innings: 1 per team (Always).
        *   Number of overs per innings: 8 (default).
        *   Max allowed overs per bowler: 2 (default).
        *   Wides/No Balls: 1 run penalty + extra ball (default).
        *   Allow single batsman to play: Yes (default).
        *   Enable Leg Byes: Yes (default).
    *   **Configurable**: The user should be able to adjust these parameters before or during the game (if applicable). Added option to disable leg byes.
    *   **Teams/Players**: Support entering player names for both teams. Allow one player to be in both teams. Allow selecting current batsmen and bowler from the player list on the scorecard.
    *   **Match Over Logic (Single Innings)**: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
    *   **Validation**: Count the number of players and ensure there are enough to complete the overs based on the max overs per bowler limit. Do not start the match if insufficient.
4.  **UI Design**: Mobile-first, large buttons for easy tapping on a field. Visually enhanced using Bootstrap. Support multiple themes (e.g., Light, Dark, Cricket Green). Use a flipping page effect to switch between score entry and screenshot mode. Disable screenshot and reset buttons on the settings page. Do not show the scoreboard section when on the match settings page. Include a footer with a version number, deployment date, and time.
5.  **Sharing/Screenshot**: Include a mechanism to display a clean, compact scoreboard view optimized for taking screenshots. Ensure a way to switch back and forth. Permalink support included. Use a table layout and fixed-width font for the summary in screenshot mode. **Fix bug where extra innings is shown in summary when match is over.**
6.  **Over Log**: Display details of previous balls in the current over (e.g., "1wd", "4", "W", "0") to track progress within the over.
7.  **Player Selection Workflow**: Use dropdowns on the scorecard to select players, filtering for eligibility. Disable controls when selection is needed. Bring attention to the dropdowns when selection is required.

## Open Questions

None. I am ready to execute this plan.

## Proposed Changes

### Core Application

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Fix `generateSummaryView` to check `matchOver` before rendering live innings.

## Verification Plan

### Manual Verification
- Simulate a match where the second team gets all out.
- Verify that the summary view does not show an extra innings at the bottom.
