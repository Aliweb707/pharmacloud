/* ============================================
   PHARMACLOUD PRO - PRO FEATURES v3.1 FIXED
   Fixed JSON.parse patch that broke auth
   ============================================ */
'use strict';

/* Reuse original pro-features but with safe JSON.parse */

(function(){
  // Do NOT override JSON.parse to return [] for 'null' - this breaks DB.getSession
  // Instead, provide safe helper
  function safeParse(text, fallback) {
    if (text === null || text === undefined || text === '' ) return fallback;
    try {
      var r = JSON.parse(text);
      return r === null || r === undefined ? fallback : r;
    } catch(e) {
      return fallback;
    }
  }

  // Patch DB methods safely without breaking session
  setTimeout(function(){
    if (typeof DB === 'undefined') { setTimeout(arguments.callee, 300); return; }
    
    var originalGetSession = DB.getSession;
    DB.getSession = function() {
      try {
        var raw = localStorage.getItem('pc_session');
        if (!raw) return null;
        var parsed = safeParse(raw, null);
        // If parsed is empty array due to old bug, treat as null
        if (Array.isArray(parsed) && parsed.length === 0) return null;
        return parsed;
      } catch(e) { return null; }
    };

    DB.safeGet = function(k, fb) {
      var def;
      if (Array.isArray(fb)) def = fb;
      else if (typeof fb === 'object' && fb !== null) def = fb;
      else if (typeof fb === 'string') {
        try { def = JSON.parse(fb); } catch (e) { def = []; }
      } else def = [];
      try {
        var raw = localStorage.getItem(k);
        if (!raw) return def;
        var p = safeParse(raw, def);
        return p === null || p === undefined ? def : p;
      } catch (e) {
        try { localStorage.removeItem(k); } catch (e2) {}
        return def;
      }
    };

    DB.getBatches = function(tid) {
      try {
        var raw = localStorage.getItem('pc_' + tid + '_batches');
        if (!raw) return [];
        var p = safeParse(raw, []);
        return Array.isArray(p) ? p : [];
      } catch (e) { return []; }
    };

    DB.getTenantData = function(tid, key) {
      try {
        var raw = localStorage.getItem('pc_' + tid + '_' + key);
        if (!raw) return [];
        var p = safeParse(raw, []);
        return p === null || p === undefined ? [] : p;
      } catch (e) { return []; }
    };

    console.log('[Pro Features v3.1] ✅ DB patched safely, session fix applied');
  }, 500);

  console.log('[Pro Features v3.1] ✅ Loaded without breaking JSON.parse');
})();
