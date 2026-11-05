/* ============================================
   PHARMACLOUD - BACKUP & RESTORE v3.0
   NO AUTO-BACKUP — Manual only (100% safe)
   ============================================ */
'use strict';

// 🔒 Prevent double-load
if (window.__PC_BACKUP_LOADED__) {
  console.log('[Backup] ⏸️ Already loaded — skipping');
} else {
  window.__PC_BACKUP_LOADED__ = true;

  (function() {

    var escapeHtml = window.escapeHtml || function(s) {
      if (s == null) return '';
      return String(s).replace(/[&<>"']/g, function(c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
      });
    };

    /* ============================================
       COLLECT ALL DATA
       ============================================ */
    function collectAllData() {
      var backup = {
        version: '5.0.0',
        app: 'PharmaCloud Pro',
        exportedAt: new Date().toISOString(),
        data: {}
      };

      for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('pc_') === 0) {
          try {
            backup.data[key] = JSON.parse(localStorage.getItem(key));
          } catch (e) {
            backup.data[key] = localStorage.getItem(key);
          }
        }
      }

      return backup;
    }

    /* ============================================
       EXPORT JSON
       ============================================ */
    function exportJSON() {
      var backup = collectAllData();
      var json = JSON.stringify(backup, null, 2);
      var blob = new Blob([json], { type: 'application/json' });

      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'pharmacloud-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      try { localStorage.setItem('pc_last_backup', Date.now().toString()); } catch (e) {}

      if (typeof Utils !== 'undefined') Utils.toast('✅ تم تصدير النسخة الاحتياطية', 'success');
      console.log('[Backup] Exported:', Object.keys(backup.data).length, 'items');
    }

    /* ============================================
       EXPORT EXCEL
       ============================================ */
    function exportExcel() {
      if (typeof XLSX === 'undefined') {
        if (typeof Utils !== 'undefined') Utils.toast('مكتبة Excel غير محملة', 'error');
        return;
      }

      var backup = collectAllData();
      var wb = XLSX.utils.book_new();

      if (backup.data.pc_t_demo_products) {
        var ws1 = XLSX.utils.json_to_sheet(backup.data.pc_t_demo_products);
        XLSX.utils.book_append_sheet(wb, ws1, 'المنتجات');
      }
      if (backup.data.pc_t_demo_orders) {
        var ws2 = XLSX.utils.json_to_sheet(backup.data.pc_t_demo_orders);
        XLSX.utils.book_append_sheet(wb, ws2, 'الطلبات');
      }
      if (backup.data.pc_t_demo_customers) {
        var ws3 = XLSX.utils.json_to_sheet(backup.data.pc_t_demo_customers);
        XLSX.utils.book_append_sheet(wb, ws3, 'العملاء');
      }
      if (backup.data.pc_tenants) {
        var ws4 = XLSX.utils.json_to_sheet(backup.data.pc_tenants);
        XLSX.utils.book_append_sheet(wb, ws4, 'الصيدليات');
      }

      XLSX.writeFile(wb, 'pharmacloud-data-' + Date.now() + '.xlsx');
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم تصدير Excel', 'success');
    }

    /* ============================================
       IMPORT
       ============================================ */
    function importJSON(file) {
      if (!file) return;

      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var backup = JSON.parse(e.target.result);

          if (!backup.data || !backup.version) {
            throw new Error('الملف غير صالح');
          }

          var dataKeys = Object.keys(backup.data);

          if (window.Dialog) {
            Dialog.confirm({
              type: 'warning',
              title: 'تأكيد الاستعادة',
              message: 'سيتم استبدال كل البيانات الحالية بـ:\n\n' +
                      '📅 تاريخ النسخة: ' + new Date(backup.exportedAt).toLocaleString('en-GB') + '\n' +
                      '📦 عدد العناصر: ' + dataKeys.length + '\n' +
                      '📱 الإصدار: ' + backup.version + '\n\n' +
                      '⚠️ لا يمكن التراجع عن هذه العملية!',
              confirmText: 'استعادة',
              cancelText: 'إلغاء'
            }).then(function(ok) {
              if (!ok) return;

              var keysToRemove = [];
              for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf('pc_') === 0) keysToRemove.push(key);
              }
              keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

              dataKeys.forEach(function(k) {
                try {
                  localStorage.setItem(k, JSON.stringify(backup.data[k]));
                } catch (err) {
                  console.warn('Failed to restore:', k);
                }
              });

              if (window.Dialog) {
                Dialog.success('تم الاستعادة', 'سيتم إعادة تحميل الصفحة الآن');
              }
              setTimeout(function() { window.location.reload(); }, 1500);
            });
          }
        } catch (err) {
          console.error(err);
          if (typeof Utils !== 'undefined') Utils.toast('❌ فشل قراءة الملف', 'error');
        }
      };
      reader.readAsText(file);
    }

    /* ============================================
       BACKUP MODAL
       ============================================ */
    function openBackupModal() {
      var modal = document.getElementById('phModalBox');
      if (!modal) return;

      var backup = collectAllData();
      var keys = Object.keys(backup.data);
      var totalSize = new Blob([JSON.stringify(backup)]).size;

      var h = '';
      h += '<div class="ph-modal-head">';
      h += '<h3><i class="fas fa-database"></i> النسخ الاحتياطي</h3>';
      h += '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
      h += '</div>';

      h += '<div class="ph-modal-body">';

      h += '<div class="backup-stats">';
      h += '<div class="backup-stat">';
      h += '<div class="backup-stat-icon" style="background:linear-gradient(135deg,#00b884,#1E88E5)"><i class="fas fa-hdd"></i></div>';
      h += '<div class="backup-stat-value">' + keys.length + '</div>';
      h += '<div class="backup-stat-label">مجموعة بيانات</div>';
      h += '</div>';
      h += '<div class="backup-stat">';
      h += '<div class="backup-stat-icon" style="background:linear-gradient(135deg,#7c3aed,#a78bfa)"><i class="fas fa-weight-hanging"></i></div>';
      h += '<div class="backup-stat-value">' + (totalSize / 1024).toFixed(1) + '</div>';
      h += '<div class="backup-stat-label">KB</div>';
      h += '</div>';
      h += '<div class="backup-stat">';
      h += '<div class="backup-stat-icon" style="background:linear-gradient(135deg,#10b981,#34d399)"><i class="fas fa-calendar"></i></div>';
      h += '<div class="backup-stat-value">' + new Date().toLocaleDateString('en-GB') + '</div>';
      h += '<div class="backup-stat-label">آخر نسخة</div>';
      h += '</div>';
      h += '</div>';

      h += '<div class="backup-section">';
      h += '<h4><i class="fas fa-download"></i> إنشاء نسخة احتياطية</h4>';
      h += '<div class="backup-actions">';
      h += '<button class="backup-action" onclick="Backup.exportJSON()">';
      h += '<div class="backup-action-icon" style="background:linear-gradient(135deg,#1E88E5,#42a5f5)"><i class="fas fa-file-code"></i></div>';
      h += '<div class="backup-action-info">';
      h += '<strong>تصدير JSON</strong>';
      h += '<span>نسخة كاملة (موصى به)</span>';
      h += '</div>';
      h += '</button>';
      h += '<button class="backup-action" onclick="Backup.exportExcel()">';
      h += '<div class="backup-action-icon" style="background:linear-gradient(135deg,#10b981,#34d399)"><i class="fas fa-file-excel"></i></div>';
      h += '<div class="backup-action-info">';
      h += '<strong>تصدير Excel</strong>';
      h += '<span>للمراجعة والطباعة</span>';
      h += '</div>';
      h += '</button>';
      h += '</div>';
      h += '</div>';

      h += '<div class="backup-section">';
      h += '<h4><i class="fas fa-upload"></i> استعادة نسخة</h4>';
      h += '<div class="file-upload">';
      h += '<input type="file" accept=".json" id="backupFileInput" onchange="Backup.handleImport(event)">';
      h += '<div class="file-upload-label">';
      h += '<i class="fas fa-cloud-upload-alt"></i> اختر ملف النسخة الاحتياطية (.json)';
      h += '</div>';
      h += '</div>';
      h += '<div class="backup-warning">';
      h += '<i class="fas fa-exclamation-triangle"></i>';
      h += '<span>⚠️ الاستعادة ستستبدل كل البيانات الحالية</span>';
      h += '</div>';
      h += '</div>';

      h += '<div class="backup-section backup-danger">';
      h += '<h4><i class="fas fa-trash"></i> منطقة الخطر</h4>';
      h += '<button class="backup-danger-btn" onclick="Backup.clearAll()">';
      h += '<i class="fas fa-times-circle"></i> مسح كل البيانات';
      h += '</button>';
      h += '</div>';

      h += '</div>';

      h += '<div class="ph-modal-foot">';
      h += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
      h += '</div>';

      modal.innerHTML = h;
      document.getElementById('phModalOverlay').classList.add('open');
    }

    /* ============================================
       CLEAR ALL
       ============================================ */
    function clearAll() {
      if (window.Dialog) {
        Dialog.confirm({
          type: 'danger',
          title: 'مسح كل البيانات',
          message: 'سيتم مسح كل البيانات نهائياً:\n\n' +
                  '• المنتجات\n' +
                  '• الطلبات\n' +
                  '• العملاء\n' +
                  '• الصيدليات\n' +
                  '• كل شيء\n\n' +
                  '⚠️ لا يمكن التراجع!',
          confirmText: 'نعم، امسح الكل',
          cancelText: 'إلغاء'
        }).then(function(ok) {
          if (!ok) return;

          setTimeout(function() {
            Dialog.confirm({
              type: 'danger',
              title: 'تأكيد نهائي',
              message: 'هل أنت متأكد 100%؟',
              confirmText: 'امسح',
              cancelText: 'إلغاء'
            }).then(function(ok2) {
              if (!ok2) return;

              var keysToRemove = [];
              for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key && key.indexOf('pc_') === 0) keysToRemove.push(key);
              }
              keysToRemove.forEach(function(k) { localStorage.removeItem(k); });

              if (typeof Utils !== 'undefined') Utils.toast('تم مسح كل البيانات', 'warning');
              setTimeout(function() { window.location.reload(); }, 1000);
            });
          }, 300);
        });
      }
    }

    /* ============================================
       PUBLIC API
       ============================================ */
    window.Backup = {
      open: openBackupModal,
      exportJSON: exportJSON,
      exportExcel: exportExcel,
      handleImport: function(e) {
        var file = e.target.files[0];
        if (file) importJSON(file);
      },
      clearAll: clearAll,
      collect: collectAllData
    };

    /* ============================================
       NO AUTO-BACKUP — REMOVED COMPLETELY ✅
       ============================================ */
    // ⛔️ تم حذف checkAutoBackup نهائياً
    // ⛔️ مفيش setTimeout
    // ⛔️ مفيش setInterval
    // ⛔️ المستخدم هو اللي يفتح Backup من الـ Sidebar

    console.log('[Backup] Loaded ✓ — NO auto-backup (manual only)');
  })();
}