/* Stable API facade — the ONLY file that knows backend URLs.
   Every call goes to  <API_BASE_URL>/api/editor/<path>  with the user's session cookie.
   If your backend uses different routes, change them in the ROUTES map below (nowhere else). */
(function (root) {
  const cfg = root.FLOWVA_CONFIG || {};
  const base = () => String(cfg.API_BASE_URL || '').replace(/\/+$/, '');
  const ROUTES = {
    health: 'health', me: 'me', rates: 'rates',
    projects: 'projects', templates: 'templates', listings: 'listings',
    publish: 'publish', purchases: 'purchases', ownership: 'ownership'
  };
  const enc = encodeURIComponent;
  const TIMEOUT_MS = 20000;

  class ApiError extends Error {
    constructor(message, status, code) { super(message); this.name = 'ApiError'; this.status = status || 0; this.code = code || ''; }
  }

  function readCookie(name) {
    try { const m = (root.document?.cookie || '').match(new RegExp('(?:^|; )' + name + '=([^;]*)')); return m ? decodeURIComponent(m[1]) : ''; } catch { return ''; }
  }

  async function request(method, path, body) {
    if (!cfg.BACKEND_ENABLED) throw new ApiError('Standalone mode: no Flowva backend connected.', 0, 'standalone');
    const url = base() + '/api/editor/' + String(path).replace(/^\/+/, '');
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // CSRF: if the backend issues an XSRF/CSRF cookie, echo it back on mutations (double-submit pattern).
    if (method !== 'GET') { const t = readCookie('XSRF-TOKEN') || readCookie('csrf_token'); if (t) headers['X-CSRF-Token'] = t; }
    const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctl ? setTimeout(() => ctl.abort(), TIMEOUT_MS) : null;
    let res;
    try {
      res = await fetch(url, { method, credentials: 'include', headers, body: body !== undefined ? JSON.stringify(body) : undefined, signal: ctl?.signal });
    } catch (e) {
      throw new ApiError(e && e.name === 'AbortError' ? 'The Flowva server took too long to respond.' : 'Cannot reach the Flowva server. Check your connection and try again.', 0, 'network');
    } finally { if (timer) clearTimeout(timer); }
    if (!res.ok) {
      let message = 'Request failed (' + res.status + ')', code = '';
      try { const e = await res.json(); message = e.message || e.error || message; code = e.code || ''; } catch {}
      if (res.status === 401) message = 'Please sign in to Flowva to continue.';
      throw new ApiError(message, res.status, code);
    }
    if (res.status === 204) return { data: null };
    let json = null; try { json = await res.json(); } catch {}
    return { data: json && typeof json === 'object' && 'data' in json ? json.data : json };
  }

  const R = ROUTES;
  root.FlowvaAPI = {
    ApiError,
    health: () => request('GET', R.health),
    me: () => request('GET', R.me),
    rates: () => request('GET', R.rates),                    // { base:'USD', rates:{ GHS: 15.2 }, updatedAt }
    projects: {
      list: () => request('GET', R.projects),
      get: id => request('GET', R.projects + '/' + enc(id)),
      create: data => request('POST', R.projects, data),
      update: (id, data) => request('PUT', R.projects + '/' + enc(id), data),
      remove: id => request('DELETE', R.projects + '/' + enc(id))
    },
    templates: { list: () => request('GET', R.templates) },
    listings: { list: () => request('GET', R.listings) },
    publish: data => request('POST', R.publish, data),
    purchases: { list: () => request('GET', R.purchases) },
    ownership: id => request('GET', R.ownership + '/' + enc(id))
  };
})(typeof window !== 'undefined' ? window : globalThis);
