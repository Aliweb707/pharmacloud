/* ============================================
   PHARMACLOUD - ANALYTICS PRO v1.0
   GA4 + Custom Events + Funnels + Heatmaps + AI
   ============================================ */
'use strict';

(function() {
  if (window.__PC_ANALYTICS__) return;
  window.__PC_ANALYTICS__ = true;

  const AP = {
    config: {
      ga4MeasurementId: localStorage.getItem('pc_ga4_id') || '',
      ga4ApiSecret: localStorage.getItem('pc_ga4_secret') || '',
      enabled: localStorage.getItem('pc_analytics_enabled') !== 'false',
      trackSessionRecording: false,
      trackHeatmaps: false,
      trackScrollDepth: true,
      trackOutbound: true,
      sampleRate: 100
    },
    session: {
      id: 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
      startedAt: Date.now(),
      pageViews: 0,
      events: 0,
      lastActivity: Date.now()
    },
    userProperties: {},
    eventsQueue: JSON.parse(localStorage.getItem('pc_analytics_queue') || '[]'),
    isReady: false
  };

  /* ============================================
     1. LOAD GA4
     ============================================ */
  function loadGA4() {
    if (!AP.config.ga4MeasurementId) {
      console.warn('[Analytics] GA4 ID not set');
      return;
    }

    // Global tag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() { window.dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', AP.config.ga4MeasurementId, {
      send_page_view: false,
      anonymize_ip: true,
      cookie_flags: 'SameSite=None;Secure',
      custom_map: {
        dimension1: 'pharmacy_id',
        dimension2: 'user_role',
        dimension3: 'plan_type'
      }
    });

    // Load script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${AP.config.ga4MeasurementId}`;
    document.head.appendChild(script);

    AP.isReady = true;
    console.log('[Analytics] ✅ GA4 loaded:', AP.config.ga4MeasurementId);
  }

  /* ============================================
     2. TRACK PAGE VIEW
     ============================================ */
  function trackPageView(path, title) {
    if (!AP.config.enabled) return;

    path = path || window.location.pathname + window.location.hash;
    title = title || document.title;

    AP.session.pageViews++;
    AP.session.lastActivity = Date.now();

    if (window.gtag) {
      gtag('event', 'page_view', {
        page_path: path,
        page_title: title,
        page_location: window.location.href,
        session_id: AP.session.id
      });
    }

    queueEvent('page_view', { path, title });
    console.log('[Analytics] 📄 Page view:', path);
  }

  /* ============================================
     3. TRACK EVENT
     ============================================ */
  function trackEvent(eventName, params = {}) {
    if (!AP.config.enabled) return;
    if (AP.config.sampleRate < 100 && Math.random() * 100 > AP.config.sampleRate) return;

    AP.session.events++;
    AP.session.lastActivity = Date.now();

    const enriched = {
      session_id: AP.session.id,
      timestamp: new Date().toISOString(),
      page: window.location.pathname,
      ...params
    };

    if (window.gtag) {
      gtag('event', eventName, enriched);
    }

    queueEvent(eventName, enriched);
    console.log('[Analytics] 📊', eventName, enriched);
  }

  function queueEvent(name, params) {
    AP.eventsQueue.push({ name, params, at: Date.now() });
    if (AP.eventsQueue.length > 500) AP.eventsQueue.shift();
    try {
      localStorage.setItem('pc_analytics_queue', JSON.stringify(AP.eventsQueue));
    } catch (e) {}
  }

  /* ============================================
     4. BUSINESS EVENTS
     ============================================ */
  const BusinessEvents = {
    login: (method = 'email') => trackEvent('login', { method }),
    signUp: (plan) => trackEvent('sign_up', { plan }),
    logout: () => trackEvent('logout', {}),

    viewItem: (product) => trackEvent('view_item', {
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
      currency: 'EGP'
    }),

    addToCart: (product, qty = 1) => trackEvent('add_to_cart', {
      item_id: product.id,
      item_name: product.name,
      quantity: qty,
      price: product.price,
      value: product.price * qty,
      currency: 'EGP'
    }),

    removeFromCart: (product, qty = 1) => trackEvent('remove_from_cart', {
      item_id: product.id,
      quantity: qty,
      value: product.price * qty
    }),

    beginCheckout: (value, items) => trackEvent('begin_checkout', {
      value, currency: 'EGP', items: items.length, num_items: items.reduce((s, i) => s + i.qty, 0)
    }),

    purchase: (order) => trackEvent('purchase', {
      transaction_id: order.id,
      value: order.total,
      currency: 'EGP',
      tax: order.tax || 0,
      shipping: 0,
      items: (order.items || []).map(i => ({
        item_id: i.id,
        item_name: i.name,
        price: i.price,
        quantity: i.qty
      })),
      payment_method: order.paymentMethod,
      customer_type: order.customerId ? 'returning' : 'new'
    }),

    refund: (order) => trackEvent('refund', {
      transaction_id: order.id,
      value: order.total
    }),

    search: (term, resultsCount) => trackEvent('search', {
      search_term: term,
      results_count: resultsCount
    }),

    viewPromotion: (promo) => trackEvent('view_promotion', {
      promotion_id: promo.id,
      promotion_name: promo.name
    }),

    selectPromotion: (promo) => trackEvent('select_promotion', {
      promotion_id: promo.id,
      promotion_name: promo.name
    }),

    // Custom business
    lowStockAlert: (count) => trackEvent('low_stock_alert', { count }),
    expiryAlert: (count) => trackEvent('expiry_alert', { count }),
    newCustomer: (customerId) => trackEvent('new_customer', { customer_id: customerId }),
    useVoicePOS: (duration) => trackEvent('voice_pos_used', { duration_ms: duration }),
    useOCR: (accuracy) => trackEvent('ocr_used', { accuracy }),
    useFEFO: (discountsApplied) => trackEvent('fefo_discounts', { count: discountsApplied }),
    upgrade: (fromPlan, toPlan, value) => trackEvent('upgrade_plan', {
      from_plan: fromPlan, to_plan: toPlan, value, currency: 'EGP'
    })
  };

  /* ============================================
     5. FUNNEL TRACKING
     ============================================ */
  const FUNNELS = {
    signup: ['view_signup', 'submit_signup', 'verify_email', 'complete_profile', 'first_login'],
    purchase: ['view_products', 'add_to_cart', 'begin_checkout', 'add_payment', 'purchase'],
    onboarding: ['account_created', 'first_product', 'first_sale', 'first_report', 'invite_team']
  };

  const funnelState = {};

  function trackFunnelStep(funnel, step) {
    if (!FUNNELS[funnel]) return;
    const steps = FUNNELS[funnel];
    const idx = steps.indexOf(step);
    if (idx === -1) return;

    funnelState[funnel] = Math.max(funnelState[funnel] || 0, idx + 1);

    trackEvent('funnel_step', {
      funnel_name: funnel,
      step_name: step,
      step_index: idx + 1,
      total_steps: steps.length,
      completion: ((idx + 1) / steps.length) * 100
    });
  }

  /* ============================================
     6. SCROLL DEPTH
     ============================================ */
  function initScrollTracking() {
    if (!AP.config.trackScrollDepth) return;

    const milestones = [25, 50, 75, 90, 100];
    const reached = new Set();

    let throttle = false;
    window.addEventListener('scroll', () => {
      if (throttle) return;
      throttle = true;
      setTimeout(() => { throttle = false; }, 500);

      const pct = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100);

      milestones.forEach(m => {
        if (pct >= m && !reached.has(m)) {
          reached.add(m);
          trackEvent('scroll_depth', { percent: m, page: window.location.pathname });
        }
      });
    }, { passive: true });
  }

  /* ============================================
     7. OUTBOUND LINKS
     ============================================ */
  function initOutboundTracking() {
    if (!AP.config.trackOutbound) return;

    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const url = link.href;
      if (url && !url.startsWith(window.location.origin) && !url.startsWith('javascript:')) {
        trackEvent('outbound_click', {
          url, link_text: (link.textContent || '').trim().slice(0, 100)
        });
      }
    });
  }

  /* ============================================
     8. SESSION RECORDING (lightweight)
     ============================================ */
  function initSessionRecording() {
    if (!AP.config.trackSessionRecording) return;

    const events = [];
    const record = (type, data) => {
      events.push({ type, data, t: Date.now() - AP.session.startedAt });
      if (events.length > 500) events.shift();
    };

    document.addEventListener('click', (e) => {
      record('click', { x: e.clientX, y: e.clientY, target: e.target.tagName, id: e.target.id });
    });

    document.addEventListener('input', (e) => {
      record('input', { target: e.target.id || e.target.name });
    });

    window.addEventListener('beforeunload', () => {
      try { localStorage.setItem('pc_session_' + AP.session.id, JSON.stringify(events)); } catch (e) {}
    });
  }

  /* ============================================
     9. HEATMAP DATA COLLECTION
     ============================================ */
  function initHeatmap() {
    if (!AP.config.trackHeatmaps) return;

    const clicks = [];
    document.addEventListener('click', (e) => {
      const x = e.clientX;
      const y = e.clientY;
      const w = window.innerWidth;
      const h = window.innerHeight;
      clicks.push({ x: (x / w) * 100, y: (y / h) * 100, t: Date.now() });
      if (clicks.length >= 50) {
        trackEvent('heatmap_batch', { page: window.location.pathname, clicks: clicks.slice(-50) });
        clicks.length = 0;
      }
    });
  }

  /* ============================================
     10. USER PROPERTIES
     ============================================ */
  function setUser(user) {
    if (!user) return;

    AP.userProperties = {
      user_id: user.id,
      pharmacy_id: user.tenantId,
      user_role: user.role,
      plan_type: user.plan || 'basic',
      email_domain: user.email ? user.email.split('@')[1] : null
    };

    if (window.gtag) {
      gtag('set', 'user_properties', AP.userProperties);
    }
    console.log('[Analytics] 👤 User set:', AP.userProperties);
  }

  function setUserId(userId) {
    if (window.gtag) gtag('set', 'user_id', userId);
  }

  /* ============================================
     11. AI INSIGHTS (local)
     ============================================ */
  function getInsights() {
    const events = AP.eventsQueue;
    if (events.length === 0) return null;

    const counts = {};
    const hourly = {};
    const pages = {};

    events.forEach(e => {
      counts[e.name] = (counts[e.name] || 0) + 1;
      const h = new Date(e.at).getHours();
      hourly[h] = (hourly[h] || 0) + 1;
      if (e.params?.page) pages[e.params.page] = (pages[e.params.page] || 0) + 1;
    });

    const topEvents = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const peakHour = Object.entries(hourly).sort((a, b) => b[1] - a[1])[0];
    const topPage = Object.entries(pages).sort((a, b) => b[1] - a[1])[0];

    // Simple anomaly detection: if last hour >> average, flag
    const avg = events.length / 24;
    const lastHour = hourly[new Date().getHours()] || 0;
    const anomaly = lastHour > avg * 2.5;

    return {
      totalEvents: events.length,
      uniqueEvents: Object.keys(counts).length,
      topEvents: topEvents.map(([name, count]) => ({ name, count })),
      peakHour: peakHour ? { hour: +peakHour[0], count: peakHour[1] } : null,
      topPage: topPage ? { page: topPage[0], count: topPage[1] } : null,
      anomaly,
      sessionDuration: Math.round((Date.now() - AP.session.startedAt) / 1000)
    };
  }

  /* ============================================
     12. INIT
     ============================================ */
  function init() {
    loadGA4();

    // Track initial page view
    setTimeout(() => trackPageView(), 1000);

    // Scroll
    initScrollTracking();
    initOutboundTracking();
    initSessionRecording();
    initHeatmap();

    // SPA route changes
    window.addEventListener('hashchange', () => {
      setTimeout(() => trackPageView(), 100);
    });

    // Track session duration on leave
    window.addEventListener('beforeunload', () => {
      const duration = Math.round((Date.now() - AP.session.startedAt) / 1000);
      trackEvent('session_end', { duration_seconds: duration });
    });

    console.log('[AnalyticsPro v1.0] ✅ Ready', {
      ga4: !!AP.config.ga4MeasurementId,
      session: AP.session.id
    });
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.AnalyticsPro = {
    trackPageView,
    trackEvent,
    setUser,
    setUserId,

    // Business events (shortcuts)
    ...BusinessEvents,

    // Funnels
    trackFunnelStep,

    // Insights
    getInsights,

    getSession: () => ({ ...AP.session }),
    getQueue: () => [...AP.eventsQueue],
    getUserProperties: () => ({ ...AP.userProperties }),

    enable: () => { AP.config.enabled = true; localStorage.setItem('pc_analytics_enabled', 'true'); },
    disable: () => { AP.config.enabled = false; localStorage.setItem('pc_analytics_enabled', 'false'); },

    setConfig: (config) => {
      Object.assign(AP.config, config);
      ['ga4_id', 'ga4_secret'].forEach(k => {
        const v = k === 'ga4_id' ? config.ga4MeasurementId : config.ga4ApiSecret;
        if (v) localStorage.setItem('pc_' + k, v);
      });
      if (AP.config.ga4MeasurementId) loadGA4();
    },

    clearQueue: () => {
      AP.eventsQueue = [];
      try { localStorage.removeItem('pc_analytics_queue'); } catch (e) {}
    }
  };

  // Backward compat
  if (!window.Analytics) window.Analytics = window.AnalyticsPro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[AnalyticsPro v1.0] 🚀 Ready');
})();