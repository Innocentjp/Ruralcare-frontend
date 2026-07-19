/*-----RURALCARE LOGIC-----*/
const RC = (() => {

  const KEYS = {
    theme: 'ruralcare_theme',
    session: 'ruralcare_session',
    patients: 'ruralcare_patients',
    lastSync: 'ruralcare_last_sync',
    settings: 'ruralcare_settings'
  };

  const SYMPTOM_OPTIONS = ['Fever','Cough','Fatigue','Headache','Nausea','Diarrhea','Body Ache','Dizziness','Rash','Shortness of Breath'];

  /*-----TRANSLATION DICTIONARY-----*/
  const TRANSLATIONS = {
    en: {
      "nav-dash": "Dashboard", "nav-new": "New Patient", "nav-logout": "Log Out", "nav-profile": "Profile", "nav-settings": "Settings",
      "mode-offline": "Offline mode — data queues for sync",
      "dash-greet": "Good to see you", "dash-sub": "Here's what needs your attention today.",
      "stat-total": "Total Patients", "stat-today": "Seen Today", "stat-flags": "Pending AI Flags", "stat-pending": "Awaiting Sync",
      "btn-sync": "Sync now", "btn-reg": "Register New Patient", "queue-title": "Patient Queue & AI Alerts",
      "intake-title": "New Patient Intake", "sec-demo": "Demographics", "sec-vitals": "Vitals", "sec-symp": "Symptoms", "sec-notes": "Clinical Notes",
      "btn-cancel": "Cancel", "btn-save": "Save & Queue",
      "detail-title": "Patient Record", "btn-print": "Print", "btn-edit": "Edit Info", "btn-log": "Log New Visit",
      "sec-trend": "Vitals Trend", "sec-hist": "Visit History", "sec-ai": "AI Assessment"
    },
    pcm: {
      "nav-dash": "My Area", "nav-new": "New Pikin", "nav-logout": "Comot", "nav-profile": "My Profile", "nav-settings": "Settings",
      "mode-offline": "No network — e go sync later",
      "dash-greet": "How far", "dash-sub": "See wetin you need sort out today.",
      "stat-total": "All Patients", "stat-today": "See Today", "stat-flags": "Urgent Cases", "stat-pending": "Never Sync",
      "btn-sync": "Sync am now", "btn-reg": "Add New Patient", "queue-title": "Patient Line & AI Alert",
      "intake-title": "Add New Patient", "sec-demo": "Patient Details", "sec-vitals": "Body Check", "sec-symp": "Wetin dey do am", "sec-notes": "Doctor Notes",
      "btn-cancel": "Leave am", "btn-save": "Save & Queue",
      "detail-title": "Patient File", "btn-print": "Print am", "btn-edit": "Change Info", "btn-log": "Add New Visit",
      "sec-trend": "Body Check History", "sec-hist": "Visit History", "sec-ai": "AI Talk"
    },
    ha: {
      "nav-dash": "Fagen aiki", "nav-new": "Sabon Majinyaci", "nav-logout": "Fita", "nav-profile": "Furofayil", "nav-settings": "Saituna",
      "mode-offline": "Babu intanet — za a tura bayan",
      "dash-greet": "Barka da zuwa", "dash-sub": "Ga abubuwan da ke buƙatar kulawar ku a yau.",
      "stat-total": "Jimillar Majinyata", "stat-today": "Na Yau", "stat-flags": "Masu Neman Gaggawa", "stat-pending": "Jiran Tura",
      "btn-sync": "Tura yanzu", "btn-reg": "Yi Rajista", "queue-title": "Jerin Majinyata",
      "intake-title": "Sabon Majinyaci", "sec-demo": "Bayanai", "sec-vitals": "Awo", "sec-symp": "Alamomi", "sec-notes": "Rubutun Likita",
      "btn-cancel": "Soke", "btn-save": "Ajiye",
      "detail-title": "Fayil ɗin Majinyaci", "btn-print": "Buga", "btn-edit": "Gyara", "btn-log": "Sabon Ziyara",
      "sec-trend": "Tarihin Awo", "sec-hist": "Tarihin Ziyara", "sec-ai": "Sakamakon AI"
    },
    ig: {
      "nav-dash": "Ulo Oru", "nav-new": "Onye Oria Ohuru", "nav-logout": "Pụọ", "nav-profile": "Ndekọ m", "nav-settings": "Ntọala",
      "mode-offline": "Enweghị ịntanetị",
      "dash-greet": "Nnọọ", "dash-sub": "Nke a bụ ihe chọrọ nlebara anya gị taa.",
      "stat-total": "Ndị Ọrịa Niile", "stat-today": "Nke Taa", "stat-flags": "Ihe Dị Ngwa", "stat-pending": "Ihe Ejikọbeghị",
      "btn-sync": "Jikọọ ya", "btn-reg": "Debanye Aha", "queue-title": "Ahịrị Ndị Ọrịa",
      "intake-title": "Onye Oria Ohuru", "sec-demo": "Nkọwa", "sec-vitals": "Nlele Ahụ", "sec-symp": "Mgbaàmà", "sec-notes": "Ihe Ndekọ",
      "btn-cancel": "Kagbuo", "btn-save": "Chekwaa",
      "detail-title": "Akwụkwọ Ọrịa", "btn-print": "Bipụta", "btn-edit": "Dezie", "btn-log": "Nleta Ọhụrụ",
      "sec-trend": "Akụkọ Nlele", "sec-hist": "Akụkọ Nleta", "sec-ai": "Nsonaazụ AI"
    },
    yo: {
      "nav-dash": "Aaye Iṣẹ", "nav-new": "Alaisan Tuntun", "nav-logout": "Jade", "nav-profile": "Profaili", "nav-settings": "Eto",
      "mode-offline": "Ko si intanẹẹti",
      "dash-greet": "Ẹ kaabọ", "dash-sub": "Eyi ni ohun ti o nilo akiyesi rẹ loni.",
      "stat-total": "Gbogbo Alaisan", "stat-today": "Ti Oni", "stat-flags": "Pajawiri", "stat-pending": "Duro fun Sync",
      "btn-sync": "Sync bayi", "btn-reg": "Fi orukọ silẹ", "queue-title": "Laini Alaisan",
      "intake-title": "Alaisan Tuntun", "sec-demo": "Alaye", "sec-vitals": "Ayẹwo", "sec-symp": "Aisan", "sec-notes": "Akiyesi",
      "btn-cancel": "Fagilee", "btn-save": "Fipamọ",
      "detail-title": "Faili Alaisan", "btn-print": "Tẹ jade", "btn-edit": "Ṣatunkọ", "btn-log": "Ibẹwo Tuntun",
      "sec-trend": "Itan Ayẹwo", "sec-hist": "Itan Ibẹwo", "sec-ai": "Esi AI"
    }
  };

  function applyLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) {
        el.textContent = TRANSLATIONS[lang][key];
      }
    });
  }

  function initLanguage() {
    const settings = getSettings();
    applyLanguage(settings.language);
  }

  function getTheme() {
    return localStorage.getItem(KEYS.theme) || 'light';
  }
  function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(KEYS.theme, theme);
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.setAttribute('aria-checked', theme === 'dark' ? 'true' : 'false');
    });
  }
  function initTheme() {
    applyTheme(getTheme());
  }
  function bindThemeToggles() {
    document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
      });
    });
  }

  function getSession() {
    try { return JSON.parse(localStorage.getItem(KEYS.session)); } catch (e) { return null; }
  }
  function setSession(data) {
    localStorage.setItem(KEYS.session, JSON.stringify(data));
  }
  function clearSession() {
    localStorage.removeItem(KEYS.session);
  }
  function requireSession() {
    const session = getSession();
    if (!session) {
      window.location.href = 'auth.html';
      return null;
    }
    return session;
  }
  function initials(name) {
    if (!name) return 'RC';
    const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/);
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'RC';
  }

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(KEYS.settings)) || { autoSync: true, smsFallback: true, language: 'en' };
    } catch(e) {
      return { autoSync: true, smsFallback: true, language: 'en' };
    }
  }
  function saveSettings(data) {
    localStorage.setItem(KEYS.settings, JSON.stringify(data));
    applyLanguage(data.language);
  }

  function getPatients() {
    try { return JSON.parse(localStorage.getItem(KEYS.patients)) || []; }
    catch (e) { return []; }
  }
  function savePatients(list) {
    localStorage.setItem(KEYS.patients, JSON.stringify(list));
  }
  function getPatientById(id) {
    return getPatients().find(p => p.id === id) || null;
  }
  function addPatient(patient) {
    const list = getPatients();
    list.unshift(patient);
    savePatients(list);
  }
  function updatePatient(id, changes) {
    const list = getPatients();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return;
    list[idx] = { ...list[idx], ...changes };
    savePatients(list);
  }
  function generatePatientId() {
    const n = Math.floor(1000 + Math.random() * 9000);
    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
    return `RCP-${n}-${letter}${Math.floor(Math.random() * 9)}`;
  }
  function pendingCount() {
    return getPatients().filter(p => p.status === 'queued').length;
  }

  function cToF(c) { return (c * 9 / 5 + 32); }
  function fToC(f) { return (f - 32) * 5 / 9; }

  function computeInsights(patient) {
    const insights = [];
    const v = patient.vitals || {};
    const sys = parseInt(v.bpSys, 10);
    const dia = parseInt(v.bpDia, 10);
    const temp = parseFloat(v.temp);
    const hr = parseInt(v.hr, 10);
    const spo2 = parseInt(v.spo2, 10);
    const symptoms = patient.symptoms || [];
    const has = s => symptoms.includes(s);

    if (!isNaN(spo2) && spo2 < 92) {
      insights.push({ severity: 'critical', title: 'Possible respiratory distress', detail: 'Oxygen saturation is below 92%. Consider evaluating for hypoxia and check airway and breathing urgently.' });
    } else if (!isNaN(spo2) && spo2 < 95) {
      insights.push({ severity: 'warning', title: 'Low oxygen saturation', detail: 'SpO2 is mildly reduced. Consider evaluating for a respiratory or circulatory cause.' });
    }

    if (!isNaN(sys) && sys >= 160) {
      insights.push({ severity: 'critical', title: 'Severely elevated blood pressure', detail: 'Systolic reading suggests a hypertensive emergency. Consider evaluating for hypertensive urgency and recheck manually.' });
    } else if (!isNaN(sys) && sys > 130) {
      insights.push({ severity: 'warning', title: 'Elevated blood pressure', detail: has('Headache') ? 'Elevated BP with reported headache. Consider evaluating for hypertension-related complications.' : 'Blood pressure is above the normal range. Consider a recheck and reviewing history of hypertension.' });
    }

    if (!isNaN(temp) && temp >= 39) {
      insights.push({ severity: 'critical', title: 'High fever', detail: 'Temperature indicates a high-grade fever. Consider evaluating for a serious infectious cause, including malaria in endemic areas.' });
    } else if (!isNaN(temp) && temp >= 37.8) {
      const cause = has('Cough') ? 'a respiratory infection' : (has('Nausea') || has('Diarrhea')) ? 'a gastrointestinal or febrile illness' : 'an underlying infection';
      insights.push({ severity: 'warning', title: 'Elevated temperature', detail: `Fever is present. Considering reported symptoms, consider evaluating for ${cause}.` });
    }

    if (!isNaN(hr) && (hr > 120 || hr < 45)) {
      insights.push({ severity: 'critical', title: 'Heart rate out of range', detail: 'Heart rate is significantly abnormal. Consider evaluating for cardiac or metabolic causes.' });
    } else if (!isNaN(hr) && (hr > 100 || hr < 50)) {
      insights.push({ severity: 'warning', title: 'Irregular heart rate', detail: has('Fatigue') ? 'Elevated heart rate with reported fatigue. Consider evaluating for anemia or dehydration.' : 'Heart rate is outside the typical resting range for an adult.' });
    }

    if (has('Rash') && !isNaN(temp) && temp >= 37.8) {
      insights.push({ severity: 'warning', title: 'Fever with rash', detail: 'Consider evaluating for a viral exanthem or allergic reaction, and isolate pending assessment.' });
    }

    if (insights.length === 0 && symptoms.length > 0) {
      insights.push({ severity: 'info', title: 'Symptoms reported, vitals stable', detail: 'Recorded vitals are within normal ranges. Continue routine monitoring and reassess if symptoms persist.' });
    }

    return insights;
  }

  function overallSeverity(patient) {
    const insights = computeInsights(patient);
    if (insights.some(i => i.severity === 'critical')) return 'critical';
    if (insights.some(i => i.severity === 'warning')) return 'warning';
    return 'clear';
  }

  function statusPillHtml(severity) {
    if (severity === 'critical') return `<span class="pill pill-critical"><span class="pill-dot"></span>Flag: Urgent</span>`;
    if (severity === 'warning') return `<span class="pill pill-warning"><span class="pill-dot"></span>Flag: Review</span>`;
    return `<span class="pill pill-success"><span class="pill-dot"></span>Cleared</span>`;
  }

  function relativeTime(iso) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    return `${days}d ago`;
  }

  function toast(message, icon = 'check-circle') {
    document.querySelectorAll('.rc-toast').forEach(t => t.remove());
    const el = document.createElement('div');
    el.className = 'rc-toast toast toast-in card px-4 py-3 flex items-center gap-2.5';
    el.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 text-[#2F80ED] dark:text-[#6DA5F5] shrink-0"></i><span class="text-[13px] font-semibold text-[#141A29] dark:text-[#E7EBF3]">${message}</span>`;
    document.body.appendChild(el);
    if (window.lucide) lucide.createIcons();
    setTimeout(() => el.remove(), 3200);
  }

  function bindProfileMenu() {
    const trigger = document.querySelector('[data-profile-trigger]');
    const menu = document.querySelector('[data-profile-menu]');
    if (!trigger || !menu) return;
    const session = getSession();
    const nameEl = menu.querySelector('[data-profile-name]');
    const roleEl = menu.querySelector('[data-profile-role]');
    const avatarEls = document.querySelectorAll('[data-avatar-initials]');
    if (session) {
      if (nameEl) nameEl.textContent = session.name || 'Health Worker';
      if (roleEl) roleEl.textContent = [session.role, session.clinic].filter(Boolean).join(' · ') || 'RuralCare';
      
      avatarEls.forEach(a => {
        if (session.avatar) {
          a.style.backgroundImage = `url(${session.avatar})`;
          a.style.backgroundSize = 'cover';
          a.style.backgroundPosition = 'center';
          a.textContent = '';
        } else {
          a.style.backgroundImage = 'none';
          a.textContent = initials(session.name);
        }
      });
    }
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('hidden');
    });
    document.addEventListener('click', () => menu.classList.add('hidden'));
    menu.addEventListener('click', e => e.stopPropagation());
    const logoutBtn = document.querySelector('[data-logout]');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      clearSession();
      window.location.href = 'auth.html';
    });
  }

  function bindSyncBadge() {
    const badges = document.querySelectorAll('[data-sync-badge]');
    const syncBtn = document.querySelector('[data-sync-btn]');
    function render() {
      const n = pendingCount();
      badges.forEach(badge => {
        const extra = badge.dataset.extraClass || '';
        if (n > 0) {
          badge.className = ('pill pill-warning ' + extra).trim();
          badge.innerHTML = `<span class="pill-dot offline-pulse"></span><span data-i18n="mode-offline">Offline mode — data queues for sync</span>`;
        } else {
          badge.className = ('pill pill-success ' + extra).trim();
          badge.innerHTML = `<span class="pill-dot"></span>Connected — Synced`;
        }
      });
      document.querySelectorAll('[data-pending-dot]').forEach(d => d.classList.toggle('hidden', n === 0));
    }
    render();
    if (syncBtn && !syncBtn.dataset.bound) {
      syncBtn.dataset.bound = '1';
      syncBtn.addEventListener('click', () => {
        const n = pendingCount();
        if (n === 0) { toast('Everything is already synced', 'check-circle'); return; }
        const icon = syncBtn.querySelector('i');
        syncBtn.disabled = true;
        if (icon) icon.setAttribute('data-lucide', 'loader-2'), icon.classList.add('animate-spin');
        if (window.lucide) lucide.createIcons();
        setTimeout(() => {
          const list = getPatients().map(p => p.status === 'queued' ? { ...p, status: 'synced' } : p);
          savePatients(list);
          localStorage.setItem(KEYS.lastSync, new Date().toISOString());
          syncBtn.disabled = false;
          render();
          toast(`Synced ${n} record${n > 1 ? 's' : ''}`, 'cloud');
          document.dispatchEvent(new CustomEvent('rc:synced'));
        }, 1300);
      });
    }
    return render;
  }

  function seedIfEmpty() {
    if (localStorage.getItem('ruralcare_seeded')) return;
    localStorage.setItem('ruralcare_seeded', '1');
    if (getPatients().length > 0) return;
    const now = Date.now();
    const demo = [
      { id: 'RCP-4821-B3', name: 'Amara Nwosu', age: '34', gender: 'Female', contact: '+234 802 555 0142', community: 'Umuoji', vitals: { bpSys: '148', bpDia: '92', temp: '37.1', hr: '88', spo2: '97' }, symptoms: ['Headache'], notes: 'Reports intermittent headaches for 3 days.', createdAt: new Date(now - 1000 * 60 * 22).toISOString(), status: 'queued', reviewed: false },
      { id: 'RCP-2290-K7', name: 'Kwame Mensah', age: '58', gender: 'Male', contact: '+233 24 555 0110', community: 'Akropong', vitals: { bpSys: '124', bpDia: '80', temp: '39.2', hr: '112', spo2: '93' }, symptoms: ['Fever', 'Cough', 'Fatigue'], notes: 'Fever onset yesterday evening, productive cough.', createdAt: new Date(now - 1000 * 60 * 55).toISOString(), status: 'queued', reviewed: false },
      { id: 'RCP-7742-M1', name: 'Grace Achieng', age: '6', gender: 'Female', contact: '+254 712 555 0198', community: 'Kisian', vitals: { bpSys: '98', bpDia: '62', temp: '36.8', hr: '96', spo2: '99' }, symptoms: [], notes: 'Routine growth monitoring visit.', createdAt: new Date(now - 1000 * 60 * 60 * 5).toISOString(), status: 'synced', reviewed: true },
      { id: 'RCP-1053-T9', name: 'Thandiwe Dube', age: '41', gender: 'Female', contact: '+263 77 555 0176', community: 'Nyanga', vitals: { bpSys: '132', bpDia: '85', temp: '37.6', hr: '78', spo2: '96' }, symptoms: ['Nausea', 'Dizziness'], notes: 'Reports dizziness on standing.', createdAt: new Date(now - 1000 * 60 * 60 * 26).toISOString(), status: 'synced', reviewed: false },
      { id: 'RCP-9315-P4', name: 'Rajesh Patel', age: '67', gender: 'Male', contact: '+91 98 555 01234', community: 'Bhuj Rural', vitals: { bpSys: '118', bpDia: '76', temp: '36.6', hr: '70', spo2: '98' }, symptoms: [], notes: 'Post-op follow-up, healing well.', createdAt: new Date(now - 1000 * 60 * 60 * 48).toISOString(), status: 'synced', reviewed: true }
    ];
    savePatients(demo);
  }

  return {
    KEYS, SYMPTOM_OPTIONS, seedIfEmpty,
    getTheme, applyTheme, initTheme, bindThemeToggles,
    getSession, setSession, clearSession, requireSession, initials,
    getSettings, saveSettings,
    getPatients, savePatients, getPatientById, addPatient, updatePatient, generatePatientId, pendingCount,
    cToF, fToC, computeInsights, overallSeverity, statusPillHtml,
    relativeTime, toast, bindProfileMenu, bindSyncBadge,
    initLanguage
  };
})();

RC.initTheme();
document.addEventListener('DOMContentLoaded', () => {
  RC.initLanguage();
  RC.bindThemeToggles();
  RC.bindProfileMenu();
  if (window.lucide) lucide.createIcons();
});