/* PharmaCloud - Attendance Monthly Report + Salaries */
/* حط الملف ده بعد attendance-pro.js في index.html */
/* <script src="attendance-monthly-report.js"></script> */
(function() {
  'use strict';
  console.log('[Attendance Report] Loaded');

  // ===== المرتبات =====
  function salaryKey() { return 'pc_' + (PH.tenantId || 't_demo') + '_salaries'; }
  function attGetSalary(userId) {
    try { var all = JSON.parse(localStorage.getItem(salaryKey()) || '{}'); return parseFloat(all[userId] || 0); } catch(e) { return 0; }
  }
  function attSetSalary(userId, amount) {
    var all = {}; try { all = JSON.parse(localStorage.getItem(salaryKey()) || '{}'); } catch(e) {}
    all[userId] = parseFloat(amount || 0);
    localStorage.setItem(salaryKey(), JSON.stringify(all));
  }
  window.attSetSalary = attSetSalary;
  window.attGetSalary = attGetSalary;

  // ===== حساب التقرير الشهري =====
  function attGetMonthlyData(year, month) {
    var attendance = PH.getAttendance() || [];
    var team = [];
    try { team = PH.getTeam() || []; } catch(e) {}
    if (!team.length && typeof phSession !== 'undefined' && phSession) team = [{ id: phSession.userId, name: phSession.name }];

    var result = team.map(function(m) {
      var recs = attendance.filter(function(a){
        var d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month && a.userId === m.id;
      });
      var present = recs.filter(function(a){ return a.status === 'present'; }).length;
      var late = recs.filter(function(a){ return a.status === 'late'; }).length;
      var absent = recs.filter(function(a){ return a.status === 'absent'; }).length;
      var totalHours = recs.reduce(function(s,a){ return s + parseFloat(a.hours || 0); }, 0);
      var base = attGetSalary(m.id);
      var workingDays = 26; // افتراضي: 26 يوم شغل في الشهر (الجمعة أجازة)
      var dailyRate = base > 0 ? (base / workingDays) : 0;
      var lateDeduction = late * 50; // 50 جنيه خصم على كل يوم تأخير
      var absentDeduction = absent * dailyRate; // خصم يوم كامل على الغياب
      var overtimeHours = 0;
      recs.forEach(function(a){ var h = parseFloat(a.hours || 0); if (h > 8) overtimeHours += (h - 8); });
      var overtimeBonus = overtimeHours * (dailyRate / 8) * 1.5; // ساعة إضافية = 1.5 ضعف
      var net = base - lateDeduction - absentDeduction + overtimeBonus;
      if (base === 0) net = 0;
      var attendanceRate = (present + late + absent) > 0 ? Math.round(((present + late) / (present + late + absent)) * 100) : 0;
      return { id: m.id, name: m.name, role: m.role || 'موظف', present: present, late: late, absent: absent, totalDays: present + late + absent, totalHours: totalHours.toFixed(1), overtimeHours: overtimeHours.toFixed(1), attendanceRate: attendanceRate, base: base, dailyRate: dailyRate.toFixed(0), lateDeduction: lateDeduction.toFixed(0), absentDeduction: absentDeduction.toFixed(0), overtimeBonus: overtimeBonus.toFixed(0), net: net.toFixed(0) };
    });
    return result;
  }

  // ===== عرض التقرير =====
  window.attOpenMonthlyReport = function() {
    var now = new Date();
    var year = now.getFullYear(); var month = now.getMonth();
    attRenderMonthlyReport(year, month);
  };

  window.attRenderMonthlyReport = function(year, month) {
    var data = attGetMonthlyData(year, month);
    var monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    var totalPresent = data.reduce(function(s,d){ return s + d.present; }, 0);
    var totalLate = data.reduce(function(s,d){ return s + d.late; }, 0);
    var totalAbsent = data.reduce(function(s,d){ return s + d.absent; }, 0);
    var totalHours = data.reduce(function(s,d){ return s + parseFloat(d.totalHours); }, 0).toFixed(1);
    var totalNet = data.reduce(function(s,d){ return s + parseFloat(d.net); }, 0).toFixed(0);

    var content = document.getElementById('phContent');
    if (!content) return;
    content.innerHTML = ''
      + '<div class="ph-page-head"><div><h1><i class="fas fa-chart-bar"></i> التقرير الشهري والمرتبات</h1><p>' + monthNames[month] + ' ' + year + ' | 26 يوم شغل | خصم التأخير 50 ج | خصم الغياب يوم كامل</p></div>'
      + '<div class="ph-head-actions"><button class="btn btn-outline btn-sm" onclick="phRenderAttendance()"><i class="fas fa-arrow-right"></i> رجوع للحضور اليومي</button>'
      + '<button class="btn btn-outline btn-sm" onclick="attExportMonthlyExcel(' + year + ',' + month + ')"><i class="fas fa-file-excel"></i> تصدير Excel</button></div></div>'
      + '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;align-items:center;background:var(--bg-alt);padding:12px;border-radius:10px">'
      + '<label>الشهر:</label><select id="attMonthSel" class="ph-select" onchange="attRenderMonthlyReport(' + year + ', parseInt(this.value))">' + monthNames.map(function(n,i){ return '<option value="' + i + '" ' + (i===month ? 'selected' : '') + '>' + n + '</option>'; }).join('') + '</select>'
      + '<label>السنة:</label><select id="attYearSel" class="ph-select" onchange="attRenderMonthlyReport(parseInt(this.value), ' + month + ')"><option value="2025" ' + (year===2025?'selected':'') + '>2025</option><option value="2026" ' + (year===2026?'selected':'') + '>2026</option><option value="2027" ' + (year===2027?'selected':'') + '>2027</option></select>'
      + '</div>'
      + '<div class="ph-kpi-grid"><div class="ph-kpi g1"><div class="ph-kpi-value">' + totalPresent + '</div><div class="ph-kpi-label">إجمالي أيام الحضور</div></div>'
      + '<div class="ph-kpi g4"><div class="ph-kpi-value">' + totalLate + '</div><div class="ph-kpi-label">إجمالي التأخير</div></div>'
      + '<div class="ph-kpi g2"><div class="ph-kpi-value">' + totalAbsent + '</div><div class="ph-kpi-label">إجمالي الغياب</div></div>'
      + '<div class="ph-kpi g3"><div class="ph-kpi-value">' + totalHours + ' س</div><div class="ph-kpi-label">إجمالي الساعات</div></div>'
      + '<div class="ph-kpi g1"><div class="ph-kpi-value">' + totalNet + ' ج</div><div class="ph-kpi-label">إجمالي المرتبات الصافية</div></div></div>'
      + '<div class="ph-table-card"><div class="ph-table-head"><h3><i class="fas fa-users"></i> تقرير كل موظف - ' + monthNames[month] + ' ' + year + '</h3></div><div style="overflow-x:auto"><table class="ph-table"><thead><tr><th>الموظف</th><th>حاضر</th><th>متأخر</th><th>غائب</th><th>نسبة الحضور</th><th>ساعات</th><th>إضافي</th><th>الأساسي</th><th>خصم تأخير</th><th>خصم غياب</th><th>إضافي +</th><th>الصافي</th><th>تعديل مرتب</th></tr></thead><tbody>'
      + (data.length ? data.map(function(d){
          return '<tr><td><strong>' + d.name + '</strong><br><span style="color:var(--text-muted);font-size:.8rem">' + d.role + '</span></td>'
            + '<td><span class="ph-badge ph-badge-green">' + d.present + '</span></td>'
            + '<td><span class="ph-badge ph-badge-orange">' + d.late + '</span></td>'
            + '<td><span class="ph-badge ph-badge-red">' + d.absent + '</span></td>'
            + '<td>' + d.attendanceRate + '%</td><td>' + d.totalHours + '</td><td>' + d.overtimeHours + '</td>'
            + '<td>' + d.base + ' ج</td><td style="color:var(--danger)">-' + d.lateDeduction + ' ج</td><td style="color:var(--danger)">-' + d.absentDeduction + ' ج</td><td style="color:var(--success)">+' + d.overtimeBonus + ' ج</td>'
            + '<td><strong>' + d.net + ' ج</strong></td>'
            + '<td><div style="display:flex;gap:6px"><input type="number" id="sal_' + d.id + '" value="' + d.base + '" style="width:90px" class="ph-input" placeholder="المرتب"><button class="btn btn-primary btn-sm" onclick="attSaveSalaryUI(\'' + d.id + '\', ' + year + ',' + month + ')">حفظ</button></div></td></tr>';
        }).join('') : '<tr><td colspan="13" style="text-align:center;padding:20px">لا يوجد موظفين</td></tr>')
      + '</tbody></table></div></div>'
      + '<div style="margin-top:16px;background:var(--bg-alt);padding:14px;border-radius:10px;font-size:.85rem;color:var(--text-muted)">'
      + '<strong>طريقة الحساب:</strong><br>• المرتب اليومي = المرتب الأساسي ÷ 26 يوم<br>• خصم التأخير = عدد أيام التأخير × 50 جنيه<br>• خصم الغياب = عدد أيام الغياب × المرتب اليومي<br>• الإضافي = ساعات فوق 8 ساعات في اليوم × (المرتب اليومي ÷ 8) × 1.5<br>• الصافي = الأساسي - خصم تأخير - خصم غياب + إضافي</div>';
  };

  window.attSaveSalaryUI = function(userId, year, month) {
    var input = document.getElementById('sal_' + userId);
    if (!input) return;
    attSetSalary(userId, input.value);
    showToast('✅ تم حفظ المرتب', 'success');
    attRenderMonthlyReport(year, month);
  };

  window.attExportMonthlyExcel = function(year, month) {
    if (typeof XLSX === 'undefined') { showToast('مكتبة Excel مش محملة', 'error'); return; }
    var data = attGetMonthlyData(year, month);
    var rows = data.map(function(d){
      return { 'الموظف': d.name, 'حاضر': d.present, 'متأخر': d.late, 'غائب': d.absent, 'نسبة الحضور %': d.attendanceRate, 'إجمالي الساعات': d.totalHours, 'ساعات إضافية': d.overtimeHours, 'المرتب الأساسي': d.base, 'خصم تأخير': d.lateDeduction, 'خصم غياب': d.absentDeduction, 'بدل إضافي': d.overtimeBonus, 'الصافي': d.net };
    });
    var ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'الموظف': 'لا يوجد' }]);
    var wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'المرتبات');
    XLSX.writeFile(wb, 'salaries-' + year + '-' + (month+1) + '.xlsx');
  };

  // زرار التقرير في صفحة الحضور - نضيفه لو phRenderAttendance اتنادت
  var _origRenderAttendance = window.phRenderAttendance;
  // هنستنى لحد ما attendance-pro يحمل، وبعدين نعدل الزراير
  setTimeout(function(){
    // لو صفحة الحضور فيها زرار تصدير، نضيف جنبه زرار التقرير الشهري عن طريق MutationObserver بسيط
    // بدل كده: نعمل override خفيف يضيف الزرار بعد الرندر
    if (typeof window.phRenderAttendance === 'function') {
      var baseRender = window.phRenderAttendance;
      window.phRenderAttendance = function() {
        baseRender();
        // أضف زرار التقرير الشهري في الهيدر لو مش موجود
        var headActions = document.querySelector('.ph-head-actions');
        if (headActions && !document.getElementById('btnMonthlyReport')) {
          var btn = document.createElement('button');
          btn.id = 'btnMonthlyReport';
          btn.className = 'btn btn-primary btn-sm';
          btn.innerHTML = '<i class="fas fa-chart-bar"></i> التقرير الشهري والمرتبات';
          btn.onclick = function(){ attOpenMonthlyReport(); };
          headActions.appendChild(btn);
        }
      };
      console.log('[Attendance Report] زر التقرير الشهري اتضاف');
    }
  }, 500);

})();
