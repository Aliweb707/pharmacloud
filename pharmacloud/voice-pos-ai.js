/* ============================================
   PHARMACLOUD - VOICE POS AI PRO MAX v5.0
   Full Access to All Pharmacy Data
   Wake Word + Multi-command + Analytics + Reports
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    var m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, function(c) { return m[c]; });
  };

  /* ============================================
     CONFIG
     ============================================ */
  var CONFIG = {
    GROQ_URL: 'https://api.groq.com/openai/v1/chat/completions',
    GROQ_WHISPER_URL: 'https://api.groq.com/openai/v1/audio/transcriptions',
    MODEL: 'openai/gpt-oss-120b',
    WHISPER_MODEL: 'whisper-large-v3',
    SUPPORTS_JSON_MODE: false,
    DEFAULT_API_KEY: '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',
    LEARN_KEY: 'pc_voice_ai_learning',
    STORAGE_KEY: 'pc_groq_key',
    WAKE_KEY: 'pc_voice_wake',
    SHORTCUTS_KEY: 'pc_voice_shortcuts',
    NOTES_KEY: 'pc_voice_notes',

    getApiKey: function() {
      try {
        var stored = localStorage.getItem(CONFIG.STORAGE_KEY);
        if (stored && stored.length > 20) return stored;
      } catch (e) {}
      return CONFIG.DEFAULT_API_KEY;
    },

    setApiKey: function(key) {
      try { localStorage.setItem(CONFIG.STORAGE_KEY, key); return true; }
      catch (e) { return false; }
    },

    clearApiKey: function() {
      try { localStorage.removeItem(CONFIG.STORAGE_KEY); } catch (e) {}
    }
  };

  /* ============================================
     STATE
     ============================================ */
  var VP = {
    isListening: false,
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    isWakeListening: false,
    transcript: '',
    interimTranscript: '',
    lastIntent: null,
    history: [],
    maxHistory: 50,
    autoSpeak: true,
    language: 'ar-EG',
    audioContext: null,
    analyser: null,
    mediaStream: null,
    vizFrame: null,
    _autoStopTimer: null,
    _wakeRecognition: null,
    _recordingStartTime: 0,
    wakeWordEnabled: false,
    wakeWords: ['يا صيدلي', 'ياصيدلي', 'hello pharmacist', 'hey pharmacist'],
    sentiment: 'neutral',
    sessionStartTime: Date.now(),
    commandsCount: 0
  };

  /* ============================================
     LEARNING
     ============================================ */
  var Learning = (function() {
    function load() {
      try {
        return JSON.parse(localStorage.getItem(CONFIG.LEARN_KEY) || '{"corrections":{},"frequency":{},"patterns":{}}');
      } catch (e) { return { corrections: {}, frequency: {}, patterns: {} }; }
    }
    function save(d) {
      try { localStorage.setItem(CONFIG.LEARN_KEY, JSON.stringify(d)); } catch (e) {}
    }
    return {
      correct: function(wrong, right) {
        var d = load();
        d.corrections[wrong.toLowerCase()] = right;
        save(d);
      },
      getCorrections: function() { return load().corrections; },
      trackAction: function(action, text) {
        var d = load();
        d.frequency[action] = (d.frequency[action] || 0) + 1;
        if (text) {
          var key = action + ':' + text.toLowerCase().substring(0, 30);
          d.patterns[key] = (d.patterns[key] || 0) + 1;
        }
        save(d);
      },
      getTopActions: function(limit) {
        var d = load();
        return Object.keys(d.frequency)
          .sort(function(a, b) { return d.frequency[b] - d.frequency[a]; })
          .slice(0, limit || 5);
      },
      getPatterns: function() { return load().patterns; },
      reset: function() { try { localStorage.removeItem(CONFIG.LEARN_KEY); } catch (e) {} },
      stats: function() {
        var d = load();
        return {
          corrections: Object.keys(d.corrections).length,
          actions: Object.keys(d.frequency).length,
          patterns: Object.keys(d.patterns).length
        };
      },
      all: load
    };
  })();

  /* ============================================
     SHORTCUTS
     ============================================ */
  var Shortcuts = (function() {
    function load() {
      try { return JSON.parse(localStorage.getItem(CONFIG.SHORTCUTS_KEY) || '{}'); }
      catch (e) { return {}; }
    }
    function save(d) {
      try { localStorage.setItem(CONFIG.SHORTCUTS_KEY, JSON.stringify(d)); } catch (e) {}
    }
    return {
      add: function(trigger, command) {
        var d = load();
        d[trigger.toLowerCase()] = command;
        save(d);
      },
      remove: function(trigger) {
        var d = load();
        delete d[trigger.toLowerCase()];
        save(d);
      },
      get: function(text) {
        var d = load();
        var lower = text.toLowerCase();
        for (var trigger in d) {
          if (lower.indexOf(trigger) !== -1) {
            return { trigger: trigger, command: d[trigger] };
          }
        }
        return null;
      },
      all: load
    };
  })();

  /* ============================================
     VOICE NOTES
     ============================================ */
  var VoiceNotes = (function() {
    function load() {
      try { return JSON.parse(localStorage.getItem(CONFIG.NOTES_KEY) || '{}'); }
      catch (e) { return {}; }
    }
    function save(d) {
      try { localStorage.setItem(CONFIG.NOTES_KEY, JSON.stringify(d)); } catch (e) {}
    }
    return {
      add: function(productId, text) {
        var d = load();
        if (!d[productId]) d[productId] = [];
        d[productId].push({ text: text, at: new Date().toISOString() });
        save(d);
      },
      get: function(productId) {
        var d = load();
        return d[productId] || [];
      },
      all: load
    };
  })();

  /* ============================================
     BUILD RICH CONTEXT — كل بيانات الصيدلية
     ============================================ */
  function buildContext() {
    var products = [], orders = [], customers = [], cart = [];

    try { if (typeof PH !== 'undefined' && PH.getProducts) products = PH.getProducts() || []; } catch (e) {}
    try { if (typeof phCart !== 'undefined' && Array.isArray(phCart)) cart = phCart; } catch (e) {}
    try { if (typeof PH !== 'undefined' && PH.getCustomers) customers = PH.getCustomers() || []; } catch (e) {}
    try { if (typeof PH !== 'undefined' && PH.getOrders) orders = PH.getOrders() || []; } catch (e) {}

    var now = new Date();
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7);
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    var yearStart = new Date(now.getFullYear(), 0, 1);
    var lastWeekStart = new Date(); lastWeekStart.setDate(lastWeekStart.getDate() - 14);
    var lastWeekEnd = new Date(); lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    function computeStats(from, to) {
      var filtered = orders.filter(function(o) {
        var d = new Date(o.createdAt);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
      var revenue = filtered.reduce(function(s, o) { return s + (o.total || 0); }, 0);
      var items = filtered.reduce(function(s, o) {
        return s + (o.items || []).reduce(function(s2, i) { return s2 + (i.qty || 0); }, 0);
      }, 0);
      return {
        orders: filtered.length,
        revenue: Math.round(revenue),
        avgOrder: filtered.length ? Math.round(revenue / filtered.length) : 0,
        itemsSold: items
      };
    }

    var todayStats = computeStats(todayStart);
    var weekStats = computeStats(weekStart);
    var monthStats = computeStats(monthStart);
    var yearStats = computeStats(yearStart);
    var allTimeStats = computeStats(null);
    var thisWeek = computeStats(weekStart);
    var lastWeek = computeStats(lastWeekStart, lastWeekEnd);
    var weekGrowth = lastWeek.revenue > 0
      ? parseFloat(((thisWeek.revenue - lastWeek.revenue) / lastWeek.revenue * 100).toFixed(1))
      : 0;

    // Last 7 days
    var last7 = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var dayStr = d.toDateString();
      var dayOrders = orders.filter(function(o) {
        return new Date(o.createdAt).toDateString() === dayStr;
      });
      last7.push({
        day: d.toLocaleDateString('en-GB', { weekday: 'short' }),
        orders: dayOrders.length,
        revenue: Math.round(dayOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0))
      });
    }

    // Product analytics
    var productSales = {};
    orders.forEach(function(o) {
      (o.items || []).forEach(function(it) {
        if (!productSales[it.id]) {
          productSales[it.id] = { id: it.id, name: it.name, qty: 0, revenue: 0 };
        }
        productSales[it.id].qty += it.qty;
        productSales[it.id].revenue += (it.price || 0) * it.qty;
      });
    });
    var topProducts = Object.keys(productSales).map(function(k) { return productSales[k]; })
      .sort(function(a, b) { return b.qty - a.qty; })
      .slice(0, 10);

    var lowStock = products.filter(function(p) { return p.stock <= p.minStock && p.stock > 0; });
    var outOfStock = products.filter(function(p) { return p.stock === 0; });

    var inventoryValue = products.reduce(function(s, p) { return s + (p.stock * (p.cost || 0)); }, 0);
    var inventoryRetail = products.reduce(function(s, p) { return s + (p.stock * (p.price || 0)); }, 0);

    var byCategory = {};
    products.forEach(function(p) {
      var c = p.category || 'أخرى';
      if (!byCategory[c]) byCategory[c] = { count: 0, stock: 0, value: 0 };
      byCategory[c].count++;
      byCategory[c].stock += p.stock;
      byCategory[c].value += p.stock * (p.price || 0);
    });

    // Customers
    var customerStats = customers.map(function(c) {
      var custOrders = orders.filter(function(o) { return o.customerId === c.id; });
      var totalSpent = custOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0);
      var lastOrder = custOrders[0] ? custOrders[0].createdAt : null;
      return {
        id: c.id, name: c.name, phone: c.phone,
        orders: custOrders.length,
        totalSpent: Math.round(totalSpent),
        lastOrder: lastOrder
      };
    }).sort(function(a, b) { return b.totalSpent - a.totalSpent; });

    var activeCustomers = customerStats.filter(function(c) {
      return c.lastOrder && (Date.now() - new Date(c.lastOrder).getTime()) < 30 * 86400000;
    }).length;

    // Payment
    var byPayment = { cash: 0, card: 0, wallet: 0, online: 0 };
    orders.forEach(function(o) {
      var m = o.paymentMethod || 'cash';
      byPayment[m] = (byPayment[m] || 0) + 1;
    });

    // Peak hours
    var byHour = {};
    orders.forEach(function(o) {
      var h = new Date(o.createdAt).getHours();
      byHour[h] = (byHour[h] || 0) + 1;
    });
    var peakHour = Object.keys(byHour).sort(function(a, b) { return byHour[b] - byHour[a]; })[0];

    // FEFO
    var expiry = { expired: 0, critical: 0, warning: 0, info: 0, atRisk: 0 };
    try {
      if (typeof FEFO !== 'undefined' && PH.tenantId) {
        var fa = FEFO.analyze(PH.tenantId);
        expiry = {
          expired: fa.expired.length,
          critical: fa.critical.length,
          warning: fa.warning.length,
          info: fa.info.length,
          atRisk: Math.round(fa.atRiskValue || 0)
        };
      }
    } catch (e) {}

    // Tenant
    var tenant = null;
    try { if (typeof PH !== 'undefined' && PH.getTenant) tenant = PH.getTenant(); } catch (e) {}

    return {
      products: products.slice(0, 60).map(function(p) {
        return {
          id: p.id, name: p.name, active: p.active || '',
          price: p.price, cost: p.cost || 0, stock: p.stock,
          category: p.category || ''
        };
      }),
      totalProducts: products.length,

      cart: cart.map(function(c) {
        return { id: c.id, name: c.name, qty: c.qty, price: c.price };
      }),
      cartTotal: cart.reduce(function(s, c) { return s + c.price * c.qty; }, 0),
      cartItemsCount: cart.reduce(function(s, c) { return s + c.qty; }, 0),

      sales: {
        today: todayStats,
        week: weekStats,
        month: monthStats,
        year: yearStats,
        allTime: allTimeStats,
        last7Days: last7,
        weekGrowth: weekGrowth,
        byPayment: byPayment,
        peakHour: peakHour ? parseInt(peakHour) : null,
        peakHourCount: peakHour ? byHour[peakHour] : 0
      },

      inventory: {
        totalValue: Math.round(inventoryValue),
        retailValue: Math.round(inventoryRetail),
        potentialProfit: Math.round(inventoryRetail - inventoryValue),
        lowStock: lowStock.slice(0, 10).map(function(p) {
          return { name: p.name, stock: p.stock, minStock: p.minStock };
        }),
        outOfStock: outOfStock.slice(0, 10).map(function(p) { return { name: p.name }; }),
        topSellers: topProducts,
        byCategory: byCategory
      },

      customers: {
        total: customers.length,
        active: activeCustomers,
        top: customerStats.slice(0, 10),
        avgSpend: customerStats.length
          ? Math.round(customerStats.reduce(function(s, c) { return s + c.totalSpent; }, 0) / customerStats.length)
          : 0
      },

      expiry: expiry,

      tenant: tenant ? {
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status,
        trialEndsAt: tenant.trialEndsAt,
        subscriptionEndsAt: tenant.subscriptionEndsAt
      } : null,

      corrections: Learning.getCorrections(),
      shortcuts: Shortcuts.all()
    };
  }

  /* ============================================
     SENTIMENT ANALYSIS
     ============================================ */
  function analyzeSentiment(text) {
    var lower = text.toLowerCase();
    var negative = ['تعبان', 'مرهق', 'زهقت', 'مش قادر', 'tired', 'exhausted', 'stressed'];
    var positive = ['تمام', 'ممتاز', 'شكرا', 'great', 'good', 'مبسوط'];
    var urgent = ['بسرعة', 'حالاً', 'urgent', 'fast'];

    for (var i = 0; i < negative.length; i++) {
      if (lower.indexOf(negative[i]) !== -1) return 'negative';
    }
    for (var j = 0; j < positive.length; j++) {
      if (lower.indexOf(positive[j]) !== -1) return 'positive';
    }
    for (var k = 0; k < urgent.length; k++) {
      if (lower.indexOf(urgent[k]) !== -1) return 'urgent';
    }
    return 'neutral';
  }

  /* ============================================
     BUILD SYSTEM PROMPT — يحوي كل البيانات
     ============================================ */
  function buildSystemPrompt(ctx) {
    var s = ctx.sales;
    var inv = ctx.inventory;
    var cst = ctx.customers;
    var exp = ctx.expiry;

    var productsText = ctx.products.slice(0, 40).map(function(p) {
      return '- ' + p.id + ' | ' + p.name + (p.active ? ' (' + p.active + ')' : '') + ' | سعر:' + p.price + ' | تكلفة:' + p.cost + ' | مخزون:' + p.stock + ' | ' + p.category;
    }).join('\n');

    var topSellersText = inv.topSellers.length > 0
      ? inv.topSellers.map(function(p, i) {
          return (i + 1) + '. ' + p.name + ' — ' + p.qty + ' وحدة، ' + Math.round(p.revenue) + ' ج';
        }).join('\n')
      : 'لا يوجد';

    var topCustomersText = cst.top.length > 0
      ? cst.top.slice(0, 5).map(function(c, i) {
          return (i + 1) + '. ' + c.name + ' (' + c.phone + ') — ' + c.orders + ' طلب، ' + c.totalSpent + ' ج';
        }).join('\n')
      : 'لا يوجد';

    var last7Text = s.last7Days.map(function(d) {
      return d.day + ': ' + d.orders + ' طلب، ' + d.revenue + ' ج';
    }).join('\n');

    var categoriesText = Object.keys(inv.byCategory).map(function(c) {
      var cat = inv.byCategory[c];
      return '- ' + c + ': ' + cat.count + ' منتج، مخزون ' + cat.stock + '، قيمة ' + Math.round(cat.value) + ' ج';
    }).join('\n');

    var lowStockText = inv.lowStock.length > 0
      ? inv.lowStock.map(function(p) { return '- ' + p.name + ' (متبقي ' + p.stock + '، الحد ' + p.minStock + ')'; }).join('\n')
      : 'لا يوجد';

    var shortcutsText = Object.keys(ctx.shortcuts).length > 0
      ? JSON.stringify(ctx.shortcuts)
      : 'لا يوجد';

    var tenantText = ctx.tenant
      ? 'الاسم: ' + ctx.tenant.name + ' | الخطة: ' + ctx.tenant.plan + ' | الحالة: ' + ctx.tenant.status
      : 'غير معروف';

    return 'You are PharmaCloud AI — smart voice assistant for a pharmacy POS.\n' +
      'You have FULL ACCESS to ALL pharmacy data. Answer ANY question about the business.\n\n' +

      '═══════════════════════════════════════\n' +
      '📊 مبيعات — SALES DATA\n' +
      '═══════════════════════════════════════\n' +
      'Today: ' + s.today.orders + ' orders, ' + s.today.revenue + ' EGP, avg ' + s.today.avgOrder + ' EGP, ' + s.today.itemsSold + ' items\n' +
      'Week: ' + s.week.orders + ' orders, ' + s.week.revenue + ' EGP, avg ' + s.week.avgOrder + ' EGP\n' +
      'Month: ' + s.month.orders + ' orders, ' + s.month.revenue + ' EGP, avg ' + s.month.avgOrder + ' EGP\n' +
      'Year: ' + s.year.orders + ' orders, ' + s.year.revenue + ' EGP, avg ' + s.year.avgOrder + ' EGP\n' +
      'All time: ' + s.allTime.orders + ' orders, ' + s.allTime.revenue + ' EGP\n' +
      'Week growth: ' + s.weekGrowth + '% (vs last week)\n' +
      'Peak hour: ' + (s.peakHour !== null ? s.peakHour + ':00 (' + s.peakHourCount + ' orders)' : 'غير معروف') + '\n' +
      'Payments: كاش ' + s.byPayment.cash + '، بطاقة ' + s.byPayment.card + '، محفظة ' + (s.byPayment.wallet || 0) + '\n' +
      '\nآخر 7 أيام:\n' + last7Text + '\n\n' +

      '═══════════════════════════════════════\n' +
      '📦 المخزون — INVENTORY\n' +
      '═══════════════════════════════════════\n' +
      'إجمالي منتجات: ' + ctx.totalProducts + '\n' +
      'قيمة المخزون (تكلفة): ' + inv.totalValue + ' EGP\n' +
      'قيمة المخزون (بيع): ' + inv.retailValue + ' EGP\n' +
      'الربح المحتمل: ' + inv.potentialProfit + ' EGP\n' +
      'منتجات منخفضة: ' + inv.lowStock.length + '\n' +
      'منتجات نفدت: ' + inv.outOfStock.length + '\n\n' +
      'الأكثر مبيعاً:\n' + topSellersText + '\n\n' +
      'الفئات:\n' + categoriesText + '\n\n' +
      'تحتاج إعادة طلب:\n' + lowStockText + '\n\n' +

      '═══════════════════════════════════════\n' +
      '👥 العملاء — CUSTOMERS\n' +
      '═══════════════════════════════════════\n' +
      'إجمالي: ' + cst.total + '\n' +
      'نشطون (30 يوم): ' + cst.active + '\n' +
      'متوسط الشراء للعميل: ' + cst.avgSpend + ' EGP\n\n' +
      'أفضل العملاء:\n' + topCustomersText + '\n\n' +

      '═══════════════════════════════════════\n' +
      '⏰ الصلاحية — EXPIRY (FEFO)\n' +
      '═══════════════════════════════════════\n' +
      'منتهي: ' + exp.expired + '\n' +
      'حرج (30 يوم): ' + exp.critical + '\n' +
      'تحذير (60 يوم): ' + exp.warning + '\n' +
      'تنبيه (90 يوم): ' + exp.info + '\n' +
      'قيمة معرضة للخطر: ' + exp.atRisk + ' EGP\n\n' +

      '═══════════════════════════════════════\n' +
      '🏪 الصيدلية\n' +
      '═══════════════════════════════════════\n' +
      tenantText + '\n\n' +

      '═══════════════════════════════════════\n' +
      '🛒 السلة الحالية\n' +
      '═══════════════════════════════════════\n' +
      (ctx.cart.length > 0
        ? ctx.cart.map(function(c) { return '- ' + c.name + ' × ' + c.qty + ' = ' + (c.price * c.qty) + ' ج'; }).join('\n') + '\nالإجمالي: ' + ctx.cartTotal + ' ج'
        : 'السلة فاضية') + '\n\n' +

      '═══════════════════════════════════════\n' +
      '📋 قائمة المنتجات (للبحث)\n' +
      '═══════════════════════════════════════\n' +
      productsText + '\n\n' +

      'الاختصارات: ' + shortcutsText + '\n\n' +

      '═══════════════════════════════════════\n' +
      '🎯 ACTIONS المتاحة\n' +
      '═══════════════════════════════════════\n' +
      '1. add — إضافة (productId, quantity)\n' +
      '2. remove — إزالة (productId)\n' +
      '3. discount — خصم (percentage)\n' +
      '4. checkout — إتمام البيع\n' +
      '5. clear — تفريغ السلة\n' +
      '6. query — استفسار منتج/إجمالي\n' +
      '7. change_qty — تغيير كمية\n' +
      '8. report — تقرير صوتي (reportType: today|week|month|top|lowstock|customers|inventory|profit|growth|expiry|peak)\n' +
      '9. analytics — رد على أي سؤال عن البيانات (answer: النص الكامل)\n' +
      '10. advice — نصيحة ذكية بناءً على البيانات (answer)\n' +
      '11. predict — توقع (answer)\n' +
      '12. scan_rx — فتح ماسح الروشتة\n' +
      '13. note — ملاحظة (productId, noteText)\n' +
      '14. help, greeting, unknown\n\n' +

      '═══════════════════════════════════════\n' +
      '📐 FORMAT — JSON فقط\n' +
      '═══════════════════════════════════════\n' +
      '{\n' +
      '  "commands": [\n' +
      '    { "action": "add", "productId": "p1", "quantity": 2, "response": "✅ ...", "confidence": 0.95 },\n' +
      '    { "action": "analytics", "answer": "معدل البيع اليومي 1,250 ج.م", "response": "تم", "confidence": 0.9 }\n' +
      '  ],\n' +
      '  "sentiment": "neutral",\n' +
      '  "summary": "..."\n' +
      '}\n\n' +

      '═══════════════════════════════════════\n' +
      '⚡ قواعد مهمة\n' +
      '═══════════════════════════════════════\n' +
      '- عند السؤال عن أي مقياس → استخدم "analytics" واكتب الإجابة كاملة في "answer"\n' +
      '- استخدم الأرقام الفعلية من البيانات — لا تخترع أرقاماً\n' +
      '- "معدل البيع" = sales.month.avgOrder أو sales.today.avgOrder حسب السياق\n' +
      '- "أفضل منتج" = inventory.topSellers[0]\n' +
      '- "أفضل عميل" = customers.top[0]\n' +
      '- "مبيعات النهاردة" = sales.today\n' +
      '- "الأرباح" = inventory.potentialProfit\n' +
      '- "اللي خلص" = inventory.lowStock + outOfStock\n' +
      '- "قرب ينتهي" = expiry.critical\n' +
      '- "إيه رأيك" / "نصيحة" → action: "advice"\n' +
      '- "توقع" / "predict" → action: "predict"\n' +
      '- "المقارنة" → استخدم sales.weekGrowth\n' +
      '- الإجابة بالعربية دايماً\n' +
      '- إذا استخدم جملتين أوامر → أعد مصفوفة commands';
  }

  /* ============================================
     CALL GROQ
     ============================================ */
  async function understandWithAI(transcript) {
    var apiKey = CONFIG.getApiKey();
    if (!apiKey) throw new Error('GROQ_KEY_MISSING');

    var ctx = buildContext();
    var systemPrompt = buildSystemPrompt(ctx);

    var shortcut = Shortcuts.get(transcript);
    var finalTranscript = shortcut ? shortcut.command : transcript;
    if (shortcut) {
      console.log('[Voice POS] 🎯 Shortcut matched:', shortcut.trigger);
    }

    var body = {
      model: CONFIG.MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: finalTranscript }
      ],
      temperature: 0.1,
      max_tokens: 800
    };

    console.log('[Voice POS] Sending to Groq:', finalTranscript);

    var response = await fetch(CONFIG.GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      var errText = await response.text();
      throw new Error('API_ERROR: ' + response.status + ' - ' + errText.slice(0, 200));
    }

    var data = await response.json();
    var content = data.choices[0].message.content;
    console.log('[Voice POS] Raw:', content);

    var jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('NO_JSON');

    var parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.commands && parsed.action) {
      parsed.commands = [parsed];
    }
    if (!parsed.commands || !Array.isArray(parsed.commands)) {
      parsed.commands = [{ action: 'unknown', response: 'لم أفهم' }];
    }

    return parsed;
  }

  /* ============================================
     EXECUTE MULTIPLE COMMANDS
     ============================================ */
  async function executeCommands(result, originalTranscript) {
    var commands = result.commands || [];
    var sentiment = result.sentiment || analyzeSentiment(originalTranscript);
    VP.sentiment = sentiment;

    var allResponses = [];
    var allSuccess = true;
    var hasError = false;

    for (var i = 0; i < commands.length; i++) {
      var cmd = commands[i];
      cmd._transcript = originalTranscript;
      var r = await executeSingleCommand(cmd);

      if (r.message) allResponses.push(r.message);
      if (!r.success) allSuccess = false;
      if (r.error) hasError = true;

      Learning.trackAction(cmd.action, cmd.response || '');
    }

    VP.history.unshift({
      text: originalTranscript,
      action: commands.map(function(c) { return c.action; }).join(' + '),
      result: allResponses.join(' | '),
      success: allSuccess,
      sentiment: sentiment,
      timestamp: new Date().toISOString()
    });
    if (VP.history.length > VP.maxHistory) VP.history.pop();

    updateCommandHistory();
    updateResultBanner({
      success: allSuccess && !hasError,
      error: hasError,
      message: allResponses.join('\n')
    }, {
      action: commands[0] ? commands[0].action : 'unknown',
      confidence: commands[0] ? commands[0].confidence : 0
    });

    if (VP.autoSpeak && allResponses.length > 0) {
      var speechText = allResponses.join('. ');
      if (sentiment === 'negative') {
        speechText = 'أنا آسف إنك تعبان. ' + speechText;
      } else if (sentiment === 'urgent') {
        speechText = 'بسرعة... ' + speechText;
      }
      speak(speechText);
    }

    return { success: allSuccess };
  }

  /* ============================================
     EXECUTE SINGLE COMMAND
     ============================================ */
  async function executeSingleCommand(ai) {
    var result = { success: false, message: ai.response || '' };

    switch (ai.action) {
      case 'add':
        if (!ai.productId) { result.message = 'مش لاقي المنتج'; result.error = true; break; }
        var qty = ai.quantity || 1;
        try {
          var product = PH.getProducts().find(function(p) { return p.id === ai.productId; });
          if (!product) { result.message = 'المنتج غير موجود'; result.error = true; break; }
          if (product.stock < qty) { result.message = 'كمية غير كافية — متاح ' + product.stock; result.error = true; break; }
          if (typeof phAddToCart === 'function') {
            for (var i = 0; i < qty; i++) phAddToCart(product.id);
          }
          result.message = '✅ ' + qty + ' × ' + product.name + ' — ' + (product.price * qty) + ' ج.م';
          result.success = true;
        } catch (e) { result.message = 'خطأ في الإضافة'; result.error = true; }
        break;

      case 'remove':
        if (!ai.productId) { result.message = 'مش لاقي المنتج'; result.error = true; break; }
        try {
          if (typeof phRemoveFromCart === 'function') {
            phRemoveFromCart(ai.productId);
            result.message = '🗑️ ' + (ai.productName || 'المنتج') + ' اتحذف';
            result.success = true;
          }
        } catch (e) { result.message = 'خطأ'; result.error = true; }
        break;

      case 'change_qty':
        if (!ai.productId || !ai.quantity) { result.message = 'مش واضح'; result.error = true; break; }
        try {
          var cartItem = (typeof phCart !== 'undefined' ? phCart : []).find(function(c) { return c.id === ai.productId; });
          if (!cartItem) { result.message = 'المنتج مش في السلة'; result.error = true; break; }
          var diff = ai.quantity - cartItem.qty;
          if (typeof phChangeQty === 'function' && diff !== 0) phChangeQty(ai.productId, diff);
          result.message = '✅ ' + cartItem.name + ' بقت ' + ai.quantity;
          result.success = true;
        } catch (e) { result.message = 'خطأ'; result.error = true; }
        break;

      case 'discount':
        var pct = ai.percentage || 10;
        window._voiceDiscount = pct;
        if (typeof phApplyDiscount === 'function') {
          try { phApplyDiscount(pct); } catch (e) {}
        }
        result.message = '💯 خصم ' + pct + '%';
        result.success = true;
        break;

      case 'checkout':
        try {
          if (typeof phCart !== 'undefined' && phCart.length > 0 && typeof phCheckout === 'function') {
            phCheckout();
            result.message = '🎉 تم البيع';
            result.success = true;
          } else { result.message = 'السلة فاضية'; result.error = true; }
        } catch (e) { result.message = 'خطأ'; result.error = true; }
        break;

      case 'clear':
        if (typeof phClearCart === 'function') {
          phClearCart();
          result.message = '🗑️ السلة اتفضت';
          result.success = true;
        }
        break;

      case 'query':
        if (ai.productId) {
          var p = PH.getProducts().find(function(x) { return x.id === ai.productId; });
          if (p) {
            result.message = '💰 ' + p.name + ' بـ ' + p.price + ' ج.م — مخزون: ' + p.stock;
            result.success = true;
          }
        } else {
          var total = (typeof phCart !== 'undefined' ? phCart : []).reduce(function(s, c) { return s + c.price * c.qty; }, 0);
          result.message = '🧾 إجمالي السلة: ' + total + ' ج.م';
          result.success = true;
        }
        break;

      case 'search':
        if (ai.productId) {
          var found = PH.getProducts().find(function(x) { return x.id === ai.productId; });
          if (found) { result.message = '🔍 ' + found.name + ' — ' + found.price + ' ج.م'; result.success = true; }
        } else { result.message = ai.response || 'مش لاقي'; result.error = true; }
        break;

      case 'analytics':
        result.message = ai.answer || ai.response || 'معلش، مش لاقي الإجابة';
        result.success = true;
        break;

      case 'advice':
        result.message = ai.answer || ai.response || 'نصيحتي: راجع البيانات وحلل الأداء';
        result.success = true;
        break;

      case 'predict':
        result.message = ai.answer || ai.response || 'التوقع: نمو مستقر';
        result.success = true;
        break;

      case 'report':
        result.message = buildVoiceReport(ai.reportType || 'today');
        result.success = true;
        break;

      case 'scan_rx':
        result.message = '📸 جاري فتح ماسح الروشتة...';
        result.success = true;
        if (typeof openPrescriptionScannerReal === 'function') {
          setTimeout(function() { openPrescriptionScannerReal(); }, 500);
        }
        break;

      case 'note':
        if (ai.productId && ai.noteText) {
          VoiceNotes.add(ai.productId, ai.noteText);
          result.message = '📝 تم حفظ الملاحظة';
          result.success = true;
        } else {
          result.message = 'مش واضح';
          result.error = true;
        }
        break;

      case 'help':
        result.message = 'أقدر أساعدك في: بيع، شيل، خصم، دفع، تقرير، روشتة، ملاحظات، وتحليل بيانات';
        result.success = true;
        break;

      case 'greeting':
        result.message = ai.response || 'أهلاً! أنا جاهز أساعدك';
        result.success = true;
        break;

      default:
        result.message = ai.response || 'مش فاهم — حاول تاني';
        result.error = true;
    }

    return result;
  }

  /* ============================================
     VOICE REPORTS
     ============================================ */
  function buildVoiceReport(type) {
    try {
      var ctx = buildContext();
      var s = ctx.sales;
      var inv = ctx.inventory;
      var cst = ctx.customers;
      var exp = ctx.expiry;

      switch (type) {
        case 'today':
          return '📊 النهاردة: ' + s.today.orders + ' طلب، إجمالي ' + s.today.revenue + ' ج.م، متوسط ' + s.today.avgOrder + ' ج.م';

        case 'week':
          return '📈 الأسبوع: ' + s.week.orders + ' طلب، ' + s.week.revenue + ' ج.م، النمو ' + s.weekGrowth + '%';

        case 'month':
          return '📅 الشهر: ' + s.month.orders + ' طلب، ' + s.month.revenue + ' ج.م، متوسط ' + s.month.avgOrder + ' ج.م';

        case 'year':
          return '📆 السنة: ' + s.year.orders + ' طلب، ' + s.year.revenue + ' ج.م';

        case 'top':
        case 'bestsellers':
          if (inv.topSellers.length === 0) return '📊 لسه مفيش بيانات';
          return '🏆 الأكثر مبيعاً: ' + inv.topSellers.slice(0, 3).map(function(p, i) {
            return (i + 1) + '. ' + p.name + ' (' + p.qty + ')';
          }).join('، ');

        case 'lowstock':
          var lowCount = inv.lowStock.length + inv.outOfStock.length;
          if (lowCount === 0) return '✨ كل المنتجات متوفرة';
          return '⚠️ ' + lowCount + ' منتج محتاج إعادة طلب: ' +
            (inv.lowStock.slice(0, 3).map(function(p) { return p.name; }).join('، ') || '');

        case 'customers':
          return '👥 ' + cst.total + ' عميل، ' + cst.active + ' نشط، متوسط شراء ' + cst.avgSpend + ' ج.م';

        case 'inventory':
          return '📦 ' + ctx.totalProducts + ' منتج، قيمة المخزون ' + inv.totalValue + ' ج.م، ربح محتمل ' + inv.potentialProfit + ' ج.م';

        case 'profit':
          return '💰 الربح المحتمل من المخزون: ' + inv.potentialProfit + ' ج.م';

        case 'growth':
          return '📊 النمو: ' + s.weekGrowth + '% مقارنة بالأسبوع الماضي';

        case 'expiry':
          var totalExp = exp.expired + exp.critical;
          if (totalExp === 0) return '✨ مفيش منتجات قربت تنتهي';
          return '⏰ ' + totalExp + ' منتج قرب ينتهي، قيمة ' + exp.atRisk + ' ج.م';

        case 'peak':
          return s.peakHour !== null
            ? '🕐 وقت الذروة: ' + s.peakHour + ':00 (' + s.peakHourCount + ' طلب)'
            : 'مفيش بيانات كفاية';

        default:
          return '📊 النهاردة: ' + s.today.orders + ' طلب، ' + s.today.revenue + ' ج.م';
      }
    } catch (e) {
      return '❌ مش قادر أجيب التقرير';
    }
  }

  /* ============================================
     PROCESS TRANSCRIPT
     ============================================ */
  async function processTranscript(transcript) {
    if (!transcript || transcript.trim().length < 2) return;
    if (VP.isProcessing) return;

    VP.isProcessing = true;
    VP.transcript = transcript;
    VP.commandsCount++;

    updateProcessingState(true);
    updateTranscriptDisplay(transcript, null);

    if (VP.isSpeaking) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      VP.isSpeaking = false;
    }

    try {
      var result = await understandWithAI(transcript);
      await executeCommands(result, transcript);
    } catch (e) {
      console.error('[Voice POS] Error:', e);
      var errorMsg = 'خطأ في الفهم';
      if (e.message === 'GROQ_KEY_MISSING') errorMsg = 'محتاج مفتاح Groq';
      else if (/401/.test(e.message)) errorMsg = 'مفتاح غير صالح';
      else if (/429/.test(e.message)) errorMsg = 'ضغط على الخدمة';
      else if (/fetch|network/i.test(e.message)) errorMsg = 'مشكلة في الاتصال';

      updateResultBanner({ success: false, error: true, message: errorMsg },
        { action: 'error', confidence: 0 });
      if (VP.autoSpeak) speak(errorMsg);
    } finally {
      VP.isProcessing = false;
      updateProcessingState(false);
    }
  }

  /* ============================================
     TTS
     ============================================ */
  function speak(text) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = VP.language;
      u.rate = 1.05;

      var voices = window.speechSynthesis.getVoices();
      var arVoice = voices.find(function(v) { return v.lang.indexOf('ar') === 0; });
      if (arVoice) u.voice = arVoice;

      u.onstart = function() { VP.isSpeaking = true; };
      u.onend = function() { VP.isSpeaking = false; };
      u.onerror = function() { VP.isSpeaking = false; };

      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  /* ============================================
     VISUALIZER
     ============================================ */
  function startVisualizer(stream) {
    try {
      VP.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      VP.analyser = VP.audioContext.createAnalyser();
      VP.analyser.fftSize = 128;
      var mic = VP.audioContext.createMediaStreamSource(stream);
      mic.connect(VP.analyser);
      VP.mediaStream = stream;

      var canvas = document.getElementById('voiceVizCanvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var bufferLength = VP.analyser.frequencyBinCount;
      var dataArray = new Uint8Array(bufferLength);

      function draw() {
        if (!VP.isRecording && !VP.isListening) return;
        VP.vizFrame = requestAnimationFrame(draw);
        VP.analyser.getByteFrequencyData(dataArray);
        var W = canvas.width, H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        var barWidth = (W / bufferLength) * 2.5;
        var x = 0;
        for (var i = 0; i < bufferLength; i++) {
          var barHeight = (dataArray[i] / 255) * H;
          var gradient = ctx.createLinearGradient(0, H - barHeight, 0, H);
          gradient.addColorStop(0, '#7c3aed');
          gradient.addColorStop(0.5, '#1E88E5');
          gradient.addColorStop(1, '#00b884');
          ctx.fillStyle = gradient;
          ctx.fillRect(x, H - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      }
      draw();
    } catch (e) {}
  }

  function stopVisualizer() {
    if (VP.vizFrame) { cancelAnimationFrame(VP.vizFrame); VP.vizFrame = null; }
    if (VP.mediaStream) { VP.mediaStream.getTracks().forEach(function(t) { t.stop(); }); VP.mediaStream = null; }
    if (VP.audioContext) { try { VP.audioContext.close(); } catch (e) {} VP.audioContext = null; }
  }

  /* ============================================
     WAKE WORD
     ============================================ */
  function startWakeWordListener() {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (VP._wakeRecognition) {
      try { VP._wakeRecognition.stop(); } catch (e) {}
    }

    VP._wakeRecognition = new SR();
    VP._wakeRecognition.lang = 'ar-EG';
    VP._wakeRecognition.continuous = true;
    VP._wakeRecognition.interimResults = true;

    VP._wakeRecognition.onresult = function(e) {
      for (var i = e.resultIndex; i < e.results.length; i++) {
        var transcript = e.results[i][0].transcript.toLowerCase();
        for (var j = 0; j < VP.wakeWords.length; j++) {
          if (transcript.indexOf(VP.wakeWords[j].toLowerCase()) !== -1) {
            console.log('[Voice POS] 🎯 Wake word detected');
            VP._wakeRecognition.stop();
            VP.isWakeListening = false;
            updateWakeIndicator(false);
            if (VP.autoSpeak) speak('اتفضل');
            setTimeout(function() { startListening(); }, 800);
            return;
          }
        }
      }
    };

    VP._wakeRecognition.onerror = function(e) {
      if (e.error !== 'no-speech') {
        console.warn('[Voice POS] Wake error:', e.error);
      }
      if (VP.wakeWordEnabled && !VP.isRecording) {
        setTimeout(function() {
          if (VP.wakeWordEnabled && !VP.isRecording) {
            try { VP._wakeRecognition.start(); } catch (err) {}
          }
        }, 1000);
      }
    };

    VP._wakeRecognition.onend = function() {
      if (VP.wakeWordEnabled && !VP.isRecording && !VP.isWakeListening) {
        setTimeout(function() {
          if (VP.wakeWordEnabled && !VP.isRecording) {
            try {
              VP._wakeRecognition.start();
              VP.isWakeListening = true;
              updateWakeIndicator(true);
            } catch (err) {}
          }
        }, 500);
      }
    };

    try {
      VP._wakeRecognition.start();
      VP.isWakeListening = true;
      VP.wakeWordEnabled = true;
      updateWakeIndicator(true);
      console.log('[Voice POS] 🎧 Wake listener started');
    } catch (e) {
      console.warn('[Voice POS] Wake start failed:', e);
    }
  }

  function stopWakeWordListener() {
    VP.wakeWordEnabled = false;
    VP.isWakeListening = false;
    if (VP._wakeRecognition) {
      try { VP._wakeRecognition.stop(); } catch (e) {}
    }
    updateWakeIndicator(false);
  }

  function updateWakeIndicator(active) {
    var el = document.getElementById('vpWakeIndicator');
    if (el) el.style.display = active ? 'flex' : 'none';
  }

  /* ============================================
     MEDIA RECORDER
     ============================================ */
  var _mediaRecorder = null;
  var _audioChunks = [];
  var _recordingStream = null;

  function startListening() {
    if (VP.isRecording) return;

    var apiKey = CONFIG.getApiKey();
    if (!apiKey) {
      showInlineError('⚠️ محتاج مفتاح Groq');
      return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(function(stream) {
        _recordingStream = stream;
        _audioChunks = [];
        VP._recordingStartTime = Date.now();

        var mimeType = 'audio/webm';
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        }

        _mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

        _mediaRecorder.ondataavailable = function(e) {
          if (e.data && e.data.size > 0) _audioChunks.push(e.data);
        };

        _mediaRecorder.onstop = function() {
          var blob = new Blob(_audioChunks, { type: mimeType });
          var duration = Date.now() - VP._recordingStartTime;

          if (blob.size < 1000 || duration < 500) {
            showInlineError('🔇 التسجيل قصير');
            VP.isRecording = false;
            VP.isListening = false;
            updateVoiceUI(false);
            if (_recordingStream) {
              _recordingStream.getTracks().forEach(function(t) { t.stop(); });
              _recordingStream = null;
            }
            return;
          }

          transcribeWithWhisper(blob, mimeType);

          if (_recordingStream) {
            _recordingStream.getTracks().forEach(function(t) { t.stop(); });
            _recordingStream = null;
          }
        };

        _mediaRecorder.start();
        VP.isRecording = true;
        VP.isListening = true;

        updateVoiceUI(true);
        clearInlineError();
        startVisualizer(stream);

        console.log('[Voice POS] 🎤 Recording started');

        clearTimeout(VP._autoStopTimer);
        VP._autoStopTimer = setTimeout(function() {
          if (VP.isRecording) stopListening();
        }, 30000);
      })
      .catch(function(err) {
        console.error('[Voice POS] Mic error:', err);
        showInlineError('🚫 فشل الميكروفون');
      });
  }

  function stopListening() {
    clearTimeout(VP._autoStopTimer);

    if (_mediaRecorder && _mediaRecorder.state !== 'inactive') {
      try { _mediaRecorder.stop(); } catch (e) {}
    }

    VP.isRecording = false;
    VP.isListening = false;
    updateVoiceUI(false);
    stopVisualizer();

    if (VP.wakeWordEnabled && !VP.isWakeListening) {
      setTimeout(function() {
        if (VP.wakeWordEnabled) startWakeWordListener();
      }, 1500);
    }
  }

  /* ============================================
     WHISPER
     ============================================ */
  async function transcribeWithWhisper(blob, mimeType) {
    var apiKey = CONFIG.getApiKey();
    if (!apiKey) return;

    updateProcessingState(true);
    updateTranscriptDisplay('جاري تحويل الصوت...', null);

    try {
      var formData = new FormData();
      var ext = 'webm';
      if (mimeType.indexOf('mp4') !== -1) ext = 'mp4';

      formData.append('file', blob, 'recording.' + ext);
      formData.append('model', CONFIG.WHISPER_MODEL);
      formData.append('language', 'ar');
      formData.append('response_format', 'json');
      formData.append('temperature', '0');

      var response = await fetch(CONFIG.GROQ_WHISPER_URL, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
        body: formData
      });

      if (!response.ok) throw new Error('WHISPER_ERROR');

      var data = await response.json();
      var text = (data.text || '').trim();

      console.log('[Voice POS] 📥 Transcription:', text);

      if (!text || text.length < 2) {
        showInlineError('🔇 مسمعتش حاجة');
        updateProcessingState(false);
        return;
      }

      updateTranscriptDisplay(text, 1);
      updateProcessingState(false);

      await processTranscript(text);

    } catch (e) {
      console.error('[Voice POS] Whisper error:', e);
      updateProcessingState(false);
      showInlineError('❌ فشل تحويل الصوت');
    }
  }

  /* ============================================
     DASHBOARD RENDERER
     ============================================ */
  function renderDashboardContent(container) {
    if (!container) return;

    var learning = Learning.all();
    var shortcuts = Shortcuts.all();
    var notes = VoiceNotes.all();

    var correctionsCount = Object.keys(learning.corrections).length;
    var frequencyCount = Object.keys(learning.frequency).length;
    var patternsCount = Object.keys(learning.patterns).length;
    var shortcutsCount = Object.keys(shortcuts).length;
    var notesCount = Object.keys(notes).length;

    var topActions = Object.keys(learning.frequency)
      .map(function(k) { return { action: k, count: learning.frequency[k] }; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, 8);

    var corrections = Object.keys(learning.corrections)
      .map(function(k) { return { wrong: k, right: learning.corrections[k] }; })
      .slice(0, 10);

    var patterns = Object.keys(learning.patterns)
      .map(function(k) { return { pattern: k, count: learning.patterns[k] }; })
      .sort(function(a, b) { return b.count - a.count; })
      .slice(0, 10);

    var actionLabels = {
      add: { label: 'إضافة للسلة', icon: 'fa-cart-plus', color: '#00b884' },
      remove: { label: 'إزالة', icon: 'fa-cart-arrow-down', color: '#f59e0b' },
      discount: { label: 'خصم', icon: 'fa-percentage', color: '#7c3aed' },
      checkout: { label: 'إتمام البيع', icon: 'fa-check-circle', color: '#10b981' },
      clear: { label: 'تفريغ', icon: 'fa-trash', color: '#dc2626' },
      query: { label: 'استعلام', icon: 'fa-question-circle', color: '#1E88E5' },
      search: { label: 'بحث', icon: 'fa-search', color: '#06b6d4' },
      change_qty: { label: 'تغيير كمية', icon: 'fa-edit', color: '#7c3aed' },
      report: { label: 'تقرير', icon: 'fa-chart-bar', color: '#1E88E5' },
      analytics: { label: 'تحليل', icon: 'fa-brain', color: '#7c3aed' },
      advice: { label: 'نصيحة', icon: 'fa-lightbulb', color: '#f59e0b' },
      predict: { label: 'توقع', icon: 'fa-crystal-ball', color: '#06b6d4' },
      scan_rx: { label: 'مسح روشتة', icon: 'fa-camera', color: '#7c3aed' },
      note: { label: 'ملاحظة', icon: 'fa-sticky-note', color: '#f59e0b' },
      help: { label: 'مساعدة', icon: 'fa-life-ring', color: '#64748b' },
      greeting: { label: 'تحية', icon: 'fa-hand-wave', color: '#f59e0b' }
    };

    var h = '';

    h += '<div class="vld-header">';
    h += '<div class="vld-header-icon"><i class="fas fa-brain"></i></div>';
    h += '<div>';
    h += '<h2>لوحة التعلم</h2>';
    h += '<p>كل اللي المساعد اتعلمه منك</p>';
    h += '</div>';
    h += '</div>';

    h += '<div class="vld-kpi-grid">';
    h += vldKpi('التصحيحات', correctionsCount, 'fa-edit', '#7c3aed');
    h += vldKpi('الأوامر', frequencyCount, 'fa-redo', '#00b884');
    h += vldKpi('الأنماط', patternsCount, 'fa-chart-line', '#1E88E5');
    h += vldKpi('الاختصارات', shortcutsCount, 'fa-bolt', '#f59e0b');
    h += vldKpi('الملاحظات', notesCount, 'fa-sticky-note', '#06b6d4');
    h += vldKpi('التفاعلات', frequencyCount + patternsCount, 'fa-comments', '#10b981');
    h += '</div>';

    if (topActions.length > 0) {
      h += '<div class="vld-section">';
      h += '<h4><i class="fas fa-fire"></i> الأكثر استخداماً</h4>';
      h += '<div class="vld-bars">';
      var maxCount = topActions[0].count;
      topActions.forEach(function(a) {
        var info = actionLabels[a.action] || { label: a.action, icon: 'fa-circle', color: '#64748b' };
        var pct = (a.count / maxCount) * 100;
        h += '<div class="vld-bar-row">';
        h += '<div class="vld-bar-label"><i class="fas ' + info.icon + '" style="color:' + info.color + '"></i> ' + info.label + '</div>';
        h += '<div class="vld-bar-track"><div class="vld-bar-fill" style="width:' + pct + '%;background:' + info.color + '"></div></div>';
        h += '<div class="vld-bar-count">' + a.count + '</div>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    if (corrections.length > 0) {
      h += '<div class="vld-section">';
      h += '<h4><i class="fas fa-edit"></i> التصحيحات</h4>';
      h += '<div class="vld-list">';
      corrections.forEach(function(c) {
        h += '<div class="vld-list-item">';
        h += '<span class="vld-wrong">' + escapeHtml(c.wrong) + '</span>';
        h += '<i class="fas fa-arrow-left" style="color:#94a3b8"></i>';
        h += '<span class="vld-right">' + escapeHtml(c.right) + '</span>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    if (patterns.length > 0) {
      h += '<div class="vld-section">';
      h += '<h4><i class="fas fa-chart-line"></i> الأنماط</h4>';
      h += '<div class="vld-list">';
      patterns.forEach(function(p) {
        h += '<div class="vld-list-item vld-pattern">';
        h += '<i class="fas fa-quote-left" style="color:#94a3b8"></i>';
        h += '<span style="flex:1">' + escapeHtml(p.pattern) + '</span>';
        h += '<span class="vld-badge">' + p.count + '×</span>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    if (shortcutsCount > 0) {
      h += '<div class="vld-section">';
      h += '<h4><i class="fas fa-bolt"></i> الاختصارات</h4>';
      h += '<div class="vld-list">';
      Object.keys(shortcuts).forEach(function(trigger) {
        h += '<div class="vld-list-item vld-shortcut">';
        h += '<span class="vld-trigger">"' + escapeHtml(trigger) + '"</span>';
        h += '<i class="fas fa-arrow-left" style="color:#94a3b8"></i>';
        h += '<span style="flex:1;color:#64748b;font-size:.75rem">' + escapeHtml(shortcuts[trigger]) + '</span>';
        h += '</div>';
      });
      h += '</div></div>';
    }

    if (correctionsCount + frequencyCount + patternsCount + shortcutsCount + notesCount === 0) {
      h += '<div class="vld-empty">';
      h += '<i class="fas fa-brain"></i>';
      h += '<h3>لسه مفيش تعلم</h3>';
      h += '<p>ابدأ استخدم المساعد — وهيتعلم من كل أمر تقوله</p>';
      h += '</div>';
    }

    container.innerHTML = h;
    console.log('[Voice POS] Dashboard rendered:', h.length, 'chars');
  }

  function vldKpi(label, value, icon, color) {
    return '<div class="vld-kpi">' +
      '<div class="vld-kpi-icon" style="background:' + color + '"><i class="fas ' + icon + '"></i></div>' +
      '<div class="vld-kpi-value">' + value + '</div>' +
      '<div class="vld-kpi-label">' + label + '</div>' +
      '</div>';
  }

  /* ============================================
     UI
     ============================================ */
  function ensureUI() {
    var existing = document.getElementById('voicePanel');
    if (existing) existing.remove();

    var apiKey = CONFIG.getApiKey();
    var noKey = !apiKey;

    var html = '';
    html += '<div class="vp-overlay" id="voicePanel">';
    html += '<div class="vp-modal">';

    html += '<div class="vp-header">';
    html += '<div class="vp-header-left">';
    html += '<div class="vp-avatar"><i class="fas fa-microphone"></i></div>';
    html += '<div>';
    html += '<h3>المساعد الصوتي <span class="vp-ai-badge">AI PRO</span></h3>';
    html += '<p id="vpStatus">' + (noKey ? 'محتاج مفتاح Groq' : 'اضغط "ابدأ" أو قول "يا صيدلي"') + '</p>';
    html += '</div></div>';
    html += '<div class="vp-header-right">';
    html += '<button type="button" class="vp-header-btn" data-vp-head="wake" id="vpWakeBtn"><i class="fas fa-bell"></i></button>';
    html += '<button type="button" class="vp-header-btn" data-vp-head="dashboard" id="vpDashBtn"><i class="fas fa-brain"></i></button>';
    html += '<button type="button" class="vp-header-btn" data-vp-head="speak" id="vpSpeakBtn"><i class="fas fa-volume-up"></i></button>';
    html += '<button type="button" class="vp-header-btn" data-vp-head="settings"><i class="fas fa-key"></i></button>';
    html += '<button type="button" class="vp-header-btn" data-vp-head="close"><i class="fas fa-times"></i></button>';
    html += '</div></div>';

    // MAIN SCREEN
    html += '<div class="vp-screen vp-screen-main" id="vpScreenMain">';
    html += '<div class="vp-body">';

    if (noKey) {
      html += '<div class="vp-warning-box">';
      html += '<i class="fas fa-exclamation-triangle"></i>';
      html += '<div><strong>مفتاح Groq مطلوب</strong><p>اضبط المفتاح</p></div>';
      html += '<button type="button" class="vp-warning-btn" data-vp-head="settings">اضبط</button>';
      html += '</div>';
    }

    html += '<div class="vp-wake-indicator" id="vpWakeIndicator" style="display:none">';
    html += '<div class="vp-wake-pulse"></div>';
    html += '<span>🎧 في انتظار "يا صيدلي"...</span>';
    html += '</div>';

    html += '<div class="vp-viz-box">';
    html += '<canvas id="voiceVizCanvas" width="800" height="100"></canvas>';
    html += '<div class="vp-viz-overlay"><div class="vp-pulse" id="vpPulse"></div></div>';
    html += '</div>';

    html += '<div class="vp-transcript-box">';
    html += '<div class="vp-transcript-label"><i class="fas fa-quote-right"></i> النص المسموع</div>';
    html += '<div class="vp-transcript-text" id="vpTranscript"><span class="vp-placeholder">اتكلم بحرية — عربي، إنجليزي، أو مكس</span></div>';
    html += '</div>';

    html += '<div class="vp-processing" id="vpProcessing" style="display:none">';
    html += '<div class="vp-dots"><span></span><span></span><span></span></div>';
    html += '<span>جاري الفهم...</span>';
    html += '</div>';

    html += '<div class="vp-result" id="vpResult" style="display:none"></div>';

    html += '<div class="vp-history">';
    html += '<div class="vp-history-head">';
    html += '<div class="vp-history-title"><i class="fas fa-history"></i> آخر الأوامر</div>';
    html += '<button type="button" class="vp-history-clear" data-vp-action="clear-history"><i class="fas fa-trash"></i></button>';
    html += '</div>';
    html += '<div class="vp-history-list" id="vpHistory"></div>';
    html += '</div>';

    html += '<div class="vp-suggestions">';
    html += '<div class="vp-sug-label">جرّب تقول:</div>';
    html += '<div class="vp-sug-list">';
    html += '<button type="button" class="vp-sug" data-test="بيع اتنين بنادول وأدول">بيع 2 بنادول وأدول</button>';
    html += '<button type="button" class="vp-sug" data-test="معدل البيع قد إيه">معدل البيع قد إيه؟</button>';
    html += '<button type="button" class="vp-sug" data-test="أفضل منتج عندنا">أفضل منتج</button>';
    html += '<button type="button" class="vp-sug" data-test="مبيعات النهاردة">مبيعات النهاردة</button>';
    html += '<button type="button" class="vp-sug" data-test="المنتجات اللي خلصت">المنتجات اللي خلصت</button>';
    html += '<button type="button" class="vp-sug" data-test="انصحني بحاجة">انصحني</button>';
    html += '</div></div>';

    html += '</div>';

    html += '<div class="vp-footer">';
    html += '<button type="button" class="vp-action-btn vp-action-secondary" data-vp-action="close"><i class="fas fa-times"></i> إغلاق</button>';
    html += '<button type="button" class="vp-action-btn vp-action-primary" id="vpStartBtn" data-vp-action="start">';
    html += '<i class="fas fa-microphone"></i> <span>ابدأ الاستماع</span></button>';
    html += '</div>';
    html += '</div>';

    // DASHBOARD SCREEN
    html += '<div class="vp-screen vp-screen-dashboard" id="vpScreenDashboard" style="display:none">';
    html += '<div class="vp-body" id="vpDashboardBody"></div>';
    html += '<div class="vp-footer">';
    html += '<button type="button" class="vp-action-btn vp-action-secondary" data-vp-action="back"><i class="fas fa-arrow-right"></i> رجوع</button>';
    html += '<button type="button" class="vp-action-btn vp-action-primary" data-vp-action="reset-learning"><i class="fas fa-trash"></i> مسح كل التعلم</button>';
    html += '</div>';
    html += '</div>';

    html += '</div></div>';

    document.body.insertAdjacentHTML('beforeend', html);

    document.querySelectorAll('.vp-sug').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault(); e.stopPropagation();
        var text = this.getAttribute('data-test');
        if (text) processTranscript(text);
      });
    });

    var panel = document.getElementById('voicePanel');
    if (panel) {
      panel.addEventListener('click', function(e) {
        var actionEl = e.target.closest('[data-vp-action]');
        if (actionEl) {
          var action = actionEl.getAttribute('data-vp-action');
          if (action === 'start') { e.preventDefault(); VoicePOSObj.toggleListening(); }
          else if (action === 'close') { e.preventDefault(); VoicePOSObj.close(); }
          else if (action === 'clear-history') { e.preventDefault(); VoicePOSObj.clearHistory(); }
          else if (action === 'back') { e.preventDefault(); VoicePOSObj.showMainScreen(); }
          else if (action === 'reset-learning') { e.preventDefault(); VoicePOSObj.resetLearning(); }
          return;
        }

        var headEl = e.target.closest('[data-vp-head]');
        if (headEl) {
          var head = headEl.getAttribute('data-vp-head');
          if (head === 'speak') { e.preventDefault(); VoicePOSObj.toggleAutoSpeak(); }
          else if (head === 'settings') { e.preventDefault(); openKeySettings(); }
          else if (head === 'close') { e.preventDefault(); VoicePOSObj.close(); }
          else if (head === 'wake') { e.preventDefault(); VoicePOSObj.toggleWakeWord(); }
          else if (head === 'dashboard') { e.preventDefault(); VoicePOSObj.showDashboard(); }
        }
      }, true);
    }

    updateCommandHistory();
    updateSpeakButton();
    updateWakeButton();

    console.log('[Voice POS] UI built');
  }

  function updateVoiceUI(active) {
    var status = document.getElementById('vpStatus');
    var btn = document.getElementById('vpStartBtn');
    var pulse = document.getElementById('vpPulse');
    var panel = document.querySelector('.vp-modal');
    var apiKey = CONFIG.getApiKey();

    if (status) {
      status.textContent = active
        ? '🔴 جاري التسجيل...'
        : (apiKey ? 'اضغط "ابدأ" أو قول "يا صيدلي"' : 'محتاج مفتاح Groq');
    }

    if (btn) {
      btn.disabled = false;
      btn.style.pointerEvents = 'auto';
      if (active) {
        btn.innerHTML = '<i class="fas fa-stop-circle"></i> <span>إيقاف</span>';
        btn.classList.add('is-active');
      } else {
        btn.innerHTML = '<i class="fas fa-microphone"></i> <span>ابدأ الاستماع</span>';
        btn.classList.remove('is-active');
      }
    }

    if (panel) panel.classList.toggle('is-listening', active);
    if (pulse) pulse.style.display = active ? 'block' : 'none';
  }

  function updateTranscriptDisplay(text, conf) {
    var el = document.getElementById('vpTranscript');
    if (!el) return;
    if (text) {
      el.innerHTML = '<span class="vp-live-text">' + escapeHtml(text) + '</span>';
    } else {
      el.innerHTML = '<span class="vp-placeholder">اتكلم بحرية</span>';
    }
  }

  function updateProcessingState(on) {
    var el = document.getElementById('vpProcessing');
    if (el) el.style.display = on ? 'flex' : 'none';
  }

  function updateResultBanner(result, ai) {
    var el = document.getElementById('vpResult');
    if (!el) return;

    var cls = result.error ? 'error' : (result.success ? 'success' : 'info');
    var icon = result.error ? 'fa-times-circle' : (result.success ? 'fa-check-circle' : 'fa-info-circle');

    el.style.display = 'flex';
    el.className = 'vp-result vp-result-' + cls + ' show';

    var h = '';
    h += '<div class="vp-result-icon"><i class="fas ' + icon + '"></i></div>';
    h += '<div class="vp-result-body">';
    if (ai && ai.action && ai.action !== 'unknown') {
      h += '<div class="vp-result-action">' + escapeHtml(ai.action) + (ai.confidence ? ' · ' + Math.round(ai.confidence * 100) + '%' : '') + '</div>';
    }
    h += '<div class="vp-result-msg">' + escapeHtml(result.message).replace(/\n/g, '<br>') + '</div>';
    h += '</div>';

    el.innerHTML = h;
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.classList.remove('show'); }, 8000);
  }

  function updateCommandHistory() {
    var el = document.getElementById('vpHistory');
    if (!el) return;

    if (VP.history.length === 0) {
      el.innerHTML = '<div class="vp-history-empty">لا توجد أوامر بعد</div>';
      return;
    }

    var actionIcons = {
      add: { i: 'fa-cart-plus', c: '#00b884' },
      remove: { i: 'fa-cart-arrow-down', c: '#f59e0b' },
      discount: { i: 'fa-percentage', c: '#7c3aed' },
      checkout: { i: 'fa-check-circle', c: '#10b981' },
      clear: { i: 'fa-trash', c: '#dc2626' },
      query: { i: 'fa-question-circle', c: '#1E88E5' },
      search: { i: 'fa-search', c: '#06b6d4' },
      change_qty: { i: 'fa-edit', c: '#7c3aed' },
      report: { i: 'fa-chart-bar', c: '#1E88E5' },
      analytics: { i: 'fa-brain', c: '#7c3aed' },
      advice: { i: 'fa-lightbulb', c: '#f59e0b' },
      predict: { i: 'fa-crystal-ball', c: '#06b6d4' },
      scan_rx: { i: 'fa-camera', c: '#7c3aed' },
      note: { i: 'fa-sticky-note', c: '#f59e0b' },
      help: { i: 'fa-life-ring', c: '#64748b' },
      greeting: { i: 'fa-hand-wave', c: '#f59e0b' },
      unknown: { i: 'fa-question', c: '#64748b' }
    };

    el.innerHTML = VP.history.slice(0, 8).map(function(item) {
      var firstAction = (item.action || 'unknown').split(' + ')[0];
      var ic = actionIcons[firstAction] || actionIcons.unknown;
      var cls = item.success ? 'success' : 'error';
      return '<div class="vp-history-item vp-history-' + cls + '">' +
        '<div class="vp-history-icon" style="background:' + ic.c + '">' +
          '<i class="fas ' + ic.i + '"></i>' +
        '</div>' +
        '<div class="vp-history-content">' +
          '<div class="vp-history-text">' + escapeHtml(item.text) + '</div>' +
          '<div class="vp-history-result">' + escapeHtml(item.result).substring(0, 60) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function updateSpeakButton() {
    var btn = document.getElementById('vpSpeakBtn');
    if (!btn) return;
    btn.classList.toggle('is-active', VP.autoSpeak);
    btn.innerHTML = VP.autoSpeak ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
  }

  function updateWakeButton() {
    var btn = document.getElementById('vpWakeBtn');
    if (!btn) return;
    btn.classList.toggle('is-active', VP.wakeWordEnabled);
    btn.title = VP.wakeWordEnabled ? 'إيقاف Wake Word' : 'تفعيل Wake Word';
  }

  /* ============================================
     INLINE ERROR
     ============================================ */
  function showInlineError(msg) {
    var body = document.querySelector('.vp-screen-main .vp-body');
    if (!body) return;

    var el = document.getElementById('vpInlineError');
    if (!el) {
      el = document.createElement('div');
      el.id = 'vpInlineError';
      el.className = 'vp-inline-error';
      body.insertBefore(el, body.firstChild);
    }

    el.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>' + escapeHtml(msg) + '</span>';
    el.style.display = 'flex';

    clearTimeout(el._t);
    el._t = setTimeout(function() { el.style.display = 'none'; }, 6000);
  }

  function clearInlineError() {
    var el = document.getElementById('vpInlineError');
    if (el) el.style.display = 'none';
  }

  /* ============================================
     KEY SETTINGS
     ============================================ */
  function openKeySettings() {
    var current = CONFIG.getApiKey();
    var masked = current ? current.slice(0, 10) + '...' + current.slice(-6) : '';

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML =
      '<div class="ph-modal-head">' +
        '<h3><i class="fas fa-key"></i> إعدادات Groq</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="ph-modal-body">' +
        '<div class="form-group">' +
          '<label>Groq API Key</label>' +
          '<input type="password" id="vpApiKeyInput" placeholder="gsk_..." value="' + (current || '') + '" style="font-family:monospace;font-size:.85rem">' +
          (masked ? '<div style="font-size:.7rem;color:var(--text-muted);margin-top:4px">الحالي: ' + masked + '</div>' : '') +
        '</div>' +
      '</div>' +
      '<div class="ph-modal-foot">' +
        '<button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
        '<button class="btn btn-primary" onclick="VoicePOS.saveKey()"><i class="fas fa-save"></i> حفظ</button>' +
      '</div>';

    var overlay = document.getElementById('phModalOverlay');
    if (overlay) overlay.classList.add('open');
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  var VoicePOSObj = {
    open: function() {
      ensureUI();
      var panel = document.getElementById('voicePanel');
      if (panel) {
        panel.classList.add('open');
        document.body.style.overflow = 'hidden';
      }
    },

    close: function() {
      stopListening();
      var panel = document.getElementById('voicePanel');
      if (panel) panel.classList.remove('open');
      document.body.style.overflow = '';
    },

    toggleListening: function() {
      if (!CONFIG.getApiKey()) {
        showInlineError('⚠️ محتاج مفتاح Groq');
        return;
      }
      if (VP.isRecording) stopListening();
      else startListening();
    },

    toggleAutoSpeak: function() {
      VP.autoSpeak = !VP.autoSpeak;
      updateSpeakButton();
    },

    toggleWakeWord: function() {
      if (VP.wakeWordEnabled) {
        stopWakeWordListener();
        if (window.Dialog) Dialog.success('تم الإيقاف', 'Wake Word متوقف');
      } else {
        startWakeWordListener();
        if (window.Dialog) Dialog.success('تم التفعيل', 'قول "يا صيدلي"');
      }
      updateWakeButton();
    },

    simulate: function(text) {
      if (!text) return;
      var el = document.getElementById('vpTranscript');
      if (el) el.innerHTML = '<span class="vp-live-text">' + escapeHtml(text) + '</span>';
      processTranscript(text);
    },

    clearHistory: function() {
      VP.history = [];
      updateCommandHistory();
    },

    openKeySettings: openKeySettings,

    showDashboard: function() {
      var mainScreen = document.getElementById('vpScreenMain');
      var dashScreen = document.getElementById('vpScreenDashboard');
      var dashBody = document.getElementById('vpDashboardBody');

      console.log('[Voice POS] showDashboard called');
      console.log('mainScreen:', !!mainScreen, 'dashScreen:', !!dashScreen, 'dashBody:', !!dashBody);

      if (!mainScreen || !dashScreen || !dashBody) {
        console.error('[Voice POS] Dashboard elements missing');
        return;
      }

      mainScreen.style.display = 'none';
      dashScreen.style.display = 'flex';

      try {
        renderDashboardContent(dashBody);
        console.log('[Voice POS] Dashboard rendered, length:', dashBody.innerHTML.length);
      } catch (e) {
        console.error('[Voice POS] Render error:', e);
        dashBody.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">' +
          '<i class="fas fa-bug" style="font-size:2rem"></i>' +
          '<h3>خطأ في العرض</h3>' +
          '<pre style="text-align:start;font-size:.75rem;background:#f8fafc;padding:12px;border-radius:8px;margin-top:12px;direction:ltr">' +
            escapeHtml(e.message + '\n' + (e.stack || '').slice(0, 400)) +
          '</pre>' +
        '</div>';
      }
    },

    showMainScreen: function() {
      var mainScreen = document.getElementById('vpScreenMain');
      var dashScreen = document.getElementById('vpScreenDashboard');
      if (mainScreen) mainScreen.style.display = 'flex';
      if (dashScreen) dashScreen.style.display = 'none';
    },

    resetLearning: function() {
      if (window.Dialog) {
        Dialog.confirm({
          type: 'danger',
          title: 'مسح كل التعلم',
          message: 'هيتم مسح كل التصحيحات والأنماط والاختصارات.\n\nمتأكد؟',
          confirmText: 'نعم، امسح الكل',
          cancelText: 'إلغاء'
        }).then(function(ok) {
          if (!ok) return;
          try {
            localStorage.removeItem(CONFIG.LEARN_KEY);
            localStorage.removeItem(CONFIG.SHORTCUTS_KEY);
            localStorage.removeItem(CONFIG.NOTES_KEY);
          } catch (e) {}
          VoicePOSObj.showDashboard();
          if (window.Dialog) Dialog.success('تم', 'التعلم اتمسح');
        });
      }
    },

    openDashboard: function() { this.showDashboard(); },

    saveKey: function() {
      var input = document.getElementById('vpApiKeyInput');
      if (!input) return;
      var key = input.value.trim();
      if (!key || key.length < 20 || key.indexOf('gsk_') !== 0) {
        if (window.Dialog) Dialog.error('مفتاح غير صالح', 'لازم يبدأ بـ gsk_');
        return;
      }
      if (CONFIG.setApiKey(key)) {
        if (window.Dialog) Dialog.success('تم الحفظ', 'المفتاح اتحدث');
        if (typeof phCloseModal === 'function') phCloseModal();
        var panel = document.getElementById('voicePanel');
        if (panel) panel.remove();
        setTimeout(function() { VoicePOSObj.open(); }, 300);
      }
    },

    clearKey: function() {
      CONFIG.clearApiKey();
      if (typeof phCloseModal === 'function') phCloseModal();
    },

    getLearning: function() { return Learning.all(); },
    getShortcuts: function() { return Shortcuts.all(); },
    getNotes: function() { return VoiceNotes.all(); },
    getStats: function() { return Learning.stats(); },
    getFullContext: function() { return buildContext(); },
    resetLearningData: function() { Learning.reset(); }
  };

  /* ============================================
     FORCE ATTACH
     ============================================ */
  window.VoicePOS = VoicePOSObj;
  window.PCVoiceAI = VoicePOSObj;
  window.VoiceAssistant = VoicePOSObj;
  window.VPAI = VoicePOSObj;

  window.voiceCommand = function(text) { return processTranscript(text); };
  window.voiceOpen = function() { return VoicePOSObj.open(); };
  window.voiceClose = function() { return VoicePOSObj.close(); };
  window.startVoicePOS = function() { VoicePOSObj.open(); };
  window.stopVoicePOS = function() { VoicePOSObj.close(); };
  window.startVoicePOSv2 = function() { VoicePOSObj.open(); };
  window.stopVoicePOSv2 = function() { VoicePOSObj.close(); };

  /* ============================================
     BIND SIDEBAR BUTTON
     ============================================ */
  function bindVoiceSidebarButton() {
    var items = document.querySelectorAll('.ph-item');
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var oc = item.getAttribute('onclick') || '';
      var txt = item.textContent || '';

      var isVoiceBtn =
        oc.indexOf("'voice'") !== -1 ||
        txt.indexOf('Voice POS') !== -1 ||
        oc.indexOf('startVoicePOS') !== -1;

      if (isVoiceBtn && !item.dataset.voiceBound) {
        item.dataset.voiceBound = 'true';
        item.removeAttribute('onclick');
        item.onclick = null;

        item.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          document.querySelectorAll('.ph-item').forEach(function(x) {
            x.classList.remove('active');
          });
          this.classList.add('active');

          if (window.innerWidth <= 768) {
            var sb = document.getElementById('phSidebar');
            if (sb) sb.classList.remove('open');
          }

          VoicePOSObj.open();
        }, true);

        console.log('[Voice POS] ✅ Sidebar button bound');
        return true;
      }
    }
    return false;
  }

  var _voiceBindTries = 0;
  var _voiceBindTimer = setInterval(function() {
    _voiceBindTries++;
    if (bindVoiceSidebarButton() || _voiceBindTries > 30) {
      clearInterval(_voiceBindTimer);
    }
  }, 500);

  try {
    var _voiceObs = new MutationObserver(function() {
      bindVoiceSidebarButton();
    });
    _voiceObs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  setTimeout(function() {
    var oldIndicator = document.getElementById('voiceIndicator');
    if (oldIndicator) {
      oldIndicator.style.display = 'none';
      oldIndicator.style.visibility = 'hidden';
    }
  }, 1500);

  console.log('[Voice POS AI v5.0] Loaded — Full Access + Analytics + Reports + Dashboard');
  console.log('[Voice POS AI] Learning stats:', Learning.stats());
})();