/* ==========================================================================
   pengaturan.js — Kelompok & Pengurus (+ Dapuan), Logo, Akun & Email,
   Tempat Notulen, dan Tampilan. Perubahan data bersifat optimistic.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon, Store = App.store, B = App.B;

  const TABS = [['kelompok', 'Kelompok & Pengurus', 'users'], ['logo', 'Logo & Banner', 'image'], ['tampilan', 'Warna & Tema', 'palette'], ['akun', 'Akun & Email', 'key'], ['notulen', 'Tempat Notulen', 'pin'], ['monitoring', 'Monitoring', 'heart'], ['evaluasi', 'Lap. Evaluasi', 'pie']];

  App.route('/admin/pengaturan', App.admin.page('pengaturan', 'Pengaturan', function (c) {
    const tab = App.ls.get('mp_set_tab') || 'kelompok';
    c.innerHTML = '<div class="page-head"><div><h1>Pengaturan</h1><p>Kelompok, pengurus, logo, akun, dan tampilan aplikasi.</p></div></div>' +
      '<div class="tabs">' + TABS.map(t => '<button class="tab ' + (t[0] === tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + icon(t[2], 'sm') + ' ' + t[1] + '</button>').join('') + '</div><div data-body style="max-width:860px"></div>';
    c.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { App.ls.set('mp_set_tab', b.getAttribute('data-tab')); App.render(); }; });
    const body = c.querySelector('[data-body]');
    ({ kelompok: tabKelompok, logo: tabLogo, akun: tabAkun, notulen: tabTempat, tampilan: tabTampilan, monitoring: tabMonitoring, evaluasi: tabEvaluasi })[tab] ? ({ kelompok: tabKelompok, logo: tabLogo, akun: tabAkun, notulen: tabTempat, tampilan: tabTampilan, monitoring: tabMonitoring, evaluasi: tabEvaluasi })[tab](body) : tabKelompok(body);
  }));

  // ───────────────────────── Kelompok & Pengurus ─────────────────────────
  function tabKelompok(el) {
    const list = B.kelompok();
    const peserta = B.peserta();
    el.innerHTML = '<section class="card" style="padding:0;overflow:hidden"><div class="card-head" style="padding:16px 16px 4px"><div><div class="card-title">' + icon('users') + ' Kelompok & Pengurus</div>' +
      '<div class="card-sub">Satu daftar dipakai bersama: kelompok <b>wajib lapor</b> muncul di formulir & status laporan; semua kelompok aktif muncul di daftar hadir. ' +
      '<b>Seret ' + icon('grip', 'sm') + ' untuk mengubah urutan.</b></div></div>' +
      '<button class="btn btn-primary btn-sm" data-add>' + icon('plus') + ' Tambah</button></div>' +
      '<div style="border-top:1px solid var(--border);margin-top:12px" data-klist>' + (list.length ? list.map((k, i) => {
        const nP = peserta.filter(p => p.kelompokId === k.id).length;
        const nD = B.dapuan(k.id).length;
        return '<div class="kel-row ' + (k.aktif ? '' : 'off') + '" data-id="' + esc(k.id) + '">' +
          '<span class="kel-drag" title="Seret untuk memindah" aria-label="Seret untuk memindah">' + icon('grip') + '</span>' +
          '<span class="kel-no num">' + (i + 1) + '</span>' +
          '<div class="grow"><div class="name">' + esc(k.nama) + '</div><div class="chips" style="gap:6px;margin-top:4px">' +
          (k.wajib ? '<span class="badge ok">Wajib lapor</span>' : '<span class="badge">Pengurus</span>') + (k.aktif ? '' : '<span class="badge warn">Nonaktif</span>') +
          '<span class="badge">' + nP + ' peserta · ' + nD + ' dapuan</span></div></div>' +
          '<div class="kel-move"><button class="icon-btn" data-up="' + i + '" ' + (i === 0 ? 'disabled' : '') + ' aria-label="Naik">' + icon('chevU', 'sm') + '</button>' +
          '<button class="icon-btn" data-down="' + i + '" ' + (i === list.length - 1 ? 'disabled' : '') + ' aria-label="Turun">' + icon('chevD', 'sm') + '</button></div>' +
          '<button class="btn btn-soft btn-xs" data-edit="' + esc(k.id) + '">' + icon('edit', 'sm') + ' Ubah</button></div>';
      }).join('') : '<div class="empty">Belum ada kelompok.</div>') + '</div></section>';
    el.querySelector('[data-add]').onclick = () => modalKelompok(null);
    el.querySelectorAll('[data-edit]').forEach(b => { b.onclick = () => modalKelompok(B.kelompokById(b.getAttribute('data-edit'))); });
    const simpanUrutan = ids => {
      if (ids.join() === B.kelompok().map(k => k.id).join()) return;
      Store.mutate('kelolaKelompok', { op: 'reorder', ids: ids }, d => { d.kelompok.forEach(k => { k.urutan = ids.indexOf(k.id) + 1; }); }, { label: 'Urutan kelompok' });
      App.swrBust('cfg');
      for (let t = App.nowWita().y - 1; t <= App.nowWita().y; t++) App.swrBust('dash_' + t);
    };
    const move = (i, j) => {
      const ids = list.map(k => k.id);
      const t = ids[i]; ids[i] = ids[j]; ids[j] = t;
      simpanUrutan(ids);
    };
    el.querySelectorAll('[data-up]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-up'); move(i, i - 1); }; });
    el.querySelectorAll('[data-down]').forEach(b => { b.onclick = () => { const i = +b.getAttribute('data-down'); move(i, i + 1); }; });
    // Drag & drop (Sortable dimuat saat dibutuhkan; tombol naik/turun tetap ada sebagai cadangan)
    const box = el.querySelector('[data-klist]');
    App.lib('sortable').then(() => {
      if (!box.isConnected || !box.querySelector('.kel-row')) return;
      window.Sortable.create(box, {
        handle: '.kel-drag', animation: 160, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen', forceFallback: true, fallbackOnBody: true,
        onEnd: () => {
          const rows = Array.from(box.querySelectorAll('.kel-row'));
          rows.forEach((r, i) => { r.querySelector('.kel-no').textContent = i + 1; });
          const ids = rows.map(r => r.getAttribute('data-id'));
          simpanUrutan(ids);
          App.toast('Urutan kelompok disimpan.');
        },
      });
    }).catch(() => { /* tanpa drag: tombol naik/turun tetap berfungsi */ });
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

  // ───────────────────────── Logo & Banner ─────────────────────────
  const SLOT = {
    kiri: { judul: 'Logo Aplikasi', sub: 'PNG, JPG, atau SVG · maks. 1 MB. Dipakai di semua halaman, Mode Musyawaroh, dan kop PDF.', max: 512, fmt: 'image/png', key: 'logoKiri', ikon: 'landmark' },
    banner: { judul: 'Banner Beranda', sub: 'Gambar latar di bagian atas halaman depan. Disarankan gambar mendatar (mis. 1600 × 700 px), JPG/PNG. Otomatis diperkecil.', max: 1600, fmt: 'image/jpeg', key: 'banner', ikon: 'image' },
  };
  const pend = {};   // pratinjau yang belum disimpan — tetap ada walau halaman digambar ulang saat sinkron latar
  function tabLogo(el) {
    const draw = () => {
      el.innerHTML = Object.keys(SLOT).map(side => {
        const S = SLOT[side];
        const cur = App.logo.get(side);
        const src = pend[side] || (cur && cur.dataUrl);
        return '<section class="card" style="margin-bottom:16px"><div class="card-title">' + icon(S.ikon) + ' ' + S.judul + '</div><div class="card-sub">' + S.sub + '</div>' +
          '<div class="logo-slot ' + (side === 'banner' ? 'banner-slot' : 'logo-one') + '" style="margin-top:14px">' +
          (side === 'banner'
            ? '<div class="banner-prev hero ' + (src ? 'has-banner' : '') + '" style="' + (src ? 'background-image:linear-gradient(180deg, rgba(var(--b-rgb), .35) 0%, rgba(var(--b-rgb), .55) 45%, rgba(var(--b-rgb), .92) 100%), url(' + src + ');background-size:cover;background-position:center' : '') + '"><div class="pattern"></div><b>' + esc(App.meta().nama) + '</b><small>' + esc(App.meta().sub) + '</small></div>'
            : '<div class="prev">' + (src ? '<img src="' + src + '" alt="">' : icon(S.ikon, 'lg')) + '</div>') +
          (pend[side] ? '<span class="badge warn">Pratinjau — belum disimpan</span>' : '') +
          '<input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden data-file="' + side + '">' +
          '<div class="row wrap" style="justify-content:center">' +
          '<button class="btn btn-soft btn-sm" data-pick="' + side + '">' + icon('upload') + ' Pilih Gambar</button>' +
          (pend[side] ? '<button class="btn btn-primary btn-sm" data-save="' + side + '">' + icon('save') + ' Simpan</button><button class="btn btn-ghost btn-sm" data-cancel="' + side + '">Batal</button>' : '') +
          (!pend[side] && cur ? '<button class="btn btn-danger btn-sm" data-rm="' + side + '">' + icon('trash') + ' Hapus</button>' : '') + '</div></div></section>';
      }).join('');
      el.querySelectorAll('[data-pick]').forEach(b => { b.onclick = () => el.querySelector('[data-file="' + b.getAttribute('data-pick') + '"]').click(); });
      el.querySelectorAll('[data-file]').forEach(inp => {
        inp.onchange = async () => {
          const f = inp.files[0];
          const side = inp.getAttribute('data-file');
          if (!f) return;
          if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(f.type)) { App.toast('Format harus PNG, JPG, atau SVG.', 'warn'); return; }
          if (f.size > 8 * 1024 * 1024) { App.toast('Ukuran gambar maksimal 8 MB.', 'warn'); return; }
          try {
            pend[side] = await toPng(f, SLOT[side].max, SLOT[side].fmt);
            if (pend[side].length > 1300000) { delete pend[side]; App.toast('Gambar masih terlalu besar setelah diperkecil. Coba gambar lain.', 'warn'); return; }
            draw();
          } catch (e) { App.toast('Gambar tidak dapat dibaca.', 'err'); }
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
            if (Store.data) { Store.data.pengaturan[SLOT[side].key] = r.id; Store.persist(); }
            delete pend[side];
            App.swrBust('cfg');
            App.logo.paint();
            App.toast(SLOT[side].judul + ' tersimpan.');
            draw();
          } catch (e) { App.toast(e.message, 'err'); App.busy(b, false); }
        };
      });
      el.querySelectorAll('[data-rm]').forEach(b => {
        b.onclick = async () => {
          const side = b.getAttribute('data-rm');
          const ok = await App.confirm({ title: 'Hapus ' + SLOT[side].judul.toLowerCase() + '?', message: side === 'banner' ? 'Beranda kembali memakai latar warna bawaan.' : 'Logo akan diganti ikon bawaan.', ok: 'Hapus', danger: true });
          if (!ok) return;
          App.busy(b, true);
          try {
            await App.api.admin('hapusLogo', { posisi: side });
            App.ls.del('mp_logo_' + side);
            if (Store.data) { Store.data.pengaturan[SLOT[side].key] = ''; Store.persist(); }
            App.swrBust('cfg');
            App.logo.paint();
            draw();
          } catch (e) { App.toast(e.message, 'err'); App.busy(b, false); }
        };
      });
    };
    draw();
  }

  function toPng(file, max, fmt) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth || max, h = img.naturalHeight || max;
        const s = Math.min(1, max / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * s)), ch = Math.max(1, Math.round(h * s));
        const cv = document.createElement('canvas');
        cv.width = cw; cv.height = ch;
        const g = cv.getContext('2d');
        if (fmt === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, cw, ch); }
        g.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        res(fmt === 'image/jpeg' ? cv.toDataURL('image/jpeg', 0.82) : cv.toDataURL('image/png'));
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

  // ───────────────────────── Warna & Tema ─────────────────────────
  function tabTampilan(el) {
    let pilih = (B.set().warna || App.brand.current() || App.brand.BAWAAN).toUpperCase();
    const draw = () => {
      const m = App.theme.mode();
      const simpan = (B.set().warna || App.brand.BAWAAN).toUpperCase();
      el.innerHTML =
        '<section class="card lg"><div class="card-title">' + icon('palette') + ' Warna Utama Aplikasi</div><div class="card-sub">Dipakai di semua halaman (umum & admin), Mode Musyawaroh, grafik, dan kop PDF. Berlaku untuk semua pengguna.</div>' +
        '<div class="warna-grid" style="margin-top:16px">' + App.brand.PRESET.map(p =>
          '<button class="warna-opt ' + (pilih === p[1] ? 'on' : '') + '" data-w="' + p[1] + '"><span class="sw" style="background:linear-gradient(145deg,' + p[1] + ',' + p[1] + 'CC)"></span><span>' + p[0] + '</span></button>').join('') +
        '<label class="warna-opt custom ' + (App.brand.PRESET.some(p => p[1] === pilih) ? '' : 'on') + '"><input type="color" data-cw value="' + pilih + '"><span class="sw" style="background:' + pilih + '"></span><span>Pilih sendiri</span></label></div>' +
        '<div class="warna-prev" style="margin-top:16px"><span class="badge">Pratinjau</span><div class="row wrap" style="gap:8px;margin-top:10px"><button class="btn btn-primary btn-sm">' + icon('save', 'sm') + ' Tombol utama</button><button class="btn btn-outline btn-sm">Tombol garis</button><span class="badge ok">Sudah</span><span class="chip on">Aktif</span><code style="font-size:13px">' + pilih + '</code></div></div>' +
        '<div class="row wrap" style="margin-top:16px;gap:8px"><button class="btn btn-primary" data-simpan ' + (pilih === simpan ? 'disabled' : '') + '>' + icon('save') + ' Simpan Warna</button>' +
        '<button class="btn btn-ghost" data-reset ' + (pilih === App.brand.BAWAAN && simpan === App.brand.BAWAAN ? 'disabled' : '') + '>' + icon('refresh', 'sm') + ' Kembali ke Hijau Zamrud</button></div></section>' +
        '<section class="card lg" style="margin-top:16px"><div class="card-title">' + icon('moon') + ' Tema Tampilan</div><div class="card-sub">Pilihan diingat di perangkat ini saja.</div>' +
        '<div class="theme-pick" style="margin-top:16px">' + [['light', 'Terang', 'sun'], ['dark', 'Gelap', 'moon']].map(t =>
          '<button class="' + (m === t[0] ? 'on' : '') + '" data-m="' + t[0] + '">' + icon(t[2], 'lg') + t[1] + '</button>').join('') + '</div></section>';
      el.querySelectorAll('[data-m]').forEach(b => { b.onclick = () => { App.theme.set(b.getAttribute('data-m')); draw(); }; });
      const coba = w => { pilih = w.toUpperCase(); App.brand.apply(pilih); draw(); };   // pratinjau langsung
      el.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => coba(b.getAttribute('data-w')); });
      const cw = el.querySelector('[data-cw]');
      cw.oninput = App.debounce(() => coba(cw.value), 60);
      el.querySelector('[data-simpan]').onclick = () => simpanWarna(pilih);
      el.querySelector('[data-reset]').onclick = () => { pilih = App.brand.BAWAAN; App.brand.apply(''); simpanWarna(''); };
    };
    const simpanWarna = w => {
      Store.mutate('ubahPengaturan', { warna_utama: w }, d => { d.pengaturan.warna = w; }, { label: 'Warna utama' });
      App.brand.apply(w);
      App.swrBust('cfg');
      App.toast('Warna utama disimpan untuk semua pengguna.');
      draw();
    };
    // keluar tanpa menyimpan → kembalikan warna tersimpan
    App.onLeave(() => { const w = B.set().warna || ''; if ((w || App.brand.BAWAAN).toUpperCase() !== (App.brand.current() || App.brand.BAWAAN)) App.brand.apply(w); });
    draw();
  }

  // ───────────────────────── Sumber data Monitoring ─────────────────────────
  const WA_BAWAAN = "Assalamu'alaikum Bpk/Ibu, berikut orang tua yang sudah mengisi monitoring {bulan} {tahun}:\n\n{data}\n\nMohon amal sholih, sekiranya yang belum mengisi dapat segera mengisi. Untuk yang sudah mengisi kami syukuri, Alhamdulillah Jazakumullohu Khoiro.";
  const WA_BARIS = '{no}. {anak} — ortu: {pelapor}';
  /** v1.6.5: tautan Power BI untuk menu Lap. Evaluasi */
  function tabEvaluasi(el) {
    const s = B.set();
    const bawaan = s.evaluasiBawaan || App.EVALUASI_BAWAAN;
    el.innerHTML = '<section class="card lg"><div class="card-title">' + icon('pie') + ' Tautan Lap. Evaluasi (Power BI)</div>' +
      '<div class="card-sub">Laporan Power BI <b>"Publish to web"</b> yang ditampilkan di menu <b>Lap. Evaluasi</b> (umum & admin). Kosongkan untuk memakai tautan bawaan.</div>' +
      '<div class="field" style="margin-top:16px"><label>Tautan atau kode sematan</label><textarea class="input" data-u rows="3" placeholder="' + esc(bawaan) + '" style="font-size:13px">' + esc(s.evaluasiUrl || '') + '</textarea>' +
      '<div class="help">' + icon('info', 'sm') + 'Boleh menempel tautan <code>https://app.powerbi.com/view?r=…</code> atau seluruh kode <code>&lt;iframe …&gt;</code> dari Power BI (File → Sematkan laporan → Publikasikan ke web).</div></div>' +
      '<div class="row wrap" style="margin-top:16px;gap:8px"><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan</button><button class="btn btn-ghost" data-reset>' + icon('refresh', 'sm') + ' Pakai tautan bawaan</button><a class="btn btn-ghost" href="#/admin/evaluasi">' + icon('pie') + ' Buka Lap. Evaluasi</a></div></section>';
    const ta = el.querySelector('[data-u]');
    const simpan = v => {
      Store.mutate('ubahPengaturan', { evaluasi_url: v }, d => { d.pengaturan.evaluasiUrl = v; }, { label: 'Tautan Lap. Evaluasi' });
      const cfg = App.swrPeek('cfg'); if (cfg) cfg.evaluasiUrl = v || bawaan;
      App.toast(v ? 'Tautan Lap. Evaluasi disimpan.' : 'Memakai tautan bawaan.');
    };
    el.querySelector('[data-save]').onclick = () => {
      let v = ta.value.trim();
      const m = v.match(/src\s*=\s*["']([^"']+)["']/i);
      if (m) v = m[1].replace(/&amp;/g, '&');
      if (v && !/^https:\/\/[^\s"'<>]+$/.test(v)) { App.toast('Tautan harus diawali https:// (mis. tautan Power BI "Publish to web").', 'warn'); return; }
      if (v === bawaan) v = '';
      ta.value = v;
      simpan(v);
    };
    el.querySelector('[data-reset]').onclick = () => { ta.value = ''; simpan(''); };
  }

  function tabMonitoring(el) {
    const s = B.set();
    el.innerHTML = '<section class="card lg"><div class="card-title">' + icon('heart') + ' Sumber Data Monitoring & Bimbingan Akhlaq</div>' +
      '<div class="card-sub">Spreadsheet jawaban Google Form monitoring orang tua. Hanya <b>dibaca</b> — data di spreadsheet tidak diubah. Akun pemilik Apps Script harus punya akses (minimal Lihat).</div>' +
      '<div class="field" style="margin-top:16px"><label>ID atau tautan Google Sheets</label><input class="input" data-id placeholder="Kosongkan untuk memakai spreadsheet bawaan" value="' + esc(s.monitoringId || '') + '"><div class="help">' + icon('info', 'sm') + 'Boleh menempel tautan lengkap (https://docs.google.com/spreadsheets/d/…/edit).</div></div>' +
      '<div class="field" style="margin-top:14px"><label>Nama tab (opsional)</label><input class="input" data-tab placeholder="Kosongkan = tab pertama" value="' + esc(s.monitoringTab || '') + '"></div>' +
      '<div class="row wrap" style="margin-top:16px;gap:8px"><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan</button><button class="btn btn-soft" data-tes>' + icon('refresh') + ' Muat Ulang & Periksa Data</button><a class="btn btn-ghost" href="#/admin/monitoring">' + icon('chart') + ' Buka Dashboard</a></div>' +
      '<div data-hasil style="margin-top:14px"></div></section>' +
      '<section class="card lg" style="margin-top:16px"><div class="card-title">' + icon('message') + ' Format Teks WhatsApp (Data Rinci)</div>' +
      '<div class="card-sub">Dipakai tombol <b>Teks WA</b> di Dashboard Monitoring (umum & admin). Kosongkan untuk memakai format bawaan.</div>' +
      '<div class="field" style="margin-top:16px"><label>Isi pesan</label><textarea class="input" data-wa rows="7" style="font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13px">' + esc(s.monitoringWa || WA_BAWAAN) + '</textarea>' +
      '<div class="help">' + icon('info', 'sm') + 'Kode isian: <code>{bulan}</code> <code>{tahun}</code> <code>{data}</code> (daftar per kelompok) <code>{jumlah}</code> <code>{kelompok}</code> <code>{kategori}</code>. Huruf tebal WA: *teks*.</div></div>' +
      '<div class="field" style="margin-top:14px"><label>Format tiap baris data</label><input class="input" data-wab value="' + esc(s.monitoringWaBaris || WA_BARIS) + '">' +
      '<div class="help">' + icon('info', 'sm') + 'Kode isian: <code>{no}</code> <code>{anak}</code> <code>{pelapor}</code> <code>{kelompok}</code> <code>{kategori}</code> <code>{umur}</code> <code>{lp}</code> <code>{bulan}</code> <code>{tahun}</code>.</div></div>' +
      '<div class="row wrap" style="margin-top:16px;gap:8px"><button class="btn btn-primary" data-wasave>' + icon('save') + ' Simpan Format</button><button class="btn btn-ghost" data-wareset>' + icon('refresh', 'sm') + ' Kembalikan bawaan</button></div></section>';
    el.querySelector('[data-wareset]').onclick = () => { el.querySelector('[data-wa]').value = WA_BAWAAN; el.querySelector('[data-wab]').value = WA_BARIS; };
    el.querySelector('[data-wasave]').onclick = () => {
      let t = el.querySelector('[data-wa]').value.trim(), b = el.querySelector('[data-wab]').value.trim();
      if (t && t.indexOf('{data}') < 0) { App.toast('Isi pesan harus memuat {data} sebagai tempat daftar nama.', 'warn'); return; }
      if (t === WA_BAWAAN) t = '';
      if (b === WA_BARIS) b = '';
      Store.mutate('ubahPengaturan', { monitoring_wa: t, monitoring_wa_baris: b }, d => { d.pengaturan.monitoringWa = t; d.pengaturan.monitoringWaBaris = b; }, { label: 'Format teks WA' });
      [App.monitoringCache, App.swrPeek('mon')].forEach(d => { if (d) d.wa = { template: t || WA_BAWAAN, baris: b || WA_BARIS }; });
      App.swrBust('mon');
      App.toast('Format teks WA disimpan.');
    };
    const hasil = el.querySelector('[data-hasil]');
    const periksa = async btn => {
      App.busy(btn, true);
      hasil.innerHTML = '';
      try {
        const d = await App.api.admin('segarkanMonitoring', {});
        App.monitoringCache = d;
        App.swrBust('mon');
        hasil.innerHTML = '<div class="notice ok">' + icon('checkCircle') + '<div><b>Data terbaca.</b> ' + esc(d.judul) + ' · ' + App.fmtNum(d.rows.length) + ' laporan · ' + d.kelompok.length + ' kelompok · ' + App.fmtNum(d.jumlahAnak) + ' anak.</div></div>';
      } catch (e) {
        hasil.innerHTML = '<div class="notice err">' + icon('alertCircle') + '<div>' + esc(e.message) + '</div></div>';
      } finally { App.busy(btn, false); }
    };
    el.querySelector('[data-save]').onclick = async e => {
      const btn = e.currentTarget;
      App.busy(btn, true);
      try {
        const r = await App.api.admin('ubahPengaturan', { monitoring_sheet_id: el.querySelector('[data-id]').value.trim(), monitoring_tab: el.querySelector('[data-tab]').value.trim() });
        if (Store.data) { Store.data.pengaturan.monitoringId = r.monitoring_sheet_id || ''; Store.data.pengaturan.monitoringTab = r.monitoring_tab || ''; Store.persist(); }
        el.querySelector('[data-id]').value = r.monitoring_sheet_id || '';
        App.toast('Sumber data disimpan.');
        App.busy(btn, false);
        periksa(el.querySelector('[data-tes]'));
      } catch (er) { App.toast(er.message, 'err'); App.busy(btn, false); }
    };
    el.querySelector('[data-tes]').onclick = e => periksa(e.currentTarget);
  }
})();
