# FlowvaEditor — Task 03 module roadmap

**Task:** Professional Graphic Design Workspace  
**Status:** In progress  
**Tracking rule:** A module is marked *Implemented* only after its code is in the handoff and its stated checks have been run. Browser-only acceptance checks remain open until exercised in the running editor.

## Module breakdown

| Module | Scope | Status |
|---|---|---|
| **03.1 — Custom Gradient Studio** | Linear/radial gradients, 2–5 editable colour stops, angle, live preview, apply to selection or canvas background, native Fabric fill data | **Implemented** — user confirmed it works |
| **03.2 — Professional Typography** | Searchable self-hosted font library, live previews, font selection in Properties, and legacy embedded-font compatibility | **Updated in 03.4.3** — local fonts delivered; user acceptance pending |
| **03.3 — Shapes & Visual Effects** | Expanded editable vector shapes, stroke/fill controls, borders, shadows, reusable effects and richer decorative elements | **Delivered** — user acceptance pending |
| **03.4 — Image Editing & Composition** | Canvas fit/fill, source-pixel crop presets, editable shape masks, image replacement and image adjustments | **Repair and polish delivered** — user reported image tools now work; final acceptance pending |
| **03.4.3 — Offline Typography & Workspace Cleanup** | Self-hosted fonts, searchable right-panel font picker, true text glow, category-aware video timeline and animation controls | **Delivered** — user acceptance pending |
| **03.5 — Precision & Print Layout** | Rulers, guides, grids, snapping improvements, alignment/distribution, safe areas, bleed and print-resolution controls | In progress — 03.5.1 precision tools delivered; 03.5.2 print preparation remains |
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

- Original typography delivery added a searchable font picker and project-embedded font support.
- The user clarified that selectable fonts must be bundled locally, not fetched from a CDN, and that custom font uploads should be removed.
- Task 03.4.3 replaces the remote font workflow with 27 bundled local font families, searchable from the right-hand Properties panel. Existing embedded font data remains readable for backward compatibility; new custom uploads are no longer offered.

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


### 03.3 — Shapes & Visual Effects

- This increment expands the vector shape palette and adds editable appearance/effect controls in the Properties panel.
- Module brief: [`docs/tasks/EDITOR-03.3-SHAPES-VISUAL-EFFECTS.md`](tasks/EDITOR-03.3-SHAPES-VISUAL-EFFECTS.md).
- Status: **Delivered; user acceptance pending**. Delivery does not imply browser acceptance.


### 03.4 — Image Editing & Composition

- This increment adds canvas fit/fill, square/portrait/landscape source crops, editable Fabric clip-path masks, image replacement and quick-look filters alongside the existing image adjustments.
- Module brief: [`docs/tasks/EDITOR-03.4-IMAGE-EDITING-COMPOSITION.md`](tasks/EDITOR-03.4-IMAGE-EDITING-COMPOSITION.md).
- The first delivery exposed user-reported defects: switching masks could leave a stale/slow cached clip path, and quick-look/brightness changes were not reliably visible. The user subsequently reported that the image tools were working after the repair.
- Repair increment: [`docs/tasks/EDITOR-03.4.1-IMAGE-MASK-FILTER-REPAIR.md`](tasks/EDITOR-03.4.1-IMAGE-MASK-FILTER-REPAIR.md). It uses Fabric setters plus dirty-cache invalidation for masks, and rebuilds a compact, ordered filter stack with a real sepia colour matrix.
- Status: **Repair delivered; user retest pending**. Crop, replacement, save/reopen and export acceptance checks remain open.
- Replacement image files are limited to 50 MB. The existing project packaging limit and browser storage limits still apply.


### 03.4.2 — Final image/text/gradient polish
**Status: Delivered — user retest pending.** Slider previews are coalesced for responsiveness; typography now has font specimens and selectable text glow; Trapezoid icon rendering and selected-state contrast are corrected; custom gradients can be randomly generated.


### 03.4.3 — Offline typography and workspace cleanup

- Bundles 27 local font families under `assets/fonts/` with package license notices; no Google Fonts stylesheet or remote font host is used.
- Removes custom font upload and the duplicate left-panel font library; the right Properties panel owns searchable font-family selection. The left Text panel only adds text blocks.
- Glow is now a real text shadow glow with configurable colour and strength; the text fill remains unchanged.
- Timeline and per-object animation/timing controls are gated to Video & Motion only, including mobile layouts.
- Status: **Implemented in code; user acceptance pending.**


### 03.4.4 — Local font loading and text-effect presets
**Status:** Delivered; user retest pending.
- Fixed the Lobster face mapping and explicitly load only the chosen local font file.
- Font dropdown no longer triggers all font downloads while opening.
- Added 13 selectable letter-A display styles, including neon, halo, fire, ice, chrome, retro and dimensional 3D effects.
- Added saved effect metadata and restoration when the user clears an effect.


**Text-panel follow-up:** Text-effect preset cards are placed in the left Text panel; manual shadow preset and custom colour/blur/offset controls remain available in Properties for text objects. Runtime acceptance remains pending user testing.


## Task 03.5.1 — Precision tools handoff

**Delivered files:** `editor.html`, `editor.js`, `style.css`, `responsive.css`, `IMPLEMENTATION_ROADMAP.md`, and this roadmap.

- Added a compact workspace toolbar with Grid and Snap toggles.
- Grid is off by default, uses subtle 50 design-pixel spacing, and remains visible only while its toggle is enabled. It does not alter exported artwork.
- Smart alignment guides remain transient: they appear while dragging near canvas/object edges or centres and clear on pointer release, selection changes, or object modification.
- Snap can be disabled independently without disabling the grid.
- Existing align-to-canvas controls remain; multi-selection of three or more objects now exposes horizontal and vertical distribution controls.
- Mobile toolbar labels stay compact and the helper note is hidden on narrow screens.

**Checks:** JavaScript syntax, HTML ID uniqueness, expected UI hooks and ZIP integrity. Browser interaction and visual acceptance remain pending. Rulers, draggable persistent guides, safe areas, bleed and print DPI are not part of this increment; they remain in 03.5.2/print-preparation follow-up.


### Task 03.5.1 — Precision tools follow-up
- Fixed Grid/Snap toggle interaction using delegated capture-phase handlers and raised the toolbar above canvas layers.
- Added a grip-only drag interaction to move the floating toolbar anywhere within the workspace; its initial placement is unchanged.

### Task 03.5.2 — Print preparation
- Added optional horizontal/vertical ruler strips. Drag from a ruler onto the canvas to create a persistent alignment guide; double-click near a guide to remove it.
- Added optional safe-area and 3 mm trim-margin overlays. They remain visual editor aids and are excluded from exports; a true canvas-expanding bleed workflow is still a later enhancement.
- Added PDF DPI selection (72, 150, 300, 600); physical PDF page size is calculated from canvas pixels at the selected DPI.
- Status: delivered in code; browser acceptance and physical print proofing pending.


### Task 03.5 precision-overlay corrective pass
- Precision overlays (grid, rulers/guides, safe area and 3 mm margin) initialize hidden; snapping initializes disabled to avoid unexpected object movement.
- Precision controls use direct button listeners with synchronized `aria-pressed` and active states for reliable on/off behaviour.
- Grid spacing is reduced in density to 100 design pixels and its opacity is substantially lowered.
- Persistent ruler guides are displayed only while Rulers is enabled; disabling Rulers removes the ruler UI and clears its guides so no stale lines return unexpectedly.
- Browser interaction acceptance remains pending.


### Task 03.5 precision-toolbar interaction refinement
- The precision toolbar grip now acts as both collapse/expand control and drag handle: a tap toggles between compact grip-only and expanded toolbar; press/hold and move repositions it.
- Keyboard Enter/Space also toggles the toolbar. A movement threshold distinguishes dragging from tapping.
- Disabling Snap clears smart alignment lines immediately; smart lines render only while Snap is enabled and an object is actively moving.
- Disabling Rulers clears all ruler-created guides and temporary guide state. Grid, safe-area and 3 mm margin overlays are independently toggled and redraw immediately.
- DPI remains a print-export resolution selector, not an on/off overlay; it does not change objects on the canvas.
- Safe-area and 3 mm margin guides are visual-only and never change object position, size or appearance. The current 3 mm guide is an inset trim-margin reference, not canvas-expanding bleed.
- Browser interaction acceptance remains pending.
