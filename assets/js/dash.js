/* ==========================================================================
   dash.js — Tampilan dashboard bersama (publik & admin) · v1.3
   v1.7: grafik perkembangan persentase kehadiran; rata-rata per jenjang di bawah tabel per kelompok
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
            waktuKirim: l.WaktuKirim, waktuUbah: l.WaktuUbah, rekap: App.rekap([l]), mutu: App.mutu(l), lapId: l.ID,
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

      mutuHtml(m, items, kel, periode) +

      '<div class="grid-2" style="margin-top:16px">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('bar') + ' Jumlah Generus per Kelompok</div><div class="card-sub">Distribusi jenjang · ' + esc(periode) + '</div></div></div><div class="chart-box"><canvas data-c1></canvas></div></section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Perkembangan Generus ' + m.tahun + '</div><div class="card-sub">' + (kel ? esc(namaKel) + ' · ' : '') + 'Jan–Des · klik legenda untuk tampil/sembunyi</div></div></div><div class="chart-box"><canvas data-c2></canvas></div></section>' +
      '</div>' +
      '<section class="card" style="margin-top:16px"><div class="card-head"><div><div class="card-title">' + icon('chart') + ' Perkembangan Persentase Kehadiran ' + m.tahun + '</div><div class="card-sub">' + (kel ? esc(namaKel) + ' · ' : 'Rata-rata semua kelompok (ditimbang jumlah peserta) · ') + 'Jan–Des · klik legenda untuk tampil/sembunyi</div></div></div><div class="chart-box" style="height:300px"><canvas data-c3></canvas></div></section>';

    if (opt.onOpen) c.querySelectorAll('[data-open]').forEach(el => { el.onclick = () => opt.onOpen(mo.items.find(i => i.id === el.getAttribute('data-open'))); });
    drawCharts(c, m, kel, items);
  };

  // ───────────────────────── Mutu KBM (v1.6) ─────────────────────────
  const kelasPct = v => (v === null ? 'na' : v >= 80 ? 'hi' : v >= 60 ? 'md' : 'lo');
  function meter(label, v, sub) {
    return '<div class="mutu-row ' + kelasPct(v) + '"><div class="mr-l"><b>' + esc(label) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>' +
      '<div class="mr-bar"><i style="width:' + (v === null ? 0 : Math.min(100, v)) + '%"></i></div><span class="mr-v num">' + (v === null ? '—' : App.fmtPct(v)) + '</span></div>';
  }
  const tdPct = v => '<td class="r num"><span class="pctc ' + kelasPct(v) + '" style="--p:' + (v === null ? 0 : v) + '%">' + (v === null ? '—' : App.fmtPct(v)) + '</span></td>';
  const kosong = t => !t || /^(-|tidak ada|tdk ada|belum ada|nihil|kosong|libur)\.?$/i.test(String(t).trim());

  function mutuHtml(m, items, kel, periode) {
    const its = items.filter(i => i.mutu);
    if (!items.length) return '';
    if (!its.length) return '<section class="card" style="margin-top:16px"><div class="notice">' + icon('info') + '<div>Persentase kehadiran & materi tampil setelah server diperbarui ke v1.6.</div></div></section>';
    const rH = App.JENJANG_HADIR.map((j, i) => App.rataPct(its, 'h', i));
    const rM = App.JENJANG_MATERI.map((j, i) => App.rataPct(its, 'm', i));
    const thf = its.filter(i => i.mutu.thf);
    const totThf = thf.reduce((a, i) => a + (i.mutu.thf.jml || 0), 0);
    const urut = (a, b) => String(a.nama).localeCompare(String(b.nama));
    const sepCell = (html, x) => (x === 0 ? html.replace('<td class="r num', '<td class="r num sep') : html);
    // v1.7: rata-rata per jenjang langsung di bawah tabel per kelompok (angka saja)
    const rataTd = (v, x, mat) => sepCell('<td class="r num rata ' + kelasPct(v) + '">' + (v === null ? '—' : App.fmtPct(Math.round(v * 10) / 10)) + '</td>', mat ? x : -1);
    return '<section class="card mutu-card" style="margin-top:16px;padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 8px"><div><div class="card-title">' + icon('listCheck') + ' Kehadiran & Materi per Kelompok</div><div class="card-sub">' + esc(periode) + ' · persentase kehadiran tiap jenjang & materi tersampaikan</div></div></div>' +
        '<div class="tbl-scroll"><table class="tbl mon-tbl mutu-tbl"><thead><tr><th rowspan="2">Kelompok</th><th colspan="6" class="c">Kehadiran</th><th colspan="3" class="c sep">Materi</th></tr><tr>' +
        ['Cbr', 'Prm', 'Rmj', 'Pnk', 'MM', 'Thf', 'Cbr', 'Prm', 'Rmj'].map((h, i) => '<th class="r' + (i === 6 ? ' sep' : '') + '">' + h + '</th>').join('') + '</tr></thead><tbody>' +
        its.slice().sort(urut).map(i => '<tr><td><b>' + esc(i.nama) + '</b></td>' + i.mutu.h.map(v => tdPct(v)).join('') + i.mutu.m.map((v, x) => sepCell(tdPct(v), x)).join('') + '</tr>').join('') +
        '</tbody><tfoot><tr><td><b>Rata-rata</b><small>' + (its.length > 1 ? its.length + ' kelompok · ditimbang jumlah peserta' : '1 kelompok') + '</small></td>' + rH.map((v, x) => rataTd(v, x, false)).join('') + rM.map((v, x) => rataTd(v, x, true)).join('') + '</tr></tfoot></table></div>' +
        '<div class="mutu-foot"><span class="muted">Cbr Caberawit · Prm Praremaja · Rmj Remaja · Pnk Pranikah (rata-rata sambung) · MM Muda-Mudi · Thf Tahfidz</span><span class="mutu-leg"><span class="hi">≥ 80%</span><span class="md">60–79%</span><span class="lo">&lt; 60%</span></span></div></section>' +

      '<div class="grid-2" style="margin-top:16px">' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('book') + ' Kelas Tahfidz</div><div class="card-sub">' + (thf.length ? thf.length + ' dari ' + its.length + ' kelompok punya kelas tahfidz · ' + App.fmtNum(totThf) + ' peserta' : 'Belum ada kelompok yang punya kelas tahfidz') + '</div></div></div>' +
      (thf.length ? '<div class="thf-list">' + thf.slice().sort(urut).map(i => '<div class="thf-item"><div class="grow"><b>' + esc(i.nama) + '</b><small>' + icon('clock', 'sm') + ' ' + esc(i.mutu.thf.jadwal || 'Jadwal belum diisi') + '</small></div>' +
        '<div class="thf-n"><b class="num">' + App.fmtNum(i.mutu.thf.jml) + '</b><small>peserta</small></div><span class="pctc ' + kelasPct(i.mutu.h[5]) + '" style="--p:' + (i.mutu.h[5] || 0) + '%">' + App.fmtPct(i.mutu.h[5]) + '</span></div>').join('') + '</div>'
        : '<div class="empty">' + icon('book') + 'Belum ada kelas tahfidz pada ' + esc(periode) + '.</div>') + '</section>' +
      '<section class="card"><div class="card-head"><div><div class="card-title">' + icon('sparkle') + ' Kegiatan Muda-Mudi</div><div class="card-sub">Minggu 1–4 · ' + esc(periode) + '</div></div></div>' +
      '<div class="mm-list">' + its.slice().sort(urut).map(i => {
        const mm = i.mutu.mm;
        return '<div class="mm-item"><div class="mm-h"><b>' + esc(i.nama) + '</b><span class="muted">' + App.fmtNum(i.rekap ? i.rekap.mudamudi : 0) + ' muda-mudi</span><span class="pctc ' + kelasPct(i.mutu.h[4]) + '" style="--p:' + (i.mutu.h[4] || 0) + '%">' + App.fmtPct(i.mutu.h[4]) + '</span></div>' +
          '<ol class="mm-w">' + [0, 1, 2, 3].map(w => '<li class="' + (kosong(mm[w]) ? 'off' : '') + '"><span>M' + (w + 1) + '</span>' + esc(mm[w] || '—') + '</li>').join('') + '</ol>' +
          (mm[4] && !kosong(mm[4]) ? '<div class="mm-lain"><span>Lainnya</span>' + esc(mm[4]) + '</div>' : '') + '</div>';
      }).join('') + '</div></section></div>';
  }

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
    // v1.7: tren persentase kehadiran per jenjang (bulan tanpa laporan = kosong)
    const c3 = c.querySelector('[data-c3]');
    if (c3) {
      const WJ = [dark ? '#A7F3D0' : WARNA.caberawit, dark ? '#7DD3FC' : '#0284C7', dark ? '#FDBA74' : '#EA580C', '#E0B43C', dark ? '#93C5FD' : '#2563EB', dark ? '#F0ABFC' : '#A21CAF'];
      const perBulan = m.months.map(mo => (kel ? mo.items.filter(i => i.id === kel) : mo.items).filter(i => i.mutu));
      arr.push(new Chart(c3, {
        type: 'line',
        data: {
          labels: App.BULAN_PENDEK,
          datasets: App.JENJANG_HADIR.map((j, x) => ({
            label: j, data: perBulan.map(its => { const v = its.length ? App.rataPct(its, 'h', x) : null; return v === null ? null : Math.round(v * 10) / 10; }),
            borderColor: WJ[x], backgroundColor: WJ[x], tension: .3, spanGaps: false, borderWidth: 2.2, pointRadius: 3, pointHoverRadius: 6, borderDash: x >= 4 ? [6, 4] : undefined,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: { duration: 250 },
          interaction: { mode: 'index', intersect: false },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, useBorderRadius: true, borderRadius: 3 } }, tooltip: { callbacks: { label: t => t.dataset.label + ': ' + App.fmtPct(t.parsed.y) } } },
          scales: { x: { grid: { display: false } }, y: { min: 0, max: 100, grid: { color: grid }, ticks: { callback: v => v + '%' } } },
        },
      }));
    }
    charts.set(c, arr);
  }
})();
