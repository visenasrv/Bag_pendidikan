# PANDUAN INSTALASI — Musyawaroh & Pelaporan Bagian Pendidikan

Aplikasi ini terdiri dari dua bagian:

| Bagian | Berkas | Tempat |
| --- | --- | --- |
| **Backend** (server & database) | `Kode.gs` | Google Apps Script, menempel di Google Spreadsheet |
| **Frontend** (tampilan) | isi `musyawaroh-pelaporan.zip` | GitHub Pages |

Kerjakan berurutan: **Bagian A → B → C**. Perkiraan waktu ±30 menit.

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

Satu-satunya proses yang **sengaja menunggu server** adalah **kirim/koreksi laporan oleh kelompok** — sesuai PRD (K6), pesan sukses dan kode koreksi hanya muncul setelah server benar-benar menyimpan.

---

## E. CATATAN PENTING

- **Isian formulir** sudah mengikuti formulir lama *Laporan PJP Klp Desa SS* (53 kolom), termasuk prosentase kehadiran & materi, laporan kelas di link, laporan lainnya & kendala per jenjang, jadwal & kehadiran tahfidz, dan usulan/info. Untuk menambah isian baru, ubah dua tempat:
  1. `assets/js/schema.js` (label & aturan tampilan)
  2. `FORM_KEYS` di `Kode.gs` (tambahkan di akhir daftar)
- **Data diedit manual di Sheets** akan tampil paling lambat 5 menit kemudian (cache). Agar langsung tampil, jalankan fungsi `bersihkanCache` di editor Apps Script, atau dari menu spreadsheet **⚙️ Musyawaroh → Bersihkan cache aplikasi**.
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
| Perubahan `Kode.gs` tidak berlaku | Belum deploy **Versi baru** (lihat A4) |
