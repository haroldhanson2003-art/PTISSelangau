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
const TIMEZONE = Session.getScriptTimeZone();

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

    if (action === 'ping') {
      return jsonResponse_({
        ok: true,
        data: {
          app: 'PTIS',
          version: '1.2.0',
          time: new Date().toISOString(),
          spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
          sheets: Object.keys(SHEETS),
          tokenRequired: Boolean(TOKEN)
        }
      });
    }

    if (action === 'setup') {
      setup();
      return jsonResponse_({ ok: true, data: { sheets: Object.keys(SHEETS) } });
    }

    if (action === 'bootstrap') {
      const out = {};
      Object.keys(SHEETS).forEach(function (name) {
        out[name] = readSheet_(name);
      });
      return jsonResponse_({ ok: true, data: out });
    }

    if (action === 'list') {
      const name = requireSheetName_(req.sheet);
      return jsonResponse_({ ok: true, data: readSheet_(name) });
    }

    if (action === 'create') {
      const name = requireSheetName_(req.sheet);
      return withLock_(function () {
        const record = createRecord_(name, req.record || {});
        return jsonResponse_({ ok: true, data: record });
      });
    }

    if (action === 'update') {
      const name = requireSheetName_(req.sheet);
      const id = String(req.id || '');
      if (!id) throw new Error('ID rekod diperlukan.');
      return withLock_(function () {
        const record = updateRecord_(name, id, req.record || {});
        return jsonResponse_({ ok: true, data: record });
      });
    }

    if (action === 'delete') {
      const name = requireSheetName_(req.sheet);
      const id = String(req.id || '');
      if (!id) throw new Error('ID rekod diperlukan.');
      return withLock_(function () {
        deleteRecord_(name, id);
        return jsonResponse_({ ok: true, data: { id: id, deleted: true } });
      });
    }

    if (action === 'upload') {
      return jsonResponse_({ ok: true, data: uploadFile_(req) });
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
  return 'Setup selesai. ' + Object.keys(SHEETS).length + ' tab data tersedia.';
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

function readSheet_(name) {
  const sheet = getSheet_(name);
  const headers = getHeaders_(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

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
    records.push(record);
  });

  return records;
}

function createRecord_(name, input) {
  const sheet = getSheet_(name);
  ensureHeaders_(sheet, name);
  const headers = getHeaders_(sheet);
  const now = new Date().toISOString();

  const record = {};
  headers.forEach(function (header) {
    if (!header) return;
    record[header] = input[header] !== undefined ? input[header] : '';
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

function updateRecord_(name, id, input) {
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

  const now = new Date().toISOString();
  const merged = {};
  headers.forEach(function (header) {
    if (!header) return;
    if (header === 'id') merged[header] = id;
    else if (header === 'updatedAt') merged[header] = now;
    else if (header === 'createdAt') merged[header] = old.createdAt || now;
    else if (input[header] !== undefined) merged[header] = input[header];
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
 * Utiliti
 * ===================================================================== */

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