/* ==========================================================================
   pdf.js — PDF berbasis teks (jsPDF, dimuat saat dibutuhkan)
   - Laporan per kelompok, bukti kirim (dengan kode koreksi)
   - Gabungan satu bulan, gabungan + notulen (notulen di halaman awal)
   - Notulen per sesi dengan warna teks sesuai layar (getComputedStyle)
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;

  const C = {
    deep: [6, 78, 59], primary: [4, 120, 87], text: [15, 31, 26], muted: [91, 107, 101],
    line: [226, 232, 229], tint: [236, 253, 245], gold: [201, 162, 39], warn: [146, 64, 14], warnBg: [254, 243, 199], okBg: [209, 250, 229], ok: [6, 95, 70],
  };

  /** warna kop & judul PDF mengikuti warna utama aplikasi (v1.4) */
  function warnaPdf() {
    const r = App.brand ? App.brand.rgb() : null;
    if (!r) return;
    C.deep = r.deep; C.primary = r.mid; C.tint = r.tint;
  }

  App.meta = function () {
    const s = (App.store && App.store.data && App.store.data.pengaturan) || App.swrPeek('cfg') || {};
    return { nama: s.namaAplikasi || 'Musyawaroh & Pelaporan Bagian Pendidikan', sub: s.subjudul || 'PPG Kutai Timur · Desa Sangatta Selatan' };
  };

  /** Bersihkan HTML notulen (v1.3: dokumen gaya Google Docs).
   *  Hanya tag & properti gaya yang dikenal; tautan http/https/mailto; gambar data:image saja. */
  const TAG_OK = {
    B: 1, STRONG: 1, I: 1, EM: 1, U: 1, S: 1, STRIKE: 1, DEL: 1, BR: 1, DIV: 1, P: 1, SPAN: 1, FONT: 1, SUB: 1, SUP: 1,
    H1: 1, H2: 1, H3: 1, H4: 1, OL: 1, UL: 1, LI: 1, BLOCKQUOTE: 1, HR: 1, A: 1, IMG: 1,
    TABLE: 1, THEAD: 1, TBODY: 1, TFOOT: 1, TR: 1, TD: 1, TH: 1, COLGROUP: 1, COL: 1,   // v1.7.2: tabel di notulen (v1.7.3: lebar kolom)
  };
  const CSS_OK = ['color', 'background-color', 'font-weight', 'font-style', 'text-decoration-line', 'font-size', 'font-family', 'text-align', 'line-height', 'margin-left', 'padding-left', 'width', 'list-style-type', 'height'];
  const nilaiAman = v => v && !/url\s*\(|expression|javascript|[<>{};]/i.test(v);
  App.sanitize = function (html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const clean = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) { if (ch.data.indexOf('\u200b') >= 0) ch.data = ch.data.replace(/\u200b/g, ''); return; }
        if (ch.nodeType !== 1 || !TAG_OK[ch.nodeName]) {
          if (ch.nodeType === 1 && !/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|META|LINK)$/.test(ch.nodeName)) { clean(ch); while (ch.firstChild) node.insertBefore(ch.firstChild, ch); }
          ch.remove();
          return;
        }
        const st = [];
        CSS_OK.forEach(p => { const v = ch.style ? ch.style.getPropertyValue(p) : ''; if (nilaiAman(v)) st.push(p + ':' + v); });
        if (ch.nodeName === 'FONT') {
          const c = ch.getAttribute('color'), f = ch.getAttribute('face');
          if (c && /^(#[0-9a-f]{3,8}|[a-z]+)$/i.test(c)) st.push('color:' + c);
          if (f && nilaiAman(f)) st.push('font-family:' + f);
        }
        const keep = {};
        if (ch.nodeName === 'OL' && /^\d{1,4}$/.test(ch.getAttribute('start') || '')) keep.start = ch.getAttribute('start');
        if (ch.nodeName === 'UL' && ch.className) { const k = String(ch.className).split(/\s+/).filter(x => x === 'checklist' || x === 'coret').join(' '); if (k) keep['class'] = k; }
        if (ch.nodeName === 'LI' && ch.getAttribute('data-checked') === '1') keep['data-checked'] = '1';
        if (ch.nodeName === 'TD' || ch.nodeName === 'TH') ['colspan', 'rowspan'].forEach(a => { const v = ch.getAttribute(a); if (/^([2-9]|1\d|20)$/.test(v || '')) keep[a] = v; });
        if (ch.nodeName === 'A') {
          const h = (ch.getAttribute('href') || '').trim();
          if (/^(https?:|mailto:)/i.test(h)) { keep.href = h; keep.target = '_blank'; keep.rel = 'noopener noreferrer'; }
        }
        if (ch.nodeName === 'IMG') {
          const src = ch.getAttribute('src') || '';
          if (!/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+\/=\s]+$/i.test(src)) { ch.remove(); return; }
          keep.src = src; keep.alt = '';
        }
        Array.from(ch.attributes).forEach(a => ch.removeAttribute(a.name));
        Object.keys(keep).forEach(k => ch.setAttribute(k, keep[k]));
        if (st.length) ch.setAttribute('style', st.join(';'));
        clean(ch);
      });
    };
    const root = doc.body.firstChild;
    clean(root);
    return root.innerHTML;
  };

  /** Info kop dari sesi notulen → {tanggal, tempat} (v1.3) */
  App.kopInfo = function (sesi) {
    const list = (Array.isArray(sesi) ? sesi : [sesi]).filter(Boolean);
    if (!list.length) return null;
    const uniq = a => a.filter((x, i) => x && a.indexOf(x) === i);
    return {
      tanggal: uniq(list.map(s => App.fmtTanggal(s.tanggal))).join('; '),
      tempat: uniq(list.map(s => String(s.tempat || '').trim())).join('; '),
    };
  };
  /** Sesi musyawaroh yang membahas laporan periode b/t: bulan berikutnya (terakhir), lalu bulan yang sama */
  App.sesiUntukPeriode = function (b, t) {
    const all = (App.B && App.B.notulen()) || [];
    const nb = +b === 12 ? 1 : +b + 1, nt = +b === 12 ? +t + 1 : +t;
    const ym = (y, m) => y + '-' + String(m).padStart(2, '0');
    const pick = k => all.filter(s => String(s.tanggal).slice(0, 7) === k).sort((x, y) => String(y.tanggal).localeCompare(String(x.tanggal)))[0];
    return pick(ym(nt, nb)) || pick(ym(t, b)) || null;
  };

  App.pdf = {};

  async function jsPDFCtor() {
    await App.lib('jspdf');
    return window.jspdf.jsPDF;
  }

  // ───────────────────────── Penulis halaman ─────────────────────────
  class Writer {
    constructor(Ctor, info) {
      warnaPdf();
      this.info = info || null;      // {tanggal, tempat} dari notulen → tampil di kop
      this.doc = new Ctor({ unit: 'mm', format: 'a4', compress: true });
      this.W = 210; this.H = 297; this.M = 16;
      this.y = this.M;
      this.doc.setFont('helvetica', 'normal');
    }
    color(c) { this.doc.setTextColor(c[0], c[1], c[2]); }
    fill(c) { this.doc.setFillColor(c[0], c[1], c[2]); }
    draw(c) { this.doc.setDrawColor(c[0], c[1], c[2]); }
    font(style, size) { this.doc.setFont('helvetica', style || 'normal'); if (size) this.doc.setFontSize(size); }
    ensure(h) { if (this.y + h > this.H - 18) this.newPage(); }
    newPage() { this.doc.addPage(); this.y = this.M; }

    kop() {
      const d = this.doc, M = this.M, meta = App.meta();
      const L = App.logo.get('kiri');
      const sz = 18;
      const y0 = this.y;
      if (L) {
        try { d.addImage(L.dataUrl, /jpe?g/i.test(L.dataUrl.slice(5, 20)) ? 'JPEG' : 'PNG', M, y0, sz, sz, undefined, 'FAST'); } catch (e) { /* abaikan logo */ }
      }
      // teks kop di tengah area kanan logo (satu logo saja sejak v1.3)
      const cx = L ? (M + sz + 4 + this.W - M) / 2 : this.W / 2;
      const lebar = this.W - 2 * M - (L ? 2 * (sz + 4) : 0);
      this.color(C.muted); this.font('bold', 9);
      d.text(meta.sub.toUpperCase(), cx, y0 + 5.5, { align: 'center' });
      this.color(C.deep); this.font('bold', 14);
      const nama = d.splitTextToSize(meta.nama, lebar);
      d.text(nama, cx, y0 + 11.5, { align: 'center', lineHeightFactor: 1.15 });
      let yy = y0 + 11.5 + (nama.length - 1) * 5.6;
      if (this.info && (this.info.tanggal || this.info.tempat)) {
        yy += 6;
        this.font('normal', 9.5); this.color(C.text);
        const parts = [];
        if (this.info.tanggal) parts.push(['Tanggal', this.info.tanggal]);
        if (this.info.tempat) parts.push(['Tempat', this.info.tempat]);
        const teks = parts.map(p => p[0] + ' : ' + p[1]).join('     ');
        const baris = d.splitTextToSize(teks, lebar);
        if (baris.length === 1) {
          // label tebal, nilai biasa, rata tengah
          const segs = []; parts.forEach((p, i) => { if (i) segs.push(['normal', '     ']); segs.push(['bold', p[0] + ' : ']); segs.push(['normal', p[1]]); });
          const wTot = segs.reduce((a, g) => { this.font(g[0], 9.5); return a + d.getTextWidth(g[1]); }, 0);
          let x = cx - wTot / 2;
          segs.forEach(g => { this.font(g[0], 9.5); d.text(g[1], x, yy); x += d.getTextWidth(g[1]); });
        } else {
          parts.forEach((p, i) => { this.font('normal', 9.5); d.text(d.splitTextToSize(p[0] + ' : ' + p[1], lebar)[0], cx, yy + i * 4.6, { align: 'center' }); });
          yy += (parts.length - 1) * 4.6;
        }
      }
      this.y = Math.max(y0 + sz, yy + 2) + 3;
      this.draw(C.deep); d.setLineWidth(0.8); d.line(M, this.y, this.W - M, this.y);
      d.setLineWidth(0.25); d.line(M, this.y + 1.2, this.W - M, this.y + 1.2);
      this.y += 8;
    }

    title(t, sub) {
      this.ensure(16);
      this.color(C.text); this.font('bold', 13);
      this.doc.text(t, this.W / 2, this.y, { align: 'center' });
      this.y += 6;
      if (sub) { this.color(C.muted); this.font('normal', 10); this.doc.text(sub, this.W / 2, this.y, { align: 'center' }); this.y += 6; }
      this.y += 2;
    }

    infoGrid(rows) {
      const d = this.doc, M = this.M;
      this.font('normal', 10);
      rows.forEach(r => {
        this.ensure(6);
        this.color(C.muted); d.text(r[0], M, this.y);
        this.color(C.text); this.font('bold', 10);
        d.text(': ' + r[1], M + 30, this.y);
        this.font('normal', 10);
        this.y += 5.5;
      });
      this.y += 2;
    }

    section(letter, judul) {
      this.ensure(14);
      const d = this.doc, M = this.M;
      this.fill(C.tint); d.roundedRect(M, this.y, this.W - 2 * M, 8, 1.5, 1.5, 'F');
      this.fill(C.deep); d.roundedRect(M + 2, this.y + 1.5, 5, 5, 1, 1, 'F');
      d.setTextColor(255, 255, 255); this.font('bold', 8.5); d.text(letter, M + 4.5, this.y + 5, { align: 'center' });
      this.color(C.deep); this.font('bold', 10.5); d.text(judul.toUpperCase(), M + 10, this.y + 5.4);
      this.y += 11;
    }

    kv(rows) {
      const d = this.doc, M = this.M;
      const lw = 62, vw = this.W - 2 * M - lw - 2, lh = 4.6;
      rows.forEach(r => {
        this.font('normal', 9.5);
        const la = d.splitTextToSize(r[0], lw - 3);
        this.font('bold', 9.5);
        const va = d.splitTextToSize(r[1] === '' || r[1] === null || r[1] === undefined ? '—' : String(r[1]), vw);
        const n = Math.max(la.length, va.length);
        // pecah baris panjang lintas halaman
        let start = 0;
        while (start < n) {
          const room = Math.max(1, Math.floor((this.H - 18 - this.y - 2) / lh));
          if (room < 1 || this.y + lh + 2 > this.H - 18) { this.newPage(); continue; }
          const take = Math.min(room, n - start);
          this.font('normal', 9.5); this.color(C.muted);
          d.text(la.slice(start, start + take), M, this.y + 3.4, { lineHeightFactor: 1.35 });
          this.font('bold', 9.5); this.color(C.text);
          d.text(va.slice(start, start + take), M + lw, this.y + 3.4, { lineHeightFactor: 1.35 });
          this.y += take * lh + 1.6;
          start += take;
          if (start < n) this.newPage();
        }
        this.draw(C.line); d.setLineWidth(0.2); d.line(M, this.y, this.W - M, this.y);
        this.y += 1.6;
      });
      this.y += 3;
    }

    statBoxes(items) {
      const d = this.doc, M = this.M;
      const n = items.length, gap = 3, w = (this.W - 2 * M - gap * (n - 1)) / n, h = 16;
      this.ensure(h + 4);
      items.forEach((it, i) => {
        const x = M + i * (w + gap);
        if (it.hero) { this.fill(C.deep); d.roundedRect(x, this.y, w, h, 2, 2, 'F'); d.setTextColor(255, 255, 255); }
        else { this.fill([246, 250, 248]); this.draw(C.line); d.roundedRect(x, this.y, w, h, 2, 2, 'FD'); this.color(C.muted); }
        this.font('bold', 7); d.text(it.l.toUpperCase(), x + w / 2, this.y + 5, { align: 'center' });
        if (!it.hero) this.color(C.text);
        this.font('bold', 13); d.text(String(it.v), x + w / 2, this.y + 12.2, { align: 'center' });
      });
      this.y += h + 5;
    }

    para(t, size, color) {
      const d = this.doc, M = this.M;
      this.font('normal', size || 10); this.color(color || C.text);
      const lines = d.splitTextToSize(t, this.W - 2 * M);
      lines.forEach(l => { this.ensure(5); d.text(l, M, this.y + 3.5); this.y += 4.8; });
      this.y += 1;
    }

    /** Dokumen notulen (HTML) → PDF, mengikuti tata letak browser (lihat renderDoc) */
    docHtml(html) { renderDoc(this, html); }

    footer() {
      const d = this.doc, n = d.getNumberOfPages(), meta = App.meta();
      const now = App.fmtWaktu(new Date().toISOString(), { wita: true });
      for (let i = 1; i <= n; i++) {
        d.setPage(i);
        this.draw(C.line); d.setLineWidth(0.2); d.line(this.M, this.H - 12, this.W - this.M, this.H - 12);
        this.font('normal', 7.5); this.color(C.muted);
        d.text(meta.nama + ' · dicetak ' + now, this.M, this.H - 8);
        d.text('Halaman ' + i + ' dari ' + n, this.W - this.M, this.H - 8, { align: 'right' });
      }
    }

    save(name) {
      this.footer();
      this.doc.save(name.replace(/[^\w\-. ]+/g, '').replace(/\s+/g, '_') + '.pdf');
    }
  }

  function parseRgb(s) {
    const m = String(s).match(/(\d+)\D+(\d+)\D+(\d+)/);
    return m ? [+m[1], +m[2], +m[3]] : [31, 41, 55];
  }

  // ───────────────────────── Dokumen notulen → PDF ─────────────────────────
  // Dokumen ditata dulu oleh browser (lebar = lebar isi A4), lalu setiap kata
  // digambar di posisi yang sama. Hasilnya: perataan, indentasi, daftar,
  // ukuran huruf, warna, stabilo, garis bawah/coret, & gambar sama seperti layar.
  const PX = 0.264583;   // 1 px CSS dalam mm (96 dpi)
  const ROMAWI = n => { let r = ''; [[1000, 'm'], [900, 'cm'], [500, 'd'], [400, 'cd'], [100, 'c'], [90, 'xc'], [50, 'l'], [40, 'xl'], [10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']].forEach(p => { while (n >= p[0]) { r += p[1]; n -= p[0]; } }); return r; };
  const HURUF = n => { let r = ''; while (n > 0) { n--; r = String.fromCharCode(97 + (n % 26)) + r; n = Math.floor(n / 26); } return r; };
  function nomorDaftar(type, n) {
    if (/lower-alpha|lower-latin/.test(type)) return HURUF(n);
    if (/upper-alpha|upper-latin/.test(type)) return HURUF(n).toUpperCase();
    if (/lower-roman/.test(type)) return ROMAWI(n);
    if (/upper-roman/.test(type)) return ROMAWI(n).toUpperCase();
    return String(n);
  }
  function rgbOf(s) {
    const m = String(s || '').match(/rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+))?/);
    if (!m) return null;
    if (m[4] !== undefined && +m[4] === 0) return null;
    return [+m[1], +m[2], +m[3]];
  }
  function fontPdf(cs) {
    const f = String(cs.fontFamily).toLowerCase();
    const fam = /courier|mono/.test(f) ? 'courier' : (/times|georgia|garamond|serif/.test(f) && !/sans/.test(f) ? 'times' : 'helvetica');
    const b = parseInt(cs.fontWeight, 10) >= 600, i = cs.fontStyle === 'italic' || cs.fontStyle === 'oblique';
    return { fam: fam, st: b && i ? 'bolditalic' : b ? 'bold' : i ? 'italic' : 'normal' };
  }
  function dekorasi(el, host) {
    const o = { u: false, s: false, bg: null };
    for (let e = el; e && e !== host; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const t = cs.textDecorationLine || cs.textDecoration || '';
      if (t.indexOf('underline') >= 0) o.u = true;
      if (t.indexOf('line-through') >= 0) o.s = true;
      if (!o.bg && cs.display.indexOf('inline') === 0) o.bg = rgbOf(cs.backgroundColor);
    }
    return o;
  }

  function renderDoc(w, html) {
    const d = w.doc, M = w.M, lebarMm = w.W - 2 * M;
    const host = document.createElement('div');
    host.className = 'doc-body doc-render';
    host.style.cssText = 'position:absolute;left:-10000px;top:0;width:' + Math.round(lebarMm / PX) + 'px;visibility:hidden';
    host.innerHTML = App.sanitize(html);
    document.body.appendChild(host);
    const H = host.getBoundingClientRect();
    const items = [];
    const rel = r => ({ top: r.top - H.top, bottom: r.bottom - H.top, left: r.left - H.left, right: r.right - H.left, w: r.width, h: r.height });
    try {
      // 1) kata-kata
      const tw = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      let node;
      const rg = document.createRange();
      while ((node = tw.nextNode())) {
        const txt = node.data;
        if (!/\S/.test(txt)) continue;
        const el = node.parentElement;
        const cs = getComputedStyle(el);
        const fpx = parseFloat(cs.fontSize) || 14.67;
        const f = fontPdf(cs);
        const col = rgbOf(cs.color) || [0, 0, 0];
        const dk = dekorasi(el, host);
        if (dk.bg || dk.u || dk.s) {
          rg.selectNodeContents(node);
          Array.from(rg.getClientRects()).forEach(r0 => {
            const r = rel(r0);
            if (r.w < 0.5) return;
            items.push({ k: 'deco', top: r.top, bottom: r.bottom, r: r, fpx: fpx, bg: dk.bg, u: dk.u, s: dk.s, col: col });
          });
        }
        const re = /\S+/g;
        let m;
        while ((m = re.exec(txt))) {
          rg.setStart(node, m.index); rg.setEnd(node, m.index + m[0].length);
          const rs = rg.getClientRects();
          if (!rs.length) continue;
          const r = rel(rs[0]);
          items.push({ k: 'txt', top: r.top, bottom: r.bottom, r: r, t: m[0], f: f, pt: fpx * 0.75, fpx: fpx, col: col });
        }
      }
      // 2) penanda daftar (nomor / bulatan / kotak centang)
      host.querySelectorAll('li').forEach(li => {
        const list = li.parentElement;
        if (!list || !/^(OL|UL)$/.test(list.nodeName)) return;
        rg.selectNodeContents(li);
        const first = Array.from(rg.getClientRects()).find(r => r.width > 0 || r.height > 0);
        const lr = li.getBoundingClientRect();
        const r = rel(first || lr);
        const cs = getComputedStyle(li);
        const fpx = parseFloat(cs.fontSize) || 14.67;
        const base = { k: 'mark', top: r.top, bottom: r.bottom, x: lr.left - H.left, base: r.bottom - r.h * 0.2, fpx: fpx, col: rgbOf(cs.color) || [0, 0, 0] };
        if (list.classList.contains('checklist')) { items.push(Object.assign(base, { m: 'cek', on: li.getAttribute('data-checked') === '1' })); return; }
        const type = getComputedStyle(list).listStyleType;
        if (list.nodeName === 'OL') {
          const idx = Array.from(list.children).filter(x => x.nodeName === 'LI').indexOf(li);
          const start = parseInt(list.getAttribute('start') || '1', 10) || 1;
          items.push(Object.assign(base, { m: 'teks', t: nomorDaftar(type, start + idx) + '.', f: fontPdf(cs), pt: fpx * 0.75 }));
        } else {
          items.push(Object.assign(base, { m: /square/.test(type) ? 'kotak' : /circle/.test(type) ? 'bulat0' : 'bulat' }));
        }
      });
      // 3) sel tabel (garis & latar) — v1.7.2
      host.querySelectorAll('td, th').forEach(c => {
        const r = rel(c.getBoundingClientRect());
        if (r.w < 1 || r.h < 1) return;
        const cs = getComputedStyle(c);
        const bg = rgbOf(cs.backgroundColor);
        items.push({ k: 'cell', top: r.top, bottom: r.bottom, r: r, bg: bg });
      });
      // 4) garis & gambar
      host.querySelectorAll('hr').forEach(hr => { const r = rel(hr.getBoundingClientRect()); items.push({ k: 'hr', top: r.top, bottom: r.bottom + 1, r: r }); });
      host.querySelectorAll('img').forEach(im => { const r = rel(im.getBoundingClientRect()); if (r.w > 1 && r.h > 1) items.push({ k: 'img', top: r.top, bottom: r.bottom, r: r, src: im.getAttribute('src') }); });
    } finally { host.remove(); }

    // Kelompokkan per baris visual, lalu pecah ke halaman per baris (tidak memotong teks)
    const urutK = { cell: 0, deco: 1 };
    items.sort((a, b) => a.top - b.top || ((urutK[a.k] !== undefined ? urutK[a.k] : 2) - (urutK[b.k] !== undefined ? urutK[b.k] : 2)));
    const baris = [];
    items.forEach(it => {
      const b = baris[baris.length - 1];
      if (b && it.k !== 'img' && b.img !== true && it.top < b.bottom - 2) { b.items.push(it); b.bottom = Math.max(b.bottom, it.bottom); }
      else baris.push({ top: it.top, bottom: it.bottom, items: [it], img: it.k === 'img' });
    });
    const batas = w.H - 18;
    let y0 = w.y, p0 = baris.length ? baris[0].top : 0, akhir = w.y;
    baris.forEach(b => {
      if (y0 + (b.bottom - p0) * PX > batas && (b.top - p0) * PX > 0.5) { w.newPage(); y0 = w.y; p0 = b.top; }
      b.items.forEach(it => gambar(d, it, M, y0, p0, batas));
      akhir = Math.max(akhir, y0 + (b.bottom - p0) * PX);
    });
    w.y = akhir + 3;
  }

  function gambar(d, it, M, y0, p0, batas) {
    const X = px => M + px * PX, Y = px => y0 + (px - p0) * PX;
    if (it.k === 'deco') {
      const r = it.r, base = r.bottom - r.h * 0.2;
      if (it.bg) { d.setFillColor(it.bg[0], it.bg[1], it.bg[2]); d.rect(X(r.left), Y(r.top), r.w * PX, r.h * PX, 'F'); }
      d.setDrawColor(it.col[0], it.col[1], it.col[2]); d.setLineWidth(Math.max(0.15, it.fpx * 0.06 * PX));
      if (it.u) d.line(X(r.left), Y(base + it.fpx * 0.1), X(r.right), Y(base + it.fpx * 0.1));
      if (it.s) d.line(X(r.left), Y(base - it.fpx * 0.3), X(r.right), Y(base - it.fpx * 0.3));
    } else if (it.k === 'txt') {
      d.setFont(it.f.fam, it.f.st);
      let pt = it.pt;
      d.setFontSize(pt);
      const wPdf = d.getTextWidth(it.t), wBrowser = it.r.w * PX;
      if (wBrowser > 0 && wPdf > wBrowser * 1.03) { pt = pt * wBrowser / wPdf; d.setFontSize(pt); }   // cegah kata bertumpuk
      d.setTextColor(it.col[0], it.col[1], it.col[2]);
      d.text(it.t, X(it.r.left), Y(it.r.bottom - it.r.h * 0.2));
    } else if (it.k === 'mark') {
      const yb = Y(it.base), s = it.fpx * PX;
      d.setTextColor(it.col[0], it.col[1], it.col[2]); d.setDrawColor(it.col[0], it.col[1], it.col[2]); d.setFillColor(it.col[0], it.col[1], it.col[2]);
      if (it.m === 'teks') { d.setFont(it.f.fam, it.f.st); d.setFontSize(it.pt); d.text(it.t, X(it.x) - s * 0.35, yb, { align: 'right' }); }
      else if (it.m === 'bulat') d.circle(X(it.x) - s * 0.75, yb - s * 0.3, s * 0.13, 'F');
      else if (it.m === 'bulat0') { d.setLineWidth(0.2); d.circle(X(it.x) - s * 0.75, yb - s * 0.3, s * 0.13, 'S'); }
      else if (it.m === 'kotak') d.rect(X(it.x) - s * 0.88, yb - s * 0.43, s * 0.26, s * 0.26, 'F');
      else if (it.m === 'cek') {
        const k = s * 0.72, x = X(it.x) - s * 1.25, y = yb - k * 0.95;
        d.setLineWidth(0.25); d.setDrawColor(95, 99, 104);
        if (it.on) { d.setFillColor(26, 115, 232); d.setDrawColor(26, 115, 232); d.roundedRect(x, y, k, k, 0.4, 0.4, 'FD'); d.setDrawColor(255, 255, 255); d.setLineWidth(0.4); d.line(x + k * 0.2, y + k * 0.52, x + k * 0.42, y + k * 0.74); d.line(x + k * 0.42, y + k * 0.74, x + k * 0.8, y + k * 0.28); }
        else d.roundedRect(x, y, k, k, 0.4, 0.4, 'S');
      }
    } else if (it.k === 'cell') {
      const r = it.r;
      if (it.bg) { d.setFillColor(it.bg[0], it.bg[1], it.bg[2]); d.rect(X(r.left), Y(r.top), r.w * PX, r.h * PX, 'F'); }
      d.setDrawColor(0, 0, 0); d.setLineWidth(0.25);
      d.rect(X(r.left), Y(r.top), r.w * PX, r.h * PX, 'S');
    } else if (it.k === 'hr') {
      d.setDrawColor(200, 200, 200); d.setLineWidth(0.3); d.line(X(it.r.left), Y(it.r.top), X(it.r.right), Y(it.r.top));
    } else if (it.k === 'img') {
      let wMm = it.r.w * PX, hMm = it.r.h * PX;
      const maks = batas - Y(it.r.top);
      if (hMm > maks && maks > 20) { wMm = wMm * maks / hMm; hMm = maks; }
      try { d.addImage(it.src, /^data:image\/jpe?g/i.test(it.src) ? 'JPEG' : 'PNG', X(it.r.left), Y(it.r.top), wMm, hMm, undefined, 'FAST'); } catch (e) { /* gambar rusak dilewati */ }
    }
  }

  // ───────────────────────── Isi laporan ─────────────────────────
  function namaKel(l) { return (App.B && App.B.kelompokById(l.KelompokID) ? App.B.kelompokById(l.KelompokID).nama : '') || l.NamaKelompok || '—'; }

  function laporanBody(w, l) {
    const r = App.rekap([l]);
    w.title('LAPORAN BULANAN BAGIAN PENDIDIKAN KELOMPOK', namaKel(l) + ' · ' + App.periode(l.Bulan, l.Tahun));
    w.infoGrid([
      ['Kelompok', namaKel(l)],
      ['Periode', App.periode(l.Bulan, l.Tahun)],
      ['Dikirim', App.fmtWaktu(l.WaktuKirim, { wita: true })],
      ['Diubah', l.WaktuUbah ? App.fmtWaktu(l.WaktuUbah, { wita: true }) + (l.DiubahOleh ? ' oleh ' + l.DiubahOleh : '') : '—'],
    ]);
    w.statBoxes([
      { l: 'Total Generus', v: r.total, hero: true }, { l: 'Caberawit', v: r.caberawit }, { l: 'Praremaja', v: r.praremaja },
      { l: 'Remaja', v: r.remaja }, { l: 'Pranikah', v: r.pranikah },
    ]);
    App.FORM.forEach(s => {
      const fs = App.visibleFields(s, l).filter(f => ['KelompokID', 'Bulan', 'Tahun'].indexOf(f.k) < 0);
      if (!fs.length) return;
      w.section(s.huruf, s.judul);
      w.kv(fs.map(f => [f.label, App.fmtField(f, l[f.k], l)]));
    });
    const tg = App.tanggapanList ? App.tanggapanList(l.ID) : [];
    if (tg.length) {
      w.section('#', 'Tanggapan Musyawaroh');
      w.kv(tg.map(t => [App.tanggapanLabel(t.bidang), t.isi]));
    }
  }

  function ringkasanBody(w, b, t, list, wajib) {
    const r = App.rekap(list);
    w.title('REKAP LAPORAN BULANAN', App.periode(b, t));
    w.para('Dari ' + list.length + ' / ' + wajib.length + ' kelompok yang sudah melapor.', 9.5, C.muted);
    w.statBoxes([
      { l: 'Total Generus', v: r.total, hero: true }, { l: 'Caberawit', v: r.caberawit }, { l: 'Praremaja', v: r.praremaja }, { l: 'Remaja', v: r.remaja },
    ]);
    w.statBoxes([{ l: 'Pranikah', v: r.pranikah }, { l: 'Muda-Mudi', v: r.mudamudi }, { l: 'Generus Mondok', v: r.mondok }, { l: 'Sudah Mubaligh', v: r.mubaligh }]);
    w.section('#', 'Status Pelaporan');
    const d = w.doc, M = w.M;
    const cols = [M, M + 10, M + 72, M + 106, M + 152];
    w.font('bold', 8.5); w.color(C.muted);
    ['NO', 'KELOMPOK', 'STATUS', 'WAKTU KIRIM', 'TOTAL GENERUS'].forEach((h, i) => d.text(h, cols[i], w.y + 3));
    w.y += 5.5;
    wajib.forEach((k, i) => {
      w.ensure(8);
      const l = list.find(x => x.KelompokID === k.id);
      w.font('normal', 9.5); w.color(C.text);
      d.text(String(i + 1), cols[0], w.y + 4);
      d.text(k.nama, cols[1], w.y + 4);
      if (l) { w.fill(C.okBg); d.roundedRect(cols[2], w.y, 20, 6, 3, 3, 'F'); w.color(C.ok); }
      else { w.fill(C.warnBg); d.roundedRect(cols[2], w.y, 20, 6, 3, 3, 'F'); w.color(C.warn); }
      w.font('bold', 8.5); d.text(l ? 'Sudah' : 'Belum', cols[2] + 10, w.y + 4.1, { align: 'center' });
      w.font('normal', 9.5); w.color(C.text);
      d.text(l ? App.fmtWaktu(l.WaktuKirim) : '—', cols[3], w.y + 4);
      d.text(l ? String(App.totalGenerus(l)) + ' orang' : '—', cols[4], w.y + 4);
      w.y += 7.5;
      w.draw(C.line); d.setLineWidth(0.2); d.line(M, w.y - 1, w.W - M, w.y - 1);
    });
    w.y += 4;
  }

  function notulenBody(w, sessions) {
    w.title('NOTULEN MUSYAWAROH');
    sessions.forEach((s, si) => {
      w.ensure(22);
      if (si > 0) w.y += 3;
      const d = w.doc, M = w.M;
      w.fill(C.deep); d.roundedRect(M, w.y, w.W - 2 * M, 9, 1.5, 1.5, 'F');
      d.setTextColor(255, 255, 255); w.font('bold', 10.5);
      d.text(App.fmtTanggal(s.tanggal), M + 4, w.y + 6);
      w.font('normal', 9.5); d.text(s.tempat || '', w.W - M - 4, w.y + 6, { align: 'right' });
      w.y += 13;
      w.docHtml(App.notulenDoc(s));
    });
  }

  // ───────────────────────── Daftar hadir (v1.6) ─────────────────────────
  /** Ambil isi lengkap sesi kehadiran dari server (dengan cache di memori) */
  const HADIR = {};
  App.hadirAmbil = async function (ids, fresh) {
    const perlu = ids.filter(id => fresh || !HADIR[id]);
    if (perlu.length) {
      const res = await App.api.admin('getKehadiran', { sesiIds: perlu });
      (res || []).forEach(x => { HADIR[x.sesiId] = x; });
    }
    return ids.map(id => HADIR[id]).filter(Boolean);
  };
  App.hadirLupa = id => { delete HADIR[id]; };
  App.hadirSimpanLokal = sesi => { HADIR[sesi.sesiId] = sesi; };

  function hadirBody(w, sesi) {
    const B = App.B;
    const kunci = App.hadirKunci(B ? B.peserta() : []);
    const h = App.hadirRingkas(sesi.rows, kunci);
    const d = w.doc, M = w.M, lebar = w.W - 2 * M;
    w.title('DAFTAR HADIR MUSYAWAROH');
    w.statBoxes([{ l: 'Peserta (orang)', v: h.total, hero: true }, { l: 'Hadir', v: h.hadir }, { l: 'Izin', v: h.izin }, { l: 'Belum Konfirmasi', v: h.belum }, { l: 'Kehadiran', v: App.fmtPct(h.persen) }]);
    const urut = B ? B.kelompok().map(k => k.id) : [];
    const kelIds = Array.from(new Set(sesi.rows.map(r => r.kelompokId))).sort((a, b) => (urut.indexOf(a) + 1 || 999) - (urut.indexOf(b) + 1 || 999));
    const namaK = id => { const k = B && B.kelompokById(id); return k ? k.nama : ((sesi.rows.find(r => r.kelompokId === id) || {}).namaKelompok || '-'); };
    const cols = [['No', 10], ['Dapuan', 40], ['Nama', 54], ['Status', 27], ['Keterangan', 0]];
    cols[4][1] = lebar - cols.slice(0, 4).reduce((a, c) => a + c[1], 0);
    const kepala = () => {
      w.fill(C.deep); d.rect(M, w.y, lebar, 7, 'F');
      d.setTextColor(255, 255, 255); w.font('bold', 8.2);
      let x = M + 1.8; cols.forEach(c => { d.text(c[0].toUpperCase(), x, w.y + 4.8); x += c[1]; });
      w.y += 7;
    };
    kelIds.forEach(kid => {
      const rows = sesi.rows.filter(r => r.kelompokId === kid).sort((a, b) => (a.no || 0) - (b.no || 0));
      const g = h.kel[kid] || { n: 0, h: 0, p: 0 };
      w.ensure(26);
      w.y += 2;
      w.fill(C.tint); d.roundedRect(M, w.y, lebar, 8, 1.5, 1.5, 'F');
      w.color(C.deep); w.font('bold', 10.5); d.text(namaK(kid), M + 3, w.y + 5.5);
      w.font('normal', 9); d.text('Hadir ' + g.h + ' dari ' + g.n + ' · ' + App.fmtPct(g.p), w.W - M - 3, w.y + 5.5, { align: 'right' });
      w.y += 10;
      kepala();
      rows.forEach((r, i) => {
        const st = r.status === 'Hadir' || r.status === 'Izin' ? r.status : '-';
        w.font('bold', 8.8); const nm = d.splitTextToSize(r.nama || '-', cols[2][1] - 3);
        w.font('normal', 8.8);
        const dp = d.splitTextToSize(r.dapuan || '-', cols[1][1] - 3);
        const kt = d.splitTextToSize(String(r.ket || '').trim() || '-', cols[4][1] - 3);
        const n = Math.max(nm.length, dp.length, kt.length);
        const rh = n * 4 + 2.6;
        if (w.y + rh > w.H - 18) { w.newPage(); kepala(); }
        if (i % 2) { w.fill([247, 250, 249]); d.rect(M, w.y, lebar, rh, 'F'); }
        let x = M + 1.8;
        const y = w.y + 4.2;
        w.font('normal', 8.8); w.color(C.text);
        d.text(String(r.no || i + 1), x, y); x += cols[0][1];
        d.text(dp, x, y, { lineHeightFactor: 1.3 }); x += cols[1][1];
        w.font('bold', 8.8); d.text(nm, x, y, { lineHeightFactor: 1.3 }); x += cols[2][1];
        w.font('bold', 8.4);
        if (st === 'Hadir') w.color(C.ok); else if (st === 'Izin') w.color(C.warn); else w.color(C.muted);
        d.text(st, x, y); x += cols[3][1];
        w.font('normal', 8.8); w.color(C.text);
        d.text(kt, x, y, { lineHeightFactor: 1.3 });
        w.y += rh;
        w.draw(C.line); d.setLineWidth(0.15); d.line(M, w.y, M + lebar, w.y);
      });
      w.y += 3;
    });
    ttdHadir(w, ttdNama(sesi));
  }

  /** v1.6.3: nama penanda tangan diambil dari daftar hadir sesuai dapuan (baris paling atas).
   *  Ki Desa = dapuan "KI Desa"; Bagian Pendidikan Desa = dapuan "Bagian Pendidikan Desa",
   *  diutamakan dari kelompok Perwakilan Desa. */
  function ttdNama(sesi) {
    const B = App.B;
    const n = t => String(t || '').toLowerCase().replace(/\bbag\.?\s/g, 'bagian ').replace(/[^a-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
    const urut = B ? B.kelompok().map(k => k.id) : [];
    const namaK = r => { const k = B && B.kelompokById(r.kelompokId); return n(k ? k.nama : r.namaKelompok); };
    const pos = r => (urut.indexOf(r.kelompokId) + 1 || 999) * 1000 + (r.no || 999);
    const siap = list => list.filter(r => String(r.nama || '').trim()).sort((a, b) => pos(a) - pos(b));
    const ada = siap(sesi.rows);
    // cadangan: daftar peserta saat ini (mis. pengurus baru ditambahkan setelah sesi disimpan)
    const kini = siap(((B && B.peserta()) || []).map(p => ({ kelompokId: p.kelompokId, no: p.urutan, dapuan: p.dapuan, nama: p.nama })));
    /** tingkat = daftar syarat [dapuan cocok?, kelompok cocok?] — yang pertama ditemukan (baris paling atas) dipakai */
    const cari = tingkat => {
      for (const sumber of [ada, kini]) {
        for (let i = 0; i < tingkat.length; i++) {
          const r = sumber.find(x => tingkat[i][0](n(x.dapuan)) && (!tingkat[i][1] || tingkat[i][1].test(namaK(x))));
          if (r) return String(r.nama).trim();
        }
      }
      return '';
    };
    const isKi = d => d === 'ki desa' || d === 'k i desa' || d === 'ketua ki desa';
    const pend = d => /pendidikan/.test(d) && !/wakil|sekretaris|bendahara|pembina|anggota/.test(d);
    return {
      ki: cari([[isKi, /desa/], [isKi]]),
      // v1.6.4: dapuan berisi "Pendidikan" di kelompok Perwakilan Desa → "Bagian Pendidikan Desa" di mana saja
      //         → dapuan "…Pendidikan…Desa" → dapuan "…Pendidikan…" di kelompok bernama "…Desa…"
      bp: cari([[pend, /perwakilan/], [d => d === 'bagian pendidikan desa'], [d => pend(d) && /desa/.test(d)], [pend, /desa/]]),
    };
  }

  /** Kolom tanda tangan: kiri "Mengetahui, Ki Desa" · kanan "Bagian Pendidikan Desa" (v1.6.2) · nama otomatis (v1.6.3) */
  function ttdHadir(w, nama) {
    nama = nama || {};
    const d = w.doc, M = w.M, lebar = w.W - 2 * M;
    w.ensure(48);
    w.y += 8;
    const xs = [M + lebar * 0.25, M + lebar * 0.75];
    w.font('normal', 10.5); w.color(C.text);
    d.text('Mengetahui,', xs[0], w.y, { align: 'center' });
    d.text('Ki Desa', xs[0], w.y + 5.5, { align: 'center' });
    d.text('Bagian Pendidikan Desa', xs[1], w.y + 5.5, { align: 'center' });
    const yl = w.y + 30;
    w.draw(C.text); d.setLineWidth(0.3);
    [nama.ki, nama.bp].forEach((nm, i) => {
      const x = xs[i];
      if (nm) {
        w.font('bold', 10.5); w.color(C.text);
        const t = d.splitTextToSize(nm, lebar / 2 - 8)[0];
        d.text(t, x, yl, { align: 'center' });
        const tw = d.getTextWidth(t);
        d.setLineWidth(0.35); d.line(x - tw / 2, yl + 1, x + tw / 2, yl + 1);
      } else {
        w.font('normal', 10.5);
        d.text('(', x - 30, yl); d.text(')', x + 30, yl, { align: 'right' }); d.setLineDashPattern([0.6, 0.9], 0); d.line(x - 27, yl + 0.6, x + 27, yl + 0.6); d.setLineDashPattern([], 0);
      }
    });
    w.y = yl + 6;
  }

  // ───────────────────────── API publik pdf ─────────────────────────
  /** info = {tanggal, tempat} untuk kop; bila tidak diberikan → sesi musyawaroh periode laporan (admin) */
  const infoLaporan = (l, info) => (info !== undefined ? info : (App.B && App.B.notulen ? App.kopInfo(App.sesiUntukPeriode(l.Bulan, l.Tahun)) : null));
  App.pdf.laporan = async function (l, info) {
    const w = new Writer(await jsPDFCtor(), infoLaporan(l, info));
    w.kop();
    laporanBody(w, l);
    w.save('Laporan ' + namaKel(l) + ' ' + App.periode(l.Bulan, l.Tahun));
  };

  App.pdf.bukti = async function (l, kode) {
    const w = new Writer(await jsPDFCtor());
    w.kop();
    w.title('BUKTI PENGIRIMAN LAPORAN', namaKel(l) + ' · ' + App.periode(l.Bulan, l.Tahun));
    const d = w.doc, M = w.M;
    w.fill([255, 251, 235]); w.draw(C.gold); d.setLineDashPattern([1.5, 1.2], 0); d.setLineWidth(0.5);
    d.roundedRect(M, w.y, w.W - 2 * M, 32, 3, 3, 'FD');
    d.setLineDashPattern([], 0);
    w.color(C.muted); w.font('bold', 8.5); d.text('KODE KOREKSI LAPORAN', w.W / 2, w.y + 8, { align: 'center' });
    w.color(C.text); d.setFont('courier', 'bold'); d.setFontSize(26); d.text(kode.split('').join(' '), w.W / 2, w.y + 19, { align: 'center' });
    w.font('normal', 9); w.color(C.warn); d.text('Simpan kode ini — dibutuhkan untuk mengoreksi laporan.', w.W / 2, w.y + 27, { align: 'center' });
    w.y += 40;
    laporanBody(w, l);
    w.save('Bukti Laporan ' + namaKel(l) + ' ' + App.periode(l.Bulan, l.Tahun));
  };

  App.pdf.gabungan = async function (b, t, list, wajib, sessions, info, hadir) {
    const w = new Writer(await jsPDFCtor(), info !== undefined ? info : (sessions && sessions.length ? App.kopInfo(sessions) : App.kopInfo(App.sesiUntukPeriode(b, t))));
    w.kop();
    if (sessions && sessions.length) {
      notulenBody(w, sessions);
      w.newPage();
      w.kop();
    }
    ringkasanBody(w, b, t, list, wajib);
    const urut = wajib.map(k => list.find(l => l.KelompokID === k.id)).filter(Boolean)
      .concat(list.filter(l => !wajib.some(k => k.id === l.KelompokID)));
    urut.forEach(l => { w.newPage(); w.kop(); laporanBody(w, l); });
    // v1.6: daftar hadir di lembar terakhir
    (hadir || []).forEach(h => { w.newPage(); w.info = App.kopInfo(h); w.kop(); hadirBody(w, h); });
    w.save((sessions && sessions.length ? 'Laporan & Notulen ' : 'Rekap Laporan ') + App.periode(b, t));
  };

  App.pdf.hadir = async function (sessions) {
    const w = new Writer(await jsPDFCtor(), App.kopInfo(sessions[0]));
    sessions.forEach((h, i) => { if (i) { w.newPage(); w.info = App.kopInfo(h); } w.kop(); hadirBody(w, h); });
    w.save('Daftar Hadir ' + (sessions.length === 1 ? App.fmtTanggal(sessions[0].tanggal) : sessions.length + ' sesi'));
  };

  App.pdf.notulen = async function (sessions) {
    const w = new Writer(await jsPDFCtor(), App.kopInfo(sessions));
    w.kop();
    notulenBody(w, sessions);
    w.save('Notulen ' + (sessions.length === 1 ? App.fmtTanggal(sessions[0].tanggal) : sessions.length + ' sesi'));
  };

  /** v1.5: data rinci Monitoring & Bimbingan Akhlaq (mengikuti filter & pencarian di layar) */
  App.pdf.monitoringRinci = async function (D, list, rf, cari) {
    const w = new Writer(await jsPDFCtor());
    w.kop();
    w.title('DATA RINCI MONITORING & BIMBINGAN AKHLAQ', 'Bulan: ' + (rf.bulan || '-') + ' · Tahun: ' + (rf.tahun || '-'));
    w.infoGrid([['Kategori', rf.kategori], ['Kelompok', rf.kelompok], ['Jumlah', App.fmtNum(list.length) + ' laporan · ' + App.fmtNum(App.monUnikAnak(D, list).length) + ' anak']].concat(cari ? [['Pencarian', cari]] : []));
    const d = w.doc, M = w.M;
    const BL = App.BULAN_PENDEK;
    const cols = [['No', 9], ['Bulan', 17], ['Nama Anak', 50], ['Umur', 11], ['L/P', 9], ['Kategori', 20], ['Pelapor', 0]];
    const lebar = w.W - 2 * M;
    cols[6][1] = lebar - cols.slice(0, 6).reduce((a, c) => a + c[1], 0);
    const kepala = () => {
      w.ensure(9);
      w.fill(C.deep); d.rect(M, w.y, lebar, 7, 'F');
      d.setTextColor(255, 255, 255); w.font('bold', 8.2);
      let x = M + 1.5; cols.forEach(c => { d.text(c[0].toUpperCase(), x, w.y + 4.8); x += c[1]; });
      w.y += 7;
    };
    const grup = {};
    list.forEach(r => { (grup[r[3]] = grup[r[3]] || []).push(r); });
    const kunci = Object.keys(grup).sort((a, b) => D.kelompok[a].localeCompare(D.kelompok[b]));
    if (!kunci.length) w.para('Tidak ada data untuk filter ini.', 10, C.muted);
    kunci.forEach(k => {
      const rows = grup[k].sort((a, b) => (a[1] * 100 + a[2]) - (b[1] * 100 + b[2]) || String(D.nama[a[5]]).localeCompare(String(D.nama[b[5]])));
      w.ensure(22);
      w.y += 2;
      w.fill(C.tint); d.roundedRect(M, w.y, lebar, 8, 1.5, 1.5, 'F');
      w.color(C.deep); w.font('bold', 10.5); d.text(D.kelompok[k], M + 3, w.y + 5.5);
      w.font('normal', 9); d.text(rows.length + ' laporan', w.W - M - 3, w.y + 5.5, { align: 'right' });
      w.y += 10;
      kepala();
      rows.forEach((r, i) => {
        if (w.y + 6.2 > w.H - 18) { w.newPage(); kepala(); }
        if (i % 2) { w.fill([247, 250, 249]); d.rect(M, w.y, lebar, 6.2, 'F'); }
        w.font('normal', 8.6); w.color(C.text);
        const val = [String(i + 1), r[2] ? BL[r[2] - 1] + ' ' + String(r[1]).slice(2) : '-', D.nama[r[5]] || '', String(r[10] || ''), r[4] === 1 ? 'L' : r[4] === 2 ? 'P' : '-', D.kat[r[0]], String(r[11] || '')];
        let x = M + 1.5;
        cols.forEach((c, j) => {
          if (j === 2) w.font('bold', 8.6); else w.font('normal', 8.6);
          let t = val[j];
          while (t.length > 1 && d.getTextWidth(t) > c[1] - 2.5) t = t.slice(0, -2) + '…';
          d.text(t, x, w.y + 4.3);
          x += c[1];
        });
        w.y += 6.2;
        w.draw(C.line); d.setLineWidth(0.15); d.line(M, w.y, M + lebar, w.y);
      });
    });
    w.save('Data Rinci Monitoring ' + (rf.bulan || '') + ' ' + (rf.tahun || ''));
  };

  /** Jalankan pembuat PDF dengan indikator di tombol */
  App.pdf.run = async function (btn, fn) {
    App.busy(btn, true);
    try { await fn(); App.toast('PDF berhasil dibuat.'); }
    catch (e) { console.error(e); App.toast(e.message || 'Gagal membuat PDF.', 'err'); }
    finally { App.busy(btn, false); }
  };
})();
