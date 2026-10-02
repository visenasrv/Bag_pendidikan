/* ==========================================================================
   app.js — titik mulai aplikasi
   ========================================================================== */
(function () {
  'use strict';
  const App = window.App;

  App.store.init();
  window.addEventListener('hashchange', App.render);
  App.render();

  // Lanjutkan antrean sinkron yang tertunda (mis. halaman sempat ditutup)
  if (App.auth.valid() && App.store.queue.length) App.store.pump();

  // Pemanasan di latar: server Apps Script & pustaka yang sering dipakai
  App.idle(() => {
    if (!App.api.configured()) return;
    if (App.path().indexOf('/admin') === 0 && App.auth.valid()) {
      App.lib('chart').catch(() => {});
      App.lib('jspdf').catch(() => {});
    } else {
      App.data.config().catch(() => {});
    }
  });

  // Saat tab kembali aktif, segarkan data admin diam-diam
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && App.auth.valid() && App.path().indexOf('/admin') === 0) {
      App.store.refresh().catch(() => {});
      if (App.store.queue.length) App.store.pump();
    }
  });
})();
