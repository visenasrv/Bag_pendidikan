/* ==========================================================================
   public.js — halaman publik (tanpa login)
   Beranda · Isi Laporan · Koreksi Laporan · Dashboard Ringkasan · Notulen
   Semua halaman tampil seketika dari cache lokal, lalu diperbarui di latar.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;

  // ── helper umum ──
  function topbar(title, sub, opt) {
    opt = opt || {};
    return '<header class="topbar"><button class="icon-btn" data-back aria-label="Kembali">' + icon('arrowL') + '</button>' +
      '<div class="title"><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + esc(sub) + '</p>' : '') + '</div>' +
      (opt.right || '') + '<button class="icon-btn" data-theme aria-label="Ganti tema">' + icon('palette') + '</button></header>';
  }
  function bindTop(root, back) {
    const b = root.querySelector('[data-back]');
    if (b) b.onclick = back || (() => App.go('/'));
    root.querySelectorAll('[data-theme]').forEach(t => { t.onclick = () => App.theme.cycle(); });
  }
  function errorCard(e, retry) {
    return '<div class="card" style="margin-top:16px"><div class="notice err">' + icon('cloudOff') + '<div class="grow"><b>Gagal memuat data</b>' + esc(e.message || e) +
      '</div></div>' + (retry ? '<button class="btn btn-outline btn-block" style="margin-top:12px" data-retry>' + icon('refresh') + ' Coba Lagi</button>' : '') + '</div>';
  }
  function statusRows(status) {
    if (!status.length) return '<div class="empty">Belum ada kelompok wajib lapor.</div>';
    return '<div class="list">' + status.map(s => s.sudah
      ? '<div class="list-row done"><span class="ico-circle">' + icon('checkCircle') + '</span><div class="grow"><div class="t">' + esc(s.nama) + '</div><div class="s">Dikirim ' + esc(App.fmtWaktu(s.waktuKirim, { noYear: true })) + '</div></div><span class="badge ok">' + icon('check', 'sm') + ' Sudah</span></div>'
      : '<div class="list-row pending"><span class="ico-circle">' + icon('clock') + '</span><div class="grow"><div class="t">' + esc(s.nama) + '</div><div class="s">Menunggu pengiriman</div></div><span class="badge warn">' + icon('clock', 'sm') + ' Belum</span></div>'
    ).join('') + '</div>';
  }
  function heroTotal(b, opt) {
    const r = b.rekap;
    return '<div class="stat-hero"><div class="row between"><div class="lbl">Total Generus</div>' + (opt && opt.tag ? '<span class="badge deep">' + esc(opt.tag) + '</span>' : '') + '</div>' +
      '<div class="sub">dari ' + b.jumlahLapor + '/' + b.jumlahWajib + ' kelompok yang sudah lapor</div>' +
      '<div class="val num" style="margin-top:14px">' + App.fmtNum(r.total) + '<small>Orang</small></div>' +
      '<div class="breakdown"><span>Caberawit <b>' + r.caberawit + '</b></span>·<span>Praremaja <b>' + r.praremaja + '</b></span>·<span>Remaja <b>' + r.remaja + '</b></span>·<span>Pranikah <b>' + r.pranikah + '</b></span></div></div>';
  }
  App.pub = { topbar: topbar, bindTop: bindTop, statusRows: statusRows, heroTotal: heroTotal };

  // ───────────────────────── Layar setup (API belum diatur) ─────────────────────────
  function setupScreen() {
    App.mount('<div class="setup-screen stack"><div class="ico-tile">' + icon('settings') + '</div><h1 style="font-size:22px">URL server belum diatur</h1>' +
      '<p class="muted">Buka berkas <b>config.js</b> di folder aplikasi, lalu tempel URL Web App Apps Script (berakhiran <b>/exec</b>) pada <b>API_URL</b>.</p>' +
      '<div class="code">window.APP_CONFIG = {<br>&nbsp;&nbsp;API_URL: \'https://script.google.com/macros/s/AKfy…/exec\',<br>};</div>' +
      '<p class="muted">Setelah disimpan, push ulang ke GitHub dan muat ulang halaman ini. Panduan lengkap ada di PANDUAN-INSTALASI.md.</p></div>');
  }

  // ───────────────────────── BERANDA ─────────────────────────
  App.route('/', function (p, vid) {
    if (!App.api.configured()) return setupScreen();
    const per = App.bulanLalu();
    const cfg0 = App.swrPeek('cfg') || {};
    const menu = [
      ['#/lapor', 'fileEdit', 'Isi Laporan', 'utama'], ['#/koreksi', 'fileCheck', 'Koreksi'], ['#/dashboard', 'chart', 'Dashboard'],
      ['#/monitoring', 'heart', 'Monitoring Akhlaq'], ['#/notulen', 'book', 'Notulen'],
    ];
    const root = App.mount(
      '<div class="pub">' +
      '<section class="hero ' + (App.logo.get('banner') ? 'has-banner' : '') + '" data-banner style="' + App.logo.bannerStyle() + '"><div class="pattern"></div><div class="bar">' + App.logo.html('kiri') +
      '<div class="right"><a class="icon-btn light admin-mini" href="#/admin" title="Masuk Admin" aria-label="Masuk Admin">' + icon('lock', 'sm') + '</a><button class="icon-btn light" data-theme aria-label="Ganti tema">' + icon('moon') + '</button></div></div>' +
      '<h1 data-nama>' + esc(cfg0.namaAplikasi || 'Musyawaroh & Pelaporan Bagian Pendidikan') + '</h1><p data-sub>' + esc(cfg0.subjudul || 'PPG Kutai Timur · Desa Sangatta Selatan') + '</p></section>' +
      '<nav class="app-grid" aria-label="Menu">' + menu.map(m => '<a class="app-ico ' + (m[3] || '') + '" href="' + m[0] + '"><span class="ic">' + icon(m[1]) + '</span><span class="lb">' + m[2] + '</span></a>').join('') + '</nav>' +
      '<section class="card status-mini"><div class="sm-head"><div><small>Status Laporan</small><b>' + App.periode(per.bulan, per.tahun) + '</b></div><span class="sm-count" data-count></span></div>' +
      '<div class="sm-bar"><i data-bar style="width:0%"></i></div>' +
      '<div class="sm-list" data-status><div class="skeleton" style="height:36px"></div><div class="skeleton" style="height:36px"></div><div class="skeleton" style="height:36px"></div><div class="skeleton" style="height:36px"></div></div></section>' +
      '<div data-total style="margin-top:16px"></div>' +
      '<button class="install-card" data-pwa-install hidden><img src="icons/icon-192.png" alt="" width="44" height="44"><span class="grow"><b>Instal aplikasi</b><small>Pasang di HP / laptop agar bisa dibuka langsung dari layar utama</small></span>' + icon('download') + '</button>' +
      '<div class="home-foot"><p>© ' + App.nowWita().y + ' Bagian Pendidikan Desa Sangatta Selatan</p></div>' +
      '</div>');
    bindTop(root);

    App.data.config(cfg => {
      if (!App.alive(vid)) return;
      root.querySelector('[data-nama]').textContent = cfg.namaAplikasi;
      root.querySelector('[data-sub]').textContent = cfg.subjudul;
    }).catch(() => {});

    const paint = d => {
      if (!App.alive(vid)) return;
      const b = d.bulan[per.bulan - 1];
      root.querySelector('[data-count]').innerHTML = '<b>' + b.jumlahLapor + '</b>/' + b.jumlahWajib + ' lapor';
      root.querySelector('[data-bar]').style.width = (b.jumlahWajib ? Math.round(100 * Math.min(b.jumlahLapor, b.jumlahWajib) / b.jumlahWajib) : 0) + '%';
      root.querySelector('[data-status]').innerHTML = b.status.length ? b.status.map(s =>
        '<div class="sm-item ' + (s.sudah ? 'ok' : 'wait') + '" title="' + esc(s.sudah ? 'Dikirim ' + App.fmtWaktu(s.waktuKirim, { noYear: true }) : 'Belum mengirim') + '">' +
        icon(s.sudah ? 'checkCircle' : 'clock', 'sm') + '<span>' + esc(s.nama) + '</span></div>').join('') : '<div class="empty">Belum ada kelompok wajib lapor.</div>';
      root.querySelector('[data-total]').innerHTML = heroTotal(b, { tag: 'Bulan Aktif' });
    };
    App.data.dash(per.tahun, paint).catch(e => {
      if (!App.alive(vid)) return;
      root.querySelector('[data-status]').innerHTML = errorCard(e, true);
      const r = root.querySelector('[data-retry]');
      if (r) r.onclick = () => App.render();
    });
    // Siapkan data halaman lain di latar → perpindahan halaman terasa instan
    App.idle(() => { App.data.notulen().catch(() => {}); App.data.monitoring().catch(() => {}); });
  });

  // ───────────────────────── ISI LAPORAN ─────────────────────────
  function kelompokForm(cfg) { return (cfg.kelompok || []).filter(k => k.wajib && k.aktif !== false); }

  function cekLocal(kid, b, t) {
    const d = App.swrPeek('dash_' + t);
    if (!d) return null;
    const m = d.bulan[b - 1];
    const s = m && m.status.find(x => x.id === kid);
    return s ? { ada: s.sudah, terkunci: m.terkunci, tutupBaru: m.tutupBaru } : null;
  }

  App.route('/lapor', async function (p, vid) {
    if (!App.api.configured()) return setupScreen();
    const root = App.mount('<div class="pub" data-form><div class="boot" style="min-height:60vh"><div class="spinner"></div></div></div>');
    let cfg;
    try {
      cfg = App.swrPeek('cfg') || await App.data.config();
      App.data.config().catch(() => {}); // segarkan di latar
    } catch (e) {
      root.firstElementChild.innerHTML = topbar('Form Laporan Kegiatan') + errorCard(e, true);
      bindTop(root);
      const r = root.querySelector('[data-retry]'); if (r) r.onclick = () => App.render();
      return;
    }
    if (!App.alive(vid)) return;
    App.formKelompok = kelompokForm(cfg);
    const prefill = App.ls.get('mp_prefill_lapor');
    App.ls.del('mp_prefill_lapor');
    const form = new App.LaporanForm({
      mode: 'baru', viewId: vid, container: root.firstElementChild,
      title: 'Form Laporan Kegiatan', subtitle: cfg.subjudul || 'Bagian Pendidikan Kelompok',
      kelompok: App.formKelompok, draftKey: 'mp_draft_lapor', initial: prefill || {},
      onCekLocal: cekLocal,
      onCek: (kid, b, t) => App.api.call('cekLaporan', { kelompokId: kid, bulan: b, tahun: t }),
      onKoreksi: d => { App.ls.set('mp_prefill_koreksi', { KelompokID: d.KelompokID, Bulan: d.Bulan, Tahun: d.Tahun }); App.go('/koreksi'); },
      onExit: () => App.go('/'),
      onSubmit: d => kirim(d, form, vid),
    });
    App.data.dash(App.nowWita().y).catch(() => {});
    form.start();
  });

  async function kirim(d, form, vid) {
    const ov = App.overlay('Mengirim laporan…');
    // reqId disimpan di perangkat per kelompok+periode: bila sinyal putus setelah server menyimpan,
    // "Coba Lagi" (bahkan setelah halaman dimuat ulang) mengembalikan hasil & kode koreksi yang sama.
    const kunci = d.KelompokID + '|' + d.Bulan + '|' + d.Tahun;
    let rq = App.ls.get('mp_lapor_req');
    if (!rq || rq.k !== kunci) { rq = { k: kunci, id: App.reqId() }; App.ls.set('mp_lapor_req', rq); }
    try {
      const payload = Object.assign({}, d, { appUrl: location.href.split('#')[0] });
      const res = await App.api.call('kirimLaporan', payload, { reqId: rq.id });
      ov.close();
      App.ls.del('mp_lapor_req');
      form.done = true;
      form.clearDraft();
      App.swrBust('dash_' + d.Tahun);
      if (!App.alive(vid)) return;
      const kel = App.formKelompok.find(k => k.id === d.KelompokID) || {};
      const lap = Object.assign({}, d, { NamaKelompok: res.namaKelompok || kel.nama, WaktuKirim: res.waktuKirim, ID: res.id });
      sukses(lap, res.kodeKoreksi);
    } catch (e) {
      ov.close();
      const dup = e.code === 'DUPLIKAT';
      const m = App.modal({
        title: dup ? 'Laporan sudah ada' : 'Laporan belum terkirim',
        body: '<div class="notice ' + (dup ? 'warn' : 'err') + '">' + icon(dup ? 'alert' : 'cloudOff') + '<div>' + esc(e.message) + '</div></div>' +
          (dup ? '' : '<p class="muted" style="margin-top:12px;font-size:13.5px">Isian Anda <b>tidak hilang</b> dan tetap tersimpan sebagai draf di perangkat ini.</p>'),
        foot: '<button class="btn btn-soft" data-x>Tutup</button>' + (dup
          ? '<button class="btn btn-primary" data-kor>' + icon('edit') + ' Koreksi Laporan</button>'
          : '<button class="btn btn-primary" data-retry>' + icon('refresh') + ' Coba Lagi</button>'),
      });
      const r = m.el.querySelector('[data-retry]');
      if (r) r.onclick = () => { m.close(true); kirim(d, form, vid); };
      const k = m.el.querySelector('[data-kor]');
      if (k) k.onclick = () => { m.close(true); App.ls.set('mp_prefill_koreksi', { KelompokID: d.KelompokID, Bulan: d.Bulan, Tahun: d.Tahun }); App.go('/koreksi'); };
    }
  }

  function sukses(lap, kode) {
    document.body.classList.remove('with-actionbar');
    const root = App.mount('<div class="pub">' + topbar('Laporan Terkirim', lap.NamaKelompok + ' · ' + App.periode(lap.Bulan, lap.Tahun)) +
      '<div class="success"><div class="mark">' + icon('check') + '</div>' +
      '<h2>✓ Laporan Telah Berhasil Dikirim</h2><p class="thanks">Alhamdulillah Jazakumullohu Khoiro</p>' +
      '<p class="muted" style="margin-top:6px;font-size:13.5px">' + esc(lap.NamaKelompok) + ' · ' + App.periode(lap.Bulan, lap.Tahun) + ' · ' + esc(App.fmtWaktu(lap.WaktuKirim, { wita: true })) + '</p>' +
      '<div class="kode-box"><div class="lbl">Kode Koreksi Laporan</div><div class="kode" data-kode>' + esc(kode) + '</div>' +
      '<p style="font-size:13px;color:var(--warn-fg);font-weight:600">' + icon('alert', 'sm') + ' Simpan kode ini — dibutuhkan untuk mengoreksi laporan.</p>' +
      '<div class="fields" style="margin-top:14px"><button class="btn btn-outline" data-copy>' + icon('copy') + ' Salin Kode</button><button class="btn btn-primary" data-pdf>' + icon('download') + ' Unduh Bukti PDF</button></div></div>' +
      '<div class="stack" style="margin-top:24px"><a class="btn btn-soft btn-block" href="#/dashboard">' + icon('chart') + ' Lihat Dashboard</a><a class="btn btn-ghost btn-block" href="#/">' + icon('home') + ' Kembali ke Beranda</a></div>' +
      '</div></div>');
    bindTop(root);
    root.querySelector('[data-copy]').onclick = async () => {
      const ok = await App.copy(kode);
      App.toast(ok ? 'Kode koreksi disalin.' : 'Gagal menyalin — catat kode secara manual.', ok ? 'ok' : 'warn');
    };
    root.querySelector('[data-pdf]').onclick = e => App.pdf.run(e.currentTarget, () => App.pdf.bukti(lap, kode));
    App.idle(() => App.lib('jspdf').catch(() => {}));
  }

  // ───────────────────────── KOREKSI LAPORAN ─────────────────────────
  App.route('/koreksi', async function (p, vid) {
    if (!App.api.configured()) return setupScreen();
    const pre = App.ls.get('mp_prefill_koreksi') || {};
    App.ls.del('mp_prefill_koreksi');
    const lalu = App.bulanLalu();
    const root = App.mount('<div class="pub">' + topbar('Koreksi Laporan', 'Ubah laporan dengan kode koreksi') +
      '<section class="card lg" style="margin-top:8px"><div class="row" style="margin-bottom:16px"><span class="ico-tile">' + icon('key') + '</span><div><b>Buka laporan yang sudah dikirim</b><p class="muted" style="font-size:13px">Masukkan kelompok, periode, dan kode koreksi 6 karakter.</p></div></div>' +
      '<div class="field" data-field="kel"><label>Kelompok <span class="req">*</span></label><select class="select" id="k_kel"><option value="">Memuat…</option></select></div>' +
      '<div class="fields" style="margin-top:18px"><div class="field"><label>Bulan <span class="req">*</span></label><select class="select" id="k_bulan">' + App.bulanOptions(pre.Bulan || lalu.bulan) + '</select></div>' +
      '<div class="field"><label>Tahun <span class="req">*</span></label><select class="select" id="k_tahun">' + App.tahunOptions(pre.Tahun || lalu.tahun) + '</select></div></div>' +
      '<div class="field" data-field="kode" style="margin-top:18px"><label>Kode Koreksi <span class="req">*</span></label><input class="input kode-input" id="k_kode" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="••••••"><div class="help">' + icon('info', 'sm') + 'Kode didapat saat laporan pertama kali dikirim (juga ada di bukti PDF).</div></div>' +
      '<div data-msg style="margin-top:14px"></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:18px" data-open>' + icon('unlock') + ' Buka Laporan</button></section>' +
      '<p class="muted" style="text-align:center;font-size:13px;margin-top:16px">Lupa kode? Hubungi Bagian Pendidikan Desa untuk dibuatkan kode baru.</p></div>');
    bindTop(root);
    const sel = root.querySelector('#k_kel');
    const fillKel = cfg => {
      App.formKelompok = kelompokForm(cfg);
      const cur = sel.value || pre.KelompokID || '';
      sel.innerHTML = '<option value="">Pilih kelompok</option>' + App.formKelompok.map(k => '<option value="' + esc(k.id) + '"' + (k.id === cur ? ' selected' : '') + '>' + esc(k.nama) + '</option>').join('');
    };
    App.data.config(cfg => { if (App.alive(vid)) fillKel(cfg); }).catch(e => { root.querySelector('[data-msg]').innerHTML = '<div class="notice err">' + icon('cloudOff') + '<div>' + esc(e.message) + '</div></div>'; });
    const kodeIn = root.querySelector('#k_kode');
    kodeIn.addEventListener('input', () => {
      const v = kodeIn.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (v !== kodeIn.value) kodeIn.value = v;
      kodeIn.closest('.field').classList.remove('invalid');
    });
    if (pre.KelompokID) setTimeout(() => kodeIn.focus(), 60);
    const msg = root.querySelector('[data-msg]');
    const btn = root.querySelector('[data-open]');
    const open = async () => {
      const q = { kelompokId: sel.value, bulan: +root.querySelector('#k_bulan').value, tahun: +root.querySelector('#k_tahun').value, kode: kodeIn.value.trim().toUpperCase() };
      msg.innerHTML = '';
      root.querySelectorAll('.field').forEach(f => f.classList.remove('invalid'));
      if (!q.kelompokId) { sel.closest('.field').classList.add('invalid'); sel.focus(); return; }
      if (q.kode.length !== 6) { kodeIn.closest('.field').classList.add('invalid'); msg.innerHTML = '<div class="notice err">' + icon('alertCircle') + '<div>Kode koreksi harus 6 karakter.</div></div>'; kodeIn.focus(); return; }
      App.busy(btn, true);
      try {
        const lap = await App.api.call('bukaKoreksi', q, { post: true });
        if (!App.alive(vid)) return;
        bukaFormKoreksi(lap, q, vid);
      } catch (e) {
        const kunci = e.code === 'TERKUNCI';
        msg.innerHTML = '<div class="notice ' + (kunci ? 'warn' : 'err') + '">' + icon(kunci ? 'lock' : 'alertCircle') + '<div>' + (kunci ? '<b>Koreksi tidak dapat dilakukan</b>' : '') + esc(e.message) + '</div></div>';
        if (e.code === 'KODE_SALAH' || e.code === 'BLOKIR') kodeIn.closest('.field').classList.add('invalid');
        if (e.code === 'TIDAK_ADA') msg.innerHTML += '<a class="btn btn-outline btn-block" style="margin-top:10px" href="#/lapor">' + icon('fileEdit') + ' Isi Laporan Baru</a>';
      } finally { App.busy(btn, false); }
    };
    btn.onclick = open;
    kodeIn.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
  });

  function bukaFormKoreksi(lap, q, vid) {
    const root = App.mount('<div class="pub"></div>');
    const nama = (App.formKelompok.find(k => k.id === lap.KelompokID) || {}).nama || lap.NamaKelompok;
    const form = new App.LaporanForm({
      mode: 'koreksi', viewId: vid, container: root.firstElementChild,
      title: 'Koreksi Laporan', subtitle: nama + ' · ' + App.periode(lap.Bulan, lap.Tahun), namaKelompok: nama,
      kelompok: App.formKelompok, initial: lap,
      onExit: () => App.go('/'),
      onSubmit: async d => {
        const ov = App.overlay('Menyimpan koreksi…');
        try {
          const isian = {};
          App.FORM_KEYS.forEach(k => { isian[k] = d[k] === undefined ? '' : d[k]; });
          form._reqId = form._reqId || App.reqId();   // "Coba Lagi" memakai reqId yang sama
          const r = await App.api.call('simpanKoreksi', Object.assign({}, q, { isian: isian, appUrl: location.href.split('#')[0] }), { reqId: form._reqId });
          form._reqId = null;
          ov.close();
          App.swrBust('dash_' + q.tahun);
          koreksiTersimpan(Object.assign({}, d, { NamaKelompok: nama, WaktuKirim: lap.WaktuKirim, WaktuUbah: r.waktuUbah, DiubahOleh: 'Kelompok' }));
        } catch (e) {
          ov.close();
          const m = App.modal({
            title: 'Koreksi belum tersimpan',
            body: '<div class="notice ' + (e.code === 'TERKUNCI' ? 'warn' : 'err') + '">' + icon(e.code === 'TERKUNCI' ? 'lock' : 'cloudOff') + '<div>' + esc(e.message) + '</div></div>',
            foot: '<button class="btn btn-soft" data-x>Tutup</button>' + (e.network ? '<button class="btn btn-primary" data-retry>' + icon('refresh') + ' Coba Lagi</button>' : ''),
          });
          const r = m.el.querySelector('[data-retry]');
          if (r) r.onclick = () => { m.close(true); form.submit(form.root.querySelector('[data-submit]')); };
        }
      },
    });
    form.start();
  }

  function koreksiTersimpan(lap) {
    document.body.classList.remove('with-actionbar');
    const root = App.mount('<div class="pub">' + topbar('Koreksi Tersimpan') +
      '<div class="success"><div class="mark">' + icon('check') + '</div><h2>Koreksi Laporan Tersimpan</h2><p class="thanks">Alhamdulillah Jazakumullohu Khoiro</p>' +
      '<p class="muted" style="margin-top:6px">' + esc(lap.NamaKelompok) + ' · ' + App.periode(lap.Bulan, lap.Tahun) + '<br>Diubah ' + esc(App.fmtWaktu(lap.WaktuUbah, { wita: true })) + '</p>' +
      '<p class="muted" style="margin-top:12px;font-size:13px">Kode koreksi Anda tetap sama dan masih bisa dipakai sampai bulan ini dikunci admin.</p>' +
      '<div class="stack" style="margin-top:24px"><button class="btn btn-outline btn-block" data-pdf>' + icon('download') + ' Unduh Laporan PDF</button><a class="btn btn-ghost btn-block" href="#/">' + icon('home') + ' Kembali ke Beranda</a></div></div></div>');
    bindTop(root);
    root.querySelector('[data-pdf]').onclick = e => App.pdf.run(e.currentTarget, () => App.pdf.laporan(lap));
  }

  // ───────────────────────── DASHBOARD RINGKASAN (publik) ─────────────────────────
  App.route('/dashboard', function (p, vid) {
    if (!App.api.configured()) return setupScreen();
    let per = Object.assign({}, App.bulanLalu());
    let kel = App.ls.get('mp_dash_kel_pub') || '';
    const root = App.mount('<div class="pub pub-wide">' + topbar('Dashboard Ringkasan', 'Status laporan & rekap generus') +
      '<div class="card" style="margin-top:4px"><div class="dash-filter"><div class="field"><label>Bulan</label><select class="select" data-b>' + App.bulanOptions(per.bulan) + '</select></div>' +
      '<div class="field"><label>Tahun</label><select class="select" data-t>' + App.tahunOptions(per.tahun) + '</select></div>' +
      '<div class="field"><label>' + icon('filter', 'sm') + ' Kelompok</label><span data-kelwrap><select class="select" disabled><option>Semua kelompok</option></select></span></div></div></div>' +
      '<div data-body style="margin-top:16px"><div class="skeleton" style="height:180px"></div><div class="skeleton" style="height:240px;margin-top:16px"></div></div>' +
      '<p class="muted" style="font-size:12.5px;text-align:center;margin-top:16px">' + icon('info', 'sm') + ' Angka bulan berjalan masih bisa bertambah sampai semua kelompok melapor.</p></div>');
    bindTop(root);
    const body = root.querySelector('[data-body]');
    App.onLeave(() => App.dashDestroy(body));
    const paint = d => {
      if (!App.alive(vid) || +d.tahun !== per.tahun) return;
      const m = App.dashModel.publik(d, per.bulan);
      if (kel && !App.dashKelompok(m).some(k => k.id === kel)) kel = '';
      const w = root.querySelector('[data-kelwrap]');
      w.innerHTML = App.kelompokSelect(m, kel);
      w.querySelector('[data-kel]').onchange = e => { kel = e.target.value; App.ls.set('mp_dash_kel_pub', kel); paint(d); };
      App.dashRender(body, m, { kelompok: kel });
    };
    const load = () => {
      App.data.dash(per.tahun, paint).catch(e => {
        if (!App.alive(vid)) return;
        body.innerHTML = errorCard(e, true);
        body.querySelector('[data-retry]').onclick = load;
      });
    };
    root.querySelector('[data-b]').onchange = e => { per.bulan = +e.target.value; const c = App.swrPeek('dash_' + per.tahun); if (c) paint(c); else load(); };
    root.querySelector('[data-t]').onchange = e => { per.tahun = +e.target.value; const c = App.swrPeek('dash_' + per.tahun); if (c) paint(c); else { App.dashDestroy(body); body.innerHTML = '<div class="skeleton" style="height:180px"></div>'; } load(); };
    load();
    App.idle(() => App.lib('chart').catch(() => {}));
  });

  // ───────────────────────── NOTULEN (publik, hanya baca) ─────────────────────────
  App.route('/notulen', function (p, vid) {
    if (!App.api.configured()) return setupScreen();
    const root = App.mount('<div class="pub">' + topbar('Notulen Musyawaroh', 'Hasil & berkas sidang') + '<div data-body><div class="skeleton" style="height:220px"></div></div></div>');
    bindTop(root);
    const body = root.querySelector('[data-body]');
    App.data.notulen(list => { if (App.alive(vid)) App.notulenView.mount(body, list, { admin: false }); }).catch(e => {
      if (!App.alive(vid)) return;
      body.innerHTML = errorCard(e, true);
      body.querySelector('[data-retry]').onclick = () => App.render();
    });
  });
})();
