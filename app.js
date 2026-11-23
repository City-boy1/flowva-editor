/* FlowvaEditor workspace shell. Marketplace discovery, checkout and publishing belong to FlowvaMarket. */
(function () {
  'use strict';
  const CFG = window.FLOWVA_CONFIG || {};
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let projects = [], assets = [], objectUrls = [];

  const toast = (message, type = 'info') => { const n = $('#toast'); if (n.classList.contains('toast-error') && n.classList.contains('show') && type !== 'error') return; n.querySelector('.toast-message').textContent = message; n.classList.remove('toast-error','toast-success','toast-info'); n.classList.add(type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : 'toast-info','show'); n.hidden = false; clearTimeout(toast.timer); if (type !== 'error') toast.timer = setTimeout(() => { n.classList.remove('show'); n.hidden = true; }, 3500); };
  $('#toast .toast-close')?.addEventListener('click', () => { const n = $('#toast'); n.classList.remove('show'); n.hidden = true; clearTimeout(toast.timer); });
  const escapeHTML = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = value => { if (!value || typeof value !== 'string') return ''; if (/^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value; try { const u = new URL(value, location.href); return ['https:', 'http:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } };
  const formatDate = v => { if (!v) return 'Not saved yet'; const d = new Date(v); return Number.isNaN(d.getTime()) ? 'Recently' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); };
  const formatSize = b => { if (!b) return '0 B'; const u = ['B', 'KB', 'MB', 'GB'], i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), 3); return `${(b / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`; };
  const refreshIcons = () => window.lucide?.createIcons?.({ attrs: { 'stroke-width': 1.8 } });
  const clearObjectUrls = () => { objectUrls.forEach(URL.revokeObjectURL); objectUrls = []; };
  const arr = v => Array.isArray(v) ? v : (v && Array.isArray(v.items) ? v.items : []);

  function openEditor(project, options = {}) {
    const url = new URL(CFG.EDITOR_PATH || 'editor.html', location.href);
    if (project?.id) url.searchParams.set('project_id', project.id);
    if (project?.title) url.searchParams.set('project_name', project.title);
    if (options.fresh) url.searchParams.set('fresh', '1');
    if (options.assetId) url.searchParams.set('asset_id', options.assetId);
    location.href = url.toString();
  }
  function setConnection(label, note, state = 'warn') {
    $('#modeIndicator').innerHTML = `<span class="dot-${state}"></span><span>${escapeHTML(label)}</span>`;
    $('#connectionLabel').textContent = note;
    $('#connectionDot').className = `connection-dot ${state}`;
  }
  function setBanner(message) { const b = $('#statusBanner'); b.hidden = !message; b.textContent = message || ''; }
  function emptyState(icon, title, description, buttonText, action) {
    return `<div class="empty-state"><span class="empty-icon"><i data-lucide="${icon}"></i></span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${buttonText ? `<button class="button button-primary" data-action="${action}"><i data-lucide="${action === 'import' ? 'upload' : 'plus'}"></i>${escapeHTML(buttonText)}</button>` : ''}</div>`;
  }
  function projectCard(p) {
    const thumb = safeUrl(p.thumbnail);
    const preview = thumb ? `<img src="${escapeHTML(thumb)}" alt="Preview of ${escapeHTML(p.title)}" loading="lazy">` : '<div class="preview-placeholder"><i data-lucide="file-image"></i></div>';
    return `<article class="project-card"><div class="project-preview">${preview}</div><div class="project-info"><div class="project-info-top"><div><b title="${escapeHTML(p.title)}">${escapeHTML(p.title || 'Untitled design')}</b><small>Saved editor project</small></div><button class="icon-button" data-open="${escapeHTML(p.id)}" aria-label="Open project ${escapeHTML(p.title)}" title="Open project"><i data-lucide="arrow-up-right"></i></button></div><div class="project-actions"><span class="project-date">Updated ${formatDate(p.updatedAt)}</span><button class="icon-button" data-delete-project="${escapeHTML(p.id)}" aria-label="Delete project" title="Delete project"><i data-lucide="trash-2"></i></button></div></div></article>`;
  }
  function renderProjects() {
    const recent = projects.slice().sort((a,b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)).slice(0,3);
    $('#recentProjects').innerHTML = recent.length ? recent.map(projectCard).join('') : emptyState('file-plus-2','Your first project starts here','Create a design or open a supported file. Your saved work will appear here automatically.',null,null);
    let items = projects.slice(); const q = ($('#projectSearch')?.value || '').trim().toLowerCase();
    if (q) items = items.filter(p => (p.title || '').toLowerCase().includes(q));
    const sort = $('#projectSort')?.value || 'updated';
    items.sort((a,b) => sort === 'name' ? String(a.title).localeCompare(String(b.title)) : new Date((sort === 'created' ? a.createdAt : a.updatedAt) || 0) - new Date((sort === 'created' ? b.createdAt : b.updatedAt) || 0));
    if (sort !== 'name') items.reverse();
    $('#allProjects').innerHTML = items.length ? items.map(projectCard).join('') : emptyState('files','No projects yet',q ? 'Try another search term.' : 'When you create or save a design, it will appear here automatically. Use New design at the top to get started.',null,null);
    $('#projectCount').textContent = projects.length; $('#statProjects').textContent = projects.length;
    refreshIcons();
  }
  async function renderAssets() {
    clearObjectUrls();
    const q = ($('#assetSearch')?.value || '').trim().toLowerCase(), visible = assets.filter(a => a.name.toLowerCase().includes(q));
    $('#librarySummary').textContent = `${assets.length} ${assets.length === 1 ? 'asset' : 'assets'} stored in this browser.`;
    if (!visible.length) { $('#assetGrid').innerHTML = emptyState('folder-open', q ? 'No matching assets' : 'Your asset library is empty', 'Add images, videos or audio to keep them handy for your projects.', q ? null : 'Add assets', q ? null : 'import'); refreshIcons(); return; }
    const cards = [];
    for (const asset of visible.slice(0, 40)) {
      let media = ''; const mime = asset.type || '';
      if (mime.startsWith('image/')) { try { const full = await FlowvaProjectEngine.getAsset(asset.id); if (full?.blob) { const url = URL.createObjectURL(full.blob); objectUrls.push(url); media = `<img src="${url}" alt="${escapeHTML(asset.name)}" loading="lazy" decoding="async">`; } } catch {} }
      if (!media) { const icon = mime.startsWith('video/') ? 'film' : mime.startsWith('audio/') ? 'audio-lines' : mime.includes('pdf') ? 'file-text' : 'file'; media = `<i data-lucide="${icon}"></i>`; }
      const canUse = mime.startsWith('image/') || mime.startsWith('video/') || mime.startsWith('audio/') || /\.(json|lottie)$/i.test(asset.name || '');
      cards.push(`<article class="asset-card"><div class="asset-preview">${media}</div><div class="asset-meta"><b title="${escapeHTML(asset.name)}">${escapeHTML(asset.name)}</b><small>${formatSize(asset.size)} · ${escapeHTML(mime.split('/')[0] || 'File')}</small><div class="asset-actions">${canUse ? `<button class="text-button" data-use-asset="${escapeHTML(asset.id)}">Use in editor</button>` : ''}<button class="text-button" data-delete-asset="${escapeHTML(asset.id)}">Remove</button></div></div></article>`);
    }
    $('#assetGrid').innerHTML = cards.join('') + (visible.length > 40 ? `<p class="asset-limit-note">Showing the first 40 assets. Search by name to find others.</p>` : ''); refreshIcons();
  }
  async function load() {
    setBanner('');
    try { assets = await FlowvaProjectEngine.listAssets(); } catch (e) { assets = []; toast('Browser asset storage is unavailable: ' + e.message, 'error'); }
    if (CFG.BACKEND_ENABLED && window.FlowvaAPI?.projects?.list) {
      try { const result = await FlowvaAPI.projects.list(); projects = arr(result?.data); setConnection('Connected','Workspace projects connected','ok'); }
      catch (error) { projects = []; setConnection('Local mode','Account projects are unavailable','warn'); setBanner(`Could not load account projects: ${error.message}`); }
    } else {
      try { projects = await FlowvaProjectEngine.listProjects(); setConnection('Local mode','Projects and assets stay in this browser','warn'); }
      catch (error) { projects = []; setConnection('Storage unavailable','Check browser storage','warn'); setBanner(`Local projects could not be loaded: ${error.message}`); }
    }
    $('#statAssets').textContent = assets.length;
    renderProjects(); await renderAssets();
    let bytes = 0; try { bytes = await FlowvaProjectEngine.totalAssetBytes(); } catch {}
    let used = 0, quota = 0; try { const estimate = await navigator.storage?.estimate?.(); used = estimate?.usage || 0; quota = estimate?.quota || 0; } catch {}
    const storageRatio = quota ? used / quota : 0;
    $('#storageSummary').textContent = `${formatSize(bytes)} in assets · ${formatSize(used)} browser storage used${quota ? ` of about ${formatSize(quota)}` : ''}${storageRatio >= 0.85 ? ' · Storage is running low — download project backups.' : '. Limits vary by device.'}`;
    $('.storage-track span').style.width = quota ? Math.min(100, storageRatio * 100) + '%' : '0%';
    refreshIcons();
  }
  function showView(name) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
    $$('.nav-link').forEach(l => l.classList.toggle('active', l.dataset.view === name));
    const headings = { home:['WORKSPACE / OVERVIEW','Your creative space'], projects:['WORKSPACE / PROJECTS','Your projects'], library:['WORKSPACE / ASSETS','Asset library'] };
    const heading = headings[name] || headings.home;
    $('#breadcrumb').textContent = heading[0]; $('#pageTitle').textContent = heading[1];
    if (name === 'library') renderAssets(); $('#sidebar').classList.remove('open');
  }
  const showCreateModal = () => { const m = $('#createModal'); m.classList.add('open'); m.setAttribute('aria-hidden','false'); $('#newProjectName').focus(); $('#newProjectName').select(); };
  const closeCreateModal = () => { $('#createModal').classList.remove('open'); $('#createModal').setAttribute('aria-hidden','true'); };
  async function createProject(e) {
    e.preventDefault(); const title = $('#newProjectName').value.trim(); if (!title) return;
    if (!CFG.BACKEND_ENABLED) { closeCreateModal(); return openEditor({ title }, { fresh: true }); }
    try { const r = await FlowvaAPI.projects.create({ title }); closeCreateModal(); openEditor(r.data); } catch (error) { toast(error.message, 'error'); }
  }
  async function importAssets(files) {
    if (!files?.length) return; let imported = 0; const failed = [];
    for (const file of files) { try { await FlowvaProjectEngine.addAsset(file); imported++; } catch (error) { failed.push(`${file.name}: ${error.message}`); } }
    await load(); if (imported) toast(`${imported} file${imported === 1 ? '' : 's'} added to your private asset library.`, 'success'); if (failed.length) toast(failed[0], 'error');
  }
  async function deleteProject(id) {
    const project = projects.find(x => x.id === id); if (!project || !confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    try { if (CFG.BACKEND_ENABLED && window.FlowvaAPI?.projects?.remove) await FlowvaAPI.projects.remove(id); else await FlowvaProjectEngine.deleteProject(id); await load(); toast('Project deleted.', 'success'); } catch (error) { toast(error.message, 'error'); }
  }
  async function deleteAsset(id) {
    const asset = assets.find(x => x.id === id); if (!asset || !confirm(`Remove "${asset.name}" from your asset library?`)) return;
    try { await FlowvaProjectEngine.deleteAsset(id); await load(); toast('Asset removed.', 'success'); } catch (error) { toast(error.message, 'error'); }
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const nav = t.closest('[data-view]'); if (nav) showView(nav.dataset.view);
    const go = t.closest('[data-goto]'); if (go) showView(go.dataset.goto);
    const action = t.closest('[data-action]'); if (action) {
      if (action.dataset.action === 'create') showCreateModal();
      if (action.dataset.action === 'import') $('#projectImport').click();
      if (action.dataset.action === 'open-editor') openEditor(null, { fresh: true });
    }
    if (t.closest('#newBtn')) showCreateModal();
    if (t.closest('#importBtn')) openEditor(null, { fresh: true });
    if (t.closest('#libraryImport')) $('#projectImport').click();
    if (t.closest('#menuBtn')) $('#sidebar').classList.toggle('open');
    const open = t.closest('[data-open]'); if (open) { const p = projects.find(x => x.id === open.dataset.open); if (p) openEditor(p); }
    const dp = t.closest('[data-delete-project]'); if (dp) deleteProject(dp.dataset.deleteProject);
    const useAsset = t.closest('[data-use-asset]'); if (useAsset) openEditor(null, { fresh: true, assetId: useAsset.dataset.useAsset });
    const da = t.closest('[data-delete-asset]'); if (da) deleteAsset(da.dataset.deleteAsset);
  });
  $('#createForm').addEventListener('submit', createProject);
  $('#closeCreateModal').addEventListener('click', closeCreateModal); $('#cancelCreate').addEventListener('click', closeCreateModal);
  $('#createModal').addEventListener('click', e => { if (e.target.id === 'createModal') closeCreateModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCreateModal(); });
  $('#projectImport').addEventListener('change', async e => { await importAssets([...e.target.files]); e.target.value = ''; });
  $('#projectSearch').addEventListener('input', renderProjects); $('#projectSort').addEventListener('change', renderProjects); $('#assetSearch').addEventListener('input', renderAssets);
  $('#appVersion').textContent = 'v' + (CFG.APP_VERSION || '');
  refreshIcons(); load();
})();
