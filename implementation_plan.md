# Implementation Plan - Permalink URL Shortening

The goal is to significantly shorten shareable permalink URLs by combining client-side LZString compression (Strategy 1) and JSON key minification (Strategy 2).

## Proposed Changes

### 1. Script Integration (`index.html`)
#### [MODIFY] [index.html](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/index.html)
- Include `lz-string` CDN (`https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.5.0/lz-string.min.js`) before `app.js`.
- Update footer version to `1.27.0`.

### 2. State Minification & Compression (`app.js`)
#### [MODIFY] [app.js](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/app.js)
- Add `minifyState(state)` and `unminifyState(minified)` helper functions to translate verbose object keys (`"oversPerInnings"`, `"currentBattingTeam"`) into compact 1-3 letter codes (`"opi"`, `"cbt"`).
- Refactor `shareMatch()` to minify state and compress via `LZString.compressToEncodedURIComponent()`, generating URLs with `?s=<compressed_hash>`.
- Refactor `loadFromLocalStorage()` to support both new compressed URLs (`?s=`) and legacy uncompressed URLs (`?state=`).

### 3. Documentation & Tests
- Update [PROMPT.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/PROMPT.md) and [README.md](file:///usr/local/google/home/vakh/git/hub/aawc/cricket-scorecard-pwa/README.md).
- Run `node test.js` automatically to verify scoring functionality.

## Verification Plan
- Automated: `node test.js` passes successfully.
- Manual: Open browser, start match, score some runs. Click "Share". Verify permalink uses `?s=` and is highly compact (approx 200-400 chars). Paste permalink into new tab, verify match state loads perfectly.
