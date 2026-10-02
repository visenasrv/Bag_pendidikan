/* ==========================================================================
   schema.js — struktur formulir laporan bulanan (PRD 5.2)
   Satu sumber kebenaran untuk: formulir, pratinjau, rincian admin, PDF,
   dan Mode Musyawaroh. Kunci `k` = nama kolom di tab Laporan.
   Untuk menambah isian: tambahkan di sini DAN di FORM_KEYS pada Kode.gs.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const ya = d => d.Muslimus === 'Ya';

  App.FORM = [
    {
      id: 'umum', huruf: 'a', judul: 'Informasi Umum', pendek: 'Umum',
      sub: 'Identitas kelompok & periode pelaporan bulanan',
      fields: [
        { k: 'KelompokID', label: 'Kelompok', type: 'kelompok', req: true },
        { k: 'Bulan', label: 'Bulan', type: 'bulan', req: true, half: true },
        { k: 'Tahun', label: 'Tahun', type: 'tahun', req: true, half: true },
        { type: 'info', text: 'Pilih bulan kegiatan yang sudah penuh satu bulan' },
        { type: 'cek' },
        { k: 'Muslimus', label: 'Sudah Muslimus?', type: 'seg', options: ['Ya', 'Belum'], req: true },
        { k: 'Muslimus_Tanggal', label: 'Tanggal Muslimus', type: 'date', req: true, show: ya, panel: 'mus' },
        { k: 'Muslimus_Ket', label: 'Keterangan Muslimus', type: 'textarea', show: ya, panel: 'mus', ph: 'Contoh: Diadakan di Masjid Arrosyid, dihadiri 18 pengurus' },
        {
          k: 'PJP_Link', label: 'Laporan PJP di Link', type: 'radio', req: true, options: [
            { v: 'Sudah Diisi Lengkap', sub: 'Melalui tautan resmi pelaporan PJP Desa' },
            { v: 'Belum / Kendala Teknis', sub: 'Akan disusulkan sebelum sidang musyawaroh' },
          ],
        },
      ],
    },
    {
      id: 'caberawit', huruf: 'b', judul: 'Caberawit', pendek: 'Caberawit',
      sub: 'Data jenjang Caberawit (usia PAUD – SD) bulan ini',
      fields: [
        { k: 'Jml_Caberawit', label: 'Jumlah Caberawit', type: 'num', suffix: 'Orang', req: true, big: true, help: 'Total seluruh santri Caberawit binaan aktif' },
        { k: 'Cbr_HariEfektif', label: 'Hari Efektif KBM', type: 'num', suffix: 'Hari', req: true, max: 31 },
        { k: 'Cbr_Catatan', label: 'Catatan / Kegiatan Khusus Caberawit', type: 'textarea', ph: 'Contoh: Ada festival anak sholeh, pembagian rapot…' },
      ],
    },
    {
      id: 'praremaja', huruf: 'c', judul: 'Praremaja', pendek: 'Praremaja',
      sub: 'Data jenjang Praremaja (usia SMP) bulan ini',
      fields: [
        { k: 'Jml_Praremaja', label: 'Jumlah Praremaja', type: 'num', suffix: 'Orang', req: true, big: true },
        { k: 'Prm_HariEfektif', label: 'Hari Efektif KBM', type: 'num', suffix: 'Hari', req: true, max: 31 },
        { k: 'Prm_Catatan', label: 'Catatan / Kegiatan Khusus Praremaja', type: 'textarea', ph: 'Contoh: Pengajian rutin berjalan tertib…' },
      ],
    },
    {
      id: 'remaja', huruf: 'd', judul: 'Remaja', pendek: 'Remaja',
      sub: 'Data jenjang Remaja (usia SMA/SMK) bulan ini',
      fields: [
        { k: 'Jml_Remaja', label: 'Jumlah Remaja', type: 'num', suffix: 'Orang', req: true, big: true },
        { k: 'Rmj_HariEfektif', label: 'Hari Efektif KBM', type: 'num', suffix: 'Hari', req: true, max: 31 },
        { k: 'Rmj_Catatan', label: 'Catatan / Kegiatan Khusus Remaja', type: 'textarea', ph: 'Contoh: Kegiatan keakraban aktif…' },
      ],
    },
    {
      id: 'pranikah', huruf: 'e', judul: 'Pranikah', pendek: 'Pranikah',
      sub: 'Data jenjang Pranikah (mandiri & usia nikah) bulan ini',
      fields: [
        { k: 'Jml_Pranikah', label: 'Jumlah Pranikah', type: 'num', suffix: 'Orang', req: true, big: true },
        { k: 'Pnk_Sambung1', label: 'Sambung Pranikah — Kegiatan 1', type: 'textarea', ph: 'Contoh: Sambung & keputrian, hadir penuh' },
        { k: 'Pnk_Sambung2', label: 'Sambung Pranikah — Kegiatan 2', type: 'textarea', ph: 'Opsional' },
        { k: 'Pnk_Hadir1', label: 'Prosentase Kehadiran 1', type: 'num', suffix: '%', req: true, max: 100, half: true },
        { k: 'Pnk_Hadir2', label: 'Prosentase Kehadiran 2', type: 'num', suffix: '%', max: 100, half: true, help: 'Opsional' },
      ],
    },
    {
      id: 'mudamudi', huruf: 'f', judul: 'Muda-Mudi', pendek: 'Muda-Mudi',
      sub: 'Kegiatan mandiri muda-mudi per minggu',
      fields: [
        { k: 'MM_Minggu1', label: 'Minggu 1', type: 'text', ph: 'Kegiatan minggu pertama' },
        { k: 'MM_Minggu2', label: 'Minggu 2', type: 'text', ph: 'Kegiatan minggu kedua' },
        { k: 'MM_Minggu3', label: 'Minggu 3', type: 'text', ph: 'Kegiatan minggu ketiga' },
        { k: 'MM_Minggu4', label: 'Minggu 4', type: 'text', ph: 'Kegiatan minggu keempat' },
        { k: 'MM_Lainnya', label: 'Kegiatan Lainnya', type: 'textarea', ph: 'Opsional' },
        { k: 'MM_Peserta', label: 'Jumlah Peserta', type: 'num', suffix: 'Orang' },
      ],
    },
    {
      id: 'tahfidz', huruf: 'g', judul: 'Kelas Tahfidz', pendek: 'Tahfidz',
      sub: 'Keberadaan kelas tahfidz di kelompok',
      fields: [
        { k: 'Tahfidz_Ada', label: 'Ada Kelas Tahfidz?', type: 'seg', options: ['Ada', 'Tidak'], req: true },
        { k: 'Tahfidz_Jml', label: 'Jumlah Peserta Tahfidz', type: 'num', suffix: 'Orang', req: true, show: d => d.Tahfidz_Ada === 'Ada', panel: 'thf' },
        { k: 'Tahfidz_Ket', label: 'Keterangan', type: 'textarea', show: d => d.Tahfidz_Ada === 'Tidak', panel: 'thf', ph: 'Opsional — mis. alasan belum ada kelas' },
      ],
    },
    {
      id: 'mondok', huruf: 'h', judul: 'Generus Mondok & Tugas', pendek: 'Mondok',
      sub: 'Isi 0 jika tidak ada',
      fields: [
        { k: 'Generus_Sudah_Mondok', label: 'Sudah mondok (Mubaligh/Mubalighot)', type: 'num', suffix: 'Orang', req: true, help: 'Generus yang sudah selesai mondok' },
        { k: 'Generus_Sedang_Mondok', label: 'Sedang mondok', type: 'num', suffix: 'Orang', req: true, help: 'Generus yang saat ini sedang di pondok' },
      ],
    },
    {
      id: 'lainnya', huruf: 'i', judul: 'Lainnya', pendek: 'Lainnya',
      sub: 'Catatan & kendala kelompok',
      fields: [
        { k: 'Catatan_Lainnya', label: 'Catatan / Kendala', type: 'textarea', ph: 'Tulis catatan, kendala, atau usulan untuk dibahas di musyawaroh (opsional)', rows: 5 },
      ],
    },
  ];

  App.FORM_KEYS = [];
  App.FORM.forEach(s => s.fields.forEach(f => { if (f.k && ['KelompokID', 'Bulan', 'Tahun'].indexOf(f.k) < 0) App.FORM_KEYS.push(f.k); }));

  /** Nilai siap tampil (pratinjau, rincian, PDF) */
  App.fmtField = function (f, v, data) {
    if (f.k === 'KelompokID') {
      const k = (App.B && App.B.kelompokById(v)) || ((App.formKelompok || []).find(x => x.id === v));
      return k ? k.nama : (data && data.NamaKelompok) || '—';
    }
    if (f.k === 'Bulan') return App.BULAN[(+v) - 1] || '—';
    if (v === '' || v === null || v === undefined) return '';
    if (f.type === 'date') return App.fmtTanggal(v);
    if (f.type === 'num') return App.fmtNum(v) + (f.suffix ? (f.suffix === '%' ? '%' : ' ' + f.suffix) : '');
    return String(v);
  };

  /** Bagian & isian yang tampil untuk data tertentu */
  App.visibleFields = function (sec, data) {
    return sec.fields.filter(f => f.k && (!f.show || f.show(data)));
  };

  /** Validasi satu bagian → {k: pesan} */
  App.validateSection = function (sec, data) {
    const err = {};
    App.visibleFields(sec, data).forEach(f => {
      const v = data[f.k];
      const kosong = v === '' || v === null || v === undefined;
      if (f.req && kosong) { err[f.k] = 'Wajib diisi (tidak boleh kosong)'; return; }
      if (!kosong && f.type === 'num') {
        const n = Number(v);
        if (isNaN(n) || n < 0) err[f.k] = 'Harus berupa angka 0 atau lebih';
        else if (f.max && n > f.max) err[f.k] = 'Maksimal ' + f.max + (f.suffix === '%' ? '%' : '');
      }
    });
    return err;
  };
})();
