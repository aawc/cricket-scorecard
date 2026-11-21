/**
 * Umpire God Mode Modal Controller for Cricket Scorecard PWA.
 * Provides full match-state override capabilities with strict input validation,
 * 4-layer spectator security lockout, live-sync bootstrap, and colorblind-safe UI feedback.
 */

import { gameState, dispatch, setGameState } from './state.js';
import { buildGodModeDraftFromState, validateGodModePayload } from './reducer.js';
import { openModal, closeModal, cleanupModalScrollLock } from './modal.js';
import { getLiveSession, startLiveSession, syncStateIfLive, subscribeLiveSession, onUmpireDemoted } from './sync.js';
import { escapeHtml } from './rules.js';
import { GodModeInningsSummary, GodModeState, MatchPhase } from './types.js';

const VALID_TARGET_PHASES: ReadonlyArray<MatchPhase | 'AUTO'> = ['AUTO', 'SETUP', 'TOSS', 'PLAYING_INNINGS', 'INNINGS_BREAK', 'MATCH_OVER'];
const BAT_STAT_KEYS = ['runs', 'balls', 'fours', 'sixes'] as const;
const BOWL_STAT_KEYS = ['runs', 'balls', 'wickets', 'maidens'] as const;
const INN1_STAT_KEYS = ['score', 'wickets', 'overs', 'balls'] as const;
const LIVE_SCORE_KEYS = ['score', 'wickets', 'overs', 'balls', 'wides', 'noballs', 'byes', 'legbyes'] as const;

const LIVE_NUMERIC_SPECS = [
    ['score', 'gm-score', 'Score', 0], ['wickets', 'gm-wickets', 'Wickets', 0],
    ['overs', 'gm-overs', 'Completed overs', 0], ['balls', 'gm-balls', 'Balls in current over', 0, 5],
    ['wides', 'gm-wides', 'Wides', 0], ['noballs', 'gm-noballs', 'No-balls', 0],
    ['byes', 'gm-byes', 'Byes', 0], ['legbyes', 'gm-legbyes', 'Leg-byes', 0],
    ['b1Runs', 'gm-bat1-runs', 'Batsman 1 runs', 0], ['b1Balls', 'gm-bat1-balls', 'Batsman 1 balls', 0],
    ['b1Fours', 'gm-bat1-fours', 'Batsman 1 fours', 0], ['b1Sixes', 'gm-bat1-sixes', 'Batsman 1 sixes', 0],
    ['b2Runs', 'gm-bat2-runs', 'Batsman 2 runs', 0], ['b2Balls', 'gm-bat2-balls', 'Batsman 2 balls', 0],
    ['b2Fours', 'gm-bat2-fours', 'Batsman 2 fours', 0], ['b2Sixes', 'gm-bat2-sixes', 'Batsman 2 sixes', 0],
    ['bwRuns', 'gm-bowler-runs', 'Bowler runs', 0], ['bwBalls', 'gm-bowler-balls', 'Bowler balls', 0],
    ['bwWkts', 'gm-bowler-wickets', 'Bowler wickets', 0], ['bwMaidens', 'gm-bowler-maidens', 'Bowler maidens', 0]
] as const;

type SlotKey = 'bat1' | 'bat2' | 'bowler';
type SlotSnapshot = { name: string; stats: Record<string, string> };

let baselineDraft: GodModeState | null = null;
let initialRosterSnapshot = { t1Text: '', t2Text: '' };
let hydratedSlots: Record<SlotKey, SlotSnapshot> = { bat1: { name: '', stats: {} }, bat2: { name: '', stats: {} }, bowler: { name: '', stats: {} } };
let lastHydratedInnings: 1 | 2 = 1;
let uiRefreshCallback: (() => void) | null = null;
let domListenersBound = false;
let syncListenersBound = false;

const getEl = <T extends HTMLElement = HTMLElement>(id: string): T | null =>
    typeof document !== 'undefined' ? (document.getElementById(id) as T | null) : null;
const getVal = (id: string): string => { const el = getEl<HTMLInputElement>(id); return el && typeof el.value === 'string' ? el.value : ''; };
const setVal = (id: string, val: string): void => { const el = getEl<HTMLInputElement>(id); if (el) el.value = val; };
const getChecked = (id: string): boolean => !!getEl<HTMLInputElement>(id)?.checked;
const setChecked = (id: string, checked: boolean): void => { const el = getEl<HTMLInputElement>(id); if (el) el.checked = checked; };
const toggleHidden = (id: string, hide: boolean): void => { getEl(id)?.classList[hide ? 'add' : 'remove']('d-none'); };
const parseNameList = (raw: string): string[] => raw.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);

function hydrateStatFields(prefix: string, keys: readonly string[], source?: Record<string, any> | null): void {
    for (const k of keys) setVal(`${prefix}-${k}`, source ? String(source[k] ?? 0) : '');
}

function snapshotSlot(slot: SlotKey, prefix: string, keys: readonly string[], name: string): void {
    const stats: Record<string, string> = {};
    for (const k of keys) stats[k] = getVal(`${prefix}-${k}`).trim();
    hydratedSlots[slot] = { name, stats };
}

function hydratePlayerSlot(slot: SlotKey, prefix: string, keys: readonly string[], name: string, source?: Record<string, any> | null): void {
    setVal(`${prefix}-name`, name);
    hydrateStatFields(prefix, keys, name ? source : null);
    snapshotSlot(slot, prefix, keys, name);
}

function buildSlotStats<K extends string>(slot: SlotKey, curName: string, prefix: string, keys: readonly K[], vals: readonly (number | undefined)[]): Record<K, number | undefined> {
    const out = {} as Record<K, number | undefined>;
    keys.forEach((k, i) => {
        out[k] = curName !== hydratedSlots[slot].name && getVal(`${prefix}-${k}`).trim() === hydratedSlots[slot].stats[k] ? undefined : vals[i];
    });
    return out;
}

function hydrateInn1Summary(s1?: { score?: number; wickets?: number; balls?: number } | null): void {
    hydrateStatFields('gm-inn1', INN1_STAT_KEYS, s1 ? {
        score: s1.score ?? 0, wickets: s1.wickets ?? 0, overs: Math.floor((s1.balls ?? 0) / 6), balls: (s1.balls ?? 0) % 6
    } : null);
}

function lookupPlayerEntry<T>(a: Record<string, T> | undefined, b: Record<string, T> | undefined, name: string): T | undefined {
    if (a && Object.prototype.hasOwnProperty.call(a, name)) return a[name];
    if (b && Object.prototype.hasOwnProperty.call(b, name)) return b[name];
    return undefined;
}

function isSpectatorSession(): boolean {
    const session = getLiveSession();
    return !!(session && session.isLive && session.role === 'SPECTATOR');
}

function clearGodModeError(): void {
    const banner = getEl('gm-error-banner');
    if (banner) { banner.textContent = ''; banner.classList.add('d-none'); }
}

function showGodModeError(reason: string): void {
    const banner = getEl('gm-error-banner');
    if (banner) { banner.textContent = reason.startsWith('[ERROR]') ? reason : `[ERROR] ${reason}`; banner.classList.remove('d-none'); }
}

function parseStrictInt(raw: string, label: string, allowEmpty: boolean, minVal: number = 0, maxVal?: number): { value?: number; error?: string } {
    const trimmed = raw.trim();
    if (trimmed === '') return allowEmpty ? { value: undefined } : { error: `${label} is required.` };
    if (trimmed.startsWith('-')) return { error: `${label} cannot be negative.` };
    if (!/^\d+$/.test(trimmed)) return { error: `${label} must be a whole number.` };
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed) || parsed < minVal) return { error: `${label} must be at least ${minVal}.` };
    if (maxVal !== undefined && parsed > maxVal) return { error: `${label} must be between ${minVal} and ${maxVal}.` };
    return { value: parsed };
}

function parseStatGroup<K extends string>(specs: ReadonlyArray<readonly [K, string, string, number?, number?]>): { values?: Record<K, number | undefined>; error?: string } {
    const values = {} as Record<K, number | undefined>;
    for (const [key, id, label, min, max] of specs) {
        const res = parseStrictInt(getVal(id), label, true, min ?? 0, max);
        if (res.error) return { error: res.error };
        values[key] = res.value;
    }
    return { values };
}

function syncStrikerPillClasses(): void {
    const s2 = getChecked('gm-striker-2');
    getEl('gm-striker-pill-1')?.classList[s2 ? 'remove' : 'add']('active');
    getEl('gm-striker-pill-2')?.classList[s2 ? 'add' : 'remove']('active');
    const lbl1 = getEl('gm-striker-label-1');
    const lbl2 = getEl('gm-striker-label-2');
    if (lbl1) lbl1.textContent = s2 ? '○ Batter 1 [NON-STRIKER]' : '● Batter 1 [STRIKER]';
    if (lbl2) lbl2.textContent = s2 ? '● Batter 2 [STRIKER]' : '○ Batter 2 [NON-STRIKER]';
}

function syncBattingTeamOptionLabels(): void {
    const opt1 = getEl('gm-batting-team-opt-1');
    const opt2 = getEl('gm-batting-team-opt-2');
    if (opt1) opt1.textContent = getVal('gm-team1-name').trim() || gameState.match?.team1?.name || 'Team 1';
    if (opt2) opt2.textContent = getVal('gm-team2-name').trim() || gameState.match?.team2?.name || 'Team 2';
}

function refreshGodModeDatalists(): void {
    const battingTeamNum: 1 | 2 = getVal('gm-batting-team') === '2' ? 2 : 1;
    const t1 = parseNameList(getVal('gm-team1-players'));
    const t2 = parseNameList(getVal('gm-team2-players'));
    const effT1 = t1.length > 0 ? t1 : (gameState.match?.team1?.players || []);
    const effT2 = t2.length > 0 ? t2 : (gameState.match?.team2?.players || []);
    const renderOpts = (pool: string[]) => pool.map(p => `<option value="${escapeHtml(p)}"></option>`).join('');
    const batDl = getEl('gm-batting-datalist');
    const bowlDl = getEl('gm-bowling-datalist');
    if (batDl) batDl.innerHTML = renderOpts(battingTeamNum === 1 ? effT1 : effT2);
    if (bowlDl) bowlDl.innerHTML = renderOpts(battingTeamNum === 1 ? effT2 : effT1);
}

function hydrateLiveSection(draft: GodModeState | null, clearPlayers: boolean): void {
    const ex = draft?.extras;
    hydrateStatFields('gm', LIVE_SCORE_KEYS, clearPlayers || !draft
        ? { score: 0, wickets: 0, overs: 0, balls: 0, wides: 0, noballs: 0, byes: 0, legbyes: 0 }
        : { score: draft.score ?? 0, wickets: draft.wickets ?? 0, overs: draft.overs ?? 0, balls: draft.ballsInOver ?? 0, wides: ex?.wides ?? 0, noballs: ex?.noballs ?? 0, byes: ex?.byes ?? 0, legbyes: ex?.legbyes ?? 0 });
    hydratePlayerSlot('bat1', 'gm-bat1', BAT_STAT_KEYS, clearPlayers || !draft ? '' : (draft.currentBatsman1 || ''), draft?.batsman1Stats);
    hydratePlayerSlot('bat2', 'gm-bat2', BAT_STAT_KEYS, clearPlayers || !draft ? '' : (draft.currentBatsman2 || ''), draft?.batsman2Stats);
    const strikerSlot = !clearPlayers && draft?.activeStriker === 2 ? 2 : 1;
    setChecked('gm-striker-1', strikerSlot === 1);
    setChecked('gm-striker-2', strikerSlot === 2);
    syncStrikerPillClasses();
    hydratePlayerSlot('bowler', 'gm-bowler', BOWL_STAT_KEYS, clearPlayers || !draft ? '' : (draft.currentBowler || ''), draft?.currentBowlerStats);
    setVal('gm-prev-bowler', clearPlayers || !draft ? '' : (draft.previousBowler || ''));
    setVal('gm-out-batsmen', !clearPlayers && draft?.outBatsmen?.length ? draft.outBatsmen.join(', ') : '');
}

function ensureSyncListeners(): void {
    if (syncListenersBound) return;
    syncListenersBound = true;
    subscribeLiveSession(() => { syncGodModeVisibility(); });
    onUmpireDemoted(() => { closeModal('godModeModal'); clearGodModeError(); syncGodModeVisibility(); uiRefreshCallback?.(); });
}

export function syncGodModeVisibility(): void {
    if (typeof document === 'undefined') return;
    const spectator = isSpectatorSession();
    const btn = getEl<HTMLButtonElement>('god-mode-btn');
    if (btn) {
        btn.disabled = spectator;
        btn.classList[spectator ? 'add' : 'remove']('d-none');
        if (spectator) btn.setAttribute('aria-hidden', 'true');
        else btn.removeAttribute('aria-hidden');
    }
    getEl('app-container')?.classList[spectator ? 'add' : 'remove']('spectator-locked');
    if (spectator && getEl('godModeModal')?.classList.contains('show')) { clearGodModeError(); closeModal('godModeModal'); }
}

export function swapGodModeStrike(): void {
    if (isSpectatorSession()) return;
    const nextSlot1 = getChecked('gm-striker-2');
    setChecked('gm-striker-1', nextSlot1);
    setChecked('gm-striker-2', !nextSlot1);
    syncStrikerPillClasses();
}

export function handleGodModeBowlerInput(): void {
    const bowlerName = getVal('gm-bowler-name').trim();
    const existing = bowlerName ? lookupPlayerEntry(baselineDraft?.bowlersOverrides, gameState.match?.liveInnings?.bowlers, bowlerName) : undefined;
    const ballsInOver = parseStrictInt(getVal('gm-balls'), 'Balls', true, 0, 5).value ?? ((gameState.match?.liveInnings?.balls ?? 0) % 6);
    hydrateStatFields('gm-bowler', BOWL_STAT_KEYS, bowlerName ? (existing ?? { runs: 0, balls: ballsInOver, wickets: 0, maidens: 0 }) : null);
    snapshotSlot('bowler', 'gm-bowler', BOWL_STAT_KEYS, bowlerName);
}

export function handleGodModeBatterInput(slot: 1 | 2): void {
    const prefix = slot === 1 ? 'gm-bat1' : 'gm-bat2';
    const batterName = getVal(`${prefix}-name`).trim();
    const existing = batterName ? lookupPlayerEntry(baselineDraft?.batsmenOverrides, gameState.match?.liveInnings?.batsmen, batterName) : undefined;
    hydrateStatFields(prefix, BAT_STAT_KEYS, batterName ? (existing ?? { runs: 0, balls: 0, fours: 0, sixes: 0 }) : null);
    snapshotSlot(slot === 1 ? 'bat1' : 'bat2', prefix, BAT_STAT_KEYS, batterName);
}

export function handleGodModePhaseOrInningsChange(): void {
    const phaseVal = getVal('gm-phase') || 'AUTO';
    if (phaseVal === 'INNINGS_BREAK' && getVal('gm-innings') === '2') { setVal('gm-innings', '1'); handleGodModeInningsChange(); return; }
    const isPreMatch = phaseVal === 'SETUP' || phaseVal === 'TOSS';
    const inningsVal = getVal('gm-innings') === '2' ? 2 : 1;
    toggleHidden('gm-live-section', isPreMatch);
    toggleHidden('gm-innings1-section', isPreMatch || inningsVal !== 2);
    toggleHidden('gm-target-wrap', isPreMatch || (inningsVal !== 2 && phaseVal !== 'INNINGS_BREAK'));
    refreshGodModeDatalists();
}

export function handleGodModeInningsChange(): void {
    const nextInnings: 1 | 2 = getVal('gm-innings') === '2' ? 2 : 1;
    const curPhase = getVal('gm-phase') || 'AUTO';
    const base = baselineDraft;
    const baseActive = !!(base && base.phase !== 'SETUP' && base.phase !== 'TOSS');
    const intOr = (id: string, fb: number, max?: number) => parseStrictInt(getVal(id), id, true, 0, max).value ?? fb;

    if (baseActive && base!.currentInnings === nextInnings) {
        if (nextInnings === 2 && curPhase === 'INNINGS_BREAK') setVal('gm-phase', 'PLAYING_INNINGS');
        else if (nextInnings === 1 && ((curPhase === 'PLAYING_INNINGS' && base!.phase === 'INNINGS_BREAK') || curPhase === 'MATCH_OVER')) {
            setVal('gm-phase', base!.phase || 'PLAYING_INNINGS');
        }
        setVal('gm-batting-team', String(base!.currentBattingTeam ?? nextInnings));
        hydrateInn1Summary(nextInnings === 2 ? base!.innings1Summary : null);
        setVal('gm-target', (nextInnings === 2 || base!.phase === 'INNINGS_BREAK') && base!.target != null ? String(base!.target) : '');
        hydrateLiveSection(base, false);
    } else if (nextInnings === 2) {
        if (curPhase === 'INNINGS_BREAK') setVal('gm-phase', 'PLAYING_INNINGS');
        if (lastHydratedInnings !== 2) setVal('gm-batting-team', getVal('gm-batting-team') === '2' ? '1' : '2');
        const s1Score = intOr('gm-score', base?.score ?? 0);
        hydrateStatFields('gm-inn1', INN1_STAT_KEYS, {
            score: s1Score, wickets: intOr('gm-wickets', base?.wickets ?? 0),
            overs: intOr('gm-overs', base?.overs ?? 0), balls: intOr('gm-balls', base?.ballsInOver ?? 0, 5)
        });
        setVal('gm-target', String(s1Score + 1));
        hydrateLiveSection(null, true);
    } else {
        if (curPhase === 'MATCH_OVER') setVal('gm-phase', 'PLAYING_INNINGS');
        if (lastHydratedInnings !== 1) setVal('gm-batting-team', getVal('gm-batting-team') === '1' ? '2' : '1');
        const s1BallsTotal = base?.innings1Summary?.balls ?? 0;
        const restored = {
            score: intOr('gm-inn1-score', base?.innings1Summary?.score ?? 0),
            wickets: intOr('gm-inn1-wickets', base?.innings1Summary?.wickets ?? 0),
            overs: intOr('gm-inn1-overs', Math.floor(s1BallsTotal / 6)),
            balls: intOr('gm-inn1-balls', s1BallsTotal % 6, 5)
        };
        hydrateInn1Summary(null);
        setVal('gm-target', '');
        hydrateLiveSection(null, true);
        hydrateStatFields('gm', INN1_STAT_KEYS, restored);
    }
    lastHydratedInnings = nextInnings;
    handleGodModePhaseOrInningsChange();
}

export function openGodModeModal(triggerEl?: HTMLElement | null): void {
    ensureSyncListeners();
    if (isSpectatorSession()) { closeModal('godModeModal'); return; }

    clearGodModeError();
    baselineDraft = buildGodModeDraftFromState(gameState);
    const isPreMatch = !gameState.matchStarted || gameState.phase === 'SETUP' || gameState.phase === 'TOSS';

    const t1Text = (baselineDraft.team1Players || []).join('\n');
    const t2Text = (baselineDraft.team2Players || []).join('\n');
    setVal('gm-team1-name', baselineDraft.team1Name || 'Team 1');
    setVal('gm-team1-players', t1Text);
    setVal('gm-team2-name', baselineDraft.team2Name || 'Team 2');
    setVal('gm-team2-players', t2Text);
    initialRosterSnapshot = { t1Text, t2Text };
    syncBattingTeamOptionLabels();

    lastHydratedInnings = baselineDraft.currentInnings === 2 ? 2 : 1;
    setVal('gm-phase', gameState.phase);
    setVal('gm-innings', String(lastHydratedInnings));
    setVal('gm-batting-team', String(baselineDraft.currentBattingTeam ?? 1));
    setVal('gm-target', !isPreMatch && baselineDraft.target != null ? String(baselineDraft.target) : '');

    hydrateLiveSection(baselineDraft, isPreMatch);
    hydrateInn1Summary(!isPreMatch && baselineDraft.currentInnings === 2 ? baselineDraft.innings1Summary : null);

    setVal('gm-overs-per-innings', String(baselineDraft.oversPerInnings ?? 8));
    setVal('gm-max-overs-per-bowler', String(baselineDraft.maxOversPerBowler ?? 2));
    setChecked('gm-allow-single-batsman', baselineDraft.allowSingleBatsman ?? true);
    setChecked('gm-enable-legbyes', baselineDraft.enableLegByes ?? false);

    handleGodModePhaseOrInningsChange();
    const modalEl = getEl('godModeModal');
    if (modalEl) { modalEl.classList.add('modal'); openModal(modalEl, triggerEl || getEl('god-mode-btn')); }
}

export function applyGodModeModal(): boolean {
    ensureSyncListeners();
    if (isSpectatorSession()) { closeModal('godModeModal'); return false; }

    clearGodModeError();
    const base = baselineDraft || buildGodModeDraftFromState(gameState);
    const rawPhase = (getVal('gm-phase').trim() || 'AUTO') as MatchPhase | 'AUTO';
    if (!VALID_TARGET_PHASES.includes(rawPhase)) { showGodModeError('Unsupported target match phase.'); return false; }

    const rulesParsed = parseStatGroup([['oversPerInnings', 'gm-overs-per-innings', 'Overs per innings', 1], ['maxOversPerBowler', 'gm-max-overs-per-bowler', 'Max overs per bowler', 1]]);
    if (rulesParsed.error || !rulesParsed.values) { showGodModeError(rulesParsed.error || 'Invalid match rules.'); return false; }

    const rawInnings = getVal('gm-innings').trim();
    const rawBatTeam = getVal('gm-batting-team').trim();
    if ((rawInnings !== '' && rawInnings !== '1' && rawInnings !== '2') || (rawBatTeam !== '' && rawBatTeam !== '1' && rawBatTeam !== '2')) {
        showGodModeError('Innings and batting team must be 1 or 2.');
        return false;
    }
    const currentInnings: 1 | 2 = rawInnings === '2' ? 2 : 1;
    const currentBattingTeam: 1 | 2 = rawBatTeam === '2' ? 2 : 1;
    const curT1Text = getVal('gm-team1-players');
    const curT2Text = getVal('gm-team2-players');
    const parsedT1 = parseNameList(curT1Text);
    const parsedT2 = parseNameList(curT2Text);

    const payload: GodModeState = {
        targetPhase: rawPhase,
        oversPerInnings: rulesParsed.values.oversPerInnings ?? base.oversPerInnings,
        maxOversPerBowler: rulesParsed.values.maxOversPerBowler ?? base.maxOversPerBowler,
        allowSingleBatsman: getEl('gm-allow-single-batsman') ? getChecked('gm-allow-single-batsman') : base.allowSingleBatsman,
        enableLegByes: getEl('gm-enable-legbyes') ? getChecked('gm-enable-legbyes') : base.enableLegByes,
        team1Name: getVal('gm-team1-name').trim() || base.team1Name,
        team2Name: getVal('gm-team2-name').trim() || base.team2Name,
        team1Players: (curT1Text !== initialRosterSnapshot.t1Text || parsedT1.length > 0) ? parsedT1 : undefined,
        team2Players: (curT2Text !== initialRosterSnapshot.t2Text || parsedT2.length > 0) ? parsedT2 : undefined,
        currentInnings, currentBattingTeam
    };

    if (rawPhase !== 'SETUP' && rawPhase !== 'TOSS') {
        const liveParsed = parseStatGroup(LIVE_NUMERIC_SPECS);
        if (liveParsed.error || !liveParsed.values) { showGodModeError(liveParsed.error || 'Invalid numeric input.'); return false; }
        const v = liveParsed.values;
        const bat1Name = getVal('gm-bat1-name').trim();
        const bat2Name = getVal('gm-bat2-name').trim();
        const bowlerName = getVal('gm-bowler-name').trim();

        if (currentInnings === 2 || rawPhase === 'INNINGS_BREAK') {
            const targetRes = parseStrictInt(getVal('gm-target'), 'Target score', true, 1);
            if (targetRes.error) { showGodModeError(targetRes.error); return false; }
            if (targetRes.value !== undefined) payload.target = targetRes.value;
        } else {
            payload.target = null;
        }

        if (currentInnings === 2) {
            const inn1Parsed = parseStatGroup([
                ['score', 'gm-inn1-score', 'Innings 1 score', 0], ['wickets', 'gm-inn1-wickets', 'Innings 1 wickets', 0],
                ['overs', 'gm-inn1-overs', 'Innings 1 overs', 0], ['balls', 'gm-inn1-balls', 'Innings 1 balls in over', 0, 5]
            ]);
            if (inn1Parsed.error || !inn1Parsed.values) { showGodModeError(inn1Parsed.error || 'Invalid Innings 1 summary.'); return false; }
            const iv = inn1Parsed.values;
            if (iv.score !== undefined || iv.wickets !== undefined || iv.overs !== undefined || iv.balls !== undefined || base.innings1Summary) {
                const s1Base: GodModeInningsSummary = base.innings1Summary ? JSON.parse(JSON.stringify(base.innings1Summary)) : { score: 0, wickets: 0, balls: 0 };
                const nextWkts = iv.wickets ?? s1Base.wickets;
                const nextBalls = (iv.overs !== undefined || iv.balls !== undefined)
                    ? (iv.overs ?? Math.floor(s1Base.balls / 6)) * 6 + (iv.balls ?? (s1Base.balls % 6))
                    : s1Base.balls;
                if (s1Base.outBatsmen && s1Base.outBatsmen.length > nextWkts) s1Base.outBatsmen = s1Base.outBatsmen.slice(0, nextWkts);
                if (s1Base.fow && s1Base.fow.length > nextWkts) s1Base.fow = s1Base.fow.slice(0, nextWkts);
                payload.innings1Summary = { ...s1Base, score: iv.score ?? s1Base.score, wickets: nextWkts, balls: nextBalls };
            }
        }

        const sameActiveInnings =
            base.phase !== 'SETUP' && base.phase !== 'TOSS' &&
            currentInnings === base.currentInnings && currentBattingTeam === base.currentBattingTeam;

        if (sameActiveInnings) {
            if (base.batsmenOverrides) payload.batsmenOverrides = JSON.parse(JSON.stringify(base.batsmenOverrides));
            if (base.bowlersOverrides) payload.bowlersOverrides = JSON.parse(JSON.stringify(base.bowlersOverrides));
        }

        if (v.score !== undefined) payload.score = v.score;
        if (v.wickets !== undefined) payload.wickets = v.wickets;
        if (v.overs !== undefined) payload.overs = v.overs;
        if (v.balls !== undefined) payload.ballsInOver = v.balls;

        payload.extras = {
            wides: v.wides ?? (sameActiveInnings ? base.extras?.wides : 0) ?? 0, noballs: v.noballs ?? (sameActiveInnings ? base.extras?.noballs : 0) ?? 0,
            byes: v.byes ?? (sameActiveInnings ? base.extras?.byes : 0) ?? 0, legbyes: v.legbyes ?? (sameActiveInnings ? base.extras?.legbyes : 0) ?? 0
        };
        payload.currentBatsman1 = sameActiveInnings ? bat1Name : (bat1Name || undefined);
        payload.batsman1Stats = buildSlotStats('bat1', bat1Name, 'gm-bat1', BAT_STAT_KEYS, [v.b1Runs, v.b1Balls, v.b1Fours, v.b1Sixes]);
        payload.currentBatsman2 = sameActiveInnings ? bat2Name : (bat2Name || undefined);
        payload.batsman2Stats = buildSlotStats('bat2', bat2Name, 'gm-bat2', BAT_STAT_KEYS, [v.b2Runs, v.b2Balls, v.b2Fours, v.b2Sixes]);
        payload.activeStriker = getChecked('gm-striker-2') ? 2 : 1;
        payload.outBatsmen = parseNameList(getVal('gm-out-batsmen'));
        payload.currentBowler = sameActiveInnings ? bowlerName : (bowlerName || undefined);
        payload.currentBowlerStats = buildSlotStats('bowler', bowlerName, 'gm-bowler', BOWL_STAT_KEYS, [v.bwRuns, v.bwBalls, v.bwWkts, v.bwMaidens]);
        payload.previousBowler = getVal('gm-prev-bowler').trim() || null;
    }

    const validationError = validateGodModePayload(gameState, payload);
    if (validationError) { showGodModeError(validationError); return false; }

    dispatch({ type: 'APPLY_GOD_MODE', payload });

    const settingsSection = getEl('settings-section');
    const flipContainer = typeof document !== 'undefined' ? document.querySelector('.flip-container') : null;
    if (!gameState.matchStarted || gameState.phase === 'SETUP' || gameState.phase === 'TOSS') {
        settingsSection?.classList.remove('hidden');
        flipContainer?.classList.add('hidden');
        flipContainer?.classList.remove('flipped');
        document.body?.classList?.remove('screenshot-mode');
    } else {
        settingsSection?.classList.add('hidden');
        flipContainer?.classList.remove('hidden');
        if (!gameState.match.matchOver) { flipContainer?.classList.remove('flipped'); document.body?.classList?.remove('screenshot-mode'); }
    }

    setVal('overs-per-innings', String(gameState.settings.oversPerInnings));
    setVal('max-overs-per-bowler', String(gameState.settings.maxOversPerBowler));
    setChecked('allow-single-batsman', gameState.settings.allowSingleBatsman);
    setChecked('enable-legbyes', gameState.settings.enableLegByes);

    const session = getLiveSession();
    if (gameState.matchStarted && gameState.phase !== 'TOSS') {
        if (!session.isLive || session.role !== 'UMPIRE') {
            startLiveSession(gameState, undefined, undefined, (updatedState) => { setGameState(updatedState); uiRefreshCallback?.(); });
        } else {
            void syncStateIfLive(gameState, true);
        }
    } else if (session.isLive && session.role === 'UMPIRE') {
        void syncStateIfLive(gameState, true);
    }

    baselineDraft = null;
    closeModal('godModeModal');
    if (gameState.phase !== 'TOSS') closeModal('tossModal');
    cleanupModalScrollLock();
    uiRefreshCallback?.();
    if (gameState.phase === 'TOSS' && !(typeof window !== 'undefined' && (window as any).__TEST_ENV__)) openModal('tossModal');
    return true;
}

export function initGodModeUI(onRefresh?: () => void): void {
    if (onRefresh) uiRefreshCallback = onRefresh;
    ensureSyncListeners();
    syncGodModeVisibility();
    if (domListenersBound || typeof document === 'undefined') return;
    domListenersBound = true;

    getEl('god-mode-btn')?.addEventListener('click', (e) => { e.preventDefault(); openGodModeModal(getEl('god-mode-btn')); });
    getEl('gm-apply-btn')?.addEventListener('click', () => { applyGodModeModal(); });
    getEl('gm-cancel-btn')?.addEventListener('click', () => { closeModal('godModeModal'); });
    getEl('gm-swap-strike-btn')?.addEventListener('click', () => { swapGodModeStrike(); });
    for (const evt of ['input', 'change'] as const) {
        getEl('gm-bowler-name')?.addEventListener(evt, () => { handleGodModeBowlerInput(); });
        getEl('gm-bat1-name')?.addEventListener(evt, () => { handleGodModeBatterInput(1); });
        getEl('gm-bat2-name')?.addEventListener(evt, () => { handleGodModeBatterInput(2); });
    }
    getEl('gm-team1-name')?.addEventListener('input', () => { syncBattingTeamOptionLabels(); });
    getEl('gm-team2-name')?.addEventListener('input', () => { syncBattingTeamOptionLabels(); });
    getEl('gm-team1-players')?.addEventListener('input', () => { refreshGodModeDatalists(); });
    getEl('gm-team2-players')?.addEventListener('input', () => { refreshGodModeDatalists(); });
    getEl('gm-phase')?.addEventListener('change', () => { handleGodModePhaseOrInningsChange(); });
    getEl('gm-innings')?.addEventListener('change', () => { handleGodModeInningsChange(); });
    getEl('gm-batting-team')?.addEventListener('change', () => { handleGodModePhaseOrInningsChange(); });
    getEl('gm-striker-1')?.addEventListener('change', () => { syncStrikerPillClasses(); });
    getEl('gm-striker-2')?.addEventListener('change', () => { syncStrikerPillClasses(); });
}
