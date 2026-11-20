# PTIS · Pasukan Teknikal ICT Sekolah Daerah Selangau

Aplikasi web (PWA, tanpa build step) untuk pengurusan **Pasukan Teknikal ICT Sekolah Daerah Selangau**. Data boleh disimpan dalam **Google Sheets** melalui Google Apps Script, atau digunakan dalam **Mod Demo** (localStorage). Modul SCST menyediakan pautan ke dtpcare (tanpa pangkalan data).

## Modul
- **Pergerakan** — rekod pergerakan/tugasan/lawatan pasukan
- **Kunjung Bantu** — laporan bimbingan ke sekolah
- **SCST** — carian sekolah Selangau dan pautan **Buka SCST** (dtpcare)
- **Peralatan ICT** — inventori peralatan sekolah (termasuk rujukan kontrak)
- **Kontrak ICT** — rujukan kontrak ICT PPD Selangau (boleh disunting)
- **Organisasi** — carta/maklumat organisasi PTIS
- **Maklumat Pasukan** — profil anggota pasukan
- **Panduan Laporan** — panduan ISD/surat rasmi, templat dan komposer e-mel

## Akses & sandaran
- Log masuk Google (domain `moe.gov.my`, `moe-dl.edu.my`) disahkan **di pelayan**. Peranan `admin` / `ahli` / `viewer` diambil daripada tab **Users** dalam hamparan; data peribadi (`No. KP`, telefon, e-mel, alamat) hanya untuk `admin` dan dipadamkan dalam respons pelayan untuk peranan lain.
- **Tetapan → Sandaran Google Sheets** (pentadbir): sandaran JSON ke Drive, senarai snapshot dan pemulihan dengan sandaran keselamatan automatik sebelum menulis.
- Setiap sekolah ada **profil sekolah** (`index.html#/s/<kod>`) yang menyatukan peralatan, pergerakan, kunjung bantu, anggota dan kontrak. Pautan ada pada modul Peralatan, senarai SCST dan butiran rekod.

## Ujian
- `tests/backend-harness.html` — hidangkan folder ini (`python -m http.server 8123`) dan buka `http://127.0.0.1:8123/tests/backend-harness.html`. Ia menjalankan `apps-script/Code.gs` **sebenar** terhadap SpreadsheetApp/DriveApp/UrlFetchApp tiruan dalam memori: peranan, penapisan data peribadi, kebenaran tindakan, sandaran dan pemulihan (42 semakan). Tiada akses ke Google sebenar.
- `tests/store.test.mjs` — ujian modul storan; perlukan Node ≥18 (`node --test tests/`).

## Lesen
Penggunaan dalaman. Hak cipta Pasukan Teknikal ICT Sekolah Daerah Selangau.
