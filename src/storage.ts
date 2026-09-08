import { GameState, LiveInnings, Team } from './types.js';

const KEY_STR_URI_SAFE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

export function lzCompressToEncodedURIComponent(uncompressed: string): string {
    if (uncompressed == null || uncompressed === "") return "";
    return _lzCompress(uncompressed, 6, (a: number) => KEY_STR_URI_SAFE.charAt(a));
}

export function lzDecompressFromEncodedURIComponent(input: string): string {
    if (input == null || input === "") return "";
    input = input.replace(/ /g, "+");
    return _lzDecompress(input.length, 32, (index: number) => {
        const char = input.charAt(index);
        const idx = KEY_STR_URI_SAFE.indexOf(char);
        return idx !== -1 ? idx : 0;
    });
}

function _lzCompress(uncompressed: string, bitsPerChar: number, getCharFromInt: (a: number) => string): string {
    if (uncompressed == null) return "";
    let i, value;
    const context_dictionary: Record<string, number> = {};
    const context_dictionaryToCreate: Record<string, boolean> = {};
    let context_c = "";
    let context_wc = "";
    let context_w = "";
    let context_enlargeIn = 2;
    let context_dictSize = 3;
    let context_numBits = 2;
    const context_data: string[] = [];
    let context_data_val = 0;
    let context_data_position = 0;
    let ii;

    for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
        }

        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
            context_w = context_wc;
        } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position === bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn === 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn === 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
        }
    }

    if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            } else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | value;
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position === bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn === 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
        } else {
            value = context_dictionary[context_w];
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position === bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }
        }
        context_enlargeIn--;
        if (context_enlargeIn === 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
        }
    }

    value = 2;
    for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position === bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
        } else {
            context_data_position++;
        }
        value = value >> 1;
    }

    while (true) {
        context_data_val = (context_data_val << 1);
        if (context_data_position === bitsPerChar - 1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
        } else {
            context_data_position++;
        }
    }
    return context_data.join('');
}

function _lzDecompress(length: number, resetValue: number, getNextValue: (index: number) => number): string {
    const dictionary: string[] = [];
    let next;
    let enlargeIn = 4;
    let dictSize = 4;
    let numBits = 3;
    let entry = "";
    const result: string[] = [];
    let i;
    let w: string;
    let bits, resb, maxpower, power;
    let c: any;
    const data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
        dictionary[i] = String(i);
    }

    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power !== maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position === 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
    }

    switch (next = bits) {
        case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = String.fromCharCode(bits);
            break;
        case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power !== maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position === 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = String.fromCharCode(bits);
            break;
        case 2:
            return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
        if (data.index > length) {
            return "";
        }

        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power !== maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position === 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }

        switch (c = bits) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }

                dictionary[dictSize++] = String.fromCharCode(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power !== maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position === 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = String.fromCharCode(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 2:
                return result.join('');
        }

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }

        if (dictionary[c]) {
            entry = dictionary[c];
        } else {
            if (c === dictSize) {
                entry = w + w.charAt(0);
            } else {
                return "";
            }
        }
        result.push(entry);

        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn === 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
    }
}

function getLZString(): any {
    if (typeof window !== 'undefined' && window.LZString) return window.LZString;
    if (typeof global !== 'undefined' && (global as any).LZString) return (global as any).LZString;
    return {
        compressToEncodedURIComponent: lzCompressToEncodedURIComponent,
        decompressFromEncodedURIComponent: lzDecompressFromEncodedURIComponent
    };
}

function getLocalStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }
    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }
    return null;
}

export function saveState(state: GameState): void {
    try {
        const storage = getLocalStorage();
        if (storage) {
            storage.setItem('cricketScorecardState', JSON.stringify(state));
        }
    } catch (e) {
        console.error("Failed to save state to localStorage", e);
    }
}

export function clearState(): void {
    try {
        const storage = getLocalStorage();
        if (storage) {
            storage.removeItem('cricketScorecardState');
        }
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
            const decompressed = LZStringInstance
                ? LZStringInstance.decompressFromEncodedURIComponent(urlStateCompressed)
                : lzDecompressFromEncodedURIComponent(urlStateCompressed);
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
        const storage = getLocalStorage();
        const savedState = storage ? storage.getItem('cricketScorecardState') : null;
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
            bat: Object.fromEntries(Object.entries(inn.batsmen || {}).map(([k, v]) => [k, { r: v.runs, b: v.balls, f: v.fours || 0, s: v.sixes || 0, a: v.active ? 1 : 0 }])),
            bowl: Object.fromEntries(Object.entries(inn.bowlers || {}).map(([k, v]) => [k, { r: v.runs, b: v.balls, wk: v.wickets, m: v.maidens || 0, wd: v.wides || 0, nb: v.noballs || 0 }])),
            cb1: inn.currentBatsman1 || "",
            cb2: inn.currentBatsman2 || "",
            cbo: inn.currentBowler || "",
            pbo: inn.previousBowler || null,
            ob: inn.outBatsmen || [],
            ov: (inn.overs || []).map(o => ({ bo: o.bowler, bl: o.balls })),
            ol: inn.overLog || [],
            fw: (inn.fow || []).map(f => ({ w: f.wicket, s: f.score, b: f.batsman, ov: f.overs }))
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
            outBatsmen: [], overs: [], overLog: [], fow: []
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
            batsmen: Object.fromEntries(Object.entries(inn.bat || {}).map(([k, v]: [string, any]) => [k, { runs: v.r || 0, balls: v.b || 0, fours: v.f || 0, sixes: v.s || 0, active: v.a === 1 }])),
            bowlers: Object.fromEntries(Object.entries(inn.bowl || {}).map(([k, v]: [string, any]) => [k, { runs: v.r || 0, balls: v.b || 0, wickets: v.wk || 0, maidens: v.m || 0, wides: v.wd || 0, noballs: v.nb || 0 }])),
            currentBatsman1: inn.cb1 || "",
            currentBatsman2: inn.cb2 || "",
            currentBowler: inn.cbo || "",
            previousBowler: inn.pbo || null,
            outBatsmen: inn.ob || [],
            overs: (inn.ov || []).map((o: any) => ({ bowler: o.bo, balls: o.bl })),
            overLog: inn.ol || [],
            fow: (inn.fw || []).map((f: any) => ({ wicket: f.w, score: f.s, batsman: f.b, overs: f.ov }))
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
