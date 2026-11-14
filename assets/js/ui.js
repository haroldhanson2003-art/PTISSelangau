/* ==========================================================================
   PTIS · Komponen UI kecil (toast, dialog, panel, format)
   ========================================================================== */
(function () {
  'use strict';

  const escMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function esc(value) {
    return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) { return escMap[c]; });
  }

  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  function badge(status) {
    if (!status) return '<span class="muted">—</span>';
    const tone = STATUS_TONE[status] || 'neutral';
    return '<span class="badge badge--' + tone + '"><span class="badge-dot"></span>' + esc(status) + '</span>';
  }

  function fmtDate(value, style) {
    if (!value) return '—';
    const d = parseDate(value);
    if (!d) return esc(value);
    try {
      if (style === 'short') {
        return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'short' }).format(d);
      }
      if (style === 'long') {
        return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
      }
      return new Intl.DateTimeFormat('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    } catch (e) {
      return esc(value);
    }
  }

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value) ? null : value;
    const s = String(value);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const d = new Date(s);
    return isNaN(d) ? null : d;
  }

  function fmtDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d)) return esc(value);
    try {
      return new Intl.DateTimeFormat('ms-MY', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      }).format(d);
    } catch (e) {
      return d.toLocaleString();
    }
  }

  function relative(value) {
    const d = new Date(value);
    if (isNaN(d)) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.round(diff / 60000);
    if (mins < 1) return 'baru sahaja';
    if (mins < 60) return mins + ' minit lalu';
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + ' jam lalu';
    const days = Math.round(hours / 24);
    if (days < 30) return days + ' hari lalu';
    return fmtDate(value);
  }

  function initials(name) {
    const parts = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function debounce(fn, wait) {
    let t;
    return function () {
      const args = arguments;
      const self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 220);
    };
  }

  function monthKey(value) {
    const d = parseDate(value);
    if (!d) return '';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function todayISO() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /* --------------------------------------------------------------- toast */

  function toast(message, type, duration) {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (type || 'info');
    el.innerHTML = icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info') +
      '<span>' + esc(message) + '</span><button class="toast-x" aria-label="Tutup">' + icon('x') + '</button>';
    root.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('in'); });

    const remove = function () {
      el.classList.remove('in');
      setTimeout(function () { el.remove(); }, 220);
    };
    const timer = setTimeout(remove, duration || 4200);
    el.querySelector('.toast-x').addEventListener('click', function () {
      clearTimeout(timer);
      remove();
    });
  }

  /* -------------------------------------------------------------- dialog */

  let activeCleanup = null;

  function closeModal() {
    const root = document.getElementById('modal-root');
    if (!root) return;
    root.innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (activeCleanup) {
      const fn = activeCleanup;
      activeCleanup = null;
      fn();
    }
  }

  function openModal(html, options) {
    const opts = options || {};
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal-backdrop" data-close="modal"></div>' + html;
    document.body.classList.add('no-scroll');

    const escHandler = function (e) {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', escHandler);
    activeCleanup = function () { document.removeEventListener('keydown', escHandler); };

    root.querySelectorAll('[data-close="modal"]').forEach(function (b) {
      b.addEventListener('click', closeModal);
    });
    const modal = root.querySelector('.modal');
    if (modal) {
      const focusable = modal.querySelector('input,select,textarea,button,a[href]');
      if (focusable) setTimeout(function () { focusable.focus(); }, 30);
    }
    return closeModal;
  }

  function confirm(options) {
    const o = options || {};
    return new Promise(function (resolve) {
      const html =
        '<div class="modal modal--sm" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle">' +
          '<div class="modal-head">' +
            '<div class="modal-title-wrap">' +
              '<span class="modal-icon ' + (o.danger ? 'is-danger' : '') + '">' + icon(o.danger ? 'trash' : 'info') + '</span>' +
              '<h2 id="confirmTitle">' + esc(o.title || 'Sahkan tindakan') + '</h2>' +
            '</div>' +
            '<button class="icon-btn" data-confirm="cancel" aria-label="Tutup">' + icon('x') + '</button>' +
          '</div>' +
          '<div class="modal-body"><p>' + esc(o.message || '') + '</p></div>' +
          '<div class="modal-foot">' +
            '<button class="btn btn-ghost" data-confirm="cancel">' + esc(o.cancelLabel || 'Batal') + '</button>' +
            '<button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-confirm="ok">' + esc(o.confirmLabel || 'Teruskan') + '</button>' +
          '</div>' +
        '</div>';

      let settled = false;
      const finish = function (value) {
        if (settled) return;
        settled = true;
        closeModal();
        resolve(value);
      };

      openModal(html);
      const root = document.getElementById('modal-root');
      root.querySelectorAll('[data-confirm]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          finish(btn.getAttribute('data-confirm') === 'ok');
        });
      });
      const originalCleanup = activeCleanup;
      activeCleanup = function () {
        if (originalCleanup) originalCleanup();
        if (!settled) { settled = true; resolve(false); }
      };
    });
  }

  /* --------------------------------------------------------------- panel */

  let panelCleanup = null;

  function closePanel() {
    const root = document.getElementById('drawer-root');
    if (!root) return;
    root.innerHTML = '';
    document.body.classList.remove('no-scroll');
    if (panelCleanup) {
      const fn = panelCleanup;
      panelCleanup = null;
      fn();
    }
  }

  function openPanel(options) {
    const o = options || {};
    const root = document.getElementById('drawer-root');
    root.innerHTML =
      '<div class="panel-backdrop" data-close="panel"></div>' +
      '<section class="panel ' + (o.wide ? 'panel--wide' : '') + '" role="dialog" aria-modal="true" aria-labelledby="panelTitle">' +
        '<header class="panel-head">' +
          '<div>' +
            '<span class="eyebrow">' + esc(o.eyebrow || 'Rekod') + '</span>' +
            '<h2 id="panelTitle">' + esc(o.title || '') + '</h2>' +
            (o.subtitle ? '<p>' + esc(o.subtitle) + '</p>' : '') +
          '</div>' +
          '<button class="icon-btn" data-close="panel" aria-label="Tutup">' + icon('x') + '</button>' +
        '</header>' +
        '<div class="panel-body">' + (o.content || '') + '</div>' +
        (o.footer ? '<footer class="panel-foot">' + o.footer + '</footer>' : '') +
      '</section>';

    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () {
      const panel = root.querySelector('.panel');
      if (panel) panel.classList.add('in');
    });

    root.querySelectorAll('[data-close="panel"]').forEach(function (b) {
      b.addEventListener('click', closePanel);
    });

    const escHandler = function (e) {
      if (e.key === 'Escape' && !document.getElementById('modal-root').children.length) closePanel();
    };
    document.addEventListener('keydown', escHandler);
    panelCleanup = function () { document.removeEventListener('keydown', escHandler); };

    if (o.onMount) o.onMount(root);
    setTimeout(function () {
      const focusable = root.querySelector('input:not([type="hidden"]),select,textarea');
      if (focusable) focusable.focus();
    }, 60);
    return closePanel;
  }

  /* ------------------------------------------------------------- helpers */

  function download(filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function safeHref(url) {
    const s = String(url || '').trim();
    return /^https?:\/\//i.test(s) ? s : '';
  }

  function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
      btn.dataset.original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>' + esc(label || 'Menyimpan...');
    } else {
      btn.disabled = false;
      if (btn.dataset.original) btn.innerHTML = btn.dataset.original;
    }
  }

  window.UI = {
    esc: esc,
    icon: icon,
    badge: badge,
    fmtDate: fmtDate,
    fmtDateTime: fmtDateTime,
    parseDate: parseDate,
    relative: relative,
    initials: initials,
    debounce: debounce,
    monthKey: monthKey,
    todayISO: todayISO,
    toast: toast,
    confirm: confirm,
    openModal: openModal,
    closeModal: closeModal,
    openPanel: openPanel,
    closePanel: closePanel,
    download: download,
    safeHref: safeHref,
    setBusy: setBusy
  };
})();
