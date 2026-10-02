/* ==========================================================================
   hadir.js — Daftar Hadir Musyawaroh (admin)
   - Peserta per kelompok pengurus: tambah/ubah/hapus, urut drag & drop
   - Hadir/Izin + Keterangan, sinkron otomatis untuk nama yang sama
   - Bar Total Hadir, Simpan Sesi Ini (append-only) → form direset
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
    const byNama = {};
    peserta.forEach(p => { const n = norm(p.nama); byNama[n] = (byNama[n] || 0) + 1; });
    // buang status untuk peserta yang sudah tidak ada
    Object.keys(d.st).forEach(id => { if (!peserta.some(p => p.id === id)) delete d.st[id]; });

    c.innerHTML =
      '<div class="page-head"><div><span class="badge ok" style="margin-bottom:6px">MODUL PRESENSI</span><h1>Daftar Hadir Musyawaroh</h1><p>Isi kehadiran pengurus, lalu simpan sesi. Riwayat lama tidak pernah ditimpa.</p></div>' +
      '<div class="actions"><button class="btn btn-soft btn-sm" data-riwayat>' + icon('clock') + ' Riwayat Sesi</button></div></div>' +
      '<section class="card"><div class="card-head"><div class="row"><span class="ico-tile sm">' + icon('calendar') + '</span><div><div class="card-title">Informasi Sesi Musyawaroh</div><div class="card-sub">Tempat & tanggal sesi yang sedang berjalan</div></div></div><span class="badge ok">' + icon('cloudCheck', 'sm') + ' Draf otomatis</span></div>' +
      '<div class="fields"><div class="field"><label>Tempat <span class="req">*</span></label><select class="select tinted" data-tempat>' + opsi.map(t => '<option' + (t === d.tempat ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
      '<option value="__lain"' + (d.tempat === '__lain' || !opsi.length ? ' selected' : '') + '>Lainnya…</option></select></div>' +
      '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="input tinted" type="date" data-tgl value="' + esc(d.tanggal) + '"></div></div>' +
      '<div class="field ' + (d.tempat === '__lain' || !opsi.length ? '' : 'hidden') + '" style="margin-top:12px"><label>Nama tempat</label><input class="input" data-lain value="' + esc(d.tempatLain || '') + '" placeholder="Tulis nama tempat"></div></section>' +

      '<div class="row between" style="margin:20px 0 10px"><div class="card-title">' + icon('users') + ' Daftar Kehadiran Peserta</div><span class="muted" style="font-size:13px">Total: ' + peserta.length + ' terdaftar</span></div>' +
      '<div class="stack" data-groups>' + kel.map(k => {
        const ps = peserta.filter(p => p.kelompokId === k.id).sort((a, b) => a.urutan - b.urutan);
        return '<section class="card hadir-group"><div class="gh"><div class="grow"><b>' + esc(k.nama) + '</b><div class="muted" style="font-size:12.5px">' + ps.length + ' pengurus</div></div>' +
          '<button class="btn btn-ghost btn-xs" data-addk="' + esc(k.id) + '">' + icon('userPlus', 'sm') + ' Tambah</button></div>' +
          '<div data-list="' + esc(k.id) + '">' + (ps.length ? ps.map((p, i) => rowHtml(p, i, d, byNama)).join('') : '<div class="empty" style="padding:18px">Belum ada peserta.</div>') + '</div></section>';
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
    q('[data-add]').onclick = () => modalPeserta(null, kel[0] && kel[0].id);
    c.querySelectorAll('[data-addk]').forEach(b => { b.onclick = () => modalPeserta(null, b.getAttribute('data-addk')); });

    const paintSum = () => drawSum(q('[data-sum]'), d, peserta);

    c.querySelectorAll('.hadir-row').forEach(row => {
      const id = row.getAttribute('data-id');
      const p = peserta.find(x => x.id === id);
      row.querySelectorAll('[data-st]').forEach(b => {
        b.onclick = () => {
          const val = b.getAttribute('data-st');
          const cur = d.st[id] || {};
          const next = cur.s === val ? '' : val;
          setStatus(d, peserta, p, next);
          persist();
          // perbarui baris terkait tanpa render ulang penuh (instan)
          peserta.filter(x => norm(x.nama) === norm(p.nama)).forEach(x => {
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
      if (t.hasAttribute('data-save')) simpanSesi(d, peserta, kel);
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

  function rowHtml(p, i, d, byNama) {
    const st = d.st[p.id] || {};
    return '<div class="hadir-row" data-id="' + esc(p.id) + '"><span class="drag" title="Tarik untuk mengurutkan">' + icon('grip', 'sm') + '</span><span class="no num">' + (i + 1) + '</span>' +
      '<div class="who"><b>' + esc(p.nama) + (byNama[norm(p.nama)] > 1 ? '<span class="sync-pill" title="Nama sama di kelompok lain — status ikut tersinkron">' + icon('refresh', 'sm') + ' Tersinkron</span>' : '') + '</b><small>' + esc(p.dapuan || '—') + '</small></div>' +
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
  function setStatus(d, peserta, p, val) {
    peserta.filter(x => norm(x.nama) === norm(p.nama)).forEach(x => {
      const cur = d.st[x.id] || {};
      d.st[x.id] = Object.assign(cur, { s: val, auto: x.id !== p.id && !!val });
    });
  }

  function hitung(d, peserta) {
    const names = {};
    peserta.forEach(p => {
      const n = norm(p.nama);
      const s = (d.st[p.id] || {}).s || '';
      if (!names[n] || s === 'Hadir' || (s === 'Izin' && names[n] !== 'Hadir')) names[n] = s || names[n] || '';
    });
    const v = Object.values(names);
    return { total: v.length, hadir: v.filter(x => x === 'Hadir').length, izin: v.filter(x => x === 'Izin').length };
  }

  function drawSum(el, d, peserta) {
    const h = hitung(d, peserta);
    const belum = h.total - h.hadir - h.izin;
    const pct = h.total ? Math.round((h.hadir / h.total) * 100) : 0;
    el.innerHTML = '<div class="top"><span class="ico-tile sm">' + icon('bar') + '</span><div class="grow"><div class="section-label">Total Hadir Sesi Ini</div>' +
      '<div class="row" style="gap:8px"><span class="big">' + h.hadir + '</span><span class="badge ok">' + h.hadir + ' dari ' + h.total + ' nama</span></div></div>' +
      '<div class="row" style="gap:8px"><button class="btn btn-ghost btn-sm" data-reset style="color:var(--err)">' + icon('refresh') + ' Reset</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan Sesi Ini</button></div></div>' +
      '<div><div class="row between" style="font-size:12.5px"><span class="muted">Tingkat kehadiran</span><b class="num">' + pct + '%</b></div><div class="progress"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="legend-dots"><span style="--c:var(--primary)">Hadir: <b>' + h.hadir + '</b></span><span style="--c:var(--gold)">Izin: <b>' + h.izin + '</b></span><span style="--c:var(--faint)">Belum konfirmasi: <b>' + belum + '</b></span></div>';
  }

  async function resetSesi(d) {
    const ok = await App.confirm({ title: 'Reset form sesi?', message: 'Semua status Hadir/Izin dan keterangan sesi ini dikosongkan. Daftar peserta tidak berubah.', ok: 'Reset', danger: true });
    if (!ok) return;
    d.st = {};
    saveDraft(d);
    App.render();
  }

  async function simpanSesi(d, peserta, kel) {
    const tempat = d.tempat === '__lain' ? (d.tempatLain || '').trim() : d.tempat;
    if (!tempat) { App.toast('Isi tempat musyawaroh terlebih dahulu.', 'warn'); return; }
    if (!d.tanggal) { App.toast('Isi tanggal musyawaroh terlebih dahulu.', 'warn'); return; }
    if (!peserta.length) { App.toast('Belum ada peserta.', 'warn'); return; }
    const h = hitung(d, peserta);
    const ok = await App.confirm({
      title: 'Simpan sesi ini?',
      html: '<b>' + esc(App.fmtTanggal(d.tanggal)) + ' — ' + esc(tempat) + '</b><br>Hadir <b>' + h.hadir + '</b> · Izin <b>' + h.izin + '</b> · Belum konfirmasi <b>' + (h.total - h.hadir - h.izin) + '</b> dari ' + h.total + ' nama.<br><span class="muted" style="font-size:13px">Setelah disimpan, form direset untuk sesi berikutnya.</span>',
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
      data.riwayatHadir.unshift({ sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, waktu: new Date().toISOString(), hadir: h.hadir, izin: h.izin, total: h.total });
      data.kelompokBerhadir = Array.from(new Set((data.kelompokBerhadir || []).concat(rows.map(r => r.kelompokId))));
    }, { label: 'Simpan sesi kehadiran' });
    d.st = {};
    saveDraft(d);
    App.toast('Sesi kehadiran tersimpan. Form direset.');
    App.render();
  }

  function riwayat() {
    const list = (Store.data && Store.data.riwayatHadir) || [];
    App.modal({
      title: 'Riwayat Sesi Kehadiran', sub: 'Sesi tersimpan (terbaru di atas)',
      body: list.length ? list.map(s => '<div class="sesi-item"><span class="ico-tile sm">' + icon('calCheck') + '</span><div class="grow"><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b> — ' + esc(s.tempat) +
        '<div class="meta">Disimpan ' + esc(App.fmtWaktu(s.waktu)) + '</div></div><span class="badge ok num">' + s.hadir + '/' + s.total + ' hadir</span></div>').join('') : '<div class="empty">Belum ada sesi yang disimpan.</div>',
    });
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
