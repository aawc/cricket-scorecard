# Implementation Plan - TypeScript Migration & Tooling

To introduce compile-time type safety and modernize the build pipeline, we will migrate the codebase from Vanilla JavaScript to **TypeScript** using **Vite** as our bundler and development server.

---

## 1. Directory Structure Changes

We will restructure the project to follow standard SPA layout guidelines:

```
├── dist/                    # Production compiled build (gitignored, deploy target)
├── node_modules/            # NPM dependencies (gitignored)
├── public/                  # Static assets
│   ├── manifest.json
│   └── icons/
├── src/                     # TypeScript Source Files
│   ├── app.ts               # PWA Entry point
│   ├── state.ts             # State initialization & selectors
│   ├── storage.ts           # Serialization / minification
│   ├── reducer.ts           # Central reducer state machine
│   ├── ui.ts                # DOM rendering & handlers
│   └── types.ts             # TypeScript type declarations & interfaces
├── test/                    # Test Suite
│   ├── test.ts              # Node test runner (using ts-node)
│   └── test_cases.ts        # Test cases rewritten in TS
├── index.html               # Main entry HTML (Vite-aligned)
├── package.json             # NPM package definition
├── tsconfig.json            # TypeScript compiler configuration
├── vite.config.js           # Vite configuration
├── sw.js                    # Service Worker (copied to dist root)
└── style.css                # Global styles
```

---

## 2. Core Configurations

### package.json
We will create a `package.json` with scripts to build, test, and run locally:
```json
{
  "name": "cricket-scorecard-pwa",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build && node scripts/build-sw.js",
    "preview": "vite preview",
    "test": "node --loader ts-node/esm test/test.ts"
  },
  "devDependencies": {
    "typescript": "^5.9.3",
    "vite": "^8.0.16",
    "ts-node": "^10.9.1"
  }
}
```

### tsconfig.json
Compiler options for browser target and Node test compatibility:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*", "sw.js"]
}
```

### vite.config.js
Config for Vite to bundle assets and compile TS:
```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative paths for GitHub Pages
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: 'index.html'
    }
  }
});
```

---

## 3. Type Declarations (`src/types.ts`)

We will define central models representing the match structures:

```typescript
export interface Player {
  name: string;
}

export interface BatsmanStats {
  runs: number;
  balls: number;
  active: boolean;
}

export interface BowlerStats {
  runs: number;
  balls: number;
  wickets: number;
  wides?: number;
  noballs?: number;
}

export interface Extras {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
}

export interface LiveInnings {
  score: number;
  wickets: number;
  balls: number;
  extras: Extras;
  batsmen: Record<string, BatsmanStats>;
  bowlers: Record<string, BowlerStats>;
  currentBatsman1: string | null;
  currentBatsman2: string | null;
  currentBowler: string | null;
  previousBowler: string | null;
  outBatsmen: string[];
  overs: Array<{ bowler: string; balls: string[] }>;
  overLog: string[];
}

export interface Innings extends LiveInnings {}

export interface Team {
  name: string;
  players: string[];
  innings: Innings[];
}

export interface Settings {
  totalInnings: number;
  oversPerInnings: number;
  maxOversPerBowler: number;
  widePenalty: number;
  noBallPenalty: number;
  allowSingleBatsman: boolean;
  enableLegByes: boolean;
  theme: 'light' | 'dark' | 'green';
}

export type MatchPhase = 'SETUP' | 'TOSS' | 'PLAYING_INNINGS' | 'INNINGS_BREAK' | 'MATCH_OVER';

export interface GameState {
  settings: Settings;
  match: {
    currentInnings: number;
    currentBattingTeam: 1 | 2;
    team1: Team;
    team2: Team;
    liveInnings: LiveInnings;
    target: number | null;
    matchOver: boolean;
  };
  matchStarted: boolean;
  phase: MatchPhase;
  uiEvents: any[];
  history: any[];
}

export type Action =
  | { type: 'START_MATCH'; payload: { settings: Partial<Settings>; team1Players: string[]; team2Players: string[] } }
  | { type: 'CHOOSE_TOSS_BATTING'; payload: { battingTeamNum: 1 | 2 } }
  | { type: 'FORCE_END_INNINGS' }
  | { type: 'ADD_RUNS'; payload: { runs: number } }
  | { type: 'ADD_WICKET' }
  | { type: 'ADD_LEG_BYE' }
  | { type: 'FINALIZE_DELIVERY'; payload: { type: string; extraRuns: number; accrueTo: string; pendingRunOutStriker?: boolean } }
  | { type: 'CHANGE_BATSMAN'; payload: { slot: 1 | 2; name: string } }
  | { type: 'CHANGE_BOWLER'; payload: { name: string } }
  | { type: 'START_NEXT_INNINGS' }
  | { type: 'UNDO' }
  | { type: 'RESET_MATCH' };
```

---

## 4. Step-by-Step Conversion Flow

1.  **Dependencies Setup**: Create `package.json`, install TS and Vite, and configure `tsconfig.json`.
2.  **Move & Rename Files**: Move source files to `src/` and rename them to `.ts`.
3.  **Resolve Compilation Errors**:
    *   Introduce `src/types.ts`.
    *   Add types to `src/state.ts` (e.g. `setGameState(newState: GameState)`).
    *   Add types to `src/reducer.ts` (defining the reducer return type and action guards).
    *   Add types to `src/storage.ts` (adding type casts to `LZString` compression calls).
    *   Add types to `src/ui.ts` (defining explicit `HTMLSelectElement` or `HTMLElement` casts for DOM queries).
4.  **Refactor Test Suite**:
    *   Convert `test/test_cases.js` to `test_cases.ts` and type the test state resets.
    *   Convert `test/test.ts` to use `ts-node` loader so tests run directly against TS files.
5.  **Service Worker Bundle**: Align `sw.js` imports and ensure compiled script caching behaves correctly with Vite builds.
6.  **Verify**: Run `npm test` and execute local verification via Vite server.
7.  **Finalize**: Stage edits, update `DESIGN.md` "Completed Improvements" section, and commit.

---

## 5. Testing & Verification Plan

### 1. Automated Test Suite Execution (TypeScript Runner)
We will transition the Node test environment to use `ts-node` for transpilation-free runtime execution:
- **Test Entry Point (`test/test.ts`)**:
  - We will configure `test.ts` to dynamically import `src/state.ts` and `src/ui.ts` using Node ESM imports.
  - Expose elements and handlers on the Node `global` object just as the current JS runner does, but typed with the correct interfaces.
- **TypeScript Test Cases (`test/test_cases.ts`)**:
  - Convert assertions to ensure type safety. For example, validating that properties read from the DOM (`textContent`, classes, dataset attributes) conform to strict type assumptions.
  - Execute using: `npm test` (which triggers `node --loader ts-node/esm test/test.ts`).
  - **Verification**: Run `npm test` and ensure all 34 tests execute and pass cleanly.

### 2. Manual Browser Verification (Vite Dev Server)
We will run a local Vite server to test browser interactivity:
- Run `npm run dev` to start Vite at `http://localhost:5173`.
- Verify the following flows in the browser:
  - Game Setup: Add/remove players, modify settings, start match.
  - Scoring: Enter runs, wickets, extras, undo actions.
  - Persistent Storage: Hard-refresh page, verify match state is restored from `localStorage`.
  - Share Link: Generate a permalink, open it in an incognito window, and assert that the match state (including batsman/bowler details and phase) is accurately decoded.

### 3. PWA Service Worker Cache Verification (Vite Production Build)
To verify offline PWA compliance under the new compilation layout:
- Build the production app: `npm run build` (produces the `dist/` directory).
- Host the build locally (e.g. using `npx serve dist` or `vite preview`).
- In Chrome DevTools:
  - Go to **Application** -> **Service Workers** and verify that `sw.js` is registered successfully.
  - Go to **Application** -> **Cache Storage** and check that all bundled static assets (compiled `index.html`, minified JS/CSS chunks under `assets/`, `manifest.json`) are stored.
  - Toggle **Offline** mode in Network DevTools, reload the page, and verify that the scorecard app loads and allows score input without network access.
