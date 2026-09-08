#!/usr/bin/env node
/**
 * Standardized Release Management & Semantic Tagging CLI Tool.
 * 
 * Computes dynamic timestamped semantic tags (v$yyyy.$mm.$nnn), compiles release notes from git commit history,
 * updates version references across files (src/version.ts, package.json, public/sw.js, index.html),
 * runs automated test suites and production builds, creates git annotated tags, and pushes tags to repository remote.
 * 
 * Usage:
 *   node scripts/release.js [options]
 * 
 * Options:
 *   --dry-run       Simulate release steps without creating git tags or pushing to remote
 *   --no-push       Create git tag locally but do not push to remote
 *   --push          Force push tag to remote (default when not in dry-run)
 *   --tag <tag>     Manually specify a custom tag (e.g., v2026.09.002) instead of auto-incrementing
 *   --skip-tests    Skip pre-release test execution
 *   --notes-only    Update src/version.ts and release documentation without creating git tags
 *   --remote <name> Specify git remote name (default: "gh-aawc" or "origin")
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const nodeEnvBin = path.join(rootDir, "node-env/node-v20.11.0-linux-x64/bin");
// Prioritize system Node 22 (in /usr/bin or PATH) before bundled node-env (Node 20.11)
const combinedPath = [process.env.PATH || "", "/usr/local/bin", "/usr/bin", "/bin", nodeEnvBin].filter(Boolean).join(":");

function run(cmd, options = {}) {
    try {
        return execSync(cmd, {
            cwd: rootDir,
            encoding: "utf8",
            env: { ...process.env, PATH: combinedPath },
            ...options
        }).trim();
    } catch (err) {
        if (options.ignoreError) return "";
        console.error("[ERROR] Command failed: " + cmd);
        if (err.stdout) console.error(err.stdout);
        if (err.stderr) console.error(err.stderr);
        throw err;
    }
}

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        dryRun: false,
        noPush: false,
        push: true,
        tag: null,
        skipTests: false,
        notesOnly: false,
        remote: null
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "--dry-run") options.dryRun = true;
        else if (arg === "--no-push") { options.noPush = true; options.push = false; }
        else if (arg === "--push") options.push = true;
        else if (arg === "--skip-tests") options.skipTests = true;
        else if (arg === "--notes-only") options.notesOnly = true;
        else if (arg === "--tag" && args[i + 1]) { options.tag = args[++i]; }
        else if (arg === "--remote" && args[i + 1]) { options.remote = args[++i]; }
    }

    if (options.dryRun) {
        options.push = false;
    }

    return options;
}

function getExistingTags() {
    const output = run('git tag -l "v*"', { ignoreError: true });
    if (!output) return [];
    return output.split("\n").map(t => t.trim()).filter(Boolean);
}

function parseSemanticVersion(tag) {
    if (typeof tag !== "string") return null;
    const match = tag.trim().match(/^v(\d{4})\.(\d{2})\.(\d{3})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const seq = parseInt(match[3], 10);
    if (isNaN(year) || isNaN(month) || isNaN(seq) || month < 1 || month > 12 || seq < 1) return null;
    return { year, month, seq };
}

function formatSemanticVersion(year, month, seq) {
    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const nnn = String(seq).padStart(3, "0");
    return `v${yyyy}.${mm}.${nnn}`;
}

function getNextSemanticVersion(existingTags, referenceDate = new Date()) {
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

function categorizeCommitMessage(message) {
    const lower = (message || "").toLowerCase().trim();
    if (/^feat(\(.*?\))?:|^add |^implement |^support /.test(lower)) return "feat";
    if (/^fix(\(.*?\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return "fix";
    if (/^docs(\(.*?\))?:|^document |update readme|update prompt|update design/.test(lower)) return "docs";
    if (/^refactor(\(.*?\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return "refactor";
    if (/^test(\(.*?\))?:|^add unit test|^add test/.test(lower)) return "test";
    if (/^perf(\(.*?\))?:|^optimize |^speed /.test(lower)) return "perf";
    return "chore";
}

function getCommitsSince(previousTag) {
    const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
    const logOutput = run(`git log ${range} --pretty=format:"%h|%an|%ad|%s" --date=short`, { ignoreError: true });
    if (!logOutput) return [];

    return logOutput.split("\n").map(line => {
        const parts = line.split("|");
        if (parts.length < 4) return null;
        const [hash, author, date, ...rest] = parts;
        const message = rest.join("|");
        return {
            hash: hash.trim(),
            author: author.trim(),
            date: date.trim(),
            message: message.trim(),
            category: categorizeCommitMessage(message)
        };
    }).filter(Boolean);
}

function generateHighlights(commits) {
    const feats = commits.filter(c => c.category === "feat").map(c => c.message.replace(/^feat(\(.*?\))?:\s*/i, ""));
    const fixes = commits.filter(c => c.category === "fix").map(c => c.message.replace(/^fix(\(.*?\))?:\s*/i, ""));
    const highlights = [];

    feats.slice(0, 5).forEach(f => highlights.push(f.charAt(0).toUpperCase() + f.slice(1)));
    fixes.slice(0, 4).forEach(fx => highlights.push(`Fix: ${fx.charAt(0).toUpperCase() + fx.slice(1)}`));

    if (highlights.length === 0) {
        highlights.push("Performance optimizations and stability improvements", "Documentation synchronization and maintenance");
    }

    return highlights;
}

function getGitRemote(preferredRemote) {
    if (preferredRemote) return preferredRemote;
    const remotesOutput = run("git remote", { ignoreError: true });
    const remotes = remotesOutput.split("\n").map(r => r.trim()).filter(Boolean);
    if (remotes.includes("gh-aawc")) return "gh-aawc";
    if (remotes.includes("origin")) return "origin";
    return remotes[0] || null;
}

async function main() {
    const options = parseArgs();
    console.log("=======================================================");
    console.log("🚀 Standardized Release Management & Semantic Tagging");
    console.log("=======================================================\n");

    // 1. Check Working Directory Cleanliness
    const status = run("git status --porcelain", { ignoreError: true });
    if (status && !options.dryRun && !options.notesOnly) {
        console.warn("[WARN] Working tree has uncommitted local modifications:");
        console.warn(status);
        console.warn("Proceeding with release preparation...\n");
    }

    // 2. Pre-release Test Execution
    if (!options.skipTests) {
        console.log("[RUN] Executing automated unit test suite...");
        try {
            run("npm test");
            console.log("[PASS] All automated unit tests passed successfully.\n");
        } catch (err) {
            console.error("[FAIL] Unit tests failed. Aborting release.");
            process.exit(1);
        }
    }

    // 3. Compute Semantic Version
    const existingTags = getExistingTags();
    const sortedTags = [...existingTags].sort((a, b) => {
        const pa = parseSemanticVersion(a);
        const pb = parseSemanticVersion(b);
        if (!pa || !pb) return 0;
        if (pa.year !== pb.year) return pa.year - pb.year;
        if (pa.month !== pb.month) return pa.month - pb.month;
        return pa.seq - pb.seq;
    });

    const previousTag = sortedTags.length > 0 ? sortedTags[sortedTags.length - 1] : null;
    const now = new Date();
    const targetTag = options.tag || getNextSemanticVersion(existingTags, now);
    const releaseDate = now.toISOString().slice(0, 10);
    const releaseTimestamp = now.toISOString();

    console.log(`[INFO] Target Release Tag: ${targetTag}`);
    console.log(`[INFO] Previous Tag:       ${previousTag || "None (Initial Release)"}`);
    console.log(`[INFO] Release Date:       ${releaseDate}\n`);

    // 4. Gather Commit History & Highlights
    const commits = getCommitsSince(previousTag);
    const highlights = generateHighlights(commits);

    console.log(`[INFO] Found ${commits.length} commits since previous release.\n`);

    // 5. Update src/version.ts
    const newReleaseObj = {
        version: targetTag,
        date: releaseDate,
        timestamp: releaseTimestamp,
        highlights,
        commits: commits.slice(0, 50)
    };

    let existingHistory = [];
    try {
        const currentVersionFile = fs.readFileSync(path.join(rootDir, "src/version.ts"), "utf8");
        const match = currentVersionFile.match(/export const RELEASE_HISTORY: ReleaseInfo\[\] = (\[[^]*?\]);/);
        if (match) {
            const parsedOld = new Function(`return (${match[1]});`)();
            if (Array.isArray(parsedOld)) {
                existingHistory = parsedOld.filter(r => r.version !== targetTag);
            }
        }
    } catch (e) {
        console.warn("[WARN] Could not parse existing RELEASE_HISTORY from src/version.ts, starting fresh.");
    }

    const updatedHistory = [newReleaseObj, ...existingHistory];

    const versionFileContent = `/**
 * Centralized Version Management & Semantic Release Metadata.
 * Single source of truth for application version, release notes, and semantic tagging (v$yyyy.$mm.$nnn).
 */

export interface CommitInfo {
    hash: string;
    author: string;
    date: string;
    message: string;
    category?: 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'perf' | 'chore';
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
export const APP_VERSION = '${targetTag}';
export const APP_RELEASE_DATE = '${releaseDate}';
export const APP_RELEASE_TIMESTAMP = '${releaseTimestamp}';

/**
 * Categorize a git commit message into conventional change types.
 */
export function categorizeCommitMessage(message: string): 'feat' | 'fix' | 'docs' | 'refactor' | 'test' | 'perf' | 'chore' {
    const lower = (message || '').toLowerCase().trim();
    if (/^feat(\\([^)]*\\))?:|^add |^implement |^support /.test(lower)) return 'feat';
    if (/^fix(\\([^)]*\\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return 'fix';
    if (/^docs(\\([^)]*\\))?:|^document |update readme|update prompt|update design/.test(lower)) return 'docs';
    if (/^refactor(\\([^)]*\\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return 'refactor';
    if (/^test(\\([^)]*\\))?:|^add unit test|^add test/.test(lower)) return 'test';
    if (/^perf(\\([^)]*\\))?:|^optimize |^speed /.test(lower)) return 'perf';
    return 'chore';
}

/**
 * Validate and parse a semantic timestamped tag in format v$yyyy.$mm.$nnn (e.g., v2026.09.001).
 */
export function parseSemanticVersion(tag: string): { year: number; month: number; seq: number } | null {
    if (typeof tag !== 'string') return null;
    const match = tag.trim().match(/^v(\\d{4})\\.(\\d{2})\\.(\\d{3})$/);
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
    const yyyy = String(year).padStart(4, '0');
    const mm = String(month).padStart(2, '0');
    const nnn = String(seq).padStart(3, '0');
    return \`v\${yyyy}.\${mm}.\${nnn}\`;
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
export const RELEASE_HISTORY: ReleaseInfo[] = ${JSON.stringify(updatedHistory, null, 4)};

export function getLatestRelease(): ReleaseInfo {
    return RELEASE_HISTORY[0];
}

export function getAllReleases(): ReleaseInfo[] {
    return [...RELEASE_HISTORY];
}
`;

    if (!options.dryRun) {
        fs.writeFileSync(path.join(rootDir, "src/version.ts"), versionFileContent);
        console.log("[MODIFIED] src/version.ts synchronized with active release metadata.");

        // 6. Update package.json
        const pkgPath = path.join(rootDir, "package.json");
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        pkg.version = targetTag.replace(/^v/, "");
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
        console.log(`[MODIFIED] package.json version updated to ${pkg.version}.`);

        // 7. Update public/sw.js
        const swPath = path.join(rootDir, "public/sw.js");
        if (fs.existsSync(swPath)) {
            let sw = fs.readFileSync(swPath, "utf8");
            sw = sw.replace(/const CACHE_NAME = ['"]cricket-scorecard-[^'"]+['"];/, `const CACHE_NAME = 'cricket-scorecard-${targetTag}';`);
            fs.writeFileSync(swPath, sw);
            console.log(`[MODIFIED] public/sw.js cache name updated to cricket-scorecard-${targetTag}.`);
        }

        // 8. Update index.html footer version if present
        const indexPath = path.join(rootDir, "index.html");
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, "utf8");
            html = html.replace(/<span id="footer-version-text">[^<]*<\/span>/, `<span id="footer-version-text">${targetTag}</span>`);
            fs.writeFileSync(indexPath, html);
            console.log(`[MODIFIED] index.html footer badge updated to ${targetTag}.`);
        }
    } else {
        console.log("[DRY-RUN] Skipped file writes.");
    }

    // 9. Execute Production Build
    if (!options.dryRun) {
        console.log("\n[RUN] Building production assets...");
        try {
            run("npm run build");
            console.log("[PASS] Production build and service worker injection succeeded.\n");
        } catch (err) {
            console.error("[FAIL] Production build failed.");
            process.exit(1);
        }
    }

    // 10. Git Tagging & Pushing
    if (!options.dryRun && !options.notesOnly) {
        const tagMessage = `Release ${targetTag}: ${highlights[0] || "Cricket Scorecard PWA Release"}`;
        console.log(`[RUN] Creating git annotated tag ${targetTag}...`);
        run(`git tag -a ${targetTag} -m "${tagMessage}"`);
        console.log(`[TAGGED] Successfully created git tag ${targetTag}.\n`);

        if (options.push && !options.noPush) {
            const remote = getGitRemote(options.remote);
            if (remote) {
                console.log(`[RUN] Pushing tag ${targetTag} to remote "${remote}"...`);
                try {
                    run(`git push ${remote} ${targetTag}`);
                    console.log(`[PUSHED] Tag ${targetTag} pushed successfully to ${remote}.\n`);
                } catch (pushErr) {
                    console.warn(`[WARN] Could not push tag to remote ${remote}. You can push manually using: git push ${remote} ${targetTag}`);
                }
            } else {
                console.warn("[WARN] No git remote found. Tag created locally.");
            }
        } else {
            console.log(`[INFO] Remote push skipped (--no-push or --dry-run active).\n`);
        }
    }

    console.log("=======================================================");
    console.log(`🎉 Release ${targetTag} Completed Successfully!`);
    console.log("=======================================================");
}

main().catch(err => {
    console.error("[ERROR] Release script encountered fatal exception:", err);
    process.exit(1);
});
