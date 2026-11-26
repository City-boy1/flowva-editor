# Workspace architecture and category behaviour

## Purpose

The selected category must determine the actual editor experience—not just the heading or starting canvas dimensions. Use one shared application shell and reusable engine services, with workspace-specific configurations and modules. Do not build six duplicated applications.

## Workspace contract

Each workspace configuration must define:

- Stable `id`, display name and status (`active`, `limited`, `planned`).
- `editorType` (for example `design-canvas`, `document-pages`, `timeline`, `scene-3d`).
- Supported project model and canvas/scene/page behaviour.
- Presets and dimension units; include bleed/safe-zone/page settings where relevant.
- Enabled tools and panels. Disabled tools must not appear as working controls.
- Import capabilities and accepted MIME/extensions, checked against `capabilities.js`.
- Export formats, quality settings and limitations, checked against actual tested writers.
- Save/reopen support and any media/project constraints.
- Acceptance tests and sample fixtures required before enabling the workspace.

The registry is configuration, not authorization. Market must independently enforce listing type and ownership.

## Workspace target matrix

| Workspace | Editor type | Required tools/features (target) | Presets/structure | Export targets (only after verified) |
|---|---|---|---|---|
| Graphic Design | Design canvas | Text/typography, shapes, images, layers, alignment/distribution, color, fills/strokes, crop/transform, background, guides, bleed/margins, rulers and print settings | Flyer, poster, business card, invitation, brochure page, letterhead, menu, certificate, custom size | PNG, JPG, PDF; PSD/SVG only after real writer and round-trip/fidelity tests |
| Social Media | Design canvas with artboards | Graphic tools plus platform presets, safe zones, multiple artboards/variants, resize/crop, brand kit reuse, preview and batch export | Posts, stories/status, reels/shorts covers, profile/page covers, thumbnails, banners; presets must be data-driven and updateable | PNG/JPG; GIF/MP4 only where the motion path and codec tests pass |
| Documents & Publishing | Document/page editor | Multi-page document model, text flow, rich text, paragraphs, headings, lists, tables, images, columns, margins, headers/footers, page numbers, page reorder, page breaks and print preview | A4, US Letter, CV/resume, reports, menus, brochures and other page templates | PDF as primary; PNG/JPG page previews. DOCX only if a real editable document writer is implemented and tested |
| Logo & Branding | Precision design/vector workspace | Vector paths, pen/node editing, boolean operations if supported, shape/text controls, alignment, palette/brand colors, logo lockups/variations, transparent background and icon export | Logo, wordmark, icon, brand board, color palette, social/avatar variants | SVG only after safe vector writer, plus PNG/PDF; avoid promising AI/EPS/PSD unless verified |
| Video & Motion | Timeline editor | Media bin, preview, video/audio tracks, trim/split, timing, layers, text/shape overlays, transitions, keyframes, animation curves, audio controls, playback and render progress | Landscape, vertical, square, social motion and custom frame rate/duration | MP4/WebM only when browser encoder/export path is verified; GIF where tested; `.flowva` for editable project backup |
| 3D & Models | 3D scene editor | 3D viewport, object hierarchy, import, transform gizmos, camera/orbit, materials, lighting, scene settings and supported model operations | Primitive scene, product mockup, model viewer, custom scene | GLB first after import/export tests; FBX should be import/convert only unless a reliable writer is proven |

## Current implementation mapping

At the reviewed baseline, five categories route to the existing creation modal/preset flow and then the shared editor. The categories have preset-level differences only. 3D is coming soon. Implement the registry without changing this behaviour in the first registry task; the first task is a safe data-model foundation, not a full UI rewrite.

## Shared services

Share only features whose behaviour is genuinely common:
- project lifecycle and local persistence;
- undo/redo history where compatible with each project model;
- asset library and file validation;
- selection/transform primitives where compatible;
- keyboard shortcuts, zoom/navigation and notifications;
- export orchestration, progress and error reporting;
- capability lookup and import routing.

Do not force document pages, timeline tracks or 3D scenes into the existing Fabric canvas object model. Each specialist workspace may need its own data model and renderer.

## Category launch behaviour

1. Resolve the category ID from a trusted local registry entry.
2. If status is `planned`, show the coming-soon state; do not launch an empty or fake editor.
3. If active, show the workspace's creation presets and let the user select a specific preset/template.
4. Create/open a project carrying `workspaceId`, `presetId`, canonical file type where applicable, dimensions and schema version.
5. Initialize the correct module and tools/panels from the registry.
6. Load the selected template only after its identity and source are validated.
7. Derive the export menu from workspace capabilities and tested exporters; hide unsupported formats.
8. Persist enough workspace metadata to reopen the project in the correct editor module.

## Definition of done for a workspace

- Selecting the category visibly opens the correct workspace/module.
- Only relevant tools and panels are shown; each visible control works.
- Presets set the expected dimensions and project metadata.
- Save, close, reopen and recovery preserve the project in that workspace.
- Every enabled import/export path passes representative fixture tests.
- Unsupported features are clearly unavailable, not silently flattened or mislabelled.
- Responsive layout and keyboard basics are tested.
