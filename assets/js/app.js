/* ==========================================================================
   PTIS · Aplikasi utama
   ========================================================================== */
(function () {
  'use strict';

  const view = document.getElementById('view');
  const sidenav = document.getElementById('sidenav');
  const bottomnav = document.getElementById('bottomnav');
  const scrim = document.getElementById('scrim');
  const menuBtn = document.getElementById('menuBtn');

  const state = {
    all: null,
    route: { name: 'home' },
    search: {},
    filter: {},
    limit: {},
    loadToken: 0
  };

  const BOTTOM_KEYS = ['pergerakan', 'kunjungBantu', 'peralatan'];
  const DEFAULT_STATUS = {
    pergerakan: 'Dirancang',
    kunjungBantu: 'Draf',
    pasukan: 'Aktif'
  };

  let allPromise = null;
  let activeDetail = null;
  let installPrompt = null;
  const searchTimers = {};

  /* ================================================================ boot */

  function init() {
    document.getElementById('year').textContent = new Date().getFullYear();
    bindGlobal();
    updateModeUI();
    startApp();
  }

  let started = false;

  function startApp() {
    if (started) return;
    started = true;
    updateUserUI();
    renderNav();
    route();
    registerSW();
    window.addEventListener('hashchange', route);
    window.addEventListener('online', function () {
      updateModeUI();
      UI.toast('Sambungan internet kembali. Tekan muat semula untuk menyegerak.', 'info');
    });
    window.addEventListener('offline', function () {
      updateModeUI();
      UI.toast('Anda sedang luar talian. Data cache akan dipaparkan.', 'error');
    });
    window.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      installPrompt = e;
    });
  }

  function updateUserUI() {
    const btn = document.getElementById('avatarBtn');
    if (!btn) return;
    btn.textContent = 'PT';
    btn.title = 'Tetapan dan maklumat sistem';
    btn.classList.remove('is-signed-in');
    btn.setAttribute('aria-label', 'PT — Tetapan dan maklumat sistem');
  }

  function registerSW() {
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(function () { /* tidak kritikal */ });
    }
  }

  /* ================================================================= nav */

  function navItem(key, href, iconName, label, extra) {
    return '<a class="nav-item" href="' + href + '" data-nav="' + key + '">' +
      UI.icon(iconName) + '<span>' + label + '</span>' +
      (extra || '') + '</a>';
  }

  function renderNav() {
    let side = navItem('home', '#/', 'home', 'Utama');
    side += '<div class="nav-label">Modul</div>';
    MODULE_ORDER.forEach(function (key) {
      const mod = MODULES[key];
      side += navItem(key, '#/m/' + key, mod.icon, mod.navTitle,
        '<span class="nav-count" data-count-for="' + key + '">0</span>');
    });
    side += '<div class="nav-divider"></div>';
    side += navItem('guide', '#/panduan', 'book', 'Panduan Laporan');
    side += navItem('settings', '#/tetapan', 'settings', 'Tetapan');
    sidenav.innerHTML = side;

    let bottom = '<a class="bn-item" href="#/" data-nav="home">' + UI.icon('home') + '<span>Utama</span></a>';
    BOTTOM_KEYS.forEach(function (key) {
      const mod = MODULES[key];
      bottom += '<a class="bn-item" href="#/m/' + key + '" data-nav="' + key + '">' +
        UI.icon(mod.icon) + '<span>' + escShort(mod.navTitle) + '</span></a>';
    });
    bottom += '<button class="bn-item" id="moreNavBtn" data-action="open-sidebar">' + UI.icon('grid') + '<span>Lagi</span></button>';
    bottomnav.innerHTML = bottom;
    updateNavCounts();
  }

  function escShort(label) {
    return label.replace('Peralatan ICT', 'Peralatan').replace('Kunjung Bantu', 'Kunjung').replace('Maklumat Pasukan', 'Pasukan');
  }

  function updateNavActive(route) {
    document.querySelectorAll('[data-nav]').forEach(function (a) {
      const nav = a.getAttribute('data-nav');
      let active = false;
      if (route.name === 'home') active = nav === 'home';
      else if (route.name === 'module') active = nav === route.key;
      else if (route.name === 'settings') active = nav === 'settings';
      else if (route.name === 'guide') active = nav === 'guide';
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const more = document.getElementById('moreNavBtn');
    if (more) {
      const useMore = route.name === 'settings' || route.name === 'guide' || (route.name === 'module' && BOTTOM_KEYS.indexOf(route.key) < 0);
      more.classList.toggle('is-active', useMore);
    }
  }

  function updateNavCounts() {
    document.querySelectorAll('[data-count-for]').forEach(function (el) {
      const key = el.getAttribute('data-count-for');
      const rows = state.all && state.all[key] ? state.all[key] : [];
      el.textContent = key === 'scst'
        ? ((APP_CONFIG.selangauSchools || []).length)
        : rows.length;
    });
  }

  function updateModeUI() {
    const remote = Store.isRemote();
    const offline = remote && Store.status.offline;
    const label = !remote ? 'Demo' : offline ? 'Luar Talian' : 'Google Sheets';
    const pill = document.getElementById('modePill');
    const side = document.getElementById('modeLabelSide');
    const main = document.getElementById('modeLabel');
    if (main) main.textContent = label;
    if (side) side.textContent = label;
    if (pill) {
      pill.className = 'mode-pill ' + (!remote ? 'is-demo' : offline ? 'is-offline' : 'is-live');
      pill.title = !remote
        ? 'Demo — Data contoh disimpan pada peranti ini.'
        : offline
          ? 'Luar Talian — Sambungan terputus. Data cache dipaparkan.'
          : 'Google Sheets — Data disegerak dengan Google Sheets.';
    }
    const storageLabel = document.getElementById('dataStorageLabel');
    if (storageLabel) {
      storageLabel.textContent = !remote
        ? 'Data demo disimpan pada peranti ini'
        : offline
          ? 'Data cache dipaparkan · menunggu sambungan'
          : 'Data disegerakkan dengan Google Sheets';
    }
    updateSyncPill();
  }

  function updateSyncPill() {
    const syncPill = document.getElementById('syncPill');
    const syncLabel = document.getElementById('syncLabel');
    if (!syncPill || !syncLabel) return;
    const remote = Store.isRemote();
    const lastSync = Store.status && Store.status.lastSync;
    let text = '—';
    let tone = 'demo';
    if (!remote) {
      text = 'Demo';
      tone = 'demo';
    } else if (Store.status && Store.status.offline) {
      text = 'Luar talian';
      tone = 'offline';
    } else if (lastSync) {
      try {
        const d = new Date(lastSync);
        text = d.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        text = '—';
      }
      tone = 'live';
    } else {
      text = 'Belum sync';
      tone = 'live';
    }
    syncLabel.textContent = text;
    syncPill.className = 'sync-pill is-' + tone;
    syncPill.title = lastSync
      ? text + ' — Segerak terakhir: ' + new Date(lastSync).toLocaleString('ms-MY')
      : text + ' — ' + (remote ? 'Belum disegerak' : 'Data contoh disimpan dalam pelayar');
  }

  /* ============================================================== router */

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    if (!parts.length) return { name: 'home' };
    if (parts[0] === 'm' && parts[1] && MODULES[parts[1]]) return { name: 'module', key: parts[1] };
    if (parts[0] === 'panduan') return { name: 'guide' };
    if (parts[0] === 'tetapan') return { name: 'settings' };
    return { name: 'home' };
  }

  async function route() {
    const r = parseHash();
    state.route = r;
    UI.closePanel();
    UI.closeModal();
    closeSidebar();
    window.scrollTo(0, 0);
    updateChrome(r);
    const token = ++state.loadToken;

    if (r.name === 'settings') {
      renderSettings();
      if (!state.all) {
        ensureAll().then(function () {
          if (token === state.loadToken && state.route.name === 'settings') refreshSettingsStatusUI();
        });
      }
      return;
    }
    if (r.name === 'guide') {
      renderGuide();
      if (!state.all) ensureAll();
      return;
    }

    view.innerHTML = skeletonHTML(r.name);
    await ensureAll();
    if (token !== state.loadToken) return;

    if (r.name === 'home') renderHome();
    else renderModule(r.key);
  }

  function renderCurrent() {
    const r = state.route || parseHash();
    if (r.name === 'settings') renderSettings();
    else if (r.name === 'guide') renderGuide();
    else if (r.name === 'module') renderModule(r.key);
    else renderHome();
  }

  function updateChrome(r) {
    const crumb = document.getElementById('crumb');
    const title = document.getElementById('pageTitle');
    let c = 'Utama';
    let t = 'Papan Pemuka';
    if (r.name === 'module') {
      const mod = MODULES[r.key];
      c = 'Modul';
      t = mod.navTitle;
      document.title = mod.navTitle + ' · PTIS';
    } else if (r.name === 'settings') {
      c = 'Sistem';
      t = 'Tetapan';
      document.title = 'Tetapan · PTIS';
    } else if (r.name === 'guide') {
      c = 'Bantuan';
      t = 'Panduan Laporan';
      document.title = 'Panduan Laporan · PTIS';
    } else {
      document.title = 'PTIS · Pasukan Teknikal ICT Daerah Selangau';
    }
    if (crumb) crumb.textContent = c;
    if (title) title.textContent = t;
    updateNavActive(r);
  }

  async function ensureAll(force) {
    if (state.all && !force) return state.all;
    if (allPromise && !force) return allPromise;
    allPromise = Store.listAll().then(function (all) {
      state.all = all;
      updateNavCounts();
      updateModeUI();
      if (Store.status.offline) {
        UI.toast('Mod luar talian: data cache dipaparkan.', 'error', 5200);
      }
      return all;
    }).finally(function () {
      allPromise = null;
    });
    return allPromise;
  }

  /* ================================================================ home */

  function renderHome() {
    const all = state.all || {};
    const cfg = Store.getConfig();
    const total = MODULE_ORDER.reduce(function (sum, key) { return sum + (all[key] || []).length; }, 0);
    const thisMonth = (all.pergerakan || []).filter(function (r) {
      return UI.monthKey(r.tarikh) === UI.monthKey(new Date());
    }).length;
    const kunjungDisahkan = (all.kunjungBantu || []).filter(function (r) { return r.status === 'Disahkan'; }).length;
    const aktif = (all.pasukan || []).filter(function (r) { return r.status === 'Aktif'; }).length;
    const jam = new Date().getHours();
    const sapaan = jam < 12 ? 'Selamat pagi' : jam < 19 ? 'Selamat petang' : 'Selamat malam';

    view.innerHTML =
      '<section class="hero">' +
        '<div class="hero-pattern" aria-hidden="true"></div>' +
        '<div class="hero-main">' +
          '<span class="eyebrow eyebrow--light"><span class="pulse"></span>' + UI.esc(cfg.teamLabel) + '</span>' +
          '<h2>' + sapaan + ',<br><span>selamat kembali.</span></h2>' +
          '<p>Urus pergerakan, laporan kunjung bantu dan aset ICT sekolah dalam satu papan pemuka yang tersambung ke Google Sheets.</p>' +
          '<div class="hero-actions">' +
            '<a class="btn btn-gold" href="#/m/pergerakan">' + UI.icon('route') + 'Lihat Pergerakan</a>' +
            '<a class="btn btn-glass" href="#/panduan">' + UI.icon('book') + 'Panduan Laporan</a>' +
          '</div>' +
          '<div class="tagline">“' + UI.esc(APP_CONFIG.tagline) + '”</div>' +
        '</div>' +
        '<aside class="hero-vm" aria-label="Maklumat operasi, Visi dan Misi JDN">' +
          '<div class="hero-console">' +
            '<div class="console-label"><span class="pulse"></span>PTIS / PPD SELANGAU</div>' +
            '<div class="console-bottom"><div class="console-count"><strong>' + scstSchools().length + '</strong><span>Sekolah <br>disenaraikan</span></div>' +
            '<div class="console-grid" aria-hidden="true">' + scstSchools().map(function () { return '<i></i>'; }).join('') + '</div></div>' +
          '</div>' +
          '<div class="vm-card">' +
            '<span class="vm-label">' + UI.icon('award') + 'Visi</span>' +
            '<p>' + UI.esc(APP_CONFIG.visi) + '</p>' +
          '</div>' +
          '<div class="vm-card">' +
            '<span class="vm-label">' + UI.icon('route') + 'Misi</span>' +
            '<p>' + UI.esc(APP_CONFIG.misi) + '</p>' +
          '</div>' +
        '</aside>' +
      '</section>' +

      '<section class="kpi-grid" aria-label="Ringkasan data">' +
        kpiCard('Jumlah Rekod', total, 'Semua modul data', 'grid', 'blue') +
        kpiCard('Pergerakan Bulan Ini', thisMonth, monthName(), 'route', 'teal') +
        kpiCard('Kunjung Bantu Disahkan', kunjungDisahkan, 'Daripada ' + (all.kunjungBantu || []).length + ' laporan', 'clipboard', 'green') +
        kpiCard('Anggota Aktif', aktif, (all.pasukan || []).length + ' anggota berdaftar', 'users', 'gold') +
      '</section>' +

      reportChannelsMarkup() +

      '<section class="section-block">' +
        '<div class="section-head">' +
          '<div><span class="eyebrow">Menu utama</span><h2>Modul pengurusan</h2></div>' +
          '<span class="section-hint">6 modul · satu dashboard</span>' +
        '</div>' +
        '<div class="module-grid">' + MODULE_ORDER.map(function (key) { return moduleCard(key, all[key] || []); }).join('') + '</div>' +
      '</section>' +

      '<div class="home-lower">' +
        '<section class="card chart-card">' +
          '<div class="card-head">' +
            '<div><span class="eyebrow">6 bulan terakhir</span><h3>Pergerakan Pasukan</h3></div>' +
            '<a href="#/m/pergerakan" class="link-more">Semua ' + UI.icon('chevron') + '</a>' +
          '</div>' +
          '<div class="chart">' + chartMarkup(all.pergerakan || []) + '</div>' +
        '</section>' +
        '<section class="card recent-card">' +
          '<div class="card-head">' +
            '<div><span class="eyebrow">Aktiviti</span><h3>Pergerakan Terkini</h3></div>' +
            '<button class="link-more" data-action="new" data-key="pergerakan">' + UI.icon('plus') + 'Tambah</button>' +
          '</div>' +
          '<div class="recent-list">' + recentMarkup(all.pergerakan || []) + '</div>' +
        '</section>' +
      '</div>' +

      '<section class="quote-band">' +
        '<div class="quote-mark">“</div>' +
        '<p>' + UI.esc(APP_CONFIG.misi) + '</p>' +
        '<span>Misi JDN</span>' +
      '</section>';
  }

  function kpiCard(label, value, sub, iconName, tone) {
    return '<article class="kpi kpi--' + tone + '">' +
      '<span class="kpi-icon">' + UI.icon(iconName) + '</span>' +
      '<div><span class="kpi-label">' + UI.esc(label) + '</span>' +
      '<strong class="kpi-value">' + value + '</strong>' +
      '<span class="kpi-sub">' + UI.esc(sub) + '</span></div>' +
      '</article>';
  }

  function reportChannelsMarkup() {
    const isdUrl = APP_CONFIG.isdUrl || 'https://isd.moe.gov.my';
    return '<section class="report-channels" aria-label="Saluran laporan sekolah">' +
      '<div class="report-channels-head">' +
        '<div><span class="eyebrow">Sekolah buat laporan</span><h2>Pilih saluran yang betul</h2></div>' +
        '<a class="link-more" href="#/panduan">Panduan lengkap ' + UI.icon('chevron') + '</a>' +
      '</div>' +
      '<div class="report-channel-grid">' +
        '<a class="report-channel tone-blue" href="' + UI.esc(isdUrl) + '" target="_blank" rel="noopener noreferrer">' +
          '<span class="report-channel-icon">' + UI.icon('clipboard') + '</span>' +
          '<span class="report-channel-label">Saluran rasmi KPM</span>' +
          '<h3>Lapor melalui ISD</h3>' +
          '<p>Peranti pajakan, M365, e-mel KPM, internet kontrak dan sistem aplikasi pusat.</p>' +
          '<span class="report-channel-go">Buka portal ISD ' + UI.icon('external') + '</span>' +
        '</a>' +
        '<a class="report-channel tone-teal" href="#/panduan">' +
          '<span class="report-channel-icon">' + UI.icon('mail') + '</span>' +
          '<span class="report-channel-label">Kerja teknikal di sekolah</span>' +
          '<h3>Surat / e-mel rasmi</h3>' +
          '<p>Pendawaian, pemasangan, semakan aset, bimbingan dan lawatan teknikal PTIS.</p>' +
          '<span class="report-channel-go">Lihat templat rasmi ' + UI.icon('chevron') + '</span>' +
        '</a>' +
      '</div>' +
    '</section>';
  }

  function scstSchools() {
    return window.APP_CONFIG.selangauSchools || [];
  }
  function scstDefaultUrl(kod) {
    return 'https://v4.dtpcare.com/modul/scst/index.php?k=' + encodeURIComponent(kod || '');
  }

  function moduleCard(key, rows) {
    const mod = MODULES[key];
    const isLink = key === 'scst' || mod.db === false;
    const index = String(MODULE_ORDER.indexOf(key) + 1).padStart(2, '0');
    return '<a class="module-card tone-' + mod.tone + '" href="#/m/' + key + '" data-module="' + key + '">' +
      '<div class="module-top">' +
        '<span class="module-icon">' + UI.icon(mod.icon) + '</span>' +
        '<span class="module-count">' + (isLink ? scstSchools().length + ' sekolah' : rows.length + ' rekod') + '</span>' +
      '</div>' +
      '<h3>' + UI.esc(mod.title) + '</h3>' +
      '<p>' + UI.esc(mod.description) + '</p>' +
      '<div class="module-foot"><span class="module-index">MODULE / ' + index + '</span>' +
      '<span class="module-go">' + (isLink ? 'Buka pautan' : 'Buka modul') + UI.icon('chevron') + '</span></div>' +
      '</a>';
  }

  function monthName() {
    try {
      return new Intl.DateTimeFormat('ms-MY', { month: 'long', year: 'numeric' }).format(new Date());
    } catch (e) {
      return 'Bulan semasa';
    }
  }

  function chartMarkup(rows) {
    const months = [];
    const base = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      let label;
      try {
        label = new Intl.DateTimeFormat('ms-MY', { month: 'short' }).format(d);
      } catch (e) {
        label = String(d.getMonth() + 1);
      }
      months.push({ key: key, label: label, count: 0 });
    }
    rows.forEach(function (r) {
      const mk = UI.monthKey(r.tarikh);
      const found = months.find(function (m) { return m.key === mk; });
      if (found) found.count += 1;
    });
    const max = Math.max.apply(null, months.map(function (m) { return m.count; }).concat([1]));
    return '<div class="bars">' + months.map(function (m) {
      const h = Math.max(4, Math.round((m.count / max) * 100));
      return '<div class="bar-col" title="' + m.count + UI.esc(m.label) + ' pergerakan">' +
        '<span class="bar-value">' + m.count + '</span>' +
        '<div class="bar-track"><div class="bar-fill" style="height:' + h + '%"></div></div>' +
        '<span class="bar-label">' + m.label + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function recentMarkup(rows) {
    const sorted = rows.slice().sort(byDateDesc('tarikh')).slice(0, 5);
    if (!sorted.length) {
      return '<div class="recent-empty">' + UI.icon('route') + '<p>Belum ada pergerakan direkod.</p></div>';
    }
    return sorted.map(function (r) {
      return '<button class="recent-item" data-action="detail" data-key="pergerakan" data-id="' + UI.esc(r.id) + '">' +
        '<span class="recent-date"><strong>' + UI.fmtDate(r.tarikh, 'short').split(' ')[0] + '</strong><small>' + (UI.fmtDate(r.tarikh, 'short').split(' ')[1] || '') + '</small></span>' +
        '<span class="recent-main"><strong>' + UI.esc(r.sekolah || 'Tanpa nama sekolah') + '</strong>' +
        '<small>' + UI.esc(r.jenisPergerakan || 'Pergerakan') + ' · ' + UI.esc(r.anggota || 'Tiada anggota') + '</small></span>' +
        UI.badge(r.status) +
        '</button>';
    }).join('');
  }

  /* ============================================================== module */

  function renderScstResults(query) {
    const wrap = document.getElementById('scstResults');
    const count = document.getElementById('scstSearchCount');
    if (!wrap) return;
    const q = String(query || '').trim().toLowerCase();
    const schools = scstSchools();
    const filtered = schools.filter(function (s) {
      const text = String(s.namaSekolah || '') + ' ' + String(s.kodSekolah || '');
      return !q || text.toLowerCase().includes(q);
    });
    if (count) count.textContent = filtered.length + (q ? ' daripada ' + schools.length : '') + ' sekolah';
    wrap.innerHTML = filtered.length ? filtered.map(function (s) {
      const kod = s.kodSekolah || '';
      const nama = s.namaSekolah || kod;
      const open = scstDefaultUrl(kod);
      return '<article class="card scst-school-item" data-kod="' + UI.esc(kod) + '">' +
        '<div class="scst-school-row">' +
          '<div class="scst-school-info"><h4>' + UI.esc(nama) + '</h4><span class="scst-code">' + UI.esc(kod) + ' / SCST</span></div>' +
          '<a class="btn btn-primary btn-sm scst-open" href="' + UI.esc(open) + '" target="_blank" rel="noopener noreferrer" data-kod="' + UI.esc(kod) + '">' + UI.icon('external') + 'Buka SCST</a>' +
        '</div>' +
      '</article>';
    }).join('') : '<div class="empty-state">' + UI.icon('search') + '<h3>Tiada sekolah sepadan</h3><p>Cuba carian menggunakan nama atau kod sekolah yang lain.</p><button class="btn btn-ghost" type="button" id="scstClearSearch">Kosongkan carian</button></div>';

    const clear = document.getElementById('scstClearSearch');
    if (clear) clear.addEventListener('click', function () {
      state.search.scst = '';
      const search = document.getElementById('scstSearch');
      if (search) { search.value = ''; search.focus(); }
      renderScstResults('');
    });
  }

  function renderScstModule(key) {
    const mod = MODULES[key];
    const schools = scstSchools();
    view.innerHTML =
      '<section class="page-head">' +
        '<div class="page-head-main">' +
          '<a class="back-link" href="#/">' + UI.icon('chevron') + 'Papan Pemuka</a>' +
          '<div class="title-row"><span class="page-icon tone-' + mod.tone + '">' + UI.icon(mod.icon) + '</span>' +
          '<div><h2>' + UI.esc(mod.title) + '</h2><p>Pautan modul SCST mengikut sekolah. Bukan rekod pangkalan data.</p></div></div>' +
        '</div>' +
      '</section>' +
      '<section class="card list-card scst-list-card">' +
        '<div class="card-head"><div><span class="eyebrow">Pautan SCST</span><h3>Senarai sekolah & pautan</h3></div><span class="badge badge--gold">' + schools.length + ' sekolah</span></div>' +
        '<div class="list-toolbar">' +
          '<div class="search-box">' + UI.icon('search') + '<input type="search" id="scstSearch" placeholder="Cari nama atau kod sekolah..." value="' + UI.esc(state.search.scst || '') + '" aria-label="Cari sekolah SCST"></div>' +
          '<span class="result-count" id="scstSearchCount" role="status" aria-live="polite"></span>' +
        '</div>' +
        '<div class="card-body"><div id="scstResults" class="scst-results"></div></div>' +
      '</section>';

    const search = document.getElementById('scstSearch');
    if (search) search.addEventListener('input', function () {
      state.search.scst = search.value;
      renderScstResults(search.value);
    });
    renderScstResults(state.search.scst || '');
  }

  function peralatanQty(r) {
    const n = Number(r && r.bilangan);
    return (isNaN(n) || n < 1) ? 1 : n;
  }
  function peralatanSummary(rows) {
    const bySchool = {};
    const byType = {};
    let totalCount = 0;
    rows.forEach(function (r) {
      const school = r.sekolah || 'Tanpa sekolah';
      const q = peralatanQty(r);
      if (!bySchool[school]) bySchool[school] = { total: 0, types: {} };
      bySchool[school].total += q;
      const type = r.jenisPeralatan || 'Lain-lain';
      bySchool[school].types[type] = (bySchool[school].types[type] || 0) + q;
      byType[type] = (byType[type] || 0) + q;
      totalCount += q;
    });
    const schoolCount = Object.keys(bySchool).length;
    const typeEntries = Object.entries(byType).sort(function (a, b) { return b[1] - a[1]; });
    return { bySchool, byType, schoolCount, totalCount, typeEntries };
  }

  function renderPeralatanModule(key) {
    const mod = MODULES[key];
    const rows = (state.all && state.all[key]) || [];
    const summary = peralatanSummary(rows);
    const filterField = mod.filterKey ? mod.fields.find(function (f) { return f.key === mod.filterKey; }) : null;
    const currentFilter = state.filter[key] || '';
    const q = String(state.search[key] || '').trim().toLowerCase();

    let filtered = rows.slice();
    if (q) {
      filtered = filtered.filter(function (r) {
        return mod.searchKeys.some(function (k) {
          return String(r[k] || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }
    if (currentFilter && mod.filterKey) {
      filtered = filtered.filter(function (r) { return String(r[mod.filterKey] || '') === currentFilter; });
    }

    const grouped = {};
    filtered.forEach(function (r) {
      const school = r.sekolah || 'Tanpa sekolah';
      if (!grouped[school]) grouped[school] = [];
      grouped[school].push(r);
    });
    const schoolNames = Object.keys(grouped).sort();
    const expandAll = !!q || !!currentFilter; // collapsed by default; auto-expand when searching/filtering

    view.innerHTML =
      '<section class="page-head">' +
        '<div class="page-head-main">' +
          '<a class="back-link" href="#/">' + UI.icon('chevron') + 'Papan Pemuka</a>' +
          '<div class="title-row"><span class="page-icon tone-' + mod.tone + '">' + UI.icon(mod.icon) + '</span>' +
          '<div><h2>' + UI.esc(mod.title) + '</h2><p>' + UI.esc(mod.description) + '</p></div></div>' +
        '</div>' +
        '<div class="page-head-actions">' +
          '<button class="btn btn-ghost" data-action="export" data-key="' + key + '">' + UI.icon('download') + '<span class="hide-sm">Eksport CSV</span></button>' +
          '<button class="btn btn-primary" data-action="new" data-key="' + key + '">' + UI.icon('plus') + 'Rekod Baharu</button>' +
        '</div>' +
      '</section>' +

      '<section class="card peralatan-summary-card">' +
        '<div class="card-body">' +
          '<div class="peralatan-summary-grid">' +
            '<div class="peralatan-summary-stat"><strong>' + summary.totalCount + '</strong><span>Jumlah Peralatan</span></div>' +
            '<div class="peralatan-summary-stat"><strong>' + summary.schoolCount + '</strong><span>Sekolah</span></div>' +
            summary.typeEntries.map(function (entry) {
              return '<div class="peralatan-summary-stat"><strong>' + entry[1] + '</strong><span>' + UI.esc(entry[0]) + '</span></div>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</section>' +

      // Contract reference
      '<section class="card peralatan-contract-card">' +
        '<details class="peralatan-contract-details">' +
          '<summary><span class="eyebrow">Rujukan</span><h3>Kontrak ICT PPD Selangau</h3><span class="badge badge--neutral">' + (((state.all && state.all.kontrak) ? state.all.kontrak.length : (APP_CONFIG.ictContracts || []).length)) + ' kontrak</span></summary>' +
          '<div class="card-body">' +
            '<div class="peralatan-contract-list">' +
            ((state.all && state.all.kontrak && state.all.kontrak.length ? state.all.kontrak : (APP_CONFIG.ictContracts || []))).map(function (c) {
              const statusCls = /tamat|ended/i.test(c.status) ? 'is-ended' : /pelaksanaan|rollout/i.test(c.status) ? 'is-rollout' : 'is-active';
              return '<div class="peralatan-contract-item">' +
                '<div class="peralatan-contract-top">' +
                  '<div><span class="peralatan-contract-phase">' + UI.esc(c.phase) + '</span>' +
                  '<div class="peralatan-contract-vendor">' + UI.esc(c.category) + ' · ' + UI.esc(c.vendor) + '</div></div>' +
                  '<span class="peralatan-contract-status ' + statusCls + '">' + UI.esc(c.status) + '</span>' +
                '</div>' +
                '<div class="peralatan-contract-meta">' +
                  '<span><strong>Mula:</strong> ' + UI.esc(c.start) + '</span>' +
                  '<span><strong>Tamat:</strong> ' + UI.esc(c.end) + '</span>' +
                  '<span><strong>Tempoh:</strong> ' + UI.esc(c.duration) + ' bulan</span>' +
                  (c.contractNo && c.contractNo !== '-' ? '<span><strong>No. Kontrak:</strong> ' + UI.esc(c.contractNo) + '</span>' : '') +
                '</div>' +
                '<div class="peralatan-contract-coverage">' + UI.esc(c.coverage) + '</div>' +
              '</div>';
            }).join('') +
            '</div>' +
          '</div>' +
        '</details>' +
      '</section>' +

      '<section class="card list-card">' +
        '<div class="list-toolbar">' +
          '<div class="search-box">' + UI.icon('search') +
            '<input type="search" id="peralatanSearch" placeholder="Cari sekolah, jenama, model, no. siri..." value="' + UI.esc(state.search[key] || '') + '" aria-label="Cari rekod">' +
          '</div>' +
          (filterField ?
            '<select class="select-filter" id="peralatanFilter" aria-label="Tapis mengikut ' + UI.esc(filterField.label) + '">' +
              '<option value="">Semua ' + UI.esc(filterField.label) + '</option>' +
              filterField.options.map(function (o) {
                return '<option value="' + UI.esc(o) + '"' + (currentFilter === o ? ' selected' : '') + '>' + UI.esc(o) + '</option>';
              }).join('') +
            '</select>' : '') +
          '<span class="result-count" id="listCount">' + filtered.length + ' rekod</span>' +
        '</div>' +
        '<div class="peralatan-expand-bar" id="peralatanExpandBar"' + (filtered.length ? '' : ' hidden') + '>' +
          '<span class="peralatan-hint">Klik nama sekolah untuk lihat peralatan.</span>' +
          '<button class="btn btn-ghost btn-sm" type="button" id="peralatanExpandAll">Kembang semua</button>' +
          '<button class="btn btn-ghost btn-sm" type="button" id="peralatanCollapseAll">Kuncup semua</button>' +
        '</div>' +
        '<div id="listRegion"></div>' +
      '</section>';

    function renderItems() {
      const region = document.getElementById('listRegion');
      const countEl = document.getElementById('listCount');
      if (countEl) countEl.textContent = filtered.length + ' rekod';
      const bar = document.getElementById('peralatanExpandBar');
      if (bar) bar.hidden = !filtered.length;
      if (!region) return;
      if (!filtered.length) {
        region.innerHTML = '<div class="empty-state"><span class="empty-icon">' + UI.icon(mod.icon) + '</span><h3>Tiada rekod sepadan</h3><p>Cuba tukar carian atau tapisan anda.</p><button class="btn btn-ghost" type="button" id="peralatanClear">Kosongkan carian</button></div>';
        const clear = document.getElementById('peralatanClear');
        if (clear) clear.addEventListener('click', function () { state.search[key] = ''; state.filter[key] = ''; renderPeralatanModule(key); });
        return;
      }
      region.innerHTML = schoolNames.map(function (school) {
        const schoolRows = grouped[school];
        const schoolSummary = peralatanSummary(schoolRows);
        const kod = schoolRows[0] && schoolRows[0].kodSekolah ? schoolRows[0].kodSekolah : '';
        const isOpen = expandAll;
        return '<div class="peralatan-school-group">' +
          '<button type="button" class="peralatan-school-head" data-school="' + UI.esc(school) + '" aria-expanded="' + (isOpen ? 'true' : 'false') + '">' +
            '<span class="peralatan-toggle' + (isOpen ? ' is-open' : '') + '">' + UI.icon('chevron') + '</span>' +
            '<div class="peralatan-school-title">' +
              '<h4>' + UI.esc(school) + '</h4>' +
              (kod ? '<span class="peralatan-school-code">' + UI.esc(kod) + '</span>' : '') +
            '</div>' +
            '<div class="peralatan-school-meta">' +
              '<span class="peralatan-school-badge">' + (schoolSummary.total || schoolRows.length) + ' unit</span>' +
              '<span class="peralatan-school-types">' + schoolSummary.typeEntries.map(function (e) { return e[1] + ' ' + UI.esc(e[0]); }).join(' · ') + '</span>' +
            '</div>' +
          '</button>' +
          '<div class="peralatan-school-items"' + (isOpen ? '' : ' hidden') + '>' +
            schoolRows.map(function (r) {
              return '<article class="peralatan-item" data-row data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" tabindex="0">' +
                '<div class="peralatan-item-head">' +
                  '<div class="peralatan-item-left">' +
                    '<span class="peralatan-item-type">' + UI.esc(r.jenisPeralatan || 'Peralatan') + '</span>' +
                    '<strong class="peralatan-item-name">' + UI.esc(r.jenama || '—') + '</strong>' +
                    '<span class="peralatan-item-qty">' + peralatanQty(r) + ' unit</span>' +
                  '</div>' +
                  '<div class="peralatan-item-right">' + UI.badge(r.keadaan || 'Baik') +
                    '<button class="icon-btn icon-btn--sm" data-action="edit" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" aria-label="Sunting">' + UI.icon('edit') + '</button>' +
                  '</div>' +
                '</div>' +
                '<dl class="peralatan-item-dl">' +
                  '<div><dt>Model</dt><dd>' + UI.esc(r.model || '—') + '</dd></div>' +
                  '<div><dt>Bilangan Unit</dt><dd>' + peralatanQty(r) + ' unit</dd></div>' +
                  '<div><dt>No. Siri</dt><dd class="mono">' + UI.esc(r.noSiri || '—') + '</dd></div>' +
                  '<div><dt>Lokasi</dt><dd>' + UI.esc(r.lokasi || '—') + '</dd></div>' +
                  '<div><dt>Fasa</dt><dd>' + UI.esc(r.fasa || '—') + '</dd></div>' +
                  (r.vendor ? '<div class="full"><dt>Vendor / Kontrak</dt><dd>' + UI.esc(r.vendor) + '</dd></div>' : '') +
                  (r.catatan ? '<div class="full"><dt>Catatan / No. Pendaftaran</dt><dd>' + UI.esc(r.catatan) + '</dd></div>' : '') +
                '</dl>' +
                '<div class="peralatan-item-foot"><button class="btn btn-ghost btn-sm" data-action="detail" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '">Lihat butiran</button></div>' +
              '</article>';
            }).join('') +
          '</div>' +
        '</div>';
      }).join('');

      region.querySelectorAll('.peralatan-school-head').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const items = btn.nextElementSibling;
          const toggle = btn.querySelector('.peralatan-toggle');
          if (!items) return;
          const open = items.hasAttribute('hidden');
          if (open) items.removeAttribute('hidden'); else items.setAttribute('hidden', '');
          btn.setAttribute('aria-expanded', open ? 'true' : 'false');
          if (toggle) toggle.classList.toggle('is-open', open);
        });
      });
    }

    renderItems();

    const searchEl = document.getElementById('peralatanSearch');
    if (searchEl) searchEl.addEventListener('input', function () {
      state.search[key] = searchEl.value;
      renderPeralatanModule(key);
      const s = document.getElementById('peralatanSearch');
      if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
    });
    const filterEl = document.getElementById('peralatanFilter');
    if (filterEl) filterEl.addEventListener('change', function () {
      state.filter[key] = filterEl.value;
      renderPeralatanModule(key);
    });
    const expandAllBtn = document.getElementById('peralatanExpandAll');
    if (expandAllBtn) expandAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.peralatan-school-items[hidden]').forEach(function (el) { el.removeAttribute('hidden'); });
      document.querySelectorAll('.peralatan-school-head').forEach(function (b) { b.setAttribute('aria-expanded', 'true'); });
      document.querySelectorAll('.peralatan-toggle').forEach(function (t) { t.classList.add('is-open'); });
    });
    const collapseAllBtn = document.getElementById('peralatanCollapseAll');
    if (collapseAllBtn) collapseAllBtn.addEventListener('click', function () {
      document.querySelectorAll('.peralatan-school-items').forEach(function (el) { el.setAttribute('hidden', ''); });
      document.querySelectorAll('.peralatan-school-head').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      document.querySelectorAll('.peralatan-toggle').forEach(function (t) { t.classList.remove('is-open'); });
    });
  }

  function renderModule(key) {
    const mod = MODULES[key];
    if (key === 'scst' || mod.db === false) { renderScstModule(key); return; }
    if (key === 'peralatan') { renderPeralatanModule(key); return; }
    const rows = (state.all && state.all[key]) || [];
    const stats = moduleStats(mod, rows);
    const filterField = mod.filterKey ? mod.fields.find(function (f) { return f.key === mod.filterKey; }) : null;
    const currentFilter = state.filter[key] || '';

    view.innerHTML =
      '<section class="page-head">' +
        '<div class="page-head-main">' +
          '<a class="back-link" href="#/">' + UI.icon('chevron') + 'Papan Pemuka</a>' +
          '<div class="title-row"><span class="page-icon tone-' + mod.tone + '">' + UI.icon(mod.icon) + '</span>' +
          '<div><h2>' + UI.esc(mod.title) + '</h2><p>' + UI.esc(mod.description) + '</p></div></div>' +
          (mod.note ? '<div class="note note--warn">' + UI.icon('alert') + '<span>' + UI.esc(mod.note) + '</span></div>' : '') +
        '</div>' +
        '<div class="page-head-actions">' +
          '<button class="btn btn-ghost" data-action="export" data-key="' + key + '">' + UI.icon('download') + '<span class="hide-sm">Eksport CSV</span></button>' +
          '<button class="btn btn-primary" data-action="new" data-key="' + key + '">' + UI.icon('plus') + 'Rekod Baharu</button>' +
        '</div>' +
      '</section>' +

      '<section class="stat-strip">' + stats.map(function (s) {
        return '<article class="stat-chip">' +
          '<span class="stat-icon tone-' + s.tone + '">' + UI.icon(s.icon) + '</span>' +
          '<div><span>' + UI.esc(s.label) + '</span><strong>' + s.value + '</strong></div>' +
          '</article>';
      }).join('') + '</section>' +

      '<section class="card list-card">' +
        '<div class="list-toolbar">' +
          '<div class="search-box">' + UI.icon('search') +
            '<input type="search" data-action="search" data-key="' + key + '" placeholder="Cari ' + UI.esc(mod.noun) + '..." value="' + UI.esc(state.search[key] || '') + '" aria-label="Cari rekod">' +
          '</div>' +
          (filterField ?
            '<select class="select-filter" data-filter="' + key + '" aria-label="Tapis mengikut ' + UI.esc(filterField.label) + '">' +
              '<option value="">Semua ' + UI.esc(filterField.label) + '</option>' +
              filterField.options.map(function (o) {
                return '<option value="' + UI.esc(o) + '"' + (currentFilter === o ? ' selected' : '') + '>' + UI.esc(o) + '</option>';
              }).join('') +
            '</select>' : '') +
          '<span class="result-count" id="listCount"></span>' +
        '</div>' +
        '<div id="listRegion"></div>' +
      '</section>';

    renderList(key);
  }

  function moduleStats(mod, rows) {
    const out = [{ label: 'Jumlah ' + mod.noun, value: rows.length, icon: 'grid', tone: 'blue' }];
    if (mod.dateKey) {
      const mk = UI.monthKey(new Date());
      out.push({
        label: 'Bulan ini',
        value: rows.filter(function (r) { return UI.monthKey(r[mod.dateKey]) === mk; }).length,
        icon: 'calendar',
        tone: 'teal'
      });
    }
    if (mod.key === 'peralatan') {
      const bad = rows.filter(function (r) { return r.keadaan === 'Rosak' || r.keadaan === 'Perlu Penyelenggaraan'; }).length;
      out.push({ label: 'Perlu perhatian', value: bad, icon: 'alert', tone: 'orange' });
      const good = rows.filter(function (r) { return r.keadaan === 'Baik'; }).length;
      out.push({ label: 'Keadaan baik', value: good, icon: 'check', tone: 'green' });
    } else if (mod.key === 'organisasi') {
      const schools = new Set(rows.map(function (r) { return r.sekolah; }).filter(Boolean));
      const daerah = new Set(rows.map(function (r) { return r.daerah; }).filter(Boolean));
      out.push({ label: 'Sekolah terlibat', value: schools.size, icon: 'home', tone: 'teal' });
      out.push({ label: 'Daerah', value: daerah.size, icon: 'route', tone: 'gold' });
    } else if (mod.key === 'pasukan') {
      out.push({ label: 'Aktif', value: rows.filter(function (r) { return r.status === 'Aktif'; }).length, icon: 'check', tone: 'green' });
      const schools = new Set(rows.map(function (r) { return r.sekolah; }).filter(Boolean));
      out.push({ label: 'Sekolah', value: schools.size, icon: 'home', tone: 'teal' });
    } else if (mod.key === 'kunjungBantu') {
      out.push({ label: 'Disahkan', value: rows.filter(function (r) { return r.status === 'Disahkan'; }).length, icon: 'check', tone: 'green' });
      out.push({ label: 'Draf', value: rows.filter(function (r) { return r.status === 'Draf'; }).length, icon: 'edit', tone: 'gold' });
    } else if (mod.key === 'kontrak') {
      out.push({ label: 'Aktif', value: rows.filter(function (r) { return /aktif/i.test(r.status); }).length, icon: 'check', tone: 'green' });
      out.push({ label: 'Tamat', value: rows.filter(function (r) { return /tamat/i.test(r.status); }).length, icon: 'alert', tone: 'orange' });
    } else {
      out.push({ label: 'Selesai', value: rows.filter(function (r) { return r.status === 'Selesai'; }).length, icon: 'check', tone: 'green' });
      out.push({ label: 'Dalam tindakan', value: rows.filter(function (r) { return r.status === 'Dalam Tindakan' || r.status === 'Sedang Berjalan'; }).length, icon: 'refresh', tone: 'orange' });
    }
    return out.slice(0, 4);
  }

  function byDateDesc(key) {
    return function (a, b) {
      const av = String(a[key] || '');
      const bv = String(b[key] || '');
      if (av === bv) return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      return bv.localeCompare(av);
    };
  }

  function filteredRows(key) {
    const mod = MODULES[key];
    let rows = ((state.all && state.all[key]) || []).slice();
    const q = String(state.search[key] || '').trim().toLowerCase();

    if (q) {
      rows = rows.filter(function (r) {
        return mod.searchKeys.some(function (k) {
          return String(r[k] || '').toLowerCase().indexOf(q) !== -1;
        });
      });
    }

    const filter = state.filter[key];
    if (filter && mod.filterKey) {
      rows = rows.filter(function (r) { return String(r[mod.filterKey] || '') === filter; });
    }

    if (mod.key === 'organisasi') {
      rows.sort(function (a, b) {
        const ai = ORG_ORDER.indexOf(a.jawatan);
        const bi = ORG_ORDER.indexOf(b.jawatan);
        if (ai !== bi) return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
        const au = Number(a.urutan || 999);
        const bu = Number(b.urutan || 999);
        if (au !== bu) return au - bu;
        return String(a.nama || '').localeCompare(String(b.nama || ''));
      });
    } else if (mod.dateKey) {
      rows.sort(byDateDesc(mod.dateKey));
    } else {
      rows.sort(function (a, b) { return String(b.createdAt || '').localeCompare(String(a.createdAt || '')); });
    }
    return rows;
  }

  function renderList(key) {
    const region = document.getElementById('listRegion');
    if (!region) return;
    const mod = MODULES[key];
    const rows = filteredRows(key);
    const limit = state.limit[key] || 25;
    const shown = rows.slice(0, limit);
    const countEl = document.getElementById('listCount');
    if (countEl) countEl.textContent = rows.length + ' rekod';

    if (!rows.length) {
      const hasFilter = Boolean(state.search[key] || state.filter[key]);
      region.innerHTML =
        '<div class="empty-state">' +
          '<span class="empty-icon">' + UI.icon(hasFilter ? 'search' : mod.icon) + '</span>' +
          '<h3>' + (hasFilter ? 'Tiada rekod sepadan' : 'Belum ada ' + UI.esc(mod.noun)) + '</h3>' +
          '<p>' + (hasFilter ? 'Cuba tukar carian atau tapisan anda.' : 'Mulakan dengan menambah rekod pertama untuk modul ini.') + '</p>' +
          (hasFilter
            ? '<button class="btn btn-ghost" data-action="clear-filter" data-key="' + key + '">Kosongkan carian</button>'
            : '<button class="btn btn-primary" data-action="new" data-key="' + key + '">' + UI.icon('plus') + 'Tambah Rekod</button>') +
        '</div>';
      return;
    }

    let markup = '';
    if (mod.view === 'org') {
      markup = orgMarkup(shown);
    } else {
      markup = tableMarkup(mod, shown) + mobileCardsMarkup(mod, shown);
    }

    if (rows.length > shown.length) {
      markup += '<div class="load-more-wrap"><button class="btn btn-ghost" data-action="more" data-key="' + key + '">Muat lagi (' + (rows.length - shown.length) + ')</button></div>';
    }
    region.innerHTML = markup;
  }

  function tableMarkup(mod, rows) {
    return '<div class="table-wrap"><table class="data-table">' +
      '<thead><tr>' +
      mod.listCols.map(function (col) {
        const f = mod.fields.find(function (x) { return x.key === col; });
        return '<th>' + UI.esc(f ? f.label : col) + '</th>';
      }).join('') +
      '<th class="th-actions"><span class="sr-only">Tindakan</span></th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr class="row-click" data-row data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" tabindex="0">' +
          mod.listCols.map(function (col) {
            const f = mod.fields.find(function (x) { return x.key === col; });
            return '<td>' + cellValue(f || { key: col }, r) + '</td>';
          }).join('') +
          '<td class="cell-actions">' +
            '<button class="icon-btn icon-btn--sm" data-action="detail" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" aria-label="Lihat butiran" title="Lihat">' + UI.icon('search') + '</button>' +
            '<button class="icon-btn icon-btn--sm" data-action="edit" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" aria-label="Sunting rekod" title="Sunting">' + UI.icon('edit') + '</button>' +
          '</td>' +
          '</tr>';
      }).join('') +
      '</tbody></table></div>';
  }

  function mobileCardsMarkup(mod, rows) {
    return '<div class="record-cards">' + rows.map(function (r) {
      const cols = mod.listCols.slice(1, 4);
      return '<article class="record-card" data-row data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" tabindex="0">' +
        '<div class="record-top"><span class="record-date">' + UI.icon('calendar') + UI.fmtDate(r[mod.dateKey] || r.createdAt, 'short') + '</span>' +
          (r.status ? UI.badge(r.status) : r.keadaan ? UI.badge(r.keadaan) : '') + '</div>' +
        '<h3>' + UI.esc(recordTitle(mod, r)) + '</h3>' +
        '<p class="record-sub">' + UI.esc(r.jenisPergerakan || r.jenisKhidmat || r.jenisPeralatan || r.jawatan || r.daerah || '') + '</p>' +
        '<dl class="record-meta">' + cols.map(function (col) {
          const f = mod.fields.find(function (x) { return x.key === col; });
          if (!f) return '';
          const v = r[col];
          if (!v) return '';
          return '<div><dt>' + UI.esc(f.label) + '</dt><dd>' + cellValue(f, r) + '</dd></div>';
        }).join('') + '</dl>' +
        '<div class="record-actions">' +
          '<button class="btn btn-ghost btn-sm" data-action="detail" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '">Lihat</button>' +
          '<button class="icon-btn icon-btn--sm" data-action="edit" data-key="' + mod.key + '" data-id="' + UI.esc(r.id) + '" aria-label="Sunting">' + UI.icon('edit') + '</button>' +
        '</div>' +
        '</article>';
    }).join('') + '</div>';
  }

  function cellValue(field, row) {
    const v = row[field.key];
    if (v === undefined || v === null || v === '') return '<span class="muted">—</span>';
    if (field.type === 'date') return UI.fmtDate(v);
    if (field.key === 'status' || field.key === 'keadaan') return UI.badge(v);
    if (field.key === 'skor') return UI.esc(v) + '%';
    if (field.key === 'tempohJam') return UI.esc(v) + ' jam';
    return UI.esc(v);
  }

  function recordTitle(mod, row) {
    if (row.nama) return row.nama;
    if (row.sekolah) return row.sekolah;
    const first = mod.listCols[0];
    return row[first] || 'Rekod';
  }

  function orgMarkup(rows) {
    const groups = {};
    rows.forEach(function (r) {
      const j = r.jawatan || 'Ahli';
      (groups[j] = groups[j] || []).push(r);
    });
    const order = ORG_ORDER.filter(function (j) { return groups[j] && groups[j].length; });
    Object.keys(groups).forEach(function (j) {
      if (order.indexOf(j) < 0) order.push(j);
    });

    return '<div class="org-view">' + order.map(function (jawatan) {
      const isLead = ['Pengerusi', 'Timbalan Pengerusi', 'Setiausaha'].indexOf(jawatan) >= 0;
      return '<section class="org-group">' +
        '<div class="org-group-head"><h3>' + UI.esc(jawatan) + '</h3><span>' + groups[jawatan].length + ' ahli</span></div>' +
        '<div class="org-grid' + (isLead ? ' org-grid--lead' : '') + '">' +
          groups[jawatan].map(function (r) {
            const tel = String(r.noTelefon || '').replace(/[^\d+]/g, '');
            return '<article class="org-card' + (isLead ? ' is-lead' : '') + '" data-row data-key="organisasi" data-id="' + UI.esc(r.id) + '" tabindex="0">' +
              '<div class="org-avatar">' + UI.esc(UI.initials(r.nama)) + '</div>' +
              '<div class="org-info">' +
                '<h4>' + UI.esc(r.nama) + '</h4>' +
                '<span class="org-role">' + UI.esc(r.jawatan) + '</span>' +
                '<p>' + UI.esc(r.sekolah || '') + (r.daerah ? ' · ' + UI.esc(r.daerah) : '') + '</p>' +
                '<div class="org-links">' +
                  (tel ? '<a href="tel:' + UI.esc(tel) + '" aria-label="Telefon ' + UI.esc(r.nama) + '">' + UI.icon('phone') + UI.esc(r.noTelefon) + '</a>' : '') +
                  (r.emel ? '<a href="mailto:' + UI.esc(r.emel) + '" aria-label="E-mel ' + UI.esc(r.nama) + '">' + UI.icon('mail') + UI.esc(r.emel) + '</a>' : '') +
                '</div>' +
              '</div>' +
              '<button class="icon-btn icon-btn--sm org-edit" data-action="edit" data-key="organisasi" data-id="' + UI.esc(r.id) + '" aria-label="Sunting ' + UI.esc(r.nama) + '">' + UI.icon('edit') + '</button>' +
              '</article>';
          }).join('') +
        '</div>' +
      '</section>';
    }).join('') + '</div>';
  }

  /* ============================================================== detail */

  function openDetail(key, id) {
    const mod = MODULES[key];
    const rows = (state.all && state.all[key]) || [];
    const row = rows.find(function (r) { return String(r.id) === String(id); });
    if (!row) {
      UI.toast('Rekod tidak dijumpai. Muat semula data.', 'error');
      return;
    }
    activeDetail = { key: key, id: id };

    const statusField = mod.fields.find(function (f) { return f.key === 'status'; }) ||
      mod.fields.find(function (f) { return f.key === 'keadaan'; });
    const statusValue = statusField ? row[statusField.key] : '';

    const body = mod.fields.map(function (f) {
      return '<div class="detail-field' + (f.wide ? ' detail-field--wide' : '') + '">' +
        '<dt>' + UI.esc(f.label) + '</dt>' +
        '<dd>' + detailValue(f, row) + '</dd>' +
        '</div>';
    }).join('');

    UI.openModal(
      '<div class="modal modal--lg" role="dialog" aria-modal="true" aria-labelledby="detailTitle">' +
        '<div class="modal-head">' +
          '<div class="modal-title-wrap">' +
            '<span class="page-icon tone-' + mod.tone + '">' + UI.icon(mod.icon) + '</span>' +
            '<div><span class="eyebrow">' + UI.esc(mod.short) + '</span><h2 id="detailTitle">' + UI.esc(recordTitle(mod, row)) + '</h2>' +
            '<div class="modal-sub">' + (statusValue ? UI.badge(statusValue) : '') +
            '<span>' + UI.esc(row.sekolah && row.nama ? row.sekolah : (row.daerah || mod.noun)) + '</span></div></div>' +
          '</div>' +
          '<button class="icon-btn" data-close="modal" aria-label="Tutup">' + UI.icon('x') + '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<dl class="detail-grid">' + body + '</dl>' +
          '<div class="detail-meta">' +
            '<span>Direkod ' + UI.fmtDateTime(row.createdAt) + '</span>' +
            '<span>Dikemas kini ' + UI.fmtDateTime(row.updatedAt) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-danger-ghost" data-detail-action="delete">' + UI.icon('trash') + 'Padam</button>' +
          '<div class="foot-right">' +
            '<button class="btn btn-ghost" data-close="modal">Tutup</button>' +
            '<button class="btn btn-primary" data-detail-action="edit">' + UI.icon('edit') + 'Sunting Rekod</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    const root = document.getElementById('modal-root');
    const editBtn = root.querySelector('[data-detail-action="edit"]');
    const delBtn = root.querySelector('[data-detail-action="delete"]');
    if (editBtn) editBtn.addEventListener('click', function () { UI.closeModal(); openForm(key, id); });
    if (delBtn) delBtn.addEventListener('click', function () { deleteRecord(key, id); });
  }

  function detailValue(field, row) {
    const v = row[field.key];
    if (v === undefined || v === null || v === '') return '<span class="muted">—</span>';
    if (field.key === 'status' || field.key === 'keadaan') return UI.badge(v);
    if (field.type === 'file') return attachmentsDetail(v);
    if (field.type === 'date') return UI.fmtDate(v, 'long');
    if (field.type === 'email') return '<a href="mailto:' + UI.esc(v) + '">' + UI.esc(v) + '</a>';
    if (field.type === 'tel') {
      const tel = String(v).replace(/[^\d+]/g, '');
      return '<a href="tel:' + UI.esc(tel) + '">' + UI.esc(v) + '</a>';
    }
    if (field.type === 'url') {
      const href = UI.safeHref(v);
      return href ? '<a href="' + UI.esc(href) + '" target="_blank" rel="noopener noreferrer">' + UI.esc(href) + '</a>' : UI.esc(v);
    }
    if (field.key === 'skor') return UI.esc(v) + '%';
    if (field.key === 'tempohJam') return UI.esc(v) + ' jam';
    if (field.key === 'bilangan') return UI.esc(v) + ' unit';
    if (field.type === 'textarea') return '<span class="pre-line">' + UI.esc(v) + '</span>';
    return UI.esc(v);
  }

  /* ================================================================ form */

  const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
  const ATTACHMENT_EXT = /\.(pdf|docx?|jpe?g|png|webp|gif)$/i;

  function parseAttachments(value) {
    if (Array.isArray(value)) return value.filter(function (a) { return a && a.url; });
    const s = String(value || '').trim();
    if (!s) return [];
    if (s.charAt(0) === '[') {
      try {
        const list = JSON.parse(s);
        return Array.isArray(list) ? list.filter(function (a) { return a && a.url; }) : [];
      } catch (e) {
        return [];
      }
    }
    if (/^https?:\/\//i.test(s)) return [{ name: 'Pautan lampiran', url: s }];
    return [];
  }

  function attachmentsDetail(value) {
    const items = parseAttachments(value);
    if (!items.length) return '<span class="muted">—</span>';
    return '<ul class="attach-list">' + items.map(function (a) {
      const href = UI.safeHref(a.url);
      return '<li>' + (href
        ? '<a href="' + UI.esc(href) + '" target="_blank" rel="noopener noreferrer">' + UI.esc(a.name || 'Lampiran') + '</a>'
        : UI.esc(a.name || 'Lampiran')) + '</li>';
    }).join('') + '</ul>';
  }

  function formatBytes(n) {
    if (!n) return '';
    if (n >= 1048576) return (n / 1048576).toFixed(1) + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  function attachmentError(file) {
    if (!ATTACHMENT_EXT.test(file.name || '')) return 'Jenis fail "' + file.name + '" tidak disokong. Gunakan PDF, Word atau gambar.';
    if (file.size > ATTACHMENT_MAX_BYTES) return 'Fail "' + file.name + '" melebihi 10 MB.';
    return '';
  }

  function defaultsFor(mod) {
    const out = {};
    mod.fields.forEach(function (f) {
      out[f.key] = '';
      if (f.type === 'date' && f.key === 'tarikh') out[f.key] = UI.todayISO();
      if (f.type === 'date' && f.key === 'tarikhSemakan') out[f.key] = UI.todayISO();
      if (f.key === 'tahun') out[f.key] = String(new Date().getFullYear());
      if (f.key === 'status') out[f.key] = DEFAULT_STATUS[mod.key] || (f.options ? f.options[0] : '');
      if (f.key === 'keadaan') out[f.key] = 'Baik';
      if (f.key === 'daerah') out[f.key] = 'Selangau';
      if (f.key === 'urutan') {
        const rows = (state.all && state.all[mod.key]) || [];
        out[f.key] = String(rows.length + 1);
        if (mod.key === 'organisasi') {
          const max = rows.reduce(function (m, r) { return Math.max(m, Number(r.urutan) || 0); }, 0);
          out[f.key] = String(max + 1);
        }
      }
    });
    return out;
  }

  function schoolList() {
    return (window.APP_CONFIG && Array.isArray(APP_CONFIG.selangauSchools)) ? APP_CONFIG.selangauSchools : [];
  }

  function schoolByName(name) {
    const n = String(name || '').trim().toLowerCase();
    if (!n) return null;
    return schoolList().find(function (s) { return String(s.namaSekolah || '').trim().toLowerCase() === n; }) || null;
  }

  function schoolDatalistMarkup(id) {
    const list = schoolList();
    if (id === 'schools') {
      return '<datalist id="dl_schools">' + list.map(function (s) {
        return '<option value="' + UI.esc(s.namaSekolah) + '" label="' + UI.esc(s.kodSekolah) + '"></option>';
      }).join('') + '</datalist>';
    }
    if (id === 'schoolCodes') {
      return '<datalist id="dl_schoolCodes">' + list.map(function (s) {
        return '<option value="' + UI.esc(s.kodSekolah) + '"></option>';
      }).join('') + '</datalist>';
    }
    return '';
  }

  function fieldMarkup(f, value) {
    const id = 'f_' + f.key;
    const req = f.required ? ' required aria-required="true"' : '';
    const requiredMark = f.required ? '<span class="req" aria-hidden="true">*</span>' : '';
    let control = '';
    let extra = '';

    if (f.type === 'file') {
      control = '<div class="file-list" data-file-list="' + f.key + '"></div>' +
        '<label class="btn btn-ghost btn-sm file-pick">' + UI.icon('upload') + 'Tambah fail' +
        '<input class="sr-only" id="' + id + '" type="file" data-file-input="' + f.key + '" accept="' + UI.esc(f.accept || '') + '" multiple>' +
        '</label>' +
        '<p class="hint">PDF, Word atau gambar. Maks 10 MB setiap fail.</p>';
    } else if (f.type === 'textarea') {
      control = '<textarea id="' + id + '" name="' + f.key + '" rows="3" placeholder="' +
        UI.esc(f.placeholder || '') + '"' + req + '>' + UI.esc(value) + '</textarea>';
    } else if (f.type === 'select') {
      control = '<select id="' + id + '" name="' + f.key + '"' + req + '>' +
        '<option value="">— Pilih —</option>' +
        f.options.map(function (o) {
          return '<option value="' + UI.esc(o) + '"' + (String(value) === o ? ' selected' : '') + '>' + UI.esc(o) + '</option>';
        }).join('') +
        '</select>';
    } else {
      const attrs = [];
      if (f.min !== undefined) attrs.push('min="' + f.min + '"');
      if (f.max !== undefined) attrs.push('max="' + f.max + '"');
      if (f.step !== undefined) attrs.push('step="' + f.step + '"');
      if (f.placeholder) attrs.push('placeholder="' + UI.esc(f.placeholder) + '"');
      if (f.type === 'tel') attrs.push('inputmode="tel" autocomplete="tel"');
      if (f.type === 'email') attrs.push('inputmode="email" autocomplete="email"');
      if (f.type === 'url') attrs.push('inputmode="url"');
      if (f.list) attrs.push('list="dl_' + UI.esc(f.list) + '"');
      if (f.readonly) attrs.push('readonly tabindex="-1" aria-readonly="true"');
      if (f.list === 'schools') attrs.push('autocomplete="off"');
      control = '<input id="' + id + '" name="' + f.key + '" type="' + f.type + '" value="' + UI.esc(value) + '"' + req + ' ' + attrs.join(' ') + '>';
      if (f.list) extra = schoolDatalistMarkup(f.list);
    }

    return '<div class="field' + (f.wide ? ' field--wide' : '') + '" data-field="' + f.key + '">' +
      '<label for="' + id + '">' + UI.esc(f.label) + requiredMark + '</label>' +
      control + extra +
      '<p class="field-error" id="err_' + f.key + '" hidden></p>' +
      '</div>';
  }

  function validateField(f, value) {
    const v = String(value || '').trim();
    if (f.required && !v) return 'Medan ini wajib diisi.';
    if (!v) return '';
    if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return 'Format e-mel tidak sah.';
    if (f.type === 'tel' && !/^[+()\d\s-]{7,20}$/.test(v)) return 'Format nombor telefon tidak sah.';
    if (f.type === 'url' && !/^https?:\/\/\S+$/i.test(v)) return 'Sertakan URL lengkap bermula dengan https://';
    if (f.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Tarikh tidak sah.';
    if (f.type === 'number') {
      const n = Number(v);
      if (isNaN(n)) return 'Masukkan nombor yang sah.';
      if (f.min !== undefined && n < Number(f.min)) return 'Nilai minimum ialah ' + f.min + '.';
      if (f.max !== undefined && n > Number(f.max)) return 'Nilai maksimum ialah ' + f.max + '.';
    }
    return '';
  }

  function openForm(key, id) {
    const mod = MODULES[key];
    const existing = id ? ((state.all && state.all[key]) || []).find(function (r) { return String(r.id) === String(id); }) : null;
    if (id && !existing) {
      UI.toast('Rekod tidak dijumpai.', 'error');
      return;
    }
    const row = existing || defaultsFor(mod);
    const fileFields = mod.fields.filter(function (f) { return f.type === 'file'; });
    const files = {};
    fileFields.forEach(function (f) {
      files[f.key] = parseAttachments(row[f.key]).map(function (a) { return Object.assign({}, a); });
    });
    const content =
      '<form id="recordForm" novalidate>' +
        '<div class="form-grid">' + mod.fields.map(function (f) { return fieldMarkup(f, row[f.key]); }).join('') + '</div>' +
      '</form>';

    const footer =
      '<button class="btn btn-ghost" data-close="panel" type="button">Batal</button>' +
      '<button class="btn btn-primary" type="submit" form="recordForm" id="saveBtn">' + UI.icon('check') + (id ? 'Simpan Perubahan' : 'Simpan Rekod') + '</button>';

    UI.openPanel({
      title: id ? 'Sunting Rekod' : 'Rekod Baharu',
      eyebrow: mod.short,
      subtitle: id ? 'Kemas kini maklumat ' + mod.noun + '.' : 'Isi maklumat ' + mod.noun + '. Medan bertanda * wajib diisi.',
      wide: true,
      content: content,
      footer: footer,
      onMount: function (root) {
        const form = root.querySelector('#recordForm');
        const saveBtn = root.querySelector('#saveBtn');

        const renderFiles = function () {
          fileFields.forEach(function (f) {
            const list = form.querySelector('[data-file-list="' + f.key + '"]');
            if (!list) return;
            const items = files[f.key];
            list.innerHTML = items.length ? items.map(function (a, i) {
              const href = UI.safeHref(a.url);
              return '<div class="file-item' + (a.pending ? ' is-pending' : '') + '">' +
                '<span class="file-name">' + UI.esc(a.name) + '</span>' +
                '<span class="file-meta">' + (a.pending ? 'Belum dimuat naik' : UI.esc(formatBytes(a.size))) + '</span>' +
                (href ? '<a class="icon-btn icon-btn--sm" href="' + UI.esc(href) + '" target="_blank" rel="noopener noreferrer" aria-label="Buka ' + UI.esc(a.name) + '">' + UI.icon('external') + '</a>' : '') +
                '<button class="icon-btn icon-btn--sm" type="button" data-file-remove="' + f.key + '" data-index="' + i + '" aria-label="Buang ' + UI.esc(a.name) + '">' + UI.icon('x') + '</button>' +
                '</div>';
            }).join('') : '<p class="muted file-empty">Tiada lampiran.</p>';
          });
        };
        renderFiles();

        form.addEventListener('change', function (event) {
          const input = event.target;
          const key = input && input.dataset ? input.dataset.fileInput : '';
          if (!key) return;
          Array.from(input.files || []).forEach(function (file) {
            const error = attachmentError(file);
            if (error) {
              UI.toast(error, 'error', 5200);
              return;
            }
            files[key].push({ name: file.name, size: file.size, mime: file.type, file: file, pending: true });
          });
          input.value = '';
          renderFiles();
        });

        form.addEventListener('click', function (event) {
          const btn = event.target.closest('[data-file-remove]');
          if (!btn) return;
          files[btn.dataset.fileRemove].splice(Number(btn.dataset.index), 1);
          renderFiles();
        });

        form.addEventListener('submit', async function (event) {
          event.preventDefault();
          let valid = true;
          let firstInvalid = null;
          const data = {};

          mod.fields.forEach(function (f) {
            const input = form.elements[f.key];
            const raw = input ? input.value : '';
            const value = raw.trim();
            const error = validateField(f, value);
            const fieldWrap = form.querySelector('[data-field="' + f.key + '"]');
            const errorEl = form.querySelector('#err_' + f.key);
            if (error) {
              valid = false;
              if (fieldWrap) fieldWrap.classList.add('is-invalid');
              if (errorEl) { errorEl.textContent = error; errorEl.hidden = false; }
              if (!firstInvalid && input) firstInvalid = input;
            } else {
              if (fieldWrap) fieldWrap.classList.remove('is-invalid');
              if (errorEl) { errorEl.textContent = ''; errorEl.hidden = true; }
            }
            data[f.key] = value;
          });

          if (!valid) {
            if (firstInvalid) {
              firstInvalid.focus();
              firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
          }

          const pendingFiles = [];
          fileFields.forEach(function (f) {
            files[f.key].forEach(function (a) { if (a.pending) pendingFiles.push(a); });
          });

          UI.setBusy(saveBtn, true, pendingFiles.length ? 'Memuat naik...' : 'Menyimpan...');
          try {
            for (const a of pendingFiles) {
              const uploaded = await Store.uploadFile(a.file);
              a.id = uploaded.id;
              a.name = uploaded.name;
              a.url = uploaded.url;
              a.mime = uploaded.mime;
              a.size = uploaded.size;
              a.pending = false;
              delete a.file;
            }
            fileFields.forEach(function (f) {
              data[f.key] = JSON.stringify(files[f.key].map(function (a) {
                return { id: a.id || '', name: a.name, url: a.url, mime: a.mime || '', size: a.size || 0 };
              }));
            });

            let saved;
            if (id) saved = await Store.update(key, id, data);
            else saved = await Store.create(key, data);

            const arr = (state.all && state.all[key]) || [];
            if (id) {
              const idx = arr.findIndex(function (r) { return String(r.id) === String(id); });
              if (idx >= 0) arr[idx] = saved;
              else arr.unshift(saved);
            } else {
              arr.unshift(saved);
            }
            if (state.all) state.all[key] = arr;

            UI.closePanel();
            UI.toast(id ? 'Rekod berjaya dikemas kini.' : 'Rekod baharu berjaya disimpan.', 'success');
            updateModeUI();
            updateNavCounts();
            renderCurrent();
          } catch (err) {
            UI.setBusy(saveBtn, false);
            UI.toast(err && err.message ? err.message : 'Rekod gagal disimpan.', 'error', 6500);
          }
        });

        form.addEventListener('input', function (event) {
          const field = event.target.closest('.field');
          if (field && field.classList.contains('is-invalid')) {
            field.classList.remove('is-invalid');
            const errEl = field.querySelector('.field-error');
            if (errEl) { errEl.hidden = true; errEl.textContent = ''; }
          }
          if (event.target && event.target.name === 'sekolah') {
            const match = schoolByName(event.target.value);
            const kodInput = form.elements.kodSekolah;
            if (kodInput && match) kodInput.value = match.kodSekolah;
            const daerahInput = form.elements.daerah;
            if (daerahInput && match && !String(daerahInput.value || '').trim()) daerahInput.value = 'Selangau';
          }
        });

        form.addEventListener('change', function (event) {
          if (event.target && event.target.name === 'sekolah') {
            const match = schoolByName(event.target.value);
            const kodInput = form.elements.kodSekolah;
            if (kodInput) kodInput.value = match ? match.kodSekolah : kodInput.value;
            const daerahInput = form.elements.daerah;
            if (daerahInput && match && !String(daerahInput.value || '').trim()) daerahInput.value = 'Selangau';
          }
        });
      }
    });
  }

  async function deleteRecord(key, id) {
    const mod = MODULES[key];
    const row = ((state.all && state.all[key]) || []).find(function (r) { return String(r.id) === String(id); });
    if (!row) return;
    const ok = await UI.confirm({
      title: 'Padam rekod ini?',
      message: 'Rekod "' + recordTitle(mod, row) + '" akan dipadam secara kekal daripada ' + (Store.isRemote() ? 'Google Sheets' : 'storan demo') + '. Tindakan ini tidak boleh dibatalkan.',
      confirmLabel: 'Ya, padam',
      cancelLabel: 'Batal',
      danger: true
    });
    if (!ok) return;

    try {
      await Store.remove(key, id);
      state.all[key] = ((state.all && state.all[key]) || []).filter(function (r) { return String(r.id) !== String(id); });
      updateNavCounts();
      updateModeUI();
      UI.toast('Rekod telah dipadam.', 'success');
      renderCurrent();
    } catch (err) {
      UI.toast(err && err.message ? err.message : 'Rekod gagal dipadam.', 'error', 6000);
    }
  }

  /* =========================================================== laporan */

  const OFFICIAL_LETTER = `[KEPALA SURAT RASMI SEKOLAH]
[Alamat penuh sekolah]
[No. telefon] | [E-mel rasmi sekolah]

Ruj. Kami : [Kod Sekolah]/ICT/[Bil.]/[Tahun]
Tarikh    : [Hari Bulan Tahun]

Pengarah Pendidikan
Jabatan Pendidikan Negeri Sarawak
Jalan Diplomatik, Off Jalan Bako
93050 Petra Jaya, Kuching, Sarawak

(u.p.: Sektor Pengurusan Maklumat ICT — Pasukan Teknikal ICT Daerah Selangau)

Tuan/Puan,

PERMOHONAN KHIDMAT BANTUAN TEKNIKAL ICT —
[PENDAWAIAN SEMULA KABEL LAN / SEMAKAN ASET ICT]
DI [NAMA PENUH SEKOLAH], [DAERAH]

Dengan segala hormatnya perkara di atas adalah dirujuk.

2. Dimaklumkan bahawa [nyatakan keadaan semasa secara ringkas dan faktual — contoh: rangkaian di Blok B tidak stabil sejak (tarikh) berikutan kabel LAN sedia ada telah usang dan sebahagiannya putus].

3. Butiran keperluan adalah seperti berikut:

   (a) Lokasi          : [Blok / bilik / aras]
   (b) Skop kerja      : [Contoh: pendawaian semula 12 titik rangkaian]
   (c) Bilangan unit   : [Bilangan peranti atau titik terlibat]
   (d) Tarikh dicadang : [Tarikh atau julat tarikh yang sesuai]

4. Keadaan ini menjejaskan [nyatakan kesan — contoh: pelaksanaan PdP berasaskan digital, urusan pentadbiran sekolah dan persediaan peperiksaan berasaskan komputer].

5. Sehubungan itu, pihak sekolah memohon jasa baik pihak tuan/puan untuk mengaturkan lawatan juruteknik Pasukan Teknikal ICT Daerah Selangau bagi tujuan pemeriksaan dan pelaksanaan kerja berkenaan.

6. Sebarang pertanyaan lanjut boleh dirujuk kepada [nama pegawai perhubungan], [jawatan], di talian [no. telefon] atau e-mel [alamat e-mel].

Kerjasama dan perhatian pihak tuan/puan amatlah dihargai dan didahului dengan ucapan terima kasih.

Sekian.

"BERKHIDMAT UNTUK NEGARA"

Saya yang menjalankan amanah,


...............................................
([NAMA PENGETUA / GURU BESAR])
Pengetua / Guru Besar
[Nama Sekolah]

s.k.  Pegawai Pendidikan Daerah [Daerah]
      Penyelaras PTIS Daerah [Daerah]
      Fail Timbul ICT Sekolah`;

  const OFFICIAL_EMAIL_SUBJECT = 'PERMOHONAN KHIDMAT BANTUAN TEKNIKAL ICT — [JENIS KERJA] — [NAMA SEKOLAH]';

  const OFFICIAL_EMAIL_BODY = `Kepada Sektor Pengurusan Maklumat ICT / Pasukan Teknikal ICT Daerah Selangau,

PERMOHONAN KHIDMAT BANTUAN TEKNIKAL ICT

Tuan/Puan,

Dengan segala hormatnya perkara di atas adalah dirujuk. Pihak sekolah memohon lawatan juruteknik Pasukan Teknikal ICT Daerah Selangau bagi kerja teknikal berikut:

1. Nama sekolah       : [NAMA PENUH SEKOLAH]
2. Kod sekolah        : [KOD SEKOLAH]
3. Daerah             : [DAERAH]
4. Jenis kerja        : [PENDAWAIAN / PEMASANGAN / SEMAKAN ASET / LAIN-LAIN]
5. Lokasi             : [BLOK / BILIK / ARAS]
6. Skop kerja         : [BUTIRAN RINGKAS DAN FAKTUAL]
7. Bilangan unit      : [BILANGAN PERANTI ATAU TITIK TERLIBAT]
8. Tarikh dicadangkan : [TARIKH ATAU JULAT TARIKH]
9. Kesan kepada PdP / pentadbiran / peperiksaan : [NYATAKAN KESAN]
10. No. rujukan ISD berkaitan (jika ada) : [NOMBOR RUJUKAN]

Pegawai perhubungan sekolah:
Nama     : [NAMA PEGAWAI]
Jawatan  : [JAWATAN]
Telefon  : [NO. TELEFON]
E-mel    : [E-MEL RASMI]

Surat rasmi bertandatangan pengetua/guru besar berserta gambar, pelan lantai atau senarai aset disertakan bersama e-mel ini.

Kerjasama dan perhatian pihak tuan/puan didahului dengan ucapan terima kasih.

Sekian.

Saya yang menjalankan amanah,
[NAMA PENGETUA / GURU BESAR]
[NAMA SEKOLAH]`;

  function guideList(items) {
    return '<ul class="guide-list">' + items.map(function (item) {
      return '<li><strong>' + UI.esc(item[0]) + '</strong><span>' + UI.esc(item[1]) + '</span></li>';
    }).join('') + '</ul>';
  }

  function guideSteps(items) {
    return '<ol class="steps guide-steps">' + items.map(function (item, index) {
      return '<li><span>' + String(index + 1).padStart(2, '0') + '</span><div><strong>' + UI.esc(item[0]) + '</strong><p>' + UI.esc(item[1]) + '</p></div></li>';
    }).join('') + '</ol>';
  }

  function renderGuide() {
    const cfg = Store.getConfig();
    const email = String(cfg.officialEmail || '').trim();
    const isdUrl = APP_CONFIG.isdUrl || 'https://isd.moe.gov.my';
    const subject = encodeURIComponent(OFFICIAL_EMAIL_SUBJECT);
    const body = encodeURIComponent(OFFICIAL_EMAIL_BODY);
    const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(email) + '&su=' + subject + '&body=' + body;
    const mailUrl = 'mailto:' + encodeURIComponent(email) + '?subject=' + subject + '&body=' + body;

    view.innerHTML =
      '<section class="page-head">' +
        '<div class="page-head-main">' +
          '<a class="back-link" href="#/">' + UI.icon('chevron') + 'Papan Pemuka</a>' +
          '<div class="title-row"><span class="page-icon tone-blue">' + UI.icon('book') + '</span>' +
          '<div><h2>Panduan Laporan Sekolah</h2><p>Aduan melalui ISD atau permohonan kerja teknikal melalui surat dan e-mel rasmi.</p></div></div>' +
        '</div>' +
      '</section>' +

      '<div class="guide-channel-grid">' +
        '<section class="card guide-channel guide-channel--blue" id="saluran-isd">' +
          '<div class="card-body">' +
            '<span class="guide-channel-tag">Saluran 01 · ISD</span>' +
            '<h3>Aduan perkhidmatan & peranti KPM</h3>' +
            '<p>ISD (Integrated Service Desk) ialah meja bantuan berpusat KPM. Setiap aduan direkod, diberi nombor rujukan, diagihkan dan dipantau sehingga ditutup.</p>' +
            '<a class="btn btn-primary" href="' + UI.esc(isdUrl) + '" target="_blank" rel="noopener noreferrer">' + UI.icon('external') + 'Buka Portal ISD</a>' +
          '</div>' +
        '</section>' +
        '<section class="card guide-channel guide-channel--teal">' +
          '<div class="card-body">' +
            '<span class="guide-channel-tag">Saluran 02 · Surat / e-mel rasmi</span>' +
            '<h3>Kerja teknikal di lokasi sekolah</h3>' +
            '<p>Kerja yang memerlukan tenaga dan masa juruteknik di premis sekolah perlu dijadualkan melalui surat rasmi daripada pengetua atau guru besar.</p>' +
            '<a class="btn btn-primary" href="#surat-rasmi">' + UI.icon('mail') + 'Sediakan Surat Rasmi</a>' +
          '</div>' +
        '</section>' +
      '</div>' +

      '<div class="note note--info guide-note">' + UI.icon('info') + '<span><strong>Jangan lapor hanya melalui WhatsApp atau panggilan telefon.</strong> Ia tiada nombor rujukan rasmi dan sukar dipantau. Gunakan ISD atau surat rasmi, kemudian hubungi penyelaras PTIS daerah jika masih tidak pasti.</span></div>' +

      '<section class="card guide-card">' +
        '<div class="card-head"><div><span class="eyebrow">Skop</span><h3>Saluran mana yang perlu digunakan?</h3></div></div>' +
        '<div class="card-body guide-scope-grid">' +
          '<div class="guide-scope">' +
            '<h4>Lapor melalui ISD</h4>' +
            '<p>Perkhidmatan dan peranti di bawah kontrak atau lesen pusat KPM.</p>' +
            guideList([
              ['Peranti pajakan', 'Peranti Guru, JTK, Peranti Cerdik, Chromebook dan komputer pajakan yang rosak, tidak boot, skrin pecah atau perlu tuntutan waranti.'],
              ['Lesen Microsoft 365', 'Akaun tidak aktif, lesen tamat, kata laluan terkunci, pendaftaran pengguna baharu atau penarikan lesen.'],
              ['E-mel rasmi KPM', 'Akaun @moe.gov.my tidak dapat diakses, kata laluan perlu ditetapkan semula atau akaun baharu diperlukan.'],
              ['Talian internet kontrak', 'Talian terputus, kelajuan jauh di bawah kontrak atau peralatan rangkaian vendor gagal berfungsi.'],
              ['Sistem aplikasi KPM', 'Masalah log masuk atau ralat SSDM, APDM, e-Operasi, SPLKPM dan portal pusat lain.'],
              ['Perkakasan di bawah waranti', 'Peralatan ICT bekalan KPM yang masih dalam tempoh waranti atau kontrak penyelenggaraan vendor.']
            ]) +
          '</div>' +
          '<div class="guide-scope">' +
            '<h4>Hantar surat rasmi kepada PTIS</h4>' +
          '  <p>Kerja teknikal di lokasi yang berada di luar kontrak pusat.</p>' +
            guideList([
              ['Pendawaian semula kabel LAN', 'Kabel baharu atau rosak, titik rangkaian di blok baharu, rak dan patch panel.'],
              ['Semakan aset ICT sekolah', 'Verifikasi fizikal, pengiraan semula, pelabelan dan penyelarasan rekod aset alih kerajaan.'],
              ['Pemasangan & pemindahan', 'Makmal komputer, pemindahan peralatan antara blok, projektor, papan interaktif atau CCTV rangkaian.'],
              ['Khidmat nasihat pelupusan', 'Nasihat teknikal dan pengesahan keadaan peralatan bagi proses pelupusan aset alih kerajaan.'],
              ['Bimbingan & latihan pengguna', 'Sesi bimbingan sistem KPM atau peralatan ICT untuk guru dan staf sekolah.'],
              ['Lawatan menyeluruh', 'Pemeriksaan infrastruktur ICT atau bantuan teknikal bagi program dan peperiksaan berasaskan komputer.']
            ]) +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card guide-card" id="isd">' +
        '<div class="card-head">' +
          '<div><span class="eyebrow">Langkah demi langkah</span><h3>Cara membuat laporan ISD</h3></div>' +
          '<a class="link-more" href="' + UI.esc(isdUrl) + '" target="_blank" rel="noopener noreferrer">isd.moe.gov.my ' + UI.icon('external') + '</a>' +
        '</div>' +
        '<div class="card-body">' +
          guideSteps([
            ['Pastikan ada ID pengguna ISD', 'Lazimnya Guru Penyelaras ICT atau juruteknik PTIS sekolah. Jika belum ada, mohon melalui penyelaras PTIS daerah. Sediakan nama penuh, No. KP, jawatan, e-mel rasmi, kod dan nama sekolah serta pengesahan pengetua/guru besar.'],
            ['Kumpul maklumat sebelum log masuk', 'Sediakan kod sekolah, lokasi tepat, nama peranti, jenama, model, nombor siri, tarikh masalah, gambar dan tindakan yang sudah dicuba.'],
            ['Log masuk ke portal ISD', 'Gunakan ID sekolah dan pilih modul aduan yang betul: peranti, rangkaian, e-mel, lesen atau sistem aplikasi. Jangan buka aduan berulang bagi isu yang sama.'],
            ['Isi aduan dengan tepat', 'Gunakan tajuk peranti + lokasi + gejala, contohnya “Chromebook Peranti Cerdik tidak boot — Makmal 2”. Tulis butiran fakta, lampirkan gambar dan pilih keutamaan dengan jujur.'],
            ['Simpan nombor rujukan', 'Catat nombor rujukan, tarikh dan kategori dalam buku log ICT. Kongsikan dengan juruteknik PTIS sekolah dan simpan tangkapan skrin pengesahan.'],
            ['Pantau dan sahkan penutupan', 'Semak status secara berkala dan sahkan penutupan hanya selepas peranti diuji berfungsi. Rujuk nombor aduan asal jika isu berulang.']
          ]) +
          '<div class="guide-quick">' +
            '<div><strong>01</strong><span>ID pengguna → maklumat lengkap → portal ISD</span></div>' +
            '<div><strong>02</strong><span>Tajuk jelas → butiran fakta → lampiran gambar</span></div>' +
            '<div><strong>03</strong><span>Nombor rujukan → pantau → sahkan penutupan</span></div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card guide-card" id="surat-rasmi">' +
        '<div class="card-head"><div><span class="eyebrow">Di luar skop ISD</span><h3>Surat rasmi & e-mel rasmi kepada PTIS</h3></div></div>' +
        '<div class="card-body">' +
          '<div class="guide-letter-grid">' +
            '<div>' +
              '<h4>Kenapa surat rasmi diperlukan?</h4>' +
              guideList([
                ['Untuk penjadualan', 'Lawatan disusun mengikut daerah dan keutamaan, bukan mengikut siapa yang menelefon dahulu.'],
                ['Untuk tanggungjawab', 'Kelulusan bertulis melindungi sekolah dan juruteknik apabila kerja menyentuh harta kerajaan dan rekod aset.'],
                ['Untuk perancangan peruntukan', 'Kabel, trunking, switch dan bahan lain dapat dikenal pasti serta dirancang lebih awal.']
              ]) +
            '</div>' +
            '<div>' +
              '<h4>Kandungan wajib</h4>' +
              '<ul class="guide-bullets">' +
                '<li>Kepala surat, nombor rujukan dan tarikh</li>' +
                '<li>Jenis kerja, nama sekolah dan daerah</li>' +
                '<li>Latar belakang ringkas dan sejak bila berlaku</li>' +
                '<li>Blok, bilik, aras serta bilangan titik atau unit</li>' +
                '<li>Justifikasi kesan terhadap PdP, pentadbiran atau peperiksaan</li>' +
                '<li>Cadangan tarikh lawatan dan pegawai perhubungan</li>' +
                '<li>Tandatangan serta cop rasmi pengetua atau guru besar</li>' +
                '<li>Lampiran gambar, pelan lantai, senarai aset atau nombor ISD</li>' +
              '</ul>' +
            '</div>' +
          '</div>' +

          '<h4 class="guide-subhead">Cara menghantar</h4>' +
          guideSteps([
            ['Dapatkan kelulusan rasmi', 'Dapatkan tandatangan dan cop rasmi pengetua atau guru besar.'],
            ['Sediakan satu fail PDF', 'Imbas surat lengkap bersama semua lampiran dalam satu fail PDF.'],
            ['Hantar salinan daerah', 'Hantar salinan kepada Pejabat Pendidikan Daerah dan penyelaras PTIS daerah.'],
            ['Hantar kepada sektor berkenaan', 'Hantar salinan digital kepada Sektor Pengurusan Maklumat ICT melalui e-mel rasmi di bawah.'],
            ['Simpan untuk audit', 'Simpan salinan asal dalam fail timbul ICT sekolah.'],
            ['Susuli dengan berhemah', 'Susuli melalui penyelaras daerah selepas satu minggu jika tiada maklum balas.']
          ]) +

          '<div class="guide-email-box">' +
            '<div class="guide-email-head">' +
              '<div><span class="eyebrow">Hantar digital</span><h4>Tulis e-mel rasmi atau buka terus dalam Gmail</h4></div>' +
              UI.icon('mail') +
            '</div>' +
            '<p>Templat e-mel sudah disediakan. Gantikan semua teks dalam <strong>[KURUNGAN SIKU]</strong>, lengkapkan surat rasmi dan lampirkan PDF sebelum menghantar.</p>' +
            '<div class="guide-recipient"><span>Penerima rasmi</span><strong>' + (email ? UI.esc(email) : 'Belum ditetapkan') + '</strong></div>' +
            '<div class="form-actions form-actions--wrap">' +
              (email
                ? '<a class="btn btn-primary" href="' + UI.esc(gmailUrl) + '" target="_blank" rel="noopener noreferrer">' + UI.icon('mail') + 'Buka Gmail</a>' +
                  '<a class="btn btn-ghost" href="' + UI.esc(mailUrl) + '">' + UI.icon('external') + 'Buka Aplikasi E-mel</a>'
                : '<button class="btn btn-primary" type="button" disabled>' + UI.icon('mail') + 'Buka Gmail</button>' +
                  '<a class="btn btn-ghost" href="#/tetapan">' + UI.icon('settings') + 'Tetapkan E-mel Rasmi</a>') +
              '<button class="btn btn-ghost" type="button" id="copyEmailBtn">' + UI.icon('copy') + 'Salin Templat E-mel</button>' +
            '</div>' +
            (email ? '' : '<p class="hint">Pentadbir perlu mengisi <strong>E-mel rasmi PTIS</strong> di Tetapan untuk mengaktifkan butang Gmail dan aplikasi e-mel. Alamat e-mel tidak diandaikan oleh aplikasi.</p>') +
          '</div>' +

          '<details class="template-details">' +
            '<summary>Lihat templat surat rasmi penuh</summary>' +
            '<pre class="official-template">' + UI.esc(OFFICIAL_LETTER) + '</pre>' +
          '</details>' +
          '<div class="form-actions form-actions--wrap">' +
            '<button class="btn btn-ghost" type="button" id="copyLetterBtn">' + UI.icon('copy') + 'Salin Templat Surat</button>' +
            '<button class="btn btn-ghost" type="button" id="downloadLetterBtn">' + UI.icon('download') + 'Muat Turun Templat (.txt)</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<section class="card guide-card">' +
        '<div class="card-head"><div><span class="eyebrow">Elakkan</span><h3>Kesilapan yang melambatkan penyelesaian</h3></div></div>' +
        '<div class="card-body guide-mistakes">' +
          [
            ['Melapor kerja pendawaian melalui ISD', 'Kerja pemasangan di premis bukan skop vendor kontrak. Gunakan surat rasmi.'],
            ['Aduan tanpa nombor siri', 'Vendor tidak dapat mengesahkan waranti dan aduan mungkin dikembalikan.'],
            ['Mengadu hanya melalui WhatsApp', 'Tiada rekod rasmi, nombor rujukan atau pemantauan.'],
            ['Membuka aduan berulang', 'Aduan berganda memecahkan jejak penyelesaian dan melambatkan agihan tugas.'],
            ['Surat tanpa butiran lokasi', 'Tanpa blok, bilik dan bilangan titik, lawatan sukar dianggarkan dan dijadualkan.'],
            ['Tidak mengesahkan penutupan', 'Aduan yang selesai tetapi tidak disahkan kekal terbuka dalam rekod.']
          ].map(function (item) {
            return '<div class="guide-mistake">' + UI.icon('alert') + '<div><strong>' + UI.esc(item[0]) + '</strong><p>' + UI.esc(item[1]) + '</p></div></div>';
          }).join('') +
        '</div>' +
      '</section>' +

      '<section class="card guide-card">' +
        '<div class="card-head"><div><span class="eyebrow">Rujukan operasi</span><h3>Semakan pentadbiran ICT sekolah</h3></div></div>' +
        '<div class="card-body guide-scope-grid">' +
          '<div class="guide-scope">' +
            '<h4>Perkhidmatan internet (Lampiran 10)</h4>' +
            guideList([
              ['Borang pengesahan bulanan', 'Sediakan dan hantar Borang Pengesahan Penerimaan Perkhidmatan Internet (Lampiran 10) mengikut bulan.'],
              ['Hantar awal', 'Galakkan penghantaran awal bagi membolehkan semakan dan pembetulan dibuat sebelum tarikh akhir.'],
              ['Simpan bukti', 'Simpan salinan borang dan rekod penghantaran dalam fail ICT sekolah untuk rujukan/susulan.']
            ]) +
          '</div>' +
          '<div class="guide-scope">' +
            '<h4>Pelupusan aset ICT (e-Waste)</h4>' +
            '<p>Selepas kelulusan pelupusan diperoleh, sediakan peralatan dan dokumen berkaitan sebelum pengumpulan.</p>' +
            '<ul class="guide-bullets">' +
              '<li>Surat iringan daripada pihak sekolah</li>' +
              '<li>Kew.PA 23 (Sijil Pelupusan)</li>' +
              '<li>Kew.PA 24</li>' +
              '<li>Resit bayaran / resit kutipan hasil (jika berkaitan)</li>' +
              '<li>Dokumen sokongan lain yang diperlukan</li>' +
            '</ul>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="card guide-card">' +
        '<div class="card-head"><div><span class="eyebrow">SCST</span><h3>Pautan SCST Sekolah Selangau</h3></div><span class="badge badge--gold">' + UI.esc(String(scstSchools().length)) + ' sekolah</span></div>' +
        '<div class="card-body">' +
          '<p class="hint" style="margin-bottom:.75rem">Buka modul SCST sekolah (dtpcare) mengikut kod sekolah.</p>' +
          '<div class="form-actions form-actions--wrap guide-scst-links">' +
            scstSchools().map(function (s) {
              var kod = s.kodSekolah || s.kod || '';
              var nama = s.namaSekolah || s.nama || kod;
              return '<a class="btn btn-ghost" href="' + UI.esc(scstDefaultUrl(kod)) + '" target="_blank" rel="noopener noreferrer" title="' + UI.esc(kod + ' — ' + nama) + '">' + UI.icon('external') + UI.esc(nama) + ' <small style="opacity:.75;margin-left:.25rem">(' + UI.esc(kod) + ')</small></a>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="card guide-card">' +
        '<div class="card-head"><div><span class="eyebrow">Rujukan PTIS</span><h3>Pautan berguna</h3></div></div>' +
        '<div class="card-body">' +
          '<div class="guide-links">' +
            '<a class="guide-link tone-gold" href="https://roslantangah.my.canva.site/takwim-ptis-2026" target="_blank" rel="noopener noreferrer">' + UI.icon('calendar') + '<span><strong>Takwim PTIS 2026</strong><small>Rujukan takwim dan perancangan aktiviti PTIS</small></span>' + UI.icon('external') + '</a>' +
            '<a class="guide-link tone-rose" href="https://roslantangah.my.canva.site/sistem-aduan" target="_blank" rel="noopener noreferrer">' + UI.icon('alert') + '<span><strong>Sistem Aduan PTIS</strong><small>Saluran aduan dan pengurusan isu PTIS</small></span>' + UI.icon('external') + '</a>' +
          '</div>' +
        '</div>' +
      '</section>' +
      '<section class="guide-record-callout">' +
        '<div><span class="eyebrow eyebrow--light">Selepas membuat laporan</span>' +
        '<h3>Rekodkan tindakan dalam PTIS</h3>' +
        '<p>Daftarkan pergerakan selepas lawatan teknikal dijadualkan atau selesai. Masukkan nombor rujukan ISD atau surat rasmi dalam medan <strong>Catatan</strong> untuk memudahkan susulan.</p></div>' +
        '<button class="btn btn-gold" type="button" data-action="new" data-key="pergerakan">' + UI.icon('plus') + 'Daftar Pergerakan</button>' +
      '</section>' +

      '<p class="guide-source">Diadaptasi daripada <a href="https://ptissarawak.com/panduan" target="_blank" rel="noopener noreferrer">Panduan Aduan & Permohonan PTIS Sarawak</a>. Hubungi penyelaras PTIS daerah jika tidak pasti saluran yang betul.</p>';

    bindGuide();
  }

  function bindGuide() {
    const letterLink = view.querySelector('a[href="#surat-rasmi"]');
    if (letterLink) {
      letterLink.addEventListener('click', function (event) {
        event.preventDefault();
        const section = document.getElementById('surat-rasmi');
        if (section) {
          section.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            block: 'start'
          });
        }
      });
    }

    const copyEmailBtn = document.getElementById('copyEmailBtn');
    if (copyEmailBtn) {
      copyEmailBtn.addEventListener('click', function () {
        copyGuideText('Subjek: ' + OFFICIAL_EMAIL_SUBJECT + '\n\n' + OFFICIAL_EMAIL_BODY, 'Templat e-mel rasmi telah disalin.');
      });
    }

    const copyLetterBtn = document.getElementById('copyLetterBtn');
    if (copyLetterBtn) {
      copyLetterBtn.addEventListener('click', function () {
        copyGuideText(OFFICIAL_LETTER, 'Templat surat rasmi telah disalin.');
      });
    }

    const downloadLetterBtn = document.getElementById('downloadLetterBtn');
    if (downloadLetterBtn) {
      downloadLetterBtn.addEventListener('click', function () {
        UI.download('Templat-Surat-Rasmi-PTIS.txt', OFFICIAL_LETTER, 'text/plain;charset=utf-8');
        UI.toast('Templat surat rasmi dimuat turun.', 'success');
      });
    }
  }

  function copyGuideText(text, message) {
    function fallback() {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      UI.toast(ok ? message : 'Salinan gagal. Pilih dan salin teks templat secara manual.', ok ? 'success' : 'error', 5000);
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () {
        UI.toast(message, 'success');
      }).catch(fallback);
    } else {
      fallback();
    }
  }

  /* ============================================================ settings */

  function renderSettings() {
    const cfg = Store.getConfig();
    const remote = Store.isRemote();
    const cache = Store.cacheInfo();
    const statusLabel = !remote ? 'Mod Demo' : Store.status.offline ? 'Luar Talian' : Store.status.lastSync ? 'Bersambung' : 'Menyemak...';
    const statusTone = !remote ? 'demo' : Store.status.offline ? 'offline' : Store.status.lastSync ? 'live' : 'demo';

    view.innerHTML =
      '<section class="page-head">' +
        '<div class="page-head-main">' +
          '<a class="back-link" href="#/">' + UI.icon('chevron') + 'Papan Pemuka</a>' +
          '<div class="title-row"><span class="page-icon tone-slate">' + UI.icon('settings') + '</span>' +
          '<div><h2>Tetapan sistem</h2><p>Tetapan umum, sandaran data dan maklumat aplikasi.</p></div></div>' +
        '</div>' +
      '</section>' +

      '<div class="settings-grid">' +

        '<section class="card">' +
          '<div class="card-head">' +
            '<div><span class="eyebrow">Sistem</span><h3>Tetapan umum</h3></div>' +
            '<span id="settingsConnBadge" class="conn-badge conn-badge--' + statusTone + '"><span class="dot"></span>' + statusLabel + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<form id="cfgForm" novalidate>' +
              '<div class="field">' +
                '<label for="cfgTeam">Nama pasukan / daerah</label>' +
                '<input id="cfgTeam" type="text" value="' + UI.esc(cfg.teamLabel) + '" placeholder="Pasukan Teknikal ICT Daerah Selangau">' +
              '</div>' +
              '<div class="field">' +
                '<label for="cfgEmail">E-mel rasmi PTIS <span class="muted">(penerima permohonan)</span></label>' +
                '<input id="cfgEmail" type="email" inputmode="email" autocomplete="off" placeholder="Contoh: ptis.sekolah@gmail.com" value="' + UI.esc(cfg.officialEmail) + '">' +
                '<p class="hint">Dipaparkan dalam <a href="#/panduan">Panduan Laporan</a> untuk butang <strong>Buka Gmail</strong> dan aplikasi e-mel. Gunakan e-mel rasmi, bukan e-mel peribadi.</p>' +
              '</div>' +
              '<div class="form-actions">' +
                '<button class="btn btn-primary" type="submit" id="saveCfgBtn">' + UI.icon('check') + 'Simpan Tetapan</button>' +
              '</div>' +
            '</form>' +
            '<p id="settingsSyncNotice" class="hint settings-sync-error" role="status" hidden></p>' +
          '</div>' +
        '</section>' +

        '<section class="card">' +
          '<div class="card-head">' +
            '<div><span class="eyebrow">Data</span><h3>Sandaran & penyelenggaraan</h3></div>' +
          '</div>' +
          '<div class="card-body">' +
            '<div class="meta-list">' +
              '<div><span>Mod data</span><strong>' + (remote ? 'Google Sheets' : 'Demo (pelayar)') + '</strong></div>' +
              '<div><span>Rekod cache</span><strong id="settingsCacheCount">' + cache.count + ' rekod</strong></div>' +
              '<div><span>Cache terakhir</span><strong id="settingsCacheNewest">' + (cache.newest ? UI.fmtDateTime(cache.newest) : '—') + '</strong></div>' +
              '<div><span>Penyegerakan terakhir</span><strong id="settingsLastSync">' + (Store.status.lastSync ? UI.fmtDateTime(Store.status.lastSync) : '—') + '</strong></div>' +
            '</div>' +
            '<div class="form-actions form-actions--wrap">' +
              '<button class="btn btn-ghost" id="backupBtn">' + UI.icon('download') + 'Sandaran JSON</button>' +
              '<button class="btn btn-ghost" id="importBtn">' + UI.icon('upload') + 'Import JSON</button>' +
              '<button class="btn btn-ghost" id="reloadBtn">' + UI.icon('refresh') + 'Muat Semula</button>' +
              (remote ? '' : '<button class="btn btn-danger-ghost" id="resetBtn">' + UI.icon('refresh') + 'Set Semula Demo</button>') +
            '</div>' +
            '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
            '<p class="hint">Import JSON hanya tersedia dalam mod demo. Untuk Google Sheets, gunakan menu Fail → Import dalam hamparan.</p>' +
          '</div>' +
        '</section>' +

        '<section class="card">' +
          '<div class="card-head">' +
            '<div><span class="eyebrow">Aplikasi</span><h3>Pasang pada peranti</h3></div>' +
            '<span class="version-tag">v' + UI.esc(APP_CONFIG.version) + '</span>' +
          '</div>' +
          '<div class="card-body">' +
            '<p class="body-text">PTIS ialah aplikasi web progresif (PWA). Pasang pada skrin utama untuk pengalaman seperti aplikasi natif.</p>' +
            '<div class="install-row">' +
              '<button class="btn btn-primary" id="installBtn">' + UI.icon('device') + 'Pasang Aplikasi</button>' +
            '</div>' +
            '<div class="platform-hints">' +
              '<div>' + UI.icon('phone') + '<span><strong>Android</strong>Menu Chrome → Pasang aplikasi</span></div>' +
              '<div>' + UI.icon('device') + '<span><strong>iPhone / iPad</strong>Kongsi ' + UI.icon('chevron') + ' Tambah ke Skrin Utama</span></div>' +
            '</div>' +
          '</div>' +
        '</section>' +

        '<section class="card card--about">' +
          '<div class="about-mark"><img src="assets/img/logo.png" alt="PTIS"></div>' +
          '<div>' +
            '<span class="eyebrow">Tentang</span>' +
            '<h3>Pasukan Teknikal ICT Daerah Selangau</h3>' +
            '<p class="body-text">Sistem pengurusan data PTIS yang menyatukan pergerakan, pelaporan kunjung bantu, aset dan maklumat pasukan sekolah.</p>' +
            '<div class="about-vm"><strong>Visi</strong><p>' + UI.esc(APP_CONFIG.visi) + '</p></div>' +
            '<div class="about-vm"><strong>Misi</strong><p>' + UI.esc(APP_CONFIG.misi) + '</p></div>' +
            '<div class="about-tagline">“' + UI.esc(APP_CONFIG.tagline) + '”</div>' +
            '<p class="version-line">PTIS v' + UI.esc(APP_CONFIG.version) + ' · ' + UI.esc(APP_CONFIG.organisation) + '</p>' +
          '</div>' +
        '</section>' +

      '</div>';

    bindSettings();
    updateModeUI();
    refreshSettingsStatusUI();
  }

  function refreshSettingsStatusUI() {
    const badge = document.getElementById('settingsConnBadge');
    if (!badge) return;
    const remote = Store.isRemote();
    const offline = remote && Store.status.offline;
    const cache = Store.cacheInfo();
    badge.className = 'conn-badge conn-badge--' + (!remote ? 'demo' : offline ? 'offline' : 'live');
    badge.innerHTML = '<span class="dot"></span>' + (!remote ? 'Mod Demo' : offline ? 'Luar Talian' : 'Bersambung');

    const count = document.getElementById('settingsCacheCount');
    const newest = document.getElementById('settingsCacheNewest');
    const lastSync = document.getElementById('settingsLastSync');
    if (count) count.textContent = cache.count + ' rekod';
    if (newest) newest.textContent = cache.newest ? UI.fmtDateTime(cache.newest) : '—';
    if (lastSync) lastSync.textContent = Store.status.lastSync ? UI.fmtDateTime(Store.status.lastSync) : '—';

    const notice = document.getElementById('settingsSyncNotice');
    if (!notice) return;
    if (offline) {
      notice.textContent = 'Sambungan terganggu. ' +
        (Store.status.lastError || 'Tidak dapat membaca data Google Sheets.') +
        ' Semak tab dan kebenaran Apps Script, kemudian cuba muat semula.';
      notice.hidden = false;
    } else if (remote && Store.status.lastSync && cache.count === 0) {
      notice.textContent = 'Sambungan aktif, tetapi belum ada rekod dalam Google Sheets. Rekod akan muncul selepas ditambah ke hamparan.';
      notice.hidden = false;
    } else {
      notice.hidden = true;
      notice.textContent = '';
    }
  }

  function bindSettings() {
    const form = document.getElementById('cfgForm');

    function saveConfigFromForm() {
      const teamLabel = document.getElementById('cfgTeam').value.trim() || 'Pasukan Teknikal ICT Daerah Selangau';
      const officialEmail = document.getElementById('cfgEmail').value.trim();
      if (officialEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
        throw new Error('E-mel rasmi PTIS tidak sah. Semak ejaan alamat e-mel.');
      }
      const prev = Store.getConfig();
      Store.saveConfig({ url: prev.url, token: prev.token, teamLabel: teamLabel, officialEmail: officialEmail });
      state.all = null;
      updateModeUI();
      renderNav();
      updateNavCounts();
      return Store.getConfig();
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        try {
          saveConfigFromForm();
          UI.toast('Tetapan disimpan.', 'success');
          renderSettings();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      });
    }

    /* Kawalan akses/log masuk telah dibuang. */

    const backupBtn = document.getElementById('backupBtn');
    if (backupBtn) {
      backupBtn.addEventListener('click', async function () {
        backupBtn.disabled = true;
        try {
          const data = await Store.exportAll();
          UI.download('PTIS-sandaran-' + UI.todayISO() + '.json', JSON.stringify(data, null, 2), 'application/json');
          UI.toast('Fail sandaran dimuat turun.', 'success');
        } catch (err) {
          UI.toast(err.message || 'Sandaran gagal.', 'error');
        } finally {
          backupBtn.disabled = false;
        }
      });
    }

    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    if (importBtn && importFile) {
      importBtn.addEventListener('click', function () {
        if (Store.isRemote()) {
          UI.toast('Import JSON hanya untuk mod demo. Gunakan import hamparan Google Sheets.', 'error', 5200);
          return;
        }
        importFile.click();
      });
      importFile.addEventListener('change', async function () {
        const file = importFile.files && importFile.files[0];
        if (!file) return;
        try {
          const text = await file.text();
          const payload = JSON.parse(text);
          const ok = await UI.confirm({
            title: 'Import data sandaran?',
            message: 'Data demo semasa akan diganti dengan kandungan fail ini. Teruskan?',
            confirmLabel: 'Import',
            danger: true
          });
          if (!ok) return;
          Store.importDemo(payload);
          state.all = null;
          await ensureAll(true);
          UI.toast('Data sandaran berjaya diimport.', 'success');
          renderSettings();
        } catch (err) {
          UI.toast('Fail tidak sah: ' + (err.message || 'format tidak dikenali.'), 'error', 6000);
        } finally {
          importFile.value = '';
        }
      });
    }

    const reloadBtn = document.getElementById('reloadBtn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', async function () {
        reloadBtn.disabled = true;
        try {
          state.all = null;
          Store.clearCache();
          await ensureAll(true);
          UI.toast('Data dimuat semula daripada sumber.', 'success');
          renderSettings();
        } catch (err) {
          UI.toast(err.message || 'Gagal memuat semula.', 'error');
        } finally {
          reloadBtn.disabled = false;
        }
      });
    }

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', async function () {
        const ok = await UI.confirm({
          title: 'Set semula data demo?',
          message: 'Semua perubahan pada data demo akan dipadam dan diganti dengan data contoh asal.',
          confirmLabel: 'Set semula',
          danger: true
        });
        if (!ok) return;
        Store.resetDemo();
        state.all = null;
        await ensureAll(true);
        UI.toast('Data demo telah diset semula.', 'success');
        renderSettings();
      });
    }

    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.addEventListener('click', async function () {
        if (installPrompt) {
          installPrompt.prompt();
          const choice = await installPrompt.userChoice;
          if (choice && choice.outcome === 'accepted') {
            UI.toast('Aplikasi sedang dipasang.', 'success');
          }
          installPrompt = null;
          return;
        }
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        UI.toast(iOS
          ? 'iPhone/iPad: tekan butang Kongsi, kemudian "Tambah ke Skrin Utama".'
          : 'Gunakan menu pelayar → "Pasang aplikasi" atau "Tambah ke skrin utama".', 'info', 6000);
      });
    }
  }

  /* ============================================================== export */

  function csvCell(value) {
    const s = String(value === undefined || value === null ? '' : value);
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function exportCSV(key) {
    const mod = MODULES[key];
    const rows = filteredRows(key);
    if (!rows.length) {
      UI.toast('Tiada rekod untuk dieksport.', 'error');
      return;
    }
    const lines = [mod.fields.map(function (f) { return csvCell(f.label); }).join(',')];
    rows.forEach(function (r) {
      lines.push(mod.fields.map(function (f) { return csvCell(r[f.key]); }).join(','));
    });
    const content = '\uFEFF' + lines.join('\r\n');
    UI.download('PTIS-' + mod.short.replace(/\s+/g, '-') + '-' + UI.todayISO() + '.csv', content, 'text/csv;charset=utf-8');
    UI.toast(rows.length + ' rekod dieksport ke CSV.', 'success');
  }

  /* ============================================================== events */

  function bindGlobal() {
    menuBtn.addEventListener('click', function () {
      if (document.getElementById('sidebar').classList.contains('open')) closeSidebar();
      else openSidebar();
    });
    scrim.addEventListener('click', closeSidebar);

    document.getElementById('avatarBtn').addEventListener('click', function () {
      location.hash = '#/tetapan';
    });

    document.getElementById('refreshBtn').addEventListener('click', async function () {
      const btn = this;
      if (btn.classList.contains('spinning')) return;
      btn.classList.add('spinning');
      try {
        state.all = null;
        if (Store.isRemote()) Store.clearCache();
        await ensureAll(true);
        UI.toast('Data dimuat semula.', 'success');
        renderCurrent();
        closeSidebar();
      } finally {
        setTimeout(function () { btn.classList.remove('spinning'); }, 500);
      }
    });

    document.addEventListener('click', function (event) {
      const actionEl = event.target.closest('[data-action]');
      if (actionEl) {
        const action = actionEl.getAttribute('data-action');
        const key = actionEl.getAttribute('data-key');
        const id = actionEl.getAttribute('data-id');

        if (action === 'new') { event.preventDefault(); openForm(key); return; }
        if (action === 'edit') { event.preventDefault(); event.stopPropagation(); UI.closeModal(); openForm(key, id); return; }
        if (action === 'detail') { event.preventDefault(); event.stopPropagation(); openDetail(key, id); return; }
        if (action === 'delete') { event.preventDefault(); event.stopPropagation(); deleteRecord(key, id); return; }
        if (action === 'export') { event.preventDefault(); exportCSV(key); return; }
        if (action === 'more') {
          event.preventDefault();
          state.limit[key] = (state.limit[key] || 25) + 25;
          renderList(key);
          return;
        }
        if (action === 'clear-filter') {
          state.search[key] = '';
          state.filter[key] = '';
          state.limit[key] = 25;
          renderModule(key);
          return;
        }
        if (action === 'open-sidebar') { event.preventDefault(); openSidebar(); return; }
      }

      const rowEl = event.target.closest('[data-row]');
      if (rowEl && !event.target.closest('[data-action]') && !event.target.closest('a')) {
        openDetail(rowEl.getAttribute('data-key'), rowEl.getAttribute('data-id'));
      }

      const navLink = event.target.closest('.sidebar a, .bottomnav a');
      if (navLink) closeSidebar();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeSidebar();
      if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-row]')) {
        event.preventDefault();
        openDetail(event.target.getAttribute('data-key'), event.target.getAttribute('data-id'));
      }
    });

    document.addEventListener('input', function (event) {
      const input = event.target;
      if (input.matches('[data-action="search"]')) {
        const key = input.getAttribute('data-key');
        state.search[key] = input.value;
        state.limit[key] = 25;
        clearTimeout(searchTimers[key]);
        searchTimers[key] = setTimeout(function () { renderList(key); }, 180);
      }
    });

    document.addEventListener('change', function (event) {
      const sel = event.target;
      if (sel.matches('[data-filter]')) {
        const key = sel.getAttribute('data-filter');
        state.filter[key] = sel.value;
        state.limit[key] = 25;
        renderList(key);
      }
    });
  }

  function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    scrim.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
    if (window.innerWidth < 900) document.body.classList.add('no-scroll');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    scrim.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
    if (!document.getElementById('drawer-root').children.length && !document.getElementById('modal-root').children.length) {
      document.body.classList.remove('no-scroll');
    }
  }

  /* ============================================================ skeleton */

  function skeletonHTML(kind) {
    if (kind === 'home') {
      return '<div class="skeleton-page" aria-hidden="true">' +
        '<div class="sk sk-hero"></div>' +
        '<div class="sk-row">' + '<div class="sk sk-kpi"></div>'.repeat(4) + '</div>' +
        '<div class="sk sk-line"></div>' +
        '<div class="sk-row">' + '<div class="sk sk-card"></div>'.repeat(3) + '</div>' +
        '</div>';
    }
    return '<div class="skeleton-page" aria-hidden="true">' +
      '<div class="sk sk-line"></div>' +
      '<div class="sk sk-title"></div>' +
      '<div class="sk-row">' + '<div class="sk sk-kpi"></div>'.repeat(3) + '</div>' +
      '<div class="sk sk-table"></div>' +
      '</div>';
  }

  /* -------------------------------------------------------------- start */
  init();
})();
