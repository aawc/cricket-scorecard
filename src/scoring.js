// scoring.js
import { gameState, saveHistory } from './state.js';

export function rotateStrike() {
    const live = gameState.match.liveInnings;
    if (live.currentBatsman1 && live.currentBatsman2 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman2]) {
        live.batsmen[live.currentBatsman1].active = !live.batsmen[live.currentBatsman1].active;
        live.batsmen[live.currentBatsman2].active = !live.batsmen[live.currentBatsman2].active;
    }
}

export function addRuns(runs) {
    if (gameState.match.matchOver) return null;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += runs;
    live.balls++;
    
    const bowler = live.bowlers[live.currentBowler];
    if (bowler) {
        bowler.balls++;
        bowler.runs += runs;
    } else {
        console.error(`addRuns: Bowler "${live.currentBowler}" not found in bowlers stats.`);
    }

    const activeBatsman = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[activeBatsman];
    if (activeB) {
        activeB.runs += runs;
        activeB.balls++;
    }

    live.overLog.push(runs.toString());

    if (runs % 2 !== 0) {
        rotateStrike();
    }

    const events = [];
    
    const overResult = checkOverComplete();
    if (overResult) events.push(overResult);
    
    const matchResult = checkMatchOver();
    if (matchResult) events.push(matchResult);
    
    if (events.length === 0) {
        events.push({ type: 'delivery_processed' });
    }
    
    return events;
}

export function addLegBye() {
    if (gameState.match.matchOver) return null;
    if (!gameState.settings.enableLegByes) {
        console.error("addLegBye: Leg byes are disabled in settings.");
        return null;
    }
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += 1;
    live.extras.legbyes += 1;
    live.balls++;
    const bowler = live.bowlers[live.currentBowler];
    if (bowler) {
        bowler.balls++;
    } else {
        console.error(`addLegBye: Bowler "${live.currentBowler}" not found in bowlers stats.`);
    }
    live.overLog.push('lb1');
    
    const events = [];
    const overResult = checkOverComplete();
    if (overResult) events.push(overResult);
    
    const matchResult = checkMatchOver();
    if (matchResult) events.push(matchResult);

    if (events.length === 0) {
        events.push({ type: 'delivery_processed' });
    }
    return events;
}

export function addWicket() {
    if (gameState.match.matchOver) return null;
    saveHistory();
    const live = gameState.match.liveInnings;
    
    const activeBatsmanName = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[activeBatsmanName];
    if (activeB) {
        activeB.balls++;
    }

    live.wickets++;
    live.balls++;
    
    const bowler = live.bowlers[live.currentBowler];
    if (bowler) {
        bowler.balls++;
        bowler.wickets++;
    }
    
    live.overLog.push('W');

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const totalPlayers = battingTeam.players.length;
    const maxWickets = gameState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    const events = [];

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        if (gameState.match.currentInnings === 1) {
            events.push({ type: 'innings_complete', reason: 'all_out' });
        } else {
            events.push({ type: 'match_complete', winner: 'defending', result: 'win' });
        }
        return events;
    }

    live.outBatsmen.push(activeBatsmanName);
    
    if (live.currentBatsman1 === activeBatsmanName) {
        live.currentBatsman1 = "";
    } else {
        live.currentBatsman2 = "";
    }
    
    if (gameState.settings.allowSingleBatsman && live.wickets === totalPlayers - 1) {
        if (live.currentBatsman2) {
            live.currentBatsman1 = live.currentBatsman2;
            live.currentBatsman2 = "";
        }
        if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) {
            live.batsmen[live.currentBatsman1].active = true;
        }
    }

    const overResult = checkOverComplete();
    if (overResult) events.push(overResult);
    
    const matchResult = checkMatchOver();
    if (matchResult) events.push(matchResult);

    events.push({ type: 'wicket_processed', outBatsman: activeBatsmanName });
    return events;
}

export function executeRunOutWicket(isStriker, extraRuns, accrueTo) {
    const live = gameState.match.liveInnings;
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;
    const outBatsmanName = isStriker ? striker : nonStriker;

    if (!outBatsmanName) return null;

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
        live.bowlers[live.currentBowler].balls++;
    }
    
    let logStr = 'W-RO';
    if (extraRuns > 0) {
        logStr = `${extraRuns}${accrueTo === 'byes' ? 'b' : ''}+W-RO`;
    }
    live.overLog.push(logStr);

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const totalPlayers = battingTeam.players.length;
    const maxWickets = gameState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    const events = [];

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        if (gameState.match.currentInnings === 1) {
            events.push({ type: 'innings_complete', reason: 'all_out' });
        } else {
            events.push({ type: 'match_complete', winner: 'defending', result: 'win' });
        }
        return events;
    }

    live.outBatsmen.push(outBatsmanName);
    
    if (live.currentBatsman1 === outBatsmanName) {
        live.currentBatsman1 = "";
    } else {
        live.currentBatsman2 = "";
    }
    
    if (gameState.settings.allowSingleBatsman && live.wickets === totalPlayers - 1) {
        if (live.currentBatsman2) {
            live.currentBatsman1 = live.currentBatsman2;
            live.currentBatsman2 = "";
        }
        if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) {
            live.batsmen[live.currentBatsman1].active = true;
        }
    }

    const overResult = checkOverComplete();
    if (overResult) events.push(overResult);
    
    const matchResult = checkMatchOver();
    if (matchResult) events.push(matchResult);

    events.push({ type: 'runout_processed', outBatsman: outBatsmanName });
    return events;
}

export function finalizeDelivery(type, extraRuns, accrueTo, pendingRunOutStriker = true) {
    if (gameState.match.matchOver) return null;
    saveHistory();
    const live = gameState.match.liveInnings;
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[striker];
    const bowler = live.bowlers[live.currentBowler];

    const events = [];

    if (type === 'wide') {
        const totalRuns = gameState.settings.widePenalty + extraRuns;
        live.score += totalRuns;
        live.extras.wides += gameState.settings.widePenalty;
        if (bowler) {
            bowler.runs += totalRuns;
            bowler.wides = (bowler.wides || 0) + 1;
        }

        if (extraRuns > 0) {
            if (accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        live.overLog.push(extraRuns > 0 ? `wd+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'wd');
    } else if (type === 'noball') {
        const totalRuns = gameState.settings.noBallPenalty + extraRuns;
        live.score += totalRuns;
        live.extras.noballs += gameState.settings.noBallPenalty;
        if (bowler) {
            bowler.runs += totalRuns;
            bowler.noballs = (bowler.noballs || 0) + 1;
        }
        if (activeB) activeB.balls++;

        if (extraRuns > 0) {
            if (accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        live.overLog.push(extraRuns > 0 ? `nb+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'nb');
    } else if (type === 'runout') {
        live.score += extraRuns;
        if (bowler) bowler.runs += extraRuns;
        
        if (extraRuns > 0) {
            if (accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        const roEvents = executeRunOutWicket(pendingRunOutStriker, extraRuns, accrueTo);
        if (roEvents) events.push(...roEvents);
        return events;
    } else if (type === 'bye') {
        const totalByes = 1 + extraRuns;
        live.score += totalByes;
        live.extras.byes += totalByes;
        
        live.balls++;
        if (bowler) bowler.balls++;
        if (activeB) activeB.balls++;
        
        live.overLog.push(`${totalByes}b`);
        const overResult = checkOverComplete();
        if (overResult) events.push(overResult);
    }

    let physicalRuns = extraRuns;
    if (type === 'bye') {
        physicalRuns = 1 + extraRuns;
    }
    if (physicalRuns % 2 !== 0) {
        rotateStrike();
    }

    const matchResult = checkMatchOver();
    if (matchResult) events.push(matchResult);

    if (events.length === 0) {
        events.push({ type: 'delivery_processed' });
    }
    return events;
}

export function checkOverComplete() {
    const live = gameState.match.liveInnings;
    if (live.balls % 6 === 0 && live.balls > 0) {
        rotateStrike();
        
        live.overs.push({
            bowler: live.currentBowler,
            balls: [...live.overLog]
        });
        
        live.overLog = [];
        
        const maxBalls = gameState.settings.oversPerInnings * 6;
        if (live.balls >= maxBalls && gameState.match.currentInnings === 1) {
            return { type: 'innings_complete', reason: 'overs_reached' };
        }
        
        live.previousBowler = live.currentBowler;
        live.currentBowler = ""; // Force selection
        return { type: 'over_complete' };
    }
    return null;
}

export function checkMatchOver() {
    const live = gameState.match.liveInnings;
    const settings = gameState.settings;
    const match = gameState.match;

    if (settings.totalInnings === 1 && match.currentInnings === 2) {
        const target = match.target;
        const maxBalls = settings.oversPerInnings * 6;
        const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
        const totalPlayers = battingTeam.players.length;
        const maxWickets = settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

        if (live.score >= target) {
            return { type: 'match_complete', winner: battingTeam.name, result: 'win' };
        } else if (live.wickets >= maxWickets) {
            return { type: 'match_complete', winner: 'defending', result: 'win' };
        } else if (live.balls >= maxBalls) {
             if (live.score === target - 1) {
                 return { type: 'match_complete', result: 'tie' };
             } else {
                 return { type: 'match_complete', winner: 'defending', result: 'win' };
             }
        }
    }
    return null;
}

export function archiveLiveInnings() {
    const live = gameState.match.liveInnings;
    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    if (live.overLog.length > 0) {
        live.overs.push({
            bowler: live.currentBowler,
            balls: [...live.overLog]
        });
        live.overLog = [];
    }
    battingTeam.innings.push(JSON.parse(JSON.stringify(live)));
}

export function prepareEndInnings() {
    archiveLiveInnings();
    const live = gameState.match.liveInnings;
    let targetSet = null;
    if (gameState.settings.totalInnings === 1 && gameState.match.currentInnings === 1) {
        gameState.match.target = live.score + 1;
        targetSet = gameState.match.target;
    }
    return targetSet;
}

export function startNextInnings() {
    gameState.match.currentBattingTeam = gameState.match.currentBattingTeam === 1 ? 2 : 1;
    gameState.match.currentInnings++;
    
    const isGameOver = gameState.match.currentInnings > gameState.settings.totalInnings * 2;
    if (isGameOver) {
        return { event: 'match_over_limit' };
    }
    
    gameState.match.liveInnings = {
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
    
    return { event: 'innings_started' };
}

export function startMatchEngine(battingTeamNum) {
    gameState.match.currentBattingTeam = battingTeamNum;
    gameState.match.liveInnings = {
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

    gameState.matchStarted = true;
    gameState.history = [];
    gameState.match.target = null;
    gameState.match.matchOver = false;
}

export function initBatsmanStats(name, active) {
    if (name && !gameState.match.liveInnings.batsmen[name]) {
        gameState.match.liveInnings.batsmen[name] = { runs: 0, balls: 0, active: active };
    }
}

export function initBowlerStats(name) {
    if (name && !gameState.match.liveInnings.bowlers[name]) {
        gameState.match.liveInnings.bowlers[name] = { runs: 0, balls: 0, wickets: 0, wides: 0, noballs: 0 };
    }
}

export function autoSelectEligiblePlayers() {
    const live = gameState.match.liveInnings;
    if (!live) return;

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const bowlingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team2 : gameState.match.team1;
    if (!battingTeam || !bowlingTeam) return;

    const eligibleBatsmen = battingTeam.players.filter(p => !live.outBatsmen.includes(p));

    if (!live.currentBatsman1) {
        const candidates = eligibleBatsmen.filter(p => p !== live.currentBatsman2);
        if (candidates.length === 1) {
            live.currentBatsman1 = candidates[0];
            initBatsmanStats(candidates[0], true);
        }
    }

    if (!live.currentBatsman2 && (live.wickets < battingTeam.players.length - 1 || !gameState.settings.allowSingleBatsman)) {
        const candidates = eligibleBatsmen.filter(p => p !== live.currentBatsman1);
        if (candidates.length === 1) {
            live.currentBatsman2 = candidates[0];
            initBatsmanStats(candidates[0], false);
        }
    }

    if (!live.currentBowler) {
        const maxBalls = gameState.settings.maxOversPerBowler * 6;
        const candidates = bowlingTeam.players.filter(p => {
            const stats = live.bowlers[p] || { balls: 0 };
            return p !== live.previousBowler && stats.balls < maxBalls;
        });
        if (candidates.length === 1) {
            live.currentBowler = candidates[0];
            initBowlerStats(candidates[0]);
        }
    }
}

export function changeBatsman(batsmanNumber, newName) {
    saveHistory();
    const live = gameState.match.liveInnings;
    if (batsmanNumber === 1) {
        live.currentBatsman1 = newName;
        initBatsmanStats(newName, true);
    } else {
        live.currentBatsman2 = newName;
        initBatsmanStats(newName, false);
    }
}

export function changeBowler(newName) {
    saveHistory();
    gameState.match.liveInnings.currentBowler = newName;
    initBowlerStats(newName);
}
