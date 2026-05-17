# Implementation Plan - Toss Selection & Empty Initial Rosters

The goal is to introduce a toss selection prompt when starting a match to choose which team bats first, and to remove default placeholder players ("Player 1", "Player 2") on initial load while retaining rosters upon reset.

## Proposed Changes

### 1. Toss Selection Modal (`index.html`)
#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Add `#tossModal` Bootstrap modal to prompt for the team batting first upon clicking "Start Match".
- Update footer version to `1.25.0`.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- When `startMatch()` runs: validate player counts first. If valid, open `#tossModal` showing exact team names.
- Add `executeStartMatch(battingTeamNum)` function to finalize match start and flip to scorecard.

### 2. Empty Initial Rosters (`app.js`)
#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Update `renderRosters()` to NOT load placeholder names ("Player 1", "Player 2") if player arrays are empty. Initial lists will be blank on first load, but will repopulate correctly on `resetMatch()`.

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md).
- Run `node test.js` automatically to verify scoring functionality.

## Verification Plan
- Run `node test.js` to ensure automated tests pass.
- Open browser: Verify team rosters are empty on first load. Add players, click Start Match, verify `#tossModal` appears. Select Team 2, verify Team 2 players populate batsman dropdowns. Reset match, verify roster lists retain names.
