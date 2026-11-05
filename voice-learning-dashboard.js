/* ============================================
   PHARMACLOUD - VOICE LEARNING DASHBOARD
   Shows what the AI learned from the pharmacist
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function loadLearning() {
    if (typeof VoicePOS !== 'undefined' && VoicePOS.getLearning) {
      return VoicePOS.getLearning();
    }
    try {
      return JSON.parse(localStorage.getItem('pc_voice_ai_learning') || '{"corrections":{},"frequency":{},"patterns":{}}');
    } catch (e) {
      return { corrections: {}, frequency: {}, patterns: {} };
    }
  }

  function loadShortcuts() {
    if (typeof VoicePOS !== 'undefined' && VoicePOS.getShortcuts) {
      return VoicePOS.getShortcuts();
    }
    try {
      return JSON.parse(localStorage.getItem('pc_voice_shortcuts') || '{}');
    } catch (e) { return {}; }
  }

  function loadNotes() {
    if (typeof VoicePOS !== 'undefined' && VoicePOS.getNotes) {
      return VoicePOS.getNotes();
    }
    try {
      return JSON.parse(localStorage.getItem('pc_voice_notes') || '{}');
    } catch (e) { return {}; }
  }

  var Dashboard = {
    open: function() {
      this.render();
    },

    render: function() {
      var learning = loadLearning();
      var shortcuts = loadShortcuts();
      var notes = loadNotes();

      var correctionsCount = Object.keys(learning.corrections).length;
      var frequencyCount = Object.keys(learning.frequency).length;
      var patternsCount = Object.keys(learning.patterns).length;
      var shortcutsCount = Object.keys(shortcuts).length;
      var notesCount = Object.keys(notes).length;

      // Top actions
      var topActions = Object.keys(learning.frequency)
        .map(function(k) { return { action: k, count: learning.frequency[k] }; })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 8);

      // Recent corrections
      var corrections = Object.keys(learning.corrections)
        .map(function(k) { return { wrong: k, right: learning.corrections[k] }; })
        .slice(0, 10);

      // Recent patterns
      var patterns = Object.keys(learning.patterns)
        .map(function(k) { return { pattern: k, count: learning.patterns[k] }; })
        .sort(function(a, b) { return b.count - a.count; })
        .slice(0, 10);

      var actionLabels = {
        add: { label: 'إضافة للسلة', icon: 'fa-cart-plus', color: '#00b884' },
        remove: { label: 'إزالة', icon: 'fa-cart-arrow-down', color: '#f59e0b' },
        discount: { label: 'خصم', icon: 'fa-percentage', color: '#7c3aed' },
        checkout: { label: 'إتمام البيع', icon: 'fa-check-circle', color: '#10b981' },
        clear: { label: 'تفريغ السلة', icon: 'fa-trash', color: '#dc2626' },
        query: { label: 'استعلام', icon: 'fa-question-circle', color: '#1E88E5' },
        search: { label: 'بحث', icon: 'fa-search', color: '#06b6d4' },
        change_qty: { label: 'تغيير كمية', icon: 'fa-edit', color: '#7c3aed' },
        report: { label: 'تقرير', icon: 'fa-chart-bar', color: '#1E88E5' },
        scan_rx: { label: 'مسح روشتة', icon: 'fa-camera', color: '#7c3aed' },
        note: { label: 'ملاحظة', icon: 'fa-sticky-note', color: '#f59e0b' },
        help: { label: 'مساعدة', icon: 'fa-life-ring', color: '#64748b' },
        greeting: { label: 'تحية', icon: 'fa-hand-wave', color: '#f59e0b' }
      };

      var modal = document.getElementById('phModalBox');
      if (!modal) return;

      var html = '';
      html += '<div class="ph-modal-head" style="background:linear-gradient(135deg,#7c3aed,#1E88E5);color:#fff">';
      html += '<h3 style="color:#fff"><i class="fas fa-brain"></i> لوحة تعلم المساعد</h3>';
      html += '<button class="ph-modal-close" onclick="phCloseModal()" style="background:rgba(255,255,255,.2);color:#fff"><i class="fas fa-times"></i></button>';
      html += '</div>';

      html += '<div class="ph-modal-body">';

      // KPI Grid
      html += '<div class="vld-kpi-grid">';
      html += this.kpi('التصحيحات', correctionsCount, 'fa-edit', '#7c3aed');
      html += this.kpi('الأوامر المتكررة', frequencyCount, 'fa-redo', '#00b884');
      html += this.kpi('الأنماط', patternsCount, 'fa-chart-line', '#1E88E5');
      html += this.kpi('الاختصارات', shortcutsCount, 'fa-bolt', '#f59e0b');
      html += this.kpi('الملاحظات', notesCount, 'fa-sticky-note', '#06b6d4');
      html += this.kpi('إجمالي التفاعلات', frequencyCount + patternsCount, 'fa-comments', '#10b981');
      html += '</div>';

      // Top actions
      if (topActions.length > 0) {
        html += '<div class="vld-section">';
        html += '<h4><i class="fas fa-fire"></i> الأكثر استخداماً</h4>';
        html += '<div class="vld-bars">';
        var maxCount = topActions[0].count;
        topActions.forEach(function(a) {
          var info = actionLabels[a.action] || { label: a.action, icon: 'fa-circle', color: '#64748b' };
          var pct = (a.count / maxCount) * 100;
          html += '<div class="vld-bar-row">';
          html += '<div class="vld-bar-label"><i class="fas ' + info.icon + '" style="color:' + info.color + '"></i> ' + info.label + '</div>';
          html += '<div class="vld-bar-track"><div class="vld-bar-fill" style="width:' + pct + '%;background:' + info.color + '"></div></div>';
          html += '<div class="vld-bar-count">' + a.count + '</div>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Corrections
      if (corrections.length > 0) {
        html += '<div class="vld-section">';
        html += '<h4><i class="fas fa-edit"></i> التصحيحات (تعلّم من أخطائه)</h4>';
        html += '<div class="vld-list">';
        corrections.forEach(function(c) {
          html += '<div class="vld-list-item">';
          html += '<span class="vld-wrong">' + escapeHtml(c.wrong) + '</span>';
          html += '<i class="fas fa-arrow-left" style="color:#94a3b8"></i>';
          html += '<span class="vld-right">' + escapeHtml(c.right) + '</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Patterns
      if (patterns.length > 0) {
        html += '<div class="vld-section">';
        html += '<h4><i class="fas fa-chart-line"></i> الأنماط المتكررة</h4>';
        html += '<div class="vld-list">';
        patterns.forEach(function(p) {
          html += '<div class="vld-list-item vld-pattern">';
          html += '<i class="fas fa-quote-left" style="color:#94a3b8"></i>';
          html += '<span style="flex:1">' + escapeHtml(p.pattern) + '</span>';
          html += '<span class="vld-badge">' + p.count + '×</span>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Shortcuts
      if (shortcutsCount > 0) {
        html += '<div class="vld-section">';
        html += '<h4><i class="fas fa-bolt"></i> الاختصارات المخصصة</h4>';
        html += '<div class="vld-list">';
        Object.keys(shortcuts).forEach(function(trigger) {
          html += '<div class="vld-list-item vld-shortcut">';
          html += '<span class="vld-trigger">"' + escapeHtml(trigger) + '"</span>';
          html += '<i class="fas fa-arrow-left" style="color:#94a3b8"></i>';
          html += '<span style="flex:1;color:#64748b">' + escapeHtml(shortcuts[trigger]) + '</span>';
          html += '<button class="vld-delete" onclick="VoiceDashboard.deleteShortcut(\'' + escapeHtml(trigger).replace(/'/g, "\\'") + '\')">';
          html += '<i class="fas fa-trash"></i>';
          html += '</button>';
          html += '</div>';
        });
        html += '</div></div>';
      }

      // Empty state
      if (correctionsCount + frequencyCount + patternsCount + shortcutsCount + notesCount === 0) {
        html += '<div class="vld-empty">';
        html += '<i class="fas fa-brain" style="font-size:3rem;opacity:.2;color:#7c3aed"></i>';
        html += '<h3>لسه مفيش تعلم</h3>';
        html += '<p>ابدأ استخدم المساعد الصوتي — وهيتعلم من كل أمر</p>';
        html += '</div>';
      }

      html += '</div>';

      html += '<div class="ph-modal-foot">';
      html += '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>';
      html += '<button class="btn btn-danger" onclick="VoiceDashboard.reset()"><i class="fas fa-trash"></i> مسح كل التعلم</button>';
      html += '</div>';

      modal.innerHTML = html;

      var overlay = document.getElementById('phModalOverlay');
      if (overlay) overlay.classList.add('open');
    },

    kpi: function(label, value, icon, color) {
      return '<div class="vld-kpi">' +
        '<div class="vld-kpi-icon" style="background:' + color + '"><i class="fas ' + icon + '"></i></div>' +
        '<div class="vld-kpi-value">' + value + '</div>' +
        '<div class="vld-kpi-label">' + label + '</div>' +
        '</div>';
    },

    deleteShortcut: function(trigger) {
      if (typeof VoicePOS === 'undefined') return;
      var shortcuts = loadShortcuts();
      delete shortcuts[trigger];
      try {
        localStorage.setItem('pc_voice_shortcuts', JSON.stringify(shortcuts));
      } catch (e) {}
      this.render();
      if (window.Dialog) Dialog.success('تم الحذف', 'اختصار "' + trigger + '" اتشال');
    },

    reset: function() {
      if (window.Dialog) {
        Dialog.confirm({
          type: 'danger',
          title: 'مسح كل التعلم',
          message: 'سيتم مسح كل التصحيحات والأوامر المتكررة والاختصارات.\n\nمتأكد؟',
          confirmText: 'نعم، امسح',
          cancelText: 'إلغاء'
        }).then(function(ok) {
          if (!ok) return;
          try {
            localStorage.removeItem('pc_voice_ai_learning');
            localStorage.removeItem('pc_voice_shortcuts');
            localStorage.removeItem('pc_voice_notes');
          } catch (e) {}
          Dashboard.render();
          if (window.Dialog) Dialog.success('تم', 'التعلم اتمسح');
        });
      }
    }
  };

  window.VoiceDashboard = Dashboard;
  console.log('[Voice Dashboard] Loaded');
})();