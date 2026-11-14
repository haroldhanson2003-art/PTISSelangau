/* ==========================================================================
   PTIS · Pengesahan (dinyahaktifkan)
   Log masuk Google telah dibuang; aplikasi berfungsi tanpa sesi log masuk.
   ========================================================================== */
(function () {
  'use strict';

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

  function getConfig() {
    return { enabled: false, clientId: '', allowedDomains: ['moe.gov.my', 'moe-dl.edu.my'] };
  }

  window.Auth = {
    getConfig: getConfig,
    saveConfig: function () { return getConfig(); },
    required: function () { return false; },
    getSession: function () { return null; },
    getSessionToken: function () { return ''; },
    initials: initials,
    domainOf: domainOf,
    isAllowedEmail: function () { return false; },
    isAdmin: function () { return false; },
    canManageSettings: function () { return true; },
    loadGis: function () { return Promise.resolve(); },
    mountButton: function () { return Promise.resolve(false); },
    prompt: function () { return Promise.resolve(); },
    verify: function () { return Promise.resolve(true); },
    signOut: function () { return Promise.resolve(true); },
    decodeJwt: function () { return {}; },
    handleAuthError: function () {}
  };
})();