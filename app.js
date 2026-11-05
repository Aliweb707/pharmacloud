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
      if (e.name === 'QuotaExceededError') Utils.toast('Ù…Ø³Ø§Ø­Ø© Ø§Ù„ØªØ®Ø²ÙŠÙ† Ù…Ù…ØªÙ„Ø¦Ø©', 'error');
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
    catch { return 'â€”'; }
  },
  formatDateTime(d) {
    try { return new Date(d).toLocaleString('ar-EG'); }
    catch { return 'â€”'; }
  },
  daysUntil(dateStr) {
    const diff = new Date(dateStr) - new Date();
    return Math.ceil(diff / 86400000);
  },
  timeAgo(ts) {
    const diff = Date.now() - new Date(ts).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Ø§Ù„Ø¢Ù†';
    if (m < 60) return `Ù…Ù†Ø° ${m} Ø¯`;
    const h = Math.floor(diff / 3600000);
    if (h < 24) return `Ù…Ù†Ø° ${h} Ø³`;
    const d = Math.floor(diff / 86400000);
    return `Ù…Ù†Ø° ${d} ÙŠÙˆÙ…`;
  },
  copy(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => Utils.toast('ØªÙ… Ø§Ù„Ù†Ø³Ø® âœ“'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      Utils.toast('ØªÙ… Ø§Ù„Ù†Ø³Ø® âœ“');
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
    name: 'ØµÙŠØ¯Ù„ÙŠØ© Ø§Ù„Ø´ÙØ§Ø¡',
    owner: 'Ø£Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ',
    email: 'demo@pharmacloud.app',
    phone: '+201234567890',
    address: 'Ø³Ù…ÙˆØ­Ø©ØŒ Ø§Ù„Ø¥Ø³ÙƒÙ†Ø¯Ø±ÙŠØ©',
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
      name: 'Ø£Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ', role: 'admin'
    },
    {
      id: 'u_demo_cashier', tenantId: 't_demo',
      email: 'cashier@pharmacloud.app', password: 'cash1234',
      name: 'Ù…Ù†Ù‰ Ø³Ø¹ÙŠØ¯', role: 'cashier'
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
    { drugs: ['warfarin', 'aspirin'], severity: 'high', desc: 'ÙŠØ²ÙŠØ¯ Ø®Ø·Ø± Ø§Ù„Ù†Ø²ÙŠÙ Ø¨Ø´ÙƒÙ„ ÙƒØ¨ÙŠØ±', action: 'ØªØ¬Ù†Ø¨ Ø§Ù„Ø¬Ù…Ø¹ØŒ Ø§Ø³ØªØ´Ø± Ø§Ù„Ø·Ø¨ÙŠØ¨ ÙÙˆØ±Ø§Ù‹' },
    { drugs: ['warfarin', 'ibuprofen'], severity: 'high', desc: 'Ù…Ø¶Ø§Ø¯Ø§Øª Ø§Ù„Ø§Ù„ØªÙ‡Ø§Ø¨ ØªØ²ÙŠØ¯ ØªØ£Ø«ÙŠØ± Ø§Ù„ÙˆØ§Ø±ÙØ§Ø±ÙŠÙ†', action: 'Ø§Ø³ØªØ®Ø¯Ù… Paracetamol Ø¨Ø¯ÙŠÙ„Ø§Ù‹' },
    { drugs: ['metformin', 'alcohol'], severity: 'medium', desc: 'ÙŠØ²ÙŠØ¯ Ø®Ø·Ø± Ø§Ù„Ø­Ù…Ø§Ø¶ Ø§Ù„Ù„Ø¨Ù†ÙŠ', action: 'ØªØ¬Ù†Ø¨ Ø§Ù„ÙƒØ­ÙˆÙ„' },
    { drugs: ['lisinopril', 'potassium'], severity: 'high', desc: 'ÙØ±Ø· Ø¨ÙˆØªØ§Ø³ÙŠÙˆÙ… Ø§Ù„Ø¯Ù…', action: 'Ø±Ø§Ù‚Ø¨ Ø§Ù„Ø¨ÙˆØªØ§Ø³ÙŠÙˆÙ…' },
    { drugs: ['simvastatin', 'clarithromycin'], severity: 'high', desc: 'Ø®Ø·Ø± ØªÙ…Ø²Ù‚ Ø¹Ø¶Ù„ÙŠ', action: 'Ø£ÙˆÙ‚Ù Ø§Ù„Ø³ØªØ§ØªÙŠÙ† Ù…Ø¤Ù‚ØªØ§Ù‹' },
    { drugs: ['omeprazole', 'clopidogrel'], severity: 'high', desc: 'ÙŠÙ‚Ù„Ù„ ÙØ¹Ø§Ù„ÙŠØ© Ø§Ù„ÙƒÙ„ÙˆØ¨ÙŠØ¯ÙˆØ¬Ø±ÙŠÙ„', action: 'Ø§Ø³ØªØ®Ø¯Ù… Pantoprazole' },
    { drugs: ['sildenafil', 'nitrates'], severity: 'high', desc: 'Ù‡Ø¨ÙˆØ· Ø¶ØºØ· Ù‚Ø§ØªÙ„', action: 'Ù…Ù…Ù†ÙˆØ¹ Ø§Ù„Ø¬Ù…Ø¹ ØªÙ…Ø§Ù…Ø§Ù‹' },
    { drugs: ['paracetamol', 'alcohol'], severity: 'medium', desc: 'ÙŠØ²ÙŠØ¯ Ø³Ù…ÙŠØ© Ø§Ù„ÙƒØ¨Ø¯', action: 'Ù„Ø§ ØªØªØ¬Ø§ÙˆØ² 2g ÙŠÙˆÙ…ÙŠØ§Ù‹' },
    { drugs: ['methotrexate', 'ibuprofen'], severity: 'high', desc: 'ÙŠØ²ÙŠØ¯ Ø³Ù…ÙŠØ© Ø§Ù„Ù…ÙŠØ«ÙˆØªØ±ÙŠÙƒØ³Ø§Øª', action: 'ØªØ¬Ù†Ø¨ NSAIDs' },
    { drugs: ['ciprofloxacin', 'theophylline'], severity: 'medium', desc: 'ÙŠØ²ÙŠØ¯ Ø³Ù…ÙŠØ© Ø§Ù„Ø«ÙŠÙˆÙÙŠÙ„ÙŠÙ†', action: 'Ù‚Ù„Ù„ Ø§Ù„Ø¬Ø±Ø¹Ø© 30%' }
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
        <div style="font-size:.82rem;margin-top:8px;color:var(--text-muted)"><strong>Ø§Ù„Ø¥Ø¬Ø±Ø§Ø¡:</strong> ${Utils.escapeHtml(inter.action)}</div>
        <span class="interaction-severity ${inter.severity}">
          <i class="fas fa-exclamation-circle"></i>
          ${inter.severity === 'high' ? 'Ø®Ø·Ø± Ø¹Ø§Ù„ÙŠ' : inter.severity === 'medium' ? 'Ù…ØªÙˆØ³Ø·' : 'Ù…Ù†Ø®ÙØ¶'}
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
            const label = days < 0 ? `Ù…Ù†ØªÙ‡ÙŠ Ù…Ù†Ø° ${Math.abs(days)} ÙŠÙˆÙ…` : `${days} ÙŠÙˆÙ… Ù…ØªØ¨Ù‚ÙŠ`;
            return `
              <div class="expiry-card">
                <img src="https://via.placeholder.com/48?text=${encodeURIComponent(b.productName.slice(0, 2))}" alt="">
                <div class="expiry-info">
                  <strong>${Utils.escapeHtml(b.productName)}</strong>
                  <small>Ø¨Ø§ØªØ´ ${b.batchNo} â€¢ ${b.quantity} ÙˆØ­Ø¯Ø© â€¢ ${Utils.formatDate(b.expiryDate)}</small>
                  ${days <= 60 && days >= 0 ? `<div style="margin-top:6px"><button type="button" class="btn btn-sm" style="background:var(--warning-light);color:#92400e;padding:4px 8px;border-radius:6px;font-size:.72rem" onclick="applyExpiryDiscount('${b.productId}', 15)"><i class="fas fa-percentage"></i> Ø®ØµÙ… 15%</button></div>` : ''}
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
          <div><strong>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</strong><div style="font-size:.8rem;color:var(--text-muted)">${data.allBatches.length} Ø¨Ø§ØªØ´</div></div>
          <div style="font-weight:900;font-size:1.2rem;color:var(--primary)">${data.totalValue.toLocaleString('ar-EG')} Ø¬</div>
        </div>
      </div>
      ${renderGroup('Ù…Ù†ØªÙ‡ÙŠ - Ø¥Ø¬Ø±Ø§Ø¡ ÙÙˆØ±ÙŠ', 'fa-times-circle', data.expired, 'danger')}
      ${renderGroup('Ø­Ø±Ø¬ - Ø£Ù‚Ù„ Ù…Ù† 30 ÙŠÙˆÙ…', 'fa-exclamation-triangle', data.critical, 'danger')}
      ${renderGroup('ØªØ­Ø°ÙŠØ± - Ø£Ù‚Ù„ Ù…Ù† 60 ÙŠÙˆÙ…', 'fa-clock', data.warning, 'warning')}
      ${renderGroup('ØªÙ†Ø¨ÙŠÙ‡ - Ø£Ù‚Ù„ Ù…Ù† 90 ÙŠÙˆÙ…', 'fa-info-circle', data.info, 'ok')}
      ${data.allBatches.length === 0 ? '<p style="text-align:center;color:var(--text-muted);padding:40px">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨Ø§ØªØ´Ø§Øª</p>' : ''}
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
  Utils.toast(`ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø®ØµÙ… ${percent}% Ø¹Ù„Ù‰ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ù‚Ø±ÙŠØ¨Ø© Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡`, 'success');
}

/* ============================================
   8. PRO FEATURE: PRESCRIPTION OCR AI
   ============================================ */
const PrescriptionAI = (() => {
  const DRUG_DICT = ['Ø¨Ù†Ø§Ø¯ÙˆÙ„', 'Ø£ÙˆØ¬Ù…Ù†ØªÙŠÙ†', 'ÙƒÙˆÙ†Ø¬Ø³ØªØ§Ù„', 'ÙƒØªØ§ÙØ§Ø³Øª', 'Ø²ÙŠØ«Ø±ÙˆÙ…Ø§ÙƒØ³', 'ÙÙ„Ø§Ø¬ÙŠÙ„', 'Ø¨Ø±ÙˆÙÙŠÙ†', 'Ø£Ù…Ø±ÙŠØ²ÙˆÙ„', 'Ø£Ù†ØªÙŠÙ†Ø§Ù„', 'Ø³ÙŠØªØ§Ù„', 'Ø£Ø¯ÙˆÙ„', 'Ù†ÙˆÙØ§Ù„Ø¬ÙŠÙ†', 'Ø¯ÙŠÙƒØ§Ù†Ø³Øª', 'ÙƒÙˆÙ…ØªØ±ÙƒØ³', 'Ø£Ø³Ø¨ÙˆØ³ÙŠØ¯', 'Ø¨Ù„Ø§ÙÙƒØ³', 'ÙƒÙˆÙ†ÙƒÙˆØ±', 'Ø£ØªÙˆØ±', 'Ø¬Ø§Ù†ÙˆÙ…Øª', 'Ø¬Ù„ÙˆÙƒÙˆÙØ§Ø¬'];

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
        <strong><i class="fas fa-robot"></i> AI Ù‚Ø±Ø£ ${drugs.length} Ø£Ø¯ÙˆÙŠØ© (Ø¯Ù‚Ø© 94%)</strong>
        <button type="button" class="btn btn-primary btn-sm" onclick="PrescriptionAI.addAllToCart()"><i class="fas fa-cart-plus"></i> Ø¥Ø¶Ø§ÙØ© Ø§Ù„ÙƒÙ„</button>
      </div>
      ${drugs.map(d => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;background:#fff">
          <div>
            <strong>${Utils.escapeHtml(d.name)}</strong>
            <small style="color:var(--text-muted)">${d.dosage} â€¢ x${d.qty}</small>
            <div style="font-size:.7rem;color:var(--success)"><i class="fas fa-check"></i> Ø«Ù‚Ø© ${Math.round(d.confidence * 100)}%</div>
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
    Utils.toast('ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ÙƒÙ„ Ø£Ø¯ÙˆÙŠØ© Ø§Ù„Ø±ÙˆØ´ØªØ© Ù„Ù„Ø³Ù„Ø©', 'success');
    closePrescriptionScanner();
  }

  async function addSingle(name) {
    const session = DB.getSession();
    if (!session?.tenantId) return;
    const products = DB.getTenantData(session.tenantId, 'products') || [];
    const found = products.find(p => p.name.includes(name) || name.includes(p.name.slice(0, 4)));
    if (found) {
      if (typeof phAddToCart === 'function') phAddToCart(found.id);
      Utils.toast(`ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${name}`, 'success');
    } else {
      Utils.toast(`Ø§Ù„Ù…Ù†ØªØ¬ ${name} ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯`, 'warning');
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
      Utils.toast('Ø§Ù„Ù…ØªØµÙØ­ Ù„Ø§ ÙŠØ¯Ø¹Ù… Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØµÙˆØªÙŠØ© - Ø§Ø³ØªØ®Ø¯Ù… Chrome', 'warning');
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
      Utils.toast('Ø®Ø·Ø£ ÙÙŠ Ø§Ù„ØªØ¹Ø±Ù Ø§Ù„ØµÙˆØªÙŠ', 'error');
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
    Utils.toast(`Ø³Ù…Ø¹Øª: "${text}"`, 'info');
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
      Utils.toast(`ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${found.name} x${qty}`, 'success');
    } else if (text.includes('Ø®ØµÙ…')) {
      Utils.toast(`ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø®ØµÙ… ${qty || 10}%`, 'success');
    } else if (text.includes('Ø¨Ø­Ø«')) {
      const si = document.getElementById('phProdSearch') || document.getElementById('phSearch');
      if (si) {
        si.value = text.replace('Ø¨Ø­Ø«', '').trim();
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
    if (reader) reader.innerHTML = '<div class="barcode-placeholder"><i class="fas fa-barcode"></i><p>Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§ Ø¬Ø§Ù‡Ø²Ø©</p><small>Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ ÙŠØ¯ÙˆÙŠØ§Ù‹</small></div>';
  }, 800);
}
function closeBarcodeScanner() {
  document.getElementById('barcodeOverlay')?.classList.remove('open');
}
function handleManualBarcode() {
  const input = document.getElementById('barcodeManualInput');
  const code = input?.value.trim();
  if (!code) { Utils.toast('Ø£Ø¯Ø®Ù„ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯', 'warning'); return; }
  const session = DB.getSession();
  if (!session?.tenantId) return;
  const products = DB.getTenantData(session.tenantId, 'products') || [];
  const found = products.find(p => (p.barcode && p.barcode === code) || p.id === code || p.name.toLowerCase().includes(code.toLowerCase()));
  if (found) {
    if (typeof phAddToCart === 'function') phAddToCart(found.id);
    Utils.toast(`ØªÙ… Ø§Ù„Ø¹Ø«ÙˆØ± Ø¹Ù„Ù‰ ${found.name}`, 'success');
    closeBarcodeScanner();
    input.value = '';
  } else {
    Utils.toast('Ø§Ù„Ù…Ù†ØªØ¬ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯', 'error');
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
    { id: 'pos', name: 'Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨ÙŠØ¹', desc: 'ÙØªØ­ Ø´Ø§Ø´Ø© Ø§Ù„ÙƒØ§Ø´ÙŠØ±', icon: 'fa-cash-register', action: () => { if (typeof phSwitchPage === 'function') phSwitchPage('pos'); } },
    { id: 'products', name: 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', desc: 'Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', icon: 'fa-boxes', action: () => { if (typeof phSwitchPage === 'function') phSwitchPage('products'); } },
    { id: 'expiry', name: 'Ø°ÙƒØ§Ø¡ Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ FEFO', desc: 'Ø¹Ø±Ø¶ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ù‚Ø±ÙŠØ¨Ø© Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡', icon: 'fa-hourglass-half', action: () => toggleExpiryDrawer() },
    { id: 'scan', name: 'Ù…Ø³Ø­ Ø§Ù„Ø±ÙˆØ´ØªØ© AI', desc: 'Ø±ÙØ¹ Ø±ÙˆØ´ØªØ© ÙˆÙ‚Ø±Ø§Ø¡ØªÙ‡Ø§', icon: 'fa-file-prescription', action: () => openPrescriptionScanner() },
    { id: 'barcode', name: 'Ù…Ø§Ø³Ø­ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯', desc: 'Ù…Ø³Ø­ Ø¨Ø§Ø±ÙƒÙˆØ¯ Ø¨Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§', icon: 'fa-barcode', action: () => openBarcodeScanner() },
    { id: 'voice', name: 'POS ØµÙˆØªÙŠ', desc: 'ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø£ÙˆØ§Ù…Ø± Ø§Ù„ØµÙˆØªÙŠØ©', icon: 'fa-microphone', action: () => startVoicePOS() },
    { id: 'audit', name: 'Ø³Ø¬Ù„ Ø§Ù„ØªØ¯Ù‚ÙŠÙ‚', desc: 'Ø¹Ø±Ø¶ Ø³Ø¬Ù„ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª', icon: 'fa-clipboard-list', action: () => toggleAuditPanel() }
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
    `).join('') : '<p style="text-align:center;color:var(--text-muted);padding:40px">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„ Ø¨Ø¹Ø¯</p>';
  }
}

/* ============================================
   14. PRO FEATURE: OFFLINE & PWA
   ============================================ */
window.addEventListener('online', () => {
  document.getElementById('offlineBanner')?.classList.remove('show');
  Utils.toast('ØªÙ… Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø¥Ù†ØªØ±Ù†Øª', 'success');
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
  if (ocrEl) ocrEl.innerHTML = '<div style="text-align:center;padding:20px"><i class="fas fa-spinner fa-spin"></i> AI ÙŠÙ‚Ø±Ø£ Ø§Ù„Ø±ÙˆØ´ØªØ©...</div>';
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
  $('#authTitle').textContent = isLogin ? 'Ø£Ù‡Ù„Ø§Ù‹ Ø¨ÙŠÙƒ ØªØ§Ù†ÙŠ!' : 'Ø§Ø¨Ø¯Ø£ Ø±Ø­Ù„ØªÙƒ Ù…Ø¹ PharmaCloud';
  $('#authSubtitle').textContent = isLogin ? 'Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ Ù„Ù„ÙˆØµÙˆÙ„ Ù„ØµÙŠØ¯Ù„ÙŠØªÙƒ' : 'Ø£Ù†Ø´Ø¦ Ø­Ø³Ø§Ø¨ ØµÙŠØ¯Ù„ÙŠØªÙƒ ÙÙŠ Ø¯Ù‚ÙŠÙ‚Ø© ÙˆØ§Ø­Ø¯Ø©';
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
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¯Ø®ÙˆÙ„...';

  setTimeout(() => {
    const users = DB.getUsers();
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);

    if (!user) {
      showAuthAlert('Ø§Ù„Ø¨Ø±ÙŠØ¯ Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ Ø£Ùˆ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ØºÙŠØ± ØµØ­ÙŠØ­Ø©');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„';
      return;
    }

    if (user.tenantId) {
      const tenant = DB.getTenants().find(t => t.id === user.tenantId);
      if (!tenant) {
        showAuthAlert('Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ© Ø§Ù„Ø®Ø§ØµØ© Ø¨Ùƒ ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„';
        return;
      }
      if (tenant.status === 'suspended') {
        showAuthAlert('Ø­Ø³Ø§Ø¨ Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ© Ù…ÙˆÙ‚ÙˆÙ');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯Ø®ÙˆÙ„';
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
    showToast(`Ù…Ø±Ø­Ø¨Ø§Ù‹ ${user.name}!`, 'success');
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

  if (!terms) { showAuthAlert('ÙŠØ¬Ø¨ Ø§Ù„Ù…ÙˆØ§ÙÙ‚Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø´Ø±ÙˆØ·'); return; }
  if (password.length < 8) { showAuthAlert('ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± 8 Ø£Ø­Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„'); return; }

  const users = DB.getUsers();
  if (users.find(u => u.email.toLowerCase() === email)) {
    showAuthAlert('Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³Ø¬Ù„ Ø¨Ø§Ù„ÙØ¹Ù„');
    return;
  }

  const btn = $('#signupBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡...';

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
    showToast(`ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ØµÙŠØ¯Ù„ÙŠØ© "${pharmacyName}" Ø¨Ù†Ø¬Ø§Ø­!`, 'success');
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
    superadmin: 'Ù…Ø¯ÙŠØ± Ø§Ù„Ù…Ù†ØµØ©',
    admin: 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©',
    cashier: 'ÙƒØ§Ø´ÙŠØ±',
    employee: 'Ù…ÙˆØ¸Ù'
  };

  const isSuperAdmin = session.role === 'superadmin';
  document.getElementById('pcSplashTitle').textContent = isSuperAdmin
    ? 'Ù…Ø±Ø­Ø¨Ø§Ù‹ Ø¨Ø¹ÙˆØ¯ØªÙƒ ðŸ‘‘'
    : `Ø£Ù‡Ù„Ø§Ù‹ ${user?.name?.split(' ')[0] || ''} ðŸ‘‹`;

  document.getElementById('pcSplashSubtitle').textContent = isSuperAdmin
    ? 'Ø¬Ø§Ø±ÙŠ ØªØ­Ø¶ÙŠØ± Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… Ø§Ù„Ù…Ù†ØµØ©'
    : `Ø¬Ø§Ø±ÙŠ ØªØ­Ø¶ÙŠØ± Ù„ÙˆØ­Ø© ØªØ­ÙƒÙ… ${tenant?.name || 'ØµÙŠØ¯Ù„ÙŠØªÙƒ'}`;

  document.getElementById('pcSplashAvatar').textContent = (user?.name || 'ØŸ').charAt(0);
  document.getElementById('pcSplashName').textContent = user?.name || 'â€”';
  document.getElementById('pcSplashRole').textContent = roleNames[user?.role] || user?.role || 'â€”';

  splash.classList.add('open');
  document.body.style.overflow = 'hidden';

  const statusMessages = isSuperAdmin
    ? ['Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±', 'ØªØ­Ù…ÙŠÙ„ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª', 'ØªØ­Ø¶ÙŠØ± Ø§Ù„Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª', 'Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ø¶ÙŠØ±']
    : ['Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø§ØªØµØ§Ù„ Ø¨Ø§Ù„Ø³ÙŠØ±ÙØ±', 'ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª', 'ØªØ­Ø¶ÙŠØ± Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…', 'ÙƒÙ„ Ø­Ø§Ø¬Ø© Ø¬Ø§Ù‡Ø²Ø©'];

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
      title: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ù…Ù† Ø§Ù„Ø­Ø³Ø§Ø¨ØŸ',
      confirmText: 'Ù†Ø¹Ù…ØŒ Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      cancelText: 'Ø¥Ù„ØºØ§Ø¡'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬', 'success');
      setTimeout(function() { window.location.reload(); }, 500);
    });
  } else {
    if (!_origConfirm.call(window, 'Ù‡Ù„ ØªØ±ÙŠØ¯ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ØŸ')) return;
    DB.clearSession();
    document.body.classList.remove('dashboard-mode');
    showToast('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬', 'success');
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
      title: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ù…Ù† Ù„ÙˆØ­Ø© Ø§Ù„ØªØ­ÙƒÙ…ØŸ',
      confirmText: 'Ù†Ø¹Ù…ØŒ Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      cancelText: 'Ø¥Ù„ØºØ§Ø¡'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬', 'success');
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
        <h1 style="font-size:1.8rem;font-weight:900;display:flex;align-items:center;gap:12px"><i class="fas fa-chart-pie" style="color:var(--primary)"></i> Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©</h1>
        <p style="color:var(--text-muted);font-size:.95rem;margin-top:4px">Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ù…Ø¨Ø§Ø´Ø±Ø© Ø¹Ù† Ø£Ø¯Ø§Ø¡ Ø§Ù„Ù…Ù†ØµØ©</p>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="saExportAllExcel()"><i class="fas fa-file-excel"></i> ØªØµØ¯ÙŠØ± Excel</button>
        <button class="btn btn-primary btn-sm" onclick="saSwitchPageByName('tenants')"><i class="fas fa-store-alt"></i> Ø¥Ø¯Ø§Ø±Ø© Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</button>
      </div>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi" onclick="saSwitchPageByName('tenants')"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-store-alt"></i></div><span class="sa-kpi-change">+${Math.max(1, Math.floor(Math.random() * 5))}%</span></div><div class="sa-kpi-value">${totalTenants}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-check-circle"></i></div><span class="sa-kpi-change">${activeTenants}</span></div><div class="sa-kpi-value">${activeTenants}</div><div class="sa-kpi-label">ØµÙŠØ¯Ù„ÙŠØ§Øª Ù†Ø´Ø·Ø©</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-hourglass-half"></i></div><span class="sa-kpi-change down">${trialTenants}</span></div><div class="sa-kpi-value">${trialTenants}</div><div class="sa-kpi-label">ÙÙŠ ÙØªØ±Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-users"></i></div><span class="sa-kpi-change">+${Math.floor(Math.random() * 20) + 5}</span></div><div class="sa-kpi-value">${totalUsers}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙŠÙ†</div></div>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi g5"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-dollar-sign"></i></div><span class="sa-kpi-change">Ø´Ù‡Ø±ÙŠ</span></div><div class="sa-kpi-value">${mrr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">Ø¥ÙŠØ±Ø§Ø¯ Ø´Ù‡Ø±ÙŠ (MRR)</div></div>
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-chart-line"></i></div><span class="sa-kpi-change">Ø³Ù†ÙˆÙŠ</span></div><div class="sa-kpi-value">${arr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">Ø¥ÙŠØ±Ø§Ø¯ Ø³Ù†ÙˆÙŠ (ARR)</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div><span class="sa-kpi-change">Ø¥Ø¬Ù…Ø§Ù„ÙŠ</span></div><div class="sa-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-ban"></i></div><span class="sa-kpi-change down">${suspendedTenants}</span></div><div class="sa-kpi-value">${suspendedTenants}</div><div class="sa-kpi-label">Ù…ÙˆÙ‚ÙˆÙØ©</div></div>
    </div>
    <div class="sa-charts">
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-area"></i> ØªØ·ÙˆØ± Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª â€” Ø¢Ø®Ø± 12 Ø´Ù‡Ø±</div></div><div class="sa-chart-wrap"><canvas id="saChartMRR"></canvas></div></div>
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-pie"></i> ØªÙˆØ²ÙŠØ¹ Ø§Ù„Ø®Ø·Ø·</div></div><div class="sa-chart-wrap"><canvas id="saChartPlans"></canvas></div></div>
    </div>
    <div class="sa-charts">
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-bar"></i> Ù†Ù…Ùˆ Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª Ø´Ù‡Ø±ÙŠØ§Ù‹</div></div><div class="sa-chart-wrap"><canvas id="saChartGrowth"></canvas></div></div>
      <div class="sa-chart-card"><div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-bolt"></i> Ø¢Ø®Ø± Ø§Ù„Ø£Ù†Ø´Ø·Ø©</div></div>
        <div class="sa-activity">
          ${recentActivity.length > 0 ? recentActivity.map(a => `
            <div class="sa-activity-item">
              <div class="sa-act-icon" style="background:var(--gradient-brand)"><i class="fas fa-${a.icon || 'bolt'}"></i></div>
              <div class="sa-act-content"><strong>${escapeHtml(a.title)}</strong><p>${escapeHtml(a.desc || '')}</p><div class="sa-act-time">${timeAgo(a.timestamp)}</div></div>
            </div>
          `).join('') : '<div class="sa-empty" style="padding:40px 20px"><i class="fas fa-history"></i><h4>Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Ø´Ø§Ø· Ø¨Ø¹Ø¯</h4></div>'}
        </div>
      </div>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-star"></i> Ø£ÙØ¶Ù„ Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</h3><button class="btn btn-outline btn-sm" onclick="saSwitchPageByName('tenants')">Ø¹Ø±Ø¶ Ø§Ù„ÙƒÙ„</button></div>
      <div style="overflow-x:auto">
        <table class="sa-table">
          <thead><tr><th>Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</th><th>Ø§Ù„Ù…Ø§Ù„Ùƒ</th><th>Ø§Ù„Ø®Ø·Ø©</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</th><th>Ø§Ù„ØªØ³Ø¬ÙŠÙ„</th></tr></thead>
          <tbody>
            ${tenants.filter(t => t.plan !== 'basic').slice(0, 5).map(t => `
              <tr>
                <td><div class="sa-ten-cell"><div class="sa-ten-avatar">${escapeHtml(t.name.charAt(0))}</div><div class="sa-ten-info"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.email)}</span></div></div></td>
                <td>${escapeHtml(t.owner || 'â€”')}</td>
                <td><span class="sa-badge sa-badge-${t.plan}">${t.plan.toUpperCase()}</span></td>
                <td><span class="sa-badge sa-badge-${t.status}">${t.status === 'active' ? 'Ù†Ø´Ø·Ø©' : t.status === 'trial' ? 'ØªØ¬Ø±ÙŠØ¨ÙŠØ©' : t.status === 'suspended' ? 'Ù…ÙˆÙ‚ÙˆÙØ©' : 'Ù…Ù†ØªÙ‡ÙŠØ©'}</span></td>
                <td>${t.userCount}</td>
                <td>${formatDate(t.createdAt)}</td>
              </tr>
            `).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</td></tr>'}
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
        Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù„Ù€ "${escapeHtml(q)}"
      </div>`;
  } else {
    dropdown.innerHTML = `
      <div class="search-dd-section">
        <div class="search-dd-title">ØµÙŠØ¯Ù„ÙŠØ§Øª (${tenants.length})</div>
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
      <h1 style="font-size:1.8rem;font-weight:900;display:flex;align-items:center;gap:12px"><i class="fas fa-store-alt" style="color:var(--primary)"></i> Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</h1>
      <p style="color:var(--text-muted);font-size:.95rem;margin-top:4px">${tenants.length} ØµÙŠØ¯Ù„ÙŠØ© Ù…Ø³Ø¬Ù„Ø©</p>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head">
        <h3><i class="fas fa-list"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</h3>
        <div class="sa-filters">
          <input type="text" id="saTenSearch" placeholder="Ø¨Ø­Ø«..." class="sa-select" style="min-width:200px" oninput="saFilterTenants()">
          <select class="sa-select" id="saTenPlanFilter" onchange="saFilterTenants()">
            <option value="">ÙƒÙ„ Ø§Ù„Ø®Ø·Ø·</option>
            <option value="basic">Basic</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
          <select class="sa-select" id="saTenStatusFilter" onchange="saFilterTenants()">
            <option value="">ÙƒÙ„ Ø§Ù„Ø­Ø§Ù„Ø§Øª</option>
            <option value="active">Ù†Ø´Ø·Ø©</option>
            <option value="trial">ØªØ¬Ø±ÙŠØ¨ÙŠØ©</option>
            <option value="suspended">Ù…ÙˆÙ‚ÙˆÙØ©</option>
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
    tbody.innerHTML = '<div class="sa-empty"><i class="fas fa-store-alt"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙŠØ¯Ù„ÙŠØ§Øª</h4></div>';
    return;
  }

  tbody.innerHTML = `
    <table class="sa-table">
      <thead><tr><th>Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</th><th>Ø§Ù„Ù…Ø§Ù„Ùƒ</th><th>Ø§Ù„Ø®Ø·Ø©</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</th><th>Ø§Ù„ØªØ³Ø¬ÙŠÙ„</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
      <tbody>
        ${list.map(t => `
          <tr>
            <td><div class="sa-ten-cell"><div class="sa-ten-avatar">${escapeHtml(t.name.charAt(0))}</div><div class="sa-ten-info"><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.email || 'â€”')}</span></div></div></td>
            <td>${escapeHtml(t.owner || 'â€”')}</td>
            <td><span class="sa-badge sa-badge-${t.plan}">${t.plan.toUpperCase()}</span></td>
            <td><span class="sa-badge sa-badge-${t.status}">${t.status === 'active' ? 'Ù†Ø´Ø·Ø©' : t.status === 'trial' ? 'ØªØ¬Ø±ÙŠØ¨ÙŠØ©' : t.status === 'suspended' ? 'Ù…ÙˆÙ‚ÙˆÙØ©' : 'Ù…Ù†ØªÙ‡ÙŠØ©'}</span></td>
            <td>${t.userCount}</td>
            <td>${formatDate(t.createdAt)}</td>
            <td>
              <div class="sa-actions">
                <button onclick="saViewTenant('${t.id}')" title="Ø¹Ø±Ø¶"><i class="fas fa-eye"></i></button>
                ${t.status === 'active' || t.status === 'trial'
                  ? `<button class="warning" onclick="saSuspendTenant('${t.id}')" title="Ø¥ÙŠÙ‚Ø§Ù"><i class="fas fa-pause"></i></button>`
                  : `<button class="success" onclick="saActivateTenant('${t.id}')" title="ØªÙ†Ø´ÙŠØ·"><i class="fas fa-play"></i></button>`}
                <button class="danger" onclick="saDeleteTenant('${t.id}')" title="Ø­Ø°Ù"><i class="fas fa-trash"></i></button>
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
        <div class="sa-detail"><strong>Ù…Ø¹Ø±Ù‘Ù</strong><span>${tenant.id}</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ø®Ø·Ø©</strong><span class="sa-badge sa-badge-${tenant.plan}">${tenant.plan.toUpperCase()}</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ø­Ø§Ù„Ø©</strong><span class="sa-badge sa-badge-${tenant.status}">${tenant.status === 'active' ? 'Ù†Ø´Ø·Ø©' : tenant.status === 'trial' ? 'ØªØ¬Ø±ÙŠØ¨ÙŠØ©' : 'Ù…ÙˆÙ‚ÙˆÙØ©'}</span></div>
        <div class="sa-detail"><strong>Ø³Ø¹Ø± Ø§Ù„Ø´Ù‡Ø±</strong><span>${planPrices[tenant.plan]} Ø¬.Ù…</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ù…Ø§Ù„Ùƒ</strong><span>${escapeHtml(tenant.owner || 'â€”')}</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ù‡Ø§ØªÙ</strong><span>${escapeHtml(tenant.phone || 'â€”')}</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ø¨Ø±ÙŠØ¯</strong><span>${escapeHtml(tenant.email || 'â€”')}</span></div>
        <div class="sa-detail"><strong>Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</strong><span>${users.length} Ù…Ø³ØªØ®Ø¯Ù…</span></div>
      </div>
      <h4 style="margin:20px 0 12px;font-size:1rem;font-weight:900"><i class="fas fa-users" style="color:var(--primary)"></i> Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ† (${users.length})</h4>
      <div style="background:var(--bg-alt);border-radius:12px;padding:14px;margin-bottom:20px">
        ${users.map(u => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="display:block;font-size:.88rem">${escapeHtml(u.name)}</strong>
              <span style="font-size:.75rem;color:var(--text-muted)">${escapeHtml(u.email)}</span>
            </div>
            <span class="sa-badge sa-badge-${u.role === 'admin' ? 'pro' : 'basic'}">${u.role}</span>
          </div>
        `).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†</div>'}
      </div>
      <h4 style="margin:20px 0 12px;font-size:1rem;font-weight:900"><i class="fas fa-credit-card" style="color:var(--primary)"></i> Ø³Ø¬Ù„ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª (${subscriptions.length})</h4>
      <div style="background:var(--bg-alt);border-radius:12px;padding:14px;max-height:200px;overflow-y:auto">
        ${subscriptions.map(s => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border)">
            <div>
              <strong style="display:block;font-size:.85rem">${s.type === 'trial' ? 'ÙØªØ±Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©' : 'Ø¯ÙØ¹Ø© ' + (s.plan || '').toUpperCase()}</strong>
              <span style="font-size:.72rem;color:var(--text-muted)">${formatDate(s.createdAt)}</span>
            </div>
            <span style="font-weight:900;color:var(--success)">${(s.amount || 0).toLocaleString('ar-EG')} Ø¬</span>
          </div>
        `).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„</div>'}
      </div>
    </div>
    <div class="sa-modal-foot">
      ${tenant.status === 'active' || tenant.status === 'trial'
        ? `<button class="btn btn-outline" onclick="saSuspendTenant('${tenant.id}'); saCloseModal()"><i class="fas fa-pause"></i> Ø¥ÙŠÙ‚Ø§Ù</button>`
        : `<button class="btn btn-success" onclick="saActivateTenant('${tenant.id}'); saCloseModal()"><i class="fas fa-play"></i> ØªÙ†Ø´ÙŠØ·</button>`}
      <button class="btn btn-primary" onclick="saUpgradeTenant('${tenant.id}')"><i class="fas fa-arrow-up"></i> ØªØ±Ù‚ÙŠØ©</button>
      <button class="btn btn-outline" onclick="saCloseModal()">Ø¥ØºÙ„Ø§Ù‚</button>
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
    title: 'Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥ÙŠÙ‚Ø§Ù "' + tenant.name + '"ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø¥ÙŠÙ‚Ø§Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
  }).then(function(ok) {
    if (!ok) return;
    tenant.status = 'suspended';
    DB.setTenants(tenants);
    saLogActivity('suspend', 'fa-pause', 'ØªÙ… Ø¥ÙŠÙ‚Ø§Ù "' + tenant.name + '"');
    saFilterTenants();
    saUpdateBadge();
    showToast('ØªÙ… Ø¥ÙŠÙ‚Ø§Ù "' + tenant.name + '"', 'warning');
  });
}

function saActivateTenant(id) {
  const tenants = saGetTenants();
  const tenant = tenants.find(t => t.id === id);
  if (!tenant) return;
  tenant.status = 'active';
  DB.setTenants(tenants);
  saLogActivity('activate', 'fa-play', `ØªÙ… ØªÙ†Ø´ÙŠØ· "${tenant.name}"`);
  saFilterTenants();
  saUpdateBadge();
  showToast(`ØªÙ… ØªÙ†Ø´ÙŠØ· "${tenant.name}"`, 'success');
}

function saDeleteTenant(id) {
  const tenant = saGetTenants().find(t => t.id === id);
  if (!tenant) return;
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'Ø­Ø°Ù Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©',
    message: 'Ø³ÙŠØªÙ… Ø­Ø°Ù "' + tenant.name + '" ÙˆÙƒÙ„ Ø¨ÙŠØ§Ù†Ø§ØªÙ‡Ø§ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹.\n\nÙ‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
  }).then(function(ok) {
    if (!ok) return;
    DB.setTenants(saGetTenants().filter(t => t.id !== id));
    DB.setUsers(saGetUsers().filter(u => u.tenantId !== id));
    saLogActivity('delete', 'fa-trash', 'ØªÙ… Ø­Ø°Ù "' + tenant.name + '"');
    saRenderTenants();
    saUpdateBadge();
    showToast('ØªÙ… Ø­Ø°Ù "' + tenant.name + '"', 'warning');
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
        '<h3><i class="fas fa-arrow-up"></i> ØªØ±Ù‚ÙŠØ© Ø§Ù„Ø®Ø·Ø©</h3>' +
        '<button class="sa-modal-close" onclick="saCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="sa-modal-body">' +
        '<p style="margin-bottom:16px;font-weight:700">ØªØ±Ù‚ÙŠØ© Ø®Ø·Ø© "' + escapeHtml(tenant.name) + '" Ù…Ù† <strong>' + tenant.plan.toUpperCase() + '</strong> Ø¥Ù„Ù‰:</p>' +
        '<div style="display:grid;gap:10px">' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'basic\')">' +
            '<span>Basic</span><strong style="color:#00b884">500 Ø¬/Ø´Ù‡Ø±</strong>' +
          '</button>' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'pro\')">' +
            '<span>Pro</span><strong style="color:#1E88E5">1,000 Ø¬/Ø´Ù‡Ø±</strong>' +
          '</button>' +
          '<button class="btn btn-outline" style="justify-content:space-between;padding:16px" onclick="saSelectUpgrade(\'' + id + '\',\'enterprise\')">' +
            '<span>Enterprise</span><strong style="color:#7c3aed">2,000 Ø¬/Ø´Ù‡Ø±</strong>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="sa-modal-foot">' +
        '<button class="btn btn-outline" onclick="saCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>' +
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
  saLogActivity('upgrade', 'fa-arrow-up', 'ØªÙ… ØªØ±Ù‚ÙŠØ© "' + tenant.name + '"');
  saFilterTenants();
  saCloseModal();
  showToast('ØªÙ… ØªØ±Ù‚ÙŠØ© "' + tenant.name + '"', 'success');
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
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-credit-card" style="color:var(--primary)"></i> Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-credit-card"></i></div></div><div class="sa-kpi-value">${subs.length}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ù…Ù„ÙŠØ§Øª</div></div>
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-check-circle"></i></div></div><div class="sa-kpi-value">${paid.length}</div><div class="sa-kpi-label">Ù…Ø¯ÙÙˆØ¹Ø§Øª Ù†Ø§Ø¬Ø­Ø©</div></div>
      <div class="sa-kpi g2"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-hourglass-half"></i></div></div><div class="sa-kpi-value">${trials.length}</div><div class="sa-kpi-label">ÙØªØ±Ø§Øª ØªØ¬Ø±ÙŠØ¨ÙŠØ©</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div><div class="sa-kpi-value">${totalPaid.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ø­ØµÙ„</div></div>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-list"></i> Ø³Ø¬Ù„ Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª</h3></div>
      <div style="overflow-x:auto">
        <table class="sa-table">
          <thead><tr><th>Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</th><th>Ø§Ù„Ù†ÙˆØ¹</th><th>Ø§Ù„Ø®Ø·Ø©</th><th>Ø§Ù„Ù…Ø¨Ù„Øº</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th></tr></thead>
          <tbody>
            ${subs.slice(0, 50).map(s => {
              const tenant = saGetTenants().find(t => t.id === s.tenantId);
              return `<tr>
                <td>${tenant ? escapeHtml(tenant.name) : 'â€”'}</td>
                <td>${s.type === 'trial' ? 'ØªØ¬Ø±Ø¨Ø©' : s.type === 'upgrade' ? 'ØªØ±Ù‚ÙŠØ©' : 'Ø§Ø´ØªØ±Ø§Ùƒ'}</td>
                <td><span class="sa-badge sa-badge-${s.plan || 'basic'}">${(s.plan || 'basic').toUpperCase()}</span></td>
                <td><strong>${(s.amount || 0).toLocaleString('ar-EG')} Ø¬</strong></td>
                <td><span class="sa-badge sa-badge-${s.status === 'paid' ? 'active' : 'trial'}">${s.status === 'paid' ? 'Ù…Ø¯ÙÙˆØ¹' : s.status}</span></td>
                <td>${formatDate(s.createdAt)}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø³Ø¬Ù„</td></tr>'}
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
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-chart-line" style="color:var(--primary)"></i> Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi g4"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div><div class="sa-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div></div>
      <div class="sa-kpi g5"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-dollar-sign"></i></div></div><div class="sa-kpi-value">${mrr.toLocaleString('ar-EG')}</div><div class="sa-kpi-label">MRR Ø´Ù‡Ø±ÙŠ</div></div>
      <div class="sa-kpi"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-chart-bar"></i></div></div><div class="sa-kpi-value">${(mrr * 12).toLocaleString('ar-EG')}</div><div class="sa-kpi-label">ARR Ø³Ù†ÙˆÙŠ</div></div>
      <div class="sa-kpi g3"><div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-percentage"></i></div></div><div class="sa-kpi-value">${subs.length > 0 ? '8.4%' : '0%'}</div><div class="sa-kpi-label">Ù…Ø¹Ø¯Ù„ Ø§Ù„Ù†Ù…Ùˆ</div></div>
    </div>
    <div class="sa-charts" style="grid-template-columns:1fr">
      <div class="sa-chart-card">
        <div class="sa-chart-head"><div class="sa-chart-title"><i class="fas fa-chart-area"></i> Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª Ø§Ù„Ø´Ù‡Ø±ÙŠØ©</div></div>
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
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-history" style="color:var(--primary)"></i> Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø·</h1>
      <button class="btn btn-outline btn-sm" onclick="saClearActivity()"><i class="fas fa-trash"></i> Ù…Ø³Ø­</button>
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
        `).join('') : '<div class="sa-empty"><i class="fas fa-history"></i><h4>Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Ø´Ø§Ø·</h4></div>'}
      </div>
    </div>
  `;
}

function saClearActivity() {
  if (!confirm('Ù…Ø³Ø­ Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø·ØŸ')) return;
  localStorage.setItem('pc_activity', '[]');
  saRenderActivity();
  showToast('ØªÙ… Ù…Ø³Ø­ Ø§Ù„Ø³Ø¬Ù„');
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
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-file-alt" style="color:var(--primary)"></i> Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±</h1>
    </div>
    <div class="sa-kpi-grid">
      <div class="sa-kpi" onclick="saExportAllExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-file-excel"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">ØªÙ‚Ø±ÙŠØ± Ø´Ø§Ù…Ù„</div>
        <div class="sa-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
      <div class="sa-kpi g2" onclick="saExportAllPDF()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-file-pdf"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">ØªÙ‚Ø±ÙŠØ± PDF</div>
        <div class="sa-kpi-label">Ù…Ù„Ø®Øµ Ø§Ù„Ù…Ù†ØµØ©</div>
      </div>
      <div class="sa-kpi g4" onclick="saExportSubscriptionsExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-credit-card"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª</div>
        <div class="sa-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
      <div class="sa-kpi g3" onclick="saExportRevenueExcel()" style="cursor:pointer">
        <div class="sa-kpi-head"><div class="sa-kpi-icon"><i class="fas fa-coins"></i></div></div>
        <div class="sa-kpi-value" style="font-size:1.15rem">Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div>
        <div class="sa-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
    </div>
  `;
}

function saRenderSettings() {
  document.getElementById('saContent').innerHTML = `
    <div style="margin-bottom:24px">
      <h1 style="font-size:1.8rem;font-weight:900"><i class="fas fa-cog" style="color:var(--primary)"></i> Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª Ø§Ù„Ù…Ù†ØµØ©</h1>
    </div>
    <div class="sa-table-card">
      <div class="sa-table-head"><h3><i class="fas fa-building"></i> Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…Ù†ØµØ©</h3></div>
      <div class="sa-modal-body">
        <div class="sa-detail-grid">
          <div class="sa-detail"><strong>Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØµØ©</strong><span>PharmaCloud Pro</span></div>
          <div class="sa-detail"><strong>Ø§Ù„Ø¥ØµØ¯Ø§Ø±</strong><span>v2.0.0</span></div>
          <div class="sa-detail"><strong>Ø§Ù„Ø¨Ø±ÙŠØ¯</strong><span>info@pharmacloud.app</span></div>
          <div class="sa-detail"><strong>Ø§Ù„Ù‡Ø§ØªÙ</strong><span>+20 128 498 7621</span></div>
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
  if (typeof XLSX === 'undefined') { showToast('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...'); return; }
  const tenants = saGetTenantStats().map(t => ({
    'Ù…Ø¹Ø±Ù': t.id, 'Ø§Ø³Ù… Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©': t.name, 'Ø§Ù„Ù…Ø§Ù„Ùƒ': t.owner || '',
    'Ø§Ù„Ø¨Ø±ÙŠØ¯': t.email || '', 'Ø§Ù„Ù‡Ø§ØªÙ': t.phone || '', 'Ø§Ù„Ø®Ø·Ø©': t.plan,
    'Ø§Ù„Ø­Ø§Ù„Ø©': t.status, 'Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…ÙˆÙ†': t.userCount,
    'ØªØ§Ø±ÙŠØ® Ø§Ù„ØªØ³Ø¬ÙŠÙ„': formatDate(t.createdAt)
  }));
  const ws = XLSX.utils.json_to_sheet(tenants);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª');
  XLSX.writeFile(wb, 'pharmacloud-tenants-' + new Date().toISOString().slice(0, 10) + '.xlsx');
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
}

function saExportSubscriptionsExcel() {
  if (typeof XLSX === 'undefined') return;
  const subs = saGetSubscriptions().map(s => {
    const t = saGetTenants().find(x => x.id === s.tenantId);
    return {
      'Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©': t?.name || 'â€”', 'Ø§Ù„Ù†ÙˆØ¹': s.type, 'Ø§Ù„Ø®Ø·Ø©': s.plan,
      'Ø§Ù„Ù…Ø¨Ù„Øº': s.amount || 0, 'Ø§Ù„Ø­Ø§Ù„Ø©': s.status, 'Ø§Ù„ØªØ§Ø±ÙŠØ®': formatDate(s.createdAt)
    };
  });
  const ws = XLSX.utils.json_to_sheet(subs.length ? subs : [{ 'Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©': 'Ù„Ø§ ÙŠÙˆØ¬Ø¯' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø§Ø´ØªØ±Ø§ÙƒØ§Øª');
  XLSX.writeFile(wb, 'pharmacloud-subscriptions.xlsx');
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
}

function saExportRevenueExcel() {
  if (typeof XLSX === 'undefined') return;
  const subs = saGetSubscriptions().filter(s => s.status === 'paid').map(s => {
    const t = saGetTenants().find(x => x.id === s.tenantId);
    return { 'Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©': t?.name || 'â€”', 'Ø§Ù„Ù…Ø¨Ù„Øº': s.amount || 0, 'Ø§Ù„ØªØ§Ø±ÙŠØ®': formatDate(s.createdAt) };
  });
  const ws = XLSX.utils.json_to_sheet(subs.length ? subs : [{ 'Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©': 'Ù„Ø§ ÙŠÙˆØ¬Ø¯' }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª');
  XLSX.writeFile(wb, 'pharmacloud-revenue.xlsx');
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
}

function saExportAllPDF() {
  if (typeof html2pdf === 'undefined') { showToast('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„...'); return; }
  const tenants = saGetTenantStats();
  const mrr = saCalculateMRR();
  const totalRevenue = saGetSubscriptions().filter(s => s.status === 'paid').reduce((sum, s) => sum + (s.amount || 0), 0);

  const html = `<div style="font-family:Cairo,sans-serif;padding:40px;direction:rtl;background:#fff">
    <div style="text-align:center;border-bottom:3px solid #00b884;padding-bottom:20px;margin-bottom:30px">
      <h1 style="color:#00b884;margin:0;font-size:2rem">PharmaCloud</h1>
      <p style="color:#64748b;margin-top:8px">ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ù†ØµØ© Ø§Ù„Ø´Ø§Ù…Ù„</p>
    </div>
    <h2 style="color:#00b884">ðŸ“Š Ù…Ù„Ø®Øµ</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:.9rem">
      <tr style="background:#f0fdf9"><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${tenants.length}</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„Ù†Ø´Ø·Ø©</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${tenants.filter(t => t.status === 'active').length}</td></tr>
      <tr><td style="padding:12px;border:1px solid #e2e8f0"><strong>MRR</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${mrr.toLocaleString('ar-EG')} Ø¬</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${totalRevenue.toLocaleString('ar-EG')} Ø¬</td></tr>
    </table>
    <h2 style="color:#00b884">ðŸª Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ§Øª</h2>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="background:#00b884;color:#fff"><th style="padding:10px">Ø§Ù„Ø§Ø³Ù…</th><th style="padding:10px">Ø§Ù„Ù…Ø§Ù„Ùƒ</th><th style="padding:10px">Ø§Ù„Ø®Ø·Ø©</th><th style="padding:10px">Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead>
      <tbody>${tenants.map((t, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="padding:10px;border:1px solid #e2e8f0">${escapeHtml(t.name)}</td><td style="padding:10px;border:1px solid #e2e8f0">${escapeHtml(t.owner || 'â€”')}</td><td style="padding:10px;border:1px solid #e2e8f0">${t.plan.toUpperCase()}</td><td style="padding:10px;border:1px solid #e2e8f0">${t.status}</td></tr>`).join('')}</tbody>
    </table>
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;color:#64748b;font-size:.85rem"><p>Â© 2026 PharmaCloud</p></div>
  </div>`;

  showToast('Ø¬Ø§Ø±ÙŠ Ø¥Ù†Ø´Ø§Ø¡ PDF...');
  html2pdf().set({
    margin: 0, filename: 'pharmacloud-report.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(html).save().then(() => showToast('âœ… ØªÙ… Ø§Ù„ØªØ­Ù…ÙŠÙ„'));
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
   â­ ONLY for the demo tenant (t_demo)
   ============================================ */
function phSeedDemoData() {
  // If there are already products â†’ don't seed
  if (PH.getProducts().length > 0) return;

  // â­ Get tenant to check if it's the demo tenant
  var tenant = null;
  try { tenant = PH.getTenant(); } catch (e) {}

  // â­ ONLY seed if it's the demo tenant
  // Users who register fresh (via "Ø§Ø¨Ø¯Ø£ 14 ÙŠÙˆÙ… Ù…Ø¬Ø§Ù†Ø§Ù‹") get a tenant
  // with isDemo=false and skipSeedData=true â†’ nothing gets seeded
  if (!tenant || (!tenant.isDemo && !tenant.skipSeedData)) {
    // This is a fresh tenant â€” leave it EMPTY
    // (user will add their own products)
    if (tenant && tenant.skipSeedData) {
      console.log('[PharmaCloud] âœ… Fresh tenant detected â€” data left empty');
    } else if (tenant) {
      console.log('[PharmaCloud] â¸ï¸ Non-demo tenant â€” no auto-seed');
    }
    return;
  }

  // If tenant has skipSeedData flag â†’ definitely skip
  if (tenant.skipSeedData) {
    console.log('[PharmaCloud] â¸ï¸ skipSeedData=true â€” no demo data');
    return;
  }

  // ============================================
  //  DEMO TENANT ONLY â€” SEED DATA
  // ============================================
  console.log('[PharmaCloud] ðŸŒ± Seeding demo data for demo tenant');

  const demoProducts = [
    { id: 'p1', barcode: '6221234567890', name: 'Ø¨Ù†Ø§Ø¯ÙˆÙ„ Ø£Ø¯ÙØ§Ù†Ø³', active: 'Paracetamol 500mg', category: 'Ø£Ø¯ÙˆÙŠØ©', price: 45, cost: 28, stock: 120, minStock: 20, rx: false, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80' },
    { id: 'p2', barcode: '6221234567891', name: 'ÙÙŠØªØ§Ù…ÙŠÙ† Ø¯ 50000', active: 'Cholecalciferol', category: 'ÙÙŠØªØ§Ù…ÙŠÙ†Ø§Øª', price: 85, cost: 55, stock: 80, minStock: 15, rx: false, image: 'https://images.unsplash.com/photo-1550572017-edd951b55104?w=200&q=80' },
    { id: 'p3', barcode: '6221234567892', name: 'ÙƒØ±ÙŠÙ… Ù…Ø±Ø·Ø¨ Ù„Ù„Ø¨Ø´Ø±Ø©', active: 'Glycerin + Ceramides', category: 'Ø¹Ù†Ø§ÙŠØ© Ø¨Ø§Ù„Ø¨Ø´Ø±Ø©', price: 120, cost: 75, stock: 45, minStock: 10, rx: false, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=200&q=80' },
    { id: 'p4', barcode: '6221234567893', name: 'Ø¬Ù‡Ø§Ø² Ù‚ÙŠØ§Ø³ Ø¶ØºØ·', active: 'Digital BP Monitor', category: 'Ø£Ø¬Ù‡Ø²Ø© Ø·Ø¨ÙŠØ©', price: 450, cost: 320, stock: 12, minStock: 5, rx: false, image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=200&q=80' },
    { id: 'p5', barcode: '6221234567894', name: 'Ø­ÙØ§Ø¶Ø§Øª Ø£Ø·ÙØ§Ù„ Ù…Ù‚Ø§Ø³ 3', active: 'Baby Diapers', category: 'Ø§Ù„Ø£Ù… ÙˆØ§Ù„Ø·ÙÙ„', price: 180, cost: 130, stock: 200, minStock: 30, rx: false, image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&q=80' },
    { id: 'p6', barcode: '6221234567895', name: 'ØºØ³ÙˆÙ„ Ù…Ø·Ù‡Ø± Ù„Ù„ÙŠØ¯ÙŠÙ†', active: 'Chlorhexidine 2%', category: 'Ø¹Ù†Ø§ÙŠØ© Ø´Ø®ØµÙŠØ©', price: 75, cost: 45, stock: 150, minStock: 25, rx: false, image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=200&q=80' },
    { id: 'p7', barcode: '6221234567896', name: 'Ù…Ø¹Ø¬ÙˆÙ† Ø£Ø³Ù†Ø§Ù†', active: 'Fluoride 1450ppm', category: 'Ø¹Ù†Ø§ÙŠØ© Ø´Ø®ØµÙŠØ©', price: 35, cost: 20, stock: 300, minStock: 50, rx: false, image: 'https://images.unsplash.com/photo-1559591937-abc3a7eb9c5c?w=200&q=80' },
    { id: 'p8', barcode: '6221234567897', name: 'Ø£ÙˆÙ…ÙŠØ¬Ø§ 3', active: 'Omega-3 1000mg', category: 'Ù…ÙƒÙ…Ù„Ø§Øª ØºØ°Ø§Ø¦ÙŠØ©', price: 220, cost: 155, stock: 60, minStock: 12, rx: false, image: 'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=200&q=80' },
    { id: 'p9', barcode: '6221234567898', name: 'Ø£Ø¯ÙˆÙ„', active: 'Paracetamol 500mg', category: 'Ø£Ø¯ÙˆÙŠØ©', price: 35, cost: 20, stock: 150, minStock: 20, rx: false, image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80' },
    { id: 'p10', barcode: '6221234567899', name: 'Ø£Ù…ÙˆÙƒØ³ÙŠØ³ÙŠÙ„ÙŠÙ† 500mg', active: 'Amoxicillin', category: 'Ø£Ø¯ÙˆÙŠØ©', price: 85, cost: 55, stock: 40, minStock: 10, rx: true, image: 'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=200&q=80' }
  ];
  PH.setProducts(demoProducts);

  const demoCustomers = [
    { id: 'c1', name: 'Ù…Ø­Ù…Ø¯ Ø£Ø­Ù…Ø¯', phone: '01012345678', email: 'm@test.com', address: 'Ø³Ù…ÙˆØ­Ø©', totalSpent: 1250, orders: 8, createdAt: '2026-05-10' },
    { id: 'c2', name: 'Ø³Ø§Ø±Ø© Ù…Ø­Ù…ÙˆØ¯', phone: '01023456789', email: 's@test.com', address: 'Ø³ÙŠØ¯ÙŠ Ø¬Ø§Ø¨Ø±', totalSpent: 890, orders: 5, createdAt: '2026-06-22' },
    { id: 'c3', name: 'Ø£Ø­Ù…Ø¯ Ø§Ù„Ø´Ø±ÙŠÙ', phone: '01034567890', email: 'a@test.com', address: 'Ø§Ù„Ø¹ØµØ§ÙØ±Ø©', totalSpent: 2100, orders: 14, createdAt: '2026-04-01' },
    { id: 'c4', name: 'Ù…Ù†Ù‰ Ø¹Ø¨Ø¯ Ø§Ù„Ù„Ù‡', phone: '01045678901', email: 'mn@test.com', address: 'Ø§Ù„Ù…Ù†Ø¯Ø±Ø©', totalSpent: 560, orders: 3, createdAt: '2026-07-15' },
    { id: 'c5', name: 'ÙƒØ±ÙŠÙ… ÙŠÙˆØ³Ù', phone: '01056789012', email: 'k@test.com', address: 'Ø§Ù„Ø¹Ø¬Ù…ÙŠ', totalSpent: 1780, orders: 11, createdAt: '2026-03-08' }
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
      userName: phSession?.name || 'Ù…Ø³ØªØ®Ø¯Ù…',
      checkIn: '09:' + String(Math.floor(Math.random() * 30) + 10).padStart(2, '0'),
      checkOut: i === 0 ? null : '17:' + String(Math.floor(Math.random() * 30) + 10).padStart(2, '0')
    });
  }
  PH.setAttendance(demoAtt);

  const demoPresc = [
    { id: 'rx1', patientName: 'Ù…Ø­Ù…Ø¯ Ø£Ø­Ù…Ø¯', phone: '01012345678', doctorName: 'Ø¯. Ø£Ø­Ù…Ø¯ Ø³Ù…ÙŠØ±', diagnosis: 'Ø¨Ø±Ø¯ Ø­Ø§Ø¯', items: [{ name: 'Ø¨Ù†Ø§Ø¯ÙˆÙ„ Ø£Ø¯ÙØ§Ù†Ø³', qty: 1, price: 45 }], notes: 'Ù‚Ø±Øµ ÙƒÙ„ 8 Ø³Ø§Ø¹Ø§Øª', status: 'dispensed', createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: 'rx2', patientName: 'Ø³Ø§Ø±Ø© Ù…Ø­Ù…ÙˆØ¯', phone: '01023456789', doctorName: 'Ø¯. Ù…Ù†Ù‰ Ø¥Ø¨Ø±Ø§Ù‡ÙŠÙ…', diagnosis: 'Ø§Ù„ØªÙ‡Ø§Ø¨ Ø­Ù„Ù‚', items: [{ name: 'Ø£Ù…ÙˆÙƒØ³ÙŠØ³ÙŠÙ„ÙŠÙ† 500mg', qty: 1, price: 85 }], notes: 'Ù‚Ø±Øµ 3 Ù…Ø±Ø§Øª ÙŠÙˆÙ…ÙŠØ§Ù‹', status: 'pending', createdAt: new Date().toISOString() }
  ];
  PH.setPrescriptions(demoPresc);

  console.log('[PharmaCloud] âœ… Demo data seeded');
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
    planBadge.innerHTML = `<strong>${tenant.plan.toUpperCase()} PLAN</strong><span>${tenant.status === 'trial' ? daysLeft + ' ÙŠÙˆÙ… ØªØ¬Ø±Ø¨Ø©' : 'Ø§Ø´ØªØ±Ø§Ùƒ Ù†Ø´Ø·'}</span>`;
  }

  document.getElementById('phNameTop').textContent = session.name;
  document.getElementById('phAvatarTop').textContent = session.name.charAt(0);
  const roleNames = { admin: 'Ù…Ø¯ÙŠØ± Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©', cashier: 'ÙƒØ§Ø´ÙŠØ±', employee: 'Ù…ÙˆØ¸Ù' };
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
      title: 'ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ù…Ù† Ø­Ø³Ø§Ø¨ÙƒØŸ',
      confirmText: 'Ù†Ø¹Ù…ØŒ Ø³Ø¬Ù‘Ù„ Ø§Ù„Ø®Ø±ÙˆØ¬',
      cancelText: 'Ø¥Ù„ØºØ§Ø¡'
    }).then(function(ok) {
      if (!ok) return;
      DB.clearSession();
      document.body.classList.remove('dashboard-mode');
      showToast('ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬', 'success');
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
    <div class="ph-section-title">Ù…ØªÙ‚Ø¯Ù…</div>
    <button class="ph-item" onclick="phSwitchPage(this, 'bi')"><i class="fas fa-chart-bar"></i><span>Ù„ÙˆØ­Ø© BI</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'branches')"><i class="fas fa-store-alt"></i><span>Ø§Ù„ÙØ±ÙˆØ¹</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'api')"><i class="fas fa-code"></i><span>API</span></button>
    <button class="ph-item" onclick="phSwitchPage(this, 'online')"><i class="fas fa-globe"></i><span>Ø·Ù„Ø¨Ø§Øª Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†</span></button>
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
        Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬ Ù„Ù€ "${escapeHtml(q)}"
      </div>`;
  } else {
    let html = '';
    if (products.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">Ù…Ù†ØªØ¬Ø§Øª (${products.length})</div>`;
      products.slice(0, 4).forEach(p => {
        html += `<div class="search-dd-item" onclick="phSearchGotoProduct('${p.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-brand)"><i class="fas fa-pills"></i></div>
          <div class="search-dd-info"><strong>${escapeHtml(p.name)}</strong><span>${p.price} Ø¬ â€¢ Ù…Ø®Ø²ÙˆÙ†: ${p.stock}</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (orders.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">Ø·Ù„Ø¨Ø§Øª (${orders.length})</div>`;
      orders.slice(0, 3).forEach(o => {
        html += `<div class="search-dd-item" onclick="phSearchGotoOrder('${o.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-accent)"><i class="fas fa-receipt"></i></div>
          <div class="search-dd-info"><strong>${o.id}</strong><span>${escapeHtml(o.customerName)} â€¢ ${o.total} Ø¬</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (customers.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">Ø¹Ù…Ù„Ø§Ø¡ (${customers.length})</div>`;
      customers.slice(0, 3).forEach(c => {
        html += `<div class="search-dd-item" onclick="phSearchGotoCustomer('${c.id}')">
          <div class="search-dd-icon" style="background:var(--gradient-purple)"><i class="fas fa-user"></i></div>
          <div class="search-dd-info"><strong>${escapeHtml(c.name)}</strong><span>${escapeHtml(c.phone)}</span></div>
        </div>`;
      });
      html += '</div>';
    }
    if (prescriptions.length > 0) {
      html += `<div class="search-dd-section"><div class="search-dd-title">ÙˆØµÙØ§Øª (${prescriptions.length})</div>`;
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
        <h1><i class="fas fa-chart-pie"></i> Ù†Ø¸Ø±Ø© Ø¹Ø§Ù…Ø©</h1>
        <p>Ù…Ù„Ø®Øµ Ø£Ø¯Ø§Ø¡ ØµÙŠØ¯Ù„ÙŠØªÙƒ â€” ${new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      <div class="ph-head-actions">
        <button class="btn btn-primary btn-sm" onclick="phSwitchPageByName('pos')"><i class="fas fa-cash-register"></i> Ø¨ÙŠØ¹ Ø³Ø±ÙŠØ¹</button>
        <button class="btn btn-outline btn-sm" onclick="phOpenAddProduct()"><i class="fas fa-plus"></i> Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯</button>
      </div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi" onclick="phSwitchPageByName('orders')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-shopping-bag"></i></div><span class="ph-kpi-change">Ø§Ù„ÙŠÙˆÙ…</span></div>
        <div class="ph-kpi-value">${todayOrders.length}</div><div class="ph-kpi-label">Ø·Ù„Ø¨Ø§Øª Ø§Ù„ÙŠÙˆÙ…</div>
      </div>
      <div class="ph-kpi g4">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-coins"></i></div><span class="ph-kpi-change">+12%</span></div>
        <div class="ph-kpi-value">${todayRevenue.toLocaleString('ar-EG')}</div><div class="ph-kpi-label">Ø¥ÙŠØ±Ø§Ø¯ Ø§Ù„ÙŠÙˆÙ…</div>
      </div>
      <div class="ph-kpi g3">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-pills"></i></div><span class="ph-kpi-change">${products.length}</span></div>
        <div class="ph-kpi-value">${products.length}</div><div class="ph-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</div>
      </div>
      <div class="ph-kpi g2" onclick="phSwitchPageByName('products')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-exclamation-triangle"></i></div><span class="ph-kpi-change down">${lowStock}</span></div>
        <div class="ph-kpi-value">${lowStock}</div><div class="ph-kpi-label">ØªØ­ØªØ§Ø¬ Ø¥Ø¹Ø§Ø¯Ø© Ø·Ù„Ø¨</div>
      </div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi g5">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-dollar-sign"></i></div><span class="ph-kpi-change">Ø¥Ø¬Ù…Ø§Ù„ÙŠ</span></div>
        <div class="ph-kpi-value">${totalRevenue.toLocaleString('ar-EG')}</div><div class="ph-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div>
      </div>
      <div class="ph-kpi" onclick="phSwitchPageByName('customers')">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-user-friends"></i></div><span class="ph-kpi-change">+${Math.floor(Math.random() * 5)}</span></div>
        <div class="ph-kpi-value">${customers.length}</div><div class="ph-kpi-label">Ø¹Ù…Ù„Ø§Ø¡ Ù…Ø³Ø¬Ù„ÙˆÙ†</div>
      </div>
      <div class="ph-kpi g3">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-chart-line"></i></div></div>
        <div class="ph-kpi-value">${orders.length ? Math.round(totalRevenue / orders.length) : 0}</div><div class="ph-kpi-label">Ù…ØªÙˆØ³Ø· Ù‚ÙŠÙ…Ø© Ø§Ù„Ø·Ù„Ø¨</div>
      </div>
      <div class="ph-kpi g4">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-check-circle"></i></div></div>
        <div class="ph-kpi-value">${orders.length}</div><div class="ph-kpi-label">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø·Ù„Ø¨Ø§Øª</div>
      </div>
    </div>
    <div class="ph-charts">
      <div class="ph-chart-card">
        <div class="ph-chart-head"><div class="ph-chart-title"><i class="fas fa-chart-area"></i> Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ø¢Ø®Ø± 7 Ø£ÙŠØ§Ù…</div></div>
        <div class="ph-chart-wrap"><canvas id="phSalesChart"></canvas></div>
      </div>
      <div class="ph-chart-card">
        <div class="ph-chart-head"><div class="ph-chart-title"><i class="fas fa-chart-pie"></i> ØªÙˆØ²ÙŠØ¹ Ø§Ù„ÙØ¦Ø§Øª</div></div>
        <div class="ph-chart-wrap"><canvas id="phCatChart"></canvas></div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-receipt"></i> Ø¢Ø®Ø± Ø§Ù„Ø·Ù„Ø¨Ø§Øª</h3>
        <button class="btn btn-outline btn-sm" onclick="phSwitchPageByName('orders')">Ø¹Ø±Ø¶ Ø§Ù„ÙƒÙ„</button>
      </div>
      <div style="overflow-x:auto">
        ${recentOrders.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨</th><th>Ø§Ù„Ø¹Ù…ÙŠÙ„</th><th>Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead>
            <tbody>${recentOrders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${o.items.length} Ù…Ù†ØªØ¬</td>
                <td><strong style="color:var(--primary)">${o.total} Ø¬</strong></td>
                <td>${formatDate(o.createdAt)}</td>
                <td><span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> Ù…ÙƒØªÙ…Ù„</span></td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-receipt"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª</h4></div>'}
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
      <div><h1><i class="fas fa-cash-register"></i> Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨ÙŠØ¹</h1><p>Ø§Ø®ØªØ± Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø£Ùˆ Ø§Ù…Ø³Ø­ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯</p></div>
    </div>
    <div class="ph-pos-grid">
      <div>
        <div class="barcode-input">
          <input type="text" id="phBarcodeInput" placeholder="ðŸ” Ø§Ù…Ø³Ø­ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ Ø£Ùˆ Ø§ÙƒØªØ¨Ù‡ Ù‡Ù†Ø§..." onkeypress="if(event.key==='Enter'){event.preventDefault(); phHandleBarcode(this.value);}" autocomplete="off">
          <button class="btn btn-primary" onclick="phHandleBarcode(document.getElementById('phBarcodeInput').value)">
            <i class="fas fa-barcode"></i>
          </button>
        </div>
        <div style="margin-bottom:16px">
          <input type="text" class="ph-input" style="width:100%;padding:14px 18px;font-size:1rem" placeholder="ðŸ” Ø§Ø¨Ø­Ø« Ø¹Ù† Ù…Ù†ØªØ¬ Ø¨Ø§Ù„Ø§Ø³Ù…..." oninput="phFilterPOS(this.value)">
        </div>
        <div class="ph-pos-products" id="phPosProducts">
          ${products.map(p => `
            <div class="ph-pos-card" onclick="phAddToCart('${p.id}')">
              <img src="${p.image}" onerror="this.src='https://via.placeholder.com/200?text=Product'">
              <h4>${escapeHtml(p.name)}</h4>
              <div class="price">${p.price} Ø¬</div>
              <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">Ù…ØªÙˆÙØ±: ${p.stock}</div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="ph-cart" id="phCart">
        <div class="ph-cart-head">
          <h3><i class="fas fa-shopping-cart" style="color:var(--primary)"></i> Ø§Ù„Ø³Ù„Ø©</h3>
          <button class="btn btn-outline btn-sm" onclick="phClearCart()"><i class="fas fa-trash"></i></button>
        </div>
        <div style="margin-bottom:14px">
          <select class="ph-select" id="phCartCustomer" style="width:100%">
            <option value="">Ø¹Ù…ÙŠÙ„ Ø¹Ø§Ø¨Ø±</option>
            ${customerList.map(c => `<option value="${c.id}">${escapeHtml(c.name)} â€” ${escapeHtml(c.phone)}</option>`).join('')}
          </select>
        </div>
        <div class="ph-cart-items" id="phCartItems">
          <div class="ph-cart-empty"><i class="fas fa-shopping-basket"></i><p>Ø§Ù„Ø³Ù„Ø© ÙØ§Ø¶ÙŠØ©</p></div>
        </div>
        <div class="ph-cart-total">
          <div class="ph-cart-row"><span>Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª:</span><span id="phCartCount">0</span></div>
          <div class="ph-cart-row total"><span>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:</span><span id="phCartTotal">0 Ø¬</span></div>
        </div>
        <div style="display:flex;gap:8px">
          <select class="ph-select" id="phPaymentMethod" style="flex:1">
            <option value="cash">ðŸ’µ ÙƒØ§Ø´</option>
            <option value="card">ðŸ’³ Ø¨Ø·Ø§Ù‚Ø©</option>
            <option value="wallet">ðŸ“± Ù…Ø­ÙØ¸Ø©</option>
          </select>
        </div>
        <button class="btn btn-primary btn-block" style="margin-top:12px" onclick="phCheckout()" id="phCheckoutBtn" disabled>
          <i class="fas fa-check-circle"></i> Ø¥ØªÙ…Ø§Ù… Ø§Ù„Ø¨ÙŠØ¹
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
    showToast('âŒ Ø¨Ø§Ø±ÙƒÙˆØ¯ ØºÙŠØ± Ù…Ø¹Ø±ÙˆÙ: ' + code, 'error');
    playSound('error');
    return;
  }
  phAddToCart(product.id);
  showToast(`âœ… ØªÙ… Ø¥Ø¶Ø§ÙØ© ${product.name}`, 'success');
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
      <div class="price">${p.price} Ø¬</div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">Ù…ØªÙˆÙØ±: ${p.stock}</div>
    </div>
  `).join('') || '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted)">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù†ØªØ§Ø¦Ø¬</div>';
}

function phAddToCart(productId) {
  const product = PH.getProducts().find(p => p.id === productId);
  if (!product) return;
  if (product.stock <= 0) { showToast('ØºÙŠØ± Ù…ØªÙˆÙØ±', 'warning'); return; }

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
    if (existing.qty >= product.stock) { showToast('Ø§Ù„ÙƒÙ…ÙŠØ© Ù„Ø§ ØªÙƒÙÙŠ', 'warning'); return; }
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
    items.innerHTML = '<div class="ph-cart-empty"><i class="fas fa-shopping-basket"></i><p>Ø§Ù„Ø³Ù„Ø© ÙØ§Ø¶ÙŠØ©</p></div>';
  } else {
    items.innerHTML = phCart.map(c => `
      <div class="ph-cart-item">
        <div class="ph-cart-item-info">
          <strong>${escapeHtml(c.name)}</strong>
          <span>${c.price} Ø¬ Ã— ${c.qty}</span>
          <div class="ph-qty">
            <button onclick="phChangeQty('${c.id}', -1)">âˆ’</button>
            <span>${c.qty}</span>
            <button onclick="phChangeQty('${c.id}', 1)">+</button>
          </div>
        </div>
        <div style="text-align:end">
          <strong style="color:var(--primary)">${(c.price * c.qty).toLocaleString('ar-EG')} Ø¬</strong>
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
  if (totalEl) totalEl.textContent = total.toLocaleString('ar-EG') + ' Ø¬';
  if (btn) btn.disabled = phCart.length === 0;
}

function phChangeQty(id, delta) {
  const item = phCart.find(c => c.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) { phRemoveFromCart(id); return; }
  if (item.qty > item.stock) { item.qty = item.stock; showToast('Ø§Ù„ÙƒÙ…ÙŠØ© Ù„Ø§ ØªÙƒÙÙŠ', 'warning'); }
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
    title: 'Ø¥ÙØ±Ø§Øº Ø§Ù„Ø³Ù„Ø©',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø¥ÙØ±Ø§Øº Ø§Ù„Ø³Ù„Ø© Ù…Ù† ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§ØªØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø£ÙØ±ØºÙ‡Ø§',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
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
    customerName: customer?.name || 'Ø¹Ù…ÙŠÙ„ Ø¹Ø§Ø¨Ø±',
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
  showToast(`âœ… ØªÙ… Ø§Ù„Ø¨ÙŠØ¹ â€” ${total.toLocaleString('ar-EG')} Ø¬`, 'success');
  pushNotification('ðŸ’³ Ø¹Ù…Ù„ÙŠØ© Ø¨ÙŠØ¹ Ø¬Ø¯ÙŠØ¯Ø©', `Ù…Ø¨Ù„Øº ${total.toLocaleString('ar-EG')} Ø¬`);
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
      <div><h1><i class="fas fa-pills"></i> Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</h1><p>Ø¥Ø¯Ø§Ø±Ø© Ù…Ù†ØªØ¬Ø§Øª ÙˆÙ…Ø®Ø²ÙˆÙ† ØµÙŠØ¯Ù„ÙŠØªÙƒ</p></div>
      <div class="ph-head-actions">
        <button class="btn btn-outline btn-sm" onclick="phOpenImportExcel()"><i class="fas fa-file-import"></i> Ø§Ø³ØªÙŠØ±Ø§Ø¯ Excel</button>
        <button class="btn btn-outline btn-sm" onclick="phExportExcel()"><i class="fas fa-file-excel"></i> ØªØµØ¯ÙŠØ±</button>
        <button class="btn btn-primary btn-sm" onclick="phOpenAddProduct()"><i class="fas fa-plus"></i> Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯</button>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-list"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</h3>
        <div class="ph-filters">
          <input type="text" id="phProdSearch" placeholder="Ø¨Ø­Ø«..." class="ph-input" oninput="phFilterProductsDebounced()">
          <select class="ph-select" id="phProdCatFilter" onchange="phFilterProducts()"><option value="">ÙƒÙ„ Ø§Ù„ÙØ¦Ø§Øª</option></select>
          <select class="ph-select" id="phProdStockFilter" onchange="phFilterProducts()">
            <option value="">ÙƒÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</option>
            <option value="low">Ù…Ù†Ø®ÙØ¶</option>
            <option value="out">Ù†ÙØ¯</option>
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
    body.innerHTML = '<div class="ph-empty"><i class="fas fa-pills"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª</h4></div>';
    return;
  }

  body.innerHTML = `
    <table class="ph-table">
      <thead><tr><th>Ø§Ù„Ù…Ù†ØªØ¬</th><th>Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯</th><th>Ø§Ù„ÙØ¦Ø©</th><th>Ø§Ù„Ø³Ø¹Ø±</th><th>Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
      <tbody>
        ${list.map(p => {
          const sb = p.stock === 0
            ? '<span class="ph-badge ph-badge-red">Ù†ÙØ¯</span>'
            : p.stock <= p.minStock
              ? `<span class="ph-badge ph-badge-orange">Ù…Ù†Ø®ÙØ¶ (${p.stock})</span>`
              : `<span class="ph-badge ph-badge-green">${p.stock}</span>`;
          return `<tr>
            <td>
              <div class="ph-prod-cell">
                <div class="ph-prod-img"><img src="${p.image}" onerror="this.src='https://via.placeholder.com/44'"></div>
                <div class="ph-prod-info">
                  <strong>${escapeHtml(p.name)} ${p.rx ? 'â„ž' : ''}</strong>
                  <span>${escapeHtml(p.active || '')}</span>
                </div>
              </div>
            </td>
            <td><code style="font-size:.78rem;background:var(--bg-alt);padding:3px 8px;border-radius:6px">${escapeHtml(p.barcode || 'â€”')}</code></td>
            <td><span class="ph-badge ph-badge-gray">${escapeHtml(p.category)}</span></td>
            <td><strong>${p.price} Ø¬</strong></td>
            <td>${sb}</td>
            <td>${p.stock > p.minStock ? '<span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> Ù…ØªÙˆÙØ±</span>' : '<span class="ph-badge ph-badge-orange"><i class="fas fa-exclamation"></i> Ø§Ø·Ù„Ø¨ Ø§Ù„Ù…Ø²ÙŠØ¯</span>'}</td>
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
      <h3><i class="fas fa-plus"></i> Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveProduct(event)">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬ <span class="req">*</span></label><input type="text" id="phPName" required></div>
          <div class="ph-form-group"><label>Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø©</label><input type="text" id="phPActive"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯</label><input type="text" id="phPBarcode" placeholder="Ø§Ù…Ø³Ø­ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ Ø£Ùˆ Ø§ÙƒØªØ¨Ù‡" style="font-family:monospace"></div>
          <div class="ph-form-group"><label>Ø§Ù„ÙØ¦Ø© <span class="req">*</span></label>
            <select id="phPCat" required>
              <option value="">Ø§Ø®ØªØ±</option>
              <option>Ø£Ø¯ÙˆÙŠØ©</option><option>ÙÙŠØªØ§Ù…ÙŠÙ†Ø§Øª</option><option>Ø¹Ù†Ø§ÙŠØ© Ø¨Ø§Ù„Ø¨Ø´Ø±Ø©</option>
              <option>Ø£Ø¬Ù‡Ø²Ø© Ø·Ø¨ÙŠØ©</option><option>Ø§Ù„Ø£Ù… ÙˆØ§Ù„Ø·ÙÙ„</option><option>Ù…ÙƒÙ…Ù„Ø§Øª ØºØ°Ø§Ø¦ÙŠØ©</option><option>Ø¹Ù†Ø§ÙŠØ© Ø´Ø®ØµÙŠØ©</option>
            </select>
          </div>
          <div class="ph-form-group"><label>Ø§Ù„Ø³Ø¹Ø± <span class="req">*</span></label><input type="number" id="phPPrice" required min="0" step="0.5"></div>
          <div class="ph-form-group"><label>Ø§Ù„ØªÙƒÙ„ÙØ©</label><input type="number" id="phPCost" min="0" step="0.5"></div>
          <div class="ph-form-group"><label>Ø§Ù„ÙƒÙ…ÙŠØ© <span class="req">*</span></label><input type="number" id="phPStock" required min="0" value="0"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰</label><input type="number" id="phPMinStock" min="0" value="10"></div>
          <div class="ph-form-group"><label>ÙŠØ­ØªØ§Ø¬ Ø±ÙˆØ´ØªØ©ØŸ</label><select id="phPRx"><option value="no">Ù„Ø§</option><option value="yes">Ù†Ø¹Ù…</option></select></div>
          <div class="ph-form-group full">
            <label>ØµÙˆØ±Ø© Ø§Ù„Ù…Ù†ØªØ¬</label>
            <div class="file-upload">
              <input type="file" accept="image/*" id="phPImageFile" onchange="phHandleImageUpload(this)">
              <div class="file-upload-label"><i class="fas fa-cloud-upload-alt"></i> Ø§Ø®ØªØ± ØµÙˆØ±Ø© Ù…Ù† Ø¬Ù‡Ø§Ø²Ùƒ</div>
            </div>
            <img class="image-preview" id="phPImagePreview">
            <div style="margin-top:8px;font-size:.78rem;color:var(--text-muted)">Ø£Ùˆ Ø§Ù„ØµÙ‚ Ø±Ø§Ø¨Ø· Ø§Ù„ØµÙˆØ±Ø©:</div>
            <input type="url" id="phPImage" placeholder="https://..." style="margin-top:6px">
          </div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
      </div>
    </form>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phHandleImageUpload(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showToast('Ø§Ù„ØµÙˆØ±Ø© Ø£ÙƒØ¨Ø± Ù…Ù† 2MB', 'error'); return; }
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
  showToast('âœ… ØªÙ…Øª Ø§Ù„Ø¥Ø¶Ø§ÙØ©', 'success');
  phTempImageBase64 = '';
}

function phEditProduct(id) {
  const product = PH.getProducts().find(p => p.id === id);
  if (!product) return;
  phTempImageBase64 = '';

  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-pen"></i> ØªØ¹Ø¯ÙŠÙ„ Ù…Ù†ØªØ¬</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phUpdateProduct(event, '${id}')">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬</label><input type="text" id="phPName" value="${escapeHtml(product.name)}" required></div>
          <div class="ph-form-group"><label>Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø©</label><input type="text" id="phPActive" value="${escapeHtml(product.active || '')}"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯</label><input type="text" id="phPBarcode" value="${escapeHtml(product.barcode || '')}" style="font-family:monospace"></div>
          <div class="ph-form-group"><label>Ø§Ù„ÙØ¦Ø©</label>
            <select id="phPCat" required>
              ${['Ø£Ø¯ÙˆÙŠØ©','ÙÙŠØªØ§Ù…ÙŠÙ†Ø§Øª','Ø¹Ù†Ø§ÙŠØ© Ø¨Ø§Ù„Ø¨Ø´Ø±Ø©','Ø£Ø¬Ù‡Ø²Ø© Ø·Ø¨ÙŠØ©','Ø§Ù„Ø£Ù… ÙˆØ§Ù„Ø·ÙÙ„','Ù…ÙƒÙ…Ù„Ø§Øª ØºØ°Ø§Ø¦ÙŠØ©','Ø¹Ù†Ø§ÙŠØ© Ø´Ø®ØµÙŠØ©'].map(c => `<option ${c === product.category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="ph-form-group"><label>Ø§Ù„Ø³Ø¹Ø±</label><input type="number" id="phPPrice" value="${product.price}" required min="0" step="0.5"></div>
          <div class="ph-form-group"><label>Ø§Ù„ØªÙƒÙ„ÙØ©</label><input type="number" id="phPCost" value="${product.cost || 0}" min="0" step="0.5"></div>
          <div class="ph-form-group"><label>Ø§Ù„ÙƒÙ…ÙŠØ©</label><input type="number" id="phPStock" value="${product.stock}" required min="0"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰</label><input type="number" id="phPMinStock" value="${product.minStock || 10}" min="0"></div>
          <div class="ph-form-group"><label>ÙŠØ­ØªØ§Ø¬ Ø±ÙˆØ´ØªØ©ØŸ</label><select id="phPRx"><option value="no" ${!product.rx ? 'selected' : ''}>Ù„Ø§</option><option value="yes" ${product.rx ? 'selected' : ''}>Ù†Ø¹Ù…</option></select></div>
          <div class="ph-form-group full">
            <label>ØµÙˆØ±Ø© Ø§Ù„Ù…Ù†ØªØ¬</label>
            <div class="file-upload">
              <input type="file" accept="image/*" id="phPImageFile" onchange="phHandleImageUpload(this)">
              <div class="file-upload-label"><i class="fas fa-cloud-upload-alt"></i> Ø§Ø³ØªØ¨Ø¯Ù„ Ø§Ù„ØµÙˆØ±Ø©</div>
            </div>
            <img class="image-preview show" id="phPImagePreview" src="${product.image}">
            <div style="margin-top:8px;font-size:.78rem;color:var(--text-muted)">Ø£Ùˆ Ø§Ù„ØµÙ‚ Ø±Ø§Ø¨Ø· Ø§Ù„ØµÙˆØ±Ø©:</div>
            <input type="url" id="phPImage" value="${escapeHtml(product.image || '')}" style="margin-top:6px">
          </div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
  showToast('âœ… ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ«', 'success');
  phTempImageBase64 = '';
}

function phDeleteProduct(id) {
  const product = PH.getProducts().find(p => p.id === id);
  if (!product) return;
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'Ø­Ø°Ù Ø§Ù„Ù…Ù†ØªØ¬',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù "' + product.name + '"ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
  }).then(function(ok) {
    if (!ok) return;
    PH.setProducts(PH.getProducts().filter(p => p.id !== id));
    phRenderProducts();
    phUpdateBadges();
    showToast('ØªÙ… Ø§Ù„Ø­Ø°Ù', 'warning');
  });
}

/* ============ EXCEL IMPORT ============ */
function phOpenImportExcel() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-import"></i> Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ù…Ù†ØªØ¬Ø§Øª Ù…Ù† Excel</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <p style="color:var(--text-muted);font-size:.9rem;margin-bottom:16px">Ø§Ø±ÙØ¹ Ù…Ù„Ù Excel (.xlsx) ÙÙŠÙ‡ Ø§Ù„Ø£Ø¹Ù…Ø¯Ø©:</p>
      <div style="background:var(--bg-alt);padding:14px;border-radius:10px;font-size:.82rem;font-family:monospace;margin-bottom:16px">
        <strong>Ø§Ù„Ø§Ø³Ù… | Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø© | Ø§Ù„ÙØ¦Ø© | Ø§Ù„Ø³Ø¹Ø± | Ø§Ù„ØªÙƒÙ„ÙØ© | Ø§Ù„Ù…Ø®Ø²ÙˆÙ† | Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰</strong>
      </div>
      <div class="file-upload">
        <input type="file" accept=".xlsx,.xls" id="phExcelFile" onchange="phHandleExcelImport(this)">
        <div class="file-upload-label"><i class="fas fa-file-excel"></i> Ø§Ø®ØªØ± Ù…Ù„Ù Excel</div>
      </div>
      <div style="margin-top:16px">
        <button class="btn btn-outline btn-sm" onclick="phDownloadSampleExcel()"><i class="fas fa-download"></i> ØªØ­Ù…ÙŠÙ„ Ù…Ù„Ù Ù†Ù…ÙˆØ°Ø¬ÙŠ</button>
      </div>
    </div>
    <div class="ph-modal-foot">
      <button class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
    </div>
  `;
  document.getElementById('phModalOverlay').classList.add('open');
}

function phDownloadSampleExcel() {
  if (typeof XLSX === 'undefined') return;
  const sample = [{ 'Ø§Ù„Ø§Ø³Ù…': 'Ø¨Ù†Ø§Ø¯ÙˆÙ„', 'Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø©': 'Paracetamol', 'Ø§Ù„ÙØ¦Ø©': 'Ø£Ø¯ÙˆÙŠØ©', 'Ø§Ù„Ø³Ø¹Ø±': 45, 'Ø§Ù„ØªÙƒÙ„ÙØ©': 28, 'Ø§Ù„Ù…Ø®Ø²ÙˆÙ†': 100, 'Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰': 20 }];
  const ws = XLSX.utils.json_to_sheet(sample);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ù…Ù†ØªØ¬Ø§Øª');
  XLSX.writeFile(wb, 'pharmacloud-products-template.xlsx');
}

function phHandleExcelImport(input) {
  const file = input.files[0];
  if (!file) return;
  if (typeof XLSX === 'undefined') { showToast('Ù…ÙƒØªØ¨Ø© Excel Ù„Ù… ØªÙØ­Ù…Ù‘Ù„', 'error'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      if (rows.length === 0) { showToast('Ø§Ù„Ù…Ù„Ù ÙØ§Ø¶ÙŠ', 'error'); return; }
      const products = PH.getProducts();
      let added = 0;
      rows.forEach(row => {
        const name = row['Ø§Ù„Ø§Ø³Ù…'] || row['name'];
        if (!name) return;
        products.unshift({
          id: 'p_' + Date.now() + '_' + added,
          name,
          active: row['Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø©'] || '',
          barcode: row['Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯'] || '',
          category: row['Ø§Ù„ÙØ¦Ø©'] || 'Ø£Ø¯ÙˆÙŠØ©',
          price: parseFloat(row['Ø§Ù„Ø³Ø¹Ø±'] || 0),
          cost: parseFloat(row['Ø§Ù„ØªÙƒÙ„ÙØ©'] || 0),
          stock: parseInt(row['Ø§Ù„Ù…Ø®Ø²ÙˆÙ†'] || 0),
          minStock: parseInt(row['Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰'] || 10),
          rx: false,
          image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80'
        });
        added++;
      });
      PH.setProducts(products);
      phCloseModal();
      phRenderProducts();
      phUpdateBadges();
      showToast(`âœ… ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${added} Ù…Ù†ØªØ¬`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Ø®Ø·Ø£ ÙÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„Ù…Ù„Ù', 'error');
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
      <div><h1><i class="fas fa-receipt"></i> Ø§Ù„Ø·Ù„Ø¨Ø§Øª</h1><p>${orders.length} Ø·Ù„Ø¨</p></div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-list"></i> Ø³Ø¬Ù„ Ø§Ù„Ø·Ù„Ø¨Ø§Øª</h3>
        <div class="ph-filters">
          <input type="text" id="phOrderSearch" placeholder="Ø¨Ø­Ø«..." class="ph-input" oninput="phFilterOrdersDebounced()">
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
    body.innerHTML = '<div class="ph-empty"><i class="fas fa-receipt"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª</h4></div>';
    return;
  }
  body.innerHTML = `
    <table class="ph-table">
      <thead><tr><th>Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨</th><th>Ø§Ù„Ø¹Ù…ÙŠÙ„</th><th>Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th><th>Ø§Ù„Ø¯ÙØ¹</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
      <tbody>${orders.map(o => `
        <tr>
          <td><strong>${o.id}</strong></td>
          <td>${escapeHtml(o.customerName)}</td>
          <td>${o.items.length} Ù…Ù†ØªØ¬</td>
          <td><strong style="color:var(--primary)">${o.total} Ø¬</strong></td>
          <td><span class="ph-badge ph-badge-gray">${o.paymentMethod === 'cash' ? 'ðŸ’µ ÙƒØ§Ø´' : o.paymentMethod === 'card' ? 'ðŸ’³ Ø¨Ø·Ø§Ù‚Ø©' : o.paymentMethod === 'online' ? 'ðŸŒ Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†' : 'ðŸ“± Ù…Ø­ÙØ¸Ø©'}</span></td>
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
      <h3><i class="fas fa-receipt"></i> Ø§Ù„Ø·Ù„Ø¨ ${order.id}</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„Ø¹Ù…ÙŠÙ„</strong>${escapeHtml(order.customerName)}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„ØªØ§Ø±ÙŠØ®</strong>${formatDateTime(order.createdAt)}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</strong>${order.paymentMethod}</div>
        <div style="padding:12px;background:var(--bg-alt);border-radius:10px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„Ø­Ø§Ù„Ø©</strong><span class="ph-badge ph-badge-green">Ù…ÙƒØªÙ…Ù„</span></div>
      </div>
      <table class="ph-table" style="min-width:auto">
        <thead><tr><th>Ø§Ù„Ù…Ù†ØªØ¬</th><th>Ø§Ù„Ø³Ø¹Ø±</th><th>Ø§Ù„ÙƒÙ…ÙŠØ©</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th></tr></thead>
        <tbody>
          ${order.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} Ø¬</td><td>${it.qty}</td><td><strong>${it.price * it.qty} Ø¬</strong></td></tr>`).join('')}
          <tr style="background:var(--bg-alt)"><td colspan="3" style="text-align:end;font-weight:900">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:</td><td style="font-weight:900;color:var(--primary);font-size:1.1rem">${order.total} Ø¬</td></tr>
        </tbody>
      </table>
    </div>
    <div class="ph-modal-foot">
      <button class="btn btn-outline" onclick="phCloseModal()">Ø¥ØºÙ„Ø§Ù‚</button>
      <button class="btn btn-primary" onclick="phPrintOrder('${order.id}')"><i class="fas fa-print"></i> Ø·Ø¨Ø§Ø¹Ø©</button>
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
  w.document.write(`<html dir="rtl"><head><title>ÙØ§ØªÙˆØ±Ø© ${order.id}</title>
    <style>body{font-family:Cairo,sans-serif;padding:40px;max-width:400px;margin:auto}h1{color:#00b884;text-align:center;font-size:1.4rem}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px;border-bottom:1px solid #eee;font-size:.9rem;text-align:right}th{background:#f8fafc}.total{font-weight:900;font-size:1.1rem}.footer{text-align:center;margin-top:20px;color:#999;font-size:.8rem}</style></head><body>
    <h1>${escapeHtml(tenant.name)}</h1><p style="text-align:center;font-size:.85rem;color:#666">ÙØ§ØªÙˆØ±Ø© Ø±Ù‚Ù… ${order.id}</p>
    <p style="font-size:.85rem">Ø§Ù„ØªØ§Ø±ÙŠØ®: ${formatDateTime(order.createdAt)}<br>Ø§Ù„Ø¹Ù…ÙŠÙ„: ${escapeHtml(order.customerName)}</p>
    <table><thead><tr><th>Ø§Ù„Ù…Ù†ØªØ¬</th><th>Ø³Ø¹Ø±</th><th>ÙƒÙ…ÙŠØ©</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th></tr></thead><tbody>
    ${order.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} Ø¬</td><td>${it.qty}</td><td>${it.price * it.qty} Ø¬</td></tr>`).join('')}
    <tr class="total"><td colspan="3" style="text-align:end">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:</td><td style="color:#00b884">${order.total} Ø¬</td></tr>
    </tbody></table><div class="footer">Ø´ÙƒØ±Ø§Ù‹ Ù„ØªØ¹Ø§Ù…Ù„ÙƒÙ… Ù…Ø¹Ù†Ø§ ðŸ’š</div>
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
      <div><h1><i class="fas fa-file-prescription"></i> Ø§Ù„ÙˆØµÙØ§Øª Ø§Ù„Ø·Ø¨ÙŠØ©</h1><p>${prescriptions.length} ÙˆØµÙØ© Ù…Ø³Ø¬Ù„Ø©</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddPrescription()"><i class="fas fa-plus"></i> ÙˆØµÙØ© Ø¬Ø¯ÙŠØ¯Ø©</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„ÙˆØµÙØ§Øª</h3></div>
      <div style="overflow-x:auto">
        ${prescriptions.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>Ø§Ù„Ù…Ø±ÙŠØ¶</th><th>Ø§Ù„Ø·Ø¨ÙŠØ¨</th><th>Ø§Ù„ØªØ´Ø®ÙŠØµ</th><th>Ø§Ù„Ø£Ø¯ÙˆÙŠØ©</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
            <tbody>${prescriptions.map(p => `
              <tr>
                <td><strong>${escapeHtml(p.patientName)}</strong><br><span style="font-size:.75rem;color:var(--text-muted)">${escapeHtml(p.phone || '')}</span></td>
                <td>${escapeHtml(p.doctorName || 'â€”')}</td>
                <td>${escapeHtml(p.diagnosis || 'â€”')}</td>
                <td>${p.items.length} Ø¯ÙˆØ§Ø¡</td>
                <td>${p.status === 'dispensed' ? '<span class="ph-badge ph-badge-green">ØªÙ… Ø§Ù„ØµØ±Ù</span>' : p.status === 'pending' ? '<span class="ph-badge ph-badge-orange">Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±</span>' : '<span class="ph-badge ph-badge-gray">Ù…Ù„ØºØ§Ø©</span>'}</td>
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
        ` : '<div class="ph-empty"><i class="fas fa-file-prescription"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ ÙˆØµÙØ§Øª</h4></div>'}
      </div>
    </div>
  `;
}

function phOpenAddPrescription() {
  const products = PH.getProducts();
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-prescription"></i> ÙˆØµÙØ© Ø¬Ø¯ÙŠØ¯Ø©</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSavePrescription(event)">
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group"><label>Ø§Ø³Ù… Ø§Ù„Ù…Ø±ÙŠØ¶ <span class="req">*</span></label><input type="text" id="rxPatientName" required></div>
          <div class="ph-form-group"><label>Ø§Ù„Ù‡Ø§ØªÙ</label><input type="tel" id="rxPhone"></div>
          <div class="ph-form-group"><label>Ø§Ø³Ù… Ø§Ù„Ø·Ø¨ÙŠØ¨</label><input type="text" id="rxDoctorName"></div>
          <div class="ph-form-group"><label>Ø§Ù„ØªØ´Ø®ÙŠØµ</label><input type="text" id="rxDiagnosis"></div>
          <div class="ph-form-group full">
            <label>Ø§Ù„Ø£Ø¯ÙˆÙŠØ© (Ø§Ø®ØªØ± Ù…Ù† Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª)</label>
            <div id="rxItemsContainer" style="background:var(--bg-alt);padding:12px;border-radius:10px;margin-bottom:10px"></div>
            <button type="button" class="btn btn-outline btn-sm" onclick="phAddRxItem()"><i class="fas fa-plus"></i> Ø¥Ø¶Ø§ÙØ© Ø¯ÙˆØ§Ø¡</button>
          </div>
          <div class="ph-form-group full"><label>Ù…Ù„Ø§Ø­Ø¸Ø§Øª</label><textarea id="rxNotes" rows="2"></textarea></div>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
      <option value="">Ø§Ø®ØªØ± Ù…Ù†ØªØ¬...</option>
      ${products.map(p => `<option value="${p.id}">${escapeHtml(p.name)} â€” ${p.price} Ø¬</option>`).join('')}
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
  if (items.length === 0) { showToast('Ø£Ø¶Ù Ø¯ÙˆØ§Ø¡ ÙˆØ§Ø­Ø¯ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„', 'error'); return; }

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
  showToast('âœ… ØªÙ… Ø­ÙØ¸ Ø§Ù„ÙˆØµÙØ©', 'success');
  window._rxItems = [];
}

function phViewPrescription(id) {
  const p = PH.getPrescriptions().find(x => x.id === id);
  if (!p) return;
  const total = p.items.reduce((s, it) => s + it.price * it.qty, 0);
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-file-prescription"></i> ÙˆØµÙØ© ${escapeHtml(p.patientName)}</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„Ù…Ø±ÙŠØ¶</strong>${escapeHtml(p.patientName)}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„Ù‡Ø§ØªÙ</strong>${escapeHtml(p.phone || 'â€”')}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„Ø·Ø¨ÙŠØ¨</strong>${escapeHtml(p.doctorName || 'â€”')}</div>
        <div style="padding:14px;background:var(--bg-alt);border-radius:12px"><strong style="font-size:.72rem;color:var(--text-muted);display:block">Ø§Ù„ØªØ´Ø®ÙŠØµ</strong>${escapeHtml(p.diagnosis || 'â€”')}</div>
      </div>
      <table class="ph-table" style="min-width:auto">
        <thead><tr><th>Ø§Ù„Ø¯ÙˆØ§Ø¡</th><th>Ø§Ù„Ø³Ø¹Ø±</th><th>Ø§Ù„ÙƒÙ…ÙŠØ©</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th></tr></thead>
        <tbody>
          ${p.items.map(it => `<tr><td>${escapeHtml(it.name)}</td><td>${it.price} Ø¬</td><td>${it.qty}</td><td>${it.price * it.qty} Ø¬</td></tr>`).join('')}
          <tr style="background:var(--bg-alt)"><td colspan="3" style="text-align:end;font-weight:900">Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:</td><td style="font-weight:900;color:var(--primary)">${total} Ø¬</td></tr>
        </tbody>
      </table>
    </div>
    <div class="ph-modal-foot">
      ${p.status === 'pending' ? `<button class="btn btn-success" onclick="phDispensePrescription('${p.id}')"><i class="fas fa-check"></i> ØµØ±Ù Ø§Ù„ÙˆØµÙØ©</button>` : ''}
      <button class="btn btn-outline" onclick="phCloseModal()">Ø¥ØºÙ„Ø§Ù‚</button>
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
  showToast('âœ… ØªÙ… ØµØ±Ù Ø§Ù„ÙˆØµÙØ©', 'success');
}

function phDeletePrescription(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'Ø­Ø°Ù Ø§Ù„ÙˆØµÙØ©',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ù‡ Ø§Ù„ÙˆØµÙØ©ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
  }).then(function(ok) {
    if (!ok) return;
    PH.setPrescriptions(PH.getPrescriptions().filter(p => p.id !== id));
    phRenderPrescriptions();
    phUpdateBadges();
    showToast('ØªÙ… Ø§Ù„Ø­Ø°Ù', 'warning');
  });
}

/* ============================================
   37. PHARMACY - CUSTOMERS
   ============================================ */
function phRenderCustomers() {
  const customers = PH.getCustomers();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-user-friends"></i> Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</h1><p>${customers.length} Ø¹Ù…ÙŠÙ„</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddCustomer()"><i class="fas fa-user-plus"></i> Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</h3></div>
      <div style="overflow-x:auto">
        ${customers.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>Ø§Ù„Ø§Ø³Ù…</th><th>Ø§Ù„Ù‡Ø§ØªÙ</th><th>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</th><th>Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø´Ø±Ø§Ø¡</th><th>Ø§Ù„Ø·Ù„Ø¨Ø§Øª</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
            <tbody>${customers.map(c => `
              <tr>
                <td><strong>${escapeHtml(c.name)}</strong></td>
                <td>${escapeHtml(c.phone)}</td>
                <td>${escapeHtml(c.address || 'â€”')}</td>
                <td><strong style="color:var(--primary)">${(c.totalSpent || 0).toLocaleString('ar-EG')} Ø¬</strong></td>
                <td>${c.orders || 0}</td>
                <td><div class="ph-actions">
                  <button onclick="phEditCustomer('${c.id}')"><i class="fas fa-pen"></i></button>
                  <button class="danger" onclick="phDeleteCustomer('${c.id}')"><i class="fas fa-trash"></i></button>
                </div></td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-user-friends"></i><h4>Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡</h4></div>'}
      </div>
    </div>
  `;
}

function phOpenAddCustomer() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-user-plus"></i> Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveCustomer(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>Ø§Ù„Ø§Ø³Ù… <span class="req">*</span></label><input type="text" id="phCName" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ù‡Ø§ØªÙ <span class="req">*</span></label><input type="tel" id="phCPhone" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø±ÙŠØ¯</label><input type="email" id="phCEmail"></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</label><input type="text" id="phCAddress"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
  showToast('âœ… ØªÙ…Øª Ø§Ù„Ø¥Ø¶Ø§ÙØ©', 'success');
}

function phEditCustomer(id) {
  const c = PH.getCustomers().find(x => x.id === id);
  if (!c) return;
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-pen"></i> ØªØ¹Ø¯ÙŠÙ„ Ø¹Ù…ÙŠÙ„</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phUpdateCustomer(event, '${id}')">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>Ø§Ù„Ø§Ø³Ù… <span class="req">*</span></label><input type="text" id="phCName" value="${escapeHtml(c.name)}" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ù‡Ø§ØªÙ <span class="req">*</span></label><input type="tel" id="phCPhone" value="${escapeHtml(c.phone)}" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø±ÙŠØ¯</label><input type="email" id="phCEmail" value="${escapeHtml(c.email || '')}"></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</label><input type="text" id="phCAddress" value="${escapeHtml(c.address || '')}"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
  showToast('âœ… ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ«', 'success');
}

function phDeleteCustomer(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'Ø­Ø°Ù Ø§Ù„Ø¹Ù…ÙŠÙ„',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¹Ù…ÙŠÙ„ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
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
      <div><h1><i class="fas fa-fingerprint"></i> Ø§Ù„Ø­Ø¶ÙˆØ±</h1><p>Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ± Ø§Ù„ÙŠÙˆÙ…ÙŠ</p></div>
    </div>
    <div class="ph-att-card">
      <div class="ph-att-icon"><i class="fas fa-fingerprint"></i></div>
      <h3 style="margin-bottom:8px">ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±</h3>
      <div class="ph-att-time">${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div>
      <div class="ph-att-date">${new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      ${todayRec?.checkIn
        ? todayRec.checkOut
          ? `<div style="padding:14px;background:rgba(16,185,129,.1);border-radius:12px;color:var(--success);font-weight:800"><i class="fas fa-check-circle"></i> ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ± ÙˆØ§Ù„Ø§Ù†ØµØ±Ø§Ù</div>`
          : `<div style="padding:14px;background:rgba(255,107,53,.1);border-radius:12px;color:var(--accent);font-weight:800;margin-bottom:12px"><i class="fas fa-clock"></i> Ø­Ø¶ÙˆØ±: ${todayRec.checkIn}</div>
             <button class="btn btn-primary btn-block" onclick="phCheckOut()"><i class="fas fa-sign-out-alt"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø§Ù†ØµØ±Ø§Ù</button>`
        : `<button class="btn btn-primary btn-lg btn-block" onclick="phCheckIn()"><i class="fas fa-fingerprint"></i> ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø­Ø¶ÙˆØ±</button>`}
    </div>
    <div class="ph-table-card" style="margin-top:24px">
      <div class="ph-table-head"><h3><i class="fas fa-history"></i> Ø³Ø¬Ù„ Ø§Ù„Ø­Ø¶ÙˆØ±</h3></div>
      <div style="overflow-x:auto">
        <table class="ph-table">
          <thead><tr><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th><th>Ø§Ù„Ø­Ø¶ÙˆØ±</th><th>Ø§Ù„Ø§Ù†ØµØ±Ø§Ù</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th></tr></thead>
          <tbody>${attendance.slice(0, 15).map(a => `
            <tr>
              <td>${formatDate(a.date)}</td>
              <td><strong style="color:var(--success)">${a.checkIn || 'â€”'}</strong></td>
              <td><strong style="color:var(--secondary)">${a.checkOut || 'â€”'}</strong></td>
              <td>${a.checkOut ? '<span class="ph-badge ph-badge-green">Ù…ÙƒØªÙ…Ù„</span>' : '<span class="ph-badge ph-badge-orange">Ù‚ÙŠØ¯ Ø§Ù„Ø¹Ù…Ù„</span>'}</td>
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
  showToast(`âœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø­Ø¶ÙˆØ±Ùƒ ${time}`, 'success');
  phRenderAttendance();
}

function phCheckOut() {
  const now = new Date();
  const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  const attendance = PH.getAttendance();
  const today = new Date().toDateString();
  const rec = attendance.find(a => new Date(a.date).toDateString() === today && a.userId === phSession.userId);
  if (rec) { rec.checkOut = time; PH.setAttendance(attendance); }
  showToast(`âœ… ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù†ØµØ±Ø§ÙÙƒ ${time}`, 'success');
  phRenderAttendance();
}

/* ============================================
   39. PHARMACY - TEAM
   ============================================ */
function phRenderTeam() {
  const team = PH.getTeam();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-users-cog"></i> ÙØ±ÙŠÙ‚ Ø§Ù„Ø¹Ù…Ù„</h1><p>${team.length} Ø¹Ø¶Ùˆ</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddTeamMember()"><i class="fas fa-user-plus"></i> Ø¥Ø¶Ø§ÙØ© Ø¹Ø¶Ùˆ</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-list"></i> Ø£Ø¹Ø¶Ø§Ø¡ Ø§Ù„ÙØ±ÙŠÙ‚</h3></div>
      <div style="overflow-x:auto">
        <table class="ph-table">
          <thead><tr><th>Ø§Ù„Ø§Ø³Ù…</th><th>Ø§Ù„Ø¨Ø±ÙŠØ¯</th><th>Ø§Ù„Ø¯ÙˆØ±</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø¥Ø¬Ø±Ø§Ø¡Ø§Øª</th></tr></thead>
          <tbody>${team.map(u => `
            <tr>
              <td><strong>${escapeHtml(u.name)}</strong></td>
              <td>${escapeHtml(u.email)}</td>
              <td><span class="ph-badge ph-badge-${u.role === 'admin' ? 'blue' : u.role === 'cashier' ? 'green' : 'gray'}">${u.role === 'admin' ? 'Ù…Ø¯ÙŠØ±' : u.role === 'cashier' ? 'ÙƒØ§Ø´ÙŠØ±' : 'Ù…ÙˆØ¸Ù'}</span></td>
              <td><span class="ph-badge ph-badge-green"><i class="fas fa-check"></i> Ù†Ø´Ø·</span></td>
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
      <h3><i class="fas fa-user-plus"></i> Ø¥Ø¶Ø§ÙØ© Ø¹Ø¶Ùˆ</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveTeamMember(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>Ø§Ù„Ø§Ø³Ù… <span class="req">*</span></label><input type="text" id="phTMName" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø±ÙŠØ¯ <span class="req">*</span></label><input type="email" id="phTMEmail" required></div>
        <div class="ph-form-group"><label>ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± <span class="req">*</span></label><input type="password" id="phTMPassword" required minlength="6"></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¯ÙˆØ± <span class="req">*</span></label>
          <select id="phTMRole" required>
            <option value="cashier">ÙƒØ§Ø´ÙŠØ±</option>
            <option value="employee">Ù…ÙˆØ¸Ù</option>
            <option value="admin">Ù…Ø¯ÙŠØ±</option>
          </select>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
    showToast('Ø§Ù„Ø¨Ø±ÙŠØ¯ Ù…Ø³ØªØ®Ø¯Ù…', 'error');
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
  showToast('âœ… ØªÙ…Øª Ø§Ù„Ø¥Ø¶Ø§ÙØ©', 'success');
}

function phDeleteTeamMember(id) {
  if (!window.Dialog) return;
  Dialog.confirm({
    type: 'danger',
    title: 'Ø­Ø°Ù Ø¹Ø¶Ùˆ Ø§Ù„ÙØ±ÙŠÙ‚',
    message: 'Ù‡Ù„ ØªØ±ÙŠØ¯ Ø­Ø°Ù Ù‡Ø°Ø§ Ø§Ù„Ø¹Ø¶Ùˆ Ù…Ù† Ø§Ù„ÙØ±ÙŠÙ‚ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
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
      <div><h1><i class="fas fa-file-alt"></i> Ø§Ù„ØªÙ‚Ø§Ø±ÙŠØ±</h1><p>ØªØµØ¯ÙŠØ± ØªÙ‚Ø§Ø±ÙŠØ± ØµÙŠØ¯Ù„ÙŠØªÙƒ</p></div>
    </div>
    <div class="ph-kpi-grid">
      <div class="ph-kpi" onclick="phExportExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-file-excel"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</div>
        <div class="ph-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
      <div class="ph-kpi g2" onclick="phExportOrdersExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-receipt"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø·Ù„Ø¨Ø§Øª</div>
        <div class="ph-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
      <div class="ph-kpi g3" onclick="phExportCustomersExcel()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-users"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">ØªÙ‚Ø±ÙŠØ± Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</div>
        <div class="ph-kpi-label">ØªØµØ¯ÙŠØ± Excel</div>
      </div>
      <div class="ph-kpi g4" onclick="phExportPDF()" style="cursor:pointer">
        <div class="ph-kpi-head"><div class="ph-kpi-icon"><i class="fas fa-file-pdf"></i></div></div>
        <div class="ph-kpi-value" style="font-size:1.2rem">ØªÙ‚Ø±ÙŠØ± Ø´Ø§Ù…Ù„</div>
        <div class="ph-kpi-label">ØªØµØ¯ÙŠØ± PDF</div>
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
      <div><h1><i class="fas fa-credit-card"></i> Ø§Ø´ØªØ±Ø§ÙƒÙŠ</h1><p>Ø¥Ø¯Ø§Ø±Ø© Ø§Ø´ØªØ±Ø§Ùƒ ØµÙŠØ¯Ù„ÙŠØªÙƒ</p></div>
    </div>
    <div style="background:var(--gradient-brand);color:#fff;padding:36px;border-radius:24px;margin-bottom:24px">
      <div style="font-size:.85rem;opacity:.85;font-weight:700;letter-spacing:1px;text-transform:uppercase">Ø§Ù„Ø®Ø·Ø© Ø§Ù„Ø­Ø§Ù„ÙŠØ©</div>
      <h2 style="font-size:2.5rem;font-weight:900;margin:8px 0">${tenant.plan.toUpperCase()}</h2>
      <div style="font-size:1.1rem;opacity:.9">${planPrices[tenant.plan]} Ø¬.Ù… / Ø´Ù‡Ø±ÙŠØ§Ù‹</div>
      <div style="margin-top:20px;padding:14px;background:rgba(255,255,255,.15);border-radius:12px;display:inline-block">
        <i class="fas fa-calendar"></i>
        ${tenant.status === 'trial'
          ? `ØªØ¬Ø±Ø¨Ø© â€” ${Math.max(0, Math.ceil((new Date(tenant.trialEndsAt) - Date.now()) / 86400000))} ÙŠÙˆÙ… Ù…ØªØ¨Ù‚ÙŠ`
          : `Ø§Ø´ØªØ±Ø§Ùƒ Ù†Ø´Ø· Ø­ØªÙ‰ ${formatDate(tenant.subscriptionEndsAt)}`}
      </div>
      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" style="background:#fff;color:var(--primary);font-weight:900" onclick="phOpenPaymentModal('pro', 1000)"><i class="fas fa-arrow-up"></i> ØªØ±Ù‚ÙŠØ© Ø¥Ù„Ù‰ Pro</button>
        <button class="btn" style="background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.4)" onclick="phOpenPaymentModal('enterprise', 2000)"><i class="fas fa-crown"></i> Enterprise</button>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-history"></i> Ø³Ø¬Ù„ Ø§Ù„Ù…Ø¯ÙÙˆØ¹Ø§Øª</h3></div>
      <div style="overflow-x:auto">
        ${subs.length > 0 ? `
          <table class="ph-table"><thead><tr><th>Ø§Ù„Ù†ÙˆØ¹</th><th>Ø§Ù„Ø®Ø·Ø©</th><th>Ø§Ù„Ù…Ø¨Ù„Øº</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th></tr></thead>
          <tbody>${subs.map(s => `
            <tr><td>${s.type === 'trial' ? 'ÙØªØ±Ø© ØªØ¬Ø±ÙŠØ¨ÙŠØ©' : s.type === 'payment' ? 'Ø¯ÙØ¹Ø©' : 'Ø§Ø´ØªØ±Ø§Ùƒ'}</td><td>${(s.plan || '').toUpperCase()}</td><td>${(s.amount || 0)} Ø¬</td><td>${formatDate(s.createdAt)}</td></tr>
          `).join('')}</tbody></table>
        ` : '<div class="ph-empty"><i class="fas fa-credit-card"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ø¯ÙÙˆØ¹Ø§Øª</h4></div>'}
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
      <div><h1><i class="fas fa-cog"></i> Ø§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª</h1><p>Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª ØµÙŠØ¯Ù„ÙŠØªÙƒ</p></div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-store"></i> Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</h3></div>
      <div class="ph-modal-body">
        <div class="ph-form-grid">
          <div class="ph-form-group full"><label>Ø§Ø³Ù… Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ©</label><input type="text" id="phSName" value="${escapeHtml(tenant.name || '')}"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ù‡Ø§ØªÙ</label><input type="tel" id="phSPhone" value="${escapeHtml(tenant.phone || '')}"></div>
          <div class="ph-form-group"><label>Ø§Ù„Ø¨Ø±ÙŠØ¯</label><input type="email" id="phSEmail" value="${escapeHtml(tenant.email || '')}"></div>
          <div class="ph-form-group full"><label>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</label><input type="text" id="phSAddress" value="${escapeHtml(tenant.address || '')}"></div>
        </div>
        <button class="btn btn-primary" onclick="phSaveSettings()"><i class="fas fa-save"></i> Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ±Ø§Øª</button>
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
  showToast('âœ… ØªÙ… Ø§Ù„Ø­ÙØ¸', 'success');
}

/* ============================================
   43. PHARMACY EXPORTS
   ============================================ */
function phExportExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getProducts().map(p => ({
    'Ø§Ù„Ø§Ø³Ù…': p.name, 'Ø§Ù„Ù…Ø§Ø¯Ø© Ø§Ù„ÙØ¹Ø§Ù„Ø©': p.active || '', 'Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯': p.barcode || '',
    'Ø§Ù„ÙØ¦Ø©': p.category, 'Ø§Ù„Ø³Ø¹Ø±': p.price, 'Ø§Ù„ØªÙƒÙ„ÙØ©': p.cost || '',
    'Ø§Ù„Ù…Ø®Ø²ÙˆÙ†': p.stock, 'Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰': p.minStock
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª');
  XLSX.writeFile(wb, `products-${Date.now()}.xlsx`);
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
}

function phExportOrdersExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getOrders().map(o => ({
    'Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨': o.id, 'Ø§Ù„Ø¹Ù…ÙŠÙ„': o.customerName, 'Ø¹Ø¯Ø¯ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª': o.items.length,
    'Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ': o.total, 'Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹': o.paymentMethod, 'Ø§Ù„ØªØ§Ø±ÙŠØ®': formatDate(o.createdAt)
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø·Ù„Ø¨Ø§Øª');
  XLSX.writeFile(wb, `orders-${Date.now()}.xlsx`);
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
}

function phExportCustomersExcel() {
  if (typeof XLSX === 'undefined') return;
  const data = PH.getCustomers().map(c => ({
    'Ø§Ù„Ø§Ø³Ù…': c.name, 'Ø§Ù„Ù‡Ø§ØªÙ': c.phone, 'Ø§Ù„Ø¨Ø±ÙŠØ¯': c.email || '',
    'Ø§Ù„Ø¹Ù†ÙˆØ§Ù†': c.address || '', 'Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø´Ø±Ø§Ø¡': c.totalSpent || 0, 'Ø¹Ø¯Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª': c.orders || 0
  }));
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡');
  XLSX.writeFile(wb, `customers-${Date.now()}.xlsx`);
  showToast('ØªÙ… ØªØµØ¯ÙŠØ± Excel');
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
      <p style="color:#64748b;margin-top:8px">ØªÙ‚Ø±ÙŠØ± ØµÙŠØ¯Ù„ÙŠØ©</p>
    </div>
    <h2 style="color:#00b884">ðŸ“Š Ù…Ù„Ø®Øµ</h2>
    <table style="width:100%;border-collapse:collapse;margin-bottom:30px;font-size:.9rem">
      <tr style="background:#f0fdf9"><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${products.length}</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„Ø·Ù„Ø¨Ø§Øª</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${orders.length}</td></tr>
      <tr><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${totalRevenue.toLocaleString('ar-EG')} Ø¬</td><td style="padding:12px;border:1px solid #e2e8f0"><strong>Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</strong></td><td style="padding:12px;border:1px solid #e2e8f0">${PH.getCustomers().length}</td></tr>
    </table>
    <h2 style="color:#00b884">ðŸ“¦ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</h2>
    <table style="width:100%;border-collapse:collapse;font-size:.85rem">
      <thead><tr style="background:#00b884;color:#fff"><th style="padding:10px">Ø§Ù„Ø§Ø³Ù…</th><th style="padding:10px">Ø§Ù„ÙØ¦Ø©</th><th style="padding:10px">Ø§Ù„Ø³Ø¹Ø±</th><th style="padding:10px">Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</th></tr></thead>
      <tbody>${products.slice(0, 40).map((p, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}"><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(p.name)}</td><td style="padding:8px;border:1px solid #e2e8f0">${escapeHtml(p.category)}</td><td style="padding:8px;border:1px solid #e2e8f0">${p.price} Ø¬</td><td style="padding:8px;border:1px solid #e2e8f0">${p.stock}</td></tr>`).join('')}</tbody>
    </table>
    <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #e2e8f0;color:#64748b;font-size:.85rem"><p>Â© 2026 ${escapeHtml(tenant.name)}</p></div>
  </div>`;

  showToast('Ø¬Ø§Ø±ÙŠ Ø¥Ù†Ø´Ø§Ø¡ PDF...');
  html2pdf().set({
    margin: 0, filename: `report-${tenant.name}-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(html).save().then(() => showToast('âœ… ØªÙ… Ø§Ù„ØªØ­Ù…ÙŠÙ„'));
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
      <h3><i class="fas fa-credit-card"></i> Ø§Ù„Ø¯ÙØ¹ Ø§Ù„Ø¢Ù…Ù†</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body" id="payBody">
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-size:.85rem;color:var(--text-muted);font-weight:700;letter-spacing:1px;text-transform:uppercase">ØªÙØ¹ÙŠÙ„ Ø¨Ø§Ù‚Ø©</div>
        <h2 style="font-size:2rem;font-weight:900;color:var(--primary);margin:4px 0">${plan.toUpperCase()}</h2>
        <div style="font-size:1.1rem;font-weight:800">${amount.toLocaleString('ar-EG')} Ø¬.Ù… / Ø´Ù‡Ø±ÙŠØ§Ù‹</div>
      </div>
      <div class="card-preview">
        <div class="chip"></div>
        <div class="card-num" id="cardNumDisplay">â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢</div>
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
        <div class="ph-form-group"><label>Ø±Ù‚Ù… Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© <span class="req">*</span></label><input type="text" id="payCardNum" required placeholder="1234 5678 9012 3456" maxlength="19" oninput="formatCardNum(this); updateCardDisplay()"></div>
        <div class="ph-form-group"><label>Ø§Ø³Ù… Ø­Ø§Ù…Ù„ Ø§Ù„Ø¨Ø·Ø§Ù‚Ø© <span class="req">*</span></label><input type="text" id="payCardName" required placeholder="AHMED MOHAMED" oninput="updateCardDisplay()"></div>
        <div class="ph-form-grid">
          <div class="ph-form-group"><label>ØªØ§Ø±ÙŠØ® Ø§Ù„Ø§Ù†ØªÙ‡Ø§Ø¡ <span class="req">*</span></label><input type="text" id="payCardExp" required placeholder="MM/YY" maxlength="5" oninput="formatExp(this); updateCardDisplay()"></div>
          <div class="ph-form-group"><label>CVV <span class="req">*</span></label><input type="text" id="payCardCvv" required placeholder="123" maxlength="4" oninput="this.value=this.value.replace(/\\D/g,'')"></div>
        </div>
        <button type="submit" class="btn btn-primary btn-block" id="payBtn"><i class="fas fa-lock"></i> Ø§Ø¯ÙØ¹ ${amount.toLocaleString('ar-EG')} Ø¬.Ù…</button>
        <p style="text-align:center;font-size:.75rem;color:var(--text-muted);margin-top:12px"><i class="fas fa-shield-alt" style="color:var(--success)"></i> Ø§Ù„Ø¯ÙØ¹ Ø¢Ù…Ù† ÙˆÙ…Ø´ÙØ±</p>
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
  if (nd) nd.textContent = num || 'â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢ â€¢â€¢â€¢â€¢';
  if (nmd) nmd.textContent = (name || 'YOUR NAME').toUpperCase();
  if (ed) ed.textContent = exp || 'MM/YY';
}

function processPayment(e, plan, amount) {
  e.preventDefault();
  const btn = document.getElementById('payBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ø¬Ø§Ø±ÙŠ Ù…Ø¹Ø§Ù„Ø¬Ø© Ø§Ù„Ø¯ÙØ¹...';

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
        <h2 style="font-size:1.5rem;font-weight:900;margin-bottom:8px">ðŸŽ‰ ØªÙ… Ø§Ù„Ø¯ÙØ¹ Ø¨Ù†Ø¬Ø§Ø­!</h2>
        <p style="color:var(--text-muted);margin-bottom:20px">ØªÙ… ØªÙØ¹ÙŠÙ„ Ø¨Ø§Ù‚Ø© ${plan.toUpperCase()} Ù„Ù…Ø¯Ø© 30 ÙŠÙˆÙ…</p>
        <div style="background:var(--bg-alt);padding:16px;border-radius:12px;margin-bottom:20px;text-align:start;font-size:.85rem">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Ø§Ù„Ù…Ø¨Ù„Øº:</span><strong>${amount.toLocaleString('ar-EG')} Ø¬.Ù…</strong></div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px"><span>Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹:</span><strong>${selectedPayBrand.toUpperCase()}</strong></div>
          <div style="display:flex;justify-content:space-between"><span>Ø±Ù‚Ù… Ø§Ù„Ø¹Ù…Ù„ÙŠØ©:</span><strong>TXN-${Date.now().toString().slice(-8)}</strong></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="phCloseModal(); phRenderSubscription();"><i class="fas fa-check"></i> Ø±Ø¬ÙˆØ¹ Ù„ØµÙŠØ¯Ù„ÙŠØªÙŠ</button>
      </div>
    `;
    showToast('âœ… ØªÙ… ØªÙØ¹ÙŠÙ„ Ø§Ù„Ø¨Ø§Ù‚Ø©!', 'success');
    playSound('success');
    pushNotification('ØªÙ… Ø§Ù„Ø¯ÙØ¹ Ø¨Ù†Ø¬Ø§Ø­', `Ø¨Ø§Ù‚Ø© ${plan.toUpperCase()} Ù…ÙØ¹Ù„Ø© Ø§Ù„Ø¢Ù†`);
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
      <div><h1><i class="fas fa-code"></i> API & Ø§Ù„ØªÙƒØ§Ù…Ù„Ø§Øª</h1><p>Ø§Ø±Ø¨Ø· ØµÙŠØ¯Ù„ÙŠØªÙƒ Ù…Ø¹ Ø£ÙŠ Ù†Ø¸Ø§Ù… Ø®Ø§Ø±Ø¬ÙŠ</p></div>
      <button class="btn btn-outline btn-sm" onclick="phGenerateNewAPIKey()"><i class="fas fa-sync"></i> ØªØ¬Ø¯ÙŠØ¯</button>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-key"></i> Ù…ÙØ§ØªÙŠØ­ API</h3></div>
      <div class="ph-modal-body">
        <p style="color:var(--text-muted);font-size:.88rem;margin-bottom:16px">Ø§Ø³ØªØ®Ø¯Ù… Ù‡Ø°Ù‡ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ Ù„Ù„ÙˆØµÙˆÙ„ Ù„Ø¨ÙŠØ§Ù†Ø§Øª ØµÙŠØ¯Ù„ÙŠØªÙƒ Ø¨Ø±Ù…Ø¬ÙŠØ§Ù‹.</p>
        <label style="display:block;font-size:.82rem;font-weight:800;margin-bottom:6px">Public Key</label>
        <div class="api-key-display"><span>${apiKey}</span><button onclick="copyToClipboard('${apiKey}')"><i class="fas fa-copy"></i> Ù†Ø³Ø®</button></div>
        <label style="display:block;font-size:.82rem;font-weight:800;margin:16px 0 6px">Secret Key</label>
        <div class="api-key-display"><span>${'â€¢'.repeat(40)}</span><button onclick="showSecretKey('${apiSecret}')"><i class="fas fa-eye"></i> Ø¥Ø¸Ù‡Ø§Ø±</button></div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head"><h3><i class="fas fa-plug"></i> REST API Endpoints</h3></div>
      <div class="ph-modal-body">
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/products</span><span class="api-desc">Ø¬Ù…ÙŠØ¹ Ù…Ù†ØªØ¬Ø§ØªÙƒ</span></div>
        <div class="api-endpoint"><span class="api-method post">POST</span><span class="api-path">/api/v1/products</span><span class="api-desc">Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/orders</span><span class="api-desc">Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø·Ù„Ø¨Ø§Øª</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/customers</span><span class="api-desc">Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</span></div>
        <div class="api-endpoint"><span class="api-method get">GET</span><span class="api-path">/api/v1/stats/daily</span><span class="api-desc">Ø¥Ø­ØµØ§Ø¦ÙŠØ§Øª Ø§Ù„ÙŠÙˆÙ…</span></div>
      </div>
    </div>
  `;
}

function showSecretKey(key) {
  if (confirm('ØªØ­Ø°ÙŠØ±: Ù…ÙØªØ§Ø­ Ø³Ø±ÙŠ. Ù…ØªØ£ÙƒØ¯ØŸ\n\n' + key.slice(0, 20) + '...')) copyToClipboard(key);
}

function phGenerateNewAPIKey() {
  if (!confirm('âš ï¸ ØªØ¬Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙØ§ØªÙŠØ­ Ø³ÙŠØ¹Ø·Ù„ Ø§Ù„ØªÙƒØ§Ù…Ù„Ø§Øª Ø§Ù„Ø­Ø§Ù„ÙŠØ©. Ù…ØªØ£ÙƒØ¯ØŸ')) return;
  const tenants = DB.getTenants();
  const idx = tenants.findIndex(t => t.id === PH.tenantId);
  if (idx >= 0) {
    tenants[idx].apiKey = 'pk_' + generateRandomKey(32);
    tenants[idx].apiSecret = 'sk_' + generateRandomKey(40);
    DB.setTenants(tenants);
  }
  phRenderAPIKeys();
  showToast('âœ… ØªÙ… Ø§Ù„ØªØ¬Ø¯ÙŠØ¯', 'success');
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
    if (p === 'granted') showToast('âœ… Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ù…ØªØµÙØ­ Ù…ÙØ¹Ù„Ø©', 'success');
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
   AUDIO ENGINE â€” User-gesture aware
   ============================================ */
let audioCtx = null;
let _audioUnlocked = false;

// Ø£ÙˆÙ„ ØªÙØ§Ø¹Ù„ Ù…Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… â†’ Ù†ÙØªØ­ Ø§Ù„Ù€ AudioContext
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
    console.log('[Audio] ðŸ”Š Audio context unlocked');
  } catch (e) {
    console.warn('[Audio] Unlock failed:', e.message);
  }
}

// Ø±Ø¨Ø· Ø§Ù„Ù€ unlock Ø¨Ø£ÙˆÙ„ ØªÙØ§Ø¹Ù„
['click', 'touchstart', 'keydown'].forEach(function(evt) {
  document.addEventListener(evt, _unlockAudio, { once: true, passive: true });
});

/* ============================================
   PLAY SOUND
   ============================================ */
function playSound(type = 'notification') {
  try {
    // Ù„Ùˆ Ù…ÙÙŠØ´ ØªÙØ§Ø¹Ù„ Ù…Ù† Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù… â†’ Ù…ØªØ¹Ù…Ù„Ø´ ØµÙˆØª (ÙŠØ®Ø§Ù„Ù Ù‚ÙˆØ§Ù†ÙŠÙ† Ø§Ù„Ù…ØªØµÙØ­)
    if (!_audioUnlocked) {
      return;
    }

    // Ù„Ùˆ Ø§Ù„Ù€ context Ù…Ø´ Ù…ÙˆØ¬ÙˆØ¯
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    // Ù„Ùˆ Ø§Ù„Ù€ context ÙÙŠ Ø­Ø§Ù„Ø© suspended â†’ Ø­Ø§ÙˆÙ„ ØªØ±Ø¬Ø¹Ù‡
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
      return;
    }

    // Ù„Ùˆ Ø§Ù„Ù€ context Ø§ØªÙ‚ÙÙ„ Ù„Ø£ÙŠ Ø³Ø¨Ø¨
    if (audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    const now = audioCtx.currentTime;

    // Ù†ØºÙ…Ø§Øª Ø­Ø³Ø¨ Ø§Ù„Ù†ÙˆØ¹
    const sounds = {
      notification: [523.25, 659.25],           // C5 â†’ E5
      success: [523.25, 659.25, 783.99],         // C5 â†’ E5 â†’ G5
      error: [330, 220],                         // E4 â†’ A3
      warning: [440, 349.23],                    // A4 â†’ F4
      click: [800],                              // C6 Ù‚ØµÙŠØ±Ø©
      cash: [659.25, 783.99, 1046.5]             // E5 â†’ G5 â†’ C6 (ØµÙˆØª Ø§Ù„ÙƒØ§Ø´ÙŠØ±)
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

      // Envelope Ù†Ø§Ø¹Ù…
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);

      osc.start(t);
      osc.stop(t + 0.4);
    });
  } catch (e) {
    // ÙØ´Ù„ ØµØ§Ù…Øª â€” Ø§Ù„ØµÙˆØª Ù…Ø´ Ø¶Ø±ÙˆØ±ÙŠ
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

  if (q.includes('Ù…Ø¨ÙŠØ¹Ø§Øª') || q.includes('sales') || q.includes('Ø§Ù„ÙŠÙˆÙ…')) {
    const today = new Date().toDateString();
    const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
    const total = todayOrders.reduce((s, o) => s + o.total, 0);
    return `ðŸ“Š Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„ÙŠÙˆÙ…:\n\nâ€¢ Ø¹Ø¯Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª: ${todayOrders.length}\nâ€¢ Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: ${total.toLocaleString('ar-EG')} Ø¬.Ù…\nâ€¢ Ù…ØªÙˆØ³Ø· Ø§Ù„Ø·Ù„Ø¨: ${todayOrders.length ? Math.round(total / todayOrders.length) : 0} Ø¬.Ù…\n\n${todayOrders.length > 5 ? 'ðŸŽ‰ Ø£Ø¯Ø§Ø¡ Ù…Ù…ØªØ§Ø²!' : 'ðŸ’ª Ø§Ø³ØªÙ…Ø±!'}`;
  }
  if (q.includes('Ø®Ù„ØµØª') || q.includes('Ù†ÙˆØ§Ù‚Øµ') || q.includes('stock') || q.includes('Ù…Ø®Ø²ÙˆÙ†')) {
    const low = products.filter(p => p.stock <= p.minStock);
    if (low.length === 0) return 'âœ¨ Ù…Ù…ØªØ§Ø²! ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ù…ØªÙˆÙØ±Ø©.';
    return `âš ï¸ ${low.length} Ù…Ù†ØªØ¬Ø§Øª Ù…Ø­ØªØ§Ø¬Ø© Ø¥Ø¹Ø§Ø¯Ø© Ø·Ù„Ø¨:\n\n${low.slice(0, 5).map(p => `â€¢ ${p.name} (${p.stock} Ù…ØªØ¨Ù‚ÙŠ)`).join('\n')}\n\n${low.length > 5 ? `Ùˆ ${low.length - 5} Ù…Ù†ØªØ¬Ø§Øª Ø£Ø®Ø±Ù‰...\n\n` : ''}Ø£Ù†ØµØ­Ùƒ ØªØ¹Ù…Ù„ Ø·Ù„Ø¨ Ø´Ø±Ø§Ø¡ Ù‚Ø±ÙŠØ¨.`;
  }
  if (q.includes('Ø£ÙØ¶Ù„') || q.includes('Ø§Ù„Ø£ÙƒØ«Ø±') || q.includes('top')) {
    const sales = {};
    orders.forEach(o => o.items.forEach(it => { sales[it.id] = (sales[it.id] || 0) + it.qty; }));
    const top = Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length === 0) return 'Ù„Ø³Ù‡ Ù…ÙÙŠØ´ Ø¨ÙŠØ§Ù†Ø§Øª ÙƒØ§ÙÙŠØ©.';
    return `ðŸ† Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ø§Ù‹:\n\n${top.map((t, i) => `${i + 1}. ${products.find(p => p.id === t[0])?.name || 'Ù…Ù†ØªØ¬'} â€” ${t[1]} Ø·Ù„Ø¨`).join('\n')}`;
  }
  if (q.includes('Ø¹Ù…ÙŠÙ„') || q.includes('customer')) {
    const top = [...customers].sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))[0];
    if (!top) return 'Ù„Ø³Ù‡ Ù…ÙÙŠØ´ Ø¨ÙŠØ§Ù†Ø§Øª Ø¹Ù…Ù„Ø§Ø¡.';
    return `ðŸ‘¤ Ø£ÙƒØ¨Ø± Ø¹Ù…ÙŠÙ„:\n\nâ€¢ Ø§Ù„Ø§Ø³Ù…: ${top.name}\nâ€¢ Ø§Ù„Ù‡Ø§ØªÙ: ${top.phone}\nâ€¢ Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø´Ø±Ø§Ø¡: ${(top.totalSpent || 0).toLocaleString('ar-EG')} Ø¬.Ù…\nâ€¢ Ø¹Ø¯Ø¯ Ø§Ù„Ø·Ù„Ø¨Ø§Øª: ${top.orders || 0}\n\nðŸ’¡ Ù†ØµÙŠØ­Ø©: Ø§Ø¨Ø¹ØªÙ„Ù‡ Ø¹Ø±Ø¶ Ø®Ø§Øµ!`;
  }
  if (q.includes('Ø¥ÙŠØ±Ø§Ø¯') || q.includes('revenue') || q.includes('Ø±Ø¨Ø­')) {
    const total = orders.reduce((s, o) => s + o.total, 0);
    return `ðŸ’° Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª:\n\n${total.toLocaleString('ar-EG')} Ø¬.Ù… Ù…Ù† ${orders.length} Ø·Ù„Ø¨\nâ€¢ Ù…ØªÙˆØ³Ø· Ø§Ù„Ø·Ù„Ø¨: ${orders.length ? Math.round(total / orders.length) : 0} Ø¬.Ù…`;
  }
  if (q.includes('Ù…Ù†ØªØ¬') || q.includes('products')) {
    return `ðŸ“¦ Ø¹Ù†Ø¯Ùƒ ${products.length} Ù…Ù†ØªØ¬\n\nâ€¢ Ù…ØªÙˆÙØ±Ø©: ${products.filter(p => p.stock > 0).length}\nâ€¢ Ù†ÙØ°Øª: ${products.filter(p => p.stock === 0).length}`;
  }
  if (q.includes('Ø³Ø§Ø¹Ø¯Ù†ÙŠ') || q.includes('help') || q.includes('Ù…Ø³Ø§Ø¹Ø¯Ø©')) {
    return 'Ø£Ù‚Ø¯Ø± Ø£Ø³Ø§Ø¹Ø¯Ùƒ ÙÙŠ:\n\nðŸ“Š Ù…Ø¨ÙŠØ¹Ø§ØªÙƒ\nâš ï¸ Ù†ÙˆØ§Ù‚Øµ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†\nðŸ† Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ø§Ù‹\nðŸ‘¤ Ø£ÙƒØ¨Ø± Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡\nðŸ’° Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª\nðŸ“¦ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª';
  }
  return 'Ù…Ø¹Ù„Ø´ØŒ Ù…Ø´ ÙØ§Ù‡Ù… ðŸ¤”\n\nØ¬Ø±Ø¨ ØªØ³Ø£Ù„Ù†ÙŠ Ø¹Ù†:\nâ€¢ "Ù…Ø¨ÙŠØ¹Ø§ØªÙŠ Ø§Ù„ÙŠÙˆÙ…"\nâ€¢ "Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„Ù„ÙŠ Ø®Ù„ØµØª"\nâ€¢ "Ø£ÙØ¶Ù„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª"\nâ€¢ "Ø£ÙƒØ¨Ø± Ø¹Ù…ÙŠÙ„"';
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
    ? { id: 'main', name: 'Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ' }
    : branches.find(b => b.id === current) || { id: 'main', name: 'Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ' };
  sel.innerHTML = `
    <i class="fas fa-store"></i>
    <div class="branch-selector-info">
      <span>Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø­Ø§Ù„ÙŠ</span>
      <strong>${escapeHtml(currentBranch.name)}</strong>
    </div>
    <i class="fas fa-chevron-down" style="font-size:.75rem"></i>
  `;
}

function phOpenBranchSwitcher() {
  const branches = [{ id: 'main', name: 'Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ' }, ...PH.getBranches()];
  const current = PH.getCurrentBranch();
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-store"></i> Ø§Ø®ØªÙŠØ§Ø± Ø§Ù„ÙØ±Ø¹</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <div class="ph-modal-body">
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:14px">ÙƒÙ„ ÙØ±Ø¹ Ù„Ù‡ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³ØªÙ‚Ù„Ø© (Ù…Ù†ØªØ¬Ø§ØªØŒ Ø·Ù„Ø¨Ø§ØªØŒ Ø¹Ù…Ù„Ø§Ø¡).</p>
      <div style="display:grid;gap:12px">
        ${branches.map(b => `
          <div class="branch-card ${b.id === current ? 'active' : ''}" onclick="phSetCurrentBranch('${b.id}'); phCloseModal();">
            <h4><i class="fas fa-store"></i> ${escapeHtml(b.name)}</h4>
            ${b.address ? `<p><i class="fas fa-map-marker-alt"></i> ${escapeHtml(b.address)}</p>` : ''}
          </div>
        `).join('')}
      </div>
      <button class="btn btn-primary btn-block" style="margin-top:16px" onclick="phOpenAddBranch()"><i class="fas fa-plus"></i> Ø¥Ø¶Ø§ÙØ© ÙØ±Ø¹ Ø¬Ø¯ÙŠØ¯</button>
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
    ? 'Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ'
    : (PH.getBranches().find(b => b.id === branchId)?.name || 'ÙØ±Ø¹');
  showToast(`âœ… ØªÙ… Ø§Ù„ØªØ¨Ø¯ÙŠÙ„ Ø¥Ù„Ù‰ "${branchName}"`, 'success');
}

function phOpenAddBranch() {
  document.getElementById('phModalBox').innerHTML = `
    <div class="ph-modal-head">
      <h3><i class="fas fa-store"></i> ÙØ±Ø¹ Ø¬Ø¯ÙŠØ¯</h3>
      <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
    </div>
    <form onsubmit="phSaveBranch(event)">
      <div class="ph-modal-body">
        <div class="ph-form-group"><label>Ø§Ø³Ù… Ø§Ù„ÙØ±Ø¹ <span class="req">*</span></label><input type="text" id="brName" required></div>
        <div class="ph-form-group"><label>Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</label><input type="text" id="brAddress"></div>
        <div class="ph-form-group"><label>Ø§Ù„Ù‡Ø§ØªÙ</label><input type="tel" id="brPhone"></div>
        <div class="ph-form-group"><label>Ø§Ù„Ù…Ø¯ÙŠØ±</label><input type="text" id="brManager"></div>
      </div>
      <div class="ph-modal-foot">
        <button type="button" class="btn btn-outline" onclick="phCloseModal()">Ø¥Ù„ØºØ§Ø¡</button>
        <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Ø­ÙØ¸</button>
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
  showToast('âœ… ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„ÙØ±Ø¹', 'success');
  if (phCurrentPage === 'branches') phRenderBranches();
}

function phRenderBranches() {
  const branches = [{ id: 'main', name: 'Ø§Ù„ÙØ±Ø¹ Ø§Ù„Ø±Ø¦ÙŠØ³ÙŠ', isMain: true }, ...PH.getBranches()];
  const current = PH.getCurrentBranch();
  document.getElementById('phContent').innerHTML = `
    <div class="ph-page-head">
      <div><h1><i class="fas fa-store"></i> Ø§Ù„ÙØ±ÙˆØ¹</h1><p>${branches.length} ÙØ±Ø¹ â€” ÙƒÙ„ ÙØ±Ø¹ Ù„Ù‡ Ø¨ÙŠØ§Ù†Ø§Øª Ù…Ø³ØªÙ‚Ù„Ø©</p></div>
      <button class="btn btn-primary btn-sm" onclick="phOpenAddBranch()"><i class="fas fa-plus"></i> ÙØ±Ø¹ Ø¬Ø¯ÙŠØ¯</button>
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
              <div class="branch-card-stat"><strong>${products.length}</strong><span>Ù…Ù†ØªØ¬</span></div>
              <div class="branch-card-stat"><strong>${customers.length}</strong><span>Ø¹Ù…ÙŠÙ„</span></div>
              <div class="branch-card-stat"><strong>${todayOrders.length}</strong><span>Ø·Ù„Ø¨ Ø§Ù„ÙŠÙˆÙ…</span></div>
              <div class="branch-card-stat"><strong>${todayRevenue.toLocaleString('ar-EG')}</strong><span>Ø¥ÙŠØ±Ø§Ø¯ Ø§Ù„ÙŠÙˆÙ…</span></div>
            </div>
            ${!b.isMain ? `<button class="btn btn-outline btn-sm" style="width:100%;margin-top:12px" onclick="event.stopPropagation(); phDeleteBranch('${b.id}')"><i class="fas fa-trash"></i> Ø­Ø°Ù</button>` : ''}
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
    title: 'Ø­Ø°Ù Ø§Ù„ÙØ±Ø¹',
    message: 'Ø³ÙŠØªÙ… Ø­Ø°Ù Ø§Ù„ÙØ±Ø¹ ÙˆÙƒÙ„ Ø¨ÙŠØ§Ù†Ø§ØªÙ‡ Ù†Ù‡Ø§Ø¦ÙŠØ§Ù‹.\n\nÙ‡Ù„ Ø£Ù†Øª Ù…ØªØ£ÙƒØ¯ØŸ',
    confirmText: 'Ù†Ø¹Ù…ØŒ Ø§Ø­Ø°Ù',
    cancelText: 'Ø¥Ù„ØºØ§Ø¡'
  }).then(function(ok) {
    if (!ok) return;
    const tenantId = PH.tenantId;
    ['products', 'orders', 'customers', 'attendance', 'prescriptions'].forEach(function(key) {
      localStorage.removeItem('pc_' + tenantId + '_' + key + '_branch_' + id);
    });
    PH.setBranches(PH.getBranches().filter(b => b.id !== id));
    if (PH.getCurrentBranch() === id) phSetCurrentBranch('main');
    phRenderBranches();
    showToast('ØªÙ… Ø§Ù„Ø­Ø°Ù', 'warning');
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
      <div><h1><i class="fas fa-chart-bar"></i> Ù„ÙˆØ­Ø© BI Ø§Ù„Ù…ØªÙ‚Ø¯Ù…Ø©</h1><p>ØªØ­Ù„ÙŠÙ„Ø§Øª Ø¹Ù…ÙŠÙ‚Ø© ÙˆØ±Ø¤Ù‰ Ø°ÙƒÙŠØ©</p></div>
      <button class="btn btn-outline btn-sm" onclick="phExportPDF()"><i class="fas fa-file-pdf"></i> ØªØµØ¯ÙŠØ±</button>
    </div>
    <div class="bi-grid">
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-coins"></i> Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 18.4%</div>
        </div>
        <div class="bi-value-big">${totalRevenue.toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">Ø¬.Ù… Ù…Ù† ${orders.length} Ø·Ù„Ø¨</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-shopping-basket"></i> Ù…ØªÙˆØ³Ø· Ø§Ù„Ø·Ù„Ø¨</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 6.2%</div>
        </div>
        <div class="bi-value-big">${Math.round(avgOrder).toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">Ø¬.Ù… Ù„ÙƒÙ„ Ø·Ù„Ø¨</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-boxes"></i> Ù‚ÙŠÙ…Ø© Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</div>
          <div class="bi-value-change down"><i class="fas fa-arrow-down"></i> 2.1%</div>
        </div>
        <div class="bi-value-big">${totalStockValue.toLocaleString('ar-EG')}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">Ø¬.Ù… ÙÙŠ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-users"></i> Ø¹Ù…Ù„Ø§Ø¡</div>
          <div class="bi-value-change"><i class="fas fa-arrow-up"></i> 24%</div>
        </div>
        <div class="bi-value-big">${customers.length}</div>
        <div style="font-size:.82rem;color:var(--text-muted)">Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡</div>
      </div>
    </div>
    <div class="bi-grid" style="grid-template-columns:2fr 1fr">
      <div class="bi-widget">
        <div class="bi-widget-head">
          <div class="bi-widget-title"><i class="fas fa-chart-line"></i> Ø§ØªØ¬Ø§Ù‡ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯Ø§Øª</div>
          <div class="bi-period">
            <button class="active" onclick="phChangeBIPeriod(this, 7)">7 Ø£ÙŠØ§Ù…</button>
            <button onclick="phChangeBIPeriod(this, 30)">30 ÙŠÙˆÙ…</button>
            <button onclick="phChangeBIPeriod(this, 90)">3 Ø´Ù‡ÙˆØ±</button>
          </div>
        </div>
        <div class="bi-chart"><canvas id="biRevenueChart"></canvas></div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-fire"></i> Ø§Ù„Ø£ÙƒØ«Ø± Ù…Ø¨ÙŠØ¹Ø§Ù‹</div></div>
        <div class="bi-top-list">
          ${(() => {
            const sales = {};
            orders.forEach(o => o.items.forEach(it => { sales[it.id] = (sales[it.id] || 0) + it.qty; }));
            const top = Object.entries(sales).sort((a, b) => b[1] - a[1]).slice(0, 5);
            return top.map((t, i) => {
              const p = products.find(x => x.id === t[0]);
              return `<div class="bi-top-item"><div class="bi-top-rank">${i + 1}</div><div class="bi-top-info"><strong>${escapeHtml(p?.name || 'Ù…Ù†ØªØ¬')}</strong><span>${p?.category || ''}</span></div><div class="bi-top-value">${t[1]}</div></div>`;
            }).join('') || '<div style="text-align:center;padding:20px;color:var(--text-muted)">Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¨ÙŠØ§Ù†Ø§Øª</div>';
          })()}
        </div>
      </div>
    </div>
    <div class="bi-grid" style="grid-template-columns:1fr 1fr">
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-clock"></i> Ø£ÙˆÙ‚Ø§Øª Ø§Ù„Ø°Ø±ÙˆØ©</div></div>
        <div class="bi-chart"><canvas id="biPeakChart"></canvas></div>
      </div>
      <div class="bi-widget">
        <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-th-large"></i> Ø£Ø¯Ø§Ø¡ Ø§Ù„ÙØ¦Ø§Øª</div></div>
        <div class="bi-chart"><canvas id="biCatPerfChart"></canvas></div>
      </div>
    </div>
    <div class="bi-widget" style="margin-top:20px">
      <div class="bi-widget-head"><div class="bi-widget-title"><i class="fas fa-calendar-alt"></i> Ø®Ø±ÙŠØ·Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ø§Ù„Ø£Ø³Ø¨ÙˆØ¹ÙŠØ©</div></div>
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
  const days = ['Ø§Ù„Ø£Ø­Ø¯', 'Ø§Ù„Ø¥Ø«Ù†ÙŠÙ†', 'Ø§Ù„Ø«Ù„Ø§Ø«Ø§Ø¡', 'Ø§Ù„Ø£Ø±Ø¨Ø¹Ø§Ø¡', 'Ø§Ù„Ø®Ù…ÙŠØ³', 'Ø§Ù„Ø¬Ù…Ø¹Ø©', 'Ø§Ù„Ø³Ø¨Øª'];
  const orders = PH.getOrders();
  const data = days.map((d, i) => orders.filter(o => new Date(o.createdAt).getDay() === i).length);
  const max = Math.max(...data, 1);
  heatmap.innerHTML = days.map((day, i) => {
    const intensity = data[i] / max;
    const colors = ['rgba(0,184,132,.15)', 'rgba(0,184,132,.35)', 'rgba(0,184,132,.55)', 'rgba(0,184,132,.75)', 'rgba(0,184,132,.95)'];
    const color = colors[Math.min(4, Math.floor(intensity * 5))];
    return `<div class="bi-heatmap-cell" style="background:${color}" title="${day}: ${data[i]} Ø·Ù„Ø¨"></div>`;
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
      <div><h1><i class="fas fa-globe"></i> Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†</h1><p>Ø§Ø³ØªÙ‚Ø¨Ù„ Ø·Ù„Ø¨Ø§Øª Ù…Ù† Ø¹Ù…Ù„Ø§Ø¦Ùƒ Ù…Ø¨Ø§Ø´Ø±Ø©</p></div>
    </div>
    <div class="online-orders-banner">
      <i class="fas fa-store big-icon"></i>
      <div class="online-orders-banner-body">
        <h3>Ø´Ø§Ø±Ùƒ Ø±Ø§Ø¨Ø· ØµÙŠØ¯Ù„ÙŠØªÙƒ Ù…Ø¹ Ø¹Ù…Ù„Ø§Ø¦Ùƒ</h3>
        <p>Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡ ÙŠÙ‚Ø¯Ø±ÙˆØ§ ÙŠØ·Ù„Ø¨ÙˆØ§ Ø£Ø¯ÙˆÙŠØªÙ‡Ù… Ù…Ø¨Ø§Ø´Ø±Ø©ØŒ ÙˆØ§Ù„Ø·Ù„Ø¨Ø§Øª Ù‡ØªÙˆØµÙ„Ùƒ ØªÙ„Ù‚Ø§Ø¦ÙŠØ§Ù‹</p>
        <div class="online-orders-link">
          <i class="fas fa-link"></i>
          <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis">${publicUrl}</span>
          <button onclick="copyToClipboard('${publicUrl}')"><i class="fas fa-copy"></i> Ù†Ø³Ø®</button>
        </div>
      </div>
    </div>
    <div class="ph-table-card">
      <div class="ph-table-head">
        <h3><i class="fas fa-globe"></i> Ø§Ù„Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ø£ÙˆÙ†Ù„Ø§ÙŠÙ†</h3>
        <span class="ph-badge ph-badge-orange">${onlineOrders.length} Ø·Ù„Ø¨</span>
      </div>
      <div style="overflow-x:auto">
        ${onlineOrders.length > 0 ? `
          <table class="ph-table">
            <thead><tr><th>Ø±Ù‚Ù…</th><th>Ø§Ù„Ø¹Ù…ÙŠÙ„</th><th>Ø§Ù„Ù‡Ø§ØªÙ</th><th>Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ</th><th>Ø§Ù„Ø­Ø§Ù„Ø©</th><th>Ø§Ù„ØªØ§Ø±ÙŠØ®</th></tr></thead>
            <tbody>${onlineOrders.map(o => `
              <tr>
                <td><strong>${o.id}</strong></td>
                <td>${escapeHtml(o.customerName)}</td>
                <td>${escapeHtml(o.customerPhone || 'â€”')}</td>
                <td><strong style="color:var(--primary)">${o.total} Ø¬</strong></td>
                <td><span class="ph-badge ph-badge-orange">${o.status === 'pending' ? 'Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±' : 'Ù…ÙƒØªÙ…Ù„'}</span></td>
                <td>${formatDate(o.createdAt)}</td>
              </tr>
            `).join('')}</tbody>
          </table>
        ` : '<div class="ph-empty"><i class="fas fa-inbox"></i><h4>Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª Ø£ÙˆÙ†Ù„Ø§ÙŠÙ† Ø¨Ø¹Ø¯</h4></div>'}
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
    showToast('Ø§Ù„ØµÙŠØ¯Ù„ÙŠØ© ØºÙŠØ± Ù…ÙˆØ¬ÙˆØ¯Ø©', 'error');
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
      <div class="price">${p.price} Ø¬</div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-top:4px">${p.stock > 0 ? 'Ù…ØªÙˆÙØ±' : 'Ù†ÙØ°'}</div>
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
      <div class="price">${p.price} Ø¬</div>
    </div>
  `).join('');
}

function publicAddToCart(id) {
  if (!publicTenant) return;
  const product = DB.getTenantData(publicTenant.id, 'products').find(p => p.id === id);
  if (!product) return;
  if (product.stock <= 0) { showToast('ØºÙŠØ± Ù…ØªÙˆÙØ±', 'warning'); return; }
  const existing = publicCart.find(c => c.id === id);
  if (existing) existing.qty++;
  else publicCart.push({ id, name: product.name, price: product.price, qty: 1 });
  const total = publicCart.reduce((s, c) => s + c.price * c.qty, 0);
  const sticky = document.getElementById('publicCartSticky');
  document.getElementById('publicCartTotal').textContent = total.toLocaleString('ar-EG') + ' Ø¬';
  sticky.style.display = 'flex';
  showToast(`âœ… ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© ${product.name}`, 'success');
}

function publicCheckout() {
  if (publicCart.length === 0) return;
  const name = prompt('Ø§Ø³Ù…Ùƒ:'); if (!name) return;
  const phone = prompt('Ø±Ù‚Ù… Ù‡Ø§ØªÙÙƒ:'); if (!phone) return;
  const address = prompt('Ø§Ù„Ø¹Ù†ÙˆØ§Ù† Ø¨Ø§Ù„ØªÙØµÙŠÙ„:'); if (!address) return;
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
  showToast('âœ… ØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø·Ù„Ø¨Ùƒ! Ù‡ÙŠØªÙˆØ§ØµÙ„ÙˆØ§ Ù…Ø¹Ø§Ùƒ Ù‚Ø±ÙŠØ¨', 'success');
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
        showToast('Ø§Ù„Ø¬Ù„Ø³Ø© Ø§Ù†ØªÙ‡Øª â€” Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ Ù…Ù† Ø¬Ø¯ÙŠØ¯', 'warning');
        return;
      }
    }
    setTimeout(() => showPlaceholder(session), 400);
  }

  setTimeout(() => {
    const s = DB.getSession();
    if (s && s.role !== 'superadmin' && document.getElementById('phApp')?.classList.contains('active')) {
      pushNotification('ðŸŽ‰ Ù…Ø±Ø­Ø¨Ø§Ù‹ Ø¨Ùƒ ÙÙŠ PharmaCloud', 'Ø§Ù„Ù†Ø³Ø®Ø© Ø§Ù„Ù…Ø·ÙˆØ±Ø© Ø¨Ø£Ø¯ÙˆØ§Øª AI Ùˆ BI Ùˆ API Ù…ØªÙˆÙØ±Ø© Ø§Ù„Ø¢Ù†');
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
console.log('âœ… PharmaCloud Pro v2.0.0 Loaded Successfully');