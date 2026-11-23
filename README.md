# FlowvaEditor

**Repository:** `flowva-editor`  
**Purpose:** Standalone browser-based creative editor designed to work alongside the existing FlowvaMarket application.  
**Current source baseline:** v1.2.8 editor code with the layout, timeline-collapse, selection and text-editing fixes.  
**Release status:** Integration preparation build — not a production v1.3.0 release.

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

## Media project saving: `.flowva` vs browser Projects

- The ordinary **Save** action, Ctrl/Cmd+S and automatic browser recovery save supported static canvas content to the local Projects store. The ordinary browser Save/autosave path deliberately pauses and warns when video, audio or Lottie runtime media is present. Download .flowva is different: it packages the full media project and also attempts to store that full snapshot in the local Projects list. A project card is created only when one of these explicit save actions succeeds, never just by opening a blank design.
- The separate **Download `.flowva`** action (private project format, v2) is the portable editable project path. It packages editable canvas objects plus original video/audio source files and Lottie animation JSON, along with audio track start/duration metadata. The editor retains the original File/Blob when media is imported and embeds those original bytes directly; it does not rely only on the temporary `blob:` playback URL. Reopening the `.flowva` hydrates the media players and timeline so supported media can continue to be edited and played. Video objects are rebound to their decoded video elements after Fabric finishes loading the project.
- `.flowva` embeds media in the file; it is not a cloud link and does not require the original browser Asset Library after export. The combined embedded image/video/audio payload is limited to 100 MB. If a source cannot be read or the package exceeds the limit, the download fails with an explicit, persistent error instead of producing an incomplete file. The error includes the media name and the read failure where available. Compress large media or remove unused assets and retry.
- Lottie animations that depend on separate, externally referenced image files may not be self-contained; use Lottie JSON with embedded image assets for portable files. Playback also depends on browser codec and Lottie feature support.
- **Export → Video** remains a flattened final deliverable, not an editable project backup. Keep a `.flowva` file when you need to reopen and continue editing.
- The browser Asset Library is available inside the editor under **Uploads → Asset Library**. Choose **Add** beside an asset to insert it into the currently open design; it is not necessary to return to the homepage first. A compact save guide floats below the toolbar without taking a grid row, so dismissing it does not resize the canvas or timeline. On phones, Save and Download .flowva controls remain visible in the header.
- Editor and homepage error notifications stay visible until the user closes them with the **×** control. Success and informational notifications use green; errors use red.

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


### 2026-11-22 follow-up: original media bytes during `.flowva` export

A user-reported `.flowva` export failure exposed a fragile assumption: media packaging fetched the temporary playback `blob:` URL to recover the source bytes. Video/audio imports now retain the original `File`/`Blob` in runtime media state, and `.flowva` export reads that retained binary directly. Media hydrated from an existing `.flowva` also retain their reconstructed Blob for subsequent saves. A fetch of the playback URL remains only as a compatibility fallback for media entries without a retained source Blob. If neither source is available, the export reports the specific media name and failure rather than creating an incomplete package. This change has passed static source checks and package-format round-trip checks; actual browser testing with the user's video/audio formats remains required.

### 2026-11-22 follow-up: CSP-safe media restore and save-flow cleanup

- `.flowva` data URLs are now decoded directly into Blob objects; the restore path no longer calls `fetch(data:...)`, so the existing `connect-src 'self' https:` policy remains strict. Base64 media is decoded in yielding chunks to reduce main-thread blocking on larger files.
- New local designs no longer create empty Projects cards at editor launch. A local project record is created after explicit browser Save. `.flowva` downloads remain device files and are not copied into browser Projects.
- The save guide is a floating, dismissible top strip that does not participate in editor grid sizing. Save and Download .flowva remain visible in the mobile header.
- Verification: JavaScript syntax and package/data-URL decoder checks pass. Full browser round-trip with the user's exact MP4 and a Lighthouse run remain to be performed before production sign-off.


2026-11-23 follow-up — portable media file and storage policy: media-heavy `.flowva` downloads are kept as device files and are no longer duplicated into IndexedDB Projects. This avoids a second large copy, quota pressure and slow project listing. The video restore path now primes a decoded frame and rebinds Fabric image objects after JSON loading; actual browser codec/playback verification remains required. Browser storage usage shows an approximate low-space warning at 85%, and IndexedDB quota errors receive a clear message.


### 2026-11-23 follow-up: video object rebind after asynchronous Fabric restore

A reported silent failure showed that audio and Lottie restored while the video canvas object remained blank. The restore function had attempted its final media rebind immediately after calling Fabric `loadFromJSON()`, before Fabric had asynchronously replaced the canvas objects. That rebind therefore targeted the previous canvas contents. The final video/Lottie element binding now runs inside the `loadFromJSON` completion callback, against the newly loaded objects, and marks them dirty for a fresh render. The reviver remains as an early binding path. This is a targeted source-level correction; real-browser playback with the user's MP4 is still required to confirm the result.
