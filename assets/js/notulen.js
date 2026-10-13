/* ==========================================================================
   notulen.js — Lihat notulen (publik & admin) + Editor notulen (admin)
   v1.3: editor bergaya Google Dokumen — satu dokumen per sesi dengan
   toolbar lengkap (font, ukuran, B/I/U/S, warna, stabilo, tautan, gambar,
   perataan, spasi baris, checklist, poin, nomor, indentasi, hapus format),
   penggaris, dan halaman putih. Tempat & Tanggal tetap seperti sebelumnya.
   Notulen lama (poin bernomor) otomatis tampil sebagai daftar bernomor.
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;
  const MARK = '<!--doc-->';

  // Palet warna mirip Google Dokumen + warna aplikasi
  const WARNA_TEKS = ['#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#D9D9D9', '#FFFFFF',
    '#980000', '#FF0000', '#FF9900', '#FFD600', '#00B050', '#00B0F0', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
    '#064E3B', '#047857', '#DC2626', '#2563EB', '#B8860B', '#7C3AED', '#DB2777'];
  const WARNA_STABILO = ['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#CFE2F3', '#EAD1DC', '#F4CCCC', '#FDE68A', '#BBF7D0'];
  App.NOTULEN_WARNA = WARNA_TEKS.slice(17, 22).map(c => ({ n: c, c: c }));
  const FONT = ['Arial', 'Calibri', 'Georgia', 'Plus Jakarta Sans', 'Times New Roman', 'Verdana', 'Courier New'];
  const UKURAN = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72];
  const GAYA = [['P', 'Teks normal'], ['H1', 'Judul 1'], ['H2', 'Judul 2'], ['H3', 'Judul 3']];

  // ───────────────────────── Model data sesi ─────────────────────────
  const isDoc = s => !!(s && s.poin && s.poin[0] && String(s.poin[0].isi).indexOf(MARK) === 0);
  /** HTML dokumen satu sesi (sesi lama → daftar bernomor) */
  App.notulenDoc = function (s) {
    if (!s) return '';
    if (isDoc(s)) return s.poin.map(p => String(p.isi)).join('').slice(MARK.length);
    const ps = (s.poin || []).filter(p => textOf(p.isi));
    if (!ps.length) return '';
    const mulai = +ps[0].no || 1;
    return '<ol' + (mulai > 1 ? ' start="' + mulai + '"' : '') + '>' + ps.map(p => '<li>' + p.isi + '</li>').join('') + '</ol>';
  };
  const jumlahKata = html => (textOf(html).match(/\S+/g) || []).length;
  App.notulenInfo = s => (isDoc(s) ? jumlahKata(App.notulenDoc(s)) + ' kata' : (s.poin || []).length + ' poin');

  function paperHtml(s) {
    return '<article class="paper"><div class="ph"><b>' + esc(App.fmtTanggal(s.tanggal)) + '</b><span>' + icon('pin', 'sm') + ' ' + esc(s.tempat) + '</span></div>' +
      '<div class="doc-body">' + App.sanitize(App.notulenDoc(s)) + '</div></article>';
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
            '<div class="meta">' + esc(App.notulenInfo(s)) + '</div></span></label>' +
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

  // ───────────────────────── Ikon toolbar (gaya Material) ─────────────────────────
  const P = {
    undo: 'M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z',
    redo: 'M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z',
    bold: 'M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z',
    italic: 'M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z',
    underline: 'M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z',
    strike: 'M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z',
    color: 'M11 2 5.5 16h2.25l1.12-3h6.25l1.12 3h2.25L13 2h-2zm-1.38 9L12 4.67 14.38 11H9.62z',
    hilite: 'M17.75 7 14 3.25l-10 10V17h3.75l10-10zm2.96-2.96a.996.996 0 0 0 0-1.41L18.37.29a.996.996 0 0 0-1.41 0L15 2.25 18.75 6l1.96-1.96z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    comment: 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM17 11h-4v4h-2v-4H7V9h4V5h2v4h4v2z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    left: 'M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z',
    center: 'M7 15v2h10v-2H7zm-4 6h18v-2H3v2zm0-8h18v-2H3v2zm4-6v2h10V7H7zM3 3v2h18V3H3z',
    right: 'M3 21h18v-2H3v2zm6-4h12v-2H9v2zm-6-4h18v-2H3v2zm6-4h12V7H9v2zM3 3v2h18V3H3z',
    justify: 'M3 21h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18v-2H3v2zm0-4h18V7H3v2zm0-6v2h18V3H3z',
    spacing: 'M6 7h2.5L5 3.5 1.5 7H4v10H1.5L5 20.5 8.5 17H6V7zm4-2v2h12V5H10zm0 14h12v-2H10v2zm0-6h12v-2H10v2z',
    check: 'M22 7h-9v2h9V7zm0 8h-9v2h9v-2zM5.54 11 2 7.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 11zm0 8L2 15.46l1.41-1.41 2.12 2.12 4.24-4.24 1.41 1.41L5.54 19z',
    bullet: 'M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z',
    number: 'M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z',
    more: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    outdent: 'M11 17h10v-2H11v2zm-8-5 4 4V8l-4 4zm0 9h18v-2H3v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z',
    indent: 'M3 21h18v-2H3v2zM3 8v8l4-4-4-4zm8 9h10v-2H11v2zM3 3v2h18V3H3zm8 6h10V7H11v2zm0 4h10v-2H11v2z',
    clear: 'M3.27 5 2 6.27l6.97 6.97L6.5 19h3l1.57-3.66L16.73 21 18 19.73 3.55 5.27 3.27 5zM6 5v.18L8.82 8h2.4l-.72 1.68 2.1 2.1L14.21 8H20V5H6z',
    hr: 'M3 11h18v2H3z',
    caret: 'M7 10l5 5 5-5z',
    minus: 'M19 13H5v-2h14v2z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  };
  const svg = (k, extra) => '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="' + P[k] + '"/>' + (extra || '') + '</svg>';
  const tb = (cmd, k, title, extra) => '<button type="button" class="tb" data-cmd="' + cmd + '" title="' + title + '" aria-label="' + title + '">' + svg(k, extra) + '</button>';
  const tbDrop = (cmd, k, title) => '<span class="tb-split">' + tb(cmd, k, title) + '<button type="button" class="tb caret" data-menu="' + cmd + '" title="Pilihan ' + title.toLowerCase() + '" aria-label="Pilihan ' + title.toLowerCase() + '">' + svg('caret') + '</button></span>';
  const sep = '<span class="tb-sep"></span>';

  // ───────────────────────── Editor notulen (admin) ─────────────────────────
  const DKEY = 'mp_notulen_draft';
  const Ed = (App.notulenEditor = {
    draft() {
      const d = App.ls.get(DKEY);
      if (d && d.doc === undefined && d.poin) {
        // draf versi lama (poin) → dokumen
        d.doc = App.notulenDoc({ poin: d.poin.map((p, i) => ({ no: i + 1, isi: p.isi })) }) || '';
        delete d.poin;
      }
      return d;
    },
    save(d) { App.ls.set(DKEY, d); Ed.pill(); },
    clear() { App.ls.del(DKEY); Ed.pill(); },
    hasContent(d) { return !!(d && d.doc && (textOf(d.doc) || /<img/i.test(d.doc))); },
    baru() {
      const tempat = (App.B.set().tempat || [])[0] || '';
      return { mode: 'baru', sesiId: '', tempat: tempat, tempatLain: '', tanggal: App.today(), doc: '', minimized: false };
    },
    fromSesi(s) {
      const opsi = App.B.set().tempat || [];
      const inList = opsi.some(t => t.toLowerCase() === String(s.tempat).toLowerCase());
      return {
        mode: 'ubah', sesiId: s.sesiId, tempat: inList ? opsi.find(t => t.toLowerCase() === String(s.tempat).toLowerCase()) : '__lain', tempatLain: inList ? '' : s.tempat,
        tanggal: s.tanggal, doc: App.sanitize(App.notulenDoc(s)), minimized: false,
      };
    },

    /** Pil mengambang saat editor diperkecil */
    pill() {
      let p = document.getElementById('npill');
      const d = Ed.draft();
      const show = d && d.minimized && App.path().indexOf('/admin') === 0 && App.auth.valid();
      if (!show) { if (p) p.remove(); return; }
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
      p.innerHTML = icon('edit') + '<span>Notulen ' + (d.mode === 'ubah' ? '(ubah)' : '') + ' · ' + jumlahKata(d.doc) + ' kata</span>' + icon('chevU', 'sm');
    },

    /** opt.embedded = dipasang di panel Mode Musyawaroh. Mengembalikan { destroy(), judul(teks) }. */
    mount(el, onDone, opt) {
      opt = opt || {};
      const bersih = [];
      let d = Ed.draft();
      if (!d || d.minimized === undefined) d = Ed.baru();
      if (d.minimized) { d.minimized = false; }
      Ed.save(d);
      const opsi = App.B.set().tempat || [];
      const tempatVal = () => (d.tempat === '__lain' ? (d.tempatLain || '').trim() : d.tempat);
      const lanjutan = () => {
        if (d.mode !== 'baru') return null;
        const t = tempatVal().toLowerCase();
        return App.B.notulen().find(s => s.tanggal === d.tanggal && String(s.tempat).toLowerCase() === t) || null;
      };
      const persist = App.debounce(() => Ed.save(d), 500);

      el.innerHTML =
        '<section class="card lg editor-wrap gdoc">' +
        '<div class="card-head"><div><div class="card-title">' + icon('edit') + ' <span data-judul></span></div><div class="card-sub">Tulis seperti di Google Dokumen. Draf tersimpan otomatis di perangkat ini.</div></div>' +
        '<div class="row" style="gap:4px"><button class="icon-btn" data-min title="Perkecil">' + icon('minimize') + '</button><button class="icon-btn" data-close title="Tutup">' + icon('x') + '</button></div></div>' +
        '<div class="fields"><div class="field"><label>Tempat <span class="req">*</span></label><select class="select" data-tempat>' +
        opsi.map(t => '<option' + (t === d.tempat ? ' selected' : '') + '>' + esc(t) + '</option>').join('') +
        '<option value="__lain"' + (d.tempat === '__lain' || (!opsi.length) ? ' selected' : '') + '>Lainnya…</option></select></div>' +
        '<div class="field"><label>Tanggal <span class="req">*</span></label><input class="input" type="date" data-tgl value="' + esc(d.tanggal) + '"></div></div>' +
        '<div class="field ' + (d.tempat === '__lain' || !opsi.length ? '' : 'hidden') + '" data-lain-wrap style="margin-top:12px"><label>Nama tempat</label><input class="input" data-lain value="' + esc(d.tempatLain) + '" placeholder="Tulis nama tempat musyawaroh"></div>' +
        '<div data-notice></div>' +
        '<div class="gdoc-shell">' +
        '<div class="gdoc-tb" role="toolbar" aria-label="Format teks">' +
        tb('undo', 'undo', 'Urungkan (Ctrl+Z)') + tb('redo', 'redo', 'Ulangi (Ctrl+Y)') + sep +
        '<select class="tb-sel gaya" data-gaya title="Gaya">' + GAYA.map(g => '<option value="' + g[0] + '">' + g[1] + '</option>').join('') + '</select>' + sep +
        '<select class="tb-sel font" data-font title="Font">' + FONT.map(f => '<option style="font-family:\'' + f + '\'">' + f + '</option>').join('') + '</select>' + sep +
        '<span class="tb-size"><button type="button" class="tb" data-cmd="kecil" title="Perkecil ukuran font" aria-label="Perkecil ukuran font">' + svg('minus') + '</button>' +
        '<input class="tb-num" data-size inputmode="numeric" value="11" aria-label="Ukuran font" title="Ukuran font">' +
        '<button type="button" class="tb" data-cmd="besar" title="Perbesar ukuran font" aria-label="Perbesar ukuran font">' + svg('plus') + '</button></span>' + sep +
        tb('bold', 'bold', 'Tebal (Ctrl+B)') + tb('italic', 'italic', 'Miring (Ctrl+I)') + tb('underline', 'underline', 'Garis bawah (Ctrl+U)') + tb('strikeThrough', 'strike', 'Coret') +
        '<button type="button" class="tb" data-menu="warna" title="Warna teks" aria-label="Warna teks">' + svg('color', '<rect x="3" y="19" width="18" height="4" rx="1" data-bar fill="#000000"/>') + '</button>' +
        '<button type="button" class="tb" data-menu="stabilo" title="Warna stabilo" aria-label="Warna stabilo">' + svg('hilite', '<rect x="3" y="19" width="18" height="4" rx="1" data-hbar fill="#FFFF00"/>') + '</button>' + sep +
        tb('link', 'link', 'Sisipkan tautan (Ctrl+K)') + '<button type="button" class="tb" disabled title="Komentar (tidak tersedia)" aria-label="Komentar">' + svg('comment') + '</button>' + tb('gambar', 'image', 'Sisipkan gambar') + sep +
        '<button type="button" class="tb wide" data-menu="rata" title="Rata & indentasi" aria-label="Perataan"><span data-rataico>' + svg('left') + '</span>' + svg('caret') + '</button>' +
        '<button type="button" class="tb" data-menu="spasi" title="Spasi baris & paragraf" aria-label="Spasi baris">' + svg('spacing') + '</button>' +
        tbDrop('checklist', 'check', 'Checklist') + tbDrop('bullet', 'bullet', 'Daftar berbutir') + tbDrop('nomor', 'number', 'Daftar bernomor') +
        '<button type="button" class="tb" data-menu="lain" title="Lainnya" aria-label="Lainnya">' + svg('more') + '</button>' +
        '</div>' +
        '<div class="gdoc-ruler" aria-hidden="true"><div class="rl"><span class="mg l"></span><span class="mg r"></span><i class="ind l"></i><i class="ind r"></i>' +
        Array.from({ length: 16 }, (_, i) => '<b style="left:calc(96px + ' + (i + 1) + 'cm)">' + (i + 1) + '</b>').join('') + '</div></div>' +
        '<div class="gdoc-canvas"><div class="gdoc-page doc-body" contenteditable="true" spellcheck="true" data-page data-ph="Ketik notulen musyawaroh di sini…"></div></div>' +
        '<div class="gdoc-pop hidden" data-pop></div>' +
        '<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-imgfile>' +
        '</div>' +
        '<div class="gdoc-foot"><span class="muted" data-wc></span><span class="sp"></span><button class="btn btn-soft" data-close2>' + icon('x') + ' Tutup</button><button class="btn btn-primary" data-save>' + icon('save') + ' Simpan Notulen</button></div>' +
        '</section>';

      const q = s => el.querySelector(s);
      const page = q('[data-page]');
      const pop = q('[data-pop]');
      const shell = q('.gdoc-shell');
      page.innerHTML = d.doc ? App.sanitize(d.doc) : '<p><br></p>';
      try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch (e) { /* abaikan */ }

      let saved = null;
      let lastPt = 11, warnaTeks = '#000000', warnaStabilo = '#FFFF00';

      const judul = () => {
        q('[data-judul]').textContent = d.mode === 'ubah' ? 'Ubah Notulen' : 'Catat Notulen';
        const lj = lanjutan();
        q('[data-notice]').innerHTML = lj
          ? '<div class="notice" style="margin-top:12px">' + icon('info') + '<div>Sudah ada notulen <b>' + esc(App.fmtTanggal(lj.tanggal)) + ' — ' + esc(lj.tempat) + '</b>. Saat disimpan, isi di bawah akan <b>ditambahkan di akhir</b> notulen tersebut. ' +
            '<button class="btn btn-outline btn-xs" data-lanjut style="margin-top:6px">' + icon('edit', 'sm') + ' Buka notulen itu</button></div></div>'
          : '';
        const b = q('[data-lanjut]');
        if (b) b.onclick = () => {
          const cur = Ed.hasContent(d) ? App.sanitize(page.innerHTML) : '';
          const nd = Ed.fromSesi(lj);
          nd.doc = nd.doc + cur;
          d = nd; Ed.save(d);
          page.innerHTML = d.doc || '<p><br></p>';
          judul(); hitung();
          page.focus();
        };
      };
      const hitung = () => { q('[data-wc]').textContent = jumlahKata(page.innerHTML) + ' kata · tersimpan otomatis di perangkat'; };

      // ── Seleksi ──
      const dalam = n => n && (n === page || page.contains(n));
      const simpanSel = () => { const s = getSelection(); if (s.rangeCount && dalam(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
      const pulihkan = () => {
        const s = getSelection();
        const hidup = s.rangeCount && dalam(s.anchorNode) ? s.getRangeAt(0).cloneRange() : null;   // seleksi terbaru lebih dipercaya
        page.focus({ preventScroll: true });
        const r = hidup || saved;
        if (r) { s.removeAllRanges(); s.addRange(r); saved = r.cloneRange(); }
      };
      const elSel = () => {
        const s = getSelection();
        let n = s.rangeCount ? s.anchorNode : null;
        if (!dalam(n)) n = saved ? saved.startContainer : null;
        if (n && n.nodeType === 3) n = n.parentElement;
        return dalam(n) ? n : null;
      };
      const daftar = () => { const n = elSel(); const l = n && n.closest('ol,ul'); return l && page.contains(l) ? l : null; };
      const blokTerpilih = () => {
        const r = saved || (getSelection().rangeCount ? getSelection().getRangeAt(0) : null);
        const all = Array.from(page.querySelectorAll('p,h1,h2,h3,h4,li,blockquote,div')).filter(b => !b.querySelector('p,h1,h2,h3,h4,li,blockquote,div'));
        const hit = r ? all.filter(b => r.intersectsNode(b)) : [];
        if (hit.length) return hit;
        const n = elSel();
        const b = n && n.closest('p,h1,h2,h3,h4,li,blockquote,div');
        return b && page.contains(b) ? [b] : [];
      };

      // ── Setelah setiap perubahan ──
      /** execCommand('fontSize', 7) memberi penanda size=7 / xxx-large → ganti ke ukuran pt sebenarnya */
      const ubahPenanda = () => {
        const out = [];
        page.querySelectorAll('font[size="7"], span[style*="xxx-large"]').forEach(f => {
          const sp = document.createElement('span');
          sp.style.fontSize = lastPt + 'pt';
          while (f.firstChild) sp.appendChild(f.firstChild);
          sp.querySelectorAll('[style]').forEach(x => { x.style.fontSize = ''; if (!x.getAttribute('style')) x.removeAttribute('style'); });
          f.replaceWith(sp);
          out.push(sp);
        });
        return out;
      };
      const rapikan = () => {
        if (!page.firstChild || (page.childNodes.length === 1 && page.firstChild.nodeName === 'BR')) page.innerHTML = '<p><br></p>';
      };
      const sinkron = () => { rapikan(); d.doc = page.innerHTML; persist(); hitung(); };
      const exec = (cmd, val) => {
        pulihkan();
        try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* abaikan */ }
        document.execCommand(cmd, false, val === undefined ? null : val);
        simpanSel(); sinkron(); status();
      };

      // ── Status tombol (aktif/tidak) mengikuti posisi kursor ──
      const status = () => {
        const n = elSel();
        if (!n) return;
        const st = c => { try { return document.queryCommandState(c); } catch (e) { return false; } };
        ['bold', 'italic', 'underline', 'strikeThrough'].forEach(c => { const b = q('[data-cmd="' + c + '"]'); if (b) b.classList.toggle('on', st(c)); });
        const l = daftar();
        q('[data-cmd="checklist"]').classList.toggle('on', !!(l && l.classList.contains('checklist')));
        q('[data-cmd="bullet"]').classList.toggle('on', !!(l && l.nodeName === 'UL' && !l.classList.contains('checklist')));
        q('[data-cmd="nomor"]').classList.toggle('on', !!(l && l.nodeName === 'OL'));
        const cs = getComputedStyle(n);
        const blok = n.closest('h1,h2,h3');
        q('[data-gaya]').value = blok ? blok.nodeName : 'P';
        const fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
        const fs = q('[data-font]');
        if (!Array.from(fs.options).some(o => o.value === fam)) { const o = document.createElement('option'); o.textContent = fam; fs.appendChild(o); }
        fs.value = fam;
        const pt = Math.round(parseFloat(cs.fontSize) * 0.75 * 2) / 2;
        q('[data-size]').value = pt; lastPt = pt;
        const al = (n.closest('p,h1,h2,h3,h4,li,div,blockquote') || n);
        const ta = getComputedStyle(al).textAlign;
        q('[data-rataico]').innerHTML = svg(ta === 'center' ? 'center' : ta === 'right' || ta === 'end' ? 'right' : ta === 'justify' ? 'justify' : 'left');
      };
      const onSelChange = () => { const s = getSelection(); if (s.rangeCount && dalam(s.anchorNode)) { simpanSel(); status(); } };
      document.addEventListener('selectionchange', onSelChange);
      bersih.push(() => document.removeEventListener('selectionchange', onSelChange));
      if (!opt.embedded) App.onLeave(() => document.removeEventListener('selectionchange', onSelChange));

      // ── Ukuran font ──
      const setUkuran = pt => {
        pt = Math.max(1, Math.min(400, Math.round(pt * 2) / 2));
        lastPt = pt;
        q('[data-size]').value = pt;
        pulihkan();
        const sel = getSelection();
        if (!sel.rangeCount) return;
        const r = sel.getRangeAt(0);
        if (r.collapsed) {
          // kursor saja: siapkan "wadah" ukuran baru tepat di kursor, ketikan berikutnya masuk ke sana
          const host = r.startContainer.nodeType === 3 ? r.startContainer.parentElement : r.startContainer;
          if (host && host.nodeName === 'SPAN' && host.getAttribute('data-sz') !== null && host.textContent.replace(/\u200b/g, '') === '') { host.style.fontSize = pt + 'pt'; return; }
          const sp = document.createElement('span');
          sp.style.fontSize = pt + 'pt';
          sp.setAttribute('data-sz', '');
          sp.appendChild(document.createTextNode('\u200b'));
          r.insertNode(sp);
          const nr = document.createRange(); nr.setStart(sp.firstChild, 1); nr.collapse(true);
          sel.removeAllRanges(); sel.addRange(nr);
          simpanSel();
          return;
        }
        try { document.execCommand('styleWithCSS', false, false); } catch (e) { /* abaikan */ }
        document.execCommand('fontSize', false, '7');
        try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* abaikan */ }
        const baru = ubahPenanda();
        if (baru.length) {
          const nr = document.createRange(); nr.setStartBefore(baru[0]); nr.setEndAfter(baru[baru.length - 1]);
          sel.removeAllRanges(); sel.addRange(nr);
        }
        simpanSel(); sinkron();
      };
      const langkah = arah => {
        const cur = +q('[data-size]').value || 11;
        const nx = arah > 0 ? (UKURAN.find(u => u > cur) || cur + 12) : (UKURAN.slice().reverse().find(u => u < cur) || Math.max(1, cur - 1));
        setUkuran(nx);
      };
      const sz = q('[data-size]');
      sz.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); setUkuran(+sz.value || 11); } });
      sz.addEventListener('change', () => setUkuran(+sz.value || 11));

      // ── Daftar (poin / nomor / checklist) ──
      const jadikanDaftar = (jenis, gaya) => {
        let l = daftar();
        if (jenis === 'OL') {
          if (!l || l.nodeName !== 'OL') exec('insertOrderedList');
          l = daftar();
          if (l && gaya) l.style.listStyleType = gaya;
        } else {
          if (!l || l.nodeName !== 'UL') exec('insertUnorderedList');
          l = daftar();
          if (!l) return;
          if (jenis === 'CEK') { l.classList.add('checklist'); l.style.listStyleType = ''; if (gaya === 'coret') l.classList.add('coret'); else if (gaya === 'biasa') l.classList.remove('coret'); }
          else { l.classList.remove('checklist', 'coret'); if (!l.className) l.removeAttribute('class'); if (gaya) l.style.listStyleType = gaya; }
        }
        sinkron(); status();
      };
      const toggleDaftar = jenis => {
        const l = daftar();
        const aktif = l && (jenis === 'OL' ? l.nodeName === 'OL' : jenis === 'CEK' ? l.classList.contains('checklist') : (l.nodeName === 'UL' && !l.classList.contains('checklist')));
        if (aktif) { exec(l.nodeName === 'OL' ? 'insertOrderedList' : 'insertUnorderedList'); return; }
        jadikanDaftar(jenis);
      };

      // ── Popover menu ──
      const tutupPop = () => { pop.classList.add('hidden'); pop.innerHTML = ''; pop._for = null; };
      const bukaPop = (btn, html, bind) => {
        if (pop._for === btn) { tutupPop(); return; }
        pop.innerHTML = html;
        pop.classList.remove('hidden');
        pop._for = btn;
        const sr = shell.getBoundingClientRect(), br = btn.getBoundingClientRect();
        const left = Math.max(4, Math.min(br.left - sr.left, sr.width - pop.offsetWidth - 4));
        pop.style.left = left + 'px';
        pop.style.top = (br.bottom - sr.top + 4) + 'px';
        pop.querySelectorAll('button').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
        bind(pop);
      };
      const palet = (warna, judulP, kosong) => '<div class="pop-title">' + judulP + '</div>' +
        '<button type="button" class="pop-item" data-c="' + kosong[0] + '">' + kosong[1] + '</button>' +
        '<div class="swatches">' + warna.map(c => '<button type="button" class="sw" data-c="' + c + '" title="' + c + '" style="background:' + c + '"></button>').join('') + '</div>';
      const MENU = {
        warna: btn => bukaPop(btn, palet(WARNA_TEKS, 'Warna teks', ['#000000', icon('palette', 'sm') + ' Otomatis (hitam)']), p => {
          p.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { warnaTeks = b.getAttribute('data-c'); q('[data-bar]').setAttribute('fill', warnaTeks); exec('foreColor', warnaTeks); tutupPop(); }; });
        }),
        stabilo: btn => bukaPop(btn, palet(WARNA_STABILO, 'Warna stabilo', ['transparent', icon('x', 'sm') + ' Tidak ada']), p => {
          p.querySelectorAll('[data-c]').forEach(b => { b.onclick = () => { const c = b.getAttribute('data-c'); if (c !== 'transparent') { warnaStabilo = c; q('[data-hbar]').setAttribute('fill', c); } exec('hiliteColor', c); tutupPop(); }; });
        }),
        rata: btn => bukaPop(btn, '<div class="pop-row">' + [['justifyLeft', 'left', 'Rata kiri'], ['justifyCenter', 'center', 'Rata tengah'], ['justifyRight', 'right', 'Rata kanan'], ['justifyFull', 'justify', 'Rata kiri-kanan']]
          .map(x => '<button type="button" class="tb" data-a="' + x[0] + '" title="' + x[2] + '" aria-label="' + x[2] + '">' + svg(x[1]) + '</button>').join('') + '</div>', p => {
          p.querySelectorAll('[data-a]').forEach(b => { b.onclick = () => { exec(b.getAttribute('data-a')); tutupPop(); }; });
        }),
        spasi: btn => bukaPop(btn, '<div class="pop-title">Spasi baris</div>' + [['1', 'Tunggal'], ['1.15', '1,15'], ['1.5', '1,5'], ['2', 'Ganda']]
          .map(x => '<button type="button" class="pop-item" data-lh="' + x[0] + '">' + x[1] + '</button>').join(''), p => {
          p.querySelectorAll('[data-lh]').forEach(b => {
            b.onclick = () => {
              pulihkan();
              let bl = blokTerpilih();
              if (!bl.length) { document.execCommand('formatBlock', false, 'P'); simpanSel(); bl = blokTerpilih(); }
              bl.forEach(x => { x.style.lineHeight = b.getAttribute('data-lh'); });
              sinkron(); tutupPop();
            };
          });
        }),
        checklist: btn => bukaPop(btn, '<div class="pop-title">Checklist</div><button type="button" class="pop-item" data-g="biasa">☐ Checklist biasa</button><button type="button" class="pop-item" data-g="coret">☑ <s>Coret item yang selesai</s></button>', p => {
          p.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { pulihkan(); jadikanDaftar('CEK', b.getAttribute('data-g')); tutupPop(); }; });
        }),
        bullet: btn => bukaPop(btn, '<div class="pop-title">Gaya butir</div>' + [['disc', '● Bulat'], ['circle', '○ Lingkaran'], ['square', '■ Kotak']]
          .map(x => '<button type="button" class="pop-item" data-g="' + x[0] + '">' + x[1] + '</button>').join(''), p => {
          p.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { pulihkan(); jadikanDaftar('UL', b.getAttribute('data-g')); tutupPop(); }; });
        }),
        nomor: btn => bukaPop(btn, '<div class="pop-title">Gaya nomor</div>' + [['decimal', '1. 2. 3.'], ['lower-alpha', 'a. b. c.'], ['upper-alpha', 'A. B. C.'], ['lower-roman', 'i. ii. iii.'], ['upper-roman', 'I. II. III.']]
          .map(x => '<button type="button" class="pop-item" data-g="' + x[0] + '">' + x[1] + '</button>').join(''), p => {
          p.querySelectorAll('[data-g]').forEach(b => { b.onclick = () => { pulihkan(); jadikanDaftar('OL', b.getAttribute('data-g')); tutupPop(); }; });
        }),
        lain: btn => bukaPop(btn, '<div class="pop-row">' + tb('outdent', 'outdent', 'Kurangi indentasi') + tb('indent', 'indent', 'Tambah indentasi') + tb('removeFormat', 'clear', 'Hapus format') + tb('insertHorizontalRule', 'hr', 'Garis horizontal') + '</div>', p => {
          p.querySelectorAll('[data-cmd]').forEach(b => { b.onclick = () => { perintah(b.getAttribute('data-cmd')); tutupPop(); }; });
        }),
      };

      // ── Tautan ──
      const tautan = () => {
        simpanSel();
        const r = saved;
        const teksSel = r ? r.toString() : '';
        const a = elSel() && elSel().closest('a');
        const m = App.modal({
          title: 'Sisipkan tautan',
          body: '<div class="field"><label>Teks</label><input class="input" data-lt value="' + esc(a ? a.textContent : teksSel) + '" placeholder="Teks yang ditampilkan"></div>' +
            '<div class="field" style="margin-top:12px"><label>Alamat (URL)</label><input class="input" data-lu value="' + esc(a ? a.getAttribute('href') : '') + '" placeholder="https://…" inputmode="url"></div>',
          foot: (a ? '<button class="btn btn-ghost" data-lx style="margin-right:auto">Hapus tautan</button>' : '') + '<button class="btn btn-soft" data-x>Batal</button><button class="btn btn-primary" data-lok>Terapkan</button>',
        });
        const u = m.el.querySelector('[data-lu]');
        setTimeout(() => u.focus(), 50);
        const ok = () => {
          let url = u.value.trim();
          const teks = m.el.querySelector('[data-lt]').value.trim();
          if (!url) { u.focus(); return; }
          if (!/^(https?:|mailto:)/i.test(url)) url = (/@/.test(url) && !/\//.test(url) ? 'mailto:' : 'https://') + url;
          m.close(true);
          if (a) { a.setAttribute('href', url); if (teks) a.textContent = teks; sinkron(); return; }
          if (!teksSel || (teks && teks !== teksSel)) exec('insertHTML', '<a href="' + esc(url) + '">' + esc(teks || url) + '</a>&nbsp;');
          else exec('createLink', url);
        };
        m.el.querySelector('[data-lok]').onclick = ok;
        u.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
        const lx = m.el.querySelector('[data-lx]');
        if (lx) lx.onclick = () => { m.close(true); const t = document.createTextNode(a.textContent); a.replaceWith(t); sinkron(); };
      };

      // ── Gambar (diperkecil otomatis agar ringan) ──
      const fileIn = q('[data-imgfile]');
      fileIn.onchange = async () => {
        const f = fileIn.files[0];
        fileIn.value = '';
        if (!f) return;
        if (!/^image\/(png|jpeg|webp)$/.test(f.type)) { App.toast('Gambar harus PNG, JPG, atau WEBP.', 'warn'); return; }
        try {
          const g = await kecilkan(f, 1000);
          if (g.url.length > 400000) { App.toast('Gambar terlalu besar walau sudah diperkecil. Coba gambar lain.', 'warn'); return; }
          exec('insertHTML', '<img src="' + g.url + '" style="width:' + g.w + '%" alt="">');
        } catch (e) { App.toast('Gambar tidak dapat dibaca.', 'err'); }
      };
      page.addEventListener('click', e => {
        const img = e.target.closest && e.target.closest('img');
        if (!img) return;
        const r = document.createRange(); r.selectNode(img); saved = r;
        bukaPop(img, '<div class="pop-title">Ukuran gambar</div><div class="pop-row">' + [['33', 'Kecil'], ['50', 'Sedang'], ['75', 'Besar'], ['100', 'Penuh']]
          .map(x => '<button type="button" class="pop-item" data-w="' + x[0] + '">' + x[1] + '</button>').join('') + '</div><button type="button" class="pop-item" data-del style="color:var(--err)">' + icon('trash', 'sm') + ' Hapus gambar</button>', p => {
          p.querySelectorAll('[data-w]').forEach(b => { b.onclick = () => { img.style.width = b.getAttribute('data-w') + '%'; sinkron(); tutupPop(); }; });
          p.querySelector('[data-del]').onclick = () => { img.remove(); sinkron(); tutupPop(); };
        });
      });

      // ── Perintah toolbar ──
      const perintah = cmd => {
        if (cmd === 'kecil') return langkah(-1);
        if (cmd === 'besar') return langkah(1);
        if (cmd === 'link') return tautan();
        if (cmd === 'gambar') { simpanSel(); fileIn.click(); return; }
        if (cmd === 'checklist') { pulihkan(); return toggleDaftar('CEK'); }
        if (cmd === 'bullet') { pulihkan(); return toggleDaftar('UL'); }
        if (cmd === 'nomor') { pulihkan(); return toggleDaftar('OL'); }
        if (cmd === 'removeFormat') {
          exec('removeFormat');
          blokTerpilih().forEach(b => { b.style.lineHeight = ''; b.style.textAlign = ''; if (!b.getAttribute('style')) b.removeAttribute('style'); });
          sinkron();
          return;
        }
        exec(cmd);
      };
      el.querySelectorAll('.gdoc-tb .tb, .gdoc-tb .tb-num').forEach(b => { if (b.classList.contains('tb')) b.addEventListener('mousedown', e => e.preventDefault()); });
      el.querySelectorAll('.gdoc-tb [data-cmd]').forEach(b => { b.onclick = () => perintah(b.getAttribute('data-cmd')); });
      el.querySelectorAll('.gdoc-tb [data-menu]').forEach(b => { b.onclick = () => { simpanSel(); MENU[b.getAttribute('data-menu')](b); }; });
      q('[data-gaya]').onchange = e => exec('formatBlock', e.target.value);
      q('[data-font]').onchange = e => exec('fontName', e.target.value);
      const luarPop = e => { if (!pop.classList.contains('hidden') && !pop.contains(e.target) && !(pop._for && pop._for.contains && pop._for.contains(e.target))) tutupPop(); };
      document.addEventListener('mousedown', luarPop);
      bersih.push(() => document.removeEventListener('mousedown', luarPop));
      if (!opt.embedded) App.onLeave(() => document.removeEventListener('mousedown', luarPop));

      // ── Ketik, tempel, pintasan ──
      page.addEventListener('input', () => { simpanSel(); sinkron(); });
      page.addEventListener('keyup', simpanSel);
      page.addEventListener('mouseup', simpanSel);
      page.addEventListener('mousedown', e => {
        const li = e.target.closest && e.target.closest('ul.checklist > li');
        if (!li) return;
        const r = li.getBoundingClientRect();
        if (e.clientX < r.left + 2 && e.clientX > r.left - 30) {
          e.preventDefault();
          if (li.getAttribute('data-checked') === '1') li.removeAttribute('data-checked'); else li.setAttribute('data-checked', '1');
          sinkron();
        }
      });
      page.addEventListener('paste', e => {
        const cd = e.clipboardData || window.clipboardData;
        const html = cd.getData('text/html');
        e.preventDefault();
        if (html) exec('insertHTML', App.sanitize(html.replace(/<!--[\s\S]*?-->/g, '')));
        else exec('insertText', cd.getData('text/plain'));
      });
      page.addEventListener('keydown', e => {
        const mod = e.ctrlKey || e.metaKey;
        if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); simpan(); return; }
        if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); tautan(); return; }
        if (e.key === 'Tab') {
          e.preventDefault();
          if (daftar()) exec(e.shiftKey ? 'outdent' : 'indent');
          else if (!e.shiftKey) exec('insertText', '    ');
        }
      });

      // ── Tempat & tanggal ──
      q('[data-tempat]').onchange = e => {
        d.tempat = e.target.value;
        q('[data-lain-wrap]').classList.toggle('hidden', d.tempat !== '__lain');
        persist(); judul();
      };
      q('[data-tgl]').onchange = e => { d.tanggal = e.target.value; persist(); judul(); };
      const lain = q('[data-lain]');
      if (lain) lain.oninput = App.debounce(() => { d.tempatLain = lain.value; persist(); judul(); }, 350);

      const perkecil = diam => {
        d.doc = page.innerHTML; d.minimized = true; Ed.save(d);
        if (!diam) App.toast(opt.embedded ? 'Notulen disimpan sebagai draf. Buka lagi kapan saja.' : 'Notulen diperkecil. Ketuk pil di pojok untuk melanjutkan.', 'info');
        onDone && onDone('min');
      };
      q('[data-min]').onclick = () => perkecil(false);
      const tutup = async () => {
        d.doc = page.innerHTML;
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

      const simpan = () => {
        ubahPenanda(); rapikan();
        const tempat = tempatVal();
        if (!d.tanggal) { App.toast('Tanggal musyawaroh wajib diisi.', 'warn'); return; }
        if (!tempat) { App.toast('Tempat musyawaroh wajib diisi.', 'warn'); return; }
        let doc = App.sanitize(page.innerHTML);
        const kosong = !textOf(doc) && !/<img/i.test(doc);
        if (kosong && d.mode === 'baru') { App.toast('Notulen masih kosong.', 'warn'); page.focus(); return; }
        const lj = lanjutan();
        let mode = d.mode, sesiId = d.sesiId;
        if (mode === 'baru' && lj) { mode = 'ubah'; sesiId = lj.sesiId; doc = App.sanitize(App.notulenDoc(lj)) + doc; }   // tambahkan di akhir sesi yang sama
        const isi = kosong && mode === 'ubah' && !lj ? '' : doc;
        if (mode === 'ubah') {
          App.store.mutate('ubahNotulen', { sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, doc: isi }, data => {
            const s = data.notulen.find(x => x.sesiId === sesiId);
            if (!s) return;
            if (!isi) { data.notulen = data.notulen.filter(x => x.sesiId !== sesiId); return; }
            s.tanggal = d.tanggal; s.tempat = tempat; s.waktu = new Date().toISOString();
            s.poin = [{ id: (s.poin[0] && s.poin[0].id) || App.uuid(), no: 1, isi: MARK + isi }];
            sortSesi(data);
          }, { label: 'Ubah notulen' });
        } else {
          sesiId = App.uuid();
          App.store.mutate('simpanNotulen', { sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, doc: doc }, data => {
            data.notulen.unshift({ sesiId: sesiId, tanggal: d.tanggal, tempat: tempat, waktu: new Date().toISOString(), poin: [{ id: App.uuid(), no: 1, isi: MARK + doc }] });
            sortSesi(data);
          }, { label: 'Simpan notulen' });
        }
        App.swrBust('notulen');
        Ed.clear();
        App.toast(mode === 'ubah' ? 'Perubahan notulen disimpan.' : 'Notulen tersimpan.');
        onDone && onDone('saved');
      };

      judul(); hitung();
      setTimeout(() => {
        if (!page.isConnected) return;
        const s0 = getSelection();
        if (s0.rangeCount && dalam(s0.anchorNode)) return;   // pengguna sudah mulai mengetik → jangan pindahkan kursor
        page.focus({ preventScroll: true });
        const r = document.createRange(); r.selectNodeContents(page); r.collapse(false);
        const s = getSelection(); s.removeAllRanges(); s.addRange(r);
        simpanSel(); status();
      }, 60);

      return {
        /** lepas semua pendengar global (dipakai panel Mode Musyawaroh) */
        destroy() { bersih.forEach(f => { try { f(); } catch (e) { /* abaikan */ } }); },
        /** simpan draf tanpa menutup (mis. saat panel disembunyikan) */
        simpanDraf() { if (page.isConnected) perkecil(true); },
        /** sisipkan judul (mis. nama kelompok yang sedang dibahas) di akhir dokumen, kursor siap mengetik di bawahnya */
        judul(teks) {
          const last = page.lastElementChild;
          const kosong = last && last.nodeName === 'P' && !textOf(last.innerHTML) && !last.querySelector('img');
          const h = document.createElement('h2'); h.textContent = teks;
          const p0 = document.createElement('p'); p0.appendChild(document.createElement('br'));
          if (kosong) { page.insertBefore(h, last); } else { page.appendChild(h); page.appendChild(p0); }
          const target = kosong ? last : p0;
          page.focus({ preventScroll: true });
          const r = document.createRange(); r.setStart(target, 0); r.collapse(true);
          const sl = getSelection(); sl.removeAllRanges(); sl.addRange(r);
          simpanSel(); sinkron(); status();
          target.scrollIntoView({ block: 'center', behavior: 'smooth' });
        },
      };
    },
  });

  /** Perkecil gambar ke lebar maks., simpan sebagai JPEG */
  function kecilkan(file, maks) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onerror = rej;
      fr.onload = () => {
        const img = new Image();
        img.onerror = rej;
        img.onload = () => {
          const k = Math.min(1, maks / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          const g = c.getContext('2d');
          g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
          g.drawImage(img, 0, 0, c.width, c.height);
          // ±620 px = lebar isi halaman → persen lebar awal
          res({ url: c.toDataURL('image/jpeg', 0.78), w: Math.min(100, Math.max(20, Math.round(c.width / 6.2))) });
        };
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

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
