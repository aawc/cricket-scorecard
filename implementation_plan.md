# Implementation Plan - Store Ball-by-Ball Over Details (U1 & U2)

We will implement **both UX Option U1 and Option U2** using the **S1 Storage Option** (Structured Overs Array). 

## User Decisions Summary
- **Storage**: Option S1 (Structured Overs Array).
- **UX**: Both U1 (Collapsible Over History on main screen) and U2 (Over Log in Full Scorecard).
- **Undo/Edit**: No direct editing of past overs. Standard undo is sufficient.
- **Bowler Attribution**: Yes, bowler name will be stored with each over.

---

## Proposed Technical Changes

### 1. State Structure Updates (`app.js`)
We will add `overs` to `liveInnings` in `gameState` and ensure it is properly initialized and reset.

```javascript
// In gameState initialization and resetMatch():
liveInnings: {
    // ... existing fields
    overs: [], // Array of { bowler: string, balls: string[] }
    overLog: []
}
```

### 2. State Transition Logic (`app.js`)

#### Over Completion
In `checkOverComplete()`, when an over is completed (6 legal/illegal balls that count), we will push the current `overLog` to `overs` before clearing it.
```javascript
// inside checkOverComplete()
if (live.balls % 6 === 0 && live.balls > 0) {
    rotateStrike();
    
    // Save completed over
    live.overs.push({
        bowler: live.currentBowler,
        balls: [...live.overLog]
    });
    
    live.overLog = []; // Clear for next over
    // ...
}
```

#### Innings End (Handling Incomplete Last Over)
If an innings ends (due to all-out or chasing target met) mid-over, the final incomplete over remains in `overLog`. We must push this incomplete over to `overs` during `endInnings()`.
```javascript
// inside endInnings()
const live = gameState.match.liveInnings;
if (live.overLog.length > 0) {
    live.overs.push({
        bowler: live.currentBowler,
        balls: [...live.overLog]
    });
    live.overLog = [];
}
```

### 3. State Serialization & Minification (`app.js`)
We must update `minifyState` and `unminifyState` to support the new `overs` array so that permalinks function correctly.

- **Minified Key mapping**: `overs` $\rightarrow$ `ov`, `bowler` $\rightarrow$ `bo`, `balls` $\rightarrow$ `bl`.

```javascript
// In minifyInnings:
ov: (inn.overs || []).map(o => ({ bo: o.bowler, bl: o.balls }))

// In unminifyInnings:
overs: (inn.ov || []).map(o => ({ bowler: o.bo, balls: o.bl }))
```

### 4. UI Implementation

#### UX Option U1: Collapsible History on Main Screen
1.  **HTML (`index.html`)**: Add a placeholder `<div id="completed-overs-section" class="mt-3"></div>` below the scoring controls.
2.  **CSS (`style.css`)**: Add styles for the collapsed/expanded over list items and ball badge indicators (similar to `overLog` styles).
3.  **JS (`app.js`)**:
    *   Maintain a transient (non-persisted) array of expanded over indices: `let expandedOvers = [];`
    *   In `updateUI()`, render the completed overs list.
    *   Use Bootstrap collapse styling. Add click handlers to toggle the index in `expandedOvers` and re-render (or toggle classes directly in DOM to avoid full re-render if possible, though full re-render is simpler and safe for small lists).

#### UX Option U2: Over Log Table in Full Scorecard
1.  **HTML (`index.html`)**: Add a container inside the screenshot card (Full Scorecard) for the Over Log table.
2.  **JS (`app.js`)**:
    *   In `generateSummaryView()`, render an "Over Log" table for each innings using monospace styling.
    *   Columns: `Over # | Bowler | Runs | Wickets | Deliveries`
    *   To calculate runs/wickets per over from the stored ball log, we will write a helper function that parses the ball strings (e.g., counting 'wd' as 1+extra, 'W' as wicket, etc.).

---

## Verification Plan

### Automated Tests (`test.js`)
Add Test 16 and Test 17:
1.  **Test 16 (Over Storage)**: Verify that completed overs are correctly appended to `liveInnings.overs` with correct bowler names and ball logs.
2.  **Test 17 (Incomplete Over Storage)**: Verify that when an innings ends mid-over, the incomplete over is appended to `liveInnings.overs` on `endInnings()`.
3.  **Test 18 (Minification)**: Verify that minifying and unminifying a state with `overs` retains all over history data.

### Manual Verification
1.  **U1 UI**: Bowl 2 overs, verify they appear in the "Completed Overs" list. Click to expand/collapse.
2.  **U2 UI**: Flip to Full Scorecard, verify the "Over Log" table is present and correctly formats the completed and incomplete overs.
3.  **Permalink**: Share a match after 2 overs, open the link in a new tab, and verify that the completed overs history is fully restored in both U1 and U2 views.
