# Cricket Scorecard PWA

A standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

**🌐 Live App:** [https://varun.khaneja.org/cricket-scorecard/](https://varun.khaneja.org/cricket-scorecard/)

## Current Status

Fully functional and verified. Advanced extra runs and run out specification implemented. All automated tests passing.

## Features (Implemented)

- Score tracking: Complete ball-by-ball tallying (Runs, Wickets, Overs, Wides, No Balls, Byes, Leg Byes), with Byes counting towards batsman balls faced.
- Configurable match parameters (Overs per innings, Bowler limits). Wide and No Ball penalties fixed at official 1 run.
- Mobile-first design with large buttons.
- State persistence using `localStorage`.
- Full Scorecard mode: Clean monospace match summary featuring individual bowler wide and no-ball tallies.
- Full Scorecard Mode Toggle: Toggle and exit button for switching views.
- Undo functionality.
- Reset Match functionality (retains players).
- Web App Manifest for PWA installation.
- Service Worker for offline support.
- MIT License.
- Toss & Lineup Setup: Start match prompt for toss selection (batting team choice), empty initial rosters that auto-retain upon reset.
- Player Management: Interactive Drag & Drop lineup sorting, between-team transfers, bulk paste import modal, and shared player mirroring.
- Over Log: Display details of previous balls in the current over.
- Selectable Active Players: Allow selecting current batsmen and bowler on the scorecard.
- Strike Rotation: Automatic strike rotation on odd physical runs scored (including extras) and at the end of each over.
- Dropdown Player Selection: Filtered for eligibility, with automatic selection when only one player is eligible, and strict dual-batsman enforcement (or lone striker transition).
- Controls Disabling: When selection is needed.
- Single Batsman Rule: Setting to allow a single batsman to play (default: true).
- Striker Indicator: Used background color/border instead of `*`.
- Run Out Specification: Select whether striker or non-striker is run out.
- Extra Runs Specification: Specify extra runs on Wides, No Balls, and Run Outs, and whether they accrue to the batsman or byes.
- Fixes: Count ball faced on wicket.
- Match Over Logic: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
- Permalink Sharing: Extremely compact, LZString-compressed permalink URL (minified state via `?s=`) for seamless session transfer.
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

- None at this moment.

## Documentation Structure

The repository maintains several core documentation files to manage the AI-assisted development lifecycle:

| Document | Phase | Primary Audience | Core Question Answered |
| :--- | :--- | :--- | :--- |
| **`implementation_plan.md`** | Planning | User & AI | *How are we going to build this feature technically?* |
| **`task.md`** | Execution | AI (Progress Tracking) | *What exact step are we working on right now?* |
| **`walkthrough.md`** | Verification | User | *What exactly did we build and how was it tested?* |
| **`PROMPT.md`** | Project Lifecycle | Future AI / Developers | *What is this entire application and all of its rules?* |

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no build step).
- Bootstrap 5 (via CDN).
- Node.js (for running tests).

## License

MIT License. See [LICENSE](LICENSE) for details.
