# Flowva Editor — Plan of Record

> **Read this file first.** It is the single source of truth for what we are building, why, and in what order.
> Any human or AI continuing the work: read this README, then the **Status Tracker** (section 12), then pick the first unchecked item. Update the tracker when you finish something. Do not invent scope that contradicts this file; if something here is wrong, change it here first and note it in the Decision Log (section 11).

**Plan target: v1.3.0. Source archive currently reconciled: v1.2.8-derived integration-preparation baseline. The archive does not yet substantiate every completion claim in the earlier v1.3.0 status line. See `BASELINE.md` for what was and was not verified.**
Baseline originally reviewed: `flowva-editor-v1_2_2.zip` (plain HTML/CSS/JS, no build step, Fabric 5.3.0). Items marked **UNVERIFIED** were not tested and need a short spike before anyone relies on them. This plan is retained as the product/technical direction; the repository README and `BASELINE.md` describe the actual current source state.

## How to run and test
- Run: serve the folder with any static server (`npx serve .`) and open `index.html`. It works standalone (`BACKEND_ENABLED: false`).
- Tests (real Chromium via Playwright, needs `npm i -g playwright && npx playwright install chromium`):
  `node tests/smoke.test.js "$PWD"` (start page + editor) and `node tests/edit-flow.test.js "$PWD"` (mock backend: purchases, Edit button, ticket flow).
- Backend needs: `docs/BACKEND_CONTRACT.md`. Headers: `_headers`. Type matrix: `capabilities.js`.
- Regenerate icons after adding any: `node scripts/gen-icons.js index.html app.js editor.html editor.js mobile.js`.

---

## 1. Goal

Flowva is a marketplace that accepts 31 kinds of creative source files. The editor must do two things:

1. **Create from scratch.** Let creators build, in the browser, every file type that *can honestly be produced in a browser*.
2. **Edit after purchase.** On a buyer's purchased item, if its file type is browser-editable, show an **Edit** button. Clicking it opens the editor with that file loaded, as a private copy.

Non-negotiables: **very fast, secure, reliable, production ready, Lighthouse-passing.**

Principle: **never claim a format we cannot produce faithfully.** A button that opens a broken file is worse than no button.

---

## 2. Feasibility matrix (the core decision)

"Create" = build from scratch and export this format. "Edit" = open a purchased file of this type and let the buyer modify it.

| Flowva type | Create in browser | Edit purchased file | How | Phase |
|---|---|---|---|---|
| **PSD** | Yes | Yes (with fidelity warnings) | `ag-psd` read/write. Layers, raster, basic text, groups, blend modes survive. Smart objects, adjustment layers, layer effects, and some text styling do not round-trip. Show a "what may change" notice before editing. | 2 |
| **PSB** | **UNVERIFIED** | **UNVERIFIED** | Same layer model as PSD. Check whether the pinned `ag-psd` can write the large-document variant. If not, drop it. | 2 spike |
| **PDF** | Yes | Limited | Create: jsPDF now, a real vector/multi-page pipeline later. Edit: render pages with pdf.js as a locked background plus editable overlay layers. True content-stream editing is not a goal. | 2 / 4 |
| **GLB** | Yes | Yes | three.js scene editor (primitives, import, transform, materials, lights) plus `GLTFExporter`. | 3 |
| **FBX** | No (not reliably) | Convert-only | three.js `FBXLoader` imports; there is no dependable FBX writer. Open → convert to GLB → edit → export GLB. Rigs/animation may be lossy; say so. | 3 |
| **AI** | Experimental | No | Real `.ai` is proprietary. A PDF-compatible file is the only plausible route. **UNVERIFIED** that Illustrator opens our output cleanly. Ship SVG + PDF export first; label `.ai` experimental or skip. | 5 |
| **FCPXML** | Yes (it is plain XML) | Yes, for timelines we can parse | Generate Final Cut XML from our timeline. Simplest "video project" format we can truly emit. | 4 |
| **SKETCH** | Possible (zip + JSON) | Possible | Open format, but a large surface area. Only if demand justifies it. | 5 (optional) |
| **CANVA** | No | No | It is a link, not a file. The marketplace stores the link; the buyer gets "Open in Canva". Not an editor concern. | — |
| INDD, CDR, AFDESIGN, AFPHOTO, FIG, AEP, PRPROJ, DRP, BLEND, C4D, MAX, MA, FLA, SPINE | **No** | **No** | Proprietary or undocumented binary/encrypted formats. No honest browser implementation. | — |
| PLP, IBIS, PicsArt PXD, GoDaddy Studio, ALIGHT, KMPROJECT, VNPROJ, CAPCUT | **No** | **No** | Mobile-app proprietary (often encrypted) project formats. | — |

**Result:** the editor ships three real modules: **Design (PSD/PDF/SVG/PNG/JPG)**, **3D (GLB, FBX→GLB)**, **Timeline (FCPXML, later)**. Everything else gets *no Edit button* and instead shows "Open in <native app>".

### Single source of truth for this table
Create `src/capabilities.js`:

```js
export const CAPABILITIES = {
  psd:     { create: true,  edit: true,  module: 'design',   warn: 'Some Photoshop effects may be flattened.' },
  pdf:     { create: true,  edit: 'limited', module: 'design' },
  glb:     { create: true,  edit: true,  module: 'model3d' },
  fbx:     { create: false, edit: 'convert', module: 'model3d' },
  fcpxml:  { create: true,  edit: true,  module: 'timeline' },
  // anything not listed => create:false, edit:false
};
```

The **main app imports the same list** (or a mirrored JSON) to decide whether to render the Edit button. Never hard-code type lists in two places.

---

## 3. Current state of the zip (audit findings)

**What it already does well**
- Fabric canvas editor: images, text, shapes, layers (drag reorder), undo/redo, alignment, filters, animation timeline, video export (MediaRecorder), PNG/JPG/PDF export, PSD import, Lottie, SVG import.
- `.flowva` versioned package format with limits (5,000 objects, 100 MB assets) and backward compatibility.
- IndexedDB asset library and crash-recovery snapshot.
- Sensible API facade (`api/client.js`): only file that knows backend URLs; CSRF echo, timeout, cookie session.
- Origin-checked `postMessage` embedding.

**Problems blocking production**

| # | Finding | Impact |
|---|---|---|
| P1 | `editor.html` loads ~2.4 MB of vendor JS **synchronously** (ag-psd 997 KB, jsPDF 364 KB, lucide 358 KB, Fabric 313 KB, Lottie 305 KB). | Fails Lighthouse Performance, poor on slow mobile data. |
| P2 | Lucide full icon set shipped for ~40 icons. | ~340 KB wasted. |
| P3 | Google Fonts loaded from third party. | Render delay, privacy, CSP hole. |
| P4 | `editor.js` is one 71 KB file, unminified, no modules. | Hard to maintain, no code splitting, hard for other AIs to extend safely. |
| P5 | Background removal does a runtime `import()` from `cdn.jsdelivr.net` and downloads a ~40 MB model; CSP allows jsdelivr scripts for it. | Supply-chain risk, no SRI, breaks offline, violates "secure". |
| P6 | CSP is a `<meta>` tag with `'unsafe-inline'` styles and `https:` wildcards for img/connect/media. `frame-ancestors` cannot be set via meta. | Weak. Needs real HTTP headers. |
| P7 | 31 `innerHTML` assignments across `editor.js`, `app.js`, `mobile.js`. Layer names, PSD text and SVG content are attacker-controlled when opening a purchased/third-party file. | XSS risk. Needs audit and sanitization. |
| P8 | Uploaded SVG is inserted with no sanitization step. | XSS / external-fetch risk. |
| P9 | PSD/PDF/Lottie parsing and export run on the main thread. | UI freezes on large files. |
| P10 | No service worker, manifest, caching headers plan, or `robots`/SEO files. | No repeat-visit speed, fails PWA/SEO audits. |
| P11 | No automated tests, no CI, no Lighthouse budget. `vendor/VERSIONS.md` says "re-run the browser tests" but none exist. | Not reliable. |
| P12 | Docs inconsistent: `config.js` says `APP_VERSION 1.2.1` (zip is 1.2.2); `FOR_SETH` references `docs/API_CONTRACT.md` that is not in the zip; `client.js` has an `ownership` route that the backend doc never lists. | Integration will break. |
| P13 | Exports sent to marketplace are only PNG/JPG/PDF/video. No path to publish an **editable source** file (PSD/GLB). Publish form posts only `projectId`. | Cannot sell what the editor makes. |
| P14 | `.ai` / `.aep` uploads show "convert it yourself" toasts. | Misleading UX. |
| P15 | `.flowva` is **not** one of the 31 accepted Flowva types. | Decision needed (see section 11). |
| P16 | No entry point for the purchased-file **Edit** flow (ownership check, signed URL, save-as-copy). | Core feature missing. |

---

## 4. Target architecture (future; v1.3.0 is still the flat, no-build layout)

**Keep vanilla JS and a static front end** (fastest possible, no framework runtime). **Add a build step** (Vite) because Lighthouse targets require code splitting, minification, hashed assets and tree-shaking, none of which are possible with hand-included script tags.

```
flowva-editor/
├─ README.md                  ← this file
├─ docs/
│  ├─ BACKEND_CONTRACT.md     ← replaces FOR_SETH_editor_integration.md (merged, corrected)
│  ├─ SECURITY.md
│  └─ FORMATS.md              ← per-format fidelity notes and test files
├─ public/                    ← fonts (woff2), icons sprite, manifest, robots.txt, _headers
├─ src/
│  ├─ capabilities.js         ← type matrix (section 2)
│  ├─ config.js
│  ├─ api/client.js
│  ├─ core/                   ← shell, router, storage, project package, history, errors
│  ├─ modules/
│  │  ├─ design/              ← Fabric editor, split from editor.js
│  │  ├─ model3d/             ← three.js (NEW, lazy)
│  │  └─ timeline/            ← animation + FCPXML (later, lazy)
│  ├─ formats/                ← one file per format: psd.js, pdf.js, svg.js, glb.js, fbx.js, fcpxml.js
│  ├─ workers/                ← psd.worker.js, export.worker.js
│  └─ ui/                     ← components, icons, a11y helpers
├─ tests/                     ← unit + Playwright e2e + sample fixture files per format
└─ .github/workflows/ci.yml   ← build, test, Lighthouse CI with budgets
```

**Rules**
- Each module and each heavy library loads **only when needed** (`import()`): `ag-psd`, `jspdf`, `lottie`, `pdf.js`, `three` never load on the start page.
- Parsing/exporting big files happens in a **Web Worker**; main thread stays interactive.
- Every format lives in `formats/<name>.js` exposing the same interface: `canCreate`, `canEdit`, `import(file) → project`, `export(project) → Blob`, `fidelityNotes`.
- The editor **never trusts** file contents: sanitize, size-cap, and escape.
- Fabric stays on 5.3.0 during the refactor (no simultaneous upgrade). Revisit Fabric 6 only after Phase 2.

---

## 5. The Edit-after-purchase flow

```
Marketplace (main app)                       Editor                          Backend
  Buyer owns item, type in CAPABILITIES.edit
  → show [Edit] button
  → click: POST /api/editor/edit-ticket {listingId}  ───────────────────────► verifies purchase,
                                                                              returns one-time ticket (60 s)
  → open  https://editor.flowva.com/edit?ticket=XYZ
                                             POST /api/editor/edit-session {ticket} ──► consumes ticket,
                                                                                         returns {type, title,
                                                                                         signedSourceUrl (≤5 min)}
                                             pick module from type, load file
                                             buyer edits → "Save" = NEW project (copy)
                                             export (PSD/GLB/PDF/PNG…) → download or save to My Projects
```

Rules:
- The original purchased file is **never overwritten**. Every edit session creates a private copy in the buyer's projects.
- `sourceUrl` is only ever returned to an owner (or for free items). Short-lived, `Cache-Control: no-store`, never placed in the URL as a long-lived token.
- The Edit button is shown only if `CAPABILITIES[type].edit` is truthy; `'limited'` and `'convert'` show a one-line expectation notice first.
- If the type is not editable here, show **"Open in <native app>"** with the app name, never a dead button.
- Direct navigation to `/edit` without a valid ticket redirects to login or the marketplace item page.
- A dedicated backend route list is in `docs/BACKEND_CONTRACT.md` (to be written in Phase 1 from the existing `FOR_SETH` file plus `edit-ticket`, `edit-session`, `ownership`).

---

## 6. What to REMOVE

| Remove | Why |
|---|---|
| Runtime `import()` of `@imgly/background-removal` from jsDelivr, and `cdn.jsdelivr.net` from CSP | P5. Re-add later only as a **self-hosted**, lazily loaded, hash-pinned module if wanted. |
| Google Fonts `<link>`s and `fonts.googleapis.com` / `fonts.gstatic.com` in CSP | Self-host subsetted `woff2` with `font-display: swap`. |
| Full `lucide.min.js` | Replace with an inline SVG sprite of only the icons used. |
| All `<script src>` tags for vendor libs in HTML | Replaced by bundled/lazy imports. |
| `'unsafe-inline'` style allowance and `https:` wildcards in CSP | Replace with nonce/hash CSP set as **HTTP headers**. |
| The `.ai` / `.aep` "convert it yourself" toasts | Replace with the capability-driven messaging in section 5. |
| Duplicated marketplace business logic in the editor UI: category list, USD/GHS dual pricing display, `CREATOR_SHARE_PERCENT` copy, escrow text | Belongs to the main app; hard-coding it here will drift. Pull from API or drop. |
| Stand-alone listing form in the editor start page (title/description/category/price) | Replace with **"Send to Flowva upload"**: export the file + preview, then hand off to the main app's real upload flow (see P13, section 11). |
| `FOR_SETH_editor_integration.md` and old `README.md` | Merged into this README and `docs/BACKEND_CONTRACT.md`. |
| Version drift (`APP_VERSION 1.2.1` vs zip 1.2.2) | Single version from `package.json`, injected at build. |

**Status of section 6 (v1.3.0):** DONE: background-removal CDN import, jsDelivr in CSP, Google Fonts on the start page (system font stack) and as a blocking request in the editor (now injected after load), full Lucide, vendor `<script>` tags for PSD/PDF/Lottie, in-editor listing form + pricing/earnings text + currency rates, the three "convert it yourself" toasts for `.ai`/`.aep` are no longer the main path, `FOR_SETH` doc, dead CSS, version drift (config says 1.3.0).
NOT DONE: editor design fonts are still fetched from Google Fonts (need woff2 files downloaded and self-hosted; this sandbox had no internet), `unsafe-inline` styles in editor CSP, `innerHTML` audit of `editor.js`/`mobile.js`, SVG sanitization.

## 7. What to ADD

| Add | Why / notes |
|---|---|
| Vite build, ES modules, code splitting, hashed assets | Foundation for every performance goal. |
| `capabilities.js` registry and module router | Section 2 and 5. |
| Split `editor.js` into modules (canvas, history, layers, props panel, timeline, export, io) | P4. No behavior changes during the split; verify with e2e tests first. |
| Edit-after-purchase entry route (`/edit`), ticket exchange, save-as-copy | P16. |
| PSD write path with a real round-trip test suite | Required for "create PSD" and "edit PSD". |
| 3D module (three.js): scene, transform gizmos, materials, lights, GLB export, FBX import | New capability. |
| Web Workers for PSD/PDF/export | P9. |
| SVG and file sanitization (DOMPurify for SVG; escape all names; MIME/magic-byte checks; size caps) | P7, P8. |
| Service worker (app-shell cache, versioned), web manifest, `robots.txt`, canonical, social meta | P10. |
| `_headers` (or nginx/Cloudflare config) with strict CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors <marketplace>` and long-lived immutable caching for hashed assets | P6. Use `Cross-Origin-Opener-Policy: same-origin-allow-popups` (plain `same-origin` breaks the `window.opener` postMessage handshake). |
| Self-hosted fonts and icon sprite | P2, P3. |
| Accessibility pass: keyboard operation of the whole editor, focus management, ARIA labels, contrast, reduced-motion | Lighthouse Accessibility target. |
| Error boundary, global error handler, optional minimal error reporting | Reliability. |
| Autosave debounce and recovery UI (exists partly; harden) | Reliability. |
| Tests: unit (formats), Playwright e2e (create, save, reopen, export, edit-flow), fixture files for every supported format | P11. |
| CI: build + tests + Lighthouse CI with budgets that fail the build | Keeps it production-ready. |
| `docs/BACKEND_CONTRACT.md`, `docs/SECURITY.md`, `docs/FORMATS.md` | P12. |

---

## 8. Performance, security and quality targets

**Lighthouse (mobile, throttled), per page**

| Page | Performance | Accessibility | Best Practices | SEO |
|---|---|---|---|---|
| Start page (`index`) | ≥ 95 | ≥ 95 | 100 | 100 |
| Editor shell (`editor`) | ≥ 90 | ≥ 95 | 100 | n/a (noindex) |

A canvas editor will not always hit 100 on Performance. The target is "no avoidable penalties", with the heavy work deferred until after first interaction.

**Budgets (gzip)**: start page JS ≤ 150 KB; editor shell JS ≤ 250 KB; every format library and the 3D module load on demand; LCP < 2.0 s; TBT < 150 ms; CLS < 0.05; no render-blocking third-party requests.

**Security**
- CSP via HTTP headers, nonce/hash based, no `unsafe-inline`, no wildcard sources.
- Zero third-party runtime requests (fonts, scripts, models are self-hosted).
- All file input treated as hostile: size caps, magic-byte checks, parse inside workers, sanitize SVG, escape every string rendered into the DOM, prefer `textContent` over `innerHTML`.
- Backend authoritative for ownership; browser-sent user ids are never trusted; session cookie + CSRF double-submit (already in `client.js`).
- Signed URLs short-lived and `no-store`; no secrets in `config.js`.
- Dependency pinning with lockfile, `npm audit` in CI, no unpinned CDN code.

**Reliability**
- Never lose work: autosave to IndexedDB, recovery prompt, explicit save status.
- Every failure shows a human message and leaves the project intact.
- Format round-trip tests are a release gate.

---

## 9. What we need from the main app (Seth / backend)

**Superseded by `docs/BACKEND_CONTRACT.md`** (the source of truth). Summary of what changed: `templates`, `publish`, `listings`, `rates` and `ownership` were dropped; `purchases` is now required; `edit-ticket` and `edit-session` were added. The original proposal was:

| Route | Purpose |
|---|---|
| `POST edit-ticket` `{listingId}` | Verifies purchase and file type; returns one-time ticket (≈60 s). |
| `POST edit-session` `{ticket}` | Consumes ticket; returns `{type, title, signedSourceUrl}` (≈5 min). |
| Upload hand-off | An endpoint or redirect so the editor can submit an exported editable file and preview into the main app's real listing flow. |
| `type` field on every listing | One of the 31 type codes, so the main app can read `CAPABILITIES` and render Edit vs "Open in <app>". |

Also needed: hosting on HTTPS (same site or subdomain preferred to avoid CORS); decision on who sets the response headers (CDN or server); the marketplace origin for `frame-ancestors` and `postMessage`.

---

## 10. Phased delivery

**Phase 0: Decisions and baseline (small)**
- Run Lighthouse on the *current* zip and record numbers in `docs/BASELINE.md` (we have not measured it yet).
- Resolve the open questions in section 11.
- Spike: can `ag-psd` 34.2.2 write PSB? Can Illustrator open a PDF-compatible `.ai` we emit? Record results in `docs/FORMATS.md`.

**Phase 1: Foundation (no new features)**
- Vite + ES modules; split `editor.js`; lazy-load all vendor libs.
- Self-host fonts, icon sprite; remove everything in section 6.
- HTTP headers + strict CSP; sanitize SVG; audit all 31 `innerHTML` sites.
- Service worker, manifest, SEO files.
- Playwright e2e for existing features *before* refactoring them; CI + Lighthouse budgets.
- `capabilities.js`, `docs/BACKEND_CONTRACT.md`.
- **Exit:** same behavior as v1.2.2, Lighthouse targets met, CI green.

**Phase 2: Design module to production + Edit flow**
- PSD create and edit with round-trip tests and fidelity notices; PSB if the spike passes.
- Multi-page PDF create; PDF import as locked background + overlay.
- SVG and PNG/JPG export polish; Web Workers for heavy work.
- `/edit` route, ticket exchange, save-as-copy, "Send to Flowva upload".
- **Exit:** a creator can build a PSD from scratch, publish it; a buyer can press Edit on a purchased PSD, change it and export.

**Phase 3: 3D module**
- three.js scene editor, GLB create and edit, FBX import→GLB.
- **Exit:** same create/sell/edit loop for GLB.

**Phase 4: Timeline**
- Promote the existing animation timeline into a module; FCPXML export and import of our own FCPXML.
- PDF edit improvements.

**Phase 5: Optional**
- Experimental PDF-compatible `.ai`; Sketch; Fabric 6 migration; self-hosted background removal.

---

## 11. Open questions and Decision Log

**Open (answer before or during Phase 0)**
1. **`.flowva` is not an accepted Flowva type.** Options: (a) add it as a 32nd type, (b) keep it as the editor's private project format and always export a standard type (PSD, PDF, GLB) for sale. *Recommended: (b).*
2. Is PSB actually wanted, or is PSD enough?
3. What is the main app's stack and hosting (so the editor can share auth and domain)?
4. Is 3D (Phase 3) higher priority than anything in Phase 2?
5. Which category taxonomy does the main app own, so the editor can drop its own list?

**Decision log**
| Date | Decision | Reason |
|---|---|---|
| 2026-11-22 | Keep vanilla JS, add Vite build | Speed + code splitting without a framework runtime. |
| 2026-11-22 | Honest capability matrix; formats we cannot faithfully write get no Edit button | Avoid broken files and refund risk. |
| 2026-11-22 | Edit always creates a private copy | Protect creators' originals and buyers' work. |
| 2026-11-22 | `.flowva` stays the editor's private project format (open question 1, option b). Marketplace sales use standard types. | Not one of the 31 accepted types. Assumed because it was the recommendation; confirm. |
| 2026-11-22 | Start page reduced to Projects / Purchased / Assets. Marketplace browsing, listing form, pricing, stats and decorative panels removed. | Duplicated the main app and drifted from it. |
| 2026-11-22 | Vite build deferred to Step 2 | Cannot be installed/tested without network access in the build environment; do it on a machine with npm. |
| 2026-11-22 | Edit button only where `capabilities.js` says `edit: true` (today: PSD only) | Honest scope. PDF/GLB/FBX/FCPXML are `'planned'`. |

---

## 12. Status Tracker (update as you go)

**Phase 0**
- [ ] Lighthouse baseline recorded
- [ ] Open questions 1–5 answered (Q1 assumed; Q2–Q5 still open)
- [ ] PSB spike
- [ ] `.ai` spike

**Phase 1**
- [ ] Vite + ES modules scaffold
- [~] 36 browser checks exist in `tests/` (start page, editor load, lazy libs, PDF export, PSD error path, Edit flow with mock backend); no CI yet
- [ ] `editor.js` split into modules
- [x] Vendor libs lazy-loaded (ag-psd, jsPDF, Lottie; verified in browser test)
- [~] Icons self-hosted (done, 358 KB → 19 KB); start page uses system fonts (done); editor design fonts still Google-hosted (TODO: download woff2)
- [x] Background-removal CDN import removed
- [~] `_headers` written (not yet deployed or verified on a host)
- [ ] `innerHTML` audit and SVG sanitization
- [ ] Service worker, manifest, SEO
- [ ] CI with Lighthouse budgets
- [~] `capabilities.js` and `BACKEND_CONTRACT.md` done; `SECURITY.md`, `FORMATS.md` still to write`

**Phase 2**
- [ ] PSD create/edit with round-trip tests
- [ ] PDF multi-page create, PDF import overlay
- [ ] Workers for PSD/PDF/export
- [~] Ticket exchange + save-as-copy implemented against a MOCK backend; needs the real backend routes
- [~] In-editor listing form removed; "Send to Flowva upload" hand-off NOT built yet (needs `UPLOAD_URL` + backend decision)

**Phase 3**
- [ ] 3D module, GLB create/edit
- [ ] FBX import→GLB

**Phase 4**
- [ ] Timeline module, FCPXML

**Phase 5 (optional)**
- [ ] `.ai`, Sketch, Fabric 6, self-hosted background removal

---

## 13. Rules for any AI or developer continuing this work

1. Read this README and the Status Tracker before touching code.
2. One phase at a time. Do not start a later phase item while an earlier unchecked item blocks it.
3. Do not add a format to `CAPABILITIES` until it has a fixture file and a passing round-trip test.
4. Do not add any third-party runtime request, CDN script or unpinned dependency.
5. Never render untrusted strings with `innerHTML`.
6. Heavy libraries are always lazy-loaded; check the bundle budget before merging.
7. If you change the plan, edit this file and add a Decision Log row.
8. Tick the tracker and describe what you verified (and what you did not).


## Integration clarification — local downloaded files

A buyer may also open a template file already downloaded to their own device using the editor local-file workflow. That workflow uses the browser File API, does not require a FlowvaMarket session or edit ticket, and must save/export a new local copy. It remains subject to the same format capability and fidelity limits. Marketplace-hosted source retrieval still requires the server-authorized one-time edit-ticket flow.


## 2026-11-22 handoff update — media timeline save safety

At the time of this earlier audit, the editor did not preserve video, audio timeline tracks or Lottie sources in Projects or `.flowva`, so both save paths were blocked. The later 2026-11-22 follow-up below supersedes the `.flowva` portion: the portable `.flowva` path now embeds media sources and hydrates them on reopen. Browser Projects Save/autosave and workspace save remain static-canvas-only. See `docs/BASELINE.md`.


## 2026-11-22 follow-up handoff — editable media in `.flowva`

The previous media-save safety blocker remains in place for browser Projects Save/autosave and workspace save. The separate `.flowva` portable package now has format version 2 and includes editable canvas objects, embedded original video/audio source files, Lottie animation JSON, and audio track timing metadata. On import, the editor hydrates video/audio/Lottie runtime players before restoring the canvas. Combined embedded image/video/audio payload is limited to 100 MB. `.flowva` is still a private editor project format, not one of FlowvaMarket's accepted creative listing type codes.

The Uploads panel now exposes the browser Asset Library while a design is open, allowing direct insertion into the current design. Homepage notifications use green for info/success and red for errors; errors remain visible until dismissed. Browser/manual testing is still required for media round trips, browser codec support, external Lottie image dependencies, large file memory use and failure paths.


## 2026-11-22 follow-up — `.flowva` source-Blob export reliability

A user-reported export failure revealed that `.flowva` media packaging relied on fetching temporary `blob:` playback URLs. Video/audio import now retains the original File/Blob and the package exporter embeds those bytes directly. Reopened package media also retain reconstructed Blobs for subsequent saves. The fallback fetch path remains for older/runtime media entries without a retained Blob. Error messages identify the affected media name and available read error. Static checks and package-format tests pass; browser-level tests with real media files, codecs, file sizes and repeated save/reopen cycles remain a release gate.


## 2026-11-22 follow-up — CSP-safe media restore and GitHub handoff polish

The `.flowva` restore path no longer uses `fetch()` on embedded `data:` media URLs. It decodes the base64 payload locally into Blob/object URLs, preserving the existing strict CSP (`connect-src 'self' https:`). Decoding yields between chunks to reduce long main-thread stalls. New local projects are not entered in the homepage Projects list merely by opening the editor. An explicit browser Save creates a static-content card. The later 2026-11-23 storage-policy update supersedes the earlier proposal to store a full media-capable `.flowva` copy in Projects: media-heavy files are downloaded to the device and reopened with Open file. The export path also cleans up empty placeholder records left by older builds without deleting projects that already contain saved content. The first-open save guide is compact and responsive, and save/error notifications use shorter copy with viewport-aware wrapping.

This is a source-level fix with syntax and decoder checks; actual media codec round-trip, mobile visual QA and Lighthouse scoring remain required. No performance score is claimed without a measured run.


### 2026-11-22 follow-up — editor save layout and local media project persistence
The save guide is now a fixed overlay below the editor topbar rather than a grid row, so dismissing it does not alter canvas or timeline geometry. Mobile Save and Download .flowva controls remain in the header. A previous version attempted to persist a full media-capable snapshot in browser Projects; the 2026-11-23 storage policy supersedes that approach. Media-heavy `.flowva` files are device downloads, while local Projects remain lightweight/static. The local project card supports a full-canvas raster thumbnail for ordinary browser-saved projects.


## 2026-11-23 follow-up — `.flowva` device-first storage
The portable `.flowva` download is the source of truth for media-heavy projects and is reopened using the editor's Open file action. It is deliberately not duplicated into IndexedDB Projects; this reduces disk use, base64/media memory overhead and quota pressure. Browser Projects Save/autosave remains static-only. The homepage surfaces approximate low-storage status when the Storage API reports at least 85% usage, and IndexedDB quota errors are surfaced clearly. Browser quota/eviction is not guaranteed or preventable by the app. A video restore hardening pass primes a decoded frame and rebinds Fabric video objects after JSON loading; manual browser codec testing remains required.


## 2026-11-23 follow-up — video restore correction

A source-level defect was found in the final media rebind: Fabric `loadFromJSON()` is asynchronous, but the rebind ran immediately and could target old canvas objects. The rebind now runs inside the load-completion callback and marks restored video/Lottie objects dirty. This is a targeted fix for the reported video-only blank canvas; it is not yet browser-verified. `.flowva` remains device-first and is not duplicated into browser Projects.
