/* ==========================================================================
   form.js — mesin formulir laporan bertahap (dipakai publik & admin)
   Mode: 'baru' | 'koreksi' (publik) · 'adminBaru' | 'adminUbah' (admin)
   - Draf otomatis di perangkat (localStorage) setiap ada perubahan
   - Validasi per bagian, pesan di bawah isian, gulir ke isian pertama yang salah
   - Cek laporan ganda saat kelompok + bulan + tahun dipilih
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;
  const esc = App.esc, icon = App.icon;

  function defaults() {
    return { KelompokID: '', Bulan: '', Tahun: App.nowWita().y };
  }

  class LaporanForm {
    constructor(o) {
      this.o = o;
      this.mode = o.mode;
      this.admin = this.mode === 'adminBaru' || this.mode === 'adminUbah';
      this.data = Object.assign(defaults(), o.initial || {});
      this.step = 0;
      this.errors = {};
      this.cek = null;
      this.cekKey = '';
      this.savedAt = null;
      this.sections = App.FORM;
      this.total = this.sections.length;
      this.saveDraft = App.debounce(() => this._saveDraft(), 250);
    }

    // ── draf ──
    _saveDraft() {
      if (!this.o.draftKey || this.done) return;
      App.ls.set(this.o.draftKey, { data: this.data, step: this.step, t: Date.now() });
      this.savedAt = new Date();
      const t = App.partsWita(this.savedAt);
      const el = this.root && this.root.querySelector('[data-saved-time]');
      if (el) el.textContent = t.hh + ':' + t.mm;
      const s = this.root && this.root.querySelector('[data-saved]');
      if (s) s.classList.remove('hidden');
    }
    clearDraft() { if (this.o.draftKey) App.ls.del(this.o.draftKey); }

    async start() {
      if (this.o.draftKey && this.mode === 'baru') {
        const d = App.ls.get(this.o.draftKey);
        const terisi = d && d.data && Object.keys(d.data).some(k => k !== 'Tahun' && d.data[k] !== '' && d.data[k] !== undefined);
        if (terisi) {
          this.render(); // tampilkan dulu agar tidak kosong
          const lanjut = await App.confirm({
            title: 'Lanjutkan draf sebelumnya?',
            html: 'Ada isian laporan yang belum terkirim dari ' + esc(App.fmtWaktu(new Date(d.t).toISOString())) + '.<br>Lanjutkan mengisi dari draf tersebut?',
            ok: 'Lanjutkan Draf', cancel: 'Mulai Baru',
          });
          if (!App.alive(this.o.viewId)) return;
          if (lanjut) { this.data = Object.assign(defaults(), d.data); this.step = Math.min(d.step || 0, this.total - 1); }
          else this.clearDraft();
        }
      }
      this.render();
      this.runCek();
    }

    // ── render ──
    render() {
      const c = this.o.container;
      const isPreview = this.step >= this.total;
      const sec = this.sections[Math.min(this.step, this.total - 1)];
      const pct = isPreview ? 100 : Math.round(((this.step + 1) / (this.total + 1)) * 100);
      const judul = this.o.title || 'Form Laporan Kegiatan';
      const sub = this.o.subtitle || 'Bagian Pendidikan Kelompok';

      let html = '';
      if (!this.admin) {
        html += '<header class="topbar"><button class="icon-btn" data-exit aria-label="Kembali">' + icon('arrowL') + '</button>' +
          '<div class="title"><h1>' + esc(judul) + '</h1><p>' + esc(sub) + '</p></div>' +
          '<button class="icon-btn" data-theme aria-label="Ganti tema">' + icon('palette') + '</button></header>';
      }
      html += '<div class="card stepper" style="' + (this.admin ? 'top:68px' : '') + '">' +
        '<div class="meta"><span>' + (isPreview ? 'Pratinjau · periksa sebelum ' + (this.mode === 'baru' || this.mode === 'adminBaru' ? 'kirim' : 'simpan') : 'Bagian ' + (this.step + 1) + ' dari ' + this.total + ' · ' + esc(sec.judul)) + '</span><span class="num">' + pct + '%</span></div>' +
        '<div class="progress"><i style="width:' + pct + '%"></i></div>' +
        '<div class="steps-scroll">' + this.sections.map((s, i) => {
          const bad = this.sectionHasError(i);
          const cls = i === this.step ? 'on' : (bad ? 'bad' : (i < this.step || isPreview ? 'done' : ''));
          return '<button class="step-chip ' + cls + '" data-go="' + i + '">' + (i + 1) + '. ' + esc(s.pendek) + '</button>';
        }).join('') + '<button class="step-chip ' + (isPreview ? 'on' : '') + '" data-go="' + this.total + '">' + icon('eye', 'sm') + ' Pratinjau</button></div></div>';

      if (this.o.draftKey) {
        const t = this.savedAt ? App.partsWita(this.savedAt) : null;
        html += '<div class="autosave">' + icon('cloudCheck', 'sm') + '<span>Draf tersimpan otomatis di perangkat</span><span class="t" data-saved-time>' + (t ? t.hh + ':' + t.mm : '') + '</span></div>';
      }
      if (this.mode === 'koreksi' || this.mode === 'adminUbah') {
        html += '<div class="notice warn" style="margin-top:12px">' + icon('edit') + '<div><b>' + (this.mode === 'koreksi' ? 'Mode koreksi laporan' : 'Mengubah laporan') + '</b>' +
          esc((this.o.namaKelompok || '') + ' · ' + App.periode(this.data.Bulan, this.data.Tahun)) + '</div></div>';
      }

      html += '<div style="margin-top:12px">' + (isPreview ? this.previewHtml() : this.sectionHtml(sec)) + '</div>';

      if (!isPreview && this.step < this.total - 1) {
        html += '<div class="next-hint">Berikutnya: ' + this.sections.slice(this.step + 1).map(s => esc(s.pendek)).join(' → ') + ' → Pratinjau</div>';
      }

      // bilah aksi
      const labelLangkah = isPreview ? 'Pratinjau laporan' : 'Langkah ' + (this.step + 1) + ' dari ' + this.total + ' · ' + sec.judul;
      const kirimLabel = this.mode === 'baru' ? 'Kirim Laporan' : (this.mode === 'adminBaru' ? 'Simpan Laporan' : 'Simpan Koreksi');
      html += '<div class="action-bar ' + (this.admin ? 'inline' : '') + '"><div class="inner">' +
        '<div class="meta"><span>' + esc(labelLangkah) + '</span>' + (this.o.draftKey ? '<span class="saved ' + (this.savedAt ? '' : 'hidden') + '" data-saved>Tersimpan</span>' : '') + '</div>' +
        (isPreview
          ? '<div class="btns two"><button class="btn btn-soft" data-prev>' + icon('edit') + ' Koreksi</button><button class="btn btn-primary" data-submit>' + icon('send') + ' ' + kirimLabel + '</button></div>'
          : '<div class="btns"><button class="btn btn-ghost btn-sm" data-clear style="padding:0 10px">' + icon('eraser') + '<span class="hide-xs">' + (this.admin ? 'Batal' : 'Bersihkan') + '</span></button>' +
            '<button class="btn btn-soft" data-prev ' + (this.step === 0 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + icon('chevL') + '<span class="hide-sm">Sebelumnya</span></button>' +
            '<button class="btn btn-primary" data-next>' + (this.step === this.total - 1 ? 'Pratinjau' : 'Selanjutnya') + ' ' + icon('arrowR') + '</button></div>') +
        '</div></div>';

      c.innerHTML = html;
      this.root = c;
      document.body.classList.toggle('with-actionbar', !this.admin);
      this.bind();
      const chip = c.querySelector('.step-chip.on');
      if (chip) chip.scrollIntoView({ block: 'nearest', inline: 'center' });
    }

    sectionHasError(i) {
      const s = this.sections[i];
      return s.fields.some(f => f.k && this.errors[f.k]);
    }

    fieldHtml(f) {
      const d = this.data;
      const v = d[f.k] === undefined || d[f.k] === null ? '' : d[f.k];
      const err = this.errors[f.k];
      const locked = this.mode === 'koreksi' && (f.k === 'KelompokID' || f.k === 'Bulan' || f.k === 'Tahun');
      const lbl = '<label for="f_' + f.k + '">' + esc(f.label) + (f.req ? ' <span class="req">*</span>' : '') + '</label>';
      let ctl = '';
      switch (f.type) {
        case 'kelompok':
          ctl = '<select class="select" id="f_' + f.k + '" data-k="' + f.k + '" ' + (locked ? 'disabled' : '') + '><option value="">Pilih kelompok</option>' +
            (this.o.kelompok || []).map(k => '<option value="' + esc(k.id) + '"' + (k.id === v ? ' selected' : '') + '>' + esc(k.nama) + '</option>').join('') + '</select>';
          break;
        case 'bulan':
          ctl = '<select class="select" id="f_' + f.k + '" data-k="' + f.k + '" ' + (locked ? 'disabled' : '') + '><option value="">Pilih bulan</option>' + App.bulanOptions(v) + '</select>';
          break;
        case 'tahun':
          ctl = '<select class="select" id="f_' + f.k + '" data-k="' + f.k + '" ' + (locked ? 'disabled' : '') + '>' + App.tahunOptions(v || App.nowWita().y) + '</select>';
          break;
        case 'seg':
          ctl = '<div class="seg" role="radiogroup" id="f_' + f.k + '">' + f.options.map(op =>
            '<button type="button" role="radio" aria-checked="' + (v === op) + '" class="' + (v === op ? 'on' : '') + '" data-seg="' + f.k + '" data-v="' + esc(op) + '">' + esc(op) + '</button>').join('') + '</div>';
          break;
        case 'radio':
          ctl = '<div class="radio-list" role="radiogroup" id="f_' + f.k + '">' + f.options.map(op =>
            '<button type="button" role="radio" aria-checked="' + (v === op.v) + '" class="radio-card ' + (v === op.v ? 'on' : '') + '" data-seg="' + f.k + '" data-v="' + esc(op.v) + '"><span class="dot"></span><span><b>' + esc(op.v) + '</b>' + (op.sub ? '<small>' + esc(op.sub) + '</small>' : '') + '</span></button>').join('') + '</div>';
          break;
        case 'date':
          ctl = '<input class="input" type="date" id="f_' + f.k + '" data-k="' + f.k + '" value="' + esc(v) + '" max="' + App.today() + '">';
          break;
        case 'num':
          ctl = '<div class="input-wrap"><input class="input ' + (f.big ? 'big' : '') + '" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" id="f_' + f.k + '" data-k="' + f.k + '" data-num value="' + esc(v) + '" placeholder="0"><span class="suffix">' + esc(f.suffix || '') + '</span></div>';
          break;
        case 'text':
          ctl = '<input class="input" type="text" id="f_' + f.k + '" data-k="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" maxlength="500">';
          break;
        case 'textarea':
          ctl = '<textarea class="textarea" id="f_' + f.k + '" data-k="' + f.k + '" rows="' + (f.rows || 3) + '" placeholder="' + esc(f.ph || '') + '" maxlength="5000">' + esc(v) + '</textarea>';
          break;
      }
      return '<div class="field ' + (err ? 'invalid' : '') + '" data-field="' + f.k + '">' + lbl + ctl +
        (err ? '<div class="err-msg">' + icon('alertCircle', 'sm') + esc(err) + '</div>' : (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '')) + '</div>';
    }

    sectionHtml(sec) {
      const d = this.data;
      let html = '<section class="card lg form-section"><div class="row between"><h2>' + esc(sec.judul) + '</h2><span class="badge ok">Bagian ' + (this.step + 1) + ' dari ' + this.total + '</span></div>' +
        '<p class="sec-sub">' + esc(sec.sub) + '</p>';
      const fs = sec.fields;
      for (let i = 0; i < fs.length; i++) {
        const f = fs[i];
        if (f.type === 'info') { html += '<div class="help" style="margin-top:8px">' + icon('info', 'sm') + esc(f.text) + '</div>'; continue; }
        if (f.type === 'cek') { html += '<div data-cek style="margin-top:12px">' + this.cekHtml() + '</div>'; continue; }
        if (f.half && fs[i + 1] && fs[i + 1].half) {
          html += '<div class="fields">' + this.fieldHtml(f) + this.fieldHtml(fs[i + 1]) + '</div>';
          i++;
          continue;
        }
        if (f.panel) {
          const group = [];
          while (i < fs.length && fs[i].panel === f.panel) { group.push(fs[i]); i++; }
          i--;
          const vis = group.filter(g => !g.show || g.show(d));
          if (vis.length) html += '<div class="sub-panel" style="margin-top:12px">' + vis.map(g => this.fieldHtml(g)).join('') + '</div>';
          continue;
        }
        if (f.show && !f.show(d)) continue;
        html += this.fieldHtml(f);
      }
      return html + '</section>';
    }

    cekHtml() {
      const c = this.cek;
      if (!c) return '';
      if (c.loading) return '<div class="help">' + icon('refresh', 'sm') + ' Memeriksa status laporan…</div>';
      if (c.error) return '';
      const kel = (this.o.kelompok || []).find(k => k.id === this.data.KelompokID);
      const per = App.periode(this.data.Bulan, this.data.Tahun);
      if (c.ada) {
        return '<div class="notice warn">' + icon('alert') + '<div class="grow"><b>Laporan ' + esc(kel ? kel.nama : '') + ' ' + esc(per) + ' sudah dikirim</b>' +
          (this.admin ? 'Satu kelompok hanya boleh satu laporan per bulan. Ubah laporan yang sudah ada.' : 'Anda dapat memperbarui data menggunakan kode koreksi tanpa mengirim ulang.') +
          '<button type="button" class="btn btn-sm btn-block" style="background:var(--surface);margin-top:10px" data-koreksi>' + icon('edit') + (this.admin ? ' Buka Laporan Ini' : ' Koreksi Laporan Ini') + '</button></div></div>';
      }
      if (c.terkunci && c.tutupBaru && !this.admin) {
        return '<div class="notice err">' + icon('lock') + '<div><b>Periode ' + esc(per) + ' sudah ditutup</b>Bagian Pendidikan Desa sudah mengunci periode ini. Silakan hubungi admin.</div></div>';
      }
      return '<div class="notice">' + icon('checkCircle') + '<div>Belum ada laporan ' + esc(kel ? kel.nama : '') + ' untuk ' + esc(per) + '. Silakan lanjutkan.</div></div>';
    }

    async runCek() {
      if (!(this.mode === 'baru' || this.mode === 'adminBaru') || !this.o.onCek) return;
      const d = this.data;
      if (!d.KelompokID || !d.Bulan || !d.Tahun) { this.cek = null; this.paintCek(); return; }
      const key = d.KelompokID + '|' + d.Bulan + '|' + d.Tahun;
      this.cekKey = key;
      // tebakan instan dari cache lokal, lalu konfirmasi server
      const guess = this.o.onCekLocal ? this.o.onCekLocal(d.KelompokID, d.Bulan, d.Tahun) : null;
      this.cek = guess || { loading: true };
      this.paintCek();
      try {
        const r = await this.o.onCek(d.KelompokID, +d.Bulan, +d.Tahun);
        if (this.cekKey !== key) return;
        this.cek = r;
      } catch (e) {
        if (this.cekKey !== key) return;
        if (!guess) this.cek = { error: true };
      }
      this.paintCek();
      if (this.cek && this.cek.ada && this.errors.Bulan === undefined && this.step === 0 && this._triedNext) this.validateStep(0);
    }
    paintCek() {
      const el = this.root && this.root.querySelector('[data-cek]');
      if (!el) return;
      el.innerHTML = this.cekHtml();
      const b = el.querySelector('[data-koreksi]');
      if (b) b.onclick = () => this.o.onKoreksi && this.o.onKoreksi(Object.assign({}, this.data));
    }

    previewHtml() {
      const d = this.data;
      const r = App.rekap([d]);
      let html = '<div class="stat-hero" style="margin-bottom:12px"><div class="lbl">Total Generus</div><div class="val num">' + App.fmtNum(r.total) + '<small>Orang</small></div>' +
        '<div class="breakdown"><span>Caberawit <b>' + r.caberawit + '</b></span><span>Praremaja <b>' + r.praremaja + '</b></span><span>Remaja <b>' + r.remaja + '</b></span><span>Pranikah <b>' + r.pranikah + '</b></span></div></div>';
      this.sections.forEach((s, i) => {
        const fs = App.visibleFields(s, d);
        html += '<section class="card preview-sec"><div class="card-head"><div class="card-title"><span class="badge ok">' + s.huruf + '</span>' + esc(s.judul) + '</div>' +
          '<button class="btn btn-ghost btn-xs" data-go="' + i + '">' + icon('edit', 'sm') + ' Ubah</button></div><div class="kv">' +
          fs.map(f => {
            const val = App.fmtField(f, d[f.k], d);
            return '<div class="k">' + esc(f.label) + '</div><div class="v ' + (val ? '' : 'empty') + '">' + esc(val || '—') + '</div>';
          }).join('') + '</div></section>';
      });
      return html;
    }

    // ── interaksi ──
    bind() {
      const c = this.root;
      c.querySelectorAll('[data-k]').forEach(el => {
        const k = el.getAttribute('data-k');
        const handler = () => {
          let v = el.value;
          if (el.hasAttribute('data-num')) {
            const clean = v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
            if (clean !== v) el.value = clean;
            v = clean;
          }
          this.data[k] = (k === 'Bulan' || k === 'Tahun') && v !== '' ? +v : v;
          if (this.errors[k]) {
            delete this.errors[k];
            const fe = el.closest('.field');
            if (fe) { fe.classList.remove('invalid'); const m = fe.querySelector('.err-msg'); if (m) m.remove(); }
          }
          this.saveDraft();
          if (k === 'KelompokID' || k === 'Bulan' || k === 'Tahun') this.runCek();
        };
        el.addEventListener('input', handler);
        if (el.tagName === 'SELECT') el.addEventListener('change', handler);
      });
      c.querySelectorAll('[data-seg]').forEach(b => {
        b.onclick = () => {
          const k = b.getAttribute('data-seg');
          this.data[k] = b.getAttribute('data-v');
          delete this.errors[k];
          this.saveDraft();
          this.rerenderSection();
        };
      });
      c.querySelectorAll('[data-go]').forEach(b => { b.onclick = () => this.goto(+b.getAttribute('data-go')); });
      const q = s => c.querySelector(s);
      if (q('[data-next]')) q('[data-next]').onclick = () => this.next();
      if (q('[data-prev]')) q('[data-prev]').onclick = () => this.goto(this.step - 1, true);
      if (q('[data-submit]')) q('[data-submit]').onclick = e => this.submit(e.currentTarget);
      if (q('[data-clear]')) q('[data-clear]').onclick = () => this.clear();
      if (q('[data-exit]')) q('[data-exit]').onclick = () => this.exit();
      if (q('[data-theme]')) q('[data-theme]').onclick = () => App.theme.cycle();
      this.paintCek();
    }

    rerenderSection() {
      const y = window.scrollY;
      this.render();
      window.scrollTo(0, y);
    }

    validateStep(i) {
      const s = this.sections[i];
      const err = App.validateSection(s, this.data);
      // hapus error lama bagian ini
      s.fields.forEach(f => { if (f.k) delete this.errors[f.k]; });
      if (i === 0 && this.cek && this.cek.ada && (this.mode === 'baru' || this.mode === 'adminBaru')) err.Bulan = 'Laporan periode ini sudah ada — gunakan koreksi';
      if (i === 0 && this.cek && this.cek.terkunci && this.cek.tutupBaru && this.mode === 'baru') err.Bulan = 'Periode ini sudah ditutup admin';
      Object.assign(this.errors, err);
      return Object.keys(err);
    }

    focusFirstError() {
      const first = this.root.querySelector('.field.invalid');
      if (first) {
        first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const inp = first.querySelector('input,select,textarea,button');
        if (inp) setTimeout(() => inp.focus({ preventScroll: true }), 250);
      }
    }

    next() {
      this._triedNext = true;
      const bad = this.validateStep(this.step);
      if (bad.length) { this.rerenderSection(); this.focusFirstError(); return; }
      this.goto(this.step + 1);
    }

    goto(i, back) {
      if (i < 0) return;
      if (i >= this.total) {
        // validasi semua sebelum pratinjau
        for (let s = 0; s < this.total; s++) {
          if (this.validateStep(s).length) {
            this.step = s;
            this.render();
            this.focusFirstError();
            App.toast('Masih ada isian wajib di bagian "' + this.sections[s].judul + '".', 'warn');
            return;
          }
        }
        i = this.total;
      }
      this.step = i;
      this.saveDraft();
      this.render();
      const top = this.root.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({ top: back ? 0 : Math.max(0, top), behavior: 'auto' });
    }

    async clear() {
      if (this.admin) { this.exit(); return; }
      const ok = await App.confirm({ title: 'Bersihkan formulir?', message: 'Semua isian laporan yang belum terkirim akan dihapus. Lanjutkan?', ok: 'Iya, bersihkan', cancel: 'Tidak', danger: true });
      if (!ok) return;
      const keep = this.mode === 'koreksi' ? { KelompokID: this.data.KelompokID, Bulan: this.data.Bulan, Tahun: this.data.Tahun } : {};
      this.data = Object.assign(defaults(), keep);
      this.errors = {};
      this.step = 0;
      this.cek = null;
      this.clearDraft();
      this.savedAt = null;
      this.render();
      App.toast('Formulir dibersihkan.', 'info');
    }

    async exit() {
      const ok = await App.confirm({
        title: this.admin ? 'Tutup formulir?' : 'Kembali ke Menu Utama?',
        message: this.admin ? 'Perubahan yang belum disimpan akan hilang.' : (this.o.draftKey ? 'Isian Anda tetap tersimpan sebagai draf di perangkat ini.' : 'Perubahan koreksi yang belum disimpan akan hilang.'),
        ok: 'Iya', cancel: 'Tidak',
      });
      if (ok && this.o.onExit) this.o.onExit();
    }

    async submit(btn) {
      for (let s = 0; s < this.total; s++) {
        if (this.validateStep(s).length) { this.goto(s); this.focusFirstError(); return; }
      }
      App.busy(btn, true);
      try {
        await this.o.onSubmit(Object.assign({}, this.data), this);
      } finally {
        if (btn.isConnected) App.busy(btn, false);
      }
    }
  }

  App.LaporanForm = LaporanForm;
})();
