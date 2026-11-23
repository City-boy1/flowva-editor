# Verification baseline

**Source reviewed:** FlowvaEditor v1.2.8 GitHub-tidy archive.  
**Prepared on:** 2026-11-22.  
**Status:** Static source review only; no live-browser or production-host measurements recorded.

## Verified during preparation

- Workspace home refreshed to focus on local editing, projects and private assets; duplicate marketplace template/publish views removed from `index.html` and their home-shell logic removed from `app.js`.
- Home-page HTML parsed and required workspace elements checked; duplicate marketplace/publish view identifiers confirmed absent.
- Updated `app.js` passed `node --check`.

- Existing JavaScript source syntax checked with `node --check` where applicable.
- Source archive could be extracted and inspected.
- Project entry points, editor, API facade and vendor references inspected.

## Not yet verified

- Full browser regression on supported desktop/mobile browsers, including visual review of the refreshed home page.
- Timeline collapse/expand on short-height screens.
- Text editing and text-box resize behaviour after the latest patch.
- PSD import/export round-trip fidelity.
- Local open/edit/download for every capability marked supported.
- Marketplace edit-ticket flow against a real backend (current integration assumptions are not a substitute for a real server).
- SVG sanitization and complete DOM injection audit.
- Strict CSP/security headers on the deployment host.
- Lighthouse performance/accessibility/best-practices/SEO scores.
- Build/CI pipeline and dependency audit.

Do not fill in Lighthouse scores or mark these checks complete without running them and recording browser, device, network profile and test date.


## Home, projects and storage follow-up

- The home page now has a single global New design action; the Projects view no longer repeats a second creation button in its toolbar or empty state.
- Local projects are indexed in IndexedDB and their content is stored separately from metadata. Autosave updates eligible static-canvas projects; it is blocked when video/audio/Lottie runtime media is present because those sources are not serialised.
- `.flowva` is the portable editable project download. It packages embedded images, original video/audio sources, Lottie animation JSON and audio track start/duration metadata (100 MB combined embedded media/image limit), then hydrates supported media on reopen. Browser Projects Save/autosave remains static-canvas-only and pauses when runtime media is present. PNG/JPG/PDF/video are final exports; rendered video is not an editable project backup.
- Assets remain local in IndexedDB, with a 100 MB per-file guard. Aggregate capacity is browser/device quota-dependent; no fixed universal aggregate limit is promised. Storage usage is estimated through the browser Storage API where available.
- Asset library preview rendering is capped at 40 visible items per render to limit memory and decode work.
- These changes have syntax and archive checks; real browser quota/eviction behavior and cross-browser persistence still require manual testing.


## Follow-up: project image persistence and save workflow

The current integration-preparation update adds a more defensive image snapshot path: Fabric image sources are embedded as data URLs before local project persistence or `.flowva` export. If an image cannot be embedded, saving now reports an error instead of silently retaining a temporary `blob:` URL. This path requires browser testing with large images and multiple image formats before production sign-off.

The editor toolbar's **Save** action now writes immediately to the current local project record (and updates the recovery snapshot); Ctrl/Cmd+S invokes the same action. A separate download control exports an editable `.flowva` package. **Open file from your device** starts a fresh editor session and skips the previous-session recovery prompt/state.

Asset-library cards offer **Use in editor** for supported image, video, audio and Lottie JSON assets. The editor also exposes the browser Asset Library under **Uploads → Asset Library**; its **Add** action inserts the selected item into the currently open design. Other stored file types remain library-only unless a supported importer is implemented.

These are source-level changes and syntax/ZIP checks only; full browser regression testing (including image reload after closing/reopening the browser, quota failure, and asset insertion) remains required.


## Media timeline persistence audit — 2026-11-22 (superseded by .flowva media packaging update)

- Found that editor snapshots deliberately replace video/Lottie canvas sources with a blank placeholder and do not serialize audioTracks. Consequently, a normal save/reopen could silently lose video/audio/Lottie playback.
- Browser-local autosave, manual Projects save and workspace save remain blocked when video/audio/Lottie runtime media is present. The `.flowva` download path has since been upgraded to package editable media sources and restore them on reopen.
- Supported static canvas content (including embedded images), shapes, text, emoji and timeline animation properties on supported canvas objects remain eligible for project save.
- Exported video is a rendered final output, not a reopenable editable timeline.
- Implemented in this handoff: versioned media manifest, embedded video/audio source data, Lottie JSON, audio track start/duration metadata, media hydration on `.flowva` open. Still required: manual browser round-trip tests across supported codecs, external Lottie image asset validation, large-file memory/quota testing and failure-path UX verification.
- Verification for this handoff: JavaScript syntax checks and ZIP integrity only; browser playback/export and save-blocker UX require manual testing.


## 2026-11-22 follow-up — `.flowva` media packaging and in-editor assets

- `.flowva` format version advanced to v2. The package contains embedded video/audio source files, Lottie animation JSON, audio timeline timing metadata and the canvas object data. On open, media elements/players are hydrated before the Fabric canvas is restored. The combined embedded image/video/audio payload limit is 100 MB.
- This is distinct from browser Projects Save and workspace save, which remain static-canvas-only and intentionally warn/block on runtime video/audio/Lottie media.
- Asset Library is now reachable from the editor's Uploads panel. The Add action inserts an image/video/audio or Lottie JSON asset into the active design without leaving the editor.
- Toast errors persist until the user closes them; homepage notifications use green for info/success and red for errors.
- Static checks are not a substitute for browser verification. Test video/audio/Lottie `.flowva` round trips, codec compatibility, large files and interrupted/failed downloads before production use.


## 2026-11-22 follow-up — `.flowva` original media source retention

A reported failure while exporting a mixed text-animation/video/image design showed that reading media back from its temporary playback `blob:` URL was too fragile. Video and audio import now retain the original `File`/`Blob` alongside the playback URL. The `.flowva` exporter reads the retained original bytes directly; media reconstructed from a `.flowva` package also retain their Blob for repeat exports. Fetching a playback URL remains a fallback only when no original Blob is present. Failure messages now identify the affected media name and include the browser read error when available. Static checks and package/unpackage tests pass; real browser export/reopen/playback testing remains outstanding for MP4, WebM and supported audio codecs.


## 2026-11-22 follow-up — CSP-safe `.flowva` restore and save UX

- Fixed the reported `Failed to fetch` restore failure: media embedded as `data:video/...;base64` is decoded locally into Blob/object URLs. The Content Security Policy was not weakened; `connect-src` remains unchanged. Large base64 payloads decode in yielding chunks.
- Local editor launches no longer create empty Projects metadata records. A local Projects card is created after explicit browser Save. The later 2026-11-23 storage-policy update supersedes the earlier plan to duplicate `.flowva` media packages into browser Projects: media-heavy files are device downloads only. Export also removes an empty placeholder left by older builds, but preserves any project that already contains a saved static snapshot.
- Save guidance is now a compact strip directly below the toolbar, with concise text that is visible on small screens. Editor toast notifications wrap to content within the viewport.
- Checks: JavaScript syntax, extracted data-URL decoder tests and ZIP integrity. Still required: browser playback round-trip with actual MP4/audio/Lottie samples, visual checks at desktop/mobile breakpoints, and Lighthouse measurement.


## 2026-11-22 follow-up — stable editor layout and dual .flowva save
- The save guide is fixed below the topbar and removed from normal grid flow. Closing it cannot change the workspace/timeline grid sizing. Mobile Save and Download .flowva controls stay visible in the topbar.
- Download .flowva now attempts to save the same full editable snapshot to IndexedDB Projects, including media manifest, source data and a full-canvas preview thumbnail. The homepage permits only safe raster image data URLs for locally generated previews; opening the project card routes through the existing media hydration path. Browser quota failure does not cancel the device download and produces a clear warning.


## 2026-11-23 follow-up — media portability and storage policy
- `.flowva` remains the portable editable package for media-heavy projects. It downloads to the user's device and is reopened through Open file. It is no longer duplicated into IndexedDB Projects, avoiding a second large copy and unnecessary quota/memory pressure. Browser Projects Save/autosave remains static-only.
- Video restore now primes a decoded frame and rebinds video/Lottie Fabric objects after the JSON load callback. Static checks can verify this code path, but actual MP4/WebM playback must still be tested in a browser.
- Browser storage UI warns when the approximate Storage API usage reaches 85% of quota. IndexedDB project writes now translate QuotaExceededError into a clear message. Storage estimates are advisory; browser quotas and eviction remain browser/device controlled.


## 2026-11-23 follow-up — asynchronous video rebind correction

The previous video rebind was placed immediately after `loadFromJSON()`, but Fabric loads asynchronously. It could therefore bind the old canvas objects and leave the new video object displaying its blank placeholder without a console error. The final rebind now runs inside Fabric’s load-completion callback, after the new objects are present, and marks them dirty for rendering. Audio and Lottie restore paths are unchanged. Actual browser playback remains unverified until the user retests the same MP4.
