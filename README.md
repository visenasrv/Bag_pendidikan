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
  public.js         Beranda, Isi/Koreksi Laporan, Dashboard, Notulen publik
  admin.js          Login, Dashboard admin, Kelola Laporan, Notulen, Unduh PDF
  hadir.js          Daftar Hadir
  musyawaroh.js     Mode Musyawaroh
  pengaturan.js     Kelompok & Dapuan, Logo, Akun, Tempat, Tampilan
  notulen.js        tampilan & editor notulen
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
| `#/admin` | Admin (login) |

Panduan pemasangan lengkap: **PANDUAN-INSTALASI.md**.
