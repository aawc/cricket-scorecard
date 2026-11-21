/**
 * Cricket Scorecard PWA v2 - Architecture Bridge & State Projection Adapter
 * Translates between GameState models and v2 DeliveryEvent streams and statistical projections.
 */

import { GameState, LiveInnings } from '../types.js';
import {
  DeliveryEvent,
  InningsProjection,
  BatsmanProjection,
  BowlerProjection,
  WormChartData,
  ManhattanBar,
  Partnership,
  MatchV2State,
  DismissalKind
} from './types.js';
import {
  projectInnings,
  generateWormCoordinates,
  generateManhattanData,
  formatOvers,
  calculateRunRate,
  calculateStrikeRate,
  calculateEconomy
} from './stats.js';
import { findConsecutiveOverBreaches, parseSyntheticDeliveryToken, hasOwn } from '../rules.js';

/**
 * Synthesize DeliveryEvents from a v1 LiveInnings structure and its over history
 */
export function synthesizeEventsFromLiveInnings(
  innings: LiveInnings,
  inningsNumber: 1 | 2,
  battingTeamPlayers: string[]
): DeliveryEvent[] {
  const events: DeliveryEvent[] = [];
  if (!innings) return events;

  let eventCounter = 1;
  const allOvers = [...(innings.overs || [])];
  
  // Also include active current over if balls exist
  if (innings.overLog && innings.overLog.length > 0) {
    allOvers.push({
      bowler: innings.currentBowler || 'Bowler',
      balls: [...innings.overLog]
    });
  }

  const fowList = innings.fow || (innings as any).fw || (innings as any).fallOfWickets || [];
  let wicketIdx = 0;

  const usedBatsmen = new Set<string>();
  let activeStriker = innings.currentBatsman1 || battingTeamPlayers[0] || 'Batter 1';
  // Fall back to the first team-mate who is not already the striker. Indexing
  // blindly at [1] duplicates the striker whenever slot 1 holds that same player.
  let activeNonStriker = innings.currentBatsman2 || battingTeamPlayers.find(p => p !== activeStriker) || '';
  
  if (activeStriker) usedBatsmen.add(activeStriker);
  if (activeNonStriker) usedBatsmen.add(activeNonStriker);

  allOvers.forEach((overRecord, overIdx) => {
    let legalBallInOver = 0;
    const bowler = overRecord.bowler || innings.currentBowler || 'Bowler';

    overRecord.balls.forEach((ballNotation) => {
      let runsBat = 0;
      let runsExtra = 0;
      let extraType: DeliveryEvent['extraType'] = undefined;
      let isLegal = true;
      let wicket: DeliveryEvent['wicket'] = undefined;
      let strikeRotated = false;

      const norm = ballNotation.trim();
      const syn = parseSyntheticDeliveryToken(norm);

      // Run-out tokens emitted by executeRunOutWicket in src/reducer.ts:
      //   'W-RO'      => run out, no runs completed
      //   '{N}+W-RO'  => N runs completed and credited to the striker
      //   '{N}b+W-RO' => N runs completed and recorded as byes
      // The delivery is legal and counts towards the over in every case.
      const isRunOut = norm === 'W-RO' || norm.endsWith('+W-RO');

      if (syn) {
        isLegal = syn.isLegal;
        if (syn.isLegal) {
          legalBallInOver++;
          runsBat = syn.runs;
          if (syn.runs % 2 !== 0) strikeRotated = true;
        } else {
          if (syn.runs > 0) {
            extraType = 'bye';
            runsExtra = syn.runs;
          }
        }
        if (syn.isWicket) {
          const fowRecord = fowList[wicketIdx];
          const dismissedPlayer =
            fowRecord?.batsman ||
            fowRecord?.b ||
            innings.outBatsmen?.[wicketIdx] ||
            `Wicket ${wicketIdx + 1}`;
          wicketIdx++;
          wicket = {
            kind: 'bowled',
            dismissedPlayer,
            runsCompletedBeforeDismissal: syn.isLegal ? syn.runs : 0
          };
        }
      } else if (norm === 'W' || norm.startsWith('W(') || isRunOut) {
        isLegal = true;
        legalBallInOver++;
        const fowRecord = fowList[wicketIdx];
        const dismissedPlayer = fowRecord?.batsman || fowRecord?.b || activeStriker;
        wicketIdx++;

        let completedRuns = 0;
        if (isRunOut && norm !== 'W-RO') {
          // Validate rather than slice blindly, and surface anomalies instead of
          // silently degrading to 'bye with 0 runs'.
          const parsedRunOut = norm.match(/^(\d+)(b?)\+W-RO$/);
          if (!parsedRunOut) {
            console.warn('[bridge] Unparseable run-out token; treating as 0 completed runs:', norm);
          } else {
            completedRuns = parseInt(parsedRunOut[1], 10);
            if (parsedRunOut[2] === 'b') {
              extraType = 'bye';
              runsExtra = completedRuns;
            } else {
              runsBat = completedRuns;
            }
            // Runs physically completed before the dismissal rotate the strike.
            if (completedRuns % 2 !== 0) strikeRotated = true;
          }
        }

        wicket = {
          // Only the '-RO' suffix denotes a run out. A bare substring probe for
          // 'ro' would match any fielder or bowler name inside a 'W(...)' token
          // (Root, Rohit, Rossouw), misclassifying a genuine bowled or caught
          // dismissal as a run out and denying the bowler a wicket he earned.
          // 'runout' is excluded from isBowlerWicket(), so credit is withheld.
          kind: isRunOut ? 'runout' : 'bowled',
          dismissedPlayer,
          runsCompletedBeforeDismissal: completedRuns
        };
      } else if (norm.startsWith('wd') || norm.startsWith('nb')) {
        // Legacy notation grammar emitted by the FINALIZE_DELIVERY reducer branch:
        //   'wd'    => 1 wide penalty run
        //   'wd+N'  => 1 wide penalty run + N runs credited to the striker
        //   'wd+Nb' => 1 wide penalty run + N byes
        //   'nb'    => 1 no-ball penalty run
        //   'nb+N'  => 1 no-ball penalty run + N runs credited to the striker
        //   'nb+Nb' => 1 no-ball penalty run + N byes
        // The trailing 'b' marks the additional runs as byes rather than bat runs.
        isLegal = false;
        extraType = norm.startsWith('wd') ? 'wide' : 'noball';

        const suffix = norm.slice(2);
        const parsedSuffix = suffix.match(/^\+(\d+)(b?)$/);
        const additionalRuns = parsedSuffix ? parseInt(parsedSuffix[1], 10) : 0;
        const accruedToByes = !!parsedSuffix && parsedSuffix[2] === 'b';

        // The penalty run is always an extra. Additional runs are either byes
        // (kept in runsExtra so the bowler is still charged) or bat runs.
        // NOTE: assumes settings.widePenalty === settings.noBallPenalty === 1,
        // the only values the app produces today. synthesizeEventsFromLiveInnings
        // does not receive settings; if either penalty becomes configurable this
        // parser and projectInnings() must read them, as reducer.ts L204/L222 do.
        const PENALTY_RUN = 1;
        runsExtra = PENALTY_RUN + (accruedToByes ? additionalRuns : 0);
        runsBat = accruedToByes ? 0 : additionalRuns;

        // Only physically-run runs rotate the strike (mirrors `physicalRuns` in reducer.ts).
        if (additionalRuns % 2 !== 0) strikeRotated = true;
      } else if (norm.includes('lb')) {
        isLegal = true;
        legalBallInOver++;
        extraType = 'legbye';
        const count = parseInt(norm.replace('lb', ''), 10);
        runsExtra = isNaN(count) ? 1 : count;
        if (runsExtra % 2 !== 0) strikeRotated = true;
      } else if (norm.includes('b')) {
        // Ordering is load-bearing: the 'lb' branch above has already consumed
        // every leg-bye token, so no additional guard is needed here.
        isLegal = true;
        legalBallInOver++;
        extraType = 'bye';
        const count = parseInt(norm.replace('b', ''), 10);
        runsExtra = isNaN(count) ? 1 : count;
        if (runsExtra % 2 !== 0) strikeRotated = true;
      } else {
        const r = parseInt(norm, 10);
        if (!isNaN(r)) {
          isLegal = true;
          legalBallInOver++;
          runsBat = r;
          if (r % 2 !== 0) strikeRotated = true;
        }
      }

      const overCompleted = (isLegal && legalBallInOver === 6);

      events.push({
        id: `e_${inningsNumber}_${overIdx}_${eventCounter++}`,
        timestamp: Date.now() - (1000 * (allOvers.length * 6 - eventCounter)),
        inningsNumber,
        overIndex: overIdx,
        ballInOver: legalBallInOver,
        striker: activeStriker,
        nonStriker: activeNonStriker,
        bowler,
        runsBat,
        runsExtra,
        extraType,
        isLegalDelivery: isLegal,
        wicket,
        strikeRotated,
        overCompleted
      });

      // Handle wicket batsman transitions
      if (wicket) {
        const dismissed = wicket.dismissedPlayer;
        const nextBatsman = battingTeamPlayers.find(p => !usedBatsmen.has(p));
        if (nextBatsman) {
          usedBatsmen.add(nextBatsman);
          if (dismissed === activeStriker) {
            activeStriker = nextBatsman;
          } else if (dismissed === activeNonStriker) {
            activeNonStriker = nextBatsman;
          } else {
            activeStriker = nextBatsman;
          }
        } else {
          // No remaining batsmen (single batsman mode or all out)
          if (dismissed === activeStriker) {
            activeStriker = activeNonStriker;
            activeNonStriker = '';
          } else if (dismissed === activeNonStriker) {
            activeNonStriker = '';
          }
        }
      }

      if (strikeRotated) {
        const temp = activeStriker;
        activeStriker = activeNonStriker;
        activeNonStriker = temp;
      }
      if (overCompleted) {
        const temp = activeStriker;
        activeStriker = activeNonStriker;
        activeNonStriker = temp;
      }
    });
  });

  return events;
}

/**
 * Project full statistics and visual analytics from a GameState
 */
export function getProjectionsFromGameState(state: GameState): {
  innings1: InningsProjection;
  innings2: InningsProjection | null;
  events1: DeliveryEvent[];
  events2: DeliveryEvent[];
  wormData: WormChartData;
  manhattan1: ManhattanBar[];
  manhattan2: ManhattanBar[];
} {
  const oversLimit = state.settings?.oversPerInnings || 8;
  const match = state.match;

  // Determine which team batted first:
  // If team1 has an archived innings and team2 does not, team1 batted first.
  // If team2 has an archived innings and team1 does not, team2 batted first.
  // When both teams have archived innings (match completed) or neither does:
  // In innings 1, currentBattingTeam batted first.
  // In innings 2, if currentBattingTeam === 2, team 1 batted first (team 2 is chasing).
  let t1BattedFirst = true;
  const t1Inngs = match.team1?.innings?.length || 0;
  const t2Inngs = match.team2?.innings?.length || 0;
  if (t1Inngs > 0 && t2Inngs === 0) {
    t1BattedFirst = true;
  } else if (t2Inngs > 0 && t1Inngs === 0) {
    t1BattedFirst = false;
  } else if (match.currentInnings === 1) {
    t1BattedFirst = match.currentBattingTeam === 1;
  } else if (match.currentInnings === 2) {
    t1BattedFirst = match.currentBattingTeam === 2;
  }

  const batting1Team = t1BattedFirst ? match.team1 : match.team2;
  const bowling1Team = t1BattedFirst ? match.team2 : match.team1;

  const inngs1Live = match.currentInnings === 1 ? match.liveInnings : (batting1Team.innings?.[0] || match.liveInnings);
  const events1 = synthesizeEventsFromLiveInnings(inngs1Live, 1, batting1Team.players || []);

  const inngs1Proj = projectInnings(
    events1,
    batting1Team.name || 'Team 1',
    bowling1Team.name || 'Team 2',
    1,
    oversLimit,
    null,
    inngs1Live.currentBatsman1,
    inngs1Live.currentBatsman2,
    inngs1Live.currentBowler
  );
  const inngs1ForceCompleted =
    match.currentInnings === 2 ||
    state.phase === 'INNINGS_BREAK' ||
    match.matchOver ||
    state.phase === 'MATCH_OVER';

  if (inningsNeedsReconciliation(inngs1Proj, inngs1Live)) {
    reconcileProjectionWithLiveInnings(inngs1Proj, inngs1Live, oversLimit, null, inngs1ForceCompleted);
  }
  inngs1Proj.consecutiveOverBreaches = findConsecutiveOverBreaches(
    inngs1Live.overs || [],
    Object.keys(inngs1Live.bowlers || {})
  );

  let inngs2Proj: InningsProjection | null = null;
  let events2: DeliveryEvent[] = [];

  const batting2Team = t1BattedFirst ? match.team2 : match.team1;
  const hasSecondInnings = match.currentInnings === 2 || (match.matchOver && (batting2Team.innings?.length || 0) > 0);

  if (hasSecondInnings) {
    const bowling2Team = t1BattedFirst ? match.team1 : match.team2;
    const inngs2Live = match.currentInnings === 2 ? match.liveInnings : (batting2Team.innings?.[0] || match.liveInnings);
    events2 = synthesizeEventsFromLiveInnings(inngs2Live, 2, batting2Team.players || []);

    inngs2Proj = projectInnings(
      events2,
      batting2Team.name || 'Team 2',
      bowling2Team.name || 'Team 1',
      2,
      oversLimit,
      match.target || null,
      inngs2Live.currentBatsman1,
      inngs2Live.currentBatsman2,
      inngs2Live.currentBowler
    );
    const inngs2ForceCompleted = Boolean(match.matchOver || state.phase === 'MATCH_OVER');
    if (inningsNeedsReconciliation(inngs2Proj, inngs2Live)) {
      reconcileProjectionWithLiveInnings(inngs2Proj, inngs2Live, oversLimit, match.target || null, inngs2ForceCompleted);
    }
    inngs2Proj.consecutiveOverBreaches = findConsecutiveOverBreaches(
      inngs2Live.overs || [],
      Object.keys(inngs2Live.bowlers || {})
    );
  }

  const wormData = generateWormCoordinates(events1, events2, oversLimit);
  const manhattan1 = generateManhattanData(events1, oversLimit);
  const manhattan2 = generateManhattanData(events2, oversLimit);

  return {
    innings1: inngs1Proj,
    innings2: inngs2Proj,
    events1,
    events2,
    wormData,
    manhattan1,
    manhattan2
  };
}

function inningsHasSyntheticDeliveries(innings: LiveInnings | null | undefined): boolean {
  if (!innings) return false;
  if ((innings.overLog || []).some(b => typeof b === 'string' && b.trim().startsWith('~'))) {
    return true;
  }
  for (const ov of innings.overs || []) {
    if (ov.bowler === 'Adjusted') return true;
    if ((ov.balls || []).some(b => typeof b === 'string' && b.trim().startsWith('~'))) {
      return true;
    }
  }
  return false;
}

function inningsNeedsReconciliation(proj: InningsProjection, live: LiveInnings | null | undefined): boolean {
  if (!live) return false;
  if (inningsHasSyntheticDeliveries(live)) return true;
  if (proj.totalScore !== live.score || proj.totalWickets !== live.wickets || proj.legalBalls !== live.balls) {
    return true;
  }
  const ex = live.extras || { wides: 0, noballs: 0, byes: 0, legbyes: 0 };
  if (
    proj.extras.wides !== (ex.wides || 0) ||
    proj.extras.noballs !== (ex.noballs || 0) ||
    proj.extras.byes !== (ex.byes || 0) ||
    proj.extras.legbyes !== (ex.legbyes || 0)
  ) {
    return true;
  }
  if ((live.fow?.length || 0) !== proj.fallOfWickets.length) {
    return true;
  }
  for (const [bName, bStats] of Object.entries(live.batsmen || {})) {
    const p = hasOwn(proj.batsmen, bName) ? proj.batsmen[bName] : undefined;
    if (
      !p ||
      p.runs !== bStats.runs ||
      p.balls !== bStats.balls ||
      p.fours !== (bStats.fours || 0) ||
      p.sixes !== (bStats.sixes || 0)
    ) {
      return true;
    }
  }
  for (const [bwName, bwStats] of Object.entries(live.bowlers || {})) {
    const p = hasOwn(proj.bowlers, bwName) ? proj.bowlers[bwName] : undefined;
    if (
      !p ||
      p.runsConceded !== bwStats.runs ||
      p.balls !== bwStats.balls ||
      p.wickets !== bwStats.wickets ||
      p.maidens !== (bwStats.maidens || 0) ||
      p.wides !== (bwStats.wides || 0) ||
      p.noballs !== (bwStats.noballs || 0)
    ) {
      return true;
    }
  }
  return false;
}

function reconcileProjectionWithLiveInnings(
  proj: InningsProjection,
  live: LiveInnings,
  oversPerInnings: number,
  target: number | null,
  forceCompleted = false
): void {
  const hasSynthetic = inningsHasSyntheticDeliveries(live);
  proj.totalScore = live.score;
  proj.totalWickets = live.wickets;
  proj.legalBalls = live.balls;
  proj.oversFormatted = formatOvers(live.balls);
  proj.runRate = calculateRunRate(live.score, live.balls);

  const ex = live.extras || { wides: 0, noballs: 0, byes: 0, legbyes: 0 };
  proj.extras = {
    wides: ex.wides || 0,
    noballs: ex.noballs || 0,
    byes: ex.byes || 0,
    legbyes: ex.legbyes || 0,
    penalties: 0,
    total: (ex.wides || 0) + (ex.noballs || 0) + (ex.byes || 0) + (ex.legbyes || 0)
  };

  const outSet = new Set(live.outBatsmen || []);
  const fowDismissedSet = new Set((live.fow || []).map(f => f?.batsman).filter(Boolean));
  const reconciledBatsmenMap: Record<string, BatsmanProjection> = {};
  const reconciledBatsmenList: BatsmanProjection[] = [];

  let resolvedStriker: string | null = null;
  let resolvedNonStriker: string | null = null;
  if (live.currentBatsman1 && live.currentBatsman2) {
    if (
      hasOwn(live.batsmen, live.currentBatsman2) &&
      live.batsmen[live.currentBatsman2]?.active &&
      !(hasOwn(live.batsmen, live.currentBatsman1) && live.batsmen[live.currentBatsman1]?.active)
    ) {
      resolvedStriker = live.currentBatsman2;
      resolvedNonStriker = live.currentBatsman1;
    } else {
      resolvedStriker = live.currentBatsman1;
      resolvedNonStriker = live.currentBatsman2;
    }
  } else if (live.currentBatsman1) {
    resolvedStriker = live.currentBatsman1;
  } else if (live.currentBatsman2) {
    resolvedStriker = live.currentBatsman2;
  }
  proj.activeStriker = resolvedStriker;
  proj.activeNonStriker = resolvedNonStriker;
  proj.activeBowler = live.currentBowler || null;

  for (const [bName, bStats] of Object.entries(live.batsmen || {})) {
    const existing = hasOwn(proj.batsmen, bName) ? proj.batsmen[bName] : undefined;
    const fours = bStats.fours || 0;
    const sixes = bStats.sixes || 0;
    const isOut = outSet.has(bName) || fowDismissedSet.has(bName);
    const isAtCrease = (bName === live.currentBatsman1 || bName === live.currentBatsman2) && !isOut;
    let dismissalText = 'not out';
    if (isOut) {
      const candidateText = existing && existing.dismissalText !== 'not out' ? existing.dismissalText : 'out';
      dismissalText = /\bb (?:Adjusted|Unknown|Bowler)$/.test(candidateText) ? 'out' : candidateText;
    }
    const entry: BatsmanProjection = {
      name: bName,
      runs: bStats.runs,
      balls: bStats.balls,
      fours,
      sixes,
      dots: existing ? existing.dots : 0,
      strikeRate: calculateStrikeRate(bStats.runs, bStats.balls),
      boundaryPercent: bStats.runs > 0 ? Math.round(((fours * 4 + sixes * 6) / bStats.runs) * 1000) / 10 : 0,
      isOut,
      dismissalText,
      isActive: isAtCrease,
      isStriker: isAtCrease && !!bStats.active
    };
    reconciledBatsmenMap[bName] = entry;
    reconciledBatsmenList.push(entry);
  }
  if (Object.keys(live.batsmen || {}).length > 0 || hasSynthetic) {
    proj.batsmen = reconciledBatsmenMap;
    proj.batsmenList = reconciledBatsmenList;
  }

  const reconciledBowlersMap: Record<string, BowlerProjection> = {};
  const reconciledBowlersList: BowlerProjection[] = [];
  for (const [bwName, bwStats] of Object.entries(live.bowlers || {})) {
    const existing = hasOwn(proj.bowlers, bwName) ? proj.bowlers[bwName] : undefined;
    const dots = existing ? Math.min(existing.dots, bwStats.balls) : 0;
    const entry: BowlerProjection = {
      name: bwName,
      balls: bwStats.balls,
      oversFormatted: formatOvers(bwStats.balls),
      maidens: bwStats.maidens || 0,
      runsConceded: bwStats.runs,
      wickets: bwStats.wickets,
      economy: calculateEconomy(bwStats.runs, bwStats.balls),
      wides: bwStats.wides || 0,
      noballs: bwStats.noballs || 0,
      dots,
      dotPercent: bwStats.balls > 0 ? Math.round((dots / bwStats.balls) * 1000) / 10 : 0
    };
    reconciledBowlersMap[bwName] = entry;
    reconciledBowlersList.push(entry);
  }
  if (Object.keys(live.bowlers || {}).length > 0 || hasSynthetic) {
    proj.bowlers = reconciledBowlersMap;
    proj.bowlersList = reconciledBowlersList;
  }

  for (const ov of proj.overs) {
    if (ov.bowler === 'Adjusted') {
      ov.isMaiden = false;
    }
  }
  const rawOvers = [...(live.overs || [])];
  if (live.overLog && live.overLog.length > 0) {
    rawOvers.push({ bowler: live.currentBowler || 'Bowler', balls: [...live.overLog] });
  }
  for (let i = 0; i < proj.overs.length; i++) {
    const srcOver = rawOvers[proj.overs[i].overIndex];
    if (srcOver && (srcOver.balls || []).some(b => typeof b === 'string' && b.trim().startsWith('~'))) {
      proj.overs[i].isMaiden = false;
    }
  }

  if (live.fow && live.fow.length > 0) {
    proj.fallOfWickets = live.fow.map((f, idx) => ({
      wicket: f.wicket,
      score: f.score,
      batsman: f.batsman,
      overs: f.overs,
      partnershipRuns: idx === 0 ? f.score : Math.max(0, f.score - live.fow![idx - 1].score)
    }));
  } else if (hasSynthetic) {
    proj.fallOfWickets = [];
  }

  if (hasSynthetic) {
    let genuineWicketsBeforeSynthetic = 0;
    outer: for (const ov of rawOvers) {
      if (ov.bowler === 'Adjusted' && (!ov.balls || ov.balls.length === 0)) break;
      for (const rawBall of ov.balls || []) {
        const trimmed = typeof rawBall === 'string' ? rawBall.trim() : '';
        if (!trimmed) continue;
        if (parseSyntheticDeliveryToken(trimmed) || trimmed.startsWith('~')) {
          break outer;
        }
        if (trimmed === 'W' || trimmed.startsWith('W(') || trimmed === 'W-RO' || trimmed.endsWith('+W-RO')) {
          genuineWicketsBeforeSynthetic++;
        }
      }
    }
    proj.partnerships = proj.partnerships.slice(0, genuineWicketsBeforeSynthetic);

    if (!resolvedStriker || !resolvedNonStriker || live.wickets > 0) {
      proj.currentPartnership = null;
    } else {
      const p1Name = live.currentBatsman1 || resolvedStriker;
      const p2Name = live.currentBatsman2 || resolvedNonStriker;
      const p1Stats = hasOwn(live.batsmen, p1Name) ? live.batsmen[p1Name] : undefined;
      const p2Stats = hasOwn(live.batsmen, p2Name) ? live.batsmen[p2Name] : undefined;
      proj.currentPartnership = {
        wicketNumber: 1,
        player1Name: p1Name,
        player1Runs: p1Stats ? p1Stats.runs : 0,
        player1Balls: p1Stats ? p1Stats.balls : 0,
        player2Name: p2Name,
        player2Runs: p2Stats ? p2Stats.runs : 0,
        player2Balls: p2Stats ? p2Stats.balls : 0,
        totalRuns: live.score,
        totalBalls: live.balls,
        unbroken: true
      };
    }
  }

  const maxBalls = oversPerInnings * 6;
  const ballsRemaining = Math.max(0, maxBalls - live.balls);
  proj.target = target;
  proj.requiredRunRate = null;
  proj.isCompleted = false;
  proj.completionReason = undefined;

  if (target !== null) {
    const runsNeeded = target - live.score;
    if (runsNeeded <= 0) {
      proj.isCompleted = true;
      proj.completionReason = 'TARGET_REACHED';
      proj.equation = `${proj.battingTeamName} won the match!`;
    } else if (ballsRemaining <= 0 || forceCompleted) {
      proj.isCompleted = true;
      proj.completionReason = ballsRemaining <= 0 ? 'OVERS_EXHAUSTED' : 'ALL_OUT';
      proj.equation = runsNeeded === 1
        ? 'Match Tied!'
        : `${proj.bowlingTeamName} won by ${runsNeeded - 1} runs`;
    } else {
      proj.requiredRunRate = Math.round(((runsNeeded / ballsRemaining) * 6) * 100) / 100;
      proj.equation = `Need ${runsNeeded} runs from ${ballsRemaining} balls (RRR: ${proj.requiredRunRate.toFixed(2)})`;
    }
  } else {
    if (live.balls >= maxBalls || forceCompleted) {
      proj.isCompleted = true;
      proj.completionReason = live.balls >= maxBalls ? 'OVERS_EXHAUSTED' : 'DECLARED';
      proj.equation = `Innings completed. Target: ${live.score + 1}`;
    } else {
      proj.equation = `Current Run Rate: ${proj.runRate.toFixed(2)}`;
    }
  }

  const crr = proj.runRate;
  proj.projectedScores = {
    currentCRR: crr,
    totalOvers: proj.isCompleted ? live.score : (live.balls > 0 ? Math.round(crr * oversPerInnings) : 0),
    at6Overs: Math.round(crr * 6),
    at8Overs: Math.round(crr * 8),
    at10Overs: Math.round(crr * 10),
    at20Overs: Math.round(crr * 20)
  };
}
