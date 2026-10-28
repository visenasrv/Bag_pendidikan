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
        { k: 'Muslimus_Ket', label: 'Keterangan Muslimus', type: 'textarea', show: d => d.Muslimus === 'Belum', panel: 'mus', ph: 'Contoh: Rencana muslimus tanggal 20, menunggu jadwal pengurus' },
        { k: 'PJP_Link', label: 'Laporan PJP di Link', type: 'seg', options: ['Sudah', 'Belum'], req: true },
      ],
    },
    jenjang('caberawit', 'b', 'Caberawit', 'Cbr', 'usia PAUD – SD', 'Jml_Caberawit'),
    jenjang('praremaja', 'c', 'Praremaja', 'Prm', 'usia SMP', 'Jml_Praremaja'),
    jenjang('remaja', 'd', 'Remaja', 'Rmj', 'usia SMA/SMK', 'Jml_Remaja'),
    {
      id: 'pranikah', huruf: 'e', judul: 'Pranikah', pendek: 'Pranikah',
      sub: 'Data jenjang Pranikah (mandiri & usia nikah) bulan ini',
      fields: [
        { k: 'Jml_Pranikah', label: 'Jumlah Pranikah', type: 'num', suffix: 'Orang', req: true, big: true },
        { k: 'Pnk_Sambung1', label: 'Keterangan Sambung 1', type: 'textarea', rows: 2, req: true, ph: 'Contoh: Ikut sambung kelompok & pengajian muda-mudi' },
        { k: 'Pnk_Hadir1', label: 'Prosentase Sambung 1', type: 'num', suffix: '%', req: true, max: 100 },
        { k: 'Pnk_Sambung2', label: 'Keterangan Sambung 2', type: 'textarea', rows: 2, ph: 'Opsional' },
        { k: 'Pnk_Hadir2', label: 'Prosentase Sambung 2', type: 'num', suffix: '%', max: 100, help: 'Opsional' },
        { k: 'Pnk_Link', label: 'Laporan Kelas Pranikah di Link', type: 'seg', options: ['Sudah', 'Belum'], req: true },
        { k: 'Pnk_Lainnya', label: 'Laporan Lainnya', type: 'textarea', rows: 2, ph: 'Opsional' },
        { k: 'Pnk_Kendala', label: 'Kendala', type: 'textarea', rows: 2, ph: 'Opsional' },
      ],
    },
    {
      id: 'mudamudi', huruf: 'f', judul: 'Muda-Mudi', pendek: 'Muda-Mudi',
      sub: 'Kegiatan muda-mudi per minggu bulan ini',
      fields: [
        { k: 'Jml_MudaMudi', label: 'Jumlah Muda-Mudi', type: 'num', suffix: 'Orang', req: true, big: true,
          // v1.7: rekomendasi = Praremaja + Remaja + Pranikah (dari isian bagian sebelumnya)
          rekom: d => { const n = k => App.num(d[k]); const v = n('Jml_Praremaja') + n('Jml_Remaja') + n('Jml_Pranikah'); return { v: v, teks: 'Praremaja ' + n('Jml_Praremaja') + ' + Remaja ' + n('Jml_Remaja') + ' + Pranikah ' + n('Jml_Pranikah') }; } },
        { k: 'MM_Minggu1', label: 'Minggu 1', type: 'text', req: true, ph: 'Kegiatan minggu pertama (tulis "Tidak ada" bila kosong)' },
        { k: 'MM_Minggu2', label: 'Minggu 2', type: 'text', req: true, ph: 'Kegiatan minggu kedua (tulis "Tidak ada" bila kosong)' },
        { k: 'MM_Minggu3', label: 'Minggu 3', type: 'text', req: true, ph: 'Kegiatan minggu ketiga (tulis "Tidak ada" bila kosong)' },
        { k: 'MM_Minggu4', label: 'Minggu 4', type: 'text', req: true, ph: 'Kegiatan minggu keempat (tulis "Tidak ada" bila kosong)' },
        { k: 'MM_Lainnya', label: 'Lainnya', type: 'text', ph: 'Opsional' },
        { k: 'MM_Hadir', label: 'Prosentase Kehadiran', type: 'num', suffix: '%', req: true, max: 100 },
        { k: 'MM_Link', label: 'Laporan Kelas Muda-Mudi di Link', type: 'seg', options: ['Sudah', 'Belum'], req: true },
        { k: 'MM_LapLainnya', label: 'Laporan Lainnya', type: 'textarea', rows: 2, ph: 'Opsional' },
        { k: 'MM_Kendala', label: 'Kendala', type: 'textarea', rows: 2, ph: 'Opsional' },
      ],
    },
    {
      id: 'tahfidz', huruf: 'g', judul: 'Kelas Tahfidz', pendek: 'Tahfidz',
      sub: 'Keberadaan kelas tahfidz di kelompok',
      fields: [
        { k: 'Tahfidz_Ada', label: 'Ada Kelas Tahfidz?', type: 'seg', options: ['Ada', 'Tidak'], req: true },
        { k: 'Tahfidz_Jml', label: 'Jumlah Peserta Tahfidz', type: 'num', suffix: 'Orang', req: true, show: d => d.Tahfidz_Ada === 'Ada', panel: 'thf' },
        { k: 'Tahfidz_Jadwal', label: 'Jadwal Kegiatan Tahfidz', type: 'text', ph: 'Contoh: 3 kali seminggu', show: d => d.Tahfidz_Ada === 'Ada', panel: 'thf' },
        { k: 'Tahfidz_Hadir', label: 'Prosentase Kehadiran Tahfidz', type: 'num', suffix: '%', req: true, max: 100, show: d => d.Tahfidz_Ada === 'Ada', panel: 'thf' },
        { k: 'Tahfidz_Ket', label: 'Keterangan Tidak Ada Tahfidz', type: 'textarea', show: d => d.Tahfidz_Ada === 'Tidak', panel: 'thf', ph: 'Opsional — mis. alasan belum ada kelas' },
      ],
    },
    {
      id: 'mondok', huruf: 'h', judul: 'Generus Mondok & Tugas', pendek: 'Mondok',
      sub: 'Isi 0 jika tidak ada',
      fields: [
        { k: 'Generus_Sedang_Mondok', label: 'Generus Sedang Mondok', type: 'num', suffix: 'Orang', req: true, help: 'Generus yang saat ini sedang di pondok' },
        { k: 'Generus_Sudah_Mondok', label: 'Generus Sudah Jadi Mubaligh/Mubalighot', type: 'num', suffix: 'Orang', req: true, help: 'Generus yang sudah selesai mondok' },
      ],
    },
    {
      id: 'lainnya', huruf: 'i', judul: 'Usulan / Info', pendek: 'Usulan',
      sub: 'Usulan, informasi, atau hal yang perlu dibahas di musyawaroh',
      fields: [
        { k: 'Catatan_Lainnya', label: 'Usulan / Info', type: 'textarea', ph: 'Opsional', rows: 5 },
      ],
    },
  ];

  /** Bagian jenjang Caberawit/Praremaja/Remaja (struktur sama seperti formulir lama) */
  function jenjang(id, huruf, nama, p, usia, jml) {
    return {
      id: id, huruf: huruf, judul: nama, pendek: nama,
      sub: 'Data jenjang ' + nama + ' (' + usia + ') bulan ini',
      fields: [
        { k: jml, label: 'Jumlah ' + nama, type: 'num', suffix: 'Orang', req: true, big: true, help: 'Total seluruh generus ' + nama + ' binaan aktif' },
        { k: p + '_HariEfektif', label: 'Jumlah Hari Efektif', type: 'num', suffix: 'Hari', req: true, max: 31 },
        { k: p + '_Hadir', label: 'Prosentase Kehadiran', type: 'num', suffix: '%', req: true, max: 100, half: true },
        { k: p + '_Materi', label: 'Materi Tersampaikan', type: 'num', suffix: '%', req: true, max: 100, half: true },
        { k: p + '_Link', label: 'Laporan Kelas ' + nama + ' di Link', type: 'seg', options: ['Sudah', 'Belum'], req: true },
        { k: p + '_Lainnya', label: 'Laporan Lainnya', type: 'textarea', rows: 2, ph: 'Opsional — mis. kegiatan khusus bulan ini' },
        { k: p + '_Kendala', label: 'Kendala', type: 'textarea', rows: 2, ph: 'Opsional' },
      ],
    };
  }

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

/* Label butir tanggapan musyawaroh (v1.3): 'Cbr_Kendala' → 'Caberawit · Kendala' */
(function () {
  'use strict';
  const App = window.App;
  App.tanggapanLabel = function (bidang) {
    if (bidang === '_umum') return 'Catatan Musyawaroh';
    for (const s of App.FORM) {
      const f = s.fields.find(x => x.k === bidang);
      if (f) return f.k === 'Catatan_Lainnya' ? 'Usulan / Info' : s.judul + ' · ' + f.label;
    }
    return bidang;
  };
  /** Daftar tanggapan satu laporan, urut sesuai formulir (catatan umum di akhir) */
  App.tanggapanList = function (lapId) {
    const map = App.B ? App.B.tanggapan(lapId) : {};
    const urut = App.FORM_KEYS.concat(['_umum']);
    return Object.keys(map).map(k => map[k]).filter(t => t.isi).sort((a, b) => urut.indexOf(a.bidang) - urut.indexOf(b.bidang));
  };
})();
