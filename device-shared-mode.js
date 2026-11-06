/* PharmaCloud - Shared Device Mode - جهاز واحد في الصيدلية */
/* الجهاز واحد، الناس بتتبدل عليه - مش كل واحد جهاز */
/* حط الملف ده بعد role-based-pro.js */
(function() {
  'use strict';
  console.log('[Shared Device] Loaded - جهاز واحد، أكتر من واحد بيشتغل عليه');

  // ===== الدور المدمج: صيدلي + كاشير (نفس الشخص) =====
  // لو نفس الشخص هو الصيدلي وهو الكاشير، دوره يبقى pharmacist
  // لأن pharmacist أصلاً بيشمل كل صلاحيات الكاشير + زيادة
  // فمش محتاج دورين - دور واحد يكفي
  // 
  // مثال:
  // - أحمد صيدلي + كاشير -> دوره pharmacist (هيعمل بيع + روشتات)
  // - محمد كاشير بس (مش صيدلي) -> دوره cashier (بيع بس)
  // - الاتنين واقفين مع بعض على نفس الجهاز -> تبديل سريع بالـ PIN

  // ===== PIN لكل موظف (4 أرقام) =====
  function pinKey() { return 'pc_' + (PH.tenantId || 't_demo') + '_pins'; }
  function getPin(userId) {
    try { var all = JSON.parse(localStorage.getItem(pinKey()) || '{}'); return all[userId] || ''; } catch(e) { return ''; }
  }
  function setPin(userId, pin) {
    var all = {}; try { all = JSON.parse(localStorage.getItem(pinKey()) || '{}'); } catch(e) {}
    all[userId] = pin;
    localStorage.setItem(pinKey(), JSON.stringify(all));
  }
  window.phGetPin = getPin;
  window.phSetPin = setPin;

  // ===== تبديل سريع من غير ما تطلع من الصفحة =====
  window.phQuickSwitch = function() {
    var team = [];
    try { team = PH.getTeam() || []; } catch(e) {}
    if (!team.length && typeof phSession !== 'undefined' && phSession) team = [{ id: phSession.userId, name: phSession.name, role: phSession.role }];
    var currentId = (typeof phSession !== 'undefined' && phSession) ? phSession.userId : '';

    var html = '<div class="ph-modal-head"><h3><i class="fas fa-exchange-alt"></i> تبديل المستخدم - نفس الجهاز</h3><button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button></div>'
      + '<div class="ph-modal-body"><p style="color:var(--text-muted);font-size:.9rem;margin-bottom:12px">الجهاز واحد في الصيدلية، اختار مين اللي هيشتغل دلوقتي. مش محتاج تسجيل خروج كامل.</p>'
      + '<div style="display:grid;gap:10px">'
      + team.map(function(m){
          var isCurrent = m.id === currentId;
          var roleLabel = (window.PH_ROLES && window.PH_ROLES[m.role]) ? window.PH_ROLES[m.role].label : (m.role === 'employee' ? 'صيدلي' : m.role);
          var pin = getPin(m.id);
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid ' + (isCurrent ? 'var(--primary)' : 'var(--border)') + ';border-radius:10px;background:var(--bg-alt)">'
            + '<div><strong>' + m.name + '</strong> <span style="color:var(--text-muted);font-size:.85rem">(' + roleLabel + ')</span>' + (isCurrent ? ' <span class="ph-badge ph-badge-green">انت دلوقتي</span>' : '') + '</div>'
            + '<div style="display:flex;gap:8px;align-items:center">'
            + '<input type="password" id="pin_' + m.id + '" placeholder="PIN 4 أرقام" maxlength="4" inputmode="numeric" style="width:110px" class="ph-input" value="' + (pin ? '' : '') + '">'
            + '<button class="btn btn-primary btn-sm" ' + (isCurrent ? 'disabled' : '') + ' onclick="phDoQuickSwitch(\'' + m.id + '\', \'' + m.name + '\')">بدّل</button>'
            + '</div></div>';
        }).join('')
      + '</div>'
      + '<div style="margin-top:14px;background:var(--bg-alt);padding:12px;border-radius:10px;font-size:.85rem;color:var(--text-muted)">'
      + '<strong>أول مرة:</strong> لو الموظف لسه محطش PIN، سيب الخانة فاضية ودوس بدّل، هيطلب منك تعمل PIN جديد.<br>'
      + '<strong>لو نفس الشخص صيدلي + كاشير:</strong> خلي دوره صيدلي بس، هو أصلاً بيعمل البيع والروشتات مع بعض.</div>'
      + '</div><div class="ph-modal-foot"><button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button></div>';
    document.getElementById('phModalBox').innerHTML = html;
    document.getElementById('phModalOverlay').classList.add('open');
  };

  window.phDoQuickSwitch = function(userId, userName) {
    var pinInput = document.getElementById('pin_' + userId);
    var entered = pinInput ? pinInput.value.trim() : '';
    var saved = getPin(userId);
    var users = [];
    try { users = DB.getUsers() || []; } catch(e) {}
    var user = users.find(function(u){ return u.id === userId; });
    if (!user) { showToast('الموظف مش موجود', 'error'); return; }

    // أول مرة: لو مفيش PIN محفوظ، اطلب PIN جديد
    if (!saved) {
      if (entered.length < 4) {
        // افتح مودال عمل PIN
        document.getElementById('phModalBox').innerHTML = '<div class="ph-modal-head"><h3>🔑 اعمل PIN لـ ' + userName + '</h3><button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button></div>'
          + '<div class="ph-modal-body"><p style="color:var(--text-muted)">اختار 4 أرقام سهلة تفتكرها، هتستخدمها كل مرة تبدل للجهاز.</p><input type="password" id="newPinInput" placeholder="4 أرقام - مثال 1234" maxlength="4" inputmode="numeric" class="ph-input" style="font-size:1.2rem;text-align:center;letter-spacing:8px">'
          + '<div style="margin-top:12px"><button class="btn btn-primary" onclick="phSaveNewPin(\'' + userId + '\', \'' + userName + '\')">حفظ PIN وبدّل</button></div></div>';
        return;
      }
      setPin(userId, entered);
      doSwitch(user);
      return;
    }

    // فيه PIN محفوظ - لازم يتطابق
    if (entered !== saved) { showToast('PIN غلط - جرب تاني', 'error'); if (pinInput) pinInput.value = ''; return; }
    doSwitch(user);
  };

  window.phSaveNewPin = function(userId, userName) {
    var v = document.getElementById('newPinInput') ? document.getElementById('newPinInput').value.trim() : '';
    if (v.length < 4) { showToast('PIN لازم 4 أرقام', 'error'); return; }
    setPin(userId, v);
    var users = []; try { users = DB.getUsers() || []; } catch(e) {}
    var user = users.find(function(u){ return u.id === userId; });
    if (user) doSwitch(user);
  };

  function doSwitch(user) {
    // بدّل السيشن من غير Reload كامل
    try {
      var session = DB.getSession ? DB.getSession() : JSON.parse(localStorage.getItem('pc_session') || '{}');
      session.userId = user.id; session.name = user.name; session.role = user.role; session.tenantId = user.tenantId;
      if (typeof DB !== 'undefined' && DB.setSession) DB.setSession(session);
      else localStorage.setItem('pc_session', JSON.stringify(session));
      if (typeof phSession !== 'undefined') { phSession = session; }
    } catch(e) {}
    // حدث الاسم والدور فوق
    var nameEl = document.getElementById('phNameTop'); if (nameEl) nameEl.textContent = user.name;
    var avatarEl = document.getElementById('phAvatarTop'); if (avatarEl) avatarEl.textContent = user.name.charAt(0);
    var roleNames = { admin: 'صاحب الصيدلية', pharmacist: 'صيدلي', cashier: 'كاشير', assistant: 'مساعد', employee: 'صيدلي' };
    var roleEl = document.getElementById('phRoleTop'); if (roleEl) roleEl.textContent = roleNames[user.role] || user.role;
    if (typeof phCloseModal === 'function') phCloseModal();
    // طبّق الصلاحيات الجديدة على القايمة
    if (typeof phApplyPermissions === 'function') phApplyPermissions();
    // روح للبيع - لأنه أكتر صفحة بيستخدمها اللي واقف
    var items = document.querySelectorAll('.ph-item');
    for (var i=0;i<items.length;i++) {
      var onclick = items[i].getAttribute('onclick') || '';
      if (onclick.indexOf("'pos'") !== -1) { if (typeof phSwitchPage === 'function') phSwitchPage(items[i], 'pos'); break; }
    }
    if (typeof showToast === 'function') showToast('✅ دلوقتي شغال: ' + user.name + ' (' + (roleNames[user.role] || user.role) + ')', 'success');
  }

  // ===== زرار تبديل في التوب بار =====
  function addQuickSwitchButton() {
    var topbar = document.querySelector('.ph-topbar-left');
    if (!topbar || document.getElementById('btnQuickSwitch')) return;
    var btn = document.createElement('button');
    btn.id = 'btnQuickSwitch';
    btn.className = 'btn btn-outline btn-sm';
    btn.innerHTML = '<i class="fas fa-exchange-alt"></i> تبديل المستخدم';
    btn.onclick = function(){ phQuickSwitch(); };
    btn.title = 'نفس الجهاز - بدّل بين الصيدلي والكاشير من غير خروج';
    topbar.appendChild(btn);
  }
  // حاول تضيف الزرار كل شوية لحد ما التوب بار يظهر
  var _try = 0;
  var _interval = setInterval(function(){
    _try++;
    if (document.querySelector('.ph-topbar-left')) { addQuickSwitchButton(); clearInterval(_interval); }
    if (_try > 20) clearInterval(_interval);
  }, 500);

  console.log('[Shared Device] ✅ جهاز واحد - تبديل سريع بالـ PIN');
})();
