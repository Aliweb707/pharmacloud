/* ============================================
   PHARMACLOUD - PHARMA APIs v1.0
   Real drug data from NLM RxNorm + OpenFDA + DailyMed
   ============================================ */
'use strict';

/* ============================================
   0. CACHE LAYER (يمنع تكرار الطلبات)
   ============================================ */
var PharmaCache = (function() {
  var memory = {};
  var TTL = 4 * 60 * 60 * 1000; // 4 ساعات

  function key(ns, k) { return ns + ':' + String(k).toLowerCase().trim(); }

  function get(ns, k) {
    var id = key(ns, k);
    var item = memory[id];
    if (!item) return null;
    if (Date.now() > item.exp) { delete memory[id]; return null; }
    return item.v;
  }

  function set(ns, k, v) {
    memory[key(ns, k)] = { v: v, exp: Date.now() + TTL };
  }

  function clear() { memory = {}; }

  return { get: get, set: set, clear: clear };
})();

/* ============================================
   1. RxNorm API (NLM - No key required)
   Base: https://rxnav.nlm.nih.gov/REST
   Rate limit: 20 req/sec
   ============================================ */
var RxNormAPI = (function() {
  var BASE = 'https://rxnav.nlm.nih.gov/REST';

  // Helper: fetch with timeout
  function fetchJSON(url, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
      fetch(url, { signal: controller.signal })
        .then(function(r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(resolve)
        .catch(function(e) { clearTimeout(timer); reject(e); });
    });
  }

  // 1.1 Get RxCUI (concept ID) from drug name
  async function getRxCUI(drugName) {
    if (!drugName) return null;
    var cached = PharmaCache.get('rxcui', drugName);
    if (cached !== null) return cached;

    try {
      var url = BASE + '/rxcui.json?name=' + encodeURIComponent(drugName);
      var data = await fetchJSON(url, 8000);
      var id = (data.idGroup && data.idGroup.rxnormId && data.idGroup.rxnormId[0]) || null;
      PharmaCache.set('rxcui', drugName, id);
      return id;
    } catch (e) {
      console.warn('[RxNorm] getRxCUI failed:', drugName, e.message);
      PharmaCache.set('rxcui', drugName, null);
      return null;
    }
  }

  // 1.2 Get concept properties (name, ingredient, dose form)
  async function getProperties(rxcui) {
    if (!rxcui) return null;
    var cached = PharmaCache.get('props', rxcui);
    if (cached !== null) return cached;

    try {
      var url = BASE + '/rxcui/' + rxcui + '/properties.json';
      var data = await fetchJSON(url, 8000);
      var props = data.properties || null;
      PharmaCache.set('props', rxcui, props);
      return props;
    } catch (e) {
      return null;
    }
  }

  // 1.3 Get drug-drug interactions
  async function getInteractions(rxcui) {
    if (!rxcui) return [];
    var cached = PharmaCache.get('interactions', rxcui);
    if (cached !== null) return cached;

    try {
      var url = BASE + '/interaction/interaction.json?rxcui=' + rxcui;
      var data = await fetchJSON(url, 10000);
      var groups = (data.interactionTypeGroup || []);
      var list = [];
      groups.forEach(function(g) {
        (g.interactionType || []).forEach(function(t) {
          (t.interactionPair || []).forEach(function(p) {
            list.push({
              description: p.description || '',
              severity: p.severity || 'unknown',
              drugA: (p.interactionConcept && p.interactionConcept[0] && p.interactionConcept[0].minConceptItem && p.interactionConcept[0].minConceptItem.name) || '',
              drugB: (p.interactionConcept && p.interactionConcept[1] && p.interactionConcept[1].minConceptItem && p.interactionConcept[1].minConceptItem.name) || ''
            });
          });
        });
      });
      PharmaCache.set('interactions', rxcui, list);
      return list;
    } catch (e) {
      console.warn('[RxNorm] getInteractions failed:', rxcui, e.message);
      PharmaCache.set('interactions', rxcui, []);
      return [];
    }
  }

  // 1.4 Spelling suggestions (لو الاسم غلط)
  async function getSpellingSuggestions(drugName) {
    if (!drugName) return [];
    try {
      var url = BASE + '/spellingsuggestions.json?name=' + encodeURIComponent(drugName);
      var data = await fetchJSON(url, 6000);
      return (data.suggestionGroup && data.suggestionGroup.suggestionList && data.suggestionGroup.suggestionList.suggestion) || [];
    } catch (e) {
      return [];
    }
  }

  // 1.5 Normalize a drug name → returns { rxcui, name, ingredient, doseForm }
  async function normalize(drugName) {
    var rxcui = await getRxCUI(drugName);
    if (!rxcui) {
      // Try spelling suggestions
      var suggestions = await getSpellingSuggestions(drugName);
      if (suggestions.length > 0) {
        rxcui = await getRxCUI(suggestions[0]);
        if (rxcui) {
          var p = await getProperties(rxcui);
          return { rxcui: rxcui, name: suggestions[0], corrected: true, ingredient: p ? p.name : '' };
        }
      }
      return null;
    }
    var props = await getProperties(rxcui);
    return {
      rxcui: rxcui,
      name: props ? props.name : drugName,
      ingredient: props ? (props.ingredient || props.name) : '',
      doseForm: props ? props.doseForm : ''
    };
  }

  return {
    getRxCUI: getRxCUI,
    getProperties: getProperties,
    getInteractions: getInteractions,
    getSpellingSuggestions: getSpellingSuggestions,
    normalize: normalize
  };
})();

/* ============================================
   2. OpenFDA API (No key required for basic use)
   Base: https://api.fda.gov/drug/label.json
   Rate limit: 240 req/min (without key)
   ============================================ */
var OpenFDAAPI = (function() {
  var BASE = 'https://api.fda.gov/drug/label.json';

  function fetchJSON(url, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
      fetch(url, { signal: controller.signal })
        .then(function(r) {
          clearTimeout(timer);
          if (r.status === 404) return { results: [] }; // no label found
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(resolve)
        .catch(function(e) { clearTimeout(timer); reject(e); });
    });
  }

  // 2.1 Search label by drug name (brand or generic)
  async function searchLabel(drugName) {
    if (!drugName) return null;
    var cached = PharmaCache.get('fda:label', drugName);
    if (cached !== null) return cached;

    try {
      var q = encodeURIComponent('"' + drugName + '"');
      var url = BASE + '?search=openfda.brand_name:' + q + '+openfda.generic_name:' + q + '&limit=1';
      var data = await fetchJSON(url, 10000);
      var result = (data.results && data.results[0]) || null;
      PharmaCache.set('fda:label', drugName, result);
      return result;
    } catch (e) {
      console.warn('[OpenFDA] searchLabel failed:', drugName, e.message);
      PharmaCache.set('fda:label', drugName, null);
      return null;
    }
  }

  // 2.2 Get specific section from label
  async function getSection(drugName, section) {
    var label = await searchLabel(drugName);
    if (!label || !label[section]) return [];
    var val = label[section];
    return Array.isArray(val) ? val : [val];
  }

  // 2.3 Get drug interactions from FDA label
  async function getInteractions(drugName) {
    var cached = PharmaCache.get('fda:ix', drugName);
    if (cached !== null) return cached;
    var result = await getSection(drugName, 'drug_interactions');
    PharmaCache.set('fda:ix', drugName, result);
    return result;
  }

  // 2.4 Get warnings
  async function getWarnings(drugName) {
    return getSection(drugName, 'warnings_and_cautions');
  }

  // 2.5 Get dosage
  async function getDosage(drugName) {
    return getSection(drugName, 'dosage_and_administration');
  }

  // 2.6 Check if drugA's label mentions drugB in interactions
  async function checkPairInteraction(drugA, drugB) {
    if (!drugA || !drugB) return null;
    var cacheKey = drugA + '|' + drugB;
    var cached = PharmaCache.get('fda:pair', cacheKey);
    if (cached !== null) return cached;

    var sections = await getInteractions(drugA);
    if (!sections.length) { PharmaCache.set('fda:pair', cacheKey, null); return null; }
    var text = sections.join(' ').toLowerCase();
    var target = drugB.toLowerCase();
    if (text.indexOf(target) === -1) { PharmaCache.set('fda:pair', cacheKey, null); return null; }

    // Extract surrounding sentences
    var sentences = text.split(/(?<=\. )/).filter(function(s) { return s.indexOf(target) !== -1; });
    var desc = sentences.slice(0, 2).join(' ').trim();
    var result = { description: desc || ('Interaction with ' + drugB + ' reported in FDA label.') };
    PharmaCache.set('fda:pair', cacheKey, result);
    return result;
  }

  return {
    searchLabel: searchLabel,
    getSection: getSection,
    getInteractions: getInteractions,
    getWarnings: getWarnings,
    getDosage: getDosage,
    checkPairInteraction: checkPairInteraction
  };
})();

/* ============================================
   3. DailyMed API (No key required)
   Base: https://dailymed.nlm.nih.gov/dailymed/services/v2
   ============================================ */
var DailyMedAPI = (function() {
  var BASE = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';

  function fetchJSON(url, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var controller = new AbortController();
      var timer = setTimeout(function() { controller.abort(); }, timeoutMs || 10000);
      fetch(url, { signal: controller.signal })
        .then(function(r) {
          clearTimeout(timer);
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(resolve)
        .catch(function(e) { clearTimeout(timer); reject(e); });
    });
  }

  // 3.1 Search drug names
  async function searchDrug(drugName) {
    if (!drugName) return [];
    var cached = PharmaCache.get('dm:search', drugName);
    if (cached !== null) return cached;

    try {
      var url = BASE + '/drugnames.json?drug_name=' + encodeURIComponent(drugName);
      var data = await fetchJSON(url, 10000);
      var list = (data.data || []).map(function(d) {
        return { name: d.drug_name, type: d.drug_name_type };
      });
      PharmaCache.set('dm:search', drugName, list);
      return list;
    } catch (e) {
      return [];
    }
  }

  // 3.2 Get SPLs (labels) for a drug name
  async function getLabels(drugName) {
    var cached = PharmaCache.get('dm:spls', drugName);
    if (cached !== null) return cached;
    try {
      var url = BASE + '/spls.json?drug_name=' + encodeURIComponent(drugName) + '&pagesize=10';
      var data = await fetchJSON(url, 10000);
      var list = (data.data || []).map(function(s) {
        return { setid: s.setid, title: s.title, published_date: s.published_date };
      });
      PharmaCache.set('dm:spls', drugName, list);
      return list;
    } catch (e) {
      return [];
    }
  }

  return { searchDrug: searchDrug, getLabels: getLabels };
})();

/* ============================================
   4. Unified Pharma API (الواجهة الموحدة)
   ============================================ */
var PharmaAPI = (function() {

  // Get complete drug info from all sources
  async function getDrugInfo(drugName) {
    if (!drugName) return null;

    // 1. Normalize with RxNorm
    var normalized = await RxNormAPI.normalize(drugName);

    // 2. Get FDA label info in parallel
    var fdaPromise = OpenFDAAPI.searchLabel(drugName);
    var dailymedPromise = DailyMedAPI.searchDrug(drugName);

    var fdaLabel = await fdaPromise;
    var dailyMedResults = await dailymedPromise;

    var result = {
      query: drugName,
      normalized: normalized,
      rxcui: normalized ? normalized.rxcui : null,
      genericName: normalized ? normalized.ingredient : null,
      brandNames: [],
      interactions: [],
      warnings: [],
      dosage: '',
      sources: {
        rxnorm: !!normalized,
        openfda: !!fdaLabel,
        dailymed: dailyMedResults.length > 0
      }
    };

    // Extract from FDA label
    if (fdaLabel) {
      if (fdaLabel.openfda) {
        result.brandNames = (fdaLabel.openfda.brand_name || []).slice(0, 5);
        result.genericName = (fdaLabel.openfda.generic_name || [])[0] || result.genericName;
      }
      if (fdaLabel.drug_interactions) {
        result.interactions = Array.isArray(fdaLabel.drug_interactions)
          ? fdaLabel.drug_interactions : [fdaLabel.drug_interactions];
      }
      if (fdaLabel.warnings_and_cautions) {
        result.warnings = Array.isArray(fdaLabel.warnings_and_cautions)
          ? fdaLabel.warnings_and_cautions : [fdaLabel.warnings_and_cautions];
      }
      if (fdaLabel.dosage_and_administration) {
        result.dosage = Array.isArray(fdaLabel.dosage_and_administration)
          ? fdaLabel.dosage_and_administration[0] : fdaLabel.dosage_and_administration;
      }
    }

    // Add DailyMed results
    if (dailyMedResults.length > 0) {
      result.dailyMedNames = dailyMedResults.slice(0, 5);
    }

    return result;
  }

  // Check interactions between multiple drugs
  async function checkInteractions(drugList) {
    if (!drugList || drugList.length < 2) return [];
    var results = [];

    // Get RxCUIs for all drugs in parallel
    var rxcuiPromises = drugList.map(function(d) { return RxNormAPI.getRxCUI(d); });
    var rxcuis = await Promise.all(rxcuiPromises);

    // Check pairwise interactions
    for (var i = 0; i < drugList.length; i++) {
      for (var j = i + 1; j < drugList.length; j++) {
        var a = drugList[i], b = drugList[j];
        var aCui = rxcuis[i], bCui = rxcuis[j];

        // Method 1: RxNorm interactions
        if (aCui) {
          var ix = await RxNormAPI.getInteractions(aCui);
          ix.forEach(function(item) {
            if (item.drugB && item.drugB.toLowerCase().indexOf(b.toLowerCase()) !== -1) {
              results.push({
                source: 'RxNorm',
                drugA: a, drugB: b,
                severity: item.severity,
                description: item.description
              });
            }
          });
        }

        // Method 2: OpenFDA label check
        if (!results.some(function(r) { return r.drugA === a && r.drugB === b; })) {
          var fdaIx = await OpenFDAAPI.checkPairInteraction(a, b);
          if (fdaIx) {
            results.push({
              source: 'OpenFDA',
              drugA: a, drugB: b,
              severity: 'unknown',
              description: fdaIx.description
            });
          }
        }
      }
    }

    return results;
  }

  return {
    getDrugInfo: getDrugInfo,
    checkInteractions: checkInteractions,
    clearCache: PharmaCache.clear
  };
})();

console.log('[PharmaAPI] Loaded ✓ RxNorm + OpenFDA + DailyMed');