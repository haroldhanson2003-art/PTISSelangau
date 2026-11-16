/* ==========================================================================
   PTIS · Pengesahan (Log masuk Google)
   Aktif apabila APP_CONFIG.auth.clientId diisi. Pelayan (Code.gs) juga
   mengesahkan token setiap permintaan menggunakan GOOGLE_CLIENT_ID yang sama.
   ========================================================================== */
(function () {
  'use strict';

  const SESSION_KEY = 'ptis.auth.v1';
  const GIS_SRC = 'https://accounts.google.com/gsi/client';
  let gisPromise = null;

  function getConfig() {
    const cfg = (window.APP_CONFIG && APP_CONFIG.auth) || {};
    return {
      clientId: String(cfg.clientId || '').trim(),
      allowedDomains: (cfg.allowedDomains || []).map(function (d) { return String(d).toLowerCase(); })
    };
  }

  function domainOf(email) {
    const value = String(email || '').trim().toLowerCase();
    const at = value.lastIndexOf('@');
    return at >= 0 ? value.slice(at + 1) : '';
  }

  function initials(name, email) {
    const source = String(name || '').trim() || String(email || '').split('@')[0];
    const parts = source.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean);
    if (!parts.length) return 'PT';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function decodeJwt(token) {
    try {
      const part = String(token || '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(atob(part).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(json);
    } catch (e) {
      return {};
    }
  }

  function readSession() {
    try {
      const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!s || !s.token || !s.exp || s.exp * 1000 - 60000 < Date.now()) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return s;
    } catch (e) {
      return null;
    }
  }

  function isAllowedEmail(email) {
    return Boolean(email) && getConfig().allowedDomains.indexOf(domainOf(email)) >= 0;
  }

  function required() {
    return Boolean(getConfig().clientId);
  }

  function loadGis() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    if (!gisPromise) {
      gisPromise = new Promise(function (resolve, reject) {
        const script = document.createElement('script');
        script.src = GIS_SRC;
        script.async = true;
        script.onload = resolve;
        script.onerror = function () {
          gisPromise = null;
          reject(new Error('Gagal memuatkan log masuk Google. Semak sambungan internet.'));
        };
        document.head.appendChild(script);
      });
    }
    return gisPromise;
  }

  function showError(message) {
    const el = document.getElementById('authError');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
  }

  function handleCredential(response) {
    const payload = decodeJwt(response.credential);
    if (payload.email_verified !== true || !isAllowedEmail(payload.email)) {
      showError('Akaun ' + (payload.email || '') + ' tidak dibenarkan. Gunakan akaun rasmi (' +
        getConfig().allowedDomains.join(', ') + ').');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      token: response.credential,
      email: payload.email,
      name: payload.name || '',
      exp: payload.exp
    }));
    location.reload();
  }

  function showGate(options) {
    const cfg = getConfig();
    if (document.getElementById('authGate')) return;
    const gate = document.createElement('div');
    gate.id = 'authGate';
    gate.className = 'auth-gate';
    gate.innerHTML =
      '<div class="auth-card" role="dialog" aria-modal="true" aria-labelledby="authTitle">' +
        '<span class="eyebrow">PTIS</span>' +
        '<h1 id="authTitle">Log masuk</h1>' +
        '<p>Gunakan akaun rasmi (' + cfg.allowedDomains.join(', ') + ') untuk mengakses data pasukan.</p>' +
        '<div id="authButton" class="auth-button"></div>' +
        '<p id="authError" class="auth-error" role="alert" hidden></p>' +
        '<button type="button" class="btn btn-ghost" id="authDemo">Teruskan dalam Mod Demo</button>' +
      '</div>';
    document.body.appendChild(gate);

    document.getElementById('authDemo').addEventListener('click', function () {
      if (options && options.onDemo) options.onDemo();
    });

    loadGis().then(function () {
      google.accounts.id.initialize({
        client_id: cfg.clientId,
        callback: handleCredential,
        auto_select: false
      });
      google.accounts.id.renderButton(document.getElementById('authButton'), {
        theme: 'filled_black',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: 280
      });
    }).catch(function (err) {
      showError(err.message);
    });
  }

  function signOut() {
    sessionStorage.removeItem(SESSION_KEY);
    if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
    location.reload();
  }

  window.Auth = {
    getConfig: getConfig,
    required: required,
    getSession: readSession,
    getSessionToken: function () {
      const s = readSession();
      return s ? s.token : '';
    },
    initials: initials,
    domainOf: domainOf,
    isAllowedEmail: isAllowedEmail,
    loadGis: loadGis,
    showGate: showGate,
    signOut: signOut,
    decodeJwt: decodeJwt,
    handleAuthError: function () {
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    }
  };
})();
