/**
 * Cricket Scorecard PWA v2 - Architecture Bridge & State Projection Adapter
 * Translates between GameState models and v2 DeliveryEvent streams and statistical projections.
 */

import { GameState, LiveInnings } from '../types.js';
import {
  DeliveryEvent,
  InningsProjection,
  WormChartData,
  ManhattanBar,
  Partnership,
  MatchV2State,
  DismissalKind
} from './types.js';
import { projectInnings, generateWormCoordinates, generateManhattanData } from './stats.js';

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

  let activeStriker = innings.currentBatsman1 || battingTeamPlayers[0] || 'Batter 1';
  let activeNonStriker = innings.currentBatsman2 || battingTeamPlayers[1] || 'Batter 2';

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

      if (norm === 'W' || norm.startsWith('W(')) {
        isLegal = true;
        legalBallInOver++;
        wicket = {
          kind: norm.includes('ro') ? 'runout' : 'bowled',
          dismissedPlayer: activeStriker,
          runsCompletedBeforeDismissal: 0
        };
      } else if (norm.includes('wd')) {
        isLegal = false;
        extraType = 'wide';
        const count = parseInt(norm.replace('wd', ''), 10);
        runsExtra = isNaN(count) ? 1 : count;
      } else if (norm.includes('nb')) {
        isLegal = false;
        extraType = 'noball';
        const count = parseInt(norm.replace('nb', ''), 10);
        if (!isNaN(count)) {
          runsBat = count;
          runsExtra = 1;
        } else {
          runsExtra = 1;
        }
      } else if (norm.includes('lb')) {
        isLegal = true;
        legalBallInOver++;
        extraType = 'legbye';
        const count = parseInt(norm.replace('lb', ''), 10);
        runsExtra = isNaN(count) ? 1 : count;
        if (runsExtra % 2 !== 0) strikeRotated = true;
      } else if (norm.includes('b') && !norm.includes('lb')) {
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
  // If team1 has an archived innings, team1 batted first.
  // If team2 has an archived innings, team2 batted first.
  // Otherwise if currentInnings is 1, currentBattingTeam batted first.
  // If currentInnings is 2, the team not currently batting batted first.
  let t1BattedFirst = true;
  if ((match.team1?.innings?.length || 0) > 0) {
    t1BattedFirst = true;
  } else if ((match.team2?.innings?.length || 0) > 0) {
    t1BattedFirst = false;
  } else if (match.currentInnings === 1) {
    t1BattedFirst = match.currentBattingTeam === 1;
  } else if (match.currentInnings === 2) {
    t1BattedFirst = match.currentBattingTeam !== 1;
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

  let inngs2Proj: InningsProjection | null = null;
  let events2: DeliveryEvent[] = [];

  if (match.currentInnings === 2 || match.matchOver) {
    const batting2Team = t1BattedFirst ? match.team2 : match.team1;
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
