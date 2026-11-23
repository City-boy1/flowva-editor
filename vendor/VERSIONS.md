# Vendored third-party libraries (self-hosted, pinned)

| File | Package | Version |
|---|---|---|
| fabric.min.js | fabric | 5.3.0 |
| lucide.min.js | lucide | 0.468.0 |
| toastify.js / toastify.css | toastify-js | 1.12.0 |
| sortable.min.js | sortablejs | 1.15.2 |
| lottie.min.js | lottie-web | 5.12.2 |
| jspdf.umd.min.js | jspdf | 2.5.1 |
| ag-psd.js | ag-psd | 34.2.2 |
| bgremoval/ort.wasm.min.js, ort-wasm-simd.wasm | onnxruntime-web (MIT) | 1.17.3 |
| bgremoval/isnet-small.onnx.001-.004 (one model split in 4 parts, joined by the worker) | IS-Net (DIS) 8-bit model, as packaged by `@imgly/background-removal-node` 1.4.5 (`/models/small`, chunks concatenated) | 1.4.5 |
| bgremoval/worker.js | Flowva's own Web Worker (not third-party) | - |

To upgrade: `npm i <pkg>@<version>`, copy the dist file over the one above, update this table, and re-run the browser tests.

Background removal files are loaded **only when the user clicks Remove background** (lazy, off the main thread, model cached in Cache Storage). Check licence terms of the model package before commercial release.
