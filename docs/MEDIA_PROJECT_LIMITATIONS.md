# Media project saving and portability

## Two distinct save paths

**Browser Projects Save / autosave / workspace save:** static-canvas-only. These actions pause and show a warning if a design contains video, audio timeline tracks or Lottie runtime media. This prevents a browser project record from appearing saved when its source media would be missing on reopen.

**Download `.flowva`:** portable editable project package (format version 2). It embeds original video/audio source files, Lottie animation JSON, canvas object data and audio track start/duration metadata. On open, FlowvaEditor decodes embedded `data:` URLs directly into Blob objects (without `fetch(data:...)`, which is blocked by the strict `connect-src` policy) and restores the media elements and audio tracks before restoring the canvas. Base64 decoding yields in chunks to limit main-thread stalls. Video elements are primed with a decoded frame and rebound to Fabric image objects after the JSON load completes. The combined embedded image/video/audio payload is limited to 100 MB. Video/audio imports retain their original File/Blob bytes, and `.flowva` export embeds those bytes directly rather than depending solely on a temporary playback URL. Media reopened from `.flowva` retain their reconstructed Blob for subsequent exports. If a source cannot be embedded or the limit is exceeded, the download fails with a persistent error identifying the affected media where possible.

Lottie files that depend on separately referenced image files may not be self-contained. Browser codec support varies, so a browser may be unable to decode a particular video/audio format even when the source is embedded correctly.

## User guidance

- Use `.flowva` when you need to reopen a media-heavy design and continue editing it. Keep the downloaded file on the user's device and open it later with **Open file**; it is the portable source of truth.
- Use Export → Video for a flattened final deliverable, not an editable project backup.
- Keep original source media as an additional backup, especially for large or externally dependent Lottie assets.
- If `.flowva` packaging fails, reduce the combined embedded image/video/audio payload to 100 MB or less and re-add any source that could not be read.

## Asset Library inside the editor

Open **Uploads → Asset Library** and choose **Add** next to an image, video, audio file or Lottie JSON asset. This inserts the asset into the currently open design without returning to the workspace homepage.

## Verification still required

Before production sign-off, run browser round-trip tests for MP4 and WebM video, supported audio formats, Lottie JSON, mixed media timelines, missing/corrupt package assets, the 100 MB boundary, large-file memory pressure and download interruption. Check Lottie animations that reference external images separately.


## Recent export reliability fix

A user report identified a failure in mixed-media `.flowva` export. The exporter previously relied on fetching a temporary `blob:` playback URL to recover source bytes. Video/audio import now keeps the original File/Blob in runtime state, and the package writer reads that retained binary. The playback URL fetch is only a fallback. This implementation has static and package-structure checks; test actual browser exports with the codecs and files used by end users before treating media round-tripping as production-verified.


## Browser storage policy and quota
A downloaded `.flowva` package is intentionally not duplicated into browser IndexedDB Projects. A second copy of a large media package wastes device storage, increases quota pressure and can slow saves. Static Projects and the Asset Library remain browser-local; media-heavy projects should be reopened from the downloaded `.flowva` file.

Browser storage capacity is dynamic and differs by browser, device, available disk space and private-browsing mode. The 100 MB combined embedded-asset limit is an application safety limit, not the browser's storage quota. Base64 encoding also increases package size by roughly one third, and decoding temporarily uses additional memory. The workspace displays an approximate low-storage warning at 85% of the reported quota when the Storage API is available. IndexedDB write failures caused by quota exhaustion produce a clear message. Estimates are approximate and cannot guarantee future writes or prevent browser eviction; users should keep important `.flowva` files on their device and make separate backups.


## 2026-11-23 follow-up — silent video canvas restore issue

The final Fabric video-element rebind now occurs inside the asynchronous `loadFromJSON` completion callback. Previously it ran immediately after starting the load and could target the old canvas objects, leaving the newly loaded video placeholder visible while producing no console error. This is the suspected cause of the reported video-only failure. Test with real MP4 and WebM files in supported browsers before release sign-off.
