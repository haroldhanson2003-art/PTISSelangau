# PTIS · Pasukan Teknikal ICT Daerah Selangau

Aplikasi web (PWA, tanpa build step) untuk pengurusan **Pasukan Teknikal ICT Daerah Selangau**. Data boleh disimpan dalam **Google Sheets** melalui Google Apps Script, atau digunakan dalam **Mod Demo** (localStorage). Modul SCST menyediakan pautan ke dtpcare (tanpa pangkalan data).

## Modul
- **Pergerakan** — rekod pergerakan/tugasan/lawatan pasukan
- **Kunjung Bantu** — laporan bimbingan ke sekolah
- **SCST** — carian sekolah Selangau dan pautan **Buka SCST** (dtpcare)
- **Peralatan ICT** — inventori peralatan sekolah (termasuk rujukan kontrak)
- **Kontrak ICT** — rujukan kontrak ICT PPD Selangau (boleh disunting)
- **Organisasi** — carta/maklumat organisasi PTIS
- **Maklumat Pasukan** — profil anggota pasukan
- **Panduan Laporan** — panduan ISD/surat rasmi, templat dan komposer e-mel

Papan pemuka memaparkan **Visi, Misi & Tagline JDN**.

## Ciri utama
- **PWA responsif** (desktop/Android/iPhone), boleh dipasang dan berfungsi luar talian (shell/cache bacaan).
- **CRUD, carian, tapisan, eksport CSV** untuk modul data; **sandaran/import JSON** (mod demo).
- **Google Sheets** sebagai pangkalan data melalui Apps Script Web App (`/exec`), dengan sokongan **Token API** pilihan.
- **Tanpa log masuk Google** secara lalai (akses dikawal melalui pengurusan URL/token Apps Script).

## Mula pantas
```bash
npm run dev
```
Buka [http://localhost:5173](http://localhost:5173) (Mod Demo). Untuk sambungan Google Sheets, ikut [apps-script/APPS_SCRIPT_SETUP.md](apps-script/APPS_SCRIPT_SETUP.md).

## Struktur projek
```
index.html                 Shell aplikasi + ikon SVG
manifest.webmanifest       Konfigurasi PWA
sw.js                      Service worker (cache shell)
assets/css/app.css         Reka bentuk responsif
assets/js/config.js        Visi, misi, tagline, tetapan lalai
assets/js/auth.js          Stub (log masuk dinyahaktifkan)
assets/js/schema.js        Skema modul & medan
assets/js/store.js         Demo store, API Google Sheets, cache
assets/js/ui.js            Komponen UI (toast, dialog, panel, format)
assets/js/app.js           Router, UI, CRUD dan modul
apps-script/Code.gs        Backend Google Apps Script (Sheets API)
apps-script/APPS_SCRIPT_SETUP.md  Panduan pemasangan Apps Script
tools/                     Skrip utiliti (dev server, ikon, sandaran zip)
```

## Deploy
Hoskan folder ini sebagai laman statik (HTTPS untuk PWA), contoh: GitHub Pages, Netlify/Vercel, atau pelayan web. Kemudian buka **Tetapan** → masukkan URL Web App Apps Script (`/exec`) dan Token (jika ada) → **Uji Sambungan**.

> **Nota keselamatan:** log masuk Google dinyahaktifkan secara lalai. Jika Web App dikongsi sebagai "Anyone", sesiapa yang mengetahui URL (dan token, jika tiada) boleh mengakses data. Gunakan `TOKEN` rahsia, hadkan perkongsian URL, dan hadkan akses hamparan kepada pentadbir. Maklumat peribadi dalam modul Pasukan adalah data sulit.

## Lesen
Penggunaan dalaman. Hak cipta Pasukan Teknikal ICT Daerah Selangau.
