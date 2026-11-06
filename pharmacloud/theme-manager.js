/* ============================================
   PHARMACLOUD - THEME MANAGER v1.0
   Professional Dark Mode + Theme Customization
   Features:
   - Dark / Light / Auto modes
   - Scheduled switching (day/night)
   - Custom accent colors
   - High contrast mode
   - Reduced motion mode
   - Compact mode
   - Focus mode
   - System preference sync
   - Theme analytics
   ============================================ */
'use strict';

if (window.__PC_THEME_MANAGER_LOADED__) {
  console.log('[Theme Manager] ⏸️ Already loaded');
} else {
  window.__PC_THEME_MANAGER_LOADED__ = true;

  (function() {

    /* ============================================
       CONFIG
       ============================================ */
    var CFG = {
      KEY: 'pc_theme_settings',
      PRESETS: {
        emerald: { primary: '#00b884', secondary: '#1E88E5', accent: '#FF6B35', name: 'زمردي' },
        ocean:   { primary: '#1E88E5', secondary: '#00b884', accent: '#FF6B35', name: 'محيطي' },
        purple:  { primary: '#7c3aed', secondary: '#1E88E5', accent: '#FF6B35', name: 'بنفسجي' },
        sunset:  { primary: '#FF6B35', secondary: '#f59e0b', accent: '#dc2626', name: 'غروب' },
        rose:    { primary: '#e11d48', secondary: '#7c3aed', accent: '#00b884', name: 'وردي' },
        navy:    { primary: '#0ea5e9', secondary: '#6366f1', accent: '#10b981', name: 'أزرق' }
      },
      DEFAULT: {
        mode: 'auto',
        accent: 'emerald',
        highContrast: false,
        reducedMotion: false,
        compact: false,
        focusMode: false,
        autoSwitch: true,
        dayStart: 6,
        nightStart: 20
      }
    };

    /* ============================================
       STATE
       ============================================ */
    var TM = {
      settings: {},
      currentEffectiveMode: 'light'
    };

    /* ============================================
       HELPERS
       ============================================ */
    function loadSettings() {
      try {
        var s = localStorage.getItem(CFG.KEY);
        if (!s) return Object.assign({}, CFG.DEFAULT);
        var parsed = JSON.parse(s);
        return Object.assign({}, CFG.DEFAULT, parsed);
      } catch (e) {
        return Object.assign({}, CFG.DEFAULT);
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(CFG.KEY, JSON.stringify(TM.settings));
      } catch (e) {}
    }

    function prefersDark() {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function prefersReducedMotion() {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    /* ============================================
       APPLY THEME
       ============================================ */
    function getEffectiveMode() {
      if (TM.settings.mode === 'auto') {
        // Scheduled switching
        if (TM.settings.autoSwitch) {
          var hour = new Date().getHours();
          var dayStart = TM.settings.dayStart;
          var nightStart = TM.settings.nightStart;

          if (nightStart > dayStart) {
            // Night is between nightStart and dayStart (wrap around)
            if (hour >= nightStart || hour < dayStart) return 'dark';
            return 'light';
          } else {
            // Simple day/night
            if (hour >= dayStart && hour < nightStart) return 'light';
            return 'dark';
          }
        }
        // System preference
        return prefersDark() ? 'dark' : 'light';
      }
      return TM.settings.mode;
    }

    function applyTheme() {
      var mode = getEffectiveMode();
      TM.currentEffectiveMode = mode;

      var root = document.documentElement;
      root.setAttribute('data-theme', mode);

      // Accent color
      var preset = CFG.PRESETS[TM.settings.accent] || CFG.PRESETS.emerald;
      root.style.setProperty('--accent-preset-primary', preset.primary);
      root.style.setProperty('--accent-preset-secondary', preset.secondary);
      root.style.setProperty('--accent-preset-tertiary', preset.accent);

      // High contrast
      root.classList.toggle('theme-high-contrast', TM.settings.highContrast);
      // Reduced motion
      root.classList.toggle('theme-reduced-motion', TM.settings.reducedMotion || prefersReducedMotion());
      // Compact
      root.classList.toggle('theme-compact', TM.settings.compact);
      // Focus mode
      root.classList.toggle('theme-focus-mode', TM.settings.focusMode);

      // Update meta theme-color for mobile
      var metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.content = mode === 'dark' ? '#0f172a' : '#00b884';
      }

      // Dispatch event
      try {
        window.dispatchEvent(new CustomEvent('theme:changed', {
          detail: { mode: mode, accent: TM.settings.accent, settings: TM.settings }
        }));
      } catch (e) {}

      console.log('[Theme Manager] 🎨 Applied:', mode, '/', TM.settings.accent);
    }

    /* ============================================
       PUBLIC API
       ============================================ */
    var ThemeManager = {

      /* Get current settings */
      getSettings: function() {
        return Object.assign({}, TM.settings);
      },

      /* Set mode: 'light' | 'dark' | 'auto' */
      setMode: function(mode) {
        if (['light', 'dark', 'auto'].indexOf(mode) === -1) return;
        TM.settings.mode = mode;
        saveSettings();
        applyTheme();
        ThemeManager.updateToggleUI();
      },

      /* Toggle between light/dark */
      toggle: function() {
        var current = TM.currentEffectiveMode;
        ThemeManager.setMode(current === 'dark' ? 'light' : 'dark');
        if (typeof Utils !== 'undefined') {
          Utils.toast(
            current === 'dark' ? '☀️ الوضع الفاتح' : '🌙 الوضع الليلي',
            'info'
          );
        }
      },

      /* Cycle through modes: light → dark → auto → light */
      cycle: function() {
        var sequence = ['light', 'dark', 'auto'];
        var idx = sequence.indexOf(TM.settings.mode);
        var next = sequence[(idx + 1) % sequence.length];
        ThemeManager.setMode(next);

        if (typeof Utils !== 'undefined') {
          var labels = { light: '☀️ فاتح', dark: '🌙 ليلي', auto: '🔄 تلقائي' };
          Utils.toast('الوضع: ' + labels[next], 'info');
        }
      },

      /* Change accent color */
      setAccent: function(accent) {
        if (!CFG.PRESETS[accent]) return;
        TM.settings.accent = accent;
        saveSettings();
        applyTheme();
      },

      /* Toggle specific features */
      toggleFeature: function(feature) {
        var features = ['highContrast', 'reducedMotion', 'compact', 'focusMode', 'autoSwitch'];
        if (features.indexOf(feature) === -1) return;
        TM.settings[feature] = !TM.settings[feature];
        saveSettings();
        applyTheme();
      },

      setFeature: function(feature, value) {
        var features = ['highContrast', 'reducedMotion', 'compact', 'focusMode', 'autoSwitch'];
        if (features.indexOf(feature) === -1) return;
        TM.settings[feature] = !!value;
        saveSettings();
        applyTheme();
      },

      /* Reset to defaults */
      reset: function() {
        TM.settings = Object.assign({}, CFG.DEFAULT);
        saveSettings();
        applyTheme();
        if (typeof Utils !== 'undefined') Utils.toast('تم إعادة الوضع الافتراضي', 'success');
      },

      /* Get current effective mode (light/dark) */
      getCurrentMode: function() {
        return TM.currentEffectiveMode;
      },

      /* Get all available presets */
      getPresets: function() {
        return CFG.PRESETS;
      },

      /* Update UI toggles */
      updateToggleUI: function() {
        var btns = document.querySelectorAll('[data-theme-toggle]');
        var mode = TM.settings.mode;
        var effective = TM.currentEffectiveMode;

        btns.forEach(function(btn) {
          btn.setAttribute('data-mode', mode);
          btn.setAttribute('data-effective', effective);

          var icon = btn.querySelector('i');
          if (icon) {
            if (mode === 'light') {
              icon.className = 'fas fa-sun';
            } else if (mode === 'dark') {
              icon.className = 'fas fa-moon';
            } else {
              icon.className = 'fas fa-adjust';
            }
          }

          var label = btn.querySelector('.theme-label');
          if (label) {
            label.textContent = mode === 'light' ? 'فاتح' : mode === 'dark' ? 'ليلي' : 'تلقائي';
          }
        });
      },

      /* Open Theme Settings Modal */
      openSettings: function() {
        if (typeof Dialog === 'undefined' && !document.getElementById('phModalBox')) {
          console.warn('[Theme Manager] No modal system');
          return;
        }

        var modal = document.getElementById('phModalBox');
        if (!modal) {
          // Fallback: use phModal
          modal = document.querySelector('.ph-modal');
        }
        if (!modal) return;

        var s = TM.settings;

        var h = '';
        h += '<div class="ph-modal-head" style="background:linear-gradient(135deg,#7c3aed,#1E88E5);color:#fff">';
        h += '<h3 style="color:#fff"><i class="fas fa-palette"></i> إعدادات المظهر</h3>';
        h += '<button class="ph-modal-close" onclick="phCloseModal()" style="background:rgba(255,255,255,.2);color:#fff"><i class="fas fa-times"></i></button>';
        h += '</div>';

        h += '<div class="ph-modal-body">';

        // Mode section
        h += '<div class="theme-section">';
        h += '<h4><i class="fas fa-sun"></i> الوضع العام</h4>';
        h += '<div class="theme-mode-grid">';
        h += themeModeCard('light', 'فاتح', 'fa-sun', s.mode === 'light');
        h += themeModeCard('dark', 'ليلي', 'fa-moon', s.mode === 'dark');
        h += themeModeCard('auto', 'تلقائي', 'fa-adjust', s.mode === 'auto');
        h += '</div>';
        h += '</div>';

        // Accent
        h += '<div class="theme-section">';
        h += '<h4><i class="fas fa-paint-brush"></i> اللون الأساسي</h4>';
        h += '<div class="theme-accent-grid">';
        Object.keys(CFG.PRESETS).forEach(function(key) {
          var p = CFG.PRESETS[key];
          h += '<button type="button" class="theme-accent-btn' + (s.accent === key ? ' active' : '') + '" onclick="ThemeManager.setAccent(\'' + key + '\');ThemeManager.refreshSettingsModal();" title="' + p.name + '">';
          h += '<span class="theme-accent-preview" style="background:linear-gradient(135deg,' + p.primary + ',' + p.secondary + ')"></span>';
          h += '<span class="theme-accent-name">' + p.name + '</span>';
          if (s.accent === key) {
            h += '<i class="fas fa-check theme-accent-check"></i>';
          }
          h += '</button>';
        });
        h += '</div>';
        h += '</div>';

        // Advanced toggles
        h += '<div class="theme-section">';
        h += '<h4><i class="fas fa-sliders-h"></i> إعدادات متقدمة</h4>';

        h += themeToggle('autoSwitch', 'fa-clock', 'تبديل تلقائي', 'يتبدل الوضع تلقائياً بين النهار والليل', s.autoSwitch);
        h += themeToggle('highContrast', 'fa-eye', 'تباين عالي', 'يحسّن القراءة للأشخاص ذوي الإعاقة البصرية', s.highContrast);
        h += themeToggle('reducedMotion', 'fa-feather', 'تقليل الحركة', 'يوقف الانتقالات والحركات للتجربة الهادئة', s.reducedMotion);
        h += themeToggle('compact', 'fa-compress', 'الوضع المضغوط', 'مسافات أقل = معلومات أكتر على الشاشة', s.compact);
        h += themeToggle('focusMode', 'fa-bullseye', 'وضع التركيز', 'يخفي كل حاجة غير ضرورية للتركيز على العمل', s.focusMode);

        h += '</div>';

        // Auto switch times (if enabled)
        if (s.autoSwitch) {
          h += '<div class="theme-section">';
          h += '<h4><i class="fas fa-clock"></i> أوقات التبديل</h4>';
          h += '<div class="theme-times">';
          h += '<div class="theme-time-item">';
          h += '<label>يبدأ النهار</label>';
          h += '<select id="themeDayStart" onchange="ThemeManager.setDayStart(this.value)">';
          for (var h1 = 0; h1 < 24; h1++) {
            h += '<option value="' + h1 + '"' + (s.dayStart === h1 ? ' selected' : '') + '>' + String(h1).padStart(2, '0') + ':00</option>';
          }
          h += '</select>';
          h += '</div>';
          h += '<div class="theme-time-item">';
          h += '<label>يبدأ الليل</label>';
          h += '<select id="themeNightStart" onchange="ThemeManager.setNightStart(this.value)">';
          for (var h2 = 0; h2 < 24; h2++) {
            h += '<option value="' + h2 + '"' + (s.nightStart === h2 ? ' selected' : '') + '>' + String(h2).padStart(2, '0') + ':00</option>';
          }
          h += '</select>';
          h += '</div>';
          h += '</div>';
          h += '</div>';
        }

        h += '</div>';

        h += '<div class="ph-modal-foot">';
        h += '<button class="btn btn-outline" onclick="ThemeManager.reset();ThemeManager.refreshSettingsModal();">';
        h += '<i class="fas fa-undo"></i> إعادة الافتراضي';
        h += '</button>';
        h += '<button class="btn btn-primary" onclick="phCloseModal()">';
        h += '<i class="fas fa-check"></i> تم';
        h += '</button>';
        h += '</div>';

        modal.innerHTML = h;
        var overlay = document.getElementById('phModalOverlay');
        if (overlay) overlay.classList.add('open');
      },

      refreshSettingsModal: function() {
        // Small delay to allow re-render
        setTimeout(function() {
          ThemeManager.openSettings();
        }, 50);
      },

      setDayStart: function(v) {
        TM.settings.dayStart = parseInt(v) || 6;
        saveSettings();
        applyTheme();
      },

      setNightStart: function(v) {
        TM.settings.nightStart = parseInt(v) || 20;
        saveSettings();
        applyTheme();
      },

      /* Debug */
      debug: function() {
        console.log('═══════════════════════════════════');
        console.log('🎨 THEME MANAGER DEBUG');
        console.log('═══════════════════════════════════');
        console.log('Settings:', TM.settings);
        console.log('Effective mode:', TM.currentEffectiveMode);
        console.log('System prefers dark:', prefersDark());
        console.log('System prefers reduced motion:', prefersReducedMotion());
        console.log('Current hour:', new Date().getHours());
        console.log('═══════════════════════════════════');
      }
    };

    /* ============================================
       MODAL HELPERS
       ============================================ */
    function themeModeCard(mode, label, icon, active) {
      return '<button type="button" class="theme-mode-card' + (active ? ' active' : '') + '" onclick="ThemeManager.setMode(\'' + mode + '\');ThemeManager.refreshSettingsModal();">' +
        '<i class="fas ' + icon + '"></i>' +
        '<span>' + label + '</span>' +
        (active ? '<i class="fas fa-check theme-mode-check"></i>' : '') +
        '</button>';
    }

    function themeToggle(key, icon, title, desc, checked) {
      return '<label class="theme-toggle-row">' +
        '<div class="theme-toggle-info">' +
          '<div class="theme-toggle-icon"><i class="fas ' + icon + '"></i></div>' +
          '<div>' +
            '<strong>' + title + '</strong>' +
            '<span>' + desc + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="theme-switch' + (checked ? ' active' : '') + '" onclick="event.preventDefault();ThemeManager.toggleFeature(\'' + key + '\');ThemeManager.refreshSettingsModal();">' +
          '<div class="theme-switch-knob"></div>' +
        '</div>' +
      '</label>';
    }

    /* ============================================
       AUTO-SWITCH SCHEDULER
       ============================================ */
    var _autoSwitchInterval = null;

    function startAutoSwitch() {
      if (_autoSwitchInterval) clearInterval(_autoSwitchInterval);
      _autoSwitchInterval = setInterval(function() {
        if (TM.settings.mode === 'auto' && TM.settings.autoSwitch) {
          var current = getEffectiveMode();
          if (current !== TM.currentEffectiveMode) {
            applyTheme();
            console.log('[Theme Manager] 🌗 Auto-switched to', current);
          }
        }
      }, 60000); // Check every minute
    }

    /* ============================================
       SYSTEM PREFERENCE LISTENER
       ============================================ */
    if (window.matchMedia) {
      try {
        var darkMq = window.matchMedia('(prefers-color-scheme: dark)');
        var onSystemChange = function() {
          if (TM.settings.mode === 'auto' && !TM.settings.autoSwitch) {
            applyTheme();
          }
        };

        if (darkMq.addEventListener) {
          darkMq.addEventListener('change', onSystemChange);
        } else if (darkMq.addListener) {
          darkMq.addListener(onSystemChange);
        }
      } catch (e) {}
    }

    /* ============================================
       INIT
       ============================================ */
    function init() {
      TM.settings = loadSettings();
      applyTheme();
      startAutoSwitch();

      // Expose public API
      window.ThemeManager = ThemeManager;

      // Update toggle UI when DOM is ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ThemeManager.updateToggleUI);
      } else {
        ThemeManager.updateToggleUI();
      }

      // Watch for dynamically added toggles
      try {
        var obs = new MutationObserver(function() {
          ThemeManager.updateToggleUI();
        });
        obs.observe(document.body, { childList: true, subtree: true });
      } catch (e) {}

      console.log('[Theme Manager v1.0] ✅ Loaded');
      console.log('[Theme Manager] Settings:', TM.settings);
    }

    init();

  })();
}