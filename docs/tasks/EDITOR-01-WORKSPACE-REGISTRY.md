# EDITOR-01 — Add the workspace configuration registry

**Goal:** Establish one source of truth for the six workspace definitions and their presets without changing the current user experience.

## Give the AI/developer
- `README.md`
- `docs/WORKSPACE_ARCHITECTURE.md`
- `docs/FORMATS.md`
- `index.html`, `app.js`, `editor.js`, `editor.html`, `capabilities.js`
- Directly imported files only if needed.

## Do
1. Inspect current `CREATE_CATEGORIES`, `CREATE_PRESETS` and category click handling in `app.js`.
2. Add a small registry module/file appropriate to the current no-build architecture (for example `workspaces/registry.js`, loaded before `app.js`).
3. Move the existing category and preset definitions into it without changing IDs, labels, dimensions, descriptions, modal order or routing.
4. Define all six categories, including explicit `planned` status for `models-3d`.
5. Include structured fields for editor type, presets, tools/panels, import/export capability references and known limitations. Do not claim unimplemented tools are enabled.
6. Make `app.js` consume the registry instead of maintaining a duplicate category list.

## Must preserve
- Existing five active category flows and their preset IDs/dimensions.
- 3D coming-soon behaviour.
- Existing creation modal and editor launch behaviour.
- All current projects/assets/import/export behaviour.

## Acceptance
- All six category cards render correctly.
- The same five categories open the same existing presets as before.
- 3D remains planned and cannot launch a fake editor.
- No duplicate category/preset source of truth remains.
- Syntax and homepage smoke checks pass.

**Suggested commit:** `feat: add workspace configuration registry`
