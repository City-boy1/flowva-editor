/* =====================================================================
   FlowvaEditor — mobile.js        (load AFTER editor.js)
   Adds the phone/tablet behaviour that CSS alone cannot do:
     1. bottom-nav + slide-up sheets (open / close / swipe down)
     2. moves rarely-used top-bar controls into a ⋯ menu on small screens
     3. two-finger pinch-zoom + pan on the canvas
     4. bigger touch handles on selected objects
   It only talks to editor.js through window.FlowvaEditor.
   ===================================================================== */
(() => {
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;
const icons = () => window.lucide && lucide.createIcons();
const FE = () => window.FlowvaEditor || {};
// keep identical to the query in responsive.css
const MQ = window.matchMedia('(max-width:900px), (max-height:520px) and (pointer:coarse)');
const COARSE = window.matchMedia('(pointer:coarse)');

/* ---------------------------------------------------------------
   1. SHEETS
---------------------------------------------------------------- */
let open = null;          // 'left' | 'props' | 'tl' | null
let leftPanel = 'templates';
let fitTimer = 0;

function scheduleFit() {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => { const f = FE(); if (f.fitZoom) f.fitZoom(); }, 280);
}
function syncNav() {
  $$('#rail .rail-btn').forEach(b => {
    const on = (open === 'left'  && b.dataset.panel === leftPanel) ||
               (open === 'props' && b.dataset.sheet === 'props') ||
               (open === 'tl'    && b.dataset.sheet === 'tl');
    b.classList.toggle('on', on);
  });
}
function setSheet(name) {
  open = name;
  ['left', 'props', 'tl'].forEach(n => body.classList.toggle('sheet-' + n, n === name));
  body.classList.toggle('sheet-open', !!name);
  syncNav(); scheduleFit();
}

// grab-bar + close button on every sheet
function addBar(el) {
  if (!el) return;
  const bar = document.createElement('div');
  bar.className = 'sheet-bar';
  bar.innerHTML = '<span class="sheet-grip"></span><button class="sheet-close" aria-label="Close panel"><i data-lucide="x"></i></button>';
  el.insertBefore(bar, el.firstChild);
  bar.querySelector('.sheet-close').onclick = () => setSheet(null);
  // swipe down to close
  let y0 = null;
  bar.addEventListener('pointerdown', e => { if (e.target.closest('.sheet-close')) return; y0 = e.clientY; bar.setPointerCapture(e.pointerId); });
  bar.addEventListener('pointermove', e => { if (y0 != null && e.clientY - y0 > 60) { y0 = null; setSheet(null); } });
  ['pointerup', 'pointercancel'].forEach(ev => bar.addEventListener(ev, () => { y0 = null; }));
}
['#flyout', '#props', '#timeline'].forEach(s => addBar($(s)));

// two extra nav buttons: Edit (properties/layers) and Timeline
const rail = $('#rail');
function navBtn(sheet, icon, label) {
  const b = document.createElement('button');
  b.className = 'rail-btn'; b.dataset.sheet = sheet;
  b.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
  rail.appendChild(b); return b;
}
const btnEdit = navBtn('props', 'sliders-horizontal', 'Edit');
navBtn('tl', 'film', 'Timeline');

rail.addEventListener('click', e => {
  if (!MQ.matches) return;
  const b = e.target.closest('.rail-btn'); if (!b) return;
  if (b.dataset.panel) {                       // Templates / Elements / Text / Uploads / Brand
    // editor.js has already switched the panel by the time we get here
    if (open === 'left' && leftPanel === b.dataset.panel) setSheet(null);
    else { leftPanel = b.dataset.panel; setSheet('left'); }
  } else if (b.dataset.sheet) {
    setSheet(open === b.dataset.sheet ? null : b.dataset.sheet);
  }
});

// after adding something from a panel, get out of the way so the user sees it
$('#flyout').addEventListener('click', e => {
  if (!MQ.matches || open !== 'left') return;
  if (e.target.closest('.tile, .tpl, .text-add')) setTimeout(() => setSheet(null), 120);
});

/* ---------------------------------------------------------------
   2. TOP BAR: the ⋯ menu
---------------------------------------------------------------- */
const moreBtn = document.createElement('button');
moreBtn.id = 'moreBtn'; moreBtn.className = 'icon-btn'; moreBtn.title = 'More'; moreBtn.setAttribute('aria-label', 'More');
moreBtn.innerHTML = '<i data-lucide="menu"></i>';
$('#topbar').insertBefore(moreBtn, $('#topbar .dropdown'));

const more = document.createElement('div');
more.id = 'moreMenu';
more.innerHTML = '<div id="mmName"></div><div id="mmSize"></div><div class="mm-zoom" id="mmZoom"></div><div class="mm-files" id="mmFiles"></div>';
document.body.appendChild(more);

// [element, target container, optional label]; each element remembers its original spot
const moves = [
  ['#projectName', '#mmName'], ['#sizeSelect', '#mmSize'],
  ['#btnZoomOut', '#mmZoom'], ['#zoomLabel', '#mmZoom'], ['#btnZoomIn', '#mmZoom'], ['#btnFit', '#mmZoom'],
  ['#btnNew', '#mmFiles', 'New design'], ['#btnOpenProject', '#mmFiles', 'Open project'],
].map(([sel, target, label]) => {
  const el = $(sel), ph = document.createComment(sel);
  el.parentNode.insertBefore(ph, el);
  if (label) el.dataset.label = label;
  return { el, ph, target };
});
function layout() {
  moves.forEach(({ el, ph, target }) => {
    if (MQ.matches) $(target).appendChild(el);
    else ph.parentNode.insertBefore(el, ph.nextSibling);
  });
}
moreBtn.onclick = e => { e.stopPropagation(); $('#exportMenu').classList.remove('open'); more.classList.toggle('open'); };
document.addEventListener('click', e => { if (!e.target.closest('#moreMenu, #moreBtn')) more.classList.remove('open'); });
more.addEventListener('click', e => { if (e.target.closest('.mm-files button')) more.classList.remove('open'); });
$('#sizeSelect').addEventListener('change', () => more.classList.remove('open'));
$('#exportBtn').addEventListener('click', () => more.classList.remove('open'));

function onBreakpoint() {
  layout();
  if (!MQ.matches) { setSheet(null); more.classList.remove('open'); }
  scheduleFit();
}
MQ.addEventListener ? MQ.addEventListener('change', onBreakpoint) : MQ.addListener(onBreakpoint);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (open || more.classList.contains('open'))) { setSheet(null); more.classList.remove('open'); }
});

/* ---------------------------------------------------------------
   3. PINCH-ZOOM + TWO-FINGER PAN on the canvas
---------------------------------------------------------------- */
const sc = $('#stageScroll'), stage = $('#stage');
let pz = null;
const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
const mid  = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

sc.addEventListener('touchstart', e => {
  if (e.touches.length !== 2) return;
  const f = FE(); if (!f.setZoom || !f.getZoom) return;
  e.preventDefault(); e.stopPropagation();
  // cancel whatever finger #1 started on the canvas (drag / selection box)
  try { const c = f.canvas; c._currentTransform = null; c._groupSelector = null; c.renderTop && c.renderTop(); } catch {}
  const [a, b] = e.touches;
  pz = { d: dist(a, b), z: f.getZoom(), m: mid(a, b) };
}, { capture: true, passive: false });

sc.addEventListener('touchmove', e => {
  if (!pz || e.touches.length < 2) return;
  e.preventDefault(); e.stopPropagation();
  const f = FE(), [a, b] = e.touches, m = mid(a, b);
  const oldZ = f.getZoom(), r = stage.getBoundingClientRect();
  const cx = (pz.m.x - r.left) / oldZ, cy = (pz.m.y - r.top) / oldZ;   // canvas point under the fingers
  f.setZoom(pz.z * dist(a, b) / pz.d);
  const nz = f.getZoom(), r2 = stage.getBoundingClientRect();
  sc.scrollLeft += (r2.left + cx * nz) - m.x;                           // keep that point under the fingers (= pan)
  sc.scrollTop  += (r2.top  + cy * nz) - m.y;
  pz.m = m;
}, { capture: true, passive: false });

['touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, e => { if (e.touches.length < 2) pz = null; }));

/* ---------------------------------------------------------------
   4. Hook into the Fabric canvas once editor.js has finished starting
---------------------------------------------------------------- */
function bindCanvas(c) {
  const mark = () => btnEdit.classList.toggle('has-sel', !!c.getActiveObject());
  ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => c.on(ev, mark));

  // bigger, easier-to-hit handles on touch screens (sizes are in canvas pixels, so divide by zoom)
  c.on('after:render', () => {
    if (!COARSE.matches) return;
    const z = (parseFloat(stage.style.width) / c.getWidth()) || 1;
    fabric.Object.prototype.touchCornerSize = Math.min(120, 44 / z);
    fabric.Object.prototype.cornerSize      = Math.min(70, Math.max(14, 20 / z));
  });
}
const wait = setInterval(() => { if (FE().canvas) { clearInterval(wait); bindCanvas(FE().canvas); } }, 100);
setTimeout(() => clearInterval(wait), 15000);

/* ---------------------------------------------------------------
   start
---------------------------------------------------------------- */
layout(); icons(); syncNav(); scheduleFit();
if (!window.FlowvaEditor) console.info('[mobile.js] waiting for FlowvaEditor… (pinch-zoom needs the editor.js edits in the handoff)');
})();