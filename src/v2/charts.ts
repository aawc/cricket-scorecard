/**
 * Cricket Scorecard PWA v2 - Zero-Dependency SVG Visual Analytics
 * Generates lightweight, responsive, and colorblind-safe SVG charts:
 * 1. Worm Chart (Cumulative scoring comparison between Innings 1 & 2)
 * 2. Manhattan Chart (Over-by-over runs and wickets bar chart)
 * 3. Partnerships Breakdown (Stacked horizontal partnership contributions)
 */

import { WormChartData, ManhattanBar, Partnership } from './types.js';

export interface ChartOptions {
  width?: number;
  height?: number;
  team1Name?: string;
  team2Name?: string;
  theme?: 'light' | 'dark' | 'green';
}

/**
 * Render Worm Chart SVG comparing Innings 1 (Blue #0072B2) and Innings 2 (Orange #D55E00)
 */
export function renderWormChartSVG(
  data: WormChartData,
  options: ChartOptions = {}
): string {
  const width = options.width || 600;
  const height = options.height || 300;
  const padL = 45;
  const padR = 25;
  const padT = 30;
  const padB = 40;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxBalls = Math.max(6, data.maxBalls);
  const maxScore = Math.max(30, data.maxScore);

  const scaleX = (ball: number) => padL + (ball / maxBalls) * plotW;
  const scaleY = (score: number) => padT + plotH - (score / maxScore) * plotH;

  // Grid Lines
  let gridLines = '';
  const scoreStep = maxScore <= 60 ? 10 : maxScore <= 120 ? 20 : 30;
  for (let s = 0; s <= maxScore; s += scoreStep) {
    const y = scaleY(s);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />`;
    gridLines += `<text x="${padL - 8}" y="${y + 4}" font-size="10" fill="currentColor" fill-opacity="0.6" text-anchor="end">${s}</text>`;
  }

  const oversCount = maxBalls / 6;
  for (let ov = 1; ov <= oversCount; ov++) {
    const x = scaleX(ov * 6);
    gridLines += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + plotH}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />`;
    gridLines += `<text x="${x}" y="${padT + plotH + 15}" font-size="10" fill="currentColor" fill-opacity="0.6" text-anchor="middle">Ov ${ov}</text>`;
  }

  // Generate Path Points
  function makePath(points: Array<{ ballIndex: number; score: number }>): string {
    if (!points || points.length === 0) return '';
    return points.map((p, idx) => {
      const cmd = idx === 0 ? 'M' : 'L';
      return `${cmd} ${scaleX(p.ballIndex).toFixed(1)} ${scaleY(p.score).toFixed(1)}`;
    }).join(' ');
  }

  const path1 = makePath(data.innings1);
  const path2 = makePath(data.innings2);

  // Wicket Markers
  let wickets1 = '';
  data.innings1.filter(p => p.isWicket).forEach(p => {
    const cx = scaleX(p.ballIndex);
    const cy = scaleY(p.score);
    wickets1 += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#0072B2" stroke="#ffffff" stroke-width="1.5" />`;
    wickets1 += `<text x="${cx}" y="${cy - 7}" font-size="9" font-weight="bold" fill="#0072B2" text-anchor="middle">W</text>`;
  });

  let wickets2 = '';
  data.innings2.filter(p => p.isWicket).forEach(p => {
    const cx = scaleX(p.ballIndex);
    const cy = scaleY(p.score);
    wickets2 += `<circle cx="${cx}" cy="${cy}" r="4.5" fill="#D55E00" stroke="#ffffff" stroke-width="1.5" />`;
    wickets2 += `<text x="${cx}" y="${cy - 7}" font-size="9" font-weight="bold" fill="#D55E00" text-anchor="middle">W</text>`;
  });

  const t1 = options.team1Name || '1st Innings';
  const t2 = options.team2Name || '2nd Innings';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="cric-svg-chart worm-chart" role="img" aria-label="Worm Chart comparing Innings 1 and 2">
      <!-- Background & Grid -->
      ${gridLines}

      <!-- Axes -->
      <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="currentColor" stroke-width="1.5" />
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="currentColor" stroke-width="1.5" />

      <!-- Innings 1 Path (Blue #0072B2) -->
      ${path1 ? `<path d="${path1}" fill="none" stroke="#0072B2" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
      ${wickets1}

      <!-- Innings 2 Path (Orange #D55E00) -->
      ${path2 ? `<path d="${path2}" fill="none" stroke="#D55E00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="5,2" />` : ''}
      ${wickets2}

      <!-- Legend -->
      <g transform="translate(${padL + 10}, ${padT - 12})">
        <line x1="0" y1="0" x2="20" y2="0" stroke="#0072B2" stroke-width="2.5" />
        <text x="25" y="3" font-size="11" font-weight="600" fill="currentColor">${t1}</text>
        ${path2 ? `
          <line x1="120" y1="0" x2="140" y2="0" stroke="#D55E00" stroke-width="2.5" stroke-dasharray="5,2" />
          <text x="145" y="3" font-size="11" font-weight="600" fill="currentColor">${t2}</text>
        ` : ''}
      </g>
    </svg>
  `.trim();
}

/**
 * Render Manhattan Chart SVG showing over-by-over runs and wickets
 */
export function renderManhattanChartSVG(
  bars: ManhattanBar[],
  options: ChartOptions = {}
): string {
  if (!bars || bars.length === 0) {
    return `<div class="text-muted small py-2">No completed overs recorded yet.</div>`;
  }

  const width = options.width || 600;
  const height = options.height || 260;
  const padL = 40;
  const padR = 20;
  const padT = 30;
  const padB = 40;

  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const maxRuns = Math.max(12, ...bars.map(b => b.runs));
  const roundedMax = Math.ceil(maxRuns / 5) * 5 + 2;

  const barCount = Math.max(1, bars.length);
  const slotW = plotW / barCount;
  const barW = Math.max(12, Math.min(28, slotW * 0.65));

  const scaleY = (runs: number) => padT + plotH - (runs / roundedMax) * plotH;

  // Grid Lines
  let gridLines = '';
  const step = roundedMax <= 15 ? 3 : 5;
  for (let r = 0; r <= roundedMax; r += step) {
    const y = scaleY(r);
    gridLines += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.1" stroke-dasharray="3,3" />`;
    gridLines += `<text x="${padL - 6}" y="${y + 3}" font-size="10" fill="currentColor" fill-opacity="0.6" text-anchor="end">${r}</text>`;
  }

  // Bars and Wicket Pins
  let barsSvg = '';
  bars.forEach((bar, idx) => {
    const cx = padL + idx * slotW + slotW / 2;
    const x = cx - barW / 2;
    const y = scaleY(bar.runs);
    const h = (padT + plotH) - y;

    // Bar rectangle
    const fillColor = bar.runs >= 15 ? '#D55E00' : bar.runs >= 8 ? '#0072B2' : '#56B4E9';
    barsSvg += `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${fillColor}" />`;

    // Runs label on bar
    if (bar.runs > 0) {
      barsSvg += `<text x="${cx}" y="${y - 4}" font-size="10" font-weight="bold" fill="currentColor" text-anchor="middle">${bar.runs}</text>`;
    }

    // Over label on X axis
    barsSvg += `<text x="${cx}" y="${padT + plotH + 15}" font-size="10" fill="currentColor" fill-opacity="0.7" text-anchor="middle">Ov ${bar.overNumber}</text>`;

    // Wickets pins
    if (bar.wickets > 0) {
      for (let w = 0; w < bar.wickets; w++) {
        const pinY = y - 14 - (w * 10);
        barsSvg += `<circle cx="${cx}" cy="${pinY}" r="4" fill="#D55E00" stroke="#ffffff" stroke-width="1" />`;
        barsSvg += `<text x="${cx}" y="${pinY + 3}" font-size="8" font-weight="bold" fill="#ffffff" text-anchor="middle">W</text>`;
      }
    }
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="cric-svg-chart manhattan-chart" role="img" aria-label="Manhattan Chart of runs per over">
      <!-- Grid -->
      ${gridLines}

      <!-- Axes -->
      <line x1="${padL}" y1="${padT + plotH}" x2="${width - padR}" y2="${padT + plotH}" stroke="currentColor" stroke-width="1.5" />
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="currentColor" stroke-width="1.5" />

      <!-- Bars -->
      ${barsSvg}
    </svg>
  `.trim();
}

/**
 * Render Partnerships Horizontal Stacked Bar SVG
 */
export function renderPartnershipChartSVG(
  partnerships: Partnership[],
  options: ChartOptions = {}
): string {
  if (!partnerships || partnerships.length === 0) {
    return `<div class="text-muted small py-2">No partnerships recorded yet.</div>`;
  }

  const width = options.width || 600;
  const rowH = 34;
  const padL = 60;
  const padR = 40;
  const height = partnerships.length * rowH + 40;

  const maxPshipRuns = Math.max(20, ...partnerships.map(p => p.totalRuns));
  const plotW = width - padL - padR;

  let rowsSvg = '';
  partnerships.forEach((pship, idx) => {
    const y = 30 + idx * rowH;
    const totalW = (pship.totalRuns / maxPshipRuns) * plotW;
    const p1W = pship.totalRuns > 0 ? (pship.player1Runs / pship.totalRuns) * totalW : 0;
    const p2W = totalW - p1W;

    // Wicket label
    const label = pship.unbroken ? `Curr (${pship.totalRuns})` : `${pship.wicketNumber}${getOrdinal(pship.wicketNumber)}`;
    rowsSvg += `<text x="${padL - 8}" y="${y + 14}" font-size="11" font-weight="600" fill="currentColor" text-anchor="end">${label}</text>`;

    // Stacked Bars
    if (pship.totalRuns > 0) {
      // Player 1 Segment (Blue)
      rowsSvg += `<rect x="${padL}" y="${y}" width="${p1W}" height="20" rx="2" fill="#0072B2" />`;
      // Player 2 Segment (Sky Blue)
      rowsSvg += `<rect x="${padL + p1W}" y="${y}" width="${p2W}" height="20" rx="2" fill="#56B4E9" />`;

      // Text descriptions
      if (p1W > 35) {
        rowsSvg += `<text x="${padL + p1W / 2}" y="${y + 14}" font-size="9" fill="#ffffff" font-weight="bold" text-anchor="middle">${pship.player1Runs}</text>`;
      }
      if (p2W > 35) {
        rowsSvg += `<text x="${padL + p1W + p2W / 2}" y="${y + 14}" font-size="9" fill="#ffffff" font-weight="bold" text-anchor="middle">${pship.player2Runs}</text>`;
      }

      // Total label on right
      rowsSvg += `<text x="${padL + totalW + 8}" y="${y + 14}" font-size="10" font-weight="bold" fill="currentColor">${pship.totalRuns} (${pship.totalBalls}b)</text>`;
    } else {
      rowsSvg += `<text x="${padL + 8}" y="${y + 14}" font-size="10" fill="currentColor" fill-opacity="0.5">${pship.totalRuns} (${pship.totalBalls}b)</text>`;
    }
  });

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" class="cric-svg-chart partnership-chart" role="img" aria-label="Partnerships Breakdown">
      <text x="${padL}" y="16" font-size="11" font-weight="bold" fill="currentColor">Wicket Partnerships</text>
      ${rowsSvg}
    </svg>
  `.trim();
}

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
