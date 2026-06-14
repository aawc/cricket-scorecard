import { GameState, Action, LiveInnings, Team, MatchPhase, BowlerStats, BatsmanStats } from './types.js';

const PHASE_ACTIONS: Record<MatchPhase, string[]> = {
    'SETUP': ['START_MATCH'],
    'TOSS': ['CHOOSE_TOSS_BATTING', 'RESET_MATCH'],
    'PLAYING_INNINGS': ['ADD_RUNS', 'ADD_LEG_BYE', 'ADD_WICKET', 'FINALIZE_DELIVERY', 'CHANGE_BATSMAN', 'CHANGE_BOWLER', 'UNDO', 'FORCE_END_INNINGS', 'RESET_MATCH'],
    'INNINGS_BREAK': ['START_NEXT_INNINGS', 'UNDO', 'RESET_MATCH'],
    'MATCH_OVER': ['RESET_MATCH', 'UNDO']
};

function isValidActionForPhase(phase: MatchPhase, actionType: string): boolean {
    const allowed = PHASE_ACTIONS[phase || 'SETUP'];
    return allowed ? allowed.includes(actionType) : false;
}

export function reducer(state: GameState, action: Action): GameState {
    const currentPhase = state.phase || 'SETUP';

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
            
            nextState.match.liveInnings = {
                score: 0,
                wickets: 0,
                balls: 0,
                extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
                batsmen: {},
                bowlers: {},
                currentBatsman1: "",
                currentBatsman2: "",
                currentBowler: "",
                previousBowler: null,
                outBatsmen: [],
                overs: [],
                overLog: []
            };

            nextState.match.target = null;
            nextState.match.matchOver = false;
            nextState.phase = 'PLAYING_INNINGS';
            break;
        }
        
        case 'FORCE_END_INNINGS': {
            const match = nextState.match;
            archiveLiveInnings(match);
            match.target = match.liveInnings.score + 1;
            nextState.phase = 'INNINGS_BREAK';
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

            const activeBatsman = (live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active) 
                ? live.currentBatsman1 
                : (live.currentBatsman2 || '');
            const activeB = live.batsmen[activeBatsman];
            if (activeB) {
                activeB.runs += runs;
                activeB.balls++;
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
            live.overLog.push('lb1');

            checkMatchOver(nextState) || checkOverComplete(nextState);
            break;
        }

        case 'ADD_WICKET': {
            const live = nextState.match.liveInnings;
            const activeBatsmanName = (live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active)
                ? live.currentBatsman1
                : (live.currentBatsman2 || '');
            const activeB = live.batsmen[activeBatsmanName];
            if (activeB) {
                activeB.balls++;
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

            const battingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team1 : nextState.match.team2;
            const totalPlayers = battingTeam.players.length;
            const maxWickets = nextState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

            if (live.wickets >= maxWickets && totalPlayers > 0) {
                handleAllOut(nextState);
                break;
            }

            live.outBatsmen.push(activeBatsmanName);
            if (live.currentBatsman1 === activeBatsmanName) {
                live.currentBatsman1 = "";
            } else {
                live.currentBatsman2 = "";
            }

            enforceSingleBatsmanRule(nextState, battingTeam, totalPlayers);
            checkMatchOver(nextState) || checkOverComplete(nextState);
            break;
        }

        case 'FINALIZE_DELIVERY': {
            const { type, extraRuns, accrueTo, pendingRunOutStriker } = action.payload;
            const live = nextState.match.liveInnings;
            const striker = (live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active)
                ? live.currentBatsman1
                : (live.currentBatsman2 || '');
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
                    if (accrueTo === 'batsman' && activeB) activeB.runs += extraRuns;
                    else live.extras.byes += extraRuns;
                }
                live.overLog.push(extraRuns > 0 ? `wd+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'wd');
            } else if (type === 'noball') {
                const totalRuns = nextState.settings.noBallPenalty + extraRuns;
                live.score += totalRuns;
                live.extras.noballs += nextState.settings.noBallPenalty;
                if (bowler) {
                    bowler.runs += totalRuns;
                    bowler.noballs = (bowler.noballs || 0) + 1;
                }
                if (activeB) activeB.balls++;
                if (extraRuns > 0) {
                    if (accrueTo === 'batsman' && activeB) activeB.runs += extraRuns;
                    else live.extras.byes += extraRuns;
                }
                live.overLog.push(extraRuns > 0 ? `nb+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'nb');
            } else if (type === 'runout') {
                live.score += extraRuns;
                if (bowler) bowler.runs += extraRuns;
                if (extraRuns > 0) {
                    if (accrueTo === 'batsman' && activeB) activeB.runs += extraRuns;
                    else live.extras.byes += extraRuns;
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
                checkOverComplete(nextState);
            }

            let physicalRuns = extraRuns;
            if (type === 'bye') {
                physicalRuns = 1 + extraRuns;
            }
            if (physicalRuns % 2 !== 0) {
                rotateStrike(live);
            }

            checkMatchOver(nextState);
            break;
        }

        case 'CHANGE_BATSMAN': {
            const { slot, name } = action.payload;
            const live = nextState.match.liveInnings;
            if (slot === 1) {
                live.currentBatsman1 = name;
                initBatsmanStats(live, name, true);
            } else {
                live.currentBatsman2 = name;
                initBatsmanStats(live, name, false);
            }
            break;
        }

        case 'CHANGE_BOWLER': {
            const { name } = action.payload;
            const live = nextState.match.liveInnings;
            live.currentBowler = name;
            initBowlerStats(live, name);
            break;
        }

        case 'START_NEXT_INNINGS': {
            nextState.match.currentBattingTeam = nextState.match.currentBattingTeam === 1 ? 2 : 1;
            nextState.match.currentInnings++;
            
            nextState.match.liveInnings = {
                score: 0,
                wickets: 0,
                balls: 0,
                extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
                batsmen: {},
                bowlers: {},
                currentBatsman1: "",
                currentBatsman2: "",
                currentBowler: "",
                previousBowler: null,
                outBatsmen: [],
                overs: [],
                overLog: []
            };

            nextState.phase = 'PLAYING_INNINGS';
            break;
        }

        case 'RESET_MATCH': {
            nextState.match = {
                currentInnings: 1,
                currentBattingTeam: 1,
                team1: { name: "Team 1", players: nextState.match.team1.players, innings: [] },
                team2: { name: "Team 2", players: nextState.match.team2.players, innings: [] },
                liveInnings: {
                    score: 0,
                    wickets: 0,
                    balls: 0,
                    extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
                    batsmen: {},
                    bowlers: {},
                    currentBatsman1: "",
                    currentBatsman2: "",
                    currentBowler: "",
                    previousBowler: null,
                    outBatsmen: [],
                    overs: [],
                    overLog: []
                },
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
    }

    if (nextState.phase === 'PLAYING_INNINGS') {
        autoSelectEligiblePlayers(nextState);
    }

    return nextState;
}

function rotateStrike(live: LiveInnings): void {
    if (live.currentBatsman1 && live.currentBatsman2 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman2]) {
        live.batsmen[live.currentBatsman1].active = !live.batsmen[live.currentBatsman1].active;
        live.batsmen[live.currentBatsman2].active = !live.batsmen[live.currentBatsman2].active;
    }
}

function initBatsmanStats(live: LiveInnings, name: string, active: boolean): void {
    if (name && !live.batsmen[name]) {
        live.batsmen[name] = { runs: 0, balls: 0, active: active };
    }
}

function initBowlerStats(live: LiveInnings, name: string): void {
    if (name && !live.bowlers[name]) {
        live.bowlers[name] = { runs: 0, balls: 0, wickets: 0, wides: 0, noballs: 0 };
    }
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

        let matchOver = false;
        let alertMessage = "";

        if (live.score >= target) {
            matchOver = true;
            alertMessage = `Match Over! ${battingTeam.name} wins!`;
        } else if (live.wickets >= maxWickets) {
            matchOver = true;
            const bowlingTeam = match.currentBattingTeam === 1 ? match.team2 : match.team1;
            alertMessage = `Match Over! ${bowlingTeam.name} wins!`;
        } else if (live.balls >= maxBalls) {
            matchOver = true;
            const bowlingTeam = match.currentBattingTeam === 1 ? match.team2 : match.team1;
            if (live.score === target - 1) {
                alertMessage = `Match Over! Match Tied!`;
            } else {
                alertMessage = `Match Over! ${bowlingTeam.name} wins!`;
            }
        }

        if (matchOver) {
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
        const bowlingTeam = match.currentBattingTeam === 1 ? match.team2 : match.team1;
        match.matchOver = true;
        nextState.phase = 'MATCH_OVER';
        nextState.uiEvents.push({
            type: 'SHOW_ALERT',
            payload: {
                title: 'Match Over',
                message: `Match Over! ${bowlingTeam.name} wins!`
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
    const striker = (live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active)
        ? live.currentBatsman1
        : (live.currentBatsman2 || '');
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

    const battingTeam = nextState.match.currentBattingTeam === 1 ? nextState.match.team1 : nextState.match.team2;
    const totalPlayers = battingTeam.players.length;
    const maxWickets = nextState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        handleAllOut(nextState);
        return;
    }

    live.outBatsmen.push(outBatsmanName);
    if (live.currentBatsman1 === outBatsmanName) {
        live.currentBatsman1 = "";
    } else {
        live.currentBatsman2 = "";
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
            live.currentBatsman1 = candidates[0];
            initBatsmanStats(live, candidates[0], true);
        }
    }

    if (!live.currentBatsman2 && (live.wickets < battingTeam.players.length - 1 || !nextState.settings.allowSingleBatsman)) {
        const candidates = eligibleBatsmen.filter(p => p !== live.currentBatsman1);
        if (candidates.length === 1) {
            live.currentBatsman2 = candidates[0];
            initBatsmanStats(live, candidates[0], false);
        }
    }

    if (!live.currentBowler) {
        const maxBalls = nextState.settings.maxOversPerBowler * 6;
        const candidates = bowlingTeam.players.filter(p => {
            const stats = live.bowlers[p] || { balls: 0 };
            return p !== live.previousBowler && stats.balls < maxBalls;
        });
        if (candidates.length === 1) {
            live.currentBowler = candidates[0];
            initBowlerStats(live, candidates[0]);
        }
    }
}
