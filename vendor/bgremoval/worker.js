/* Background-removal worker. Runs the ONNX model off the main thread so the editor never freezes.
   Loaded lazily, only when the user clicks "Remove background". Everything is self-hosted. */
'use strict';
const BASE = new URL('./', self.location.href).href;
importScripts(BASE + 'ort.wasm.min.js');
ort.env.wasm.wasmPaths = BASE;
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;
const PARTS = ['001', '002', '003', '004'].map(n => BASE + 'isnet-small.onnx.' + n);  // 4 parts, fetched in parallel
const CACHE_KEY = BASE + 'isnet-small.onnx', TOTAL = 44342436;
const CACHE = 'flowva-bg-model-v1';
let session = null;

async function fetchPart(url, done) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Model download failed (' + res.status + ')');
  const parts = []; let got = 0, last = 0; const rd = res.body.getReader();
  for (;;) { const { done: end, value } = await rd.read(); if (end) break; parts.push(value); got += value.length; done(got - last); last = got; }
  const buf = new Uint8Array(got); let p = 0; for (const c of parts) { buf.set(c, p); p += c.length; }
  return buf;
}
async function fetchModel(progress) {
  let cache = null;
  try { cache = await caches.open(CACHE); const hit = await cache.match(CACHE_KEY); if (hit) { progress(1); return await hit.arrayBuffer(); } } catch (e) { cache = null; }
  let total = 0;
  const bufs = await Promise.all(PARTS.map(u => fetchPart(u, n => { total += n; progress(Math.min(total / TOTAL, 1)); })));
  const size = bufs.reduce((s, b) => s + b.length, 0);
  if (size !== TOTAL) throw new Error('Model files are incomplete (' + size + ' of ' + TOTAL + ' bytes). Make sure all isnet-small.onnx.00x files are in vendor/bgremoval/.');
  const all = new Uint8Array(size); let p = 0; for (const b of bufs) { all.set(b, p); p += b.length; }
  if (cache) { try { await cache.put(CACHE_KEY, new Response(all.slice(), { headers: { 'content-type': 'application/octet-stream' } })); } catch (e) {} }
  return all.buffer;
}

async function getSession(progress) {
  if (session) return session;
  const buf = await fetchModel(progress);
  progress(1, 'init');
  session = await ort.InferenceSession.create(buf, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  return session;
}

self.onmessage = async ({ data }) => {
  try {
    const s = await getSession((f, phase) => self.postMessage({ type: 'progress', f, phase }));
    self.postMessage({ type: 'progress', f: 1, phase: 'run' });
    const px = new Uint8ClampedArray(data.rgba), n = 1024 * 1024, f32 = new Float32Array(3 * n);
    for (let i = 0; i < n; i++) {  // same normalisation the model was trained with: (v-128)/256
      f32[i] = (px[4 * i] - 128) / 256; f32[i + n] = (px[4 * i + 1] - 128) / 256; f32[i + 2 * n] = (px[4 * i + 2] - 128) / 256;
    }
    const out = await s.run({ input: new ort.Tensor('float32', f32, [1, 3, 1024, 1024]) });
    const m = out.output.data, alpha = new Uint8ClampedArray(n * 4);
    for (let i = 0; i < n; i++) { alpha[4 * i + 3] = m[i] * 255; }
    self.postMessage({ type: 'done', alpha: alpha.buffer }, [alpha.buffer]);
  } catch (e) { self.postMessage({ type: 'error', message: String((e && e.message) || e) }); }
};
