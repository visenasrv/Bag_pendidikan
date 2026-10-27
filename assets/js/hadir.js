/* ==========================================================================
   hadir.js — Daftar Hadir Musyawaroh (admin)
   - Peserta per kelompok pengurus: tambah/ubah/hapus, urut drag & drop
   - Hadir/Izin + Keterangan, sinkron otomatis untuk nama yang sama
   - Bar Total Hadir, Simpan Sesi Ini (append-only) → form direset
   v1.6: sinkron nama manual (orang yang sama, nama berbeda), persentase
   kehadiran per kelompok & keseluruhan (orang tersinkron dihitung 1),
   riwayat sesi bisa diubah / dihapus / diunduh PDF.
   Status sesi disimpan sebagai draf di perangkat sehingga aman bila
   halaman tertutup sebelum disimpan.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon, Store = App.store, B = App.B;
  const DKEY = 'mp_hadir_draft';
  const norm = s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

  function draft() {
    const d = App.ls.get(DKEY);
    if (d && d.st) return d;
    const tempat = (B.set().tempat || [])[0] || '';
    return { tempat: tempat, tempatLain: '', tanggal: App.today(), st: {} };
  }
  function saveDraft(d) { App.ls.set(DKEY, d); }

  App.route('/admin/hadir', App.admin.page('hadir', 'Daftar Hadir', function (c) {
    const d = draft();
    const opsi = B.set().tempat || [];
    const kel = B.kelompok().filter(k => k.aktif);
    const peserta = B.peserta();
    const kunci = App.hadirKunci(peserta);
    const anggota = {};   // kunci orang → daftar peserta (lintas kelompok)
    peserta.forEach(p => { const k = kunci(p.id, p.nama); (anggota[k] = anggota[k] || []).push(p); });
    const ctx = { kunci: kunci, anggota: anggota };
    // buang status untuk peserta yang sudah tidak ada
    Object.keys(d.st).forEach(id => { if (!peserta.some(p => p.id === id)) delete d.st[id]; });

    c.innerHTML =
      '<div class="page-head"><div><span class="badge ok" style="margin-bottom:6px">MODUL PRESENSI</span><h1>Daftar Hadir Musyawaroh</h1><p>Isi kehadiran pengurus, lalu simpan sesi. Riwayat lama tidak pernah ditimpa.</p></div>' +
      '<div class="actions"><button class="btn btn-soft btn-sm" data-sinkron>' + icon('refresh') + ' Sinkron Nama</button><button class="btn btn-soft btn-sm" data-riwayat>' + icon('clock') + ' Riwayat Sesi</button></div></div>' +
      '<section class="card"><div class="card-head"><div class="row"><span class="ico-tile sm">' + icon('calendar') + '</span><div><div class="card-title">Informasi Sesi Musyawaroh</div><div class="card-sub">Tempat & tanggal sesi yang sedang berjalan</div></div></div><span class="badge ok">' + icon('cloudCheck', 'sm') + ' Draf otomatis</span></div>' +
      '<div class="fields"><div class="field"><label>Tempat <span class="req">*</span></label><select class="select tinted" data-tempat>' + opsi.map(t => '<option' + (t === d.tempat ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
      '<option value="__lain"' + (d.tempat === '__lain' || !opsi.length ? ' selected' : '') + '>Lainnya…</option></select></div>' +
      '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="input tinted" type="date" data-tgl value="' + esc(d.tanggal) + '"></div></div>' +
      '<div class="field ' + (d.tempat === '__lain' || !opsi.length ? '' : 'hidden') + '" style="margin-top:12px"><label>Nama tempat</label><input class="input" data-lain value="' + esc(d.tempatLain || '') + '" placeholder="Tulis nama tempat"></div></section>' +

      '<div class="row between" style="margin:20px 0 10px"><div class="card-title">' + icon('users') + ' Daftar Kehadiran Peserta</div><span class="muted" style="font-size:13px">Total: ' + peserta.length + ' terdaftar</span></div>' +
      '<div class="stack" data-groups>' + kel.map(k => {
        const ps = peserta.filter(p => p.kelompokId === k.id).sort((a, b) => a.urutan - b.urutan);
        return '<section class="card hadir-group"><div class="gh"><div class="grow"><b>' + esc(k.nama) + '</b><div class="muted" style="font-size:12.5px">' + ps.length + ' pengurus</div></div>' +
          (ps.length ? '<div class="gp" data-gp="' + esc(k.id) + '"></div>' : '') +
          '<button class="btn btn-ghost btn-xs" data-addk="' + esc(k.id) + '">' + icon('userPlus', 'sm') + ' Tambah</button></div>' +
          '<div data-list="' + esc(k.id) + '">' + (ps.length ? ps.map((p, i) => rowHtml(p, i, d, ctx)).join('') : '<div class="empty" style="padding:18px">Belum ada peserta.</div>') + '</div></section>';
      }).join('') + '</div>' +
      '<button class="btn btn-outline btn-block" style="margin-top:14px" data-add>' + icon('userPlus') + ' Tambah Peserta</button>' +
      '<p class="muted" style="font-size:12.5px;margin-top:8px;text-align:center">' + icon('grip', 'sm') + ' Tarik gagang di kiri untuk mengatur urutan peserta.</p>' +
      '<div class="sumbar" data-sum></div>';

    const q = s => c.querySelector(s);
    const persist = () => saveDraft(d);
    q('[data-tempat]').onchange = e => { d.tempat = e.target.value; persist(); App.render(); };
    q('[data-tgl]').onchange = e => { d.tanggal = e.target.value; persist(); };
    const lain = q('[data-lain]');
    if (lain) lain.oninput = () => { d.tempatLain = lain.value; persist(); };
    q('[data-riwayat]').onclick = riwayat;
    q('[data-sinkron]').onclick = () => modalSinkron();
    q('[data-add]').onclick = () => modalPeserta(null, kel[0] && kel[0].id);
    c.querySelectorAll('[data-addk]').forEach(b => { b.onclick = () => modalPeserta(null, b.getAttribute('data-addk')); });

    const paintSum = () => {
      const h = drawSum(q('[data-sum]'), d, peserta, kunci);
      c.querySelectorAll('[data-gp]').forEach(el => {
        const g = h.kel[el.getAttribute('data-gp')] || { n: 0, h: 0, p: 0 };
        el.innerHTML = '<b class="num">' + g.h + '/' + g.n + '</b> hadir · <b class="num">' + App.fmtPct(g.p) + '</b><i style="--p:' + g.p + '%"></i>';
      });
    };

    c.querySelectorAll('.hadir-row').forEach(row => {
      const id = row.getAttribute('data-id');
      const p = peserta.find(x => x.id === id);
      row.querySelectorAll('[data-st]').forEach(b => {
        b.onclick = () => {
          const val = b.getAttribute('data-st');
          const cur = d.st[id] || {};
          const next = cur.s === val ? '' : val;
          setStatus(d, ctx, p, next);
          persist();
          // perbarui baris terkait tanpa render ulang penuh (instan)
          (anggota[kunci(p.id, p.nama)] || [p]).forEach(x => {
            const r = c.querySelector('.hadir-row[data-id="' + x.id + '"]');
            if (r) paintRow(r, d.st[x.id] || {});
          });
          paintSum();
        };
      });
      const ket = row.querySelector('[data-ket]');
      ket.oninput = () => { d.st[id] = Object.assign(d.st[id] || {}, { ket: ket.value }); persist(); };
      row.querySelector('[data-edit]').onclick = () => modalPeserta(p);
    });
    paintSum();

    q('[data-sum]').addEventListener('click', e => {
      const t = e.target.closest('[data-save],[data-reset]');
      if (!t) return;
      if (t.hasAttribute('data-save')) simpanSesi(d, peserta, kel, kunci);
      else resetSesi(d);
    });

    // Drag & drop urutan (Sortable dimuat saat dibutuhkan)
    App.lib('sortable').then(() => {
      if (!c.isConnected) return;
      c.querySelectorAll('[data-list]').forEach(list => {
        if (!list.querySelector('.hadir-row')) return;
        window.Sortable.create(list, {
          handle: '.drag', animation: 140, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
          onStart: () => { c._manual = true; },
          onEnd: () => {
            c._manual = false;
            const kid = list.getAttribute('data-list');
            const ids = Array.from(list.querySelectorAll('.hadir-row')).map(r => r.getAttribute('data-id'));
            ids.forEach((id, i) => { const r = list.querySelector('.hadir-row[data-id="' + id + '"] .no'); if (r) r.textContent = i + 1; });
            Store.mutate('pesertaReorder', { kelompokId: kid, ids: ids }, data => { data.peserta.forEach(p => { const i = ids.indexOf(p.id); if (i >= 0) p.urutan = i + 1; }); }, { label: 'Urutan peserta' });
          },
        });
      });
    }).catch(() => {});
  }));

  function rowHtml(p, i, d, ctx) {
    const st = d.st[p.id] || {};
    const grup = ctx.anggota[ctx.kunci(p.id, p.nama)] || [p];
    const lain = grup.filter(x => x.id !== p.id);
    const kn = id => { const k = B.kelompokById(id); return k ? k.nama : '?'; };
    return '<div class="hadir-row" data-id="' + esc(p.id) + '"><span class="drag" title="Tarik untuk mengurutkan">' + icon('grip', 'sm') + '</span><span class="no num">' + (i + 1) + '</span>' +
      '<div class="who"><b>' + esc(p.nama) + (lain.length ? '<span class="sync-pill" title="' + esc('Orang yang sama: ' + lain.map(x => x.nama + ' (' + kn(x.kelompokId) + ')').join(', ') + ' — status ikut tersinkron & dihitung 1 orang') + '">' + icon('refresh', 'sm') + ' Tersinkron' + (lain.some(x => norm(x.nama) !== norm(p.nama)) ? ' manual' : '') + '</span>' : '') + '</b><small>' + esc(p.dapuan || '—') + '</small></div>' +
      '<div class="ctl"><button class="st-btn hadir ' + (st.s === 'Hadir' ? 'on' : '') + '" data-st="Hadir">' + icon('checkCircle', 'sm') + '<span data-lbl>' + (st.s === 'Hadir' && st.auto ? 'Hadir (Otomatis)' : 'Hadir') + '</span></button>' +
      '<button class="st-btn izin ' + (st.s === 'Izin' ? 'on' : '') + '" data-st="Izin">' + icon('flag', 'sm') + 'Izin</button>' +
      '<button class="icon-btn" data-edit title="Ubah peserta" style="width:38px;height:38px">' + icon('edit', 'sm') + '</button></div>' +
      '<div class="ket"><input class="input" data-ket value="' + esc(st.ket || '') + '" placeholder="Keterangan (opsional)"></div></div>';
  }

  function paintRow(r, st) {
    r.querySelector('.st-btn.hadir').classList.toggle('on', st.s === 'Hadir');
    r.querySelector('.st-btn.izin').classList.toggle('on', st.s === 'Izin');
    r.querySelector('[data-lbl]').textContent = st.s === 'Hadir' && st.auto ? 'Hadir (Otomatis)' : 'Hadir';
  }

  /** Atur status + sinkron untuk nama yang sama di kelompok lain */
  function setStatus(d, ctx, p, val) {
    (ctx.anggota[ctx.kunci(p.id, p.nama)] || [p]).forEach(x => {
      const cur = d.st[x.id] || {};
      d.st[x.id] = Object.assign(cur, { s: val, auto: x.id !== p.id && !!val });
    });
  }

  /** Hitung sesi berjalan: orang tersinkron (nama sama / sinkron manual) dihitung 1 */
  function hitung(d, peserta, kunci) {
    return App.hadirRingkas(peserta.map(p => ({ pesertaId: p.id, kelompokId: p.kelompokId, nama: p.nama, status: (d.st[p.id] || {}).s || '' })), kunci || App.hadirKunci(peserta));
  }

  function drawSum(el, d, peserta, kunci) {
    const h = hitung(d, peserta, kunci);
    const belum = h.total - h.hadir - h.izin;
    const pct = h.persen;
    el.innerHTML = '<div class="top"><span class="ico-tile sm">' + icon('bar') + '</span><div class="grow"><div class="section-label">Total Hadir Sesi Ini</div>' +
      '<div class="row" style="gap:8px"><span class="big">' + h.hadir + '</span><span class="badge ok">' + h.hadir + ' dari ' + h.total + ' orang</span></div></div>' +
      '<div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm" data-reset style="color:var(--err)">' + icon('refresh') + ' Reset</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan Sesi Ini</button></div></div>' +
      '<div><div class="row between" style="font-size:12.5px"><span class="muted">Kehadiran keseluruhan kelompok <span class="hide-s">(orang tersinkron dihitung 1)</span></span><b class="num">' + App.fmtPct(pct) + '</b></div><div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="legend-dots"><span style="--c:var(--primary)">Hadir: <b>' + h.hadir + '</b></span><span style="--c:var(--gold)">Izin: <b>' + h.izin + '</b></span><span style="--c:var(--faint)">Belum konfirmasi: <b>' + belum + '</b></span></div>';
    return h;
  }

  async function resetSesi(d) {
    const ok = await App.confirm({ title: 'Reset form sesi?', message: 'Semua status Hadir/Izin dan keterangan sesi ini dikosongkan. Daftar peserta tidak berubah.', ok: 'Reset', danger: true });
    if (!ok) return;
    d.st = {};
    saveDraft(d);
    App.render();
  }

  async function simpanSesi(d, peserta, kel, kunci) {
    const tempat = d.tempat === '__lain' ? (d.tempatLain || '').trim() : d.tempat;
    if (!tempat) { App.toast('Isi tempat musyawaroh terlebih dahulu.', 'warn'); return; }
    if (!d.tanggal) { App.toast('Isi tanggal musyawaroh terlebih dahulu.', 'warn'); return; }
    if (!peserta.length) { App.toast('Belum ada peserta.', 'warn'); return; }
    const h = hitung(d, peserta, kunci);
    const ok = await App.confirm({
      title: 'Simpan sesi ini?',
      html: '<b>' + esc(App.fmtTanggal(d.tanggal)) + ' — ' + esc(tempat) + '</b><br>Hadir <b>' + h.hadir + '</b> · Izin <b>' + h.izin + '</b> · Belum konfirmasi <b>' + (h.total - h.hadir - h.izin) + '</b> dari ' + h.total + ' orang (<b>' + App.fmtPct(h.persen) + '</b>).<br><span class="muted" style="font-size:13px">Setelah disimpan, form direset untuk sesi berikutnya.</span>',
      ok: 'Simpan Sesi',
    });
    if (!ok) return;
    const rows = [];
    kel.forEach(k => {
      peserta.filter(p => p.kelompokId === k.id).sort((a, b) => a.urutan - b.urutan).forEach((p, i) => {
        const st = d.st[p.id] || {};
        rows.push({ pesertaId: p.id, kelompokId: k.id, no: i + 1, dapuan: p.dapuan, nama: p.nama, status: st.s || '', keterangan: st.ket || '', otomatis: !!st.auto });
      });
    });
    const sesiId = App.uuid();
    Store.mutate('simpanKehadiran', { sesiId: sesiId, tempat: tempat, tanggal: d.tanggal, rows: rows }, data => {
      data.riwayatHadir = data.riwayatHadir || [];
      data.riwayatHadir.unshift({ sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, waktu: new Date().toISOString(), hadir: h.hadir, izin: h.izin, total: h.total, persen: h.persen,
        kelompok: Object.keys(h.kel).map(k => ({ id: k, nama: (B.kelompokById(k) || {}).nama || '', n: h.kel[k].n, h: h.kel[k].h })) });
      data.kelompokBerhadir = Array.from(new Set((data.kelompokBerhadir || []).concat(rows.map(r => r.kelompokId))));
    }, { label: 'Simpan sesi kehadiran' });
    d.st = {};
    saveDraft(d);
    App.toast('Sesi kehadiran tersimpan. Form direset.');
    App.render();
  }

  // ───────────────────────── Riwayat sesi: unduh PDF, ubah, hapus (v1.6) ─────────────────────────
  function riwayat() {
    const m = App.modal({ title: 'Riwayat Sesi Kehadiran', sub: 'Sesi tersimpan (terbaru di atas) · unduh PDF, ubah, atau hapus', wide: true, body: '<div data-r></div>' });
    const gambar = () => {
      const list = (Store.data && Store.data.riwayatHadir) || [];
      const box = m.el.querySelector('[data-r]');
      if (!box) return;
      box.innerHTML = list.length ? list.map(s => {
        const p = s.persen !== undefined ? s.persen : (s.total ? Math.round(1000 * s.hadir / s.total) / 10 : 0);
        return '<div class="sesi-item riw"><span class="ico-tile sm">' + icon('calCheck') + '</span><div class="grow"><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b> — ' + esc(s.tempat) +
          '<div class="meta">Disimpan ' + esc(App.fmtWaktu(s.waktu)) + ' · <b class="num">' + s.hadir + '/' + s.total + '</b> orang hadir · izin ' + (s.izin || 0) + '</div>' +
          (s.kelompok && s.kelompok.length ? '<div class="riw-kel">' + s.kelompok.map(k => '<span title="' + esc(k.nama) + ': ' + k.h + ' dari ' + k.n + ' hadir">' + esc(k.nama) + ' <b>' + App.fmtPct(k.n ? 100 * k.h / k.n : 0) + '</b></span>').join('') + '</div>' : '') + '</div>' +
          '<span class="badge ok num riw-p">' + App.fmtPct(p) + '</span>' +
          '<div class="riw-act"><button class="btn btn-soft btn-xs" data-pdf="' + esc(s.sesiId) + '">' + icon('download', 'sm') + ' PDF</button>' +
          '<button class="btn btn-soft btn-xs" data-ubah="' + esc(s.sesiId) + '">' + icon('edit', 'sm') + ' Ubah</button>' +
          '<button class="btn btn-ghost btn-xs" data-hapus="' + esc(s.sesiId) + '" style="color:var(--err)">' + icon('trash', 'sm') + ' Hapus</button></div></div>';
      }).join('') : '<div class="empty">Belum ada sesi yang disimpan.</div>';
      const cari = id => list.find(x => x.sesiId === id);
      box.querySelectorAll('[data-pdf]').forEach(b => { b.onclick = e => App.pdf.run(e.currentTarget, async () => { const ss = await App.hadirAmbil([b.getAttribute('data-pdf')]); if (!ss.length) throw new Error('Sesi tidak ditemukan.'); await App.pdf.hadir(ss); }); });
      box.querySelectorAll('[data-ubah]').forEach(b => { b.onclick = () => ubahSesi(cari(b.getAttribute('data-ubah')), gambar); });
      box.querySelectorAll('[data-hapus]').forEach(b => { b.onclick = () => hapusSesi(cari(b.getAttribute('data-hapus')), gambar); });
    };
    gambar();
  }

  async function hapusSesi(s, done) {
    if (!s) return;
    const ok = await App.confirm({ title: 'Hapus sesi kehadiran?', html: '<b>' + esc(App.fmtTanggal(s.tanggal)) + ' — ' + esc(s.tempat) + '</b><br>Seluruh catatan hadir/izin sesi ini dihapus permanen dari spreadsheet.', ok: 'Hapus Sesi', danger: true });
    if (!ok) return;
    Store.mutate('hapusKehadiran', { sesiId: s.sesiId }, data => {
      data.riwayatHadir = (data.riwayatHadir || []).filter(x => x.sesiId !== s.sesiId);
    }, { label: 'Hapus sesi kehadiran' });
    App.hadirLupa(s.sesiId);
    App.toast('Sesi kehadiran dihapus.');
    if (done) done();
  }

  /** Ubah sesi tersimpan: tanggal, tempat, status Hadir/Izin & keterangan (sinkron ikut) */
  async function ubahSesi(s0, done) {
    if (!s0) return;
    let sesi;
    try { sesi = (await App.hadirAmbil([s0.sesiId], true))[0]; } catch (e) { App.toast(e.message, 'err'); return; }
    if (!sesi) { App.toast('Isi sesi tidak ditemukan.', 'err'); return; }
    const rows = sesi.rows.map(r => Object.assign({}, r));
    const kunci = App.hadirKunci(B.peserta());
    const grup = {};
    rows.forEach(r => { const k = kunci(r.pesertaId, r.nama); (grup[k] = grup[k] || []).push(r); });
    const urutKel = B.kelompok().map(k => k.id);
    const kelIds = Array.from(new Set(rows.map(r => r.kelompokId))).sort((a, b) => (urutKel.indexOf(a) + 1 || 999) - (urutKel.indexOf(b) + 1 || 999));
    const namaK = id => { const k = B.kelompokById(id); return k ? k.nama : ((rows.find(r => r.kelompokId === id) || {}).namaKelompok || '—'); };
    const opsi = B.set().tempat || [];
    const m = App.modal({
      title: 'Ubah Sesi Kehadiran', wide: true,
      body: '<div class="fields"><div class="field"><label>Tanggal</label><input class="input" type="date" data-tgl value="' + esc(sesi.tanggal) + '"></div>' +
        '<div class="field"><label>Tempat</label><input class="input" data-tmp list="dl-tmp" value="' + esc(sesi.tempat) + '"><datalist id="dl-tmp">' + opsi.map(t => '<option value="' + esc(t) + '">').join('') + '</datalist></div></div>' +
        '<div class="hadir-edit" data-rows>' + kelIds.map(kid => '<div class="he-kel"><div class="he-h"><b>' + esc(namaK(kid)) + '</b><span class="muted" data-hp="' + esc(kid) + '"></span></div>' +
          rows.filter(r => r.kelompokId === kid).sort((a, b) => a.no - b.no).map(r => '<div class="he-row" data-id="' + esc(r.id) + '"><span class="no num">' + (r.no || '') + '</span><div class="who"><b>' + esc(r.nama) + '</b><small>' + esc(r.dapuan || '—') + '</small></div>' +
            '<div class="ctl"><button class="st-btn hadir" data-st="Hadir">' + icon('checkCircle', 'sm') + 'Hadir</button><button class="st-btn izin" data-st="Izin">' + icon('flag', 'sm') + 'Izin</button></div>' +
            '<input class="input he-ket" data-ket value="' + esc(r.ket || '') + '" placeholder="Keterangan"></div>').join('') + '</div>').join('') + '</div>',
      foot: '<span class="muted grow" data-tot style="font-size:13px"></span><button class="btn btn-soft" data-x>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan Perubahan</button>',
    });
    const q = x => m.el.querySelector(x);
    const byId = {}; rows.forEach(r => { byId[r.id] = r; });
    const paint = () => {
      m.el.querySelectorAll('.he-row').forEach(el => {
        const r = byId[el.getAttribute('data-id')];
        el.querySelector('.st-btn.hadir').classList.toggle('on', r.status === 'Hadir');
        el.querySelector('.st-btn.izin').classList.toggle('on', r.status === 'Izin');
      });
      const h = App.hadirRingkas(rows, kunci);
      m.el.querySelectorAll('[data-hp]').forEach(el => { const g = h.kel[el.getAttribute('data-hp')] || { n: 0, h: 0, p: 0 }; el.textContent = g.h + '/' + g.n + ' hadir · ' + App.fmtPct(g.p); });
      q('[data-tot]').textContent = 'Keseluruhan: ' + h.hadir + '/' + h.total + ' orang · ' + App.fmtPct(h.persen);
    };
    m.el.querySelectorAll('.he-row').forEach(el => {
      const r = byId[el.getAttribute('data-id')];
      el.querySelectorAll('[data-st]').forEach(b => {
        b.onclick = () => {
          const v = b.getAttribute('data-st');
          const next = r.status === v ? 'Belum Konfirmasi' : v;
          (grup[kunci(r.pesertaId, r.nama)] || [r]).forEach(x => { x.status = next; x.otomatis = x !== r && (next === 'Hadir' || next === 'Izin'); });
          paint();
        };
      });
      el.querySelector('[data-ket]').oninput = e => { r.ket = e.target.value; };
    });
    paint();
    q('[data-save]').onclick = () => {
      const tanggal = q('[data-tgl]').value, tempat = q('[data-tmp]').value.trim();
      if (!tanggal || !tempat) { App.toast('Tanggal dan tempat wajib diisi.', 'warn'); return; }
      const h = App.hadirRingkas(rows, kunci);
      Store.mutate('ubahKehadiran', { sesiId: sesi.sesiId, tanggal: tanggal, tempat: tempat, rows: rows.map(r => ({ id: r.id, status: r.status, keterangan: r.ket, otomatis: !!r.otomatis })) }, data => {
        const x = (data.riwayatHadir || []).find(y => y.sesiId === sesi.sesiId);
        if (x) Object.assign(x, { tanggal: tanggal, tempat: tempat, hadir: h.hadir, izin: h.izin, total: h.total, persen: h.persen,
          kelompok: Object.keys(h.kel).map(k => ({ id: k, nama: namaK(k), n: h.kel[k].n, h: h.kel[k].h })) });
      }, { label: 'Ubah sesi kehadiran' });
      App.hadirSimpanLokal(Object.assign({}, sesi, { tanggal: tanggal, tempat: tempat, rows: rows.map(r => Object.assign({}, r, { status: r.status === 'Hadir' || r.status === 'Izin' ? r.status : 'Belum Konfirmasi' })) }));
      m.close(true);
      App.toast('Sesi kehadiran diperbarui.');
      if (done) done();
    };
  }

  // ───────────────────────── Sinkron nama manual (v1.6) ─────────────────────────
  function modalSinkron() {
    const m = App.modal({ title: 'Sinkron Nama', sub: 'Orang yang sama di beberapa kelompok dihitung 1 orang & statusnya ikut tersinkron', wide: true, body: '<div data-b></div>' });
    const gambar = () => {
      const box = m.el.querySelector('[data-b]');
      if (!box) return;
      const ps = B.peserta();
      const kunci = App.hadirKunci(ps);
      const grup = {};
      ps.forEach(p => { const k = kunci(p.id, p.nama); (grup[k] = grup[k] || []).push(p); });
      const kn = id => { const k = B.kelompokById(id); return k ? k.nama : '?'; };
      const label = p => p.nama + ' — ' + kn(p.kelompokId);
      const opsi = ps.slice().sort((a, b) => a.nama.localeCompare(b.nama) || kn(a.kelompokId).localeCompare(kn(b.kelompokId)));
      const daftar = Object.keys(grup).map(k => grup[k]).filter(g => g.length > 1);
      // saran: nama mirip di kelompok berbeda yang belum tersinkron
      const nn = s => App.normNama(s).replace(/[^a-z]/g, '');
      const saran = [];
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        if (a.kelompokId === b.kelompokId || kunci(a.id, a.nama) === kunci(b.id, b.nama)) continue;
        const x = nn(a.nama), y = nn(b.nama);
        if (x.length < 3 || y.length < 3) continue;
        const pendek = x.length <= y.length ? x : y, panjang = x.length <= y.length ? y : x;
        if (panjang.indexOf(pendek) >= 0 || jarak(x, y) <= 2) saran.push([a, b]);
      }
      box.innerHTML =
        '<div class="sync-form"><div class="field"><label>Peserta pertama</label><select class="select" data-a>' + opsi.map(p => '<option value="' + esc(p.id) + '">' + esc(label(p)) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Sama orangnya dengan</label><select class="select" data-b2>' + opsi.map((p, i) => '<option value="' + esc(p.id) + '"' + (i === 1 ? ' selected' : '') + '>' + esc(label(p)) + '</option>').join('') + '</select></div>' +
        '<button class="btn btn-primary" data-go>' + icon('refresh') + ' Sinkronkan</button></div>' +
        '<p class="muted" style="font-size:12.5px;margin:6px 0 0">' + icon('info', 'sm') + ' Nama yang ditulis <b>persis sama</b> (huruf besar/kecil & spasi diabaikan) sudah tersinkron otomatis.</p>' +
        (saran.length ? '<div class="why-sec"><div class="why-h">Saran: nama mirip<span class="badge">' + saran.length + '</span></div>' + saran.slice(0, 30).map((pr, i) =>
          '<div class="sync-grp"><div class="grow">' + pr.map(p => '<span class="sync-chip">' + esc(p.nama) + ' <small>' + esc(kn(p.kelompokId)) + '</small></span>').join('<span class="why-eq">≈</span>') + '</div><button class="btn btn-soft btn-xs" data-saran="' + i + '">' + icon('refresh', 'sm') + ' Sinkronkan</button></div>').join('') + '</div>' : '') +
        '<div class="why-sec"><div class="why-h">Sudah tersinkron<span class="badge">' + daftar.length + ' orang</span></div>' + (daftar.length ? daftar.map(g => {
          const manual = g.some(p => App.normNama(p.nama) !== App.normNama(g[0].nama));
          return '<div class="sync-grp"><div class="grow">' + g.map(p => '<span class="sync-chip">' + esc(p.nama) + ' <small>' + esc(kn(p.kelompokId)) + '</small>' +
            (p.sinkron ? '<button class="sync-x" data-lepas="' + esc(p.id) + '" title="Lepas dari sinkron manual" aria-label="Lepas">' + icon('x', 'sm') + '</button>' : '') + '</span>').join('') + '</div>' +
            '<span class="badge ' + (manual ? 'warn' : 'ok') + '">' + (manual ? 'manual' : 'nama sama') + '</span></div>';
        }).join('') : '<div class="empty" style="padding:14px">Belum ada nama yang tersinkron.</div>') + '</div>';
      const sinkron = (a, b) => {
        if (!a || !b || a.id === b.id) { App.toast('Pilih dua peserta yang berbeda.', 'warn'); return; }
        if (kunci(a.id, a.nama) === kunci(b.id, b.nama)) { App.toast('Keduanya sudah tersinkron.', 'info'); return; }
        const g = a.sinkron || b.sinkron || App.uuid().slice(0, 8);
        const lama = [a.sinkron, b.sinkron].filter(Boolean);
        const ids = ps.filter(p => p.id === a.id || p.id === b.id || (p.sinkron && lama.indexOf(p.sinkron) >= 0)).map(p => p.id);
        Store.mutate('pesertaSinkron', { ids: ids, grup: g }, data => { data.peserta.forEach(p => { if (ids.indexOf(p.id) >= 0) p.sinkron = g; }); }, { label: 'Sinkron nama' });
        App.toast(a.nama + ' & ' + b.nama + ' disinkronkan — dihitung 1 orang.');
        gambar();
      };
      const byId = id => ps.find(p => p.id === id);
      box.querySelector('[data-go]').onclick = () => sinkron(byId(box.querySelector('[data-a]').value), byId(box.querySelector('[data-b2]').value));
      box.querySelectorAll('[data-saran]').forEach(b => { b.onclick = () => { const pr = saran[+b.getAttribute('data-saran')]; sinkron(pr[0], pr[1]); }; });
      box.querySelectorAll('[data-lepas]').forEach(b => {
        b.onclick = () => {
          const id = b.getAttribute('data-lepas');
          Store.mutate('pesertaSinkron', { ids: [id], grup: '' }, data => { const p = data.peserta.find(x => x.id === id); if (p) p.sinkron = ''; }, { label: 'Lepas sinkron' });
          App.toast('Sinkron manual dilepas.');
          gambar();
        };
      });
    };
    gambar();
  }
  function jarak(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    let prev = Array.from({ length: b.length + 1 }, (x, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  function modalPeserta(p, defKel) {
    const baru = !p;
    const kel = B.kelompok().filter(k => k.aktif || (p && k.id === p.kelompokId));
    const st = { kid: p ? p.kelompokId : (defKel || (kel[0] && kel[0].id)), dapuan: p ? p.dapuan : '', nama: p ? p.nama : '' };
    const allNames = Array.from(new Set(B.peserta().map(x => x.nama))).sort();
    const m = App.modal({
      title: baru ? 'Tambah Peserta' : 'Ubah Peserta',
      body: '<div class="field"><label>Kelompok pengurus</label><select class="select" data-k>' + kel.map(k => '<option value="' + esc(k.id) + '"' + (k.id === st.kid ? ' selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>Dapuan / Jabatan</label><select class="select" data-d></select><input class="input hidden" data-dl placeholder="Tulis dapuan" style="margin-top:8px"></div>' +
        '<div class="field"><label>Nama peserta <span class="req">*</span></label><input class="input" data-n list="dl-nama" value="' + esc(st.nama) + '" placeholder="Nama lengkap" autofocus><datalist id="dl-nama">' + allNames.map(n => '<option value="' + esc(n) + '">').join('') + '</datalist>' +
        '<div class="help">' + icon('info', 'sm') + 'Nama yang sama di kelompok lain otomatis ikut tersinkron saat diisi Hadir/Izin.</div></div>',
      foot: (baru ? '' : '<button class="btn btn-danger" data-del style="margin-right:auto">' + icon('trash') + ' Hapus</button>') + '<button class="btn btn-soft" data-x>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan</button>',
    });
    const q = s => m.el.querySelector(s);
    const fillDap = () => {
      const list = B.dapuan(q('[data-k]').value);
      const cur = st.dapuan;
      const inList = list.some(x => x.nama === cur);
      q('[data-d]').innerHTML = '<option value="">— Pilih dapuan —</option>' + list.map(x => '<option' + (x.nama === cur ? ' selected' : '') + '>' + esc(x.nama) + '</option>').join('') + '<option value="__lain"' + (cur && !inList ? ' selected' : '') + '>Lainnya (tulis sendiri)…</option>';
      q('[data-dl]').classList.toggle('hidden', !(cur && !inList));
      if (cur && !inList) q('[data-dl]').value = cur;
    };
    fillDap();
    q('[data-k]').onchange = () => { st.dapuan = ''; fillDap(); };
    q('[data-d]').onchange = e => { const lainnya = e.target.value === '__lain'; q('[data-dl]').classList.toggle('hidden', !lainnya); st.dapuan = lainnya ? q('[data-dl]').value : e.target.value; if (lainnya) q('[data-dl]').focus(); };
    q('[data-dl]').oninput = e => { st.dapuan = e.target.value; };
    q('[data-save]').onclick = () => {
      const nama = q('[data-n]').value.trim();
      if (!nama) { q('[data-n]').closest('.field').classList.add('invalid'); q('[data-n]').focus(); return; }
      const kid = q('[data-k]').value;
      const dap = (st.dapuan || '').trim();
      if (baru) {
        const id = App.uuid();
        const urut = B.peserta().filter(x => x.kelompokId === kid).reduce((mx, x) => Math.max(mx, x.urutan), 0) + 1;
        Store.mutate('pesertaAdd', { id: id, kelompokId: kid, dapuan: dap, nama: nama, urutan: urut }, d => { d.peserta.push({ id: id, kelompokId: kid, dapuan: dap, nama: nama, urutan: urut }); }, { label: 'Tambah peserta' });
        App.toast(nama + ' ditambahkan.');
      } else {
        Store.mutate('pesertaUpdate', { id: p.id, kelompokId: kid, dapuan: dap, nama: nama }, d => {
          const x = d.peserta.find(y => y.id === p.id); if (x) Object.assign(x, { kelompokId: kid, dapuan: dap, nama: nama });
        }, { label: 'Ubah peserta' });
        App.toast('Data peserta diperbarui.');
      }
      m.close(true);
    };
    if (!baru) {
      q('[data-del]').onclick = async () => {
        const ok = await App.confirm({ title: 'Hapus ' + p.nama + '?', message: 'Peserta dihapus dari daftar. Riwayat kehadiran lama tetap tersimpan.', ok: 'Hapus', danger: true });
        if (!ok) return;
        m.close(true);
        Store.mutate('pesertaDelete', { id: p.id }, d => { d.peserta = d.peserta.filter(x => x.id !== p.id); }, { label: 'Hapus peserta' });
        const dd = App.ls.get(DKEY);
        if (dd && dd.st) { delete dd.st[p.id]; saveDraft(dd); }
        App.toast('Peserta dihapus.');
      };
    }
  }
})();
