import { GameState, LiveMatchPacket, LiveRole, LiveSessionState, LiveSyncStatus } from './types.js';
import { minifyState, unminifyState } from './storage.js';

export const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60; // 31,536,000 seconds (365 days / 1 year)
export const ONE_YEAR_MS = ONE_YEAR_SECONDS * 1000; // 31,536,000,000 ms
export const DEFAULT_TTL_SECONDS = ONE_YEAR_SECONDS;
export const DEFAULT_TTL_MS = ONE_YEAR_MS;
export const FOUR_WEEKS_SECONDS = ONE_YEAR_SECONDS; // Deprecated alias kept for backwards compatibility
export const FOUR_WEEKS_MS = ONE_YEAR_MS;
export const ACTIVE_POLL_INTERVAL_MS = 3500;
export const BACKGROUND_POLL_INTERVAL_MS = 15000;
export const DEBOUNCE_SYNC_MS = 250;

/**
 * Generates a clean, URL-safe random alphanumeric string of given length.
 */
export function generateRandomString(prefix: string, length: number): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = prefix;
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export function generateMatchId(): string {
    return generateRandomString('m_', 8);
}

export function generateWriteKey(): string {
    return generateRandomString('k_', 16);
}

/**
 * Fast deterministic hash for write key verification.
 */
export function hashWriteKey(key: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}

/**
 * Storage provider interface for pluggable remote backend implementations.
 */
export interface LiveStorageProvider {
    savePacket(matchId: string, writeKey: string, packet: LiveMatchPacket): Promise<{ success: boolean; error?: string }>;
    fetchPacket(matchId: string): Promise<{ success: boolean; packet?: LiveMatchPacket; notFound?: boolean; expired?: boolean; error?: string }>;
}

/**
 * In-memory storage provider for deterministic testing, offline fallback, and simulations.
 */
export class MemoryStorageProvider implements LiveStorageProvider {
    private store = new Map<string, { writeKeyHash: string; packet: LiveMatchPacket }>();

    async savePacket(matchId: string, writeKey: string, packet: LiveMatchPacket): Promise<{ success: boolean; error?: string }> {
        const existing = this.store.get(matchId);
        const incomingHash = hashWriteKey(writeKey);

        if (existing && existing.writeKeyHash !== incomingHash) {
            console.warn('[MemoryStorageProvider] Write authorization failed for match:', matchId);
            return { success: false, error: 'Unauthorized: Invalid write key' };
        }

        this.store.set(matchId, {
            writeKeyHash: incomingHash,
            packet: JSON.parse(JSON.stringify(packet))
        });
        return { success: true };
    }

    async fetchPacket(matchId: string): Promise<{ success: boolean; packet?: LiveMatchPacket; notFound?: boolean; expired?: boolean; error?: string }> {
        const entry = this.store.get(matchId);
        if (!entry) {
            return { success: false, notFound: true, error: 'Match not found' };
        }

        if (Date.now() > entry.packet.expiresAt) {
            return { success: false, expired: true, error: 'Match record has expired (1-year retention period ended)' };
        }

        return { success: true, packet: JSON.parse(JSON.stringify(entry.packet)) };
    }

    clear(): void {
        this.store.clear();
    }
}

/**
 * Cloudflare Workers KV storage provider with sub-50ms edge latency,
 * built-in 1-year TTL (31,536,000s), and cryptographic write authorization.
 */
export class CloudflareKVStorageProvider implements LiveStorageProvider {
    protected endpoint: string;

    constructor(endpoint?: string) {
        // Default Cloudflare Workers KV endpoint or custom edge worker URL
        this.endpoint = endpoint || 'https://cricket-scorecard-live.khaneja.org/api/';
        if (!this.endpoint.endsWith('/')) {
            this.endpoint += '/';
        }
    }

    async savePacket(matchId: string, writeKey: string, packet: LiveMatchPacket): Promise<{ success: boolean; error?: string }> {
        try {
            const url = `${this.endpoint}match/${matchId}?ttl=${ONE_YEAR_SECONDS}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Write-Key': writeKey
                },
                body: JSON.stringify(packet)
            });

            if (!res.ok) {
                console.warn(`[CloudflareKV] Save failed: HTTP ${res.status} ${res.statusText}`, { matchId });
                return { success: false, error: `HTTP error ${res.status}` };
            }

            return { success: true };
        } catch (e: any) {
            console.error('[CloudflareKV] Network error saving packet:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
            return { success: false, error: e?.message || 'Network error' };
        }
    }

    async fetchPacket(matchId: string): Promise<{ success: boolean; packet?: LiveMatchPacket; notFound?: boolean; expired?: boolean; error?: string }> {
        try {
            const url = `${this.endpoint}match/${matchId}`;
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });

            if (res.status === 404) {
                return { success: false, notFound: true, error: 'Match not found' };
            }

            if (!res.ok) {
                console.warn(`[CloudflareKV] Fetch failed: HTTP ${res.status}`, { matchId });
                return { success: false, error: `HTTP error ${res.status}` };
            }

            const packet: LiveMatchPacket = await res.json();
            if (Date.now() > packet.expiresAt) {
                return { success: false, expired: true, error: 'Match record has expired (1-year retention period ended)' };
            }

            return { success: true, packet };
        } catch (e: any) {
            console.error('[CloudflareKV] Network error fetching packet:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
            return { success: false, error: e?.message || 'Network error' };
        }
    }
}

/**
 * Google Sheets / Google Apps Script Web App storage provider.
 * Uses a free Google Apps Script web app endpoint backing match state to Google Sheets/Drive.
 */
export class GoogleSheetsStorageProvider implements LiveStorageProvider {
    private scriptUrl: string;

    constructor(scriptUrl: string) {
        this.scriptUrl = scriptUrl;
    }

    async savePacket(matchId: string, writeKey: string, packet: LiveMatchPacket): Promise<{ success: boolean; error?: string }> {
        try {
            const res = await fetch(this.scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    action: 'save',
                    matchId,
                    writeKey,
                    packet
                })
            });

            if (!res.ok) {
                console.warn(`[GoogleSheetsStorage] Save failed: HTTP ${res.status} ${res.statusText}`, { matchId });
                return { success: false, error: `HTTP error ${res.status}` };
            }

            const data = await res.json();
            if (!data.success) {
                console.warn('[GoogleSheetsStorage] Save rejected by Apps Script:', { matchId, error: data.error });
                return { success: false, error: data.error || 'Google Apps Script save failed' };
            }

            return { success: true };
        } catch (e: any) {
            console.error('[GoogleSheetsStorage] Network error saving packet:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
            return { success: false, error: e?.message || 'Network error' };
        }
    }

    async fetchPacket(matchId: string): Promise<{ success: boolean; packet?: LiveMatchPacket; notFound?: boolean; expired?: boolean; error?: string }> {
        try {
            const separator = this.scriptUrl.includes('?') ? '&' : '?';
            const url = `${this.scriptUrl}${separator}action=fetch&matchId=${encodeURIComponent(matchId)}`;
            const res = await fetch(url, {
                method: 'GET'
            });

            if (res.status === 404) {
                return { success: false, notFound: true, error: 'Match not found' };
            }

            if (!res.ok) {
                console.warn(`[GoogleSheetsStorage] Fetch failed: HTTP ${res.status} ${res.statusText}`, { matchId });
                return { success: false, error: `HTTP error ${res.status}` };
            }

            const data = await res.json();
            if (!data.success) {
                if (data.notFound) return { success: false, notFound: true, error: 'Match not found' };
                if (data.expired) return { success: false, expired: true, error: 'Match record has expired' };
                return { success: false, error: data.error || 'Google Apps Script fetch failed' };
            }

            const packet: LiveMatchPacket = data.packet;
            if (Date.now() > packet.expiresAt) {
                return { success: false, expired: true, error: 'Match record has expired' };
            }

            return { success: true, packet };
        } catch (e: any) {
            console.error('[GoogleSheetsStorage] Network error fetching packet:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
            return { success: false, error: e?.message || 'Network error' };
        }
    }
}

/**
 * Backward compatibility alias for RestKVStorageProvider.
 */
export class RestKVStorageProvider extends CloudflareKVStorageProvider {}

// Active storage provider instance (default: Cloudflare Workers KV)
let activeStorageProvider: LiveStorageProvider = new CloudflareKVStorageProvider();

export function setLiveStorageProvider(provider: LiveStorageProvider): void {
    activeStorageProvider = provider;
}

export function getLiveStorageProvider(): LiveStorageProvider {
    return activeStorageProvider;
}

// Live sync state management
let currentLiveSession: LiveSessionState = {
    matchId: null,
    isLive: false,
    role: 'NONE',
    writeKey: null,
    seq: 0,
    status: 'DISCONNECTED',
    lastSyncedAt: null,
    lastError: null,
    expiresAt: null
};

let syncDebounceTimer: any = null;
let spectatorPollingTimer: any = null;
let isDirty = false;
let pendingStateToSync: GameState | null = null;
let statusChangeListeners: Array<(session: LiveSessionState) => void> = [];

export function getLiveSession(): LiveSessionState {
    return { ...currentLiveSession };
}

export function subscribeLiveSession(listener: (session: LiveSessionState) => void): () => void {
    statusChangeListeners.push(listener);
    listener(getLiveSession());
    return () => {
        statusChangeListeners = statusChangeListeners.filter(l => l !== listener);
    };
}

function notifyLiveSessionListeners(): void {
    const session = getLiveSession();
    statusChangeListeners.forEach(listener => {
        try {
            listener(session);
        } catch (e: any) {
            console.error('[LiveSync] Error in session listener:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e)
            });
        }
    });
}

export function updateLiveSession(partial: Partial<LiveSessionState>): void {
    currentLiveSession = { ...currentLiveSession, ...partial };
    notifyLiveSessionListeners();
}

/**
 * Creates a LiveMatchPacket for network transport.
 */
export function createLiveMatchPacket(
    matchId: string,
    writeKey: string,
    seq: number,
    state: GameState,
    createdAt: number = Date.now()
): LiveMatchPacket {
    const now = Date.now();
    const minState = minifyState(state);
    return {
        version: 1,
        matchId,
        seq,
        updatedAt: now,
        createdAt,
        expiresAt: createdAt + ONE_YEAR_MS,
        ttlSeconds: ONE_YEAR_SECONDS,
        writeKeyHash: hashWriteKey(writeKey),
        state: minState
    };
}

/**
 * Starts a new live scoring session (Umpire / Author role).
 */
export function startLiveSession(
    state: GameState,
    existingMatchId?: string,
    existingWriteKey?: string
): { matchId: string; writeKey: string; spectatorUrl: string; umpireUrl: string } {
    const matchId = existingMatchId || generateMatchId();
    const writeKey = existingWriteKey || generateWriteKey();
    const now = Date.now();

    updateLiveSession({
        matchId,
        isLive: true,
        role: 'UMPIRE',
        writeKey,
        seq: 1,
        status: 'CONNECTING',
        lastSyncedAt: null,
        lastError: null,
        expiresAt: now + ONE_YEAR_MS
    });

    // Persist write key in localStorage so umpire can refresh without losing auth
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(`liveWriteKey_${matchId}`, writeKey);
            localStorage.setItem('activeLiveMatchId', matchId);
        } catch (e: any) {
            console.warn('[LiveSync] Failed to save writeKey to localStorage:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
        }
    }

    // Immediately push initial state
    syncStateIfLive(state, true);

    const spectatorUrl = getSpectatorUrl(matchId);
    const umpireUrl = getUmpireUrl(matchId, writeKey);

    return { matchId, writeKey, spectatorUrl, umpireUrl };
}

/**
 * Pushes state to the live storage provider if currently active as Umpire.
 */
export async function syncStateIfLive(state: GameState, immediate: boolean = false): Promise<boolean> {
    if (!currentLiveSession.isLive || currentLiveSession.role !== 'UMPIRE' || !currentLiveSession.matchId || !currentLiveSession.writeKey) {
        return false;
    }

    pendingStateToSync = state;
    isDirty = true;

    if (immediate) {
        if (syncDebounceTimer) {
            clearTimeout(syncDebounceTimer);
            syncDebounceTimer = null;
        }
        return await executeSync();
    }

    if (!syncDebounceTimer) {
        syncDebounceTimer = setTimeout(async () => {
            syncDebounceTimer = null;
            await executeSync();
        }, DEBOUNCE_SYNC_MS);
    }

    return true;
}

async function executeSync(): Promise<boolean> {
    if (!isDirty || !pendingStateToSync || !currentLiveSession.matchId || !currentLiveSession.writeKey) {
        return false;
    }

    const matchId = currentLiveSession.matchId;
    const writeKey = currentLiveSession.writeKey;
    const nextSeq = currentLiveSession.seq + 1;
    const state = pendingStateToSync;
    isDirty = false;

    updateLiveSession({ status: 'SYNCING' });

    const packet = createLiveMatchPacket(matchId, writeKey, nextSeq, state);
    const result = await activeStorageProvider.savePacket(matchId, writeKey, packet);

    if (result.success) {
        updateLiveSession({
            seq: nextSeq,
            status: 'SYNCED',
            lastSyncedAt: Date.now(),
            lastError: null
        });
        return true;
    } else {
        console.warn('[LiveSync] Sync failed, queuing retry:', { matchId, error: result.error });
        isDirty = true; // Retain dirty flag for retry
        updateLiveSession({
            status: 'OFFLINE_RETRY',
            lastError: result.error || 'Failed to sync with cloud'
        });
        return false;
    }
}

/**
 * Joins a match session as a Spectator (read-only) with continuous polling.
 */
export function joinSpectatorSession(
    matchId: string,
    onStateUpdate: (newState: GameState) => void,
    onStatusChange?: (status: LiveSyncStatus, message?: string) => void
): () => void {
    stopLiveSync();

    updateLiveSession({
        matchId,
        isLive: true,
        role: 'SPECTATOR',
        writeKey: null,
        seq: 0,
        status: 'CONNECTING',
        lastSyncedAt: null,
        lastError: null,
        expiresAt: null
    });

    let isPolling = true;

    const poll = async () => {
        if (!isPolling || currentLiveSession.matchId !== matchId) return;

        const res = await activeStorageProvider.fetchPacket(matchId);

        if (res.success && res.packet) {
            const packet = res.packet;
            
            // Validate sequence or newer timestamp
            if (packet.seq > currentLiveSession.seq || !currentLiveSession.lastSyncedAt) {
                try {
                    const decompressed = unminifyState(packet.state);
                    decompressed.matchStarted = true;
                    updateLiveSession({
                        seq: packet.seq,
                        status: 'SYNCED',
                        lastSyncedAt: packet.updatedAt,
                        expiresAt: packet.expiresAt,
                        lastError: null
                    });
                    onStateUpdate(decompressed);

                    if (decompressed.match?.matchOver) {
                        // Match completed; stop continuous polling to eliminate unnecessary network traffic
                        isPolling = false;
                        return;
                    }
                } catch (e: any) {
                    console.error('[LiveSync] Failed to unminify incoming spectator packet:', {
                        errorType: e?.name || 'Error',
                        message: e?.message || String(e),
                        matchId
                    });
                    updateLiveSession({
                        status: 'ERROR',
                        lastError: 'Corrupt match packet received'
                    });
                }
            } else {
                updateLiveSession({ status: 'SYNCED' });
            }
        } else if (res.expired) {
            updateLiveSession({
                status: 'ERROR',
                lastError: 'This match scorecard has expired (1-year retention ended).'
            });
            if (onStatusChange) onStatusChange('ERROR', 'Match expired (1-year retention ended).');
            isPolling = false;
            return;
        } else if (res.notFound) {
            updateLiveSession({
                status: 'ERROR',
                lastError: 'Live match not found. Verify the match link.'
            });
            if (onStatusChange) onStatusChange('ERROR', 'Match not found.');
        } else {
            updateLiveSession({
                status: 'OFFLINE_RETRY',
                lastError: res.error || 'Network error fetching live update'
            });
        }

        // Schedule next poll adaptive to visibility
        if (isPolling) {
            const isHidden = typeof document !== 'undefined' && document.visibilityState === 'hidden';
            const interval = isHidden ? BACKGROUND_POLL_INTERVAL_MS : ACTIVE_POLL_INTERVAL_MS;
            spectatorPollingTimer = setTimeout(poll, interval);
        }
    };

    // Immediate initial poll
    poll();

    // Re-poll immediately on visibility recovery
    const visibilityHandler = () => {
        if (typeof document !== 'undefined' && document.visibilityState === 'visible' && isPolling) {
            if (spectatorPollingTimer) clearTimeout(spectatorPollingTimer);
            poll();
        }
    };

    if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
        isPolling = false;
        if (spectatorPollingTimer) {
            clearTimeout(spectatorPollingTimer);
            spectatorPollingTimer = null;
        }
        if (typeof document !== 'undefined' && document.removeEventListener) {
            document.removeEventListener('visibilitychange', visibilityHandler);
        }
    };
}

/**
 * Stops any active live session, halts polling timers, and resets live session state.
 */
export function stopLiveSync(): void {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
        syncDebounceTimer = null;
    }
    if (spectatorPollingTimer) {
        clearTimeout(spectatorPollingTimer);
        spectatorPollingTimer = null;
    }
    isDirty = false;
    pendingStateToSync = null;

    updateLiveSession({
        matchId: null,
        isLive: false,
        role: 'NONE',
        writeKey: null,
        seq: 0,
        status: 'DISCONNECTED',
        lastSyncedAt: null,
        lastError: null,
        expiresAt: null
    });
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

export function initLiveProviderFromUrlOrStorage(): void {
    if (typeof window === 'undefined' || !window.location) {
        return;
    }
    const storage = getLocalStorage();
    const search = window.location.search || '';
    const params = search ? new URLSearchParams(search) : null;
    const customEndpoint = params ? (params.get('endpoint') || params.get('backend')) : null;
    if (customEndpoint && storage) {
        try {
            storage.setItem('custom_live_endpoint', customEndpoint);
        } catch (e: any) {
            console.warn('[LiveSync] Failed to persist custom live endpoint to localStorage:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                customEndpoint
            });
        }
    }

    let activeEndpoint: string | null = customEndpoint;
    if (!activeEndpoint && storage) {
        try {
            activeEndpoint = storage.getItem('custom_live_endpoint');
        } catch (e: any) {
            console.warn('[LiveSync] Failed to read custom live endpoint from localStorage:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e)
            });
        }
    }

    if (activeEndpoint) {
        if (activeEndpoint.includes('script.google.com')) {
            setLiveStorageProvider(new GoogleSheetsStorageProvider(activeEndpoint));
        } else {
            setLiveStorageProvider(new CloudflareKVStorageProvider(activeEndpoint));
        }
    }
}

export function parseLiveUrlParams(): { matchId: string | null; writeKey: string | null } {
    if (typeof window === 'undefined' || !window.location || !window.location.search) {
        return { matchId: null, writeKey: null };
    }

    initLiveProviderFromUrlOrStorage();

    const params = new URLSearchParams(window.location.search);
    const matchId = params.get('live') || params.get('match');
    let writeKey = params.get('key');

    // If no key in URL, check localStorage
    if (matchId && !writeKey && typeof localStorage !== 'undefined') {
        try {
            writeKey = localStorage.getItem(`liveWriteKey_${matchId}`);
        } catch (e: any) {
            console.warn('[LiveSync] Failed to read stored writeKey:', {
                errorType: e?.name || 'Error',
                message: e?.message || String(e),
                matchId
            });
        }
    }

    return { matchId, writeKey };
}

export function getSpectatorUrl(matchId: string): string {
    if (typeof window !== 'undefined' && window.location) {
        return `${window.location.origin}${window.location.pathname}?live=${encodeURIComponent(matchId)}`;
    }
    return `?live=${encodeURIComponent(matchId)}`;
}

export function getUmpireUrl(matchId: string, writeKey: string): string {
    if (typeof window !== 'undefined' && window.location) {
        return `${window.location.origin}${window.location.pathname}?live=${encodeURIComponent(matchId)}&key=${encodeURIComponent(writeKey)}`;
    }
    return `?live=${encodeURIComponent(matchId)}&key=${encodeURIComponent(writeKey)}`;
}
