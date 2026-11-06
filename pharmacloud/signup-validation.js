/* ============================================
   PHARMACLOUD - SIGNUP VALIDATION v2.1 FIXED
   Non-blocking validation - does NOT break design
   ============================================ */
'use strict';

(function() {
  if (window.__PC_SIGNUP_VALIDATION__) return;
  window.__PC_SIGNUP_VALIDATION__ = true;

  function getEl(id) { return document.getElementById(id); }

  function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
  }
  function isValidPhone(phone) {
    var cleaned = String(phone).replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
  }

  function blockInvalidSubmit() {
    var pharmacyName = getEl('signupPharmacyName') ? getEl('signupPharmacyName').value.trim() : '';
    var ownerName = getEl('signupOwnerName') ? getEl('signupOwnerName').value.trim() : '';
    var phone = getEl('signupPhone') ? getEl('signupPhone').value.trim() : '';
    var email = getEl('signupEmail') ? getEl('signupEmail').value.trim().toLowerCase() : '';
    var password = getEl('signupPassword') ? getEl('signupPassword').value : '';
    var terms = getEl('signupTerms') ? getEl('signupTerms').checked : false;

    // Clear previous hints
    document.querySelectorAll('#signupForm .field-hint.error').forEach(function(el){
      el.classList.remove('error');
    });

    if (!pharmacyName || pharmacyName.length < 2) {
      if (typeof showAuthAlert === 'function') showAuthAlert('اكتب اسم الصيدلية (حرفين على الأقل)');
      getEl('signupPharmacyName')?.focus();
      return true; // block
    }
    if (!ownerName || ownerName.length < 2) {
      if (typeof showAuthAlert === 'function') showAuthAlert('اكتب اسمك الكامل (حرفين على الأقل)');
      getEl('signupOwnerName')?.focus();
      return true;
    }
    if (!phone || !isValidPhone(phone)) {
      if (typeof showAuthAlert === 'function') showAuthAlert('رقم الهاتف يجب أن يكون 10-15 رقم');
      getEl('signupPhone')?.focus();
      return true;
    }
    if (!email || !isValidEmail(email)) {
      if (typeof showAuthAlert === 'function') showAuthAlert('البريد الإلكتروني غير صحيح');
      getEl('signupEmail')?.focus();
      return true;
    }
    if (!password || password.length < 8) {
      if (typeof showAuthAlert === 'function') showAuthAlert('كلمة المرور 8 أحرف على الأقل');
      getEl('signupPassword')?.focus();
      return true;
    }
    if (!terms) {
      if (typeof showAuthAlert === 'function') showAuthAlert('يجب الموافقة على الشروط والأحكام');
      return true;
    }

    // Check duplicate email
    try {
      var users = [];
      if (typeof DB !== 'undefined' && DB.getUsers) users = DB.getUsers();
      else users = JSON.parse(localStorage.getItem('pc_users') || '[]');
      if (users.find(function(u){ return String(u.email||'').toLowerCase() === email; })) {
        if (typeof showAuthAlert === 'function') showAuthAlert('البريد مسجل بالفعل - سجل دخول');
        return true;
      }
    } catch(e) {}

    // Valid
    if (typeof hideAuthAlert === 'function') hideAuthAlert();
    return false; // don't block
  }

  // Real-time hints (enhancement, not blocking design)
  function enhanceValidation() {
    var form = getEl('signupForm');
    if (!form || form.dataset.validationEnhanced) return;
    form.dataset.validationEnhanced = 'true';

    var emailEl = getEl('signupEmail');
    if (emailEl) {
      emailEl.addEventListener('blur', function(){
        if (this.value && !isValidEmail(this.value.trim().toLowerCase())) {
          this.classList.add('input-error');
        } else {
          this.classList.remove('input-error');
        }
      });
    }
    var phoneEl = getEl('signupPhone');
    if (phoneEl) {
      phoneEl.addEventListener('blur', function(){
        if (this.value && !isValidPhone(this.value)) {
          this.classList.add('input-error');
        } else {
          this.classList.remove('input-error');
        }
      });
    }
  }

  // Auto-enhance after load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(enhanceValidation, 500); });
  } else {
    setTimeout(enhanceValidation, 500);
  }

  // Re-enhance when auth opens
  try {
    var observer = new MutationObserver(function(){
      var overlay = getEl('authOverlay');
      if (overlay && overlay.classList.contains('open')) enhanceValidation();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch(e) {}

  window.SignupValidation = {
    blockInvalidSubmit: blockInvalidSubmit,
    isValidEmail: isValidEmail,
    isValidPhone: isValidPhone
  };

  console.log('[SignupValidation v2.1] ✅ Fixed & Ready');
})();
