# EDITOR-02 — Launch editor with selected workspace context

**Goal:** Ensure the editor knows which workspace and preset the user selected, and preserves that context when the project is saved/reopened.

## Give the AI/developer
- `README.md`
- `docs/WORKSPACE_ARCHITECTURE.md`
- `docs/AI_TASK_RULES.md`
- `app.js`, `editor.html`, `editor.js`, `project-engine.js`
- Workspace registry created by EDITOR-01.

## Do
1. Trace the existing create-modal → editor URL/project initialization path.
2. Pass validated `workspaceId` and `presetId` into the editor using the current safe project/URL mechanism.
3. Validate IDs against the registry; use a safe default for unknown values.
4. Display the selected workspace name and preset/dimensions in the editor UI.
5. Persist workspace metadata in the project schema and restore it on open.
6. Keep the existing shared canvas engine; do not attempt to build all specialist tools in this task.

## Must preserve
- Direct `editor.html` use and local-file open.
- Existing project compatibility and older `.flowva` package versions.
- Save, undo/redo, import and export behaviour.

## Acceptance
- Launching from each active category carries the correct workspace/preset.
- Project save/reopen retains workspace context.
- Unknown or malformed workspace IDs do not crash the editor.
- Existing projects without workspace metadata still open safely.
- No new workspace claims or nonfunctional controls are added.

**Suggested commit:** `feat: launch editor with selected workspace context`
