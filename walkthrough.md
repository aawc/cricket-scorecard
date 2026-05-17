# Walkthrough - Auto-Selection & Dual Batsman Enforcement

I have successfully implemented automated player selection and lone striker transition across a clean commit without any special tags.

## Changes Made

### 1. Auto-Selection (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Created `autoSelectEligiblePlayers()` called during `updateUI()`. If `currentBatsman1`, `currentBatsman2`, or `currentBowler` is missing and their filtered eligible pool has exactly 1 player, that player is automatically assigned and initialized.

### 2. Dual Batsman Enforcement (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: In `checkControlsState()`, scoring controls remain disabled (`!cb1 || !cb2 || !cbo`) whenever surviving batsmen are 2 or more.

### 3. Lone Striker Transition (`app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: In `addWicket()` and `executeRunOutWicket()`, when the penultimate wicket falls (`wickets === totalPlayers - 1`), the surviving lone batsman is automatically moved into the striker slot (`cb1`).

### 4. Documentation & Tests
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Footer version updated to `v1.32.0`.
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) & [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md)** Updated to document auto-selection and lone striker rules.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Added Test 15 successfully verifying auto-selection and lone striker transition.

## Verification Results

### Automated Verification
All 15 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
