/* ============================================
   PHARMACLOUD - UI POLISH v1.0
   Numbers, language, small UX fixes
   ============================================ */
'use strict';

(function() {

  /* ============================================
     1. FORCE ENGLISH NUMBERS GLOBALLY
     ============================================ */
  var _origToLocaleString = Number.prototype.toLocaleString;
  Number.prototype.toLocaleString = function(locale, options) {
    // Always use en-US (English numbers 0-9)
    return _origToLocaleString.call(this, 'en-US', options);
  };

  // Also patch Date.prototype.toLocaleString to keep English numbers
  var _origDateToLocaleString = Date.prototype.toLocaleString;
  Date.prototype.toLocaleString = function(locale, options) {
    return _origDateToLocaleString.call(this, 'en-US', options);
  };

  var _origDateToLocaleDateString = Date.prototype.toLocaleDateString;
  Date.prototype.toLocaleDateString = function(locale, options) {
    return _origDateToLocaleDateString.call(this, 'en-US', options);
  };

  var _origDateToLocaleTimeString = Date.prototype.toLocaleTimeString;
  Date.prototype.toLocaleTimeString = function(locale, options) {
    return _origDateToLocaleTimeString.call(this, 'en-US', options);
  };

  console.log('[UI Polish] English numbers enforced ✓');

  /* ============================================
     2. TRANSLATION MAP (English → Arabic)
     ============================================ */
  var TRANSLATIONS = {
    // Page Titles
    'Stockout Forecasting': 'التنبؤ بنفاد المخزون',
    'Drug Interactions': 'التداخلات الدوائية',
    'FEFO Expiry Intelligence': 'ذكاء انتهاء الصلاحية FEFO',
    'ABC Analysis': 'تحليل ABC',
    'Professional BI Dashboard': 'لوحة التحليلات الاحترافية',
    'Custom Interaction Check': 'فحص تداخلات مخصص',
    'Product Analysis': 'تحليل المنتجات',
    'Interactions Database': 'قاعدة بيانات التداخلات',
    'Classified Products': 'المنتجات المصنفة',
    'Weekly Heatmap': 'خريطة الأسبوع',
    'Peak Hours': 'أوقات الذروة',
    'Best Sellers': 'الأكثر مبيعاً',
    'Top 5 Customers': 'أفضل 5 عملاء',
    'Revenue Trend': 'اتجاه الإيرادات',
    'Category Performance': 'أداء الفئات',
    'Pareto Chart (80/20)': 'مخطط باريتو (80/20)',
    'Distribution': 'التوزيع',

    // Descriptions
    'Smart algorithm analyzing last 30 days to predict stockouts': 'خوارزمية ذكية تحلل آخر 30 يوم للتنبؤ بنفاد المخزون',
    'Smart engine with 61 known interactions - runs automatically on sale': 'محرك ذكي بـ 61 تداخل معروف - يعمل تلقائياً عند البيع',
    'Batch tracking - 90/60/30 day alerts + auto discounts': 'تتبع الباتشات - تنبيهات 90/60/30 يوم + خصومات تلقائية',
    'Product classification by revenue - smart inventory decisions': 'تصنيف المنتجات حسب الإيراد - قرارات ذكية للمخزون',
    'Comprehensive interactive analytics': 'تحليلات شاملة وتفاعلية',
    'Select 2+ drugs to check interactions': 'اختر دواءين أو أكثر لفحص التداخلات',
    'No known interactions - Safe': 'لا توجد تداخلات معروفة - آمن',
    'No results': 'لا توجد نتائج',
    'No data': 'لا توجد بيانات',
    'No batches': 'لا توجد باتشات',

    // KPI Labels
    'Total Revenue': 'إجمالي الإيرادات',
    'Today Revenue': 'إيراد اليوم',
    'Avg Order Value': 'متوسط قيمة الطلب',
    'Stock Value': 'قيمة المخزون',
    'At Risk Value': 'القيمة تحت الخطر',
    'Total Batches': 'إجمالي الباتشات',
    'Critical + Expired': 'حرج + منتهي',
    'High Risk': 'خطر عالي',
    'Medium Risk': 'خطر متوسط',
    'Low Risk': 'خطر بسيط',
    'Total Database': 'إجمالي القاعدة',
    'Stockout under 7 days': 'نفاد ≤ 7 أيام',
    'Warning under 21 days': 'تحذير ≤ 21 يوم',
    'Watch': 'مراقبة',
    'Safe': 'آمن',
    'Revenue Class A': 'إيراد الفئة A',
    'Revenue Class B': 'إيراد الفئة B',
    'Revenue Class C': 'إيراد الفئة C',

    // Buttons
    'Create PO': 'إنشاء طلب شراء',
    'Add Batch': 'إضافة باتش',
    'Export': 'تصدير',
    'Custom Check': 'فحص مخصص',
    'Dispose': 'إعدام',
    'Discount 40%': 'خصم 40%',
    'Discount 25%': 'خصم 25%',
    'Discount 15%': 'خصم 15%',
    'Discount 8%': 'خصم 8%',
    'Cancel': 'إلغاء',
    'Save': 'حفظ',
    'Close': 'إغلاق',
    'Check': 'فحص',
    'Add Drug': 'إضافة دواء',

    // Table Headers
    'Product': 'المنتج',
    'Stock': 'المخزون',
    'Avg/Day': 'المتوسط/يوم',
    'Sold 30d': 'المبيعات 30 يوم',
    'Days Left': 'الأيام المتبقية',
    'Suggested Qty': 'الكمية المقترحة',
    'Status': 'الحالة',
    'Batch': 'الباتش',
    'Qty': 'الكمية',
    'Expiry': 'الانتهاء',
    'Value': 'القيمة',
    'Action': 'إجراء',
    'Drug A': 'الدواء A',
    'Drug B': 'الدواء B',
    'Severity': 'الخطورة',
    'Description': 'الوصف',
    'Category': 'الفئة',
    'Revenue': 'الإيراد',
    'Qty Sold': 'الكمية المباعة',
    'Share': 'الحصة',
    'Class': 'التصنيف',

    // Status
    'Expired - Dispose Now': 'منتهي - إعدام فوري',
    'Critical - Under 30 Days': 'حرج - أقل من 30 يوم',
    'Warning - Under 60 Days': 'تحذير - أقل من 60 يوم',
    'Info - Under 90 Days': 'تنبيه - أقل من 90 يوم',
    'Expired - Dispose': 'منتهي - إعدام',
    'Critical under 30 days': 'حرج أقل من 30 يوم',
    'Warning under 60 days': 'تحذير أقل من 60 يوم',
    'Info under 90 days': 'تنبيه أقل من 90 يوم',

    // Severity
    'High': 'عالي',
    'Medium': 'متوسط',
    'Low': 'بسيط',

    // Stockout
    'Stockout Risk': 'خطر نفاد',
    'Warning': 'تحذير',
    'Normal': 'طبيعي'
  };

  /* ============================================
     3. AUTO-TRANSLATE DOM
     ============================================ */
  function translateNode(node) {
    if (node.nodeType === 3) { // Text node
      var text = node.nodeValue;
      if (!text || !text.trim()) return;
      var trimmed = text.trim();
      if (TRANSLATIONS[trimmed]) {
        node.nodeValue = text.replace(trimmed, TRANSLATIONS[trimmed]);
      }
      return;
    }

    if (node.nodeType === 1) { // Element
      // Skip if it's a script/style/input
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'INPUT' ||
          tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'OPTION') return;

      // Check placeholders
      if (node.placeholder && TRANSLATIONS[node.placeholder]) {
        node.placeholder = TRANSLATIONS[node.placeholder];
      }

      // Check title attributes
      if (node.title && TRANSLATIONS[node.title]) {
        node.title = TRANSLATIONS[node.title];
      }

      // Translate children
      for (var i = 0; i < node.childNodes.length; i++) {
        translateNode(node.childNodes[i]);
      }
    }
  }

  function translateAll() {
    var root = document.getElementById('phContent') || document.getElementById('saContent') || document.body;
    if (root) translateNode(root);
  }

  // Run on page render
  var translateDebounced = (function() {
    var t;
    return function() {
      clearTimeout(t);
      t = setTimeout(translateAll, 50);
    };
  })();

  // Observe DOM changes
  var observer = new MutationObserver(translateDebounced);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: false
  });

  // Also run on hash change / route change
  window.addEventListener('hashchange', translateDebounced);
  window.addEventListener('popstate', translateDebounced);

  // Initial run
  setTimeout(translateAll, 500);
  setTimeout(translateAll, 1500);

  console.log('[UI Polish] Auto-translation active ✓');

  /* ============================================
     4. DATE FORMATTING (SAFE OVERRIDE)
     ملاحظة: Utils معرّف بـ Object.freeze() في app.js
     فمينفعش نعدل عليه. بدل ده، بنعتمد على
     Date.prototype patches فوق (English format)
     ============================================ */
  // الدالة دي مش بنعملها override على Utils
  // بدل كده بنستخدم global helpers

  if (typeof window.formatDate === 'function') {
    try {
      window.formatDate = function(d) {
        try { return new Date(d).toLocaleDateString('en-GB'); }
        catch (e) { return '—'; }
      };
    } catch (e) {
      // لو مش writable، نتجاهل
    }
  }

  if (typeof window.formatDateTime === 'function') {
    try {
      window.formatDateTime = function(d) {
        try {
          var date = new Date(d);
          return date.toLocaleDateString('en-GB') + ' ' +
                 date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return '—'; }
      };
    } catch (e) {}
  }

  console.log('[UI Polish] Date formatting standardized ✓');

  /* ============================================
     5. POLISH: Add classes to elements
     ============================================ */
  setTimeout(function() {
    // Add .num class to all KPI values for tabular numbers
    document.querySelectorAll('.ph-kpi-value, .sa-kpi-value, .bi-value-big').forEach(function(el) {
      el.classList.add('num');
    });

    // Add smooth transition to sidebar items
    document.querySelectorAll('.ph-item, .sa-item').forEach(function(el) {
      el.style.transition = 'all .25s cubic-bezier(.4,0,.2,1)';
    });
  }, 800);

  /* ============================================
     6. HIDE EMPTY SIDEBAR SECTIONS
     ============================================ */
  function hideEmptySections() {
    document.querySelectorAll('.ph-section, .sa-section').forEach(function(section) {
      var items = section.querySelectorAll('.ph-item, .sa-item');
      var visibleItems = 0;
      items.forEach(function(item) {
        if (item.style.display !== 'none') visibleItems++;
      });
      if (visibleItems === 0) {
        section.style.display = 'none';
      }
    });
  }

  setTimeout(hideEmptySections, 2000);

  /* ============================================
     7. TOAST IMPROVEMENTS + GLOBAL STYLES
     ============================================ */
  var style = document.createElement('style');
  style.id = 'ui-polish-styles';
  style.textContent = `
    .toast {
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      font-weight: 800 !important;
      letter-spacing: .3px;
      box-shadow: 0 20px 60px rgba(0,0,0,.25),
                  0 0 0 1px rgba(255,255,255,.1) inset !important;
    }

    /* Smoother page transitions */
    .ph-content, .sa-content {
      transition: opacity .25s ease;
    }

    /* Better focus states */
    button:focus-visible, a:focus-visible, input:focus-visible {
      outline: 2px solid var(--primary);
      outline-offset: 3px;
      border-radius: 8px;
    }

    /* Number always LTR (even in RTL pages) */
    .num, .ph-kpi-value, .sa-kpi-value,
    .ph-table td strong, .sa-table td strong,
    .price, code, .api-key-display {
      direction: ltr;
      unicode-bidi: embed;
      display: inline-block;
    }

    /* Currency symbol always after number */
    .ph-kpi-value::after,
    .sa-kpi-value::after {
      content: '';
    }
  `;

  if (!document.getElementById('ui-polish-styles')) {
    document.head.appendChild(style);
  }

  console.log('[UI Polish] All enhancements applied ✓');
  console.log('[UI Polish] v1.0 ready');
})();