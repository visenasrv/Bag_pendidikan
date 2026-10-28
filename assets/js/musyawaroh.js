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
      '<div class="notice info" style="margin-top:16px">' + icon('info') + '<div>Navigasi: tombol panah di layar, tombol ← → keyboard / klik presenter, atau geser di layar sentuh. ' +
      '<b>Esc / Perkecil</b> menyembunyikan layar penuh tanpa menutupnya — buka lagi lewat tombol <b>Musyawaroh</b> yang melayang di pojok. Tombol <b>Catat Notulen (N)</b> membuka editor notulen di samping laporan. Daftar hadir tidak ditampilkan.</div></div>' +
      '<button class="btn btn-deep btn-block" style="margin-top:18px;min-height:56px;font-size:16px" data-start>' + icon('maximize') + ' Mulai Mode Musyawaroh</button></section>' +
      '<section class="card"><div class="row between"><div class="card-title">' + icon('book') + ' Sesi Notulen</div><span><button class="btn btn-ghost btn-xs" data-all>Semua</button><button class="btn btn-ghost btn-xs" data-none>Kosongkan</button></span></div>' +
      '<div style="margin-top:10px;max-height:420px;overflow:auto">' + (all.length ? all.map(s => '<label class="sesi-item check ' + (sel.has(s.sesiId) ? 'on' : '') + '" style="display:flex"><input type="checkbox" value="' + esc(s.sesiId) + '" ' + (sel.has(s.sesiId) ? 'checked' : '') + '><span><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b><div class="meta">' + esc(s.tempat) + ' · ' + esc(App.notulenInfo(s)) + '</div></span></label>').join('') : '<div class="empty">Belum ada notulen.</div>') + '</div></section></div>';
    c.querySelector('[data-acts]').appendChild(App.admin.periodPick(per, (b, t) => { App.setPeriode(b, t); c._sel = null; App.render(); }));
    const upd = () => { c.querySelector('[data-n]').textContent = sel.size; };
    c.querySelectorAll('.sesi-item input').forEach(cb => { cb.onchange = () => { if (cb.checked) sel.add(cb.value); else sel.delete(cb.value); cb.closest('.sesi-item').classList.toggle('on', cb.checked); upd(); }; });
    c.querySelector('[data-all]').onclick = () => { all.forEach(s => sel.add(s.sesiId)); c.querySelectorAll('.sesi-item input').forEach(x => { x.checked = true; x.closest('.sesi-item').classList.add('on'); }); upd(); };
    c.querySelector('[data-none]').onclick = () => { sel.clear(); c.querySelectorAll('.sesi-item input').forEach(x => { x.checked = false; x.closest('.sesi-item').classList.remove('on'); }); upd(); };
    c.querySelector('[data-start]').onclick = () => {
      if (LIVE) LIVE.exit();
      present(per, Array.from(sel), null);
    };
  }));

  // ───────────────────────── Presentasi layar penuh ─────────────────────────
  // Bisa DIPERKECIL (disembunyikan) lalu dibuka lagi dari pil melayang tanpa
  // kembali ke menu; posisi slide & pilihan notulen diingat (juga setelah muat ulang).
  const PKEY = 'mp_present';
  let LIVE = null;

  App.musyawaroh = {
    state() { return App.ls.get(PKEY); },
    /** Pil "Musyawaroh" melayang di halaman admin saat presentasi diperkecil */
    pill() {
      let p = document.getElementById('ppill');
      const st = App.ls.get(PKEY);
      const show = st && st.min && App.auth.valid() && App.path().indexOf('/admin') === 0;
      if (!show) { if (p) p.remove(); return; }
      if (!p) {
        p = document.createElement('div');
        p.id = 'ppill';
        p.className = 'pill-float present-pill';
        p.innerHTML = '<button class="pp-open" data-open></button><button class="pp-x" data-x title="Tutup Mode Musyawaroh" aria-label="Tutup Mode Musyawaroh">' + icon('x', 'sm') + '</button>';
        p.querySelector('[data-open]').onclick = () => App.musyawaroh.resume();
        p.querySelector('[data-x]').onclick = () => App.musyawaroh.exit();
        document.body.appendChild(p);
      }
      p.querySelector('[data-open]').innerHTML = icon('present') + '<span><b>Mode Musyawaroh</b><small>' + esc(App.periode(st.bulan, st.tahun)) + (st.tab ? ' · ' + esc(st.tab) : '') + '</small></span>' + icon('maximize', 'sm');
    },
    resume() {
      if (LIVE) { LIVE.restore(); return; }
      const st = App.ls.get(PKEY);
      if (st) present({ bulan: st.bulan, tahun: st.tahun }, st.sesi || [], st.key);
    },
    exit() { if (LIVE) LIVE.exit(); else { App.ls.del(PKEY); App.musyawaroh.pill(); } },
  };
  window.addEventListener('hashchange', () => App.musyawaroh.pill());

  function bangunSlide(per, sesiIds) {
    const list = B.laporanPeriode(per.bulan, per.tahun);
    const wajib = B.wajib();
    const slides = [{ t: 'ringkasan', tab: 'Ringkasan', key: 'r' }];
    wajib.forEach(k => slides.push({ t: 'kelompok', k: k, l: list.find(x => x.KelompokID === k.id), tab: k.nama, key: 'k:' + k.id }));
    list.filter(l => !wajib.some(k => k.id === l.KelompokID)).forEach(l => slides.push({ t: 'kelompok', k: { nama: B.namaKelompok(l) }, l: l, tab: B.namaKelompok(l), key: 'l:' + l.ID }));
    B.notulen().filter(s => sesiIds.indexOf(s.sesiId) >= 0).sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)))
      .forEach(s => slides.push({ t: 'notulen', s: s, tab: 'Notulen ' + App.fmtTanggal(s.tanggal, true), key: 'n:' + s.sesiId }));
    return { list: list, wajib: wajib, slides: slides };
  }

  function present(per, sesiIds, startKey) {
    let data = bangunSlide(per, sesiIds);
    const meta = App.meta();
    const el = App.html('<div class="present" tabindex="-1">' +
      '<div class="p-top">' + App.logo.html('kiri').replace('logo-circle', 'logo-circle sm') +
      '<div class="hide-m" style="line-height:1.2"><b style="display:block">' + esc(meta.sub.split('·')[0].trim()) + '</b><small style="opacity:.8;letter-spacing:.06em">BAGIAN PENDIDIKAN</small></div>' +
      '<div class="ttl"><b>Musyawaroh Bagian Pendidikan · ' + esc(App.periode(per.bulan, per.tahun)) + '</b><small>● Sesi Musyawaroh Pleno</small></div>' +
      '<span class="count" data-count></span>' +
      '<button class="btn p-notes-btn" data-notes title="Catat notulen (N)">' + icon('edit') + '<span class="hide-s"> Catat Notulen</span></button>' +
      '<button class="btn" data-min title="Perkecil — buka lagi dari tombol melayang (Esc)">' + icon('minimize') + '<span class="hide-s"> Perkecil</span></button>' +
      '<button class="btn p-exit" data-exit title="Tutup Mode Musyawaroh" aria-label="Tutup Mode Musyawaroh">' + icon('x') + '</button></div>' +
      '<div class="p-body"><div class="p-stage" data-stage><button class="nav-arrow l" data-prev aria-label="Sebelumnya">' + icon('chevL', 'lg') + '</button><button class="nav-arrow r" data-next aria-label="Berikutnya">' + icon('chevR', 'lg') + '</button></div>' +
      '<aside class="p-notulen hidden" data-panel aria-label="Catat notulen"><div class="pn-bar"><button class="btn btn-soft btn-sm" data-judul></button><span class="sp"></span>' +
      '<button class="icon-btn" data-hide title="Sembunyikan panel (draf tetap tersimpan)" aria-label="Sembunyikan panel">' + icon('chevR') + '</button></div><div class="pn-body" data-pbody></div></aside></div>' +
      '<div class="p-tabs" data-tabs></div></div>');
    document.body.appendChild(el);
    const stage = el.querySelector('[data-stage]');
    const panel = el.querySelector('[data-panel]');
    let idx = 0, min = false, closed = false, editor = null;

    const simpanState = () => {
      const s = data.slides[idx] || {};
      App.ls.set(PKEY, { bulan: per.bulan, tahun: per.tahun, sesi: sesiIds, key: s.key, tab: s.tab, min: min });
    };
    const gambarTab = () => {
      el.querySelector('[data-tabs]').innerHTML = data.slides.map((s, i) => '<button class="p-tab" data-i="' + i + '">' + (i + 1) + ' ' + esc(s.tab) + (s.t === 'kelompok' && !s.l ? ' <span class="badge warn">Belum</span>' : '') + '</button>').join('') +
        '<span class="muted hide-m" style="margin-left:auto;font-size:.75em;align-self:center;white-space:nowrap">← → pindah · N notulen · Esc perkecil</span>';
      el.querySelectorAll('.p-tab').forEach(t => { t.onclick = () => { const i = +t.getAttribute('data-i'); show(i, i < idx); }; });
    };
    const judulBtn = () => {
      const s = data.slides[idx] || {};
      const b = el.querySelector('[data-judul]');
      const teks = s.t === 'kelompok' ? 'Kelompok ' + s.k.nama : s.t === 'ringkasan' ? 'Ringkasan ' + App.periode(per.bulan, per.tahun) : '';
      b.classList.toggle('hidden', !teks);
      b.innerHTML = icon('plus', 'sm') + ' Judul: ' + esc(teks);
      b.onclick = () => { if (editor && teks) editor.judul(teks); };
    };
    const show = (i, back) => {
      idx = Math.max(0, Math.min(data.slides.length - 1, i));
      stage.querySelectorAll('.slide').forEach(s => s.remove());
      const sl = App.html('<div class="slide ' + (back ? 'back' : '') + '">' + slideHtml(data.slides[idx], per, data.list, data.wajib) + '</div>');
      stage.appendChild(sl);
      bindTanggapan(sl, data.slides[idx], per, data.list, data.wajib);
      el.querySelector('[data-count]').textContent = (idx + 1) + ' / ' + data.slides.length;
      el.querySelector('[data-prev]').disabled = idx === 0;
      el.querySelector('[data-next]').disabled = idx === data.slides.length - 1;
      el.querySelectorAll('.p-tab').forEach((t, j) => t.classList.toggle('on', j === idx));
      const on = el.querySelector('.p-tab.on');
      if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      judulBtn();
      simpanState();
    };
    const next = () => { if (idx < data.slides.length - 1) show(idx + 1); };
    const prev = () => { if (idx > 0) show(idx - 1, true); };

    // ── Panel notulen di samping laporan ──
    const tutupPanel = () => {
      if (!editor) return;
      const e = editor; editor = null;
      e.destroy();
      panel.classList.add('hidden');
      el.classList.remove('with-notes');
      el.querySelector('[data-notes]').classList.remove('on');
      el.querySelector('[data-pbody]').innerHTML = '';
      el.focus({ preventScroll: true });
    };
    const bukaPanel = () => {
      if (editor) return;
      panel.classList.remove('hidden');
      el.classList.add('with-notes');
      el.querySelector('[data-notes]').classList.add('on');
      editor = App.notulenEditor.mount(el.querySelector('[data-pbody]'), alasan => {
        if (alasan === 'saved') App.toast('Notulen tersimpan. Bisa dilihat di menu Notulen.');
        if (editor) { const e = editor; editor = null; e.destroy(); }
        panel.classList.add('hidden'); el.classList.remove('with-notes'); el.querySelector('[data-notes]').classList.remove('on');
        el.querySelector('[data-pbody]').innerHTML = '';
        el.focus({ preventScroll: true });
      }, { embedded: true });
      judulBtn();
    };
    const togglePanel = () => { if (editor) editor.simpanDraf(); else bukaPanel(); };   // menyembunyikan = simpan draf
    el.querySelector('[data-notes]').onclick = togglePanel;
    el.querySelector('[data-hide]').onclick = () => { if (editor) editor.simpanDraf(); };

    // ── Perkecil / buka lagi / keluar ──
    const layarPenuh = () => {
      const d = document.documentElement;   // seluruh halaman → dialog & notifikasi tetap terlihat di atas presentasi
      if (d.requestFullscreen && !document.fullscreenElement) d.requestFullscreen().catch(() => { /* ditolak: tetap tampil sebagai lapisan penuh */ });
    };
    const keluarLayarPenuh = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
    const pasang = () => {
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('fullscreenchange', onFs);
      document.body.style.overflow = 'hidden';
      document.body.classList.add('presenting');
    };
    const lepas = () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('fullscreenchange', onFs);
      document.body.style.overflow = '';
      document.body.classList.remove('presenting');
    };
    const minimize = () => {
      if (min || closed) return;
      if (editor) editor.simpanDraf();
      min = true;
      lepas();
      el.style.display = 'none';
      keluarLayarPenuh();
      simpanState();
      App.musyawaroh.pill();
      App.toast('Mode Musyawaroh diperkecil. Ketuk tombol "Mode Musyawaroh" di pojok untuk membuka lagi.', 'info');
    };
    const restore = () => {
      if (closed) return;
      // susun ulang dari data terbaru (laporan/tanggapan/notulen bisa berubah selama diperkecil)
      const key = (data.slides[idx] || {}).key;
      data = bangunSlide(per, sesiIds);
      gambarTab();
      const j = data.slides.findIndex(s => s.key === key);
      min = false;
      el.style.display = '';
      pasang();
      layarPenuh();
      show(j >= 0 ? j : Math.min(idx, data.slides.length - 1));
      App.musyawaroh.pill();
      el.focus({ preventScroll: true });
    };
    const exit = () => {
      if (closed) return;
      if (editor) editor.simpanDraf();
      closed = true;
      lepas();
      el.remove();
      keluarLayarPenuh();
      LIVE = null;
      App.ls.del(PKEY);
      App.musyawaroh.pill();
    };
    const onKey = e => {
      const t = e.target;
      if (t && t.closest && (t.closest('[data-panel]') || t.closest('.backdrop'))) {
        if (e.key === 'Escape' && t.closest('[data-panel]') && !document.querySelector('.backdrop')) { e.preventDefault(); if (editor) editor.simpanDraf(); }
        return;   // sedang mengetik notulen / dialog terbuka
      }
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable)) {
        // sedang mengetik tanggapan → tombol navigasi tidak dipakai
        if (e.key === 'Escape') { e.preventDefault(); const b = t.closest('.tg-edit') && t.closest('.tg-edit').querySelector('[data-tgcancel]'); if (b) b.click(); else t.blur(); }
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].indexOf(e.key) >= 0) { e.preventDefault(); next(); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].indexOf(e.key) >= 0) { e.preventDefault(); prev(); }
      else if (e.key === 'Home') { e.preventDefault(); show(0, true); }
      else if (e.key === 'End') { e.preventDefault(); show(data.slides.length - 1); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); togglePanel(); }
      else if (e.key === 'Escape') { e.preventDefault(); minimize(); }
    };
    // Esc dari browser (keluar layar penuh) = perkecil, bukan menutup → posisi tidak hilang
    const onFs = () => { if (!document.fullscreenElement && !min && !closed && !el._abaikanFs) minimize(); };
    el.querySelector('[data-next]').onclick = next;
    el.querySelector('[data-prev]').onclick = prev;
    el.querySelector('[data-min]').onclick = minimize;
    el.querySelector('[data-exit]').onclick = exit;
    let sx = 0, sy = 0;
    stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener('touchend', e => {
      if (e.target.closest && e.target.closest('.tg-edit, textarea')) return;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.4) { if (dx < 0) next(); else prev(); }
    }, { passive: true });

    LIVE = { restore: restore, minimize: minimize, exit: exit };
    gambarTab();
    const j0 = startKey ? data.slides.findIndex(s => s.key === startKey) : 0;
    pasang();
    show(j0 >= 0 ? j0 : 0);
    layarPenuh();
    App.musyawaroh.pill();
    el.focus();
  }

  function slideHtml(s, per, list, wajib) {
    const periode = App.periode(per.bulan, per.tahun);
    if (s.t === 'ringkasan') {
      const r = App.rekap(list);
      return '<span class="kicker">Ringkasan</span><h2 class="giant">Rekap ' + esc(periode) + '</h2><div class="underline"></div>' +
        '<div class="p-grid"><div><div class="total-band" style="margin-top:0"><div><div style="font-weight:800;letter-spacing:.08em;text-transform:uppercase">' + icon('award') + ' Total Generus</div><div style="opacity:.85;margin-top:.3em">dari ' + list.length + ' / ' + wajib.length + ' kelompok yang sudah lapor</div></div><div class="n">' + App.fmtNum(r.total) + '<small>Orang</small></div></div>' +
        '<div class="sum-grid s7">' + [['Caberawit', r.caberawit], ['Praremaja', r.praremaja], ['Remaja', r.remaja], ['Pranikah', r.pranikah], ['Muda-Mudi', r.mudamudi], ['Mondok', r.mondok], ['Mubaligh', r.mubaligh]]
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
    const tg = B.tanggapan(l.ID);
    const ada = v => v !== '' && v !== undefined && v !== null;
    const pct = v => (ada(v) ? App.fmtNum(v) + '%' : '—');
    // kartu jenjang: depan = bulan ini, belakang (diketuk → berbalik) = laporan bulan sebelumnya
    const pb = +per.bulan === 1 ? 12 : +per.bulan - 1, pt = +per.bulan === 1 ? +per.tahun - 1 : +per.tahun;
    const lp = B.laporanPeriode(pb, pt).find(x => x.KelompokID === l.KelompokID) || null;
    // v1.7: kartu Pranikah menampilkan juga isian kegiatan Sambung 1 & 2 (HTML sudah di-escape)
    const catatan = (x, p) => (p === 'Pnk'
      ? [1, 2].filter(n => n === 1 || ada(x['Pnk_Hadir' + n]) || String(x['Pnk_Sambung' + n] || '').trim())
        .map(n => '<span class="smb"><span class="sl">Sambung ' + n + '</span><span class="sk">' + esc(String(x['Pnk_Sambung' + n] || '').trim() || '—') + '</span><b class="sp">' + pct(x['Pnk_Hadir' + n]) + '</b></span>').join('')
      : esc((x[p + '_HariEfektif'] || 0) + ' hari efektif · hadir ' + pct(x[p + '_Hadir']) + ' · materi ' + pct(x[p + '_Materi'])));
    const jen = [['Caberawit', 'Jml_Caberawit', 'Cbr'], ['Praremaja', 'Jml_Praremaja', 'Prm'], ['Remaja', 'Jml_Remaja', 'Rmj'], ['Pranikah', 'Jml_Pranikah', 'Pnk']];
    const jenHtml = j => {
      const now = App.num(l[j[1]]);
      let back;
      if (lp) {
        const dulu = App.num(lp[j[1]]), d = now - dulu;
        const bi = esc(App.BULAN[+per.bulan - 1]);
        const tren = d > 0 ? '<span class="tren up">▲ naik ' + App.fmtNum(d) + ' di ' + bi + '</span>' : d < 0 ? '<span class="tren down">▼ turun ' + App.fmtNum(-d) + ' di ' + bi + '</span>' : '<span class="tren same">= tetap di ' + bi + '</span>';
        back = '<div class="h">' + j[0] + ' · ' + esc(App.periode(pb, pt)) + '</div><div class="n">' + App.fmtNum(dulu) + '<small>Orang</small></div><div class="note">' + catatan(lp, j[2]) + '</div>' + tren;
      } else {
        back = '<div class="h">' + j[0] + ' · ' + esc(App.periode(pb, pt)) + '</div><div class="kosong">' + icon('clock') + '<b>Belum ada laporan</b><span>' + esc(App.periode(pb, pt)) + '</span></div>';
      }
      return '<button class="jen flip" data-flip aria-label="' + j[0] + ': ketuk untuk melihat bulan sebelumnya"><span class="jen-in">' +
        '<span class="face front"><span class="h">' + j[0] + '</span><span class="n">' + App.fmtNum(now) + '<small>Orang</small></span><span class="note">' + catatan(l, j[2]) + '</span><span class="flip-hint">' + icon('refresh', 'sm') + ' bulan lalu</span></span>' +
        '<span class="face back">' + back + '<span class="flip-hint">' + icon('refresh', 'sm') + ' bulan ini</span></span></span></button>';
    };
    const LINK = [['Cbr_Link', 'Caberawit'], ['Prm_Link', 'Praremaja'], ['Rmj_Link', 'Remaja'], ['Pnk_Link', 'Pranikah'], ['MM_Link', 'Muda-Mudi']];
    const linkOk = LINK.filter(x => l[x[0]] === 'Sudah').length;
    const linkBelum = LINK.filter(x => l[x[0]] !== 'Sudah').map(x => x[1]);
    const yaTidak = v => (v === 'Sudah' ? '<span class="badge ok">' + icon('checkCircle', 'sm') + ' Sudah</span>' : (v ? '<span class="badge warn">' + icon('clock', 'sm') + ' Belum</span>' : '—'));
    const lain = [
      ['fileCheck', 'Laporan PJP di Link', yaTidak(/^sudah/i.test(l.PJP_Link || '') ? 'Sudah' : l.PJP_Link)],
      ['listCheck', 'Laporan kelas di link', '<b>' + linkOk + ' / 5</b> jenjang', linkBelum.length
        ? '<div class="link-belum"><span>Belum:</span>' + linkBelum.map(n => '<span class="badge warn">' + icon('clock', 'sm') + ' ' + esc(n) + '</span>').join('') + '</div>'
        : '<div class="link-belum"><span class="badge ok">' + icon('checkCircle', 'sm') + ' Semua jenjang sudah</span></div>'],
      ['building', 'Generus Sedang Mondok', '<b>' + App.fmtNum(App.num(l.Generus_Sedang_Mondok)) + '</b> Orang'],
      ['mic', 'Sudah Mubaligh/Mubalighot', '<b>' + App.fmtNum(App.num(l.Generus_Sudah_Mondok)) + '</b> Orang'],
    ];
    const bar = v => '<div class="pbar"><i style="width:' + Math.max(0, Math.min(100, App.num(v))) + '%"></i></div>';
    const mus = l.Muslimus === 'Ya'
      ? '<div class="mus-big ok"><span class="ic">' + icon('checkCircle') + '</span><div><small>Sudah Muslimus?</small><b>SUDAH</b>' + (l.Muslimus_Tanggal ? '<span>' + esc(App.fmtTanggal(l.Muslimus_Tanggal)) + '</span>' : '') + '</div></div>'
      : '<div class="mus-big no"><span class="ic">' + icon('alert') + '</span><div><small>Sudah Muslimus?</small><b>' + (l.Muslimus ? 'BELUM' : '—') + '</b>' + (l.Muslimus_Ket ? '<span>' + esc(l.Muslimus_Ket) + '</span>' : '') + '</div></div>';
    const minggu = [1, 2, 3, 4].map(i => '<li><span>Minggu ' + i + '</span><b>' + (l['MM_Minggu' + i] ? esc(l['MM_Minggu' + i]) : '<i class="muted">—</i>') + '</b></li>').join('');
    const mmCard = '<div class="side-card prog"><h3>' + icon('sparkle') + ' Muda-Mudi</h3>' +
      '<div class="prog-top"><div class="big">' + App.fmtNum(App.num(l.Jml_MudaMudi)) + '<small>Orang</small></div><div class="pct"><span>Kehadiran</span><b>' + pct(l.MM_Hadir) + '</b>' + bar(l.MM_Hadir) + '</div></div>' +
      '<ul class="minggu">' + minggu + (l.MM_Lainnya ? '<li><span>Lainnya</span><b>' + esc(l.MM_Lainnya) + '</b></li>' : '') + '</ul></div>';
    const thfCard = l.Tahfidz_Ada === 'Ada'
      ? '<div class="side-card prog"><h3>' + icon('book') + ' Kelas Tahfidz</h3>' +
        '<div class="prog-top"><div class="big">' + App.fmtNum(App.num(l.Tahfidz_Jml)) + '<small>Peserta</small></div><div class="pct"><span>Kehadiran</span><b>' + pct(l.Tahfidz_Hadir) + '</b>' + bar(l.Tahfidz_Hadir) + '</div></div>' +
        '<div class="kbm-row" style="margin-top:.8em"><span>' + icon('calendar', 'sm') + ' Jadwal Kegiatan</span><b>' + (l.Tahfidz_Jadwal ? esc(l.Tahfidz_Jadwal) : '—') + '</b></div></div>'
      : '<div class="side-card prog none"><h3>' + icon('book') + ' Kelas Tahfidz</h3><div class="none-msg">' + icon('info') + '<div><b>Belum ada Kelas Tahfidz</b>' + (l.Tahfidz_Ket ? '<p>' + esc(l.Tahfidz_Ket) + '</p>' : '') + '</div></div></div>';
    const kolom = [
      ['Laporan Lainnya', 'file', 'Tidak ada laporan lainnya', [['Cbr_Lainnya', 'Caberawit'], ['Prm_Lainnya', 'Praremaja'], ['Rmj_Lainnya', 'Remaja'], ['Pnk_Lainnya', 'Pranikah'], ['MM_LapLainnya', 'Muda-Mudi']]],
      ['Kendala', 'alertCircle', 'Tidak ada kendala', [['Cbr_Kendala', 'Caberawit'], ['Prm_Kendala', 'Praremaja'], ['Rmj_Kendala', 'Remaja'], ['Pnk_Kendala', 'Pranikah'], ['MM_Kendala', 'Muda-Mudi']]],
      ['Usulan / Info', 'message', 'Tidak ada usulan / info', [['Catatan_Lainnya', '']]],
    ];
    const isiAda = v => v && !/^[-.\s]*$/.test(String(v)) && !/^(tidak ada|nihil|tidak|belum ada)\.?\s*$/i.test(String(v).trim());
    const kolHtml = kolom.map((k, ki) => {
      const its = k[3].filter(x => isiAda(l[x[0]]));
      return '<div class="side-card tg-col c' + ki + '"><h3>' + icon(k[1]) + ' ' + k[0] + ' <span class="cnt">' + its.length + '</span></h3>' +
        (its.length ? its.map(x => tgItem(x[0], x[1], l[x[0]], tg[x[0]])).join('') : '<div class="tg-empty">' + esc(k[2]) + '</div>') + '</div>';
    }).join('');
    const umum = tg._umum;
    return '<div class="kel-head"><div><span class="kicker">Laporan Kelompok</span> <span class="muted" style="margin-left:.6em">' + icon('calendar', 'sm') + ' Bulan Kegiatan Penuh: <b style="color:var(--text)">' + esc(periode) + '</b></span>' +
      '<h2 class="giant">KELOMPOK ' + esc(String(s.k.nama).toUpperCase()) + '</h2><div class="underline"></div>' +
      '<div class="muted" style="margin-top:.7em">' + icon('shield', 'sm') + ' Dikirim ' + esc(App.fmtWaktu(l.WaktuKirim, { noYear: true })) + (l.WaktuUbah ? ' · dikoreksi' : '') + '</div></div>' + mus + '</div>' +
      '<div class="p-grid"><div><div class="jen-grid">' + jen.map(jenHtml).join('') + '</div>' +
      '<div class="total-band"><div><div style="font-weight:800;letter-spacing:.08em;text-transform:uppercase">' + icon('award') + ' Total Generus Kelompok</div><div style="opacity:.85;margin-top:.3em">Caberawit + Praremaja + Remaja + Pranikah</div></div><div class="n">' + App.fmtNum(r.total) + '<small>Orang</small></div></div></div>' +
      '<div class="side-card"><h3>' + icon('listCheck') + ' Lainnya</h3>' + lain.map(x => '<div class="kbm-row' + (x[3] ? ' has-sub' : '') + '"><span>' + icon(x[0], 'sm') + ' ' + esc(x[1]) + '</span><span>' + x[2] + '</span>' + (x[3] || '') + '</div>').join('') + '</div></div>' +
      '<div class="p-two">' + mmCard + thfCard + '</div>' +
      '<div class="p-three">' + kolHtml + '</div>' +
      '<div class="side-card tg-umum" data-bidang="_umum"><h3>' + icon('edit') + ' Catatan Musyawaroh untuk ' + esc(s.k.nama) + '</h3>' + tgBox('_umum', umum, 'Tambah catatan / keputusan') + '</div>';
  }

  /** Satu butir (kendala / lainnya / usulan) + tanggapannya */
  function tgItem(bidang, label, isi, t) {
    return '<div class="tg-item" data-bidang="' + bidang + '">' + (label ? '<div class="tg-lbl">' + esc(label) + '</div>' : '') +
      '<div class="tg-text">' + esc(isi) + '</div>' + tgBox(bidang, t, 'Tanggapi') + '</div>';
  }
  function tgBox(bidang, t, tombol) {
    return t && t.isi
      ? '<div class="tg-resp"><div class="h">' + icon('reply', 'sm') + ' Tanggapan Musyawaroh <button class="tg-edit-btn" data-tg="' + bidang + '" title="Ubah tanggapan">' + icon('edit', 'sm') + '</button></div><div class="b">' + esc(t.isi) + '</div></div>'
      : '<button class="tg-btn" data-tg="' + bidang + '">' + icon('reply', 'sm') + ' ' + esc(tombol) + '</button>';
  }

  /** Klik "Tanggapi" → kotak isian di tempat; simpan optimistis (langsung tampil, sinkron di latar) */
  function bindTanggapan(slide, s, per, list, wajib) {
    slide.querySelectorAll('[data-flip]').forEach(c => { c.onclick = () => c.classList.toggle('flipped'); });
    if (s.t !== 'kelompok' || !s.l) return;
    const l = s.l;
    slide.querySelectorAll('[data-tg]').forEach(btn => {
      btn.onclick = () => {
        const bidang = btn.getAttribute('data-tg');
        const host = btn.closest('[data-bidang]');
        const lama = B.tanggapan(l.ID)[bidang];
        const tempat = btn.closest('.tg-resp') || btn;
        const ed = App.html('<div class="tg-edit"><textarea rows="3" placeholder="Tulis tanggapan, solusi, atau keputusan musyawaroh…">' + esc(lama ? lama.isi : '') + '</textarea>' +
          '<div class="row" style="gap:.5em;justify-content:flex-end;margin-top:.5em">' + (lama ? '<button class="btn btn-ghost btn-sm" data-tgdel style="margin-right:auto;color:var(--err)">' + icon('trash', 'sm') + ' Hapus</button>' : '') +
          '<button class="btn btn-soft btn-sm" data-tgcancel>Batal</button><button class="btn btn-primary btn-sm" data-tgsave>' + icon('save', 'sm') + ' Simpan</button></div></div>');
        tempat.replaceWith(ed);
        const ta = ed.querySelector('textarea');
        ta.focus();
        ta.setSelectionRange(ta.value.length, ta.value.length);
        const redraw = () => {
          const top = slide.scrollTop;
          slide.innerHTML = slideHtml(s, per, list, wajib);
          slide.scrollTop = top;
          bindTanggapan(slide, s, per, list, wajib);
          const again = slide.querySelector('[data-bidang="' + bidang + '"]');
          if (again) { again.classList.add('flash'); setTimeout(() => again.classList.remove('flash'), 900); }
        };
        const simpan = isi => {
          isi = isi.trim();
          const id = (lama && lama.id) || App.uuid();
          App.store.mutate('simpanTanggapan', { id: id, laporanId: l.ID, bidang: bidang, isi: isi }, d => {
            d.tanggapan = (d.tanggapan || []).filter(x => !(x.laporanId === l.ID && x.bidang === bidang));
            if (isi) d.tanggapan.push({ id: id, laporanId: l.ID, kelompokId: l.KelompokID, bulan: +l.Bulan, tahun: +l.Tahun, bidang: bidang, isi: isi, waktu: new Date().toISOString(), oleh: (App.auth.get() || {}).username || '' });
          }, { label: isi ? 'Simpan tanggapan' : 'Hapus tanggapan' });
          redraw();
        };
        ed.querySelector('[data-tgcancel]').onclick = redraw;
        ed.querySelector('[data-tgsave]').onclick = () => { if (!ta.value.trim() && !lama) { redraw(); return; } simpan(ta.value); };
        const del = ed.querySelector('[data-tgdel]');
        if (del) del.onclick = () => simpan('');
        ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ed.querySelector('[data-tgsave]').click(); } });
        if (host) host.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      };
    });
  }
})();
