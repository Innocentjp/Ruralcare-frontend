const RC = (() => {
  const KEYS = {
    session: 'ruralcare_session',
    patients: 'ruralcare_patients',
    theme: 'ruralcare_theme',
    settings: 'ruralcare_settings',
    seeded: 'ruralcare_seeded',
    users: 'ruralcare_users'
  };

  const DEMO_IDS = ['RC-1001', 'RC-1002', 'RC-1003', 'RC-1004', 'RC-1005', 'RC-1006'];

  const SYMPTOM_OPTIONS = [
    'Fever', 'Headache', 'Cough', 'Difficulty breathing', 'Chest pain', 'Vomiting',
    'Diarrhea', 'Abdominal pain', 'Body aches', 'Fatigue', 'Dizziness', 'Skin rash',
    'Loss of appetite', 'Convulsions'
  ];

  const GUIDANCE = { version: '1.0', status: 'pending clinical review', updated: '2026-09-30' };
  const DEFAULT_SETTINGS = { autoSync: true, smsFallback: false, language: 'en' };

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

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function icons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {}
  }

  function getSession() {
    const s = readJSON(KEYS.session, null);
    return s && typeof s === 'object' ? s : null;
  }

  function setSession(session) {
    writeJSON(KEYS.session, session);
  }

  function clearSession() {
    try {
      localStorage.removeItem(KEYS.session);
      sessionStorage.removeItem('ruralcare_chat');
    } catch (e) {}
  }

  function requireSession() {
    const s = getSession();
    if (!s || !s.email) {
      window.location.replace('auth.html');
      return false;
    }
    return true;
  }

  function getCurrentUser() {
    const s = getSession();
    return s && s.email ? String(s.email).trim().toLowerCase() : '';
  }

  function initials(name) {
    const parts = String(name || '').replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    const first = parts[0][0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function getAllRawPatients() {
    const list = readJSON(KEYS.patients, []);
    return Array.isArray(list) ? list : [];
  }

  function saveRawPatients(list) {
    writeJSON(KEYS.patients, list);
  }

  function getPatients() {
    const all = getAllRawPatients();
    const user = getCurrentUser();
    return all.filter(p => {
      if (p.isDemo === true || DEMO_IDS.includes(p.id)) return true;
      if (!user) return false;
      return String(p.createdBy || '').trim().toLowerCase() === user;
    });
  }

  function savePatient(patient) {
    const all = getAllRawPatients();
    const user = getCurrentUser();
    if (!patient.createdBy) {
      patient.createdBy = user;
    }
    if (patient.isDemo === undefined) {
      patient.isDemo = DEMO_IDS.includes(patient.id);
    }
    const idx = all.findIndex(p => p.id === patient.id);
    if (idx >= 0) {
      patient.isEdited = true;
      patient.editedAt = new Date().toISOString();
      all[idx] = Object.assign({}, all[idx], patient);
    } else {
      all.unshift(patient);
    }
    saveRawPatients(all);
    return patient;
  }

  function addPatient(patient) {
    return savePatient(patient);
  }

  function savePatients(list) {
    const all = getAllRawPatients();
    list.forEach(p => {
      const idx = all.findIndex(item => item.id === p.id);
      if (idx >= 0) all[idx] = p;
      else all.push(p);
    });
    saveRawPatients(all);
  }

  function deletePatient(id) {
    const all = getAllRawPatients();
    saveRawPatients(all.filter(p => p.id !== id));
  }

  function generatePatientId() {
    const used = new Set(getAllRawPatients().map(p => p.id));
    let id;
    do {
      id = 'RC-' + String(Math.floor(1000 + Math.random() * 9000));
    } while (used.has(id));
    return id;
  }

  function fToC(f) { return (f - 32) * 5 / 9; }
  function cToF(c) { return c * 9 / 5 + 32; }

  function ageYears(patient) {
    const a = parseFloat(patient && patient.age);
    return Number.isFinite(a) && a >= 0 && a < 125 ? a : null;
  }

  function ageBand(patient) {
    const a = ageYears(patient);
    if (a === null || a >= 18) return 'adult';
    if (a < 1) return 'infant';
    if (a < 6) return 'young child';
    if (a < 12) return 'child';
    return 'adolescent';
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
          if (sys >= hi + 20) flags.push({ kind: 'bp', level: 'urgent', text: 'Severely elevated blood pressure for age (' + sys + (dia !== null ? '/' + dia : '') + ')' });
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
      else if (hr > r[1]) flags.push({ kind: 'hr', level: 'review', text: 'Elevated heart rate (' + hr + ' bpm)' });
      else if (hr < r[0]) flags.push({ kind: 'hr', level: 'review', text: 'Low heart rate (' + hr + ' bpm)' });
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

  function seedIfEmpty() {
    try {
      const all = getAllRawPatients();
      const existingIds = new Set(all.map(p => p.id));
      const now = Date.now();
      const day = 86400000;
      const base = { state: 'Enugu', lga: 'Enugu North', facility: 'Primary Health Centre', reviewed: false, isDemo: true, createdBy: 'system' };
      const seed = [
        { id: 'RC-1001', name: 'Chinedu Okafor', age: '54', gender: 'Male', contact: '08031234567', community: 'Independence Layout', vitals: { bpSys: '176', bpDia: '108', temp: '36.9', hr: '96', spo2: '96' }, symptoms: ['Headache', 'Dizziness'], notes: 'Persistent headache for three days.', createdAt: new Date(now - 1000 * 60 * 25).toISOString(), status: 'queued' },
        { id: 'RC-1002', name: 'Amaka Eze', age: '4', gender: 'Female', contact: '08059876543', community: 'Ugwuaji', vitals: { bpSys: '98', bpDia: '62', temp: '39.2', hr: '128', spo2: '95' }, symptoms: ['Fever', 'Vomiting'], notes: 'Fever for two days.', createdAt: new Date(now - 1000 * 60 * 70).toISOString(), status: 'queued' },
        { id: 'RC-1003', name: 'Ngozi Nnamdi', age: '67', gender: 'Female', contact: '', community: 'Obiagu', vitals: { bpSys: '132', bpDia: '84', temp: '37.4', hr: '104', spo2: '90' }, symptoms: ['Cough', 'Difficulty breathing'], notes: 'Productive cough.', createdAt: new Date(now - 1000 * 60 * 130).toISOString(), status: 'queued' },
        { id: 'RC-1004', name: 'Emeka Obi', age: '31', gender: 'Male', contact: '08123456780', community: 'Uwani', vitals: { bpSys: '118', bpDia: '76', temp: '37.0', hr: '72', spo2: '98' }, symptoms: ['Body aches'], notes: 'Routine follow-up.', createdAt: new Date(now - day).toISOString(), status: 'synced' },
        { id: 'RC-1005', name: 'Ifeoma Nwosu', age: '2', gender: 'Female', contact: '07033221144', community: 'Ugwuaji', vitals: { bpSys: '92', bpDia: '58', temp: '37.6', hr: '152', spo2: '97' }, symptoms: ['Diarrhea'], notes: 'Watery stools.', createdAt: new Date(now - 2 * day).toISOString(), status: 'synced' },
        { id: 'RC-1006', name: 'Uchenna Agu', age: '45', gender: 'Male', contact: '', community: 'Obiagu', vitals: { bpSys: '124', bpDia: '80', temp: '36.7', hr: '70', spo2: '99' }, symptoms: [], notes: '', createdAt: new Date(now - 3 * day).toISOString(), status: 'synced' }
      ].map(p => Object.assign({}, base, p));

      let changed = false;
      seed.forEach(item => {
        if (!existingIds.has(item.id)) {
          all.push(item);
          changed = true;
        }
      });
      if (changed) saveRawPatients(all);
    } catch (e) {}
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
      card.className = 'card px-4 py-2.5 flex items-center gap-2 text-[13px] font-semibold text-[#141A29] dark:text-[#E7EBF3]';
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
      setTimeout(() => { if (wrap.parentNode) wrap.parentNode.removeChild(wrap); }, 2600);
    } catch (e) {}
  }

  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem(KEYS.theme, theme); } catch (e) {}
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => btn.setAttribute('aria-checked', String(theme === 'dark')));
  }

  function bindTheme() {
    let stored = 'light';
    try { stored = localStorage.getItem(KEYS.theme) || 'light'; } catch (e) {}
    document.documentElement.classList.toggle('dark', stored === 'dark');
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-checked', String(stored === 'dark'));
      if (btn.dataset.rcBound) return;
      btn.dataset.rcBound = '1';
      btn.addEventListener('click', () => applyTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark'));
    });
  }

  function bindProfileMenu() {
    const session = getSession() || {};
    const name = session.name || session.email || 'Clinician';
    const role = session.role || 'Clinician';
    const init = initials(name);

    document.querySelectorAll('[data-profile-name]').forEach(el => { el.textContent = name; });
    document.querySelectorAll('[data-profile-role]').forEach(el => { el.textContent = role; });
    document.querySelectorAll('[data-avatar-initials]').forEach(el => { el.textContent = init; });
  }

  function isOnline() { return navigator.onLine; }

  function syncNow(silent) {
    const queued = getPatients().filter(p => p.status === 'queued');
    if (!queued.length) {
      if (!silent) toast('All local records are synced', 'check-circle');
      return;
    }
    const all = getAllRawPatients();
    all.forEach(p => {
      if (p.status === 'queued') {
        p.status = 'synced';
        p.syncedAt = new Date().toISOString();
      }
    });
    saveRawPatients(all);
    if (!silent) toast('Records synchronized successfully', 'refresh-cw');
    document.dispatchEvent(new CustomEvent('rc:synced'));
  }

  function bindSyncBadge() {
    window.addEventListener('online', () => {
      document.dispatchEvent(new CustomEvent('rc:network', { detail: { online: true } }));
      syncNow(true);
    });
    window.addEventListener('offline', () => {
      document.dispatchEvent(new CustomEvent('rc:network', { detail: { online: false } }));
    });
  }

  function boot() {
    seedIfEmpty();
    bindTheme();
    bindProfileMenu();
    bindSyncBadge();
    icons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    SYMPTOM_OPTIONS, getSession, setSession, clearSession, requireSession, getCurrentUser, initials,
    getAllRawPatients, saveRawPatients, getPatients, savePatients, savePatient, addPatient, deletePatient,
    generatePatientId, seedIfEmpty, GUIDANCE, vitalText, isOnline, getFlags, ageYears, ageBand, ageLabel,
    overallSeverity, statusPillHtml, getSettings, saveSettings, toast, applyTheme, bindProfileMenu,
    bindSyncBadge, syncNow, fToC, cToF
  };
})();