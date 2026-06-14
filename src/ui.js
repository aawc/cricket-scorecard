// ui.js
import { gameState, dispatch, setGameState } from './state.js';
import { saveState, clearState, loadState, generatePermalink } from './storage.js';

// DOM Elements
const settingsSection = document.getElementById('settings-section');
const scoreboardSection = document.getElementById('scoreboard-section');
const startMatchBtn = document.getElementById('start-match-btn');
const screenshotModeBtn = document.getElementById('screenshot-mode-btn');
const resetMatchBtn = document.getElementById('reset-match-btn');
const exitScreenshotModeBtn = document.getElementById('exit-screenshot-mode-btn');
const shareMatchBtn = document.getElementById('share-match-btn');
const themeBtns = document.querySelectorAll('.theme-btn');

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
let alertModalInstance = null;
let alertCallback = null;

let currentDeliveryType = null;
let selectedExtraRuns = 0;
let pendingRunOutStriker = true;
let activeBulkImportTeam = 1;
let expandedOvers = []; // Tracks expanded over indices in U1 UI

export function initUI() {
    setupEventListeners();
    initSortable();
    renderRosters();
    
    // Initial load from storage
    try {
        const loaded = loadState();
        if (loaded) {
            setGameState(loaded);
            if (gameState.matchStarted) {
                if (settingsSection) settingsSection.classList.add('hidden');
                const flipContainer = document.querySelector('.flip-container');
                if (flipContainer) flipContainer.classList.remove('hidden');
            } else {
                if (settingsSection) settingsSection.classList.remove('hidden');
            }
            if (gameState.settings && gameState.settings.theme) {
                setTheme(gameState.settings.theme);
            }
        } else {
            if (settingsSection) settingsSection.classList.remove('hidden');
        }
    } catch (e) {
        showAlert(e.message, "Error");
        if (settingsSection) settingsSection.classList.remove('hidden');
    }
    
    updateUI();
}

function setupEventListeners() {
    if (startMatchBtn) startMatchBtn.addEventListener('click', startMatch);
    if (screenshotModeBtn) screenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    if (exitScreenshotModeBtn) exitScreenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    if (resetMatchBtn) resetMatchBtn.addEventListener('click', resetMatch);
    if (shareMatchBtn) shareMatchBtn.addEventListener('click', shareMatch);

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

    if (wideBtn) wideBtn.addEventListener('click', () => triggerExtraRunsModal('wide'));
    if (noballBtn) noballBtn.addEventListener('click', () => triggerExtraRunsModal('noball'));
    if (wicketBtn) wicketBtn.addEventListener('click', addWicket);
    if (runoutBtn) runoutBtn.addEventListener('click', triggerRunOutModal);
    if (runoutStrikerBtn) runoutStrikerBtn.addEventListener('click', () => processRunOut(true));
    if (runoutNonstrikerBtn) runoutNonstrikerBtn.addEventListener('click', () => processRunOut(false));
    
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

    if (accrueBatsmanBtn) accrueBatsmanBtn.addEventListener('click', () => {
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, 'batsman');
    });

    if (accrueByesBtn) accrueByesBtn.addEventListener('click', () => {
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, 'byes');
    });

    if (byeBtn) byeBtn.addEventListener('click', () => triggerExtraRunsModal('bye'));
    if (legbyeBtn) legbyeBtn.addEventListener('click', addLegBye);
    if (undoBtn) undoBtn.addEventListener('click', undoLastAction);

    if (batsman1Select) batsman1Select.addEventListener('change', (e) => handleBatsmanChange(1, e.target.value));
    if (batsman2Select) batsman2Select.addEventListener('change', (e) => handleBatsmanChange(2, e.target.value));
    if (bowlerSelect) bowlerSelect.addEventListener('change', (e) => handleBowlerChange(e.target.value));

    const completedOversSection = document.getElementById('completed-overs-section');
    if (completedOversSection) {
        completedOversSection.addEventListener('click', (e) => {
            const header = e.target.closest('.completed-over-header');
            if (header) {
                const idx = parseInt(header.dataset.index);
                const pos = expandedOvers.indexOf(idx);
                if (pos === -1) {
                    expandedOvers.push(idx);
                } else {
                    expandedOvers.splice(pos, 1);
                }
                updateUI();
            }
        });
    }
}

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

export function renderRosters() {
    if (!team1RosterList || !team2RosterList) return;
    team1RosterList.innerHTML = '';
    team2RosterList.innerHTML = '';

    const createRosterItem = (name, isShared) => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'roster-item');
        li.dataset.shared = isShared ? "true" : "false";
        li.innerHTML = `
            <div class="d-flex align-items-center flex-grow-1">
                <span class="drag-handle me-2 text-muted">☰</span>
                <span class="lineup-number me-2 text-muted fw-bold"></span>
                <span class="player-name">${name}</span>
            </div>
            <div>
                ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
                <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
            </div>
        `;
        li.querySelector('.delete-player-btn').addEventListener('click', () => {
            li.remove();
            updateLineupNumbers();
        });
        return li;
    };

    gameState.match.team1.players.forEach(p => {
        const isShared = gameState.match.team2.players.includes(p); // Mark shared if exists in both on load
        team1RosterList.appendChild(createRosterItem(p, isShared));
    });
    gameState.match.team2.players.forEach(p => {
        const isShared = gameState.match.team1.players.includes(p);
        team2RosterList.appendChild(createRosterItem(p, isShared));
    });

    updateLineupNumbers();
}

function updateLineupNumbers() {
    if (team1RosterList) {
        team1RosterList.querySelectorAll('.roster-item').forEach((el, index) => {
            el.querySelector('.lineup-number').textContent = index + 1;
        });
    }
    if (team2RosterList) {
        team2RosterList.querySelectorAll('.roster-item').forEach((el, index) => {
            el.querySelector('.lineup-number').textContent = index + 1;
        });
    }
}

function handleQuickAdd(teamNum) {
    const input = teamNum === 1 ? team1QuickAdd : team2QuickAdd;
    const roster = teamNum === 1 ? team1RosterList : team2RosterList;
    if (!input || !roster) return;

    let name = input.value.trim();
    if (!name) return;

    let isShared = false;
    if (name.endsWith(' 🔁')) {
        name = name.replace(' 🔁', '').trim();
        isShared = true;
    }

    const li = document.createElement('li');
    li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'roster-item');
    li.dataset.shared = isShared ? "true" : "false";
    li.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1">
            <span class="drag-handle me-2 text-muted">☰</span>
            <span class="lineup-number me-2 text-muted fw-bold"></span>
            <span class="player-name">${name}</span>
        </div>
        <div>
            ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
            <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
        </div>
    `;
    li.querySelector('.delete-player-btn').addEventListener('click', () => {
        li.remove();
        updateLineupNumbers();
    });

    roster.appendChild(li);
    input.value = '';
    updateLineupNumbers();
}

function handleBulkImport() {
    if (!bulkImportTextarea) return;
    const text = bulkImportTextarea.value;
    const names = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    const roster = activeBulkImportTeam === 1 ? team1RosterList : team2RosterList;

    if (!roster) return;

    names.forEach(name => {
        let isShared = false;
        let cleanName = name;
        if (name.endsWith(' 🔁')) {
            cleanName = name.replace(' 🔁', '').trim();
            isShared = true;
        }

        const li = document.createElement('li');
        li.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center', 'roster-item');
        li.dataset.shared = isShared ? "true" : "false";
        li.innerHTML = `
            <div class="d-flex align-items-center flex-grow-1">
                <span class="drag-handle me-2 text-muted">☰</span>
                <span class="lineup-number me-2 text-muted fw-bold"></span>
                <span class="player-name">${cleanName}</span>
            </div>
            <div>
                ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
                <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
            </div>
        `;
        li.querySelector('.delete-player-btn').addEventListener('click', () => {
            li.remove();
            updateLineupNumbers();
        });
        roster.appendChild(li);
    });

    bulkImportTextarea.value = '';
    updateLineupNumbers();
}

export function toggleScreenshotMode() {
    const flipContainer = document.querySelector('.flip-container');
    if (!flipContainer) return;
    
    if (!flipContainer.classList.contains('flipped')) {
        generateSummaryView();
        flipContainer.classList.add('flipped');
        document.body.classList.add('screenshot-mode');
    } else {
        flipContainer.classList.remove('flipped');
        document.body.classList.remove('screenshot-mode');
    }
}

export function parseBallLog(b) {
    let runs = 0;
    let wicket = 0;
    
    if (b.includes('W')) {
        wicket = 1;
    }
    
    if (b.startsWith('wd')) {
        const extra = b.includes('+') ? parseInt(b.split('+')[1]) : 0;
        runs = gameState.settings.widePenalty + (isNaN(extra) ? 0 : extra);
    } else if (b.startsWith('nb')) {
        const extra = b.includes('+') ? parseInt(b.split('+')[1]) : 0;
        runs = gameState.settings.noBallPenalty + (isNaN(extra) ? 0 : extra);
    } else if (b.startsWith('lb')) {
        runs = parseInt(b.replace('lb', ''));
    } else if (b.includes('b') && !b.startsWith('n') && !b.startsWith('w')) {
        const part = b.split('+')[0];
        runs = parseInt(part.replace('b', ''));
    } else if (b === 'W' || b === 'W-RO') {
        runs = 0;
    } else if (b.includes('+W-RO')) {
        const part = b.split('+')[0];
        if (part.endsWith('b')) {
            runs = parseInt(part.replace('b', ''));
        } else {
            runs = parseInt(part);
        }
    } else {
        runs = parseInt(b);
    }
    
    return { runs, wicket };
}

export function generateSummaryView() {
    try {
        const summariesDiv = document.getElementById('innings-summaries');
        if (!summariesDiv) return;
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

            // Over Log Table (U2)
            let displayOvers = [...(inningsData.overs || [])];
            if (inningsData === gameState.match.liveInnings && inningsData.overLog && inningsData.overLog.length > 0) {
                displayOvers.push({
                    bowler: inningsData.currentBowler || "TBD",
                    balls: [...inningsData.overLog]
                });
            }

            if (displayOvers.length > 0) {
                const overLogHeading = document.createElement('h4');
                overLogHeading.textContent = "Over Log";
                overLogHeading.style.fontSize = "1rem";
                overLogHeading.style.marginTop = "1rem";
                overLogHeading.style.borderBottom = "1px solid #ddd";
                overLogHeading.style.paddingBottom = "0.25rem";
                inningsDiv.appendChild(overLogHeading);

                const overLogTable = document.createElement('table');
                overLogTable.classList.add('summary-table');
                overLogTable.innerHTML = `<thead><tr><th>Over</th><th>Bowler</th><th>Runs</th><th>Wkts</th><th>Deliveries</th></tr></thead>`;
                const overLogTbody = document.createElement('tbody');
                
                displayOvers.forEach((over, idx) => {
                    let overRuns = 0;
                    let overWickets = 0;
                    over.balls.forEach(b => {
                        const parsed = parseBallLog(b);
                        overRuns += parsed.runs;
                        overWickets += parsed.wicket;
                    });
                    
                    const tr = document.createElement('tr');
                    const isLive = (inningsData === gameState.match.liveInnings && idx === displayOvers.length - 1 && inningsData.overLog && inningsData.overLog.length > 0 && inningsData.balls % 6 !== 0);
                    
                    tr.innerHTML = `
                        <td>${idx + 1}${isLive ? '*' : ''}</td>
                        <td>${over.bowler}</td>
                        <td>${overRuns}</td>
                        <td>${overWickets}</td>
                        <td>${over.balls.join(', ')}</td>
                    `;
                    overLogTbody.appendChild(tr);
                });
                overLogTable.appendChild(overLogTbody);
                inningsDiv.appendChild(overLogTable);
            }

            summariesDiv.appendChild(inningsDiv);
        }

        // Render completed innings for Team 1 and Team 2
        gameState.match.team1.innings.forEach(inn => renderInningsSummary(gameState.match.team1.name, inn, 1));
        gameState.match.team2.innings.forEach(inn => renderInningsSummary(gameState.match.team2.name, inn, 2));

        // Render active live innings if the match is not over
        if (!gameState.match.matchOver) {
            const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
            const currentInningNumber = gameState.match.currentInnings;
            renderInningsSummary(battingTeam.name, gameState.match.liveInnings, currentInningNumber);
        }
    } catch (e) {
        console.error("Failed to generate scorecard summary", e);
    }
}

export function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme === 'green' ? 'light' : theme);
    document.body.setAttribute('data-bs-theme', theme);
    gameState.settings.theme = theme;
    
    themeBtns.forEach(btn => {
        if (btn.dataset.theme === theme) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    saveState(gameState);
}

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

export function updateUI() {
    if (!gameState.match || !gameState.match.liveInnings) return;
    
    const live = gameState.match.liveInnings;
    
    if (scoreDisplay) scoreDisplay.textContent = `${live.score} - ${live.wickets}`;
    
    const overs = Math.floor(live.balls / 6);
    const balls = live.balls % 6;
    if (oversDisplay) oversDisplay.textContent = `Overs: ${overs}.${balls}`;

    // Target and status displays
    const isChasing = gameState.settings.totalInnings === 1 && gameState.match.currentInnings === 2;
    const target = gameState.match.target;
    
    const targetDisplay = document.getElementById('target-display');
    if (targetDisplay) {
        if (isChasing && target !== null) {
            targetDisplay.classList.remove('hidden');
            const runsNeeded = target - live.score;
            const remainingBalls = (gameState.settings.oversPerInnings * 6) - live.balls;
            
            // Calculate CRR and RRR
            const crr = live.balls > 0 ? (live.score / (live.balls / 6)) : 0;
            const rrr = remainingBalls > 0 ? (runsNeeded / (remainingBalls / 6)) : 0;
            
            targetDisplay.textContent = `Target: ${target} | CRR: ${crr.toFixed(2)} | RRR: ${rrr.toFixed(2)}`;
        } else {
            targetDisplay.classList.add('hidden');
        }
    }

    // Disable buttons on settings page
    if (screenshotModeBtn) screenshotModeBtn.disabled = !gameState.matchStarted;
    if (resetMatchBtn) resetMatchBtn.disabled = !gameState.matchStarted;

    // Show/Hide Leg Bye button
    if (legbyeBtn) {
        if (gameState.settings.enableLegByes) {
            legbyeBtn.classList.remove('hidden');
        } else {
            legbyeBtn.classList.add('hidden');
        }
    }

    checkControlsState();

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const bowlingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team2 : gameState.match.team1;
    const totalPlayers = battingTeam ? battingTeam.players.length : 2;
    const singleBatsmanAllowed = gameState.settings.allowSingleBatsman;
    const maxWickets = singleBatsmanAllowed ? totalPlayers : totalPlayers - 1;
    const lastManStanding = singleBatsmanAllowed && live.wickets === totalPlayers - 1;

    // Populate dropdowns with filtering
    if (batsman1Select && battingTeam) {
        populateDropdown(batsman1Select, battingTeam.players, live.currentBatsman1, "Select Batsman 1 (Striker)", (player) => {
            return player !== live.currentBatsman2 && !live.outBatsmen.includes(player);
        });
    }

    if (batsman2Select && battingTeam) {
        if (lastManStanding) {
            batsman2Select.classList.add('hidden');
            if (batsman2Stats) batsman2Stats.classList.add('hidden');
        } else {
            batsman2Select.classList.remove('hidden');
            if (batsman2Stats) batsman2Stats.classList.remove('hidden');
            populateDropdown(batsman2Select, battingTeam.players, live.currentBatsman2, "Select Batsman 2", (player) => {
                return player !== live.currentBatsman1 && !live.outBatsmen.includes(player);
            });
        }
    }

    if (bowlerSelect && bowlingTeam) {
        populateDropdown(bowlerSelect, bowlingTeam.players, live.currentBowler, "Select Bowler", (player) => {
            const maxBalls = gameState.settings.maxOversPerBowler * 6;
            const stats = live.bowlers[player] || { balls: 0 };
            return player !== live.previousBowler && stats.balls < maxBalls;
        });
    }

    // Striker indicators & Active styles
    const b1Container = document.getElementById('batsman1-container');
    const b2Container = document.getElementById('batsman2-container');
    
    if (b1Container) b1Container.classList.remove('batsman', 'active');
    if (b2Container) b2Container.classList.remove('batsman', 'active');

    if (live.currentBatsman1 && live.batsmen[live.currentBatsman1]) {
        if (b1Container) {
            b1Container.classList.add('batsman');
            if (live.batsmen[live.currentBatsman1].active) b1Container.classList.add('active');
        }
        if (batsman1Stats) {
            const b = live.batsmen[live.currentBatsman1];
            batsman1Stats.textContent = `${b.runs} (${b.balls})`;
        }
    } else {
        if (batsman1Stats) batsman1Stats.textContent = '0 (0)';
    }

    if (live.currentBatsman2 && live.batsmen[live.currentBatsman2]) {
        if (b2Container) {
            b2Container.classList.add('batsman');
            if (live.batsmen[live.currentBatsman2].active) b2Container.classList.add('active');
        }
        if (batsman2Stats) {
            const b = live.batsmen[live.currentBatsman2];
            batsman2Stats.textContent = `${b.runs} (${b.balls})`;
        }
    } else {
        if (batsman2Stats) batsman2Stats.textContent = '0 (0)';
    }

    if (live.currentBowler && live.bowlers[live.currentBowler]) {
        if (bowlerStats) {
            const b = live.bowlers[live.currentBowler];
            const bOvers = Math.floor(b.balls / 6);
            const bBalls = b.balls % 6;
            bowlerStats.textContent = `${b.wickets}/${b.runs} (${bOvers}.${bBalls})`;
        }
    } else {
        if (bowlerStats) bowlerStats.textContent = '0/0 (0.0)';
    }

    // Extras
    const ext = live.extras;
    const totalExtras = ext.wides + ext.noballs + ext.byes + ext.legbyes;
    if (extrasTotalDisplay) extrasTotalDisplay.textContent = totalExtras;
    if (widesDisplay) widesDisplay.textContent = ext.wides;
    if (noballsDisplay) noballsDisplay.textContent = ext.noballs;
    if (byesDisplay) byesDisplay.textContent = ext.byes;
    if (legbyesDisplay) legbyesDisplay.textContent = ext.legbyes;

    // Over Log
    if (overLogDisplay) {
        overLogDisplay.innerHTML = '';
        live.overLog.forEach(b => {
            const span = document.createElement('span');
            span.classList.add('badge', 'me-1', 'ball-log');
            if (b.includes('W')) {
                span.classList.add('wicket');
            } else if (b.startsWith('wd') || b.startsWith('nb') || b.includes('lb') || b.includes('b')) {
                span.classList.add('extra');
            } else {
                span.classList.add('normal');
            }
            span.textContent = b;
            overLogDisplay.appendChild(span);
        });
    }

    // Match Status description
    if (matchStatusDisplay) {
        if (gameState.match.matchOver) {
            if (isChasing && target !== null) {
                if (live.score >= target) {
                    matchStatusDisplay.textContent = `Match Over! ${battingTeam.name} won by ${totalPlayers - 1 - live.wickets} wickets!`;
                } else if (live.wickets >= maxWickets) {
                    matchStatusDisplay.textContent = `Match Over! ${bowlingTeam.name} won by ${target - 1 - live.score} runs!`;
                } else if (live.balls >= gameState.settings.oversPerInnings * 6) {
                    if (live.score === target - 1) {
                        matchStatusDisplay.textContent = `Match Over! Match Tied!`;
                    } else {
                        matchStatusDisplay.textContent = `Match Over! ${bowlingTeam.name} won by ${target - 1 - live.score} runs!`;
                    }
                }
            } else {
                matchStatusDisplay.textContent = "Match Over!";
            }
        } else {
            matchStatusDisplay.textContent = `Innings ${gameState.match.currentInnings} | Batting: ${battingTeam ? battingTeam.name : 'Unknown'}`;
        }
    }

    // Render Completed Overs Collapsible List (U1)
    const completedOversSection = document.getElementById('completed-overs-section');
    if (completedOversSection) {
        completedOversSection.innerHTML = '';
        
        const oversData = live.overs || [];
        if (oversData.length > 0) {
            const heading = document.createElement('h3');
            heading.classList.add('h6', 'text-muted', 'mb-2');
            heading.textContent = 'Completed Overs';
            completedOversSection.appendChild(heading);
            
            for (let idx = oversData.length - 1; idx >= 0; idx--) {
                const over = oversData[idx];
                const isExpanded = expandedOvers.includes(idx);
                
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('completed-over-item');
                
                // Calculate over summary
                let overRuns = 0;
                let overWickets = 0;
                over.balls.forEach(b => {
                    const parsed = parseBallLog(b);
                    overRuns += parsed.runs;
                    overWickets += parsed.wicket;
                });
                
                const headerDiv = document.createElement('div');
                headerDiv.classList.add('completed-over-header');
                headerDiv.dataset.index = idx;
                headerDiv.innerHTML = `
                    <span>Over ${idx + 1}: ${over.bowler}</span>
                    <span>Runs: ${overRuns} | Wkts: ${overWickets} <span class="arrow">${isExpanded ? '▲' : '▼'}</span></span>
                `;
                itemDiv.appendChild(headerDiv);
                
                if (isExpanded) {
                    const ballsDiv = document.createElement('div');
                    ballsDiv.classList.add('completed-over-balls');
                    
                    over.balls.forEach(b => {
                        const span = document.createElement('span');
                        span.classList.add('badge', 'me-1', 'ball-log');
                        if (b.includes('W')) {
                            span.classList.add('wicket');
                        } else if (b.startsWith('wd') || b.startsWith('nb') || b.includes('lb') || b.includes('b')) {
                            span.classList.add('extra');
                        } else {
                            span.classList.add('normal');
                        }
                        span.textContent = b;
                        ballsDiv.appendChild(span);
                    });
                    itemDiv.appendChild(ballsDiv);
                }
                
                completedOversSection.appendChild(itemDiv);
            }
        }
    }

    if (tossTeam1Btn && tossTeam2Btn && battingTeam) {
        tossTeam1Btn.textContent = `${gameState.match.team1.name || 'Team 1'} Batting`;
        tossTeam2Btn.textContent = `${gameState.match.team2.name || 'Team 2'} Batting`;
    }
    handleUIEvents();
}

function checkControlsState() {
    if (!controlsSection) return;
    const live = gameState.match.liveInnings;
    const controls = controlsSection.querySelectorAll('button:not(#undo-btn)');
    
    if (gameState.match.matchOver) {
        controls.forEach(btn => btn.disabled = true);
        return;
    }

    const battingTeam = gameState.match.currentBattingTeam === 1 ? gameState.match.team1 : gameState.match.team2;
    const totalPlayers = battingTeam ? battingTeam.players.length : 2;
    const singleBatsmanAllowed = gameState.settings.allowSingleBatsman;
    const lastManStanding = singleBatsmanAllowed && live.wickets === totalPlayers - 1;
    
    let needsSelection = false;
    if (lastManStanding) {
        needsSelection = !live.currentBatsman1 || !live.currentBowler;
    } else {
        needsSelection = !live.currentBatsman1 || !live.currentBatsman2 || !live.currentBowler;
    }
    
    controls.forEach(btn => {
        btn.disabled = needsSelection;
    });

    // Mark invalid states on select elements
    if (batsman1Select) {
        if (!live.currentBatsman1) batsman1Select.classList.add('is-invalid');
        else batsman1Select.classList.remove('is-invalid');
    }
    if (batsman2Select && !lastManStanding) {
        if (!live.currentBatsman2) batsman2Select.classList.add('is-invalid');
        else batsman2Select.classList.remove('is-invalid');
    }
    if (bowlerSelect) {
        if (!live.currentBowler) bowlerSelect.classList.add('is-invalid');
        else bowlerSelect.classList.remove('is-invalid');
    }
}

export function showAlert(message, title = "Alert", callback = null) {
    const messageEl = document.getElementById('alert-message');
    const labelEl = document.getElementById('alertDialogModalLabel');
    
    if (messageEl) messageEl.textContent = message;
    if (labelEl) labelEl.textContent = title;
    
    alertCallback = callback;
    
    if (typeof bootstrap !== 'undefined') {
        const modalEl = document.getElementById('alertDialogModal');
        if (!alertModalInstance && modalEl) {
            alertModalInstance = new bootstrap.Modal(modalEl);
            
            modalEl.addEventListener('hidden.bs.modal', () => {
                if (alertCallback) {
                    const cb = alertCallback;
                    alertCallback = null;
                    cb();
                }
            });
        }
        if (alertModalInstance) alertModalInstance.show();
    } else {
        // Fallback for Node.js test environment
        alert(message);
        if (callback) callback();
    }
}

export function triggerRunOutModal() {
    if (gameState.match.matchOver) return;
    const live = gameState.match.liveInnings;
    
    const striker = live.currentBatsman1 && live.batsmen[live.currentBatsman1] && live.batsmen[live.currentBatsman1].active ? live.currentBatsman1 : live.currentBatsman2;
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;
    
    const strikerBtn = document.getElementById('runout-striker-btn');
    const nonStrikerBtn = document.getElementById('runout-nonstriker-btn');
    
    if (strikerBtn) strikerBtn.textContent = `Striker: ${striker}`;
    if (nonStrikerBtn) nonStrikerBtn.textContent = `Non-Striker: ${nonStriker}`;
    
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

export function triggerExtraRunsModal(deliveryType) {
    if (gameState.match.matchOver) return;
    currentDeliveryType = deliveryType;
    selectedExtraRuns = 0;
    
    extraRunValBtns.forEach(b => b.classList.remove('active'));
    if (accrualSection) accrualSection.classList.add('hidden');
    
    const wideLabel = document.getElementById('extraRunsModalLabel');
    if (wideLabel) {
        wideLabel.textContent = `Runs scored on ${deliveryType.toUpperCase()}?`;
    }

    // Hide/Show batsman accrual button depending on delivery type
    const accrueBatsmanBtn = document.getElementById('accrue-batsman-btn');
    if (accrueBatsmanBtn) {
        if (deliveryType === 'wide') {
            accrueBatsmanBtn.classList.add('hidden');
        } else {
            accrueBatsmanBtn.classList.remove('hidden');
        }
    }
    
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

export function processRunOut(isStriker) {
    if (gameState.match.matchOver) return;
    pendingRunOutStriker = isStriker;
    triggerExtraRunsModal('runout');
}

export function handleBatsmanChange(batsmanNumber, newName) {
    dispatch({ type: 'CHANGE_BATSMAN', payload: { slot: batsmanNumber, name: newName } });
    updateUI();
}

export function handleBowlerChange(newName) {
    dispatch({ type: 'CHANGE_BOWLER', payload: { name: newName } });
    updateUI();
}

export function startMatch() {
    const settings = {
        totalInnings: 1,
        oversPerInnings: parseInt(oversPerInningsInput.value),
        maxOversPerBowler: parseInt(maxOversPerBowlerInput.value),
        widePenalty: 1,
        noBallPenalty: 1,
        allowSingleBatsman: allowSingleBatsmanInput.checked,
        enableLegByes: enableLegByesInput.checked
    };

    let t1Names = [];
    let t2Names = [];

    if (team1RosterList && team2RosterList) {
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
    }

    const totalOvers = settings.oversPerInnings;
    const maxOversPerBowler = settings.maxOversPerBowler;
    const minBowlersNeeded = Math.ceil(totalOvers / maxOversPerBowler);

    if (t1Names.length < minBowlersNeeded) {
        showAlert(`Team 1 needs at least ${minBowlersNeeded} players to bowl ${totalOvers} overs (max ${maxOversPerBowler} per bowler).`, "Validation Error");
        return;
    }
    if (t2Names.length < minBowlersNeeded) {
        showAlert(`Team 2 needs at least ${minBowlersNeeded} players to bowl ${totalOvers} overs (max ${maxOversPerBowler} per bowler).`, "Validation Error");
        return;
    }

    const minBatsmenNeeded = settings.allowSingleBatsman ? 1 : 2;
    if (t1Names.length < minBatsmenNeeded || t2Names.length < minBatsmenNeeded) {
        showAlert(`Each team needs at least ${minBatsmenNeeded} players to bat.`, "Validation Error");
        return;
    }

    dispatch({ type: 'START_MATCH', payload: { settings, team1Players: t1Names, team2Players: t2Names } });

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

export function executeStartMatch(battingTeamNum) {
    if (tossModalInstance) tossModalInstance.hide();

    dispatch({ type: 'CHOOSE_TOSS_BATTING', payload: { battingTeamNum } });

    if (settingsSection) settingsSection.classList.add('hidden');
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.remove('hidden');

    updateUI();
}

export function resetMatch() {
    clearState();
    dispatch({ type: 'RESET_MATCH' });
    expandedOvers = [];
    
    if (settingsSection) settingsSection.classList.remove('hidden');
    
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.add('hidden');
    document.body.classList.remove('screenshot-mode');
    
    if (oversPerInningsInput) oversPerInningsInput.value = gameState.settings.oversPerInnings;
    if (maxOversPerBowlerInput) maxOversPerBowlerInput.value = gameState.settings.maxOversPerBowler;
    if (allowSingleBatsmanInput) allowSingleBatsmanInput.checked = gameState.settings.allowSingleBatsman;
    if (enableLegByesInput) enableLegByesInput.checked = gameState.settings.enableLegByes;
    
    renderRosters();
    updateUI();
}

export function shareMatch() {
    const url = generatePermalink(gameState);
    
    navigator.clipboard.writeText(url).then(() => {
        showAlert("Permalink copied to clipboard!", "Share Match");
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showAlert("Failed to copy link automatically. Setting URL in address bar instead.", "Share Match");
        if (typeof window !== 'undefined') {
            window.history.pushState({}, '', url);
        }
    });
}

export function undoLastAction() {
    dispatch({ type: 'UNDO' });
    updateUI();
}

export function addRuns(runs) {
    dispatch({ type: 'ADD_RUNS', payload: { runs } });
    updateUI();
}

export function addLegBye() {
    dispatch({ type: 'ADD_LEG_BYE' });
    updateUI();
}

export function addWicket() {
    dispatch({ type: 'ADD_WICKET' });
    updateUI();
}

export function finalizeDelivery(type, extraRuns, accrueTo) {
    dispatch({ type: 'FINALIZE_DELIVERY', payload: { type, extraRuns, accrueTo, pendingRunOutStriker } });
    updateUI();
}

function handleUIEvents() {
    const events = [...(gameState.uiEvents || [])];
    if (gameState.uiEvents) {
        gameState.uiEvents = [];
    }

    events.forEach(evt => {
        if (evt.type === 'SHOW_ALERT') {
            showAlert(evt.payload.message, evt.payload.title, () => {
                if (evt.payload.triggerAction) {
                    dispatch({ type: evt.payload.triggerAction });
                    updateUI();
                }
            });
        } else if (evt.type === 'TOGGLE_SCREENSHOT') {
            toggleScreenshotMode();
        }
    });
}
