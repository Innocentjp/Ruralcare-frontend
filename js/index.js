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

  function getFlags(patient) {
    const v = (patient && patient.vitals) || {};
    const sys = num(v.bpSys);
    const dia = num(v.bpDia);
    const temp = num(v.temp);
    const hr = num(v.hr);
    const spo2 = num(v.spo2);
    const flags = [];

    if (spo2 !== null) {
      if (spo2 < 92) flags.push({ kind: 'spo2', level: 'urgent', text: 'Critically low oxygen saturation (' + spo2 + '%)' });
      else if (spo2 < 94) flags.push({ kind: 'spo2', level: 'review', text: 'Low oxygen saturation (' + spo2 + '%)' });
    }

    if (sys !== null && dia !== null) {
      if (sys >= 160 || dia >= 100) flags.push({ kind: 'bp', level: 'urgent', text: 'Severely elevated blood pressure (' + sys + '/' + dia + ')' });
      else if (sys >= 140 || dia >= 90) flags.push({ kind: 'bp', level: 'review', text: 'Elevated blood pressure (' + sys + '/' + dia + ')' });
      else if (sys < 90 || dia < 60) flags.push({ kind: 'bp', level: 'review', text: 'Low blood pressure (' + sys + '/' + dia + ')' });
    }

    if (temp !== null) {
      if (temp >= 39.5) flags.push({ kind: 'fever', level: 'urgent', text: 'High fever (' + temp + ' C)' });
      else if (temp >= 38) flags.push({ kind: 'fever', level: 'review', text: 'Fever (' + temp + ' C)' });
      else if (temp < 35.5) flags.push({ kind: 'temp', level: 'review', text: 'Low body temperature (' + temp + ' C)' });
    }

    if (hr !== null) {
      if (hr > 130 || hr < 40) flags.push({ kind: 'hr', level: 'urgent', text: 'Dangerous heart rate (' + hr + ' bpm)' });
      else if (hr > 100) flags.push({ kind: 'hr', level: 'review', text: 'Elevated heart rate (' + hr + ' bpm)' });
      else if (hr < 60) flags.push({ kind: 'hr', level: 'review', text: 'Low heart rate (' + hr + ' bpm)' });
    }

    return flags;
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
        { id: 'RC-1005', name: 'Ifeoma Nwosu', age: '2', gender: 'Female', contact: '07033221144', community: 'Ugwuaji', vitals: { bpSys: '92', bpDia: '58', temp: '37.6', hr: '118', spo2: '97' }, symptoms: ['Diarrhea', 'Vomiting'], notes: 'Watery stools since yesterday. Drinking poorly.', createdAt: new Date(now - 2 * day).toISOString(), status: 'synced' },
        { id: 'RC-1006', name: 'Uchenna Agu', age: '45', gender: 'Male', contact: '', community: 'Obiagu', vitals: { bpSys: '124', bpDia: '80', temp: '36.7', hr: '70', spo2: '99' }, symptoms: [], notes: '', createdAt: new Date(now - 3 * day).toISOString(), status: 'synced' }
      ].map(p => Object.assign({}, base, p));
      savePatients(seed);
      localStorage.setItem(KEYS.seeded, '1');
    } catch (e) {}
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
    try { if (getSession()) seedIfEmpty(); } catch (e) {}
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
    getFlags, overallSeverity, statusPillHtml,
    getSettings, saveSettings,
    toast, applyTheme, bindProfileMenu, bindSyncBadge, syncNow,
    fToC, cToF
  };
})();

const RCAgent = (() => {
  let ready = false;
  let busy = false;

  const SOP = {
    fever: {
      title: 'Fever and Malaria Protocol',
      keys: ['fever', 'temperature', 'temp', 'malaria', 'rdt', 'chills', 'febrile'],
      lines: [
        'Fever is a temperature of 38.0 C or higher. Above 39.5 C is treated as urgent in RuralCare.',
        'Ask about duration, chills, headache, body aches, vomiting, convulsions and recent travel.',
        'Perform a malaria RDT for every fever case in an endemic area. Treat a positive result per national guidelines.',
        'Give oral fluids, continue feeding, and give paracetamol at the correct weight-based dose.',
        'Refer urgently for any danger sign: convulsions, lethargy or unconsciousness, unable to drink, repeated vomiting, stiff neck, severe pallor or dark urine.',
        'Refer any febrile infant under 2 months. Reassess within 24 hours if fever persists.'
      ],
      actions: [
        'Perform a malaria RDT and record the result.',
        'Give oral fluids and paracetamol at a weight-based dose.',
        'Check for danger signs and refer if any are present.'
      ]
    },
    hypertension: {
      title: 'Blood Pressure Triage',
      keys: ['bp', 'blood pressure', 'pressure', 'hypertension', 'hypertensive', 'systolic', 'diastolic', 'preeclampsia', 'pre-eclampsia'],
      lines: [
        'Normal: below 120/80 mmHg. Elevated: 120 to 139 / 80 to 89, advise lifestyle changes and recheck.',
        'Flagged for review in RuralCare: 140/90 or higher. Rest the patient for 5 minutes and repeat on the other arm.',
        'Severe: 160 systolic or higher, or 100 diastolic or higher. Confirm with a repeat reading.',
        'Hypertensive urgency: severe reading with headache, dizziness or blurred vision. Keep the patient calm and seated and refer the same day.',
        'Hypertensive emergency: 180/120 or higher with chest pain, confusion, weakness, speech difficulty, seizure or breathlessness. Refer immediately.',
        'In pregnancy any severe reading needs urgent referral because of pre-eclampsia risk.'
      ],
      actions: [
        'Rest the patient for 5 minutes and repeat the reading on the other arm.',
        'Ask about headache, blurred vision, chest pain, pregnancy and missed medication.',
        'If the repeat reading is still severe, refer the same day.'
      ]
    },
    respiratory: {
      title: 'Respiratory Distress and SpO2 Protocol',
      keys: ['spo2', 'oxygen', 'saturation', 'breath', 'breathing', 'respiratory', 'cough', 'pneumonia', 'hypoxia', 'hypoxemia', 'wheeze'],
      lines: [
        'Normal SpO2 is 95 to 100 percent on room air.',
        'Mild hypoxia is 92 to 94 percent. Look for chest infection, keep the patient upright and monitor closely.',
        'Below 92 percent is critical. Check airway and breathing, sit the patient upright, give oxygen if available and refer urgently.',
        'Fast breathing thresholds: under 2 months 60 or more per minute, 2 to 11 months 50 or more, 1 to 5 years 40 or more.',
        'Danger signs: chest indrawing, stridor at rest, cyanosis, grunting, inability to speak in full sentences.',
        'Warm the finger and check probe placement before trusting a low reading.'
      ],
      actions: [
        'Sit the patient upright and check airway and breathing.',
        'Warm the finger, reseat the probe and repeat the SpO2 reading.',
        'Give oxygen if available and refer urgently if SpO2 stays below 92 percent.'
      ]
    },
    dehydration: {
      title: 'Dehydration and ORS Guidelines',
      keys: ['dehydration', 'dehydrated', 'ors', 'diarrhea', 'diarrhoea', 'vomiting', 'rehydration', 'zinc', 'watery stool'],
      lines: [
        'Assess alertness, sunken eyes, ability to drink, skin pinch return and mucous membranes.',
        'No dehydration: give extra fluids, continue feeding and advise on danger signs.',
        'Some dehydration: give ORS about 75 ml per kg over 4 hours, then reassess.',
        'Severe dehydration: lethargy, unable to drink, very slow skin pinch. Start IV fluids if trained and equipped, and refer urgently.',
        'For children with diarrhea give zinc for 10 to 14 days: 10 mg daily under 6 months, 20 mg daily from 6 months.',
        'Escalate for blood in stool, persistent vomiting, severe lethargy or diarrhea lasting over 14 days.'
      ],
      actions: [
        'Assess alertness, skin pinch and ability to drink.',
        'Start ORS immediately and reassess after 4 hours.',
        'Add zinc for children with diarrhea and refer if severe signs are present.'
      ]
    }
  };

  const DANGER_PATTERNS = [
    [/convuls|seizure|fitting/, 'Convulsions'],
    [/unconscious|not responding|unresponsive|collapsed/, 'Unconscious or unresponsive'],
    [/letharg|very sleepy|hard to wake/, 'Lethargy'],
    [/cannot drink|can't drink|unable to drink|not able to drink|refus\w+ to (drink|feed)|not feeding/, 'Unable to drink or feed'],
    [/stiff neck/, 'Stiff neck'],
    [/chest indrawing|chest in-drawing/, 'Chest indrawing'],
    [/blue lips|cyanosis|cyanotic/, 'Cyanosis'],
    [/blood in (the )?stool|bloody stool|bloody diarrh/, 'Blood in stool'],
    [/vomit\w* everything|repeated vomiting|persistent vomiting/, 'Persistent vomiting'],
    [/severe pallor|very pale/, 'Severe pallor'],
    [/heavy bleeding|severe bleeding|bleeding/, 'Bleeding'],
    [/chest pain/, 'Chest pain']
  ];

  const CHIPS = [
    { label: 'Queue summary', q: 'queue summary' },
    { label: 'Urgent patients', q: 'urgent patients' },
    { label: 'Fever protocol', q: 'fever protocol' },
    { label: 'BP guidelines', q: 'blood pressure guidelines' },
    { label: 'SpO2 protocol', q: 'spo2 protocol' },
    { label: 'ORS guidelines', q: 'dehydration ors' },
    { label: 'Referral checklist', q: 'referral checklist' }
  ];

  const DISCLAIMER = 'Decision support only. It does not replace clinical judgement or national treatment guidelines.';

  function patients() {
    try {
      const list = RC.getPatients();
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function severity(p) {
    try {
      return RC.overallSeverity(p);
    } catch (e) {
      return 'clear';
    }
  }

  function flags(p) {
    try {
      return RC.getFlags(p);
    } catch (e) {
      return [];
    }
  }

  function vitalsLine(p) {
    const v = p.vitals || {};
    const parts = [];
    if (v.bpSys && v.bpDia) parts.push('BP ' + v.bpSys + '/' + v.bpDia);
    if (v.temp) parts.push('Temp ' + v.temp + ' C');
    if (v.hr) parts.push('HR ' + v.hr);
    if (v.spo2) parts.push('SpO2 ' + v.spo2 + '%');
    return parts.length ? parts.join(' | ') : 'No vitals recorded';
  }

  function label(p) {
    return (p.name || 'Unnamed patient') + (p.id ? ' (' + p.id + ')' : '');
  }

  function has(q, words) {
    return words.some(w => q.includes(w));
  }

  function sopReply(key) {
    const s = SOP[key];
    return '## ' + s.title + '\n' + s.lines.map(l => '- ' + l).join('\n') + '\n\n' + DISCLAIMER;
  }

  function listReply(title, list, empty) {
    if (!list.length) return empty;
    let out = '## ' + title + ' (' + list.length + ')\n';
    list.slice(0, 8).forEach(p => {
      out += '- ' + label(p) + '\n  ' + vitalsLine(p) + '\n';
      const f = flags(p);
      if (f.length) out += '  ' + f.map(x => x.text).join('; ') + '\n';
    });
    if (list.length > 8) out += '- and ' + (list.length - 8) + ' more. Open the dashboard for the full queue.\n';
    return out.trim();
  }

  function queueReply(list) {
    const urgent = list.filter(p => severity(p) === 'urgent').length;
    const review = list.filter(p => severity(p) === 'review').length;
    const queued = list.filter(p => p.status === 'queued').length;
    const today = new Date().toDateString();
    const seenToday = list.filter(p => new Date(p.createdAt).toDateString() === today).length;
    let session = {};
    try { session = RC.getSession() || {}; } catch (e) {}
    return '## Queue overview' + (session.clinic ? ' - ' + session.clinic : '') + '\n' +
      '- Total patients: ' + list.length + '\n' +
      '- Seen today: ' + seenToday + '\n' +
      '- Urgent: ' + urgent + '\n' +
      '- Flagged for review: ' + review + '\n' +
      '- Clear: ' + (list.length - urgent - review) + '\n' +
      '- Awaiting sync: ' + queued + '\n' +
      '- Synced: ' + (list.length - queued) +
      (urgent ? '\n\nPrioritise the ' + urgent + ' urgent patient' + (urgent > 1 ? 's' : '') + ' first. Ask "urgent patients" for details.' : '');
  }

  function actionsFor(kinds) {
    const map = { fever: 'fever', bp: 'hypertension', spo2: 'respiratory', hr: null, temp: null };
    const out = [];
    kinds.forEach(k => {
      const key = map[k];
      if (key) SOP[key].actions.forEach(a => { if (!out.includes(a)) out.push(a); });
    });
    if (kinds.includes('hr')) out.push('Recheck the pulse manually for a full minute and look for pain, fever, dehydration or anxiety.');
    if (kinds.includes('temp')) out.push('Warm the patient, recheck temperature and assess for shock or infection.');
    return out;
  }

  function patientReply(p) {
    const f = flags(p);
    const sev = severity(p);
    let out = '## Patient summary\n' + label(p) + '\n';
    if (p.age) out += 'Age: ' + p.age + (p.gender ? ', ' + p.gender : '') + '\n';
    if (p.community) out += 'Community: ' + p.community + '\n';
    out += 'Triage level: ' + sev.toUpperCase() + '\n';
    out += 'Sync status: ' + (p.status === 'queued' ? 'Awaiting sync' : 'Synced') + '\n';
    out += 'Vitals: ' + vitalsLine(p) + '\n';
    if (p.symptoms && p.symptoms.length) out += 'Symptoms: ' + p.symptoms.join(', ') + '\n';
    if (f.length) {
      out += '\nFindings:\n' + f.map(x => '- ' + x.text + ' [' + x.level + ']').join('\n');
      const acts = actionsFor([...new Set(f.map(x => x.kind))]);
      if (acts.length) out += '\n\nSuggested actions:\n' + acts.map(a => '- ' + a).join('\n');
      if (sev === 'urgent') out += '\n- Escalate to the nearest referral facility and document the referral.';
    } else {
      out += '\nNo vital sign flags against RuralCare thresholds.';
    }
    return out + '\n\n' + DISCLAIMER;
  }

  function findPatient(q, list) {
    if (/\b(this|current|open) patient\b/.test(q)) {
      try {
        const id = new URLSearchParams(window.location.search).get('id');
        const hit = list.find(p => p.id === id);
        if (hit) return hit;
      } catch (e) {}
    }
    const tokens = q.split(/[^a-z0-9\-]+/).filter(t => t.length > 2);
    let best = null;
    let bestScore = 0;
    list.forEach(p => {
      const name = String(p.name || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      let score = 0;
      if (id && q.includes(id)) score += 10;
      if (name && q.includes(name)) score += 6;
      name.split(/\s+/).forEach(part => {
        if (part.length > 2 && tokens.includes(part)) score += 3;
      });
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });
    return bestScore >= 3 ? best : null;
  }

  function parseCase(q) {
    const v = {};
    let m = q.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
    if (m) {
      v.bpSys = m[1];
      v.bpDia = m[2];
    }
    m = q.match(/(?:temp(?:erature)?|fever of|febrile at)\s*(?:of|is|was|=|:)?\s*(\d{2}(?:\.\d)?)/) || q.match(/(\d{2}(?:\.\d)?)\s*(?:°\s*c|degrees|deg c|\bc\b)/);
    if (m) {
      const t = parseFloat(m[1]);
      if (t >= 30 && t <= 45) v.temp = String(t);
    }
    m = q.match(/(?:spo2|sp02|oxygen(?: saturation)?|saturation|sats?)\s*(?:of|is|was|=|:|at)?\s*(\d{2,3})/);
    if (m) {
      const s = parseInt(m[1], 10);
      if (s >= 50 && s <= 100) v.spo2 = String(s);
    }
    m = q.match(/(?:hr|pulse|heart rate)\s*(?:of|is|was|=|:|at)?\s*(\d{2,3})/);
    if (m) v.hr = m[1];
    const danger = [];
    DANGER_PATTERNS.forEach(([re, name]) => {
      if (re.test(q) && !danger.includes(name)) danger.push(name);
    });
    return { vitals: v, danger, hasVitals: Object.keys(v).length > 0 };
  }

  function caseReply(parsed, q) {
    const pseudo = { vitals: parsed.vitals };
    const f = flags(pseudo);
    let level = 'clear';
    if (f.some(x => x.level === 'urgent') || parsed.danger.length) level = 'urgent';
    else if (f.length) level = 'review';
    let out = '## Triage assessment: ' + level.toUpperCase() + '\n';
    if (parsed.hasVitals) {
      const bits = [];
      const v = parsed.vitals;
      if (v.bpSys) bits.push('BP ' + v.bpSys + '/' + v.bpDia);
      if (v.temp) bits.push('Temp ' + v.temp + ' C');
      if (v.spo2) bits.push('SpO2 ' + v.spo2 + '%');
      if (v.hr) bits.push('HR ' + v.hr);
      out += 'Vitals read: ' + bits.join(' | ') + '\n';
    }
    if (f.length) out += '\nFindings:\n' + f.map(x => '- ' + x.text + ' [' + x.level + ']').join('\n') + '\n';
    if (parsed.danger.length) out += '\nDanger signs reported:\n' + parsed.danger.map(d => '- ' + d).join('\n') + '\n';
    if (!f.length && !parsed.danger.length) out += '\nNo readings breach RuralCare thresholds.\n';
    const kinds = [...new Set(f.map(x => x.kind))];
    if (has(q, SOP.dehydration.keys)) kinds.push('dehydration');
    const acts = actionsFor(kinds);
    if (kinds.includes('dehydration')) SOP.dehydration.actions.forEach(a => { if (!acts.includes(a)) acts.push(a); });
    if (acts.length) out += '\nSuggested actions:\n' + acts.map(a => '- ' + a).join('\n') + '\n';
    if (level === 'urgent') {
      out += '\nEscalation:\n- Refer to the nearest facility now and keep the patient monitored during transfer.\n- Record the patient in RuralCare. If offline, use SMS Sync on the dashboard for queued urgent cases.\n';
    } else if (level === 'review') {
      out += '\nPlan:\n- Monitor closely, repeat vitals in 15 to 30 minutes and schedule follow-up.\n';
    }
    return out.trim() + '\n\n' + DISCLAIMER;
  }

  function referralReply() {
    return '## Referral checklist\n' +
      '- Stabilise first: airway, breathing, position, oxygen if available, oral or IV fluids as appropriate.\n' +
      '- Refer immediately for: convulsions, unconsciousness, SpO2 below 92 percent, BP 180/120 or higher with symptoms, temperature 39.5 C or higher with danger signs, severe dehydration, chest indrawing, heavy bleeding.\n' +
      '- Write a referral note: name, age, vitals, symptoms, treatment given, time given and reason for referral.\n' +
      '- Arrange transport and call ahead if a phone signal is available.\n' +
      '- Register the patient in RuralCare so the record is queued. Use SMS Sync from the dashboard when there is no data connection.\n' +
      '- Follow up within 24 to 48 hours to confirm arrival and outcome.\n\n' + DISCLAIMER;
  }

  function dangerReply() {
    return '## General danger signs\n' +
      '- Convulsions, unconsciousness or extreme lethargy\n' +
      '- Unable to drink, breastfeed or keep anything down\n' +
      '- Stiff neck, chest indrawing, stridor or cyanosis\n' +
      '- Severe pallor, heavy bleeding or blood in stool\n' +
      '- Chest pain, confusion, or sudden weakness or speech difficulty\n' +
      '- In pregnancy: severe headache, blurred vision, fits, vaginal bleeding, reduced fetal movement\n\n' +
      'Any of these means urgent referral. Ask for "referral checklist" for the steps.\n\n' + DISCLAIMER;
  }

  function appHelpReply(q) {
    if (has(q, ['register', 'new patient', 'add patient', 'intake'])) {
      return 'To register a patient, open New Patient from the menu, fill in demographics and vitals, select symptoms, then choose Save & Queue. The record is stored on this device and marked as awaiting sync.';
    }
    if (has(q, ['sync', 'upload', 'offline', 'sms'])) {
      return 'Records save to this device first and show as Queued. When a connection returns and Auto-Sync is on, they sync automatically. You can also tap Sync now on the dashboard. With no data at all, SMS Sync sends a compact urgent-case summary by text message.';
    }
    if (has(q, ['edit', 'update', 'new visit', 'log visit'])) {
      return 'Open a patient from the dashboard. Use Edit Info to correct demographics, or Log New Visit to record fresh vitals and symptoms. Either action queues the record for sync again.';
    }
    if (has(q, ['dark', 'theme', 'language'])) {
      return 'Open Settings from the profile menu to switch between light and dark mode and to change the display language.';
    }
    return null;
  }

  function respond(raw) {
    const q = String(raw || '').toLowerCase().trim();
    const list = patients();

    if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q)) {
      let name = '';
      try {
        const s = RC.getSession();
        if (s && s.name) name = ', ' + s.name.replace(/^Dr\.?\s*/i, '').split(' ')[0];
      } catch (e) {}
      return 'Hello' + name + '. I can summarise your queue, flag urgent patients, triage a case from vitals you type, and walk you through fever, blood pressure, oxygen and dehydration protocols. Everything runs on this device.';
    }

    if (has(q, ['help', 'what can you', 'commands', 'what do you do'])) {
      return 'Try:\n- "queue summary"\n- "urgent patients", "high bp patients", "low spo2 patients"\n- "show patient Amaka" or "this patient"\n- "BP 170/110, temp 39.4, spo2 90, child is lethargic" for instant triage\n- "fever protocol", "BP guidelines", "SpO2 protocol", "ORS guidelines"\n- "referral checklist", "danger signs"\n- "how do I sync"';
    }

    const parsed = parseCase(q);
    if (parsed.hasVitals || (parsed.danger.length && has(q, ['patient', 'child', 'baby', 'infant', 'woman', 'man', 'he ', 'she ', 'has ', 'with ']))) {
      return caseReply(parsed, q);
    }

    const patient = list.length ? findPatient(q, list) : null;
    if (patient) return patientReply(patient);

    const wantsList = has(q, ['patients', 'who', 'list', 'show', 'any', 'which', 'how many']);

    if (has(q, ['urgent', 'critical', 'emergency', 'flagged', 'priority']) && !has(q, ['protocol', 'guideline'])) {
      if (!list.length) return 'No patient records are on this device yet.';
      return listReply('Urgent patients', list.filter(p => severity(p) === 'urgent'), 'No urgent patients in the local queue right now.');
    }

    if (has(q, ['review', 'attention']) && wantsList) {
      return listReply('Patients flagged for review', list.filter(p => severity(p) === 'review'), 'No patients are flagged for review.');
    }

    if (wantsList && has(q, ['high bp', 'bp', 'blood pressure', 'hypertens']) && !has(q, ['protocol', 'guideline'])) {
      return listReply('Patients with blood pressure flags', list.filter(p => flags(p).some(f => f.kind === 'bp')), 'No patients have abnormal blood pressure readings.');
    }

    if (wantsList && has(q, ['spo2', 'oxygen', 'saturation', 'hypox']) && !has(q, ['protocol', 'guideline'])) {
      return listReply('Patients with oxygen flags', list.filter(p => flags(p).some(f => f.kind === 'spo2')), 'No patients have low oxygen saturation.');
    }

    if (wantsList && has(q, ['fever', 'temperature', 'malaria']) && !has(q, ['protocol', 'guideline'])) {
      return listReply('Patients with fever', list.filter(p => flags(p).some(f => f.kind === 'fever')), 'No patients currently meet the fever threshold.');
    }

    if (has(q, ['pending', 'unsynced', 'queued', 'awaiting']) && !has(q, ['how do', 'how to'])) {
      return listReply('Awaiting sync', list.filter(p => p.status === 'queued'), 'All records on this device are synced.');
    }

    if (has(q, ['queue', 'summary', 'overview', 'total', 'how many', 'statistics', 'stats', 'count', 'today'])) {
      return list.length ? queueReply(list) : 'No patient records are on this device yet.';
    }

    if (has(q, ['referral', 'refer ', 'escalat', 'transfer'])) return referralReply();
    if (has(q, ['danger sign', 'emergency sign', 'red flag'])) return dangerReply();

    const app = appHelpReply(q);
    if (app) return app;

    let best = null;
    let bestScore = 0;
    Object.keys(SOP).forEach(k => {
      const score = SOP[k].keys.reduce((n, w) => n + (q.includes(w) ? 1 : 0), 0);
      if (score > bestScore) {
        bestScore = score;
        best = k;
      }
    });
    if (best) return sopReply(best);

    if (has(q, ['diagnose', 'prescribe', 'dose', 'dosage', 'how much'])) {
      return 'I provide triage guidance only. I cannot diagnose or prescribe. Follow your national treatment guidelines and consult a supervising clinician for dosing decisions.';
    }

    return 'I did not catch that. Type vitals for a triage check, for example "BP 165/105 temp 38.6 spo2 93", or ask for "queue summary", "urgent patients", "fever protocol", "referral checklist" or "help".';
  }

  function render(bubble, text) {
    text.split('\n').forEach(line => {
      const div = document.createElement('div');
      if (line.startsWith('## ')) {
        div.className = 'font-semibold text-[13.5px] mb-1';
        div.textContent = line.slice(3);
      } else if (line.trim() === '') {
        div.className = 'h-2';
      } else {
        div.textContent = line;
      }
      bubble.appendChild(div);
    });
  }

  function add(sender, text) {
    const box = document.getElementById('rc-ai-messages');
    if (!box) return null;
    const row = document.createElement('div');
    row.className = 'flex ' + (sender === 'user' ? 'justify-end' : 'justify-start');
    const bubble = document.createElement('div');
    bubble.className = (sender === 'user'
      ? 'bg-[#0F3D4C] dark:bg-[#0E7A5A] text-white'
      : 'bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] shadow-sm border border-[#EDF1F7] dark:border-white/5') +
      ' px-3 py-2.5 rounded-xl max-w-[90%] break-words leading-relaxed';
    render(bubble, text);
    row.appendChild(bubble);
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
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

  function submit(text) {
    const input = document.getElementById('rc-ai-input');
    const query = String(text || '').trim();
    if (!query || busy) return;
    busy = true;
    add('user', query);
    if (input) input.value = '';
    const typing = addTyping();
    setTimeout(() => {
      let reply;
      try {
        reply = respond(query);
      } catch (e) {
        reply = 'Something went wrong while reading local data. The rest of the app is unaffected. Please try again.';
      }
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      add('ai', reply);
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

  function build() {
    injectStyles();
    const container = document.createElement('div');
    container.id = 'rc-ai-widget';
    container.className = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[55]';
    container.innerHTML =
      '<button id="rc-ai-toggle" type="button" aria-label="Open clinical assistant" aria-expanded="false" aria-controls="rc-ai-chatbox" class="rc-ai-fab w-14 h-14 rounded-full text-white flex items-center justify-center cursor-pointer">' +
        '<i data-lucide="sparkles" class="w-6 h-6"></i>' +
      '</button>' +
      '<div id="rc-ai-chatbox" role="dialog" aria-label="RuralCare clinical assistant" class="hidden absolute bottom-[4.5rem] right-0 w-[calc(100vw-2rem)] max-w-[390px] h-[min(540px,calc(100vh-9rem))] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#E2E8F0] dark:border-white/10 flex-col overflow-hidden">' +
        '<div class="bg-[#0F3D4C] dark:bg-[#0B2A35] text-white px-4 py-3 flex justify-between items-center shrink-0 border-b-2 border-[#0E9F6E]">' +
          '<div class="min-w-0">' +
            '<div class="flex items-center gap-3 min-w-0">' +
              '<img id="rc-ai-logo" src="./img/rc-assistant-logo.png" alt="RuralCare" class="w-12 h-12 object-contain shrink-0">' +
              '<h4 class="font-semibold text-[14.5px] leading-none truncate">Clinical Assistant</h4>' +
            '</div>' +
            '<p class="text-[11px] text-white/70 leading-tight mt-1.5 pl-[3.75rem] flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-[#34D399] shrink-0"></span>Offline and private</p>' +
          '</div>' +
          '<button id="rc-ai-close" type="button" aria-label="Close assistant" class="text-white/80 hover:text-white cursor-pointer shrink-0 ml-2"><i data-lucide="x" class="w-5 h-5"></i></button>' +
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
    CHIPS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.className = 'shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-[#0F3D4C]/25 dark:border-[#34D399]/30 text-[#0F3D4C] dark:text-[#34D399] bg-white dark:bg-transparent hover:bg-[#0F3D4C]/5 dark:hover:bg-[#34D399]/10 transition-colors cursor-pointer whitespace-nowrap';
      b.addEventListener('click', () => submit(c.q));
      chips.appendChild(b);
    });

    document.getElementById('rc-ai-toggle').addEventListener('click', () => {
      setOpen(document.getElementById('rc-ai-chatbox').classList.contains('hidden'));
    });
    document.getElementById('rc-ai-close').addEventListener('click', () => setOpen(false));
    document.getElementById('rc-ai-form').addEventListener('submit', e => {
      e.preventDefault();
      submit(document.getElementById('rc-ai-input').value);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') setOpen(false);
    });

    add('ai', 'Hello. I am the RuralCare clinical assistant. I can summarise your queue, flag urgent patients, triage a case from vitals you type, and guide you through fever, blood pressure, oxygen and dehydration protocols.');
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

  return { init, open: () => setOpen(true), close: () => setOpen(false), ask: submit };
})();

window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      RCAgent.init();
    } catch (e) {}
  }, 300);
});