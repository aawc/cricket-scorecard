/**
 * Cricket Scorecard PWA v2 - Core Domain Types & Event Specification
 * Event-sourced cricket scoring, statistical projections, and visual telemetry.
 */

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
  | 'timed_out'
  | 'hit_ball_twice';

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
  ballInOver: number;         // 1-6 legal delivery number within the over
  striker: string;            // Active batsman facing delivery
  nonStriker: string;         // Non-striker batting partner
  bowler: string;             // Active bowler delivering
  runsBat: number;            // Runs off the bat (0, 1, 2, 3, 4, 6)
  runsExtra: number;          // Extra runs (penalty + byes/leg-byes)
  extraType?: ExtraType;      // Type of extra (wide, noball, bye, legbye, penalty)
  isLegalDelivery: boolean;   // False for wides and no-balls
  wicket?: DeliveryWicket;    // Dismissal metadata if a wicket fell
  strikeRotated: boolean;     // Whether strike changed ends
  overCompleted: boolean;     // True if this was the 6th legal delivery of the over
  commentary?: string;        // Optional custom ball-by-ball commentary text
}

export interface BatsmanProjection {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  strikeRate: number;         // (runs / balls) * 100
  boundaryPercent: number;    // ((4*fours + 6*sixes) / runs) * 100
  isOut: boolean;
  dismissalText: string;      // e.g., "c Kohli b Bumrah", "not out", "run out (Jadeja)"
  isActive: boolean;
  isStriker: boolean;
}

export interface BowlerProjection {
  name: string;
  balls: number;
  oversFormatted: string;     // e.g., "3.4"
  maidens: number;
  runsConceded: number;
  wickets: number;
  economy: number;            // runs / (overs + balls/6)
  wides: number;
  noballs: number;
  dots: number;
  dotPercent: number;
}

export interface Partnership {
  wicketNumber: number;       // 1 for 1st wicket, 2 for 2nd wicket, etc.
  player1Name: string;
  player1Runs: number;
  player1Balls: number;
  player2Name: string;
  player2Runs: number;
  player2Balls: number;
  totalRuns: number;
  totalBalls: number;
  unbroken: boolean;          // True if currently active on the pitch
}

export interface FallOfWicketRecord {
  wicket: number;
  score: number;
  batsman: string;
  overs: string;
  partnershipRuns: number;
}

export interface OverSummary {
  overIndex: number;
  bowler: string;
  balls: DeliveryEvent[];
  runs: number;
  wickets: number;
  isMaiden: boolean;
  displayLog: string[];
}

export interface ExtrasSummary {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  penalties: number;
  total: number;
}

export interface InningsProjection {
  inningsNumber: 1 | 2;
  battingTeamName: string;
  bowlingTeamName: string;
  totalScore: number;
  totalWickets: number;
  legalBalls: number;
  oversFormatted: string;     // e.g. "5.2"
  runRate: number;            // Current Run Rate (CRR)
  requiredRunRate: number | null; // Required Run Rate (RRR)
  target: number | null;
  equation: string;           // e.g. "Team 2 needs 14 runs in 18 balls (RRR: 4.67)"
  isCompleted: boolean;
  completionReason?: 'ALL_OUT' | 'OVERS_EXHAUSTED' | 'TARGET_REACHED' | 'DECLARED';
  batsmen: Record<string, BatsmanProjection>;
  batsmenList: BatsmanProjection[];
  bowlers: Record<string, BowlerProjection>;
  bowlersList: BowlerProjection[];
  partnerships: Partnership[];
  currentPartnership: Partnership | null;
  fallOfWickets: FallOfWicketRecord[];
  overs: OverSummary[];
  currentOver: OverSummary;
  extras: ExtrasSummary;
  activeStriker: string | null;
  activeNonStriker: string | null;
  activeBowler: string | null;
  projectedScores: {
    currentCRR: number;
    at6Overs: number;
    at8Overs: number;
    at10Overs: number;
    at20Overs: number;
  };
}

export interface WormDataPoint {
  ballIndex: number;          // Legal ball index (1, 2, 3...)
  oversFormatted: string;     // "0.1", "0.2"...
  score: number;
  wickets: number;
  isWicket: boolean;
  batsmanOut?: string;
}

export interface WormChartData {
  innings1: WormDataPoint[];
  innings2: WormDataPoint[];
  maxBalls: number;
  maxScore: number;
}

export interface ManhattanBar {
  overNumber: number;         // 1, 2, 3...
  runs: number;
  wickets: number;
  bowler: string;
}

export interface MatchV2Settings {
  totalInnings: number;
  oversPerInnings: number;
  maxOversPerBowler: number;
  widePenalty: number;
  noBallPenalty: number;
  allowSingleBatsman: boolean;
  enableLegByes: boolean;
  theme: 'light' | 'dark' | 'green';
  enableWakeLock: boolean;
  enableHaptics: boolean;
  enableSoundEffects: boolean;
}

export type V2MatchPhase = 'SETUP' | 'TOSS' | 'PLAYING_INNINGS' | 'INNINGS_BREAK' | 'MATCH_OVER';

export interface MatchV2State {
  version: 2;
  id: string;
  createdAt: number;
  settings: MatchV2Settings;
  phase: V2MatchPhase;
  matchStarted: boolean;
  matchOver: boolean;
  toss: {
    winnerTeamNum: 1 | 2;
    battingFirstTeamNum: 1 | 2;
  } | null;
  teams: {
    team1: { name: string; players: string[] };
    team2: { name: string; players: string[] };
  };
  currentInningsNumber: 1 | 2;
  events: DeliveryEvent[];
  activeStriker: string | null;
  activeNonStriker: string | null;
  activeBowler: string | null;
  uiActiveTab: 'SCORING' | 'SCORECARD' | 'ANALYTICS' | 'ARCHIVE';
  hardware: {
    wakeLockActive: boolean;
    soundEnabled: boolean;
    hapticsEnabled: boolean;
  };
}
