const RC = (() => {
  const KEYS = {
    session: 'ruralcare_session',
    patients: 'ruralcare_patients',
    theme: 'ruralcare_theme',
    settings: 'ruralcare_settings',
    seeded: 'ruralcare_seeded'
  };

  const SYMPTOM_OPTIONS = [
    'Fever', 'Headache', 'Cough', 'Difficulty breathing', 'Chest pain', 'Vomiting',
    'Diarrhea', 'Abdominal pain', 'Body aches', 'Fatigue', 'Dizziness', 'Skin rash',
    'Loss of appetite', 'Convulsions'
  ];

  const GUIDANCE = { version: '1.0', status: 'pending clinical review', updated: '2026-09-30' };

  const DEFAULT_SETTINGS = { autoSync: true, smsFallback: false, language: 'en' };

  const I18N = {
    pcm: {
      'btn-cancel': 'Cancel', 'btn-edit': 'Change Info', 'btn-log': 'Add New Visit', 'btn-print': 'Print',
      'btn-reg': 'Register New Patient', 'btn-save': 'Save & Queue', 'btn-sync': 'Sync now',
      'dash-greet': 'How far', 'dash-sub': 'Na wetin need your attention today be this.',
      'detail-title': 'Patient Record', 'intake-title': 'New Patient Intake', 'nav-dash': 'Dashboard',
      'nav-logout': 'Log Out', 'nav-new': 'New Patient', 'nav-profile': 'Profile', 'nav-settings': 'Settings',
      'queue-title': 'Patient Queue & AI Alerts', 'sec-ai': 'AI Assessment', 'sec-demo': 'Patient Details',
      'sec-hist': 'Visit History', 'sec-notes': 'Clinical Notes', 'sec-symp': 'Wetin Dey Do Am',
      'sec-trend': 'Vitals Trend (Last 4 Visits)', 'sec-vitals': 'Vitals', 'stat-flags': 'Pending AI Flags',
      'stat-pending': 'Wey Dey Wait Sync', 'stat-today': 'Wey We See Today', 'stat-total': 'Total Patients'
    },
    ha: {
      'btn-cancel': 'Soke', 'btn-edit': 'Gyara Bayani', 'btn-log': 'Rubuta Sabuwar Ziyara', 'btn-print': 'Buga',
      'btn-reg': 'Yi Rajistar Sabon Majiyyaci', 'btn-save': 'Ajiye & Jira', 'btn-sync': 'Daidaita yanzu',
      'dash-greet': 'Barka da zuwa', 'dash-sub': 'Ga abin da ke bukatar hankalinka yau.',
      'detail-title': 'Bayanan Majiyyaci', 'intake-title': 'Karbar Sabon Majiyyaci', 'nav-dash': 'Allon Bayani',
      'nav-logout': 'Fita', 'nav-new': 'Sabon Majiyyaci', 'nav-profile': 'Bayanan Kai', 'nav-settings': 'Saituna',
      'queue-title': 'Layin Majinyata & Gargadin AI', 'sec-ai': 'Kimantawar AI', 'sec-demo': 'Bayanan Mutum',
      'sec-hist': 'Tarihin Ziyara', 'sec-notes': 'Bayanan Likita', 'sec-symp': 'Alamun Yanzu',
      'sec-trend': 'Yanayin Muhimman Alamu (Ziyara 4 na Karshe)', 'sec-vitals': 'Muhimman Alamu',
      'stat-flags': 'Gargadin AI Masu Jira', 'stat-pending': 'Ana Jiran Daidaitawa',
      'stat-today': 'An Gani Yau', 'stat-total': 'Jimillar Majinyata'
    },
    ig: {
      'btn-cancel': 'Kagbuo', 'btn-edit': 'Dezie Ozi', 'btn-log': 'Dee Nleta Ohuru', 'btn-print': 'Bipụta',
      'btn-reg': 'Denye Onye Ọrịa Ọhụrụ', 'btn-save': 'Chekwaa & Hazie', 'btn-sync': 'Mekọrịta ugbu a',
      'dash-greet': 'Ndewo', 'dash-sub': 'Nke a bụ ihe chọrọ uche gị taa.',
      'detail-title': 'Ndekọ Onye Ọrịa', 'intake-title': 'Nnabata Onye Ọrịa Ọhụrụ', 'nav-dash': 'Ibe Nlele',
      'nav-logout': 'Pụọ', 'nav-new': 'Onye Ọrịa Ọhụrụ', 'nav-profile': 'Profaịlụ', 'nav-settings': 'Ntọala',
      'queue-title': 'Ahịrị Ndị Ọrịa & Ọkwa AI', 'sec-ai': 'Nyocha AI', 'sec-demo': 'Ozi Onwe',
      'sec-hist': 'Akụkọ Nleta', 'sec-notes': 'Ndetu Dọkịta', 'sec-symp': 'Ihe Mgbaàmà Ugbu a',
      'sec-trend': 'Ntụgharị Ihe Ndụ (Nleta 4 Ikpeazụ)', 'sec-vitals': 'Ihe Ndụ',
      'stat-flags': 'Ọkwa AI Na-echere', 'stat-pending': 'Na-echere Mmekọrịta',
      'stat-today': 'A Hụrụ Taa', 'stat-total': 'Ngụkọta Ndị Ọrịa'
    },
    yo: {
      'btn-cancel': 'Fagilee', 'btn-edit': 'Ṣatunṣe Alaye', 'btn-log': 'Kọ Ibewo Tuntun', 'btn-print': 'Tẹjade',
      'btn-reg': 'Forukọsilẹ Alaisan Tuntun', 'btn-save': 'Fipamọ & Dúró', 'btn-sync': 'Muṣiṣẹpọ bayi',
      'dash-greet': 'Ẹ n lẹ', 'dash-sub': 'Eyi ni ohun to nilo akiyesi rẹ loni.',
      'detail-title': 'Igbasilẹ Alaisan', 'intake-title': 'Gbigba Alaisan Tuntun', 'nav-dash': 'Pátákó Àkọ́kọ́',
      'nav-logout': 'Jáde', 'nav-new': 'Alaisan Tuntun', 'nav-profile': 'Profaili', 'nav-settings': 'Eto',
      'queue-title': 'Ìlà Àwọn Alaisan & Ikilọ AI', 'sec-ai': 'Ayẹwo AI', 'sec-demo': 'Alaye Ara-ẹni',
      'sec-hist': 'Itan Ibewo', 'sec-notes': 'Akọsilẹ Dokita', 'sec-symp': 'Àwọn Àmì Lọ́wọ́lọ́wọ́',
      'sec-trend': 'Ìtẹ̀sí Àwọn Àmì Pàtàkì (Ibewo 4 Kẹhin)', 'sec-vitals': 'Àwọn Àmì Pàtàkì',
      'stat-flags': 'Ikilọ AI To N Duro', 'stat-pending': 'N Duro De Muṣiṣẹpọ',
      'stat-today': 'A Rí Lónìí', 'stat-total': 'Apapọ Alaisan'
    }
  };

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
    if (!s || (!s.name && !s.email)) {
      window.location.replace('auth.html');
      return false;
    }
    return true;
  }

  function initials(name) {
    const parts = String(name || '').replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'U';
    const first = parts[0][0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  function getPatients() {
    const list = readJSON(KEYS.patients, []);
    return Array.isArray(list) ? list : [];
  }

  function savePatients(list) {
    writeJSON(KEYS.patients, list);
  }

  function addPatient(patient) {
    const list = getPatients();
    list.unshift(patient);
    savePatients(list);
    return patient;
  }

  function deletePatient(id) {
    const target = getPatients().find(p => p.id === id);
    if (target && Array.isArray(target.recordings)) {
      target.recordings.forEach(r => { audio.remove(r.id).catch(() => {}); });
    }
    savePatients(getPatients().filter(p => p.id !== id));
  }

  function generatePatientId() {
    const used = new Set(getPatients().map(p => p.id));
    let id;
    do {
      id = 'RC-' + String(Math.floor(1000 + Math.random() * 9000));
    } while (used.has(id));
    return id;
  }

  function fToC(f) {
    return (f - 32) * 5 / 9;
  }

  function cToF(c) {
    return c * 9 / 5 + 32;
  }

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

  function seedIfEmpty() {
    try {
      if (getPatients().length > 0) return;
      const now = Date.now();
      const day = 86400000;
      const session = getSession() || {};
      const base = { state: session.state || 'Enugu', lga: session.lga || 'Enugu North', facility: session.clinic || '', reviewed: false };
      const seed = [
        { id: 'RC-1001', name: 'Chinedu Okafor', age: '54', gender: 'Male', contact: '08031234567', community: 'Independence Layout', vitals: { bpSys: '176', bpDia: '108', temp: '36.9', hr: '96', spo2: '96' }, symptoms: ['Headache', 'Dizziness'], notes: 'Persistent headache for three days. Known to skip antihypertensive doses.', createdAt: new Date(now - 1000 * 60 * 25).toISOString(), status: 'queued' },
        { id: 'RC-1002', name: 'Amaka Eze', age: '4', gender: 'Female', contact: '08059876543', community: 'Ugwuaji', vitals: { bpSys: '98', bpDia: '62', temp: '39.2', hr: '128', spo2: '95' }, symptoms: ['Fever', 'Vomiting', 'Loss of appetite'], notes: 'Fever for two days. Mother reports reduced feeding.', createdAt: new Date(now - 1000 * 60 * 70).toISOString(), status: 'queued' },
        { id: 'RC-1003', name: 'Ngozi Nnamdi', age: '67', gender: 'Female', contact: '', community: 'Obiagu', vitals: { bpSys: '132', bpDia: '84', temp: '37.4', hr: '104', spo2: '90' }, symptoms: ['Cough', 'Difficulty breathing', 'Fatigue'], notes: 'Productive cough and breathlessness on minimal exertion.', createdAt: new Date(now - 1000 * 60 * 130).toISOString(), status: 'queued' },
        { id: 'RC-1004', name: 'Emeka Obi', age: '31', gender: 'Male', contact: '08123456780', community: 'Uwani', vitals: { bpSys: '118', bpDia: '76', temp: '37.0', hr: '72', spo2: '98' }, symptoms: ['Body aches'], notes: 'Routine follow-up. No new complaints.', createdAt: new Date(now - day).toISOString(), status: 'synced' },
        { id: 'RC-1005', name: 'Ifeoma Nwosu', age: '2', gender: 'Female', contact: '07033221144', community: 'Ugwuaji', vitals: { bpSys: '92', bpDia: '58', temp: '37.6', hr: '152', spo2: '97' }, symptoms: ['Diarrhea', 'Vomiting'], notes: 'Watery stools since yesterday. Drinking poorly.', createdAt: new Date(now - 2 * day).toISOString(), status: 'synced' },
        { id: 'RC-1006', name: 'Uchenna Agu', age: '45', gender: 'Male', contact: '', community: 'Obiagu', vitals: { bpSys: '124', bpDia: '80', temp: '36.7', hr: '70', spo2: '99' }, symptoms: [], notes: '', createdAt: new Date(now - 3 * day).toISOString(), status: 'synced' }
      ].map(p => Object.assign({}, base, p));
      savePatients(seed);
      localStorage.setItem(KEYS.seeded, '1');
    } catch (e) {}
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

  function fmtClock(sec) {
    const s = Math.max(0, Math.round(sec));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  const REC_CSS =
    '.rc-rec-btn{width:38px;height:38px;border-radius:999px;display:flex;align-items:center;justify-content:center;background:#fff;border:1px solid #E2E8F0;color:#0F766E;transition:background .2s,color .2s,border-color .2s;cursor:pointer;flex-shrink:0}' +
    '.dark .rc-rec-btn{background:#131A2A;border-color:rgba(148,163,184,.25);color:#34D399}' +
    '.rc-rec-btn:hover{background:#F0FDF9}.dark .rc-rec-btn:hover{background:#1A2338}' +
    '.rc-rec-btn:disabled{opacity:.4;cursor:not-allowed}' +
    '.rc-rec-btn.on{background:#0E9F6E;border-color:#0E9F6E;color:#fff;animation:rc-rec-ring 1.6s ease-out infinite}' +
    '@keyframes rc-rec-ring{0%{box-shadow:0 0 0 0 rgba(14,159,110,.5)}100%{box-shadow:0 0 0 12px rgba(14,159,110,0)}}' +
    '.rc-rec-live{display:none;align-items:center;gap:10px;padding:0 6px 0 8px;height:38px;border-radius:999px;background:rgba(14,159,110,.1);border:1px solid rgba(14,159,110,.3)}' +
    '.rc-rec-live.on{display:flex}' +
    '.rc-rec-wave{display:flex;align-items:center;gap:3px;height:24px}' +
    '.rc-rec-wave span{display:block;width:3px;height:4px;border-radius:2px;background:#0E9F6E;transition:height .08s linear}' +
    '.dark .rc-rec-wave span{background:#34D399}' +
    '.rc-rec-wave.anim span{animation:rc-rec-bar 1s ease-in-out infinite}' +
    '.rc-rec-wave.anim span:nth-child(2n){animation-delay:.15s}.rc-rec-wave.anim span:nth-child(3n){animation-delay:.3s}.rc-rec-wave.anim span:nth-child(5n){animation-delay:.45s}' +
    '@keyframes rc-rec-bar{0%,100%{height:4px}50%{height:20px}}' +
    '.rc-rec-time{font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;color:#0B7A55;min-width:30px}.dark .rc-rec-time{color:#34D399}' +
    '.rc-rec-x{width:24px;height:24px;display:flex;align-items:center;justify-content:center;border-radius:999px;color:#64748B;cursor:pointer;flex-shrink:0}.rc-rec-x:hover{color:#E11D48;background:rgba(225,29,72,.1)}' +
    '@media (prefers-reduced-motion:reduce){.rc-rec-btn.on{animation:none}.rc-rec-wave.anim span{animation:none;height:12px}}';

  function injectRecStyles() {
    if (document.getElementById('rc-rec-style')) return;
    const st = document.createElement('style');
    st.id = 'rc-rec-style';
    st.textContent = REC_CSS;
    document.head.appendChild(st);
  }

  function mountDictation(root, textarea, anchor) {
    if (!root || !textarea) return null;
    injectRecStyles();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const MAX_LIVE = 300;
    const MAX_REC = 120;
    const lang = navigator.language && /^en/i.test(navigator.language) ? navigator.language : 'en-NG';
    let mode = 'idle';
    let sr = null;
    let baseText = '';
    let originalText = '';
    let finalText = '';
    let stopping = false;
    let cancelled = false;
    let fatal = false;
    let preferOffline = false;
    let startedAt = 0;
    let tick = null;
    let limit = null;
    let recorder = null;
    let stream = null;
    let chunks = [];
    let worker = null;
    let nextId = 1;
    const waiters = {};
    let actx = null;
    let raf = 0;
    let errTimer = null;

    root.innerHTML = '';
    const dockHost = anchor || root;
    dockHost.querySelectorAll('.rc-rec-dock').forEach(n => n.remove());
    const dock = el('div', 'rc-rec-dock flex items-center gap-2' + (anchor ? ' absolute bottom-2.5 right-2.5' : ' mt-2 justify-end'));
    const bar = el('div', 'rc-rec-live');
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-label', 'Listening');
    const cancelBtn = el('button', 'rc-rec-x');
    cancelBtn.type = 'button';
    cancelBtn.setAttribute('aria-label', 'Discard dictation');
    cancelBtn.innerHTML = '<i data-lucide="x" class="w-4 h-4"></i>';
    const wave = el('div', 'rc-rec-wave');
    wave.setAttribute('aria-hidden', 'true');
    const bars = [];
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('span');
      bars.push(b);
      wave.appendChild(b);
    }
    const timer = el('span', 'rc-rec-time', '0:00');
    bar.append(cancelBtn, wave, timer);
    const btn = el('button', 'rc-rec-btn');
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Dictate notes');
    btn.innerHTML = '<i data-lucide="mic" class="w-[18px] h-[18px]"></i>';
    dock.append(bar, btn);
    dockHost.appendChild(dock);
    const err = el('p', 'hidden mt-2 text-[12px] font-semibold text-[#E11D48]');
    err.setAttribute('role', 'alert');
    root.appendChild(err);

    function setIcon(name, spin) {
      btn.innerHTML = '<i data-lucide="' + name + '" class="w-[18px] h-[18px]' + (spin ? ' animate-spin' : '') + '"></i>';
      icons();
    }

    function showError(message) {
      err.textContent = message;
      err.classList.remove('hidden');
      clearTimeout(errTimer);
      errTimer = setTimeout(() => err.classList.add('hidden'), 9000);
    }

    function micError(e) {
      const n = e && e.name;
      if (n === 'NotAllowedError' || n === 'SecurityError') return 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.';
      if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'No microphone was found on this device.';
      if (n === 'NotReadableError' || n === 'AbortError') return 'The microphone is in use by another app. Close it and try again.';
      return 'Could not start the microphone. Please try again.';
    }

    function stopWave() {
      cancelAnimationFrame(raf);
      raf = 0;
      if (actx) {
        try { actx.close(); } catch (e) {}
        actx = null;
      }
      wave.classList.remove('anim');
      bars.forEach(b => { b.style.height = ''; });
    }

    function startWave(s) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!s || !AC) {
        wave.classList.add('anim');
        return;
      }
      try {
        actx = new AC();
        const analyser = actx.createAnalyser();
        analyser.fftSize = 64;
        actx.createMediaStreamSource(s).connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        const draw = () => {
          analyser.getByteFrequencyData(data);
          bars.forEach((b, i) => {
            const v = data[Math.min(data.length - 1, 1 + i * 2)] / 255;
            b.style.height = (4 + Math.round(v * 20)) + 'px';
          });
          raf = requestAnimationFrame(draw);
        };
        draw();
      } catch (e) {
        stopWave();
        wave.classList.add('anim');
      }
    }

    function setUI(state) {
      const listening = state === 'live' || state === 'rec';
      const busy = state === 'busy';
      bar.classList.toggle('on', listening || busy);
      cancelBtn.style.display = busy ? 'none' : '';
      btn.classList.toggle('on', listening);
      btn.disabled = busy;
      btn.setAttribute('aria-label', listening ? 'Stop dictation' : busy ? 'Transcribing' : 'Dictate notes');
      bar.setAttribute('aria-label', busy ? 'Transcribing' : 'Listening');
      if (busy) {
        stopWave();
        wave.classList.add('anim');
        timer.textContent = '...';
        setIcon('loader-2', true);
      } else {
        if (!listening) stopWave();
        setIcon(listening ? 'square' : 'mic', false);
      }
    }

    function join(base, add) {
      const a = String(add || '').trim();
      if (!a) return base;
      const b = base.replace(/\s+$/, '');
      return b ? b + ' ' + a : a;
    }

    function cap(t) {
      return t.charAt(0).toUpperCase() + t.slice(1);
    }

    function write(value) {
      textarea.value = value;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.scrollTop = textarea.scrollHeight;
    }

    function beginTimer(max, onLimit) {
      startedAt = Date.now();
      timer.textContent = '0:00';
      tick = setInterval(() => {
        timer.textContent = fmtClock((Date.now() - startedAt) / 1000);
      }, 250);
      limit = setTimeout(onLimit, max * 1000);
    }

    function endTimer() {
      clearInterval(tick);
      clearTimeout(limit);
    }

    function finishLive() {
      endTimer();
      sr = null;
      mode = 'idle';
      setUI('idle');
      if (cancelled) {
        write(originalText);
      } else if (!fatal && textarea.value === originalText) {
        showError('No speech was detected. Try again.');
      }
    }

    async function startLive() {
      const r = new SR();
      r.lang = lang;
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      let local = false;
      try {
        if (typeof SR.available === 'function') {
          const a = await SR.available({ langs: [lang], processLocally: true });
          if (a === 'available') {
            r.processLocally = true;
            local = true;
          }
        }
      } catch (e) {}
      if (!local && !navigator.onLine) return false;

      originalText = textarea.value;
      baseText = textarea.value;
      finalText = '';
      stopping = false;
      cancelled = false;
      fatal = false;

      r.onresult = e => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) finalText = (finalText ? finalText + ' ' : '') + t.trim();
          else interim += t;
        }
        const spoken = (finalText + ' ' + interim).trim();
        write(join(baseText, cap(spoken)));
      };

      r.onerror = e => {
        const code = e && e.error;
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          fatal = true;
          showError('Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.');
        } else if (code === 'audio-capture') {
          fatal = true;
          showError('No microphone was found on this device.');
        } else if (code === 'network') {
          fatal = true;
          preferOffline = true;
          showError('Live dictation needs internet on this browser. Tap the mic again to use offline transcription.');
        } else if (code === 'language-not-supported') {
          fatal = true;
          preferOffline = true;
          showError('This browser cannot dictate in your language. Tap the mic again to use offline transcription.');
        }
      };

      r.onend = () => {
        if (!stopping && !fatal && mode === 'live') {
          baseText = textarea.value;
          finalText = '';
          try {
            r.start();
            return;
          } catch (e) {}
        }
        finishLive();
      };

      sr = r;
      try {
        r.start();
      } catch (e) {
        sr = null;
        return false;
      }
      mode = 'live';
      beginTimer(MAX_LIVE, stopAny);
      setUI('live');
      wave.classList.add('anim');
      return true;
    }

    function pickMime() {
      if (!window.MediaRecorder || typeof MediaRecorder.isTypeSupported !== 'function') return '';
      return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    }

    function releaseStream() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      stream = null;
    }

    async function startRec() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
        showError('This browser cannot record audio. Please use an up-to-date Chrome, Edge, Firefox or Safari.');
        return false;
      }
      if (window.isSecureContext === false) {
        showError('Dictation needs a secure connection (https) or localhost.');
        return false;
      }
      let s;
      try {
        s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      } catch (e) {
        showError(micError(e));
        return false;
      }
      const mime = pickMime();
      let mr;
      try {
        mr = new MediaRecorder(s, mime ? { mimeType: mime } : undefined);
      } catch (e) {
        s.getTracks().forEach(t => t.stop());
        showError('Could not start recording on this device.');
        return false;
      }
      stream = s;
      recorder = mr;
      chunks = [];
      cancelled = false;
      mr.ondataavailable = e => {
        if (e.data && e.data.size) chunks.push(e.data);
      };
      mr.onerror = () => {
        showError('Recording stopped unexpectedly.');
        cancelAny();
      };
      mr.onstop = onRecStop;
      mr.start(1000);
      mode = 'rec';
      beginTimer(MAX_REC, stopAny);
      setUI('rec');
      startWave(s);
      return true;
    }

    function onRecStop() {
      endTimer();
      const seconds = Math.round((Date.now() - startedAt) / 1000);
      const type = (recorder && recorder.mimeType) || (chunks[0] && chunks[0].type) || 'audio/webm';
      releaseStream();
      recorder = null;
      const blob = new Blob(chunks, { type });
      chunks = [];
      if (cancelled || !blob.size || seconds < 1) {
        mode = 'idle';
        setUI('idle');
        if (!cancelled) showError('That was too short. Hold on a little longer and try again.');
        return;
      }
      transcribe(blob);
    }

    function getWorker() {
      if (worker) return worker;
      worker = new Worker('./js/sttWorker.js', { type: 'module' });
      worker.onmessage = e => {
        const m = e.data || {};
        if (m.type === 'progress') {
          const p = m.progress;
          if (p && typeof p.progress === 'number') timer.textContent = Math.round(p.progress) + '%';
        } else if (m.type === 'ready') {
          timer.textContent = '...';
        } else if (m.type === 'result' || m.type === 'error') {
          const w = waiters[m.id];
          if (!w) return;
          delete waiters[m.id];
          if (m.type === 'result') w.resolve(m.text);
          else w.reject(new Error(m.message));
        }
      };
      worker.onerror = () => {
        Object.keys(waiters).forEach(k => {
          waiters[k].reject(new Error('worker'));
          delete waiters[k];
        });
        worker = null;
      };
      return worker;
    }

    function ask(audio) {
      return new Promise((resolve, reject) => {
        const id = nextId++;
        waiters[id] = { resolve, reject };
        try {
          getWorker().postMessage({ type: 'transcribe', id, audio }, [audio.buffer]);
        } catch (e) {
          delete waiters[id];
          reject(e);
        }
      });
    }

    async function decode(blob) {
      const AC = window.AudioContext || window.webkitAudioContext;
      const buf = await blob.arrayBuffer();
      const ctx = new AC();
      let decoded;
      try {
        decoded = await ctx.decodeAudioData(buf);
      } finally {
        try { ctx.close(); } catch (e) {}
      }
      const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
      const src = off.createBufferSource();
      src.buffer = decoded;
      src.connect(off.destination);
      src.start();
      const rendered = await off.startRendering();
      return rendered.getChannelData(0).slice();
    }

    async function transcribe(blob) {
      mode = 'busy';
      setUI('busy');
      try {
        const audio = await decode(blob);
        const text = String(await ask(audio) || '').trim();
        if (text) write(join(textarea.value, cap(text)));
        else showError('No speech was detected. Try again.');
      } catch (e) {
        showError(navigator.onLine ? 'Transcription failed. Please try again.' : 'Offline transcription needs a one-time model download. Connect to the internet once, then try again.');
      }
      mode = 'idle';
      setUI('idle');
    }

    function stopAny() {
      if (mode === 'live' && sr) {
        stopping = true;
        try { sr.stop(); } catch (e) { finishLive(); }
      } else if (mode === 'rec' && recorder && recorder.state !== 'inactive') {
        recorder.stop();
      }
    }

    function cancelAny() {
      if (mode === 'live' && sr) {
        cancelled = true;
        stopping = true;
        try { sr.abort(); } catch (e) { finishLive(); }
      } else if (mode === 'rec' && recorder) {
        cancelled = true;
        if (recorder.state !== 'inactive') recorder.stop();
        else onRecStop();
      }
    }

    async function start() {
      if (mode !== 'idle') return;
      err.classList.add('hidden');
      mode = 'starting';
      let ok = false;
      if (SR && !preferOffline) ok = await startLive();
      if (!ok && mode === 'starting') ok = await startRec();
      if (!ok && mode === 'starting') mode = 'idle';
    }

    btn.addEventListener('click', () => {
      if (mode === 'idle') start();
      else if (mode === 'live' || mode === 'rec') stopAny();
    });
    cancelBtn.addEventListener('click', cancelAny);
    window.addEventListener('pagehide', () => {
      if (mode === 'live' || mode === 'rec') cancelAny();
    });
    setUI('idle');

    return { stop: stopAny, isBusy: () => mode !== 'idle' };
  }

  function renderRecordings(list, patient, card) {
    const recs = Array.isArray(patient && patient.recordings) ? patient.recordings : [];
    list.innerHTML = '';
    if (card) card.classList.toggle('hidden', recs.length === 0);
    recs.forEach((r, i) => {
      const li = el('div', 'p-2.5 rounded-xl border border-[#E2E8F0] dark:border-white/10 bg-[#F8FAFD] dark:bg-white/[0.03]');
      const when = r.createdAt ? new Date(r.createdAt).toLocaleString() : '';
      li.appendChild(el('div', 'text-[12px] font-semibold text-[#141A29] dark:text-[#E7EBF3]', 'Voice note ' + (i + 1) + ' \u00B7 ' + fmtClock(r.duration || 0) + (when ? ' \u00B7 ' + when : '')));
      const holder = el('div', 'mt-2 text-[11.5px] text-[#5B6472] dark:text-[#8B94A7]', 'Loading audio...');
      li.appendChild(holder);
      list.appendChild(li);
      audio.get(r.id).then(blob => {
        if (!blob) {
          holder.textContent = 'This recording is not available on this device.';
          return;
        }
        const a = document.createElement('audio');
        a.controls = true;
        a.preload = 'metadata';
        a.src = URL.createObjectURL(blob);
        a.className = 'w-full h-9';
        holder.replaceWith(a);
      }).catch(() => { holder.textContent = 'This recording is not available on this device.'; });
    });
    icons();
  }

  function getSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, readJSON(KEYS.settings, {}));
  }

  function saveSettings(settings) {
    const merged = Object.assign({}, getSettings(), settings);
    writeJSON(KEYS.settings, merged);
    applyLanguage();
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
      i.className = 'w-4 h-4 text-[#2F80ED] shrink-0';
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
    document.dispatchEvent(new CustomEvent('rc:theme', { detail: theme }));
  }

  function bindTheme() {
    let stored = 'light';
    try {
      stored = localStorage.getItem(KEYS.theme) || 'light';
    } catch (e) {}
    document.documentElement.classList.toggle('dark', stored === 'dark');
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

  function applyLanguage() {
    const lang = getSettings().language;
    const dict = I18N[lang] || null;
    document.documentElement.lang = lang === 'pcm' ? 'en' : (lang || 'en');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      let node = null;
      if (el.children.length === 0) {
        node = el;
      } else {
        const texts = Array.from(el.childNodes).filter(n => n.nodeType === 3 && n.textContent.trim());
        node = texts.length ? texts[texts.length - 1] : null;
      }
      if (!node) return;
      const prop = node === el ? 'textContent' : 'nodeValue';
      if (el.dataset.i18nOrig === undefined) el.dataset.i18nOrig = node[prop];
      node[prop] = dict && dict[key] ? dict[key] : el.dataset.i18nOrig;
    });
  }

  function syncNow(silent) {
    const list = getPatients();
    const queued = list.filter(p => p.status === 'queued');
    if (!queued.length) {
      if (!silent) toast('Everything is already synced', 'check-circle');
      return 0;
    }
    if (!navigator.onLine) {
      if (!silent) toast('No connection. Records stay queued on this device.', 'wifi-off');
      return 0;
    }
    list.forEach(p => {
      if (p.status === 'queued') p.status = 'synced';
    });
    savePatients(list);
    toast(queued.length + ' record' + (queued.length !== 1 ? 's' : '') + ' synced', 'refresh-cw');
    if (typeof window.renderDashboard === 'function') window.renderDashboard();
    updateSyncBadges();
    return queued.length;
  }

  function updateSyncBadges() {
    const queued = getPatients().filter(p => p.status === 'queued').length;
    const online = navigator.onLine;
    document.querySelectorAll('[data-sync-badge]').forEach(el => {
      const extra = el.getAttribute('data-extra-class') || '';
      let cls;
      let text;
      if (!online) {
        cls = 'pill-warning';
        text = 'Offline' + (queued ? ' · ' + queued + ' queued' : '');
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

  function bindSyncBadge() {
    updateSyncBadges();
    if (!syncBound) {
      syncBound = true;
      window.addEventListener('online', () => {
        updateSyncBadges();
        if (getSettings().autoSync) syncNow(true);
      });
      window.addEventListener('offline', updateSyncBadges);
      window.addEventListener('storage', updateSyncBadges);
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

  function boot() {
    try { if (getSession()) seedIfEmpty(); else sessionStorage.removeItem('ruralcare_chat'); } catch (e) {}
    try { bindTheme(); } catch (e) {}
    try { bindProfileMenu(); } catch (e) {}
    try { applyLanguage(); } catch (e) {}
    try { bindSyncBadge(); } catch (e) {}
    icons();
    registerServiceWorker();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  window.addEventListener('load', icons);

  return {
    SYMPTOM_OPTIONS,
    getSession, setSession, clearSession, requireSession, initials,
    getPatients, savePatients, addPatient, deletePatient, generatePatientId, seedIfEmpty,
    GUIDANCE, vitalText, audio, mountDictation, renderRecordings,
    getFlags, ageYears, ageBand, ageLabel, overallSeverity, statusPillHtml,
    getSettings, saveSettings,
    toast, applyTheme, bindProfileMenu, bindSyncBadge, syncNow,
    fToC, cToF
  };
})();

const RCAgent = (() => {
  let ready = false;
  let busy = false;
  let history = [];
  const ctx = { ids: [], patientId: null };
  const STORE = 'ruralcare_chat';
  const NOTE = '> Decision support only. It does not replace clinical judgement or national treatment guidelines. Guidance v' + RC.GUIDANCE.version + ', ' + RC.GUIDANCE.status + '.';

  const SOP = {
    fever: {
      title: 'Fever and Malaria Protocol',
      keys: ['fever', 'temperature', 'temp', 'malaria', 'rdt', 'chills', 'febrile'],
      head: [
        'Fever is a temperature of **38.0 C or higher**. Above 39.5 C is urgent.',
        'Perform a **malaria RDT** for every fever case in an endemic area and treat a positive result per national guidelines.',
        'Refer urgently for any danger sign, and always refer a febrile infant under 2 months.'
      ],
      more: [
        'Ask about duration, chills, headache, body aches, vomiting, convulsions and recent travel.',
        'Give oral fluids, continue feeding, and give paracetamol at the correct weight-based dose.',
        'Danger signs: convulsions, lethargy or unconsciousness, unable to drink, repeated vomiting, stiff neck, severe pallor, dark urine.',
        'Reassess within 24 hours if fever persists.'
      ],
      actions: [
        'Perform a malaria RDT and record the result.',
        'Give oral fluids and paracetamol at a weight-based dose.',
        'Check for danger signs and refer if any are present.'
      ],
      chips: ['Fever patients', 'Danger signs', 'Referral checklist']
    },
    hypertension: {
      title: 'Blood Pressure Triage',
      keys: ['bp', 'blood pressure', 'pressure', 'hypertension', 'hypertensive', 'systolic', 'diastolic', 'preeclampsia', 'pre-eclampsia'],
      head: [
        'Adult normal is below 120/80. **140/90 or higher** is flagged for review.',
        '**160 systolic or 100 diastolic or higher** is severe. Rest for 5 minutes and confirm with a repeat reading on the other arm.',
        'Severe reading with headache, dizziness or blurred vision is hypertensive urgency. Refer the same day.'
      ],
      more: [
        'Hypertensive emergency: 180/120 or higher with chest pain, confusion, weakness, speech difficulty, seizure or breathlessness. Refer immediately.',
        'In pregnancy, 140/90 or higher needs assessment for pre-eclampsia, and 160/110 or higher is an emergency.',
        'Children have lower limits. RuralCare uses age-adjusted screening thresholds for patients under 18.',
        'Ask about missed medication, headache, visual changes and pregnancy.'
      ],
      actions: [
        'Rest the patient for 5 minutes and repeat the reading on the other arm.',
        'Ask about headache, blurred vision, chest pain, pregnancy and missed medication.',
        'If the repeat reading is still severe, refer the same day.'
      ],
      chips: ['High BP patients', 'Danger signs', 'Referral checklist']
    },
    respiratory: {
      title: 'Respiratory Distress and SpO2 Protocol',
      keys: ['spo2', 'oxygen', 'saturation', 'breath', 'breathing', 'respiratory', 'cough', 'pneumonia', 'hypoxia', 'hypoxemia', 'wheeze'],
      head: [
        'Normal SpO2 is **95 to 100 percent** on room air. 92 to 94 percent is mild hypoxia, so monitor closely.',
        'Below **92 percent** is critical. Sit the patient upright, give oxygen if available and refer urgently.',
        'Check the probe placement and warm the finger before trusting a low reading.'
      ],
      more: [
        'Fast breathing: under 2 months 60 or more per minute, 2 to 11 months 50 or more, 1 to 5 years 40 or more.',
        'Danger signs: chest indrawing, stridor at rest, cyanosis, grunting, inability to speak in full sentences.',
        'Look for chest infection, congestion or wheeze, and keep the patient calm and upright.'
      ],
      actions: [
        'Sit the patient upright and check airway and breathing.',
        'Warm the finger, reseat the probe and repeat the SpO2 reading.',
        'Give oxygen if available and refer urgently if SpO2 stays below 92 percent.'
      ],
      chips: ['Low SpO2 patients', 'Danger signs', 'Referral checklist']
    },
    dehydration: {
      title: 'Dehydration and ORS Guidelines',
      keys: ['dehydration', 'dehydrated', 'ors', 'diarrhea', 'diarrhoea', 'vomiting', 'rehydration', 'oral rehydration', 'zinc', 'watery stool'],
      head: [
        'Assess alertness, sunken eyes, ability to drink and **skin pinch return**.',
        '**Some dehydration:** give ORS about 75 ml per kg over 4 hours, then reassess.',
        '**Severe dehydration** (lethargic, unable to drink, very slow skin pinch): IV fluids if equipped, and refer urgently.'
      ],
      more: [
        'No dehydration: give extra fluids, continue feeding and advise on danger signs.',
        'For children with diarrhea give zinc for 10 to 14 days: 10 mg daily under 6 months, 20 mg daily from 6 months.',
        'Escalate for blood in stool, persistent vomiting, severe lethargy or diarrhea lasting over 14 days.'
      ],
      actions: [
        'Assess alertness, skin pinch and ability to drink.',
        'Start ORS immediately and reassess after 4 hours.',
        'Add zinc for children with diarrhea and refer if severe signs are present.'
      ],
      chips: ['Children patients', 'Danger signs', 'Referral checklist']
    }
  };

  const DANGER = [
    [/convuls|seizure|fitting|\bfits\b/, 'Convulsions'],
    [/unconscious|unresponsive|not responding|collapsed/, 'Unconscious or unresponsive'],
    [/letharg|very sleepy|hard to wake|drowsy/, 'Lethargy'],
    [/cannot drink|can't drink|unable to drink|not able to drink|refus\w+ (to )?(drink|feed|breastfeed)|not feeding|not drinking/, 'Unable to drink or feed'],
    [/stiff neck/, 'Stiff neck'],
    [/chest indrawing|chest in-drawing/, 'Chest indrawing'],
    [/blue lips|cyanosis|cyanotic/, 'Cyanosis'],
    [/blood in (the )?stool|bloody stool|bloody diarrh/, 'Blood in stool'],
    [/vomit\w* everything|repeated vomiting|persistent vomiting|keeps vomiting/, 'Persistent vomiting'],
    [/severe pallor|very pale/, 'Severe pallor'],
    [/heavy bleeding|severe bleeding|bleeding heavily/, 'Heavy bleeding'],
    [/chest pain/, 'Chest pain'],
    [/stridor/, 'Stridor']
  ];

  const VOCAB = [
    'fever', 'temperature', 'malaria', 'pressure', 'hypertension', 'oxygen', 'saturation', 'breathing',
    'respiratory', 'pneumonia', 'dehydration', 'dehydrated', 'diarrhea', 'diarrhoea', 'vomiting', 'urgent',
    'critical', 'patients', 'patient', 'summary', 'queue', 'referral', 'protocol', 'guidelines', 'children',
    'pregnant', 'convulsions', 'lethargic', 'unconscious', 'emergency', 'register', 'rehydration', 'headache',
    'dizziness', 'pending', 'overview', 'checklist', 'statistics', 'flagged'
  ];

  const RX = {};

  function rx(t) {
    if (!RX[t]) RX[t] = new RegExp('\\b' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (t.length <= 4 ? '\\b' : ''));
    return RX[t];
  }

  function has(q, terms) {
    return terms.some(t => rx(t).test(q));
  }

  function lev(a, b) {
    const m = a.length;
    const n = b.length;
    const d = [];
    for (let i = 0; i <= m; i++) d.push([i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[m][n];
  }

  function normalize(raw, list) {
    const protectedWords = new Set();
    list.forEach(p => {
      String(p.name || '').toLowerCase().split(/\s+/).forEach(w => protectedWords.add(w));
      protectedWords.add(String(p.id || '').toLowerCase());
    });
    return String(raw || '').toLowerCase().replace(/[\u2019]/g, "'").replace(/[a-z]+/g, w => {
      if (w.length < 5 || VOCAB.includes(w) || protectedWords.has(w)) return w;
      const maxD = w.length >= 9 ? 2 : 1;
      let best = w;
      let bd = maxD + 1;
      VOCAB.forEach(v => {
        if (Math.abs(v.length - w.length) > maxD) return;
        const d = lev(w, v);
        if (d < bd) {
          bd = d;
          best = v;
        }
      });
      return bd <= maxD ? best : w;
    });
  }

  function safe(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[\[\]|*]/g, '');
  }

  function R(text, chips, extra) {
    return Object.assign({ text, chips: chips || [] }, extra || {});
  }

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
    if (v.rr) parts.push('RR ' + v.rr);
    return parts.length ? parts.join(' \u00B7 ') : 'No vitals recorded';
  }

  function ageText(p) {
    let t = '';
    try { t = RC.ageLabel(p); } catch (e) {}
    return t;
  }

  function order(list) {
    const rank = { urgent: 0, review: 1, clear: 2 };
    return list.slice().sort((a, b) => rank[sev(a)] - rank[sev(b)]);
  }

  function patientLine(p) {
    const f = flags(p);
    const meta = [ageText(p), p.gender].filter(Boolean).join(' ');
    let out = '- [[patient:' + safe(p.id) + '|' + safe(p.name || 'Unnamed') + ']] [[badge:' + sev(p) + ']][[br]]' + (meta ? safe(meta) + ' \u00B7 ' : '') + vitalsLine(p);
    if (f.length) out += '[[br]]' + f.map(x => safe(x.text)).join('; ');
    return out;
  }

  function listReply(title, list, empty, chips) {
    if (!list.length) return R(empty, chips || ['Queue summary']);
    const sorted = order(list);
    ctx.ids = sorted.map(p => p.id);
    ctx.patientId = null;
    const shown = sorted.slice(0, 8);
    let out = '## ' + title + ' (' + list.length + ')\n' + shown.map(patientLine).join('\n');
    if (sorted.length > shown.length) out += '\n- and ' + (sorted.length - shown.length) + ' more. Open the dashboard for the full queue.';
    out += '\nAsk about "the first one" or a name for details.';
    return R(out, chips || ['Referral checklist', 'Queue summary']);
  }

  function queueReply(list) {
    const urgent = list.filter(p => sev(p) === 'urgent');
    const review = list.filter(p => sev(p) === 'review').length;
    const queued = list.filter(p => p.status === 'queued').length;
    const today = new Date().toDateString();
    const seen = list.filter(p => new Date(p.createdAt).toDateString() === today).length;
    let session = {};
    try { session = RC.getSession() || {}; } catch (e) {}
    let out = '## Queue overview' + (session.clinic ? ' \u00B7 ' + safe(session.clinic) : '') + '\n' +
      '- **' + list.length + '** patients in total, **' + seen + '** seen today\n' +
      '- [[badge:urgent]] **' + urgent.length + '**   [[badge:review]] **' + review + '**   [[badge:clear]] **' + (list.length - urgent.length - review) + '**\n' +
      '- **' + queued + '** awaiting sync, ' + (list.length - queued) + ' synced';
    if (urgent.length) out += '\nSee the ' + urgent.length + ' urgent patient' + (urgent.length > 1 ? 's' : '') + ' first.';
    ctx.ids = order(list).map(p => p.id);
    return R(out, urgent.length ? ['Urgent patients', 'Awaiting sync'] : ['Awaiting sync', 'Children patients']);
  }

  function protocolReply(key) {
    const s = SOP[key];
    const text = '## ' + s.title + '\n' + s.head.map(l => '- ' + l).join('\n') + '\n---more---\n' + s.more.map(l => '- ' + l).join('\n') + '\n' + NOTE;
    return R(text, s.chips);
  }

  function actionsFor(kinds) {
    const map = { fever: 'fever', bp: 'hypertension', spo2: 'respiratory', rr: 'respiratory' };
    const out = [];
    kinds.forEach(k => {
      if (map[k]) SOP[map[k]].actions.forEach(a => { if (!out.includes(a)) out.push(a); });
    });
    if (kinds.includes('hr')) out.push('Recheck the pulse manually for a full minute and look for pain, fever, dehydration or anxiety.');
    if (kinds.includes('temp')) out.push('Warm the patient, recheck the temperature and assess for infection or shock.');
    return out;
  }

  function levelBadge(l) {
    return '[[badge:' + l + ']]';
  }

  function patientReply(p) {
    ctx.patientId = p.id;
    const f = flags(p);
    const s = sev(p);
    const meta = [ageText(p), p.gender].filter(Boolean).join(' ');
    let out = '## [[patient:' + safe(p.id) + '|' + safe(p.name || 'Unnamed') + ']] ' + levelBadge(s) + '\n';
    out += '- **ID** ' + safe(p.id) + (meta ? ' \u00B7 ' + safe(meta) : '') + (p.community ? ' \u00B7 ' + safe(p.community) : '') + '\n';
    out += '- **Vitals** ' + vitalsLine(p) + '\n';
    out += '- **Sync** ' + (p.status === 'queued' ? 'Awaiting sync' : 'Synced');
    if (p.symptoms && p.symptoms.length) out += '\n- **Symptoms** ' + p.symptoms.map(safe).join(', ');
    if (p.pregnant) out += '\n- **Pregnant** Yes';
    if (p.weight) out += '\n- **Weight** ' + safe(p.weight) + ' kg';
    if (f.length) {
      out += '\n**Findings**\n' + f.map(x => '- ' + safe(x.text)).join('\n');
      const acts = actionsFor([...new Set(f.map(x => x.kind))]);
      if (acts.length) out += '\n**Suggested actions**\n' + acts.map(a => '- ' + a).join('\n');
      if (s === 'urgent') out += '\n- Escalate to the nearest referral facility and document the referral.';
    } else {
      out += '\nNo vital sign flags for this age group.';
    }
    const wt = parseFloat(p.weight);
    if (wt > 0 && (p.symptoms || []).some(x => /diarrhea|vomiting/i.test(x))) {
      out += '\n**ORS estimate** For some dehydration, about ' + Math.round(wt * 75) + ' ml over 4 hours (75 ml x ' + wt + ' kg), in small frequent sips, then reassess.';
    }
    out += '\n' + NOTE;
    return R(out, s === 'clear' ? ['Open ' + p.id, 'Queue summary'] : ['Open ' + p.id, 'Referral note', 'Urgent patients']);
  }

  function resolvePatient(q, list) {
    if (!list.length) return { patient: null };
    const tokens = q.split(/[^a-z0-9\-]+/).filter(t => t.length > 1);
    const scored = [];
    list.forEach(p => {
      const name = String(p.name || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      let score = 0;
      if (id && q.includes(id)) score += 10;
      if (name && q.includes(name)) score += 8;
      name.split(/\s+/).forEach(part => {
        if (part.length > 2 && tokens.includes(part)) score += 3;
      });
      if (score >= 3) scored.push({ p, score });
    });
    scored.sort((a, b) => b.score - a.score);
    if (scored.length) {
      if (scored.length > 1 && scored[0].score === scored[1].score && scored[0].score < 8) {
        return { ambiguous: scored.filter(x => x.score === scored[0].score).map(x => x.p) };
      }
      return { patient: scored[0].p };
    }

    if (ctx.ids.length) {
      const words = q.split(/\s+/).filter(Boolean).length;
      const ord = q.match(/\b(first|1st|second|2nd|third|3rd|fourth|4th|last)\b/) || q.match(/\b(?:number|no|#)\s?(\d)\b/);
      if (ord && (words <= 8 || /\b(one|patient|record|case)\b/.test(q))) {
        const map = { first: 0, '1st': 0, second: 1, '2nd': 1, third: 2, '3rd': 2, fourth: 3, '4th': 3 };
        let idx = ord[1] === 'last' ? ctx.ids.length - 1 : map[ord[1]] !== undefined ? map[ord[1]] : parseInt(ord[1], 10) - 1;
        const hit = list.find(p => p.id === ctx.ids[idx]);
        if (hit) return { patient: hit };
      }
    }

    if (/\b(him|her|this patient|that patient|the patient|same patient|current patient)\b/.test(q)) {
      let id = ctx.patientId;
      try {
        const fromUrl = new URLSearchParams(window.location.search).get('id');
        if (/\b(this|current) patient\b/.test(q) && fromUrl) id = fromUrl;
      } catch (e) {}
      const hit = list.find(p => p.id === id);
      if (hit) return { patient: hit };
    }
    return { patient: null };
  }

  function parseAge(q) {
    let m = q.match(/(\d+(?:\.\d+)?)[\s-]*(?:year|yr)s?[\s-]*(?:old)?/);
    if (m) return { value: parseFloat(m[1]), assumed: false };
    m = q.match(/\b(\d{1,3})\s*(?:yo|y\/o)\b/);
    if (m) return { value: parseFloat(m[1]), assumed: false };
    m = q.match(/(\d+)[\s-]*months?[\s-]*(?:old)?/);
    if (m) return { value: parseInt(m[1], 10) / 12, assumed: false };
    m = q.match(/(\d+)[\s-]*weeks?[\s-]*(?:old)?/);
    if (m) return { value: parseInt(m[1], 10) / 52, assumed: false };
    m = q.match(/\bage[d]?\s*(?:of|is|:)?\s*(\d{1,3})\b/);
    if (m) return { value: parseFloat(m[1]), assumed: false };
    if (/\b(newborn|neonate)\b/.test(q)) return { value: 0.03, assumed: true };
    if (/\b(baby|infant)\b/.test(q)) return { value: 0.5, assumed: true };
    return null;
  }

  function detectDanger(q) {
    const out = [];
    DANGER.forEach(([re, name]) => {
      const g = new RegExp(re.source, 'g');
      let m;
      while ((m = g.exec(q))) {
        const before = q.slice(Math.max(0, m.index - 30), m.index);
        if (/(\b(no|not|denies|denied|without|none|negative|nil|absent)\b|n't)[^.,;]*$/.test(before)) continue;
        if (!out.includes(name)) out.push(name);
        break;
      }
    });
    return out;
  }

  function parseCase(q) {
    const v = {};
    let m = q.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
    if (m) {
      const s = parseInt(m[1], 10);
      const d = parseInt(m[2], 10);
      if (s >= 50 && s <= 300 && d >= 20 && d <= 200 && s > d) {
        v.bpSys = String(s);
        v.bpDia = String(d);
      }
    }
    m = q.match(/(?:temp(?:erature)?|fever of|febrile at)\s*(?:of|is|was|=|:|at)?\s*(\d{2,3}(?:\.\d)?)\s*(f\b)?/);
    if (m) {
      let t = parseFloat(m[1]);
      if (m[2] || t > 45) t = (t - 32) * 5 / 9;
      if (t >= 30 && t <= 45) v.temp = t.toFixed(1);
    } else {
      m = q.match(/(\d{2}(?:\.\d)?)\s*(?:\u00B0\s*c|degrees|deg c|\bc\b)/);
      if (m) {
        const t = parseFloat(m[1]);
        if (t >= 30 && t <= 45) v.temp = String(t);
      }
    }
    m = q.match(/(?:spo2|sp02|oxygen(?: saturation)?|saturation|sats?)\s*(?:of|is|was|=|:|at)?\s*(\d{2,3})/);
    if (m) {
      const s = parseInt(m[1], 10);
      if (s >= 50 && s <= 100) v.spo2 = String(s);
    }
    m = q.match(/(?:\bhr\b|pulse|heart rate)\s*(?:of|is|was|=|:|at)?\s*(\d{2,3})/);
    if (m) {
      const h = parseInt(m[1], 10);
      if (h >= 20 && h <= 260) v.hr = String(h);
    }
    m = q.match(/(?:\brr\b|resp(?:iratory)? rate|breathing rate|respiration)\s*(?:of|is|was|=|:|at)?\s*(\d{2})/) || q.match(/(\d{2})\s*(?:breaths|\/min\b|per min)/);
    if (m) {
      const r = parseInt(m[1], 10);
      if (r >= 8 && r <= 90) v.rr = String(r);
    }
    const w = q.match(/(\d+(?:\.\d+)?)\s*kg\b/);
    return {
      vitals: v,
      hasVitals: Object.keys(v).length > 0,
      danger: detectDanger(q),
      age: parseAge(q),
      pregnant: /\b(pregnan|antenatal|trimester|gestation|expectant)/.test(q),
      weight: w ? parseFloat(w[1]) : null
    };
  }

  function caseReply(parsed, q, p) {
    let age = parsed.age ? parsed.age.value : null;
    let assumed = parsed.age ? parsed.age.assumed : false;
    if (age === null && p) {
      try { age = RC.ageYears(p); } catch (e) {}
    }
    const pseudo = { age: age === null ? '' : String(age), pregnant: parsed.pregnant, vitals: parsed.vitals };
    const f = flags(pseudo).slice();
    const v = parsed.vitals;

    let level = 'clear';
    if (f.some(x => x.level === 'urgent') || parsed.danger.length) level = 'urgent';
    else if (f.length) level = 'review';

    const readings = [];
    if (v.bpSys) readings.push('BP ' + v.bpSys + '/' + v.bpDia);
    if (v.temp) readings.push('Temp ' + v.temp + ' \u00B0C');
    if (v.spo2) readings.push('SpO2 ' + v.spo2 + '%');
    if (v.hr) readings.push('HR ' + v.hr);
    if (v.rr) readings.push('RR ' + v.rr + '/min');

    let out = '## Triage assessment ' + levelBadge(level) + '\n';
    const who = [];
    if (p) who.push(safe(p.name));
    if (age !== null) {
      let lbl = ageText(pseudo);
      who.push(lbl + (assumed ? ' (assumed)' : '') + (age < 18 ? ', age-adjusted ranges' : ''));
    }
    if (parsed.pregnant) who.push('pregnant');
    if (who.length) out += '- **Patient** ' + who.join(' \u00B7 ') + '\n';
    if (readings.length) out += '- **Readings** ' + readings.join(' \u00B7 ') + '\n';

    if (f.length) out += '\n**Findings**\n' + f.map(x => '- ' + safe(x.text)).join('\n') + '\n';
    if (parsed.danger.length) out += '\n**Danger signs reported**\n' + parsed.danger.map(d => '- ' + d).join('\n') + '\n';
    if (!f.length && !parsed.danger.length) out += '\nNo readings breach the thresholds for this age group.\n';

    const kinds = [...new Set(f.map(x => x.kind))];
    const acts = actionsFor(kinds);
    const gi = has(q, SOP.dehydration.keys);
    if (gi) SOP.dehydration.actions.forEach(a => { if (!acts.includes(a)) acts.push(a); });
    if (parsed.pregnant && f.some(x => x.kind === 'bp')) acts.unshift('Ask about severe headache, blurred vision, upper abdominal pain, swelling and fits. Refer without delay for obstetric assessment.');
    if (v.bpSys && (parseInt(v.bpSys, 10) >= 180 || parseInt(v.bpDia, 10) >= 120) && (age === null || age >= 12)) acts.unshift('BP is at emergency level (180/120 or higher). With headache, chest pain, confusion, weakness or breathlessness, refer immediately as an emergency.');
    if (parsed.danger.length) acts.unshift('Treat and stabilise the danger signs first: airway, breathing, circulation.');
    if (acts.length) out += '\n**Do now**\n' + acts.map(a => '- ' + a).join('\n') + '\n';

    if (gi && parsed.weight) {
      const ml = Math.round(parsed.weight * 75);
      out += '\n**ORS estimate** For some dehydration, about ' + ml + ' ml over 4 hours (75 ml x ' + parsed.weight + ' kg), given in small frequent sips, then reassess.\n';
    }
    out = out.replace('\nNo readings breach the thresholds for this age group.\n', readings.length ? '\nNo readings breach the thresholds for this age group.\n' : '');

    if (level === 'urgent') {
      out += '\n**Escalation**\n- Refer to the nearest facility now and keep the patient monitored during transfer.\n- Register the patient in RuralCare. With no data connection, use SMS Sync from the dashboard.\n';
    } else if (level === 'review') {
      out += '\n**Plan**\n- Monitor closely, repeat vitals in 15 to 30 minutes and arrange follow-up.\n';
    }

    if (readings.length && readings.length < 3) out += '\nAdd BP, temperature, SpO2 and pulse for a fuller assessment.\n';
    out += NOTE;
    const chips = level === 'urgent' ? ['Referral checklist', 'Danger signs'] : ['Queue summary', 'Fever protocol'];
    return R(out, chips);
  }

  function orsReply(parsed) {
    const ml = Math.round(parsed.weight * 75);
    const a = parsed.age ? parsed.age.value : null;
    let zinc = 'Zinc for 10 to 14 days: 10 mg daily under 6 months, 20 mg daily from 6 months.';
    if (a !== null) zinc = 'Zinc for 10 to 14 days: ' + (a < 0.5 ? '10 mg' : '20 mg') + ' daily for this age.';
    return R('## ORS estimate for ' + parsed.weight + ' kg\n' +
      '- **Some dehydration:** about **' + ml + ' ml** of ORS over 4 hours (75 ml per kg), in small frequent sips. Reassess after 4 hours.\n' +
      '- Continue breastfeeding or feeding during rehydration.\n' +
      '- ' + zinc + '\n' +
      '- **Severe dehydration** (lethargic, unable to drink, very slow skin pinch): IV fluids if equipped, and refer urgently.\n' +
      '- Refer for blood in stool, persistent vomiting or diarrhea lasting over 14 days.\n' + NOTE, ['Dehydration guidelines', 'Referral checklist']);
  }

  function pageId() {
    try {
      return new URLSearchParams(window.location.search).get('id');
    } catch (e) {
      return null;
    }
  }

  function noteReply(p) {
    const f = flags(p);
    const s = sev(p);
    let session = {};
    try { session = RC.getSession() || {}; } catch (e) {}
    const meta = [ageText(p), p.gender].filter(Boolean).join(', ');
    const blank = '________';
    const rows = [
      ['Date', new Date().toLocaleString()],
      ['Facility', session.clinic || ''],
      ['Patient', (p.name || '') + ' (' + p.id + ')'],
      ['Age and sex', meta],
      ['Community', p.community || ''],
      ['Contact', p.contact || ''],
      ['Pregnant', p.pregnant ? 'Yes' : ''],
      ['Weight', p.weight ? p.weight + ' kg' : ''],
      ['Triage level', s.toUpperCase()],
      ['Vitals', vitalsLine(p)],
      ['Symptoms', (p.symptoms || []).join(', ')],
      ['Findings', f.map(x => x.text).join('; ')],
      ['Clinical notes', p.notes || ''],
      ['Treatment given', blank + ' (drugs, doses, times)'],
      ['Reason for referral', f.length ? f.map(x => x.text).join('; ') : blank],
      ['Referred by', session.name || '']
    ].filter(r => r[1] !== '');
    const copy = 'REFERRAL NOTE\n' + rows.map(r => r[0] + ': ' + r[1]).join('\n');
    const text = '## Referral note ' + levelBadge(s) + '\n' + rows.map(r => '- **' + r[0] + '** ' + safe(r[1])).join('\n') + '\nComplete the blank fields before sending.';
    return R(text, ['Open ' + p.id, 'Referral checklist'], { copy });
  }

  function referralReply() {
    return R('## Referral checklist\n' +
      '- **Stabilise first:** airway, breathing, position, oxygen if available, fluids as appropriate.\n' +
      '- **Refer immediately for:** convulsions, unconsciousness, SpO2 below 92 percent, BP 180/120 or higher with symptoms, high fever with danger signs, severe dehydration, chest indrawing, heavy bleeding.\n' +
      '---more---\n' +
      '- **Write a referral note:** name, age, vitals, symptoms, treatment given with times, and reason for referral.\n' +
      '- Arrange transport and call ahead if there is signal.\n' +
      '- Register the patient in RuralCare. With no data, use SMS Sync from the dashboard.\n' +
      '- Follow up within 24 to 48 hours to confirm arrival and outcome.\n' + NOTE, ['Danger signs', 'Urgent patients']);
  }

  function dangerReply() {
    return R('## General danger signs\n' +
      '- Convulsions, unconsciousness or extreme lethargy\n' +
      '- Unable to drink, breastfeed or keep anything down\n' +
      '- Stiff neck, chest indrawing, stridor or cyanosis\n' +
      '---more---\n' +
      '- Severe pallor, heavy bleeding or blood in stool\n' +
      '- Chest pain, confusion, sudden weakness or speech difficulty\n' +
      '- In pregnancy: severe headache, blurred vision, fits, vaginal bleeding, reduced fetal movement\n' +
      'Any of these means urgent referral.\n' + NOTE, ['Referral checklist', 'Urgent patients']);
  }

  function appHelp(q) {
    if (has(q, ['register', 'new patient', 'add patient', 'intake'])) {
      return R('## Registering a patient\n- Open **New Patient** from the menu.\n- Fill in demographics and vitals, and select symptoms.\n- Choose **Save & Queue**. The record stays on this device and is marked awaiting sync.', ['Queue summary']);
    }
    if (has(q, ['sync', 'upload', 'offline', 'sms'])) {
      return R('## Syncing records\n- Records save to this device first and show as **Queued**.\n- With a connection and Auto-Sync on, they sync automatically. You can also tap **Sync now**.\n- With no data at all, **SMS Sync** on the dashboard texts a compact summary of queued cases.', ['Awaiting sync']);
    }
    if (has(q, ['edit', 'update', 'new visit', 'log visit'])) {
      return R('## Updating a record\n- Open the patient from the dashboard.\n- **Edit Info** corrects demographics. **Log New Visit** records fresh vitals and symptoms.\n- Either action queues the record for sync again.', ['Queue summary']);
    }
    if (has(q, ['dark', 'theme', 'language'])) {
      return R('Open **Settings** from the profile menu to change between light and dark mode and to pick a display language.', []);
    }
    return null;
  }

  function respond(raw) {
    const list = patients();
    const q = normalize(raw, list).trim();
    if (!q) return R('Type a question, or vitals such as "BP 160/100, temp 39, SpO2 92".', []);

    if (/^(clear|reset|start over|new chat|clear chat)$/.test(q)) return R('', [], { action: 'clear' });

    if (/^(hi|hello|hey|good (morning|afternoon|evening)|greetings)\b/.test(q)) {
      let name = '';
      try {
        const s = RC.getSession();
        if (s && s.name) name = ', ' + safe(s.name.replace(/^Dr\.?\s*/i, '').split(' ')[0]);
      } catch (e) {}
      return R('Hello' + name + '. I can summarise your queue, flag urgent patients, triage a case from vitals you type, and guide you through clinical protocols.', ['Queue summary', 'Urgent patients', 'Help']);
    }
    if (/\b(thanks|thank you|thx|appreciate)\b/.test(q)) return R('You are welcome. Stay safe out there.', ['Queue summary']);
    if (/^(bye|goodbye|see you)\b/.test(q)) return R('Goodbye. Your records remain safe on this device.', []);
    if (/\b(who are you|what are you|your name)\b/.test(q)) return R('I am the RuralCare Clinical Assistant. I run entirely on this device, read your local patient records and follow primary healthcare triage guidance. I support your judgement and never replace it.', ['Help']);

    if (has(q, ['help', 'what can you', 'commands', 'what do you do', 'how to use'])) {
      return R('## What I can do\n- **Queue:** "queue summary", "urgent patients", "children patients"\n- **Filters:** "high bp patients", "low spo2 patients", "fever patients", "awaiting sync"\n- **A patient:** a name or ID, "the first one", or "this patient"\n- **Triage:** type vitals, for example "4 year old, temp 39.4, spo2 90, lethargic"\n- **Protocols:** fever, blood pressure, SpO2, dehydration and ORS\n- **Checklists:** "referral checklist", "danger signs"', ['Queue summary', 'Urgent patients', 'Fever protocol']);
    }

    const found = resolvePatient(q, list);
    if (found.ambiguous) {
      ctx.ids = found.ambiguous.map(p => p.id);
      return R('More than one patient matches. Which one do you mean?\n' + found.ambiguous.map(p => '- [[patient:' + safe(p.id) + '|' + safe(p.name) + ']] \u00B7 ' + safe(p.id)).join('\n'), found.ambiguous.slice(0, 3).map(p => p.name));
    }
    const p = found.patient;
    const parsed = parseCase(q);

    if (p && /\b(open|go to|view|show record|pull up|take me)\b/.test(q)) {
      ctx.patientId = p.id;
      return R('Opening the record for [[patient:' + safe(p.id) + '|' + safe(p.name) + ']].', [], { navigate: 'patient-detail.html?id=' + encodeURIComponent(p.id) });
    }

    if (has(q, ['referral note', 'referral letter', 'referral form', 'prepare referral'])) {
      const target = p || list.find(x => x.id === ctx.patientId) || list.find(x => x.id === pageId());
      if (!target) return R('Which patient is the referral note for? Give a name or ID, or open the patient first.', ['Urgent patients']);
      ctx.patientId = target.id;
      return noteReply(target);
    }

    if (parsed.hasVitals || parsed.danger.length) return caseReply(parsed, q, p);
    if (parsed.weight && has(q, SOP.dehydration.keys)) return orsReply(parsed);
    if (p) return patientReply(p);

    const wantsList = has(q, ['patients', 'who', 'list', 'show', 'any', 'which', 'how many']);
    const proto = has(q, ['protocol', 'guideline', 'how to', 'manage', 'treat']);

    if (has(q, ['urgent', 'critical', 'emergency', 'flagged', 'priority']) && !proto) {
      if (!list.length) return R('No patient records are on this device yet.', []);
      return listReply('Urgent patients', list.filter(x => sev(x) === 'urgent'), 'No urgent patients in the local queue right now.');
    }
    if (has(q, ['review', 'attention']) && wantsList) {
      return listReply('Flagged for review', list.filter(x => sev(x) === 'review'), 'No patients are flagged for review.');
    }
    if (has(q, ['children', 'child', 'kids', 'paediatric', 'pediatric', 'infant', 'infants', 'under 5', 'under five', 'under-5']) && wantsList) {
      const limit = /under (5|five)|under-5/.test(q) ? 5 : 12;
      return listReply(limit === 5 ? 'Patients under 5' : 'Child patients', list.filter(x => { const a = RC.ageYears(x); return a !== null && a < limit; }), 'No child patients are in the queue.');
    }
    if (wantsList && has(q, ['high bp', 'bp', 'blood pressure', 'hypertens']) && !proto) {
      return listReply('Blood pressure flags', list.filter(x => flags(x).some(f => f.kind === 'bp')), 'No patients have abnormal blood pressure readings.', ['Blood pressure guidelines', 'Urgent patients']);
    }
    if (wantsList && has(q, ['spo2', 'oxygen', 'saturation', 'hypox']) && !proto) {
      return listReply('Oxygen flags', list.filter(x => flags(x).some(f => f.kind === 'spo2')), 'No patients have low oxygen saturation.', ['SpO2 protocol', 'Urgent patients']);
    }
    if (wantsList && has(q, ['fever', 'temperature', 'malaria']) && !proto) {
      return listReply('Patients with fever', list.filter(x => flags(x).some(f => f.kind === 'fever')), 'No patients currently meet the fever threshold.', ['Fever protocol', 'Urgent patients']);
    }
    if (has(q, ['pending', 'unsynced', 'queued', 'awaiting']) && !has(q, ['how do', 'how to'])) {
      return listReply('Awaiting sync', list.filter(x => x.status === 'queued'), 'All records on this device are synced.', ['Queue summary']);
    }
    if (has(q, ['queue', 'summary', 'overview', 'total', 'how many', 'statistics', 'stats', 'count', 'today'])) {
      return list.length ? queueReply(list) : R('No patient records are on this device yet.', []);
    }

    if (has(q, ['referral', 'refer', 'escalat', 'transfer'])) return referralReply();
    if (has(q, ['danger sign', 'emergency sign', 'red flag'])) return dangerReply();

    const app = appHelp(q);
    if (app) return app;

    let best = null;
    let bestScore = 0;
    Object.keys(SOP).forEach(k => {
      const score = SOP[k].keys.reduce((n, w) => n + (rx(w).test(q) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    });
    if (best) return protocolReply(best);

    if (has(q, ['diagnose', 'prescribe', 'dose', 'dosage', 'how much', 'mg'])) {
      return R('I give triage guidance only and cannot diagnose or prescribe. Please follow your national treatment guidelines and check dosing with a supervising clinician.', ['Referral checklist']);
    }

    return R('I am not sure I understood. I can help with your patient queue, vitals triage and clinical protocols. Try one of these.', ['Queue summary', 'Urgent patients', 'Fever protocol', 'Help']);
  }

  function inline(parent, str) {
    const re = /\*\*(.+?)\*\*|\[\[badge:(urgent|review|clear)\]\]|\[\[patient:([^|\]]+)\|([^\]]+)\]\]|\[\[br\]\]/g;
    let last = 0;
    let m;
    while ((m = re.exec(str))) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      if (m[1] !== undefined) {
        const b = document.createElement('strong');
        b.className = 'font-semibold';
        b.textContent = m[1];
        parent.appendChild(b);
      } else if (m[2]) {
        const tone = {
          urgent: 'bg-[#DC2626]/10 text-[#DC2626] dark:text-[#F87171]',
          review: 'bg-[#F59E0B]/15 text-[#B45309] dark:text-[#FBBF24]',
          clear: 'bg-[#0E9F6E]/10 text-[#0E9F6E] dark:text-[#34D399]'
        }[m[2]];
        const s = document.createElement('span');
        s.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide align-middle ' + tone;
        s.textContent = m[2];
        parent.appendChild(s);
      } else if (m[3] !== undefined) {
        const a = document.createElement('a');
        a.href = 'patient-detail.html?id=' + encodeURIComponent(m[3]);
        a.className = 'font-semibold text-[#0F766E] dark:text-[#34D399] underline underline-offset-2';
        a.textContent = m[4];
        parent.appendChild(a);
      } else {
        parent.appendChild(document.createElement('br'));
      }
      last = m.index + m[0].length;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function block(container, lines) {
    let ul = null;
    lines.forEach(line => {
      if (line.startsWith('- ')) {
        if (!ul) {
          ul = document.createElement('ul');
          ul.className = 'list-disc pl-4 space-y-1.5 my-1 marker:text-[#0F766E] dark:marker:text-[#34D399]';
          container.appendChild(ul);
        }
        const li = document.createElement('li');
        inline(li, line.slice(2));
        ul.appendChild(li);
        return;
      }
      ul = null;
      if (line.trim() === '') return;
      const el = document.createElement('div');
      if (line.startsWith('## ')) {
        el.className = 'font-semibold text-[14px] mb-1.5';
        inline(el, line.slice(3));
      } else if (/^\*\*[^*]+\*\*$/.test(line)) {
        el.className = 'mt-2.5 text-[11px] font-bold uppercase tracking-wide text-[#0F766E] dark:text-[#34D399]';
        el.textContent = line.slice(2, -2);
      } else {
        el.className = 'mt-1.5';
        inline(el, line);
      }
      container.appendChild(el);
    });
  }

  function renderInto(bubble, text) {
    const all = String(text).split('\n');
    const notes = all.filter(l => l.startsWith('> '));
    const body = all.filter(l => !l.startsWith('> '));
    const cut = body.indexOf('---more---');
    const head = cut === -1 ? body : body.slice(0, cut);
    block(bubble, head);
    if (cut !== -1) {
      const more = document.createElement('div');
      more.className = 'hidden';
      block(more, body.slice(cut + 1));
      bubble.appendChild(more);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'mt-2 text-[12px] font-semibold text-[#0F766E] dark:text-[#34D399] hover:underline cursor-pointer';
      btn.textContent = 'Show more';
      btn.addEventListener('click', () => {
        const open = more.classList.toggle('hidden') === false;
        btn.textContent = open ? 'Show less' : 'Show more';
      });
      bubble.appendChild(btn);
    }
    notes.forEach(n => {
      const el = document.createElement('div');
      el.className = 'mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-white/10 text-[11px] leading-snug text-[#64748B] dark:text-[#8B94A7]';
      el.textContent = n.slice(2);
      bubble.appendChild(el);
    });
  }

  function clearChips() {
    document.querySelectorAll('.rc-ai-sugg').forEach(el => el.remove());
  }

  function copyText(text, btn) {
    const done = () => {
      btn.textContent = 'Copied';
      setTimeout(() => { btn.textContent = 'Copy note'; }, 1800);
    };
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        done();
      } catch (e) {}
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
    else fallback();
  }

  function add(sender, text, chips, save, copy) {
    const box = document.getElementById('rc-ai-messages');
    if (!box) return null;
    const row = document.createElement('div');
    row.className = 'flex flex-col ' + (sender === 'user' ? 'items-end' : 'items-start');
    const bubble = document.createElement('div');
    bubble.className = (sender === 'user'
      ? 'bg-[#0F3D4C] dark:bg-[#0E7A5A] text-white whitespace-pre-wrap'
      : 'bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] shadow-sm border border-[#EDF1F7] dark:border-white/5') +
      ' px-3.5 py-3 rounded-xl max-w-[92%] break-words leading-relaxed';
    if (sender === 'user') bubble.textContent = text;
    else renderInto(bubble, text);
    if (sender !== 'user' && copy) {
      const cb = document.createElement('button');
      cb.type = 'button';
      cb.textContent = 'Copy note';
      cb.className = 'mt-3 text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-[#0F3D4C] dark:bg-[#0E9F6E] text-white hover:opacity-90 cursor-pointer';
      cb.addEventListener('click', () => copyText(copy, cb));
      bubble.appendChild(cb);
    }
    row.appendChild(bubble);
    if (sender !== 'user' && chips && chips.length) {
      const wrap = document.createElement('div');
      wrap.className = 'rc-ai-sugg flex flex-wrap gap-1.5 mt-2 max-w-[92%]';
      chips.forEach(c => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = c;
        b.className = 'text-[11.5px] font-semibold px-2.5 py-1 rounded-full border border-[#0F3D4C]/25 dark:border-[#34D399]/30 text-[#0F3D4C] dark:text-[#34D399] bg-white dark:bg-transparent hover:bg-[#0F3D4C]/5 dark:hover:bg-[#34D399]/10 transition-colors cursor-pointer';
        b.addEventListener('click', () => submit(c));
        wrap.appendChild(b);
      });
      row.appendChild(wrap);
    }
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    if (save !== false) {
      history.push({ s: sender, t: text, c: chips || [], p: copy || '' });
      history = history.slice(-40);
      try { sessionStorage.setItem(STORE, JSON.stringify(history)); } catch (e) {}
    }
    return row;
  }

  function addTyping() {
    const box = document.getElementById('rc-ai-messages');
    if (!box) return null;
    const row = document.createElement('div');
    row.className = 'flex justify-start';
    row.setAttribute('role', 'status');
    row.setAttribute('aria-label', 'Assistant is typing');
    const bubble = document.createElement('div');
    bubble.className = 'bg-white dark:bg-[#1A233A] shadow-sm border border-[#EDF1F7] dark:border-white/5 px-4 py-3.5 rounded-xl flex items-center gap-1.5';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'rc-ai-dot';
      bubble.appendChild(dot);
    }
    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
    return row;
  }

  function welcome() {
    const cur = patients().find(x => x.id === pageId());
    if (cur) {
      add('ai', 'You are viewing [[patient:' + safe(cur.id) + '|' + safe(cur.name) + ']]. Ask about this patient, or prepare a referral note.', ['This patient', 'Referral note', 'Urgent patients'], false);
      return;
    }
    add('ai', 'Hello. I am your clinical assistant. Ask about your queue, type a patient\'s vitals for instant triage, or open a protocol.', ['Queue summary', 'Urgent patients', 'Help'], false);
  }

  function resetChat() {
    history = [];
    ctx.ids = [];
    ctx.patientId = null;
    try { sessionStorage.removeItem(STORE); } catch (e) {}
    const box = document.getElementById('rc-ai-messages');
    if (box) box.innerHTML = '';
    welcome();
  }

  function submit(text) {
    const input = document.getElementById('rc-ai-input');
    const query = String(text || '').trim();
    if (!query || busy) return;
    busy = true;
    clearChips();
    add('user', query);
    if (input) input.value = '';
    const typing = addTyping();
    setTimeout(() => {
      let reply;
      try {
        reply = respond(query);
      } catch (e) {
        reply = R('Something went wrong while reading local data. The rest of the app is unaffected. Please try again.', ['Help']);
      }
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      if (reply.action === 'clear') {
        resetChat();
      } else {
        add('ai', reply.text, reply.chips, true, reply.copy);
        if (reply.navigate) setTimeout(() => { window.location.href = reply.navigate; }, 700);
      }
      busy = false;
      if (input) input.focus();
    }, 650);
  }

  function setOpen(open) {
    const box = document.getElementById('rc-ai-chatbox');
    const btn = document.getElementById('rc-ai-toggle');
    if (!box) return;
    box.classList.toggle('hidden', !open);
    box.classList.toggle('flex', open);
    if (btn) btn.setAttribute('aria-expanded', String(open));
    if (open) {
      const messages = document.getElementById('rc-ai-messages');
      if (messages) messages.scrollTop = messages.scrollHeight;
      const input = document.getElementById('rc-ai-input');
      if (input) setTimeout(() => input.focus(), 50);
    }
  }

  const FAB_CSS =
    '.rc-ai-fab{background:linear-gradient(135deg,#0F766E 0%,#0E9F6E 100%);border:2px solid rgba(255,255,255,.85);animation:rc-ai-bounce 2.6s ease-in-out infinite,rc-ai-glow 2.6s ease-in-out infinite;transition:filter .2s}' +
    '.rc-ai-fab:hover{filter:brightness(1.08);animation-play-state:paused,running}' +
    '.rc-ai-fab[aria-expanded="true"]{animation:rc-ai-glow 2.6s ease-in-out infinite}' +
    '@keyframes rc-ai-bounce{0%,100%{transform:translateY(0)}45%{transform:translateY(-9px)}60%{transform:translateY(-9px)}}' +
    '@keyframes rc-ai-glow{0%,100%{box-shadow:0 4px 14px rgba(14,159,110,.45),0 0 0 0 rgba(14,159,110,.45)}50%{box-shadow:0 8px 26px rgba(14,159,110,.7),0 0 0 12px rgba(14,159,110,0)}}' +
    '.rc-ai-dot{width:6px;height:6px;border-radius:999px;background:#0F766E;display:inline-block;animation:rc-ai-dot 1.2s ease-in-out infinite}.rc-ai-dot:nth-child(2){animation-delay:.18s}.rc-ai-dot:nth-child(3){animation-delay:.36s}' +
    '@keyframes rc-ai-dot{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}' +
    '.dark .rc-ai-dot{background:#34D399}' +
    '@media (prefers-reduced-motion:reduce){.rc-ai-dot{animation:none;opacity:.6}.rc-ai-fab{animation:none!important;box-shadow:0 4px 14px rgba(14,159,110,.45)}}';

  function injectStyles() {
    if (document.getElementById('rc-ai-style')) return;
    const st = document.createElement('style');
    st.id = 'rc-ai-style';
    st.textContent = FAB_CSS;
    document.head.appendChild(st);
  }

  const QUICK = [
    ['Queue summary', 'Queue summary'],
    ['Urgent patients', 'Urgent patients'],
    ['Fever protocol', 'Fever protocol'],
    ['BP guidelines', 'Blood pressure guidelines'],
    ['SpO2 protocol', 'SpO2 protocol'],
    ['ORS guidelines', 'Dehydration ORS'],
    ['Referral checklist', 'Referral checklist']
  ];

  function build() {
    injectStyles();
    const container = document.createElement('div');
    container.id = 'rc-ai-widget';
    container.className = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[55]';
    container.innerHTML =
      '<button id="rc-ai-toggle" type="button" aria-label="Open clinical assistant" aria-expanded="false" aria-controls="rc-ai-chatbox" class="rc-ai-fab w-14 h-14 rounded-full text-white flex items-center justify-center cursor-pointer">' +
        '<i data-lucide="sparkles" class="w-6 h-6"></i>' +
      '</button>' +
      '<div id="rc-ai-chatbox" role="dialog" aria-label="RuralCare clinical assistant" class="hidden absolute bottom-[4.5rem] right-0 w-[calc(100vw-2rem)] max-w-[400px] h-[min(560px,calc(100vh-9rem))] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-white/10 flex-col overflow-hidden">' +
        '<div class="bg-[#0F3D4C] dark:bg-[#0B2A35] text-white px-4 py-3 flex justify-between items-center shrink-0 border-b-2 border-[#0E9F6E]">' +
          '<div class="min-w-0">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<img id="rc-ai-logo" src="./img/rc-assistant-logo.png" alt="RuralCare" class="w-12 h-12 object-contain shrink-0">' +
              '<h4 class="font-semibold text-[14.5px] leading-none truncate">Clinical Assistant</h4>' +
            '</div>' +
            '<p class="text-[11px] text-white/70 leading-tight mt-1.5 pl-[3.75rem] flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#34D399] shrink-0"></span>Offline and private</p>' +
          '</div>' +
          '<div class="flex items-center gap-3 shrink-0 ml-2">' +
            '<button id="rc-ai-reset" type="button" aria-label="Clear conversation" title="Clear conversation" class="text-white/70 hover:text-white cursor-pointer"><i data-lucide="rotate-ccw" class="w-[18px] h-[18px]"></i></button>' +
            '<button id="rc-ai-close" type="button" aria-label="Close assistant" class="text-white/80 hover:text-white cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>' +
          '</div>' +
        '</div>' +
        '<div id="rc-ai-messages" aria-live="polite" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F5F8FA] dark:bg-[#0A0E17]"></div>' +
        '<div id="rc-ai-chips" class="px-3 py-2 flex gap-2 overflow-x-auto shrink-0 bg-[#F5F8FA] dark:bg-[#0A0E17] border-t border-[#E2E8F0] dark:border-white/5"></div>' +
        '<form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#E2E8F0] dark:border-white/10 flex gap-2 shrink-0">' +
          '<input type="text" id="rc-ai-input" autocomplete="off" placeholder="Ask, or type vitals: BP 160/100 temp 39" class="input-field flex-1 text-[12.5px] py-2">' +
          '<button type="submit" class="bg-[#0F3D4C] dark:bg-[#0E9F6E] text-white px-3.5 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#0B2E3A] dark:hover:bg-[#0B8B60] transition-colors cursor-pointer">Send</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(container);

    const logo = document.getElementById('rc-ai-logo');
    if (logo) logo.addEventListener('error', () => {
      if (!logo.dataset.fallback) {
        logo.dataset.fallback = '1';
        logo.src = './img/logo-icon-color.png';
      }
    });

    const chips = document.getElementById('rc-ai-chips');
    QUICK.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c[0];
      b.className = 'shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-[#0F3D4C]/25 dark:border-[#34D399]/30 text-[#0F3D4C] dark:text-[#34D399] bg-white dark:bg-transparent hover:bg-[#0F3D4C]/5 dark:hover:bg-[#34D399]/10 transition-colors cursor-pointer whitespace-nowrap';
      b.addEventListener('click', () => submit(c[1]));
      chips.appendChild(b);
    });

    document.getElementById('rc-ai-toggle').addEventListener('click', () => {
      setOpen(document.getElementById('rc-ai-chatbox').classList.contains('hidden'));
    });
    document.getElementById('rc-ai-close').addEventListener('click', () => setOpen(false));
    document.getElementById('rc-ai-reset').addEventListener('click', resetChat);
    document.getElementById('rc-ai-form').addEventListener('submit', e => {
      e.preventDefault();
      submit(document.getElementById('rc-ai-input').value);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') setOpen(false);
    });

    let saved = [];
    try { saved = JSON.parse(sessionStorage.getItem(STORE) || '[]'); } catch (e) {}
    if (Array.isArray(saved) && saved.length) {
      history = saved;
      saved.forEach((m, i) => add(m.s, m.t, i === saved.length - 1 ? m.c : [], false, m.p));
    } else {
      welcome();
    }
    icons();
  }

  function icons() {
    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {}
  }

  function init() {
    if (ready || !document.body || document.getElementById('rc-ai-widget')) return;
    const path = (window.location.pathname.split('/').pop() || '').toLowerCase();
    if (path === 'auth.html' || path === 'index.html' || path === '') return;
    try {
      build();
      ready = true;
    } catch (err) {
      const stale = document.getElementById('rc-ai-widget');
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
    }
  }

  return { respond, init, open: () => setOpen(true), close: () => setOpen(false), ask: submit };
})();

window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      RCAgent.init();
    } catch (e) {}
  }, 300);
});