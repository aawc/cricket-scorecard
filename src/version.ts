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
export const APP_VERSION = "v2026.11.002";
export const APP_RELEASE_DATE = "2026-11-21";
export const APP_RELEASE_TIMESTAMP = "2026-11-21T11:28:38.278Z";

/**
 * Categorize a git commit message into conventional change types.
 */
export function categorizeCommitMessage(message: string): "feat" | "fix" | "docs" | "refactor" | "test" | "perf" | "chore" {
    const lower = (message || "").toLowerCase().trim();
    if (/^(chore|ci|build)(\([^)]*\))?:|^bump /.test(lower)) return "chore";
    if (/^docs(\([^)]*\))?:|^document |^update (readme|agents|claude|gemini|contributing|security|design|docs)/.test(lower)) return "docs";
    if (/^test(\([^)]*\))?:|^add (unit )?test/.test(lower)) return "test";
    if (/^feat(\([^)]*\))?:|^add |^implement |^support /.test(lower)) return "feat";
    if (/^fix(\([^)]*\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return "fix";
    if (/^refactor(\([^)]*\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return "refactor";
    return /^perf(\([^)]*\))?:|^optimize |^speed /.test(lower) ? "perf" : "chore";
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
        "version": "v2026.11.002",
        "date": "2026-11-21",
        "timestamp": "2026-11-21T11:28:38.278Z",
        "highlights": [
            "Add modular Umpire God Mode modal with spectator lockout and doc sync",
            "Add lossless APPLY_GOD_MODE state machine and v2 bridge reconciliation"
        ],
        "commits": [
            {
                "hash": "8713b79",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "feat(ui): add modular Umpire God Mode modal with spectator lockout and doc sync",
                "category": "feat"
            },
            {
                "hash": "b28c6c1",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "feat(reducer): add lossless APPLY_GOD_MODE state machine and v2 bridge reconciliation",
                "category": "feat"
            }
        ]
    },
    {
        "version": "v2026.11.001",
        "date": "2026-11-21",
        "timestamp": "2026-11-21T08:47:07.356Z",
        "highlights": [
            "Automatically initialize live streaming session when starting a new match",
            "Include analytics and visual charts in final match scorecard",
            "Support mid-innings batsman substitution, stat resumption & active striker healing",
            "Enforce the ICC no-consecutive-overs rule in the state machine",
            "Introduce event-sourced core, pure statistical projections, and visual analytics suite",
            "Fix: Resolve release.yml YAML tag syntax error and Pages branch policy gate",
            "Fix: Resolve first batting team when both innings are archived",
            "Fix: Prevent mobile scroll freeze on innings transition and modal dismissal",
            "Fix: Parse run-out tokens in the analytics bridge"
        ],
        "commits": [
            {
                "hash": "8876020",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "chore(ci): trigger semantic release pipeline on main",
                "category": "chore"
            },
            {
                "hash": "fd367c3",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "fix(ci): resolve release.yml YAML tag syntax error and Pages branch policy gate",
                "category": "fix"
            },
            {
                "hash": "276a628",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "build(deps-dev): upgrade vite to ^8.3.8 and enforce launch-editor >=2.14.2 (#14, #15, #16)",
                "category": "chore"
            },
            {
                "hash": "1eb457e",
                "author": "Varun Khaneja",
                "date": "2026-11-21",
                "message": "build(npm): pin public npmjs registry in .npmrc for lockfile and audit hygiene",
                "category": "chore"
            },
            {
                "hash": "5a0ec31",
                "author": "Varun Khaneja",
                "date": "2026-11-20",
                "message": "ci(release): automate main semantic releases and chain GitHub Pages deploy",
                "category": "chore"
            },
            {
                "hash": "3eaa691",
                "author": "Varun Khaneja",
                "date": "2026-11-20",
                "message": "docs(agents): establish canonical AGENTS.md hierarchy and multi-agent pointers",
                "category": "docs"
            },
            {
                "hash": "a74df25",
                "author": "Varun Khaneja",
                "date": "2026-11-20",
                "message": "feat(live): automatically initialize live streaming session when starting a new match",
                "category": "feat"
            },
            {
                "hash": "283f057",
                "author": "Varun Khaneja",
                "date": "2026-10-19",
                "message": "feat(ui): include analytics and visual charts in final match scorecard",
                "category": "feat"
            },
            {
                "hash": "cf47bac",
                "author": "Varun Khaneja",
                "date": "2026-10-19",
                "message": "fix(bridge): resolve first batting team when both innings are archived",
                "category": "fix"
            },
            {
                "hash": "0aad6c3",
                "author": "dependabot[bot]",
                "date": "2026-10-18",
                "message": "Bump source-map-js from 1.2.1 to 1.2.2",
                "category": "chore"
            },
            {
                "hash": "300ed79",
                "author": "Varun Khaneja",
                "date": "2026-10-18",
                "message": "ci: eliminate deleted v2 branch checkout and mirror main to /v2/",
                "category": "chore"
            },
            {
                "hash": "3299e66",
                "author": "Varun Khaneja",
                "date": "2026-09-15",
                "message": "fix(modal): prevent mobile scroll freeze on innings transition and modal dismissal",
                "category": "fix"
            },
            {
                "hash": "d95c640",
                "author": "Varun Khaneja",
                "date": "2026-09-14",
                "message": "Support mid-innings batsman substitution, stat resumption & active striker healing",
                "category": "feat"
            },
            {
                "hash": "15b29c1",
                "author": "Varun Khaneja",
                "date": "2026-09-12",
                "message": "docs: repair line anchors that resolve to the wrong line",
                "category": "docs"
            },
            {
                "hash": "cec9ba5",
                "author": "Varun Khaneja",
                "date": "2026-09-12",
                "message": "ci: enable dual-branch deployment for main (root) and v2 (/v2/) subpath",
                "category": "chore"
            },
            {
                "hash": "be53ded",
                "author": "Varun Khaneja",
                "date": "2026-09-12",
                "message": "docs: add the ICC playing conditions and correct unsupported claims",
                "category": "docs"
            },
            {
                "hash": "cc7d7ec",
                "author": "Varun Khaneja",
                "date": "2026-09-12",
                "message": "feat(rules): enforce the ICC no-consecutive-overs rule in the state machine",
                "category": "feat"
            },
            {
                "hash": "62d5933",
                "author": "Varun Khaneja",
                "date": "2026-09-11",
                "message": "fix(v2): parse run-out tokens in the analytics bridge",
                "category": "fix"
            },
            {
                "hash": "9d713ff",
                "author": "Varun Khaneja",
                "date": "2026-09-11",
                "message": "fix(v2): correct wide+bye run attribution, partnership totals and chart legibility",
                "category": "fix"
            },
            {
                "hash": "4f53368",
                "author": "Varun Khaneja",
                "date": "2026-09-11",
                "message": "fix(v2): dynamic projected total calculation and total overs display",
                "category": "fix"
            },
            {
                "hash": "fbc33bf",
                "author": "Varun Khaneja",
                "date": "2026-09-11",
                "message": "fix(v2): dynamic 0-run partnership balls display and analytics scrolling flow",
                "category": "fix"
            },
            {
                "hash": "f58750b",
                "author": "Varun Khaneja",
                "date": "2026-09-11",
                "message": "ci: add v2 branch to deploy.yml push triggers for automatic github pages deployment",
                "category": "chore"
            },
            {
                "hash": "bc1831b",
                "author": "Varun Khaneja",
                "date": "2026-09-10",
                "message": "chore: allow all proxy hosts in vite config and add workflow_dispatch to deploy.yml",
                "category": "chore"
            },
            {
                "hash": "d11f188",
                "author": "Varun Khaneja",
                "date": "2026-09-10",
                "message": "feat(v2): introduce event-sourced core, pure statistical projections, and visual analytics suite",
                "category": "feat"
            },
            {
                "hash": "e09b0b1",
                "author": "Varun Khaneja",
                "date": "2026-09-10",
                "message": "Enforce single-umpire role exclusivity and automatic demotion to spectator",
                "category": "chore"
            },
            {
                "hash": "b7bb079",
                "author": "Varun Khaneja",
                "date": "2026-09-10",
                "message": "Fix multi-device umpire link resumption state loss and cloud overwrite",
                "category": "chore"
            },
            {
                "hash": "fd6519a",
                "author": "Varun Khaneja",
                "date": "2026-09-10",
                "message": "fix: rely on simple CORS requests and broaden preflight headers for live sync",
                "category": "fix"
            },
            {
                "hash": "39decc5",
                "author": "Varun Khaneja",
                "date": "2026-09-09",
                "message": "fix: eliminate live sync polling lag and stale HTTP caching on spectator refresh",
                "category": "fix"
            },
            {
                "hash": "702c712",
                "author": "Varun Khaneja",
                "date": "2026-09-09",
                "message": "fix(ui): add innings break banner and enable seamless 2nd innings player selection",
                "category": "fix"
            },
            {
                "hash": "f2b387e",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "feat(state): enforce match state immutability on completion and isolate new match sessions",
                "category": "feat"
            }
        ]
    },
    {
        "version": "v2026.09.001",
        "date": "2026-09-08",
        "timestamp": "2026-09-08T01:55:00.000Z",
        "highlights": [
            "Standardized Release Management & Semantic Tagging (v$yyyy.$mm.$nnn)",
            "Interactive Persistent Footer Release Badge with real-time version pill",
            "Integrated Release Notes Modal with searchable commit history and highlights",
            "Automated Repository Tag Generation & Push Pipeline",
            "Senior Developer Code Organization Refactor & Centralized Versioning",
            "Comprehensive Fix & Feature Contributing Guide for Developers"
        ],
        "commits": [
            {
                "hash": "c5cd759",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "Fix global reference error on delivery buttons and sanitize third-party branding",
                "category": "fix"
            },
            {
                "hash": "af24462",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "Rework UI layout with ESPNcricinfo-inspired design and responsive elements",
                "category": "feat"
            },
            {
                "hash": "409181e",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "Overhaul UI to minimalist design, lock spectator controls, and fix delivery scoring",
                "category": "feat"
            },
            {
                "hash": "78da27a",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "docs: author deployment guide and synchronize documentation for live Cloudflare endpoint",
                "category": "docs"
            },
            {
                "hash": "bb264f0",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "test(sync): add unit tests for 1-year TTL and dynamic provider switching",
                "category": "test"
            },
            {
                "hash": "12d1485",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "feat(sync): set production Cloudflare Worker endpoint and 1-year retention TTL",
                "category": "feat"
            },
            {
                "hash": "3d6b707",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "docs: synchronize README.md, PROMPT.md, and task.md with Cloudflare and Google backends",
                "category": "docs"
            },
            {
                "hash": "28e22ec",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "test: add unit tests 54-66 for live sync, modal controller, and bulk import",
                "category": "test"
            },
            {
                "hash": "5067da3",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "feat(ui): connect live stream modal, spectator mode locking, and direct bulk paste triggers",
                "category": "feat"
            },
            {
                "hash": "ca20ed0",
                "author": "Varun Khaneja",
                "date": "2026-09-08",
                "message": "fix(ui): add universal modal controller, WAI-ARIA focus guardrail, and embedded compression",
                "category": "fix"
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
