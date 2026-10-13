/* ==========================================================================
   app.js — titik mulai aplikasi
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;

  // Prinsip 8: bangunkan server Apps Script SEGERA (paralel dengan render pertama),
  // supaya panggilan data pertama tidak menanggung cold start sendirian.
  App.api.warmUp();

  App.store.init();
  window.addEventListener('hashchange', App.render);
  App.render();

  // Lanjutkan antrean sinkron yang tertunda (mis. halaman sempat ditutup)
  if (App.auth.valid() && App.store.queue.length) App.loadAdmin().then(() => App.store.pump()).catch(() => {});

  // Pemanasan di latar
  App.idle(() => {
    if (!App.api.configured()) return;
    if (App.auth.valid()) {
      // perangkat admin: siapkan modul admin + pustaka grafik/PDF lebih awal
      App.loadAdmin().catch(() => {});
      App.lib('chart').catch(() => {});
      App.lib('jspdf').catch(() => {});
    } else {
      App.data.config().catch(() => {});
    }
  });

  // Tautan "Masuk Admin": mulai unduh modul admin begitu jari menyentuh tombol
  document.addEventListener('pointerdown', e => {
    const a = e.target.closest && e.target.closest('a[href^="#/admin"]');
    if (a) App.loadAdmin().catch(() => {});
  }, { passive: true });

  // Kembali dari latar belakang: bangunkan server (> 2 menit) & segarkan data admin diam-diam
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 120000) App.api.warmUp();
    if (App.auth.valid() && App.path().indexOf('/admin') === 0) {
      App.store.refresh().catch(() => {});
      if (App.store.queue.length) App.store.pump();
    }
  });
})();
