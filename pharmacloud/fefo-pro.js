/* ============================================
   PHARMACLOUD - FEFO PRO v3.0
   AI-Powered Expiry Command Center
   ============================================ */
'use strict';

(function() {

  /* ============================================
     FALLBACK HELPERS
     ============================================ */
  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    var m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, function(c) { return m[c]; });
  };

  var FEFO_PRO = {
    data: null,
    charts: {},
    filter: 'all',
    sortBy: 'risk'
  };

  /* ============================================
     DIALOG CONTAINER HELPER
     ============================================ */
  function ensureDialogContainer() {
    var id = 'fefoDialogContainer';
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = 'dlg-container';
    document.body.appendChild(el);
    return el;
  }

  /* ============================================
     HELPER FUNCTIONS
     ============================================ */
  function formatDate(d) {
    try {
      return new Date(d).toLocaleDateString('en-GB');
    } catch (e) { return '—'; }
  }

  function formatMoney(n) {
    return Math.round(n || 0).toLocaleString('en-US');
  }

  /* ============================================
     AI RISK SCORING ENGINE
     ============================================ */
  function calculateRiskScore(batch, product, salesData) {
    var days = batch.daysLeft;
    var qty = batch.quantity || 0;
    var cost = (batch.quantity || 0) * (batch.cost || 0);
    var score = 0;

    // 1. Days factor (50%)
    if (days < 0) score += 50;
    else if (days <= 7) score += 45;
    else if (days <= 15) score += 38;
    else if (days <= 30) score += 28;
    else if (days <= 60) score += 18;
    else if (days <= 90) score += 8;

    // 2. Value factor (30%)
    if (cost > 5000) score += 30;
    else if (cost > 2000) score += 24;
    else if (cost > 1000) score += 18;
    else if (cost > 500) score += 12;
    else if (cost > 100) score += 6;

    // 3. Quantity factor (10%)
    if (qty > 100) score += 10;
    else if (qty > 50) score += 7;
    else if (qty > 20) score += 4;

    // 4. Sales velocity (10%)
    var velocity = (salesData && salesData.avgDaily) ? salesData.avgDaily : 0;
    if (velocity > 0) {
      var daysToSellAll = qty / velocity;
      if (daysToSellAll < days) score -= 5;
      else score += 5;
    }

    return Math.min(100, Math.max(0, Math.round(score)));
  }

  function getRiskLevel(score) {
    if (score >= 80) return { level: 'critical', label: 'حرج جداً', color: '#dc2626', icon: 'fa-radiation' };
    if (score >= 60) return { level: 'high', label: 'خطر عالي', color: '#ea580c', icon: 'fa-exclamation-triangle' };
    if (score >= 40) return { level: 'medium', label: 'متوسط', color: '#f59e0b', icon: 'fa-exclamation-circle' };
    if (score >= 20) return { level: 'low', label: 'بسيط', color: '#0ea5e9', icon: 'fa-info-circle' };
    return { level: 'safe', label: 'آمن', color: '#10b981', icon: 'fa-check-circle' };
  }

  /* ============================================
     DISCOUNT OPTIMIZER
     ============================================ */
  function optimizeDiscount(batch, days, velocity) {
    var base = 0;
    if (days <= 0) base = 100;
    else if (days <= 7) base = 50;
    else if (days <= 15) base = 40;
    else if (days <= 30) base = 25;
    else if (days <= 45) base = 18;
    else if (days <= 60) base = 12;
    else if (days <= 90) base = 6;

    if (velocity > 2 && days > 15) base = Math.max(base - 5, 5);
    if (velocity < 0.5 && days <= 30) base = Math.min(base + 10, 60);

    if (batch.quantity > 50 && base > 0) base = Math.min(base + 5, 60);

    return Math.max(0, Math.round(base));
  }

  /* ============================================
     SALES VELOCITY
     ============================================ */
  function getSalesVelocity(tid) {
    var result = {};
    try {
      var orders = DB.getTenantData(tid, 'orders') || [];
      var cutoff = Date.now() - 30 * 86400000;
      var recent = orders.filter(function(o) {
        return new Date(o.createdAt).getTime() >= cutoff;
      });
      recent.forEach(function(o) {
        (o.items || []).forEach(function(it) {
          if (!result[it.id]) result[it.id] = { totalQty: 0, avgDaily: 0 };
          result[it.id].totalQty += it.qty;
        });
      });
      Object.keys(result).forEach(function(id) {
        result[id].avgDaily = result[id].totalQty / 30;
      });
    } catch (e) {}
    return result;
  }

  /* ============================================
     ANALYZE ALL DATA
     ============================================ */
  function analyzeAll(tid) {
    var data = FEFO.analyze(tid);
    var products = DB.getTenantData(tid, 'products') || [];
    var velocity = getSalesVelocity(tid);

    data.all.forEach(function(b) {
      var product = products.find(function(p) { return p.id === b.productId; });
      var sales = velocity[b.productId] || { avgDaily: 0, totalQty: 0 };
      b.riskScore = calculateRiskScore(b, product, sales);
      b.riskLevel = getRiskLevel(b.riskScore);
      b.optimizedDiscount = optimizeDiscount(b, b.daysLeft, sales.avgDaily);
      b.avgDaily = sales.avgDaily;
      b.daysToSell = sales.avgDaily > 0 ? Math.round(b.quantity / sales.avgDaily) : null;
      b.value = (b.quantity || 0) * (b.cost || 0);
      b.category = product ? product.category : 'أخرى';
      b.canBeSaved = (b.daysToSell !== null) && (b.daysToSell <= b.daysLeft) && b.daysLeft > 0;

      // ← جديد: بيانات الخصم الحالي
      b.currentPrice = product ? (product.price || 0) : 0;
      b.originalPrice = (product && product.originalPrice) ? product.originalPrice : (product ? product.price : 0);
      b.hasDiscount = !!(product && product.originalPrice && product.originalPrice > product.price);
      b.discountPercent = b.hasDiscount
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0;
    });

    var financial = {
      totalValue: data.all.reduce(function(s, b) { return s + b.value; }, 0),
      atRiskValue: data.all.filter(function(b) { return b.daysLeft >= 0 && b.daysLeft <= 90; })
        .reduce(function(s, b) { return s + b.value; }, 0),
      criticalValue: data.all.filter(function(b) { return b.daysLeft >= 0 && b.daysLeft <= 30; })
        .reduce(function(s, b) { return s + b.value; }, 0),
      expiredValue: data.all.filter(function(b) { return b.daysLeft < 0; })
        .reduce(function(s, b) { return s + b.value; }, 0),
      saveableValue: data.all.filter(function(b) { return b.canBeSaved; })
        .reduce(function(s, b) { return s + b.value * (1 - b.optimizedDiscount / 100); }, 0),
      projectedLoss: data.all.filter(function(b) { return b.daysLeft <= 30 && b.daysLeft >= 0; })
        .reduce(function(s, b) { return s + b.value; }, 0)
    };

    var categories = {};
    data.all.forEach(function(b) {
      if (!categories[b.category]) {
        categories[b.category] = { count: 0, value: 0, atRisk: 0, critical: 0 };
      }
      categories[b.category].count++;
      categories[b.category].value += b.value;
      if (b.daysLeft >= 0 && b.daysLeft <= 90) categories[b.category].atRisk += b.value;
      if (b.daysLeft >= 0 && b.daysLeft <= 30) categories[b.category].critical += b.value;
    });

    var recommendations = generateRecommendations(data.all);

    return {
      batches: data.all,
      expired: data.expired,
      critical: data.critical,
      warning: data.warning,
      info: data.info,
      safe: data.safe,
      financial: financial,
      categories: categories,
      recommendations: recommendations
    };
  }

  /* ============================================
     SMART RECOMMENDATIONS ENGINE
     ============================================ */
  function generateRecommendations(batches) {
    var recs = [];

    var urgent = batches.filter(function(b) {
      return b.daysLeft >= 0 && b.daysLeft <= 15 && b.quantity > 20;
    });
    if (urgent.length > 0) {
      var totalValue = urgent.reduce(function(s, b) { return s + b.value; }, 0);
      recs.push({
        type: 'urgent',
        icon: 'fa-fire',
        color: '#dc2626',
        title: urgent.length + ' باتش يحتاج إجراء فوري',
        desc: 'قيمة ' + formatMoney(totalValue) + ' ج.م على وشك الخسارة — طبّق خصومات الآن',
        action: 'apply-urgent'
      });
    }

    var saveable = batches.filter(function(b) { return b.canBeSaved; });
    if (saveable.length > 0) {
      var saveValue = saveable.reduce(function(s, b) { return s + b.value; }, 0);
      recs.push({
        type: 'opportunity',
        icon: 'fa-lightbulb',
        color: '#10b981',
        title: saveable.length + ' باتش يمكن إنقاذه',
        desc: 'بمعدل البيع الحالي، هتخلص قبل ما تنتهي — قيمة ' + formatMoney(saveValue) + ' ج.م',
        action: 'show-saveable'
      });
    }

    var expired = batches.filter(function(b) { return b.daysLeft < 0; });
    if (expired.length > 0) {
      var expValue = expired.reduce(function(s, b) { return s + b.value; }, 0);
      recs.push({
        type: 'dispose',
        icon: 'fa-trash',
        color: '#64748b',
        title: expired.length + ' باتش منتهي يحتاج إعدام',
        desc: 'قيمة ' + formatMoney(expValue) + ' ج.م — يجب إعدامها بشكل آمن',
        action: 'dispose-all'
      });
    }

    var byCat = {};
    batches.filter(function(b) { return b.daysLeft >= 0 && b.daysLeft <= 60; }).forEach(function(b) {
      if (!byCat[b.category]) byCat[b.category] = [];
      byCat[b.category].push(b);
    });
    Object.keys(byCat).forEach(function(cat) {
      if (byCat[cat].length >= 3) {
        recs.push({
          type: 'bundle',
          icon: 'fa-box-open',
          color: '#7c3aed',
          title: 'فرصة Bundle في "' + cat + '"',
          desc: byCat[cat].length + ' منتجات قريبة الانتهاء — أنشئ عرض Bundle بخصم موحد',
          action: 'create-bundle'
        });
      }
    });

    return recs;
  }

  /* ============================================
     RENDER MAIN PAGE
     ============================================ */
  function renderFEFO() {
    var content = document.getElementById('phContent');
    if (!content) {
      console.error('[FEFO-Pro] phContent not found');
      return;
    }

    var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
    if (!tid) {
      content.innerHTML = '<div class="ph-empty"><i class="fas fa-boxes"></i><h4>لا توجد بيانات</h4></div>';
      return;
    }

    var analysis;
    try {
      analysis = analyzeAll(tid);
    } catch (e) {
      console.error('[FEFO-Pro] analyze error:', e);
      content.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">' +
        '<i class="fas fa-bug" style="font-size:3rem"></i>' +
        '<h3 style="margin-top:16px">خطأ في التحليل</h3>' +
        '<p>' + escapeHtml(e.message) + '</p></div>';
      return;
    }

    FEFO_PRO.data = analysis;

    var html = '';

    // HERO HEADER
    html += renderHeroHeader(analysis);

    // AI ALERT BANNER
    html += renderAIAlert(analysis);

    // KPI ROW
    html += renderKPIs(analysis);

    // FINANCIAL IMPACT
    html += '<div class="fefo-section-title">';
    html += '<i class="fas fa-chart-line" style="color:#dc2626"></i>';
    html += '<span>التحليل المالي للخسائر المحتملة</span>';
    html += '</div>';
    html += '<div class="fefo-charts-row">';
    html += '<div class="fefo-chart-card fefo-chart-large">';
    html += '<div class="fefo-chart-head"><h3><i class="fas fa-chart-area"></i> توزيع القيمة على المخاطر</h3></div>';
    html += '<div class="fefo-chart-wrap"><canvas id="fefoValueChart"></canvas></div>';
    html += '</div>';
    html += '<div class="fefo-chart-card">';
    html += '<div class="fefo-chart-head"><h3><i class="fas fa-chart-pie"></i> حالة الباتشات</h3></div>';
    html += '<div class="fefo-chart-wrap"><canvas id="fefoStatusChart"></canvas></div>';
    html += '</div>';
    html += '</div>';

    // AI RECOMMENDATIONS
    if (analysis.recommendations.length > 0) {
      html += '<div class="fefo-section-title">';
      html += '<i class="fas fa-robot" style="color:#7c3aed"></i>';
      html += '<span>توصيات الذكاء الاصطناعي</span>';
      html += '<span class="fefo-section-badge">' + analysis.recommendations.length + '</span>';
      html += '</div>';
      html += '<div class="fefo-recommendations">';
      analysis.recommendations.forEach(function(r) {
        html += '<div class="fefo-rec-card" data-type="' + r.type + '" style="--rec-color:' + r.color + '">';
        html += '<div class="fefo-rec-icon" style="background:' + r.color + '">';
        html += '<i class="fas ' + r.icon + '"></i>';
        html += '</div>';
        html += '<div class="fefo-rec-body">';
        html += '<h4>' + escapeHtml(r.title) + '</h4>';
        html += '<p>' + escapeHtml(r.desc) + '</p>';
        html += '</div>';
        html += '<button class="fefo-rec-btn" onclick="FEFOPro.handleRecommendation(\'' + r.action + '\')" style="--rec-color:' + r.color + '">';
        html += '<i class="fas fa-arrow-left"></i>';
        html += '</button>';
        html += '</div>';
      });
      html += '</div>';
    }

    // CATEGORY HEATMAP
    html += '<div class="fefo-section-title">';
    html += '<i class="fas fa-th-large" style="color:#f59e0b"></i>';
    html += '<span>مخاطر الفئات</span>';
    html += '</div>';
    html += renderCategoryHeatmap(analysis.categories);

    // EXPIRY TIMELINE
    html += '<div class="fefo-section-title">';
    html += '<i class="fas fa-stream" style="color:#1E88E5"></i>';
    html += '<span>الخط الزمني للانتهاء</span>';
    html += '</div>';
    html += '<div class="fefo-chart-card" style="margin-bottom:24px">';
    html += '<div class="fefo-chart-head"><h3><i class="fas fa-calendar-alt"></i> الباتشات على مدار 12 شهر قادم</h3></div>';
    html += '<div class="fefo-chart-wrap" style="height:280px"><canvas id="fefoTimelineChart"></canvas></div>';
    html += '</div>';

    // DETAILED TABLES
    html += '<div class="fefo-section-title">';
    html += '<i class="fas fa-list" style="color:#00b884"></i>';
    html += '<span>التفاصيل الكاملة</span>';
    html += '</div>';

    if (analysis.expired.length > 0) html += renderTable('منتهي — إعدام فوري', 'fa-times-circle', analysis.expired, 'danger');
    if (analysis.critical.length > 0) html += renderTable('حرج — أقل من 30 يوم', 'fa-exclamation-triangle', analysis.critical, 'danger');
    if (analysis.warning.length > 0) html += renderTable('تحذير — أقل من 60 يوم', 'fa-clock', analysis.warning, 'warning');
    if (analysis.info.length > 0) html += renderTable('تنبيه — أقل من 90 يوم', 'fa-info-circle', analysis.info, 'info');
    if (analysis.safe.length > 0) html += renderTable('آمن — أكثر من 90 يوم', 'fa-check-circle', analysis.safe, 'safe');

    if (analysis.batches.length === 0) {
      html += '<div class="ph-empty"><i class="fas fa-boxes"></i>';
      html += '<h4>لا توجد باتشات</h4>';
      html += '<p style="margin-top:8px">اضغط "إضافة باتش" لبدء التتبع</p></div>';
    }

    content.innerHTML = html;

    setTimeout(function() { renderCharts(analysis); }, 100);

    console.log('[FEFO-Pro] ✅ Rendered');
  }

  /* ============================================
     HERO HEADER
     ============================================ */
  function renderHeroHeader(analysis) {
    var totalBatches = analysis.batches.length;
    var riskCount = analysis.critical.length + analysis.expired.length;
    var healthScore = totalBatches > 0
      ? Math.max(0, Math.round(100 - (riskCount / totalBatches) * 100))
      : 100;

    var scoreColor = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#dc2626';
    var scoreLabel = healthScore >= 80 ? 'ممتاز' : healthScore >= 60 ? 'جيد' : 'يحتاج انتباه';

    var h = '<div class="fefo-hero">';
    h += '<div class="fefo-hero-content">';
    h += '<div class="fefo-hero-badge"><i class="fas fa-crown"></i> FEFO Intelligence Pro</div>';
    h += '<h1 class="fefo-hero-title">مركز قيادة الصلاحية</h1>';
    h += '<p class="fefo-hero-subtitle">مدعوم بالذكاء الاصطناعي — تحليل تنبؤي لكل باتش</p>';
    h += '<div class="fefo-hero-actions">';
    h += '<button class="btn btn-outline btn-sm" onclick="FEFOPro.exportExcel()">';
    h += '<i class="fas fa-file-excel"></i> تصدير Excel</button>';
    h += '<button class="btn btn-primary btn-sm" onclick="FEFOPro.openAddBatch()">';
    h += '<i class="fas fa-plus"></i> إضافة باتش</button>';
    h += '</div>';
    h += '</div>';
    h += '<div class="fefo-health-score">';
    h += '<div class="fefo-score-circle" style="--score:' + healthScore + ';--score-color:' + scoreColor + '">';
    h += '<svg viewBox="0 0 120 120">';
    h += '<circle cx="60" cy="60" r="52" stroke="#e2e8f0" stroke-width="8" fill="none"/>';
    h += '<circle cx="60" cy="60" r="52" stroke="' + scoreColor + '" stroke-width="8" fill="none" ' +
         'stroke-dasharray="' + (healthScore * 3.27) + ', 327" ' +
         'stroke-linecap="round" transform="rotate(-90 60 60)"/>';
    h += '</svg>';
    h += '<div class="fefo-score-value">' + healthScore + '</div>';
    h += '<div class="fefo-score-label">' + scoreLabel + '</div>';
    h += '</div>';
    h += '<div class="fefo-score-title">صحة المخزون</div>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  /* ============================================
     AI ALERT BANNER
     ============================================ */
  function renderAIAlert(analysis) {
    var expired = analysis.expired.length;
    var critical = analysis.critical.length;

    if (expired === 0 && critical === 0) {
      return '<div class="fefo-ai-alert fefo-ai-success">' +
        '<i class="fas fa-check-circle"></i>' +
        '<div class="fefo-ai-alert-body">' +
        '<strong>مخزونك في حالة ممتازة</strong>' +
        '<p>لا توجد باتشات منتهية أو حرجة — استمر في التتبع الجيد</p>' +
        '</div></div>';
    }

    var msg = '';
    if (expired > 0) msg += expired + ' باتش منتهي';
    if (expired > 0 && critical > 0) msg += ' • ';
    if (critical > 0) msg += critical + ' باتش حرج';

    return '<div class="fefo-ai-alert fefo-ai-danger">' +
      '<div class="fefo-ai-pulse"></div>' +
      '<i class="fas fa-exclamation-triangle"></i>' +
      '<div class="fefo-ai-alert-body">' +
      '<strong>تحذير ذكي: ' + msg + '</strong>' +
      '<p>يُنصح بالتحرك فوراً لتفادي خسارة ' + formatMoney(analysis.financial.projectedLoss) + ' ج.م</p>' +
      '</div>' +
      '<button class="fefo-ai-btn" onclick="FEFOPro.scrollToCritical()">' +
      '<i class="fas fa-arrow-down"></i> عرض</button>' +
      '</div>';
  }

  /* ============================================
     KPI ROW
     ============================================ */
  function renderKPIs(analysis) {
    var f = analysis.financial;
    var h = '<div class="fefo-kpi-grid">';

    h += kpiCard('إجمالي الباتشات', analysis.batches.length, 'fa-boxes', '#1E88E5', null, '');
    h += kpiCard('قيمة المخزون', formatMoney(f.totalValue), 'fa-dollar-sign', '#10b981', null, ' ج.م');
    h += kpiCard('القيمة تحت الخطر', formatMoney(f.atRiskValue), 'fa-exclamation-triangle', '#f59e0b', '90 يوم', ' ج.م');
    h += kpiCard('الخسائر المتوقعة', formatMoney(f.projectedLoss), 'fa-fire', '#dc2626', '30 يوم', ' ج.م');
    h += kpiCard('قابل للإنقاذ', formatMoney(f.saveableValue), 'fa-shield-alt', '#7c3aed', 'AI توقع', ' ج.م');
    h += kpiCard('منتهي فعلياً', formatMoney(f.expiredValue), 'fa-times-circle', '#64748b', null, ' ج.م');

    h += '</div>';
    return h;
  }

  function kpiCard(label, value, icon, color, badge, suffix) {
    var h = '<div class="fefo-kpi-card-v2">';
    h += '<div class="fefo-kpi-head">';
    h += '<div class="fefo-kpi-icon-v2" style="background:linear-gradient(135deg,' + color + ',' + color + 'cc)">';
    h += '<i class="fas ' + icon + '"></i></div>';
    if (badge) h += '<span class="fefo-kpi-badge">' + badge + '</span>';
    h += '</div>';
    h += '<div class="fefo-kpi-value-v2">' + value + '<small>' + (suffix || '') + '</small></div>';
    h += '<div class="fefo-kpi-label-v2">' + label + '</div>';
    h += '</div>';
    return h;
  }

  /* ============================================
     CATEGORY HEATMAP
     ============================================ */
  function renderCategoryHeatmap(categories) {
    var entries = Object.keys(categories).map(function(k) {
      return Object.assign({ name: k }, categories[k]);
    }).sort(function(a, b) { return b.critical - a.critical; });

    if (entries.length === 0) {
      return '<div class="ph-empty" style="padding:30px"><i class="fas fa-th-large"></i><h4>لا توجد بيانات</h4></div>';
    }

    var maxCritical = Math.max.apply(Math, entries.map(function(e) { return e.critical; }).concat([1]));

    var h = '<div class="fefo-heatmap">';
    entries.forEach(function(cat) {
      var intensity = cat.critical / maxCritical;
      var level = 'low';
      if (intensity > 0.7) level = 'critical';
      else if (intensity > 0.4) level = 'high';
      else if (intensity > 0.1) level = 'medium';

      h += '<div class="fefo-heatmap-card fefo-heat-' + level + '">';
      h += '<div class="fefo-heat-head">';
      h += '<span class="fefo-heat-name">' + escapeHtml(cat.name) + '</span>';
      h += '<span class="fefo-heat-count">' + cat.count + ' باتش</span>';
      h += '</div>';
      h += '<div class="fefo-heat-bar">';
      h += '<div class="fefo-heat-fill" style="width:' + (intensity * 100) + '%"></div>';
      h += '</div>';
      h += '<div class="fefo-heat-stats">';
      h += '<span><i class="fas fa-exclamation-triangle"></i> ' + formatMoney(cat.critical) + '</span>';
      h += '<span><i class="fas fa-coins"></i> ' + formatMoney(cat.value) + '</span>';
      h += '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  /* ============================================
     TABLE
     ============================================ */
  function renderTable(title, icon, list, cls) {
    var h = '';
    h += '<div class="fefo-table-card fefo-cls-' + cls + '">';
    h += '<div class="fefo-table-head">';
    h += '<h3 class="fefo-table-title">';
    h += '<i class="fas ' + icon + '"></i>';
    h += '<span>' + title + '</span>';
    h += '<span class="fefo-count">' + list.length + '</span>';
    h += '</h3>';
    h += '</div>';
    h += '<div class="fefo-table-wrap">';
    h += '<table class="fefo-table">';
    h += '<thead><tr>';
    h += '<th>المنتج</th>';
    h += '<th>الباتش</th>';
    h += '<th>الكمية</th>';
    h += '<th>الانتهاء</th>';
    h += '<th>الأيام</th>';
    h += '<th>درجة الخطر</th>';
    h += '<th>القيمة</th>';
    h += '<th>إجراء AI</th>';
    h += '</tr></thead><tbody>';

    list.forEach(function(b) {
      var days = (typeof b.daysLeft === 'number') ? b.daysLeft : 0;
      var badgeCls, badgeText;

      if (days < 0) {
        badgeCls = 'fefo-badge-danger';
        badgeText = 'منتهي';
      } else if (days <= 30) {
        badgeCls = 'fefo-badge-danger';
        badgeText = days + ' يوم';
      } else if (days <= 60) {
        badgeCls = 'fefo-badge-warning';
        badgeText = days + ' يوم';
      } else {
        badgeCls = 'fefo-badge-info';
        badgeText = days + ' يوم';
      }

      var riskColor = b.riskLevel.color;

      h += '<tr>';
      h += '<td><strong>' + escapeHtml(b.productName || '—') + '</strong>';
      if (b.category) h += '<div style="font-size:.72rem;color:var(--text-muted);margin-top:2px">' + escapeHtml(b.category) + '</div>';
      h += '</td>';
      h += '<td><code class="fefo-code">' + escapeHtml(b.batchNo || '—') + '</code></td>';
      h += '<td>' + (b.quantity || 0) + '</td>';
      h += '<td>' + formatDate(b.expiryDate) + '</td>';
      h += '<td><span class="fefo-badge ' + badgeCls + '">' + badgeText + '</span></td>';
      h += '<td>';
      h += '<div class="fefo-risk-cell">';
      h += '<div class="fefo-risk-ring" style="--risk:' + b.riskScore + ';--color:' + riskColor + '">';
      h += '<svg viewBox="0 0 36 36">';
      h += '<circle cx="18" cy="18" r="15.9" stroke-width="3" fill="none" stroke="#e2e8f0"/>';
      h += '<circle cx="18" cy="18" r="15.9" stroke-width="3" fill="none" stroke="' + riskColor + '" ' +
           'stroke-dasharray="' + b.riskScore + ', 100" transform="rotate(-90 18 18)" stroke-linecap="round"/>';
      h += '</svg>';
      h += '<span>' + b.riskScore + '</span>';
      h += '</div>';
      h += '<span class="fefo-risk-label" style="color:' + riskColor + '">' + b.riskLevel.label + '</span>';
      h += '</div>';
      h += '</td>';
      h += '<td><strong>' + formatMoney(b.value) + '</strong> <small style="color:var(--text-muted)">ج</small></td>';
      h += '<td>';

      if (days < 0) {
        h += '<button class="btn btn-danger btn-sm" onclick="FEFOPro.removeBatch(\'' + b.id + '\')">';
        h += '<i class="fas fa-trash"></i> إعدام</button>';
      } else if (days <= 90) {
        if (b.hasDiscount) {
          // ← المنتج عنده خصم مُطبق → إظهار Badge + تعديل + إزالة
          h += '<div class="fefo-disc-active-cell">';
          h += '<span class="fefo-disc-badge-active">';
          h += '<i class="fas fa-percentage"></i> خصم ' + b.discountPercent + '%';
          h += '</span>';
          h += '<div class="fefo-disc-active-actions">';
          h += '<button class="fefo-disc-icon-btn fefo-disc-icon-edit" onclick="FEFOPro.applyDiscount(\'' + b.productId + '\', 0)" title="تعديل الخصم">';
          h += '<i class="fas fa-edit"></i>';
          h += '</button>';
          h += '<button class="fefo-disc-icon-btn fefo-disc-icon-remove" onclick="FEFOPro.removeDiscount(\'' + b.productId + '\')" title="إزالة الخصم">';
          h += '<i class="fas fa-undo"></i>';
          h += '</button>';
          h += '</div>';
          h += '</div>';
        } else {
          var pct = b.optimizedDiscount;
          if (pct > 0) {
            h += '<button class="btn btn-primary btn-sm" onclick="FEFOPro.applyDiscount(\'' + b.productId + '\', 0)">';
            h += '<i class="fas fa-magic"></i> خصم AI (' + pct + '%)</button>';
          } else {
            h += '<span style="color:var(--text-muted);font-size:.78rem">—</span>';
          }
        }
      } else {
        h += '<span style="color:var(--text-muted);font-size:.78rem">—</span>';
      }

      h += '</td>';
      h += '</tr>';
    });

    h += '</tbody></table></div></div>';
    return h;
  }

  /* ============================================
     CHARTS
     ============================================ */
  function renderCharts(analysis) {
    if (typeof Chart === 'undefined') return;

    Object.keys(FEFO_PRO.charts).forEach(function(k) {
      try { FEFO_PRO.charts[k].destroy(); } catch (e) {}
    });
    FEFO_PRO.charts = {};

    renderValueChart(analysis);
    renderStatusChart(analysis);
    renderTimelineChart(analysis);
  }

  function renderValueChart(analysis) {
    var ctx = document.getElementById('fefoValueChart');
    if (!ctx) return;

    var f = analysis.financial;
    FEFO_PRO.charts.value = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['إجمالي', 'تحت الخطر', 'حرج', 'منتهي'],
        datasets: [{
          data: [f.totalValue, f.atRiskValue, f.criticalValue, f.expiredValue],
          backgroundColor: [
            'rgba(16,185,129,0.8)',
            'rgba(245,158,11,0.8)',
            'rgba(220,38,38,0.8)',
            'rgba(100,116,139,0.6)'
          ],
          borderRadius: 10,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,.95)',
            padding: 12,
            callbacks: {
              label: function(c) { return formatMoney(c.parsed.y) + ' ج.م'; }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: {
              font: { family: 'Cairo', size: 10 },
              callback: function(v) { return formatMoney(v); }
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Cairo', size: 11 } }
          }
        }
      }
    });
  }

  function renderStatusChart(analysis) {
    var ctx = document.getElementById('fefoStatusChart');
    if (!ctx) return;

    FEFO_PRO.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['آمن', 'تنبيه', 'تحذير', 'حرج', 'منتهي'],
        datasets: [{
          data: [
            analysis.safe.length,
            analysis.info.length,
            analysis.warning.length,
            analysis.critical.length,
            analysis.expired.length
          ],
          backgroundColor: ['#10b981', '#06b6d4', '#f59e0b', '#ea580c', '#64748b'],
          borderWidth: 0,
          hoverOffset: 12
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Cairo', size: 11 },
              padding: 10,
              usePointStyle: true,
              boxWidth: 10
            }
          },
          tooltip: {
            callbacks: {
              label: function(c) {
                var total = c.dataset.data.reduce(function(s, v) { return s + v; }, 0);
                if (total === 0) return c.label + ': 0';
                return c.label + ': ' + c.parsed + ' (' + ((c.parsed / total) * 100).toFixed(0) + '%)';
              }
            }
          }
        }
      }
    });
  }

  function renderTimelineChart(analysis) {
    var ctx = document.getElementById('fefoTimelineChart');
    if (!ctx) return;

    var months = [];
    var values = [];
    var counts = [];
    var now = new Date();

    for (var i = 0; i < 12; i++) {
      var d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }));

      var monthValue = 0;
      var monthCount = 0;
      analysis.batches.forEach(function(b) {
        var expDate = new Date(b.expiryDate);
        if (expDate.getFullYear() === d.getFullYear() && expDate.getMonth() === d.getMonth()) {
          monthValue += b.value;
          monthCount++;
        }
      });
      values.push(Math.round(monthValue));
      counts.push(monthCount);
    }

    FEFO_PRO.charts.timeline = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'قيمة تنتهي (ج.م)',
          data: values,
          borderColor: '#1E88E5',
          backgroundColor: 'rgba(30,136,229,.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointRadius: 5,
          pointBackgroundColor: '#1E88E5',
          pointBorderColor: '#fff',
          pointBorderWidth: 3,
          yAxisID: 'y'
        }, {
          label: 'عدد الباتشات',
          data: counts,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#7c3aed',
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: { family: 'Cairo', size: 11 },
              usePointStyle: true,
              boxWidth: 10
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            position: 'right',
            grid: { color: 'rgba(0,0,0,.05)' },
            ticks: {
              font: { family: 'Cairo', size: 10 },
              callback: function(v) { return formatMoney(v); }
            }
          },
          y1: {
            beginAtZero: true,
            position: 'left',
            grid: { display: false },
            ticks: { font: { family: 'Cairo', size: 10 }, precision: 0 }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Cairo', size: 10 } }
          }
        }
      }
    });
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.FEFOPro = {
    render: renderFEFO,

    scrollToCritical: function() {
      var el = document.querySelector('.fefo-cls-danger');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /* ============================================
       DISCOUNT MODAL — نظام خصم احترافي
       ============================================ */
    openDiscountModal: function(productId, batchId) {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (!tid) return;

      var batch = FEFO_PRO.data.batches.find(function(b) { return b.id === batchId; });
      if (!batch) {
        if (window.Dialog) Dialog.error('خطأ', 'لم يتم العثور على الباتش');
        return;
      }

      var products = DB.getTenantData(tid, 'products') || [];
      var product = products.find(function(p) { return p.id === productId; });
      if (!product) {
        if (window.Dialog) Dialog.error('خطأ', 'لم يتم العثور على المنتج');
        return;
      }

      var currentPrice = product.price || 0;
      var originalPrice = product.originalPrice || currentPrice;
      var cost = product.cost || batch.cost || (originalPrice * 0.7);
      var aiSuggested = batch.optimizedDiscount || 15;
      var quantity = batch.quantity || 0;
      var existingDiscount = product.originalPrice
        ? Math.round((1 - product.price / product.originalPrice) * 100)
        : 0;

      var container = ensureDialogContainer();
      var presets = [5, 10, 15, 20, 25, 30, 40, 50];

      var html = '';
      html += '<div class="dlg-modal fefo-discount-modal" style="max-width:560px">';

      // HEADER
      html += '<div class="fefo-disc-hero">';
      html += '<div class="fefo-disc-hero-bg"></div>';
      html += '<div class="fefo-disc-hero-content">';
      html += '<div class="fefo-disc-badge"><i class="fas fa-magic"></i> مُحسّن بالذكاء الاصطناعي</div>';
      html += '<h3 class="fefo-disc-hero-title">تطبيق خصم ذكي</h3>';
      html += '<p class="fefo-disc-hero-sub">' + escapeHtml(product.name) + ' — باتش ' + escapeHtml(batch.batchNo || '') + '</p>';
      html += '</div>';
      html += '<button class="fefo-disc-close" data-close><i class="fas fa-times"></i></button>';
      html += '</div>';

      // BODY
      html += '<div class="fefo-disc-body">';

      // Info cards
      html += '<div class="fefo-disc-info">';
      html += '<div class="fefo-disc-info-item">';
      html += '<span class="fefo-disc-info-label">السعر الحالي</span>';
      html += '<strong class="fefo-disc-info-value">' + formatMoney(currentPrice) + ' ج</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-info-item">';
      html += '<span class="fefo-disc-info-label">التكلفة</span>';
      html += '<strong class="fefo-disc-info-value">' + formatMoney(cost) + ' ج</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-info-item">';
      html += '<span class="fefo-disc-info-label">الكمية</span>';
      html += '<strong class="fefo-disc-info-value">' + quantity + ' وحدة</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-info-item fefo-disc-info-danger">';
      html += '<span class="fefo-disc-info-label">ينتهي في</span>';
      html += '<strong class="fefo-disc-info-value">' + Math.max(0, batch.daysLeft) + ' يوم</strong>';
      html += '</div>';
      html += '</div>';

      // AI Recommendation
      html += '<div class="fefo-disc-ai-suggest">';
      html += '<div class="fefo-disc-ai-icon"><i class="fas fa-robot"></i></div>';
      html += '<div class="fefo-disc-ai-body">';
      html += '<strong>توصية الذكاء الاصطناعي: <span style="color:#7c3aed">' + aiSuggested + '%</span></strong>';
      html += '<p>محسوبة بناءً على ' + batch.daysLeft + ' يوم متبقي و ' + quantity + ' وحدة — لتفادي خسارة ' + formatMoney(batch.value) + ' ج.م</p>';
      html += '</div>';
      html += '<button type="button" class="fefo-disc-ai-apply" data-apply="' + aiSuggested + '">';
      html += '<i class="fas fa-check"></i> طبق';
      html += '</button>';
      html += '</div>';

      // Presets
      html += '<div class="fefo-disc-section">';
      html += '<div class="fefo-disc-section-title"><i class="fas fa-percentage"></i> اختر نسبة الخصم</div>';
      html += '<div class="fefo-disc-presets">';
      presets.forEach(function(p) {
        var isAI = (p === aiSuggested);
        html += '<button type="button" class="fefo-disc-preset ' + (isAI ? 'is-ai' : '') + '" data-preset="' + p + '">';
        if (isAI) html += '<i class="fas fa-crown"></i>';
        html += p + '%';
        html += '</button>';
      });
      html += '</div>';
      html += '</div>';

      // Custom slider
      html += '<div class="fefo-disc-section">';
      html += '<div class="fefo-disc-section-title"><i class="fas fa-sliders-h"></i> أو نسبة مخصصة</div>';
      html += '<div class="fefo-disc-custom">';
      html += '<div class="fefo-disc-slider-wrap">';
      html += '<input type="range" min="0" max="70" step="1" value="' + aiSuggested + '" class="fefo-disc-slider" id="fefoDiscSlider">';
      html += '<div class="fefo-disc-slider-value" id="fefoDiscSliderValue">' + aiSuggested + '%</div>';
      html += '</div>';
      html += '<div class="fefo-disc-slider-labels">';
      html += '<span>0%</span><span>35%</span><span>70%</span>';
      html += '</div>';
      html += '</div>';
      html += '</div>';

      // Live Preview
      html += '<div class="fefo-disc-preview" id="fefoDiscPreview">';
      html += '<div class="fefo-disc-preview-title"><i class="fas fa-eye"></i> المعاينة المباشرة</div>';
      html += '<div class="fefo-disc-preview-grid">';
      html += '<div class="fefo-disc-preview-item">';
      html += '<span>السعر الجديد</span>';
      html += '<strong id="fefoPreviewNewPrice">—</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-preview-item">';
      html += '<span>هامش الربح</span>';
      html += '<strong id="fefoPreviewMargin">—</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-preview-item">';
      html += '<span>إجمالي الإيراد المتوقع</span>';
      html += '<strong id="fefoPreviewRevenue">—</strong>';
      html += '</div>';
      html += '<div class="fefo-disc-preview-item">';
      html += '<span>صافي الربح المتوقع</span>';
      html += '<strong id="fefoPreviewProfit">—</strong>';
      html += '</div>';
      html += '</div>';
      html += '<div class="fefo-disc-preview-warning" id="fefoPreviewWarning"></div>';
      html += '</div>';

      html += '</div>';

      // FOOTER
      html += '<div class="fefo-disc-footer">';
      html += '<button class="dlg-btn dlg-btn-cancel" data-close><i class="fas fa-times"></i> إلغاء</button>';
      html += '<button class="dlg-btn dlg-btn-confirm fefo-disc-apply-btn" id="fefoDiscApplyBtn"><i class="fas fa-check"></i> تطبيق الخصم</button>';
      html += '</div>';

      html += '</div>';

      var overlay = document.createElement('div');
      overlay.className = 'dlg-overlay fefo-disc-overlay';
      overlay.innerHTML = html;
      container.appendChild(overlay);

      requestAnimationFrame(function() { overlay.classList.add('dlg-show'); });

      var currentPct = existingDiscount > 0 ? existingDiscount : aiSuggested;

      function updatePreview(pct) {
        var newPrice = currentPrice * (1 - pct / 100);
        var margin = newPrice > 0 ? ((newPrice - cost) / newPrice) * 100 : 0;
        var revenue = newPrice * quantity;
        var profit = (newPrice - cost) * quantity;

        var priceEl = overlay.querySelector('#fefoPreviewNewPrice');
        var marginEl = overlay.querySelector('#fefoPreviewMargin');
        var revEl = overlay.querySelector('#fefoPreviewRevenue');
        var profitEl = overlay.querySelector('#fefoPreviewProfit');
        var warnEl = overlay.querySelector('#fefoPreviewWarning');
        var sliderValEl = overlay.querySelector('#fefoDiscSliderValue');

        if (priceEl) priceEl.textContent = formatMoney(newPrice) + ' ج';
        if (marginEl) {
          marginEl.textContent = margin.toFixed(1) + '%';
          marginEl.style.color = margin < 0 ? '#dc2626' : margin < 15 ? '#f59e0b' : '#10b981';
        }
        if (revEl) revEl.textContent = formatMoney(revenue) + ' ج';
        if (profitEl) {
          profitEl.textContent = formatMoney(profit) + ' ج';
          profitEl.style.color = profit < 0 ? '#dc2626' : profit < (cost * quantity * 0.15) ? '#f59e0b' : '#10b981';
        }
        if (sliderValEl) sliderValEl.textContent = pct + '%';

        if (warnEl) {
          warnEl.innerHTML = '';
          if (profit < 0) {
            warnEl.innerHTML = '<i class="fas fa-exclamation-triangle"></i> تحذير: الخصم يقل عن التكلفة — خسارة مؤكدة!';
            warnEl.className = 'fefo-disc-preview-warning is-danger';
          } else if (margin < 10) {
            warnEl.innerHTML = '<i class="fas fa-info-circle"></i> هامش ربح منخفض جداً — راجع القرار';
            warnEl.className = 'fefo-disc-preview-warning is-warning';
          } else if (pct >= 30 && margin > 20) {
            warnEl.innerHTML = '<i class="fas fa-check-circle"></i> خصم ذكي — هامش ربح صحي';
            warnEl.className = 'fefo-disc-preview-warning is-success';
          } else {
            warnEl.className = 'fefo-disc-preview-warning';
          }
        }

        overlay.querySelectorAll('.fefo-disc-preset').forEach(function(btn) {
          btn.classList.toggle('active', parseInt(btn.dataset.preset) === pct);
        });
      }

      overlay.querySelectorAll('.fefo-disc-preset').forEach(function(btn) {
        btn.addEventListener('click', function() {
          currentPct = parseInt(this.dataset.preset);
          var slider = overlay.querySelector('#fefoDiscSlider');
          if (slider) slider.value = currentPct;
          updatePreview(currentPct);
        });
      });

      var aiBtn = overlay.querySelector('.fefo-disc-ai-apply');
      if (aiBtn) {
        aiBtn.addEventListener('click', function() {
          currentPct = parseInt(this.dataset.apply);
          var slider = overlay.querySelector('#fefoDiscSlider');
          if (slider) slider.value = currentPct;
          updatePreview(currentPct);
        });
      }

      var slider = overlay.querySelector('#fefoDiscSlider');
      if (slider) {
        slider.addEventListener('input', function() {
          currentPct = parseInt(this.value);
          updatePreview(currentPct);
        });
      }

      overlay.querySelectorAll('[data-close]').forEach(function(btn) {
        btn.addEventListener('click', function() { closeModal(); });
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) closeModal();
      });

      var applyBtn = overlay.querySelector('#fefoDiscApplyBtn');
      applyBtn.addEventListener('click', function() {
        if (currentPct === 0) {
          if (window.Dialog) Dialog.warning('لم تختر خصم', 'اختر نسبة خصم أولاً');
          return;
        }

        closeModal();

        setTimeout(function() {
          if (window.Dialog) {
            Dialog.alert({
              type: 'success',
              title: 'تم تطبيق الخصم بنجاح',
              message: 'خصم ' + currentPct + '% على "' + product.name + '" — السعر الجديد ' + formatMoney(currentPrice * (1 - currentPct / 100)) + ' ج.م',
              confirmText: 'تمام'
            });
          }
          if (typeof Utils !== 'undefined') {
            Utils.toast('✅ تم تطبيق خصم ' + currentPct + '% على ' + product.name, 'success');
          }
        }, 250);

        try {
          FEFO.applyDiscount(productId, currentPct, tid);
        } catch (e) {
          console.error('[FEFO-Pro] apply error:', e);
        }

        setTimeout(function() { renderFEFO(); }, 500);
      });

      function closeModal() {
        overlay.classList.remove('dlg-show');
        overlay.classList.add('dlg-closing');
        setTimeout(function() {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 250);
      }

      setTimeout(function() {
        updatePreview(currentPct);
        slider && (slider.value = currentPct);
      }, 50);

      console.log('[FEFO-Pro] Discount modal opened for:', product.name);
    },

    // Wrapper for applyDiscount
        /* ============================================
       REMOVE DISCOUNT
       ============================================ */
    removeDiscount: function(productId) {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (!tid) return;

      var products = DB.getTenantData(tid, 'products') || [];
      var product = products.find(function(p) { return p.id === productId; });
      if (!product) return;

      if (!product.originalPrice || product.originalPrice <= product.price) {
        if (window.Dialog) Dialog.warning('لا يوجد خصم', 'هذا المنتج ليس عليه خصم حالياً');
        return;
      }

      var currentDiscount = Math.round((1 - product.price / product.originalPrice) * 100);

      if (window.Dialog) {
        Dialog.confirm({
          type: 'warning',
          title: 'إزالة الخصم',
          message: 'سيتم إزالة الخصم (' + currentDiscount + '%) من "' + product.name + '"\n\n' +
                   'السعر الحالي: ' + Math.round(product.price) + ' ج.م\n' +
                   'السعر الأصلي: ' + Math.round(product.originalPrice) + ' ج.م\n\n' +
                   'هل تريد المتابعة؟',
          confirmText: 'نعم، أزل الخصم',
          cancelText: 'إلغاء'
        }).then(function(ok) {
          if (!ok) return;

          // إزالة الخصم
          product.price = product.originalPrice;
          delete product.originalPrice;
          delete product.discountedAt;

          var allProducts = DB.getTenantData(tid, 'products') || [];
          var idx = allProducts.findIndex(function(p) { return p.id === productId; });
          if (idx !== -1) {
            allProducts[idx] = product;
            DB.setTenantData(tid, 'products', allProducts);
          }

          Dialog.success('تمت الإزالة', 'تم استرجاع السعر الأصلي (' + Math.round(product.originalPrice || product.price) + ' ج.م)');
          renderFEFO();
        });
      } else {
        if (!confirm('إزالة الخصم؟')) return;
        product.price = product.originalPrice;
        delete product.originalPrice;
        delete product.discountedAt;
        var allProducts2 = DB.getTenantData(tid, 'products') || [];
        var idx2 = allProducts2.findIndex(function(p) { return p.id === productId; });
        if (idx2 !== -1) {
          allProducts2[idx2] = product;
          DB.setTenantData(tid, 'products', allProducts2);
        }
        renderFEFO();
      }
    },

    // Wrapper for applyDiscount
    applyDiscount: function(productId, percent) {
      var batch = null;
      if (FEFO_PRO.data && FEFO_PRO.data.batches) {
        batch = FEFO_PRO.data.batches.find(function(b) {
          return b.productId === productId && b.daysLeft >= 0;
        });
      }
      if (!batch) {
        if (window.Dialog) Dialog.error('خطأ', 'لم يتم العثور على الباتش');
        return;
      }
      FEFOPro.openDiscountModal(productId, batch.id);
    },

    /* ============================================
       REMOVE BATCH
       ============================================ */
    removeBatch: function(batchId) {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (!tid) return;

      var batch = FEFO_PRO.data.batches.find(function(b) { return b.id === batchId; });
      if (!batch) return;

      if (window.Dialog) {
        Dialog.confirm({
          type: 'danger',
          title: 'تأكيد إعدام الباتش',
          message: 'هل أنت متأكد من إعدام هذا الباتش؟\n\n"' + batch.productName + '" — الكمية: ' + batch.quantity + ' وحدة\nالقيمة: ' + formatMoney(batch.value) + ' ج.م\n\n⚠️ لا يمكن التراجع عن هذا الإجراء.',
          confirmText: 'نعم، أعدمه',
          cancelText: 'إلغاء'
        }).then(function(ok) {
          if (!ok) return;
          var batches = DB.getBatches(tid).filter(function(b) { return b.id !== batchId; });
          DB.setBatches(tid, batches);
          renderFEFO();
          if (typeof Utils !== 'undefined') Utils.toast('تم إعدام الباتش', 'warning');
        });
      } else {
        if (!confirm('إعدام الباتش؟')) return;
        var batches = DB.getBatches(tid).filter(function(b) { return b.id !== batchId; });
        DB.setBatches(tid, batches);
        renderFEFO();
      }
    },

    /* ============================================
       EXPORT EXCEL
       ============================================ */
    exportExcel: function() {
      if (typeof XLSX === 'undefined') {
        if (typeof Utils !== 'undefined') Utils.toast('مكتبة Excel غير محملة', 'error');
        return;
      }
      if (!FEFO_PRO.data) return;

      var rows = FEFO_PRO.data.batches.map(function(b) {
        return {
          'المنتج': b.productName,
          'الباتش': b.batchNo,
          'الفئة': b.category,
          'الكمية': b.quantity,
          'الانتهاء': formatDate(b.expiryDate),
          'الأيام المتبقية': b.daysLeft,
          'درجة الخطر AI': b.riskScore,
          'مستوى الخطر': b.riskLevel.label,
          'القيمة': Math.round(b.value),
          'الخصم المقترح %': b.optimizedDiscount
        };
      });

      var ws = XLSX.utils.json_to_sheet(rows);
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'FEFO-AI');
      XLSX.writeFile(wb, 'fefo-ai-report-' + Date.now() + '.xlsx');
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم التصدير', 'success');
    },

    /* ============================================
       OPEN ADD BATCH MODAL
       ============================================ */
    openAddBatch: function() {
      var products = (typeof PH !== 'undefined' && PH.getProducts) ? PH.getProducts() : [];
      var modal = document.getElementById('phModalBox');
      if (!modal) return;

      modal.innerHTML =
        '<div class="ph-modal-head">' +
          '<h3><i class="fas fa-plus"></i> إضافة باتش جديد</h3>' +
          '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<form onsubmit="FEFOPro.saveBatch(event)">' +
          '<div class="ph-modal-body">' +
            '<div class="ph-form-grid">' +
              '<div class="ph-form-group full">' +
                '<label>المنتج <span class="req">*</span></label>' +
                '<select id="bProd" required>' +
                  '<option value="">اختر منتج...</option>' +
                  products.map(function(p) {
                    return '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>';
                  }).join('') +
                '</select>' +
              '</div>' +
              '<div class="ph-form-group">' +
                '<label>رقم الباتش</label>' +
                '<input type="text" id="bNo" value="B' + Math.floor(Math.random() * 9000 + 1000) + '">' +
              '</div>' +
              '<div class="ph-form-group">' +
                '<label>الكمية <span class="req">*</span></label>' +
                '<input type="number" id="bQty" required min="1" value="10">' +
              '</div>' +
              '<div class="ph-form-group">' +
                '<label>تاريخ الانتهاء <span class="req">*</span></label>' +
                '<input type="date" id="bExp" required>' +
              '</div>' +
              '<div class="ph-form-group">' +
                '<label>التكلفة</label>' +
                '<input type="number" id="bCost" min="0" step="0.5" value="0">' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ph-modal-foot">' +
            '<button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
            '<button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>' +
          '</div>' +
        '</form>';

      var overlay = document.getElementById('phModalOverlay');
      if (overlay) overlay.classList.add('open');
    },

    /* ============================================
       SAVE BATCH
       ============================================ */
    saveBatch: function(e) {
      e.preventDefault();
      var pid = document.getElementById('bProd').value;
      var products = (typeof PH !== 'undefined' && PH.getProducts) ? PH.getProducts() : [];
      var product = products.find(function(p) { return p.id === pid; });
      if (!product) return;

      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (!tid) return;

      var batches = DB.getBatches(tid);
      batches.push({
        id: 'batch_' + Date.now(),
        productId: pid,
        productName: product.name,
        batchNo: document.getElementById('bNo').value,
        quantity: parseInt(document.getElementById('bQty').value) || 0,
        expiryDate: new Date(document.getElementById('bExp').value).toISOString(),
        cost: parseFloat(document.getElementById('bCost').value) || product.cost || 0
      });

      DB.setBatches(tid, batches);
      if (typeof phCloseModal === 'function') phCloseModal();
      renderFEFO();
      if (window.Dialog) Dialog.success('تمت الإضافة', 'تمت إضافة الباتش الجديد بنجاح');
      if (typeof Utils !== 'undefined') Utils.toast('✅ تمت الإضافة', 'success');
    },

    /* ============================================
       HANDLE RECOMMENDATION
       ============================================ */
    handleRecommendation: function(action) {
      switch (action) {
        case 'apply-urgent':
          if (window.Dialog) {
            Dialog.confirm({
              type: 'warning',
              title: 'تطبيق الخصومات المقترحة',
              message: 'سيتم تطبيق الخصومات المحسوبة بالذكاء الاصطناعي على كل الباتشات الحرجة (' + FEFO_PRO.data.critical.length + ' باتش).\n\nهل تريد المتابعة؟',
              confirmText: 'نعم، طبّق',
              cancelText: 'إلغاء'
            }).then(function(ok) {
              if (!ok) return;
              var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
              if (!tid) return;
              var critical = FEFO_PRO.data.critical;
              critical.forEach(function(b) {
                if (b.optimizedDiscount > 0) {
                  try { FEFO.applyDiscount(b.productId, b.optimizedDiscount, tid); } catch (e) {}
                }
              });
              Dialog.success('تم التطبيق', 'تم تطبيق ' + critical.length + ' خصم بنجاح');
              renderFEFO();
            });
          }
          break;

        case 'dispose-all':
          if (window.Dialog) {
            Dialog.confirm({
              type: 'danger',
              title: 'إعدام كل الباتشات المنتهية',
              message: 'سيتم إعدام ' + FEFO_PRO.data.expired.length + ' باتش منتهي بقيمة ' + formatMoney(FEFO_PRO.data.financial.expiredValue) + ' ج.م.\n\n⚠️ لا يمكن التراجع عن هذا الإجراء.',
              confirmText: 'نعم، أعدم الكل',
              cancelText: 'إلغاء'
            }).then(function(ok) {
              if (!ok) return;
              var tid2 = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
              if (!tid2) return;
              var expired = FEFO_PRO.data.expired;
              var batches = DB.getBatches(tid2).filter(function(b) {
                return !expired.some(function(e) { return e.id === b.id; });
              });
              DB.setBatches(tid2, batches);
              Dialog.success('تم الإعدام', 'تم إعدام ' + expired.length + ' باتش');
              renderFEFO();
            });
          }
          break;

        case 'show-saveable':
          if (window.Dialog) {
            Dialog.alert({
              type: 'info',
              title: 'الباتشات القابلة للإنقاذ',
              message: 'عدد ' + FEFO_PRO.data.batches.filter(function(b) { return b.canBeSaved; }).length + ' باتش يمكن إنقاذه بمعدل البيع الحالي.\n\nيمكنك رؤيتها في الجداول أدناه.',
              confirmText: 'فهمت'
            });
          }
          break;

        case 'create-bundle':
          if (window.Dialog) {
            Dialog.alert({
              type: 'info',
              title: 'ميزة قادمة',
              message: 'ميزة إنشاء Bundle تلقائي قادمة في التحديث القادم 🚀',
              confirmText: 'حسناً'
            });
          }
          break;
      }
    }
  };

  /* ============================================
     PATCH PAGE ROUTER
     ============================================ */
  function patchPageRouter() {
    if (typeof window.phRenderPage !== 'function') {
      setTimeout(patchPageRouter, 200);
      return;
    }
    var orig = window.phRenderPage;
    window.phRenderPage = function(page) {
      if (page === 'expiry') {
        return window.FEFOPro.render();
      }
      return orig.call(this, page);
    };
    window.phRenderExpiryPage = function() {
      return window.FEFOPro.render();
    };
    console.log('[FEFO-Pro] ✅ Page router patched');
  }

  setTimeout(patchPageRouter, 500);
  setTimeout(patchPageRouter, 3000);

  try {
    var obs = new MutationObserver(function() {
      if (window.phRenderPage && !window.phRenderPage.__fefoPatched) {
        patchPageRouter();
      }
    });
    obs.observe(document.body, { childList: true, subtree: false });
  } catch (e) {}

  console.log('[FEFO-Pro v3.0] ✅ AI Command Center loaded');
})();