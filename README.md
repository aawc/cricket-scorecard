# Cricket Scorecard PWA

A standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

## Current Status

In progress. Core files created. Reset match behavior update added to the plan.

## Features (Implemented)

- Score tracking (Runs, Wickets, Overs, Extras).
- Configurable match parameters (Overs, Bowler limits, Penalties).
- Mobile-first design with large buttons.
- State persistence using `localStorage`.
- Screenshot mode with full match summary.
- Screenshot Mode Toggle Fix: Added exit button in summary view.
- Undo functionality.
- Reset Match functionality (retains players).
- Web App Manifest for PWA installation.
- Service Worker for offline support.
- MIT License.
- Player Management: Enter names for both teams, support for a player playing in both teams.
- Over Log: Display details of previous balls in the current over.
- Selectable Active Players: Allow selecting current batsmen and bowler on the scorecard.
- Strike Rotation: Automatic strike rotation at the end of the over.
- Dropdown Player Selection: Filtered to only show eligible players.
- Controls Disabling: When selection is needed.
- Single Batsman Rule: Setting to allow a single batsman to play (default: true).
- Striker Indicator: Used background color/border instead of `*`.
- Fixes: Count ball faced on wicket.
- Match Over Logic: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
- Permalink: Generate a URL to share match state across devices.
- Bootstrap Integration: Visually pleasing layout.
- Themes: Support for Light, Dark, and Green themes.
- Flipping Page Effect: Smooth transition between score entry and screenshot mode.
- Enhanced Screenshot Layout: Uses tables and monospace font.
- Retain Players on Reset: Keep player names in settings inputs when hitting reset.
- Disable Leg Byes: Option in settings to disable leg byes (off by default).
- Disable Buttons on Settings: Screenshot and Reset buttons are disabled when match is not started.
- Visibility Fix: Scoreboard section is hidden when on the match settings page.
- Footer: Added version number, deployment date, and time.
- Max Overs Enforcement: Bowlers who reach their limit are filtered out.
- Player Count Validation: Ensures enough players to bowl all overs.
- Summary View Fix: No extra innings when match over.
- Credits: Added to footer with emojis.
- Automated Tests: Node.js script for core logic.
- Second Innings Stats: Show Target, CRR, RRR.

## Features (Planned)

- **Reset Match Behavior**: Retain all match settings (overs, penalties, etc.) and player names on reset, but clear all innings data.

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no build step).
- Bootstrap 5 (via CDN).
- Node.js (for running tests).

## License

MIT License. See [LICENSE](LICENSE) for details.
