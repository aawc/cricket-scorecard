/**
 * Cricket Scorecard PWA v2 - Comprehensive Automated Test Suite
 * Validates event sourcing, pure projections, partnerships, SVG visual charts, CSV export, and hardware engines.
 */

import { DeliveryEvent } from '../src/v2/types.js';
import {
  projectInnings,
  formatOvers,
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

  console.log("All v2 tests passed successfully!");
}
