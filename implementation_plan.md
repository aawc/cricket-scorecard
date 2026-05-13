# Implementation Plan - Cricket Scorecard PWA

Create a standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

## Confirmed Decisions

Based on your feedback, I will proceed with the following:

1.  **Tech Stack**: Vanilla HTML, CSS, and JavaScript (no build step, easy hosting on GitHub Pages). **Use Bootstrap 5 via CDN for styling.**
2.  **State Management**: `localStorage` will be used to persist the game state.
3.  **Cricket Rules**: Standard rules by default, but with **configuration options** in the UI.
    *   **Default Parameters**:
        *   Total number of innings: 1 per team (default).
        *   Number of overs per innings: 8 (default).
        *   Max allowed overs per bowler: 2 (default).
        *   Wides/No Balls: 1 run penalty + extra ball (default).
        *   Allow single batsman to play: Yes (default).
    *   **Configurable**: The user should be able to adjust these parameters before or during the game (if applicable).
    *   **Teams/Players**: Support entering player names for both teams. Allow one player to be in both teams. Allow selecting current batsmen and bowler from the player list on the scoreboard.
    *   **Match Over Logic (Single Innings)**: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
4.  **UI Design**: Mobile-first, large buttons for easy tapping on a field. **Visually enhanced using Bootstrap. Support multiple themes (e.g., Light, Dark, Cricket Green).**
5.  **Sharing/Screenshot**: Include a mechanism (e.g., a "Screenshot Mode" toggle) to display a clean, compact scoreboard view optimized for taking screenshots. Ensure a way to switch back and forth. Permalink support included.
6.  **Over Log**: Display details of previous balls in the current over (e.g., "1wd", "4", "W", "0") to track progress within the over.
7.  **Player Selection Workflow**: Use dropdowns on the scorecard to select players, filtering for eligibility. Disable controls when selection is needed.

## Open Questions

None. I am ready to execute this plan.

## Proposed Changes

### Core Application

#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Add Bootstrap CSS and JS CDN links.
- Refactor structure to use Bootstrap containers, grid, cards, and buttons.
- Add a theme selector in the header or settings.

#### [MODIFY] [style.css](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/style.css)
- Refactor to complement Bootstrap.
- Define custom themes using CSS variables if needed.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Add logic to handle theme switching and persist theme preference in `localStorage`.

## Verification Plan

### Manual Verification
- Verify that the site looks visually pleasing and uses Bootstrap components.
- Verify that theme switching works and persists across reloads.
