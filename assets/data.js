/* Data layer: Microsoft sign-in, database and file storage through Supabase. Exposes window.X. */
(function () {
  'use strict';
  // Never run inside someone else's frame (GitHub Pages can't send frame-blocking headers).
  if (window.top !== window.self) { document.documentElement.style.display = 'none'; try { window.top.location = window.location.href; } catch (e) { } }
  var C = window.DIARY_CONFIG || {};
  var BUCKET = 'uploads';
  var configured = !!(C.supabaseUrl && C.supabaseKey && !/PASTE_/.test(C.supabaseUrl + C.supabaseKey));
  var sb = configured && window.supabase ? window.supabase.createClient(C.supabaseUrl, C.supabaseKey, {
    auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true }
  }) : null;
  var X = window.X = { sb: sb, configured: !!sb, me: null };
  // The site can live in a sub-folder (e.g. GitHub Pages: /ask-me-diary/). All pages sit side by side, so this is the folder of the current page.
  X.base = location.pathname.replace(/[^/]*$/, '');

  /* ---------- Errors in plain words ---------- */
  function friendly(msg) {
    msg = String(msg || '');
    if (/Failed to fetch|NetworkError|Load failed|network/i.test(msg)) return 'You seem to be offline. Check your connection and try again.';
    if (/JWT|token|session/i.test(msg) && /expired|invalid|missing/i.test(msg)) return 'Your sign-in expired. Reload the page to sign in again.';
    if (/row-level security|permission denied|violates/i.test(msg)) return 'You don’t have permission to do that.';
    if (/exceeded the maximum allowed size|Payload too large|413/i.test(msg)) return 'That file is over 50 MB. Trim it, or paste a OneDrive or SharePoint link instead.';
    if (/mime type|not supported/i.test(msg)) return 'Only images (PNG, JPG, WebP, GIF) and videos (MP4, MOV, WebM) can be attached.';
    return msg || 'That didn’t work. Try again.';
  }
  function check(r) { if (r && r.error) { var e = new Error(friendly(r.error.message)); e.code = r.error.code; throw e; } return r ? r.data : null; }
  X.friendly = friendly;

  /* ---------- Sign-in ---------- */
  function setupMissing() {
    var m = document.getElementById('main') || document.body;
    m.innerHTML = '<div class="wrap narrow" style="padding-top:48px"><div class="empty"><h3>The diary isn’t connected yet</h3><p>Add the Supabase project address and publishable key to <code>public/assets/config.js</code>. See README.md.</p></div></div>';
  }
  X.loginUrl = function (forAdmin, error) {
    var q = [];
    if (forAdmin) q.push('for=admin');
    if (error) q.push('error=' + encodeURIComponent(error));
    return X.base + 'login' + (q.length ? '?' + q.join('&') : '');
  };
  // Waits for the session (finishing a Microsoft sign-in if we just came back from one), or goes to /login.
  X.requireSession = async function (forAdmin) {
    if (!sb) { setupMissing(); throw new Error('not configured'); }
    var p = new URLSearchParams(location.search), hp = new URLSearchParams(location.hash.replace(/^#/, ''));
    var err = p.get('error_description') || hp.get('error_description') || p.get('error') || hp.get('error');
    if (err) { location.replace(X.loginUrl(forAdmin, err)); return new Promise(function () { }); }
    var s = (await sb.auth.getSession()).data.session;
    if (location.search.indexOf('code=') >= 0) history.replaceState(null, '', location.pathname);
    if (!s) { location.replace(X.loginUrl(forAdmin)); return new Promise(function () { }); }
    return s;
  };
  X.signIn = async function (returnTo) {
    if (!sb) { setupMissing(); return; }
    var r = await sb.auth.signInWithOAuth({
      provider: 'azure',
      options: { scopes: 'email', redirectTo: location.origin + X.base + (returnTo || ''), queryParams: { prompt: 'select_account' } }
    });
    check(r);
  };
  X.signOut = async function () {
    try { if (sb) await sb.auth.signOut(); } catch (e) { }
    location.href = X.base + 'login';
  };
  X.whoami = async function () {
    var who = check(await sb.rpc('whoami'));
    X.me = who;
    return who;
  };

  /* ---------- Shaping rows ---------- */
  function toEntry(r) {
    var d = r.data || {};
    return Object.assign({}, d, {
      id: r.id, uid: r.user_id, type: r.type, week: r.week, team: r.team || '',
      media: (r.media || []).map(function (m) { return Object.assign({}, m); }), links: r.links || [],
      createdAt: r.created_at, updatedAt: r.updated_at,
      thanked: !!r.thanked, thankedAt: r.thanked_at, status: r.status,
      removalRequested: !!r.removal_requested, removalRequestedAt: r.removal_requested_at
    });
  }
  var DEFAULT_CONFIG = { title: 'Ask Me beta', startDate: '', weeks: 4, teams: ['HR', 'Finance', 'Internal'], finalSurveyOpen: false, message: '' };
  function cfgOf(row) { return Object.assign({}, DEFAULT_CONFIG, (row && row.data) || {}); }

  // Private files are shown through short-lived signed links; cached so refreshes don't re-sign everything.
  var urlCache = {};
  X.signUrls = async function (entries) {
    var now = Date.now(), need = [];
    entries.forEach(function (e) { (e.media || []).forEach(function (m) { var c = urlCache[m.id]; if (!c || c.exp < now + 5 * 60e3) need.push(m.id); }); });
    need = need.filter(function (v, i, a) { return a.indexOf(v) === i; });
    for (var i = 0; i < need.length; i += 100) {
      var r = await sb.storage.from(BUCKET).createSignedUrls(need.slice(i, i + 100), 3600);
      (r.data || []).forEach(function (x) { if (x && x.signedUrl && x.path) urlCache[x.path] = { url: x.signedUrl, exp: now + 3600e3 }; });
    }
    entries.forEach(function (e) { (e.media || []).forEach(function (m) { m.url = urlCache[m.id] ? urlCache[m.id].url : ''; }); });
  };

  /* ---------- Participant ---------- */
  X.loadMine = async function () {
    var who = X.me || await X.whoami();
    var res = await Promise.all([
      sb.from('study_config').select('data').eq('id', 1).maybeSingle(),
      sb.from('profiles').select('*').eq('id', who.id).maybeSingle(),
      sb.from('entries').select('*').eq('user_id', who.id).order('created_at', { ascending: false })
    ]);
    var cfg = check(res[0]), prof = check(res[1]), rows = check(res[2]) || [];
    var entries = rows.map(toEntry);
    await X.signUrls(entries);
    return {
      user: { id: who.id, name: who.name, email: who.email, isAdmin: !!who.isAdmin },
      profile: prof && prof.joined_at ? { team: prof.team, role: prof.role, joinedAt: prof.joined_at } : null,
      config: cfgOf(cfg),
      entries: entries
    };
  };
  X.saveProfile = async function (team, role, consent) { return check(await sb.rpc('save_profile', { p_team: team, p_role: role || '', p_consent: !!consent })); };
  // media: [{id, kind, name, size}] (id is the storage path)
  X.saveEntry = async function (id, type, week, answers, media, links) {
    var row = check(await sb.rpc('save_entry', { p_id: id || null, p_type: type, p_week: week || 1, p_answers: answers, p_media: media || [], p_links: links || [] }));
    return toEntry(row);
  };
  X.requestRemoval = async function (id) { check(await sb.rpc('request_removal', { p_id: id })); };

  var EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  // Uploads one file into the signed-in person's own folder, reporting progress (0–1).
  X.upload = async function (file, mime, kind, onProgress) {
    var s = (await sb.auth.getSession()).data.session;
    if (!s) throw new Error('Your sign-in expired. Reload the page to sign in again.');
    var path = s.user.id + '/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.' + (EXT[mime] || 'bin');
    await new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      x.open('POST', C.supabaseUrl.replace(/\/+$/, '') + '/storage/v1/object/' + BUCKET + '/' + path);
      x.setRequestHeader('Authorization', 'Bearer ' + s.access_token);
      x.setRequestHeader('apikey', C.supabaseKey);
      x.setRequestHeader('x-upsert', 'false');
      x.setRequestHeader('cache-control', '3600');
      x.setRequestHeader('Content-Type', mime);
      x.upload.onprogress = function (ev) { if (ev.lengthComputable && onProgress) onProgress(ev.loaded / ev.total); };
      x.onload = function () {
        if (x.status >= 200 && x.status < 300) return resolve();
        var msg = ''; try { var d = JSON.parse(x.responseText); msg = d.message || d.error || ''; } catch (e) { }
        if (x.status === 413) msg = 'Payload too large';
        reject(new Error(friendly(msg || 'Upload failed')));
      };
      x.onerror = function () { reject(new Error('Upload failed. Check your connection.')); };
      x.send(file);
    });
    return { id: path, kind: kind, name: String(file.name || '').slice(0, 120), size: file.size };
  };
  X.removeFiles = async function (paths) {
    paths = (paths || []).filter(Boolean);
    if (!paths.length) return;
    try { await sb.storage.from(BUCKET).remove(paths); } catch (e) { }
  };

  /* ---------- Admin ---------- */
  X.loadAdmin = async function () {
    var who = X.me || await X.whoami();
    var res = await Promise.all([
      sb.from('study_config').select('data').eq('id', 1).maybeSingle(),
      sb.from('profiles').select('*'),
      sb.from('admins').select('email'),
      sb.from('entries').select('*').order('created_at', { ascending: false }),
      sb.from('research').select('*'),
      sb.from('interviews').select('*'),
      sb.rpc('admin_storage_usage')
    ]);
    var cfg = check(res[0]), profs = check(res[1]) || [], admins = (check(res[2]) || []).map(function (a) { return String(a.email).toLowerCase(); });
    var entries = (check(res[3]) || []).map(toEntry), research = {}, interviews = {};
    (check(res[4]) || []).forEach(function (r) { research[r.entry_id] = { tags: r.tags || [], star: !!r.star }; });
    (check(res[5]) || []).forEach(function (i) { interviews[i.user_id] = { status: i.status, date: i.date, notes: i.notes, updatedAt: i.updated_at }; });
    var usage = res[6] && !res[6].error ? res[6].data : null;
    await X.signUrls(entries);
    return {
      me: { id: who.id, name: who.name, email: who.email },
      config: cfgOf(cfg),
      participants: profs.filter(function (p) { return p.joined_at; }).map(function (p) {
        return { id: p.id, name: p.name, email: p.email, team: p.team, role: p.role, joinedAt: p.joined_at, lastSeen: p.last_seen, researcher: admins.indexOf(String(p.email).toLowerCase()) >= 0 };
      }),
      entries: entries, research: research, interviews: interviews, storage: usage
    };
  };
  X.adminSetStatus = async function (id, status) { check(await sb.rpc('admin_set_status', { p_id: id, p_status: status })); };
  X.adminThank = async function (id) { check(await sb.rpc('admin_thank', { p_id: id })); };
  X.adminDelete = async function (id) {
    var files = check(await sb.rpc('admin_delete_entry', { p_id: id })) || [];
    await X.removeFiles(files.map(function (m) { return m.id; }));
  };
  X.adminSaveResearch = async function (id, tags, star) {
    check(await sb.from('research').upsert({ entry_id: id, tags: tags || [], star: !!star, updated_at: new Date().toISOString() }));
  };
  X.adminSaveInterview = async function (uid, status, date, notes) {
    check(await sb.from('interviews').upsert({ user_id: uid, status: status || 'todo', date: date || '', notes: notes || '', updated_at: new Date().toISOString() }));
  };
  X.adminSaveConfig = async function (cfg) { return check(await sb.rpc('admin_save_config', { p: cfg })); };
})();
