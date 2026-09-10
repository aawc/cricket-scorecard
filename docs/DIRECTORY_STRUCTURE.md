# Cricket Scorecard PWA - Repository Directory Structure & Architectural Standard

This document defines the authoritative directory layout and governance rules for the **Cricket Scorecard PWA** codebase. All contributors and AI assistants MUST adhere to this organization standard for all future edits and additions.

---

## 1. Directory Tree & Architecture Map

```
cricket-scorecard/
├── .github/                         # GitHub Actions CI/CD & Community Health
│   ├── ISSUE_TEMPLATE/              # Structured issue submission templates
│   │   ├── bug_report.yml            # Colorblind-safe bug report template
│   │   └── feature_request.yml       # Standardized feature proposal template
│   └── workflows/                   # Automated GitHub Actions pipelines
│       ├── ci.yml                   # Automated test & build verification gate
│       ├── deploy.yml               # GitHub Pages production deployment
│       └── release.yml              # Automated GitHub Release creation on tag push
├── backend/                         # Serverless Backend & Cloud Edge Integrations
│   ├── README.md                    # Backend integration overview & architectural diagram
│   ├── cloudflare/                  # Cloudflare Workers KV Live Sync Edge Worker
│   │   ├── worker.js                # CORS, GET, POST edge worker with 1-year KV TTL
│   │   └── wrangler.toml            # Cloudflare Wrangler CLI configuration
│   └── google-apps-script/          # Google Apps Script & Google Sheets Integration
│       └── Code.gs                  # Apps Script Web App for state ingest/export
├── docs/                            # Centralized Technical Documentation
│   ├── README.md                    # Documentation index and navigation guide
│   ├── DIRECTORY_STRUCTURE.md       # This file: Authoritative repository layout rules
│   ├── architecture/                # System designs & state machine specifications
│   │   ├── DESIGN.md                # Cricket scoring rules & UI/UX architecture
│   │   ├── LIVE_SYNC_DESIGN.md      # Zero-cost live streaming architecture & sync protocol
│   │   └── V2_ARCHITECTURE_REPORT.md # Comprehensive v2 domain & event-sourced architecture blueprint
│   ├── deployment/                  # Hosting & cloud infrastructure guides
│   │   └── DEPLOYMENT_AND_BACKEND_SETUP.md # Deployment manual for Pages, Workers, and GAS
│   ├── reports/                     # Bug ledgers & improvement roadmaps
│   │   ├── BUG_REPORT.md            # Historical bug audit & resolved issues ledger
│   │   └── IMPROVEMENTS_AND_ISSUES_REPORT.md # Feature roadmap & backlog ledger
│   ├── guides/                      # Operational guides for developers & reporters
│   │   └── BUG_REPORTING.md         # Diagnostic reproduction & bug reporting workflow
│   └── assets/                      # Media assets & icon generation notes
│       └── FAVICON.md               # Favicon specifications and SVG design notes
├── public/                          # Static Web Assets & Offline Shell
│   ├── icons/                       # PWA application icons (192x192, 512x512)
│   ├── favicon.svg                  # Vector application favicon
│   ├── manifest.json                # PWA Web App Manifest
│   └── sw.js                        # Offline service worker cache shell
├── scripts/                         # Build, Release & Automation Toolchain
│   ├── build-sw.js                  # Service worker precache asset compiler
│   ├── extract-release-notes.js     # CI release highlights & notes extractor
│   └── release.js                   # Standardized Release CLI (npm run release)
├── src/                             # Client Modular TypeScript Source Code
│   ├── feedback.ts                  # In-app bug reporter & GitHub Issue compiler
│   ├── modal.ts                     # Accessible modal dialog controller (W3C WAI-ARIA)
│   ├── reducer.ts                   # Pure deterministic state machine & cricket rules
│   ├── release_notes.ts             # Dynamic release notes modal renderer & event handler
│   ├── state.ts                     # Reactive state container & subscriber manager
│   ├── storage.ts                   # LocalStorage persistence, LZ-String compression & migration
│   ├── style.css                    # Colorblind-safe styling & responsive layouts
│   ├── sync.ts                      # Cloudflare KV & Apps Script live streaming sync provider
│   ├── types.ts                     # TypeScript domain interfaces & action types
│   ├── ui.ts                        # DOM event controller, scoreboard & keypad bindings
│   ├── version.ts                   # Semantic versioning authority (v$yyyy.$mm.$nnn)
│   └── v2/                          # v2 Event-Sourced Domain & Analytics Modules
│       ├── bridge.ts                # Legacy GameState <-> DeliveryEvent stream adapter
│       ├── charts.ts                # Zero-dependency SVG Match Worm & Manhattan charts
│       ├── export.ts                # Monospace ASCII, ball-by-ball CSV & JSON match exports
│       ├── hardware.ts              # Screen Wake Lock, Web Haptics & Audio Synthesizer
│       ├── stats.ts                 # Pure projection engine (wickets, maidens, partnerships)
│       └── types.ts                 # Event-sourced DeliveryEvent schemas & interfaces
├── test/                            # Automated Unit & Regression Test Suites
│   ├── test.ts                      # Test harness & JSDOM test runner
│   ├── test_cases.ts                # Core regression test cases (Tests 1–84)
│   └── v2_test_cases.ts             # v2 Architecture & Analytics test suite (Tests 85–89)
├── .gitignore                       # Git ignore patterns
├── CONTRIBUTING.md                  # Comprehensive developer & contributor onboarding guide
├── GEMINI.md                        # AI developer pairing guide & workspace rules
├── LICENSE                          # MIT Open Source License
├── PROMPT.md                        # Project specifications and core instructions
├── README.md                        # Primary landing page and quickstart guide
├── SECURITY.md                      # Security vulnerability disclosure policy
├── index.html                       # Mobile-first PWA HTML entry point
├── package.json                     # Node.js project manifest & npm scripts
├── tsconfig.json                    # TypeScript compiler configuration
└── vite.config.js                   # Vite bundler configuration
```

---

## 2. Directory Governance Rules

### Rule 1: Root Directory Cleanliness
Only fundamental repository-level configuration files are permitted at the root:
- `README.md`, `CONTRIBUTING.md`, `GEMINI.md`, `PROMPT.md`, `LICENSE`, `SECURITY.md`
- `package.json`, `package-lock.json`, `tsconfig.json`, `vite.config.js`, `index.html`, `.gitignore`
- **Strictly Prohibited**: Placing ad-hoc documentation, scratch notes, one-off scripts, or unstructured asset folders directly in the root directory.

### Rule 2: Modular Source Code Placement (`src/`)
- All client-side application logic must be organized into modular TypeScript files inside `src/`.
- Domain types belong in `src/types.ts`.
- Pure state transitions belong exclusively in `src/reducer.ts`.
- Modal interactions must use the universal modal manager in `src/modal.ts`.
- Release version constants belong in `src/version.ts`.
- No single file should exceed 2,000 lines; decouple large sub-systems into dedicated modules (e.g., `src/release_notes.ts`, `src/feedback.ts`).

### Rule 3: Cloud Integrations & Backend Services (`backend/`)
- Serverless worker scripts, cloud configurations, and cloud deployment manifests MUST be placed under `backend/<provider-name>/` (e.g., `backend/cloudflare/`, `backend/google-apps-script/`).
- Never create top-level directories for backend services.

### Rule 4: Structured Technical Documentation (`docs/`)
All detailed documentation must be placed in appropriate subdirectories under `docs/`:
- **`docs/architecture/`**: System design documents, state machine specifications, data protocols.
- **`docs/deployment/`**: Cloud setup guides, hosting instructions, edge deployment manuals.
- **`docs/reports/`**: Bug tracking ledgers, audit reports, improvement backlog trackers.
- **`docs/guides/`**: Contributor workflows, diagnostic reproduction guides, bug reporting manuals.
- **`docs/assets/`**: Design references, icon specifications, typography rules.

### Rule 5: Automation & Build Scripts (`scripts/`)
- All build helpers, service worker generators, and release automation scripts must reside in `scripts/`.
- All automation scripts must be cross-platform compatible and support non-interactive execution with explicit exit codes.

### Rule 6: Test Suite Organization (`test/`)
- Automated unit and regression tests must reside in `test/`.
- Every new feature or bugfix must be accompanied by a dedicated test case in `test/test_cases.ts` following the Red-Green-Refactor pattern.
