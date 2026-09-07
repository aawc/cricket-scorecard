# Feedback & Diagnostic Bug Reporting Guide

**Application**: Cricket Scorecard PWA  
**Version**: `v20260907-003`  
**Repository**: `cricket-scorecard-pwa`  
**Module**: [`src/feedback.ts`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts)

---

## 1. Overview

To facilitate fast, zero-friction debugging and reproduction of scoring anomalies or user-reported bugs, the Cricket Scorecard PWA includes a built-in **Feedback & Bug Reporting Mechanism**.

When a user encounters a scoring issue (e.g. unexpected strike swap, incorrect balls faced, or maiden over counting problem), they can click the **"Feedback / Bug"** button in the header or the **"Report Issue / Feedback"** link in the footer. 

The application automatically compiles:
1. **User Written Description**: The user's explanation of what happened and what was expected.
2. **Complete Match State**: Active striker and non-striker statistics (runs, balls, 4s, 6s, strike rate), bowler figures (overs, maidens, runs, wickets, economy, extras), Fall of Wickets (FOW) sequence, current over log, extras breakdown, and match phase.
3. **Reproduction Payload**: Both an LZString-compressed permalink URL (`?s=...`) and the raw minified JSON state.
4. **Environment Context**: Browser User-Agent, screen resolution, theme, online/offline status, and timestamp.
5. **Runtime Error Buffer**: Any unhandled JavaScript exceptions or promise rejections captured during the session.

---

## 2. User Workflow & UI Controls

### Step 1: Open the Feedback Modal
- Click **"Feedback / Bug"** in the top navigation header button group.
- Alternatively, click **"Report Issue / Feedback"** in the page footer.

### Step 2: Enter Description
- Type what occurred into the description field (e.g., *"On ball 4 of over 2, P1 got run out but P2 was marked out, and strike rotated incorrectly."*).

### Step 3: Diagnostic Preview & State Inclusion
- The modal displays an accordion preview of the Markdown report that will be copied.
- A checkbox (*"Include match state & diagnostic logs"*) allows users to include or exclude match state data (enabled by default for debugging).

### Step 4: Export Options
- **📋 Copy Bug Report to Clipboard**: Copies the complete, formatted Markdown report directly to the system clipboard. A confirmation toast is displayed.
- **🐛 Open GitHub Issue**: Opens a new issue window on `https://github.com/aawc/cricket-scorecard-pwa/issues/new` with pre-filled title and markdown report body.

---

## 3. Format of the Generated Bug Report

When copied or pasted, the report is formatted in clean, structured GitHub Flavored Markdown:

````markdown
## 🏏 Cricket Scorecard Bug Report & Diagnostic Context

**Timestamp**: `2026-09-07T02:45:00.000Z`  
**App Version**: `v20260907-003`  
**Environment**: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36...`  
**Screen Size**: `1920x1080 (devicePixelRatio: 1)` | **Online**: `true` | **Theme**: `light`  

### 1. User Feedback / Problem Description
Strike rotation didn't happen after odd bye on ball 4.

### 2. Match State Summary
- **Phase**: `PLAYING_INNINGS` (Match Started: `true`, Match Over: `false`)
- **Innings**: `1` of `1`
- **Batting Team**: Team 1 (11 players: P1, P2, P3, P4, P5, P6, P7, P8, P9, P10, P11)
- **Bowling Team**: Team 2 (11 players: B1, B2, B3, B4, B5, B6, B7, B8, B9, B10, B11)
- **Score**: **35 / 1** (2.4 / 8 ov)
- **Extras**: 1 (Wides: 0, No-Balls: 0, Byes: 1, Leg-Byes: 0)
- **Slot 1 Batsman**: P1 [STRIKER] (24 runs, 12 balls, 3x4, 1x6)
- **Slot 2 Batsman**: P2 [NON-STRIKER] (10 runs, 6 balls, 1x4, 0x6)
- **Current Bowler**: B1 (1.4 ov, 0 maidens, 14 runs, 1 wkts, Econ: 8.40, wd: 0, nb: 0)
- **Previous Bowler**: B2
- **Current Over Deliveries**: [0, 4, W, 1]
- **Fall of Wickets**: 1-12 (P0, 1.1 ov)
- **Dismissed Batsmen**: [P0]
- **Completed Overs History**:
  - Over 1 (B2): 0, 1, 0, 4, 1, 0

### 3. State Reproduction Payload
- **Permalink URL**: `https://varun.khaneja.org/cricket-scorecard/?s=EqCw...`
- **Minified State JSON**:
```json
{"ph":"PLAYING_INNINGS","s":{"opi":8,"mob":2,"asb":1,"elb":0,"th":"light"},"m":{"ci":1,"cbt":1,"t1":{"n":"Team 1","p":["P1","P2"],"in":[]},"t2":{"n":"Team 2","p":["B1","B2"],"in":[]},"li":{"sc":35,"w":1,"b":16,"ex":{"wd":0,"nb":0,"by":1,"lb":0},"bat":{"P1":{"r":24,"b":12,"f":3,"s":1,"a":1},"P2":{"r":10,"b":6,"f":1,"s":0,"a":0}},"bowl":{"B1":{"r":14,"b":10,"wk":1,"m":0,"wd":0,"nb":0}},"cb1":"P1","cb2":"P2","cbo":"B1","pbo":"B2","ob":["P0"],"ov":[{"bo":"B2","bl":["0","1","0","4","1","0"]}],"ol":["0","4","W","1"],"fw":[{"w":1,"s":12,"b":"P0","ov":"1.1"}]},"tg":null,"mo":0}}
```

### 4. Recorded Runtime Logs & Errors
_No unhandled runtime errors recorded during session._
````

---

## 4. How to Reproduce Reported Bugs

When a user pastes a bug report into the AI chat or GitHub issues:

### Method A: Automated Test Reproduction
1. Copy the `Minified State JSON` or `Permalink URL`.
2. In Node.js or `test/test_cases.ts`:
   ```typescript
   const rawMinified = <pasted JSON>;
   const loadedState = unminifyState(rawMinified);
   setGameState(loadedState);
   // Step through delivery action that caused the error:
   finalizeDelivery('bye', 0, 'byes');
   ```

### Method B: Live Browser Reproduction
1. Open the permalink URL (`https://varun.khaneja.org/cricket-scorecard/?s=...`).
2. The web application instantly decodes the LZString compressed state and restores all players, scores, overs, and active striker states.
3. Inspect DOM elements and click the exact scoring button to observe the reported behavior.

---

## 5. Technical Implementation Details

- [`src/feedback.ts:L20-L64`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L20-L64) (`recordRuntimeError`): In-memory ring buffer (up to 20 logs) capturing `window.addEventListener('error')` and `window.addEventListener('unhandledrejection')`.
- [`src/feedback.ts:L106-L239`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L106-L239) (`generateBugReportMarkdown`): Constructs the markdown document with environment, match figures, Fall of Wickets, and reproduction JSON.
- [`src/feedback.ts:L244-L275`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L244-L275) (`copyBugReportToClipboard`): Modern `navigator.clipboard` writer with fallback to `document.execCommand('copy')`.
- [`src/feedback.ts:L280-L293`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/feedback.ts#L280-L293) (`getGitHubIssueUrl`): Encodes GitHub new issue URL with size bounds.
- [`src/ui.ts:L1088-L1145`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/src/ui.ts#L1088-L1145): UI modal event wiring and real-time live preview update.
- [`test/test_cases.ts:L1500-L1625`](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/test/test_cases.ts#L1500-L1625): Unit tests 51, 52, and 53.
