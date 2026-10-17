/* ==========================================================================
   dash.js — Tampilan dashboard bersama (publik & admin) · v1.3
   Satu penggambar untuk: status laporan, total generus, 7 statistik
   (termasuk Muda-Mudi), grafik per kelompok & tren tahunan, dan
   filter kelompok. Admin menambah tombol kunci & laporan terbaru sendiri.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;
  /** warna grafik mengikuti warna utama aplikasi (v1.4) */
  const warna = () => {
    const v = n => App.brand.hex(n);
    return { caberawit: v('--b-deep') || '#064E3B', praremaja: v('--b-mid2') || '#059669', remaja: v('--b-soft') || '#6EE7B7', pranikah: '#F2C94C', garis: v('--b-mid') || '#047857' };
  };
  const NOL = () => ({ caberawit: 0, praremaja: 0, remaja: 0, pranikah: 0, total: 0, mondok: 0, mubaligh: 0, mudamudi: 0 });
  const jumlah = list => list.reduce((r, x) => { Object.keys(r).forEach(k => { r[k] += App.num(x.rekap && x.rekap[k]); }); return r; }, NOL());

  /**
   * Model:
   *  { tahun, bulan, wajib:[{id,nama}], months:[{ bulan, items:[{id,nama,wajib,waktuKirim,waktuUbah,rekap,lapId}], terkunci, tutupBaru }] ×12 }
   */
  App.dashModel = {
    /** dari bundle admin (semua laporan tersedia lokal) */
    admin(per) {
      const B = App.B;
      const wajib = B.wajib().map(k => ({ id: k.id, nama: k.nama }));
      const semua = B.laporan().filter(l => +l.Tahun === +per.tahun);
      const months = [];
      for (let b = 1; b <= 12; b++) {
        const ku = B.kunci(b, per.tahun);
        months.push({
          bulan: b, terkunci: !!ku.terkunci, tutupBaru: !!ku.tutupBaru,
          items: semua.filter(l => +l.Bulan === b).map(l => ({
            id: l.KelompokID, nama: B.namaKelompok(l), wajib: wajib.some(k => k.id === l.KelompokID),
            waktuKirim: l.WaktuKirim, waktuUbah: l.WaktuUbah, rekap: App.rekap([l]), lapId: l.ID,
          })),
        });
      }
      return { tahun: +per.tahun, bulan: +per.bulan, wajib: wajib, months: months };
    },
    /** dari getDashboardPublik */
    publik(d, bulan) {
      const b0 = (d.bulan && d.bulan[0]) || { status: [] };
      const wajib = (b0.status || []).map(s => ({ id: s.id, nama: s.nama }));
      const months = (d.bulan || []).map(b => ({
        bulan: b.bulan, terkunci: !!b.terkunci, tutupBaru: !!b.tutupBaru,
        // server v1.3 mengirim rekap per kelompok; server lama hanya status (angka per kelompok = 0)
        items: b.kelompok || (b.status || []).filter(s => s.sudah).map(s => ({ id: s.id, nama: s.nama, wajib: true, waktuKirim: s.waktuKirim, waktuUbah: s.waktuUbah, rekap: null })),
        rekapLama: b.kelompok ? null : b.rekap,
      }));
      return { tahun: +d.tahun, bulan: +bulan, wajib: wajib, months: months };
    },
  };

  /** Daftar kelompok untuk filter (wajib + yang pernah lapor tahun ini) */
  App.dashKelompok = function (m) {
    const out = m.wajib.slice();
    m.months.forEach(mo => mo.items.forEach(it => { if (!out.some(k => k.id === it.id)) out.push({ id: it.id, nama: it.nama }); }));
    return out;
  };

  App.kelompokSelect = function (m, sel) {
    return '<select class="select" data-kel aria-label="Filter kelompok"><option value="">Semua kelompok</option>' +
      App.dashKelompok(m).map(k => '<option value="' + esc(k.id) + '"' + (k.id === sel ? ' selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select>';
  };

  const charts = new WeakMap();
  function destroy(c) { (charts.get(c) || []).forEach(x => { try { x.destroy(); } catch (e) { /* abaikan */ } }); charts.set(c, []); }
  App.dashDestroy = destroy;

  /** Gambar dashboard ke elemen c. opt: { kelompok, onOpen(item), lockBadge:true } */
  App.dashRender = function (c, m, opt) {
    opt = opt || {};
    destroy(c);
    const kel = opt.kelompok || '';
    const mo = m.months[m.bulan - 1] || { items: [] };
    const periode = App.periode(m.bulan, m.tahun);
    const items = kel ? mo.items.filter(i => i.id === kel) : mo.items;
    const wajib = kel ? m.wajib.filter(k => k.id === kel) : m.wajib;
    const r = !kel && mo.rekapLama ? Object.assign(NOL(), mo.rekapLama) : jumlah(items);
    const sudah = m.wajib.filter(k => mo.items.some(i => i.id === k.id));
    const namaKel = kel ? ((App.dashKelompok(m).find(k => k.id === kel) || {}).nama || '') : '';
    const kartu = wajib.length ? wajib : (kel ? [{ id: kel, nama: namaKel }] : []);

    c.innerHTML =
      '<section class="card"><div class="card-head" style="flex-wrap:wrap"><div><div class="card-title">Status Laporan ' + esc(periode) + '</div><div class="card-sub"><b>' + sudah.length + '/' + m.wajib.length + '</b> kelompok wajib sudah lapor' + (kel ? ' · menampilkan <b>' + esc(namaKel) + '</b>' : '') + '</div></div>' +
      (mo.terkunci ? '<span class="badge">' + icon('lock', 'sm') + ' Bulan Terkunci' + (mo.tutupBaru ? ' · kiriman baru ditutup' : '') + '</span>' : '<span class="badge ok">' + icon('unlock', 'sm') + ' Bulan Terbuka</span>') + '</div>' +
      '<div class="status-grid">' + (kartu.length ? kartu.map(k => {
        const it = mo.items.find(x => x.id === k.id);
        return '<div class="status-card ' + (it ? '' : 'pending') + '" ' + (it && opt.onOpen ? 'data-open="' + esc(k.id) + '" style="cursor:pointer"' : '') + '><div class="top"><b>' + esc(k.nama) + '</b>' +
          (it ? '<span class="badge ok">' + icon('checkCircle', 'sm') + ' Sudah</span>' : '<span class="badge warn">' + icon('clock', 'sm') + ' Belum</span>') + '</div>' +
          '<small>' + (it ? 'Terkirim ' + esc(App.fmtWaktu(it.waktuKirim, { wita: true })) : 'Menunggu pengiriman') + '</small>' +
          (it && it.rekap ? '<small class="num">' + App.fmtNum(it.rekap.total) + ' generus · ' + App.fmtNum(it.rekap.mudamudi) + ' muda-mudi</small>' : '') + '</div>';
      }).join('') : '<div class="empty">Belum ada kelompok wajib lapor.</div>') + '</div></section>' +

      '<div class="grid" style="margin-top:16px;grid-template-columns:1fr">' +
      '<div class="stat-hero"><div class="row between"><div class="lbl">Total Generus · ' + esc(kel ? namaKel + ' · ' : '') + esc(periode) + '</div><span class="badge deep">' + icon('users', 'sm') + '</span></div>' +
      '<div class="val num">' + App.fmtNum(r.total) + '<small>Orang</small></div><div class="sub">Caberawit + Praremaja + Remaja + Pranikah' + (kel ? '' : ' · dari ' + sudah.length + '/' + m.wajib.length + ' kelompok yang sudah lapor') + '</div></div>' +
      '<div class="stats wide s7">' +
      [['Caberawit', r.caberawit, 'smile', 'Usia TK – SD'], ['Praremaja', r.praremaja, 'cap', 'Usia SMP'], ['Remaja', r.remaja, 'users', 'Usia SMA / SMK'], ['Pranikah', r.pranikah, 'heart', 'Mandiri & usia nikah'],
        ['Muda-Mudi', r.mudamudi, 'sparkle', 'Jumlah muda-mudi'], ['Mondok', r.mondok, 'building', 'Sedang mondok'], ['Mubaligh', r.mubaligh, 'mic', 'Lulusan pondok']]
        .map(x => '<div class="stat"><div class="lbl">' + x[0] + icon(x[2], 'sm') + '</div><div class="val">' + App.fmtNum(x[1]) + '<small>orang</small></div><div class="sub">' + x[3] + '</div></div>').join('') +
      '</div></div>' +

      '<div class="grid-2" style="margin-top:16px">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bar') + ' Jumlah Generus per Kelompok</div><div class="card-sub">Distribusi jenjang · ' + esc(periode) + '</div></div></div><div class="chart-box"><canvas data-c1></canvas></div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Perkembangan Generus ' + m.tahun + '</div><div class="card-sub">' + (kel ? esc(namaKel) + ' · ' : '') + 'Jan–Des · klik legenda untuk tampil/sembunyi</div></div></div><div class="chart-box"><canvas data-c2></canvas></div></section>' +
      '</div>';

    if (opt.onOpen) c.querySelectorAll('[data-open]').forEach(el => { el.onclick = () => opt.onOpen(mo.items.find(i => i.id === el.getAttribute('data-open'))); });
    drawCharts(c, m, kel, items);
  };

  async function drawCharts(c, m, kel, items) {
    try { await App.lib('chart'); } catch (e) {
      c.querySelectorAll('.chart-box').forEach(b => { b.innerHTML = '<div class="empty">' + icon('cloudOff') + 'Grafik tidak dapat dimuat (periksa koneksi).</div>'; });
      return;
    }
    if (!c.isConnected || !c.querySelector('[data-c1]')) return;
    destroy(c);
    const Chart = window.Chart;
    const dark = App.theme.isDark();
    const WARNA = warna();
    const grid = dark ? 'rgba(255,255,255,.08)' : 'rgba(6,78,59,.08)';
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.color = dark ? '#9DB3AA' : '#5B6B65';
    const list = kel ? m.wajib.filter(k => k.id === kel) : m.wajib.slice();
    items.forEach(i => { if (!list.some(k => k.id === i.id)) list.push({ id: i.id, nama: i.nama }); });
    const val = (k, f) => { const i = items.find(x => x.id === k.id); return i && i.rekap ? App.num(i.rekap[f]) : 0; };
    const ds = [['Caberawit', 'caberawit'], ['Praremaja', 'praremaja'], ['Remaja', 'remaja'], ['Pranikah', 'pranikah']];
    const totalLabel = {
      id: 'totalLabel',
      afterDatasetsDraw(chart) {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(chart.data.datasets.length - 1);
        ctx.save();
        ctx.font = '700 12px ' + Chart.defaults.font.family;
        ctx.fillStyle = dark ? '#E3F5ED' : '#0F1F1A';
        ctx.textAlign = 'center';
        meta.data.forEach((bar, i) => {
          const tot = chart.data.datasets.reduce((s, d, di) => s + (chart.isDatasetVisible(di) ? (d.data[i] || 0) : 0), 0);
          if (tot) ctx.fillText(tot, bar.x, bar.y - 6);
        });
        ctx.restore();
      },
    };
    const arr = [];
    arr.push(new Chart(c.querySelector('[data-c1]'), {
      type: 'bar',
      data: { labels: list.map(k => k.nama), datasets: ds.map(d => ({ label: d[0], data: list.map(k => val(k, d[1])), backgroundColor: WARNA[d[1]], borderRadius: 4, maxBarThickness: 56 })) },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        layout: { padding: { top: 18 } },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } }, tooltip: { mode: 'index', intersect: false } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } } },
      },
      plugins: [totalLabel],
    }));
    // Tren bulanan: bulan tanpa laporan = kosong (null), bukan 0
    const bulanData = m.months.map(mo => {
      const its = kel ? mo.items.filter(i => i.id === kel) : mo.items;
      if (!its.length) return null;
      return !kel && mo.rekapLama ? mo.rekapLama : jumlah(its);
    });
    const line = (label, key, color, wide, dash) => ({
      label: label, data: bulanData.map(r => (r ? r[key] || 0 : null)), borderColor: color, backgroundColor: wide ? (dark ? 'rgba(16,185,129,.15)' : 'rgba(4,120,87,.10)') : color,
      fill: !!wide, tension: .3, spanGaps: false, borderWidth: wide ? 3 : 2, pointRadius: wide ? 4 : 2.5, pointHoverRadius: 6, borderDash: dash ? [6, 4] : undefined,
    });
    arr.push(new Chart(c.querySelector('[data-c2]'), {
      type: 'line',
      data: {
        labels: App.BULAN_PENDEK,
        datasets: [line('Total Generus', 'total', dark ? App.brand.hex('--link') : WARNA.garis, true), line('Caberawit', 'caberawit', dark ? '#A7F3D0' : WARNA.caberawit), line('Praremaja', 'praremaja', WARNA.praremaja),
          line('Remaja', 'remaja', WARNA.remaja), line('Pranikah', 'pranikah', '#E0B43C'), line('Muda-Mudi', 'mudamudi', dark ? '#93C5FD' : '#2563EB', false, true)],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: grid }, ticks: { precision: 0 } } },
      },
    }));
    charts.set(c, arr);
  }
})();
