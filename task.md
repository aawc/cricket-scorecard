# Task List - Drag & Drop Roster Management

## Phase 1: Interactive Roster Cards & SortableJS Integration (Commit 1)
- [x] Replace `#team1-players` and `#team2-players` with roster card containers in `index.html`
- [x] Add SortableJS script tag to `index.html` and update version to `1.21.0`
- [x] Add drag-and-drop CSS styles to `style.css`
- [x] Implement `Sortable` initialization, `addPlayerToRoster`, and `updateLineupNumbers` in `app.js`
- [x] Refactor `startMatch` and `resetMatch` to interact with DOM lists in `app.js`
- [x] Verify automated unit tests pass (`node test.js`)
- [x] Commit Phase 1 changes cleanly without special tags

## Phase 2: Bulk Paste Import Capability (Commit 2)
- [x] Add `#bulkImportModal` to `index.html` and update version to `1.22.0`
- [x] Implement modal event listeners and import parsing logic in `app.js`
- [x] Verify automated unit tests pass (`node test.js`)
- [x] Commit Phase 2 changes cleanly without special tags

## Phase 3: Shared Player Toggle (Commit 3)
- [ ] Add shared player button (`🔁`) to roster items in `app.js`
- [ ] Update `startMatch` to mirror shared players across teams in `app.js`
- [ ] Update version to `1.23.0` in `index.html`
- [ ] Verify automated unit tests pass (`node test.js`)
- [ ] Update `PROMPT.md` and `README.md` with confirmed roster features
- [ ] Commit Phase 3 changes cleanly without special tags
