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
            appendedChildren: [],
            appendChild: function(child) { this.appendedChildren.push(child); },
            remove: () => {},
            querySelector: () => ({ addEventListener: () => {}, textContent: '', remove: () => {}, classList: { add: () => {}, remove: () => {} } }),
            querySelectorAll: () => [],
            addEventListener: () => {},
            dataset: {},
            style: {}
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
                appendedChildren: [],
                appendChild: function(child) { this.appendedChildren.push(child); },
                innerHTML: '',
                querySelector: () => ({ addEventListener: () => {}, textContent: '', classList: { add: () => {}, remove: () => {} }, dataset: {} }),
                querySelectorAll: () => [],
                addEventListener: () => {},
                dataset: {},
                style: {},
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
            add: function(c) { global.document.body.classes.add(c); },
            remove: function(c) { global.document.body.classes.delete(c); },
            contains: function(c) { return global.document.body.classes.has(c); }
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
            overs: [],
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
if (gameState.match.liveInnings.batsmen["P1"].balls !== 1) {
    console.error(`Test 10 Failed: Batsman P1 balls should be 1 on noball`);
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].balls !== 0) {
    console.error(`Test 10 Failed: Bowler balls should remain 0 on noball`);
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

// Test 13: Byes increment batsman balls and bowler balls
resetTestState();
global.mockExtraRuns = 2;
global.mockAccrueTo = 'byes';
triggerExtraRunsModal('bye');

if (gameState.match.liveInnings.score !== 3) {
    console.error(`Test 13 Failed: Score should be 3`);
    process.exit(1);
}
if (gameState.match.liveInnings.extras.byes !== 3) {
    console.error(`Test 13 Failed: Byes extras should be 3`);
    process.exit(1);
}
if (gameState.match.liveInnings.balls !== 1) {
    console.error(`Test 13 Failed: Live balls should be 1`);
    process.exit(1);
}
if (gameState.match.liveInnings.batsmen["P1"].balls !== 1) {
    console.error(`Test 13 Failed: Batsman P1 balls should be 1`);
    process.exit(1);
}
if (gameState.match.liveInnings.batsmen["P1"].runs !== 0) {
    console.error(`Test 13 Failed: Batsman P1 runs should be 0`);
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].balls !== 1) {
    console.error(`Test 13 Failed: Bowler B1 balls should be 1`);
    process.exit(1);
}
if (gameState.match.liveInnings.bowlers["B1"].runs !== 0) {
    console.error(`Test 13 Failed: Bowler B1 runs should be 0`);
    process.exit(1);
}

// Test 14: Strike rotation on odd extra runs (Wide + 1 run)
resetTestState();
// P1 is active (striker), P2 is inactive
global.mockExtraRuns = 1;
global.mockAccrueTo = 'byes';
triggerExtraRunsModal('wide');

if (gameState.match.liveInnings.batsmen["P1"].active) {
    console.error(`Test 14 Failed: Striker P1 should no longer be active`);
    process.exit(1);
}
if (!gameState.match.liveInnings.batsmen["P2"].active) {
    console.error(`Test 14 Failed: Non-striker P2 should now be active`);
    process.exit(1);
}

// Test 15: Auto-selection and lone striker enforcement
resetTestState();
gameState.match.team1.players = ["P1", "P2", "P3"];
gameState.settings.allowSingleBatsman = true;
addWicket(); // Take wicket on P1. P3 is only un-dismissed player on bench.
if (gameState.match.liveInnings.currentBatsman1 !== "P3") {
    console.error(`Test 15 Failed: P3 should be auto-selected into striker slot, got ${gameState.match.liveInnings.currentBatsman1}`);
    process.exit(1);
}
addWicket(); // Take wicket on P3. Only P2 is left.
if (gameState.match.liveInnings.currentBatsman1 !== "P2") {
    console.error(`Test 15 Failed: Lone survivor P2 should be moved to striker slot, got ${gameState.match.liveInnings.currentBatsman1}`);
    process.exit(1);
}


// Test 16: Completed Over Storage
resetTestState();
for (let i = 0; i < 6; i++) {
    addRuns(1);
}
if (gameState.match.liveInnings.overs.length !== 1) {
    console.error(`Test 16 Failed: Expected 1 completed over, got ${gameState.match.liveInnings.overs.length}`);
    process.exit(1);
}
if (gameState.match.liveInnings.overs[0].bowler !== "B1") {
    console.error(`Test 16 Failed: Expected bowler to be B1, got ${gameState.match.liveInnings.overs[0].bowler}`);
    process.exit(1);
}
if (JSON.stringify(gameState.match.liveInnings.overs[0].balls) !== JSON.stringify(["1", "1", "1", "1", "1", "1"])) {
    console.error(`Test 16 Failed: Incorrect over log saved: ${JSON.stringify(gameState.match.liveInnings.overs[0].balls)}`);
    process.exit(1);
}
if (gameState.match.liveInnings.overLog.length !== 0) {
    console.error(`Test 16 Failed: overLog should be empty after over completion`);
    process.exit(1);
}

// Test 17: Incomplete Over Storage on Innings End
resetTestState();
addRuns(1);
addRuns(2);
addRuns(0);
endInnings();
const archivedInnings = gameState.match.team1.innings[0];
if (!archivedInnings) {
    console.error("Test 17 Failed: Archived innings not found");
    process.exit(1);
}
if (archivedInnings.overs.length !== 1) {
    console.error(`Test 17 Failed: Expected 1 over in history, got ${archivedInnings.overs.length}`);
    process.exit(1);
}
if (archivedInnings.overs[0].bowler !== "B1") {
    console.error(`Test 17 Failed: Expected bowler B1, got ${archivedInnings.overs[0].bowler}`);
    process.exit(1);
}
if (JSON.stringify(archivedInnings.overs[0].balls) !== JSON.stringify(["1", "2", "0"])) {
    console.error(`Test 17 Failed: Incorrect incomplete over log saved: ${JSON.stringify(archivedInnings.overs[0].balls)}`);
    process.exit(1);
}

// Test 18: Permalink Minification with Overs
resetTestState();
// Bowl 6 balls to complete over 1
for (let i = 0; i < 6; i++) addRuns(1);
// Change bowler to B2 and bowl 2 balls in over 2
handleBowlerChange("B2");
addRuns(4);
addRuns(0);

const minified = minifyState(gameState);
const restored = unminifyState(minified);

const restoredLive = restored.match.liveInnings;
if (restoredLive.overs.length !== 1) {
    console.error(`Test 18 Failed: Restored overs length should be 1, got ${restoredLive.overs.length}`);
    process.exit(1);
}
if (restoredLive.overs[0].bowler !== "B1" || JSON.stringify(restoredLive.overs[0].balls) !== JSON.stringify(["1", "1", "1", "1", "1", "1"])) {
    console.error("Test 18 Failed: Restored completed over mismatch");
    process.exit(1);
}
if (restoredLive.currentBowler !== "B2") {
    console.error(`Test 18 Failed: Restored current bowler should be B2, got ${restoredLive.currentBowler}`);
    process.exit(1);
}
if (JSON.stringify(restoredLive.overLog) !== JSON.stringify(["4", "0"])) {
    console.error("Test 18 Failed: Restored active overLog mismatch");
    process.exit(1);
}

// Test 19: generateSummaryView rendering (smoke test)
resetTestState();
for (let i = 0; i < 6; i++) addRuns(1);
try {
    generateSummaryView();
} catch (e) {
    console.error("Test 19 Failed: generateSummaryView crashed", e);
    process.exit(1);
}

// Test 20: Render user permalink state (smoke test)
resetTestState();
gameState.settings = {
    totalInnings: 1,
    oversPerInnings: 4,
    maxOversPerBowler: 2,
    widePenalty: 1,
    noBallPenalty: 1,
    allowSingleBatsman: true,
    enableLegByes: false,
    theme: "light"
};
gameState.match = {
    currentInnings: 2,
    currentBattingTeam: 2,
    team1: {
      name: "Team 1",
      players: ["RS", "VK"],
      innings: [
        {
          score: 35,
          wickets: 0,
          balls: 24,
          extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
          batsmen: {
            "VK": { runs: 19, balls: 13, active: false },
            "RS": { runs: 16, balls: 11, active: true }
          },
          bowlers: {
            "SS": { runs: 15, balls: 12, wickets: 0, wides: 0, noballs: 0 },
            "PP": { runs: 20, balls: 12, wickets: 0, wides: 0, noballs: 0 }
          },
          currentBatsman1: "VK",
          currentBatsman2: "RS",
          currentBowler: "PP",
          previousBowler: "SS",
          outBatsmen: [],
          overs: [
            { bowler: "SS", balls: ["1", "1", "1", "1", "1", "1"] },
            { bowler: "PP", balls: ["1", "1", "1", "1", "1", "1"] },
            { bowler: "SS", balls: ["1", "1", "1", "2", "2", "2"] },
            { bowler: "PP", balls: ["2", "2", "2", "2", "3", "3"] }
          ],
          overLog: []
        }
      ]
    },
    team2: {
      name: "Team 2",
      players: ["SS", "PP"],
      innings: []
    },
    liveInnings: {
      score: 8,
      wickets: 0,
      balls: 6,
      extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
      batsmen: {
        "PP": { runs: 8, balls: 6, active: false },
        "SS": { runs: 0, balls: 0, active: true }
      },
      bowlers: {
        "VK": { runs: 8, balls: 6, wickets: 0, wides: 0, noballs: 0 },
        "RS": { runs: 0, balls: 0, wickets: 0, wides: 0, noballs: 0 }
      },
      currentBatsman1: "PP",
      currentBatsman2: "SS",
      currentBowler: "RS",
      previousBowler: "VK",
      outBatsmen: [],
      overs: [
        { bowler: "VK", balls: ["2", "2", "2", "2", "0", "0"] }
      ],
      overLog: []
    },
    target: 36,
    matchOver: false
};

try {
    generateSummaryView();
    const summariesDiv = elements['innings-summaries'];
    if (!summariesDiv) {
        console.error("Test 20 Failed: summariesDiv not found");
        process.exit(1);
    }
    if (summariesDiv.appendedChildren.length !== 2) {
        console.error(`Test 20 Failed: Expected 2 innings summaries rendered, got ${summariesDiv.appendedChildren.length}`);
        process.exit(1);
    }
} catch (e) {
    console.error("Test 20 Failed: generateSummaryView crashed on user state", e);
    process.exit(1);
}

// Test 21: Archiving Innings 2 on match win (chasing target met)
resetTestState();
gameState.match.currentInnings = 2;
gameState.match.currentBattingTeam = 2; // Team 2 is chasing
gameState.match.target = 10;
gameState.match.liveInnings.score = 9;
gameState.match.liveInnings.balls = 5;
// Bowl 1 run to reach target (9 + 1 = 10)
addRuns(1);

if (!gameState.match.matchOver) {
    console.error("Test 21 Failed: Match should be marked over");
    process.exit(1);
}
if (gameState.match.team2.innings.length !== 1) {
    console.error(`Test 21 Failed: Innings 2 should be archived, got history length ${gameState.match.team2.innings.length}`);
    process.exit(1);
}
if (gameState.match.team2.innings[0].score !== 10) {
    console.error(`Test 21 Failed: Archived score should be 10, got ${gameState.match.team2.innings[0].score}`);
    process.exit(1);
}

// Test 22: Migration of unarchived Innings 2 on load
resetTestState();
const badState = {
    matchStarted: true,
    settings: { totalInnings: 1, theme: "light" },
    match: {
        currentInnings: 2,
        currentBattingTeam: 2,
        team1: { name: "Team 1", players: ["P1", "P2"], innings: [{ score: 10, balls: 6, batsmen: {}, bowlers: {}, extras: {wides:0,noballs:0,byes:0,legbyes:0}, overs:[], overLog:[] }] },
        team2: { name: "Team 2", players: ["P3", "P4"], innings: [] },
        liveInnings: { score: 11, balls: 6, batsmen: {}, bowlers: {}, extras: {wides:0,noballs:0,byes:0,legbyes:0}, overs:[], overLog:[] },
        target: 11,
        matchOver: true
    }
};

global.localStorage.getItem = (key) => {
    if (key === 'cricketScorecardState') {
        return JSON.stringify(badState);
    }
    return null;
};

loadFromLocalStorage();

if (gameState.match.team2.innings.length !== 1) {
    console.error(`Test 22 Failed: Innings 2 should have been migrated/archived on load, got length ${gameState.match.team2.innings.length}`);
    process.exit(1);
}
if (gameState.match.team2.innings[0].score !== 11) {
    console.error(`Test 22 Failed: Migrated Innings 2 score should be 11, got ${gameState.match.team2.innings[0].score}`);
    process.exit(1);
}

// Restore localStorage mock
global.localStorage.getItem = (key) => null;

// Test 23: Match ends in a Tie at max overs limit
resetTestState();
gameState.settings.oversPerInnings = 2; // Max 12 balls
gameState.match.currentInnings = 2;
gameState.match.currentBattingTeam = 2;
gameState.match.target = 30;
gameState.match.liveInnings.score = 26;
gameState.match.liveInnings.balls = 11;
// Bowl 3 runs on the 12th ball (last ball of over 2)
addRuns(3);

if (!gameState.match.matchOver) {
    console.error("Test 23 Failed: Match should be marked over (Tie)");
    process.exit(1);
}
if (gameState.match.team2.innings.length !== 1) {
    console.error(`Test 23 Failed: Innings 2 should be archived, got history length ${gameState.match.team2.innings.length}`);
    process.exit(1);
}

// Test 24: Simulate user match sequence
resetTestState();
gameState.settings.oversPerInnings = 2;
gameState.match.currentInnings = 2;
gameState.match.currentBattingTeam = 2;
gameState.match.target = 30; // Innings 1 score was 29

// Bowl 5 balls of 4 runs
for (let i = 0; i < 5; i++) addRuns(4);
// Ball 6: 1 run (Over 1 ends)
addRuns(1);

// Verify Over 1 is archived
if (gameState.match.liveInnings.overs.length !== 1) {
    console.error(`Test 24 Failed: Over 1 should be archived, got ${gameState.match.liveInnings.overs.length}`);
    process.exit(1);
}

// Select bowler B2 for Over 2
handleBowlerChange("B2");

// Bowl 5 balls of 1 run (Balls 7-11)
for (let i = 0; i < 5; i++) addRuns(1);
// Ball 12: 3 runs (Over 2 ends, score should be 29, match should be Tie)
addRuns(3);

if (!gameState.match.matchOver) {
    console.error("Test 24 Failed: Match should be marked over (Tie) after Ball 12");
    process.exit(1);
}

// Test 25: Verify migration of missing overs array on load from localStorage
resetTestState();
delete gameState.match.liveInnings.overs; // Simulate old state missing overs
gameState.settings.oversPerInnings = 2;
gameState.match.currentInnings = 2;
gameState.match.currentBattingTeam = 2;
gameState.match.target = 30;
gameState.match.liveInnings.score = 26;
gameState.match.liveInnings.balls = 11;

const badStateString = JSON.stringify(gameState);
global.localStorage.getItem = (key) => {
    if (key === 'cricketScorecardState') {
        return badStateString;
    }
    return null;
};

loadFromLocalStorage();

if (!gameState.match.liveInnings.overs) {
    console.error("Test 25 Failed: overs array was not restored on load");
    process.exit(1);
}

try {
    addRuns(3);
} catch (e) {
    console.error("Test 25 Failed: addRuns crashed even after migration", e);
    process.exit(1);
}

if (!gameState.match.matchOver) {
    console.error("Test 25 Failed: Match should be marked over (Tie)");
    process.exit(1);
}
if (gameState.match.team2.innings.length !== 1) {
    console.error(`Test 25 Failed: Innings 2 should be archived, got history length ${gameState.match.team2.innings.length}`);
    process.exit(1);
}

global.localStorage.getItem = (key) => null;

// Test 26: Healing of bloated overLog on load
resetTestState();
gameState.match.currentInnings = 2;
gameState.match.currentBattingTeam = 2;
gameState.match.target = 30;
gameState.match.liveInnings.overs = [];
gameState.match.liveInnings.overLog = ["4", "4", "4", "4", "4", "1", "1", "1", "1", "1", "1", "3", "3"];
gameState.match.liveInnings.balls = 13;
gameState.match.liveInnings.currentBowler = "B1";
gameState.match.liveInnings.bowlers = { "B1": { runs: 32, balls: 13, wickets: 0 } };

const corruptStateString = JSON.stringify(gameState);
global.localStorage.getItem = (key) => {
    if (key === 'cricketScorecardState') {
        return corruptStateString;
    }
    return null;
};

loadFromLocalStorage();

const live = gameState.match.liveInnings;
if (live.overs.length !== 2) {
    console.error(`Test 26 Failed: Expected 2 completed overs after healing, got ${live.overs.length}`);
    process.exit(1);
}
if (live.overs[0].bowler !== "B1" || JSON.stringify(live.overs[0].balls) !== JSON.stringify(["4", "4", "4", "4", "4", "1"])) {
    console.error("Test 26 Failed: Over 1 not healed correctly", live.overs[0]);
    process.exit(1);
}
if (live.overs[1].bowler !== "B1" || JSON.stringify(live.overs[1].balls) !== JSON.stringify(["1", "1", "1", "1", "1", "3"])) {
    console.error("Test 26 Failed: Over 2 not healed correctly", live.overs[1]);
    process.exit(1);
}
if (JSON.stringify(live.overLog) !== JSON.stringify(["3"])) {
    console.error(`Test 26 Failed: Expected remaining overLog to be ["3"], got ${JSON.stringify(live.overLog)}`);
    process.exit(1);
}
if (live.balls !== 13) {
    console.error(`Test 26 Failed: Expected balls to remain 13, got ${live.balls}`);
    process.exit(1);
}

global.localStorage.getItem = (key) => null;

console.log("All tests passed!");
