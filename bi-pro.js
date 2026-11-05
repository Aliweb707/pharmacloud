/* ============================================
   PHARMACLOUD - BI DASHBOARD PRO v1.0
   Advanced Analytics + Filters + Forecast
   ============================================ */
'use strict';

(function() {
  
  var BI = {
    preset: '30d',
    compare: false,
    categoryFilter: 'all',
    paymentFilter: 'all',
    customerFilter: 'all',
    charts: {},
    data: null
  };
  
  /* ============================================
     1. DATE HELPERS
     ============================================ */
  function getDateRange(preset) {
    var now = new Date();
    var to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    var from = new Date(to);
    
    switch (preset) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case '7d':
        from.setDate(from.getDate() - 6);
        from.setHours(0, 0, 0, 0);
        break;
      case '30d':
        from.setDate(from.getDate() - 29);
        from.setHours(0, 0, 0, 0);
        break;
      case '90d':
        from.setDate(from.getDate() - 89);
        from.setHours(0, 0, 0, 0);
        break;
      case 'ytd':
        from = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        break;
      case 'all':
        from = new Date(2020, 0, 1);
        break;
    }
    return { from: from, to: to };
  }
  
  function getPreviousRange(range) {
    var duration = range.to.getTime() - range.from.getTime();
    return {
      from: new Date(range.from.getTime() - duration - 1),
      to: new Date(range.from.getTime() - 1)
    };
  }
  
  /* ============================================
     2. DATA
     ============================================ */
  function loadData() {
    var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
    if (!tid) return null;
    return {
      orders: DB.getTenantData(tid, 'orders') || [],
      products: DB.getTenantData(tid, 'products') || [],
      customers: DB.getTenantData(tid, 'customers') || []
    };
  }
  
  function filterOrders(orders, range) {
    return orders.filter(function(o) {
      var d = new Date(o.createdAt);
      return d >= range.from && d <= range.to;
    }).filter(function(o) {
      if (BI.categoryFilter !== 'all') {
        var hasCat = (o.items || []).some(function(it) {
          var p = BI.data.products.find(function(x) { return x.id === it.id; });
          return p && p.category === BI.categoryFilter;
        });
        if (!hasCat) return false;
      }
      if (BI.paymentFilter !== 'all' && o.paymentMethod !== BI.paymentFilter) return false;
      if (BI.customerFilter === 'new' && o.customerId) return false;
      if (BI.customerFilter === 'returning' && !o.customerId) return false;
      return true;
    });
  }
  
  /* ============================================
     3. KPIs
     ============================================ */
  function calculateKPIs(orders, products) {
    var revenue = orders.reduce(function(s, o) { return s + (o.total || 0); }, 0);
    var cogs = 0;
    orders.forEach(function(o) {
      (o.items || []).forEach(function(it) {
        var p = products.find(function(x) { return x.id === it.id; });
        if (p) cogs += (p.cost || 0) * it.qty;
      });
    });
    var profit = revenue - cogs;
    var orderCount = orders.length;
    var aov = orderCount > 0 ? revenue / orderCount : 0;
    var margin = revenue > 0 ? (profit / revenue) * 100 : 0;
    var customerIds = {};
    orders.forEach(function(o) { if (o.customerId) customerIds[o.customerId] = true; });
    var itemsSold = orders.reduce(function(s, o) {
      return s + (o.items || []).reduce(function(s2, it) { return s2 + (it.qty || 0); }, 0);
    }, 0);
    return {
      revenue: revenue, profit: profit, cogs: cogs,
      orderCount: orderCount, aov: aov, margin: margin,
      uniqueCustomers: Object.keys(customerIds).length, itemsSold: itemsSold
    };
  }
  
  function calculateGrowth(cur, prev) {
    if (!prev || prev === 0) return null;
    return ((cur - prev) / prev) * 100;
  }
  
  /* ============================================
     4. RENDER MAIN
     ============================================ */
  function render() {
    BI.data = loadData();
    if (!BI.data) {
      document.getElementById('phContent').innerHTML =
        '<div class="ph-empty"><i class="fas fa-chart-bar"></i><h4>لا توجد بيانات</h4></div>';
      return;
    }
    
    var range = getDateRange(BI.preset);
    var prevRange = getPreviousRange(range);
    var orders = filterOrders(BI.data.orders, range);
    var prevOrders = filterOrders(BI.data.orders, prevRange);
    var kpis = calculateKPIs(orders, BI.data.products);
    var prevKpis = calculateKPIs(prevOrders, BI.data.products);
    
    var html = '';
    
    // Header
    html += renderHeader(range);
    
    // KPI Row 1
    html += '<div class="bi-kpi-grid">';
    html += kpiCard('إجمالي الإيرادات', kpis.revenue, 'ج', 'fa-coins', 'brand', calculateGrowth(kpis.revenue, prevKpis.revenue));
    html += kpiCard('صافي الربح', kpis.profit, 'ج', 'fa-chart-line', 'success', calculateGrowth(kpis.profit, prevKpis.profit));
    html += kpiCard('عدد الطلبات', kpis.orderCount, '', 'fa-shopping-bag', 'accent', calculateGrowth(kpis.orderCount, prevKpis.orderCount));
    html += kpiCard('متوسط قيمة الطلب', kpis.aov, 'ج', 'fa-calculator', 'purple', calculateGrowth(kpis.aov, prevKpis.aov));
    html += '</div>';
    
    // KPI Row 2
    html += '<div class="bi-kpi-grid">';
    html += kpiCard('هامش الربح', kpis.margin, '%', 'fa-percentage', 'info', null, true);
    html += kpiCard('العملاء الفريدون', kpis.uniqueCustomers, '', 'fa-users', 'brand', calculateGrowth(kpis.uniqueCustomers, prevKpis.uniqueCustomers));
    html += kpiCard('القطع المباعة', kpis.itemsSold, '', 'fa-box', 'success', calculateGrowth(kpis.itemsSold, prevKpis.itemsSold));
    html += kpiCard('تكلفة البضاعة', kpis.cogs, 'ج', 'fa-money-bill', 'accent', calculateGrowth(kpis.cogs, prevKpis.cogs));
    html += '</div>';
    
    // Main row
    html += '<div class="bi-charts-row">';
    html += '<div class="bi-card bi-card-wide"><div class="bi-card-head"><h3><i class="fas fa-chart-area"></i> اتجاه الإيرادات والأرباح</h3></div><div class="bi-chart-wrap"><canvas id="biProRevenue"></canvas></div></div>';
    html += '<div class="bi-card"><div class="bi-card-head"><h3><i class="fas fa-fire"></i> الأكثر مبيعاً</h3></div><div id="biProTopProducts" class="bi-list"></div></div>';
    html += '</div>';
    
    // Second row
    html += '<div class="bi-charts-row bi-charts-even">';
    html += '<div class="bi-card"><div class="bi-card-head"><h3><i class="fas fa-th-large"></i> أداء الفئات</h3></div><div class="bi-chart-wrap"><canvas id="biProCategories"></canvas></div></div>';
    html += '<div class="bi-card"><div class="bi-card-head"><h3><i class="fas fa-clock"></i> أوقات الذروة</h3></div><div class="bi-chart-wrap"><canvas id="biProHours"></canvas></div></div>';
    html += '</div>';
    
    // Third row
    html += '<div class="bi-charts-row bi-charts-even">';
    html += '<div class="bi-card"><div class="bi-card-head"><h3><i class="fas fa-crystal-ball"></i> توقع المبيعات (7 أيام قادمة)</h3></div><div class="bi-chart-wrap"><canvas id="biProForecast"></canvas></div></div>';
    html += '<div class="bi-card"><div class="bi-card-head"><h3><i class="fas fa-user-tag"></i> شرائح العملاء</h3></div><div class="bi-chart-wrap"><canvas id="biProCustomers"></canvas></div></div>';
    html += '</div>';
    
    // Top customers
    html += '<div class="bi-card" style="margin-top:20px">';
    html += '<div class="bi-card-head"><h3><i class="fas fa-crown"></i> أفضل 10 عملاء</h3></div>';
    html += renderTopCustomersTable(orders);
    html += '</div>';
    
    document.getElementById('phContent').innerHTML = html;
    
    setTimeout(function() { renderCharts(orders, prevOrders, range); }, 50);
    bindFilters();
  }
  
  /* ============================================
     5. HEADER
     ============================================ */
  function renderHeader(range) {
    var presets = [
      { id: 'today', label: 'اليوم' },
      { id: '7d', label: '7 أيام' },
      { id: '30d', label: '30 يوم' },
      { id: '90d', label: '3 شهور' },
      { id: 'ytd', label: 'السنة' },
      { id: 'all', label: 'الكل' }
    ];
    
    var categories = ['all'].concat(
      (BI.data.products || []).map(function(p) { return p.category; })
        .filter(function(c, i, arr) { return c && arr.indexOf(c) === i; })
    );
    
    var h = '<div class="ph-page-head">';
    h += '<div><h1><i class="fas fa-chart-bar"></i> لوحة التحليلات الاحترافية</h1>';
    h += '<p>' + formatDateRange(range) + '</p></div>';
    h += '<div class="ph-head-actions">';
    h += '<button class="btn btn-outline btn-sm" onclick="BIPro.exportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>';
    h += '<button class="btn btn-outline btn-sm" onclick="BIPro.exportExcel()"><i class="fas fa-file-excel"></i> Excel</button>';
    h += '</div></div>';
    
    h += '<div class="bi-filter-bar">';
    h += '<div class="bi-presets">';
    presets.forEach(function(p) {
      h += '<button class="bi-preset ' + (BI.preset === p.id ? 'active' : '') + '" data-preset="' + p.id + '">' + p.label + '</button>';
    });
    h += '</div>';
    
    h += '<div class="bi-filters">';
    h += '<select class="bi-select" id="biCatFilter"><option value="all">كل الفئات</option>';
    categories.forEach(function(c) {
      if (c === 'all') return;
      h += '<option value="' + escapeHtml(c) + '"' + (BI.categoryFilter === c ? ' selected' : '') + '>' + escapeHtml(c) + '</option>';
    });
    h += '</select>';
    
    h += '<select class="bi-select" id="biPayFilter">';
    h += '<option value="all">كل طرق الدفع</option>';
    h += '<option value="cash"' + (BI.paymentFilter === 'cash' ? ' selected' : '') + '>💵 كاش</option>';
    h += '<option value="card"' + (BI.paymentFilter === 'card' ? ' selected' : '') + '>💳 بطاقة</option>';
    h += '<option value="wallet"' + (BI.paymentFilter === 'wallet' ? ' selected' : '') + '>📱 محفظة</option>';
    h += '</select>';
    
    h += '<select class="bi-select" id="biCustFilter">';
    h += '<option value="all">كل العملاء</option>';
    h += '<option value="new"' + (BI.customerFilter === 'new' ? ' selected' : '') + '>عملاء جدد</option>';
    h += '<option value="returning"' + (BI.customerFilter === 'returning' ? ' selected' : '') + '>عملاء عائدون</option>';
    h += '</select>';
    
    h += '<label class="bi-compare-toggle"><input type="checkbox" id="biCompare"' + (BI.compare ? ' checked' : '') + '><span>مقارنة</span></label>';
    h += '</div></div>';
    
    return h;
  }
  
  function formatDateRange(range) {
    var opts = { day: 'numeric', month: 'short', year: 'numeric' };
    return range.from.toLocaleDateString('en-GB', opts) + ' — ' + range.to.toLocaleDateString('en-GB', opts);
  }
  
  /* ============================================
     6. KPI CARD
     ============================================ */
  function kpiCard(label, value, unit, icon, color, growth, isPercent) {
    var colorMap = {
      brand: 'linear-gradient(135deg,#00b884,#00d4a0)',
      success: 'linear-gradient(135deg,#10b981,#34d399)',
      accent: 'linear-gradient(135deg,#FF6B35,#FFA726)',
      purple: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
      info: 'linear-gradient(135deg,#1E88E5,#42a5f5)'
    };
    var formatted = isPercent ? value.toFixed(1) : Math.round(value).toLocaleString('en-US');
    var growthHtml = '';
    if (growth !== null && growth !== undefined && isFinite(growth)) {
      var g = growth.toFixed(1);
      var up = growth >= 0;
      growthHtml = '<span class="bi-kpi-growth ' + (up ? 'up' : 'down') + '"><i class="fas fa-arrow-' + (up ? 'up' : 'down') + '"></i> ' + Math.abs(g) + '%</span>';
    }
    return '<div class="bi-kpi"><div class="bi-kpi-head"><div class="bi-kpi-icon" style="background:' + colorMap[color] + '"><i class="fas ' + icon + '"></i></div>' + growthHtml + '</div>' +
      '<div class="bi-kpi-value">' + formatted + (unit ? ' <small>' + unit + '</small>' : '') + '</div>' +
      '<div class="bi-kpi-label">' + label + '</div></div>';
  }
  
  /* ============================================
     7. TOP CUSTOMERS TABLE
     ============================================ */
  function renderTopCustomersTable(orders) {
    var map = {};
    orders.forEach(function(o) {
      if (!o.customerId) return;
      if (!map[o.customerId]) map[o.customerId] = { name: o.customerName, total: 0, orders: 0 };
      map[o.customerId].total += o.total || 0;
      map[o.customerId].orders++;
    });
    var list = Object.values(map).sort(function(a, b) { return b.total - a.total; }).slice(0, 10);
    if (!list.length) return '<div class="bi-empty">لا توجد بيانات</div>';
    
    var h = '<div style="overflow-x:auto"><table class="ph-table"><thead><tr><th>#</th><th>العميل</th><th>عدد الطلبات</th><th>إجمالي الشراء</th><th>متوسط الطلب</th></tr></thead><tbody>';
    list.forEach(function(c, i) {
      var avg = c.orders > 0 ? c.total / c.orders : 0;
      h += '<tr><td><span class="bi-rank">' + (i + 1) + '</span></td>';
      h += '<td><strong>' + escapeHtml(c.name || 'عميل') + '</strong></td>';
      h += '<td>' + c.orders + '</td>';
      h += '<td><strong style="color:var(--primary)">' + Math.round(c.total).toLocaleString('en-US') + ' ج</strong></td>';
      h += '<td>' + Math.round(avg).toLocaleString('en-US') + ' ج</td></tr>';
    });
    h += '</tbody></table></div>';
    return h;
  }
  
  /* ============================================
     8. CHARTS
     ============================================ */
  function renderCharts(orders, prevOrders, range) {
    if (typeof Chart === 'undefined') return;
    Object.keys(BI.charts).forEach(function(k) {
      try { BI.charts[k].destroy(); } catch (e) {}
    });
    BI.charts = {};
    
    renderRevenueChart(orders, prevOrders, range);
    renderTopProducts();
    renderCategoriesChart(orders);
    renderHoursChart(orders);
    renderForecastChart(orders);
    renderCustomersChart();
  }
  
  function renderRevenueChart(orders, prevOrders, range) {
    var ctx = document.getElementById('biProRevenue');
    if (!ctx) return;
    
    var days = [];
    var labels = [];
    var dataRev = [];
    var dataProfit = [];
    var cur = new Date(range.from);
    while (cur <= range.to && days.length < 100) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    
    days.forEach(function(d) {
      var dayStr = d.toDateString();
      labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
      var dayOrders = orders.filter(function(o) { return new Date(o.createdAt).toDateString() === dayStr; });
      dataRev.push(Math.round(dayOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0)));
      dataProfit.push(Math.round(dayOrders.reduce(function(s, o) {
        return s + (o.items || []).reduce(function(s2, it) {
          var p = BI.data.products.find(function(x) { return x.id === it.id; });
          if (!p) return s2;
          return s2 + (it.price - (p.cost || 0)) * it.qty;
        }, 0);
      }, 0)));
    });
    
    var dataPrev = [];
    for (var i = 0; i < days.length; i++) {
      var pd = new Date(range.from);
      pd.setDate(pd.getDate() - days.length + i);
      var prevDayOrders = prevOrders.filter(function(o) { return new Date(o.createdAt).toDateString() === pd.toDateString(); });
      dataPrev.push(Math.round(prevDayOrders.reduce(function(s, o) { return s + (o.total || 0); }, 0)));
    }
    
    var datasets = [
      { label: 'الإيرادات', data: dataRev, borderColor: '#00b884', backgroundColor: 'rgba(0,184,132,.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3 },
      { label: 'صافي الربح', data: dataProfit, borderColor: '#FF6B35', backgroundColor: 'rgba(255,107,53,.08)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 3 }
    ];
    if (BI.compare) {
      datasets.push({ label: 'الفترة السابقة', data: dataPrev, borderColor: '#94a3b8', borderDash: [5, 5], borderWidth: 2, fill: false, tension: 0.4, pointRadius: 2 });
    }
    
    BI.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Cairo', size: 11 }, usePointStyle: true, boxWidth: 10 } },
          tooltip: {
            backgroundColor: 'rgba(15,23,42,.95)', padding: 12,
            callbacks: { label: function(c) { return c.dataset.label + ': ' + Math.round(c.parsed.y).toLocaleString('en-US') + ' ج'; } }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { family: 'Cairo', size: 10 }, callback: function(v) { return v.toLocaleString('en-US'); } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 10 } }
        }
      }
    });
  }
  
  function renderTopProducts() {
    var el = document.getElementById('biProTopProducts');
    if (!el) return;
    var range = getDateRange(BI.preset);
    var orders = filterOrders(BI.data.orders, range);
    var map = {};
    orders.forEach(function(o) {
      (o.items || []).forEach(function(it) {
        if (!map[it.id]) map[it.id] = { name: it.name, qty: 0 };
        map[it.id].qty += it.qty;
      });
    });
    var list = Object.values(map).sort(function(a, b) { return b.qty - a.qty; }).slice(0, 8);
    if (!list.length) { el.innerHTML = '<div class="bi-empty">لا توجد بيانات</div>'; return; }
    var max = list[0].qty;
    el.innerHTML = list.map(function(p, i) {
      var pct = (p.qty / max) * 100;
      return '<div class="bi-bar-item"><div class="bi-bar-rank" data-rank="' + (i + 1) + '">' + (i + 1) + '</div>' +
        '<div class="bi-bar-content"><div class="bi-bar-head"><strong>' + escapeHtml(p.name) + '</strong><span>' + p.qty + ' قطعة</span></div>' +
        '<div class="bi-bar-track"><div class="bi-bar-fill" style="width:' + pct + '%"></div></div></div></div>';
    }).join('');
  }
  
  function renderCategoriesChart(orders) {
    var ctx = document.getElementById('biProCategories');
    if (!ctx) return;
    var cats = {};
    orders.forEach(function(o) {
      (o.items || []).forEach(function(it) {
        var p = BI.data.products.find(function(x) { return x.id === it.id; });
        var cat = p ? p.category : 'أخرى';
        cats[cat] = (cats[cat] || 0) + (it.price * it.qty);
      });
    });
    var labels = Object.keys(cats);
    var data = Object.values(cats);
    if (!labels.length) { ctx.parentElement.innerHTML = '<div class="bi-empty">لا توجد بيانات</div>'; return; }
    BI.charts.categories = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: labels, datasets: [{ data: data, backgroundColor: ['#00b884','#1E88E5','#FF6B35','#7c3aed','#f59e0b','#06b6d4','#ef4444','#84cc16'], borderWidth: 0, hoverOffset: 12 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 11 }, padding: 10, usePointStyle: true, boxWidth: 10 } },
          tooltip: { callbacks: { label: function(c) {
            var total = c.dataset.data.reduce(function(s, v) { return s + v; }, 0);
            return c.label + ': ' + Math.round(c.parsed).toLocaleString('en-US') + ' ج (' + ((c.parsed/total)*100).toFixed(1) + '%)';
          }}}
        }
      }
    });
  }
  
  function renderHoursChart(orders) {
    var ctx = document.getElementById('biProHours');
    if (!ctx) return;
    var hours = [];
    for (var i = 8; i <= 22; i++) hours.push(i);
    var data = hours.map(function(h) {
      return orders.filter(function(o) { return new Date(o.createdAt).getHours() === h; })
        .reduce(function(s, o) { return s + (o.total || 0); }, 0);
    });
    var max = Math.max.apply(Math, data);
    BI.charts.hours = new Chart(ctx, {
      type: 'bar',
      data: { labels: hours.map(function(h) { return h + ':00'; }), datasets: [{
        data: data.map(function(v) { return Math.round(v); }),
        backgroundColor: data.map(function(v) { return v === max ? '#FF6B35' : 'rgba(0,184,132,.65)'; }),
        borderRadius: 8, borderSkipped: false
      }]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(c) { return c.parsed.y.toLocaleString('en-US') + ' ج'; } } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { family: 'Cairo', size: 10 }, callback: function(v) { return v.toLocaleString('en-US'); } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 10 } } }
        }
      }
    });
  }
  
  function renderForecastChart(orders) {
    var ctx = document.getElementById('biProForecast');
    if (!ctx) return;
    var labels = [], actual = [], forecast = [];
    for (var i = 13; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
      var rev = orders.filter(function(o) { return new Date(o.createdAt).toDateString() === d.toDateString(); })
        .reduce(function(s, o) { return s + (o.total || 0); }, 0);
      actual.push(Math.round(rev));
      forecast.push(null);
    }
    var avg = actual.reduce(function(s, v) { return s + v; }, 0) / actual.length;
    var trend = actual.length > 3 ? (actual.slice(-3).reduce(function(s, v) { return s + v; }, 0) / 3) - (actual.slice(0, 3).reduce(function(s, v) { return s + v; }, 0) / 3) : 0;
    var dailyTrend = trend / actual.length;
    forecast[forecast.length - 1] = actual[actual.length - 1];
    for (var j = 1; j <= 7; j++) {
      var fd = new Date();
      fd.setDate(fd.getDate() + j);
      labels.push(fd.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }));
      actual.push(null);
      forecast.push(Math.round(Math.max(0, avg + dailyTrend * j)));
    }
    BI.charts.forecast = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: [
        { label: 'الفعلي', data: actual, borderColor: '#00b884', backgroundColor: 'rgba(0,184,132,.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 3, spanGaps: false },
        { label: 'التوقع', data: forecast, borderColor: '#7c3aed', backgroundColor: 'rgba(124,58,237,.08)', borderWidth: 2, borderDash: [6, 4], fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#7c3aed', spanGaps: false }
      ]},
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Cairo', size: 11 }, usePointStyle: true, boxWidth: 10 } },
          tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + (c.parsed.y !== null ? Math.round(c.parsed.y).toLocaleString('en-US') + ' ج' : '—'); } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { family: 'Cairo', size: 10 }, callback: function(v) { return v.toLocaleString('en-US'); } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Cairo', size: 10 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 10 } }
        }
      }
    });
  }
  
  function renderCustomersChart() {
    var ctx = document.getElementById('biProCustomers');
    if (!ctx) return;
    var range = getDateRange(BI.preset);
    var sorted = BI.data.orders.slice().sort(function(a, b) { return new Date(a.createdAt) - new Date(b.createdAt); });
    var seen = {}, newCount = 0, returningCount = 0;
    sorted.forEach(function(o) {
      if (!o.customerId) return;
      var d = new Date(o.createdAt);
      if (d < range.from || d > range.to) return;
      if (seen[o.customerId]) returningCount++;
      else { newCount++; seen[o.customerId] = true; }
    });
    if (newCount + returningCount === 0) { ctx.parentElement.innerHTML = '<div class="bi-empty">لا توجد بيانات</div>'; return; }
    BI.charts.customers = new Chart(ctx, {
      type: 'doughnut',
      data: { labels: ['عملاء جدد', 'عملاء عائدون'], datasets: [{ data: [newCount, returningCount], backgroundColor: ['#1E88E5', '#00b884'], borderWidth: 0, hoverOffset: 12 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 11 }, padding: 12, usePointStyle: true, boxWidth: 10 } } }
      }
    });
  }
  
  /* ============================================
     9. FILTERS
     ============================================ */
  function bindFilters() {
    document.querySelectorAll('.bi-preset').forEach(function(btn) {
      btn.addEventListener('click', function() {
        BI.preset = this.dataset.preset;
        render();
      });
    });
    var cat = document.getElementById('biCatFilter');
    if (cat) cat.addEventListener('change', function() { BI.categoryFilter = this.value; render(); });
    var pay = document.getElementById('biPayFilter');
    if (pay) pay.addEventListener('change', function() { BI.paymentFilter = this.value; render(); });
    var cust = document.getElementById('biCustFilter');
    if (cust) cust.addEventListener('change', function() { BI.customerFilter = this.value; render(); });
    var cmp = document.getElementById('biCompare');
    if (cmp) cmp.addEventListener('change', function() { BI.compare = this.checked; render(); });
  }
  
  /* ============================================
     10. EXPORT
     ============================================ */
  function kpiBox(label, value, color) {
    return '<div style="padding:16px;border:2px solid ' + color + '22;border-radius:12px;background:' + color + '08">' +
      '<div style="color:' + color + ';font-size:.75rem;font-weight:800;margin-bottom:6px">' + label + '</div>' +
      '<div style="color:#0f172a;font-size:1.4rem;font-weight:900">' + value + '</div></div>';
  }
  
  function exportPDF() {
    if (typeof html2pdf === 'undefined') return;
    var range = getDateRange(BI.preset);
    var orders = filterOrders(BI.data.orders, range);
    var kpis = calculateKPIs(orders, BI.data.products);
    var html = '<div style="font-family:Cairo,sans-serif;padding:40px;direction:rtl;background:#fff">' +
      '<div style="text-align:center;border-bottom:3px solid #00b884;padding-bottom:20px;margin-bottom:30px">' +
        '<h1 style="color:#00b884;margin:0">PharmaCloud</h1>' +
        '<p style="color:#64748b;margin-top:8px">تقرير BI - ' + formatDateRange(range) + '</p>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:15px;margin-bottom:30px">' +
        kpiBox('الإيرادات', kpis.revenue.toLocaleString('en-US') + ' ج', '#00b884') +
        kpiBox('صافي الربح', kpis.profit.toLocaleString('en-US') + ' ج', '#10b981') +
        kpiBox('الطلبات', kpis.orderCount, '#FF6B35') +
        kpiBox('متوسط الطلب', Math.round(kpis.aov).toLocaleString('en-US') + ' ج', '#7c3aed') +
        kpiBox('هامش الربح', kpis.margin.toFixed(1) + '%', '#1E88E5') +
        kpiBox('العملاء', kpis.uniqueCustomers, '#06b6d4') +
      '</div>' +
      '<div style="text-align:center;color:#64748b;font-size:.8rem;margin-top:40px">© 2026 PharmaCloud</div>' +
    '</div>';
    if (typeof Utils !== 'undefined') Utils.toast('جاري إنشاء PDF...', 'info');
    html2pdf().set({
      margin: 0, filename: 'bi-report-' + Date.now() + '.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(html).save().then(function() {
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم التحميل', 'success');
    });
  }
  
  function exportExcel() {
    if (typeof XLSX === 'undefined') return;
    var range = getDateRange(BI.preset);
    var orders = filterOrders(BI.data.orders, range);
    var kpis = calculateKPIs(orders, BI.data.products);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['التقرير', 'BI Analytics'],
      ['من', range.from.toLocaleDateString('en-GB')],
      ['إلى', range.to.toLocaleDateString('en-GB')],
      [],
      ['المقياس', 'القيمة'],
      ['الإيرادات', kpis.revenue],
      ['صافي الربح', kpis.profit],
      ['عدد الطلبات', kpis.orderCount],
      ['متوسط الطلب', kpis.aov],
      ['هامش الربح %', kpis.margin],
      ['العملاء الفريدون', kpis.uniqueCustomers],
      ['القطع المباعة', kpis.itemsSold]
    ]), 'الملخص');
    var ordersData = orders.map(function(o) {
      return {
        'رقم الطلب': o.id,
        'التاريخ': new Date(o.createdAt).toLocaleDateString('en-GB'),
        'العميل': o.customerName || '—',
        'عدد الأصناف': (o.items || []).length,
        'الإجمالي': o.total,
        'طريقة الدفع': o.paymentMethod
      };
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ordersData), 'الطلبات');
    XLSX.writeFile(wb, 'bi-report-' + Date.now() + '.xlsx');
    if (typeof Utils !== 'undefined') Utils.toast('✅ تم التحميل', 'success');
  }
  
  /* ============================================
     11. PUBLIC + PAGE ROUTER PATCH
     ============================================ */
  window.BIPro = {
    render: render,
    exportPDF: exportPDF,
    exportExcel: exportExcel,
    reset: function() {
      BI.preset = '30d'; BI.compare = false;
      BI.categoryFilter = 'all'; BI.paymentFilter = 'all'; BI.customerFilter = 'all';
      render();
    }
  };
  
  // Patch phRenderPage — because pro-features.js calls local phRenderBIv2()
  (function patchPageRouter() {
    var orig = window.phRenderPage;
    if (!orig) { setTimeout(patchPageRouter, 200); return; }
    window.phRenderPage = function(page) {
      if (page === 'bi') return BIPro.render();
      return orig(page);
    };
    console.log('[BI Pro] Page router patched ✓');
  })();
  
  console.log('[BI Pro v1.0] Loaded ✓ Advanced analytics ready');
})();