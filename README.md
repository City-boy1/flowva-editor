# FlowvaEditor

**Repository:** `flowva-editor`  
**Purpose:** Standalone browser-based creative editor designed to work alongside the existing FlowvaMarket application.  
**Current source baseline:** v1.3.2 — v1.3.1 plus a working, self-hosted **Remove background** (see *Current project state* below). v1.3.1 was v1.3.0 plus the `.flowva` video-restore fix and the PNG/JPG export fix.  
**Release status:** Integration preparation build — not a production release. Browser-level verification of the latest fixes is still pending.

> FlowvaMarket already exists and remains the marketplace, account, checkout, purchase, ownership, moderation and payout system. FlowvaEditor is the creative tool. It must not recreate those marketplace systems.

## Product boundary

FlowvaEditor provides the editing experience: create projects, open local files, edit supported formats, manage layers/assets, save editable working projects and export files to the user's device. FlowvaMarket remains responsible for accounts, purchases, download entitlement, listings, checkout, moderation and payments.

There are two independent ways to open a file:

1. **Local file:** A user selects a file from their device. The editor opens it locally where its format is supported. This path does not require a FlowvaMarket login or ownership API. The user can export/download the result to their device.
2. **Marketplace-authorized edit:** FlowvaMarket verifies the signed-in user's purchase and file eligibility, then issues a short-lived, one-time edit ticket. The editor exchanges it for a short-lived source URL and opens a private working copy. Saving never overwrites the seller's original.

A file downloaded from FlowvaMarket can therefore be opened later through the local-file path, subject to the same format support and fidelity limits. The editor must not claim that every recognized file can be edited.

## Format support policy

The marketplace has 31 creative type codes. The editor should recognize the full list for messaging and routing, but only advertise capabilities that are implemented and tested. The capability registry in `capabilities.js` is the intended shared reference for the editor and the marketplace (the marketplace may consume a mirrored JSON/API representation; it should not need to import this browser file directly).

| Format | Create | Open/edit locally | Marketplace Edit flow | Current status / limitation |
|---|---|---|---|---|
| PSD | Yes, intended | Yes, with fidelity warning | Yes, when backend ticket flow is connected | Current implementation needs round-trip verification; some Photoshop effects/features may not survive. |
| PSB | Unverified | Unverified | Disabled until verified | Do not advertise until large-document read/write spike passes. |
| PDF | Yes | Limited | Planned/limited | Current jsPDF export; imported PDF editing is a rendered/locked background with overlays, not content-stream editing. |
| GLB | Planned | Planned | Planned | Requires a 3D module and GLTF exporter. |
| FBX | No native writer | Import/convert only, planned | Convert flow planned | Convert to GLB; rigs/animation may be lossy. |
| AI | Experimental only | No native editing | No | Prefer SVG/PDF export; never claim faithful native AI output without verification. |
| FCPXML | Planned | Planned for supported timelines | Planned | XML timeline format; Phase 4. |
| SKETCH | Optional research | Not implemented | Not implemented | ZIP/JSON format; only if justified by demand. |
| CANVA | No | No | No editor flow | It is a link; direct users to Canva. |
| INDD, CDR, AFDESIGN, AFPHOTO, FIG, AEP, PRPROJ, DRP, BLEND, C4D, MAX, MA, FLA, SPINE | No | No | No | Proprietary/undocumented formats; direct users to their native applications. |
| PLP, IBIS, PicsArt PXD, GoDaddy Studio, ALIGHT, KMPROJECT, VNPROJ, CAPCUT | No | No | No | Mobile-app proprietary formats; do not claim browser editing. |

**Important:** The table describes the product roadmap and honest target support. It is not a claim that every listed capability is implemented in this repository today. Do not enable a capability until there is a real parser/writer, representative fixture files and passing round-trip or import/export tests.

## Current repository contents

- `index.html`, `app.js`, `app.css`: standalone workspace shell and local project/asset experience. The workspace home has been refocused on creating, opening local files, projects and private assets. Marketplace discovery, listing creation, pricing and payout management are intentionally outside this UI and link to FlowvaMarket. The editor page still contains legacy marketplace hand-off code that must be reconciled before production integration.
- `editor.html`, `editor.js`, `style.css`, `responsive.css`, `mobile.js`: editor interface, canvas interactions and responsive behaviour.
- `project-engine.js`: local project package and asset/recovery support.
- `api/client.js`: current API facade. Its existing route set is legacy and must be reconciled with `docs/BACKEND_CONTRACT.md` before enabling backend mode.
- `config.js`: public runtime configuration only. Never put secrets or private credentials here.
- `vendor/bgremoval/`: self-hosted background-removal runtime and model (`worker.js`, `ort.wasm.min.js`, `ort-wasm-simd.wasm`, `isnet-small.onnx.001`–`.004`). Loaded lazily, only when the user clicks **Remove background**. All seven files must be deployed together, unmodified and in the same folder.
- `vendor/`: browser libraries currently referenced by the pages. Keep these until imports are migrated and verified; do not delete based on file size alone.
- `capabilities.js`: format capability and type-code reference for the editor integration.
- `docs/`: backend hand-off, security, format and verification notes.

## Run locally

This is currently a static HTML/CSS/JavaScript project with no required build step:

```bash
npx serve .
```

Open `index.html`. With backend mode disabled, local workspace features should remain usable. Open `editor.html` directly for editor testing. Some online project/purchase features will be unavailable in standalone mode.

## FlowvaMarket integration

See [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md). The integration is intentionally small: FlowvaMarket authenticates and authorizes; the editor handles local editing, project packaging and exports. The marketplace developer should not need to build editor functionality or duplicate the editor's file parsers.

## Quality and release status

This repository is an integration-preparation baseline, not a certified production release. The prior editor layout/text fixes have passed JavaScript syntax and ZIP integrity checks, but a full browser regression run, security audit, format round-trip suite, Lighthouse baseline and real backend integration have not been completed here. See [`docs/BASELINE.md`](docs/BASELINE.md) and the status checklist below.

### Before production

- [x] Remove duplicate marketplace browsing and listing/publishing screens from the workspace home; provide a direct FlowvaMarket link.
- [ ] Reconcile remaining legacy marketplace hand-off code inside the editor and remove unused marketplace API routes before production.
- [ ] Implement the small backend contract and test one-time edit tickets.
- [ ] Verify local open/edit/export independently of backend login.
- [ ] Verify PSD import/export round trips and fidelity warning.
- [ ] Add representative format fixtures and automated tests before enabling further capabilities.
- [ ] Sanitize SVG and audit untrusted text/HTML rendering.
- [ ] Move CSP to real HTTP response headers and remove unsafe/wildcard allowances.
- [ ] Self-host fonts and remove third-party runtime requests.
- [ ] Lazy-load heavy libraries; measure start-page and editor performance.
- [ ] Add browser tests and CI; record Lighthouse results.
- [ ] Confirm deployment headers, HTTPS, CORS and session-cookie settings with FlowvaMarket developer.

## Current project state (v1.3.2)

### What works (do not regress)
- Create/edit designs: text, shapes, icons, stickers, images, SVG, PSD import (layers editable), Lottie JSON, video (MP4/WebM), audio on the timeline, per-object timeline start/end and in/out animations, layers panel, undo/redo, zoom, responsive/mobile layout.
- Browser **Save** / Ctrl+S / autosave for static designs (IndexedDB Projects), Asset Library (homepage and inside the editor under Uploads).
- **Download `.flowva`** and reopening it with **Open file**: canvas objects, images, original video/audio bytes, Lottie JSON, audio start/duration are embedded and restored. Images, animations and audio were already restoring correctly.
- **Export**: PNG, JPG, PDF, Video (timeline recording).

### Fixes in v1.3.2 — Remove background (only this was changed)
*Cause:* `removeBG()` did a runtime `import()` of `@imgly/background-removal` from `cdn.jsdelivr.net` and downloaded the model from a third-party host; it also called `fetch()` on the image's `blob:`/`data:` source. The page CSP (`connect-src 'self' https:`, no `wasm-unsafe-eval`) blocks that, and the project's own plan (P5 in `docs/PLAN_OF_RECORD.md`) says not to depend on a CDN for this.
*Fix (self-hosted, no CDN):*
- `removeBG()` in `editor.js` (plus helpers `bgRun()` and `canvasToDataUrl()`) reads pixels straight from the image element (no `fetch`), downsizes to 1024×1024, and sends them to a **Web Worker** (`vendor/bgremoval/worker.js`) so the editor does not freeze.
- The worker uses **onnxruntime-web 1.17.3** (WASM, single thread, no SharedArrayBuffer needed) with an **IS-Net 8-bit model** (`isnet-small.onnx`, shipped as four parts `.001`–`.004` that the worker downloads in parallel and joins). Input is normalised `(v-128)/256`; output is a 1024×1024 alpha mask.
- The mask is scaled back to the image's size with canvas `destination-in`, encoded to a PNG data URL and applied with `fabric.Image.setSrc` followed by `commit()` (so undo/redo and saving work). Images larger than 4096 px on the long side are downscaled and `scaleX/scaleY` are compensated so the displayed size is unchanged.
- **Performance:** nothing loads at page start (zero Lighthouse impact). The worker is created on first click, caches the assembled model in Cache Storage (`flowva-bg-model-v1`), and is terminated after 2 minutes idle to free memory.
- **CSP:** `editor.html` `script-src` gained `'wasm-unsafe-eval'` (required to run WebAssembly). Nothing else in the CSP changed.
- **Files changed:** `editor.js` (only `removeBG` and its helpers), `editor.html` (CSP), new `vendor/bgremoval/`, `vendor/VERSIONS.md`, this README. No other behaviour was touched.

*Verification (Chromium via Playwright, local static server):* a 512×512 portrait photo had its background removed (about 46 % of pixels became transparent), the result was stored as a PNG data URL, and the longest main-thread stall during processing was about 35 ms. First run took about 13.5 s (model load plus single-thread inference). Lighthouse on `editor.html` against a plain dev server: Performance 89–91 (the unchanged v1.3.1 scored 91 in the same setup, so the difference is noise), Accessibility 100, Best practices 93, SEO 100. **Not yet verified:** other browsers (Safari, Firefox, mobile), very large or CORS-tainted images, and behaviour on the real hosting setup.

### Fixes in v1.3.1
1. **Video invisible on the canvas after reopening a `.flowva` (still present on the timeline).**
   *Cause:* Fabric.js 5.3 draws an image element using `element.naturalWidth || element.width`. A `<video>` has no `naturalWidth`, and its `width` attribute is `0` unless set. `addVideo()` sets it, but the `.flowva` restore path (`hydrateProjectMedia` / `restore`) did not, so Fabric drew a zero-width slice. Audio and Lottie were unaffected because a Lottie canvas has real dimensions.
   *Fix:* new `sizeVideoEl()` sets the element's width/height from `videoWidth`/`videoHeight` after the video loads, and again immediately before each Fabric rebind (reviver and `loadFromJSON` completion callback). This also covers undo/redo restores.
2. **PNG/JPG export stopped working.**
   *Cause:* the export converted `canvas.toDataURL()` to a Blob with `fetch(dataURL)`. The page's CSP (`connect-src 'self' https:`) blocks `data:` fetches, so the export failed.
   *Fix:* new `dataUrlToBlob()` decodes the data URL locally. The CSP was not loosened. PDF and Video export code paths were not changed.

### Verification status of v1.3.1
- Passed: JavaScript syntax check; `dataUrlToBlob` output check; `.flowva` package/unpack round trip (object sources, video data, audio metadata); static confirmation in the vendored Fabric 5.3.0 source that `_renderFill` uses `naturalWidth || width`.
- **Not yet verified in a real browser:** reopening a `.flowva` with the actual MP4/WebM and confirming the video renders and plays; PNG/JPG download of a plain template. Please test both in Chrome before building on this.

### Known items deliberately left untouched
- Non-data image sources elsewhere still use `fetch()` on `blob:` URLs, which the CSP blocks (a console error appears when adding an upload; it predates v1.3.2 and is unrelated to background removal). Not fixed yet.
- `config.js` still reports `APP_VERSION: '1.3.0-project-image-save-fix'`; not bumped.
- `docs/PLAN_OF_RECORD.md` still lists self-hosted background removal as a future item; it is now done (v1.3.2, light version).
- Ordinary Save/autosave still pauses for video/audio/Lottie designs by design; use `.flowva` for those.
- All items in *Before production* above remain open.

## Media project saving: `.flowva` vs browser Projects

- **Browser Save / Ctrl+S / autosave** store static canvas content in the local Projects list. They pause and warn when video, audio or Lottie runtime media is present, so a project is never shown as saved with its media missing.
- **Download `.flowva`** (private format, v2) is the portable editable project. It packages canvas objects, original video/audio source bytes (the retained `File`/`Blob`, not the temporary `blob:` URL), Lottie animation JSON and audio start/duration metadata. It is saved to the user's device only and is not duplicated into browser Projects. Reopen it with **Open file**.
- On open, embedded `data:` URLs are decoded directly into Blobs (no `fetch(data:)`; CSP stays strict), in yielding chunks. Video elements are primed with a decoded frame, sized from their real video dimensions, and bound to the Fabric objects inside the `loadFromJSON` completion callback.
- Embedded image/video/audio payload limit: 100 MB combined (base64 adds roughly one third). Failures name the affected media and stay on screen until dismissed.
- Lottie files that reference external image files may not be self-contained; use Lottie JSON with embedded images. Playback depends on browser codec support.
- **Export → Video** is a flattened deliverable, not an editable backup. Keep a `.flowva` to continue editing.
- Asset Library: **Uploads → Asset Library → Add** inserts an asset into the open design. A dismissible save guide floats below the toolbar without resizing the canvas/timeline. On phones, Save and Download .flowva stay in the header.
- Error notifications stay until closed with **×**; success/info are green, errors red.

## Working rules

1. This README is the product boundary and scope reference. Record scope changes here.
2. Do not ask the FlowvaMarket developer to rebuild marketplace features. Request only the endpoints/actions in the backend contract.
3. Local-file editing and device export must work without a marketplace session, wherever the format capability permits.
4. Marketplace Edit requires backend authorization; never trust browser-supplied user IDs or listing ownership claims.
5. Always edit a private copy. Never overwrite a seller's source file.
6. Recognizing a file extension is not the same as supporting its format.
7. Do not delete vendor libraries until all references are removed and regression tests pass.
8. Mark work complete only after stating exactly what was tested and what remains unverified.


## Local storage and project workflow

- Assets and static Projects are stored in browser IndexedDB on the current device; they are not uploaded to FlowvaMarket or an editor server. Each Asset Library file is limited to 100 MB. Total available space is controlled by the browser/device quota and may be lower in private browsing or on low-storage devices. The app displays an approximate usage warning when browser storage reaches 85%, and quota errors produce a direct message. Browser estimates are not guarantees; browsers can still deny writes or evict data.
- The Projects list stores lightweight project metadata separately from project content. A local Projects entry is created only on explicit browser Save. Downloading `.flowva` creates a portable device file and does not create a duplicate Projects record. Existing saved static projects can be updated by autosave (10-second interval while changes are pending) and manual Save. Autosave and manual project saves are paused when video/audio/Lottie timeline media is present, because those media sources are not yet serialised.
- A `.flowva` download is the portable editable project backup: it embeds supported canvas images, original video/audio source files, Lottie JSON and audio timeline metadata (100 MB combined embedded media/image limit). It downloads to the user's device and is intentionally not duplicated into browser IndexedDB Projects; reopen it later with **Open file**. This avoids storing a second potentially large copy and keeps browser Projects lightweight. Browser Save/autosave remains static-canvas-only and pauses when runtime media is present. Export → Video is a flattened final deliverable, not an editable project. PNG/JPG/PDF/video exports download to the user's device and do not automatically upload to FlowvaMarket.
- Browser storage is device- and browser-specific. Clearing site data, using private browsing, changing browsers/devices, or browser eviction can remove local projects/assets. Users should download `.flowva` backups for important work and export final deliverables.
- The asset-library screen renders at most 40 thumbnails at once; search narrows the visible list. This avoids loading every large preview at once.
- The Projects page has one primary creation action in the top bar. Projects saved in this browser appear in the list automatically; there is no account-wide cloud project sync in this local-mode build.


### Project saving and asset reuse

Use **Save** (or Ctrl/Cmd+S) for static designs in this browser's Projects list. Use **Download .flowva** for a portable editable backup of media-heavy work; keep that file on your device and use **Open file** to continue editing later. The editor deliberately does not duplicate large `.flowva` packages in browser Projects. Opening a file from the workspace home starts with a clean editor session rather than restoring the previous project. Supported image, video, audio and Lottie JSON assets can be inserted from the homepage using **Use in editor**, or directly into an already-open design from **Uploads → Asset Library → Add**. Browser Save remains static-canvas-only. Local projects and assets remain browser/device storage, not cloud backups; users should download `.flowva` backups for important work.

### Background removal: known limits and recommended upgrades (for the main build)
- **Edge sharpness:** the small 8-bit model sees only 1024×1024 pixels, so edges on large images are slightly soft; hair and fine detail are the weak point. Upgrade options: a 16-bit/full IS-Net or BiRefNet, plus an edge-refinement pass.
- **Licence:** the model weights were taken from the `@imgly/background-removal-node` 1.4.5 package (AGPL-3.0 packaging). No IMG.LY code is used. Before commercial release, replace them with weights obtained directly from the original open-source model's authors under their own licence, and confirm that licence.
- **Repo weight:** the model adds about 44 MB (about 55 MB with the WASM runtime). Recommended: host the model on your own storage/CDN (for example a Cloudflare R2 bucket with CORS enabled) and change `PARTS` in `worker.js`; update the CSP `connect-src` if the host is not `'self'`.
- **Speed:** runs on CPU, single thread. GPU (WebGPU) support with this CPU path as fallback is a possible later upgrade.
- **When changing the build:** keep `'wasm-unsafe-eval'` in the CSP, copy `vendor/bgremoval/` unmodified, keep `worker.js` and the model parts in the same folder, and do not overwrite `removeBG()`.

### Change history
- **v1.3.2 (2026-11-23):** Remove background fixed: self-hosted ONNX model and runtime in a Web Worker, lazy-loaded, no CDN, CSP gains `'wasm-unsafe-eval'`. No other features changed.
- **v1.3.1 (2026-11-23):** `.flowva` video now renders on the canvas after reopening (video element sized before rebind); PNG/JPG export fixed (no `fetch(data:)`).
- **v1.3.0 (2026-11-23):** video object rebind moved into the `loadFromJSON` completion callback; media-heavy `.flowva` no longer duplicated into IndexedDB; storage-quota warnings.
- **2026-11-22:** `.flowva` export reads retained original media Blobs; CSP-safe `data:` decoding on open; save-guide and project-card cleanup.
