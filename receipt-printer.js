/* ============================================
   PHARMACLOUD - THERMAL RECEIPT PRINTER
   Supports 58mm & 80mm thermal printers
   ============================================ */
'use strict';

(function() {

  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var RP = {
    paperWidth: 80, // mm
    showLogo: true,
    footerMessage: 'شكراً لتعاملكم معنا 💚',
    footerSub: 'يرجى الاتصال بنا لأي استفسار'
  };

  function loadSettings() {
    try {
      var saved = JSON.parse(localStorage.getItem('pc_receipt_settings') || '{}');
      Object.assign(RP, saved);
    } catch (e) {}
  }

  function saveSettings() {
    try { localStorage.setItem('pc_receipt_settings', JSON.stringify(RP)); } catch (e) {}
  }

  /* ============================================
     FORMAT CURRENCY
     ============================================ */
  function fmt(n) {
    return Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ============================================
     GENERATE RECEIPT HTML
     ============================================ */
  function generateReceipt(order, options) {
    options = options || {};
    var tenant = null;
    try { if (typeof PH !== 'undefined' && PH.getTenant) tenant = PH.getTenant(); } catch (e) {}

    var pharmacyName = tenant ? tenant.name : 'صيدلية';
    var pharmacyPhone = (tenant && tenant.phone) || '';
    var pharmacyAddress = (tenant && tenant.address) || '';

    var now = new Date();
    var dateStr = now.toLocaleDateString('en-GB');
    var timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Calculate totals
    var subtotal = 0;
    (order.items || []).forEach(function(it) {
      subtotal += (it.price || 0) * (it.qty || 0);
    });

    var discount = order.discount || 0;
    var discountAmount = subtotal * (discount / 100);
    var tax = order.tax || 0;
    var taxAmount = (subtotal - discountAmount) * (tax / 100);
    var total = order.total || (subtotal - discountAmount + taxAmount);

    var widthClass = RP.paperWidth === 58 ? 'rp-58mm' : 'rp-80mm';
    var charWidth = RP.paperWidth === 58 ? 32 : 42;

    var html = '';
    html += '<div class="receipt ' + widthClass + '">';

    // HEADER
    html += '<div class="rp-center rp-header">';
    if (RP.showLogo) {
      html += '<div class="rp-logo">PC</div>';
    }
    html += '<h1 class="rp-pharmacy">' + escapeHtml(pharmacyName) + '</h1>';
    if (pharmacyPhone) html += '<div class="rp-sub">📞 ' + escapeHtml(pharmacyPhone) + '</div>';
    if (pharmacyAddress) html += '<div class="rp-sub">📍 ' + escapeHtml(pharmacyAddress) + '</div>';
    html += '</div>';

    html += '<div class="rp-divider"></div>';

    // ORDER INFO
    html += '<div class="rp-row"><span>رقم الفاتورة</span><strong>#' + escapeHtml(order.id) + '</strong></div>';
    html += '<div class="rp-row"><span>التاريخ</span><span>' + dateStr + '</span></div>';
    html += '<div class="rp-row"><span>الوقت</span><span>' + timeStr + '</span></div>';
    if (order.customerName && order.customerName !== 'عميل عابر') {
      html += '<div class="rp-row"><span>العميل</span><strong>' + escapeHtml(order.customerName) + '</strong></div>';
    }
    if (order.paymentMethod) {
      var methodNames = { cash: 'نقدي', card: 'بطاقة', wallet: 'محفظة', fawry: 'فوري', valu: 'فاليو', instapay: 'انستاباي' };
      html += '<div class="rp-row"><span>طريقة الدفع</span><span>' + (methodNames[order.paymentMethod] || order.paymentMethod) + '</span></div>';
    }

    html += '<div class="rp-divider"></div>';

    // ITEMS HEADER
    html += '<div class="rp-items-header">';
    html += '<div class="rp-col-name">المنتج</div>';
    html += '<div class="rp-col-qty">كمية</div>';
    html += '<div class="rp-col-price">سعر</div>';
    html += '<div class="rp-col-total">إجمالي</div>';
    html += '</div>';

    // ITEMS
    html += '<div class="rp-items">';
    (order.items || []).forEach(function(it) {
      var lineTotal = (it.price || 0) * (it.qty || 0);
      html += '<div class="rp-item">';
      html += '<div class="rp-item-name">' + escapeHtml(it.name) + '</div>';
      html += '<div class="rp-item-details">';
      html += '<span class="rp-col-qty">' + (it.qty || 0) + '</span>';
      html += '<span class="rp-col-price">' + fmt(it.price) + '</span>';
      html += '<span class="rp-col-total">' + fmt(lineTotal) + '</span>';
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';

    html += '<div class="rp-divider"></div>';

    // TOTALS
    html += '<div class="rp-row"><span>المجموع الفرعي</span><span>' + fmt(subtotal) + ' ج</span></div>';

    if (discount > 0) {
      html += '<div class="rp-row rp-discount">';
      html += '<span>خصم ' + discount + '%</span>';
      html += '<span>- ' + fmt(discountAmount) + ' ج</span>';
      html += '</div>';
    }

    if (tax > 0) {
      html += '<div class="rp-row"><span>ضريبة ' + tax + '%</span><span>' + fmt(taxAmount) + ' ج</span></div>';
    }

    html += '<div class="rp-total-row">';
    html += '<span>الإجمالي</span>';
    html += '<strong>' + fmt(total) + ' ج.م</strong>';
    html += '</div>';

    // PAYMENT DETAILS
    if (order.paidAmount !== undefined && order.paidAmount !== null) {
      html += '<div class="rp-divider"></div>';
      html += '<div class="rp-row"><span>المدفوع</span><span>' + fmt(order.paidAmount) + ' ج</span></div>';
      var change = (order.paidAmount || 0) - total;
      if (change > 0) {
        html += '<div class="rp-row"><span>الباقي</span><strong>' + fmt(change) + ' ج</strong></div>';
      }
    }

    // LOYALTY
    if (order.loyaltyPoints !== undefined && order.loyaltyPoints > 0) {
      html += '<div class="rp-divider"></div>';
      html += '<div class="rp-loyalty">';
      html += '<div>🎁 نقاط الولاء المكتسبة</div>';
      html += '<strong>+' + order.loyaltyPoints + ' نقطة</strong>';
      if (order.loyaltyBalance !== undefined) {
        html += '<div class="rp-sub">رصيدك الحالي: ' + order.loyaltyBalance + ' نقطة</div>';
      }
      html += '</div>';
    }

    html += '<div class="rp-divider"></div>';

    // FOOTER
    html += '<div class="rp-center rp-footer">';
    html += '<div class="rp-footer-msg">' + escapeHtml(RP.footerMessage) + '</div>';
    if (RP.footerSub) {
      html += '<div class="rp-sub">' + escapeHtml(RP.footerSub) + '</div>';
    }

    // QR Code (barcode-like visual)
    html += '<div class="rp-qr">';
    for (var i = 0; i < 40; i++) {
      html += '<span style="height:' + (Math.random() * 20 + 10) + 'px;width:' + (Math.random() * 3 + 1) + 'px"></span>';
    }
    html += '</div>';
    html += '<div class="rp-sub rp-mono">' + escapeHtml(order.id) + '</div>';

    html += '</div>';

    html += '</div>';

    return html;
  }

  /* ============================================
     PRINT
     ============================================ */
  function printReceipt(order, options) {
    if (!order) {
      if (typeof Utils !== 'undefined') Utils.toast('الطلب غير موجود', 'error');
      return;
    }

    var html = generateReceipt(order, options);

    var w = window.open('', '_blank', 'width=400,height=600');
    if (!w) {
      if (typeof Utils !== 'undefined') Utils.toast('المتصفح منع فتح النافذة', 'error');
      return;
    }

    w.document.write(
      '<!DOCTYPE html><html dir="rtl" lang="ar">' +
      '<head>' +
      '<meta charset="UTF-8">' +
      '<title>فاتورة ' + escapeHtml(order.id) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap" rel="stylesheet">' +
      '<style>' + getReceiptCSS() + '</style>' +
      '</head>' +
      '<body>' + html +
      '<script>' +
      'window.onload = function() {' +
      '  setTimeout(function() {' +
      '    window.print();' +
      '    setTimeout(function() { window.close(); }, 500);' +
      '  }, 300);' +
      '}' +
      '<\/script>' +
      '</body></html>'
    );
    w.document.close();

    console.log('[Receipt] Printing order:', order.id);
  }

  /* ============================================
     PREVIEW
     ============================================ */
  function previewReceipt(order) {
    var html = generateReceipt(order);
    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML = 
      '<div class="ph-modal-head">' +
        '<h3><i class="fas fa-receipt"></i> معاينة الفاتورة</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="ph-modal-body rp-preview-body">' +
        '<style>' + getReceiptCSS() + '</style>' +
        html +
      '</div>' +
      '<div class="ph-modal-foot">' +
        '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>' +
        '<button class="btn btn-primary" onclick="ReceiptPrinter.print(window._previewOrder)">' +
          '<i class="fas fa-print"></i> طباعة' +
        '</button>' +
      '</div>';

    window._previewOrder = order;
    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     RECEIPT CSS
     ============================================ */
  function getReceiptCSS() {
    return `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Cairo', 'Courier New', monospace; background: #f1f5f9; padding: 20px; }
      .receipt {
        background: #fff;
        margin: 0 auto;
        padding: 15px;
        color: #000;
        font-size: 13px;
        line-height: 1.5;
      }
      .rp-80mm { width: 80mm; }
      .rp-58mm { width: 58mm; font-size: 11px; }
      .rp-center { text-align: center; }
      .rp-header { margin-bottom: 12px; }
      .rp-logo {
        width: 44px; height: 44px;
        background: #00b884;
        color: #fff;
        font-weight: 900;
        font-size: 18px;
        border-radius: 10px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 8px;
        letter-spacing: -1px;
      }
      .rp-pharmacy {
        font-size: 18px;
        font-weight: 900;
        letter-spacing: -0.5px;
        margin: 4px 0;
      }
      .rp-sub {
        font-size: 11px;
        color: #555;
        margin: 2px 0;
      }
      .rp-divider {
        border-top: 1px dashed #000;
        margin: 10px 0;
      }
      .rp-row {
        display: flex;
        justify-content: space-between;
        padding: 3px 0;
        font-size: 12px;
      }
      .rp-row strong { font-weight: 900; }
      .rp-items-header {
        display: flex;
        font-size: 11px;
        font-weight: 900;
        padding: 6px 0;
        border-bottom: 1px solid #000;
      }
      .rp-items-header .rp-col-name { flex: 1; }
      .rp-items-header .rp-col-qty,
      .rp-items-header .rp-col-price,
      .rp-items-header .rp-col-total { width: 50px; text-align: center; }
      .rp-items { margin: 6px 0; }
      .rp-item { padding: 6px 0; border-bottom: 1px dotted #ccc; }
      .rp-item:last-child { border-bottom: none; }
      .rp-item-name { font-weight: 700; font-size: 12px; margin-bottom: 3px; }
      .rp-item-details {
        display: flex;
        font-size: 11px;
        color: #555;
      }
      .rp-item-details .rp-col-qty,
      .rp-item-details .rp-col-price,
      .rp-item-details .rp-col-total { width: 50px; text-align: center; }
      .rp-item-details .rp-col-total { font-weight: 900; color: #000; }
      .rp-discount { color: #d97706; font-weight: 900; }
      .rp-total-row {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        font-size: 16px;
        font-weight: 900;
        border-top: 2px solid #000;
        border-bottom: 2px solid #000;
        margin-top: 6px;
      }
      .rp-total-row strong { color: #00b884; }
      .rp-loyalty {
        text-align: center;
        padding: 8px;
        background: #f0fdf9;
        border-radius: 6px;
        font-size: 12px;
        margin: 8px 0;
      }
      .rp-loyalty strong { font-size: 15px; color: #00b884; }
      .rp-footer { margin-top: 12px; }
      .rp-footer-msg { font-weight: 900; font-size: 13px; margin-bottom: 4px; }
      .rp-qr {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 1px;
        margin: 12px auto;
        height: 30px;
      }
      .rp-qr span { background: #000; display: inline-block; }
      .rp-mono { font-family: 'Courier New', monospace; letter-spacing: 1px; }
      .rp-preview-body { background: #e2e8f0; padding: 20px; display: flex; justify-content: center; }

      @media print {
        body { background: #fff; padding: 0; }
        @page { margin: 0; size: auto; }
        .receipt { box-shadow: none; margin: 0; }
      }
    `;
  }

  /* ============================================
     SETTINGS MODAL
     ============================================ */
  function openSettings() {
    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML =
      '<div class="ph-modal-head">' +
        '<h3><i class="fas fa-cog"></i> إعدادات الفاتورة</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="ph-modal-body">' +
        '<div class="form-group">' +
          '<label>حجم الورق</label>' +
          '<select id="rpWidth">' +
            '<option value="58"' + (RP.paperWidth === 58 ? ' selected' : '') + '>58mm (صغير)</option>' +
            '<option value="80"' + (RP.paperWidth === 80 ? ' selected' : '') + '>80mm (قياسي)</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label><input type="checkbox" id="rpLogo"' + (RP.showLogo ? ' checked' : '') + '> إظهار الشعار</label>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>رسالة التذييل</label>' +
          '<input type="text" id="rpFooterMsg" value="' + escapeHtml(RP.footerMessage) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>سطر إضافي</label>' +
          '<input type="text" id="rpFooterSub" value="' + escapeHtml(RP.footerSub) + '">' +
        '</div>' +
      '</div>' +
      '<div class="ph-modal-foot">' +
        '<button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>' +
        '<button class="btn btn-primary" onclick="ReceiptPrinter.saveSettingsFromForm()">' +
          '<i class="fas fa-save"></i> حفظ' +
        '</button>' +
      '</div>';

    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.ReceiptPrinter = {
    print: printReceipt,
    preview: previewReceipt,
    generate: generateReceipt,
    settings: openSettings,

    saveSettingsFromForm: function() {
      RP.paperWidth = parseInt(document.getElementById('rpWidth').value);
      RP.showLogo = document.getElementById('rpLogo').checked;
      RP.footerMessage = document.getElementById('rpFooterMessage')?.value || 
                        document.getElementById('rpFooterMsg').value;
      RP.footerSub = document.getElementById('rpFooterSub').value;
      saveSettings();
      if (typeof phCloseModal === 'function') phCloseModal();
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم الحفظ', 'success');
    },

    setSetting: function(key, value) {
      RP[key] = value;
      saveSettings();
    },

    getSettings: function() { return Object.assign({}, RP); }
  };

  loadSettings();
  console.log('[Receipt Printer] Loaded — 58mm & 80mm');
})();