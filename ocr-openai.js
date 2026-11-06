/* ============================================
   PHARMACLOUD - OCR OPENAI v5.0
   GPT-4o Vision + Drug Detection Pipeline
   ============================================ */
'use strict';

(function() {

  // ==================================================
  // 🔑 1. حط مفتاح OpenAI هنا (سطر واحد بس)
  // ==================================================
  var OPENAI_API_KEY = 'sk-proj-A1dtOtwAV-x5PBjXNBpAiyUfmhFsbZ9p21UuvZVByXWp09va_-D60geLQAHJuKkbZYJ061-70nT3BlbkFJ_awMT55yQoyYb_slyBDBhfVxAdpUvFtsduMTbMoyaXlXgL2ETVpczKVRiJyYmI7kuQEaX5vEg';

  // ==================================================
  // ⚙️ 2. إعدادات
  // ==================================================
  var CONFIG = {
    OPENAI_URL: 'https://api.openai.com/v1/chat/completions',
    MODEL: 'gpt-4o',
    MAX_TOKENS: 2000,
    RXNAV_BASE: 'https://rxnav.nlm.nih.gov/REST',
    LEARN_KEY: 'pc_ocr_learning_v5',
    CACHE_KEY: 'pc_ocr_cache_v5',
    ENABLE_LEARNING: true,
    ENABLE_RXNORM: true,
    DEBUG: false
  };

  // ==================================================
  // 3. LEARNING STORE
  // ==================================================
  var Learning = (function() {
    function load() {
      try { return JSON.parse(localStorage.getItem(CONFIG.LEARN_KEY) || '{}'); }
      catch (e) { return {}; }
    }
    function save(d) {
      try { localStorage.setItem(CONFIG.LEARN_KEY, JSON.stringify(d)); } catch (e) {}
    }
    return {
      get: function(text) {
        var d = load();
        return d[String(text).toLowerCase().trim()] || null;
      },
      learn: function(ocrText, data) {
        if (!CONFIG.ENABLE_LEARNING) return;
        var d = load();
        d[String(ocrText).toLowerCase().trim()] = {
          correct: data,
          at: new Date().toISOString()
        };
        var keys = Object.keys(d);
        if (keys.length > 500) {
          keys.sort(function(a, b) { return new Date(d[a].at) - new Date(d[b].at); });
          delete d[keys[0]];
        }
        save(d);
      },
      count: function() { return Object.keys(load()).length; },
      all: load,
      clear: function() { localStorage.removeItem(CONFIG.LEARN_KEY); }
    };
  })();

  // ==================================================
  // 4. INSTRUCTION WORDS (للفلترة)
  // ==================================================
  var INSTRUCTION_WORDS = {
    'daily': 1, 'weekly': 1, 'monthly': 1, 'once': 1, 'twice': 1, 'thrice': 1,
    'times': 1, 'time': 1, 'day': 1, 'days': 1, 'week': 1, 'weeks': 1,
    'month': 1, 'months': 1, 'morning': 1, 'evening': 1, 'night': 1,
    'before': 1, 'after': 1, 'with': 1, 'without': 1, 'meal': 1, 'meals': 1,
    'food': 1, 'eating': 1, 'continue': 1, 'stop': 1, 'use': 1, 'take': 1,
    'apply': 1, 'as': 1, 'needed': 1, 'for': 1, 'to': 1, 'of': 1, 'the': 1,
    'every': 1, 'each': 1, 'and': 1, 'or': 1, 'a': 1, 'an': 1, 'if': 1,
    'مرة': 1, 'مره': 1, 'مرتين': 1, 'مرّتين': 1, 'ثلاث': 1, 'أربع': 1,
    'يوم': 1, 'يومي': 1, 'يومياً': 1, 'يوميا': 1, 'أسبوع': 1, 'اسبوع': 1,
    'أسبوعين': 1, 'اسبوعين': 1, 'شهر': 1, 'شهور': 1, 'سنة': 1, 'سنين': 1,
    'صباح': 1, 'صباحاً': 1, 'صباحا': 1, 'مساء': 1, 'مساءً': 1, 'مساءا': 1,
    'ليل': 1, 'ليلاً': 1, 'ليلا': 1, 'ظهر': 1, 'ظهراً': 1, 'عصر': 1,
    'بعد': 1, 'قبل': 1, 'مع': 1, 'بدون': 1, 'بين': 1, 'على': 1, 'في': 1,
    'من': 1, 'إلى': 1, 'الى': 1, 'الأكل': 1, 'الاكل': 1, 'أكل': 1, 'اكل': 1,
    'الطعام': 1, 'طعام': 1, 'الوجبات': 1, 'وجبة': 1, 'وجبات': 1,
    'استمر': 1, 'استمرار': 1, 'لمدة': 1, 'مدة': 1, 'خلال': 1,
    'كل': 1, 'مرات': 1, 'أيام': 1, 'ايام': 1, 'أسابيع': 1, 'اسابيع': 1,
    'مريض': 1, 'المريض': 1, 'دكتور': 1, 'الدكتور': 1, 'طبيب': 1, 'الطبيب': 1,
    'تشخيص': 1, 'التشخيص': 1, 'علاج': 1, 'العلاج': 1, 'اسم': 1, 'الاسم': 1,
    'عمر': 1, 'العمر': 1, 'سن': 1, 'السن': 1, 'تاريخ': 1, 'التاريخ': 1,
    'ملاحظة': 1, 'ملاحظات': 1, 'الملاحظات': 1, 'توقيع': 1, 'التوقيع': 1,
    'دواء': 1, 'الدواء': 1, 'أدوية': 1, 'جرعة': 1, 'الجرعة': 1,
    'تعليمات': 1, 'التعليمات': 1, 'أو': 1, 'و': 1, 'هذا': 1, 'هذه': 1,
    'إذا': 1, 'اذا': 1, 'عند': 1, 'حتى': 1, 'ثم': 1, 'فقط': 1,
    'tablet': 1, 'tab': 1, 'tabs': 1, 'capsule': 1, 'cap': 1, 'caps': 1,
    'pill': 1, 'syrup': 1, 'suspension': 1, 'ointment': 1, 'cream': 1,
    'gel': 1, 'lotion': 1, 'spray': 1, 'injection': 1, 'drops': 1, 'drop': 1,
    'قرص': 1, 'أقراص': 1, 'اقراص': 1, 'كبسولة': 1, 'كبسوله': 1, 'شراب': 1,
    'مرهم': 1, 'كريم': 1, 'قطرة': 1, 'قطره': 1, 'بخاخ': 1, 'حقن': 1,
    'لبوس': 1, 'جل': 1, 'لوشن': 1
  };

  // ==================================================
  // 5. SEND IMAGE TO GPT-4O VISION
  // ==================================================
  async function callGPT4Vision(imageBase64) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY.length < 20) {
      throw new Error('API key missing');
    }

    var prompt = `أنت صيدلي خبير متخصص في قراءة الروشتات الطبية (سواء خط يدوي أو مطبوع).

**مهمتك:**
1. اقرأ صورة الروشتة بدقة عالية
2. استخرج **أسماء الأدوية فقط** (المادة الفعالة، الاسم التجاري، أو الفئة العامة)
3. **لا تستخرج** التعليمات مثل: "مرتين يومياً"، "بعد الأكل"، "لمدة أسبوع"
4. استخرج المدة والجرعة والتعليمات بشكل منفصل

**أعد النتيجة بهذه الصيغة JSON فقط (بدون أي كلام إضافي):**

{
  "drugs": [
    {
      "name": "اسم الدواء بالكامل (مثلاً: Lubricant Eye Drops أو Panadol أو Augmentin)",
      "generic": "المادة الفعالة إن أمكن (مثلاً: Paracetamol 500mg)",
      "category": "الفئة (مسكن، مضاد حيوي، فيتامينات، قطرة عين، إلخ)",
      "form": "الشكل (قرص، كبسولة، قطرة، مرهم، شراب)",
      "dosage": "الجرعة (مثلاً: 500mg)",
      "frequency": "عدد المرات (مثلاً: مرتين يومياً)",
      "duration": "المدة (مثلاً: أسبوع)",
      "notes": "أي ملاحظات أخرى من الروشتة (بعد الأكل، إلخ)",
      "confidence": 0.95
    }
  ],
  "patient_name": "اسم المريض إن وجد",
  "doctor_name": "اسم الطبيب إن وجد",
  "diagnosis": "التشخيص إن وجد",
  "notes": "ملاحظات عامة"
}

**قواعد مهمة:**
- ركز على **التمييز بين اسم الدواء والتعليمات**
- لو شككت في اسم، اكتبه كما تراه ولا تخترع
- استخرج **حتى الأدوية العامة** مثل "Analgesic" أو "Antibiotic Eye Ointment"
- confidence من 0.0 إلى 1.0 حسب ثقتك`;

    var response = await fetch(CONFIG.OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64,
                detail: 'high'
              }
            }
          ]
        }],
        max_tokens: CONFIG.MAX_TOKENS,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      var errText = await response.text();
      throw new Error('OpenAI API: ' + response.status + ' — ' + errText.slice(0, 200));
    }

    var data = await response.json();
    var content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if (!content) throw new Error('Empty response from OpenAI');

    var parsed;
    try { parsed = JSON.parse(content); }
    catch (e) { throw new Error('Invalid JSON from OpenAI: ' + content.slice(0, 200)); }

    return {
      drugs: parsed.drugs || [],
      patient: parsed.patient_name || '',
      doctor: parsed.doctor_name || '',
      diagnosis: parsed.diagnosis || '',
      notes: parsed.notes || '',
      raw: parsed
    };
  }

  // ==================================================
  // 6. CONVERT IMAGE FILE TO BASE64
  // ==================================================
  function fileToBase64(file) {
    return new Promise(function(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function() { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ==================================================
  // 7. VERIFY WITH RXNORM
  // ==================================================
  async function verifyWithRxNorm(drug) {
    if (!CONFIG.ENABLE_RXNORM) return drug;
    var name = drug.name || drug.generic;
    if (!name || name.length < 3) return drug;

    try {
      // Try exact
      var url = CONFIG.RXNAV_BASE + '/rxcui.json?name=' + encodeURIComponent(name);
      var res = await fetch(url);
      if (res.ok) {
        var data = await res.json();
        var rxcui = data.idGroup && data.idGroup.rxnormId && data.idGroup.rxnormId[0];
        if (rxcui) {
          var propRes = await fetch(CONFIG.RXNAV_BASE + '/rxcui/' + rxcui + '/properties.json');
          if (propRes.ok) {
            var props = await propRes.json();
            var p = props.properties || {};
            drug.rxcui = rxcui;
            drug.generic = drug.generic || p.name || '';
            drug.verified = true;
          }
        }
      }

      // Try spelling if failed
      if (!drug.rxcui) {
        var sugRes = await fetch(CONFIG.RXNAV_BASE + '/spellingsuggestions.json?name=' + encodeURIComponent(name));
        if (sugRes.ok) {
          var sug = await sugRes.json();
          var suggestions = sug.suggestionGroup && sug.suggestionGroup.suggestionList && sug.suggestionGroup.suggestionList.suggestion;
          if (suggestions && suggestions[0]) {
            var retry = await fetch(CONFIG.RXNAV_BASE + '/rxcui.json?name=' + encodeURIComponent(suggestions[0]));
            if (retry.ok) {
              var rdata = await retry.json();
              var rcui = rdata.idGroup && rdata.idGroup.rxnormId && rdata.idGroup.rxnormId[0];
              if (rcui) {
                drug.rxcui = rcui;
                drug.corrected = true;
                drug.originalName = drug.name;
                drug.name = suggestions[0];
                drug.verified = true;
              }
            }
          }
        }
      }
    } catch (e) { /* silent */ }

    return drug;
  }

  // ==================================================
  // 8. MATCH WITH INVENTORY
  // ==================================================
  function matchInventory(drug, products) {
    if (!products || !products.length) return null;
    var terms = [drug.name, drug.generic, drug.category]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(function(w) { return w.length >= 3; });

    var best = null, bestScore = 0;
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var pn = (p.name || '').toLowerCase();
      var pa = (p.active || '').toLowerCase();
      var pc = (p.category || '').toLowerCase();
      var score = 0;

      for (var j = 0; j < terms.length; j++) {
        var t = terms[j];
        if (pn.indexOf(t) !== -1) score += 10;
        if (pa.indexOf(t) !== -1) score += 8;
        if (pc.indexOf(t) !== -1) score += 3;
      }

      if (score > bestScore && score >= 8) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  // ==================================================
  // 9. CHECK INTERACTIONS
  // ==================================================
  async function checkInteractions(drugs) {
    var results = [];

    // Local
    if (typeof DrugDB !== 'undefined' && DrugDB.checkInteractions) {
      var fake = drugs.map(function(d, i) {
        return { id: 'i_' + i, name: d.name || d.generic, active: d.generic || d.name };
      });
      var local = DrugDB.checkInteractions(fake, null) || [];
      local.forEach(function(l) {
        results.push({
          drugA: l.involved[0].name,
          drugB: l.involved[1].name,
          severity: l.severity,
          description: l.desc
        });
      });
    }

    // RxNorm
    var rxcuis = drugs.filter(function(d) { return d.rxcui; });
    for (var i = 0; i < rxcuis.length; i++) {
      for (var j = i + 1; j < rxcuis.length; j++) {
        try {
          var res = await fetch(CONFIG.RXNAV_BASE + '/interaction/interaction.json?rxcui=' + rxcuis[i].rxcui);
          if (!res.ok) continue;
          var data = await res.json();
          (data.interactionTypeGroup || []).forEach(function(g) {
            (g.interactionType || []).forEach(function(t) {
              (t.interactionPair || []).forEach(function(pair) {
                var nm = (pair.interactionConcept || []).some(function(c) {
                  return (c.minConceptItem && c.minConceptItem.name || '').toLowerCase()
                    .indexOf((rxcuis[j].name || '').toLowerCase().split(' ')[0]) !== -1;
                });
                if (nm) {
                  var exists = results.some(function(r) {
                    return r.drugA === rxcuis[i].name && r.drugB === rxcuis[j].name;
                  });
                  if (!exists) {
                    results.push({
                      drugA: rxcuis[i].name,
                      drugB: rxcuis[j].name,
                      severity: pair.severity || 'medium',
                      description: pair.description || ''
                    });
                  }
                }
              });
            });
          });
        } catch (e) { /* silent */ }
      }
    }

    return results;
  }

  // ==================================================
  // 10. MAIN PIPELINE
  // ==================================================
  async function analyzeWithOpenAI(file) {
    var resultEl = document.getElementById('scannerOcrResult');
    if (!resultEl) return;

    // Progress
    showProgress('تحويل الصورة...', 15);
    var imageBase64 = await fileToBase64(file);

    showProgress('تحليل بالذكاء الاصطناعي GPT-4o...', 35);
    var aiResult;
    try {
      aiResult = await callGPT4Vision(imageBase64);
    } catch (e) {
      console.error('[OpenAI] Error:', e);
      resultEl.innerHTML = renderAPIError(e.message);
      return;
    }

    if (!aiResult.drugs || !aiResult.drugs.length) {
      renderNoDrugs();
      return;
    }

    showProgress('البحث في قاعدة RxNorm...', 60);
    for (var i = 0; i < aiResult.drugs.length; i++) {
      var drug = aiResult.drugs[i];
      // Apply learning
      var learned = Learning.get(drug.name) || Learning.get(drug.generic);
      if (learned && learned.correct) {
        drug.name = learned.correct.name || drug.name;
        drug.category = learned.correct.category || drug.category;
        drug.source = 'learned';
      } else {
        await verifyWithRxNorm(drug);
      }
    }

    showProgress('مطابقة مع المخزون...', 80);
    var products = [];
    try {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (tid && typeof DB !== 'undefined') {
        products = DB.getTenantData(tid, 'products') || [];
      }
    } catch (e) {}

    aiResult.drugs.forEach(function(d) {
      d.inventory = matchInventory(d, products);
      if (d.inventory) {
        d.productId = d.inventory.id;
        d.productName = d.inventory.name;
        d.price = d.inventory.price;
        d.stock = d.inventory.stock;
      }
    });

    showProgress('فحص التفاعلات...', 92);
    var interactions = await checkInteractions(aiResult.drugs);

    showProgress('تحضير النتائج...', 100);
    renderResults(aiResult, interactions);
    window._ocrAiResult = {
      drugs: aiResult.drugs,
      interactions: interactions,
      meta: aiResult
    };
  }

  // ==================================================
  // 11. UI
  // ==================================================
  function showProgress(msg, pct) {
    var el = document.getElementById('scannerOcrResult');
    if (!el) return;
    var c = 2 * Math.PI * 44;
    var o = c - (c * pct / 100);
    el.innerHTML =
      '<div style="text-align:center;padding:36px 20px">' +
        '<div style="width:100px;height:100px;margin:0 auto 20px;position:relative">' +
          '<svg style="transform:rotate(-90deg)" width="100" height="100">' +
            '<circle cx="50" cy="50" r="44" stroke="var(--bg-alt)" stroke-width="8" fill="none"></circle>' +
            '<circle cx="50" cy="50" r="44" stroke="#7c3aed" stroke-width="8" fill="none" stroke-dasharray="' + c + '" stroke-dashoffset="' + o + '" stroke-linecap="round" style="transition:stroke-dashoffset .3s"></circle>' +
          '</svg>' +
          '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.4rem;font-weight:900;color:#7c3aed">' + Math.round(pct) + '%</div>' +
        '</div>' +
        '<div style="font-weight:900;font-size:1rem">جاري التحليل بالذكاء الاصطناعي</div>' +
        '<div style="color:var(--text-muted);font-size:.82rem;margin-top:6px">' + msg + '</div>' +
      '</div>';
  }

  function renderAPIError(msg) {
    var friendly = 'حدث خطأ في الاتصال بالذكاء الاصطناعي';
    if (/401|Unauthorized/i.test(msg)) friendly = 'المفتاح غير صحيح — راجع OpenAI API key';
    else if (/429|rate/i.test(msg)) friendly = 'تم تجاوز الحد — انتظر قليلاً';
    else if (/insufficient_quota|billing/i.test(msg)) friendly = 'رصيد OpenAI انتهى — اشحن الحساب';
    else if (/model_not_found/i.test(msg)) friendly = 'الموديل غير متاح';
    
    return '<div style="text-align:center;padding:36px 20px">' +
      '<div style="width:80px;height:80px;margin:0 auto 16px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center">' +
        '<i class="fas fa-exclamation-triangle" style="font-size:2rem;color:#dc2626"></i>' +
      '</div>' +
      '<h3 style="font-weight:900;margin-bottom:8px">' + friendly + '</h3>' +
      '<details style="margin-top:12px;text-align:start;font-size:.75rem;color:var(--text-muted)">' +
        '<summary style="cursor:pointer">التفاصيل التقنية</summary>' +
        '<pre style="white-space:pre-wrap;background:var(--bg-alt);padding:10px;border-radius:8px;margin-top:8px">' + escapeHtml(msg) + '</pre>' +
      '</details>' +
      '<button class="btn btn-outline btn-sm" style="margin-top:16px" onclick="ocrReset()">' +
        '<i class="fas fa-redo"></i> حاول مرة أخرى' +
      '</button>' +
    '</div>';
  }

  function renderNoDrugs() {
    var el = document.getElementById('scannerOcrResult');
    if (!el) return;
    el.innerHTML =
      '<div style="text-align:center;padding:36px 20px">' +
        '<div style="width:90px;height:90px;margin:0 auto 18px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center">' +
          '<i class="fas fa-search" style="font-size:2rem;color:#b45309"></i>' +
        '</div>' +
        '<h3 style="font-weight:900;margin-bottom:8px">لم يتم اكتشاف أدوية</h3>' +
        '<p style="color:var(--text-muted);font-size:.85rem;margin-bottom:16px">جرب صورة أوضح</p>' +
        '<button class="btn btn-outline btn-sm" onclick="ocrReset()"><i class="fas fa-redo"></i> حاول مرة أخرى</button>' +
      '</div>';
  }

  function renderResults(aiResult, interactions) {
    var el = document.getElementById('scannerOcrResult');
    if (!el) return;
    var drugs = aiResult.drugs;
    var inStock = drugs.filter(function(d) { return d.inventory; }).length;
    var highIx = interactions.filter(function(i) { return i.severity === 'high'; });

    var h = '';

    // Patient info
    if (aiResult.patient || aiResult.doctor || aiResult.diagnosis) {
      h += '<div style="background:linear-gradient(135deg,#f8fafc,#fff);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:14px">';
      if (aiResult.patient) h += '<div style="font-size:.82rem;margin-bottom:4px"><strong>المريض:</strong> ' + escapeHtml(aiResult.patient) + '</div>';
      if (aiResult.doctor) h += '<div style="font-size:.82rem;margin-bottom:4px"><strong>الطبيب:</strong> ' + escapeHtml(aiResult.doctor) + '</div>';
      if (aiResult.diagnosis) h += '<div style="font-size:.82rem"><strong>التشخيص:</strong> ' + escapeHtml(aiResult.diagnosis) + '</div>';
      h += '</div>';
    }

    // Stats
    h += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">';
    h += statCard('fa-pills', drugs.length, 'دواء', 'linear-gradient(135deg,#7c3aed,#a78bfa)');
    h += statCard('fa-check-circle', inStock, 'بالمخزون', 'linear-gradient(135deg,#00b884,#00d4a0)');
    h += statCard('fa-shield-alt', interactions.length, 'تفاعل',
      highIx.length ? 'linear-gradient(135deg,#ef4444,#f87171)' :
      interactions.length ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' :
      'linear-gradient(135deg,#1E88E5,#42a5f5)');
    h += '</div>';

    // Interactions
    if (interactions.length > 0) {
      h += '<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:14px;padding:14px;margin-bottom:14px">';
      h += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">';
      h += '<i class="fas fa-exclamation-triangle" style="color:#dc2626;font-size:1.2rem"></i>';
      h += '<strong style="color:#991b1b">تحذير: ' + interactions.length + ' تفاعل دوائي</strong>';
      h += '</div>';
      interactions.slice(0, 4).forEach(function(ix) {
        var sev = ix.severity === 'high' ? 'high' : ix.severity === 'medium' ? 'medium' : 'low';
        var color = sev === 'high' ? '#dc2626' : sev === 'medium' ? '#f59e0b' : '#64748b';
        var label = sev === 'high' ? 'خطر عالي' : sev === 'medium' ? 'متوسط' : 'بسيط';
        h += '<div style="background:#fff;padding:10px;border-radius:10px;margin-bottom:6px">';
        h += '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">';
        h += '<div style="font-weight:800;font-size:.85rem">' + escapeHtml(ix.drugA) + ' + ' + escapeHtml(ix.drugB) + '</div>';
        h += '<span style="background:' + color + ';color:#fff;padding:3px 10px;border-radius:999px;font-size:.65rem;font-weight:900">' + label + '</span>';
        h += '</div>';
        h += '<div style="font-size:.78rem;color:var(--text-muted);line-height:1.5">' + escapeHtml((ix.description || '').slice(0, 180)) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // Drugs list
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    h += '<div style="font-weight:900;font-size:.95rem"><i class="fas fa-list-ul" style="color:var(--primary)"></i> الأدوية (' + drugs.length + ')</div>';
    if (inStock > 0) {
      h += '<button type="button" class="btn btn-primary btn-sm" onclick="ocrAddAllToCart()"><i class="fas fa-cart-plus"></i> إضافة الكل</button>';
    }
    h += '</div>';

    drugs.forEach(function(d, i) { h += renderDrugCard(d, i); });

    h += '<div style="text-align:center;font-size:.7rem;color:var(--text-light);margin-top:14px">';
    h += '<i class="fas fa-robot"></i> GPT-4o Vision + RxNorm';
    h += '</div>';

    el.innerHTML = h;
  }

  function statCard(icon, num, label, grad) {
    return '<div style="background:' + grad + ';color:#fff;border-radius:12px;padding:12px 8px;text-align:center">' +
      '<i class="fas ' + icon + '" style="font-size:1.1rem;opacity:.9;margin-bottom:4px;display:block"></i>' +
      '<div style="font-size:1.4rem;font-weight:900;line-height:1;font-variant-numeric:tabular-nums">' + num + '</div>' +
      '<div style="font-size:.68rem;opacity:.9;margin-top:2px">' + label + '</div>' +
    '</div>';
  }

  function renderDrugCard(d, idx) {
    var hasStock = !!d.inventory;
    var h = '<div style="background:#fff;border:1.5px solid ' + (hasStock ? 'rgba(0,184,132,.4)' : 'var(--border)') + ';border-radius:12px;padding:12px;margin-bottom:8px;position:relative;overflow:hidden">';
    h += '<div style="position:absolute;top:0;inset-inline-start:0;bottom:0;width:3px;background:' + (hasStock ? 'linear-gradient(180deg,#00b884,#00d4a0)' : '#cbd5e1') + '"></div>';

    h += '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    h += '<div style="width:24px;height:24px;background:linear-gradient(135deg,#00b884,#1E88E5);color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;flex-shrink:0">' + (idx + 1) + '</div>';
    h += '<div style="font-weight:900;font-size:.95rem">' + escapeHtml(d.name || d.generic || '—') + '</div>';
    h += '</div>';

    h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
    if (d.category) h += badge('', d.category, 'rgba(124,58,237,.1)', '#7c3aed');
    if (d.form) h += badge('', d.form, 'rgba(30,136,229,.1)', '#1E88E5');
    if (d.dosage) h += badge('', d.dosage, 'rgba(16,185,129,.1)', '#059669');
    if (d.corrected) h += badge('fa-magic', 'مُصحّح', 'rgba(245,158,11,.12)', '#b45309');
    if (d.rxcui) h += badge('fa-check', 'موثّق', 'rgba(16,185,129,.1)', '#059669');
    if (d.confidence && d.confidence < 0.7) h += badge('fa-question', 'ثقة منخفضة', 'rgba(239,68,68,.1)', '#dc2626');
    h += '</div>';

    if (d.frequency || d.duration || d.notes) {
      h += '<div style="margin-top:6px;font-size:.75rem;color:var(--text-muted);display:flex;flex-wrap:wrap;gap:8px">';
      if (d.frequency) h += '<span><i class="fas fa-clock"></i> ' + escapeHtml(d.frequency) + '</span>';
      if (d.duration) h += '<span><i class="fas fa-calendar"></i> ' + escapeHtml(d.duration) + '</span>';
      if (d.notes) h += '<span><i class="fas fa-info-circle"></i> ' + escapeHtml(d.notes) + '</span>';
      h += '</div>';
    }
    h += '</div>';

    h += '<div style="flex-shrink:0">';
    if (hasStock) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,.12);color:#059669;padding:4px 9px;border-radius:999px;font-size:.65rem;font-weight:900"><i class="fas fa-check"></i> متوفر</span>';
    } else {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,.1);color:#dc2626;padding:4px 9px;border-radius:999px;font-size:.65rem;font-weight:900"><i class="fas fa-times"></i> غير متوفر</span>';
    }
    h += '</div></div>';

    if (hasStock) {
      h += '<div style="background:linear-gradient(135deg,rgba(0,184,132,.06),rgba(0,184,132,.02));padding:8px 10px;border-radius:9px;display:flex;justify-content:space-between;align-items:center;gap:8px">';
      h += '<div style="display:flex;gap:14px;font-size:.78rem">';
      h += '<div><span style="color:var(--text-muted)">مخزون:</span> <strong>' + (d.stock || 0) + '</strong></div>';
      h += '<div><span style="color:var(--text-muted)">سعر:</span> <strong style="color:#00b884">' + (d.price || 0) + ' ج</strong></div>';
      h += '</div>';
      h += '<button type="button" class="btn btn-primary btn-sm" onclick="ocrAddToCart(\'' + d.productId + '\')" style="padding:6px 14px"><i class="fas fa-cart-plus"></i></button>';
      h += '</div>';
    } else {
      h += '<button type="button" class="btn btn-outline btn-sm" style="width:100%;padding:6px;font-size:.75rem" onclick="ocrLearnCorrection(\'' + escapeHtml(d.name || '').replace(/'/g, "\\'") + '\')"><i class="fas fa-edit"></i> صحّح يدوياً</button>';
    }

    h += '</div>';
    return h;
  }

  function badge(icon, text, bg, color) {
    var ic = icon ? '<i class="fas ' + icon + '"></i> ' : '';
    return '<span style="background:' + bg + ';color:' + color + ';padding:2px 8px;border-radius:999px;font-size:.62rem;font-weight:800;display:inline-flex;align-items:center;gap:4px">' + ic + escapeHtml(text) + '</span>';
  }

  // ==================================================
  // 12. PUBLIC ACTIONS
  // ==================================================
  window.ocrAddToCart = function(pid) {
    if (!pid || typeof phAddToCart !== 'function') return;
    phAddToCart(pid);
    if (typeof Utils !== 'undefined') Utils.toast('✅ أضيف للسلة', 'success');
  };

  window.ocrAddAllToCart = function() {
    var d = window._ocrAiResult;
    if (!d) return;
    var items = d.drugs.filter(function(x) { return x.productId; });
    if (!items.length) { if (typeof Utils !== 'undefined') Utils.toast('لا يوجد دواء متوفر', 'warning'); return; }
    items.forEach(function(x) { if (typeof phAddToCart === 'function') phAddToCart(x.productId); });
    if (typeof Utils !== 'undefined') Utils.toast('✅ أضيف ' + items.length + ' دواء', 'success');
    if (typeof closePrescriptionScanner === 'function') closePrescriptionScanner();
  };

  window.ocrLearnCorrection = function(ocrText) {
    var correct = prompt('الاسم الصحيح للدواء:\n\n(النظام قرأ: "' + ocrText + '")');
    if (!correct || !correct.trim()) return;
    var cat = prompt('الفئة (اختياري):') || '';
    var form = prompt('الشكل (اختياري):') || '';
    Learning.learn(ocrText, { name: correct.trim(), category: cat, form: form });
    if (typeof Utils !== 'undefined') Utils.toast('✅ اتعلمت!', 'success');
  };

  window.ocrReset = function() {
    var dz = document.getElementById('prescriptionDropZone');
    var pv = document.getElementById('prescriptionPreview');
    var rs = document.getElementById('scannerOcrResult');
    if (dz) dz.style.display = '';
    if (pv) pv.style.display = 'none';
    if (rs) rs.innerHTML = '';
    window._ocrAiResult = null;
  };

  window.ocrChangeKey = function(newKey) {
    if (!newKey || newKey.length < 20) return;
    OPENAI_API_KEY = newKey;
    localStorage.setItem('pc_openai_key', newKey);
    if (typeof Utils !== 'undefined') Utils.toast('✅ تم تحديث المفتاح', 'success');
  };

  // Load key from localStorage if exists
  try {
    var storedKey = localStorage.getItem('pc_openai_key');
    if (storedKey && storedKey.length > 20) OPENAI_API_KEY = storedKey;
  } catch (e) {}

  // ==================================================
  // 13. INSTALL HANDLER
  // ==================================================
  function install() {
    if (typeof RxOCR === 'undefined' && typeof Tesseract === 'undefined') {
      setTimeout(install, 400);
      return;
    }

    window.handlePrescriptionFile = async function(file) {
      if (!file) return;
      var dz = document.getElementById('prescriptionDropZone');
      var pv = document.getElementById('prescriptionPreview');
      var img = document.getElementById('prescriptionImg');
      var rs = document.getElementById('scannerOcrResult');

      if (dz) dz.style.display = 'none';
      if (pv) pv.style.display = 'block';
      if (img) img.src = URL.createObjectURL(file);
      if (rs) showProgress('تحضير...', 5);

      try {
        await analyzeWithOpenAI(file);
      } catch (e) {
        console.error('[OCR]', e);
        if (rs) rs.innerHTML = renderAPIError(e.message);
      }
    };

    // Rebind input
    var input = document.getElementById('prescriptionFile');
    if (input) {
      var clone = input.cloneNode(true);
      input.parentNode.replaceChild(clone, input);
      clone.addEventListener('change', function(e) {
        if (e.target.files[0]) window.handlePrescriptionFile(e.target.files[0]);
      });

      var dzone = document.getElementById('prescriptionDropZone');
      if (dzone) {
        var dc = dzone.cloneNode(true);
        dzone.parentNode.replaceChild(dc, dzone);
        dc.addEventListener('click', function() { clone.click(); });
        dc.addEventListener('dragover', function(e) { e.preventDefault(); dc.style.borderColor = '#7c3aed'; });
        dc.addEventListener('dragleave', function() { dc.style.borderColor = ''; });
        dc.addEventListener('drop', function(e) {
          e.preventDefault();
          dc.style.borderColor = '';
          var f = e.dataTransfer.files[0];
          if (f) window.handlePrescriptionFile(f);
        });
      }
    }

    console.log('[OCR-OpenAI v5] Ready ✓');
    console.log('[OCR-OpenAI v5] Model:', CONFIG.MODEL);
    console.log('[OCR-OpenAI v5] Learned:', Learning.count());
  }

  setTimeout(install, 300);
  console.log('[OCR-OpenAI v5] Loaded ✓');
})();