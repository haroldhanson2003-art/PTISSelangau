/* ==========================================================================
   PTIS · Konfigurasi aplikasi
   Nilai ini boleh diubah tanpa sentuh kod lain.
   ========================================================================== */
window.APP_CONFIG = {
  appName: 'PTIS',
  fullName: 'Pasukan Teknikal ICT Daerah Selangau',
  organisation: 'Pasukan Teknikal ICT Daerah Selangau',
  version: '1.9.30',

  // Tetapan Google Apps Script (boleh diisi di halaman Tetapan)
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbzTcMXBF4g_hOyphMrivqcXZ7V1aTskZrwjgQsgjKiZTuVJgUxDuspvG6HUSK6X8r--/exec',
  apiToken: '',

  // Saluran laporan sekolah
  isdUrl: 'https://isd.moe.gov.my',
  officialEmail: 'haroldhanson@moe.gov.my', // E-mel rasmi penerima permohonan; boleh diisi di Tetapan

  // Log masuk Google (boleh diisi di halaman Tetapan)
  // clientId mesti sama dengan CLIENT_ID dalam apps-script/Code.gs
  auth: {
    enabled: false,
    clientId: '',
    allowedDomains: ['moe.gov.my', 'moe-dl.edu.my']
  },

  // Pentadbir sistem (Tetapan): hanya e-mel ini boleh akses halaman Tetapan
  adminEmails: ['haroldhanson@moe.gov.my'],

  // Tempoh tamat permintaan API (ms)
  requestTimeout: 25000,

  visi: 'Kerajaan Digital Mampan Pemangkin Negara Digital',
  misi: 'Memacu pendigitalan penyampaian perkhidmatan kerajaan melalui pemantapan tatakelola, pemanfaatan kepintaran data, pemerkasaan bakat dan adaptasi teknologi baharu ke arah perkhidmatan yang efisien.',
  tagline: 'Digital di Jari, Semua Jadi Easy',

  // Senarai sekolah Daerah Selangau (sumber: JPN Sarawak, PPD Selangau)
  selangauSchools: [
    { kodSekolah: 'YBA3206', namaSekolah: 'SEKOLAH KEBANGSAAN BUKIT ARIP' },
    { kodSekolah: 'YBA3405', namaSekolah: 'SEKOLAH KEBANGSAAN SG KEMENA' },
    { kodSekolah: 'YBA3408', namaSekolah: 'SEKOLAH KEBANGSAAN DIJIH' },
    { kodSekolah: 'YBA3501', namaSekolah: 'SEKOLAH KEBANGSAAN BATU 36' },
    { kodSekolah: 'YBB3405', namaSekolah: 'SEKOLAH KEBANGSAAN NANGA KUA' },
    { kodSekolah: 'YBB3406', namaSekolah: 'SEKOLAH KEBANGSAAN SG ARAU' },
    { kodSekolah: 'YBB3408', namaSekolah: 'SEKOLAH KEBANGSAAN SG BAWANG' },
    { kodSekolah: 'YBB3409', namaSekolah: 'SEKOLAH KEBANGSAAN SG BULOH' },
    { kodSekolah: 'YBB3410', namaSekolah: 'SEKOLAH KEBANGSAAN SG TAU' },
    { kodSekolah: 'YBB3412', namaSekolah: 'SEKOLAH KEBANGSAAN KUALA PELUGAU' },
    { kodSekolah: 'YBB3415', namaSekolah: 'SEKOLAH KEBANGSAAN SG ANAK' },
    { kodSekolah: 'YBB3416', namaSekolah: 'SEKOLAH KEBANGSAAN SG SEPIRING SG TEPUS' },
    { kodSekolah: 'YBB3502', namaSekolah: 'SEKOLAH KEBANGSAAN NANGA TAJAM' },
    { kodSekolah: 'YBB3505', namaSekolah: 'SEKOLAH KEBANGSAAN SUNGAI PAKOH' },
    { kodSekolah: 'YBB3506', namaSekolah: 'SEKOLAH KEBANGSAAN PENGHULU IMBAN' },
    { kodSekolah: 'YBE3408', namaSekolah: 'SEKOLAH KEBANGSAAN NANGA SELANGAU' },
    { kodSekolah: 'YBE3412', namaSekolah: 'SEKOLAH KEBANGSAAN KUALA LEMAI' },
    { kodSekolah: 'YBE3413', namaSekolah: 'SEKOLAH KEBANGSAAN IBAN UNION' },
    { kodSekolah: 'YBE3414', namaSekolah: 'SEKOLAH KEBANGSAAN ULU SG ARIP' },
    { kodSekolah: 'YCB3501', namaSekolah: 'SEKOLAH KEBANGSAAN ST MATTHEW SEKUAU' },
    { kodSekolah: 'YCB3503', namaSekolah: 'SEKOLAH KEBANGSAAN ST MARK' },
    { kodSekolah: 'YCC3405', namaSekolah: 'SEKOLAH JENIS KEBANGSAAN (CINA) TONG AH' },
    { kodSekolah: 'YEA3401', namaSekolah: 'SEKOLAH MENENGAH KEBANGSAAN ULU BALINGIAN' }
  ],

  // Kontrak ICT PPD Selangau (rujukan sah tempoh kontrak & vendor)
  ictContracts: [
    { category: 'PdT (Pentadbiran)', phase: 'PdT Fasa 1', scope: 'Sarawak (Lease-to-Use)', vendor: 'MHS Resources Sdn. Bhd. (dengan sokongan Cita Information Systems Sdn. Bhd.)', contractNo: '-', start: '2021-09-03', end: '2026-09-02', duration: 60, status: 'Tamat', coverage: 'Tamat Sept 2026; sahkan Surat Akuan Penamatan & penggantian oleh Fasa 2' },
    { category: 'PdT (Pentadbiran)', phase: 'PdT Fasa 2', scope: 'Zon 7: Sarawak (Lease-to-Own)', vendor: 'Strateq Sdn. Bhd.', contractNo: '-', start: '2024', end: '2029', duration: 64, status: 'Aktif', coverage: 'Aktif di semua 22 PPD Selangau (3 PGB + 0-2 AKP setiap sekolah)' },
    { category: 'PdP (Makmal Komputer)', phase: 'PdP Fasa 1 & Fasa 2', scope: 'Sarawak (Lease-to-Use)', vendor: 'Panel ICT KPM Serantau (cth. JAXER Sdn. Bhd. & rakan konsortium)', contractNo: '-', start: '2017', end: '2022 / 2023', duration: 60, status: 'Tamat', coverage: 'Penamatan fasa & serah terima rasmi selesai hingga 2023' },
    { category: 'PdP (Makmal Komputer)', phase: 'PdP Fasa 3', scope: 'Zon 9: Sarawak (Green ICT Lease-to-Use)', vendor: 'Panel Green ICT KPM Pusat', contractNo: '-', start: '2023/2024', end: '2029', duration: 60, status: 'Aktif', coverage: 'Meliputi 7,992 unit seluruh Sarawak' },
    { category: 'PdP (Makmal Komputer)', phase: 'PdP Fasa 4', scope: 'Zon Sarawak Utara', vendor: 'Mesiniaga Berhad', contractNo: '-', start: '2025-12-15', end: '2031', duration: 60, status: 'Aktif / Pelaksanaan', coverage: 'Sahkan sama ada Selangau di bawah sub-zon Sibu/Tengah atau Bintulu/Utara' },
    { category: 'Peranti Guru (Laptop Guru)', phase: 'Peranti Guru Fasa 1', scope: 'Zon 2: Sarawak', vendor: 'Panel KPM Pusat (HP / Rakan Zon Bertauliah)', contractNo: 'QT230000000015578', start: '2023-09-15', end: '2028-12-14', duration: 63, status: 'Aktif', coverage: 'Inisiatif laptop guru lease-to-own seluruh Sarawak' },
    { category: 'Peranti Guru (Laptop Guru)', phase: 'Peranti Guru Fasa 2', scope: 'Zon Sarawak (Lease-to-Own)', vendor: 'Pro Office Technology Sdn. Bhd.', contractNo: 'QT25000000001233', start: '2026-01-01', end: '2031-04-30', duration: 64, status: 'Aktif', coverage: 'Fasa terkini pelaksanaan peranti guru' }
  ]
};
