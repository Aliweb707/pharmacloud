/* ============================================
   PHARMACLOUD - 2FA v1.0
   TOTP (Google Authenticator) + Backup Codes
   ============================================ */
'use strict';

(function() {
  if (window.__PC_TWO_FA__) return;
  window.__PC_TWO_FA__ = true;

  const TFA = {
    storageKey: 'pc_2fa',
    config: {},
    currentSession: null
  };

  /* ============================================
     1. LOAD 2FA SDK (OTPAuth)
     ============================================ */
  async function loadOTPAuth() {
    if (window.OTPAuth) return window.OTPAuth;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/otpauth@9/dist/otpauth.min.js';
      script.onload = () => resolve(window.OTPAuth);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /* ============================================
     2. BASE32 ENCODING (RFC 4648)
     ============================================ */
  const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function generateSecret(length = 32) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    let secret = '';
    for (let i = 0; i < length; i++) {
      secret += BASE32[bytes[i] % 32];
    }
    return secret;
  }

  /* ============================================
     3. TOTP GENERATION (RFC 6238)
     ============================================ */
  async function generateTOTP(secret, period = 30, digits = 6) {
    const key = base32Decode(secret);
    const counter = Math.floor(Date.now() / 1000 / period);
    const counterBytes = new ArrayBuffer(8);
    const view = new DataView(counterBytes);
    view.setUint32(4, counter, false);

    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
    const hash = new Uint8Array(signature);

    const offset = hash[hash.length - 1] & 0xf;
    const code = ((hash[offset] & 0x7f) << 24 |
                  (hash[offset + 1] & 0xff) << 16 |
                  (hash[offset + 2] & 0xff) << 8 |
                  (hash[offset + 3] & 0xff)) % Math.pow(10, digits);

    return String(code).padStart(digits, '0');
  }

  function base32Decode(str) {
    const clean = str.replace(/=+$/, '').toUpperCase();
    const len = clean.length;
    const bytes = [];
    let bits = 0, value = 0;

    for (let i = 0; i < len; i++) {
      const idx = BASE32.indexOf(clean[i]);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return new Uint8Array(bytes);
  }

  /* ============================================
     4. VERIFY TOTP
     ============================================ */
  async function verifyTOTP(secret, token, window = 1) {
    if (!token) return false;
    const period = 30;
    const now = Math.floor(Date.now() / 1000 / period);

    for (let i = -window; i <= window; i++) {
      const t = now + i;
      const counterBytes = new ArrayBuffer(8);
      const view = new DataView(counterBytes);
      view.setUint32(4, t, false);

      const key = base32Decode(secret);
      const cryptoKey = await crypto.subtle.importKey(
        'raw', key, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
      );
      const signature = await crypto.subtle.sign('HMAC', cryptoKey, counterBytes);
      const hash = new Uint8Array(signature);
      const offset = hash[hash.length - 1] & 0xf;
      const code = ((hash[offset] & 0x7f) << 24 |
                    (hash[offset + 1] & 0xff) << 16 |
                    (hash[offset + 2] & 0xff) << 8 |
                    (hash[offset + 3] & 0xff)) % 1000000;

      if (String(code).padStart(6, '0') === String(token).padStart(6, '0')) {
        return true;
      }
    }
    return false;
  }

  /* ============================================
     5. BACKUP CODES
     ============================================ */
  function generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      const code = Array.from(bytes)
        .map(b => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, 8)
        .toUpperCase()
        .replace(/(.{4})/g, '$1-')
        .replace(/-$/, '');
      codes.push(code);
    }
    return codes;
  }

  function hashBackupCode(code) {
    let hash = 0;
    for (let i = 0; i < code.length; i++) {
      hash = ((hash << 5) - hash) + code.charCodeAt(i);
      hash = hash & hash;
    }
    return 'bc_' + Math.abs(hash).toString(36);
  }

  /* ============================================
     6. QR CODE GENERATOR (canvas-based)
     ============================================ */
  function generateQRCode(text, size = 200) {
    // Simple QR code via Google Chart API (offline-friendly alternative: use qrcode library)
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
  }

  /* ============================================
     7. SETUP FLOW
     ============================================ */
  async function startSetup(userEmail) {
    const secret = generateSecret(32);
    const issuer = 'PharmaCloud';
    const label = userEmail || 'user@pharmacloud.app';

    const otpauthUrl = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(label)}` +
      `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

    const qrUrl = generateQRCode(otpauthUrl, 240);

    return {
      secret,
      otpauthUrl,
      qrUrl,
      issuer,
      label
    };
  }

  /* ============================================
     8. ENABLE 2FA
     ============================================ */
  async function enable2FA(userId, secret, verificationCode) {
    const valid = await verifyTOTP(secret, verificationCode);
    if (!valid) return { success: false, error: 'رمز التحقق غير صحيح' };

    const backupCodes = generateBackupCodes(10);
    const hashedBackups = backupCodes.map(c => hashBackupCode(c));

    const config = {
      userId,
      secret,
      backupCodes: hashedBackups,
      enabledAt: new Date().toISOString(),
      lastUsed: null,
      failedAttempts: 0,
      lockedUntil: null
    };

    try {
      const all = JSON.parse(localStorage.getItem(TFA.storageKey) || '{}');
      all[userId] = config;
      localStorage.setItem(TFA.storageKey, JSON.stringify(all));
    } catch (e) {}

    TFA.config = config;

    return {
      success: true,
      backupCodes
    };
  }

  function disable2FA(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(TFA.storageKey) || '{}');
      delete all[userId];
      localStorage.setItem(TFA.storageKey, JSON.stringify(all));
      TFA.config = {};
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  function is2FAEnabled(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(TFA.storageKey) || '{}');
      return !!(all[userId] && all[userId].secret);
    } catch (e) {
      return false;
    }
  }

  function getConfig(userId) {
    try {
      const all = JSON.parse(localStorage.getItem(TFA.storageKey) || '{}');
      return all[userId] || null;
    } catch (e) {
      return null;
    }
  }

  /* ============================================
     9. VERIFY LOGIN
     ============================================ */
  async function verifyLogin(userId, code) {
    const config = getConfig(userId);
    if (!config) return { success: true, skipped: true };

    // Check lock
    if (config.lockedUntil && Date.now() < config.lockedUntil) {
      const remaining = Math.ceil((config.lockedUntil - Date.now()) / 1000 / 60);
      return { success: false, error: `الحساب مقفول — حاول بعد ${remaining} دقيقة`, locked: true };
    }

    const clean = String(code).replace(/\s|-/g, '').toUpperCase();

    // Try TOTP first (6 digits)
    if (/^\d{6}$/.test(clean)) {
      const valid = await verifyTOTP(config.secret, clean);
      if (valid) return { success: true, method: 'totp' };
    }

    // Try backup code
    const codeHash = hashBackupCode(clean);
    if (config.backupCodes && config.backupCodes.includes(codeHash)) {
      // Remove used backup code
      config.backupCodes = config.backupCodes.filter(c => c !== codeHash);
      saveConfig(userId, config);
      return { success: true, method: 'backup', remaining: config.backupCodes.length };
    }

    // Failed
    config.failedAttempts = (config.failedAttempts || 0) + 1;
    if (config.failedAttempts >= 5) {
      config.lockedUntil = Date.now() + 15 * 60 * 1000;
      config.failedAttempts = 0;
    }
    saveConfig(userId, config);

    return {
      success: false,
      error: 'رمز غير صحيح',
      attemptsLeft: 5 - config.failedAttempts
    };
  }

  function saveConfig(userId, config) {
    try {
      const all = JSON.parse(localStorage.getItem(TFA.storageKey) || '{}');
      all[userId] = config;
      localStorage.setItem(TFA.storageKey, JSON.stringify(all));
    } catch (e) {}
  }

  /* ============================================
     10. UI MODAL
     ============================================ */
  function openSetupModal(userId, userEmail) {
    const modal = document.getElementById('phModalBox');
    if (!modal) return;

    (async () => {
      const setup = await startSetup(userEmail);

      modal.innerHTML = `
        <div class="tfa-modal-head">
          <div class="tfa-icon-wrap">
            <i class="fas fa-shield-alt"></i>
          </div>
          <div>
            <h3>المصادقة الثنائية (2FA)</h3>
            <p>حماية إضافية لحسابك</p>
          </div>
          <button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="ph-modal-body tfa-body">
          <div class="tfa-step active" data-step="1">
            <div class="tfa-step-head">
              <span class="tfa-step-num">1</span>
              <div>
                <strong>ثبّت تطبيق المصادقة</strong>
                <small>Google Authenticator / Authy / 1Password</small>
              </div>
            </div>
            <div class="tfa-apps">
              <a href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2" target="_blank" class="tfa-app-btn">
                <i class="fab fa-google-play"></i> Google Play
              </a>
              <a href="https://apps.apple.com/app/google-authenticator/id388497605" target="_blank" class="tfa-app-btn">
                <i class="fab fa-apple"></i> App Store
              </a>
            </div>
          </div>

          <div class="tfa-step active" data-step="2">
            <div class="tfa-step-head">
              <span class="tfa-step-num">2</span>
              <div>
                <strong>امسح رمز QR</strong>
                <small>أو أدخل المفتاح يدوياً</small>
              </div>
            </div>
            <div class="tfa-qr-box">
              <img src="${setup.qrUrl}" alt="QR Code" class="tfa-qr-img">
            </div>
            <div class="tfa-manual-key">
              <label>المفتاح السري (احتفظ به في مكان آمن)</label>
              <div class="tfa-key-display">
                <code>${setup.secret.match(/.{1,4}/g).join(' ')}</code>
                <button class="tfa-copy-btn" onclick="TwoFactor.copy('${setup.secret}')">
                  <i class="fas fa-copy"></i>
                </button>
              </div>
            </div>
          </div>

          <div class="tfa-step active" data-step="3">
            <div class="tfa-step-head">
              <span class="tfa-step-num">3</span>
              <div>
                <strong>أدخل الرمز المكوّن من 6 أرقام</strong>
                <small>لتأكيد الإعداد</small>
              </div>
            </div>
            <div class="tfa-code-inputs">
              ${[1,2,3,4,5,6].map(i => `
                <input type="text" inputmode="numeric" maxlength="1"
                       class="tfa-code-digit" data-idx="${i}"
                       oninput="TwoFactor.handleDigitInput(this, ${i})"
                       onkeydown="TwoFactor.handleDigitKey(event, this, ${i})"
                       onpaste="TwoFactor.handlePaste(event, this, ${i})">
              `).join('')}
            </div>
            <div id="tfa-error" class="tfa-error"></div>
          </div>
        </div>
        <div class="ph-modal-foot">
          <button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
          <button class="btn btn-primary" id="tfa-enable-btn" onclick="TwoFactor.confirmEnable('${userId}', '${setup.secret}')">
            <i class="fas fa-shield-alt"></i> تفعيل 2FA
          </button>
        </div>
      `;

      document.getElementById('phModalOverlay').classList.add('open');
      setTimeout(() => document.querySelector('.tfa-code-digit')?.focus(), 300);

    })();
  }

  function handleDigitInput(el, idx) {
    const val = el.value.replace(/\D/g, '');
    el.value = val.slice(-1);
    if (val && idx < 6) {
      document.querySelector(`.tfa-code-digit[data-idx="${idx + 1}"]`)?.focus();
    }
  }

  function handleDigitKey(e, el, idx) {
    if (e.key === 'Backspace' && !el.value && idx > 1) {
      document.querySelector(`.tfa-code-digit[data-idx="${idx - 1}"]`)?.focus();
    }
    if (e.key === 'Enter') {
      const btn = document.getElementById('tfa-enable-btn');
      if (btn) btn.click();
    }
  }

  function handlePaste(e, el, idx) {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
    for (let i = 0; i < text.length; i++) {
      const target = document.querySelector(`.tfa-code-digit[data-idx="${i + 1}"]`);
      if (target) target.value = text[i];
    }
    document.querySelector('.tfa-code-digit[data-idx="6"]')?.focus();
  }

  async function confirmEnable(userId, secret) {
    const code = Array.from(document.querySelectorAll('.tfa-code-digit'))
      .map(el => el.value).join('');

    if (code.length !== 6) {
      showError('أدخل 6 أرقام');
      return;
    }

    const btn = document.getElementById('tfa-enable-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';

    const result = await enable2FA(userId, secret, code);

    if (result.success) {
      showBackupCodes(userId, result.backupCodes);
    } else {
      showError(result.error || 'فشل التحقق');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-shield-alt"></i> تفعيل 2FA';
    }
  }

  function showBackupCodes(userId, codes) {
    const modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML = `
      <div class="tfa-modal-head success">
        <div class="tfa-icon-wrap success">
          <i class="fas fa-check"></i>
        </div>
        <div>
          <h3>✅ تم تفعيل 2FA بنجاح!</h3>
          <p>احفظ رموز الاسترداد في مكان آمن</p>
        </div>
      </div>
      <div class="ph-modal-body tfa-body">
        <div class="tfa-warning">
          <i class="fas fa-exclamation-triangle"></i>
          <span>لن تظهر هذه الرموز مرة أخرى. احفظها الآن!</span>
        </div>
        <div class="tfa-backup-grid">
          ${codes.map(c => `<div class="tfa-backup-code">${c}</div>`).join('')}
        </div>
        <div class="tfa-backup-actions">
          <button class="tfa-copy-btn-large" onclick="TwoFactor.copyBackupCodes(${JSON.stringify(codes).replace(/"/g, '&quot;')})">
            <i class="fas fa-copy"></i> نسخ كل الرموز
          </button>
          <button class="tfa-download-btn-large" onclick="TwoFactor.downloadBackupCodes(${JSON.stringify(codes).replace(/"/g, '&quot;')})">
            <i class="fas fa-download"></i> تحميل
          </button>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button class="btn btn-primary" onclick="phCloseModal()">
          <i class="fas fa-check"></i> حفظتها — تابع
        </button>
      </div>
    `;
  }

  function showError(msg) {
    const el = document.getElementById('tfa-error');
    if (el) el.textContent = msg;
  }

  function openVerifyModal(userId, onSuccess, onCancel) {
    const modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML = `
      <div class="tfa-modal-head">
        <div class="tfa-icon-wrap">
          <i class="fas fa-lock"></i>
        </div>
        <div>
          <h3>المصادقة الثنائية</h3>
          <p>أدخل الرمز من تطبيق المصادقة</p>
        </div>
      </div>
      <div class="ph-modal-body tfa-body">
        <div class="tfa-code-inputs">
          ${[1,2,3,4,5,6].map(i => `
            <input type="text" inputmode="numeric" maxlength="1"
                   class="tfa-code-digit" data-idx="${i}"
                   oninput="TwoFactor.handleDigitInput(this, ${i})"
                   onkeydown="TwoFactor.handleDigitKey(event, this, ${i})"
                   onpaste="TwoFactor.handlePaste(event, this, ${i})">
          `).join('')}
        </div>
        <div id="tfa-error" class="tfa-error"></div>
        <div class="tfa-alternatives">
          <a onclick="TwoFactor.useBackupMode()">استخدام رمز احتياطي</a>
        </div>
      </div>
      <div class="ph-modal-foot">
        <button class="btn btn-outline" id="tfa-cancel-btn">إلغاء</button>
        <button class="btn btn-primary" id="tfa-verify-btn">
          <i class="fas fa-shield-alt"></i> تحقق
        </button>
      </div>
    `;

    document.getElementById('phModalOverlay').classList.add('open');

    document.getElementById('tfa-verify-btn').onclick = async () => {
      const code = Array.from(document.querySelectorAll('.tfa-code-digit'))
        .map(el => el.value).join('');
      if (code.length < 6) { showError('أدخل 6 أرقام'); return; }

      const btn = document.getElementById('tfa-verify-btn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

      const result = await verifyLogin(userId, code);

      if (result.success) {
        if (onSuccess) onSuccess(result);
        if (window.Utils) Utils.toast('✅ تم التحقق', 'success');
      } else {
        showError(result.error);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> تحقق';
        document.querySelectorAll('.tfa-code-digit').forEach(el => el.value = '');
        document.querySelector('.tfa-code-digit')?.focus();
      }
    };

    document.getElementById('tfa-cancel-btn').onclick = () => {
      if (onCancel) onCancel();
      phCloseModal();
    };

    setTimeout(() => document.querySelector('.tfa-code-digit')?.focus(), 300);
  }

  function useBackupMode() {
    const inputs = document.querySelector('.tfa-code-inputs');
    if (!inputs) return;
    inputs.outerHTML = `
      <input type="text" class="tfa-backup-input" id="tfa-backup-input"
             placeholder="XXXX-XXXX" style="width:100%;padding:14px;text-align:center;font-family:monospace;font-size:1.4rem;letter-spacing:4px;border:2px solid var(--border);border-radius:12px;background:var(--bg-alt);text-transform:uppercase">
    `;
    document.getElementById('tfa-backup-input')?.focus();
  }

  /* ============================================
     11. INIT
     ============================================ */
  function init() {
    console.log('[TwoFactorAuth v1.0] ✅ Ready');
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.TwoFactor = window.TwoFactorAuth = {
    startSetup,
    enable: enable2FA,
    disable: disable2FA,
    isEnabled: is2FAEnabled,
    getConfig,
    verify: verifyLogin,
    verifyTOTP,

    openSetup: openSetupModal,
    openVerify: openVerifyModal,

    confirmEnable,
    handleDigitInput,
    handleDigitKey,
    handlePaste,
    useBackupMode,

    copy: (text) => {
      navigator.clipboard.writeText(text);
      if (window.Utils) Utils.toast('تم النسخ ✓', 'success');
    },

    copyBackupCodes: (codes) => {
      navigator.clipboard.writeText(codes.join('\n'));
      if (window.Utils) Utils.toast('تم نسخ الرموز ✓', 'success');
    },

    downloadBackupCodes: (codes) => {
      const text = `PharmaCloud — Backup Codes\n${'='.repeat(40)}\n\n${codes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}\n\nاحفظ هذا الملف في مكان آمن!`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pharmacloud-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[TwoFactorAuth v1.0] 🚀 Ready');
})();