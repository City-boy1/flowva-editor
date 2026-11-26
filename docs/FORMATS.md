# File formats, import/export and capability policy

## Core rule

A file extension appearing in a dropdown or being recognized by the marketplace does not mean FlowvaEditor can create, open or edit it. The capability registry (`capabilities.js`) must be the editor's source of truth for current client capability. FlowvaMarket must maintain a server-side mirror/policy and must never trust the browser registry for authorization.

A format may be advertised as supported only after:
1. A legal representative fixture exists.
2. Import/parser test passes, including malformed-file handling, if opening is claimed.
3. Export/writer test passes, if creation is claimed.
4. Editable round-trip tests pass with documented fidelity limits, if round-trip is claimed.
5. File-size, memory and failure-path tests are appropriate to the format.
6. User-facing labels accurately explain limitations.

## Current export menu in reviewed source

| Output | Current source status | Policy |
|---|---|---|
| PNG | Present in export menu | Verify downloaded image dimensions, transparency/background behaviour and large-canvas failure handling |
| JPG | Present in export menu | Verify quality, background fill, dimensions and downloaded file validity |
| PDF | Present in export menu | Current path uses jsPDF; do not imply full document publishing or native PDF editing until page handling is implemented/tested |
| Video | Present for timeline | Verify codecs, audio, duration, frame rate, memory, cancellation and real output playback in target browsers |
| `.flowva` | Private editable project package via separate save/download flow | Not a marketplace sale format by default; test project reopen and media fidelity |
| PSD | PSD import path exists; no PSD export item in visible menu | Do not advertise PSD export as available. Import layer fidelity must be tested |

## Marketplace creative types and current policy

The marketplace may recognize more types than the editor supports. Maintain canonical type codes in a shared integration document and map aliases explicitly; never infer type only from a filename.

| Type | Create | Local open/edit | Market edit | Status / next evidence |
|---|---|---|---|---|
| PSD | Not currently exposed as export | Import path exists | Disabled until server and editor tests agree | Verify representative layers, text, masks, blend modes, effects and export fidelity; add a real writer only as a separate task |
| PSB | No | No | No | Research large-document support and memory limits first |
| PDF | Yes, current basic export | Limited/import not full content editing | Only when both sides support the exact flow | Multi-page output, page import overlay and fidelity tests needed |
| SVG | Not listed as final export in current menu | Import path exists | Not yet enabled | Add sanitized SVG export only after a real writer and security tests |
| PNG/JPG | Yes | Image import | Yes only as raster-edit flow if policy supports it | Verify import, export, resolution and colour/alpha handling |
| WEBP | Not a current final export | Browser/image path may vary | Not enabled | Add explicit fixtures and export tests before advertising |
| GLB | No | No | No | Future 3D module; GLTF importer/exporter and round-trip fixtures required |
| FBX | No | No | No | Possible import/convert to GLB only; rig/animation loss warning required |
| FCPXML | No | No | No | Future timeline interchange; define supported subset and fixtures |
| AI | No reliable native writer | No native editing | No | Prefer SVG/PDF; never claim native Illustrator fidelity |
| SKETCH | No | No | No | Optional research only |
| CANVA | No | No | No | Link-based hand-off to Canva, not editor file editing |
| INDD, CDR, AFDESIGN, AFPHOTO, FIG, AEP, PRPROJ, DRP, BLEND, C4D, MAX, MA, FLA, SPINE | No | No | No | Proprietary/unsupported; guide to native application |
| PLP, IBIS, PXD, GODADDY_STUDIO, ALIGHT, KMPROJECT, VNPROJ, CAPCUT | No | No | No | Mobile/proprietary; do not claim browser editing |

## Workspace export policy

- **Graphic Design:** PNG/JPG/PDF are current menu formats; PSD/SVG are future candidates pending verified writers.
- **Social Media:** PNG/JPG first; video/GIF only for supported animated outputs and tested codecs.
- **Documents & Publishing:** PDF is the primary target. Multi-page PDF is a separate capability from current single-canvas PDF export. DOCX is not supported until a real writer exists.
- **Logo & Branding:** PNG/PDF first; SVG requires secure vector export. Transparent PNG must be tested.
- **Video & Motion:** Video output must be validated in supported browsers; `.flowva` remains the editable project backup.
- **3D & Models:** no export until the 3D module exists; GLB is the first target, FBX conversion is optional and lossy.

## Capability registry behaviour

- Unknown types default to unsupported.
- `create`, `localOpen`, `edit` and conversion must be separate flags; do not conflate them.
- `edit: 'limited'` or `edit: 'convert'` must show a clear explanation and only appear where the exact workflow exists.
- Server and client capability policies must agree before the Market displays an Edit action.
- Keep `.flowva` as an internal project package unless a deliberate product decision adds it to Market's listing taxonomy.
