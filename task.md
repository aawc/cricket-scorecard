# Task List - TypeScript Migration

- [x] Create package.json and configure dependencies (typescript, vite, ts-node)
- [x] Install package dependencies locally (bypassing custom proxy to public npm registry)
- [x] Configure root `tsconfig.json` (strict checking for `src/`)
- [x] Configure `test/tsconfig.json` (relaxed checking for dynamic DOM tests)
- [x] Configure `vite.config.js` for bundling assets
- [x] Rename source and test files from `.js` to `.ts` via `git mv`
- [x] Define global/app interfaces and reducer action unions in `src/types.ts`
- [x] Add TypeScript annotations to state coordinations, reducer state transitions, and DOM binders
- [x] Move static PWA assets (manifest, sw.js, icons) to `public/` directory
- [x] Update entry script and stylesheet import paths in `index.html`
- [x] Fix global `navigator` overrides and add missing type declarations in `test/test.ts` and `test/test_cases.ts`
- [x] Implement post-build asset compiler `scripts/build-sw.js` to automatically cache compiled chunks in `sw.js`
- [x] Run unit tests and verify all 34 assertions pass cleanly
- [x] Execute production build and assert that compilation is error-free
- [x] Update `DESIGN.md` "Completed Improvements" list
- [ ] Propose commit description, get approval, and commit
