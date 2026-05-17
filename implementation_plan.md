# Implementation Plan - Auto-Selection & Dual Batsman Enforcement

The goal is to enhance workflow efficiency by automatically selecting a batsman or bowler if only one candidate is eligible, and to enforce that both batsman slots are filled before scoring can continue (unless only the final lone batsman remains, who is automatically made the striker).

## Proposed Changes

### 1. [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Update footer version to `1.32.0`.

### 2. [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Create `autoSelectEligiblePlayers()` helper called inside `updateUI()`. If `currentBatsman1`, `currentBatsman2`, or `currentBowler` is unassigned and their respective filtered eligible pool contains exactly 1 candidate, auto-assign that candidate.
- In `checkControlsState()`, enforce `needsSelection = !cb1 || !cb2 || !cbo` whenever surviving batsmen >= 2.
- In `addWicket()` and `executeRunOutWicket()`, when `wickets === totalPlayers - 1` (lone surviving batsman), ensure the lone survivor is automatically moved to `currentBatsman1` (striker).

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md).
- Add unit Test 15 in [test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js) verifying auto-selection and lone striker transition. Automated tests run automatically.

## Verification Plan
- Automated: Verify `node test.js` passes cleanly.
- Manual: Open browser, start match with 3 players in Team 1. Active batsmen P1 and P2. Take wicket on P1. Verify P3 (only remaining eligible player) is automatically selected into striker slot. Take wicket on P3. Verify lone survivor P2 is automatically moved to striker slot.
