# Cricket Scorecard PWA v2: Architectural Blueprint & Domain Deep-Dive

**Author**: Lead Web Architect & Cricket Statistics Specialist  
**Target Branch**: `v2`  
**Governance**: [`docs/DIRECTORY_STRUCTURE.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/DIRECTORY_STRUCTURE.md#L1) | [`docs/architecture/DESIGN.md`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/docs/architecture/DESIGN.md#L1)

---

## 1. Executive Summary & Philosophy

The **Cricket Scorecard PWA** is a high-performance, mobile-first, standalone Progressive Web App engineered for lightning-fast offline scoring and real-time live synchronization of cricket matches. 

While the existing v1 implementation successfully delivers offline scoring, live streaming with 1-year Cloudflare KV edge retention, single-umpire role locking, and LZString URL compression, a critical review from both a **senior web engineer** and a **cricket statistics expert** reveals substantial architectural opportunities for enhancement:

```
+---------------------------------------------------------------------------------------+
|                                  CRIC-SCORE V2 ENGINE                                  |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|   +--------------------------+                      +-----------------------------+   |
|   |  EVENT-SOURCED BALL LOG  |                      |   PURE STATS PROJECTIONS    |   |
|   |  • Atomic DeliveryEvent  | ──(Deterministic)──> |   • Batting / Bowling Table |   |
|   |  • Loss-free Replay      |      Reducer         |   • Partnerships & Spells   |   |
|   |  • Delta Live Sync       |                      |   • Worm & Manhattan SVGs   |   |
|   +--------------------------+                      +-----------------------------+   |
|                 │                                                  │                  |
|                 ▼                                                  ▼                  |
|   +--------------------------+                      +-----------------------------+   |
|   |   MOBILE HARDWARE APIS   |                      |    EXPORT & DATA SUITE      |   |
|   |  • Screen Wake Lock      |                      |   • Monospace Plaintext     |   |
|   |  • Haptic Tactile Engine |                      |   • Ball-by-Ball CSV        |   |
|   |  • Web Audio Synthesizer |                      |   • Match Archive JSON      |   |
|   +--------------------------+                      +-----------------------------+   |
|                                                                                       |
+---------------------------------------------------------------------------------------+
```

---

## 2. Critical Retrospective on v1 Architecture

### 2.1 Strengths of v1
1. **Zero External Runtime Heavyweights**: Relies on vanilla modern TypeScript and Vite without the bloat of multi-megabyte frameworks (React/Angular), ensuring instant sub-50ms cold starts on low-end mobile devices on the pitch.
2. **Serverless Edge Streaming**: Cloudflare Workers KV edge distribution delivers live match scorecards to unlimited global spectators at 100% zero host cost ($0.00).
3. **Robust Cryptographic Role Locking & Single-Umpire Leases**: Clear separation between private write credentials (`?live=m_xxx&key=k_yyy`) and read-only spectator views (`?live=m_xxx`), with automatic demotion protocol when an umpire session transfers between devices.
4. **Offline Resilience & URI State Compression**: Embedded LZString compression encodes entire matches into compact URL fragments (`?s=...`).

### 2.2 Architectural & Domain Limitations in v1
1. **Mutable State Accumulator vs Event Sourcing**:
   - In v1, the reducer imperatively increments counters on mutable objects (`live.score += runs`, `live.balls++`, `activeB.runs += runs`, `bowler.balls++`, `live.overLog.push(runs)`).
   - *Drawback*: Arithmetic edge cases (e.g. multi-run leg byes, no-ball boundaries, run outs on free hits, strike rotation on extras) require intricate manual adjustments in multiple action branches.
   - *Drawback*: Undo requires keeping a serialized deep-clone snapshot stack (`state.history.push(JSON.parse(JSON.stringify(state)))`), consuming unnecessary memory and preventing granular ball correction or timeline scrubbing.
2. **Monolithic Presentation Controller (`src/ui.ts`)**:
   - `src/ui.ts` grew to over 1,800 lines of imperative DOM querying (`document.getElementById`), innerHTML concatenation, and sprawling event binding.
3. **Cricket Statistical Depth Gaps**:
   - **No Partnership Tracking**: Scoring engines must capture current and historical wicket partnerships (runs scored, balls faced, individual player contributions).
   - **No Multi-Spell Bowler Tracking**: Bowlers often bowl in distinct spells (e.g., Opening Spell: 3-1-8-1; Death Spell: 2-0-16-1).
   - **Limited Visual Analytics**: Fans and players expect visual telemetry (Worm Charts comparing Innings 1 vs Innings 2, Manhattan bar charts showing over-by-over scoring rates, and Partnership breakdown charts).
   - **Dismissal Granularity**: Missing detailed dismissals (Caught & Bowled, Stumped, LBW, Hit Wicket, Retired Hurt, Retired Out) with fielder attribution.
4. **Field Ergonomics & Mobile Hardware Integration**:
   - Scorers on the cricket field face screen timeout issues under direct sunlight, requiring **Screen Wake Lock API** integration.
   - Lack of physical tactile feedback requires **Vibration / Haptics API** integration for tactile button confirmation.

---

## 3. Cricket Domain Modeling & Statistical Precision in v2

### 3.1 Formal Delivery Event Specification
In v2, the single source of truth is an append-only log of atomic **`DeliveryEvent`** objects:

```typescript
export type ExtraType = 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty';

export type DismissalKind = 
  | 'bowled'
  | 'caught'
  | 'lbw'
  | 'runout'
  | 'stumped'
  | 'hitwicket'
  | 'retired_hurt'
  | 'retired_out'
  | 'obstructing_field'
  | 'timed_out';

export interface DeliveryWicket {
  kind: DismissalKind;
  dismissedPlayer: string;
  fielder?: string;
  isRunOutStriker?: boolean;
  runsCompletedBeforeDismissal: number;
}

export interface DeliveryEvent {
  id: string;
  timestamp: number;
  inningsNumber: 1 | 2;
  overIndex: number;          // 0-indexed over number (0 = Over 1)
  ballInOver: number;         // 1-6 legal delivery number
  striker: string;            // Active batsman facing
  nonStriker: string;         // Non-striker partner
  bowler: string;             // Active bowler delivering
  runsBat: number;            // Runs credited to batsman off the bat (0, 1, 2, 3, 4, 6)
  runsExtra: number;          // Extra runs (penalty + byes/leg-byes)
  extraType?: ExtraType;      // Type of extra
  isLegalDelivery: boolean;   // False for wides and no-balls (does not increment over count)
  wicket?: DeliveryWicket;    // Dismissal metadata if wicket fell
  strikeRotated: boolean;     // Whether strike changed ends
  overCompleted: boolean;     // True if 6th legal delivery of the over
}
```

### 3.2 Pure Statistical Projections
All stats are computed purely on demand (or memoized) by projecting over the event log:
1. **Batting Figures**: Runs, Balls Faced, 4s, 6s, Strike Rate (`(runs / balls) * 100`), Dot Balls, Dismissal Text (e.g. `c Kohli b Bumrah 45 (32b 5x4 2x6 SR: 140.63)`).
2. **Bowling Figures**: Overs (`floor(balls / 6) + (balls % 6)/10`), Maidens (6 consecutive legal balls in an over with 0 bowler runs conceded), Runs Conceded, Wickets Taken, Economy Rate (`runs / (overs + balls/6)`), Wides, No-Balls, Dots.
3. **Partnership Calculations**: Cumulative runs and balls for every wicket pair (1st Wicket through 10th Wicket + unbroken current partnership).
4. **Fall of Wickets (FOW)**: Exact match score, wicket number, batsman out, and over coordinate (`34/1 (Sharma, 4.2 ov)`).
5. **Match Worm & Manhattan Projections**: Data arrays mapping legal ball index to cumulative score and over index to runs/wickets for instant SVG visualization.

---

## 4. Modern Web Architecture for v2

### 4.1 Modular Component Architecture

```
src/
├── v2/
│   ├── events.ts        # Atomic DeliveryEvent, MatchEvent schemas
│   ├── stats.ts         # Pure projection engine (Batting, Bowling, Partnerships, Charts)
│   ├── reducer.ts       # Event-sourced state machine & phase flow
│   ├── state.ts         # Reactive state container with subscriber listeners
│   ├── charts.ts        # Zero-dependency SVG visual analytics (Worm, Manhattan, Partnerships)
│   ├── hardware.ts      # Screen Wake Lock, Web Haptics, Web Audio synth
│   ├── export.ts        # Text scorecard, CSV ball-by-ball, JSON archives, Canvas card
│   └── components/
│       ├── Keypad.ts         # Tactile scoring console & quick modifier controls
│       ├── ScoreHeader.ts    # Hero score card, equation, CRR/RRR badges
│       ├── PlayerCards.ts    # Interactive striker/non-striker/bowler cards
│       ├── OverTimeline.ts   # Recent balls stream & collapsible completed overs
│       ├── AnalyticsView.ts  # Integrated SVG chart views & partnership breakdowns
│       └── Modals.ts         # Run out, extra runs, bulk import, toss, live stream dialogs
```

### 4.2 Hardware & Ergonomics Layer (`src/v2/hardware.ts`)
1. **Screen Wake Lock**:
   - Utilizes `navigator.wakeLock.request('screen')` with automatic re-acquisition on visibility change (`document.addEventListener('visibilitychange', ...)`).
   - Prevents mobile display timeouts during outdoor scoring sessions.
2. **Web Haptics Engine**:
   - Dot / Single: `[15]` ms vibration.
   - Boundary 4: `[30, 40, 30]` ms double pulse.
   - Maximum 6: `[50, 40, 50]` ms heavy pulse.
   - Wicket: `[100, 50, 100, 50, 150]` ms dramatic pattern.
3. **Web Audio Sound Effects**:
   - Zero-asset synthetic sound effects via Web Audio API (`AudioContext`) producing clean acoustic feedback.

---

## 5. Visual Analytics & Charts Suite (`src/v2/charts.ts`)

v2 introduces zero-dependency, colorblind-safe SVG charts:
1. **Worm Chart (`renderWormChartSVG`)**:
   - Dual-curve comparison of Innings 1 (Blue `#0072B2`) vs Innings 2 (Orange `#D55E00`).
   - Circular wicket markers marking exact dismissal coordinates.
   - Interactive SVG viewBox scaling smoothly on mobile and desktop.
2. **Manhattan Chart (`renderManhattanChartSVG`)**:
   - Over-by-over runs bar chart with high visual contrast.
   - Wicket pins (colorblind-safe `W` badge / diamond marker) floating atop bars where dismissals occurred.
3. **Partnerships Wagon (`renderPartnershipChartSVG`)**:
   - Segmented horizontal stacked bars breaking down runs contributed by each batsman in the partnership.

---

## 6. Data Portability & Match Management (`src/v2/export.ts`)

1. **Plaintext Monospace Scorecard**: Formatted for instant clipboard copying to WhatsApp, SMS, or club forums.
2. **Ball-by-Ball CSV Export**: Comprehensive spreadsheet-ready CSV tracking every ball, striker, bowler, runs, extras, and wickets for statistical analysis.
3. **JSON Match Archive & Restore**: Full event log and metadata exported as `.json` or imported to review historical matches.
4. **Social Media Canvas Graphic**: Generates a downloadable high-resolution match summary card (`canvas.toBlob()`) featuring final scores, top performers, and winner declaration.

---

## 7. Accessibility & Red-Green Colorblind Design

1. **Tol's Accessible Palette**:
   - Primary: Blue (`#0072B2`)
   - Accent / Chasing: Orange (`#D55E00`)
   - Warning / Caution: Yellow / Amber (`#E69F00`)
   - Extras / Info: Sky Blue (`#56B4E9`)
   - Secondary: Purple (`#CC79A7`)
2. **Double Encoding**:
   - Status indicators pair distinct text labels with geometric badges (`[PASS]`, `[FAIL]`, `[FEAT]`, `[FIX]`, `●` striker, `🎯` bowler, `W` wicket).

---

## 8. Verification & Test Matrix

The v2 implementation will be verified through:
- **Event Sourcing Test Suite**: Testing complete match simulation from atomic events.
- **Pure Projection Mathematical Verification**: Testing edge cases in MCC Law 21/22 extras separation, maidens calculation across multiple spells, and DLS/target equations.
- **SVG Chart Generator Tests**: Validating non-empty SVG strings, correct coordinate mapping, and error resilience.
- **Hardware Fallback Tests**: Verifying graceful degradation when Wake Lock, Vibration, or AudioContext are unavailable in desktop/headless environments.
- **Backwards Compatibility**: Maintaining full support for legacy LZString URL permalinks (`?s=...`) and Cloudflare Workers KV live streaming.
