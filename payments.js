/* ============================================
   PHARMACLOUD - PAYMENT METHODS
   Fawry, ValU, Visa, InstaPay, Cash
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var METHODS = {
    cash: { name: 'نقدي', icon: 'fa-money-bill-wave', color: '#10b981', emoji: '💵' },
    visa: { name: 'فيزا', icon: 'fa-cc-visa', color: '#1a1f71', emoji: '💳' },
    mastercard: { name: 'ماستركارد', icon: 'fa-cc-mastercard', color: '#eb001b', emoji: '💳' },
    fawry: { name: 'فوري', icon: 'fa-bolt', color: '#FFD500', emoji: '⚡', bg: '#FFD500' },
    valu: { name: 'فاليو', icon: 'fa-calendar-check', color: '#0052CC', emoji: '📅' },
    instapay: { name: 'انستاباي', icon: 'fa-mobile-alt', color: '#00b884', emoji: '📱' },
    wallet: { name: 'محفظة إلكترونية', icon: 'fa-wallet', color: '#7c3aed', emoji: '📲' },
    online: { name: 'دفع أونلاين', icon: 'fa-globe', color: '#06b6d4', emoji: '🌐' }
  };

  /* ============================================
     OPEN PAYMENT MODAL
     ============================================ */
  function openPaymentModal(total, options) {
    options = options || {};
    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    var selectedMethod = 'cash';

    var h = '';
    h += '<div class="ph-modal-head">';
    h += '<h3><i class="fas fa-credit-card"></i> إتمام الدفع</h3>';
    h += '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>';
    h += '</div>';

    h += '<div class="ph-modal-body" id="payBody">';

    // Total
    h += '<div class="pay-total-box">';
    h += '<div class="pay-total-label">المبلغ المطلوب</div>';
    h += '<div class="pay-total-value">' + fmt(total) + ' <small>ج.م</small></div>';
    h += '</div>';

    // Method selector
    h += '<div class="pay-methods">';
    Object.keys(METHODS).forEach(function(key) {
      var m = METHODS[key];
      h += '<button type="button" class="pay-method" data-method="' + key + '" onclick="Payments.selectMethod(\'' + key + '\')">';
      h += '<span class="pay-method-icon" style="background:' + (m.bg || m.color) + ';color:' + (m.bg === '#FFD500' ? '#000' : '#fff') + '">';
      h += '<i class="fab ' + m.icon + '"></i>';
      h += '</span>';
      h += '<span class="pay-method-name">' + m.name + '</span>';
      h += '</button>';
    });
    h += '</div>';

    // Payment details area (changes based on method)
    h += '<div class="pay-details" id="payDetails"></div>';

    h += '</div>';

    h += '<div class="ph-modal-foot">';
    h += '<button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>';
    h += '<button class="btn btn-primary" onclick="Payments.confirm()" id="payConfirmBtn">';
    h += '<i class="fas fa-check-circle"></i> تأكيد الدفع';
    h += '</button>';
    h += '</div>';

    modal.innerHTML = h;

    window._payData = {
      total: total,
      method: 'cash',
      cashReceived: 0,
      customerName: options.customerName || '',
      orderId: options.orderId || 'ORD-' + Date.now().toString().slice(-6),
      onSuccess: options.onSuccess || null
    };

    selectMethod('cash');
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     SELECT METHOD
     ============================================ */
  function selectMethod(key) {
    window._payData.method = key;

    // Update active state
    document.querySelectorAll('.pay-method').forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.method === key);
    });

    // Show details
    var details = document.getElementById('payDetails');
    if (!details) return;

    var total = window._payData.total;
    var h = '';

    if (key === 'cash') {
      h += '<div class="pay-form-group">';
      h += '<label>المبلغ المستلم</label>';
      h += '<input type="number" id="payCashReceived" placeholder="0" min="' + total + '" step="0.5" oninput="Payments.updateChange(this.value)">';
      h += '<div class="pay-quick-amounts">';
      [total, Math.ceil(total/10)*10, Math.ceil(total/50)*50, Math.ceil(total/100)*100].forEach(function(amt, idx) {
        if (idx === 0 || amt !== total) {
          h += '<button type="button" class="pay-quick-btn" onclick="Payments.setCashAmount(' + amt + ')">' + amt + ' ج</button>';
        }
      });
      h += '</div>';
      h += '<div class="pay-change" id="payChange" style="display:none">';
      h += '<span>الباقي للعميل</span>';
      h += '<strong id="payChangeValue">0 ج</strong>';
      h += '</div>';
      h += '</div>';

    } else if (key === 'visa' || key === 'mastercard') {
      h += '<div class="pay-form-group">';
      h += '<label>رقم البطاقة</label>';
      h += '<input type="text" id="payCardNum" placeholder="•••• •••• •••• ••••" maxlength="19" oninput="Payments.formatCard(this)">';
      h += '</div>';
      h += '<div class="pay-form-row">';
      h += '<div class="pay-form-group"><label>تاريخ الانتهاء</label>';
      h += '<input type="text" id="payCardExp" placeholder="MM/YY" maxlength="5"></div>';
      h += '<div class="pay-form-group"><label>CVV</label>';
      h += '<input type="text" id="payCardCvv" placeholder="•••" maxlength="4"></div>';
      h += '</div>';
      h += '<div class="pay-form-group">';
      h += '<label>اسم حامل البطاقة</label>';
      h += '<input type="text" id="payCardName" placeholder="AHMED MOHAMED">';
      h += '</div>';

    } else if (key === 'fawry') {
      h += '<div class="pay-qr-box">';
      h += '<div class="pay-qr-icon"><i class="fas fa-bolt"></i></div>';
      h += '<h4>كود فوري</h4>';
      h += '<div class="pay-fawry-code" id="payFawryCode">' + generateFawryCode() + '</div>';
      h += '<p class="pay-qr-hint">اطلب من العميل دفع الكود من أي منفذ فوري</p>';
      h += '<button type="button" class="pay-copy-btn" onclick="Payments.copyFawryCode()">';
      h += '<i class="fas fa-copy"></i> نسخ الكود';
      h += '</button>';
      h += '</div>';

    } else if (key === 'valu') {
      h += '<div class="pay-qr-box">';
      h += '<div class="pay-qr-icon" style="background:#0052CC"><i class="fas fa-calendar-check"></i></div>';
      h += '<h4>تقسيط فاليو</h4>';
      h += '<div class="pay-valu-plans">';
      var plans = [
        { months: 3, fee: 0 },
        { months: 6, fee: 0 },
        { months: 12, fee: 0.05 },
        { months: 18, fee: 0.08 }
      ];
      plans.forEach(function(p) {
        var totalPaid = total * (1 + p.fee);
        var monthly = totalPaid / p.months;
        h += '<button type="button" class="pay-valu-plan" onclick="Payments.selectValuPlan(' + p.months + ', ' + p.fee + ')">';
        h += '<strong>' + p.months + ' شهور</strong>';
        h += '<span>' + Math.round(monthly) + ' ج/شهر</span>';
        if (p.fee > 0) h += '<small>+ ' + (p.fee*100) + '%</small>';
        h += '</button>';
      });
      h += '</div>';
      h += '</div>';

    } else if (key === 'instapay' || key === 'wallet' || key === 'online') {
      h += '<div class="pay-qr-box">';
      h += '<div class="pay-qr-icon" style="background:' + METHODS[key].color + '">';
      h += '<i class="fas ' + METHODS[key].icon + '"></i>';
      h += '</div>';
      h += '<h4>' + METHODS[key].name + '</h4>';
      h += '<div class="pay-phone-display">';
      h += '<i class="fas fa-mobile-alt"></i> 01012345678';
      h += '</div>';
      h += '<p class="pay-qr-hint">حوّل ' + fmt(total) + ' ج على الرقم ده</p>';
      h += '<p class="pay-qr-hint-small">ثم اضغط "تأكيد الدفع"</p>';
      h += '</div>';
    }

    details.innerHTML = h;
  }

  function generateFawryCode() {
    var code = '';
    for (var i = 0; i < 10; i++) code += Math.floor(Math.random() * 10);
    return code;
  }

  /* ============================================
     CASH HELPERS
     ============================================ */
  function updateChange(value) {
    var total = window._payData.total;
    var received = parseFloat(value) || 0;
    window._payData.cashReceived = received;

    var changeBox = document.getElementById('payChange');
    var changeValue = document.getElementById('payChangeValue');

    if (received >= total && changeBox && changeValue) {
      changeBox.style.display = 'flex';
      changeValue.textContent = fmt(received - total) + ' ج';
    } else if (changeBox) {
      changeBox.style.display = 'none';
    }
  }

  function setCashAmount(amount) {
    var input = document.getElementById('payCashReceived');
    if (input) {
      input.value = amount;
      updateChange(amount);
    }
  }

  function formatCard(input) {
    var val = input.value.replace(/\s/g, '').replace(/\D/g, '').slice(0, 16);
    input.value = val.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function copyFawryCode() {
    var code = document.getElementById('payFawryCode');
    if (code) {
      navigator.clipboard.writeText(code.textContent);
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم نسخ الكود', 'success');
    }
  }

  function selectValuPlan(months, fee) {
    window._payData.valuPlan = { months: months, fee: fee };
    document.querySelectorAll('.pay-valu-plan').forEach(function(btn) {
      btn.classList.remove('active');
    });
    event.target.closest('.pay-valu-plan').classList.add('active');
  }

  /* ============================================
     CONFIRM PAYMENT
     ============================================ */
  function confirm() {
    var data = window._payData;
    if (!data) return;

    var btn = document.getElementById('payConfirmBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري المعالجة...';
    }

    // Validate cash
    if (data.method === 'cash') {
      if (data.cashReceived < data.total) {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-check-circle"></i> تأكيد الدفع';
        }
        if (typeof Utils !== 'undefined') Utils.toast('المبلغ المستلم أقل من المطلوب', 'error');
        return;
      }
    }

    // Simulate processing
    setTimeout(function() {
      var result = {
        method: data.method,
        methodName: METHODS[data.method].name,
        total: data.total,
        cashReceived: data.cashReceived,
        change: data.cashReceived > 0 ? data.cashReceived - data.total : 0,
        transactionId: 'TXN-' + Date.now().toString().slice(-8),
        timestamp: new Date().toISOString(),
        success: true
      };

      // Log audit
      try {
        if (typeof DB !== 'undefined') {
          var session = DB.getSession();
          if (session && session.tenantId) {
            DB.logAudit(session.tenantId, 'payment_completed', {
              method: data.method,
              total: data.total,
              txn: result.transactionId
            });
          }
        }
      } catch (e) {}

      // Show success
      showPaymentSuccess(result);

      // Callback
      if (typeof data.onSuccess === 'function') {
        setTimeout(function() { data.onSuccess(result); }, 1500);
      }

      // Play sound
      if (typeof playSound === 'function') playSound('cash');

      console.log('[Payments] ✅ Payment success:', result);

    }, 1200);
  }

  function showPaymentSuccess(result) {
    var body = document.getElementById('payBody');
    if (!body) return;

    body.innerHTML = 
      '<div class="pay-success">' +
        '<div class="pay-success-icon"><i class="fas fa-check"></i></div>' +
        '<h3>تم الدفع بنجاح!</h3>' +
        '<p>رقم العملية: ' + result.transactionId + '</p>' +
        '<div class="pay-success-details">' +
          '<div class="pay-success-row"><span>الطريقة</span><strong>' + result.methodName + '</strong></div>' +
          '<div class="pay-success-row"><span>المبلغ</span><strong>' + fmt(result.total) + ' ج.م</strong></div>' +
          (result.change > 0 ? '<div class="pay-success-row"><span>الباقي</span><strong>' + fmt(result.change) + ' ج.م</strong></div>' : '') +
        '</div>' +
      '</div>';

    var foot = document.querySelector('.ph-modal-foot');
    if (foot) {
      foot.innerHTML = 
        '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>' +
        '<button class="btn btn-primary" onclick="Payments.printReceipt(window._lastPaymentResult)">' +
          '<i class="fas fa-print"></i> طباعة الفاتورة' +
        '</button>';
    }

    window._lastPaymentResult = result;
  }

  function printReceipt(result) {
    var order = {
      id: result.transactionId,
      items: window._currentOrderItems || [],
      total: result.total,
      paymentMethod: result.method,
      paidAmount: result.cashReceived,
      customerName: window._payData.customerName,
      createdAt: result.timestamp
    };

    if (typeof ReceiptPrinter !== 'undefined') {
      ReceiptPrinter.print(order);
    }
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.Payments = {
    open: openPaymentModal,
    selectMethod: selectMethod,
    updateChange: updateChange,
    setCashAmount: setCashAmount,
    formatCard: formatCard,
    copyFawryCode: copyFawryCode,
    selectValuPlan: selectValuPlan,
    confirm: confirm,
    printReceipt: printReceipt,
    METHODS: METHODS
  };

  console.log('[Payments] Loaded — Fawry, ValU, Visa, InstaPay, Cash');
})();