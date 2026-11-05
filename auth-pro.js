/* ============================================
   PHARMACLOUD - AUTH PRO v1.0
   Professional Login with AI/ML Features
   Features:
   - Real-time validation
   - Show/hide password
   - Remember me (30 days)
   - Rate limiting (5 attempts → 15 min lock)
   - Forgot password
   - Device fingerprint
   - AI Risk Scoring
   - Behavioral analysis
   - Password strength meter
   - Audit log with insights
   ============================================ */
'use strict';

if (window.__PC_AUTH_PRO_LOADED__) {
  console.log('[Auth Pro] ⏸️ Already loaded');
} else {
  window.__PC_AUTH_PRO_LOADED__ = true;

  (function() {

    /* ============================================
       CONFIG
       ============================================ */
    var CFG = {
      MAX_ATTEMPTS: 5,
      LOCK_DURATION_MS: 15 * 60 * 1000,
      ATTEMPT_WINDOW_MS: 15 * 60 * 1000,
      REMEMBER_DAYS: 30,
      SHORT_SESSION_HOURS: 12,
      KEYS: {
        REMEMBER: 'pc_auth_remember',
        ATTEMPTS: 'pc_auth_attempts',
        LAST_EMAIL: 'pc_auth_last_email',
        DEVICE: 'pc_auth_device_id',
        AUDIT: 'pc_auth_audit',
        RISK: 'pc_auth_risk'
      }
    };

    /* ============================================
       STATE
       ============================================ */
    var S = {
      typingPattern: [],
      lastTypingTime: 0,
      failedAttempts: {},
      currentRisk: 0
    };

    /* ============================================
       HELPERS
       ============================================ */
    function esc(s) {
      if (s == null) return '';
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    }

    function safeGet(key, fb) {
      try {
        var v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fb;
      } catch (e) { return fb; }
    }

    function safeSet(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); return true; }
      catch (e) { return false; }
    }

    function toast(msg, type) {
      if (typeof Utils !== 'undefined' && Utils.toast) {
        Utils.toast(msg, type || 'info');
      } else {
        console.log('[' + (type || 'info') + '] ' + msg);
      }
    }

    /* ============================================
       DEVICE FINGERPRINT
       ============================================ */
    function getDeviceId() {
      var stored = localStorage.getItem(CFG.KEYS.DEVICE);
      if (stored) return stored;

      var fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency || 'unknown',
        navigator.platform || 'unknown'
      ].join('|');

      var hash = 0;
      for (var i = 0; i < fingerprint.length; i++) {
        hash = ((hash << 5) - hash) + fingerprint.charCodeAt(i);
        hash = hash & hash;
      }
      var id = 'dev_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);

      try { localStorage.setItem(CFG.KEYS.DEVICE, id); } catch (e) {}
      return id;
    }

    /* ============================================
       AI ENGINE - Risk Scoring & Anomaly Detection
       ============================================ */
    var AuthAI = {

      /* Password strength: 0-100 with entropy */
      passwordStrength: function(pwd) {
        if (!pwd) return { score: 0, label: 'فاضي', color: '#94a3b8', entropy: 0 };

        var score = 0;
        var entropy = 0;

        // Length
        if (pwd.length >= 8) score += 20;
        if (pwd.length >= 12) score += 15;
        if (pwd.length >= 16) score += 15;

        // Character variety
        if (/[a-z]/.test(pwd)) { score += 10; entropy += 26; }
        if (/[A-Z]/.test(pwd)) { score += 10; entropy += 26; }
        if (/[0-9]/.test(pwd)) { score += 10; entropy += 10; }
        if (/[^a-zA-Z0-9]/.test(pwd)) { score += 20; entropy += 33; }

        // Penalties
        if (/^(.)\1+$/.test(pwd)) score -= 30;
        if (/^(123|abc|qwe|password|admin)/i.test(pwd)) score -= 40;
        if (/^(0123|1234|1111)/.test(pwd)) score -= 30;

        score = Math.max(0, Math.min(100, score));
        entropy = Math.round(Math.log2(Math.pow(entropy, pwd.length)));

        var label, color;
        if (score < 30) { label = 'ضعيفة'; color = '#dc2626'; }
        else if (score < 50) { label = 'مقبولة'; color = '#f59e0b'; }
        else if (score < 70) { label = 'جيدة'; color = '#1E88E5'; }
        else if (score < 90) { label = 'قوية'; color = '#00b884'; }
        else { label = 'قوية جداً'; color = '#10b981'; }

        return { score: score, label: label, color: color, entropy: entropy };
      },

      /* Analyze typing pattern (behavioral biometrics) */
      trackTyping: function() {
        var now = Date.now();
        if (S.lastTypingTime > 0) {
          var delay = now - S.lastTypingTime;
          S.typingPattern.push(delay);
          if (S.typingPattern.length > 30) S.typingPattern.shift();
        }
        S.lastTypingTime = now;
      },

      /* Detect if typing pattern looks human */
      isHumanTyping: function() {
        if (S.typingPattern.length < 5) return true;

        var avg = S.typingPattern.reduce(function(a, b) { return a + b; }, 0) / S.typingPattern.length;
        var variance = S.typingPattern.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / S.typingPattern.length;
        var stdDev = Math.sqrt(variance);

        // Humans have variable timing (stdDev > 20ms)
        // Bots paste instantly (stdDev ~ 0)
        return stdDev > 15 && avg > 30 && avg < 1000;
      },

      /* Calculate risk score 0-100 for login attempt */
      calculateRisk: function(email, attempts) {
        var risk = 0;

        // Failed attempts factor
        var recentAttempts = attempts.filter(function(a) {
          return Date.now() - a.at < CFG.ATTEMPT_WINDOW_MS;
        });
        risk += Math.min(40, recentAttempts.length * 10);

        // Time of day factor
        var hour = new Date().getHours();
        if (hour >= 2 && hour < 6) risk += 15; // Weird hour
        else if (hour >= 22 || hour < 2) risk += 8;

        // Day of week
        var day = new Date().getDay();
        if (day === 5) risk += 5; // Friday (weekend in Egypt)

        // Non-human typing
        if (!AuthAI.isHumanTyping()) risk += 20;

        // Suspicious email patterns
        if (email && /[<>{}\[\]]/.test(email)) risk += 25;
        if (email && email.length > 60) risk += 10;

        // Device familiarity
        var audit = safeGet(CFG.KEYS.AUDIT, []);
        var deviceId = getDeviceId();
        var deviceUsed = audit.some(function(a) { return a.device === deviceId && a.success; });
        if (!deviceUsed && audit.length > 0) risk += 12;

        return Math.min(100, risk);
      },

      /* Get risk level */
      getRiskLevel: function(score) {
        if (score >= 70) return { level: 'critical', label: 'خطر عالي', color: '#dc2626', icon: 'fa-radiation' };
        if (score >= 45) return { level: 'high', label: 'خطر متوسط', color: '#f59e0b', icon: 'fa-exclamation-triangle' };
        if (score >= 25) return { level: 'medium', label: 'خطر منخفض', color: '#1E88E5', icon: 'fa-info-circle' };
        return { level: 'low', label: 'آمن', color: '#10b981', icon: 'fa-shield-alt' };
      },

      /* Smart greeting based on time */
      getGreeting: function() {
        var h = new Date().getHours();
        if (h >= 5 && h < 12) return 'صباح الخير ☀️';
        if (h >= 12 && h < 17) return 'يوم سعيد 🌤️';
        if (h >= 17 && h < 21) return 'مساء الخير 🌆';
        return 'أهلاً بيك في الليل 🌙';
      }
    };

    /* ============================================
       RATE LIMITER
       ============================================ */
    var RateLimiter = {

      getAttempts: function(email) {
        var all = safeGet(CFG.KEYS.ATTEMPTS, {});
        return all[email] || [];
      },

      recordAttempt: function(email, success) {
        var all = safeGet(CFG.KEYS.ATTEMPTS, {});
        if (!all[email]) all[email] = [];

        all[email].push({
          at: Date.now(),
          success: success
        });

        // Keep only last 20
        all[email] = all[email].slice(-20);
        safeSet(CFG.KEYS.ATTEMPTS, all);

        // If success → clear
        if (success) {
          all[email] = [];
          safeSet(CFG.KEYS.ATTEMPTS, all);
        }
      },

      isLocked: function(email) {
        var attempts = RateLimiter.getAttempts(email);
        var failed = attempts.filter(function(a) {
          return !a.success && Date.now() - a.at < CFG.ATTEMPT_WINDOW_MS;
        });

        if (failed.length < CFG.MAX_ATTEMPTS) {
          return { locked: false, remaining: CFG.MAX_ATTEMPTS - failed.length };
        }

        // Locked — find unlock time
        var lastFailed = failed[failed.length - 1];
        var unlockAt = lastFailed.at + CFG.LOCK_DURATION_MS;
        var remainingMs = unlockAt - Date.now();

        if (remainingMs <= 0) {
          // Lock expired — clear
          var all = safeGet(CFG.KEYS.ATTEMPTS, {});
          all[email] = [];
          safeSet(CFG.KEYS.ATTEMPTS, all);
          return { locked: false, remaining: CFG.MAX_ATTEMPTS };
        }

        return {
          locked: true,
          remaining: 0,
          unlockAt: unlockAt,
          remainingMs: remainingMs
        };
      },

      getAttemptsInWindow: function(email) {
        var attempts = RateLimiter.getAttempts(email);
        return attempts.filter(function(a) {
          return Date.now() - a.at < CFG.ATTEMPT_WINDOW_MS;
        });
      }
    };

    /* ============================================
       AUDIT LOG
       ============================================ */
    var AuditLog = {

      log: function(email, success, reason, riskScore) {
        var audit = safeGet(CFG.KEYS.AUDIT, []);
        audit.push({
          email: email,
          success: success,
          reason: reason || '',
          risk: riskScore || 0,
          device: getDeviceId(),
          userAgent: navigator.userAgent.slice(0, 100),
          at: new Date().toISOString()
        });
        if (audit.length > 200) audit = audit.slice(-200);
        safeSet(CFG.KEYS.AUDIT, audit);
      },

      getRecent: function(email, limit) {
        var audit = safeGet(CFG.KEYS.AUDIT, []);
        if (email) {
          audit = audit.filter(function(a) { return a.email === email; });
        }
        return audit.slice(-(limit || 10)).reverse();
      },

      getStats: function(email) {
        var audit = safeGet(CFG.KEYS.AUDIT, []);
        var userAudit = audit.filter(function(a) { return a.email === email; });
        var success = userAudit.filter(function(a) { return a.success; }).length;
        var failed = userAudit.filter(function(a) { return !a.success; }).length;
        var lastSuccess = userAudit.filter(function(a) { return a.success; }).pop();
        var avgRisk = userAudit.length > 0
          ? Math.round(userAudit.reduce(function(s, a) { return s + (a.risk || 0); }, 0) / userAudit.length)
          : 0;

        return {
          total: userAudit.length,
          success: success,
          failed: failed,
          lastSuccessAt: lastSuccess ? lastSuccess.at : null,
          avgRisk: avgRisk
        };
      }
    };

    /* ============================================
       UI ENHANCEMENTS
       ============================================ */
    function enhanceLoginForm() {
      var emailEl = document.getElementById('loginEmail');
      var passEl = document.getElementById('loginPassword');
      var form = document.getElementById('loginForm');

      if (!emailEl || !passEl || !form) {
        setTimeout(enhanceLoginForm, 300);
        return;
      }

      if (form.dataset.enhanced === 'true') return;
      form.dataset.enhanced = 'true';

      // ============================================
      // 1) EMAIL VALIDATION (real-time)
      // ============================================
      emailEl.setAttribute('maxlength', '80');
      emailEl.setAttribute('autocomplete', 'email');

      var emailHint = document.createElement('div');
      emailHint.className = 'field-hint';
      emailHint.id = 'loginEmailHint';
      emailEl.parentNode.appendChild(emailHint);

      emailEl.addEventListener('input', function() {
        var v = this.value.trim().toLowerCase();
        var valid = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v);
        var hint = document.getElementById('loginEmailHint');

        if (!v) {
          this.classList.remove('input-error', 'input-valid');
          hint.textContent = '';
          hint.className = 'field-hint';
        } else if (valid) {
          this.classList.remove('input-error');
          this.classList.add('input-valid');
          hint.textContent = '✓ بريد صحيح';
          hint.className = 'field-hint';
          hint.style.color = '#10b981';
        } else {
          this.classList.remove('input-valid');
          this.classList.add('input-error');
          hint.textContent = 'بريد إلكتروني غير صحيح';
          hint.className = 'field-hint error';
        }
      });

      // ============================================
      // 2) PASSWORD FIELD WRAPPER + TOGGLE
      // ============================================
      var passWrapper = document.createElement('div');
      passWrapper.className = 'password-wrapper';
      passEl.parentNode.insertBefore(passWrapper, passEl);
      passWrapper.appendChild(passEl);

      var toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'password-toggle';
      toggleBtn.setAttribute('aria-label', 'إظهار/إخفاء كلمة المرور');
      toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
      toggleBtn.addEventListener('click', function() {
        var isPass = passEl.type === 'password';
        passEl.type = isPass ? 'text' : 'password';
        toggleBtn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
      });
      passWrapper.appendChild(toggleBtn);

      // Password strength meter
      var strengthBar = document.createElement('div');
      strengthBar.className = 'password-strength';
      strengthBar.id = 'passwordStrength';
      strengthBar.style.display = 'none';
      strengthBar.innerHTML =
        '<div class="password-strength-bar">' +
          '<div class="password-strength-fill" id="passStrengthFill"></div>' +
        '</div>' +
        '<div class="password-strength-label" id="passStrengthLabel"></div>';
      passWrapper.parentNode.appendChild(strengthBar);

      passEl.addEventListener('input', function() {
        AuthAI.trackTyping();
        var result = AuthAI.passwordStrength(this.value);
        var bar = document.getElementById('passwordStrength');
        var fill = document.getElementById('passStrengthFill');
        var label = document.getElementById('passStrengthLabel');

        if (!this.value) {
          bar.style.display = 'none';
          return;
        }

        bar.style.display = 'block';
        fill.style.width = result.score + '%';
        fill.style.background = result.color;
        label.textContent = result.label + ' • ' + result.entropy + ' bits';
        label.style.color = result.color;
      });

      // ============================================
      // 3) REMEMBER ME + FORGOT PASSWORD
      // ============================================
      var optionsRow = document.createElement('div');
      optionsRow.className = 'login-options-row';
      optionsRow.innerHTML =
        '<label class="login-remember">' +
          '<input type="checkbox" id="loginRemember">' +
          '<span>تذكرني 30 يوم</span>' +
        '</label>' +
        '<a class="login-forgot-link" onclick="AuthPro.openForgotPassword()">' +
          'نسيت كلمة المرور؟' +
        '</a>';
      passWrapper.parentNode.insertBefore(optionsRow, strengthBar.nextSibling);

      // ============================================
      // 4) ATTEMPTS WARNING ZONE
      // ============================================
      var attemptsZone = document.createElement('div');
      attemptsZone.id = 'loginAttemptsZone';
      attemptsZone.className = 'login-attempts-zone';
      attemptsZone.style.display = 'none';
      form.insertBefore(attemptsZone, form.firstChild);

      // ============================================
      // 5) SMART GREETING
      // ============================================
      var greeting = AuthAI.getGreeting();
      var authTitle = document.getElementById('authTitle');
      if (authTitle) authTitle.textContent = greeting;

      // ============================================
      // 6) RESTORE LAST EMAIL
      // ============================================
      var lastEmail = localStorage.getItem(CFG.KEYS.LAST_EMAIL);
      if (lastEmail) {
        emailEl.value = lastEmail;
        emailEl.dispatchEvent(new Event('input'));
        // Focus on password
        setTimeout(function() { passEl.focus(); }, 200);
      }

      // ============================================
      // 7) PRE-FILL "REMEMBER ME" if was checked
      // ============================================
      var rememberData = safeGet(CFG.KEYS.REMEMBER, null);
      if (rememberData && rememberData.email === lastEmail) {
        var remEl = document.getElementById('loginRemember');
        if (remEl) remEl.checked = true;
      }

      // ============================================
      // 8) TAB KEY FROM EMAIL → PASSWORD
      // ============================================
      emailEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          passEl.focus();
        }
      });

      // ============================================
      // 9) UPDATE LOCK COUNTDOWN LIVE
      // ============================================
      setInterval(updateLockState, 1000);

      console.log('[Auth Pro] ✅ Login form enhanced');
    }

    /* ============================================
       UPDATE LOCK STATE (live countdown)
       ============================================ */
    function updateLockState() {
      var emailEl = document.getElementById('loginEmail');
      var zone = document.getElementById('loginAttemptsZone');
      var loginBtn = document.getElementById('loginBtn');
      if (!emailEl || !zone) return;

      var email = emailEl.value.trim().toLowerCase();
      if (!email) {
        zone.style.display = 'none';
        return;
      }

      var lock = RateLimiter.isLocked(email);

      if (lock.locked) {
        var remainingSec = Math.ceil(lock.remainingMs / 1000);
        var min = Math.floor(remainingSec / 60);
        var sec = remainingSec % 60;
        zone.style.display = 'flex';
        zone.className = 'login-attempts-zone locked';
        zone.innerHTML =
          '<i class="fas fa-lock"></i>' +
          '<div>' +
            '<strong>الحساب مقفول مؤقتاً</strong>' +
            '<span>حاول تاني بعد ' + min + ':' + String(sec).padStart(2, '0') + '</span>' +
          '</div>';

        if (loginBtn) {
          loginBtn.disabled = true;
          loginBtn.innerHTML = '<i class="fas fa-lock"></i> مقفول';
        }
      } else if (lock.remaining < CFG.MAX_ATTEMPTS) {
        zone.style.display = 'flex';
        zone.className = 'login-attempts-zone warning';
        zone.innerHTML =
          '<i class="fas fa-exclamation-triangle"></i>' +
          '<div>' +
            '<strong>متبقي ' + lock.remaining + ' محاولة</strong>' +
            '<span>بعد كده الحساب هيقفل 15 دقيقة</span>' +
          '</div>';

        if (loginBtn && !loginBtn.dataset.loading) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
        }
      } else {
        zone.style.display = 'none';
        if (loginBtn && !loginBtn.dataset.loading) {
          loginBtn.disabled = false;
          loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
        }
      }
    }

    /* ============================================
       HANDLE LOGIN — Main Logic
       ============================================ */
    function handleLoginPro(e) {
      if (e) e.preventDefault();

      var emailEl = document.getElementById('loginEmail');
      var passEl = document.getElementById('loginPassword');
      var rememberEl = document.getElementById('loginRemember');
      var btn = document.getElementById('loginBtn');

      if (!emailEl || !passEl) return;

      var email = emailEl.value.trim().toLowerCase();
      var password = passEl.value;
      var remember = rememberEl ? rememberEl.checked : false;

      // Reset errors
      emailEl.classList.remove('input-error');
      passEl.classList.remove('input-error');

      // ============================================
      // 1) VALIDATE EMAIL
      // ============================================
      if (!email) {
        emailEl.classList.add('input-error');
        emailEl.focus();
        showLoginAlert('اكتب البريد الإلكتروني');
        return;
      }

      var emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email)) {
        emailEl.classList.add('input-error');
        emailEl.focus();
        showLoginAlert('البريد الإلكتروني غير صحيح');
        return;
      }

      // ============================================
      // 2) VALIDATE PASSWORD
      // ============================================
      if (!password) {
        passEl.classList.add('input-error');
        passEl.focus();
        showLoginAlert('اكتب كلمة المرور');
        return;
      }

      if (password.length < 8) {
        passEl.classList.add('input-error');
        passEl.focus();
        showLoginAlert('كلمة المرور 8 أحرف على الأقل');
        return;
      }

      // ============================================
      // 3) CHECK RATE LIMIT
      // ============================================
      var lock = RateLimiter.isLocked(email);
      if (lock.locked) {
        var min = Math.ceil(lock.remainingMs / 60000);
        showLoginAlert('الحساب مقفول — حاول بعد ' + min + ' دقيقة');
        return;
      }

      // ============================================
      // 4) CALCULATE RISK
      // ============================================
      var attempts = RateLimiter.getAttemptsInWindow(email);
      var riskScore = AuthAI.calculateRisk(email, attempts);
      var risk = AuthAI.getRiskLevel(riskScore);
      S.currentRisk = riskScore;

      console.log('[Auth Pro] Risk score:', riskScore, '(' + risk.level + ')');

      // ============================================
      // 5) SHOW LOADING
      // ============================================
      if (btn) {
        btn.dataset.loading = 'true';
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التحقق...';
      }

      setTimeout(function() {
        performLogin(email, password, remember, riskScore, risk);
      }, 600);
    }

    /* ============================================
       PERFORM LOGIN
       ============================================ */
    function performLogin(email, password, remember, riskScore, risk) {
      var btn = document.getElementById('loginBtn');

      // Find user
      var users = [];
      try { users = DB.getUsers(); } catch (e) {}
      var user = users.find(function(u) {
        return String(u.email || '').toLowerCase() === email && u.password === password;
      });

      // ============================================
      // SUCCESS
      // ============================================
      if (user) {
        // Check tenant status
        if (user.tenantId) {
          var tenants = DB.getTenants();
          var tenant = tenants.find(function(t) { return t.id === user.tenantId; });

          if (!tenant) {
            failLogin('الصيدلية الخاصة بحسابك غير موجودة', 'no_tenant');
            return;
          }

          if (tenant.status === 'suspended') {
            failLogin('حساب الصيدلية موقوف', 'suspended');
            return;
          }
        }

        // Record success in rate limiter
        RateLimiter.recordAttempt(email, true);

        // Save last email
        try { localStorage.setItem(CFG.KEYS.LAST_EMAIL, email); } catch (e) {}

        // Remember me
        if (remember) {
          var sessionExpiry = Date.now() + CFG.REMEMBER_DAYS * 86400000;
          safeSet(CFG.KEYS.REMEMBER, {
            email: email,
            device: getDeviceId(),
            expiresAt: sessionExpiry
          });
        } else {
          try { localStorage.removeItem(CFG.KEYS.REMEMBER); } catch (e) {}
        }

        // Audit log
        AuditLog.log(email, true, 'login_success', riskScore);

        // Create session
        var now = Date.now();
        var expiresAt = remember
          ? now + CFG.REMEMBER_DAYS * 86400000
          : now + CFG.SHORT_SESSION_HOURS * 3600000;

        var session = {
          userId: user.id,
          tenantId: user.tenantId,
          email: user.email,
          name: user.name,
          role: user.role,
          loginAt: new Date().toISOString(),
          rememberMe: remember,
          expiresAt: expiresAt,
          device: getDeviceId(),
          riskScore: riskScore
        };
        DB.setSession(session);

        if (btn) {
          btn.innerHTML = '<i class="fas fa-check"></i> تم الدخول!';
          btn.style.background = 'linear-gradient(135deg, #10b981, #34d399)';
        }

        console.log('[Auth Pro] ✅ Login success:', user.name);
        toast('مرحباً ' + user.name + '! 👋', 'success');

        // Close auth modal + clear password
        var passEl = document.getElementById('loginPassword');
        if (passEl) passEl.value = '';

        setTimeout(function() {
          if (typeof closeAuth === 'function') closeAuth();
          if (btn) {
            btn.style.background = '';
            btn.dataset.loading = 'false';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
          }
          if (typeof showPlaceholder === 'function') {
            showPlaceholder(session);
          }
        }, 700);
      }
      // ============================================
      // FAILURE
      // ============================================
      else {
        RateLimiter.recordAttempt(email, false);
        AuditLog.log(email, false, 'invalid_credentials', riskScore);

        var lock = RateLimiter.isLocked(email);
        var msg = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';

        if (lock.locked) {
          var min = Math.ceil(lock.remainingMs / 60000);
          msg = 'تم تجاوز الحد — الحساب مقفول ' + min + ' دقيقة';
        } else if (lock.remaining <= 2) {
          msg += ' — متبقي ' + lock.remaining + ' محاولة';
        }

        failLogin(msg, 'invalid_credentials');
      }
    }

    /* ============================================
       FAIL LOGIN
       ============================================ */
    function failLogin(msg, reason) {
      var btn = document.getElementById('loginBtn');
      var passEl = document.getElementById('loginPassword');

      if (passEl) {
        passEl.classList.add('input-error');
        passEl.value = '';
        passEl.focus();
      }

      if (btn) {
        btn.dataset.loading = 'false';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
      }

      showLoginAlert(msg);
      toast(msg, 'error');
      updateLockState();
    }

    /* ============================================
       SHOW LOGIN ALERT
       ============================================ */
    function showLoginAlert(msg) {
      if (typeof window.showAuthAlert === 'function') {
        window.showAuthAlert(msg);
      } else {
        var el = document.getElementById('authAlert');
        if (el) {
          el.className = 'alert error show';
          el.innerHTML = '<i class="fas fa-exclamation-circle"></i> ' + esc(msg);
        }
      }
    }

    /* ============================================
       FORGOT PASSWORD
       ============================================ */
    function openForgotPassword() {
      var emailEl = document.getElementById('loginEmail');
      var prefillEmail = emailEl ? emailEl.value.trim().toLowerCase() : '';

      if (typeof Dialog === 'undefined') return;

      // Custom modal
      var modal = document.getElementById('phModalBox');
      if (!modal) return;

      modal.innerHTML =
        '<div class="ph-modal-head" style="background:linear-gradient(135deg,#7c3aed,#1E88E5);color:#fff">' +
          '<h3 style="color:#fff"><i class="fas fa-key"></i> نسيت كلمة المرور</h3>' +
          '<button class="ph-modal-close" onclick="phCloseModal()" style="background:rgba(255,255,255,.2);color:#fff"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="ph-modal-body">' +
          '<p style="color:#64748b;font-size:.9rem;margin-bottom:16px;line-height:1.7">' +
            'ادخل بريدك الإلكتروني وهيتم إرسال رابط لإعادة تعيين كلمة المرور.' +
          '</p>' +
          '<div class="form-group">' +
            '<label>البريد الإلكتروني</label>' +
            '<input type="email" id="forgotEmail" value="' + esc(prefillEmail) + '" placeholder="you@pharmacy.com">' +
          '</div>' +
          '<div style="background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.2);border-radius:10px;padding:12px;font-size:.82rem;color:#1e40af;margin-top:12px">' +
            '<i class="fas fa-info-circle"></i> ' +
            'هنتواصل معاك خلال 5 دقايق' +
          '</div>' +
        '</div>' +
        '<div class="ph-modal-foot">' +
          '<button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
          '<button class="btn btn-primary" onclick="AuthPro.submitForgot()">' +
            '<i class="fas fa-paper-plane"></i> إرسال الرابط' +
          '</button>' +
        '</div>';

      var overlay = document.getElementById('phModalOverlay');
      if (overlay) overlay.classList.add('open');
    }

    function submitForgot() {
      var el = document.getElementById('forgotEmail');
      if (!el) return;

      var email = el.value.trim().toLowerCase();
      var emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

      if (!email || !emailRegex.test(email)) {
        el.style.borderColor = '#dc2626';
        el.focus();
        toast('اكتب بريد إلكتروني صحيح', 'error');
        return;
      }

      // Simulate sending
      if (typeof phCloseModal === 'function') phCloseModal();

      AuditLog.log(email, false, 'password_reset_requested', 0);

      if (typeof Dialog !== 'undefined') {
        Dialog.success(
          'تم الإرسال ✉️',
          'لو البريد "' + email + '" مسجل عندنا، هتلاقي رسالة فيها رابط إعادة التعيين خلال دقايق.'
        );
      }

      toast('تم إرسال رابط إعادة التعيين', 'success');
    }

    /* ============================================
       GET RISK FOR CURRENT EMAIL
       ============================================ */
    function getCurrentRisk() {
      var emailEl = document.getElementById('loginEmail');
      if (!emailEl) return null;
      var email = emailEl.value.trim().toLowerCase();
      if (!email) return null;
      var attempts = RateLimiter.getAttemptsInWindow(email);
      var riskScore = AuthAI.calculateRisk(email, attempts);
      return {
        score: riskScore,
        level: AuthAI.getRiskLevel(riskScore),
        stats: AuditLog.getStats(email)
      };
    }

    /* ============================================
       PUBLIC API
       ============================================ */
    window.AuthPro = {
      handleLogin: handleLoginPro,
      openForgotPassword: openForgotPassword,
      submitForgot: submitForgot,
      getCurrentRisk: getCurrentRisk,
      getStats: AuditLog.getStats,
      getRecent: AuditLog.getRecent,
      passwordStrength: AuthAI.passwordStrength,

      // Debug
      debug: function() {
        console.log('═══════════════════════════════════');
        console.log('🔍 AUTH PRO DEBUG');
        console.log('═══════════════════════════════════');
        console.log('Device ID:', getDeviceId());
        console.log('Typing pattern size:', S.typingPattern.length);
        console.log('Is human typing:', AuthAI.isHumanTyping());
        console.log('Current risk:', getCurrentRisk());
        console.log('═══════════════════════════════════');
      },

      clearHistory: function() {
        try {
          localStorage.removeItem(CFG.KEYS.AUDIT);
          localStorage.removeItem(CFG.KEYS.ATTEMPTS);
          console.log('[Auth Pro] ✅ History cleared');
        } catch (e) {}
      }
    };

    /* ============================================
       OVERRIDE handleLogin
       ============================================ */
    setTimeout(function() {
      window.handleLogin = handleLoginPro;
      console.log('[Auth Pro] ✅ handleLogin overridden');
    }, 100);

    /* ============================================
       INIT
       ============================================ */
    function init() {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enhanceLoginForm);
      } else {
        enhanceLoginForm();
      }

      // Re-enhance if auth modal is re-opened
      var observer = new MutationObserver(function() {
        var form = document.getElementById('loginForm');
        if (form && !form.dataset.enhanced) {
          enhanceLoginForm();
        }
      });
      try {
        observer.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}

      console.log('[Auth Pro v1.0] ✅ Loaded');
      console.log('[Auth Pro] Features: Validation, Rate Limiting, AI Risk, Remember Me, Audit');
    }

    init();

  })();
}