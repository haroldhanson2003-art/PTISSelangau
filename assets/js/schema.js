/* ==========================================================================
   PTIS · Skema modul & medan
   Satu sumber kebenaran untuk borang, jadual, carian dan eksport CSV.
   ========================================================================== */
(function () {
  'use strict';

  const STATUS_TONE = {
    'Selesai': 'ok',
    'Disahkan': 'ok',
    'Layak': 'ok',
    'Baik': 'ok',
    'Aktif': 'ok',
    'Dihantar': 'info',
    'Dalam Semakan': 'info',
    'Dirancang': 'info',
    'Sedang Berjalan': 'warn',
    'Perlu Penyelenggaraan': 'warn',
    'Cuti': 'warn',
    'Calon': 'neutral',
    'Draf': 'neutral',
    'Ditutup': 'neutral',
    'Ditangguhkan': 'danger',
    'Tidak Layak': 'danger',
    'Rosak': 'danger',
    'Dilupuskan': 'danger',
    'Tidak Aktif': 'danger'
  };

  const MODULES = {
    pergerakan: {
      key: 'pergerakan',
      sheet: 'Pergerakan',
      title: 'Pergerakan Pasukan Teknikal ICT Sekolah Daerah Selangau',
      navTitle: 'Pergerakan',
      short: 'Pergerakan',
      description: 'Rekod pergerakan, tugasan dan lawatan pasukan teknikal ke sekolah.',
      icon: 'route',
      tone: 'blue',
      noun: 'pergerakan',
      dateKey: 'tarikh',
      filterKey: 'status',
      searchKeys: ['sekolah', 'daerah', 'anggota', 'jenisPergerakan', 'lokasi', 'tujuan'],
      listCols: ['tarikh', 'sekolah', 'jenisPergerakan', 'anggota', 'status'],
      fields: [
        { key: 'tarikh', label: 'Tarikh', type: 'date', required: true },
        { key: 'masa', label: 'Masa', type: 'time' },
        { key: 'sekolah', label: 'Nama Sekolah', type: 'text', required: true, placeholder: 'Pilih atau taip nama sekolah', list: 'schools' },
        { key: 'kodSekolah', label: 'Kod Sekolah', type: 'text', placeholder: 'Auto diisi', list: 'schoolCodes', readonly: true },
        { key: 'daerah', label: 'Daerah / PPD', type: 'text', required: true, placeholder: 'Contoh: Selangau' },
        { key: 'jenisPergerakan', label: 'Jenis Pergerakan', type: 'select', required: true, options: ['Kunjung Bantu', 'Penyelenggaraan', 'Pemasangan', 'Pemulihan', 'Mesyuarat', 'Taklimat', 'Lain-lain'] },
        { key: 'anggota', label: 'Anggota Bertugas', type: 'text', required: true, placeholder: 'Nama penuh / senarai anggota' },
        { key: 'lokasi', label: 'Lokasi', type: 'text', placeholder: 'Contoh: Makmal Komputer 1' },
        { key: 'tujuan', label: 'Tujuan', type: 'textarea', wide: true, placeholder: 'Tujuan pergerakan...' },
        { key: 'status', label: 'Status', type: 'select', required: true, options: ['Dirancang', 'Sedang Berjalan', 'Selesai', 'Ditangguhkan'] },
        { key: 'catatan', label: 'Catatan', type: 'textarea', wide: true },
        { key: 'lampiran', label: 'Lampiran Surat Rasmi', type: 'file', wide: true, accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif' }
      ]
    },

    kunjungBantu: {
      key: 'kunjungBantu',
      sheet: 'KunjungBantu',
      title: 'Pelaporan Kunjung Bantu',
      navTitle: 'Kunjung Bantu',
      short: 'Kunjung Bantu',
      description: 'Laporan lawatan bimbingan pasukan teknikal ke sekolah.',
      icon: 'clipboard',
      tone: 'teal',
      noun: 'laporan kunjung bantu',
      dateKey: 'tarikh',
      filterKey: 'status',
      searchKeys: ['sekolah', 'daerah', 'anggota', 'pengetua', 'dapatan', 'tujuan'],
      listCols: ['tarikh', 'sekolah', 'daerah', 'anggota', 'status'],
      fields: [
        { key: 'tarikh', label: 'Tarikh Kunjung', type: 'date', required: true },
        { key: 'sekolah', label: 'Nama Sekolah', type: 'text', required: true, placeholder: 'Pilih atau taip nama sekolah', list: 'schools' },
        { key: 'daerah', label: 'Daerah / PPD', type: 'text', required: true },
        { key: 'pengetua', label: 'Guru Besar / Pengetua', type: 'text' },
        { key: 'anggota', label: 'Anggota Bertugas', type: 'text', required: true },
        { key: 'tujuan', label: 'Tujuan Kunjung Bantu', type: 'textarea', wide: true },
        { key: 'dapatan', label: 'Dapatan / Penemuan', type: 'textarea', wide: true, required: true },
        { key: 'cadangan', label: 'Cadangan Penambahbaikan', type: 'textarea', wide: true },
        { key: 'status', label: 'Status Laporan', type: 'select', required: true, options: ['Draf', 'Dihantar', 'Disemak', 'Disahkan'] },
        { key: 'lampiran', label: 'Lampiran Surat Rasmi', type: 'file', wide: true, accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif' }
      ]
    },

    scst: {
      key: 'scst',
      sheet: '',
      db: false,
      title: 'SCST Sekolah',
      navTitle: 'SCST',
      short: 'SCST',
      description: 'Pautan modul SCST mengikut sekolah (tidak disimpan dalam pangkalan data).',
      icon: 'award',
      tone: 'gold',
      noun: 'pautan SCST',
      searchKeys: ['namaSekolah', 'kodSekolah'],
      fields: []
    },

    peralatan: {
      key: 'peralatan',
      sheet: 'Peralatan',
      title: 'Maklumat Peralatan ICT Sekolah',
      navTitle: 'Peralatan ICT',
      short: 'Peralatan',
      description: 'Inventori dan status peralatan ICT di setiap sekolah.',
      icon: 'device',
      tone: 'indigo',
      noun: 'peralatan',
      filterKey: 'keadaan',
      searchKeys: ['sekolah', 'kodSekolah', 'jenisPeralatan', 'jenama', 'model', 'noSiri', 'lokasi', 'fasa', 'bilangan', 'vendor'],
      listCols: ['jenisPeralatan', 'jenama', 'model', 'noSiri', 'lokasi', 'fasa', 'keadaan'],
      fields: [
        { key: 'sekolah', label: 'Nama Sekolah', type: 'text', required: true, placeholder: 'Pilih atau taip nama sekolah', list: 'schools' },
        { key: 'kodSekolah', label: 'Kod Sekolah', type: 'text', placeholder: 'Auto diisi', list: 'schoolCodes', readonly: true },
        { key: 'daerah', label: 'Daerah / PPD', type: 'text' },
        { key: 'fasa', label: 'Fasa / Program', type: 'select', required: true, options: ['PdT Fasa 1', 'PdT Fasa 2', 'PdP Fasa 1', 'PdP Fasa 2', 'PdP Fasa 3', 'PdP Fasa 4', 'Peranti Guru Fasa 1', 'Peranti Guru Fasa 2', 'Hadiah Raspberry Pi', 'Lain-lain'] },
        { key: 'jenisPeralatan', label: 'Jenis Peralatan', type: 'select', required: true, options: ['Komputer Meja', 'Komputer Riba', 'Projektor', 'Pencetak', 'Rangkaian', 'Papan Interaktif', 'Raspberry Pi'] },
        { key: 'jenama', label: 'Jenama', type: 'text', placeholder: 'Contoh: HP, Dell, Epson' },
        { key: 'model', label: 'Model', type: 'text' },
{ key: 'bilangan', label: 'Bilangan Unit', type: 'number', min: 1, required: true, placeholder: '1' },
        { key: 'noSiri', label: 'No. Siri', type: 'text' },
        { key: 'tarikhPerolehan', label: 'Tarikh Perolehan', type: 'date' },
        { key: 'keadaan', label: 'Keadaan', type: 'select', required: true, options: ['Baik', 'Perlu Penyelenggaraan', 'Rosak', 'Dilupuskan'] },
        { key: 'lokasi', label: 'Lokasi Peralatan', type: 'text', placeholder: 'Contoh: Makmal Komputer 2' },
{ key: 'vendor', label: 'Vendor / Kontrak', type: 'text', placeholder: 'Contoh: Strateq Sdn. Bhd.' },
        { key: 'catatan', label: 'Catatan', type: 'textarea', wide: true }
      ]
    },

    kontrak: {
      key: 'kontrak',
      sheet: 'Kontrak',
      title: 'Rujukan Kontrak ICT PPD Selangau',
      navTitle: 'Kontrak ICT',
      short: 'Kontrak',
      description: 'Senarai kontrak ICT PPD Selangau, vendor dilantik dan tempoh sah kontrak.',
      icon: 'clipboard',
      tone: 'teal',
      noun: 'kontrak ICT',
      filterKey: 'status',
      searchKeys: ['kategori', 'fasa', 'vendor', 'contractNo', 'scope', 'coverage', 'status'],
      listCols: ['fasa', 'vendor', 'start', 'end', 'status'],
      fields: [
        { key: 'kategori', label: 'Kategori', type: 'select', required: true, options: ['PdT (Pentadbiran)', 'PdP (Makmal Komputer)', 'Peranti Guru (Laptop Guru)', 'Lain-lain'] },
        { key: 'fasa', label: 'Fasa / Program', type: 'text', required: true, placeholder: 'Contoh: PdT Fasa 2' },
        { key: 'scope', label: 'Zon / Skop', type: 'text', placeholder: 'Contoh: Zon 7: Sarawak (Lease-to-Own)' },
        { key: 'vendor', label: 'Vendor / Syarikat', type: 'text', required: true, placeholder: 'Nama syarikat dilantik' },
        { key: 'contractNo', label: 'No. Tender / Kontrak', type: 'text', placeholder: '-' },
        { key: 'start', label: 'Tarikh Mula', type: 'text', placeholder: 'Contoh: 2024 atau 2024-01-01' },
        { key: 'end', label: 'Tarikh Tamat', type: 'text', placeholder: 'Contoh: 2029 atau 2029-12-31' },
        { key: 'duration', label: 'Tempoh (Bulan)', type: 'number', min: 1, placeholder: '60' },
        { key: 'status', label: 'Status', type: 'select', required: true, options: ['Aktif', 'Aktif / Pelaksanaan', 'Tamat'] },
        { key: 'coverage', label: 'Liputan / Catatan (Selangau)', type: 'textarea', wide: true },
        { key: 'lampiran', label: 'Lampiran Dokumen Kontrak', type: 'file', wide: true, accept: '.pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif' }
      ]
    },

    organisasi: {
      key: 'organisasi',
      sheet: 'Organisasi',
      title: 'Organisasi PTIS',
      navTitle: 'Organisasi',
      short: 'Organisasi',
      description: 'Struktur organisasi Pasukan Teknikal ICT Sekolah Daerah Selangau.',
      icon: 'users',
      tone: 'violet',
      noun: 'ahli organisasi',
      filterKey: 'jawatan',
      searchKeys: ['nama', 'jawatan', 'sekolah', 'daerah', 'emel'],
      listCols: ['nama', 'jawatan', 'sekolah', 'daerah', 'noTelefon'],
      view: 'org',
      fields: [
        { key: 'nama', label: 'Nama Penuh', type: 'text', required: true },
        { key: 'jawatan', label: 'Jawatan', type: 'select', required: true, options: ['Pengerusi', 'Timbalan Pengerusi', 'Setiausaha', 'Penolong Setiausaha', 'Bendahari', 'Ahli Jawatankuasa', 'Ahli'] },
        { key: 'sekolah', label: 'Sekolah', type: 'text', required: true, placeholder: 'Pilih atau taip nama sekolah', list: 'schools' },
        { key: 'daerah', label: 'Daerah / PPD', type: 'text' },
        { key: 'noTelefon', label: 'No. Telefon', type: 'tel', placeholder: '012-345 6789' },
        { key: 'emel', label: 'E-mel', type: 'email', placeholder: 'nama@moe.edu.my' },
        { key: 'urutan', label: 'Urutan Paparan', type: 'number', min: 1, placeholder: '1' },
        { key: 'catatan', label: 'Catatan', type: 'textarea', wide: true }
      ]
    },

    pasukan: {
      key: 'pasukan',
      sheet: 'Pasukan',
      title: 'Maklumat Peribadi Pasukan Teknikal ICT',
      navTitle: 'Maklumat Pasukan',
      short: 'Pasukan',
      description: 'Profil peribadi anggota Pasukan Teknikal ICT Sekolah Daerah Selangau.',
      icon: 'info',
      tone: 'rose',
      noun: 'anggota pasukan',
      filterKey: 'status',
      searchKeys: ['nama', 'sekolah', 'daerah', 'jawatan', 'emel', 'noTelefon'],
      listCols: ['nama', 'jawatan', 'sekolah', 'noTelefon', 'status'],
      note: 'Maklumat peribadi adalah sulit. Hadkan akses kepada pentadbir sistem sahaja.',
      fields: [
        { key: 'nama', label: 'Nama Penuh', type: 'text', required: true },
        { key: 'noKadPengenalan', label: 'No. Kad Pengenalan', type: 'text', placeholder: 'Contoh: 900101-14-5678' },
        { key: 'jawatan', label: 'Jawatan dalam Pasukan', type: 'select', required: true, options: ['Ketua Pasukan', 'Timbalan Ketua', 'Setiausaha', 'Penolong Setiausaha', 'Ahli'] },
        { key: 'bidang', label: 'Bidang / Opsyen', type: 'text', placeholder: 'Contoh: Teknologi Maklumat' },
        { key: 'sekolah', label: 'Sekolah', type: 'text', required: true, placeholder: 'Pilih atau taip nama sekolah', list: 'schools' },
        { key: 'kodSekolah', label: 'Kod Sekolah', type: 'text', placeholder: 'Auto diisi', list: 'schoolCodes', readonly: true },
        { key: 'daerah', label: 'Daerah / PPD', type: 'text', required: true },
        { key: 'noTelefon', label: 'No. Telefon', type: 'tel' },
        { key: 'emel', label: 'E-mel', type: 'email' },
        { key: 'alamat', label: 'Alamat', type: 'textarea', wide: true },
        { key: 'tarikhLantikan', label: 'Tarikh Lantikan', type: 'date' },
        { key: 'status', label: 'Status Keanggotaan', type: 'select', required: true, options: ['Aktif', 'Cuti', 'Tidak Aktif'] },
        { key: 'catatan', label: 'Catatan', type: 'textarea', wide: true }
      ]
    }
  };

  const MODULE_ORDER = ['pergerakan', 'kunjungBantu', 'scst', 'peralatan', 'kontrak', 'organisasi', 'pasukan'];

  const ORG_ORDER = ['Pengerusi', 'Timbalan Pengerusi', 'Setiausaha', 'Penolong Setiausaha', 'Bendahari', 'Ahli Jawatankuasa', 'Ahli'];

  window.STATUS_TONE = STATUS_TONE;
  window.MODULES = MODULES;
  window.MODULE_ORDER = MODULE_ORDER;
  window.ORG_ORDER = ORG_ORDER;
})();
