/* ============================================
   PHARMACLOUD - API CLIENT v1.0
   Frontend ↔ Backend Communication Layer
   ============================================ */
'use strict';

(function() {
  if (window.PharmaAPI) {
    console.log('[API Client] Already loaded');
    return;
  }

  // ============================================
  // CONFIG
  // ============================================
  const API = {
    baseURL: localStorage.getItem('pc_api_url') || 'http://localhost:3000',
    timeout: 15000,
    token: null,
    user: null,
    isOnline: navigator.onLine,
    pendingRequests: 0
  };

  // ============================================
  // TOKEN MANAGEMENT
  // ============================================
  function loadToken() {
    try {
      API.token = localStorage.getItem('pc_jwt_token') || null;
      const userStr = localStorage.getItem('pc_jwt_user');
      API.user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
      API.token = null;
      API.user = null;
    }
  }

  function saveToken(token, user) {
    try {
      if (token) {
        localStorage.setItem('pc_jwt_token', token);
        API.token = token;
      }
      if (user) {
        localStorage.setItem('pc_jwt_user', JSON.stringify(user));
        API.user = user;
      }
    } catch (e) {
      console.warn('[API] Failed to save token:', e);
    }
  }

  function clearToken() {
    try {
      localStorage.removeItem('pc_jwt_token');
      localStorage.removeItem('pc_jwt_user');
      API.token = null;
      API.user = null;
    } catch (e) {}
  }

  // ============================================
  // HTTP CORE
  // ============================================
  async function request(method, path, body, options) {
    options = options || {};
    const url = API.baseURL + path;

    API.pendingRequests++;

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (API.token && !options.skipAuth) {
      headers['Authorization'] = 'Bearer ' + API.token;
    }

    const fetchOptions = {
      method: method,
      headers: headers
    };

    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      fetchOptions.body = JSON.stringify(body);
    }

    // Timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(function() { controller.abort(); }, API.timeout);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      let data = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.indexOf('application/json') !== -1) {
        data = await response.json();
      } else {
        data = { text: await response.text() };
      }

      API.pendingRequests--;

      if (!response.ok) {
        // Handle 401 — token expired
        if (response.status === 401 && !options.skipAuth) {
          console.warn('[API] Unauthorized — clearing token');
          clearToken();
        }

        const error = new Error(data.message || data.error || 'Request failed');
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (e) {
      API.pendingRequests--;
      clearTimeout(timeoutId);

      if (e.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw e;
    }
  }

  // ============================================
  // HEALTH
  // ============================================
  async function health() {
    try {
      return await request('GET', '/api/health', null, { skipAuth: true });
    } catch (e) {
      return { status: 'offline', error: e.message };
    }
  }

  // ============================================
  // AUTH
  // ============================================
  async function signup(data) {
    const result = await request('POST', '/api/auth/signup', {
      email: data.email,
      password: data.password,
      name: data.name,
      pharmacyName: data.pharmacyName || data.name
    }, { skipAuth: true });

    if (result.success && result.token) {
      saveToken(result.token, result.user);
    }
    return result;
  }

  async function login(email, password, totpCode) {
    const body = { email: email, password: password };
    if (totpCode) body.totpCode = totpCode;

    const result = await request('POST', '/api/auth/login', body, { skipAuth: true });

    if (result.success && result.token) {
      saveToken(result.token, result.user);
    }
    return result;
  }

  async function me() {
    if (!API.token) return null;
    try {
      const result = await request('GET', '/api/auth/me');
      if (result.success && result.user) {
        saveToken(null, result.user);
        return result.user;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async function forgotPassword(email) {
    return request('POST', '/api/auth/forgot-password', { email: email }, { skipAuth: true });
  }

  async function resetPassword(token, password) {
    return request('POST', '/api/auth/reset-password', {
      token: token,
      password: password
    }, { skipAuth: true });
  }

  function logout() {
    clearToken();
  }

  // ============================================
  // 2FA
  // ============================================
  async function setup2FA() {
    return request('POST', '/api/auth/2fa/setup');
  }

  async function enable2FA(token) {
    return request('POST', '/api/auth/2fa/enable', { token: token });
  }

  async function disable2FA(token) {
    return request('POST', '/api/auth/2fa/disable', { token: token });
  }

  // ============================================
  // CLOUD SYNC
  // ============================================
  async function syncPush(data, vectorClock, deviceId) {
    return request('POST', '/api/sync/push', {
      deviceId: deviceId || getDeviceId(),
      data: data,
      vectorClock: vectorClock || {}
    });
  }

  async function syncPull() {
    return request('GET', '/api/sync/pull');
  }

  async function syncChanges(since) {
    const path = '/api/sync/changes' + (since ? '?since=' + encodeURIComponent(since) : '');
    return request('GET', path);
  }

  async function sync(data, vectorClock) {
    return request('POST', '/api/sync/sync', {
      deviceId: getDeviceId(),
      data: data || {},
      vectorClock: vectorClock || {}
    });
  }

  // ============================================
  // PAYMENTS
  // ============================================
  async function stripeCreateIntent(amount, currency, metadata) {
    return request('POST', '/api/payments/stripe/create-payment-intent', {
      amount: amount,
      currency: currency || 'usd',
      metadata: metadata || {}
    });
  }

  async function stripeCheckout(amount, currency, options) {
    options = options || {};
    return request('POST', '/api/payments/stripe/checkout', {
      amount: amount,
      currency: currency || 'usd',
      lineItems: options.lineItems,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      metadata: options.metadata || {}
    });
  }

  async function paymobCreate(amount, currency, customer, items) {
    return request('POST', '/api/payments/paymob/create', {
      amount: amount,
      currency: currency || 'EGP',
      customer: customer,
      items: items
    });
  }

  async function paymentHistory() {
    return request('GET', '/api/payments/history');
  }

  async function paymentStatus(paymentId) {
    return request('GET', '/api/payments/status/' + paymentId);
  }

  // ============================================
  // HELPERS
  // ============================================
  function getDeviceId() {
    let id = localStorage.getItem('pc_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem('pc_device_id', id);
    }
    return id;
  }

  function isLoggedIn() {
    return !!API.token;
  }

  function getUser() {
    return API.user;
  }

  function setBaseURL(url) {
    API.baseURL = url.replace(/\/+$/, '');
    localStorage.setItem('pc_api_url', API.baseURL);
  }

  // ============================================
  // NETWORK MONITORING
  // ============================================
  window.addEventListener('online', function() {
    API.isOnline = true;
    console.log('[API] Online');
  });

  window.addEventListener('offline', function() {
    API.isOnline = false;
    console.log('[API] Offline');
  });

  // ============================================
  // INITIALIZATION
  // ============================================
  loadToken();

  // ============================================
  // PUBLIC API
  // ============================================
  window.PharmaAPI = {
    // Config
    config: API,
    setBaseURL: setBaseURL,
    getBaseURL: function() { return API.baseURL; },

    // Health
    health: health,

    // Auth
    signup: signup,
    login: login,
    me: me,
    logout: logout,
    forgotPassword: forgotPassword,
    resetPassword: resetPassword,

    // 2FA
    setup2FA: setup2FA,
    enable2FA: enable2FA,
    disable2FA: disable2FA,

    // Sync
    syncPush: syncPush,
    syncPull: syncPull,
    syncChanges: syncChanges,
    sync: sync,

    // Payments
    stripeCreateIntent: stripeCreateIntent,
    stripeCheckout: stripeCheckout,
    paymobCreate: paymobCreate,
    paymentHistory: paymentHistory,
    paymentStatus: paymentStatus,

    // Helpers
    isLoggedIn: isLoggedIn,
    getUser: getUser,
    getToken: function() { return API.token; },
    clearToken: clearToken
  };

  console.log('[API Client] ✅ Loaded');
  console.log('[API Client] Base URL:', API.baseURL);
  console.log('[API Client] Logged in:', isLoggedIn());
})();