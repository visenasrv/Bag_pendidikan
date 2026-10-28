# Musyawaroh & Pelaporan Bagian Pendidikan

Aplikasi web terpadu Bagian Pendidikan Desa Sangatta Selatan (PPG Kutai Timur):
laporan bulanan kelompok, koreksi dengan kode, dashboard rekap generus, notulen,
daftar hadir, Mode Musyawaroh layar penuh, dan unduh PDF.

- **Frontend:** HTML/CSS/JavaScript murni (SPA, rute hash) — di-host di GitHub Pages
- **Backend:** Google Apps Script sebagai REST/JSON API (`Kode.gs`, tidak ada di repo ini)
- **Database:** satu Google Spreadsheet multi-tab

## Struktur

```
index.html          kerangka halaman
config.js           ← URL Web App Apps Script (API_URL)
assets/css/style.css
assets/js/
  core.js           utilitas, API, cache, router, Store admin (optimistic + antrean)
  schema.js         struktur formulir laporan (9 bagian)
  form.js           mesin formulir bertahap + draf otomatis
  dash.js           dashboard bersama (umum & admin): status, statistik, grafik, filter kelompok
  public.js         Beranda, Isi/Koreksi Laporan, Dashboard, Notulen publik
  admin.js          Login, Dashboard admin, Kelola Laporan, Notulen, Unduh PDF   ┐ modul admin —
  hadir.js          Daftar Hadir                                                │ diunduh otomatis
  musyawaroh.js     Mode Musyawaroh + tanggapan                                 │ saat #/admin
  pengaturan.js     Kelompok & Dapuan, Logo, Akun, Tempat, Tampilan             ┘ dibuka
  notulen.js        tampilan & editor notulen gaya Google Dokumen
  monitoring.js     Dashboard Monitoring & Bimbingan Akhlaq (umum & admin)
  pdf.js            PDF (jsPDF)
  app.js            titik mulai
```

## Rute

| Rute | Halaman |
| --- | --- |
| `#/` | Beranda |
| `#/lapor` | Isi Laporan |
| `#/koreksi` | Koreksi Laporan |
| `#/dashboard` | Dashboard ringkasan |
| `#/notulen` | Notulen |
| `#/monitoring` | Dashboard Monitoring & Bimbingan Akhlaq |
| `#/admin` | Admin (login) |

Panduan pemasangan & update: **PANDUAN-INSTALASI.md**. Versi: **1.7.0** (Kegiatan sambung di kartu Pranikah mode musyawaroh, peringatan bulan terlewat, tetap masuk admin, rekomendasi muda-mudi, ikon tema matahari/bulan, grafik persentase kehadiran; Lap. Evaluasi Power BI; Daftar hadir: PDF sendiri/gabungan, ubah & hapus riwayat, sinkron nama manual, persentase per kelompok & keseluruhan; aplikasi bisa diinstal (PWA); dashboard: % kehadiran per jenjang, % materi, kelas tahfidz, kegiatan muda-mudi; monitoring: sebaran umur per jawaban; Monitoring: hanya isian terakhir per anak per bulan dihitung, rincian Laporan/Anak per kelompok; data rinci umum & admin, unduh PDF / teks WA, layar penuh admin; Dashboard Monitoring & Bimbingan Akhlaq, warna utama & banner, beranda gaya menu HP, kartu jenjang berbalik; Mode Musyawaroh bisa diperkecil & catat notulen dari layar penuh; tanggapan musyawaroh, editor notulen gaya dokumen, kop PDF bertanggal, dashboard umum lengkap, urutan kelompok seret-lepas).
