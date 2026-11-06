/* ============================================
   PHARMACLOUD - OCR AI PRO v4.0
   Word-Level Recognition + Smart Token Classifier
   ============================================ */
'use strict';

(function() {

  var CONFIG = {
    HF_OCR_URL: 'https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten',
    RXNAV_BASE: 'https://rxnav.nlm.nih.gov/REST',
    LEARN_KEY: 'pc_ocr_learning_v4',
    CACHE_KEY: 'pc_ocr_cache_v4'
  };

  // ============================================
  // 1. WORD-LEVEL DICTIONARY
  //    Every word is tagged with a type
  // ============================================
  var WORD_DICT = {
    // ===== Drug category words (English) =====
    'lubricant':       { t: 'drug', cat: 'علاج العيون', ar: 'مرطب' },
    'analgesic':       { t: 'drug', cat: 'مسكن', ar: 'مسكن' },
    'antibiotic':      { t: 'drug', cat: 'مضاد حيوي', ar: 'مضاد حيوي' },
    'antipyretic':     { t: 'drug', cat: 'خافض حرارة', ar: 'خافض حرارة' },
    'antihistamine':   { t: 'drug', cat: 'مضاد حساسية', ar: 'مضاد هيستامين' },
    'antifungal':      { t: 'drug', cat: 'مضاد فطري', ar: 'مضاد فطري' },
    'antiviral':       { t: 'drug', cat: 'مضاد فيروسي', ar: 'مضاد فيروسي' },
    'antiinflammatory':{ t: 'drug', cat: 'مضاد التهاب', ar: 'مضاد التهاب' },
    'anti':            { t: 'drug', cat: '', ar: 'مضاد' },
    'inflammatory':    { t: 'drug', cat: 'التهاب', ar: 'التهاب' },
    'painkiller':      { t: 'drug', cat: 'مسكن', ar: 'مسكن' },
    'corticosteroid':  { t: 'drug', cat: 'كورتيزون', ar: 'كورتيزون' },
    'steroid':         { t: 'drug', cat: 'كورتيزون', ar: 'كورتيزون' },
    'antiseptic':      { t: 'drug', cat: 'مطهر', ar: 'مطهر' },
    'antispasmodic':   { t: 'drug', cat: 'مضاد تشنج', ar: 'مضاد تشنج' },
    'antiemetic':      { t: 'drug', cat: 'مضاد قيء', ar: 'مضاد قيء' },
    'antidiabetic':    { t: 'drug', cat: 'سكري', ar: 'مضاد سكري' },
    'antihypertensive':{ t: 'drug', cat: 'ضغط', ar: 'خافض ضغط' },
    'anticoagulant':   { t: 'drug', cat: 'سيولة', ar: 'مضاد تخثر' },
    'antidepressant':  { t: 'drug', cat: 'اكتئاب', ar: 'مضاد اكتئاب' },
    'diuretic':        { t: 'drug', cat: 'مدر', ar: 'مدر بول' },
    'laxative':        { t: 'drug', cat: 'ملين', ar: 'ملين' },
    'sedative':        { t: 'drug', cat: 'مهدئ', ar: 'مهدئ' },
    'supplement':      { t: 'drug', cat: 'مكمل', ar: 'مكمل' },
    'decongestant':    { t: 'drug', cat: 'احتقان', ar: 'مزيل احتقان' },
    'expectorant':     { t: 'drug', cat: 'كحة', ar: 'طارد بلغم' },
    'bronchodilator':  { t: 'drug', cat: 'ربو', ar: 'موسع شعب' },
    'antacid':         { t: 'drug', cat: 'معدة', ar: 'مضاد حموضة' },
    'nsaid':           { t: 'drug', cat: 'مضاد التهاب', ar: 'مضاد التهاب' },
    'antitussive':     { t: 'drug', cat: 'كحة', ar: 'مهدئ كحة' },
    'anthelmintic':    { t: 'drug', cat: 'ديدان', ar: 'طارد ديدان' },
    'antimalarial':    { t: 'drug', cat: 'ملاريا', ar: 'مضاد ملاريا' },
    'antimigraine':    { t: 'drug', cat: 'صداع', ar: 'مضاد صداع نصفي' },
    'antiparasitic':   { t: 'drug', cat: 'طفيليات', ar: 'مضاد طفيليات' },
    'antithrombotic':  { t: 'drug', cat: 'تخثر', ar: 'مضاد تخثر' },

    // ===== Vitamins & supplements =====
    'vitamin':   { t: 'drug', cat: 'فيتامينات', ar: 'فيتامين' },
    'omega':     { t: 'drug', cat: 'مكملات', ar: 'أوميجا' },
    'multivitamin': { t: 'drug', cat: 'فيتامينات', ar: 'مالتي فيتامين' },
    'calcium':   { t: 'drug', cat: 'فيتامينات', ar: 'كالسيوم' },
    'iron':      { t: 'drug', cat: 'فيتامينات', ar: 'حديد' },
    'zinc':      { t: 'drug', cat: 'فيتامينات', ar: 'زنك' },
    'magnesium': { t: 'drug', cat: 'فيتامينات', ar: 'ماغنيسيوم' },
    'potassium': { t: 'drug', cat: 'فيتامينات', ar: 'بوتاسيوم' },
    'folic':     { t: 'drug', cat: 'فيتامينات', ar: 'فوليك' },
    'biotin':    { t: 'drug', cat: 'فيتامينات', ar: 'بيوتين' },
    'collagen':  { t: 'drug', cat: 'مكملات', ar: 'كولاجين' },

    // ===== Target/Context words =====
    'eye':     { t: 'target', cat: 'عين', ar: 'عين' },
    'ocular':  { t: 'target', cat: 'عين', ar: 'عين' },
    'ear':     { t: 'target', cat: 'أذن', ar: 'أذن' },
    'otic':    { t: 'target', cat: 'أذن', ar: 'أذن' },
    'nasal':   { t: 'target', cat: 'أنف', ar: 'أنف' },
    'nose':    { t: 'target', cat: 'أنف', ar: 'أنف' },
    'oral':    { t: 'target', cat: 'فم', ar: 'فم' },
    'mouth':   { t: 'target', cat: 'فم', ar: 'فم' },
    'topical': { t: 'target', cat: 'موضعي', ar: 'موضعي' },
    'skin':    { t: 'target', cat: 'جلد', ar: 'جلد' },
    'child':   { t: 'target', cat: 'أطفال', ar: 'أطفال' },
    'children':{ t: 'target', cat: 'أطفال', ar: 'أطفال' },
    'kids':    { t: 'target', cat: 'أطفال', ar: 'أطفال' },
    'infant':  { t: 'target', cat: 'رضع', ar: 'رضع' },
    'baby':    { t: 'target', cat: 'رضع', ar: 'رضع' },
    'adult':   { t: 'target', cat: 'بالغين', ar: 'بالغين' },
    'gum':     { t: 'target', cat: 'لثة', ar: 'لثة' },
    'dental':  { t: 'target', cat: 'أسنان', ar: 'أسنان' },
    'tooth':   { t: 'target', cat: 'أسنان', ar: 'سن' },
    'teeth':   { t: 'target', cat: 'أسنان', ar: 'أسنان' },
    'hair':    { t: 'target', cat: 'شعر', ar: 'شعر' },
    'scalp':   { t: 'target', cat: 'فروة', ar: 'فروة' },
    'face':    { t: 'target', cat: 'وجه', ar: 'وجه' },
    'body':    { t: 'target', cat: 'جسم', ar: 'جسم' },
    'hand':    { t: 'target', cat: 'يد', ar: 'يد' },
    'foot':    { t: 'target', cat: 'قدم', ar: 'قدم' },
    'muscle':  { t: 'target', cat: 'عضلات', ar: 'عضلات' },
    'joint':   { t: 'target', cat: 'مفاصل', ar: 'مفاصل' },
    'bone':    { t: 'target', cat: 'عظام', ar: 'عظام' },
    'stomach': { t: 'target', cat: 'معدة', ar: 'معدة' },
    'gastric': { t: 'target', cat: 'معدة', ar: 'معدة' },
    'intestine':{ t: 'target', cat: 'أمعاء', ar: 'أمعاء' },
    'liver':   { t: 'target', cat: 'كبد', ar: 'كبد' },
    'kidney':  { t: 'target', cat: 'كلى', ar: 'كلى' },
    'heart':   { t: 'target', cat: 'قلب', ar: 'قلب' },
    'lung':    { t: 'target', cat: 'رئة', ar: 'رئة' },
    'throat':  { t: 'target', cat: 'حلق', ar: 'حلق' },
    'vaginal': { t: 'target', cat: 'مهبلي', ar: 'مهبلي' },
    'rectal':  { t: 'target', cat: 'شرجي', ar: 'شرجي' },

    // ===== Form words =====
    'drops':     { t: 'form', cat: 'قطرة', ar: 'قطرة' },
    'drop':      { t: 'form', cat: 'قطرة', ar: 'قطرة' },
    'tablet':    { t: 'form', cat: 'قرص', ar: 'قرص' },
    'tab':       { t: 'form', cat: 'قرص', ar: 'قرص' },
    'tabs':      { t: 'form', cat: 'أقراص', ar: 'أقراص' },
    'capsule':   { t: 'form', cat: 'كبسولة', ar: 'كبسولة' },
    'cap':       { t: 'form', cat: 'كبسولة', ar: 'كبسولة' },
    'caps':      { t: 'form', cat: 'كبسولات', ar: 'كبسولات' },
    'pill':      { t: 'form', cat: 'حبوب', ar: 'حبوب' },
    'syrup':     { t: 'form', cat: 'شراب', ar: 'شراب' },
    'suspension':{ t: 'form', cat: 'معلق', ar: 'معلق' },
    'susp':      { t: 'form', cat: 'معلق', ar: 'معلق' },
    'solution':  { t: 'form', cat: 'محلول', ar: 'محلول' },
    'sol':       { t: 'form', cat: 'محلول', ar: 'محلول' },
    'ointment':  { t: 'form', cat: 'مرهم', ar: 'مرهم' },
    'oint':      { t: 'form', cat: 'مرهم', ar: 'مرهم' },
    'cream':     { t: 'form', cat: 'كريم', ar: 'كريم' },
    'gel':       { t: 'form', cat: 'جل', ar: 'جل' },
    'lotion':    { t: 'form', cat: 'لوشن', ar: 'لوشن' },
    'spray':     { t: 'form', cat: 'بخاخ', ar: 'بخاخ' },
    'inhaler':   { t: 'form', cat: 'بخاخ', ar: 'بخاخ' },
    'sachet':    { t: 'form', cat: 'أكياس', ar: 'أكياس' },
    'suppository':{ t: 'form', cat: 'لبوس', ar: 'لبوس' },
    'supp':      { t: 'form', cat: 'لبوس', ar: 'لبوس' },
    'vial':      { t: 'form', cat: 'أمبول', ar: 'أمبول' },
    'ampoule':   { t: 'form', cat: 'أمبول', ar: 'أمبول' },
    'injection': { t: 'form', cat: 'حقن', ar: 'حقن' },
    'inj':       { t: 'form', cat: 'حقن', ar: 'حقن' },
    'injectable':{ t: 'form', cat: 'حقن', ar: 'حقن' },
    'patch':     { t: 'form', cat: 'لاصقة', ar: 'لاصقة' },
    'gummy':     { t: 'form', cat: 'جيلي', ar: 'جيلي' },
    'gummies':   { t: 'form', cat: 'جيلي', ar: 'جيلي' },
    'shampoo':   { t: 'form', cat: 'شامبو', ar: 'شامبو' },
    'foam':      { t: 'form', cat: 'فوم', ar: 'فوم' },
    'powder':    { t: 'form', cat: 'مسحوق', ar: 'مسحوق' },
    'syringe':   { t: 'form', cat: 'سرنجة', ar: 'سرنجة' },
    'food':      { t: 'form', cat: 'غذائي', ar: 'غذائي' },

    // ===== Strength/Form abbreviations =====
    'forte':    { t: 'qualifier', cat: '', ar: 'قوي' },
    'junior':   { t: 'qualifier', cat: 'أطفال', ar: 'جونيور' },
    'plus':     { t: 'qualifier', cat: '', ar: 'بلس' },
    'max':      { t: 'qualifier', cat: '', ar: 'ماكس' },
    'advance':  { t: 'qualifier', cat: '', ar: 'متقدم' },
    'extra':    { t: 'qualifier', cat: '', ar: 'إكسترا' },
    'sugar':    { t: 'qualifier', cat: '', ar: 'سكر' },
    'free':     { t: 'qualifier', cat: '', ar: 'خالي' },

    // ===== Arabic words (drug-related) =====
    'مرطب':     { t: 'drug', cat: 'ترطيب', ar: 'مرطب' },
    'مسكن':     { t: 'drug', cat: 'مسكن', ar: 'مسكن' },
    'مضاد':     { t: 'drug', cat: 'مضاد', ar: 'مضاد' },
    'حيوي':     { t: 'drug', cat: 'حيوي', ar: 'حيوي' },
    'حرارة':    { t: 'drug', cat: 'حرارة', ar: 'حرارة' },
    'حساسية':   { t: 'drug', cat: 'حساسية', ar: 'حساسية' },
    'التهاب':   { t: 'drug', cat: 'التهاب', ar: 'التهاب' },
    'فطري':     { t: 'drug', cat: 'فطري', ar: 'فطري' },
    'فيروسي':   { t: 'drug', cat: 'فيروسي', ar: 'فيروسي' },
    'مطهر':     { t: 'drug', cat: 'مطهر', ar: 'مطهر' },
    'فيتامين':  { t: 'drug', cat: 'فيتامينات', ar: 'فيتامين' },
    'كالسيوم':  { t: 'drug', cat: 'فيتامينات', ar: 'كالسيوم' },
    'حديد':     { t: 'drug', cat: 'فيتامينات', ar: 'حديد' },
    'زنك':      { t: 'drug', cat: 'فيتامينات', ar: 'زنك' },
    'أوميجا':   { t: 'drug', cat: 'مكملات', ar: 'أوميجا' },
    'اوميجا':   { t: 'drug', cat: 'مكملات', ar: 'أوميجا' },
    'كولاجين':  { t: 'drug', cat: 'مكملات', ar: 'كولاجين' },
    'بروبيوتيك':{ t: 'drug', cat: 'مكملات', ar: 'بروبيوتيك' },
    'كحة':      { t: 'drug', cat: 'كحة', ar: 'كحة' },
    'برد':      { t: 'drug', cat: 'برد', ar: 'برد' },
    'زكام':     { t: 'drug', cat: 'زكام', ar: 'زكام' },
    'أنفلونزا': { t: 'drug', cat: 'أنفلونزا', ar: 'أنفلونزا' },

    // Arabic targets
    'عين':     { t: 'target', cat: 'عين', ar: 'عين' },
    'عيون':    { t: 'target', cat: 'عين', ar: 'عيون' },
    'أذن':     { t: 'target', cat: 'أذن', ar: 'أذن' },
    'اذن':     { t: 'target', cat: 'أذن', ar: 'أذن' },
    'أنف':     { t: 'target', cat: 'أنف', ar: 'أنف' },
    'انف':     { t: 'target', cat: 'أنف', ar: 'أنف' },
    'فم':      { t: 'target', cat: 'فم', ar: 'فم' },
    'أسنان':   { t: 'target', cat: 'أسنان', ar: 'أسنان' },
    'اسنان':   { t: 'target', cat: 'أسنان', ar: 'أسنان' },
    'جلد':     { t: 'target', cat: 'جلد', ar: 'جلد' },
    'شعر':     { t: 'target', cat: 'شعر', ar: 'شعر' },
    'فروة':    { t: 'target', cat: 'فروة', ar: 'فروة' },
    'وجه':     { t: 'target', cat: 'وجه', ar: 'وجه' },
    'يد':      { t: 'target', cat: 'يد', ar: 'يد' },
    'قدم':     { t: 'target', cat: 'قدم', ar: 'قدم' },
    'معدة':    { t: 'target', cat: 'معدة', ar: 'معدة' },
    'كبد':     { t: 'target', cat: 'كبد', ar: 'كبد' },
    'كلى':     { t: 'target', cat: 'كلى', ar: 'كلى' },
    'قلب':     { t: 'target', cat: 'قلب', ar: 'قلب' },
    'رئة':     { t: 'target', cat: 'رئة', ar: 'رئة' },
    'حلق':     { t: 'target', cat: 'حلق', ar: 'حلق' },
    'أطفال':   { t: 'target', cat: 'أطفال', ar: 'أطفال' },
    'اطفال':   { t: 'target', cat: 'أطفال', ar: 'أطفال' },
    'رضع':     { t: 'target', cat: 'رضع', ar: 'رضع' },

    // Arabic forms
    'قطرة':    { t: 'form', cat: 'قطرة', ar: 'قطرة' },
    'قطره':    { t: 'form', cat: 'قطرة', ar: 'قطرة' },
    'نقط':     { t: 'form', cat: 'قطرة', ar: 'قطرة' },
    'مرهم':    { t: 'form', cat: 'مرهم', ar: 'مرهم' },
    'كريم':    { t: 'form', cat: 'كريم', ar: 'كريم' },
    'قرص':     { t: 'form', cat: 'قرص', ar: 'قرص' },
    'أقراص':   { t: 'form', cat: 'أقراص', ar: 'أقراص' },
    'اقراص':   { t: 'form', cat: 'أقراص', ar: 'أقراص' },
    'كبسولة':  { t: 'form', cat: 'كبسولة', ar: 'كبسولة' },
    'كبسوله':  { t: 'form', cat: 'كبسولة', ar: 'كبسولة' },
    'شراب':    { t: 'form', cat: 'شراب', ar: 'شراب' },
    'لبوس':    { t: 'form', cat: 'لبوس', ar: 'لبوس' },
    'بخاخ':    { t: 'form', cat: 'بخاخ', ar: 'بخاخ' },
    'حقن':     { t: 'form', cat: 'حقن', ar: 'حقن' },
    'أمبول':   { t: 'form', cat: 'أمبول', ar: 'أمبول' },
    'امبول':   { t: 'form', cat: 'أمبول', ar: 'أمبول' },
    'لوشن':    { t: 'form', cat: 'لوشن', ar: 'لوشن' },
    'جل':      { t: 'form', cat: 'جل', ar: 'جل' },
    'شامبو':   { t: 'form', cat: 'شامبو', ar: 'شامبو' },
    'بودرة':   { t: 'form', cat: 'بودرة', ar: 'بودرة' },
    'مسحوق':   { t: 'form', cat: 'مسحوق', ar: 'مسحوق' },
    'لاصقة':   { t: 'form', cat: 'لاصقة', ar: 'لاصقة' },
    'لاصقه':   { t: 'form', cat: 'لاصقة', ar: 'لاصقة' },
    'فوار':    { t: 'form', cat: 'فوار', ar: 'فوار' }
  };

  // ============================================
  // 2. INSTRUCTION WORDS (dropped during processing)
  // ============================================
  var INSTRUCTION_WORDS = {
    // English
    'daily': 1, 'weekly': 1, 'monthly': 1, 'yearly': 1,
    'times': 1, 'time': 1, 'once': 1, 'twice': 1, 'thrice': 1,
    'day': 1, 'days': 1, 'week': 1, 'weeks': 1, 'month': 1, 'months': 1, 'year': 1,
    'morning': 1, 'evening': 1, 'night': 1, 'noon': 1, 'midnight': 1,
    'before': 1, 'after': 1, 'with': 1, 'without': 1, 'between': 1,
    'meal': 1, 'meals': 1, 'food': 1, 'eating': 1, 'breakfast': 1, 'lunch': 1, 'dinner': 1,
    'continue': 1, 'stop': 1, 'use': 1, 'take': 1, 'apply': 1, 'give': 1,
    'as': 1, 'needed': 1, 'required': 1, 'for': 1, 'to': 1, 'of': 1, 'the': 1,
    'every': 1, 'each': 1, 'and': 1, 'or': 1, 'a': 1, 'an': 1,
    'if': 1, 'when': 1, 'until': 1, 'then': 1, 'up': 1, 'down': 1,
    'patient': 1, 'doctor': 1, 'clinic': 1, 'hospital': 1, 'prescription': 1,
    'diagnosis': 1, 'treatment': 1, 'name': 1, 'age': 1, 'date': 1,
    'signature': 1, 'phone': 1, 'address': 1, 'note': 1, 'notes': 1,
    'instruction': 1, 'instructions': 1, 'dose': 1, 'dosage': 1, 'amount': 1,
    'number': 1, 'no': 1, 'yes': 1, 'not': 1,
    'please': 1, 'may': 1, 'can': 1, 'should': 1, 'must': 1, 'will': 1,
    'alternate': 1, 'alternately': 1, 'alternating': 1,
    'break': 1, 'short': 1, 'long': 1, 'term': 1, 'days': 1,

    // Arabic
    'مرة': 1, 'مره': 1, 'مرتين': 1, 'مرّتين': 1,
    'ثلاث': 1, 'ثلاثة': 1, 'ثلاثه': 1, 'أربع': 1, 'أربعة': 1, 'اربع': 1,
    'خمس': 1, 'خمسة': 1, 'ست': 1, 'سبع': 1, 'ثماني': 1, 'تسع': 1, 'عشر': 1,
    'يوم': 1, 'يومي': 1, 'يوميا': 1, 'يومياً': 1, 'اليوم': 1,
    'أسبوع': 1, 'اسبوع': 1, 'أسبوعي': 1, 'أسبوعيا': 1, 'أسبوعياً': 1, 'الاسبوع': 1,
    'شهر': 1, 'شهري': 1, 'شهريا': 1, 'شهرياً': 1, 'الشهر': 1,
    'سنة': 1, 'سنوي': 1, 'سنويا': 1, 'السنة': 1,
    'صباح': 1, 'صباحا': 1, 'صباحاً': 1, 'الصباح': 1,
    'مساء': 1, 'مساءً': 1, 'المساء': 1,
    'ليل': 1, 'ليلا': 1, 'ليلاً': 1, 'الليل': 1,
    'ظهر': 1, 'ظهرا': 1, 'الظهر': 1, 'عصر': 1, 'العصر': 1, 'فجر': 1, 'الفجر': 1,
    'بعد': 1, 'قبل': 1, 'مع': 1, 'بدون': 1, 'بين': 1, 'على': 1, 'في': 1, 'من': 1, 'إلى': 1, 'الى': 1,
    'الأكل': 1, 'الاكل': 1, 'أكل': 1, 'اكل': 1, 'الطعام': 1, 'طعام': 1,
    'الوجبات': 1, 'الوجبة': 1, 'وجبة': 1,
    'الإفطار': 1, 'الافطار': 1, 'الغداء': 1, 'العشاء': 1, 'السحور': 1,
    'استمر': 1, 'استمرار': 1, 'استخدام': 1, 'استعمل': 1, 'استعملها': 1,
    'لمدة': 1, 'خلال': 1, 'خلال': 1, 'مدة': 1,
    'كل': 1, 'كلها': 1, 'كله': 1, 'كليا': 1,
    'مرات': 1, 'مرّات': 1, 'وقت': 1, 'وقتاً': 1,
    'أيام': 1, 'ايام': 1, 'أسابيع': 1, 'اسابيع': 1, 'شهور': 1, 'أشهر': 1, 'اشهر': 1,
    'مريض': 1, 'المريض': 1, 'دكتور': 1, 'الدكتور': 1, 'طبيب': 1, 'الطبيب': 1,
    'عيادة': 1, 'العيادة': 1, 'مستشفى': 1, 'المستشفى': 1,
    'تشخيص': 1, 'التشخيص': 1, 'علاج': 1, 'العلاج': 1,
    'اسم': 1, 'الاسم': 1, 'عمر': 1, 'العمر': 1, 'سن': 1, 'السن': 1,
    'تاريخ': 1, 'التاريخ': 1, 'هاتف': 1, 'الهاتف': 1, 'عنوان': 1, 'العنوان': 1,
    'ملاحظة': 1, 'ملاحظات': 1, 'الملاحظات': 1, 'توقيع': 1, 'التوقيع': 1,
    'دواء': 1, 'الدواء': 1, 'أدوية': 1, 'الجرعة': 1, 'جرعة': 1,
    'تعليمات': 1, 'التعليمات': 1, 'إرشادات': 1,
    'أو': 1, 'و': 1, 'في': 1, 'عن': 1, 'هذا': 1, 'هذه': 1,
    'اذا': 1, 'إذا': 1, 'عند': 1, 'حتى': 1, 'ثم': 1,
    'فقط': 1, 'أيضا': 1, 'أيضاً': 1, 'ايضا': 1, 'أيضًا': 1,
    'راجع': 1, 'ارجع': 1, 'اتبع': 1, 'التعليمات': 1
  };

  // ============================================
  // 3. DOSAGE & STRENGTH REGEX
  // ============================================
  var DOSAGE_REGEX = /\b\d+\s*(?:mg|mcg|g|ml|iu|%|mEq|mg\/ml|mg\/dl|mcg\/ml|iu\/ml|مل|مجم|مج|جم|ملجم|ميكروجرام)\b/gi;
  var FREQUENCY_REGEX = /\b\d+\s*(?:x|times?|مرة|مرات|مرّات)\b/gi;
  var NUMERIC_ONLY_REGEX = /^\d+([\.\-\/]\d+)?$/;
  var DURATION_REGEX = /\b\d+\s*(?:days?|weeks?|months?|years?|أيام?|أسابيع?|شهور?|أشهر?|سنوات?|سنة?)\b/gi;

  // ============================================
  // 4. TOKENIZE + CLASSIFY
  // ============================================
  function normalizeWord(w) {
    return String(w || '')
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\u0600-\u06FF]/g, '')
      .trim();
  }

  function classifyToken(token) {
    var raw = token.trim();
    var norm = normalizeWord(raw);
    
    if (!norm || norm.length < 2) return null;
    
    // Skip dosages
    if (NUMERIC_ONLY_REGEX.test(raw)) return { type: 'numeric', raw: raw, norm: norm };
    if (DOSAGE_REGEX.test(raw)) return { type: 'dosage', raw: raw, norm: norm };
    
    // Skip frequency patterns
    if (FREQUENCY_REGEX.test(raw)) return { type: 'freq', raw: raw, norm: norm };
    if (DURATION_REGEX.test(raw)) return { type: 'duration', raw: raw, norm: norm };
    
    // Instruction word?
    if (INSTRUCTION_WORDS[norm]) return { type: 'instruction', raw: raw, norm: norm };
    
    // Dictionary lookup (try exact norm first)
    if (WORD_DICT[norm]) {
      var e = WORD_DICT[norm];
      return { type: e.t, raw: raw, norm: norm, cat: e.cat, ar: e.ar, dictKey: norm };
    }
    
    // Try original (for English words like "anti-inflammatory")
    var lower = raw.toLowerCase().replace(/[^\w\-]/g, '');
    if (WORD_DICT[lower]) {
      var e2 = WORD_DICT[lower];
      return { type: e2.t, raw: raw, norm: norm, cat: e2.cat, ar: e2.ar, dictKey: lower };
    }
    
    // Unknown word — keep for RxNorm later
    return { type: 'unknown', raw: raw, norm: norm };
  }

  function tokenizeLine(line) {
    // Split on spaces and punctuation but keep hyphenated words
    var tokens = line.split(/\s+|[،,;\(\)\[\]]+/).filter(function(t) { return t && t.trim().length > 0; });
    var classified = [];
    for (var i = 0; i < tokens.length; i++) {
      var c = classifyToken(tokens[i]);
      if (c) classified.push(c);
    }
    return classified;
  }

  // ============================================
  // 5. BUILD DRUG PHRASES FROM LINE
  //    Keeps only drug/target/form/qualifier/unknown tokens
  //    Groups consecutive ones into a phrase
  // ============================================
  function buildDrugPhrases(line) {
    var tokens = tokenizeLine(line);
    var phrases = [];
    var current = [];
    var currentTypes = [];
    
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      
      // These token types are part of a drug phrase
      if (t.type === 'drug' || t.type === 'target' || t.type === 'form' ||
          t.type === 'qualifier' || t.type === 'unknown') {
        current.push(t);
        currentTypes.push(t.type);
      } else {
        // Break phrase on numeric/dosage/instruction/freq/duration
        if (current.length > 0) {
          // Require at least ONE drug-ish word (not just unknown)
          var hasDrug = currentTypes.some(function(x) { return x === 'drug'; });
          var hasTarget = currentTypes.some(function(x) { return x === 'target'; });
          var hasForm = currentTypes.some(function(x) { return x === 'form'; });
          
          if (hasDrug || (hasTarget && hasForm) || (hasDrug && hasForm)) {
            phrases.push(assemblePhrase(current));
          }
          current = [];
          currentTypes = [];
        }
      }
    }
    
    // Flush last
    if (current.length > 0) {
      var hasDrug2 = currentTypes.some(function(x) { return x === 'drug'; });
      var hasTarget2 = currentTypes.some(function(x) { return x === 'target'; });
      var hasForm2 = currentTypes.some(function(x) { return x === 'form'; });
      if (hasDrug2 || (hasTarget2 && hasForm2)) {
        phrases.push(assemblePhrase(current));
      }
    }
    
    return phrases;
  }

  function assemblePhrase(tokens) {
    var words = tokens.map(function(t) { return t.raw; });
    var cats = tokens.map(function(t) { return t.cat; }).filter(Boolean);
    var arWords = tokens.map(function(t) { return t.ar || t.raw; });
    
    // Determine the best category (prioritize drug categories)
    var drugCats = tokens.filter(function(t) { return t.type === 'drug' && t.cat; }).map(function(t) { return t.cat; });
    var targetCats = tokens.filter(function(t) { return t.type === 'target' && t.cat; }).map(function(t) { return t.cat; });
    var formCats = tokens.filter(function(t) { return t.type === 'form' && t.cat; }).map(function(t) { return t.cat; });
    
    var category = (drugCats[0] || targetCats[0] || formCats[0] || '');
    var form = formCats[0] || '';
    
    // Build Arabic display name
    var arName = arWords.filter(function(w) { return w; }).join(' ');
    
    return {
      tokens: tokens,
      words: words,
      english: words.join(' '),
      arabic: arName,
      category: category,
      form: form,
      wordCount: words.length,
      // Individual words for partial matching
      wordList: words.map(function(w) { return normalizeWord(w); }).filter(Boolean)
    };
  }

  // ============================================
  // 6. PARTIAL MATCHING — Word-level index
  //    If dict knows "Lubricant Eye Drops", then:
  //    - "Lubricant Eye" matches (subset)
  //    - "Lubricant" matches (subset)
  //    - "Eye Drops" matches (subset)
  //    - "Lubricant Drops" matches (subset)
  // ============================================
  
  // Build reverse index: single word → set of multi-word dictionary keys containing it
  var WORD_INDEX = (function() {
    var index = {};
    // For each dictionary entry that's a multi-word phrase... 
    // Wait, our dictionary is single-word only. So we handle this differently.
    // Instead: we build composite phrases on-the-fly from tokens.
    return index;
  })();

  // Known composite phrases (to prioritize full matches)
  var COMPOSITE_PHRASES = {
    'lubricant eye drops': { ar: 'قطرة مرطبة للعين', cat: 'علاج العيون', form: 'قطرة' },
    'lubricant eye drop':  { ar: 'قطرة مرطبة للعين', cat: 'علاج العيون', form: 'قطرة' },
    'lubricant eye':       { ar: 'مرطب للعين', cat: 'علاج العيون', form: '' },
    'eye drops':           { ar: 'قطرة للعين', cat: 'علاج العيون', form: 'قطرة' },
    'eye drop':            { ar: 'قطرة للعين', cat: 'علاج العيون', form: 'قطرة' },
    'eye ointment':        { ar: 'مرهم للعين', cat: 'علاج العيون', form: 'مرهم' },
    'ear drops':           { ar: 'قطرة للأذن', cat: 'علاج الأذن', form: 'قطرة' },
    'ear drop':            { ar: 'قطرة للأذن', cat: 'علاج الأذن', form: 'قطرة' },
    'antibiotic eye drops':  { ar: 'قطرة مضاد حيوي للعين', cat: 'مضاد حيوي', form: 'قطرة' },
    'antibiotic eye ointment':{ ar: 'مرهم مضاد حيوي للعين', cat: 'مضاد حيوي', form: 'مرهم' },
    'antibiotic drops':      { ar: 'قطرة مضاد حيوي', cat: 'مضاد حيوي', form: 'قطرة' },
    'antibiotic ointment':   { ar: 'مرهم مضاد حيوي', cat: 'مضاد حيوي', form: 'مرهم' },
    'antibiotic cream':      { ar: 'كريم مضاد حيوي', cat: 'مضاد حيوي', form: 'كريم' },
    'analgesic drug':        { ar: 'دواء مسكن', cat: 'مسكن', form: '' },
    'analgesic tablet':      { ar: 'قرص مسكن', cat: 'مسكن', form: 'قرص' },
    'analgesic tab':         { ar: 'قرص مسكن', cat: 'مسكن', form: 'قرص' },
    'analgesic':             { ar: 'مسكن', cat: 'مسكن', form: '' },
    'child omega gummy':     { ar: 'أوميجا جيلي للأطفال', cat: 'مكملات أطفال', form: 'جيلي' },
    'child omega':           { ar: 'أوميجا للأطفال', cat: 'مكملات أطفال', form: '' },
    'omega gummy':           { ar: 'أوميجا جيلي', cat: 'مكملات أطفال', form: 'جيلي' },
    'omega 3':               { ar: 'أوميجا 3', cat: 'مكملات غذائية', form: '' },
    'vitamin d':             { ar: 'فيتامين د', cat: 'فيتامينات', form: '' },
    'vitamin c':             { ar: 'فيتامين سي', cat: 'فيتامينات', form: '' },
    'vitamin b':             { ar: 'فيتامين ب', cat: 'فيتامينات', form: '' },
    'anti inflammatory':     { ar: 'مضاد التهاب', cat: 'مضاد التهاب', form: '' },
    'cough syrup':           { ar: 'شراب كحة', cat: 'كحة', form: 'شراب' },
    'nasal spray':           { ar: 'بخاخ أنف', cat: 'احتقان', form: 'بخاخ' },
    'nasal drops':           { ar: 'قطرة أنف', cat: 'احتقان', form: 'قطرة' },
    'oral drops':            { ar: 'قطرة فموية', cat: 'قطرة', form: 'قطرة' },
    'topical cream':         { ar: 'كريم موضعي', cat: 'موضعي', form: 'كريم' },
    'topical gel':           { ar: 'جل موضعي', cat: 'موضعي', form: 'جل' },
    'topical ointment':      { ar: 'مرهم موضعي', cat: 'موضعي', form: 'مرهم' },
    'pain relief':           { ar: 'مسكن للألم', cat: 'مسكن', form: '' },
    'muscle relaxant':       { ar: 'مرخي عضلات', cat: 'عضلات', form: '' }
  };

  function findBestPhraseMatch(phrase) {
    var words = phrase.wordList;
    if (!words.length) return null;
    
    var joined = words.join(' ');
    var joinedNoPunct = joined.replace(/[^\w\s]/g, '').trim();
    
    // 1) Try exact composite match
    if (COMPOSITE_PHRASES[joinedNoPunct]) {
      var c = COMPOSITE_PHRASES[joinedNoPunct];
      return {
        source: 'composite-exact',
        name: c.ar,
        english: joined,
        category: c.cat,
        form: c.form,
        confidence: 'high'
      };
    }
    
    // 2) Try progressive subsets (longest first)
    //    e.g. "lubricant eye drops extra" → try "lubricant eye drops", "lubricant eye", "lubricant", etc.
    var maxN = Math.min(words.length, 5);
    for (var n = maxN; n >= 1; n--) {
      for (var start = 0; start + n <= words.length; start++) {
        var subWords = words.slice(start, start + n);
        var subKey = subWords.join(' ');
        if (COMPOSITE_PHRASES[subKey]) {
          var cc = COMPOSITE_PHRASES[subKey];
          return {
            source: 'composite-subset',
            name: cc.ar,
            english: subWords.join(' '),
            category: cc.cat,
            form: cc.form,
            confidence: n === words.length ? 'high' : 'medium',
            matchedSubset: subWords
          };
        }
      }
    }
    
    // 3) Single word fallback — build from tokens
    var drugToken = phrase.tokens.find(function(t) { return t.type === 'drug'; });
    var targetToken = phrase.tokens.find(function(t) { return t.type === 'target'; });
    var formToken = phrase.tokens.find(function(t) { return t.type === 'form'; });
    
    if (drugToken || (targetToken && formToken)) {
      var parts = [];
      if (drugToken && drugToken.ar) parts.push(drugToken.ar);
      if (targetToken && targetToken.ar) parts.push(targetToken.ar);
      if (formToken && formToken.ar) parts.push(formToken.ar);
      
      return {
        source: 'token-assembled',
        name: parts.join(' '),
        english: phrase.english,
        category: (drugToken && drugToken.cat) || (targetToken && targetToken.cat) || (formToken && formToken.cat) || '',
        form: (formToken && formToken.ar) || '',
        confidence: 'medium'
      };
    }
    
    // 4) Unknown — return null (will go to RxNorm)
    return null;
  }

  // ============================================
  // 7. EXTRACT DRUGS FROM FULL TEXT
  // ============================================
  function extractDrugsFromText(text) {
    if (!text) return [];
    
    // Split into lines
    var lines = text.split(/\n+/).map(function(l) { return l.trim(); }).filter(Boolean);
    
    var allPhrases = [];
    for (var i = 0; i < lines.length; i++) {
      var phrases = buildDrugPhrases(lines[i]);
      for (var j = 0; j < phrases.length; j++) {
        allPhrases.push(phrases[j]);
      }
    }
    
    // Match each phrase
    var results = [];
    var seen = {};
    
    for (var k = 0; k < allPhrases.length; k++) {
      var p = allPhrases[k];
      var match = findBestPhraseMatch(p);
      
      var key = (match ? match.name : p.english).toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      
      if (match) {
        results.push({
          display: match.name,
          english: match.english,
          category: match.category,
          form: match.form,
          source: match.source,
          confidence: match.confidence,
          raw: p.english,
          tokens: p.tokens
        });
      } else {
        // Unknown phrase — keep raw for RxNorm
        results.push({
          display: p.english,
          english: p.english,
          category: '',
          form: p.form || '',
          source: 'unknown',
          confidence: 'low',
          raw: p.english,
          tokens: p.tokens
        });
      }
    }
    
    return results;
  }

  // ============================================
  // 8. RxNorm verify (only for unknown phrases)
  // ============================================
  async function verifyWithRxNorm(phrase) {
    var name = phrase.english || phrase.display;
    if (!name || name.length < 3) return phrase;
    
    try {
      var res = await fetch(CONFIG.RXNAV_BASE + '/rxcui.json?name=' + encodeURIComponent(name));
      if (!res.ok) return phrase;
      var data = await res.json();
      var rxcui = data.idGroup && data.idGroup.rxnormId && data.idGroup.rxnormId[0];
      if (rxcui) {
        var propRes = await fetch(CONFIG.RXNAV_BASE + '/rxcui/' + rxcui + '/properties.json');
        if (propRes.ok) {
          var props = await propRes.json();
          var p = props.properties || {};
          phrase.rxcui = rxcui;
          phrase.verified = true;
          phrase.generic = p.name || '';
          return phrase;
        }
      }
    } catch (e) { /* silent */ }
    return phrase;
  }

  // ============================================
  // 9. INVENTORY MATCH (fuzzy, word-level)
  // ============================================
  function matchInventory(phrase, products) {
    if (!products || !products.length) return null;
    
    var searchWords = (phrase.english + ' ' + (phrase.display || '') + ' ' + (phrase.generic || ''))
      .toLowerCase().split(/\s+/).filter(function(w) { return w.length >= 3; });
    
    if (!searchWords.length) return null;
    
    var best = null, bestScore = 0;
    
    for (var i = 0; i < products.length; i++) {
      var p = products[i];
      var pn = (p.name || '').toLowerCase();
      var pa = (p.active || '').toLowerCase();
      var pc = (p.category || '').toLowerCase();
      var score = 0;
      
      // Word overlap scoring
      for (var w = 0; w < searchWords.length; w++) {
        var word = searchWords[w];
        if (pn.indexOf(word) !== -1) score += 10;
        if (pa.indexOf(word) !== -1) score += 8;
      }
      
      // Category boost
      if (phrase.category && pc && pc.indexOf(phrase.category.toLowerCase()) !== -1) score += 5;
      
      if (score > bestScore && score >= 10) {
        bestScore = score;
        best = p;
      }
    }
    
    return best;
  }

  // ============================================
  // 10. INTERACTIONS (local + RxNorm DDI)
  // ============================================
  async function checkInteractions(drugs) {
    var results = [];
    
    // Local first
    if (typeof DrugDB !== 'undefined' && DrugDB.checkInteractions) {
      var fakeItems = drugs.map(function(d, i) {
        return { id: 'i_' + i, name: d.display, active: d.generic || d.display };
      });
      var local = DrugDB.checkInteractions(fakeItems, null) || [];
      local.forEach(function(l) {
        results.push({
          drugA: l.involved[0].name,
          drugB: l.involved[1].name,
          severity: l.severity,
          description: l.desc,
          source: 'local'
        });
      });
    }
    
    // RxNorm DDI (only for verified drugs)
    var verified = drugs.filter(function(d) { return d.rxcui; });
    for (var i = 0; i < verified.length; i++) {
      for (var j = i + 1; j < verified.length; j++) {
        try {
          var res = await fetch(CONFIG.RXNAV_BASE + '/interaction/interaction.json?rxcui=' + verified[i].rxcui);
          if (!res.ok) continue;
          var data = await res.json();
          var groups = data.interactionTypeGroup || [];
          groups.forEach(function(g) {
            (g.interactionType || []).forEach(function(t) {
              (t.interactionPair || []).forEach(function(pair) {
                var concepts = pair.interactionConcept || [];
                var hasB = concepts.some(function(c) {
                  var nm = (c.minConceptItem && c.minConceptItem.name || '').toLowerCase();
                  var target = verified[j].generic || verified[j].display;
                  return nm.indexOf(target.toLowerCase().split(' ')[0]) !== -1;
                });
                if (hasB) {
                  var exists = results.some(function(r) {
                    return (r.drugA === verified[i].display && r.drugB === verified[j].display);
                  });
                  if (!exists) {
                    results.push({
                      drugA: verified[i].display,
                      drugB: verified[j].display,
                      severity: pair.severity || 'medium',
                      description: pair.description || '',
                      source: 'rxnorm'
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

  // ============================================
  // 11. LEARNING STORE
  // ============================================
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
      learn: function(ocrText, correctData) {
        var d = load();
        d[String(ocrText).toLowerCase().trim()] = {
          correct: correctData,
          at: new Date().toISOString()
        };
        save(d);
      },
      all: load,
      count: function() { return Object.keys(load()).length; },
      clear: function() { localStorage.removeItem(CONFIG.LEARN_KEY); }
    };
  })();

  // ============================================
  // 12. APPLY LEARNING + CACHE
  // ============================================
  function applyLearning(phrase) {
    var learned = Learning.get(phrase.english) || Learning.get(phrase.raw);
    if (learned && learned.correct) {
      return Object.assign({}, phrase, {
        display: learned.correct.display || phrase.display,
        category: learned.correct.category || phrase.category,
        form: learned.correct.form || phrase.form,
        source: 'learned',
        confidence: 'high'
      });
    }
    return phrase;
  }

  // ============================================
  // 13. MAIN PIPELINE
  // ============================================
  async function analyzeText(rawText) {
    var resultEl = document.getElementById('scannerOcrResult');
    if (!resultEl) return;
    
    showProgress('استخراج أسماء الأدوية...', 25);
    var phrases = extractDrugsFromText(rawText);
    
    if (!phrases.length) {
      renderNoDrugs();
      return;
    }
    
    // Apply learning
    phrases = phrases.map(applyLearning);
    
    // Verify unknowns with RxNorm
    var unverifiedPhrases = phrases.filter(function(p) { return p.source === 'unknown' || !p.verified; });
    showProgress('البحث في قاعدة الأدوية (' + unverifiedPhrases.length + ')...', 50);
    
    for (var i = 0; i < unverifiedPhrases.length; i++) {
      var verified = await verifyWithRxNorm(unverifiedPhrases[i]);
      Object.assign(unverifiedPhrases[i], verified);
      if (verified.verified) {
        unverifiedPhrases[i].source = 'rxnorm';
      }
    }
    
    // Inventory match
    showProgress('مطابقة مع المخزون...', 75);
    var products = [];
    try {
      var tid = (typeof PH !== 'undefined' && PH.tenantId) ? PH.tenantId : null;
      if (tid && typeof DB !== 'undefined') {
        products = DB.getTenantData(tid, 'products') || [];
      }
    } catch (e) {}
    
    phrases.forEach(function(p) {
      p.inventory = matchInventory(p, products);
      if (p.inventory) {
        p.productId = p.inventory.id;
        p.productName = p.inventory.name;
        p.price = p.inventory.price;
        p.stock = p.inventory.stock;
      }
    });
    
    // Interactions
    showProgress('فحص التفاعلات...', 92);
    var interactions = await checkInteractions(phrases);
    
    // Render
    renderResults(phrases, interactions);
    window._ocrAiResult = { drugs: phrases, interactions: interactions, rawText: rawText };
  }

  // ============================================
  // 14. UI HELPERS
  // ============================================
  function showProgress(msg, pct) {
    var resultEl = document.getElementById('scannerOcrResult');
    if (!resultEl) return;
    var circumference = 2 * Math.PI * 44;
    var offset = circumference - (circumference * pct / 100);
    resultEl.innerHTML =
      '<div style="text-align:center;padding:36px 20px">' +
        '<div style="width:100px;height:100px;margin:0 auto 20px;position:relative">' +
          '<svg style="transform:rotate(-90deg)" width="100" height="100">' +
            '<circle cx="50" cy="50" r="44" stroke="var(--bg-alt)" stroke-width="8" fill="none"></circle>' +
            '<circle cx="50" cy="50" r="44" stroke="var(--purple)" stroke-width="8" fill="none" ' +
              'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '" ' +
              'stroke-linecap="round" style="transition:stroke-dashoffset .3s"></circle>' +
          '</svg>' +
          '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.4rem;font-weight:900;color:var(--purple)">' + Math.round(pct) + '%</div>' +
        '</div>' +
        '<div style="font-weight:900;font-size:1rem;color:var(--text)">جاري التحليل...</div>' +
        '<div id="ocrStep" style="color:var(--text-muted);font-size:.82rem;margin-top:6px">' + msg + '</div>' +
      '</div>';
  }

  function renderNoDrugs() {
    var resultEl = document.getElementById('scannerOcrResult');
    if (!resultEl) return;
    resultEl.innerHTML =
      '<div style="text-align:center;padding:36px 20px">' +
        '<div style="width:90px;height:90px;margin:0 auto 18px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:50%;display:flex;align-items:center;justify-content:center">' +
          '<i class="fas fa-search" style="font-size:2rem;color:#b45309"></i>' +
        '</div>' +
        '<h3 style="font-size:1.05rem;font-weight:900;margin-bottom:8px">لم نجد أدوية واضحة</h3>' +
        '<p style="font-size:.85rem;color:var(--text-muted);line-height:1.7;max-width:320px;margin:0 auto 18px">' +
          'جرب صورة أوضح بإضاءة أفضل' +
        '</p>' +
        '<button class="btn btn-outline btn-sm" onclick="ocrReset()"><i class="fas fa-redo"></i> حاول مرة أخرى</button>' +
      '</div>';
  }

  function renderResults(drugs, interactions) {
    var resultEl = document.getElementById('scannerOcrResult');
    if (!resultEl) return;
    
    var inStock = drugs.filter(function(d) { return d.inventory; }).length;
    var highIx = interactions.filter(function(i) { return i.severity === 'high'; });
    
    var html = '';
    
    // Stats
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">';
    html += statCard('fa-pills', drugs.length, 'دواء', 'linear-gradient(135deg,#7c3aed,#a78bfa)');
    html += statCard('fa-check-circle', inStock, 'بالمخزون', 'linear-gradient(135deg,#00b884,#00d4a0)');
    html += statCard('fa-shield-alt', interactions.length, 'تفاعل',
      highIx.length ? 'linear-gradient(135deg,#ef4444,#f87171)' :
      interactions.length ? 'linear-gradient(135deg,#f59e0b,#fbbf24)' :
      'linear-gradient(135deg,#1E88E5,#42a5f5)');
    html += '</div>';
    
    // Learned count
    var learned = Learning.count();
    if (learned > 0) {
      html += '<div style="background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(0,184,132,.05));border:1px solid rgba(124,58,237,.2);border-radius:12px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-size:.8rem">';
      html += '<i class="fas fa-brain" style="color:var(--purple)"></i>';
      html += '<div style="flex:1"><strong>' + learned + '</strong> <span style="color:var(--text-muted)">تصحيح محفوظ — النظام يتعلم</span></div>';
      html += '</div>';
    }
    
    // Interactions
    if (interactions.length > 0) {
      html += '<div style="background:#fef2f2;border:2px solid #fecaca;border-radius:14px;padding:14px;margin-bottom:14px">';
      html += '<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px">';
      html += '<i class="fas fa-exclamation-triangle" style="color:var(--danger);font-size:1.2rem"></i>';
      html += '<strong style="color:#991b1b">تحذير: تفاعلات دوائية (' + interactions.length + ')</strong>';
      html += '</div>';
      interactions.slice(0, 4).forEach(function(ix) {
        var sev = (ix.severity === 'high') ? 'high' : (ix.severity === 'medium') ? 'medium' : 'low';
        var color = sev === 'high' ? 'var(--danger)' : sev === 'medium' ? 'var(--warning)' : '#64748b';
        var label = sev === 'high' ? 'خطر عالي' : sev === 'medium' ? 'متوسط' : 'بسيط';
        html += '<div style="background:#fff;padding:10px;border-radius:10px;margin-bottom:6px">';
        html += '<div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;align-items:center">';
        html += '<div style="font-weight:800;font-size:.85rem">' + escapeHtml(ix.drugA) + ' + ' + escapeHtml(ix.drugB) + '</div>';
        html += '<span style="background:' + color + ';color:#fff;padding:3px 10px;border-radius:999px;font-size:.65rem;font-weight:900">' + label + '</span>';
        html += '</div>';
        html += '<div style="font-size:.78rem;color:var(--text-muted);line-height:1.5">' + escapeHtml((ix.description || '').slice(0, 180)) + '</div>';
        html += '</div>';
      });
      html += '</div>';
    }
    
    // Drugs list
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">';
    html += '<div style="font-weight:900;font-size:.95rem"><i class="fas fa-list-ul" style="color:var(--primary)"></i> الأدوية (' + drugs.length + ')</div>';
    if (inStock > 0) {
      html += '<button type="button" class="btn btn-primary btn-sm" onclick="ocrAddAllToCart()"><i class="fas fa-cart-plus"></i> إضافة الكل</button>';
    }
    html += '</div>';
    
    drugs.forEach(function(d, i) {
      html += renderDrugCard(d, i);
    });
    
    // Footer
    html += '<div style="text-align:center;font-size:.7rem;color:var(--text-light);margin-top:14px">';
    html += 'RxNorm + OpenFDA • <a href="javascript:ocrShowRaw()" style="color:var(--text-light);text-decoration:underline">عرض النص الخام</a>';
    html += '</div>';
    
    resultEl.innerHTML = html;
  }

  function statCard(icon, num, label, gradient) {
    return '<div style="background:' + gradient + ';color:#fff;border-radius:12px;padding:12px 8px;text-align:center">' +
      '<i class="fas ' + icon + '" style="font-size:1.1rem;opacity:.9;margin-bottom:4px;display:block"></i>' +
      '<div style="font-size:1.4rem;font-weight:900;line-height:1;font-variant-numeric:tabular-nums">' + num + '</div>' +
      '<div style="font-size:.68rem;opacity:.9;margin-top:2px">' + label + '</div>' +
    '</div>';
  }

  function renderDrugCard(d, idx) {
    var hasStock = !!d.inventory;
    var h = '<div style="background:#fff;border:1.5px solid ' + (hasStock ? 'rgba(0,184,132,.4)' : 'var(--border)') + ';border-radius:12px;padding:12px;margin-bottom:8px;position:relative;overflow:hidden">';
    h += '<div style="position:absolute;top:0;inset-inline-start:0;bottom:0;width:3px;background:' + (hasStock ? 'var(--gradient-brand)' : '#cbd5e1') + '"></div>';
    h += '<div style="display:flex;justify-content:space-between;gap:10px;margin-bottom:8px">';
    h += '<div style="flex:1;min-width:0">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">';
    h += '<div style="width:24px;height:24px;background:var(--gradient-brand);color:#fff;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:900;flex-shrink:0">' + (idx + 1) + '</div>';
    h += '<div style="font-weight:900;font-size:.95rem">' + escapeHtml(d.display) + '</div>';
    h += '</div>';
    h += '<div style="display:flex;gap:5px;flex-wrap:wrap">';
    if (d.category) h += badge('', d.category, 'rgba(124,58,237,.1)', 'var(--purple)');
    if (d.form) h += badge('', d.form, 'rgba(30,136,229,.1)', 'var(--secondary)');
    if (d.source === 'learned') h += badge('fa-brain', 'متعلم', 'rgba(124,58,237,.12)', 'var(--purple)');
    if (d.source === 'rxnorm' || d.source === 'composite-exact') h += badge('fa-check', 'موثّق', 'rgba(16,185,129,.1)', '#059669');
    if (d.generic) h += badge('fa-flask', d.generic, 'rgba(6,182,212,.1)', '#0891b2');
    h += '</div>';
    h += '</div>';
    h += '<div style="flex-shrink:0">';
    if (hasStock) {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,.12);color:#059669;padding:4px 9px;border-radius:999px;font-size:.65rem;font-weight:900"><i class="fas fa-check"></i> متوفر</span>';
    } else {
      h += '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(239,68,68,.1);color:var(--danger);padding:4px 9px;border-radius:999px;font-size:.65rem;font-weight:900"><i class="fas fa-times"></i> غير متوفر</span>';
    }
    h += '</div></div>';
    
    if (hasStock) {
      h += '<div style="background:linear-gradient(135deg,rgba(0,184,132,.06),rgba(0,184,132,.02));padding:8px 10px;border-radius:9px;display:flex;justify-content:space-between;align-items:center;gap:8px">';
      h += '<div style="display:flex;gap:14px;font-size:.78rem">';
      h += '<div><span style="color:var(--text-muted)">مخزون:</span> <strong>' + (d.stock || 0) + '</strong></div>';
      h += '<div><span style="color:var(--text-muted)">سعر:</span> <strong style="color:var(--primary)">' + (d.price || 0) + ' ج</strong></div>';
      h += '</div>';
      h += '<button type="button" class="btn btn-primary btn-sm" onclick="ocrAddToCart(\'' + d.productId + '\')" style="padding:6px 14px"><i class="fas fa-cart-plus"></i></button>';
      h += '</div>';
    } else {
      h += '<button type="button" class="btn btn-outline btn-sm" style="width:100%;padding:6px;font-size:.75rem" onclick="ocrLearnCorrection(\'' + escapeHtml(d.english || d.display).replace(/'/g, "\\'") + '\')"><i class="fas fa-edit"></i> صحّح يدوياً</button>';
    }
    h += '</div>';
    return h;
  }

  function badge(icon, text, bg, color) {
    var ic = icon ? '<i class="fas ' + icon + '"></i> ' : '';
    return '<span style="background:' + bg + ';color:' + color + ';padding:2px 8px;border-radius:999px;font-size:.62rem;font-weight:800;display:inline-flex;align-items:center;gap:4px">' +
      ic + escapeHtml(text) + '</span>';
  }

  // ============================================
  // 15. PUBLIC ACTIONS
  // ============================================
  window.ocrAddToCart = function(productId) {
    if (!productId) return;
    if (typeof phAddToCart === 'function') {
      phAddToCart(productId);
      if (typeof Utils !== 'undefined') Utils.toast('✅ أضيف للسلة', 'success');
    }
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
    var correct = prompt('الاسم الصحيح:\n\n(OCR قرأ: "' + ocrText + '")');
    if (!correct) return;
    var cat = prompt('الفئة (اختياري - مثال: مسكن، مضاد حيوي، فيتامينات)') || '';
    var form = prompt('الشكل (اختياري - مثال: قرص، قطرة، شراب)') || '';
    Learning.learn(ocrText, { display: correct.trim(), category: cat, form: form });
    if (typeof Utils !== 'undefined') Utils.toast('✅ اتعلمت! هيتعرف عليها المرة الجاية', 'success');
    if (window._ocrAiResult && window._ocrAiResult.rawText) {
      analyzeText(window._ocrAiResult.rawText);
    }
  };

  window.ocrShowRaw = function() {
    var d = window._ocrAiResult;
    if (d && d.rawText) alert(d.rawText.slice(0, 2000));
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

  // Test function
  window.ocrTestText = function(text) {
    analyzeText(text || '');
  };

  // ============================================
  // 16. OCR ENGINE + HANDLER INSTALL
  // ============================================
  async function recognizeImage(blob) {
    // Try TrOCR first
    try {
      var res = await fetch(CONFIG.HF_OCR_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: await blob.arrayBuffer()
      });
      if (res.ok) {
        var data = await res.json();
        var text = Array.isArray(data) ? (data[0] && data[0].generated_text) : data.generated_text;
        if (text) return { text: text, engine: 'trocr' };
      }
    } catch (e) { console.warn('[OCR] TrOCR fail:', e.message); }
    
    // Fallback
    if (typeof RxOCR !== 'undefined' && RxOCR.recognize) {
      var t = await RxOCR.recognize(blob);
      return { text: t, engine: 'tesseract' };
    }
    throw new Error('No OCR');
  }

  function install() {
    if (typeof RxOCR === 'undefined') { setTimeout(install, 400); return; }
    
    window.handlePrescriptionFile = async function(file) {
      if (!file) return;
      var dz = document.getElementById('prescriptionDropZone');
      var pv = document.getElementById('prescriptionPreview');
      var img = document.getElementById('prescriptionImg');
      var rs = document.getElementById('scannerOcrResult');
      
      if (dz) dz.style.display = 'none';
      if (pv) pv.style.display = 'block';
      if (img) img.src = URL.createObjectURL(file);
      if (rs) showProgress('قراءة الصورة...', 10);
      
      try {
        var ocr = await recognizeImage(file);
        if (!ocr.text || ocr.text.trim().length < 3) {
          renderNoDrugs();
          return;
        }
        window._ocrEngine = ocr.engine;
        await analyzeText(ocr.text);
      } catch (e) {
        console.error(e);
        if (rs) rs.innerHTML = '<div style="text-align:center;padding:30px;color:var(--danger)">فشل التحليل — جرب صورة أوضح</div>';
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
      // Also rebind drop zone
      var dzone = document.getElementById('prescriptionDropZone');
      if (dzone) {
        var dc = dzone.cloneNode(true);
        dzone.parentNode.replaceChild(dc, dzone);
        dc.addEventListener('click', function() { clone.click(); });
        dc.addEventListener('dragover', function(e) { e.preventDefault(); dc.style.borderColor = 'var(--purple)'; });
        dc.addEventListener('dragleave', function() { dc.style.borderColor = ''; });
        dc.addEventListener('drop', function(e) {
          e.preventDefault();
          dc.style.borderColor = '';
          var f = e.dataTransfer.files[0];
          if (f) window.handlePrescriptionFile(f);
        });
      }
    }
    
    console.log('[OCR-AI v4] Word-level engine ready ✓');
    console.log('[OCR-AI v4] Dictionary words:', Object.keys(WORD_DICT).length);
    console.log('[OCR-AI v4] Instruction words:', Object.keys(INSTRUCTION_WORDS).length);
    console.log('[OCR-AI v4] Composite phrases:', Object.keys(COMPOSITE_PHRASES).length);
    console.log('[OCR-AI v4] Learned corrections:', Learning.count());
  }
  
  setTimeout(install, 300);
  console.log('[OCR-AI v4] Loaded ✓');
})();