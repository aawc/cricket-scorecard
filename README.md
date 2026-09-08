# Cricket Scorecard PWA

A standalone website on GitHub Pages that can be used as an offline PWA to enter and keep track of score during a game of cricket.

**🌐 Live App:** [https://varun.khaneja.org/cricket-scorecard/](https://varun.khaneja.org/cricket-scorecard/)

## Current Status

Fully functional, overhauled, and verified. Extreme minimalist UX redesign, real-time multi-reader live state streaming with 1-year zero-cost cloud retention, strict spectator-mode controls lockout, dedicated Start New Match workflow, fixed & streamlined delivery controls (Wide, No Ball, Run Out, Byes), advanced boundary tracking (4s/6s), bowler maidens, Fall of Wickets (FOW), multi-run leg byes, MCC Law 21.18 extras separation, early declaration/forfeit, plaintext scorecard exporter, feedback & diagnostic bug reporting mechanism, zero-dependency universal modal controller, embedded URI compression, and WCAG/colorblind accessibility improvements implemented. All 71 automated tests passing.

## Features (Implemented)

- **Extreme Minimalist UX & Tactile Keypad**: Distraction-free, modern Swiss/Bauhaus design system with generous whitespace, crisp 1px borders, high visual hierarchy, and 48px+ touch targets optimized for lightning-fast mobile scoring.
- **Spectator Mode Controls Lockout**: When joining a live match as a spectator (`?live=<id>`), all umpire scoring controls, player selectors, innings declarations, and reset buttons are strictly locked out and hidden, providing a clean, distraction-free live observation dashboard.
- **Dedicated "New Match" Workflow**: Prominent, one-click "New Match" buttons in the navigation header and victory banner with confirmation dialog safeguards preventing accidental progress loss.
- **Streamlined Delivery Controls (Wide, No Ball, Run Out, Byes)**: Direct, frictionless scoring with clear options for extras and unified single-step Run Out recording (Striker vs Non-Striker selection and completed runs).
- **Universal Zero-Dependency Modal System & WAI-ARIA Focus Guardrail**: Robust native modal open/close controller with automated backdrop lifecycle, keyboard/click dismissal, automatic fallback when external CDNs fail, and strict W3C WAI-ARIA focus management (active element blurring before `aria-hidden` and focus restoration).
- **Embedded URI State Compression**: Standalone TypeScript LZString compression for ultra-compact permalinks (`?s=`) and storage minification with zero external runtime dependencies.
- **Real-Time Live Streaming & Multi-Reader Sync**: Stream live match scores to unlimited parallel spectators at 100% zero cost ($0.00). Spectators view updates in real-time in read-only Spectator Mode without disrupting scoring.
- **Serverless Cloud Storage Hosting**: Live match state packets are hosted remotely on high-performance Cloudflare Workers KV edge storage (`cloudflare/worker.js`) or Google Apps Script (`google-apps-script/Code.gs`) with zero hosting costs ($0.00).
- **1-Year Remote Retention (365-day TTL)**: Match state is persisted remotely for 1 year (31,536,000 seconds / 365 days) with automatic server-side eviction and client-side timestamp validation.
- **Cryptographic Role Separation**: Umpire holds private write credentials (`?live=<id>&key=<key>`) stored in `localStorage`, while spectators receive clean read-only links (`?live=<id>`).
- **Offline Resilience & Network Recovery**: Offline deliveries are queued in `localStorage` and automatically synchronized upon network restoration using monotonic sequence numbering.
- **Modular Architecture**: Code deconstructed into clean ES6 modules (`src/` directory) separating state, live sync, rules calculation, persistence, and DOM rendering.
- **Formal State Machine**: Centralized match phase flow (SETUP, TOSS, PLAYING_INNINGS, INNINGS_BREAK, MATCH_OVER) governed by a deterministic reducer inside `src/reducer.ts`.
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
- **Configurable match parameters**: Overs per innings, bowler limits, single batsman mode, leg byes toggle.
- **State persistence**: `localStorage` automatic synchronization.
- **Full Scorecard mode**: Clean monospace match summary featuring individual batsman 4s/6s/SR, bowler maidens/econ, wide and no-ball tallies, and Fall of Wickets summary.
- **Undo functionality**: Instant rollback for scoring corrections.
- **Web App Manifest & Service Worker**: Offline PWA installation support.
- **Automated Tests**: Comprehensive test suite with 71 unit tests covering all scoring rules, live sync, spectator restrictions, and edge cases.

## Local Development

To run the application and execute tests locally:

1. **Execute Automated Unit Tests**:
   ```bash
   node --loader ts-node/esm test/test.ts
   ```
2. **Compile Production Build**:
   ```bash
   node ./node_modules/typescript/bin/tsc && node ./node_modules/vite/bin/vite.js build && node scripts/build-sw.js
   ```
