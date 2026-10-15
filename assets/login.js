(function () {
  'use strict';
  var q = new URLSearchParams(location.search);
  var admin = q.get('for') === 'admin';
  var returnTo = admin ? 'admin' : '';
  function set(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  if (admin) {
    document.title = 'Sign in · Ask Me Beta Admin';
    set('eyebrow', 'Ask Me beta · research team');
    set('title', 'Your research hub is ready.');
    set('lead', 'See every check-in, recording and problem as it comes in, track issues to fixed, and plan your debriefs.');
    set('secureText', 'Secure sign-in with your Lumenore work account. Only people on the research team list can open the dashboard.');
    set('artTitle', 'Everything your beta testers tell you, in one place.');
    set('artText', 'Weekly check-ins, problem reports with recordings, and the trends across HR, Finance and internal teams.');
  }
  var box = document.getElementById('err');
  function showError(text) { box.textContent = text; box.hidden = false; }
  var e = q.get('error');
  if (e) {
    showError(/denied|cancel/i.test(e)
      ? 'Sign-in was cancelled. Try again when you’re ready.'
      : /consent|admin|approval/i.test(e)
        ? 'Microsoft says this app still needs approval from your company’s admin. Ask the research team.'
        : 'Microsoft couldn’t complete the sign-in (' + e.slice(0, 160) + '). Try again, and tell the research team if it keeps happening.');
  }

  var btn = document.getElementById('msBtn');
  btn.addEventListener('click', async function (ev) {
    ev.preventDefault();
    btn.setAttribute('aria-busy', 'true');
    try { await X.signIn(returnTo); }
    catch (err) { btn.removeAttribute('aria-busy'); showError(err.message); }
  });

  // Already signed in? Go straight in.
  if (X.configured && !e) {
    X.sb.auth.getSession().then(function (r) { if (r.data && r.data.session) location.replace(X.base + returnTo); }).catch(function () { });
  }
  if (!X.configured) showError('The diary isn’t connected to its database yet. See README.md.');
})();
