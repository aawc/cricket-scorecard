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

(global as any).document = {
    createElement: function(tagName: string) {
        const elem: any = {
            value: '',
            textContent: '',
            innerHTML: '',
            classes: new Set<string>(),
            appendedChildren: [] as any[],
            appendChild: function(child: any) { this.appendedChildren.push(child); },
            remove: () => {},
            querySelector: () => ({ addEventListener: () => {}, textContent: '', remove: () => {}, classList: { add: () => {}, remove: () => {} } }),
            children: [],
            querySelectorAll: function(selector: string) {
                if (selector === '.roster-item') return this.children;
                return [];
            },
            addEventListener: () => {},
            dataset: {},
            style: {}
        };
        elem.classList = createClassListMock(elem);
        return elem;
    },
    getElementById: function(id: string) {
        if (!elements[id]) {
            const elem: any = {
                value: '',
                textContent: '',
                classes: new Set<string>(),
                appendedChildren: [] as any[],
                appendChild: function(child: any) { this.appendedChildren.push(child); },
                _innerHTML: '',
                get innerHTML() { return this._innerHTML; },
                set innerHTML(val: string) {
                    this._innerHTML = val;
                    if (val === '') {
                        this.appendedChildren = [];
                    }
                },
                querySelector: () => ({ addEventListener: () => {}, textContent: '', classList: { add: () => {}, remove: () => {} }, dataset: {} }),
                children: [] as any[],
                querySelectorAll: function(selector: string) {
                    if (selector === '.roster-item') {
                        return this.children;
                    }
                    return [];
                },
                addEventListener: () => {},
                dataset: {},
                style: {},
                parentElement: {
                    classList: {
                        add: () => {},
                        remove: () => {},
                        contains: () => false
                    }
                }
            };
            elem.classList = createClassListMock(elem);
            elements[id] = elem;
        }
        return elements[id];
    },

    querySelector: function(selector: string) {
        if (selector === '.flip-container') {
             if (!elements['flip-container']) {
                 const elem: any = {
                     classes: new Set<string>()
                 };
                 elem.classList = createClassListMock(elem);
                 elements['flip-container'] = elem;
             }
             return elements['flip-container'];
        }
        return {
            classList: { add: () => {}, remove: () => {}, contains: () => false }
        };
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
        classes: new Set<string>()
    }
};

(global as any).window = {
    location: { search: '', pathname: '', origin: '' },
    history: { replaceState: () => {}, pushState: () => {} },
    addEventListener: () => {}
};

(global as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

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

    (global as any).resetMatch = uiMod.resetMatch;
    (global as any).startMatch = uiMod.startMatch;
    (global as any).generateSummaryView = uiMod.generateSummaryView;
    (global as any).parseBallLog = uiMod.parseBallLog;
    (global as any).toggleScreenshotMode = uiMod.toggleScreenshotMode;
    (global as any).triggerExtraRunsModal = uiMod.triggerExtraRunsModal;
    (global as any).triggerRunOutModal = uiMod.triggerRunOutModal;
    (global as any).processRunOut = uiMod.processRunOut;
    (global as any).updateUI = uiMod.updateUI;
    (global as any).handleBatsmanChange = uiMod.handleBatsmanChange;
    (global as any).handleBowlerChange = uiMod.handleBowlerChange;

    // Run tests - dynamic import for ESM compatibility
    await import('./test_cases.js');
}

loadModulesAndRun().catch(err => {
    console.error("Failed to run test suite:", err);
    process.exit(1);
});
