# Format support and fidelity policy

The marketplace recognizes 31 creative types. Recognition is for messaging/routing only; it does not imply that FlowvaEditor can parse, edit or create them.

| Type | Create | Local open/edit | Fidelity / routing |
|---|---|---|---|
| PSD | Yes (target) | Yes (target) | ag-psd; warn that smart objects, adjustment layers, effects and some text styling may not round-trip. Verify fixtures before enabling. |
| PSB | Unverified | Unverified | Spike pinned ag-psd read/write and large-file limits; otherwise disable. |
| PDF | Yes | Limited | jsPDF creation; imported pages as locked backgrounds with editable overlays. Not PDF content-stream editing. |
| GLB | Planned | Planned | three.js scene editor and GLTFExporter. |
| FBX | No native writer | Convert-only, planned | Import with FBXLoader, convert/export GLB; rigs/animation may be lossy. |
| AI | Experimental | No | Proprietary. Prefer SVG/PDF; do not claim native AI fidelity. |
| FCPXML | Planned | Planned for supported timelines | Generate and parse the editor's supported timeline subset. |
| SKETCH | Optional | Not implemented | Research only; broad format surface. |
| CANVA | No | No | Link-based product; open in Canva. |
| INDD, CDR, AFDESIGN, AFPHOTO, FIG, AEP, PRPROJ, DRP, BLEND, C4D, MAX, MA, FLA, SPINE | No | No | Proprietary/undocumented; direct to native app. |
| PLP, IBIS, PicsArt PXD, GoDaddy Studio, ALIGHT, KMPROJECT, VNPROJ, CAPCUT | No | No | Mobile-app proprietary; direct to native app. |

## Required evidence before enabling a capability

1. A representative fixture file that can legally be included in tests.
2. Successful parser/import test and graceful malformed-file failure.
3. Export/write test where creation is claimed.
4. Round-trip test for editable source formats, with documented fidelity limits.
5. Large-file and memory test appropriate to the format.
6. User-facing capability and fidelity messaging.

A locally downloaded file can be opened without marketplace authorization only if its format is supported. The marketplace's direct Edit button must be shown only for formats the server and editor both currently allow. The server's entitlement check is still required for marketplace source retrieval.
