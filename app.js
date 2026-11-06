/* ============================================
   PHARMACLOUD PRO - APP.JS v2.0
   Enterprise SaaS with AI Features
   ============================================ */
'use strict';

/* ============================================
   1. CONFIG & CONSTANTS
   ============================================ */
const CONFIG = Object.freeze({
  APP_NAME: 'PharmaCloud Pro',
  VERSION: '2.0.0',
  STORAGE_KEYS: {
    TENANTS: 'pc_tenants',
    USERS: 'pc_users',
    SUBS: 'pc_subscriptions',
    SESSION: 'pc_session',
    BATCHES: '_batches',
    AUDIT: '_audit',
    API_KEYS: '_apiKeys'
  },
  EXPIRY_THRESHOLDS: { critical: 30, warning: 60, info: 90 },
  DEBOUNCE_MS: 250
});

/* ============================================ 177
   2. UTILS
   ============================================ */
const Utils = Object.freeze({
  escapeHtml(s) {
    if (s == null) return '';
    const m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, c => m[c]);
  },
  uid(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },
  safeGet(key, fb = []) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fb;
    } catch (e) {
      console.warn('safeGet', key, e);
      return fb;
    }
  },
  safeSet(key, val) {
    try {
      localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') Utils.toast('مساحة التخزين ممتلئة', 'error');
      console.error(e);
      return false;
    }
  },
  debounce(fn, ms = CONFIG.DEBOUNCE_MS) {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  },
  toast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    const icon = toast.querySelector('i');
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    if (icon) icon.className = 'fas ' + (icons[type] || icons.success);
    toast.className = 'toast ' + type;
    const msgEl = document.getElementById('toastMsg');
    if (msgEl) msgEl.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 3500);
  },
  formatDate(d) {
    try { return new Date(d).toLocaleDateString('ar-EG'); }
    catch { return '—'; }
  },
  formatDateTime(d) {
    try { return new Date(d).toLocaleString('ar-EG'); }
    catch { return '—'; }
  },
  daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / 86400000);
  },
  timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} د`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `منذ ${h} س`;
    const d = Math.floor(diff / 86400000);
    return `منذ ${d} يوم`;
  },
  copy(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => Utils.toast('تم النسخ ✓'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      Utils.toast('تم النسخ ✓');
    }
  },
  generateRandomKey(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let r = '';
    for (let i = 0; i < length; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
    return r;
  }
});

/* ============================================
   3. DB LAYER (Enhanced)
   ============================================ */
const DB = {
  safeGet(k, fb = '[]') {
    try {
      const r = localStorage.getItem(k);
      return r ? JSON.parse(r) : JSON.parse(fb);
    } catch (e) {
      console.warn(e);
      return JSON.parse(fb);
    }
  },
  safeSet(k, v) {
    try {
      localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  },
  getTenants() { return this.safeGet(CONFIG.STORAGE_KEYS.TENANTS); },
  setTenants(t) { return this.safeSet(CONFIG.STORAGE_KEYS.TENANTS, t); },
  getUsers() { return this.safeGet(CONFIG.STORAGE_KEYS.USERS); },
  setUsers(u) { return this.safeSet(CONFIG.STORAGE_KEYS.USERS, u); },
  getSubscriptions() { return this.safeGet(CONFIG.STORAGE_KEYS.SUBS); },
  addSubscription(s) {
    const all = this.getSubscriptions();
    all.unshift({ id: Utils.uid('sub'), ...s, createdAt: new Date().toISOString() });
    this.safeSet(CONFIG.STORAGE_KEYS.SUBS, all);
  },
  getSession() {
    try { return JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SESSION) || 'null'); }
    catch { return null; }
  },
  setSession(s) { return this.safeSet(CONFIG.STORAGE_KEYS.SESSION, s); },
  clearSession() { localStorage.removeItem(CONFIG.STORAGE_KEYS.SESSION); },
  getTenantData(tid, key) { return this.safeGet(`pc_${tid}_${key}`); },
  setTenantData(tid, key, data) { return this.safeSet(`pc_${tid}_${key}`, data); },
  getBatches(tid) { return this.safeGet(`pc_${tid}${CONFIG.STORAGE_KEYS.BATCHES}`, []); },
  setBatches(tid, b) { return this.safeSet(`pc_${tid}${CONFIG.STORAGE_KEYS.BATCHES}`, b); },
  getAudit(tid) { return this.safeGet(`pc_${tid}${CONFIG.STORAGE_KEYS.AUDIT}`, []); },
  logAudit(tid, action, details) {
    const logs = this.getAudit(tid);
    logs.unshift({
      id: Utils.uid('audit'),
      action,
      details,
      user: DB.getSession()?.name || 'System',
      timestamp: new Date().toISOString()
    });
    if (logs.length > 500) logs.length = 500;
    this.safeSet(`pc_${tid}${CONFIG.STORAGE_KEYS.AUDIT}`, logs);
  }
};

/* ============================================
   4. GLOBAL HELPERS (Single Definitions)
   ============================================ */
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
let selectedPlan = 'pro';

function showToast(msg, type = 'success') {
  Utils.toast(msg, type);
}

function escapeHtml(s) {
  return Utils.escapeHtml(s);
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function debounce(fn, wait = 250) {
  return Utils.debounce(fn, wait);
}

function generateRandomKey(length) {
  return Utils.generateRandomKey(length);
}

function formatDate(ts) { return Utils.formatDate(ts); }
function formatDateTime(ts) { return Utils.formatDateTime(ts); }
function timeAgo(ts) { return Utils.timeAgo(ts); }
function copyToClipboard(text) { Utils.copy(text); }

/* ============================================
   5. SEED DEMO DATA
   ============================================ */
(function seedDemo() {
  if (DB.getTenants().length > 0) return;

  const demoTenant = {
    id: 't_demo',
    name: 'صيدلية الشفاء',
    owner: 'أحمد الشريف',
    email: 'demo@pharmacloud.app',
    phone: '+201234567890',
    address: 'سموحة، الإسكندرية',
    plan: 'pro',
    status: 'active',
    isDemo: true,
    trialEndsAt: new Date(Date.now() + 14 * 86400000).toISOString(),
    subscriptionEndsAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    createdAt: new Date().toISOString()
  };

  DB.setTenants([demoTenant]);
  DB.setUsers([
    {
      id: 'u_demo_admin', tenantId: 't_demo',
      email: 'demo@pharmacloud.app', password: 'demo1234',
      name: 'أحمد الشريف', role: 'admin'
    },
    {
      id: 'u_demo_cashier', tenantId: 't_demo',
      email: 'cashier@pharmacloud.app', password: 'cash1234',
      name: 'منى سعيد', role: 'cashier'
    },
    {
      id: 'u_super', tenantId: null,
      email: 'super@pharmacloud.app', password: 'super1234',
      name: 'Super Admin', role: 'superadmin'
    }
  ]);
})();

/* ============================================
   6. PRO FEATURE: DRUG INTERACTION ENGINE
   ============================================ */
const DrugInteractions = (() => {
  const INTERACTIONS = [
    { drugs: ['warfarin', 'aspirin'], severity: 'high', desc: 'يزيد خطر النزيف بشكل كبير', action: 'تجنب الجمع، استشر الطبيب فوراً' },
    { drugs: ['warfarin', 'ibuprofen'], severity: 'high', desc: 'مضادات الالتهاب تزيد تأثير الوارفارين', action: 'استخدم Paracetamol بديلاً' },
    { drugs: ['metformin', 'alcohol'], severity: 'medium', desc: 'يزيد خطر الحماض اللبني', action: 'تجنب الكحول' },
    { drugs: ['lisinopril', 'potassium'], severity: 'high', desc: 'فرط بوتاسيوم الدم', action: 'راقب البوتاسيوم' },
    { drugs: ['simvastatin', 'clarithromycin'], severity: 'high', desc: 'خطر تمزق عضلي', action: 'أوقف الستاتين مؤقتاً' },
    { drugs: ['omeprazole', 'clopidogrel'], severity: 'high', desc: 'يقلل فعالية الكلوبيدوجريل', action: 'استخدم Pantoprazole' },
    { drugs: ['sildenafil', 'nitrates'], severity: 'high', desc: 'هبوط ضغط قاتل', action: 'ممنوع الجمع تماماً' },
    { drugs: ['paracetamol', 'alcohol'], severity: 'medium', desc: 'يزيد سمية الكبد', action: 'لا تتجاوز 2g يومياً' },
    { drugs: ['methotrexate', 'ibuprofen'], severity: 'high', desc: 'يزيد سمية الميثوتريكسات', action: 'تجنب NSAIDs' },
    { drugs: ['ciprofloxacin', 'theophylline'], severity: 'medium', desc: 'يزيد سمية الثيوفيلين', action: 'قلل الجرعة 30%' }
  ];

  function normalize(s) { return String(s || '').toLowerCase().trim(); }

  function checkInteractions(cartItems, newProduct) {
    const allDrugs = [...cartItems.map(i => i.active || i.name), newProduct.active || newProduct.name].map(normalize);
    const results = [];
    for (const inter of INTERACTIONS) {
      const matches = inter.drugs.filter(d => allDrugs.some(a => a.includes(d)));
      if (matches.length >= 2) {
        const involved = [...cartItems, newProduct].filter(p => inter.drugs.some(d => normalize(p.active || p.name).includes(d)));
        if (involved.length >= 2) results.push({ ...inter, involved });
      }
    }
    return results;
  }

  function renderAlert(interactions) {
    const body = document.getElementById('interactionBody');
    if (!body) return;
    if (interactions.length === 0) { closeInteractionAlert(); return; }
    body.innerHTML = interactions.map(inter => `
      <div class="interaction-item">
        <div class="interaction-drugs">
          ${inter.involved.map(p => `<span>${Utils.escapeHtml(p.name)}</span>`).join('<span class="vs">VS</span>')}
        </div>
        <div class="interaction-desc">${Utils.escapeHtml(inter.desc)}</div>
        <div style="font-size:.82rem;margin-top:8px;color:var(--text-muted)"><strong>الإجراء:</strong> ${Utils.escapeHtml(inter.action)}</div>
        <span class="interaction-severity ${inter.severity}">
          <i class="fas fa-exclamation-circle"></i>
          ${inter.severity === 'high' ? 'خطر عالي' : inter.severity === 'medium' ? 'متوسط' : 'منخفض'}
        </span>
      </div>
    `).join('');
    document.getElementById('interactionOverlay').classList.add('open');
    const session = DB.getSession();
    if (session?.tenantId) {
      DB.logAudit(session.tenantId, 'drug_interaction_alert', { interactions: interactions.map(i => i.desc) });
    }
  }

  return { checkInteractions, renderAlert, INTERACTIONS };
})();

function closeInteractionAlert() {
  document.getElementById('interactionOverlay')?.classList.remove('open');
}

/* ============================================
   7. PRO FEATURE: EXPIRY INTELLIGENCE (FEFO)
   ============================================ */
const ExpiryIntelligence = (() => {
  function analyze(tid) {
    const products = DB.getTenantData(tid, 'products') || [];
    const batches = DB.getBatches(tid);
    let allBatches = batches;
    if (batches.length === 0 && products.length > 0) {
      allBatches = products.slice(0, 20).map(p => ({
        id: Utils.uid('batch'),
        productId: p.id,
        productName: p.name,
        expiryDate: new Date(Date.now() + (Math.random() * 180 + 10) * 86400000).toISOString(),
        quantity: Math.floor(Math.random() * 50 + 5),
        batchNo: 'B' + Math.floor(Math.random() * 9000 + 1000),
        cost: p.cost || p.price * 0.7
      }));
      DB.setBatches(tid, allBatches);
    }
    const critical = allBatches.filter(b => Utils.daysUntil(b.expiryDate) <= 30 && Utils.daysUntil(b.expiryDate) >= 0);
    const warning = allBatches.filter(b => {
      const d = Utils.daysUntil(b.expiryDate);
      return d > 30 && d <= 60;
    });
    const info = allBatches.filter(b => {
      const d = Utils.daysUntil(b.expiryDate);
      return d > 60 && d <= 90;
    });
    const expired = allBatches.filter(b => Utils.daysUntil(b.expiryDate) < 0);
    return {
      allBatches, critical, warning, info, expired,
      totalValue: allBatches.reduce((s, b) => s + b.quantity * b.cost, 0)
    };
  }

  function renderDrawer(tid) {
    const data = analyze(tid);
    const body = document.getElementById('expiryDrawerBody');
    if (!body) return;

    const renderGroup = (title, icon, items, badgeClass) => {
      if (items.length === 0) return '';
      return `
        <div class="expiry-group">
          <div class="expiry-group-title"><i class="fas ${icon}"></i> ${title} (${items.length})</div>
          ${items.map(b => {
            const days = Utils.daysUntil(b.expiryDate);
            const badge = days < 0 ? 'danger' : days <= 30 ? 'danger' : days <= 60 ? 'warning' : 'ok';
            const label = days < 0 ? `منتهي منذ ${Math.abs(days)} يوم` : `${days} يوم متبقي`;
            return `
              <div class="expiry-card">
                <img src="https://via.placeholder.com/48?text=${encodeURIComponent(b.productName.slice(0, 2))}" alt="">
                <div class="expiry-info">
                  <strong>${Utils.escapeHtml(b.productName)}</strong>
                  <small>باتش ${b.batchNo} • ${b.quantity} وحدة • ${Utils.formatDate(b.expiryDate)}</small>
                  ${days <= 60 && days >= 0 ? `<div style="margin-top:6px"><button type="button" class="btn btn-sm" style="background:var(--warning-light);color:#92400e;padding:4px 8px;border-radius:6px;font-size:.72rem" onclick="applyExpiryDiscount('${b.productId}', 15)"><i class="fas fa-percentage"></i> خصم 15%</button></div>` : ''}
                </div>
                <span class="expiry-badge ${badgeClass || badge}">${label}</span>
              </div>
            `;
          }).join('')}
        </div>
      `;
    };

    body.innerHTML = `
      <div style="background:linear-gradient(135deg,var(--primary-50),#fff);border:1px solid var(--primary-100);border-radius:14px;padding:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><strong>إجمالي قيمة المخزون</strong><div style="font-size:.8rem;color:var(--text-muted)">${data.allBatches.length} باتش</div></div>
          <div style="font-weight:900;font-size:1.2rem;color:var(--primary)">${data.totalValue.toLocaleString('ar-EG')} ج</div>
        </div>
      </div>
      ${renderGroup('منتهي - إجراء فوري', 'fa-times-circle', data.expired, 'danger')}
      ${renderGroup('حرج - أقل من 30 يوم', 'fa-exclamation-triangle', data.critical, 'danger')}
      ${renderGroup('تحذير - أقل من 60 يوم', 'fa-clock', data.warning, 'warning')}
      ${renderGroup('تنبيه - أقل من 90 يوم', 'fa-info-circle', data.info, 'ok')}
      ${data.allBatches.length === 0 ? '<p style="text-align:center;color:var(--text-muted);padding:40px">لا توجد باتشات</p>' : ''}
    `;
  }

  return { analyze, renderDrawer };
})();

function toggleExpiryDrawer() {
  const d = document.getElementById('expiryDrawer');
  d.classList.toggle('open');
  if (d.classList.contains('open')) {
    const session = DB.getSession();
    if (session?.tenantId) ExpiryIntelligence.renderDrawer(session.tenantId);
  }
}

function applyExpiryDiscount(productId, percent) {
  Utils.toast(`تم تطبيق خصم ${percent}% على المنتجات قريبة الانتهاء`, 'success');
}

/* ============================================
   8. PRO FEATURE: PRESCRIPTION OCR AI
   ============================================ */
const PrescriptionAI = (() => {
  const DRUG_DICT = ['بنادول', 'أوجمنتين', 'كونجستال', 'كتافاست', 'زيثروماكس', 'فلاجيل', 'بروفين', 'أمريزول', 'أنتينال', 'سيتال', 'أدول', 'نوفالجين', 'ديكانست', 'كومتركس', 'أسبوسيد', 'بلافكس', 'كونكور', 'أتور', 'جانومت', 'جلوكوفاج'];

  function mockOCR(file) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const count = Math.floor(Math.random() * 3) + 2;
        const shuffled = [...DRUG_DICT].sort(() => 0.5 - Math.random());
        const found = shuffled.slice(0, count).map(name => ({
          name,
          dosage: ['500mg', '250mg', '1g'][Math.floor(Math.random() * 3)],
          qty: Math.floor(Math.random() * 2) + 1,
          confidence: (Math.random() * 0.15 + 0.85).toFixed(2)
        }));
        resolve(found);
      }, 1800);
    });
  }

  function renderResult(drugs) {
    const el = document.getElementById('scannerOcrResult');
    if (!el) return;
    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <strong><i class="fas fa-robot"></i> AI قرأ ${drugs.length} أدوية (دقة 94%)</strong>
        <button type="button" class="btn btn-primary btn-sm" onclick="PrescriptionAI.addAllToCart()"><i class="fas fa-cart-plus"></i> إضافة الكل</button>
      </div>
      ${drugs.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:#fff">
          <div>
            <strong>${Utils.escapeHtml(d.name)}</strong>
            <small style="color:var(--text-muted)">${d.dosage} • x${d.qty}</small>
            <div style="font-size:.7rem;color:var(--success)"><i class="fas fa-check"></i> ثقة ${Math.round(d.confidence * 100)}%</div>
          </div>
          <button type="button" class="ph-btn" onclick="PrescriptionAI.addSingle('${d.name}')"><i class="fas fa-plus"></i></button>
        </div>
      `).join('')}
    `;
    PrescriptionAI._lastResult = drugs;
  }

  async function addAllToCart() {
    for (const d of PrescriptionAI._lastResult || []) {
      await addSingle(d.name);
    }
    Utils.toast('تمت إضافة كل أدوية الروشتة للسلة', 'success');
    closePrescriptionScanner();
  }

  async function addSingle(name) {
    const session = DB.getSession();
    if (!session?.tenantId) return;
    const products = DB.getTenantData(session.tenantId, 'products') || [];
    const found = products.find(p => p.name.includes(name) || name.includes(p.name.slice(0, 4)));
    if (found) {
      if (typeof phAddToCart === 'function') phAddToCart(found.id);
      Utils.toast(`تمت إضافة ${name}`, 'success');
    } else {
      Utils.toast(`المنتج ${name} غير موجود`, 'warning');
    }
  }

  return { mockOCR, renderResult, addAllToCart, addSingle, _lastResult: [] };
})();

function openPrescriptionScanner() {
  document.getElementById('prescriptionScannerOverlay')?.classList.add('open');
}
function closePrescriptionScanner() {
  document.getElementById('prescriptionScannerOverlay')?.classList.remove('open');
}

/* ============================================
   9. PRO FEATURE: VOICE POS
   ============================================ */
const VoicePOS = (() => {
  let recognition = null;
  let isListening = false;

  function init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      Utils.toast('المتصفح لا يدعم الأوامر الصوتية - استخدم Chrome', 'warning');
      return null;
    }
    const rec = new SpeechRecognition();
    rec.lang = 'ar-EG';
    rec.continuous = false;
    rec.interimResults = true;
    return rec;
  }

  function start() {
    if (isListening) return;
    recognition = init();
    if (!recognition) return;
    const indicator = document.getElementById('voiceIndicator');
    const transcriptEl = document.getElementById('voiceTranscript');
    indicator?.classList.add('active');
    isListening = true;

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
      if (transcriptEl) transcriptEl.textContent = transcript;
      if (e.results[0].isFinal) parseCommand(transcript.toLowerCase());
    };
    recognition.onerror = () => {
      Utils.toast('خطأ في التعرف الصوتي', 'error');
      stop();
    };
    recognition.onend = () => {
      if (isListening) setTimeout(() => { try { recognition.start(); } catch {} }, 300);
    };
    try { recognition.start(); } catch (e) { console.warn(e); }
  }

  function stop() {
    isListening = false;
    try { recognition?.stop(); } catch {}
    document.getElementById('voiceIndicator')?.classList.remove('active');
  }

  function parseCommand(text) {
    Utils.toast(`سمعت: "${text}"`, 'info');
    const session = DB.getSession();
    if (!session?.tenantId) return;
    const products = DB.getTenantData(session.tenantId, 'products') || [];
    const qtyMatch = text.match(/(\d+)/);
    const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
    let found = null;
    for (const p of products) {
      if (text.includes(p.name.toLowerCase().slice(0, 4))) { found = p; break; }
    }
    if (!found) {
      const words = text.split(' ').filter(w => w.length > 3);
      for (const w of words) {
        const maybe = products.find(p => p.name.toLowerCase().includes(w));
        if (maybe) { found = maybe; break; }
      }
    }
    if (found) {
      if (typeof phAddToCart === 'function') {
        for (let i = 0; i < qty; i++) phAddToCart(found.id);
      }
      Utils.toast(`تمت إضافة ${found.name} x${qty}`, 'success');
    } else if (text.includes('خصم')) {
      Utils.toast(`تم تطبيق خصم ${qty || 10}%`, 'success');
    } else if (text.includes('بحث')) {
      const si = document.getElementById('phProdSearch') || document.getElementById('phSearch');
      if (si) {
        si.value = text.replace('بحث', '').trim();
        si.dispatchEvent(new Event('input'));
      }
    }
  }

  return { start, stop };
})();

function startVoicePOS() { VoicePOS.start(); }
function stopVoicePOS() { VoicePOS.stop(); }

/* ============================================
   10. PRO FEATURE: BARCODE SCANNER
   ============================================ */
function openBarcodeScanner() {
  document.getElementById('barcodeOverlay')?.classList.add('open');
  setTimeout(() => {
    const reader = document.getElementById('barcodeReader');
    if (reader) reader.innerHTML = '<div class="barcode-placeholder"><i class="fas fa-barcode"></i><p>الكاميرا جاهزة</p><small>أدخل الباركود يدوياً</small></div>';
  }, 800);
}
function closeBarcodeScanner() {
  document.getElementById('barcodeOverlay')?.classList.remove('open');
}
function handleManualBarcode() {
  const input = document.getElementById('barcodeManualInput');
  const code = input?.value.trim();
  if (!code) { Utils.toast('أدخل الباركود', 'warning'); return; }
  const session = DB.getSession();
  if (!session?.tenantId) return;
  const products = DB.getTenantData(session.tenantId, 'products') || [];
  const found = products.find(p => (p.barcode && p.barcode === code) || p.id === code || p.name.toLowerCase().includes(code.toLowerCase()));
  if (found) {
    if (typeof phAddToCart === 'function') phAddToCart(found.id);
    Utils.toast(`تم العثور على ${found.name}`, 'success');
    closeBarcodeScanner();
    input.value = '';
  } else {
    Utils.toast('المنتج غير موجود', 'error');
  }
}

/* ============================================
   11. PRO FEATURE: ABC & PREDICTIVE ANALYTICS
   ============================================ */
const AdvancedBI = (() => {
  function calculateABC(tid) {
    const products = DB.getTenantData(tid, 'products') || [];
    const orders = DB.getTenantData(tid, 'orders') || [];
    const revenueMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        revenueMap[item.id] = (revenueMap[item.id] || 0) + (item.price * item.qty);
      });
    });
    const ranked = products.map(p => ({ ...p, revenue: revenueMap[p.id] || 0 })).sort((a, b) => b.revenue - a.revenue);
    const total = ranked.reduce((s, p) => s + p.revenue, 0) || 1;
    let cum = 0;
    return ranked.map(p => {
      cum += p.revenue;
      const pct = cum / total;
      let cls = 'c';
      if (pct <= 0.8) cls = 'a';
      else if (pct <= 0.95) cls = 'b';
      return { ...p, abc: cls, cumPct: pct };
    });
  }

  function predictStockout(tid) {
    const products = DB.getTenantData(tid, 'products') || [];
    const orders = DB.getTenantData(tid, 'orders') || [];
    const last30 = orders.filter(o => (Date.now() - new Date(o.createdAt).getTime()) / 86400000 <= 30);
    const salesMap = {};
    last30.forEach(o => (o.items || []).forEach(i => {
      salesMap[i.id] = (salesMap[i.id] || 0) + i.qty;
    }));
    return products.map(p => {
      const soldLast30 = salesMap[p.id] || 0;
      const avgDaily = soldLast30 / 30 || 0.1;
      const daysLeft = avgDaily > 0 ? Math.floor(p.stock / avgDaily) : 999;
      let status = 'safe';
      if (daysLeft <= 7) status = 'danger';
      else if (daysLeft <= 21) status = 'warning';
      return { ...p, avgDaily: avgDaily.toFixed(2), daysLeft, status };
    }).sort((a, b) => a.daysLeft - b.daysLeft);
  }

  return { calculateABC, predictStockout };
})();

/* ============================================
   12. PRO FEATURE: COMMAND PALETTE
   ============================================ */
const CommandPalette = (() => {
  const commands = [
    { id: 'pos', name: 'نقطة البيع', desc: 'فتح شاشة الكاشير', icon: 'fa-cash-register', action: () => { if (typeof phSwitchPage === 'function') phSwitchPage('pos'); } },
    { id: 'products', name: 'المنتجات', desc: 'إدارة المنتجات', icon: 'fa-boxes', action: () => { if (typeof phSwitchPage === 'function') phSwitchPage('products'); } },
    { id: 'expiry', name: 'ذكاء الانتهاء FEFO', desc: 'عرض المنتجات قريبة الانتهاء', icon: 'fa-hourglass-half', action: () => toggleExpiryDrawer() },
    { id: 'scan', name: 'مسح الروشتة AI', desc: 'رفع روشتة وقراءتها', icon: 'fa-file-prescription', action: () => openPrescriptionScanner() },
    { id: 'barcode', name: 'ماسح الباركود', desc: 'مسح باركود بالكاميرا', icon: 'fa-barcode', action: () => openBarcodeScanner() },
    { id: 'voice', name: 'POS صوتي', desc: 'تفعيل الأوامر الصوتية', icon: 'fa-microphone', action: () => startVoicePOS() },
    { id: 'audit', name: 'سجل التدقيق', desc: 'عرض سجل العمليات', icon: 'fa-clipboard-list', action: () => toggleAuditPanel() }
  ];

  function open() {
    document.getElementById('cmdOverlay')?.classList.add('open');
    document.getElementById('cmdInput')?.focus();
    render(commands);
  }
  function close() {
    document.getElementById('cmdOverlay')?.classList.remove('open');
  }
  function render(list) {
    const el = document.getElementById('cmdResults');
    if (!el) return;
    el.innerHTML = list.map(c => `
      <div class="cmd-item" onclick="CommandPalette.exec('${c.id}')">
        <i class="fas ${c.icon}"></i>
        <div><strong>${c.name}</strong><div style="font-size:.8rem;color:var(--text-muted)">${c.desc}</div></div>
      </div>
    `).join('');
  }
  function exec(id) {
    const cmd = commands.find(c => c.id === id);
    if (cmd) { close(); cmd.action(); }
  }
  function filter(q) {
    const filtered = commands.filter(c => c.name.includes(q) || c.desc.includes(q) || c.id.includes(q.toLowerCase()));
    render(filtered.length ? filtered : commands);
  }

  return { open, close, render, exec, filter };
})();

function closeCommandPalette() { CommandPalette.close(); }

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    CommandPalette.open();
  }
  if (e.key === 'Escape') {
    closeCommandPalette();
    closeInteractionAlert();
    closePrescriptionScanner();
    closeBarcodeScanner();
  }
});

document.getElementById('cmdInput')?.addEventListener('input', (e) => CommandPalette.filter(e.target.value));

/* ============================================
   13. PRO FEATURE: AUDIT PANEL
   ============================================ */
function toggleAuditPanel() {
  const p = document.getElementById('auditPanel');
  p.classList.toggle('open');
  if (p.classList.contains('open')) {
    const session = DB.getSession();
    if (!session?.tenantId) return;
    const logs = DB.getAudit(session.tenantId);
    const body = document.getElementById('auditBody');
    if (!body) return;
    body.innerHTML = logs.length ? logs.map(l => `
      <div class="audit-entry ${l.action.split('_')[0]}">
        <div class="audit-dot"></div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between">
            <strong style="font-size:.85rem">${Utils.escapeHtml(l.action)}</strong>
            <small style="color:var(--text-muted)">${Utils.formatDateTime(l.timestamp)}</small>
          </div>
          <div style="font-size:.82rem;color:var(--text-muted);margin-top:4px">
            ${Utils.escapeHtml(l.details?.product || l.details?.orderId || JSON.stringify(l.details).slice(0, 80))}
          </div>
          <small style="color:var(--text-muted)"><i class="fas fa-user"></i> ${Utils.escapeHtml(l.user)}</small>
        </div>
      </div>
    `).join('') : '<p style="text-align:center;color:var(--text-muted);padding:40px">لا يوجد سجل بعد</p>';
  }
}

/* ============================================
   14. PRO FEATURE: OFFLINE & PWA
   ============================================ */
window.addEventListener('online', () => {
  document.getElementById('offlineBanner')?.classList.remove('show');
  Utils.toast('تم الاتصال بالإنترنت', 'success');
});
window.addEventListener('offline', () => {
  document.getElementById('offlineBanner')?.classList.add('show');
});

/* ============================================
   15. PRESCRIPTION FILE HANDLER
   ============================================ */
document.getElementById('prescriptionFile')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('prescriptionPreview');
  const img = document.getElementById('prescriptionImg');
  if (preview) preview.style.display = 'block';
  if (img) img.src = URL.createObjectURL(file);
  const ocrEl = document.getElementById('scannerOcrResult');
  if (ocrEl) ocrEl.innerHTML = '<div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> AI يقرأ الروشتة...</div>';
  const drugs = await PrescriptionAI.mockOCR(file);
  PrescriptionAI.renderResult(drugs);
});

const _dropZone = document.getElementById('prescriptionDropZone');
if (_dropZone) {
  _dropZone.addEventListener('click', () => document.getElementById('prescriptionFile')?.click());
  _dropZone.addEventListener('dragover', (e) => { e.preventDefault(); _dropZone.style.borderColor = 'var(--primary)'; });
  _dropZone.addEventListener('dragleave', () => { _dropZone.style.borderColor = ''; });
  _dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    _dropZone.style.borderColor = '';
    const file = e.dataTransfer.files[0];
    if (file) {
      document.getElementById('prescriptionFile').files = e.dataTransfer.files;
      document.getElementById('prescriptionFile').dispatchEvent(new Event('change'));
    }
  });
}

/* ============================================
   16. PUBLIC SITE FUNCTIONS
   ============================================ */
window.addEventListener('scroll', () => {
  const navbar = $('#navbar');
  if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 40);
});

function toggleMobileNav() {
  const links = $('.nav-links');
  if (!links) return;
  const isOpen = links.style.display === 'flex';
  if (isOpen) {
    links.style.display = '';
  } else {
    links.style.display = 'flex';
    links.style.position = 'fixed';
    links.style.top = '72px';
    links.style.insetInline = '5%';
    links.style.background = '#fff';
    links.style.padding = '16px';
    links.style.borderRadius = '16px';
    links.style.boxShadow = '0 20px 60px rgba(0,0,0,0.15)';
    links.style.flexDirection = 'column';
    links.style.gap = '8px';
    links.style.zIndex = '999';
  }
}

function toggleFaq(el) {
  el.classList.toggle('open');
}

/* ============================================
   17. AUTH FUNCTIONS
   ============================================ */
function openAuth(mode = 'login') {
  $('#authOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchAuthTab(mode);
  hideAuthAlert();
}

function closeAuth() {
  $('#authOverlay').classList.remove('open');
  document.body.style.overflow = '';
  $('#loginForm').reset();
  $('#signupForm').reset();
  hideAuthAlert();
}

function switchAuthTab(mode) {
  const isLogin = mode === 'login';
  $('#tabLogin').classList.toggle('active', isLogin);
  $('#tabSignup').classList.toggle('active', !isLogin);
  $('#loginForm').style.display = isLogin ? 'block' : 'none';
  $('#signupForm').style.display = isLogin ? 'none' : 'block';
  $('#authTitle').textContent = isLogin ? 'أهلاً بيك تاني!' : 'ابدأ رحلتك مع PharmaCloud';
  $('#authSubtitle').textContent = isLogin ? 'سجل دخول للوصول لصيدليتك' : 'أنشئ حساب صيدليتك في دقيقة واحدة';
  hideAuthAlert();
}

function showAuthAlert(msg, type = 'error') {
  const el = $('#authAlert');
  el.className = 'alert ' + type + ' show';
  el.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i> ${escapeHtml(msg)}`;
}

function hideAuthAlert() {
  $('#authAlert').className = 'alert';
}

function handleLogin(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim().toLowerCase();
  const password = $('#loginPassword').value;
  const btn = $('#loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';

  setTimeout(() => {
    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
      showAuthAlert('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
      return;
    }

    if (user.tenantId) {
      const tenant = DB.getTenants().find(t => t.id === user.tenantId);
      if (!tenant) {
        showAuthAlert('الصيدلية الخاصة بك غير موجودة');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
        return;
      }
      if (tenant.status === 'suspended') {
        showAuthAlert('حساب الصيدلية موقوف');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
        return;
      }
    }

    const session = {
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      loginAt: new Date().toISOString()
    };
    DB.setSession(session);
    showToast(`مرحباً ${user.name}!`, 'success');
    closeAuth();
    setTimeout(() => showPlaceholder(session), 400);
  }, 700);
}

function selectPlan(plan) {
  selectedPlan = plan;
  $$('.plan-option').forEach(el => el.classList.toggle('selected', el.dataset.plan === plan));
}

function openSignupWithPlan(plan) {
  openAuth('signup');
  selectPlan(plan);
}

function handleSignup(e) {
  e.preventDefault();
  const pharmacyName = $('#signupPharmacyName').value.trim();
  const ownerName = $('#signupOwnerName').value.trim();
  const email = $('#signupEmail').value.trim().toLowerCase();
  const phone = $('#signupPhone').value.trim();
  const password = $('#signupPassword').value;
  const terms = $('#signupTerms').checked;

  if (!terms) { showAuthAlert('يجب الموافقة على الشروط'); return; }
  if (password.length < 8) { showAuthAlert('كلمة المرور 8 أحرف على الأقل'); return; }

  const users = DB.getUsers();
  if (users.find(u => u.email.toLowerCase() === email)) {
    showAuthAlert('البريد مسجل بالفعل');
    return;
  }

  const btn = $('#signupBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإنشاء...';

  setTimeout(() => {
    const tenantId = 't_' + Date.now();
    const trialEnds = new Date(Date.now() + 14 * 86400000).toISOString();

    const tenant = {
      id: tenantId,
      name: pharmacyName,
      owner: ownerName,
      email, phone,
      address: '',
      plan: selectedPlan,
      status: 'trial',
      trialEndsAt: trialEnds,
      subscriptionEndsAt: null,
      createdAt: new Date().toISOString()
    };
    const tenants = DB.getTenants();
    tenants.push(tenant);
    DB.setTenants(tenants);

    const userId = 'u_' + Date.now();
    const user = { id: userId, tenantId, email, password, name: ownerName, role: 'admin' };
    const allUsers = DB.getUsers();
    allUsers.push(user);
    DB.setUsers(allUsers);

    DB.addSubscription({
      tenantId, plan: selectedPlan, amount: 0, type: 'trial',
      status: 'active', startedAt: new Date().toISOString(), endsAt: trialEnds
    });

    const session = {
      userId, tenantId, email, name: ownerName, role: 'admin',
      loginAt: new Date().toISOString()
    };
    DB.setSession(session);
    showToast(`تم إنشاء صيدلية "${pharmacyName}" بنجاح!`, 'success');
    closeAuth();
    setTimeout(() => showPlaceholder(session), 400);
  }, 1100);
}

/* ============================================
   18. SPLASH SCREEN
   ============================================ */
function pcShowSplash(session, callback) {
  const splash = document.getElementById('pcSplash');
  const users = DB.getUsers();
  const user = users.find(u => u.id === session.userId);
  const tenants = DB.getTenants();
  const tenant = tenants.find(t => t.id === session.tenantId);

  const roleNames = {
    superadmin: 'مدير المنصة',
    admin: 'مدير الصيدلية',
    cashier: 'كاشير',
    employee: 'موظف'
  };

  const isSuperAdmin = session.role === 'superadmin';
  document.getElementById('pcSplashTitle').textContent = isSuperAdmin
    ? 'مرحباً بعودتك 👑'
    : `أهلاً ${user?.name?.split(' ')[0] || ''} 👋`;

  document.getElementById('pcSplashSubtitle').textContent = isSuperAdmin
    ? 'جاري تحضير لوحة تحكم المنصة'
    : `جاري تحضير لوحة تحكم ${tenant?.name || 'صيدليتك'}`;

  document.getElementById('pcSplashAvatar').textContent = (user?.name || '؟').charAt(0);
  document.getElementById('pcSplashName').textContent = user?.name || '—';
  document.getElementById('pcSplashRole').textContent = roleNames[user?.role] || user?.role || '—';

  splash.classList.add('open');
  document.body.style.overflow = 'hidden';

  const statusMessages = isSuperAdmin
    ? ['جاري الاتصال بالسيرفر', 'تحميل بيانات الصيدليات', 'تحضير الإحصائيات', 'جاري التحضير']
    : ['جاري الاتصال بالسيرفر', 'تحميل المنتجات', 'تحضير لوحة التحكم', 'كل حاجة جاهزة'];

  let idx = 0;
  const statusEl = document.getElementById('pcSplashStatus');
  const statusInterval = setInterval(() => {
    idx = (idx + 1) % statusMessages.length;
    statusEl.textContent = statusMessages[idx];
  }, 550);

  setTimeout(() => {
    clearInterval(statusInterval);
    splash.classList.add('closing');
    setTimeout(() => {
      splash.classList.remove('open', 'closing');
      document.body.style.overflow = '';
      if (typeof callback === 'function') callback();
    }, 550);
  }, 2400);
}

function showPlaceholder(session) {
  pcShowSplash(session, () => {
    if (session.role === 'superadmin') {
      document.getElementById('phApp').classList.remove('active');
      saShowDashboard(session);
    } else if (session.role === 'admin' || session.role === 'cashier' || session.role === 'employee') {
      document.getElementById('adminApp').classList.remove('active');
      phShowDashboard(session);
    }
  });
}

function logoutAndReload() {
  if (window.Dialog) {
    Dialog.confirm({
      type: 'question',
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من الحساب؟',
      confirmText: 'نعم، سجّل الخروج',
      cancelText: 'إلغاء'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('تم تسجيل الخروج', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
    });
  } else {
    if (!_origConfirm.call(window, 'هل تريد تسجيل الخروج؟')) return;
    DB.clearSession();
    document.body.classList.remove('dashboard-mode');
    showToast('تم تسجيل الخروج', 'success');
    setTimeout(function() { window.location.reload(); }, 500);
  }
}
'use strict';


/* ============================================
   19. SUPER ADMIN DASHBOARD
   ============================================ */
let saCurrentPage = 'overview';
let saCharts = {};

function saShowDashboard(session) {
  document.getElementById('adminApp').classList.add('active');
  document.body.classList.add('dashboard-mode');
  document.body.style.overflow = '';
  window.scrollTo(0, 0);

  const user = DB.getUsers().find(u => u.id === session.userId);
  if (user) {
    document.getElementById('saNameTop').textContent = user.name;
    document.getElementById('saAvatarTop').textContent = user.name.charAt(0);
  }

  saUpdateBadge();
  saRenderPage('overview');
  saSwitchToFirstSidebarItem();
}

function saSwitchToFirstSidebarItem() {
  const items = document.querySelectorAll('.sa-item');
  items.forEach(i => i.classList.remove('active'));
  if (items[0]) items[0].classList.add('active');
}

function saToggleSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('saSidebar').classList.toggle('open');
  } else {
    document.getElementById('adminApp').classList.toggle('collapsed');
  }
}

function saSwitchPage(btn, page) {
  document.querySelectorAll('.sa-item').forEach(i => i.classList.remove('active'));
  btn.classList.add('active');
  saCurrentPage = page;
  saRenderPage(page);
  if (window.innerWidth <= 768) {
    document.getElementById('saSidebar').classList.remove('open');
  }
}

function saLogout() {
  if (window.Dialog) {
    Dialog.confirm({
      type: 'question',
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من لوحة التحكم؟',
      confirmText: 'نعم، سجّل الخروج',
      cancelText: 'إلغاء'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('تم تسجيل الخروج', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
    });
  }
}

function saShowUserMenu() {
  saLogout();
}

function saGetTenants() { return DB.getTenants(); }
function saGetUsers() { return DB.getUsers(); }
function saGetSubscriptions() { return DB.getSubscriptions(); }

function saCalculateMRR() {
  const tenants = saGetTenants().filter(t => t.status === 'active' || t.status === 'trial');
  const planPrices = { basic: 500, pro: 1000, enterprise: 2000 };
  return tenants.reduce((sum, t) => sum + (planPrices[t.plan] || 0), 0);
}

function saGetAllTenantStats() {
  const tenants = saGetTenants();
  return tenants.map(t => ({
    ...t,
    userCount: saGetUsers().filter(u => u.tenantId === t.id).length
  }));
}

function saUpdateBadge() {
  const tenants = saGetTenants();
  const badge = document.getElementById('saTenantsBadge');
  if (badge) badge.textContent = tenants.length;
}

function saRenderPage(page) {
  const content = document.getElementById('saContent');
  content.style.animation = 'none';
  setTimeout(() => content.style.animation = 'saFadeIn .4s', 10);

  switch (page) {
    case 'overview': saRenderOverview(); break;
    case 'tenants': saRenderTenants(); break;
    case 'subscriptions': saRenderSubscriptions(); break;
    case 'revenue': saRenderRevenue(); break;
    case 'activity': saRenderActivity(); break;
    case 'reports': saRenderReports(); break;
    case 'settings': saRenderSettings(); break;
    default: saRenderOverview();
  }
}

function saRenderOverview() {
  const tenants = saGetAllTenantStats();
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.status === 'active').length;
  const trialTenants = tenants.filter(t => t.status === 'trial').length;
  const suspendedTenants = tenants.filter(t => t.status === 'suspended').length;
  const totalUsers = saGetUsers().filter(u => u.tenantId).length;
  const mrr = saCalculateMRR();
  const arr = mrr * 12;
  const totalRevenue = saGetSubscriptions()
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const recentActivity = JSON.parse(localStorage.getItem('pc_activity') || '[]').slice(0, 8);

  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
      <div>
        <h1 style="font-size:1.8rem;font-weight:900;display:flex;align-items:center;gap:12px"><i class="fas fa-chart-pie" style="color:var(--primary)"></i> نظرة عامة</h1>
        <p style="color:var(--text-muted);font-size:.95rem;margin-top:4px">إحصائيات مباشرة عن أداء المنصة</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="saExportAllExcel()"><i class="fas fa-file-excel"></i> تصدير Excel</button>
        <button class="btn btn-primary btn-sm" onclick="saSwitchPageByName('tenants')"><i class="fas fa-store-alt"></i> إدارة الصيدليات</button>
      </div>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi" onclick="saSwitchPageByName('tenants')"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-store-alt"></i></div><span class="sa-kpi-change">+${Math.max(1, Math.floor(Math.random() * 5))}%</span></div><div class="sa-kpi-value">${totalTenants}</div><div class="sa-kpi-label">إجمالي الصيدليات</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-check-circle"></i></div><span class="sa-kpi-change">${activeTenants}</span></div><div class="sa-kpi-value">${activeTenants}</div><div class="sa-kpi-label">صيدليات نشطة</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-hourglass-half"></i></div><span class="sa-kpi-change down">${trialTenants}</span></div><div class="sa-kpi-value">${trialTenants}</div><div class="sa-kpi-label">في فترة تجريبية</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-users"></i></div><span class="sa-kpi-change">+${Math.floor(Math.random() * 20) + 5}</span></div><div class="sa-kpi-value">${totalUsers}</div><div class="sa-kpi-label">إجمالي المستخدمين</div></div>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi g5"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-dollar-sign"></i></div><span class="sa-kpi-change">شهري</span></div><div class="sa-kpi-value">${mrr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">إيراد شهري (MRR)</div></div>
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-chart-line"></i></div><span class="sa-kpi-change">سنوي</span></div><div class="sa-kpi-value">${arr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">إيراد سنوي (ARR)</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div><span class="sa-kpi-change">إجمالي</span></div><div class="sa-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">إجمالي الإيرادات</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-ban"></i></div><span class="sa-kpi-change down">${suspendedTenants}</span></div><div class="sa-kpi-value">${suspendedTenants}</div><div class="sa-kpi-label">موقوفة</div></div>
    </div>
    <div class="sa-charts">
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-area"></i> تطور الإيرادات — آخر 12 شهر</div></div><div class="sa-chart-wrap"><canvas id="saChartMRR"></canvas></div></div>
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-pie"></i> توزيع الخطط</div></div><div class="sa-chart-wrap"><canvas id="saChartPlans"></canvas></div></div>
    </div>
    <div class="sa-charts">
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-bar"></i> نمو الصيدليات شهرياً</div></div><div class="sa-chart-wrap"><canvas id="saChartGrowth"></canvas></div></div>
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-bolt"></i> آخر الأنشطة</div></div>
        <div class="sa-activity">
          ${recentActivity.length > 0 ? recentActivity.map(a => `
            <div class="sa-activity-item">
              <div class="sa-act-icon" style="background:var(--gradient-brand)"><i class="fas fa-${a.icon || 'bolt'}"></i></div>
              <div class="sa-act-content"><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.desc || '')}</p><div class="sa-act-time">${timeAgo(a.timestamp)}</div></div>
            </div>
          `).join('') : '<div class="sa-empty" style="padding:40px 20px"><i class="fas fa-history"></i><h4>لا يوجد نشاط بعد</h4></div>'}
        </div>
      </div>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-star"></i> أفضل الصيدليات</h3><button class="btn btn-outline btn-sm" onclick="saSwitchPageByName('tenants')">عرض الكل</button></div>
      <div style="overflow-x:auto">
        <table class="sa-table">
          <thead><tr><th>الصيدلية</th><th>المالك</th><th>الخطة</th><th>الحالة</th><th>المستخدمون</th><th>التسجيل</th></tr></thead>
          <tbody>
            ${tenants.filter(t => t.plan !== 'basic').slice(0, 5).map(t => `
              <tr>
                <td><div class="sa-ten-cell"><div class="sa-ten-avatar">${escapeHtml(t.name.charAt(0))}</div><div class="sa-ten-info"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.email)}</span></div></div></td>
                <td>${escapeHtml(t.owner || '—')}</td>
                <td><span class="sa-badge sa-badge-${t.plan}">${t.plan.toUpperCase()}</span></td>
                <td><span class="sa-badge sa-badge-${t.status}">${t.status === 'active' ? 'نشطة' : t.status === 'trial' ? 'تجريبية' : t.status === 'suspended' ? 'موقوفة' : 'منتهية'}</span></td>
                <td>${t.userCount}</td>
                <td>${formatDate(t.createdAt)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد بيانات</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  setTimeout(() => {
    saInitMRRChart();
    saInitPlansChart();
    saInitGrowthChart();
  }, 100);
}

function saInitMRRChart() {
  const ctx = document.getElementById('saChartMRR');
  if (!ctx || typeof Chart === 'undefined') return;
  if (saCharts.mrr) saCharts.mrr.destroy();

  const labels = [], data = [];
  const base = saCalculateMRR() || 5000;
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('ar-EG', { month: 'short' }));
    data.push(Math.round(base * (0.4 + Math.random() * 0.7)));
  }

  saCharts.mrr = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: '#00b884',
        backgroundColor: 'rgba(0,184,132,.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#00b884',
        pointBorderColor: '#fff',
        pointBorderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function saInitPlansChart() {
  const ctx = document.getElementById('saChartPlans');
  if (!ctx || typeof Chart === 'undefined') return;
  if (saCharts.plans) saCharts.plans.destroy();

  const plans = { basic: 0, pro: 0, enterprise: 0 };
  saGetTenants().forEach(t => plans[t.plan] = (plans[t.plan] || 0) + 1);

  saCharts.plans = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Basic', 'Pro', 'Enterprise'],
      datasets: [{
        data: [plans.basic, plans.pro, plans.enterprise],
        backgroundColor: ['#94a3b8', '#1E88E5', '#7c3aed'],
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
          labels: { font: { family: 'Cairo', size: 12 }, padding: 12, usePointStyle: true, boxWidth: 10 }
        }
      }
    }
  });
}

function saInitGrowthChart() {
  const ctx = document.getElementById('saChartGrowth');
  if (!ctx || typeof Chart === 'undefined') return;
  if (saCharts.growth) saCharts.growth.destroy();

  const labels = [], data = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('ar-EG', { month: 'short' }));
    data.push(Math.floor(Math.random() * 8) + 2);
  }

  saCharts.growth = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: '#FF6B35', borderRadius: 8 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ============================================
   20. SUPER ADMIN SEARCH
   ============================================ */
const saGlobalSearchDebounced = Utils.debounce((q) => {
  const dropdown = document.getElementById('saSearchDropdown');
  if (!dropdown) return;

  if (!q || q.length < 1) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    return;
  }

  const term = q.toLowerCase().trim();
  const tenants = saGetTenants().filter(t =>
    t.name.toLowerCase().includes(term) ||
    (t.owner && t.owner.toLowerCase().includes(term)) ||
    (t.email && t.email.toLowerCase().includes(term)) ||
    (t.phone && t.phone.includes(term))
  );

  if (tenants.length === 0) {
    dropdown.innerHTML = `
      <div class="search-dd-empty">
        <i class="fas fa-search" style="font-size:1.5rem;opacity:.3;display:block;margin-bottom:8px"></i>
        لا توجد نتائج لـ "${escapeHtml(q)}"
      </div>`;
  } else {
    dropdown.innerHTML = `
      <div class="search-dd-section">
        <div class="search-dd-title">صيدليات (${tenants.length})</div>
        ${tenants.slice(0, 6).map(t => `
          <div class="search-dd-item" onclick="saSearchGotoTenant('${t.id}')">
            <div class="search-dd-icon" style="background:var(--gradient-brand)">${escapeHtml(t.name.charAt(0))}</div>
            <div class="search-dd-info">
              <strong>${escapeHtml(t.name)}</strong>
              <span>${escapeHtml(t.owner || t.email || '')}</span>
            </div>
            <span class="sa-badge sa-badge-${t.status}">${t.status}</span>
          </div>
        `).join('')}
      </div>
    `;
  }
  dropdown.classList.add('open');
}, 200);

function saSearchGotoTenant(id) {
  const dropdown = document.getElementById('saSearchDropdown');
  if (dropdown) dropdown.classList.remove('open');
  const searchInput = document.getElementById('saSearch');
  if (searchInput) searchInput.value = '';
  saSwitchPageByName('tenants');
  setTimeout(() => saViewTenant(id), 300);
}

document.addEventListener('click', (e) => {
  const saDropdown = document.getElementById('saSearchDropdown');
  const saSearch = document.getElementById('saSearch');
  if (saDropdown && saSearch && !saSearch.contains(e.target) && !saDropdown.contains(e.target)) {
    saDropdown.classList.remove('open');
  }
  const phDropdown = document.getElementById('phSearchDropdown');
  const phSearch = document.getElementById('phSearch');
  if (phDropdown && phSearch && !phSearch.contains(e.target) && !phDropdown.contains(e.target)) {
    phDropdown.classList.remove('open');
  }
});

/* ============================================
   21. TENANTS MANAGEMENT
   ============================================ */
function saRenderTenants() {
  const tenants = saGetAllTenantStats();
  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900;display:flex;align-items:center;gap:12px"><i class="fas fa-store-alt" style="color:var(--primary)"></i> الصيدليات</h1>
      <p style="color:var(--text-muted);font-size:.95rem;margin-top:4px">${tenants.length} صيدلية مسجلة</p>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head">
        <h3><i class="fas fa-list"></i> قائمة الصيدليات</h3>
        <div class="sa-filters">
          <input type="text" id="saTenSearch" placeholder="بحث..." class="sa-select" style="min-width:200px" oninput="saFilterTenants()">
          <select class="sa-select" id="saTenPlanFilter" onchange="saFilterTenants()">
            <option value="">كل الخطط</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select class="sa-select" id="saTenStatusFilter" onchange="saFilterTenants()">
            <option value="">كل الحالات</option>
            <option value="active">نشطة</option>
            <option value="trial">تجريبية</option>
            <option value="suspended">موقوفة</option>
          </select>
        </div>
      </div>
      <div id="saTenantsTableBody" style="overflow-x:auto"></div>
    </div>
  `;
  saFilterTenants();
}

function saFilterTenants() {
  const q = (document.getElementById('saTenSearch')?.value || '').toLowerCase();
  const planFilter = document.getElementById('saTenPlanFilter')?.value || '';
  const statusFilter = document.getElementById('saTenStatusFilter')?.value || '';

  let list = saGetAllTenantStats().filter(t => {
    const matchSearch = !q ||
      t.name.toLowerCase().includes(q) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.owner && t.owner.toLowerCase().includes(q));
    const matchPlan = !planFilter || t.plan === planFilter;
    const matchStatus = !statusFilter || t.status === statusFilter;
    return matchSearch && matchPlan && matchStatus;
  });

  const tbody = document.getElementById('saTenantsTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<div class="sa-empty"><i class="fas fa-store-alt"></i><h4>لا توجد صيدليات</h4></div>';
    return;
  }

  tbody.innerHTML = `
    <table class="sa-table">
      <thead><tr><th>الصيدلية</th><th>المالك</th><th>الخطة</th><th>الحالة</th><th>المستخدمون</th><th>التسجيل</th><th>إجراءات</th></tr></thead>
      <tbody>
        ${list.map(t => `
          <tr>
            <td><div class="sa-ten-cell"><div class="sa-ten-avatar">${escapeHtml(t.name.charAt(0))}</div><div class="sa-ten-info"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.email || '—')}</span></div></div></td>
            <td>${escapeHtml(t.owner || '—')}</td>
            <td><span class="sa-badge sa-badge-${t.plan}">${t.plan.toUpperCase()}</span></td>
            <td><span class="sa-badge sa-badge-${t.status}">${t.status === 'active' ? 'نشطة' : t.status === 'trial' ? 'تجريبية' : t.status === 'suspended' ? 'موقوفة' : 'منتهية'}</span></td>
            <td>${t.userCount}</td>
            <td>${formatDate(t.createdAt)}</td>
            <td>
              <div class="sa-actions">
                <button onclick="saViewTenant('${t.id}')" title="عرض"><i class="fas fa-eye"></i></button>
                ${t.status === 'active' || t.status === 'trial'
                  ? `<button class="warning" onclick="saSuspendTenant('${t.id}')" title="إيقاف"><i class="fas fa-pause"></i></button>`
                  : `<button class="success" onclick="saActivateTenant('${t.id}')" title="تنشيط"><i class="fas fa-play"></i></button>`}
                <button class="danger" onclick="saDeleteTenant('${t.id}')" title="حذف"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function saViewTenant(id) {
  const tenant = saGetTenants().find(t => t.id === id);
  if (!tenant) return;
  const users = saGetUsers().filter(u => u.tenantId === id);
  const subscriptions = saGetSubscriptions().filter(s => s.tenantId === id);
  const planPrices = { basic: 500, pro: 1000, enterprise: 2000 };

  document.getElementById('saModalBox').innerHTML = `
    <div class="sa-modal-head">
      <h3><i class="fas fa-store-alt"></i> ${escapeHtml(tenant.name)}</h3>
      <button class="sa-modal-close" onclick="saCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="sa-modal-body">
      <div class="sa-detail-grid">
        <div class="sa-detail"><strong>معرّف</strong><span>${tenant.id}</span></div>
        <div class="sa-detail"><strong>الخطة</strong><span class="sa-badge sa-badge-${tenant.plan}">${tenant.plan.toUpperCase()}</span></div>
        <div class="sa-detail"><strong>الحالة</strong><span class="sa-badge sa-badge-${tenant.status}">${tenant.status === 'active' ? 'نشطة' : tenant.status === 'trial' ? 'تجريبية' : 'موقوفة'}</span></div>
        <div class="sa-detail"><strong>سعر الشهر</strong><span>${planPrices[tenant.plan]} ج.م</span></div>
        <div class="sa-detail"><strong>المالك</strong><span>${escapeHtml(tenant.owner || '—')}</span></div>
        <div class="sa-detail"><strong>الهاتف</strong><span>${escapeHtml(tenant.phone || '—')}</span></div>
        <div class="sa-detail"><strong>البريد</strong><span>${escapeHtml(tenant.email || '—')}</span></div>
        <div class="sa-detail"><strong>المستخدمون</strong><span>${users.length} مستخدم</span></div>
      </div>
      <h4 style="margin:20px 0 12px;font-size:1rem;font-weight:900"><i class="fas fa-users" style="color:var(--primary)"></i> المستخدمون (${users.length})</h4>
      <div style="background:var(--bg-alt);border-radius:12px;padding:14px;margin-bottom:20px">
        ${users.map(u => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="display:block;font-size:.88rem">${escapeHtml(u.name)}</strong>
              <span style="font-size:.75rem;color:var(--text-muted)">${escapeHtml(u.email)}</span>
            </div>
            <span class="sa-badge sa-badge-${u.role === 'admin' ? 'pro' : 'basic'}">${u.role}</span>
          </div>
        `).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا يوجد مستخدمون</div>'}
      </div>
      <h4 style="margin:20px 0 12px;font-size:1rem;font-weight:900"><i class="fas fa-credit-card" style="color:var(--primary)"></i> سجل المدفوعات (${subscriptions.length})</h4>
      <div style="background:var(--bg-alt);border-radius:12px;padding:14px;max-height:200px;overflow-y:auto">
        ${subscriptions.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="display:block;font-size:.85rem">${s.type === 'trial' ? 'فترة تجريبية' : 'دفعة ' + (s.plan || '').toUpperCase()}</strong>
              <span style="font-size:.72rem;color:var(--text-muted)">${formatDate(s.createdAt)}</span>
            </div>
            <span style="font-weight:900;color:var(--success)">${(s.amount || 0).toLocaleString('ar-EG')} ج</span>
          </div>
        `).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا يوجد سجل</div>'}
      </div>
    </div>
    <div class="sa-modal-foot">
      ${tenant.status === 'active' || tenant.status === 'trial'
        ? `<button class="btn btn-outline" onclick="saSuspendTenant('${tenant.id}'); saCloseModal()"><i class="fas fa-pause"></i> إيقاف</button>`
        : `<button class="btn btn-success" onclick="saActivateTenant('${tenant.id}'); saCloseModal()"><i class="fas fa-play"></i> تنشيط</button>`}
      <button class="btn btn-primary" onclick="saUpgradeTenant('${tenant.id}')"><i class="fas fa-arrow-up"></i> ترقية</button>
      <button class="btn btn-outline" onclick="saCloseModal()">إغلاق</button>
    </div>
  `;
  document.getElementById('saModalOverlay').classList.add('open');
}

function saCloseModal() {
  document.getElementById('saModalOverlay').classList.remove('open');
  document.getElementById('saModalBox').innerHTML = '';
}

function saSuspendTenant(id) {
  const tenants = saGetTenants();
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'warning',
    title: 'إيقاف الصيدلية',
    message: 'هل تريد إيقاف "' + tenant.name + '"؟',
    confirmText: 'نعم، إيقاف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    tenant.status = 'suspended';
    DB.setTenants(tenants);
    saLogActivity('suspend', 'fa-pause', 'تم إيقاف "' + tenant.name + '"');
    saFilterTenants();
    saUpdateBadge();
    showToast('تم إيقاف "' + tenant.name + '"', 'warning');
  });
}

function saActivateTenant(id) {
  const tenants = saGetTenants();
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  tenant.status = 'active';
  DB.setTenants(tenants);
  saLogActivity('activate', 'fa-play', `تم تنشيط "${tenant.name}"`);
  saFilterTenants();
  saUpdateBadge();
  showToast(`تم تنشيط "${tenant.name}"`, 'success');
}

function saDeleteTenant(id) {
  const tenant = saGetTenants().find(t => t.id === id);
  if (!tenant) return;
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف الصيدلية',
    message: 'سيتم حذف "' + tenant.name + '" وكل بياناتها نهائياً.\n\nهل أنت متأكد؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    DB.setTenants(saGetTenants().filter(t => t.id !== id));
    DB.setUsers(saGetUsers().filter(u => u.tenantId !== id));
    saLogActivity('delete', 'fa-trash', 'تم حذف "' + tenant.name + '"');
    saRenderTenants();
    saUpdateBadge();
    showToast('تم حذف "' + tenant.name + '"', 'warning');
  });
}

function saUpgradeTenant(id) {
  const tenants = saGetTenants();
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  if (!window.Dialog) return;

  // Custom dialog with buttons
  var modal = document.getElementById('saModalBox');
  if (modal) {
    modal.innerHTML =
      '<div class="sa-modal-head">' +
        '<h3><i class="fas fa-arrow-up"></i> ترقية الخطة</h3>' +
        '<button class="sa-modal-close" onclick="saCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="sa-modal-body">' +
        '<p style="margin-bottom:16px;font-weight:700">ترقية خطة "' + escapeHtml(tenant.name) + '" من <strong>' + tenant.plan.toUpperCase() + '</strong> إلى:</p>' +
        '<div style="display:grid;gap:10px">' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'basic\')">' +
            '<span>Basic</span><strong style="color:#00b884">500 ج/شهر</strong>' +
          '</button>' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'pro\')">' +
            '<span>Pro</span><strong style="color:#1E88E5">1,000 ج/شهر</strong>' +
          '</button>' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'enterprise\')">' +
            '<span>Enterprise</span><strong style="color:#7c3aed">2,000 ج/شهر</strong>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="sa-modal-foot">' +
        '<button class="btn btn-outline" onclick="saCloseModal()">إلغاء</button>' +
      '</div>';
    document.getElementById('saModalOverlay').classList.add('open');
  }
}

window.saSelectUpgrade = function(id, newPlan) {
  const tenants = saGetTenants();
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  const oldPlan = tenant.plan;
  tenant.plan = newPlan;
  DB.setTenants(tenants);
  const planPrices = { basic: 500, pro: 1000, enterprise: 2000 };
  DB.addSubscription({
    tenantId: id, plan: tenant.plan, amount: planPrices[tenant.plan],
    type: 'upgrade', status: 'paid', from: oldPlan, to: tenant.plan
  });
  saLogActivity('upgrade', 'fa-arrow-up', 'تم ترقية "' + tenant.name + '"');
  saFilterTenants();
  saCloseModal();
  showToast('تم ترقية "' + tenant.name + '"', 'success');
};
/* ============================================
   22. SUBSCRIPTIONS
   ============================================ */
function saRenderSubscriptions() {
  const subs = saGetSubscriptions();
  const paid = subs.filter(s => s.status === 'paid');
  const trials = subs.filter(s => s.type === 'trial');
  const totalPaid = paid.reduce((s, x) => s + (x.amount || 0), 0);

  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-credit-card" style="color:var(--primary)"></i> الاشتراكات</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-credit-card"></i></div></div><div class="sa-kpi-value">${subs.length}</div><div class="sa-kpi-label">إجمالي العمليات</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-check-circle"></i></div></div><div class="sa-kpi-value">${paid.length}</div><div class="sa-kpi-label">مدفوعات ناجحة</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-hourglass-half"></i></div></div><div class="sa-kpi-value">${trials.length}</div><div class="sa-kpi-label">فترات تجريبية</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div><div class="sa-kpi-value">${totalPaid.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">إجمالي المحصل</div></div>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-list"></i> سجل الاشتراكات</h3></div>
      <div style="overflow-x:auto">
        <table class="sa-table">
          <thead><tr><th>الصيدلية</th><th>النوع</th><th>الخطة</th><th>المبلغ</th><th>الحالة</th><th>التاريخ</th></tr></thead>
          <tbody>
            ${subs.slice(0, 50).map(s => {
              const tenant = saGetTenants().find(t => t.id === s.tenantId);
              return `<tr>
                <td>${tenant ? escapeHtml(tenant.name) : '—'}</td>
                <td>${s.type === 'trial' ? 'تجربة' : s.type === 'upgrade' ? 'ترقية' : 'اشتراك'}</td>
                <td><span class="sa-badge sa-badge-${s.plan || 'basic'}">${(s.plan || 'basic').toUpperCase()}</span></td>
                <td><strong>${(s.amount || 0).toLocaleString('ar-EG')} ج</strong></td>
                <td><span class="sa-badge sa-badge-${s.status === 'paid' ? 'active' : 'trial'}">${s.status === 'paid' ? 'مدفوع' : s.status}</span></td>
                <td>${formatDate(s.createdAt)}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">لا يوجد سجل</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/* ============================================
   23. REVENUE
   ============================================ */
function saRenderRevenue() {
  const subs = saGetSubscriptions().filter(s => s.status === 'paid');
  const totalRevenue = subs.reduce((s, x) => s + (x.amount || 0), 0);
  const mrr = saCalculateMRR();

  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-chart-line" style="color:var(--primary)"></i> الإيرادات</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div><div class="sa-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">إجمالي الإيرادات</div></div>
      <div class="sa-kpi g5"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-dollar-sign"></i></div></div><div class="sa-kpi-value">${mrr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">MRR شهري</div></div>
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-chart-bar"></i></div></div><div class="sa-kpi-value">${(mrr * 12).toLocaleString('ar-EG')}</div><div class="sa-kpi-label">ARR سنوي</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-percentage"></i></div></div><div class="sa-kpi-value">${subs.length > 0 ? '8.4%' : '0%'}</div><div class="sa-kpi-label">معدل النمو</div></div>
    </div>
    <div class="sa-charts" style="grid-template-columns:1fr">
      <div class="sa-chart-card">
        <div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-area"></i> الإيرادات الشهرية</div></div>
        <div class="sa-chart-wrap" style="height:340px"><canvas id="saChartRevenue12"></canvas></div>
      </div>
    </div>
  `;
  setTimeout(saInitRevenueChart12, 100);
}

function saInitRevenueChart12() {
  const ctx = document.getElementById('saChartRevenue12');
  if (!ctx || typeof Chart === 'undefined') return;
  if (saCharts.rev12) saCharts.rev12.destroy();

  const labels = [], data = [];
  const base = saCalculateMRR() || 5000;
  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    labels.push(d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' }));
    data.push(Math.round(base * (0.5 + Math.random() * 0.8)));
  }

  saCharts.rev12 = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: 'rgba(0,184,132,.8)', borderRadius: 10 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

/* ============================================
   24. ACTIVITY LOG
   ============================================ */
function saRenderActivity() {
  const activity = JSON.parse(localStorage.getItem('pc_activity') || '[]');
  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-history" style="color:var(--primary)"></i> سجل النشاط</h1>
      <button class="btn btn-outline btn-sm" onclick="saClearActivity()"><i class="fas fa-trash"></i> مسح</button>
    </div>
    <div class="sa-table-card">
      <div class="sa-modal-body" style="padding:0">
        ${activity.length > 0 ? activity.map(a => `
          <div class="sa-activity-item" style="padding:16px 24px">
            <div class="sa-act-icon" style="background:var(--gradient-brand)"><i class="fas ${a.icon || 'fa-bolt'}"></i></div>
            <div class="sa-act-content">
              <strong>${escapeHtml(a.title)}</strong>
              <p>${escapeHtml(a.desc || '')}</p>
              <div class="sa-act-time">${timeAgo(a.timestamp)}</div>
            </div>
          </div>
        `).join('') : '<div class="sa-empty"><i class="fas fa-history"></i><h4>لا يوجد نشاط</h4></div>'}
      </div>
    </div>
  `;
}

function saClearActivity() {
  if (!confirm('مسح سجل النشاط؟')) return;
  localStorage.setItem('pc_activity', '[]');
  saRenderActivity();
  showToast('تم مسح السجل');
}

function saLogActivity(type, icon, desc) {
  const activity = JSON.parse(localStorage.getItem('pc_activity') || '[]');
  activity.unshift({
    id: 'a_' + Date.now(),
    type, icon,
    title: desc,
    desc: '',
    timestamp: new Date().toISOString()
  });
  localStorage.setItem('pc_activity', JSON.stringify(activity.slice(0, 200)));
}

/* ============================================
   25. REPORTS & SETTINGS
   ============================================ */
function saRenderReports() {
  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-file-alt" style="color:var(--primary)"></i> التقارير</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi" onclick="saExportAllExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-file-excel"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">تقرير شامل</div>
        <div class="sa-kpi-label">تصدير Excel</div>
      </div>
      <div class="sa-kpi g2" onclick="saExportAllPDF()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-file-pdf"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">تقرير PDF</div>
        <div class="sa-kpi-label">ملخص المنصة</div>
      </div>
      <div class="sa-kpi g4" onclick="saExportSubscriptionsExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-credit-card"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">الاشتراكات</div>
        <div class="sa-kpi-label">تصدير Excel</div>
      </div>
      <div class="sa-kpi g3" onclick="saExportRevenueExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">الإيرادات</div>
        <div class="sa-kpi-label">تصدير Excel</div>
      </div>
    </div>
  `;
}

function saRenderSettings() {
  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-cog" style="color:var(--primary)"></i> إعدادات المنصة</h1>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-building"></i> معلومات المنصة</h3></div>
      <div class="sa-modal-body">
        <div class="sa-detail-grid">
          <div class="sa-detail"><strong>اسم المنصة</strong><span>PharmaCloud Pro</span></div>
          <div class="sa-detail"><strong>الإصدار</strong><span>v2.0.0</span></div>
          <div class="sa-detail"><strong>البريد</strong><span>info@pharmacloud.app</span></div>
          <div class="sa-detail"><strong>الهاتف</strong><span>+20 128 498 7621</span></div>
        </div>
      </div>
    </div>
  `;
}

function saGetTenantStats() {
  return saGetTenants().map(t => ({
    ...t,
    userCount: saGetUsers().filter(u => u.tenantId === t.id).length
  }));
}

function saSwitchPageByName(name) {
  const items = document.querySelectorAll('.sa-item');
  const map = { overview: 0, tenants: 1, subscriptions: 2, revenue: 3, activity: 4, reports: 5, settings: 6 };
  const idx = map[name];
  if (idx !== undefined && items[idx]) saSwitchPage(items[idx], name);
}

/* ============================================
   26. EXPORTS (Super Admin)
   ============================================ */
function saExportAllExcel() {
  if (typeof XLSX === 'undefined') { showToast('جاري التحميل...'); return; }
  const tenants = saGetTenantStats().map(t => ({
    'معرف': t.id, 'اسم الصيدلية': t.name, 'المالك': t.owner || '',
    'البريد': t.email || '', 'الهاتف': t.phone || '', 'الخطة': t.plan,
    'الحالة': t.status, 'المستخدمون': t.userCount,
    'تاريخ التسجيل': formatDate(t.createdAt)
  }));
  const ws = XLSX.utils.json_to_sheet(tenants);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الصيدليات');
  XLSX.writeFile(wb, 'pharmacloud-tenants-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  showToast('تم تصدير Excel');
}

function saExportSubscriptionsExcel() {
  if (typeof XLSX === 'undefined') return;
  const subs = saGetSubscriptions().map(s => {
    const t = saGetTenants().find(x => x.id === s.tenantId);
    return {
      'الصيدلية': t?.name || '—', 'النوع': s.type, 'الخطة': s.plan,
      'المبلغ': s.amount || 0, 'الحالة': s.status, 'التاريخ': formatDate(s.createdAt)
    };
  });
  const ws = XLSX.utils.json_to_sheet(subs.length ? subs : [{ 'الصيدلية': 'لا يوجد' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الاشتراكات');
  XLSX.writeFile(wb, 'pharmacloud-subscriptions.xlsx');
  showToast('تم تصدير Excel');
}

function saExportRevenueExcel() {
  if (typeof XLSX === 'undefined') return;
  const subs = saGetSubscriptions().filter(s => s.status === 'paid').map(s => {
    const t = saGetTenants().find(x => x.id === s.tenantId);
    return { 'الصيدلية': t?.name || '—', 'المبلغ': s.amount || 0, 'التاريخ': formatDate(s.createdAt) };
  });
  const ws = XLSX.utils.json_to_sheet(subs.length ? subs : [{ 'الصيدلية': 'لا يوجد' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الإيرادات');
  XLSX.writeFile(wb, 'pharmacloud-revenue.xlsx');
  showToast('تم تصدير Excel');
}

function saExportAllPDF() {
  if (typeof html2pdf === 'undefined') { showToast('جاري التحميل...'); return; }
  const tenants = saGetTenantStats();
  const mrr = saCalculateMRR();
  const totalRevenue = saGetSubscriptions().filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0);

  const html = `<div style="font-family:Cairo,sans-serif;padding:40px;direction:rtl;background:#fff">
    <div style="text-align:center;border-bottom:3px solid #00b884;padding-bottom:20px;margin-bottom:30px">
      <h1 style="color:#00b884;margin:0;font-size:2rem">PharmaCloud</h1>
      <p style="color:#64748b;margin-top:8px">تقرير المنصة الشامل</p>
    </div>
    <h2 style="color:#00b884">📊 ملخص</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:.9rem">
      <tr style="background:#f0fdf9"><td style="padding:12px;border:1px solid #e2e8f0"><strong>الصيدليات</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${tenants.length}</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>النشطة</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${tenants.filter(t => t.status === 'active').length}</td></tr>
      <tr><td style="padding:12px;border:1px solid #e2e8f0"><strong>MRR</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${mrr.toLocaleString('ar-EG')} ج</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>إجمالي الإيرادات</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${totalRevenue.toLocaleString('ar-EG')} ج</td></tr>
    </table>
    <h2 style="color:#00b884">🏪 الصيدليات</h2>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="background:#00b884;color:#fff"><th style="padding:10px">الاسم</th><th style="padding:10px">المالك</th><th style="padding:10px">الخطة</th><th style="padding:10px">الحالة</th></tr></thead>
      <tbody>${tenants.map((t, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="padding:10px;border:1px solid #e2e8f0">${escapeHtml(t.name)}</td><td style="padding:10px;border:1px solid #e2e8f0">${escapeHtml(t.owner || '—')}</td><td style="padding:10px;border:1px solid #e2e8f0">${t.plan.toUpperCase()}</td><td style="padding:10px;border:1px solid #e2e8f0">${t.status}</td></tr>`).join('')}</tbody>
    </table>
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;color:#64748b;font-size:.85rem"><p>© 2026 PharmaCloud</p></div>
  </div>`;

  showToast('جاري إنشاء PDF...');
  html2pdf().set({
    margin: 0, filename: 'pharmacloud-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(html).save().then(() => showToast('✅ تم التحميل'));
}

/* ============================================
   27. PHARMACY STATE & HELPERS
   ============================================ */
let phCurrentPage = 'overview';
let phSession = null;
let phCharts = {};
let phCart = [];

const PH = {
  tenantId: null,
  branchId: 'main',

  setTenant(id) { this.tenantId = id; },

  _key(key) {
    const branch = this.getCurrentBranch();
    if (branch === 'main') return key;
    return `${key}_branch_${branch}`;
  },

  getProducts() { return DB.getTenantData(this.tenantId, this._key('products')); },
  setProducts(p) { DB.setTenantData(this.tenantId, this._key('products'), p); },
  getOrders() { return DB.getTenantData(this.tenantId, this._key('orders')); },
  setOrders(o) { DB.setTenantData(this.tenantId, this._key('orders'), o); },
  getCustomers() { return DB.getTenantData(this.tenantId, this._key('customers')); },
  setCustomers(c) { DB.setTenantData(this.tenantId, this._key('customers'), c); },
  getAttendance() { return DB.getTenantData(this.tenantId, this._key('attendance')); },
  setAttendance(a) { DB.setTenantData(this.tenantId, this._key('attendance'), a); },
  getPrescriptions() { return DB.getTenantData(this.tenantId, this._key('prescriptions')); },
  setPrescriptions(p) { DB.setTenantData(this.tenantId, this._key('prescriptions'), p); },

  getBranches() { return DB.getTenantData(this.tenantId, 'branches'); },
  setBranches(b) { DB.setTenantData(this.tenantId, 'branches', b); },
  getCurrentBranch() { return localStorage.getItem(`pc_${this.tenantId}_current_branch`) || 'main'; },
  setCurrentBranch(id) {
    localStorage.setItem(`pc_${this.tenantId}_current_branch`, id);
    this.branchId = id;
  },

  getTeam() { return DB.getUsers().filter(u => u.tenantId === this.tenantId); },
  getSettings() { return DB.safeGet(`pc_${this.tenantId}_settings`, '{}'); },
  setSettings(s) { DB.safeSet(`pc_${this.tenantId}_settings`, s); },
  getTenant() { return DB.getTenants().find(t => t.id === this.tenantId); },

  getBranchData(branchId, key) {
    if (branchId === 'main') return DB.getTenantData(this.tenantId, key);
    return DB.getTenantData(this.tenantId, `${key}_branch_${branchId}`);
  }
};

/* ============================================
   28. SEED PHARMACY DEMO DATA
   ⭐ ONLY for the demo tenant (t_demo)
   ============================================ */
function phSeedDemoData() {
  // If there are already products → don't seed
  if (PH.getProducts().length > 0) return;

  // ⭐ Get tenant to check if it's the demo tenant
  var tenant = null;
  try { tenant = PH.getTenant(); } catch (e) {}

  // ⭐ ONLY seed if it's the demo tenant
  // Users who register fresh (via "ابدأ 14 يوم مجاناً") get a tenant
  // with isDemo=false and skipSeedData=true → nothing gets seeded
  if (!tenant || (!tenant.isDemo && !tenant.skipSeedData)) {
    // This is a fresh tenant — leave it EMPTY
    // (user will add their own products)
    if (tenant && tenant.skipSeedData) {
      console.log('[PharmaCloud] ✅ Fresh tenant detected — data left empty');
    } else if (tenant) {
      console.log('[PharmaCloud] ⏸️ Non-demo tenant — no auto-seed');
    }
    return;
  }

  // If tenant has skipSeedData flag → definitely skip
  if (tenant.skipSeedData) {
    console.log('[PharmaCloud] ⏸️ skipSeedData=true — no demo data');
    return;
  }

  // ============================================
  //  DEMO TENANT ONLY — SEED DATA
  // ============================================
  console.log('[PharmaCloud] 🌱 Seeding demo data for demo tenant');

  const demoProducts = [
    { id: 'p1', barcode: '6221234567890', name: 'بنادول أدفانس', active: 'Paracetamol 500mg', category: 'أدوية', price: 45, cost: 28, stock: 120, minStock: 20, rx: false, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80' },
    { id: 'p2', barcode: '6221234567891', name: 'فيتامين د 50000', active: 'Cholecalciferol', category: 'فيتامينات', price: 85, cost: 55, stock: 80, minStock: 15, rx: false, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&q=80' },
    { id: 'p3', barcode: '6221234567892', name: 'كريم مرطب للبشرة', active: 'Glycerin + Ceramides', category: 'عناية بالبشرة', price: 120, cost: 75, stock: 45, minStock: 10, rx: false, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80' },
    { id: 'p4', barcode: '6221234567893', name: 'جهاز قياس ضغط', active: 'Digital BP Monitor', category: 'أجهزة طبية', price: 450, cost: 320, stock: 12, minStock: 5, rx: false, image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=200&q=80' },
    { id: 'p5', barcode: '6221234567894', name: 'حفاضات أطفال مقاس 3', active: 'Baby Diapers', category: 'الأم والطفل', price: 180, cost: 130, stock: 200, minStock: 30, rx: false, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&q=80' },
    { id: 'p6', barcode: '6221234567895', name: 'غسول مطهر لليدين', active: 'Chlorhexidine 2%', category: 'عناية شخصية', price: 75, cost: 45, stock: 150, minStock: 25, rx: false, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&q=80' },
    { id: 'p7', barcode: '6221234567896', name: 'معجون أسنان', active: 'Fluoride 1450ppm', category: 'عناية شخصية', price: 35, cost: 20, stock: 300, minStock: 50, rx: false, image: 'https://images.unsplash.com/photo-1559591937-abc3a7eb9c5c?w=200&q=80' },
    { id: 'p8', barcode: '6221234567897', name: 'أوميجا 3', active: 'Omega-3 1000mg', category: 'مكملات غذائية', price: 220, cost: 155, stock: 60, minStock: 12, rx: false, image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=200&q=80' },
    { id: 'p9', barcode: '6221234567898', name: 'أدول', active: 'Paracetamol 500mg', category: 'أدوية', price: 35, cost: 20, stock: 150, minStock: 20, rx: false, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80' },
    { id: 'p10', barcode: '6221234567899', name: 'أموكسيسيلين 500mg', active: 'Amoxicillin', category: 'أدوية', price: 85, cost: 55, stock: 40, minStock: 10, rx: true, image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&q=80' }
  ];
  PH.setProducts(demoProducts);

  const demoCustomers = [
    { id: 'c1', name: 'محمد أحمد', phone: '01012345678', email: 'm@test.com', address: 'سموحة', totalSpent: 1250, orders: 8, createdAt: '2026-05-10' },
    { id: 'c2', name: 'سارة محمود', phone: '01023456789', email: 's@test.com', address: 'سيدي جابر', totalSpent: 890, orders: 5, createdAt: '2026-06-22' },
    { id: 'c3', name: 'أحمد الشريف', phone: '01034567890', email: 'a@test.com', address: 'العصافرة', totalSpent: 2100, orders: 14, createdAt: '2026-04-01' },
    { id: 'c4', name: 'منى عبد الله', phone: '01045678901', email: 'mn@test.com', address: 'المندرة', totalSpent: 560, orders: 3, createdAt: '2026-07-15' },
    { id: 'c5', name: 'كريم يوسف', phone: '01056789012', email: 'k@test.com', address: 'العجمي', totalSpent: 1780, orders: 11, createdAt: '2026-03-08' }
  ];
  PH.setCustomers(demoCustomers);

  const demoOrders = [];
  for (let i = 0; i < 25; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const p1 = demoProducts[Math.floor(Math.random() * demoProducts.length)];
    const p2 = demoProducts[Math.floor(Math.random() * demoProducts.length)];
    const items = [
      { id: p1.id, name: p1.name, price: p1.price, qty: Math.floor(Math.random() * 3) + 1 },
      { id: p2.id, name: p2.name, price: p2.price, qty: Math.floor(Math.random() * 2) + 1 }
    ];
    const total = items.reduce((s, it) => s + it.price * it.qty, 0);
    const customer = demoCustomers[Math.floor(Math.random() * demoCustomers.length)];
    demoOrders.push({
      id: 'ORD-' + (1000 + i),
      customerId: customer.id,
      customerName: customer.name,
      items, total,
      paymentMethod: ['cash', 'card', 'wallet'][Math.floor(Math.random() * 3)],
      status: 'completed',
      createdAt: date.toISOString()
    });
  }
  PH.setOrders(demoOrders);

  const demoAtt = [];
  for (let i = 0; i < 15; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    demoAtt.push({
      id: 'att_' + i,
      date: d.toISOString(),
      userId: phSession?.userId || 'demo',
      userName: phSession?.name || 'مستخدم',
      checkIn: '09:' + String(Math.floor(Math.random() * 30) + 10).padStart(2, '0'),
      checkOut: i === 0 ? null : '17:' + String(Math.floor(Math.random() * 30) + 10).padStart(2, '0')
    });
  }
  PH.setAttendance(demoAtt);

  const demoPresc = [
    { id: 'rx1', patientName: 'محمد أحمد', phone: '01012345678', doctorName: 'د. أحمد سمير', diagnosis: 'برد حاد', items: [{ name: 'بنادول أدفانس', qty: 1, price: 45 }], notes: 'قرص كل 8 ساعات', status: 'dispensed', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'rx2', patientName: 'سارة محمود', phone: '01023456789', doctorName: 'د. منى إبراهيم', diagnosis: 'التهاب حلق', items: [{ name: 'أموكسيسيلين 500mg', qty: 1, price: 85 }], notes: 'قرص 3 مرات يومياً', status: 'pending', createdAt: new Date().toISOString() }
  ];
  PH.setPrescriptions(demoPresc);

  console.log('[PharmaCloud] ✅ Demo data seeded');
}

/* ============================================
   29. SHOW PHARMACY DASHBOARD
   ============================================ */
function phShowDashboard(session) {
  phSession = session;
  PH.setTenant(session.tenantId);
  PH.branchId = PH.getCurrentBranch();

  document.getElementById('appPlaceholder').classList.remove('open');
  document.getElementById('adminApp').classList.remove('active');
  document.getElementById('phApp').classList.add('active');
  document.body.classList.add('dashboard-mode');
  document.body.style.overflow = '';
  window.scrollTo(0, 0);

  const tenant = PH.getTenant();
  if (tenant) {
    document.getElementById('phBrandName').textContent = tenant.name;
    document.getElementById('phBrandSub').textContent = tenant.plan.toUpperCase() + ' PLAN';
    document.getElementById('phBrandIcon').textContent = tenant.name.charAt(0);
    const planBadge = document.getElementById('phPlanBadge');
    const daysLeft = tenant.trialEndsAt
      ? Math.max(0, Math.ceil((new Date(tenant.trialEndsAt) - Date.now()) / 86400000))
      : 30;
    planBadge.innerHTML = `<strong>${tenant.plan.toUpperCase()} PLAN</strong><span>${tenant.status === 'trial' ? daysLeft + ' يوم تجربة' : 'اشتراك نشط'}</span>`;
  }

  document.getElementById('phNameTop').textContent = session.name;
  document.getElementById('phAvatarTop').textContent = session.name.charAt(0);
  const roleNames = { admin: 'مدير الصيدلية', cashier: 'كاشير', employee: 'موظف' };
  document.getElementById('phRoleTop').textContent = roleNames[session.role] || session.role;

  phApplyPermissions();
  phSeedDemoData();
  phExtendSidebar();
  phUpdateBadges();
  phUpdateBranchSelector();

  phCurrentPage = session.role === 'cashier' ? 'pos' : 'overview';
  phRenderPage(phCurrentPage);

  const items = document.querySelectorAll('.ph-item');
  items.forEach(i => i.classList.remove('active'));
  const map = { overview: 0, pos: 1, orders: 2, products: 3, prescriptions: 4, customers: 5, attendance: 6, team: 7, reports: 8, subscription: 9, settings: 10 };
  const idx = map[phCurrentPage];
  if (items[idx]) items[idx].classList.add('active');

  requestNotificationPermission();
}

function phApplyPermissions() {
  const role = phSession.role;
  document.querySelectorAll('.ph-item').forEach(item => {
    item.style.display = '';
    const onclick = item.getAttribute('onclick') || '';
    if (role === 'cashier') {
      if (onclick.includes("'products'") || onclick.includes("'customers'") || onclick.includes("'team'") ||
          onclick.includes("'reports'") || onclick.includes("'settings'") || onclick.includes("'subscription'") ||
          onclick.includes("'overview'")) {
        item.style.display = 'none';
      }
    }
    if (role === 'employee') {
      if (!onclick.includes("'pos'") && !onclick.includes("'attendance'") && !onclick.includes("'orders'")) {
        item.style.display = 'none';
      }
    }
  });
}

function phUpdateBadges() {
  const pb = document.getElementById('phProductsBadge');
  if (pb) pb.textContent = PH.getProducts().length;
  const ob = document.getElementById('phOrdersBadge');
  if (ob) ob.textContent = PH.getOrders().length;
  const tb = document.getElementById('phTeamBadge');
  if (tb) tb.textContent = PH.getTeam().length;
  const rb = document.getElementById('phPrescBadge');
  if (rb) rb.textContent = PH.getPrescriptions().length;
}

function phToggleSidebar() {
  if (window.innerWidth <= 768) {
    document.getElementById('phSidebar').classList.toggle('open');
  } else {
    document.getElementById('phApp').classList.toggle('collapsed');
  }
}

function phSwitchPage(btn, page) {
  document.querySelectorAll('.ph-item').forEach(i => i.classList.remove('active'));
  btn.classList.add('active');
  phCurrentPage = page;
  phRenderPage(page);
  if (window.innerWidth <= 768) {
    document.getElementById('phSidebar').classList.remove('open');
  }
}

function phSwitchPageByName(name) {
  const items = document.querySelectorAll('.ph-item');
  const map = { overview: 0, pos: 1, orders: 2, products: 3, prescriptions: 4, customers: 5, attendance: 6, team: 7, reports: 8, subscription: 9, settings: 10 };
  const idx = map[name];
  if (idx !== undefined && items[idx]) phSwitchPage(items[idx], name);
}

function phLogout() {
  if (window.Dialog) {
    Dialog.confirm({
      type: 'question',
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من حسابك؟',
      confirmText: 'نعم، سجّل الخروج',
      cancelText: 'إلغاء'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('تم تسجيل الخروج', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
    });
  }
}

function phShowUserMenu() {
  phLogout();
}

function phRenderPage(page) {
  const content = document.getElementById('phContent');
  content.style.animation = 'none';
  setTimeout(() => content.style.animation = 'phFadeIn .4s', 10);

  switch (page) {
    case 'overview': phRenderOverview(); break;
    case 'pos': phRenderPOS(); break;
    case 'products': phRenderProducts(); break;
    case 'orders': phRenderOrders(); break;
    case 'prescriptions': phRenderPrescriptions(); break;
    case 'customers': phRenderCustomers(); break;
    case 'attendance': phRenderAttendance(); break;
    case 'team': phRenderTeam(); break;
    case 'reports': phRenderReports(); break;
    case 'subscription': phRenderSubscription(); break;
    case 'settings': phRenderSettings(); break;
    case 'bi': phRenderBI(); break;
    case 'branches': phRenderBranches(); break;
    case 'api': phRenderAPIKeys(); break;
    case 'online': phRenderOnlineOrders(); break;
    default: phRenderOverview();
  }
}

/* ============================================
   30. EXTEND SIDEBAR
   ============================================ */
function phExtendSidebar() {
  const sidebar = document.querySelector('#phApp .ph-sidebar');
  if (!sidebar || sidebar.dataset.extended) return;
  sidebar.dataset.extended = 'true';

  const brand = sidebar.querySelector('.ph-brand');
  if (brand && !document.getElementById('phBranchSelector')) {
    const branchSel = document.createElement('div');
    branchSel.className = 'branch-selector';
    branchSel.id = 'phBranchSelector';
    branchSel.onclick = phOpenBranchSwitcher;
    brand.after(branchSel);
  }

  const advancedSection = document.createElement('div');
  advancedSection.className = 'ph-section';
  advancedSection.innerHTML = `
    <div class="ph-section-title">متقدم</div>
    <button class="ph-item" onclick="phSwitchPage(this, 'bi')"><i class="fas fa-chart-bar"></i><span>لوحة BI</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'branches')"><i class="fas fa-store-alt"></i><span>الفروع</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'api')"><i class="fas fa-code"></i><span>API</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'online')"><i class="fas fa-globe"></i><span>طلبات أونلاين</span></button>
  `;
  const exitBtn = sidebar.querySelector('.ph-item[onclick*="phLogout"]');
  if (exitBtn && exitBtn.parentElement) {
    exitBtn.parentElement.before(advancedSection);
  } else {
    sidebar.appendChild(advancedSection);
  }
  phApplyPermissions();
}

/* ============================================
   31. PHARMACY SEARCH
   ============================================ */
const phGlobalSearchDebounced = Utils.debounce((q) => {
  const dropdown = document.getElementById('phSearchDropdown');
  if (!dropdown) return;

  if (!q || q.length < 1) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    return;
  }

  const term = q.toLowerCase().trim();
  const products = PH.getProducts().filter(p =>
    p.name.toLowerCase().includes(term) ||
    (p.active && p.active.toLowerCase().includes(term)) ||
    (p.barcode && p.barcode.includes(term)) ||
    (p.category && p.category.toLowerCase().includes(term))
  );
  const orders = PH.getOrders().filter(o =>
    o.id.toLowerCase().includes(term) || (o.customerName && o.customerName.toLowerCase().includes(term))
  );
  const customers = PH.getCustomers().filter(c =>
    c.name.toLowerCase().includes(term) || (c.phone && c.phone.includes(term))
  );
  const prescriptions = PH.getPrescriptions().filter(p =>
    (p.patientName && p.patientName.toLowerCase().includes(term)) || (p.phone && p.phone.includes(term))
  );

  const total = products.length + orders.length + customers.length + prescriptions.length;

  if (total === 0) {
    dropdown.innerHTML = `
      <div class="search-dd-empty">
        <i class="fas fa-search" style="font-size:1.5rem;opacity:.3;display:block;margin-bottom:8px"></i>
        لا توجد نتائج لـ "${escapeHtml(q)}"
      </div>`;
  } else {
    let html = '';
    if (products.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">منتجات (${products.length})</div>`;
      products.slice(0, 4).forEach(p => {
        html += `<div class="search-dd-item" onclick="phSearchGotoProduct('${p.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-brand)"><i class="fas fa-pills"></i></div>
          <div class="search-dd-info"><strong>${escapeHtml(p.name)}</strong><span>${p.price} ج • مخزون: ${p.stock}</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (orders.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">طلبات (${orders.length})</div>`;
      orders.slice(0, 3).forEach(o => {
        html += `<div class="search-dd-item" onclick="phSearchGotoOrder('${o.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-accent)"><i class="fas fa-receipt"></i></div>
          <div class="search-dd-info"><strong>${o.id}</strong><span>${escapeHtml(o.customerName)} • ${o.total} ج</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (customers.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">عملاء (${customers.length})</div>`;
      customers.slice(0, 3).forEach(c => {
        html += `<div class="search-dd-item" onclick="phSearchGotoCustomer('${c.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-purple)"><i class="fas fa-user"></i></div>
          <div class="search-dd-info"><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.phone)}</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (prescriptions.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">وصفات (${prescriptions.length})</div>`;
      prescriptions.slice(0, 3).forEach(p => {
        html += `<div class="search-dd-item" onclick="phSearchGotoPrescription('${p.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-success)"><i class="fas fa-file-prescription"></i></div>
          <div class="search-dd-info"><strong>${escapeHtml(p.patientName)}</strong><span>${escapeHtml(p.diagnosis || '')}</span></div>
        </div>`;
      });
      html += '</div>';
    }
    dropdown.innerHTML = html;
  }
  dropdown.classList.add('open');
}, 200);

function phSearchGotoProduct(id) {
  document.getElementById('phSearchDropdown').classList.remove('open');
  document.getElementById('phSearch').value = '';
  phSwitchPageByName('products');
  setTimeout(() => {
    const input = document.getElementById('phProdSearch');
    if (input) {
      const p = PH.getProducts().find(x => x.id === id);
      if (p) { input.value = p.name; phFilterProducts(); }
    }
  }, 250);
}

function phSearchGotoOrder(id) {
  document.getElementById('phSearchDropdown').classList.remove('open');
  document.getElementById('phSearch').value = '';
  phSwitchPageByName('orders');
  setTimeout(() => phViewOrder(id), 300);
}

function phSearchGotoCustomer(id) {
  document.getElementById('phSearchDropdown').classList.remove('open');
  document.getElementById('phSearch').value = '';
  phSwitchPageByName('customers');
  setTimeout(() => phEditCustomer(id), 300);
}

function phSearchGotoPrescription(id) {
  document.getElementById('phSearchDropdown').classList.remove('open');
  document.getElementById('phSearch').value = '';
  phSwitchPageByName('prescriptions');
  setTimeout(() => phViewPrescription(id), 300);
}

/* ============================================
   32. PHARMACY - OVERVIEW
   ============================================ */
function phRenderOverview() {
  const products = PH.getProducts();
  const orders = PH.getOrders();
  const customers = PH.getCustomers();
  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
  const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const lowStock = products.filter(p => p.stock <= p.minStock).length;
  const recentOrders = orders.slice(0, 5);

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div>
        <h1><i class="fas fa-chart-pie"></i> نظرة عامة</h1>
        <p>ملخص أداء صيدليتك — ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="ph-head-actions">
        <button class="btn btn-primary btn-sm" onclick="phSwitchPageByName('pos')"><i class="fas fa-cash-register"></i> بيع سريع</button>
        <button class="btn btn-outline btn-sm" onclick="phOpenAddProduct()"><i class="fas fa-plus"></i> منتج جديد</button>
      </div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi" onclick="phSwitchPageByName('orders')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-shopping-bag"></i></div><span class="ph-kpi-change">اليوم</span></div>
        <div class="ph-kpi-value">${todayOrders.length}</div><div class="ph-kpi-label">طلبات اليوم</div>
      </div>
      <div class="ph-kpi g4">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-coins"></i></div><span class="ph-kpi-change">+12%</span></div>
        <div class="ph-kpi-value">${todayRevenue.toLocaleString('ar-EG')}</div><div class="ph-kpi-label">إيراد اليوم</div>
      </div>
      <div class="ph-kpi g3">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-pills"></i></div><span class="ph-kpi-change">${products.length}</span></div>
        <div class="ph-kpi-value">${products.length}</div><div class="ph-kpi-label">إجمالي المنتجات</div>
      </div>
      <div class="ph-kpi g2" onclick="phSwitchPageByName('products')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div><span class="ph-kpi-change down">${lowStock}</span></div>
        <div class="ph-kpi-value">${lowStock}</div><div class="ph-kpi-label">تحتاج إعادة طلب</div>
      </div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi g5">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-dollar-sign"></i></div><span class="ph-kpi-change">إجمالي</span></div>
        <div class="ph-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="ph-kpi-label">إجمالي الإيرادات</div>
      </div>
      <div class="ph-kpi" onclick="phSwitchPageByName('customers')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-user-friends"></i></div><span class="ph-kpi-change">+${Math.floor(Math.random() * 5)}</span></div>
        <div class="ph-kpi-value">${customers.length}</div><div class="ph-kpi-label">عملاء مسجلون</div>
      </div>
      <div class="ph-kpi g3">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-chart-line"></i></div></div>
        <div class="ph-kpi-value">${orders.length ? Math.round(totalRevenue / orders.length) : 0}</div><div class="ph-kpi-label">متوسط قيمة الطلب</div>
      </div>
      <div class="ph-kpi g4">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-check-circle"></i></div></div>
        <div class="ph-kpi-value">${orders.length}</div><div class="ph-kpi-label">إجمالي الطلبات</div>
      </div>
    </div>
    <div class="ph-charts">
      <div class="ph-chart-card">
        <div class="ph-chart-head"><div class="ph-chart-title"><i class="fas fa-chart-area"></i> المبيعات آخر 7 أيام</div></div>
        <div class="ph-chart-wrap"><canvas id="phSalesChart"></canvas></div>
      </div>
      <div class="ph-chart-card">
        <div class="ph-chart-head"><div class="ph-chart-title"><i class="fas fa-chart-pie"></i> توزيع الفئات</div></div>
        <div class="ph-chart-wrap"><canvas id="phCatChart"></canvas></div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-receipt"></i> آخر الطلبات</h3>
        <button class="btn btn-outline btn-sm" onclick="phSwitchPageByName('orders')">عرض الكل</button>
      </div>
      <div style="overflow-x:auto">
        ${recentOrders.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتجات</th><th>الإجمالي</th><th>التاريخ</th><th>الحالة</th></tr></thead>
            <tbody>${recentOrders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${o.items.length} منتج</td>
                <td><strong style="color:var(--primary)">${o.total} ج</strong></td>
                <td>${formatDate(o.createdAt)}</td>
                <td><span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> مكتمل</span></td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-receipt"></i><h4>لا توجد طلبات</h4></div>'}
      </div>
    </div>
  `;

  setTimeout(() => { phInitSalesChart(); phInitCatChart(); }, 100);
}

function phInitSalesChart() {
  const ctx = document.getElementById('phSalesChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (phCharts.sales) phCharts.sales.destroy();

  const orders = PH.getOrders();
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short' }));
    data.push(orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0));
  }

  phCharts.sales = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#00b884', backgroundColor: 'rgba(0,184,132,.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#00b884', pointBorderColor: '#fff', pointBorderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } }, x: { grid: { display: false } } } }
  });
}

function phInitCatChart() {
  const ctx = document.getElementById('phCatChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (phCharts.cat) phCharts.cat.destroy();

  const cats = {};
  PH.getProducts().forEach(p => cats[p.category] = (cats[p.category] || 0) + 1);

  phCharts.cat = new Chart(ctx, {
    type: 'doughnut',
    data: { labels: Object.keys(cats), datasets: [{ data: Object.values(cats), backgroundColor: ['#00b884', '#1E88E5', '#FF6B35', '#7c3aed', '#f59e0b', '#06b6d4'], borderWidth: 0, hoverOffset: 10 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 11 }, padding: 10, usePointStyle: true, boxWidth: 10 } } } }
  });
}

/* ============================================
   33. PHARMACY - POS
   ============================================ */
function phRenderPOS() {
  const products = PH.getProducts();
  const customerList = PH.getCustomers();

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-cash-register"></i> نقطة البيع</h1><p>اختر المنتجات أو امسح الباركود</p></div>
    </div>
    <div class="ph-pos-grid">
      <div>
        <div class="barcode-input">
          <input type="text" id="phBarcodeInput" placeholder="🔍 امسح الباركود أو اكتبه هنا..." onkeypress="if(event.key==='Enter'){event.preventDefault(); phHandleBarcode(this.value);}" autocomplete="off">
          <button class="btn btn-primary" onclick="phHandleBarcode(document.getElementById('phBarcodeInput').value)">
            <i class="fas fa-barcode"></i>
          </button>
        </div>
        <div style="margin-bottom:16px">
          <input type="text" class="ph-input" style="width:100%;padding:14px 18px;font-size:1rem" placeholder="🔍 ابحث عن منتج بالاسم..." oninput="phFilterPOS(this.value)">
        </div>
        <div class="ph-pos-products" id="phPosProducts">
          ${products.map(p => `
            <div class="ph-pos-card" onclick="phAddToCart('${p.id}')">
              <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Product'">
              <h4>${escapeHtml(p.name)}</h4>
              <div class="price">${p.price} ج</div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">متوفر: ${p.stock}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="ph-cart" id="phCart">
        <div class="ph-cart-head">
          <h3><i class="fas fa-shopping-cart" style="color:var(--primary)"></i> السلة</h3>
          <button class="btn btn-outline btn-sm" onclick="phClearCart()"><i class="fas fa-trash"></i></button>
        </div>
        <div style="margin-bottom:14px">
          <select class="ph-select" id="phCartCustomer" style="width:100%">
            <option value="">عميل عابر</option>
            ${customerList.map(c => `<option value="${c.id}">${escapeHtml(c.name)} — ${escapeHtml(c.phone)}</option>`).join('')}
          </select>
        </div>
        <div class="ph-cart-items" id="phCartItems">
          <div class="ph-cart-empty"><i class="fas fa-shopping-basket"></i><p>السلة فاضية</p></div>
        </div>
        <div class="ph-cart-total">
          <div class="ph-cart-row"><span>عدد المنتجات:</span><span id="phCartCount">0</span></div>
          <div class="ph-cart-row total"><span>الإجمالي:</span><span id="phCartTotal">0 ج</span></div>
        </div>
        <div style="display:flex;gap:8px">
          <select class="ph-select" id="phPaymentMethod" style="flex:1">
            <option value="cash">💵 كاش</option>
            <option value="card">💳 بطاقة</option>
            <option value="wallet">📱 محفظة</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="phCheckout()" id="phCheckoutBtn" disabled>
          <i class="fas fa-check-circle"></i> إتمام البيع
        </button>
      </div>
    </div>
  `;
  phCart = [];
  phRenderCart();

  setTimeout(() => {
    const bc = document.getElementById('phBarcodeInput');
    if (bc) bc.focus();
  }, 100);
}

function phHandleBarcode(code) {
  if (!code) return;
  code = code.trim();
  const product = PH.getProducts().find(p => p.barcode === code);
  if (!product) {
    showToast('❌ باركود غير معروف: ' + code, 'error');
    playSound('error');
    return;
  }
  phAddToCart(product.id);
  showToast(`✅ تم إضافة ${product.name}`, 'success');
  const input = document.getElementById('phBarcodeInput');
  if (input) input.value = '';
}

function phFilterPOS(q) {
  q = q.toLowerCase().trim();
  const products = PH.getProducts().filter(p =>
    !q ||
    p.name.toLowerCase().includes(q) ||
    (p.active && p.active.toLowerCase().includes(q)) ||
    p.category.toLowerCase().includes(q)
  );
  const grid = document.getElementById('phPosProducts');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="ph-pos-card" onclick="phAddToCart('${p.id}')">
      <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Product'">
      <h4>${escapeHtml(p.name)}</h4>
      <div class="price">${p.price} ج</div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">متوفر: ${p.stock}</div>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">لا توجد نتائج</div>';
}

function phAddToCart(productId) {
  const product = PH.getProducts().find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) { showToast('غير متوفر', 'warning'); return; }

  try {
    const interactions = DrugInteractions.checkInteractions(phCart, product);
    if (interactions.length > 0) {
      DrugInteractions.renderAlert(interactions);
      window._pendingInteractionProduct = productId;
      document.getElementById('interactionProceedBtn').onclick = () => {
        closeInteractionAlert();
        _doAddToCart(productId);
        const session = DB.getSession();
        if (session?.tenantId) {
          DB.logAudit(session.tenantId, 'sale_override_interaction', { product: product.name, interactions: interactions.map(i => i.desc) });
        }
      };
      return;
    }
  } catch (e) { console.warn('Interaction check error', e); }

  _doAddToCart(productId);
}

function _doAddToCart(productId) {
  const product = PH.getProducts().find(p => p.id === productId);
  if (!product) return;

  const existing = phCart.find(c => c.id === productId);
  if (existing) {
    if (existing.qty >= product.stock) { showToast('الكمية لا تكفي', 'warning'); return; }
    existing.qty++;
  } else {
    phCart.push({ id: product.id, name: product.name, price: product.price, qty: 1, stock: product.stock });
  }
  phRenderCart();

  const session = DB.getSession();
  if (session?.tenantId) {
    DB.logAudit(session.tenantId, 'sale_add_to_cart', { product: product.name });
  }
}

function phRenderCart() {
  const items = document.getElementById('phCartItems');
  if (!items) return;

  if (phCart.length === 0) {
    items.innerHTML = '<div class="ph-cart-empty"><i class="fas fa-shopping-basket"></i><p>السلة فاضية</p></div>';
  } else {
    items.innerHTML = phCart.map(c => `
      <div class="ph-cart-item">
        <div class="ph-cart-item-info">
          <strong>${escapeHtml(c.name)}</strong>
          <span>${c.price} ج × ${c.qty}</span>
          <div class="ph-qty">
            <button onclick="phChangeQty('${c.id}', -1)">−</button>
            <span>${c.qty}</span>
            <button onclick="phChangeQty('${c.id}', 1)">+</button>
          </div>
        </div>
        <div style="text-align:end">
          <strong style="color:var(--primary)">${(c.price * c.qty).toLocaleString('ar-EG')} ج</strong>
          <button onclick="phRemoveFromCart('${c.id}')" style="display:block;margin-top:6px;color:var(--danger);font-size:.8rem"><i class="fas fa-times"></i></button>
        </div>
      </div>
    `).join('');
  }

  const count = phCart.reduce((s, c) => s + c.qty, 0);
  const total = phCart.reduce((s, c) => s + c.price * c.qty, 0);
  const countEl = document.getElementById('phCartCount');
  const totalEl = document.getElementById('phCartTotal');
  const btn = document.getElementById('phCheckoutBtn');

  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = total.toLocaleString('ar-EG') + ' ج';
  if (btn) btn.disabled = phCart.length === 0;
}

function phChangeQty(id, delta) {
  const item = phCart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { phRemoveFromCart(id); return; }
  if (item.qty > item.stock) { item.qty = item.stock; showToast('الكمية لا تكفي', 'warning'); }
  phRenderCart();
}

function phRemoveFromCart(id) {
  phCart = phCart.filter(c => c.id !== id);
  phRenderCart();
}

function phClearCart() {
  if (phCart.length === 0) return;
  if (!window.Dialog) {
    phCart = [];
    phRenderCart();
    return;
  }
  Dialog.confirm({
    type: 'warning',
    title: 'إفراغ السلة',
    message: 'هل تريد إفراغ السلة من كل المنتجات؟',
    confirmText: 'نعم، أفرغها',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    phCart = [];
    phRenderCart();
  });
}

function phCheckout() {
  if (phCart.length === 0) return;

  const total = phCart.reduce((s, c) => s + c.price * c.qty, 0);
  const customerId = document.getElementById('phCartCustomer')?.value || '';
  const customer = customerId ? PH.getCustomers().find(c => c.id === customerId) : null;
  const paymentMethod = document.getElementById('phPaymentMethod')?.value || 'cash';

  const order = {
    id: 'ORD-' + Date.now().toString().slice(-6),
    customerId: customer?.id || null,
    customerName: customer?.name || 'عميل عابر',
    items: phCart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    total, paymentMethod, status: 'completed',
    createdAt: new Date().toISOString(),
    createdBy: phSession.userId,
    branchId: PH.getCurrentBranch()
  };

  const orders = PH.getOrders();
  orders.unshift(order);
  PH.setOrders(orders);

  const products = PH.getProducts();
  phCart.forEach(c => {
    const prod = products.find(p => p.id === c.id);
    if (prod) prod.stock -= c.qty;
  });
  PH.setProducts(products);

  if (customer) {
    const customers = PH.getCustomers();
    const c = customers.find(x => x.id === customer.id);
    if (c) {
      c.totalSpent += total;
      c.orders = (c.orders || 0) + 1;
      PH.setCustomers(customers);
    }
  }

  DB.logAudit(phSession.tenantId, 'sale_completed', { orderId: order.id, total });

  phCart = [];
  phRenderCart();
  phUpdateBadges();
  showToast(`✅ تم البيع — ${total.toLocaleString('ar-EG')} ج`, 'success');
  pushNotification('💳 عملية بيع جديدة', `مبلغ ${total.toLocaleString('ar-EG')} ج`);
  playSound('success');
  setTimeout(phRenderPOS, 300);
}

/* ============================================
   34. PHARMACY - PRODUCTS
   ============================================ */
let phTempImageBase64 = '';

function phRenderProducts() {
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-pills"></i> المنتجات</h1><p>إدارة منتجات ومخزون صيدليتك</p></div>
      <div class="ph-head-actions">
        <button class="btn btn-outline btn-sm" onclick="phOpenImportExcel()"><i class="fas fa-file-import"></i> استيراد Excel</button>
        <button class="btn btn-outline btn-sm" onclick="phExportExcel()"><i class="fas fa-file-excel"></i> تصدير</button>
        <button class="btn btn-primary btn-sm" onclick="phOpenAddProduct()"><i class="fas fa-plus"></i> منتج جديد</button>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-list"></i> قائمة المنتجات</h3>
        <div class="ph-filters">
          <input type="text" id="phProdSearch" placeholder="بحث..." class="ph-input" oninput="phFilterProductsDebounced()">
          <select class="ph-select" id="phProdCatFilter" onchange="phFilterProducts()"><option value="">كل الفئات</option></select>
          <select class="ph-select" id="phProdStockFilter" onchange="phFilterProducts()">
            <option value="">كل المخزون</option>
            <option value="low">منخفض</option>
            <option value="out">نفد</option>
          </select>
        </div>
      </div>
      <div id="phProductsBody" style="overflow-x:auto"></div>
    </div>
  `;

  const cats = [...new Set(PH.getProducts().map(p => p.category))];
  const sel = document.getElementById('phProdCatFilter');
  if (sel) cats.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);
  phFilterProducts();
}

const phFilterProductsDebounced = Utils.debounce(() => phFilterProducts(), 200);

function phFilterProducts() {
  const q = (document.getElementById('phProdSearch')?.value || '').toLowerCase();
  const cat = document.getElementById('phProdCatFilter')?.value || '';
  const stockFilter = document.getElementById('phProdStockFilter')?.value || '';

  let list = PH.getProducts().filter(p => {
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.active && p.active.toLowerCase().includes(q));
    const matchCat = !cat || p.category === cat;
    const matchStock = !stockFilter || (stockFilter === 'low' ? p.stock <= p.minStock && p.stock > 0 : p.stock === 0);
    return matchSearch && matchCat && matchStock;
  });

  const body = document.getElementById('phProductsBody');
  if (!body) return;

  if (list.length === 0) {
    body.innerHTML = '<div class="ph-empty"><i class="fas fa-pills"></i><h4>لا توجد منتجات</h4></div>';
    return;
  }

  body.innerHTML = `
    <table class="ph-table">
      <thead><tr><th>المنتج</th><th>الباركود</th><th>الفئة</th><th>السعر</th><th>المخزون</th><th>الحالة</th><th>إجراءات</th></tr></thead>
      <tbody>
        ${list.map(p => {
          const sb = p.stock === 0
            ? '<span class="ph-badge ph-badge-red">نفد</span>'
            : p.stock <= p.minStock
              ? `<span class="ph-badge ph-badge-orange">منخفض (${p.stock})</span>`
              : `<span class="ph-badge ph-badge-green">${p.stock}</span>`;
          return `<tr>
            <td>
              <div class="ph-prod-cell">
                <div class="ph-prod-img"><img src="${p.image}" onerror="this.src='https://via.placeholder.com/44'"></div>
                <div class="ph-prod-info">
                  <strong>${escapeHtml(p.name)} ${p.rx ? '℞' : ''}</strong>
                  <span>${escapeHtml(p.active || '')}</span>
                </div>
              </div>
            </td>
            <td><code style="font-size:.78rem;background:var(--bg-alt);padding:3px 8px;border-radius:6px">${escapeHtml(p.barcode || '—')}</code></td>
            <td><span class="ph-badge ph-badge-gray">${escapeHtml(p.category)}</span></td>
            <td><strong>${p.price} ج</strong></td>
            <td>${sb}</td>
            <td>${p.stock > p.minStock ? '<span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> متوفر</span>' : '<span class="ph-badge ph-badge-orange"><i class="fas fa-exclamation"></i> اطلب المزيد</span>'}</td>
            <td>
              <div class="ph-actions">
                <button onclick="phEditProduct('${p.id}')"><i class="fas fa-pen"></i></button>
                <button class="danger" onclick="phDeleteProduct('${p.id}')"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

function phOpenAddProduct() {
  phTempImageBase64 = '';
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-plus"></i> إضافة منتج جديد</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveProduct(event)">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>اسم المنتج <span class="req">*</span></label><input type="text" id="phPName" required></div>
          <div class="ph-form-group"><label>المادة الفعالة</label><input type="text" id="phPActive"></div>
          <div class="ph-form-group"><label>الباركود</label><input type="text" id="phPBarcode" placeholder="امسح الباركود أو اكتبه" style="font-family:monospace"></div>
          <div class="ph-form-group"><label>الفئة <span class="req">*</span></label>
            <select id="phPCat" required>
              <option value="">اختر</option>
              <option>أدوية</option><option>فيتامينات</option><option>عناية بالبشرة</option>
              <option>أجهزة طبية</option><option>الأم والطفل</option><option>مكملات غذائية</option><option>عناية شخصية</option>
            </select>
          </div>
          <div class="ph-form-group"><label>السعر <span class="req">*</span></label><input type="number" id="phPPrice" required min="0" step="0.5"></div>
          <div class="ph-form-group"><label>التكلفة</label><input type="number" id="phPCost" min="0" step="0.5"></div>
          <div class="ph-form-group"><label>الكمية <span class="req">*</span></label><input type="number" id="phPStock" required min="0" value="0"></div>
          <div class="ph-form-group"><label>الحد الأدنى</label><input type="number" id="phPMinStock" min="0" value="10"></div>
          <div class="ph-form-group"><label>يحتاج روشتة؟</label><select id="phPRx"><option value="no">لا</option><option value="yes">نعم</option></select></div>
          <div class="ph-form-group full">
            <label>صورة المنتج</label>
            <div class="file-upload">
              <input type="file" accept="image/*" id="phPImageFile" onchange="phHandleImageUpload(this)">
              <div class="file-upload-label"><i class="fas fa-cloud-upload-alt"></i> اختر صورة من جهازك</div>
            </div>
            <img class="image-preview" id="phPImagePreview">
            <div style="margin-top:8px;font-size:.78rem;color:var(--text-muted)">أو الصق رابط الصورة:</div>
            <input type="url" id="phPImage" placeholder="https://..." style="margin-top:6px">
          </div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phHandleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('الصورة أكبر من 2MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    phTempImageBase64 = e.target.result;
    const preview = document.getElementById('phPImagePreview');
    if (preview) { preview.src = e.target.result; preview.classList.add('show'); }
    const urlInput = document.getElementById('phPImage');
    if (urlInput) urlInput.value = '';
  };
  reader.readAsDataURL(file);
}

function phSaveProduct(e) {
  e.preventDefault();
  const products = PH.getProducts();
  const imageUrl = document.getElementById('phPImage').value.trim();

  products.unshift({
    id: 'p_' + Date.now(),
    name: document.getElementById('phPName').value.trim(),
    active: document.getElementById('phPActive').value.trim(),
    barcode: document.getElementById('phPBarcode').value.trim(),
    category: document.getElementById('phPCat').value,
    price: parseFloat(document.getElementById('phPPrice').value),
    cost: parseFloat(document.getElementById('phPCost').value) || 0,
    stock: parseInt(document.getElementById('phPStock').value) || 0,
    minStock: parseInt(document.getElementById('phPMinStock').value) || 10,
    rx: document.getElementById('phPRx').value === 'yes',
    image: phTempImageBase64 || imageUrl || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80'
  });
  PH.setProducts(products);
  phCloseModal();
  phRenderProducts();
  phUpdateBadges();
  showToast('✅ تمت الإضافة', 'success');
  phTempImageBase64 = '';
}

function phEditProduct(id) {
  const product = PH.getProducts().find(p => p.id === id);
  if (!product) return;
  phTempImageBase64 = '';

  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-pen"></i> تعديل منتج</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phUpdateProduct(event, '${id}')">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>اسم المنتج</label><input type="text" id="phPName" value="${escapeHtml(product.name)}" required></div>
          <div class="ph-form-group"><label>المادة الفعالة</label><input type="text" id="phPActive" value="${escapeHtml(product.active || '')}"></div>
          <div class="ph-form-group"><label>الباركود</label><input type="text" id="phPBarcode" value="${escapeHtml(product.barcode || '')}" style="font-family:monospace"></div>
          <div class="ph-form-group"><label>الفئة</label>
            <select id="phPCat" required>
              ${['أدوية','فيتامينات','عناية بالبشرة','أجهزة طبية','الأم والطفل','مكملات غذائية','عناية شخصية'].map(c => `<option ${c === product.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="ph-form-group"><label>السعر</label><input type="number" id="phPPrice" value="${product.price}" required min="0" step="0.5"></div>
          <div class="ph-form-group"><label>التكلفة</label><input type="number" id="phPCost" value="${product.cost || 0}" min="0" step="0.5"></div>
          <div class="ph-form-group"><label>الكمية</label><input type="number" id="phPStock" value="${product.stock}" required min="0"></div>
          <div class="ph-form-group"><label>الحد الأدنى</label><input type="number" id="phPMinStock" value="${product.minStock || 10}" min="0"></div>
          <div class="ph-form-group"><label>يحتاج روشتة؟</label><select id="phPRx"><option value="no" ${!product.rx ? 'selected' : ''}>لا</option><option value="yes" ${product.rx ? 'selected' : ''}>نعم</option></select></div>
          <div class="ph-form-group full">
            <label>صورة المنتج</label>
            <div class="file-upload">
              <input type="file" accept="image/*" id="phPImageFile" onchange="phHandleImageUpload(this)">
              <div class="file-upload-label"><i class="fas fa-cloud-upload-alt"></i> استبدل الصورة</div>
            </div>
            <img class="image-preview show" id="phPImagePreview" src="${product.image}">
            <div style="margin-top:8px;font-size:.78rem;color:var(--text-muted)">أو الصق رابط الصورة:</div>
            <input type="url" id="phPImage" value="${escapeHtml(product.image || '')}" style="margin-top:6px">
          </div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phUpdateProduct(e, id) {
  e.preventDefault();
  const products = PH.getProducts();
  const idx = products.findIndex(p => p.id === id);
  if (idx < 0) return;
  const imageUrl = document.getElementById('phPImage').value.trim();
  products[idx] = {
    ...products[idx],
    name: document.getElementById('phPName').value.trim(),
    active: document.getElementById('phPActive').value.trim(),
    barcode: document.getElementById('phPBarcode').value.trim(),
    category: document.getElementById('phPCat').value,
    price: parseFloat(document.getElementById('phPPrice').value),
    cost: parseFloat(document.getElementById('phPCost').value) || 0,
    stock: parseInt(document.getElementById('phPStock').value) || 0,
    minStock: parseInt(document.getElementById('phPMinStock').value) || 10,
    rx: document.getElementById('phPRx').value === 'yes',
    image: phTempImageBase64 || imageUrl || products[idx].image
  };
  PH.setProducts(products);
  phCloseModal();
  phRenderProducts();
  showToast('✅ تم التحديث', 'success');
  phTempImageBase64 = '';
}

function phDeleteProduct(id) {
  const product = PH.getProducts().find(p => p.id === id);
  if (!product) return;
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف المنتج',
    message: 'هل تريد حذف "' + product.name + '"؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    PH.setProducts(PH.getProducts().filter(p => p.id !== id));
    phRenderProducts();
    phUpdateBadges();
    showToast('تم الحذف', 'warning');
  });
}

/* ============ EXCEL IMPORT ============ */
function phOpenImportExcel() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-import"></i> استيراد منتجات من Excel</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:16px">ارفع ملف Excel (.xlsx) فيه الأعمدة:</p>
      <div style="background:var(--bg-alt);padding:14px;border-radius:10px;font-size:.82rem;font-family:monospace;margin-bottom:16px">
        <strong>الاسم | المادة الفعالة | الفئة | السعر | التكلفة | المخزون | الحد الأدنى</strong>
      </div>
      <div class="file-upload">
        <input type="file" accept=".xlsx,.xls" id="phExcelFile" onchange="phHandleExcelImport(this)">
        <div class="file-upload-label"><i class="fas fa-file-excel"></i> اختر ملف Excel</div>
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-outline btn-sm" onclick="phDownloadSampleExcel()"><i class="fas fa-download"></i> تحميل ملف نموذجي</button>
      </div>
    </div>
    <div class="ph-modal-foot">
      <button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phDownloadSampleExcel() {
  if (typeof XLSX === 'undefined') return;
  const sample = [{ 'الاسم': 'بنادول', 'المادة الفعالة': 'Paracetamol', 'الفئة': 'أدوية', 'السعر': 45, 'التكلفة': 28, 'المخزون': 100, 'الحد الأدنى': 20 }];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'منتجات');
  XLSX.writeFile(wb, 'pharmacloud-products-template.xlsx');
}

function phHandleExcelImport(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { showToast('مكتبة Excel لم تُحمّل', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) { showToast('الملف فاضي', 'error'); return; }
      const products = PH.getProducts();
      let added = 0;
      rows.forEach(row => {
        const name = row['الاسم'] || row['name'];
        if (!name) return;
        products.unshift({
          id: 'p_' + Date.now() + '_' + added,
          name,
          active: row['المادة الفعالة'] || '',
          barcode: row['الباركود'] || '',
          category: row['الفئة'] || 'أدوية',
          price: parseFloat(row['السعر'] || 0),
          cost: parseFloat(row['التكلفة'] || 0),
          stock: parseInt(row['المخزون'] || 0),
          minStock: parseInt(row['الحد الأدنى'] || 10),
          rx: false,
          image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80'
        });
        added++;
      });
      PH.setProducts(products);
      phCloseModal();
      phRenderProducts();
      phUpdateBadges();
      showToast(`✅ تم استيراد ${added} منتج`, 'success');
    } catch (err) {
      console.error(err);
      showToast('خطأ في قراءة الملف', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ============================================
   35. PHARMACY - ORDERS
   ============================================ */
function phRenderOrders() {
  const orders = PH.getOrders();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-receipt"></i> الطلبات</h1><p>${orders.length} طلب</p></div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-list"></i> سجل الطلبات</h3>
        <div class="ph-filters">
          <input type="text" id="phOrderSearch" placeholder="بحث..." class="ph-input" oninput="phFilterOrdersDebounced()">
        </div>
      </div>
      <div id="phOrdersBody" style="overflow-x:auto"></div>
    </div>
  `;
  phFilterOrders();
}

const phFilterOrdersDebounced = Utils.debounce(() => phFilterOrders(), 200);

function phFilterOrders() {
  const q = (document.getElementById('phOrderSearch')?.value || '').toLowerCase();
  const orders = PH.getOrders().filter(o => !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q));
  const body = document.getElementById('phOrdersBody');
  if (!body) return;
  if (orders.length === 0) {
    body.innerHTML = '<div class="ph-empty"><i class="fas fa-receipt"></i><h4>لا توجد طلبات</h4></div>';
    return;
  }
  body.innerHTML = `
    <table class="ph-table">
      <thead><tr><th>رقم الطلب</th><th>العميل</th><th>المنتجات</th><th>الإجمالي</th><th>الدفع</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${escapeHtml(o.customerName)}</td>
          <td>${o.items.length} منتج</td>
          <td><strong style="color:var(--primary)">${o.total} ج</strong></td>
          <td><span class="ph-badge ph-badge-gray">${o.paymentMethod === 'cash' ? '💵 كاش' : o.paymentMethod === 'card' ? '💳 بطاقة' : o.paymentMethod === 'online' ? '🌐 أونلاين' : '📱 محفظة'}</span></td>
          <td>${formatDate(o.createdAt)}</td>
          <td><div class="ph-actions"><button onclick="phViewOrder('${o.id}')"><i class="fas fa-eye"></i></button></div></td>
        </tr>
      `).join('')}</tbody>
    </table>
  `;
}

function phViewOrder(id) {
  const order = PH.getOrders().find(o => o.id === id);
  if (!order) return;
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-receipt"></i> الطلب ${order.id}</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">العميل</strong>${escapeHtml(order.customerName)}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">التاريخ</strong>${formatDateTime(order.createdAt)}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">طريقة الدفع</strong>${order.paymentMethod}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">الحالة</strong><span class="ph-badge ph-badge-green">مكتمل</span></div>
      </div>
      <table class="ph-table" style="min-width:auto">
        <thead><tr><th>المنتج</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>
          ${order.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} ج</td><td>${it.qty}</td><td><strong>${it.price * it.qty} ج</strong></td></tr>`).join('')}
          <tr style="background:var(--bg-alt)"><td colspan="3" style="text-align:end;font-weight:900">الإجمالي:</td><td style="font-weight:900;color:var(--primary);font-size:1.1rem">${order.total} ج</td></tr>
        </tbody>
      </table>
    </div>
    <div class="ph-modal-foot">
      <button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>
      <button class="btn btn-primary" onclick="phPrintOrder('${order.id}')"><i class="fas fa-print"></i> طباعة</button>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phPrintOrder(id) {
  const order = PH.getOrders().find(o => o.id === id);
  if (!order) return;
  const tenant = PH.getTenant();
  const w = window.open('', '_blank');
  const printScript = 'window.onload=function(){window.print();setTimeout(function(){window.close();},500)}';
  w.document.write(`<html dir="rtl"><head><title>فاتورة ${order.id}</title>
    <style>body{font-family:Cairo,sans-serif;padding:40px;max-width:400px;margin:auto}h1{color:#00b884;text-align:center;font-size:1.4rem}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px;border-bottom:1px solid #eee;font-size:.9rem;text-align:right}th{background:#f8fafc}.total{font-weight:900;font-size:1.1rem}.footer{text-align:center;margin-top:20px;color:#999;font-size:.8rem}</style></head><body>
    <h1>${escapeHtml(tenant.name)}</h1><p style="text-align:center;font-size:.85rem;color:#666">فاتورة رقم ${order.id}</p>
    <p style="font-size:.85rem">التاريخ: ${formatDateTime(order.createdAt)}<br>العميل: ${escapeHtml(order.customerName)}</p>
    <table><thead><tr><th>المنتج</th><th>سعر</th><th>كمية</th><th>إجمالي</th></tr></thead><tbody>
    ${order.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} ج</td><td>${it.qty}</td><td>${it.price * it.qty} ج</td></tr>`).join('')}
    <tr class="total"><td colspan="3" style="text-align:end">الإجمالي:</td><td style="color:#00b884">${order.total} ج</td></tr>
    </tbody></table><div class="footer">شكراً لتعاملكم معنا 💚</div>
    <script>${printScript}<\/script></body></html>`);
  w.document.close();
}


/* ============================================
   36. PHARMACY - PRESCRIPTIONS
   ============================================ */
function phRenderPrescriptions() {
  const prescriptions = PH.getPrescriptions();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-file-prescription"></i> الوصفات الطبية</h1><p>${prescriptions.length} وصفة مسجلة</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddPrescription()"><i class="fas fa-plus"></i> وصفة جديدة</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> قائمة الوصفات</h3></div>
      <div style="overflow-x:auto">
        ${prescriptions.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>المريض</th><th>الطبيب</th><th>التشخيص</th><th>الأدوية</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
            <tbody>${prescriptions.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.patientName)}</strong><br><span style="font-size:.75rem;color:var(--text-muted)">${escapeHtml(p.phone || '')}</span></td>
                <td>${escapeHtml(p.doctorName || '—')}</td>
                <td>${escapeHtml(p.diagnosis || '—')}</td>
                <td>${p.items.length} دواء</td>
                <td>${p.status === 'dispensed' ? '<span class="ph-badge ph-badge-green">تم الصرف</span>' : p.status === 'pending' ? '<span class="ph-badge ph-badge-orange">قيد الانتظار</span>' : '<span class="ph-badge ph-badge-gray">ملغاة</span>'}</td>
                <td>${formatDate(p.createdAt)}</td>
                <td>
                  <div class="ph-actions">
                    <button onclick="phViewPrescription('${p.id}')"><i class="fas fa-eye"></i></button>
                    <button class="danger" onclick="phDeletePrescription('${p.id}')"><i class="fas fa-trash"></i></button>
                  </div>
                </td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-file-prescription"></i><h4>لا توجد وصفات</h4></div>'}
      </div>
    </div>
  `;
}

function phOpenAddPrescription() {
  const products = PH.getProducts();
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-prescription"></i> وصفة جديدة</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSavePrescription(event)">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group"><label>اسم المريض <span class="req">*</span></label><input type="text" id="rxPatientName" required></div>
          <div class="ph-form-group"><label>الهاتف</label><input type="tel" id="rxPhone"></div>
          <div class="ph-form-group"><label>اسم الطبيب</label><input type="text" id="rxDoctorName"></div>
          <div class="ph-form-group"><label>التشخيص</label><input type="text" id="rxDiagnosis"></div>
          <div class="ph-form-group full">
            <label>الأدوية (اختر من المنتجات)</label>
            <div id="rxItemsContainer" style="background:var(--bg-alt);padding:12px;border-radius:10px;margin-bottom:10px"></div>
            <button type="button" class="btn btn-outline btn-sm" onclick="phAddRxItem()"><i class="fas fa-plus"></i> إضافة دواء</button>
          </div>
          <div class="ph-form-group full"><label>ملاحظات</label><textarea id="rxNotes" rows="2"></textarea></div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  window._rxItems = [];
  phAddRxItem();
  document.getElementById('phModalOverlay').classList.add('open');
}

function phAddRxItem() {
  const products = PH.getProducts();
  const container = document.getElementById('rxItemsContainer');
  if (!container) return;
  const idx = window._rxItems.length;
  window._rxItems.push({ productId: '', qty: 1, price: 0 });
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';
  div.innerHTML = `
    <select class="ph-select" style="flex:1" onchange="phUpdateRxItem(${idx}, 'productId', this.value)">
      <option value="">اختر منتج...</option>
      ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} — ${p.price} ج</option>`).join('')}
    </select>
    <input type="number" min="1" value="1" style="width:70px;padding:8px;border:1.5px solid var(--border);border-radius:8px" onchange="phUpdateRxItem(${idx}, 'qty', this.value)">
    <button type="button" onclick="this.parentElement.remove()" style="color:var(--danger);padding:6px"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(div);
}

function phUpdateRxItem(idx, key, value) {
  if (!window._rxItems[idx]) return;
  window._rxItems[idx][key] = value;
  if (key === 'productId') {
    const p = PH.getProducts().find(x => x.id === value);
    if (p) window._rxItems[idx].price = p.price;
  }
}

function phSavePrescription(e) {
  e.preventDefault();
  const items = (window._rxItems || []).filter(it => it.productId).map(it => {
    const p = PH.getProducts().find(x => x.id === it.productId);
    return { productId: it.productId, name: p?.name || '', qty: parseInt(it.qty) || 1, price: parseFloat(it.price) || 0 };
  });
  if (items.length === 0) { showToast('أضف دواء واحد على الأقل', 'error'); return; }

  const prescriptions = PH.getPrescriptions();
  prescriptions.unshift({
    id: 'rx_' + Date.now(),
    patientName: document.getElementById('rxPatientName').value.trim(),
    phone: document.getElementById('rxPhone').value.trim(),
    doctorName: document.getElementById('rxDoctorName').value.trim(),
    diagnosis: document.getElementById('rxDiagnosis').value.trim(),
    items,
    notes: document.getElementById('rxNotes').value.trim(),
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  PH.setPrescriptions(prescriptions);
  phCloseModal();
  phRenderPrescriptions();
  phUpdateBadges();
  showToast('✅ تم حفظ الوصفة', 'success');
  window._rxItems = [];
}

function phViewPrescription(id) {
  const p = PH.getPrescriptions().find(x => x.id === id);
  if (!p) return;
  const total = p.items.reduce((s, it) => s + it.price * it.qty, 0);
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-prescription"></i> وصفة ${escapeHtml(p.patientName)}</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">المريض</strong>${escapeHtml(p.patientName)}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">الهاتف</strong>${escapeHtml(p.phone || '—')}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">الطبيب</strong>${escapeHtml(p.doctorName || '—')}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">التشخيص</strong>${escapeHtml(p.diagnosis || '—')}</div>
      </div>
      <table class="ph-table" style="min-width:auto">
        <thead><tr><th>الدواء</th><th>السعر</th><th>الكمية</th><th>الإجمالي</th></tr></thead>
        <tbody>
          ${p.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} ج</td><td>${it.qty}</td><td>${it.price * it.qty} ج</td></tr>`).join('')}
          <tr style="background:var(--bg-alt)"><td colspan="3" style="text-align:end;font-weight:900">الإجمالي:</td><td style="font-weight:900;color:var(--primary)">${total} ج</td></tr>
        </tbody>
      </table>
    </div>
    <div class="ph-modal-foot">
      ${p.status === 'pending' ? `<button class="btn btn-success" onclick="phDispensePrescription('${p.id}')"><i class="fas fa-check"></i> صرف الوصفة</button>` : ''}
      <button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phDispensePrescription(id) {
  const prescriptions = PH.getPrescriptions();
  const p = prescriptions.find(x => x.id === id);
  if (!p) return;
  const products = PH.getProducts();
  p.items.forEach(it => {
    const prod = products.find(x => x.id === it.productId);
    if (prod && prod.stock >= it.qty) prod.stock -= it.qty;
  });
  PH.setProducts(products);
  p.status = 'dispensed';
  PH.setPrescriptions(prescriptions);
  phCloseModal();
  phRenderPrescriptions();
  phUpdateBadges();
  showToast('✅ تم صرف الوصفة', 'success');
}

function phDeletePrescription(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف الوصفة',
    message: 'هل تريد حذف هذه الوصفة؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    PH.setPrescriptions(PH.getPrescriptions().filter(p => p.id !== id));
    phRenderPrescriptions();
    phUpdateBadges();
    showToast('تم الحذف', 'warning');
  });
}

/* ============================================
   37. PHARMACY - CUSTOMERS
   ============================================ */
function phRenderCustomers() {
  const customers = PH.getCustomers();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-user-friends"></i> العملاء</h1><p>${customers.length} عميل</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddCustomer()"><i class="fas fa-user-plus"></i> عميل جديد</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> قائمة العملاء</h3></div>
      <div style="overflow-x:auto">
        ${customers.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>الاسم</th><th>الهاتف</th><th>العنوان</th><th>إجمالي الشراء</th><th>الطلبات</th><th>إجراءات</th></tr></thead>
            <tbody>${customers.map(c => `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.phone)}</td>
                <td>${escapeHtml(c.address || '—')}</td>
                <td><strong style="color:var(--primary)">${(c.totalSpent || 0).toLocaleString('ar-EG')} ج</strong></td>
                <td>${c.orders || 0}</td>
                <td><div class="ph-actions">
                  <button onclick="phEditCustomer('${c.id}')"><i class="fas fa-pen"></i></button>
                  <button class="danger" onclick="phDeleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-user-friends"></i><h4>لا يوجد عملاء</h4></div>'}
      </div>
    </div>
  `;
}

function phOpenAddCustomer() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-user-plus"></i> عميل جديد</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveCustomer(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>الاسم <span class="req">*</span></label><input type="text" id="phCName" required></div>
        <div class="ph-form-group"><label>الهاتف <span class="req">*</span></label><input type="tel" id="phCPhone" required></div>
        <div class="ph-form-group"><label>البريد</label><input type="email" id="phCEmail"></div>
        <div class="ph-form-group"><label>العنوان</label><input type="text" id="phCAddress"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phSaveCustomer(e) {
  e.preventDefault();
  const customers = PH.getCustomers();
  customers.unshift({
    id: 'c_' + Date.now(),
    name: document.getElementById('phCName').value.trim(),
    phone: document.getElementById('phCPhone').value.trim(),
    email: document.getElementById('phCEmail').value.trim(),
    address: document.getElementById('phCAddress').value.trim(),
    totalSpent: 0, orders: 0,
    createdAt: new Date().toISOString()
  });
  PH.setCustomers(customers);
  phCloseModal();
  phRenderCustomers();
  showToast('✅ تمت الإضافة', 'success');
}

function phEditCustomer(id) {
  const c = PH.getCustomers().find(x => x.id === id);
  if (!c) return;
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-pen"></i> تعديل عميل</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phUpdateCustomer(event, '${id}')">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>الاسم <span class="req">*</span></label><input type="text" id="phCName" value="${escapeHtml(c.name)}" required></div>
        <div class="ph-form-group"><label>الهاتف <span class="req">*</span></label><input type="tel" id="phCPhone" value="${escapeHtml(c.phone)}" required></div>
        <div class="ph-form-group"><label>البريد</label><input type="email" id="phCEmail" value="${escapeHtml(c.email || '')}"></div>
        <div class="ph-form-group"><label>العنوان</label><input type="text" id="phCAddress" value="${escapeHtml(c.address || '')}"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phUpdateCustomer(e, id) {
  e.preventDefault();
  const customers = PH.getCustomers();
  const idx = customers.findIndex(c => c.id === id);
  if (idx < 0) return;
  customers[idx].name = document.getElementById('phCName').value.trim();
  customers[idx].phone = document.getElementById('phCPhone').value.trim();
  customers[idx].email = document.getElementById('phCEmail').value.trim();
  customers[idx].address = document.getElementById('phCAddress').value.trim();
  PH.setCustomers(customers);
  phCloseModal();
  phRenderCustomers();
  showToast('✅ تم التحديث', 'success');
}

function phDeleteCustomer(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف العميل',
    message: 'هل تريد حذف هذا العميل؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    PH.setCustomers(PH.getCustomers().filter(c => c.id !== id));
    phRenderCustomers();
  });
}

/* ============================================
   38. PHARMACY - ATTENDANCE
   ============================================ */
function phRenderAttendance() {
  const attendance = PH.getAttendance();
  const today = new Date().toDateString();
  const todayRec = attendance.find(a => new Date(a.date).toDateString() === today && a.userId === phSession.userId);

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-fingerprint"></i> الحضور</h1><p>سجل الحضور اليومي</p></div>
    </div>
    <div class="ph-att-card">
      <div class="ph-att-icon"><i class="fas fa-fingerprint"></i></div>
      <h3 style="margin-bottom:8px">تسجيل الحضور</h3>
      <div class="ph-att-time">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="ph-att-date">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      ${todayRec?.checkIn
        ? todayRec.checkOut
          ? `<div style="padding:14px;background:rgba(16,185,129,.1);border-radius:12px;color:var(--success);font-weight:800"><i class="fas fa-check-circle"></i> تم تسجيل الحضور والانصراف</div>`
          : `<div style="padding:14px;background:rgba(255,107,53,.1);border-radius:12px;color:var(--accent);font-weight:800;margin-bottom:12px"><i class="fas fa-clock"></i> حضور: ${todayRec.checkIn}</div>
             <button class="btn btn-primary btn-block" onclick="phCheckOut()"><i class="fas fa-sign-out-alt"></i> تسجيل الانصراف</button>`
        : `<button class="btn btn-primary btn-lg btn-block" onclick="phCheckIn()"><i class="fas fa-fingerprint"></i> تسجيل الحضور</button>`}
    </div>
    <div class="ph-table-card" style="margin-top:24px">
      <div class="ph-table-head"><h3><i class="fas fa-history"></i> سجل الحضور</h3></div>
      <div style="overflow-x:auto">
        <table class="ph-table">
          <thead><tr><th>التاريخ</th><th>الحضور</th><th>الانصراف</th><th>الحالة</th></tr></thead>
          <tbody>${attendance.slice(0, 15).map(a => `
            <tr>
              <td>${formatDate(a.date)}</td>
              <td><strong style="color:var(--success)">${a.checkIn || '—'}</strong></td>
              <td><strong style="color:var(--secondary)">${a.checkOut || '—'}</strong></td>
              <td>${a.checkOut ? '<span class="ph-badge ph-badge-green">مكتمل</span>' : '<span class="ph-badge ph-badge-orange">قيد العمل</span>'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function phCheckIn() {
  const now = new Date();
  const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const attendance = PH.getAttendance();
  attendance.unshift({
    id: 'att_' + Date.now(),
    date: now.toISOString(),
    userId: phSession.userId,
    userName: phSession.name,
    checkIn: time,
    checkOut: null
  });
  PH.setAttendance(attendance);
  showToast(`✅ تم تسجيل حضورك ${time}`, 'success');
  phRenderAttendance();
}

function phCheckOut() {
  const now = new Date();
  const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const attendance = PH.getAttendance();
  const today = new Date().toDateString();
  const rec = attendance.find(a => new Date(a.date).toDateString() === today && a.userId === phSession.userId);
  if (rec) { rec.checkOut = time; PH.setAttendance(attendance); }
  showToast(`✅ تم تسجيل انصرافك ${time}`, 'success');
  phRenderAttendance();
}

/* ============================================
   39. PHARMACY - TEAM
   ============================================ */
function phRenderTeam() {
  const team = PH.getTeam();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-users-cog"></i> فريق العمل</h1><p>${team.length} عضو</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddTeamMember()"><i class="fas fa-user-plus"></i> إضافة عضو</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> أعضاء الفريق</h3></div>
      <div style="overflow-x:auto">
        <table class="ph-table">
          <thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${team.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.name)}</strong></td>
              <td>${escapeHtml(u.email)}</td>
              <td><span class="ph-badge ph-badge-${u.role === 'admin' ? 'blue' : u.role === 'cashier' ? 'green' : 'gray'}">${u.role === 'admin' ? 'مدير' : u.role === 'cashier' ? 'كاشير' : 'موظف'}</span></td>
              <td><span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> نشط</span></td>
              <td><div class="ph-actions">${u.id === phSession.userId ? '' : `<button class="danger" onclick="phDeleteTeamMember('${u.id}')"><i class="fas fa-trash"></i></button>`}</div></td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}

function phOpenAddTeamMember() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-user-plus"></i> إضافة عضو</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveTeamMember(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>الاسم <span class="req">*</span></label><input type="text" id="phTMName" required></div>
        <div class="ph-form-group"><label>البريد <span class="req">*</span></label><input type="email" id="phTMEmail" required></div>
        <div class="ph-form-group"><label>كلمة المرور <span class="req">*</span></label><input type="password" id="phTMPassword" required minlength="6"></div>
        <div class="ph-form-group"><label>الدور <span class="req">*</span></label>
          <select id="phTMRole" required>
            <option value="cashier">كاشير</option>
            <option value="employee">موظف</option>
            <option value="admin">مدير</option>
          </select>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phSaveTeamMember(e) {
  e.preventDefault();
  const email = document.getElementById('phTMEmail').value.trim().toLowerCase();
  const users = DB.getUsers();
  if (users.find(u => u.email.toLowerCase() === email)) {
    showToast('البريد مستخدم', 'error');
    return;
  }
  users.push({
    id: 'u_' + Date.now(),
    tenantId: PH.tenantId,
    name: document.getElementById('phTMName').value.trim(),
    email,
    password: document.getElementById('phTMPassword').value,
    role: document.getElementById('phTMRole').value
  });
  DB.setUsers(users);
  phCloseModal();
  phRenderTeam();
  phUpdateBadges();
  showToast('✅ تمت الإضافة', 'success');
}

function phDeleteTeamMember(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف عضو الفريق',
    message: 'هل تريد حذف هذا العضو من الفريق؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    DB.setUsers(DB.getUsers().filter(u => u.id !== id));
    phRenderTeam();
    phUpdateBadges();
  });
}

/* ============================================
   40. PHARMACY - REPORTS
   ============================================ */
function phRenderReports() {
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-file-alt"></i> التقارير</h1><p>تصدير تقارير صيدليتك</p></div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi" onclick="phExportExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-file-excel"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">تقرير المنتجات</div>
        <div class="ph-kpi-label">تصدير Excel</div>
      </div>
      <div class="ph-kpi g2" onclick="phExportOrdersExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-receipt"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">تقرير الطلبات</div>
        <div class="ph-kpi-label">تصدير Excel</div>
      </div>
      <div class="ph-kpi g3" onclick="phExportCustomersExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-users"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">تقرير العملاء</div>
        <div class="ph-kpi-label">تصدير Excel</div>
      </div>
      <div class="ph-kpi g4" onclick="phExportPDF()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-file-pdf"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">تقرير شامل</div>
        <div class="ph-kpi-label">تصدير PDF</div>
      </div>
    </div>
  `;
}

/* ============================================
   41. PHARMACY - SUBSCRIPTION
   ============================================ */
function phRenderSubscription() {
  const tenant = PH.getTenant();
  const subs = DB.getSubscriptions().filter(s => s.tenantId === PH.tenantId);
  const planPrices = { basic: 500, pro: 1000, enterprise: 2000 };

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-credit-card"></i> اشتراكي</h1><p>إدارة اشتراك صيدليتك</p></div>
    </div>
    <div style="background:var(--gradient-brand);color:#fff;padding:36px;border-radius:24px;margin-bottom:24px">
      <div style="font-size:.85rem;opacity:.85;font-weight:700;letter-spacing:1px;text-transform:uppercase">الخطة الحالية</div>
      <h2 style="font-size:2.5rem;font-weight:900;margin:8px 0">${tenant.plan.toUpperCase()}</h2>
      <div style="font-size:1.1rem;opacity:.9">${planPrices[tenant.plan]} ج.م / شهرياً</div>
      <div style="margin-top:20px;padding:14px;background:rgba(255,255,255,.15);border-radius:12px;display:inline-block">
        <i class="fas fa-calendar"></i>
        ${tenant.status === 'trial'
          ? `تجربة — ${Math.max(0, Math.ceil((new Date(tenant.trialEndsAt) - Date.now()) / 86400000))} يوم متبقي`
          : `اشتراك نشط حتى ${formatDate(tenant.subscriptionEndsAt)}`}
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" style="background:#fff;color:var(--primary);font-weight:900" onclick="phOpenPaymentModal('pro', 1000)"><i class="fas fa-arrow-up"></i> ترقية إلى Pro</button>
        <button class="btn" style="background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.4)" onclick="phOpenPaymentModal('enterprise', 2000)"><i class="fas fa-crown"></i> Enterprise</button>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-history"></i> سجل المدفوعات</h3></div>
      <div style="overflow-x:auto">
        ${subs.length > 0 ? `
          <table class="ph-table"><thead><tr><th>النوع</th><th>الخطة</th><th>المبلغ</th><th>التاريخ</th></tr></thead>
          <tbody>${subs.map(s => `
            <tr><td>${s.type === 'trial' ? 'فترة تجريبية' : s.type === 'payment' ? 'دفعة' : 'اشتراك'}</td><td>${(s.plan || '').toUpperCase()}</td><td>${(s.amount || 0)} ج</td><td>${formatDate(s.createdAt)}</td></tr>
          `).join('')}</tbody></table>
        ` : '<div class="ph-empty"><i class="fas fa-credit-card"></i><h4>لا توجد مدفوعات</h4></div>'}
      </div>
    </div>
  `;
}

/* ============================================
   42. PHARMACY - SETTINGS
   ============================================ */
function phRenderSettings() {
  const tenant = PH.getTenant();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-cog"></i> الإعدادات</h1><p>إعدادات صيدليتك</p></div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-store"></i> معلومات الصيدلية</h3></div>
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>اسم الصيدلية</label><input type="text" id="phSName" value="${escapeHtml(tenant.name || '')}"></div>
          <div class="ph-form-group"><label>الهاتف</label><input type="tel" id="phSPhone" value="${escapeHtml(tenant.phone || '')}"></div>
          <div class="ph-form-group"><label>البريد</label><input type="email" id="phSEmail" value="${escapeHtml(tenant.email || '')}"></div>
          <div class="ph-form-group full"><label>العنوان</label><input type="text" id="phSAddress" value="${escapeHtml(tenant.address || '')}"></div>
        </div>
        <button class="btn btn-primary" onclick="phSaveSettings()"><i class="fas fa-save"></i> حفظ التغييرات</button>
      </div>
    </div>
  `;
}

function phSaveSettings() {
  const tenants = DB.getTenants();
  const idx = tenants.findIndex(t => t.id === PH.tenantId);
  if (idx < 0) return;
  tenants[idx].name = document.getElementById('phSName').value.trim();
  tenants[idx].phone = document.getElementById('phSPhone').value.trim();
  tenants[idx].email = document.getElementById('phSEmail').value.trim();
  tenants[idx].address = document.getElementById('phSAddress').value.trim();
  DB.setTenants(tenants);
  document.getElementById('phBrandName').textContent = tenants[idx].name;
  showToast('✅ تم الحفظ', 'success');
}

/* ============================================
   43. PHARMACY EXPORTS
   ============================================ */
function phExportExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getProducts().map(p => ({
    'الاسم': p.name, 'المادة الفعالة': p.active || '', 'الباركود': p.barcode || '',
    'الفئة': p.category, 'السعر': p.price, 'التكلفة': p.cost || '',
    'المخزون': p.stock, 'الحد الأدنى': p.minStock
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
  XLSX.writeFile(wb, `products-${Date.now()}.xlsx`);
  showToast('تم تصدير Excel');
}

function phExportOrdersExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getOrders().map(o => ({
    'رقم الطلب': o.id, 'العميل': o.customerName, 'عدد المنتجات': o.items.length,
    'الإجمالي': o.total, 'طريقة الدفع': o.paymentMethod, 'التاريخ': formatDate(o.createdAt)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'الطلبات');
  XLSX.writeFile(wb, `orders-${Date.now()}.xlsx`);
  showToast('تم تصدير Excel');
}

function phExportCustomersExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getCustomers().map(c => ({
    'الاسم': c.name, 'الهاتف': c.phone, 'البريد': c.email || '',
    'العنوان': c.address || '', 'إجمالي الشراء': c.totalSpent || 0, 'عدد الطلبات': c.orders || 0
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  XLSX.writeFile(wb, `customers-${Date.now()}.xlsx`);
  showToast('تم تصدير Excel');
}

function phExportPDF() {
  if (typeof html2pdf === 'undefined') return;
  const tenant = PH.getTenant();
  const products = PH.getProducts();
  const orders = PH.getOrders();
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  const html = `<div style="font-family:Cairo,sans-serif;padding:40px;direction:rtl;background:#fff">
    <div style="text-align:center;border-bottom:3px solid #00b884;padding-bottom:20px;margin-bottom:30px">
      <h1 style="color:#00b884;margin:0;font-size:2rem">${escapeHtml(tenant.name)}</h1>
      <p style="color:#64748b;margin-top:8px">تقرير صيدلية</p>
    </div>
    <h2 style="color:#00b884">📊 ملخص</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:.9rem">
      <tr style="background:#f0fdf9"><td style="padding:12px;border:1px solid #e2e8f0"><strong>المنتجات</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${products.length}</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>الطلبات</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${orders.length}</td></tr>
      <tr><td style="padding:12px;border:1px solid #e2e8f0"><strong>الإيرادات</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${totalRevenue.toLocaleString('ar-EG')} ج</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>العملاء</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${PH.getCustomers().length}</td></tr>
    </table>
    <h2 style="color:#00b884">📦 المنتجات</h2>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="background:#00b884;color:#fff"><th style="padding:10px">الاسم</th><th style="padding:10px">الفئة</th><th style="padding:10px">السعر</th><th style="padding:10px">المخزون</th></tr></thead>
      <tbody>${products.slice(0, 40).map((p, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(p.name)}</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(p.category)}</td><td style="padding:8px;border:1px solid #e2e8f0">${p.price} ج</td><td style="padding:8px;border:1px solid #e2e8f0">${p.stock}</td></tr>`).join('')}</tbody>
    </table>
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;color:#64748b;font-size:.85rem"><p>© 2026 ${escapeHtml(tenant.name)}</p></div>
  </div>`;

  showToast('جاري إنشاء PDF...');
  html2pdf().set({
    margin: 0, filename: `report-${tenant.name}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(html).save().then(() => showToast('✅ تم التحميل'));
}

function phCloseModal() {
  document.getElementById('phModalOverlay').classList.remove('open');
  document.getElementById('phModalBox').innerHTML = '';
  phTempImageBase64 = '';
}

/* ============================================
   44. PAYMENT MODAL
   ============================================ */
let selectedPayBrand = 'visa';

function phOpenPaymentModal(plan, amount) {
  const modal = document.getElementById('phModalBox');
  modal.classList.add('pay-modal');
  modal.innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-credit-card"></i> الدفع الآمن</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body" id="payBody">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:.85rem;color:var(--text-muted);font-weight:700;letter-spacing:1px;text-transform:uppercase">تفعيل باقة</div>
        <h2 style="font-size:2rem;font-weight:900;color:var(--primary);margin:4px 0">${plan.toUpperCase()}</h2>
        <div style="font-size:1.1rem;font-weight:800">${amount.toLocaleString('ar-EG')} ج.م / شهرياً</div>
      </div>
      <div class="card-preview">
        <div class="chip"></div>
        <div class="card-num" id="cardNumDisplay">•••• •••• •••• ••••</div>
        <div class="card-info">
          <div><span>Card Holder</span><strong id="cardNameDisplay">YOUR NAME</strong></div>
          <div><span>Expires</span><strong id="cardExpDisplay">MM/YY</strong></div>
        </div>
      </div>
      <div class="pay-brand-row">
        <div class="pay-brand selected" data-brand="visa" onclick="selectPayBrand('visa')"><i class="fab fa-cc-visa" style="color:#1a1f71"></i> Visa</div>
        <div class="pay-brand" data-brand="mastercard" onclick="selectPayBrand('mastercard')"><i class="fab fa-cc-mastercard" style="color:#eb001b"></i> Mastercard</div>
        <div class="pay-brand" data-brand="paymob" onclick="selectPayBrand('paymob')"><i class="fas fa-mobile-alt" style="color:#00b884"></i> Paymob</div>
      </div>
      <form onsubmit="processPayment(event, '${plan}', ${amount})">
        <div class="ph-form-group"><label>رقم البطاقة <span class="req">*</span></label><input type="text" id="payCardNum" required placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNum(this); updateCardDisplay()"></div>
        <div class="ph-form-group"><label>اسم حامل البطاقة <span class="req">*</span></label><input type="text" id="payCardName" required placeholder="AHMED MOHAMED" oninput="updateCardDisplay()"></div>
        <div class="ph-form-grid">
          <div class="ph-form-group"><label>تاريخ الانتهاء <span class="req">*</span></label><input type="text" id="payCardExp" required placeholder="MM/YY" maxlength="5" oninput="formatExp(this); updateCardDisplay()"></div>
          <div class="ph-form-group"><label>CVV <span class="req">*</span></label><input type="text" id="payCardCvv" required placeholder="123" maxlength="4" oninput="this.value=this.value.replace(/\\D/g,'')"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="payBtn"><i class="fas fa-lock"></i> ادفع ${amount.toLocaleString('ar-EG')} ج.م</button>
        <p style="text-align:center;font-size:.75rem;color:var(--text-muted);margin-top:12px"><i class="fas fa-shield-alt" style="color:var(--success)"></i> الدفع آمن ومشفر</p>
      </form>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function selectPayBrand(brand) {
  selectedPayBrand = brand;
  document.querySelectorAll('.pay-brand').forEach(b => b.classList.toggle('selected', b.dataset.brand === brand));
}

function formatCardNum(el) {
  let v = el.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
  el.value = v.replace(/(\d{4})(?=\d)/g, '$1 ');
}

function formatExp(el) {
  let v = el.value.replace(/\D/g, '').slice(0, 4);
  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
  el.value = v;
}

function updateCardDisplay() {
  const num = document.getElementById('payCardNum')?.value || '';
  const name = document.getElementById('payCardName')?.value || '';
  const exp = document.getElementById('payCardExp')?.value || '';
  const nd = document.getElementById('cardNumDisplay');
  const nmd = document.getElementById('cardNameDisplay');
  const ed = document.getElementById('cardExpDisplay');
  if (nd) nd.textContent = num || '•••• •••• •••• ••••';
  if (nmd) nmd.textContent = (name || 'YOUR NAME').toUpperCase();
  if (ed) ed.textContent = exp || 'MM/YY';
}

function processPayment(e, plan, amount) {
  e.preventDefault();
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري معالجة الدفع...';

  setTimeout(() => {
    DB.addSubscription({
      tenantId: PH.tenantId, plan, amount, type: 'payment',
      status: 'paid', method: selectedPayBrand
    });

    const tenants = DB.getTenants();
    const idx = tenants.findIndex(t => t.id === PH.tenantId);
    if (idx >= 0) {
      tenants[idx].plan = plan;
      tenants[idx].status = 'active';
      tenants[idx].subscriptionEndsAt = new Date(Date.now() + 30 * 86400000).toISOString();
      DB.setTenants(tenants);
    }

    document.getElementById('payBody').innerHTML = `
      <div class="pay-success">
        <div class="pay-success-icon"><i class="fas fa-check"></i></div>
        <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:8px">🎉 تم الدفع بنجاح!</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">تم تفعيل باقة ${plan.toUpperCase()} لمدة 30 يوم</p>
        <div style="background:var(--bg-alt);padding:16px;border-radius:12px;margin-bottom:20px;text-align:start;font-size:.85rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>المبلغ:</span><strong>${amount.toLocaleString('ar-EG')} ج.م</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>طريقة الدفع:</span><strong>${selectedPayBrand.toUpperCase()}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>رقم العملية:</span><strong>TXN-${Date.now().toString().slice(-8)}</strong></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="phCloseModal(); phRenderSubscription();"><i class="fas fa-check"></i> رجوع لصيدليتي</button>
      </div>
    `;
    showToast('✅ تم تفعيل الباقة!', 'success');
    playSound('success');
    pushNotification('تم الدفع بنجاح', `باقة ${plan.toUpperCase()} مفعلة الآن`);
  }, 2200);
}

/* ============================================
   45. API KEYS
   ============================================ */
function phRenderAPIKeys() {
  const tenant = PH.getTenant();
  let apiKey = tenant.apiKey;
  let apiSecret = tenant.apiSecret;

  if (!apiKey) {
    apiKey = 'pk_' + generateRandomKey(32);
    apiSecret = 'sk_' + generateRandomKey(40);
    const tenants = DB.getTenants();
    const idx = tenants.findIndex(t => t.id === PH.tenantId);
    if (idx >= 0) {
      tenants[idx].apiKey = apiKey;
      tenants[idx].apiSecret = apiSecret;
      DB.setTenants(tenants);
    }
  }

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-code"></i> API & التكاملات</h1><p>اربط صيدليتك مع أي نظام خارجي</p></div>
      <button class="btn btn-outline btn-sm" onclick="phGenerateNewAPIKey()"><i class="fas fa-sync"></i> تجديد</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-key"></i> مفاتيح API</h3></div>
      <div class="ph-modal-body">
        <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:16px">استخدم هذه المفاتيح للوصول لبيانات صيدليتك برمجياً.</p>
        <label style="display:block;font-size:.82rem;font-weight:800;margin-bottom:6px">Public Key</label>
        <div class="api-key-display"><span>${apiKey}</span><button onclick="copyToClipboard('${apiKey}')"><i class="fas fa-copy"></i> نسخ</button></div>
        <label style="display:block;font-size:.82rem;font-weight:800;margin:16px 0 6px">Secret Key</label>
        <div class="api-key-display"><span>${'•'.repeat(40)}</span><button onclick="showSecretKey('${apiSecret}')"><i class="fas fa-eye"></i> إظهار</button></div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-plug"></i> REST API Endpoints</h3></div>
      <div class="ph-modal-body">
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/products</span><span class="api-desc">جميع منتجاتك</span></div>
        <div class="api-endpoint"><span class="api-method post">POST</span><span class="api-path">/api/v1/products</span><span class="api-desc">إضافة منتج</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/orders</span><span class="api-desc">جميع الطلبات</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/customers</span><span class="api-desc">جميع العملاء</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/stats/daily</span><span class="api-desc">إحصائيات اليوم</span></div>
      </div>
    </div>
  `;
}

function showSecretKey(key) {
  if (confirm('تحذير: مفتاح سري. متأكد؟\n\n' + key.slice(0, 20) + '...')) copyToClipboard(key);
}

function phGenerateNewAPIKey() {
  if (!confirm('⚠️ تجديد المفاتيح سيعطل التكاملات الحالية. متأكد؟')) return;
  const tenants = DB.getTenants();
  const idx = tenants.findIndex(t => t.id === PH.tenantId);
  if (idx >= 0) {
    tenants[idx].apiKey = 'pk_' + generateRandomKey(32);
    tenants[idx].apiSecret = 'sk_' + generateRandomKey(40);
    DB.setTenants(tenants);
  }
  phRenderAPIKeys();
  showToast('✅ تم التجديد', 'success');
}

/* ============================================
   46. LIVE NOTIFICATIONS
   ============================================ */
let notifPermission = 'default';

function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') { notifPermission = 'granted'; return; }
  if (Notification.permission === 'denied') { notifPermission = 'denied'; return; }
  Notification.requestPermission().then(p => {
    notifPermission = p;
    if (p === 'granted') showToast('✅ إشعارات المتصفح مفعلة', 'success');
  });
}

function pushNotification(title, body) {
  showLiveAlert(title, body);
  if (notifPermission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="%2300b884"/><text x="50" y="68" font-family="Arial" font-size="52" font-weight="900" fill="white" text-anchor="middle">PC</text></svg>',
        tag: 'pharmacloud-' + Date.now()
      });
    } catch (e) {}
  }
  playSound('notification');
}

function showLiveAlert(title, body) {
  const container = document.getElementById('liveAlertsContainer');
  if (!container) return;
  const alert = document.createElement('div');
  alert.className = 'live-alert';
  alert.style.pointerEvents = 'auto';
  alert.innerHTML = `
    <div class="live-alert-icon" style="background:var(--gradient-brand)"><i class="fas fa-bell"></i></div>
    <div class="live-alert-body"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(body)}</p></div>
    <button class="live-alert-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;
  container.appendChild(alert);
  setTimeout(() => {
    alert.classList.add('closing');
    setTimeout(() => alert.remove(), 300);
  }, 5000);
}

/* ============================================
   AUDIO ENGINE — User-gesture aware
   ============================================ */
let audioCtx = null;
let _audioUnlocked = false;

// أول تفاعل من المستخدم → نفتح الـ AudioContext
function _unlockAudio() {
  if (_audioUnlocked) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    _audioUnlocked = true;
    console.log('[Audio] 🔊 Audio context unlocked');
  } catch (e) {
    console.warn('[Audio] Unlock failed:', e.message);
  }
}

// ربط الـ unlock بأول تفاعل
['click', 'touchstart', 'keydown'].forEach(function(evt) {
  document.addEventListener(evt, _unlockAudio, { once: true, passive: true });
});

/* ============================================
   PLAY SOUND
   ============================================ */
function playSound(type = 'notification') {
  try {
    // لو مفيش تفاعل من المستخدم → متعملش صوت (يخالف قوانين المتصفح)
    if (!_audioUnlocked) {
      return;
    }

    // لو الـ context مش موجود
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // لو الـ context في حالة suspended → حاول ترجعه
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      return;
    }

    // لو الـ context اتقفل لأي سبب
    if (audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const now = audioCtx.currentTime;

    // نغمات حسب النوع
    const sounds = {
      notification: [523.25, 659.25],           // C5 → E5
      success: [523.25, 659.25, 783.99],         // C5 → E5 → G5
      error: [330, 220],                         // E4 → A3
      warning: [440, 349.23],                    // A4 → F4
      click: [800],                              // C6 قصيرة
      cash: [659.25, 783.99, 1046.5]             // E5 → G5 → C6 (صوت الكاشير)
    };

    const freqs = sounds[type] || sounds.notification;

    freqs.forEach((f, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      const t = now + i * 0.12;

      // Envelope ناعم
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) {
    // فشل صامت — الصوت مش ضروري
    console.warn('[Audio] playSound error:', e.message);
  }
}
/* ============================================
   47. AI ASSISTANT
   ============================================ */
let aiOpen = false;

function aiToggleChat() {
  aiOpen = !aiOpen;
  document.getElementById('aiChat').classList.toggle('open', aiOpen);
  if (aiOpen) document.getElementById('aiInput')?.focus();
}

function aiSendSuggestion(text) {
  document.getElementById('aiInput').value = text;
  aiSend();
}

function aiSend() {
  const input = document.getElementById('aiInput');
  const message = input.value.trim();
  if (!message) return;
  aiAddMessage('user', message);
  input.value = '';
  const typing = aiShowTyping();
  setTimeout(() => {
    typing.remove();
    const response = aiGenerateResponse(message);
    aiAddMessage('bot', response);
  }, 1200 + Math.random() * 800);
}

function aiAddMessage(type, text) {
  const body = document.getElementById('aiBody');
  const msg = document.createElement('div');
  msg.className = 'ai-msg ' + type;
  msg.innerHTML = `
    <div class="ai-msg-avatar"><i class="fas fa-${type === 'bot' ? 'robot' : 'user'}"></i></div>
    <div class="ai-msg-bubble">${escapeHtml(text).replace(/\n/g, '<br>')}</div>
  `;
  body.appendChild(msg);
  body.scrollTop = body.scrollHeight;
}

function aiShowTyping() {
  const body = document.getElementById('aiBody');
  const typing = document.createElement('div');
  typing.className = 'ai-msg bot';
  typing.innerHTML = `
    <div class="ai-msg-avatar"><i class="fas fa-robot"></i></div>
    <div class="ai-msg-bubble ai-typing"><span></span><span></span><span></span></div>
  `;
  body.appendChild(typing);
  body.scrollTop = body.scrollHeight;
  return typing;
}

function aiGenerateResponse(q) {
  q = q.toLowerCase();
  const products = PH.getProducts();
  const orders = PH.getOrders();
  const customers = PH.getCustomers();

  if (q.includes('مبيعات') || q.includes('sales') || q.includes('اليوم')) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const total = todayOrders.reduce((s, o) => s + o.total, 0);
    return `📊 مبيعات اليوم:\n\n• عدد الطلبات: ${todayOrders.length}\n• الإجمالي: ${total.toLocaleString('ar-EG')} ج.م\n• متوسط الطلب: ${todayOrders.length ? Math.round(total / todayOrders.length) : 0} ج.م\n\n${todayOrders.length > 5 ? '🎉 أداء ممتاز!' : '💪 استمر!'}`;
  }
  if (q.includes('خلصت') || q.includes('نواقص') || q.includes('stock') || q.includes('مخزون')) {
    const low = products.filter(p => p.stock <= p.minStock);
    if (low.length === 0) return '✨ ممتاز! كل المنتجات متوفرة.';
    return `⚠️ ${low.length} منتجات محتاجة إعادة طلب:\n\n${low.slice(0, 5).map(p => `• ${p.name} (${p.stock} متبقي)`).join('\n')}\n\n${low.length > 5 ? `و ${low.length - 5} منتجات أخرى...\n\n` : ''}أنصحك تعمل طلب شراء قريب.`;
  }
  if (q.includes('أفضل') || q.includes('الأكثر') || q.includes('top')) {
    const sales = {};
    orders.forEach(o => o.items.forEach(it => { sales[it.id] = (sales[it.id] || 0) + it.qty; }));
    const top = Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length === 0) return 'لسه مفيش بيانات كافية.';
    return `🏆 الأكثر مبيعاً:\n\n${top.map((t, i) => `${i + 1}. ${products.find(p => p.id === t[0])?.name || 'منتج'} — ${t[1]} طلب`).join('\n')}`;
  }
  if (q.includes('عميل') || q.includes('customer')) {
    const top = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0];
    if (!top) return 'لسه مفيش بيانات عملاء.';
    return `👤 أكبر عميل:\n\n• الاسم: ${top.name}\n• الهاتف: ${top.phone}\n• إجمالي الشراء: ${(top.totalSpent || 0).toLocaleString('ar-EG')} ج.م\n• عدد الطلبات: ${top.orders || 0}\n\n💡 نصيحة: ابعتله عرض خاص!`;
  }
  if (q.includes('إيراد') || q.includes('revenue') || q.includes('ربح')) {
    const total = orders.reduce((s, o) => s + o.total, 0);
    return `💰 إجمالي الإيرادات:\n\n${total.toLocaleString('ar-EG')} ج.م من ${orders.length} طلب\n• متوسط الطلب: ${orders.length ? Math.round(total / orders.length) : 0} ج.م`;
  }
  if (q.includes('منتج') || q.includes('products')) {
    return `📦 عندك ${products.length} منتج\n\n• متوفرة: ${products.filter(p => p.stock > 0).length}\n• نفذت: ${products.filter(p => p.stock === 0).length}`;
  }
  if (q.includes('ساعدني') || q.includes('help') || q.includes('مساعدة')) {
    return 'أقدر أساعدك في:\n\n📊 مبيعاتك\n⚠️ نواقص المخزون\n🏆 الأكثر مبيعاً\n👤 أكبر العملاء\n💰 الإيرادات\n📦 المنتجات';
  }
  return 'معلش، مش فاهم 🤔\n\nجرب تسألني عن:\n• "مبيعاتي اليوم"\n• "المنتجات اللي خلصت"\n• "أفضل المنتجات"\n• "أكبر عميل"';
}

/* ============================================
   48. BRANCHES
   ============================================ */
function phUpdateBranchSelector() {
  const sel = document.getElementById('phBranchSelector');
  if (!sel) return;
  const branches = PH.getBranches();
  const current = PH.getCurrentBranch();
  const currentBranch = current === 'main'
    ? { id: 'main', name: 'الفرع الرئيسي' }
    : branches.find(b => b.id === current) || { id: 'main', name: 'الفرع الرئيسي' };
  sel.innerHTML = `
    <i class="fas fa-store"></i>
    <div class="branch-selector-info">
      <span>الفرع الحالي</span>
      <strong>${escapeHtml(currentBranch.name)}</strong>
    </div>
    <i class="fas fa-chevron-down" style="font-size:.75rem"></i>
  `;
}

function phOpenBranchSwitcher() {
  const branches = [{ id: 'main', name: 'الفرع الرئيسي' }, ...PH.getBranches()];
  const current = PH.getCurrentBranch();
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-store"></i> اختيار الفرع</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:14px">كل فرع له بيانات مستقلة (منتجات، طلبات، عملاء).</p>
      <div style="display:grid;gap:12px">
        ${branches.map(b => `
          <div class="branch-card ${b.id === current ? 'active' : ''}" onclick="phSetCurrentBranch('${b.id}'); phCloseModal();">
            <h4><i class="fas fa-store"></i> ${escapeHtml(b.name)}</h4>
            ${b.address ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(b.address)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="phOpenAddBranch()"><i class="fas fa-plus"></i> إضافة فرع جديد</button>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phSetCurrentBranch(branchId) {
  PH.setCurrentBranch(branchId);
  phUpdateBranchSelector();
  phUpdateBadges();
  phRenderPage(phCurrentPage);
  const branchName = branchId === 'main'
    ? 'الفرع الرئيسي'
    : (PH.getBranches().find(b => b.id === branchId)?.name || 'فرع');
  showToast(`✅ تم التبديل إلى "${branchName}"`, 'success');
}

function phOpenAddBranch() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-store"></i> فرع جديد</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveBranch(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>اسم الفرع <span class="req">*</span></label><input type="text" id="brName" required></div>
        <div class="ph-form-group"><label>العنوان</label><input type="text" id="brAddress"></div>
        <div class="ph-form-group"><label>الهاتف</label><input type="tel" id="brPhone"></div>
        <div class="ph-form-group"><label>المدير</label><input type="text" id="brManager"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> حفظ</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phSaveBranch(e) {
  e.preventDefault();
  const branches = PH.getBranches();
  branches.push({
    id: 'b_' + Date.now(),
    name: document.getElementById('brName').value.trim(),
    address: document.getElementById('brAddress').value.trim(),
    phone: document.getElementById('brPhone').value.trim(),
    manager: document.getElementById('brManager').value.trim(),
    createdAt: new Date().toISOString()
  });
  PH.setBranches(branches);
  phCloseModal();
  phUpdateBranchSelector();
  showToast('✅ تمت إضافة الفرع', 'success');
  if (phCurrentPage === 'branches') phRenderBranches();
}

function phRenderBranches() {
  const branches = [{ id: 'main', name: 'الفرع الرئيسي', isMain: true }, ...PH.getBranches()];
  const current = PH.getCurrentBranch();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-store"></i> الفروع</h1><p>${branches.length} فرع — كل فرع له بيانات مستقلة</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddBranch()"><i class="fas fa-plus"></i> فرع جديد</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
      ${branches.map(b => {
        const products = PH.getBranchData(b.id, 'products');
        const orders = PH.getBranchData(b.id, 'orders');
        const customers = PH.getBranchData(b.id, 'customers');
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
        return `
          <div class="branch-card ${b.id === current ? 'active' : ''}" onclick="phSetCurrentBranch('${b.id}')">
            <h4><i class="fas fa-store"></i> ${escapeHtml(b.name)}</h4>
            ${b.address ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(b.address)}</p>` : ''}
            ${b.phone ? `<p><i class="fas fa-phone"></i> ${escapeHtml(b.phone)}</p>` : ''}
            <div class="branch-card-stats">
              <div class="branch-card-stat"><strong>${products.length}</strong><span>منتج</span></div>
              <div class="branch-card-stat"><strong>${customers.length}</strong><span>عميل</span></div>
              <div class="branch-card-stat"><strong>${todayOrders.length}</strong><span>طلب اليوم</span></div>
              <div class="branch-card-stat"><strong>${todayRevenue.toLocaleString('ar-EG')}</strong><span>إيراد اليوم</span></div>
            </div>
            ${!b.isMain ? `<button class="btn btn-outline btn-sm" style="width:100%;margin-top:12px" onclick="event.stopPropagation(); phDeleteBranch('${b.id}')"><i class="fas fa-trash"></i> حذف</button>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function phDeleteBranch(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'حذف الفرع',
    message: 'سيتم حذف الفرع وكل بياناته نهائياً.\n\nهل أنت متأكد؟',
    confirmText: 'نعم، احذف',
    cancelText: 'إلغاء'
  }).then(function(ok) {
    if (!ok) return;
    const tenantId = PH.tenantId;
    ['products', 'orders', 'customers', 'attendance', 'prescriptions'].forEach(function(key) {
      localStorage.removeItem('pc_' + tenantId + '_' + key + '_branch_' + id);
    });
    PH.setBranches(PH.getBranches().filter(b => b.id !== id));
    if (PH.getCurrentBranch() === id) phSetCurrentBranch('main');
    phRenderBranches();
    showToast('تم الحذف', 'warning');
  });
}

/* ============================================
   49. BI DASHBOARD
   ============================================ */
function phRenderBI() {
  const orders = PH.getOrders();
  const products = PH.getProducts();
  const customers = PH.getCustomers();
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const avgOrder = orders.length ? totalRevenue / orders.length : 0;
  const totalStockValue = products.reduce((s, p) => s + (p.stock * (p.cost || 0)), 0);

  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-chart-bar"></i> لوحة BI المتقدمة</h1><p>تحليلات عميقة ورؤى ذكية</p></div>
      <button class="btn btn-outline btn-sm" onclick="phExportPDF()"><i class="fas fa-file-pdf"></i> تصدير</button>
    </div>
    <div class="bi-grid">
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-coins"></i> إجمالي الإيرادات</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 18.4%</div>
        </div>
        <div class="bi-value-big">${totalRevenue.toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">ج.م من ${orders.length} طلب</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-shopping-basket"></i> متوسط الطلب</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 6.2%</div>
        </div>
        <div class="bi-value-big">${Math.round(avgOrder).toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">ج.م لكل طلب</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-boxes"></i> قيمة المخزون</div>
          <div class="bi-value-change down"><i class="fas fa-arrow-down"></i> 2.1%</div>
        </div>
        <div class="bi-value-big">${totalStockValue.toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">ج.م في المخزون</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-users"></i> عملاء</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 24%</div>
        </div>
        <div class="bi-value-big">${customers.length}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">إجمالي العملاء</div>
      </div>
    </div>
    <div class="bi-grid" style="grid-template-columns:2fr 1fr">
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-chart-line"></i> اتجاه الإيرادات</div>
          <div class="bi-period">
            <button class="active" onclick="phChangeBIPeriod(this, 7)">7 أيام</button>
            <button onclick="phChangeBIPeriod(this, 30)">30 يوم</button>
            <button onclick="phChangeBIPeriod(this, 90)">3 شهور</button>
          </div>
        </div>
        <div class="bi-chart"><canvas id="biRevenueChart"></canvas></div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-fire"></i> الأكثر مبيعاً</div></div>
        <div class="bi-top-list">
          ${(() => {
            const sales = {};
            orders.forEach(o => o.items.forEach(it => { sales[it.id] = (sales[it.id] || 0) + it.qty; }));
            const top = Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return top.map((t, i) => {
              const p = products.find(x => x.id === t[0]);
              return `<div class="bi-top-item"><div class="bi-top-rank">${i + 1}</div><div class="bi-top-info"><strong>${escapeHtml(p?.name || 'منتج')}</strong><span>${p?.category || ''}</span></div><div class="bi-top-value">${t[1]}</div></div>`;
            }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">لا توجد بيانات</div>';
          })()}
        </div>
      </div>
    </div>
    <div class="bi-grid" style="grid-template-columns:1fr 1fr">
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-clock"></i> أوقات الذروة</div></div>
        <div class="bi-chart"><canvas id="biPeakChart"></canvas></div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-th-large"></i> أداء الفئات</div></div>
        <div class="bi-chart"><canvas id="biCatPerfChart"></canvas></div>
      </div>
    </div>
    <div class="bi-widget" style="margin-top:20px">
      <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-calendar-alt"></i> خريطة المبيعات الأسبوعية</div></div>
      <div class="bi-heatmap" id="biHeatmap"></div>
    </div>
  `;

  setTimeout(() => {
    phInitBIRevenueChart();
    phInitBIPeakChart();
    phInitBICatChart();
    phRenderHeatmap();
  }, 100);
}

function phInitBIRevenueChart() {
  const ctx = document.getElementById('biRevenueChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (phCharts.biRev) phCharts.biRev.destroy();
  const orders = PH.getOrders();
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short' }));
    data.push(orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0));
  }
  phCharts.biRev = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: '#00b884', backgroundColor: 'rgba(0,184,132,.1)', borderWidth: 3, fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#00b884', pointBorderColor: '#fff', pointBorderWidth: 3 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } }, x: { grid: { display: false } } } }
  });
}

function phChangeBIPeriod(btn, days) {
  document.querySelectorAll('.bi-period button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  if (!phCharts.biRev) return;
  const orders = PH.getOrders();
  const labels = [], data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (days === 7) labels.push(d.toLocaleDateString('ar-EG', { weekday: 'short' }));
    else labels.push(d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }));
    data.push(orders.filter(o => new Date(o.createdAt).toDateString() === d.toDateString()).reduce((s, o) => s + o.total, 0));
  }
  phCharts.biRev.data.labels = labels;
  phCharts.biRev.data.datasets[0].data = data;
  phCharts.biRev.update();
}

function phInitBIPeakChart() {
  const ctx = document.getElementById('biPeakChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (phCharts.biPeak) phCharts.biPeak.destroy();
  const orders = PH.getOrders();
  const hours = Array.from({ length: 12 }, (_, i) => i + 9);
  const data = hours.map(h => orders.filter(o => new Date(o.createdAt).getHours() === h).length);
  phCharts.biPeak = new Chart(ctx, {
    type: 'bar',
    data: { labels: hours.map(h => h + ':00'), datasets: [{ data, backgroundColor: 'rgba(0,184,132,.7)', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,.05)' } }, x: { grid: { display: false } } } }
  });
}

function phInitBICatChart() {
  const ctx = document.getElementById('biCatPerfChart');
  if (!ctx || typeof Chart === 'undefined') return;
  if (phCharts.biCat) phCharts.biCat.destroy();
  const products = PH.getProducts();
  const orders = PH.getOrders();
  const catSales = {};
  orders.forEach(o => o.items.forEach(it => {
    const p = products.find(x => x.id === it.id);
    if (p) catSales[p.category] = (catSales[p.category] || 0) + it.qty;
  }));
  phCharts.biCat = new Chart(ctx, {
    type: 'polarArea',
    data: { labels: Object.keys(catSales), datasets: [{ data: Object.values(catSales), backgroundColor: ['rgba(0,184,132,.7)', 'rgba(30,136,229,.7)', 'rgba(255,107,53,.7)', 'rgba(124,58,237,.7)', 'rgba(245,158,11,.7)', 'rgba(6,182,212,.7)'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Cairo', size: 11 }, padding: 8, usePointStyle: true, boxWidth: 10 } } } }
  });
}

function phRenderHeatmap() {
  const heatmap = document.getElementById('biHeatmap');
  if (!heatmap) return;
  const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const orders = PH.getOrders();
  const data = days.map((d, i) => orders.filter(o => new Date(o.createdAt).getDay() === i).length);
  const max = Math.max(...data, 1);
  heatmap.innerHTML = days.map((day, i) => {
    const intensity = data[i] / max;
    const colors = ['rgba(0,184,132,.15)', 'rgba(0,184,132,.35)', 'rgba(0,184,132,.55)', 'rgba(0,184,132,.75)', 'rgba(0,184,132,.95)'];
    const color = colors[Math.min(4, Math.floor(intensity * 5))];
    return `<div class="bi-heatmap-cell" style="background:${color}" title="${day}: ${data[i]} طلب"></div>`;
  }).join('');
}

/* ============================================
   50. ONLINE ORDERS
   ============================================ */
function phRenderOnlineOrders() {
  const publicUrl = `${window.location.origin}${window.location.pathname}?order=${PH.tenantId}`;
  const onlineOrders = PH.getOrders().filter(o => o.source === 'online');
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-globe"></i> الطلبات الأونلاين</h1><p>استقبل طلبات من عملائك مباشرة</p></div>
    </div>
    <div class="online-orders-banner">
      <i class="fas fa-store big-icon"></i>
      <div class="online-orders-banner-body">
        <h3>شارك رابط صيدليتك مع عملائك</h3>
        <p>العملاء يقدروا يطلبوا أدويتهم مباشرة، والطلبات هتوصلك تلقائياً</p>
        <div class="online-orders-link">
          <i class="fas fa-link"></i>
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${publicUrl}</span>
          <button onclick="copyToClipboard('${publicUrl}')"><i class="fas fa-copy"></i> نسخ</button>
        </div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-globe"></i> الطلبات الأونلاين</h3>
        <span class="ph-badge ph-badge-orange">${onlineOrders.length} طلب</span>
      </div>
      <div style="overflow-x:auto">
        ${onlineOrders.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>رقم</th><th>العميل</th><th>الهاتف</th><th>الإجمالي</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody>${onlineOrders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${escapeHtml(o.customerPhone || '—')}</td>
                <td><strong style="color:var(--primary)">${o.total} ج</strong></td>
                <td><span class="ph-badge ph-badge-orange">${o.status === 'pending' ? 'قيد الانتظار' : 'مكتمل'}</span></td>
                <td>${formatDate(o.createdAt)}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-inbox"></i><h4>لا توجد طلبات أونلاين بعد</h4></div>'}
      </div>
    </div>
  `;
}

/* ============================================
   51. PUBLIC ORDER PAGE
   ============================================ */
let publicTenant = null;
let publicCart = [];

function publicOpen(tenantId) {
  const tenant = DB.getTenants().find(t => t.id === tenantId);
  if (!tenant) {
    showToast('الصيدلية غير موجودة', 'error');
    return;
  }
  publicTenant = tenant;
  document.getElementById('publicPharmacyName').textContent = tenant.name;
  document.getElementById('publicOrderPage').classList.add('open');
  document.body.classList.add('public-mode');
  document.body.style.overflow = 'hidden';
  publicRenderProducts();
}

function publicClose() {
  document.getElementById('publicOrderPage').classList.remove('open');
  document.body.classList.remove('public-mode');
  document.body.style.overflow = '';
  publicTenant = null;
  publicCart = [];
}

function publicRenderProducts() {
  if (!publicTenant) return;
  const products = DB.getTenantData(publicTenant.id, 'products');
  const grid = document.getElementById('publicProducts');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="ph-pos-card" onclick="publicAddToCart('${p.id}')">
      <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Product'">
      <h4>${escapeHtml(p.name)}</h4>
      <div class="price">${p.price} ج</div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">${p.stock > 0 ? 'متوفر' : 'نفذ'}</div>
    </div>
  `).join('');
}

function publicFilterProducts(q) {
  if (!publicTenant) return;
  const products = DB.getTenantData(publicTenant.id, 'products').filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
  );
  const grid = document.getElementById('publicProducts');
  if (!grid) return;
  grid.innerHTML = products.map(p => `
    <div class="ph-pos-card" onclick="publicAddToCart('${p.id}')">
      <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Product'">
      <h4>${escapeHtml(p.name)}</h4>
      <div class="price">${p.price} ج</div>
    </div>
  `).join('');
}

function publicAddToCart(id) {
  if (!publicTenant) return;
  const product = DB.getTenantData(publicTenant.id, 'products').find(p => p.id === id);
  if (!product) return;
  if (product.stock <= 0) { showToast('غير متوفر', 'warning'); return; }
  const existing = publicCart.find(c => c.id === id);
  if (existing) existing.qty++;
  else publicCart.push({ id, name: product.name, price: product.price, qty: 1 });
  const total = publicCart.reduce((s, c) => s + c.price * c.qty, 0);
  const sticky = document.getElementById('publicCartSticky');
  document.getElementById('publicCartTotal').textContent = total.toLocaleString('ar-EG') + ' ج';
  sticky.style.display = 'flex';
  showToast(`✅ تمت إضافة ${product.name}`, 'success');
}

function publicCheckout() {
  if (publicCart.length === 0) return;
  const name = prompt('اسمك:'); if (!name) return;
  const phone = prompt('رقم هاتفك:'); if (!phone) return;
  const address = prompt('العنوان بالتفصيل:'); if (!address) return;
  const total = publicCart.reduce((s, c) => s + c.price * c.qty, 0);
  const order = {
    id: 'ON-' + Date.now().toString().slice(-6),
    customerId: null,
    customerName: name, customerPhone: phone, customerAddress: address,
    items: publicCart.map(c => ({ id: c.id, name: c.name, price: c.price, qty: c.qty })),
    total, paymentMethod: 'online', status: 'pending', source: 'online',
    createdAt: new Date().toISOString()
  };
  const orders = DB.getTenantData(publicTenant.id, 'orders');
  orders.unshift(order);
  DB.setTenantData(publicTenant.id, 'orders', orders);
  showToast('✅ تم إرسال طلبك! هيتواصلوا معاك قريب', 'success');
  publicCart = [];
  document.getElementById('publicCartSticky').style.display = 'none';
  setTimeout(publicClose, 1500);
}

/* ============================================
   52. CROSS-TAB SYNC
   ============================================ */
window.addEventListener('storage', (e) => {
  if (!e.key || !e.key.startsWith('pc_')) return;
  const session = DB.getSession();
  if (!session) return;
  if (e.key === 'pc_session' && !e.newValue) {
    window.location.reload();
    return;
  }
  if (e.key === 'pc_tenants' || e.key === 'pc_users') {
    if (session.role === 'superadmin' && document.getElementById('adminApp')?.classList.contains('active')) {
      saUpdateBadge();
    }
  }
  if (e.key.includes(session.tenantId)) {
    if (document.getElementById('phApp')?.classList.contains('active')) {
      phUpdateBadges();
    }
  }
});

/* ============================================
   53. ROUTING BY ROLE (with splash)
   ============================================ */
const _originalShowPlaceholder = showPlaceholder;
showPlaceholder = function (session) {
  pcShowSplash(session, () => {
    if (session.role === 'superadmin') {
      document.getElementById('appPlaceholder').classList.remove('open');
      document.getElementById('phApp').classList.remove('active');
      document.getElementById('adminApp').classList.add('active');
      saShowDashboard(session);
      return;
    }
    if (session.role === 'admin' || session.role === 'cashier' || session.role === 'employee') {
      document.getElementById('appPlaceholder').classList.remove('open');
      document.getElementById('adminApp').classList.remove('active');
      document.getElementById('phApp').classList.add('active');
      phShowDashboard(session);
      return;
    }
  });
};

/* ============================================
   54. INITIALIZATION
   ============================================ */
(function init() {
  const params = new URLSearchParams(window.location.search);
  const tenantId = params.get('order');
  if (tenantId) {
    setTimeout(() => publicOpen(tenantId), 300);
    return;
  }

  const session = DB.getSession();
  if (session) {
    if (session.role !== 'superadmin' && session.tenantId) {
      const tenant = DB.getTenants().find(t => t.id === session.tenantId);
      if (!tenant || tenant.status === 'suspended') {
        DB.clearSession();
        showToast('الجلسة انتهت — سجل دخول من جديد', 'warning');
        return;
      }
    }
    setTimeout(() => showPlaceholder(session), 400);
  }

  setTimeout(() => {
    const s = DB.getSession();
    if (s && s.role !== 'superadmin' && document.getElementById('phApp')?.classList.contains('active')) {
      pushNotification('🎉 مرحباً بك في PharmaCloud', 'النسخة المطورة بأدوات AI و BI و API متوفرة الآن');
    }
  }, 5000);
})();

/* ============================================
   55. SMOOTH SCROLL FOR ANCHOR LINKS
   ============================================ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (href.length > 1) {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ============================================
   END OF APP.JS
   ============================================ */
console.log('✅ PharmaCloud Pro v2.0.0 Loaded Successfully');