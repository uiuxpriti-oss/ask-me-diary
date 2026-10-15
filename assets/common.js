/* Shared helpers for the participant diary and the admin dashboard. Exposes window.D. */
(function () {
  'use strict';
  var D = window.D = {};

  /* ---------- Study vocabulary ---------- */
  D.FEEL = { 1: 'Frustrated', 2: 'Annoyed', 3: 'Neutral', 4: 'Good', 5: 'Delighted' };
  D.TRUST_WK = [{ v: 'yes', label: 'Mostly yes' }, { v: 'mixed', label: 'Mixed' }, { v: 'no', label: 'Mostly no' }, { v: 'na', label: 'Didn’t rely on its answers' }];
  D.TASK_TYPES = ['Quick data questions', 'Multi-step analysis', 'Charts or visuals', 'CSV / Excel files', 'Reports or summaries', 'Something else'];
  D.BUG_AREAS = ['Asking a question', 'Answer accuracy', 'Charts & visuals', 'Data sources & uploads', 'Speed', 'Sharing & export', 'Login & access', 'Other'];
  D.SEVERITY = [
    { v: 'blocker', label: 'Blocks my work', short: 'Blocker', c: 'var(--crit)' },
    { v: 'major', label: 'Annoying, but there’s a workaround', short: 'Major', c: 'var(--serious)' },
    { v: 'minor', label: 'Minor or cosmetic', short: 'Minor', c: 'var(--s-other)' }
  ];
  D.BUG_STATUS = [
    { v: 'new', label: 'New', c: 'var(--warn)' }, { v: 'logged', label: 'Logged for dev', c: 'var(--s1)' },
    { v: 'fixed', label: 'Fixed', c: 'var(--good)' }, { v: 'wontfix', label: 'Won’t fix', c: 'var(--s-other)' }
  ];
  D.KEEP = [{ v: 4, label: 'Definitely', c: 'var(--div-2)' }, { v: 3, label: 'Probably', c: 'var(--div-1)' }, { v: 2, label: 'Not sure', c: 'var(--div-0)' }, { v: 1, label: 'Probably not', c: 'var(--crit)' }];
  D.WOULD_USE = [{ v: 'daily', label: 'Daily' }, { v: 'weekly', label: 'A few times a week' }, { v: 'monthly', label: 'Now and then' }, { v: 'rarely', label: 'Rarely or never' }];
  D.EASE = { 1: 'Very hard', 2: 'Hard', 3: 'Okay', 4: 'Easy', 5: 'Very easy' };
  D.WEEKLY_Q = [
    ['usedFor', 'What did you use Ask Me for this week?'],
    ['oldWay', 'What did you still do the old way, and why?'],
    ['surprise', 'What surprised you, good or bad?'],
    ['changeOne', 'If you could change one thing, what would it be?']
  ];
  D.FINAL_Q = [['best', 'What worked best for you?'], ['worst', 'What got in your way the most?'], ['missing', 'What’s missing that would make you use it every day?']];
  D.TYPE_LABEL = { weekly: 'Weekly check-in', bug: 'Problem', final: 'Final survey' };

  D.ICONS = {
    note: '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13.5 6.5l3 3"/>',
    pages: '<rect x="6" y="4" width="12" height="16" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>',
    bug: '<rect x="7" y="8" width="10" height="12" rx="5"/><path d="M9 8a3 3 0 0 1 6 0M4 12h3M17 12h3M4 18l3-1.5M20 18l-3-1.5M12 11v8"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 9.5v5l4.5-2.5z"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    calendar: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M9 15l2 2 4-4"/>',
    flag: '<path d="M6 21V4M6 4h11l-2 4 2 4H6"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M9 20h6"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    chat: '<path d="M5 6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6l-4 3.5V16H7a2 2 0 0 1-2-2z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'
  };
  D.BRAND_SVG = '<svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><path d="M5 7a3 3 0 0 1 3-3h18a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H14l-6 5v-5H8a3 3 0 0 1-3-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M11 19v-4M15.5 19v-8M20 19v-5.5M24 19v-2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';

  /* ---------- Formatting ---------- */
  D.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var esc = D.esc;
  D.icon = function (name, size, sw) { return '<svg width="' + (size || 22) + '" height="' + (size || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + D.ICONS[name] + '</svg>'; };
  D.faceSVG = function (v, size) {
    size = size || 26; v = +v || 3;
    var mouth = v === 3 ? 'M8.5 15.5 H15.5' : (v < 3 ? 'M8.5 16.5 Q12 ' + (16.5 + (v - 3) * 2.2) + ' 15.5 16.5' : 'M8.5 14.5 Q12 ' + (14.5 + (v - 3) * 2.2) + ' 15.5 14.5');
    return '<svg class="face" viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="8.6" cy="9.6" r="1.2" fill="currentColor"/><circle cx="15.4" cy="9.6" r="1.2" fill="currentColor"/><path d="' + mouth + '" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  };
  D.find = function (list, v) { for (var i = 0; i < list.length; i++) if (String(list[i].v) === String(v)) return list[i]; return null; };
  D.avg = function (a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; };
  D.pct = function (n, d) { return d ? Math.round(n / d * 100) : 0; };
  D.nowIso = function () { return new Date().toISOString(); };
  D.parseDay = function (s) { if (!s) return null; var p = String(s).split('-'); if (p.length !== 3) return null; return new Date(+p[0], +p[1] - 1, +p[2]); };
  D.dayKey = function (d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  D.weeksTotal = function (cfg) { var w = parseInt(cfg.weeks, 10); return w > 0 && w < 53 ? w : 4; };
  D.weekOf = function (iso, cfg) { var start = D.parseDay(cfg.startDate); if (!start) return 1; var w = Math.floor((new Date(iso) - start) / (7 * 864e5)) + 1; return w < 1 ? 1 : w; };
  D.entryWeek = function (e, cfg) { return +e.week || D.weekOf(e.createdAt, cfg); };
  D.currentWeek = function (cfg) { return D.weekOf(D.nowIso(), cfg); };
  D.weekLine = function (cfg) {
    var start = D.parseDay(cfg.startDate);
    if (!start) return D.weeksTotal(cfg) + '-week beta';
    if (new Date() < start) return 'starts ' + D.fmtDate(start);
    var w = D.currentWeek(cfg), t = D.weeksTotal(cfg);
    return w > t ? 'week ' + w + ' (planned ' + t + ')' : 'week ' + w + ' of ' + t;
  };
  D.fmtDay = function (iso) { return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }); };
  D.fmtTime = function (iso) { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); };
  D.fmtDate = function (d) { return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }); };
  D.fmtSize = function (b) { return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; };
  D.rel = function (iso) {
    if (!iso) return '—';
    var s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago'; var d = Math.floor(s / 86400);
    return d === 1 ? 'yesterday' : d + ' days ago';
  };
  D.safeUrl = function (u) {
    u = String(u || '').trim(); if (!u) return null;
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    try { var x = new URL(u); if (x.protocol !== 'https:' && x.protocol !== 'http:') return null; if (!/\./.test(x.hostname)) return null; return x.href; } catch (e) { return null; }
  };
  D.hostOf = function (u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  D.teamColor = function (team, cfg) { var i = (cfg.teams || []).indexOf(team); return i === 0 ? 'var(--s1)' : i === 1 ? 'var(--s2)' : i === 2 ? 'var(--s3)' : 'var(--s-other)'; };
  D.teamChip = function (team, cfg) { return team ? '<span class="chip team-chip" style="--c:' + D.teamColor(team, cfg) + '">' + esc(team) + '</span>' : ''; };
  var AV = ['#2f6f9f', '#a3542a', '#2d7a5a', '#7a5aa8', '#9c4a6b', '#4a6a2a', '#5a6170', '#1f6d70'];
  D.avatar = function (name, id) {
    var n = String(name || '?').trim(), parts = n.split(/\s+/), ini = (parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '');
    var h = 0, s = String(id || n); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return '<span class="av" style="--c:' + AV[h % AV.length] + '" aria-hidden="true">' + esc(ini.toUpperCase()) + '</span>';
  };
  D.mediaOf = function (e) { return (e.media || []).slice(); };
  D.linksOf = function (e) { return (e.links || []).filter(function (u) { return !!D.safeUrl(u); }); };
  D.mediaBlock = function (e) {
    var media = D.mediaOf(e), links = D.linksOf(e);
    if (!media.length && !links.length) return '';
    var h = '';
    if (media.length) {
      h += '<div class="media-row">';
      media.forEach(function (m) {
        var src = esc(m.url || '');
        if (!m.url) h += '<span class="thumb" style="display:grid;place-items:center;font-size:.75rem;color:var(--muted);cursor:default">File unavailable</span>';
        else if (m.kind === 'video') h += '<video class="vid" src="' + src + '" controls preload="metadata" playsinline aria-label="Screen recording"></video>';
        else h += '<button class="thumb" type="button" data-act="zoom" data-src="' + src + '" aria-label="Open screenshot"><img src="' + src + '" alt="Screenshot" loading="lazy"></button>';
      });
      h += '</div>';
    }
    if (links.length) h += '<div class="media-row">' + links.map(function (u) { var s = D.safeUrl(u); return '<a class="linkcard" href="' + esc(s) + '" target="_blank" rel="noopener noreferrer">' + D.icon('link', 16) + '<span>' + esc(D.hostOf(s)) + ' · ' + esc(s.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)) + '</span></a>'; }).join('') + '</div>';
    return h;
  };

  /* ---------- Form pieces ---------- */
  D.choiceGroup = function (name, items, selected, cls) {
    return '<div class="choices ' + (cls || '') + '" role="radiogroup">' + items.map(function (it, i) {
      var v = typeof it === 'object' ? it.v : it, label = typeof it === 'object' ? it.label : it;
      return '<label class="choice"><input type="radio" name="' + name + '" id="' + name + '-' + i + '" value="' + esc(v) + '"' + (String(selected) === String(v) ? ' checked' : '') + '><span>' + esc(label) + '</span></label>';
    }).join('') + '</div>';
  };
  D.checkGroup = function (name, items, selected) {
    selected = selected || [];
    return '<div class="choices">' + items.map(function (v, i) {
      return '<label class="choice"><input type="checkbox" name="' + name + '" id="' + name + '-' + i + '" value="' + esc(v) + '"' + (selected.indexOf(v) >= 0 ? ' checked' : '') + '><span>' + esc(v) + '</span></label>';
    }).join('') + '</div>';
  };
  D.faceGroup = function (name, selected) {
    return '<div class="faces" role="radiogroup">' + [1, 2, 3, 4, 5].map(function (v) {
      return '<label class="choice"><input type="radio" name="' + name + '" id="' + name + '-' + v + '" value="' + v + '"' + (String(selected) === String(v) ? ' checked' : '') + '><span>' + D.faceSVG(v, 26) + esc(D.FEEL[v]) + '</span></label>';
    }).join('') + '</div>';
  };
  D.radioVal = function (form, name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; };
  D.checkVals = function (form, name) { return Array.prototype.map.call(form.querySelectorAll('input[name="' + name + '"]:checked'), function (el) { return el.value; }); };

  /* ---------- Badges ---------- */
  D.checkinWeeks = function (log, cfg) { var w = {}; log.forEach(function (e) { if (e.type === 'weekly') w[D.entryWeek(e, cfg)] = true; }); return w; };
  D.statsFor = function (log, cfg) {
    return {
      total: log.length,
      weeklies: Object.keys(D.checkinWeeks(log, cfg)).length,
      bugs: log.filter(function (e) { return e.type === 'bug'; }).length,
      media: log.filter(function (e) { return D.mediaOf(e).length || D.linksOf(e).length; }).length,
      thorough: log.some(function (e) { return e.type === 'weekly' && D.WEEKLY_Q.every(function (q) { return e[q[0]]; }); }),
      final: log.some(function (e) { return e.type === 'final'; })
    };
  };
  D.BADGES = [
    { id: 'first', name: 'First note', desc: 'Send your first check-in or report', icon: 'note', test: function (s) { return s.total >= 1; } },
    { id: 'checkin', name: 'Check-in regular', desc: 'Do 2 weekly check-ins', icon: 'calendar', test: function (s) { return s.weeklies >= 2; } },
    { id: 'full', name: 'Full house', desc: 'Check in every week of the beta', icon: 'trophy', test: function (s, cfg) { return s.weeklies >= D.weeksTotal(cfg); } },
    { id: 'thorough', name: 'Storyteller', desc: 'Answer every question in a check-in', icon: 'pages', test: function (s) { return s.thorough; } },
    { id: 'bug', name: 'Bug hunter', desc: 'Report a problem', icon: 'bug', test: function (s) { return s.bugs >= 1; } },
    { id: 'sharp', name: 'Sharp eye', desc: 'Report 3 problems', icon: 'eye', test: function (s) { return s.bugs >= 3; } },
    { id: 'show', name: 'Show & tell', desc: 'Add a video, screenshot or link', icon: 'play', test: function (s) { return s.media >= 1; } },
    { id: 'final', name: 'Finisher', desc: 'Complete the final survey', icon: 'flag', test: function (s) { return s.final; } }
  ];
  D.earned = function (log, cfg) { var s = D.statsFor(log, cfg); return D.BADGES.filter(function (b) { return b.test(s, cfg); }).map(function (b) { return b.id; }); };

  /* ---------- UI bits ---------- */
  // Full-page message for people who can't use this page (wrong account, not on the admin list).
  D.blocked = function (title, text, actionsHtml) {
    var m = document.getElementById('main');
    m.innerHTML = '<div class="narrow center" style="padding-top:24px"><div class="empty stack"><p class="eyebrow">Ask Me beta</p><h1>' + esc(title) + '</h1><p>' + esc(text) + '</p><div class="row">' + (actionsHtml || '') + '<button class="btn ghost" type="button" data-act="signout">Sign out</button></div></div></div>';
  };
  D.toast = function (msg) {
    var t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show'); clearTimeout(D.toast._t);
    D.toast._t = setTimeout(function () { t.classList.remove('show'); }, 2800);
  };
  D.arm = function (btn, label) {
    if (btn.classList.contains('armed')) return true;
    var orig = btn.innerHTML; btn.classList.add('armed'); btn.textContent = label;
    setTimeout(function () { if (btn.isConnected && btn.classList.contains('armed')) { btn.classList.remove('armed'); btn.innerHTML = orig; } }, 4000);
    return false;
  };
  D.busyIn = function (el) { var a = document.activeElement; return !!(el && a && el !== a && el.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  D.videoPlaying = function (el) { return !!el && Array.prototype.some.call(el.querySelectorAll('video'), function (v) { return !v.paused; }); };
  D.copyText = async function (text) {
    try { await navigator.clipboard.writeText(text); D.toast('Copied'); return true; } catch (e) { D.toast('Couldn’t copy automatically. Select the text and copy it.'); return false; }
  };
  D.confetti = function () {
    var colors = ['var(--accent)', 'var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--warn)', 'var(--hl)'], h = '';
    for (var i = 0; i < 30; i++) h += '<i class="cf" style="--c:' + colors[i % colors.length] + ';left:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (1.4 + Math.random()).toFixed(2) + 's;--delay:' + (Math.random() * .35).toFixed(2) + 's;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg"></i>';
    return h;
  };
  D.initOverlays = function () {
    var lb = document.getElementById('lightbox');
    if (lb) {
      lb.addEventListener('click', function (ev) { if (ev.target.tagName !== 'IMG') lb.hidden = true; });
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') lb.hidden = true; });
    }
    document.addEventListener('click', function (ev) {
      var t = ev.target.closest && ev.target.closest('[data-act="zoom"]'); if (!t || !lb) return;
      document.getElementById('lightboxImg').src = t.getAttribute('data-src'); lb.hidden = false; document.getElementById('lightboxClose').focus();
    });
    document.addEventListener('error', function (ev) {
      var img = ev.target; if (!img || img.tagName !== 'IMG' || !img.parentNode || !img.parentNode.classList || !img.parentNode.classList.contains('thumb')) return;
      var b = img.parentNode; b.removeAttribute('data-act'); b.style.cursor = 'default'; b.style.fontSize = '.75rem'; b.style.color = 'var(--muted)'; b.textContent = 'Image unavailable';
    }, true);
    var tip = document.getElementById('tip');
    if (tip) {
      document.addEventListener('mouseover', function (ev) { var el = ev.target.closest && ev.target.closest('[data-tip]'); if (!el) { tip.hidden = true; return; } tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; });
      document.addEventListener('mousemove', function (ev) { if (tip.hidden) return; var x = ev.clientX + 14, y = ev.clientY + 14, w = tip.offsetWidth, hh = tip.offsetHeight; if (x + w > window.innerWidth - 8) x = ev.clientX - w - 10; if (y + hh > window.innerHeight - 8) y = ev.clientY - hh - 10; tip.style.left = x + 'px'; tip.style.top = y + 'px'; });
      document.addEventListener('scroll', function () { tip.hidden = true; }, true);
    }
  };
})();
