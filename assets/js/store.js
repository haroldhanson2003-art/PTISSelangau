/* ==========================================================================
   PTIS · Lapisan data
   - Mod Demo   : data contoh disimpan dalam localStorage pelayar.
   - Mod Google : data sebenar melalui Apps Script Web App (Google Sheets).
   ========================================================================== */
(function () {
  'use strict';

  const CFG_KEY = 'ptis.config.v1';
  const DEMO_KEY = 'ptis.demo.v10';
  const MODE_KEY = 'ptis.mode.v1';
  const CACHE_PREFIX = 'ptis.cache.v1.';

  const status = { offline: false, lastError: null, lastSync: null };

  /* ---------------------------------------------------------------- util */

  function uid() {
    try {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* fallback */ }
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function iso(daysOffset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + (daysOffset || 0));
    return d.toISOString().slice(0, 10);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn('Penyimpanan penuh atau disekat:', e);
      return false;
    }
  }

  /* ------------------------------------------------------------- config */

  // Mod demo ialah pilihan berasingan daripada URL pangkalan data.
  // (Dahulu butang demo menulis url kosong, lalu sambungan Google Sheets hilang.)
  function isDemo() {
    return readJSON(MODE_KEY, 'live') === 'demo';
  }

  function setMode(mode) {
    writeJSON(MODE_KEY, mode === 'demo' ? 'demo' : 'live');
    status.offline = false;
    status.lastError = null;
    status.lastSync = null;
  }

  function getConfig() {
    const saved = readJSON(CFG_KEY, {}) || {};
    const configured = String(APP_CONFIG.appsScriptUrl || '');
    let url = Object.prototype.hasOwnProperty.call(saved, 'url')
      ? String(saved.url || '')
      : configured;

    // Pulihkan URL yang dikosongkan oleh versi lama semasa pengguna memilih demo.
    if (!url && !isDemo()) url = configured;

    return {
      url: url,
      token: Object.prototype.hasOwnProperty.call(saved, 'token')
        ? String(saved.token || '')
        : (APP_CONFIG.apiToken || ''),
      teamLabel: saved.teamLabel || 'Pasukan Teknikal ICT Sekolah Daerah Selangau',
      officialEmail: saved.officialEmail || APP_CONFIG.officialEmail || ''
    };
  }

  function saveConfig(patch) {
    const current = getConfig();
    const next = Object.assign({}, current, patch);
    const connectionChanged = current.url !== String(next.url || '').trim() ||
      current.token !== String(next.token || '').trim();
    next.url = String(next.url || '').trim();
    next.token = String(next.token || '').trim();
    next.teamLabel = String(next.teamLabel || 'Pasukan Teknikal ICT Sekolah Daerah Selangau').trim();
    next.officialEmail = String(next.officialEmail || '').trim();
    writeJSON(CFG_KEY, next);
    if (connectionChanged) {
      status.offline = false;
      status.lastError = null;
      status.lastSync = null;
    }
    return next;
  }

  function isRemote() {
    return !isDemo() && Boolean(getConfig().url);
  }

  function sessionToken() {
    try {
      return (window.Auth && Auth.getSessionToken) ? Auth.getSessionToken() : '';
    } catch (e) {
      return '';
    }
  }

  function cacheKey(sheet) {
    return CACHE_PREFIX + sheet;
  }

  function clearCache() {
    Object.keys(localStorage).forEach(function (key) {
      if (key.indexOf(CACHE_PREFIX) === 0) localStorage.removeItem(key);
    });
  }

  /* ----------------------------------------------------------- demo seed */

  function seedData() {
    const now = new Date().toISOString();
    const mk = (modKey, i, data) => {
      const mod = MODULES[modKey];
      const base = { id: 'demo-' + modKey + '-' + i, createdAt: now, updatedAt: now };
      mod.fields.forEach(function (f) { if (!(f.key in data)) base[f.key] = ''; });
      return Object.assign(base, data);
    };

    const pergerakan = [];
    const kunjungBantu = [];

    const peralatan = [
      { sekolah: "SEKOLAH KEBANGSAAN BUKIT ARIP", kodSekolah: "YBA3206", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15DB2", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "" },
      { sekolah: "SEKOLAH KEBANGSAAN BUKIT ARIP", kodSekolah: "YBA3206", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15D7H", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "" },
      { sekolah: "SEKOLAH KEBANGSAAN BUKIT ARIP", kodSekolah: "YBA3206", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15D79", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: YLT19F59 MONITOR: SVTV0MLHF", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBA3405/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15DBA MONITOR: SVTV0MLHD", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT PT", catatan: "No. Pendaftaran: STQ/KPM/YBA3405/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D7V MONITOR: SVTV0MLHH", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PSS", catatan: "No. Pendaftaran: STQ/KPM/YBA3405/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517580", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: E83562B5H517580" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517635", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: E83562B5H517635" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15D49", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: STQ/KPM/YBA3408/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SVTVOMLHA", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBA3408/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SVTVOMLHC", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBA3408/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517640", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBA3408/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517579", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBA3408/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D6S MONITOR: SVTV0MLGT", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU BESAR", catatan: "No. Pendaftaran: STQ/KPM/YBB3405/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D9F MONITOR: SVTV0MLGL", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3405/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D6L MONITOR: SVTV0MLGX", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3405/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517637", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3405/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHERMFC-T930DW", noSiri: "E83562B5H517590", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3405/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D72 MONITOR: SVTV0MLHM", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3406/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15B8D MONITOR: SVTV0MLHK", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3406/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D6V MONITOR: SVTV0MLHJ", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3406/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517628", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3406/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517643", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3406/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BAWANG", kodSekolah: "YBB3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517473", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT", catatan: "No. Pendaftaran: STQ/KPM/YBB3408/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BAWANG", kodSekolah: "YBB3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517462", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT", catatan: "No. Pendaftaran: STQ/KPM/YBB3408/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15D8N", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3409/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15DB4", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3409/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15DL6", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3409/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517586", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3409/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E8356285H517581", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBB3409/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15D8J", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK PENTADBIR BANTU", catatan: "No. Pendaftaran: STQ/KPM/YBB3410/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517625", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3410/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CNP", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBB3410/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517639", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3410/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CMC", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PUSAT SUMBER SEKOLAH", catatan: "No. Pendaftaran: STQ/KPM/YBB3410/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA PELUGAU", kodSekolah: "YBB3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "PC:SYLT15D2P MONITOR:SVTV0MLH5", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: STQ/KPM/YBB3412/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA PELUGAU", kodSekolah: "YBB3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4                            Brother MFC-T930DW", noSiri: "PC:SYLT15CLM MONITOR:SVTV0MLHG           E83562B5H517653", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK PT", catatan: "No. Pendaftaran: STQ/KPM/YBB3412/DT/2025/02                 STQ/KPM/YBB3412/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA PELUGAU", kodSekolah: "YBB3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4                     Brother MFC-T930DW", noSiri: "PC:SYLT15CR8 MONITOR:SVTV0MLHE                            E83562B5H517321", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK PPM", catatan: "No. Pendaftaran: STQ/KPM/YBB3412/DT/2025/03         STQ/KPM/YBB3412/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CND", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3415/DT/2025" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15D2X", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3415/DT/2025" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CP5", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3415/DT/2025" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517497", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3415/PR/2025" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517568", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3415/PR/2025" },
      { sekolah: "SEKOLAH KEBANGSAAN SG SEPIRING SG TEPUS", kodSekolah: "YBB3416", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15BB0", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3416/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SG SEPIRING SG TEPUS", kodSekolah: "YBB3416", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15BNA", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3416/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SG SEPIRING SG TEPUS", kodSekolah: "YBB3416", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15BKQ", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3416/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CMY", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3502/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562/B5H517327", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3502/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CN4", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3502/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517313", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3502/PR/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "SYLT15CLT", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3502/DT/2025/" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre Neo 50s Gen 4", noSiri: "SYLT15CMR", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU BESAR", catatan: "No. Pendaftaran: STQ/KPM/YBB3505/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517344", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3505/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre Neo 50s Gen 4", noSiri: "SYLT15CM3", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK KERANI", catatan: "No. Pendaftaran: STQ/KPM/YBB3505/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "E83562B5H517330", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBB3505/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre Neo 50s Gen 4", noSiri: "SYLT15CMV", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBB3505/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN PENGHULU IMBAN", kodSekolah: "YBB3506", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H516066", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3506/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN PENGHULU IMBAN", kodSekolah: "YBB3506", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H516022", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBB3506/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15D2L/\nSVTVOMLFU", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBE3408/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CMO/\nSVTVOMLG5", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK PT", catatan: "No. Pendaftaran: STQ/KPM/YBE3408/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CLQ/\nSVTV0MLG5", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: STQ/KPM/YBE3408/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517615", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBE3408/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "BROTHER MFC-T930DW", noSiri: "E83562B5H517648", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: STQ/KPM/YBE3408/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA LEMAI", kodSekolah: "YBE3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CV0 \nSVTV0ML0C", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU BESAR", catatan: "No. Pendaftaran: STQ/KPM/YBE3412/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA LEMAI", kodSekolah: "YBE3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CNA\nSVTV0MLG1", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBE3412/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA LEMAI", kodSekolah: "YBE3412", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CNA\nSVTV0MLGD", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GURU", catatan: "No. Pendaftaran: STQ/KPM/YBE3412/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CPB/             SVTV0MLGG", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK ASRAMA", catatan: "No. Pendaftaran: STQ/KPM/YBE3413/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "MFC-T930DW", model: "MFC-T930DW", noSiri: "E83562B5H517633", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBE3413/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CMX/              SVTV0MLGE", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK ASRAMA", catatan: "No. Pendaftaran: STQ/KPM/YBE3413/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15CNH/SVT0MLGK", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK ASRAMA", catatan: "No. Pendaftaran: STQ/KPM/YBE3413/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "MFC-T930DW", model: "MFC-T930DW", noSiri: "E83562B5H517589", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YBE3413/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15CNL", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBE3414/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15CLX", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK ASRAMA", catatan: "No. Pendaftaran: STQ/KPM/YBE3414/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THINKCENTRE NEO 50s Gen 4", noSiri: "SYLT15D27", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBE3414/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW BROTHER", noSiri: "E83562B5H517470", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBE3414/PR/2025/01/" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW BROTHER", noSiri: "E83562B5H517475", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YBE3414/PR/2025/02/" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s GEN 4 / LENOVO", noSiri: "SYLT15BCO", tarikhPerolehan: "", keadaan: "Baik", lokasi: "BILIK GB", catatan: "No. Pendaftaran: STQ/KPM/YCB3501/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s GEN 4 / LENOVO", noSiri: "SYLT15BLO", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YCB3501/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T93ODW / BROTHER", noSiri: "E83562B5H517621", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YCB3501/PR/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50s GEN 4 / LENOVO", noSiri: "SYLT15BNC", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YCB3501/DT/2025/03" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW / BROTHER", noSiri: "E83562B5H517487", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YCB3501/PR/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MARK", kodSekolah: "YCB3503", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THNIKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D74 MONITOR: SVTV0MLGN", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YCB3503/DT/2025/01" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MARK", kodSekolah: "YCB3503", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THNIKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15DBC MONITOR: SVTV0MLH0", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YCB3503/DT/2025/02" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MARK", kodSekolah: "YCB3503", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "LENOVO THNIKCENTRE NEO 50S GEN 4", noSiri: "DESKTOP: SYLT15D78 MONITOR: SVT0MLGW", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YCB3503/DT/2025/03" },
      { sekolah: "SEKOLAH JENIS KEBANGSAAN (CINA) TONG AH", kodSekolah: "YCC3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4 & Brother MFC-T930DW", noSiri: "DEKSTOP: SYLT15BAT MONITOR: SVTV0MLGQ PENCETAK: E83562B5H517517", tarikhPerolehan: "", keadaan: "Baik", lokasi: "Bilik GB", catatan: "No. Pendaftaran: STQ/KPM/YCC3405/DT/2025/01 & STQ/KPM/YCC3405/PR/2025/01" },
      { sekolah: "SEKOLAH JENIS KEBANGSAAN (CINA) TONG AH", kodSekolah: "YCC3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4 & Brother MFC-T930DW", noSiri: "DEKSTOP: SYLT15BL2  MONITOR: SVTV0MLGV PENCETAK: E83562B5H517438", tarikhPerolehan: "", keadaan: "Baik", lokasi: "Pejabat Am", catatan: "No. Pendaftaran: STQ/KPM/YCC3405/DT/2025/02 & STQ/KPM/YCC3405/PR/2025/02" },
      { sekolah: "SEKOLAH JENIS KEBANGSAAN (CINA) TONG AH", kodSekolah: "YCC3405", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "ThinkCentre neo 50s Gen 4", noSiri: "DEKSTOP: SYLT15BB6  MONITOR: SVTV0MLGR", tarikhPerolehan: "", keadaan: "Baik", lokasi: "Pejabat Am", catatan: "No. Pendaftaran: STQ/KPM/YCC3405/DT/2025/03" },
      { sekolah: "SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN", kodSekolah: "YEA3401", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15DAP", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YEA3401/DT/2025/PC03" },
      { sekolah: "SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN", kodSekolah: "YEA3401", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15D8G", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YEA3401/DT/2025/PC01" },
      { sekolah: "SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN", kodSekolah: "YEA3401", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "583562B5H517480", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YEA3401/PR/2025/01" },
      { sekolah: "SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN", kodSekolah: "YEA3401", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Komputer Meja", jenama: "Lenovo", model: "THINKCENTRE NEO 50S GEN 4", noSiri: "SYLT15D6N", tarikhPerolehan: "", keadaan: "Baik", lokasi: "PEJABAT AM", catatan: "No. Pendaftaran: STQ/KPM/YEA3401/PR/2025/PC02" },
      { sekolah: "SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN", kodSekolah: "YEA3401", daerah: "SELANGAU", fasa: "PdT Fasa 2", vendor: "Strateq Sdn. Bhd.", jenisPeralatan: "Pencetak", jenama: "Brother", model: "MFC-T930DW", noSiri: "383562B5H517432", tarikhPerolehan: "", keadaan: "Baik", lokasi: "", catatan: "No. Pendaftaran: STQ/KPM/YEA3401/PR/2025/02" }
    ,
      { sekolah: "SEKOLAH KEBANGSAAN BUKIT ARIP", kodSekolah: "YBA3206", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 235 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG KEMENA", kodSekolah: "YBA3405", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P1", catatan: "Batch B1 · Bil. 236 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN DIJIH", kodSekolah: "YBA3408", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 12, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 237 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN BATU 36", kodSekolah: "YBA3501", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 12, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 238 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA KUA", kodSekolah: "YBB3405", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P1", catatan: "Batch B1 · Bil. 239 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ARAU", kodSekolah: "YBB3406", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P3", catatan: "Batch B1 · Bil. 240 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BAWANG", kodSekolah: "YBB3408", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P1", catatan: "Batch B1 · Bil. 241 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG BULOH", kodSekolah: "YBB3409", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 8, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 242 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG TAU", kodSekolah: "YBB3410", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P2", catatan: "Batch B1 · Bil. 243 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA PELUGAU", kodSekolah: "YBB3412", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 244 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG ANAK", kodSekolah: "YBB3415", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P2", catatan: "Batch B1 · Bil. 245 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SG SEPIRING SG TEPUS", kodSekolah: "YBB3416", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 12, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 246 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA TAJAM", kodSekolah: "YBB3502", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 247 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN SUNGAI PAKOH", kodSekolah: "YBB3505", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P2", catatan: "Batch B1 · Bil. 248 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN PENGHULU IMBAN", kodSekolah: "YBB3506", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 12, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 249 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN NANGA SELANGAU", kodSekolah: "YBE3408", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 12, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 250 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN KUALA LEMAI", kodSekolah: "YBE3412", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P2", catatan: "Batch B1 · Bil. 251 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN IBAN UNION", kodSekolah: "YBE3413", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P1", catatan: "Batch B1 · Bil. 252 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN ULU SG ARIP", kodSekolah: "YBE3414", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P1", catatan: "Batch B1 · Bil. 253 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU", kodSekolah: "YCB3501", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 5, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 254 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH KEBANGSAAN ST MARK", kodSekolah: "YCB3503", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 3, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "P3", catatan: "Batch B1 · Bil. 255 · Kelulusan penerimaan hadiah (Raspberry Pi)" },
      { sekolah: "SEKOLAH JENIS KEBANGSAAN (CINA) TONG AH", kodSekolah: "YCC3405", daerah: 'Selangau', fasa: 'Hadiah Raspberry Pi', vendor: '', jenisPeralatan: 'Raspberry Pi', jenama: 'Raspberry Pi', model: 'Raspberry Pi (Batch B1)', bilangan: 8, noSiri: '', tarikhPerolehan: '', keadaan: 'Baik', lokasi: "LB", catatan: "Batch B1 · Bil. 256 · Kelulusan penerimaan hadiah (Raspberry Pi)" }].map((r, i) => mk('peralatan', i + 1, r));
    const kontrak = [
      { kategori: "PdT (Pentadbiran)", fasa: "PdT Fasa 1", scope: "Sarawak (Lease-to-Use)", vendor: "MHS Resources Sdn. Bhd. (dengan sokongan Cita Information Systems Sdn. Bhd.)", contractNo: "-", start: "2021-09-03", end: "2026-09-02", duration: 60, status: "Tamat", coverage: "Tamat Sept 2026; sahkan Surat Akuan Penamatan & penggantian oleh Fasa 2" },
      { kategori: "PdT (Pentadbiran)", fasa: "PdT Fasa 2", scope: "Zon 7: Sarawak (Lease-to-Own)", vendor: "Strateq Sdn. Bhd.", contractNo: "-", start: "2024", end: "2029", duration: 64, status: "Aktif", coverage: "Aktif di semua 22 PPD Selangau (3 PGB + 0-2 AKP setiap sekolah)" },
      { kategori: "PdP (Makmal Komputer)", fasa: "PdP Fasa 1 & Fasa 2", scope: "Sarawak (Lease-to-Use)", vendor: "Panel ICT KPM Serantau (cth. JAXER Sdn. Bhd. & rakan konsortium)", contractNo: "-", start: "2017", end: "2022 / 2023", duration: 60, status: "Tamat", coverage: "Penamatan fasa & serah terima rasmi selesai hingga 2023" },
      { kategori: "PdP (Makmal Komputer)", fasa: "PdP Fasa 3", scope: "Zon 9: Sarawak (Green ICT Lease-to-Use)", vendor: "Panel Green ICT KPM Pusat", contractNo: "-", start: "2023/2024", end: "2029", duration: 60, status: "Aktif", coverage: "Meliputi 7,992 unit seluruh Sarawak" },
      { kategori: "PdP (Makmal Komputer)", fasa: "PdP Fasa 4", scope: "Zon Sarawak Utara", vendor: "Mesiniaga Berhad", contractNo: "-", start: "2025-12-15", end: "2031", duration: 60, status: "Aktif / Pelaksanaan", coverage: "Sahkan sama ada Selangau di bawah sub-zon Sibu/Tengah atau Bintulu/Utara" },
      { kategori: "Peranti Guru (Laptop Guru)", fasa: "Peranti Guru Fasa 1", scope: "Zon 2: Sarawak", vendor: "Panel KPM Pusat (HP / Rakan Zon Bertauliah)", contractNo: "QT230000000015578", start: "2023-09-15", end: "2028-12-14", duration: 63, status: "Aktif", coverage: "Inisiatif laptop guru lease-to-own seluruh Sarawak" },
      { kategori: "Peranti Guru (Laptop Guru)", fasa: "Peranti Guru Fasa 2", scope: "Zon Sarawak (Lease-to-Own)", vendor: "Pro Office Technology Sdn. Bhd.", contractNo: "QT25000000001233", start: "2026-01-01", end: "2031-04-30", duration: 64, status: "Aktif", coverage: "Fasa terkini pelaksanaan peranti guru" }
    ].map((r, i) => mk('kontrak', i + 1, r));
    const organisasi = [];
    const pasukan = [];
    return {
      Pergerakan: pergerakan,
      KunjungBantu: kunjungBantu,
      Peralatan: peralatan,
      Kontrak: kontrak,
      Organisasi: organisasi,
      Pasukan: pasukan
    };
  }

  function ensureDemo() {
    let data = readJSON(DEMO_KEY, null);
    if (!data || typeof data !== 'object') {
      data = seedData();
      writeJSON(DEMO_KEY, data);
    }
    MODULE_ORDER.forEach(function (key) {
      const mod = MODULES[key];
      if (!mod || mod.db === false || !mod.sheet) return;
      const sheet = mod.sheet;
      if (!Array.isArray(data[sheet])) data[sheet] = [];
    });
    return data;
  }

  function demoRows(mod) {
    return ensureDemo()[mod.sheet] || [];
  }

  function writeDemoRows(mod, rows) {
    const data = ensureDemo();
    data[mod.sheet] = rows;
    writeJSON(DEMO_KEY, data);
  }

  /* ---------------------------------------------------------- normalise */

  function normalize(mod, row) {
    const out = {
      id: row && row.id ? String(row.id) : uid(),
      createdAt: (row && row.createdAt) || new Date().toISOString(),
      updatedAt: (row && row.updatedAt) || new Date().toISOString()
    };
    mod.fields.forEach(function (f) {
      const v = row ? row[f.key] : '';
      out[f.key] = (v === undefined || v === null) ? '' : v;
    });
    return out;
  }

  function normalizeAll(mod, rows) {
    return (Array.isArray(rows) ? rows : []).map(function (r) { return normalize(mod, r); });
  }

  /* -------------------------------------------------------------- remote */

  async function callRemote(payload, timeoutMs) {
    const cfg = getConfig();
    if (!cfg.url) throw new Error('URL Google Apps Script belum ditetapkan.');
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, timeoutMs || APP_CONFIG.requestTimeout || 25000);
    try {
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({
          token: cfg.token || '',
          session: sessionToken()
        }, payload)),
        signal: controller.signal,
        redirect: 'follow'
      });
      if (!res.ok) throw new Error('Pelayan membalas dengan status ' + res.status + '.');
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        throw new Error('Respons pelayan tidak sah. Pastikan Web App dikongsi kepada "Sesiapa sahaja".');
      }
      if (!json || json.ok !== true) {
        if (json && json.code === 'AUTH_REQUIRED' && window.Auth) Auth.handleAuthError();
        const err = new Error((json && json.error) || 'Permintaan kepada Google Sheets gagal.');
        if (json && json.code) err.code = json.code;
        throw err;
      }
      return json.data;
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new Error('Permintaan tamat masa. Semak sambungan internet anda.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  function readFileBase64(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const result = String(reader.result || '');
        resolve(result.slice(result.indexOf(',') + 1));
      };
      reader.onerror = function () { reject(new Error('Fail tidak dapat dibaca.')); };
      reader.readAsDataURL(file);
    });
  }

  function saveCache(sheet, rows) {
    try {
      localStorage.setItem(cacheKey(sheet), JSON.stringify({ at: Date.now(), rows: rows }));
    } catch (e) { /* cache is best-effort */ }
  }

  function readCache(sheet) {
    const c = readJSON(cacheKey(sheet), null);
    return c && Array.isArray(c.rows) ? c : null;
  }

  // Kekalkan cache luar talian selepas penulisan berjaya ke Google Sheets.
  function syncCache(sheet, mutate) {
    const cached = readCache(sheet);
    if (!cached) return;
    try {
      const next = mutate(cached.rows.slice());
      if (Array.isArray(next)) saveCache(sheet, next);
    } catch (e) { /* cache is best-effort */ }
  }

  function markRemoteError(err) {
    status.offline = true;
    status.lastError = err && err.message ? err.message : String(err);
    return status;
  }

  /* ----------------------------------------------------------------- API */

  const Store = {
    getConfig: getConfig,
    saveConfig: saveConfig,
    isRemote: isRemote,
    isDemo: isDemo,
    setMode: setMode,
    status: status,

    modeName: function () {
      if (!isRemote()) return 'Demo';
      return status.offline ? 'Luar Talian' : 'Google Sheets';
    },

    async ping() {
      const started = Date.now();
      const data = await callRemote({ action: 'ping' });
      status.offline = false;
      status.lastError = null;
      return { latency: Date.now() - started, data: data };
    },

    async list(moduleKey) {
      const mod = MODULES[moduleKey];
      if (!mod) throw new Error('Modul tidak dijumpai: ' + moduleKey);
      if (mod.db === false) return [];

      if (!isRemote()) {
        status.offline = false;
        return normalizeAll(mod, demoRows(mod));
      }

      try {
        const rows = await callRemote({ action: 'list', sheet: mod.sheet });
        const out = normalizeAll(mod, rows);
        saveCache(mod.sheet, out);
        status.offline = false;
        status.lastError = null;
        status.lastSync = new Date().toISOString();
        return out;
      } catch (err) {
        const cached = readCache(mod.sheet);
        markRemoteError(err);
        if (cached) return normalizeAll(mod, cached.rows);
        return [];
      }
    },

    async listAll() {
      if (!isRemote()) {
        status.offline = false;
        const data = ensureDemo();
        const out = {};
        MODULE_ORDER.forEach(function (key) {
          const mod = MODULES[key];
          out[key] = (mod.db === false) ? [] : normalizeAll(mod, data[mod.sheet] || []);
        });
        return out;
      }

      try {
        const data = await callRemote({ action: 'bootstrap' });
        const out = {};
        MODULE_ORDER.forEach(function (key) {
          const mod = MODULES[key];
          if (mod.db === false) { out[key] = []; return; }
          const rows = normalizeAll(mod, (data && data[mod.sheet]) || []);
          out[key] = rows;
          saveCache(mod.sheet, rows);
        });
        status.offline = false;
        status.lastError = null;
        status.lastSync = new Date().toISOString();
        return out;
      } catch (err) {
        markRemoteError(err);
        const out = {};
        MODULE_ORDER.forEach(function (key) {
          const mod = MODULES[key];
          if (mod.db === false) { out[key] = []; return; }
          const cached = readCache(mod.sheet);
          out[key] = cached ? normalizeAll(mod, cached.rows) : [];
        });
        return out;
      }
    },

    async create(moduleKey, data) {
      const mod = MODULES[moduleKey];
      if (!mod) throw new Error('Modul tidak dijumpai: ' + moduleKey);
      if (mod.db === false) throw new Error('Modul ini tidak menggunakan pangkalan data.');
      const record = normalize(mod, Object.assign({}, data, {
        id: uid(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      if (!isRemote()) {
        const rows = demoRows(mod);
        rows.unshift(record);
        writeDemoRows(mod, rows);
        return record;
      }

      const saved = await callRemote({ action: 'create', sheet: mod.sheet, record: record });
      const savedRecord = normalize(mod, saved || record);
      syncCache(mod.sheet, function (rows) {
        return [savedRecord].concat(rows.filter(function (r) { return String(r.id) !== String(savedRecord.id); }));
      });
      status.offline = false;
      status.lastSync = new Date().toISOString();
      return savedRecord;
    },

    async update(moduleKey, id, data) {
      const mod = MODULES[moduleKey];
      if (!mod) throw new Error('Modul tidak dijumpai: ' + moduleKey);
      if (mod.db === false) throw new Error('Modul ini tidak menggunakan pangkalan data.');

      if (!isRemote()) {
        const rows = demoRows(mod);
        const idx = rows.findIndex(function (r) { return String(r.id) === String(id); });
        if (idx < 0) throw new Error('Rekod tidak dijumpai.');
        const merged = normalize(mod, Object.assign({}, rows[idx], data, { id: id, updatedAt: new Date().toISOString() }));
        rows[idx] = merged;
        writeDemoRows(mod, rows);
        return merged;
      }

      const existing = (await this.list(moduleKey)).find(function (r) { return String(r.id) === String(id); });
      const record = normalize(mod, Object.assign({}, existing || {}, data, {
        id: id,
        updatedAt: new Date().toISOString()
      }));
      const saved = await callRemote({ action: 'update', sheet: mod.sheet, id: id, record: record });
      const savedRecord = normalize(mod, saved || record);
      syncCache(mod.sheet, function (rows) {
        const idx = rows.findIndex(function (r) { return String(r.id) === String(id); });
        if (idx >= 0) rows[idx] = savedRecord;
        else rows.unshift(savedRecord);
        return rows;
      });
      status.offline = false;
      status.lastSync = new Date().toISOString();
      return savedRecord;
    },

    async uploadFile(file) {
      if (!isRemote()) throw new Error('Lampiran hanya boleh dimuat naik apabila disambungkan ke Google Sheets.');
      const data = await readFileBase64(file);
      return callRemote({ action: 'upload', name: file.name, mime: file.type, data: data }, 120000);
    },

    async remove(moduleKey, id) {
      const mod = MODULES[moduleKey];
      if (!mod) throw new Error('Modul tidak dijumpai: ' + moduleKey);
      if (mod.db === false) throw new Error('Modul ini tidak menggunakan pangkalan data.');

      if (!isRemote()) {
        const rows = demoRows(mod).filter(function (r) { return String(r.id) !== String(id); });
        writeDemoRows(mod, rows);
        return true;
      }

      await callRemote({ action: 'delete', sheet: mod.sheet, id: id });
      syncCache(mod.sheet, function (rows) {
        return rows.filter(function (r) { return String(r.id) !== String(id); });
      });
      status.offline = false;
      status.lastSync = new Date().toISOString();
      return true;
    },

    async exportAll() {
      const all = await this.listAll();
      const modules = {};
      MODULE_ORDER.forEach(function (key) {
        if (MODULES[key].db === false) return;
        modules[key] = all[key] || [];
      });
      return {
        app: 'PTIS',
        version: APP_CONFIG.version,
        exportedAt: new Date().toISOString(),
        mode: this.modeName(),
        modules: modules
      };
    },

    importDemo(payload) {
      if (!payload || !payload.modules) throw new Error('Fail sandaran tidak sah.');
      const data = ensureDemo();
      MODULE_ORDER.forEach(function (key) {
        const mod = MODULES[key];
        const rows = payload.modules[key];
        if (mod.db === false || !mod.sheet) return;
        if (Array.isArray(rows)) data[mod.sheet] = normalizeAll(mod, rows);
      });
      writeJSON(DEMO_KEY, data);
      clearCache();
      return true;
    },

    resetDemo() {
      localStorage.removeItem(DEMO_KEY);
      clearCache();
      ensureDemo();
      return true;
    },

    cacheInfo() {
      let count = 0;
      let newest = 0;
      MODULE_ORDER.forEach(function (key) {
        const mod = MODULES[key];
        if (mod.db === false || !mod.sheet) return;
        const c = readCache(mod.sheet);
        if (c) {
          count += c.rows.length;
          newest = Math.max(newest, c.at || 0);
        }
      });
      return { count: count, newest: newest ? new Date(newest).toISOString() : null };
    },

    clearCache: clearCache
  };

  window.Store = Store;
})();
