/* ==========================================================================
   musyawaroh.js — Mode Musyawaroh layar penuh (proyektor/TV)
   Urutan: (1) ringkasan status & rekap → (2) satu layar per kelompok →
   (3) notulen terpilih. Navigasi: tombol panah, keyboard/klik presenter,
   geser di layar sentuh. Esc/Keluar kembali ke admin. Daftar hadir TIDAK
   ditampilkan.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon, B = App.B;

  App.route('/admin/musyawaroh', App.admin.page('musyawaroh', 'Mode Musyawaroh', function (c) {
    const per = App.periodeAktif;
    const all = B.notulen();
    const nb = per.bulan === 12 ? 1 : per.bulan + 1, nt = per.bulan === 12 ? per.tahun + 1 : per.tahun;
    const pre = s => { const m = String(s.tanggal).slice(0, 7); return m === nt + '-' + String(nb).padStart(2, '0') || m === per.tahun + '-' + String(per.bulan).padStart(2, '0'); };
    const sel = c._sel || new Set(all.filter(pre).map(s => s.sesiId));
    c._sel = sel;
    const list = B.laporanPeriode(per.bulan, per.tahun);
    const wajib = B.wajib();
    c.innerHTML = '<div class="page-head"><div><h1>Mode Musyawaroh</h1><p>Tampilkan laporan & notulen di layar penuh untuk dibahas bersama.</p></div><div class="actions" data-acts></div></div>' +
      '<div class="grid-3">' +
      '<section class="card lg"><div class="card-title">' + icon('present') + ' Materi yang ditampilkan</div><div class="card-sub">Laporan ' + App.periode(per.bulan, per.tahun) + ' · ' + list.length + '/' + wajib.length + ' kelompok sudah lapor</div>' +
      '<ol style="margin:16px 0 0;padding-left:20px;line-height:2">' +
      '<li><b>Ringkasan</b> — status pelaporan & rekap generus</li>' +
      wajib.map(k => { const l = list.find(x => x.KelompokID === k.id); return '<li>' + esc(k.nama) + ' ' + (l ? '<span class="badge ok">Sudah</span>' : '<span class="badge warn">Belum</span>') + '</li>'; }).join('') +
      '<li><b>Notulen terpilih</b> — <span data-n>' + sel.size + '</span> sesi</li></ol>' +
      '<div class="notice info" style="margin-top:16px">' + icon('info') + '<div>Navigasi: tombol panah di layar, tombol ← → keyboard / klik presenter, atau geser di layar sentuh. Tekan <b>Esc</b> untuk keluar. Daftar hadir tidak ditampilkan.</div></div>' +
      '<button class="btn btn-deep btn-block" style="margin-top:18px;min-height:56px;font-size:16px" data-start>' + icon('maximize') + ' Mulai Mode Musyawaroh</button></section>' +
      '<section class="card"><div class="row between"><div class="card-title">' + icon('book') + ' Sesi Notulen</div><span><button class="btn btn-ghost btn-xs" data-all>Semua</button><button class="btn btn-ghost btn-xs" data-none>Kosongkan</button></span></div>' +
      '<div style="margin-top:10px;max-height:420px;overflow:auto">' + (all.length ? all.map(s => '<label class="sesi-item check ' + (sel.has(s.sesiId) ? 'on' : '') + '" style="display:flex"><input type="checkbox" value="' + esc(s.sesiId) + '" ' + (sel.has(s.sesiId) ? 'checked' : '') + '><span><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b><div class="meta">' + esc(s.tempat) + ' · ' + s.poin.length + ' poin</div></span></label>').join('') : '<div class="empty">Belum ada notulen.</div>') + '</div></section></div>';
    c.querySelector('[data-acts]').appendChild(App.admin.periodPick(per, (b, t) => { App.setPeriode(b, t); c._sel = null; App.render(); }));
    const upd = () => { c.querySelector('[data-n]').textContent = sel.size; };
    c.querySelectorAll('.sesi-item input').forEach(cb => { cb.onchange = () => { if (cb.checked) sel.add(cb.value); else sel.delete(cb.value); cb.closest('.sesi-item').classList.toggle('on', cb.checked); upd(); }; });
    c.querySelector('[data-all]').onclick = () => { all.forEach(s => sel.add(s.sesiId)); c.querySelectorAll('.sesi-item input').forEach(x => { x.checked = true; x.closest('.sesi-item').classList.add('on'); }); upd(); };
    c.querySelector('[data-none]').onclick = () => { sel.clear(); c.querySelectorAll('.sesi-item input').forEach(x => { x.checked = false; x.closest('.sesi-item').classList.remove('on'); }); upd(); };
    c.querySelector('[data-start]').onclick = () => present(per, all.filter(s => sel.has(s.sesiId)).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal))));
  }));

  function present(per, sesi) {
    const list = B.laporanPeriode(per.bulan, per.tahun);
    const wajib = B.wajib();
    const slides = [{ t: 'ringkasan', tab: 'Ringkasan' }];
    wajib.forEach(k => slides.push({ t: 'kelompok', k: k, l: list.find(x => x.KelompokID === k.id), tab: k.nama }));
    list.filter(l => !wajib.some(k => k.id === l.KelompokID)).forEach(l => slides.push({ t: 'kelompok', k: { nama: B.namaKelompok(l) }, l: l, tab: B.namaKelompok(l) }));
    sesi.forEach(s => slides.push({ t: 'notulen', s: s, tab: 'Notulen ' + App.fmtTanggal(s.tanggal, true) }));

    const meta = App.meta();
    const el = App.html('<div class="present" tabindex="-1">' +
      '<div class="p-top">' + App.logo.html('kiri').replace('logo-circle', 'logo-circle sm') +
      '<div class="hide-m" style="line-height:1.2"><b style="display:block">' + esc(meta.sub.split('·')[0].trim()) + '</b><small style="opacity:.8;letter-spacing:.06em">BAGIAN PENDIDIKAN</small></div>' +
      '<div class="ttl"><b>Musyawaroh Bagian Pendidikan · ' + esc(App.periode(per.bulan, per.tahun)) + '</b><small>● Sesi Musyawaroh Pleno</small></div>' +
      '<span class="count" data-count></span><button class="btn" data-exit>' + icon('minimize') + ' Keluar (Esc)</button>' + App.logo.html('kanan').replace('logo-circle', 'logo-circle sm') + '</div>' +
      '<div class="p-stage" data-stage><button class="nav-arrow l" data-prev aria-label="Sebelumnya">' + icon('chevL', 'lg') + '</button><button class="nav-arrow r" data-next aria-label="Berikutnya">' + icon('chevR', 'lg') + '</button></div>' +
      '<div class="p-tabs" data-tabs>' + slides.map((s, i) => '<button class="p-tab" data-i="' + i + '">' + (i + 1) + ' ' + esc(s.tab) + (s.t === 'kelompok' && !s.l ? ' <span class="badge warn">Belum</span>' : '') + '</button>').join('') +
      '<span class="muted hide-m" style="margin-left:auto;font-size:.75em;align-self:center;white-space:nowrap">← → atau geser untuk pindah</span></div></div>');
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    const stage = el.querySelector('[data-stage]');
    let idx = 0;

    const show = (i, back) => {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      stage.querySelectorAll('.slide').forEach(s => s.remove());
      const s = App.html('<div class="slide ' + (back ? 'back' : '') + '">' + slideHtml(slides[idx], per, list, wajib) + '</div>');
      stage.appendChild(s);
      el.querySelector('[data-count]').textContent = (idx + 1) + ' / ' + slides.length;
      el.querySelector('[data-prev]').disabled = idx === 0;
      el.querySelector('[data-next]').disabled = idx === slides.length - 1;
      el.querySelectorAll('.p-tab').forEach((t, j) => t.classList.toggle('on', j === idx));
      const on = el.querySelector('.p-tab.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    };
    const next = () => { if (idx < slides.length - 1) show(idx + 1); };
    const prev = () => { if (idx > 0) show(idx - 1, true); };

    let closed = false;
    const exit = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('fullscreenchange', onFs);
      document.body.style.overflow = '';
      el.remove();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
    const onKey = e => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
      else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1); }
      else if (e.key === 'Escape') { e.preventDefault(); exit(); }
    };
    const onFs = () => { if (!document.fullscreenElement) exit(); };
    document.addEventListener('keydown', onKey, true);
    el.querySelector('[data-next]').onclick = next;
    el.querySelector('[data-prev]').onclick = prev;
    el.querySelector('[data-exit]').onclick = exit;
    el.querySelectorAll('.p-tab').forEach(t => { t.onclick = () => { const i = +t.getAttribute('data-i'); show(i, i < idx); }; });
    let sx = 0, sy = 0;
    stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); }
    }, { passive: true });
    App.onLeave(exit);

    show(0);
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => document.addEventListener('fullscreenchange', onFs)).catch(() => { /* layar penuh ditolak: tetap tampil sebagai lapisan penuh */ });
    }
    el.focus();
  }

  function slideHtml(s, per, list, wajib) {
    const periode = App.periode(per.bulan, per.tahun);
    if (s.t === 'ringkasan') {
      const r = App.rekap(list);
      return '<span class="kicker">Ringkasan</span><h2 class="giant">Rekap ' + esc(periode) + '</h2><div class="underline"></div>' +
        '<div class="p-grid"><div><div class="total-band" style="margin-top:0"><div><div style="font-weight:800;letter-spacing:.08em;text-transform:uppercase">' + icon('award') + ' Total Generus</div><div style="opacity:.85;margin-top:.3em">dari ' + list.length + ' / ' + wajib.length + ' kelompok yang sudah lapor</div></div><div class="n">' + App.fmtNum(r.total) + '<small>Orang</small></div></div>' +
        '<div class="sum-grid">' + [['Caberawit', r.caberawit], ['Praremaja', r.praremaja], ['Remaja', r.remaja], ['Pranikah', r.pranikah], ['Mondok', r.mondok], ['Mubaligh', r.mubaligh]]
          .map(x => '<div class="sum-stat"><div class="l">' + x[0] + '</div><div class="v">' + App.fmtNum(x[1]) + '</div></div>').join('') + '</div></div>' +
        '<div class="side-card"><h3>' + icon('listCheck') + ' Status Pelaporan</h3><div class="stat-list" style="grid-template-columns:1fr;margin-top:0">' +
        wajib.map(k => { const l = list.find(x => x.KelompokID === k.id); return '<div class="stat-item ' + (l ? '' : 'pending') + '"><b>' + esc(k.nama) + '</b>' + (l ? '<span class="badge ok">' + icon('checkCircle', 'sm') + ' Sudah</span>' : '<span class="badge warn">' + icon('clock', 'sm') + ' Belum</span>') + '</div>'; }).join('') +
        '</div></div></div>';
    }
    if (s.t === 'notulen') {
      return '<span class="kicker">Notulen</span><h2 class="giant">' + esc(App.fmtTanggal(s.s.tanggal)) + '</h2><div class="underline"></div><p class="muted" style="margin-top:.6em;font-size:1.1em">' + icon('pin') + ' ' + esc(s.s.tempat) + '</p>' + App.paperHtml(s.s);
    }
    // kelompok
    if (!s.l) {
      return '<div class="belum-slide"><div><div class="ico-tile" style="width:5em;height:5em;margin:0 auto;border-radius:50%;background:var(--warn-bg);color:var(--warn-fg)">' + icon('clock', 'lg') + '</div>' +
        '<h2 class="giant" style="margin-top:.4em">' + esc(s.k.nama) + '</h2><p style="font-size:1.4em;margin-top:.4em" class="muted">Belum mengirim laporan ' + esc(periode) + '</p><span class="badge warn" style="margin-top:1em;font-size:1em">Menunggu pengiriman</span></div></div>';
    }
    const l = s.l, r = App.rekap([l]);
    const jen = [
      ['Caberawit', l.Jml_Caberawit, 'Hari efektif: ' + (l.Cbr_HariEfektif || '—') + ' hari', 'smile'],
      ['Praremaja', l.Jml_Praremaja, 'Hari efektif: ' + (l.Prm_HariEfektif || '—') + ' hari', 'cap'],
      ['Remaja', l.Jml_Remaja, 'Hari efektif: ' + (l.Rmj_HariEfektif || '—') + ' hari', 'users'],
      ['Pranikah', l.Jml_Pranikah, 'Kehadiran: ' + (l.Pnk_Hadir1 !== '' && l.Pnk_Hadir1 !== undefined ? l.Pnk_Hadir1 + '%' : '—') + (l.Pnk_Hadir2 ? ' · ' + l.Pnk_Hadir2 + '%' : ''), 'heart'],
    ];
    const kbm = [
      ['calendar', 'Sudah Muslimus?', l.Muslimus === 'Ya' ? 'Ya' + (l.Muslimus_Tanggal ? ' · ' + App.fmtTanggal(l.Muslimus_Tanggal, true) : '') : (l.Muslimus || '—')],
      ['fileCheck', 'Laporan PJP di Link', l.PJP_Link ? (/Sudah/.test(l.PJP_Link) ? 'Sudah lengkap' : 'Belum') : '—'],
      ['percent', 'Kehadiran Pranikah', l.Pnk_Hadir1 !== '' && l.Pnk_Hadir1 !== undefined ? l.Pnk_Hadir1 + '%' : '—'],
      ['users', 'Muda-Mudi (peserta)', l.MM_Peserta !== '' && l.MM_Peserta !== undefined ? l.MM_Peserta + ' Orang' : '—'],
      ['book', 'Kelas Tahfidz', l.Tahfidz_Ada === 'Ada' ? 'Ada · ' + App.num(l.Tahfidz_Jml) + ' Orang' : (l.Tahfidz_Ada || '—')],
      ['building', 'Generus Mondok', App.num(l.Generus_Sedang_Mondok) + ' Orang'],
      ['mic', 'Sudah Mubaligh', App.num(l.Generus_Sudah_Mondok) + ' Orang'],
    ];
    const catatan = [['Caberawit', l.Cbr_Catatan], ['Praremaja', l.Prm_Catatan], ['Remaja', l.Rmj_Catatan], ['Pranikah', [l.Pnk_Sambung1, l.Pnk_Sambung2].filter(Boolean).join(' · ')],
      ['Muda-Mudi', [l.MM_Minggu1, l.MM_Minggu2, l.MM_Minggu3, l.MM_Minggu4, l.MM_Lainnya].filter(Boolean).join(' · ')], ['Lainnya', l.Catatan_Lainnya]].filter(x => x[1]);
    return '<div class="row between" style="flex-wrap:wrap;align-items:flex-start"><div><span class="kicker">Laporan Kelompok</span> <span class="muted" style="margin-left:.6em">' + icon('calendar', 'sm') + ' Bulan Kegiatan Penuh: <b style="color:var(--text)">' + esc(periode) + '</b></span>' +
      '<h2 class="giant">KELOMPOK ' + esc(String(s.k.nama).toUpperCase()) + '</h2><div class="underline"></div></div>' +
      '<div class="side-card row" style="gap:.8em;padding:.9em 1.2em"><span class="ico-tile">' + icon('shield') + '</span><div><div class="section-label">Status Pelaporan</div><b style="color:var(--link)">Dikirim ' + esc(App.fmtWaktu(l.WaktuKirim, { noYear: true })) + (l.WaktuUbah ? ' · dikoreksi' : '') + '</b></div></div></div>' +
      '<div class="p-grid"><div><div class="jen-grid">' + jen.map(j => '<div class="jen"><div class="h">' + j[0] + '</div><div class="n">' + App.fmtNum(j[1]) + '<small>Orang</small></div><div class="note">' + esc(j[2]) + '</div></div>').join('') + '</div>' +
      '<div class="total-band"><div><div style="font-weight:800;letter-spacing:.08em;text-transform:uppercase">' + icon('award') + ' Total Generus Kelompok</div><div style="opacity:.85;margin-top:.3em">Caberawit + Praremaja + Remaja + Pranikah</div></div><div class="n">' + App.fmtNum(r.total) + '<small>Orang</small></div></div></div>' +
      '<div><div class="side-card"><h3>' + icon('listCheck') + ' Rincian Program KBM</h3>' + kbm.map(x => '<div class="kbm-row"><span>' + icon(x[0], 'sm') + ' ' + esc(x[1]) + '</span><b>' + esc(x[2]) + '</b></div>').join('') + '</div>' +
      (catatan.length ? '<div class="side-card catatan"><h3>' + icon('message') + ' Catatan & Kendala</h3><ul>' + catatan.map(x => '<li><b>' + esc(x[0]) + ':</b> ' + esc(x[1]) + '</li>').join('') + '</ul></div>' : '') +
      '</div></div>';
  }
})();
