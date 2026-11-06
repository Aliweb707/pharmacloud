/* ============================================
   PHARMACLOUD - LOYALTY SYSTEM
   Points, Tiers, Rewards, Referrals
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var TIERS = [
    { id: 'bronze', name: 'برونزي', min: 0, color: '#CD7F32', icon: 'fa-medal', discount: 0 },
    { id: 'silver', name: 'فضي', min: 500, color: '#C0C0C0', icon: 'fa-medal', discount: 2 },
    { id: 'gold', name: 'ذهبي', min: 2000, color: '#FFD700', icon: 'fa-crown', discount: 5 },
    { id: 'platinum', name: 'بلاتيني', min: 5000, color: '#E5E4E2', icon: 'fa-gem', discount: 8 },
    { id: 'diamond', name: 'ماسي', min: 10000, color: '#B9F2FF', icon: 'fa-gem', discount: 12 }
  ];

  var REWARDS = [
    { id: 'r1', name: 'خصم 5%', cost: 100, icon: 'fa-percentage', color: '#7c3aed' },
    { id: 'r2', name: 'خصم 10%', cost: 200, icon: 'fa-percentage', color: '#7c3aed' },
    { id: 'r3', name: 'خصم 20%', cost: 400, icon: 'fa-percentage', color: '#7c3aed' },
    { id: 'r4', name: 'توصيل مجاني', cost: 150, icon: 'fa-truck', color: '#06b6d4' },
    { id: 'r5', name: 'هدية بقيمة 50 ج', cost: 500, icon: 'fa-gift', color: '#f59e0b' },
    { id: 'r6', name: 'هدية بقيمة 100 ج', cost: 900, icon: 'fa-gift', color: '#f59e0b' },
    { id: 'r7', name: 'خصم 50% على منتج', cost: 1000, icon: 'fa-star', color: '#10b981' },
    { id: 'r8', name: 'استشارة صيدلي', cost: 300, icon: 'fa-user-md', color: '#1E88E5' }
  ];

  function getKey(tenantId) { return 'pc_loyalty_' + (tenantId || 'default'); }

  function loadData(tenantId) {
    try {
      return JSON.parse(localStorage.getItem(getKey(tenantId)) || '{"customers":{}}');
    } catch (e) { return { customers: {} }; }
  }

  function saveData(tenantId, data) {
    try { localStorage.setItem(getKey(tenantId), JSON.stringify(data)); } catch (e) {}
  }

  function getTenantId() {
    try {
      if (typeof PH !== 'undefined' && PH.tenantId) return PH.tenantId;
      var session = DB.getSession ? DB.getSession() : null;
      return session ? session.tenantId : 'default';
    } catch (e) { return 'default'; }
  }

  /* ============================================
     GET / ADD POINTS
     ============================================ */
  function getCustomer(customerId) {
    var data = loadData(getTenantId());
    if (!data.customers[customerId]) {
      data.customers[customerId] = {
        id: customerId,
        points: 0,
        totalSpent: 0,
        tier: 'bronze',
        history: [],
        redeemed: [],
        joinedAt: new Date().toISOString()
      };
    }
    return data.customers[customerId];
  }

  function addPoints(customerId, amount, orderId) {
    if (!customerId) return 0;

    var data = loadData(getTenantId());
    var c = data.customers[customerId] || {
      id: customerId, points: 0, totalSpent: 0, tier: 'bronze', history: [], redeemed: [], joinedAt: new Date().toISOString()
    };

    // 1 point per 10 EGP spent
    var earned = Math.floor(amount / 10);
    c.points += earned;
    c.totalSpent += amount;

    // Update tier
    var newTier = 'bronze';
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (c.points >= TIERS[i].min) {
        newTier = TIERS[i].id;
        break;
      }
    }
    c.tier = newTier;

    // Log history
    c.history.unshift({
      type: 'earn',
      amount: earned,
      orderId: orderId,
      totalAfter: c.points,
      at: new Date().toISOString()
    });
    if (c.history.length > 100) c.history.length = 100;

    data.customers[customerId] = c;
    saveData(getTenantId(), data);

    console.log('[Loyalty] Added', earned, 'points to', customerId, '— new balance:', c.points);

    return earned;
  }

  function getTier(points) {
    for (var i = TIERS.length - 1; i >= 0; i--) {
      if (points >= TIERS[i].min) return TIERS[i];
    }
    return TIERS[0];
  }

  function getNextTier(points) {
    for (var i = 0; i < TIERS.length; i++) {
      if (points < TIERS[i].min) return TIERS[i];
    }
    return null;
  }

  /* ============================================
     RENDER CUSTOMER LOYALTY
     ============================================ */
  function renderLoyaltyCard(customerId) {
    var c = getCustomer(customerId);
    var tier = getTier(c.points);
    var next = getNextTier(c.points);
    var progress = 0;
    var needed = 0;

    if (next) {
      var tierStart = tier.min;
      var tierEnd = next.min;
      progress = ((c.points - tierStart) / (tierEnd - tierStart)) * 100;
      needed = tierEnd - c.points;
    } else {
      progress = 100;
    }

    var h = '';
    h += '<div class="loyalty-card" style="--tier-color:' + tier.color + '">';
    h += '<div class="loyalty-tier-badge">';
    h += '<i class="fas ' + tier.icon + '"></i>';
    h += '<span>' + tier.name + '</span>';
    h += '</div>';
    h += '<div class="loyalty-points-display">';
    h += '<div class="loyalty-points-value">' + c.points + '</div>';
    h += '<div class="loyalty-points-label">نقطة</div>';
    h += '</div>';
    if (next) {
      h += '<div class="loyalty-progress">';
      h += '<div class="loyalty-progress-bar"><div class="loyalty-progress-fill" style="width:' + progress + '%"></div></div>';
      h += '<div class="loyalty-progress-text">' + needed + ' نقطة للوصول إلى ' + next.name + '</div>';
      h += '</div>';
    } else {
      h += '<div class="loyalty-progress-text" style="text-align:center">🎉 وصلت لأعلى مستوى!</div>';
    }
    if (tier.discount > 0) {
      h += '<div class="loyalty-tier-perk"><i class="fas fa-tag"></i> خصم دائم ' + tier.discount + '%</div>';
    }
    h += '</div>';

    return h;
  }

  /* ============================================
     OPEN LOYALTY MODAL
     ============================================ */
  function openLoyaltyModal(customerId) {
    if (!customerId) {
      if (typeof Utils !== 'undefined') Utils.toast('اختر عميل أولاً', 'warning');
      return;
    }

    var c = getCustomer(customerId);
    var tier = getTier(c.points);
    var customers = [];
    try { customers = PH.getCustomers ? PH.getCustomers() : []; } catch (e) {}
    var customer = customers.find(function(x) { return x.id === customerId; });

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var h = '';
    h += '<div class="ph-modal-head">';
    h += '<h3><i class="fas fa-gift"></i> نقاط الولاء — ' + escapeHtml(customer ? customer.name : '') + '</h3>';
    h += '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body">';

    // Loyalty card
    h += renderLoyaltyCard(customerId);

    // Redeem section
    h += '<div class="loyalty-section-title"><i class="fas fa-star"></i> استبدل النقاط</div>';
    h += '<div class="loyalty-rewards">';
    REWARDS.forEach(function(r) {
      var canAfford = c.points >= r.cost;
      h += '<div class="loyalty-reward ' + (canAfford ? '' : 'disabled') + '" onclick="Loyalty.redeem(\'' + customerId + '\', \'' + r.id + '\')">';
      h += '<div class="loyalty-reward-icon" style="background:' + r.color + '"><i class="fas ' + r.icon + '"></i></div>';
      h += '<div class="loyalty-reward-info">';
      h += '<strong>' + r.name + '</strong>';
      h += '<span>' + r.cost + ' نقطة</span>';
      h += '</div>';
      h += '<button class="loyalty-redeem-btn ' + (canAfford ? '' : 'disabled') + '">';
      h += canAfford ? '<i class="fas fa-check"></i>' : '<i class="fas fa-lock"></i>';
      h += '</button>';
      h += '</div>';
    });
    h += '</div>';

    // History
    if (c.history.length > 0) {
      h += '<div class="loyalty-section-title"><i class="fas fa-history"></i> آخر العمليات</div>';
      h += '<div class="loyalty-history">';
      c.history.slice(0, 8).forEach(function(entry) {
        var isEarn = entry.type === 'earn';
        h += '<div class="loyalty-history-item">';
        h += '<div class="loyalty-history-icon ' + (isEarn ? 'earn' : 'redeem') + '">';
        h += '<i class="fas ' + (isEarn ? 'fa-plus' : 'fa-minus') + '"></i>';
        h += '</div>';
        h += '<div class="loyalty-history-info">';
        h += '<strong>' + (isEarn ? '+' + entry.amount : '-' + entry.amount) + ' نقطة</strong>';
        if (entry.orderId) h += '<span>طلب #' + escapeHtml(entry.orderId) + '</span>';
        if (entry.rewardName) h += '<span>' + escapeHtml(entry.rewardName) + '</span>';
        h += '</div>';
        h += '<div class="loyalty-history-time">' + timeAgo(entry.at) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '</div>';

    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
    h += '</div>';

    modal.innerHTML = h;
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     REDEEM REWARD
     ============================================ */
  function redeem(customerId, rewardId) {
    var reward = REWARDS.find(function(r) { return r.id === rewardId; });
    if (!reward) return;

    var c = getCustomer(customerId);
    if (c.points < reward.cost) {
      if (typeof Utils !== 'undefined') Utils.toast('النقاط غير كافية', 'warning');
      return;
    }

    if (window.Dialog) {
      Dialog.confirm({
        type: 'question',
        title: 'تأكيد الاستبدال',
        message: 'هل تريد استبدال ' + reward.cost + ' نقطة بـ "' + reward.name + '"?',
        confirmText: 'نعم، استبدل',
        cancelText: 'إلغاء'
      }).then(function(ok) {
        if (!ok) return;

        var data = loadData(getTenantId());
        var cust = data.customers[customerId];
        cust.points -= reward.cost;
        cust.redeemed.unshift({
          rewardId: reward.id,
          rewardName: reward.name,
          cost: reward.cost,
          at: new Date().toISOString()
        });
        cust.history.unshift({
          type: 'redeem',
          amount: reward.cost,
          rewardName: reward.name,
          totalAfter: cust.points,
          at: new Date().toISOString()
        });

        data.customers[customerId] = cust;
        saveData(getTenantId(), data);

        if (typeof Utils !== 'undefined') Utils.toast('🎁 تم الاستبدال: ' + reward.name, 'success');
        if (typeof playSound === 'function') playSound('success');

        openLoyaltyModal(customerId);
      });
    }
  }

  /* ============================================
     ADMIN DASHBOARD
     ============================================ */
  function openAdminDashboard() {
    var data = loadData(getTenantId());
    var customers = Object.values(data.customers);

    var totalPoints = customers.reduce(function(s, c) { return s + c.points; }, 0);
    var totalRedeemed = customers.reduce(function(s, c) {
      return s + c.redeemed.reduce(function(s2, r) { return s2 + r.cost; }, 0);
    }, 0);

    var tierCounts = {};
    TIERS.forEach(function(t) { tierCounts[t.id] = 0; });
    customers.forEach(function(c) { tierCounts[c.tier] = (tierCounts[c.tier] || 0) + 1; });

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var h = '';
    h += '<div class="ph-modal-head">';
    h += '<h3><i class="fas fa-gift"></i> نظام الولاء</h3>';
    h += '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body">';

    // Stats
    h += '<div class="loyalty-admin-stats">';
    h += '<div class="loyalty-stat"><div class="loyalty-stat-value">' + customers.length + '</div><div class="loyalty-stat-label">عميل</div></div>';
    h += '<div class="loyalty-stat"><div class="loyalty-stat-value">' + totalPoints.toLocaleString('en-US') + '</div><div class="loyalty-stat-label">نقطة نشطة</div></div>';
    h += '<div class="loyalty-stat"><div class="loyalty-stat-value">' + totalRedeemed.toLocaleString('en-US') + '</div><div class="loyalty-stat-label">نقطة مستبدلة</div></div>';
    h += '</div>';

    // Tiers distribution
    h += '<div class="loyalty-section-title"><i class="fas fa-layer-group"></i> توزيع المستويات</div>';
    h += '<div class="loyalty-tiers-list">';
    TIERS.forEach(function(t) {
      var count = tierCounts[t.id] || 0;
      h += '<div class="loyalty-tier-item">';
      h += '<div class="loyalty-tier-badge-mini" style="background:' + t.color + '"><i class="fas ' + t.icon + '"></i></div>';
      h += '<div style="flex:1"><strong>' + t.name + '</strong><span>' + t.min + '+ نقطة</span></div>';
      h += '<div class="loyalty-tier-count">' + count + '</div>';
      h += '</div>';
    });
    h += '</div>';

    // Top customers
    var top = customers.sort(function(a, b) { return b.points - a.points; }).slice(0, 5);
    if (top.length > 0) {
      h += '<div class="loyalty-section-title"><i class="fas fa-crown"></i> أعلى العملاء</div>';
      h += '<div class="loyalty-top-list">';
      top.forEach(function(c, i) {
        var cust = null;
        try { cust = PH.getCustomers().find(function(x) { return x.id === c.id; }); } catch (e) {}
        h += '<div class="loyalty-top-item">';
        h += '<div class="loyalty-top-rank">' + (i + 1) + '</div>';
        h += '<div style="flex:1">';
        h += '<strong>' + escapeHtml(cust ? cust.name : c.id) + '</strong>';
        h += '<span>' + c.totalSpent.toLocaleString('en-US') + ' ج.م إجمالي</span>';
        h += '</div>';
        h += '<div class="loyalty-top-points">' + c.points + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '</div>';

    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
    h += '<button class="btn btn-primary" onclick="Loyalty.exportExcel()"><i class="fas fa-file-excel"></i> تصدير</button>';
    h += '</div>';

    modal.innerHTML = h;
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     EXPORT
     ============================================ */
  function exportExcel() {
    if (typeof XLSX === 'undefined') {
      if (typeof Utils !== 'undefined') Utils.toast('مكتبة Excel غير محملة', 'error');
      return;
    }

    var data = loadData(getTenantId());
    var customers = [];
    try { customers = PH.getCustomers ? PH.getCustomers() : []; } catch (e) {}

    var rows = Object.values(data.customers).map(function(c) {
      var cust = customers.find(function(x) { return x.id === c.id; });
      var tier = TIERS.find(function(t) { return t.id === c.tier; });
      return {
        'العميل': cust ? cust.name : c.id,
        'الهاتف': cust ? cust.phone : '',
        'النقاط': c.points,
        'المستوى': tier ? tier.name : '',
        'إجمالي الشراء': Math.round(c.totalSpent),
        'عدد الاستبدالات': c.redeemed.length,
        'تاريخ الانضمام': new Date(c.joinedAt).toLocaleDateString('en-GB')
      };
    });

    var ws = XLSX.utils.json_to_sheet(rows);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Loyalty');
    XLSX.writeFile(wb, 'loyalty-' + Date.now() + '.xlsx');
    if (typeof Utils !== 'undefined') Utils.toast('✅ تم التصدير', 'success');
  }

  function timeAgo(ts) {
    var diff = Date.now() - new Date(ts).getTime();
    var m = Math.floor(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return m + ' د';
    var h = Math.floor(diff / 3600000);
    if (h < 24) return h + ' س';
    var d = Math.floor(diff / 86400000);
    return d + ' يوم';
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.Loyalty = {
    addPoints: addPoints,
    getCustomer: getCustomer,
    getTier: getTier,
    getNextTier: getNextTier,
    renderCard: renderLoyaltyCard,
    open: openLoyaltyModal,
    redeem: redeem,
    openAdmin: openAdminDashboard,
    exportExcel: exportExcel,
    TIERS: TIERS,
    REWARDS: REWARDS
  };

  console.log('[Loyalty] Loaded — ' + TIERS.length + ' tiers, ' + REWARDS.length + ' rewards');
})();