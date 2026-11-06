/* ============================================
   PHARMACLOUD - I18N PRO v1.0
   AR + EN + Auto RTL/LTR + Format + AI Translate
   ============================================ */
'use strict';

(function() {
  if (window.__PC_I18N_PRO__) return;
  window.__PC_I18N_PRO__ = true;

  const LANGS = {
    ar: { name: 'العربية', flag: '🇪🇬', dir: 'rtl', locale: 'ar-EG', font: 'Cairo' },
    en: { name: 'English', flag: '🇬🇧', dir: 'ltr', locale: 'en-US', font: 'Inter' }
  };

  const TRANSLATIONS = {
    ar: {
      // Common
      'app.name': 'PharmaCloud',
      'app.tagline': 'منصة إدارة الصيدليات السحابية',
      'common.save': 'حفظ',
      'common.cancel': 'إلغاء',
      'common.delete': 'حذف',
      'common.edit': 'تعديل',
      'common.add': 'إضافة',
      'common.close': 'إغلاق',
      'common.loading': 'جاري التحميل...',
      'common.search': 'بحث',
      'common.confirm': 'تأكيد',
      'common.yes': 'نعم',
      'common.no': 'لا',
      'common.back': 'رجوع',
      'common.next': 'التالي',
      'common.done': 'تم',
      'common.error': 'خطأ',
      'common.success': 'نجح',
      'common.warning': 'تحذير',
      'common.info': 'معلومة',

      // Navigation
      'nav.features': 'المميزات',
      'nav.pricing': 'الأسعار',
      'nav.howItWorks': 'كيف يعمل',
      'nav.faq': 'الأسئلة',
      'nav.contact': 'تواصل',
      'nav.login': 'تسجيل الدخول',
      'nav.signup': 'ابدأ مجاناً',
      'nav.logout': 'تسجيل الخروج',

      // Auth
      'auth.welcome': 'أهلاً بيك',
      'auth.subtitle': 'سجل دخول أو أنشئ حساب صيدلية جديدة',
      'auth.email': 'البريد الإلكتروني',
      'auth.password': 'كلمة المرور',
      'auth.forgotPassword': 'نسيت كلمة المرور؟',
      'auth.rememberMe': 'تذكرني 30 يوم',
      'auth.noAccount': 'معندكش حساب؟',
      'auth.hasAccount': 'عندك حساب بالفعل؟',
      'auth.createAccount': 'أنشئ حساب',
      'auth.signIn': 'سجل دخول',

      // Dashboard
      'dash.overview': 'نظرة عامة',
      'dash.pos': 'نقطة البيع',
      'dash.orders': 'الطلبات',
      'dash.products': 'المنتجات',
      'dash.customers': 'العملاء',
      'dash.prescriptions': 'الوصفات',
      'dash.attendance': 'الحضور',
      'dash.team': 'فريق العمل',
      'dash.reports': 'التقارير',
      'dash.settings': 'الإعدادات',
      'dash.subscription': 'اشتراكي',

      // KPI
      'kpi.revenue': 'الإيرادات',
      'kpi.todayRevenue': 'إيراد اليوم',
      'kpi.orders': 'الطلبات',
      'kpi.customers': 'العملاء',
      'kpi.avgOrder': 'متوسط الطلب',
      'kpi.stockValue': 'قيمة المخزون',
      'kpi.lowStock': 'مخزون منخفض',
      'kpi.expired': 'منتهي',
      'kpi.critical': 'حرج',
      'kpi.warning': 'تحذير',

      // Actions
      'action.quickSale': 'بيع سريع',
      'action.addProduct': 'منتج جديد',
      'action.addCustomer': 'عميل جديد',
      'action.export': 'تصدير',
      'action.print': 'طباعة',
      'action.scanBarcode': 'مسح باركود',
      'action.scanPrescription': 'مسح روشتة',
      'action.voicePOS': 'Voice POS',
      'action.theme': 'المظهر',
      'action.language': 'اللغة',

      // Status
      'status.active': 'نشط',
      'status.trial': 'تجريبي',
      'status.suspended': 'موقوف',
      'status.expired': 'منتهي',
      'status.pending': 'قيد الانتظار',
      'status.completed': 'مكتمل',
      'status.cancelled': 'ملغي'
    },

    en: {
      'app.name': 'PharmaCloud',
      'app.tagline': 'Cloud Pharmacy Management Platform',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.delete': 'Delete',
      'common.edit': 'Edit',
      'common.add': 'Add',
      'common.close': 'Close',
      'common.loading': 'Loading...',
      'common.search': 'Search',
      'common.confirm': 'Confirm',
      'common.yes': 'Yes',
      'common.no': 'No',
      'common.back': 'Back',
      'common.next': 'Next',
      'common.done': 'Done',
      'common.error': 'Error',
      'common.success': 'Success',
      'common.warning': 'Warning',
      'common.info': 'Info',

      'nav.features': 'Features',
      'nav.pricing': 'Pricing',
      'nav.howItWorks': 'How it Works',
      'nav.faq': 'FAQ',
      'nav.contact': 'Contact',
      'nav.login': 'Sign In',
      'nav.signup': 'Start Free',
      'nav.logout': 'Sign Out',

      'auth.welcome': 'Welcome Back',
      'auth.subtitle': 'Sign in or create a new pharmacy account',
      'auth.email': 'Email',
      'auth.password': 'Password',
      'auth.forgotPassword': 'Forgot password?',
      'auth.rememberMe': 'Remember me 30 days',
      'auth.noAccount': "Don't have an account?",
      'auth.hasAccount': 'Already have an account?',
      'auth.createAccount': 'Create Account',
      'auth.signIn': 'Sign In',

      'dash.overview': 'Overview',
      'dash.pos': 'Point of Sale',
      'dash.orders': 'Orders',
      'dash.products': 'Products',
      'dash.customers': 'Customers',
      'dash.prescriptions': 'Prescriptions',
      'dash.attendance': 'Attendance',
      'dash.team': 'Team',
      'dash.reports': 'Reports',
      'dash.settings': 'Settings',
      'dash.subscription': 'Subscription',

      'kpi.revenue': 'Revenue',
      'kpi.todayRevenue': "Today's Revenue",
      'kpi.orders': 'Orders',
      'kpi.customers': 'Customers',
      'kpi.avgOrder': 'Avg Order',
      'kpi.stockValue': 'Stock Value',
      'kpi.lowStock': 'Low Stock',
      'kpi.expired': 'Expired',
      'kpi.critical': 'Critical',
      'kpi.warning': 'Warning',

      'action.quickSale': 'Quick Sale',
      'action.addProduct': 'New Product',
      'action.addCustomer': 'New Customer',
      'action.export': 'Export',
      'action.print': 'Print',
      'action.scanBarcode': 'Scan Barcode',
      'action.scanPrescription': 'Scan Rx',
      'action.voicePOS': 'Voice POS',
      'action.theme': 'Theme',
      'action.language': 'Language',

      'status.active': 'Active',
      'status.trial': 'Trial',
      'status.suspended': 'Suspended',
      'status.expired': 'Expired',
      'status.pending': 'Pending',
      'status.completed': 'Completed',
      'status.cancelled': 'Cancelled'
    }
  };

  const I18N = {
    current: localStorage.getItem('pc_lang') || 'ar',
    fallback: 'ar',
    translations: TRANSLATIONS
  };

  /* ============================================
     1. TRANSLATE
     ============================================ */
  function t(key, params) {
    const dict = I18N.translations[I18N.current] || {};
    const fallbackDict = I18N.translations[I18N.fallback] || {};
    let str = dict[key] || fallbackDict[key] || key;

    if (params) {
      Object.keys(params).forEach(k => {
        str = str.replace(new RegExp(`{${k}}`, 'g'), params[k]);
      });
    }
    return str;
  }

  /* ============================================
     2. APPLY LANGUAGE
     ============================================ */
  function setLanguage(lang) {
    if (!LANGS[lang]) return;
    I18N.current = lang;
    localStorage.setItem('pc_lang', lang);

    const info = LANGS[lang];

    document.documentElement.lang = lang;
    document.documentElement.dir = info.dir;
    document.body.classList.remove('lang-ar', 'lang-en');
    document.body.classList.add('lang-' + lang);

    // Update font
    document.body.style.fontFamily = lang === 'ar'
      ? "'Cairo', 'Segoe UI', system-ui, sans-serif"
      : "'Inter', 'Cairo', system-ui, sans-serif";

    // Translate all [data-i18n] elements
    translateDOM();

    // Update lang switcher
    updateLangSwitcher();

    // Dispatch
    window.dispatchEvent(new CustomEvent('i18n:change', { detail: { lang } }));

    console.log('[i18n-Pro] 🌐 Language:', lang);
  }

  /* ============================================
     3. AUTO-TRANSLATE DOM
     ============================================ */
  function translateDOM(root = document) {
    // data-i18n
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = t(key);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if (el.placeholder) el.placeholder = translation;
        else el.value = translation;
      } else {
        el.textContent = translation;
      }
    });

    // data-i18n-placeholder
    root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });

    // data-i18n-title
    root.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });

    // data-i18n-html
    root.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
  }

  /* ============================================
     4. FORMAT NUMBERS / DATES / CURRENCY
     ============================================ */
  function formatNumber(num, opts = {}) {
    return new Intl.NumberFormat(LANGS[I18N.current].locale, opts).format(num || 0);
  }

  function formatCurrency(amount, currency = 'EGP') {
    return new Intl.NumberFormat(LANGS[I18N.current].locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount || 0);
  }

  function formatDate(date, style = 'medium') {
    const d = date instanceof Date ? date : new Date(date);
    const opts = {
      short: { day: 'numeric', month: 'numeric', year: '2-digit' },
      medium: { day: 'numeric', month: 'short', year: 'numeric' },
      long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    }[style] || {};
    return new Intl.DateTimeFormat(LANGS[I18N.current].locale, opts).format(d);
  }

  function formatRelative(date) {
    const d = date instanceof Date ? date : new Date(date);
    const diff = Date.now() - d.getTime();
    const rtf = new Intl.RelativeTimeFormat(LANGS[I18N.current].locale, { numeric: 'auto' });

    const units = [
      { limit: 60, div: 1, unit: 'second' },
      { limit: 3600, div: 60, unit: 'minute' },
      { limit: 86400, div: 3600, unit: 'hour' },
      { limit: 2592000, div: 86400, unit: 'day' },
      { limit: 31536000, div: 2592000, unit: 'month' }
    ];

    const seconds = diff / 1000;
    for (const u of units) {
      if (seconds < u.limit) {
        return rtf.format(-Math.floor(seconds / u.div), u.unit);
      }
    }
    return rtf.format(-Math.floor(seconds / 31536000), 'year');
  }

  /* ============================================
     5. LANGUAGE SWITCHER UI
     ============================================ */
  function injectSwitcher() {
    if (document.getElementById('pc-lang-switcher')) return;

    const target = document.querySelector('.ph-topbar-right, .sa-topbar-right, .nav-actions');
    if (!target) {
      setTimeout(injectSwitcher, 1000);
      return;
    }

    const switcher = document.createElement('div');
    switcher.id = 'pc-lang-switcher';
    switcher.className = 'lang-switcher';
    switcher.innerHTML = `
      <button class="lang-switcher-btn" onclick="I18nPro.toggleDropdown(event)">
        <i class="fas fa-globe"></i>
        <span class="lang-current">${LANGS[I18N.current].flag} ${LANGS[I18N.current].name}</span>
        <i class="fas fa-chevron-down lang-chevron"></i>
      </button>
      <div class="lang-dropdown">
        ${Object.keys(LANGS).map(code => `
          <button class="lang-option ${I18N.current === code ? 'active' : ''}"
                  onclick="I18nPro.setLanguage('${code}');I18nPro.closeDropdown();">
            <span class="lang-flag">${LANGS[code].flag}</span>
            <span class="lang-name">${LANGS[code].name}</span>
            ${I18N.current === code ? '<i class="fas fa-check"></i>' : ''}
          </button>
        `).join('')}
      </div>
    `;

    target.insertBefore(switcher, target.firstChild);
  }

  function toggleDropdown(e) {
    if (e) e.stopPropagation();
    const el = document.getElementById('pc-lang-switcher');
    if (el) el.classList.toggle('open');
  }

  function closeDropdown() {
    const el = document.getElementById('pc-lang-switcher');
    if (el) el.classList.remove('open');
  }

  function updateLangSwitcher() {
    const btn = document.querySelector('#pc-lang-switcher .lang-current');
    if (btn) {
      btn.textContent = `${LANGS[I18N.current].flag} ${LANGS[I18N.current].name}`;
    }
    document.querySelectorAll('#pc-lang-switcher .lang-option').forEach(opt => {
      const code = opt.getAttribute('onclick').match(/'(\w+)'/)[1];
      opt.classList.toggle('active', I18N.current === code);
    });
  }

  /* ============================================
     6. INIT
     ============================================ */
  function init() {
    setLanguage(I18N.current);

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#pc-lang-switcher')) closeDropdown();
    });

    // Watch for new DOM
    const observer = new MutationObserver(() => {
      translateDOM();
      injectSwitcher();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Initial inject
    setTimeout(injectSwitcher, 500);
    setTimeout(injectSwitcher, 2000);

    console.log('[i18n-Pro v1.0] ✅ Loaded:', I18N.current);
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.I18nPro = {
    t,
    setLanguage,
    getLanguage: () => I18N.current,
    getAvailableLanguages: () => LANGS,
    translate: translateDOM,
    toggleDropdown,
    closeDropdown,
    formatNumber,
    formatCurrency,
    formatDate,
    formatRelative,

    addTranslations: (lang, dict) => {
      if (!I18N.translations[lang]) I18N.translations[lang] = {};
      Object.assign(I18N.translations[lang], dict);
      translateDOM();
    },

    isRTL: () => LANGS[I18N.current].dir === 'rtl'
  };

  // Backward compat
  if (!window.I18n) window.I18n = window.I18nPro;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[i18n-Pro v1.0] 🚀 Ready');
})();