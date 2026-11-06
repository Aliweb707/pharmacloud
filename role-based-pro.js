/* PharmaCloud - Role-Based Access Control PRO */
/* حط الملف ده بعد attendance-monthly-report.js في index.html */
/* <script src="role-based-pro.js"></script> */
(function() {
  'use strict';
  console.log('[RBAC PRO] Loaded - نظام الصلاحيات');

  // ===== تعريف الأدوار والصلاحيات =====
  // تحليل: صاحب الصيدلية مش موجود أغلب الوقت، فلازم يشوف كل حاجة عن بُعد
  // الصيدلي اللي واقف في الصيدلية محتاج بيع + أدوية + حضور، مش مرتبات ولا إعدادات
  var ROLES = {
    admin: {
      label: 'صاحب الصيدلية / مدير',
      desc: 'شايف كل حاجة - حتى وهو مش موجود',
      pages: ['overview','pos','orders','products','prescriptions','customers','attendance','attendance_report','team','reports','subscription','settings','branches','api','online','bi'],
      can: { viewFinancials: true, editProducts: true, deleteProducts: true, manageTeam: true, viewSalaries: true, editSettings: true, viewSubscription: true, exportData: true, manageBranches: true, deleteOrders: true }
    },
    pharmacist: {
      label: 'صيدلي / ممارس',
      desc: 'اللي واقف في الصيدلية - بيع + أدوية + حضور',
      pages: ['pos','orders','products','prescriptions','customers','attendance','online'],
      can: { viewFinancials: false, editProducts: true, deleteProducts: false, manageTeam: false, viewSalaries: false, editSettings: false, viewSubscription: false, exportData: false, manageBranches: false, deleteOrders: false }
    },
    cashier: {
      label: 'كاشير',
      desc: 'بيع بس',
      pages: ['pos','orders','customers'],
      can: { viewFinancials: false, editProducts: false, deleteProducts: false, manageTeam: false, viewSalaries: false, editSettings: false, viewSubscription: false, exportData: false, manageBranches: false, deleteOrders: false }
    },
    assistant: {
      label: 'مساعد / متدرب',
      desc: 'بيتعلم - بيع وعرض أدوية بس من غير تعديل',
      pages: ['pos','products','prescriptions'],
      can: { viewFinancials: false, editProducts: false, deleteProducts: false, manageTeam: false, viewSalaries: false, editSettings: false, viewSubscription: false, exportData: false, manageBranches: false, deleteOrders: false }
    }
  };
  window.PH_ROLES = ROLES;

  function getCurrentRole() {
    if (typeof phSession !== 'undefined' && phSession) {
      // لو الدور القديم employee -> حوله لـ pharmacist
      if (phSession.role === 'employee') return 'pharmacist';
      if (phSession.role === 'owner') return 'admin';
      return phSession.role || 'pharmacist';
    }
    return 'pharmacist';
  }
  window.getCurrentRole = getCurrentRole;

  function can(perm) {
    var role = getCurrentRole();
    var def = ROLES[role] || ROLES.pharmacist;
    return !!(def.can && def.can[perm]);
  }
  window.phCan = can;

  // ===== حماية الصفحات =====
  var _origRenderPage = window.phRenderPage;
  window.phRenderPage = function(page) {
    var role = getCurrentRole();
    var def = ROLES[role] || ROLES.pharmacist;
    // التقرير الشهري يعتبر جزء من الحضور
    var checkPage = page === 'attendance_report' ? 'attendance' : page;
    // لو صاحب الصيدلية -> كل حاجة مسموحة
    if (role === 'admin') {
      if (page === 'attendance_report') { if (typeof attOpenMonthlyReport === 'function') attOpenMonthlyReport(); return; }
      if (typeof _origRenderPage === 'function') return _origRenderPage(page);
      return;
    }
    // لو الصفحة مش مسموحة للدور ده -> رجعه للـ POS
    if (def.pages.indexOf(checkPage) === -1) {
      if (typeof showToast === 'function') showToast('ليس لديك صلاحية لعرض ' + page + ' - دورك: ' + def.label, 'error');
      // رجعه للبيع
      var items = document.querySelectorAll('.ph-item');
      // لاقي زرار POS
      for (var i=0;i<items.length;i++) {
        var onclick = items[i].getAttribute('onclick') || '';
        if (onclick.indexOf("'pos'") !== -1) { if (typeof phSwitchPage === 'function') phSwitchPage(items[i], 'pos'); break; }
      }
      return;
    }
    if (page === 'attendance_report') { if (typeof attOpenMonthlyReport === 'function') attOpenMonthlyReport(); return; }
    if (typeof _origRenderPage === 'function') return _origRenderPage(page);
  };

  // ===== إخفاء أزرار القايمة حسب الدور =====
  var _origApplyPerms = window.phApplyPermissions;
  window.phApplyPermissions = function() {
    var role = getCurrentRole();
    var def = ROLES[role] || ROLES.pharmacist;
    // لو أدمن -> اظهر كل حاجة
    if (role === 'admin') {
      document.querySelectorAll('.ph-item').forEach(function(item){ item.style.display = ''; });
      // أضف لوحة مراقبة عن بُعد للمالك في الـ Overview
      setTimeout(addOwnerRemoteWidget, 600);
      return;
    }
    // غير كده -> اخفي اللي مش مسموح
    document.querySelectorAll('.ph-item').forEach(function(item){
      var onclick = item.getAttribute('onclick') || '';
      var page = '';
      var m = onclick.match(/'([^']+)'/);
      if (m) page = m[1];
      // أزرار مش صفحات (نسخ احتياطي، AI، إلخ) -> اخفيها لغير الأدمن
      if (!page) {
        if (onclick.indexOf('Backup') !== -1 || onclick.indexOf('Voice') !== -1 || onclick.indexOf('SmartNotifications') !== -1 || onclick.indexOf('ReceiptPrinter') !== -1 || onclick.indexOf('PaymentModal') !== -1) {
          item.style.display = 'none'; return;
        }
        // زرار تسجيل الخروج يفضل
        if (onclick.indexOf('phLogout') !== -1) { item.style.display = ''; return; }
        item.style.display = '';
        return;
      }
      if (def.pages.indexOf(page) === -1) item.style.display = 'none';
      else item.style.display = '';
    });
    // الصيدلي: اخفي أزرار الحذف والتعديل الحساس في المنتجات لو مش مسموح
    setTimeout(function(){
      if (!can('deleteProducts')) {
        document.querySelectorAll('[onclick*="phDeleteProduct"]').forEach(function(b){ b.style.display = 'none'; });
      }
      if (!can('viewSalaries')) {
        var salBtn = document.getElementById('btnMonthlyReport');
        if (salBtn) salBtn.style.display = 'none';
      }
    }, 300);
  };

  // ===== لوحة مراقبة عن بُعد للمالك (وهو مش موجود) =====
  function addOwnerRemoteWidget() {
    // لو مش في صفحة Overview متعملش حاجة
    var content = document.getElementById('phContent');
    if (!content || !content.innerHTML.includes('لوحة التحكم')) return;
    if (document.getElementById('ownerRemoteWidget')) return;
    var attendance = []; try { attendance = PH.getAttendance() || []; } catch(e) {}
    var todayStr = new Date().toDateString();
    var today = attendance.filter(function(a){ return new Date(a.date).toDateString() === todayStr; });
    var presentNow = today.filter(function(a){ return a.checkIn && !a.checkOut; }).length;
    var orders = []; try { orders = PH.getOrders() || []; } catch(e) {}
    var todayOrders = orders.filter(function(o){ return new Date(o.createdAt).toDateString() === todayStr; });
    var todaySales = todayOrders.reduce(function(s,o){ return s + parseFloat(o.total || 0); }, 0);
    var products = []; try { products = PH.getProducts() || []; } catch(e) {}
    var lowStock = products.filter(function(p){ return (p.stock || 0) <= (p.minStock || 10); }).length;
    var expired = products.filter(function(p){ if (!p.expiry) return false; return new Date(p.expiry) < new Date(); }).length;

    var widget = document.createElement('div');
    widget.id = 'ownerRemoteWidget';
    widget.innerHTML = '<div style="background:linear-gradient(135deg,#0f172a,#1e293b);color:#fff;padding:18px;border-radius:14px;margin-bottom:16px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center"><h3 style="margin:0">👁️ مراقبة عن بُعد - وانت مش موجود</h3><span style="background:#22c55e;color:#fff;padding:4px 10px;border-radius:20px;font-size:.8rem">● مباشر</span></div>'
      + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:14px">'
      + '<div style="background:rgba(255,255,255,.08);padding:12px;border-radius:10px"><div style="font-size:1.4rem;font-weight:700">' + presentNow + ' موظف</div><div style="font-size:.85rem;opacity:.8">موجودين دلوقتي في الصيدلية</div></div>'
      + '<div style="background:rgba(255,255,255,.08);padding:12px;border-radius:10px"><div style="font-size:1.4rem;font-weight:700">' + todayOrders.length + ' فاتورة</div><div style="font-size:.85rem;opacity:.8">مبيعات اليوم: ' + todaySales.toFixed(0) + ' ج</div></div>'
      + '<div style="background:rgba(255,255,255,.08);padding:12px;border-radius:10px"><div style="font-size:1.4rem;font-weight:700">' + lowStock + ' منتج</div><div style="font-size:.85rem;opacity:.8">مخزون منخفض - محتاج طلب</div></div>'
      + '<div style="background:rgba(255,255,255,.08);padding:12px;border-radius:10px"><div style="font-size:1.4rem;font-weight:700">' + expired + ' منتج</div><div style="font-size:.85rem;opacity:.8">منتهي الصلاحية</div></div>'
      + '</div><div style="margin-top:12px;font-size:.85rem;opacity:.8">💡 انت شايف ده عشان دورك صاحب الصيدلية - الصيدلي اللي واقف مش شايف المرتبات ولا التقارير المالية.</div></div>';
    content.prepend(widget);
  }
  window.addOwnerRemoteWidget = addOwnerRemoteWidget;

  // ===== تغيير دور موظف (للمدير بس) =====
  window.phChangeUserRole = function(userId, newRole) {
    if (getCurrentRole() !== 'admin') { showToast('بس صاحب الصيدلية يقدر يغير الأدوار', 'error'); return; }
    var users = [];
    try { users = DB.getUsers() || []; } catch(e) {}
    var u = users.find(function(x){ return x.id === userId; });
    if (!u) return;
    u.role = newRole;
    try { DB.setUsers(users); } catch(e) { localStorage.setItem('pc_users', JSON.stringify(users)); }
    showToast('✅ تم تغيير دور ' + u.name + ' إلى ' + (ROLES[newRole] ? ROLES[newRole].label : newRole), 'success');
    if (typeof phRenderTeam === 'function') phRenderTeam();
  };

  // ===== إضافة اختيار الدور في صفحة الفريق =====
  var _origRenderTeam = window.phRenderTeam;
  window.phRenderTeam = function() {
    if (typeof _origRenderTeam === 'function') _origRenderTeam();
    // بعد ما الفريق يترسم، ضيف عمود الدور لو الأدمن
    if (getCurrentRole() !== 'admin') return;
    setTimeout(function(){
      var rows = document.querySelectorAll('.ph-table tbody tr');
      rows.forEach(function(tr){
        if (tr.querySelector('.role-select')) return;
        var cells = tr.querySelectorAll('td');
        if (!cells.length) return;
        // حاول نجيب اسم الموظف من أول خلية
        var name = cells[0] ? cells[0].textContent.trim() : '';
        var users = []; try { users = DB.getUsers() || []; } catch(e) {}
        var user = users.find(function(u){ return u.name === name; });
        if (!user) return;
        var td = document.createElement('td');
        td.innerHTML = '<select class="ph-select role-select" style="min-width:130px" onchange="phChangeUserRole(\'' + user.id + '\', this.value)">'
          + Object.keys(ROLES).map(function(k){ return '<option value="' + k + '" ' + (user.role === k || (user.role === 'employee' && k === 'pharmacist') ? 'selected' : '') + '>' + ROLES[k].label + '</option>'; }).join('')
          + '</select>';
        tr.appendChild(td);
        // ضيف هيدر لو مش موجود
        var theadTr = document.querySelector('.ph-table thead tr');
        if (theadTr && !theadTr.querySelector('.role-th')) {
          var th = document.createElement('th'); th.className = 'role-th'; th.textContent = 'الدور / الصلاحية'; theadTr.appendChild(th);
        }
      });
    }, 400);
  };

  console.log('[RBAC PRO] ✅ أدوار: admin / pharmacist / cashier / assistant');
})();
