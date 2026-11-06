/* PharmaCloud - Attendance PRO v2 - تطوير الحضور والانصراف */
/* حط الملف ده بعد app.js في index.html */
/* <script src="attendance-pro.js"></script> */
(function() {
  'use strict';
  console.log('[Attendance PRO] Loaded');

  // ===== إعدادات الوردية =====
  function attGetSettings() {
    try {
      var s = JSON.parse(localStorage.getItem('pc_' + (PH.tenantId || 't_demo') + '_attendance_settings') || '{}');
      return { shiftStart: s.shiftStart || '09:00', grace: s.grace || 15, shiftEnd: s.shiftEnd || '17:00' };
    } catch(e) { return { shiftStart: '09:00', grace: 15, shiftEnd: '17:00' }; }
  }
  function attSaveSettings(shiftStart, grace, shiftEnd) {
    localStorage.setItem('pc_' + (PH.tenantId || 't_demo') + '_attendance_settings', JSON.stringify({ shiftStart: shiftStart, grace: grace, shiftEnd: shiftEnd }));
  }

  function attCalcStatus(checkIn, settings) {
    if (!checkIn) return 'absent';
    var parts = settings.shiftStart.split(':'); var shiftMins = parseInt(parts[0])*60 + parseInt(parts[1]);
    var inParts = checkIn.split(':'); var inMins = parseInt(inParts[0])*60 + parseInt(inParts[1]);
    // checkIn هنا ممكن يكون "09:15 ص" - نحوله
    return (inMins - shiftMins) > settings.grace ? 'late' : 'present';
  }
  function attCalcHours(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    function toMins(t) {
      var m = t.match(/(\d+):(\d+)/); if (!m) return 0;
      var h = parseInt(m[1]); var min = parseInt(m[2]);
      if (t.includes('م') && h < 12) h += 12; // مساء
      if (t.includes('ص') && h === 12) h = 0;
      return h*60 + min;
    }
    var diff = toMins(checkOut) - toMins(checkIn);
    return diff > 0 ? (diff/60).toFixed(1) : 0;
  }

  // ===== تسجيل حضور لموظف معين (المدير يسجل لأي حد) =====
  window.attCheckInFor = function(userId, userName) {
    var now = new Date();
    var time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    var dateStr = now.toDateString();
    var attendance = PH.getAttendance() || [];
    var exists = attendance.find(function(a){ return new Date(a.date).toDateString() === dateStr && a.userId === userId; });
    if (exists && exists.checkIn) { showToast('تم تسجيل حضور ' + userName + ' قبل كده', 'warning'); return; }
    var settings = attGetSettings();
    var status = attCalcStatus(time, settings);
    attendance.unshift({ id: 'att_' + Date.now(), date: now.toISOString(), userId: userId, userName: userName, checkIn: time, checkOut: null, status: status, hours: 0, note: '' });
    PH.setAttendance(attendance);
    showToast('✅ حضور ' + userName + ' - ' + time + (status === 'late' ? ' (متأخر)' : ''), status === 'late' ? 'warning' : 'success');
    phRenderAttendance();
  };

  window.attCheckOutFor = function(userId, userName) {
    var now = new Date();
    var time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    var dateStr = now.toDateString();
    var attendance = PH.getAttendance() || [];
    var rec = attendance.find(function(a){ return new Date(a.date).toDateString() === dateStr && a.userId === userId; });
    if (!rec || !rec.checkIn) { showToast('لازم تسجل حضور الأول', 'error'); return; }
    if (rec.checkOut) { showToast('تم تسجيل انصراف قبل كده', 'warning'); return; }
    rec.checkOut = time;
    rec.hours = attCalcHours(rec.checkIn, rec.checkOut);
    PH.setAttendance(attendance);
    showToast('✅ انصراف ' + userName + ' - ' + time + ' (' + rec.hours + ' ساعة)', 'success');
    phRenderAttendance();
  };

  // ===== تعديل يدوي / غياب / حذف =====
  window.attMarkAbsent = function(userId, userName) {
    var now = new Date();
    var dateStr = now.toDateString();
    var attendance = PH.getAttendance() || [];
    var exists = attendance.find(function(a){ return new Date(a.date).toDateString() === dateStr && a.userId === userId; });
    if (exists) { showToast('فيه سجل لليوم ده بالفعل', 'warning'); return; }
    attendance.unshift({ id: 'att_' + Date.now(), date: now.toISOString(), userId: userId, userName: userName, checkIn: null, checkOut: null, status: 'absent', hours: 0, note: 'غياب' });
    PH.setAttendance(attendance);
    showToast('تم تسجيل غياب ' + userName, 'warning');
    phRenderAttendance();
  };
  window.attDeleteRecord = function(id) {
    if (!window.Dialog) return;
    Dialog.confirm({ type: 'danger', title: 'حذف سجل', message: 'هل تريد حذف سجل الحضور ده؟', confirmText: 'نعم، احذف', cancelText: 'إلغاء' }).then(function(ok){
      if (!ok) return;
      PH.setAttendance((PH.getAttendance() || []).filter(function(a){ return a.id !== id; }));
      phRenderAttendance();
    });
  };
  window.attExportExcel = function() {
    if (typeof XLSX === 'undefined') { showToast('مكتبة Excel مش محملة', 'error'); return; }
    var data = (PH.getAttendance() || []).map(function(a){
      return { 'التاريخ': new Date(a.date).toLocaleDateString('ar-EG'), 'الموظف': a.userName, 'الحضور': a.checkIn || '—', 'الانصراف': a.checkOut || '—', 'الساعات': a.hours || 0, 'الحالة': a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب' };
    });
    var ws = XLSX.utils.json_to_sheet(data.length ? data : [{ 'التاريخ': 'لا يوجد' }]);
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الحضور');
    XLSX.writeFile(wb, 'attendance-' + Date.now() + '.xlsx');
  };

  // ===== الرندر الرئيسي - بيغطي phRenderAttendance القديمة =====
  var _oldRender = window.phRenderAttendance;
  window.phRenderAttendance = function() {
    var team = [];
    try { team = PH.getTeam() || []; } catch(e) {}
    // لو مفيش فريق، استخدم المستخدم الحالي
    if (!team.length && typeof phSession !== 'undefined' && phSession) team = [{ id: phSession.userId, name: phSession.name, role: phSession.role }];
    var attendance = PH.getAttendance() || [];
    var todayStr = new Date().toDateString();
    var today = attendance.filter(function(a){ return new Date(a.date).toDateString() === todayStr; });
    var present = today.filter(function(a){ return a.status === 'present'; }).length;
    var late = today.filter(function(a){ return a.status === 'late'; }).length;
    var absent = today.filter(function(a){ return a.status === 'absent'; }).length;
    var totalHours = today.reduce(function(s,a){ return s + parseFloat(a.hours || 0); }, 0).toFixed(1);
    var settings = attGetSettings();

    var content = document.getElementById('phContent');
    if (!content) return;
    content.innerHTML = ''
      + '<div class="ph-page-head"><div><h1><i class="fas fa-clock"></i> الحضور والانصراف</h1><p>وردية ' + settings.shiftStart + ' - ' + settings.shiftEnd + ' | سماح تأخير ' + settings.grace + ' دقيقة</p></div>'
      + '<div class="ph-head-actions"><button class="btn btn-outline btn-sm" onclick="attExportExcel()"><i class="fas fa-file-excel"></i> تصدير Excel</button>'
      + '<button class="btn btn-outline btn-sm" onclick="attOpenSettings()">⚙️ إعدادات الوردية</button></div></div>'
      + '<div class="ph-kpi-grid">'
      + '<div class="ph-kpi g1"><div class="ph-kpi-value">' + present + '</div><div class="ph-kpi-label">حاضر اليوم</div></div>'
      + '<div class="ph-kpi g4"><div class="ph-kpi-value">' + late + '</div><div class="ph-kpi-label">متأخر</div></div>'
      + '<div class="ph-kpi g2"><div class="ph-kpi-value">' + absent + '</div><div class="ph-kpi-label">غائب</div></div>'
      + '<div class="ph-kpi g3"><div class="ph-kpi-value">' + totalHours + '</div><div class="ph-kpi-label">إجمالي ساعات اليوم</div></div></div>'
      + '<div class="ph-table-card"><div class="ph-table-head"><h3><i class="fas fa-users"></i> تسجيل اليوم - ' + new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</h3></div>'
      + '<div style="padding:16px;display:grid;gap:12px">'
      + team.map(function(m){
          var rec = today.find(function(a){ return a.userId === m.id; });
          var statusBadge = !rec ? '<span class="ph-badge ph-badge-gray">لم يسجل</span>' : rec.status === 'present' ? '<span class="ph-badge ph-badge-green">حاضر ' + rec.checkIn + '</span>' : rec.status === 'late' ? '<span class="ph-badge ph-badge-orange">متأخر ' + rec.checkIn + '</span>' : '<span class="ph-badge ph-badge-red">غائب</span>';
          var checkOutTxt = rec && rec.checkOut ? ' | انصراف ' + rec.checkOut + ' (' + rec.hours + ' س)' : '';
          return '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg-alt)">'
            + '<div><strong>' + m.name + '</strong> <span style="color:var(--text-muted);font-size:.85rem">(' + (m.role || 'موظف') + ')</span><div style="margin-top:4px">' + statusBadge + '<span style="font-size:.85rem;color:var(--text-muted)">' + checkOutTxt + '</span></div></div>'
            + '<div style="display:flex;gap:8px">'
            + '<button class="btn btn-primary btn-sm" onclick="attCheckInFor(\'' + m.id + '\', \'' + m.name + '\')" ' + (rec && rec.checkIn ? 'disabled' : '') + '><i class="fas fa-sign-in-alt"></i> حضور</button>'
            + '<button class="btn btn-outline btn-sm" onclick="attCheckOutFor(\'' + m.id + '\', \'' + m.name + '\')" ' + (!rec || !rec.checkIn || rec.checkOut ? 'disabled' : '') + '><i class="fas fa-sign-out-alt"></i> انصراف</button>'
            + '<button class="btn btn-outline btn-sm" style="color:var(--danger)" onclick="attMarkAbsent(\'' + m.id + '\', \'' + m.name + '\')" ' + (rec ? 'disabled' : '') + '>غياب</button>'
            + '</div></div>';
        }).join('')
      + '</div></div>'
      + '<div class="ph-table-card" style="margin-top:16px"><div class="ph-table-head"><h3><i class="fas fa-history"></i> سجل الحضور</h3></div><div style="overflow-x:auto"><table class="ph-table"><thead><tr><th>التاريخ</th><th>الموظف</th><th>حضور</th><th>انصراف</th><th>ساعات</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>'
      + (attendance.length ? attendance.slice(0, 30).map(function(a){
          var badge = a.status === 'present' ? '<span class="ph-badge ph-badge-green">حاضر</span>' : a.status === 'late' ? '<span class="ph-badge ph-badge-orange">متأخر</span>' : '<span class="ph-badge ph-badge-red">غائب</span>';
          return '<tr><td>' + new Date(a.date).toLocaleDateString('ar-EG') + '</td><td>' + a.userName + '</td><td>' + (a.checkIn || '—') + '</td><td>' + (a.checkOut || '—') + '</td><td>' + (a.hours || 0) + '</td><td>' + badge + '</td><td><button onclick="attDeleteRecord(\'' + a.id + '\')" style="color:var(--danger)"><i class="fas fa-trash"></i></button></td></tr>';
        }).join('') : '<tr><td colspan="7" style="text-align:center;padding:20px">لا يوجد سجلات بعد</td></tr>')
      + '</tbody></table></div></div>';
  };

  window.attOpenSettings = function() {
    var s = attGetSettings();
    document.getElementById('phModalBox').innerHTML = ''
      + '<div class="ph-modal-head"><h3>⚙️ إعدادات الوردية</h3><button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button></div>'
      + '<div class="ph-modal-body"><div class="ph-form-grid">'
      + '<div class="ph-form-group"><label>بداية الوردية</label><input type="time" id="attShiftStart" value="' + s.shiftStart + '"></div>'
      + '<div class="ph-form-group"><label>نهاية الوردية</label><input type="time" id="attShiftEnd" value="' + s.shiftEnd + '"></div>'
      + '<div class="ph-form-group"><label>سماح التأخير (دقيقة)</label><input type="number" id="attGrace" value="' + s.grace + '" min="0" max="60"></div>'
      + '</div></div><div class="ph-modal-foot"><button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button><button class="btn btn-primary" onclick="attSaveSettingsFromModal()">حفظ</button></div>';
    document.getElementById('phModalOverlay').classList.add('open');
  };
  window.attSaveSettingsFromModal = function() {
    attSaveSettings(document.getElementById('attShiftStart').value, parseInt(document.getElementById('attGrace').value) || 15, document.getElementById('attShiftEnd').value);
    phCloseModal(); phRenderAttendance(); showToast('✅ تم حفظ إعدادات الوردية', 'success');
  };

  // خلّي phCheckIn / phCheckOut القديمة تشتغل على المستخدم الحالي
  var _oldCheckIn = window.phCheckIn;
  window.phCheckIn = function() {
    if (typeof phSession !== 'undefined' && phSession) attCheckInFor(phSession.userId, phSession.name);
    else if (typeof _oldCheckIn === 'function') _oldCheckIn();
  };
  var _oldCheckOut = window.phCheckOut;
  window.phCheckOut = function() {
    if (typeof phSession !== 'undefined' && phSession) attCheckOutFor(phSession.userId, phSession.name);
    else if (typeof _oldCheckOut === 'function') _oldCheckOut();
  };

})();
