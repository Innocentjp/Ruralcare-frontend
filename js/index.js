const RC = (() => {
  const KEYS = {
    session: 'ruralcare_session',
    patients: 'ruralcare_patients',
    theme: 'ruralcare_theme',
    settings: 'ruralcare_settings',
    seeded: 'ruralcare_seeded',
    users: 'ruralcare_users',
    seededUsers: 'ruralcare_seeded_users',
    log: 'ruralcare_log'
  };

  const SUPABASE_URL = 'https://rjlyoimpsamugszhsjii.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8FgHA9dB8n4nn2--FHmNUQ_FY0H-dAL';
  const SESSION_ONLY_KEY = 'rcauth_session_only';
  const BROWSER_SESSION_COOKIE = 'rc_active';
  const SUPABASE_JS_SRC = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9/dist/umd/supabase.js';

  const BUILD = '2026.11.10-profile';
  let sbInstance = null;

  function sbClient() {
    if (sbInstance) return sbInstance;
    if (window.supabase && window.supabase.createClient) {
      sbInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    }
    return sbInstance;
  }

  async function sbClientAsync() {
    if (!sbClient()) await loadSupabaseLib();
    return sbClient();
  }

  const SYMPTOM_OPTIONS = [
    'Fever', 'Headache', 'Cough', 'Difficulty breathing', 'Chest pain', 'Vomiting',
    'Diarrhea', 'Abdominal pain', 'Body aches', 'Fatigue', 'Dizziness', 'Skin rash',
    'Loss of appetite', 'Convulsions'
  ];

  const GUIDANCE = { version: '1.0', status: 'pending clinical review', updated: '2026-09-30' };

  const DEFAULT_SETTINGS = { autoSync: true, smsFallback: false, smsNumber: '', language: 'en' };

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null || raw === '') return fallback;
      const parsed = JSON.parse(raw);
      return parsed === null || parsed === undefined ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  const LOG_MAX = 100;

  function log(level, event, detail) {
    try {
      const list = readJSON(KEYS.log, []);
      const arr = Array.isArray(list) ? list : [];
      arr.push({ t: new Date().toISOString(), level, event, detail: detail || null });
      writeJSON(KEYS.log, arr.slice(-LOG_MAX));
    } catch (e) {}
  }

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function icons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {}
  }

  function normEmail(e) {
    return String(e || '').trim().toLowerCase();
  }

  function currentPage() {
    try { return (window.location.pathname.split('/').pop() || '').toLowerCase(); } catch (e) { return ''; }
  }

  function getUsers() {
    const list = readJSON(KEYS.users, []);
    return Array.isArray(list) ? list : [];
  }

  function saveUsers(list) {
    return writeJSON(KEYS.users, list);
  }

  function findUser(email) {
    const e = normEmail(email);
    if (!e) return null;
    return getUsers().find(u => normEmail(u.email) === e) || null;
  }

  function randomSalt() {
    try {
      const a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return String(Date.now()) + Math.random().toString(16).slice(2);
    }
  }

  async function hashPassword(password, salt, method) {
    const wantSubtle = method ? method === 'p2' : true;
    if (wantSubtle) {
      try {
        if (window.crypto && crypto.subtle) {
          const enc = new TextEncoder();
          const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
          const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
          return 'p2:' + Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
      } catch (e) {}
      if (method === 'p2') return '';
    }
    const text = salt + ':' + password;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < text.length; i++) {
      h1 = Math.imul(h1 ^ text.charCodeAt(i), 16777619) >>> 0;
      h2 = Math.imul(h2 + text.charCodeAt(i), 2246822519) >>> 0;
    }
    return 'f1:' + h1.toString(16) + h2.toString(16);
  }

  async function registerUser(data) {
    const email = normEmail(data && data.email);
    if (!email) return { ok: false, code: 'invalid', error: 'Enter a valid email address.' };
    if (findUser(email)) return { ok: false, code: 'exists', error: 'An account with this email already exists. Please sign in.' };
    const salt = randomSalt();
    const passHash = await hashPassword(String(data.password || ''), salt);
    const user = {
      email,
      name: String(data.name || '').trim(),
      role: data.role || '',
      clinic: String(data.clinic || '').trim(),
      licenseNo: String(data.licenseNo || '').trim(),
      state: data.state || '',
      lga: data.lga || '',
      salt,
      passHash,
      createdAt: new Date().toISOString()
    };
    const users = getUsers();
    users.push(user);
    if (!saveUsers(users)) return { ok: false, code: 'storage', error: 'Could not save your account on this device.' };
    return { ok: true, user };
  }

  async function authenticate(email, password) {
    const user = findUser(email);
    if (!user) return { ok: false, code: 'not-found', error: 'No account found for this email.' };
    const hash = await hashPassword(String(password || ''), user.salt, String(user.passHash || '').slice(0, 2));
    if (!hash || hash !== user.passHash) return { ok: false, code: 'bad-password', error: 'Incorrect password.' };
    return { ok: true, user };
  }

  function syncUserFromSession(s) {
    if (!s || !s.email) return;
    const users = getUsers();
    const i = users.findIndex(u => normEmail(u.email) === normEmail(s.email));
    if (i < 0) return;
    let profileChanged = false;
    let avatarChanged = false;
    ['name', 'role', 'clinic', 'licenseNo', 'state', 'lga', 'avatar'].forEach(k => {
      if (s[k] === undefined) return;
      if (users[i][k] !== s[k]) {
        if (k === 'avatar') avatarChanged = true;
        else if (PROFILE_FIELDS.includes(k)) profileChanged = true;
      }
      users[i][k] = s[k];
    });
    saveUsers(users);
    if (profileChanged || avatarChanged) markProfileDirty(s.email, avatarChanged);
  }

  function getSession() {
    const s = readJSON(KEYS.session, null);
    if (!s || typeof s !== 'object') return null;
    const u = s.email ? findUser(s.email) : null;
    if (!u) return s;
    return Object.assign({}, s, {
      email: normEmail(u.email),
      name: u.name || s.name,
      role: u.role || s.role,
      clinic: u.clinic !== undefined ? u.clinic : s.clinic,
      licenseNo: u.licenseNo !== undefined ? u.licenseNo : s.licenseNo,
      state: u.state || s.state,
      lga: u.lga || s.lga,
      avatar: u.avatar || s.avatar
    });
  }

  function setSession(session) {
    const copy = Object.assign({}, session);
    delete copy.avatar;
    writeJSON(KEYS.session, copy);
    syncUserFromSession(session);
  }

  function startSession(user) {
    try { sessionStorage.removeItem('ruralcare_chat'); } catch (e) {}
    const session = {
      email: normEmail(user.email),
      name: user.name,
      role: user.role,
      clinic: user.clinic,
      licenseNo: user.licenseNo,
      state: user.state,
      lga: user.lga,
      loginAt: Date.now(),
      greeted: false
    };
    writeJSON(KEYS.session, session);
    return session;
  }

  function clearSession() {
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', keepalive: true }).catch(() => {});
    } catch (e) {}
    try {
      localStorage.removeItem(KEYS.session);
      sessionStorage.removeItem('ruralcare_chat');
    } catch (e) {}
    clearSupabaseSession();
  }

  function supabaseSessionKeys() {
    const keys = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /^sb-[a-z0-9]+-auth-token$/.test(k)) keys.push(k);
      }
    } catch (e) {}
    return keys;
  }

  function mfaSatisfied(v) {
    try {
      const factors = v.user && Array.isArray(v.user.factors) ? v.user.factors : [];
      if (!factors.some(f => f && f.status === 'verified')) return true;
      const part = String(v.access_token || '').split('.')[1] || '';
      const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
      return payload.aal === 'aal2';
    } catch (e) {
      return false;
    }
  }

  function hasSupabaseSession() {
    return supabaseSessionKeys().some(k => {
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        return !!(v && (v.access_token || v.refresh_token)) && mfaSatisfied(v);
      } catch (e) {
        return false;
      }
    });
  }

  function browserSessionExpired() {
    try {
      if (localStorage.getItem(SESSION_ONLY_KEY) !== '1') return false;
      return !document.cookie.split('; ').includes(BROWSER_SESSION_COOKIE + '=1');
    } catch (e) {
      return false;
    }
  }

  function clearSupabaseSession() {
    supabaseSessionKeys().forEach(k => {
      let token = '';
      try {
        const v = JSON.parse(localStorage.getItem(k) || 'null');
        token = (v && v.access_token) || '';
      } catch (e) {}
      try { localStorage.removeItem(k); } catch (e) {}
      if (token) {
        try {
          fetch(SUPABASE_URL + '/auth/v1/logout?scope=local', {
            method: 'POST',
            headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + token },
            keepalive: true
          }).catch(() => {});
        } catch (e) {}
      }
    });
    try { localStorage.removeItem(SESSION_ONLY_KEY); } catch (e) {}
  }

  function getCurrentUser() {
    const s = readJSON(KEYS.session, null);
    if (!s || typeof s !== 'object' || !s.email) return '';
    if (typeof s.expiresAt === 'number' && Date.now() > s.expiresAt) return '';
    if (!hasSupabaseSession() || browserSessionExpired()) return '';
    const e = normEmail(s.email);
    return findUser(e) ? e : '';
  }

  function verifyServerSession(expected) {
    try {
      fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' }).then(async res => {
        let mismatch = res.status === 401;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          mismatch = !!data && (!data.user || normEmail(data.user.email) !== expected);
        }
        if (mismatch) {
          try { localStorage.removeItem(KEYS.session); sessionStorage.removeItem('ruralcare_chat'); } catch (e) {}
          window.location.replace('auth.html');
        }
      }).catch(() => {});
    } catch (e) {}
  }

  function requireSession() {
    const user = getCurrentUser();
    if (!user) {
      try { localStorage.removeItem(KEYS.session); } catch (e) {}
      window.location.replace('auth.html');
      return false;
    }
    verifyServerSession(user);
    return true;
  }

  function greeting() {
    const s = getSession();
    if (!s) return { key: 'dash-greet', name: '' };
    const first = !s.greeted;
    if (first) {
      s.greeted = true;
      setSession(s);
    }
    return { key: first ? 'dash-greet' : 'dash-back', name: String(s.name || '').trim() };
  }

  const NAME_TITLES = new Set(['dr', 'doctor', 'prof', 'professor', 'mr', 'mrs', 'ms', 'miss', 'mx', 'sir', 'madam', 'nr', 'nurse', 'pt', 'pharm', 'pharmacist', 'engr', 'barr', 'arc', 'rev', 'pastor', 'hon', 'chief', 'alhaji', 'alhaja', 'alh', 'mallam', 'mal', 'chw', 'sr', 'sis', 'sister', 'bro', 'brother']);
  const NAME_SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'mbbs', 'mbchb', 'rn', 'rm', 'rnm', 'bsc', 'msc', 'mph', 'frcs', 'fwacs', 'fmcp', 'dds']);

  function nameParts(name) {
    const clean = t => String(t).toLowerCase().replace(/[.\u2019']/g, '');
    const parts = String(name || '').replace(/[(),]/g, ' ').split(/\s+/).filter(Boolean);
    while (parts.length > 1 && NAME_TITLES.has(clean(parts[0]))) parts.shift();
    while (parts.length > 1 && NAME_SUFFIXES.has(clean(parts[parts.length - 1]))) parts.pop();
    return parts;
  }

  function initials(name) {
    const letter = s => (String(s).match(/\p{L}/u) || [''])[0];
    const parts = nameParts(name);
    if (!parts.length) return 'U';
    const first = letter(parts[0]);
    const last = parts.length > 1 ? letter(parts[parts.length - 1]) : '';
    return (first + last).toUpperCase() || 'U';
  }

  function ownerOf(p) {
    return normEmail(p && p.createdBy);
  }

  function patientsKey(email) {
    return KEYS.patients + ':' + normEmail(email);
  }

  function getAllRawPatients() {
    const user = getCurrentUser();
    if (!user) return [];
    const list = readJSON(patientsKey(user), []);
    return Array.isArray(list) ? list : [];
  }

  function saveRawPatients(list) {
    const user = getCurrentUser();
    if (!user) return;
    writeJSON(patientsKey(user), list);
  }

  function getPatients() {
    const user = getCurrentUser();
    if (!user) return [];
    return getAllRawPatients().filter(p => ownerOf(p) === user);
  }

  function getPatientById(id) {
    return getPatients().find(p => p.id === id) || null;
  }

  function savePatient(patient) {
    const user = getCurrentUser();
    if (!user) return null;
    const all = getAllRawPatients();
    patient.createdBy = user;
    if (patient.isDemo === undefined) patient.isDemo = false;
    const idx = all.findIndex(p => p.id === patient.id);
    if (idx >= 0) {
      if (ownerOf(all[idx]) !== user) return null;
      patient.isEdited = true;
      patient.editedAt = new Date().toISOString();
      patient.rev = (parseInt(all[idx].rev, 10) || 1) + 1;
      patient.syncMeta = null;
      patient.updatedAt = patient.editedAt;
      patient.status = 'queued';
      all[idx] = Object.assign({}, all[idx], patient);
    } else {
      patient.rev = 1;
      patient.updatedAt = new Date().toISOString();
      patient.status = 'queued';
      all.unshift(patient);
    }
    saveRawPatients(all);
    scheduleAutoSync();
    return patient;
  }

  function addPatient(patient) {
    return savePatient(patient);
  }

  function savePatients(list) {
    const user = getCurrentUser();
    if (!user) return;
    const all = getAllRawPatients();
    const stamp = new Date().toISOString();
    list.forEach(p => {
      p.createdBy = user;
      const idx = all.findIndex(item => item.id === p.id);
      if (idx >= 0) {
        if (ownerOf(all[idx]) !== user) return;
        if (snapshot(all[idx]) !== snapshot(p)) {
          p.rev = (parseInt(all[idx].rev, 10) || 1) + 1;
          p.updatedAt = stamp;
          p.status = 'queued';
        }
        all[idx] = p;
      } else {
        p.rev = p.rev || 1;
        p.updatedAt = p.updatedAt || stamp;
        if (!p.status) p.status = 'queued';
        all.push(p);
      }
    });
    saveRawPatients(all);
    scheduleAutoSync();
  }

  function deletesKey(email) {
    return 'ruralcare_deletes:' + normEmail(email);
  }

  function getPendingDeletes(email) {
    const list = readJSON(deletesKey(email), []);
    return Array.isArray(list) ? list : [];
  }

  function queueDeletes(email, ids) {
    if (!ids.length) return;
    const at = new Date().toISOString();
    const have = new Set(getPendingDeletes(email).map(d => d.id));
    const next = getPendingDeletes(email).concat(ids.filter(id => !have.has(id)).map(id => ({ id, at })));
    writeJSON(deletesKey(email), next);
  }

  function deletePatient(id) {
    const user = getCurrentUser();
    if (!user) return;
    const all = getAllRawPatients();
    const target = all.find(p => p.id === id && ownerOf(p) === user);
    if (!target) return;
    if (Array.isArray(target.recordings)) {
      target.recordings.forEach(r => { audio.remove(r.id).catch(() => {}); });
    }
    saveRawPatients(all.filter(p => p !== target));
    if (!target.isDemo) queueDeletes(user, [id]);
    scheduleAutoSync();
  }

  function normalizePhone(value) {
    let s = String(value || '').replace(/[\s\-().]/g, '');
    if (/^0\d{10}$/.test(s)) s = '+234' + s.slice(1);
    else if (/^234\d{10}$/.test(s)) s = '+' + s;
    return /^\+\d{8,15}$/.test(s) ? s : '';
  }

  function smsHref(body) {
    const num = normalizePhone(getSettings().smsNumber);
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent || '');
    return 'sms:' + num + (ios ? '&' : '?') + 'body=' + encodeURIComponent(body);
  }

  function smsFallbackDue() {
    if (!getSettings().smsFallback) return [];
    const cutoff = Date.now() - 24 * 3600 * 1000;
    return getPatients().filter(p => {
      if (p.status !== 'queued' || p.isDemo) return false;
      const at = recTime(p);
      return at > 0 && at < cutoff && overallSeverity(p) === 'urgent';
    });
  }

  function pendingCount() {
    return getPatients().filter(p => p.status === 'queued' && !p.isDemo).length;
  }

  function lastSyncAt() {
    try { return localStorage.getItem(lastSyncKey(getCurrentUser())) || ''; } catch (e) { return ''; }
  }

  function randomIdPart() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = new Uint8Array(6);
    try { crypto.getRandomValues(bytes); } catch (e) { for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256); }
    return Array.from(bytes).map(b => chars[b % 32]).join('');
  }

  function generatePatientId(extra) {
    const used = new Set(getAllRawPatients().map(p => p.id));
    if (extra) extra.forEach(i => used.add(i));
    let id;
    do {
      id = 'RC-' + randomIdPart();
    } while (used.has(id));
    return id;
  }

  function migrateSharedRecords() {
    try {
      const legacy = readJSON(KEYS.patients, null);
      if (!Array.isArray(legacy)) return;
      const groups = {};
      legacy.forEach(p => {
        const owner = ownerOf(p);
        if (!owner || owner === 'system') return;
        (groups[owner] = groups[owner] || []).push(p);
      });
      Object.keys(groups).forEach(owner => {
        const current = readJSON(patientsKey(owner), []);
        const list = Array.isArray(current) ? current : [];
        const have = new Set(list.map(p => p.id));
        writeJSON(patientsKey(owner), list.concat(groups[owner].filter(p => !have.has(p.id))));
      });
      localStorage.removeItem(KEYS.patients);
    } catch (e) {}
  }

  function ageYears(patient) {
    const a = parseFloat(patient && patient.age);
    return Number.isFinite(a) && a >= 0 && a < 125 ? a : null;
  }

  function ageLabel(patient) {
    const a = ageYears(patient);
    if (a === null) return '';
    if (a < 1) {
      const m = Math.round(a * 12);
      return m < 1 ? 'Newborn' : m + '-month-old infant';
    }
    return (Math.floor(a) === a ? a : a.toFixed(1)) + ' y';
  }

  function hrRange(a) {
    if (a < 1) return [100, 160];
    if (a < 3) return [90, 150];
    if (a < 6) return [80, 140];
    if (a < 12) return [70, 120];
    return [60, 100];
  }

  function getFlags(patient) {
    const v = (patient && patient.vitals) || {};
    const sys = num(v.bpSys);
    const dia = num(v.bpDia);
    const temp = num(v.temp);
    const hr = num(v.hr);
    const spo2 = num(v.spo2);
    const rr = num(v.rr);
    const a = ageYears(patient);
    const age = a === null ? 30 : a;
    const child = age < 12;
    const flags = [];

    if (spo2 !== null) {
      if (spo2 < 92) flags.push({ kind: 'spo2', level: 'urgent', text: 'Critically low oxygen saturation (' + spo2 + '%)' });
      else if (spo2 < 94) flags.push({ kind: 'spo2', level: 'review', text: 'Low oxygen saturation (' + spo2 + '%)' });
    }

    if (sys !== null) {
      const hypoLimit = age < 1 ? 70 : age <= 10 ? 70 + 2 * Math.floor(age) : 90;
      if (child) {
        if (sys < hypoLimit) flags.push({ kind: 'bp', level: 'urgent', text: 'Low blood pressure for age (' + sys + (dia !== null ? '/' + dia : '') + '), possible shock' });
        else {
          const hi = age < 1 ? 100 : age < 6 ? 110 : 120;
          const hiU = hi + 20;
          if (sys >= hiU) flags.push({ kind: 'bp', level: 'urgent', text: 'Severely elevated blood pressure for age (' + sys + (dia !== null ? '/' + dia : '') + ')' });
          else if (sys >= hi) flags.push({ kind: 'bp', level: 'review', text: 'Elevated blood pressure for age (' + sys + (dia !== null ? '/' + dia : '') + ')' });
        }
      } else if (dia !== null) {
        const preg = !!(patient && patient.pregnant);
        const reviewSys = age < 18 && !preg ? 130 : 140;
        const reviewDia = age < 18 && !preg ? 80 : 90;
        if (sys >= 160 || dia >= (preg ? 110 : 100)) flags.push({ kind: 'bp', level: 'urgent', text: preg ? 'Severe hypertension in pregnancy (' + sys + '/' + dia + '), obstetric emergency' : 'Severely elevated blood pressure (' + sys + '/' + dia + ')' });
        else if (sys >= reviewSys || dia >= reviewDia) flags.push({ kind: 'bp', level: 'review', text: preg ? 'Raised blood pressure in pregnancy (' + sys + '/' + dia + '), assess for pre-eclampsia' : 'Elevated blood pressure (' + sys + '/' + dia + ')' });
        else if (sys < 80) flags.push({ kind: 'bp', level: 'urgent', text: 'Very low blood pressure (' + sys + '/' + dia + ')' });
        else if (sys < 90 || dia < 60) flags.push({ kind: 'bp', level: 'review', text: 'Low blood pressure (' + sys + '/' + dia + ')' });
      }
    }

    if (temp !== null) {
      if (age < 0.25 && temp >= 38) flags.push({ kind: 'fever', level: 'urgent', text: 'Fever in an infant under 3 months (' + temp + ' C)' });
      else if (temp >= 39.5) flags.push({ kind: 'fever', level: 'urgent', text: 'High fever (' + temp + ' C)' });
      else if (temp >= 38) flags.push({ kind: 'fever', level: 'review', text: 'Fever (' + temp + ' C)' });
      else if (temp < 35.5) flags.push({ kind: 'temp', level: 'review', text: 'Low body temperature (' + temp + ' C)' });
    }

    if (hr !== null) {
      const r = hrRange(age);
      if (hr > r[1] + 30 || hr < r[0] - 20) flags.push({ kind: 'hr', level: 'urgent', text: 'Dangerous heart rate for age (' + hr + ' bpm)' });
      else if (hr > r[1]) flags.push({ kind: 'hr', level: 'review', text: 'Elevated heart rate' + (child ? ' for age' : '') + ' (' + hr + ' bpm)' });
      else if (hr < r[0]) flags.push({ kind: 'hr', level: 'review', text: 'Low heart rate' + (child ? ' for age' : '') + ' (' + hr + ' bpm)' });
    }

    if (rr !== null) {
      const fast = age < 2 / 12 ? 60 : age < 1 ? 50 : age < 6 ? 40 : age < 12 ? 30 : 22;
      if (rr >= fast + (age >= 12 ? 8 : 20)) flags.push({ kind: 'rr', level: 'urgent', text: 'Very fast breathing (' + rr + '/min)' });
      else if (rr >= fast) flags.push({ kind: 'rr', level: 'review', text: 'Fast breathing for age (' + rr + '/min)' });
    }

    return flags;
  }

  function vitalText(patient, kind) {
    const v = (patient && patient.vitals) || {};
    if (kind === 'bp') return v.bpSys && v.bpDia ? v.bpSys + '/' + v.bpDia : '\u2014';
    if (kind === 'temp') return v.temp ? v.temp + '\u00B0C' : '\u2014';
    if (kind === 'hr') return v.hr ? v.hr + ' bpm' : '\u2014';
    if (kind === 'spo2') return v.spo2 ? v.spo2 + '%' : '\u2014';
    return '\u2014';
  }

  function overallSeverity(patient) {
    const flags = getFlags(patient);
    if (flags.some(f => f.level === 'urgent')) return 'urgent';
    if (flags.length) return 'review';
    return 'clear';
  }

  function statusPillHtml(severity) {
    if (severity === 'urgent') return '<span class="pill pill-critical"><span class="pill-dot"></span>Urgent</span>';
    if (severity === 'review') return '<span class="pill pill-warning"><span class="pill-dot"></span>Review</span>';
    return '<span class="pill pill-success"><span class="pill-dot"></span>Clear</span>';
  }

  const SHOW_DEMO_PATIENTS = false;

  function purgeDemoRecords() {
    const user = getCurrentUser();
    if (!user) return;
    const all = getAllRawPatients();
    const keep = all.filter(p => !(p && (p.isDemo === true || ownerOf(p) === 'system')));
    if (keep.length !== all.length) saveRawPatients(keep);
  }

  function syncDemoRecords() {
    purgeDemoRecords();
  }

  const audio = (() => {
    let dbp = null;

    function open() {
      if (!dbp) {
        dbp = new Promise((resolve, reject) => {
          if (!window.indexedDB) {
            reject(new Error('IndexedDB unavailable'));
            return;
          }
          const req = indexedDB.open('ruralcare_audio', 1);
          req.onupgradeneeded = () => req.result.createObjectStore('notes');
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        dbp.catch(() => { dbp = null; });
      }
      return dbp;
    }

    function run(mode, fn) {
      return open().then(db => new Promise((resolve, reject) => {
        const t = db.transaction('notes', mode);
        const req = fn(t.objectStore('notes'));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
      }));
    }

    return {
      save: (id, blob) => run('readwrite', s => s.put(blob, id)),
      get: id => run('readonly', s => s.get(id)),
      remove: id => run('readwrite', s => s.delete(id))
    };
  })();

  function renderRecordings(list, patient, card) {
    const recs = Array.isArray(patient && patient.recordings) ? patient.recordings : [];
    list.innerHTML = '';
    if (card) card.classList.toggle('hidden', recs.length === 0);
  }

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, readJSON(KEYS.settings, {}));
  }

  function saveSettings(settings) {
    const merged = Object.assign({}, getSettings(), settings);
    writeJSON(KEYS.settings, merged);
    return merged;
  }

  function toast(message, icon) {
    try {
      const old = document.getElementById('rc-toast');
      if (old) old.remove();
      const wrap = document.createElement('div');
      wrap.id = 'rc-toast';
      wrap.className = 'toast toast-in';
      const card = document.createElement('div');
      card.className = 'card px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#141A29] dark:text-[#E7EBF3] shadow-md border';
      const i = document.createElement('i');
      i.setAttribute('data-lucide', icon || 'info');
      i.className = 'w-4 h-4 text-[#52B788] shrink-0';
      const span = document.createElement('span');
      span.textContent = message;
      card.appendChild(i);
      card.appendChild(span);
      wrap.appendChild(card);
      document.body.appendChild(wrap);
      icons();
      setTimeout(() => {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 2600);
    } catch (e) {}
  }

  function isDark() {
    return document.documentElement.classList.contains('dark');
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem(KEYS.theme, theme);
    } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => btn.setAttribute('aria-checked', String(theme === 'dark')));
    paintThemeColor(theme);
    document.dispatchEvent(new CustomEvent('rc:theme', { detail: theme }));
  }

  function paintThemeColor(theme) {
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => {
      if (!m.dataset.light) m.dataset.light = m.getAttribute('content') || '#F8FAFC';
      m.setAttribute('content', theme === 'dark' ? '#070D18' : m.dataset.light);
    });
  }

  function bindTheme() {
    let stored = 'light';
    try {
      stored = localStorage.getItem(KEYS.theme) || 'light';
    } catch (e) {}
    document.documentElement.classList.toggle('dark', stored === 'dark');
    paintThemeColor(stored);
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-checked', String(stored === 'dark'));
      if (btn.dataset.rcBound) return;
      btn.dataset.rcBound = '1';
      btn.addEventListener('click', () => applyTheme(isDark() ? 'light' : 'dark'));
    });
  }

  let profileGlobalsBound = false;

  function bindProfileMenu() {
    const session = getSession() || {};
    const name = session.name || 'User';
    const role = session.role || 'RuralCare';
    const init = initials(name);

    document.querySelectorAll('[data-profile-name]').forEach(el => { el.textContent = name; });
    document.querySelectorAll('[data-profile-role]').forEach(el => { el.textContent = role; });
    document.querySelectorAll('#menu-username').forEach(el => { el.textContent = name; });
    document.querySelectorAll('[data-avatar-initials]').forEach(el => {
      if (session.avatar) {
        el.style.backgroundImage = 'url(' + session.avatar + ')';
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else {
        el.style.backgroundImage = 'none';
        el.textContent = init;
      }
    });

    document.querySelectorAll('[data-profile-trigger]').forEach(trigger => {
      if (trigger.dataset.rcBound) return;
      trigger.dataset.rcBound = '1';
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const menu = trigger.parentElement && trigger.parentElement.querySelector('[data-profile-menu]');
        if (!menu) return;
        const willOpen = menu.classList.contains('hidden');
        document.querySelectorAll('[data-profile-menu]').forEach(m => m.classList.add('hidden'));
        if (willOpen) menu.classList.remove('hidden');
        trigger.setAttribute('aria-expanded', String(willOpen));
        icons();
      });
    });

    if (!profileGlobalsBound) {
      profileGlobalsBound = true;
      document.addEventListener('click', e => {
        if (e.target.closest && e.target.closest('[data-profile-menu]')) return;
        document.querySelectorAll('[data-profile-menu]').forEach(m => m.classList.add('hidden'));
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') document.querySelectorAll('[data-profile-menu]').forEach(m => m.classList.add('hidden'));
      });
    }
  }

  const RECORD_SCHEMA = 1;
  const MAX_RECORD_ATTEMPTS = 6;
  const BATCH_SIZE = 20;

  let syncing = false;
  let retryTimer = null;
  let retryCount = 0;

  let netOk = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let probing = null;
  let probeTimer = null;

  function isOnline() {
    return netOk && navigator.onLine;
  }

  function probeOnline() {
    if (!navigator.onLine) {
      netOk = false;
      return Promise.resolve(false);
    }
    if (probing) return probing;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 5000);
    probing = fetch('./manifest.json?ping=' + Date.now(), { method: 'HEAD', cache: 'no-store', signal: ctl.signal })
      .then(res => { netOk = res.status < 500; return netOk; })
      .catch(() => { netOk = false; return false; })
      .finally(() => {
        clearTimeout(t);
        probing = null;
      });
    return probing;
  }

  function deviceId() {
    let id = null;
    try { id = localStorage.getItem('ruralcare_device'); } catch (e) {}
    if (!id) {
      id = 'dev-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem('ruralcare_device', id); } catch (e) {}
    }
    return id;
  }

  function syncConfig() {
    const s = getSettings();
    return { url: s.syncUrl || window.RC_SYNC_URL || '', token: s.syncToken || window.RC_SYNC_TOKEN || '' };
  }

  function snapshot(p) {
    const c = Object.assign({}, p);
    delete c.status;
    delete c.syncedAt;
    delete c.syncMeta;
    return JSON.stringify(c);
  }

  function outbound(p) {
    const c = Object.assign({}, p);
    delete c.recordings;
    delete c.syncMeta;
    c.rev = p.rev || 1;
    c.schema = RECORD_SCHEMA;
    delete c.status;
    return c;
  }

  function hashStr(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  function idempotencyKey(records) {
    return 'rc-' + deviceId() + '-' + hashStr(JSON.stringify(records));
  }

  async function postBatch(cfg, records) {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 20000);
    try {
      const key = idempotencyKey(records);
      const headers = { 'Content-Type': 'application/json', 'X-Device-Id': deviceId(), 'Idempotency-Key': key };
      if (cfg.token) headers.Authorization = 'Bearer ' + cfg.token;
      const res = await fetch(cfg.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ deviceId: deviceId(), batchKey: key, sentAt: new Date().toISOString(), records }),
        signal: ctl.signal
      });
      if (!res.ok) {
        const err = new Error('HTTP ' + res.status);
        err.status = res.status;
        const ra = parseInt(res.headers && res.headers.get ? res.headers.get('Retry-After') : '', 10);
        if (Number.isFinite(ra)) err.retryAfter = ra * 1000;
        throw err;
      }
      let body = null;
      try { body = await res.json(); } catch (e) {}
      return body && Array.isArray(body.synced) ? body.synced : records.map(r => r.id);
    } finally {
      clearTimeout(timeout);
    }
  }

  function scheduleRetry(retryAfter) {
    clearTimeout(retryTimer);
    const base = Math.min(600000, 15000 * Math.pow(2, retryCount));
    const jittered = Math.round(base / 2 + Math.random() * (base / 2));
    const delay = Math.max(jittered, Math.min(retryAfter || 0, 600000));
    retryCount = Math.min(retryCount + 1, 10);
    retryTimer = setTimeout(() => syncNow(true), delay);
  }

  function isDead(p) {
    return !!(p && p.syncMeta && p.syncMeta.dead);
  }

  function resetDeadLetters() {
    const me = getCurrentUser();
    const all = getAllRawPatients();
    let changed = false;
    all.forEach(p => {
      if (ownerOf(p) === me && isDead(p)) {
        p.syncMeta = null;
        changed = true;
      }
    });
    if (changed) saveRawPatients(all);
  }

  function recordFailures(failures) {
    if (!failures.length) return 0;
    const me = getCurrentUser();
    const byId = {};
    failures.forEach(f => { byId[f.id] = f; });
    const all = getAllRawPatients();
    let dead = 0;
    all.forEach(p => {
      const f = byId[p.id];
      if (!f || ownerOf(p) !== me || p.status !== 'queued') return;
      const meta = Object.assign({ attempts: 0 }, p.syncMeta);
      meta.attempts += 1;
      meta.lastStatus = f.status;
      meta.lastAt = new Date().toISOString();
      if (f.permanent || meta.attempts >= MAX_RECORD_ATTEMPTS) {
        meta.dead = true;
        dead++;
      }
      p.syncMeta = meta;
    });
    saveRawPatients(all);
    log('error', 'sync-record-failed', { ids: failures.map(f => f.id), status: failures[0].status, dead });
    return dead;
  }

  async function sendBatch(cfg, records) {
    try {
      return { okIds: await postBatch(cfg, records), failures: [], abort: null };
    } catch (e) {
      if (!e || !e.status || e.status === 401 || e.status === 403) {
        return { okIds: [], failures: [], abort: e || new Error('network') };
      }
      const permanent = e.status >= 400 && e.status < 500 && e.status !== 408 && e.status !== 429;
      if (permanent && records.length > 1) {
        const merged = { okIds: [], failures: [], abort: null };
        for (const r of records) {
          const sub = await sendBatch(cfg, [r]);
          merged.okIds = merged.okIds.concat(sub.okIds);
          merged.failures = merged.failures.concat(sub.failures);
          if (sub.abort) {
            merged.abort = sub.abort;
            break;
          }
        }
        return merged;
      }
      return {
        okIds: [],
        failures: records.map(r => ({ id: r.id, status: e.status, permanent })),
        abort: permanent ? null : e
      };
    }
  }

  const BATCH_ROWS = 50;
  let setupWarned = false;
  let authWarned = false;
  let lastAuto = 0;
  let pushTimer = null;
  let rtBound = false;
  let rtTimer = null;

  function cursorKey(email) { return 'ruralcare_cursor:' + normEmail(email); }
  function lastSyncKey(email) { return 'ruralcare_lastsync:' + normEmail(email); }

  function ts(v) {
    const n = Date.parse(String(v || '').replace(/(\.\d{3})\d+/, '$1'));
    return Number.isFinite(n) ? n : 0;
  }

  function recTime(p) {
    return ts(p && (p.updatedAt || p.editedAt || p.createdAt));
  }

  function cloudError(error, status) {
    const e = new Error((error && error.message) || 'cloud');
    e.code = (error && error.code) || '';
    e.status = status || (error && error.status) || 0;
    const msg = String(e.message).toLowerCase();
    if (e.code === 'PGRST205' || e.code === '42P01' || /could not find the table|does not exist|schema cache/.test(msg)) e.setup = true;
    if (e.code === 'PGRST301' || /jwt/.test(msg)) e.status = 401;
    return e;
  }

  function markDemoSynced(me) {
    const all = getAllRawPatients();
    let changed = false;
    all.forEach(p => {
      if (ownerOf(p) === me && p.isDemo && p.status === 'queued') {
        p.status = 'synced';
        changed = true;
      }
    });
    if (changed) saveRawPatients(all);
  }

  async function pullRemote(sb, me) {
    let cursor = '1970-01-01T00:00:00.000Z';
    try { cursor = localStorage.getItem(cursorKey(me)) || cursor; } catch (e) {}
    const rows = [];
    const PAGE = 500;
    for (let from = 0; ; from += PAGE) {
      const res = await sb.from('patients')
        .select('id,data,rev,deleted,updated_at,server_ts')
        .gt('server_ts', cursor)
        .order('server_ts', { ascending: true })
        .range(from, from + PAGE - 1);
      if (res.error) throw cloudError(res.error, res.status);
      const page = res.data || [];
      page.forEach(r => rows.push(r));
      if (page.length < PAGE) break;
    }
    if (!rows.length) return 0;

    const all = getAllRawPatients();
    const index = new Map(all.map((p, i) => [p.id, i]));
    const pendingDel = new Set(getPendingDeletes(me).map(d => d.id));
    const drop = new Set();
    let changed = 0;
    let maxTs = 0;

    rows.forEach(r => {
      maxTs = Math.max(maxTs, ts(r.server_ts));
      if (pendingDel.has(r.id)) return;
      const i = index.get(r.id);
      const local = i === undefined ? null : all[i];
      if (local && ownerOf(local) !== me) return;
      const rt = ts(r.updated_at);

      if (r.deleted) {
        if (local && !(local.status === 'queued' && recTime(local) > rt)) {
          drop.add(r.id);
          changed++;
        }
        return;
      }

      const incoming = Object.assign({}, r.data, {
        id: r.id,
        rev: r.rev,
        createdBy: me,
        status: 'synced',
        syncedAt: new Date().toISOString()
      });
      if (!incoming.updatedAt) incoming.updatedAt = r.updated_at;
      if (!local) {
        index.set(r.id, all.push(incoming) - 1);
        changed++;
        return;
      }
      if (rt <= recTime(local)) return;
      if (local.status === 'queued') log('warn', 'sync-conflict', { id: r.id });
      if (local.recordings) incoming.recordings = local.recordings;
      all[i] = incoming;
      changed++;
    });

    if (changed) {
      all.filter(p => drop.has(p.id)).forEach(p => {
        if (Array.isArray(p.recordings)) p.recordings.forEach(rec => { audio.remove(rec.id).catch(() => {}); });
      });
      saveRawPatients(all.filter(p => !drop.has(p.id)));
    }
    if (maxTs > 0) {
      const next = new Date(maxTs - 5000).toISOString();
      if (next > cursor) {
        try { localStorage.setItem(cursorKey(me), next); } catch (e) {}
      }
    }
    return changed;
  }

  async function pushLocal(sb, uid, me) {
    let sent = 0;
    let dead = 0;

    const dels = getPendingDeletes(me);
    for (let i = 0; i < dels.length; i += BATCH_ROWS) {
      const chunk = dels.slice(i, i + BATCH_ROWS);
      const res = await sb.from('patients').upsert(
        chunk.map(d => ({ user_id: uid, id: d.id, data: {}, rev: 0, deleted: true, updated_at: d.at })),
        { onConflict: 'user_id,id' }
      );
      if (res.error) throw cloudError(res.error, res.status);
      const done = new Set(chunk.map(d => d.id));
      writeJSON(deletesKey(me), getPendingDeletes(me).filter(d => !done.has(d.id)));
    }

    const pending = getPatients().filter(p => p.status === 'queued' && !isDead(p) && !p.isDemo);
    for (let i = 0; i < pending.length; i += BATCH_ROWS) {
      const batch = pending.slice(i, i + BATCH_ROWS);
      const snaps = {};
      batch.forEach(p => { snaps[p.id] = snapshot(p); });
      const res = await sb.from('patients').upsert(
        batch.map(p => ({
          user_id: uid,
          id: p.id,
          data: outbound(p),
          rev: p.rev || 1,
          deleted: false,
          updated_at: new Date(recTime(p) || Date.now()).toISOString()
        })),
        { onConflict: 'user_id,id' }
      );
      if (res.error) {
        const err = cloudError(res.error, res.status);
        const permanent = err.status >= 400 && err.status < 500 && ![401, 403, 408, 429].includes(err.status) && !err.setup;
        if (!permanent) throw err;
        dead += recordFailures(batch.map(p => ({ id: p.id, status: err.status, permanent: true })));
        continue;
      }
      const all = getAllRawPatients();
      all.forEach(p => {
        if (ownerOf(p) === me && snaps[p.id] !== undefined && snapshot(p) === snaps[p.id]) {
          p.status = 'synced';
          p.syncedAt = new Date().toISOString();
          delete p.syncMeta;
          sent++;
        }
      });
      saveRawPatients(all);
    }
    return { sent, dead };
  }

  const PROFILE_FIELDS = ['name', 'role', 'clinic', 'state', 'lga'];
  const AVATAR_BUCKET = 'avatars';
  let profileSyncing = false;

  function profileMetaKey(email) { return 'ruralcare_profile:' + normEmail(email); }
  function getProfileMeta(email) {
    const m = readJSON(profileMetaKey(email), null);
    return m && typeof m === 'object' ? m : null;
  }
  function setProfileMeta(email, meta) { writeJSON(profileMetaKey(email), meta); }

  function markProfileDirty(email, avatarChanged) {
    const meta = getProfileMeta(email) || { avatarPath: '' };
    meta.dirty = true;
    meta.updatedAt = new Date().toISOString();
    if (avatarChanged) meta.avatarDirty = true;
    setProfileMeta(email, meta);
    scheduleAutoSync();
  }

  function dataUrlToBlob(dataUrl) {
    const s = String(dataUrl || '');
    const comma = s.indexOf(',');
    const header = s.slice(5, comma);
    const mime = header.split(';')[0] || 'image/jpeg';
    const bin = atob(s.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error || new Error('read'));
      r.readAsDataURL(blob);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const url = typeof src === 'string' ? src : URL.createObjectURL(src);
      const img = new Image();
      img.onload = () => {
        if (typeof src !== 'string') URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        if (typeof src !== 'string') URL.revokeObjectURL(url);
        reject(new Error('image'));
      };
      img.src = url;
    });
  }

  async function processAvatar(src, size) {
    size = size || 256;
    const img = await loadImage(src);
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL('image/jpeg', 0.85);
  }

  async function pushProfile(sb, uid, me, remote, meta) {
    const users = getUsers();
    const i = users.findIndex(u => normEmail(u.email) === me);
    if (i < 0) return;
    const u = users[i];
    meta = meta || { avatarPath: '' };
    const oldPath = meta.avatarPath || (remote && remote.avatar_path) || '';
    let path = oldPath;
    let avatarOk = true;

    if (u.avatar && (meta.avatarDirty || !oldPath)) {
      try {
        let blob = dataUrlToBlob(u.avatar);
        if (blob.size > 400 * 1024) {
          u.avatar = await processAvatar(u.avatar);
          users[i] = u;
          saveUsers(users);
          blob = dataUrlToBlob(u.avatar);
        }
        const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
        const newPath = uid + '/avatar-' + Date.now() + '.' + ext;
        const up = await sb.storage.from(AVATAR_BUCKET).upload(newPath, blob, { contentType: blob.type || 'image/jpeg', upsert: false });
        if (up.error) throw up.error;
        path = newPath;
      } catch (e) {
        avatarOk = false;
      }
    }

    const stamp = meta.updatedAt || new Date().toISOString();
    const res = await sb.from('profiles').upsert({
      user_id: uid,
      name: u.name || null,
      role: u.role || null,
      clinic: u.clinic || null,
      state: u.state || null,
      lga: u.lga || null,
      avatar_path: path || null,
      updated_at: stamp
    }, { onConflict: 'user_id' });
    if (res.error) throw cloudError(res.error, res.status);

    setProfileMeta(me, { updatedAt: stamp, dirty: false, avatarDirty: !avatarOk && !!u.avatar, avatarPath: path || '' });
    if (oldPath && path && oldPath !== path) {
      try { sb.storage.from(AVATAR_BUCKET).remove([oldPath]).catch(() => {}); } catch (e) {}
    }
  }

  async function pullProfile(sb, me, remote, meta) {
    const users = getUsers();
    const i = users.findIndex(u => normEmail(u.email) === me);
    if (i < 0) return { changed: false, needsUpload: false };
    const u = users[i];
    let changed = false;

    PROFILE_FIELDS.forEach(k => {
      const v = remote[k] || '';
      if (k === 'name' && !v) return;
      if ((u[k] || '') !== v) {
        u[k] = v;
        changed = true;
      }
    });

    const remotePath = remote.avatar_path || '';
    const localPath = (meta && meta.avatarPath) || '';
    let newPath = localPath;
    let needsUpload = false;
    if (remotePath && (remotePath !== localPath || !u.avatar)) {
      try {
        const dl = await sb.storage.from(AVATAR_BUCKET).download(remotePath);
        if (!dl.error && dl.data) {
          u.avatar = await blobToDataUrl(dl.data);
          newPath = remotePath;
          changed = true;
        }
      } catch (e) {}
    } else if (!remotePath && localPath) {
      delete u.avatar;
      newPath = '';
      changed = true;
    } else if (!remotePath && !localPath && u.avatar) {
      needsUpload = true;
    }

    users[i] = u;
    saveUsers(users);
    setProfileMeta(me, { updatedAt: remote.updated_at, dirty: false, avatarDirty: needsUpload, avatarPath: newPath });
    return { changed, needsUpload };
  }

  async function syncProfile(sb, uid, me) {
    if (profileSyncing) return false;
    profileSyncing = true;
    try {
      if (!findUser(me)) return false;
      const meta = getProfileMeta(me);
      const res = await sb.from('profiles')
        .select('name,role,clinic,state,lga,avatar_path,updated_at')
        .eq('user_id', uid)
        .maybeSingle();
      if (res.error) throw cloudError(res.error, res.status);
      const remote = res.data;
      let changed = false;

      if (!remote || (meta && meta.dirty && ts(meta.updatedAt) >= ts(remote.updated_at))) {
        await pushProfile(sb, uid, me, remote, meta);
      } else {
        const r = await pullProfile(sb, me, remote, meta);
        changed = r.changed;
        if (r.needsUpload) {
          const fresh = getProfileMeta(me) || {};
          fresh.updatedAt = new Date().toISOString();
          fresh.avatarDirty = true;
          await pushProfile(sb, uid, me, remote, fresh);
        }
      }
      if (changed) {
        document.dispatchEvent(new CustomEvent('rc:profile'));
        try { bindProfileMenu(); } catch (e) {}
      }
      return changed;
    } finally {
      profileSyncing = false;
    }
  }

  async function cloudSync(me) {
    const sb = await sbClientAsync();
    if (!sb) {
      const e = new Error('offline');
      e.status = 0;
      throw e;
    }
    const { data } = await sb.auth.getSession();
    const session = data && data.session;
    if (!session || normEmail(session.user && session.user.email) !== me) {
      const e = new Error('session');
      e.status = 401;
      throw e;
    }
    const pulled = await pullRemote(sb, me);
    const pushed = await pushLocal(sb, session.user.id, me);
    try {
      await syncProfile(sb, session.user.id, me);
    } catch (e) {
      if (e && (e.status === 401 || e.status === 403)) throw e;
    }
    return { sent: pushed.sent, pulled, dead: pushed.dead };
  }

  async function bindRealtime() {
    if (rtBound || !getCurrentUser() || currentPage() === 'auth.html') return;
    try {
      const sb = await sbClientAsync();
      const { data } = await sb.auth.getSession();
      if (!data || !data.session) return;
      rtBound = true;
      const uid = data.session.user.id;
      sb.channel('rc-patients-' + uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: 'user_id=eq.' + uid }, () => {
          clearTimeout(rtTimer);
          rtTimer = setTimeout(() => { if (getSettings().autoSync) syncNow(true); }, 800);
        })
        .subscribe();
    } catch (e) {}
  }

  function scheduleAutoSync() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => autoSyncIfNeeded(true), 1500);
  }

  async function syncNow(silent) {
    if (syncing) return 0;
    const me = getCurrentUser();
    if (!me) return 0;
    if (silent === false) resetDeadLetters();
    markDemoSynced(me);
    const cfg = syncConfig();
    const cloud = !cfg.url;
    const queued = getPatients().filter(p => p.status === 'queued');
    const pending = queued.filter(p => !isDead(p));
    if (!cloud && !pending.length) {
      if (!queued.length && !silent) toast('Everything is already synced', 'check-circle');
      updateSyncBadges();
      return 0;
    }
    if (!(await probeOnline())) {
      updateSyncBadges();
      if (!silent) toast('No connection. Changes stay on this device.', 'wifi-off');
      return 0;
    }
    let sent = 0;
    let pulled = 0;
    let dead = 0;
    let retry = false;
    let retryAfter = 0;
    syncing = true;
    updateSyncBadges();
    try {
      if (cloud) {
        const r = await cloudSync(me);
        sent = r.sent;
        pulled = r.pulled;
        dead = r.dead;
      } else {
        let aborted = null;
        for (let i = 0; i < pending.length && !aborted; i += BATCH_SIZE) {
          const batch = pending.slice(i, i + BATCH_SIZE);
          const snaps = {};
          batch.forEach(p => { snaps[p.id] = snapshot(p); });
          const result = await sendBatch(cfg, batch.map(outbound));
          const all = getAllRawPatients();
          all.forEach(p => {
            if (ownerOf(p) === me && result.okIds.includes(p.id) && snaps[p.id] !== undefined && snapshot(p) === snaps[p.id]) {
              p.status = 'synced';
              p.syncedAt = new Date().toISOString();
              delete p.syncMeta;
              sent++;
            }
          });
          saveRawPatients(all);
          dead += recordFailures(result.failures);
          aborted = result.abort;
        }
        if (aborted) throw aborted;
      }
      retryCount = 0;
      clearTimeout(retryTimer);
      try { localStorage.setItem(lastSyncKey(me), new Date().toISOString()); } catch (e) {}
      if (sent || pulled) {
        const parts = [];
        if (sent) parts.push(sent + ' record' + (sent !== 1 ? 's' : '') + ' uploaded');
        if (pulled) parts.push(pulled + ' update' + (pulled !== 1 ? 's' : '') + ' received');
        toast(parts.join(', '), 'refresh-cw');
      } else if (!silent) {
        toast('Everything is up to date', 'check-circle');
      }
    } catch (e) {
      if (e && e.setup) {
        if (!silent || !setupWarned) toast('Cloud sync is not set up yet.', 'alert-triangle');
        setupWarned = true;
      } else if (e && (e.status === 401 || e.status === 403)) {
        if (!silent || !authWarned) toast('Sync was rejected. Please log in again.', 'lock');
        authWarned = true;
      } else {
        retry = true;
        retryAfter = (e && e.retryAfter) || 0;
        if (!silent) toast('Sync failed. It will retry automatically.', 'wifi-off');
      }
    } finally {
      syncing = false;
      if (retry) scheduleRetry(retryAfter);
      if (dead) toast(dead + ' record' + (dead !== 1 ? 's' : '') + ' could not be synced.', 'alert-triangle');
      if (!silent || sent || pulled || dead) {
        document.dispatchEvent(new CustomEvent('rc:synced'));
        if (typeof window.renderDashboard === 'function') window.renderDashboard();
      }
      updateSyncBadges();
    }
    return sent;
  }

  function updateSyncBadges() {
    const queuedList = getPatients().filter(p => p.status === 'queued');
    const queued = queuedList.length;
    const failed = queuedList.filter(isDead).length;
    const online = isOnline();
    document.querySelectorAll('[data-sync-badge]').forEach(el => {
      const extra = el.getAttribute('data-extra-class') || '';
      let cls;
      let text;
      if (syncing) {
        cls = 'pill-info';
        text = 'Syncing...';
      } else if (!online) {
        cls = 'pill-warning';
        text = 'Offline' + (queued ? ' \u00B7 ' + queued + ' queued' : '');
      } else if (failed > 0) {
        cls = 'pill-critical';
        text = failed + ' failed' + (queued - failed > 0 ? ' \u00B7 ' + (queued - failed) + ' queued' : '');
      } else if (queued > 0) {
        cls = 'pill-warning';
        text = queued + ' awaiting sync';
      } else {
        cls = 'pill-success';
        text = 'All synced';
      }
      el.className = 'pill ' + cls + (extra ? ' ' + extra : '');
      el.innerHTML = '<span class="pill-dot' + (!online ? ' offline-pulse' : '') + '"></span>' + text;
    });
  }

  let syncBound = false;

  function autoSyncIfNeeded(force) {
    if (!getSession() || !getSettings().autoSync || currentPage() === 'auth.html') return;
    const now = Date.now();
    if (!force && now - lastAuto < 10000) return;
    lastAuto = now;
    syncNow(true);
  }

  function bindSyncBadge() {
    updateSyncBadges();
    if (!syncBound) {
      syncBound = true;
      window.addEventListener('online', () => {
        retryCount = 0;
        probeOnline().then(() => {
          updateSyncBadges();
          autoSyncIfNeeded(true);
          document.dispatchEvent(new CustomEvent('rc:network', { detail: { online: true } }));
        });
      });
      window.addEventListener('offline', () => {
        netOk = false;
        updateSyncBadges();
        document.dispatchEvent(new CustomEvent('rc:network', { detail: { online: false } }));
      });
      clearInterval(probeTimer);
      probeTimer = setInterval(() => {
        if (document.visibilityState !== 'visible' || !getSession()) return;
        probeOnline().then(ok => {
          updateSyncBadges();
          if (ok) autoSyncIfNeeded();
        });
      }, 30000);
      if (probeTimer && typeof probeTimer.unref === 'function') probeTimer.unref();
      window.addEventListener('storage', updateSyncBadges);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') autoSyncIfNeeded();
      });
      setTimeout(() => { autoSyncIfNeeded(true); bindRealtime(); }, 1500);
    }
    document.querySelectorAll('[data-sync-btn]').forEach(btn => {
      if (btn.dataset.rcBound) return;
      btn.dataset.rcBound = '1';
      btn.addEventListener('click', () => syncNow(false));
    });
    return updateSyncBadges;
  }

  function registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
      }
    } catch (e) {}
  }

  let errorLogBound = false;

  function bindErrorLog() {
    if (errorLogBound) return;
    errorLogBound = true;
    window.addEventListener('error', e => {
      log('error', 'window-error', { message: String(e.message || '').slice(0, 160), file: String(e.filename || '').split('/').pop(), line: e.lineno || 0 });
    });
    window.addEventListener('unhandledrejection', e => {
      const r = e && e.reason;
      log('error', 'unhandled-rejection', { message: String((r && r.message) || r || '').slice(0, 160) });
    });
  }

  function loadSupabaseLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = SUPABASE_JS_SRC;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('load'));
      document.head.appendChild(s);
    });
  }

  function mountSecurity(host) {
    if (!host || host.getAttribute('data-rc-security')) return;
    host.setAttribute('data-rc-security', '1');

    const INPUT = 'w-full h-[46px] rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-white dark:bg-[#0F1524] px-4 text-[#1E293B] dark:text-[#E7EBF3] focus:outline-none focus:ring-2 focus:ring-[#52B788]/20 focus:border-[#52B788]';
    const BTN = 'px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed';
    const PRIMARY = BTN + ' bg-[#52B788] hover:bg-[#43A073] text-white';
    const GHOST = BTN + ' border border-[#E5E7EB] dark:border-white/10 text-[#64748B] dark:text-[#8B94A7] hover:bg-[#F1F5F9] dark:hover:bg-white/5';
    const DANGER = BTN + ' bg-[#DC2626] hover:bg-[#B91C1C] text-white';
    const LABEL = 'block text-[12.5px] font-semibold text-[#1E293B] dark:text-[#E7EBF3] mb-1.5';
    const MUTED = 'text-[12px] text-[#64748B] dark:text-[#8B94A7] leading-relaxed';
    const TRACK = "w-11 h-6 bg-[#E2E8F0] dark:bg-white/10 rounded-full peer peer-focus-visible:ring-2 peer-focus-visible:ring-[#52B788]/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#CBD5E1] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#52B788]";

    let factorId = null;
    let working = false;
    let modal = null;

    function h(tag, cls, text) {
      const n = document.createElement(tag);
      if (cls) n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    function button(cls, text, onClick) {
      const b = h('button', cls, text);
      b.type = 'button';
      b.addEventListener('click', onClick);
      return b;
    }

    function failText(error) {
      const msg = String((error && error.message) || '').toLowerCase();
      if (!navigator.onLine || msg === 'load' || (error && error.name === 'AuthRetryableFetchError') || /failed to fetch|network/.test(msg)) {
        return 'Unable to reach the server. Check your connection and try again.';
      }
      if ((error && error.status === 429) || /rate limit|too many/.test(msg)) {
        return 'Too many attempts. Please wait a few minutes and try again.';
      }
      return 'Something went wrong. Please try again.';
    }

    function isBadCode(error) {
      return !!error && (error.code === 'mfa_verification_failed' || /invalid/i.test(String(error.message || '')));
    }

    function passwordIssue(pw) {
      if (pw.length < 8) return 'Password must be at least 8 characters.';
      if (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) return 'Use upper and lower case letters and a number.';
      return null;
    }

    async function dropUnverified(c) {
      const listed = await c.auth.mfa.listFactors();
      const all = (listed.data && listed.data.all) || [];
      for (const f of all) {
        if (f.status === 'unverified') await c.auth.mfa.unenroll({ factorId: f.id });
      }
    }

    function closeModal() {
      if (!modal) return;
      document.removeEventListener('keydown', modal.onKey);
      modal.root.remove();
      const back = modal.back;
      modal = null;
      if (back && back.focus) back.focus();
    }

    function dismissModal() {
      if (working || !modal || modal.locked) return;
      const cb = modal.onDismiss;
      closeModal();
      if (cb) cb();
    }

    function openModal(titleText, nodes, onDismiss, locked) {
      closeModal();
      const root = h('div', 'fixed inset-0 z-[70] flex items-center justify-center px-4');
      const backdrop = h('div', 'absolute inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm');
      const panel = h('div', 'relative card p-6 w-full max-w-[400px] shadow-xl max-h-[90vh] overflow-y-auto space-y-4');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', titleText);
      panel.append(h('h3', 'text-[17px] font-semibold text-[#1E293B] dark:text-[#E7EBF3]', titleText));
      nodes.forEach(n => panel.append(n));
      root.append(backdrop, panel);
      document.body.appendChild(root);
      const onKey = e => { if (e.key === 'Escape') dismissModal(); };
      document.addEventListener('keydown', onKey);
      backdrop.addEventListener('click', dismissModal);
      modal = { root, onKey, onDismiss, locked: !!locked, back: document.activeElement };
      icons();
    }

    function messageLine() {
      const p = h('p', 'hidden');
      return {
        node: p,
        say(text, ok) {
          p.className = 'text-[12px] font-semibold ' + (ok ? 'text-[#15803D]' : 'text-[#DC2626]');
          p.textContent = text;
          p.setAttribute('role', ok ? 'status' : 'alert');
        },
        clear() { p.className = 'hidden'; p.textContent = ''; }
      };
    }

    function codeField(onComplete, msg) {
      const wrap = h('div');
      const label = h('label', LABEL, 'Verification code');
      const input = h('input', INPUT + ' tracking-widest');
      input.id = 'rc-code-' + Math.random().toString(36).slice(2, 7);
      label.htmlFor = input.id;
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'one-time-code';
      input.maxLength = 7;
      input.placeholder = '123456';
      input.addEventListener('input', () => {
        input.value = input.value.replace(/[^\d\s]/g, '');
        msg.clear();
        if (input.value.replace(/\s/g, '').length === 6) onComplete();
      });
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onComplete();
        }
      });
      wrap.append(label, input);
      return { wrap, input, read() { const v = input.value.replace(/\s/g, ''); return /^\d{6}$/.test(v) ? v : null; } };
    }

    async function createRecoveryCodes() {
      const c = await sbClientAsync();
      const res = await c.rpc('generate_recovery_codes');
      if (res.error) throw res.error;
      return res.data || [];
    }

    function showRecoveryCodes(codes) {
      const intro = h('p', MUTED, 'If you lose your authenticator app, each of these codes lets you sign in once.');
      const grid = h('div', 'grid grid-cols-2 gap-2 rounded-xl bg-[#F1F5F9] dark:bg-white/5 p-3');
      codes.forEach(code => grid.append(h('code', 'font-mono text-[13px] font-semibold text-center text-[#1E293B] dark:text-[#E7EBF3] select-all py-1', code)));
      const msg = messageLine();
      const actions = h('div', 'flex gap-2');
      actions.append(
        button(GHOST + ' flex-1', 'Copy', async e => {
          try { await navigator.clipboard.writeText(codes.join('\n')); e.currentTarget.textContent = 'Copied'; } catch (err) { msg.say('Select and copy manually.', false); }
        }),
        button(GHOST + ' flex-1', 'Download', () => {
          const text = 'RuralCare recovery codes\nCreated ' + new Date().toLocaleString() + '\n\n' + codes.join('\n') + '\n';
          const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
          const a = document.createElement('a');
          a.href = url;
          a.download = 'ruralcare-recovery-codes.txt';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        })
      );
      const saved = h('input', 'mt-0.5 w-4 h-4 rounded border-[#CBD5E1]');
      saved.type = 'checkbox';
      const savedLabel = h('label', 'flex items-start gap-2.5 cursor-pointer');
      savedLabel.append(saved, h('span', MUTED, 'I have saved these codes somewhere safe'));
      const done = button(PRIMARY + ' w-full', 'Done', () => { closeModal(); refreshRecoveryCount(); });
      done.disabled = true;
      saved.addEventListener('change', () => { done.disabled = !saved.checked; });
      openModal('Save your recovery codes', [intro, grid, actions, msg.node, savedLabel, done], null, true);
    }

    async function refreshRecoveryCount() {
      try {
        const c = await sbClientAsync();
        const res = await c.rpc('recovery_codes_remaining');
        if (res.error) throw res.error;
        const n = res.data || 0;
        recoveryDesc.textContent = n > 0 ? n + ' of 8 codes left.' : 'No codes left. Generate new ones.';
      } catch (e) {
        recoveryDesc.textContent = 'Recovery codes are not set up yet.';
      }
    }

    function showNewCodes() {
      const msg = messageLine();
      const intro = h('p', MUTED, 'This creates 8 new codes. Old codes will stop working.');
      const goBtn = button(PRIMARY + ' flex-1', 'Generate new codes', go);
      const row = h('div', 'flex gap-3');
      row.append(goBtn, button(GHOST, 'Cancel', dismissModal));
      async function go() {
        if (working) return;
        working = true;
        goBtn.disabled = true;
        try {
          const codes = await createRecoveryCodes();
          working = false;
          closeModal();
          showRecoveryCodes(codes);
        } catch (e) {
          goBtn.disabled = false;
          msg.say(failText(e), false);
        } finally {
          working = false;
        }
      }
      openModal('Generate new recovery codes?', [intro, msg.node, row]);
    }

    async function startEnroll() {
      if (working) return;
      working = true;
      mfaInput.disabled = true;
      try {
        const c = await sbClientAsync();
        await dropUnverified(c);
        const { data, error } = await c.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'RuralCare ' + Math.random().toString(36).slice(2, 8) });
        if (error || !data || !data.totp) throw error || new Error('enroll');
        showEnroll(data);
      } catch (e) {
        toast(failText(e), 'alert-triangle');
      } finally {
        working = false;
        mfaInput.disabled = false;
      }
    }

    function showEnroll(data) {
      const msg = messageLine();
      const intro = h('p', MUTED, 'Scan the QR code with an authenticator app, then enter the 6-digit code.');
      const qrBox = h('div', 'mx-auto w-44 h-44 rounded-xl border border-[#E5E7EB] bg-white p-2 flex items-center justify-center');
      const img = h('img', 'w-full h-full object-contain');
      img.alt = 'QR code';
      img.src = data.totp.qr_code;
      qrBox.append(img);

      const keyWrap = h('div', 'space-y-1.5');
      keyWrap.append(h('p', MUTED + ' text-center', 'Cannot scan? Enter this key:'));
      const keyRow = h('div', 'flex items-center gap-2');
      keyRow.append(h('code', 'flex-1 select-all break-all text-center font-mono text-[12px] font-semibold text-[#1E293B] dark:text-[#E7EBF3] bg-[#F1F5F9] dark:bg-white/5 rounded-lg px-3 py-2', data.totp.secret));
      keyRow.append(button(GHOST + ' !px-3 !py-2', 'Copy', async e => {
        try { await navigator.clipboard.writeText(data.totp.secret); e.currentTarget.textContent = 'Copied'; } catch (err) { msg.say('Copy manually.', false); }
      }));
      keyWrap.append(keyRow);

      const field = codeField(verify, msg);
      const warn = h('p', MUTED, 'Keep your authenticator app safe.');
      const verifyBtn = button(PRIMARY + ' flex-1', 'Verify and turn on', verify);
      const row = h('div', 'flex gap-3');
      row.append(verifyBtn, button(GHOST, 'Cancel', dismissModal));

      async function verify() {
        if (working) return;
        const code = field.read();
        if (!code) { msg.say('Enter the 6-digit code.', false); return; }
        working = true;
        verifyBtn.disabled = true;
        msg.clear();
        try {
          const c = await sbClientAsync();
          const { error } = await c.auth.mfa.challengeAndVerify({ factorId: data.id, code });
          if (error) throw error;
          try { await c.auth.refreshSession(); } catch (e) {}
          factorId = data.id;
          working = false;
          modal.onDismiss = null;
          closeModal();
          setMfa(true);
          toast('Two-step verification is on', 'shield-check');
          try {
            showRecoveryCodes(await createRecoveryCodes());
          } catch (codesError) {}
        } catch (e) {
          verifyBtn.disabled = false;
          field.input.value = '';
          field.input.focus();
          msg.say(isBadCode(e) ? 'Incorrect or expired code.' : failText(e), false);
        } finally {
          working = false;
        }
      }

      openModal('Set up two-step verification', [intro, qrBox, keyWrap, field.wrap, msg.node, warn, row], async () => {
        try { await dropUnverified(await sbClientAsync()); } catch (e) {}
      });
      field.input.focus();
    }

    function showDisable() {
      const msg = messageLine();
      const intro = h('p', MUTED, 'Enter the current code from your authenticator app to confirm.');
      const field = codeField(confirm, msg);
      const confirmBtn = button(DANGER + ' flex-1', 'Turn off', confirm);
      const row = h('div', 'flex gap-3');
      row.append(confirmBtn, button(GHOST, 'Cancel', dismissModal));

      async function confirm() {
        if (working) return;
        const code = field.read();
        if (!code) { msg.say('Enter the 6-digit code.', false); return; }
        if (!factorId) { msg.say('Verification method not found.', false); return; }
        working = true;
        confirmBtn.disabled = true;
        msg.clear();
        try {
          const c = await sbClientAsync();
          const verified = await c.auth.mfa.challengeAndVerify({ factorId, code });
          if (verified.error) throw verified.error;
          const removed = await c.auth.mfa.unenroll({ factorId });
          if (removed.error) throw removed.error;
          try { await c.rpc('clear_recovery_codes'); } catch (e) {}
          try { await c.auth.refreshSession(); } catch (e) {}
          factorId = null;
          working = false;
          closeModal();
          setMfa(false);
          toast('Two-step verification is off', 'shield-off');
        } catch (e) {
          confirmBtn.disabled = false;
          field.input.value = '';
          field.input.focus();
          msg.say(isBadCode(e) ? 'Incorrect or expired code.' : failText(e), false);
        } finally {
          working = false;
        }
      }

      openModal('Turn off two-step verification?', [intro, field.wrap, msg.node, row]);
      field.input.focus();
    }

    function showPassword() {
      const msg = messageLine();
      function pwField(labelText, auto) {
        const wrap = h('div');
        const label = h('label', LABEL, labelText);
        const input = h('input', INPUT);
        input.type = 'password';
        input.autocomplete = auto;
        input.maxLength = 128;
        input.id = 'rc-pw-' + Math.random().toString(36).slice(2, 7);
        label.htmlFor = input.id;
        input.addEventListener('input', msg.clear);
        wrap.append(label, input);
        return { wrap, input };
      }
      const cur = pwField('Current password', 'current-password');
      const next = pwField('New password', 'new-password');
      const again = pwField('Confirm new password', 'new-password');
      const othersLabel = h('label', 'flex items-start gap-2.5 cursor-pointer');
      const others = h('input', 'mt-0.5 w-4 h-4 rounded border-[#CBD5E1]');
      others.type = 'checkbox';
      others.checked = true;
      othersLabel.append(others, h('span', MUTED, 'Sign out of all other devices'));
      const saveBtn = button(PRIMARY + ' flex-1', 'Update password', save);
      const row = h('div', 'flex gap-3');
      row.append(saveBtn, button(GHOST, 'Cancel', dismissModal));

      async function save() {
        if (working) return;
        if (!cur.input.value) { msg.say('Enter your current password.', false); return; }
        const issue = passwordIssue(next.input.value);
        if (issue) { msg.say(issue, false); return; }
        if (next.input.value !== again.input.value) { msg.say('New passwords do not match.', false); return; }
        if (next.input.value === cur.input.value) { msg.say('New password must be different.', false); return; }
        working = true;
        saveBtn.disabled = true;
        msg.clear();
        try {
          const c = await sbClientAsync();
          const { data: s } = await c.auth.getSession();
          if (!s || !s.session) { msg.say('Session expired.', false); return; }
          const probe = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'rc-pw-verify' }
          });
          const check = await probe.auth.signInWithPassword({ email: s.session.user.email, password: cur.input.value });
          if (check.error) {
            msg.say('Current password is incorrect.', false);
            return;
          }
          const upd = await c.auth.updateUser({ password: next.input.value });
          if (upd.error) {
            msg.say(failText(upd.error), false);
            return;
          }
          if (others.checked) { try { await c.auth.signOut({ scope: 'others' }); } catch (e) {} }
          working = false;
          closeModal();
          toast('Password updated', 'check-circle');
        } catch (e) {
          msg.say(failText(e), false);
        } finally {
          working = false;
          saveBtn.disabled = false;
        }
      }

      openModal('Change password', [cur.wrap, next.wrap, again.wrap, othersLabel, msg.node, row]);
      cur.input.focus();
    }

    function showOthers() {
      const msg = messageLine();
      const intro = h('p', MUTED, 'Every other device signed in to your account will be asked to sign in again.');
      const goBtn = button(DANGER + ' flex-1', 'Sign out other devices', go);
      const row = h('div', 'flex gap-3');
      row.append(goBtn, button(GHOST, 'Cancel', dismissModal));
      async function go() {
        if (working) return;
        working = true;
        goBtn.disabled = true;
        try {
          const c = await sbClientAsync();
          const { error } = await c.auth.signOut({ scope: 'others' });
          if (error) throw error;
          working = false;
          closeModal();
          toast('Other devices signed out', 'check-circle');
        } catch (e) {
          goBtn.disabled = false;
          msg.say(failText(e), false);
        } finally {
          working = false;
        }
      }
      openModal('Sign out of other devices?', [intro, msg.node, row]);
    }

    const card = h('section', 'card overflow-hidden');
    const head = h('div', 'px-6 py-5 border-b border-[#E5E7EB] dark:border-white/5');
    const title = h('h2', 'text-[15px] font-semibold flex items-center gap-2.5 text-[#0D3B66] dark:text-white');
    const icon = h('i', 'w-[18px] h-[18px] text-[#52B788]');
    icon.setAttribute('data-lucide', 'shield-check');
    title.append(icon, document.createTextNode('Security'));
    head.append(title);
    const list = h('div', 'p-6 space-y-6');

    function row(titleText, descNode, control, divider) {
      const r = h('div', 'flex items-center justify-between gap-4' + (divider ? ' pt-6 border-t border-[#E5E7EB] dark:border-white/5' : ''));
      const left = h('div', 'min-w-0');
      left.append(h('h3', 'text-[13.5px] font-semibold text-[#1E293B] dark:text-[#E7EBF3]', titleText), descNode);
      r.append(left, control);
      return r;
    }

    const mfaDesc = h('p', MUTED + ' mt-1', 'Checking security settings…');
    const mfaLabel = h('label', 'relative inline-flex items-center cursor-pointer shrink-0');
    const mfaInput = h('input', 'sr-only peer');
    mfaInput.type = 'checkbox';
    mfaInput.disabled = true;
    mfaInput.setAttribute('aria-label', 'Two-step verification');
    mfaLabel.append(mfaInput, h('div', TRACK));
    mfaInput.addEventListener('change', () => {
      const wantOn = mfaInput.checked;
      mfaInput.checked = !wantOn;
      if (wantOn) startEnroll(); else showDisable();
    });

    function setMfa(on) {
      mfaInput.disabled = false;
      mfaInput.checked = on;
      recoveryRow.classList.toggle('hidden', !on);
      if (on) refreshRecoveryCount();
      mfaDesc.textContent = on ? 'On.' : 'Add a second step to sign-in with an authenticator app.';
    }

    const pwDesc = h('p', MUTED + ' mt-1', 'Use a strong password.');
    const devDesc = h('p', MUTED + ' mt-1', 'Sign out of all other devices.');
    const recoveryDesc = h('p', MUTED + ' mt-1', 'Checking…');
    const recoveryRow = row('Recovery codes', recoveryDesc, button(GHOST + ' shrink-0', 'New codes', showNewCodes), true);
    recoveryRow.classList.add('hidden');
    list.append(
      row('Two-step verification', mfaDesc, mfaLabel, false),
      recoveryRow,
      row('Password', pwDesc, button(GHOST + ' shrink-0', 'Change', showPassword), true),
      row('Other devices', devDesc, button(GHOST + ' shrink-0', 'Sign out', showOthers), true)
    );
    card.append(head, list);
    host.replaceChildren(card);
    icons();

    async function refresh() {
      try {
        const c = await sbClientAsync();
        const { data: s } = await c.auth.getSession();
        if (!s || !s.session) {
          mfaDesc.textContent = 'Session expired.';
          return;
        }
        const { data, error } = await c.auth.mfa.listFactors();
        if (error) throw error;
        const factor = data && data.totp && data.totp[0];
        factorId = factor ? factor.id : null;
        setMfa(!!factor);
      } catch (e) {
        mfaDesc.textContent = failText(e);
      }
    }

    refresh();
  }

  function bindSecurity() {
    if (!/^settings(\.html)?$/.test(currentPage()) || !getCurrentUser()) return;
    let host = document.getElementById('security-settings');
    if (host && host.getAttribute('data-rc-security')) return;
    if (!host) {
      host = document.createElement('div');
      host.id = 'security-settings';
      host.className = 'mt-6';
      (document.querySelector('main') || document.body).appendChild(host);
    }
    mountSecurity(host);
  }

  function boot() {
    const authPage = currentPage() === 'auth.html';
    try { migrateSharedRecords(); } catch (e) {}
    try { if (getCurrentUser()) syncDemoRecords(); else sessionStorage.removeItem('ruralcare_chat'); } catch (e) {}
    try {
      if (authPage) document.documentElement.classList.remove('dark');
      else bindTheme();
    } catch (e) {}
    try { bindProfileMenu(); } catch (e) {}
    try {
      const notice = sessionStorage.getItem('rc_notice');
      if (notice && getCurrentUser()) {
        sessionStorage.removeItem('rc_notice');
        setTimeout(() => toast(notice, 'shield-alert'), 600);
      }
    } catch (e) {}
    try { bindSyncBadge(); } catch (e) {}
    try { bindErrorLog(); } catch (e) {}
    try { bindSecurity(); } catch (e) {}
    icons();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('load', icons);
  window.addEventListener('load', () => { try { bindSecurity(); } catch (e) {} });

  return {
    SYMPTOM_OPTIONS,
    getSession, setSession, startSession, clearSession, requireSession, getCurrentUser, initials,
    registerUser, authenticate, findUser, greeting,
    getAllRawPatients, saveRawPatients, getPatients, getPatientById, savePatients, savePatient, addPatient, deletePatient, generatePatientId, seedIfEmpty,
    GUIDANCE, vitalText, audio, renderRecordings, isOnline, probeOnline,
    getFlags, ageYears, ageLabel, overallSeverity, statusPillHtml,
    getSettings, saveSettings, sbClient, clearLocalCache, pendingCount, lastSyncAt,
    normalizePhone, smsHref, smsFallbackDue, purgeDemoRecords, processAvatar, build: BUILD,
    toast, applyTheme, bindProfileMenu, bindSyncBadge, syncNow, configureSync, mountSecurity,
    fToC, cToF, log, getLog, clearLog
  };
})();

const RCAgent = (() => {
  let ready = false;
  let busy = false;
  let history = [];
  const ctx = { ids: [], patientId: null };
  const STORE = 'ruralcare_chat';
  const NOTE = '> Decision support only. It does not replace clinical judgement.';

  const SOP = {
    fever: {
      title: 'Fever and Malaria Protocol',
      keys: ['fever', 'temperature', 'temp', 'malaria', 'rdt', 'chills', 'febrile'],
      head: [
        'Fever is a temperature of **38.0 C or higher**. Above 39.5 C is urgent.',
        'Perform a **malaria RDT** for every fever case in an endemic area.',
        'Refer urgently for any danger sign, and always refer a febrile infant under 2 months.'
      ],
      more: [
        'Ask about duration, chills, headache, body aches, vomiting, convulsions and recent travel.',
        'Give oral fluids, continue feeding, and give paracetamol at the correct dose.'
      ],
      actions: [
        'Perform a malaria RDT.',
        'Give oral fluids and paracetamol.',
        'Check for danger signs and refer if any are present.'
      ],
      chips: ['Fever patients', 'Danger signs', 'Referral checklist']
    },
    hypertension: {
      title: 'Blood Pressure Triage',
      keys: ['bp', 'blood pressure', 'pressure', 'hypertension', 'hypertensive', 'systolic', 'diastolic', 'preeclampsia'],
      head: [
        'Adult normal is below 120/80. **140/90 or higher** is flagged for review.',
        '**160 systolic or 100 diastolic or higher** is severe. Rest for 5 minutes and confirm with a repeat reading.'
      ],
      more: [
        'Hypertensive emergency: 180/120 or higher with chest pain, confusion, or weakness. Refer immediately.'
      ],
      actions: [
        'Rest the patient for 5 minutes and repeat the reading.',
        'Ask about headache, blurred vision, chest pain.',
        'If repeat reading is severe, refer the same day.'
      ],
      chips: ['High BP patients', 'Danger signs', 'Referral checklist']
    },
    respiratory: {
      title: 'Respiratory Distress and SpO2 Protocol',
      keys: ['spo2', 'oxygen', 'saturation', 'breath', 'breathing', 'respiratory', 'cough', 'pneumonia'],
      head: [
        'Normal SpO2 is **95 to 100 percent** on room air. 92 to 94 percent is mild hypoxia.',
        'Below **92 percent** is critical. Sit upright, give oxygen if available and refer urgently.'
      ],
      more: [
        'Check probe placement and warm the finger before trusting a low reading.'
      ],
      actions: [
        'Sit patient upright and check airway and breathing.',
        'Warm finger and repeat SpO2 reading.',
        'Give oxygen if available and refer urgently if SpO2 stays below 92 percent.'
      ],
      chips: ['Low SpO2 patients', 'Danger signs', 'Referral checklist']
    }
  };

  function patients() {
    try {
      const l = RC.getPatients();
      return Array.isArray(l) ? l : [];
    } catch (e) {
      return [];
    }
  }

  function sev(p) {
    try { return RC.overallSeverity(p); } catch (e) { return 'clear'; }
  }

  function flags(p) {
    try { return RC.getFlags(p); } catch (e) { return []; }
  }

  function vitalsLine(p) {
    const v = p.vitals || {};
    const parts = [];
    if (v.bpSys && v.bpDia) parts.push('BP ' + v.bpSys + '/' + v.bpDia);
    if (v.temp) parts.push('Temp ' + v.temp + ' \u00B0C');
    if (v.hr) parts.push('HR ' + v.hr);
    if (v.spo2) parts.push('SpO2 ' + v.spo2 + '%');
    return parts.length ? parts.join(' \u00B7 ') : 'No vitals recorded';
  }

  function draftReferral(id) {
    try {
      const p = RC.getPatientById(id);
      if (!p) return null;
      const f = flags(p);
      const s = sev(p);
      const flagText = f.map(z => z.text).join('; ');
      const lines = [];
      if ((p.symptoms || []).length) lines.push('Presenting symptoms: ' + p.symptoms.join(', ') + '.');
      const vl = vitalsLine(p);
      if (vl) lines.push('Vitals: ' + vl + '.');
      if (flagText) lines.push('Triage flags: ' + flagText + '.');
      const draft = {
        pid: p.id,
        at: Date.now(),
        urgency: s === 'urgent' ? 'urgent' : 'routine',
        reason: flagText || 'Clinical escalation required.',
        assessment: 'Triage level ' + s.toUpperCase() + (flagText ? ': ' + flagText + '.' : '.'),
        findings: lines.join('\n')
      };
      sessionStorage.setItem('ruralcare_ref_draft', JSON.stringify(draft));
      return draft;
    } catch (e) { return null; }
  }

  function init() {
    if (ready || !document.body || document.getElementById('rc-ai-widget')) return;
    ready = true;
  }

  return { init, open: () => {}, close: () => {}, ask: () => {}, draftReferral };
})();

function startAgent() {
  setTimeout(() => {
    try { RCAgent.init(); } catch (e) {}
  }, 0);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startAgent);
else startAgent();