
// PATCH: Fixed cloud-sync to use Dialog.confirm instead of window.confirm
(function(){
  if (!window.CloudSync) return;
  var origClear = window.CloudSync.clearLocal;
  var origReset = window.CloudSync.resetSync;
  
  window.CloudSync.clearLocal = function() {
    if (typeof Dialog !== 'undefined' && Dialog.confirm) {
      Dialog.confirm({
        type: 'danger',
        title: 'مسح البيانات',
        message: 'سيتم مسح كل البيانات المحلية. متأكد؟',
        confirmText: 'نعم، امسح',
        cancelText: 'إلغاء'
      }).then(function(ok){
        if (!ok) return;
        try {
          var keys = ['pc_tenants','pc_users','pc_subscriptions','pc_t_demo_products','pc_t_demo_orders','pc_t_demo_customers','pc_t_demo_prescriptions','pc_t_demo_attendance','pc_t_demo_batches'];
          keys.forEach(function(k){ localStorage.removeItem(k); });
          if (window.Utils) Utils.toast('تم مسح البيانات', 'warning');
        } catch(e){}
      });
    } else {
      if (!confirm('سيتم مسح كل البيانات المحلية. متأكد؟')) return;
      var keys = ['pc_tenants','pc_users','pc_subscriptions','pc_t_demo_products','pc_t_demo_orders','pc_t_demo_customers','pc_t_demo_prescriptions','pc_t_demo_attendance','pc_t_demo_batches'];
      keys.forEach(function(k){ localStorage.removeItem(k); });
      if (window.Utils) Utils.toast('تم مسح البيانات', 'warning');
    }
  };

  window.CloudSync.resetSync = function() {
    if (typeof Dialog !== 'undefined' && Dialog.confirm) {
      Dialog.confirm({
        type: 'warning',
        title: 'إعادة تعيين المزامنة',
        message: 'إعادة تعيين المزامنة؟',
        confirmText: 'إعادة تعيين',
        cancelText: 'إلغاء'
      }).then(function(ok){
        if (!ok) return;
        try {
          localStorage.removeItem('pc_last_sync');
          localStorage.removeItem('pc_vector_clock');
          localStorage.removeItem('pc_pending_changes');
          if (window.Utils) Utils.toast('تم إعادة التعيين', 'success');
          location.reload();
        } catch(e){}
      });
    } else {
      if (!confirm('إعادة تعيين المزامنة؟')) return;
      localStorage.removeItem('pc_last_sync');
      localStorage.removeItem('pc_vector_clock');
      localStorage.removeItem('pc_pending_changes');
      if (window.Utils) Utils.toast('تم إعادة التعيين', 'success');
    }
  };
  console.log('[CloudSync Patch] ✅ clearLocal & resetSync fixed');
})();
