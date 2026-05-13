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
const widePenaltyInput = document.getElementById('wide-penalty');
const noBallPenaltyInput = document.getElementById('no-ball-penalty');
const allowSingleBatsmanInput = document.getElementById('allow-single-batsman');
const enableLegByesInput = document.getElementById('enable-legbyes');
const team1PlayersInput = document.getElementById('team1-players');
const team2PlayersInput = document.getElementById('team2-players');

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
const byeBtn = document.getElementById('bye-btn');
const legbyeBtn = document.getElementById('legbye-btn');
const undoBtn = document.getElementById('undo-btn');

// Initialize
function init() {
    loadFromLocalStorage();
    setupEventListeners();
    updateUI();
}

// Event Listeners
function setupEventListeners() {
    startMatchBtn.addEventListener('click', startMatch);
    screenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    exitScreenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    resetMatchBtn.addEventListener('click', resetMatch);
    shareMatchBtn.addEventListener('click', shareMatch);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });

    runBtns.forEach(btn => {
        btn.addEventListener('click', () => addRuns(parseInt(btn.dataset.runs)));
    });

    wideBtn.addEventListener('click', addWide);
    noballBtn.addEventListener('click', addNoBall);
    wicketBtn.addEventListener('click', addWicket);
    byeBtn.addEventListener('click', addBye);
    legbyeBtn.addEventListener('click', addLegBye);
    undoBtn.addEventListener('click', undoLastAction);

    batsman1Select.addEventListener('change', (e) => handleBatsmanChange(1, e.target.value));
    batsman2Select.addEventListener('change', (e) => handleBatsmanChange(2, e.target.value));
    bowlerSelect.addEventListener('change', (e) => handleBowlerChange(e.target.value));
}

// Load from LocalStorage or URL
function loadFromLocalStorage() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlState = urlParams.get('state');
    const flipContainer = document.querySelector('.flip-container');

    if (urlState) {
        try {
            const decodedState = JSON.parse(decodeURIComponent(urlState));
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
            console.error("Failed to parse state from URL", e);
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
    const stateToShare = {
        settings: gameState.settings,
        match: gameState.match
    };
    const serializedState = encodeURIComponent(JSON.stringify(stateToShare));
    const url = window.location.origin + window.location.pathname + '?state=' + serializedState;
    
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
    gameState.settings.widePenalty = parseInt(widePenaltyInput.value);
    gameState.settings.noBallPenalty = parseInt(noBallPenaltyInput.value);
    gameState.settings.allowSingleBatsman = allowSingleBatsmanInput.checked;
    gameState.settings.enableLegByes = enableLegByesInput.checked;

    // Parse player names
    gameState.match.team1.players = team1PlayersInput.value.split(',').map(name => name.trim()).filter(name => name !== '');
    gameState.match.team2.players = team2PlayersInput.value.split(',').map(name => name.trim()).filter(name => name !== '');

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

    // Initialize live innings
    gameState.match.liveInnings = {
        score: 0,
        wickets: 0,
        balls: 0,
        extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0 },
        batsmen: {},
        bowlers: {},
        currentBatsman1: "", // Force selection
        currentBatsman2: "", // Force selection
        currentBowler: "", // Force selection
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
        gameState.match.liveInnings.bowlers[name] = { runs: 0, balls: 0, wickets: 0 };
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
        bowlersTable.innerHTML = `<thead><tr><th>Bowler</th><th>Overs</th><th>Runs</th><th>Wickets</th></tr></thead>`;
        const bowlersTbody = document.createElement('tbody');
        for (const name in inningsData.bowlers) {
            const b = inningsData.bowlers[name];
            const tr = document.createElement('tr');
            const bOvers = Math.floor(b.balls / 6);
            const bBalls = b.balls % 6;
            tr.innerHTML = `<td>${name}</td><td>${bOvers}.${bBalls}</td><td>${b.runs}</td><td>${b.wickets}</td>`;
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

    const activeBatsman = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.batsmen[live.currentBatsman1] : live.batsmen[live.currentBatsman2];
    if (activeBatsman) {
        activeBatsman.runs += runs;
        activeBatsman.balls++;
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

function addWide() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += gameState.settings.widePenalty;
    live.extras.wides += gameState.settings.widePenalty;
    live.bowlers[live.currentBowler].runs += gameState.settings.widePenalty;
    live.overLog.push('wd');
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function addNoBall() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += gameState.settings.noBallPenalty;
    live.extras.noballs += gameState.settings.noBallPenalty;
    live.bowlers[live.currentBowler].runs += gameState.settings.noBallPenalty;
    live.overLog.push('nb');
    checkMatchOver();
    saveToLocalStorage();
    updateUI();
}

function addWicket() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    
    const activeBatsmanName = live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const activeBatsman = live.batsmen[activeBatsmanName];
    if (activeBatsman) {
        activeBatsman.balls++; // Count the ball faced!
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

function addBye() {
    if (gameState.match.matchOver) return;
    saveHistory();
    const live = gameState.match.liveInnings;
    live.score += 1;
    live.extras.byes += 1;
    live.balls++;
    live.bowlers[live.currentBowler].balls++;
    live.overLog.push('b1');
    checkOverComplete();
    checkMatchOver();
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
    const retainedTeam1Players = gameState.match.team1.players.join(', ');
    const retainedTeam2Players = gameState.match.team2.players.join(', ');

    localStorage.removeItem('cricketScorecardState');
    gameState = {
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
            currentBattingTeam: 1,
            team1: { name: "Team 1", players: [], innings: [] },
            team2: { name: "Team 2", players: [], innings: [] },
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
        },
        history: []
    };
    
    team1PlayersInput.value = retainedTeam1Players;
    team2PlayersInput.value = retainedTeam2Players;
    
    gameState.matchStarted = false;
    settingsSection.classList.remove('hidden');
    
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.add('hidden');
    document.body.classList.remove('screenshot-mode');
    
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
