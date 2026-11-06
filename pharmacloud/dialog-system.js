/* ============================================
   PHARMACLOUD - DIALOG SYSTEM v1.0
   Custom Professional Dialogs
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    var m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, function(c) { return m[c]; });
  };

  function ensureContainer() {
    var id = 'dialogSystemContainer';
    var el = document.getElementById(id);
    if (el) return el;
    el = document.createElement('div');
    el.id = id;
    el.className = 'dlg-container';
    document.body.appendChild(el);
    return el;
  }

  /* ============================================
     CORE DIALOG
     ============================================ */
  function showDialog(options) {
    var opts = Object.assign({
      type: 'info',
      title: '',
      message: '',
      html: null,
      confirmText: 'موافق',
      cancelText: 'إلغاء',
      showCancel: true,
      onConfirm: null,
      onCancel: null,
      closeOnOverlay: true,
      showInput: false,
      inputPlaceholder: '',
      inputValue: '',
      inputType: 'text'
    }, options || {});

    var container = ensureContainer();

    var iconMap = {
      info: { icon: 'fa-info-circle', color: '#1E88E5', bg: 'rgba(30,136,229,.1)' },
      success: { icon: 'fa-check-circle', color: '#10b981', bg: 'rgba(16,185,129,.1)' },
      warning: { icon: 'fa-exclamation-triangle', color: '#f59e0b', bg: 'rgba(245,158,11,.1)' },
      danger: { icon: 'fa-times-circle', color: '#dc2626', bg: 'rgba(220,38,38,.1)' },
      question: { icon: 'fa-question-circle', color: '#7c3aed', bg: 'rgba(124,58,237,.1)' }
    };

    var iconData = iconMap[opts.type] || iconMap.info;

    var overlay = document.createElement('div');
    overlay.className = 'dlg-overlay';

    var html = '';
    html += '<div class="dlg-modal dlg-type-' + opts.type + '">';

    html += '<div class="dlg-header">';
    html += '<div class="dlg-icon-wrap" style="background:' + iconData.bg + ';color:' + iconData.color + '">';
    html += '<i class="fas ' + iconData.icon + '"></i>';
    html += '</div>';
    if (opts.title) {
      html += '<h3 class="dlg-title">' + escapeHtml(opts.title) + '</h3>';
    }
    html += '</div>';

    html += '<div class="dlg-body">';
    if (opts.html) {
      html += opts.html;
    } else if (opts.message) {
      html += '<p class="dlg-message">' + escapeHtml(opts.message) + '</p>';
    }
    if (opts.showInput) {
      html += '<input type="' + opts.inputType + '" class="dlg-input" placeholder="' + escapeHtml(opts.inputPlaceholder) + '" value="' + escapeHtml(opts.inputValue) + '">';
    }
    html += '</div>';

    html += '<div class="dlg-footer">';
    if (opts.showCancel && opts.cancelText) {
      html += '<button class="dlg-btn dlg-btn-cancel">';
      html += '<i class="fas fa-times"></i> ' + escapeHtml(opts.cancelText);
      html += '</button>';
    }
    html += '<button class="dlg-btn dlg-btn-confirm" style="background:' + iconData.color + '">';
    html += '<i class="fas fa-check"></i> ' + escapeHtml(opts.confirmText);
    html += '</button>';
    html += '</div>';

    html += '</div>';

    overlay.innerHTML = html;
    container.appendChild(overlay);

    requestAnimationFrame(function() {
      overlay.classList.add('dlg-show');
    });

    var confirmBtn = overlay.querySelector('.dlg-btn-confirm');
    var cancelBtn = overlay.querySelector('.dlg-btn-cancel');
    var input = overlay.querySelector('.dlg-input');

    function close() {
      overlay.classList.remove('dlg-show');
      overlay.classList.add('dlg-closing');
      setTimeout(function() {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 250);
    }

    function handleConfirm() {
      var value = input ? input.value : null;
      var r = opts.onConfirm ? opts.onConfirm(value) : true;
      if (r !== false) close();
    }

    function handleCancel() {
      if (opts.onCancel) opts.onCancel();
      close();
    }

    confirmBtn.addEventListener('click', handleConfirm);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (input) {
      input.focus();
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') handleConfirm();
        if (e.key === 'Escape') handleCancel();
      });
    }

    if (opts.closeOnOverlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) handleCancel();
      });
    }

    return overlay;
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.Dialog = {
    confirm: function(options) {
      return new Promise(function(resolve) {
        var o = typeof options === 'string' ? { message: options } : options;
        o = Object.assign({}, o, {
          onConfirm: function() { resolve(true); },
          onCancel: function() { resolve(false); },
          closeOnOverlay: true,
          type: o.type || 'question',
          confirmText: o.confirmText || 'نعم، تأكيد',
          cancelText: o.cancelText || 'إلغاء'
        });
        showDialog(o);
      });
    },

    alert: function(options) {
      return new Promise(function(resolve) {
        var o = typeof options === 'string' ? { message: options } : options;
        o = Object.assign({}, o, {
          onConfirm: function() { resolve(); },
          showCancel: false,
          closeOnOverlay: true,
          type: o.type || 'info',
          confirmText: o.confirmText || 'حسناً'
        });
        showDialog(o);
      });
    },

    success: function(title, message) {
      return Dialog.alert({ type: 'success', title: title, message: message });
    },

    error: function(title, message) {
      return Dialog.alert({ type: 'danger', title: title, message: message });
    },

    warning: function(title, message) {
      return Dialog.alert({ type: 'warning', title: title, message: message });
    },

    custom: function(options) {
      return showDialog(options);
    },

    show: showDialog
  };

  console.log('[Dialog System] Loaded');
})();