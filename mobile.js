/* =====================================================================
   FlowvaEditor — mobile.js        (load AFTER editor.js)
   Adds phone/tablet behaviour:
     1. bottom-nav + slide-up sheets (open / close / swipe down)
     2. moves secondary top-bar controls into a ⋯ menu on small screens while
        keeping Open project visible as a persistent import shortcut
     3. two-finger pinch-zoom + pan on the canvas
     4. bigger touch handles on selected objects
   It only talks to editor.js through window.FlowvaEditor.
   ===================================================================== */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const icons = () => window.lucide && lucide.createIcons();
  const FE = () => window.FlowvaEditor || {};
  // Keep identical to the query in responsive.css.
  const MQ = window.matchMedia('(max-width:900px), (max-height:520px) and (pointer:coarse)');
  const COARSE = window.matchMedia('(pointer:coarse)');
  // Keep undo/redo in the header on tablet-sized mobile layouts.
  const COMPACT_HEADER = window.matchMedia('(max-width:560px)');

  /* 1. Bottom navigation and sheets. */
  let open = null;
  let leftPanel = 'templates';
  let fitTimer = 0;
  let fitFrame = 0;
  let viewportObserver = null;

  function scheduleFit() {
    clearTimeout(fitTimer);
    cancelAnimationFrame(fitFrame);
    fitTimer = setTimeout(() => {
      fitFrame = requestAnimationFrame(() => {
        const f = FE();
        if (f.fitZoom) f.fitZoom();
      });
    }, 120);
  }

  function syncNav() {
    $$('#rail .rail-btn').forEach(b => {
      const on = (open === 'left' && b.dataset.panel === leftPanel) ||
        (open === 'props' && b.dataset.sheet === 'props') ||
        (open === 'tl' && b.dataset.sheet === 'tl');
      b.classList.toggle('on', on);
    });
  }

  function setSheet(name) {
    open = name;
    ['left', 'props', 'tl'].forEach(n => body.classList.toggle('sheet-' + n, n === name));
    body.classList.toggle('sheet-open', !!name);
    syncNav();
    scheduleFit();
  }

  function addBar(el) {
    if (!el || el.querySelector(':scope > .sheet-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'sheet-bar';
    bar.innerHTML = '<span class="sheet-grip"></span><button class="sheet-close" aria-label="Close panel"><i data-lucide="x"></i></button>';
    el.insertBefore(bar, el.firstChild);
    bar.querySelector('.sheet-close').onclick = () => setSheet(null);
    let y0 = null;
    bar.addEventListener('pointerdown', e => {
      if (e.target.closest('.sheet-close')) return;
      y0 = e.clientY;
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener('pointermove', e => {
      if (y0 !== null && e.clientY - y0 > 60) {
        y0 = null;
        setSheet(null);
      }
    });
    ['pointerup', 'pointercancel'].forEach(ev => bar.addEventListener(ev, () => { y0 = null; }));
  }

  ['#flyout', '#props', '#timeline'].forEach(s => addBar($(s)));

  const rail = $('#rail');
  function navBtn(sheet, icon, label) {
    const b = document.createElement('button');
    b.className = 'rail-btn';
    b.dataset.sheet = sheet;
    b.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`;
    rail.appendChild(b);
    return b;
  }
  const btnEdit = navBtn('props', 'sliders-horizontal', 'Edit');
  const btnTimeline = navBtn('tl', 'film', 'Timeline');
  function syncTimelineNav() {
    const enabled = body.classList.contains('timeline-enabled');
    btnTimeline.hidden = !enabled;
    if (!enabled && open === 'tl') setSheet(null);
  }
  syncTimelineNav();
  const timelineClassObserver = new MutationObserver(syncTimelineNav);
  timelineClassObserver.observe(body, { attributes: true, attributeFilter: ['class'] });

  rail.addEventListener('click', e => {
    if (!MQ.matches) return;
    const b = e.target.closest('.rail-btn');
    if (!b) return;
    if (b.dataset.panel) {
      if (open === 'left' && leftPanel === b.dataset.panel) setSheet(null);
      else {
        leftPanel = b.dataset.panel;
        setSheet('left');
      }
    } else if (b.dataset.sheet) {
      setSheet(open === b.dataset.sheet ? null : b.dataset.sheet);
    }
  });

  $('#flyout')?.addEventListener('click', e => {
    if (!MQ.matches || open !== 'left') return;
    if (e.target.closest('.tile, .tpl, .text-add')) setTimeout(() => setSheet(null), 120);
  });

  /* 2. Compact top bar and overflow menu. */
  const topbar = $('#topbar');
  const moreBtn = document.createElement('button');
  moreBtn.id = 'moreBtn';
  moreBtn.className = 'icon-btn';
  moreBtn.title = 'More';
  moreBtn.setAttribute('aria-label', 'More');
  moreBtn.innerHTML = '<i data-lucide="menu"></i>';
  topbar.insertBefore(moreBtn, $('.dropdown', topbar));

  const more = document.createElement('div');
  more.id = 'moreMenu';
  more.innerHTML = '<div id="mmName"></div><div id="mmSize"></div><div class="mm-zoom" id="mmZoom"></div><div class="mm-files" id="mmFiles"></div>';
  document.body.appendChild(more);

  // Each moved element has a comment placeholder so desktop order is restored exactly.
  const moves = [
    ['#projectName', '#mmName'], ['#sizeSelect', '#mmSize'],
    ['#btnZoomOut', '#mmZoom'], ['#zoomLabel', '#mmZoom'], ['#btnZoomIn', '#mmZoom'], ['#btnFit', '#mmZoom'],
    ['#btnUndo', '#mmFiles', 'Undo'], ['#btnRedo', '#mmFiles', 'Redo'],
    ['#btnNew', '#mmFiles', 'New design'],
    ['#btnDownloadProject', '#mmFiles', 'Download project']
  ].map(([sel, target, label]) => {
    const el = $(sel);
    if (!el || !el.parentNode) return null;
    const ph = document.createComment(sel);
    el.parentNode.insertBefore(ph, el);
    if (label) el.dataset.label = label;
    return { el, ph, target };
  }).filter(Boolean);

  function layout() {
    moves.forEach(({ el, ph, target }) => {
      const destination = $(target);
      if (!destination) return;
      const isHistoryAction = el.id === 'btnUndo' || el.id === 'btnRedo';
      const moveToMore = MQ.matches && (!isHistoryAction || COMPACT_HEADER.matches);
      if (moveToMore) destination.appendChild(el);
      else if (ph.parentNode) ph.parentNode.insertBefore(el, ph.nextSibling);
    });
  }

  moreBtn.onclick = e => {
    e.stopPropagation();
    $('#exportMenu')?.classList.remove('open');
    more.classList.toggle('open');
  };
  document.addEventListener('click', e => {
    if (!e.target.closest('#moreMenu, #moreBtn')) more.classList.remove('open');
  });
  more.addEventListener('click', e => {
    if (e.target.closest('.mm-files button')) more.classList.remove('open');
  });
  $('#sizeSelect')?.addEventListener('change', () => more.classList.remove('open'));
  $('#exportBtn')?.addEventListener('click', () => more.classList.remove('open'));

  function onBreakpoint() {
    syncTimelineNav();
    layout();
    if (!MQ.matches) {
      setSheet(null);
      more.classList.remove('open');
    }
    icons();
    scheduleFit();
  }
  MQ.addEventListener ? MQ.addEventListener('change', onBreakpoint) : MQ.addListener(onBreakpoint);
  // MQ remains true from phone through tablet; this second breakpoint moves
  // undo/redo back into the top bar when there is enough horizontal room.
  COMPACT_HEADER.addEventListener ? COMPACT_HEADER.addEventListener('change', onBreakpoint) : COMPACT_HEADER.addListener(onBreakpoint);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && (open || more.classList.contains('open'))) {
      setSheet(null);
      more.classList.remove('open');
    }
  });

  /* 3. Pinch zoom and two-finger pan. */
  const sc = $('#stageScroll');
  const stage = $('#stage');
  let pz = null;
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const mid = (a, b) => ({ x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 });

  sc.addEventListener('touchstart', e => {
    if (e.touches.length !== 2) return;
    const f = FE();
    if (!f.setZoom || !f.getZoom) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      const c = f.canvas;
      c._currentTransform = null;
      c._groupSelector = null;
      c.renderTop && c.renderTop();
    } catch { /* Fabric internals vary by version. */ }
    const [a, b] = e.touches;
    pz = { d: dist(a, b), z: f.getZoom(), m: mid(a, b) };
  }, { capture: true, passive: false });

  sc.addEventListener('touchmove', e => {
    if (!pz || e.touches.length < 2) return;
    e.preventDefault();
    e.stopPropagation();
    const f = FE();
    const [a, b] = e.touches;
    const m = mid(a, b);
    const oldZ = f.getZoom();
    const r = stage.getBoundingClientRect();
    const cx = (pz.m.x - r.left) / oldZ;
    const cy = (pz.m.y - r.top) / oldZ;
    f.setZoom(pz.z * dist(a, b) / pz.d);
    const nz = f.getZoom();
    const r2 = stage.getBoundingClientRect();
    sc.scrollLeft += (r2.left + cx * nz) - m.x;
    sc.scrollTop += (r2.top + cy * nz) - m.y;
    pz.m = m;
  }, { capture: true, passive: false });

  ['touchend', 'touchcancel'].forEach(ev => window.addEventListener(ev, e => {
    if (e.touches.length < 2) pz = null;
  }));

  /* 4. Refit whenever the actual canvas viewport changes size. */
  function bindCanvas(c) {
    const mark = () => btnEdit.classList.toggle('has-sel', !!c.getActiveObject());
    ['selection:created', 'selection:updated', 'selection:cleared'].forEach(ev => c.on(ev, mark));
    c.on('after:render', () => {
      if (!COARSE.matches) return;
      const z = (parseFloat(stage.style.width) / c.getWidth()) || 1;
      fabric.Object.prototype.touchCornerSize = Math.min(120, 44 / z);
      fabric.Object.prototype.cornerSize = Math.min(70, Math.max(14, 20 / z));
    });

    // CSS sheets, browser chrome and orientation changes can resize the workspace
    // without a useful window.resize event. Observe the real scroll viewport.
    if ('ResizeObserver' in window) {
      viewportObserver = new ResizeObserver(() => scheduleFit());
      viewportObserver.observe(sc);
      viewportObserver.observe($('#workspace'));
    }
  }

  const wait = setInterval(() => {
    if (FE().canvas) {
      clearInterval(wait);
      bindCanvas(FE().canvas);
      layout();
      icons();
      scheduleFit();
    }
  }, 100);
  setTimeout(() => clearInterval(wait), 15000);

  // Mobile browser chrome / safe-area changes are exposed by VisualViewport.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', scheduleFit, { passive: true });
  }
  window.addEventListener('orientationchange', () => setTimeout(scheduleFit, 180), { passive: true });

  /* Start. */
  layout();
  icons();
  syncNav();
  scheduleFit();
  if (!window.FlowvaEditor) console.info('[mobile.js] waiting for FlowvaEditor…');
})();
