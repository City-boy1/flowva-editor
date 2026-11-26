# Source baseline and verification record

**Reviewed package:** `flowva-creation-modal-v3.zip`  
**Review date:** 2026-11-25  
**Review type:** Static source inspection and archive inspection. No live FlowvaMarket backend or full browser regression was available in this review.  
**Release status:** Development baseline; not production-certified.

## 1. Repository shape

The package is a flat, no-build HTML/CSS/JavaScript application:

- `index.html`, `app.js`, `app.css`: homepage, workspace selection, local projects/assets and marketplace presentation surfaces.
- `editor.html`, `editor.js`, `style.css`, `responsive.css`, `mobile.js`: editor shell, canvas/timeline interactions and responsive UI.
- `project-engine.js`: local project and asset persistence/package helpers.
- `api/client.js`: one API facade for editor-to-backend calls.
- `config.js`: public runtime configuration.
- `capabilities.js`: current format capability registry.
- `vendor/`: Fabric, ag-psd, jsPDF, Lottie, Lucide, Sortable and Toastify dependencies. The reviewed archive does not contain the `vendor/bgremoval/` files referenced by `editor.js`/`vendor/VERSIONS.md`; the Remove background path therefore needs a packaging/runtime check before it can be described as working.
- `docs/`: product, format, security and integration documentation.

Do not assume there is a package manager, test runner, CI pipeline or build process unless a later commit adds and documents one.

## 2. Homepage/category baseline

| Category | Current behaviour in this package | Gap to target |
|---|---|---|
| Graphic Design | Creation modal offers print/general design presets | Needs a defined workspace toolset, print controls and verified export policy |
| Social Media | Creation modal offers post/story/cover/banner presets | Needs platform preset registry, safe zones, multi-artboard/resize workflow and its own export rules |
| Documents & Publishing | Offers individual page presets (A4/Letter/resume/report) | Not a full multi-page document editor; page management and text-layout tools remain to build |
| Logo & Branding | Offers logo/app-icon canvas presets | Advanced vector path/node editing and branding-specific export remain to build/verify |
| Video & Motion | Offers landscape/vertical/square and animated-post presets | Existing timeline/media tools exist, but specialist editing workflow and export verification remain |
| 3D & Models | Visible as coming soon; selection does not open an editor | Entire 3D module is unimplemented |

Five categories currently use a shared creation modal and the existing editor engine. Do not describe them as six separate completed editors.

## 3. Existing editor features found in source

Code inspection found paths for:
- Fabric canvas editing: text, shapes, images, icons/stickers, object selection, layers, undo/redo, zoom and positioning.
- SVG and PSD import; PSD layers are translated to canvas objects, with fidelity limitations.
- Lottie JSON, video and audio timeline media.
- Export menu entries: PNG, JPG, PDF and Video (timeline recording).
- `.flowva` project download/open path; documentation describes version 2 packaging of supported canvas/media state.
- Browser IndexedDB projects/assets.

These are **source-presence findings**, not complete browser verification. A UI control or code path alone is not proof of successful operation on representative user files.

### Known save/export distinctions
- PNG/JPG/PDF/video are final deliverables, not editable project backups.
- `.flowva` is the editor's private portable project format; it is not a FlowvaMarket listing type unless Market explicitly decides otherwise.
- Browser-local project save/autosave has limitations for video/audio/Lottie runtime media; consult `MEDIA_PROJECT_LIMITATIONS.md`.
- PSD import exists. PSD export is not present in the current visible export menu and must not be advertised as working. `capabilities.js` currently marks PSD `create: true`, which is inconsistent with the visible export menu and must be reconciled before the registry is used to drive UI or Market policy.
- PDF page import/editing is limited; it is not native PDF content-stream editing.

## 4. FlowvaMarket connection baseline

- `config.js`: `BACKEND_ENABLED` is `false`; `API_BASE_URL` is empty.
- `api/client.js`: legacy facade routes under `/api/editor/`, including templates, listings, publish, purchases and ownership.
- Homepage markup includes public template and purchased-template containers.
- `app.js` attempts to call the template/purchase facade when backend mode is enabled, but this package does not prove that the routes, response schemas, checkout return flow, ticket exchange or creator upload hand-off match the live Market system.
- No real end-to-end Market integration was verified.

## 5. Verified in this review

- The source archive extracted successfully and its file structure was inspected.
- Homepage category IDs, active/coming-soon routing and creation preset definitions were inspected.
- Visible editor export menu options were inspected.
- API facade and runtime configuration were inspected.
- Existing capability registry and product/integration documentation were inspected.

## 6. Not verified / known gaps

- Full Chrome/Firefox/Safari/Edge browser regression, including responsive layouts and keyboard flows.
- Every canvas tool, timeline control, save path and export with representative user content.
- PSD import fidelity and any future PSD writer/round-trip.
- PDF page rendering, multi-page document output and accessibility.
- Video/audio codec support, playback, timeline rendering and downloaded video validity.
- `.flowva` media round-trip, large-file limits and recovery behaviour in real browsers.
- Marketplace public catalogue, exact product-page navigation, successful checkout return, purchase ownership, ticket replay/expiry, private source retrieval, save-as-copy and creator publish hand-off against real Market services.
- SVG sanitization, complete unsafe DOM insertion audit, hostile-file handling and upload validation.
- Production CSP/security headers, CORS, cookie/SameSite configuration, HTTPS and penetration/security tests.
- CI, automated browser tests, Lighthouse, accessibility and performance budgets.

## 7. Baseline rule

Do not mark a feature complete because a component, button, route name or code branch exists. Completion requires a visible user outcome, tests against representative data, clear failure handling and an updated record of exactly what was verified. Update this file only when new evidence is collected.
