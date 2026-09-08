#!/usr/bin/env node
/**
 * Release Notes Extraction Helper for CI / GitHub Actions & Release Automation.
 *
 * Reads release metadata from src/version.ts and outputs formatted Markdown
 * release notes for GitHub Releases and changelogs.
 *
 * Usage:
 *   node scripts/extract-release-notes.js [--tag <tag>] [--output <filepath>]
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function parseArgs() {
    const args = process.argv.slice(2);
    let tag = null;
    let output = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--tag" && args[i + 1]) {
            tag = args[++i];
        } else if (args[i] === "--output" && args[i + 1]) {
            output = args[++i];
        }
    }
    return { tag, output };
}

function extractReleasesFromVersionTs() {
    const versionTsPath = path.join(rootDir, "src/version.ts");
    if (!fs.existsSync(versionTsPath)) {
        return [];
    }
    const content = fs.readFileSync(versionTsPath, "utf8");
    const match = content.match(/export const RELEASE_HISTORY:\s*ReleaseInfo\[\]\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return [];
    try {
        const fn = new Function("return (" + match[1] + ");");
        return fn();
    } catch (e) {
        console.error("[WARN] Failed to parse RELEASE_HISTORY:", e.message);
        return [];
    }
}

function main() {
    const { tag, output } = parseArgs();
    const releases = extractReleasesFromVersionTs();
    
    let targetRelease = null;
    if (tag) {
        targetRelease = releases.find(r => r.version === tag || r.version === `v${tag}` || `v${r.version}` === tag);
    }
    if (!targetRelease && releases.length > 0) {
        targetRelease = releases[0];
    }

    let markdown = "";
    if (targetRelease) {
        const releaseDate = targetRelease.date || targetRelease.releaseDate || "";
        const title = releaseDate ? `Release ${targetRelease.version} (${releaseDate})` : `Release ${targetRelease.version}`;
        markdown += `## ${title}\n\n`;
        if (targetRelease.highlights && targetRelease.highlights.length > 0) {
            markdown += `### Key Highlights\n\n`;
            for (const h of targetRelease.highlights) {
                markdown += `- ${h}\n`;
            }
            markdown += `\n`;
        }
        if (targetRelease.commits && targetRelease.commits.length > 0) {
            markdown += `### Changes & Improvements\n\n`;
            for (const c of targetRelease.commits) {
                const badge = `[${c.category.toUpperCase()}]`;
                markdown += `- **${badge}** ${c.message} (\`${c.hash}\`)\n`;
            }
            markdown += `\n`;
        }
    } else {
        const currentTag = tag || "v2026.09.001";
        markdown = `## Release ${currentTag}\n\n- Production release and automated build.\n`;
    }

    if (output) {
        const outPath = path.isAbsolute(output) ? output : path.join(rootDir, output);
        fs.writeFileSync(outPath, markdown);
        console.log(`[SUCCESS] Release notes written to ${outPath}`);
    } else {
        process.stdout.write(markdown);
    }
}

main();
