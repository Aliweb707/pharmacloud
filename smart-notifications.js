/* ============================================
   PHARMACLOUD - SMART NOTIFICATIONS
   Intelligent alerts — Session-gated
   ============================================ */
'use strict';

// 🔒 Prevent double-load
if (window.__PC_SMART_NOTIFICATIONS_LOADED__) {
  console.log('[Smart Notifications] ⏸️ Already loaded — skipping');
} else {
  window.__PC_SMART_NOTIFICATIONS_LOADED__ = true;

  (function() {

    var escapeHtml = window.escapeHtml || function(s) {
      if (s == null) return '';
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };

    var SN = {
      permission: 'default',
      enabled: true,
      lastCheck: null,
      lastAlerts: {}
    };

    /* ============================================
       SESSION GUARD
       ============================================ */
    function isLoggedIn() {
      try {
        var session = null;
        if (typeof DB !== 'undefined' && DB.getSession) {
          session = DB.getSession();
        }
        return !!(session && session.tenantId);
      } catch (e) {
        return false;
      }
    }

    /* ============================================
       PERMISSION
       ============================================ */
    function requestPermission() {
      if (!('Notification' in window)) return;

      if (Notification.permission === 'granted') {
        SN.permission = 'granted';
        return;
      }
      if (Notification.permission === 'denied') {
        SN.permission = 'denied';
        return;
      }

      Notification.requestPermission().then(function(p) {
        SN.permission = p;
        if (p === 'granted') {
          if (typeof Utils !== 'undefined') Utils.toast('✅ الإشعارات مفعّلة', 'success');
        }
      });
    }

    /* ============================================
       SEND NOTIFICATION — GATED
       ============================================ */
    function send(title, body, options) {
      options = options || {};
      if (!SN.enabled) return;

      // ✅ Only send if logged in
      if (!isLoggedIn()) {
        console.log('[Notif] ⏸️ Skipped — not logged in');
        return;
      }

      showInAppAlert(title, body, options);

      if (SN.permission === 'granted' && !document.hasFocus()) {
        try {
          var notif = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">' +
              '<rect width="96" height="96" rx="20" fill="' + (options.color || '%2300b884') + '"/>' +
              '<text x="48" y="64" font-size="48" fill="white" text-anchor="middle">' + (options.emoji || '💊') + '</text>' +
              '</svg>'
            ),
            tag: options.tag || 'pc-' + Date.now(),
            dir: 'rtl',
            lang: 'ar',
            vibrate: [200, 100, 200],
            requireInteraction: options.requireInteraction || false
          });
          notif.onclick = function() {
            window.focus();
            notif.close();
            if (options.onClick) options.onClick();
          };
        } catch (e) {
          console.warn('[Notif] Failed:', e);
        }
      }
    }

    /* ============================================
       IN-APP ALERT
       ============================================ */
    function showInAppAlert(title, body, options) {
      var container = document.getElementById('liveAlertsContainer');
      if (!container) {
        container = document.createElement('div');
        container.id = 'liveAlertsContainer';
        container.style.cssText = 'position:fixed;top:0;inset-inline-end:0;z-index:10000;padding:24px;pointer-events:none';
        document.body.appendChild(container);
      }

      var alert = document.createElement('div');
      alert.className = 'live-alert';
      alert.style.pointerEvents = 'auto';
      alert.style.borderInlineStartColor = options.color || '#00b884';

      var h = '';
      h += '<div class="live-alert-icon" style="background:' + (options.color || '#00b884') + '">';
      h += '<i class="fas ' + (options.icon || 'fa-bell') + '"></i>';
      h += '</div>';
      h += '<div class="live-alert-body">';
      h += '<strong>' + escapeHtml(title) + '</strong>';
      h += '<p>' + escapeHtml(body) + '</p>';
      h += '</div>';
      h += '<button class="live-alert-close" onclick="this.parentElement.remove()">';
      h += '<i class="fas fa-times"></i>';
      h += '</button>';

      alert.innerHTML = h;
      container.appendChild(alert);

      setTimeout(function() {
        alert.classList.add('closing');
        setTimeout(function() { alert.remove(); }, 300);
      }, options.duration || 6000);
    }

    /* ============================================
       SMART CHECKS
       ============================================ */
    function shouldAlert(key, cooldownMs) {
      var last = SN.lastAlerts[key] || 0;
      if (Date.now() - last < (cooldownMs || 3600000)) return false;
      SN.lastAlerts[key] = Date.now();
      try {
        localStorage.setItem('pc_notif_' + key, SN.lastAlerts[key].toString());
      } catch (e) {}
      return true;
    }

    function loadAlerts() {
      try {
        var keys = ['lowStock', 'expiry', 'noSales', 'bigOrder', 'newCustomer'];
        keys.forEach(function(k) {
          var v = localStorage.getItem('pc_notif_' + k);
          if (v) SN.lastAlerts[k] = parseInt(v);
        });
      } catch (e) {}
    }

    /* ============================================
       CHECK 1: LOW STOCK
       ============================================ */
    function checkLowStock() {
      if (!isLoggedIn()) return;
      try {
        if (typeof PH === 'undefined' || !PH.getProducts) return;
        var products = PH.getProducts() || [];
        var low = products.filter(function(p) { return p.stock > 0 && p.stock <= p.minStock; });
        var out = products.filter(function(p) { return p.stock === 0; });

        if (out.length > 0 && shouldAlert('lowStock', 4 * 3600000)) {
          send('🚨 منتجات نفدت', out.length + ' منتج نفد من المخزون: ' + out.slice(0, 3).map(function(p) { return p.name; }).join('، '), {
            color: '#dc2626',
            icon: 'fa-exclamation-triangle',
            emoji: '🚨',
            tag: 'low-stock-out',
            onClick: function() { if (PH.switchPage) PH.switchPage('products'); }
          });
        } else if (low.length >= 3 && shouldAlert('lowStockWarn', 8 * 3600000)) {
          send('⚠️ مخزون منخفض', low.length + ' منتج قارب على النفاد', {
            color: '#f59e0b',
            icon: 'fa-box-open',
            emoji: '⚠️'
          });
        }
      } catch (e) {}
    }

    /* ============================================
       CHECK 2: EXPIRY
       ============================================ */
    function checkExpiry() {
      if (!isLoggedIn()) return;
      try {
        if (typeof PH === 'undefined' || !PH.tenantId) return;
        if (typeof FEFO === 'undefined') return;

        var data = FEFO.analyze(PH.tenantId);
        var critical = data.critical.length + data.expired.length;

        if (critical > 0 && shouldAlert('expiry', 6 * 3600000)) {
          var msg = data.expired.length > 0
            ? data.expired.length + ' منتج منتهي'
            : critical + ' منتج قارب على الانتهاء';
          send('⏰ تنبيه صلاحية', msg + ' — قيمة ' + Math.round(data.atRiskValue).toLocaleString('en-US') + ' ج.م', {
            color: '#dc2626',
            icon: 'fa-hourglass-half',
            emoji: '⏰',
            tag: 'expiry-alert',
            onClick: function() { if (PH.switchPage) PH.switchPage('expiry'); }
          });
        }
      } catch (e) {}
    }

    /* ============================================
       CHECK 3: PEAK HOUR
       ============================================ */
    function checkPeakHour() {
      if (!isLoggedIn()) return;
      var hour = new Date().getHours();
      if (hour !== 19) return;
      if (!shouldAlert('peakHour', 24 * 3600000)) return;

      send('🕐 وقت الذروة', 'ابدأ من الآن — الصيدليات في مصر بتزحم من 8 لـ 11 مساءً', {
        color: '#FF6B35',
        icon: 'fa-clock',
        emoji: '🕐',
        duration: 8000
      });
    }

    /* ============================================
       CHECK 4: NO SALES
       ============================================ */
    function checkNoSales() {
      if (!isLoggedIn()) return;
      try {
        if (typeof PH === 'undefined' || !PH.getOrders) return;
        var orders = PH.getOrders() || [];
        var today = new Date().toDateString();
        var todayOrders = orders.filter(function(o) {
          return new Date(o.createdAt).toDateString() === today;
        });

        var hour = new Date().getHours();
        if (todayOrders.length === 0 && hour >= 14 && hour < 22) {
          if (shouldAlert('noSales', 2 * 3600000)) {
            send('📊 لا توجد مبيعات اليوم', 'لسه مفيش أي طلب — راجع المخزون أو اطلب من مساعدك AI نصائح', {
              color: '#1E88E5',
              icon: 'fa-chart-line',
              emoji: '📊'
            });
          }
        }
      } catch (e) {}
    }

    /* ============================================
       CHECK 5: BIG SALE
       ============================================ */
    function checkBigSale(order) {
      if (!isLoggedIn()) return;
      if (!order || !order.total) return;
      if (order.total < 500) return;

      send('🎉 بيعة كبيرة!', 'طلب بقيمة ' + Math.round(order.total).toLocaleString('en-US') + ' ج.م من ' + (order.customerName || 'عميل'), {
        color: '#10b981',
        icon: 'fa-trophy',
        emoji: '🎉',
        tag: 'big-sale-' + order.id,
        duration: 5000
      });
    }

    /* ============================================
       CHECK 6: NEW CUSTOMER
       ============================================ */
    function checkNewCustomer(customer) {
      if (!isLoggedIn()) return;
      if (!customer) return;
      if (shouldAlert('newCustomer-' + customer.id, 86400000)) {
        send('👋 عميل جديد', 'مرحباً بـ ' + customer.name + ' في صيدليتك!', {
          color: '#7c3aed',
          icon: 'fa-user-plus',
          emoji: '👋',
          duration: 5000
        });
      }
    }

    /* ============================================
       CHECK 7: AFTER-HOURS
       ============================================ */
    function checkAfterHours() {
      if (!isLoggedIn()) return;
      var hour = new Date().getHours();
      var isAfter = hour >= 22 || hour < 6;
      if (!isAfter) return;

      var today = new Date().toDateString();
      if (sessionStorage.getItem('pc_after_hours') === today) return;
      sessionStorage.setItem('pc_after_hours', today);

      send('🌙 ليلة هادئة', 'أنت تعمل خارج ساعات الذروة — وقت مثالي للمراجعة والتقارير', {
        color: '#1e293b',
        icon: 'fa-moon',
        emoji: '🌙',
        duration: 5000
      });
    }

    /* ============================================
       PERIODIC CHECKER — SESSION GATED ✅
       ============================================ */
    function startPeriodicChecks() {
      // 🔒 Guard: only if logged in
      if (!isLoggedIn()) {
        console.log('[Smart Notifications] ⏸️ Not logged in — periodic checks paused');
        return;
      }

      // Initial check after load (only if logged in)
      setTimeout(function() {
        if (!isLoggedIn()) return;
        checkLowStock();
        checkExpiry();
        checkAfterHours();
      }, 8000);

      // Every 15 minutes — re-check session each time
      setInterval(function() {
        if (!isLoggedIn()) return;
        checkLowStock();
        checkExpiry();
        checkPeakHour();
        checkNoSales();
      }, 15 * 60 * 1000);

      console.log('[Smart Notifications] ✅ Periodic checks started (logged in)');
    }

    /* ============================================
       PUBLIC API
       ============================================ */
    window.SmartNotifications = {
      request: requestPermission,
      send: send,
      enable: function() { SN.enabled = true; },
      disable: function() { SN.enabled = false; },
      isEnabled: function() { return SN.enabled; },
      isLoggedIn: isLoggedIn,
      checkNow: function() {
        if (!isLoggedIn()) return;
        checkLowStock();
        checkExpiry();
        checkNoSales();
      },
      notifySale: checkBigSale,
      notifyCustomer: checkNewCustomer,
      notifyLowStock: checkLowStock,
      notifyExpiry: checkExpiry,
      test: function() {
        send('✅ اختبار الإشعارات', 'الإشعارات تعمل بنجاح! 🎉', {
          color: '#10b981',
          icon: 'fa-check-circle',
          emoji: '✅'
        });
      }
    };

    /* ============================================
       INIT
       ============================================ */
    loadAlerts();

    function init() {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          SN.permission = 'granted';
        } else if (Notification.permission === 'denied') {
          SN.permission = 'denied';
        } else {
          SN.permission = 'default';
          // Request permission only if logged in
          setTimeout(function() {
            if (isLoggedIn()) requestPermission();
          }, 20000);
        }
      }

      // Start checks — will be skipped if not logged in
      startPeriodicChecks();

      // Re-check every 30 seconds to auto-start when user logs in
      var _watchLoggedIn = setInterval(function() {
        if (isLoggedIn()) {
          var _started = sessionStorage.getItem('pc_notif_started');
          if (!_started) {
            sessionStorage.setItem('pc_notif_started', '1');
            startPeriodicChecks();
            clearInterval(_watchLoggedIn);
          }
        }
      }, 30000);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    console.log('[Smart Notifications] Loaded ✓ — session-gated');
  })();
}