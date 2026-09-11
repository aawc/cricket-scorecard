/**
 * Cricket Scorecard PWA v2 - Comprehensive Automated Test Suite
 * Validates event sourcing, pure projections, partnerships, SVG visual charts, CSV export, and hardware engines.
 */

import { DeliveryEvent } from '../src/v2/types.js';
import {
  projectInnings,
  formatOvers,
  formatDeliveryNotation,
  calculateRunRate,
  calculateStrikeRate,
  calculateEconomy,
  generateWormCoordinates,
  generateManhattanData
} from '../src/v2/stats.js';
import {
  renderWormChartSVG,
  renderManhattanChartSVG,
  renderPartnershipChartSVG
} from '../src/v2/charts.js';
import {
  formatMonospaceScorecard,
  formatBallByBallCSV,
  exportMatchJSON,
  importMatchJSON
} from '../src/v2/export.js';
import {
  wakeLockController,
  haptics,
  audioSynth
} from '../src/v2/hardware.js';
import { getProjectionsFromGameState, synthesizeEventsFromLiveInnings } from '../src/v2/bridge.js';
import { unminifyState } from '../src/storage.js';

export async function runV2Tests(): Promise<void> {
  // =========================================================================
  // Test 85: v2 Pure Statistical Projection & Event Replay
  // =========================================================================
  {
    console.log("Running Test 85 (v2 Pure Statistical Projection & Event Replay)...");

    const events: DeliveryEvent[] = [
      // Over 1 - Bumrah to Rohit & Kohli (Maiden Over: 6 legal dots)
      { id: '1', timestamp: 1000, inningsNumber: 1, overIndex: 0, ballInOver: 1, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '2', timestamp: 2000, inningsNumber: 1, overIndex: 0, ballInOver: 2, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '3', timestamp: 3000, inningsNumber: 1, overIndex: 0, ballInOver: 3, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '4', timestamp: 4000, inningsNumber: 1, overIndex: 0, ballInOver: 4, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '5', timestamp: 5000, inningsNumber: 1, overIndex: 0, ballInOver: 5, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '6', timestamp: 6000, inningsNumber: 1, overIndex: 0, ballInOver: 6, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Bumrah', runsBat: 0, runsExtra: 0, isLegalDelivery: true, strikeRotated: true, overCompleted: true },

      // Over 2 - Shami to Kohli & Rohit (1wd, 4, 6, 1b, 2lb, W)
      { id: '7', timestamp: 7000, inningsNumber: 1, overIndex: 1, ballInOver: 0, striker: 'Kohli', nonStriker: 'Rohit', bowler: 'Shami', runsBat: 0, runsExtra: 1, extraType: 'wide', isLegalDelivery: false, strikeRotated: false, overCompleted: false },
      { id: '8', timestamp: 8000, inningsNumber: 1, overIndex: 1, ballInOver: 1, striker: 'Kohli', nonStriker: 'Rohit', bowler: 'Shami', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '9', timestamp: 9000, inningsNumber: 1, overIndex: 1, ballInOver: 2, striker: 'Kohli', nonStriker: 'Rohit', bowler: 'Shami', runsBat: 6, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '10', timestamp: 10000, inningsNumber: 1, overIndex: 1, ballInOver: 3, striker: 'Kohli', nonStriker: 'Rohit', bowler: 'Shami', runsBat: 0, runsExtra: 1, extraType: 'bye', isLegalDelivery: true, strikeRotated: true, overCompleted: false },
      { id: '11', timestamp: 11000, inningsNumber: 1, overIndex: 1, ballInOver: 4, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Shami', runsBat: 0, runsExtra: 2, extraType: 'legbye', isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '12', timestamp: 12000, inningsNumber: 1, overIndex: 1, ballInOver: 5, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Shami', runsBat: 1, runsExtra: 0, isLegalDelivery: true, strikeRotated: true, overCompleted: false },
      { id: '13', timestamp: 13000, inningsNumber: 1, overIndex: 1, ballInOver: 6, striker: 'Kohli', nonStriker: 'Rohit', bowler: 'Shami', runsBat: 0, runsExtra: 0, isLegalDelivery: true, wicket: { kind: 'caught', dismissedPlayer: 'Kohli', fielder: 'Pant', runsCompletedBeforeDismissal: 0 }, strikeRotated: true, overCompleted: true }
    ];

    const projection = projectInnings(events, 'India', 'Australia', 1, 8, null, 'Rohit', 'Kohli', 'Bumrah');

    // Score verification (0 + 1wd + 4 + 6 + 1b + 2lb + 1 + 0 = 15 runs for 1 wicket in 2.0 overs)
    if (projection.totalScore !== 15 || projection.totalWickets !== 1 || projection.legalBalls !== 12 || projection.oversFormatted !== '2.0') {
      console.error("Test 85 Failed: Innings score/wickets/overs mismatch:", projection.totalScore, projection.totalWickets, projection.oversFormatted);
      process.exit(1);
    }

    // Bumrah: 1.0 ov, 1 maiden, 0 runs, 0 wickets, Econ: 0.00
    const bumrah = projection.bowlers['Bumrah'];
    if (!bumrah || bumrah.oversFormatted !== '1.0' || bumrah.maidens !== 1 || bumrah.runsConceded !== 0 || bumrah.wickets !== 0 || bumrah.economy !== 0) {
      console.error("Test 85 Failed: Bumrah bowler figures mismatch:", bumrah);
      process.exit(1);
    }

    // Shami: 1.0 ov, 0 maidens, 12 runs (4 + 6 + 1wd + 1 single), 1 wicket (byes/legbyes not charged to bowler)
    const shami = projection.bowlers['Shami'];
    if (!shami || shami.oversFormatted !== '1.0' || shami.maidens !== 0 || shami.runsConceded !== 12 || shami.wickets !== 1 || shami.wides !== 1) {
      console.error("Test 85 Failed: Shami bowler figures mismatch:", shami);
      process.exit(1);
    }

    // Kohli: 10 runs (4, 6), 4 balls, 1 four, 1 six, SR: 250.0, out c Pant b Shami
    const kohli = projection.batsmen['Kohli'];
    if (!kohli || kohli.runs !== 10 || kohli.balls !== 4 || kohli.fours !== 1 || kohli.sixes !== 1 || kohli.strikeRate !== 250 || !kohli.isOut || kohli.dismissalText !== 'c Pant b Shami') {
      console.error("Test 85 Failed: Kohli batsman figures mismatch:", kohli);
      process.exit(1);
    }

    // Rohit: 1 run, 8 balls, 0 fours, 0 sixes, not out
    const rohit = projection.batsmen['Rohit'];
    if (!rohit || rohit.runs !== 1 || rohit.balls !== 8 || rohit.isOut) {
      console.error("Test 85 Failed: Rohit batsman figures mismatch:", rohit);
      process.exit(1);
    }

    // Extras verification: total 4 (1 wd, 0 nb, 1 b, 2 lb)
    if (projection.extras.total !== 4 || projection.extras.wides !== 1 || projection.extras.byes !== 1 || projection.extras.legbyes !== 2) {
      console.error("Test 85 Failed: Extras accounting mismatch:", projection.extras);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 86: v2 Partnerships & Fall of Wickets Projection
  // =========================================================================
  {
    console.log("Running Test 86 (v2 Partnerships & Fall of Wickets Projection)...");

    const events: DeliveryEvent[] = [
      { id: '1', timestamp: 1000, inningsNumber: 1, overIndex: 0, ballInOver: 1, striker: 'Player A', nonStriker: 'Player B', bowler: 'Bowler X', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '2', timestamp: 2000, inningsNumber: 1, overIndex: 0, ballInOver: 2, striker: 'Player A', nonStriker: 'Player B', bowler: 'Bowler X', runsBat: 6, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '3', timestamp: 3000, inningsNumber: 1, overIndex: 0, ballInOver: 3, striker: 'Player A', nonStriker: 'Player B', bowler: 'Bowler X', runsBat: 0, runsExtra: 0, isLegalDelivery: true, wicket: { kind: 'bowled', dismissedPlayer: 'Player A', runsCompletedBeforeDismissal: 0 }, strikeRotated: false, overCompleted: false },
      // Player C comes in at #3
      { id: '4', timestamp: 4000, inningsNumber: 1, overIndex: 0, ballInOver: 4, striker: 'Player C', nonStriker: 'Player B', bowler: 'Bowler X', runsBat: 1, runsExtra: 0, isLegalDelivery: true, strikeRotated: true, overCompleted: false },
      { id: '5', timestamp: 5000, inningsNumber: 1, overIndex: 0, ballInOver: 5, striker: 'Player B', nonStriker: 'Player C', bowler: 'Bowler X', runsBat: 2, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      // Ball 6: Player B dismissed caught (2nd wicket)
      { id: '6', timestamp: 6000, inningsNumber: 1, overIndex: 0, ballInOver: 6, striker: 'Player B', nonStriker: 'Player C', bowler: 'Bowler X', runsBat: 0, runsExtra: 0, isLegalDelivery: true, wicket: { kind: 'caught', dismissedPlayer: 'Player B', runsCompletedBeforeDismissal: 0 }, strikeRotated: false, overCompleted: true },
      // Over 2: Player D comes in at #4 to partner Player C
      { id: '7', timestamp: 7000, inningsNumber: 1, overIndex: 1, ballInOver: 1, striker: 'Player C', nonStriker: 'Player D', bowler: 'Bowler Y', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '8', timestamp: 8000, inningsNumber: 1, overIndex: 1, ballInOver: 2, striker: 'Player C', nonStriker: 'Player D', bowler: 'Bowler Y', runsBat: 1, runsExtra: 0, isLegalDelivery: true, strikeRotated: true, overCompleted: false },
      { id: '9', timestamp: 9000, inningsNumber: 1, overIndex: 1, ballInOver: 3, striker: 'Player D', nonStriker: 'Player C', bowler: 'Bowler Y', runsBat: 6, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false }
    ];

    const proj = projectInnings(events, 'Team A', 'Team B', 1, 8, null, 'Player D', 'Player C', 'Bowler Y');

    // Check Fall of Wickets (2 dismissals)
    if (proj.fallOfWickets.length !== 2) {
      console.error("Test 86 Failed: Expected 2 FOW records, got:", proj.fallOfWickets);
      process.exit(1);
    }
    const fow1 = proj.fallOfWickets[0];
    if (fow1.wicket !== 1 || fow1.score !== 10 || fow1.batsman !== 'Player A' || fow1.overs !== '0.3') {
      console.error("Test 86 Failed: 1st FOW record details mismatch:", fow1);
      process.exit(1);
    }
    const fow2 = proj.fallOfWickets[1];
    if (fow2.wicket !== 2 || fow2.score !== 13 || fow2.batsman !== 'Player B' || fow2.overs !== '1.0') {
      console.error("Test 86 Failed: 2nd FOW record details mismatch:", fow2);
      process.exit(1);
    }

    // Check Completed Partnerships (1st and 2nd wickets)
    if (proj.partnerships.length !== 2) {
      console.error("Test 86 Failed: Expected 2 completed partnerships, got:", proj.partnerships);
      process.exit(1);
    }
    const p1 = proj.partnerships[0];
    if (p1.wicketNumber !== 1 || p1.totalRuns !== 10 || p1.totalBalls !== 3 || p1.unbroken) {
      console.error("Test 86 Failed: 1st Wicket partnership mismatch:", p1);
      process.exit(1);
    }
    const p2 = proj.partnerships[1];
    if (p2.wicketNumber !== 2 || p2.totalRuns !== 3 || p2.totalBalls !== 3 || p2.unbroken || (p2.player1Runs + p2.player2Runs !== 3)) {
      console.error("Test 86 Failed: 2nd Wicket partnership mismatch:", p2);
      process.exit(1);
    }

    // Check Active 3rd Wicket Partnership (11 runs: Player C 5 runs + Player D 6 runs)
    if (!proj.currentPartnership || proj.currentPartnership.totalRuns !== 11 || proj.currentPartnership.totalBalls !== 3 || !proj.currentPartnership.unbroken) {
      console.error("Test 86 Failed: Current unbroken 3rd wicket partnership mismatch:", proj.currentPartnership);
      process.exit(1);
    }
    if (proj.currentPartnership.player1Runs + proj.currentPartnership.player2Runs !== 11) {
      console.error("Test 86 Failed: 3rd wicket player contributions do not sum to 11:", proj.currentPartnership);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 87: v2 SVG Visual Analytics Engine
  // =========================================================================
  {
    console.log("Running Test 87 (v2 SVG Visual Analytics Engine)...");

    const events1: DeliveryEvent[] = [
      { id: '1', timestamp: 1000, inningsNumber: 1, overIndex: 0, ballInOver: 1, striker: 'A', nonStriker: 'B', bowler: 'X', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '2', timestamp: 2000, inningsNumber: 1, overIndex: 0, ballInOver: 2, striker: 'A', nonStriker: 'B', bowler: 'X', runsBat: 6, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: '3', timestamp: 3000, inningsNumber: 1, overIndex: 0, ballInOver: 3, striker: 'A', nonStriker: 'B', bowler: 'X', runsBat: 0, runsExtra: 0, isLegalDelivery: true, wicket: { kind: 'bowled', dismissedPlayer: 'A', runsCompletedBeforeDismissal: 0 }, strikeRotated: false, overCompleted: false }
    ];

    const events2: DeliveryEvent[] = [
      { id: '4', timestamp: 4000, inningsNumber: 2, overIndex: 0, ballInOver: 1, striker: 'C', nonStriker: 'D', bowler: 'A', runsBat: 1, runsExtra: 0, isLegalDelivery: true, strikeRotated: true, overCompleted: false },
      { id: '5', timestamp: 5000, inningsNumber: 2, overIndex: 0, ballInOver: 2, striker: 'D', nonStriker: 'C', bowler: 'A', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false }
    ];

    const wormData = generateWormCoordinates(events1, events2, 8);
    const wormSvg = renderWormChartSVG(wormData, { team1Name: 'India', team2Name: 'Australia' });

    if (!wormSvg.includes('<svg') || !wormSvg.includes('worm-chart') || !wormSvg.includes('#0072B2') || !wormSvg.includes('India')) {
      console.error("Test 87 Failed: Worm SVG output corrupted or missing elements:\n", wormSvg);
      process.exit(1);
    }

    const manhattanBars = generateManhattanData(events1, 8);
    const manhattanSvg = renderManhattanChartSVG(manhattanBars);

    if (!manhattanSvg.includes('<svg') || !manhattanSvg.includes('manhattan-chart') || !manhattanSvg.includes('Ov 1')) {
      console.error("Test 87 Failed: Manhattan SVG output corrupted:\n", manhattanSvg);
      process.exit(1);
    }

    const emptyManhattan = renderManhattanChartSVG([]);
    if (!emptyManhattan.includes('No completed overs recorded yet')) {
      console.error("Test 87 Failed: Empty Manhattan chart fallback mismatch:\n", emptyManhattan);
      process.exit(1);
    }

    const partnerships = [
      { wicketNumber: 1, player1Name: 'Rohit', player1Runs: 24, player1Balls: 16, player2Name: 'Kohli', player2Runs: 18, player2Balls: 12, totalRuns: 42, totalBalls: 28, unbroken: false }
    ];
    const pshipSvg = renderPartnershipChartSVG(partnerships);

    if (!pshipSvg.includes('<svg') || !pshipSvg.includes('partnership-chart') || !pshipSvg.includes('42 (28b)')) {
      console.error("Test 87 Failed: Partnerships SVG output corrupted:\n", pshipSvg);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 88: v2 Data Portability Suite (CSV & Text Scorecard Export)
  // =========================================================================
  {
    console.log("Running Test 88 (v2 Data Portability Suite)...");

    const events: DeliveryEvent[] = [
      { id: 'e1', timestamp: 1690000000000, inningsNumber: 1, overIndex: 0, ballInOver: 1, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Cummins', runsBat: 4, runsExtra: 0, isLegalDelivery: true, strikeRotated: false, overCompleted: false },
      { id: 'e2', timestamp: 1690000001000, inningsNumber: 1, overIndex: 0, ballInOver: 2, striker: 'Rohit', nonStriker: 'Kohli', bowler: 'Cummins', runsBat: 0, runsExtra: 0, isLegalDelivery: true, wicket: { kind: 'caught', dismissedPlayer: 'Rohit', fielder: 'Warner', runsCompletedBeforeDismissal: 0 }, strikeRotated: false, overCompleted: false }
    ];

    // 1. Ball-by-ball CSV Export
    const csv = formatBallByBallCSV(events);
    const csvLines = csv.trim().split('\n');

    if (csvLines.length !== 3) {
      console.error("Test 88 Failed: Expected 3 CSV lines (header + 2 rows), got:", csvLines.length);
      process.exit(1);
    }
    if (!csvLines[0].startsWith('Innings,Over,BallInOver,Striker')) {
      console.error("Test 88 Failed: CSV header mismatch:", csvLines[0]);
      process.exit(1);
    }
    if (!csvLines[1].includes('"Rohit"') || !csvLines[1].includes('"Cummins"') || !csvLines[1].includes('4,0,none,4')) {
      console.error("Test 88 Failed: CSV Row 1 data mismatch:", csvLines[1]);
      process.exit(1);
    }
    if (!csvLines[2].includes('caught') || !csvLines[2].includes('"Warner"')) {
      console.error("Test 88 Failed: CSV Row 2 wicket data mismatch:", csvLines[2]);
      process.exit(1);
    }

    // 2. Monospace Scorecard Text Export
    const proj = projectInnings(events, 'India', 'Australia', 1, 8, null, 'Rohit', 'Kohli', 'Cummins');
    const textScorecard = formatMonospaceScorecard(proj, null, 'India won by 10 runs');

    if (!textScorecard.includes('CRICKET MATCH SCORECARD') || !textScorecard.includes('INDIA - 4/1') || !textScorecard.includes('Rohit') || !textScorecard.includes('Cummins')) {
      console.error("Test 88 Failed: Monospace text scorecard format mismatch:\n", textScorecard);
      process.exit(1);
    }

    // 3. JSON Match Archive Import/Export
    const mockState: any = {
      version: 2,
      id: 'm_test_archive_1',
      createdAt: Date.now(),
      settings: { oversPerInnings: 8 },
      events: events
    };
    const jsonStr = exportMatchJSON(mockState);
    const imported = importMatchJSON(jsonStr);

    if (imported.id !== 'm_test_archive_1' || imported.events.length !== 2) {
      console.error("Test 88 Failed: JSON archive lossless import mismatch:", imported);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 89: v2 Mobile Ergonomics & Hardware Engine
  // =========================================================================
  {
    console.log("Running Test 89 (v2 Mobile Ergonomics & Hardware Engine)...");

    // 1. Wake Lock Controller
    let wakeLockState = false;
    const unbind = wakeLockController.onStateChange((active) => {
      wakeLockState = active;
    });

    if (typeof wakeLockController.isActive !== 'function') {
      console.error("Test 89 Failed: wakeLockController.isActive is not a function");
      process.exit(1);
    }
    unbind();

    // 2. Haptics Engine
    haptics.setEnabled(true);
    if (!haptics.isEnabled()) {
      console.error("Test 89 Failed: Haptics engine should be enabled");
      process.exit(1);
    }
    // Safe execution without errors in Node
    haptics.tap();
    haptics.boundary4();
    haptics.maximum6();
    haptics.wicket();
    haptics.undo();

    haptics.setEnabled(false);
    if (haptics.isEnabled()) {
      console.error("Test 89 Failed: Haptics engine should be disabled");
      process.exit(1);
    }

    // 3. Web Audio Synth
    audioSynth.setEnabled(true);
    if (!audioSynth.isEnabled()) {
      console.error("Test 89 Failed: Web Audio Synth should be enabled");
      process.exit(1);
    }
    audioSynth.playKeyClick();
    audioSynth.playBoundary();
    audioSynth.playWicket();
  }

  // =========================================================================
  // Test 90: v2 Regression - 2nd Innings 0-Run Partnership Balls & FOW Replay
  // =========================================================================
  {
    console.log("Running Test 90 (v2 Regression: 2nd Innings 0-Run Partnership Balls & FOW Replay)...");

    const rawMinified = {"ph":"MATCH_OVER","s":{"opi":4,"mob":2,"asb":1,"elb":0,"th":"light"},"m":{"ci":2,"cbt":2,"t1":{"n":"Team 1","p":["A","B"],"in":[{"sc":43,"w":1,"b":24,"ex":{"wd":0,"nb":0,"by":0,"lb":0},"bat":{"A":{"r":30,"b":15,"f":0,"s":0,"a":1},"B":{"r":13,"b":9,"f":0,"s":0,"a":0}},"bowl":{"C":{"r":20,"b":12,"wk":0,"m":0,"wd":0,"nb":0},"D":{"r":23,"b":12,"wk":1,"m":0,"wd":0,"nb":0}},"cb1":"A","cb2":"","cbo":"D","pbo":"C","ob":["B"],"ov":[{"bo":"C","bl":["3","3","2","1","0","0"]},{"bo":"D","bl":["2","2","2","2","2","2"]},{"bo":"C","bl":["2","2","2","1","1","3"]},{"bo":"D","bl":["W","1","1","3","3","3"]}],"ol":[],"fw":[{"w":1,"s":32,"b":"B","ov":"3.1"}]}]},"t2":{"n":"Team 2","p":["C","D"],"in":[{"sc":43,"w":2,"b":20,"ex":{"wd":0,"nb":0,"by":0,"lb":0},"bat":{"D":{"r":24,"b":11,"f":0,"s":0,"a":0},"C":{"r":19,"b":9,"f":0,"s":0,"a":0}},"bowl":{"B":{"r":30,"b":12,"wk":0,"m":0,"wd":0,"nb":0},"A":{"r":13,"b":8,"wk":2,"m":0,"wd":0,"nb":0}},"cb1":"","cb2":"","cbo":"A","pbo":"B","ob":["D","C"],"ov":[{"bo":"B","bl":["2","2","2","2","2","2"]},{"bo":"A","bl":["2","2","2","1","3","3"]},{"bo":"B","bl":["3","3","3","3","3","3"]},{"bo":"A","bl":["W","W"]}],"ol":[],"fw":[{"w":1,"s":43,"b":"D","ov":"3.1"},{"w":2,"s":43,"b":"C","ov":"3.2"}]}]},"li":{"sc":43,"w":2,"b":20,"ex":{"wd":0,"nb":0,"by":0,"lb":0},"bat":{"D":{"r":24,"b":11,"f":0,"s":0,"a":0},"C":{"r":19,"b":9,"f":0,"s":0,"a":0}},"bowl":{"B":{"r":30,"b":12,"wk":0,"m":0,"wd":0,"nb":0},"A":{"r":13,"b":8,"wk":2,"m":0,"wd":0,"nb":0}},"cb1":"","cb2":"","cbo":"A","pbo":"B","ob":["D","C"],"ov":[{"bo":"B","bl":["2","2","2","2","2","2"]},{"bo":"A","bl":["2","2","2","1","3","3"]},{"bo":"B","bl":["3","3","3","3","3","3"]},{"bo":"A","bl":["W","W"]}],"ol":[],"fw":[{"w":1,"s":43,"b":"D","ov":"3.1"},{"w":2,"s":43,"b":"C","ov":"3.2"}]},"tg":44,"mo":1}};

    const state = unminifyState(rawMinified);
    const projections = getProjectionsFromGameState(state);

    if (!projections.innings2) {
      console.error("Test 90 Failed: Innings 2 projection missing");
      process.exit(1);
    }

    const pships = projections.innings2.partnerships;
    if (pships.length !== 2) {
      console.error("Test 90 Failed: Expected 2 partnerships in Innings 2, got:", pships);
      process.exit(1);
    }

    // 1st Wicket Partnership: 43 runs in 19 balls
    const p1 = pships[0];
    if (p1.totalRuns !== 43 || p1.totalBalls !== 19) {
      console.error("Test 90 Failed: 1st partnership figures mismatch:", p1);
      process.exit(1);
    }

    // 2nd Wicket Partnership: 0 runs in 1 ball (faced by Player C on 3.2 ov)
    const p2 = pships[1];
    if (p2.totalRuns !== 0 || p2.totalBalls !== 1) {
      console.error("Test 90 Failed: 2nd partnership should be 0 runs off 1 ball, got:", p2);
      process.exit(1);
    }

    // SVG Chart rendering verification: must display "0 (1b)" and not "0 (0b)"
    const pshipSvg = renderPartnershipChartSVG(pships);
    if (!pshipSvg.includes('0 (1b)')) {
      console.error("Test 90 Failed: Partnership SVG should render '0 (1b)', got:\n", pshipSvg);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 91: v2 Regression - Projected Total & Innings Total Overs Governance
  // =========================================================================
  {
    console.log("Running Test 91 (v2 Regression: Projected Total & Innings Total Overs Governance)...");

    const rawMinified = {"ph":"PLAYING_INNINGS","s":{"opi":4,"mob":2,"asb":1,"elb":0,"th":"light"},"m":{"ci":1,"cbt":1,"t1":{"n":"Team 1","p":["A","B"],"in":[]},"t2":{"n":"Team 2","p":["C","D"],"in":[]},"li":{"sc":58,"w":1,"b":23,"ex":{"wd":0,"nb":1,"by":0,"lb":0},"bat":{"B":{"r":26,"b":14,"f":1,"s":1,"a":0},"A":{"r":31,"b":10,"f":0,"s":3,"a":1}},"bowl":{"C":{"r":33,"b":12,"wk":0,"m":0,"wd":0,"nb":0},"D":{"r":25,"b":11,"wk":1,"m":0,"wd":0,"nb":1}},"cb1":"A","cb2":"","cbo":"D","pbo":"C","ob":["B"],"ov":[{"bo":"C","bl":["1","1","1","2","2","2"]},{"bo":"D","bl":["2","2","2","2","2","2"]},{"bo":"C","bl":["6","6","6","2","3","1"]}],"ol":["1","1","4","6","nb","W"],"fw":[{"w":1,"s":58,"b":"B","ov":"3.5"}]},"tg":null,"mo":0}};

    const state = unminifyState(rawMinified);
    const projections = getProjectionsFromGameState(state);

    if (!projections.innings1) {
      console.error("Test 91 Failed: Innings 1 projection missing");
      process.exit(1);
    }

    const inngs1 = projections.innings1;
    if (inngs1.oversPerInnings !== 4) {
      console.error("Test 91 Failed: Expected oversPerInnings === 4, got:", inngs1.oversPerInnings);
      process.exit(1);
    }

    if (inngs1.oversFormatted !== '3.5') {
      console.error("Test 91 Failed: Expected oversFormatted === '3.5', got:", inngs1.oversFormatted);
      process.exit(1);
    }

    // CRR = 58 / (23 / 6) = 15.130435 rpo.
    // Projected score at 4 overs = round(15.130435 * 4) = 61 (NOT 121!).
    if (inngs1.projectedScores.totalOvers !== 61) {
      console.error("Test 91 Failed: Expected projectedScores.totalOvers === 61, got:", inngs1.projectedScores.totalOvers);
      process.exit(1);
    }

    // Monospace scorecard output must show "(3.5 / 4 ov)"
    const textScorecard = formatMonospaceScorecard(inngs1, null);
    if (!textScorecard.includes('3.5 / 4 ov') || !textScorecard.includes('3.5 / 4 Overs')) {
      console.error("Test 91 Failed: Monospace scorecard should include '3.5 / 4 ov', got:\n", textScorecard);
      process.exit(1);
    }

    // Zero balls bowled test: projected score should be 0 without throwing or NaN
    const zeroBallsInngs = projectInnings([], 'Team 1', 'Team 2', 1, 6, null);
    if (zeroBallsInngs.projectedScores.totalOvers !== 0 || isNaN(zeroBallsInngs.projectedScores.totalOvers)) {
      console.error("Test 91 Failed: Zero balls projected score must be 0, got:", zeroBallsInngs.projectedScores.totalOvers);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 92: v2 Regression - Wide + Bye Attribution, Partnership Totals & Manhattan Legend
  // =========================================================================
  {
    console.log("Running Test 92 (v2 Regression: Wide+Bye Attribution, Partnership Totals & Manhattan Legend)...");

    const rawMinified = {"ph":"PLAYING_INNINGS","s":{"opi":4,"mob":2,"asb":1,"elb":0,"th":"light"},"m":{"ci":2,"cbt":2,"t1":{"n":"Team 1","p":["A","B"],"in":[{"sc":58,"w":2,"b":24,"ex":{"wd":0,"nb":1,"by":0,"lb":0},"bat":{"B":{"r":26,"b":14,"f":1,"s":1,"a":0},"A":{"r":31,"b":11,"f":0,"s":3,"a":0}},"bowl":{"C":{"r":33,"b":12,"wk":0,"m":0,"wd":0,"nb":0},"D":{"r":25,"b":12,"wk":2,"m":0,"wd":0,"nb":1}},"cb1":"","cb2":"","cbo":"D","pbo":"C","ob":["B","A"],"ov":[{"bo":"C","bl":["1","1","1","2","2","2"]},{"bo":"D","bl":["2","2","2","2","2","2"]},{"bo":"C","bl":["6","6","6","2","3","1"]},{"bo":"D","bl":["1","1","4","6","nb","W","W"]}],"ol":[],"fw":[{"w":1,"s":58,"b":"B","ov":"3.5"},{"w":2,"s":58,"b":"A","ov":"4.0"}]}]},"t2":{"n":"Team 2","p":["C","D"],"in":[]},"li":{"sc":29,"w":1,"b":7,"ex":{"wd":1,"nb":0,"by":4,"lb":0},"bat":{"D":{"r":24,"b":6,"f":6,"s":0,"a":1},"C":{"r":0,"b":1,"f":0,"s":0,"a":0}},"bowl":{"A":{"r":24,"b":6,"wk":0,"m":0,"wd":0,"nb":0},"B":{"r":5,"b":1,"wk":1,"m":0,"wd":1,"nb":0}},"cb1":"D","cb2":"","cbo":"B","pbo":"A","ob":["C"],"ov":[{"bo":"A","bl":["4","4","4","4","4","4"]}],"ol":["wd+4b","W"],"fw":[{"w":1,"s":29,"b":"C","ov":"1.1"}]},"tg":59,"mo":0}};

    const state = unminifyState(rawMinified);
    const projections = getProjectionsFromGameState(state);

    const chase = projections.innings2;
    if (!chase) {
      console.error("Test 92 Failed: Innings 2 projection missing");
      process.exit(1);
    }

    // 'wd+4b' is 1 wide penalty run PLUS 4 byes = 5 runs. Total 24 + 5 = 29.
    if (chase.totalScore !== 29 || chase.totalWickets !== 1 || chase.oversFormatted !== '1.1') {
      console.error("Test 92 Failed: Expected 29/1 in 1.1 ov, got:", chase.totalScore, chase.totalWickets, chase.oversFormatted);
      process.exit(1);
    }

    // Extras: 5 total, split as 1 wide penalty + 4 byes (NOT 4 wides).
    const ex = chase.extras;
    if (ex.total !== 5 || ex.wides !== 1 || ex.byes !== 4 || ex.noballs !== 0 || ex.legbyes !== 0) {
      console.error("Test 92 Failed: Extras should be total 5 (wd 1, by 4), got:", ex);
      process.exit(1);
    }

    // Single completed partnership: D & C, 29 runs off 7 balls (the wide is not a ball faced).
    if (chase.partnerships.length !== 1) {
      console.error("Test 92 Failed: Expected exactly 1 completed partnership, got:", chase.partnerships);
      process.exit(1);
    }
    const pship = chase.partnerships[0];
    if (pship.totalRuns !== 29 || pship.totalBalls !== 7) {
      console.error("Test 92 Failed: Partnership should be 29 runs off 7 balls, got:", pship);
      process.exit(1);
    }
    // The non-striker fallback must not duplicate the striker ('D' & 'D').
    if (pship.player1Name !== 'D' || pship.player2Name !== 'C') {
      console.error("Test 92 Failed: Partnership should be between 'D' and 'C', got:", pship.player1Name, pship.player2Name);
      process.exit(1);
    }
    if (pship.player1Runs !== 24 || pship.player1Balls !== 6 || pship.player2Runs !== 0 || pship.player2Balls !== 1) {
      console.error("Test 92 Failed: Individual partnership contributions mismatch:", pship);
      process.exit(1);
    }

    // Bowler B is charged all 5 runs off the wide and credited with 1 wide DELIVERY (not 5).
    const bowlerB = chase.bowlers['B'];
    if (!bowlerB || bowlerB.runsConceded !== 5 || bowlerB.wides !== 1 || bowlerB.wickets !== 1 || bowlerB.balls !== 1) {
      console.error("Test 92 Failed: Bowler B figures mismatch (expect 0.1-0-5-1, wd 1), got:", bowlerB);
      process.exit(1);
    }
    const bowlerA = chase.bowlers['A'];
    if (!bowlerA || bowlerA.balls !== 6 || bowlerA.runsConceded !== 24) {
      console.error("Test 92 Failed: Bowler A figures mismatch (expect 1-0-24-0), got:", bowlerA);
      process.exit(1);
    }

    // Batsman figures must mirror the legacy scorecard.
    const batD = chase.batsmen['D'];
    const batC = chase.batsmen['C'];
    if (!batD || batD.runs !== 24 || batD.balls !== 6 || batD.fours !== 6) {
      console.error("Test 92 Failed: Batsman D should be 24 (6b, 6x4), got:", batD);
      process.exit(1);
    }
    if (!batC || batC.runs !== 0 || batC.balls !== 1) {
      console.error("Test 92 Failed: Batsman C should be 0 (1b), got:", batC);
      process.exit(1);
    }

    // Notation must round-trip faithfully instead of collapsing to the misleading '5wd'.
    const wideEvent = projections.events2.find(e => e.extraType === 'wide');
    if (!wideEvent) {
      console.error("Test 92 Failed: No wide delivery event synthesized from over log 'wd+4b'");
      process.exit(1);
    }
    if (wideEvent.runsExtra !== 5 || wideEvent.runsBat !== 0 || wideEvent.isLegalDelivery) {
      console.error("Test 92 Failed: Wide event should carry runsExtra 5 / runsBat 0 / illegal, got:", wideEvent);
      process.exit(1);
    }
    const notation = formatDeliveryNotation(wideEvent);
    if (notation !== 'wd+4b') {
      console.error("Test 92 Failed: formatDeliveryNotation should render 'wd+4b', got:", notation);
      process.exit(1);
    }

    // Notation must distinguish byes from bat runs for BOTH illegal delivery
    // types. 'nb+4' means 4 runs to the striker; byes must carry the 'b' suffix,
    // otherwise the token is well-formed but states the opposite attribution.
    const notationCases: Array<[Partial<typeof wideEvent>, string]> = [
      [{ extraType: 'wide', runsExtra: 1, runsBat: 3 }, 'wd+3'],
      [{ extraType: 'wide', runsExtra: 1, runsBat: 0 }, 'wd'],
      [{ extraType: 'noball', runsExtra: 5, runsBat: 0 }, 'nb+4b'],
      [{ extraType: 'noball', runsExtra: 1, runsBat: 4 }, 'nb+4'],
      [{ extraType: 'noball', runsExtra: 1, runsBat: 0 }, 'nb']
    ];
    for (const [overrides, expected] of notationCases) {
      const rendered = formatDeliveryNotation({ ...wideEvent, ...overrides });
      if (rendered !== expected) {
        console.error(`Test 92 Failed: formatDeliveryNotation should render '${expected}', got:`, rendered);
        process.exit(1);
      }
    }

    // Manhattan chart must carry an explicit run-bracket legend and a distinct wicket hue.
    const manhattanSvg = renderManhattanChartSVG(projections.manhattan2);
    for (const token of ['0-7 runs', '8-14 runs', '15+ runs', 'Wicket']) {
      if (!manhattanSvg.includes(token)) {
        console.error(`Test 92 Failed: Manhattan SVG missing legend token '${token}':\n`, manhattanSvg);
        process.exit(1);
      }
    }

    // The wicket hue must appear at least twice: once as the legend swatch and
    // once as an actual pin. Asserting mere presence is inert, because the
    // legend emits the hue unconditionally regardless of what the pins use.
    const wicketHueCount = manhattanSvg.split('#CC79A7').length - 1;
    if (wicketHueCount < 2) {
      console.error(`Test 92 Failed: expected wicket hue in legend AND at least one pin, found ${wicketHueCount} occurrence(s):\n`, manhattanSvg);
      process.exit(1);
    }

    // The 24-run over must use the 15+ bracket, and no wicket pin may reuse that
    // hue - that collision is precisely the reported unreadability.
    if (!manhattanSvg.includes('fill="#D55E00"')) {
      console.error("Test 92 Failed: 24-run bar should use the 15+ bracket hue #D55E00:\n", manhattanSvg);
      process.exit(1);
    }
    if (/<circle[^>]*fill="#D55E00"/.test(manhattanSvg)) {
      console.error("Test 92 Failed: wicket pin must not reuse the expensive-over hue #D55E00:\n", manhattanSvg);
      process.exit(1);
    }
  }

  // =========================================================================
  // Test 93: v2 Regression - Run-Out Notation Parsing & Bowler Wicket Credit
  // =========================================================================
  {
    console.log("Running Test 93 (v2 Regression: Run-Out Notation Parsing & Bowler Wicket Credit)...");

    // Four-man batting side so replacements exist. Over log exercises all three
    // run-out forms:
    //   '3+W-RO'  -> 3 bat runs completed, then the NON-striker (B) is run out.
    //                Odd runs, so the strike rotates.
    //   '2b+W-RO' -> 2 byes completed, then the striker (E) is run out.
    //   'W-RO'    -> no runs, striker (F) run out.
    // Because B is run out while A is on strike, the fall-of-wickets name can
    // only come from the `fw` records; the activeStriker fallback would say 'A'.
    const rawMinified = {"ph":"PLAYING_INNINGS","s":{"opi":4,"mob":2,"asb":0,"elb":0,"th":"light"},"m":{"ci":1,"cbt":1,"t1":{"n":"Team 1","p":["A","B","E","F"],"in":[]},"t2":{"n":"Team 2","p":["C","D"],"in":[]},"li":{"sc":5,"w":3,"b":3,"ex":{"wd":0,"nb":0,"by":2,"lb":0},"bat":{"A":{"r":3,"b":1,"f":0,"s":0,"a":1},"B":{"r":0,"b":0,"f":0,"s":0,"a":0},"E":{"r":0,"b":1,"f":0,"s":0,"a":0},"F":{"r":0,"b":1,"f":0,"s":0,"a":0}},"bowl":{"C":{"r":3,"b":3,"wk":0,"m":0,"wd":0,"nb":0}},"cb1":"A","cb2":"B","cbo":"C","pbo":"","ob":[],"ov":[],"ol":["3+W-RO","2b+W-RO","W-RO"],"fw":[{"w":1,"s":3,"b":"B","ov":"0.1"},{"w":2,"s":5,"b":"E","ov":"0.2"},{"w":3,"s":5,"b":"F","ov":"0.3"}]},"tg":null,"mo":0}};

    const state = unminifyState(rawMinified);
    const projections = getProjectionsFromGameState(state);
    const inngs = projections.innings1;

    // All three run-outs must register. Previously 'W-RO' matched no branch and
    // was dropped, while '2b+W-RO' was captured by the bye branch and read as 2
    // plain byes with the wicket lost entirely.
    if (inngs.totalWickets !== 3) {
      console.error("Test 93 Failed: Expected 3 run-out wickets, got:", inngs.totalWickets);
      process.exit(1);
    }
    if (inngs.totalScore !== 5 || inngs.oversFormatted !== '0.3') {
      console.error("Test 93 Failed: Expected 5 runs off 0.3 overs, got:", inngs.totalScore, inngs.oversFormatted);
      process.exit(1);
    }

    // Only the '2b+W-RO' runs are extras; the '3+W-RO' runs belong to the bat.
    if (inngs.extras.byes !== 2 || inngs.extras.total !== 2) {
      console.error("Test 93 Failed: Expected 2 byes / 2 total extras, got:", inngs.extras);
      process.exit(1);
    }

    // A run-out is never the bowler's wicket (isBowlerWicket excludes 'runout').
    // Bat runs completed before a run out ARE charged to the bowler; byes are not.
    const bowlerC = inngs.bowlers['C'];
    if (!bowlerC || bowlerC.wickets !== 0) {
      console.error("Test 93 Failed: Bowler must NOT be credited with a run-out, got:", bowlerC);
      process.exit(1);
    }
    if (bowlerC.balls !== 3 || bowlerC.runsConceded !== 3) {
      console.error("Test 93 Failed: Bowler C should be 0.3-0-3-0, got:", bowlerC);
      process.exit(1);
    }

    // B was run out as NON-striker without ever facing a ball. This can only be
    // derived from the `fw` records - the striker fallback would have named 'A'.
    const batB = inngs.batsmen['B'];
    if (!batB || !batB.isOut || batB.balls !== 0) {
      console.error("Test 93 Failed: B should be out having faced 0 balls, got:", batB);
      process.exit(1);
    }
    // A survived the first run out and keeps the 3 completed runs.
    const batA = inngs.batsmen['A'];
    if (!batA || batA.runs !== 3 || batA.balls !== 1 || batA.isOut) {
      console.error("Test 93 Failed: A should be 3 (1b) not out, got:", batA);
      process.exit(1);
    }
    // E faced the byes delivery; byes credit the batsman nothing.
    const batE = inngs.batsmen['E'];
    if (!batE || batE.runs !== 0 || batE.balls !== 1 || !batE.isOut) {
      console.error("Test 93 Failed: E should be 0 (1b) and out, got:", batE);
      process.exit(1);
    }

    if (inngs.fallOfWickets.length !== 3 ||
        inngs.fallOfWickets[0].batsman !== 'B' ||
        inngs.fallOfWickets[1].batsman !== 'E' ||
        inngs.fallOfWickets[2].batsman !== 'F') {
      console.error("Test 93 Failed: Fall of wickets mismatch:", inngs.fallOfWickets);
      process.exit(1);
    }

    const roEvents = projections.events1.filter(e => e.wicket?.kind === 'runout');
    if (roEvents.length !== 3) {
      console.error("Test 93 Failed: Expected 3 synthesized run-out events, got:", roEvents.length);
      process.exit(1);
    }

    // '3+W-RO': bat runs, no extra type, and odd runs must rotate the strike.
    if (roEvents[0].runsBat !== 3 || roEvents[0].runsExtra !== 0 || roEvents[0].extraType !== undefined) {
      console.error("Test 93 Failed: '3+W-RO' should carry 3 bat runs and no extras, got:", roEvents[0]);
      process.exit(1);
    }
    if (!roEvents[0].strikeRotated) {
      console.error("Test 93 Failed: 3 completed runs (odd) must rotate the strike, got:", roEvents[0]);
      process.exit(1);
    }
    // '2b+W-RO': byes, no bat runs, even runs so no rotation.
    if (roEvents[1].extraType !== 'bye' || roEvents[1].runsExtra !== 2 || roEvents[1].runsBat !== 0) {
      console.error("Test 93 Failed: '2b+W-RO' should carry 2 byes and no bat runs, got:", roEvents[1]);
      process.exit(1);
    }
    if (roEvents[1].strikeRotated) {
      console.error("Test 93 Failed: 2 completed runs (even) must not rotate the strike, got:", roEvents[1]);
      process.exit(1);
    }
    // Every run-out is a legal delivery counting towards the over.
    for (const ro of roEvents) {
      if (!ro.isLegalDelivery) {
        console.error("Test 93 Failed: run-out deliveries are legal, got:", ro);
        process.exit(1);
      }
    }

    // Notation must round-trip into the reducer's grammar, not the old '{N}+ro'.
    const expectedNotations = ['3+W-RO', '2b+W-RO', 'W-RO'];
    for (let i = 0; i < expectedNotations.length; i++) {
      const rendered = formatDeliveryNotation(roEvents[i]);
      if (rendered !== expectedNotations[i]) {
        console.error(`Test 93 Failed: Expected '${expectedNotations[i]}', got:`, rendered);
        process.exit(1);
      }
    }
  }

  console.log("All v2 tests passed successfully!");
}
