import { GameState, Action, LiveInnings, Team, MatchPhase, BowlerStats, BatsmanStats, GodModeState, Settings } from './types.js';
import { getEligibleBowlers, getSelectableBowlers, parseSyntheticDeliveryToken, hasOwn, isUnsafeObjectKey } from './rules.js';

const PHASE_ACTIONS: Record<MatchPhase, string[]> = {
    'SETUP': ['START_MATCH', 'APPLY_GOD_MODE'],
    'TOSS': ['CHOOSE_TOSS_BATTING', 'RESET_MATCH', 'APPLY_GOD_MODE'],
    'PLAYING_INNINGS': ['ADD_RUNS', 'ADD_LEG_BYE', 'ADD_WICKET', 'FINALIZE_DELIVERY', 'CHANGE_BATSMAN', 'CHANGE_BOWLER', 'UNDO', 'FORCE_END_INNINGS', 'RESET_MATCH', 'APPLY_GOD_MODE'],
    'INNINGS_BREAK': ['START_NEXT_INNINGS', 'UNDO', 'RESET_MATCH', 'APPLY_GOD_MODE'],
    'MATCH_OVER': ['RESET_MATCH', 'APPLY_GOD_MODE']
};

function isValidActionForPhase(phase: MatchPhase, actionType: string): boolean {
    const allowed = PHASE_ACTIONS[phase || 'SETUP'];
    return allowed ? allowed.includes(actionType) : false;
}

export function reducer(state: GameState, action: Action): GameState {
    const currentPhase = state.phase || 'SETUP';

    // Match is immutable once completed (except RESET_MATCH and explicit Umpire God Mode overrides)
    if (currentPhase === 'MATCH_OVER' || state.match?.matchOver) {
        if (action.type !== 'RESET_MATCH' && action.type !== 'APPLY_GOD_MODE') {
            console.warn(`Match state is immutable after match completion. Action ${action.type} is rejected.`);
            return state;
        }
    }

    if (!isValidActionForPhase(currentPhase, action.type)) {
        console.warn(`Action ${action.type} is not valid in phase ${currentPhase}`);
        return state;
    }

    const nextState = JSON.parse(JSON.stringify(state)) as GameState;
    nextState.uiEvents = [];

    switch (action.type) {
        case 'START_MATCH': {
            const { settings, team1Players, team2Players } = action.payload;
            
            nextState.settings = { ...nextState.settings, ...settings };
            nextState.match.team1.players = team1Players;
            nextState.match.team2.players = team2Players;

            nextState.phase = 'TOSS';
            nextState.matchStarted = true;
            break;
        }

        case 'CHOOSE_TOSS_BATTING': {
            const { battingTeamNum } = action.payload;
            nextState.match.currentBattingTeam = battingTeamNum;
            nextState.match.liveInnings = createEmptyLiveInnings();
            nextState.match.target = null;
            nextState.match.matchOver = false;
            nextState.phase = 'PLAYING_INNINGS';
            break;
        }
        
        case 'FORCE_END_INNINGS': {
            const match = nextState.match;
            archiveLiveInnings(match);
            if (match.currentInnings === 1) {
                match.target = match.liveInnings.score + 1;
                nextState.phase = 'INNINGS_BREAK';
                nextState.uiEvents.push({
                    type: 'SHOW_ALERT',
                    payload: {
                        title: 'Innings Concluded',
                        message: `Innings ended early. Target set to: ${match.target}`,
                        triggerAction: 'START_NEXT_INNINGS'
                    }
                });
            } else {
                match.matchOver = true;
                nextState.phase = 'MATCH_OVER';
                const endMsg = getMatchOverAlertMessage(match);
                nextState.uiEvents.push({
                    type: 'SHOW_ALERT',
                    payload: {
                        title: 'Match Concluded',
                        message: endMsg
                    }
                });
                nextState.uiEvents.push({ type: 'TOGGLE_SCREENSHOT' });
            }
            break;
        }

        case 'ADD_RUNS': {
            const { runs } = action.payload;
            const live = nextState.match.liveInnings;
            live.score += runs;
            live.balls++;

            if (live.currentBowler) {
                const bowler = live.bowlers[live.currentBowler];
                if (bowler) {
                    bowler.balls++;
                    bowler.runs += runs;
                }
            }

            const activeBatsman = getStriker(live);
            const activeB = live.batsmen[activeBatsman];
            if (activeB) {
                activeB.runs += runs;
                activeB.balls++;
                activeB.fours = (activeB.fours || 0) + (runs === 4 ? 1 : 0);
                activeB.sixes = (activeB.sixes || 0) + (runs === 6 ? 1 : 0);
            }

            live.overLog.push(runs.toString());

            if (runs % 2 !== 0) {
                rotateStrike(live);
            }

            checkMatchOver(nextState) || checkOverComplete(nextState);
            break;
        }

        case 'ADD_LEG_BYE': {
            if (!nextState.settings.enableLegByes) {
                console.error("Leg byes are disabled in settings.");
                return state;
            }
            const live = nextState.match.liveInnings;
            live.score += 1;
            live.extras.legbyes += 1;
            live.balls++;

            if (live.currentBowler) {
                const bowler = live.bowlers[live.currentBowler];
                if (bowler) {
                    bowler.balls++;
                }
            }

            const activeBatsman = getStriker(live);
            const activeB = live.batsmen[activeBatsman];
            if (activeB) {
                activeB.balls++;
            }

            live.overLog.push('lb1');

            rotateStrike(live);

            checkMatchOver(nextState) || checkOverComplete(nextState);
            break;
        }

        case 'ADD_WICKET': {
            const live = nextState.match.liveInnings;
            const activeBatsmanName = getStriker(live);
            const activeB = live.batsmen[activeBatsmanName];
            if (activeB) {
                activeB.balls++;
                activeB.active = false;
            }

            live.wickets++;
            live.balls++;

            if (live.currentBowler) {
                const bowler = live.bowlers[live.currentBowler];
                if (bowler) {
                    bowler.balls++;
                    bowler.wickets++;
                }
            }
            live.overLog.push('W');

            recordFallOfWicket(live, activeBatsmanName);
            live.outBatsmen.push(activeBatsmanName);
            if (live.currentBatsman1 === activeBatsmanName) {
                live.currentBatsman1 = "";
            } else {
                live.currentBatsman2 = "";
            }

            const battingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team1 : nextState.match.team2;
            const totalPlayers = battingTeam.players.length;
            const maxWickets = nextState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

            if (live.wickets >= maxWickets && totalPlayers > 0) {
                handleAllOut(nextState);
                break;
            }

            enforceSingleBatsmanRule(nextState, battingTeam, totalPlayers);
            checkMatchOver(nextState) || checkOverComplete(nextState);
            break;
        }

        case 'FINALIZE_DELIVERY': {
            const { type, extraRuns, accrueTo, pendingRunOutStriker } = action.payload;
            const live = nextState.match.liveInnings;
            const striker = getStriker(live);
            const activeB = live.batsmen[striker];
            const bowler = live.currentBowler ? live.bowlers[live.currentBowler] : null;

            if (type === 'wide') {
                const totalRuns = nextState.settings.widePenalty + extraRuns;
                live.score += totalRuns;
                live.extras.wides += nextState.settings.widePenalty;
                if (bowler) {
                    bowler.runs += totalRuns;
                    bowler.wides = (bowler.wides || 0) + 1;
                }
                if (extraRuns > 0) {
                    if (accrueTo === 'batsman' && activeB) {
                        activeB.runs += extraRuns;
                        activeB.fours = (activeB.fours || 0) + (extraRuns === 4 ? 1 : 0);
                        activeB.sixes = (activeB.sixes || 0) + (extraRuns === 6 ? 1 : 0);
                    } else {
                        live.extras.byes += extraRuns;
                    }
                }
                live.overLog.push(extraRuns > 0 ? `wd+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'wd');
            } else if (type === 'noball') {
                const totalRuns = nextState.settings.noBallPenalty + extraRuns;
                live.score += totalRuns;
                live.extras.noballs += nextState.settings.noBallPenalty;
                if (bowler) {
                    bowler.noballs = (bowler.noballs || 0) + 1;
                    if (accrueTo === 'batsman') {
                        bowler.runs += totalRuns;
                    } else {
                        bowler.runs += nextState.settings.noBallPenalty;
                    }
                }
                if (activeB) activeB.balls++;
                if (extraRuns > 0) {
                    if (accrueTo === 'batsman' && activeB) {
                        activeB.runs += extraRuns;
                        activeB.fours = (activeB.fours || 0) + (extraRuns === 4 ? 1 : 0);
                        activeB.sixes = (activeB.sixes || 0) + (extraRuns === 6 ? 1 : 0);
                    } else {
                        live.extras.byes += extraRuns;
                    }
                }
                live.overLog.push(extraRuns > 0 ? `nb+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'nb');
            } else if (type === 'runout') {
                live.score += extraRuns;
                if (bowler && accrueTo === 'batsman') bowler.runs += extraRuns;
                if (extraRuns > 0) {
                    if (accrueTo === 'batsman' && activeB) {
                        activeB.runs += extraRuns;
                        activeB.fours = (activeB.fours || 0) + (extraRuns === 4 ? 1 : 0);
                        activeB.sixes = (activeB.sixes || 0) + (extraRuns === 6 ? 1 : 0);
                    } else {
                        live.extras.byes += extraRuns;
                    }
                }

                executeRunOutWicket(nextState, !!pendingRunOutStriker, extraRuns, accrueTo);
                break;
            } else if (type === 'bye') {
                const totalByes = 1 + extraRuns;
                live.score += totalByes;
                live.extras.byes += totalByes;
                live.balls++;
                if (bowler) bowler.balls++;
                if (activeB) activeB.balls++;
                live.overLog.push(`${totalByes}b`);
            } else if (type === 'legbye') {
                if (!nextState.settings.enableLegByes) {
                    console.error("Leg byes are disabled in settings.");
                    return state;
                }
                const totalLegByes = 1 + extraRuns;
                live.score += totalLegByes;
                live.extras.legbyes += totalLegByes;
                live.balls++;
                if (bowler) bowler.balls++;
                if (activeB) activeB.balls++;
                live.overLog.push(`${totalLegByes}lb`);
            }

            let physicalRuns = extraRuns;
            if (type === 'bye' || type === 'legbye') {
                physicalRuns = 1 + extraRuns;
            }
            if (physicalRuns % 2 !== 0) {
                rotateStrike(live);
            }

            checkMatchOver(nextState) || ((type === 'bye' || type === 'legbye') && checkOverComplete(nextState));
            break;
        }

        case 'CHANGE_BATSMAN': {
            const { slot, name } = action.payload;
            const live = nextState.match.liveInnings;
            if (!live) break;

            const battingTeam = nextState.match.currentBattingTeam === 1
                ? nextState.match.team1
                : nextState.match.team2;

            if (name && battingTeam && battingTeam.players.length > 0 && !battingTeam.players.includes(name)) {
                nextState.uiEvents.push({
                    type: 'SHOW_ALERT',
                    payload: {
                        title: 'Ineligible Batsman',
                        message: `${name} is not in the batting side.`
                    }
                });
                break;
            }

            if (name && live.outBatsmen.includes(name)) {
                nextState.uiEvents.push({
                    type: 'SHOW_ALERT',
                    payload: {
                        title: 'Ineligible Batsman',
                        message: `${name} has already been dismissed.`
                    }
                });
                break;
            }

            const currentSlotName = slot === 1 ? live.currentBatsman1 : live.currentBatsman2;
            const otherSlotName = slot === 1 ? live.currentBatsman2 : live.currentBatsman1;

            if (name && otherSlotName && name === otherSlotName) {
                break;
            }

            const inningsInProgress = live.balls > 0 || (live.overLog && live.overLog.length > 0);
            // If changing opener before the first delivery of the innings, clean up previous unbatted 0/0 entry
            if (!inningsInProgress && currentSlotName && currentSlotName !== name) {
                if (live.batsmen[currentSlotName] && live.batsmen[currentSlotName].balls === 0 && live.batsmen[currentSlotName].runs === 0) {
                    delete live.batsmen[currentSlotName];
                }
            }

            assignBatsmanToSlot(live, slot, name);
            break;
        }

        case 'CHANGE_BOWLER': {
            const { name } = action.payload;
            const live = nextState.match.liveInnings;
            if (!live) break;
            const bowlingTeam = nextState.match.currentBattingTeam === 1
                ? nextState.match.team2
                : nextState.match.team1;

            // The dropdown is currently the only dispatcher of this action and
            // already hides ineligible bowlers, so this guard is defence in
            // depth: it keeps Clause 12/13 with the state machine rather than
            // the view, so any future dispatcher cannot install an illegal
            // bowler. It validates against the same set the dropdown offers,
            // so the two layers cannot disagree.
            //
            // Note that restored permalinks and live-sync packets bypass the
            // reducer entirely (storage.unminifyState feeding setGameState) and
            // are NOT covered here.
            // Membership is asked first, and separately. Every candidate set
            // below is a filtered subset of the roster, so a name that is not
            // on the bowling side fails all of them - and would otherwise be
            // refused with a fabricated claim that it had exhausted a quota it
            // never began. This arm also covers the empty roster of a freshly
            // loaded app, where every set is empty for a reason that has
            // nothing to do with the quota.
            //
            // The three refusal reasons are therefore mutually exclusive: not
            // on the side, nobody left under quota, or this particular bowler
            // is ineligible.
            if (name && bowlingTeam) {
                if (!bowlingTeam.players.includes(name)) {
                    nextState.uiEvents.push({
                        type: 'SHOW_ALERT',
                        payload: {
                            title: 'Ineligible Bowler',
                            message: `${name} is not in the bowling side.`
                        }
                    });
                    break;
                }

                const { bowlers: permitted } = getSelectableBowlers(live, bowlingTeam.players, nextState.settings);

                if (permitted.length === 0) {
                    // Nobody is under quota. Unlike the consecutive-over rule,
                    // the quota is a hard statutory cap and is never relaxed:
                    // permitting the request here would allow one bowler an
                    // unbounded number of overs.
                    //
                    // No triggerAction: showAlert registers it as a modal-hidden
                    // callback, so it fires on Escape, a backdrop click or the
                    // close X just as readily as on OK. Ending the innings is
                    // destructive and must not happen on an accidental
                    // dismissal, so point at the confirmed End Innings flow
                    // instead of performing it here.
                    nextState.uiEvents.push({
                        type: 'SHOW_ALERT',
                        payload: {
                            title: 'No Bowler Available',
                            message: `Every bowler has bowled their maximum of ${nextState.settings.maxOversPerBowler} over(s). The innings cannot continue - use End Innings to conclude it.`
                        }
                    });
                    break;
                }

                if (!permitted.includes(name)) {
                    const reason = name === live.previousBowler
                        ? `${name} bowled the previous over. A bowler may not bowl two consecutive overs.`
                        : `${name} has already bowled the maximum of ${nextState.settings.maxOversPerBowler} over(s) permitted per bowler.`;
                    // autoSelectEligiblePlayers runs after this action and will
                    // force-assign when exactly one bowler is eligible. Name that
                    // bowler here so the alert does not contradict the scoreboard.
                    const eligible = getEligibleBowlers(live, bowlingTeam.players, nextState.settings);
                    const substitute = eligible.length === 1 ? ` ${eligible[0]} has been selected instead.` : '';
                    nextState.uiEvents.push({
                        type: 'SHOW_ALERT',
                        payload: {
                            title: 'Ineligible Bowler',
                            message: reason + substitute
                        }
                    });
                    break;
                }
            }

            live.currentBowler = name;
            initBowlerStats(live, name);
            break;
        }

        case 'START_NEXT_INNINGS': {
            nextState.match.currentBattingTeam = nextState.match.currentBattingTeam === 1 ? 2 : 1;
            nextState.match.currentInnings++;
            nextState.match.liveInnings = createEmptyLiveInnings();
            nextState.phase = 'PLAYING_INNINGS';
            break;
        }

        case 'RESET_MATCH': {
            nextState.match = {
                currentInnings: 1,
                currentBattingTeam: 1,
                team1: { name: "Team 1", players: nextState.match.team1.players, innings: [] },
                team2: { name: "Team 2", players: nextState.match.team2.players, innings: [] },
                liveInnings: createEmptyLiveInnings(),
                target: null,
                matchOver: false
            };
            nextState.history = [];
            nextState.matchStarted = false;
            nextState.phase = 'SETUP';
            break;
        }

        case 'UNDO': {
            if (nextState.history.length > 0) {
                const previousState = nextState.history.pop();
                nextState.match = previousState.match;
                nextState.phase = previousState.phase;
                nextState.matchStarted = previousState.matchStarted;
                nextState.settings = previousState.settings;
            }
            break;
        }

        case 'APPLY_GOD_MODE': {
            const validationError = validateGodModePayload(state, action.payload);
            if (validationError !== null) {
                console.warn(`APPLY_GOD_MODE rejected: ${validationError}`);
                return state;
            }
            applyGodModeTransition(state, nextState, action.payload);
            break;
        }
    }

    if (nextState.phase === 'PLAYING_INNINGS') {
        autoSelectEligiblePlayers(nextState);
    }

    return nextState;
}

function getStriker(live: LiveInnings): string {
    if (live.currentBatsman1 && live.currentBatsman2) {
        const b1Active = !!live.batsmen[live.currentBatsman1]?.active;
        const b2Active = !!live.batsmen[live.currentBatsman2]?.active;
        if (b1Active && !b2Active) return live.currentBatsman1;
        if (!b1Active && b2Active) return live.currentBatsman2;
        // Repair corrupted state: make batsman1 active and batsman2 inactive
        if (live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
        if (live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = false;
        return live.currentBatsman1;
    }
    if (live.currentBatsman1) {
        if (live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
        return live.currentBatsman1;
    }
    if (live.currentBatsman2) {
        if (live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = true;
        return live.currentBatsman2;
    }
    return '';
}

function rotateStrike(live: LiveInnings): void {
    if (live.currentBatsman1 && live.currentBatsman2 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman2]) {
        const b1Active = !!live.batsmen[live.currentBatsman1].active;
        const b2Active = !!live.batsmen[live.currentBatsman2].active;
        if (b1Active === b2Active) {
            // Repair corrupted state: toggle cleanly
            live.batsmen[live.currentBatsman1].active = false;
            live.batsmen[live.currentBatsman2].active = true;
        } else {
            live.batsmen[live.currentBatsman1].active = !b1Active;
            live.batsmen[live.currentBatsman2].active = !b2Active;
        }
    } else if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) {
        live.batsmen[live.currentBatsman1].active = true;
    } else if (live.currentBatsman2 && live.batsmen[live.currentBatsman2]) {
        live.batsmen[live.currentBatsman2].active = true;
    }
}

function assignBatsmanToSlot(live: LiveInnings, slot: 1 | 2, name: string): void {
    if (!name) {
        if (slot === 1) {
            live.currentBatsman1 = "";
        } else {
            live.currentBatsman2 = "";
        }
        const remainingSlot = slot === 1 ? live.currentBatsman2 : live.currentBatsman1;
        if (remainingSlot && live.batsmen[remainingSlot]) {
            live.batsmen[remainingSlot].active = true;
        }
        for (const bName in live.batsmen) {
            if (bName !== live.currentBatsman1 && bName !== live.currentBatsman2) {
                live.batsmen[bName].active = false;
            }
        }
        return;
    }
    if (slot === 1) {
        live.currentBatsman1 = name;
    } else {
        live.currentBatsman2 = name;
    }

    const otherSlotName = slot === 1 ? live.currentBatsman2 : live.currentBatsman1;
    let isActive = true;
    if (otherSlotName && live.batsmen[otherSlotName]) {
        isActive = !live.batsmen[otherSlotName].active;
    }

    if (!live.batsmen[name]) {
        live.batsmen[name] = { runs: 0, balls: 0, fours: 0, sixes: 0, active: isActive };
    } else {
        live.batsmen[name].active = isActive;
    }

    // Invariant: any batsman not currently at the crease must have active: false
    for (const bName in live.batsmen) {
        if (bName !== live.currentBatsman1 && bName !== live.currentBatsman2) {
            live.batsmen[bName].active = false;
        }
    }
}

function initBowlerStats(live: LiveInnings, name: string): void {
    if (name && !live.bowlers[name]) {
        live.bowlers[name] = { runs: 0, balls: 0, wickets: 0, maidens: 0, wides: 0, noballs: 0 };
    }
}

function recordFallOfWicket(live: LiveInnings, batsmanName: string): void {
    if (!live.fow) live.fow = [];
    const oversStr = `${Math.floor(live.balls / 6)}.${live.balls % 6}`;
    live.fow.push({
        wicket: live.wickets,
        score: live.score,
        batsman: batsmanName,
        overs: oversStr
    });
}

function archiveLiveInnings(match: any): void {
    const live = match.liveInnings;
    const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
    if (live.overLog.length > 0) {
        live.overs.push({
            bowler: live.currentBowler || "Unknown",
            balls: [...live.overLog]
        });
        live.overLog = [];
    }
    battingTeam.innings.push(JSON.parse(JSON.stringify(live)));
}

function checkOverComplete(nextState: GameState): boolean {
    const live = nextState.match.liveInnings;
    if (live.balls % 6 === 0 && live.balls > 0) {
        rotateStrike(live);

        // Check if completed over was a maiden (0 runs conceded by bowler off bat, wides, or noballs)
        let bowlerRunsInOver = 0;
        live.overLog.forEach(b => {
            if (b.startsWith('wd')) {
                const extra = b.includes('+') ? parseInt(b.split('+')[1]) : 0;
                bowlerRunsInOver += nextState.settings.widePenalty + (isNaN(extra) ? 0 : extra);
            } else if (b.startsWith('nb')) {
                const extra = b.includes('+') ? parseInt(b.split('+')[1]) : 0;
                const isByes = b.endsWith('b');
                bowlerRunsInOver += nextState.settings.noBallPenalty + (isByes ? 0 : (isNaN(extra) ? 0 : extra));
            } else if (b.startsWith('lb') || (b.includes('b') && !b.startsWith('n') && !b.startsWith('w'))) {
                // Byes / leg byes are fielding extras, not bowler runs
            } else if (b === 'W' || b === 'W-RO') {
                // Dot wicket
            } else if (b.includes('+W-RO')) {
                const part = b.split('+')[0];
                if (!part.endsWith('b')) {
                    const r = parseInt(part);
                    if (!isNaN(r)) bowlerRunsInOver += r;
                }
            } else {
                const r = parseInt(b);
                if (!isNaN(r)) bowlerRunsInOver += r;
            }
        });

        const hasSyntheticBall = live.overLog.some(b => b.startsWith('~'));
        const genuineLegalBalls = live.overLog.filter(
            b => !b.startsWith('wd') && !b.startsWith('nb') && !b.startsWith('~')
        ).length;

        if (!hasSyntheticBall && genuineLegalBalls === 6 && bowlerRunsInOver === 0 && live.currentBowler && live.bowlers[live.currentBowler]) {
            const currentB = live.bowlers[live.currentBowler];
            currentB.maidens = (currentB.maidens || 0) + 1;
        }
        
        live.overs.push({
            bowler: live.currentBowler || "Unknown",
            balls: [...live.overLog]
        });
        live.overLog = [];

        const maxBalls = nextState.settings.oversPerInnings * 6;
        if (live.balls >= maxBalls && nextState.match.currentInnings === 1) {
            archiveLiveInnings(nextState.match);
            nextState.match.target = live.score + 1;
            nextState.phase = 'INNINGS_BREAK';
            
            nextState.uiEvents.push({
                type: 'SHOW_ALERT',
                payload: {
                    title: 'Innings End',
                    message: `Innings Over! Max overs reached. Target set to: ${nextState.match.target}`,
                    triggerAction: 'START_NEXT_INNINGS'
                }
            });
            return true;
        }

        live.previousBowler = live.currentBowler;
        live.currentBowler = "";
    }
    return false;
}

function getMatchOverAlertMessage(match: GameState['match']): string {
    const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
    const bowlingTeam = match.currentBattingTeam === 1 ? match.team2 : match.team1;
    if (match.target !== null) {
        if (match.liveInnings.score >= match.target) {
            return `Match Over! ${battingTeam.name} wins!`;
        } else if (match.liveInnings.score === match.target - 1) {
            return `Match Over! Match Tied!`;
        } else {
            return `Match Over! ${bowlingTeam.name} wins!`;
        }
    }
    return `Match Over! ${bowlingTeam.name} wins!`;
}

function checkMatchOver(nextState: GameState): boolean {
    const live = nextState.match.liveInnings;
    const settings = nextState.settings;
    const match = nextState.match;

    if (settings.totalInnings === 1 && match.currentInnings === 2) {
        const target = match.target!;
        const maxBalls = settings.oversPerInnings * 6;
        const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
        const totalPlayers = battingTeam.players.length;
        const maxWickets = settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

        const isMatchOver = live.score >= target || live.wickets >= maxWickets || live.balls >= maxBalls;

        if (isMatchOver) {
            const alertMessage = getMatchOverAlertMessage(match);
            archiveLiveInnings(match);
            match.matchOver = true;
            nextState.phase = 'MATCH_OVER';
            nextState.uiEvents.push({
                type: 'SHOW_ALERT',
                payload: {
                    title: 'Match Over',
                    message: alertMessage
                }
            });
            nextState.uiEvents.push({ type: 'TOGGLE_SCREENSHOT' });
            return true;
        }
    }
    return false;
}

function handleAllOut(nextState: GameState): void {
    const match = nextState.match;
    archiveLiveInnings(match);

    if (match.currentInnings === 1) {
        match.target = match.liveInnings.score + 1;
        nextState.phase = 'INNINGS_BREAK';
        nextState.uiEvents.push({
            type: 'SHOW_ALERT',
            payload: {
                title: 'Innings End',
                message: `Innings Over! All batsmen out. Target set to: ${match.target}`,
                triggerAction: 'START_NEXT_INNINGS'
            }
        });
    } else {
        const alertMessage = getMatchOverAlertMessage(match);
        match.matchOver = true;
        nextState.phase = 'MATCH_OVER';
        nextState.uiEvents.push({
            type: 'SHOW_ALERT',
            payload: {
                title: 'Match Over',
                message: alertMessage
            }
        });
        nextState.uiEvents.push({ type: 'TOGGLE_SCREENSHOT' });
    }
}

function enforceSingleBatsmanRule(nextState: GameState, battingTeam: Team, totalPlayers: number): void {
    const live = nextState.match.liveInnings;
    if (nextState.settings.allowSingleBatsman && live.wickets === totalPlayers - 1) {
        if (live.currentBatsman2) {
            live.currentBatsman1 = live.currentBatsman2;
            live.currentBatsman2 = "";
        }
        if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) {
            live.batsmen[live.currentBatsman1].active = true;
        }
    }
}

function executeRunOutWicket(nextState: GameState, isStriker: boolean, extraRuns: number, accrueTo: string): void {
    const live = nextState.match.liveInnings;
    const striker = getStriker(live);
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;
    const outBatsmanName = isStriker ? striker : nonStriker;

    if (!outBatsmanName) return;

    const outB = live.batsmen[outBatsmanName];
    if (outB && isStriker) {
        outB.balls++;
    } else if (!isStriker) {
        const strikerB = live.batsmen[striker];
        if (strikerB) strikerB.balls++;
    }

    live.wickets++;
    live.balls++;
    if (live.currentBowler && live.bowlers[live.currentBowler]) {
        const bowler = live.bowlers[live.currentBowler];
        if (bowler) bowler.balls++;
    }

    let logStr = 'W-RO';
    if (extraRuns > 0) {
        logStr = `${extraRuns}${accrueTo === 'byes' ? 'b' : ''}+W-RO`;
    }
    live.overLog.push(logStr);

    if (outB) {
        outB.active = false;
    }
    recordFallOfWicket(live, outBatsmanName);
    live.outBatsmen.push(outBatsmanName);
    if (live.currentBatsman1 === outBatsmanName) {
        live.currentBatsman1 = "";
    } else {
        live.currentBatsman2 = "";
    }

    const battingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team1 : nextState.match.team2;
    const totalPlayers = battingTeam.players.length;
    const maxWickets = nextState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        handleAllOut(nextState);
        return;
    }

    // Handle strike change for surviving batsman based on physical runs completed before run out
    const survivingBatsman = live.currentBatsman1 || live.currentBatsman2;
    if (survivingBatsman && live.batsmen[survivingBatsman]) {
        if (extraRuns % 2 !== 0) {
            live.batsmen[survivingBatsman].active = isStriker;
        } else {
            live.batsmen[survivingBatsman].active = !isStriker;
        }
    }

    enforceSingleBatsmanRule(nextState, battingTeam, totalPlayers);
    checkMatchOver(nextState) || checkOverComplete(nextState);
}

function autoSelectEligiblePlayers(nextState: GameState): void {
    const live = nextState.match.liveInnings;
    if (!live) return;

    const battingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team1 : nextState.match.team2;
    const bowlingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team2 : nextState.match.team1;
    if (!battingTeam || !bowlingTeam) return;

    const eligibleBatsmen = battingTeam.players.filter(p => !live.outBatsmen.includes(p));

    if (!live.currentBatsman1) {
        const candidates = eligibleBatsmen.filter(p => p !== live.currentBatsman2);
        if (candidates.length === 1) {
            assignBatsmanToSlot(live, 1, candidates[0]);
        }
    }

    if (!live.currentBatsman2 && (live.wickets < battingTeam.players.length - 1 || !nextState.settings.allowSingleBatsman)) {
        const candidates = eligibleBatsmen.filter(p => p !== live.currentBatsman1);
        if (candidates.length === 1) {
            assignBatsmanToSlot(live, 2, candidates[0]);
        }
    }

    if (!live.currentBowler) {
        const candidates = getEligibleBowlers(live, bowlingTeam.players, nextState.settings);
        if (candidates.length === 1) {
            live.currentBowler = candidates[0];
            initBowlerStats(live, candidates[0]);
        }
    }
}

function createEmptyLiveInnings(): LiveInnings {
    return {
        score: 0, wickets: 0, balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
        batsmen: {}, bowlers: {},
        currentBatsman1: "", currentBatsman2: "",
        currentBowler: "", previousBowler: null,
        outBatsmen: [], overs: [], overLog: [], fow: []
    };
}

function isNonNegativeInt(val: unknown): val is number {
    return typeof val === 'number' && Number.isFinite(val) && Number.isInteger(val) && val >= 0;
}

function dedupePlayerNames(players: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of players) {
        if (typeof raw !== 'string') continue;
        const trimmed = raw.trim();
        if (!trimmed || isUnsafeObjectKey(trimmed) || seen.has(trimmed)) continue;
        seen.add(trimmed);
        out.push(trimmed);
    }
    return out;
}

function resolveBaseLiveForGodMode(state: GameState, payload: GodModeState): LiveInnings {
    const requestedPhase = payload.targetPhase ?? payload.phase ?? 'AUTO';
    if (requestedPhase === 'SETUP' || requestedPhase === 'TOSS') {
        return createEmptyLiveInnings();
    }
    if (!state.matchStarted || state.phase === 'SETUP' || state.phase === 'TOSS' || !state.match?.liveInnings) {
        return createEmptyLiveInnings();
    }
    const prevInnings: 1 | 2 = state.match.currentInnings === 2 ? 2 : 1;
    const nextInnings: 1 | 2 = payload.currentInnings ?? (requestedPhase === 'INNINGS_BREAK' ? 1 : prevInnings);
    if (prevInnings === nextInnings) return state.match.liveInnings;
    if (prevInnings === 2 && nextInnings === 1) {
        const prevFirstTeam = state.match.currentBattingTeam === 2 ? state.match.team1 : state.match.team2;
        if (prevFirstTeam?.innings?.length > 0) return prevFirstTeam.innings[0];
    }
    return createEmptyLiveInnings();
}

function validateNumericPatch(patch: unknown, fields: string[], label: string): string | null {
    if (patch === undefined) return null;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || hasOwn(patch, '__proto__')) {
        return `${label} must be a valid object.`;
    }
    const obj = patch as Record<string, unknown>;
    for (const field of fields) {
        if (obj[field] !== undefined && !isNonNegativeInt(obj[field])) {
            return `${label} ${field} must be a non-negative whole number.`;
        }
    }
    return null;
}

function validateStatsMap(mapObj: unknown, fields: string[], label: string): string | null {
    if (mapObj === undefined) return null;
    if (!mapObj || typeof mapObj !== 'object' || Array.isArray(mapObj) || hasOwn(mapObj, '__proto__')) {
        return `${label} must be a valid object map.`;
    }
    for (const key of Object.getOwnPropertyNames(mapObj)) {
        if (!key.trim() || isUnsafeObjectKey(key)) {
            return `Invalid or reserved player name in ${label}.`;
        }
        const err = validateNumericPatch((mapObj as Record<string, unknown>)[key], fields, `${label} "${key}"`);
        if (err) return err;
    }
    return null;
}

function validateOptionalName(val: unknown, label: string): string | null {
    if (val === undefined || val === null) return null;
    if (typeof val !== 'string' || isUnsafeObjectKey(val)) {
        return `Invalid ${label} name.`;
    }
    return null;
}

function validatePlayerArray(arr: unknown, label: string): string | null {
    if (arr === undefined) return null;
    if (!Array.isArray(arr)) return `${label} must be an array of player names.`;
    for (const item of arr) {
        if (typeof item !== 'string' || isUnsafeObjectKey(item)) {
            return `${label} contains an invalid or reserved player name.`;
        }
    }
    return null;
}

function validateFowList(fow: unknown, maxWickets: number, label: string): string | null {
    if (fow === undefined) return null;
    if (!Array.isArray(fow)) return `${label} must be an array.`;
    if (fow.length > maxWickets) return `${label} entries cannot exceed total wickets fallen.`;
    for (const entry of fow) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            return `${label} contains a malformed entry.`;
        }
        const f = entry as Record<string, unknown>;
        if (!isNonNegativeInt(f.wicket) || f.wicket < 1 || !isNonNegativeInt(f.score)) {
            return `${label} entries must have positive wicket numbers and non-negative scores.`;
        }
        if (typeof f.batsman !== 'string' || isUnsafeObjectKey(f.batsman) || typeof f.overs !== 'string') {
            return `${label} entries must have valid batsman and overs strings.`;
        }
    }
    return null;
}

export function validateGodModePayload(state: GameState, payload: GodModeState): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || hasOwn(payload, '__proto__')) {
        return 'Override payload must be a valid object.';
    }

    const effectiveOversPerInnings = payload.oversPerInnings ?? (state.settings?.oversPerInnings ?? 8);
    const effectiveMaxOversPerBowler = payload.maxOversPerBowler ?? (state.settings?.maxOversPerBowler ?? 2);

    if (!isNonNegativeInt(effectiveOversPerInnings) || effectiveOversPerInnings < 1) {
        return 'Overs per innings must be a whole number of at least 1.';
    }
    if (!isNonNegativeInt(effectiveMaxOversPerBowler) || effectiveMaxOversPerBowler < 1) {
        return 'Max overs per bowler must be a whole number of at least 1.';
    }
    if (effectiveMaxOversPerBowler > effectiveOversPerInnings) {
        return 'Max overs per bowler cannot exceed overs per innings.';
    }

    if (payload.currentInnings !== undefined && payload.currentInnings !== 1 && payload.currentInnings !== 2) {
        return 'Current innings must be 1 or 2.';
    }
    if (payload.currentBattingTeam !== undefined && payload.currentBattingTeam !== 1 && payload.currentBattingTeam !== 2) {
        return 'Current batting team must be 1 or 2.';
    }

    const requestedPhase = payload.targetPhase ?? payload.phase ?? 'AUTO';
    if (!['AUTO', 'SETUP', 'TOSS', 'PLAYING_INNINGS', 'INNINGS_BREAK', 'MATCH_OVER'].includes(requestedPhase)) {
        return 'Unsupported target match phase.';
    }
    if (requestedPhase === 'INNINGS_BREAK' && payload.currentInnings === 2) {
        return 'Innings break is only valid for Innings 1.';
    }

    const t1ArrErr = validatePlayerArray(payload.team1Players, 'Team 1 roster');
    if (t1ArrErr) return t1ArrErr;
    const t2ArrErr = validatePlayerArray(payload.team2Players, 'Team 2 roster');
    if (t2ArrErr) return t2ArrErr;

    const nameChecks: Array<[unknown, string]> = [
        [payload.currentBatsman1, 'Batsman 1'],
        [payload.currentBatsman2, 'Batsman 2'],
        [payload.currentBowler, 'Current bowler'],
        [payload.previousBowler, 'Previous bowler']
    ];
    for (const [val, lbl] of nameChecks) {
        const err = validateOptionalName(val, lbl);
        if (err) return err;
    }

    const prevInnings: 1 | 2 = state.match?.currentInnings === 2 ? 2 : 1;
    const effectiveInnings: 1 | 2 = payload.currentInnings ?? (
        requestedPhase === 'SETUP' || requestedPhase === 'TOSS' || requestedPhase === 'INNINGS_BREAK' ? 1 : prevInnings
    );
    const baseLive = resolveBaseLiveForGodMode(state, payload);
    const maxBalls = effectiveOversPerInnings * 6;

    let effectiveBalls = baseLive.balls;
    if (payload.balls !== undefined) {
        if (!isNonNegativeInt(payload.balls)) return 'Balls bowled must be a non-negative whole number.';
        effectiveBalls = payload.balls;
    } else if (payload.overs !== undefined || payload.ballsInOver !== undefined) {
        const ov = payload.overs ?? Math.floor(baseLive.balls / 6);
        const bl = payload.ballsInOver ?? (baseLive.balls % 6);
        if (!isNonNegativeInt(ov)) return 'Completed overs must be a non-negative whole number.';
        if (!isNonNegativeInt(bl) || bl > 5) return 'Balls within the active over must be between 0 and 5.';
        effectiveBalls = ov * 6 + bl;
    }
    if (effectiveBalls > maxBalls) {
        return `Balls bowled (${effectiveBalls}) cannot exceed maximum innings balls (${maxBalls}).`;
    }

    const effectiveScore = payload.score ?? baseLive.score;
    if (!isNonNegativeInt(effectiveScore)) return 'Score must be a non-negative whole number.';

    const effectiveWickets = payload.wickets ?? baseLive.wickets;
    if (!isNonNegativeInt(effectiveWickets)) return 'Wickets must be a non-negative whole number.';

    if (payload.target !== undefined && payload.target !== null) {
        if (!isNonNegativeInt(payload.target) || payload.target < 1) {
            return 'Target score must be a whole number of at least 1.';
        }
    }

    const patchChecks: Array<[unknown, string[], string]> = [
        [payload.extras, ['wides', 'noballs', 'byes', 'legbyes'], 'Extras'],
        [payload.batsman1Stats, ['runs', 'balls', 'fours', 'sixes'], 'Batsman 1'],
        [payload.batsman2Stats, ['runs', 'balls', 'fours', 'sixes'], 'Batsman 2'],
        [payload.currentBowlerStats, ['runs', 'balls', 'wickets', 'maidens', 'wides', 'noballs'], 'Current bowler']
    ];
    for (const [patch, fields, lbl] of patchChecks) {
        const err = validateNumericPatch(patch, fields, lbl);
        if (err) return err;
    }

    const batMapErr = validateStatsMap(payload.batsmenOverrides, ['runs', 'balls', 'fours', 'sixes'], 'Batsmen overrides');
    if (batMapErr) return batMapErr;
    const bowlMapErr = validateStatsMap(payload.bowlersOverrides, ['runs', 'balls', 'wickets', 'maidens', 'wides', 'noballs'], 'Bowlers overrides');
    if (bowlMapErr) return bowlMapErr;

    if (payload.innings1Summary !== undefined && payload.innings1Summary !== null) {
        const s1 = payload.innings1Summary;
        if (typeof s1 !== 'object' || Array.isArray(s1) || hasOwn(s1, '__proto__')) {
            return 'Innings 1 summary must be a valid object.';
        }
        if (!isNonNegativeInt(s1.score) || !isNonNegativeInt(s1.wickets) || !isNonNegativeInt(s1.balls)) {
            return 'Innings 1 summary score, wickets, and balls must be non-negative whole numbers.';
        }
        if (s1.balls > maxBalls) {
            return `Innings 1 balls (${s1.balls}) cannot exceed maximum innings balls (${maxBalls}).`;
        }
        const s1ExErr = validateNumericPatch(s1.extras, ['wides', 'noballs', 'byes', 'legbyes'], 'Innings 1 extras');
        if (s1ExErr) return s1ExErr;
        const s1BatErr = validateStatsMap(s1.batsmen, ['runs', 'balls', 'fours', 'sixes'], 'Innings 1 batsmen');
        if (s1BatErr) return s1BatErr;
        const s1BowlErr = validateStatsMap(s1.bowlers, ['runs', 'balls', 'wickets', 'maidens', 'wides', 'noballs'], 'Innings 1 bowlers');
        if (s1BowlErr) return s1BowlErr;
        const s1OutErr = validatePlayerArray(s1.outBatsmen, 'Innings 1 dismissed batters');
        if (s1OutErr) return s1OutErr;
        if (s1.outBatsmen && s1.outBatsmen.filter(s => s.trim()).length > s1.wickets) {
            return 'Innings 1 dismissed batters cannot exceed Innings 1 wickets.';
        }
        const s1FowErr = validateFowList(s1.fow, s1.wickets, 'Innings 1 fall of wickets');
        if (s1FowErr) return s1FowErr;
        for (const [val, lbl] of [[s1.currentBatsman1, 'Innings 1 Batsman 1'], [s1.currentBatsman2, 'Innings 1 Batsman 2'], [s1.currentBowler, 'Innings 1 bowler'], [s1.previousBowler, 'Innings 1 previous bowler']] as Array<[unknown, string]>) {
            const err = validateOptionalName(val, lbl);
            if (err) return err;
        }
        if (s1.overs !== undefined && (!Array.isArray(s1.overs) || s1.overs.some(o => !o || typeof o.bowler !== 'string' || isUnsafeObjectKey(o.bowler) || !Array.isArray(o.balls)))) {
            return 'Innings 1 overs history is malformed.';
        }
        if (s1.overLog !== undefined && !Array.isArray(s1.overLog)) {
            return 'Innings 1 overLog must be an array.';
        }
    }

    const fowErr = validateFowList(payload.fow, effectiveWickets, 'Fall of wickets');
    if (fowErr) return fowErr;

    const rawB1 = payload.currentBatsman1 !== undefined ? payload.currentBatsman1 : baseLive.currentBatsman1;
    const rawB2 = payload.currentBatsman2 !== undefined ? payload.currentBatsman2 : baseLive.currentBatsman2;
    const effB1 = typeof rawB1 === 'string' ? rawB1.trim() : '';
    const effB2 = typeof rawB2 === 'string' ? rawB2.trim() : '';

    if (effB1 !== '' && effB1 === effB2) {
        return 'Striker and non-striker must be two distinct batters.';
    }
    if (payload.activeStriker !== undefined && payload.activeStriker !== 1 && payload.activeStriker !== 2) {
        return 'Active striker slot must be 1 or 2.';
    }

    if (payload.outBatsmen !== undefined) {
        const outArrErr = validatePlayerArray(payload.outBatsmen, 'Dismissed batters');
        if (outArrErr) return outArrErr;
        const cleanedOut = payload.outBatsmen.map(n => n.trim()).filter(Boolean);
        if (new Set(cleanedOut).size !== cleanedOut.length) {
            return 'Dismissed batters list cannot contain duplicate names.';
        }
        if (cleanedOut.length > effectiveWickets) {
            return 'Number of dismissed batters cannot exceed total wickets fallen.';
        }
        if (effB1 && cleanedOut.includes(effB1)) return `Active batter "${effB1}" cannot also be listed in dismissed batters.`;
        if (effB2 && cleanedOut.includes(effB2)) return `Active batter "${effB2}" cannot also be listed in dismissed batters.`;
    } else {
        const inheritedOut = (baseLive.outBatsmen || []).slice(0, effectiveWickets);
        if (effB1 && inheritedOut.includes(effB1)) return `Active batter "${effB1}" is already recorded as dismissed.`;
        if (effB2 && inheritedOut.includes(effB2)) return `Active batter "${effB2}" is already recorded as dismissed.`;
    }

    if (requestedPhase === 'PLAYING_INNINGS') {
        if (effectiveBalls >= maxBalls) {
            return 'Cannot remain in active play when all overs for the innings have been bowled.';
        }
        if (effectiveInnings === 2) {
            let effectiveTarget: number | null = null;
            if (payload.target !== undefined) effectiveTarget = payload.target;
            else if (payload.innings1Summary) effectiveTarget = payload.innings1Summary.score + 1;
            else if (state.match?.target !== null && state.match?.target !== undefined) effectiveTarget = state.match.target;
            else if (prevInnings === 1 && state.matchStarted && state.match?.liveInnings) effectiveTarget = state.match.liveInnings.score + 1;
            if (effectiveTarget !== null && effectiveScore >= effectiveTarget) {
                return 'Cannot remain in active play when the second-innings score has already reached the target.';
            }
        }
    }

    return null;
}

export function buildGodModeDraftFromState(state: GameState): GodModeState {
    const settings = state.settings;
    const match = state.match;
    const live = match.liveInnings;
    const currentInnings: 1 | 2 = match.currentInnings === 2 ? 2 : 1;

    const firstBattingTeam = currentInnings === 2
        ? (match.currentBattingTeam === 2 ? match.team1 : match.team2)
        : (match.currentBattingTeam === 1 ? match.team1 : match.team2);
    const archivedInnings1 = currentInnings === 2 && firstBattingTeam.innings.length > 0
        ? JSON.parse(JSON.stringify(firstBattingTeam.innings[0]))
        : null;

    const b1Name = live.currentBatsman1 || '';
    const b2Name = live.currentBatsman2 || '';
    const b1Entry = b1Name && hasOwn(live.batsmen, b1Name) ? live.batsmen[b1Name] : undefined;
    const b2Entry = b2Name && hasOwn(live.batsmen, b2Name) ? live.batsmen[b2Name] : undefined;

    let activeStriker: 1 | 2 | undefined = undefined;
    if (b2Entry?.active && !b1Entry?.active) activeStriker = 2;
    else if (b1Entry?.active) activeStriker = 1;

    let batsman1Stats: Partial<Omit<BatsmanStats, 'active'>> | undefined = undefined;
    if (b1Entry) {
        const { active: _a1, ...restB1 } = b1Entry;
        batsman1Stats = { ...restB1 };
    }
    let batsman2Stats: Partial<Omit<BatsmanStats, 'active'>> | undefined = undefined;
    if (b2Entry) {
        const { active: _a2, ...restB2 } = b2Entry;
        batsman2Stats = { ...restB2 };
    }

    const bowlerName = live.currentBowler || '';
    const currentBowlerStats = bowlerName && hasOwn(live.bowlers, bowlerName)
        ? JSON.parse(JSON.stringify(live.bowlers[bowlerName]))
        : undefined;

    const batsmenOverrides: Record<string, Partial<BatsmanStats>> = {};
    for (const [k, v] of Object.entries(live.batsmen || {})) {
        if (!isUnsafeObjectKey(k)) batsmenOverrides[k] = JSON.parse(JSON.stringify(v));
    }

    const bowlersOverrides: Record<string, Partial<BowlerStats>> = {};
    for (const [k, v] of Object.entries(live.bowlers || {})) {
        if (!isUnsafeObjectKey(k)) bowlersOverrides[k] = JSON.parse(JSON.stringify(v));
    }

    return {
        oversPerInnings: settings.oversPerInnings,
        maxOversPerBowler: settings.maxOversPerBowler,
        allowSingleBatsman: settings.allowSingleBatsman,
        enableLegByes: settings.enableLegByes,
        team1Name: match.team1.name,
        team2Name: match.team2.name,
        team1Players: [...match.team1.players],
        team2Players: [...match.team2.players],
        phase: state.phase,
        targetPhase: state.phase,
        currentInnings,
        currentBattingTeam: match.currentBattingTeam,
        target: match.target,
        innings1Summary: archivedInnings1,
        score: live.score,
        wickets: live.wickets,
        balls: live.balls,
        overs: Math.floor(live.balls / 6),
        ballsInOver: live.balls % 6,
        extras: { ...live.extras },
        currentBatsman1: live.currentBatsman1,
        batsman1Stats,
        currentBatsman2: live.currentBatsman2,
        batsman2Stats,
        activeStriker,
        outBatsmen: [...(live.outBatsmen || [])],
        fow: JSON.parse(JSON.stringify(live.fow || [])),
        currentBowler: live.currentBowler,
        currentBowlerStats,
        previousBowler: live.previousBowler,
        batsmenOverrides,
        bowlersOverrides
    };
}

function scoreDeliveryForReconciliation(token: string, settings: Settings): { isLegal: boolean; runs: number; wicket: number } {
    const norm = (token || '').trim();
    const syn = parseSyntheticDeliveryToken(norm);
    if (syn) return { isLegal: syn.isLegal, runs: syn.runs, wicket: syn.isWicket ? 1 : 0 };

    if (norm.startsWith('wd')) {
        const extra = norm.includes('+') ? parseInt(norm.split('+')[1], 10) : 0;
        return { isLegal: false, runs: settings.widePenalty + (isNaN(extra) ? 0 : extra), wicket: 0 };
    }
    if (norm.startsWith('nb')) {
        const extra = norm.includes('+') ? parseInt(norm.split('+')[1], 10) : 0;
        return { isLegal: false, runs: settings.noBallPenalty + (isNaN(extra) ? 0 : extra), wicket: 0 };
    }
    const isRunOut = norm === 'W-RO' || norm.endsWith('+W-RO');
    if (norm === 'W' || norm.startsWith('W(') || isRunOut) {
        let runs = 0;
        if (norm.endsWith('+W-RO')) {
            const parsed = parseInt(norm.split('+')[0].replace('b', ''), 10);
            if (!isNaN(parsed)) runs = parsed;
        }
        return { isLegal: true, runs, wicket: 1 };
    }
    if (norm.includes('lb')) {
        const parsed = parseInt(norm.replace('lb', ''), 10);
        return { isLegal: true, runs: isNaN(parsed) ? 1 : parsed, wicket: 0 };
    }
    if (norm.includes('b')) {
        const parsed = parseInt(norm.replace('b', ''), 10);
        return { isLegal: true, runs: isNaN(parsed) ? 1 : parsed, wicket: 0 };
    }
    const numericRuns = parseInt(norm, 10);
    return { isLegal: true, runs: isNaN(numericRuns) ? 0 : numericRuns, wicket: 0 };
}

function summarizeOverBalls(balls: string[], settings: Settings): { legalBalls: number; runs: number; wickets: number } {
    let legalBalls = 0;
    let runs = 0;
    let wickets = 0;
    for (const b of balls) {
        const d = scoreDeliveryForReconciliation(b, settings);
        if (d.isLegal) legalBalls++;
        runs += d.runs;
        wickets += d.wicket;
    }
    return { legalBalls, runs, wickets };
}

function popPartialArchivedOver(live: LiveInnings, settings: Settings): string | null {
    if (!live.overs || live.overs.length === 0) return null;
    if (live.overLog && live.overLog.length > 0) return null;
    const lastOver = live.overs[live.overs.length - 1];
    if (summarizeOverBalls(lastOver.balls || [], settings).legalBalls < 6) {
        const popped = live.overs.pop()!;
        live.overLog = [...(popped.balls || [])];
        return popped.bowler || null;
    }
    return null;
}

function flushPartialOverLog(live: LiveInnings, fallbackBowler: string): void {
    if (live.overLog.length > 0) {
        live.overs.push({ bowler: live.currentBowler || fallbackBowler, balls: [...live.overLog] });
        live.overLog = [];
    }
}

function generateSyntheticDeliveries(remBalls: number, remRuns: number, remWickets: number): string[] {
    if (remBalls === 0) {
        const nonLegalTokens: string[] = [];
        if (remWickets > 0) {
            for (let w = 0; w < remWickets; w++) {
                const r = w === 0 ? remRuns : 0;
                nonLegalTokens.push(r > 0 ? `~+${r}+W` : '~+W');
            }
        } else if (remRuns > 0) {
            nonLegalTokens.push(`~+${remRuns}`);
        }
        return nonLegalTokens;
    }

    const legalWickets = Math.min(remWickets, remBalls);
    const extraNonLegalWickets = remWickets - legalWickets;
    const tokens: string[] = [];

    // Emit non-legal wicket tokens before legal balls so balls % 6 === 0 never strands trailing '~+W'
    for (let ew = 0; ew < extraNonLegalWickets; ew++) {
        tokens.push('~+W');
    }

    const wicketPositions = new Set<number>();
    for (let w = 0; w < legalWickets; w++) {
        let pos = Math.floor(((w + 1) * remBalls) / (legalWickets + 1));
        while (wicketPositions.has(pos) && pos < remBalls - 1) pos++;
        while (wicketPositions.has(pos) && pos > 0) pos--;
        wicketPositions.add(pos);
    }

    const baseRuns = Math.floor(remRuns / remBalls);
    const remainderRuns = remRuns % remBalls;
    for (let i = 0; i < remBalls; i++) {
        const r = baseRuns + (i < remainderRuns ? 1 : 0);
        tokens.push(wicketPositions.has(i) ? (r > 0 ? `~${r}+W` : '~W') : `~${r}`);
    }
    return tokens;
}

function canSynthesizeCleanSuffix(targetBalls: number, keptBalls: number, remRuns: number, remWickets: number): boolean {
    const remBalls = targetBalls - keptBalls;
    if (remBalls < 0 || remRuns < 0 || remWickets < 0) return false;
    if (remBalls === 0) return (remRuns === 0 && remWickets === 0) || targetBalls === 0;
    if (targetBalls >= remWickets && remBalls < remWickets) return false;
    return true;
}

function appendSyntheticTokensToInnings(
    live: LiveInnings,
    initialOverLog: string[],
    initialLegalCount: number,
    synthTokens: string[],
    settings: Settings
): void {
    let workingOverLog = [...initialOverLog];
    let workingLegalCount = initialLegalCount;
    for (const tok of synthTokens) {
        workingOverLog.push(tok);
        if (scoreDeliveryForReconciliation(tok, settings).isLegal) {
            workingLegalCount++;
        }
        if (workingLegalCount === 6) {
            live.overs.push({ bowler: 'Adjusted', balls: [...workingOverLog] });
            workingOverLog = [];
            workingLegalCount = 0;
        }
    }
    live.overLog = workingOverLog;
}

function reconcileInningsOvers(live: LiveInnings, settings: Settings): void {
    if (!live.overs) live.overs = [];
    if (!live.overLog) live.overLog = [];

    let totalLegalBalls = 0;
    let totalRuns = 0;
    let totalWickets = 0;
    let allCompletedOversSixBalls = true;

    for (const ov of live.overs) {
        const st = summarizeOverBalls(ov.balls || [], settings);
        if (st.legalBalls !== 6) allCompletedOversSixBalls = false;
        totalLegalBalls += st.legalBalls;
        totalRuns += st.runs;
        totalWickets += st.wickets;
    }
    const overLogStats = summarizeOverBalls(live.overLog, settings);
    if (overLogStats.legalBalls >= 6) allCompletedOversSixBalls = false;
    totalLegalBalls += overLogStats.legalBalls;
    totalRuns += overLogStats.runs;
    totalWickets += overLogStats.wickets;

    const expectedCompletedOvers = Math.floor(live.balls / 6);

    if (
        allCompletedOversSixBalls &&
        totalLegalBalls === live.balls &&
        totalRuns === live.score &&
        totalWickets === live.wickets &&
        live.overs.length === expectedCompletedOvers
    ) {
        return;
    }

    if (
        allCompletedOversSixBalls &&
        live.overs.length <= expectedCompletedOvers &&
        canSynthesizeCleanSuffix(live.balls, totalLegalBalls, live.score - totalRuns, live.wickets - totalWickets)
    ) {
        const synthTokens = generateSyntheticDeliveries(
            live.balls - totalLegalBalls,
            live.score - totalRuns,
            live.wickets - totalWickets
        );
        appendSyntheticTokensToInnings(live, live.overLog, overLogStats.legalBalls, synthTokens, settings);
        return;
    }

    const keptOvers: Array<{ bowler: string; balls: string[] }> = [];
    let keptBalls = 0;
    let keptRuns = 0;
    let keptWickets = 0;

    const maxKeepableOvers = Math.min(live.overs.length, expectedCompletedOvers);
    for (let i = 0; i < maxKeepableOvers; i++) {
        const ov = live.overs[i];
        const st = summarizeOverBalls(ov.balls || [], settings);
        if (st.legalBalls !== 6) break;
        const candBalls = keptBalls + st.legalBalls;
        const candRuns = keptRuns + st.runs;
        const candWickets = keptWickets + st.wickets;
        if (!canSynthesizeCleanSuffix(live.balls, candBalls, live.score - candRuns, live.wickets - candWickets)) break;
        keptOvers.push({ bowler: ov.bowler, balls: [...ov.balls] });
        keptBalls = candBalls;
        keptRuns = candRuns;
        keptWickets = candWickets;
    }

    const keptPartialBalls: string[] = [];
    let partialLegalCount = 0;
    const candidateTailBalls = keptOvers.length < live.overs.length
        ? (live.overs[keptOvers.length]?.balls || [])
        : live.overLog;

    if (keptBalls < live.balls && candidateTailBalls.length > 0) {
        for (const b of candidateTailBalls) {
            const st = scoreDeliveryForReconciliation(b, settings);
            const nextLegal = partialLegalCount + (st.isLegal ? 1 : 0);
            if (nextLegal >= 6) break;
            const candBalls = keptBalls + (st.isLegal ? 1 : 0);
            const candRuns = keptRuns + st.runs;
            const candWickets = keptWickets + st.wicket;
            if (!canSynthesizeCleanSuffix(live.balls, candBalls, live.score - candRuns, live.wickets - candWickets)) break;
            keptPartialBalls.push(b);
            partialLegalCount = nextLegal;
            keptBalls = candBalls;
            keptRuns = candRuns;
            keptWickets = candWickets;
        }
    }

    live.overs = keptOvers;
    const synthTokens = generateSyntheticDeliveries(live.balls - keptBalls, live.score - keptRuns, live.wickets - keptWickets);
    appendSyntheticTokensToInnings(live, keptPartialBalls, partialLegalCount, synthTokens, settings);
}

function applyGodModeTransition(prevState: GameState, nextState: GameState, payload: GodModeState): void {
    if (payload.oversPerInnings !== undefined) nextState.settings.oversPerInnings = payload.oversPerInnings;
    if (payload.maxOversPerBowler !== undefined) nextState.settings.maxOversPerBowler = payload.maxOversPerBowler;
    if (payload.allowSingleBatsman !== undefined) nextState.settings.allowSingleBatsman = payload.allowSingleBatsman;
    if (payload.enableLegByes !== undefined) nextState.settings.enableLegByes = payload.enableLegByes;

    if (payload.team1Name !== undefined && payload.team1Name.trim() !== '') {
        nextState.match.team1.name = payload.team1Name.trim();
    }
    if (payload.team2Name !== undefined && payload.team2Name.trim() !== '') {
        nextState.match.team2.name = payload.team2Name.trim();
    }
    if (payload.team1Players !== undefined) {
        nextState.match.team1.players = dedupePlayerNames(payload.team1Players);
    }
    if (payload.team2Players !== undefined) {
        nextState.match.team2.players = dedupePlayerNames(payload.team2Players);
    }

    const requestedPhase = payload.targetPhase ?? payload.phase ?? 'AUTO';

    if (requestedPhase === 'SETUP' || requestedPhase === 'TOSS') {
        nextState.match.currentInnings = 1;
        if (payload.currentBattingTeam !== undefined) {
            nextState.match.currentBattingTeam = payload.currentBattingTeam;
        }
        nextState.match.team1.innings = [];
        nextState.match.team2.innings = [];
        nextState.match.liveInnings = createEmptyLiveInnings();
        nextState.match.target = null;
        nextState.match.matchOver = false;
        nextState.history = [];
        nextState.matchStarted = requestedPhase === 'TOSS';
        nextState.phase = requestedPhase;
        return;
    }

    const wasPreMatch = !prevState.matchStarted || prevState.phase === 'SETUP' || prevState.phase === 'TOSS' || !prevState.match?.liveInnings;
    const prevInningsNum: 1 | 2 = prevState.match.currentInnings === 2 ? 2 : 1;
    const nextInningsNum: 1 | 2 = payload.currentInnings ?? (requestedPhase === 'INNINGS_BREAK' ? 1 : prevInningsNum);

    let nextBattingTeamNum: 1 | 2 = prevState.match.currentBattingTeam;
    if (payload.currentBattingTeam !== undefined) {
        nextBattingTeamNum = payload.currentBattingTeam;
    } else if (!wasPreMatch && prevInningsNum !== nextInningsNum) {
        nextBattingTeamNum = prevState.match.currentBattingTeam === 1 ? 2 : 1;
    }

    nextState.match.currentInnings = nextInningsNum;
    nextState.match.currentBattingTeam = nextBattingTeamNum;

    const battingTeam = nextBattingTeamNum === 1 ? nextState.match.team1 : nextState.match.team2;
    const bowlingTeam = nextBattingTeamNum === 1 ? nextState.match.team2 : nextState.match.team1;
    const hadPreExistingBattingRoster = battingTeam.players.length > 0;
    const hadPreExistingBowlingRoster = bowlingTeam.players.length > 0;

    let live: LiveInnings;
    let poppedBowler: string | null = null;

    if (wasPreMatch) {
        live = createEmptyLiveInnings();
        if (nextInningsNum === 1) {
            nextState.match.team1.innings = [];
            nextState.match.team2.innings = [];
            nextState.match.target = null;
        }
    } else if (prevInningsNum === 2 && nextInningsNum === 1) {
        const prevFirstTeamNum: 1 | 2 = prevState.match.currentBattingTeam === 2 ? 1 : 2;
        const prevFirstTeam = prevFirstTeamNum === 1 ? prevState.match.team1 : prevState.match.team2;
        if (prevFirstTeam.innings.length > 0 && nextBattingTeamNum === prevFirstTeamNum) {
            live = JSON.parse(JSON.stringify(prevFirstTeam.innings[0]));
            poppedBowler = popPartialArchivedOver(live, nextState.settings);
            if (!live.currentBowler && poppedBowler && poppedBowler !== 'Unknown' && poppedBowler !== 'Adjusted') {
                live.currentBowler = poppedBowler;
            }
        } else {
            live = createEmptyLiveInnings();
        }
        nextState.match.team1.innings = [];
        nextState.match.team2.innings = [];
        nextState.match.target = null;
    } else if (prevInningsNum === 1 && nextInningsNum === 2) {
        live = createEmptyLiveInnings();
        nextState.match.team1.innings = [];
        nextState.match.team2.innings = [];
    } else {
        live = JSON.parse(JSON.stringify(prevState.match.liveInnings));
        if (prevState.phase === 'INNINGS_BREAK' || prevState.phase === 'MATCH_OVER' || prevState.match.matchOver) {
            poppedBowler = popPartialArchivedOver(live, nextState.settings);
            if (!live.currentBowler && poppedBowler && poppedBowler !== 'Unknown' && poppedBowler !== 'Adjusted') {
                live.currentBowler = poppedBowler;
            }
        }
        battingTeam.innings = [];
        if (nextInningsNum === 1) {
            bowlingTeam.innings = [];
            nextState.match.target = null;
        }
    }

    if (nextInningsNum === 2) {
        const expectedFirstTeamNum: 1 | 2 = nextBattingTeamNum === 1 ? 2 : 1;
        const prevFirstTeam = expectedFirstTeamNum === 1 ? prevState.match.team1 : prevState.match.team2;
        let inngs1Archive: LiveInnings;
        if (prevInningsNum === 2 && prevFirstTeam.innings.length > 0) {
            inngs1Archive = JSON.parse(JSON.stringify(prevFirstTeam.innings[0]));
        } else if (!wasPreMatch && prevInningsNum === 1 && prevState.match.currentBattingTeam === expectedFirstTeamNum) {
            inngs1Archive = JSON.parse(JSON.stringify(prevState.match.liveInnings));
        } else {
            inngs1Archive = createEmptyLiveInnings();
        }

        if (payload.innings1Summary) {
            const s1 = payload.innings1Summary;
            inngs1Archive.score = s1.score;
            inngs1Archive.wickets = s1.wickets;
            inngs1Archive.balls = s1.balls;
            if (s1.extras) inngs1Archive.extras = { ...inngs1Archive.extras, ...s1.extras };
            if (s1.batsmen) {
                const safeBatsmen: Record<string, BatsmanStats> = {};
                for (const k of Object.getOwnPropertyNames(s1.batsmen)) {
                    if (k.trim() && !isUnsafeObjectKey(k)) safeBatsmen[k.trim()] = JSON.parse(JSON.stringify(s1.batsmen[k]));
                }
                inngs1Archive.batsmen = safeBatsmen;
            }
            if (s1.bowlers) {
                const safeBowlers: Record<string, BowlerStats> = {};
                for (const k of Object.getOwnPropertyNames(s1.bowlers)) {
                    if (k.trim() && !isUnsafeObjectKey(k)) safeBowlers[k.trim()] = JSON.parse(JSON.stringify(s1.bowlers[k]));
                }
                inngs1Archive.bowlers = safeBowlers;
            }
            if (s1.currentBatsman1 !== undefined) inngs1Archive.currentBatsman1 = s1.currentBatsman1;
            if (s1.currentBatsman2 !== undefined) inngs1Archive.currentBatsman2 = s1.currentBatsman2;
            if (s1.currentBowler !== undefined) inngs1Archive.currentBowler = s1.currentBowler;
            if (s1.previousBowler !== undefined) inngs1Archive.previousBowler = s1.previousBowler;
            if (s1.outBatsmen) inngs1Archive.outBatsmen = dedupePlayerNames(s1.outBatsmen);
            if (s1.overs) inngs1Archive.overs = JSON.parse(JSON.stringify(s1.overs));
            if (s1.overLog) inngs1Archive.overLog = [...s1.overLog];
            if (s1.fow) inngs1Archive.fow = JSON.parse(JSON.stringify(s1.fow));
        }

        const poppedInngs1Bowler = popPartialArchivedOver(inngs1Archive, nextState.settings);
        reconcileInningsOvers(inngs1Archive, nextState.settings);
        flushPartialOverLog(inngs1Archive, poppedInngs1Bowler || 'Adjusted');
        bowlingTeam.innings = [JSON.parse(JSON.stringify(inngs1Archive))];
        battingTeam.innings = [];

        if (payload.target !== undefined) nextState.match.target = payload.target;
        else if (payload.innings1Summary) nextState.match.target = inngs1Archive.score + 1;
        else if (nextState.match.target === null || nextState.match.target === undefined) {
            nextState.match.target = inngs1Archive.score + 1;
        }
    }

    const baseBallsBeforeOverride = live.balls;
    if (payload.score !== undefined) live.score = payload.score;
    if (payload.wickets !== undefined) live.wickets = payload.wickets;
    if (payload.balls !== undefined) {
        live.balls = payload.balls;
    } else if (payload.overs !== undefined || payload.ballsInOver !== undefined) {
        const ov = payload.overs ?? Math.floor(live.balls / 6);
        const bl = payload.ballsInOver ?? (live.balls % 6);
        live.balls = ov * 6 + bl;
    }
    if (payload.extras) live.extras = { ...live.extras, ...payload.extras };

    if (payload.outBatsmen !== undefined) {
        live.outBatsmen = dedupePlayerNames(payload.outBatsmen);
    } else if (live.outBatsmen.length > live.wickets) {
        live.outBatsmen = live.outBatsmen.slice(0, live.wickets);
    }

    if (payload.fow !== undefined) {
        live.fow = JSON.parse(JSON.stringify(payload.fow));
    } else if (live.fow && live.fow.length > live.wickets) {
        live.fow = live.fow.slice(0, live.wickets);
    }

    const prevStrikerSlot: 1 | 2 = (
        live.currentBatsman2 &&
        hasOwn(live.batsmen, live.currentBatsman2) &&
        live.batsmen[live.currentBatsman2]?.active &&
        !(live.currentBatsman1 && hasOwn(live.batsmen, live.currentBatsman1) && live.batsmen[live.currentBatsman1]?.active)
    ) ? 2 : 1;
    const hadAnyActiveBatter = Object.values(live.batsmen || {}).some(b => !!b.active);

    if (payload.batsmenOverrides) {
        for (const bName of Object.getOwnPropertyNames(payload.batsmenOverrides)) {
            const cleanName = bName.trim();
            const statsPatch = payload.batsmenOverrides[bName];
            if (!cleanName || isUnsafeObjectKey(cleanName) || !statsPatch) continue;
            const existing = hasOwn(live.batsmen, cleanName)
                ? live.batsmen[cleanName]
                : { runs: 0, balls: 0, fours: 0, sixes: 0, active: false };
            const definedPatch = Object.fromEntries(Object.entries(statsPatch).filter(([, v]) => v !== undefined));
            live.batsmen[cleanName] = { ...existing, ...definedPatch } as BatsmanStats;
        }
    }

    if (payload.currentBatsman1 !== undefined) {
        live.currentBatsman1 = payload.currentBatsman1 === null
            ? (live.currentBatsman1 === null ? null : "")
            : payload.currentBatsman1.trim();
    }
    if (payload.currentBatsman2 !== undefined) {
        live.currentBatsman2 = payload.currentBatsman2 === null
            ? (live.currentBatsman2 === null ? null : "")
            : payload.currentBatsman2.trim();
    }

    if (payload.bowlersOverrides) {
        for (const bwName of Object.getOwnPropertyNames(payload.bowlersOverrides)) {
            const cleanName = bwName.trim();
            const bwPatch = payload.bowlersOverrides[bwName];
            if (!cleanName || isUnsafeObjectKey(cleanName) || !bwPatch) continue;
            const existing = hasOwn(live.bowlers, cleanName)
                ? live.bowlers[cleanName]
                : { runs: 0, balls: 0, wickets: 0, maidens: 0, wides: 0, noballs: 0 };
            const definedPatch = Object.fromEntries(Object.entries(bwPatch).filter(([, v]) => v !== undefined));
            live.bowlers[cleanName] = { ...existing, ...definedPatch } as BowlerStats;
        }
    }

    if (payload.previousBowler !== undefined) {
        live.previousBowler = !payload.previousBowler
            ? (live.previousBowler === "" && payload.previousBowler === "" ? "" : null)
            : payload.previousBowler.trim();
    }
    if (payload.currentBowler !== undefined) {
        live.currentBowler = payload.currentBowler === null
            ? (live.currentBowler === null ? null : "")
            : payload.currentBowler.trim();
    }

    const batterCandidatesForRoster = [
        ...live.outBatsmen,
        live.currentBatsman1 || '',
        live.currentBatsman2 || '',
        ...Object.getOwnPropertyNames(payload.batsmenOverrides || {})
    ].map(s => s.trim()).filter(s => Boolean(s) && !isUnsafeObjectKey(s));

    for (const bName of batterCandidatesForRoster) {
        if (!battingTeam.players.includes(bName)) battingTeam.players.push(bName);
    }

    const bowlerCandidatesForRoster = [
        live.currentBowler || '',
        live.previousBowler || '',
        ...Object.getOwnPropertyNames(payload.bowlersOverrides || {})
    ].map(s => s.trim()).filter(s => Boolean(s) && !isUnsafeObjectKey(s) && s !== 'Adjusted' && s !== 'Unknown');

    for (const bwName of bowlerCandidatesForRoster) {
        if (!bowlingTeam.players.includes(bwName)) bowlingTeam.players.push(bwName);
    }

    const maxBalls = nextState.settings.oversPerInnings * 6;
    const isAlreadyFinishedByBallsOrChase =
        live.balls >= maxBalls ||
        (nextInningsNum === 2 && nextState.match.target !== null && live.score >= nextState.match.target);

    if (requestedPhase === 'PLAYING_INNINGS' || (requestedPhase === 'AUTO' && !hadPreExistingBattingRoster && !isAlreadyFinishedByBallsOrChase)) {
        const minBattingSize = Math.max(
            nextState.settings.allowSingleBatsman ? live.wickets + 1 : live.wickets + 2,
            battingTeam.players.length
        );
        let batterSeq = 1;
        while (battingTeam.players.length < minBattingSize) {
            const candidate = `Batter ${batterSeq++}`;
            if (!battingTeam.players.includes(candidate) && !bowlingTeam.players.includes(candidate)) {
                battingTeam.players.push(candidate);
            }
        }
    }

    const shouldPadBowlingRoster =
        (!hadPreExistingBowlingRoster || wasPreMatch) &&
        (requestedPhase === 'PLAYING_INNINGS' || !hadPreExistingBowlingRoster) &&
        payload.team1Players === undefined &&
        payload.team2Players === undefined;

    if (shouldPadBowlingRoster) {
        const minBowlingSize = Math.max(
            2,
            Math.ceil(nextState.settings.oversPerInnings / nextState.settings.maxOversPerBowler)
        );
        let bowlerSeq = 1;
        while (bowlingTeam.players.length < minBowlingSize) {
            const candidate = `Bowler ${bowlerSeq++}`;
            if (!bowlingTeam.players.includes(candidate) && !battingTeam.players.includes(candidate)) {
                bowlingTeam.players.push(candidate);
            }
        }
    }

    const enteringNewInnings = wasPreMatch || (prevInningsNum !== nextInningsNum && nextInningsNum === 2);
    if (enteringNewInnings && (requestedPhase === 'PLAYING_INNINGS' || (requestedPhase === 'AUTO' && !isAlreadyFinishedByBallsOrChase))) {
        const availableBatters = battingTeam.players.filter(p => !live.outBatsmen.includes(p));
        if (payload.currentBatsman1 === undefined && !live.currentBatsman1 && availableBatters.length > 0) {
            live.currentBatsman1 = availableBatters[0];
        }
        const needPartner = !nextState.settings.allowSingleBatsman || live.wickets < battingTeam.players.length - 1;
        if (payload.currentBatsman2 === undefined && !live.currentBatsman2 && needPartner) {
            const partner = availableBatters.find(p => p !== live.currentBatsman1);
            if (partner) live.currentBatsman2 = partner;
        }
        if (payload.currentBowler === undefined && !live.currentBowler && live.balls % 6 !== 0 && bowlingTeam.players.length > 0) {
            live.currentBowler = bowlingTeam.players[0];
        }
    }

    for (const outName of live.outBatsmen) {
        if (!hasOwn(live.batsmen, outName)) {
            live.batsmen[outName] = { runs: 0, balls: 0, fours: 0, sixes: 0, active: false };
        }
    }

    if (live.currentBatsman1) {
        if (!hasOwn(live.batsmen, live.currentBatsman1)) {
            live.batsmen[live.currentBatsman1] = { runs: 0, balls: 0, fours: 0, sixes: 0, active: false };
        }
        if (payload.batsman1Stats) {
            const cleanB1 = Object.fromEntries(Object.entries(payload.batsman1Stats).filter(([, v]) => v !== undefined));
            live.batsmen[live.currentBatsman1] = { ...live.batsmen[live.currentBatsman1], ...cleanB1 };
        }
    }

    if (live.currentBatsman2) {
        if (!hasOwn(live.batsmen, live.currentBatsman2)) {
            live.batsmen[live.currentBatsman2] = { runs: 0, balls: 0, fours: 0, sixes: 0, active: false };
        }
        if (payload.batsman2Stats) {
            const cleanB2 = Object.fromEntries(Object.entries(payload.batsman2Stats).filter(([, v]) => v !== undefined));
            live.batsmen[live.currentBatsman2] = { ...live.batsmen[live.currentBatsman2], ...cleanB2 };
        }
    }

    if (live.currentBowler) {
        if (!hasOwn(live.bowlers, live.currentBowler)) {
            const cleanBw = payload.currentBowlerStats
                ? Object.fromEntries(Object.entries(payload.currentBowlerStats).filter(([, v]) => v !== undefined))
                : {};
            live.bowlers[live.currentBowler] = {
                runs: 0, balls: live.balls % 6, wickets: 0, maidens: 0, wides: 0, noballs: 0,
                ...cleanBw
            };
        } else {
            const existingBw = live.bowlers[live.currentBowler];
            const isUntouchedZeroEntry =
                existingBw.balls === 0 && existingBw.runs === 0 && existingBw.wickets === 0 &&
                !existingBw.maidens && !existingBw.wides && !existingBw.noballs;
            if (
                isUntouchedZeroEntry &&
                live.balls !== baseBallsBeforeOverride &&
                live.balls % 6 !== 0 &&
                payload.currentBowlerStats?.balls === undefined &&
                !(payload.bowlersOverrides && hasOwn(payload.bowlersOverrides, live.currentBowler) && payload.bowlersOverrides[live.currentBowler]?.balls !== undefined)
            ) {
                existingBw.balls = live.balls % 6;
            }
            if (payload.currentBowlerStats) {
                const cleanBw = Object.fromEntries(Object.entries(payload.currentBowlerStats).filter(([, v]) => v !== undefined));
                live.bowlers[live.currentBowler] = { ...live.bowlers[live.currentBowler], ...cleanBw };
            }
        }
    }

    let finalPhase: MatchPhase;
    if (requestedPhase !== 'AUTO') {
        finalPhase = requestedPhase;
    } else {
        const totalPlayers = battingTeam.players.length;
        const maxWickets = totalPlayers > 0
            ? (nextState.settings.allowSingleBatsman ? totalPlayers : Math.max(0, totalPlayers - 1))
            : Infinity;
        const allOut = totalPlayers > 0 && live.wickets >= maxWickets;
        if (nextInningsNum === 1) {
            finalPhase = (live.balls >= maxBalls || allOut) ? 'INNINGS_BREAK' : 'PLAYING_INNINGS';
        } else {
            const targetReached = nextState.match.target !== null && live.score >= nextState.match.target;
            finalPhase = (targetReached || live.balls >= maxBalls || allOut) ? 'MATCH_OVER' : 'PLAYING_INNINGS';
        }
    }

    // Promote lone Slot 2 survivor to currentBatsman1 in solo last-man-standing play
    if (
        finalPhase === 'PLAYING_INNINGS' &&
        nextState.settings.allowSingleBatsman &&
        battingTeam.players.length > 0 &&
        live.wickets === battingTeam.players.length - 1 &&
        !live.currentBatsman1 &&
        live.currentBatsman2
    ) {
        live.currentBatsman1 = live.currentBatsman2;
        live.currentBatsman2 = "";
    }

    for (const bName of Object.keys(live.batsmen)) {
        if (bName !== live.currentBatsman1 && bName !== live.currentBatsman2) {
            live.batsmen[bName].active = false;
        }
    }

    const shouldAssignActiveStriker =
        finalPhase === 'PLAYING_INNINGS' ||
        payload.activeStriker !== undefined ||
        hadAnyActiveBatter ||
        (payload.batsmenOverrides ? Object.values(payload.batsmenOverrides).some(s => !!s?.active) : false);

    if (shouldAssignActiveStriker) {
        const strikerSlot: 1 | 2 = payload.activeStriker ?? prevStrikerSlot;
        if (live.currentBatsman1 && live.currentBatsman2) {
            live.batsmen[live.currentBatsman1].active = (strikerSlot === 1);
            live.batsmen[live.currentBatsman2].active = (strikerSlot === 2);
        } else if (live.currentBatsman1 && hasOwn(live.batsmen, live.currentBatsman1)) {
            live.batsmen[live.currentBatsman1].active = true;
        } else if (live.currentBatsman2 && hasOwn(live.batsmen, live.currentBatsman2)) {
            live.batsmen[live.currentBatsman2].active = true;
        }
    }

    reconcileInningsOvers(live, nextState.settings);
    nextState.matchStarted = true;
    nextState.phase = finalPhase;

    if (finalPhase === 'INNINGS_BREAK') {
        flushPartialOverLog(live, poppedBowler || 'Unknown');
        nextState.match.liveInnings = live;
        battingTeam.innings = [JSON.parse(JSON.stringify(live))];
        bowlingTeam.innings = [];
        nextState.match.target = (payload.target !== undefined && payload.target !== null) ? payload.target : (live.score + 1);
        nextState.match.matchOver = false;
    } else if (finalPhase === 'MATCH_OVER') {
        flushPartialOverLog(live, poppedBowler || 'Unknown');
        nextState.match.liveInnings = live;
        battingTeam.innings = [JSON.parse(JSON.stringify(live))];
        if (nextInningsNum === 1) {
            bowlingTeam.innings = [];
            if (payload.target !== undefined) nextState.match.target = payload.target;
        }
        nextState.match.matchOver = true;
    } else {
        nextState.match.liveInnings = live;
        battingTeam.innings = [];
        if (nextInningsNum === 1) {
            bowlingTeam.innings = [];
            nextState.match.target = payload.target !== undefined ? payload.target : null;
        }
        nextState.match.matchOver = false;
    }
}
