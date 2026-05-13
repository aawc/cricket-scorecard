const fs = require('fs');
const path = require('path');

// Mock DOM with state retention
const elements = {};
global.document = {
    createElement: function(tagName) {
        return {
            value: '',
            textContent: '',
            appendChild: () => {},
            classList: { add: () => {}, remove: () => {} }
        };
    },
    getElementById: function(id) {
        if (!elements[id]) {
            const elem = {
                value: '',
                textContent: '',
                classes: new Set(),
                appendChild: () => {},
                innerHTML: '',
                querySelectorAll: () => [],
                addEventListener: () => {},
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
addWide();
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

console.log("All tests passed!");
