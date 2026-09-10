# Contributing to Cricket Scorecard PWA

Welcome to the **Cricket Scorecard PWA** project. This guide provides comprehensive, step-by-step instructions for developers on how to investigate, reproduce, fix, test, document, and release fixes for reported issues or new feature requests.

---

## Table of Contents

1. [Architecture & Core Principles](#1-architecture--core-principles)
2. [Local Development Setup](#2-local-development-setup)
3. [How to Investigate & Fix Reported Issues](#3-how-to-investigate--fix-reported-issues)
   - [Step 1: Ingesting Diagnostic Reports](#step-1-ingesting-diagnostic-reports)
   - [Step 2: Writing Red-Green Regression Tests](#step-2-writing-red-green-regression-tests)
   - [Step 3: Implementing the Fix in Core Modules](#step-3-implementing-the-fix-in-core-modules)
   - [Step 4: Verifying Full Test Suite](#step-4-verifying-full-test-suite)
   - [Step 5: Documenting the Fix](#step-5-documenting-the-fix)
4. [How to Implement New Feature Requests](#4-how-to-implement-new-feature-requests)
5. [Standardized Release Management & Semantic Tagging](#5-standardized-release-management--semantic-tagging)
   - [Semantic Versioning Convention (`v$yyyy.$mm.$nnn`)](#semantic-versioning-convention-vyyyymmnnn)
   - [Executing Automated Releases (`npm run release`)](#executing-automated-releases-npm-run-release)
   - [Release CLI Options & Flags](#release-cli-options--flags)
6. [Design & Accessibility Standards](#6-design--accessibility-standards)
7. [Pre-Commit & Quality Checklist](#7-pre-commit--quality-checklist)

---

## 1. Architecture & Core Principles

The Cricket Scorecard is built as a zero-cost, offline-first Progressive Web App (PWA) with the following architectural layers:

| Layer / Module | Source File | Responsibilities |
| :--- | :--- | :--- |
| **State Machine & Reducer** | [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L1) | Pure deterministic state transitions (`START_MATCH`, `ADD_RUNS`, `ADD_WICKET`, `FINALIZE_DELIVERY`, `UNDO`, `RESET_MATCH`). |
| **State Container** | [`src/state.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/state.ts#L1) | Central mutable game state holder, subscriber dispatching, and state replacement. |
| **Domain Types** | [`src/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L1) | TypeScript interfaces for BatsmanStats, BowlerStats, LiveInnings, GameState, Actions. |
| **Persistence & Compression** | [`src/storage.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/storage.ts#L1) | `localStorage` serialization, LZString URI compression (`?s=`), schema migration, and state healing. |
| **Live Multi-Reader Sync** | [`src/sync.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/sync.ts#L1) | Serverless broadcast sync (Cloudflare KV / Google Apps Script) with 1-year retention and offline buffering. |
| **Universal Modal Controller** | [`src/modal.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/modal.ts#L1) | W3C WAI-ARIA compliant modal manager with focus trap, backdrop lifecycle, and escape key handling. |
| **Version & Semantic Metadata** | [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1) | Authoritative source of truth for semantic versioning (`v$yyyy.$mm.$nnn`), release history, and highlights. |
| **Release Notes Controller** | [`src/release_notes.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/release_notes.ts#L1) | Dynamic modal rendering for changelogs, highlights, commit lists, and version badge interactions. |
| **Diagnostic Feedback** | [`src/feedback.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L1) | In-app bug report compiler, runtime error logger, and GitHub Issue generator. |
| **UI Orchestration** | [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1) | DOM event binding, scoring keypad, player selectors, scoreboard tables, and flip card animation. |
| **v2 Event-Sourced Core & Analytics** | [`src/v2/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2#L1) | Delivery event streaming, pure statistical projection engine (`stats.ts`), SVG visual charts (`charts.ts`), hardware integrations (`hardware.ts`), CSV/JSON exporters (`export.ts`), and adapter bridge (`bridge.ts`). |

---

### Directory Structure Governance Standard
All contributors MUST follow the authoritative directory layout defined in [`docs/DIRECTORY_STRUCTURE.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/DIRECTORY_STRUCTURE.md#L1):
- Client code in `src/`
- Cloud & serverless backends in `backend/`
- Detailed documentation in `docs/`
- Build & automation scripts in `scripts/`
- Tests in `test/`
- Root directory contains strictly essential project configurations.

## 2. Local Development Setup

### Prerequisites
- **Node.js**: v20.19+ or v22+
- **TypeScript**: v5.1+
- **Vite**: v8.0+

### Key Commands

```bash
# 1. Run automated unit test suite
npm test

# 2. Start local Vite development server
npm run dev

# 3. Compile production bundle & inject service worker assets
npm run build

# 4. Preview compiled production build
npm run preview

# 5. Execute automated semantic release tool (Dry-Run mode)
npm run release -- --dry-run
```

---

## 3. How to Investigate & Fix Reported Issues

When an issue or scoring anomaly is reported by a user (via GitHub Issues or the in-app Feedback modal):

### Step 1: Ingesting Diagnostic Reports
User bug reports generated by [`src/feedback.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L106) include:
1. **User Description**: What went wrong.
2. **Match Figures**: Complete striker/non-striker figures, bowler figures, over log, and FOW.
3. **State Reproduction Payload**:
   - Minified JSON (`{"ph":"PLAYING_INNINGS", ...}`)
   - Compressed permalink URL (`?s=...`)
4. **Captured Runtime Errors**: Unhandled JavaScript exceptions with stack traces.

### Step 2: Writing Red-Green Regression Tests
Before making any code changes, reproduce the bug by writing an automated test in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1):

1. Unminify the reported state payload:
   ```typescript
   // In test/test_cases.ts
   console.log("Running Test 78 (Bug Reproduction: Strike rotation after Run Out)...");
   const rawMinified = {"ph":"PLAYING_INNINGS","m":{...}};
   const loadedState = unminifyState(rawMinified);
   setGameState(loadedState);
   ```
2. Execute the offending action (e.g. `finalizeDelivery(...)` or `dispatch(...)`).
3. Assert the expected correct state figures (runs, active striker, bowler economy).
4. Run `npm test` and verify that the test **FAILS** (Red State).

### Step 3: Implementing the Fix in Core Modules
Locate the responsible module and implement the fix:
- **Scoring or strike rotation logic**: Update [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L1). Keep the reducer pure and deterministic.
- **State migration or compression**: Update [`src/storage.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/storage.ts#L1). Ensure legacy permalinks (`?s=` and `?state=`) remain backward-compatible.
- **UI event handling or display**: Update [`src/ui.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1) or [`src/modal.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/modal.ts#L1).
- **Error handling**: Always log caught errors with `console.error` including error type and message before recovery.

### Step 4: Verifying Full Test Suite
Run `npm test` and verify all tests pass (Green State):
```bash
npm test
```

### Step 5: Documenting the Fix
1. **Update [`docs/reports/BUG_REPORT.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/reports/BUG_REPORT.md#L1)**: Record the root cause analysis, reproduction steps, and resolved status.
2. **Update [`docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md#L1)**: Log the resolution under the active milestone.
3. **Update [`docs/architecture/DESIGN.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/DESIGN.md#L1) / `README.md` / `PROMPT.md` / `GEMINI.md`**: Update documentation if architecture, data structures, or rules changed.

---

## 4. How to Implement New Feature Requests

1. **Design & State Schema**:
   - Define TypeScript interfaces in [`src/types.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/types.ts#L1).
   - Add new Action types to the `Action` union.
2. **Reducer Implementation**:
   - Add the action handler in [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L1).
   - Maintain pure state transitions with zero DOM side effects in the reducer.
3. **UI & Accessibility**:
   - Add HTML elements to [`index.html`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html#L1).
   - Style with WCAG AA compliance (48px+ touch targets, Blue `#0072B2` vs Orange `#D55E00` colorblind palette).
   - Guard modal triggers with [`src/modal.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/modal.ts#L1).
4. **Unit Test Coverage**:
   - Write comprehensive assertions in [`test/test_cases.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1).
5. **Documentation**:
   - Update `README.md`, [`docs/architecture/DESIGN.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/DESIGN.md#L1), `PROMPT.md`, and `GEMINI.md`.

---

## 5. Standardized Release Management & Semantic Tagging

### Semantic Versioning Convention (`v$yyyy.$mm.$nnn`)
The project utilizes a dynamic timestamped semantic version format:
- **Format**: `v$yyyy.$mm.$nnn`
  - `$yyyy`: 4-digit calendar year (e.g., `2026`)
  - `$mm`: 2-digit zero-padded calendar month (e.g., `09`)
  - `$nnn`: 3-digit zero-padded sequence counter starting at `001` per month (e.g., `001`, `002`, `003`)
- **Examples**: `v2026.09.001`, `v2026.09.002`, `v2026.10.001`

### Executing Automated Releases (`npm run release`)
The project includes a unified release automation CLI tool in [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1).

```bash
# Standard release: validates tests, computes next tag, compiles changelog, creates git tag & pushes
npm run release

# Dry run: preview tag calculation, commit notes, and highlights without touching git
npm run release -- --dry-run

# Create local tag without pushing to remote
npm run release -- --no-push

# Specify custom tag override
npm run release -- --tag v2026.09.005

# Synchronize release notes only without git tagging
npm run release -- --notes-only
```

### What `npm run release` Does Automatically:
1. **Pre-flight Tests**: Runs `npm test` to block releases on broken code.
2. **Tag Sequencing**: Inspects existing git tags and computes the next `v$yyyy.$mm.$nnn`.
3. **Commit History Compilation**: Parses all git commits since the last tag and categorizes them (`feat`, `fix`, `docs`, `refactor`, `test`, `perf`).
4. **Highlight Extraction**: Auto-generates key highlights for the release notes.
5. **Multi-File Synchronization**:
   - Updates [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1) (`APP_VERSION`, `APP_RELEASE_DATE`, `RELEASE_HISTORY`).
   - Updates `package.json` (`version`).
   - Updates `public/sw.js` (`CACHE_NAME`).
   - Updates `index.html` (footer release badge text).
6. **Production Build**: Executes `npm run build` to compile the bundle and inject hashed assets into `dist/sw.js`.
7. **Git Tag & Push**: Creates an annotated git tag (`git tag -a <tag> -m "<summary>"`) and pushes to the repository remote (`git push <remote> <tag>`).

---

## 6. Design & Accessibility Standards

- **Red-Green Colorblind Friendly**: Never rely solely on red vs. green colors. Use Blue (`#0072B2`) for primary/affirmative/features, Orange (`#D55E00`) for warnings/danger/fixes, Yellow (`#F0E442`) for highlights, and Purple (`#CC79A7`) for secondary badges.
- **Explicit Text Indicators**: Always pair visual badges with explicit text labels (e.g., `[PASS]`, `[FAIL]`, `[FEAT]`, `[FIX]`, `[LATEST]`, `[STRIKER]`).
- **Touch Targets**: All interactive scoring buttons and selector dropdowns must maintain a minimum touch target size of 48px × 48px for outdoor mobile usability.
- **WAI-ARIA Focus Trapping**: Modals must blur focused descendants prior to applying `aria-hidden` and restore focus to the triggering element upon dismissal.

---

## 7. Pre-Commit & Quality Checklist

Before submitting code changes:
- [ ] All automated tests pass (`npm test`).
- [ ] Production build succeeds (`npm run build`).
- [ ] Release dry-run succeeds (`npm run release -- --dry-run`).
- [ ] Diffs follow colorblind accessible indicators (`[+]`, `[-]`, `[PASS]`, `[FAIL]`).
- [ ] `CONTRIBUTING.md`, `README.md`, `PROMPT.md`, and `GEMINI.md` are synchronized.
- [ ] Commit descriptions are structured with technical rationale and omit internal tracking tags (`TAG=agy`, `CONV=...`).
