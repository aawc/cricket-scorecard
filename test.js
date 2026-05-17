const fs = require('fs');
const path = require('path');

// Mock DOM with state retention
const elements = {};
global.document = {
    createElement: function(tagName) {
        const elem = {
            value: '',
            textContent: '',
            innerHTML: '',
            classes: new Set(),
            appendChild: () => {},
            remove: () => {},
            querySelector: () => ({ addEventListener: () => {}, textContent: '', remove: () => {}, classList: { add: () => {}, remove: () => {} } }),
            querySelectorAll: () => [],
            addEventListener: () => {},
            dataset: {}
        };
        elem.classList = {
            add: function(c) { elem.classes.add(c); },
            remove: function(c) { elem.classes.delete(c); },
            contains: function(c) { return elem.classes.has(c); }
        };
        return elem;
    },
    getElementById: function(id) {
        if (!elements[id]) {
            const elem = {
                value: '',
                textContent: '',
                classes: new Set(),
                appendChild: () => {},
                innerHTML: '',
                querySelector: () => ({ addEventListener: () => {}, textContent: '', classList: { add: () => {}, remove: () => {} }, dataset: {} }),
                querySelectorAll: () => [],
                addEventListener: () => {},
                dataset: {},
                parentElement: {
                    classList: {
                        add: () => {},
                        remove: () => {},
                        contains: () => false
                    }
                }
            };
            elem.classList = {
                add: function(c) { elem.classes.add(c); },
                remove: function(c) { elem.classes.delete(c); },
                contains: function(c) { return elem.classes.has(c); }
            };
            elements[id] = elem;
        }
        return elements[id];
    },

    querySelector: function(selector) {
        // Handle class selector for flip-container
        if (selector === '.flip-container') {
             if (!elements['flip-container']) {
                 const elem = {
                     classes: new Set()
                 };
                 elem.classList = {
                     add: function(c) { elem.classes.add(c); },
                     remove: function(c) { elem.classes.delete(c); },
                     contains: function(c) { return elem.classes.has(c); }
                 };
                 elements['flip-container'] = elem;
             }
             return elements['flip-container'];
        }
        return {
            classList: { add: () => {}, remove: () => {}, contains: () => false }
        };
    },
    querySelectorAll: function(selector) {
        return [];
    },
    documentElement: {
        setAttribute: () => {},
        getAttribute: () => 'light'
    },
    body: {
        classList: {
            add: function(c) { this.classes.add(c); },
            remove: function(c) { this.classes.delete(c); },
            contains: function(c) { return this.classes.has(c); }
        },
        classes: new Set()
    }
};

global.window = {
    location: { search: '', pathname: '', origin: '' },
    history: { replaceState: () => {}, pushState: () => {} },
    addEventListener: () => {}
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};

global.navigator = {
    clipboard: { writeText: () => Promise.resolve() },
    serviceWorker: { register: () => Promise.resolve() }
};

global.alert = () => {};

// Load app.js
const appJsCode = fs.readFileSync(path.resolve(__dirname, 'app.js'), 'utf-8');
// Make gameState global so we can access it in tests
const modifiedCode = appJsCode.replace('let gameState =', 'global.gameState =');
eval(modifiedCode);

console.log("Running tests...");

// Helper to reset state for testing
function resetTestState() {
    gameState.settings = {
        totalInnings: 1,
        oversPerInnings: 8,
        maxOversPerBowler: 2,
        widePenalty: 1,
        noBallPenalty: 1,
        allowSingleBatsman: true,
        theme: 'light',
        enableLegByes: false
    };
    gameState.match = {
        currentInnings: 1,
        currentBattingTeam: 1,
        team1: { name: "Team 1", players: ["P1", "P2"], innings: [] },
        team2: { name: "Team 2", players: ["B1", "B2"], innings: [] },
        liveInnings: {
            score: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
            batsmen: {
                "P1": { runs: 0, balls: 0, active: true },
                "P2": { runs: 0, balls: 0, active: false }
            },
            bowlers: {
                "B1": { runs: 0, balls: 0, wickets: 0 }
            },
            currentBatsman1: "P1",
            currentBatsman2: "P2",
            currentBowler: "B1",
            previousBowler: null,
            outBatsmen: [],
            overLog: []
        },
        target: null,
        matchOver: false
    };
    gameState.matchStarted = true;
    gameState.history = [];
    
    // Clear mocked elements
    for (const id in elements) {
        delete elements[id];
    }
}

// Test 1: Initial state
resetTestState();
if (gameState.match.currentInnings !== 1) {
    console.error("Test 1 Failed: currentInnings should be 1");
    process.exit(1);
}

// Test 2: addRuns
resetTestState();
addRuns(4);
if (gameState.match.liveInnings.score !== 4) {
    console.error("Test 2 Failed: Score should be 4");
    process.exit(1);
}
if (gameState.match.liveInnings.balls !== 1) {
    console.error("Test 2 Failed: Balls should be 1");
    process.exit(1);
}

// Test 3: Strike Rotation on odd runs
resetTestState();
addRuns(1);
if (!gameState.match.liveInnings.batsmen["P2"].active) {
    console.error("Test 3 Failed: Strike should rotate to P2");
    process.exit(1);
}

// Test 4: Wide
resetTestState();
triggerExtraRunsModal('wide');
if (gameState.match.liveInnings.score !== 1) {
    console.error("Test 4 Failed: Score should be 1 on wide");
    process.exit(1);
}

// Test 5: Wicket
resetTestState();
addWicket();
if (gameState.match.liveInnings.wickets !== 1) {
    console.error("Test 5 Failed: Wickets should be 1");
    process.exit(1);
}

// Test 6: Innings end on max overs
resetTestState();
gameState.settings.oversPerInnings = 1; // 6 balls
// Bowl 6 balls
for(let i=0; i<6; i++) addRuns(1);
if (gameState.match.currentInnings !== 2) {
    console.error("Test 6 Failed: Innings should have ended after 1 over");
    process.exit(1);
}

// Test 7: 2nd Innings Stats (CRR/RRR)
resetTestState();
gameState.match.currentInnings = 2;
gameState.match.target = 10;
gameState.settings.oversPerInnings = 1; // 6 balls
gameState.match.liveInnings.balls = 3;
gameState.match.liveInnings.score = 3;

updateUI();

const targetDisplay = elements['target-display'];
if (!targetDisplay) {
    console.error("Test 7 Failed: target-display element not found in mock");
    process.exit(1);
}

// CRR = (3 / 3) * 6 = 6.00
// RRR = ((10 - 3) / 3) * 6 = 14.00
const expectedText = "Target: 10 | CRR: 6.00 | RRR: 14.00";
if (targetDisplay.textContent !== expectedText) {
    console.error(`Test 7 Failed: Expected "${expectedText}", got "${targetDisplay.textContent}"`);
    process.exit(1);
}

// Test 8: Run Out specification (Striker vs Non-Striker)
resetTestState();
gameState.settings.allowSingleBatsman = false;
gameState.match.team1.players = ["P1", "P2", "P3"];
// P1 is striker (active), P2 is non-striker
// Mock confirm to return false (Non-striker run out)
global.confirm = () => false;
triggerRunOutModal();

if (gameState.match.liveInnings.wickets !== 1) {
    console.error("Test 8 Failed: Wickets should be 1 on run out");
    process.exit(1);
}
if (gameState.match.liveInnings.balls !== 1) {
    console.error("Test 8 Failed: Balls should be 1 on run out");
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].wickets !== 0) {
    console.error("Test 8 Failed: Bowler wickets should remain 0 on run out");
    process.exit(1);
}
if (!gameState.match.liveInnings.outBatsmen.includes("P2")) {
    console.error("Test 8 Failed: Non-striker P2 should be out");
    process.exit(1);
}
if (gameState.match.liveInnings.batsmen["P1"].balls !== 1) {
    console.error("Test 8 Failed: Striker P1 should have faced 1 ball");
    process.exit(1);
}

// Test 9: Wide + extra runs (Byes)
resetTestState();
global.mockExtraRuns = 2;
global.mockAccrueTo = 'byes';
triggerExtraRunsModal('wide');

if (gameState.match.liveInnings.score !== 3) { // 1 wide penalty + 2 byes = 3
    console.error(`Test 9 Failed: Score should be 3, got ${gameState.match.liveInnings.score}`);
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].runs !== 3) {
    console.error(`Test 9 Failed: Bowler runs should be 3, got ${gameState.match.liveInnings.bowlers["B1"].runs}`);
    process.exit(1);
}
if (gameState.match.liveInnings.extras.byes !== 2) {
    console.error(`Test 9 Failed: Byes should be 2, got ${gameState.match.liveInnings.extras.byes}`);
    process.exit(1);
}
if (gameState.match.liveInnings.balls !== 0) {
    console.error(`Test 9 Failed: Balls should be 0 on wide`);
    process.exit(1);
}

// Test 10: No Ball + extra runs (Batsman)
resetTestState();
global.mockExtraRuns = 4;
global.mockAccrueTo = 'batsman';
triggerExtraRunsModal('noball');

if (gameState.match.liveInnings.score !== 5) { // 1 noball penalty + 4 = 5
    console.error(`Test 10 Failed: Score should be 5, got ${gameState.match.liveInnings.score}`);
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].runs !== 5) {
    console.error(`Test 10 Failed: Bowler runs should be 5`);
    process.exit(1);
}
if (gameState.match.liveInnings.batsmen["P1"].runs !== 4) {
    console.error(`Test 10 Failed: Batsman P1 runs should be 4`);
    process.exit(1);
}

// Test 11: Run Out + extra runs (Batsman)
resetTestState();
gameState.settings.allowSingleBatsman = false;
gameState.match.team1.players = ["P1", "P2", "P3"];
global.confirm = () => true; // Striker P1 run out
global.mockExtraRuns = 2;
global.mockAccrueTo = 'batsman';
triggerRunOutModal();

if (gameState.match.liveInnings.score !== 2) {
    console.error(`Test 11 Failed: Score should be 2 on run out + 2`);
    process.exit(1);
}
if (gameState.match.liveInnings.batsmen["P1"].runs !== 2) {
    console.error(`Test 11 Failed: Striker P1 runs should be 2`);
    process.exit(1);
}
if (gameState.match.liveInnings.wickets !== 1) {
    console.error(`Test 11 Failed: Wickets should be 1`);
    process.exit(1);
}
if (gameState.match.liveInnings.balls !== 1) {
    console.error(`Test 11 Failed: Balls should be 1`);
    process.exit(1);
}

// Test 12: Bowler extras tracking in Full Scorecard mode
resetTestState();
global.mockExtraRuns = 2;
global.mockAccrueTo = 'byes';
triggerExtraRunsModal('wide');
triggerExtraRunsModal('noball');

const b1 = gameState.match.liveInnings.bowlers["B1"];
if (!b1 || b1.wides !== 1) {
    console.error(`Test 12 Failed: Bowler B1 wides should be 1`);
    process.exit(1);
}
if (b1.noballs !== 1) {
    console.error(`Test 12 Failed: Bowler B1 noballs should be 1`);
    process.exit(1);
}

console.log("All tests passed!");
