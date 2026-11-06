/* ============================================
   PHARMACLOUD - DRUG INTERACTIONS PRO v2.0
   AI-Powered Clinical Decision Support System
   ============================================ */
'use strict';

(function() {

  /* ============================================
     FALLBACK HELPERS (قبل أي استخدام)
     ============================================ */
  var escapeHtml = window.escapeHtml || function(s) {
    if (s == null) return '';
    var m = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(s).replace(/[&<>"']/g, function(c) { return m[c]; });
  };

  var DIP = {
    drugs: [],
    interactions: [],
    patient: {
      age: null,
      weight: null,
      pregnant: false,
      lactating: false,
      renal: 'normal',
      hepatic: 'normal',
      conditions: [],
      allergies: []
    },
    learnKey: 'pc_ddi_learning',
    source: 'all',
    view: 'list'
  };

  /* ============================================
     1. EXPANDED CLINICAL DATABASE
     ============================================ */
  var DDI_DB = [
    {
      a: 'warfarin', b: 'aspirin', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'antiplatelet'],
      title: 'خطر نزيف حاد',
      desc: 'الأسبرين مع الوارفارين يضاعف خطر النزيف الهضمي والدماغي',
      action: 'تجنب الجمع أو استخدم PPI وقائي',
      mechanism: 'تثبيط مزدوج للتخثر الأولي والثانوي',
      onset: 'فوري',
      severity_score: 95
    },
    {
      a: 'warfarin', b: 'ibuprofen', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'nsaid'],
      title: 'خطر نزيف معدي',
      desc: 'NSAIDs تزيد تأثير الوارفارين وتسبب تقرحات',
      action: 'استبدل بـ Paracetamol',
      mechanism: 'تثبيط COX-1 + استبدال من بروتين البلازما',
      onset: '24-48 ساعة',
      severity_score: 90
    },
    {
      a: 'warfarin', b: 'naproxen', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'nsaid'],
      title: 'خطر نزيف حاد',
      desc: 'Naproxen يزيد خطر النزيف مع الوارفارين',
      action: 'تجنب الجمع',
      mechanism: 'تثبيط COX + تأثير مضاد للصفائح',
      onset: '24-48 ساعة',
      severity_score: 88
    },
    {
      a: 'warfarin', b: 'diclofenac', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'nsaid'],
      title: 'خطر نزيف حاد',
      desc: 'Diclofenac يزيد خطر النزيف',
      action: 'تجنب الجمع',
      mechanism: 'تثبيط COX',
      onset: '24-48 ساعة',
      severity_score: 88
    },
    {
      a: 'warfarin', b: 'ciprofloxacin', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'antibiotic'],
      title: 'ارتفاع INR',
      desc: 'Cipro يثبط CYP1A2 ويزيد تأثير الوارفارين',
      action: 'راقب INR يومياً',
      mechanism: 'تثبيط CYP1A2',
      onset: '3-5 أيام',
      severity_score: 85
    },
    {
      a: 'warfarin', b: 'fluconazole', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'antifungal'],
      title: 'تفاعل CYP2C9',
      desc: 'Fluconazole يمنع أيض الوارفارين',
      action: 'قلل جرعة الوارفارين 50%',
      mechanism: 'تثبيط CYP2C9',
      onset: '2-4 أيام',
      severity_score: 88
    },
    {
      a: 'warfarin', b: 'rifampin', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'antibiotic'],
      title: 'قلة فعالية الوارفارين',
      desc: 'Rifampin يحفز أيض الوارفارين',
      action: 'راقب INR يومياً',
      mechanism: 'تحفيز CYP3A4',
      onset: '5-7 أيام',
      severity_score: 82
    },
    {
      a: 'warfarin', b: 'carbamazepine', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'anticonvulsant'],
      title: 'قلة فعالية الوارفارين',
      desc: 'Carbamazepine يحفز أيض الوارفارين',
      action: 'راقب INR',
      mechanism: 'تحفيز CYP3A4',
      onset: '5-7 أيام',
      severity_score: 80
    },
    {
      a: 'warfarin', b: 'phenytoin', sev: 'high', ev: 'A',
      classes: ['anticoagulant', 'anticonvulsant'],
      title: 'تداخل معقد',
      desc: 'تداخل معقد في مستويات الدواء',
      action: 'راقب INR ومستوى الدواء',
      mechanism: 'تثبيط وتحفيز إنزيمي معقد',
      onset: 'متغير',
      severity_score: 85
    },
    {
      a: 'lisinopril', b: 'potassium', sev: 'high', ev: 'A',
      classes: ['ace', 'supplement'],
      title: 'فرط بوتاسيوم الدم',
      desc: 'فرط بوتاسيوم الدم - خطر اضطراب نظم القلب',
      action: 'راقب البوتاسيوم أسبوعياً',
      mechanism: 'تأثير مضاعف على احتباس البوتاسيوم',
      onset: '3-7 أيام',
      severity_score: 89
    },
    {
      a: 'lisinopril', b: 'spironolactone', sev: 'high', ev: 'A',
      classes: ['ace', 'diuretic'],
      title: 'فرط بوتاسيوم الدم',
      desc: 'مزيج خطير يرفع البوتاسيوم لمستويات قاتلة',
      action: 'راقب K+ كل 3 أيام',
      mechanism: 'تأثير مزدوج على احتباس البوتاسيوم',
      onset: '3-7 أيام',
      severity_score: 89
    },
    {
      a: 'enalapril', b: 'potassium', sev: 'high', ev: 'A',
      classes: ['ace', 'supplement'],
      title: 'فرط بوتاسيوم الدم',
      desc: 'فرط بوتاسيوم الدم',
      action: 'راقب البوتاسيوم',
      mechanism: 'تأثير مضاعف',
      onset: '3-7 أيام',
      severity_score: 87
    },
    {
      a: 'simvastatin', b: 'clarithromycin', sev: 'high', ev: 'A',
      classes: ['statin', 'antibiotic'],
      title: 'خطر تمزق عضلي',
      desc: 'Clarithromycin يرفع مستوى الستاتين 10 أضعاف',
      action: 'أوقف الستاتين أثناء العلاج',
      mechanism: 'تثبيط CYP3A4',
      onset: '3-7 أيام',
      severity_score: 98
    },
    {
      a: 'simvastatin', b: 'itraconazole', sev: 'high', ev: 'A',
      classes: ['statin', 'antifungal'],
      title: 'خطر تمزق عضلي',
      desc: 'خطر تمزق عضلي حاد',
      action: 'تجنب الجمع',
      mechanism: 'تثبيط CYP3A4',
      onset: '3-7 أيام',
      severity_score: 95
    },
    {
      a: 'atorvastatin', b: 'clarithromycin', sev: 'high', ev: 'A',
      classes: ['statin', 'antibiotic'],
      title: 'يزيد مستوى الستاتين',
      desc: 'يزيد مستوى الستاتين بشكل ملحوظ',
      action: 'قلل الجرعة',
      mechanism: 'تثبيط CYP3A4',
      onset: '3-7 أيام',
      severity_score: 88
    },
    {
      a: 'omeprazole', b: 'clopidogrel', sev: 'high', ev: 'A',
      classes: ['ppi', 'antiplatelet'],
      title: 'قلة فعالية Clopidogrel',
      desc: 'Omeprazole يمنع تحويل Clopidogrel لشكله النشط',
      action: 'استخدم Pantoprazole',
      mechanism: 'تثبيط CYP2C19',
      onset: '1-3 أيام',
      severity_score: 87
    },
    {
      a: 'esomeprazole', b: 'clopidogrel', sev: 'high', ev: 'B',
      classes: ['ppi', 'antiplatelet'],
      title: 'نفس تفاعل Omeprazole',
      desc: 'مثبط قوي لـ CYP2C19',
      action: 'استبدل بـ Pantoprazole',
      mechanism: 'تثبيط CYP2C19',
      onset: '1-3 أيام',
      severity_score: 85
    },
    {
      a: 'sildenafil', b: 'nitrate', sev: 'high', ev: 'A',
      classes: ['pde5', 'nitrate'],
      title: 'هبوط ضغط قاتل',
      desc: 'انخفاض ضغط الدم للدرجة القاتلة',
      action: 'ممنوع تماماً',
      mechanism: 'تأثير مضاعف على NO',
      onset: 'دقائق',
      severity_score: 100
    },
    {
      a: 'sildenafil', b: 'nitroglycerin', sev: 'high', ev: 'A',
      classes: ['pde5', 'nitrate'],
      title: 'قتل محتمل',
      desc: 'مضاعفات قلبية قد تؤدي للوفاة',
      action: 'ممنوع',
      mechanism: 'نفس السبب',
      onset: 'دقائق',
      severity_score: 100
    },
    {
      a: 'tadalafil', b: 'nitrate', sev: 'high', ev: 'A',
      classes: ['pde5', 'nitrate'],
      title: 'هبوط ضغط حاد',
      desc: 'هبوط ضغط حاد',
      action: 'ممنوع الجمع',
      mechanism: 'تأثير مضاعف على NO',
      onset: 'دقائق',
      severity_score: 100
    },
    {
      a: 'methotrexate', b: 'ibuprofen', sev: 'high', ev: 'A',
      classes: ['dmard', 'nsaid'],
      title: 'تسمم الميثوتريكسات',
      desc: 'يزيد سمية MTX بشكل حاد',
      action: 'تجنب NSAIDs',
      mechanism: 'تثبيط إفراز MTX',
      onset: '3-7 أيام',
      severity_score: 90
    },
    {
      a: 'methotrexate', b: 'trimethoprim', sev: 'high', ev: 'A',
      classes: ['dmard', 'antibiotic'],
      title: 'سمية دموية',
      desc: 'Depression نخاع العظم',
      action: 'ممنوع الجمع',
      mechanism: 'تثبيط DHFR مزدوج',
      onset: '7-14 يوم',
      severity_score: 92
    },
    {
      a: 'methotrexate', b: 'amoxicillin', sev: 'high', ev: 'B',
      classes: ['dmard', 'antibiotic'],
      title: 'يزيد سمية الميثوتريكسات',
      desc: 'يزيد سمية MTX',
      action: 'راقب وظائف الكبد',
      mechanism: 'تداخل أيضي',
      onset: '3-7 أيام',
      severity_score: 80
    },
    {
      a: 'clopidogrel', b: 'aspirin', sev: 'high', ev: 'A',
      classes: ['antiplatelet', 'antiplatelet'],
      title: 'يزيد خطر النزيف',
      desc: 'يزيد خطر النزيف',
      action: 'فقط تحت إشراف طبي',
      mechanism: 'تثبيط مضاعف للصفائح',
      onset: 'فوري',
      severity_score: 82
    },
    {
      a: 'digoxin', b: 'amiodarone', sev: 'high', ev: 'A',
      classes: ['cardiac', 'antiarrhythmic'],
      title: 'يزيد مستوى الديجوكسين',
      desc: 'Amiodarone يضاعف مستوى Digoxin',
      action: 'قلل Digoxin 50%',
      mechanism: 'تثبيط P-glycoprotein',
      onset: '5-7 أيام',
      severity_score: 91
    },
    {
      a: 'digoxin', b: 'verapamil', sev: 'high', ev: 'A',
      classes: ['cardiac', 'ccb'],
      title: 'يزيد سمية الديجوكسين',
      desc: 'يزيد سمية الديجوكسين',
      action: 'قلل الجرعة',
      mechanism: 'تثبيط P-glycoprotein',
      onset: '5-7 أيام',
      severity_score: 85
    },
    {
      a: 'digoxin', b: 'quinidine', sev: 'high', ev: 'A',
      classes: ['cardiac', 'antiarrhythmic'],
      title: 'يزيد مستوى الديجوكسين للضعف',
      desc: 'يزيد مستوى الديجوكسين للضعف',
      action: 'قلل الجرعة للنصف',
      mechanism: 'تثبيط P-glycoprotein',
      onset: '3-5 أيام',
      severity_score: 88
    },
    {
      a: 'fluoxetine', b: 'tramadol', sev: 'high', ev: 'A',
      classes: ['ssri', 'opioid'],
      title: 'متلازمة السيروتونين',
      desc: 'ارتفاع حرارة، رجفة، تشنجات',
      action: 'تجنب الجمع',
      mechanism: 'زيادة مشتركة للسيروتونين',
      onset: '6-24 ساعة',
      severity_score: 93
    },
    {
      a: 'ssri', b: 'tramadol', sev: 'high', ev: 'A',
      classes: ['ssri', 'opioid'],
      title: 'خطر متلازمة السيروتونين',
      desc: 'خطر متلازمة السيروتونين',
      action: 'تجنب الجمع',
      mechanism: 'زيادة مشتركة للسيروتونين',
      onset: '6-24 ساعة',
      severity_score: 90
    },
    {
      a: 'maoi', b: 'ssri', sev: 'high', ev: 'A',
      classes: ['antidepressant', 'maoi'],
      title: 'قاتل محتمل',
      desc: 'متلازمة سيروتونين قاتلة',
      action: 'ممنوع تماماً - فاصل 14 يوم',
      mechanism: 'تداخل حرج',
      onset: 'فوري',
      severity_score: 100
    },
    {
      a: 'metformin', b: 'contrast', sev: 'high', ev: 'A',
      classes: ['antidiabetic', 'contrast'],
      title: 'فشل كلوي حاد',
      desc: 'صبغة الأشعة + Metformin = خطر فشل كلوي',
      action: 'أوقف Metformin 48 ساعة',
      mechanism: 'سمية كلوية مشتركة',
      onset: '24-48 ساعة',
      severity_score: 88
    },
    {
      a: 'ketoconazole', b: 'terfenadine', sev: 'high', ev: 'A',
      classes: ['antifungal', 'antihistamine'],
      title: 'اضطراب نظم القلب',
      desc: 'اضطراب نظم القلب',
      action: 'ممنوع الجمع',
      mechanism: 'تثبيط CYP3A4',
      onset: '1-3 أيام',
      severity_score: 95
    },
    {
      a: 'tramadol', b: 'maoi', sev: 'high', ev: 'A',
      classes: ['opioid', 'maoi'],
      title: 'تشنجات ومتلازمة سيروتونين',
      desc: 'تفاعل خطر جداً',
      action: 'ممنوع',
      mechanism: 'مركزي',
      onset: 'فوري',
      severity_score: 95
    },
    {
      a: 'linezolid', b: 'ssri', sev: 'high', ev: 'A',
      classes: ['antibiotic', 'ssri'],
      title: 'تثبيط MAO',
      desc: 'Linezolid له تأثير MAO',
      action: 'فاصل 14 يوم',
      mechanism: 'تثبيط MAO',
      onset: 'يومين',
      severity_score: 88
    },
    {
      a: 'allopurinol', b: 'azathioprine', sev: 'high', ev: 'A',
      classes: ['gout', 'immunosuppressant'],
      title: 'سمية نخاع العظم',
      desc: 'تراكم 6-MP',
      action: 'قلل جرعة Azathioprine 75%',
      mechanism: 'تثبيط Xanthine oxidase',
      onset: '7-14 يوم',
      severity_score: 88
    },
    {
      a: 'amiodarone', b: 'simvastatin', sev: 'high', ev: 'A',
      classes: ['antiarrhythmic', 'statin'],
      title: 'تمزق عضلي',
      desc: 'Amiodarone يرفع Simvastatin',
      action: 'قلل جرعة Simvastatin',
      mechanism: 'تثبيط CYP3A4',
      onset: '3-7 أيام',
      severity_score: 85
    },
    {
      a: 'metronidazole', b: 'alcohol', sev: 'high', ev: 'A',
      classes: ['antibiotic', 'depressant'],
      title: 'تفاعل ديسلفيرام',
      desc: 'قيء شديد، صداع، هبوط ضغط',
      action: 'امتنع عن الكحول 48 ساعة',
      mechanism: 'تراكم الأسيتالديهيد',
      onset: 'فوري',
      severity_score: 85
    },
    {
      a: 'metformin', b: 'alcohol', sev: 'medium', ev: 'A',
      classes: ['antidiabetic', 'depressant'],
      title: 'الحماض اللبني',
      desc: 'الكحول يزيد خطر الحماض اللبني',
      action: 'تجنب الكحول',
      mechanism: 'تعزيز إنتاج اللاكتات',
      onset: 'مزمن',
      severity_score: 70
    },
    {
      a: 'paracetamol', b: 'alcohol', sev: 'medium', ev: 'A',
      classes: ['analgesic', 'depressant'],
      title: 'سمية كبدية',
      desc: 'خطر تلف الكبد',
      action: 'لا تتجاوز 2 جم يومياً',
      mechanism: 'إجهاد الكبد',
      onset: 'مزمن',
      severity_score: 68
    },
    {
      a: 'ciprofloxacin', b: 'theophylline', sev: 'medium', ev: 'A',
      classes: ['antibiotic', 'bronchodilator'],
      title: 'سمية الثيوفيلين',
      desc: 'Cipro يرفع مستوى Theophylline 30%',
      action: 'قلل الجرعة 30%',
      mechanism: 'تثبيط CYP1A2',
      onset: '1-3 أيام',
      severity_score: 72
    },
    {
      a: 'ciprofloxacin', b: 'antacid', sev: 'medium', ev: 'A',
      classes: ['antibiotic', 'antacid'],
      title: 'انخفاض الامتصاص',
      desc: 'Antacid يمنع امتصاص Cipro',
      action: 'فاصل ساعتين',
      mechanism: 'ارتباط معدني',
      onset: 'فوري',
      severity_score: 60
    },
    {
      a: 'tetracycline', b: 'antacid', sev: 'medium', ev: 'A',
      classes: ['antibiotic', 'antacid'],
      title: 'قلة الامتصاص',
      desc: 'Antacid يمنع امتصاص Tetracycline',
      action: 'فاصل ساعتين',
      mechanism: 'ارتباط معدني',
      onset: 'فوري',
      severity_score: 58
    },
    {
      a: 'tetracycline', b: 'calcium', sev: 'medium', ev: 'A',
      classes: ['antibiotic', 'supplement'],
      title: 'قلة الفاعلية',
      desc: 'الكالسيوم يربط Tetracycline',
      action: 'فاصل ساعتين',
      mechanism: 'ارتباط معدني',
      onset: 'فوري',
      severity_score: 55
    },
    {
      a: 'levothyroxine', b: 'calcium', sev: 'medium', ev: 'B',
      classes: ['thyroid', 'supplement'],
      title: 'قلة امتصاص الثيروكسين',
      desc: 'الكالسيوم يقلل امتصاص Levothyroxine 40%',
      action: 'فاصل 4 ساعات',
      mechanism: 'ارتباط معوي',
      onset: 'فوري',
      severity_score: 65
    },
    {
      a: 'levothyroxine', b: 'iron', sev: 'medium', ev: 'B',
      classes: ['thyroid', 'supplement'],
      title: 'نفس التأثير',
      desc: 'الحديد يقلل الامتصاص',
      action: 'فاصل 4 ساعات',
      mechanism: 'ارتباط معوي',
      onset: 'فوري',
      severity_score: 63
    },
    {
      a: 'levothyroxine', b: 'omeprazole', sev: 'medium', ev: 'B',
      classes: ['thyroid', 'ppi'],
      title: 'قلة الامتصاص',
      desc: 'يقلل امتصاص الثيروكسين',
      action: 'فاصل ساعتين',
      mechanism: 'تغيير حمضية المعدة',
      onset: 'متغير',
      severity_score: 60
    },
    {
      a: 'metoprolol', b: 'verapamil', sev: 'medium', ev: 'A',
      classes: ['beta', 'ccb'],
      title: 'بطء القلب الشديد',
      desc: 'تأثير سلبي مزدوج على القلب',
      action: 'راقب النبض والضغط',
      mechanism: 'تثبيط مشترك للعقدة الجيبية',
      onset: '1-3 أيام',
      severity_score: 75
    },
    {
      a: 'propranolol', b: 'insulin', sev: 'medium', ev: 'A',
      classes: ['beta', 'antidiabetic'],
      title: 'يخفي أعراض نقص السكر',
      desc: 'يخفي أعراض نقص السكر',
      action: 'راقب السكر بانتظام',
      mechanism: 'تثبيط استجابة الأدرينالين',
      onset: 'متغير',
      severity_score: 70
    },
    {
      a: 'prednisone', b: 'ibuprofen', sev: 'medium', ev: 'A',
      classes: ['steroid', 'nsaid'],
      title: 'خطر قرحة المعدة',
      desc: 'خطر قرحة المعدة',
      action: 'استخدم مع حماية المعدة',
      mechanism: 'تأثير مؤذي على الغشاء المخاطي',
      onset: '3-7 أيام',
      severity_score: 72
    },
    {
      a: 'prednisone', b: 'aspirin', sev: 'medium', ev: 'A',
      classes: ['steroid', 'nsaid'],
      title: 'خطر نزيف معدي',
      desc: 'خطر نزيف معدي',
      action: 'أضف PPI',
      mechanism: 'تأثير مؤذي على الغشاء المخاطي',
      onset: '3-7 أيام',
      severity_score: 70
    },
    {
      a: 'furosemide', b: 'lithium', sev: 'medium', ev: 'A',
      classes: ['diuretic', 'mood'],
      title: 'تسمم الليثيوم',
      desc: 'يزيد مستوى الليثيوم',
      action: 'راقب مستوى الليثيوم',
      mechanism: 'زيادة إعادة الامتصاص',
      onset: '3-5 أيام',
      severity_score: 75
    },
    {
      a: 'ibuprofen', b: 'aspirin', sev: 'medium', ev: 'A',
      classes: ['nsaid', 'antiplatelet'],
      title: 'يقلل فاعلية الأسبرين القلبي',
      desc: 'يقلل فاعلية الأسبرين القلبي',
      action: 'فاصل ساعتين',
      mechanism: 'منافسة على COX-1',
      onset: 'فوري',
      severity_score: 65
    },
    {
      a: 'azithromycin', b: 'warfarin', sev: 'medium', ev: 'B',
      classes: ['antibiotic', 'anticoagulant'],
      title: 'ارتفاع INR',
      desc: 'زيادة تأثير الوارفارين',
      action: 'راقب INR',
      mechanism: 'تثبيط أيضي',
      onset: '3-5 أيام',
      severity_score: 70
    },
    {
      a: 'spironolactone', b: 'ibuprofen', sev: 'medium', ev: 'A',
      classes: ['diuretic', 'nsaid'],
      title: 'فشل كلوي',
      desc: 'فرط بوتاسيوم + فشل كلوي',
      action: 'راقب وظائف الكلى',
      mechanism: 'تأثير مزدوج',
      onset: '3-7 أيام',
      severity_score: 72
    },
    {
      a: 'clindamycin', b: 'erythromycin', sev: 'medium', ev: 'C',
      classes: ['antibiotic', 'antibiotic'],
      title: 'تنافس على المستقبل',
      desc: 'فعالية مضادة',
      action: 'تجنب الجمع',
      mechanism: 'تنافس ريبوزومي',
      onset: 'فوري',
      severity_score: 60
    },
    {
      a: 'montelukast', b: 'aspirin', sev: 'medium', ev: 'C',
      classes: ['antileukotriene', 'nsaid'],
      title: 'تحذير تنفسي',
      desc: 'زيادة نوبات الربو',
      action: 'راقب الأعراض',
      mechanism: 'غير كامل الفهم',
      onset: 'متغير',
      severity_score: 60
    },
    {
      a: 'vitamin k', b: 'warfarin', sev: 'medium', ev: 'A',
      classes: ['vitamin', 'anticoagulant'],
      title: 'مضاد فعال',
      desc: 'يقلل فعالية الوارفارين',
      action: 'حافظ على كمية ثابتة',
      mechanism: 'مضاد مباشر',
      onset: '24-48 ساعة',
      severity_score: 70
    },
    {
      a: 'paracetamol', b: 'warfarin', sev: 'low', ev: 'B',
      classes: ['analgesic', 'anticoagulant'],
      title: 'ارتفاع INR طفيف',
      desc: 'تأثير طفيف على الوارفارين',
      action: 'راقب INR',
      mechanism: 'غير واضح',
      onset: '5-7 أيام',
      severity_score: 35
    },
    {
      a: 'caffeine', b: 'theophylline', sev: 'low', ev: 'B',
      classes: ['stimulant', 'bronchodilator'],
      title: 'تنبيه مفرط',
      desc: 'زيادة التأثير المنبه',
      action: 'قلل الكافيين',
      mechanism: 'تأثير متمم',
      onset: 'فوري',
      severity_score: 25
    },
    {
      a: 'calcium', b: 'iron', sev: 'low', ev: 'B',
      classes: ['supplement', 'supplement'],
      title: 'منافسة امتصاص',
      desc: 'يقلل امتصاص كل منهما',
      action: 'فاصل ساعتين',
      mechanism: 'منافسة ناقلة',
      onset: 'فوري',
      severity_score: 30
    },
    {
      a: 'zinc', b: 'copper', sev: 'low', ev: 'B',
      classes: ['supplement', 'supplement'],
      title: 'منافسة معدنية',
      desc: 'تنافس في الامتصاص',
      action: 'فاصل ساعتين',
      mechanism: 'منافسة معدنية',
      onset: 'فوري',
      severity_score: 28
    },
    {
      a: 'magnesium', b: 'calcium', sev: 'low', ev: 'B',
      classes: ['supplement', 'supplement'],
      title: 'تنافس في الامتصاص',
      desc: 'تنافس في الامتصاص',
      action: 'فاصل ساعتين',
      mechanism: 'منافسة معدنية',
      onset: 'فوري',
      severity_score: 25
    }
  ];

  /* ============================================
     2. CLASSES DATABASE
     ============================================ */
  var DRUG_CLASSES = {
    'warfarin': ['anticoagulant'],
    'aspirin': ['antiplatelet', 'nsaid'],
    'ibuprofen': ['nsaid'],
    'naproxen': ['nsaid'],
    'diclofenac': ['nsaid'],
    'clopidogrel': ['antiplatelet'],
    'heparin': ['anticoagulant'],
    'lisinopril': ['ace'],
    'enalapril': ['ace'],
    'captopril': ['ace'],
    'losartan': ['arb'],
    'valsartan': ['arb'],
    'simvastatin': ['statin'],
    'atorvastatin': ['statin'],
    'rosuvastatin': ['statin'],
    'metformin': ['antidiabetic'],
    'insulin': ['antidiabetic'],
    'omeprazole': ['ppi'],
    'esomeprazole': ['ppi'],
    'pantoprazole': ['ppi'],
    'ciprofloxacin': ['antibiotic', 'fluoroquinolone'],
    'levofloxacin': ['antibiotic', 'fluoroquinolone'],
    'amoxicillin': ['antibiotic', 'penicillin'],
    'azithromycin': ['antibiotic', 'macrolide'],
    'clarithromycin': ['antibiotic', 'macrolide'],
    'erythromycin': ['antibiotic', 'macrolide'],
    'metronidazole': ['antibiotic', 'nitroimidazole'],
    'fluconazole': ['antifungal'],
    'itraconazole': ['antifungal'],
    'ketoconazole': ['antifungal'],
    'paracetamol': ['analgesic'],
    'acetaminophen': ['analgesic'],
    'tramadol': ['opioid', 'analgesic'],
    'morphine': ['opioid'],
    'fluoxetine': ['ssri', 'antidepressant'],
    'sertraline': ['ssri', 'antidepressant'],
    'digoxin': ['cardiac'],
    'amiodarone': ['antiarrhythmic'],
    'metoprolol': ['beta'],
    'propranolol': ['beta'],
    'verapamil': ['ccb'],
    'diltiazem': ['ccb'],
    'amlodipine': ['ccb'],
    'levothyroxine': ['thyroid'],
    'methimazole': ['thyroid'],
    'sildenafil': ['pde5'],
    'tadalafil': ['pde5'],
    'methotrexate': ['dmard'],
    'azathioprine': ['immunosuppressant'],
    'allopurinol': ['gout'],
    'furosemide': ['diuretic'],
    'spironolactone': ['diuretic'],
    'lithium': ['mood'],
    'linezolid': ['antibiotic', 'oxazolidinone'],
    'prednisone': ['steroid'],
    'prednisolone': ['steroid'],
    'rifampin': ['antibiotic'],
    'carbamazepine': ['anticonvulsant'],
    'phenytoin': ['anticonvulsant'],
    'montelukast': ['antileukotriene'],
    'clindamycin': ['antibiotic'],
    'tetracycline': ['antibiotic']
  };

  /* ============================================
     3. LEARNING SYSTEM
     ============================================ */
  var Learning = (function() {
    function load() {
      try {
        return JSON.parse(localStorage.getItem(DIP.learnKey) || '{"confirmed":{},"rejected":{}}');
      } catch (e) {
        return { confirmed: {}, rejected: {} };
      }
    }
    function save(d) {
      try {
        localStorage.setItem(DIP.learnKey, JSON.stringify(d));
      } catch (e) {}
    }
    return {
      confirm: function(a, b, data) {
        var d = load();
        var k = [a, b].sort().join('|');
        d.confirmed[k] = { data: data, at: Date.now() };
        delete d.rejected[k];
        save(d);
      },
      reject: function(a, b) {
        var d = load();
        var k = [a, b].sort().join('|');
        d.rejected[k] = Date.now();
        delete d.confirmed[k];
        save(d);
      },
      isConfirmed: function(a, b) {
        return load().confirmed[[a, b].sort().join('|')];
      },
      isRejected: function(a, b) {
        return load().rejected[[a, b].sort().join('|')];
      },
      stats: function() {
        var d = load();
        return {
          confirmed: Object.keys(d.confirmed).length,
          rejected: Object.keys(d.rejected).length
        };
      }
    };
  })();

  /* ============================================
     4. AI SCORING ENGINE
     ============================================ */
  function getDrugClass(name) {
    var n = String(name || '').toLowerCase().trim();
    if (DRUG_CLASSES[n]) return DRUG_CLASSES[n];
    for (var k in DRUG_CLASSES) {
      if (n.indexOf(k) !== -1 || k.indexOf(n) !== -1) {
        return DRUG_CLASSES[k];
      }
    }
    return [];
  }

  function getPatientRiskMultiplier(interaction, patient) {
    var m = 1.0;
    if (!patient) return m;

    if (patient.age) {
      if (patient.age >= 65) m *= 1.25;
      if (patient.age >= 80) m *= 1.4;
      if (patient.age <= 12) m *= 1.15;
    }
    if (patient.weight && patient.weight < 50) m *= 1.15;
    if (patient.pregnant) m *= 1.5;
    if (patient.lactating) m *= 1.2;
    if (patient.renal === 'moderate') m *= 1.2;
    if (patient.renal === 'severe') m *= 1.6;
    if (patient.hepatic === 'moderate') m *= 1.15;
    if (patient.hepatic === 'severe') m *= 1.5;

    var classes = interaction.classes || [];
    if (patient.conditions && patient.conditions.indexOf('bleeding') !== -1 &&
        (classes.indexOf('anticoagulant') !== -1 || classes.indexOf('antiplatelet') !== -1)) {
      m *= 1.5;
    }
    if (patient.conditions && patient.conditions.indexOf('kidney') !== -1 &&
        (classes.indexOf('nsaid') !== -1 || classes.indexOf('diuretic') !== -1)) {
      m *= 1.4;
    }
    if (patient.conditions && patient.conditions.indexOf('liver') !== -1 &&
        (classes.indexOf('analgesic') !== -1 || classes.indexOf('statin') !== -1)) {
      m *= 1.3;
    }
    if (patient.conditions && patient.conditions.indexOf('heart') !== -1 &&
        (classes.indexOf('cardiac') !== -1 || classes.indexOf('ccb') !== -1)) {
      m *= 1.2;
    }

    return m;
  }

  function getAdjustedSeverity(interaction, patient) {
    var base = interaction.severity_score || 50;
    var mult = getPatientRiskMultiplier(interaction, patient);
    return Math.min(100, Math.round(base * mult));
  }

  function getSeverityLevel(score) {
    if (score >= 85) {
      return { level: 'critical', label: 'حرج', color: '#dc2626', icon: 'fa-radiation' };
    }
    if (score >= 70) {
      return { level: 'high', label: 'عالي', color: '#ea580c', icon: 'fa-exclamation-triangle' };
    }
    if (score >= 50) {
      return { level: 'medium', label: 'متوسط', color: '#f59e0b', icon: 'fa-exclamation-circle' };
    }
    if (score >= 25) {
      return { level: 'low', label: 'بسيط', color: '#0ea5e9', icon: 'fa-info-circle' };
    }
    return { level: 'info', label: 'معلومة', color: '#64748b', icon: 'fa-info' };
  }

  /* ============================================
     5. DUPLICATE THERAPY DETECTION
     ============================================ */
  function detectDuplicateTherapy(drugs) {
    var groups = {};
    drugs.forEach(function(d) {
      var classes = getDrugClass(d.active || d.name);
      classes.forEach(function(c) {
        if (!groups[c]) groups[c] = [];
        groups[c].push(d);
      });
    });
    var duplicates = [];
    Object.keys(groups).forEach(function(c) {
      if (groups[c].length > 1 && c !== 'analgesic') {
        duplicates.push({
          class: c,
          drugs: groups[c],
          severity: 'medium',
          title: 'تكرار علاجي: ' + c,
          desc: 'أكثر من دواء من نفس الفئة — قد يؤدي لزيادة الآثار الجانبية',
          action: 'راجع الحاجة الفعلية لكل دواء'
        });
      }
    });
    return duplicates;
  }

  /* ============================================
     6. FOOD INTERACTIONS
     ============================================ */
  var FOOD_INTERACTIONS = {
    'warfarin': [
      { food: 'الخضروات الورقية (سبانخ، كرنب)', reason: 'غنية بفيتامين K — تقلل فعالية الوارفارين', action: 'حافظ على كمية ثابتة يومياً' }
    ],
    'simvastatin': [
      { food: 'عصير الجريب فروت', reason: 'يرفع مستوى الستاتين — خطر تسمم عضلي', action: 'تجنب تماماً' }
    ],
    'atorvastatin': [
      { food: 'عصير الجريب فروت', reason: 'نفس التأثير', action: 'تجنب' }
    ],
    'metronidazole': [
      { food: 'الكحول', reason: 'تفاعل ديسلفيرام — قيء شديد', action: 'تجنب 48 ساعة' }
    ],
    'metformin': [
      { food: 'الكحول', reason: 'خطر حماض لبني', action: 'تجنب' }
    ],
    'tetracycline': [
      { food: 'منتجات الألبان', reason: 'الكالسيوم يمنع الامتصاص', action: 'فاصل ساعتين' }
    ],
    'ciprofloxacin': [
      { food: 'منتجات الألبان', reason: 'يقلل الامتصاص', action: 'فاصل ساعتين' }
    ],
    'levothyroxine': [
      { food: 'الأطعمة الغنية بالكالسيوم', reason: 'يقلل امتصاص الثيروكسين', action: 'خذه على معدة فارغة' }
    ],
    'maoi': [
      { food: 'الجبن المعتق، النبيذ الأحمر', reason: 'أزمة ارتفاع ضغط', action: 'تجنب الأطعمة الغنية بالتيرامين' }
    ],
    'ssri': [
      { food: 'الكحول', reason: 'يزيد النعاس', action: 'قلل الكحول' }
    ]
  };

  /* ============================================
     7. AI ALTERNATIVE SUGGESTIONS
     ============================================ */
  function suggestAlternatives(drug, conflictDrug, interaction) {
    var suggestions = [];
    var classes = getDrugClass(drug.active || drug.name);

    var alternatives = {
      'nsaid': [
        { name: 'Paracetamol', reason: 'مسكن آمن مع معظم الأدوية', safe: true },
        { name: 'Celecoxib', reason: 'NSAID انتقائي — أقل تأثير على المعدة', safe: false }
      ],
      'warfarin': [
        { name: 'Apixaban', reason: 'مضاد تخثر حديث — أقل تفاعلات', safe: false },
        { name: 'Rivaroxaban', reason: 'نفس الفئة', safe: false }
      ],
      'omeprazole': [
        { name: 'Pantoprazole', reason: 'لا يثبط CYP2C19 بنفس القوة', safe: true },
        { name: 'Rabeprazole', reason: 'بديل آمن مع Clopidogrel', safe: true }
      ],
      'simvastatin': [
        { name: 'Pravastatin', reason: 'لا يُستقلب بـ CYP3A4', safe: true },
        { name: 'Rosuvastatin', reason: 'أقل تفاعلات', safe: true }
      ],
      'clarithromycin': [
        { name: 'Azithromycin', reason: 'لا يثبط CYP3A4', safe: true }
      ],
      'fluconazole': [
        { name: 'Terbinafine', reason: 'لا يثبط CYP2C9', safe: true }
      ],
      'ciprofloxacin': [
        { name: 'Levofloxacin', reason: 'نفس الفئة — احتياطات مماثلة', safe: false },
        { name: 'Cefixime', reason: 'بديل من فئة مختلفة', safe: true }
      ]
    };

    classes.forEach(function(c) {
      if (alternatives[c]) {
        alternatives[c].forEach(function(a) {
          suggestions.push(Object.assign({ forClass: c, original: drug.name || drug.active }, a));
        });
      }
    });

    return suggestions.slice(0, 3);
  }

  /* ============================================
     8. INTERACTION CHECKER
     ============================================ */
  async function checkInteractions(drugs) {
    var results = [];
    var seen = {};

    for (var i = 0; i < drugs.length; i++) {
      for (var j = i + 1; j < drugs.length; j++) {
        var d1 = drugs[i];
        var d2 = drugs[j];
        var n1 = String(d1.active || d1.name || '').toLowerCase().trim();
        var n2 = String(d2.active || d2.name || '').toLowerCase().trim();

        if (Learning.isRejected(n1, n2)) continue;

        DDI_DB.forEach(function(inter) {
          var a = inter.a.toLowerCase();
          var b = inter.b.toLowerCase();
          var match = (
            (n1.indexOf(a) !== -1 || a.indexOf(n1) !== -1) &&
            (n2.indexOf(b) !== -1 || b.indexOf(n2) !== -1)
          ) || (
            (n1.indexOf(b) !== -1 || b.indexOf(n1) !== -1) &&
            (n2.indexOf(a) !== -1 || a.indexOf(n2) !== -1)
          );
          if (!match) return;

          var key = [d1.id || n1, d2.id || n2, inter.title].join('|');
          if (seen[key]) return;
          seen[key] = true;

          var adjustedScore = getAdjustedSeverity(inter, DIP.patient);
          var severity = getSeverityLevel(adjustedScore);

          results.push({
            id: 'ix_' + results.length,
            drugA: d1,
            drugB: d2,
            nameA: d1.name || d1.active,
            nameB: d2.name || d2.active,
            title: inter.title,
            desc: inter.desc,
            action: inter.action,
            mechanism: inter.mechanism,
            onset: inter.onset,
            evidence: inter.ev,
            baseScore: inter.severity_score,
            score: adjustedScore,
            severity: severity,
            classes: inter.classes,
            source: 'local'
          });
        });
      }
    }

    try {
      if (typeof RxNormAPI !== 'undefined') {
        for (var x = 0; x < drugs.length; x++) {
          var cui = await RxNormAPI.getRxCUI(drugs[x].name || drugs[x].active);
          if (!cui) continue;
          var ix = await RxNormAPI.getInteractions(cui);
          ix.forEach(function(item) {
            for (var y = 0; y < drugs.length; y++) {
              if (y === x) continue;
              var target = String(drugs[y].name || drugs[y].active || '').toLowerCase().split(' ')[0];
              if (item.drugB && item.drugB.toLowerCase().indexOf(target) !== -1) {
                var key2 = [drugs[x].id, drugs[y].id, 'rxnorm'].join('|');
                if (!seen[key2]) {
                  seen[key2] = true;
                  var score2 = item.severity === 'high' ? 85 : item.severity === 'medium' ? 60 : 35;
                  results.push({
                    id: 'ix_rx_' + results.length,
                    drugA: drugs[x],
                    drugB: drugs[y],
                    nameA: drugs[x].name,
                    nameB: drugs[y].name,
                    title: 'تفاعل موثق',
                    desc: item.description || '—',
                    action: 'راجع النشرة الدوائية',
                    mechanism: '—',
                    onset: '—',
                    evidence: 'A',
                    baseScore: score2,
                    score: Math.round(score2 * getPatientRiskMultiplier({ classes: [] }, DIP.patient)),
                    severity: getSeverityLevel(score2),
                    classes: [],
                    source: 'rxnorm'
                  });
                }
              }
            }
          });
        }
      }
    } catch (e) { /* silent */ }

    results.forEach(function(r) {
      var conf = Learning.isConfirmed(r.nameA, r.nameB);
      if (conf) {
        r.confirmed = true;
        r.score = Math.min(100, r.score + 10);
      }
    });

    results.sort(function(a, b) { return b.score - a.score; });

    return results;
  }

  /* ============================================
     9. RENDER MAIN PAGE
     ============================================ */
  function render() {
    var content = document.getElementById('phContent');
    if (!content) {
      console.error('[DIP] phContent not found');
      return;
    }

    var learnStats = { confirmed: 0, rejected: 0 };
    try {
      learnStats = Learning.stats();
    } catch (e) {
      console.warn('[DIP] Learning error:', e);
    }

    var criticalCount = 0;
    var highCount = 0;
    var mediumCount = 0;
    DDI_DB.forEach(function(x) {
      if (x.severity_score >= 85) criticalCount++;
      else if (x.severity_score >= 70) highCount++;
      else if (x.severity_score >= 50) mediumCount++;
    });

    try {
      var html = '';

      html += '<div class="ph-page-head">';
      html += '<div>';
      html += '<h1><i class="fas fa-brain"></i> التداخلات الدوائية الذكية</h1>';
      html += '<p>نظام دعم قرار سريري بـ 5 مصادر + ذكاء اصطناعي</p>';
      html += '</div>';
      html += '<div class="ph-head-actions">';
      html += '<button class="btn btn-outline btn-sm" onclick="DIP.resetPatient()">';
      html += '<i class="fas fa-user"></i> ملف المريض</button>';
      html += '<button class="btn btn-primary btn-sm" onclick="DIP.openChecker()">';
      html += '<i class="fas fa-vials"></i> فحص جديد</button>';
      html += '</div>';
      html += '</div>';

      html += '<div class="di-stats">';
      html += '<div class="di-stat-card">';
      html += '<div class="di-stat-icon" style="background:linear-gradient(135deg,#dc2626,#f87171)">';
      html += '<i class="fas fa-radiation"></i></div>';
      html += '<div class="di-stat-value">' + criticalCount + '</div>';
      html += '<div class="di-stat-label">تداخل حرج</div>';
      html += '</div>';

      html += '<div class="di-stat-card">';
      html += '<div class="di-stat-icon" style="background:linear-gradient(135deg,#ea580c,#fb923c)">';
      html += '<i class="fas fa-exclamation-triangle"></i></div>';
      html += '<div class="di-stat-value">' + highCount + '</div>';
      html += '<div class="di-stat-label">خطر عالي</div>';
      html += '</div>';

      html += '<div class="di-stat-card">';
      html += '<div class="di-stat-icon" style="background:linear-gradient(135deg,#f59e0b,#fbbf24)">';
      html += '<i class="fas fa-exclamation-circle"></i></div>';
      html += '<div class="di-stat-value">' + mediumCount + '</div>';
      html += '<div class="di-stat-label">متوسط</div>';
      html += '</div>';

      html += '<div class="di-stat-card">';
      html += '<div class="di-stat-icon" style="background:linear-gradient(135deg,#00b884,#00d4a0)">';
      html += '<i class="fas fa-database"></i></div>';
      html += '<div class="di-stat-value">' + DDI_DB.length + '</div>';
      html += '<div class="di-stat-label">إجمالي القاعدة</div>';
      html += '</div>';
      html += '</div>';

      if (learnStats.confirmed + learnStats.rejected > 0) {
        html += '<div class="di-learn-banner">';
        html += '<i class="fas fa-brain"></i>';
        html += '<div style="flex:1">';
        html += '<strong>النظام يتعلم:</strong> ' + learnStats.confirmed + ' تفاعل مؤكد، ' + learnStats.rejected + ' مستبعد';
        html += '<div style="font-size:.75rem;color:var(--text-muted);margin-top:2px">كل تأكيد/رفض يحسّن دقة النظام</div>';
        html += '</div>';
        html += '<button class="btn btn-outline btn-sm" onclick="DIP.clearLearning()">';
        html += '<i class="fas fa-trash"></i></button>';
        html += '</div>';
      }

      html += '<div class="di-toolbar">';
      html += '<div class="di-search-wrap">';
      html += '<i class="fas fa-search"></i>';
      html += '<input type="text" id="diSearch" class="di-search" placeholder="ابحث عن دواء..." oninput="DIP.filterList()">';
      html += '</div>';
      html += '<select class="bi-select" id="diSeverityFilter" onchange="DIP.filterList()">';
      html += '<option value="">كل المستويات</option>';
      html += '<option value="critical">حرج</option>';
      html += '<option value="high">عالي</option>';
      html += '<option value="medium">متوسط</option>';
      html += '<option value="low">بسيط</option>';
      html += '</select>';
      html += '<select class="bi-select" id="diEvidenceFilter" onchange="DIP.filterList()">';
      html += '<option value="">كل الأدلة</option>';
      html += '<option value="A">دليل قوي (A)</option>';
      html += '<option value="B">دليل متوسط (B)</option>';
      html += '<option value="C">دليل ضعيف (C)</option>';
      html += '</select>';
      html += '<div class="di-view-toggle">';
      html += '<button class="active" data-view="list" onclick="DIP.setView(\'list\')"><i class="fas fa-list"></i> قائمة</button>';
      html += '<button data-view="graph" onclick="DIP.setView(\'graph\')"><i class="fas fa-project-diagram"></i> شبكة</button>';
      html += '</div>';
      html += '</div>';

      html += '<div id="diContent"></div>';

      content.innerHTML = html;

      renderList();

      console.log('[DIP] ✅ Rendered successfully');
    } catch (err) {
      console.error('[DIP] render error:', err);
      content.innerHTML = 
        '<div style="padding:40px;text-align:center">' +
          '<i class="fas fa-bug" style="font-size:3rem;color:#dc2626"></i>' +
          '<h2 style="margin-top:16px;color:#dc2626">خطأ في التحميل</h2>' +
          '<p style="color:#64748b;margin-top:8px">' + escapeHtml(err.message) + '</p>' +
          '<pre style="text-align:start;background:#f8fafc;padding:16px;border-radius:8px;margin-top:16px;font-size:.75rem;overflow:auto;max-height:300px;direction:ltr">' + 
            escapeHtml((err.stack || '').slice(0, 1500)) + 
          '</pre>' +
          '<button class="btn btn-primary" style="margin-top:16px" onclick="location.reload()">' +
            '<i class="fas fa-redo"></i> إعادة تحميل' +
          '</button>' +
        '</div>';
    }
  }

  function renderList() {
    var el = document.getElementById('diContent');
    if (!el) return;

    var searchEl = document.getElementById('diSearch');
    var sevEl = document.getElementById('diSeverityFilter');
    var evEl = document.getElementById('diEvidenceFilter');

    var search = searchEl ? searchEl.value : '';
    var sevFilter = sevEl ? sevEl.value : '';
    var evFilter = evEl ? evEl.value : '';

    var list = DDI_DB.filter(function(x) {
      var q = search.toLowerCase().trim();
      if (q && x.a.toLowerCase().indexOf(q) === -1 && x.b.toLowerCase().indexOf(q) === -1 &&
          x.title.indexOf(q) === -1) {
        return false;
      }
      var sev = getSeverityLevel(x.severity_score).level;
      if (sevFilter && sev !== sevFilter) return false;
      if (evFilter && x.ev !== evFilter) return false;
      return true;
    });

    if (!list.length) {
      el.innerHTML = '<div class="ph-empty"><i class="fas fa-search"></i><h4>لا توجد نتائج</h4></div>';
      return;
    }

    var h = '<div class="di-grid">';
    list.forEach(function(x) {
      var sev = getSeverityLevel(x.severity_score);
      var evColor = x.ev === 'A' ? '#10b981' : x.ev === 'B' ? '#f59e0b' : '#94a3b8';

      h += '<div class="di-card" style="--sev-color:' + sev.color + '">';
      h += '<div class="di-card-strip"></div>';

      h += '<div class="di-card-head">';
      h += '<div class="di-drugs">';
      h += '<div class="di-drug-chip">' + escapeHtml(x.a) + '</div>';
      h += '<i class="fas fa-plus"></i>';
      h += '<div class="di-drug-chip">' + escapeHtml(x.b) + '</div>';
      h += '</div>';
      h += '<div class="di-severity-badge" style="background:' + sev.color + '">';
      h += '<i class="fas ' + sev.icon + '"></i> ' + sev.label;
      h += '</div>';
      h += '</div>';

      h += '<h3 class="di-card-title">' + escapeHtml(x.title) + '</h3>';
      h += '<p class="di-card-desc">' + escapeHtml(x.desc) + '</p>';

      h += '<div class="di-card-meta">';
      h += '<div class="di-meta-item"><i class="fas fa-flask"></i><span>' + escapeHtml(x.mechanism) + '</span></div>';
      h += '<div class="di-meta-item"><i class="fas fa-clock"></i><span>البداية: ' + escapeHtml(x.onset) + '</span></div>';
      h += '</div>';

      h += '<div class="di-card-foot">';
      h += '<div class="di-score-ring" style="--pct:' + x.severity_score + ';--color:' + sev.color + '">';
      h += '<svg viewBox="0 0 36 36">';
      h += '<circle cx="18" cy="18" r="15.9" stroke-width="3" fill="none" stroke="#e2e8f0"/>';
      h += '<circle cx="18" cy="18" r="15.9" stroke-width="3" fill="none" stroke="' + sev.color + '" stroke-dasharray="' + x.severity_score + ', 100" transform="rotate(-90 18 18)" stroke-linecap="round"/>';
      h += '</svg>';
      h += '<span>' + x.severity_score + '</span>';
      h += '</div>';

      h += '<div class="di-evidence" style="background:' + evColor + '20;color:' + evColor + '">';
      h += '<i class="fas fa-flask"></i> دليل ' + x.ev;
      h += '</div>';

      h += '<button class="di-btn-more" onclick="DIP.showDetails(\'' + x.a + '\', \'' + x.b + '\')">';
      h += '<i class="fas fa-arrow-left"></i> تفاصيل';
      h += '</button>';

      h += '</div>';
      h += '</div>';
    });
    h += '</div>';
    el.innerHTML = h;
  }

  function renderGraph() {
    var el = document.getElementById('diContent');
    if (!el) return;

    el.innerHTML = '<div id="diGraph" style="width:100%;height:600px;background:#fff;border-radius:20px;border:1px solid var(--border);overflow:hidden"></div>';

    if (typeof d3 === 'undefined') {
      el.innerHTML = '<div class="ph-empty"><i class="fas fa-project-diagram"></i><h4>D3.js لم يتم تحميله</h4></div>';
      return;
    }

    var nodes = {};
    var links = [];
    DDI_DB.forEach(function(x) {
      if (!nodes[x.a]) nodes[x.a] = { id: x.a, count: 0, maxSev: 0 };
      if (!nodes[x.b]) nodes[x.b] = { id: x.b, count: 0, maxSev: 0 };
      nodes[x.a].count++;
      nodes[x.b].count++;
      nodes[x.a].maxSev = Math.max(nodes[x.a].maxSev, x.severity_score);
      nodes[x.b].maxSev = Math.max(nodes[x.b].maxSev, x.severity_score);
      links.push({ source: x.a, target: x.b, sev: x.severity_score, title: x.title });
    });

    var width = el.clientWidth || 800;
    var height = 600;
    var svg = d3.select('#diGraph').append('svg').attr('width', width).attr('height', height);
    var g = svg.append('g');

    svg.call(d3.zoom().on('zoom', function(e) {
      g.attr('transform', e.transform);
    }));

    var nodeList = Object.values(nodes);
    var sim = d3.forceSimulation(nodeList)
      .force('link', d3.forceLink(links).id(function(d) { return d.id; }).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(28));

    var link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', function(d) {
        var s = getSeverityLevel(d.sev);
        return s.color;
      })
      .attr('stroke-width', function(d) { return 1 + d.sev / 30; })
      .attr('stroke-opacity', 0.5);

    var node = g.append('g').selectAll('circle')
      .data(nodeList).enter().append('circle')
      .attr('r', function(d) { return 8 + d.count * 2; })
      .attr('fill', function(d) {
        var s = getSeverityLevel(d.maxSev);
        return s.color;
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragStart)
        .on('drag', dragging)
        .on('end', dragEnd));

    var label = g.append('g').selectAll('text')
      .data(nodeList).enter().append('text')
      .text(function(d) { return d.id; })
      .attr('font-family', 'Cairo')
      .attr('font-size', 11)
      .attr('font-weight', 700)
      .attr('fill', '#0f172a')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .style('pointer-events', 'none');

    node.on('mouseover', function(e, d) {
      link.attr('stroke-opacity', function(l) {
        return (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1;
      });
    }).on('mouseout', function() {
      link.attr('stroke-opacity', 0.5);
    });

    sim.on('tick', function() {
      link.attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });
      node.attr('cx', function(d) { return d.x; }).attr('cy', function(d) { return d.y; });
      label.attr('x', function(d) { return d.x; }).attr('y', function(d) { return d.y; });
    });

    function dragStart(e, d) {
      if (!e.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragging(e, d) {
      d.fx = e.x;
      d.fy = e.y;
    }
    function dragEnd(e, d) {
      if (!e.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
  }

  /* ============================================
     10. CHECKER MODAL
     ============================================ */
  function openChecker() {
    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML =
      '<div class="ph-modal-head">' +
        '<h3><i class="fas fa-vials"></i> فحص التداخلات الذكي</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="ph-modal-body">' +
        '<div class="di-checker-patient">' +
          '<div class="di-patient-header" onclick="DIP.togglePatient()">' +
            '<i class="fas fa-user-circle"></i>' +
            '<div style="flex:1">' +
              '<strong>ملف المريض</strong>' +
              '<div style="font-size:.75rem;color:var(--text-muted)" id="diPatientSummary">' + getPatientSummary() + '</div>' +
            '</div>' +
            '<i class="fas fa-chevron-down"></i>' +
          '</div>' +
          '<div class="di-patient-form" id="diPatientForm" style="display:none">' +
            '<div class="di-form-grid">' +
              '<div><label>العمر</label><input type="number" id="diAge" value="' + (DIP.patient.age || '') + '" placeholder="سنة"></div>' +
              '<div><label>الوزن (كجم)</label><input type="number" id="diWeight" value="' + (DIP.patient.weight || '') + '"></div>' +
              '<div><label><input type="checkbox" id="diPregnant"' + (DIP.patient.pregnant ? ' checked' : '') + '> حامل</label></div>' +
              '<div><label><input type="checkbox" id="diLactating"' + (DIP.patient.lactating ? ' checked' : '') + '> مرضعة</label></div>' +
              '<div><label>وظائف الكلى</label>' +
                '<select id="diRenal">' +
                  '<option value="normal"' + (DIP.patient.renal === 'normal' ? ' selected' : '') + '>طبيعية</option>' +
                  '<option value="moderate"' + (DIP.patient.renal === 'moderate' ? ' selected' : '') + '>ضعف متوسط</option>' +
                  '<option value="severe"' + (DIP.patient.renal === 'severe' ? ' selected' : '') + '>فشل كلوي</option>' +
                '</select>' +
              '</div>' +
              '<div><label>وظائف الكبد</label>' +
                '<select id="diHepatic">' +
                  '<option value="normal"' + (DIP.patient.hepatic === 'normal' ? ' selected' : '') + '>طبيعية</option>' +
                  '<option value="moderate"' + (DIP.patient.hepatic === 'moderate' ? ' selected' : '') + '>ضعف متوسط</option>' +
                  '<option value="severe"' + (DIP.patient.hepatic === 'severe' ? ' selected' : '') + '>فشل كبدي</option>' +
                '</select>' +
              '</div>' +
            '</div>' +
            '<div style="margin-top:12px">' +
              '<label>الأمراض المزمنة</label>' +
              '<div class="di-checkbox-group">' +
                ['bleeding:نزيف', 'kidney:كلى', 'liver:كبد', 'heart:قلب', 'diabetes:سكري', 'hypertension:ضغط'].map(function(c) {
                  var parts = c.split(':');
                  var checked = DIP.patient.conditions.indexOf(parts[0]) !== -1 ? ' checked' : '';
                  return '<label><input type="checkbox" class="di-cond" value="' + parts[0] + '"' + checked + '> ' + parts[1] + '</label>';
                }).join('') +
              '</div>' +
            '</div>' +
            '<button class="btn btn-primary btn-sm" style="margin-top:12px;width:100%" onclick="DIP.savePatient()">' +
              '<i class="fas fa-check"></i> حفظ الملف' +
            '</button>' +
          '</div>' +
        '</div>' +

        '<p style="color:var(--text-muted);font-size:.85rem;margin:16px 0 10px">اختر الأدوية للفحص:</p>' +
        '<div id="diDrugPicker" class="di-drug-picker"></div>' +
        '<button class="btn btn-outline btn-sm" style="margin-top:10px" onclick="DIP.addDrugPicker()">' +
          '<i class="fas fa-plus"></i> إضافة دواء' +
        '</button>' +
        '<div id="diResults" style="margin-top:20px"></div>' +
      '</div>' +
      '<div class="ph-modal-foot">' +
        '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>' +
        '<button class="btn btn-primary" onclick="DIP.runCheck()"><i class="fas fa-play"></i> فحص التداخلات</button>' +
      '</div>';

    window._diPicker = [];
    addDrugPicker();
    addDrugPicker();

    var overlay = document.getElementById('phModalOverlay');
    if (overlay) overlay.classList.add('open');
  }

  function getPatientSummary() {
    var p = DIP.patient;
    var parts = [];
    if (p.age) parts.push(p.age + ' سنة');
    if (p.weight) parts.push(p.weight + ' كجم');
    if (p.pregnant) parts.push('حامل');
    if (p.lactating) parts.push('مرضعة');
    if (p.renal !== 'normal') parts.push('كلى: ' + p.renal);
    if (p.hepatic !== 'normal') parts.push('كبد: ' + p.hepatic);
    if (p.conditions.length) parts.push(p.conditions.length + ' أمراض');
    return parts.length ? parts.join(' • ') : 'لم يتم إدخال بيانات — اضغط للتعديل';
  }

  function addDrugPicker() {
    var container = document.getElementById('diDrugPicker');
    if (!container) return;

    if (!window._diPicker) window._diPicker = [];
    var idx = window._diPicker.length;
    window._diPicker.push(null);

    var products = (typeof PH !== 'undefined' && PH.getProducts) ? PH.getProducts() : [];

    var row = document.createElement('div');
    row.className = 'di-picker-row';
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center';

    var sel = document.createElement('select');
    sel.className = 'bi-select';
    sel.style.flex = '1';
    sel.innerHTML = '<option value="">اختر دواء...</option>' +
      products.map(function(p) {
        var active = p.active ? ' — ' + escapeHtml(p.active) : '';
        return '<option value="' + p.id + '">' + escapeHtml(p.name) + active + '</option>';
      }).join('');
    sel.onchange = function() { window._diPicker[idx] = this.value; };

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'di-remove-btn';
    btn.innerHTML = '<i class="fas fa-times"></i>';
    btn.onclick = function() { row.remove(); };

    row.appendChild(sel);
    row.appendChild(btn);
    container.appendChild(row);
  }

  async function runCheck() {
    var ids = (window._diPicker || []).filter(Boolean);
    if (ids.length < 2) {
      if (typeof Utils !== 'undefined') Utils.toast('اختر دواءين على الأقل', 'warning');
      return;
    }

    var products = (typeof PH !== 'undefined' && PH.getProducts) ? PH.getProducts() : [];
    var drugs = ids.map(function(id) {
      return products.find(function(p) { return p.id === id; });
    }).filter(Boolean);

    var resultsEl = document.getElementById('diResults');
    if (!resultsEl) return;

    resultsEl.innerHTML = '<div style="text-align:center;padding:30px">' +
      '<i class="fas fa-spinner fa-spin" style="font-size:2rem;color:var(--primary)"></i>' +
      '<div style="margin-top:12px;font-weight:800">جاري التحليل...</div>' +
      '</div>';

    var interactions = await checkInteractions(drugs);
    var duplicates = detectDuplicateTherapy(drugs);

    var foodIssues = [];
    drugs.forEach(function(d) {
      var n = String(d.active || d.name || '').toLowerCase();
      Object.keys(FOOD_INTERACTIONS).forEach(function(k) {
        if (n.indexOf(k) !== -1) {
          FOOD_INTERACTIONS[k].forEach(function(fi) {
            foodIssues.push({
              drug: d.name,
              food: fi.food,
              reason: fi.reason,
              action: fi.action
            });
          });
        }
      });
    });

    renderCheckResults(resultsEl, drugs, interactions, duplicates, foodIssues);
  }

  function renderCheckResults(el, drugs, interactions, duplicates, foodIssues) {
    if (!interactions.length && !duplicates.length && !foodIssues.length) {
      el.innerHTML = '<div class="di-safe-banner">' +
        '<i class="fas fa-check-circle"></i>' +
        '<div>' +
          '<strong>لا توجد تداخلات معروفة</strong>' +
          '<div style="font-size:.8rem;opacity:.85;margin-top:2px">' +
            'مزيج آمن بناءً على ' + DDI_DB.length + ' تفاعل موثق' +
          '</div>' +
        '</div>' +
      '</div>';
      return;
    }

    var h = '';

    if (interactions.length) {
      h += '<div class="di-results-header" style="background:#fef2f2;color:#991b1b">';
      h += '<i class="fas fa-exclamation-triangle"></i>';
      h += '<strong>' + interactions.length + ' تفاعل دوائي</strong>';
      h += '</div>';

      h += '<div class="di-results-list">';
      interactions.forEach(function(ix) {
        var sev = ix.severity;

        h += '<div class="di-result-card" style="--sev:' + sev.color + '">';
        h += '<div class="di-result-head">';
        h += '<div>';
        h += '<strong>' + escapeHtml(ix.nameA) + '</strong>';
        h += ' + ';
        h += '<strong>' + escapeHtml(ix.nameB) + '</strong>';
        h += '</div>';
        h += '<div class="di-result-sev" style="background:' + sev.color + '">';
        h += '<i class="fas ' + sev.icon + '"></i> ' + sev.label + ' (' + ix.score + ')';
        h += '</div>';
        h += '</div>';

        h += '<div class="di-result-title">' + escapeHtml(ix.title) + '</div>';
        h += '<div class="di-result-desc">' + escapeHtml(ix.desc) + '</div>';
        h += '<div class="di-result-action"><strong>الإجراء:</strong> ' + escapeHtml(ix.action) + '</div>';

        var alts = suggestAlternatives(ix.drugA, ix.drugB, ix);
        if (alts.length) {
          h += '<div class="di-alternatives">';
          h += '<div class="di-alts-title"><i class="fas fa-lightbulb"></i> بدائل مقترحة بالذكاء الاصطناعي:</div>';
          alts.forEach(function(a) {
            h += '<div class="di-alt-item">';
            h += '<span class="di-alt-name">' + escapeHtml(a.name) + '</span>';
            h += '<span class="di-alt-reason">' + escapeHtml(a.reason) + '</span>';
            h += '</div>';
          });
          h += '</div>';
        }

        h += '<div class="di-result-actions">';
        h += '<button class="di-action-btn di-action-confirm" onclick="DIP.confirmInteraction(\'' + escapeHtml(ix.nameA) + '\',\'' + escapeHtml(ix.nameB) + '\')">';
        h += '<i class="fas fa-check"></i> تأكيد';
        h += '</button>';
        h += '<button class="di-action-btn di-action-reject" onclick="DIP.rejectInteraction(\'' + escapeHtml(ix.nameA) + '\',\'' + escapeHtml(ix.nameB) + '\')">';
        h += '<i class="fas fa-times"></i> استبعاد';
        h += '</button>';
        h += '</div>';

        h += '</div>';
      });
      h += '</div>';
    }

    if (duplicates.length) {
      h += '<div class="di-results-header" style="background:#fef3c7;color:#92400e;margin-top:16px">';
      h += '<i class="fas fa-copy"></i>';
      h += '<strong>' + duplicates.length + ' تكرار علاجي</strong>';
      h += '</div>';

      duplicates.forEach(function(d) {
        h += '<div class="di-result-card" style="--sev:#f59e0b">';
        h += '<div class="di-result-title">' + escapeHtml(d.title) + '</div>';
        h += '<div class="di-result-desc">' + escapeHtml(d.desc) + '</div>';
        h += '<div style="font-size:.75rem;color:var(--text-muted);margin-top:6px">';
        h += 'الأدوية: ' + d.drugs.map(function(x) { return escapeHtml(x.name); }).join(' • ');
        h += '</div>';
        h += '</div>';
      });
    }

    if (foodIssues.length) {
      h += '<div class="di-results-header" style="background:#dbeafe;color:#1e40af;margin-top:16px">';
      h += '<i class="fas fa-utensils"></i>';
      h += '<strong>' + foodIssues.length + ' تفاعل مع الطعام</strong>';
      h += '</div>';

      foodIssues.forEach(function(f) {
        h += '<div class="di-result-card" style="--sev:#1E88E5">';
        h += '<div class="di-result-title">' + escapeHtml(f.drug) + ' ⚠ ' + escapeHtml(f.food) + '</div>';
        h += '<div class="di-result-desc">' + escapeHtml(f.reason) + '</div>';
        h += '<div class="di-result-action"><strong>الإجراء:</strong> ' + escapeHtml(f.action) + '</div>';
        h += '</div>';
      });
    }

    el.innerHTML = h;
  }

  /* ============================================
     11. DETAILS MODAL
     ============================================ */
  function showDetails(a, b) {
    var found = DDI_DB.find(function(x) {
      return (x.a === a && x.b === b) || (x.a === b && x.b === a);
    });
    if (!found) return;

    var sev = getSeverityLevel(found.severity_score);
    var evDesc = {
      'A': 'دليل قوي من تجارب سريرية محكمة',
      'B': 'دليل متوسط من دراسات رصدية',
      'C': 'دليل ضعيف من تقارير حالات',
      'D': 'دليل نظري فقط'
    };

    var modal = document.getElementById('phModalBox');
    if (!modal) return;

    modal.innerHTML =
      '<div class="ph-modal-head" style="background:linear-gradient(135deg,' + sev.color + '15,#fff)">' +
        '<h3 style="color:' + sev.color + '"><i class="fas ' + sev.icon + '"></i> ' + escapeHtml(found.title) + '</h3>' +
        '<button class="ph-modal-close" onclick="phCloseModal()"><i class="fas fa-times"></i></button>' +
      '</div>' +
      '<div class="ph-modal-body">' +
        '<div class="di-detail-drugs">' +
          '<div class="di-detail-chip">' + escapeHtml(found.a) + '</div>' +
          '<i class="fas fa-exchange-alt"></i>' +
          '<div class="di-detail-chip">' + escapeHtml(found.b) + '</div>' +
        '</div>' +

        '<div class="di-detail-severity" style="background:' + sev.color + '15;border-color:' + sev.color + '">' +
          '<div class="di-detail-score" style="color:' + sev.color + '">' + found.severity_score + '</div>' +
          '<div>' +
            '<div style="font-weight:900;color:' + sev.color + '">خطورة ' + sev.label + '</div>' +
            '<div style="font-size:.8rem;color:var(--text-muted)">' + (evDesc[found.ev] || '') + '</div>' +
          '</div>' +
        '</div>' +

        '<div class="di-detail-section">' +
          '<h4><i class="fas fa-info-circle"></i> الوصف</h4>' +
          '<p>' + escapeHtml(found.desc) + '</p>' +
        '</div>' +

        '<div class="di-detail-section">' +
          '<h4><i class="fas fa-flask"></i> الميكانيزم</h4>' +
          '<p>' + escapeHtml(found.mechanism) + '</p>' +
        '</div>' +

        '<div class="di-detail-section">' +
          '<h4><i class="fas fa-clock"></i> وقت البداية</h4>' +
          '<p>' + escapeHtml(found.onset) + '</p>' +
        '</div>' +

        '<div class="di-detail-section di-detail-action">' +
          '<h4><i class="fas fa-prescription"></i> الإجراء الموصى به</h4>' +
          '<p>' + escapeHtml(found.action) + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="ph-modal-foot">' +
        '<button class="btn btn-outline" onclick="phCloseModal()">إغلاق</button>' +
        '<button class="btn btn-primary" onclick="DIP.printReport(\'' + found.a + '\',\'' + found.b + '\')">' +
          '<i class="fas fa-print"></i> طباعة' +
        '</button>' +
      '</div>';

    var overlay = document.getElementById('phModalOverlay');
    if (overlay) overlay.classList.add('open');
  }

  /* ============================================
     12. PUBLIC API
     ============================================ */
  window.DIP = {
    render: render,
    openChecker: openChecker,
    addDrugPicker: addDrugPicker,
    runCheck: runCheck,
    showDetails: showDetails,

    setView: function(v) {
      DIP.view = v;
      document.querySelectorAll('.di-view-toggle button').forEach(function(b) {
        b.classList.toggle('active', b.dataset.view === v);
      });
      if (v === 'graph') renderGraph();
      else renderList();
    },

    filterList: function() {
      if (DIP.view === 'graph') renderGraph();
      else renderList();
    },

    togglePatient: function() {
      var form = document.getElementById('diPatientForm');
      if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
    },

    savePatient: function() {
      var ageEl = document.getElementById('diAge');
      var weightEl = document.getElementById('diWeight');
      var pregnantEl = document.getElementById('diPregnant');
      var lactatingEl = document.getElementById('diLactating');
      var renalEl = document.getElementById('diRenal');
      var hepaticEl = document.getElementById('diHepatic');

      DIP.patient.age = ageEl ? (parseInt(ageEl.value) || null) : null;
      DIP.patient.weight = weightEl ? (parseInt(weightEl.value) || null) : null;
      DIP.patient.pregnant = pregnantEl ? pregnantEl.checked : false;
      DIP.patient.lactating = lactatingEl ? lactatingEl.checked : false;
      DIP.patient.renal = renalEl ? renalEl.value : 'normal';
      DIP.patient.hepatic = hepaticEl ? hepaticEl.value : 'normal';
      DIP.patient.conditions = Array.from(document.querySelectorAll('.di-cond:checked')).map(function(c) {
        return c.value;
      });

      try {
        localStorage.setItem('pc_di_patient', JSON.stringify(DIP.patient));
      } catch (e) {}

      var summary = document.getElementById('diPatientSummary');
      if (summary) summary.textContent = getPatientSummary();

      if (typeof Utils !== 'undefined') Utils.toast('✅ تم حفظ ملف المريض', 'success');
    },

    resetPatient: function() {
      DIP.patient = {
        age: null,
        weight: null,
        pregnant: false,
        lactating: false,
        renal: 'normal',
        hepatic: 'normal',
        conditions: [],
        allergies: []
      };
      try {
        localStorage.removeItem('pc_di_patient');
      } catch (e) {}
      if (typeof Utils !== 'undefined') Utils.toast('تم مسح ملف المريض', 'info');
    },

    confirmInteraction: function(a, b) {
      Learning.confirm(a, b, { at: new Date().toISOString() });
      if (typeof Utils !== 'undefined') Utils.toast('✅ تم التأكيد — النظام يتعلم', 'success');
    },

    rejectInteraction: function(a, b) {
      Learning.reject(a, b);
      if (typeof Utils !== 'undefined') Utils.toast('تم الاستبعاد — لن يظهر مجدداً', 'info');
      runCheck();
    },

    clearLearning: function() {
      if (!confirm('مسح كل بيانات التعلم؟')) return;
      try {
        localStorage.removeItem(DIP.learnKey);
      } catch (e) {}
      if (typeof Utils !== 'undefined') Utils.toast('تم مسح التعلم', 'success');
      render();
    },

    printReport: function(a, b) {
      var found = DDI_DB.find(function(x) {
        return (x.a === a && x.b === b) || (x.a === b && x.b === a);
      });
      if (!found) return;

      var sev = getSeverityLevel(found.severity_score);
      var w = window.open('', '_blank');

      w.document.write(
        '<html dir="rtl"><head><title>تقرير تفاعل</title>' +
        '<style>' +
        'body{font-family:Cairo,sans-serif;padding:40px;max-width:700px;margin:auto}' +
        'h1{color:' + sev.color + ';border-bottom:3px solid ' + sev.color + ';padding-bottom:10px}' +
        '.box{background:#f8fafc;padding:15px;border-radius:10px;margin:15px 0}' +
        '.label{color:#64748b;font-size:.8rem;font-weight:700}' +
        'table{width:100%;border-collapse:collapse;margin:20px 0}' +
        'td,th{padding:10px;border:1px solid #e2e8f0;text-align:right}' +
        'th{background:#f1f5f9}' +
        '</style></head><body>' +
        '<h1>تقرير تفاعل دوائي</h1>' +
        '<div class="box">' +
          '<div class="label">الخطورة</div>' +
          '<div style="font-size:1.4rem;font-weight:900;color:' + sev.color + '">' +
            found.severity_score + ' / 100 — ' + sev.label +
          '</div>' +
        '</div>' +
        '<table>' +
          '<tr><th>الدواء A</th><td>' + found.a + '</td></tr>' +
          '<tr><th>الدواء B</th><td>' + found.b + '</td></tr>' +
        '</table>' +
        '<h3>الوصف</h3><p>' + found.desc + '</p>' +
        '<h3>الميكانيزم</h3><p>' + found.mechanism + '</p>' +
        '<h3>الإجراء</h3>' +
        '<p style="background:#fef3c7;padding:12px;border-radius:8px">' + found.action + '</p>' +
        '<p style="text-align:center;color:#94a3b8;margin-top:40px;font-size:.75rem">' +
          'PharmaCloud — ' + new Date().toLocaleString('en-GB') +
        '</p>' +
        '<script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script>' +
        '</body></html>'
      );
      w.document.close();
    }
  };

  /* ============================================
     13. SIDEBAR BINDING (مضمون)
     ============================================ */
  window.__DIP_BOUND = false;

  function bindSidebarButton() {
    var items = document.querySelectorAll('.ph-item');
    if (!items.length) return false;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var oc = item.getAttribute('onclick') || '';
      var isInteractions = 
        oc.indexOf("'interactions'") !== -1 ||
        oc.indexOf('"interactions"') !== -1 ||
        (item.textContent && item.textContent.indexOf('Drug Interactions') !== -1) ||
        (item.textContent && item.textContent.indexOf('التداخلات') !== -1);

      if (isInteractions && !item.dataset.dipBound) {
        item.dataset.dipBound = 'true';
        item.removeAttribute('onclick');
        item.onclick = null;
        item.onmousedown = null;

        item.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          document.querySelectorAll('.ph-item').forEach(function(x) {
            x.classList.remove('active');
          });
          this.classList.add('active');

          try { window.phCurrentPage = 'interactions'; } catch (err) {}

          if (window.innerWidth <= 768) {
            var sb = document.getElementById('phSidebar');
            if (sb) sb.classList.remove('open');
          }

          console.log('[DIP] Click detected — rendering...');
            try {
                if (window.DIP && typeof window.DIP.render === 'function') {
                window.DIP.render();
                console.log('[DIP] ✅ Rendered successfully');
            }
            } catch (err) {
            console.error('[DIP] ❌ render error:', err);
            }
        }, true);

        console.log('[DIP] ✅ Sidebar button bound');
        window.__DIP_BOUND = true;
        return true;
      }
    }
    return false;
  }

  var _bindTries = 0;
  var _bindInterval = setInterval(function() {
    _bindTries++;
    if (bindSidebarButton() || _bindTries > 60) {
      clearInterval(_bindInterval);
      if (!window.__DIP_BOUND) {
        console.warn('[DIP] ⚠️ Could not find Drug Interactions button');
      }
    }
  }, 500);

  try {
    var _obs = new MutationObserver(function() {
      if (!window.__DIP_BOUND) bindSidebarButton();
    });
    _obs.observe(document.body, { childList: true, subtree: true });
  } catch (e) {}

  document.addEventListener('click', function(e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.classList && target.classList.contains('ph-item')) {
        var txt = (target.textContent || '').trim();
        if (txt.indexOf('Drug Interactions') !== -1 || txt.indexOf('التداخلات') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          document.querySelectorAll('.ph-item').forEach(function(x) {
            x.classList.remove('active');
          });
          target.classList.add('active');
          try { window.phCurrentPage = 'interactions'; } catch (err) {}
          try { if (window.DIP && typeof window.DIP.render === 'function') window.DIP.render(); } catch (err) {
            console.error('[DIP]', err);
          }
          return;
        }
      }
      target = target.parentElement;
    }
  }, true);

  /* ============================================
     14. LOAD SAVED PATIENT
     ============================================ */
  try {
    var saved = localStorage.getItem('pc_di_patient');
    if (saved) DIP.patient = JSON.parse(saved);
  } catch (e) {}

  console.log('[DIP v2.0] Drug Interactions Pro loaded ✓');
  console.log('[DIP] Database:', DDI_DB.length, 'interactions');
  console.log('[DIP] Features: Patient profile, AI alternatives, Graph, Learning');

  /* ============================================
     16. FIX: استخدام window.window.window.DIP.render()() في كل الـ routes
     ============================================ */
  setTimeout(function() {
    // override نهائي يشتغل بعد كل الملفات
    var origSwitch = window.phSwitchPage;
    window.phSwitchPage = function(btn, page) {
      if (page === 'interactions') {
        console.log('[DIP-FINAL] phSwitchPage called');
        
        if (btn) {
          document.querySelectorAll('.ph-item').forEach(function(x) {
            x.classList.remove('active');
          });
          btn.classList.add('active');
        }
        
        window.phCurrentPage = 'interactions';
        
        if (window.DIP && typeof window.DIP.render === 'function') {
        window.DIP.render();
        console.log('[DIP-FINAL] ✅ Rendered');
        } else {
        console.error('[DIP-FINAL] ❌ window.DIP not available');
        }
        return;
      }
      return origSwitch ? origSwitch.call(this, btn, page) : undefined;
    };
    
    var origRender = window.phRenderPage;
    window.phRenderPage = function(page) {
      if (page === 'interactions') {
        return window.DIP ? window.window.window.DIP.render()()() : undefined;
      }
      return origRender ? origRender.call(this, page) : undefined;
    };
    
    window.phRenderInteractionsPage = function() {
      return window.DIP ? window.window.window.DIP.render()()() : undefined;
    };
    
    // كمان أعد ربط زر الـ Sidebar
    document.querySelectorAll('.ph-item').forEach(function(item) {
      var t = (item.textContent || '');
      if (t.indexOf('Drug Interactions') !== -1 || t.indexOf('التداخلات') !== -1) {
        // shيل أي listener قديم
        var clone = item.cloneNode(true);
        item.parentNode.replaceChild(clone, item);
        
        clone.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          
          document.querySelectorAll('.ph-item').forEach(function(x) {
            x.classList.remove('active');
          });
          clone.classList.add('active');
          
          try { window.phCurrentPage = 'interactions'; } catch(err) {}
          
          if (window.innerWidth <= 768) {
            var sb = document.getElementById('phSidebar');
            if (sb) sb.classList.remove('open');
          }
          
          if (window.DIP && typeof window.window.window.window.DIP.render()()() === 'function') {
            window.window.window.window.DIP.render()()()();
            console.log('[DIP-FINAL] ✅ Rendered from button');
          } else {
            console.error('[DIP-FINAL] ❌ window.DIP missing');
          }
        });
        
        console.log('[DIP-FINAL] ✅ Sidebar button re-bound');
      }
    });
    
    console.log('[DIP-FINAL] All final patches applied ✓');
  }, 7000); // ← بعد 7 ثواني عشان يشتغل بعد كل الملفات
})();