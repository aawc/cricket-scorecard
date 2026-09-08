/**
 * Release Notes Component & Modal Controller.
 * Renders structured release notes, highlights, and commit history with full WAI-ARIA and colorblind accessibility.
 */

import { APP_VERSION, APP_RELEASE_DATE, RELEASE_HISTORY, ReleaseInfo, CommitInfo } from "./version.js";
import { openModal, closeModal } from "./modal.js";

const GITHUB_REPO_URL = "https://github.com/aawc/cricket-scorecard";

/**
 * Generate accessible HTML markup for the Release Notes modal body.
 */
export function renderReleaseNotesHTML(releases: ReleaseInfo[] = RELEASE_HISTORY): string {
    if (!releases || releases.length === 0) {
        return `<div class="release-empty-state"><p>No release notes available.</p></div>`;
    }

    const latest = releases[0];
    const olderReleases = releases.slice(1);

    const escapeHtml = (str: string) => {
        return (str || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    };

    const renderCommitBadge = (category?: string) => {
        const cat = (category || "chore").toUpperCase();
        let badgeClass = "badge-cat-chore";
        if (cat === "FEAT") badgeClass = "badge-cat-feat";
        else if (cat === "FIX") badgeClass = "badge-cat-fix";
        else if (cat === "DOCS") badgeClass = "badge-cat-docs";
        else if (cat === "TEST") badgeClass = "badge-cat-test";
        else if (cat === "PERF") badgeClass = "badge-cat-perf";
        else if (cat === "REFACTOR") badgeClass = "badge-cat-refactor";

        return `<span class="commit-cat-badge ${badgeClass}">[${cat}]</span>`;
    };

    const renderCommitList = (commits: CommitInfo[]) => {
        if (!commits || commits.length === 0) {
            return `<p class="text-muted small my-2">No commit details recorded for this release.</p>`;
        }

        return `
            <div class="release-commits-stream" role="list">
                ${commits.map(c => `
                    <div class="release-commit-card" role="listitem">
                        <div class="commit-header-row">
                            <div class="commit-title-wrap">
                                ${renderCommitBadge(c.category)}
                                <span class="commit-msg-text">${escapeHtml(c.message)}</span>
                            </div>
                            <a href="${GITHUB_REPO_URL}/commit/${encodeURIComponent(c.hash)}" 
                               target="_blank" 
                               rel="noopener" 
                               class="commit-hash-pill" 
                               title="View commit ${escapeHtml(c.hash)} on GitHub">
                                ${escapeHtml(c.hash)} ↗
                            </a>
                        </div>
                        <div class="commit-meta-row">
                            <span class="commit-author">👤 ${escapeHtml(c.author)}</span>
                            <span class="commit-dot">&bull;</span>
                            <span class="commit-date">📅 ${escapeHtml(c.date)}</span>
                        </div>
                    </div>
                `).join("")}
            </div>
        `;
    };

    const renderReleaseCard = (rel: ReleaseInfo, isLatest: boolean) => {
        return `
            <div class="release-card ${isLatest ? "latest-release" : "prior-release"}">
                <div class="release-card-hero">
                    <div class="release-version-group">
                        <span class="release-badge-pill">${escapeHtml(rel.version)}</span>
                        ${isLatest ? `<span class="badge-status-latest">[LATEST RELEASE]</span>` : ""}
                    </div>
                    <div class="release-date-text">
                        <span>Released: ${escapeHtml(rel.date)}</span>
                    </div>
                </div>

                <div class="release-highlights-box">
                    <h6 class="release-section-heading">✨ Key Highlights & Capabilities</h6>
                    <ul class="release-highlights-list">
                        ${(rel.highlights || []).map(h => `
                            <li class="highlight-item">
                                <span class="highlight-bullet">✓</span>
                                <span class="highlight-text">${escapeHtml(h)}</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>

                <div class="release-commits-box">
                    <h6 class="release-section-heading">📜 Commit History & Change Manifest (${rel.commits ? rel.commits.length : 0} commits)</h6>
                    ${renderCommitList(rel.commits)}
                </div>
            </div>
        `;
    };

    let html = `
        <div class="release-notes-wrapper">
            ${renderReleaseCard(latest, true)}
    `;

    if (olderReleases.length > 0) {
        html += `
            <div class="older-releases-section">
                <h5 class="older-releases-heading">📦 Previous Releases</h5>
                ${olderReleases.map(r => renderReleaseCard(r, false)).join("")}
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Open the release notes modal and populate its content dynamically.
 */
export function openReleaseNotesModal(triggerEl?: HTMLElement | null): void {
    if (typeof document === "undefined") return;

    const container = document.getElementById("release-notes-container");
    if (container) {
        container.innerHTML = renderReleaseNotesHTML(RELEASE_HISTORY);
    }

    openModal("releaseNotesModal", triggerEl);
}

/**
 * Initialize Release Notes modal DOM elements, footer badge event listeners, and action buttons.
 */
export function initReleaseNotesModal(): void {
    if (typeof document === "undefined") return;

    const footerBadge = document.getElementById("footer-release-badge");
    if (footerBadge) {
        footerBadge.addEventListener("click", (e) => {
            e.preventDefault();
            openReleaseNotesModal(footerBadge);
        });
    }

    const versionText = document.getElementById("footer-version-text");
    if (versionText) {
        versionText.textContent = APP_VERSION;
    }

    const reportIssueBtn = document.getElementById("release-report-issue-btn");
    if (reportIssueBtn) {
        reportIssueBtn.addEventListener("click", () => {
            closeModal("releaseNotesModal");
            const feedbackBtn = document.getElementById("feedback-btn");
            if (feedbackBtn && typeof feedbackBtn.click === "function") {
                feedbackBtn.click();
            }
        });
    }
}
