const fs = require('fs');
const path = require('path');

// Mock DOM and modules are loaded by test.js runner
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
    gameState.phase = 'PLAYING_INNINGS';
    gameState.history = [];
    
    // Reset mocked elements instead of deleting them to preserve references in app.js
    for (const id in elements) {
        elements[id].value = '';
        elements[id].textContent = '';
        elements[id].innerHTML = '';
        if (elements[id].classes) elements[id].classes.clear();
        elements[id].appendedChildren = [];
        elements[id].children = [];
        elements[id].checked = false;
        elements[id].dataset = {};
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

// Test 27: startMatch validation failure (not enough players)
resetTestState();
gameState.matchStarted = false;
gameState.phase = 'SETUP';

// Mock input values
document.getElementById('overs-per-innings').value = "5";
document.getElementById('max-overs-per-bowler').value = "2"; // 5 overs / 2 = 3 bowlers needed

// Mock empty rosters (0 players)
document.getElementById('team1-roster-list').children = [];
document.getElementById('team2-roster-list').children = [];

let alertCalled = false;
let alertMsg = "";
global.alert = (msg) => {
    alertCalled = true;
    alertMsg = msg;
};

startMatch();

if (gameState.matchStarted) {
    console.error("Test 27 Failed: Match should not have started with empty rosters");
    process.exit(1);
}
if (!alertCalled || !alertMsg.includes("needs at least 3 players to bowl")) {
    console.error("Test 27 Failed: Roster validation alert not triggered correctly, got msg:", alertMsg);
    process.exit(1);
}

// Test 28: startMatch validation success and match start
resetTestState();
gameState.matchStarted = false;
gameState.phase = 'SETUP';

// Mock input values
document.getElementById('overs-per-innings').value = "2";
document.getElementById('max-overs-per-bowler').value = "2"; // 1 bowler needed
document.getElementById('allow-single-batsman').checked = true; // 1 batsman needed

// Mock rosters (1 player each)
const p1 = { querySelector: (sel) => ({ textContent: "T1P1" }), dataset: {} };
const p2 = { querySelector: (sel) => ({ textContent: "T2P1" }), dataset: {} };
document.getElementById('team1-roster-list').children = [p1];
document.getElementById('team2-roster-list').children = [p2];

alertCalled = false;
global.alert = (msg) => { alertCalled = true; };

startMatch();

if (!gameState.matchStarted) {
    console.error("Test 28 Failed: Match should have started with valid rosters");
    process.exit(1);
}
if (alertCalled) {
    console.error("Test 28 Failed: No alert should have been called for success path");
    process.exit(1);
}
if (gameState.match.team1.players[0] !== "T1P1" || gameState.match.team2.players[0] !== "T2P1") {
    console.error("Test 28 Failed: Players not copied correctly to match state", gameState.match.team1.players, gameState.match.team2.players);
    process.exit(1);
}

// Test 29: resetMatch behavior
resetTestState();
gameState.matchStarted = true;
gameState.match.currentInnings = 2;
gameState.match.liveInnings.score = 25;
gameState.match.liveInnings.wickets = 2;
gameState.match.team1.players = ["T1P1", "T1P2"];
gameState.match.team2.players = ["T2P1", "T2P2"];
gameState.settings.oversPerInnings = 5;

let lsRemoved = false;
global.localStorage.removeItem = (key) => {
    if (key === 'cricketScorecardState') {
        lsRemoved = true;
    }
};

resetMatch();

if (gameState.matchStarted) {
    console.error("Test 29 Failed: Match should be marked as not started after reset");
    process.exit(1);
}
if (!lsRemoved) {
    console.error("Test 29 Failed: LocalStorage state should have been removed");
    process.exit(1);
}
if (gameState.match.liveInnings.score !== 0 || gameState.match.liveInnings.wickets !== 0) {
    console.error("Test 29 Failed: Match scores were not reset");
    process.exit(1);
}
if (gameState.match.team1.players.length !== 2 || gameState.match.team2.players.length !== 2) {
    console.error("Test 29 Failed: Roster players should have been preserved");
    process.exit(1);
}
if (gameState.settings.oversPerInnings !== 5) {
    console.error("Test 29 Failed: Settings should have been preserved");
    process.exit(1);
}

global.localStorage.removeItem = () => {};

// Test 30: Leg Byes toggle behavior
resetTestState();
gameState.settings.enableLegByes = false;
gameState.match.currentInnings = 1;
gameState.match.liveInnings.score = 0;
gameState.match.liveInnings.balls = 0;
gameState.match.liveInnings.currentBowler = "B1";
gameState.match.liveInnings.bowlers = { "B1": { runs: 0, balls: 0, wickets: 0 } };

let consoleErrorCalled = false;
let consoleErrorMsg = "";
const originalConsoleError = console.error;
console.error = (msg) => {
    consoleErrorCalled = true;
    consoleErrorMsg = msg;
};

addLegBye();

console.error = originalConsoleError;

if (gameState.match.liveInnings.score !== 0 || gameState.match.liveInnings.extras.legbyes !== 0) {
    console.error("Test 30 Failed: Leg bye was recorded even though disabled in settings");
    process.exit(1);
}
if (!consoleErrorCalled || !consoleErrorMsg.includes("Leg byes are disabled")) {
    console.error("Test 30 Failed: Expected error log not found, got:", consoleErrorMsg);
    process.exit(1);
}

global.localStorage.getItem = (key) => null;

console.log("All tests passed!");
