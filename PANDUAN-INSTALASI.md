# PANDUAN INSTALASI — Musyawaroh & Pelaporan Bagian Pendidikan

Aplikasi ini terdiri dari dua bagian:

| Bagian | Berkas | Tempat |
| --- | --- | --- |
| **Backend** (server & database) | `Kode.gs` | Google Apps Script, menempel di Google Spreadsheet |
| **Frontend** (tampilan) | isi `musyawaroh-pelaporan.zip` (pasang baru) atau `musyawaroh-pelaporan-update-v1.2.0.zip` (update) | GitHub Pages |

Kerjakan berurutan: **Bagian A → B → C**. Perkiraan waktu ±30 menit.

> **Sudah memakai aplikasi ini sebelumnya?** Langsung ke **Bagian U — Update ke v1.2.0** di bawah. Tidak perlu memasang ulang dari awal, dan data tidak berubah.

---

## U. UPDATE KE v1.3.0 (untuk aplikasi yang sudah berjalan)

**Yang baru di v1.3.0**
1. Keterangan Muslimus hanya muncul bila jawabannya **Belum**.
2. Laporan PJP di Link: pilihannya cukup **Sudah / Belum**. Data lama terbaca otomatis.
3. **Keterangan Sambung 1** dan **Muda-Mudi Minggu 1–4** wajib diisi.
4. Kelola Laporan: filter otomatis ke **bulan laporan berjalan** setiap kali dibuka.
5. **Mode Musyawaroh** baru:
   - kolom Laporan Lainnya, Kendala, dan Usulan/Info dipisah;
   - tombol **Tanggapi** di setiap butir, plus **Catatan Musyawaroh** per kelompok;
   - kartu **"Lainnya"** (dulu "Rincian Program KBM");
   - kartu **Muda-Mudi** dan **Kelas Tahfidz** sendiri;
   - kartu **Sudah Muslimus?** yang besar.

   Tanggapan ikut tampil di rincian laporan dan di PDF.
6. Logo cukup **satu**.
7. Editor notulen bergaya **Google Dokumen**: toolbar lengkap, penggaris, dan halaman putih. Tempat & tanggal tetap ada.
8. Kop PDF memuat **Tanggal : … Tempat : …** dari notulen musyawaroh.
9. Urutan kelompok & pengurus bisa diatur dengan **seret (drag & drop)** di Pengaturan.
10. Dashboard umum tampil **sama seperti dashboard admin** (tanpa tombol kunci): ada jumlah **Muda-Mudi** dan **filter kelompok**.
11. Tema cukup **Terang / Gelap**.

**Yang terjadi pada data**
- Tab **Laporan** tetap sama persis: judul & urutan kolom tidak berubah.
- Tab baru **Tanggapan** dibuat otomatis saat pertama kali dipakai. Tidak perlu menjalankan `setupAwal` lagi.
- Notulen lama tetap utuh dan tampil sebagai daftar bernomor. Bila sebuah sesi diubah lewat editor baru, isinya disimpan sebagai satu dokumen. Sel kolom *Isi* diawali penanda `<!--doc-->`; dokumen panjang atau bergambar otomatis dipecah ke beberapa baris. Jangan ubah sel-sel itu manual di Sheets.

### U1. Backend (±3 menit)

1. Buka spreadsheet **DB Musyawaroh & Pelaporan Bagian Pendidikan** → **Ekstensi → Apps Script**.
2. Pilih seluruh isi `Kode.gs` (Ctrl + A) → hapus → tempel **seluruh isi `Kode.gs` v1.3.0** → **Ctrl + S**.
   Isian `SETUP_AWAL` dan `MIGRASI` biarkan kosong — tidak dibutuhkan untuk update.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**
   ⚠️ Jangan pilih "Deployment baru" — URL `/exec` akan berganti dan aplikasi berhenti.
4. (Opsional) Jalankan **`cekData`** — log menampilkan `Versi kode: 1.3.0`.
   Jika Anda melompat dari versi di bawah 1.2, jalankan juga **`pasangPemicu`** sekali.

### U2. Frontend (±5 menit)

1. Ekstrak **`musyawaroh-pelaporan-update-v1.3.0.zip`**.
   ZIP update ini **sengaja tidak berisi `config.js`** supaya URL server Anda tidak tertimpa.
2. Salin seluruh isinya (`index.html`, `README.md`, `PANDUAN-INSTALASI.md`, folder `assets`) ke **folder repo Anda yang sudah ada**, yaitu folder yang berisi `index.html` dan `config.js`. Pilih **Ganti file di tujuan** saat Windows bertanya.
   Ada berkas baru `assets/js/dash.js`; pastikan ikut tersalin.
3. Buka PowerShell di folder repo itu, lalu jalankan:

   ```powershell
   dir
   ```
   Pastikan `index.html` **dan** `config.js` terlihat. Lalu:
   ```powershell
   git add .
   git commit -m "Update v1.3.0 - musyawaroh, notulen gaya dokumen, dashboard umum"
   git push
   ```
4. Tunggu 1–2 menit, buka aplikasi, tekan **Ctrl + Shift + R**.

### U3. Cek hasil

- Bila muncul **kotak kuning "Server belum diperbarui … butuh 1.3.0"** → langkah U1-3 (Versi baru) belum dilakukan.
- **Pengaturan → Logo** kini hanya satu slot. Logo kiri yang sudah ada tetap dipakai; logo kanan tidak ditampilkan lagi.
- **Unduh PDF**: di setiap kartu ada pilihan **"Kop: tanggal & tempat musyawaroh"**. Bawaannya adalah sesi notulen bulan berikutnya dari bulan laporan (mis. laporan September → musyawaroh Oktober), dan bisa diganti.

---

## A. BACKEND — Google Apps Script

### A1. Buat spreadsheet & tempel kode

1. Buka <https://sheets.new> (spreadsheet baru), beri nama **DB Musyawaroh & Pelaporan Bagian Pendidikan**.
2. Menu **Ekstensi → Apps Script**.
3. Hapus isi `Code.gs` bawaan, lalu tempel **seluruh isi `Kode.gs`**. Ganti nama berkas menjadi `Kode` (opsional).
4. Klik ikon ⚙️ **Setelan Proyek** (kiri) → **Zona waktu**: pilih **(GMT+08:00) Makassar**.

### A2. Isi data admin lalu jalankan `setupAwal()` — SEKALI

1. Di bagian paling atas `Kode.gs`, isi:

   ```javascript
   const SETUP_AWAL = {
     username: 'admin',
     password: 'IsiPasswordAnda123',          // minimal 8 karakter
     email_penerima: 'email1@gmail.com, email2@gmail.com',
   };
   ```

2. Simpan (**Ctrl + S**).
3. Di dropdown fungsi (sebelah tombol ▶), pilih **`setupAwal`** → klik **▶ Jalankan**.
4. Muncul "Perlu otorisasi" → **Tinjau izin** → pilih akun Google → **Lanjutan → Buka (tidak aman)** → **Izinkan**.
   *(Normal untuk skrip buatan sendiri.)*
5. Buka **Log eksekusi** — harus tampil `✅ SETUP SELESAI`.
6. **PENTING:** kosongkan lagi password di `SETUP_AWAL` (`password: ''`) lalu **Ctrl + S**.
   Password sudah tersimpan sebagai hash di tab *Pengaturan* — tidak pernah tersimpan sebagai teks biasa.

Hasilnya di spreadsheet: tab **Pengaturan, Kelompok, Dapuan, Laporan, KunciBulan, Notulen, Peserta, Kehadiran, Log**, berisi 4 kelompok pelapor + 3 kelompok pengurus (4S Desa, Tim Desa, PJP Desa) beserta daftar dapuan awal. Folder Drive **Musyawaroh & Pelaporan – Aset** juga dibuat untuk logo.

> `setupAwal()` aman dijalankan ulang — tidak akan menggandakan data.

### A3. (Opsional) Pindahkan data dari 3 aplikasi lama

1. Isi blok `MIGRASI` di bagian atas `Kode.gs` dengan ID spreadsheet lama
   (ID = bagian URL di antara `/d/` dan `/edit`) dan **nama tab** tempat datanya berada, contoh:

   ```javascript
   LAPORAN_SPREADSHEET_ID: '1KAmr96ZgZzpqWnK4bWmFeVUYt3LFJ9l7AsJTIX9zN84',
   LAPORAN_TAB: 'Nama tab persis seperti di bagian bawah spreadsheet',
   ```
2. Biarkan `DRY_RUN: true`, pilih fungsi **`migrasiDataLama`** → ▶ Jalankan.
   Log menampilkan **pemetaan kolom lama → kolom baru** dan **jumlah baris lama vs baru**, tanpa menulis apa pun.
3. Jika ada kolom bertanda `❌ TIDAK TERPETAKAN` yang penting, kirim screenshot log-nya — aturan pemetaan (`PETA_LAPORAN`) tinggal ditambah.
4. Jika sudah benar, ubah `DRY_RUN: false` → jalankan lagi **sekali**.
5. Jadikan spreadsheet lama **hanya-baca** (jangan dihapus).

### A4. Deploy sebagai Web App

1. Klik **Terapkan (Deploy) → Deployment baru**.
2. ⚙️ Pilih jenis: **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai:** *Saya* (akun Anda)
   - **Yang memiliki akses:** *Siapa saja* (Anyone)
4. Klik **Terapkan** → **salin URL** yang berakhiran **`/exec`**.

> 🔁 **Saat memperbarui `Kode.gs` di kemudian hari:** JANGAN buat "Deployment baru".
> Pakai **Terapkan → Kelola deployment → ✏️ (Edit) → Versi: Versi baru → Terapkan**, supaya URL `/exec` tetap sama.

---

## B. FRONTEND — GitHub Pages

### B1. Siapkan folder

1. Ekstrak `musyawaroh-pelaporan.zip` ke, misalnya, `Documents\musyawaroh-pelaporan`.
2. Pastikan isi folder itu **langsung** seperti ini (bukan di dalam subfolder lagi):

   ```
   musyawaroh-pelaporan\        ← folder inilah yang di-git init
   ├── index.html
   ├── config.js
   ├── README.md
   ├── PANDUAN-INSTALASI.md
   └── assets\
       ├── css\style.css
       └── js\ (core.js, app.js, …)
   ```

   Jika Windows membuat folder ganda (`musyawaroh-pelaporan\musyawaroh-pelaporan\index.html`), pakai folder **yang di dalam**.

3. Buka `config.js` dengan Notepad, tempel URL `/exec` dari langkah A4:

   ```javascript
   window.APP_CONFIG = {
     API_URL: 'https://script.google.com/macros/s/AKfycb.../exec',
   };
   ```

   Simpan.

### B2. Buat repository di GitHub

Di <https://github.com> (akun **visenasrv**): **+ → New repository**
- Nama: **`musyawaroh-pelaporan`**
- **Public**
- **Jangan** centang README / .gitignore / license
- **Create repository**

### B3. Push dari PowerShell

Buka folder `musyawaroh-pelaporan` di File Explorer → klik address bar → ketik `powershell` → Enter. Lalu jalankan **satu per satu**:

```powershell
dir
```
Pastikan `index.html` terlihat di daftar teratas. Jika yang terlihat malah folder `musyawaroh-pelaporan`, masuk dulu: `cd musyawaroh-pelaporan`.

```powershell
git init
git add .
git commit -m "Upload pertama Musyawaroh & Pelaporan"
git branch -M main
git remote add origin https://github.com/visenasrv/musyawaroh-pelaporan.git
git push -u origin main
```

Saat diminta password, tempel **Personal Access Token** (bukan password akun). Layar memang tidak menampilkan apa pun saat token ditempel — itu normal, tekan Enter.

### B4. Aktifkan GitHub Pages

Repository → **Settings → Pages**:
- Source: **Deploy from a branch**
- Branch: **main** · **/ (root)** → **Save**
- Centang **Enforce HTTPS**

Tunggu 1–2 menit. Situs aktif di:
**<https://visenasrv.github.io/musyawaroh-pelaporan/>**

### B5. Update di kemudian hari

```powershell
git add .
git commit -m "Keterangan perubahan"
git push
```
Jika browser masih menampilkan versi lama: **Ctrl + Shift + R**.

---

## C. UJI COBA & BAGIKAN LINK

1. Buka situs → beranda tampil, status 4 kelompok "Belum".
2. **Isi Laporan** dengan data uji → kode koreksi muncul, **2 email** masuk ke penerima.
3. **Koreksi Laporan** memakai kode tadi → berhasil.
4. Buka **…/#/admin** → masuk → cek Dashboard, grafik, Kelola Laporan.
5. Hapus laporan uji dari **Kelola Laporan** (atau hapus barisnya di tab *Laporan*).

**Link yang dibagikan:**

| Untuk | Link |
| --- | --- |
| Kelompok (langsung ke formulir) | `https://visenasrv.github.io/musyawaroh-pelaporan/#/lapor` |
| Beranda publik | `https://visenasrv.github.io/musyawaroh-pelaporan/` |
| Admin | `https://visenasrv.github.io/musyawaroh-pelaporan/#/admin` |

---

## D. KENAPA APLIKASI INI TERASA CEPAT

| Teknik | Hasil |
| --- | --- |
| **SPA (satu halaman)** — semua menu dirender di perangkat | Pindah menu/halaman instan, tanpa muat ulang |
| **Cache lokal + segarkan di latar** (stale-while-revalidate) | Beranda, dashboard, notulen langsung tampil dari cache, data terbaru menyusul diam-diam |
| **Satu "bundle" data admin** | Admin memuat semua data sekali; cari, saring, ganti bulan, buka rincian = 0 detik |
| **Optimistic UI + antrean sinkron** | Simpan/ubah/hapus di admin langsung tampil; pengiriman ke server berjalan di latar dengan penanda *Menyimpan… → Tersimpan*. Jika internet putus, perubahan diantrekan dan dikirim ulang otomatis |
| **CacheService di server** (cache tabel ber-chunk) | Permintaan baca tidak membuka Sheets berulang-ulang |
| **Baca/tulis batch** (`getValues`/`setValues`) + `LockService` | Penulisan cepat & aman dari tabrakan |
| **Pustaka dimuat saat dibutuhkan** (grafik, PDF, drag-drop) | Halaman publik ringan di HP |
| **Modul admin terpisah** (v1.2) | HP kelompok tidak mengunduh kode admin; modul admin diunduh saat `#/admin` dibuka |
| **Login membawa data admin** (v1.2) | Masuk admin = 1 panggilan server, bukan 2 berurutan |
| **Email & log lewat antrean** (v1.2) | Kirim laporan tidak menunggu email terkirim; email dikirim pemicu dalam ±1 menit |
| **Cache berversi + `onEdit`** (v1.2) | Cache hanya diperbarui untuk tab yang berubah; edit manual di Sheets langsung terbaca |
| **Kirim ulang aman (`reqId`)** (v1.2) | Sinyal putus saat menyimpan → dikirim ulang otomatis tanpa data ganda; kelompok tetap mendapat kode koreksi yang sama |
| **Tahan sinyal HP** (v1.2) | Baca diulang otomatis 3×, menunggu sinyal kembali, server "dibangunkan" saat aplikasi dibuka |
| **Tulis blok** (v1.2) | Mengubah 1 laporan menulis 1 baris saja di sheet |

Satu-satunya proses yang **sengaja menunggu server** adalah **kirim/koreksi laporan oleh kelompok** — sesuai PRD (K6), pesan sukses dan kode koreksi hanya muncul setelah server benar-benar menyimpan.

---

## E. CATATAN PENTING

- **Isian formulir** sudah mengikuti formulir lama *Laporan PJP Klp Desa SS* (53 kolom), termasuk prosentase kehadiran & materi, laporan kelas di link, laporan lainnya & kendala per jenjang, jadwal & kehadiran tahfidz, dan usulan/info. Untuk menambah isian baru, ubah dua tempat:
  1. `assets/js/schema.js` (label & aturan tampilan)
  2. `FORM_KEYS` di `Kode.gs` (tambahkan di akhir daftar)
- **Data diedit manual di Sheets** langsung terbaca aplikasi (pemicu `onEdit` menandai tab yang berubah). Jika diubah lewat cara lain (impor, rumus, skrip lain), jalankan `bersihkanCache` atau menu spreadsheet **⚙️ Musyawaroh → Bersihkan cache aplikasi**.
- **Email notifikasi** dikirim pemicu `prosesAntrean` tiap 1 menit. Untuk kembali ke email langsung (tanpa pemicu), jalankan `lepasPemicu`.
- **Lupa password admin:** isi `SETUP_AWAL.password`, jalankan `resetPasswordAdmin`, lalu kosongkan lagi.
- **Login terblokir** (5× salah): tunggu 15 menit, atau jalankan `bukaBlokirLogin`.
- **Pertama kali dibuka pagi hari** server Google bisa butuh 2–4 detik untuk "bangun". Setelah itu cepat.

## F. TROUBLESHOOTING

| Gejala | Penyebab & solusi |
| --- | --- |
| Halaman "URL server belum diatur" | `config.js` belum diisi URL `/exec` → isi, lalu push ulang |
| "Server membalas dengan format tidak dikenal" | Akses Web App bukan *Siapa saja*, atau URL salah (pakai yang `/exec`, bukan `/dev`) |
| "Tidak dapat terhubung ke server" | Internet putus, atau deployment dihapus |
| 404 di GitHub Pages | `index.html` tidak di root repo → lihat B1 & B3 |
| Tampilan polos tanpa warna | Struktur folder `assets/` rusak (upload lewat web GitHub) → push ulang lewat PowerShell |
| Email tidak masuk | Cek spam; pastikan email penerima terisi di **Admin → Pengaturan → Akun & Email** |
| Perubahan `Kode.gs` tidak berlaku / kotak kuning "Server belum diperbarui" | Belum deploy **Versi baru** (lihat A4 / U1-4) |
| Email laporan tidak pernah datang setelah update | Pemicu belum terpasang → jalankan `pasangPemicu` (U1-3). Cek **Pemicu** (ikon jam) di Apps Script: harus ada `prosesAntrean` tiap menit |
| Persen tampil **0.83%** padahal di data lama **83%** (data hasil migrasi v1.2.0 ke bawah) | Pasang `Kode.gs` v1.2.1 → deploy **Versi baru**. Lalu isi `MIGRASI.LAPORAN_SPREADSHEET_ID` & `LAPORAN_TAB`, jalankan **`perbaikiAngkaMigrasi`** dengan `DRY_RUN: true` (pratinjau), lalu `DRY_RUN: false` sekali |
| Halaman admin "Gagal memuat modul admin" | Berkas `assets/js/admin.js` dll. belum ter-push → ulangi U2 |
