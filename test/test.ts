// test.ts (Runner)

// Mock DOM with state retention
const elements: Record<string, any> = {};
(global as any).elements = elements;

function createClassListMock(elem: any): any {
    return {
        add: function(...classes: string[]) { classes.forEach(c => elem.classes.add(c)); },
        remove: function(...classes: string[]) { classes.forEach(c => elem.classes.delete(c)); },
        contains: function(c: string) { return elem.classes.has(c); }
    };
}

function createMockElement(id?: string): any {
    const attributes: Record<string, string> = {};
    const elem: any = {
        id: id || '',
        value: '',
        textContent: '',
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val: string) {
            this._innerHTML = val;
            if (val === '') {
                this.appendedChildren = [];
            }
        },
        classes: new Set<string>(),
        appendedChildren: [] as any[],
        children: [] as any[],
        dataset: {},
        style: {},
        isConnected: true,
        appendChild: function(child: any) {
            this.appendedChildren.push(child);
            this.children.push(child);
        },
        remove: function() {},
        setAttribute: function(k: string, v: string) {
            attributes[k] = v;
        },
        getAttribute: function(k: string) {
            return attributes[k] !== undefined ? attributes[k] : null;
        },
        removeAttribute: function(k: string) {
            delete attributes[k];
        },
        contains: function(target: any) {
            return this.appendedChildren.includes(target) || this.children.includes(target) || this === target;
        },
        closest: function(selector: string) {
            return null;
        },
        focus: function() {},
        blur: function() {},
        addEventListener: function() {},
        querySelector: function(selector: string) {
            return createMockElement();
        },
        querySelectorAll: function(selector: string) {
            if (selector === '.roster-item') return this.children;
            return [];
        },
        parentElement: {
            classList: {
                add: () => {},
                remove: () => {},
                contains: () => false
            }
        }
    };
    elem.classList = createClassListMock(elem);
    return elem;
}

(global as any).document = {
    createElement: function(tagName: string) {
        return createMockElement();
    },
    getElementById: function(id: string) {
        if (!elements[id]) {
            elements[id] = createMockElement(id);
        }
        return elements[id];
    },

    querySelector: function(selector: string) {
        if (selector === '.flip-container') {
             if (!elements['flip-container']) {
                 elements['flip-container'] = createMockElement('flip-container');
             }
             return elements['flip-container'];
        }
        return createMockElement();
    },
    querySelectorAll: function(selector: string) {
        return [];
    },
    documentElement: {
        setAttribute: () => {},
        getAttribute: () => 'light'
    },
    body: {
        classList: {
            add: function(c: string) { (global as any).document.body.classes.add(c); },
            remove: function(c: string) { (global as any).document.body.classes.delete(c); },
            contains: function(c: string) { return (global as any).document.body.classes.has(c); }
        },
        classes: new Set<string>(),
        appendChild: function(c: any) {},
        contains: function(t: any) { return true; }
    }
};

(global as any).window = {
    location: { search: '', pathname: '', origin: '' },
    history: { replaceState: () => {}, pushState: () => {} },
    addEventListener: () => {},
    __TEST_ENV__: true
};

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
    getItem: (key: string) => localStorageStore[key] !== undefined ? localStorageStore[key] : null,
    setItem: (key: string, val: string) => { localStorageStore[key] = String(val); },
    removeItem: (key: string) => { delete localStorageStore[key]; },
    clear: () => { Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]); }
};
Object.defineProperty(globalThis, 'localStorage', {
    get: () => mockLocalStorage,
    configurable: true
});
(global as any).window.localStorage = mockLocalStorage;

Object.defineProperty(global, 'navigator', {
    value: {
        clipboard: { writeText: () => Promise.resolve() },
        serviceWorker: { register: () => Promise.resolve() }
    },
    configurable: true,
    writable: true
});

(global as any).alert = () => {};

// Load ES modules dynamically and set up globals
async function loadModulesAndRun() {
    const stateMod = await import('../src/state.js');
    const storageMod = await import('../src/storage.js');
    const uiMod = await import('../src/ui.js');
    const feedbackMod = await import('../src/feedback.js');

    // Make gameState global
    (global as any).gameState = stateMod.gameState;
    (global as any).setGameState = stateMod.setGameState;
    (global as any).updateUI = uiMod.updateUI;

    // Bind functions to global scope for tests
    (global as any).addRuns = uiMod.addRuns;
    (global as any).addLegBye = uiMod.addLegBye;
    (global as any).addWicket = uiMod.addWicket;
    (global as any).finalizeDelivery = uiMod.finalizeDelivery;
    (global as any).endInnings = () => {
        stateMod.dispatch({ type: 'FORCE_END_INNINGS' });
        stateMod.dispatch({ type: 'START_NEXT_INNINGS' });
    };

    (global as any).loadFromLocalStorage = () => {
        try {
            const loaded = storageMod.loadState();
            if (loaded) {
                stateMod.setGameState(loaded);
            }
        } catch (e: any) {
            (global as any).alert(e.message);
        }
    };
    (global as any).saveToLocalStorage = () => storageMod.saveState(stateMod.gameState);
    (global as any).minifyState = storageMod.minifyState;
    (global as any).unminifyState = storageMod.unminifyState;
    (global as any).healInningsOvers = storageMod.healInningsOvers;
    (global as any).generatePermalink = storageMod.generatePermalink;
    (global as any).lzCompressToEncodedURIComponent = storageMod.lzCompressToEncodedURIComponent;
    (global as any).lzDecompressFromEncodedURIComponent = storageMod.lzDecompressFromEncodedURIComponent;
    (global as any).archiveCompletedMatch = storageMod.archiveCompletedMatch;
    (global as any).getCompletedMatches = storageMod.getCompletedMatches;
    (global as any).clearState = storageMod.clearState;

    (global as any).resetMatch = uiMod.resetMatch;
    (global as any).startMatch = uiMod.startMatch;
    (global as any).startNextInnings = uiMod.startNextInnings;
    (global as any).handleNewMatchClick = uiMod.handleNewMatchClick;
    (global as any).executeNewMatch = uiMod.executeNewMatch;
    (global as any).isSpectator = uiMod.isSpectator;
    (global as any).generateSummaryView = uiMod.generateSummaryView;
    (global as any).parseBallLog = uiMod.parseBallLog;
    (global as any).toggleScreenshotMode = uiMod.toggleScreenshotMode;
    (global as any).triggerExtraRunsModal = uiMod.triggerExtraRunsModal;
    (global as any).triggerRunOutModal = uiMod.triggerRunOutModal;
    (global as any).processRunOut = uiMod.processRunOut;
    (global as any).updateUI = uiMod.updateUI;
    (global as any).handleBatsmanChange = uiMod.handleBatsmanChange;
    (global as any).handleBowlerChange = uiMod.handleBowlerChange;
    (global as any).generateTextSummary = uiMod.generateTextSummary;
    (global as any).executeEndInnings = uiMod.executeEndInnings;
    (global as any).executeStartMatch = uiMod.executeStartMatch;
    (global as any).openBulkImportModal = uiMod.openBulkImportModal;
    (global as any).handleBulkImport = uiMod.handleBulkImport;
    (global as any).dispatch = stateMod.dispatch;

    const modalMod = await import('../src/modal.js');
    (global as any).openModal = modalMod.openModal;
    (global as any).closeModal = modalMod.closeModal;

    // Feedback & Bug Reporting globals
    (global as any).generateBugReportMarkdown = feedbackMod.generateBugReportMarkdown;
    (global as any).recordRuntimeError = feedbackMod.recordRuntimeError;
    (global as any).getRuntimeErrors = feedbackMod.getRuntimeErrors;
    (global as any).clearRuntimeErrors = feedbackMod.clearRuntimeErrors;
    (global as any).getGitHubIssueUrl = feedbackMod.getGitHubIssueUrl;
    (global as any).copyBugReportToClipboard = feedbackMod.copyBugReportToClipboard;

    // Live Streaming & 1-Year Sync globals
    const syncMod = await import('../src/sync.js');
    (global as any).startLiveSession = syncMod.startLiveSession;
    (global as any).resumeUmpireSession = syncMod.resumeUmpireSession;
    (global as any).stopLiveSync = syncMod.stopLiveSync;
    (global as any).joinSpectatorSession = syncMod.joinSpectatorSession;
    (global as any).onUmpireDemoted = syncMod.onUmpireDemoted;
    (global as any).demoteUmpireToSpectator = syncMod.demoteUmpireToSpectator;
    (global as any).checkUmpireTakeover = syncMod.checkUmpireTakeover;
    (global as any).startUmpirePolling = syncMod.startUmpirePolling;
    (global as any).getLiveSession = syncMod.getLiveSession;
    (global as any).updateLiveSession = syncMod.updateLiveSession;
    (global as any).createLiveMatchPacket = syncMod.createLiveMatchPacket;
    (global as any).setLiveStorageProvider = syncMod.setLiveStorageProvider;
    (global as any).getLiveStorageProvider = syncMod.getLiveStorageProvider;
    (global as any).MemoryStorageProvider = syncMod.MemoryStorageProvider;
    (global as any).CloudflareKVStorageProvider = syncMod.CloudflareKVStorageProvider;
    (global as any).GoogleSheetsStorageProvider = syncMod.GoogleSheetsStorageProvider;
    (global as any).RestKVStorageProvider = syncMod.RestKVStorageProvider;
    (global as any).generateMatchId = syncMod.generateMatchId;
    (global as any).generateWriteKey = syncMod.generateWriteKey;
    (global as any).hashWriteKey = syncMod.hashWriteKey;
    (global as any).getSpectatorUrl = syncMod.getSpectatorUrl;
    (global as any).getUmpireUrl = syncMod.getUmpireUrl;
    (global as any).parseLiveUrlParams = syncMod.parseLiveUrlParams;
    (global as any).initLiveProviderFromUrlOrStorage = syncMod.initLiveProviderFromUrlOrStorage;
    (global as any).syncStateIfLive = syncMod.syncStateIfLive;
    (global as any).ONE_YEAR_SECONDS = syncMod.ONE_YEAR_SECONDS;
    (global as any).ONE_YEAR_MS = syncMod.ONE_YEAR_MS;
    (global as any).DEFAULT_TTL_SECONDS = syncMod.DEFAULT_TTL_SECONDS;
    (global as any).DEFAULT_TTL_MS = syncMod.DEFAULT_TTL_MS;
    (global as any).FOUR_WEEKS_SECONDS = syncMod.FOUR_WEEKS_SECONDS;
    (global as any).FOUR_WEEKS_MS = syncMod.FOUR_WEEKS_MS;
    (global as any).ACTIVE_POLL_INTERVAL_MS = syncMod.ACTIVE_POLL_INTERVAL_MS;
    (global as any).BACKGROUND_POLL_INTERVAL_MS = syncMod.BACKGROUND_POLL_INTERVAL_MS;
    (global as any).DEBOUNCE_SYNC_MS = syncMod.DEBOUNCE_SYNC_MS;

    (global as any).triggerLiveModal = uiMod.triggerLiveModal;
    (global as any).handleStartLiveStream = uiMod.handleStartLiveStream;
    (global as any).handleStopLiveStream = uiMod.handleStopLiveStream;
    (global as any).handleCopySpectatorUrl = uiMod.handleCopySpectatorUrl;
    (global as any).handleCopyUmpireUrl = uiMod.handleCopyUmpireUrl;
    (global as any).handleSpectatorManualRefresh = uiMod.handleSpectatorManualRefresh;
    (global as any).updateLiveIndicators = uiMod.updateLiveIndicators;

    // Version & Release Management globals
    const versionMod = await import('../src/version.js');
    (global as any).APP_VERSION = versionMod.APP_VERSION;
    (global as any).APP_RELEASE_DATE = versionMod.APP_RELEASE_DATE;
    (global as any).APP_RELEASE_TIMESTAMP = versionMod.APP_RELEASE_TIMESTAMP;
    (global as any).RELEASE_HISTORY = versionMod.RELEASE_HISTORY;
    (global as any).parseSemanticVersion = versionMod.parseSemanticVersion;
    (global as any).formatSemanticVersion = versionMod.formatSemanticVersion;
    (global as any).getNextSemanticVersion = versionMod.getNextSemanticVersion;
    (global as any).categorizeCommitMessage = versionMod.categorizeCommitMessage;
    (global as any).getLatestRelease = versionMod.getLatestRelease;
    (global as any).getAllReleases = versionMod.getAllReleases;

    const releaseNotesMod = await import('../src/release_notes.js');
    (global as any).renderReleaseNotesHTML = releaseNotesMod.renderReleaseNotesHTML;
    (global as any).openReleaseNotesModal = releaseNotesMod.openReleaseNotesModal;
    (global as any).initReleaseNotesModal = releaseNotesMod.initReleaseNotesModal;

    // Run tests - dynamic import for ESM compatibility
    await import('./test_cases.js');
}

loadModulesAndRun().catch(err => {
    console.error("Failed to run test suite:", err);
    process.exit(1);
});
