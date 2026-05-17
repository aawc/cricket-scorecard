# Prompt: Cricket Scorecard PWA

Create a standalone website on GitHub Pages that can be used as an offline PWA (Progressive Web App) to enter and keep track of scores during a game of cricket.

## Core Requirements

### 1. Functionality
- **Score Tracking**: Allow users to input runs, wickets, extras (wides, no balls, byes, leg byes).
    - **Run Out Specification**: When a run out occurs, allow specifying whether the striker or non-striker was run out.
    - **Extra Runs Specification**: Allow specifying extra runs when a wide, no ball, or run out happens, and whether they accrue to the batsman or byes (always against the current bowler). For byes, the ball counts unless it is a wide or no ball.
- **Configurable Match Parameters**:
    - Innings per team is always 1. (Remove option to configure this).
    - Number of overs per innings (default: 8).
    - Maximum allowed overs per bowler (default: 2).
- **Configurable Rules**:
    - Standard rules apply (1 run penalty + extra ball for wides/no balls, penalty runs fixed at 1).
    - **Single Batsman Rule**: Provide a setting to allow a single batsman to play (default: true) even though this is not allowed under standard cricket rules.
    - **Leg Byes Option**: Provide an option to disable leg byes in settings.
- **Full Scorecard Mode**: Include a toggle to display the scoreboard in a clean, compact monospace table layout optimized for taking screenshots to share. Display complete match status and individual player stats for each innings, including individual bowler Wides and No Balls columns. Ensure no invalid extra innings appear when the match ends.
- **Full Scorecard Toggle**: Provide a smooth 3D page flip animation to switch back and forth between scoring entry and Full Scorecard mode.
- **Player Management**:
    - Interactive drag-and-drop roster cards with SortableJS for batting order sorting and between-team transfers.
    - Bulk paste import modal for rapid roster loading.
    - Dual-team toggle button (`🔁`) to flag and automatically mirror shared players across both teams.
    - Select current batsmen and bowler from filtered dropdowns on the scorecard.
- **Over Log**: For each over, display the details of the previous balls in the current over (e.g., showing a sequence like "0, 1, wd, 4, W").
- **Strike Rotation**: Make sure to switch the batsman on strike at the end of the over.
- **Player Selection**: Use dropdowns on the scorecard to select players. Do not show player names that are not eligible. Do not show the name of the bowler who has reached their max overs limit.
- **Striker Marker**: Use a clear mechanism (e.g., distinct styling like background color) to indicate the striker.
- **Innings End**: Once all eligible batsmen are out, or the maximum total allowed overs have been bowled, the innings is over.
- **Match Over Logic (Single Innings)**: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, or overs run out.
- **Stats Accuracy**: Ensure the ball that a batsman gets out on is counted against their name in terms of balls faced.
- **Validation**: Count the number of players and see if that's enough players, considering the total number of overs and the max overs per bowler. If not, flag that as an error and do not start the match until the user addresses it.
- **Permalink**: Provide a way to create a permalink so that the scoreboard state can be transferred to a different device for continuing there.
- **Reset Match**: Provide a mechanism to reset the match state and return to the settings screen. **When hitting reset, retain all match settings (such as overs per innings or max overs per baller or teams) but forget all information about the innings i.e. balls bowled, runs scored, etc.**
- **Button States**: Disable the screenshot and the reset buttons when on the match settings page (match not started).
- **Visibility**: When on the match settings page, do not show the scoreboard section.
- **Second Innings Stats**: During the second innings, show the target, the current run rate, and the target run rate.

### 2. Technical Specifications
- **Hosting**: Static website to be hosted on GitHub Pages.
- **Tech Stack**: Vanilla HTML, CSS, and JavaScript only. Use Bootstrap 5 via CDN for styling. Do not use any JS frameworks (React, Vue, etc.) or build steps (Webpack, Vite, etc.) to keep it simple and directly hostable.
- **Themes**: Support a few different themes (e.g., Light, Dark, Cricket Green).
- **Offline Support**: Implement a Service Worker and Web App Manifest to allow the app to be installed and used offline as a PWA.
- **State Persistence**: Use `localStorage` to persist the game state so that progress is not lost on page reload or if the app is closed.
- **License**: The project should be licensed under the MIT License.
- **Testing**: Add tests to make sure the functionality so far does not regress. Include documentation about how to run tests. Run all relevant tests on each edit. Add tests for CRR/RRR display and innings end on max overs.

### 3. UI/UX
- **Mobile-First**: The design must be optimized for mobile devices, as it will be used on the field.
- **Usability**: Use large, easy-to-tap buttons for score input. Disable controls when a valid player needs to be selected or when the match is over.
- **Clean Layout**: The interface should be intuitive and clear, enhanced by Bootstrap.
- **Screenshot Mode Layout**: Use a table for better layout and use a popular fixed-width font (monospace) for text in this mode.
- **Footer**: Always include a version number for the scorecard on the footer of the page and when it was deployed (include date and time). **Update the version information only when making code changes, not for documentation updates.**
- **Credits**: Include a line in the footer that says that this site was built by Varun Khaneja using Gemini with a link to his GitHub at github.com/aawc.

## Standing Instructions for Development
- Keep `PROMPT.md` updated with all confirmed requirements and changes in a way that it can be independently used by another LLM to recreate or update the project.
- Keep `README.md` updated with project status and features.
- Do not add any special tags such as AGY and CONV or any other internal tags in commit messages or documentation.
- All files related to this project, such as `task.md`, must always be created in the current directory.
- Always update the footer in `index.html` with the version number, deployment date, and deployment time on each update (restricted to code changes as per above requirement).
