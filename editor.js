/* =====================================================================
   FlowvaEditor — editor.js
   One file, 12 sections. Read the numbered headings to find things.
   Engine: Fabric.js 5 (canvas) · Lottie-web · ag-psd · jsPDF · SortableJS
   ===================================================================== */
(() => {
'use strict';

/* Fabric 5.3.0 uses the invalid value 'alphabetical'; map it to the valid 'alphabetic'
   (silences the console warning, text rendering is unchanged) */
(() => {
  const d = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'textBaseline');
  if (!d || !d.set) return;
  Object.defineProperty(CanvasRenderingContext2D.prototype, 'textBaseline', {
    configurable: true, enumerable: d.enumerable, get: d.get,
    set(v) { d.set.call(this, v === 'alphabetical' ? 'alphabetic' : v); },
  });
})();

/* ---------------------------------------------------------------
   1. CONFIG — the only place you need to edit for deployment
---------------------------------------------------------------- */
const CONFIG = {
  // Exact origin of the marketplace site that embeds/opens this editor (from config.js).
  // Empty = standalone: no cross-window messages are sent or accepted.
  MARKETPLACE_ORIGIN: (window.FLOWVA_CONFIG && window.FLOWVA_CONFIG.MARKETPLACE_ORIGIN) || '',
  BACKEND_ENABLED: !!(window.FLOWVA_CONFIG && window.FLOWVA_CONFIG.BACKEND_ENABLED),

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
  const isError = type === 'error';
  Toastify({
    text: msg, duration: isError ? 0 : 3200, close: true, gravity: 'bottom', position: 'center',
    stopOnFocus: true,
    style: { background: isError ? '#d63031' : '#00b894', color: '#fff',
             borderRadius: '10px', fontFamily: 'Poppins, sans-serif', fontSize: '13px',
             maxWidth: 'min(560px, calc(100vw - 28px))', width: 'max-content', whiteSpace: 'normal', overflowWrap: 'anywhere', padding: '10px 14px', lineHeight: '1.45' },
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

/* Keep object selection/editing from making the browser scroll the canvas.
   Fabric's IText focuses an invisible textarea when text editing starts; the
   browser may otherwise scroll its nested workspace to reveal that textarea. */
function installNoScrollFocus(el) {
  if (!el || el.__flowvaNoScrollFocus) return;
  const nativeFocus = el.focus.bind(el);
  el.focus = (options = {}) => {
    const pageX = window.scrollX, pageY = window.scrollY;
    const stageX = scroller.scrollLeft, stageY = scroller.scrollTop;
    const result = nativeFocus({ ...options, preventScroll: true });
    // Some browsers still move an ancestor when focusing Fabric's hidden input.
    requestAnimationFrame(() => {
      if (window.scrollX !== pageX || window.scrollY !== pageY) window.scrollTo(pageX, pageY);
      if (scroller.scrollLeft !== stageX) scroller.scrollLeft = stageX;
      if (scroller.scrollTop !== stageY) scroller.scrollTop = stageY;
    });
    return result;
  };
  el.__flowvaNoScrollFocus = true;
}
[canvas.upperCanvasEl, canvas.lowerCanvasEl].forEach(installNoScrollFocus);
if (fabric.IText && fabric.IText.prototype.initHiddenTextarea) {
  const initHiddenTextarea = fabric.IText.prototype.initHiddenTextarea;
  fabric.IText.prototype.initHiddenTextarea = function (...args) {
    const result = initHiddenTextarea.apply(this, args);
    installNoScrollFocus(this.hiddenTextarea);
    return result;
  };
}
// Selection/property-panel updates must never change the user's canvas viewport.
function preserveStageViewport() {
  const pageX = window.scrollX, pageY = window.scrollY;
  const left = scroller.scrollLeft, top = scroller.scrollTop;
  requestAnimationFrame(() => {
    if (window.scrollX !== pageX || window.scrollY !== pageY) window.scrollTo(pageX, pageY);
    if (scroller.scrollLeft !== left) scroller.scrollLeft = left;
    if (scroller.scrollTop !== top) scroller.scrollTop = top;
  });
}

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
  const pad = window.innerWidth <= 900 ? 24 : 90;      // less empty margin on phones
  const aw = scroller.clientWidth - pad, ah = scroller.clientHeight - pad;
  setZoom(Math.min(aw / canvas.getWidth(), ah / canvas.getHeight(), 1.5));
}
function resizeCanvas(w, h) {
  canvas.setWidth(w); canvas.setHeight(h);
  canvas.getObjects().forEach(o => o.setCoords());
  fitZoom(); syncSizeSelect();
  refreshWorkspaceContextLabel();
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
  if (o.fvType === 'lottie') return 'sparkles';
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
canvas.on('object:modified', e => {
  // Fabric scales textboxes by changing scaleX/scaleY while the pointer is moving.
  // Normalize once, after the gesture ends; mutating width/fontSize on every
  // object:scaling frame causes cumulative jumps and jitter during resizing.
  const o = e && e.target;
  if (o && o.type === 'textbox' && (o.scaleX !== 1 || o.scaleY !== 1)) {
    const sx = o.scaleX || 1, sy = o.scaleY || 1;
    o.set({ width: Math.max(1, o.width * sx), fontSize: Math.max(1, o.fontSize * sy), scaleX: 1, scaleY: 1 });
    o.setCoords();
    canvas.requestRenderAll();
  }
  commit();
});
canvas.on('text:changed', e => { if (e.target) e.target.fvName = defaultName({ ...e.target, fvName: '', type: 'textbox', text: e.target.text }); commit(); });
canvas.on('text:editing:entered', preserveStageViewport);
canvas.on('text:editing:exited', preserveStageViewport);

/* ---------------------------------------------------------------
   4. HISTORY (undo / redo) + AUTOSAVE
---------------------------------------------------------------- */
const hist = { stack: [], idx: -1, timer: 0 };

function snapshot() {
  const json = canvas.toJSON(PROPS);
  json.objects.forEach(o => { if (o.fvType === 'video' || o.fvType === 'lottie') o.src = BLANK_PNG; });
  json.size = { w: canvas.getWidth(), h: canvas.getHeight() };
  json.duration = tl.duration;
  json.flowva = {
    schemaVersion: 1,
    workspaceId: activeWorkspaceContext?.workspaceId || 'graphic-design',
    presetId: activeWorkspaceContext?.presetId || null,
  };
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
/* Fabric draws an image using element.naturalWidth || element.width. A <video> has no
   naturalWidth and its width attribute is 0 unless set, so Fabric would draw a 0px slice
   (invisible video). Always give a video element its real pixel size before binding it. */
function sizeVideoEl(el) {
  if (el && el.tagName === 'VIDEO' && el.videoWidth && el.videoHeight) { el.width = el.videoWidth; el.height = el.videoHeight; }
  return el;
}
/* Decode a data: URL locally. fetch(data:) is blocked by the connect-src CSP. */
function dataUrlToBlob(dataUrl) {
  const comma = dataUrl.indexOf(','); if (comma < 0) throw new Error('Could not read the exported image.');
  const mime = (dataUrl.slice(5, comma).split(';')[0] || 'application/octet-stream').trim();
  const bin = atob(dataUrl.slice(comma + 1)), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
function restore(json, done) {
  S.restoring = true;
  canvas.discardActiveObject();
  canvas.loadFromJSON(json, () => {
    // Fabric may finish enlivening the placeholder image after the reviver runs.
    // Rebind only now, when the newly loaded objects are actually on the canvas.
    // Doing this immediately after loadFromJSON() targets the OLD canvas objects,
    // which silently leaves the saved BLANK_PNG in place for restored videos.
    canvas.getObjects().filter(o => (o.fvType === 'video' || o.fvType === 'lottie') && !media[o.fvId])
      .forEach(o => canvas.remove(o));
    canvas.getObjects().forEach(obj => {
      const runtime = media[obj.fvId];
      if ((obj.fvType === 'video' || obj.fvType === 'lottie') && runtime?.el) {
        sizeVideoEl(runtime.el);
        obj.setElement(runtime.el, { width: obj.width, height: obj.height });
        obj.objectCaching = false;
        obj.dirty = true;
        obj.setCoords();
      }
    });
    if (json.size && (json.size.w !== canvas.getWidth() || json.size.h !== canvas.getHeight())) resizeCanvas(json.size.w, json.size.h);
    if (json.duration) { tl.duration = json.duration; $('#durInput').value = json.duration; }
    S.restoring = false;
    canvas.requestRenderAll(); refreshUI(); renderProps(); done && done();
  }, (o, obj) => {
    if ((obj.fvType === 'video' || obj.fvType === 'lottie') && media[obj.fvId]) {
      sizeVideoEl(media[obj.fvId].el);
      obj.setElement(media[obj.fvId].el, { width: o.width, height: o.height });
      obj.objectCaching = false;
    }
  });
  // Do not rebind here: loadFromJSON is asynchronous. The completed-load
  // callback above performs the final media-element binding.
}
function undo() { if (hist.idx > 0) { hist.idx--; restore(JSON.parse(hist.stack[hist.idx])); } }
function redo() { if (hist.idx < hist.stack.length - 1) { hist.idx++; restore(JSON.parse(hist.stack[hist.idx])); } }
function resetHistory() { hist.stack = []; hist.idx = -1; commit(); }

/* snapshot that survives a page reload: turn blob: URLs into data: URLs */
async function portableSnapshot(includeMedia = false) {
  const json = snapshot();
  const toData = blob => new Promise((resolve, reject) => {
    const fr = new FileReader(); fr.onload = () => resolve(fr.result);
    fr.onerror = () => reject(fr.error || new Error('Could not preserve an image in this project.'));
    fr.readAsDataURL(blob);
  });
  // Fabric serializes image URLs. A blob: URL is temporary and cannot survive a reload,
  // so replace it with embedded data before any local save or project export.
  const liveObjects = canvas.getObjects();
  for (let i = 0; i < json.objects.length; i++) {
    const saved = json.objects[i], live = liveObjects[i];
    if (!saved || saved.type !== 'image') continue;
    let source = typeof saved.src === 'string' ? saved.src : '';
    if (!source || source.startsWith('data:')) continue;
    const liveSource = live && (live.getSrc?.() || live._element?.currentSrc || live._element?.src || live._originalElement?.src);
    source = liveSource || source;
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error('Image source could not be read.');
      saved.src = await toData(await response.blob());
    } catch (error) {
      // Last-resort rasterization from the live image element; never silently save a broken URL.
      try {
        const el = live?._element || live?._originalElement;
        if (!el) throw error;
        const c = document.createElement('canvas'); c.width = el.naturalWidth || el.width; c.height = el.naturalHeight || el.height;
        c.getContext('2d').drawImage(el, 0, 0); saved.src = c.toDataURL('image/png');
      } catch { throw new Error('An image in this design could not be embedded for saving. Re-add the image and try again.'); }
    }
  }
  json.name = $('#projectName').value;
  if (includeMedia) {
    const toDataUri = async (source, sourceBlob, label) => {
      if (sourceBlob instanceof Blob && sourceBlob.size) return await toData(sourceBlob);
      if (typeof source === 'string' && source.startsWith('data:')) return source;
      if (!source) throw new Error(`Missing ${label || 'media'} source. Re-add it and retry .flowva.`);
      try { const response = await fetch(source); if (!response.ok) throw new Error(`Browser returned HTTP ${response.status}.`); const blob = await response.blob(); if (!blob.size) throw new Error('The source file is empty.'); return await toData(blob); }
      catch (error) { throw new Error(`Could not read ${label || 'media'} (${error?.message || 'source unavailable'}). Re-add it and retry .flowva.`); }
    };
    json.media = { objects: [], audio: [] };
    const activeMediaIds = new Set(canvas.getObjects().filter(o => o.fvType === 'video' || o.fvType === 'lottie').map(o => o.fvId));
    for (const [id, item] of Object.entries(media)) {
      if (!activeMediaIds.has(id)) continue;
      if (item.type === 'video') json.media.objects.push({ id, type: 'video', name: item.name || 'Video', mime: item.mime || (item.el?.currentSrc?.match(/\.webm/i) ? 'video/webm' : 'video/mp4'), data: await toDataUri(item.src || item.el?.currentSrc || item.el?.src, item.sourceBlob, item.name || 'video') });
      else if (item.type === 'lottie') json.media.objects.push({ id, type: 'lottie', name: item.name || 'Animation', animationData: item.animationData });
    }
    for (const track of audioTracks) json.media.audio.push({ id: track.id, name: track.name, start: track.start || 0, dur: track.dur || 10, mime: track.mime || (track.el?.currentSrc?.match(/\.ogg/i) ? 'audio/ogg' : 'audio/mpeg'), data: await toDataUri(track.src || track.el?.currentSrc || track.el?.src, track.sourceBlob, track.name || 'audio') });
  }
  return json;
}
function projectMediaSaveBlocker() {
  const activeMediaObjects = canvas.getObjects().filter(o => o.fvType === 'video' || o.fvType === 'lottie');
  const videoCount = activeMediaObjects.filter(o => o.fvType === 'video' && media[o.fvId]).length;
  const lottieCount = activeMediaObjects.filter(o => o.fvType === 'lottie' && media[o.fvId]).length;
  const audioCount = audioTracks.length;
  if (!videoCount && !lottieCount && !audioCount) return '';
  const parts = [];
  if (videoCount) parts.push(`${videoCount} video${videoCount === 1 ? '' : 's'}`);
  if (audioCount) parts.push(`${audioCount} audio track${audioCount === 1 ? '' : 's'}`);
  if (lottieCount) parts.push(`${lottieCount} Lottie animation${lottieCount === 1 ? '' : 's'}`);
  return `This design has ${parts.join(', ')}. Use Download .flowva to keep its media editable; browser Save cannot store these tracks.`;
}
let warnedAutosave = false;
let autosaving = false;
async function autosave() {
  if (!S.dirty || autosaving) return;
  const mediaWarning = projectMediaSaveBlocker();
  if (mediaWarning) {
    if (!warnedAutosave) { warnedAutosave = true; toast('Media project: download .flowva to keep editing. Browser auto-save skips media.', 'error'); }
    return;
  }
  autosaving = true;
  const revision = hist.idx;
  const projectName = $('#projectName').value;
  try {
    const snapshot = await portableSnapshot();
    if (window.FlowvaProjectEngine?.saveRecovery) await FlowvaProjectEngine.saveRecovery(snapshot);
    else localStorage.setItem('flowva_autosave_v1', JSON.stringify(snapshot));
    if (workspaceProjectId && window.FlowvaProjectEngine?.saveProject) await FlowvaProjectEngine.saveProject(workspaceProjectId, snapshot);
    if (hist.idx === revision && $('#projectName').value === projectName) S.dirty = false;
  } catch (error) {
    if (!warnedAutosave) { warnedAutosave = true; toast('Auto-save failed. Check browser storage or download a .flowva backup.', 'error'); }
    console.warn('FlowvaEditor autosave failed:', error);
  } finally { autosaving = false; }
}
setInterval(autosave, CONFIG.AUTOSAVE_MS);
window.addEventListener('beforeunload', e => { if (S.dirty) { autosave(); e.preventDefault(); e.returnValue = ''; } });

async function saveWorkingProject() {
  const mediaWarning = projectMediaSaveBlocker();
  if (mediaWarning) { toast(mediaWarning, 'error'); return; }
  try {
    const payload = await portableSnapshot();
    if (workspaceProjectId && window.FlowvaProjectEngine?.saveProject) {
      await FlowvaProjectEngine.saveProject(workspaceProjectId, payload, makeThumbnail());
    } else if (window.FlowvaProjectEngine?.createProject && window.FlowvaProjectEngine?.saveProject) {
      const record = await FlowvaProjectEngine.createProject(payload.name || 'Untitled design');
      workspaceProjectId = record.id;
      await FlowvaProjectEngine.saveProject(workspaceProjectId, payload, makeThumbnail());
      history.replaceState({}, '', `${location.pathname}?project_id=${encodeURIComponent(workspaceProjectId)}`);
    } else {
      throw new Error('Local project storage is unavailable in this browser.');
    }
    if (window.FlowvaProjectEngine?.saveRecovery) await FlowvaProjectEngine.saveRecovery(payload);
    S.dirty = false;
    toast('Saved to Projects on this device.', 'ok');
  } catch (error) { toast(error.message || 'Could not save this project.', 'error'); }
}

async function saveProjectFile() {
  try {
    const snapshot = await portableSnapshot(true);
    const packaged = window.FlowvaProjectEngine ? await window.FlowvaProjectEngine.packageProject(snapshot) : snapshot;
    download(new Blob([JSON.stringify(packaged)], { type: 'application/vnd.flowva.project+json' }), safeName() + '.flowva');
    // The downloaded .flowva file is the portable source of truth for media-heavy
    // work. Do not duplicate potentially huge media into IndexedDB Projects.
    S.dirty = false;
    toast('.flowva downloaded. Keep the file to reopen and continue editing.', 'ok');
  } catch (error) { toast(error.message || 'Could not create project file.', 'error'); }
}
function makeThumbnail() {
  try { canvas.discardActiveObject(); canvas.requestRenderAll();
    return canvas.toDataURL({ format: 'jpeg', quality: 0.72, multiplier: Math.min(1, 480 / Math.max(canvas.getWidth(), canvas.getHeight())) }); } catch { return ''; }
}
let workspaceProjectId = new URLSearchParams(location.search).get('project_id');
async function saveToWorkspace() {
  const mediaWarning = projectMediaSaveBlocker();
  if (mediaWarning) { toast(mediaWarning, 'error'); return; }
  if (!window.FlowvaAPI) return toast('Workspace API is unavailable', 'error');
  try {
    const payload = await portableSnapshot();
    const data = { title: $('#projectName').value || 'Untitled design', payload, thumbnail: makeThumbnail() };
    const result = workspaceProjectId
      ? await FlowvaAPI.projects.update(workspaceProjectId, data)
      : await FlowvaAPI.projects.create(data);
    workspaceProjectId = result.data.id;
    if (window.FlowvaProjectEngine?.saveRecovery) await FlowvaProjectEngine.saveRecovery(payload);
    S.dirty = false;
    toast('Saved to your Flowva workspace', 'ok');
  } catch (e) { toast(e.message || 'Workspace save failed', 'error'); }
}

async function openProject(json) {
  if (!json || !Array.isArray(json.objects)) return toast('That is not a Flowva project file', 'error');
  const expiredImageRefs = json.objects.some(o => o?.type === 'image' && typeof o.src === 'string' && o.src.startsWith('blob:'));
  endPreview();
  try {
    await hydrateProjectMedia(json);
    applyProjectWorkspaceContext(json);
    restore(json, () => {
      if (json.name) $('#projectName').value = json.name;
      applyWorkspaceContext(activeWorkspaceContext.workspaceId, activeWorkspaceContext.presetId);
      fitZoom(); resetHistory();
      if (expiredImageRefs) toast('This older project contains expired temporary image links. Re-add those images from your device or Asset Library, then Save to preserve them.', 'error');
      else toast('Project opened with its editable media sources.', 'ok');
    });
  } catch (error) { toast(error.message || 'Could not restore this project media.', 'error'); }
}
async function hydrateProjectMedia(project) {
  const manifest = project.media;
  const loadedMedia = {}, loadedAudio = [], stagedUrls = [];
  const makeObjectUrl = async data => {
    // Decode data: URLs locally. fetch(data:) is blocked by the app's intentional
    // connect-src policy and is unnecessary for data already inside the .flowva file.
    if (typeof data !== 'string' || !data.startsWith('data:')) throw new Error('An embedded media source is invalid.');
    const comma = data.indexOf(','); if (comma < 0) throw new Error('An embedded media source is malformed.');
    const header = data.slice(5, comma), body = data.slice(comma + 1), isBase64 = /;base64(?:;|$)/i.test(header);
    const mime = (header.split(';')[0] || 'application/octet-stream').trim();
    try {
      let parts;
      if (isBase64) {
        // Decode in small slices and yield between them so large media files do not
        // monopolise the main thread. Chunk size is divisible by four for base64.
        parts = []; const chunkSize = 4 * 256 * 1024;
        for (let offset = 0; offset < body.length; offset += chunkSize) {
          const binary = atob(body.slice(offset, Math.min(offset + chunkSize, body.length)));
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          parts.push(bytes);
          if (offset + chunkSize < body.length) await new Promise(resolve => setTimeout(resolve, 0));
        }
      } else parts = [new TextEncoder().encode(decodeURIComponent(body))];
      const blob = new Blob(parts, { type: mime });
      if (!blob.size) throw new Error('An embedded media source is empty.');
      return { url: URL.createObjectURL(blob), blob };
    } catch (error) {
      if (error?.message === 'An embedded media source is empty.') throw error;
      throw new Error('Could not decode an embedded media source.');
    }
  };
  try {
    for (const item of (manifest?.objects || [])) {
      if (!item?.id || !item.type) throw new Error('This project has an invalid media entry.');
      if (item.type === 'video') {
        if (!item.data) throw new Error(`The video source for ${item.name || 'a video'} is missing.`);
        const embedded = await makeObjectUrl(item.data), url = embedded.url, v = document.createElement('video'); stagedUrls.push(url);
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
        const ready = new Promise((resolve, reject) => { v.onloadeddata = resolve; v.onerror = () => reject(new Error(`Could not decode ${item.name || 'a video'} in this browser.`)); });
        v.src = url; v.load(); await ready;
        // Prime a real decoded frame before Fabric binds the element to its image object.
        try { if (v.duration > 0) { v.currentTime = Math.min(0.04, v.duration / 2); await new Promise(resolve => { v.onseeked = resolve; setTimeout(resolve, 350); }); } } catch {}
        v.pause(); v.onseeked = null; sizeVideoEl(v);
        loadedMedia[item.id] = { type: 'video', el: v, src: url, sourceBlob: embedded.blob, name: item.name, mime: item.mime };
      } else if (item.type === 'lottie') {
        if (!item.animationData) throw new Error(`The animation data for ${item.name || 'a Lottie animation'} is missing.`);
        const data = JSON.parse(JSON.stringify(item.animationData)), c = document.createElement('canvas'); c.width = data.w || 500; c.height = data.h || 500;
        const anim = lottie.loadAnimation({ renderer: 'canvas', loop: true, autoplay: true, animationData: JSON.parse(JSON.stringify(data)), rendererSettings: { context: c.getContext('2d'), clearCanvas: true } });
        loadedMedia[item.id] = { type: 'lottie', el: c, anim, animationData: data, name: item.name };
      }
    }
    for (const item of (manifest?.audio || [])) {
      if (!item?.id || !item.data) throw new Error('This project contains an audio track with a missing source file.');
      const embedded = await makeObjectUrl(item.data), url = embedded.url, el = new Audio(); stagedUrls.push(url); el.preload = 'auto';
      const ready = new Promise((resolve, reject) => { el.onloadedmetadata = resolve; el.onerror = () => reject(new Error(`Could not decode ${item.name || 'an audio track'} in this browser.`)); });
      el.src = url; el.load(); await ready;
      loadedAudio.push({ id: item.id, name: item.name || 'Audio', el, src: url, sourceBlob: embedded.blob, mime: item.mime, start: Number(item.start) || 0, dur: Number(item.dur) || el.duration || 10, node: null });
    }
  } catch (error) {
    Object.values(loadedMedia).forEach(m => { try { m.el?.pause?.(); m.anim?.destroy?.(); if (m.src?.startsWith('blob:')) URL.revokeObjectURL(m.src); } catch {} });
    loadedAudio.forEach(a => { try { a.el?.pause?.(); } catch {} });
    stagedUrls.forEach(url => { try { URL.revokeObjectURL(url); } catch {} });
    throw error;
  }
  // Replace the current runtime media only after every source in the new project loaded.
  Object.values(media).forEach(m => { try { m.el?.pause?.(); m.anim?.destroy?.(); if (m.src?.startsWith('blob:')) URL.revokeObjectURL(m.src); } catch {} });
  for (const key of Object.keys(media)) delete media[key];
  Object.assign(media, loadedMedia);
  audioTracks.splice(0).forEach(a => { try { a.el?.pause?.(); if (a.src?.startsWith('blob:')) URL.revokeObjectURL(a.src); } catch {} });
  audioTracks.push(...loadedAudio);
  if (Object.values(media).some(m => m.type === 'lottie')) startRenderLoop();
  renderTimeline();
}

/* ---------------------------------------------------------------
   5. LEFT PANELS: templates, shapes, text, uploads, brand kit
---------------------------------------------------------------- */
/* --- rail switching --- */
$$('.rail-btn').forEach(b => b.onclick = () => {
  $$('.rail-btn').forEach(x => x.classList.toggle('active', x === b));
  $$('#flyout .panel').forEach(p => p.classList.toggle('active', p.dataset.panel === b.dataset.panel));
  if (b.dataset.panel === 'uploads') renderEditorAssetLibrary();
});
async function renderEditorAssetLibrary() {
  const host = $('#editorAssetLibrary'); if (!host || !window.FlowvaProjectEngine) return;
  try {
    const items = await FlowvaProjectEngine.listAssets();
    if (!items.length) { host.innerHTML = '<p class="hint">Your browser Asset Library is empty. Add files from the workspace homepage or upload them above.</p>'; return; }
    host.innerHTML = items.slice(0, 30).map(a => {
      const type = a.type || '', icon = type.startsWith('image/') ? 'image' : type.startsWith('video/') ? 'film' : type.startsWith('audio/') ? 'audio-lines' : 'file';
      const supported = type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/') || /\.(json|lottie)$/i.test(a.name || '');
      return `<div class="editor-asset-row"><i data-lucide="${icon}"></i><span title="${esc(a.name)}">${esc(a.name)}</span>${supported ? `<button class="mini-action" data-editor-asset="${esc(a.id)}">Add</button>` : '<small>Stored</small>'}</div>`;
    }).join('') + (items.length > 30 ? '<p class="hint">Showing 30 assets. Manage the full library from the workspace homepage.</p>' : '');
    icons();
  } catch (error) { host.innerHTML = `<p class="hint">Could not load Asset Library: ${esc(error.message)}</p>`; }
}
$('#editorAssetLibrary')?.addEventListener('click', async e => {
  const button = e.target.closest('[data-editor-asset]'); if (!button) return;
  button.disabled = true;
  try {
    const asset = await FlowvaProjectEngine.getAsset(button.dataset.editorAsset);
    if (!asset?.blob) throw new Error('This asset is no longer available in browser storage.');
    await handleFile(new File([asset.blob], asset.name, { type: asset.type || asset.blob.type }));
  } catch (error) { toast(error.message || 'Could not add this asset.', 'error'); }
  finally { button.disabled = false; }
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

/* --- custom gradient studio: editable 2–5 stop linear/radial fills --- */
const gradientStopsEl = $('#gradientStops');
let customGradientStops = [
  { color: '#6C5CE7', offset: 0 },
  { color: '#A29BFE', offset: 50 },
  { color: '#00CEC9', offset: 100 },
];
function gradientPreviewCSS() {
  const stops = customGradientStops.slice().sort((a, b) => a.offset - b.offset)
    .map(s => `${s.color} ${s.offset}%`).join(', ');
  return `${$('#customGradientType').value === 'radial' ? 'radial-gradient(circle' : `linear-gradient(${$('#customGradientAngle').value}deg`}, ${stops})`;
}
function renderGradientStops() {
  gradientStopsEl.innerHTML = customGradientStops.map((stop, i) => `
    <div class="gradient-stop" data-stop-index="${i}">
      <label class="gradient-stop-color" title="Stop ${i + 1} colour">
        <input type="color" data-stop-color="${i}" value="${stop.color}" aria-label="Gradient stop ${i + 1} colour">
      </label>
      <label class="gradient-stop-position"><span>Position</span>
        <input type="range" data-stop-offset="${i}" min="0" max="100" value="${stop.offset}" aria-label="Stop ${i + 1} position">
        <output>${stop.offset}%</output>
      </label>
      <button type="button" class="icon-btn gradient-stop-remove" data-remove-stop="${i}" title="Remove stop" aria-label="Remove gradient stop" ${customGradientStops.length <= 2 ? 'disabled' : ''}>×</button>
    </div>`).join('');
  updateGradientPreview();
}
function updateGradientPreview() {
  const angle = $('#customGradientAngle').value;
  $('#gradientAngleValue').textContent = `${angle}°`;
  $('#gradientAngleWrap').hidden = $('#customGradientType').value === 'radial';
  $('#customGradientPreview').style.background = gradientPreviewCSS();
}
function createCustomFabricGradient(width, height) {
  const type = $('#customGradientType').value;
  const angle = Number($('#customGradientAngle').value) * Math.PI / 180;
  const radius = Math.sqrt(width * width + height * height) / 2;
  const cx = width / 2, cy = height / 2;
  const coords = type === 'radial'
    ? { x1: cx, y1: cy, r1: 0, x2: cx, y2: cy, r2: radius }
    : { x1: cx - Math.cos(angle) * radius, y1: cy - Math.sin(angle) * radius,
        x2: cx + Math.cos(angle) * radius, y2: cy + Math.sin(angle) * radius };
  return new fabric.Gradient({
    type, coords,
    colorStops: customGradientStops.slice().sort((a, b) => a.offset - b.offset)
      .map(stop => ({ offset: stop.offset / 100, color: stop.color }))
  });
}
function applyCustomGradient(toCanvas) {
  endPreview();
  const target = canvas.getActiveObject();
  if (!toCanvas && !target) { toast('Select an object to apply the gradient', 'error'); return; }
  if (toCanvas) {
    const W = canvas.getWidth(), H = canvas.getHeight();
    const bg = new fabric.Rect({
      left: 0, top: 0, width: W, height: H,
      fill: createCustomFabricGradient(W, H),
      selectable: true, evented: true, objectCaching: false,
      fvName: 'Custom gradient background'
    });
    canvas.add(bg); canvas.sendToBack(bg); canvas.setActiveObject(bg);
  } else {
    const targets = target.type === 'activeSelection' ? target.getObjects() : [target];
    targets.forEach(obj => {
      const w = Math.max(1, obj.width || obj.getScaledWidth() || 1);
      const h = Math.max(1, obj.height || obj.getScaledHeight() || 1);
      obj.set('fill', createCustomFabricGradient(w, h));
      obj.dirty = true;
    });
    canvas.requestRenderAll();
  }
  canvas.requestRenderAll(); commit(); renderProps(); renderLayers();
  toast(toCanvas ? 'Gradient background added' : 'Gradient applied');
}
gradientStopsEl.addEventListener('input', e => {
  const colorIndex = e.target.dataset.stopColor;
  const offsetIndex = e.target.dataset.stopOffset;
  if (colorIndex !== undefined) customGradientStops[Number(colorIndex)].color = e.target.value;
  if (offsetIndex !== undefined) {
    const i = Number(offsetIndex), value = Number(e.target.value);
    customGradientStops[i].offset = value;
    const output = e.target.closest('.gradient-stop-position')?.querySelector('output');
    if (output) output.textContent = `${value}%`;
  }
  updateGradientPreview();
});
gradientStopsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-remove-stop]');
  if (!b || customGradientStops.length <= 2) return;
  customGradientStops.splice(Number(b.dataset.removeStop), 1); renderGradientStops();
});
$('#addGradientStop').onclick = () => {
  if (customGradientStops.length >= 5) { toast('A gradient can have up to 5 stops'); return; }
  const sorted = customGradientStops.slice().sort((a, b) => a.offset - b.offset);
  const left = sorted[sorted.length - 2], right = sorted[sorted.length - 1];
  customGradientStops.push({ color: '#FFFFFF', offset: Math.round((left.offset + right.offset) / 2) });
  renderGradientStops();
};
$('#resetGradientStops').onclick = () => {
  customGradientStops = [{ color: '#6C5CE7', offset: 0 }, { color: '#A29BFE', offset: 50 }, { color: '#00CEC9', offset: 100 }];
  $('#customGradientType').value = 'linear'; $('#customGradientAngle').value = 135; renderGradientStops();
};
$('#customGradientType').onchange = updateGradientPreview;
$('#customGradientAngle').oninput = updateGradientPreview;
$('#applyGradientToSelection').onclick = () => applyCustomGradient(false);
$('#applyGradientToCanvas').onclick = () => applyCustomGradient(true);
renderGradientStops();

/* --- icons (fetched as SVG from the Lucide icon set, so they stay editable vectors) --- */
const ICONS = ['star','heart','phone','mail','map-pin','shopping-bag','gift','tag','percent','calendar','clock','camera','music','megaphone','zap','check-circle'];
$('#iconGrid').innerHTML = ICONS.map(n => `<button class="tile" data-icon="${n}" title="${n}"><i data-lucide="${n}"></i></button>`).join('');
$('#iconGrid').onclick = async e => {
  const b = e.target.closest('[data-icon]'); if (!b) return;
  try {   // built from the self-hosted Lucide bundle, so icons stay editable vectors and work offline
    const pascal = b.dataset.icon.replace(/(^|-)(\w)/g, (_, __, c) => c.toUpperCase());
    const node = lucide.icons[pascal]; if (!node) throw new Error('icon');
    const el = lucide.createElement(node); el.setAttribute('width', 24); el.setAttribute('height', 24); el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    await addSVGString(el.outerHTML.replace(/currentColor/g, COLORS.dark), b.dataset.icon, 0.25);
  } catch { toast('Could not add that icon', 'error'); }
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
  canvas.add(t); t.viewportCenter ? t.viewportCenter() : t.center(); t.setCoords(); canvas.setActiveObject(t); canvas.requestRenderAll();
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

/* --- templates: loaded from the Flowva marketplace API (nothing is bundled with the editor) --- */
const safeHttp = u => { if (!u || typeof u !== 'string') return ''; try { const x = new URL(u, location.href); return /^https?:$/.test(x.protocol) ? x.href : ''; } catch { return ''; } };
const tplState = { items: [], loaded: false };
function renderTemplatePanel(msg) {
  const grid = $('#tplGrid');
  if (msg) { grid.innerHTML = `<p class="hint">${esc(msg)}</p>`; return; }
  grid.innerHTML = tplState.items.length ? tplState.items.map((t, i) => {
    const img = safeHttp(t.previewUrl);
    return `<button class="tpl" data-tpl="${i}"><div class="thumb"${img ? ` style="background-image:url('${esc(img)}');background-size:cover;background-position:center"` : ''}>${img ? '' : esc(t.title)}</div><div class="meta">${esc(t.title)}<small>${esc(t.category || 'Template')}</small></div></button>`;
  }).join('') : '<p class="hint">No templates available yet. Templates you own or that are free will appear here.</p>';
}
async function loadTemplatePanel() {
  if (!window.FlowvaAPI) return renderTemplatePanel('Templates are unavailable.');
  renderTemplatePanel('Loading templates…');
  try {
    const r = await FlowvaAPI.templates.list(); const d = r.data;
    tplState.items = (Array.isArray(d) ? d : (d && d.items) || []).filter(t => t && t.title && (t.sourceUrl || t.editUrl));
    tplState.loaded = true; renderTemplatePanel();
  } catch (e) { renderTemplatePanel(e.status === 401 ? 'Sign in to Flowva to use templates.' : 'Could not load templates. Check your connection.'); }
}
$('#tplGrid').onclick = async e => {
  const b = e.target.closest('[data-tpl]'); if (!b) return;
  const t = tplState.items[b.dataset.tpl]; if (!t) return;
  if (canvas.getObjects().length && !confirm('Replace the current design with this template?')) return;
  const src = safeHttp(t.sourceUrl);
  if (!src) { const edit = safeHttp(t.editUrl); if (edit) location.href = edit; return; }
  endPreview(); clearAll(); resetHistory();
  S.sourceUrl = src; await loadFromUrl(src);
  if (t.title && !$('#projectName').value.trim()) $('#projectName').value = t.title;
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
    if (name.endsWith('.flowva') || name.endsWith('.json') || name.endsWith('.lottie')) {
      const j = JSON.parse(await file.text());
      if (j.layers && (j.fr || j.v)) return addLottie(j, file.name);
      if (j.format === 'flowva-project' && window.FlowvaProjectEngine) return openProject(FlowvaProjectEngine.unpackProject(j));
      if (j.objects) return openProject(j);
      return toast('Unknown JSON file', 'error');
    }
    if (type.startsWith('video/') || /\.(mp4|webm|mov)$/.test(name)) return addVideo(URL.createObjectURL(file), file.name, file.type, file);
    if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/.test(name)) return addAudio(URL.createObjectURL(file), file.name, file.type, file);
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
  const sourceData = JSON.parse(JSON.stringify(data));
  const w = sourceData.w || 500, h = sourceData.h || 500, c = document.createElement('canvas'); c.width = w; c.height = h;
  const anim = lottie.loadAnimation({ renderer: 'canvas', loop: true, autoplay: true, animationData: JSON.parse(JSON.stringify(sourceData)), rendererSettings: { context: c.getContext('2d'), clearCanvas: true } });
  const img = new fabric.Image(c, { objectCaching: false });
  img.fvId = uid(); img.fvType = 'lottie'; img.fvName = (name || 'Animation').replace(/\.[^.]+$/, '');
  media[img.fvId] = { type: 'lottie', el: c, anim, animationData: sourceData, name: (name || 'Animation').replace(/\.[^.]+$/, '') };
  placeCentered(img, 0.7); startRenderLoop(); toast('Lottie animation added', 'ok');
}

/* --- Video (AI tools: Sora, Runway… give MP4) --- */
function addVideo(url, name, mime = '', sourceBlob = null) {
  const v = document.createElement('video');
  v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto'; v.crossOrigin = 'anonymous';
  v.onloadeddata = () => {
    v.currentTime = 0.05;
    const vw = v.videoWidth, vh = v.videoHeight;
    v.width = vw; v.height = vh;
    if (!canvas.getObjects().length) { const k = Math.min(1, 1920 / Math.max(vw, vh)); resizeCanvas(Math.round(vw * k), Math.round(vh * k)); }
    const dur = Math.max(1, Math.ceil(v.duration || 5));
    if (dur > tl.duration) { tl.duration = dur; $('#durInput').value = dur; }
    const img = new fabric.Image(v, { objectCaching: false, width: vw, height: vh });
    img.fvId = uid(); img.fvType = 'video'; img.fvName = name.replace(/\.[^.]+$/, ''); img.fvEnd = tl.duration;
    media[img.fvId] = { type: 'video', el: v, src: url, sourceBlob: sourceBlob instanceof Blob ? sourceBlob : null, name: name.replace(/\.[^.]+$/, ''), mime: mime || (v.currentSrc?.match(/\.webm/i) ? 'video/webm' : 'video/mp4') };
    const W = canvas.getWidth(), H = canvas.getHeight(), k = Math.max(W / vw, H / vh);
    img.set({ scaleX: k, scaleY: k, left: (W - vw * k) / 2, top: (H - vh * k) / 2 });
    canvas.add(img); canvas.sendToBack(img); canvas.setActiveObject(img);
    v.onseeked = () => canvas.requestRenderAll();
    toast('Video added at the bottom layer. Add text/logo on top, then Export → Video.', 'ok');
  };
  v.onerror = () => toast('This video format is not supported by your browser.', 'error');
  v.src = url; v.load();
}

/* --- Audio (music / voice-over, lives only on the timeline) --- */
function addAudio(url, name, mime = '', sourceBlob = null) {
  const el = new Audio(); el.preload = 'auto'; el.crossOrigin = 'anonymous';
  el.onloadedmetadata = () => {
    audioTracks.push({ id: uid(), name: name.replace(/\.[^.]+$/, ''), el, src: url, sourceBlob: sourceBlob instanceof Blob ? sourceBlob : null, mime: mime || (el.currentSrc?.match(/\.ogg/i) ? 'audio/ogg' : 'audio/mpeg'), start: 0, dur: el.duration || 10, node: null });
    renderTimeline(); toast('Audio added to the timeline', 'ok');
  };
  el.onerror = () => toast('Audio file not supported.', 'error');
  el.src = url; el.load();
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
/* Background removal: self-hosted model, runs in a Web Worker, loaded only on first use (no cost to page load). */
let bgWorker = null, bgIdleTimer = null;
function bgRun(rgba, onProgress) {
  return new Promise((resolve, reject) => {
    clearTimeout(bgIdleTimer);
    if (!bgWorker) bgWorker = new Worker('vendor/bgremoval/worker.js');
    const w = bgWorker;
    const done = () => { bgIdleTimer = setTimeout(() => { w.terminate(); if (bgWorker === w) bgWorker = null; }, 120000); };
    w.onmessage = ({ data }) => {
      if (data.type === 'progress') onProgress(data.f, data.phase);
      else if (data.type === 'done') { done(); resolve(data.alpha); }
      else if (data.type === 'error') { w.terminate(); bgWorker = null; reject(new Error(data.message)); }
    };
    w.onerror = e => { w.terminate(); bgWorker = null; reject(new Error(e.message || 'Worker failed')); };
    w.postMessage({ rgba }, [rgba]);
  });
}
const canvasToDataUrl = c => new Promise((res, rej) => c.toBlob(b => {
  if (!b) return rej(new Error('Could not encode image'));
  const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b);
}, 'image/png'));
async function removeBG(o) {
  if (!o || o.type !== 'image' || o.fvType) return toast('Select a normal image first', 'error');
  showBusy('Preparing image…', 5);
  try {
    const el = o._originalElement || o.getElement();
    const sw = el.naturalWidth || el.width, sh = el.naturalHeight || el.height;
    if (!sw || !sh) throw new Error('Image is not loaded yet');
    const k = Math.min(1, 4096 / Math.max(sw, sh)), W = Math.round(sw * k), H = Math.round(sh * k);
    const small = document.createElement('canvas'); small.width = small.height = 1024;
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.imageSmoothingQuality = 'high'; sctx.drawImage(el, 0, 0, 1024, 1024);
    const rgba = sctx.getImageData(0, 0, 1024, 1024).data.buffer;
    const alpha = await bgRun(rgba, (f, phase) => {
      if (phase === 'init') showBusy('Starting AI model…', 55);
      else if (phase === 'run') showBusy('Removing background…', 70);
      else showBusy(f < 1 ? `Loading AI model (first time only)… ${Math.round(f * 100)}%` : 'Loading AI model…', 5 + f * 45);
    });
    showBusy('Applying cut-out…', 90);
    sctx.putImageData(new ImageData(new Uint8ClampedArray(alpha), 1024, 1024), 0, 0);
    const out = document.createElement('canvas'); out.width = W; out.height = H;
    const octx = out.getContext('2d'); octx.imageSmoothingQuality = 'high';
    octx.drawImage(el, 0, 0, W, H);
    octx.globalCompositeOperation = 'destination-in'; octx.drawImage(small, 0, 0, W, H);
    const url = await canvasToDataUrl(out);
    o.setSrc(url, () => {
      if (k < 1) o.set({ scaleX: o.scaleX / k, scaleY: o.scaleY / k });
      o.filters = []; o.setCoords(); canvas.requestRenderAll(); commit(); renderProps(); hideBusy(); toast('Background removed', 'ok');
    }, { crossOrigin: 'anonymous' });
  } catch (e) { console.error(e); hideBusy(); toast('Background removal failed: ' + (e.message || 'unknown error'), 'error'); }
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
canvas.on('selection:created', () => { preserveStageViewport(); renderProps(); renderLayers(); renderTimeline(); });
canvas.on('selection:updated', () => { preserveStageViewport(); renderProps(); renderLayers(); renderTimeline(); });
canvas.on('selection:cleared', () => { preserveStageViewport(); renderProps(); renderLayers(); renderTimeline(); });
['object:moving', 'object:scaling', 'object:rotating'].forEach(ev => canvas.on(ev, syncFields));
// Textbox scaling is intentionally left untouched during pointer movement; it is normalized on object:modified above.

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
  const edge = e.pointerType === 'touch' ? 20 : 8;     // wider grab zone for fingers
  const r = bar.getBoundingClientRect(), mode = kind === 'audio' ? 'move' : (e.clientX - r.left < edge ? 'l' : r.right - e.clientX < edge ? 'r' : 'move');
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
$('#btnToggleTl').onclick = () => {
  const collapsed = $('#timeline').classList.toggle('collapsed');
  document.body.classList.toggle('timeline-collapsed', collapsed);
  setTimeout(fitZoom, 200);
};

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
      const prefs = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
      const mime = prefs.find(m => MediaRecorder.isTypeSupported(m));
      const stream = canvas.lowerCanvasEl.captureStream(30);
      const vTrack = stream.getVideoTracks()[0];   // lets us push a frame every time we draw
      canvas.on('after:render', () => { if (tl.playing && vTrack.requestFrame) vTrack.requestFrame(); });
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
      blob = dataUrlToBlob(url); mime = blob.type;
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
async function sendToMarketplace(blob, mime, filename, format) {
  const target = window.opener || window.parent;
  if (S.embedded && target && target !== window && CONFIG.MARKETPLACE_ORIGIN) {
    const payload = { format, mime, filename, width: canvas.getWidth(), height: canvas.getHeight(), sourceFileUrl: S.sourceUrl, blob };
    target.postMessage({ type: 'FLOWVA_EXPORT_DONE', payload }, CONFIG.MARKETPLACE_ORIGIN);
    toast('Export sent to Flowva', 'ok');
  } else { toast('Export ready', 'ok'); }
}
$('#exportBtn').onclick = e => { e.stopPropagation(); $('#exportMenu').classList.toggle('open'); };
document.addEventListener('click', () => $('#exportMenu').classList.remove('open'));
$('#exportMenu').onclick = e => { const b = e.target.closest('[data-export]'); if (b) { $('#exportMenu').classList.remove('open'); exportAs(b.dataset.export); } };

/* the marketplace can also push a file into the editor */
window.addEventListener('message', e => {
  if (!S.embedded || !CONFIG.MARKETPLACE_ORIGIN || e.source !== (window.opener || window.parent)) return;
  if (!e.origin || e.origin !== CONFIG.MARKETPLACE_ORIGIN) return;
  if (e.data && e.data.type === 'FLOWVA_LOAD_FILE' && typeof e.data.url === 'string' && /^https?:\/\//i.test(e.data.url)) { S.sourceUrl = e.data.url; loadFromUrl(e.data.url); }
});

/* ---------------------------------------------------------------
   12. TOP BAR, KEYBOARD SHORTCUTS, START-UP
---------------------------------------------------------------- */
const editorParams = new URLSearchParams(location.search);
const workspaceRegistry = window.FLOWVA_WORKSPACES;
const CREATE_CANVAS_PRESETS = Object.fromEntries(
  Object.entries(workspaceRegistry?.presets || {}).map(([id, preset]) => [id, {
    id, title: preset.editorTitle || preset.label, label: preset.label,
    dimensions: preset.dimensions, width: preset.width, height: preset.height,
    timeline: !!preset.timeline, category: preset.category,
  }])
);
function resolveWorkspaceContext(workspaceId, presetId) {
  const defaultWorkspace = workspaceRegistry?.get('graphic-design') || null;
  const knownPreset = presetId ? CREATE_CANVAS_PRESETS[presetId] : null;
  let workspace = workspaceId ? workspaceRegistry?.get(workspaceId) : null;
  if (!workspaceId && knownPreset) workspace = workspaceRegistry?.get(knownPreset.category);
  const hasRequestedContext = !!(workspaceId || presetId);
  const invalidWorkspace = hasRequestedContext && (!workspace || workspace.status === 'planned');
  if (!hasRequestedContext || invalidWorkspace) workspace = defaultWorkspace;
  if (!workspace) return { workspaceId: 'graphic-design', presetId: null, workspace: null, preset: null };
  let preset = null;
  if (invalidWorkspace) {
    preset = CREATE_CANVAS_PRESETS['square-graphic'] || workspace.presets?.[0] || null;
  } else if (presetId) {
    preset = knownPreset && knownPreset.category === workspace.id
      ? knownPreset
      : (CREATE_CANVAS_PRESETS[workspace.presets?.[0]?.id] || null);
  }
  return { workspaceId: workspace.id, presetId: preset?.id || null, workspace, preset };
}
let activeWorkspaceContext = resolveWorkspaceContext(
  editorParams.get('workspace_id'),
  editorParams.get('preset_id') || editorParams.get('preset')
);
let activeCreatePreset = activeWorkspaceContext.preset;
function refreshWorkspaceContextLabel() {
  const workspaceName = activeWorkspaceContext?.workspace?.label || 'Graphic Design';
  const presetName = activeCreatePreset?.label || 'Custom canvas';
  const actualDimensions = `${canvas.getWidth()} × ${canvas.getHeight()} px`;
  const matchesPreset = activeCreatePreset && activeCreatePreset.width === canvas.getWidth() && activeCreatePreset.height === canvas.getHeight();
  const dimensions = matchesPreset ? activeCreatePreset.dimensions : `${actualDimensions}${activeCreatePreset ? ' · custom size' : ''}`;
  const nameNode = $('#workspaceContextName');
  const presetNode = $('#workspaceContextPreset');
  if (nameNode) nameNode.textContent = workspaceName;
  if (presetNode) presetNode.textContent = `${presetName} · ${dimensions}`;
  const contextNode = $('#workspaceContext');
  if (contextNode) contextNode.setAttribute('aria-label', `${workspaceName}, ${presetName}, ${dimensions}`);
}
function applyWorkspaceContext(workspaceId, presetId) {
  activeWorkspaceContext = resolveWorkspaceContext(workspaceId, presetId);
  activeCreatePreset = activeWorkspaceContext.preset;
  if (activeCreatePreset) document.body.classList.toggle('preset-static', !activeCreatePreset.timeline);
  refreshWorkspaceContextLabel();
  return activeWorkspaceContext;
}
function applyProjectWorkspaceContext(project) {
  const metadata = project?.flowva || project?.workspace || null;
  const workspaceId = metadata?.workspaceId || metadata?.workspace?.id || metadata?.id || project?.workspaceId || null;
  const presetId = metadata?.presetId || metadata?.workspace?.presetId || metadata?.preset || project?.presetId || null;
  if (workspaceId || presetId) applyWorkspaceContext(workspaceId, presetId);
}
applyWorkspaceContext(activeWorkspaceContext.workspaceId, activeWorkspaceContext.presetId);
if (editorParams.get('project_name')) $('#projectName').value = editorParams.get('project_name').slice(0, 90);

$('#btnUndo').onclick = undo; $('#btnRedo').onclick = redo;
renderEditorAssetLibrary();
$('#closeSaveGuide')?.addEventListener('click', () => { const guide = $('#saveGuide'); if (guide) guide.hidden = true; });
$('#btnZoomIn').onclick = () => setZoom(S.zoom * 1.2); $('#btnZoomOut').onclick = () => setZoom(S.zoom / 1.2); $('#btnFit').onclick = fitZoom;
$('#btnSave').onclick = saveWorkingProject;
$('#btnDownloadProject').onclick = saveProjectFile;
$('#btnCloudSave').onclick = saveToWorkspace;
if (!CONFIG.BACKEND_ENABLED) $('#btnCloudSave').style.display = 'none';
$('#btnOpenProject').onclick = () => $('#projectInput').click();
$('#projectInput').onchange = async e => { const f = e.target.files[0]; if (f) { try { const raw = JSON.parse(await f.text()); const project = window.FlowvaProjectEngine ? FlowvaProjectEngine.unpackProject(raw) : raw; openProject(project); } catch (error) { toast(error.message || 'Invalid project file', 'error'); } } e.target.value = ''; };
$('#btnNew').onclick = () => {
  if (canvas.getObjects().length && !confirm('Start a new design? Unsaved changes will be lost.')) return;
  endPreview(); clearAll();
  resizeCanvas(activeCreatePreset?.width || 1080, activeCreatePreset?.height || 1080);
  $('#projectName').value = activeCreatePreset ? `Untitled ${activeCreatePreset.title.toLowerCase()}` : 'Untitled design';
  workspaceProjectId = null;
  const cleanUrl = new URL(location.href); cleanUrl.searchParams.delete('project_id');
  history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  resetHistory(); renderProps();
};
$('#projectName').oninput = () => { S.dirty = true; };
scroller.addEventListener('wheel', e => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(S.zoom * (e.deltaY < 0 ? 1.08 : 0.92)); } }, { passive: false });
// re-fit on window resize, but not while typing (the phone keyboard opening also fires "resize")
window.addEventListener('resize', () => {
  const t = document.activeElement && document.activeElement.tagName;
  if (t === 'TEXTAREA' || t === 'INPUT') return;
  fitZoom();
});

document.addEventListener('keydown', e => {
  const tag = (e.target.tagName || '').toLowerCase(), o = canvas.getActiveObject();
  if (['input', 'textarea', 'select'].includes(tag) || (o && o.isEditing)) return;
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if (mod && k === 'y') { e.preventDefault(); redo(); }
  else if (mod && k === 'c') { copy(); }
  else if (mod && k === 'v') { e.preventDefault(); paste(); }
  else if (mod && k === 'd') { e.preventDefault(); duplicate(); }
  else if (mod && k === 's') { e.preventDefault(); saveWorkingProject(); }
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
  icons(); syncSizeSelect(); renderBrand(); renderUploads(); loadTemplatePanel();
  document.body.classList.toggle('embedded', S.embedded);
  if (activeCreatePreset && editorParams.get('fresh') === '1') {
    resizeCanvas(activeCreatePreset.width, activeCreatePreset.height);
    syncSizeSelect();
    applyWorkspaceContext(activeWorkspaceContext.workspaceId, activeWorkspaceContext.presetId);
    if (!editorParams.get('project_name')) $('#projectName').value = `Untitled ${activeCreatePreset.title.toLowerCase()}`;
  }
  Promise.all(CONFIG.FONTS.map(loadFont)).then(() => canvas.requestRenderAll());
  fitZoom(); renderProps();

  // expose the helpers FIRST so mobile.js (pinch-zoom etc.) can use them right away
  window.FlowvaEditor = { canvas, exportAs, loadFromUrl, setZoom, fitZoom, getZoom: () => S.zoom };

  // 1) a link like ?file_url=... wins; 2) otherwise restore the last auto-save
  let recovery = null;
  const freshSession = editorParams.get('fresh') === '1';
  try { if (!freshSession) recovery = window.FlowvaProjectEngine?.loadRecovery ? await FlowvaProjectEngine.loadRecovery() : null; } catch (error) { console.warn('Could not read recovery data:', error); }
  const legacySaved = localStorage.getItem('flowva_autosave_v1');
  if (S.sourceUrl) { resetHistory(); await loadFromUrl(S.sourceUrl); }
  else if (workspaceProjectId) {
    let localProject = null;
    try { if (window.FlowvaProjectEngine?.getProject) localProject = await FlowvaProjectEngine.getProject(workspaceProjectId); } catch (e) { console.warn('Local project lookup failed:', e); }
    if (localProject) { if (localProject.content) openProject(localProject.content); else { if (localProject.title) $('#projectName').value = localProject.title; resetHistory(); } }
    else if (window.FlowvaAPI && CONFIG.BACKEND_ENABLED) {
      try { const result = await FlowvaAPI.projects.get(workspaceProjectId); if (result.data && result.data.payload) openProject(result.data.payload); else if (result.data && result.data.title) $('#projectName').value = result.data.title; else resetHistory(); }
      catch (e) { toast('Could not load workspace project: ' + e.message, 'error'); resetHistory(); }
    } else { toast('This project is not available in this browser.', 'error'); resetHistory(); }
  }
  else if (!freshSession && recovery?.snapshot) { try { openProject(recovery.snapshot); toast('Recovered your last editing session', 'ok'); } catch { resetHistory(); } }
  else if (!freshSession && legacySaved) { try { openProject(JSON.parse(legacySaved)); toast('Restored your last session', 'ok'); } catch { resetHistory(); } }
  else { resetHistory(); }
  // Do not create a Projects entry merely by opening the editor. A local project record is created only after an explicit browser Save. .flowva downloads remain portable files, not browser Projects entries.
  const assetId = editorParams.get('asset_id');
  if (assetId && window.FlowvaProjectEngine?.getAsset) {
    try { const asset = await FlowvaProjectEngine.getAsset(assetId); if (asset?.blob) await handleFile(new File([asset.blob], asset.name, { type: asset.type || asset.blob.type })); else toast('That asset is no longer available in this browser.', 'error'); }
    catch (e) { toast('Could not open this library asset: ' + e.message, 'error'); }
  }
  startRenderLoop();
  if (S.embedded && CONFIG.MARKETPLACE_ORIGIN) (window.opener || window.parent).postMessage({ type: 'FLOWVA_EDITOR_READY' }, CONFIG.MARKETPLACE_ORIGIN);
})();

})();