/* =====================================================================
   FlowvaEditor — editor.js
   One file, 12 sections. Read the numbered headings to find things.
   Engine: Fabric.js 5 (canvas) · Lottie-web · ag-psd · jsPDF · SortableJS
   ===================================================================== */
(() => {
'use strict';

/* ---------------------------------------------------------------
   1. CONFIG — the only place you need to edit for deployment
---------------------------------------------------------------- */
const CONFIG = {
  // Who is allowed to receive the exported file. Replace '*' with the real
  // marketplace address before going live, e.g. 'https://flowvamarket.com'
  MARKETPLACE_ORIGIN: 'https://flowvamarket.com',

  // Optional cloud storage (Supabase). Leave empty to skip uploading.
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  SUPABASE_BUCKET: 'flowva-exports',

  AUTOSAVE_MS: 10000,      // auto-save every 10 seconds
  MAX_HISTORY: 40,         // undo steps
  ANIM_SECONDS: 0.6,       // length of the in/out animation
  FONTS: ['Poppins','Inter','Montserrat','Raleway','Oswald','Anton','Bebas Neue',
          'Playfair Display','Roboto Slab','Lobster','Pacifico','Dancing Script'],
  SIZES: [
    ['Instagram Post · 1080×1080', 1080, 1080],
    ['Instagram Story · 1080×1920', 1080, 1920],
    ['Flyer A4 · 1240×1754', 1240, 1754],
    ['Poster Portrait · 1080×1350', 1080, 1350],
    ['YouTube Thumbnail · 1280×720', 1280, 720],
    ['Full HD Video · 1920×1080', 1920, 1080],
    ['Facebook Cover · 1640×624', 1640, 624],
    ['LinkedIn Post · 1200×627', 1200, 627],
  ],
};

const COLORS = { purple: '#6C5CE7', dark: '#2D3436', light: '#F8F9FA' };
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
// Custom properties we add to every object (saved in JSON, used by timeline/layers)
const PROPS = ['fvId','fvName','fvType','fvStart','fvEnd','fvAnim','fvLocked',
               'lockMovementX','lockMovementY','lockRotation','lockScalingX','lockScalingY','hasControls'];

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (n, d = 0) => { const m = 10 ** d; return Math.round(n * m) / m; };
const uid = () => 'o' + Math.random().toString(36).slice(2, 9);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons = () => window.lucide && lucide.createIcons();

function toast(msg, type = 'info') {
  Toastify({
    text: msg, duration: 3200, gravity: 'bottom', position: 'center',
    style: { background: type === 'error' ? '#d63031' : type === 'ok' ? '#00b894' : COLORS.dark,
             borderRadius: '10px', fontFamily: 'Inter, sans-serif', fontSize: '13px' },
  }).showToast();
}
function showBusy(msg, pct) {
  $('#busy').classList.add('show'); $('#busyMsg').textContent = msg;
  $('#busyBar').style.width = (pct ?? 0) + '%';
}
const hideBusy = () => $('#busy').classList.remove('show');

/* ---------------------------------------------------------------
   2. STATE + CANVAS (the engine)
---------------------------------------------------------------- */
const S = {
  zoom: 1, dirty: false, restoring: false, clipboard: null,
  embedded: window.parent !== window || !!window.opener || new URLSearchParams(location.search).has('embed'),
  sourceUrl: new URLSearchParams(location.search).get('file_url'),
  brand: JSON.parse(localStorage.getItem('flowva_brand') || 'null') || { colors: [COLORS.purple, COLORS.dark, COLORS.light, '#fdcb6e', '#00b894'], logos: [] },
  uploads: [],
};
const media = {};        // fvId -> { type:'video'|'lottie', el, anim }
const audioTracks = [];  // { id, name, el, start, dur, node }
const tl = { t: 0, duration: 10, playing: false, preview: false, base: new Map(), pps: 80, last: 0, raf: 0, onEnd: null };

fabric.textureSize = 4096;
fabric.Object.prototype.set({
  transparentCorners: false, cornerColor: '#ffffff', cornerStrokeColor: COLORS.purple,
  borderColor: COLORS.purple, cornerStyle: 'circle', borderScaleFactor: 2, padding: 2,
});
const canvas = new fabric.Canvas('c', {
  width: 1080, height: 1080, backgroundColor: '#ffffff',
  preserveObjectStacking: true, stopContextMenu: true, fireRightClick: true,
});
const stage = $('#stage'), scroller = $('#stageScroll');

/* ----- zoom: the canvas keeps its real pixel size; we only scale it with CSS ----- */
function setZoom(z) {
  S.zoom = clamp(z, 0.1, 3);
  const W = canvas.getWidth(), H = canvas.getHeight();
  stage.style.width = W * S.zoom + 'px';
  stage.style.height = H * S.zoom + 'px';
  canvas.wrapperEl.style.transformOrigin = '0 0';
  canvas.wrapperEl.style.transform = `scale(${S.zoom})`;
  fabric.Object.prototype.cornerSize = clamp(11 / S.zoom, 8, 44);
  fabric.Object.prototype.borderScaleFactor = clamp(1.6 / S.zoom, 1.6, 8);
  $('#zoomLabel').textContent = Math.round(S.zoom * 100) + '%';
  canvas.calcOffset(); canvas.requestRenderAll();
}
function fitZoom() {
  const aw = scroller.clientWidth - 90, ah = scroller.clientHeight - 90;
  setZoom(Math.min(aw / canvas.getWidth(), ah / canvas.getHeight(), 1.5));
}
function resizeCanvas(w, h) {
  canvas.setWidth(w); canvas.setHeight(h);
  canvas.getObjects().forEach(o => o.setCoords());
  fitZoom(); syncSizeSelect();
}

/* ---------------------------------------------------------------
   3. HELPERS: naming, locking, loading fonts/images
---------------------------------------------------------------- */
function defaultName(o) {
  if (o.fvName) return o.fvName;
  if (/text/.test(o.type)) return (o.text || 'Text').slice(0, 20);
  return ({ rect: 'Rectangle', circle: 'Circle', triangle: 'Triangle', image: 'Image', group: 'Group',
            path: 'Shape', polygon: 'Shape', line: 'Line' })[o.type] || 'Layer';
}
function typeIcon(o) {
  if (o.fvType === 'video') return 'film';
  if (o.fvTys4ccccpe === 'lottie') return 'sparkles';
  if (/text/.test(o.type)) return 'type';
  if (o.type === 'image') return 'image';
  if (o.type === 'group') return 'group';
  return 'shapes';
}
function setLock(o, lock) {
  o.set({ fvLocked: lock, lockMovementX: lock, lockMovementY: lock, lockRotation: lock,
          lockScalingX: lock, lockScalingY: lock, hasControls: !lock });
}
async function loadFont(f) {
  try { await Promise.all([document.fonts.load(`400 24px "${f}"`), document.fonts.load(`700 24px "${f}"`)]); } catch {}
}
const loadImg = (url) => new Promise(res => fabric.Image.fromURL(url, img => res(img), { crossOrigin: 'anonymous' }));
const canvasToBlobURL = (c) => new Promise(r => c.toBlob(b => r(URL.createObjectURL(b))));
function toHex(v) {
  if (typeof v !== 'string' || !v) return COLORS.purple;
  if (/^#[0-9a-f]{6}$/i.test(v)) return v;
  try { const c = document.createElement('canvas').getContext('2d'); c.fillStyle = '#000'; c.fillStyle = v;
        return /^#[0-9a-f]{6}$/i.test(c.fillStyle) ? c.fillStyle : COLORS.purple; } catch { return COLORS.purple; }
}
function placeCentered(o, fitRatio = 0.8) {
  const W = canvas.getWidth(), H = canvas.getHeight();
  const w = o.width * (o.scaleX || 1), h = o.height * (o.scaleY || 1);
  const k = Math.min(1, (W * fitRatio) / w, (H * fitRatio) / h);
  o.scale((o.scaleX || 1) * k);
  canvas.add(o); o.viewportCenter ? o.viewportCenter() : o.center(); o.setCoords();
  canvas.setActiveObject(o); canvas.requestRenderAll();
}

/* new objects get id, name and timeline defaults */
canvas.on('object:added', e => {
  const o = e.target;
  if (!o.fvId) o.fvId = uid();
  if (o.fvStart == null) o.fvStart = 0;
  if (o.fvEnd == null) o.fvEnd = tl.duration;
  if (!o.fvAnim) o.fvAnim = 'none';
  o.fvName = defaultName(o);
  commit();
});
canvas.on('object:removed', () => commit());
canvas.on('object:modified', () => commit());
canvas.on('text:changed', e => { if (e.target) e.target.fvName = defaultName({ ...e.target, fvName: '', type: 'textbox', text: e.target.text }); commit(); });

/* ---------------------------------------------------------------
   4. HISTORY (undo / redo) + AUTOSAVE
---------------------------------------------------------------- */
const hist = { stack: [], idx: -1, timer: 0 };

function snapshot() {
  const json = canvas.toJSON(PROPS);
  json.objects.forEach(o => { if (o.fvType === 'video' || o.fvType === 'lottie') o.src = BLANK_PNG; });
  json.size = { w: canvas.getWidth(), h: canvas.getHeight() };
  json.duration = tl.duration;
  return json;
}
function commit() {
  if (S.restoring) return;
  clearTimeout(hist.timer);
  hist.timer = setTimeout(() => {
    const s = JSON.stringify(snapshot());
    if (hist.stack[hist.idx] !== s) {
      hist.stack = hist.stack.slice(0, hist.idx + 1);
      hist.stack.push(s);
      if (hist.stack.length > CONFIG.MAX_HISTORY) hist.stack.shift();
      hist.idx = hist.stack.length - 1;
      S.dirty = true;
    }
    refreshUI();
  }, 120);
}
function refreshUI() {
  $('#btnUndo').disabled = hist.idx <= 0;
  $('#btnRedo').disabled = hist.idx >= hist.stack.length - 1;
  renderLayers(); renderTimeline();
}
function restore(json, done) {
  S.restoring = true;
  canvas.discardActiveObject();
  canvas.loadFromJSON(json, () => {
    // media objects lost their element during JSON — put the live element back
    canvas.getObjects().filter(o => (o.fvType === 'video' || o.fvType === 'lottie') && !media[o.fvId])
      .forEach(o => canvas.remove(o));
    if (json.size && (json.size.w !== canvas.getWidth() || json.size.h !== canvas.getHeight())) resizeCanvas(json.size.w, json.size.h);
    if (json.duration) { tl.duration = json.duration; $('#durInput').value = json.duration; }
    S.restoring = false;
    canvas.requestRenderAll(); refreshUI(); renderProps(); done && done();
  }, (o, obj) => {
    if ((obj.fvType === 'video' || obj.fvType === 'lottie') && media[obj.fvId]) {
      obj.setElement(media[obj.fvId].el, { width: o.width, height: o.height });
      obj.objectCaching = false;
    }
  });
}
function undo() { if (hist.idx > 0) { hist.idx--; restore(JSON.parse(hist.stack[hist.idx])); } }
function redo() { if (hist.idx < hist.stack.length - 1) { hist.idx++; restore(JSON.parse(hist.stack[hist.idx])); } }
function resetHistory() { hist.stack = []; hist.idx = -1; commit(); }

/* snapshot that survives a page reload: turn blob: URLs into data: URLs */
async function portableSnapshot() {
  const json = snapshot();
  const toData = async url => { const b = await (await fetch(url)).blob();
    return new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(b); }); };
  for (const o of json.objects) if (typeof o.src === 'string' && o.src.startsWith('blob:')) { try { o.src = await toData(o.src); } catch {} }
  json.name = $('#projectName').value;
  return json;
}
let warnedAutosave = false;
async function autosave() {
  if (!S.dirty) return;
  try { localStorage.setItem('flowva_autosave_v1', JSON.stringify(await portableSnapshot())); S.dirty = false; }
  catch { if (!warnedAutosave) { warnedAutosave = true; toast('Auto-save skipped (design too big). Use Save to download a project file.'); } }
}
setInterval(autosave, CONFIG.AUTOSAVE_MS);
window.addEventListener('beforeunload', e => { if (S.dirty) { autosave(); e.preventDefault(); e.returnValue = ''; } });

async function saveProjectFile() {
  const json = await portableSnapshot();
  download(new Blob([JSON.stringify(json)], { type: 'application/json' }), safeName() + '.flowva.json');
  toast('Project saved', 'ok');
}
function openProject(json) {
  if (!json || !json.objects) return toast('That is not a Flowva project file', 'error');
  endPreview();
  restore(json, () => { if (json.name) $('#projectName').value = json.name; fitZoom(); resetHistory(); toast('Project opened', 'ok'); });
}

/* ---------------------------------------------------------------
   5. LEFT PANELS: templates, shapes, text, uploads, brand kit
---------------------------------------------------------------- */
/* --- rail switching --- */
$$('.rail-btn').forEach(b => b.onclick = () => {
  $$('.rail-btn').forEach(x => x.classList.toggle('active', x === b));
  $$('#flyout .panel').forEach(p => p.classList.toggle('active', p.dataset.panel === b.dataset.panel));
});

/* --- shapes --- */
const starPoints = (n, R, r) => Array.from({ length: n * 2 }, (_, i) => {
  const a = (Math.PI / n) * i - Math.PI / 2, d = i % 2 ? r : R; return { x: R + Math.cos(a) * d, y: R + Math.sin(a) * d }; });
const SHAPES = {
  'Rectangle': ['square',     () => new fabric.Rect({ width: 420, height: 300, fill: COLORS.purple })],
  'Rounded':   ['rectangle-horizontal', () => new fabric.Rect({ width: 420, height: 300, rx: 40, ry: 40, fill: COLORS.purple })],
  'Circle':    ['circle',     () => new fabric.Circle({ radius: 180, fill: COLORS.purple })],
  'Triangle':  ['triangle',   () => new fabric.Triangle({ width: 360, height: 320, fill: COLORS.purple })],
  'Star':      ['star',       () => new fabric.Polygon(starPoints(5, 200, 85), { fill: '#fdcb6e' })],
  'Line':      ['minus',      () => new fabric.Line([0, 0, 420, 0], { stroke: COLORS.dark, strokeWidth: 10, strokeLineCap: 'round' })],
  'Arrow':     ['arrow-right',() => new fabric.Polygon([{x:0,y:40},{x:220,y:40},{x:220,y:0},{x:320,y:90},{x:220,y:180},{x:220,y:140},{x:0,y:140}], { fill: COLORS.dark })],
  'Heart':     ['heart',      () => new fabric.Path('M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', { fill: '#ff4d8d', scaleX: 14, scaleY: 14 })],
  'Hexagon':   ['hexagon',    () => new fabric.Polygon(Array.from({ length: 6 }, (_, i) => ({ x: 200 + 200 * Math.cos(Math.PI / 3 * i), y: 200 + 200 * Math.sin(Math.PI / 3 * i) })), { fill: COLORS.purple })],
};
$('#shapeGrid').innerHTML = Object.entries(SHAPES).map(([n, [ic]]) => `<button class="tile" data-shape="${n}" title="${n}"><i data-lucide="${ic}"></i></button>`).join('');
$('#shapeGrid').onclick = e => { const b = e.target.closest('[data-shape]'); if (b) { endPreview(); const o = SHAPES[b.dataset.shape][1](); o.fvName = b.dataset.shape; placeCentered(o, 0.5); } };

/* --- gradient backgrounds --- */
const GRADS = [['#6C5CE7', '#a29bfe'], ['#fd79a8', '#fdcb6e'], ['#00cec9', '#6C5CE7'], ['#2D3436', '#6C5CE7'], ['#ff7675', '#fab1a0'], ['#0984e3', '#74b9ff']];
const gradient = (w, h, c1, c2) => new fabric.Gradient({ type: 'linear', coords: { x1: 0, y1: 0, x2: w, y2: h }, colorStops: [{ offset: 0, color: c1 }, { offset: 1, color: c2 }] });
$('#gradGrid').innerHTML = GRADS.map((g, i) => `<button class="tile" data-grad="${i}" style="background:linear-gradient(135deg,${g[0]},${g[1]})"></button>`).join('');
$('#gradGrid').onclick = e => {
  const b = e.target.closest('[data-grad]'); if (!b) return; endPreview();
  const [c1, c2] = GRADS[b.dataset.grad], W = canvas.getWidth(), H = canvas.getHeight();
  const r = new fabric.Rect({ left: 0, top: 0, width: W, height: H, fill: gradient(W, H, c1, c2), fvName: 'Gradient background' });
  canvas.add(r); canvas.sendToBack(r); canvas.setActiveObject(r); canvas.requestRenderAll();
};

/* --- icons (fetched as SVG from the Lucide icon set, so they stay editable vectors) --- */
const ICONS = ['star','heart','phone','mail','map-pin','shopping-bag','gift','tag','percent','calendar','clock','camera','music','megaphone','zap','check-circle'];
$('#iconGrid').innerHTML = ICONS.map(n => `<button class="tile" data-icon="${n}" title="${n}"><i data-lucide="${n}"></i></button>`).join('');
$('#iconGrid').onclick = async e => {
  const b = e.target.closest('[data-icon]'); if (!b) return;
  try {
    const svg = (await (await fetch(`https://unpkg.com/lucide-static@0.460.0/icons/${b.dataset.icon}.svg`)).text()).replace(/currentColor/g, COLORS.dark);
    await addSVGString(svg, b.dataset.icon, 0.25);
  } catch { toast('Could not load icon (check internet)', 'error'); }
};

/* --- emoji stickers --- */
$('#emojiGrid').innerHTML = ['🔥','✨','🎉','💥','❤️','👍','⭐','🛍️','🎁','📣','🏆','💯'].map(x => `<button class="tile sticker" data-emoji="${x}">${x}</button>`).join('');
$('#emojiGrid').onclick = e => { const b = e.target.closest('[data-emoji]'); if (!b) return; endPreview();
  const t = new fabric.Textbox(b.dataset.emoji, { fontSize: 200, width: 300, textAlign: 'center', fvName: 'Sticker' }); placeCentered(t, 0.5); };

/* --- text --- */
const TEXT_PRESETS = {
  heading: { text: 'Add a heading', fontSize: 110, fontWeight: 'bold', width: 800 },
  sub:     { text: 'Add a subheading', fontSize: 64, fontWeight: 'bold', width: 800 },
  body:    { text: 'Add a little bit of body text', fontSize: 38, fontWeight: 'normal', width: 700 },
};
function addText(kind, font) {
  endPreview();
  const p = TEXT_PRESETS[kind];
  const t = new fabric.Textbox(p.text, { fontFamily: font || 'Poppins', fontSize: p.fontSize, fontWeight: p.fontWeight, fill: COLORS.dark, width: Math.min(p.width, canvas.getWidth() * 0.8), textAlign: 'left' });
  canvas.add(t); t.viewportCenter ? t.viewportCenter() : t.center(); t.setCoords(); canvas.setActiveObject(t); t.enterEditing(); t.selectAll(); canvas.requestRenderAll();
}
$$('.text-add').forEach(b => b.onclick = () => addText(b.dataset.text, b.dataset.font));
$('#fontList').innerHTML = CONFIG.FONTS.map(f => `<button class="font-item" data-font="${f}" style="font-family:'${f}'">${f}</button>`).join('');
$('#fontList').onclick = async e => {
  const b = e.target.closest('[data-font]'); if (!b) return; const f = b.dataset.font; await loadFont(f);
  const o = canvas.getActiveObject();
  if (o && /text/.test(o.type)) { o.set('fontFamily', f); canvas.requestRenderAll(); commit(); } else addText('sub', f);
};

/* --- uploads --- */
$('#btnUpload').onclick = () => $('#fileInput').click();
$('#btnAddAudio').onclick = () => $('#fileInput').click();
$('#fileInput').onchange = async e => { for (const f of e.target.files) await handleFile(f); e.target.value = ''; };
const dz = $('#dropZone');
['dragenter', 'dragover'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
document.addEventListener('drop', async e => { for (const f of e.dataTransfer.files) await handleFile(f); });
function renderUploads() {
  $('#uploadList').innerHTML = S.uploads.map((u, i) => `<button class="tile" data-up="${i}" title="${esc(u.name)}"><img src="${u.url}" alt=""></button>`).join('') || '<p class="hint">Nothing yet.</p>';
}
$('#uploadList').onclick = e => { const b = e.target.closest('[data-up]'); if (b) addImage(S.uploads[b.dataset.up].url, S.uploads[b.dataset.up].name); };

/* --- brand kit --- */
const saveBrand = () => { try { localStorage.setItem('flowva_brand', JSON.stringify(S.brand)); } catch {} };
function renderBrand() {
  $('#brandColors').innerHTML = S.brand.colors.map(c => `<button class="swatch" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
  $('#logoList').innerHTML = S.brand.logos.map((u, i) => `<button class="tile" data-logo="${i}"><img src="${u}" alt="logo"></button>`).join('');
}
$('#brandColors').onclick = e => { const b = e.target.closest('[data-c]'); if (!b) return; const o = canvas.getActiveObject();
  if (o && o.type !== 'activeSelection') { o.set(/text|path|rect|circle|polygon|triangle|group/.test(o.type) ? 'fill' : 'stroke', b.dataset.c); canvas.requestRenderAll(); commit(); renderProps(); }
  else { canvas.backgroundColor = b.dataset.c; canvas.requestRenderAll(); commit(); renderProps(); } };
$('#brandColors').oncontextmenu = e => { const b = e.target.closest('[data-c]'); if (!b) return; e.preventDefault(); S.brand.colors = S.brand.colors.filter(c => c !== b.dataset.c); saveBrand(); renderBrand(); };
$('#brandColorInput').onchange = e => { if (!S.brand.colors.includes(e.target.value)) S.brand.colors.push(e.target.value); saveBrand(); renderBrand(); };
$('#btnLogo').onclick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
  i.onchange = () => { const fr = new FileReader(); fr.onload = () => { S.brand.logos.push(fr.result); saveBrand(); renderBrand(); addImage(fr.result, 'Logo'); }; fr.readAsDataURL(i.files[0]); }; i.click(); };
$('#logoList').onclick = e => { const b = e.target.closest('[data-logo]'); if (b) addImage(S.brand.logos[b.dataset.logo], 'Logo'); };

/* --- templates (add more by copying one of these objects) --- */
const tx = (s, o) => canvas.add(new fabric.Textbox(s, Object.assign({ fontFamily: 'Poppins', fill: '#fff', width: 600, textAlign: 'center', fontSize: 40 }, o)));
const rc = o => canvas.add(new fabric.Rect(o));
const ci = o => canvas.add(new fabric.Circle(o));
const TEMPLATES = [
  { name: 'Mega Sale', size: [1240, 1754], bg: '#6C5CE7', css: 'linear-gradient(160deg,#6C5CE7,#a29bfe)', build() {
    ci({ left: -200, top: -200, radius: 520, fill: 'rgba(255,255,255,.08)' }); ci({ left: 650, top: 1050, radius: 500, fill: 'rgba(255,255,255,.1)' });
    tx('FLOWVA STORE', { left: 120, top: 120, width: 1000, fontSize: 34, charSpacing: 300, textAlign: 'left', fontWeight: 'bold' });
    tx('MEGA\nSALE', { left: 120, top: 400, width: 1000, fontSize: 300, fontFamily: 'Anton', textAlign: 'left', lineHeight: 0.95 });
    tx('UP TO 70% OFF', { left: 120, top: 1020, width: 1000, fontSize: 92, fontWeight: 'bold', textAlign: 'left', fill: '#ffeaa7' });
    rc({ left: 120, top: 1240, width: 470, height: 120, rx: 60, ry: 60, fill: '#fff' });
    tx('SHOP NOW', { left: 120, top: 1272, width: 470, fontSize: 44, fontWeight: 'bold', fill: '#6C5CE7' });
    tx('www.flowvamarket.com  •  This weekend only', { left: 120, top: 1590, width: 1000, fontSize: 30, textAlign: 'left' }); } },
  { name: 'Live Music Night', size: [1080, 1920], bg: '#2D3436', css: 'linear-gradient(160deg,#2D3436,#6C5CE7)', build() {
    ci({ left: 560, top: 120, radius: 420, fill: '#6C5CE7' }); ci({ left: -160, top: 1100, radius: 380, fill: '#a29bfe' });
    tx('FRIDAY • 8PM', { left: 90, top: 140, width: 900, fontSize: 40, charSpacing: 250, textAlign: 'left', fontWeight: 'bold', fill: '#ffeaa7' });
    tx('LIVE\nMUSIC\nNIGHT', { left: 90, top: 640, width: 900, fontSize: 250, fontFamily: 'Bebas Neue', textAlign: 'left', lineHeight: 0.9 });
    tx('Food • Drinks • Good vibes', { left: 90, top: 1480, width: 900, fontSize: 48, textAlign: 'left' });
    tx('Tickets at flowvamarket.com', { left: 90, top: 1700, width: 900, fontSize: 38, textAlign: 'left', fontWeight: 'bold', fill: '#ffeaa7' }); } },
  { name: 'Quote Card', size: [1080, 1080], bg: '#F8F9FA', css: 'linear-gradient(135deg,#F8F9FA,#dfe6e9)', build() {
    rc({ left: 0, top: 0, width: 28, height: 1080, fill: '#6C5CE7' });
    tx('“', { left: 110, top: 70, width: 300, fontSize: 380, fontFamily: 'Playfair Display', fill: '#6C5CE7', textAlign: 'left' });
    tx('Design is not just what it looks like. Design is how it works.', { left: 110, top: 380, width: 860, fontSize: 80, fontFamily: 'Playfair Display', fontWeight: 'bold', fill: '#2D3436', textAlign: 'left' });
    tx('— Your Name', { left: 110, top: 900, width: 860, fontSize: 38, fill: '#6C5CE7', textAlign: 'left', fontWeight: 'bold' }); } },
  { name: 'Product Launch', size: [1280, 720], bg: '#2D3436', css: 'linear-gradient(135deg,#00cec9,#6C5CE7)', build() {
    canvas.add(new fabric.Rect({ left: 0, top: 0, width: 1280, height: 720, fill: gradient(1280, 720, '#6C5CE7', '#00cec9') }));
    rc({ left: 80, top: 90, width: 190, height: 70, rx: 35, ry: 35, fill: '#fdcb6e' });
    tx('NEW', { left: 80, top: 105, width: 190, fontSize: 36, fontWeight: 'bold', fill: '#2D3436' });
    tx('Introducing\nthe Future', { left: 80, top: 210, width: 900, fontSize: 130, fontFamily: 'Montserrat', fontWeight: 'bold', textAlign: 'left', lineHeight: 1 });
    tx('Available now on FlowvaMarket', { left: 80, top: 560, width: 900, fontSize: 42, textAlign: 'left' }); } },
  { name: 'Business Promo', size: [1080, 1080], bg: '#fff', css: 'linear-gradient(90deg,#6C5CE7 50%,#fff 50%)', build() {
    rc({ left: 0, top: 0, width: 540, height: 1080, fill: '#6C5CE7' }); ci({ left: 620, top: 150, radius: 150, fill: '#fdcb6e' });
    tx('GROW YOUR\nBUSINESS', { left: 50, top: 300, width: 460, fontSize: 90, fontFamily: 'Montserrat', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.05 });
    tx('Professional design in minutes.', { left: 50, top: 650, width: 440, fontSize: 34, textAlign: 'left' });
    tx('Call us\n+233 00 000 0000', { left: 590, top: 620, width: 420, fontSize: 40, fill: '#2D3436', fontWeight: 'bold', textAlign: 'left' }); } },
  { name: 'We Are Hiring', size: [1080, 1350], bg: '#2D3436', css: 'linear-gradient(135deg,#2D3436,#636e72)', build() {
    rc({ left: 80, top: 80, width: 920, height: 1190, rx: 40, ry: 40, fill: 'rgba(255,255,255,.06)', stroke: '#6C5CE7', strokeWidth: 6 });
    tx('WE ARE', { left: 140, top: 200, width: 800, fontSize: 70, charSpacing: 300, textAlign: 'left', fill: '#a29bfe', fontWeight: 'bold' });
    tx('HIRING', { left: 140, top: 300, width: 800, fontSize: 250, fontFamily: 'Anton', textAlign: 'left' });
    tx('Graphic Designer\nVideo Editor\nSocial Media Manager', { left: 140, top: 700, width: 800, fontSize: 56, textAlign: 'left', lineHeight: 1.4 });
    tx('Apply: jobs@flowvamarket.com', { left: 140, top: 1120, width: 800, fontSize: 38, textAlign: 'left', fill: '#ffeaa7', fontWeight: 'bold' }); } },
];
$('#tplGrid').innerHTML = TEMPLATES.map((t, i) => `<button class="tpl" data-tpl="${i}"><div class="thumb" style="background:${t.css}">${esc(t.name)}</div><div class="meta">${esc(t.name)}<small>${t.size[0]}×${t.size[1]}</small></div></button>`).join('');
$('#tplGrid').onclick = async e => {
  const b = e.target.closest('[data-tpl]'); if (!b) return;
  if (canvas.getObjects().length && !confirm('Replace the current design with this template?')) return;
  await Promise.all(CONFIG.FONTS.map(loadFont));
  const t = TEMPLATES[b.dataset.tpl]; clearAll(); resizeCanvas(...t.size); canvas.backgroundColor = t.bg; t.build();
  canvas.requestRenderAll(); resetHistory(); toast('Template loaded — click any text to edit it', 'ok');
};

/* ---------------------------------------------------------------
   6. IMPORTING FILES (images, SVG, PSD, Lottie, video, audio)
---------------------------------------------------------------- */
async function handleFile(file) {
  const name = file.name.toLowerCase(), type = file.type;
  try {
    endPreview();
    if (name.endsWith('.psd')) return await addPSD(file);
    if (name.endsWith('.svg') || type === 'image/svg+xml') return await addSVGString(await file.text(), file.name);
    if (name.endsWith('.json') || name.endsWith('.lottie')) {
      const j = JSON.parse(await file.text());
      if (j.layers && (j.fr || j.v)) return addLottie(j, file.name);
      if (j.objects) return openProject(j);
      return toast('Unknown JSON file', 'error');
    }
    if (type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return addVideo(URL.createObjectURL(file), file.name);
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(name)) return addAudio(URL.createObjectURL(file), file.name);
    if (type.startsWith('image/')) { const url = URL.createObjectURL(file); S.uploads.unshift({ name: file.name, url }); renderUploads(); return addImage(url, file.name); }
    if (/\.(ai|eps)$/.test(name)) return toast('For Illustrator files: in Illustrator choose File → Save As → SVG, then upload the SVG.', 'error');
    if (/\.(aep|aet)$/.test(name)) return toast('For After Effects: export with the Bodymovin plugin as .json, then upload that file.', 'error');
    toast('Unsupported file type: ' + file.name, 'error');
  } catch (err) { console.error(err); toast('Could not open ' + file.name, 'error'); }
}
async function loadFromUrl(url) {
  try {
    showBusy('Loading file…', 30);
    const r = await fetch(url, { mode: 'cors' }); if (!r.ok) throw new Error(r.status);
    const blob = await r.blob(); const nm = decodeURIComponent(url.split('?')[0].split('/').pop() || 'file');
    await handleFile(new File([blob], nm, { type: blob.type }));
  } catch (e) { console.error(e); toast('Could not load the file from the link (the server must allow CORS).', 'error'); }
  hideBusy();
}

function addImage(src, name) {
  loadImg(src).then(img => { if (!img || !img.width) return toast('Image failed to load', 'error'); img.fvName = (name || 'Image').replace(/\.[^.]+$/, ''); placeCentered(img, 0.8); });
}
function addSVGString(str, name, ratio = 0.5) {
  return new Promise(res => fabric.loadSVGFromString(str, (objs, opts) => {
    if (!objs || !objs.length) { toast('SVG is empty or unsupported', 'error'); return res(); }
    const g = objs.length === 1 ? objs[0] : fabric.util.groupSVGElements(objs, opts);
    g.fvName = (name || 'Vector').replace(/\.svg$/i, ''); placeCentered(g, ratio); res();
  }));
}

/* --- PSD: every Photoshop layer becomes its own editable object --- */
async function addPSD(file) {
  if (!window.agPsd) return toast('PSD reader failed to load (check internet).', 'error');
  showBusy('Reading Photoshop file…', 20);
  await sleep(30);
  const psd = agPsd.readPsd(await file.arrayBuffer(), { skipCompositeImageData: true, skipThumbnail: true });
  clearAll(); resizeCanvas(psd.width, psd.height); canvas.backgroundColor = '#ffffff';
  const FONT_MAP = n => CONFIG.FONTS.find(f => (n || '').toLowerCase().replace(/[^a-z]/g, '').includes(f.toLowerCase().replace(/[^a-z]/g, ''))) || 'Poppins';
  const BLEND = ['multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion'];
  const jobs = [];
  const walk = (nodes, hiddenParent) => (nodes || []).forEach(l => {
    if (l.children) return walk(l.children, hiddenParent || l.hidden);
    const hidden = hiddenParent || l.hidden;
    jobs.push((async () => {
      let obj = null;
      if (l.text && l.text.text) {                                  // text layer → editable text
        const st = (l.text.style || {}), sc = (l.text.transform && l.text.transform[3]) || 1, c = st.fillColor || { r: 0, g: 0, b: 0 };
        obj = new fabric.Textbox(l.text.text.replace(/\r/g, '\n'), {
          left: l.left, top: l.top, fontFamily: FONT_MAP(st.font && st.font.name), fontSize: Math.round((st.fontSize || 32) * sc),
          fill: `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`, width: Math.max(40, (l.right - l.left) + 20) });
      } else if (l.canvas) {                                         // pixel layer → image
        obj = await loadImg(await canvasToBlobURL(l.canvas)); if (!obj) return null;
        obj.set({ left: l.left, top: l.top });
      }
      if (!obj) return null;
      obj.fvName = l.name || 'Layer'; obj.set({ opacity: l.opacity ?? 1, visible: !hidden });
      const bm = (l.blendMode || '').replace(/ /g, '-'); if (BLEND.includes(bm)) obj.globalCompositeOperation = bm;
      return obj;
    })());
  });
  walk(psd.children, false);
  const objs = await Promise.all(jobs);                              // keep Photoshop's stacking order
  showBusy('Placing layers…', 80);
  objs.filter(Boolean).forEach(o => canvas.add(o));
  canvas.requestRenderAll(); resetHistory(); hideBusy();
  toast(`PSD opened with ${objs.filter(Boolean).length} editable layers`, 'ok');
}

/* --- Lottie (After Effects → Bodymovin JSON) --- */
function addLottie(data, name) {
  const w = data.w || 500, h = data.h || 500, c = document.createElement('canvas'); c.width = w; c.height = h;
  const anim = lottie.loadAnimation({ renderer: 'canvas', loop: true, autoplay: true, animationData: data, rendererSettings: { context: c.getContext('2d'), clearCanvas: true } });
  const img = new fabric.Image(c, { objectCaching: false });
  img.fvId = uid(); img.fvType = 'lottie'; img.fvName = (name || 'Animation').replace(/\.[^.]+$/, '');
  media[img.fvId] = { type: 'lottie', el: c, anim };
  placeCentered(img, 0.7); startRenderLoop(); toast('Lottie animation added', 'ok');
}

/* --- Video (AI tools: Sora, Runway… give MP4) --- */
function addVideo(url, name) {
  const v = document.createElement('video');
  v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.onloadeddata = () => {
    v.currentTime = 0.05;
    const vw = v.videoWidth, vh = v.videoHeight;
    if (!canvas.getObjects().length) { const k = Math.min(1, 1920 / Math.max(vw, vh)); resizeCanvas(Math.round(vw * k), Math.round(vh * k)); }
    const dur = Math.max(1, Math.ceil(v.duration || 5));
    if (dur > tl.duration) { tl.duration = dur; $('#durInput').value = dur; }
    const img = new fabric.Image(v, { objectCaching: false, width: vw, height: vh });
    img.fvId = uid(); img.fvType = 'video'; img.fvName = name.replace(/\.[^.]+$/, ''); img.fvEnd = tl.duration;
    media[img.fvId] = { type: 'video', el: v };
    const W = canvas.getWidth(), H = canvas.getHeight(), k = Math.max(W / vw, H / vh);   // "cover" the canvas
    img.set({ scaleX: k, scaleY: k, left: (W - vw * k) / 2, top: (H - vh * k) / 2 });
    canvas.add(img); canvas.sendToBack(img); canvas.setActiveObject(img);
    v.onseeked = () => canvas.requestRenderAll();
    toast('Video added at the bottom layer. Add text/logo on top, then Export → Video.', 'ok');
  };
  v.onerror = () => toast('This video format is not supported by your browser.', 'error');
}

/* --- Audio (music / voice-over, lives only on the timeline) --- */
function addAudio(url, name) {
  const el = new Audio(url); el.preload = 'auto'; el.crossOrigin = 'anonymous';
  el.onloadedmetadata = () => {
    audioTracks.push({ id: uid(), name: name.replace(/\.[^.]+$/, ''), el, start: 0, dur: el.duration || 10, node: null });
    renderTimeline(); toast('Audio added to the timeline', 'ok');
  };
  el.onerror = () => toast('Audio file not supported.', 'error');
}

/* continuous repaint only when a Lottie animation exists */
let loopOn = false;
function startRenderLoop() {
  if (loopOn) return; loopOn = true;
  (function loop() { if (Object.values(media).some(m => m.type === 'lottie')) canvas.requestRenderAll(); requestAnimationFrame(loop); })();
}

/* ---------------------------------------------------------------
   7. OBJECT ACTIONS (delete, copy, order, align, group…)
---------------------------------------------------------------- */
function clearAll() {
  S.restoring = true; canvas.discardActiveObject(); canvas.clear(); S.restoring = false;
  Object.values(media).forEach(m => { try { m.el.pause && m.el.pause(); m.anim && m.anim.destroy(); } catch {} });
  for (const k in media) delete media[k];
  audioTracks.splice(0).forEach(a => a.el.pause());
  canvas.backgroundColor = '#ffffff';
}
function deleteSel() { const a = canvas.getActiveObjects(); if (!a.length) return; endPreview(); canvas.discardActiveObject(); a.forEach(o => canvas.remove(o)); canvas.requestRenderAll(); }
function cloneObj(o, cb) {
  if (o.fvType === 'video' || o.fvType === 'lottie') return toast('Videos/animations cannot be duplicated — add the file again.', 'error');
  o.clone(c => { c.fvId = uid(); cb(c); }, PROPS);
}
function duplicate() {
  const o = canvas.getActiveObject(); if (!o) return; endPreview();
  cloneObj(o, c => {
    c.set({ left: o.left + 30, top: o.top + 30, evented: true });
    if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject(x => { x.fvId = uid(); canvas.add(x); }); c.setCoords(); }
    else canvas.add(c);
    canvas.setActiveObject(c); canvas.requestRenderAll();
  });
}
const copy = () => { const o = canvas.getActiveObject(); if (o) cloneObj(o, c => S.clipboard = c); };
function paste() {
  if (!S.clipboard) return; endPreview();
  S.clipboard.clone(c => {
    canvas.discardActiveObject(); c.set({ left: c.left + 30, top: c.top + 30, evented: true });
    if (c.type === 'activeSelection') { c.canvas = canvas; c.forEachObject(x => { x.fvId = uid(); canvas.add(x); }); c.setCoords(); } else { c.fvId = uid(); canvas.add(c); }
    S.clipboard.top += 30; S.clipboard.left += 30; canvas.setActiveObject(c); canvas.requestRenderAll();
  }, PROPS);
}
function align(kind) {
  const o = canvas.getActiveObject(); if (!o) return; const r = o.getBoundingRect(true, true), W = canvas.getWidth(), H = canvas.getHeight();
  const d = { left: [-r.left, 0], center: [W / 2 - (r.left + r.width / 2), 0], right: [W - (r.left + r.width), 0],
              top: [0, -r.top], middle: [0, H / 2 - (r.top + r.height / 2)], bottom: [0, H - (r.top + r.height)] }[kind];
  o.set({ left: o.left + d[0], top: o.top + d[1] }); o.setCoords(); canvas.requestRenderAll(); canvas.fire('object:modified', { target: o }); syncFields();
}
async function removeBG(o) {
  if (!o || o.type !== 'image' || o.fvType) return toast('Select a normal image first', 'error');
  showBusy('Removing background… (first time downloads an AI model ~40 MB)', 40);
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.5.5/+esm');
    const rm = mod.removeBackground || mod.default;
    const blob = await (await fetch(o.getSrc())).blob();
    const out = await rm(blob); const url = URL.createObjectURL(out);
    o.setSrc(url, () => { o.filters = []; canvas.requestRenderAll(); commit(); renderProps(); hideBusy(); toast('Background removed', 'ok'); }, { crossOrigin: 'anonymous' });
  } catch (e) { console.error(e); hideBusy(); toast('Background removal failed (needs internet and a modern browser).', 'error'); }
}
function doAction(act) {
  const o = canvas.getActiveObject(); if (!o && !['undo'].includes(act)) return;
  switch (act) {
    case 'front': canvas.bringToFront(o); break; case 'forward': canvas.bringForward(o); break;
    case 'backward': canvas.sendBackwards(o); break; case 'back': canvas.sendToBack(o); break;
    case 'duplicate': return duplicate(); case 'delete': return deleteSel();
    case 'flipX': o.set('flipX', !o.flipX); break; case 'flipY': o.set('flipY', !o.flipY); break;
    case 'lock': setLock(o, !o.fvLocked); renderProps(); break;
    case 'group': if (o.type === 'activeSelection') { const g = o.toGroup(); g.fvId = uid(); g.fvName = 'Group'; canvas.setActiveObject(g); } break;
    case 'ungroup': if (o.type === 'group') { o.toActiveSelection(); } break;
    case 'bold': o.set('fontWeight', o.fontWeight === 'bold' ? 'normal' : 'bold'); break;
    case 'italic': o.set('fontStyle', o.fontStyle === 'italic' ? 'normal' : 'italic'); break;
    case 'underline': o.set('underline', !o.underline); break;
    case 'removebg': return removeBG(o);
    default: if (act.startsWith('align-')) return align(act.slice(6));
             if (act.startsWith('ta-')) o.set('textAlign', act.slice(3));
  }
  o.setCoords && o.setCoords(); canvas.requestRenderAll(); commit(); renderProps();
}

/* ---------------------------------------------------------------
   8. RIGHT PANEL: properties + layers
---------------------------------------------------------------- */
$$('.tab').forEach(t => t.onclick = () => {
  $$('.tab').forEach(x => x.classList.toggle('active', x === t));
  $('#propsPanel').classList.toggle('active', t.dataset.tab === 'props');
  $('#layersPanel').classList.toggle('active', t.dataset.tab === 'layers');
});
const ab = (act, ic, title, on) => `<button data-act="${act}" title="${title}" class="${on ? 'on' : ''} ${act === 'delete' ? 'danger' : ''}"><i data-lucide="${ic}"></i></button>`;
const numF = (label, prop, val, extra = '') => `<label class="f"><span>${label}</span><input type="number" data-prop="${prop}" value="${val}" ${extra}></label>`;
const colF = (label, prop, val) => `<label class="f"><span>${label}</span><input type="color" data-prop="${prop}" value="${toHex(val)}"></label>`;
const rngF = (label, prop, val, min, max, step = 1, attr = 'data-prop') => `<label class="f full"><span>${label}</span><input type="range" ${attr}="${prop}" min="${min}" max="${max}" step="${step}" value="${val}"></label>`;
const sec = (title, body) => `<div class="sec"><h5>${title}</h5>${body}</div>`;
const ANIMS = [['none', 'None'], ['fade', 'Fade in'], ['slideLeft', 'Slide from left'], ['slideUp', 'Slide up'], ['pop', 'Pop'], ['zoom', 'Zoom in']];

function renderProps() {
  const el = $('#propsPanel'), o = canvas.getActiveObject();
  if (!o) {
    el.innerHTML = sec('Canvas', `<div class="fields">${numF('Width', 'cw', canvas.getWidth())}${numF('Height', 'ch', canvas.getHeight())}
      <button class="ghost wide" style="grid-column:1/-1" data-act="resize">Apply size</button>${colF('Background', 'cbg', canvas.backgroundColor || '#ffffff')}</div>`)
      + `<p class="hint">Click any object to edit it. Double-click text to type. Use Space to play the timeline.</p>`;
    return icons();
  }
  const multi = o.type === 'activeSelection', isText = /text/.test(o.type), isImg = o.type === 'image' && !o.fvType, isMedia = !!o.fvType;
  let h = sec('Arrange',
    `<div class="btnrow">${ab('front', 'bring-to-front', 'Bring to front')}${ab('forward', 'arrow-up', 'Forward')}${ab('backward', 'arrow-down', 'Backward')}${ab('back', 'send-to-back', 'Send to back')}
    ${ab('duplicate', 'copy', 'Duplicate (Ctrl+D)')}${ab('lock', o.fvLocked ? 'lock' : 'unlock', 'Lock / unlock', o.fvLocked)}${ab('flipX', 'flip-horizontal', 'Flip horizontal')}${ab('flipY', 'flip-vertical', 'Flip vertical')}
    ${multi ? ab('group', 'group', 'Group') : ''}${o.type === 'group' ? ab('ungroup', 'ungroup', 'Ungroup') : ''}${ab('delete', 'trash-2', 'Delete (Del)')}</div>`);
  h += sec('Align to canvas',
    `<div class="btnrow">${ab('align-left', 'align-start-vertical', 'Left')}${ab('align-center', 'align-center-vertical', 'Center')}${ab('align-right', 'align-end-vertical', 'Right')}
    ${ab('align-top', 'align-start-horizontal', 'Top')}${ab('align-middle', 'align-center-horizontal', 'Middle')}${ab('align-bottom', 'align-end-horizontal', 'Bottom')}</div>`);
  h += sec('Position & size',
    `<div class="fields">${numF('X', 'left', round(o.left))}${numF('Y', 'top', round(o.top))}${numF('Width', 'width', round(o.getScaledWidth()))}${isText ? '' : numF('Height', 'height', round(o.getScaledHeight()))}
    ${numF('Rotate °', 'angle', round(o.angle || 0))}</div>`);
  if (!multi) {
    let ap = rngF('Opacity %', 'opacity', Math.round((o.opacity ?? 1) * 100), 0, 100);
    if (!isImg && !isMedia) ap += `<div class="fields" style="margin-top:8px">${colF(isText ? 'Text color' : 'Fill', 'fill', typeof o.fill === 'string' ? o.fill : COLORS.purple)}${colF('Outline', 'stroke', o.stroke || '#000000')}${numF('Outline px', 'strokeWidth', o.strokeWidth || 0, 'min="0"')}${o.type === 'rect' ? numF('Corner radius', 'rx', o.rx || 0, 'min="0"') : ''}</div>`;
    h += sec('Appearance', ap);
  }
  if (isText) h += sec('Text',
    `<div class="fields"><label class="f full"><span>Font</span><select data-prop="fontFamily">${CONFIG.FONTS.map(f => `<option ${f === o.fontFamily ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    ${numF('Size', 'fontSize', round(o.fontSize), 'min="4"')}${numF('Line height', 'lineHeight', round(o.lineHeight || 1.16, 2), 'step="0.05"')}${numF('Letter space', 'charSpacing', round(o.charSpacing || 0))}</div>
    <div class="btnrow" style="margin-top:8px">${ab('bold', 'bold', 'Bold', o.fontWeight === 'bold')}${ab('italic', 'italic', 'Italic', o.fontStyle === 'italic')}${ab('underline', 'underline', 'Underline', o.underline)}
    ${ab('ta-left', 'align-left', 'Left', o.textAlign === 'left')}${ab('ta-center', 'align-center', 'Center', o.textAlign === 'center')}${ab('ta-right', 'align-right', 'Right', o.textAlign === 'right')}</div>`);
  if (isImg) {
    const fv = (i, k) => Math.round(((o.filters && o.filters[i] && o.filters[i][k]) || 0) * 100);
    h += sec('Image', `<button class="ghost wide" data-act="removebg"><i data-lucide="scissors"></i> Remove background</button>
      <div class="fields" style="margin-top:8px">${rngF('Brightness', 'brightness', fv(0, 'brightness'), -100, 100, 1, 'data-filter')}${rngF('Contrast', 'contrast', fv(1, 'contrast'), -100, 100, 1, 'data-filter')}
      ${rngF('Saturation', 'saturation', fv(2, 'saturation'), -100, 100, 1, 'data-filter')}${rngF('Blur', 'blur', fv(3, 'blur'), 0, 100, 1, 'data-filter')}</div>`);
  }
  if (!multi) h += sec('Animation & timing (for video)',
    `<div class="fields"><label class="f full"><span>Entrance animation</span><select data-prop="fvAnim">${ANIMS.map(a => `<option value="${a[0]}" ${a[0] === o.fvAnim ? 'selected' : ''}>${a[1]}</option>`).join('')}</select></label>
    ${numF('Appears at (s)', 'fvStart', round(o.fvStart || 0, 1), 'min="0" step="0.1"')}${numF('Disappears at (s)', 'fvEnd', round(o.fvEnd ?? tl.duration, 1), 'min="0" step="0.1"')}</div>`);
  el.innerHTML = h; icons();
}
function syncFields() {
  const o = canvas.getActiveObject(); if (!o) return;
  const v = { left: o.left, top: o.top, width: o.getScaledWidth(), height: o.getScaledHeight(), angle: o.angle || 0 };
  Object.entries(v).forEach(([k, val]) => { const i = $(`#propsPanel [data-prop="${k}"]`); if (i && document.activeElement !== i) i.value = round(val); });
}
function applyField(t) {
  const p = t.dataset.prop; let v = t.type === 'number' || t.type === 'range' ? parseFloat(t.value) : t.value;
  if (t.type !== 'color' && t.tagName !== 'SELECT' && Number.isNaN(v)) return;
  if (p === 'cbg') { canvas.backgroundColor = v; canvas.requestRenderAll(); return; }
  if (p === 'cw' || p === 'ch') return;
  const o = canvas.getActiveObject(); if (!o) return;
  const isText = /text/.test(o.type);
  switch (p) {
    case 'opacity': o.set('opacity', v / 100); break;
    case 'width': if (isText) o.set('width', Math.max(20, v)); else o.set('scaleX', v / o.width); break;
    case 'height': if (!isText) o.set('scaleY', v / o.height); break;
    case 'rx': o.set({ rx: v, ry: v }); break;
    case 'fontFamily': loadFont(v).then(() => { o.set('fontFamily', v); canvas.requestRenderAll(); commit(); }); return;
    case 'fvAnim': o.set(p, v); renderTimeline(); return;
    case 'fvStart': case 'fvEnd': o.set(p, clamp(v, 0, tl.duration)); renderTimeline(); return;
    default: o.set(p, v);
  }
  o.setCoords(); canvas.requestRenderAll();
}
function applyFilter(t) {
  const o = canvas.getActiveObject(); if (!o || o.type !== 'image') return;
  const map = { brightness: [0, fabric.Image.filters.Brightness], contrast: [1, fabric.Image.filters.Contrast], saturation: [2, fabric.Image.filters.Saturation], blur: [3, fabric.Image.filters.Blur] };
  const [i, F] = map[t.dataset.filter], val = parseFloat(t.value) / 100;
  o.filters = o.filters || []; o.filters[i] = val ? new F({ [t.dataset.filter]: val }) : undefined;
  o.applyFilters(); canvas.requestRenderAll();
}
const pp = $('#propsPanel');
pp.addEventListener('input', e => { if (e.target.dataset.filter) applyFilter(e.target); else if (e.target.dataset.prop) applyField(e.target); });
pp.addEventListener('change', e => { if (e.target.dataset.prop || e.target.dataset.filter) { commit(); const p = e.target.dataset.prop; if (['fontFamily', 'fvAnim'].includes(p)) renderProps(); } });
pp.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  if (b.dataset.act === 'resize') { const w = clamp(+$('[data-prop=cw]').value || 1080, 100, 4000), h = clamp(+$('[data-prop=ch]').value || 1080, 100, 4000); resizeCanvas(w, h); commit(); renderProps(); }
  else doAction(b.dataset.act);
});

/* --- size dropdown --- */
$('#sizeSelect').innerHTML = CONFIG.SIZES.map((s, i) => `<option value="${i}">${s[0]}</option>`).join('') + '<option value="custom">Custom size</option>';
function syncSizeSelect() {
  const i = CONFIG.SIZES.findIndex(s => s[1] === canvas.getWidth() && s[2] === canvas.getHeight());
  $('#sizeSelect').value = i >= 0 ? i : 'custom';
}
$('#sizeSelect').onchange = e => { if (e.target.value === 'custom') return; const s = CONFIG.SIZES[e.target.value]; resizeCanvas(s[1], s[2]); commit(); renderProps(); };

/* --- layers list --- */
let layerItems = [];
function renderLayers() {
  const list = $('#layersList'), objs = canvas.getObjects().slice().reverse(), act = canvas.getActiveObjects();
  layerItems = objs;
  list.innerHTML = objs.length ? objs.map((o, i) => `<li class="layer ${act.includes(o) ? 'active' : ''}" data-i="${i}"><i data-lucide="${typeIcon(o)}"></i>
    <span class="lname">${esc(o.fvName)}</span>
    <button data-l="vis" title="Show / hide"><i data-lucide="${o.visible === false ? 'eye-off' : 'eye'}"></i></button>
    <button data-l="lock" title="Lock"><i data-lucide="${o.fvLocked ? 'lock' : 'unlock'}"></i></button>
    <button data-l="del" title="Delete"><i data-lucide="trash-2"></i></button></li>`).join('')
    : '<li class="empty">No layers yet. Add text, shapes or upload a file.</li>';
  icons();
}
new Sortable($('#layersList'), { animation: 150, filter: 'button,.empty', preventOnFilter: false, ghostClass: 'sortable-ghost',
  onEnd: ev => { const o = layerItems[ev.oldIndex]; if (!o) return; canvas.moveTo(o, layerItems.length - 1 - ev.newIndex); canvas.requestRenderAll(); commit(); } });
$('#layersList').addEventListener('click', e => {
  const li = e.target.closest('.layer'); if (!li) return; const o = layerItems[li.dataset.i]; if (!o) return;
  const btn = e.target.closest('[data-l]'); endPreview();
  if (btn) {
    if (btn.dataset.l === 'vis') { o.visible = o.visible === false; canvas.discardActiveObject(); }
    if (btn.dataset.l === 'lock') setLock(o, !o.fvLocked);
    if (btn.dataset.l === 'del') { canvas.remove(o); }
    canvas.requestRenderAll(); commit(); return;
  }
  if (o.visible !== false) { canvas.setActiveObject(o); canvas.requestRenderAll(); }
});
$('#layersList').addEventListener('dblclick', e => {
  const li = e.target.closest('.layer'); if (!li) return; const o = layerItems[li.dataset.i];
  const n = prompt('Layer name:', o.fvName); if (n) { o.fvName = n; commit(); }
});
canvas.on('selection:created', () => { renderProps(); renderLayers(); renderTimeline(); });
canvas.on('selection:updated', () => { renderProps(); renderLayers(); renderTimeline(); });
canvas.on('selection:cleared', () => { renderProps(); renderLayers(); renderTimeline(); });
['object:moving', 'object:scaling', 'object:rotating'].forEach(ev => canvas.on(ev, syncFields));
canvas.on('object:scaling', e => { const o = e.target; if (/textbox/.test(o.type)) { o.set({ width: o.width * o.scaleX, fontSize: round(o.fontSize * o.scaleY), scaleX: 1, scaleY: 1 }); } });

/* ---------------------------------------------------------------
   9. SNAP GUIDES (objects "stick" to the canvas center and edges)
---------------------------------------------------------------- */
let guides = [];
canvas.on('object:moving', e => {
  const o = e.target, W = canvas.getWidth(), H = canvas.getHeight(), T = 8 / S.zoom; guides = [];
  const r = o.getBoundingRect(true, true);
  const xs = [[0, 'l'], [W / 2, 'c'], [W, 'r']], ys = [[0, 't'], [H / 2, 'm'], [H, 'b']];
  canvas.getObjects().forEach(x => { if (x !== o && x.visible !== false && !(o._objects || []).includes(x)) { const b = x.getBoundingRect(true, true);
    xs.push([b.left, 'l'], [b.left + b.width / 2, 'c'], [b.left + b.width, 'r']); ys.push([b.top, 't'], [b.top + b.height / 2, 'm'], [b.top + b.height, 'b']); } });
  const mine = { l: r.left, c: r.left + r.width / 2, r: r.left + r.width, t: r.top, m: r.top + r.height / 2, b: r.top + r.height };
  let done = false;
  for (const [pos] of xs) { for (const k of ['l', 'c', 'r']) if (!done && Math.abs(mine[k] - pos) < T) { o.left += pos - mine[k]; guides.push({ x: pos }); done = true; } }
  done = false;
  for (const [pos] of ys) { for (const k of ['t', 'm', 'b']) if (!done && Math.abs(mine[k] - pos) < T) { o.top += pos - mine[k]; guides.push({ y: pos }); done = true; } }
});
canvas.on('after:render', () => {
  if (!guides.length) return; const c = canvas.contextTop; if (!c) return;
  c.save(); c.strokeStyle = '#ff4d8d'; c.lineWidth = 2 / S.zoom; c.setLineDash([8 / S.zoom, 6 / S.zoom]);
  guides.forEach(g => { c.beginPath(); if (g.x != null) { c.moveTo(g.x, 0); c.lineTo(g.x, canvas.getHeight()); } else { c.moveTo(0, g.y); c.lineTo(canvas.getWidth(), g.y); } c.stroke(); });
  c.restore();
});
canvas.on('mouse:up', () => { if (guides.length) { guides = []; canvas.requestRenderAll(); } });
canvas.on('mouse:down', () => { if (tl.preview && !tl.playing) endPreview(); });

/* ---------------------------------------------------------------
   10. TIMELINE (video + motion): preview, drag bars, animations
---------------------------------------------------------------- */
const LABEL_W = 150, ease = p => 1 - Math.pow(1 - p, 3), backOut = p => 1 + 2.70158 * Math.pow(p - 1, 3) + 1.70158 * Math.pow(p - 1, 2);
const fmt = s => s.toFixed(1) + 's';
const updateTime = () => { $('#timeLabel').textContent = `${fmt(tl.t)} / ${fmt(tl.duration)}`; const ph = $('#playhead'); if (ph) ph.style.left = (LABEL_W + tl.t * tl.pps) + 'px'; };

function renderTimeline() {
  const inner = $('#tlInner'), W = tl.duration * tl.pps, sel = canvas.getActiveObjects();
  inner.style.width = (LABEL_W + W + 60) + 'px';
  const ticks = Array.from({ length: Math.floor(tl.duration) + 1 }, (_, s) => `<span class="tick" style="left:${s * tl.pps}px">${s}s</span>`).join('');
  let h = `<div class="tl-ruler"><div class="tl-label">Layers</div><div class="tl-track ruler-track" id="ruler" style="width:${W}px">${ticks}</div></div>`;
  canvas.getObjects().slice().reverse().forEach(o => {
    const s = o.fvStart || 0, e = o.fvEnd ?? tl.duration, isSel = sel.includes(o), an = (ANIMS.find(a => a[0] === o.fvAnim) || ANIMS[0])[1];
    h += `<div class="tl-row"><div class="tl-label ${isSel ? 'sel' : ''}" data-sel="${o.fvId}"><i data-lucide="${typeIcon(o)}"></i>${esc(o.fvName)}</div>
      <div class="tl-track" style="width:${W}px"><div class="bar ${o.fvType ? 'media' : ''} ${isSel ? 'sel' : ''}" data-id="${o.fvId}" data-kind="obj"
      style="left:${s * tl.pps}px;width:${Math.max(8, (e - s) * tl.pps)}px">${o.fvAnim && o.fvAnim !== 'none' ? '✦ ' + an : ''}</div></div></div>`;
  });
  audioTracks.forEach(a => {
    h += `<div class="tl-row"><div class="tl-label"><i data-lucide="music"></i>${esc(a.name)}<span class="x" data-rm="${a.id}" title="Remove">✕</span></div>
      <div class="tl-track" style="width:${W}px"><div class="bar audio" data-id="${a.id}" data-kind="audio" style="left:${a.start * tl.pps}px;width:${Math.max(8, a.dur * tl.pps)}px">♪ ${esc(a.name)}</div></div></div>`;
  });
  inner.innerHTML = h + '<div id="playhead"></div>'; icons(); updateTime();
}
/* dragging bars */
$('#tlInner').addEventListener('pointerdown', e => {
  const rm = e.target.closest('[data-rm]');
  if (rm) { const i = audioTracks.findIndex(a => a.id === rm.dataset.rm); if (i >= 0) { audioTracks[i].el.pause(); audioTracks.splice(i, 1); renderTimeline(); } return; }
  const lab = e.target.closest('[data-sel]');
  if (lab) { const o = canvas.getObjects().find(x => x.fvId === lab.dataset.sel); if (o) { endPreview(); canvas.setActiveObject(o); canvas.requestRenderAll(); } return; }
  const ruler = e.target.closest('#ruler');
  if (ruler) { scrub(e, ruler); return; }
  const bar = e.target.closest('.bar'); if (!bar) return;
  e.preventDefault(); bar.setPointerCapture(e.pointerId); endPreview();
  const kind = bar.dataset.kind, obj = kind === 'obj' ? canvas.getObjects().find(x => x.fvId === bar.dataset.id) : audioTracks.find(a => a.id === bar.dataset.id);
  if (!obj) return;
  if (kind === 'obj') { canvas.setActiveObject(obj); canvas.requestRenderAll(); }
  const r = bar.getBoundingClientRect(), mode = kind === 'audio' ? 'move' : (e.clientX - r.left < 8 ? 'l' : r.right - e.clientX < 8 ? 'r' : 'move');
  const x0 = e.clientX, s0 = kind === 'obj' ? (obj.fvStart || 0) : obj.start, e0 = kind === 'obj' ? (obj.fvEnd ?? tl.duration) : obj.start + obj.dur;
  const snap = v => Math.round(v * 10) / 10;
  const move = ev => {
    const dt = (ev.clientX - x0) / tl.pps; let s = s0, en = e0;
    if (mode === 'move') { const len = e0 - s0; s = clamp(snap(s0 + dt), 0, Math.max(0, tl.duration - len)); en = s + len; }
    if (mode === 'l') s = clamp(snap(s0 + dt), 0, e0 - 0.2);
    if (mode === 'r') en = clamp(snap(e0 + dt), s0 + 0.2, tl.duration);
    if (kind === 'obj') { obj.fvStart = s; obj.fvEnd = en; } else obj.start = s;
    bar.style.left = s * tl.pps + 'px'; bar.style.width = Math.max(8, (en - s) * tl.pps) + 'px';
  };
  const up = () => { bar.removeEventListener('pointermove', move); bar.removeEventListener('pointerup', up); if (kind === 'obj') { commit(); renderProps(); } };
  bar.addEventListener('pointermove', move); bar.addEventListener('pointerup', up);
});
function scrub(e, ruler) {
  pause(); capture();
  const go = ev => { const r = ruler.getBoundingClientRect(); tl.t = clamp((ev.clientX - r.left) / tl.pps, 0, tl.duration); applyTime(tl.t); seekMedia(tl.t); updateTime(); canvas.requestRenderAll(); };
  go(e);
  const mv = ev => go(ev), up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
/* remember the "edit" state, play with animations, then restore it */
function capture() {
  if (tl.preview) return; tl.base.clear();
  canvas.getObjects().forEach(o => tl.base.set(o, { left: o.left, top: o.top, scaleX: o.scaleX, scaleY: o.scaleY, opacity: o.opacity, visible: o.visible !== false }));
  tl.preview = true; canvas.discardActiveObject();
}
function endPreview() {
  if (!tl.preview) return; pause();
  tl.base.forEach((b, o) => { o.set(b); o.setCoords(); }); tl.base.clear(); tl.preview = false; tl.t = 0; updateTime(); canvas.requestRenderAll();
}
function applyTime(t) {
  const W = canvas.getWidth(), H = canvas.getHeight(), D = CONFIG.ANIM_SECONDS;
  canvas.getObjects().forEach(o => {
    const b = tl.base.get(o); if (!b) return;
    const s = o.fvStart || 0, e = o.fvEnd ?? tl.duration, inR = b.visible && t >= s && t <= e;
    o.visible = inR; if (!inR) return;
    o.set({ left: b.left, top: b.top, scaleX: b.scaleX, scaleY: b.scaleY, opacity: b.opacity });
    const p = ease(clamp((t - s) / D, 0, 1)), raw = clamp((t - s) / D, 0, 1);
    switch (o.fvAnim) {
      case 'fade': o.opacity = b.opacity * p; break;
      case 'slideLeft': o.left = b.left - (1 - p) * W * 0.3; o.opacity = b.opacity * p; break;
      case 'slideUp': o.top = b.top + (1 - p) * H * 0.15; o.opacity = b.opacity * p; break;
      case 'pop': case 'zoom': {
        const c = o.getCenterPoint(), k = o.fvAnim === 'pop' ? 0.4 + 0.6 * backOut(raw) : 0.5 + 0.5 * p;
        o.set({ scaleX: b.scaleX * k, scaleY: b.scaleY * k, opacity: b.opacity * (o.fvAnim === 'zoom' ? p : Math.min(1, raw * 3)) });
        o.setPositionByOrigin(c, 'center', 'center'); break; }
    }
    o.setCoords();
  });
}
function seekMedia(t) {
  canvas.getObjects().forEach(o => { const m = media[o.fvId]; if (m && m.type === 'video' && o.visible) { const d = m.el.duration || 1; m.el.currentTime = ((t - (o.fvStart || 0)) % d + d) % d; } });
}
function mediaTick(t) {
  canvas.getObjects().forEach(o => { const m = media[o.fvId]; if (!m || m.type !== 'video') return;
    if (o.visible && m.el.paused) { const d = m.el.duration || 1; m.el.currentTime = ((t - (o.fvStart || 0)) % d + d) % d; m.el.play().catch(() => {}); }
    else if (!o.visible && !m.el.paused) m.el.pause(); });
  audioTracks.forEach(a => { const inR = t >= a.start && t < a.start + a.dur;
    if (inR && a.el.paused) { a.el.currentTime = t - a.start; a.el.play().catch(() => {}); } else if (!inR && !a.el.paused) a.el.pause(); });
}
function pauseMedia() {
  Object.values(media).forEach(m => m.type === 'video' && m.el.pause()); audioTracks.forEach(a => a.el.pause());
}
function tick(ts) {
  if (!tl.playing) return;
  tl.t += (ts - tl.last) / 1000; tl.last = ts;
  if (tl.t >= tl.duration) { tl.t = tl.duration; applyTime(tl.t); updateTime(); canvas.requestRenderAll(); pause(); const cb = tl.onEnd; tl.onEnd = null; if (cb) cb(); return; }
  applyTime(tl.t); mediaTick(tl.t); updateTime(); canvas.requestRenderAll();
  tl.raf = requestAnimationFrame(tick);
}
function play() {
  if (tl.playing) return; capture(); if (tl.t >= tl.duration - 0.05) tl.t = 0;
  tl.playing = true; tl.last = performance.now();
  Object.entries(media).forEach(([id, m]) => { if (m.type === 'lottie') { const o = canvas.getObjects().find(x => x.fvId === id); if (o) m.anim.goToAndPlay(((tl.t - (o.fvStart || 0)) * 1000), false); } });
  $('#btnPlay').innerHTML = '<i data-lucide="pause"></i>'; icons(); tl.raf = requestAnimationFrame(tick);
}
function pause() {
  tl.playing = false; cancelAnimationFrame(tl.raf); pauseMedia();
  $('#btnPlay').innerHTML = '<i data-lucide="play"></i>'; icons();
}
$('#btnPlay').onclick = () => tl.playing ? pause() : play();
$('#btnStop').onclick = () => { endPreview(); };
$('#durInput').onchange = e => {
  const old = tl.duration, nd = clamp(parseInt(e.target.value) || 10, 1, 300); tl.duration = nd; e.target.value = nd;
  canvas.getObjects().forEach(o => { if (o.fvEnd === old || o.fvEnd > nd) o.fvEnd = nd; if ((o.fvStart || 0) >= nd) o.fvStart = 0; });
  audioTracks.forEach(a => { if (a.start >= nd) a.start = 0; }); commit(); renderTimeline();
};
$('#btnToggleTl').onclick = () => { $('#timeline').classList.toggle('collapsed'); setTimeout(fitZoom, 200); };

/* ---------------------------------------------------------------
   11. EXPORT (PNG · JPG · PDF · Video) + send to FlowvaMarket
---------------------------------------------------------------- */
const safeName = () => ($('#projectName').value || 'design').trim().replace(/[^\w\-]+/g, '_').slice(0, 60) || 'design';
function download(blob, filename) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
let audioCtx = null, audioDest = null;
function ensureAudio() { if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); audioDest = audioCtx.createMediaStreamDestination(); } return audioCtx; }

function recordVideo() {
  return new Promise(async (resolve, reject) => {
    try {
      if (!window.MediaRecorder) throw new Error('Video export needs Chrome, Edge or Firefox.');
      const prefs = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      const mime = prefs.find(m => MediaRecorder.isTypeSupported(m));
      const stream = canvas.lowerCanvasEl.captureStream(30);
      if (audioTracks.length) {
        const ctx = ensureAudio(); await ctx.resume();
        audioTracks.forEach(a => { if (!a.node) { a.node = ctx.createMediaElementSource(a.el); a.node.connect(ctx.destination); a.node.connect(audioDest); } });
        audioDest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      }
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8e6 }), chunks = [];
      rec.ondataavailable = e => e.data.size && chunks.push(e.data);
      rec.onstop = () => { const type = rec.mimeType || mime || 'video/webm'; endPreview(); resolve({ blob: new Blob(chunks, { type }), mime: type, ext: type.includes('mp4') ? 'mp4' : 'webm' }); };
      rec.onerror = e => reject(e.error || new Error('Recorder error'));
      tl.t = 0; rec.start(250);
      const prog = setInterval(() => showBusy(`Recording video… ${fmt(tl.t)} of ${fmt(tl.duration)}`, (tl.t / tl.duration) * 100), 250);
      tl.onEnd = () => { clearInterval(prog); setTimeout(() => rec.stop(), 300); };
      play();
    } catch (e) { reject(e); }
  });
}

async function exportAs(fmtName) {
  try {
    endPreview(); canvas.discardActiveObject(); canvas.requestRenderAll(); await sleep(60);
    const name = safeName(); let blob, mime, ext = fmtName;
    if (fmtName === 'png' || fmtName === 'jpg') {
      const url = canvas.toDataURL({ format: fmtName === 'jpg' ? 'jpeg' : 'png', quality: 0.95 });
      blob = await (await fetch(url)).blob(); mime = blob.type;
    } else if (fmtName === 'pdf') {
      const { jsPDF } = window.jspdf, W = canvas.getWidth(), H = canvas.getHeight();
      const pdf = new jsPDF({ orientation: W > H ? 'l' : 'p', unit: 'px', format: [W, H], hotfixes: ['px_scaling'] });
      pdf.addImage(canvas.toDataURL({ format: 'png' }), 'PNG', 0, 0, W, H); blob = pdf.output('blob'); mime = 'application/pdf';
    } else if (fmtName === 'video') {
      showBusy('Recording video…', 0); const r = await recordVideo(); blob = r.blob; mime = r.mime; ext = r.ext; hideBusy();
    }
    const filename = `${name}.${ext}`;
    download(blob, filename); toast(`Exported ${filename}`, 'ok');
    if (S.embedded) await sendToMarketplace(blob, mime, filename, fmtName);
  } catch (e) {
    console.error(e); hideBusy(); endPreview();
    toast(e.name === 'SecurityError' ? 'Export blocked: an image came from another website without permission (CORS). Upload it from your computer instead.' : (e.message || 'Export failed'), 'error');
  }
}
async function uploadToSupabase(blob, filename, mime) {
  if (!CONFIG.SUPABASE_URL || !window.supabase) return null;
  const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY), path = `${Date.now()}_${filename}`;
  const { error } = await sb.storage.from(CONFIG.SUPABASE_BUCKET).upload(path, blob, { contentType: mime }); if (error) throw error;
  return sb.storage.from(CONFIG.SUPABASE_BUCKET).getPublicUrl(path).data.publicUrl;
}
async function sendToMarketplace(blob, mime, filename, format) {
  let url = null; try { url = await uploadToSupabase(blob, filename, mime); } catch (e) { console.warn('Upload failed', e); }
  const payload = { format, mime, filename, width: canvas.getWidth(), height: canvas.getHeight(), url, sourceFileUrl: S.sourceUrl, blob: url ? undefined : blob };
  const target = window.opener || window.parent;
  target.postMessage({ type: 'FLOWVA_EXPORT_DONE', payload }, CONFIG.MARKETPLACE_ORIGIN);
  toast('Sent to FlowvaMarket', 'ok');
}
$('#exportBtn').onclick = e => { e.stopPropagation(); $('#exportMenu').classList.toggle('open'); };
document.addEventListener('click', () => $('#exportMenu').classList.remove('open'));
$('#exportMenu').onclick = e => { const b = e.target.closest('[data-export]'); if (b) { $('#exportMenu').classList.remove('open'); exportAs(b.dataset.export); } };

/* the marketplace can also push a file into the editor */
window.addEventListener('message', e => {
  if (CONFIG.MARKETPLACE_ORIGIN !== '*' && e.origin !== CONFIG.MARKETPLACE_ORIGIN) return;
  if (e.data && e.data.type === 'FLOWVA_LOAD_FILE' && e.data.url) { S.sourceUrl = e.data.url; loadFromUrl(e.data.url); }
});

/* ---------------------------------------------------------------
   12. TOP BAR, KEYBOARD SHORTCUTS, START-UP
---------------------------------------------------------------- */
$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
$('#btnZoomIn').onclick = () => setZoom(S.zoom * 1.2); $('#btnZoomOut').onclick = () => setZoom(S.zoom / 1.2); $('#btnFit').onclick = fitZoom;
$('#btnSave').onclick = saveProjectFile;
$('#btnOpenProject').onclick = () => $('#projectInput').click();
$('#projectInput').onchange = async e => { const f = e.target.files[0]; if (f) { try { openProject(JSON.parse(await f.text())); } catch { toast('Invalid project file', 'error'); } } e.target.value = ''; };
$('#btnNew').onclick = () => {
  if (canvas.getObjects().length && !confirm('Start a new design? Unsaved changes will be lost.')) return;
  endPreview(); clearAll(); resizeCanvas(1080, 1080); $('#projectName').value = 'Untitled design'; resetHistory(); renderProps();
};
$('#projectName').oninput = () => { S.dirty = true; };
scroller.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(S.zoom * (e.deltaY < 0 ? 1.08 : 0.92)); } }, { passive: false });
window.addEventListener('resize', () => { if (!S.manualZoom) fitZoom(); });

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(), o = canvas.getActiveObject();
  if (['input', 'textarea', 'select'].includes(tag) || (o && o.isEditing)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (mod && k === 'c') { copy(); }
  else if (mod && k === 'v') { e.preventDefault(); paste(); }
  else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
  else if (mod && k === 's') { e.preventDefault(); saveProjectFile(); }
  else if (mod && k === 'a') { e.preventDefault(); canvas.discardActiveObject(); const s = new fabric.ActiveSelection(canvas.getObjects().filter(x => x.visible !== false && !x.fvLocked), { canvas }); canvas.setActiveObject(s); canvas.requestRenderAll(); }
  else if (k === 'delete' || k === 'backspace') { e.preventDefault(); deleteSel(); }
  else if (k === ' ') { e.preventDefault(); tl.playing ? pause() : play(); }
  else if (k === 'escape') { canvas.discardActiveObject(); canvas.requestRenderAll(); }
  else if (o && k.startsWith('arrow') && !o.fvLocked) {
    e.preventDefault(); const d = e.shiftKey ? 10 : 1;
    o.set({ left: o.left + (k === 'arrowright' ? d : k === 'arrowleft' ? -d : 0), top: o.top + (k === 'arrowdown' ? d : k === 'arrowup' ? -d : 0) });
    o.setCoords(); canvas.requestRenderAll(); syncFields(); commit();
  }
});

/* ---- start ---- */
(async function init() {
  icons(); syncSizeSelect(); renderBrand(); renderUploads();
  document.body.classList.toggle('embedded', S.embedded);
  Promise.all(CONFIG.FONTS.map(loadFont)).then(() => canvas.requestRenderAll());
  fitZoom(); renderProps();

  // 1) a link like ?file_url=... wins; 2) otherwise restore the last auto-save
  const saved = localStorage.getItem('flowva_autosave_v1');
  if (S.sourceUrl) { resetHistory(); await loadFromUrl(S.sourceUrl); }
  else if (saved) { try { openProject(JSON.parse(saved)); toast('Restored your last session', 'ok'); } catch { resetHistory(); } }
  else { resetHistory(); }
  startRenderLoop();
  if (S.embedded) (window.opener || window.parent).postMessage({ type: 'FLOWVA_EDITOR_READY' }, CONFIG.MARKETPLACE_ORIGIN);
  window.FlowvaEditor = { canvas, exportAs, loadFromUrl };   // handy for debugging in the browser console
})();

})();
