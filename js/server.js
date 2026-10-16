const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let mailer = null;
if (process.env.SMTP_HOST) {
  mailer = require('nodemailer').createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';
const DEMO = !mailer || process.env.DEMO_MODE === 'true';
const PUBLIC = path.join(__dirname, 'public');
const DATA = path.join(__dirname, 'data');
const DB = path.join(DATA, 'users.json');
const COOKIE = 'rc_sid';
const DAY = 86400000;
const CODE_TTL = 5 * 60000;
const LOCK_MS = 15 * 60000;

fs.mkdirSync(DATA, { recursive: true });

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(DB, 'utf8')); } catch (e) { return {}; }
}

function saveUsers(users) {
  fs.writeFileSync(DB, JSON.stringify(users), { mode: 0o600 });
}

const sha = v => crypto.createHash('sha256').update(String(v)).digest('hex');
const norm = e => String(e || '').trim().toLowerCase();
const same = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
}

const DUMMY_SALT = crypto.randomBytes(16).toString('hex');
const DUMMY_HASH = hashPassword('dummy', DUMMY_SALT);

const challenges = new Map();
const sessions = new Map();

setInterval(() => {
  const now = Date.now();
  challenges.forEach((c, k) => { if (c.exp < now) challenges.delete(k); });
  sessions.forEach((s, k) => { if (s.exp < now) sessions.delete(k); });
}, 60000).unref();

function publicUser(u) {
  return { email: u.email, name: u.name, role: u.role, clinic: u.clinic, licenseNo: u.licenseNo, state: u.state, lga: u.lga, createdAt: u.createdAt };
}

function readCookie(req) {
  const raw = req.headers.cookie || '';
  const hit = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  return hit ? decodeURIComponent(hit.slice(COOKIE.length + 1)) : '';
}

function currentSession(req) {
  const token = readCookie(req);
  if (!token) return null;
  const s = sessions.get(sha(token));
  if (!s || s.exp < Date.now()) return null;
  return s;
}

function issueSession(res, email, remember) {
  const token = crypto.randomBytes(32).toString('hex');
  const ttl = remember ? 30 * DAY : 12 * 3600000;
  sessions.set(sha(token), { email, exp: Date.now() + ttl });
  const opts = { httpOnly: true, sameSite: 'strict', secure: PROD, path: '/' };
  if (remember) opts.maxAge = ttl;
  res.cookie(COOKIE, token, opts);
}

async function issueChallenge(email, remember, purpose) {
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const id = crypto.randomBytes(24).toString('hex');
  challenges.set(id, { email, codeHash: sha(code), exp: Date.now() + CODE_TTL, attempts: 0, resends: 0, remember: !!remember, purpose });
  if (mailer) {
    try {
      await mailer.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Your RuralCare verification code',
        text: 'Your RuralCare verification code is ' + code + '. It expires in 5 minutes. If you did not request it, ignore this email.'
      });
    } catch (e) {
      console.error('Mail delivery failed');
    }
  }
  if (DEMO) console.log('[DEMO] Verification code for ' + email + ': ' + code);
  return { challenge: id, demoCode: DEMO ? code : undefined };
}

function limiter(windowMin, max, message) {
  return rateLimit({
    windowMs: windowMin * 60000,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({ error: message })
  });
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY ? 1 : false);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.tailwindcss.com', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:', 'data:'],
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use('/api', limiter(15, 300, 'Too many requests. Please slow down.'));
app.use('/api', express.json({ limit: '10kb' }));
app.use('/api', (req, res, next) => {
  if (req.method === 'POST' && !req.is('application/json')) return res.status(415).json({ error: 'Unsupported request.' });
  res.set('Cache-Control', 'no-store');
  next();
});

const credentialLimit = limiter(15, 10, 'Too many attempts. Try again in 15 minutes.');
const codeLimit = limiter(15, 15, 'Too many code attempts. Try again in 15 minutes.');

app.post('/api/auth/register', credentialLimit, async (req, res) => {
  const b = req.body || {};
  const email = norm(b.email);
  const password = String(b.password || '');
  const name = String(b.name || '').trim().slice(0, 120);
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 160) return res.status(400).json({ field: 'email', error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 200) return res.status(400).json({ field: 'password', error: 'Password must be at least 8 characters.' });
  if (!name) return res.status(400).json({ field: 'full-name', error: 'Full name is required.' });
  if (!b.role) return res.status(400).json({ field: 'role', error: 'Select your role.' });
  if (!String(b.clinic || '').trim()) return res.status(400).json({ field: 'clinic', error: 'Clinic is required.' });
  const users = loadUsers();
  const existing = users[email];
  if (existing && existing.verified) return res.status(409).json({ field: 'email', error: 'An account already exists with this email address. Please sign in.' });
  const salt = crypto.randomBytes(16).toString('hex');
  users[email] = {
    email, name,
    role: String(b.role).slice(0, 80),
    clinic: String(b.clinic || '').trim().slice(0, 160),
    licenseNo: String(b.licenseNo || '').trim().slice(0, 60),
    state: String(b.state || '').slice(0, 60),
    lga: String(b.lga || '').slice(0, 80),
    salt, hash: hashPassword(password, salt),
    verified: false, failed: 0, lockUntil: 0,
    createdAt: new Date().toISOString()
  };
  saveUsers(users);
  res.json(await issueChallenge(email, false, 'register'));
});

app.post('/api/auth/login', credentialLimit, async (req, res) => {
  const b = req.body || {};
  const email = norm(b.email);
  const password = String(b.password || '').slice(0, 200);
  const users = loadUsers();
  const u = users[email];
  if (u && u.lockUntil > Date.now()) {
    return res.status(429).json({ error: 'Account temporarily locked after repeated failed attempts. Try again in 15 minutes.' });
  }
  const hash = hashPassword(password, u ? u.salt : DUMMY_SALT);
  const ok = u && u.verified && same(hash, u.hash);
  if (!ok) {
    if (u && u.verified) {
      u.failed = (u.failed || 0) + 1;
      if (u.failed >= 5) { u.lockUntil = Date.now() + LOCK_MS; u.failed = 0; }
      saveUsers(users);
    }
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }
  u.failed = 0;
  u.lockUntil = 0;
  saveUsers(users);
  res.json(await issueChallenge(email, !!b.remember, 'login'));
});

app.post('/api/auth/verify', codeLimit, (req, res) => {
  const b = req.body || {};
  const c = challenges.get(String(b.challenge || ''));
  if (!c || c.exp < Date.now()) return res.status(410).json({ expired: true, error: 'This code has expired. Please start again.' });
  c.attempts++;
  if (c.attempts > 5) {
    challenges.delete(String(b.challenge));
    return res.status(429).json({ expired: true, error: 'Too many incorrect codes. Please start again.' });
  }
  if (!same(sha(String(b.code || '').trim()), c.codeHash)) return res.status(401).json({ error: 'Incorrect code. ' + (5 - c.attempts) + ' attempt(s) left.' });
  challenges.delete(String(b.challenge));
  const users = loadUsers();
  const u = users[c.email];
  if (!u) return res.status(401).json({ expired: true, error: 'Account not found.' });
  if (!u.verified) { u.verified = true; saveUsers(users); }
  issueSession(res, u.email, c.remember);
  res.json({ user: publicUser(u) });
});

app.post('/api/auth/resend', codeLimit, async (req, res) => {
  const old = challenges.get(String((req.body || {}).challenge || ''));
  if (!old || old.exp < Date.now()) return res.status(410).json({ expired: true, error: 'This session expired. Please start again.' });
  if (old.resends >= 3) return res.status(429).json({ error: 'Resend limit reached. Please start again.' });
  challenges.delete(String(req.body.challenge));
  const next = await issueChallenge(old.email, old.remember, old.purpose);
  challenges.get(next.challenge).resends = old.resends + 1;
  res.json(next);
});

app.get('/api/auth/me', (req, res) => {
  const s = currentSession(req);
  const u = s && loadUsers()[s.email];
  if (!u) return res.status(401).json({ error: 'Not signed in.' });
  res.json({ user: publicUser(u) });
});

app.post('/api/auth/logout', (req, res) => {
  const token = readCookie(req);
  if (token) sessions.delete(sha(token));
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'strict', secure: PROD, path: '/' });
  res.json({ ok: true });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

app.use((req, res, next) => {
  const p = req.path.toLowerCase();
  const page = p === '/' ? 'index.html' : p.split('/').pop();
  if (page.endsWith('.html') && page !== 'auth.html' && !currentSession(req)) {
    return res.redirect('/auth.html?next=' + encodeURIComponent(page));
  }
  next();
});

app.use(express.static(PUBLIC, { dotfiles: 'ignore', index: 'index.html' }));
app.use((req, res) => res.status(404).send('Not found'));

app.listen(PORT, () => {
  console.log('RuralCare running on http://localhost:' + PORT + (DEMO ? ' (demo mode: codes shown on screen and in this console)' : ''));
});