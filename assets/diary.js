/* Participant diary: weekly check-in and problem reports. */
(function () {
  'use strict';
  var D = window.D, esc = D.esc, icon = D.icon;
  function $(id) { return document.getElementById(id); }
  var main = $('main');
  var MAX_FILES = 3, MAX_LINKS = 3, MAX_MB = 50;
  var FILE_OK = { 'image/png': 'image', 'image/jpeg': 'image', 'image/webp': 'image', 'image/gif': 'image', 'video/mp4': 'video', 'video/webm': 'video', 'video/quicktime': 'video' };
  var EXT_OK = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime' };

  var S = { user: null, profile: null, config: {}, log: [], pview: 'home', editId: null, presetRating: null, editProfile: false, att: { files: [], links: [], keep: [] }, celebrate: null };

  /* ---------- Data ---------- */
  async function load() {
    var d = await X.loadMine();
    S.user = d.user; S.profile = d.profile; S.config = d.config; S.log = d.entries || [];
  }
  function cfg() { return S.config; }
  function myEntry(id) { return S.log.filter(function (e) { return e.id === id; })[0] || null; }
  function currentWeekly() { var cw = D.currentWeek(cfg()); return S.log.filter(function (e) { return e.type === 'weekly' && D.entryWeek(e, cfg()) === cw; })[0] || null; }

  /* ---------- Shell ---------- */
  function renderTop() {
    $('brandMark').innerHTML = D.BRAND_SVG;
    $('brandSub').textContent = 'Lumenore · ' + (cfg().title || 'Ask Me beta') + ' · ' + D.weekLine(cfg());
    $('topActions').innerHTML = (S.user && S.user.isAdmin ? '<a class="btn small" href="admin">Admin dashboard</a>' : '') +
      '<span class="who">' + D.avatar(S.user && S.user.name, S.user && S.user.id) + '<span>' + esc(S.user ? S.user.name : '') + '</span></span><button class="btn small ghost" type="button" data-act="signout">Sign out</button>';
  }
  function view() { if (!S.profile || S.editProfile) return V.join; return V[S.pview] || V.home; }
  function mount() {
    renderTop();
    var v = view();
    main.innerHTML = v.mount();
    if (v.after) v.after();
    window.scrollTo(0, 0);
  }
  function go(pview, editId) { S.pview = pview; S.editId = editId || null; mount(); }
  function testBanner() { return S.user && S.user.isAdmin ? '<div class="banner info"><span>You’re on the research team, so anything you send here is marked as a test entry and left out of the results.</span></div>' : ''; }

  var V = {};

  /* ---------- Join ---------- */
  V.join = {
    mount: function () {
      var p = S.profile || {}, teams = (cfg().teams || []).concat(['Other']), editing = !!S.profile;
      var first = S.user && S.user.name ? S.user.name.split(' ')[0] : '';
      return '<div class="narrow center stack-lg">' + testBanner() +
        '<section class="hero"><p class="eyebrow">' + esc(D.fmtDay(D.nowIso())) + ' · ' + esc(D.weekLine(cfg())) + '</p><h1>' + (editing ? 'Update your details' : (first ? 'Welcome, ' + esc(first) + '.' : 'Welcome.') + ' Let’s set up your diary.') + '</h1>' +
        (editing ? '' : '<p style="max-width:60ch">For the next few weeks, fill in a short check-in each week about using Ask Me, and report anything that breaks or gets in your way. Screen recordings are welcome. You’ll pick up badges along the way, and your notes shape what gets fixed before launch.</p>') + '</section>' +
        '<form class="form panel" id="joinForm" novalidate>' +
        '<div class="field"><span class="label">Which team are you in?</span>' + D.choiceGroup('team', teams, p.team || '') + '</div>' +
        '<div class="field"><label for="jRole">Your role <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="jRole" placeholder="e.g. Payroll specialist, Finance analyst" value="' + esc(p.role || '') + '"></div>' +
        (editing ? '' : '<label class="check"><input type="checkbox" id="jConsent"> <span>I understand my entries go to the research team only, and I won’t include salaries, employee details or financial figures in text, screenshots or videos.</span></label>') +
        '<div class="row"><button class="btn primary" type="submit">' + (editing ? 'Save' : 'Start my diary') + '</button>' + (editing ? '<button class="btn ghost" type="button" data-act="cancelEdit">Cancel</button>' : '') + '<span class="form-error" id="joinErr" role="alert"></span></div></form></div>';
    },
    after: function () {
      $('joinForm').onsubmit = async function (ev) {
        ev.preventDefault();
        var team = D.radioVal(this, 'team'), err = $('joinErr'), btn = this.querySelector('button[type="submit"]');
        if (!team) { err.textContent = 'Pick your team.'; return; }
        var consent = S.profile ? true : $('jConsent').checked;
        if (!consent) { err.textContent = 'Please tick the box to continue.'; return; }
        btn.disabled = true;
        try { await X.saveProfile(team, $('jRole').value.trim(), true); await load(); S.editProfile = false; go('home'); D.toast('You’re in. Thanks for helping!'); }
        catch (e) { err.textContent = e.message; btn.disabled = false; }
      };
    }
  };

  /* ---------- Home ---------- */
  V.home = {
    mount: function () {
      var c = cfg(), p = S.profile || {}, log = S.log, cw = D.currentWeek(c), t = D.weeksTotal(c), st = D.statsFor(log, c), wk = D.checkinWeeks(log, c);
      var first = S.user && S.user.name ? S.user.name.split(' ')[0] : '';
      var jour = '';
      for (var w = 1; w <= Math.max(t, cw); w++) {
        var cls = w < cw ? 'past ' + (wk[w] ? 'done' : 'missed') : w === cw ? 'now' + (wk[w] ? ' done' : '') : '';
        jour += '<div class="jstep ' + cls + '"><span class="jdot">' + (wk[w] ? icon('check', 11, 3) : '') + '</span><span>Wk ' + w + '</span>' + (w === cw ? '<span class="here">You’re here</span>' : '') + '</div>';
      }
      jour += '<div class="jstep ' + (st.final ? 'past done' : '') + '"><span class="jdot">' + (st.final ? icon('check', 11, 3) : '') + '</span><span>Wrap-up</span></div>';
      var hero = '<section class="hero"><div><p class="eyebrow">' + esc(D.fmtDay(D.nowIso())) + ' · ' + esc(D.weekLine(c)) + (p.team ? ' · ' + esc(p.team) : '') + '</p><h1 style="margin-top:6px">' + (first ? 'Hi ' + esc(first) + ', how’s' : 'How’s') + ' Ask Me treating you this week?</h1></div>' +
        '<div><div class="qf-label">' + (wk[cw] ? 'Changed your mind? Tap to update this week’s check-in.' : 'Tap a face to start this week’s check-in.') + '</div><div class="quick-faces">' + [1, 2, 3, 4, 5].map(function (v) { return '<button class="qf" type="button" data-act="quickFeel" data-v="' + v + '" aria-label="Start check-in: ' + D.FEEL[v] + '">' + D.faceSVG(v, 28) + '<span class="qf-t">' + esc(D.FEEL[v]) + '</span></button>'; }).join('') + '</div></div>' +
        '<div class="journey" aria-label="Your weekly check-ins">' + jour + '</div></section>';

      var frac = Math.min(st.weeklies / t, 1), circ = 2 * Math.PI * 18;
      var thanks = log.filter(function (e) { return e.thanked; }).length, fixed = log.filter(function (e) { return e.type === 'bug' && e.status === 'fixed'; }).length;
      var stats = '<div class="stats3">' +
        '<div class="stat"><div class="ico"><svg width="46" height="46" viewBox="0 0 46 46" class="ring" aria-hidden="true"><circle cx="23" cy="23" r="18" fill="none" stroke="var(--line)" stroke-width="5"/><circle cx="23" cy="23" r="18" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + (circ * frac).toFixed(1) + ' ' + circ.toFixed(1) + '"/></svg></div><div><div class="big num">' + st.weeklies + '<span style="font-size:.9rem;font-weight:600"> / ' + t + '</span></div><div class="lbl">' + (st.weeklies >= t ? 'Every check-in done!' : 'Weekly check-ins') + '</div></div></div>' +
        '<div class="stat"><div class="ico ' + (st.bugs ? 'hot' : '') + '">' + icon('bug', 24) + '</div><div><div class="big num">' + st.bugs + '</div><div class="lbl">' + (st.bugs ? 'Problems reported · ' + fixed + ' fixed' : 'Problems reported so far') + '</div></div></div>' +
        '<div class="stat"><div class="ico">' + icon('heart', 24) + '</div><div><div class="big num">' + thanks + '</div><div class="lbl">' + (thanks ? 'Thank-you' + (thanks === 1 ? '' : 's') + ' from the research team' : 'Your notes go straight to the Ask Me team') + '</div></div></div></div>';

      var msg = c.message ? '<div class="memo"><div class="ico">' + icon('chat', 20) + '</div><div><p class="eyebrow" style="margin-bottom:4px">From the research team</p><p>' + esc(c.message) + '</p></div></div>' : '';

      var dow = new Date().getDay(), dueNow = !wk[cw] && (dow >= 4 || dow === 0);
      var acts = '<div class="actions">' +
        '<button class="action main" type="button" data-act="openWeekly"><span class="action-title">Weekly check-in ' + (wk[cw] ? '<span class="chip">Done · edit</span>' : '<span class="chip' + (dueNow ? ' due' : '') + '">' + (dueNow ? 'Due this week' : 'Week ' + cw) + '</span>') + '</span><span class="ink2">' + (wk[cw] ? 'Add anything new to week ' + cw + ' at any time.' : 'A few quick questions about your week. Add a recording or link if you have one.') + '</span></button>' +
        '<button class="action" type="button" data-act="pv" data-pv="bug"><span class="action-title">Report a problem ' + icon('bug', 22) + '</span><span class="ink2">Something broken, wrong or slow? A screen recording helps us fix it faster.</span></button>';
      if (c.finalSurveyOpen) acts += '<button class="action wide" type="button" data-act="pv" data-pv="final"><span class="action-title">Final survey ' + (st.final ? '<span class="chip">Done</span>' : '<span class="chip due">Open now</span>') + '</span><span class="ink2">Last step of the beta. About 3 minutes.</span></button>';
      acts += '</div>';

      var got = D.earned(log, c);
      var badges = '<section class="stack"><div class="spread"><h2>Your badges</h2><span class="muted">' + got.length + ' of ' + D.BADGES.length + ' earned</span></div><div class="badges">' +
        D.BADGES.map(function (b) { var on = got.indexOf(b.id) >= 0; return '<div class="badge ' + (on ? '' : 'locked') + '"><div class="medal">' + icon(b.icon, 24) + '</div><b>' + esc(b.name) + '</b><span>' + esc(on ? 'Earned' : b.desc) + '</span></div>'; }).join('') + '</div></section>';

      var list = log.length ? log.map(function (e) {
        var sum = e.type === 'bug' ? e.what : e.type === 'weekly' ? 'Week ' + D.entryWeek(e, c) + ' check-in' : 'Final survey';
        var bits = '';
        if (e.type === 'weekly' && e.rating) bits += '<span class="pill">' + D.faceSVG(e.rating, 18) + esc(D.FEEL[e.rating]) + '</span>';
        var mc = D.mediaOf(e).length + D.linksOf(e).length; if (mc) bits += '<span class="chip">' + icon('link', 13) + mc + ' attached</span>';
        if (e.type === 'bug') bits += '<span class="chip' + (e.status === 'fixed' ? ' thanks' : '') + '">' + esc(e.status === 'fixed' ? 'Fixed' : e.status === 'logged' ? 'With the developers' : e.status === 'wontfix' ? 'Won’t be fixed for now' : 'Received') + '</span>';
        if (e.thanked) bits += '<span class="chip thanks">' + icon('heart', 13) + 'The research team says thanks</span>';
        if (e.removalRequested) bits += '<span class="chip flag">Removal requested</span>';
        return '<div class="mini-entry"><span class="when">' + esc(D.fmtDay(e.createdAt)) + '<br>' + esc(D.fmtTime(e.createdAt)) + '</span><div class="what"><span class="chip type-chip">' + esc(D.TYPE_LABEL[e.type] || e.type) + '</span><div style="margin-top:4px">' + esc(sum) + '</div>' + (bits ? '<div class="row">' + bits + '</div>' : '') + '</div><button class="btn small ghost" type="button" data-act="editEntry" data-id="' + esc(e.id) + '" data-type="' + esc(e.type) + '">Edit</button></div>';
      }).join('') : '<div style="padding:16px 0" class="ink2">Nothing yet. Start with this week’s check-in, or report a problem when you hit one.</div>';

      return '<div class="narrow center stack-lg">' + testBanner() + hero + stats + msg + acts + badges +
        '<section class="stack"><div class="spread"><h2>Your entries</h2><span class="muted">' + (log.length ? log.length + ' so far' : '') + '</span></div><div class="panel" style="padding:4px 16px">' + list + '</div></section>' +
        '<p class="muted" style="font-size:.85rem">Only the research team can see your entries. You can edit them any time. <button class="linkish" type="button" data-act="editProfile">Change your team or role</button></p></div>';
    }
  };

  /* ---------- Attachments ---------- */
  function resetAtt(ex) {
    S.att.files.forEach(function (f) { try { URL.revokeObjectURL(f.url); } catch (e) { } });
    S.att = { files: [], links: ex ? D.linksOf(ex).slice(0, MAX_LINKS) : [], keep: ex ? D.mediaOf(ex) : [] };
  }
  function attachSection(hint) {
    return '<fieldset class="attach"><legend>Show us <span class="muted" style="font-weight:400">(optional)</span></legend>' +
      '<p class="hint" style="margin:0">' + esc(hint || 'A short screen recording or screenshot helps the team see exactly what happened.') + '</p>' +
      '<label class="drop" id="dropZone"><input type="file" id="attFile" multiple accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v" aria-label="Add screenshots or videos"><span class="ico">' + icon('upload', 22) + '</span><span style="min-width:0"><b>Add a screen recording or screenshot</b><span>Drop files here or click to choose. MP4, MOV or WebM video, PNG or JPG images. Up to ' + MAX_FILES + ' files, ' + MAX_MB + ' MB each.</span></span></label>' +
      '<ul class="att-list" id="attList"></ul><p class="att-msg" id="attMsg" role="alert"></p>' +
      '<div class="field"><label for="attLink">Or paste a link</label><div class="link-add"><input class="input" type="url" id="attLink" inputmode="url" placeholder="https://… OneDrive, SharePoint, Loom or Stream"><button class="btn" type="button" data-act="addLink">Add</button></div><span class="hint">Make sure the research team has permission to open it.</span></div>' +
      '<p class="warn-note">Crop or blur salaries, employee details and financial figures before you share.</p></fieldset>';
  }
  function bindAttach() {
    renderAtt();
    var inp = $('attFile'), zone = $('dropZone');
    inp.onchange = function () { addFiles(inp.files); inp.value = ''; };
    ['dragenter', 'dragover'].forEach(function (t) { zone.addEventListener(t, function (ev) { ev.preventDefault(); zone.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (t) { zone.addEventListener(t, function () { zone.classList.remove('over'); }); });
    zone.addEventListener('drop', function (ev) { ev.preventDefault(); if (ev.dataTransfer && ev.dataTransfer.files) addFiles(ev.dataTransfer.files); });
    $('attLink').addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); addLink(); } });
  }
  function fileType(f) { if (FILE_OK[f.type]) return f.type; var ext = (f.name.split('.').pop() || '').toLowerCase(); return EXT_OK[ext] || ''; }
  function addFiles(list) {
    var msgs = [];
    Array.prototype.forEach.call(list || [], function (f) {
      if (S.att.files.length + S.att.keep.length >= MAX_FILES) { msgs.push('You can attach up to ' + MAX_FILES + ' files. Paste a link for anything else.'); return; }
      var type = fileType(f);
      if (!type) { msgs.push(f.name + ': only MP4, MOV or WebM videos and PNG, JPG, WebP or GIF images can be attached.'); return; }
      if (f.size > MAX_MB * 1048576) { msgs.push(f.name + ' is ' + D.fmtSize(f.size) + ', over the ' + MAX_MB + ' MB limit. Trim it, or paste a OneDrive or SharePoint link instead.'); return; }
      var url = ''; try { url = URL.createObjectURL(f); } catch (e) { }
      S.att.files.push({ file: f, mime: type, kind: FILE_OK[type], url: url });
    });
    $('attMsg').textContent = msgs.join(' ');
    renderAtt();
  }
  function addLink() {
    var el = $('attLink'); if (!el) return true;
    var raw = el.value.trim(); if (!raw) return true;
    var u = D.safeUrl(raw);
    if (!u) { $('attMsg').textContent = 'That doesn’t look like a web link. Paste the full address starting with https://'; return false; }
    if (S.att.links.length >= MAX_LINKS) { $('attMsg').textContent = 'You can add up to ' + MAX_LINKS + ' links.'; return false; }
    if (S.att.links.indexOf(u) < 0) S.att.links.push(u);
    el.value = ''; $('attMsg').textContent = ''; renderAtt(); return true;
  }
  function renderAtt() {
    var ul = $('attList'); if (!ul) return;
    var h = S.att.keep.map(function (m, i) {
      var src = esc(m.url || ''), pv = !m.url ? icon(m.kind === 'video' ? 'video' : 'upload', 20) : m.kind === 'video' ? '<video src="' + src + '" muted preload="metadata"></video>' : '<img src="' + src + '" alt="">';
      return '<li><span class="pv">' + pv + '</span><span style="min-width:0"><span class="nm">' + esc(m.name || (m.kind === 'video' ? 'Video' : 'Screenshot')) + '</span><span class="sz">Already attached</span></span><button class="btn small ghost" type="button" data-act="rmKeep" data-i="' + i + '">Remove</button></li>';
    }).concat(S.att.files.map(function (f, i) {
      var pv = f.kind === 'video' ? (f.url ? '<video src="' + esc(f.url) + '" muted preload="metadata"></video>' : icon('video', 20)) : (f.url ? '<img src="' + esc(f.url) + '" alt="">' : '');
      return '<li><span class="pv">' + pv + '</span><span style="min-width:0"><span class="nm">' + esc(f.file.name) + '</span><span class="sz">' + (f.kind === 'video' ? 'Video' : 'Image') + ' · ' + D.fmtSize(f.file.size) + '</span></span><button class="btn small ghost" type="button" data-act="rmFile" data-i="' + i + '">Remove</button></li>';
    })).concat(S.att.links.map(function (u, i) {
      return '<li><span class="pv">' + icon('link', 20) + '</span><span style="min-width:0"><span class="nm">' + esc(D.hostOf(u)) + '</span><span class="sz">' + esc(u) + '</span></span><button class="btn small ghost" type="button" data-act="rmLink" data-i="' + i + '">Remove</button></li>';
    })).join('');
    ul.innerHTML = h; ul.hidden = !h;
  }

  /* ---------- Forms ---------- */
  function formShell(title, intro, inner, submitLabel, ex) {
    var removal = '';
    if (ex) {
      removal = ex.removalRequested
        ? '<div class="remove-req">You asked the research team to remove this entry. They’ll delete it soon.</div>'
        : '<div class="remove-req"><span>Shared something by mistake?</span><button class="btn small ghost danger" type="button" data-act="reqRemove" data-id="' + esc(ex.id) + '">Ask the research team to remove this entry</button></div>';
    }
    return '<div class="narrow center stack-lg">' + testBanner() + '<div class="diary-head"><button class="linkish" type="button" data-act="pv" data-pv="home" style="align-self:flex-start">← Back to your diary</button><h1 style="margin-top:8px">' + title + '</h1><p class="ink2" style="max-width:62ch">' + intro + '</p></div>' +
      '<form class="form panel" id="pForm" novalidate>' + inner + '<div class="row"><button class="btn primary" type="submit" id="pSubmit">' + submitLabel + '</button><button class="btn ghost" type="button" data-act="pv" data-pv="home">Cancel</button><span class="form-error" id="pErr" role="alert"></span></div>' + removal + '</form></div>';
  }
  async function submitEntry(data, ex) {
    var btn = $('pSubmit'), err = $('pErr'), label = btn.textContent;
    if (!addLink()) { err.textContent = 'Fix the link or clear it before saving.'; return; }
    btn.disabled = true; err.textContent = '';
    var before = D.earned(S.log, cfg()), failed = 0, uploaded = [], n = S.att.files.length;
    try {
      for (var i = 0; i < n; i++) {
        var f = S.att.files[i];
        try {
          var r = await X.upload(f.file, f.mime, f.kind, function (p) { btn.textContent = 'Uploading ' + (f.kind === 'video' ? 'video' : 'image') + (n > 1 ? ' ' + (i + 1) + ' of ' + n : '') + ' · ' + Math.round(p * 100) + '%'; });
          uploaded.push(r);
        } catch (e) { failed++; err.textContent = e.message; }
      }
      btn.textContent = 'Saving…';
      var media = S.att.keep.map(function (m) { return { id: m.id, kind: m.kind, name: m.name, size: m.size }; }).concat(uploaded);
      var answers = Object.assign({}, data); delete answers.type; delete answers.week;
      var week = data.week || D.currentWeek(cfg());
      var saved;
      try { saved = await X.saveEntry(ex ? ex.id : null, data.type, week, answers, media, S.att.links.slice()); }
      catch (e) { await X.removeFiles(uploaded.map(function (u) { return u.id; })); throw e; }
      if (ex) {
        var keepIds = saved.media.map(function (m) { return m.id; });
        await X.removeFiles(D.mediaOf(ex).map(function (m) { return m.id; }).filter(function (id) { return keepIds.indexOf(id) < 0; }));
      }
      data.media = saved.media; data.links = saved.links;
      await load();
      if (failed) D.toast(failed === 1 ? 'One file couldn’t be uploaded, so it was saved without it.' : failed + ' files couldn’t be uploaded, so it was saved without them.');
      var got = D.earned(S.log, cfg()), fresh = got.filter(function (b) { return before.indexOf(b) < 0; });
      resetAtt(); S.presetRating = null;
      if (ex && !fresh.length) { D.toast('Changes saved'); go('home'); return; }
      S.celebrate = { type: data.type, edit: !!ex, newBadges: fresh, attached: data.media.length + data.links.length };
      go('celebrate');
    } catch (e) { err.textContent = e.message; btn.disabled = false; btn.textContent = label; }
  }

  V.weekly = {
    ex: function () { return S.editId ? myEntry(S.editId) : currentWeekly(); },
    mount: function () {
      var ex = this.ex(), e = ex || {}, wkNo = ex ? D.entryWeek(ex, cfg()) : D.currentWeek(cfg());
      resetAtt(ex);
      var rating = S.presetRating || e.rating || '';
      return formShell('Week ' + wkNo + ' check-in', ex ? 'Change anything or add something new, then save. Your earlier answers are kept.' : 'A few quick questions about your week with Ask Me. A sentence or two each is plenty.',
        '<div class="field"><span class="label">Overall, how was Ask Me this week?</span>' + D.faceGroup('rating', rating) + '</div>' +
        '<div class="field"><span class="label">What did you try? <span class="muted" style="font-weight:400">(pick any)</span></span>' + D.checkGroup('tasks', D.TASK_TYPES, e.tasks) + '</div>' +
        D.WEEKLY_Q.map(function (q) { return '<div class="field"><label for="w-' + q[0] + '">' + esc(q[1]) + '</label><textarea class="input" id="w-' + q[0] + '">' + esc(e[q[0]] || '') + '</textarea></div>'; }).join('') +
        '<div class="field"><span class="label">Did you trust Ask Me’s answers this week?</span>' + D.choiceGroup('trust', D.TRUST_WK, e.trust || '') + '</div>' +
        '<div class="field"><span class="label">How likely are you to keep using it next week?</span>' + D.choiceGroup('keepUsing', D.KEEP, e.keepUsing || '') + '</div>' +
        attachSection(), ex ? 'Save changes' : 'Send check-in', ex);
    },
    after: function () {
      bindAttach();
      var form = $('pForm'), ex = this.ex();
      S.presetRating = null;
      form.onsubmit = function (ev) {
        ev.preventDefault();
        var data = { type: 'weekly', week: ex ? D.entryWeek(ex, cfg()) : D.currentWeek(cfg()), rating: +D.radioVal(form, 'rating') || null, tasks: D.checkVals(form, 'tasks'), trust: D.radioVal(form, 'trust'), keepUsing: +D.radioVal(form, 'keepUsing') || null };
        D.WEEKLY_Q.forEach(function (q) { data[q[0]] = $('w-' + q[0]).value.trim(); });
        if (!data.rating) { $('pErr').textContent = 'Pick how your week was.'; return; }
        if (!D.WEEKLY_Q.some(function (q) { return data[q[0]]; })) { $('pErr').textContent = 'Answer at least one of the questions.'; return; }
        submitEntry(data, ex);
      };
    }
  };

  V.bug = {
    ex: function () { return S.editId ? myEntry(S.editId) : null; },
    mount: function () {
      var ex = this.ex(), e = ex || {};
      resetAtt(ex);
      return formShell(ex ? 'Edit your problem report' : 'Report a problem', ex ? 'Add details or a recording, then save.' : 'Something broken, wrong or slow? Tell us what happened. The research team passes it to the developers, and you’ll see its status in your entries.',
        '<div class="field"><label for="bWhat">What went wrong?</label><textarea class="input" id="bWhat" placeholder="e.g. The chart showed last year’s numbers when I asked for this month">' + esc(e.what || '') + '</textarea></div>' +
        '<div class="field"><label for="bSteps">What were you doing when it happened?</label><textarea class="input" id="bSteps" placeholder="The question you asked, the data source, anything you clicked">' + esc(e.steps || '') + '</textarea></div>' +
        '<div class="field"><span class="label">Where in Ask Me?</span>' + D.choiceGroup('area', D.BUG_AREAS, e.area || '') + '</div>' +
        '<div class="field"><span class="label">How bad is it?</span>' + D.choiceGroup('severity', D.SEVERITY, e.severity || '') + '</div>' +
        attachSection('A screen recording of the problem happening is the fastest way to get it fixed.'), ex ? 'Save changes' : 'Send report', ex);
    },
    after: function () {
      bindAttach();
      var form = $('pForm'), ex = this.ex();
      form.onsubmit = function (ev) {
        ev.preventDefault();
        var what = $('bWhat').value.trim(), sev = D.radioVal(form, 'severity');
        if (!what) { $('pErr').textContent = 'Describe what went wrong.'; $('bWhat').focus(); return; }
        if (!sev) { $('pErr').textContent = 'Pick how bad it is.'; return; }
        submitEntry({ type: 'bug', what: what, steps: $('bSteps').value.trim(), area: D.radioVal(form, 'area'), severity: sev }, ex);
      };
    }
  };

  V.final = {
    ex: function () { return S.log.filter(function (e) { return e.type === 'final'; })[0] || null; },
    mount: function () {
      var ex = this.ex(), e = ex || {};
      resetAtt(ex);
      var npsItems = []; for (var i = 0; i <= 10; i++) npsItems.push({ v: i, label: String(i) });
      return formShell('Final survey', ex ? 'Change anything, then save.' : 'Thanks for sticking with the beta. A few last questions about how it went overall.',
        '<div class="field"><span class="label">Overall, how satisfied are you with Ask Me?</span>' + D.faceGroup('overall', e.overall || '') + '</div>' +
        '<div class="field"><span class="label">How likely are you to recommend Ask Me to a colleague?</span>' + D.choiceGroup('nps', npsItems, e.nps != null ? e.nps : '', 'nps') + '<div class="nps-ends"><span>0 · Not at all likely</span><span>10 · Extremely likely</span></div></div>' +
        '<div class="field"><span class="label">How easy was it to get the answers you needed?</span>' + D.choiceGroup('ease', [1, 2, 3, 4, 5].map(function (v) { return { v: v, label: D.EASE[v] }; }), e.ease || '') + '</div>' +
        '<div class="field"><span class="label">If Ask Me launched tomorrow, how often would you use it?</span>' + D.choiceGroup('wouldUse', D.WOULD_USE, e.wouldUse || '') + '</div>' +
        D.FINAL_Q.map(function (q) { return '<div class="field"><label for="f-' + q[0] + '">' + esc(q[1]) + '</label><textarea class="input" id="f-' + q[0] + '">' + esc(e[q[0]] || '') + '</textarea></div>'; }).join(''), ex ? 'Save changes' : 'Send survey', ex);
    },
    after: function () {
      var form = $('pForm'), ex = this.ex();
      form.onsubmit = function (ev) {
        ev.preventDefault();
        var overall = D.radioVal(form, 'overall'), nps = D.radioVal(form, 'nps');
        if (!overall) { $('pErr').textContent = 'Pick your overall satisfaction.'; return; }
        var data = { type: 'final', overall: +overall, nps: nps === '' ? null : +nps, ease: +D.radioVal(form, 'ease') || null, wouldUse: D.radioVal(form, 'wouldUse') };
        D.FINAL_Q.forEach(function (q) { data[q[0]] = $('f-' + q[0]).value.trim(); });
        submitEntry(data, ex);
      };
    }
  };

  V.celebrate = {
    mount: function () {
      var c = S.celebrate || { type: 'weekly', newBadges: [], attached: 0 };
      var copy = {
        weekly: [c.edit ? 'Check-in updated' : 'Check-in done', 'Week ' + D.currentWeek(cfg()) + ' is in the books. You can come back and add to it any time this week.'],
        bug: [c.edit ? 'Report updated' : 'Problem reported', 'The research team will pass it to the developers. Its status shows up in your entries.'],
        final: ['That’s a wrap', 'Thanks for taking part in the beta. Your notes shape what ships.']
      }[c.type] || ['Saved', 'Thanks!'];
      var badges = c.newBadges.map(function (id) { var b = D.BADGES.filter(function (x) { return x.id === id; })[0]; return b ? '<div class="new-badge"><div class="medal">' + icon(b.icon, 24) + '</div><div><b>New badge: ' + esc(b.name) + '</b><div style="font-size:.85rem">' + esc(b.desc) + '</div></div></div>' : ''; }).join('');
      return '<div class="narrow center">' + testBanner() + '<section class="celebrate" aria-live="polite">' + D.confetti() +
        '<div class="tick">' + icon('check', 40, 2.6) + '</div><h1>' + esc(copy[0]) + '</h1><p class="ink2" style="max-width:46ch">' + esc(copy[1]) + '</p>' +
        (c.attached ? '<div class="row" style="justify-content:center"><span class="chip">' + c.attached + ' attachment' + (c.attached > 1 ? 's' : '') + ' included</span></div>' : '') + badges +
        '<div class="row" style="justify-content:center;margin-top:8px">' + (c.type === 'bug' ? '<button class="btn" type="button" data-act="pv" data-pv="bug">Report another problem</button>' : '') + '<button class="btn primary" type="button" data-act="pv" data-pv="home">Back to your diary</button></div></section></div>';
    }
  };

  /* ---------- Events ---------- */
  document.addEventListener('click', async function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var act = t.getAttribute('data-act');
    if (act === 'pv') go(t.getAttribute('data-pv'));
    else if (act === 'openWeekly') go('weekly');
    else if (act === 'quickFeel') { S.presetRating = t.getAttribute('data-v'); go('weekly'); }
    else if (act === 'editEntry') go(t.getAttribute('data-type'), t.getAttribute('data-id'));
    else if (act === 'editProfile') { S.editProfile = true; mount(); }
    else if (act === 'cancelEdit') { S.editProfile = false; mount(); }
    else if (act === 'addLink') addLink();
    else if (act === 'rmFile') { var i = +t.getAttribute('data-i'), f = S.att.files[i]; if (f) { try { URL.revokeObjectURL(f.url); } catch (e) { } S.att.files.splice(i, 1); renderAtt(); } }
    else if (act === 'rmKeep') { S.att.keep.splice(+t.getAttribute('data-i'), 1); renderAtt(); }
    else if (act === 'rmLink') { S.att.links.splice(+t.getAttribute('data-i'), 1); renderAtt(); }
    else if (act === 'reqRemove') {
      if (!D.arm(t, 'Click again to send the request')) return;
      t.disabled = true;
      try { await X.requestRemoval(t.getAttribute('data-id')); await load(); D.toast('Request sent. The research team will remove it.'); go('home'); }
      catch (e) { D.toast(e.message); t.disabled = false; }
    }
    else if (act === 'signout') X.signOut();
  });

  /* ---------- Start ---------- */
  D.initOverlays();
  (async function start() {
    await X.requireSession(false);
    var who = await X.whoami();
    S.user = { id: who.id, name: who.name, email: who.email, isAdmin: !!who.isAdmin };
    renderTop();
    if (!who.isMember) {
      D.blocked('Use your Lumenore work account', 'You’re signed in as ' + (who.email || 'an account') + ', which isn’t part of the Ask Me beta. Sign out and sign in again with your Lumenore Microsoft account.');
      return;
    }
    await load();
    mount();
  })().catch(function (e) {
    if (e && e.message === 'not configured') return;
    main.innerHTML = '<div class="narrow center"><div class="empty"><h3>Your diary didn’t load</h3><p>' + esc(e.message) + '</p><p style="margin-top:8px"><a href="./">Try again</a></p></div></div>';
  });
})();
