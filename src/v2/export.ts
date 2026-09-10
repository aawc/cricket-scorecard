/**
 * Cricket Scorecard PWA v2 - Export & Data Portability Suite
 * 1. Plaintext Monospace Scorecard (WhatsApp / SMS / Clipboard)
 * 2. Ball-by-Ball CSV Exporter
 * 3. JSON Match Archive & Restore
 */

import { DeliveryEvent, InningsProjection, MatchV2State } from './types.js';

/**
 * Format a complete text scorecard for messaging / sharing
 */
export function formatMonospaceScorecard(
  inngs1: InningsProjection,
  inngs2?: InningsProjection | null,
  matchResultText?: string
): string {
  const lines: string[] = [];
  const divider = '='.repeat(55);
  const subDivider = '-'.repeat(55);

  lines.push(divider);
  lines.push(`🏏 CRICKET MATCH SCORECARD`);
  lines.push(divider);

  function printInnings(inngs: InningsProjection) {
    lines.push(`\n📊 ${inngs.battingTeamName.toUpperCase()} - ${inngs.totalScore}/${inngs.totalWickets} (${inngs.oversFormatted} ov)`);
    lines.push(subDivider);
    lines.push(`BATSMAN                R    B   4s  6s     SR`);
    lines.push(subDivider);

    inngs.batsmenList.forEach(b => {
      const name = b.name.padEnd(20, ' ').substring(0, 20);
      const r = b.runs.toString().padStart(4, ' ');
      const balls = b.balls.toString().padStart(4, ' ');
      const fours = b.fours.toString().padStart(4, ' ');
      const sixes = b.sixes.toString().padStart(4, ' ');
      const sr = b.strikeRate.toFixed(1).padStart(7, ' ');
      lines.push(`${name} ${r} ${balls} ${fours} ${sixes} ${sr}`);
      if (b.dismissalText && b.dismissalText !== 'not out') {
        lines.push(`  └─ ${b.dismissalText}`);
      }
    });

    lines.push(subDivider);
    lines.push(`Extras: ${inngs.extras.total} (wd: ${inngs.extras.wides}, nb: ${inngs.extras.noballs}, b: ${inngs.extras.byes}, lb: ${inngs.extras.legbyes})`);
    lines.push(`Total:  ${inngs.totalScore}/${inngs.totalWickets} (${inngs.oversFormatted} Overs, CRR: ${inngs.runRate.toFixed(2)})`);
    lines.push(subDivider);

    if (inngs.bowlersList.length > 0) {
      lines.push(`BOWLER                 O    M    R    W    ECON`);
      lines.push(subDivider);
      inngs.bowlersList.forEach(bw => {
        const name = bw.name.padEnd(20, ' ').substring(0, 20);
        const o = bw.oversFormatted.padStart(4, ' ');
        const m = bw.maidens.toString().padStart(4, ' ');
        const r = bw.runsConceded.toString().padStart(4, ' ');
        const w = bw.wickets.toString().padStart(4, ' ');
        const econ = bw.economy.toFixed(2).padStart(7, ' ');
        lines.push(`${name} ${o} ${m} ${r} ${w} ${econ}`);
      });
      lines.push(subDivider);
    }

    if (inngs.fallOfWickets.length > 0) {
      lines.push(`Fall of Wickets:`);
      const fowStr = inngs.fallOfWickets.map(f => `${f.score}/${f.wicket} (${f.batsman}, ${f.overs} ov)`).join(', ');
      lines.push(`  ${fowStr}`);
      lines.push(subDivider);
    }

    if (inngs.partnerships.length > 0) {
      lines.push(`Partnerships:`);
      inngs.partnerships.forEach(p => {
        const title = p.unbroken ? `Current` : `${p.wicketNumber}th Wicket`;
        lines.push(`  • ${title}: ${p.totalRuns} runs (${p.totalBalls}b) - ${p.player1Name} (${p.player1Runs}), ${p.player2Name} (${p.player2Runs})`);
      });
      lines.push(subDivider);
    }
  }

  printInnings(inngs1);
  if (inngs2 && (inngs2.legalBalls > 0 || inngs2.totalScore > 0 || inngs2.batsmenList.length > 0)) {
    printInnings(inngs2);
  }

  if (matchResultText) {
    lines.push(`\n🏆 RESULT: ${matchResultText}`);
    lines.push(divider);
  }

  return lines.join('\n');
}

/**
 * Format Ball-by-Ball event log into spreadsheet CSV format
 */
export function formatBallByBallCSV(events: DeliveryEvent[]): string {
  const headers = [
    'Innings',
    'Over',
    'BallInOver',
    'Striker',
    'NonStriker',
    'Bowler',
    'RunsBat',
    'RunsExtra',
    'ExtraType',
    'TotalRuns',
    'IsLegal',
    'IsWicket',
    'DismissalKind',
    'DismissedPlayer',
    'Fielder',
    'StrikeRotated',
    'OverCompleted',
    'Timestamp'
  ];

  const rows = events.map(e => [
    e.inningsNumber,
    e.overIndex + 1,
    e.ballInOver,
    `"${e.striker.replace(/"/g, '""')}"`,
    `"${e.nonStriker.replace(/"/g, '""')}"`,
    `"${e.bowler.replace(/"/g, '""')}"`,
    e.runsBat,
    e.runsExtra,
    e.extraType || 'none',
    e.runsBat + e.runsExtra,
    e.isLegalDelivery ? 1 : 0,
    e.wicket ? 1 : 0,
    e.wicket ? e.wicket.kind : '',
    e.wicket ? `"${e.wicket.dismissedPlayer.replace(/"/g, '""')}"` : '',
    e.wicket && e.wicket.fielder ? `"${e.wicket.fielder.replace(/"/g, '""')}"` : '',
    e.strikeRotated ? 1 : 0,
    e.overCompleted ? 1 : 0,
    new Date(e.timestamp).toISOString()
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Export match state to portable JSON archive
 */
export function exportMatchJSON(state: MatchV2State): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import and validate match state from JSON archive
 */
export function importMatchJSON(jsonStr: string): MatchV2State {
  const parsed = JSON.parse(jsonStr);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid match archive: Root must be an object');
  }
  if (!Array.isArray(parsed.events)) {
    throw new Error('Invalid match archive: Missing events array');
  }
  return parsed as MatchV2State;
}
