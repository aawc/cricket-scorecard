// test.js (Runner)
const fs = require('fs');
const path = require('path');

// Mock DOM with state retention
const elements = {};
global.elements = elements; // Expose to test_cases.js

global.document = {
    createElement: function(tagName) {
        const elem = {
            value: '',
            textContent: '',
            innerHTML: '',
            classes: new Set(),
            appendedChildren: [],
            appendChild: function(child) { this.appendedChildren.push(child); },
            remove: () => {},
            querySelector: () => ({ addEventListener: () => {}, textContent: '', remove: () => {}, classList: { add: () => {}, remove: () => {} } }),
            children: [],
            querySelectorAll: function(selector) {
                if (selector === '.roster-item') return this.children;
                return [];
            },
            addEventListener: () => {},
            dataset: {},
            style: {}
        };
        elem.classList = {
            add: function(c) { elem.classes.add(c); },
            remove: function(c) { elem.classes.delete(c); },
            contains: function(c) { return elem.classes.has(c); }
        };
        return elem;
    },
    getElementById: function(id) {
        if (!elements[id]) {
            const elem = {
                value: '',
                textContent: '',
                classes: new Set(),
                appendedChildren: [],
                appendChild: function(child) { this.appendedChildren.push(child); },
                innerHTML: '',
                querySelector: () => ({ addEventListener: () => {}, textContent: '', classList: { add: () => {}, remove: () => {} }, dataset: {} }),
                children: [],
                querySelectorAll: function(selector) {
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
            elem.classList = {
                add: function(c) { elem.classes.add(c); },
                remove: function(c) { elem.classes.delete(c); },
                contains: function(c) { return elem.classes.has(c); }
            };
            elements[id] = elem;
        }
        return elements[id];
    },

    querySelector: function(selector) {
        if (selector === '.flip-container') {
             if (!elements['flip-container']) {
                 const elem = {
                     classes: new Set()
                 };
                 elem.classList = {
                     add: function(c) { elem.classes.add(c); },
                     remove: function(c) { elem.classes.delete(c); },
                     contains: function(c) { return elem.classes.has(c); }
                 };
                 elements['flip-container'] = elem;
             }
             return elements['flip-container'];
        }
        return {
            classList: { add: () => {}, remove: () => {}, contains: () => false }
        };
    },
    querySelectorAll: function(selector) {
        return [];
    },
    documentElement: {
        setAttribute: () => {},
        getAttribute: () => 'light'
    },
    body: {
        classList: {
            add: function(c) { global.document.body.classes.add(c); },
            remove: function(c) { global.document.body.classes.delete(c); },
            contains: function(c) { return global.document.body.classes.has(c); }
        },
        classes: new Set()
    }
};

global.window = {
    location: { search: '', pathname: '', origin: '' },
    history: { replaceState: () => {}, pushState: () => {} },
    addEventListener: () => {}
};

global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
};

global.navigator = {
    clipboard: { writeText: () => Promise.resolve() },
    serviceWorker: { register: () => Promise.resolve() }
};

global.alert = () => {};

// Load ES modules dynamically and set up globals
async function loadModulesAndRun() {
    const stateMod = await import('../src/state.js');
    const storageMod = await import('../src/storage.js');
    const uiMod = await import('../src/ui.js');

    // Make gameState global
    global.gameState = stateMod.gameState;
    global.setGameState = stateMod.setGameState;

    // Bind functions to global scope for tests
    global.addRuns = uiMod.addRuns;
    global.addLegBye = uiMod.addLegBye;
    global.addWicket = uiMod.addWicket;
    global.finalizeDelivery = uiMod.finalizeDelivery;
    global.endInnings = () => {
        stateMod.dispatch({ type: 'FORCE_END_INNINGS' });
        stateMod.dispatch({ type: 'START_NEXT_INNINGS' });
    };

    global.loadFromLocalStorage = () => {
        try {
            const loaded = storageMod.loadState();
            if (loaded) {
                stateMod.setGameState(loaded);
            }
        } catch (e) {
            global.alert(e.message);
        }
    };
    global.saveToLocalStorage = () => storageMod.saveState(stateMod.gameState);
    global.minifyState = storageMod.minifyState;
    global.unminifyState = storageMod.unminifyState;
    global.healInningsOvers = storageMod.healInningsOvers;

    global.resetMatch = uiMod.resetMatch;
    global.startMatch = uiMod.startMatch;
    global.generateSummaryView = uiMod.generateSummaryView;
    global.parseBallLog = uiMod.parseBallLog;
    global.toggleScreenshotMode = uiMod.toggleScreenshotMode;
    global.triggerExtraRunsModal = uiMod.triggerExtraRunsModal;
    global.triggerRunOutModal = uiMod.triggerRunOutModal;
    global.processRunOut = uiMod.processRunOut;
    global.updateUI = uiMod.updateUI;
    global.handleBatsmanChange = uiMod.handleBatsmanChange;
    global.handleBowlerChange = uiMod.handleBowlerChange;

    // Run tests
    require('./test_cases.js');
}

loadModulesAndRun().catch(err => {
    console.error("Failed to run test suite:", err);
    process.exit(1);
});
