# Implementation Plan - Drag & Drop Roster Management

The goal is to replace comma-separated player textareas with an interactive, touch-friendly drag-and-drop roster management system in the Cricket Scorecard PWA using SortableJS.

## Proposed Changes

### Phase 1: Interactive Roster Cards & SortableJS Integration (Commit 1)

#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Replace `#team1-players` and `#team2-players` textareas with two Bootstrap roster cards.
- Each card contains a quick-add input (`<input>` + Add button) and a Sortable list container (`<ul id="team1-roster-list">`).
- Add SortableJS script via CDN (`https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/Sortable.min.js`).
- Update footer version to `1.21.0`.

#### [MODIFY] [style.css](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/style.css)
- Add styles for drag handles (`cursor: grab`), sortable ghost styling (`.sortable-ghost`), and minimum container height.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Initialize `Sortable` on both roster lists with `group: 'rosters'`, enabling drag-and-drop reordering within teams and transferring across teams.
- Create `addPlayerToRoster(teamNum, name, isShared)` to build interactive `<li>` items with order badges (`#1`, `#2`) and delete buttons.
- Create `updateLineupNumbers()` to recalculate batting/bowling order badges on sort or deletion.
- Update `startMatch()` to extract names from the DOM lists.
- Update `resetMatch()` to repopulate lists from saved player arrays.

---

### Phase 2: Bulk Paste Import Capability (Commit 2)

#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Add `#bulkImportModal` containing a textarea for pasting lists of names (comma or newline separated) and an "Import" button.
- Update footer version to `1.22.0`.

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Add event listeners for "Bulk Paste" header buttons to open `#bulkImportModal`.
- Add import processing logic to parse pasted text and append players to the target team's roster list.

---

### Phase 3: Shared Player Toggle (Commit 3)

#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Add a dual-team toggle button (`🔁`) to player items. Clicking it marks the player as `[Shared]`.
- When `startMatch()` runs, ensure any player marked `[Shared]` in Team 1 is also included in Team 2's player pool (and vice versa).
- Update footer version to `1.23.0`.

## Verification Plan
- Run `node test.js` to ensure core automated scoring logic remains robust.
- Open browser, test adding players via quick add, dragging between teams, reordering batting order, importing via bulk paste, and toggling shared player.
