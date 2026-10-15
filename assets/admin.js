/* Admin dashboard: overview, entries, problems, insights, interviews, settings. */
(function () {
  'use strict';
  var D = window.D, esc = D.esc, icon = D.icon;
  function $(id) { return document.getElementById(id); }
  var main = $('main');
  var STAR = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  var STAR_ON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

  function blankFilters() { return { type: 'all', team: 'all', week: 'all', feel: 'all', media: 'all', tag: 'all', q: '', flag: 'all' }; }
  var S = { me: null, config: {}, participants: [], people: {}, entries: [], research: {}, interviews: {}, tab: 'overview', filters: blankFilters(), includeTest: false, selInterview: null, deferred: false, loaded: false };
  try { var t0 = localStorage.getItem('adminTab'); if (t0) S.tab = t0; } catch (e) { }

  /* ---------- Data ---------- */
  async function refresh() {
    var d = await X.loadAdmin();
    S.me = d.me; S.config = d.config; S.participants = d.participants; S.entries = d.entries; S.research = d.research; S.interviews = d.interviews; S.storage = d.storage;
    S.people = {}; S.participants.forEach(function (p) { S.people[p.id] = p; });
    S.loaded = true;
  }
  function cfg() { return S.config; }
  function nameOf(uid) { var p = S.people[uid]; return (p && (p.name || p.email)) || 'Participant'; }
  function avatarOf(uid) { return D.avatar(nameOf(uid), uid); }
  function isTest(uid) { var p = S.people[uid]; return !!(p && p.researcher); }
  function allEntries() { return S.entries.filter(function (e) { return S.includeTest || !isTest(e.uid); }).map(function (e) { return Object.assign({}, e, { test: isTest(e.uid) }); }); }
  function participantIds() { return S.participants.filter(function (p) { return S.includeTest || !p.researcher; }).map(function (p) { return p.id; }); }
  function logOf(uid) { return S.entries.filter(function (e) { return e.uid === uid; }); }
  function rs(id) { return S.research[id] || {}; }
  function allTags() {
    var set = {};
    Object.keys(S.research).forEach(function (k) { (S.research[k].tags || []).forEach(function (t) { set[t] = (set[t] || 0) + 1; }); });
    return Object.keys(set).sort(function (a, b) { return set[b] - set[a] || a.localeCompare(b); });
  }
  function isOpen(e) { return !/fixed|wontfix/.test(e.status || 'new'); }

  /* ---------- Shell ---------- */
  var updTimer = null;
  function scheduleUpdate() { clearTimeout(updTimer); updTimer = setTimeout(function () { renderTop(); var v = R[S.tab]; if (v && v.update) v.update(); }, 40); }
  function renderTop() {
    $('brandMark').innerHTML = D.BRAND_SVG;
    $('brandSub').textContent = 'Lumenore · ' + (cfg().title || 'Ask Me beta') + ' · ' + D.weekLine(cfg());
    var acts = '<a class="btn small" href="./">Open participant diary</a><span class="who">' + D.avatar(S.me && S.me.name, S.me && S.me.id) + '<span>' + esc(S.me ? S.me.name : '') + '</span></span><button class="btn small ghost" type="button" data-act="signout">Sign out</button>';
    if ($('topActions').innerHTML !== acts) $('topActions').innerHTML = acts;
    var entries = allEntries(), openBugs = entries.filter(function (e) { return e.type === 'bug' && isOpen(e); }).length;
    var defs = [['overview', 'Overview'], ['entries', 'Entries', entries.length], ['bugs', 'Problems', openBugs], ['insights', 'Insights'], ['interviews', 'Interviews'], ['settings', 'Settings']];
    var h = defs.map(function (d) { return '<button class="tab" role="tab" type="button" data-act="tab" data-tab="' + d[0] + '" aria-selected="' + (S.tab === d[0]) + '">' + d[1] + (d[2] != null ? ' <span class="count">' + d[2] + '</span>' : '') + '</button>'; }).join('');
    if ($('tabs').innerHTML !== h) $('tabs').innerHTML = h;
  }
  function mount() {
    if (!R[S.tab]) S.tab = 'overview';
    renderTop();
    var v = R[S.tab];
    main.innerHTML = v.mount();
    if (v.after) v.after();
    if (v.update) v.update(true);
    window.scrollTo(0, 0);
  }
  async function act(promise, okMsg) {
    try { await promise; if (okMsg) D.toast(okMsg); await refresh(); scheduleUpdate(); return true; }
    catch (e) { D.toast(e.message); return false; }
  }

  /* ---------- Charts ---------- */
  function ratingPoints(entries) {
    return entries.filter(function (e) { return e.type === 'weekly' && e.rating; }).map(function (e) { return { team: e.team, w: D.entryWeek(e, cfg()), v: +e.rating }; });
  }
  function feelingChart(entries) {
    var c = cfg(), weeks = Math.max(D.weeksTotal(c), D.currentWeek(c)), teams = (c.teams || []).slice(0, 3);
    var pts0 = ratingPoints(entries);
    if (!pts0.length) return '<div class="chart-empty">The weekly trend appears after the first check-ins come in.</div>';
    var hasOther = pts0.some(function (p) { return teams.indexOf(p.team) < 0; });
    var groups = teams.map(function (t) { return { name: t, color: D.teamColor(t, c), f: function (p) { return p.team === t; } }; });
    if (hasOther) groups.push({ name: 'Other', color: 'var(--s-other)', f: function (p) { return teams.indexOf(p.team) < 0; } });
    var W = 560, H = 230, m = { l: 34, r: 74, t: 14, b: 30 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    function x(w) { return weeks === 1 ? m.l + iw / 2 : m.l + (w - 1) / (weeks - 1) * iw; }
    function y(v) { return m.t + (5 - v) / 4 * ih; }
    var g = '';
    for (var v = 1; v <= 5; v++) g += '<line class="' + (v === 1 ? 'base-line' : 'grid-line') + '" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (m.l - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + v + '</text>';
    for (var w = 1; w <= weeks; w++) g += '<text x="' + x(w) + '" y="' + (H - 8) + '" text-anchor="middle">Wk ' + w + '</text>';
    var ends = [];
    groups.forEach(function (gr) {
      var pts = [];
      for (var w2 = 1; w2 <= weeks; w2++) {
        var vals = pts0.filter(function (p) { return gr.f(p) && p.w === w2; }).map(function (p) { return p.v; });
        if (vals.length) pts.push({ w: w2, v: D.avg(vals), n: vals.length });
      }
      if (!pts.length) return;
      var d = ''; pts.forEach(function (p, i) { var prev = pts[i - 1]; d += (i && prev.w === p.w - 1 ? 'L' : 'M') + x(p.w).toFixed(1) + ' ' + y(p.v).toFixed(1); });
      g += '<path d="' + d + '" fill="none" stroke="' + gr.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(function (p) {
        g += '<circle cx="' + x(p.w) + '" cy="' + y(p.v) + '" r="4.5" fill="' + gr.color + '" stroke="var(--surface)" stroke-width="2"/>';
        g += '<circle cx="' + x(p.w) + '" cy="' + y(p.v) + '" r="12" fill="transparent" data-tip="' + esc(gr.name + ' · week ' + p.w + ': ' + p.v.toFixed(1) + ' average from ' + p.n + ' rating' + (p.n > 1 ? 's' : '')) + '"/>';
      });
      var last = pts[pts.length - 1]; ends.push({ name: gr.name, y: y(last.v), x: x(last.w), v: last.v });
    });
    ends.sort(function (a, b) { return a.y - b.y; });
    for (var i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
    ends.forEach(function (e) { g += '<text class="lbl" x="' + (e.x + 9) + '" y="' + (e.y + 4) + '">' + esc(e.name) + ' ' + e.v.toFixed(1) + '</text>'; });
    var legend = '<div class="legend">' + groups.map(function (gr) { return '<span><i class="line" style="--c:' + gr.color + '"></i>' + esc(gr.name) + '</span>'; }).join('') + '</div>';
    return legend + '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Average weekly rating by team, on a 1 to 5 scale">' + g + '</svg><p class="eyebrow" style="margin-top:6px;text-transform:none">1 = frustrated · 5 = delighted</p>';
  }
  function keepChart(entries) {
    var set0 = entries.filter(function (e) { return e.type === 'weekly' && e.keepUsing; });
    if (!set0.length) return '<div class="chart-empty">Answers to “keep using it next week?” appear after the first check-ins.</div>';
    var rows = [{ name: 'All teams', f: function () { return true; } }].concat((cfg().teams || []).map(function (t) { return { name: t, f: function (e) { return e.team === t; } }; }));
    var legend = '<div class="legend">' + D.KEEP.map(function (o) { return '<span><i style="--c:' + o.c + '"></i>' + esc(o.label) + '</span>'; }).join('') + '</div>';
    var body = rows.map(function (r) {
      var set = set0.filter(r.f); if (!set.length) return '<div class="stackrow"><span>' + esc(r.name) + '</span><span class="muted" style="font-size:.8rem">No answers yet</span><span></span></div>';
      var segs = D.KEEP.map(function (o) {
        var n = set.filter(function (e) { return +e.keepUsing === o.v; }).length; if (!n) return '';
        return '<span style="--c:' + o.c + ';flex:' + n + '" data-tip="' + esc(r.name + ' · ' + o.label + ': ' + n + ' of ' + set.length + ' (' + D.pct(n, set.length) + '%)') + '"></span>';
      }).join('');
      var likely = set.filter(function (e) { return +e.keepUsing >= 3; }).length;
      return '<div class="stackrow"><span>' + esc(r.name) + ' <span class="muted num">(' + set.length + ')</span></span><div class="stackbar" role="img" aria-label="' + esc(r.name + ': ' + D.pct(likely, set.length) + '% likely to keep using it') + '">' + segs + '</div><span class="lead">' + D.pct(likely, set.length) + '% likely</span></div>';
    }).join('');
    return legend + '<div class="stackrows">' + body + '</div>';
  }
  function dailyChart(entries) {
    var c = cfg(), list = entries.filter(function (e) { return e.type !== 'final'; });
    if (!list.length) return '<div class="chart-empty">Daily activity appears once check-ins and problem reports come in.</div>';
    var start = D.parseDay(c.startDate), DAY = 864e5;
    var first = start || new Date(list[list.length - 1].createdAt);
    first = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    var today = new Date(); today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var end = start ? new Date(Math.max(+today, +start + (D.weeksTotal(c) * 7 - 1) * DAY)) : today;
    var days = Math.min(Math.round((end - first) / DAY) + 1, 120); if (days < 1) days = 1;
    var counts = []; for (var i = 0; i < days; i++) counts.push(0);
    list.forEach(function (e) { var d = new Date(e.createdAt); d = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var idx = Math.round((d - first) / DAY); if (idx >= 0 && idx < days) counts[idx]++; });
    var max = Math.max.apply(null, counts.concat([1]));
    // Drawn with HTML so labels stay a readable size at any width.
    var bars = counts.map(function (n, i) {
      var d = new Date(+first + i * DAY), future = d > today;
      var cls = n ? 'on' : future ? 'future' : 'zero';
      return '<div class="dc-col" data-tip="' + esc(D.fmtDay(d.toISOString()) + ': ' + (future ? 'upcoming' : n + ' entr' + (n === 1 ? 'y' : 'ies'))) + '"><i class="' + cls + '" style="height:' + (n ? Math.max(n / max * 100, 4).toFixed(1) : 0) + '%"></i></div>';
    }).join('');
    var mid = Math.floor((days - 1) / 2);
    var xl = '<span>' + esc(D.fmtDate(first)) + '</span>' + (days > 2 ? '<span>' + esc(D.fmtDate(new Date(+first + mid * DAY))) + '</span>' : '') + (days > 1 ? '<span>' + esc(D.fmtDate(new Date(+first + (days - 1) * DAY))) + '</span>' : '');
    return '<div class="daychart" role="img" aria-label="Entries per day, up to ' + max + ' a day"><div class="dc-y num"><span>' + max + '</span><span>0</span></div><div class="dc-plot"><div class="dc-bars">' + bars + '</div><div class="dc-x">' + xl + '</div></div></div>';
  }

  /* ---------- Entry cards ---------- */
  function entryContent(e) {
    var h = '';
    if (e.type === 'weekly') {
      h += '<dl class="qa">' + D.WEEKLY_Q.filter(function (q) { return e[q[0]]; }).map(function (q) { return '<dt>' + esc(q[1]) + '</dt><dd>' + esc(e[q[0]]) + '</dd>'; }).join('') + '</dl>';
      if (e.tasks && e.tasks.length) h += '<div class="row" style="gap:6px"><span class="muted" style="font-size:.8rem">Tried:</span>' + e.tasks.map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>';
      var k = D.find(D.KEEP, e.keepUsing), tw = D.find(D.TRUST_WK, e.trust);
      h += '<div class="e-meta">' + (e.rating ? '<span class="pill">' + D.faceSVG(e.rating, 20) + 'Week overall: ' + esc(D.FEEL[e.rating]) + '</span>' : '') + (tw ? '<span>Trusted the answers: <b>' + esc(tw.label) + '</b></span>' : '') + (k ? '<span>Keep using: <b>' + esc(k.label) + '</b></span>' : '') + '</div>';
    } else if (e.type === 'bug') {
      var sv = D.find(D.SEVERITY, e.severity);
      h += '<div class="e-meta">' + (sv ? '<span class="pill"><span class="dot" style="--c:' + sv.c + '"></span>' + esc(sv.short) + '</span>' : '') + (e.area ? '<span>' + esc(e.area) + '</span>' : '') + '</div>';
      h += '<p>' + esc(e.what) + '</p>';
      if (e.steps) h += '<p class="ink2"><span class="muted">Trying to: </span>' + esc(e.steps) + '</p>';
    } else if (e.type === 'final') {
      var wu = D.find(D.WOULD_USE, e.wouldUse);
      h += '<div class="e-meta">' + (e.overall ? '<span class="pill">' + D.faceSVG(e.overall, 20) + 'Overall: ' + esc(D.FEEL[e.overall]) + '</span>' : '') + (e.nps != null && e.nps !== '' ? '<span>Recommend: <b>' + esc(e.nps) + '/10</b></span>' : '') + (e.ease ? '<span>Ease: <b>' + esc(D.EASE[e.ease]) + '</b></span>' : '') + (wu ? '<span>Would use: <b>' + esc(wu.label) + '</b></span>' : '') + '</div>';
      h += '<dl class="qa">' + D.FINAL_Q.filter(function (q) { return e[q[0]]; }).map(function (q) { return '<dt>' + esc(q[1]) + '</dt><dd>' + esc(e[q[0]]) + '</dd>'; }).join('') + '</dl>';
    }
    return h + D.mediaBlock(e);
  }
  function entryCard(e, opts) {
    opts = opts || {};
    var r = rs(e.id), tags = r.tags || [], c = cfg();
    var edited = e.updatedAt && e.createdAt && new Date(e.updatedAt) - new Date(e.createdAt) > 60000;
    var h = '<article class="entry"><div class="entry-gutter"><span class="d">' + esc(D.fmtDay(e.createdAt)) + '</span><span class="t">' + esc(D.fmtTime(e.createdAt)) + '</span><span class="w">Week ' + D.entryWeek(e, c) + '</span></div><div class="entry-body">';
    h += '<header class="e-head">' + avatarOf(e.uid) + '<span class="e-name">' + esc(nameOf(e.uid)) + '</span>' + D.teamChip(e.team, c) + '<span class="chip type-chip">' + esc(D.TYPE_LABEL[e.type] || e.type) + '</span>' + (e.test ? '<span class="chip">Test entry</span>' : '') + (e.removalRequested ? '<span class="chip flag">Removal requested</span>' : '') + (edited ? '<span class="muted" style="font-size:.76rem">edited ' + esc(D.rel(e.updatedAt)) + '</span>' : '');
    if (e.type === 'bug') { var st = D.find(D.BUG_STATUS, e.status || 'new'); h += '<span class="pill"><span class="dot" style="--c:' + st.c + '"></span>' + esc(st.label) + '</span>'; }
    h += '<button class="star" type="button" data-act="star" data-id="' + esc(e.id) + '" aria-pressed="' + (!!r.star) + '" aria-label="' + (r.star ? 'Remove star' : 'Star this entry') + '">' + (r.star ? STAR_ON : STAR) + '</button></header>';
    h += entryContent(e);
    if (!opts.noTools) {
      var id = esc(e.id);
      h += '<div class="e-tools">' + tags.map(function (t) { return '<span class="tag">' + esc(t) + '<button type="button" data-act="untag" data-id="' + id + '" data-tag="' + esc(t) + '" aria-label="Remove tag ' + esc(t) + '">×</button></span>'; }).join('');
      h += '<input class="input" list="tagList" placeholder="+ Add theme tag" data-tagfor="' + id + '" id="tag-' + id + '" aria-label="Add a theme tag">';
      if (e.type === 'bug') h += '<select class="input" style="width:auto;padding:4px 8px;font-size:.82rem" data-statusfor="' + id + '" id="st-' + id + '" aria-label="Problem status">' + D.BUG_STATUS.map(function (s) { return '<option value="' + s.v + '"' + ((e.status || 'new') === s.v ? ' selected' : '') + '>' + esc(s.label) + '</option>'; }).join('') + '</select>';
      if (e.type !== 'final') h += '<button class="btn small ' + (e.thanked ? 'ghost' : '') + '" type="button" data-act="thank" data-id="' + id + '"' + (e.thanked ? ' disabled' : '') + ' title="The participant sees a thank-you on this entry">' + icon('heart', 15) + '<span>' + (e.thanked ? 'Thanked' : 'Say thanks') + '</span></button>';
      h += '<button class="btn small ghost danger" type="button" data-act="del" data-id="' + id + '">Delete</button></div>';
    }
    return h + '</div></article>';
  }
  function tagDatalist() { return '<datalist id="tagList">' + allTags().map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join('') + '</datalist>'; }
  function kpi(label, value, sub, ico) { return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value num">' + (ico || '') + value + '</div><div class="kpi-sub">' + esc(sub) + '</div></div>'; }

  /* ---------- Views ---------- */
  var R = {};

  R.overview = {
    mount: function () {
      return '<div class="stack-lg"><div class="spread"><div><p class="eyebrow" id="ovEyebrow"></p><h1 style="margin-top:4px">How the beta is going</h1></div>' +
        '<label class="check" style="font-size:.85rem"><input type="checkbox" id="incTest" ' + (S.includeTest ? 'checked' : '') + '> Include research-team test entries</label></div><div id="ovBody"></div></div>';
    },
    after: function () { $('incTest').onchange = function () { S.includeTest = this.checked; scheduleUpdate(); }; },
    update: function () {
      var body = $('ovBody'); if (!body) return;
      var c = cfg(), entries = allEntries(), ids = participantIds(), cw = D.currentWeek(c);
      $('ovEyebrow').textContent = (c.title || 'Ask Me beta') + ' · ' + D.weekLine(c);
      var weekly = entries.filter(function (e) { return e.type === 'weekly'; });
      var weeklyNow = weekly.filter(function (e) { return D.entryWeek(e, c) === cw; });
      var checkedIn = ids.filter(function (u) { return D.checkinWeeks(logOf(u), c)[cw]; }).length;
      var ratings = ratingPoints(entries).map(function (p) { return p.v; }), ar = D.avg(ratings);
      var keepSet = weekly.filter(function (e) { return e.keepUsing; }), likely = keepSet.filter(function (e) { return +e.keepUsing >= 3; }).length;
      var trustSet = weekly.filter(function (e) { return e.trust && e.trust !== 'na'; }), trusted = trustSet.filter(function (e) { return e.trust === 'yes'; }).length;
      var bugs = entries.filter(function (e) { return e.type === 'bug'; }), open = bugs.filter(isOpen);
      var blockers = open.filter(function (e) { return e.severity === 'blocker'; }).length;
      var removal = entries.filter(function (e) { return e.removalRequested; }).length;
      var h = '';
      if (!c.startDate) h += '<div class="banner"><span>Set the beta start date so check-ins are grouped into the right weeks.</span><button class="btn small" type="button" data-act="tab" data-tab="settings">Open settings</button></div>';
      if (removal) h += '<div class="banner"><span>' + removal + ' entr' + (removal === 1 ? 'y has' : 'ies have') + ' a removal request from the participant.</span><button class="btn small" type="button" data-act="showRemoval">Review</button></div>';
      h += '<div class="kpis">' +
        kpi('Participants joined', ids.length, checkedIn + ' checked in this week') +
        kpi('Weekly check-ins', weekly.length, weeklyNow.length + ' for week ' + cw) +
        kpi('Average week rating', ar == null ? '—' : ar.toFixed(1) + '<small>/ 5</small>', ar == null ? 'No ratings yet' : D.FEEL[Math.round(ar)], ar == null ? '' : D.faceSVG(Math.round(ar), 26)) +
        kpi('Likely to keep using', keepSet.length ? D.pct(likely, keepSet.length) + '<small>%</small>' : '—', keepSet.length ? 'Definitely or probably, of ' + keepSet.length : 'No answers yet') +
        kpi('Trusted the answers', trustSet.length ? D.pct(trusted, trustSet.length) + '<small>%</small>' : '—', trustSet.length ? 'Said “mostly yes”, of ' + trustSet.length : 'No answers yet') +
        kpi('Open problems', open.length, blockers ? blockers + ' blocking work' : bugs.length + ' reported in total') + '</div>';
      h += '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>How the week felt</h2><p>Average check-in rating, by team</p></div>' + feelingChart(entries) + '</section>' +
        '<section class="panel"><div class="panel-head"><h2>Will they keep using it?</h2><p>Answers from every check-in</p></div>' + keepChart(entries) + '</section></div>';
      h += '<section class="panel"><div class="panel-head"><h2>Activity</h2><p>Check-ins and problem reports per day</p></div>' + dailyChart(entries) + '</section>';
      h += '<section class="panel"><div class="panel-head"><h2>Participants</h2><p>Anyone without this week’s check-in comes first, so you know who to nudge</p></div>' + participantTable(ids) + '</section>';
      body.innerHTML = h;
    }
  };
  function participantTable(ids) {
    if (!ids.length) return '<div class="empty"><h3>No one has joined yet</h3><p>Send the participant link from Settings. People appear here as soon as they sign in and pick their team.</p></div>';
    var c = cfg(), weeks = Math.max(D.weeksTotal(c), D.currentWeek(c)), cw = D.currentWeek(c);
    var rows = ids.map(function (u) {
      var log = logOf(u), p = S.people[u] || {}, st = D.statsFor(log, c), wk = D.checkinWeeks(log, c);
      var last = log[0] ? log[0].createdAt : null;
      var status = !last ? { t: 'Not started', c: 'var(--s-other)', o: 1 } : wk[cw] ? { t: 'Checked in', c: 'var(--good)', o: 2 } : { t: 'Check-in pending', c: 'var(--warn)', o: 0 };
      return { u: u, p: p, st: st, last: last, wk: wk, status: status, badges: D.earned(log, c).length };
    }).sort(function (a, b) { return a.status.o - b.status.o || String(a.last || '').localeCompare(String(b.last || '')); });
    var h = '<div class="table-wrap"><table><thead><tr><th>Person</th><th>Team</th><th>This week</th><th>Check-ins</th><th class="num">Problems</th><th class="num">With media</th><th>Last entry</th><th class="num">Badges</th><th>Final survey</th></tr></thead><tbody>';
    rows.forEach(function (r) {
      var wk = ''; for (var w = 1; w <= weeks; w++) wk += '<i class="' + (r.wk[w] ? 'on' : (w > cw ? 'future' : '')) + '" data-tip="Week ' + w + ': ' + (r.wk[w] ? 'done' : (w > cw ? 'upcoming' : 'missing')) + '"></i>';
      h += '<tr><td><span class="person">' + avatarOf(r.u) + '<span>' + esc(nameOf(r.u)) + (r.p.role ? ' <span class="muted" style="font-size:.8rem">· ' + esc(r.p.role) + '</span>' : '') + '<br><span class="muted" style="font-size:.76rem">' + esc(r.p.email || '') + '</span></span></span></td><td>' + D.teamChip(r.p.team, c) + '</td>' +
        '<td><span class="pill"><span class="dot" style="--c:' + r.status.c + '"></span>' + esc(r.status.t) + '</span></td><td><span class="wk">' + wk + '</span></td><td class="num">' + r.st.bugs + '</td><td class="num">' + r.st.media + '</td><td class="ink2" style="white-space:nowrap">' + esc(D.rel(r.last)) + '</td><td class="num">' + r.badges + ' / ' + D.BADGES.length + '</td><td>' + (r.st.final ? 'Done' : '<span class="muted">—</span>') + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  R.entries = {
    mount: function () {
      var f = S.filters, c = cfg(), weeks = Math.max(D.weeksTotal(c), D.currentWeek(c)), wo = '';
      function opt(v, l, cur) { return '<option value="' + esc(v) + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + esc(l) + '</option>'; }
      for (var w = 1; w <= weeks; w++) wo += opt(w, 'Week ' + w, f.week);
      return '<div class="stack"><div class="spread"><div><p class="eyebrow">Diary entries</p><h1 style="margin-top:4px">Everything participants sent</h1></div><p class="muted" id="feedMeta"></p></div>' +
        '<div class="filters" role="search">' +
        '<input class="input" type="search" id="fq" placeholder="Search entries" value="' + esc(f.q) + '" aria-label="Search entries">' +
        '<select class="input" id="ftype" aria-label="Entry type">' + opt('all', 'All types', f.type) + ['weekly', 'bug', 'final'].map(function (k) { return opt(k, D.TYPE_LABEL[k], f.type); }).join('') + '</select>' +
        '<select class="input" id="fteam" aria-label="Team">' + opt('all', 'All teams', f.team) + (c.teams || []).map(function (t) { return opt(t, t, f.team); }).join('') + '</select>' +
        '<select class="input" id="fweek" aria-label="Week">' + opt('all', 'All weeks', f.week) + wo + '</select>' +
        '<select class="input" id="ffeel" aria-label="Rating">' + opt('all', 'Any rating', f.feel) + opt('low', 'Frustrated or annoyed', f.feel) + opt('mid', 'Neutral', f.feel) + opt('high', 'Good or delighted', f.feel) + '</select>' +
        '<select class="input" id="fmedia" aria-label="Attachments">' + opt('all', 'Any attachments', f.media) + opt('any', 'Has media or link', f.media) + opt('video', 'Has video', f.media) + opt('image', 'Has screenshot', f.media) + opt('link', 'Has link', f.media) + '</select>' +
        '<select class="input" id="ftag" aria-label="Theme tag"></select>' +
        '<select class="input" id="fflag" aria-label="Flags">' + opt('all', 'Any flag', f.flag) + opt('star', 'Starred', f.flag) + opt('removal', 'Removal requested', f.flag) + '</select>' +
        '<button class="btn small ghost" type="button" data-act="clearFilters">Clear</button></div>' +
        '<div id="feed" class="stack"></div><div id="dl"></div></div>';
    },
    after: function () {
      var map = { fq: 'q', ftype: 'type', fteam: 'team', fweek: 'week', ffeel: 'feel', fmedia: 'media', ftag: 'tag', fflag: 'flag' };
      Object.keys(map).forEach(function (id) { var el = $(id); el.addEventListener(id === 'fq' ? 'input' : 'change', function () { S.filters[map[id]] = el.value; renderFeed(true); }); });
    },
    update: function (force) { renderFeed(force); }
  };
  function filterEntries(list) {
    var f = S.filters, q = f.q.trim().toLowerCase(), c = cfg();
    return list.filter(function (e) {
      if (f.type !== 'all' && e.type !== f.type) return false;
      if (f.team !== 'all' && e.team !== f.team) return false;
      if (f.week !== 'all' && D.entryWeek(e, c) !== +f.week) return false;
      if (f.feel !== 'all') { var v = +(e.rating || e.overall || 0); if (!v) return false; if (f.feel === 'low' && v > 2) return false; if (f.feel === 'mid' && v !== 3) return false; if (f.feel === 'high' && v < 4) return false; }
      if (f.media !== 'all') {
        var m = D.mediaOf(e), l = D.linksOf(e);
        if (f.media === 'any' && !m.length && !l.length) return false;
        if (f.media === 'video' && !m.some(function (x) { return x.kind === 'video'; })) return false;
        if (f.media === 'image' && !m.some(function (x) { return x.kind !== 'video'; })) return false;
        if (f.media === 'link' && !l.length) return false;
      }
      var r = rs(e.id);
      if (f.tag === '__none' && (r.tags || []).length) return false;
      if (f.tag !== 'all' && f.tag !== '__none' && (r.tags || []).indexOf(f.tag) < 0) return false;
      if (f.flag === 'star' && !r.star) return false;
      if (f.flag === 'removal' && !e.removalRequested) return false;
      if (q) { var hay = [e.what, e.steps, e.area, e.usedFor, e.oldWay, e.surprise, e.changeOne, (e.tasks || []).join(' '), e.best, e.worst, e.missing, nameOf(e.uid), (r.tags || []).join(' '), D.linksOf(e).join(' ')].join(' ').toLowerCase(); if (hay.indexOf(q) < 0) return false; }
      return true;
    });
  }
  function renderFeed(force) {
    var feed = $('feed'); if (!feed) return;
    var sel = $('ftag');
    if (sel && document.activeElement !== sel) {
      var cur = S.filters.tag;
      var h = '<option value="all">All tags</option><option value="__none"' + (cur === '__none' ? ' selected' : '') + '>Untagged</option>' + allTags().map(function (t) { return '<option value="' + esc(t) + '"' + (cur === t ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('');
      if (sel.innerHTML !== h) sel.innerHTML = h;
    }
    if (!force && (D.busyIn(feed) || D.videoPlaying(feed))) { S.deferred = true; return; }
    var all = allEntries(), list = filterEntries(all);
    $('feedMeta').textContent = list.length === all.length ? all.length + ' entries' : list.length + ' of ' + all.length + ' entries';
    $('dl').innerHTML = tagDatalist();
    if (!all.length) { feed.innerHTML = '<div class="empty"><h3>No entries yet</h3><p>Weekly check-ins and problem reports show up here newest first, with any recordings, screenshots or links. Tag entries with themes as you read them; the Insights tab groups them into a theme board.</p></div>'; return; }
    if (!list.length) { feed.innerHTML = '<div class="empty"><h3>Nothing matches these filters</h3><p>Try clearing a filter or searching for a different word.</p></div>'; return; }
    feed.innerHTML = list.slice(0, 300).map(function (e) { return entryCard(e); }).join('') + (list.length > 300 ? '<p class="muted">Showing the newest 300. Narrow the filters to see older entries.</p>' : '');
  }

  R.bugs = {
    mount: function () {
      var openOnly = true; try { openOnly = localStorage.getItem('bugsOpenOnly') !== '0'; } catch (e) { }
      return '<div class="stack"><div class="spread"><div><p class="eyebrow">Problems reported</p><h1 style="margin-top:4px">Bugs and blockers</h1></div><p class="muted" id="bugMeta"></p></div>' +
        '<div class="row"><label class="check" style="font-size:.85rem"><input type="checkbox" id="bugOpen" ' + (openOnly ? 'checked' : '') + '> Open problems only</label><span class="muted" style="font-size:.82rem">Status changes show up on the participant’s own entry.</span></div><div id="bugList" class="stack"></div><div id="dl"></div></div>';
    },
    after: function () { $('bugOpen').onchange = function () { try { localStorage.setItem('bugsOpenOnly', this.checked ? '1' : '0'); } catch (e) { } R.bugs.update(true); }; },
    update: function (force) {
      var el = $('bugList'); if (!el) return;
      if (!force && (D.busyIn(el) || D.videoPlaying(el))) { S.deferred = true; return; }
      var openOnly = $('bugOpen').checked, sev = { blocker: 0, major: 1, minor: 2 };
      var bugs = allEntries().filter(function (e) { return e.type === 'bug'; });
      var list = bugs.filter(function (e) { return !openOnly || isOpen(e); }).sort(function (a, b) {
        return (sev[a.severity] == null ? 3 : sev[a.severity]) - (sev[b.severity] == null ? 3 : sev[b.severity]) || String(b.createdAt).localeCompare(String(a.createdAt));
      });
      $('bugMeta').textContent = bugs.length + ' reported · ' + bugs.filter(isOpen).length + ' open';
      $('dl').innerHTML = tagDatalist();
      el.innerHTML = list.length ? list.map(function (e) { return entryCard(e); }).join('') : '<div class="empty"><h3>' + (bugs.length ? 'No open problems' : 'No problems reported yet') + '</h3><p>Participants report bugs from their diary, often with a screenshot or recording. Set each one’s status here as it moves through your dev team.</p></div>';
    }
  };

  R.insights = {
    mount: function () {
      return '<div class="stack-lg"><div><p class="eyebrow">Synthesis</p><h1 style="margin-top:4px">Themes and findings</h1></div>' +
        '<section class="panel"><div class="panel-head"><h2>Theme board</h2><p>Entries grouped by the theme tags you add in Entries and Problems</p></div><div id="board"></div></section>' +
        '<div class="grid-2"><section class="panel"><div class="panel-head"><h2>Weekly check-in answers</h2><p id="wkMeta"></p></div><div id="weeklyAns"></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>Final survey</h2><p id="finMeta"></p></div><div id="finalRes"></div></section></div>' +
        '<section class="panel"><div class="panel-head"><h2>Export</h2><p>Every entry with its tags, status and links, for Excel or a sprint review</p></div><div class="row"><button class="btn" type="button" data-act="exportCsv">Download CSV</button></div></section>' +
        '<section class="panel"><div class="panel-head"><h2>File storage</h2><p>Screenshots and recordings participants uploaded</p></div><div id="storageUse"></div></section></div>';
    },
    update: function () {
      var entries = allEntries(), board = $('board'), c = cfg(); if (!board) return;
      var su = $('storageUse');
      if (su) {
        var st = S.storage || { bytes: 0, files: 0 }, cap = 1024 * 1048576, frac = Math.min((st.bytes || 0) / cap, 1);
        su.innerHTML = '<p style="margin-bottom:8px"><b class="num">' + D.fmtSize(st.bytes || 0) + '</b> of 1 GB used · ' + (st.files || 0) + ' file' + (st.files === 1 ? '' : 's') + '</p>' +
          '<div style="height:10px;border-radius:5px;background:var(--surface-2);overflow:hidden"><div style="height:100%;width:' + (frac * 100).toFixed(1) + '%;background:' + (frac > .85 ? 'var(--crit)' : 'var(--accent)') + '"></div></div>' +
          '<p class="muted" style="font-size:.82rem;margin-top:8px">The free plan holds 1 GB. If it fills up, ask participants to paste OneDrive or SharePoint links for recordings, or delete entries you no longer need.</p>';
      }
      var tags = allTags(), cols = '';
      if (!tags.length) board.innerHTML = '<div class="empty"><h3>No themes yet</h3><p>As you read entries, add short theme tags such as “wrong numbers”, “slow answers” or “saved time on payroll report”. Each tag becomes a column here, like sticky notes on an affinity wall.</p></div>';
      else {
        tags.forEach(function (t) {
          var items = entries.filter(function (e) { return (rs(e.id).tags || []).indexOf(t) >= 0; });
          if (!items.length) return;
          var teams = {}; items.forEach(function (e) { teams[e.team] = 1; });
          cols += '<div class="col"><div class="col-head"><span>' + esc(t) + '</span><span class="chip num">' + items.length + '</span></div><div class="row" style="gap:4px">' + Object.keys(teams).map(function (tm) { return D.teamChip(tm, c); }).join('') + '</div>' +
            items.slice(0, 12).map(function (e) { var mm = D.mediaOf(e).length + D.linksOf(e).length; return '<div class="note">' + esc(snippet(e)) + '<div class="who">' + esc(nameOf(e.uid)) + ' · ' + esc(e.team || '') + ' · wk ' + D.entryWeek(e, c) + (mm ? ' · ' + mm + ' attachment' + (mm > 1 ? 's' : '') : '') + '</div></div>'; }).join('') + (items.length > 12 ? '<p class="muted" style="font-size:.8rem">+' + (items.length - 12) + ' more</p>' : '') + '</div>';
        });
        var untagged = entries.filter(function (e) { return e.type !== 'final' && !(rs(e.id).tags || []).length; }).length;
        board.innerHTML = '<div class="board">' + cols + '</div>' + (untagged ? '<p class="muted" style="margin-top:10px;font-size:.85rem">' + untagged + ' entries have no theme yet. <button class="linkish" type="button" data-act="showUntagged">Tag them in Entries</button></p>' : '');
      }
      var weekly = entries.filter(function (e) { return e.type === 'weekly'; });
      $('wkMeta').textContent = weekly.length + ' check-ins';
      var tc = {}; weekly.forEach(function (e) { (e.tasks || []).forEach(function (t) { tc[t] = (tc[t] || 0) + 1; }); });
      var tasksLine = Object.keys(tc).length ? '<p class="ink2" style="font-size:.88rem;margin-bottom:8px">What people tried: ' + Object.keys(tc).sort(function (a, b) { return tc[b] - tc[a]; }).map(function (t) { return esc(t) + ' <b class="num">' + tc[t] + '</b>'; }).join(' · ') + '</p>' : '';
      $('weeklyAns').innerHTML = weekly.length ? tasksLine + D.WEEKLY_Q.map(function (q) {
        var ans = weekly.filter(function (e) { return e[q[0]]; });
        return '<details class="qblock"><summary><span>' + esc(q[1]) + '</span><span class="chip num">' + ans.length + '</span></summary><ul class="answers">' + ans.map(function (e) { return '<li>' + esc(e[q[0]]) + '<div class="who">' + esc(nameOf(e.uid)) + ' · ' + esc(e.team || '') + ' · week ' + D.entryWeek(e, c) + '</div></li>'; }).join('') + '</ul></details>';
      }).join('') : '<div class="empty"><p>Check-in answers collect here each week, grouped by question, so you can read every “what did you still do the old way” answer side by side.</p></div>';
      var fin = entries.filter(function (e) { return e.type === 'final'; });
      $('finMeta').textContent = fin.length + ' responses' + (c.finalSurveyOpen ? ' · survey open' : ' · survey closed');
      if (!fin.length) { $('finalRes').innerHTML = '<div class="empty"><p>The final survey opens when you switch it on in Settings, usually in the last week. Results and the recommend score land here.</p></div>'; return; }
      var npsVals = fin.map(function (e) { return e.nps; }).filter(function (v) { return v !== '' && v != null; }).map(Number);
      var prom = npsVals.filter(function (v) { return v >= 9; }).length, det = npsVals.filter(function (v) { return v <= 6; }).length;
      var nps = npsVals.length ? Math.round((prom - det) / npsVals.length * 100) : null;
      var ov = D.avg(fin.map(function (e) { return +e.overall; }).filter(Boolean)), ez = D.avg(fin.map(function (e) { return +e.ease; }).filter(Boolean));
      var wu = D.WOULD_USE.map(function (o) { return { l: o.label, n: fin.filter(function (e) { return e.wouldUse === o.v; }).length }; });
      var h = '<div class="stat-line"><div><b class="num">' + (ov == null ? '—' : ov.toFixed(1)) + '</b><span>Satisfaction / 5</span></div><div><b class="num">' + (nps == null ? '—' : (nps > 0 ? '+' : '') + nps) + '</b><span>Recommend score (−100 to +100)</span></div><div><b class="num">' + (ez == null ? '—' : ez.toFixed(1)) + '</b><span>Ease / 5</span></div></div>';
      h += '<p style="margin-top:12px;font-size:.88rem" class="ink2">Would use it: ' + wu.map(function (w) { return esc(w.l) + ' <b class="num">' + w.n + '</b>'; }).join(' · ') + '</p>';
      h += D.FINAL_Q.map(function (q) { var ans = fin.filter(function (e) { return e[q[0]]; }); return '<details class="qblock"><summary><span>' + esc(q[1]) + '</span><span class="chip num">' + ans.length + '</span></summary><ul class="answers">' + ans.map(function (e) { return '<li>' + esc(e[q[0]]) + '<div class="who">' + esc(nameOf(e.uid)) + ' · ' + esc(e.team || '') + '</div></li>'; }).join('') + '</ul></details>'; }).join('');
      $('finalRes').innerHTML = h;
    }
  };
  function snippet(e) {
    var s = e.type === 'bug' ? e.what : e.type === 'weekly' ? (e.oldWay || e.surprise || e.changeOne || e.usedFor) : (e.worst || e.best || e.missing);
    s = String(s || ''); return s.length > 180 ? s.slice(0, 177) + '…' : s;
  }

  R.interviews = {
    mount: function () {
      return '<div class="stack"><div><p class="eyebrow">Debriefs</p><h1 style="margin-top:4px">Interview notes</h1><p class="ink2" style="margin-top:6px;max-width:68ch">Open someone’s diary next to your notes during the debrief call, and walk through their check-ins and recordings with them.</p></div>' +
        '<div class="split"><section class="panel" style="padding:8px"><div class="plist" id="plist"></div></section><section id="idetail"></section></div></div>';
    },
    after: function () { renderInterviewDetail(); },
    update: function () {
      var el = $('plist'); if (!el) return;
      var ids = participantIds();
      if (!ids.length) { el.innerHTML = '<p class="muted" style="padding:10px;font-size:.88rem">Participants appear here once they join.</p>'; return; }
      el.innerHTML = ids.map(function (u) {
        var iv = S.interviews[u] || {}, st = iv.status === 'done' ? 'Interviewed' : iv.status === 'scheduled' ? 'Scheduled' + (iv.date ? ' · ' + iv.date : '') : 'Not scheduled';
        return '<button class="pitem" type="button" data-act="pickInterview" data-uid="' + esc(u) + '" aria-current="' + (S.selInterview === u) + '">' + avatarOf(u) + '<span style="min-width:0"><span style="display:block;font-weight:600">' + esc(nameOf(u)) + '</span><span class="meta">' + esc((S.people[u] || {}).team || '') + ' · ' + esc(st) + '</span></span></button>';
      }).join('');
      var tl = $('itimeline');
      if (tl && S.selInterview && !D.videoPlaying(tl)) {
        var list = allEntries().filter(function (e) { return e.uid === S.selInterview; });
        tl.innerHTML = list.length ? list.map(function (e) { return entryCard(e, { noTools: true }); }).join('') : '<p class="muted">No entries from this person yet.</p>';
      }
    }
  };
  function renderInterviewDetail() {
    var el = $('idetail'); if (!el) return;
    var u = S.selInterview;
    if (!u) { el.innerHTML = '<div class="empty"><h3>Pick a participant</h3><p>Their diary opens alongside a notes area and a short interview guide. Notes are only visible to the research team.</p></div>'; return; }
    var iv = S.interviews[u] || {}, p = S.people[u] || {};
    el.innerHTML = '<div class="stack"><section class="panel stack"><div class="row"><h2>' + esc(nameOf(u)) + '</h2>' + D.teamChip(p.team, cfg()) + '<span class="muted" style="font-size:.85rem">' + esc(p.email || '') + '</span></div>' +
      '<div class="row"><div class="field" style="flex:1 1 180px"><label for="ivStatus">Status</label><select class="input" id="ivStatus">' + [['todo', 'Not scheduled'], ['scheduled', 'Scheduled'], ['done', 'Interviewed']].map(function (o) { return '<option value="' + o[0] + '"' + ((iv.status || 'todo') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></div>' +
      '<div class="field" style="flex:1 1 180px"><label for="ivDate">Date</label><input class="input" type="date" id="ivDate" value="' + esc(iv.date || '') + '"></div></div>' +
      '<div class="field"><label for="ivNotes">Notes</label><textarea class="input" id="ivNotes" style="min-height:180px" placeholder="Key quotes, what surprised you, follow-ups…">' + esc(iv.notes || '') + '</textarea></div>' +
      '<div class="row"><button class="btn primary" type="button" data-act="saveInterview">Save notes</button><span class="muted" id="ivSaved" style="font-size:.85rem">' + (iv.updatedAt ? 'Saved ' + esc(D.rel(iv.updatedAt)) : '') + '</span></div>' +
      '<details><summary style="cursor:pointer;font-weight:600">Interview guide (30–45 min)</summary><ol class="guide" style="margin-top:10px">' +
      ['Walk me through a typical week with Ask Me. When did you reach for it?', 'Let’s open one of your check-ins or recordings. What were you trying to find out, and what happened next?', 'When did you go back to Excel, a report or a colleague instead? What tipped it?', 'How did you decide whether to trust an answer? What would make you trust it more?', 'What did your HR or Finance work need that Ask Me didn’t handle?', 'If Ask Me disappeared tomorrow, what would you miss? What wouldn’t you miss?', 'Anything we didn’t ask that we should have?'].map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></details></section>' +
      '<section class="panel"><div class="panel-head"><h2>Their diary</h2><p>Newest first</p></div><div class="timeline" id="itimeline"></div></section></div>';
  }

  R.settings = {
    mount: function () {
      var c = cfg(), diaryUrl = location.origin + X.base, adminUrl = location.origin + X.base + 'admin';
      var invite = 'Hi! You’re part of the ' + (c.title || 'Ask Me beta') + '. For the next ' + D.weeksTotal(c) + ' weeks, please keep a short diary of using Ask Me:\n\n• Every week (Friday is best), fill in the 5-minute check-in: what you used Ask Me for, what you still did the old way, and what you’d change.\n• Report any problem as soon as you hit it. A screenshot or short screen recording helps a lot, or paste a OneDrive or SharePoint link.\n• You can go back and edit your entries any time.\n\nSign in with your usual Microsoft work account. Please don’t include salaries, employee details or financial figures in text, screenshots or videos. Only the research team can see your entries.\n\nOpen your diary: ' + diaryUrl;
      return '<div class="stack-lg narrow"><div><p class="eyebrow">Study setup</p><h1 style="margin-top:4px">Settings</h1></div>' +
        '<section class="panel stack"><h2>Your two links</h2>' +
        '<div class="field"><span class="label">Participant diary</span><span class="hint">Send this to everyone taking part. They sign in with Microsoft and only ever see their own diary.</span><div class="link-add"><input class="input" readonly value="' + esc(diaryUrl) + '"><button class="btn" type="button" data-act="copy" data-text="' + esc(diaryUrl) + '">Copy</button></div></div>' +
        '<div class="field"><span class="label">Admin dashboard</span><span class="hint">For the research and tracking team. Only people on the admin list can open it. Add or remove admins in Supabase (see “Adding admins” in the README).</span><div class="link-add"><input class="input" readonly value="' + esc(adminUrl) + '"><button class="btn" type="button" data-act="copy" data-text="' + esc(adminUrl) + '">Copy</button></div></div></section>' +
        '<section class="panel"><form class="form" id="setForm" novalidate>' +
        '<div class="field"><label for="sTitle">Study name</label><input class="input" id="sTitle" value="' + esc(c.title) + '"></div>' +
        '<div class="row" style="align-items:flex-start"><div class="field" style="flex:1 1 200px"><label for="sStart">Beta start date</label><input class="input" type="date" id="sStart" value="' + esc(c.startDate) + '"><span class="hint">Check-ins are grouped into weeks from this date.</span></div>' +
        '<div class="field" style="flex:1 1 140px"><label for="sWeeks">Length in weeks</label><input class="input" type="number" min="1" max="26" id="sWeeks" value="' + esc(D.weeksTotal(c)) + '"></div></div>' +
        '<div class="field"><label for="sTeams">Teams</label><input class="input" id="sTeams" value="' + esc((c.teams || []).join(', ')) + '"><span class="hint">Comma-separated. The first three get their own chart colors; participants pick one when they join.</span></div>' +
        '<div class="field"><label for="sMsg">Message to participants</label><textarea class="input" id="sMsg" placeholder="e.g. Thanks for 25 check-ins in week 1! We fixed the slow chart loading you reported. This week, try asking follow-up questions.">' + esc(c.message || '') + '</textarea><span class="hint">Shows at the top of every participant’s diary. Use it to close the loop on what you heard and fixed.</span></div>' +
        '<label class="check"><input type="checkbox" id="sFinal" ' + (c.finalSurveyOpen ? 'checked' : '') + '> <span><b>Open the final survey</b><br><span class="muted">Adds the end-of-beta survey to every participant’s diary. Switch it on in the last week.</span></span></label>' +
        '<div class="row"><button class="btn primary" type="submit">Save settings</button><span class="form-error" id="setErr" role="alert"></span></div></form></section>' +
        '<section class="panel stack"><h2>Invite message</h2><textarea class="input copybox" id="inviteText" aria-label="Invite message">' + esc(invite) + '</textarea><div class="row"><button class="btn" type="button" data-act="copyInvite">Copy message</button></div></section>' +
        '<section class="panel stack"><h2>Editing and removing entries</h2><p class="ink2">Participants can edit their entries at any time but can’t delete them. If someone shares something by mistake, they ask for it to be removed; it shows up flagged in Overview and Entries, and you delete it there. Deleting also removes its uploaded files.</p></section></div>';
    },
    after: function () {
      $('setForm').onsubmit = async function (ev) {
        ev.preventDefault();
        var body = { title: $('sTitle').value.trim(), startDate: $('sStart').value, weeks: parseInt($('sWeeks').value, 10), teams: $('sTeams').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean), message: $('sMsg').value.trim(), finalSurveyOpen: $('sFinal').checked };
        $('setErr').textContent = '';
        try { await X.adminSaveConfig(body); await refresh(); renderTop(); D.toast('Settings saved'); }
        catch (e) { $('setErr').textContent = e.message; }
      };
    }
  };

  /* ---------- Events ---------- */
  document.addEventListener('click', async function (ev) {
    var t = ev.target.closest('[data-act]'); if (!t) return;
    var a = t.getAttribute('data-act'), id = t.getAttribute('data-id');
    if (a === 'tab') { S.tab = t.getAttribute('data-tab'); try { localStorage.setItem('adminTab', S.tab); } catch (e) { } mount(); }
    else if (a === 'clearFilters') { S.filters = blankFilters(); mount(); }
    else if (a === 'showUntagged') { S.filters = blankFilters(); S.filters.tag = '__none'; S.tab = 'entries'; mount(); }
    else if (a === 'showRemoval') { S.filters = blankFilters(); S.filters.flag = 'removal'; S.tab = 'entries'; mount(); }
    else if (a === 'star') { var r = rs(id); act(X.adminSaveResearch(id, r.tags || [], !r.star)); }
    else if (a === 'untag') { var r2 = rs(id), tag = t.getAttribute('data-tag'); act(X.adminSaveResearch(id, (r2.tags || []).filter(function (x) { return x !== tag; }), !!r2.star)); }
    else if (a === 'thank') { t.disabled = true; act(X.adminThank(id), 'They’ll see your thanks on their entry'); }
    else if (a === 'del') { if (!D.arm(t, 'Click again to delete for good')) return; t.disabled = true; act(X.adminDelete(id), 'Entry deleted'); }
    else if (a === 'pickInterview') { S.selInterview = t.getAttribute('data-uid'); renderInterviewDetail(); R.interviews.update(); }
    else if (a === 'saveInterview') {
      var u = S.selInterview; if (!u) return;
      t.disabled = true;
      var ok = await act(X.adminSaveInterview(u, $('ivStatus').value, $('ivDate').value, $('ivNotes').value));
      if (ok && $('ivSaved')) $('ivSaved').textContent = 'Saved just now';
      t.disabled = false;
    }
    else if (a === 'copy') D.copyText(t.getAttribute('data-text'));
    else if (a === 'copyInvite') D.copyText($('inviteText').value);
    else if (a === 'exportCsv') exportCsv();
    else if (a === 'signout') X.signOut();
  });
  document.addEventListener('keydown', function (ev) {
    var el = ev.target;
    if (ev.key === 'Enter' && el.matches && el.matches('[data-tagfor]')) {
      ev.preventDefault();
      var id = el.getAttribute('data-tagfor'), v = el.value.trim().toLowerCase().slice(0, 40);
      if (!v) return;
      var r = rs(id), tags = (r.tags || []).slice(); if (tags.indexOf(v) < 0) tags.push(v);
      el.value = ''; el.blur();
      act(X.adminSaveResearch(id, tags, !!r.star));
    }
  });
  document.addEventListener('change', function (ev) {
    var el = ev.target;
    if (el.matches && el.matches('[data-statusfor]')) { el.blur(); act(X.adminSetStatus(el.getAttribute('data-statusfor'), el.value), 'Status updated'); }
  });
  document.addEventListener('focusout', function () { if (S.deferred) { S.deferred = false; setTimeout(scheduleUpdate, 150); } });

  /* ---------- CSV export ---------- */
  function exportCsv() {
    var c = cfg();
    var L = {
      trust: { yes: 'Mostly yes', mixed: 'Mixed', no: 'Mostly no', na: 'Didn’t rely on its answers' },
      keep: { 4: 'Definitely', 3: 'Probably', 2: 'Not sure', 1: 'Probably not' },
      status: { new: 'New', logged: 'Logged for dev', fixed: 'Fixed', wontfix: 'Won’t fix' },
      use: { daily: 'Daily', weekly: 'A few times a week', monthly: 'Now and then', rarely: 'Rarely or never' }
    };
    var head = ['entry_id', 'participant', 'email', 'team', 'type', 'created_at', 'updated_at', 'week', 'week_rating_1to5', 'tasks_tried', 'used_for', 'old_way', 'surprise', 'change_one', 'trusted_answers', 'keep_using', 'problem', 'problem_context', 'problem_area', 'severity', 'problem_status', 'final_overall_1to5', 'final_recommend_0to10', 'final_ease_1to5', 'final_would_use', 'final_best', 'final_worst', 'final_missing', 'videos', 'images', 'links', 'theme_tags', 'starred', 'thanked', 'removal_requested', 'research_team_test'];
    var rows = [head];
    S.entries.slice().reverse().forEach(function (e) {
      var p = S.people[e.uid] || {}, r = rs(e.id), m = D.mediaOf(e);
      rows.push([e.id, p.name, p.email, e.team, D.TYPE_LABEL[e.type] || e.type, e.createdAt, e.updatedAt, D.entryWeek(e, c), e.rating, (e.tasks || []).join('; '), e.usedFor, e.oldWay, e.surprise, e.changeOne, L.trust[e.trust], L.keep[e.keepUsing], e.what, e.steps, e.area, e.severity, e.type === 'bug' ? L.status[e.status] : '', e.overall, e.nps, e.ease, L.use[e.wouldUse], e.best, e.worst, e.missing,
        m.filter(function (x) { return x.kind === 'video'; }).length || '', m.filter(function (x) { return x.kind !== 'video'; }).length || '', D.linksOf(e).join(' '), (r.tags || []).join('; '), r.star ? 'yes' : '', e.thanked ? 'yes' : '', e.removalRequested ? 'yes' : '', p.researcher ? 'yes' : '']);
    });
    var csv = '﻿' + rows.map(function (row) { return row.map(function (v) { v = v == null ? '' : String(v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    var a = document.createElement('a'); a.href = url; a.download = 'ask-me-beta-diary-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    D.toast('CSV downloaded');
  }

  /* ---------- Start ---------- */
  D.initOverlays();
  (async function start() {
    await X.requireSession(true);
    var who = await X.whoami();
    S.me = { id: who.id, name: who.name, email: who.email };
    renderTop();
    $('tabs').hidden = true;
    if (!who.isAdmin) {
      D.blocked('This page is for the research team', 'You’re signed in as ' + (who.email || 'an account') + ', which isn’t on the research team list. If you’re taking part in the beta, your diary is one click away.', '<a class="btn primary" href="./">Open my diary</a>');
      return;
    }
    $('tabs').hidden = false;
    await refresh();
    mount();
  })().catch(function (e) {
    if (e && e.message === 'not configured') return;
    main.innerHTML = '<div class="narrow center"><div class="empty"><h3>The dashboard didn’t load</h3><p>' + esc(e.message) + '</p><p style="margin-top:8px"><a href="admin">Try again</a></p></div></div>';
  });  // Keep the dashboard fresh while it's open.
  setInterval(function () {
    if (document.visibilityState !== 'visible' || !S.loaded) return;
    refresh().then(scheduleUpdate).catch(function () { });
  }, 30000);
})();
