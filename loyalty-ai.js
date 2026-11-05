/* ============================================
   PHARMACLOUD - LOYALTY AI v2.0
   Fixed + Enhanced UI
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var SEGMENT_META = {
    champions: { color: '#10b981', colorLight: '#34d399', shadow: 'rgba(16,185,129,.35)', glow: 'rgba(16,185,129,.15)' },
    loyal:     { color: '#1E88E5', colorLight: '#42a5f5', shadow: 'rgba(30,136,229,.35)', glow: 'rgba(30,136,229,.15)' },
    promising: { color: '#7c3aed', colorLight: '#a78bfa', shadow: 'rgba(124,58,237,.35)', glow: 'rgba(124,58,237,.15)' },
    at_risk:   { color: '#f59e0b', colorLight: '#fbbf24', shadow: 'rgba(245,158,11,.35)', glow: 'rgba(245,158,11,.15)' },
    lost:      { color: '#94a3b8', colorLight: '#cbd5e1', shadow: 'rgba(148,163,184,.35)', glow: 'rgba(148,163,184,.15)' },
    new:       { color: '#06b6d4', colorLight: '#22d3ee', shadow: 'rgba(6,182,212,.35)', glow: 'rgba(6,182,212,.15)' }
  };

  function segColor(seg) {
    return (SEGMENT_META[seg] || SEGMENT_META.new).color;
  }
  function segColorLight(seg) {
    return (SEGMENT_META[seg] || SEGMENT_META.new).colorLight;
  }
  function segShadow(seg) {
    return (SEGMENT_META[seg] || SEGMENT_META.new).shadow;
  }
  function segGlow(seg) {
    return (SEGMENT_META[seg] || SEGMENT_META.new).glow;
  }
  function rgba(hex, alpha) {
    if (!hex) return 'rgba(124,58,237,' + alpha + ')';
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function(c) { return c + c; }).join('');
    var r = parseInt(hex.substring(0, 2), 16);
    var g = parseInt(hex.substring(2, 4), 16);
    var b = parseInt(hex.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  /* ============================================
     MAIN RENDER
     ============================================ */
  function renderLoyaltyAIPage() {
    if (typeof AIEngine === 'undefined') {
      console.warn('[Loyalty AI] AIEngine not loaded');
      return;
    }

    var content = document.getElementById('phContent');
    if (!content) return;

    var segments = AIEngine.segmentCustomers();
    var totalCustomers = segments.length;
    var totalRevenue = segments.reduce(function(s, c) { return s + c.monetary; }, 0);

    // Group by segment
    var groups = {};
    segments.forEach(function(c) {
      if (!groups[c.segment]) {
        groups[c.segment] = {
          key: c.segment,
          label: c.segmentLabel,
          color: c.segmentColor,
          icon: c.segmentIcon,
          customers: [],
          totalRevenue: 0,
          totalPoints: 0
        };
      }
      groups[c.segment].customers.push(c);
      groups[c.segment].totalRevenue += c.monetary;
    });

    // At risk
    var atRisk = [];
    segments.forEach(function(c) {
      var churn = AIEngine.predictChurn(c.id);
      if (churn && churn.churnScore >= 50) {
        atRisk.push({ customer: c, churn: churn });
      }
    });
    atRisk.sort(function(a, b) { return b.churn.churnScore - a.churn.churnScore; });

    // Average CLV
    var totalCLV = 0, clvCount = 0;
    segments.slice(0, 20).forEach(function(c) {
      var clv = AIEngine.calculateCLV(c.id);
      if (clv && clv.clv > 0) { totalCLV += clv.clv; clvCount++; }
    });
    var avgCLV = clvCount > 0 ? Math.round(totalCLV / clvCount) : 0;

    var h = '';

    // ===== HERO =====
    h += '<div class="ai-hero">';
    h += '<div class="ai-hero-content">';
    h += '<div class="ai-hero-badge"><i class="fas fa-robot"></i> مدعوم بـ AI Engine</div>';
    h += '<h1>AI Insights</h1>';
    h += '<p>تحليل ذكي لسلوك عملائك — تصنيف تلقائي + توقع خطر المغادرة + عروض مخصصة لكل عميل</p>';
    h += '</div>';
    h += '<div class="ai-hero-actions">';
    h += '<button class="ai-hero-btn" onclick="LoyaltyAI.refresh()"><i class="fas fa-sync-alt"></i> تحديث التحليل</button>';
    h += '<button class="ai-hero-btn primary" onclick="LoyaltyAI.showAllOffers()"><i class="fas fa-magic"></i> توليد عروض للجميع</button>';
    h += '</div>';
    h += '</div>';

    // ===== KPI CARDS =====
    h += '<div class="ai-kpi-grid">';
    h += kpiCard('fa-users', '👥', totalCustomers, 'إجمالي العملاء', '#7c3aed', null);
    h += kpiCard('fa-exclamation-triangle', '🚨', atRisk.length, 'في خطر المغادرة', '#dc2626', atRisk.length > 0 ? { text: 'يحتاج تدخل', type: 'down' } : null);
    h += kpiCard('fa-layer-group', '💎', Object.keys(groups).length, 'شرائح ذكية', '#1E88E5', null);
    h += kpiCard('fa-coins', '💰', totalRevenue.toLocaleString('en-US'), 'إجمالي الإيرادات', '#00b884', null);
    h += '</div>';

    // ===== ALERT =====
    if (atRisk.length > 0) {
      h += '<div class="ai-alert-banner danger">';
      h += '<div class="ai-alert-icon"><i class="fas fa-exclamation-triangle"></i></div>';
      h += '<div class="ai-alert-body">';
      h += '<strong>' + atRisk.length + ' عميل في خطر المغادرة — يحتاجون تدخل فوري</strong>';
      h += '<p>قدروا يخسروا في أي وقت. اضغط "عرض الكل" عشان تشوف الإجراءات المقترحة</p>';
      h += '</div>';
      h += '<button class="ai-hero-btn primary" onclick="LoyaltyAI.scrollToAtRisk()"><i class="fas fa-eye"></i> عرض الكل</button>';
      h += '</div>';
    } else {
      h += '<div class="ai-alert-banner success">';
      h += '<div class="ai-alert-icon"><i class="fas fa-check-circle"></i></div>';
      h += '<div class="ai-alert-body">';
      h += '<strong>كل العملاء بخير! ✅</strong>';
      h += '<p>مفيش عملاء في خطر المغادرة دلوقتي — استمر في المتابعة</p>';
      h += '</div>';
      h += '</div>';
    }

    // ===== SEGMENTS SECTION =====
    h += '<div class="ai-section-title">';
    h += '<i class="fas fa-layer-group"></i>';
    h += '<h2>الشرائح الذكية</h2>';
    h += '<span class="ai-section-badge">' + Object.keys(groups).length + ' شرائح</span>';
    h += '</div>';

    h += '<div class="ai-segments-grid">';
    // Sort groups by count desc
    var sortedGroups = Object.keys(groups).map(function(k) { return groups[k]; })
      .sort(function(a, b) { return b.customers.length - a.customers.length; });

    sortedGroups.forEach(function(g) {
      var pct = totalCustomers > 0 ? (g.customers.length / totalCustomers) * 100 : 0;
      var avgSpent = g.customers.length > 0 ? Math.round(g.totalRevenue / g.customers.length) : 0;

      h += '<div class="ai-segment-card" ' +
           'onclick="LoyaltyAI.showSegment(\'' + g.key + '\')" ' +
           'style="--seg-color:' + g.color + ';' +
                  '--seg-color-light:' + segColorLight(g.key) + ';' +
                  '--seg-color-30:' + rgba(g.color, 0.3) + ';' +
                  '--seg-color-shadow:' + segShadow(g.key) + ';' +
                  '--seg-color-glow:' + segGlow(g.key) + '">';

      h += '<div class="ai-segment-head">';
      h += '<div class="ai-segment-icon" style="background:linear-gradient(135deg,' + g.color + ',' + segColorLight(g.key) + ')">';
      h += '<i class="fas ' + g.icon + '"></i>';
      h += '</div>';
      h += '<div class="ai-segment-info">';
      h += '<h3>' + g.label + '</h3>';
      h += '<span>' + g.customers.length + ' عميل • ' + pct.toFixed(0) + '% من العملاء</span>';
      h += '</div>';
      h += '</div>';

      h += '<div class="ai-segment-body">';
      h += '<div class="ai-segment-stat">';
      h += '<span>إجمالي الشراء</span>';
      h += '<strong>' + g.totalRevenue.toLocaleString('en-US') + ' ج</strong>';
      h += '</div>';
      h += '<div class="ai-segment-stat">';
      h += '<span>متوسط الشراء</span>';
      h += '<strong>' + avgSpent.toLocaleString('en-US') + ' ج</strong>';
      h += '</div>';
      h += '</div>';

      h += '<div class="ai-segment-progress">';
      h += '<div class="ai-segment-progress-fill" style="width:' + pct + '%"></div>';
      h += '</div>';

      h += '<div class="ai-segment-arrow"><i class="fas fa-arrow-left"></i></div>';
      h += '</div>';
    });
    h += '</div>';

    // ===== AT-RISK SECTION =====
    if (atRisk.length > 0) {
      h += '<div class="ai-section-title" id="aiAtRiskAnchor">';
      h += '<i class="fas fa-heart-broken" style="background:linear-gradient(135deg,#dc2626,#ef4444)"></i>';
      h += '<h2>عملاء في خطر</h2>';
      h += '<span class="ai-section-badge" style="background:rgba(220,38,38,.1);color:#dc2626;border-color:rgba(220,38,38,.2)">' + atRisk.length + ' عميل</span>';
      h += '</div>';

      h += '<div class="ai-at-risk-card">';
      h += '<div style="overflow-x:auto"><table class="ai-at-risk-table">';
      h += '<thead><tr>';
      h += '<th>العميل</th>';
      h += '<th>آخر زيارة</th>';
      h += '<th>الزيارات</th>';
      h += '<th>خطر المغادرة</th>';
      h += '<th>الإجراء المقترح</th>';
      h += '<th style="text-align:center">عرض</th>';
      h += '</tr></thead><tbody>';

      atRisk.slice(0, 15).forEach(function(item) {
        var c = item.customer;
        var churn = item.churn;

        h += '<tr onclick="LoyaltyAI.showOffer(\'' + c.id + '\')">';
        h += '<td>';
        h += '<div class="ai-customer-cell">';
        h += '<div class="ai-customer-avatar">' + escapeHtml((c.name || '؟').charAt(0)) + '</div>';
        h += '<div class="ai-customer-info">';
        h += '<strong>' + escapeHtml(c.name) + '</strong>';
        h += '<span>' + escapeHtml(c.phone || '—') + '</span>';
        h += '</div>';
        h += '</div>';
        h += '</td>';

        h += '<td><strong>' + c.recencyDays + '</strong> يوم</td>';
        h += '<td><strong>' + c.frequency + '</strong> مرة</td>';

        h += '<td>';
        h += '<div class="ai-risk-bar">';
        h += '<div class="ai-risk-track">';
        h += '<div class="ai-risk-fill" style="width:' + churn.churnScore + '%;background:linear-gradient(90deg,' + churn.riskColor + ',' + rgba(churn.riskColor, 0.7) + ')"></div>';
        h += '</div>';
        h += '<span class="ai-risk-value" style="color:' + churn.riskColor + '">' + churn.churnScore + '%</span>';
        h += '</div>';
        h += '</td>';

        h += '<td>';
        h += '<span class="ai-action-label" style="background:' + rgba(churn.action.color, 0.1) + ';color:' + churn.action.color + '">';
        h += '<i class="fas ' + churn.action.icon + '"></i> ' + churn.action.label;
        h += '</span>';
        h += '</td>';

        h += '<td style="text-align:center" onclick="event.stopPropagation()">';
        h += '<button class="btn btn-primary btn-sm" onclick="LoyaltyAI.showOffer(\'' + c.id + '\')">';
        h += '<i class="fas fa-gift"></i> عرض';
        h += '</button>';
        h += '</td>';

        h += '</tr>';
      });

      h += '</tbody></table></div>';
      h += '</div>';
    } else {
      h += '<div class="ai-empty">';
      h += '<div class="ai-empty-icon"><i class="fas fa-check-circle"></i></div>';
      h += '<h4>كل العملاء بخير! ✅</h4>';
      h += '<p>مفيش عملاء في خطر المغادرة دلوقتي</p>';
      h += '</div>';
    }

    content.innerHTML = h;
    console.log('[Loyalty AI] ✅ Rendered', segments.length, 'customers,', atRisk.length, 'at risk');
  }

  /* ============================================
     KPI CARD HELPER
     ============================================ */
  function kpiCard(icon, emoji, value, label, color, trend) {
    var h = '<div class="ai-kpi-card" style="--kpi-color:' + color + '">';
    h += '<div class="ai-kpi-head">';
    h += '<div class="ai-kpi-icon" style="background:linear-gradient(135deg,' + color + ',' + rgba(color, 0.7) + ')">';
    h += '<i class="fas ' + icon + '"></i>';
    h += '</div>';
    if (trend) {
      h += '<span class="ai-kpi-trend ' + trend.type + '">';
      h += '<i class="fas fa-arrow-' + (trend.type === 'up' ? 'up' : 'down') + '"></i> ' + trend.text;
      h += '</span>';
    }
    h += '</div>';
    h += '<div class="ai-kpi-value">' + value + '</div>';
    h += '<div class="ai-kpi-label">' + emoji + ' ' + label + '</div>';
    h += '</div>';
    return h;
  }

  /* ============================================
     SHOW SEGMENT DETAILS
     ============================================ */
  function showSegment(segmentKey) {
    var segments = AIEngine.segmentCustomers();
    var group = segments.filter(function(c) { return c.segment === segmentKey; });
    if (group.length === 0) return;

    var first = group[0];
    var meta = SEGMENT_META[segmentKey] || SEGMENT_META.new;

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var h = '';
    h += '<div class="ai-modal-head" style="background:linear-gradient(135deg,' + first.segmentColor + ',' + meta.colorLight + ')">';
    h += '<h3><i class="fas ' + first.segmentIcon + '"></i> عملاء "' + escapeHtml(first.segmentLabel) + '"</h3>';
    h += '<button class="close-btn" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body">';

    // Info banner
    h += '<div style="background:' + rgba(first.segmentColor, 0.08) + ';border:1px solid ' + rgba(first.segmentColor, 0.25) + ';border-radius:14px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:14px">';
    h += '<div style="width:56px;height:56px;border-radius:14px;background:' + first.segmentColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;box-shadow:0 10px 25px ' + rgba(first.segmentColor, 0.35) + '">';
    h += '<i class="fas ' + first.segmentIcon + '"></i>';
    h += '</div>';
    h += '<div style="flex:1">';
    h += '<div style="font-size:1.15rem;font-weight:900;color:' + first.segmentColor + ';margin-bottom:2px">' + escapeHtml(first.segmentLabel) + '</div>';
    h += '<div style="font-size:.85rem;color:var(--text-muted)">' + group.length + ' عميل في الشريحة دي</div>';
    h += '</div>';
    h += '</div>';

    // Customer cards
    h += '<div style="display:grid;gap:10px">';
    group.slice(0, 30).forEach(function(c) {
      var churn = AIEngine.predictChurn(c.id);

      h += '<div style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;transition:all .25s;cursor:pointer" ' +
           'onmouseover="this.style.transform=\'translateX(-4px)\';this.style.borderColor=\'' + first.segmentColor + '\';this.style.boxShadow=\'0 10px 24px ' + rgba(first.segmentColor, 0.15) + '\'" ' +
           'onmouseout="this.style.transform=\'none\';this.style.borderColor=\'var(--border-light)\';this.style.boxShadow=\'none\'" ' +
           'onclick="phCloseModal();setTimeout(function(){LoyaltyAI.showOffer(\'' + c.id + '\')},300)">';

      h += '<div style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,' + first.segmentColor + ',' + meta.colorLight + ');color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.05rem;flex-shrink:0;box-shadow:0 6px 16px ' + rgba(first.segmentColor, 0.3) + '">';
      h += escapeHtml((c.name || '؟').charAt(0));
      h += '</div>';

      h += '<div style="flex:1;min-width:0">';
      h += '<strong style="display:block;font-size:.92rem;margin-bottom:2px">' + escapeHtml(c.name) + '</strong>';
      h += '<div style="font-size:.75rem;color:var(--text-muted)">' + escapeHtml(c.phone || '—') + ' • ' + c.frequency + ' زيارة</div>';
      h += '</div>';

      h += '<div style="text-align:end;flex-shrink:0">';
      h += '<div style="font-size:.95rem;font-weight:900;color:' + first.segmentColor + '">' + c.monetary.toLocaleString('en-US') + ' ج</div>';
      if (churn) {
        h += '<div style="font-size:.7rem;color:' + churn.riskColor + ';font-weight:900">خطر: ' + churn.churnScore + '%</div>';
      }
      h += '</div>';

      h += '<i class="fas fa-chevron-left" style="color:var(--text-muted);font-size:.85rem"></i>';
      h += '</div>';
    });
    h += '</div>';

    if (group.length > 30) {
      h += '<div style="text-align:center;padding:16px;color:var(--text-muted);font-size:.82rem">و ' + (group.length - 30) + ' عميل آخر...</div>';
    }

    h += '</div>';
    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
    h += '</div>';

    modal.innerHTML = h;
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     SHOW PERSONALIZED OFFER — FIXED BUG
     ============================================ */
  function showOffer(customerId) {
    var offer = AIEngine.generatePersonalizedOffer(customerId);
    if (!offer) {
      if (typeof Utils !== 'undefined') Utils.toast('لا يمكن توليد عرض لهذا العميل', 'warning');
      return;
    }

    var churn = AIEngine.predictChurn(customerId);
    var clv = AIEngine.calculateCLV(customerId);

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var isChampion = offer.segment === 'champions';
    var segmentColor = isChampion ? '#FFD700' : '#7c3aed';
    var segmentColorLight = isChampion ? '#FFA500' : '#a78bfa';
    var customerClass = isChampion ? 'champions' : '';

    var h = '';

    // Header
    h += '<div class="ai-modal-head">';
    h += '<h3><i class="fas fa-magic"></i> عرض مخصص بالذكاء الاصطناعي</h3>';
    h += '<button class="close-btn" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body">';

    // ===== CUSTOMER HEADER (FIXED) =====
    h += '<div class="ai-offer-customer ' + customerClass + '">';
    h += '<div class="ai-offer-customer-avatar">';
    h += escapeHtml((offer.customerName || '؟').charAt(0));
    h += '</div>';
    h += '<div class="ai-offer-customer-info">';
    h += '<strong>' + escapeHtml(offer.customerName) + '</strong>';
    h += '<span class="ai-offer-customer-badge" style="background:' + rgba(segmentColor, 0.15) + ';color:' + (isChampion ? '#B8860B' : segmentColor) + '">';
    h += '<i class="fas fa-crown"></i> ' + escapeHtml(offer.segmentLabel);
    h += '</span>';
    h += '</div>';
    h += '</div>';

    // ===== OFFER HERO =====
    h += '<div class="ai-offer-hero">';
    h += '<span class="ai-offer-hero-emoji">🎁</span>';
    h += '<h3>' + escapeHtml(offer.offerTitle) + '</h3>';
    h += '<p>' + escapeHtml(offer.offerBody) + '</p>';
    h += '<div class="ai-offer-badges">';
    if (offer.discount > 0) {
      h += '<span class="ai-offer-badge discount">خصم ' + offer.discount + '%</span>';
    }
    if (offer.extraPoints > 0) {
      h += '<span class="ai-offer-badge points">+' + offer.extraPoints + ' نقطة</span>';
    }
    h += '</div>';
    h += '</div>';

    // ===== REASON =====
    h += '<div class="ai-offer-reason">';
    h += '<div class="ai-offer-reason-title"><i class="fas fa-lightbulb"></i> ليه اخترنالك العرض ده؟</div>';
    h += '<div class="ai-offer-reason-text">' + escapeHtml(offer.reason) + '</div>';
    h += '</div>';

    // ===== ANALYTICS =====
    h += '<div class="ai-offer-analytics">';
    if (churn) {
      h += '<div class="ai-offer-analytic" style="--analytic-color:' + churn.riskColor + '">';
      h += '<div class="ai-offer-analytic-label">خطر المغادرة</div>';
      h += '<div class="ai-offer-analytic-value">' + churn.churnScore + '%</div>';
      h += '</div>';
    }
    if (clv && clv.clv > 0) {
      h += '<div class="ai-offer-analytic" style="--analytic-color:#00b884">';
      h += '<div class="ai-offer-analytic-label">القيمة المتوقعة</div>';
      h += '<div class="ai-offer-analytic-value">' + clv.clv.toLocaleString('en-US') + ' ج</div>';
      h += '</div>';
    }
    h += '</div>';

    // ===== ACTIONS =====
    h += '<div class="ai-offer-actions">';
    h += '<button class="btn btn-outline" onclick="LoyaltyAI.copyOfferMessage()"><i class="fas fa-copy"></i> نسخ الرسالة</button>';
    h += '<button class="btn btn-success" onclick="LoyaltyAI.sendWhatsApp(\'' + customerId + '\')"><i class="fab fa-whatsapp"></i> إرسال واتساب</button>';
    h += '</div>';

    h += '</div>';

    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
    h += '<button class="btn btn-primary" onclick="LoyaltyAI.markOfferSent(\'' + customerId + '\')"><i class="fas fa-check"></i> تم الإرسال</button>';
    h += '</div>';

    modal.innerHTML = h;
    document.getElementById('phModalOverlay').classList.add('open');

    window._lastOffer = offer;
    window._lastOfferCustomerId = customerId;
  }

  /* ============================================
     SHOW ALL OFFERS
     ============================================ */
  function showAllOffers() {
    var segments = AIEngine.segmentCustomers();
    if (segments.length === 0) {
      if (typeof Utils !== 'undefined') Utils.toast('لا يوجد عملاء', 'warning');
      return;
    }

    // Priority: at-risk first, then by CLV
    var prioritized = segments.map(function(c) {
      var churn = AIEngine.predictChurn(c.id);
      var clv = AIEngine.calculateCLV(c.id);
      return {
        customer: c,
        churn: churn,
        clv: clv,
        priority: (churn ? churn.churnScore : 0) * 0.6 + ((clv ? clv.clv : 0) / 500) * 0.4
      };
    }).sort(function(a, b) { return b.priority - a.priority; });

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var h = '';
    h += '<div class="ai-modal-head">';
    h += '<h3><i class="fas fa-magic"></i> عروض مخصصة لجميع العملاء</h3>';
    h += '<button class="close-btn" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body">';
    h += '<div style="background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(30,136,229,.05));border:1px solid rgba(124,58,237,.2);border-radius:14px;padding:14px 18px;margin-bottom:18px;font-size:.85rem">';
    h += '<i class="fas fa-info-circle" style="color:#7c3aed"></i> ';
    h += 'العروض مرتبة حسب الأولوية (خطر + قيمة العميل). أول 10 عملاء هم الأهم.';
    h += '</div>';

    h += '<div style="display:grid;gap:10px;max-height:60vh;overflow-y:auto;padding-inline-end:4px">';
    prioritized.slice(0, 20).forEach(function(item) {
      var c = item.customer;
      var churn = item.churn;
      var clv = item.clv;
      var offer = AIEngine.generatePersonalizedOffer(c.id);

      h += '<div style="background:#fff;border:1px solid var(--border-light);border-radius:14px;padding:14px;display:flex;align-items:center;gap:12px;transition:all .25s;cursor:pointer" ' +
           'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.boxShadow=\'0 12px 28px rgba(0,0,0,.08)\'" ' +
           'onmouseout="this.style.transform=\'none\';this.style.boxShadow=\'none\'" ' +
           'onclick="phCloseModal();setTimeout(function(){LoyaltyAI.showOffer(\'' + c.id + '\')},300)">';

      h += '<div style="width:44px;height:44px;border-radius:50%;background:' + c.segmentColor + ';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;flex-shrink:0">';
      h += escapeHtml((c.name || '؟').charAt(0));
      h += '</div>';

      h += '<div style="flex:1;min-width:0">';
      h += '<strong style="display:block;font-size:.9rem;margin-bottom:2px">' + escapeHtml(c.name) + '</strong>';
      h += '<div style="font-size:.72rem;color:var(--text-muted);display:flex;gap:8px;flex-wrap:wrap">';
      if (churn) {
        h += '<span style="color:' + churn.riskColor + ';font-weight:900">⚠️ ' + churn.churnScore + '%</span>';
      }
      if (clv && clv.clv > 0) {
        h += '<span style="color:#00b884;font-weight:900">💰 ' + clv.clv.toLocaleString('en-US') + ' ج</span>';
      }
      h += '</div>';
      h += '</div>';

      if (offer) {
        h += '<div style="padding:4px 10px;border-radius:999px;background:' + rgba(c.segmentColor, 0.12) + ';color:' + c.segmentColor + ';font-size:.7rem;font-weight:900;flex-shrink:0">';
        h += offer.discount > 0 ? offer.discount + '% خصم' : '+' + offer.extraPoints + ' نقطة';
        h += '</div>';
      }

      h += '<i class="fas fa-chevron-left" style="color:var(--text-muted);font-size:.85rem"></i>';
      h += '</div>';
    });
    h += '</div>';

    h += '</div>';
    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
    h += '</div>';

    modal.innerHTML = h;
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     ACTIONS
     ============================================ */
  function copyOfferMessage() {
    var offer = window._lastOffer;
    if (!offer) return;

    var message = offer.offerTitle + '\n\n' +
                  offer.offerBody + '\n\n' +
                  '🎁 العرض صالح حتى: ' + new Date(offer.validUntil).toLocaleDateString('en-GB') + '\n' +
                  '📍 صيدلية PharmaCloud';

    if (navigator.clipboard) {
      navigator.clipboard.writeText(message).then(function() {
        if (typeof Utils !== 'undefined') Utils.toast('✅ تم نسخ الرسالة', 'success');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = message;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم نسخ الرسالة', 'success');
    }
  }

  function sendWhatsApp(customerId) {
    var offer = window._lastOffer;
    if (!offer) return;

    var customers = [];
    try {
      if (typeof PH !== 'undefined') customers = PH.getCustomers() || [];
    } catch (e) {}

    var c = customers.find(function(x) { return x.id === customerId; });
    if (!c || !c.phone) {
      if (typeof Utils !== 'undefined') Utils.toast('رقم العميل غير متاح', 'warning');
      return;
    }

    var phone = c.phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '20' + phone.substring(1);

    var msg = offer.offerTitle + '\n\n' + offer.offerBody;
    var url = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(msg);
    window.open(url, '_blank');
  }

  function markOfferSent(customerId) {
    try {
      var sent = JSON.parse(localStorage.getItem('pc_ai_offers_sent') || '{}');
      sent[customerId] = { at: new Date().toISOString(), offer: window._lastOffer };
      localStorage.setItem('pc_ai_offers_sent', JSON.stringify(sent));
    } catch (e) {}

    if (typeof phCloseModal === 'function') phCloseModal();
    if (typeof Utils !== 'undefined') Utils.toast('✅ تم تسجيل الإرسال', 'success');
  }

  function scrollToAtRisk() {
    var el = document.getElementById('aiAtRiskAnchor');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ============================================
     PATCH ROUTER
     ============================================ */
  function patchRouter() {
    if (typeof window.phRenderPage !== 'function') {
      setTimeout(patchRouter, 300);
      return;
    }
    if (window.phRenderPage.__loyaltyAIPatched) return;

    var _prev = window.phRenderPage;
    window.phRenderPage = function(page) {
      if (page === 'loyalty-ai' || page === 'ai-insights') {
        return renderLoyaltyAIPage();
      }
      return _prev.call(this, page);
    };
    window.phRenderPage.__loyaltyAIPatched = true;
    console.log('[Loyalty AI] ✅ Router patched');
  }
  patchRouter();

  /* ============================================
     PUBLIC API
     ============================================ */
  window.LoyaltyAI = {
    render: renderLoyaltyAIPage,
    refresh: function() {
      if (typeof AIEngine !== 'undefined') AIEngine.clearCache();
      renderLoyaltyAIPage();
      if (typeof Utils !== 'undefined') Utils.toast('🔄 تم تحديث التحليل', 'success');
    },
    showSegment: showSegment,
    showOffer: showOffer,
    showAllOffers: showAllOffers,
    copyOfferMessage: copyOfferMessage,
    sendWhatsApp: sendWhatsApp,
    markOfferSent: markOfferSent,
    scrollToAtRisk: scrollToAtRisk
  };

  console.log('[Loyalty AI v2.0] Loaded ✓');
  console.log('[Loyalty AI] Fixed: offer modal + enhanced: interactive UI');
})();