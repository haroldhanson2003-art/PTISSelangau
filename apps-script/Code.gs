/**
 * PTIS · Backend Google Sheets (Google Apps Script)
 * ------------------------------------------------------------------
 * Cara guna ringkas:
 *   1. Buat Google Sheet baharu.
 *   2. Extensions → Apps Script, tampal fail ini, simpan.
 *   3. (Pilihan) Tetapkan TOKEN sebagai rahsia tambahan di bawah.
 *   4. Jalankan fungsi `setup` sekali (benarkan akses).
 *   5. Deploy → New deployment → Web app
 *        Execute as        : Me
 *        Who has access    : Anyone
 *   6. Salin URL /exec ke Tetapan aplikasi PTIS (dan TOKEN jika digunakan).
 *
 * Nota keselamatan:
 *   - Jika Web App dikongsi "Anyone", sesiapa yang mengetahui URL (dan token, jika tiada)
 *     boleh membaca/menulis data. Gunakan TOKEN rahsia dan hadkan perkongsian URL.
 *   - Jangan kongsi URL /exec atau TOKEN secara terbuka.
 */

const TOKEN = ''; // Pilihan: frasa rahsia panjang, contoh: 'ptis-2026-...'
const GOOGLE_CLIENT_ID = '770091761834-tm0gtjmn5g3ol6tpcrth18cuv7hfbo3q.apps.googleusercontent.com'; // OAuth Client ID (Web application). Kosong = log masuk dimatikan.
const ALLOWED_DOMAINS = ['moe.gov.my', 'moe-dl.edu.my']; // Mesti sama dengan allowedDomains dalam config.js
const TIMEZONE = Session.getScriptTimeZone();
const AUTH_ENFORCED = true; // Set kepada false untuk mematikan pengesahan pelayan (sementara).

/* =====================================================================
 * Peranan & data peribadi
 * ---------------------------------------------------------------------
 * Peranan ditentukan DI PELAYAN sahaja. Klien tidak pernah menghantar
 * peranan; ia hanya menerima keputusan melalui tindakan `whoami`.
 *
 *   admin  — semua modul, data peribadi, sandaran & pemulihan, setup
 *   ahli   — semua modul kecuali data peribadi (default untuk domain sah)
 *   viewer — baca sahaja
 *
 * Pendaftaran pengguna: tab `Users` dalam hamparan yang sama.
 *   email | role | name | active
 * E-mel dalam ADMIN_EMAILS sentiasa pentadbir walaupun tiada dalam tab.
 * Baris dengan active = FALSE/TIDAK/0 ditolak sepenuhnya.
 * ===================================================================== */
const ADMIN_EMAILS = ['haroldhanson@moe.gov.my'];
const USERS_SHEET = 'Users';
const USER_HEADERS = ['email', 'role', 'name', 'active'];
const ROLES = ['admin', 'ahli', 'viewer'];
const DEFAULT_ROLE = 'ahli';

// Medan yang dipadamkan di pelayan untuk bukan pentadbir. Menyembunyikannya
// di UI sahaja bukan kawalan akses.
const PERSONAL_FIELDS = {
  Pasukan: ['noKadPengenalan', 'noTelefon', 'emel', 'alamat']
};

// Sandaran & pemulihan (fail JSON dalam Drive).
const BACKUP_FOLDER = 'PTIS Sandaran';
const BACKUP_PREFIX = 'ptis-sandaran-';
const RESTORE_MAX_ROWS = 5000;
const APP_VERSION = '1.3.0';
const SHEET_ALIASES = {
  pergerakan: 'Pergerakan',
  kunjungbantu: 'KunjungBantu',
  peralatan: 'Peralatan',
  kontrak: 'Kontrak',
  organisasi: 'Organisasi',
  pasukan: 'Pasukan'
};

const SHEETS = {
  Pergerakan: [
    'id', 'tarikh', 'masa', 'sekolah', 'kodSekolah', 'daerah', 'jenisPergerakan',
    'anggota', 'lokasi', 'tujuan', 'status', 'catatan', 'lampiran', 'createdAt', 'updatedAt'
  ],
  KunjungBantu: [
    'id', 'tarikh', 'sekolah', 'daerah', 'pengetua', 'anggota', 'tujuan',
    'dapatan', 'cadangan', 'status', 'lampiran', 'createdAt', 'updatedAt'
  ],
  Peralatan: [
    'id', 'sekolah', 'kodSekolah', 'daerah', 'fasa', 'jenisPeralatan', 'jenama', 'model',
    'bilangan', 'noSiri', 'tarikhPerolehan', 'keadaan', 'lokasi', 'vendor', 'catatan', 'createdAt', 'updatedAt'
  ],
  Kontrak: [
    'id', 'kategori', 'fasa', 'scope', 'vendor', 'contractNo', 'start', 'end', 'duration',
    'status', 'coverage', 'lampiran', 'createdAt', 'updatedAt'
  ],
  Organisasi: [
    'id', 'nama', 'jawatan', 'sekolah', 'daerah', 'noTelefon', 'emel', 'urutan',
    'catatan', 'createdAt', 'updatedAt'
  ],
  Pasukan: [
    'id', 'nama', 'noKadPengenalan', 'jawatan', 'bidang', 'sekolah', 'kodSekolah',
    'daerah', 'noTelefon', 'emel', 'alamat', 'tarikhLantikan', 'status', 'catatan',
    'createdAt', 'updatedAt'
  ]
};

const NUMBER_FIELDS = ['urutan', 'bilangan', 'duration'];

const UPLOAD_FOLDER = 'PTIS Lampiran';
const UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const UPLOAD_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
];

/* =====================================================================
 * Titik masuk Web App
 * ===================================================================== */

function doGet(e) {
  const params = (e && e.parameter) || {};
  return handleRequest({
    action: params.action || 'ping',
    token: params.token || '',
    session: params.session || '',
    sheet: params.sheet || '',
    id: params.id || '',
    record: null
  });
}

function doPost(e) {
  let body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return jsonResponse_({ ok: false, error: 'Format JSON tidak sah.' });
  }
  return handleRequest(body);
}

function handleRequest(req) {
  try {
    const action = String(req.action || 'ping').toLowerCase();

    if (TOKEN && String(req.token || '') !== TOKEN) {
      return jsonResponse_({ ok: false, code: 'TOKEN_INVALID', error: 'Token API tidak sah. Semak Tetapan aplikasi.' });
    }

    // Peranan hanya datang daripada pelayan: domain sah + tab Users.
    const user = (AUTH_ENFORCED && action !== 'ping')
      ? verifyUser_(req.session)
      : { email: '', role: 'admin' };

    if (action === 'whoami') {
      return jsonResponse_({
        ok: true,
        data: {
          email: user.email,
          role: user.role,
          canWrite: canWrite_(user),
          personalFields: PERSONAL_FIELDS.Pasukan || []
        }
      });
    }

    if (action === 'ping') {
      return jsonResponse_({
        ok: true,
        data: {
          app: 'PTIS',
          version: APP_VERSION,
          time: new Date().toISOString(),
          spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
          sheets: Object.keys(SHEETS),
          tokenRequired: Boolean(TOKEN),
          authEnforced: AUTH_ENFORCED
        }
      });
    }

    if (action === 'setup') {
      assertAdmin_(user);
      setup();
      return jsonResponse_({ ok: true, data: { sheets: Object.keys(SHEETS), users: USERS_SHEET } });
    }

    if (action === 'bootstrap') {
      const out = {};
      Object.keys(SHEETS).forEach(function (name) {
        out[name] = readSheet_(name, user.role);
      });
      return jsonResponse_({ ok: true, data: out });
    }

    if (action === 'list') {
      const name = requireSheetName_(req.sheet);
      return jsonResponse_({ ok: true, data: readSheet_(name, user.role) });
    }

    if (action === 'create') {
      assertCanWrite_(user);
      const name = requireSheetName_(req.sheet);
      return withLock_(function () {
        const record = createRecord_(name, req.record || {}, user.role);
        return jsonResponse_({ ok: true, data: record });
      });
    }

    if (action === 'update') {
      assertCanWrite_(user);
      const name = requireSheetName_(req.sheet);
      const id = String(req.id || '');
      if (!id) throw new Error('ID rekod diperlukan.');
      return withLock_(function () {
        const record = updateRecord_(name, id, req.record || {}, user.role);
        return jsonResponse_({ ok: true, data: record });
      });
    }

    if (action === 'delete') {
      assertCanWrite_(user);
      const name = requireSheetName_(req.sheet);
      const id = String(req.id || '');
      if (!id) throw new Error('ID rekod diperlukan.');
      return withLock_(function () {
        deleteRecord_(name, id);
        return jsonResponse_({ ok: true, data: { id: id, deleted: true } });
      });
    }

    if (action === 'upload') {
      assertCanWrite_(user);
      return jsonResponse_({ ok: true, data: uploadFile_(req) });
    }

    // Sandaran & pemulihan: pentadbir sahaja.
    if (action === 'backup') {
      return jsonResponse_({ ok: true, data: backupData_(user) });
    }

    if (action === 'backups') {
      return jsonResponse_({ ok: true, data: listBackups_(user) });
    }

    if (action === 'restore') {
      return jsonResponse_({ ok: true, data: restoreData_(req, user) });
    }

    throw new Error('Tindakan tidak dikenali: ' + action);
  } catch (err) {
    return jsonResponse_({
      ok: false,
      code: (err && err.code) ? err.code : 'ERROR',
      error: (err && err.message) ? err.message : String(err)
    });
  }
}

/* =====================================================================
 * Setup
 * ===================================================================== */

function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEETS).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) sheet = ss.insertSheet(name);
    ensureHeaders_(sheet, name);
  });
  ensureUsersSheet_(ss);
  return 'Setup selesai. ' + Object.keys(SHEETS).length + ' tab data dan tab ' + USERS_SHEET + ' tersedia.';
}

// Tab Users: pengurusan peranan. Tiada e-mel disemai secara automatik selain
// ADMIN_EMAILS dalam kod, supaya pemasangan baharu tidak mendedahkan data.
function ensureUsersSheet_(ss) {
  const book = ss || SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(USERS_SHEET);
  if (!sheet) sheet = book.insertSheet(USERS_SHEET);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, USER_HEADERS.length)
    .setFontWeight('bold')
    .setBackground('#0b0d10')
    .setFontColor('#ffffff');
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 200);
  sheet.setColumnWidth(4, 90);
  return sheet;
}

function ensureHeaders_(sheet, name) {
  const expected = SHEETS[name];
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const current = sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map(function (v) { return String(v || '').trim(); })
    .filter(function (v) { return v !== ''; });

  if (!current.length) {
    sheet.getRange(1, 1, 1, expected.length).setValues([expected]);
  } else {
    const missing = expected.filter(function (h) { return current.indexOf(h) < 0; });
    if (missing.length) {
      sheet.getRange(1, current.length + 1, 1, missing.length).setValues([missing]);
    }
  }

  const headers = getHeaders_(sheet);
  headers.forEach(function (header, index) {
    if (!header) return;
    const col = index + 1;
    if (NUMBER_FIELDS.indexOf(header) >= 0) {
      sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('0.##');
    } else {
      sheet.getRange(2, col, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    }
    sheet.setColumnWidth(col, header === 'id' ? 120 : 170);
  });

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, Math.max(headers.length, 1))
    .setFontWeight('bold')
    .setBackground('#0b0d10')
    .setFontColor('#ffffff');
}

/* =====================================================================
 * Baca / tulis rekod
 * ===================================================================== */

function readSheet_(name, role) {
  const sheet = getSheet_(name);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const hidden = canSeePersonal_(role) ? [] : (PERSONAL_FIELDS[name] || []);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const records = [];

  values.forEach(function (row) {
    const record = {};
    let empty = true;
    headers.forEach(function (header, i) {
      if (!header) return;
      let value = row[i];
      if (value instanceof Date) {
        value = formatCellDate_(value, header);
      } else if (typeof value === 'string') {
        value = value.replace(/^'/, '');
      }
      record[header] = value;
      if (value !== '' && value !== null && value !== undefined) empty = false;
    });
    if (empty) return;
    if (!record.id) record.id = Utilities.getUuid();
    if (hidden.length) {
      hidden.forEach(function (field) {
        if (Object.prototype.hasOwnProperty.call(record, field)) record[field] = '';
      });
    }
    records.push(record);
  });

  return records;
}

function createRecord_(name, input, role) {
  const sheet = getSheet_(name);
  ensureHeaders_(sheet, name);
  const headers = getHeaders_(sheet);
  const now = new Date().toISOString();

  // Bukan pentadbir tidak boleh mengisi medan peribadi walaupun menghantarnya.
  const clean = Object.assign({}, input || {});
  if (!canSeePersonal_(role)) {
    (PERSONAL_FIELDS[name] || []).forEach(function (field) { delete clean[field]; });
  }

  const record = {};
  headers.forEach(function (header) {
    if (!header) return;
    record[header] = clean[header] !== undefined ? clean[header] : '';
  });
  if (!record.id) record.id = Utilities.getUuid();
  record.createdAt = record.createdAt || now;
  record.updatedAt = now;

  const row = headers.map(function (header) {
    return serializeCell_(header, record[header]);
  });
  sheet.appendRow(row);

  const lastRow = sheet.getLastRow();
  headers.forEach(function (header, i) {
    if (!header) return;
    sheet.getRange(lastRow, i + 1).setNumberFormat(
      NUMBER_FIELDS.indexOf(header) >= 0 ? '0.##' : '@'
    );
  });

  return record;
}

function updateRecord_(name, id, input, role) {
  const sheet = getSheet_(name);
  const headers = getHeaders_(sheet);
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('Lajur id tiada dalam tab ' + name + '.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Rekod tidak dijumpai.');

  const ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  let rowIndex = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      rowIndex = i + 2;
      break;
    }
  }
  if (rowIndex < 0) throw new Error('Rekod tidak dijumpai atau telah dipadam.');

  const existing = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const old = {};
  headers.forEach(function (header, i) { if (header) old[header] = existing[i]; });

  // Medan peribadi daripada bukan pentadbir diabaikan: nilai lama dikekalkan
  // (bukan dikosongkan), jadi suntingan biasa tidak memadam data sulit.
  const clean = Object.assign({}, input || {});
  if (!canSeePersonal_(role)) {
    (PERSONAL_FIELDS[name] || []).forEach(function (field) { delete clean[field]; });
  }

  const now = new Date().toISOString();
  const merged = {};
  headers.forEach(function (header) {
    if (!header) return;
    if (header === 'id') merged[header] = id;
    else if (header === 'updatedAt') merged[header] = now;
    else if (header === 'createdAt') merged[header] = old.createdAt || now;
    else if (clean[header] !== undefined) merged[header] = clean[header];
    else merged[header] = old[header];
  });

  const row = headers.map(function (header) { return serializeCell_(header, merged[header]); });
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);

  return merged;
}

function deleteRecord_(name, id) {
  const sheet = getSheet_(name);
  const headers = getHeaders_(sheet);
  const idCol = headers.indexOf('id');
  if (idCol < 0) throw new Error('Lajur id tiada dalam tab ' + name + '.');

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Rekod tidak dijumpai.');

  const ids = sheet.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      return true;
    }
  }
  throw new Error('Rekod tidak dijumpai atau telah dipadam.');
}

/* =====================================================================
 * Sandaran & pemulihan
 * ---------------------------------------------------------------------
 * Sandaran: semua tab ditulis sebagai satu fail JSON ke folder Drive
 * `PTIS Sandaran`. Pemulihan menulis semula baris data (bukan struktur tab)
 * dan SENTIASA membuat sandaran keselamatan dahulu, jadi pemulihan itu
 * sendiri boleh dibatalkan.
 * ===================================================================== */

function backupData_(user) {
  assertAdmin_(user);
  const now = new Date();
  const data = {
    app: 'PTIS',
    kind: 'snapshot',
    version: APP_VERSION,
    createdAt: now.toISOString(),
    createdBy: user && user.email ? user.email : 'script',
    modules: {}
  };

  Object.keys(SHEETS).forEach(function (name) {
    data.modules[name] = readSheet_(name, 'admin');
  });

  const file = getBackupFolder_().createFile(uniqueBackupName_(now), JSON.stringify(data), 'application/json');
  const fileName = file.getName();

  return {
    id: file.getId(),
    name: fileName,
    at: data.createdAt,
    counts: countModules_(data.modules)
  };
}

// Dua sandaran dalam detik yang sama (cth. sandaran + sandaran keselamatan
// sebelum pemulihan) tidak boleh berkongsi nama, jika tidak pentadbir tidak
// dapat membezakan baris dalam senarai.
function uniqueBackupName_(now) {
  const stamp = Utilities.formatDate(now, TIMEZONE, 'yyyyMMdd-HHmmss');
  const base = BACKUP_PREFIX + stamp;
  const taken = {};
  const files = getBackupFolder_().getFiles();
  while (files.hasNext()) taken[files.next().getName()] = true;
  let name = base + '.json';
  let n = 2;
  while (taken[name]) {
    name = base + '-' + n + '.json';
    n++;
  }
  return name;
}

function countModules_(modules) {
  const out = {};
  Object.keys(modules || {}).forEach(function (name) {
    out[name] = Array.isArray(modules[name]) ? modules[name].length : 0;
  });
  return out;
}

function listBackups_(user) {
  assertAdmin_(user);
  const files = getBackupFolder_().getFiles();
  const out = [];
  while (files.hasNext() && out.length < 60) {
    const file = files.next();
    if (!/\.json$/i.test(file.getName())) continue;
    out.push({
      id: file.getId(),
      name: file.getName(),
      at: file.getDateCreated().toISOString(),
      size: file.getSize()
    });
  }
  out.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
  return out.slice(0, 20);
}

function getBackupFolder_() {
  const folders = DriveApp.getFoldersByName(BACKUP_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(BACKUP_FOLDER);
}

function restoreData_(req, user) {
  assertAdmin_(user);
  if (req.confirm !== true) {
    throw new Error('Pengesahan diperlukan sebelum memulihkan data.');
  }

  let payload = req.payload || null;
  if (!payload) {
    const id = String(req.backupId || '').trim();
    if (!id) throw new Error('Pilih sandaran atau muat naik fail JSON.');
    let file;
    try {
      file = DriveApp.getFileById(id);
    } catch (e) {
      throw new Error('Fail sandaran tidak dijumpai dalam Drive.');
    }
    if (file.getSize() > 8 * 1024 * 1024) throw new Error('Fail sandaran melebihi 8 MB.');
    try {
      payload = JSON.parse(file.getBlob().getDataAsString());
    } catch (e) {
      throw new Error('Fail sandaran bukan JSON yang sah.');
    }
  }

  if (!payload || typeof payload !== 'object' || !payload.modules) {
    throw new Error('Fail sandaran tidak sah: tiada senarai modul.');
  }

  return withLock_(function () {
    const plan = planRestore_(payload.modules);
    if (!plan.length) throw new Error('Tiada tab PTIS yang dikenali dalam fail sandaran.');

    // Sandaran keselamatan: pemulihan sentiasa boleh dibatalkan.
    const safety = backupData_(user);
    const restored = {};
    plan.forEach(function (item) {
      restored[item.sheet] = replaceSheetRows_(item.sheet, item.rows);
    });

    return {
      restored: restored,
      safetyBackup: { id: safety.id, name: safety.name, at: safety.at }
    };
  });
}

// Terima sama ada nama tab ("Pergerakan") atau kunci modul ("pergerakan").
function planRestore_(modules) {
  const plan = [];
  const seen = {};
  Object.keys(modules || {}).forEach(function (key) {
    const sheetName = resolveSheetName_(key);
    if (!sheetName || seen[sheetName]) return;
    const rows = modules[key];
    if (!Array.isArray(rows)) return;
    if (rows.length > RESTORE_MAX_ROWS) {
      throw new Error('Tab ' + sheetName + ' melebihi ' + RESTORE_MAX_ROWS + ' rekod. Pecahkan sandaran kepada beberapa fail.');
    }
    seen[sheetName] = true;
    plan.push({ sheet: sheetName, rows: rows });
  });
  return plan;
}

function resolveSheetName_(key) {
  const raw = String(key || '').trim();
  if (!raw) return '';
  if (SHEETS[raw]) return raw;
  const alias = SHEET_ALIASES[raw.toLowerCase()];
  if (alias && SHEETS[alias]) return alias;
  const found = Object.keys(SHEETS).filter(function (name) {
    return name.toLowerCase() === raw.toLowerCase();
  });
  return found.length ? found[0] : '';
}

function replaceSheetRows_(name, rows) {
  const sheet = getSheet_(name);
  ensureHeaders_(sheet, name);
  const headers = getHeaders_(sheet);

  const values = (rows || []).map(function (row) {
    return headers.map(function (header) {
      if (!header) return '';
      let value = row && row[header] !== undefined ? row[header] : '';
      if (header === 'id' && !value) value = Utilities.getUuid();
      return serializeCell_(header, value);
    });
  });

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, Math.max(headers.length, 1)).clearContent();
  }
  if (values.length) {
    sheet.getRange(2, 1, values.length, headers.length).setValues(values);
    headers.forEach(function (header, i) {
      if (!header) return;
      sheet.getRange(2, i + 1, values.length, 1).setNumberFormat(
        NUMBER_FIELDS.indexOf(header) >= 0 ? '0.##' : '@'
      );
    });
  }
  return values.length;
}

/* =====================================================================
 * Utiliti
 * ===================================================================== */

function verifyUser_(idToken) {
  if (!GOOGLE_CLIENT_ID) return { email: '', role: 'admin' };

  const denied = function (message, code) {
    const err = new Error(message || 'Sila log masuk dengan akaun rasmi.');
    err.code = code || 'AUTH_REQUIRED';
    return err;
  };
  if (!idToken) throw denied();

  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
    { muteHttpExceptions: true }
  );
  if (res.getResponseCode() !== 200) throw denied();

  const info = JSON.parse(res.getContentText());
  if (info.aud !== GOOGLE_CLIENT_ID || String(info.email_verified) !== 'true') throw denied();

  const email = String(info.email || '').trim().toLowerCase();
  const domain = email.split('@')[1] || '';
  if (ALLOWED_DOMAINS.indexOf(domain.toLowerCase()) < 0) {
    throw denied('Akaun ini tidak dibenarkan mengakses PTIS.', 'AUTH_FORBIDDEN');
  }

  const role = resolveRole_(email);
  if (!role) {
    throw denied('Akaun ' + email + ' tidak mempunyai akses PTIS. Hubungi pentadbir pasukan.', 'AUTH_FORBIDDEN');
  }
  return { email: email, role: role };
}

// admin/ahli/viewer, atau '' jika akaun dinyahaktifkan dalam tab Users.
function resolveRole_(email) {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return 'admin';
  if (ADMIN_EMAILS.map(function (e) { return String(e).trim().toLowerCase(); }).indexOf(target) >= 0) {
    return 'admin';
  }

  const users = readUsers_();
  for (let i = 0; i < users.length; i++) {
    const row = users[i];
    if (String(row.email || '').trim().toLowerCase() !== target) continue;
    const active = String(row.active || '').trim().toLowerCase();
    if (['false', 'tidak', 'no', '0', 'x'].indexOf(active) >= 0) return '';
    const role = String(row.role || '').trim().toLowerCase();
    return ROLES.indexOf(role) >= 0 ? role : DEFAULT_ROLE;
  }
  return DEFAULT_ROLE;
}

function readUsers_() {
  let sheet;
  try {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(USERS_SHEET);
  } catch (e) {
    return [];
  }
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, USER_HEADERS.length).getValues();
  return values.map(function (row) {
    const rec = {};
    USER_HEADERS.forEach(function (header, i) {
      const v = row[i];
      rec[header] = String(v === null || v === undefined ? '' : v).trim();
    });
    return rec;
  }).filter(function (rec) { return rec.email; });
}

function canSeePersonal_(role) {
  // role undefined = konteks skrip (import satu kali), bukan permintaan HTTP.
  return !role || role === 'admin';
}

function canWrite_(user) {
  return !user || user.role !== 'viewer';
}

function assertCanWrite_(user) {
  if (canWrite_(user)) return;
  const err = new Error('Akaun ini hanya boleh membaca. Hubungi pentadbir untuk akses tulis.');
  err.code = 'READ_ONLY';
  throw err;
}

function assertAdmin_(user) {
  if (user && user.role === 'admin') return;
  const err = new Error('Tindakan ini hanya untuk pentadbir PTIS.');
  err.code = 'FORBIDDEN';
  throw err;
}

function uploadFile_(req) {
  const mime = String(req.mime || '');
  if (UPLOAD_MIME.indexOf(mime) < 0) {
    throw new Error('Jenis fail tidak disokong. Gunakan PDF, Word atau gambar.');
  }
  const data = String(req.data || '');
  if (!data) throw new Error('Fail kosong.');
  const bytes = Utilities.base64Decode(data);
  if (!bytes.length) throw new Error('Fail kosong.');
  if (bytes.length > UPLOAD_MAX_BYTES) throw new Error('Saiz fail melebihi 10 MB.');

  const name = String(req.name || 'lampiran').replace(/[\\\/:*?"<>|]/g, '_').slice(0, 200);
  const file = getUploadFolder_().createFile(Utilities.newBlob(bytes, mime, name));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return { id: file.getId(), name: name, mime: mime, size: bytes.length, url: file.getUrl() };
}

function getUploadFolder_() {
  const folders = DriveApp.getFoldersByName(UPLOAD_FOLDER);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(UPLOAD_FOLDER);
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(name);
  if (!sheet) {
    throw new Error('Tab "' + name + '" tidak wujud. Jalankan fungsi setup() dalam Apps Script.');
  }
  return sheet;
}

function requireSheetName_(name) {
  const sheetName = String(name || '');
  if (!SHEETS[sheetName]) throw new Error('Nama tab tidak sah: ' + sheetName);
  return sheetName;
}

function getHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (v) {
    return String(v || '').trim();
  });
}

function serializeCell_(header, value) {
  if (value === undefined || value === null) return '';

  if (NUMBER_FIELDS.indexOf(header) >= 0) {
    if (value === '') return '';
    const n = Number(value);
    return isNaN(n) ? '' : n;
  }

  if (value instanceof Date) {
    return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
  }

  let text = String(value);
  // Cegah formula injection apabila pengguna menaip teks bermula dengan = + - @
  if (/^[=+\-@]/.test(text)) text = "'" + text;
  return text;
}

function formatCellDate_(value, header) {
  if (header === 'masa') {
    return Utilities.formatDate(value, TIMEZONE, 'HH:mm');
  }
  if (header === 'createdAt' || header === 'updatedAt') {
    return value.toISOString();
  }
  return Utilities.formatDate(value, TIMEZONE, 'yyyy-MM-dd');
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    return fn();
  } catch (err) {
    if (err && /Lock/i.test(String(err))) {
      throw new Error('Pelayan sibuk. Cubaan semula sebentar lagi.');
    }
    throw err;
  } finally {
    try { lock.releaseLock(); } catch (e) { /* noop */ }
  }
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Pilihan: jalankan untuk menguji bacaan tanpa deploy.
 */
function testBacaData() {
  Object.keys(SHEETS).forEach(function (name) {
    try {
      Logger.log(name + ': ' + readSheet_(name).length + ' rekod');
    } catch (err) {
      Logger.log(name + ': RALAT - ' + err.message);
    }
  });
}