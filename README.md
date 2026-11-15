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
- **Google Sheets** sebagai pangkalan data melalui Apps Script Web App (`/exec`). Token API pilihan hanya menambah halangan ringan, bukan kawalan akses untuk klien awam.
- **Tanpa log masuk Google**. Oleh sebab ini aplikasi statik, URL API dan konfigurasi klien boleh dilihat oleh pelawat.

## Mula pantas
```bash
npm run dev
```
Buka [http://localhost:5173](http://localhost:5173). Mod data menggunakan nilai `appsScriptUrl` dalam `assets/js/config.js`; kosongkan nilai itu untuk menggunakan stor demo pada peranti. Untuk menyediakan sambungan Google Sheets, ikut [apps-script/APPS_SCRIPT_SETUP.md](apps-script/APPS_SCRIPT_SETUP.md).

Jalankan ujian ringkas dengan `npm test`.

## Struktur projek
```
index.html                 Shell aplikasi + ikon SVG
manifest.webmanifest       Konfigurasi PWA
sw.js                      Service worker (cache shell)
assets/css/app.css         Reka bentuk responsif
assets/js/config.js        Visi, misi, tagline, dan endpoint lalai
assets/js/auth.js          Stub (log masuk dinyahaktifkan)
assets/js/schema.js        Skema modul & medan
assets/js/store.js         Demo store, API Google Sheets, cache
assets/js/ui.js            Komponen UI (toast, dialog, panel, format)
assets/js/app.js           Router, UI, CRUD dan modul
apps-script/Code.gs        Backend Google Apps Script (Sheets API)
apps-script/APPS_SCRIPT_SETUP.md  Panduan pemasangan Apps Script
tests/store.test.mjs       Ujian stor (Node.js terbina dalam)
tools/                     Skrip utiliti (dev server, ikon, sandaran zip)
```

## Deploy
Hoskan folder ini sebagai laman statik (HTTPS untuk PWA), contoh: GitHub Pages, Netlify/Vercel, atau pelayan web. Endpoint Apps Script dikonfigurasi dalam `assets/js/config.js`; halaman Tetapan sengaja tidak memaparkan atau mengubah sambungan tersebut.

> **Nota keselamatan penting:** Ini ialah aplikasi klien awam. URL Apps Script (dan apa-apa token yang dimasukkan ke `config.js`) boleh dilihat melalui kod sumber atau trafik rangkaian. Dengan Web App `Anyone`, sesiapa yang boleh mencapai endpoint boleh membaca/menulis data melalui API; token dalam klien bukan rahsia dan bukan kawalan akses. Jangan simpan data sulit atau maklumat pengenalan peribadi di belakang endpoint awam. Untuk data terhad, gunakan backend yang mengesahkan identiti dan menguatkuasakan kebenaran di bahagian pelayan.

## Lesen
Penggunaan dalaman. Hak cipta Pasukan Teknikal ICT Daerah Selangau.
