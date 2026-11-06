/* ============================================
   PHARMACLOUD - PWA MANAGER
   Installation + Updates + Offline detection
   ============================================ */
'use strict';

(function() {

  var PWA = {
    registration: null,
    deferredPrompt: null,
    isInstalled: false,
    updateAvailable: false
  };

  /* ============================================
     REGISTER SERVICE WORKER
     ============================================ */
  function registerSW() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Worker not supported');
      return;
    }

    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(function(reg) {
        PWA.registration = reg;
        console.log('[PWA] ✅ Service Worker registered');

        // Check for updates
        reg.addEventListener('updatefound', function() {
          var newWorker = reg.installing;
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              PWA.updateAvailable = true;
              showUpdateBanner();
            }
          });
        });
      })
      .catch(function(err) {
        console.warn('[PWA] SW registration failed:', err);
      });
  }

  /* ============================================
     INSTALL PROMPT
     ============================================ */
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    PWA.deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', function() {
    console.log('[PWA] ✅ App installed');
    PWA.deferredPrompt = null;
    PWA.isInstalled = true;
    hideInstallBanner();
    if (typeof Utils !== 'undefined') Utils.toast('✅ تم تثبيت التطبيق', 'success');
  });

  /* ============================================
     BANNERS
     ============================================ */
  function showInstallBanner() {
    var existing = document.getElementById('pwaInstallBanner');
    if (existing) return;

    var html = 
      '<div id="pwaInstallBanner" class="pwa-banner pwa-install-banner">' +
        '<div class="pwa-banner-icon"><i class="fas fa-mobile-alt"></i></div>' +
        '<div class="pwa-banner-body">' +
          '<strong>ثبّت PharmaCloud على جهازك</strong>' +
          '<span>يعمل بدون إنترنت + إشعارات فورية</span>' +
        '</div>' +
        '<button class="pwa-banner-btn" onclick="PWA.install()">' +
          '<i class="fas fa-download"></i> تثبيت' +
        '</button>' +
        '<button class="pwa-banner-close" onclick="PWA.dismissInstall()">' +
          '<i class="fas fa-times"></i>' +
        '</button>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
  }

  function hideInstallBanner() {
    var el = document.getElementById('pwaInstallBanner');
    if (el) el.remove();
  }

  function showUpdateBanner() {
    var existing = document.getElementById('pwaUpdateBanner');
    if (existing) return;

    var html = 
      '<div id="pwaUpdateBanner" class="pwa-banner pwa-update-banner">' +
        '<div class="pwa-banner-icon"><i class="fas fa-sync-alt"></i></div>' +
        '<div class="pwa-banner-body">' +
          '<strong>تحديث متاح</strong>' +
          '<span>نسخة جديدة جاهزة للتثبيت</span>' +
        '</div>' +
        '<button class="pwa-banner-btn" onclick="PWA.update()">' +
          '<i class="fas fa-redo"></i> تحديث' +
        '</button>' +
      '</div>';

    document.body.insertAdjacentHTML('beforeend', html);
  }

  /* ============================================
     OFFLINE DETECTION
     ============================================ */
  function checkOnline() {
    var offline = !navigator.onLine;
    var banner = document.getElementById('offlineBanner');
    if (banner) banner.classList.toggle('show', offline);
  }

  window.addEventListener('online', checkOnline);
  window.addEventListener('offline', checkOnline);
  setTimeout(checkOnline, 1000);

  /* ============================================
     PUBLIC API
     ============================================ */
  window.PWA = {
    install: function() {
      if (!PWA.deferredPrompt) {
        if (typeof Utils !== 'undefined') Utils.toast('التثبيت غير متاح — استخدم قائمة المتصفح', 'info');
        return;
      }
      PWA.deferredPrompt.prompt();
      PWA.deferredPrompt.userChoice.then(function(choice) {
        if (choice.outcome === 'accepted') {
          console.log('[PWA] User accepted install');
        }
        PWA.deferredPrompt = null;
        hideInstallBanner();
      });
    },

    dismissInstall: function() {
      hideInstallBanner();
      try { sessionStorage.setItem('pc_pwa_dismissed', '1'); } catch (e) {}
    },

    update: function() {
      if (PWA.registration && PWA.registration.waiting) {
        PWA.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(function() { window.location.reload(); }, 500);
      }
    },

    isStandalone: function() {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    },

    clearCache: function() {
      if ('caches' in window) {
        caches.keys().then(function(names) {
          return Promise.all(names.map(function(name) { return caches.delete(name); }));
        }).then(function() {
          if (typeof Utils !== 'undefined') Utils.toast('تم مسح الكاش', 'success');
        });
      }
    }
  };

  /* ============================================
     INIT
     ============================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerSW);
  } else {
    registerSW();
  }

  // Hide install banner if dismissed
  try {
    if (sessionStorage.getItem('pc_pwa_dismissed') === '1') {
      setTimeout(hideInstallBanner, 100);
    }
  } catch (e) {}

  console.log('[PWA] Manager loaded');
})();