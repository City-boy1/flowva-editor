/* FlowvaEditor workspace shell. Marketplace discovery, checkout and publishing belong to FlowvaMarket. */
(function () {
  'use strict';
  const CFG = window.FLOWVA_CONFIG || {};
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let projects = [], assets = [], objectUrls = [], marketplaceTemplates = [], purchasedTemplates = [];
  let myTemplateTab = 'discover', purchaseLoadState = 'idle', pendingPreset = null;
  const WORKSPACES = window.FLOWVA_WORKSPACES;
  if (!WORKSPACES) throw new Error('Flowva workspace registry failed to load.');
  const CREATE_CATEGORIES = WORKSPACES.categories;
  const CREATE_PRESETS = WORKSPACES.presets;
  let selectedCreateCategory = 'graphic-design';
  const frequentPresetKey = 'flowva.editor.frequent-presets.v1';
  function readFrequentPresets() {
    try { const data = JSON.parse(localStorage.getItem(frequentPresetKey) || '{}'); return data && typeof data === 'object' ? data : {}; }
    catch { return {}; }
  }
  function recordPresetUse(presetId) {
    if (!presetId || !CREATE_PRESETS[presetId]) return;
    const data = readFrequentPresets(); data[presetId] = (Number(data[presetId]) || 0) + 1;
    try { localStorage.setItem(frequentPresetKey, JSON.stringify(data)); } catch {}
    renderFrequentPresets();
  }
  function renderWorkspaceCards() {
    const host = $('#creationCategoryRow');
    if (!host) return;
    host.innerHTML = CREATE_CATEGORIES.map((workspace, index) => `<button class="workspace-card ${workspace.cardClass}" type="button" data-workspace-card="${workspace.id}"${workspace.cardAriaLabel ? ` aria-label="${escapeHTML(workspace.cardAriaLabel)}"` : ''}>
      <span class="workspace-card-art"><img src="${escapeHTML(workspace.cardImage)}" alt="${escapeHTML(workspace.cardImageAlt)}" loading="${index === 0 ? 'eager' : 'lazy'}">${workspace.cardBadge ? `<span class="workspace-coming-badge">${escapeHTML(workspace.cardBadge)}</span>` : ''}<span class="workspace-card-copy"><b>${escapeHTML(workspace.label)}</b><small>${escapeHTML(workspace.cardDescription)}</small><span class="workspace-card-link">${escapeHTML(workspace.cardCta)} <i data-lucide="arrow-up-right"></i></span></span></span></button>`).join('');
    refreshIcons();
  }

  function renderFrequentPresets() {
    const host = $('#frequentCreateGrid'); if (!host) return;
    const counts = readFrequentPresets();
    const ranked = Object.entries(counts).filter(([id, count]) => CREATE_PRESETS[id] && Number(count) > 0)
      .sort((a,b) => Number(b[1]) - Number(a[1])).slice(0,4);
    host.innerHTML = ranked.map(([id]) => {
      const item = CREATE_PRESETS[id];
      const category = CREATE_CATEGORIES.find(c => c.id === item.category);
      return `<button type="button" class="frequent-create-card" data-create-preset="${id}"><span class="frequent-create-icon ${item.category}"><i data-lucide="${item.category === 'video' ? 'film' : item.category === 'documents' ? 'file-text' : item.category === 'social' ? 'instagram' : item.category === 'branding' ? 'shapes' : 'palette'}"></i></span><span><b>${escapeHTML(item.label)}</b><small>${escapeHTML(category?.label || 'Create again')}</small></span><i class="frequent-create-arrow" data-lucide="arrow-up-right"></i></button>`;
    }).join('');
    const section = $('#frequentCreateSection'); if (section) section.hidden = ranked.length === 0;
    refreshIcons();
  }

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
    if (options.preset) url.searchParams.set('preset', options.preset);
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
    const recentBlock = $('.recent-block');
    if (recentBlock) recentBlock.hidden = recent.length === 0;
    $('#recentProjects').innerHTML = recent.map(projectCard).join('');
    let items = projects.slice(); const q = ($('#projectSearch')?.value || '').trim().toLowerCase();
    if (q) items = items.filter(p => (p.title || '').toLowerCase().includes(q));
    const sort = $('#projectSort')?.value || 'updated';
    items.sort((a,b) => sort === 'name' ? String(a.title).localeCompare(String(b.title)) : new Date((sort === 'created' ? a.createdAt : a.updatedAt) || 0) - new Date((sort === 'created' ? b.createdAt : b.updatedAt) || 0));
    if (sort !== 'name') items.reverse();
    $('#allProjects').innerHTML = items.length ? items.map(projectCard).join('') : emptyState('files','No projects yet',q ? 'Try another search term.' : 'When you create or save a design, it will appear here automatically. Use New design at the top to get started.',null,null);
    $('#projectCount').textContent = projects.length; if ($('#statProjects')) $('#statProjects').textContent = projects.length;
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
  function marketplaceTemplateUrl(template) {
    const raw = template?.productUrl || template?.marketplaceUrl || template?.url || template?.href;
    if (!raw) return '';
    try {
      const target = new URL(raw, CFG.MARKETPLACE_ORIGIN || 'https://flowvamarket.com');
      const market = new URL(CFG.MARKETPLACE_ORIGIN || 'https://flowvamarket.com');
      return target.protocol === 'https:' && target.origin === market.origin ? target.href : '';
    } catch { return ''; }
  }
  function templateCard(template) {
    const title = template.title || template.name || 'Marketplace template';
    const description = template.description || template.shortDescription || 'View the template details on FlowvaMarket.';
    const image = safeUrl(template.previewUrl || template.thumbnailUrl || template.thumbnail || template.imageUrl || template.preview);
    const price = template.isFree || template.price === 0 || template.priceLabel === 'Free' ? 'Free' : (template.priceLabel || template.formattedPrice || (template.price != null ? String(template.price) : 'View price'));
    const url = marketplaceTemplateUrl(template);
    const id = String(template.id || template._id || '');
    const preview = image ? `<img src="${escapeHTML(image)}" alt="${escapeHTML(title)} preview" loading="lazy" decoding="async">` : '<div class="template-placeholder"><i data-lucide="image"></i><span>Template preview</span></div>';
    const action = url ? `<a class="button button-primary" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">Get template <i data-lucide="arrow-up-right"></i></a>` : `<a class="button button-secondary" href="https://flowvamarket.com" target="_blank" rel="noopener noreferrer">Visit marketplace <i data-lucide="external-link"></i></a>`;
    return `<article class="template-card" data-template-card="${escapeHTML(id)}"><div class="template-preview">${preview}</div><div class="template-info"><div class="template-card-heading"><b title="${escapeHTML(title)}">${escapeHTML(title)}</b><span class="template-price">${escapeHTML(price)}</span></div><p>${escapeHTML(description)}</p><div class="template-info-row">${action}</div></div></article>`;
  }
  function renderMarketplaceTemplates() {
    const query = ($('#templateSearch')?.value || '').trim().toLowerCase();
    const filtered = marketplaceTemplates.filter(item => `${item.title || item.name || ''} ${item.description || ''} ${item.category || ''}`.toLowerCase().includes(query));
    const empty = marketplaceTemplates.length
      ? '<div class="empty-state"><span class="empty-icon"><i data-lucide="search-x"></i></span><h3>No matching templates</h3><p>Try a different search.</p></div>'
      : '<div class="empty-state"><span class="empty-icon"><i data-lucide="store"></i></span><h3>Marketplace catalog is not connected yet</h3><p>You can still browse and purchase on FlowvaMarket. Once its public catalog endpoint is connected, approved templates will appear here automatically.</p><a class="button button-secondary" href="https://flowvamarket.com" target="_blank" rel="noopener noreferrer">Visit FlowvaMarket <i data-lucide="external-link"></i></a></div>';
    $('#templateGrid').innerHTML = filtered.length ? filtered.map(templateCard).join('') : empty;
    $('#homeTemplateGrid').innerHTML = marketplaceTemplates.slice(0, 3).map(templateCard).join('') || '<div class="home-template-empty"><span class="home-template-empty-art"><i data-lucide="layout-template"></i><i data-lucide="sparkles"></i></span><div><b>Fresh ideas are on their way</b><p>FlowvaMarket templates will appear here when its public catalogue connection is ready. You can explore and create your own designs in the meantime.</p></div></div>';
    const status = marketplaceTemplates.length ? `${marketplaceTemplates.length} marketplace template${marketplaceTemplates.length === 1 ? '' : 's'} available.` : 'Browse and create freely. FlowvaMarket templates will appear here when the catalogue endpoint is connected.';
    $('#templateStatus').textContent = status;
    $('#homeTemplateStatus').textContent = status;
    refreshIcons();
  }
  async function loadMarketplaceTemplates() {
    if (!CFG.BACKEND_ENABLED || !window.FlowvaAPI?.templates?.list) {
      renderMarketplaceTemplates();
      return;
    }
    try {
      const result = await FlowvaAPI.templates.list();
      const rows = arr(result?.data);
      marketplaceTemplates = rows.filter(item => item && typeof item === 'object');
    } catch (error) {
      marketplaceTemplates = [];
      $('#templateStatus').textContent = `Marketplace catalog is temporarily unavailable: ${error.message}`;
      $('#homeTemplateStatus').textContent = 'Marketplace catalog is temporarily unavailable.';
    }
    renderMarketplaceTemplates();
  }

  const recentTemplateKey = 'flowva.editor.marketplace.recent.v1';
  function readRecentTemplateActivity() {
    try { const value = JSON.parse(localStorage.getItem(recentTemplateKey) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function recordRecentTemplateActivity(template, activity = 'opened') {
    if (!template || typeof template !== 'object') return;
    const id = String(template.listingId || template.templateId || template.id || template._id || '');
    if (!id) return;
    const row = {
      id,
      title: String(template.title || template.name || 'Marketplace template').slice(0, 140),
      description: String(template.description || '').slice(0, 300),
      previewUrl: safeUrl(template.previewUrl || template.thumbnailUrl || template.thumbnail || template.imageUrl || ''),
      format: String(template.fileType || template.format || template.type || '').slice(0, 30),
      activity: activity === 'edited' ? 'edited' : 'opened',
      activityAt: new Date().toISOString()
    };
    const rows = [row, ...readRecentTemplateActivity().filter(item => String(item.id) !== id)].slice(0, 30);
    try { localStorage.setItem(recentTemplateKey, JSON.stringify(rows)); } catch {}
  }
  // The editor workspace can call this after a marketplace template is actually opened or edited.
  window.FlowvaTemplateHistory = Object.freeze({ record: recordRecentTemplateActivity });

  function purchaseTemplateData(purchase) {
    const item = purchase?.template || purchase?.listing || purchase?.product || purchase || {};
    const id = String(purchase?.listingId || purchase?.templateId || item.listingId || item.id || item._id || '');
    return {
      id,
      title: item.title || item.name || purchase?.templateTitle || purchase?.productName || 'Purchased template',
      description: item.description || item.shortDescription || purchase?.description || 'Your purchased marketplace template.',
      preview: safeUrl(item.previewUrl || item.thumbnailUrl || item.thumbnail || item.imageUrl || purchase?.previewUrl || ''),
      format: item.fileType || item.format || item.type || purchase?.fileType || purchase?.format || 'Format details pending',
      purchasedAt: purchase?.purchasedAt || purchase?.completedAt || purchase?.createdAt || purchase?.date || '',
      marketplaceUrl: marketplaceTemplateUrl(item) || marketplaceTemplateUrl(purchase),
      raw: purchase
    };
  }
  function ownedTemplateCard(row) {
    const preview = row.preview
      ? `<img src="${escapeHTML(row.preview)}" alt="${escapeHTML(row.title)} preview" loading="lazy" decoding="async">`
      : '<div class="template-placeholder"><i data-lucide="file-image"></i><span>Purchased template</span></div>';
    const date = row.purchasedAt ? `Purchased ${formatDate(row.purchasedAt)}` : 'Owned on FlowvaMarket';
    const marketLink = row.marketplaceUrl
      ? `<a class="text-button" href="${escapeHTML(row.marketplaceUrl)}" target="_blank" rel="noopener noreferrer">View listing <i data-lucide="arrow-up-right"></i></a>`
      : '<span class="owned-card-note">Purchase verified by FlowvaMarket</span>';
    return `<article class="template-card owned-template-card"><div class="template-preview">${preview}</div><div class="template-info"><div class="template-card-heading"><b title="${escapeHTML(row.title)}">${escapeHTML(row.title)}</b></div><p>${escapeHTML(row.description)}</p><div class="owned-card-meta"><span>${escapeHTML(String(row.format).toUpperCase())}</span><span>${escapeHTML(date)}</span></div><div class="template-info-row"><button class="button button-secondary owned-edit-pending" type="button" disabled title="Secure purchase-to-editor access is not connected yet"><i data-lucide="pencil-ruler"></i> Edit connection pending</button>${marketLink}</div></div></article>`;
  }
  function recentTemplateCard(row) {
    const preview = row.previewUrl
      ? `<img src="${escapeHTML(row.previewUrl)}" alt="${escapeHTML(row.title)} preview" loading="lazy" decoding="async">`
      : '<div class="template-placeholder"><i data-lucide="history"></i><span>Recent template</span></div>';
    const action = row.activity === 'edited' ? 'Last edited' : 'Last opened';
    return `<article class="template-card owned-template-card"><div class="template-preview">${preview}</div><div class="template-info"><div class="template-card-heading"><b title="${escapeHTML(row.title)}">${escapeHTML(row.title)}</b></div><p>${escapeHTML(row.description || 'A template you recently worked with in FLOWVA Editor.')}</p><div class="owned-card-meta"><span>${escapeHTML(row.format || 'Marketplace template')}</span><span>${action} ${formatDate(row.activityAt)}</span></div><div class="template-info-row"><span class="owned-card-note">Activity saved in this browser</span></div></div></article>`;
  }
  function renderMyTemplates() {
    const q = ($('#myTemplateSearch')?.value || '').trim().toLowerCase();
    const purchased = purchasedTemplates.map(purchaseTemplateData).filter(row => `${row.title} ${row.description} ${row.format}`.toLowerCase().includes(q));
    const recent = readRecentTemplateActivity().filter(row => `${row.title || ''} ${row.description || ''} ${row.format || ''}`.toLowerCase().includes(q));
    $('#myPurchasedGrid').hidden = myTemplateTab !== 'purchased';
    $('#myRecentGrid').hidden = myTemplateTab !== 'recent';
    $('#myPurchasedGrid').innerHTML = purchaseLoadState === 'loading' ? emptyState('loader-circle', 'Loading your purchases', 'Checking your FlowvaMarket account.', null, null) : purchased.length ? purchased.map(ownedTemplateCard).join('') : emptyState('shopping-bag', q ? 'No matching purchases' : 'Your purchased templates will appear here', q ? 'Try another search term.' : 'When you purchase a template on FlowvaMarket, it will appear in this collection after your account is connected.', null, null);
    $('#myRecentGrid').innerHTML = recent.length ? recent.map(recentTemplateCard).join('') : emptyState('history', q ? 'No matching activity' : 'Nothing here just yet', q ? 'Try another search term.' : 'Recent activity will populate once the secure marketplace-to-editor opening flow is connected. This list is separate from your purchase records.', null, null);
    const count = purchasedTemplates.length;
    $('#myTemplateCount').textContent = purchaseLoadState === 'ready' ? String(count) : '—';
    $('#myTemplatesStatus').textContent = purchaseLoadState === 'ready'
      ? `${count} purchased template${count === 1 ? '' : 's'} available from FlowvaMarket. Recently used activity is stored on this device.`
      : purchaseLoadState === 'auth'
        ? 'Sign in to FlowvaMarket to retrieve your purchases. Your templates are not stored as proof of ownership in this browser.'
        : purchaseLoadState === 'error'
          ? 'Your purchases could not be retrieved. Check your connection and try again.'
          : 'Purchase information is provided by FlowvaMarket. The marketplace account connection is not enabled yet.';
    $('#homePurchasedStatus').textContent = purchaseLoadState === 'ready'
      ? `${count} purchased template${count === 1 ? '' : 's'} in your FlowvaMarket collection.`
      : purchaseLoadState === 'loading' ? 'Checking your FlowvaMarket collection…' : 'Your marketplace purchases will appear here when account connection is enabled.';
    const homeOwnedBlock = $('.home-owned-block');
    if (homeOwnedBlock) homeOwnedBlock.hidden = purchasedTemplates.length === 0;
    $('#homePurchasedGrid').innerHTML = purchasedTemplates.length
      ? purchasedTemplates.slice(0, 3).map(purchaseTemplateData).map(ownedTemplateCard).join('')
      : '';
    const notice = $('#myTemplatesNotice');
    if (purchaseLoadState === 'auth') {
      notice.innerHTML = `<span><i data-lucide="lock-keyhole"></i> Sign in with your FlowvaMarket account to view purchased templates.</span><a class="button button-primary" href="${escapeHTML(CFG.LOGIN_URL || CFG.MARKETPLACE_ORIGIN || 'https://flowvamarket.com')}" rel="noopener">Continue to FlowvaMarket <i data-lucide="arrow-up-right"></i></a>`;
      notice.hidden = false;
    } else if (purchaseLoadState === 'disabled') {
      notice.innerHTML = '<span><i data-lucide="info"></i> Guest browsing is available. Your personal purchase library will activate when the marketplace connection is configured.</span>';
      notice.hidden = false;
    } else if (purchaseLoadState === 'error') {
      notice.innerHTML = '<span><i data-lucide="alert-circle"></i> We could not load your purchase records.</span><button class="button button-secondary" type="button" data-action="refresh-purchases">Try again</button>';
      notice.hidden = false;
    } else {
      notice.hidden = true;
      notice.textContent = '';
    }
    refreshIcons();
  }
  async function loadMyTemplates(force = false) {
    if (purchaseLoadState === 'loading' || (purchaseLoadState === 'ready' && !force)) { renderMyTemplates(); return; }
    if (!CFG.BACKEND_ENABLED || !window.FlowvaAPI?.purchases?.list) {
      purchaseLoadState = 'disabled'; purchasedTemplates = []; renderMyTemplates(); return;
    }
    purchaseLoadState = 'loading'; renderMyTemplates();
    try {
      const result = await FlowvaAPI.purchases.list();
      purchasedTemplates = arr(result?.data).filter(item => item && typeof item === 'object');
      purchaseLoadState = 'ready';
    } catch (error) {
      purchasedTemplates = [];
      purchaseLoadState = error?.status === 401 || error?.code === 'AUTH_REQUIRED' ? 'auth' : 'error';
    }
    renderMyTemplates();
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
    if ($('#statAssets')) $('#statAssets').textContent = assets.length;
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
    const headings = { home:['WORKSPACE / HOME','Your creative space'], projects:['WORKSPACE / PROJECTS','Your projects'], templates:['FLOWVAMARKET / TEMPLATES','Templates'], library:['WORKSPACE / ASSETS','Asset library'] };
    const heading = headings[name] || headings.home;
    $('#breadcrumb').textContent = heading[0]; $('#pageTitle').textContent = heading[1];
    if (name === 'library') renderAssets(); if (name === 'templates') { loadMyTemplates(); renderMarketplaceTemplates(); } $('#sidebar').classList.remove('open');
  }
  function socialBrandMark(formatId) {
    const marks = {
      'social-post': ['instagram', '<defs><linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#FEDA75"/><stop offset=".48" stop-color="#FA7E1E"/><stop offset=".76" stop-color="#D62976"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs><rect width="44" height="44" rx="12" fill="url(#igGrad)"/><rect x="10" y="10" width="24" height="24" rx="7" fill="none" stroke="white" stroke-width="3"/><circle cx="22" cy="22" r="6" fill="none" stroke="white" stroke-width="3"/><circle cx="30" cy="14" r="1.8" fill="white"/>'],
      'social-story': ['whatsapp', '<rect width="44" height="44" rx="12" fill="#25D366"/><path d="M22 9a12 12 0 0 0-10.3 18.2L10 35l7.9-1.7A12 12 0 1 0 22 9Z" fill="none" stroke="white" stroke-width="2.4" stroke-linejoin="round"/><path d="M17.2 16.5c-.6 0-1.3.7-1.3 1.8s.8 2.8 2.5 4.6 3.9 3.1 5.3 3.4 2.2-.7 2.5-1.5-.1-1.1-.7-1.4l-2.1-1c-.4-.2-.7-.1-1 .3l-.8 1c-1.4-.6-2.6-1.7-3.3-3l.8-.9c.3-.3.3-.7.1-1.1l-.9-1.9c-.2-.5-.6-.7-1.1-.7Z" fill="white"/>'],
      'facebook-cover': ['facebook', '<rect width="44" height="44" rx="12" fill="#1877F2"/><path d="M25.2 36V23.9h4.1l.6-4.7h-4.7v-3c0-1.4.4-2.3 2.4-2.3H30V9.7c-.4-.1-1.9-.2-3.6-.2-3.6 0-6.1 2.2-6.1 6.3v3.5h-4.1V24h4.1v12h4.9Z" fill="white"/>'],
      'linkedin-post': ['linkedin', '<rect width="44" height="44" rx="12" fill="#0A66C2"/><path d="M13 18h4.5v14H13V18Zm2.3-6.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2ZM20 18h4.3v1.9h.1c.6-1.1 2-2.3 4.1-2.3 4.4 0 5.2 2.9 5.2 6.6V32h-4.5v-6.9c0-1.6 0-3.6-2.2-3.6s-2.5 1.7-2.5 3.5V32H20V18Z" fill="white"/>'],
      'youtube-thumbnail': ['youtube', '<rect width="44" height="44" rx="12" fill="#FF0033"/><path d="M35 16.1a4 4 0 0 0-2.8-2.8C29.8 12.6 22 12.6 22 12.6s-7.8 0-10.2.7A4 4 0 0 0 9 16.1c-.7 2.4-.7 5.9-.7 5.9s0 3.5.7 5.9a4 4 0 0 0 2.8 2.8c2.4.7 10.2.7 10.2.7s7.8 0 10.2-.7a4 4 0 0 0 2.8-2.8c.7-2.4.7-5.9.7-5.9s0-3.5-.7-5.9Z" fill="white"/><path d="m19 27.2 8-5.2-8-5.2v10.4Z" fill="#FF0033"/>']
    };
    const mark = marks[formatId];
    if (!mark) return '';
    return `<svg class="brand-platform-mark ${mark[0]}" viewBox="0 0 44 44" role="img" aria-label="${mark[0]}" xmlns="http://www.w3.org/2000/svg">${mark[1]}</svg>`;
  }
  function formatArtwork(formatId, categoryId, fallbackIcon) {
    const socialMark = socialBrandMark(formatId);
    if (socialMark) return socialMark;
    const icon = formatId === 'business-card' ? 'contact-round' : formatId === 'flyer' ? 'file-image' : formatId === 'poster' ? 'image' : formatId === 'invitation' ? 'mail' : formatId === 'brochure-page' ? 'book-open' : formatId === 'letterhead' ? 'file-signature' : formatId === 'menu' ? 'utensils' : formatId === 'certificate' ? 'award' : formatId === 'pdf-page' || formatId === 'letter-page' || formatId === 'resume-page' || formatId === 'report-page' ? 'file-text' : formatId === 'logo' ? 'shapes' : formatId === 'icon' ? 'app-window' : formatId.startsWith('video') || formatId === 'animated-post' ? 'clapperboard' : fallbackIcon;
    return `<span class="format-artwork ${categoryId} ${formatId}"><i data-lucide="${icon}"></i></span>`;
  }
  function renderCreatePicker() {
    const category = CREATE_CATEGORIES.find(item => item.id === selectedCreateCategory) || CREATE_CATEGORIES[0];
    $('#createCategoryList').innerHTML = CREATE_CATEGORIES.filter(item => item.presets.length).map(item => `<button type="button" class="create-category-option ${item.id === category.id ? 'active' : ''}" data-create-category="${item.id}" aria-pressed="${item.id === category.id}"><span class="create-category-icon ${item.id}"><i data-lucide="${item.icon}"></i></span><span>${escapeHTML(item.label)}</span><i class="category-chevron" data-lucide="chevron-right"></i></button>`).join('');
    $('#createFormatTitle').textContent = category.label;
    $('#createFormatDescription').textContent = category.description;
    $('#createPresetList').innerHTML = category.presets.length ? category.presets.map(item => {
      const active = pendingPreset?.id === item.id;
      const fallbackIcon = item.icon || (category.id === 'video' ? 'film' : category.id === 'documents' ? 'file-text' : category.id === 'social' ? 'share-2' : category.id === 'branding' ? 'shapes' : 'palette');
      return `<button type="button" class="create-format-card ${active ? 'active' : ''}" data-create-format="${item.id}" aria-pressed="${active}"><span class="create-format-art">${formatArtwork(item.id, category.id, fallbackIcon)}</span><span class="create-format-copy"><b>${escapeHTML(item.label)}</b><small>${escapeHTML(item.description)}</small></span><span class="create-format-dimensions">${escapeHTML(item.dimensions)}</span><i class="create-format-check" data-lucide="check-circle-2"></i></button>`;
    }).join('') : '<div class="workspace-coming-soon"><strong>3D tools are on the roadmap</strong><p>This workspace is visible so you can see where Flowva is heading. 3D editing is not available yet.</p></div>';
    $('#createFormatNote').textContent = pendingPreset?.id === 'psd-edit' ? 'PSD files can be imported and their supported layers edited in FLOWVA Editor. Photoshop effects, smart objects and some text styling may not round-trip; export your finished work as PNG, JPG or PDF. Choose this option, then use Upload in the editor to select your .psd file.' : category.id === 'documents' ? 'Document formats create one page at a time. Multi-page document editing is not available yet.' : category.id === 'graphic-design' ? 'These formats open as single-canvas designs. Existing text, shape, image and upload tools are available.' : category.id === 'video' ? 'The editing timeline is enabled for these formats.' : category.id === 'branding' ? 'Use the existing text, shape and image tools to build logo artwork. Advanced vector editing is not yet available.' : 'Choose a format to prepare its canvas dimensions.';
    if (pendingPreset) {
      $('#newProjectName').value = `Untitled ${pendingPreset.label.toLowerCase()}`;
      $('#createSelectionSummary').textContent = `${pendingPreset.label} · ${pendingPreset.dimensions}${pendingPreset.timeline ? ' · Timeline enabled' : ' · Static canvas'}`;
    }
    refreshIcons();
    if (window.matchMedia && window.matchMedia('(max-width: 700px)').matches) {
      const activeCategory = $('#createCategoryList .create-category-option.active');
      activeCategory?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }
  const showCreateModal = (preset = null, categoryId = null) => {
    const presetInfo = preset && CREATE_PRESETS[preset] ? CREATE_PRESETS[preset] : null;
    selectedCreateCategory = categoryId || presetInfo?.category || selectedCreateCategory || 'social';
    const category = CREATE_CATEGORIES.find(item => item.id === selectedCreateCategory) || CREATE_CATEGORIES[0];
    pendingPreset = presetInfo || CREATE_PRESETS[category.presets[0].id];
    $('#createModal').classList.add('open'); $('#createModal').setAttribute('aria-hidden','false');
    renderCreatePicker(); $('#newProjectName').focus(); $('#newProjectName').select();
  };
  const closeCreateModal = () => { $('#createModal').classList.remove('open'); $('#createModal').setAttribute('aria-hidden','true'); pendingPreset = null; };
  async function createProject(e) {
    e.preventDefault(); const title = $('#newProjectName').value.trim(); if (!title) return;
    const preset = pendingPreset?.preset || null;
    if (pendingPreset?.id) recordPresetUse(pendingPreset.id);
    if (!CFG.BACKEND_ENABLED) { closeCreateModal(); return openEditor({ title }, { fresh: true, preset }); }
    try { const r = await FlowvaAPI.projects.create({ title }); closeCreateModal(); openEditor(r.data, { fresh: true, preset }); } catch (error) { toast(error.message, 'error'); }
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
    const myTab = t.closest('[data-my-template-tab]'); if (myTab) { myTemplateTab = myTab.dataset.myTemplateTab; $$('[data-my-template-tab]').forEach(btn => { const active = btn === myTab; btn.classList.toggle('active', active); btn.setAttribute('aria-selected', String(active)); }); const discover = myTemplateTab === 'discover'; $('#myPurchasedGrid').hidden = discover || myTemplateTab !== 'purchased'; $('#myRecentGrid').hidden = discover || myTemplateTab !== 'recent'; $('.template-toolbar').hidden = !discover; $('#templateGrid').hidden = !discover; $('#templateStatus').hidden = !discover; $('.marketplace-external-link').hidden = !discover; $('#myTemplateSearch').placeholder = myTemplateTab === 'recent' ? 'Search recently used' : 'Search your templates'; if (discover) renderMarketplaceTemplates(); else renderMyTemplates(); }
    const action = t.closest('[data-action]'); if (action) {
      if (action.dataset.action === 'create') showCreateModal();
      if (action.dataset.action === 'import') $('#projectImport').click();
    }
    const createCategory = t.closest('[data-create-category]');
    if (createCategory) {
      selectedCreateCategory = createCategory.dataset.createCategory;
      const category = CREATE_CATEGORIES.find(item => item.id === selectedCreateCategory);
      pendingPreset = category?.presets?.length ? CREATE_PRESETS[category.presets[0].id] : null;
      renderCreatePicker();
    }
    const createFormat = t.closest('[data-create-format]');
    if (createFormat && CREATE_PRESETS[createFormat.dataset.createFormat]) { pendingPreset = CREATE_PRESETS[createFormat.dataset.createFormat]; renderCreatePicker(); }
    const workspaceCard = t.closest('[data-workspace-card]');
    if (workspaceCard) {
      const workspaceId = workspaceCard.dataset.workspaceCard;
      const workspace = WORKSPACES.get(workspaceId);
      if (!workspace || workspace.status === 'planned') toast(`${workspace?.label || 'This'} workspace is planned; its editor is not available yet.`, 'info');
      else showCreateModal(null, workspaceId);
    }
    const createPreset = t.closest('[data-create-preset]');
    if (createPreset) showCreateModal(createPreset.dataset.createPreset);
    if (t.closest('#newBtn')) showCreateModal();
    if (t.closest('#libraryImport')) $('#projectImport').click();
    if (t.closest('#refreshMyTemplates') || t.closest('[data-action="refresh-purchases"]')) loadMyTemplates(true);
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
  $('#createCategorySearch')?.addEventListener('input', e => { const q = e.target.value.trim().toLowerCase(); let shown = 0; $$('#creationCategoryRow [data-workspace-card]').forEach(card => { const match = card.textContent.toLowerCase().includes(q); card.hidden = !match; if (match) shown++; }); $('#categorySearchEmpty').hidden = shown > 0; });
  $('#createCategorySearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') { const first = $$('#creationCategoryRow [data-workspace-card]').find(card => !card.hidden); if (first) { const workspace = WORKSPACES.get(first.dataset.workspaceCard); if (workspace?.status === 'planned') toast(`${workspace.label} workspace is planned; its editor is not available yet.`, 'info'); else showCreateModal(null, workspace?.id); } } });
  $('#projectSearch').addEventListener('input', renderProjects); $('#projectSort').addEventListener('change', renderProjects); $('#assetSearch').addEventListener('input', renderAssets); $('#templateSearch').addEventListener('input', renderMarketplaceTemplates); $('#myTemplateSearch').addEventListener('input', renderMyTemplates);
  $('#appVersion').textContent = 'v' + (CFG.APP_VERSION || '');
  renderWorkspaceCards(); refreshIcons(); renderFrequentPresets(); load(); loadMarketplaceTemplates(); loadMyTemplates();
})();
