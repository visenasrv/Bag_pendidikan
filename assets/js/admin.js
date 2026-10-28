/* ==========================================================================
   admin.js — sisi Admin: login, kerangka (sidebar/bottom-nav), Dashboard,
   Kelola Laporan (CRUD + laci rincian), Notulen, Unduh PDF, Pengaturan.
   Semua data admin diambil SEKALI dalam satu bundle, disimpan lokal,
   difilter di perangkat (instan), dan setiap perubahan bersifat optimistic.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon, Store = App.store, B = App.B;

  const NAV = [
    { k: 'dashboard', t: 'Dashboard', i: 'grid', p: '/admin/dashboard' },
    { k: 'laporan', t: 'Kelola Laporan', i: 'file', p: '/admin/laporan' },
    { k: 'monitoring', t: 'Monitoring Akhlaq', i: 'heart', p: '/admin/monitoring' },
    { k: 'evaluasi', t: 'Lap. Evaluasi', i: 'pie', p: '/admin/evaluasi' },
    { k: 'musyawaroh', t: 'Mode Musyawaroh', i: 'present', p: '/admin/musyawaroh' },
    { k: 'notulen', t: 'Notulen', i: 'list', p: '/admin/notulen' },
    { k: 'hadir', t: 'Daftar Hadir', i: 'userCheck', p: '/admin/hadir' },
    { k: 'pdf', t: 'Unduh PDF', i: 'printer', p: '/admin/pdf' },
    { k: 'pengaturan', t: 'Pengaturan', i: 'settings', p: '/admin/pengaturan' },
  ];
  const BOTTOM = ['dashboard', 'laporan', 'notulen', 'hadir'];

  // ───────────────────────── Kerangka admin ─────────────────────────
  const A = (App.admin = {
    shell: null,
    unmountShell() { A.shell = null; const p = document.getElementById('npill'); if (p) p.remove(); },

    ensure(key, title) {
      const view = document.getElementById('view');
      if (!A.shell || !view.contains(A.shell)) {
        const set = B.set();
        view.className = 'view';
        view.innerHTML =
          '<div class="adm">' +
          '<aside class="sidebar"><div class="brand">' + App.logo.html('kiri') + '<div><b>Musyawaroh</b><small>Bagian Pendidikan</small></div></div>' +
          '<nav class="gap-sm">' + NAV.map(n => '<button class="nav-item" data-nav="' + n.k + '">' + icon(n.i) + '<span>' + n.t + '</span>' + (n.k === 'laporan' ? '<span class="badge hidden" data-baru></span>' : '') + '</button>').join('') + '</nav>' +
          '<div class="bottom"><div class="row"><span>Mode Gelap</span><label class="switch"><input type="checkbox" data-dark ' + (App.theme.isDark() ? 'checked' : '') + '></label></div>' +
          '<a class="nav-item" href="#/" data-home style="justify-content:center">' + icon('home') + ' Tampilan Utama</a>' +
          '<button class="nav-item" data-pwa-install hidden style="justify-content:center">' + icon('download') + ' Instal Aplikasi</button>' +
          '<button class="nav-item" data-logout style="justify-content:center">' + icon('logout') + ' Keluar</button>' +
          '<div class="ver">v1.7.2 · Sangatta Selatan</div></div></aside>' +
          '<div class="adm-main"><header class="adm-top">' +
          '<div class="mobile-brand">' + App.logo.html('kiri').replace('logo-circle', 'logo-circle sm') + '</div>' +
          '<div class="crumb"><span class="hide-m">' + icon('landmark', 'sm') + '</span><span class="hide-m">Administrasi Pendidikan</span><span class="hide-m">/</span><b data-title></b></div>' +
          '<a class="btn btn-soft btn-sm top-home" href="#/" title="Ke tampilan utama (tanpa keluar)" aria-label="Ke tampilan utama">' + icon('home', 'sm') + '<span class="hide-m">Tampilan Utama</span></a>' +
          '<span id="sync" class="sync ok">' + icon('cloudCheck') + '<span>Tersimpan</span></span>' +
          '<button class="avatar" data-me title="Akun">' + esc(((B.set().username || App.auth.get() && App.auth.get().username || 'A') + '').slice(0, 2).toUpperCase()) + '</button>' +
          '</header><main class="adm-content" id="adm-content"></main></div>' +
          '<nav class="bottom-nav">' + BOTTOM.map(k => { const n = NAV.find(x => x.k === k); return '<button class="bn-item" data-nav="' + k + '"><span class="pip">' + icon(n.i) + '</span>' + (k === 'laporan' ? 'Laporan' : (k === 'hadir' ? 'Hadir' : n.t)) + '</button>'; }).join('') +
          '<button class="bn-item" data-more><span class="pip">' + icon('more') + '</span>Lainnya</button></nav></div>';
        A.shell = view.firstElementChild;
        A.shell.querySelectorAll('[data-nav]').forEach(b => { b.onclick = () => App.go(NAV.find(n => n.k === b.getAttribute('data-nav')).p); });
        A.shell.querySelector('[data-dark]').onchange = e => App.theme.set(e.target.checked ? 'dark' : 'light');
        A.shell.querySelector('[data-logout]').onclick = logout;
        App.idle(() => App.auth.perpanjang());
        A.shell.querySelector('[data-me]').onclick = menuAkun;
        A.shell.querySelector('[data-more]').onclick = menuLainnya;
        void set;
        Store.setSync(Store.queue.length ? 'busy' : Store.syncState);
      }
      document.body.classList.add('has-bottombar');
      document.body.classList.remove('with-actionbar');
      A.shell.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('on', b.getAttribute('data-nav') === key));
      const more = A.shell.querySelector('[data-more]');
      more.classList.toggle('on', BOTTOM.indexOf(key) < 0);
      A.shell.querySelector('[data-title]').textContent = title;
      A.badgeBaru();
      const c = document.getElementById('adm-content');
      c.innerHTML = '';
      c._form = null; c._manual = false; c._tab = null; c._drawn = false;
      c.className = 'adm-content page';
      void c.offsetWidth;
      window.scrollTo(0, 0);
      App.notulenEditor.pill();
      if (App.musyawaroh) App.musyawaroh.pill();
      if (App.monFS) App.monFS.pill();
      return c;
    },

    badgeBaru() {
      if (!A.shell) return;
      const seen = App.ls.get('mp_seen_laporan', 0);
      const n = B.laporan().filter(l => new Date(l.WaktuUbah || l.WaktuKirim).getTime() > seen).length;
      const el = A.shell.querySelector('[data-baru]');
      if (el) { el.textContent = n + ' baru'; el.classList.toggle('hidden', !n || !seen); }
    },
  });

  function guard() {
    if (!App.api.configured()) { App.go('/', true); return false; }
    if (!App.auth.valid()) { App.go('/admin/login?lanjut=' + encodeURIComponent(App.path()), true); return false; }
    return true;
  }

  const isEditable = el => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

  /** Pembungkus halaman admin: render dari cache seketika, sinkron di latar */
  function page(key, title, render) {
    return function (params, vid) {
      if (!guard()) return;
      const c = A.ensure(key, title);
      let pending = false;
      const draw = () => {
        if (!App.alive(vid)) return;
        const y = window.scrollY;
        render(c, params, vid);
        c._drawn = true;
        window.scrollTo(0, y);
      };
      if (Store.data) { render(c, params, vid); c._drawn = true; }
      else c.innerHTML = '<div class="skeleton" style="height:56px;width:50%"></div><div class="skeleton" style="height:160px;margin-top:16px"></div><div class="skeleton" style="height:260px;margin-top:16px"></div>';
      const off = Store.on(() => {
        A.badgeBaru();
        if (!App.alive(vid) || c._manual) return;
        if (c.contains(document.activeElement) && isEditable(document.activeElement)) { pending = true; return; }
        draw();
      });
      const onBlur = () => setTimeout(() => { if (pending && !(c.contains(document.activeElement) && isEditable(document.activeElement))) { pending = false; draw(); } }, 50);
      c.addEventListener('focusout', onBlur);
      App.onLeave(() => { off(); c.removeEventListener('focusout', onBlur); });
      Store.refresh().then(() => { if (App.alive(vid) && !c._drawn) draw(); }).catch(e => {
        if (!App.alive(vid) || Store.data) return;
        c.innerHTML = '<div class="card"><div class="notice err">' + icon('cloudOff') + '<div class="grow"><b>Gagal memuat data admin</b>' + esc(e.message) + '</div></div><button class="btn btn-outline" style="margin-top:12px" data-retry>' + icon('refresh') + ' Coba Lagi</button></div>';
        c.querySelector('[data-retry]').onclick = () => App.render();
      });
    };
  }
  A.page = page;

  async function logout() {
    const ok = await App.confirm({ title: 'Keluar dari admin?', message: Store.queue.length ? 'Masih ada ' + Store.queue.length + ' perubahan yang sedang dikirim. Tunggu sampai tersimpan sebelum keluar.' : 'Anda perlu masuk lagi untuk membuka halaman admin.', ok: 'Keluar', danger: true });
    if (!ok) return;
    if (App.musyawaroh) App.musyawaroh.exit();
    if (App.monFS) App.monFS.exit();
    App.api.raw('logout', {}, { post: true }).catch(() => {});
    App.auth.clear();
    App.ls.del('mp_bundle');
    App.ls.del('mp_queue');
    Store.data = null; Store.queue = [];
    App.toast('Anda telah keluar.', 'info');
    App.go('/');
  }

  function menuAkun() {
    const a = App.auth.get() || {};
    const m = App.modal({
      title: 'Akun Admin', sub: 'Masuk sebagai ' + (a.username || '-') + ' · sesi berakhir ' + App.fmtWaktu(new Date(a.exp || Date.now()).toISOString()),
      body: '<div class="stack"><a class="btn btn-soft btn-block" href="#/" data-x>' + icon('home') + ' Ke Tampilan Utama</a>' +
        '<button class="btn btn-soft btn-block" data-sync>' + icon('refresh') + ' Muat Ulang Data dari Server</button>' +
        '<button class="btn btn-danger btn-block" data-out>' + icon('logout') + ' Keluar</button></div>',
    });
    m.el.querySelector('[data-out]').onclick = () => { m.close(true); logout(); };
    m.el.querySelector('[data-sync]').onclick = async e => {
      App.busy(e.currentTarget, true);
      try { await Store.refresh(true); App.toast('Data terbaru dimuat.'); m.close(true); } catch (er) { App.toast(er.message, 'err'); App.busy(e.currentTarget, false); }
    };
  }

  function menuLainnya() {
    const extra = NAV.filter(n => BOTTOM.indexOf(n.k) < 0);
    const m = App.modal({
      title: 'Menu Lainnya',
      body: '<div class="stack">' + extra.map(n => '<button class="btn btn-soft btn-block" style="justify-content:flex-start" data-p="' + n.p + '">' + icon(n.i) + ' ' + n.t + '</button>').join('') +
        '<button class="btn btn-soft btn-block" style="justify-content:flex-start" data-theme>' + App.theme.icon() + ' Ganti Tema (Terang/Gelap)</button>' +
        '<button class="btn btn-danger btn-block" style="justify-content:flex-start" data-out>' + icon('logout') + ' Keluar</button></div>',
    });
    m.el.querySelectorAll('[data-p]').forEach(b => { b.onclick = () => { m.close(true); App.go(b.getAttribute('data-p')); }; });
    m.el.querySelector('[data-theme]').onclick = () => App.theme.cycle();
    m.el.querySelector('[data-out]').onclick = () => { m.close(true); logout(); };
  }

  // Sinkron toggle gelap di sidebar dengan tema
  document.addEventListener('themechange', () => {
    const t = A.shell && A.shell.querySelector('[data-dark]');
    if (t) t.checked = App.theme.isDark();
  });

  function periodPick(per, onChange) {
    const el = App.html('<div class="period-pick"><select class="select" data-b aria-label="Bulan">' + App.bulanOptions(per.bulan) + '</select><select class="select" data-t aria-label="Tahun">' + App.tahunOptions(per.tahun) + '</select></div>');
    el.querySelector('[data-b]').onchange = e => onChange(+e.target.value, per.tahun);
    el.querySelector('[data-t]').onchange = e => onChange(per.bulan, +e.target.value);
    return el;
  }
  A.periodPick = periodPick;

  // ───────────────────────── LOGIN ─────────────────────────
  App.route('/admin', function () { App.go(App.auth.valid() ? '/admin/dashboard' : '/admin/login', true); });

  App.route('/admin/login', function (p, vid) {
    if (!App.api.configured()) { App.go('/', true); return; }
    const lanjut = decodeURIComponent((location.hash.split('lanjut=')[1] || '').split('&')[0]) || '/admin/dashboard';
    if (App.auth.valid()) { App.go(lanjut, true); return; }
    const root = App.mount('<div class="pub" style="padding-top:24px">' +
      '<div style="text-align:right"><button class="icon-btn" data-theme aria-label="' + App.theme.label() + '" title="' + App.theme.label() + '">' + App.theme.icon() + '</button></div>' +
      '<div style="text-align:center;margin:8px 0 20px"><div style="display:inline-flex;gap:10px">' + App.logo.html('kiri') + '</div>' +
      '<h1 style="font-size:24px;margin-top:16px;font-weight:800">Masuk Admin</h1><p class="muted">Bagian Pendidikan Desa · ' + esc(App.meta().nama) + '</p></div>' +
      '<form class="card lg" data-form autocomplete="on"><div class="field"><label for="u">Username</label><input class="input" id="u" name="username" autocomplete="username" autocapitalize="none" required></div>' +
      '<div class="field"><label for="pw">Password</label><div class="input-wrap"><input class="input" id="pw" name="password" type="password" autocomplete="current-password" required style="padding-right:52px">' +
      '<button type="button" class="icon-btn" data-eye style="position:absolute;right:2px;top:2px" aria-label="Tampilkan password">' + icon('eye') + '</button></div></div>' +
      '<label class="check-row" style="margin-top:14px"><input type="checkbox" id="ingat"' + (App.auth.terinstal() || App.ls.get('mp_ingat') ? ' checked' : '') + '><span><b>Tetap masuk di perangkat ini</b><small>Tidak perlu login lagi setiap membuka aplikasi. Jangan dicentang di perangkat umum/bersama.</small></span></label>' +
      '<div data-msg style="margin-top:14px"></div>' +
      '<button class="btn btn-primary btn-block" style="margin-top:18px" type="submit">' + icon('lock') + ' Masuk</button></form>' +
      '<div style="text-align:center;margin-top:18px"><a class="btn btn-ghost" href="#/">' + icon('arrowL') + ' Kembali ke Beranda</a></div></div>');
    root.querySelector('[data-theme]').onclick = () => App.theme.cycle();
    const pw = root.querySelector('#pw');
    root.querySelector('[data-eye]').onclick = () => { pw.type = pw.type === 'password' ? 'text' : 'password'; };
    setTimeout(() => root.querySelector('#u').focus(), 50);
    root.querySelector('[data-form]').onsubmit = async e => {
      e.preventDefault();
      const btn = e.target.querySelector('[type=submit]');
      const msg = root.querySelector('[data-msg]');
      msg.innerHTML = '';
      App.busy(btn, true);
      try {
        const ingat = root.querySelector('#ingat').checked;
        App.ls.set('mp_ingat', ingat ? 1 : 0);
        const r = await App.api.call('login', { username: root.querySelector('#u').value.trim(), password: pw.value, ingat: ingat }, { post: true });
        App.auth.set(r.token, r.username, r.exp, !!r.ingat);
        if (!App.ls.get('mp_seen_laporan')) App.ls.set('mp_seen_laporan', Date.now());
        if (r.bundle) {
          // Prinsip 3: data admin ikut dalam balasan login → langsung tampil tanpa panggilan kedua
          Store.data = r.bundle; Store.lastFetch = Date.now(); Store.persist(); App.cekVersi(r.bundle.versi); if (r.bundle.pengaturan) App.brand.apply(r.bundle.pengaturan.warna || '');
        } else {
          await Store.refresh(true).catch(() => {});   // server versi lama
        }
        App.toast('Assalamu\'alaikum, selamat datang.');
        if (App.alive(vid)) App.go(lanjut, true);
        if (Store.queue.length) Store.pump();
      } catch (er) {
        msg.innerHTML = '<div class="notice err">' + icon('alertCircle') + '<div>' + esc(er.message) + '</div></div>';
        App.busy(btn, false);
      }
    };
  });

  // ───────────────────────── DASHBOARD ─────────────────────────
  // Penggambar bersama ada di dash.js (dipakai juga dashboard publik)
  App.route('/admin/dashboard', page('dashboard', 'Dashboard', function (c) {
    const per = App.periodeAktif;
    const ku = B.kunci(per.bulan, per.tahun);
    const m = App.dashModel.admin(per);
    let kel = App.ls.get('mp_dash_kel') || '';
    if (kel && !App.dashKelompok(m).some(k => k.id === kel)) kel = '';
    c.innerHTML =
      '<div class="page-head"><div><h1>Dashboard</h1><p>Ringkasan rekap generus & kepatuhan laporan kelompok binaan.</p></div><div class="actions" data-acts></div></div>' +
      '<div data-dash></div>' +
      '<section class="card" style="margin-top:16px;padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 0"><div><div class="card-title">' + icon('file') + ' Laporan Terbaru Masuk</div><div class="card-sub">Riwayat pengiriman & perubahan laporan</div></div><a class="btn btn-ghost btn-sm" href="#/admin/laporan">Lihat semua ' + icon('arrowR', 'sm') + '</a></div>' +
      laporanTable(B.laporan().slice().sort((a, b) => String(b.WaktuUbah || b.WaktuKirim).localeCompare(String(a.WaktuUbah || a.WaktuKirim))).slice(0, 5), { compact: true }) + '</section>';
    const dash = c.querySelector('[data-dash]');
    App.onLeave(() => App.dashDestroy(dash));
    const gambar = () => App.dashRender(dash, m, { kelompok: kel, onOpen: it => it && it.lapId && App.laporanDrawer.open(it.lapId) });
    const acts = c.querySelector('[data-acts]');
    const fk = App.html('<div class="period-pick">' + App.kelompokSelect(m, kel) + '</div>');
    fk.querySelector('[data-kel]').onchange = e => { kel = e.target.value; App.ls.set('mp_dash_kel', kel); gambar(); };
    acts.appendChild(fk);
    acts.appendChild(periodPick(per, (b, t) => { App.setPeriode(b, t); App.render(); }));
    const kb = App.html(ku.terkunci
      ? '<button class="btn btn-outline btn-sm">' + icon('unlock') + ' Buka Kunci</button>'
      : '<button class="btn btn-deep btn-sm">' + icon('lock') + ' Kunci Bulan Ini</button>');
    kb.onclick = () => toggleKunci(per, ku);
    acts.appendChild(kb);
    bindTableRows(c);
    gambar();
  }));

  async function toggleKunci(per, ku) {
    const nama = App.periode(per.bulan, per.tahun);
    if (ku.terkunci) {
      const ok = await App.confirm({ title: 'Buka kunci ' + nama + '?', message: 'Kelompok dapat kembali mengoreksi laporan periode ini dengan kode koreksi.', ok: 'Buka Kunci' });
      if (!ok) return;
      Store.mutate('bukaKunciBulan', { bulan: per.bulan, tahun: per.tahun }, d => {
        d.kunci = d.kunci.filter(k => !(+k.bulan === per.bulan && +k.tahun === per.tahun));
      }, { label: 'Buka kunci' });
      App.toast('Kunci ' + nama + ' dibuka.');
    } else {
      const res = await App.confirm({
        title: 'Kunci ' + nama + '?',
        html: 'Setelah dikunci, kelompok <b>tidak bisa lagi mengoreksi</b> laporan periode ini. Admin tetap bisa mengubah.' +
          '<label class="check" style="margin-top:14px;align-items:flex-start"><input type="checkbox" data-tutup style="margin-top:2px"><span>Tutup juga <b>kiriman baru</b> dari kelompok yang belum lapor</span></label>',
        ok: 'Kunci Bulan', collect: el => ({ tutupBaru: el.querySelector('[data-tutup]').checked }),
      });
      if (!res) return;
      Store.mutate('kunciBulan', { bulan: per.bulan, tahun: per.tahun, tutupBaru: res.tutupBaru }, d => {
        d.kunci = d.kunci.filter(k => !(+k.bulan === per.bulan && +k.tahun === per.tahun));
        d.kunci.push({ bulan: per.bulan, tahun: per.tahun, terkunci: true, tutupBaru: res.tutupBaru, waktu: new Date().toISOString() });
      }, { label: 'Kunci bulan' });
      App.toast(nama + ' dikunci.');
    }
    App.swrBust('dash_' + per.tahun);
  }
  A.toggleKunci = toggleKunci;

  // ───────────────────────── MONITORING & BIMBINGAN AKHLAQ (v1.4) ─────────────────────────
  // Versi admin = versi umum + tabel data rinci (nama anak & pelapor). Data admin hanya disimpan di memori.
  // ───────────────────────── LAP. EVALUASI (Power BI) — v1.6.5 ─────────────────────────
  App.route('/admin/evaluasi', page('evaluasi', 'Lap. Evaluasi', function (c) {
    c._manual = true;   // iframe tidak dimuat ulang saat data bundle sinkron
    const url = App.evaluasiUrl();
    if (c.querySelector('.eval-frame') && c._evalUrl === url) return;
    c._evalUrl = url;
    c.innerHTML = '<div class="page-head"><div><h1>Lap. Evaluasi</h1><p>Laporan evaluasi Power BI · tautan bisa diganti di Pengaturan → Lap. Evaluasi.</p></div></div><div data-ev></div>';
    App.evaluasiView(c.querySelector('[data-ev]'));
  }));

  App.route('/admin/monitoring', page('monitoring', 'Monitoring Akhlaq', function (c, p, vid) {
    c._manual = true;   // tidak bergantung data bundle → jangan gambar ulang saat sinkron
    if (c.querySelector('[data-mon]') && c._monDone) return;
    c.innerHTML = '<div data-mon><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:80px;margin-top:12px"></div><div class="skeleton" style="height:260px;margin-top:12px"></div></div>';
    const el = c.querySelector('[data-mon]');
    const pasang = d => {
      if (!App.alive(vid)) return;
      c._monDone = true;
      App.monView.mount(el, d, {
        admin: !!d.nama,
        onFull: () => App.monFS.open(App.monitoringCache || d),
        onRefresh: async btn => {
          App.busy(btn, true);
          try { const n = await App.api.admin('segarkanMonitoring', {}); App.monitoringCache = n; App.swrBust('mon'); pasang(n); App.toast('Data monitoring diperbarui dari Google Sheets.'); }
          catch (e) { App.toast(e.message, 'err'); App.busy(btn, false); }
        },
      });
    };
    if (App.monitoringCache) { pasang(App.monitoringCache); return; }
    const umum = App.swrPeek('mon');
    if (umum) pasang(umum);   // tampil seketika dari data umum, lalu dilengkapi data admin
    App.api.admin('getMonitoringAdmin', {}).then(d => { App.monitoringCache = d; pasang(d); }).catch(e => {
      if (!App.alive(vid)) return;
      if (umum) { App.toast('Tabel data rinci belum bisa dimuat: ' + e.message, 'warn'); return; }
      el.innerHTML = '<div class="card"><div class="notice err">' + icon('cloudOff') + '<div class="grow"><b>Data monitoring belum bisa dimuat</b>' + esc(e.message) + '</div></div>' +
        '<div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn btn-outline" data-retry>' + icon('refresh') + ' Coba Lagi</button><a class="btn btn-ghost" href="#/admin/pengaturan" data-set>' + icon('settings') + ' Atur sumber data</a></div></div>';
      el.querySelector('[data-retry]').onclick = () => App.render();
      el.querySelector('[data-set]').onclick = () => App.ls.set('mp_set_tab', 'monitoring');
    });
  }));

  // ───────────────────────── Tabel laporan ─────────────────────────
  function laporanTable(rows, opt) {
    opt = opt || {};
    if (!rows.length) return '<div class="empty">' + icon('file') + '<b>Belum ada laporan</b><p>Laporan yang dikirim kelompok akan tampil di sini.</p></div>';
    const sel = opt.selected;
    return '<table class="tbl cards"><thead><tr><th>Kelompok</th><th>Periode</th><th>Waktu Kirim</th>' + (opt.compact ? '' : '<th>Waktu Ubah</th>') + '<th>Diubah Oleh</th><th class="r">Total Generus</th><th class="r">Aksi</th></tr></thead><tbody>' +
      rows.map(l => {
        const ku = B.kunci(l.Bulan, l.Tahun);
        return '<tr data-row="' + esc(l.ID) + '" class="' + (sel === l.ID ? 'sel' : '') + '">' +
          '<td class="c-main"><div class="strong">' + esc(B.namaKelompok(l)) + (ku.terkunci ? ' <span title="Bulan terkunci">' + icon('lock', 'sm') + '</span>' : '') + '</div></td>' +
          '<td class="c-meta">' + App.periode(l.Bulan, l.Tahun) + '</td>' +
          '<td class="c-meta num" data-l="Kirim">' + esc(App.fmtWaktu(l.WaktuKirim)) + '</td>' +
          (opt.compact ? '' : '<td class="c-hide-m num">' + (l.WaktuUbah ? esc(App.fmtWaktu(l.WaktuUbah)) : '—') + '</td>') +
          '<td class="c-hide-m">' + (l.DiubahOleh === 'Admin' ? (l.WaktuUbah ? '<span class="badge warn">' + icon('edit', 'sm') + ' Admin (Revisi)</span>' : '<span class="badge">' + icon('user', 'sm') + ' Admin</span>') : '<span class="badge ok">' + icon('users', 'sm') + ' Kelompok</span>') + '</td>' +
          '<td class="r num c-side"><b>' + App.fmtNum(App.totalGenerus(l)) + '</b> <span class="muted" style="font-size:12px">orang</span></td>' +
          '<td class="r c-hide-m"><button class="btn btn-ghost btn-xs" data-view>' + icon('eye', 'sm') + ' Lihat</button></td></tr>';
      }).join('') + '</tbody></table>';
  }
  function bindTableRows(c) {
    c.querySelectorAll('[data-row]').forEach(tr => { tr.onclick = () => App.laporanDrawer.open(tr.getAttribute('data-row')); });
  }

  // ───────────────────────── KELOLA LAPORAN ─────────────────────────
  const filt = App.ls.get('mp_filter_lap') || { q: '', bulan: '', tahun: '', status: 'semua', page: 1 };
  App.route('/admin/laporan', page('laporan', 'Kelola Laporan', function (c) {
    App.ls.set('mp_seen_laporan', Date.now());
    if (!c.querySelector('[data-tbl]')) {
      // v1.3: setiap kali halaman dibuka, filter otomatis ke periode laporan berjalan
      const kini = App.bulanLalu();
      filt.bulan = String(kini.bulan); filt.tahun = String(kini.tahun); filt.page = 1;
      c.innerHTML =
        '<div class="page-head"><div><h1>Kelola Laporan</h1><p>Manajemen & validasi entri pelaporan bulanan.</p></div><div class="actions">' +
        '<button class="btn btn-soft btn-sm" data-csv>' + icon('download') + ' Ekspor Rekap</button><a class="btn btn-primary btn-sm" href="#/admin/laporan/baru">' + icon('plusCircle') + ' Tambah Laporan</a></div></div>' +
        '<section class="card"><div class="grid" style="grid-template-columns:1fr;gap:10px"><div class="input-wrap"><input class="input" data-q placeholder="Cari nama kelompok atau isi laporan…" value="' + esc(filt.q) + '" style="padding-left:42px"><span style="position:absolute;left:12px;top:14px;color:var(--muted)">' + icon('search') + '</span></div>' +
        '<div class="row wrap"><select class="select" data-fb style="width:auto;min-height:42px">' + App.bulanOptions(filt.bulan, true) + '</select><select class="select" data-ft style="width:auto;min-height:42px">' + App.tahunOptions(filt.tahun, true) + '</select>' +
        '<div class="chips" data-chips></div><button class="btn btn-ghost btn-xs" data-reset style="margin-left:auto">' + icon('refresh', 'sm') + ' Reset filter</button></div></div></section>' +
        '<section class="table-wrap" style="margin-top:16px" data-tbl></section>';
      const q = c.querySelector('[data-q]');
      q.oninput = App.debounce(() => { filt.q = q.value; filt.page = 1; drawTable(c); }, 120);
      c.querySelector('[data-fb]').onchange = e => { filt.bulan = e.target.value; filt.page = 1; drawTable(c); };
      c.querySelector('[data-ft]').onchange = e => { filt.tahun = e.target.value; filt.page = 1; drawTable(c); };
      c.querySelector('[data-reset]').onclick = () => {
        Object.assign(filt, { q: '', bulan: '', tahun: '', status: 'semua', page: 1 });
        q.value = ''; c.querySelector('[data-fb]').value = ''; c.querySelector('[data-ft]').value = '';
        drawTable(c);
      };
      c.querySelector('[data-csv]').onclick = () => eksporCsv(filtered());
    }
    drawTable(c);
  }));

  function filtered() {
    const term = filt.q.trim().toLowerCase();
    return B.laporan().filter(l => {
      if (filt.bulan && +l.Bulan !== +filt.bulan) return false;
      if (filt.tahun && +l.Tahun !== +filt.tahun) return false;
      const ku = B.kunci(l.Bulan, l.Tahun).terkunci;
      if (filt.status === 'terbuka' && ku) return false;
      if (filt.status === 'terkunci' && !ku) return false;
      if (term) {
        const hay = (B.namaKelompok(l) + ' ' + App.periode(l.Bulan, l.Tahun) + ' ' + App.FORM_KEYS.map(k => l[k]).join(' ')).toLowerCase();
        if (hay.indexOf(term) < 0) return false;
      }
      return true;
    }).sort((a, b) => (b.Tahun - a.Tahun) || (b.Bulan - a.Bulan) || ((B.kelompokById(a.KelompokID) || {}).urutan || 99) - ((B.kelompokById(b.KelompokID) || {}).urutan || 99));
  }

  function drawTable(c) {
    App.ls.set('mp_filter_lap', filt);
    const base = B.laporan().filter(l => (!filt.bulan || +l.Bulan === +filt.bulan) && (!filt.tahun || +l.Tahun === +filt.tahun));
    const nT = base.filter(l => !B.kunci(l.Bulan, l.Tahun).terkunci).length;
    const chips = c.querySelector('[data-chips]');
    chips.innerHTML = [['semua', 'Semua', base.length], ['terbuka', 'Terbuka', nT], ['terkunci', 'Terkunci', base.length - nT]]
      .map(x => '<button class="chip ' + (filt.status === x[0] ? 'on' : '') + '" data-st="' + x[0] + '">' + x[1] + ' <span class="n">(' + x[2] + ')</span></button>').join('');
    chips.querySelectorAll('[data-st]').forEach(b => { b.onclick = () => { filt.status = b.getAttribute('data-st'); filt.page = 1; drawTable(c); }; });
    const rows = filtered();
    const per = 20, pages = Math.max(1, Math.ceil(rows.length / per));
    filt.page = Math.min(filt.page, pages);
    const slice = rows.slice((filt.page - 1) * per, filt.page * per);
    const box = c.querySelector('[data-tbl]');
    box.innerHTML = laporanTable(slice, { selected: App.laporanDrawer.current }) +
      (rows.length ? '<div class="pager"><span>Menampilkan <b>' + slice.length + '</b> dari <b>' + rows.length + '</b> laporan</span>' +
        (pages > 1 ? '<div class="row" style="gap:6px"><button class="btn btn-soft btn-xs" data-pg="-1" ' + (filt.page === 1 ? 'disabled' : '') + '>' + icon('chevL', 'sm') + ' Prev</button><span class="num">' + filt.page + ' / ' + pages + '</span><button class="btn btn-soft btn-xs" data-pg="1" ' + (filt.page === pages ? 'disabled' : '') + '>Next ' + icon('chevR', 'sm') + '</button></div>' : '') + '</div>' : '');
    box.querySelectorAll('[data-pg]').forEach(b => { b.onclick = () => { filt.page += +b.getAttribute('data-pg'); drawTable(c); }; });
    bindTableRows(box);
  }

  function eksporCsv(rows) {
    if (!rows.length) { App.toast('Tidak ada laporan untuk diekspor.', 'warn'); return; }
    const fields = [];
    App.FORM.forEach(s => s.fields.forEach(f => { if (f.k && ['KelompokID', 'Bulan', 'Tahun'].indexOf(f.k) < 0) fields.push(f); }));
    const head = ['Kelompok', 'Bulan', 'Tahun', 'Waktu Kirim', 'Waktu Ubah', 'Diubah Oleh', 'Total Generus'].concat(fields.map(f => f.label));
    const cell = v => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
    const lines = [head.map(cell).join(',')].concat(rows.map(l => [B.namaKelompok(l), App.BULAN[l.Bulan - 1], l.Tahun, App.fmtWaktu(l.WaktuKirim), l.WaktuUbah ? App.fmtWaktu(l.WaktuUbah) : '', l.DiubahOleh, App.totalGenerus(l)]
      .concat(fields.map(f => l[f.k])).map(cell).join(',')));
    App.download('Rekap_Laporan_' + App.today() + '.csv', '﻿' + lines.join('\r\n'), 'text/csv;charset=utf-8');
    App.toast('Rekap diekspor (' + rows.length + ' laporan).');
  }

  // ───────────────────────── Laci rincian laporan ─────────────────────────
  App.laporanDrawer = {
    current: null,
    el: null,
    off: null,
    open(id) {
      this.close();
      this.current = id;
      const back = App.html('<div class="drawer-back"></div>');
      const el = App.html('<aside class="drawer" role="dialog" aria-modal="true"></aside>');
      document.body.appendChild(back);
      document.body.appendChild(el);
      back.onclick = () => this.close();
      this.el = el; this.back = back;
      this.draw();
      this.off = Store.on(() => this.draw());
      this.key = e => { if (e.key === 'Escape' && !document.querySelector('.backdrop')) this.close(); };
      document.addEventListener('keydown', this.key);
      App.onLeave(() => this.close());
      document.querySelectorAll('[data-row]').forEach(tr => tr.classList.toggle('sel', tr.getAttribute('data-row') === id));
    },
    close() {
      if (this.el) { this.el.remove(); this.back.remove(); }
      if (this.off) this.off();
      if (this.key) document.removeEventListener('keydown', this.key);
      this.el = null; this.off = null; this.current = null;
      document.querySelectorAll('tr.sel').forEach(tr => tr.classList.remove('sel'));
    },
    draw() {
      const l = B.laporan().find(x => x.ID === this.current);
      if (!this.el) return;
      if (!l) { this.close(); return; }
      const ku = B.kunci(l.Bulan, l.Tahun);
      const nama = B.namaKelompok(l);
      const openSet = this.openSet || (this.openSet = new Set(['umum', 'caberawit']));
      this.el.innerHTML =
        '<div class="drawer-head"><div class="row between"><div class="section-label" style="color:var(--link)">Rincian Laporan</div><button class="icon-btn" data-x aria-label="Tutup">' + icon('x') + '</button></div>' +
        '<h3 style="font-size:20px;margin-top:2px">' + esc(nama) + ' · ' + App.periode(l.Bulan, l.Tahun) + '</h3>' +
        '<div class="chips" style="margin-top:10px;gap:6px"><span class="badge ok">' + icon('clock', 'sm') + ' Dikirim ' + esc(App.fmtWaktu(l.WaktuKirim)) + '</span>' +
        (l.WaktuUbah ? '<span class="badge ok">' + icon('edit', 'sm') + ' Diubah ' + esc(App.fmtWaktu(l.WaktuUbah)) + '</span>' : '') +
        '<span class="badge ok">' + icon('user', 'sm') + ' Oleh: ' + esc(l.DiubahOleh || 'Kelompok') + '</span>' +
        (ku.terkunci ? '<span class="badge">' + icon('lock', 'sm') + ' Terkunci</span>' : '') + '</div></div>' +
        '<div class="drawer-body">' + App.FORM.map(s => sectionDetail(s, l, openSet.has(s.id))).join('') + tanggapanDetail(l) +
        '<div class="kode-card"><span class="ico-tile">' + icon('key') + '</span><div class="grow"><div class="section-label">Kode Koreksi Laporan</div><div style="font-size:18px;letter-spacing:.3em;font-weight:800">' + (l.punyaKode ? '••••••' : '<span class="muted" style="letter-spacing:0;font-size:14px">Belum ada kode</span>') + '</div></div>' +
        '<button class="btn btn-outline btn-xs" style="border-color:var(--gold);color:var(--warn-fg)" data-kode>' + icon('refresh', 'sm') + ' Buat Kode Baru</button></div></div>' +
        '<div class="drawer-foot"><button class="btn btn-danger btn-sm" data-del>' + icon('trash') + ' Hapus</button><span class="sp"></span>' +
        '<button class="btn btn-soft btn-sm" data-pdf>' + icon('printer') + ' Unduh PDF</button><a class="btn btn-primary btn-sm" href="#/admin/laporan/ubah/' + esc(l.ID) + '">' + icon('edit') + ' Ubah Laporan</a></div>';
      const q = s => this.el.querySelector(s);
      q('[data-x]').onclick = () => this.close();
      this.el.querySelectorAll('details').forEach(d => { d.addEventListener('toggle', () => { if (d.open) openSet.add(d.dataset.id); else openSet.delete(d.dataset.id); }); });
      q('[data-pdf]').onclick = e => App.pdf.run(e.currentTarget, () => App.pdf.laporan(l));
      q('[data-kode]').onclick = () => kodeBaru(l);
      q('[data-del]').onclick = () => hapusLaporan(l);
    },
  };

  function tanggapanDetail(l) {
    const tg = App.tanggapanList(l.ID);
    if (!tg.length) return '';
    return '<section class="tg-detail"><div class="section-label" style="color:var(--link)">' + icon('reply', 'sm') + ' Tanggapan Musyawaroh (' + tg.length + ')</div>' +
      tg.map(t => '<div class="tg-resp"><div class="h">' + esc(App.tanggapanLabel(t.bidang)) + '</div><div class="b">' + esc(t.isi) + '</div></div>').join('') + '</section>';
  }

  function sectionDetail(s, l, open) {
    const fs = App.visibleFields(s, l).filter(f => ['KelompokID', 'Bulan', 'Tahun'].indexOf(f.k) < 0);
    const jml = s.fields.find(f => /^Jml_/.test(f.k || ''));
    let summary = '';
    if (jml) summary = '<span class="badge" style="margin-left:auto">Jumlah: ' + App.fmtNum(l[jml.k]) + ' Orang</span>';
    if (s.id === 'mondok') summary = '<span class="badge" style="margin-left:auto">Mondok: ' + App.num(l.Generus_Sedang_Mondok) + ' · Mubaligh: ' + App.num(l.Generus_Sudah_Mondok) + '</span>';
    let body;
    if (jml) {
      const nums = fs.filter(f => f.type === 'num');
      const rest = fs.filter(f => f.type !== 'num');
      body = '<div class="mini-stats">' + nums.map(f => '<div class="mini-stat"><div class="l">' + esc(f.label) + '</div><div class="v">' + (l[f.k] === '' || l[f.k] === undefined ? '—' : App.fmtNum(l[f.k])) + '<small>' + esc(f.suffix || '') + '</small></div></div>').join('') + '</div>' +
        rest.map(f => '<div class="section-label" style="margin-top:10px">' + esc(f.label) + '</div><div class="note-box" style="margin-top:6px">' + (l[f.k] ? esc(l[f.k]) : '<span class="faint">—</span>') + '</div>').join('');
    } else {
      body = '<div class="kv">' + fs.map(f => { const v = App.fmtField(f, l[f.k], l); return '<div class="k">' + esc(f.label) + '</div><div class="v ' + (v ? '' : 'empty') + '">' + esc(v || '—') + '</div>'; }).join('') + '</div>';
    }
    return '<details class="acc" data-id="' + s.id + '" ' + (open ? 'open' : '') + '><summary><span class="letter">' + s.huruf + '</span>' + esc(s.judul) + (open ? '' : summary) + '<span class="chev">' + icon('chevD', 'sm') + '</span></summary><div class="acc-body">' + body + '</div></details>';
  }

  async function kodeBaru(l) {
    const ok = await App.confirm({
      title: 'Buat kode koreksi baru?',
      html: 'Kode lama untuk <b>' + esc(B.namaKelompok(l)) + ' · ' + App.periode(l.Bulan, l.Tahun) + '</b> tidak berlaku lagi. Kode baru hanya ditampilkan <b>sekali</b>.',
      ok: 'Buat Kode Baru',
    });
    if (!ok) return;
    const kode = App.genKode();
    Store.mutate('resetKode', { ID: l.ID, kode: kode }, d => { const x = d.laporan.find(y => y.ID === l.ID); if (x) x.punyaKode = true; }, { label: 'Kode koreksi' });
    tampilKode(kode, l, 'Kode koreksi baru');
  }

  function tampilKode(kode, l, judul) {
    const m = App.modal({
      title: judul, sub: B.namaKelompok(l) + ' · ' + App.periode(l.Bulan, l.Tahun),
      body: '<div class="kode-box" style="margin-top:0;text-align:center"><div class="lbl">Kode Koreksi</div><div class="kode">' + esc(kode) + '</div><p style="font-size:13px;color:var(--warn-fg);font-weight:600">Teruskan kode ini ke kelompok. Kode tidak akan ditampilkan lagi.</p></div>',
      foot: '<button class="btn btn-outline" data-copy>' + icon('copy') + ' Salin</button><button class="btn btn-primary" data-x>Selesai</button>', sticky: true,
    });
    m.el.querySelector('[data-copy]').onclick = async () => { App.toast((await App.copy(kode)) ? 'Kode disalin.' : 'Gagal menyalin.', 'info'); };
  }

  async function hapusLaporan(l) {
    const ok = await App.confirm({
      title: 'Hapus laporan?', html: 'Laporan <b>' + esc(B.namaKelompok(l)) + ' · ' + App.periode(l.Bulan, l.Tahun) + '</b> akan dihapus permanen dari spreadsheet.', ok: 'Hapus Laporan', danger: true,
    });
    if (!ok) return;
    App.laporanDrawer.close();
    Store.mutate('hapusLaporan', { ID: l.ID }, d => { d.laporan = d.laporan.filter(x => x.ID !== l.ID); }, { label: 'Hapus laporan' });
    App.swrBust('dash_' + l.Tahun);
    App.toast('Laporan dihapus.');
  }

  // ───────────────────────── Tambah / Ubah laporan (admin) ─────────────────────────
  function cekLocalAdmin(kid, b, t, exceptId) {
    const ada = B.laporan().some(l => l.KelompokID === kid && +l.Bulan === +b && +l.Tahun === +t && l.ID !== exceptId);
    return { ada: ada, terkunci: B.kunci(b, t).terkunci, tutupBaru: false };
  }

  App.route('/admin/laporan/baru', page('laporan', 'Tambah Laporan', function (c, p, vid) {
    if (c._form) return;
    c._manual = true;
    App.formKelompok = B.kelompok().filter(k => k.aktif);
    c.innerHTML = '<div class="page-head"><div><h1>Tambah Laporan</h1><p>Isi laporan atas nama kelompok yang tidak bisa mengisi sendiri.</p></div></div><div data-f style="max-width:720px"></div>';
    const form = new App.LaporanForm({
      mode: 'adminBaru', viewId: vid, container: c.querySelector('[data-f]'), kelompok: App.formKelompok, initial: { Bulan: App.periodeAktif.bulan, Tahun: App.periodeAktif.tahun },
      onCekLocal: (k, b, t) => cekLocalAdmin(k, b, t),
      onCek: (k, b, t) => Promise.resolve(cekLocalAdmin(k, b, t)),
      onKoreksi: d => { const l = B.laporan().find(x => x.KelompokID === d.KelompokID && +x.Bulan === +d.Bulan && +x.Tahun === +d.Tahun); if (l) App.go('/admin/laporan/ubah/' + l.ID); },
      onExit: () => App.go('/admin/laporan'),
      onSubmit: async d => {
        const id = App.uuid(), kode = App.genKode();
        const k = B.kelompokById(d.KelompokID) || {};
        const lap = Object.assign({}, d, { ID: id, WaktuKirim: new Date().toISOString(), WaktuUbah: '', DiubahOleh: 'Admin', NamaKelompok: k.nama, punyaKode: true, Bulan: +d.Bulan, Tahun: +d.Tahun });
        Store.mutate('tambahLaporan', Object.assign({}, d, { ID: id, kode: kode }), data => { data.laporan.push(lap); }, { label: 'Tambah laporan' });
        App.swrBust('dash_' + d.Tahun);
        App.go('/admin/laporan');
        App.toast('Laporan ' + k.nama + ' ditambahkan.');
        setTimeout(() => tampilKode(kode, lap, 'Laporan tersimpan — kode koreksi'), 150);
      },
    });
    c._form = form;
    form.start();
  }));

  App.route('/admin/laporan/ubah/:id', page('laporan', 'Ubah Laporan', function (c, p, vid) {
    if (c._form) return;
    const l = B.laporan().find(x => x.ID === p.id);
    if (!l) { c.innerHTML = '<div class="card"><div class="empty">' + icon('alert') + '<b>Laporan tidak ditemukan</b><p>Mungkin sudah dihapus.</p><a class="btn btn-outline" href="#/admin/laporan" style="margin-top:12px">Kembali</a></div></div>'; return; }
    c._manual = true;
    App.formKelompok = B.kelompok();
    c.innerHTML = '<div class="page-head"><div><h1>Ubah Laporan</h1><p>' + esc(B.namaKelompok(l)) + ' · ' + App.periode(l.Bulan, l.Tahun) + (B.kunci(l.Bulan, l.Tahun).terkunci ? ' · bulan terkunci (admin tetap bisa mengubah)' : '') + '</p></div></div><div data-f style="max-width:720px"></div>';
    const form = new App.LaporanForm({
      mode: 'adminUbah', viewId: vid, container: c.querySelector('[data-f]'), kelompok: App.formKelompok, initial: Object.assign({}, l), namaKelompok: B.namaKelompok(l),
      onExit: () => App.go('/admin/laporan'),
      onSubmit: async d => {
        if (cekLocalAdmin(d.KelompokID, d.Bulan, d.Tahun, l.ID).ada) { App.toast('Sudah ada laporan lain untuk kelompok & periode tersebut.', 'err'); return; }
        const payload = { ID: l.ID, KelompokID: d.KelompokID, Bulan: +d.Bulan, Tahun: +d.Tahun };
        App.FORM_KEYS.forEach(k => { payload[k] = d[k] === undefined ? '' : d[k]; });
        Store.mutate('ubahLaporan', payload, data => {
          const x = data.laporan.find(y => y.ID === l.ID);
          if (!x) return;
          Object.assign(x, payload, { WaktuUbah: new Date().toISOString(), DiubahOleh: 'Admin' });
          const k = B.kelompokById(d.KelompokID); if (k) x.NamaKelompok = k.nama;
        }, { label: 'Ubah laporan' });
        App.swrBust('dash_' + d.Tahun);
        App.go('/admin/laporan');
        App.toast('Perubahan laporan disimpan.');
        setTimeout(() => App.laporanDrawer.open(l.ID), 120);
      },
    });
    c._form = form;
    form.start();
  }));

  // ───────────────────────── NOTULEN (admin) ─────────────────────────
  App.route('/admin/notulen', page('notulen', 'Notulen', function (c) {
    const draft = App.notulenEditor.draft();
    let tab = App.ls.get('mp_notulen_tab') || 'daftar';
    if (draft && !draft.minimized && tab !== 'catat') tab = 'catat';
    if (c._tab && c._tab === tab && tab === 'catat' && c.querySelector('.editor-wrap')) return; // jangan ganggu editor yang sedang dipakai
    c._tab = tab;
    const n = B.notulen().length;
    c.innerHTML = '<div class="page-head"><div><h1>Notulen Musyawaroh</h1><p>Catat, lihat, ubah, dan unduh notulen per sesi.</p></div></div>' +
      '<div class="tabs"><button class="tab ' + (tab === 'catat' ? 'on' : '') + '" data-tab="catat">' + icon('edit', 'sm') + ' Catat Notulen</button><button class="tab ' + (tab === 'daftar' ? 'on' : '') + '" data-tab="daftar">Daftar Notulen (' + n + ')</button></div>' +
      '<div data-body style="max-width:' + (tab === 'catat' ? '1040px' : '900px') + '"></div>';
    c.querySelectorAll('[data-tab]').forEach(b => {
      b.onclick = () => {
        const t = b.getAttribute('data-tab');
        if (t === 'catat') { const d = App.notulenEditor.draft(); if (d && d.minimized) { d.minimized = false; App.notulenEditor.save(d); } }
        App.ls.set('mp_notulen_tab', t);
        c._tab = null;
        App.render();
      };
    });
    const body = c.querySelector('[data-body]');
    if (tab === 'catat') {
      c._manual = true;
      App.notulenEditor.mount(body, () => { App.ls.set('mp_notulen_tab', 'daftar'); c._tab = null; c._manual = false; App.render(); });
    } else {
      c._manual = false;
      App.notulenView.mount(body, B.notulen(), {
        admin: true,
        onEdit: s => {
          const cur = App.notulenEditor.draft();
          const go = () => { App.notulenEditor.save(App.notulenEditor.fromSesi(s)); App.ls.set('mp_notulen_tab', 'catat'); c._tab = null; App.render(); };
          if (cur && App.notulenEditor.hasContent(cur)) {
            App.confirm({ title: 'Ganti isi editor?', message: 'Ada notulen yang belum disimpan di editor. Lanjut mengubah sesi ini dan buang isian tersebut?', ok: 'Lanjut', danger: true }).then(ok => { if (ok) go(); });
          } else go();
        },
        onDelete: async s => {
          const ok = await App.confirm({ title: 'Hapus sesi notulen?', html: 'Sesi <b>' + esc(App.fmtTanggal(s.tanggal)) + ' — ' + esc(s.tempat) + '</b> (' + esc(App.notulenInfo(s)) + ') akan dihapus permanen.', ok: 'Hapus Sesi', danger: true });
          if (!ok) return;
          Store.mutate('hapusNotulen', { sesiId: s.sesiId }, d => { d.notulen = d.notulen.filter(x => x.sesiId !== s.sesiId); }, { label: 'Hapus notulen' });
          App.swrBust('notulen');
          App.toast('Sesi notulen dihapus.');
        },
      });
    }
  }));

  // ───────────────────────── UNDUH PDF ─────────────────────────
  App.route('/admin/pdf', page('pdf', 'Unduh PDF', function (c) {
    const per = App.periodeAktif;
    c.innerHTML = '<div class="page-head"><div><h1>Unduh PDF</h1><p>Laporan per kelompok, gabungan satu bulan, atau gabungan dengan notulen.</p></div></div>' +
      '<div class="grid-3" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">' +
      '<section class="card pdf-card"><span class="ico-tile">' + icon('file') + '</span><div><b>Laporan per Kelompok</b><p class="muted" style="font-size:13px">Satu laporan lengkap dengan kop & logo.</p></div>' +
      '<div class="fields"><select class="select" data-b1>' + App.bulanOptions(per.bulan) + '</select><select class="select" data-t1>' + App.tahunOptions(per.tahun) + '</select></div><select class="select" data-k1></select>' + kopPick('s1') +
      '<button class="btn btn-primary" data-go1>' + icon('download') + ' Unduh PDF</button></section>' +
      '<section class="card pdf-card"><span class="ico-tile">' + icon('printer') + '</span><div><b>Gabungan Satu Bulan</b><p class="muted" style="font-size:13px">Halaman ringkasan + laporan tiap kelompok (halaman baru per kelompok).</p></div>' +
      '<div class="fields"><select class="select" data-b2>' + App.bulanOptions(per.bulan) + '</select><select class="select" data-t2>' + App.tahunOptions(per.tahun) + '</select></div>' + kopPick('s2') +
      '<button class="btn btn-primary" data-go2>' + icon('download') + ' Unduh Gabungan</button></section>' +
      '<section class="card pdf-card accent"><span class="ico-tile">' + icon('book') + '</span><div><b>Gabungan Laporan + Notulen</b><p class="muted" style="font-size:13px">Notulen di halaman awal, lalu rincian laporan per kelompok, dan daftar hadir di lembar terakhir.</p></div>' +
      '<button class="btn btn-deep" data-go3>' + icon('download') + ' Unduh Laporan & Notulen</button></section>' +
      '<section class="card pdf-card"><span class="ico-tile">' + icon('calCheck') + '</span><div><b>Daftar Hadir Musyawaroh</b><p class="muted" style="font-size:13px">Per kelompok lengkap dengan status, keterangan & persentase kehadiran.</p></div>' +
      '<select class="select" data-h4>' + (riwayatH().length ? riwayatH().map(x => '<option value="' + esc(x.sesiId) + '">' + esc(App.fmtTanggal(x.tanggal)) + ' — ' + esc(x.tempat) + '</option>').join('') : '<option value="">Belum ada sesi kehadiran</option>') + '</select>' +
      '<button class="btn btn-primary" data-go4>' + icon('download') + ' Unduh Daftar Hadir</button></section></div>';
    const q = s => c.querySelector(s);
    const fillK = () => {
      const ls = B.laporanPeriode(q('[data-b1]').value, q('[data-t1]').value);
      q('[data-k1]').innerHTML = ls.length ? ls.map(l => '<option value="' + esc(l.ID) + '">' + esc(B.namaKelompok(l)) + '</option>').join('') : '<option value="">Belum ada laporan pada periode ini</option>';
    };
    const fillS = n => {
      const sel = q('[data-' + n + ']');
      const def = App.sesiUntukPeriode(q('[data-b' + n.slice(1) + ']').value, q('[data-t' + n.slice(1) + ']').value);
      sel.innerHTML = '<option value="">— tanpa tanggal & tempat —</option>' + B.notulen().map(x => '<option value="' + esc(x.sesiId) + '"' + (def && def.sesiId === x.sesiId ? ' selected' : '') + '>' + esc(App.fmtTanggal(x.tanggal)) + ' — ' + esc(x.tempat) + '</option>').join('');
    };
    const infoDari = n => { const id = q('[data-' + n + ']').value; return App.kopInfo(B.notulen().find(x => x.sesiId === id)); };
    q('[data-b1]').onchange = () => { fillK(); fillS('s1'); }; q('[data-t1]').onchange = () => { fillK(); fillS('s1'); }; fillK(); fillS('s1');
    q('[data-b2]').onchange = () => fillS('s2'); q('[data-t2]').onchange = () => fillS('s2'); fillS('s2');
    q('[data-go1]').onclick = e => {
      const l = B.laporan().find(x => x.ID === q('[data-k1]').value);
      if (!l) { App.toast('Pilih laporan terlebih dahulu.', 'warn'); return; }
      App.pdf.run(e.currentTarget, () => App.pdf.laporan(l, infoDari('s1')));
    };
    q('[data-go2]').onclick = e => {
      const b = +q('[data-b2]').value, t = +q('[data-t2]').value;
      const ls = B.laporanPeriode(b, t);
      if (!ls.length) { App.toast('Belum ada laporan pada ' + App.periode(b, t) + '.', 'warn'); return; }
      App.pdf.run(e.currentTarget, () => App.pdf.gabungan(b, t, ls, B.wajib(), null, infoDari('s2')));
    };
    q('[data-go3]').onclick = () => pdfGabunganNotulen();
    q('[data-go4]').onclick = e => {
      const id = q('[data-h4]').value;
      if (!id) { App.toast('Belum ada sesi kehadiran yang tersimpan.', 'warn'); return; }
      App.pdf.run(e.currentTarget, async () => { const ss = await App.hadirAmbil([id]); if (!ss.length) throw new Error('Sesi kehadiran tidak ditemukan.'); await App.pdf.hadir(ss); });
    };
    App.idle(() => App.lib('jspdf').catch(() => {}));
  }));

  const riwayatH = () => (Store.data && Store.data.riwayatHadir) || [];

  /** Pilihan sesi notulen untuk baris "Tanggal : … Tempat : …" di kop PDF */
  function kopPick(n) {
    return '<label class="field" style="margin:0"><span class="label" style="font-size:12.5px">' + icon('calendar', 'sm') + ' Kop: tanggal & tempat musyawaroh</span><select class="select" data-' + n + '></select></label>';
  }

  async function pdfGabunganNotulen() {
    const ok = await App.confirm({ title: 'Unduh gabungan', message: 'Download semua laporan kelompok dan juga notulen bulan ini?', ok: 'Iya', cancel: 'Tidak' });
    if (!ok) return;
    const per = App.periodeAktif;
    const all = B.notulen();
    const nb = per.bulan === 12 ? 1 : per.bulan + 1, nt = per.bulan === 12 ? per.tahun + 1 : per.tahun;
    const pre = s => { const m = String(s.tanggal).slice(0, 7); return m === nt + '-' + String(nb).padStart(2, '0') || m === per.tahun + '-' + String(per.bulan).padStart(2, '0'); };
    const m = App.modal({
      title: 'Pilih isi PDF', wide: true,
      body: '<div class="fields"><div class="field"><label>Bulan laporan</label><select class="select" data-b>' + App.bulanOptions(per.bulan) + '</select></div><div class="field"><label>Tahun</label><select class="select" data-t>' + App.tahunOptions(per.tahun) + '</select></div></div>' +
        '<div class="row between" style="margin-top:18px"><span class="label" style="margin:0">Notulen yang disertakan</span><span><button class="btn btn-ghost btn-xs" data-all>Pilih Semua</button><button class="btn btn-ghost btn-xs" data-none>Kosongkan</button></span></div>' +
        '<div style="max-height:240px;overflow:auto;margin-top:8px" data-ns>' + (all.length ? all.map(s => '<label class="sesi-item check" style="display:flex"><input type="checkbox" value="' + esc(s.sesiId) + '" ' + (pre(s) ? 'checked' : '') + '><span><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b> — ' + esc(s.tempat) + ' <span class="muted">(' + esc(App.notulenInfo(s)) + ')</span></span></label>').join('') : '<div class="empty">Belum ada notulen.</div>') + '</div>' +
        '<div class="row between" style="margin-top:18px"><span class="label" style="margin:0">Daftar hadir yang disertakan <span class="muted" style="font-weight:500">(dicetak di lembar terakhir)</span></span></div>' +
        '<div style="max-height:200px;overflow:auto;margin-top:8px" data-hs>' + (riwayatH().length ? riwayatH().map(s => '<label class="sesi-item check" style="display:flex"><input type="checkbox" value="' + esc(s.sesiId) + '" ' + (pre(s) ? 'checked' : '') + '><span><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b> — ' + esc(s.tempat) + ' <span class="muted">(' + s.hadir + '/' + s.total + ' hadir)</span></span></label>').join('') : '<div class="empty">Belum ada sesi kehadiran.</div>') + '</div>',
      foot: '<button class="btn btn-soft" data-x>Batal</button><button class="btn btn-primary" data-go>' + icon('download') + ' Unduh PDF</button>',
    });
    const cbs = () => Array.from(m.el.querySelectorAll('[data-ns] input'));
    m.el.querySelector('[data-all]').onclick = () => cbs().forEach(x => { x.checked = true; });
    m.el.querySelector('[data-none]').onclick = () => cbs().forEach(x => { x.checked = false; });
    m.el.querySelector('[data-go]').onclick = async e => {
      const b = +m.el.querySelector('[data-b]').value, t = +m.el.querySelector('[data-t]').value;
      const ids = cbs().filter(x => x.checked).map(x => x.value);
      const sesi = all.filter(s => ids.indexOf(s.sesiId) >= 0).sort((x, y) => String(x.tanggal).localeCompare(String(y.tanggal)));
      const ls = B.laporanPeriode(b, t);
      const hids = Array.from(m.el.querySelectorAll('[data-hs] input')).filter(x => x.checked).map(x => x.value);
      if (!ls.length && !sesi.length && !hids.length) { App.toast('Tidak ada laporan, notulen, maupun daftar hadir untuk dicetak.', 'warn'); return; }
      await App.pdf.run(e.currentTarget, async () => {
        const hadir = hids.length ? (await App.hadirAmbil(hids)).sort((x, y) => String(x.tanggal).localeCompare(String(y.tanggal))) : [];
        await App.pdf.gabungan(b, t, ls, B.wajib(), sesi, undefined, hadir);
      });
      m.close(true);
    };
  }
  A.pdfGabunganNotulen = pdfGabunganNotulen;
})();
