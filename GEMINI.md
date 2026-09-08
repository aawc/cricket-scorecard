# Cricket Scorecard PWA - Gemini & AI Developer Guide

This document contains essential context, architectural rules, and standing instructions for AI pair-programming assistants working in this repository.

---

## 1. Project Overview

The **Cricket Scorecard PWA** is a mobile-first, standalone Progressive Web App (PWA) designed for offline and live scoring of cricket matches. It runs entirely in the browser with zero-cost cloud synchronization, 1-year data retention, embedded URI compression, and strict spectator mode locking.

- **Repository**: `https://github.com/aawc/cricket-scorecard`
- **Active Version**: `v2026.09.001` (Governed by [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1))
- **Live Deployment**: `https://varun.khaneja.org/cricket-scorecard/`
- **Contributor Guide**: [`CONTRIBUTING.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/CONTRIBUTING.md#L1)

---

## 2. Architecture & Modules

The codebase is organized into modular TypeScript units under `src/`:

1. **State Machine (`src/reducer.ts`)**: Pure deterministic state transitions governing match flow (`SETUP`, `TOSS`, `PLAYING_INNINGS`, `INNINGS_BREAK`, `MATCH_OVER`).
2. **State Store (`src/state.ts`)**: Reactive state container with subscription listeners.
3. **Data Types (`src/types.ts`)**: Typed domain entities (`GameState`, `LiveInnings`, `BatsmanStats`, `BowlerStats`, `Team`, `Action`).
4. **Persistence & Compression (`src/storage.ts`)**: `localStorage` syncing, LZString URI compression (`?s=`), schema migration, and over healing.
5. **Real-time Live Sync (`src/sync.ts`)**: Zero-cost live state streaming via Cloudflare Workers KV edge storage with 1-year retention.
6. **Universal Modal Manager (`src/modal.ts`)**: Zero-dependency modal open/close controller with W3C WAI-ARIA focus trap compliance.
7. **Version Management (`src/version.ts`)**: Authoritative version constants (`APP_VERSION`), dynamic semantic tag calculations (`v$yyyy.$mm.$nnn`), and structured release records.
8. **Release Notes View (`src/release_notes.ts`)**: Dynamic modal rendering for changelogs, highlights, commit lists, and version badge interactions.
9. **Diagnostic Feedback (`src/feedback.ts`)**: In-app bug report compiler, runtime error logger, and GitHub Issue generator.
10. **UI Controller (`src/ui.ts`)**: DOM event binding, scoring keypad, player selectors, scoreboard tables, and flip card animation.

---

## 3. Standing Developer Instructions

1. **Standardized Release Management & Semantic Tagging**:
   - Version scheme: `v$yyyy.$mm.$nnn` (e.g. `v2026.09.001`, `v2026.09.002`).
   - Automated release tool: `npm run release` ([`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1)).
   - Single source of truth: [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1).
2. **Persistent Application Footer & Release Modal**:
   - The footer features an interactive release badge (`#footer-release-badge`) displaying the active semantic version pill (`v2026.09.001`).
   - Clicking opens the integrated Release Notes Modal (`#releaseNotesModal`) listing highlights, categorized commit logs, and links.
3. **Red-Green Colorblind Accessibility**:
   - The user is red-green colorblind. All assistant output, diffs, tables, and UI controls must use high-contrast, colorblind-friendly indicators.
   - Primary contrast palette: Blue (`#0072B2`) vs Orange (`#D55E00`), with Yellow (`#F0E442`) and Purple (`#CC79A7`).
   - Use explicit text indicators: `[PASS]`, `[FAIL]`, `[ADDED]`, `[REMOVED]`, `[MODIFIED]`, `[FEAT]`, `[FIX]`, `[DOCS]`, `[TEST]`.
4. **Strict Line-Anchored Code Links**:
   - Every markdown link pointing to a source code symbol MUST include an exact line anchor (e.g., `#L142`). Bare file links for specific symbols are prohibited.
5. **No GitHub Alert Syntax**:
   - Do NOT use GitHub alert boxes (`> [!NOTE]`, `> [!WARNING]`) as they break when syncing with Google Docs.
6. **Documentation Synchronization**:
   - Keep `README.md`, `PROMPT.md`, `GEMINI.md`, [`docs/architecture/DESIGN.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/DESIGN.md#L1), [`docs/reports/BUG_REPORT.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/reports/BUG_REPORT.md#L1), [`docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/reports/IMPROVEMENTS_AND_ISSUES_REPORT.md#L1), and [`docs/DIRECTORY_STRUCTURE.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/DIRECTORY_STRUCTURE.md#L1) in sync whenever code or features change.
7. **Tag Hygiene**:
   - Omit internal tracking tags (e.g., `TAG=agy`, `CONV=<id>`) from commit messages and documentation in this workspace.

---

8. **Strict Directory Structure Compliance**:
   - All code, documentation, and cloud integrations MUST adhere to [`docs/DIRECTORY_STRUCTURE.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/DIRECTORY_STRUCTURE.md#L1). Never create ad-hoc root folders or loose files.

---

## 4. Testing & Verification

- **Execute Unit Tests**:
  ```bash
  npm test
  ```
- **Production Build**:
  ```bash
  npm run build
  ```
- **Release Dry Run**:
  ```bash
  npm run release -- --dry-run
  ```
