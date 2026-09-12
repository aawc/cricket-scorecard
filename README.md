# Cricket Scorecard PWA

A standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

**🌐 Live App:** [https://varun.khaneja.org/cricket-scorecard/](https://varun.khaneja.org/cricket-scorecard/)

## Current Status

Fully functional, overhauled, and verified. Standardized Release Management & dynamic semantic tagging (`v$yyyy.$mm.$nnn`), automated repository tag generation & push pipeline, persistent application footer with interactive release badge, integrated release notes modal with categorized commit history & highlights, modern minimalist UX redesign, real-time multi-reader live state streaming with 1-year zero-cost cloud retention, strict spectator-mode controls lockout, dedicated Start New Match workflow, match state immutability on completion, fixed & streamlined delivery controls (Wide, No Ball, Run Out, Byes), advanced boundary tracking (4s/6s), bowler maidens, Fall of Wickets (FOW), multi-run leg byes, MCC Law 21.18 extras separation, early declaration/forfeit, plaintext scorecard exporter, feedback & diagnostic bug reporting mechanism, zero-dependency universal modal controller, embedded URI compression, and WCAG/colorblind accessibility improvements implemented. All automated tests passing.

## Features (Implemented)

- **ICC Men's One Day International Playing Conditions Alignment**: Baseline match flow, delivery tracking, overs and bowler quotas (1/5th max limit, no two consecutive overs), no-ball and wide penalties, extras separation, and dismissal mechanics follow the official **ICC Men's One Day International Playing Conditions** ([`docs/rules/icc_mens_odi_playing_conditions.pdf`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/rules/icc_mens_odi_playing_conditions.pdf)). Coverage is partial by design — free hits, powerplays, substitutes and DLS are not implemented. See the per-clause status matrix in [`docs/rules/README.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/rules/README.md#L17).
- **Standardized Release Management & Semantic Tagging (`v$yyyy.$mm.$nnn`)**: Dynamic timestamped semantic versioning (`v2026.09.001`), single source of truth in [`src/version.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/version.ts#L1), and automated release CLI (`npm run release` / [`scripts/release.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts/release.js#L1)) with git tag creation and remote repository tag push.
- **Persistent Footer Release Badge**: High-contrast, colorblind-friendly release badge in the page footer showing active version pill and live update status.
- **Integrated Release Notes Modal**: Accessible dialog (`#releaseNotesModal`) featuring dynamic release highlights, full commit history breakdowns with short hashes linked to GitHub, author attributions, and colorblind-safe category badges (`[FEAT]`, `[FIX]`, `[DOCS]`, `[TEST]`, `[PERF]`).
- **Comprehensive Contributor & Issue Guide**: Exhaustive developer documentation in [`CONTRIBUTING.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/CONTRIBUTING.md#L1) on reproducing bug reports, Red-Green regression testing, implementing pure reducer state transitions, and releasing updates.
- **Extreme Minimalist UX & Tactile Keypad**: Distraction-free, modern Swiss/Bauhaus design system with generous whitespace, crisp 1px borders, high visual hierarchy, and 48px+ touch targets optimized for lightning-fast mobile scoring.
- **Spectator Mode Controls Lockout**: When joining a live match as a spectator (`?live=<id>`), all umpire scoring controls, player selectors, innings declarations, and reset buttons are strictly locked out and hidden, providing a clean, distraction-free live observation dashboard.
- **Dedicated "New Match" Workflow**: Prominent, one-click "New Match" buttons in the navigation header and victory banner with confirmation dialog safeguards preventing accidental progress loss.
- **Streamlined Delivery Controls (Wide, No Ball, Run Out, Byes)**: Direct, frictionless scoring with clear options for extras and unified single-step Run Out recording (Striker vs Non-Striker selection and completed runs).
- **Universal Zero-Dependency Modal System & WAI-ARIA Focus Guardrail**: Robust native modal open/close controller with automated backdrop lifecycle, keyboard/click dismissal, automatic fallback when external CDNs fail, and strict W3C WAI-ARIA focus management (active element blurring before `aria-hidden` and focus restoration).
- **Embedded URI State Compression**: Standalone TypeScript LZString compression for ultra-compact permalinks (`?s=`) and storage minification with zero external runtime dependencies.
- **Real-Time Live Streaming & Multi-Reader Sync**: Stream live match scores to unlimited parallel spectators at 100% zero cost ($0.00). Spectators view updates in real-time in read-only Spectator Mode without disrupting scoring.
- **Serverless Cloud Storage Hosting**: Live match state packets are hosted remotely on high-performance Cloudflare Workers KV edge storage ([`backend/cloudflare/worker.js`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare/worker.js#L1)) or Google Apps Script ([`backend/google-apps-script/Code.gs`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/google-apps-script/Code.gs#L1)) with zero hosting costs ($0.00).
- **1-Year Remote Retention (365-day TTL)**: Match state is persisted remotely for 1 year (31,536,000 seconds / 365 days) with automatic server-side eviction and client-side timestamp validation.
- **Cryptographic Role Separation**: Umpire holds private write credentials (`?live=<id>&key=<key>`) stored in `localStorage`, while spectators receive clean read-only links (`?live=<id>`).
- **Offline Resilience & Network Recovery**: Offline deliveries are queued in `localStorage` and automatically synchronized upon network restoration using monotonic sequence numbering.
- **Modular Architecture**: Code deconstructed into clean ES6 modules (`src/` directory) separating state, live sync, rules calculation, persistence, versioning, and DOM rendering.
- **Formal State Machine**: Centralized match phase flow (SETUP, TOSS, PLAYING_INNINGS, INNINGS_BREAK, MATCH_OVER) governed by a deterministic reducer inside [`src/reducer.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/reducer.ts#L1).
- **Score tracking**: Complete ball-by-ball tallying (Runs, Wickets, Overs, Wides, No Balls, Byes, Leg Byes), with Byes counting towards batsman balls faced.
- **Feedback & Diagnostic Bug Reporting**: Dedicated "Feedback / Bug" modal generating comprehensive Markdown bug reports with user description, complete match state (striker/non-striker figures, bowler maidens/econ, FOW, extras), minified state JSON, LZString permalink, and captured runtime errors for instant reproduction.
- **Boundary Tracking**: Independent tracking of boundaries (4s and 6s) for each batsman, calculated in batting statistics, strike rates, and scorecard tables.
- **Maiden Overs Calculation**: Bowlers are automatically credited with a maiden over when completing a 6-ball legal over conceding 0 bowler runs (byes and leg-byes do not break a maiden).
- **Fall of Wickets (FOW)**: Complete chronological tracking and display of each dismissal (Score, Wicket Number, Batsman Out, Over and Ball).
- **Multi-run Leg Byes**: Support for specifying 1 to 6 leg byes on a delivery.
- **MCC Law 21.18 Extras Separation**: Bowler is charged 1 penalty run for a No-Ball; additional fielding extras (byes/leg byes) are assigned to fielding extras without penalizing bowler figures.
- **Early Declaration / Forfeit**: "End Innings" feature to conclude an innings early with full confirmation safeguards for Innings 1 (triggers Innings Break with target) or Innings 2 (triggers Match Over).
- **Monospace Text Scorecard Exporter**: "Copy Text Scorecard" button to instantly format and copy a complete match summary to the clipboard for sharing via chat, SMS, or email.
- **Red-Green Colorblind & Touch Accessibility**: High-contrast Blue (`#0072B2`) vs Orange (`#D55E00`) palette, explicit `●` striker indicator, text badges for deliveries, and WCAG 2.1 AA 48px minimum touch targets.
- **v2 Event-Sourced Delivery Core (`src/v2/`)**: Pure event-sourced domain modeling (`DeliveryEvent`) with lossless replay, deterministic statistical projections, and complete historical auditability.
- **Advanced Cricket Analytics & Partnerships**: Real-time tracking of batting partnerships (runs, balls, individual contributions, unbroken indicators), multi-spell bowler figures with dots & dot percentages, Fall of Wickets (FOW), and MCC Law 21.18 extras separation.
- **Zero-Dependency SVG Visual Analytics**: High-contrast, colorblind-safe vector charts rendered entirely in native SVG: Match Worm Chart (with wicket indicators), Manhattan Chart (with over-by-over run bars & wickets), and Partnerships Breakdown bars.
- **Mobile Ergonomics & Hardware Engine**: Screen Wake Lock API (`wakeLockController`) to keep device screens alive on the field, tactile Web Haptics Engine (`haptics`) providing physical vibration feedback on boundaries/wickets, and Zero-Asset Web Audio Synthesizer (`audioSynth`) for tactile audio cues without external assets.
- **Universal Data Portability Suite**: Monospace ASCII scorecard exporter, ball-by-ball CSV exporter for spreadsheet analysis, and lossless JSON match archive import/export.
- **Configurable match parameters**: Overs per innings, bowler limits, single batsman mode, leg byes toggle.
- **State persistence**: `localStorage` automatic synchronization.
- **Full Scorecard mode**: Clean monospace match summary featuring individual batsman 4s/6s/SR, bowler maidens/econ, wide and no-ball tallies, and Fall of Wickets summary.
- **Undo functionality**: Instant rollback for scoring corrections.
- **Web App Manifest & Service Worker**: Offline PWA installation support.
- **Automated Tests**: Comprehensive test suite covering all scoring rules, live sync, spectator restrictions, release management, match immutability, v2 event projections, SVG charts, and hardware abstractions.

## Repository Layout & Architectural Standard

This project follows an enterprise modular directory organization system:

- **[`src/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src#L1)**: Modular TypeScript client source code (state machine, UI controller, modal manager, live sync, storage compression, and semantic versioning).
- **[`src/v2/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/v2#L1)**: Event-sourced v2 architecture modules (delivery types, pure projection engine, SVG charts, hardware controllers, CSV/JSON exporters, and adapter bridge).
- **[`backend/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend#L1)**: Serverless cloud backends and edge streaming integrations ([`backend/cloudflare/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/cloudflare#L1) and [`backend/google-apps-script/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/backend/google-apps-script#L1)).
- **[`docs/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs#L1)**: Comprehensive documentation repository. See [`docs/DIRECTORY_STRUCTURE.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/DIRECTORY_STRUCTURE.md#L1) for governance rules and [`docs/README.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/README.md#L1) for the index.
- **[`scripts/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/scripts#L1)**: Build, release automation (`npm run release`), service worker compiler, and release notes extractors.
- **[`.github/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/.github#L1)**: GitHub Actions CI/CD workflows (`ci.yml`, `release.yml`, `deploy.yml`) and issue templates.
- **[`public/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/public#L1)**: Static assets, icons, manifest, and service worker shell.
- **[`test/`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test#L1)**: Automated unit and regression test suites.

## Local Development & Release Commands

To run the application, execute tests, and cut releases:

1. **Execute Automated Unit Tests**:
   ```bash
   npm test
   ```
2. **Compile Production Build**:
   ```bash
   npm run build
   ```
3. **Execute Standardized Release Workflow**:
   ```bash
   # Preview release in dry-run mode
   npm run release -- --dry-run

   # Perform production release with semantic tagging and git push
   npm run release
   ```
4. **Developer & Contributor Instructions**:
   - See [`CONTRIBUTING.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/CONTRIBUTING.md#L1) for detailed step-by-step instructions on reporting, diagnosing, testing, and fixing issues.
