# Walkthrough - Auto-Accrue Wide Extras to Byes

I have successfully streamlined the extra runs workflow for Wides in a clean, independent commit without any special tags.

## Changes Made

### 1. Auto-Accrue Wides to Byes (Commit `app.js`)
- **[app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)**: Updated the modal number button click listener (`extraRunValBtns`). Selecting any extra runs > 0 on a Wide delivery instantly closes `#extraRunsModal` and executes `finalizeDelivery('wide', runs, 'byes')`, skipping the unnecessary "Batsman vs Byes" prompt.
- **[index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)**: Footer version updated to `v1.26.0`.

### 2. Documentation & Tests
- **[PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md)** Updated to explicitly document that extra runs on wides automatically default to byes without prompting.
- **[test.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test.js)** Automated tests verified.

## Verification Results

### Automated Verification
All 12 unit tests executed via Node.js passed cleanly:
```
Running tests...
All tests passed!
```
