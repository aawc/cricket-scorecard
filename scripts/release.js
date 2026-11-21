#!/usr/bin/env node
/**
 * Standardized Release Management & Semantic Tagging CLI Tool.
 *
 * Computes dynamic timestamped semantic tags (v$yyyy.$mm.$nnn), evaluates doc-only skip gates,
 * compiles release notes from git commit history, updates version references across files
 * (src/version.ts, package.json, public/sw.js, index.html), runs automated test suites and
 * production builds, commits release metadata BEFORE creating annotated git tags, and pushes
 * commits/tags to the preferred repository remote.
 *
 * Usage:
 *   node scripts/release.js [options]
 *
 * Options:
 *   --ci              Run in non-interactive CI mode (evaluates shouldCutRelease gate and writes GITHUB_OUTPUT)
 *   --should-release  Evaluate whether HEAD warrants a new semantic release and exit without mutating files
 *   --dry-run         Simulate release steps without modifying files, committing, tagging, or pushing
 *   --no-push         Commit and create git tag locally without pushing to remote
 *   --push            Push release commit and tag to remote (default when not in --dry-run or --no-push)
 *   --tag <tag>       Explicitly specify a semantic tag (e.g., v2026.09.002) instead of auto-incrementing
 *   --skip-tests      Skip pre-release unit test execution
 *   --notes-only      Update release files and build without creating git commits or tags
 *   --remote <name>   Explicitly specify git remote name (defaults to github-aawc > gh-aawc > origin)
 */

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const scriptRootDir = path.resolve(__dirname, "..");

const nodeEnvBin = path.join(scriptRootDir, "node-env/node-v20.11.0-linux-x64/bin");
const combinedPath = [
    process.env.PATH || "",
    "/usr/local/bin",
    "/usr/bin",
    "/bin",
    nodeEnvBin
].filter(Boolean).join(path.delimiter);

function resolveRepoDir(explicitCwd = process.cwd()) {
    try {
        const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
            cwd: explicitCwd,
            encoding: "utf8",
            env: { ...process.env, PATH: combinedPath },
            stdio: ["ignore", "pipe", "pipe"]
        }).trim();
        if (top) return top;
    } catch (err) {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.warn(`[WARN] git rev-parse --show-toplevel failed in ${explicitCwd} (${detail}); falling back to cwd.`);
    }
    return path.resolve(explicitCwd);
}

function runGit(args, options = {}) {
    const cwd = options.cwd || process.cwd();
    try {
        return execFileSync("git", args, {
            cwd,
            encoding: "utf8",
            env: { ...process.env, PATH: combinedPath, ...(options.env || {}) },
            stdio: ["ignore", "pipe", "pipe"]
        }).trim();
    } catch (err) {
        if (options.ignoreError) return "";
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.error(`[FAIL] Git command failed (git ${args.join(" ")}): ${detail}`);
        if (err && typeof err === "object" && "stdout" in err && err.stdout) console.error(String(err.stdout));
        if (err && typeof err === "object" && "stderr" in err && err.stderr) console.error(String(err.stderr));
        throw err;
    }
}

function resolveNpmCommand() {
    const npmBinName = process.platform === "win32" ? "npm.cmd" : "npm";
    const pathDirs = combinedPath.split(path.delimiter).filter(Boolean);
    for (const dir of pathDirs) {
        const candidate = path.join(dir, npmBinName);
        if (fs.existsSync(candidate)) {
            return { bin: candidate, prefixArgs: [] };
        }
    }
    for (const corepackPath of ["/bin/corepack", "/usr/bin/corepack", "/usr/local/bin/corepack"]) {
        if (fs.existsSync(corepackPath)) {
            return { bin: corepackPath, prefixArgs: ["npm"] };
        }
    }
    return { bin: npmBinName, prefixArgs: [] };
}

function runNpm(npmArgs, options = {}) {
    const cwd = options.cwd || process.cwd();
    const { bin, prefixArgs } = resolveNpmCommand();
    const fullArgs = [...prefixArgs, ...npmArgs];
    const localNodeBin = path.join(cwd, "node_modules", ".bin");
    const npmPath = [localNodeBin, combinedPath].filter(Boolean).join(path.delimiter);
    try {
        return execFileSync(bin, fullArgs, {
            cwd,
            encoding: "utf8",
            env: { ...process.env, ...(options.env || {}), PATH: npmPath },
            shell: process.platform === "win32",
            stdio: ["ignore", "pipe", "pipe"]
        }).trim();
    } catch (err) {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.error(`[FAIL] npm command failed (${bin} ${fullArgs.join(" ")}): ${detail}`);
        if (err && typeof err === "object" && "stdout" in err && err.stdout) console.error(String(err.stdout));
        if (err && typeof err === "object" && "stderr" in err && err.stderr) console.error(String(err.stderr));
        throw err;
    }
}

function writeGithubOutputs(entries) {
    const outputPath = process.env.GITHUB_OUTPUT;
    if (!outputPath) return;
    const payload = Object.entries(entries)
        .map(([key, value]) => `${key}=${value ?? ""}`)
        .join("\n") + "\n";
    fs.appendFileSync(outputPath, payload, "utf8");
}

export function parseArgs(argv = process.argv.slice(2)) {
    const options = {
        ci: false,
        shouldRelease: false,
        dryRun: false,
        noPush: false,
        push: true,
        tag: null,
        skipTests: false,
        notesOnly: false,
        remote: null
    };

    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === "--ci") options.ci = true;
        else if (arg === "--should-release") options.shouldRelease = true;
        else if (arg === "--dry-run") options.dryRun = true;
        else if (arg === "--no-push") { options.noPush = true; options.push = false; }
        else if (arg === "--push") { options.push = true; options.noPush = false; }
        else if (arg === "--skip-tests") options.skipTests = true;
        else if (arg === "--notes-only") options.notesOnly = true;
        else if (arg === "--tag" && argv[i + 1]) { options.tag = argv[++i]; }
        else if (arg.startsWith("--tag=")) { options.tag = arg.slice("--tag=".length); }
        else if (arg === "--remote" && argv[i + 1]) { options.remote = argv[++i]; }
        else if (arg.startsWith("--remote=")) { options.remote = arg.slice("--remote=".length); }
    }

    if (options.dryRun || options.noPush) {
        options.push = false;
    }

    return options;
}

export function parseSemanticVersion(tag) {
    if (typeof tag !== "string") return null;
    const match = tag.trim().match(/^v(\d{4})\.(\d{2})\.(\d{3})$/);
    if (!match) return null;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const seq = parseInt(match[3], 10);
    if (isNaN(year) || isNaN(month) || isNaN(seq) || month < 1 || month > 12 || seq < 1) return null;
    return { year, month, seq };
}

export function formatSemanticVersion(year, month, seq) {
    const yyyy = String(year).padStart(4, "0");
    const mm = String(month).padStart(2, "0");
    const nnn = String(seq).padStart(3, "0");
    return `v${yyyy}.${mm}.${nnn}`;
}

export function getNextSemanticVersion(existingTags = [], referenceDate = new Date()) {
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

export function categorizeCommitMessage(message) {
    const lower = (message || "").toLowerCase().trim();
    if (/^(chore|ci|build)(\([^)]*\))?:|^bump /.test(lower)) return "chore";
    if (/^docs(\([^)]*\))?:|^document |^update (readme|agents|claude|gemini|contributing|security|design|docs)/.test(lower)) return "docs";
    if (/^test(\([^)]*\))?:|^add (unit )?test/.test(lower)) return "test";
    if (/^feat(\([^)]*\))?:|^add |^implement |^support /.test(lower)) return "feat";
    if (/^fix(\([^)]*\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return "fix";
    if (/^refactor(\([^)]*\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return "refactor";
    return /^perf(\([^)]*\))?:|^optimize |^speed /.test(lower) ? "perf" : "chore";
}

export function resolvePreferredRemote(remotes = [], preferredRemote = null) {
    if (preferredRemote && typeof preferredRemote === "string" && preferredRemote.trim()) {
        return preferredRemote.trim();
    }
    const list = Array.isArray(remotes)
        ? remotes.map(r => String(r).trim()).filter(Boolean)
        : [];
    for (const candidate of ["github-aawc", "gh-aawc", "origin"]) {
        if (list.includes(candidate)) {
            return candidate;
        }
    }
    return list[0] || null;
}

export function isDocOrCommunityOnlyPath(filePath) {
    if (typeof filePath !== "string") return false;
    const normalized = filePath.trim().replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized) return false;

    if (normalized.startsWith(".github/workflows/")) return false;
    if (normalized.startsWith("docs/")) return true;

    if (
        normalized === ".github/copilot-instructions.md" ||
        normalized.startsWith(".github/ISSUE_TEMPLATE/") ||
        normalized.startsWith(".github/DISCUSSION_TEMPLATE/") ||
        normalized.startsWith(".github/PULL_REQUEST_TEMPLATE") ||
        normalized === ".github/CODEOWNERS" ||
        normalized === ".github/FUNDING.yml" ||
        normalized === ".github/SECURITY.md" ||
        normalized === ".github/CONTRIBUTING.md"
    ) {
        return true;
    }

    if (/\.md$/i.test(normalized)) return true;
    if (/^(LICENSE|NOTICE)(\.[a-z0-9]+)?$/i.test(normalized)) return true;

    return false;
}

export function shouldCutRelease({ changedFiles = [], headMessage = "", tagsAtHead = [] } = {}) {
    const subject = String(headMessage || "").split(/\r?\n/)[0].trim();
    const lowerSubject = subject.toLowerCase();
    if (
        lowerSubject.startsWith("chore(release):") ||
        lowerSubject.includes("[skip release]") ||
        lowerSubject.includes("[skip ci]")
    ) {
        return false;
    }

    if (Array.isArray(tagsAtHead) && tagsAtHead.some(t => parseSemanticVersion(t) !== null)) {
        return false;
    }

    const files = Array.isArray(changedFiles)
        ? changedFiles.map(f => String(f).trim()).filter(Boolean)
        : [];
    if (files.length === 0) {
        return false;
    }

    return files.some(file => !isDocOrCommunityOnlyPath(file));
}

function getExistingTags(cwd) {
    const output = runGit(["tag", "-l", "v*"], { cwd, ignoreError: true });
    if (!output) return [];
    return output.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
}

function getSortedSemanticTags(existingTags) {
    return existingTags
        .filter(t => parseSemanticVersion(t) !== null)
        .sort((a, b) => {
            const pa = parseSemanticVersion(a);
            const pb = parseSemanticVersion(b);
            if (!pa || !pb) return 0;
            if (pa.year !== pb.year) return pa.year - pb.year;
            if (pa.month !== pb.month) return pa.month - pb.month;
            return pa.seq - pb.seq;
        });
}

function getCommitsSince(previousTag, cwd) {
    const range = previousTag ? `${previousTag}..HEAD` : "HEAD";
    const logOutput = runGit(["log", range, "--pretty=format:%h|%an|%ad|%s", "--date=short"], { cwd, ignoreError: true });
    if (!logOutput) return [];

    return logOutput.split(/\r?\n/).map(line => {
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
    const feats = commits.filter(c => c.category === "feat").map(c => c.message.replace(/^feat(\([^)]*\))?:\s*/i, ""));
    const fixes = commits.filter(c => c.category === "fix").map(c => c.message.replace(/^fix(\([^)]*\))?:\s*/i, ""));
    const highlights = [];

    for (const f of feats.slice(0, 5)) {
        highlights.push(f.charAt(0).toUpperCase() + f.slice(1));
    }
    for (const fx of fixes.slice(0, 4)) {
        highlights.push(`Fix: ${fx.charAt(0).toUpperCase() + fx.slice(1)}`);
    }

    if (highlights.length === 0) {
        highlights.push("Performance optimizations and stability improvements", "Documentation synchronization and maintenance");
    }

    return highlights;
}

function getGitRemote(preferredRemote, cwd) {
    const remotesOutput = runGit(["remote"], { cwd, ignoreError: true });
    const remotes = remotesOutput ? remotesOutput.split(/\r?\n/).map(r => r.trim()).filter(Boolean) : [];
    return resolvePreferredRemote(remotes, preferredRemote);
}

function buildVersionTsContent(targetTag, releaseDate, releaseTimestamp, updatedHistory) {
    return [
        "/**",
        " * Centralized Version Management & Semantic Release Metadata.",
        " * Single source of truth for application version, release notes, and semantic tagging (v$yyyy.$mm.$nnn).",
        " */",
        "",
        "export interface CommitInfo {",
        "    hash: string;",
        "    author: string;",
        "    date: string;",
        "    message: string;",
        "    category?: \"feat\" | \"fix\" | \"docs\" | \"refactor\" | \"test\" | \"perf\" | \"chore\";",
        "}",
        "",
        "export interface ReleaseInfo {",
        "    version: string;",
        "    date: string;",
        "    timestamp: string;",
        "    highlights: string[];",
        "    commits: CommitInfo[];",
        "}",
        "",
        "/**",
        " * Active application version formatted as timestamped semantic tag: v$yyyy.$mm.$nnn",
        " */",
        `export const APP_VERSION = "${targetTag}";`,
        `export const APP_RELEASE_DATE = "${releaseDate}";`,
        `export const APP_RELEASE_TIMESTAMP = "${releaseTimestamp}";`,
        "",
        "/**",
        " * Categorize a git commit message into conventional change types.",
        " */",
        "export function categorizeCommitMessage(message: string): \"feat\" | \"fix\" | \"docs\" | \"refactor\" | \"test\" | \"perf\" | \"chore\" {",
        "    const lower = (message || \"\").toLowerCase().trim();",
        "    if (/^(chore|ci|build)(\\([^)]*\\))?:|^bump /.test(lower)) return \"chore\";",
        "    if (/^docs(\\([^)]*\\))?:|^document |^update (readme|agents|claude|gemini|contributing|security|design|docs)/.test(lower)) return \"docs\";",
        "    if (/^test(\\([^)]*\\))?:|^add (unit )?test/.test(lower)) return \"test\";",
        "    if (/^feat(\\([^)]*\\))?:|^add |^implement |^support /.test(lower)) return \"feat\";",
        "    if (/^fix(\\([^)]*\\))?:|^resolve |^correct |^restore |^heal /.test(lower)) return \"fix\";",
        "    if (/^refactor(\\([^)]*\\))?:|^reorganize |^clean |^rework |^deconstruct /.test(lower)) return \"refactor\";",
        "    return /^perf(\\([^)]*\\))?:|^optimize |^speed /.test(lower) ? \"perf\" : \"chore\";",
        "}",
        "",
        "/**",
        " * Validate and parse a semantic timestamped tag in format v$yyyy.$mm.$nnn (e.g., v2026.09.001).",
        " */",
        "export function parseSemanticVersion(tag: string): { year: number; month: number; seq: number } | null {",
        "    if (typeof tag !== \"string\") return null;",
        "    const match = tag.trim().match(/^v(\\d{4})\\.(\\d{2})\\.(\\d{3})$/);",
        "    if (!match) return null;",
        "    const year = parseInt(match[1], 10);",
        "    const month = parseInt(match[2], 10);",
        "    const seq = parseInt(match[3], 10);",
        "    if (isNaN(year) || isNaN(month) || isNaN(seq) || month < 1 || month > 12 || seq < 1) {",
        "        return null;",
        "    }",
        "    return { year, month, seq };",
        "}",
        "",
        "/**",
        " * Format year, month, and sequence number into standard semantic tag string.",
        " */",
        "export function formatSemanticVersion(year: number, month: number, seq: number): string {",
        "    const yyyy = String(year).padStart(4, \"0\");",
        "    const mm = String(month).padStart(2, \"0\");",
        "    const nnn = String(seq).padStart(3, \"0\");",
        "    return `v${yyyy}.${mm}.${nnn}`;",
        "}",
        "",
        "/**",
        " * Compute the next sequential semantic release tag based on current year/month and existing tags.",
        " */",
        "export function getNextSemanticVersion(existingTags: string[] = [], referenceDate: Date = new Date()): string {",
        "    const currentYear = referenceDate.getUTCFullYear();",
        "    const currentMonth = referenceDate.getUTCMonth() + 1;",
        "",
        "    let maxSeq = 0;",
        "    for (const tag of existingTags) {",
        "        const parsed = parseSemanticVersion(tag);",
        "        if (parsed && parsed.year === currentYear && parsed.month === currentMonth) {",
        "            if (parsed.seq > maxSeq) {",
        "                maxSeq = parsed.seq;",
        "            }",
        "        }",
        "    }",
        "",
        "    return formatSemanticVersion(currentYear, currentMonth, maxSeq + 1);",
        "}",
        "",
        "/**",
        " * Structured Release History containing all releases, highlights, and commit records.",
        " */",
        `export const RELEASE_HISTORY: ReleaseInfo[] = ${JSON.stringify(updatedHistory, null, 4)};`,
        "",
        "export function getLatestRelease(): ReleaseInfo {",
        "    return RELEASE_HISTORY[0];",
        "}",
        "",
        "export function getAllReleases(): ReleaseInfo[] {",
        "    return [...RELEASE_HISTORY];",
        "}",
        ""
    ].join("\n");
}

async function main() {
    const options = parseArgs();
    const repoDir = resolveRepoDir();

    console.log("=======================================================");
    console.log("[INFO] Standardized Release Management & Semantic Tagging");
    console.log("=======================================================\n");

    const existingTags = getExistingTags(repoDir);
    const sortedTags = getSortedSemanticTags(existingTags);
    const previousTag = sortedTags.length > 0 ? sortedTags[sortedTags.length - 1] : null;
    const headSha = runGit(["rev-parse", "HEAD"], { cwd: repoDir, ignoreError: true });
    const headMessage = runGit(["log", "-n", "1", "--pretty=%B", "HEAD"], { cwd: repoDir, ignoreError: true });
    const tagsAtHeadRaw = runGit(["tag", "--points-at", "HEAD"], { cwd: repoDir, ignoreError: true });
    const tagsAtHead = tagsAtHeadRaw ? tagsAtHeadRaw.split(/\r?\n/).map(t => t.trim()).filter(Boolean) : [];

    const diffRaw = previousTag
        ? runGit(["diff", "--name-only", `${previousTag}..HEAD`], { cwd: repoDir, ignoreError: true })
        : runGit(["ls-files"], { cwd: repoDir, ignoreError: true });
    const changedFiles = diffRaw ? diffRaw.split(/\r?\n/).map(f => f.trim()).filter(Boolean) : [];

    const releasable = options.tag
        ? true
        : shouldCutRelease({ changedFiles, headMessage, tagsAtHead });

    if (options.shouldRelease) {
        console.log(`[INFO] should_release=${releasable}`);
        writeGithubOutputs({
            should_release: String(releasable),
            skipped: String(!releasable),
            tag: previousTag || "",
            release_sha: headSha
        });
        return;
    }

    if (options.ci && !releasable) {
        writeGithubOutputs({
            skipped: "true",
            tag: previousTag || "",
            release_sha: headSha
        });
        console.log("[INFO] Skipping semantic release (no releasable code changes or already tagged/release commit).");
        return;
    }

    // 1. Check Working Directory Cleanliness
    const status = runGit(["status", "--porcelain"], { cwd: repoDir, ignoreError: true });
    if (status && !options.dryRun && !options.notesOnly) {
        console.warn("[WARN] Working tree has uncommitted local modifications:");
        console.warn(status);
        console.warn("[INFO] Proceeding with release preparation...\n");
    }

    // 2. Pre-release Test Execution
    if (!options.skipTests) {
        console.log("[RUN] Executing automated unit test suite...");
        try {
            runNpm(["test"], { cwd: repoDir });
            console.log("[PASS] All automated unit tests passed successfully.\n");
        } catch (err) {
            const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            console.error(`[FAIL] Unit tests failed (${detail}). Aborting release.`);
            process.exit(1);
        }
    }

    // 3. Compute & Validate Semantic Version
    const now = new Date();
    const targetTag = options.tag || getNextSemanticVersion(existingTags, now);
    if (!parseSemanticVersion(targetTag)) {
        console.error(`[FAIL] Invalid target semantic tag "${targetTag}". Expected format v$yyyy.$mm.$nnn.`);
        process.exit(1);
    }
    const releaseDate = now.toISOString().slice(0, 10);
    const releaseTimestamp = now.toISOString();

    console.log(`[INFO] Target Release Tag: ${targetTag}`);
    console.log(`[INFO] Previous Tag:       ${previousTag || "None (Initial Release)"}`);
    console.log(`[INFO] Release Date:       ${releaseDate}\n`);

    // 4. Gather Commit History & Highlights
    const commits = getCommitsSince(previousTag, repoDir);
    const highlights = generateHighlights(commits);
    console.log(`[INFO] Found ${commits.length} commits since previous release.\n`);

    // 5. Prepare src/version.ts content
    const newReleaseObj = {
        version: targetTag,
        date: releaseDate,
        timestamp: releaseTimestamp,
        highlights,
        commits: commits.slice(0, 50)
    };

    let existingHistory = [];
    const versionTsPath = path.join(repoDir, "src/version.ts");
    try {
        if (fs.existsSync(versionTsPath)) {
            const currentVersionFile = fs.readFileSync(versionTsPath, "utf8");
            const match = currentVersionFile.match(/export const RELEASE_HISTORY:\s*ReleaseInfo\[\]\s*=\s*(\[\s*\]|\[[\s\S]*?\n\]);/);
            if (match) {
                const parsedOld = new Function(`return (${match[1]});`)();
                if (Array.isArray(parsedOld)) {
                    existingHistory = parsedOld.filter(r => r.version !== targetTag);
                }
            }
        }
    } catch (err) {
        const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        console.warn(`[WARN] Could not parse existing RELEASE_HISTORY from src/version.ts (${detail}); starting fresh.`);
    }

    const updatedHistory = [newReleaseObj, ...existingHistory];
    const versionFileContent = buildVersionTsContent(targetTag, releaseDate, releaseTimestamp, updatedHistory);

    if (!options.dryRun) {
        fs.mkdirSync(path.dirname(versionTsPath), { recursive: true });
        fs.writeFileSync(versionTsPath, versionFileContent, "utf8");
        console.log("[MODIFIED] src/version.ts synchronized with active release metadata.");

        // 6. Update package.json
        const pkgPath = path.join(repoDir, "package.json");
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
            pkg.version = targetTag.replace(/^v/, "");
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
            console.log(`[MODIFIED] package.json version updated to ${pkg.version}.`);
        }

        // 7. Update public/sw.js
        const swPath = path.join(repoDir, "public/sw.js");
        if (fs.existsSync(swPath)) {
            let sw = fs.readFileSync(swPath, "utf8");
            sw = sw.replace(/const CACHE_NAME = ['"]cricket-scorecard-[^'"]+['"];/, `const CACHE_NAME = 'cricket-scorecard-${targetTag}';`);
            fs.writeFileSync(swPath, sw, "utf8");
            console.log(`[MODIFIED] public/sw.js cache name updated to cricket-scorecard-${targetTag}.`);
        }

        // 8. Update index.html footer version if present
        const indexPath = path.join(repoDir, "index.html");
        if (fs.existsSync(indexPath)) {
            let html = fs.readFileSync(indexPath, "utf8");
            html = html.replace(/<span id="footer-version-text">[^<]*<\/span>/, `<span id="footer-version-text">${targetTag}</span>`);
            fs.writeFileSync(indexPath, html, "utf8");
            console.log(`[MODIFIED] index.html footer badge updated to ${targetTag}.`);
        }

        // 9. Execute Production Build
        console.log("\n[RUN] Building production assets...");
        try {
            runNpm(["run", "build"], { cwd: repoDir });
            console.log("[PASS] Production build and service worker injection succeeded.\n");
        } catch (err) {
            const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            console.error(`[FAIL] Production build failed (${detail}).`);
            process.exit(1);
        }
    } else {
        console.log("[DRY-RUN] Skipped file writes and production build.");
    }

    // 10. Git Commit (BEFORE Tag), Annotated Tagging & Remote Push
    if (!options.dryRun && !options.notesOnly) {
        if (options.ci) {
            const configuredName = runGit(["config", "user.name"], { cwd: repoDir, ignoreError: true });
            const configuredEmail = runGit(["config", "user.email"], { cwd: repoDir, ignoreError: true });
            if (!configuredName) {
                runGit(["config", "user.name", "github-actions[bot]"], { cwd: repoDir });
            }
            if (!configuredEmail) {
                runGit(["config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], { cwd: repoDir });
            }
        }

        const candidateReleaseFiles = ["src/version.ts", "package.json", "public/sw.js", "index.html"]
            .filter(rel => fs.existsSync(path.join(repoDir, rel)));
        if (candidateReleaseFiles.length > 0) {
            runGit(["add", "--", ...candidateReleaseFiles], { cwd: repoDir });
        }

        const stagedDiff = runGit(["diff", "--cached", "--name-only"], { cwd: repoDir, ignoreError: true });
        if (stagedDiff) {
            const commitMessage = options.ci
                ? `chore(release): ${targetTag} [skip ci]`
                : `chore(release): ${targetTag}`;
            console.log(`[RUN] Committing synchronized release metadata ("${commitMessage}")...`);
            runGit(["commit", "-m", commitMessage], { cwd: repoDir });
            console.log(`[PASS] Created release commit for ${targetTag}.`);
        }

        const tagMessage = `Release ${targetTag}: ${highlights[0] || "Cricket Scorecard PWA Release"}`;
        console.log(`[RUN] Creating git annotated tag ${targetTag}...`);
        runGit(["tag", "-a", targetTag, "-m", tagMessage], { cwd: repoDir });
        console.log(`[PASS] Successfully created git tag ${targetTag}.\n`);

        const releaseSha = runGit(["rev-parse", "HEAD"], { cwd: repoDir });

        if (options.push && !options.noPush) {
            const remote = getGitRemote(options.remote, repoDir);
            if (remote) {
                const branchRef = options.ci ? "HEAD:main" : "HEAD";
                console.log(`[RUN] Pushing ${branchRef} and tag ${targetTag} to remote "${remote}"...`);
                try {
                    runGit(["push", remote, branchRef], { cwd: repoDir });
                    runGit(["push", remote, targetTag], { cwd: repoDir });
                    console.log(`[PASS] Release commit and tag ${targetTag} pushed to ${remote}.\n`);
                } catch (pushErr) {
                    const detail = pushErr instanceof Error ? `${pushErr.name}: ${pushErr.message}` : String(pushErr);
                    if (options.ci) {
                        console.error(`[FAIL] Failed to push release commit/tag to remote ${remote}: ${detail}`);
                        process.exit(1);
                    }
                    console.warn(`[WARN] Could not push to remote ${remote} (${detail}). Push manually with: git push ${remote} HEAD && git push ${remote} ${targetTag}`);
                }
            } else if (options.ci) {
                console.error("[FAIL] Push requested in --ci mode, but no git remote is configured.");
                process.exit(1);
            } else {
                console.warn("[WARN] No git remote found. Commit and tag created locally.");
            }
        } else {
            console.log("[INFO] Remote push skipped (--no-push or --dry-run active).\n");
        }

        writeGithubOutputs({
            skipped: "false",
            tag: targetTag,
            release_sha: releaseSha
        });
    }

    console.log("=======================================================");
    console.log(`[PASS] Release ${targetTag} Completed Successfully!`);
    console.log("=======================================================");
}

const isMainModule = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMainModule) {
    main().catch(err => {
        console.error("[FAIL] Release script encountered fatal exception:", err);
        process.exit(1);
    });
}
