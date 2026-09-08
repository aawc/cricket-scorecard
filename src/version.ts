/**
 * Centralized Version Management & Semantic Release Metadata.
 * Single source of truth for application version, release notes, and semantic tagging (v$yyyy.$mm.$nnn).
 */

export interface CommitInfo {
    hash: string;
    author: string;
    date: string;
    message: string;
    category?: "feat" | "fix" | "docs" | "refactor" | "test" | "perf" | "chore";
}

export interface ReleaseInfo {
    version: string;
    date: string;
    timestamp: string;
    highlights: string[];
    commits: CommitInfo[];
}

/**
 * Active application version formatted as timestamped semantic tag: v$yyyy.$mm.$nnn
 */
export const APP_VERSION = "v2026.09.001";
export const APP_RELEASE_DATE = "2026-09-08";
export const APP_RELEASE_TIMESTAMP = "2026-09-08T01:55:00.000Z";

/**
 * Categorize a git commit message into conventional change types.
 */
export function categorizeCommitMessage(message: string): "feat" | "fix" | "docs" | "refactor" | "test" | "perf" | "chore" {
    const lower = (message || "").toLowerCase().trim();
    if (/^feat(\(.*\))?:|^add |^implement |^support /.test(lower)) return "feat";
    if (/^fix(\(.*\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return "fix";
    if (/^docs(\(.*\))?:|^document |update readme|update prompt|update design/.test(lower)) return "docs";
    if (/^refactor(\(.*\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return "refactor";
    if (/^test(\(.*\))?:|^add unit test|^add test/.test(lower)) return "test";
    if (/^perf(\(.*\))?:|^optimize |^speed /.test(lower)) return "perf";
    return "chore";
}

/**
 * Validate and parse a semantic timestamped tag in format v$yyyy.$mm.$nnn (e.g., v2026.09.001).
 */
export function parseSemanticVersion(tag: string): { year: number; month: number; seq: number } | null {
    if (typeof tag !== "string") return null;
    const match = tag.trim().match(/^v(\d{4})\.(\d{2})\.(\d{3})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const seq = parseInt(match[3], 10);
    if (isNaN(year) || isNaN(month) || isNaN(seq) || month < 1 || month > 12 || seq < 1) {
        return null;
    }
    return { year, month, seq };
}

/**
 * Format year, month, and sequence number into standard semantic tag string.
 */
export function formatSemanticVersion(year: number, month: number, seq: number): string {
    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const nnn = String(seq).padStart(3, "0");
    return `v${yyyy}.${mm}.${nnn}`;
}

/**
 * Compute the next sequential semantic release tag based on current year/month and existing tags.
 */
export function getNextSemanticVersion(existingTags: string[] = [], referenceDate: Date = new Date()): string {
    const currentYear = referenceDate.getUTCFullYear();
    const currentMonth = referenceDate.getUTCMonth() + 1;

    let maxSeq = 0;
    for (const tag of existingTags) {
        const parsed = parseSemanticVersion(tag);
        if (parsed && parsed.year === currentYear && parsed.month === currentMonth) {
            if (parsed.seq > maxSeq) {
                maxSeq = parsed.seq;
            }
        }
    }

    return formatSemanticVersion(currentYear, currentMonth, maxSeq + 1);
}

/**
 * Structured Release History containing all releases, highlights, and commit records.
 */
export const RELEASE_HISTORY: ReleaseInfo[] = [
    {
        version: "v2026.09.001",
        date: "2026-09-08",
        timestamp: "2026-09-08T01:55:00.000Z",
        highlights: [
            "Standardized Release Management & Semantic Tagging (v$yyyy.$mm.$nnn)",
            "Interactive Persistent Footer Release Badge with real-time version pill",
            "Integrated Release Notes Modal with searchable commit history and highlights",
            "Automated Repository Tag Generation & Push Pipeline",
            "Senior Developer Code Organization Refactor & Centralized Versioning",
            "Comprehensive Fix & Feature Contributing Guide for Developers"
        ],
        commits: [
            {
                hash: "c5cd759",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "Fix global reference error on delivery buttons and sanitize third-party branding",
                category: "fix"
            },
            {
                hash: "af24462",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "Rework UI layout with ESPNcricinfo-inspired design and responsive elements",
                category: "feat"
            },
            {
                hash: "409181e",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "Overhaul UI to minimalist design, lock spectator controls, and fix delivery scoring",
                category: "feat"
            },
            {
                hash: "78da27a",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "docs: author deployment guide and synchronize documentation for live Cloudflare endpoint",
                category: "docs"
            },
            {
                hash: "bb264f0",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "test(sync): add unit tests for 1-year TTL and dynamic provider switching",
                category: "test"
            },
            {
                hash: "12d1485",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "feat(sync): set production Cloudflare Worker endpoint and 1-year retention TTL",
                category: "feat"
            },
            {
                hash: "3d6b707",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "docs: synchronize README.md, PROMPT.md, and task.md with Cloudflare and Google backends",
                category: "docs"
            },
            {
                hash: "28e22ec",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "test: add unit tests 54-66 for live sync, modal controller, and bulk import",
                category: "test"
            },
            {
                hash: "5067da3",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "feat(ui): connect live stream modal, spectator mode locking, and direct bulk paste triggers",
                category: "feat"
            },
            {
                hash: "ca20ed0",
                author: "Varun Khaneja",
                date: "2026-09-08",
                message: "fix(ui): add universal modal controller, WAI-ARIA focus guardrail, and embedded compression",
                category: "fix"
            }
        ]
    }
];

export function getLatestRelease(): ReleaseInfo {
    return RELEASE_HISTORY[0];
}

export function getAllReleases(): ReleaseInfo[] {
    return [...RELEASE_HISTORY];
}
