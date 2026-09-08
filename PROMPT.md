# Prompt: Cricket Scorecard PWA

Create a standalone website on GitHub Pages that can be used as an offline PWA (Progressive Web App) to enter and keep track of scores during a game of cricket.

## Core Requirements

### 1. Functionality
- **Score Tracking**: Allow users to input runs, wickets, extras (wides, no balls, byes, leg byes).
    - **Boundaries (4s & 6s)**: Record 4s and 6s for batsmen on single taps or modal selection, maintaining separate boundary counters.
    - **Maiden Overs**: Automatically calculate and display maiden overs for bowlers when 6 legal deliveries are bowled with 0 bowler-conceded runs (byes and leg-byes do not break a maiden).
    - **Fall of Wickets (FOW)**: Track chronological sequence of dismissals recording team score, wicket number, batsman dismissed, and over/ball position.
    - **Run Out Specification**: When a run out occurs, allow specifying whether the striker or non-striker was run out, along with completed physical runs.
    - **Extra Runs Specification**: Allow specifying extra runs when a wide, no ball, bye, or run out happens. Wides automatically accrue extra runs directly to byes (skipping batsman vs byes prompt). For Byes, 1 bye run is given as a base; selecting extra runs in the modal adds to this base, always auto-accruing directly to byes. For No Balls and Run Outs, ask whether extra runs accrue to the batsman or byes. In accordance with MCC Law 21.18, 1 penalty run for a no-ball charges to the bowler, while any additional byes/leg-byes accrue to team extras without penalizing bowler figures. For byes and leg byes, the ball counts as a legal delivery for both the bowler and active batsman, and odd runs rotate strike. A no-ball counts as a ball faced for the active batsman, but does not count towards the bowler or total legal balls in the over. Multi-run leg byes (1-6) are supported.
    - **Spectator Mode Controls Lockout**: When in spectator mode (`?live=<id>`), all umpire scoring controls, player selectors, innings declarations, and reset buttons are strictly disabled and hidden, providing a clean, distraction-free live observation dashboard.
    - **Dedicated Start New Match Workflow**: Provide a prominent "New Match" button on the UI and in the match-over banner with confirmation modal safeguards to prevent accidental data loss while allowing instant match resets.
    - **Early Innings End / Declaration**: Provide an "End Innings" feature to conclude an innings early (declaration or forfeit), transitioning safely to the next innings or ending the match.
    - **Monospace Text Scorecard Export**: Provide a "Copy Text Scorecard" button to generate a clean, formatted text scorecard suitable for clipboard sharing via messaging apps or email.
    - **Feedback & Bug Reporting Mechanism**: Provide an interactive modal (`#feedbackModal`) and header button ("Feedback / Bug") allowing users to submit written feedback or bug reports. The modal compiles a complete, structured Markdown diagnostic report containing user description, match state figures (active striker/non-striker stats, bowler maidens/econ, FOW, extras, over history), minified state JSON, LZString permalink, and captured runtime errors. Provide one-click clipboard copying and direct GitHub issue generation.
- **Configurable Match Parameters**:
    - Innings per team is always 1. (Remove option to configure this).
    - Number of overs per innings (default: 8).
    - Maximum allowed overs per bowler (default: 2).
- **Configurable Rules**:
    - Standard rules apply (1 run penalty + extra ball for wides/no balls, penalty runs fixed at 1).
    - **Single Batsman Rule**: Provide a setting to allow a single batsman to play (default: true) even though this is not allowed under standard cricket rules.
    - **Leg Byes Option**: Provide an option to disable leg byes in settings.
- **Full Scorecard Mode**: Include a toggle to display the scoreboard in a clean, compact monospace table layout optimized for taking screenshots to share. Display complete match status and individual player stats for each innings, including individual batsman 4s, 6s, SR, bowler Maidens, Economy, Wides, and No Balls columns, and Fall of Wickets summary. Ensure no invalid extra innings appear when the match ends.
- **Full Scorecard Toggle**: Provide a smooth 3D page flip animation to switch back and forth between scoring entry and Full Scorecard mode.
- **Player Management**:
    - **Toss Selection**: When starting the match, prompt for toss winner (batting first choice) and populate scorecard dropdowns based on that selection.
    - **Initial Roster Rule**: Roster lists start completely empty on initial load (no placeholder pre-population), but retain entered names upon match reset.
    - Interactive drag-and-drop roster cards with SortableJS for batting order sorting and between-team transfers.
    - Bulk paste import modal for rapid roster loading.
    - Dual-team toggle button (`🔁`) to flag and automatically mirror shared players across both teams.
    - Select current batsmen and bowler from filtered dropdowns on the scorecard.
- **Over Log & History**: For each over, display the details of the previous balls in the current over (e.g., showing a sequence like "0, 1, wd, 4, W"). Additionally, store and display a history of all completed and incomplete overs. This is presented in two ways: (U1) as an interactive collapsible list of completed overs on the main scoring screen (showing bowler name, total runs, wickets, and expanding to show ball-by-ball details), and (U2) as a monospace 'Over Log' table in the Full Scorecard mode showing Over #, Bowler, Runs, Wickets, and the sequence of deliveries (with active over marked). Bowler attribution must be tracked for each completed over. Standard undo is sufficient for correcting mistakes (no direct editing of past overs).
- **Strike Rotation**: Switch active batsman on strike at the end of each over and whenever an odd number of physical runs (1, 3) are completed, including physical extra runs on Wides, No Balls, Byes, and Run Outs.
- **Player Selection**: Use dropdowns on scorecard to select active players. If only one candidate is eligible for a missing slot, automatically select that player. Scoring controls remain disabled unless both batsmen are chosen, except when only the lone final batsman remains (in which case, automatically move that player to the striker slot).
- **Striker Marker**: Use clear, colorblind-accessible styling (such as an explicit `●` striker dot, `6px solid #0072b2` accent border, and tinted background) to indicate the active striker. All interactive buttons must have a minimum 48px touch target for WCAG accessibility.
- **Innings End**: Once all eligible batsmen are out, or the maximum total allowed overs have been bowled, or early innings end is confirmed, the innings is over.
- **Match Over Logic (Single Innings)**: For a 1-innings per team game, the match ends when the chasing team passes the target, gets all out, overs run out, or innings is forfeited.
- **Stats Accuracy**: Ensure the ball that a batsman gets out on is counted against their name in terms of balls faced.
- **Validation**: Count the number of players and see if that's enough players, considering the total number of overs and the max overs per bowler. If not, flag that as an error and do not start the match until the user addresses it.
- **Permalink Sharing & Live State Streaming (1-Year Retention)**:
    - **Permalink Compression**: Compress and minify match state using client-side LZString compression and key aliasing (`?s=`), ensuring shareable URLs remain highly compact while preserving support for legacy uncompressed links (`?state=`).
    - **Zero-Cost Live Streaming & Cloud Hosting**: Broadcast match scores live in real time to unlimited parallel spectators at 100% zero cost ($0.00). Match state packets are hosted on serverless Cloudflare Workers KV edge storage (`https://cricket-scorecard-live.khaneja.org/api/match/{matchId}`) or Google Apps Script (`google-apps-script/Code.gs`) with zero user fees.
    - **1-Year Data Retention**: Match states are stored in remote cloud storage with a 1-year TTL (31,536,000 seconds / `ONE_YEAR_SECONDS`) for historical and post-match review.
    - **Role Isolation**: The umpire holds a private write key (`?live=<matchId>&key=<writeKey>`) stored in `localStorage`, while spectators receive a read-only link (`?live=<matchId>`) locking scoring controls and auto-polling updates.
    - **Offline Queue & Reconnection**: Scores entered while offline on the field buffer locally in `localStorage` and flush automatically with monotonic sequence numbering upon network restoration.
- **Reset Match**: Provide a mechanism to reset the match state and return to the settings screen. **When hitting reset, retain all match settings (such as overs per innings or max overs per baller or teams) but forget all information about the innings i.e. balls bowled, runs scored, etc.**
- **Button States**: Disable the screenshot and the reset buttons when on the match settings page (match not started).
- **Visibility**: When on the match settings page, do not show the scoreboard section.
- **Second Innings Stats**: During the second innings, show the target, the current run rate, and the target run rate.

### 2. Technical Specifications
- **Hosting**: Static website compiled via Vite into `dist/` and hosted on GitHub Pages (via custom Actions workflow or manual commit pushing).
- **Tech Stack**: TypeScript (transpiled to standard modern ES2022 JavaScript). Source modules live under `src/` (`app.ts`, `modal.ts`, `state.ts`, `storage.ts`, `sync.ts`, `reducer.ts`, `ui.ts`, `types.ts`, `feedback.ts`). Uses Vite for local development, hot module reloading, and production bundling. Bootstrap 5 via CDN for styling with universal zero-dependency fallback modal controller.
- **State Management**: Governed by a centralized reducer state machine in `src/reducer.ts` which manages match phases (`SETUP`, `TOSS`, `PLAYING_INNINGS`, `INNINGS_BREAK`, `MATCH_OVER`) and dispatches synchronous actions. Asynchronous side-effects (alerts/modals) are queued in `gameState.uiEvents` and processed by the UI orchestrator.
- **Themes**: Support a few different themes (e.g., Light, Dark, Cricket Green).
- **Offline Support**: PWA manifest (`public/manifest.json`) and service worker template (`public/sw.js`). A post-build crawler (`scripts/build-sw.js`) automatically finds and injects hashed production assets into the service worker pre-cache, making the app fully installable and working offline.
- **State Persistence**: Use `localStorage` to persist the game state so that progress is not lost on page reload or if the app is closed.
- **License**: The project should be licensed under the MIT License.
- **Testing**: Node.js test runner using `ts-node/esm` to run unit assertions (`test/test_cases.ts`) directly without a preliminary build step.

### 3. UI/UX
- **Extreme Minimalist Design**: Clean Swiss/Bauhaus aesthetic with high typographic clarity, tabular numbers, subtle 1px borders, and zero clutter.
- **Mobile-First**: The design must be optimized for mobile devices, as it will be used on the field.
- **Usability**: Large, tactile 48px+ touch targets for scoring keys. Clear feedback when players need to be selected.
- **Screenshot Mode Layout**: Use a table for better layout and use a popular fixed-width font (monospace) for text in this mode.
- **Footer & Release Badge**: Always include an interactive release badge for the scorecard in the footer of the page displaying the active semantic version (`v$yyyy.$mm.$nnn`), deployment status, and built-by credits. Clicking the badge opens the integrated Release Notes Modal (`#releaseNotesModal`). **Update the version information only when making code changes, not for documentation updates.**
- **Credits**: Include a line in the footer that says that this site was built by Varun Khaneja using Gemini with a link to his GitHub at github.com/aawc.
- **Standardized Release Management**: Dynamic timestamped semantic tagging (`v$yyyy.$mm.$nnn`), automated repository tag push, persistent application footer displaying active release badge, and integrated release notes modal listing commit history and highlights. Single source of truth in [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1).

## Standing Instructions for Development
- Keep `PROMPT.md`, `README.md`, `GEMINI.md`, and `CONTRIBUTING.md` updated with all confirmed requirements and changes in a way that it can be independently used by another LLM to recreate or update the project.
- Keep `DESIGN.md` updated with the current implementation details (data structures, control flow, decisions) as the codebase evolves.
- Keep `SECURITY.md` updated with project security policies and reporting guidelines as architectural or dependency changes occur.
- Do not add any special tags such as AGY and CONV or any other internal tags in commit messages or documentation.
- All files related to this project, such as `task.md`, must always be created in the current directory.
- Always use a new git branch for new bug fixes or features.
- Always update versioning using the standardized semantic format `v$yyyy.$mm.$nnn` (e.g. `v2026.09.001`, where `$yyyy` is 4-digit year, `$mm` is 2-digit month, and `$nnn` is 3-digit monthly sequence incremented automatically by `npm run release` / [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1)).
- Always maintain single-source-of-truth versioning in [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1) and synchronize across `package.json`, `public/sw.js`, and `index.html`.
- Always write automated unit test assertions in `test/test_cases.ts` for all new features and bug fixes to prevent regressions.
- Always run automated unit tests (`npm test`) on each edit without requesting confirmation from the user.
- Follow colorblind accessibility standards: use high contrast (Blue `#0072B2` vs Orange `#D55E00`) and explicit text status indicators (`[PASS]`, `[FAIL]`, `[FEAT]`, `[FIX]`, `[DOCS]`, `[TEST]`).
