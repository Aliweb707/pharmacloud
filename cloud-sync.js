/* ============================================
   PHARMACLOUD - CLOUD SYNC v1.0
   Local-First + Conflict Resolution + Multi-Device
   ============================================ */
'use strict';

(function() {
  if (window.__PC_CLOUD_SYNC__) return;
  window.__PC_CLOUD_SYNC__ = true;

  const CS = {
    config: {
      provider: localStorage.getItem('pc_sync_provider') || 'auto',
      endpoint: localStorage.getItem('pc_sync_endpoint') || '',
      apiKey: localStorage.getItem('pc_sync_key') || '',
      deviceId: localStorage.getItem('pc_device_id') || generateDeviceId(),
      userId: null,
      autoSync: localStorage.getItem('pc_auto_sync') !== 'false',
      syncInterval: 30000, // 30 seconds
      conflictStrategy: 'last-write-wins', // 'last-write-wins' | 'merge' | 'manual'
      syncKeys: [
        'pc_tenants',
        'pc_users',
        'pc_subscriptions',
        'pc_t_demo_products',
        'pc_t_demo_orders',
        'pc_t_demo_customers',
        'pc_t_demo_prescriptions',
        'pc_t_demo_attendance',
        'pc_t_demo_batches'
      ]
    },
    state: {
      status: 'idle', // idle | syncing | online | offline | error
      lastSync: Number(localStorage.getItem('pc_last_sync') || 0),
      pendingChanges: 0,
      conflicts: [],
      isOnline: navigator.onLine,
      syncing: false
    },
    vectorClock: JSON.parse(localStorage.getItem('pc_vector_clock') || '{}'),
    changesLog: []
  };

  /* ============================================
     1. DEVICE ID
     ============================================ */
  function generateDeviceId() {
    const id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    try { localStorage.setItem('pc_device_id', id); } catch (e) {}
    return id;
  }

  /* ============================================
     2. VECTOR CLOCK
     ============================================ */
  function tick(key) {
    CS.vectorClock[key] = (CS.vectorClock[key] || 0) + 1;
    saveClock();
    return CS.vectorClock[key];
  }

  function saveClock() {
    try { localStorage.setItem('pc_vector_clock', JSON.stringify(CS.vectorClock)); }
    catch (e) {}
  }

  function compareClocks(a, b) {
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    let aGreater = false, bGreater = false;
    for (const k of keys) {
      const va = a?.[k] || 0;
      const vb = b?.[k] || 0;
      if (va > vb) aGreater = true;
      if (vb > va) bGreater = true;
    }
    if (aGreater && bGreater) return 'concurrent';
    if (aGreater) return 'a';
    if (bGreater) return 'b';
    return 'equal';
  }

  /* ============================================
     3. CHANGE TRACKING
     ============================================ */
  function trackChange(key, oldValue, newValue) {
    const change = {
      id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      key,
      oldValue,
      newValue,
      deviceId: CS.config.deviceId,
      userId: CS.config.userId,
      timestamp: new Date().toISOString(),
      clock: { [CS.config.deviceId]: tick(key) }
    };
    CS.changesLog.push(change);
    if (CS.changesLog.length > 500) CS.changesLog.shift();
    savePendingChanges();
    CS.state.pendingChanges = CS.changesLog.length;
    dispatchStateChange();
  }

  function savePendingChanges() {
    try {
      localStorage.setItem('pc_pending_changes', JSON.stringify(CS.changesLog));
    } catch (e) {}
  }

  // Monkey-patch localStorage for tracking (only for synced keys)
  function patchLocalStorage() {
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function(key, value) {
      const isSynced = CS.config.syncKeys.some(k => key.startsWith(k));
      if (isSynced && window.__PC_SYNC_APPLYING__ !== true) {
        try {
          const oldValue = this.getItem(key);
          if (oldValue !== value) {
            // Track after applying
            setTimeout(() => {
              trackChange(key, oldValue, value);
            }, 0);
          }
        } catch (e) {}
      }
      return originalSetItem.call(this, key, value);
    };
  }

  /* ============================================
     4. SNAPSHOT BUILDER
     ============================================ */
  function buildSnapshot() {
    const snapshot = {
      version: '1.0',
      deviceId: CS.config.deviceId,
      userId: CS.config.userId,
      timestamp: new Date().toISOString(),
      vectorClock: { ...CS.vectorClock },
      data: {}
    };

    CS.config.syncKeys.forEach(key => {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) {
          snapshot.data[key] = JSON.parse(val);
        }
      } catch (e) {}
    });

    return snapshot;
  }

  /* ============================================
     5. APPLY SNAPSHOT
     ============================================ */
  function applySnapshot(snapshot, strategy = CS.config.conflictStrategy) {
    if (!snapshot || !snapshot.data) return 0;

    window.__PC_SYNC_APPLYING__ = true;
    let applied = 0;

    Object.keys(snapshot.data).forEach(key => {
      try {
        const localRaw = localStorage.getItem(key);
        const localVal = localRaw ? JSON.parse(localRaw) : null;
        const remoteVal = snapshot.data[key];

        // No conflict
        if (localRaw === null || JSON.stringify(localVal) === JSON.stringify(remoteVal)) {
          if (localRaw === null) {
            localStorage.setItem(key, JSON.stringify(remoteVal));
            applied++;
          }
          return;
        }

        // Conflict resolution
        const resolved = resolveConflict(localVal, remoteVal, key, strategy);
        if (resolved !== undefined) {
          localStorage.setItem(key, JSON.stringify(resolved));
          applied++;
        }
      } catch (e) {
        console.warn('[CloudSync] Apply failed for:', key, e);
      }
    });

    window.__PC_SYNC_APPLYING__ = false;

    // Merge vector clocks
    if (snapshot.vectorClock) {
      Object.keys(snapshot.vectorClock).forEach(dev => {
        CS.vectorClock[dev] = Math.max(
          CS.vectorClock[dev] || 0,
          snapshot.vectorClock[dev] || 0
        );
      });
      saveClock();
    }

    return applied;
  }

  /* ============================================
     6. CONFLICT RESOLUTION
     ============================================ */
  function resolveConflict(localVal, remoteVal, key, strategy) {
    switch (strategy) {
      case 'last-write-wins':
        return remoteVal; // Assume remote is newer

      case 'merge':
        return mergeValues(localVal, remoteVal);

      case 'manual':
        CS.state.conflicts.push({
          key,
          localVal,
          remoteVal,
          timestamp: new Date().toISOString()
        });
        return undefined;

      default:
        return remoteVal;
    }
  }

  function mergeValues(local, remote) {
    // Array merge (by id)
    if (Array.isArray(local) && Array.isArray(remote)) {
      const map = new Map();
      [...local, ...remote].forEach(item => {
        if (item && item.id) {
          const existing = map.get(item.id);
          if (!existing) {
            map.set(item.id, item);
          } else {
            // Merge — prefer item with more properties or newer
            const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
            const newTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
            if (newTime >= existingTime) map.set(item.id, { ...existing, ...item });
          }
        }
      });
      return Array.from(map.values());
    }

    // Object merge
    if (typeof local === 'object' && typeof remote === 'object') {
      return { ...local, ...remote };
    }

    return remote;
  }

  /* ============================================
     7. SYNC OPERATIONS
     ============================================ */
  async function syncNow(options = {}) {
    if (CS.state.syncing) return { skipped: true };
    if (!CS.state.isOnline) return { offline: true };

    CS.state.syncing = true;
    setStatus('syncing');

    try {
      const snapshot = buildSnapshot();

      if (!CS.config.endpoint) {
        // Local-only: just save snapshot to localStorage as "cloud" simulation
        localStorage.setItem('pc_cloud_snapshot', JSON.stringify(snapshot));
        CS.state.lastSync = Date.now();
        localStorage.setItem('pc_last_sync', CS.state.lastSync.toString());
        setStatus('online');
        return { success: true, local: true, items: Object.keys(snapshot.data).length };
      }

      // Real sync to endpoint
      const res = await fetch(CS.config.endpoint + '/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CS.config.apiKey ? { 'Authorization': 'Bearer ' + CS.config.apiKey } : {})
        },
        body: JSON.stringify(snapshot),
        signal: AbortSignal.timeout(15000)
      });

      if (!res.ok) throw new Error('Sync failed: ' + res.status);

      const remote = await res.json();

      // Apply remote changes
      const applied = applySnapshot(remote);

      // Clear pending changes
      CS.changesLog = [];
      savePendingChanges();
      CS.state.pendingChanges = 0;
      CS.state.lastSync = Date.now();
      localStorage.setItem('pc_last_sync', CS.state.lastSync.toString());

      setStatus('online');
      dispatchStateChange();

      return {
        success: true,
        applied,
        total: Object.keys(remote.data || {}).length,
        duration: Date.now() - CS.state.lastSync
      };
    } catch (e) {
      console.error('[CloudSync] Sync error:', e);
      setStatus('error');
      return { success: false, error: e.message };
    } finally {
      CS.state.syncing = false;
    }
  }

  /* ============================================
     8. PUSH (send changes only)
     ============================================ */
  async function pushChanges() {
    if (CS.changesLog.length === 0) return { nothing: true };
    if (!CS.config.endpoint) return { local: true };

    try {
      const res = await fetch(CS.config.endpoint + '/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CS.config.apiKey ? { 'Authorization': 'Bearer ' + CS.config.apiKey } : {})
        },
        body: JSON.stringify({
          deviceId: CS.config.deviceId,
          userId: CS.config.userId,
          changes: CS.changesLog
        })
      });

      if (!res.ok) throw new Error('Push failed');

      CS.changesLog = [];
      savePendingChanges();
      CS.state.pendingChanges = 0;

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /* ============================================
     9. PULL (get changes only)
     ============================================ */
  async function pullChanges(since = CS.state.lastSync) {
    if (!CS.config.endpoint) return { local: true };

    try {
      const res = await fetch(
        CS.config.endpoint + `/changes?since=${since}&deviceId=${CS.config.deviceId}`,
        {
          headers: CS.config.apiKey ? { 'Authorization': 'Bearer ' + CS.config.apiKey } : {}
        }
      );

      if (!res.ok) throw new Error('Pull failed');

      const data = await res.json();
      const applied = applySnapshot({ data: data.changes || {} });

      return { success: true, applied };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /* ============================================
     10. AUTO SYNC
     ============================================ */
  let syncTimer = null;

  function startAutoSync() {
    if (syncTimer) clearInterval(syncTimer);
    if (!CS.config.autoSync) return;

    syncTimer = setInterval(() => {
      if (CS.state.isOnline && !CS.state.syncing) {
        syncNow().catch(() => {});
      }
    }, CS.config.syncInterval);

    // Also sync on visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && CS.state.isOnline) {
        syncNow().catch(() => {});
      }
    });

    // Sync on online event
    window.addEventListener('online', () => {
      CS.state.isOnline = true;
      setStatus('online');
      setTimeout(() => syncNow().catch(() => {}), 2000);
    });

    window.addEventListener('offline', () => {
      CS.state.isOnline = false;
      setStatus('offline');
    });

    // Sync before unload
    window.addEventListener('beforeunload', () => {
      if (CS.state.pendingChanges > 0 && CS.state.isOnline) {
        try { pushChanges(); } catch (e) {}
      }
    });
  }

  /* ============================================
     11. STATE MANAGEMENT
     ============================================ */
  function setStatus(status) {
    CS.state.status = status;
    document.documentElement.dataset.syncStatus = status;
    updateStatusUI();
  }

  function dispatchStateChange() {
    window.dispatchEvent(new CustomEvent('cloudsync:state', { detail: { ...CS.state } }));
  }

  function updateStatusUI() {
    let indicator = document.getElementById('pc-sync-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'pc-sync-indicator';
      indicator.className = 'pc-sync-indicator';
      document.body.appendChild(indicator);
    }

    const status = CS.state.status;
    const icons = {
      idle: 'fa-cloud',
      syncing: 'fa-sync-alt fa-spin',
      online: 'fa-cloud-check',
      offline: 'fa-cloud-slash',
      error: 'fa-exclamation-triangle'
    };
    const labels = {
      idle: 'جاهز',
      syncing: 'جاري المزامنة...',
      online: 'متزامن',
      offline: 'بدون اتصال',
      error: 'خطأ في المزامنة'
    };

    indicator.className = 'pc-sync-indicator pc-sync-' + status;
    indicator.innerHTML = `
      <i class="fas ${icons[status] || 'fa-cloud'}"></i>
      <span class="pc-sync-text">${labels[status] || status}</span>
      ${CS.state.pendingChanges > 0 ? `<span class="pc-sync-badge">${CS.state.pendingChanges}</span>` : ''}
    `;
    indicator.title = `آخر مزامنة: ${CS.state.lastSync ? new Date(CS.state.lastSync).toLocaleString('ar-EG') : 'لم تتم بعد'}`;

    // Auto-hide if online and no pending
    if (status === 'online' && CS.state.pendingChanges === 0) {
      setTimeout(() => {
        indicator.style.opacity = '0.3';
        setTimeout(() => { indicator.style.opacity = '1'; }, 3000);
      }, 2000);
    }
  }

  /* ============================================
     12. SETTINGS UI
     ============================================ */
  function openSettings() {
    const modal = document.getElementById('phModalBox');
    if (!modal) return;

    const lastSyncText = CS.state.lastSync
      ? new Date(CS.state.lastSync).toLocaleString('ar-EG')
      : 'لم تتم بعد';

    modal.innerHTML = `
      <div class="ph-modal-head" style="background:linear-gradient(135deg,#7c3aed,#1E88E5);color:#fff">
        <h3 style="color:#fff"><i class="fas fa-cloud"></i> المزامنة السحابية</h3>
        <button class="ph-modal-close" style="background:rgba(255,255,255,.2);color:#fff" onclick="phCloseModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="ph-modal-body cs-modal-body">

        <div class="cs-status-card cs-status-${CS.state.status}">
          <div class="cs-status-icon">
            <i class="fas ${CS.state.status === 'syncing' ? 'fa-sync-alt fa-spin' : CS.state.status === 'online' ? 'fa-cloud-check' : 'fa-cloud'}"></i>
          </div>
          <div class="cs-status-info">
            <strong>${CS.state.status === 'syncing' ? 'جاري المزامنة...' : CS.state.status === 'online' ? 'متصل ومتزامن' : CS.state.status === 'error' ? 'حدث خطأ' : CS.state.status === 'offline' ? 'غير متصل' : 'جاهز'}</strong>
            <span>آخر مزامنة: ${lastSyncText}</span>
          </div>
          <button class="cs-sync-now-btn" onclick="CloudSync.syncNow().then(r=>r.success&&Utils.toast('✅ تمت المزامنة','success'))">
            <i class="fas fa-sync"></i>
          </button>
        </div>

        <div class="cs-stats-grid">
          <div class="cs-stat">
            <div class="cs-stat-value">${CS.state.pendingChanges}</div>
            <div class="cs-stat-label">تغييرات معلقة</div>
          </div>
          <div class="cs-stat">
            <div class="cs-stat-value">${CS.state.conflicts.length}</div>
            <div class="cs-stat-label">تعارضات</div>
          </div>
          <div class="cs-stat">
            <div class="cs-stat-value">${Object.keys(CS.vectorClock).length}</div>
            <div class="cs-stat-label">أجهزة</div>
          </div>
        </div>

        <div class="cs-section">
          <div class="cs-section-title">إعدادات</div>

          <label class="cs-toggle-row">
            <div>
              <strong>مزامنة تلقائية</strong>
              <small>مزامنة كل ${CS.config.syncInterval / 1000} ثانية</small>
            </div>
            <input type="checkbox" ${CS.config.autoSync ? 'checked' : ''}
                   onchange="CloudSync.setAutoSync(this.checked)">
          </label>

          <div class="cs-field">
            <label>Cloud Endpoint</label>
            <input type="url" id="cs-endpoint" value="${CS.config.endpoint}"
                   placeholder="https://your-backend.com/api/sync">
            <small>اتركه فارغاً للمزامنة المحلية فقط</small>
          </div>

          <div class="cs-field">
            <label>API Key</label>
            <input type="password" id="cs-apikey" value="${CS.config.apiKey}" placeholder="sk_...">
          </div>

          <div class="cs-field">
            <label>استراتيجية التعارض</label>
            <select id="cs-strategy">
              <option value="last-write-wins" ${CS.config.conflictStrategy === 'last-write-wins' ? 'selected' : ''}>الأحدث يفوز (موصى به)</option>
              <option value="merge" ${CS.config.conflictStrategy === 'merge' ? 'selected' : ''}>دمج ذكي</option>
              <option value="manual" ${CS.config.conflictStrategy === 'manual' ? 'selected' : ''}>يدوي</option>
            </select>
          </div>

          <div class="cs-device-info">
            <div>
              <strong>معرّف الجهاز</strong>
              <code>${CS.config.deviceId}</code>
            </div>
          </div>
        </div>

        <div class="cs-section">
          <div class="cs-section-title">أدوات متقدمة</div>
          <div class="cs-actions-grid">
            <button class="cs-action-btn" onclick="CloudSync.forceFullSync()">
              <i class="fas fa-download"></i> مزامنة كاملة
            </button>
            <button class="cs-action-btn" onclick="CloudSync.exportSnapshot()">
              <i class="fas fa-file-export"></i> تصدير Snapshot
            </button>
            <button class="cs-action-btn danger" onclick="CloudSync.clearLocal()">
              <i class="fas fa-trash"></i> مسح البيانات المحلية
            </button>
            <button class="cs-action-btn" onclick="CloudSync.resetSync()">
              <i class="fas fa-redo"></i> إعادة تعيين المزامنة
            </button>
          </div>
        </div>

      </div>
      <div class="ph-modal-foot">
        <button class="btn btn-outline" onclick="phCloseModal()">إلغاء</button>
        <button class="btn btn-primary" onclick="CloudSync.saveSettings()">
          <i class="fas fa-save"></i> حفظ
        </button>
      </div>
    `;

    document.getElementById('phModalOverlay').classList.add('open');
  }

  /* ============================================
     13. INIT
     ============================================ */
  function init() {
    patchLocalStorage();
    updateStatusUI();
    startAutoSync();

    // Listen for auth state
    setInterval(() => {
      try {
        const session = (typeof DB !== 'undefined' && DB.getSession) ? DB.getSession() : null;
        if (session && session.userId && session.userId !== CS.config.userId) {
          CS.config.userId = session.userId;
          setTimeout(() => syncNow().catch(() => {}), 2000);
        }
      } catch (e) {}
    }, 5000);

    // Initial sync
    setTimeout(() => syncNow().catch(() => {}), 3000);

    console.log('[CloudSync v1.0] ✅ Ready', {
      deviceId: CS.config.deviceId,
      autoSync: CS.config.autoSync,
      pending: CS.state.pendingChanges
    });
  }

  /* ============================================
     PUBLIC API
     ============================================ */
  window.CloudSync = {
    syncNow,
    push: pushChanges,
    pull: pullChanges,

    buildSnapshot,
    applySnapshot,

    openSettings,

    setAutoSync: (v) => {
      CS.config.autoSync = v;
      localStorage.setItem('pc_auto_sync', v ? 'true' : 'false');
      if (v) startAutoSync();
      else if (syncTimer) clearInterval(syncTimer);
    },

    saveSettings: () => {
      CS.config.endpoint = document.getElementById('cs-endpoint').value.trim();
      CS.config.apiKey = document.getElementById('cs-apikey').value.trim();
      CS.config.conflictStrategy = document.getElementById('cs-strategy').value;

      try {
        localStorage.setItem('pc_sync_endpoint', CS.config.endpoint);
        localStorage.setItem('pc_sync_key', CS.config.apiKey);
      } catch (e) {}

      phCloseModal();
      if (window.Utils) Utils.toast('✅ تم حفظ الإعدادات', 'success');
      syncNow().catch(() => {});
    },

    forceFullSync: async () => {
      const res = await syncNow();
      if (res.success && window.Utils) Utils.toast('✅ تمت المزامنة الكاملة', 'success');
    },

    exportSnapshot: () => {
      const snapshot = buildSnapshot();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pharmacloud-snapshot-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    clearLocal: () => {
      if (!confirm('سيتم مسح كل البيانات المحلية. متأكد؟')) return;
      CS.config.syncKeys.forEach(key => localStorage.removeItem(key));
      if (window.Utils) Utils.toast('تم مسح البيانات', 'warning');
    },

    resetSync: () => {
      if (!confirm('إعادة تعيين المزامنة؟')) return;
      localStorage.removeItem('pc_last_sync');
      localStorage.removeItem('pc_vector_clock');
      localStorage.removeItem('pc_pending_changes');
      CS.vectorClock = {};
      CS.changesLog = [];
      CS.state.lastSync = 0;
      CS.state.pendingChanges = 0;
      updateStatusUI();
      if (window.Utils) Utils.toast('تم إعادة التعيين', 'success');
    },

    getState: () => ({ ...CS.state }),
    getConfig: () => ({ ...CS.config }),
    getVectorClock: () => ({ ...CS.vectorClock })
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[CloudSync v1.0] 🚀 Ready');
})();