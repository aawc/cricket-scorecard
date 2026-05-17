# Security Policy

## Supported Versions

Currently, only the latest deployment on the `main` branch is actively maintained with security updates.

| Version | Supported |
| :--- | :--- |
| Latest (`main` branch) | :white_check_mark: |
| Older releases | :x: |

## Data Privacy & Architecture Security

The **Cricket Scorecard PWA** is a standalone static web application designed with security and privacy as core principles:

1. **Zero Backend Data Collection**: All match data, player names, and configuration settings are stored entirely on your device within the browser's local storage (`localStorage`). No data is ever transmitted to external servers, databases, or analytics trackers.
2. **Secure Permalink Sharing**: Match states shared via permalinks are encoded directly within the URL query parameters. No server-side session or link database is maintained.
3. **HTTPS & Offline PWA**: Hosted via GitHub Pages, the site enforces HTTPS encryption for all traffic and utilizes a local Service Worker (`sw.js`) to securely cache core assets for offline use.
4. **External Dependencies**: The app relies strictly on verified, highly reputable CDNs for styling and interactivity:
   - [Bootstrap 5](https://getbootstrap.com/) (CSS & JS Bundle via jsDelivr)
   - [SortableJS](https://github.com/SortableJS/Sortable) (Drag and Drop via jsDelivr)

## Reporting a Vulnerability

Because this application operates completely client-side without user accounts or backend infrastructure, vulnerabilities are generally restricted to potential Cross-Site Scripting (XSS) bugs or CDN dependency updates.

We strongly encourage our community to report all security vulnerabilities, bugs, or feature requests publicly directly in the repository:

1. **Open a Public Issue**: Please navigate to our [GitHub Issues Tracker](https://github.com/aawc/cricket-scorecard/issues) (or the current hosting repository's issue tab).
2. **Provide Details**: Include a clear title, reproduction steps, browser version, and any relevant console logs or screenshots.
3. **Resolution**: Issues are publicly tracked and resolved directly via pull requests to the `main` branch.
