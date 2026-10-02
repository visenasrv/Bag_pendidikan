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

  App.meta = function () {
    const s = (App.store && App.store.data && App.store.data.pengaturan) || App.swrPeek('cfg') || {};
    return { nama: s.namaAplikasi || 'Musyawaroh & Pelaporan Bagian Pendidikan', sub: s.subjudul || 'PPG Kutai Timur · Desa Sangatta Selatan' };
  };

  /** Bersihkan HTML notulen: hanya teks + warna + tebal/miring/garis bawah + baris baru */
  App.sanitize = function (html) {
    const doc = new DOMParser().parseFromString('<div>' + (html || '') + '</div>', 'text/html');
    const allowed = { B: 1, STRONG: 1, I: 1, EM: 1, U: 1, BR: 1, DIV: 1, P: 1, SPAN: 1, FONT: 1 };
    const clean = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1 || !allowed[ch.nodeName]) {
          if (ch.nodeType === 1) { clean(ch); while (ch.firstChild) node.insertBefore(ch.firstChild, ch); }
          ch.remove();
          return;
        }
        const color = ch.style && ch.style.color ? ch.style.color : (ch.getAttribute && ch.getAttribute('color'));
        Array.from(ch.attributes).forEach(a => ch.removeAttribute(a.name));
        if (color && /^(#[0-9a-f]{3,8}|rgb\([\d\s,]+\)|[a-z]+)$/i.test(color.trim())) ch.setAttribute('style', 'color:' + color);
        clean(ch);
      });
    };
    const root = doc.body.firstChild;
    clean(root);
    return root.innerHTML;
  };

  App.pdf = {};

  async function jsPDFCtor() {
    await App.lib('jspdf');
    return window.jspdf.jsPDF;
  }

  // ───────────────────────── Penulis halaman ─────────────────────────
  class Writer {
    constructor(Ctor) {
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
      const L = App.logo.get('kiri'), R = App.logo.get('kanan');
      const sz = 18;
      const img = (c, x) => {
        if (!c) return;
        try { d.addImage(c.dataUrl, /jpe?g/i.test(c.dataUrl.slice(5, 20)) ? 'JPEG' : 'PNG', x, this.y, sz, sz, undefined, 'FAST'); } catch (e) { /* abaikan logo */ }
      };
      img(L, M);
      img(R, this.W - M - sz);
      this.color(C.muted); this.font('bold', 9);
      d.text(meta.sub.toUpperCase(), this.W / 2, this.y + 6, { align: 'center' });
      this.color(C.deep); this.font('bold', 14);
      d.text(d.splitTextToSize(meta.nama, this.W - 2 * M - 2 * sz - 8), this.W / 2, this.y + 12.5, { align: 'center' });
      this.y += sz + 3;
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

    /** Teks kaya (notulen) dengan warna per segmen */
    rich(html, x0, maxX, lh) {
      const d = this.doc;
      const lines = richLines(html);
      lines.forEach(segs => {
        let x = x0;
        this.ensure(lh);
        let atStart = true;
        const tokens = [];
        segs.forEach(s => s.text.split(/(\s+)/).forEach(t => { if (t) tokens.push({ t: t, s: s }); }));
        if (!tokens.length) { this.y += lh * 0.6; return; }
        tokens.forEach(tok => {
          const ws = /^\s+$/.test(tok.t);
          if (ws && atStart) return;
          const st = tok.s.bold && tok.s.italic ? 'bolditalic' : tok.s.bold ? 'bold' : tok.s.italic ? 'italic' : 'normal';
          this.font(st, 10.5);
          const w = d.getTextWidth(ws ? ' ' : tok.t);
          if (!ws && x + w > maxX && !atStart) {
            this.y += lh; x = x0; this.ensure(lh);
          }
          if (ws) { x += w; return; }
          d.setTextColor(tok.s.rgb[0], tok.s.rgb[1], tok.s.rgb[2]);
          d.text(tok.t, x, this.y + 3.8);
          if (tok.s.underline) { d.setDrawColor(tok.s.rgb[0], tok.s.rgb[1], tok.s.rgb[2]); d.setLineWidth(0.2); d.line(x, this.y + 4.5, x + w, this.y + 4.5); }
          x += w;
          atStart = false;
        });
        this.y += lh;
      });
    }

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

  /** HTML → baris berisi segmen {text, rgb, bold, italic, underline} memakai getComputedStyle */
  function richLines(html) {
    const host = document.createElement('div');
    host.className = 'paper';
    host.style.cssText = 'position:fixed;left:-10000px;top:0;width:640px;visibility:hidden';
    host.innerHTML = App.sanitize(html);
    document.body.appendChild(host);
    const out = [];
    let cur = [];
    const flush = () => { out.push(cur); cur = []; };
    const walk = node => {
      Array.from(node.childNodes).forEach(ch => {
        if (ch.nodeType === 3) {
          const t = ch.nodeValue.replace(/\s+/g, ' ');
          if (!t) return;
          const cs = getComputedStyle(ch.parentElement);
          cur.push({
            text: t, rgb: parseRgb(cs.color), bold: parseInt(cs.fontWeight, 10) >= 600, italic: cs.fontStyle === 'italic',
            underline: (cs.textDecorationLine || cs.textDecoration || '').indexOf('underline') >= 0,
          });
        } else if (ch.nodeName === 'BR') {
          flush();
        } else if (ch.nodeName === 'DIV' || ch.nodeName === 'P') {
          if (cur.length) flush();
          walk(ch);
          if (cur.length) flush();
        } else if (ch.nodeType === 1) {
          walk(ch);
        }
      });
    };
    walk(host);
    if (cur.length) flush();
    host.remove();
    while (out.length && !out[out.length - 1].length) out.pop();
    return out.length ? out : [[]];
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
  }

  function ringkasanBody(w, b, t, list, wajib) {
    const r = App.rekap(list);
    w.title('REKAP LAPORAN BULANAN', App.periode(b, t));
    w.para('Dari ' + list.length + ' / ' + wajib.length + ' kelompok yang sudah melapor.', 9.5, C.muted);
    w.statBoxes([
      { l: 'Total Generus', v: r.total, hero: true }, { l: 'Caberawit', v: r.caberawit }, { l: 'Praremaja', v: r.praremaja }, { l: 'Remaja', v: r.remaja },
    ]);
    w.statBoxes([{ l: 'Pranikah', v: r.pranikah }, { l: 'Generus Mondok', v: r.mondok }, { l: 'Sudah Mubaligh', v: r.mubaligh }]);
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
      (s.poin || []).forEach(p => {
        w.ensure(7);
        w.font('bold', 10.5); w.color(C.deep);
        d.text(p.no + '.', M + 7, w.y + 3.8, { align: 'right' });
        w.rich(p.isi, M + 10, w.W - M, 5.4);
        w.y += 1.2;
        w.draw([237, 231, 217]); d.setLineWidth(0.15); d.line(M + 10, w.y - 0.6, w.W - M, w.y - 0.6);
        w.y += 1;
      });
    });
  }

  // ───────────────────────── API publik pdf ─────────────────────────
  App.pdf.laporan = async function (l) {
    const w = new Writer(await jsPDFCtor());
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

  App.pdf.gabungan = async function (b, t, list, wajib, sessions) {
    const w = new Writer(await jsPDFCtor());
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
    w.save((sessions && sessions.length ? 'Laporan & Notulen ' : 'Rekap Laporan ') + App.periode(b, t));
  };

  App.pdf.notulen = async function (sessions) {
    const w = new Writer(await jsPDFCtor());
    w.kop();
    notulenBody(w, sessions);
    w.save('Notulen ' + (sessions.length === 1 ? App.fmtTanggal(sessions[0].tanggal) : sessions.length + ' sesi'));
  };

  /** Jalankan pembuat PDF dengan indikator di tombol */
  App.pdf.run = async function (btn, fn) {
    App.busy(btn, true);
    try { await fn(); App.toast('PDF berhasil dibuat.'); }
    catch (e) { console.error(e); App.toast(e.message || 'Gagal membuat PDF.', 'err'); }
    finally { App.busy(btn, false); }
  };
})();
