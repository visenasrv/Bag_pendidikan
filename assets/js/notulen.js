/* ==========================================================================
   notulen.js — Lihat notulen (publik & admin) + Editor notulen (admin)
   Editor: Tempat (pilihan + Lainnya) & Tanggal, poin bernomor otomatis
   (berlanjut untuk Tempat + Tanggal yang sama), Enter = baris baru dalam
   satu poin, toolbar 5 warna, minimize ke pil mengambang, draf otomatis.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;

  const WARNA = [
    { n: 'Hitam', c: '#1F2937' }, { n: 'Merah', c: '#DC2626' }, { n: 'Biru', c: '#2563EB' },
    { n: 'Hijau', c: '#047857' }, { n: 'Emas', c: '#B8860B' },
  ];
  App.NOTULEN_WARNA = WARNA;

  function paperHtml(s) {
    return '<article class="paper"><div class="ph"><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b><span>' + icon('pin', 'sm') + ' ' + esc(s.tempat) + '</span></div><ol>' +
      (s.poin || []).map(p => '<li><span class="no">' + p.no + '.</span><div class="isi">' + App.sanitize(p.isi) + '</div></li>').join('') + '</ol></article>';
  }
  App.paperHtml = paperHtml;

  // ───────────────────────── Tampilan daftar & baca ─────────────────────────
  App.notulenView = {
    mount(el, list, opt) {
      opt = opt || {};
      list = list || [];
      if (!list.length) {
        el.innerHTML = '<div class="card"><div class="empty">' + icon('book') + '<b>Belum ada notulen</b><p>Notulen musyawaroh yang disimpan admin akan tampil di sini.</p></div></div>';
        return;
      }
      const prev = el._sel;
      const sel = new Set(prev && prev.size ? Array.from(prev).filter(id => list.some(s => s.sesiId === id)) : [list[0].sesiId]);
      el._sel = sel;
      let shown = new Set(sel);
      const draw = () => {
        el.innerHTML =
          '<section class="card"><div class="card-head" style="flex-wrap:wrap"><div><div class="card-title">' + icon('listCheck') + ' Daftar Sesi Notulen</div><div class="card-sub">' + list.length + ' sesi · terbaru di atas</div></div>' +
          '<div class="row" style="gap:6px"><button class="btn btn-ghost btn-xs" data-all>Pilih Semua</button><button class="btn btn-ghost btn-xs" data-none>Kosongkan</button></div></div>' +
          '<div data-list>' + list.map(s => '<div class="sesi-item ' + (sel.has(s.sesiId) ? 'on' : '') + '" data-id="' + esc(s.sesiId) + '">' +
            '<label class="check grow" style="min-height:40px"><input type="checkbox" ' + (sel.has(s.sesiId) ? 'checked' : '') + ' data-cb><span class="grow"><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b> — ' + esc(s.tempat) +
            '<div class="meta">' + (s.poin || []).length + ' poin</div></span></label>' +
            (opt.admin ? '<button class="icon-btn" data-edit title="Ubah">' + icon('edit') + '</button><button class="icon-btn" data-del title="Hapus sesi" style="color:var(--err)">' + icon('trash') + '</button>' : '') +
            '</div>').join('') + '</div>' +
          '<div class="fields" style="margin-top:14px"><button class="btn btn-outline" data-view>' + icon('eye') + ' Lihat (' + sel.size + ')</button><button class="btn btn-primary" data-pdf>' + icon('download') + ' Unduh PDF</button></div></section>' +
          '<div data-papers class="stack" style="margin-top:16px">' + list.filter(s => shown.has(s.sesiId)).map(paperHtml).join('') + '</div>';
        el.querySelectorAll('.sesi-item').forEach(row => {
          const id = row.getAttribute('data-id');
          row.querySelector('[data-cb]').onchange = e => {
            if (e.target.checked) sel.add(id); else sel.delete(id);
            row.classList.toggle('on', e.target.checked);
            el.querySelector('[data-view]').innerHTML = icon('eye') + ' Lihat (' + sel.size + ')';
          };
          const ed = row.querySelector('[data-edit]');
          if (ed) ed.onclick = () => opt.onEdit && opt.onEdit(list.find(s => s.sesiId === id));
          const de = row.querySelector('[data-del]');
          if (de) de.onclick = () => opt.onDelete && opt.onDelete(list.find(s => s.sesiId === id));
        });
        el.querySelector('[data-all]').onclick = () => { list.forEach(s => sel.add(s.sesiId)); draw(); };
        el.querySelector('[data-none]').onclick = () => { sel.clear(); shown = new Set(); draw(); };
        el.querySelector('[data-view]').onclick = () => {
          if (!sel.size) { App.toast('Pilih minimal satu sesi notulen.', 'warn'); return; }
          shown = new Set(sel);
          draw();
          const p = el.querySelector('[data-papers]');
          if (p.firstElementChild) p.firstElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        el.querySelector('[data-pdf]').onclick = e => {
          const pick = list.filter(s => sel.has(s.sesiId));
          if (!pick.length) { App.toast('Pilih minimal satu sesi notulen.', 'warn'); return; }
          App.pdf.run(e.currentTarget, () => App.pdf.notulen(pick));
        };
      };
      draw();
    },
  };

  // ───────────────────────── Editor notulen (admin) ─────────────────────────
  const DKEY = 'mp_notulen_draft';
  const Ed = (App.notulenEditor = {
    draft() { return App.ls.get(DKEY); },
    save(d) { App.ls.set(DKEY, d); Ed.pill(); },
    clear() { App.ls.del(DKEY); Ed.pill(); },
    hasContent(d) { return d && (d.poin || []).some(p => textOf(p.isi)); },
    baru() {
      const tempat = (App.B.set().tempat || [])[0] || '';
      return { mode: 'baru', sesiId: '', tempat: tempat, tempatLain: '', tanggal: App.today(), poin: [{ id: App.uuid(), isi: '' }], minimized: false };
    },
    fromSesi(s) {
      const opsi = App.B.set().tempat || [];
      const inList = opsi.some(t => t.toLowerCase() === String(s.tempat).toLowerCase());
      return {
        mode: 'ubah', sesiId: s.sesiId, tempat: inList ? opsi.find(t => t.toLowerCase() === String(s.tempat).toLowerCase()) : '__lain', tempatLain: inList ? '' : s.tempat,
        tanggal: s.tanggal, poin: (s.poin || []).map(p => ({ id: p.id, isi: p.isi })), minimized: false,
      };
    },

    /** Pil mengambang saat editor diperkecil */
    pill() {
      let p = document.getElementById('npill');
      const d = Ed.draft();
      const show = d && d.minimized && App.path().indexOf('/admin') === 0 && App.auth.valid();
      if (!show) { if (p) p.remove(); return; }
      const n = (d.poin || []).filter(x => textOf(x.isi)).length;
      if (!p) {
        p = document.createElement('button');
        p.id = 'npill';
        p.className = 'pill-float';
        p.onclick = () => {
          const dd = Ed.draft();
          if (dd) { dd.minimized = false; Ed.save(dd); }
          App.ls.set('mp_notulen_tab', 'catat');
          App.go('/admin/notulen');
        };
        document.body.appendChild(p);
      }
      p.innerHTML = icon('edit') + '<span>Notulen ' + (d.mode === 'ubah' ? '(ubah)' : '') + ' · ' + n + ' poin</span>' + icon('chevU', 'sm');
    },

    mount(el, onDone) {
      let d = Ed.draft();
      if (!d || d.minimized === undefined) d = Ed.baru();
      if (d.minimized) { d.minimized = false; Ed.save(d); }
      const opsi = App.B.set().tempat || [];
      let lastRich = null;

      const tempatVal = () => (d.tempat === '__lain' ? (d.tempatLain || '').trim() : d.tempat);
      const lanjutan = () => {
        if (d.mode !== 'baru') return null;
        const t = tempatVal().toLowerCase();
        return App.B.notulen().find(s => s.tanggal === d.tanggal && String(s.tempat).toLowerCase() === t) || null;
      };
      const startNo = () => {
        const s = lanjutan();
        return s ? Math.max(0, ...s.poin.map(p => +p.no || 0)) : 0;
      };
      const persist = App.debounce(() => Ed.save(d), 200);

      const draw = () => {
        const lj = lanjutan();
        const st = startNo();
        el.innerHTML =
          '<section class="card lg editor-wrap">' +
          '<div class="card-head"><div><div class="card-title">' + icon('edit') + (d.mode === 'ubah' ? ' Ubah Notulen' : ' Catat Notulen') + '</div><div class="card-sub">' +
          (d.mode === 'ubah' ? 'Ubah isi, urutan, tambah atau hapus poin sesi ini.' : 'Tekan Enter untuk baris baru dalam satu poin. Gunakan “Tambah Poin” untuk nomor berikutnya.') + '</div></div>' +
          '<div class="row" style="gap:4px"><button class="icon-btn" data-min title="Perkecil">' + icon('minimize') + '</button><button class="icon-btn" data-close title="Tutup">' + icon('x') + '</button></div></div>' +
          '<div class="fields"><div class="field"><label>Tempat <span class="req">*</span></label><select class="select" data-tempat>' +
          opsi.map(t => '<option' + (t === d.tempat ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
          '<option value="__lain"' + (d.tempat === '__lain' || (!opsi.length) ? ' selected' : '') + '>Lainnya…</option></select></div>' +
          '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="input" type="date" data-tgl value="' + esc(d.tanggal) + '"></div></div>' +
          '<div class="field ' + (d.tempat === '__lain' || !opsi.length ? '' : 'hidden') + '" data-lain-wrap style="margin-top:12px"><label>Nama tempat</label><input class="input" data-lain value="' + esc(d.tempatLain) + '" placeholder="Tulis nama tempat musyawaroh"></div>' +
          (lj ? '<div class="notice" style="margin-top:12px">' + icon('info') + '<div>Melanjutkan sesi <b>' + esc(App.fmtTanggal(lj.tanggal)) + ' — ' + esc(lj.tempat) + '</b>. Nomor poin dimulai dari <b>' + (st + 1) + '</b>.</div></div>' : '') +
          '<div class="toolbar" style="margin-top:16px"><span class="muted" style="font-size:12.5px;font-weight:600;margin-right:4px">Warna:</span>' +
          WARNA.map(w => '<button class="swatch" data-color="' + w.c + '" title="' + w.n + '" aria-label="' + w.n + '" style="background:' + w.c + '"></button>').join('') +
          '<span style="width:1px;height:24px;background:var(--border);margin:0 4px"></span><button class="btn btn-soft btn-xs" data-bold title="Tebal"><b>B</b></button></div>' +
          '<div data-poin style="margin-top:6px">' + d.poin.map((p, i) =>
            '<div class="poin" data-i="' + i + '"><span class="no">' + (st + i + 1) + '.</span>' +
            '<div class="rich" contenteditable="true" data-rich data-ph="Tulis poin notulen…">' + App.sanitize(p.isi) + '</div>' +
            '<div class="tools"><button class="icon-btn" data-up title="Naik" ' + (i === 0 ? 'disabled' : '') + '>' + icon('chevU', 'sm') + '</button>' +
            '<button class="icon-btn" data-down title="Turun" ' + (i === d.poin.length - 1 ? 'disabled' : '') + '>' + icon('chevD', 'sm') + '</button>' +
            '<button class="icon-btn" data-rm title="Hapus poin" style="color:var(--err)">' + icon('trash', 'sm') + '</button></div></div>').join('') + '</div>' +
          '<button class="btn btn-ghost btn-block" data-add style="margin-top:10px">' + icon('plusCircle') + ' Tambah Poin</button>' +
          '<div class="modal-foot" style="margin-top:16px"><button class="btn btn-soft" data-close2>' + icon('x') + ' Tutup</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan Notulen</button></div>' +
          '</section>';
        bind();
      };

      const bind = () => {
        const q = s => el.querySelector(s);
        q('[data-tempat]').onchange = e => { d.tempat = e.target.value; persist(); draw(); };
        q('[data-tgl]').onchange = e => { d.tanggal = e.target.value; persist(); draw(); };
        const lain = q('[data-lain]');
        if (lain) lain.oninput = App.debounce(() => { d.tempatLain = lain.value; persist(); const hadLj = !!el.querySelector('.notice'); if (!!lanjutan() !== hadLj) draw(); }, 350);
        el.querySelectorAll('[data-rich]').forEach((r, i) => {
          r.addEventListener('focus', () => { lastRich = r; });
          r.addEventListener('input', () => { d.poin[i].isi = r.innerHTML; persist(); });
          r.addEventListener('paste', e => {
            // tempel sebagai teks biasa agar format asing tidak ikut
            e.preventDefault();
            const t = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, t);
          });
        });
        el.querySelectorAll('[data-color]').forEach(b => {
          b.addEventListener('mousedown', e => e.preventDefault());
          b.onclick = () => {
            if (!lastRich) { App.toast('Klik dulu di dalam poin, pilih teks, lalu pilih warna.', 'info'); return; }
            lastRich.focus();
            try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* abaikan */ }
            document.execCommand('foreColor', false, b.getAttribute('data-color'));
            lastRich.dispatchEvent(new Event('input'));
          };
        });
        const bb = q('[data-bold]');
        bb.addEventListener('mousedown', e => e.preventDefault());
        bb.onclick = () => { if (lastRich) { lastRich.focus(); document.execCommand('bold'); lastRich.dispatchEvent(new Event('input')); } };
        el.querySelectorAll('.poin').forEach(row => {
          const i = +row.getAttribute('data-i');
          row.querySelector('[data-up]').onclick = () => { swap(i, i - 1); };
          row.querySelector('[data-down]').onclick = () => { swap(i, i + 1); };
          row.querySelector('[data-rm]').onclick = async () => {
            if (textOf(d.poin[i].isi)) {
              const ok = await App.confirm({ title: 'Hapus poin?', message: 'Poin nomor ' + (startNo() + i + 1) + ' akan dihapus.', ok: 'Hapus', danger: true });
              if (!ok) return;
            }
            d.poin.splice(i, 1);
            if (!d.poin.length) d.poin.push({ id: App.uuid(), isi: '' });
            persist(); draw();
          };
        });
        q('[data-add]').onclick = () => {
          d.poin.push({ id: App.uuid(), isi: '' });
          persist(); draw();
          const all = el.querySelectorAll('[data-rich]');
          const last = all[all.length - 1];
          if (last) { last.focus(); last.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        };
        q('[data-min]').onclick = () => { d.minimized = true; Ed.save(d); App.toast('Notulen diperkecil. Ketuk pil di pojok untuk melanjutkan.', 'info'); onDone && onDone('min'); };
        const tutup = async () => {
          if (Ed.hasContent(d)) {
            const ok = await App.confirm({ title: 'Tutup tanpa menyimpan?', message: 'Isian notulen yang belum disimpan akan hilang.', ok: 'Iya, tutup', cancel: 'Tidak', danger: true });
            if (!ok) return;
          }
          Ed.clear();
          onDone && onDone('close');
        };
        q('[data-close]').onclick = tutup;
        q('[data-close2]').onclick = tutup;
        q('[data-save]').onclick = () => simpan();
      };

      const swap = (a, b) => {
        if (b < 0 || b >= d.poin.length) return;
        const t = d.poin[a]; d.poin[a] = d.poin[b]; d.poin[b] = t;
        persist(); draw();
      };

      const simpan = () => {
        const tempat = tempatVal();
        if (!d.tanggal) { App.toast('Tanggal musyawaroh wajib diisi.', 'warn'); return; }
        if (!tempat) { App.toast('Tempat musyawaroh wajib diisi.', 'warn'); return; }
        const poin = d.poin.filter(p => textOf(p.isi)).map(p => ({ id: p.id, isi: App.sanitize(p.isi) }));
        if (!poin.length && d.mode === 'baru') { App.toast('Tulis minimal satu poin notulen.', 'warn'); return; }

        if (d.mode === 'ubah') {
          const sesiId = d.sesiId;
          App.store.mutate('ubahNotulen', { sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, poin: poin }, data => {
            const s = data.notulen.find(x => x.sesiId === sesiId);
            if (!s) return;
            s.tanggal = d.tanggal; s.tempat = tempat;
            s.poin = poin.map((p, i) => ({ id: p.id, no: i + 1, isi: p.isi }));
            if (!s.poin.length) data.notulen = data.notulen.filter(x => x.sesiId !== sesiId);
            sortSesi(data);
          }, { label: 'Ubah notulen' });
        } else {
          const lj = lanjutan();
          const sesiId = lj ? lj.sesiId : App.uuid();
          const st = startNo();
          App.store.mutate('simpanNotulen', { sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, poin: poin }, data => {
            let s = data.notulen.find(x => x.sesiId === sesiId);
            if (!s) { s = { sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, waktu: new Date().toISOString(), poin: [] }; data.notulen.unshift(s); }
            poin.forEach((p, i) => s.poin.push({ id: p.id, no: st + i + 1, isi: p.isi }));
            s.waktu = new Date().toISOString();
            sortSesi(data);
          }, { label: 'Simpan notulen' });
        }
        App.swrBust('notulen');
        Ed.clear();
        App.toast(d.mode === 'ubah' ? 'Perubahan notulen disimpan.' : 'Notulen tersimpan.');
        onDone && onDone('saved');
      };

      Ed.save(d);
      draw();
    },
  });

  function sortSesi(data) {
    data.notulen.sort((a, b) => (String(b.tanggal) + String(b.waktu)).localeCompare(String(a.tanggal) + String(a.waktu)));
  }
  function textOf(html) {
    const t = document.createElement('div');
    t.innerHTML = html || '';
    return (t.textContent || '').replace(/ /g, ' ').trim();
  }
  App.textOf = textOf;
})();
