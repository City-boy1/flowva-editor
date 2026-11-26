# FlowvaEditor

**Repository:** `flowva-editor`  
**Product role:** Browser-based creative editor that works with the existing FlowvaMarket application.  
**Current package reviewed:** `flowva-creation-modal-v3` plus the workspace-registry milestone  
**Current integration state:** Standalone/local mode; FlowvaMarket backend connection is disabled.  
**Release status:** Development baseline — not production-ready or fully browser-verified.

> **Read first:** `docs/IMPLEMENTATION_ROADMAP.md`, then `docs/BASELINE.md`. For each implementation task, give the AI/developer only the task hand-off and the files it names. Do not ask an AI to implement the whole roadmap in one run.

## 1. Product boundary

FlowvaEditor owns the creative experience: category-aware workspaces, canvas/timeline/scene editing, local projects and assets, supported file import/export, template editing, and preparation of creator files for hand-off.

**FlowvaMarket remains the authority** for accounts, login/session, public listings/catalogue, product pages, pricing, checkout, purchases, ownership/entitlements, creator eligibility, listing drafts, moderation, payments and payouts. Do not recreate these systems in the editor. Integration must reuse the existing Market application and add only small, documented adapters where necessary.

The editor is guest-first. Visitors can browse public templates and use local creation without an editor account. Authentication is required only when a user enters a Market-owned action such as checkout, viewing purchases, retrieving a private purchased source, or submitting a creator listing.

## 2. Six workspaces — target experience

1. **Graphic Design** — print and general graphic canvas, typography, shapes, images, layers, layout and print-ready export.
2. **Social Media** — platform/placement presets, multiple artboards, safe zones, resize variants and digital/social export.
3. **Documents & Publishing** — page-based and eventually multi-page documents, text layout, page controls and PDF publishing.
4. **Logo & Branding** — precision logo/brand artwork, vector-oriented tools, palettes, logo variations and transparent/vector export where supported.
5. **Video & Motion** — media bin, preview, timeline/tracks, trimming, timing, transitions, motion and video export.
6. **3D & Models** — 3D viewport, scene/object hierarchy, transforms, materials, lighting, camera and model import/export.

This is the **target**, not a statement that all six modules exist today. See `docs/WORKSPACE_ARCHITECTURE.md` and `docs/FORMATS.md`. A workspace must never show a tool or export option that is only a mock or has not passed its acceptance tests.

## 3. Current implementation state (source-reviewed)

### Homepage and category routing
- The homepage workspace cards are rendered from `workspaces/registry.js`; the registry is the single source for workspace card metadata and preset definitions.
- The registry defines all six workspaces, their active/limited/planned status, editor type, current tools/panels, import/export references and known limitations.
- The five existing active categories retain their original creation modal/preset flow: Graphic Design, Social Media, Documents & Publishing, Logo & Branding, and Video & Motion.
- 3D & Models is a visible coming-soon placeholder with `planned` status and does not open a 3D editor.
- The homepage and editor both consume the same 27-preset registry; original preset IDs, labels, descriptions, dimensions and editor titles are preserved.
- The five active categories still use the existing shared editor engine. Their current differences are mainly preset selection and canvas dimensions, not separate specialist toolsets.
- The homepage contains marketplace template and purchased-template surfaces, but the package does not have a live Market connection.

### Existing editor capabilities (code-present; browser verification still required)
- Fabric-based canvas with text, shapes, images, icons/stickers, layers, selection/positioning, undo/redo and zoom.
- SVG and PSD import paths; PSD layers are converted into editable canvas objects with fidelity limitations.
- Lottie JSON, video and audio timeline media paths.
- PNG, JPG, PDF and timeline-video export menu entries.
- `.flowva` private editable project package, currently documented as version 2, for supported canvas/media state.
- Browser-local IndexedDB project and asset storage, with restrictions for media-heavy projects.

**Important current gaps:** PSD export is not present in the visible export menu; PDF import is not full native PDF content editing; `.flowva` is an editor project package, not a FlowvaMarket sale format; browser codec support affects media playback/export; all listed code paths still need real-browser regression testing.

### FlowvaMarket integration
- `config.js` currently has `BACKEND_ENABLED: false` and an empty `API_BASE_URL`.
- `api/client.js` is a legacy API facade using `/api/editor/` routes (`templates`, `listings`, `publish`, `purchases`, `ownership`, etc.). Its routes and payloads are not yet confirmed against the real FlowvaMarket API.
- No live catalogue, purchase, exact-template return, authorized edit-session or creator-publish flow is verified in this package.
- The main app developer hand-off is `docs/FLOWVAMARKET_HANDOFF.md`.

### Format policy
The editor recognizes format names for messaging/routing, but recognition is not support. Only advertise a format after there is a real parser/writer, representative fixtures, successful import/export or round-trip tests, documented fidelity limits, and matching server-side Market policy. See `docs/FORMATS.md` and `capabilities.js`.

## 4. Core user journeys

### A. Choose a workspace and create
1. User chooses one of the six categories.
2. Editor loads that category's configuration: editor module, canvas/scene type, presets, tools, panels, capabilities and export options.
3. User creates and saves locally or downloads a supported editable project.
4. Export offers only tested output types for that workspace.

### B. Discover, acquire and edit an exact Market template
1. Editor requests the public approved catalogue from FlowvaMarket; browsing is available to guests.
2. User selects a specific template. The editor preserves its immutable `listingId` and canonical type.
3. Get opens that exact listing's canonical FlowvaMarket product page—not a generic marketplace page or a search result.
4. FlowvaMarket handles login, free acquisition or checkout, then returns the user to the editor through a validated return flow.
5. FlowvaMarket verifies ownership and issues a short-lived, one-time edit ticket for that exact listing/source.
6. Editor exchanges the ticket, retrieves a short-lived read-only source, checks capability support, and opens a **private working copy**. The seller's original is never overwritten.
7. If that format is unsupported, the user sees a truthful download/open-externally message and no Edit action.

### C. Creator publishes to FlowvaMarket
1. Creator finishes the design in the appropriate workspace.
2. Editor prepares the supported source file and preview/thumbnail, plus basic metadata and canonical type.
3. Editor hands off to FlowvaMarket's existing creator upload/listing-draft workflow.
4. FlowvaMarket handles creator authentication/eligibility, file validation, category, title/description, price/free selection, listing draft, moderation and publication.
5. After publication, the approved listing appears in the public catalogue and the creator's listing area. The editor does not publish directly or bypass moderation.

## 5. Development rules

- Implement one small milestone at a time; every milestone must create a visible, testable improvement.
- Keep each task's file scope narrow. Do not rewrite the app or migrate frameworks unless a separate approved task requires it.
- Inspect current code before editing. Preserve existing working behaviour and unrelated features.
- Do not create placeholder controls that imply functionality. Mark future capabilities as unavailable/coming soon.
- Do not enable a file type because its extension is recognized.
- Keep `capabilities.js` as the client capability reference, but FlowvaMarket must enforce its own server-side entitlement/type policy.
- Never trust browser-supplied ownership, user ID, price, listing status, source URL or publish approval.
- Keep secrets out of browser code. Use HTTPS, CSRF protection, strict CORS, allowlisted return URLs and short-lived scoped tickets.
- After each task: run the specified checks, manually verify the visible result, update the status tracker, and commit the task separately.

## 6. Run locally

This is currently a static HTML/CSS/JavaScript project with no required build step:

```bash
npx serve .
```

Open `index.html`. Open `editor.html` directly for editor checks. Run `node tests/workspace-registry.test.js` to verify workspace IDs, all 27 preset dimensions, the 3D guard and registry script wiring. With `BACKEND_ENABLED: false`, local functionality can be tested but Market-connected flows cannot be considered complete.

## 7. Documentation map

| File | Purpose |
|---|---|
| `docs/IMPLEMENTATION_ROADMAP.md` | Ordered milestones, visible outcomes, Git checkpoints and completion gates |
| `docs/BASELINE.md` | What is in this source snapshot and what has/has not been verified |
| `docs/WORKSPACE_ARCHITECTURE.md` | How category selection must configure the editor |
| `docs/FORMATS.md` | Honest import/create/export support and format acceptance rules |
| `docs/BACKEND_CONTRACT.md` | Technical API contract between editor and Market |
| `docs/FLOWVAMARKET_HANDOFF.md` | Short, practical hand-off for the main-app developer |
| `docs/SECURITY.md` | Security requirements and known gaps |
| `docs/AI_TASK_RULES.md` | Rules for small, file-scoped AI implementation tasks |
| `docs/tasks/` | Individual task briefs; use one at a time |

## 8. Production release gate

Production release requires, at minimum: completed and browser-tested workspace behaviour; verified file-format claims; secure real FlowvaMarket catalogue/acquisition/edit/publish integration; no false ownership or Edit state; seller-source protection; import sanitization and upload validation; deployed security headers; cross-browser regression; accessibility/performance review; and a documented rollback/deployment procedure. This repository has not passed that gate yet.
