# PANDUAN INSTALASI — Musyawaroh & Pelaporan Bagian Pendidikan

Aplikasi ini terdiri dari dua bagian:

| Bagian | Berkas | Tempat |
| --- | --- | --- |
| **Backend** (server & database) | `Kode.gs` | Google Apps Script, menempel di Google Spreadsheet |
| **Frontend** (tampilan) | isi `musyawaroh-pelaporan.zip` (pasang baru) atau `musyawaroh-pelaporan-update-v1.7.0.zip` (update) | GitHub Pages |

Kerjakan berurutan: **Bagian A → B → C**. Perkiraan waktu ±30 menit.

> **Sudah memakai aplikasi ini sebelumnya?** Langsung ke **Bagian U — Update ke v1.7.0** di bawah. Tidak perlu memasang ulang dari awal, dan data tidak berubah.

---

## U. UPDATE KE v1.7.0 (untuk aplikasi yang sudah berjalan)

v1.7.0 mengubah **backend dan frontend**. Kerjakan **U1** (`Kode.gs` v1.7.0) dan **U2** (`musyawaroh-pelaporan-update-v1.7.0.zip`). Langkah ini sudah mencakup semua isi versi sebelumnya.

**Yang baru di v1.7.0**
1. **Peringatan bulan terlewat** di Form Laporan: bila pelapor memilih bulan padahal bulan sebelumnya belum dilaporkan (mis. memilih Oktober, laporan September belum ada), muncul peringatan dengan pilihan **"Iya, tetap Oktober"** atau **"Tidak, isi September"**. Pilihan "Tidak" langsung mengganti bulan ke bulan pertama yang terlewat. Catatan bulan terlewat tetap tampil di bawah pilihan bulan. Kelompok yang belum pernah melapor tidak diperingatkan.
2. **Tetap masuk (admin)**: di halaman Masuk Admin ada centang **"Tetap masuk di perangkat ini"** — otomatis tercentang bila dibuka dari aplikasi yang terinstal. Sesi berlaku 60 hari dan diperpanjang otomatis setiap admin membuka aplikasi, jadi tidak perlu login ulang. Keluar lewat tombol **Keluar**. Mengganti password tetap mengeluarkan semua perangkat.
3. **Rekomendasi jumlah Muda-Mudi** di form: = Praremaja + Remaja + Pranikah yang sudah diisi, dengan tombol **"Pakai angka ini"** (angka tetap bisa diubah).
4. **Ikon tema**: mode terang menampilkan **matahari**, mode gelap menampilkan **bulan**.
5. **Dashboard (umum & admin)**:
   - grafik baru **Perkembangan Persentase Kehadiran {tahun}** (Jan–Des, per jenjang: Caberawit, Praremaja, Remaja, Pranikah, Muda-Mudi, Tahfidz);
   - rata-rata kehadiran per jenjang & materi tersampaikan kini berupa **baris angka "Rata-rata"** langsung di bawah tabel **Kehadiran & Materi per Kelompok** (kartu bar sebelumnya dihapus).
6. **Mode Musyawaroh**: kartu **Pranikah** kini menampilkan juga isian **kegiatan Sambung 1 & 2** beserta persentasenya (depan = bulan ini, belakang = bulan lalu).

### U1. Backend
1. Ganti seluruh isi `Kode.gs` dengan **v1.7.0** → **Ctrl + S**.
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**

### U2. Frontend
1. Salin isi **`musyawaroh-pelaporan-update-v1.7.0.zip`** ke folder repo Anda (tanpa `config.js`) dan pilih **Ganti file**.
2. `git add .` → `git commit -m "Update v1.7.0"` → `git push`, tunggu 1–2 menit. HP yang sudah memasang aplikasi akan menampilkan **Versi baru tersedia → Muat ulang**.

### Cara memasang aplikasi (bagikan ke pengguna)
Alamat: **https://visenasrv.github.io/Bag_pendidikan**
- **Android**: buka di **Chrome** (bukan dari dalam WhatsApp) → **Instal aplikasi** di beranda, atau menu **⋮ → Instal aplikasi / Tambahkan ke layar utama**.
- **iPhone / iPad**: buka di **Safari** → **Bagikan** → **Tambahkan ke Layar Utama** → **Tambah**.
- **Laptop (Chrome/Edge)**: ikon **Instal** di ujung kanan bilah alamat, atau tombol **Instal aplikasi** di beranda / menu admin.

---

## Riwayat update sebelumnya

### v1.6.1 – v1.6.5
**v1.6.5 — menu Lap. Evaluasi** (backend & frontend): menu baru **Lap. Evaluasi** untuk umum (ikon di beranda) dan admin (menu samping) yang menampilkan laporan **Power BI** PPG Kutai Timur di dalam aplikasi, lengkap dengan tombol **Layar penuh** dan **Buka di tab baru**. Laporan ditempel apa adanya — berisi data **semua desa**; pilih Desa / Kelompok Sangatta Selatan lewat filter di dalam laporan (Power BI "Publish to web" tidak bisa disaring otomatis dari luar). Tautannya bisa diganti di **Pengaturan → Lap. Evaluasi** (boleh menempel tautan `view?r=…` atau seluruh kode `<iframe>`); kosong = tautan bawaan. Ganti `Kode.gs` (U1) agar pengaturan tautan tersimpan; tanpa itu menu tetap jalan memakai tautan bawaan.

**v1.6.1–v1.6.4** (hanya frontend) — PDF daftar hadir: status **Belum konfirmasi** dicetak **"-"**; tanggal & tempat di bawah judul serta catatan cara hitung persentase dihapus; ditambah kolom **tanda tangan** (kiri: *Mengetahui, Ki Desa* · kanan: *Bagian Pendidikan Desa*) yang **namanya terisi otomatis** (baris paling atas):
 - **Ki Desa** = peserta berdapuan *KI Desa*.
 - **Bagian Pendidikan Desa** = urutan pencarian: (1) dapuan yang memuat kata **Pendidikan** di kelompok bernama **…Perwakilan…**; (2) dapuan *Bagian Pendidikan Desa* di kelompok mana saja; (3) dapuan memuat *Pendidikan* dan *Desa*; (4) dapuan memuat *Pendidikan* di kelompok bernama **…Desa…**. Dapuan Wakil/Sekretaris/Bendahara/Pembina dilewati; *Bag.* = *Bagian*.
 - Dicari dulu di daftar hadir sesi itu, lalu di daftar peserta saat ini. Bila tetap tidak ada, dicetak garis titik-titik untuk diisi tangan.

(Semua perubahan ini sudah termasuk dalam update v1.7.0.)


### v1.6.0

v1.6.0 mengubah **backend dan frontend**. Kerjakan langkah U1–U3 di bawah dengan `Kode.gs` v1.6.0 dan `musyawaroh-pelaporan-update-v1.6.0.zip`. Langkah ini sudah mencakup semua isi versi sebelumnya. Tab **Peserta** otomatis mendapat kolom baru **Sinkron**; data lama tidak berubah.

**Yang baru di v1.6.0**
1. **Daftar hadir**
   - **Unduh PDF daftar hadir** sendiri: dari **Riwayat Sesi** (tombol PDF) atau **Unduh PDF → Daftar Hadir Musyawaroh**. Isinya per kelompok: No, Dapuan, Nama, Status, Keterangan (kosong dicetak "-"), plus persentase.
   - **Digabung** dengan laporan & notulen: **Unduh PDF → Gabungan Laporan + Notulen** kini punya pilihan **Daftar hadir yang disertakan**; daftar hadir dicetak di **lembar terakhir**.
   - **Riwayat sesi bisa diubah** (tanggal, tempat, Hadir/Izin, keterangan) dan **dihapus**.
   - **Sinkron Nama** (tombol di halaman Daftar Hadir): admin bisa menyatakan dua nama berbeda adalah orang yang sama (mis. "Pak Fauzi" di Kampung Tengah = "Ahmad Fauzi" di Arrosyid). Nama yang ditulis **persis sama** tetap tersinkron otomatis. Orang yang tersinkron statusnya ikut berubah bersama dan **dihitung 1 orang**. Ada juga saran nama mirip dan tombol lepas sinkron.
   - **Persentase kehadiran per kelompok** (peserta hadir ÷ peserta terdaftar di kelompok itu) di kepala tiap kelompok, dan **persentase keseluruhan** (orang tersinkron dihitung 1) di bar bawah, riwayat, dan PDF.
2. **Aplikasi bisa diinstal** di HP & laptop dengan ikon PPG · Desa · SS (lihat **Cara memasang aplikasi** di bawah). Terbuka lebih cepat, tetap tampil saat sinyal hilang, dan ikut ter-update otomatis (muncul tulisan **Versi baru tersedia → Muat ulang**).
3. **Dashboard (umum & admin)**:
   - **Persentase kehadiran per jenjang**: Caberawit, Praremaja, Remaja, Pranikah (rata-rata sambung 1 & 2), Muda-Mudi, Tahfidz.
   - **Materi tersampaikan**: Caberawit, Praremaja, Remaja.
   - Angka gabungan semua kelompok = rata-rata **ditimbang jumlah peserta** jenjangnya. Warna: hijau ≥ 80%, kuning 60–79%, merah < 60%.
   - Tabel **Kehadiran & Materi per Kelompok**.
   - **Kelas Tahfidz**: kelompok yang punya kelas tahfidz, jumlah peserta, jadwal, dan % kehadiran.
   - **Kegiatan Muda-Mudi**: kegiatan Minggu 1–4 (+ lainnya) per kelompok, jumlah & % kehadiran.
4. **Monitoring Akhlaq → Persentase Jawaban per Pertanyaan**: tulisan lebih besar; arahkan kursor (atau ketuk di HP) pada bagian grafik / jawaban untuk melihat **sebaran umur** anak yang memilih jawaban itu.

#### Backend
1. Ganti seluruh isi `Kode.gs` dengan **v1.6.0** → **Ctrl + S**.
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**

#### Frontend
1. Salin isi **`musyawaroh-pelaporan-update-v1.6.5.zip`** ke folder repo Anda (tanpa `config.js`) dan pilih **Ganti file**. File baru: `manifest.webmanifest`, `sw.js`, `pwa.js`, `offline.html`, dan folder `icons/`.
2. `git add .` → `git commit -m "Update v1.6.0"` → `git push`, tunggu 1–2 menit, lalu **Ctrl + Shift + R**.

#### Update berikutnya (penting sejak aplikasi bisa diinstal)
Aplikasi yang sudah terinstal menyimpan tampilan di HP. Setiap kali file frontend diubah, **naikkan angka versi** di `sw.js` (`const VERSION = 'ppgss-v1.6.0'`) dan semua `?v=1.6.0` di `index.html` & `sw.js` — ZIP update dari saya selalu sudah melakukannya. Tanpa itu, HP pengguna tetap memakai tampilan lama.

#### Cara memasang aplikasi
Alamat: **https://visenasrv.github.io/Bag_pendidikan**
- **Android**: buka alamat di **Chrome** (bukan dari dalam WhatsApp — ketuk ⋮ → *Buka di Chrome*). Ketuk **Instal aplikasi** di beranda, atau menu **⋮ → Instal aplikasi / Tambahkan ke layar utama**.
- **iPhone / iPad**: buka di **Safari** → tombol **Bagikan** (kotak panah ke atas) → **Tambahkan ke Layar Utama** → **Tambah**. Admin perlu masuk sekali lagi di aplikasi terpasang (penyimpanannya terpisah dari Safari).
- **Laptop (Chrome/Edge)**: klik ikon **Instal** di ujung kanan bilah alamat, atau tombol **Instal aplikasi** di beranda / menu admin.
- Bila muncul **Versi baru tersedia**, ketuk **Muat ulang**. Untuk menghapus: tekan lama ikonnya → **Hapus / Copot pemasangan**.

---

### v1.5.1 — Monitoring: isian terakhir per anak per bulan

v1.5.1 mengubah **backend dan frontend**. Kerjakan dengan `Kode.gs` v1.5.1 dan `musyawaroh-pelaporan-update-v1.5.1.zip`. Jika Anda masih di versi lebih lama, langkah ini sudah mencakup semua isi v1.5.0 dan v1.4.0.

**Yang baru di v1.5.1 — Dashboard Monitoring Akhlaq**
1. **Hanya isian terakhir per anak per bulan yang dihitung.** Bila orang tua mengirim form lebih dari sekali untuk anak dan bulan yang sama (misalnya tombol kirim tertekan berulang), isian yang lebih lama diabaikan di semua angka: kartu ringkasan, grafik, persentase bimbingan, 21 pertanyaan, rekap per kelompok, data rinci, PDF, dan teks WA.
   - Isian **tanpa nama anak** tidak digabung, karena bisa jadi anak yang berbeda.
   - Data di spreadsheet **tidak diubah sama sekali**; penyaringan hanya terjadi saat ditampilkan.
2. **Rekap per Kelompok:** angka **Laporan** dan **Anak** bisa diklik. Muncul rincian kenapa jumlahnya berbeda:
   - alur hitungan: isian form masuk → isian dobel diabaikan → laporan dihitung → anak berbeda;
   - **Isian dobel di bulan yang sama:** nama anak, waktu tiap kiriman, **nomor baris di sheet**, pelapor, mana yang dihitung dan mana yang diabaikan;
   - **Dilaporkan di beberapa bulan:** anak yang muncul di lebih dari satu bulan (wajar bila filter mencakup beberapa bulan);
   - **Nama anak tidak diisi;**
   - **Perlu dicek: nama mirip** — misalnya "Azkha Aedil Fitrawan" dan "Azka Aedil Fitrawan". Bila sebenarnya anak yang sama, samakan penulisannya di spreadsheet agar jumlah Anak tepat.
   - Kelompok yang punya isian dobel ditandai label kuning **"n dobel"**.

#### Backend
1. Ganti seluruh isi `Kode.gs` dengan **v1.5.1** → **Ctrl + S**.
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**

Backend v1.5.1 menambahkan waktu kirim dan nomor baris sheet pada data monitoring. Tanpa backend baru, aplikasi tetap jalan tetapi memakai urutan baris sheet sebagai patokan "isian terakhir", dan nomor baris tidak tampil.

#### Frontend
1. Salin isi **`musyawaroh-pelaporan-update-v1.5.1.zip`** ke folder repo Anda (tanpa `config.js`) dan pilih **Ganti file**.
2. `git add .` → `git commit -m "Update v1.5.1"` → `git push`, tunggu 1–2 menit, lalu **Ctrl + Shift + R**.

### v1.5.0 — Monitoring: data rinci umum, PDF & teks WA, layar penuh admin

v1.5.0 mengubah **backend dan frontend**. Kerjakan dengan `Kode.gs` v1.5.0 dan `musyawaroh-pelaporan-update-v1.5.0.zip`. Jika Anda masih di v1.3.x, langkah ini sudah mencakup semua isi v1.4.0.

**Yang baru di v1.5.0**
1. **Perbaikan:** tombol **Keluar** di menu samping admin tidak lagi terpotong di layar pendek atau saat tampilan diperbesar (zoom). Daftar menu kini bisa digulir.
2. **Monitoring Akhlaq di admin** punya tombol **Layar penuh**:
   - **Perkecil** (atau Esc) menyembunyikannya, lalu muncul tombol melayang **Monitoring Akhlaq** di halaman admin mana pun. Tombol ini tetap ada setelah halaman dimuat ulang.
   - Tombol **×** menutup layar penuh sepenuhnya.
3. **Data rinci monitoring** (nama anak, umur, L/P, kategori, pelapor) sekarang tampil **sama untuk umum dan admin**.
4. **Beranda:** ikon Admin dipisah dari menu utama dan diganti **ikon gembok kecil** di pojok kanan atas.
5. **Data rinci** bisa **diunduh PDF** atau disalin sebagai **teks WhatsApp**:
   - teks WA bisa langsung disalin atau dibuka di WhatsApp;
   - keduanya mengikuti filter dan pencarian yang aktif;
   - format pesan WA diatur admin di **Pengaturan → Monitoring → Format Teks WhatsApp**.

#### Format teks WhatsApp
Bawaan:
```
Assalamu'alaikum Bpk/Ibu, berikut orang tua yang sudah mengisi monitoring {bulan} {tahun}:

{data}

Mohon amal sholih, sekiranya yang belum mengisi dapat segera mengisi. Untuk yang sudah mengisi kami syukuri, Alhamdulillah Jazakumullohu Khoiro.
```
- `{data}` diganti daftar nama per kelompok (judul kelompok dicetak tebal). Setiap baris mengikuti **Format tiap baris**, bawaannya `{no}. {anak} — ortu: {pelapor}`.
- Kode lain yang bisa dipakai: `{bulan} {tahun} {jumlah} {kelompok} {kategori}`. Untuk format baris: `{no} {anak} {pelapor} {kelompok} {kategori} {umur} {lp} {bulan} {tahun}`.
- Satu anak hanya ditulis sekali walaupun mengisi beberapa bulan. **Pilih satu bulan di filter** agar pesannya tepat.

#### Backend
1. Ganti seluruh isi `Kode.gs` dengan **v1.5.0** → **Ctrl + S**.
2. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**

#### Frontend
1. Salin isi **`musyawaroh-pelaporan-update-v1.5.0.zip`** ke folder repo Anda (tanpa `config.js`) dan pilih **Ganti file**.
2. `git add .` → `git commit -m "Update v1.5.0"` → `git push`, tunggu 1–2 menit, lalu **Ctrl + Shift + R**.

### v1.4.0 — Monitoring Akhlaq, warna & banner, beranda baru
v1.4.0 mengubah **backend dan frontend**. Kerjakan **U1** dengan `Kode.gs` v1.4.0, lalu **U2** dengan `musyawaroh-pelaporan-update-v1.4.0.zip`.

**Yang baru di v1.4.0**
1. **Mode Musyawaroh:** kartu Caberawit, Praremaja, Remaja, dan Pranikah bisa **diketuk lalu berbalik** untuk menampilkan data **bulan sebelumnya** (jumlah, hari efektif, kehadiran, materi). Di baliknya juga tertulis naik atau turun dibanding bulan ini. Ketuk lagi untuk kembali.
2. **Mode Musyawaroh:** baris "Laporan kelas di link" menyebut **jenjang mana yang masih Belum**.
3. **Pengaturan → Warna & Tema:** admin bisa memilih **warna utama** dari pilihan siap pakai atau warna sendiri. Warna ini berlaku untuk semua pengguna, mode terang dan gelap, grafik, dan kop PDF.
   **Pengaturan → Logo & Banner:** admin bisa memasang **banner** sebagai gambar latar di bagian atas beranda.
4. **Dashboard Monitoring & Bimbingan Akhlaq** (menu baru, untuk umum dan admin), mengikuti PRD dashboard monitoring orang tua:
   - filter kategori usia, tahun, bulan, dan kelompok;
   - kartu ringkasan, grafik tren per bulan, persentase bimbingan orang tua, dan 21 pertanyaan per kategori;
   - rekap per kelompok.

   Di v1.4.0 versi umum tidak menampilkan nama; **sejak v1.5.0 data rinci tampil untuk umum maupun admin**.
5. **Beranda baru** bergaya menu aplikasi HP: ikon dengan tulisan di bawahnya. Status laporan juga dibuat lebih ringkas.

#### Sumber data Monitoring
- Bawaan: spreadsheet `1SAsZ_9x3bc-TQP9rgdFTCpcs2n53dxST7OUO_RtK4R8`, tab pertama. Bisa diganti di **Pengaturan → Monitoring**, boleh dengan menempel tautan lengkap.
- **Akun Google pemilik Apps Script harus bisa membuka spreadsheet itu** (minimal akses Lihat). Jika spreadsheet milik akun lain, bagikan ke akun tersebut.
- Data dibaca langsung dari spreadsheet dan disimpan sementara selama 10 menit. Tombol **Muat ulang data** di dashboard admin, atau **Muat Ulang & Periksa Data** di Pengaturan, mengambil data terbaru saat itu juga.
- Aplikasi hanya **membaca** spreadsheet itu dan tidak pernah mengubahnya.

#### (v1.4.0) Backend
1. Buka spreadsheet **DB Musyawaroh & Pelaporan Bagian Pendidikan** → **Ekstensi → Apps Script**.
2. Ganti seluruh isi `Kode.gs` dengan **`Kode.gs` v1.4.0** → **Ctrl + S**.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.** (Jangan "Deployment baru".)
4. Uji sumber data: login admin → **Pengaturan → Monitoring → Muat Ulang & Periksa Data**. Bila muncul *"Spreadsheet Monitoring tidak dapat dibuka"*, bagikan spreadsheet monitoring ke akun pemilik Apps Script.

#### (v1.4.0) Frontend
1. Ekstrak **`musyawaroh-pelaporan-update-v1.4.0.zip`** (tanpa `config.js`, sehingga URL server Anda aman).
2. Salin seluruh isinya ke folder repo Anda dan pilih **Ganti file di tujuan**. Ada berkas baru: `assets/js/monitoring.js`.
3. Di PowerShell folder repo:
   ```powershell
   git add .
   git commit -m "Update v1.4.0 - monitoring akhlaq, warna & banner, beranda baru"
   git push
   ```
4. Tunggu 1–2 menit → buka aplikasi → **Ctrl + Shift + R**.

#### (v1.4.0) Cek hasil
- Kotak kuning *"Server belum diperbarui … butuh 1.4.0"* → langkah U1-3 belum dilakukan.
- Beranda menampilkan ikon menu utama. Sejak v1.5.0, Admin dibuka lewat ikon gembok kecil di pojok kanan atas.


### v1.3.1 — Mode Musyawaroh bisa diperkecil + catat notulen
**Tambahan v1.3.1 — Mode Musyawaroh**
- **Perkecil (Esc):** layar penuh disembunyikan tanpa ditutup. Muncul tombol hijau **Mode Musyawaroh** yang melayang di pojok semua halaman admin; ketuk untuk membuka lagi tepat di slide terakhir, termasuk setelah halaman dimuat ulang. Tombol **×** menutup sepenuhnya.
- **Catat Notulen (tombol N):** editor notulen terbuka di **samping laporan** yang sedang dibahas. Tombol **＋ Judul: Kelompok …** menyisipkan nama kelompok yang sedang tampil sebagai judul. Menyembunyikan panel atau memperkecil presentasi tidak menghapus tulisan, karena draf tersimpan otomatis. Draf yang sama juga bisa dilanjutkan dari menu **Notulen**.

### v1.3.0

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

#### (v1.3.0) Backend

1. Buka spreadsheet **DB Musyawaroh & Pelaporan Bagian Pendidikan** → **Ekstensi → Apps Script**.
2. Pilih seluruh isi `Kode.gs` (Ctrl + A) → hapus → tempel **seluruh isi `Kode.gs` v1.3.0** → **Ctrl + S**.
   Isian `SETUP_AWAL` dan `MIGRASI` biarkan kosong — tidak dibutuhkan untuk update.
3. **Terapkan → Kelola deployment → ✏️ Edit → Versi: *Versi baru* → Terapkan.**
   ⚠️ Jangan pilih "Deployment baru" — URL `/exec` akan berganti dan aplikasi berhenti.
4. (Opsional) Jalankan **`cekData`** — log menampilkan `Versi kode: 1.3.0`.
   Jika Anda melompat dari versi di bawah 1.2, jalankan juga **`pasangPemicu`** sekali.

#### (v1.3.0) Frontend

1. Ekstrak **`musyawaroh-pelaporan-update-v1.3.1.zip`**.
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
   git commit -m "Update v1.3.1 - mode musyawaroh bisa diperkecil + catat notulen"
   git push
   ```
4. Tunggu 1–2 menit, buka aplikasi, tekan **Ctrl + Shift + R**.

#### (v1.3.0) Cek hasil

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
