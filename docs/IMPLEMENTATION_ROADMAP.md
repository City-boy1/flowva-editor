# FlowvaEditor implementation roadmap

**Rule:** one milestone per AI/developer task and one Git commit per completed milestone. Do not hand the whole repository to an AI unless a task explicitly requires it. Start with the smallest task brief under `docs/tasks/` and provide only the named files plus directly imported dependencies.

## Delivery approach

Every milestone must produce a visible improvement, pass its acceptance checks, and leave the application runnable. Keep a known-good commit after every milestone. Do not begin the next milestone while the current one has unresolved regressions.

## Stage 0 — Establish the real baseline

**Visible result:** no UI change; a reliable baseline and test checklist exist.

- Confirm the exact branch/commit and source archive being used.
- Run syntax checks and launch the current app locally.
- Record the five active category routes, 3D coming-soon state, current editor tools, export menu, save limitations and Market backend disabled state.
- Capture screenshots and representative sample files for later comparison.
- Do not refactor or redesign.

**Git checkpoint:** `chore: record FlowvaEditor baseline`  
**Task:** `docs/tasks/EDITOR-00-BASELINE.md`

## Stage 1 — Workspace registry (foundation)

**Visible result:** no major visual change; category and preset data come from one clear registry.

- Define all six workspace IDs and active/limited/planned states.
- Move category metadata and preset definitions into a dedicated registry without changing current preset behaviour.
- Record editor type, tools, panels, presets, imports, exports and acceptance tests per workspace.
- Keep 3D marked planned.

**Git checkpoint:** `feat: add workspace configuration registry`  
**Task:** `docs/tasks/EDITOR-01-WORKSPACE-REGISTRY.md`

## Stage 2 — Category-aware launch and project metadata

**Visible result:** selected workspace and preset are visible in the editor and remain attached to the project after save/reopen.

- Pass `workspaceId` and `presetId` through the existing creation flow.
- Initialize the appropriate current module/configuration.
- Show category-specific title, preset dimensions and relevant tool groups.
- Do not claim specialist modules that do not yet exist.

**Git checkpoint:** `feat: launch editor with selected workspace context`  
**Task:** `docs/tasks/EDITOR-02-WORKSPACE-LAUNCH.md`

## Stage 3 — Complete Graphic Design workspace

**Visible result:** Graphic Design is a dependable, polished workspace with its own useful tool groups and verified exports.

- Audit existing tools before adding anything.
- Improve gaps in typography, shape/image handling, alignment, guides, dimensions, backgrounds and print controls.
- Add only tools that can be completed and tested in the task.
- Verify PNG/JPG/PDF output. PSD/SVG are separate format tasks, not assumed.

**Git checkpoint:** `feat: complete graphic design workspace`  
**Task:** create a small `EDITOR-03` brief from the actual gaps found after Stage 2.

## Stage 4 — Social Media workspace

**Visible result:** platform-specific preset picker, correct dimensions and visible safe zones; export selected variants.

- Build a data-driven platform/preset list.
- Add safe-zone overlays and multiple artboards/variants only as separately testable increments.
- Keep unsupported platforms and output types out of the UI.

**Git checkpoint:** `feat: add social media workspace presets and safe zones`

## Stage 5 — Documents & Publishing workspace

**Visible result:** real page-based document editing, not just one canvas labelled as a document.

- Start with page model, page navigation, page dimensions and multi-page PDF export.
- Then add text flow, headers/footers, page numbers and richer layout as separate tasks.
- Do not promise DOCX until a writer is implemented and verified.

**Git checkpoint:** `feat: add multi-page document workspace`

## Stage 6 — Logo & Branding workspace

**Visible result:** branding-specific creation workflow with transparent export and reusable palette/brand settings.

- Audit current Fabric primitives before implementing vector-specific features.
- Add path/node editing only if supported by the selected vector model.
- SVG export must include sanitization/security tests.

**Git checkpoint:** `feat: add logo and branding workspace`

## Stage 7 — Video & Motion workspace

**Visible result:** clear timeline/media workflow with verified final video output and reliable editable project backup.

- Audit timeline, media import, trim/split, audio, timing and animations.
- Fix and test playback/export by browser/codec.
- Keep `.flowva` as editable project package; video export is flattened output.
- FCPXML is a later interchange task, not a prerequisite for basic video export.

**Git checkpoint:** `feat: strengthen video and motion workspace`

## Stage 8 — Export and format capability system

**Visible result:** export menu changes correctly with workspace and only shows supported outputs.

- Refine `capabilities.js` into explicit create/open/edit/convert/export capability data.
- Add format-specific options, validation, progress and error messages.
- Add fixtures and tests before enabling each format.
- Prioritize reliable PNG/JPG/PDF/video, then separately evaluate SVG/PSD/GLB/FCPXML.

**Git checkpoint:** `feat: make exports capability-aware`

## Stage 9 — FlowvaMarket public template discovery

**Visible result:** real approved Market templates appear in the editor for guests; each Get button opens the exact selected product.

- Market developer completes Market-01 public catalogue.
- Editor maps Market response fields to template cards; no mock listings.
- Preserve exact `listingId`, `typeCode` and `productUrl`.

**Git checkpoint:** `feat: connect public FlowvaMarket template catalogue`  
**Market hand-off:** `docs/FLOWVAMARKET_HANDOFF.md`, Market-01.

## Stage 10 — Exact purchase return and edit purchased template

**Visible result:** a buyer acquires one template and returns to edit that same template in a private copy.

- Market completes exact-listing checkout return and secure ticket/session exchange.
- Editor validates returned listing ID/type, checks capability, opens source and saves a private copy.
- Add purchased library using Market-owned purchase data.
- Unsupported formats show a clear unavailable/download action; no fake Edit button.

**Git checkpoint:** `feat: add secure purchased template editing`  
**Market hand-off:** Market-02, Market-03 and Market-04.

## Stage 11 — Creator publish hand-off

**Visible result:** creator can prepare an export and continue in the existing Market creator upload/listing flow.

- First increment: open existing upload form and let creator manually attach source/preview.
- Later increment: optional scoped upload/draft attachment token.
- Market owns listing details, pricing, validation, draft, moderation and publication.
- Verify approved creator listing returns to the public catalogue.

**Git checkpoint:** `feat: hand off creator exports to FlowvaMarket`  
**Market hand-off:** Market-05.

## Stage 12 — 3D & Models

**Visible result:** a real 3D viewport and model workflow, or keep the card clearly marked planned until it is genuinely ready.

- Implement scene model, viewport, object transforms, materials and camera in separate tasks.
- GLB import/export is the first target.
- FBX conversion is optional and must warn about fidelity loss.

**Git checkpoint:** `feat: add 3d model workspace`

## Stage 13 — Production hardening

**Visible result:** release candidate with repeatable automated/manual verification.

- Browser tests and CI, security review, file fuzz/size tests, CSP/headers, CORS/session review, accessibility, performance, dependency/licence audit, backup/rollback and deployment notes.
- Record real results; never invent Lighthouse scores or claim a security audit that did not occur.

**Git checkpoint:** `chore: prepare FlowvaEditor production release`

## Current status tracker

| Stage | Status | Evidence / next action |
|---|---|---|
| 0 Baseline | Documentation updated; runtime baseline still needs developer/browser run | Use `EDITOR-00-BASELINE.md` |
| 1 Workspace registry | Implemented; automated checks pass; manual browser verification pending | `workspaces/registry.js`; `tests/workspace-registry.test.js`; homepage and editor consume the same registry |
| 2 Workspace launch | Implemented in the supplied source bundle; browser acceptance pending | `app.js`, `editor.html`, `editor.js`; syntax, workspace-resolution and `.flowva` metadata round-trip checks pass |
| 3 Graphic Design | Not started | Audit after Stage 2 |
| 4 Social Media | Not started | Wait for Stage 3 foundation |
| 5 Documents | Not started | Page-based module required |
| 6 Logo & Branding | Not started | Vector capability audit required |
| 7 Video & Motion | Existing foundation; completion not verified | Browser/codec verification and specialist UX |
| 8 Export system | Existing basic exports; capability-aware menu not complete | Format fixtures/tests |
| 9 Public catalogue | UI placeholders/facade exist; backend disabled | Market-01 |
| 10 Purchase/edit | Not verified against live Market | Market-02/03/04 |
| 11 Creator publish | Not verified; secure hand-off not complete | Market-05 |
| 12 3D | Planned only | Begin only after earlier modules and priorities are reviewed |
| 13 Hardening | Not started | Full release gate |

## Rules for GitHub delivery

- One milestone = one branch or clearly isolated change set and one focused commit (more commits are fine for a multi-step milestone, but keep them scoped).
- Never commit secrets, `.env` files, private customer templates, paid source fixtures or large model assets without licence review.
- Keep a clean, runnable main branch. Push after acceptance checks, not after an untested rewrite.
- Include in every pull request: purpose, changed files, visible result, checks run, manual QA, limitations and rollback note.
- Update this tracker and `BASELINE.md` after material changes.
