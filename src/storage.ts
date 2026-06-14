import { GameState, LiveInnings, Team } from './types.js';

function getLZString(): any {
    if (typeof window !== 'undefined' && window.LZString) return window.LZString;
    if (typeof global !== 'undefined' && (global as any).LZString) return (global as any).LZString;
    return null;
}

export function saveState(state: GameState): void {
    try {
        localStorage.setItem('cricketScorecardState', JSON.stringify(state));
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

export function clearState(): void {
    try {
        localStorage.removeItem('cricketScorecardState');
    } catch (e) {
        console.error("Failed to clear state from localStorage", e);
    }
}

export function loadState(): GameState | null {
    const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlStateCompressed = urlParams ? urlParams.get('s') : null;
    const urlStateLegacy = urlParams ? urlParams.get('state') : null;
    let loaded = false;
    let loadedState: any = null;

    if (urlStateCompressed) {
        try {
            const LZStringInstance = getLZString();
            if (!LZStringInstance) {
                throw new Error("LZString library is not loaded.");
            }
            const decompressed = LZStringInstance.decompressFromEncodedURIComponent(urlStateCompressed);
            if (!decompressed) {
                throw new Error("Decompression failed (invalid payload).");
            }
            const min = JSON.parse(decompressed);
            loadedState = unminifyState(min);
            loadedState.matchStarted = true;
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
            }
            loaded = true;
        } catch (e) {
            console.error("Failed to parse compressed state from URL", e);
            throw new Error("Failed to load match from compressed link.");
        }
    } else if (urlStateLegacy) {
        try {
            const decodedState = JSON.parse(decodeURIComponent(urlStateLegacy));
            loadedState = decodedState;
            loadedState.matchStarted = true;
            if (typeof window !== 'undefined') {
                window.history.replaceState({}, '', window.location.pathname);
            }
            loaded = true;
        } catch (e) {
            console.error("Failed to parse legacy state from URL", e);
            throw new Error("Failed to load match from link.");
        }
    }

    if (!loaded) {
        const savedState = localStorage.getItem('cricketScorecardState');
        if (savedState) {
            try {
                loadedState = JSON.parse(savedState);
                loaded = true;
            } catch (e) {
                console.error("Failed to parse state from localStorage", e);
            }
        }
    }

    if (loaded && loadedState) {
        // Run migrations/healing
        if (loadedState.match) {
            if (loadedState.match.liveInnings) {
                healInningsOvers(loadedState.match.liveInnings);
            }
            if (loadedState.match.team1 && loadedState.match.team1.innings) {
                loadedState.match.team1.innings.forEach(healInningsOvers);
            }
            if (loadedState.match.team2 && loadedState.match.team2.innings) {
                loadedState.match.team2.innings.forEach(healInningsOvers);
            }
            
            // Migration: Archive live innings if match is over but it wasn't archived
            if (loadedState.match.matchOver) {
                const match = loadedState.match;
                const live = match.liveInnings;
                if (live && live.balls > 0) {
                    const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
                    const expectedInningsCount = Math.ceil((match.currentInnings || 1) / 2);
                    if (battingTeam && (!battingTeam.innings || battingTeam.innings.length < expectedInningsCount)) {
                        console.log("Migration: Archiving live innings on load");
                        if (live.overLog && live.overLog.length > 0) {
                            if (!live.overs) live.overs = [];
                            live.overs.push({
                                bowler: live.currentBowler || "Unknown",
                                balls: [...live.overLog]
                            });
                            live.overLog = [];
                        }
                        if (!battingTeam.innings) battingTeam.innings = [];
                        battingTeam.innings.push(JSON.parse(JSON.stringify(live)));
                    }
                }
            }
        }
        return loadedState as GameState;
    }

    return null;
}

export function generatePermalink(state: GameState): string {
    const minified = minifyState(state);
    let url: string;
    const LZStringInstance = getLZString();
    
    if (typeof window !== 'undefined') {
        if (LZStringInstance) {
            const compressed = LZStringInstance.compressToEncodedURIComponent(JSON.stringify(minified));
            url = window.location.origin + window.location.pathname + '?s=' + compressed;
        } else {
            const serializedState = encodeURIComponent(JSON.stringify({ settings: state.settings, match: state.match }));
            url = window.location.origin + window.location.pathname + '?state=' + serializedState;
        }
    } else {
        url = ""; // Fallback for non-browser context if any
    }
    return url;
}

export function healInningsOvers(innings: LiveInnings): void {
    if (!innings) return;
    if (!innings.overs) innings.overs = [];
    if (!innings.overLog) innings.overLog = [];
    
    let currentOverBalls: string[] = [];
    let legalCount = 0;
    const completedOvers: Array<{ bowler: string; balls: string[] }> = [];
    
    for (const ball of innings.overLog) {
        currentOverBalls.push(ball);
        if (!ball.startsWith('wd') && !ball.startsWith('nb')) {
            legalCount++;
        }
        
        if (legalCount === 6) {
            completedOvers.push({
                bowler: innings.currentBowler || "Unknown",
                balls: [...currentOverBalls]
            });
            currentOverBalls = [];
            legalCount = 0;
        }
    }
    
    if (completedOvers.length > 0) {
        innings.overs = [...innings.overs, ...completedOvers];
        innings.overLog = currentOverBalls;
    }
}

export function minifyState(state: GameState): any {
    const minifyInnings = (inn: LiveInnings | null): any => {
        if (!inn) return {};
        return {
            sc: inn.score || 0,
            w: inn.wickets || 0,
            b: inn.balls || 0,
            ex: { wd: inn.extras ? inn.extras.wides : 0, nb: inn.extras ? inn.extras.noballs : 0, by: inn.extras ? inn.extras.byes : 0, lb: inn.extras ? inn.extras.legbyes : 0 },
            bat: Object.fromEntries(Object.entries(inn.batsmen || {}).map(([k, v]) => [k, { r: v.runs, b: v.balls, a: v.active ? 1 : 0 }])),
            bowl: Object.fromEntries(Object.entries(inn.bowlers || {}).map(([k, v]) => [k, { r: v.runs, b: v.balls, wk: v.wickets, wd: v.wides || 0, nb: v.noballs || 0 }])),
            cb1: inn.currentBatsman1 || "",
            cb2: inn.currentBatsman2 || "",
            cbo: inn.currentBowler || "",
            pbo: inn.previousBowler || null,
            ob: inn.outBatsmen || [],
            ov: (inn.overs || []).map(o => ({ bo: o.bowler, bl: o.balls })),
            ol: inn.overLog || []
        };
    };

    const minifyTeam = (t: Team | null): any => {
        if (!t) return { n: "", p: [], in: [] };
        return {
            n: t.name || "",
            p: t.players || [],
            in: (t.innings || []).map(minifyInnings)
        };
    };

    return {
        ph: state.phase,
        s: {
            opi: state.settings ? state.settings.oversPerInnings : 8,
            mob: state.settings ? state.settings.maxOversPerBowler : 2,
            asb: (state.settings && state.settings.allowSingleBatsman) ? 1 : 0,
            elb: (state.settings && state.settings.enableLegByes) ? 1 : 0,
            th: state.settings ? state.settings.theme : 'light'
        },
        m: {
            ci: state.match ? state.match.currentInnings : 1,
            cbt: state.match ? state.match.currentBattingTeam : 1,
            t1: minifyTeam(state.match ? state.match.team1 : null),
            t2: minifyTeam(state.match ? state.match.team2 : null),
            li: minifyInnings(state.match ? state.match.liveInnings : null),
            tg: state.match ? state.match.target : null,
            mo: (state.match && state.match.matchOver) ? 1 : 0
        }
    };
}

export function unminifyState(min: any): GameState {
    const unminifyInnings = (inn: any): LiveInnings => {
        if (!inn) return {
            score: 0, wickets: 0, balls: 0,
            extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
            batsmen: {}, bowlers: {},
            currentBatsman1: "", currentBatsman2: "",
            currentBowler: "", previousBowler: null,
            outBatsmen: [], overs: [], overLog: []
        };
        return {
            score: inn.sc || 0,
            wickets: inn.w || 0,
            balls: inn.b || 0,
            extras: {
                wides: inn.ex ? (inn.ex.wd || 0) : 0,
                noballs: inn.ex ? (inn.ex.nb || 0) : 0,
                byes: inn.ex ? (inn.ex.by || 0) : 0,
                legbyes: inn.ex ? (inn.ex.lb || 0) : 0
            },
            batsmen: Object.fromEntries(Object.entries(inn.bat || {}).map(([k, v]: [string, any]) => [k, { runs: v.r || 0, balls: v.b || 0, active: v.a === 1 }])),
            bowlers: Object.fromEntries(Object.entries(inn.bowl || {}).map(([k, v]: [string, any]) => [k, { runs: v.r || 0, balls: v.b || 0, wickets: v.wk || 0, wides: v.wd || 0, noballs: v.nb || 0 }])),
            currentBatsman1: inn.cb1 || "",
            currentBatsman2: inn.cb2 || "",
            currentBowler: inn.cbo || "",
            previousBowler: inn.pbo || null,
            outBatsmen: inn.ob || [],
            overs: (inn.ov || []).map((o: any) => ({ bowler: o.bo, balls: o.bl })),
            overLog: inn.ol || []
        };
    };

    const unminifyTeam = (t: any, defName: string): Team => {
        if (!t) return { name: defName, players: [], innings: [] };
        return {
            name: t.n || defName,
            players: t.p || [],
            innings: (t.in || []).map(unminifyInnings)
        };
    };

    const inferredPhase = min.m && min.m.mo === 1
        ? 'MATCH_OVER'
        : (min.m && min.m.tg !== null && min.m.ci === 1 ? 'INNINGS_BREAK' : 'PLAYING_INNINGS');

    return {
        phase: min.ph || inferredPhase,
        matchStarted: true,
        uiEvents: [],
        history: [],
        settings: {
            totalInnings: 1,
            oversPerInnings: min.s ? (min.s.opi || 8) : 8,
            maxOversPerBowler: min.s ? (min.s.mob || 2) : 2,
            widePenalty: 1,
            noBallPenalty: 1,
            allowSingleBatsman: min.s ? min.s.asb === 1 : true,
            enableLegByes: min.s ? min.s.elb === 1 : false,
            theme: min.s ? (min.s.th || 'light') : 'light'
        },
        match: {
            currentInnings: min.m ? (min.m.ci || 1) : 1,
            currentBattingTeam: min.m ? (min.m.cbt || 1) : 1,
            team1: unminifyTeam(min.m ? min.m.t1 : null, "Team 1"),
            team2: unminifyTeam(min.m ? min.m.t2 : null, "Team 2"),
            liveInnings: unminifyInnings(min.m ? min.m.li : null),
            target: min.m ? min.m.tg : null,
            matchOver: min.m ? min.m.mo === 1 : false
        }
    };
}
