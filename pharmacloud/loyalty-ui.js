/* ============================================
   PHARMACLOUD - LOYALTY UI v1.0
   Full Page + POS Integration + Customer List
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var LUI = {
    activeTab: 'overview',
    search: ''
  };

  /* ============================================
     DATA HELPERS
     ============================================ */
  function loadLoyaltyData() {
    try {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : 'default';
      return JSON.parse(localStorage.getItem('pc_loyalty_' + tid) || '{"customers":{}}');
    } catch (e) {
      return { customers: {} };
    }
  }

  function getAllCustomerStats() {
    var data = loadLoyaltyData();
    var customers = [];
    try {
      if (typeof PH !== 'undefined' && PH.getCustomers) {
        customers = PH.getCustomers() || [];
      }
    } catch (e) {}

    return Object.keys(data.customers).map(function(id) {
      var lc = data.customers[id];
      var c = customers.find(function(x) { return x.id === id; }) || {};
      var tier = (typeof Loyalty !== 'undefined' && Loyalty.getTier)
        ? Loyalty.getTier(lc.points)
        : { id: 'bronze', name: 'برونزي', color: '#CD7F32', icon: 'fa-medal', discount: 0 };

      return {
        id: id,
        name: c.name || 'عميل #' + id.slice(-4),
        phone: c.phone || '—',
        address: c.address || '',
        points: lc.points || 0,
        totalSpent: lc.totalSpent || 0,
        tier: tier,
        history: lc.history || [],
        redeemed: lc.redeemed || [],
        joinedAt: lc.joinedAt
      };
    }).sort(function(a, b) { return b.points - a.points; });
  }

  /* ============================================
     MAIN RENDER
     ============================================ */
  function renderLoyaltyPage() {
    var content = document.getElementById('phContent');
    if (!content) return;

    var html = '';
    html += renderPageHeader();
    html += renderTabs();
    html += '<div id="luiContent"></div>';

    content.innerHTML = html;
    renderActiveTab();
    console.log('[Loyalty UI] ✅ Page rendered, tab:', LUI.activeTab);
  }

  /* ============================================
     PAGE HEADER
     ============================================ */
  function renderPageHeader() {
    return '' +
      '<div class="ph-page-head">' +
        '<div>' +
          '<h1><i class="fas fa-gift"></i> نظام الولاء</h1>' +
          '<p>إدارة نقاط ومكافآت العملاء — زوّد مبيعاتك وحافظ على عملائك</p>' +
        '</div>' +
        '<div class="ph-head-actions">' +
          '<button class="btn btn-outline btn-sm" onclick="LUI.exportExcel()">' +
            '<i class="fas fa-file-excel"></i> تصدير Excel' +
          '</button>' +
          '<button class="btn btn-primary btn-sm" onclick="LUI.openQuickAddPoints()">' +
            '<i class="fas fa-plus"></i> إضافة نقاط' +
          '</button>' +
        '</div>' +
      '</div>';
  }

  /* ============================================
     TABS NAVIGATION
     ============================================ */
  function renderTabs() {
    var tabs = [
      { id: 'overview',  label: 'نظرة عامة',  icon: 'fa-chart-pie' },
      { id: 'customers', label: 'العملاء',     icon: 'fa-users' },
      { id: 'rewards',   label: 'المكافآت',    icon: 'fa-star' },
      { id: 'tiers',     label: 'المستويات',   icon: 'fa-layer-group' }
    ];

    var h = '<div class="lui-tabs">';
    tabs.forEach(function(t) {
      h += '<button type="button" class="lui-tab' +
        (LUI.activeTab === t.id ? ' active' : '') +
        '" onclick="LUI.setTab(\'' + t.id + '\')">' +
        '<i class="fas ' + t.icon + '"></i> ' + t.label +
        '</button>';
    });
    h += '</div>';
    return h;
  }

  window.LUI = {
    setTab: function(tab) {
      LUI.activeTab = tab;
      // Update active state on tab buttons
      document.querySelectorAll('.lui-tab').forEach(function(b) {
        b.classList.remove('active');
      });
      // Re-render tabs + content
      var content = document.getElementById('phContent');
      var tabsWrapper = content.querySelector('.lui-tabs');
      if (tabsWrapper) {
        tabsWrapper.outerHTML = renderTabs();
      }
      renderActiveTab();
    },

    refresh: function() {
      renderActiveTab();
    },

    exportExcel: function() {
      if (typeof Loyalty !== 'undefined' && Loyalty.exportExcel) {
        Loyalty.exportExcel();
      }
    },

    openCustomer: function(id) {
      if (typeof Loyalty !== 'undefined' && Loyalty.open) {
        Loyalty.open(id);
      }
    },

    openQuickAddPoints: function() {
      var customers = [];
      try {
        if (typeof PH !== 'undefined' && PH.getCustomers) {
          customers = PH.getCustomers() || [];
        }
      } catch (e) {}

      if (customers.length === 0) {
        if (typeof Dialog !== 'undefined') {
          Dialog.warning('لا يوجد عملاء', 'أضف عميل أولاً من صفحة العملاء');
        }
        return;
      }

      var modal = document.getElementById('phModalBox');
      if (!modal) return;

      var opts = customers.map(function(c) {
        return '<option value="' + c.id + '">' + escapeHtml(c.name) + ' — ' + escapeHtml(c.phone || '') + '</option>';
      }).join('');

      modal.innerHTML =
        '<div class="ph-modal-head">' +
          '<h3><i class="fas fa-plus-circle"></i> إضافة نقاط يدوياً</h3>' +
          '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<form onsubmit="LUI.saveQuickPoints(event)">' +
          '<div class="ph-modal-body">' +
            '<div class="ph-form-group">' +
              '<label>العميل <span class="req">*</span></label>' +
              '<select id="luiQuickCustomer" required>' + opts + '</select>' +
            '</div>' +
            '<div class="ph-form-group">' +
              '<label>عدد النقاط <span class="req">*</span></label>' +
              '<input type="number" id="luiQuickPoints" required min="1" value="10">' +
            '</div>' +
            '<div class="ph-form-group">' +
              '<label>السبب / الملاحظة</label>' +
              '<input type="text" id="luiQuickReason" placeholder="مثال: مكافأة ترحيب، تعويض..." value="إضافة يدوية">' +
            '</div>' +
          '</div>' +
          '<div class="ph-modal-foot">' +
            '<button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
            '<button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> إضافة</button>' +
          '</div>' +
        '</form>';

      document.getElementById('phModalOverlay').classList.add('open');
    },

    saveQuickPoints: function(e) {
      e.preventDefault();
      var customerId = document.getElementById('luiQuickCustomer').value;
      var points = parseInt(document.getElementById('luiQuickPoints').value) || 0;
      var reason = document.getElementById('luiQuickReason').value || 'إضافة يدوية';

      if (!customerId || points <= 0) return;

      // Convert points to amount (1 point = 10 EGP equivalent)
      var amount = points * 10;

      if (typeof Loyalty !== 'undefined' && Loyalty.addPoints) {
        Loyalty.addPoints(customerId, amount, 'manual-' + Date.now());
        if (typeof phCloseModal === 'function') phCloseModal();
        if (typeof Utils !== 'undefined') Utils.toast('✅ تمت إضافة ' + points + ' نقطة', 'success');
        // Refresh
        setTimeout(renderActiveTab, 300);
      }
    },

    redeemFromList: function(customerId, rewardId) {
      if (typeof Loyalty !== 'undefined' && Loyalty.redeem) {
        Loyalty.redeem(customerId, rewardId);
        setTimeout(renderActiveTab, 500);
      }
    },

    search: function(q) {
      LUI.search = q;
      var body = document.getElementById('luiContent');
      if (body) body.innerHTML = renderCustomersTab();
    }
  };

  /* ============================================
     ACTIVE TAB RENDERER
     ============================================ */
  function renderActiveTab() {
    var body = document.getElementById('luiContent');
    if (!body) return;

    switch (LUI.activeTab) {
      case 'overview':  body.innerHTML = renderOverviewTab(); break;
      case 'customers': body.innerHTML = renderCustomersTab(); break;
      case 'rewards':   body.innerHTML = renderRewardsTab(); break;
      case 'tiers':     body.innerHTML = renderTiersTab(); break;
      default:          body.innerHTML = renderOverviewTab();
    }
  }

  /* ============================================
     TAB 1: OVERVIEW
     ============================================ */
  function renderOverviewTab() {
    var stats = getAllCustomerStats();
    var totalPoints = stats.reduce(function(s, c) { return s + c.points; }, 0);
    var totalRedeemed = stats.reduce(function(s, c) {
      return s + c.redeemed.reduce(function(s2, r) { return s2 + (r.cost || 0); }, 0);
    }, 0);
    var totalSpent = stats.reduce(function(s, c) { return s + c.totalSpent; }, 0);

    var tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };
    stats.forEach(function(c) {
      if (tierCounts[c.tier.id] !== undefined) tierCounts[c.tier.id]++;
    });

    var h = '';

    // KPIs
    h += '<div class="loyalty-admin-stats" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">';
    h += luiStat('fa-users', stats.length, 'عميل مشترك', '#7c3aed');
    h += luiStat('fa-star', totalPoints.toLocaleString('en-US'), 'نقطة نشطة', '#f59e0b');
    h += luiStat('fa-check-circle', totalRedeemed.toLocaleString('en-US'), 'نقطة مستبدلة', '#10b981');
    h += luiStat('fa-coins', totalSpent.toLocaleString('en-US'), 'إجمالي المبيعات', '#00b884');
    h += '</div>';

    // Tier distribution
    h += '<div class="ph-table-card" style="margin-bottom:20px">';
    h += '<div class="ph-table-head"><h3><i class="fas fa-layer-group"></i> توزيع المستويات</h3></div>';
    h += '<div class="ph-modal-body">';
    h += '<div class="loyalty-tiers-list">';
    (Loyalty.TIERS || []).forEach(function(t) {
      var count = tierCounts[t.id] || 0;
      var pct = stats.length > 0 ? (count / stats.length) * 100 : 0;
      h += '<div class="loyalty-tier-item">';
      h += '<div class="loyalty-tier-badge-mini" style="background:' + t.color + '"><i class="fas ' + t.icon + '"></i></div>';
      h += '<div style="flex:1">';
      h += '<strong>' + t.name + '</strong>';
      h += '<span>' + t.min + '+ نقطة' + (t.discount > 0 ? ' • خصم ' + t.discount + '%' : '') + '</span>';
      h += '<div style="background:#f1f5f9;height:6px;border-radius:999px;margin-top:6px;overflow:hidden">';
      h += '<div style="background:' + t.color + ';height:100%;width:' + pct + '%;border-radius:999px"></div>';
      h += '</div>';
      h += '</div>';
      h += '<div class="loyalty-tier-count">' + count + '</div>';
      h += '</div>';
    });
    h += '</div></div></div>';

    // Top 10 customers
    h += '<div class="ph-table-card">';
    h += '<div class="ph-table-head">';
    h += '<h3><i class="fas fa-crown"></i> أعلى 10 عملاء</h3>';
    h += '<span style="font-size:.82rem;color:var(--text-muted)">اضغط على أي عميل لعرض التفاصيل</span>';
    h += '</div>';
    if (stats.length === 0) {
      h += '<div class="ph-empty"><i class="fas fa-users"></i><h4>لا يوجد عملاء بعد</h4></div>';
    } else {
      h += '<div style="overflow-x:auto"><table class="ph-table">';
      h += '<thead><tr><th>#</th><th>العميل</th><th>الهاتف</th><th>المستوى</th><th>النقاط</th><th>إجمالي الشراء</th><th>إجراءات</th></tr></thead>';
      h += '<tbody>';
      stats.slice(0, 10).forEach(function(c, i) {
        h += '<tr style="cursor:pointer" onclick="LUI.openCustomer(\'' + c.id + '\')">';
        h += '<td><span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:' + (i < 3 ? '#fbbf24' : '#f1f5f9') + ';color:' + (i < 3 ? '#fff' : '#64748b') + ';border-radius:50%;font-weight:900;font-size:.78rem">' + (i + 1) + '</span></td>';
        h += '<td><strong>' + escapeHtml(c.name) + '</strong></td>';
        h += '<td>' + escapeHtml(c.phone) + '</td>';
        h += '<td><span style="background:' + c.tier.color + '22;color:' + c.tier.color + ';padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:900">' +
              '<i class="fas ' + c.tier.icon + '"></i> ' + c.tier.name + '</span></td>';
        h += '<td><strong style="color:#7c3aed;font-size:1rem">' + c.points + '</strong></td>';
        h += '<td><strong style="color:#00b884">' + c.totalSpent.toLocaleString('en-US') + ' ج</strong></td>';
        h += '<td onclick="event.stopPropagation()">' +
              '<button class="btn btn-outline btn-sm" onclick="LUI.openCustomer(\'' + c.id + '\')">' +
              '<i class="fas fa-eye"></i></button></td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div>';

    return h;
  }

  function luiStat(icon, value, label, color) {
    return '' +
      '<div class="loyalty-stat" style="position:relative;overflow:hidden;padding:16px 12px">' +
        '<div style="position:absolute;top:0;inset-inline-start:0;width:4px;height:100%;background:' + color + '"></div>' +
        '<div style="width:44px;height:44px;border-radius:12px;background:' + color + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.1rem;margin:0 auto 10px">' +
          '<i class="fas ' + icon + '"></i>' +
        '</div>' +
        '<div class="loyalty-stat-value" style="font-size:1.5rem">' + value + '</div>' +
        '<div class="loyalty-stat-label">' + label + '</div>' +
      '</div>';
  }

  /* ============================================
     TAB 2: CUSTOMERS
     ============================================ */
  function renderCustomersTab() {
    var stats = getAllCustomerStats();
    var q = (LUI.search || '').toLowerCase().trim();

    if (q) {
      stats = stats.filter(function(c) {
        return c.name.toLowerCase().indexOf(q) !== -1 ||
               (c.phone || '').indexOf(q) !== -1;
      });
    }

    var h = '';

    // Search bar
    h += '<div class="ph-table-card">';
    h += '<div class="ph-table-head">';
    h += '<h3><i class="fas fa-users"></i> العملاء (' + stats.length + ')</h3>';
    h += '<div class="ph-filters">';
    h += '<input type="text" class="ph-input" placeholder="🔍 بحث بالاسم أو الهاتف..." ' +
         'value="' + escapeHtml(LUI.search) + '" oninput="LUI.search(this.value)" style="min-width:260px">';
    h += '</div>';
    h += '</div>';

    if (stats.length === 0) {
      h += '<div class="ph-empty">';
      h += '<i class="fas fa-users"></i>';
      h += '<h4>' + (q ? 'لا توجد نتائج' : 'لا يوجد عملاء في نظام الولاء بعد') + '</h4>';
      if (!q) {
        h += '<p style="margin-top:8px;font-size:.82rem;color:var(--text-muted)">' +
             'العملاء بيضافوا تلقائياً عند أول عملية شراء</p>';
      }
      h += '</div>';
    } else {
      h += '<div style="overflow-x:auto"><table class="ph-table">';
      h += '<thead><tr>';
      h += '<th>العميل</th><th>الهاتف</th><th>المستوى</th><th>النقاط</th>';
      h += '<th>إجمالي الشراء</th><th>آخر عملية</th><th>إجراءات</th>';
      h += '</tr></thead>';
      h += '<tbody>';
      stats.forEach(function(c) {
        var lastAt = c.history && c.history[0] ? c.history[0].at : c.joinedAt;
        h += '<tr>';
        h += '<td><strong>' + escapeHtml(c.name) + '</strong></td>';
        h += '<td>' + escapeHtml(c.phone) + '</td>';
        h += '<td><span style="background:' + c.tier.color + '22;color:' + c.tier.color + ';padding:4px 10px;border-radius:999px;font-size:.72rem;font-weight:900">' +
              '<i class="fas ' + c.tier.icon + '"></i> ' + c.tier.name + '</span></td>';
        h += '<td><strong style="color:#7c3aed">' + c.points + '</strong></td>';
        h += '<td><strong style="color:#00b884">' + c.totalSpent.toLocaleString('en-US') + ' ج</strong></td>';
        h += '<td style="font-size:.8rem;color:var(--text-muted)">' + (lastAt ? luiTimeAgo(lastAt) : '—') + '</td>';
        h += '<td>';
        h += '<div class="ph-actions">';
        h += '<button onclick="LUI.openCustomer(\'' + c.id + '\')" title="عرض التفاصيل"><i class="fas fa-eye"></i></button>';
        h += '<button onclick="LUI.openAddPointsFor(\'' + c.id + '\')" title="إضافة نقاط" style="background:rgba(124,58,237,.1);color:#7c3aed"><i class="fas fa-plus"></i></button>';
        h += '</div>';
        h += '</td>';
        h += '</tr>';
      });
      h += '</tbody></table></div>';
    }

    h += '</div>';
    return h;
  }

  window.LUI.openAddPointsFor = function(customerId) {
    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var stats = getAllCustomerStats();
    var c = stats.find(function(x) { return x.id === customerId; });
    if (!c) return;

    modal.innerHTML =
      '<div class="ph-modal-head">' +
        '<h3><i class="fas fa-plus-circle"></i> إضافة نقاط — ' + escapeHtml(c.name) + '</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<form onsubmit="LUI.saveAddPointsFor(event, \'' + customerId + '\')">' +
        '<div class="ph-modal-body">' +
          '<div style="background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(0,184,132,.04));border:1px solid rgba(124,58,237,.2);border-radius:12px;padding:14px;margin-bottom:16px">' +
            '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:4px">الرصيد الحالي</div>' +
            '<div style="font-size:1.6rem;font-weight:900;color:#7c3aed">' + c.points + ' نقطة</div>' +
          '</div>' +
          '<div class="ph-form-group">' +
            '<label>عدد النقاط <span class="req">*</span></label>' +
            '<input type="number" id="luiPointsAmount" required min="1" value="10" autofocus>' +
          '</div>' +
          '<div class="ph-form-group">' +
            '<label>السبب</label>' +
            '<input type="text" id="luiPointsReason" placeholder="مثال: مكافأة، تعويض..." value="إضافة يدوية">' +
          '</div>' +
        '</div>' +
        '<div class="ph-modal-foot">' +
          '<button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
          '<button type="submit" class="btn btn-primary"><i class="fas fa-check"></i> إضافة</button>' +
        '</div>' +
      '</form>';

    document.getElementById('phModalOverlay').classList.add('open');
    setTimeout(function() {
      var inp = document.getElementById('luiPointsAmount');
      if (inp) inp.select();
    }, 100);
  };

  window.LUI.saveAddPointsFor = function(e, customerId) {
    e.preventDefault();
    var points = parseInt(document.getElementById('luiPointsAmount').value) || 0;
    var reason = document.getElementById('luiPointsReason').value || 'إضافة يدوية';

    if (points <= 0) return;

    var amount = points * 10;

    if (typeof Loyalty !== 'undefined' && Loyalty.addPoints) {
      Loyalty.addPoints(customerId, amount, 'manual-' + Date.now() + '|' + reason);
      if (typeof phCloseModal === 'function') phCloseModal();
      if (typeof Utils !== 'undefined') Utils.toast('✅ تمت إضافة ' + points + ' نقطة', 'success');
      setTimeout(renderActiveTab, 300);
    }
  };

  /* ============================================
     TAB 3: REWARDS
     ============================================ */
  function renderRewardsTab() {
    var rewards = (typeof Loyalty !== 'undefined' && Loyalty.REWARDS) ? Loyalty.REWARDS : [];
    var data = loadLoyaltyData();
    var redemptionCounts = {};

    Object.keys(data.customers).forEach(function(id) {
      var c = data.customers[id];
      (c.redeemed || []).forEach(function(r) {
        redemptionCounts[r.rewardId] = (redemptionCounts[r.rewardId] || 0) + 1;
      });
    });

    var h = '';

    h += '<div style="background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(0,184,132,.04));' +
         'border:1px solid rgba(124,58,237,.15);border-radius:14px;padding:16px;margin-bottom:20px;' +
         'display:flex;align-items:center;gap:14px">' +
         '<i class="fas fa-info-circle" style="font-size:1.5rem;color:#7c3aed"></i>' +
         '<div style="flex:1">' +
           '<strong style="display:block;margin-bottom:4px">' + rewards.length + ' مكافأة متاحة</strong>' +
           '<span style="font-size:.82rem;color:var(--text-muted)">' +
             'العملاء يستبدلوا نقاطهم بالمكافآت دي من بطاقة العميل' +
           '</span>' +
         '</div>' +
         '</div>';

    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px">';
    rewards.forEach(function(r) {
      var count = redemptionCounts[r.id] || 0;
      h += '<div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;' +
           'display:flex;align-items:center;gap:14px;transition:all .25s" ' +
           'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 12px 30px rgba(0,0,0,.08)\'" ' +
           'onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\'">';
      h += '<div style="width:48px;height:48px;border-radius:12px;background:' + r.color + ';color:#fff;' +
           'display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;' +
           'box-shadow:0 8px 20px ' + r.color + '55">' +
           '<i class="fas ' + r.icon + '"></i></div>';
      h += '<div style="flex:1;min-width:0">';
      h += '<strong style="display:block;font-size:.95rem;margin-bottom:4px">' + escapeHtml(r.name) + '</strong>';
      h += '<div style="display:flex;gap:10px;font-size:.78rem">';
      h += '<span style="color:#7c3aed;font-weight:900"><i class="fas fa-star"></i> ' + r.cost + ' نقطة</span>';
      if (count > 0) {
        h += '<span style="color:#10b981;font-weight:900"><i class="fas fa-check-circle"></i> استُبدلت ' + count + ' مرة</span>';
      }
      h += '</div>';
      h += '</div>';
      h += '</div>';
    });
    h += '</div>';

    return h;
  }

/* ============================================
   TAB 4: TIERS — With Hover Effects
   ============================================ */
function renderTiersTab() {
  var tiers = (typeof Loyalty !== 'undefined' && Loyalty.TIERS) ? Loyalty.TIERS : [];
  var stats = getAllCustomerStats();
  var counts = {};
  stats.forEach(function(c) { counts[c.tier.id] = (counts[c.tier.id] || 0) + 1; });

  var h = '';

  // Hint banner
  h += '<div style="background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(0,184,132,.04));' +
       'border:1px solid rgba(124,58,237,.15);border-radius:14px;padding:14px 18px;margin-bottom:20px;' +
       'display:flex;align-items:center;gap:12px">' +
       '<i class="fas fa-hand-pointer" style="color:#7c3aed;font-size:1.2rem"></i>' +
       '<div style="flex:1;font-size:.88rem;font-weight:700;color:var(--text)">' +
         'مرر الماوس على أي مستوى لعرض التفاصيل — اضغط لعرض العملاء في المستوى' +
       '</div>' +
       '</div>';

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px">';

  tiers.forEach(function(t) {
    var count = counts[t.id] || 0;

    // Convert hex color to rgba for shadow
    var shadowColor = hexToRgba(t.color, 0.35);

    h += '<div class="loyalty-card lui-tier-card" ' +
         'style="--tier-color:' + t.color + ';--tier-shadow:' + shadowColor + ';margin-bottom:0;position:relative;overflow:hidden" ' +
         'onclick="LUI.showTierCustomers(\'' + t.id + '\')">';

    // Shine sweep element
    h += '<div class="lui-tier-shine"></div>';

    // Top badge
    h += '<div class="loyalty-tier-badge" style="background:' + t.color + '">';
    h += '<i class="fas ' + t.icon + '"></i><span>' + t.name + '</span>';
    h += '</div>';

    // Points value
    h += '<div style="text-align:center;margin:16px 0">';
    h += '<div class="lui-tier-points" style="font-size:1.8rem;font-weight:900;color:' + t.color + '">+' + t.min + '</div>';
    h += '<div style="font-size:.78rem;color:var(--text-muted);margin-top:2px">نقطة مطلوبة</div>';
    h += '</div>';

    // Customer count
    h += '<div class="lui-tier-count-section" ' +
         'style="background:#f8fafc;border-radius:10px;padding:12px;text-align:center;font-size:.85rem;' +
         'transition:all .4s cubic-bezier(.4,0,.2,1)">';
    h += '<strong style="font-size:1.15rem;color:' + t.color + ';transition:all .3s">' + count + '</strong>';
    h += '<div style="font-size:.75rem;opacity:.85;margin-top:2px">عميل في المستوى ده</div>';
    h += '</div>';

    // Discount perk
    if (t.discount > 0) {
      h += '<div class="loyalty-tier-perk" style="position:relative;overflow:hidden;transition:all .4s">';
      h += '<i class="fas fa-tag"></i> خصم دائم ' + t.discount + '%';
      h += '</div>';
    } else {
      h += '<div class="loyalty-tier-perk" style="position:relative;overflow:hidden;transition:all .4s;background:rgba(100,116,139,.08);color:#64748b">';
      h += '<i class="fas fa-info-circle"></i> مستوى البداية';
      h += '</div>';
    }

    // Hover indicator arrow
    h += '<div style="position:absolute;bottom:12px;inset-inline-end:12px;' +
         'width:32px;height:32px;border-radius:50%;background:' + t.color + ';color:#fff;' +
         'display:flex;align-items:center;justify-content:center;font-size:.8rem;' +
         'opacity:0;transform:translateX(20px);transition:all .4s cubic-bezier(.4,0,.2,1)" ' +
         'class="lui-tier-arrow">' +
         '<i class="fas fa-arrow-left"></i>' +
         '</div>';

    h += '</div>';
  });

  h += '</div>';

  // Add CSS for arrow on hover
  h += '<style>' +
       '.lui-tier-card:hover .lui-tier-arrow{opacity:1!important;transform:translateX(0)!important}' +
       '</style>';

  return h;
}

/* ============================================
   HELPER: Hex to RGBA
   ============================================ */
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return 'rgba(0, 184, 132, ' + alpha + ')';

  // Handle #RGB and #RRGGBB
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(function(c) { return c + c; }).join('');
  }

  var r = parseInt(hex.substring(0, 2), 16);
  var g = parseInt(hex.substring(2, 4), 16);
  var b = parseInt(hex.substring(4, 6), 16);

  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

/* ============================================
   PUBLIC: Show Tier Customers Modal
   ============================================ */
window.LUI.showTierCustomers = function(tierId) {
  var tiers = (typeof Loyalty !== 'undefined' && Loyalty.TIERS) ? Loyalty.TIERS : [];
  var tier = tiers.find(function(t) { return t.id === tierId; });
  if (!tier) return;

  var allStats = getAllCustomerStats();
  var tierCustomers = allStats.filter(function(c) { return c.tier.id === tierId; });

  var modal = document.getElementById('phModalBox');
  if (!modal) return;

  var h = '';
  h += '<div class="ph-modal-head" style="background:linear-gradient(135deg,' + tier.color + '22,#fff)">';
  h += '<h3 style="color:' + tier.color + '"><i class="fas ' + tier.icon + '"></i> عملاء المستوى ' + tier.name + '</h3>';
  h += '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
  h += '</div>';

  h += '<div class="ph-modal-body">';

  // Tier info banner
  h += '<div style="background:linear-gradient(135deg,' + tier.color + '15,' + tier.color + '05);' +
       'border:2px solid ' + tier.color + '33;border-radius:14px;padding:16px;margin-bottom:20px;' +
       'display:flex;align-items:center;gap:16px">';
  h += '<div style="width:64px;height:64px;border-radius:16px;background:' + tier.color + ';color:#fff;' +
       'display:flex;align-items:center;justify-content:center;font-size:1.6rem;' +
       'box-shadow:0 10px 30px ' + tier.color + '55">';
  h += '<i class="fas ' + tier.icon + '"></i>';
  h += '</div>';
  h += '<div style="flex:1">';
  h += '<div style="font-size:1.2rem;font-weight:900;color:' + tier.color + ';margin-bottom:4px">' + tier.name + '</div>';
  h += '<div style="font-size:.85rem;color:var(--text-muted)">' + tier.min + '+ نقطة' +
       (tier.discount > 0 ? ' • خصم دائم ' + tier.discount + '%' : '') + '</div>';
  h += '</div>';
  h += '<div style="text-align:center">';
  h += '<div style="font-size:2rem;font-weight:900;color:' + tier.color + '">' + tierCustomers.length + '</div>';
  h += '<div style="font-size:.72rem;color:var(--text-muted)">عميل</div>';
  h += '</div>';
  h += '</div>';

  // Customers list
  if (tierCustomers.length === 0) {
    h += '<div class="ph-empty" style="padding:40px 20px">';
    h += '<i class="fas fa-user-slash" style="font-size:3rem;opacity:.2;color:' + tier.color + '"></i>';
    h += '<h4 style="margin-top:12px">لا يوجد عملاء في المستوى ده</h4>';
    h += '<p style="font-size:.82rem;color:var(--text-muted);margin-top:8px">' +
         'العملاء يوصلوا للمستوى ده لما يجمعوا ' + tier.min + ' نقطة' +
         '</p>';
    h += '</div>';
  } else {
    h += '<div style="font-size:.82rem;color:var(--text-muted);margin-bottom:12px;font-weight:700">' +
         'قائمة العملاء (' + tierCustomers.length + ')' +
         '</div>';
    tierCustomers.forEach(function(c) {
      h += '<div style="background:#fff;border:1px solid var(--border);border-radius:12px;' +
           'padding:14px;margin-bottom:10px;display:flex;align-items:center;gap:12px;' +
           'cursor:pointer;transition:all .25s" ' +
           'onmouseover="this.style.borderColor=\'' + tier.color + '\';this.style.transform=\'translateX(-4px)\'" ' +
           'onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\'" ' +
           'onclick="phCloseModal();LUI.openCustomer(\'' + c.id + '\')">';

      // Avatar
      h += '<div style="width:48px;height:48px;border-radius:50%;background:' + tier.color + ';' +
           'color:#fff;display:flex;align-items:center;justify-content:center;' +
           'font-weight:900;font-size:1.1rem;flex-shrink:0">' +
           escapeHtml((c.name || '؟').charAt(0)) +
           '</div>';

      // Info
      h += '<div style="flex:1;min-width:0">';
      h += '<strong style="display:block;font-size:.95rem;margin-bottom:2px">' + escapeHtml(c.name) + '</strong>';
      h += '<div style="font-size:.78rem;color:var(--text-muted)">';
      h += '<i class="fas fa-phone"></i> ' + escapeHtml(c.phone || '—');
      h += '</div>';
      h += '</div>';

      // Points
      h += '<div style="text-align:center;flex-shrink:0">';
      h += '<div style="font-size:1.3rem;font-weight:900;color:' + tier.color + '">' + c.points + '</div>';
      h += '<div style="font-size:.68rem;color:var(--text-muted)">نقطة</div>';
      h += '</div>';

      // Arrow
      h += '<i class="fas fa-chevron-left" style="color:var(--text-muted);font-size:.85rem"></i>';

      h += '</div>';
    });
  }

  h += '</div>';

  h += '<div class="ph-modal-foot">';
  h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
  if (tierCustomers.length > 0) {
    h += '<button class="btn btn-primary" onclick="LUI.exportTierCustomers(\'' + tierId + '\')">';
    h += '<i class="fas fa-file-excel"></i> تصدير القائمة';
    h += '</button>';
  }
  h += '</div>';

  modal.innerHTML = h;
  document.getElementById('phModalOverlay').classList.add('open');
};

/* ============================================
   PUBLIC: Export tier customers
   ============================================ */
window.LUI.exportTierCustomers = function(tierId) {
  if (typeof XLSX === 'undefined') {
    if (typeof Utils !== 'undefined') Utils.toast('مكتبة Excel غير محملة', 'error');
    return;
  }

  var tiers = (typeof Loyalty !== 'undefined' && Loyalty.TIERS) ? Loyalty.TIERS : [];
  var tier = tiers.find(function(t) { return t.id === tierId; });
  if (!tier) return;

  var allStats = getAllCustomerStats();
  var tierCustomers = allStats.filter(function(c) { return c.tier.id === tierId; });

  var rows = tierCustomers.map(function(c) {
    return {
      'العميل': c.name,
      'الهاتف': c.phone,
      'النقاط': c.points,
      'المستوى': c.tier.name,
      'إجمالي الشراء': c.totalSpent
    };
  });

  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Tier-' + tier.name);
  XLSX.writeFile(wb, 'loyalty-tier-' + tierId + '-' + Date.now() + '.xlsx');

  if (typeof Utils !== 'undefined') Utils.toast('✅ تم التصدير', 'success');
};

  /* ============================================
     UTIL
     ============================================ */
  function luiTimeAgo(ts) {
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
     PATCH PAGE ROUTER
     ============================================ */
  function patchRouter() {
    if (typeof window.phRenderPage !== 'function') {
      setTimeout(patchRouter, 300);
      return;
    }
    if (window.phRenderPage.__luiPatched) return;

    var _prev = window.phRenderPage;
    window.phRenderPage = function(page) {
      if (page === 'loyalty') {
        return renderLoyaltyPage();
      }
      return _prev.call(this, page);
    };
    window.phRenderPage.__luiPatched = true;
    console.log('[Loyalty UI] ✅ Page router patched');
  }
  patchRouter();

  /* ============================================
     EXTEND CUSTOMER TABLE (phRenderCustomers)
     ============================================ */
  function patchCustomerTable() {
    if (typeof window.phRenderCustomers !== 'function') {
      setTimeout(patchCustomerTable, 500);
      return;
    }
    if (window.phRenderCustomers.__luiPatched) return;

    var _orig = window.phRenderCustomers;
    window.phRenderCustomers = function() {
      // Run original first
      var result = _orig.apply(this, arguments);
      // Then inject loyalty column
      setTimeout(injectLoyaltyColumnInCustomerTable, 50);
      return result;
    };
    window.phRenderCustomers.__luiPatched = true;
    console.log('[Loyalty UI] ✅ Customer table patched');
  }
  patchCustomerTable();

  function injectLoyaltyColumnInCustomerTable() {
    try {
      var table = document.querySelector('#phContent .ph-table');
      if (!table) return;
      if (table.dataset.loyaltyExtended) return;
      table.dataset.loyaltyExtended = 'true';

      // Add header column
      var thead = table.querySelector('thead tr');
      if (thead) {
        var th = document.createElement('th');
        th.textContent = 'الولاء';
        th.style.cssText = 'text-align:center;min-width:120px';
        var lastActionTh = thead.lastElementChild;
        if (lastActionTh) {
          thead.insertBefore(th, lastActionTh);
        } else {
          thead.appendChild(th);
        }
      }

      // Add cell to each row
      var rows = table.querySelectorAll('tbody tr');
      rows.forEach(function(tr) {
        var editBtn = tr.querySelector('.ph-actions button');
        var customerId = '';
        if (editBtn) {
          var oc = editBtn.getAttribute('onclick') || '';
          var m = oc.match(/'([^']+)'/);
          if (m) customerId = m[1];
        }

        if (!customerId) return;

        var td = document.createElement('td');
        td.style.textAlign = 'center';

        if (typeof Loyalty !== 'undefined' && Loyalty.getCustomer) {
          var lc = Loyalty.getCustomer(customerId);
          var tier = Loyalty.getTier(lc.points);

          td.innerHTML =
            '<div style="display:flex;align-items:center;gap:6px;justify-content:center">' +
              '<span style="background:' + tier.color + '22;color:' + tier.color + ';padding:3px 8px;' +
              'border-radius:999px;font-size:.68rem;font-weight:900">' +
                '<i class="fas ' + tier.icon + '"></i> ' + tier.name +
              '</span>' +
              '<button onclick="LUI.openCustomer(\'' + customerId + '\')" ' +
              'style="background:rgba(124,58,237,.1);color:#7c3aed;border:none;padding:4px 8px;' +
              'border-radius:8px;cursor:pointer;font-size:.72rem;font-weight:900">' +
                '<i class="fas fa-star"></i> ' + lc.points +
              '</button>' +
            '</div>';
        } else {
          td.innerHTML = '<span style="color:var(--text-muted);font-size:.78rem">—</span>';
        }

        var lastActionTd = tr.lastElementChild;
        if (lastActionTd) {
          tr.insertBefore(td, lastActionTd);
        } else {
          tr.appendChild(td);
        }
      });
    } catch (e) {
      console.warn('[Loyalty UI] inject column error:', e);
    }
  }

  // Watch for customer table renders
  try {
    var obs = new MutationObserver(function() {
      if (window.phCurrentPage === 'customers') {
        injectLoyaltyColumnInCustomerTable();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  /* ============================================
     EXTEND POS — Show loyalty tier when customer selected
     ============================================ */
  function enhancePOSCustomerSelect() {
    var sel = document.getElementById('phCartCustomer');
    if (!sel) return;
    if (sel.dataset.loyaltyEnhanced) return;
    sel.dataset.loyaltyEnhanced = 'true';

    // Create badge container below select
    var badge = document.createElement('div');
    badge.id = 'luiPOSBadge';
    badge.style.cssText = 'display:none;margin-top:8px;padding:10px 12px;border-radius:12px;' +
      'background:linear-gradient(135deg,rgba(124,58,237,.06),rgba(0,184,132,.04));' +
      'border:1px solid rgba(124,58,237,.2);font-size:.82rem';
    sel.parentNode.insertBefore(badge, sel.nextSibling);

    sel.addEventListener('change', function() {
      updatePOSBadge(this.value);
    });

    // Init for default value
    updatePOSBadge(sel.value);
  }

  function updatePOSBadge(customerId) {
    var badge = document.getElementById('luiPOSBadge');
    if (!badge) return;

    if (!customerId || typeof Loyalty === 'undefined') {
      badge.style.display = 'none';
      return;
    }

    var lc = Loyalty.getCustomer(customerId);
    var tier = Loyalty.getTier(lc.points);
    var next = Loyalty.getNextTier(lc.points);

    var progress = 0;
    var needed = 0;
    if (next) {
      var start = tier.min;
      var end = next.min;
      progress = ((lc.points - start) / (end - start)) * 100;
      needed = end - lc.points;
    } else {
      progress = 100;
    }

    var h = '';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">';
    h += '<span style="background:' + tier.color + ';color:#fff;padding:3px 10px;border-radius:999px;' +
         'font-size:.68rem;font-weight:900"><i class="fas ' + tier.icon + '"></i> ' + tier.name + '</span>';
    h += '<strong style="color:#7c3aed;font-size:.95rem">' + lc.points + ' نقطة</strong>';
    h += '</div>';
    h += '<div style="background:#f1f5f9;height:6px;border-radius:999px;overflow:hidden;margin-bottom:6px">';
    h += '<div style="background:linear-gradient(90deg,' + tier.color + ',#00b884);height:100%;' +
         'width:' + progress + '%;border-radius:999px;transition:width .4s"></div>';
    h += '</div>';
    if (next) {
      h += '<div style="font-size:.72rem;color:var(--text-muted);text-align:center">' +
           needed + ' نقطة للوصول إلى ' + next.name + '</div>';
    } else {
      h += '<div style="font-size:.72rem;color:#10b981;text-align:center;font-weight:900">🎉 أعلى مستوى!</div>';
    }

    badge.innerHTML = h;
    badge.style.display = 'block';
  }

  // Watch for POS render
  try {
    var posObs = new MutationObserver(function() {
      if (window.phCurrentPage === 'pos') {
        enhancePOSCustomerSelect();
      }
    });
    posObs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  // Also try on load
  setTimeout(function() {
    if (window.phCurrentPage === 'pos') enhancePOSCustomerSelect();
  }, 3000);

  console.log('[Loyalty UI v1.0] Loaded ✓');
  console.log('[Loyalty UI] Features: Full page + Tabs + Customer table column + POS badge');
})();
