# EDITOR-03A — Audit the Graphic Design workspace before building missing tools

**Goal:** Produce a small, evidence-based gap list for Graphic Design. This is an audit task first; do not build every missing feature in the same run.

## Give the AI/developer
- `README.md`
- `docs/WORKSPACE_ARCHITECTURE.md`
- `docs/FORMATS.md`
- `docs/AI_TASK_RULES.md`
- `editor.html`, `editor.js`, `style.css`, `responsive.css`, `project-engine.js`, `capabilities.js`
- Only directly imported helper files needed to trace a feature.

## Audit these tool groups

1. Canvas sizing, custom dimensions, units and resize.
2. Text: font selection, size, weight, line/letter spacing, alignment, text box resize and text colour.
3. Shapes: add, resize, rotate, fill, stroke, opacity and layering.
4. Images: upload/place, crop, fit/fill, resize, rotate, opacity, filters and background removal.
5. Layers: select, rename, reorder, hide/show, lock/unlock and delete.
6. Layout: align/distribute, guides, rulers, snapping, grouping and duplicate.
7. Colour/background: colour picker, gradients if supported, transparency and background controls.
8. History: undo/redo and keyboard shortcuts.
9. Save/reopen: browser project and `.flowva` behaviour, including known media limitations.
10. Export: PNG/JPG/PDF actual output, dimensions, transparency, quality and error handling.

## For each item, classify it

- `WORKING_VERIFIED`: manually tested in browser with a repeatable result.
- `PRESENT_UNVERIFIED`: code/control exists but no real test evidence.
- `PARTIAL`: works with a documented limitation.
- `MISSING`: no implementation found.
- `UNSAFE_OR_BROKEN`: exists but has a correctness/security/reliability defect.

Do not classify based on code presence alone. Record exact file/function/UI location and the smallest test needed.

## Output required
Create `docs/audits/GRAPHIC-DESIGN-GAP-REPORT.md` with:
- tool inventory and classification;
- screenshots or short reproduction notes for important UI findings;
- defects that must be fixed before adding features;
- ranked missing tools (P0/P1/P2);
- one proposed implementation task per small feature group, including exact files, acceptance criteria and regression checks.

## Must not
- Change editor code or styles in this audit task.
- Add fake tool buttons.
- Implement PSD/SVG export or claim a format is supported.
- Refactor the whole editor.

## Acceptance
- Every listed tool group has a clear evidence-based status.
- Highest-priority next task is small enough for one focused AI run.
- Existing working functionality is documented so later tasks do not remove it.

**Suggested commit:** `docs: audit graphic design workspace capabilities`
