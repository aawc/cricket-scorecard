import { reducer } from './reducer.js';
import { saveState } from './storage.js';
import { GameState, Action } from './types.js';

export let gameState: GameState = {
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
    phase: 'SETUP',
    uiEvents: [],
    history: []
};

export function setGameState(newState: GameState): void {
    if (newState === gameState) return;
    
    // Clear elements in place to preserve reference
    const keys = Object.keys(gameState) as Array<keyof GameState>;
    for (const key of keys) {
        delete (gameState as any)[key];
    }
    Object.assign(gameState, newState);
}

function saveHistory(state: GameState): void {
    const copy = JSON.parse(JSON.stringify(state)) as GameState;
    delete (copy as any).history;
    state.history.push(copy);
}

function isUndoableAction(actionType: string): boolean {
    const nonUndoable = ['START_MATCH', 'CHOOSE_TOSS_BATTING', 'RESET_MATCH', 'UNDO'];
    return !nonUndoable.includes(actionType);
}

export function dispatch(action: Action): void {
    if (isUndoableAction(action.type)) {
        saveHistory(gameState);
    }

    const nextState = reducer(gameState, action);
    setGameState(nextState);
    saveState(gameState);
}
