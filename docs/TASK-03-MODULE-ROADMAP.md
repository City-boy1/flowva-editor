# FlowvaEditor — Task 03 module roadmap

**Task:** Professional Graphic Design Workspace  
**Status:** In progress  
**Tracking rule:** A module is marked *Implemented* only after its code is in the handoff and its stated checks have been run. Browser-only acceptance checks remain open until exercised in the running editor.

## Module breakdown

| Module | Scope | Status |
|---|---|---|
| **03.1 — Custom Gradient Studio** | Linear/radial gradients, 2–5 editable colour stops, angle, live preview, apply to selection or canvas background, native Fabric fill data | **Implemented** — user confirmed it works |
| **03.2 — Professional Typography** | Searchable font library, broader font choices, live font previews, font selection in object properties, custom font upload and project-embedded font data | **In progress** — this handoff |
| **03.3 — Shapes & Visual Effects** | Expanded editable vector shapes, stroke/fill controls, borders, shadows, reusable effects and richer decorative elements | Planned |
| **03.4 — Image Editing & Composition** | Crop/fit controls, masking/clipping workflows, replacement, transforms and improved image adjustment controls | Planned |
| **03.5 — Precision & Print Layout** | Rulers, guides, grids, snapping improvements, alignment/distribution, safe areas, bleed and print-resolution controls | Planned |
| **03.6 — Professional Export Studio** | Export preview, PNG/JPG/PDF settings, scale/quality/transparency and print-oriented output options | Planned |
| **03.7 — Graphic Design Workspace UX** | Focused design-workspace panels, remove irrelevant video-only clutter where appropriate, responsive polish and coherent tool discovery | Planned |
| **03.8 — QA & Release Readiness** | Save/reopen checks, undo/redo, browser and responsive checks, performance, accessibility, documentation and regression pass | Planned |

## Delivery sequence

1. Complete one module at a time and keep each handoff limited to files changed or added by that module.
2. Preserve the existing shared Fabric canvas, project format, workspace routing and other workspace behaviour unless a module explicitly requires a compatible extension.
3. Add/update the module brief and this roadmap with every handoff. Keep status honest: *Planned*, *In progress*, *Implemented* or *Verified*.
4. Run syntax and structural checks for each code handoff. Mark browser acceptance as verified only after it has actually been tested in the running app.
5. The user can merge/push each working increment to GitHub before the next ZIP is delivered.

## Current implementation notes

### 03.1 — Custom Gradient Studio

- Implemented in `editor.html`, `editor.js` and `style.css`.
- Module brief: [`docs/tasks/EDITOR-03.1-CUSTOM-GRADIENT-STUDIO.md`](tasks/EDITOR-03.1-CUSTOM-GRADIENT-STUDIO.md).
- User tested the working version and confirmed: **“so it works.”**
- Status is therefore recorded as **Implemented**. This is user-confirmed functionality, not a claim that every browser/device acceptance case has been independently tested.

### 03.2 — Professional Typography

- Current increment adds a searchable, preview-style font library with 50+ curated Google Font families.
- Custom `.ttf`, `.otf`, `.woff` and `.woff2` upload is supported up to 5 MB per file.
- Uploaded font bytes are attached to text objects and included in Fabric project JSON through the `fvFontData` custom property. This is intended to keep uploaded fonts with the editable project when it is saved/exported and reopened through the existing project JSON flow.
- Google-hosted font choices require an internet connection. Uploaded fonts are local to the project and do not require a Google Fonts request.
- Remaining checks before marking this module implemented: run in-browser tests for Google font loading, custom font upload, applying to single/multiple text objects, save/download/reopen persistence, and export rendering. Also inspect resulting `.flowva` size with a typical custom font.

## Global completion criteria

Task 03 is ready for release only when the relevant modules are implemented and the final QA module confirms:

- Existing design projects still open and save without losing objects or styling.
- New features remain editable and participate correctly in undo/redo.
- Exported output matches the canvas for supported formats.
- Graphic Design controls remain usable on desktop, tablet and mobile.
- Shared editor/video features and workspace navigation have no regressions.
- Documentation describes supported behaviour and clearly identifies limitations.

## Scope boundaries

The goal is a capable, professional graphic-design workflow within FlowvaEditor's existing architecture. Do not describe the product as a complete Photoshop/Illustrator replacement, and do not claim proprietary format compatibility or automated capabilities that have not been implemented and tested.
