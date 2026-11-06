/* PharmaCloud - FIX: منع التكرار */
(function() {
  'use strict';
  console.log('[Fix Duplicate] Loaded');

  if (typeof window.phTempImageBase64 === 'undefined') {
    window.phTempImageBase64 = '';
  }

  // منع التكرار في الإضافة اليدوية
  var _origSave = window.phSaveProduct;
  window.phSaveProduct = function(e) {
    if (e) e.preventDefault();
    var name = document.getElementById('phPName') ? document.getElementById('phPName').value.trim() : '';
    var barcode = document.getElementById('phPBarcode') ? document.getElementById('phPBarcode').value.trim() : '';
    var products = [];
    try { products = PH.getProducts() || []; } catch(err) {}
    var dup = products.find(function(p) {
      var pBarcode = (p.barcode || '').toString().trim();
      var pName = (p.name || '').toString().trim().toLowerCase();
      if (barcode && pBarcode === barcode) return true;
      if (name && pName === name.toLowerCase()) return true;
      return false;
    });
    if (dup) {
      if (typeof showToast === 'function') showToast('المنتج موجود بالفعل - ' + dup.name, 'warning');
      return;
    }
    if (typeof _origSave === 'function') return _origSave.call(window, e);
  };

  // منع التكرار في الاستيراد من Excel
  window.phHandleExcelImport = function(input) {
    var file = input.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { showToast('مكتبة Excel لم تُحمّل', 'error'); return; }
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = new Uint8Array(ev.target.result);
        var workbook = XLSX.read(data, { type: 'array' });
        var sheet = workbook.Sheets[workbook.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) { showToast('الملف فاضي', 'error'); return; }
        var products = PH.getProducts() || [];
        var existingBarcodes = new Set(products.map(function(p){ return (p.barcode || '').toString().trim(); }).filter(function(b){ return b; }));
        var existingNames = new Set(products.map(function(p){ return (p.name || '').toString().trim().toLowerCase(); }));
        var added = 0; var skipped = 0;
        rows.forEach(function(row) {
          var name = (row['الاسم'] || row['name'] || '').toString().trim();
          if (!name) return;
          var barcode = (row['الباركود'] || '').toString().trim();
          var nameKey = name.toLowerCase();
          if (barcode && existingBarcodes.has(barcode)) { skipped++; return; }
          if (existingNames.has(nameKey)) { skipped++; return; }
          products.unshift({
            id: 'p_' + Date.now() + '_' + added,
            name: name,
            active: row['المادة الفعالة'] || '',
            barcode: barcode,
            category: row['الفئة'] || 'أدوية',
            price: parseFloat(row['السعر'] || 0),
            cost: parseFloat(row['التكلفة'] || 0),
            stock: parseInt(row['المخزون'] || 0),
            minStock: parseInt(row['الحد الأدنى'] || 10),
            rx: false,
            image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=200&q=80'
          });
          if (barcode) existingBarcodes.add(barcode);
          existingNames.add(nameKey);
          added++;
        });
        PH.setProducts(products);
        phCloseModal();
        phRenderProducts();
        phUpdateBadges();
        showToast('✅ تم استيراد ' + added + ' منتج، وتخطي ' + skipped + ' مكرر', 'success');
      } catch (err) { console.error(err); showToast('خطأ في قراءة الملف', 'error'); }
    };
    reader.readAsArrayBuffer(file);
  };
})();