# PTIS — Google Apps Script Setup (Code.gs + Google Sheets)

Connect PTIS to Google Sheets via Apps Script. The backend is a Web App API; sign-in is optional in the client but the server verifies every request whenever `GOOGLE_CLIENT_ID` is set, and applies roles from the `Users` tab (see §2c).

> **Security note:** PTIS is a public static client. The `/exec` URL and any token configured in the client are visible to visitors. With a Web App deployed as **Anyone**, anyone can call the API to read/write its data; a client-side token is not a secret or an access-control boundary. Do not use this setup for personal, confidential, or restricted data. Use an authenticated backend with server-side authorization for that.

## 1) What you need
- A Google account (owns the Sheet and Apps Script)
- A Google Sheet (stores PTIS data)
- PTIS hosted over **HTTPS** for production/PWA (localhost is fine for testing)

## 2) Setup steps
1. **Create a Google Sheet** (e.g. `PTIS Selangau Data`).
2. **Extensions → Apps Script**. Replace default code with the full contents of [`apps-script/Code.gs`](./Code.gs) and **Save**.
3. **Optional friction only:** a `TOKEN` can be set in `Code.gs`, but if placed in this public client it is discoverable and does not protect the data:
   ```js
   const TOKEN = 'your-long-random-secret';
   ```
4. **Run `setup()` once** (select `setup` → **Run** → approve permissions). This creates/ensures tabs and headers: **Pergerakan, KunjungBantu, Peralatan, Kontrak, Organisasi, Pasukan**.
5. **Deploy as Web App**: **Deploy → New deployment** → **Web app**
   - **Execute as:** Me
   - **Who has access:** Anyone
   - Copy the Web App URL ending with `/exec`.
6. Set `appsScriptUrl` (and optional `apiToken`) in `assets/js/config.js`, then commit and deploy PTIS. The in-app Tetapan page intentionally does not expose connection details.

> After editing `Code.gs` (including changing `TOKEN`), create a **new deployment/version** so the `/exec` URL serves the latest code.

## 2b) Log masuk Google (pilihan, disyorkan)
Log masuk membenarkan hanya akaun rasmi (`moe.gov.my`, `moe-dl.edu.my`) mengakses data. Ia dimatikan selagi `clientId` kosong.
1. **Google Cloud Console** → pilih/buat projek → **APIs & Services → OAuth consent screen**. Pilih **Internal** jika organisasi menggunakan Google Workspace.
2. **Credentials → Create credentials → OAuth client ID** → jenis **Web application**.
3. **Authorized JavaScript origins**: tambah `https://haroldhanson2003-art.github.io` (dan `http://localhost:5173` untuk ujian).
4. Salin **Client ID**, kemudian isi:
   - `apps-script/Code.gs`: `const GOOGLE_CLIENT_ID = '...';`
   - `assets/js/config.js`: `auth.clientId: '...'`
5. Pastikan `ALLOWED_DOMAINS` (Code.gs) dan `allowedDomains` (config.js) sama.
6. Deploy **new version** Web App. Pelayan menolak sebarang permintaan tanpa token log masuk yang sah (kecuali semakan sambungan `ping`).

> Mod Demo tidak memerlukan log masuk. Pengguna boleh pilih "Teruskan dalam Mod Demo" pada skrin log masuk.

## 2c) Peranan (roles) dan data peribadi
Peranan ditentukan **di pelayan**. Klien tidak menghantar peranan; ia hanya bertanya melalui tindakan `whoami`.

1. Jalankan `setup()` untuk mencipta tab **Users** (lajur: `email, role, name, active`).
2. Tambah satu baris bagi setiap pengguna:
   - `role`: `admin`, `ahli` atau `viewer`
   - `active`: `TRUE`/kosong = aktif, `FALSE` = ditolak sepenuhnya
3. E-mel dalam `ADMIN_EMAILS` (Code.gs) sentiasa pentadbir dan tidak perlu ada dalam tab.
   Kemas kini senarai itu kepada e-mel pemilik sistem sebenar.
4. Pengguna domain sah yang tiada dalam tab mendapat peranan default `ahli` (baca/tulis, tetapi data peribadi disembunyikan).

| Peranan | Baca modul | Tulis | Data peribadi (`Pasukan`) | Sandaran/pemulihan |
|---|---|---|---|---|
| `admin` | ya | ya | ya | ya |
| `ahli` | ya | ya | **tidak** (dipadam di pelayan) | tidak |
| `viewer` | ya | tidak | tidak | tidak |

Medan peribadi (`noKadPengenalan`, `noTelefon`, `emel`, `alamat` dalam tab Pasukan) **dikosongkan dalam respons pelayan** untuk bukan pentadbir. Menyembunyikannya di UI sahaja bukan kawalan akses. Suntingan oleh bukan pentadbir tidak memadam nilai sedia ada: pelayan mengekalkan nilai lama.

## 3) Sheets & headers
| Sheet | Headers |
|---|---|
| Users | `email, role, name, active` (kawalan akses; tidak pernah dihantar kepada klien) |
| Pergerakan | `id, tarikh, masa, sekolah, kodSekolah, daerah, jenisPergerakan, anggota, lokasi, tujuan, status, catatan, lampiran, createdAt, updatedAt` |
| KunjungBantu | `id, tarikh, sekolah, daerah, pengetua, anggota, tujuan, dapatan, cadangan, status, lampiran, createdAt, updatedAt` |
| Peralatan | `id, sekolah, kodSekolah, daerah, fasa, jenisPeralatan, jenama, model, bilangan, noSiri, tarikhPerolehan, keadaan, lokasi, vendor, catatan, createdAt, updatedAt` |
| Kontrak | `id, kategori, fasa, scope, vendor, contractNo, start, end, duration, status, coverage, lampiran, createdAt, updatedAt` |
| Organisasi | `id, nama, jawatan, sekolah, daerah, noTelefon, emel, urutan, catatan, createdAt, updatedAt` |
| Pasukan | `id, nama, noKadPengenalan, jawatan, bidang, sekolah, kodSekolah, daerah, noTelefon, emel, alamat, tarikhLantikan, status, catatan, createdAt, updatedAt` |

- Number fields: `urutan`, `bilangan`, `duration`
- API actions: `ping`, `whoami`, `setup`, `bootstrap`, `list`, `create`, `update`, `delete`, `upload`, `backup`, `backups`, `restore`
- `setup`, `backup`, `backups` dan `restore` adalah untuk pentadbir sahaja; `create/update/delete/upload` ditolak untuk `viewer`.
- `lampiran` (Pergerakan, KunjungBantu & Kontrak) stores a JSON list of attached files (`id, name, url, mime, size`). Files are saved to the Google Drive folder **PTIS Lampiran** (PDF, Word, JPG/PNG/WebP/GIF, max 10 MB each). Files are shared as "Anyone with the link can view".
- After updating `Code.gs`, re-authorise the script when prompted (it now needs Google Drive access) and deploy a new version.
- `SCST` is link-based in the app (no sheet)

## 3b) Sandaran & pemulihan (pentadbir)
Semua dijalankan dari **Tetapan → Sandaran Google Sheets** dalam aplikasi.

- **Sandaran ke Drive** menulis satu fail JSON (semua tab) ke folder Drive **PTIS Sandaran**.
- **Pulihkan** mengembalikan snapshot itu: baris data diganti, header dan struktur tab dikekalkan.
- Sebelum setiap pemulihan, pelayan membuat **sandaran keselamatan automatik**; namanya dipaparkan selepas pemulihan, jadi pemulihan boleh dibatalkan dengan memulihkan sandaran itu.
- **Pulihkan fail JSON** menerima eksport `PTIS-sandaran-*.json` daripada Tetapan → Sandaran JSON. Kunci modul (`pergerakan`) dan nama tab (`Pergerakan`) kedua-duanya diterima.
- Had: 5,000 baris setiap tab setiap pemulihan (pecahkan fail jika lebih). Sandaran/pemulihan memerlukan akses Google Drive kepada skrip.
- Tindakan ini perlu deploy **versi baharu** dan kebenaran Drive (skrip sudah meminta Drive untuk lampiran).

## 4) Troubleshooting
- **`TOKEN_INVALID`**: Token in PTIS must match `TOKEN` in `Code.gs` (or both blank).
- **`FORBIDDEN` / "hanya untuk pentadbir"**: e-mel anda bukan `admin` dalam tab Users dan tiada dalam `ADMIN_EMAILS`.
- **`READ_ONLY`**: peranan anda `viewer`; tukar kepada `ahli` dalam tab Users.
- **"Medan peribadi disembunyikan"**: jangkaan untuk `ahli`/`viewer`. Log masuk sebagai pentadbir untuk melihat/menyunting data peribadi.
- **"Respons pelayan tidak sah" / HTML response**: ensure deployment is Web App with **Who has access: Anyone** and you’re using the `/exec` URL.
- **Tab not found**: run `setup()` in Apps Script.
- **Changes not applied**: deploy a new version after editing `Code.gs`.
