/* ==========================================================================
   pengaturan.js — Kelompok & Pengurus (+ Dapuan), Logo, Akun & Email,
   Tempat Notulen, dan Tampilan. Perubahan data bersifat optimistic.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon, Store = App.store, B = App.B;

  const TABS = [['kelompok', 'Kelompok & Pengurus', 'users'], ['logo', 'Logo', 'image'], ['akun', 'Akun & Email', 'key'], ['notulen', 'Tempat Notulen', 'pin'], ['tampilan', 'Tampilan', 'palette']];

  App.route('/admin/pengaturan', App.admin.page('pengaturan', 'Pengaturan', function (c) {
    const tab = App.ls.get('mp_set_tab') || 'kelompok';
    c.innerHTML = '<div class="page-head"><div><h1>Pengaturan</h1><p>Kelompok, pengurus, logo, akun, dan tampilan aplikasi.</p></div></div>' +
      '<div class="tabs">' + TABS.map(t => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + icon(t[2], 'sm') + ' ' + t[1] + '</button>').join('') + '</div><div data-body style="max-width:860px"></div>';
    c.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { App.ls.set('mp_set_tab', b.getAttribute('data-tab')); App.render(); }; });
    const body = c.querySelector('[data-body]');
    ({ kelompok: tabKelompok, logo: tabLogo, akun: tabAkun, notulen: tabTempat, tampilan: tabTampilan })[tab](body);
  }));

  // ───────────────────────── Kelompok & Pengurus ─────────────────────────
  function tabKelompok(el) {
    const list = B.kelompok();
    const peserta = B.peserta();
    el.innerHTML = '<section class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 4px"><div><div class="card-title">' + icon('users') + ' Kelompok & Pengurus</div>' +
      '<div class="card-sub">Satu daftar dipakai bersama: kelompok <b>wajib lapor</b> muncul di formulir & status laporan; semua kelompok aktif muncul di daftar hadir.</div></div>' +
      '<button class="btn btn-primary btn-sm" data-add>' + icon('plus') + ' Tambah</button></div>' +
      '<div style="border-top:1px solid var(--border);margin-top:12px">' + (list.length ? list.map((k, i) => {
        const nP = peserta.filter(p => p.kelompokId === k.id).length;
        const nD = B.dapuan(k.id).length;
        return '<div class="kel-row ' + (k.aktif ? '' : 'off') + '"><div style="display:grid">' +
          '<button class="icon-btn" style="height:28px" data-up="' + i + '" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Naik">' + icon('chevU', 'sm') + '</button>' +
          '<button class="icon-btn" style="height:28px" data-down="' + i + '" ' + (i === list.length - 1 ? 'disabled' : '') + ' aria-label="Turun">' + icon('chevD', 'sm') + '</button></div>' +
          '<div class="grow"><div class="name">' + esc(k.nama) + '</div><div class="chips" style="gap:6px;margin-top:4px">' +
          (k.wajib ? '<span class="badge ok">Wajib lapor</span>' : '<span class="badge">Pengurus</span>') + (k.aktif ? '' : '<span class="badge warn">Nonaktif</span>') +
          '<span class="badge">' + nP + ' peserta · ' + nD + ' dapuan</span></div></div>' +
          '<button class="btn btn-soft btn-xs" data-edit="' + esc(k.id) + '">' + icon('edit', 'sm') + ' Ubah</button></div>';
      }).join('') : '<div class="empty">Belum ada kelompok.</div>') + '</div></section>';
    el.querySelector('[data-add]').onclick = () => modalKelompok(null);
    el.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => modalKelompok(B.kelompokById(b.getAttribute('data-edit'))); });
    const move = (i, j) => {
      const ids = list.map(k => k.id);
      const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
      Store.mutate('kelolaKelompok', { op: 'reorder', ids: ids }, d => { d.kelompok.forEach(k => { k.urutan = ids.indexOf(k.id) + 1; }); }, { label: 'Urutan kelompok' });
      App.swrBust('cfg');
    };
    el.querySelectorAll('[data-up]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-up'); move(i, i - 1); }; });
    el.querySelectorAll('[data-down]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-down'); move(i, i + 1); }; });
  }

  function modalKelompok(k) {
    const baru = !k;
    const st = { nama: k ? k.nama : '', wajib: k ? k.wajib : true, aktif: k ? k.aktif : true };
    const m = App.modal({
      title: baru ? 'Tambah Kelompok / Pengurus' : 'Ubah ' + k.nama, wide: !baru,
      body: '<div class="field"><label>Nama <span class="req">*</span></label><input class="input" data-nama value="' + esc(st.nama) + '" maxlength="100" placeholder="mis. Sangatta Selatan 3 atau Tim Desa" autofocus></div>' +
        '<div class="row between" style="margin-top:16px"><div><b>Wajib lapor</b><div class="muted" style="font-size:12.5px">Muncul di formulir laporan & status sudah/belum lapor</div></div><label class="switch"><input type="checkbox" data-wajib ' + (st.wajib ? 'checked' : '') + '></label></div>' +
        '<div class="row between" style="margin-top:14px"><div><b>Aktif</b><div class="muted" style="font-size:12.5px">Nonaktif = disembunyikan, data lama tetap tersimpan</div></div><label class="switch"><input type="checkbox" data-aktif ' + (st.aktif ? 'checked' : '') + '></label></div>' +
        (baru ? '' : '<hr class="divider"><div class="row between"><div><b>Pilihan Dapuan</b><div class="muted" style="font-size:12.5px">Dipakai pada dropdown Dapuan di Daftar Hadir. Perubahan langsung tersimpan.</div></div></div><div data-dap style="margin-top:8px"></div>' +
          '<div class="row" style="margin-top:8px"><input class="input" data-dapnew placeholder="Tambah dapuan baru…" style="min-height:40px"><button class="btn btn-soft btn-sm" data-dapadd>' + icon('plus') + ' Tambah</button></div>'),
      foot: (baru ? '' : '<button class="btn btn-danger" data-del style="margin-right:auto">' + icon('trash') + ' Hapus</button>') +
        '<button class="btn btn-soft" data-x>Batal</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan</button>',
    });
    const q = s => m.el.querySelector(s);

    const drawDap = () => {
      const box = q('[data-dap]');
      if (!box) return;
      const list = B.dapuan(k.id);
      box.innerHTML = list.length ? list.map((d, i) => '<div class="dap-row"><span class="muted num" style="width:22px;text-align:right">' + (i + 1) + '.</span><input class="input" data-dn="' + esc(d.id) + '" value="' + esc(d.nama) + '">' +
        '<button class="icon-btn" data-du="' + i + '" ' + (i === 0 ? 'disabled' : '') + '>' + icon('chevU', 'sm') + '</button><button class="icon-btn" data-dd="' + i + '" ' + (i === list.length - 1 ? 'disabled' : '') + '>' + icon('chevD', 'sm') + '</button>' +
        '<button class="icon-btn" data-dx="' + esc(d.id) + '" style="color:var(--err)">' + icon('trash', 'sm') + '</button></div>').join('') : '<div class="muted" style="font-size:13px;padding:8px 0">Belum ada dapuan.</div>';
      box.querySelectorAll('[data-dn]').forEach(inp => {
        inp.onchange = () => {
          const id = inp.getAttribute('data-dn'), nama = inp.value.trim();
          const lama = (B.dapuan(k.id).find(x => x.id === id) || {}).nama;
          if (!nama) { inp.value = lama; return; }
          if (nama === lama) return;
          Store.mutate('kelolaDapuan', { op: 'update', id: id, nama: nama }, d => {
            const x = d.dapuan.find(y => y.id === id); if (x) x.nama = nama;
            d.peserta.forEach(p => { if (p.kelompokId === k.id && p.dapuan === lama) p.dapuan = nama; });
          }, { label: 'Ubah dapuan' });
          App.toast('Dapuan diperbarui · peserta ikut menyesuaikan.');
        };
      });
      const reorder = (i, j) => {
        const ids = B.dapuan(k.id).map(x => x.id);
        const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
        Store.mutate('kelolaDapuan', { op: 'reorder', ids: ids }, d => { d.dapuan.forEach(x => { if (ids.indexOf(x.id) >= 0) x.urutan = ids.indexOf(x.id) + 1; }); }, { label: 'Urutan dapuan' });
        drawDap();
      };
      box.querySelectorAll('[data-du]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-du'); reorder(i, i - 1); }; });
      box.querySelectorAll('[data-dd]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-dd'); reorder(i, i + 1); }; });
      box.querySelectorAll('[data-dx]').forEach(b => {
        b.onclick = () => {
          const id = b.getAttribute('data-dx');
          Store.mutate('kelolaDapuan', { op: 'delete', id: id }, d => { d.dapuan = d.dapuan.filter(x => x.id !== id); }, { label: 'Hapus dapuan' });
          drawDap();
        };
      });
    };
    if (!baru) {
      drawDap();
      const addDap = () => {
        const inp = q('[data-dapnew]');
        const nama = inp.value.trim();
        if (!nama) { inp.focus(); return; }
        const id = App.uuid();
        const urut = B.dapuan(k.id).length + 1;
        Store.mutate('kelolaDapuan', { op: 'add', id: id, kelompokId: k.id, nama: nama }, d => { d.dapuan.push({ id: id, kelompokId: k.id, nama: nama, urutan: urut }); }, { label: 'Tambah dapuan' });
        inp.value = '';
        drawDap();
        inp.focus();
      };
      q('[data-dapadd]').onclick = addDap;
      q('[data-dapnew]').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addDap(); } });
      q('[data-del]').onclick = async () => {
        const punyaLap = B.laporan().some(l => l.KelompokID === k.id);
        const punyaHadir = ((Store.data && Store.data.kelompokBerhadir) || []).indexOf(k.id) >= 0;
        if (punyaLap || punyaHadir) {
          App.toast(k.nama + ' sudah punya ' + (punyaLap ? 'laporan' : 'riwayat kehadiran') + ', jadi tidak bisa dihapus. Nonaktifkan saja.', 'warn', { ms: 6000 });
          return;
        }
        const ok = await App.confirm({ title: 'Hapus ' + k.nama + '?', message: 'Daftar dapuan dan peserta di kelompok ini juga ikut dihapus.', ok: 'Hapus', danger: true });
        if (!ok) return;
        m.close(true);
        Store.mutate('kelolaKelompok', { op: 'delete', id: k.id }, d => {
          d.kelompok = d.kelompok.filter(x => x.id !== k.id);
          d.dapuan = d.dapuan.filter(x => x.kelompokId !== k.id);
          d.peserta = d.peserta.filter(x => x.kelompokId !== k.id);
        }, { label: 'Hapus kelompok' });
        App.swrBust('cfg');
        App.toast('Kelompok dihapus.');
      };
    }
    q('[data-save]').onclick = () => {
      const nama = q('[data-nama]').value.trim();
      const wajib = q('[data-wajib]').checked, aktif = q('[data-aktif]').checked;
      if (!nama) { q('[data-nama]').closest('.field').classList.add('invalid'); q('[data-nama]').focus(); return; }
      if (B.kelompok().some(x => x.nama.toLowerCase() === nama.toLowerCase() && (!k || x.id !== k.id))) { App.toast('Nama "' + nama + '" sudah dipakai.', 'warn'); return; }
      if (baru) {
        const id = App.uuid();
        const urut = B.kelompok().reduce((mx, x) => Math.max(mx, x.urutan), 0) + 1;
        Store.mutate('kelolaKelompok', { op: 'add', id: id, nama: nama, wajib: wajib, aktif: aktif, urutan: urut }, d => { d.kelompok.push({ id: id, nama: nama, wajib: wajib, aktif: aktif, urutan: urut }); }, { label: 'Tambah kelompok' });
        App.toast(nama + ' ditambahkan.');
      } else {
        Store.mutate('kelolaKelompok', { op: 'update', id: k.id, nama: nama, wajib: wajib, aktif: aktif }, d => { const x = d.kelompok.find(y => y.id === k.id); if (x) Object.assign(x, { nama: nama, wajib: wajib, aktif: aktif }); }, { label: 'Ubah kelompok' });
        App.toast(nama !== k.nama ? 'Nama diganti menjadi ' + nama + '.' : 'Perubahan disimpan.');
      }
      App.swrBust('cfg');
      for (let t = App.nowWita().y - 1; t <= App.nowWita().y; t++) App.swrBust('dash_' + t);
      m.close(true);
    };
  }

  // ───────────────────────── Logo ─────────────────────────
  function tabLogo(el) {
    const pend = {};
    const draw = () => {
      el.innerHTML = '<section class="card"><div class="card-title">' + icon('image') + ' Logo Kop</div><div class="card-sub">PNG, JPG, atau SVG · maks. 1 MB. Logo otomatis diperkecil & dipakai di semua halaman, Mode Musyawaroh, dan PDF.</div>' +
        '<div class="grid-2" style="margin-top:16px">' + ['kiri', 'kanan'].map(side => {
          const cur = App.logo.get(side);
          const src = pend[side] || (cur && cur.dataUrl);
          return '<div class="logo-slot"><b>Logo ' + side + '</b><div class="prev">' + (src ? '<img src="' + src + '" alt="">' : icon(side === 'kiri' ? 'landmark' : 'cap', 'lg')) + '</div>' +
            (pend[side] ? '<span class="badge warn">Pratinjau — belum disimpan</span>' : '') +
            '<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden data-file="' + side + '">' +
            '<div class="row wrap" style="justify-content:center">' +
            '<button class="btn btn-soft btn-sm" data-pick="' + side + '">' + icon('upload') + ' Pilih Gambar</button>' +
            (pend[side] ? '<button class="btn btn-primary btn-sm" data-save="' + side + '">' + icon('save') + ' Simpan</button><button class="btn btn-ghost btn-sm" data-cancel="' + side + '">Batal</button>' : '') +
            (!pend[side] && cur ? '<button class="btn btn-danger btn-sm" data-rm="' + side + '">' + icon('trash') + ' Hapus</button>' : '') + '</div></div>';
        }).join('') + '</div></section>';
      el.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => el.querySelector('[data-file="' + b.getAttribute('data-pick') + '"]').click(); });
      el.querySelectorAll('[data-file]').forEach(inp => {
        inp.onchange = async () => {
          const f = inp.files[0];
          if (!f) return;
          if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { App.toast('Format harus PNG, JPG, atau SVG.', 'warn'); return; }
          if (f.size > 1024 * 1024) { App.toast('Ukuran logo maksimal 1 MB.', 'warn'); return; }
          try { pend[inp.getAttribute('data-file')] = await toPng(f, 512); draw(); } catch (e) { App.toast('Gambar tidak dapat dibaca.', 'err'); }
        };
      });
      el.querySelectorAll('[data-cancel]').forEach(b => { b.onclick = () => { delete pend[b.getAttribute('data-cancel')]; draw(); }; });
      el.querySelectorAll('[data-save]').forEach(b => {
        b.onclick = async () => {
          const side = b.getAttribute('data-save');
          App.busy(b, true);
          try {
            const r = await App.api.admin('unggahLogo', { posisi: side, dataUrl: pend[side] });
            App.ls.set('mp_logo_' + side, { id: r.id, dataUrl: pend[side] });
            if (Store.data) { Store.data.pengaturan[side === 'kiri' ? 'logoKiri' : 'logoKanan'] = r.id; Store.persist(); }
            delete pend[side];
            App.swrBust('cfg');
            App.logo.paint();
            App.toast('Logo ' + side + ' tersimpan.');
            draw();
          } catch (e) { App.toast(e.message, 'err'); App.busy(b, false); }
        };
      });
      el.querySelectorAll('[data-rm]').forEach(b => {
        b.onclick = async () => {
          const side = b.getAttribute('data-rm');
          const ok = await App.confirm({ title: 'Hapus logo ' + side + '?', message: 'Logo akan diganti ikon bawaan.', ok: 'Hapus', danger: true });
          if (!ok) return;
          App.busy(b, true);
          try {
            await App.api.admin('hapusLogo', { posisi: side });
            App.ls.del('mp_logo_' + side);
            if (Store.data) { Store.data.pengaturan[side === 'kiri' ? 'logoKiri' : 'logoKanan'] = ''; Store.persist(); }
            App.swrBust('cfg');
            App.logo.paint();
            draw();
          } catch (e) { App.toast(e.message, 'err'); App.busy(b, false); }
        };
      });
    };
    draw();
  }

  /** Ubah gambar apa pun (termasuk SVG) menjadi PNG persegi maks. `max` px — ringan & cocok untuk PDF */
  function toPng(file, max) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || max, h = img.naturalHeight || max;
        const s = Math.min(1, max / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        cv.getContext('2d').drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        res(cv.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('img')); };
      img.src = url;
    });
  }

  // ───────────────────────── Akun & Email ─────────────────────────
  function tabAkun(el) {
    const s = B.set();
    const em = String(s.emailPenerima || '').split(',').map(x => x.trim());
    el.innerHTML =
      '<section class="card lg"><div class="card-title">' + icon('mail') + ' Email Penerima Notifikasi</div><div class="card-sub">Dua pengurus menerima email setiap ada laporan baru atau koreksi.</div>' +
      '<div class="fields" style="margin-top:16px"><div class="field"><label>Email 1</label><input class="input" type="email" data-e1 value="' + esc(em[0] || '') + '" placeholder="nama@gmail.com"></div>' +
      '<div class="field"><label>Email 2</label><input class="input" type="email" data-e2 value="' + esc(em[1] || '') + '" placeholder="nama@gmail.com"></div></div>' +
      '<div class="field" style="margin-top:16px"><label>Alamat aplikasi (untuk tombol di email)</label><input class="input" data-url value="' + esc(s.urlAplikasi || location.href.split('#')[0]) + '"></div>' +
      '<button class="btn btn-primary" style="margin-top:16px" data-save-mail>' + icon('save') + ' Simpan</button></section>' +

      '<section class="card lg" style="margin-top:16px"><div class="card-title">' + icon('landmark') + ' Identitas Aplikasi</div>' +
      '<div class="field" style="margin-top:14px"><label>Nama aplikasi</label><input class="input" data-nama value="' + esc(s.namaAplikasi || '') + '"></div>' +
      '<div class="field"><label>Subjudul kop</label><input class="input" data-sub value="' + esc(s.subjudul || '') + '"></div>' +
      '<button class="btn btn-primary" style="margin-top:16px" data-save-id>' + icon('save') + ' Simpan</button></section>' +

      '<section class="card lg" style="margin-top:16px"><div class="card-title">' + icon('key') + ' Ganti Password</div><div class="card-sub">Username: <b>' + esc(s.username || '') + '</b>. Setelah diganti, perangkat lain yang sedang login akan keluar otomatis.</div>' +
      '<div class="field" style="margin-top:14px"><label>Password lama</label><input class="input" type="password" data-old autocomplete="current-password"></div>' +
      '<div class="fields"><div class="field"><label>Password baru (min. 8)</label><input class="input" type="password" data-new autocomplete="new-password"></div><div class="field"><label>Ulangi password baru</label><input class="input" type="password" data-new2 autocomplete="new-password"></div></div>' +
      '<div data-pmsg style="margin-top:12px"></div><button class="btn btn-deep" style="margin-top:12px" data-pw>' + icon('lock') + ' Ganti Password</button></section>';
    const q = x => el.querySelector(x);
    q('[data-save-mail]').onclick = () => {
      const list = [q('[data-e1]').value.trim(), q('[data-e2]').value.trim()].filter(Boolean);
      const bad = list.find(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
      if (bad) { App.toast('Email tidak valid: ' + bad, 'warn'); return; }
      const v = list.join(', '), url = q('[data-url]').value.trim();
      Store.mutate('ubahPengaturan', { email_penerima: v, url_aplikasi: url }, d => { d.pengaturan.emailPenerima = v; d.pengaturan.urlAplikasi = url; }, { label: 'Email penerima' });
      App.toast('Pengaturan email disimpan.');
    };
    q('[data-save-id]').onclick = () => {
      const nama = q('[data-nama]').value.trim(), sub = q('[data-sub]').value.trim();
      if (!nama) { App.toast('Nama aplikasi wajib diisi.', 'warn'); return; }
      Store.mutate('ubahPengaturan', { nama_aplikasi: nama, subjudul: sub }, d => { d.pengaturan.namaAplikasi = nama; d.pengaturan.subjudul = sub; }, { label: 'Identitas' });
      App.swrBust('cfg');
      App.toast('Identitas aplikasi disimpan.');
    };
    q('[data-pw]').onclick = async e => {
      const lama = q('[data-old]').value, baru = q('[data-new]').value, ulang = q('[data-new2]').value;
      const msg = q('[data-pmsg]');
      const err = t => { msg.innerHTML = '<div class="notice err">' + icon('alertCircle') + '<div>' + esc(t) + '</div></div>'; };
      msg.innerHTML = '';
      if (!lama) return err('Isi password lama.');
      if (baru.length < 8) return err('Password baru minimal 8 karakter.');
      if (baru !== ulang) return err('Ulangan password baru tidak sama.');
      App.busy(e.currentTarget, true);
      try {
        const r = await App.api.admin('gantiPassword', { lama: lama, baru: baru });
        const a = App.auth.get() || {};
        App.auth.set(r.token, a.username, Date.now() + 8 * 3600e3);
        ['[data-old]', '[data-new]', '[data-new2]'].forEach(x => { q(x).value = ''; });
        msg.innerHTML = '<div class="notice">' + icon('checkCircle') + '<div>Password berhasil diganti.</div></div>';
      } catch (er) { err(er.message); }
      App.busy(e.currentTarget, false);
    };
  }

  // ───────────────────────── Tempat notulen ─────────────────────────
  function tabTempat(el) {
    let list = (B.set().tempat || []).slice();
    const draw = () => {
      el.innerHTML = '<section class="card lg"><div class="card-title">' + icon('pin') + ' Pilihan Tempat Musyawaroh</div><div class="card-sub">Muncul di Catat Notulen dan Daftar Hadir. Pilihan “Lainnya…” selalu tersedia.</div>' +
        '<div style="margin-top:12px" data-list>' + list.map((t, i) => '<div class="dap-row"><span class="muted num" style="width:22px;text-align:right">' + (i + 1) + '.</span><input class="input" data-i="' + i + '" value="' + esc(t) + '"><button class="icon-btn" data-x="' + i + '" style="color:var(--err)">' + icon('trash', 'sm') + '</button></div>').join('') + '</div>' +
        '<div class="row" style="margin-top:8px"><input class="input" data-new placeholder="Tambah tempat…" style="min-height:40px"><button class="btn btn-soft btn-sm" data-add>' + icon('plus') + ' Tambah</button></div>' +
        '<button class="btn btn-primary" style="margin-top:16px" data-save>' + icon('save') + ' Simpan</button></section>';
      el.querySelectorAll('[data-i]').forEach(inp => { inp.oninput = () => { list[+inp.getAttribute('data-i')] = inp.value; }; });
      el.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => { list.splice(+b.getAttribute('data-x'), 1); draw(); }; });
      const add = () => { const v = el.querySelector('[data-new]').value.trim(); if (!v) return; list.push(v); draw(); el.querySelector('[data-new]').focus(); };
      el.querySelector('[data-add]').onclick = add;
      el.querySelector('[data-new]').addEventListener('keydown', e => { if (e.key === 'Enter') add(); });
      el.querySelector('[data-save]').onclick = () => {
        const clean = list.map(t => t.trim().replace(/\|/g, '/')).filter(Boolean);
        Store.mutate('ubahPengaturan', { tempat_notulen: clean.join('|') }, d => { d.pengaturan.tempat = clean; }, { label: 'Tempat notulen' });
        App.swrBust('cfg');
        App.toast('Pilihan tempat disimpan.');
      };
    };
    draw();
  }

  // ───────────────────────── Tampilan ─────────────────────────
  function tabTampilan(el) {
    const draw = () => {
      const m = App.theme.mode();
      el.innerHTML = '<section class="card lg"><div class="card-title">' + icon('palette') + ' Tema Tampilan</div><div class="card-sub">Pilihan diingat di perangkat ini.</div>' +
        '<div class="theme-pick" style="margin-top:16px">' + [['light', 'Terang', 'sun'], ['dark', 'Gelap', 'moon'], ['system', 'Ikuti Perangkat', 'monitor']].map(t =>
          '<button class="' + (m === t[0] ? 'on' : '') + '" data-m="' + t[0] + '">' + icon(t[2], 'lg') + t[1] + '</button>').join('') + '</div></section>';
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { App.theme.set(b.getAttribute('data-m')); draw(); }; });
    };
    draw();
  }
})();
