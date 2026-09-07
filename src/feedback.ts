import { gameState } from './state.js';
import { minifyState, generatePermalink } from './storage.js';
import { GameState } from './types.js';

export interface RuntimeErrorLog {
    timestamp: string;
    message: string;
    stack?: string;
    source?: string;
    lineno?: number;
    colno?: number;
}

const MAX_ERROR_LOGS = 20;
const runtimeErrors: RuntimeErrorLog[] = [];

/**
 * Record a runtime error or unhandled promise rejection into an in-memory ring buffer.
 */
export function recordRuntimeError(error: Error | string | ErrorEvent | PromiseRejectionEvent): void {
    let message = '';
    let stack: string | undefined;
    let source: string | undefined;
    let lineno: number | undefined;
    let colno: number | undefined;

    if (typeof error === 'string') {
        message = error;
    } else if (error instanceof Error) {
        message = error.message;
        stack = error.stack;
    } else if (typeof ErrorEvent !== 'undefined' && error instanceof ErrorEvent) {
        message = error.message;
        source = error.filename;
        lineno = error.lineno;
        colno = error.colno;
        if (error.error && error.error.stack) {
            stack = error.error.stack;
        }
    } else if (typeof PromiseRejectionEvent !== 'undefined' && error instanceof PromiseRejectionEvent) {
        message = `Unhandled Rejection: ${error.reason ? (error.reason.message || String(error.reason)) : 'Unknown rejection'}`;
        if (error.reason && error.reason.stack) {
            stack = error.reason.stack;
        }
    } else if (error && typeof error === 'object') {
        message = (error as any).message || JSON.stringify(error);
        stack = (error as any).stack;
    } else {
        message = String(error);
    }

    runtimeErrors.push({
        timestamp: new Date().toISOString(),
        message,
        stack,
        source,
        lineno,
        colno
    });

    if (runtimeErrors.length > MAX_ERROR_LOGS) {
        runtimeErrors.shift();
    }
}

/**
 * Retrieve all recorded runtime errors.
 */
export function getRuntimeErrors(): RuntimeErrorLog[] {
    return [...runtimeErrors];
}

/**
 * Clear the runtime error buffer.
 */
export function clearRuntimeErrors(): void {
    runtimeErrors.length = 0;
}

/**
 * Initialize global window error handlers to automatically catch runtime exceptions.
 */
export function initGlobalErrorListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event: ErrorEvent) => {
        recordRuntimeError(event);
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        recordRuntimeError(event);
    });
}

export interface BugReportOptions {
    userFeedback?: string;
    includeState?: boolean;
    appVersion?: string;
    stateOverride?: GameState;
}

/**
 * Generate a complete, structured Markdown bug report and diagnostic state that can be pasted directly
 * into an AI coding assistant chat or GitHub Issue to immediately reproduce and debug issues.
 */
export function generateBugReportMarkdown(options: BugReportOptions = {}): string {
    const state = options.stateOverride || gameState;
    const feedback = (options.userFeedback || '').trim();
    const includeState = options.includeState !== false;
    const version = options.appVersion || 'v20260907-003';
    const nowIso = new Date().toISOString();

    let clientEnv = 'Node.js / Headless Test Environment';
    let screenSize = 'N/A';
    let onlineStatus = 'N/A';

    if (typeof window !== 'undefined') {
        const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Browser';
        clientEnv = ua;
        screenSize = `${window.innerWidth}x${window.innerHeight} (devicePixelRatio: ${window.devicePixelRatio || 1})`;
        onlineStatus = typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean' ? String(navigator.onLine) : 'unknown';
    }

    const lines: string[] = [];

    lines.push(`## 🏏 Cricket Scorecard Bug Report & Diagnostic Context`);
    lines.push(``);
    lines.push(`**Timestamp**: \`${nowIso}\`  `);
    lines.push(`**App Version**: \`${version}\`  `);
    lines.push(`**Environment**: \`${clientEnv}\`  `);
    lines.push(`**Screen Size**: \`${screenSize}\` | **Online**: \`${onlineStatus}\` | **Theme**: \`${state.settings ? state.settings.theme : 'default'}\`  `);
    lines.push(``);

    lines.push(`### 1. User Feedback / Problem Description`);
    if (feedback) {
        lines.push(feedback);
    } else {
        lines.push(`_No written description provided._`);
    }
    lines.push(``);

    if (includeState && state && state.match) {
        const live = state.match.liveInnings;
        const currentBattingTeam = state.match.currentBattingTeam === 1 ? state.match.team1 : state.match.team2;
        const currentBowlingTeam = state.match.currentBattingTeam === 1 ? state.match.team2 : state.match.team1;

        lines.push(`### 2. Match State Summary`);
        lines.push(`- **Phase**: \`${state.phase || 'SETUP'}\` (Match Started: \`${state.matchStarted}\`, Match Over: \`${state.match.matchOver}\`)`);
        lines.push(`- **Innings**: \`${state.match.currentInnings}\` of \`${state.settings ? state.settings.totalInnings : 1}\``);
        lines.push(`- **Batting Team**: ${currentBattingTeam ? currentBattingTeam.name : 'Team 1'} (${currentBattingTeam ? currentBattingTeam.players.length : 0} players: ${currentBattingTeam ? currentBattingTeam.players.join(', ') : 'None'})`);
        lines.push(`- **Bowling Team**: ${currentBowlingTeam ? currentBowlingTeam.name : 'Team 2'} (${currentBowlingTeam ? currentBowlingTeam.players.length : 0} players: ${currentBowlingTeam ? currentBowlingTeam.players.join(', ') : 'None'})`);

        if (live) {
            const oversFormatted = `${Math.floor(live.balls / 6)}.${live.balls % 6}`;
            const maxOvers = state.settings ? state.settings.oversPerInnings : 8;
            lines.push(`- **Score**: **${live.score} / ${live.wickets}** (${oversFormatted} / ${maxOvers} ov)`);
            if (state.match.target !== null && state.match.target !== undefined) {
                lines.push(`- **Target**: **${state.match.target}** (2nd Innings)`);
            }
            lines.push(`- **Extras**: ${live.extras ? (live.extras.wides + live.extras.noballs + live.extras.byes + live.extras.legbyes) : 0} (Wides: ${live.extras ? live.extras.wides : 0}, No-Balls: ${live.extras ? live.extras.noballs : 0}, Byes: ${live.extras ? live.extras.byes : 0}, Leg-Byes: ${live.extras ? live.extras.legbyes : 0})`);

            // Active Batsmen
            const b1Name = live.currentBatsman1;
            const b2Name = live.currentBatsman2;
            const b1Stats = b1Name && live.batsmen ? live.batsmen[b1Name] : null;
            const b2Stats = b2Name && live.batsmen ? live.batsmen[b2Name] : null;

            lines.push(`- **Slot 1 Batsman**: ${b1Name ? `${b1Name} ${b1Stats && b1Stats.active ? '[STRIKER]' : '[NON-STRIKER]'} (${b1Stats ? b1Stats.runs : 0} runs, ${b1Stats ? b1Stats.balls : 0} balls, ${b1Stats ? (b1Stats.fours || 0) : 0}x4, ${b1Stats ? (b1Stats.sixes || 0) : 0}x6)` : 'None selected'}`);
            lines.push(`- **Slot 2 Batsman**: ${b2Name ? `${b2Name} ${b2Stats && b2Stats.active ? '[STRIKER]' : '[NON-STRIKER]'} (${b2Stats ? b2Stats.runs : 0} runs, ${b2Stats ? b2Stats.balls : 0} balls, ${b2Stats ? (b2Stats.fours || 0) : 0}x4, ${b2Stats ? (b2Stats.sixes || 0) : 0}x6)` : 'None selected'}`);

            // Current Bowler
            const boName = live.currentBowler;
            const boStats = boName && live.bowlers ? live.bowlers[boName] : null;
            if (boName && boStats) {
                const boOvers = `${Math.floor(boStats.balls / 6)}.${boStats.balls % 6}`;
                const econ = boStats.balls > 0 ? ((boStats.runs / boStats.balls) * 6).toFixed(2) : '0.00';
                lines.push(`- **Current Bowler**: ${boName} (${boOvers} ov, ${boStats.maidens || 0} maidens, ${boStats.runs} runs, ${boStats.wickets} wkts, Econ: ${econ}, wd: ${boStats.wides || 0}, nb: ${boStats.noballs || 0})`);
            } else {
                lines.push(`- **Current Bowler**: ${boName || 'None selected'}`);
            }

            lines.push(`- **Previous Bowler**: ${live.previousBowler || 'None'}`);
            lines.push(`- **Current Over Deliveries**: [${(live.overLog || []).join(', ') || 'None yet'}]`);

            // Fall of Wickets
            if (live.fow && live.fow.length > 0) {
                const fowList = live.fow.map(f => `${f.wicket}-${f.score} (${f.batsman}, ${f.overs} ov)`).join(', ');
                lines.push(`- **Fall of Wickets**: ${fowList}`);
            } else {
                lines.push(`- **Fall of Wickets**: None`);
            }

            lines.push(`- **Dismissed Batsmen**: [${(live.outBatsmen || []).join(', ') || 'None'}]`);

            // Completed Overs history
            if (live.overs && live.overs.length > 0) {
                lines.push(`- **Completed Overs History**:`);
                live.overs.forEach((o, i) => {
                    lines.push(`  - Over ${i + 1} (${o.bowler}): ${o.balls.join(', ')}`);
                });
            }
        }
        lines.push(``);

        // Reproduction section with permalink and minified JSON
        lines.push(`### 3. State Reproduction Payload`);
        const permalink = generatePermalink(state);
        if (permalink) {
            lines.push(`- **Permalink URL**: \`${permalink}\``);
        }

        const minified = minifyState(state);
        lines.push(`- **Minified State JSON**:`);
        lines.push('```json');
        lines.push(JSON.stringify(minified));
        lines.push('```');
        lines.push(``);
    }

    // Runtime errors
    lines.push(`### 4. Recorded Runtime Logs & Errors`);
    if (runtimeErrors.length > 0) {
        runtimeErrors.forEach((err, idx) => {
            lines.push(`**Error #${idx + 1}** (${err.timestamp}):`);
            lines.push(`- Message: \`${err.message}\``);
            if (err.source) lines.push(`- Location: \`${err.source}:${err.lineno || 0}:${err.colno || 0}\``);
            if (err.stack) {
                lines.push('```');
                lines.push(err.stack);
                lines.push('```');
            }
        });
    } else {
        lines.push(`_No unhandled runtime errors recorded during session._`);
    }
    lines.push(``);

    return lines.join('\n');
}

/**
 * Copy bug report to system clipboard.
 */
export async function copyBugReportToClipboard(reportText: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        try {
            await navigator.clipboard.writeText(reportText);
            return true;
        } catch (e) {
            console.warn("Clipboard API failed, falling back to textarea selection", e);
        }
    }

    // Fallback for non-https / mock environments
    if (typeof document !== 'undefined') {
        const textarea = document.createElement('textarea');
        textarea.value = reportText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textarea);
            return successful;
        } catch (err) {
            document.body.removeChild(textarea);
            console.error("ExecCommand copy fallback failed", err);
            return false;
        }
    }

    return false;
}

/**
 * Build a GitHub New Issue URL with pre-filled title and report body.
 */
export function getGitHubIssueUrl(reportText: string, customTitle?: string): string {
    const repoBase = 'https://github.com/aawc/cricket-scorecard/issues/new';
    const title = customTitle || 'Bug / Scoring Anomaly Report';
    
    // GitHub URL length is limited (~8000 chars); truncate body if necessary
    let body = reportText;
    if (body.length > 6000) {
        body = body.substring(0, 5950) + '\n\n...[Truncated: see full report attached or in state link]';
    }

    const encodedTitle = encodeURIComponent(title);
    const encodedBody = encodeURIComponent(body);
    return `${repoBase}?title=${encodedTitle}&body=${encodedBody}`;
}
