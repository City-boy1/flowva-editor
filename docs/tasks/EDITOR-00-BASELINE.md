# EDITOR-00 — Establish the runnable baseline

**Goal:** Record a reliable starting point before changing editor behaviour. No product redesign or feature implementation in this task.

## Give the AI/developer
- `README.md`
- `docs/BASELINE.md`
- `docs/IMPLEMENTATION_ROADMAP.md`
- `index.html`, `app.js`, `editor.html`, `editor.js`, `config.js`, `api/client.js`, `capabilities.js`
- Only additional files required to run the app locally.

## Do
1. Confirm branch and commit; do not overwrite uncommitted work.
2. Run `node --check` on `app.js`, `editor.js`, `project-engine.js`, `mobile.js`, `api/client.js` and `capabilities.js` where Node syntax checking applies.
3. Serve the project and inspect homepage, all six category cards, create modal, editor, import, save, export and responsive layout.
4. Confirm actual Market backend remains disabled unless a test environment is deliberately configured.
5. Record screenshots and browser/version details; update `BASELINE.md` with evidence.

## Must not
- Change app code or styling.
- Enable live backend mode.
- Use real paid templates/customer files as fixtures.

## Acceptance
- Project launches locally.
- Syntax checks and visible smoke checks are recorded.
- Known failures and unverified paths are documented without guessing.

**Suggested commit:** `chore: record FlowvaEditor baseline`
