'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 8787;
const TOKEN = process.env.HUB_TOKEN || '';
const DATA_FILE = process.env.HUB_DATA || path.join(__dirname, 'hub-data.json');
const APP_DIR = process.env.APP_DIR ? path.resolve(process.env.APP_DIR) : '';
const CERT_FILE = process.env.HUB_CERT || '';
const KEY_FILE = process.env.HUB_KEY || '';
const MAX_BODY = 2 * 1024 * 1024;
const MAX_STAGES = 200;
const MAX_STAGE_BYTES = 24 * 1024;
const MAX_VISIT_BYTES = 200 * 1024;
const DEPARTMENTS = ['registration', 'consultation', 'lab', 'pharmacy', 'billing'];
const VITAL_KEYS = ['bpSys', 'bpDia', 'temp', 'hr', 'spo2', 'rr', 'weight'];
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json'
};

let db = { seq: 0, visits: {} };
try {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  if (raw && typeof raw === 'object' && raw.visits) db = raw;
} catch (e) {}

let saveTimer = null;

function writeNow() {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DATA_FILE);
}

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      writeNow();
    } catch (e) {
      console.error('Could not save data:', e.message);
    }
  }, 300);
}

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const validDate = v => typeof v === 'string' && v.length <= 40 && !Number.isNaN(Date.parse(v));
const plain = v => v && typeof v === 'object' && !Array.isArray(v);

function cleanStage(s) {
  if (!plain(s)) return null;
  if (!/^S-[A-Za-z0-9]{6,24}$/.test(String(s.id || ''))) return null;
  if (!DEPARTMENTS.includes(s.dept)) return null;
  if (!validDate(s.at)) return null;
  const data = plain(s.data) ? s.data : {};
  if (JSON.stringify(data).length > MAX_STAGE_BYTES) return null;
  return { id: s.id, dept: s.dept, at: s.at, by: str(s.by, 80), data };
}

function cleanVisit(v) {
  if (!plain(v)) return null;
  if (!/^V-[A-Z0-9]{4,12}$/.test(String(v.id || ''))) return null;
  const p = plain(v.patient) ? v.patient : {};
  const vitals = {};
  VITAL_KEYS.forEach(k => {
    const x = plain(p.vitals) ? str(String(p.vitals[k] == null ? '' : p.vitals[k]), 10) : '';
    if (x) vitals[k] = x;
  });
  const r = plain(v.referral) ? v.referral : null;
  const stages = Array.isArray(v.stages) ? v.stages.slice(0, MAX_STAGES).map(cleanStage).filter(Boolean) : [];
  const out = {
    id: v.id,
    facility: str(v.facility, 160),
    createdAt: validDate(v.createdAt) ? v.createdAt : new Date().toISOString(),
    updatedAt: validDate(v.updatedAt) ? v.updatedAt : new Date().toISOString(),
    urgency: ['routine', 'urgent', 'emergency'].includes(v.urgency) ? v.urgency : 'routine',
    patient: {
      name: str(p.name, 120),
      age: str(String(p.age == null ? '' : p.age), 20),
      gender: str(p.gender, 10),
      contact: str(p.contact, 30),
      community: str(p.community, 120),
      vitals
    },
    referral: r
      ? {
          id: str(r.id, 60),
          code: str(r.code, 30),
          clientRef: str(r.clientRef, 30),
          from: str(r.from, 160),
          reason: str(r.reason, 2000),
          care: plain(r.care) ? r.care : {}
        }
      : null,
    closed: !!v.closed,
    summary: str(v.summary, 6000),
    stages
  };
  return JSON.stringify(out).length > MAX_VISIT_BYTES ? null : out;
}

function mergeVisit(cur, inc) {
  if (!cur) return inc;
  const map = new Map();
  cur.stages.concat(inc.stages).forEach(s => {
    if (!map.has(s.id)) map.set(s.id, s);
  });
  const stages = Array.from(map.values())
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id))
    .slice(0, MAX_STAGES);
  const base = Date.parse(inc.updatedAt) > Date.parse(cur.updatedAt) ? inc : cur;
  const closed = !!(cur.closed || inc.closed);
  return Object.assign({}, base, { stages, closed, summary: base.summary || cur.summary || inc.summary });
}

function stripSeq(v) {
  const c = Object.assign({}, v);
  delete c.seq;
  return JSON.stringify(c);
}

function applyVisits(list) {
  let changed = false;
  list.slice(0, 200).forEach(raw => {
    const inc = cleanVisit(raw);
    if (!inc) return;
    const cur = db.visits[inc.id];
    const next = mergeVisit(cur, inc);
    if (cur && stripSeq(cur) === stripSeq(next)) return;
    db.visits[inc.id] = Object.assign({}, next, { seq: ++db.seq });
    changed = true;
  });
  if (changed) persist();
}

function authorized(req) {
  if (!TOKEN) return true;
  const header = String(req.headers.authorization || '');
  const given = header.startsWith('Bearer ') ? header.slice(7) : '';
  const a = Buffer.from(given);
  const b = Buffer.from(TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
}

function sendJson(res, code, body) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (e) {
        reject(Object.assign(new Error('bad_json'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function serveStatic(req, res, pathname) {
  if (!APP_DIR) return sendJson(res, 404, { error: 'not_found' });
  let rel = decodeURIComponent(pathname);
  if (rel === '/') rel = '/index.html';
  const full = path.normalize(path.join(APP_DIR, rel));
  const inside = full === APP_DIR || full.startsWith(APP_DIR + path.sep);
  const hidden = path.relative(APP_DIR, full).split(path.sep)[0] === 'hub';
  if (!inside || hidden) return sendJson(res, 404, { error: 'not_found' });
  fs.readFile(full, (err, buf) => {
    if (err) return sendJson(res, 404, { error: 'not_found' });
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(buf);
  });
}

async function handle(req, res) {
  const url = new URL(req.url, 'http://hub.local');
  const pathname = url.pathname;
  if (req.method === 'OPTIONS') {
    cors(res);
    res.writeHead(204);
    return res.end();
  }
  if (!pathname.startsWith('/api/')) {
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'method_not_allowed' });
    return serveStatic(req, res, pathname);
  }
  if (pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, now: new Date().toISOString(), secured: !!TOKEN });
  }
  if (!authorized(req)) return sendJson(res, 401, { error: 'unauthorized' });
  if (pathname === '/api/visits/sync' && req.method === 'POST') {
    const body = await readBody(req);
    const since = Number.isFinite(Number(body.since)) ? Number(body.since) : 0;
    applyVisits(Array.isArray(body.visits) ? body.visits : []);
    const visits = Object.values(db.visits).filter(v => v.seq > since);
    return sendJson(res, 200, { seq: db.seq, visits });
  }
  if (pathname === '/api/visits' && req.method === 'GET') {
    const wanted = String(url.searchParams.get('ref') || '')
      .split(',')
      .map(x => x.trim().toLowerCase())
      .filter(Boolean);
    const visits = wanted.length
      ? Object.values(db.visits).filter(v => {
          const r = v.referral;
          return r && (wanted.includes(String(r.code).toLowerCase()) || wanted.includes(String(r.clientRef).toLowerCase()));
        })
      : [];
    return sendJson(res, 200, { visits });
  }
  return sendJson(res, 404, { error: 'not_found' });
}

function onRequest(req, res) {
  handle(req, res).catch(err => {
    if (!res.headersSent) sendJson(res, err && err.status ? err.status : 500, { error: err && err.message ? err.message : 'server_error' });
  });
}

const server =
  CERT_FILE && KEY_FILE
    ? https.createServer({ cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) }, onRequest)
    : http.createServer(onRequest);

function shutdown() {
  try {
    writeNow();
  } catch (e) {}
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, '0.0.0.0', () => {
  const scheme = CERT_FILE && KEY_FILE ? 'https' : 'http';
  console.log('RuralCare hospital hub is running');
  Object.values(os.networkInterfaces())
    .flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal)
    .forEach(i => console.log('  ' + scheme + '://' + i.address + ':' + PORT));
  console.log('  Access token: ' + (TOKEN ? 'required' : 'NOT SET (demo only)'));
  console.log('  App folder: ' + (APP_DIR || 'not served'));
});