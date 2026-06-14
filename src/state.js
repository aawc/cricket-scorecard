// state.js

export let gameState = {
    settings: {
        totalInnings: 1,
        oversPerInnings: 8,
        maxOversPerBowler: 2,
        widePenalty: 1,
        noBallPenalty: 1,
        allowSingleBatsman: true,
        theme: 'light',
        enableLegByes: false
    },
    match: {
        currentInnings: 1,
        currentBattingTeam: 1,
        team1: { name: "Team 1", players: [], innings: [] },
        team2: { name: "Team 2", players: [], innings: [] },
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
    },
    matchStarted: false,
    history: []
};

export function setGameState(newState) {
    for (const key in gameState) {
        delete gameState[key];
    }
    Object.assign(gameState, newState);
}

export function saveHistory() {
    gameState.history.push(JSON.parse(JSON.stringify(gameState.match)));
}

export function undo() {
    if (gameState.history.length > 0) {
        gameState.match = gameState.history.pop();
        return true;
    }
    return false;
}

export function resetMatchState() {
    gameState.match = {
        currentInnings: 1,
        currentBattingTeam: 1,
        team1: { name: "Team 1", players: gameState.match.team1.players, innings: [] },
        team2: { name: "Team 2", players: gameState.match.team2.players, innings: [] },
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
    gameState.history = [];
    gameState.matchStarted = false;
}
