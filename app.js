// State Object
let gameState = {
    settings: {
        totalInnings: 1,
        oversPerInnings: 8,
        maxOversPerBowler: 2,
        widePenalty: 1,
        noBallPenalty: 1,
        allowSingleBatsman: true,
        theme: 'light',
        enableLegByes: false
    },
    match: {
        currentInnings: 1,
        currentBattingTeam: 1, // 1 or 2
        team1: { name: "Team 1", players: [], innings: [] },
        team2: { name: "Team 2", players: [], innings: [] },
        liveInnings: {
            score: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
            batsmen: {}, // name -> { runs, balls, active }
            bowlers: {}, // name -> { runs, balls, wickets }
            currentBatsman1: "",
            currentBatsman2: "",
            currentBowler: "",
            previousBowler: null,
            outBatsmen: [],
            overLog: []
        },
        target: null,
        matchOver: false
    },
    history: []
};

// DOM Elements
const settingsSection = document.getElementById('settings-section');
const scoreboardSection = document.getElementById('scoreboard-section');
const startMatchBtn = document.getElementById('start-match-btn');
const screenshotModeBtn = document.getElementById('screenshot-mode-btn');
const resetMatchBtn = document.getElementById('reset-match-btn');
const exitScreenshotModeBtn = document.getElementById('exit-screenshot-mode-btn');
const shareMatchBtn = document.getElementById('share-match-btn');
const themeBtns = document.querySelectorAll('.theme-btn');

// Settings Inputs
const oversPerInningsInput = document.getElementById('overs-per-innings');
const maxOversPerBowlerInput = document.getElementById('max-overs-per-bowler');
const allowSingleBatsmanInput = document.getElementById('allow-single-batsman');
const enableLegByesInput = document.getElementById('enable-legbyes');
const team1RosterList = document.getElementById('team1-roster-list');
const team2RosterList = document.getElementById('team2-roster-list');
const team1QuickAdd = document.getElementById('team1-quick-add');
const team2QuickAdd = document.getElementById('team2-quick-add');
const team1AddBtn = document.getElementById('team1-add-btn');
const team2AddBtn = document.getElementById('team2-add-btn');
const bulkImportTextarea = document.getElementById('bulk-import-textarea');
const executeBulkImportBtn = document.getElementById('execute-bulk-import-btn');
const team1BulkBtn = document.getElementById('team1-bulk-btn');
const team2BulkBtn = document.getElementById('team2-bulk-btn');
const tossModalEl = document.getElementById('tossModal');
const tossTeam1Btn = document.getElementById('toss-team1-btn');
const tossTeam2Btn = document.getElementById('toss-team2-btn');

// Display Elements
const scoreDisplay = document.getElementById('score-display');
const oversDisplay = document.getElementById('overs-display');
const matchStatusDisplay = document.getElementById('match-status');
const batsman1Select = document.getElementById('batsman1-select');
const batsman2Select = document.getElementById('batsman2-select');
const bowlerSelect = document.getElementById('bowler-select');
const batsman1Stats = document.getElementById('batsman1-stats');
const batsman2Stats = document.getElementById('batsman2-stats');
const bowlerStats = document.getElementById('bowler-stats');
const extrasTotalDisplay = document.getElementById('extras-total');
const widesDisplay = document.getElementById('wides-display');
const noballsDisplay = document.getElementById('noballs-display');
const byesDisplay = document.getElementById('byes-display');
const legbyesDisplay = document.getElementById('legbyes-display');
const overLogDisplay = document.getElementById('over-log');

// Controls
const controlsSection = document.getElementById('controls-section');
const runBtns = document.querySelectorAll('.run-btn');
const wideBtn = document.getElementById('wide-btn');
const noballBtn = document.getElementById('noball-btn');
const wicketBtn = document.getElementById('wicket-btn');
const runoutBtn = document.getElementById('runout-btn');
const runoutStrikerBtn = document.getElementById('runout-striker-btn');
const runoutNonstrikerBtn = document.getElementById('runout-nonstriker-btn');
const extraRunValBtns = document.querySelectorAll('.extra-run-val-btn');
const accrualSection = document.getElementById('accrual-section');
const accrueBatsmanBtn = document.getElementById('accrue-batsman-btn');
const accrueByesBtn = document.getElementById('accrue-byes-btn');
const byeBtn = document.getElementById('bye-btn');
const legbyeBtn = document.getElementById('legbye-btn');
const undoBtn = document.getElementById('undo-btn');

let runoutModalInstance = null;
let extraRunsModalInstance = null;
let tossModalInstance = null;
let currentDeliveryType = null;
let selectedExtraRuns = 0;
let pendingRunOutStriker = true;
let activeBulkImportTeam = 1;

// Initialize
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    initSortable();
    renderRosters();
    updateUI();
}

// Event Listeners
function setupEventListeners() {
    startMatchBtn.addEventListener('click', startMatch);
    screenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    exitScreenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    resetMatchBtn.addEventListener('click', resetMatch);
    shareMatchBtn.addEventListener('click', shareMatch);

    if (team1AddBtn) team1AddBtn.addEventListener('click', () => handleQuickAdd(1));
    if (team2AddBtn) team2AddBtn.addEventListener('click', () => handleQuickAdd(2));
    if (team1QuickAdd) team1QuickAdd.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleQuickAdd(1); });
    if (team2QuickAdd) team2QuickAdd.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleQuickAdd(2); });

    if (team1BulkBtn) team1BulkBtn.addEventListener('click', () => { activeBulkImportTeam = 1; });
    if (team2BulkBtn) team2BulkBtn.addEventListener('click', () => { activeBulkImportTeam = 2; });
    if (executeBulkImportBtn) executeBulkImportBtn.addEventListener('click', handleBulkImport);

    if (tossTeam1Btn) tossTeam1Btn.addEventListener('click', () => executeStartMatch(1));
    if (tossTeam2Btn) tossTeam2Btn.addEventListener('click', () => executeStartMatch(2));

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    runBtns.forEach(btn => {
        btn.addEventListener('click', () => addRuns(parseInt(btn.dataset.runs)));
    });

    wideBtn.addEventListener('click', () => triggerExtraRunsModal('wide'));
    noballBtn.addEventListener('click', () => triggerExtraRunsModal('noball'));
    wicketBtn.addEventListener('click', addWicket);
    runoutBtn.addEventListener('click', triggerRunOutModal);
    runoutStrikerBtn.addEventListener('click', () => processRunOut(true));
    runoutNonstrikerBtn.addEventListener('click', () => processRunOut(false));
    
    extraRunValBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            extraRunValBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedExtraRuns = parseInt(btn.dataset.val);

            if (selectedExtraRuns === 0) {
                if (extraRunsModalInstance) extraRunsModalInstance.hide();
                finalizeDelivery(currentDeliveryType, 0, 'byes');
            } else if (currentDeliveryType === 'wide') {
                if (extraRunsModalInstance) extraRunsModalInstance.hide();
                finalizeDelivery('wide', selectedExtraRuns, 'byes');
            } else if (currentDeliveryType === 'bye') {
                if (extraRunsModalInstance) extraRunsModalInstance.hide();
                finalizeDelivery('bye', selectedExtraRuns, 'byes');
            } else {
                if (accrualSection) accrualSection.classList.remove('hidden');
            }
        });
    });

    accrueBatsmanBtn.addEventListener('click', () => {
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, 'batsman');
    });

    accrueByesBtn.addEventListener('click', () => {
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, 'byes');
    });

    byeBtn.addEventListener('click', () => triggerExtraRunsModal('bye'));
    legbyeBtn.addEventListener('click', addLegBye);
    undoBtn.addEventListener('click', undoLastAction);

    batsman1Select.addEventListener('change', (e) => handleBatsmanChange(1, e.target.value));
    batsman2Select.addEventListener('change', (e) => handleBatsmanChange(2, e.target.value));
    bowlerSelect.addEventListener('change', (e) => handleBowlerChange(e.target.value));
}

// Roster Management Helpers
function initSortable() {
    if (typeof Sortable !== 'undefined') {
        if (team1RosterList) {
            new Sortable(team1RosterList, {
                group: 'rosters',
                animation: 150,
                handle: '.drag-handle',
                onSort: () => updateLineupNumbers()
            });
        }
        if (team2RosterList) {
            new Sortable(team2RosterList, {
                group: 'rosters',
                animation: 150,
                handle: '.drag-handle',
                onSort: () => updateLineupNumbers()
            });
        }
    }
}

function renderRosters() {
    if (!team1RosterList || !team2RosterList) return;
    team1RosterList.innerHTML = '';
    team2RosterList.innerHTML = '';

    const t1 = gameState.match.team1.players || [];
    const t2 = gameState.match.team2.players || [];

    t1.forEach(name => addPlayerToRoster(1, name));
    t2.forEach(name => addPlayerToRoster(2, name));
}

function addPlayerToRoster(teamNum, name, isShared = false) {
    const targetList = teamNum === 1 ? team1RosterList : team2RosterList;
    if (!targetList || !name || !name.trim()) return;

    const li = document.createElement('li');
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'roster-item', 'small');
    li.dataset.shared = isShared ? "true" : "false";
    if (isShared) li.classList.add('bg-warning-subtle');
    
    li.innerHTML = `
        <span class="drag-handle me-2 text-muted">🟰</span>
        <span class="player-name flex-grow-1 text-truncate me-1">${name.trim()}</span>
        <span class="badge bg-primary rounded-pill order-badge me-1">#0</span>
        <button class="btn btn-xs ${isShared ? 'btn-warning' : 'btn-outline-warning'} shared-player-btn py-0 px-1 me-1" type="button" title="Toggle Shared Player">🔁</button>
        <button class="btn btn-xs btn-outline-danger delete-player-btn py-0 px-1" type="button" title="Delete Player">❌</button>
    `;

    const deleteBtn = li.querySelector('.delete-player-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            li.remove();
            updateLineupNumbers();
        });
    }

    const sharedBtn = li.querySelector('.shared-player-btn');
    if (sharedBtn) {
        sharedBtn.addEventListener('click', () => {
            const currShared = li.dataset.shared === "true";
            if (currShared) {
                li.dataset.shared = "false";
                li.classList.remove('bg-warning-subtle');
                sharedBtn.classList.remove('btn-warning');
                sharedBtn.classList.add('btn-outline-warning');
            } else {
                li.dataset.shared = "true";
                li.classList.add('bg-warning-subtle');
                sharedBtn.classList.remove('btn-outline-warning');
                sharedBtn.classList.add('btn-warning');
            }
        });
    }

    targetList.appendChild(li);
    updateLineupNumbers();
}

function updateLineupNumbers() {
    if (!team1RosterList || !team2RosterList) return;
    const t1Items = team1RosterList.querySelectorAll('.roster-item');
    t1Items.forEach((item, idx) => {
        const badge = item.querySelector('.order-badge');
        if (badge) badge.textContent = `#${idx + 1}`;
    });

    const t2Items = team2RosterList.querySelectorAll('.roster-item');
    t2Items.forEach((item, idx) => {
        const badge = item.querySelector('.order-badge');
        if (badge) badge.textContent = `#${idx + 1}`;
    });
}

function handleQuickAdd(teamNum) {
    const input = teamNum === 1 ? team1QuickAdd : team2QuickAdd;
    const val = input ? input.value.trim() : '';
    if (val) {
        addPlayerToRoster(teamNum, val);
        input.value = '';
    }
}

function handleBulkImport() {
    if (!bulkImportTextarea) return;
    const rawText = bulkImportTextarea.value;
    const names = rawText.split(/[\n,]+/).map(n => n.trim()).filter(n => n !== '');
    if (names.length > 0) {
        const targetList = activeBulkImportTeam === 1 ? team1RosterList : team2RosterList;
        if (targetList) targetList.innerHTML = ''; // Clear current roster
        names.forEach(name => addPlayerToRoster(activeBulkImportTeam, name));
    }
    bulkImportTextarea.value = '';
}

// Permalink Compression & Minification Helpers
function minifyState(state) {
    const minifyInnings = (inn) => {
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
            ol: inn.overLog || []
        };
    };

    const minifyTeam = (t) => {
        if (!t) return { n: "", p: [], in: [] };
        return {
            n: t.name || "",
            p: t.players || [],
            in: (t.innings || []).map(minifyInnings)
        };
    };

    return {
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

function unminifyState(min) {
    const unminifyInnings = (inn) => {
        if (!inn) return {};
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
            batsmen: Object.fromEntries(Object.entries(inn.bat || {}).map(([k, v]) => [k, { runs: v.r || 0, balls: v.b || 0, active: v.a === 1 }])),
            bowlers: Object.fromEntries(Object.entries(inn.bowl || {}).map(([k, v]) => [k, { runs: v.r || 0, balls: v.b || 0, wickets: v.wk || 0, wides: v.wd || 0, noballs: v.nb || 0 }])),
            currentBatsman1: inn.cb1 || "",
            currentBatsman2: inn.cb2 || "",
            currentBowler: inn.cbo || "",
            previousBowler: inn.pbo || null,
            outBatsmen: inn.ob || [],
            overLog: inn.ol || []
        };
    };

    const unminifyTeam = (t, defName) => {
        if (!t) return { name: defName, players: [], innings: [] };
        return {
            name: t.n || defName,
            players: t.p || [],
            innings: (t.in || []).map(unminifyInnings)
        };
    };

    return {
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

// Load from LocalStorage or URL
function loadFromLocalStorage() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStateCompressed = urlParams.get('s');
    const urlStateLegacy = urlParams.get('state');
    const flipContainer = document.querySelector('.flip-container');

    if (urlStateCompressed && typeof LZString !== 'undefined') {
        try {
            const decompressed = LZString.decompressFromEncodedURIComponent(urlStateCompressed);
            const minified = JSON.parse(decompressed);
            const fullState = unminifyState(minified);
            gameState.settings = fullState.settings;
            gameState.match = fullState.match;
            gameState.matchStarted = true;

            window.history.replaceState({}, '', window.location.pathname);
            
            settingsSection.classList.add('hidden');
            if (flipContainer) flipContainer.classList.remove('hidden');
            
            if (gameState.settings.theme) {
                setTheme(gameState.settings.theme);
            }
            return;
        } catch (e) {
            console.error("Failed to parse compressed state from URL", e);
            alert("Failed to load match from compressed link.");
        }
    } else if (urlStateLegacy) {
        try {
            const decodedState = JSON.parse(decodeURIComponent(urlStateLegacy));
            gameState.settings = decodedState.settings;
            gameState.match = decodedState.match;
            gameState.matchStarted = true;
            
            window.history.replaceState({}, '', window.location.pathname);
            
            settingsSection.classList.add('hidden');
            if (flipContainer) flipContainer.classList.remove('hidden');
            
            if (gameState.settings.theme) {
                setTheme(gameState.settings.theme);
            }
            return;
        } catch (e) {
            console.error("Failed to parse legacy state from URL", e);
            alert("Failed to load match from link.");
        }
    }

    const savedState = localStorage.getItem('cricketScorecardState');
    if (savedState) {
        gameState = JSON.parse(savedState);
        if (gameState.matchStarted) {
            settingsSection.classList.add('hidden');
            if (flipContainer) flipContainer.classList.remove('hidden');
        } else {
            settingsSection.classList.remove('hidden');
            if (flipContainer) flipContainer.classList.add('hidden');
        }
        if (gameState.settings.theme) {
            setTheme(gameState.settings.theme);
        }
    } else {
        settingsSection.classList.remove('hidden');
        if (flipContainer) flipContainer.classList.add('hidden');
    }
}

// Save to LocalStorage
function saveToLocalStorage() {
    localStorage.setItem('cricketScorecardState', JSON.stringify(gameState));
}

// Set Theme
function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    gameState.settings.theme = theme;
    saveToLocalStorage();
}

// Share Match (Permalink)
function shareMatch() {
    const minified = minifyState(gameState);
    let url;
    if (typeof LZString !== 'undefined') {
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(minified));
        url = window.location.origin + window.location.pathname + '?s=' + compressed;
    } else {
        const serializedState = encodeURIComponent(JSON.stringify({ settings: gameState.settings, match: gameState.match }));
        url = window.location.origin + window.location.pathname + '?state=' + serializedState;
    }
    
    navigator.clipboard.writeText(url).then(() => {
        alert("Permalink copied to clipboard!");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert("Failed to copy link automatically. Setting URL in address bar instead.");
        window.history.pushState({}, '', url);
    });
}

// Start Match
function startMatch() {
    gameState.settings.totalInnings = 1; // Hardcoded to 1
    gameState.settings.oversPerInnings = parseInt(oversPerInningsInput.value);
    gameState.settings.maxOversPerBowler = parseInt(maxOversPerBowlerInput.value);
    gameState.settings.widePenalty = 1;
    gameState.settings.noBallPenalty = 1;
    gameState.settings.allowSingleBatsman = allowSingleBatsmanInput.checked;
    gameState.settings.enableLegByes = enableLegByesInput.checked;

    // Parse player names from roster lists and mirror shared players
    if (team1RosterList && team2RosterList) {
        const t1Names = [];
        const t2Names = [];
        const t1Shared = [];
        const t2Shared = [];

        team1RosterList.querySelectorAll('.roster-item').forEach(el => {
            const name = el.querySelector('.player-name').textContent.trim();
            t1Names.push(name);
            if (el.dataset.shared === "true") t1Shared.push(name);
        });

        team2RosterList.querySelectorAll('.roster-item').forEach(el => {
            const name = el.querySelector('.player-name').textContent.trim();
            t2Names.push(name);
            if (el.dataset.shared === "true") t2Shared.push(name);
        });

        t1Shared.forEach(name => {
            if (!t2Names.includes(name)) t2Names.push(name);
        });
        t2Shared.forEach(name => {
            if (!t1Names.includes(name)) t1Names.push(name);
        });

        gameState.match.team1.players = t1Names;
        gameState.match.team2.players = t2Names;
    }

    // Validation: Enough players to bowl
    const totalOvers = gameState.settings.oversPerInnings;
    const maxOversPerBowler = gameState.settings.maxOversPerBowler;
    const minBowlersNeeded = Math.ceil(totalOvers / maxOversPerBowler);

    if (gameState.match.team1.players.length < minBowlersNeeded) {
        alert(`Team 1 needs at least ${minBowlersNeeded} players to bowl ${totalOvers} overs (max ${maxOversPerBowler} per bowler).`);
        return;
    }
    if (gameState.match.team2.players.length < minBowlersNeeded) {
        alert(`Team 2 needs at least ${minBowlersNeeded} players to bowl ${totalOvers} overs (max ${maxOversPerBowler} per bowler).`);
        return;
    }

    const minBatsmenNeeded = gameState.settings.allowSingleBatsman ? 1 : 2;
    if (gameState.match.team1.players.length < minBatsmenNeeded || gameState.match.team2.players.length < minBatsmenNeeded) {
        alert(`Each team needs at least ${minBatsmenNeeded} players to bat.`);
        return;
    }

    if (typeof bootstrap === 'undefined') {
        executeStartMatch(1);
        return;
    }

    if (tossTeam1Btn) tossTeam1Btn.textContent = `${gameState.match.team1.name || 'Team 1'} Batting`;
    if (tossTeam2Btn) tossTeam2Btn.textContent = `${gameState.match.team2.name || 'Team 2'} Batting`;

    if (!tossModalInstance && tossModalEl) {
        tossModalInstance = new bootstrap.Modal(tossModalEl);
    }
    if (tossModalInstance) tossModalInstance.show();
}

function executeStartMatch(battingTeamNum) {
    gameState.match.currentBattingTeam = battingTeamNum;
    
    // Initialize live innings
    gameState.match.liveInnings = {
        score: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
        batsmen: {},
        bowlers: {},
        currentBatsman1: "",
        currentBatsman2: "",
        currentBowler: "",
        previousBowler: null,
        outBatsmen: [],
        overLog: []
    };

    gameState.matchStarted = true;
    gameState.history = [];
    gameState.match.target = null;
    gameState.match.matchOver = false;

    settingsSection.classList.add('hidden');
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.remove('hidden');

    saveToLocalStorage();
    updateUI();
}

function initBatsmanStats(name, active) {
    if (name && !gameState.match.liveInnings.batsmen[name]) {
        gameState.match.liveInnings.batsmen[name] = { runs: 0, balls: 0, active: active };
    }
}

function initBowlerStats(name) {
    if (name && !gameState.match.liveInnings.bowlers[name]) {
        gameState.match.liveInnings.bowlers[name] = { runs: 0, balls: 0, wickets: 0, wides: 0, noballs: 0 };
    }
}

// Populate Dropdown with filtering
function populateDropdown(selectElement, playerList, selectedValue, promptText, filterFn) {
    selectElement.innerHTML = '';
    
    if (promptText) {
        const promptOption = document.createElement('option');
        promptOption.value = '';
        promptOption.textContent = promptText;
        selectElement.appendChild(promptOption);
    }

    playerList.forEach(player => {
        if (!filterFn || filterFn(player)) {
            const option = document.createElement('option');
            option.value = player;
            option.textContent = player;
            if (player === selectedValue) {
                option.selected = true;
            }
            selectElement.appendChild(option);
        }
    });
}

// Handle Player Changes
function handleBatsmanChange(batsmanNumber, newName) {
    saveHistory();
    const live = gameState.match.liveInnings;
    if (batsmanNumber === 1) {
        live.currentBatsman1 = newName;
        initBatsmanStats(newName, true);
    } else {
        live.currentBatsman2 = newName;
        initBatsmanStats(newName, false);
    }
    saveToLocalStorage();
    updateUI();
}

function handleBowlerChange(newName) {
    saveHistory();
    gameState.match.liveInnings.currentBowler = newName;
    initBowlerStats(newName);
    saveToLocalStorage();
    updateUI();
}

// Toggle Screenshot Mode with Flip Effect
function toggleScreenshotMode() {
    const flipContainer = document.querySelector('.flip-container');
    
    if (!flipContainer.classList.contains('flipped')) {
        generateSummaryView(); // Generate content before flipping
        flipContainer.classList.add('flipped');
        document.body.classList.add('screenshot-mode');
    } else {
        flipContainer.classList.remove('flipped');
        document.body.classList.remove('screenshot-mode');
    }
}

function generateSummaryView() {
    const summariesDiv = document.getElementById('innings-summaries');
    summariesDiv.innerHTML = '';

    function renderInningsSummary(teamName, inningsData, inningsNumber) {
        const inningsDiv = document.createElement('div');
        inningsDiv.classList.add('innings-summary');
        
        const h3 = document.createElement('h3');
        h3.textContent = `${teamName} - Innings ${inningsNumber}`;
        inningsDiv.appendChild(h3);

        const scoreP = document.createElement('p');
        const overs = Math.floor(inningsData.balls / 6);
        const balls = inningsData.balls % 6;
        scoreP.innerHTML = `<strong>Score:</strong> ${inningsData.score}/${inningsData.wickets} (${overs}.${balls} ov)`;
        inningsDiv.appendChild(scoreP);

        const batsmenTable = document.createElement('table');
        batsmenTable.classList.add('summary-table');
        batsmenTable.innerHTML = `<thead><tr><th>Batsman</th><th>Runs</th><th>Balls</th></tr></thead>`;
        const batsmenTbody = document.createElement('tbody');
        for (const name in inningsData.batsmen) {
            const b = inningsData.batsmen[name];
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${name}</td><td>${b.runs}</td><td>${b.balls}</td>`;
            batsmenTbody.appendChild(tr);
        }
        batsmenTable.appendChild(batsmenTbody);
        inningsDiv.appendChild(batsmenTable);

        const bowlersTable = document.createElement('table');
        bowlersTable.classList.add('summary-table');
        bowlersTable.innerHTML = `<thead><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wickets</th><th>Wides</th><th>No Balls</th></tr></thead>`;
        const bowlersTbody = document.createElement('tbody');
        for (const name in inningsData.bowlers) {
            const b = inningsData.bowlers[name];
            const tr = document.createElement('tr');
            const bOvers = Math.floor(b.balls / 6);
            const bBalls = b.balls % 6;
            const bWides = b.wides || 0;
            const bNoBalls = b.noballs || 0;
            tr.innerHTML = `<td>${name}</td><td>${bOvers}.${bBalls}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${bWides}</td><td>${bNoBalls}</td>`;
            bowlersTbody.appendChild(tr);
        }
        bowlersTable.appendChild(bowlersTbody);
        inningsDiv.appendChild(bowlersTable);

        const extrasP = document.createElement('p');
        const ext = inningsData.extras;
        const totalExtras = ext.wides + ext.noballs + ext.byes + ext.legbyes;
        extrasP.innerHTML = `<strong>Extras:</strong> ${totalExtras} (W: ${ext.wides}, NB: ${ext.noballs}, B: ${ext.byes}, LB: ${ext.legbyes})`;
        inningsDiv.appendChild(extrasP);

        summariesDiv.appendChild(inningsDiv);
    }

    gameState.match.team1.innings.forEach((inn, index) => {
        renderInningsSummary(gameState.match.team1.name, inn, index + 1);
    });
    gameState.match.team2.innings.forEach((inn, index) => {
        renderInningsSummary(gameState.match.team2.name, inn, index + 1);
    });

    if (!gameState.match.matchOver) {
        const currentTeamName = gameState.match.currentBattingTeam === 1 ? gameState.match.team1.name : gameState.match.team2.name;
        renderInningsSummary(currentTeamName, gameState.match.liveInnings, gameState.match.currentInnings);
    }
}

// Save History
function saveHistory() {
    gameState.history.push(JSON.parse(JSON.stringify(gameState.match)));
}

// Update UI
function updateUI() {
    const live = gameState.match.liveInnings;
    scoreDisplay.textContent = `${live.score} - ${live.wickets}`;
    
    const overs = Math.floor(live.balls / 6);
    const balls = live.balls % 6;
    oversDisplay.textContent = `Overs: ${overs}.${balls} / ${gameState.settings.oversPerInnings}`;

    matchStatusDisplay.textContent = `Innings ${gameState.match.currentInnings}`;

    const targetDisplay = document.getElementById('target-display');
    if (gameState.match.currentInnings === 2) {
        const target = gameState.match.target;
        targetDisplay.classList.remove('hidden');
        
        const crr = live.balls > 0 ? (live.score / live.balls) * 6 : 0;
        const remainingBalls = (gameState.settings.oversPerInnings * 6) - live.balls;
        const rrr = remainingBalls > 0 ? ((target - live.score) / remainingBalls) * 6 : 0;
        
        targetDisplay.textContent = `Target: ${target} | CRR: ${crr.toFixed(2)} | RRR: ${rrr.toFixed(2)}`;
    } else {
        targetDisplay.classList.add('hidden');
    }

    // Disable buttons on settings page
    screenshotModeBtn.disabled = !gameState.matchStarted;
    resetMatchBtn.disabled = !gameState.matchStarted;

    // Show/Hide Leg Bye button
    if (gameState.settings.enableLegByes) {
        legbyeBtn.classList.remove('hidden');
    } else {
        legbyeBtn.classList.add('hidden');
    }

    // Populate dropdowns with filtering
    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const bowlingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team2 : gameState.match.team1;
    const totalPlayers = battingTeam.players.length;
    const singleBatsmanAllowed = gameState.settings.allowSingleBatsman;
    const lastManStanding = singleBatsmanAllowed && live.wickets === totalPlayers - 1;

    populateDropdown(batsman1Select, battingTeam.players, live.currentBatsman1, "Select Striker", (player) => {
        return player !== live.currentBatsman2 && !live.outBatsmen.includes(player);
    });
    populateDropdown(batsman2Select, battingTeam.players, live.currentBatsman2, "Select Non-Striker", (player) => {
        return player !== live.currentBatsman1 && !live.outBatsmen.includes(player);
    });
    populateDropdown(bowlerSelect, bowlingTeam.players, live.currentBowler, "Select Bowler", (player) => {
        const bowlerStats = live.bowlers[player] || { balls: 0 };
        const maxBalls = gameState.settings.maxOversPerBowler * 6;
        return player !== live.previousBowler && bowlerStats.balls < maxBalls;
    });

    // Visual cues for selection
    if (!live.currentBatsman1 && (!lastManStanding || !live.currentBatsman2)) {
        batsman1Select.classList.add('is-invalid');
    } else {
        batsman1Select.classList.remove('is-invalid');
    }

    if (!live.currentBatsman2 && (!lastManStanding || !live.currentBatsman1)) {
        batsman2Select.classList.add('is-invalid');
    } else {
        batsman2Select.classList.remove('is-invalid');
    }

    if (!live.currentBowler) {
        bowlerSelect.classList.add('is-invalid');
    } else {
        bowlerSelect.classList.remove('is-invalid');
    }

    const b1 = live.batsmen[live.currentBatsman1] || { runs: 0, balls: 0 };
    const b2 = live.batsmen[live.currentBatsman2] || { runs: 0, balls: 0 };

    batsman1Stats.textContent = `${b1.runs} (${b1.balls})`;
    batsman2Stats.textContent = `${b2.runs} (${b2.balls})`;

    // Update active class
    if (live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active) {
        batsman1Select.parentElement.classList.add('active');
        batsman2Select.parentElement.classList.remove('active');
    } else if (live.batsmen[live.currentBatsman2] && live.batsmen[live.currentBatsman2].active) {
        batsman1Select.parentElement.classList.remove('active');
        batsman2Select.parentElement.classList.add('active');
    } else {
        batsman1Select.parentElement.classList.remove('active');
        batsman2Select.parentElement.classList.remove('active');
    }

    const bowler = live.bowlers[live.currentBowler] || { runs: 0, balls: 0, wickets: 0 };
    const bowlerOvers = Math.floor(bowler.balls / 6);
    const bowlerBalls = bowler.balls % 6;
    bowlerStats.textContent = `${bowler.runs}/${bowler.wickets} (${bowlerOvers}.${bowlerBalls})`;

    batsman1Select.value = live.currentBatsman1;
    batsman2Select.value = live.currentBatsman2;
    bowlerSelect.value = live.currentBowler;

    const totalExtras = live.extras.wides + live.extras.noballs + live.extras.byes + live.extras.legbyes;
    extrasTotalDisplay.textContent = totalExtras;
    widesDisplay.textContent = live.extras.wides;
    noballsDisplay.textContent = live.extras.noballs;
    byesDisplay.textContent = live.extras.byes;
    legbyesDisplay.textContent = live.extras.legbyes;

    overLogDisplay.innerHTML = '';
    live.overLog.forEach(ball => {
        const ballSpan = document.createElement('span');
        ballSpan.classList.add('ball-log');
        if (ball.includes('W')) ballSpan.classList.add('wicket');
        if (ball.includes('wd') || ball.includes('nb') || ball.includes('b') || ball.includes('lb')) ballSpan.classList.add('extra');
        ballSpan.textContent = ball;
        overLogDisplay.appendChild(ballSpan);
    });

    checkControlsState();
}

function checkControlsState() {
    const live = gameState.match.liveInnings;
    const controls = controlsSection.querySelectorAll('button:not(#undo-btn)');
    
    if (gameState.match.matchOver) {
        controls.forEach(btn => btn.disabled = true);
        return;
    }

    const singleBatsmanAllowed = gameState.settings.allowSingleBatsman;
    
    let needsSelection = false;
    
    if (singleBatsmanAllowed) {
        needsSelection = !(live.currentBatsman1 || live.currentBatsman2) || !live.currentBowler;
    } else {
        needsSelection = !live.currentBatsman1 || !live.currentBatsman2 || !live.currentBowler;
    }
    
    controls.forEach(btn => {
        btn.disabled = needsSelection;
    });
}

// Scoring Functions
function addRuns(runs) {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += runs;
    live.balls++;
    
    const bowler = live.bowlers[live.currentBowler];
    bowler.balls++;
    bowler.runs += runs;

    const activeBatsman = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[activeBatsman];
    if (activeB) {
        activeB.runs += runs;
        activeB.balls++;
    }

    live.overLog.push(runs.toString());

    if (runs % 2 !== 0 && live.currentBatsman1 && live.currentBatsman2) {
        live.batsmen[live.currentBatsman1].active = !live.batsmen[live.currentBatsman1].active;
        live.batsmen[live.currentBatsman2].active = !live.batsmen[live.currentBatsman2].active;
    }

    checkOverComplete();
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function checkOverComplete() {
    const live = gameState.match.liveInnings;
    if (live.balls % 6 === 0 && live.balls > 0) {
        if (live.currentBatsman1 && live.currentBatsman2) {
            live.batsmen[live.currentBatsman1].active = !live.batsmen[live.currentBatsman1].active;
            live.batsmen[live.currentBatsman2].active = !live.batsmen[live.currentBatsman2].active;
        }
        live.overLog = []; // Clear for next over
        
        const maxBalls = gameState.settings.oversPerInnings * 6;
        if (live.balls >= maxBalls && gameState.match.currentInnings === 1) {
            alert("Innings Over! Max overs reached.");
            endInnings();
            return;
        }
        
        live.previousBowler = live.currentBowler;
        live.currentBowler = ""; // Force selection
    }
}

function checkMatchOver() {
    const live = gameState.match.liveInnings;
    const settings = gameState.settings;
    const match = gameState.match;

    if (settings.totalInnings === 1 && match.currentInnings === 2) {
        const target = match.target;
        const maxBalls = settings.oversPerInnings * 6;
        const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
        const totalPlayers = battingTeam.players.length;
        const maxWickets = settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

        if (live.score >= target) {
            alert("Match Over! " + battingTeam.name + " wins!");
            match.matchOver = true;
            toggleScreenshotMode(); // Auto flip to summary
        } else if (live.wickets >= maxWickets) {
            alert("Match Over! Defending team wins!");
            match.matchOver = true;
            toggleScreenshotMode();
        } else if (live.balls >= maxBalls) {
             if (live.score === target - 1) {
                 alert("Match Over! It's a Tie!");
             } else {
                 alert("Match Over! Defending team wins!");
             }
             match.matchOver = true;
             toggleScreenshotMode();
        }
    }
}

function triggerExtraRunsModal(deliveryType) {
    if (gameState.match.matchOver) return;
    currentDeliveryType = deliveryType;
    selectedExtraRuns = 0;
    
    if (accrualSection) accrualSection.classList.add('hidden');
    extraRunValBtns.forEach(b => b.classList.remove('active'));

    if (typeof bootstrap !== 'undefined') {
        if (!extraRunsModalInstance) {
            extraRunsModalInstance = new bootstrap.Modal(document.getElementById('extraRunsModal'));
        }
        extraRunsModalInstance.show();
    } else {
        if (typeof global.mockExtraRuns !== 'undefined') {
            selectedExtraRuns = global.mockExtraRuns;
        }
        const accrueTo = global.mockAccrueTo || 'byes';
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, accrueTo);
    }
}

function finalizeDelivery(type, extraRuns, accrueTo) {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[striker];
    const bowler = live.bowlers[live.currentBowler];

    if (type === 'wide') {
        const totalRuns = gameState.settings.widePenalty + extraRuns;
        live.score += totalRuns;
        live.extras.wides += gameState.settings.widePenalty;
        if (bowler) {
            bowler.runs += totalRuns;
            bowler.wides = (bowler.wides || 0) + 1;
        }

        if (extraRuns > 0) {
            if (accrualSection && accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        live.overLog.push(extraRuns > 0 ? `wd+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'wd');
    } else if (type === 'noball') {
        const totalRuns = gameState.settings.noBallPenalty + extraRuns;
        live.score += totalRuns;
        live.extras.noballs += gameState.settings.noBallPenalty;
        if (bowler) {
            bowler.runs += totalRuns;
            bowler.noballs = (bowler.noballs || 0) + 1;
        }

        if (extraRuns > 0) {
            if (accrualSection && accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        live.overLog.push(extraRuns > 0 ? `nb+${extraRuns}${accrueTo === 'byes' ? 'b' : ''}` : 'nb');
    } else if (type === 'runout') {
        live.score += extraRuns;
        if (bowler) bowler.runs += extraRuns;
        
        if (extraRuns > 0) {
            if (accrualSection && accrueTo === 'batsman' && activeB) {
                activeB.runs += extraRuns;
            } else {
                live.extras.byes += extraRuns;
            }
        }
        executeRunOutWicket(pendingRunOutStriker, extraRuns, accrueTo);
        return;
    } else if (type === 'bye') {
        const totalByes = 1 + extraRuns;
        live.score += totalByes;
        live.extras.byes += totalByes;
        
        live.balls++;
        if (bowler) bowler.balls++;
        if (activeB) activeB.balls++;
        
        live.overLog.push(`${totalByes}b`);
        checkOverComplete();
    }

    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function addWicket() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    
    const activeBatsmanName = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeB = live.batsmen[activeBatsmanName];
    if (activeB) {
        activeB.balls++; // Count the ball faced!
    }

    live.wickets++;
    live.balls++;
    live.bowlers[live.currentBowler].balls++;
    live.bowlers[live.currentBowler].wickets++;
    live.overLog.push('W');

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const totalPlayers = battingTeam.players.length;
    
    const maxWickets = gameState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        alert("Innings Over! All batsmen out.");
        endInnings();
        return;
    }

    // Mark current batsman as out
    live.outBatsmen.push(activeBatsmanName);
    
    if (live.currentBatsman1 === activeBatsmanName) {
        live.currentBatsman1 = ""; // Force selection
    } else {
        live.currentBatsman2 = ""; // Force selection
    }
    
    if (gameState.settings.allowSingleBatsman && live.wickets === totalPlayers - 1) {
        if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
        if (live.currentBatsman2 && live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = true;
    }

    checkOverComplete();
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function triggerRunOutModal() {
    if (gameState.match.matchOver) return;
    const live = gameState.match.liveInnings;
    
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    if (gameState.settings.allowSingleBatsman && live.wickets === battingTeam.players.length - 1) {
        processRunOut(true);
        return;
    }

    runoutStrikerBtn.textContent = `Striker (${striker || 'None'})`;
    runoutNonstrikerBtn.textContent = `Non-Striker (${nonStriker || 'None'})`;

    if (typeof bootstrap !== 'undefined') {
        if (!runoutModalInstance) {
            runoutModalInstance = new bootstrap.Modal(document.getElementById('runoutModal'));
        }
        runoutModalInstance.show();
    } else {
        const isStriker = confirm(`Who was run out?\n[OK] Striker: ${striker}\n[Cancel] Non-Striker: ${nonStriker}`);
        processRunOut(isStriker);
    }
}

function processRunOut(isStriker) {
    if (gameState.match.matchOver) return;
    pendingRunOutStriker = isStriker;
    triggerExtraRunsModal('runout');
}

function executeRunOutWicket(isStriker, extraRuns, accrueTo) {
    const live = gameState.match.liveInnings;
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;
    const outBatsmanName = isStriker ? striker : nonStriker;

    if (!outBatsmanName) return;

    const outB = live.batsmen[outBatsmanName];
    if (outB && isStriker) {
        outB.balls++;
    } else if (!isStriker) {
        const strikerB = live.batsmen[striker];
        if (strikerB) strikerB.balls++;
    }

    live.wickets++;
    live.balls++;
    if (live.currentBowler && live.bowlers[live.currentBowler]) {
        live.bowlers[live.currentBowler].balls++;
    }
    
    let logStr = 'W-RO';
    if (extraRuns > 0) {
        logStr = `${extraRuns}${accrueTo === 'byes' ? 'b' : ''}+W-RO`;
    }
    live.overLog.push(logStr);

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const totalPlayers = battingTeam.players.length;
    const maxWickets = gameState.settings.allowSingleBatsman ? totalPlayers : totalPlayers - 1;

    if (live.wickets >= maxWickets && totalPlayers > 0) {
        alert("Innings Over! All batsmen out.");
        endInnings();
        return;
    }

    live.outBatsmen.push(outBatsmanName);
    
    if (live.currentBatsman1 === outBatsmanName) {
        live.currentBatsman1 = "";
    } else {
        live.currentBatsman2 = "";
    }
    
    if (gameState.settings.allowSingleBatsman && live.wickets === totalPlayers - 1) {
        if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) live.batsmen[live.currentBatsman1].active = true;
        if (live.currentBatsman2 && live.batsmen[live.currentBatsman2]) live.batsmen[live.currentBatsman2].active = true;
    }

    checkOverComplete();
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function endInnings() {
    const live = gameState.match.liveInnings;
    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    
    battingTeam.innings.push(JSON.parse(JSON.stringify(live)));
    
    if (gameState.settings.totalInnings === 1 && gameState.match.currentInnings === 1) {
        gameState.match.target = live.score + 1;
        alert("Target set to: " + gameState.match.target);
    }

    gameState.match.currentBattingTeam = gameState.match.currentBattingTeam === 1 ? 2 : 1;
    gameState.match.currentInnings++;
    
    if (gameState.match.currentInnings > gameState.settings.totalInnings * 2) {
        alert("Match Over!");
        gameState.match.matchOver = true;
        toggleScreenshotMode();
        return;
    }
    
    gameState.match.liveInnings = {
        score: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
        batsmen: {},
        bowlers: {},
        currentBatsman1: "",
        currentBatsman2: "",
        currentBowler: "",
        previousBowler: null,
        outBatsmen: [],
        overLog: []
    };
    
    saveToLocalStorage();
    updateUI();
}

function addLegBye() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += 1;
    live.extras.legbyes += 1;
    live.balls++;
    live.bowlers[live.currentBowler].balls++;
    live.overLog.push('lb1');
    checkOverComplete();
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function undoLastAction() {
    if (gameState.history.length > 0) {
        gameState.match = gameState.history.pop();
        saveToLocalStorage();
        updateUI();
    }
}

function resetMatch() {
    localStorage.removeItem('cricketScorecardState');
    
    // Reset match state but keep settings and players
    gameState.match = {
        currentInnings: 1,
        currentBattingTeam: 1,
        team1: { name: "Team 1", players: gameState.match.team1.players, innings: [] },
        team2: { name: "Team 2", players: gameState.match.team2.players, innings: [] },
        liveInnings: {
            score: 0,
            wickets: 0,
            balls: 0,
            extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
            batsmen: {},
            bowlers: {},
            currentBatsman1: "",
            currentBatsman2: "",
            currentBowler: "",
            previousBowler: null,
            outBatsmen: [],
            overLog: []
        },
        target: null,
        matchOver: false
    };
    gameState.history = [];
    
    gameState.matchStarted = false;
    settingsSection.classList.remove('hidden');
    
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.add('hidden');
    document.body.classList.remove('screenshot-mode');
    
    // Repopulate UI inputs with current gameState.settings
    oversPerInningsInput.value = gameState.settings.oversPerInnings;
    maxOversPerBowlerInput.value = gameState.settings.maxOversPerBowler;
    allowSingleBatsmanInput.checked = gameState.settings.allowSingleBatsman;
    enableLegByesInput.checked = gameState.settings.enableLegByes;
    
    renderRosters();
    
    updateUI();
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered'))
            .catch(err => console.error('Service Worker registration failed', err));
    });
}

// Run Init
init();
