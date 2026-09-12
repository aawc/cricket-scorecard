/**
 * Cricket Scorecard PWA v2 - Pure Statistical Projection Engine
 * Deterministic, mathematical projections over the DeliveryEvent stream.
 */

import {
  DeliveryEvent,
  InningsProjection,
  BatsmanProjection,
  BowlerProjection,
  Partnership,
  FallOfWicketRecord,
  OverSummary,
  ExtrasSummary,
  WormChartData,
  WormDataPoint,
  ManhattanBar,
  DismissalKind
} from './types.js';

/**
 * Format balls into standard cricket overs notation (e.g., 17 balls -> "2.5")
 */
export function formatOvers(legalBalls: number): string {
  const completedOvers = Math.floor(legalBalls / 6);
  const remainingBalls = legalBalls % 6;
  return `${completedOvers}.${remainingBalls}`;
}

/**
 * Convert overs string or balls to decimal overs for rate calculations (e.g., 2.5 overs -> 2.8333)
 */
export function decimalOvers(legalBalls: number): number {
  if (legalBalls <= 0) return 0;
  return legalBalls / 6;
}

/**
 * Calculate Run Rate with precision to 2 decimal places
 */
export function calculateRunRate(runs: number, legalBalls: number): number {
  if (legalBalls <= 0) return 0.0;
  const rate = (runs / legalBalls) * 6;
  return Math.round(rate * 100) / 100;
}

/**
 * Calculate Strike Rate: (runs / balls) * 100
 */
export function calculateStrikeRate(runs: number, balls: number): number {
  if (balls <= 0) return 0.0;
  return Math.round(((runs / balls) * 100) * 100) / 100;
}

/**
 * Calculate Economy Rate: (runsConceded / legalBalls) * 6
 */
export function calculateEconomy(runsConceded: number, legalBalls: number): number {
  if (legalBalls <= 0) return 0.0;
  return Math.round(((runsConceded / legalBalls) * 6) * 100) / 100;
}

/**
 * Format dismissal description (e.g. "c Kohli b Bumrah", "b Starc", "run out (Jadeja)")
 */
export function formatDismissalText(kind: DismissalKind, bowler: string, fielder?: string): string {
  switch (kind) {
    case 'bowled':
      return `b ${bowler}`;
    case 'caught':
      return fielder && fielder !== bowler ? `c ${fielder} b ${bowler}` : `c & b ${bowler}`;
    case 'lbw':
      return `lbw b ${bowler}`;
    case 'stumped':
      return fielder ? `st ${fielder} b ${bowler}` : `st b ${bowler}`;
    case 'runout':
      return fielder ? `run out (${fielder})` : `run out`;
    case 'hitwicket':
      return `hit wicket b ${bowler}`;
    case 'retired_hurt':
      return `retired hurt`;
    case 'retired_out':
      return `retired out`;
    case 'obstructing_field':
      return `obstructing the field`;
    case 'timed_out':
      return `timed out`;
    case 'hit_ball_twice':
      return `hit the ball twice`;
    default:
      return `out`;
  }
}

/**
 * Format a delivery event into compact over-log string notation (e.g., ".", "1", "4", "6", "W", "1wd", "nb1", "2lb")
 */
export function formatDeliveryNotation(ball: DeliveryEvent): string {
  if (ball.wicket) {
    if (ball.wicket.kind === 'runout') {
      // Mirror executeRunOutWicket in src/reducer.ts: 'W-RO', '{N}+W-RO' for
      // runs credited to the striker, '{N}b+W-RO' when they were byes.
      const runs = ball.wicket.runsCompletedBeforeDismissal || 0;
      if (runs <= 0) return 'W-RO';
      return ball.extraType === 'bye' ? `${runs}b+W-RO` : `${runs}+W-RO`;
    }
    return 'W';
  }

  if (ball.extraType === 'wide') {
    if (ball.runsBat > 0) return `wd+${ball.runsBat}`;
    if (ball.runsExtra > 1) return `wd+${ball.runsExtra - 1}b`;
    return 'wd';
  }

  if (ball.extraType === 'noball') {
    if (ball.runsBat > 0) return `nb+${ball.runsBat}`;
    if (ball.runsExtra > 1) return `nb+${ball.runsExtra - 1}b`;
    return 'nb';
  }

  if (ball.extraType === 'bye') {
    return ball.runsExtra === 1 ? '1b' : `${ball.runsExtra}b`;
  }

  if (ball.extraType === 'legbye') {
    return ball.runsExtra === 1 ? '1lb' : `${ball.runsExtra}lb`;
  }

  if (ball.runsBat === 0) {
    return '.';
  }

  return ball.runsBat.toString();
}

/**
 * Check if a bowler gets credit for a dismissal under MCC Laws
 */
export function isBowlerWicket(kind: DismissalKind): boolean {
  return (
    kind === 'bowled' ||
    kind === 'caught' ||
    kind === 'lbw' ||
    kind === 'stumped' ||
    kind === 'hitwicket'
  );
}

/**
 * Pure projection of an entire innings from its delivery events.
 */
export function projectInnings(
  events: DeliveryEvent[],
  battingTeamName: string,
  bowlingTeamName: string,
  inningsNumber: 1 | 2,
  oversPerInnings: number,
  target: number | null,
  initialStriker?: string | null,
  initialNonStriker?: string | null,
  initialBowler?: string | null
): InningsProjection {
  let totalScore = 0;
  let totalWickets = 0;
  let legalBalls = 0;

  const extras: ExtrasSummary = {
    wides: 0,
    noballs: 0,
    byes: 0,
    legbyes: 0,
    penalties: 0,
    total: 0
  };

  const batsmenMap: Record<string, BatsmanProjection> = {};
  const bowlersMap: Record<string, BowlerProjection> = {};
  const fallOfWickets: FallOfWicketRecord[] = [];
  const overs: OverSummary[] = [];

  // Partnerships state tracking
  const partnerships: Partnership[] = [];
  let currentPshipRuns = 0;
  let currentPshipBalls = 0;
  let currentPshipP1 = events.length > 0 ? events[0].striker : (initialStriker || '');
  let currentPshipP1Runs = 0;
  let currentPshipP1Balls = 0;
  let currentPshipP2 = events.length > 0 ? events[0].nonStriker : (initialNonStriker || '');
  let currentPshipP2Runs = 0;
  let currentPshipP2Balls = 0;
  let pshipWicketNum = 1;

  let activeStriker = initialStriker || null;
  let activeNonStriker = initialNonStriker || null;
  let activeBowler = initialBowler || null;

  function ensureBatsman(name: string): BatsmanProjection {
    if (!batsmenMap[name]) {
      batsmenMap[name] = {
        name,
        runs: 0,
        balls: 0,
        fours: 0,
        sixes: 0,
        dots: 0,
        strikeRate: 0,
        boundaryPercent: 0,
        isOut: false,
        dismissalText: 'not out',
        isActive: false,
        isStriker: false
      };
    }
    return batsmenMap[name];
  }

  function ensureBowler(name: string): BowlerProjection {
    if (!bowlersMap[name]) {
      bowlersMap[name] = {
        name,
        balls: 0,
        oversFormatted: '0.0',
        maidens: 0,
        runsConceded: 0,
        wickets: 0,
        economy: 0,
        wides: 0,
        noballs: 0,
        dots: 0,
        dotPercent: 0
      };
    }
    return bowlersMap[name];
  }

  if (initialStriker) ensureBatsman(initialStriker).isActive = true;
  if (initialNonStriker) ensureBatsman(initialNonStriker).isActive = true;
  if (initialBowler) ensureBowler(initialBowler);

  let currentOverSummary: OverSummary = {
    overIndex: 0,
    bowler: initialBowler || '',
    balls: [],
    runs: 0,
    wickets: 0,
    isMaiden: false,
    displayLog: []
  };

  // Process all delivery events sequentially
  for (const event of events) {
    activeStriker = event.striker;
    activeNonStriker = event.nonStriker;
    activeBowler = event.bowler;

    const striker = ensureBatsman(event.striker);
    const nonStriker = ensureBatsman(event.nonStriker);
    const bowler = ensureBowler(event.bowler);

    striker.isActive = true;
    nonStriker.isActive = true;

    // Dynamically populate vacant partnership slots for incoming batsman
    if (!currentPshipP1) {
      currentPshipP1 = event.striker !== currentPshipP2 ? event.striker : event.nonStriker;
    } else if (!currentPshipP2) {
      currentPshipP2 = event.striker !== currentPshipP1 ? event.striker : event.nonStriker;
    }

    // 1. Scoring & Extras Accounting
    const ballTotalRuns = event.runsBat + event.runsExtra;
    totalScore += ballTotalRuns;

    if (event.isLegalDelivery) {
      legalBalls++;
      striker.balls++;
      bowler.balls++;
      currentPshipBalls++;

      if (event.striker === currentPshipP1) currentPshipP1Balls++;
      else if (event.striker === currentPshipP2) currentPshipP2Balls++;
    } else {
      // No-ball counts as ball faced for batsman (Law 21)
      if (event.extraType === 'noball') {
        striker.balls++;
        if (event.striker === currentPshipP1) currentPshipP1Balls++;
        else if (event.striker === currentPshipP2) currentPshipP2Balls++;
      }
    }

    // Bat runs
    if (event.runsBat > 0) {
      striker.runs += event.runsBat;
      currentPshipRuns += event.runsBat;
      if (event.striker === currentPshipP1) currentPshipP1Runs += event.runsBat;
      else if (event.striker === currentPshipP2) currentPshipP2Runs += event.runsBat;

      if (event.runsBat === 4) striker.fours++;
      if (event.runsBat === 6) striker.sixes++;
    } else if (event.isLegalDelivery && ballTotalRuns === 0) {
      striker.dots++;
      bowler.dots++;
    }

    // Bowler runs (Bat runs + Wides + No-balls). Byes & Leg Byes do NOT penalize bowler (Law 21.18)
    let bowlerChargedRuns = event.runsBat;
    if (event.extraType === 'wide') {
      // A wide charges the bowler for every run on the delivery, including byes.
      bowlerChargedRuns += event.runsExtra;
      // 1 penalty run is recorded as a wide; the delivery counter increments once.
      extras.wides += 1;
      bowler.wides += 1;
      extras.total += event.runsExtra;
      currentPshipRuns += event.runsExtra;
      // Additional runs physically run off the wide are byes (see 'wd+Nb').
      if (event.runsExtra > 1) {
        extras.byes += (event.runsExtra - 1);
      }
    } else if (event.extraType === 'noball') {
      // 1 penalty run charged to bowler
      bowlerChargedRuns += 1;
      extras.noballs += 1;
      bowler.noballs += 1;
      extras.total += 1;
      currentPshipRuns += 1;
      // Additional extras on noball (e.g. byes/legbyes)
      if (event.runsExtra > 1) {
        extras.byes += (event.runsExtra - 1);
        extras.total += (event.runsExtra - 1);
        currentPshipRuns += (event.runsExtra - 1);
      }
    } else if (event.extraType === 'bye') {
      extras.byes += event.runsExtra;
      extras.total += event.runsExtra;
      currentPshipRuns += event.runsExtra;
    } else if (event.extraType === 'legbye') {
      extras.legbyes += event.runsExtra;
      extras.total += event.runsExtra;
      currentPshipRuns += event.runsExtra;
    } else if (event.extraType === 'penalty') {
      extras.penalties += event.runsExtra;
      extras.total += event.runsExtra;
      currentPshipRuns += event.runsExtra;
    }

    bowler.runsConceded += bowlerChargedRuns;

    // 2. Over Summary Tracking
    if (currentOverSummary.overIndex !== event.overIndex || currentOverSummary.bowler !== event.bowler) {
      if (currentOverSummary.balls.length > 0) {
        overs.push(currentOverSummary);
      }
      currentOverSummary = {
        overIndex: event.overIndex,
        bowler: event.bowler,
        balls: [],
        runs: 0,
        wickets: 0,
        isMaiden: false,
        displayLog: []
      };
    }

    currentOverSummary.balls.push(event);
    currentOverSummary.runs += ballTotalRuns;
    currentOverSummary.displayLog.push(formatDeliveryNotation(event));

    // 3. Wicket Accounting
    if (event.wicket) {
      totalWickets++;
      currentOverSummary.wickets++;

      const dismissedName = event.wicket.dismissedPlayer;
      const dismissed = ensureBatsman(dismissedName);
      dismissed.isOut = true;
      dismissed.isActive = false;
      dismissed.dismissalText = formatDismissalText(event.wicket.kind, event.bowler, event.wicket.fielder);

      if (isBowlerWicket(event.wicket.kind)) {
        bowler.wickets++;
      }

      // Record Fall of Wickets
      fallOfWickets.push({
        wicket: totalWickets,
        score: totalScore,
        batsman: dismissedName,
        overs: formatOvers(legalBalls),
        partnershipRuns: currentPshipRuns
      });

      // Conclude active partnership
      partnerships.push({
        wicketNumber: pshipWicketNum,
        player1Name: currentPshipP1,
        player1Runs: currentPshipP1Runs,
        player1Balls: currentPshipP1Balls,
        player2Name: currentPshipP2,
        player2Runs: currentPshipP2Runs,
        player2Balls: currentPshipP2Balls,
        totalRuns: currentPshipRuns,
        totalBalls: currentPshipBalls,
        unbroken: false
      });

      // Start next partnership
      pshipWicketNum++;
      currentPshipRuns = 0;
      currentPshipBalls = 0;
      currentPshipP1 = dismissedName === currentPshipP1 ? '' : currentPshipP1;
      currentPshipP2 = dismissedName === currentPshipP2 ? '' : currentPshipP2;
      currentPshipP1Runs = 0;
      currentPshipP1Balls = 0;
      currentPshipP2Runs = 0;
      currentPshipP2Balls = 0;
    }

    // 4. Maiden Over Check on Over Completion
    if (event.overCompleted) {
      // An over is a maiden if 6 legal balls were bowled with 0 bowler runs conceded
      const overLegalBalls = currentOverSummary.balls.filter(b => b.isLegalDelivery);
      const overBowlerRuns = currentOverSummary.balls.reduce((sum, b) => {
        let bRuns = b.runsBat;
        if (b.extraType === 'wide') bRuns += b.runsExtra;
        if (b.extraType === 'noball') bRuns += 1;
        return sum + bRuns;
      }, 0);

      if (overLegalBalls.length >= 6 && overBowlerRuns === 0) {
        currentOverSummary.isMaiden = true;
        bowler.maidens++;
      }
    }
  }

  // Push current incomplete/final over to history
  if (currentOverSummary.balls.length > 0) {
    overs.push(currentOverSummary);
  }

  // Finalize Active Partnership
  let currentPartnership: Partnership | null = null;
  if (activeStriker && activeNonStriker) {
    currentPartnership = {
      wicketNumber: pshipWicketNum,
      player1Name: currentPshipP1 || activeStriker,
      player1Runs: currentPshipP1Runs,
      player1Balls: currentPshipP1Balls,
      player2Name: currentPshipP2 || activeNonStriker,
      player2Runs: currentPshipP2Runs,
      player2Balls: currentPshipP2Balls,
      totalRuns: currentPshipRuns,
      totalBalls: currentPshipBalls,
      unbroken: true
    };
  }

  // Compute final batsman & bowler rates
  const batsmenList: BatsmanProjection[] = Object.values(batsmenMap).map(b => {
    b.strikeRate = calculateStrikeRate(b.runs, b.balls);
    b.boundaryPercent = b.runs > 0 ? Math.round(((b.fours * 4 + b.sixes * 6) / b.runs) * 1000) / 10 : 0;
    b.isStriker = (b.name === activeStriker);
    return b;
  });

  const bowlersList: BowlerProjection[] = Object.values(bowlersMap).map(b => {
    b.oversFormatted = formatOvers(b.balls);
    b.economy = calculateEconomy(b.runsConceded, b.balls);
    b.dotPercent = b.balls > 0 ? Math.round((b.dots / b.balls) * 1000) / 10 : 0;
    return b;
  });

  const runRate = calculateRunRate(totalScore, legalBalls);
  const maxBalls = oversPerInnings * 6;
  const ballsRemaining = Math.max(0, maxBalls - legalBalls);

  let requiredRunRate: number | null = null;
  let equation = '';
  let isCompleted = false;
  let completionReason: 'ALL_OUT' | 'OVERS_EXHAUSTED' | 'TARGET_REACHED' | 'DECLARED' | undefined;

  if (target !== null) {
    const runsNeeded = target - totalScore;
    if (runsNeeded <= 0) {
      isCompleted = true;
      completionReason = 'TARGET_REACHED';
      equation = `${battingTeamName} won the match!`;
    } else if (ballsRemaining <= 0) {
      isCompleted = true;
      completionReason = 'OVERS_EXHAUSTED';
      equation = `${bowlingTeamName} won by ${runsNeeded - 1} runs`;
    } else {
      requiredRunRate = Math.round(((runsNeeded / ballsRemaining) * 6) * 100) / 100;
      equation = `Need ${runsNeeded} runs from ${ballsRemaining} balls (RRR: ${requiredRunRate.toFixed(2)})`;
    }
  } else {
    if (legalBalls >= maxBalls) {
      isCompleted = true;
      completionReason = 'OVERS_EXHAUSTED';
      equation = `Innings completed. Target: ${totalScore + 1}`;
    } else {
      equation = `Current Run Rate: ${runRate.toFixed(2)}`;
    }
  }

  // Projected scores at current run rate
  const crr = runRate;
  const projectedTotal = isCompleted
    ? totalScore
    : (legalBalls > 0 ? Math.round(crr * oversPerInnings) : 0);

  const projectedScores = {
    currentCRR: crr,
    totalOvers: projectedTotal,
    at6Overs: Math.round(crr * 6),
    at8Overs: Math.round(crr * 8),
    at10Overs: Math.round(crr * 10),
    at20Overs: Math.round(crr * 20)
  };

  return {
    inningsNumber,
    battingTeamName,
    bowlingTeamName,
    totalScore,
    totalWickets,
    legalBalls,
    oversFormatted: formatOvers(legalBalls),
    oversPerInnings,
    runRate,
    requiredRunRate,
    target,
    equation,
    isCompleted,
    completionReason,
    batsmen: batsmenMap,
    batsmenList,
    bowlers: bowlersMap,
    bowlersList,
    partnerships,
    currentPartnership,
    fallOfWickets,
    overs,
    currentOver: currentOverSummary,
    extras,
    activeStriker,
    activeNonStriker,
    activeBowler,
    projectedScores,
    // Derived by the bridge from the legacy over log, which records who bowled
    // each over and is the only place the innings bowling figures are held.
    // Null rather than empty: an empty list is an all-clear this function is
    // not in a position to give.
    consecutiveOverBreaches: null
  };
}

/**
 * Generate Worm chart coordinates comparing Innings 1 and Innings 2 ball-by-ball score curves.
 */
export function generateWormCoordinates(
  innings1Events: DeliveryEvent[],
  innings2Events: DeliveryEvent[],
  oversPerInnings: number
): WormChartData {
  const maxBalls = oversPerInnings * 6;
  let maxScore = 50;

  function buildCurve(events: DeliveryEvent[]): WormDataPoint[] {
    const points: WormDataPoint[] = [{
      ballIndex: 0,
      oversFormatted: '0.0',
      score: 0,
      wickets: 0,
      isWicket: false
    }];

    let score = 0;
    let wickets = 0;
    let legalBall = 0;

    for (const event of events) {
      score += (event.runsBat + event.runsExtra);
      if (event.wicket) wickets++;

      if (event.isLegalDelivery) {
        legalBall++;
        points.push({
          ballIndex: legalBall,
          oversFormatted: formatOvers(legalBall),
          score,
          wickets,
          isWicket: !!event.wicket,
          batsmanOut: event.wicket?.dismissedPlayer
        });
      } else {
        // Update the last point for extras on wide/noball
        if (points.length > 0) {
          const last = points[points.length - 1];
          last.score = score;
          last.wickets = wickets;
          if (event.wicket) {
            last.isWicket = true;
            last.batsmanOut = event.wicket.dismissedPlayer;
          }
        }
      }

      if (score > maxScore) maxScore = score;
    }

    return points;
  }

  const inngs1 = buildCurve(innings1Events);
  const inngs2 = buildCurve(innings2Events);

  return {
    innings1: inngs1,
    innings2: inngs2,
    maxBalls,
    maxScore: Math.ceil(maxScore / 20) * 20 + 10
  };
}

/**
 * Generate Manhattan bar chart data for an innings.
 */
export function generateManhattanData(events: DeliveryEvent[], oversPerInnings: number): ManhattanBar[] {
  const bars: ManhattanBar[] = [];
  const oversMap: Record<number, { runs: number; wickets: number; bowler: string }> = {};

  for (let i = 0; i < oversPerInnings; i++) {
    oversMap[i] = { runs: 0, wickets: 0, bowler: '' };
  }

  for (const event of events) {
    const idx = event.overIndex;
    if (!oversMap[idx]) {
      oversMap[idx] = { runs: 0, wickets: 0, bowler: event.bowler };
    }
    oversMap[idx].runs += (event.runsBat + event.runsExtra);
    if (event.wicket) oversMap[idx].wickets++;
    if (!oversMap[idx].bowler) oversMap[idx].bowler = event.bowler;
  }

  for (let i = 0; i < oversPerInnings; i++) {
    const data = oversMap[i];
    if (data) {
      bars.push({
        overNumber: i + 1,
        runs: data.runs,
        wickets: data.wickets,
        bowler: data.bowler
      });
    }
  }

  return bars;
}
