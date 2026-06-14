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

// Global type overrides for CDN loaded libraries
declare global {
  interface Window {
    bootstrap: any;
    Sortable: any;
    LZString: {
      compressToEncodedURIComponent(str: string): string;
      decompressFromEncodedURIComponent(str: string): string | null;
    };
  }
  const bootstrap: any;
  const Sortable: any;
  const LZString: {
    compressToEncodedURIComponent(str: string): string;
    decompressFromEncodedURIComponent(str: string): string | null;
  };
}
