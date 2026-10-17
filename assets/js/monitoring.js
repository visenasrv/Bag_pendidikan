/* ==========================================================================
   monitoring.js — Dashboard Monitoring & Bimbingan Akhlaq (v1.4)
   Sumber: jawaban Google Form monitoring orang tua generus (dibaca server,
   dipadatkan, lalu SEMUA perhitungan dilakukan di perangkat → filter instan).
   Umum : angka & persentase saja (tanpa nama anak / pelapor).
   Admin: + tabel data rinci dengan nama.
   Fitur mengikuti PRD "Dashboard Bimbingan dan Monitoring Orang Tua Generus":
   filter kategori (satu) + tahun/bulan/kelompok (banyak), kartu ringkasan,
   tren antar bulan, persentase bimbingan orang tua, 21 pertanyaan per kategori.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;
  const BLN = App.BULAN, BLN3 = App.BULAN_PENDEK;
  const FKEY = 'mp_mon_f';
  const WB = { sesuai: '#16A34A', belum: '#DC2626', catatan: '#2563EB' };

  /** warna jawaban sesuai makna (PRD F7) */
  function warnaJawab(t) {
    const s = String(t).toLowerCase();
    if (/diingatkan|sedikit arahan|dengan arahan/.test(s)) return '#2563EB';
    if (/kecanduan/.test(s) || /^belum/.test(s)) return '#DC2626';
    if (/kadang|kurang|cukup|sebagian|tidak terlalu/.test(s)) return '#EAB308';
    if (/^sudah|^baik|tanpa arahan|memahami dengan baik|secara umum sudah|^hafal tanpa/.test(s)) return '#16A34A';
    return '#9CA3AF';
  }

  function bacaFilter() {
    const f = App.ls.get(FKEY) || {};
    return { kat: typeof f.kat === 'number' ? f.kat : -1, tahun: f.tahun || [], bulan: f.bulan || [], kel: f.kel || [] };
  }

  // ───────────────────────── Pilihan ganda (dropdown kotak centang) ─────────────────────────
  function multi(host, label, opsi, pilih, onChange) {
    const teks = () => (!pilih.length ? label + ': Semua' : pilih.length === 1 ? (opsi.find(o => o.v === pilih[0]) || {}).t || label : label + ' (' + pilih.length + ' dipilih)');
    host.innerHTML = '<button class="ms-btn ' + (pilih.length ? 'on' : '') + '" type="button"><span>' + esc(teks()) + '</span>' + icon('chevD', 'sm') + '</button><div class="ms-panel hidden"></div>';
    const btn = host.querySelector('.ms-btn'), panel = host.querySelector('.ms-panel');
    const gambar = () => {
      panel.innerHTML = '<label class="ms-opt all"><input type="checkbox" ' + (!pilih.length ? 'checked' : '') + ' data-all><span>Semua</span></label>' +
        opsi.map(o => '<label class="ms-opt"><input type="checkbox" value="' + esc(String(o.v)) + '" ' + (pilih.indexOf(o.v) >= 0 ? 'checked' : '') + '><span>' + esc(o.t) + '</span>' + (o.n !== undefined ? '<small>' + App.fmtNum(o.n) + '</small>' : '') + '</label>').join('');
      panel.querySelector('[data-all]').onchange = () => { pilih.length = 0; gambar(); ubah(); };
      panel.querySelectorAll('input:not([data-all])').forEach(cb => {
        cb.onchange = () => {
          const o = opsi.find(x => String(x.v) === cb.value);
          const i = pilih.indexOf(o.v);
          if (cb.checked && i < 0) pilih.push(o.v); else if (!cb.checked && i >= 0) pilih.splice(i, 1);
          panel.querySelector('[data-all]').checked = !pilih.length;
          ubah();
        };
      });
    };
    const ubah = () => { btn.querySelector('span').textContent = teks(); btn.classList.toggle('on', !!pilih.length); onChange(); };
    btn.onclick = e => {
      e.stopPropagation();
      const buka = panel.classList.contains('hidden');
      document.querySelectorAll('.ms-panel').forEach(p => p.classList.add('hidden'));
      if (buka) { gambar(); panel.classList.remove('hidden'); }
    };
    panel.onclick = e => e.stopPropagation();
  }
  document.addEventListener('click', () => document.querySelectorAll('.ms-panel').forEach(p => p.classList.add('hidden')));

  // ───────────────────────── Tampilan dashboard ─────────────────────────
  App.monView = {
    /** el: wadah; D: data dari server; opt: { admin, onRefresh } */
    mount(el, D, opt) {
      opt = opt || {};
      const f = bacaFilter();
      const ab = {}; String(D.abjad || '').split('').forEach((c, i) => { ab[c] = i; });
      const kat = D.kat || [];
      if (f.kat >= kat.length) f.kat = -1;
      let charts = [];
      const hapusGrafik = () => { charts.forEach(c => { try { c.destroy(); } catch (e) { /* abaikan */ } }); charts = []; };
      App.onLeave(hapusGrafik);

      // pilihan filter dibuat dari data
      const hit = (idx) => { const m = {}; D.rows.forEach(r => { m[r[idx]] = (m[r[idx]] || 0) + 1; }); return m; };
      const hT = hit(1), hB = hit(2), hK = hit(3);
      const oTahun = Object.keys(hT).filter(t => +t).map(Number).sort((a, b) => b - a).map(t => ({ v: t, t: String(t), n: hT[t] }));
      const oBulan = Object.keys(hB).filter(b => +b).map(Number).sort((a, b) => a - b).map(b => ({ v: b, t: BLN[b - 1], n: hB[b] }));
      const oKel = D.kelompok.map((k, i) => ({ v: i, t: k, n: hK[i] || 0 }));
      f.tahun = f.tahun.filter(t => hT[t]); f.bulan = f.bulan.filter(b => hB[b]); f.kel = f.kel.filter(k => k < D.kelompok.length);

      const now = App.nowWita();
      el.innerHTML =
        '<section class="mon-head"><div class="grow"><div class="kick">' + icon('heart', 'sm') + ' Monitoring Bulanan</div><h1>Dashboard Monitoring &amp; Bimbingan Akhlaq</h1>' +
        '<p>Bimbingan dan monitoring orang tua generus · ' + App.fmtNum(D.rows.length) + ' laporan terekam · ' + esc(App.fmtTanggal(App.today())) + '</p>' +
        '<div class="row wrap" style="gap:6px;margin-top:10px"><span class="badge ok">' + icon('cloudCheck', 'sm') + ' Data dari Google Sheets · diperbarui ' + esc(App.fmtWaktu(D.dibuat, { noYear: true })) + '</span>' +
        (opt.admin ? '' : '<span class="badge">' + icon('shield', 'sm') + ' Tanpa nama anak</span>') + '</div></div>' +
        '<div class="mon-org"><b>PPG Kutai Timur</b><small>' + now.y + '</small>' + (opt.onRefresh ? '<button class="btn btn-soft btn-sm" data-refresh style="margin-top:8px">' + icon('refresh', 'sm') + ' Muat ulang data</button>' : '') + '</div></section>' +
        '<section class="card mon-filter"><div class="chips mon-kat" data-kat></div>' +
        '<div class="mon-ms"><div data-ms="tahun"></div><div data-ms="bulan"></div><div data-ms="kel"></div><button class="btn btn-ghost btn-sm" data-reset>' + icon('refresh', 'sm') + ' Reset filter</button></div></section>' +
        '<div data-isi></div>';

      const isi = el.querySelector('[data-isi]');
      const simpanF = () => App.ls.set(FKEY, f);
      const gambarKat = () => {
        const box = el.querySelector('[data-kat]');
        box.innerHTML = '<button class="chip ' + (f.kat < 0 ? 'on' : '') + '" data-k="-1">Semua Kategori</button>' + kat.map((k, i) => '<button class="chip ' + (f.kat === i ? 'on' : '') + '" data-k="' + i + '">' + esc(k) + '</button>').join('');
        box.querySelectorAll('[data-k]').forEach(b => {
          b.onclick = () => { const k = +b.getAttribute('data-k'); f.kat = f.kat === k ? -1 : k; simpanF(); gambarKat(); hitung(); };
        });
      };
      const ms = () => {
        multi(el.querySelector('[data-ms="tahun"]'), 'Tahun', oTahun, f.tahun, () => { simpanF(); hitung(); });
        multi(el.querySelector('[data-ms="bulan"]'), 'Bulan', oBulan, f.bulan, () => { simpanF(); hitung(); });
        multi(el.querySelector('[data-ms="kel"]'), 'Kelompok', oKel, f.kel, () => { simpanF(); hitung(); });
      };
      el.querySelector('[data-reset]').onclick = () => { f.kat = -1; f.tahun.length = 0; f.bulan.length = 0; f.kel.length = 0; simpanF(); gambarKat(); ms(); hitung(); };
      const rb = el.querySelector('[data-refresh]');
      if (rb) rb.onclick = () => opt.onRefresh(rb);

      const lolos = (r, abaikanBulan) => (f.kat < 0 || r[0] === f.kat) && (!f.tahun.length || f.tahun.indexOf(r[1]) >= 0) &&
        (abaikanBulan || !f.bulan.length || f.bulan.indexOf(r[2]) >= 0) && (!f.kel.length || f.kel.indexOf(r[3]) >= 0);

      const pct = (a, b) => (b ? Math.round(100 * a / b) : 0);
      const bar = segs => '<div class="sbar">' + segs.filter(s => s.n).map(s => '<i style="width:' + (100 * s.n / segs.reduce((x, y) => x + y.n, 0)) + '%;background:' + s.c + '" title="' + esc(s.t + ': ' + s.n) + '"></i>').join('') + '</div>';
      const legenda = (segs, tot) => '<ul class="sleg">' + segs.filter(s => s.n).map(s => '<li><span class="dot" style="background:' + s.c + '"></span><span class="t">' + esc(s.t) + '</span><b>' + pct(s.n, tot) + '%</b><small>' + App.fmtNum(s.n) + '</small></li>').join('') + '</ul>';

      let tabelBatas = 200, cari = '';
      const hitung = () => {
        hapusGrafik();
        const rows = D.rows.filter(r => lolos(r));
        // ── ringkasan
        const anak = new Set(), kelA = new Set(); let L = 0, P = 0;
        rows.forEach(r => { anak.add(r[5]); kelA.add(r[3]); if (r[4] === 1) L++; else if (r[4] === 2) P++; });
        // ── bimbingan orang tua
        const bimb = [['Bimbingan Ibadah', 6], ['Bimbingan Akhlak / Adab', 7], ['Bimbingan Kemandirian', 8]].map(b => {
          const c = [0, 0, 0, 0]; rows.forEach(r => { c[r[b[1]]]++; });
          const tot = c[1] + c[2] + c[3];
          return { t: b[0], tot: tot, segs: [{ t: 'Sesuai tema PPG bulan ini', n: c[1], c: WB.sesuai }, { t: 'Belum ada', n: c[2], c: WB.belum }, { t: 'Ada catatan khusus', n: c[3], c: WB.catatan }] };
        });
        // ── rekap per kelompok
        const perKel = {};
        rows.forEach(r => {
          const k = perKel[r[3]] || (perKel[r[3]] = { n: 0, anak: new Set(), s: [0, 0, 0], t: [0, 0, 0] });
          k.n++; k.anak.add(r[5]);
          [6, 7, 8].forEach((c, i) => { if (r[c]) { k.t[i]++; if (r[c] === 1) k.s[i]++; } });
        });
        const kelRows = Object.keys(perKel).map(i => Object.assign({ nama: D.kelompok[i] }, perKel[i])).sort((a, b) => b.n - a.n);

        isi.innerHTML =
          '<div class="mon-sum">' +
          [['file', 'Laporan Masuk', App.fmtNum(rows.length), 'baris laporan orang tua'], ['users', 'Anak Terpantau', App.fmtNum(anak.size), 'nama dinormalkan per kelompok'],
            ['user', 'Laki-laki / Perempuan', App.fmtNum(L) + ' <small>/</small> ' + App.fmtNum(P), pct(L, L + P) + '% · ' + pct(P, L + P) + '%'], ['building', 'Kelompok Aktif', App.fmtNum(kelA.size), 'mengirim laporan']]
            .map(x => '<div class="stat"><div class="lbl">' + x[1] + icon(x[0], 'sm') + '</div><div class="val">' + x[2] + '</div><div class="sub">' + x[3] + '</div></div>').join('') + '</div>' +

          '<div class="grid-2" style="margin-top:16px">' +
          '<section class="card"><div class="card-title">' + icon('bar') + ' Laporan Masuk per Bulan</div><div class="card-sub">Mengikuti filter kategori, tahun & kelompok · semua bulan ditampilkan</div><div class="chart-box" style="height:260px"><canvas data-c1></canvas></div></section>' +
          '<section class="card"><div class="card-title">' + icon('chart') + ' Tren Bimbingan "Sesuai Tema"</div><div class="card-sub">Persentase orang tua yang bimbingannya sesuai tema PPG</div><div class="chart-box" style="height:260px"><canvas data-c2></canvas></div><p class="muted" data-c2note style="font-size:12px;margin-top:6px"></p></section></div>' +

          '<section class="card" style="margin-top:16px"><div class="card-title">' + icon('heart') + ' Bimbingan Orang Tua Bulan Ini</div><div class="card-sub">Isian kosong tidak dihitung</div>' +
          bimb.map(b => '<div class="bimb"><div class="row between"><b>' + b.t + '</b><span class="muted" style="font-size:12.5px">' + App.fmtNum(b.tot) + ' terisi</span></div>' + bar(b.segs) + legenda(b.segs, b.tot) + '</div>').join('') + '</section>' +

          '<section class="card" style="margin-top:16px"><div class="card-head"><div><div class="card-title">' + icon('listCheck') + ' Persentase Jawaban per Pertanyaan</div><div class="card-sub">' +
          (f.kat >= 0 ? esc(kat[f.kat]) + ' · ' + App.fmtNum(rows.length) + ' laporan' : 'Pilih satu kategori usia') + '</div></div></div>' + tanyaHtml(rows) + '</section>' +

          '<section class="card" style="margin-top:16px;padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 8px"><div><div class="card-title">' + icon('users') + ' Rekap per Kelompok</div><div class="card-sub">% bimbingan sesuai tema PPG (dari isian terisi)</div></div></div>' +
          (kelRows.length ? '<div class="tbl-scroll"><table class="tbl mon-tbl"><thead><tr><th>Kelompok</th><th class="r">Laporan</th><th class="r">Anak</th><th class="r">Ibadah</th><th class="r">Akhlak</th><th class="r">Mandiri</th></tr></thead><tbody>' +
            kelRows.map(k => '<tr><td><b>' + esc(k.nama) + '</b></td><td class="r num">' + App.fmtNum(k.n) + '</td><td class="r num">' + App.fmtNum(k.anak.size) + '</td>' +
              k.s.map((s, i) => { const p = pct(s, k.t[i]); return '<td class="r num"><span class="pctc" style="--p:' + p + '%">' + (k.t[i] ? p + '%' : '—') + '</span></td>'; }).join('') + '</tr>').join('') + '</tbody></table></div>' : '<div class="empty">Tidak ada data</div>') + '</section>' +

          (opt.admin && D.nama ? '<section class="card" style="margin-top:16px;padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 8px;flex-wrap:wrap"><div><div class="card-title">' + icon('file') + ' Data Rinci</div><div class="card-sub" data-rinci-n></div></div>' +
            '<div class="input-wrap" style="min-width:220px"><input class="input" data-cari placeholder="Cari nama anak / pelapor…" value="' + esc(cari) + '" style="min-height:40px;padding-left:38px"><span style="position:absolute;left:11px;top:10px;color:var(--muted)">' + icon('search', 'sm') + '</span></div></div><div data-rinci></div></section>' : '');

        if (opt.admin && D.nama) rinci(rows);
        grafik();
      };

      const tanyaHtml = rows => {
        if (f.kat < 0) {
          return '<div class="empty" style="padding:24px">' + icon('listCheck') + '<b>Pilih satu kategori usia</b><p>Setiap kategori punya 21 pertanyaan yang berbeda.</p><div class="chips" style="justify-content:center;margin-top:12px">' +
            kat.map((k, i) => '<button class="chip" data-pk="' + i + '">' + esc(k) + '</button>').join('') + '</div></div>';
        }
        if (!rows.length) return '<div class="empty">Belum ada laporan untuk kombinasi filter ini.</div>';
        const tanya = D.tanya[f.kat] || [];
        return '<div class="tanya-grid">' + tanya.map((q, qi) => {
          const m = {};
          rows.forEach(r => { const ch = r[9].charAt(qi); if (ch && ch !== ' ') m[ch] = (m[ch] || 0) + 1; });
          const segs = Object.keys(m).map(ch => { const t = D.jawaban[ab[ch]] || 'Lainnya'; return { t: t, n: m[ch], c: warnaJawab(t) }; }).sort((a, b) => b.n - a.n);
          const tot = segs.reduce((a, b) => a + b.n, 0);
          return '<div class="tanya"><div class="tq"><span class="no">' + String(qi + 1).padStart(2, '0') + '/21</span>' + esc(q.replace(/^\d+\.\s*/, '')) + '</div>' + (tot ? bar(segs) + legenda(segs, tot) : '<div class="muted" style="font-size:13px">Belum ada jawaban</div>') + '</div>';
        }).join('') + '</div>';
      };

      const rinci = rows => {
        const box = isi.querySelector('[data-rinci]');
        const q = cari.trim().toLowerCase();
        const list = q ? rows.filter(r => (D.nama[r[5]] || '').toLowerCase().indexOf(q) >= 0 || String(r[11] || '').toLowerCase().indexOf(q) >= 0) : rows;
        isi.querySelector('[data-rinci-n]').textContent = App.fmtNum(list.length) + ' baris' + (list.length > tabelBatas ? ' · menampilkan ' + tabelBatas + ' pertama' : '');
        box.innerHTML = list.length ? '<div class="tbl-scroll" style="max-height:420px"><table class="tbl mon-tbl sticky"><thead><tr><th>Bulan</th><th>Kelompok</th><th>Nama Anak</th><th class="r">Umur</th><th>L/P</th><th>Kategori</th><th>Pelapor</th></tr></thead><tbody>' +
          list.slice(0, tabelBatas).map(r => '<tr><td>' + (r[2] ? BLN3[r[2] - 1] + ' ' + String(r[1]).slice(2) : '—') + '</td><td>' + esc(D.kelompok[r[3]]) + '</td><td><b>' + esc(D.nama[r[5]]) + '</b></td><td class="r num">' + esc(r[10] || '') + '</td><td>' + (r[4] === 1 ? 'L' : r[4] === 2 ? 'P' : '—') + '</td><td>' + esc(kat[r[0]]) + '</td><td>' + esc(r[11] || '') + '</td></tr>').join('') +
          '</tbody></table></div>' + (list.length > tabelBatas ? '<div style="padding:10px;text-align:center"><button class="btn btn-ghost btn-sm" data-more>Tampilkan 300 lagi</button></div>' : '') : '<div class="empty">Tidak ada data</div>';
        const mb = box.querySelector('[data-more]');
        if (mb) mb.onclick = () => { tabelBatas += 300; rinci(rows); };
        const ci = isi.querySelector('[data-cari]');
        ci.oninput = App.debounce(() => { cari = ci.value; tabelBatas = 200; rinci(rows); }, 200);
      };

      const grafik = async () => {
        isi.querySelectorAll('[data-pk]').forEach(b => { b.onclick = () => { f.kat = +b.getAttribute('data-pk'); simpanF(); gambarKat(); hitung(); }; });
        try { await App.lib('chart'); } catch (e) { isi.querySelectorAll('.chart-box').forEach(b => { b.innerHTML = '<div class="empty">' + icon('cloudOff') + 'Grafik tidak dapat dimuat.</div>'; }); return; }
        const c1 = isi.querySelector('[data-c1]'), c2 = isi.querySelector('[data-c2]');
        if (!c1 || !c1.isConnected) return;
        // tren: abaikan filter bulan
        const per = {};
        D.rows.forEach(r => {
          if (!r[1] || !r[2] || !lolos(r, true)) return;
          const k = r[1] * 100 + r[2];
          const o = per[k] || (per[k] = { n: 0, s: [0, 0, 0], t: [0, 0, 0] });
          o.n++;
          [6, 7, 8].forEach((c, i) => { if (r[c]) { o.t[i]++; if (r[c] === 1) o.s[i]++; } });
        });
        const keys = Object.keys(per).map(Number).sort((a, b) => a - b);
        const lab = keys.map(k => BLN3[k % 100 - 1] + ' ' + String(Math.floor(k / 100)).slice(2));
        const Chart = window.Chart;
        const dark = App.theme.isDark();
        const grid = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
        Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
        Chart.defaults.color = dark ? '#9DB3AA' : '#5B6B65';
        if (keys.length < 2) {
          c1.parentElement.innerHTML = c2.parentElement.innerHTML = '<div class="empty">Data kurang dari dua bulan — tren belum bisa digambar.</div>';
          return;
        }
        const brand = App.brand.hex('--b-mid') || '#047857';
        charts.push(new Chart(c1, {
          type: 'bar',
          data: { labels: lab, datasets: [{ label: 'Laporan', data: keys.map(k => per[k].n), backgroundColor: brand, borderRadius: 5, maxBarThickness: 42 }] },
          options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } } } },
        }));
        const kecil = keys.filter(k => per[k].n < 5);
        const ln = (label, i, color) => ({ label: label, data: keys.map(k => (per[k].n < 5 || !per[k].t[i] ? null : Math.round(1000 * per[k].s[i] / per[k].t[i]) / 10)), borderColor: color, backgroundColor: color, tension: .3, spanGaps: true, pointRadius: 3, borderWidth: 2.4 });
        charts.push(new Chart(c2, {
          type: 'line',
          data: { labels: lab, datasets: [ln('Ibadah', 0, brand), ln('Akhlak / Adab', 1, '#E0A100'), ln('Kemandirian', 2, '#2563EB')] },
          options: {
            responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, interaction: { mode: 'index', intersect: false },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } }, tooltip: { callbacks: { label: c => c.dataset.label + ': ' + c.formattedValue + '%' } } },
            scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, grid: { color: grid }, ticks: { callback: v => v + '%' } } },
          },
        }));
        isi.querySelector('[data-c2note]').textContent = kecil.length ? 'Tidak digambar (kurang dari 5 laporan): ' + kecil.map(k => BLN3[k % 100 - 1] + ' ' + String(Math.floor(k / 100)).slice(2)).join(', ') + '.' : '';
      };

      gambarKat(); ms(); hitung();
    },
  };

  // ───────────────────────── Halaman umum ─────────────────────────
  App.route('/monitoring', function (p, vid) {
    if (!App.api.configured()) { App.go('/', true); return; }
    const root = App.mount('<div class="pub pub-wide">' + App.pub.topbar('Monitoring & Bimbingan Akhlaq', 'Laporan bulanan orang tua generus') +
      '<div data-body><div class="skeleton" style="height:120px"></div><div class="skeleton" style="height:80px;margin-top:12px"></div><div class="skeleton" style="height:260px;margin-top:12px"></div></div></div>');
    App.pub.bindTop(root);
    const body = root.querySelector('[data-body]');
    const muat = () => App.data.monitoring(d => { if (App.alive(vid) && d) App.monView.mount(body, d, { admin: false }); }).catch(e => {
      if (!App.alive(vid)) return;
      body.innerHTML = '<div class="card"><div class="notice err">' + icon('cloudOff') + '<div class="grow"><b>Data monitoring belum bisa dimuat</b>' + esc(e.message) + '</div></div><button class="btn btn-outline btn-block" style="margin-top:12px" data-retry>' + icon('refresh') + ' Coba Lagi</button></div>';
      body.querySelector('[data-retry]').onclick = muat;
    });
    muat();
  });
})();
