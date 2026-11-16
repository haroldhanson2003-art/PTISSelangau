# PTIS — Google Apps Script Setup (Code.gs + Google Sheets)

Connect PTIS to Google Sheets via Apps Script. The backend uses a simple Web App API (no Google Sign-In).

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

## 3) Sheets & headers
| Sheet | Headers |
|---|---|
| Pergerakan | `id, tarikh, masa, sekolah, kodSekolah, daerah, jenisPergerakan, anggota, lokasi, tujuan, status, catatan, lampiran, createdAt, updatedAt` |
| KunjungBantu | `id, tarikh, sekolah, daerah, pengetua, anggota, tujuan, dapatan, cadangan, status, lampiran, createdAt, updatedAt` |
| Peralatan | `id, sekolah, kodSekolah, daerah, fasa, jenisPeralatan, jenama, model, bilangan, noSiri, tarikhPerolehan, keadaan, lokasi, vendor, catatan, createdAt, updatedAt` |
| Kontrak | `id, kategori, fasa, scope, vendor, contractNo, start, end, duration, status, coverage, lampiran, createdAt, updatedAt` |
| Organisasi | `id, nama, jawatan, sekolah, daerah, noTelefon, emel, urutan, catatan, createdAt, updatedAt` |
| Pasukan | `id, nama, noKadPengenalan, jawatan, bidang, sekolah, kodSekolah, daerah, noTelefon, emel, alamat, tarikhLantikan, status, catatan, createdAt, updatedAt` |

- Number fields: `urutan`, `bilangan`, `duration`
- API actions: `ping`, `setup`, `bootstrap`, `list`, `create`, `update`, `delete`, `upload`
- `lampiran` (Pergerakan, KunjungBantu & Kontrak) stores a JSON list of attached files (`id, name, url, mime, size`). Files are saved to the Google Drive folder **PTIS Lampiran** (PDF, Word, JPG/PNG/WebP/GIF, max 10 MB each). Files are shared as "Anyone with the link can view".
- After updating `Code.gs`, re-authorise the script when prompted (it now needs Google Drive access) and deploy a new version.
- `SCST` is link-based in the app (no sheet)

## 4) Troubleshooting
- **`TOKEN_INVALID`**: Token in PTIS must match `TOKEN` in `Code.gs` (or both blank).
- **"Respons pelayan tidak sah" / HTML response**: ensure deployment is Web App with **Who has access: Anyone** and you’re using the `/exec` URL.
- **Tab not found**: run `setup()` in Apps Script.
- **Changes not applied**: deploy a new version after editing `Code.gs`.
