# ══════════════════════════════════════════════════════════
#  PharmaCloud Backend — Auto Setup Script
#  Run: powershell -ExecutionPolicy Bypass -File setup-backend.ps1
# ══════════════════════════════════════════════════════════

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 PharmaCloud Backend Setup               ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ══════════════════════════════════════════════════════════
#  STEP 1: Create folder structure
# ══════════════════════════════════════════════════════════
Write-Host "📁 Creating folder structure..." -ForegroundColor Yellow

$root = "pharmacloud-backend"
if (Test-Path $root) {
    $confirm = Read-Host "⚠️  Folder '$root' exists. Overwrite? (y/N)"
    if ($confirm -ne "y") { Write-Host "Cancelled."; exit }
    Remove-Item -Recurse -Force $root
}

New-Item -ItemType Directory -Path $root | Out-Null
Set-Location $root

@("config","middleware","routes","services","db","utils","data") | ForEach-Object {
    New-Item -ItemType Directory -Path $_ -Force | Out-Null
}

Write-Host "✅ Folders created" -ForegroundColor Green

# ══════════════════════════════════════════════════════════
#  STEP 2: Write all files
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📝 Writing files..." -ForegroundColor Yellow

# ──────────────────────────────────────────────────────────
# package.json
# ──────────────────────────────────────────────────────────
Set-Content -Path "package.json" -Encoding UTF8 -Value @'
{
  "name": "pharmacloud-backend",
  "version": "1.0.0",
  "description": "PharmaCloud Pro - Backend Server",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node db/seed.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "compression": "^1.7.4",
    "morgan": "^1.10.0",
    "dotenv": "^16.4.5",
    "express-rate-limit": "^7.4.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "better-sqlite3": "^11.3.0",
    "stripe": "^16.9.0",
    "nodemailer": "^6.9.15",
    "otplib": "^12.0.1",
    "qrcode": "^1.5.4",
    "axios": "^1.7.7",
    "uuid": "^10.0.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "nodemon": "^3.1.7"
  },
  "engines": { "node": ">=18.0.0" }
}
'@

# ──────────────────────────────────────────────────────────
# .env.example
# ──────────────────────────────────────────────────────────
Set-Content -Path ".env.example" -Encoding UTF8 -Value @'
PORT=3000
NODE_ENV=development
APP_NAME=PharmaCloud
APP_URL=http://localhost:3000
CLIENT_URL=http://localhost:5500
JWT_SECRET=change_this_to_a_long_random_string_at_least_64_chars_please_change_me
JWT_EXPIRES_IN=7d
API_KEY_SALT=another_random_string_for_api_keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMOB_API_KEY=
PAYMOB_INTEGRATION_ID=
PAYMOB_IFRAME_ID=
PAYMOB_HMAC_SECRET=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=PharmaCloud <noreply@pharmacloud.app>
DB_PATH=./data/pharmacloud.db
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
'@

# ──────────────────────────────────────────────────────────
# .env (auto copy)
# ──────────────────────────────────────────────────────────
Copy-Item ".env.example" ".env"

# ──────────────────────────────────────────────────────────
# .gitignore
# ──────────────────────────────────────────────────────────
Set-Content -Path ".gitignore" -Encoding UTF8 -Value @'
node_modules/
.env
data/
*.log
.DS_Store
'@

# ──────────────────────────────────────────────────────────
# config/index.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "config/index.js" -Encoding UTF8 -Value @'
'use strict';
require('dotenv').config();

const config = {
  server: {
    port: parseInt(process.env.PORT || '3000'),
    env: process.env.NODE_ENV || 'development',
    appName: process.env.APP_NAME || 'PharmaCloud',
    appUrl: process.env.APP_URL || 'http://localhost:3000',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5500'
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'insecure_default_secret_CHANGE_ME',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    apiKeySalt: process.env.API_KEY_SALT || 'insecure_salt'
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    enabled: !!process.env.STRIPE_SECRET_KEY
  },
  paymob: {
    apiKey: process.env.PAYMOB_API_KEY || '',
    integrationId: process.env.PAYMOB_INTEGRATION_ID || '',
    iframeId: process.env.PAYMOB_IFRAME_ID || '',
    hmacSecret: process.env.PAYMOB_HMAC_SECRET || '',
    enabled: !!process.env.PAYMOB_API_KEY,
    baseUrl: 'https://accept.paymob.com/api'
  },
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'PharmaCloud <noreply@pharmacloud.app>',
    enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER)
  },
  db: { path: process.env.DB_PATH || './data/pharmacloud.db' },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
  }
};

module.exports = config;
'@

# ──────────────────────────────────────────────────────────
# utils/logger.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "utils/logger.js" -Encoding UTF8 -Value @'
'use strict';
const config = require('../config');
const colors = { reset:'\x1b[0m', red:'\x1b[31m', green:'\x1b[32m', yellow:'\x1b[33m', cyan:'\x1b[36m', magenta:'\x1b[35m', gray:'\x1b[90m' };
const ts = () => new Date().toISOString();
const fmt = (lvl, c, args) => [`${colors.gray}${ts()}${colors.reset} ${c}[${lvl}]${colors.reset}`, ...args];
module.exports = {
  info: (...a) => console.log(...fmt('INFO', colors.cyan, a)),
  success: (...a) => console.log(...fmt('OK', colors.green, a)),
  warn: (...a) => console.warn(...fmt('WARN', colors.yellow, a)),
  error: (...a) => console.error(...fmt('ERROR', colors.red, a)),
  debug: (...a) => { if (config.server.env === 'development') console.log(...fmt('DEBUG', colors.magenta, a)); }
};
'@

# ──────────────────────────────────────────────────────────
# utils/crypto.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "utils/crypto.js" -Encoding UTF8 -Value @'
'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
module.exports = {
  hashPassword: (p) => bcrypt.hash(p, 12),
  verifyPassword: (p, h) => bcrypt.compare(p, h),
  generateToken: (len = 32) => crypto.randomBytes(len).toString('hex'),
  generateApiKey: (prefix = 'pk') => `${prefix}_${crypto.randomBytes(24).toString('base64url')}`,
  hashApiKey: (k) => crypto.createHmac('sha256', config.security.apiKeySalt).update(k).digest('hex'),
  generateOTP: (digits = 6) => String(crypto.randomInt(0, Math.pow(10, digits))).padStart(digits, '0'),
  generateId: (prefix = '') => prefix ? `${prefix}_${crypto.randomBytes(12).toString('base64url')}` : crypto.randomBytes(12).toString('base64url'),
  maskEmail: (email) => { if (!email) return ''; const [u, d] = email.split('@'); return u.length <= 2 ? `${u[0]}***@${d}` : `${u[0]}${'*'.repeat(u.length - 2)}${u[u.length - 1]}@${d}`; }
};
'@

# ──────────────────────────────────────────────────────────
# db/index.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "db/index.js" -Encoding UTF8 -Value @'
'use strict';
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const dbDir = path.dirname(config.db.path);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(config.db.path);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  name TEXT NOT NULL, role TEXT DEFAULT 'user', tenant_id TEXT,
  twofa_secret TEXT, twofa_enabled INTEGER DEFAULT 0, twofa_backup_codes TEXT,
  email_verified INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')), last_login TEXT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, owner_email TEXT,
  plan TEXT DEFAULT 'basic', status TEXT DEFAULT 'trial',
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_data (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, device_id TEXT NOT NULL,
  key TEXT NOT NULL, data TEXT NOT NULL, vector_clock TEXT,
  updated_at TEXT DEFAULT (datetime('now')), UNIQUE(user_id, key)
);
CREATE INDEX IF NOT EXISTS idx_sync_user ON sync_data(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_updated ON sync_data(updated_at);

CREATE TABLE IF NOT EXISTS sync_changes (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, device_id TEXT NOT NULL,
  key TEXT NOT NULL, value TEXT NOT NULL, vector_clock TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_changes_user_date ON sync_changes(user_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY, user_id TEXT, tenant_id TEXT,
  amount REAL NOT NULL, currency TEXT DEFAULT 'EGP', gateway TEXT NOT NULL,
  gateway_id TEXT, status TEXT DEFAULT 'pending', metadata TEXT,
  created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reset_user ON password_resets(user_id);

CREATE TABLE IF NOT EXISTS email_queue (
  id TEXT PRIMARY KEY, to_email TEXT NOT NULL, subject TEXT NOT NULL,
  html TEXT, text TEXT, status TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0,
  last_error TEXT, created_at TEXT DEFAULT (datetime('now')), sent_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_email_status ON email_queue(status);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT, action TEXT NOT NULL,
  entity TEXT, entity_id TEXT, ip TEXT, user_agent TEXT, metadata TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);
`);

module.exports = {
  findUserByEmail: (email) => db.prepare('SELECT * FROM users WHERE email = ?').get(email),
  findUserById: (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id),
  createUser: (u) => db.prepare(`INSERT INTO users (id, email, password_hash, name, role, tenant_id) VALUES (@id, @email, @password_hash, @name, @role, @tenant_id)`).run(u),
  updateUser: (id, updates) => {
    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...updates, id });
  },
  upsertSyncData: (d) => db.prepare(`INSERT INTO sync_data (id, user_id, device_id, key, data, vector_clock, updated_at) VALUES (@id, @user_id, @device_id, @key, @data, @vector_clock, datetime('now')) ON CONFLICT(user_id, key) DO UPDATE SET data = @data, vector_clock = @vector_clock, device_id = @device_id, updated_at = datetime('now')`).run(d),
  getSyncData: (userId) => db.prepare('SELECT * FROM sync_data WHERE user_id = ?').all(userId),
  getSyncDataByKey: (userId, key) => db.prepare('SELECT * FROM sync_data WHERE user_id = ? AND key = ?').get(userId, key),
  logChange: (c) => db.prepare(`INSERT INTO sync_changes (id, user_id, device_id, key, value, vector_clock) VALUES (@id, @user_id, @device_id, @key, @value, @vector_clock)`).run(c),
  getChangesSince: (userId, since) => db.prepare(`SELECT * FROM sync_changes WHERE user_id = ? AND created_at > ? ORDER BY created_at ASC LIMIT 500`).all(userId, since),
  createPayment: (p) => db.prepare(`INSERT INTO payments (id, user_id, tenant_id, amount, currency, gateway, gateway_id, status, metadata) VALUES (@id, @user_id, @tenant_id, @amount, @currency, @gateway, @gateway_id, @status, @metadata)`).run(p),
  updatePayment: (id, updates) => {
    const fields = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
    return db.prepare(`UPDATE payments SET ${fields}, updated_at = datetime('now') WHERE id = @id`).run({ ...updates, id });
  },
  findPaymentById: (id) => db.prepare('SELECT * FROM payments WHERE id = ?').get(id),
  findPaymentByGatewayId: (gid) => db.prepare('SELECT * FROM payments WHERE gateway_id = ?').get(gid),
  createReset: (r) => db.prepare('INSERT INTO password_resets (token, user_id, expires_at) VALUES (@token, @user_id, @expires_at)').run(r),
  findReset: (token) => db.prepare(`SELECT * FROM password_resets WHERE token = ? AND used = 0 AND expires_at > datetime('now')`).get(token),
  markResetUsed: (token) => db.prepare('UPDATE password_resets SET used = 1 WHERE token = ?').run(token),
  enqueueEmail: (e) => db.prepare(`INSERT INTO email_queue (id, to_email, subject, html, text, status) VALUES (@id, @to_email, @subject, @html, @text, 'pending')`).run(e),
  getPendingEmails: (limit = 10) => db.prepare(`SELECT * FROM email_queue WHERE status = 'pending' AND attempts < 3 ORDER BY created_at ASC LIMIT ?`).all(limit),
  markEmailSent: (id) => db.prepare(`UPDATE email_queue SET status = 'sent', sent_at = datetime('now') WHERE id = ?`).run(id),
  markEmailFailed: (id, err) => db.prepare(`UPDATE email_queue SET attempts = attempts + 1, last_error = ? WHERE id = ?`).run(err, id),
  logAudit: (e) => db.prepare(`INSERT INTO audit_log (user_id, action, entity, entity_id, ip, user_agent, metadata) VALUES (@user_id, @action, @entity, @entity_id, @ip, @user_agent, @metadata)`).run(e),
  db
};
'@

# ──────────────────────────────────────────────────────────
# db/seed.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "db/seed.js" -Encoding UTF8 -Value @'
'use strict';
const db = require('./index');
const crypto = require('../utils/crypto');

(async () => {
  console.log('🌱 Seeding database...');
  const email = 'demo@pharmacloud.app';
  if (db.findUserByEmail(email)) { console.log('✅ Demo user already exists'); return; }
  const userId = crypto.generateId('usr');
  const tenantId = crypto.generateId('ten');
  const hash = await crypto.hashPassword('demo1234');
  db.createUser({ id: userId, email, password_hash: hash, name: 'Demo Admin', role: 'admin', tenant_id: tenantId });
  console.log('✅ Demo user created:');
  console.log('   Email: ' + email);
  console.log('   Password: demo1234');
})();
'@

# ──────────────────────────────────────────────────────────
# middleware/auth.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "middleware/auth.js" -Encoding UTF8 -Value @'
'use strict';
const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../db');
const logger = require('../utils/logger');

function verifyJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(auth.slice(7), config.security.jwtSecret);
    const user = db.findUserById(payload.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id };
    next();
  } catch (e) {
    logger.warn('[Auth]', e.message);
    res.status(401).json({ error: 'Unauthorized', message: e.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token' });
  }
}

function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return next();
  try {
    const payload = jwt.verify(auth.slice(7), config.security.jwtSecret);
    const user = db.findUserById(payload.userId);
    if (user) req.user = { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id };
  } catch (e) {}
  next();
}

function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.security.jwtSecret, { expiresIn: config.security.jwtExpiresIn });
}

module.exports = { verifyJWT, optionalAuth, signToken };
'@

# ──────────────────────────────────────────────────────────
# middleware/rateLimit.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "middleware/rateLimit.js" -Encoding UTF8 -Value @'
'use strict';
const rateLimit = require('express-rate-limit');
const config = require('../config');

const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'تم تجاوز الحد المسموح' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: { error: 'TooManyAuthAttempts', message: 'تم تجاوز عدد المحاولات — حاول بعد 15 دقيقة' }
});

const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'TooManyPayments', message: 'حاول بعد دقيقة' }
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.email || req.ip,
  message: { error: 'TooManyEmails', message: 'حاول بعد ساعة' }
});

module.exports = { generalLimiter, authLimiter, paymentLimiter, emailLimiter };
'@

# ──────────────────────────────────────────────────────────
# middleware/errorHandler.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "middleware/errorHandler.js" -Encoding UTF8 -Value @'
'use strict';
const logger = require('../utils/logger');
const config = require('../config');

function notFound(req, res) {
  res.status(404).json({ error: 'NotFound', message: `Route ${req.method} ${req.path} not found` });
}

function errorHandler(err, req, res, next) {
  logger.error('[Error]', err.message);
  const status = err.status || err.statusCode || 500;
  const isProd = config.server.env === 'production';
  res.status(status).json({
    error: err.name || 'InternalError',
    message: isProd && status === 500 ? 'حدث خطأ في السيرفر' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
}

module.exports = { notFound, errorHandler };
'@

# ──────────────────────────────────────────────────────────
# middleware/logger.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "middleware/logger.js" -Encoding UTF8 -Value @'
'use strict';
const morgan = require('morgan');
const logger = require('../utils/logger');
const config = require('../config');

module.exports = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  {
    stream: { write: (m) => logger.info(m.trim()) },
    skip: () => config.server.env === 'test'
  }
);
'@

# ──────────────────────────────────────────────────────────
# services/stripeService.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "services/stripeService.js" -Encoding UTF8 -Value @'
'use strict';
const config = require('../config');
const logger = require('../utils/logger');

let stripe = null;
function getStripe() {
  if (stripe) return stripe;
  if (!config.stripe.enabled) return null;
  stripe = require('stripe')(config.stripe.secretKey);
  logger.success('[Stripe] Initialized');
  return stripe;
}

async function createPaymentIntent({ amount, currency = 'usd', metadata = {}, customerEmail }) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  return s.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: currency.toLowerCase(),
    metadata,
    receipt_email: customerEmail,
    automatic_payment_methods: { enabled: true }
  });
}

async function createCheckoutSession({ amount, currency = 'usd', lineItems, successUrl, cancelUrl, metadata }) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  return s.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: lineItems || [{
      price_data: {
        currency: currency.toLowerCase(),
        product_data: { name: metadata?.productName || 'PharmaCloud Subscription' },
        unit_amount: Math.round(amount * 100)
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata
  });
}

async function refundPayment(paymentIntentId, amount) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  return s.refunds.create({
    payment_intent: paymentIntentId,
    amount: amount ? Math.round(amount * 100) : undefined
  });
}

function constructWebhookEvent(rawBody, signature) {
  const s = getStripe();
  if (!s) throw new Error('Stripe not configured');
  return s.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
}

module.exports = { getStripe, createPaymentIntent, createCheckoutSession, refundPayment, constructWebhookEvent };
'@

# ──────────────────────────────────────────────────────────
# services/paymobService.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "services/paymobService.js" -Encoding UTF8 -Value @'
'use strict';
const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

const BASE = config.paymob.baseUrl;
let cachedToken = null;
let tokenExpiry = 0;

async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  const res = await axios.post(`${BASE}/auth/tokens`, { api_key: config.paymob.apiKey });
  cachedToken = res.data.token;
  tokenExpiry = Date.now() + 50 * 60 * 1000;
  return cachedToken;
}

async function createOrder({ amount, currency = 'EGP', merchantOrderId, items }) {
  const token = await getAuthToken();
  const res = await axios.post(`${BASE}/ecommerce/orders`, {
    auth_token: token,
    delivery_needed: false,
    amount_cents: Math.round(amount * 100),
    currency,
    items: items || [],
    merchant_order_id: merchantOrderId || 'ORD_' + Date.now()
  });
  return res.data;
}

async function getPaymentKey({ orderId, amount, currency = 'EGP', billingData }) {
  const token = await getAuthToken();
  const res = await axios.post(`${BASE}/acceptance/payment_keys`, {
    auth_token: token,
    amount_cents: Math.round(amount * 100),
    expiration: 3600,
    order_id: orderId,
    billing_data: billingData,
    currency,
    integration_id: parseInt(config.paymob.integrationId)
  });
  return res.data.token;
}

async function createPayment({ amount, currency, customer, items, merchantOrderId }) {
  const order = await createOrder({ amount, currency, merchantOrderId, items: items || [] });
  const billingData = {
    email: customer?.email || 'na@na.com',
    first_name: customer?.firstName || 'Customer',
    last_name: customer?.lastName || 'PharmaCloud',
    phone_number: customer?.phone || '01000000000',
    country: 'EG',
    state: 'NA',
    city: customer?.city || 'Cairo',
    street: 'NA', building: 'NA', floor: 'NA', apartment: 'NA'
  };
  const paymentKey = await getPaymentKey({ orderId: order.id, amount, currency, billingData });
  return {
    orderId: order.id,
    paymentKey,
    iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${config.paymob.iframeId}?payment_token=${paymentKey}`
  };
}

function verifyHmac(data, receivedHmac) {
  const keys = ['amount_cents','created_at','currency','error_occured','has_parent_transaction','id','integration_id','is_3d_secure','is_auth','is_capture','is_refunded','is_standalone_payment','is_voided','order.id','owner','pending','source_data.pan','source_data.sub_type','source_data.type','success'];
  const concatenated = keys.map(k => {
    const parts = k.split('.');
    let val = data;
    for (const p of parts) val = val?.[p];
    return val;
  }).join('');
  const computed = crypto.createHmac('sha512', config.paymob.hmacSecret).update(concatenated).digest('hex');
  return computed === receivedHmac;
}

module.exports = { getAuthToken, createOrder, getPaymentKey, createPayment, verifyHmac };
'@

# ──────────────────────────────────────────────────────────
# services/emailService.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "services/emailService.js" -Encoding UTF8 -Value @'
'use strict';
const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');
const db = require('../db');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (!config.email.enabled) {
    logger.warn('[Email] Demo mode (no SMTP)');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.email.host, port: config.email.port, secure: config.email.secure,
    auth: { user: config.email.user, pass: config.email.pass },
    pool: true, maxConnections: 5, maxMessages: 100
  });
  logger.success('[Email] Transporter ready');
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    logger.info('[Email/Demo]', to, '|', subject);
    return { demo: true, messageId: 'demo_' + Date.now() };
  }
  const info = await t.sendMail({ from: config.email.from, to, subject, html, text });
  logger.success('[Email] Sent:', info.messageId);
  return info;
}

async function queueEmail(email) {
  const id = require('../utils/crypto').generateId('em');
  db.enqueueEmail({ id, ...email });
  return id;
}

async function processQueue() {
  const pending = db.getPendingEmails(5);
  for (const item of pending) {
    try {
      await sendEmail({ to: item.to_email, subject: item.subject, html: item.html, text: item.text });
      db.markEmailSent(item.id);
    } catch (e) {
      logger.error('[Email] Failed:', item.id, e.message);
      db.markEmailFailed(item.id, e.message);
    }
  }
}

const templates = {
  passwordReset: ({ name, resetUrl }) => ({
    subject: '🔐 استعادة كلمة المرور — PharmaCloud',
    html: `<div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f8fafc"><div style="background:linear-gradient(135deg,#00b884,#1E88E5);padding:30px;border-radius:20px 20px 0 0;text-align:center;color:#fff"><h1 style="margin:0;font-size:22px">استعادة كلمة المرور</h1></div><div style="background:#fff;padding:32px;border-radius:0 0 20px 20px"><p>مرحباً <strong>${name || ''}</strong>،</p><p style="color:#64748b">اضغط الزر لإنشاء كلمة مرور جديدة:</p><div style="text-align:center;margin:32px 0"><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#00b884,#1E88E5);color:#fff;padding:16px 40px;border-radius:14px;text-decoration:none;font-weight:900">إعادة تعيين كلمة المرور</a></div><div style="background:#fef3c7;padding:14px;border-radius:8px;font-size:13px;color:#92400e">⚠️ الرابط صالح 30 دقيقة</div></div></div>`
  }),
  verification: ({ code, name }) => ({
    subject: `✅ رمز التحقق: ${code}`,
    html: `<div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:500px;margin:auto;padding:20px;background:#f8fafc"><div style="background:#fff;padding:40px;border-radius:20px;text-align:center"><h1 style="font-size:22px">رمز التحقق</h1><p>مرحباً ${name || ''}</p><div style="background:linear-gradient(135deg,#f0fdf9,#eff6ff);border:2px dashed #00b88455;border-radius:16px;padding:24px;margin:24px 0"><div style="font-family:Courier New,monospace;font-size:42px;font-weight:900;letter-spacing:12px">${code}</div></div><p style="color:#94a3b8;font-size:13px">صالح 10 دقائق</p></div></div>`
  }),
  welcome: ({ name, pharmacyName, plan }) => ({
    subject: '🎉 مرحباً بك في PharmaCloud!',
    html: `<div dir="rtl" style="font-family:Cairo,Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#f8fafc"><div style="background:linear-gradient(135deg,#00b884,#1E88E5);padding:40px;border-radius:20px 20px 0 0;text-align:center;color:#fff"><h1 style="margin:10px 0;font-size:24px">أهلاً بك في PharmaCloud!</h1></div><div style="background:#fff;padding:32px;border-radius:0 0 20px 20px"><p>مرحباً <strong>${name}</strong>،</p><p style="color:#64748b">صيدلية <strong>${pharmacyName}</strong> أصبحت جاهزة على خطة <strong>${plan}</strong>.</p></div></div>`
  })
};

module.exports = { sendEmail, queueEmail, processQueue, templates };
'@

# ──────────────────────────────────────────────────────────
# services/syncService.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "services/syncService.js" -Encoding UTF8 -Value @'
'use strict';
const db = require('../db');
const crypto = require('../utils/crypto');

function mergeVectorClocks(a = {}, b = {}) {
  const m = { ...a };
  Object.keys(b).forEach(k => { m[k] = Math.max(m[k] || 0, b[k] || 0); });
  return m;
}

function compareClocks(a = {}, b = {}) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let aG = false, bG = false;
  for (const k of keys) {
    const va = a[k] || 0, vb = b[k] || 0;
    if (va > vb) aG = true;
    if (vb > va) bG = true;
  }
  if (aG && bG) return 'concurrent';
  if (aG) return 'a';
  if (bG) return 'b';
  return 'equal';
}

function mergeData(local, remote) {
  if (Array.isArray(local) && Array.isArray(remote)) {
    const map = new Map();
    [...local, ...remote].forEach(item => {
      if (item && item.id) {
        const ex = map.get(item.id);
        if (!ex) map.set(item.id, item);
        else {
          const et = new Date(ex.updatedAt || ex.createdAt || 0).getTime();
          const nt = new Date(item.updatedAt || item.createdAt || 0).getTime();
          map.set(item.id, nt >= et ? { ...ex, ...item } : ex);
        }
      }
    });
    return Array.from(map.values());
  }
  if (typeof local === 'object' && typeof remote === 'object' && local && remote) return { ...local, ...remote };
  return remote;
}

function handleIncomingSync({ userId, deviceId, data, vectorClock }) {
  const applied = [], conflicts = [];
  Object.keys(data || {}).forEach(key => {
    const existing = db.getSyncDataByKey(userId, key);
    if (!existing) {
      db.upsertSyncData({ id: crypto.generateId('sd'), user_id: userId, device_id: deviceId, key, data: JSON.stringify(data[key]), vector_clock: JSON.stringify(vectorClock || {}) });
      applied.push(key);
      return;
    }
    const localClock = JSON.parse(existing.vector_clock || '{}');
    const cmp = compareClocks(localClock, vectorClock || {});
    if (cmp === 'b' || cmp === 'equal') {
      db.upsertSyncData({ id: existing.id, user_id: userId, device_id: deviceId, key, data: JSON.stringify(data[key]), vector_clock: JSON.stringify(mergeVectorClocks(localClock, vectorClock || {})) });
      applied.push(key);
    } else if (cmp === 'concurrent') {
      const merged = mergeData(JSON.parse(existing.data), data[key]);
      db.upsertSyncData({ id: existing.id, user_id: userId, device_id: deviceId, key, data: JSON.stringify(merged), vector_clock: JSON.stringify(mergeVectorClocks(localClock, vectorClock || {})) });
      conflicts.push({ key, resolved: 'merged' });
    }
    db.logChange({ id: crypto.generateId('ch'), user_id: userId, device_id: deviceId, key, value: JSON.stringify(data[key]), vector_clock: JSON.stringify(vectorClock || {}) });
  });
  return { applied, conflicts };
}

function getFullSnapshot(userId) {
  const rows = db.getSyncData(userId);
  const data = {}, vectorClock = {};
  rows.forEach(row => {
    try { data[row.key] = JSON.parse(row.data); } catch (e) {}
    try {
      const vc = JSON.parse(row.vector_clock || '{}');
      Object.keys(vc).forEach(k => { vectorClock[k] = Math.max(vectorClock[k] || 0, vc[k] || 0); });
    } catch (e) {}
  });
  return { data, vectorClock, timestamp: new Date().toISOString() };
}

function getChangesSince(userId, since) { return db.getChangesSince(userId, since); }

module.exports = { handleIncomingSync, getFullSnapshot, getChangesSince, mergeVectorClocks, compareClocks, mergeData };
'@

# ──────────────────────────────────────────────────────────
# services/totpService.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "services/totpService.js" -Encoding UTF8 -Value @'
'use strict';
const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const crypto = require('crypto');

authenticator.options = { window: 1, step: 30 };

function generateSecret() { return authenticator.generateSecret(20); }

async function generateQRCode(email, secret, issuer = 'PharmaCloud') {
  const otpauth = authenticator.keyuri(email, issuer, secret);
  return QRCode.toDataURL(otpauth, { width: 240, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
}

function verifyToken(secret, token) {
  if (!secret || !token) return false;
  try { return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret }); }
  catch (e) { return false; }
}

function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

function hashBackupCode(code) {
  return crypto.createHash('sha256').update(String(code).replace(/-/g, '').toUpperCase()).digest('hex');
}

function verifyBackupCode(code, hashedCodes) {
  const hash = hashBackupCode(code);
  const idx = hashedCodes.indexOf(hash);
  if (idx === -1) return { valid: false };
  return { valid: true, index: idx };
}

module.exports = { generateSecret, generateQRCode, verifyToken, generateBackupCodes, hashBackupCode, verifyBackupCode };
'@

# ──────────────────────────────────────────────────────────
# routes/auth.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/auth.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const { z } = require('zod');
const db = require('../db');
const crypto = require('../utils/crypto');
const { signToken, verifyJWT } = require('../middleware/auth');
const { authLimiter, emailLimiter } = require('../middleware/rateLimit');
const emailService = require('../services/emailService');
const totpService = require('../services/totpService');
const logger = require('../utils/logger');

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  name: z.string().min(2).max(80),
  pharmacyName: z.string().min(2).max(80).optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().optional()
});

router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const data = signupSchema.parse(req.body);
    if (db.findUserByEmail(data.email)) return res.status(409).json({ error: 'EmailExists' });
    const userId = crypto.generateId('usr');
    const tenantId = crypto.generateId('ten');
    const hash = await crypto.hashPassword(data.password);
    db.createUser({ id: userId, email: data.email.toLowerCase(), password_hash: hash, name: data.name, role: 'admin', tenant_id: tenantId });
    try {
      const tpl = emailService.templates.welcome({ name: data.name, pharmacyName: data.pharmacyName || 'صيدليتك', plan: 'Trial' });
      await emailService.queueEmail({ to_email: data.email, subject: tpl.subject, html: tpl.html });
    } catch (e) {}
    const user = db.findUserById(userId);
    const token = signToken(user);
    res.status(201).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, twoFAEnabled: false } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'ValidationError', issues: err.errors });
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = db.findUserByEmail(data.email.toLowerCase());
    if (!user) return res.status(401).json({ error: 'InvalidCredentials' });
    const valid = await crypto.verifyPassword(data.password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'InvalidCredentials' });
    if (user.twofa_enabled) {
      if (!data.totpCode) return res.status(401).json({ error: 'TwoFARequired', requiresTwoFA: true });
      const totpValid = totpService.verifyToken(user.twofa_secret, data.totpCode);
      if (!totpValid) {
        const codes = JSON.parse(user.twofa_backup_codes || '[]');
        const { valid: bcValid, index } = totpService.verifyBackupCode(data.totpCode, codes);
        if (bcValid) { codes.splice(index, 1); db.updateUser(user.id, { twofa_backup_codes: JSON.stringify(codes) }); }
        else return res.status(401).json({ error: 'Invalid2FA' });
      }
    }
    db.updateUser(user.id, { last_login: new Date().toISOString() });
    const token = signToken(user);
    res.json({ success: true, token, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, twoFAEnabled: !!user.twofa_enabled } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: 'ValidationError', issues: err.errors });
    next(err);
  }
});

router.get('/me', verifyJWT, (req, res) => {
  const user = db.findUserById(req.user.id);
  res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, twoFAEnabled: !!user.twofa_enabled } });
});

router.post('/forgot-password', emailLimiter, async (req, res, next) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    res.json({ success: true, message: 'إذا كان البريد مسجلاً، ستصلك رسالة' });
    if (!email) return;
    const user = db.findUserByEmail(email);
    if (!user) return;
    const token = crypto.generateToken(32);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    db.createReset({ token, user_id: user.id, expires_at: expiresAt });
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5500'}/reset-password.html?token=${token}`;
    const tpl = emailService.templates.passwordReset({ name: user.name, resetUrl });
    await emailService.queueEmail({ to_email: email, subject: tpl.subject, html: tpl.html });
  } catch (err) { next(err); }
});

router.post('/reset-password', authLimiter, async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 8) return res.status(400).json({ error: 'InvalidInput' });
    const reset = db.findReset(token);
    if (!reset) return res.status(400).json({ error: 'InvalidToken' });
    const hash = await crypto.hashPassword(password);
    db.updateUser(reset.user_id, { password_hash: hash });
    db.markResetUsed(token);
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/2fa/setup', verifyJWT, async (req, res, next) => {
  try {
    const secret = totpService.generateSecret();
    const qrCode = await totpService.generateQRCode(req.user.email, secret);
    db.updateUser(req.user.id, { twofa_secret: secret });
    res.json({ success: true, secret, qrCode });
  } catch (err) { next(err); }
});

router.post('/2fa/enable', verifyJWT, (req, res, next) => {
  try {
    const { token } = req.body;
    const user = db.findUserById(req.user.id);
    if (!user.twofa_secret) return res.status(400).json({ error: 'SetupRequired' });
    if (!totpService.verifyToken(user.twofa_secret, token)) return res.status(400).json({ error: 'InvalidToken' });
    const backupCodes = totpService.generateBackupCodes(10);
    const hashed = backupCodes.map(c => totpService.hashBackupCode(c));
    db.updateUser(req.user.id, { twofa_enabled: 1, twofa_backup_codes: JSON.stringify(hashed) });
    res.json({ success: true, backupCodes });
  } catch (err) { next(err); }
});

router.post('/2fa/disable', verifyJWT, (req, res, next) => {
  try {
    const { token } = req.body;
    const user = db.findUserById(req.user.id);
    if (!user.twofa_enabled) return res.status(400).json({ error: 'NotEnabled' });
    if (!totpService.verifyToken(user.twofa_secret, token)) return res.status(400).json({ error: 'InvalidToken' });
    db.updateUser(req.user.id, { twofa_enabled: 0, twofa_secret: null, twofa_backup_codes: null });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/payments.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/payments.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const paymobService = require('../services/paymobService');
const { verifyJWT, optionalAuth } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimit');
const db = require('../db');
const crypto = require('../utils/crypto');
const logger = require('../utils/logger');

router.post('/stripe/create-payment-intent', paymentLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { amount, currency = 'usd', description, metadata } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'InvalidAmount' });
    const intent = await stripeService.createPaymentIntent({ amount, currency, metadata: { ...metadata, description, userId: req.user?.id }, customerEmail: req.user?.email });
    db.createPayment({ id: crypto.generateId('pay'), user_id: req.user?.id || null, tenant_id: req.user?.tenantId || null, amount, currency: currency.toUpperCase(), gateway: 'stripe', gateway_id: intent.id, status: 'pending', metadata: JSON.stringify(metadata || {}) });
    res.json({ success: true, clientSecret: intent.client_secret, paymentIntentId: intent.id });
  } catch (err) { logger.error('[Payments/Stripe]', err.message); next(err); }
});

router.post('/stripe/checkout', paymentLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { amount, currency = 'usd', lineItems, successUrl, cancelUrl, metadata } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'InvalidAmount' });
    const session = await stripeService.createCheckoutSession({ amount, currency, lineItems, successUrl: successUrl || `${process.env.CLIENT_URL}/payment-success.html`, cancelUrl: cancelUrl || `${process.env.CLIENT_URL}/payment-cancel.html`, metadata: { ...metadata, userId: req.user?.id } });
    db.createPayment({ id: crypto.generateId('pay'), user_id: req.user?.id || null, tenant_id: req.user?.tenantId || null, amount, currency: currency.toUpperCase(), gateway: 'stripe', gateway_id: session.id, status: 'pending', metadata: JSON.stringify(metadata || {}) });
    res.json({ success: true, sessionId: session.id, url: session.url });
  } catch (err) { next(err); }
});

router.post('/paymob/create', paymentLimiter, optionalAuth, async (req, res, next) => {
  try {
    const { amount, currency = 'EGP', customer, items, merchantOrderId } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'InvalidAmount' });
    const result = await paymobService.createPayment({ amount, currency, customer, items, merchantOrderId });
    db.createPayment({ id: crypto.generateId('pay'), user_id: req.user?.id || null, tenant_id: req.user?.tenantId || null, amount, currency, gateway: 'paymob', gateway_id: String(result.orderId), status: 'pending', metadata: JSON.stringify({ iframeUrl: result.iframeUrl }) });
    res.json({ success: true, orderId: result.orderId, iframeUrl: result.iframeUrl });
  } catch (err) { logger.error('[Payments/Paymob]', err.message); next(err); }
});

router.get('/status/:paymentId', optionalAuth, (req, res) => {
  const payment = db.findPaymentById(req.params.paymentId);
  if (!payment) return res.status(404).json({ error: 'NotFound' });
  if (payment.user_id && req.user?.id !== payment.user_id) return res.status(403).json({ error: 'Forbidden' });
  res.json({ success: true, payment: { id: payment.id, amount: payment.amount, currency: payment.currency, gateway: payment.gateway, status: payment.status, createdAt: payment.created_at } });
});

router.get('/history', verifyJWT, (req, res) => {
  const payments = db.db.prepare(`SELECT id, amount, currency, gateway, status, created_at FROM payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);
  res.json({ success: true, payments });
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/sync.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/sync.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const syncService = require('../services/syncService');
const { verifyJWT } = require('../middleware/auth');
const logger = require('../utils/logger');

router.post('/push', verifyJWT, (req, res, next) => {
  try {
    const { deviceId, data, vectorClock } = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'InvalidData' });
    const result = syncService.handleIncomingSync({ userId: req.user.id, deviceId: deviceId || 'unknown', data, vectorClock: vectorClock || {} });
    res.json({ success: true, applied: result.applied, conflicts: result.conflicts, timestamp: new Date().toISOString() });
  } catch (err) { next(err); }
});

router.get('/pull', verifyJWT, (req, res, next) => {
  try {
    const snapshot = syncService.getFullSnapshot(req.user.id);
    res.json({ success: true, ...snapshot });
  } catch (err) { next(err); }
});

router.get('/changes', verifyJWT, (req, res, next) => {
  try {
    const since = req.query.since || '1970-01-01T00:00:00.000Z';
    const changes = syncService.getChangesSince(req.user.id, since);
    res.json({ success: true, changes, count: changes.length, serverTime: new Date().toISOString() });
  } catch (err) { next(err); }
});

router.post('/sync', verifyJWT, (req, res, next) => {
  try {
    const { deviceId, data, vectorClock } = req.body || {};
    let pushResult = { applied: [], conflicts: [] };
    if (data && Object.keys(data).length > 0) {
      pushResult = syncService.handleIncomingSync({ userId: req.user.id, deviceId: deviceId || 'unknown', data, vectorClock: vectorClock || {} });
    }
    const snapshot = syncService.getFullSnapshot(req.user.id);
    res.json({ success: true, applied: pushResult.applied, conflicts: pushResult.conflicts, data: snapshot.data, vectorClock: snapshot.vectorClock, timestamp: snapshot.timestamp });
  } catch (err) { next(err); }
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/email.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/email.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');
const { verifyJWT } = require('../middleware/auth');
const { emailLimiter } = require('../middleware/rateLimit');

router.post('/test', verifyJWT, emailLimiter, async (req, res, next) => {
  try {
    const { to, subject, html } = req.body;
    const result = await emailService.sendEmail({ to: to || req.user.email, subject: subject || 'اختبار PharmaCloud', html: html || '<p>اختبار ✅</p>' });
    res.json({ success: true, messageId: result.messageId });
  } catch (err) { next(err); }
});

router.post('/queue/process', verifyJWT, async (req, res, next) => {
  try { await emailService.processQueue(); res.json({ success: true }); }
  catch (err) { next(err); }
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/webhooks.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/webhooks.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripeService');
const paymobService = require('../services/paymobService');
const db = require('../db');
const logger = require('../utils/logger');

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  let event;
  try { event = stripeService.constructWebhookEvent(req.body, signature); }
  catch (err) { return res.status(400).send(`Webhook Error: ${err.message}`); }
  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const payment = db.findPaymentByGatewayId(intent.id);
        if (payment) { db.updatePayment(payment.id, { status: 'succeeded' }); logger.success('[Stripe] Succeeded:', payment.id); }
        break;
      }
      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const payment = db.findPaymentByGatewayId(intent.id);
        if (payment) db.updatePayment(payment.id, { status: 'failed', metadata: JSON.stringify({ error: intent.last_payment_error?.message }) });
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const payment = db.findPaymentByGatewayId(charge.payment_intent);
        if (payment) db.updatePayment(payment.id, { status: 'refunded' });
        break;
      }
    }
    res.json({ received: true });
  } catch (err) { logger.error('[Webhook/Stripe]', err); res.status(500).json({ error: 'HandlerError' }); }
});

router.post('/paymob', express.json(), async (req, res) => {
  try {
    const { obj, hmac } = req.body;
    if (!obj || !hmac) return res.status(400).json({ error: 'InvalidPayload' });
    if (!paymobService.verifyHmac(obj, hmac)) return res.status(401).json({ error: 'InvalidHMAC' });
    const payment = db.findPaymentByGatewayId(String(obj.order?.id));
    if (payment) {
      if (obj.success) { db.updatePayment(payment.id, { status: 'succeeded' }); logger.success('[Paymob] Succeeded:', payment.id); }
      else db.updatePayment(payment.id, { status: 'failed', metadata: JSON.stringify({ error: obj.data?.message }) });
    }
    res.json({ success: true });
  } catch (err) { logger.error('[Webhook/Paymob]', err); res.status(500).json({ error: 'HandlerError' }); }
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/health.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/health.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();
const config = require('../config');
const db = require('../db');

router.get('/', (req, res) => {
  let dbOk = true;
  try { db.db.prepare('SELECT 1').get(); } catch (e) { dbOk = false; }
  res.json({
    status: dbOk ? 'healthy' : 'degraded',
    version: '1.0.0',
    app: config.server.appName,
    env: config.server.env,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: { database: dbOk, stripe: config.stripe.enabled, paymob: config.paymob.enabled, email: config.email.enabled }
  });
});

router.get('/ping', (req, res) => res.json({ pong: true, ts: Date.now() }));

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# routes/index.js
# ──────────────────────────────────────────────────────────
Set-Content -Path "routes/index.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const router = express.Router();

router.use('/auth', require('./auth'));
router.use('/payments', require('./payments'));
router.use('/sync', require('./sync'));
router.use('/email', require('./email'));
router.use('/webhooks', require('./webhooks'));
router.use('/health', require('./health'));

router.get('/', (req, res) => {
  res.json({
    name: 'PharmaCloud Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth', payments: '/api/payments',
      sync: '/api/sync', email: '/api/email',
      webhooks: '/api/webhooks', health: '/api/health'
    }
  });
});

module.exports = router;
'@

# ──────────────────────────────────────────────────────────
# server.js (MAIN ENTRY)
# ──────────────────────────────────────────────────────────
Set-Content -Path "server.js" -Encoding UTF8 -Value @'
'use strict';
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const config = require('./config');
const logger = require('./utils/logger');
const requestLogger = require('./middleware/logger');
const { generalLimiter } = require('./middleware/rateLimit');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const emailService = require('./services/emailService');

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));

const allowedOrigins = [
  config.server.clientUrl,
  'http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:5500'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    if (config.server.env === 'development') return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(requestLogger);

app.use('/api/', (req, res, next) => {
  if (req.path.startsWith('/webhooks')) return next();
  return generalLimiter(req, res, next);
});

app.use('/api', require('./routes'));

app.get('/', (req, res) => {
  res.json({ name: config.server.appName + ' Backend', version: '1.0.0', status: 'running', docs: '/api', health: '/api/health' });
});

app.use(notFound);
app.use(errorHandler);

setInterval(() => { emailService.processQueue().catch(() => {}); }, 30000);

const PORT = config.server.port;
const server = app.listen(PORT, () => {
  console.log('');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   🚀 PharmaCloud Backend is running!       ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log(`║   🌐 URL:     http://localhost:${PORT}          ║`);
  console.log(`║   📍 Env:     ${config.server.env.padEnd(28)}║`);
  console.log(`║   💳 Stripe:  ${(config.stripe.enabled ? '✅ Enabled' : '❌ Disabled').padEnd(28)}║`);
  console.log(`║   🏦 Paymob:  ${(config.paymob.enabled ? '✅ Enabled' : '❌ Disabled').padEnd(28)}║`);
  console.log(`║   📧 Email:   ${(config.email.enabled ? '✅ Enabled' : '⚠️  Demo mode').padEnd(28)}║`);
  console.log(`║   ☁️  Sync:    ✅ Enabled                     ║`);
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
});

function shutdown(signal) {
  logger.warn(`[Server] ${signal} received`);
  server.close(() => { logger.info('[Server] Closed'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (r) => logger.error('[UnhandledRejection]', r));
process.on('uncaughtException', (e) => { logger.error('[UncaughtException]', e); shutdown('EXCEPTION'); });

module.exports = app;
'@

# ══════════════════════════════════════════════════════════
#  STEP 3: Install dependencies
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📦 Installing npm packages (this takes 1-2 minutes)..." -ForegroundColor Yellow
Write-Host ""

npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Packages installed" -ForegroundColor Green

# ══════════════════════════════════════════════════════════
#  STEP 4: Seed database
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "🌱 Seeding database..." -ForegroundColor Yellow
npm run seed

# ══════════════════════════════════════════════════════════
#  STEP 5: Success message
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host ""
Write-Host "╔══════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║   ✅ Backend is ready!                       ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📂 Location: $(Get-Location)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 To start the server:" -ForegroundColor Yellow
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "🔑 Demo login:" -ForegroundColor Yellow
Write-Host "   Email:    demo@pharmacloud.app" -ForegroundColor White
Write-Host "   Password: demo1234" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Endpoints:" -ForegroundColor Yellow
Write-Host "   http://localhost:3000/api/health" -ForegroundColor White
Write-Host "   http://localhost:3000/api" -ForegroundColor White
Write-Host ""
Write-Host "💡 Don't forget to edit .env with your Stripe/Paymob/SMTP keys" -ForegroundColor Magenta
Write-Host ""