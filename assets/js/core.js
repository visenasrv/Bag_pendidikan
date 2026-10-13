/* ==========================================================================
   core.js — fondasi aplikasi: utilitas, API, cache SWR, router SPA, UI,
   tema, logo, dan Store admin (optimistic UI + antrean sinkron latar).
   ========================================================================== */
(function () {
  'use strict';
  const App = (window.App = window.App || {});

  // ───────────────────────── Utilitas ─────────────────────────
  App.BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  App.BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  App.TZ = 'Asia/Makassar';

  const $ = (s, el) => (el || document).querySelector(s);
  const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  App.$ = $; App.$$ = $$;

  App.esc = function (s) {
    return String(s === undefined || s === null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };
  const esc = App.esc;

  App.html = function (str) {
    const t = document.createElement('template');
    t.innerHTML = str.trim();
    return t.content.firstElementChild;
  };

  App.uuid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_, i) => { b[i] = Math.random() * 256; });
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  };

  const KODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  App.genKode = function () {
    const b = new Uint8Array(6);
    crypto.getRandomValues(b);
    return Array.from(b, x => KODE_CHARS[x % KODE_CHARS.length]).join('');
  };

  App.debounce = function (fn, ms) {
    let t;
    return function () { const a = arguments, c = this; clearTimeout(t); t = setTimeout(() => fn.apply(c, a), ms); };
  };
  App.sleep = ms => new Promise(r => setTimeout(r, ms));
  App.num = v => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? 0 : Number(v));
  App.fmtNum = v => new Intl.NumberFormat('id-ID').format(App.num(v));

  // localStorage aman (mode privat / kuota penuh tidak membuat aplikasi rusak)
  App.ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? (d === undefined ? null : d) : JSON.parse(v); } catch (e) { return d === undefined ? null : d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* abaikan */ } },
  };

  // ───────────────────────── Tanggal & waktu (WITA) ─────────────────────────
  const dtf = new Intl.DateTimeFormat('id-ID', { timeZone: App.TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  App.partsWita = function (d) {
    const o = {};
    dtf.formatToParts(d).forEach(p => { o[p.type] = p.value; });
    return { y: +o.year, m: +o.month, d: +o.day, hh: (o.hour === '24' ? '00' : o.hour), mm: o.minute };
  };
  App.nowWita = () => App.partsWita(new Date());
  App.fmtWaktu = function (iso, opt) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d)) return String(iso);
    const p = App.partsWita(d);
    const tgl = p.d + ' ' + App.BULAN_PENDEK[p.m - 1] + (opt && opt.noYear ? '' : ' ' + p.y);
    return tgl + ', ' + p.hh + ':' + p.mm + (opt && opt.wita ? ' WITA' : '');
  };
  App.fmtTanggal = function (ymd, pendek) {
    const m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return ymd || '—';
    return (+m[3]) + ' ' + (pendek ? App.BULAN_PENDEK : App.BULAN)[+m[2] - 1] + ' ' + m[1];
  };
  App.today = function () {
    const p = App.nowWita();
    return p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0');
  };
  App.periode = (b, t) => (App.BULAN[(+b) - 1] || '') + ' ' + t;
  /** Default periode = bulan lalu (bulan kegiatan yang sudah penuh) */
  App.bulanLalu = function () {
    const p = App.nowWita();
    return p.m === 1 ? { bulan: 12, tahun: p.y - 1 } : { bulan: p.m - 1, tahun: p.y };
  };
  App.tahunList = function () {
    const y = App.nowWita().y;
    const a = [];
    for (let t = y + 1; t >= y - 4; t--) a.push(t);
    return a;
  };

  // ───────────────────────── Ikon (SVG garis) ─────────────────────────
  const I = {
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    unlock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    settings: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    plus: '<path d="M5 12h14M12 5v14"/>',
    plusCircle: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
    trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    chevR: '<path d="m9 18 6-6-6-6"/>', chevL: '<path d="m15 18-6-6 6-6"/>',
    chevD: '<path d="m6 9 6 6 6-6"/>', chevU: '<path d="m18 15-6-6-6 6"/>',
    arrowL: '<path d="m12 19-7-7 7-7M19 12H5"/>', arrowR: '<path d="M5 12h14M12 5l7 7-7 7"/>',
    arrowUR: '<path d="M7 7h10v10M7 17 17 7"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8M12 17v4"/>',
    key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    calCheck: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>',
    alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/>',
    cap: '<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    fileEdit: '<path d="M4 13.5V4a2 2 0 0 1 2-2h8.5L20 7.5V20a2 2 0 0 1-2 2h-5.5"/><path d="M14 2v6h6M10.42 12.61a2.1 2.1 0 1 1 2.97 2.97L7.95 21 4 22l.99-3.95 5.43-5.44Z"/>',
    fileCheck: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    bar: '<path d="M3 3v18h18M7 16v-4M12 16V8M17 16v-7"/>',
    grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
    book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    userCheck: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m16 11 2 2 4-4"/>',
    userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
    cloudCheck: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/><path d="m9 13.5 2 2 4-4"/>',
    cloudOff: '<path d="m2 2 20 20M5.78 5.78A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.31-.2M21.53 16.1A4.5 4.5 0 0 0 17.5 10h-1.79A7 7 0 0 0 9.06 5.04"/>',
    present: '<path d="M2 3h20M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3M7 21l5-5 5 5"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-10 5L2 7"/>',
    flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/>',
    eraser: '<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21M22 21H7M5 11l9 9"/>',
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    listCheck: '<path d="M11 6h10M11 12h10M11 18h10M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
    mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3"/>',
    sparkle: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54z"/>',
    reply: '<path d="M9 17l-5-5 5-5"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4M12 14h.01"/>',
    printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
  };
  App.icon = function (name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || I.info) + '</svg>';
  };
  const icon = App.icon;

  // ───────────────────────── API (fetch → Apps Script) ─────────────────────────
  class ApiError extends Error {
    constructor(message, code, network) { super(message); this.code = code || 'ERR'; this.network = !!network; }
  }
  App.ApiError = ApiError;

  const GET_ACTIONS = { ping: 1, getConfig: 1, getLogos: 1, cekLaporan: 1, getDashboardPublik: 1, getNotulenList: 1, getNotulen: 1 };

  // ── Prinsip 0: pengukur. Ketik Perf.table() di Console browser untuk melihat 30 panggilan terakhir ──
  const Perf = (window.Perf = {
    rows: [],
    add(action, total, server, tries) {
      this.rows.push({ aksi: action, total_ms: total, server_ms: server == null ? null : server, jaringan_ms: server == null ? null : total - server, coba: tries || 1, jam: new Date().toLocaleTimeString('id-ID') });
      if (this.rows.length > 200) this.rows.shift();
    },
    table() { console.table(this.rows.slice(-30)); },
  });

  /** Aksi baca: aman diulang otomatis. Aksi lain = tulis → membawa reqId (aman diulang tanpa data ganda). */
  const READ_ACTIONS = {
    ping: 1, getConfig: 1, getLogos: 1, cekLaporan: 1, getDashboardPublik: 1, getNotulenList: 1, getNotulen: 1,
    bukaKoreksi: 1, login: 1, logout: 1, cekSesi: 1, getAdminBundle: 1, getDashboardAdmin: 1, listLaporan: 1, getPeserta: 1,
  };
  App.isRead = a => !!READ_ACTIONS[a];
  App.reqId = () => App.uuid();

  function waitOnline(ms) {
    return new Promise(r => {
      if (navigator.onLine !== false) return r();
      const done = () => { clearTimeout(t); window.removeEventListener('online', done); r(); };
      const t = setTimeout(done, ms);
      window.addEventListener('online', done);
    });
  }

  App.api = {
    url() { return ((window.APP_CONFIG || {}).API_URL || '').trim(); },
    configured() { const u = this.url(); return !!u && !/TEMPEL_ID/i.test(u); },

    /** Satu percobaan. Tidak pernah melempar: selalu {ok,...}; kegagalan jaringan ditandai retryable. */
    async _once(url, init, timeoutMs) {
      const ctl = window.AbortController ? new AbortController() : null;
      const t = ctl ? setTimeout(() => ctl.abort(), timeoutMs) : null;
      try {
        const res = await fetch(url, Object.assign({ cache: 'no-store', redirect: 'follow', signal: ctl ? ctl.signal : undefined }, init));
        const text = await res.text();
        try { return JSON.parse(text); } catch (e) {
          return { ok: false, network: true, retryable: res.status >= 500 || res.status === 429 || res.status === 0, code: 'FORMAT',
            message: 'Server membalas dengan format tidak dikenal (HTTP ' + res.status + '). Pastikan URL Web App benar & akses "Siapa saja".' };
        }
      } catch (e) {
        const aborted = e && e.name === 'AbortError';
        return { ok: false, network: true, retryable: true, code: 'NET',
          message: aborted ? 'Server terlalu lama merespons. Periksa sinyal internet lalu coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
      } finally { if (t) clearTimeout(t); }
    },

    /**
     * Prinsip 8: baca → hingga 3× (25 dtk lalu 40 dtk) dengan jeda bertahap & menunggu online.
     * Tulis → membawa reqId; diulang 1× bila jaringan putus (server mengembalikan hasil yang sama).
     * Mengembalikan respons mentah {ok, data, message, code, ms}.
     */
    async raw(action, data, opt) {
      if (!this.configured()) return { ok: false, code: 'CONFIG', message: 'URL server (API_URL) belum diatur di config.js.' };
      opt = opt || {};
      const read = App.isRead(action);
      const reqId = read ? '' : (opt.reqId || App.reqId());
      const tries = opt.tries || (read ? 3 : 2);
      let url = this.url(), init;
      if (GET_ACTIONS[action] && !opt.token && !opt.post) {
        url += (url.indexOf('?') >= 0 ? '&' : '?') + 'action=' + encodeURIComponent(action);
        if (data) url += '&data=' + encodeURIComponent(JSON.stringify(data));
        init = { method: 'GET' };
      } else {
        init = {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // text/plain → tanpa CORS preflight
          body: JSON.stringify({ action: action, data: data || {}, token: opt.token || undefined, reqId: reqId || undefined }),
        };
      }
      const t0 = performance.now();
      let r, i = 0;
      for (; i < tries; i++) {
        if (i) { await App.sleep(1200 * i); if (navigator.onLine === false) await waitOnline(15000); }
        r = await this._once(url, init, opt.timeout || (read ? (i ? 40000 : 25000) : 90000));
        if (r.ok || !r.retryable) break;
      }
      Perf.add(action, Math.round(performance.now() - t0), r && r.ms, i + 1);
      return r;
    },

    /** Kembalikan `data`, atau lempar ApiError bila ok:false */
    async call(action, data, opt) {
      const r = await this.raw(action, data, opt);
      if (!r || !r.ok) throw new ApiError((r && r.message) || 'Terjadi kesalahan di server.', r && r.code, r && r.network);
      return r.data;
    },

    async admin(action, data, opt) {
      const r = await this.raw(action, data, Object.assign({ token: App.auth.token(), post: true }, opt || {}));
      if (r && r.code === 'AUTH') { App.auth.expired(); throw new ApiError(r.message, 'AUTH'); }
      if (!r || !r.ok) throw new ApiError((r && r.message) || 'Terjadi kesalahan di server.', r && r.code, r && r.network);
      return r.data;
    },

    /** Prinsip 8: bangunkan server Apps Script lebih awal (tanpa menunggu hasil) */
    warmUp() {
      if (!this.configured()) return;
      const u = this.url();
      fetch(u + (u.indexOf('?') >= 0 ? '&' : '?') + 'action=ping&_=' + Date.now(), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
    },
  };

  // Cache Stale-While-Revalidate: tampilkan data lokal seketika, perbarui diam-diam
  const inflight = {};
  App.swr = function (key, fetcher, onData, maxAgeMs) {
    const c = App.ls.get('swr_' + key);
    if (c && onData) onData(c.d, true);
    if (c && Date.now() - c.t < (maxAgeMs || 30000)) return Promise.resolve(c.d);
    if (!inflight[key]) {
      inflight[key] = fetcher().then(d => {
        App.ls.set('swr_' + key, { t: Date.now(), d: d });
        return d;
      }).finally(() => { delete inflight[key]; });
    }
    return inflight[key].then(d => {
      if (onData && (!c || JSON.stringify(c.d) !== JSON.stringify(d))) onData(d, false);
      return d;
    }).catch(e => { if (!c) throw e; return c.d; });
  };
  App.swrPeek = key => { const c = App.ls.get('swr_' + key); return c ? c.d : null; };
  App.swrBust = key => App.ls.del('swr_' + key);

  // ── Pemeriksa versi server: memperingatkan bila Web App belum di-deploy "Versi baru" ──
  App.SERVER_MIN = '1.3.0';
  const verNum = v => String(v || '0').split('.').map(n => parseInt(n, 10) || 0).reduce((a, n) => a * 1000 + n, 0);
  App.cekVersi = function (v) {
    const lama = verNum(v) < verNum(App.SERVER_MIN);
    let el = document.getElementById('ver-warn');
    if (!lama) { if (el) el.remove(); return true; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'ver-warn';
      el.className = 'ver-warn';
      document.body.appendChild(el);
    }
    el.innerHTML = icon('alert') + '<div><b>Server belum diperbarui (versi ' + esc(v || 'lama') + ', butuh ' + App.SERVER_MIN + ').</b> Data bisa tampil tidak lengkap. ' +
      'Buka Apps Script → <b>Terapkan → Kelola deployment → ✏️ Edit → Versi baru → Terapkan</b>, lalu muat ulang halaman ini.</div>' +
      '<button class="icon-btn" aria-label="Tutup" onclick="this.parentNode.remove()">' + icon('x') + '</button>';
    return false;
  };

  // Data publik bersama
  App.data = {
    config(onData) {
      return App.swr('cfg', () => App.api.call('getConfig'), d => { App.cekVersi(d && d.versi); if (onData) onData(d); }, 60000);
    },
    dash(tahun, onData) { return App.swr('dash_' + tahun, () => App.api.call('getDashboardPublik', { tahun: tahun }), onData, 20000); },
    notulen(onData) { return App.swr('notulen', () => App.api.call('getNotulenList'), onData, 20000); },
  };

  // ───────────────────────── Router SPA (hash) ─────────────────────────
  const routes = [];
  let cleanups = [];
  App.viewId = 0;
  App.route = function (pattern, handler) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\//g, '\\/').replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '\\/?$');
    routes.push({ re: re, keys: keys, handler: handler });
  };
  App.go = function (path, replace) {
    const h = '#' + path;
    if (location.hash === h) { App.render(); return; }
    if (replace) location.replace(h); else location.hash = h;
  };
  App.path = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
  App.onLeave = fn => { cleanups.push(fn); };
  App.alive = id => id === App.viewId;
  // ── Prinsip 9: kode admin (±28 KB gzip) hanya diunduh saat halaman admin dibuka ──
  App.ASSET_V = (document.querySelector('script[src*="core.js"]') || { src: '' }).src.split('v=')[1] || '';
  const ADMIN_JS = ['admin', 'hadir', 'musyawaroh', 'pengaturan'];
  let adminP = null;
  App.loadAdmin = function () {
    if (App.admin) return Promise.resolve(true);
    if (adminP) return adminP;
    adminP = new Promise((res, rej) => {
      let left = ADMIN_JS.length;
      ADMIN_JS.forEach(n => {
        const s = document.createElement('script');
        s.src = 'assets/js/' + n + '.js' + (App.ASSET_V ? '?v=' + App.ASSET_V : '');
        s.async = false;                                   // urutan eksekusi tetap
        s.onload = () => { if (--left === 0) res(true); };
        s.onerror = () => { adminP = null; rej(new Error('Gagal memuat modul admin. Periksa koneksi lalu coba lagi.')); };
        document.head.appendChild(s);
      });
    });
    return adminP;
  };

  App.render = function () {
    const path = App.path();
    if (path.indexOf('/admin') === 0 && !App.admin) {
      const id0 = ++App.viewId;
      const v = $('#view');
      if (!v.querySelector('.adm')) v.innerHTML = '<div class="boot"><div class="boot-mark"></div><div class="boot-text">Membuka halaman admin…</div></div>';
      App.loadAdmin().then(() => { if (App.viewId === id0) App.render(); }).catch(e => {
        if (App.viewId !== id0) return;
        v.innerHTML = '<div class="setup-screen stack"><div class="notice err">' + icon('cloudOff') + '<div>' + esc(e.message) + '</div></div><button class="btn btn-primary" onclick="App.render()">' + icon('refresh') + ' Coba Lagi</button><a class="btn btn-ghost" href="#/">Kembali ke Beranda</a></div>';
      });
      return;
    }
    cleanups.forEach(fn => { try { fn(); } catch (e) { console.warn(e); } });
    cleanups = [];
    App.closeAllLayers();
    const id = ++App.viewId;
    for (const r of routes) {
      const m = path.match(r.re);
      if (m) {
        const params = {};
        r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); });
        try { r.handler(params, id); } catch (e) { console.error(e); App.toast('Terjadi kesalahan saat membuka halaman.', 'err'); }
        return;
      }
    }
    App.go('/', true);
  };
  /** Ganti isi #view (halaman publik) */
  App.mount = function (html, cls) {
    document.body.classList.remove('has-bottombar', 'with-actionbar');
    App.admin && App.admin.unmountShell && App.admin.unmountShell();
    const v = $('#view');
    v.className = 'view';
    v.innerHTML = '<div class="page ' + (cls || '') + '">' + html + '</div>';
    window.scrollTo(0, 0);
    return v.firstElementChild;
  };

  // ───────────────────────── UI: toast, modal, konfirmasi, overlay ─────────────────────────
  App.toast = function (msg, type, opt) {
    type = type || 'ok';
    opt = opt || {};
    const el = App.html('<div class="toast ' + type + '" role="status">' +
      icon(type === 'err' ? 'alertCircle' : (type === 'warn' ? 'alert' : (type === 'info' ? 'info' : 'checkCircle'))) +
      '<span>' + esc(msg) + '</span>' + (opt.action ? '<button class="act">' + esc(opt.action.label) + '</button>' : '') + '</div>');
    if (opt.action) el.querySelector('.act').onclick = () => { opt.action.fn(); el.remove(); };
    const box = $('#toasts');
    while (box.children.length >= 3) box.firstElementChild.remove();
    box.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .2s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 220); }, opt.ms || (type === 'err' ? 5200 : 2600));
  };

  const layers = [];
  App.closeAllLayers = function () { while (layers.length) layers.pop().close(true); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && layers.length && !document.querySelector('.present')) layers[layers.length - 1].close();
  });

  /** Modal umum. body = string HTML. Mengembalikan {el, close} */
  App.modal = function (o) {
    const back = App.html('<div class="backdrop"><div class="modal ' + (o.wide ? 'wide' : '') + '" role="dialog" aria-modal="true">' +
      '<div class="grabber"></div>' +
      (o.title ? '<div class="modal-head"><div class="grow"><h3>' + esc(o.title) + '</h3>' + (o.sub ? '<p class="muted" style="font-size:13px;margin-top:2px">' + esc(o.sub) + '</p>' : '') + '</div>' +
        '<button class="icon-btn" data-x aria-label="Tutup">' + icon('x') + '</button></div>' : '') +
      '<div class="modal-body">' + (o.body || '') + '</div>' +
      (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '') + '</div></div>');
    $('#layer').appendChild(back);
    const m = {
      el: back.firstElementChild,
      close(silent) {
        const i = layers.indexOf(m);
        if (i >= 0) layers.splice(i, 1);
        back.remove();
        if (!silent && o.onClose) o.onClose();
      },
    };
    layers.push(m);
    back.addEventListener('mousedown', e => { if (e.target === back && !o.sticky) m.close(); });
    back.querySelectorAll('[data-x]').forEach(b => { b.onclick = () => m.close(); });
    const f = back.querySelector('[autofocus]');
    if (f) setTimeout(() => f.focus(), 30);
    return m;
  };

  App.confirm = function (o) {
    return new Promise(resolve => {
      let done = false;
      const m = App.modal({
        title: o.title || 'Konfirmasi',
        body: '<div style="font-size:15px;line-height:1.55">' + (o.html || esc(o.message || '')) + '</div>',
        foot: '<button class="btn btn-soft" data-no>' + esc(o.cancel || 'Tidak') + '</button>' +
          '<button class="btn ' + (o.danger ? 'btn-danger-solid' : 'btn-primary') + '" data-yes autofocus>' + esc(o.ok || 'Iya') + '</button>',
        onClose: () => { if (!done) { done = true; resolve(false); } },
      });
      m.el.querySelector('[data-no]').onclick = () => { done = true; m.close(true); resolve(false); };
      m.el.querySelector('[data-yes]').onclick = () => {
        done = true;
        const extra = o.collect ? o.collect(m.el) : true;
        m.close(true);
        resolve(extra);
      };
    });
  };

  App.overlay = function (text) {
    const el = App.html('<div class="overlay"><div class="box"><div class="spinner"></div><b>' + esc(text || 'Memproses…') + '</b><small class="muted">Mohon tunggu, jangan tutup halaman ini.</small></div></div>');
    document.body.appendChild(el);
    return { set(t) { el.querySelector('b').textContent = t; }, close() { el.remove(); } };
  };

  App.busy = function (btn, on) {
    if (!btn) return;
    btn.classList.toggle('busy', !!on);
    btn.disabled = !!on;
  };

  App.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (er) { ok = false; }
      ta.remove();
      return ok;
    }
  };

  App.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  // ───────────────────────── Pemuat pustaka (lazy) ─────────────────────────
  const LIBS = {
    jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
    sortable: 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.15.2/Sortable.min.js',
  };
  const libP = {};
  App.lib = function (name) {
    if (libP[name]) return libP[name];
    libP[name] = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = LIBS[name]; s.async = true;
      s.onload = () => res(true);
      s.onerror = () => { delete libP[name]; rej(new Error('Gagal memuat pustaka ' + name + '. Periksa koneksi internet.')); };
      document.head.appendChild(s);
    });
    return libP[name];
  };
  App.idle = fn => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 900));

  // ───────────────────────── Tema ─────────────────────────
  App.theme = {
    mode() { try { return localStorage.getItem('mp_theme') === 'dark' ? 'dark' : 'light'; } catch (e) { return 'light'; } },
    set(m) {
      try { localStorage.setItem('mp_theme', m); } catch (e) { /* abaikan */ }
      this.apply();
    },
    apply() {
      const dark = this.mode() === 'dark';
      document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
      const meta = document.querySelector('meta[name=theme-color]');
      if (meta) meta.content = dark ? '#06382B' : '#064E3B';
      document.dispatchEvent(new CustomEvent('themechange'));
    },
    /** Terang ⇄ Gelap (v1.3: tanpa "ikuti perangkat") */
    cycle() {
      const next = this.mode() === 'dark' ? 'light' : 'dark';
      this.set(next);
      App.toast('Tema: ' + (next === 'dark' ? 'Gelap' : 'Terang'), 'info', { ms: 1200 });
    },
    isDark() { return document.documentElement.getAttribute('data-theme') === 'dark'; },
  };

  // ───────────────────────── Logo (cache lokal + sinkron) ─────────────────────────
  App.logo = {
    get(side) { const c = App.ls.get('mp_logo_' + side); return c && c.dataUrl ? c : null; },
    html(side, fallback) {
      const c = this.get(side);
      return '<span class="logo-circle" data-logo="' + side + '">' +
        (c ? '<img src="' + c.dataUrl + '" alt="Logo ' + side + '">' : icon(fallback || (side === 'kiri' ? 'landmark' : 'cap'), 'lg')) + '</span>';
    },
    paint() {
      $$('[data-logo]').forEach(el => {
        const side = el.getAttribute('data-logo');
        const c = App.logo.get(side);
        el.innerHTML = c ? '<img src="' + c.dataUrl + '" alt="Logo ' + side + '">' : icon(side === 'kiri' ? 'landmark' : 'cap', 'lg');
      });
    },
    /** Sinkronkan bila ID logo di server berbeda dengan cache */
    async sync(ids) {
      if (!ids) return;
      const need = ['kiri'].some(s => {
        const want = ids[s] || '';
        const have = (App.ls.get('mp_logo_' + s) || {}).id || '';
        return want !== have;
      });
      if (!need) return;
      try {
        const r = await App.api.call('getLogos');
        ['kiri', 'kanan'].forEach(s => {
          if (r[s] && r[s].dataUrl) App.ls.set('mp_logo_' + s, r[s]);
          else App.ls.del('mp_logo_' + s);
        });
        App.logo.paint();
      } catch (e) { /* logo tidak kritis */ }
    },
  };

  // ───────────────────────── Rekap generus ─────────────────────────
  App.totalGenerus = l => App.num(l.Jml_Caberawit) + App.num(l.Jml_Praremaja) + App.num(l.Jml_Remaja) + App.num(l.Jml_Pranikah);
  App.rekap = function (list) {
    const r = { caberawit: 0, praremaja: 0, remaja: 0, pranikah: 0, total: 0, mondok: 0, mubaligh: 0, mudamudi: 0 };
    list.forEach(l => {
      r.mudamudi += App.num(l.Jml_MudaMudi);
      r.caberawit += App.num(l.Jml_Caberawit);
      r.praremaja += App.num(l.Jml_Praremaja);
      r.remaja += App.num(l.Jml_Remaja);
      r.pranikah += App.num(l.Jml_Pranikah);
      r.mondok += App.num(l.Generus_Sedang_Mondok);
      r.mubaligh += App.num(l.Generus_Sudah_Mondok);
    });
    r.total = r.caberawit + r.praremaja + r.remaja + r.pranikah;
    return r;
  };

  // ───────────────────────── Sesi admin ─────────────────────────
  App.auth = {
    get() { const a = App.ls.get('mp_auth'); return a && a.token && a.exp > Date.now() ? a : null; },
    token() { const a = this.get(); return a ? a.token : ''; },
    valid() { return !!this.get(); },
    set(token, username, exp) { App.ls.set('mp_auth', { token: token, username: username, exp: exp || Date.now() + 8 * 3600e3 }); },
    clear() { App.ls.del('mp_auth'); },
    expired() {
      this.clear();
      if (App.path().indexOf('/admin') === 0 && App.path() !== '/admin/login') {
        App.toast('Sesi admin berakhir. Silakan masuk lagi.', 'warn');
        App.go('/admin/login?lanjut=' + encodeURIComponent(App.path()));
      }
    },
  };

  // ───────────────────────── Store admin: optimistic + antrean sinkron ─────────────────────────
  const Store = (App.store = {
    data: null,
    queue: [],
    subs: new Set(),
    mutSeq: 0,
    lastFetch: 0,
    fetching: null,
    pumping: false,
    callbacks: {},
    syncState: 'ok',

    init() {
      this.data = App.ls.get('mp_bundle');
      this.queue = App.ls.get('mp_queue', []);
      window.addEventListener('online', () => this.pump());
      window.addEventListener('beforeunload', e => {
        if (this.queue.length) { e.preventDefault(); e.returnValue = 'Masih ada perubahan yang sedang disimpan.'; }
      });
    },
    on(fn) { this.subs.add(fn); return () => this.subs.delete(fn); },
    emit() { this.subs.forEach(fn => { try { fn(this.data); } catch (e) { console.error(e); } }); },
    persist() { App.ls.set('mp_bundle', this.data); App.ls.set('mp_queue', this.queue.map(j => ({ id: j.id, action: j.action, data: j.data, label: j.label }))); },

    /** Ambil bundle terbaru di latar. Tidak menimpa perubahan lokal yang belum tersinkron. */
    refresh(force) {
      if (!App.auth.valid()) return Promise.resolve(this.data);
      if (this.fetching) return this.fetching;
      if (!force && this.data && Date.now() - this.lastFetch < 60000) return Promise.resolve(this.data);
      const seq = this.mutSeq;
      this.fetching = App.api.admin('getAdminBundle').then(d => {
        this.lastFetch = Date.now();
        App.cekVersi(d && d.versi);
        if (this.data && this.data.versi !== d.versi) {
          Object.keys(localStorage).filter(k => k.indexOf('swr_') === 0).forEach(k => App.ls.del(k));
        }
        if (!this.queue.length && seq === this.mutSeq) {
          const changed = JSON.stringify(d) !== JSON.stringify(this.data);
          this.data = d;
          this.persist();
          if (changed) this.emit();
        }
        return this.data;
      }).catch(e => {
        if (!this.data) throw e;
        if (e.network) this.setSync('offline');
        return this.data;
      }).finally(() => { this.fetching = null; });
      return this.fetching;
    },

    /**
     * Perubahan instan: terapkan ke data lokal (0 ms) → render → kirim ke server di latar.
     * @param {string} action  aksi API
     * @param {object} payload data yang dikirim
     * @param {function} apply fungsi yang mengubah this.data secara lokal
     * @param {object} opt {label, onOk(res)}
     */
    mutate(action, payload, apply, opt) {
      opt = opt || {};
      this.mutSeq++;
      if (apply && this.data) { apply(this.data); }
      const job = { id: App.uuid(), action: action, data: payload, label: opt.label || '' };   // job.id = reqId (idempoten)
      if (opt.onOk) this.callbacks[job.id] = opt.onOk;
      this.queue.push(job);
      this.persist();
      this.emit();
      this.setSync('busy');
      this.pump();
      return job.id;
    },

    async pump() {
      if (this.pumping) return;
      this.pumping = true;
      let backoff = 1500;
      let gagal = false;
      while (this.queue.length) {
        const job = this.queue[0];
        this.setSync('busy');
        // reqId = job.id → bila balasan hilang lalu dikirim ulang, server tidak menyimpan dua kali
        const r = await App.api.raw(job.action, job.data, { token: App.auth.token(), post: true, reqId: job.id });
        if (!r.ok && r.network) {
          // jaringan putus → tunggu & coba lagi, data lokal tetap aman
          this.setSync('offline');
          await App.sleep(backoff);
          backoff = Math.min(backoff * 2, 30000);
          if (navigator.onLine === false) { this.pumping = false; return; }
          continue;
        }
        backoff = 1500;
        if (r && r.code === 'AUTH') { this.pumping = false; this.setSync('err'); App.auth.expired(); return; }
        this.queue.shift();
        this.persist();
        if (r && r.ok) {
          const cb = this.callbacks[job.id];
          delete this.callbacks[job.id];
          if (cb) { try { cb(r.data); } catch (e) { console.error(e); } }
        } else {
          gagal = true;
          delete this.callbacks[job.id];
          App.toast((job.label ? job.label + ': ' : '') + ((r && r.message) || 'Gagal disimpan di server.'), 'err', { ms: 6500 });
        }
      }
      this.pumping = false;
      this.setSync(gagal ? 'err' : 'ok');
      // Rekonsiliasi dengan data server (mengembalikan perubahan yang ditolak)
      setTimeout(() => { if (!this.queue.length) this.refresh(true); }, gagal ? 50 : 1200);
    },

    setSync(s) {
      this.syncState = s;
      const el = document.getElementById('sync');
      if (!el) return;
      const map = {
        ok: ['ok', 'cloudCheck', 'Tersimpan'],
        busy: ['busy', 'refresh', 'Menyimpan…'],
        offline: ['err', 'cloudOff', 'Offline — menunggu'],
        err: ['err', 'alertCircle', 'Perlu dicek'],
      };
      const m = map[s] || map.ok;
      el.className = 'sync ' + m[0];
      el.innerHTML = icon(m[1]) + '<span>' + m[2] + '</span>';
      el.title = this.queue.length ? this.queue.length + ' perubahan menunggu dikirim' : 'Semua perubahan tersimpan · ketuk untuk memuat ulang data dari server';
      if (!el._bound) {
        el._bound = true;
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          if (this.queue.length) { this.pump(); return; }
          Object.keys(localStorage).filter(k => k.indexOf('swr_') === 0).forEach(k => App.ls.del(k));
          this.setSync('busy');
          this.refresh(true).then(() => { this.setSync('ok'); App.toast('Data terbaru dimuat dari server.'); this.emit(); })
            .catch(e => { this.setSync('err'); App.toast(e.message, 'err'); });
        });
      }
    },
  });

  // Helper akses data bundle
  App.B = {
    kelompok() { return ((Store.data && Store.data.kelompok) || []).slice().sort((a, b) => a.urutan - b.urutan); },
    kelompokById(id) { return this.kelompok().find(k => k.id === id) || null; },
    wajib() { return this.kelompok().filter(k => k.aktif && k.wajib); },
    laporan() { return (Store.data && Store.data.laporan) || []; },
    laporanPeriode(b, t) { return this.laporan().filter(l => +l.Bulan === +b && +l.Tahun === +t); },
    kunci(b, t) { return ((Store.data && Store.data.kunci) || []).find(k => +k.bulan === +b && +k.tahun === +t) || { terkunci: false, tutupBaru: false }; },
    notulen() { return (Store.data && Store.data.notulen) || []; },
    /** Tanggapan musyawaroh untuk satu laporan → {bidang: {isi, waktu, oleh}} */
    tanggapan(lapId) {
      const out = {};
      ((Store.data && Store.data.tanggapan) || []).forEach(t => { if (t.laporanId === lapId) out[t.bidang] = t; });
      return out;
    },
    peserta() { return (Store.data && Store.data.peserta) || []; },
    dapuan(kid) { return ((Store.data && Store.data.dapuan) || []).filter(d => d.kelompokId === kid).sort((a, b) => a.urutan - b.urutan); },
    set() { return (Store.data && Store.data.pengaturan) || {}; },
    namaKelompok(l) { const k = this.kelompokById(l.KelompokID); return k ? k.nama : l.NamaKelompok; },
  };

  // Periode bersama halaman admin
  App.periodeAktif = (function () {
    const saved = App.ls.get('mp_periode');
    return saved || App.bulanLalu();
  })();
  App.setPeriode = function (b, t) { App.periodeAktif = { bulan: +b, tahun: +t }; App.ls.set('mp_periode', App.periodeAktif); };

  App.bulanOptions = function (sel, withAll) {
    return (withAll ? '<option value="">Semua bulan</option>' : '') +
      App.BULAN.map((b, i) => '<option value="' + (i + 1) + '"' + (+sel === i + 1 ? ' selected' : '') + '>' + b + '</option>').join('');
  };
  App.tahunOptions = function (sel, withAll) {
    const list = App.tahunList();
    if (sel && list.indexOf(+sel) < 0) list.push(+sel);
    return (withAll ? '<option value="">Semua tahun</option>' : '') + list.sort((a, b) => b - a).map(t => '<option' + (+sel === t ? ' selected' : '') + '>' + t + '</option>').join('');
  };
})();
