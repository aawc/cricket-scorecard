import { gameState, dispatch, setGameState } from './state.js';
import { saveState, loadState, generatePermalink, clearState } from './storage.js';
import { GameState, LiveInnings, Team } from './types.js';
import { generateBugReportMarkdown, copyBugReportToClipboard, getGitHubIssueUrl } from './feedback.js';
import { openModal, closeModal, initModalSystem, registerModalHiddenCallback } from './modal.js';
import {
    startLiveSession,
    stopLiveSync,
    joinSpectatorSession,
    getLiveSession,
    subscribeLiveSession,
    parseLiveUrlParams,
    getSpectatorUrl,
    getUmpireUrl
} from './sync.js';
import { initReleaseNotesModal, openReleaseNotesModal } from './release_notes.js';

// DOM Elements
const appContainer = document.getElementById('app-container') as HTMLElement | null;
const settingsSection = document.getElementById('settings-section') as HTMLElement | null;
const scoreboardSection = document.getElementById('scoreboard-section') as HTMLElement | null;
const startMatchBtn = document.getElementById('start-match-btn') as HTMLButtonElement | null;
const screenshotModeBtn = document.getElementById('screenshot-mode-btn') as HTMLButtonElement | null;
const endInningsBtn = document.getElementById('end-innings-btn') as HTMLButtonElement | null;
const triggerEndInningsBtn = document.getElementById('trigger-end-innings-btn') as HTMLButtonElement | null;
const confirmEndInningsBtn = document.getElementById('confirm-end-innings-btn') as HTMLButtonElement | null;
const resetMatchBtn = document.getElementById('reset-match-btn') as HTMLButtonElement | null;
const newMatchBtn = document.getElementById('new-match-btn') as HTMLButtonElement | null;
const matchOverNewMatchBtn = document.getElementById('match-over-new-match-btn') as HTMLButtonElement | null;
const confirmNewMatchBtn = document.getElementById('confirm-new-match-btn') as HTMLButtonElement | null;
const exitScreenshotModeBtn = document.getElementById('exit-screenshot-mode-btn') as HTMLButtonElement | null;
const shareMatchBtn = document.getElementById('share-match-btn') as HTMLButtonElement | null;
const liveStreamBtn = document.getElementById('live-stream-btn') as HTMLButtonElement | null;
const feedbackBtn = document.getElementById('feedback-btn') as HTMLButtonElement | null;
const footerFeedbackLink = document.getElementById('footer-feedback-link') as HTMLButtonElement | null;
const copySummaryTextBtn = document.getElementById('copy-summary-text-btn') as HTMLButtonElement | null;
const themeBtns = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;

const oversPerInningsInput = document.getElementById('overs-per-innings') as HTMLInputElement | null;
const maxOversPerBowlerInput = document.getElementById('max-overs-per-bowler') as HTMLInputElement | null;
const allowSingleBatsmanInput = document.getElementById('allow-single-batsman') as HTMLInputElement | null;
const enableLegByesInput = document.getElementById('enable-legbyes') as HTMLInputElement | null;
const team1RosterList = document.getElementById('team1-roster-list') as HTMLDivElement | null;
const team2RosterList = document.getElementById('team2-roster-list') as HTMLDivElement | null;
const team1QuickAdd = document.getElementById('team1-quick-add') as HTMLInputElement | null;
const team2QuickAdd = document.getElementById('team2-quick-add') as HTMLInputElement | null;
const team1AddBtn = document.getElementById('team1-add-btn') as HTMLButtonElement | null;
const team2AddBtn = document.getElementById('team2-add-btn') as HTMLButtonElement | null;
const bulkImportTextarea = document.getElementById('bulk-import-textarea') as HTMLTextAreaElement | null;
const executeBulkImportBtn = document.getElementById('execute-bulk-import-btn') as HTMLButtonElement | null;
const team1BulkBtn = document.getElementById('team1-bulk-btn') as HTMLButtonElement | null;
const team2BulkBtn = document.getElementById('team2-bulk-btn') as HTMLButtonElement | null;
const tossModalEl = document.getElementById('tossModal') as HTMLElement | null;
const tossTeam1Btn = document.getElementById('toss-team1-btn') as HTMLButtonElement | null;
const tossTeam2Btn = document.getElementById('toss-team2-btn') as HTMLButtonElement | null;

const scoreDisplay = document.getElementById('score-display') as HTMLElement | null;
const oversDisplay = document.getElementById('overs-display') as HTMLElement | null;
const matchStatusDisplay = document.getElementById('match-status') as HTMLElement | null;
const targetDisplay = document.getElementById('target-display') as HTMLElement | null;
const batsman1Select = document.getElementById('batsman1-select') as HTMLSelectElement | null;
const batsman2Select = document.getElementById('batsman2-select') as HTMLSelectElement | null;
const bowlerSelect = document.getElementById('bowler-select') as HTMLSelectElement | null;
const batsman1Stats = document.getElementById('batsman1-stats') as HTMLElement | null;
const batsman2Stats = document.getElementById('batsman2-stats') as HTMLElement | null;
const bowlerStats = document.getElementById('bowler-stats') as HTMLElement | null;
const extrasTotalDisplay = document.getElementById('extras-total') as HTMLElement | null;
const widesDisplay = document.getElementById('wides-display') as HTMLElement | null;
const noballsDisplay = document.getElementById('noballs-display') as HTMLElement | null;
const byesDisplay = document.getElementById('byes-display') as HTMLElement | null;
const legbyesDisplay = document.getElementById('legbyes-display') as HTMLElement | null;
const overLogDisplay = document.getElementById('over-log') as HTMLElement | null;
const selectionWarning = document.getElementById('selection-warning') as HTMLElement | null;
const matchOverBanner = document.getElementById('match-over-banner') as HTMLElement | null;
const matchOverText = document.getElementById('match-over-text') as HTMLElement | null;

const controlsSection = document.getElementById('controls-section') as HTMLElement | null;
const runBtns = document.querySelectorAll('.run-btn') as NodeListOf<HTMLButtonElement>;
const wideBtn = document.getElementById('wide-btn') as HTMLButtonElement | null;
const noballBtn = document.getElementById('noball-btn') as HTMLButtonElement | null;
const wicketBtn = document.getElementById('wicket-btn') as HTMLButtonElement | null;
const runoutBtn = document.getElementById('runout-btn') as HTMLButtonElement | null;
const runoutStrikerBtn = document.getElementById('runout-striker-btn') as HTMLButtonElement | null;
const runoutNonstrikerBtn = document.getElementById('runout-nonstriker-btn') as HTMLButtonElement | null;
const extraRunValBtns = document.querySelectorAll('.extra-run-val-btn') as NodeListOf<HTMLButtonElement>;
const accrualSection = document.getElementById('accrual-section') as HTMLElement | null;
const accrueBatsmanBtn = document.getElementById('accrue-batsman-btn') as HTMLButtonElement | null;
const accrueByesBtn = document.getElementById('accrue-byes-btn') as HTMLButtonElement | null;
const byeBtn = document.getElementById('bye-btn') as HTMLButtonElement | null;
const legbyeBtn = document.getElementById('legbye-btn') as HTMLButtonElement | null;
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement | null;

let alertCallback: (() => void) | null = null;

const feedbackModalEl = document.getElementById('feedbackModal') as HTMLElement | null;
const feedbackTextInput = document.getElementById('feedback-text') as HTMLTextAreaElement | null;
const feedbackIncludeStateInput = document.getElementById('feedback-include-state') as HTMLInputElement | null;
const feedbackPreviewEl = document.getElementById('feedback-preview') as HTMLElement | null;
const feedbackToastEl = document.getElementById('feedback-toast') as HTMLElement | null;
const copyFeedbackReportBtn = document.getElementById('copy-feedback-report-btn') as HTMLButtonElement | null;
const openGithubIssueBtn = document.getElementById('open-github-issue-btn') as HTMLButtonElement | null;

// Live Stream Elements
const liveModalEl = document.getElementById('liveModal') as HTMLElement | null;
const startLiveBtn = document.getElementById('start-live-btn') as HTMLButtonElement | null;
const stopLiveBtn = document.getElementById('stop-live-btn') as HTMLButtonElement | null;
const copySpectatorUrlBtn = document.getElementById('copy-spectator-url-btn') as HTMLButtonElement | null;
const copyUmpireUrlBtn = document.getElementById('copy-umpire-url-btn') as HTMLButtonElement | null;
const spectatorUrlInput = document.getElementById('spectator-url-input') as HTMLInputElement | null;
const umpireUrlInput = document.getElementById('umpire-url-input') as HTMLInputElement | null;
const liveInactiveSection = document.getElementById('live-inactive-section') as HTMLElement | null;
const liveActiveSection = document.getElementById('live-active-section') as HTMLElement | null;
const modalLiveStatusBadge = document.getElementById('modal-live-status-badge') as HTMLElement | null;
const modalLiveSeq = document.getElementById('modal-live-seq') as HTMLElement | null;
const modalLiveExpires = document.getElementById('modal-live-expires') as HTMLElement | null;
const liveModalToast = document.getElementById('live-modal-toast') as HTMLElement | null;

const spectatorBanner = document.getElementById('spectator-banner') as HTMLElement | null;
const spectatorStatusBadge = document.getElementById('spectator-status-badge') as HTMLElement | null;
const spectatorStatusText = document.getElementById('spectator-status-text') as HTMLElement | null;
const spectatorLastUpdate = document.getElementById('spectator-last-update') as HTMLElement | null;
const spectatorRefreshBtn = document.getElementById('spectator-refresh-btn') as HTMLButtonElement | null;
const liveSyncBadge = document.getElementById('live-sync-badge') as HTMLElement | null;

let currentDeliveryType: string | null = null;
let selectedExtraRuns = 0;
let pendingRunOutStriker = true;
let activeBulkImportTeam: 1 | 2 = 1;
let expandedOvers: number[] = [];

/**
 * Helper to check if current session is in spectator mode.
 */
export function isSpectator(): boolean {
    const session = getLiveSession();
    return !!(session && session.isLive && session.role === 'SPECTATOR');
}

export function initUI(): void {
    initModalSystem();
    initReleaseNotesModal();
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
    } catch (e: any) {
        showAlert(e.message, "Error");
        if (settingsSection) settingsSection.classList.remove('hidden');
    }

    // Subscribe to live session updates for status badge synchronization
    subscribeLiveSession(() => {
        updateLiveIndicators();
    });

    // Check for Live Match URL parameters (?live=<id>&key=<key> or ?live=<id>)
    const liveParams = parseLiveUrlParams();
    if (liveParams.matchId) {
        if (liveParams.writeKey) {
            // Umpire resuming scoring session
            startLiveSession(gameState, liveParams.matchId, liveParams.writeKey);
        } else {
            // Spectator mode: Join match stream in read-only observation mode
            joinSpectatorSession(liveParams.matchId, (updatedState) => {
                setGameState(updatedState);
                if (gameState.matchStarted) {
                    if (settingsSection) settingsSection.classList.add('hidden');
                    const flipContainer = document.querySelector('.flip-container');
                    if (flipContainer) flipContainer.classList.remove('hidden');
                }
                updateUI();
            }, (status, errorMsg) => {
                if (status === 'ERROR') {
                    showAlert(errorMsg || 'Failed to connect to live match stream.', 'Live Stream Notice');
                }
            });
        }
    }
    
    updateUI();
}

function setupEventListeners(): void {
    if (startMatchBtn) startMatchBtn.addEventListener('click', startMatch);
    if (screenshotModeBtn) screenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    if (exitScreenshotModeBtn) exitScreenshotModeBtn.addEventListener('click', toggleScreenshotMode);
    if (endInningsBtn) endInningsBtn.addEventListener('click', triggerEndInningsModal);
    if (triggerEndInningsBtn) triggerEndInningsBtn.addEventListener('click', triggerEndInningsModal);
    if (confirmEndInningsBtn) confirmEndInningsBtn.addEventListener('click', executeEndInnings);
    
    // New Match button handlers
    if (newMatchBtn) newMatchBtn.addEventListener('click', handleNewMatchClick);
    if (matchOverNewMatchBtn) matchOverNewMatchBtn.addEventListener('click', handleNewMatchClick);
    if (confirmNewMatchBtn) confirmNewMatchBtn.addEventListener('click', executeNewMatch);
    if (resetMatchBtn) resetMatchBtn.addEventListener('click', resetMatch);

    if (shareMatchBtn) shareMatchBtn.addEventListener('click', shareMatch);
    if (liveStreamBtn) liveStreamBtn.addEventListener('click', triggerLiveModal);
    if (copySummaryTextBtn) copySummaryTextBtn.addEventListener('click', copyTextScorecard);
    if (feedbackBtn) feedbackBtn.addEventListener('click', triggerFeedbackModal);
    if (footerFeedbackLink) footerFeedbackLink.addEventListener('click', (e) => {
        e.preventDefault();
        triggerFeedbackModal();
    });
    if (feedbackTextInput) feedbackTextInput.addEventListener('input', updateFeedbackPreview);
    if (feedbackIncludeStateInput) feedbackIncludeStateInput.addEventListener('change', updateFeedbackPreview);
    if (copyFeedbackReportBtn) copyFeedbackReportBtn.addEventListener('click', handleCopyFeedbackReport);
    if (openGithubIssueBtn) openGithubIssueBtn.addEventListener('click', handleOpenGithubIssue);

    // Live Stream event handlers
    if (startLiveBtn) startLiveBtn.addEventListener('click', handleStartLiveStream);
    if (stopLiveBtn) stopLiveBtn.addEventListener('click', handleStopLiveStream);
    if (copySpectatorUrlBtn) copySpectatorUrlBtn.addEventListener('click', handleCopySpectatorUrl);
    if (copyUmpireUrlBtn) copyUmpireUrlBtn.addEventListener('click', handleCopyUmpireUrl);
    if (spectatorRefreshBtn) spectatorRefreshBtn.addEventListener('click', handleSpectatorManualRefresh);

    if (team1AddBtn) team1AddBtn.addEventListener('click', () => handleQuickAdd(1));
    if (team2AddBtn) team2AddBtn.addEventListener('click', () => handleQuickAdd(2));
    if (team1QuickAdd) team1QuickAdd.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleQuickAdd(1); });
    if (team2QuickAdd) team2QuickAdd.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleQuickAdd(2); });

    if (team1BulkBtn) {
        team1BulkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openBulkImportModal(1, team1BulkBtn);
        });
    }
    if (team2BulkBtn) {
        team2BulkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openBulkImportModal(2, team2BulkBtn);
        });
    }
    if (executeBulkImportBtn) {
        executeBulkImportBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleBulkImport();
        });
    }

    if (tossTeam1Btn) tossTeam1Btn.addEventListener('click', () => executeStartMatch(1));
    if (tossTeam2Btn) tossTeam2Btn.addEventListener('click', () => executeStartMatch(2));

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const t = btn.dataset.theme;
            if (t) setTheme(t as 'light' | 'dark' | 'green');
        });
    });

    runBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isSpectator()) return;
            const r = btn.dataset.runs;
            if (r !== undefined) addRuns(parseInt(r, 10));
        });
    });

    if (wideBtn) wideBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        triggerExtraRunsModal('wide');
    });

    if (noballBtn) noballBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        triggerExtraRunsModal('noball');
    });

    if (wicketBtn) wicketBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        addWicket();
    });

    if (runoutBtn) runoutBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        triggerRunOutModal();
    });

    if (runoutStrikerBtn) {
        runoutStrikerBtn.addEventListener('click', () => {
            pendingRunOutStriker = true;
            runoutStrikerBtn.classList.add('active');
            if (runoutNonstrikerBtn) runoutNonstrikerBtn.classList.remove('active');
        });
    }

    if (runoutNonstrikerBtn) {
        runoutNonstrikerBtn.addEventListener('click', () => {
            pendingRunOutStriker = false;
            runoutNonstrikerBtn.classList.add('active');
            if (runoutStrikerBtn) runoutStrikerBtn.classList.remove('active');
        });
    }

    // Run out run value buttons inside unified modal
    const runoutValBtns = document.querySelectorAll('.btn-runout-val') as NodeListOf<HTMLButtonElement>;
    runoutValBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isSpectator()) return;
            const r = parseInt(btn.dataset.runs || '0', 10);
            closeModal('runoutModal');
            finalizeDelivery('runout', r, 'byes');
        });
    });
    
    extraRunValBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (isSpectator()) return;
            extraRunValBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const v = btn.dataset.val;
            selectedExtraRuns = v ? parseInt(v, 10) : 0;

            if (selectedExtraRuns === 0) {
                closeModal('extraRunsModal');
                finalizeDelivery(currentDeliveryType!, 0, 'byes');
            } else if (currentDeliveryType === 'wide') {
                closeModal('extraRunsModal');
                finalizeDelivery('wide', selectedExtraRuns, 'byes');
            } else if (currentDeliveryType === 'bye') {
                closeModal('extraRunsModal');
                finalizeDelivery('bye', selectedExtraRuns, 'byes');
            } else if (currentDeliveryType === 'legbye') {
                closeModal('extraRunsModal');
                finalizeDelivery('legbye', selectedExtraRuns, 'byes');
            } else {
                if (accrualSection) accrualSection.classList.remove('hidden');
            }
        });
    });

    if (accrueBatsmanBtn) accrueBatsmanBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        closeModal('extraRunsModal');
        finalizeDelivery(currentDeliveryType!, selectedExtraRuns, 'batsman');
    });

    if (accrueByesBtn) accrueByesBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        closeModal('extraRunsModal');
        finalizeDelivery(currentDeliveryType!, selectedExtraRuns, 'byes');
    });

    if (byeBtn) byeBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        triggerExtraRunsModal('bye');
    });

    if (legbyeBtn) legbyeBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        triggerExtraRunsModal('legbye');
    });

    if (undoBtn) undoBtn.addEventListener('click', () => {
        if (isSpectator()) return;
        undoLastAction();
    });

    if (batsman1Select) batsman1Select.addEventListener('change', (e) => {
        if (isSpectator()) return;
        handleBatsmanChange(1, (e.target as HTMLSelectElement).value);
    });

    if (batsman2Select) batsman2Select.addEventListener('change', (e) => {
        if (isSpectator()) return;
        handleBatsmanChange(2, (e.target as HTMLSelectElement).value);
    });

    if (bowlerSelect) bowlerSelect.addEventListener('change', (e) => {
        if (isSpectator()) return;
        handleBowlerChange((e.target as HTMLSelectElement).value);
    });

    const completedOversSection = document.getElementById('completed-overs-section');
    if (completedOversSection) {
        completedOversSection.addEventListener('click', (e) => {
            const target = e.target as HTMLElement | null;
            if (!target) return;
            const header = target.closest('.completed-over-header') as HTMLElement | null;
            if (header) {
                const idxStr = header.dataset.index;
                if (!idxStr) return;
                const idx = parseInt(idxStr, 10);
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

function initSortable(): void {
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

export function renderRosters(): void {
    if (!team1RosterList || !team2RosterList) return;
    team1RosterList.innerHTML = '';
    team2RosterList.innerHTML = '';

    const createRosterItem = (name: string, isShared: boolean): HTMLElement => {
        const li = document.createElement('li');
        li.classList.add('list-group-item', 'roster-item');
        li.dataset.shared = isShared ? "true" : "false";
        li.innerHTML = `
            <div class="d-flex align-items-center flex-grow-1">
                <span class="drag-handle text-muted">☰</span>
                <span class="lineup-number me-2 text-muted fw-bold"></span>
                <span class="player-name">${name}</span>
            </div>
            <div>
                ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
                <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
            </div>
        `;
        const deleteBtn = li.querySelector('.delete-player-btn') as HTMLButtonElement | null;
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                li.remove();
                updateLineupNumbers();
            });
        }
        return li;
    };

    gameState.match.team1.players.forEach(p => {
        const isShared = gameState.match.team2.players.includes(p);
        team1RosterList.appendChild(createRosterItem(p, isShared));
    });
    gameState.match.team2.players.forEach(p => {
        const isShared = gameState.match.team1.players.includes(p);
        team2RosterList.appendChild(createRosterItem(p, isShared));
    });

    updateLineupNumbers();
}

function updateLineupNumbers(): void {
    if (team1RosterList) {
        team1RosterList.querySelectorAll('.roster-item').forEach((el, index) => {
            const numSpan = el.querySelector('.lineup-number') as HTMLElement | null;
            if (numSpan) numSpan.textContent = (index + 1).toString();
        });
    }
    if (team2RosterList) {
        team2RosterList.querySelectorAll('.roster-item').forEach((el, index) => {
            const numSpan = el.querySelector('.lineup-number') as HTMLElement | null;
            if (numSpan) numSpan.textContent = (index + 1).toString();
        });
    }
}

function handleQuickAdd(teamNum: number): void {
    if (isSpectator()) return;
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
    li.classList.add('list-group-item', 'roster-item');
    li.dataset.shared = isShared ? "true" : "false";
    li.innerHTML = `
        <div class="d-flex align-items-center flex-grow-1">
            <span class="drag-handle text-muted">☰</span>
            <span class="lineup-number me-2 text-muted fw-bold"></span>
            <span class="player-name">${name}</span>
        </div>
        <div>
            ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
            <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
        </div>
    `;
    const deleteBtn = li.querySelector('.delete-player-btn') as HTMLButtonElement | null;
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            if (isSpectator()) return;
            li.remove();
            updateLineupNumbers();
        });
    }

    roster.appendChild(li);
    input.value = '';
    updateLineupNumbers();
}

export function openBulkImportModal(teamNum: 1 | 2, triggerEl?: HTMLElement | null): void {
    if (isSpectator()) return;
    activeBulkImportTeam = teamNum;
    const label = document.getElementById('bulkImportModalLabel');
    if (label) {
        label.textContent = `Bulk Paste Roster - Team ${teamNum}`;
    }
    if (bulkImportTextarea) {
        bulkImportTextarea.value = '';
    }
    const trigger = triggerEl || (teamNum === 1 ? team1BulkBtn : team2BulkBtn);
    openModal('bulkImportModal', trigger);
}

export function handleBulkImport(): void {
    if (isSpectator()) return;
    if (!bulkImportTextarea) return;
    const text = bulkImportTextarea.value;
    const names = text.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    const roster = activeBulkImportTeam === 1 ? team1RosterList : team2RosterList;

    if (roster && names.length > 0) {
        names.forEach(name => {
            let isShared = false;
            let cleanName = name;
            if (name.endsWith(' 🔁')) {
                cleanName = name.replace(' 🔁', '').trim();
                isShared = true;
            }

            const li = document.createElement('li');
            li.classList.add('list-group-item', 'roster-item');
            li.dataset.shared = isShared ? "true" : "false";
            li.innerHTML = `
                <div class="d-flex align-items-center flex-grow-1">
                    <span class="drag-handle text-muted">☰</span>
                    <span class="lineup-number me-2 text-muted fw-bold"></span>
                    <span class="player-name">${cleanName}</span>
                </div>
                <div>
                    ${isShared ? '<span class="badge bg-info me-1">🔁</span>' : ''}
                    <button type="button" class="btn-close btn-sm p-1 delete-player-btn" aria-label="Delete"></button>
                </div>
            `;
            const deleteBtn = li.querySelector('.delete-player-btn') as HTMLButtonElement | null;
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    li.remove();
                    updateLineupNumbers();
                });
            }
            roster.appendChild(li);
        });

        bulkImportTextarea.value = '';
        updateLineupNumbers();
    }

    closeModal('bulkImportModal');
}

export function toggleScreenshotMode(): void {
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

export function parseBallLog(b: string): { runs: number; wicket: number } {
    let runs = 0;
    let wicket = 0;
    
    if (b.includes('W')) {
        wicket = 1;
    }
    
    if (b.startsWith('wd')) {
        const extra = b.includes('+') ? parseInt(b.split('+')[1], 10) : 0;
        runs = gameState.settings.widePenalty + (isNaN(extra) ? 0 : extra);
    } else if (b.startsWith('nb')) {
        const extra = b.includes('+') ? parseInt(b.split('+')[1], 10) : 0;
        runs = gameState.settings.noBallPenalty + (isNaN(extra) ? 0 : extra);
    } else if (b.startsWith('lb')) {
        runs = parseInt(b.replace('lb', ''), 10);
    } else if (b.includes('b') && !b.startsWith('n') && !b.startsWith('w')) {
        const part = b.split('+')[0];
        runs = parseInt(part.replace('b', ''), 10);
    } else if (b === 'W' || b === 'W-RO') {
        runs = 0;
    } else if (b.includes('+W-RO')) {
        const part = b.split('+')[0];
        if (part.endsWith('b')) {
            runs = parseInt(part.replace('b', ''), 10);
        } else {
            runs = parseInt(part, 10);
        }
    } else {
        runs = parseInt(b, 10);
    }
    
    return { runs, wicket };
}

export function generateSummaryView(): void {
    try {
        const summariesDiv = document.getElementById('innings-summaries');
        if (!summariesDiv) return;
        summariesDiv.innerHTML = '';

        const renderInningsSummary = (teamName: string, inningsData: any, inningsNumber: number): void => {
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
            batsmenTable.innerHTML = `<thead><tr><th>Batsman</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>`;
            const batsmenTbody = document.createElement('tbody');
            for (const name in inningsData.batsmen) {
                const b = inningsData.batsmen[name];
                const tr = document.createElement('tr');
                const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                tr.innerHTML = `<td>${name}</td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours || 0}</td><td>${b.sixes || 0}</td><td>${sr}</td>`;
                batsmenTbody.appendChild(tr);
            }
            batsmenTable.appendChild(batsmenTbody);
            inningsDiv.appendChild(batsmenTable);

            const bowlersTable = document.createElement('table');
            bowlersTable.classList.add('summary-table');
            bowlersTable.innerHTML = `<thead><tr><th>Bowler</th><th>Overs</th><th>Maidens</th><th>Runs</th><th>Wickets</th><th>Econ</th><th>Wides</th><th>No Balls</th></tr></thead>`;
            const bowlersTbody = document.createElement('tbody');
            for (const name in inningsData.bowlers) {
                const b = inningsData.bowlers[name];
                const tr = document.createElement('tr');
                const bOvers = Math.floor(b.balls / 6);
                const bBalls = b.balls % 6;
                const bWides = b.wides || 0;
                const bNoBalls = b.noballs || 0;
                const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
                tr.innerHTML = `<td>${name}</td><td>${bOvers}.${bBalls}</td><td>${b.maidens || 0}</td><td>${b.runs}</td><td>${b.wickets}</td><td>${econ}</td><td>${bWides}</td><td>${bNoBalls}</td>`;
                bowlersTbody.appendChild(tr);
            }
            bowlersTable.appendChild(bowlersTbody);
            inningsDiv.appendChild(bowlersTable);

            const extrasP = document.createElement('p');
            const ext = inningsData.extras;
            const totalExtras = ext.wides + ext.noballs + ext.byes + ext.legbyes;
            extrasP.innerHTML = `<strong>Extras:</strong> ${totalExtras} (W: ${ext.wides}, NB: ${ext.noballs}, B: ${ext.byes}, LB: ${ext.legbyes})`;
            inningsDiv.appendChild(extrasP);

            if (inningsData.fow && inningsData.fow.length > 0) {
                const fowDiv = document.createElement('div');
                fowDiv.classList.add('fow-container');
                const fowList = inningsData.fow.map((f: any) => `${f.wicket}-${f.score} (${f.batsman}, ${f.overs} ov)`).join(', ');
                fowDiv.innerHTML = `<strong>Fall of Wickets:</strong> ${fowList}`;
                inningsDiv.appendChild(fowDiv);
            }

            // Over Log Table
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
                overLogHeading.style.fontSize = "0.95rem";
                overLogHeading.style.marginTop = "0.8rem";
                overLogHeading.style.borderBottom = "1px solid var(--border)";
                overLogHeading.style.paddingBottom = "0.25rem";
                inningsDiv.appendChild(overLogHeading);

                const overLogTable = document.createElement('table');
                overLogTable.classList.add('summary-table');
                overLogTable.innerHTML = `<thead><tr><th>Over</th><th>Bowler</th><th>Runs</th><th>Wkts</th><th>Deliveries</th></tr></thead>`;
                const overLogTbody = document.createElement('tbody');
                
                displayOvers.forEach((over: any, idx: number) => {
                    let overRuns = 0;
                    let overWickets = 0;
                    over.balls.forEach((b: string) => {
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
        };

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

export function setTheme(theme: 'light' | 'dark' | 'green'): void {
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

function populateDropdown(selectElement: HTMLSelectElement, playerList: string[], selectedValue: string | null, promptText: string, filterFn?: (player: string) => boolean): void {
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

export function updateUI(): void {
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
            
            const crr = live.balls > 0 ? (live.score / (live.balls / 6)) : 0;
            const rrr = remainingBalls > 0 ? (runsNeeded / (remainingBalls / 6)) : 0;
            
            targetDisplay.textContent = `Target: ${target} | CRR: ${crr.toFixed(2)} | RRR: ${rrr.toFixed(2)}`;
        } else {
            targetDisplay.classList.add('hidden');
        }
    }

    if (screenshotModeBtn) screenshotModeBtn.disabled = !gameState.matchStarted;
    if (resetMatchBtn) resetMatchBtn.disabled = !gameState.matchStarted;
    if (newMatchBtn) newMatchBtn.disabled = false;

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
    if (extrasTotalDisplay) extrasTotalDisplay.textContent = totalExtras.toString();
    if (widesDisplay) widesDisplay.textContent = ext.wides.toString();
    if (noballsDisplay) noballsDisplay.textContent = ext.noballs.toString();
    if (byesDisplay) byesDisplay.textContent = ext.byes.toString();
    if (legbyesDisplay) legbyesDisplay.textContent = ext.legbyes.toString();

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

    // Match Status description & Match Over Banner
    if (matchStatusDisplay) {
        if (gameState.match.matchOver) {
            let winText = "Match Over!";
            if (isChasing && target !== null) {
                if (live.score >= target) {
                    const wicketsRemaining = Math.max(1, maxWickets - live.wickets);
                    const wicketWord = wicketsRemaining === 1 ? 'wicket' : 'wickets';
                    winText = `Match Over! ${battingTeam.name} won by ${wicketsRemaining} ${wicketWord}!`;
                } else if (live.score === target - 1) {
                    winText = `Match Over! Match Tied!`;
                } else {
                    winText = `Match Over! ${bowlingTeam.name} won by ${target - 1 - live.score} runs!`;
                }
            }
            matchStatusDisplay.textContent = winText;
            if (matchOverBanner) {
                matchOverBanner.classList.remove('d-none');
                if (matchOverText) matchOverText.textContent = winText;
            }
        } else {
            matchStatusDisplay.textContent = `Innings ${gameState.match.currentInnings} | Batting: ${battingTeam ? battingTeam.name : 'Unknown'}`;
            if (matchOverBanner) matchOverBanner.classList.add('d-none');
        }
    }

    // Render Completed Overs Collapsible List
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
                
                let overRuns = 0;
                let overWickets = 0;
                over.balls.forEach(b => {
                    const parsed = parseBallLog(b);
                    overRuns += parsed.runs;
                    overWickets += parsed.wicket;
                });
                
                const headerDiv = document.createElement('div');
                headerDiv.classList.add('completed-over-header');
                headerDiv.dataset.index = idx.toString();
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
    updateLiveIndicators();
    handleUIEvents();
}

function checkControlsState(): void {
    if (!controlsSection) return;
    const live = gameState.match.liveInnings;
    const controls = controlsSection.querySelectorAll('button:not(#undo-btn)') as NodeListOf<HTMLButtonElement>;
    const session = getLiveSession();

    // In spectator mode, lock and hide all scoring controls
    if (session.isLive && session.role === 'SPECTATOR') {
        controls.forEach(btn => btn.disabled = true);
        if (undoBtn) undoBtn.disabled = true;
        if (endInningsBtn) endInningsBtn.disabled = true;
        if (triggerEndInningsBtn) triggerEndInningsBtn.disabled = true;
        if (resetMatchBtn) resetMatchBtn.disabled = true;
        if (newMatchBtn) newMatchBtn.disabled = true;
        if (startMatchBtn) startMatchBtn.disabled = true;
        if (batsman1Select) batsman1Select.disabled = true;
        if (batsman2Select) batsman2Select.disabled = true;
        if (bowlerSelect) bowlerSelect.disabled = true;
        if (selectionWarning) selectionWarning.classList.add('d-none');
        if (appContainer) appContainer.classList.add('spectator-locked');
        return;
    } else {
        if (appContainer) appContainer.classList.remove('spectator-locked');
        if (newMatchBtn) newMatchBtn.disabled = false;
        if (batsman1Select) batsman1Select.disabled = false;
        if (batsman2Select) batsman2Select.disabled = false;
        if (bowlerSelect) bowlerSelect.disabled = false;
    }
    
    if (gameState.match.matchOver) {
        controls.forEach(btn => btn.disabled = true);
        if (triggerEndInningsBtn) triggerEndInningsBtn.disabled = true;
        if (selectionWarning) selectionWarning.classList.add('d-none');
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

    if (selectionWarning) {
        if (needsSelection) {
            selectionWarning.classList.remove('d-none');
        } else {
            selectionWarning.classList.add('d-none');
        }
    }

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

export function showAlert(message: string, title = "Alert", callback: (() => void) | null = null): void {
    const messageEl = document.getElementById('alert-message') as HTMLElement | null;
    const labelEl = document.getElementById('alertDialogModalLabel') as HTMLElement | null;
    
    if (messageEl) messageEl.textContent = message;
    if (labelEl) labelEl.textContent = title;
    
    alertCallback = callback;
    
    if (typeof window !== 'undefined' && (window as any).__TEST_ENV__) {
        alert(message);
        if (callback) callback();
        return;
    }
    
    const modalEl = document.getElementById('alertDialogModal');
    if (modalEl) {
        if (callback) {
            registerModalHiddenCallback(modalEl, callback);
        }
        openModal(modalEl);
    } else {
        alert(message);
        if (callback) callback();
    }
}

export function triggerRunOutModal(): void {
    if (isSpectator() || gameState.match.matchOver) return;
    const live = gameState.match.liveInnings;
    
    const striker = (live.currentBatsman1 && live.batsmen[live.currentBatsman1]?.active)
        ? live.currentBatsman1
        : (live.currentBatsman2 || live.currentBatsman1 || '');
    const nonStriker = striker === live.currentBatsman1 ? live.currentBatsman2 : live.currentBatsman1;
    
    const strikerBtn = document.getElementById('runout-striker-btn') as HTMLButtonElement | null;
    const nonStrikerBtn = document.getElementById('runout-nonstriker-btn') as HTMLButtonElement | null;
    
    if (strikerBtn) {
        strikerBtn.textContent = `Striker: ${striker}`;
        strikerBtn.classList.add('active');
    }
    if (nonStrikerBtn) {
        nonStrikerBtn.textContent = `Non-Striker: ${nonStriker}`;
        nonStrikerBtn.classList.remove('active');
    }
    pendingRunOutStriker = true;
    
    const modalEl = document.getElementById('runoutModal');
    if (typeof window !== 'undefined' && (window as any).__TEST_ENV__ && typeof (globalThis as any).confirm === 'function') {
        const isStriker = (globalThis as any).confirm(`Who was run out?\n[OK] Striker: ${striker}\n[Cancel] Non-Striker: ${nonStriker}`);
        processRunOut(isStriker);
    } else if (modalEl) {
        openModal(modalEl, runoutBtn);
    } else if (typeof confirm === 'function') {
        const isStriker = confirm(`Who was run out?\n[OK] Striker: ${striker}\n[Cancel] Non-Striker: ${nonStriker}`);
        processRunOut(isStriker);
    }
}

export function triggerExtraRunsModal(deliveryType: string): void {
    if (isSpectator() || gameState.match.matchOver) return;
    currentDeliveryType = deliveryType;
    selectedExtraRuns = 0;
    
    extraRunValBtns.forEach(b => b.classList.remove('active'));
    if (accrualSection) accrualSection.classList.add('hidden');
    
    const wideLabel = document.getElementById('extraRunsModalLabel') as HTMLElement | null;
    const promptLabel = document.getElementById('extra-runs-prompt') as HTMLElement | null;
    if (wideLabel) {
        if (deliveryType === 'legbye') {
            wideLabel.textContent = "Leg Bye Details";
            if (promptLabel) promptLabel.textContent = "Additional runs scored on leg bye (0 for standard 1 leg bye):";
        } else if (deliveryType === 'bye') {
            wideLabel.textContent = "Bye Details";
            if (promptLabel) promptLabel.textContent = "Additional runs scored on bye (0 for standard 1 bye):";
        } else if (deliveryType === 'wide') {
            wideLabel.textContent = "Wide Ball Details";
            if (promptLabel) promptLabel.textContent = "Additional runs scored on wide (0 for standard 1 wide):";
        } else if (deliveryType === 'noball') {
            wideLabel.textContent = "No Ball Details";
            if (promptLabel) promptLabel.textContent = "Additional runs scored on no ball:";
        } else {
            wideLabel.textContent = `Runs scored on ${deliveryType.toUpperCase()}?`;
        }
    }

    const accrueBatsmanBtnLocal = document.getElementById('accrue-batsman-btn') as HTMLButtonElement | null;
    if (accrueBatsmanBtnLocal) {
        if (deliveryType === 'wide' || deliveryType === 'bye' || deliveryType === 'legbye') {
            accrueBatsmanBtnLocal.classList.add('hidden');
        } else {
            accrueBatsmanBtnLocal.classList.remove('hidden');
        }
    }
    
    const modalEl = document.getElementById('extraRunsModal');
    if (typeof window !== 'undefined' && (window as any).__TEST_ENV__) {
        if (typeof (globalThis as any).mockExtraRuns !== 'undefined') {
            selectedExtraRuns = (globalThis as any).mockExtraRuns;
        }
        const accrueTo = (globalThis as any).mockAccrueTo || 'byes';
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, accrueTo);
    } else if (modalEl) {
        openModal(modalEl);
    } else {
        finalizeDelivery(currentDeliveryType, selectedExtraRuns, 'byes');
    }
}

export function triggerEndInningsModal(): void {
    if (isSpectator() || !gameState.matchStarted || gameState.match.matchOver) return;

    if (typeof window !== 'undefined' && (window as any).__TEST_ENV__) {
        const ok = confirm("Are you sure you want to conclude this innings early?");
        if (ok) executeEndInnings();
        return;
    }

    const modalEl = document.getElementById('endInningsModal');
    if (modalEl) {
        openModal(modalEl, endInningsBtn || triggerEndInningsBtn);
    } else {
        const ok = confirm("Are you sure you want to conclude this innings early?");
        if (ok) executeEndInnings();
    }
}

export function executeEndInnings(): void {
    if (isSpectator()) return;
    closeModal('endInningsModal');
    dispatch({ type: 'FORCE_END_INNINGS' });
    updateUI();
}

/**
 * Initiates the New Match user flow.
 */
export function handleNewMatchClick(): void {
    if (isSpectator()) return;
    if (gameState.matchStarted && !gameState.match.matchOver) {
        openModal('newMatchModal', newMatchBtn);
    } else {
        resetMatch();
    }
}

export function executeNewMatch(): void {
    if (isSpectator()) return;
    closeModal('newMatchModal');
    resetMatch();
}

export function generateTextSummary(): string {
    const match = gameState.match;
    if (!match) return "";

    const status = (document.getElementById('match-status')?.textContent || "Match In Progress").trim();
    let text = `🏏 CRICKET SCORECARD\n`;
    text += `----------------------------------------\n`;
    text += `Status: ${status}\n\n`;

    const formatInnings = (teamName: string, inn: any, num: number) => {
        const overs = `${Math.floor(inn.balls / 6)}.${inn.balls % 6}`;
        let res = `=== Innings ${num}: ${teamName} (${inn.score}/${inn.wickets} in ${overs} ov) ===\n`;
        res += `BATSMEN:\n`;
        for (const name in inn.batsmen) {
            const b = inn.batsmen[name];
            const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
            const isNotOut = !inn.outBatsmen.includes(name) && (name === inn.currentBatsman1 || name === inn.currentBatsman2 || inn.balls === 0);
            res += `  - ${name}${isNotOut ? '*' : ''}: ${b.runs} (${b.balls}b, ${b.fours || 0}x4, ${b.sixes || 0}x6, SR: ${sr})\n`;
        }
        const ext = inn.extras || { wides: 0, noballs: 0, byes: 0, legbyes: 0 };
        const totalExt = ext.wides + ext.noballs + ext.byes + ext.legbyes;
        res += `EXTRAS: ${totalExt} (wd: ${ext.wides}, nb: ${ext.noballs}, b: ${ext.byes}, lb: ${ext.legbyes})\n`;

        if (inn.fow && inn.fow.length > 0) {
            const fowStr = inn.fow.map((f: any) => `${f.wicket}-${f.score} (${f.batsman}, ${f.overs} ov)`).join(', ');
            res += `FALL OF WICKETS: ${fowStr}\n`;
        }

        res += `\nBOWLERS:\n`;
        for (const name in inn.bowlers) {
            const b = inn.bowlers[name];
            const bOvers = `${Math.floor(b.balls / 6)}.${b.balls % 6}`;
            const econ = b.balls > 0 ? (b.runs / (b.balls / 6)).toFixed(2) : '0.00';
            res += `  - ${name}: ${bOvers}-${b.maidens || 0}-${b.runs}-${b.wickets} (Econ: ${econ}, wd: ${b.wides || 0}, nb: ${b.noballs || 0})\n`;
        }
        res += `\n`;
        return res;
    };

    match.team1.innings.forEach(inn => {
        text += formatInnings(match.team1.name, inn, 1);
    });
    match.team2.innings.forEach(inn => {
        text += formatInnings(match.team2.name, inn, 2);
    });

    if (!match.matchOver) {
        const battingTeam = match.currentBattingTeam === 1 ? match.team1 : match.team2;
        text += formatInnings(battingTeam.name, match.liveInnings, match.currentInnings);
    }

    text += `----------------------------------------\n`;
    text += `Generated via Cricket Scorecard PWA\n`;
    return text;
}

export function copyTextScorecard(): void {
    const text = generateTextSummary();
    if (!navigator.clipboard) {
        showAlert(text, "Scorecard Text");
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showAlert("Scorecard summary copied to clipboard!", "Scorecard Text");
    }).catch(err => {
        console.error("Failed to copy summary text:", err);
        showAlert(text, "Scorecard Text");
    });
}

export function triggerFeedbackModal(): void {
    if (feedbackToastEl) feedbackToastEl.classList.add('d-none');
    updateFeedbackPreview();
    openModal('feedbackModal', feedbackBtn);
}

export function updateFeedbackPreview(): void {
    if (!feedbackPreviewEl) return;
    const userFeedback = feedbackTextInput ? feedbackTextInput.value : '';
    const includeState = feedbackIncludeStateInput ? feedbackIncludeStateInput.checked : true;
    const markdown = generateBugReportMarkdown({
        userFeedback,
        includeState,
        appVersion: 'v20260908-004'
    });
    feedbackPreviewEl.textContent = markdown;
}

export async function handleCopyFeedbackReport(): Promise<void> {
    const userFeedback = feedbackTextInput ? feedbackTextInput.value : '';
    const includeState = feedbackIncludeStateInput ? feedbackIncludeStateInput.checked : true;
    const markdown = generateBugReportMarkdown({
        userFeedback,
        includeState,
        appVersion: 'v20260908-004'
    });

    const success = await copyBugReportToClipboard(markdown);
    if (success) {
        if (feedbackToastEl) {
            feedbackToastEl.classList.remove('d-none');
        }
    } else {
        showAlert(markdown, "Bug Report Markdown");
    }
}

export function handleOpenGithubIssue(): void {
    const userFeedback = feedbackTextInput ? feedbackTextInput.value : '';
    const includeState = feedbackIncludeStateInput ? feedbackIncludeStateInput.checked : true;
    const markdown = generateBugReportMarkdown({
        userFeedback,
        includeState,
        appVersion: 'v20260908-004'
    });

    const title = userFeedback ? `Bug: ${userFeedback.substring(0, 50)}...` : undefined;
    const url = getGitHubIssueUrl(markdown, title);
    if (typeof window !== 'undefined') {
        window.open(url, '_blank');
    }
}

export function processRunOut(isStriker: boolean): void {
    if (isSpectator() || gameState.match.matchOver) return;
    closeModal('runoutModal');
    pendingRunOutStriker = isStriker;
    triggerExtraRunsModal('runout');
}

export function handleBatsmanChange(batsmanNumber: 1 | 2, newName: string): void {
    if (isSpectator()) return;
    dispatch({ type: 'CHANGE_BATSMAN', payload: { slot: batsmanNumber, name: newName } });
    updateUI();
}

export function handleBowlerChange(newName: string): void {
    if (isSpectator()) return;
    dispatch({ type: 'CHANGE_BOWLER', payload: { name: newName } });
    updateUI();
}

export function startMatch(): void {
    if (isSpectator()) return;
    if (!oversPerInningsInput || !maxOversPerBowlerInput || !allowSingleBatsmanInput || !enableLegByesInput) return;

    const settings = {
        totalInnings: 1,
        oversPerInnings: parseInt(oversPerInningsInput.value, 10),
        maxOversPerBowler: parseInt(maxOversPerBowlerInput.value, 10),
        widePenalty: 1,
        noBallPenalty: 1,
        allowSingleBatsman: allowSingleBatsmanInput.checked,
        enableLegByes: enableLegByesInput.checked
    };

    let t1Names: string[] = [];
    let t2Names: string[] = [];

    if (team1RosterList && team2RosterList) {
        const t1Shared: string[] = [];
        const t2Shared: string[] = [];

        team1RosterList.querySelectorAll('.roster-item').forEach(el => {
            const nameSpan = el.querySelector('.player-name') as HTMLElement | null;
            if (!nameSpan) return;
            const name = nameSpan.textContent!.trim();
            t1Names.push(name);
            if ((el as HTMLElement).dataset.shared === "true") t1Shared.push(name);
        });

        team2RosterList.querySelectorAll('.roster-item').forEach(el => {
            const nameSpan = el.querySelector('.player-name') as HTMLElement | null;
            if (!nameSpan) return;
            const name = nameSpan.textContent!.trim();
            t2Names.push(name);
            if ((el as HTMLElement).dataset.shared === "true") t2Shared.push(name);
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

    if (tossTeam1Btn) tossTeam1Btn.textContent = `${gameState.match.team1.name || 'Team 1'} Batting`;
    if (tossTeam2Btn) tossTeam2Btn.textContent = `${gameState.match.team2.name || 'Team 2'} Batting`;

    const tossEl = document.getElementById('tossModal');
    if (typeof window !== 'undefined' && (window as any).__TEST_ENV__) {
        executeStartMatch(1);
    } else if (tossEl) {
        openModal(tossEl, startMatchBtn);
    } else {
        executeStartMatch(1);
    }
}

export function executeStartMatch(battingTeamNum: 1 | 2): void {
    if (isSpectator()) return;
    closeModal('tossModal');

    dispatch({ type: 'CHOOSE_TOSS_BATTING', payload: { battingTeamNum } });

    if (settingsSection) settingsSection.classList.add('hidden');
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) flipContainer.classList.remove('hidden');

    updateUI();
}

export function resetMatch(): void {
    if (isSpectator()) return;
    clearState();
    dispatch({ type: 'RESET_MATCH' });
    expandedOvers = [];
    pendingRunOutStriker = true;
    currentDeliveryType = null;
    selectedExtraRuns = 0;
    
    if (settingsSection) settingsSection.classList.remove('hidden');
    
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer) {
        flipContainer.classList.add('hidden');
        flipContainer.classList.remove('flipped');
    }
    document.body.classList.remove('screenshot-mode');
    
    if (oversPerInningsInput) oversPerInningsInput.value = gameState.settings.oversPerInnings.toString();
    if (maxOversPerBowlerInput) maxOversPerBowlerInput.value = gameState.settings.maxOversPerBowler.toString();
    if (allowSingleBatsmanInput) allowSingleBatsmanInput.checked = gameState.settings.allowSingleBatsman;
    if (enableLegByesInput) enableLegByesInput.checked = gameState.settings.enableLegByes;
    
    renderRosters();
    updateUI();
}

export function shareMatch(): void {
    const url = generatePermalink(gameState);
    
    if (!navigator.clipboard) {
        showAlert("Setting URL in address bar.", "Share Match");
        if (typeof window !== 'undefined') window.history.pushState({}, '', url);
        return;
    }

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

export function undoLastAction(): void {
    if (isSpectator()) return;
    dispatch({ type: 'UNDO' });
    const flipContainer = document.querySelector('.flip-container');
    if (flipContainer && flipContainer.classList.contains('flipped') && !gameState.match.matchOver) {
        flipContainer.classList.remove('flipped');
        document.body.classList.remove('screenshot-mode');
    }
    updateUI();
}

export function addRuns(runs: number): void {
    if (isSpectator()) return;
    dispatch({ type: 'ADD_RUNS', payload: { runs } });
    updateUI();
}

export function addLegBye(): void {
    if (isSpectator()) return;
    dispatch({ type: 'ADD_LEG_BYE' });
    updateUI();
}

export function addWicket(): void {
    if (isSpectator()) return;
    dispatch({ type: 'ADD_WICKET' });
    updateUI();
}

export function finalizeDelivery(type: string, extraRuns: number, accrueTo: string): void {
    if (isSpectator()) return;
    dispatch({ type: 'FINALIZE_DELIVERY', payload: { type, extraRuns, accrueTo, pendingRunOutStriker } });
    updateUI();
}

function handleUIEvents(): void {
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

export function updateLiveIndicators(): void {
    const session = getLiveSession();
    if (liveSyncBadge) {
        if (session.isLive) {
            liveSyncBadge.classList.remove('d-none');
            if (session.role === 'SPECTATOR') {
                liveSyncBadge.textContent = '[SPECTATOR MODE]';
                liveSyncBadge.className = 'badge status-pill live-synced';
            } else if (session.status === 'SYNCED') {
                liveSyncBadge.textContent = '[LIVE - SYNCED]';
                liveSyncBadge.className = 'badge status-pill live-synced';
            } else if (session.status === 'SYNCING') {
                liveSyncBadge.textContent = '[SYNCING...]';
                liveSyncBadge.className = 'badge status-pill';
            } else if (session.status === 'OFFLINE_RETRY') {
                liveSyncBadge.textContent = '[OFFLINE - RETRYING]';
                liveSyncBadge.className = 'badge status-pill';
            } else {
                liveSyncBadge.textContent = `[${session.status}]`;
                liveSyncBadge.className = 'badge status-pill';
            }
        } else {
            liveSyncBadge.classList.add('d-none');
        }
    }

    if (spectatorBanner) {
        if (session.isLive && session.role === 'SPECTATOR') {
            spectatorBanner.classList.remove('d-none');
            if (spectatorLastUpdate && session.lastSyncedAt) {
                const dateObj = new Date(session.lastSyncedAt);
                spectatorLastUpdate.textContent = `Updated: ${dateObj.toLocaleTimeString()}`;
            }
        } else {
            spectatorBanner.classList.add('d-none');
        }
    }
}

export function triggerLiveModal(): void {
    const session = getLiveSession();
    if (session.isLive && session.matchId) {
        if (liveInactiveSection) liveInactiveSection.classList.add('d-none');
        if (liveActiveSection) liveActiveSection.classList.remove('d-none');
        if (spectatorUrlInput) spectatorUrlInput.value = getSpectatorUrl(session.matchId);
        if (umpireUrlInput) umpireUrlInput.value = session.writeKey ? getUmpireUrl(session.matchId, session.writeKey) : '(Spectator Link Active)';
        if (modalLiveSeq) modalLiveSeq.textContent = `Packet #${session.seq}`;
        if (modalLiveStatusBadge) {
            modalLiveStatusBadge.textContent = `[${session.status}]`;
            modalLiveStatusBadge.className = session.status === 'SYNCED' ? 'badge status-pill live-synced' : 'badge status-pill';
        }
    } else {
        if (liveInactiveSection) liveInactiveSection.classList.remove('d-none');
        if (liveActiveSection) liveActiveSection.classList.add('d-none');
    }

    if (liveModalToast) liveModalToast.classList.add('d-none');
    openModal('liveModal', liveStreamBtn);
}

export function handleStartLiveStream(): void {
    const res = startLiveSession(gameState);
    if (liveInactiveSection) liveInactiveSection.classList.add('d-none');
    if (liveActiveSection) liveActiveSection.classList.remove('d-none');
    if (spectatorUrlInput) spectatorUrlInput.value = res.spectatorUrl;
    if (umpireUrlInput) umpireUrlInput.value = res.umpireUrl;
    if (modalLiveSeq) modalLiveSeq.textContent = 'Packet #1';
    if (modalLiveStatusBadge) {
        modalLiveStatusBadge.textContent = '[SYNCED]';
        modalLiveStatusBadge.className = 'badge status-pill live-synced';
    }
    updateUI();
}

export function handleStopLiveStream(): void {
    stopLiveSync();
    if (liveInactiveSection) liveInactiveSection.classList.remove('d-none');
    if (liveActiveSection) liveActiveSection.classList.add('d-none');
    updateUI();
}

export function handleCopySpectatorUrl(): void {
    const url = spectatorUrlInput ? spectatorUrlInput.value : '';
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
        if (liveModalToast) {
            liveModalToast.textContent = '✓ Spectator link copied to clipboard!';
            liveModalToast.classList.remove('d-none');
        }
    }).catch((err: any) => {
        console.error('Failed to copy spectator link:', {
            errorType: err?.name || 'Error',
            message: err?.message || String(err)
        });
    });
}

export function handleCopyUmpireUrl(): void {
    const url = umpireUrlInput ? umpireUrlInput.value : '';
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => {
        if (liveModalToast) {
            liveModalToast.textContent = '✓ Umpire link copied to clipboard!';
            liveModalToast.classList.remove('d-none');
        }
    }).catch((err: any) => {
        console.error('Failed to copy umpire link:', {
            errorType: err?.name || 'Error',
            message: err?.message || String(err)
        });
    });
}

export function handleSpectatorManualRefresh(): void {
    const session = getLiveSession();
    if (session.matchId) {
        if (spectatorLastUpdate) spectatorLastUpdate.textContent = 'Refreshing...';
        joinSpectatorSession(session.matchId, (updatedState) => {
            setGameState(updatedState);
            updateUI();
        });
    }
}

export { openReleaseNotesModal, initReleaseNotesModal };
