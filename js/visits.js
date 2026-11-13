(function () {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9/dist/umd/supabase.js';
  const HUB_KEY = 'ruralcare_hub';
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const POLL_MS = 4000;
  const SEED_DEFAULT_PATIENTS = true;
  const SEED_EPOCH = '2026-01-01T00:00:00.000Z';
  const SEED_IDS = { '01': 'V-7K2M4Q', '02': 'V-9RX3HA', '03': 'V-4TWC8N', '04': 'V-6BD5YE', '05': 'V-3GJ7PS', '06': 'V-8LN2ZF' };

  const DEPTS = {
    registration: ['GOPD', 'user-plus'],
    consultation: ['Doctor', 'stethoscope'],
    lab: ['Laboratory', 'flask-conical'],
    pharmacy: ['Pharmacy', 'pill'],
    physiotherapy: ['Physiotherapy', 'accessibility']
  };

  const VIEWS = [
    ['expected', 'Arriving'],
    ['active', 'In hospital'],
    ['closed', 'Closed']
  ];

  const DEPT_FILTERS = [
    ['all', 'Everyone'],
    ['consultation', 'Doctor'],
    ['lab', 'Laboratory'],
    ['pharmacy', 'Pharmacy'],
    ['physiotherapy', 'Physiotherapy']
  ];

  const DEPT_FILTERS_BY_ROLE = {
    physiotherapy: [['physiotherapy', 'Physiotherapy Desk']],
    consultation: [['consultation', 'Doctor Desk']],
    lab: [['lab', 'Laboratory Desk']],
    pharmacy: [['pharmacy', 'Pharmacy Desk']],
    registration: [['registration', 'GOPD Desk']]
  };

  const HINTS = {
    expected: 'Patients referred to your facility who have not been registered yet. Tap Register arrival when they reach you.',
    active: 'Everyone being seen right now. Choose a desk to see who is waiting for it.',
    closed: 'Finished visits. Open one to read the summary or to reopen it.'
  };

  const CLOUD_POLL_MS = 15000;
  const EPOCH = '1970-01-01T00:00:00.000Z';

  const OUTCOMES = {
    continuing_physiotherapy: 'Continuing physiotherapy',
    treated_and_discharged: 'Treated and discharged',
    admitted: 'Admitted',
    referred_onward: 'Referred onward',
    patient_did_not_arrive: 'Patient did not arrive',
    other: 'Other'
  };

  const PAYERS = { cash: 'Cash', nhis: 'NHIS', hmo: 'HMO or insurance' };

  const URGENCY = {
    routine: ['', ''],
    urgent: ['Urgent', 'rc-badge-urgent'],
    emergency: ['Urgent', 'rc-badge-urgent']
  };

  const URGENCY_CHOICES = [['routine', 'Routine'], ['urgent', 'Urgent']];
  const isUrgent = u => u === 'urgent' || u === 'emergency';
  const normUrgency = u => (isUrgent(u) ? 'urgent' : 'routine');

  const ROWS = {
    rx: [['drug', 'Drug', 4], ['dose', 'Dose', 2], ['freq', 'Frequency', 2], ['days', 'Days', 2]],
    results: [['test', 'Test', 5], ['result', 'Result', 5]],
    dispense: [['drug', 'Drug', 5], ['qty', 'Quantity given', 5]]
  };

  const FORM_DEPTS = ['consultation', 'lab', 'pharmacy', 'physiotherapy', 'close'];
  const PHYSIO_FORM_DEPTS = ['physiotherapy', 'close'];
  const PHYSIO_OUTCOMES = ['continuing_physiotherapy', 'treated_and_discharged', 'referred_onward', 'patient_did_not_arrive', 'other'];
  const PHYSIO_SEED_TAG = 'physio-2';
  const LEGACY_SEED_IDS = Object.values(SEED_IDS);
  const isPhysioRole = () => { try { return /physio/i.test(String((RC.getSession() || {}).role || '')); } catch (e) { return false; } };
  const formDepts = () => (isPhysioRole() ? PHYSIO_FORM_DEPTS : FORM_DEPTS);
  const seedTag = () => (isPhysioRole() ? PHYSIO_SEED_TAG : 1);

  const S = {
    tab: 'active',
    dept: 'all',
    visits: {},
    dirty: [],
    cdirty: [],
    ccursor: EPOCH,
    cloudState: 'off',
    cloudBusy: false,
    cloudTimer: 0,
    rt: false,
    rtTimer: 0,
    cursor: 0,
    expected: [],
    hubState: 'off',
    syncing: false,
    sb: null,
    uid: '',
    pollTimer: 0
  };

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => { try { if (window.lucide) window.lucide.createIcons(); } catch (e) {} };
  const fmt = v => (v ? new Date(v).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
  const toast = (m, i) => { try { RC.toast(m, i); } catch (e) {} };
  const who = () => { try { return String(RC.getCurrentUser() || 'anon').toLowerCase(); } catch (e) { return 'anon'; } };
  const staff = () => { try { const s = RC.getSession() || {}; return s.name || s.email || who(); } catch (e) { return who(); } };

  function getAvailableDeptFilters() {
    try {
      const s = RC.getSession() || {};
      const role = String(s.role || '').toLowerCase();
      if (role.includes('physiotherapi')) return DEPT_FILTERS_BY_ROLE.physiotherapy;
      if (role.includes('medical officer') || role.includes('doctor')) return DEPT_FILTERS_BY_ROLE.consultation;
      if (role.includes('lab')) return DEPT_FILTERS_BY_ROLE.lab;
      if (role.includes('pharmacist')) return DEPT_FILTERS_BY_ROLE.pharmacy;
      if (role.includes('nurse') || role.includes('chew') || role.includes('community health')) return DEPT_FILTERS_BY_ROLE.registration;
    } catch (e) {}
    return DEPT_FILTERS;
  }

  function defaultDeptForRole() {
    try {
      const s = RC.getSession() || {};
      const role = String(s.role || '').toLowerCase();
      if (role.includes('physiotherapi')) return 'physiotherapy';
      if (role.includes('medical officer') || role.includes('doctor')) return 'consultation';
      if (role.includes('lab')) return 'lab';
      if (role.includes('pharmacist')) return 'pharmacy';
      if (role.includes('nurse') || role.includes('chew') || role.includes('community health')) return 'registration';
      return 'all';
    } catch (e) {
      return 'all';
    }
  }

  const store = {
    read(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) {
        return fallback;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  const K = {
    visits: () => 'ruralcare_visits:' + who(),
    dirty: () => 'ruralcare_visits_dirty:' + who(),
    cdirty: () => 'ruralcare_visits_cdirty:' + who(),
    ccursor: () => 'ruralcare_visits_ccursor:' + who(),
    cursor: () => 'ruralcare_visits_cursor:' + who(),
    expected: () => 'ruralcare_visits_expected:' + who(),
    actions: () => 'ruralcare_visits_actions:' + who(),
    seeded: () => 'ruralcare_visits_seeded:' + who()
  };

  const hub = () => Object.assign({ url: '', token: '', facility: '' }, store.read(HUB_KEY, {}));
  const saveVisits = () => store.write(K.visits(), S.visits);
  const saveDirty = () => store.write(K.dirty(), S.dirty);
  const saveCloudMeta = () => { store.write(K.cdirty(), S.cdirty); store.write(K.ccursor(), S.ccursor); };

  const canon = x => Array.isArray(x)
    ? '[' + x.map(canon).join(',') + ']'
    : x && typeof x === 'object'
      ? '{' + Object.keys(x).filter(k => x[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + canon(x[k])).join(',') + '}'
      : JSON.stringify(x === undefined ? null : x);

  function rand(n) {
    const bytes = new Uint8Array(n);
    try { crypto.getRandomValues(bytes); } catch (e) { for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256); }
    return Array.from(bytes).map(b => ALPHABET[b % 32]).join('');
  }

  function pill(map, key) {
    const m = map[key];
    if (!m || !m[0]) return '';
    return '<span class="rc-badge ' + m[1] + '"><span class="rc-badge-dot"></span>' + esc(m[0]) + '</span>';
  }

  const stageStamp = st => Date.parse(st.editedAt || st.at) || 0;
  const closeStamp = v => Date.parse(v.closed ? v.closedAt : v.reopenedAt) || 0;

  function mergeVisit(cur, inc) {
    if (!cur) return inc;
    const map = new Map();
    (cur.stages || []).concat(inc.stages || []).forEach(st => {
      const x = map.get(st.id);
      if (!x || stageStamp(st) > stageStamp(x)) map.set(st.id, st);
    });
    const stages = Array.from(map.values()).sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.id.localeCompare(b.id));
    const base = Date.parse(inc.updatedAt) > Date.parse(cur.updatedAt) ? inc : cur;
    const a = closeStamp(cur);
    const b = closeStamp(inc);
    const closed = a === b ? !!(cur.closed || inc.closed) : a > b ? !!cur.closed : !!inc.closed;
    const latest = f => [cur[f], inc[f]].filter(Boolean).sort().slice(-1)[0] || '';
    const source = [cur, inc].filter(x => x.closed).sort((x, y) => (Date.parse(y.closedAt) || 0) - (Date.parse(x.closedAt) || 0))[0];
    return Object.assign({}, base, { stages, closed, closedAt: latest('closedAt'), reopenedAt: latest('reopenedAt'), summary: closed && source ? source.summary : '' });
  }

  const stagesOf = (v, d) => (v.stages || []).filter(s => s.dept === d);

  function requested(v) {
    const out = [];
    stagesOf(v, 'consultation').forEach(s => (s.data.labRequests || []).forEach(t => { if (t && !out.some(x => x.toLowerCase() === String(t).toLowerCase())) out.push(String(t)); }));
    return out;
  }

  function resulted(v) {
    const out = new Set();
    stagesOf(v, 'lab').forEach(s => (s.data.results || []).forEach(r => { if (r.test && r.result) out.add(String(r.test).toLowerCase()); }));
    return out;
  }

  function prescribed(v) {
    const out = [];
    stagesOf(v, 'consultation').forEach(s => (s.data.prescriptions || []).forEach(p => {
      if (p && p.drug && !out.some(x => x.drug.toLowerCase() === String(p.drug).toLowerCase())) out.push(p);
    }));
    return out;
  }

  function dispensed(v) {
    const out = new Set();
    stagesOf(v, 'pharmacy').forEach(s => (s.data.items || []).forEach(i => { if (i.drug) out.add(String(i.drug).toLowerCase()); }));
    return out;
  }

  const pendingLab = v => { const done = resulted(v); return requested(v).filter(t => !done.has(t.toLowerCase())); };
  const pendingRx = v => { const done = dispensed(v); return prescribed(v).filter(p => !done.has(String(p.drug).toLowerCase())); };

  const physioPending = v => stagesOf(v, 'consultation').some(s => s.data && s.data.physio) && !stagesOf(v, 'physiotherapy').length;

  function waiting(v) {
    if (v.closed) return [];
    if (isPhysioRole()) return stagesOf(v, 'physiotherapy').length ? [] : ['physiotherapy'];
    const w = [];
    const seen = stagesOf(v, 'consultation').length > 0;
    if (!seen) w.push('consultation');
    if (pendingLab(v).length) w.push('lab');
    if (pendingRx(v).length) w.push('pharmacy');
    if (physioPending(v)) w.push('physiotherapy');
    return w;
  }

  function statusPill(v) {
    if (v.closed) return '';
    const w = waiting(v);
    if (!w.length) return '<span class="rc-badge rc-badge-ready"><span class="rc-badge-dot"></span>Ready to close</span>';
    return '<span class="rc-badge rc-badge-waiting"><span class="rc-badge-dot"></span>Waiting: ' + esc(w.map(d => DEPTS[d][0]).join(', ')) + '</span>';
  }

  function vitalText(vt) {
    vt = vt || {};
    return [vt.bpSys && vt.bpDia ? 'BP ' + vt.bpSys + '/' + vt.bpDia : '', vt.temp ? 'Temp ' + vt.temp + '°C' : '', vt.hr ? 'Pulse ' + vt.hr : '', vt.spo2 ? 'SpO2 ' + vt.spo2 + '%' : '', vt.rr ? 'RR ' + vt.rr : ''].filter(Boolean).join('  ·  ');
  }

  function flagsOf(v) {
    try { return RC.getFlags({ vitals: v.patient.vitals || {}, symptoms: [], age: v.patient.age }).map(f => f.text); } catch (e) { return []; }
  }

  function loadLocal() {
    S.visits = store.read(K.visits(), {});
    S.dirty = store.read(K.dirty(), []);
    S.cdirty = store.read(K.cdirty(), []);
    S.ccursor = store.read(K.ccursor(), '') || EPOCH;
    S.cursor = Number(store.read(K.cursor(), 0)) || 0;
    const ex = store.read(K.expected(), null);
    S.expected = ex && Array.isArray(ex.list) ? ex.list : [];
    const legacy = id => String(id).startsWith('V-DEMO');
    Object.keys(S.visits).filter(legacy).forEach(id => { delete S.visits[id]; });
    S.dirty = S.dirty.filter(id => !legacy(id));
    S.cdirty = S.cdirty.filter(id => !legacy(id));
    S.expected = S.expected.filter(e => !e.demo);
    if (isPhysioRole()) {
      LEGACY_SEED_IDS.forEach(id => { delete S.visits[id]; });
      S.dirty = S.dirty.filter(id => !LEGACY_SEED_IDS.includes(id));
      S.cdirty = S.cdirty.filter(id => !LEGACY_SEED_IDS.includes(id));
      S.expected = S.expected.filter(e => !e.builtin);
    }
  }

  function commit(v) {
    v.updatedAt = new Date().toISOString();
    S.visits[v.id] = v;
    if (!S.dirty.includes(v.id)) S.dirty.push(v.id);
    if (!saveVisits()) toast('This device is out of storage space.', 'alert-triangle');
    saveDirty();
    if (!S.cdirty.includes(v.id)) S.cdirty.push(v.id);
    saveCloudMeta();
    render();
    hubSync();
    cloudSync();
  }

  function addStage(v, dept, data) {
    v.stages = (v.stages || []).concat([{ id: 'S-' + rand(10), dept, at: new Date().toISOString(), by: staff(), data }]);
  }

  function putStage(v, dept, data, editId) {
    if (!editId) { addStage(v, dept, data); return; }
    v.stages = (v.stages || []).map(st => {
      if (st.id !== editId) return st;
      const history = (st.history || []).concat([{ at: st.editedAt || st.at, by: st.editedBy || st.by, data: st.data }]).slice(-5);
      return Object.assign({}, st, { data, history, editedAt: new Date().toISOString(), editedBy: staff() });
    });
  }

  function newVisit(base) {
    const now = new Date().toISOString();
    return Object.assign({
      id: 'V-' + rand(6),
      facility: hub().facility,
      createdAt: now,
      updatedAt: now,
      urgency: 'routine',
      patient: {},
      referral: null,
      closed: false,
      summary: '',
      stages: []
    }, base);
  }

  async function hubFetch(path, opts) {
    const h = hub();
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (h.token) headers.Authorization = 'Bearer ' + h.token;
      const res = await fetch(h.url.replace(/\/+$/, '') + path, {
        method: (opts && opts.method) || 'GET',
        headers,
        body: opts && opts.body ? JSON.stringify(opts.body) : undefined,
        signal: ctl.signal
      });
      if (!res.ok) {
        const err = new Error('HTTP ' + res.status);
        err.status = res.status;
        throw err;
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function setPill() {
    const el = $('#hub-pill');
    if (!el) return;
    let m;
    if (S.hubState === 'ok') m = ['pill-success', 'Hub connected'];
    else if (S.hubState === 'denied') m = ['pill-critical', 'Hub rejected the access token'];
    else if (S.cloudState === 'ok') m = ['pill-success', S.hubState === 'down' ? 'Hub unreachable · synced to your account' : 'Synced across your devices'];
    else if (S.cloudState === 'setup') m = ['pill-warning', 'Cloud sync not set up yet'];
    else if (S.hubState === 'down' || S.cloudState === 'down') m = ['pill-warning', 'Offline · saved on this device'];
    else m = ['pill-neutral', 'Saved on this device only'];
    el.className = 'pill ' + m[0];
    el.innerHTML = '<span class="pill-dot' + (m[0] === 'pill-warning' ? ' offline-pulse' : '') + '"></span>' + esc(m[1]);
  }

  function setHubState(state) {
    S.hubState = state;
    setPill();
  }

  function setCloudState(state) {
    S.cloudState = state;
    setPill();
  }

  async function hubSync() {
    const h = hub();
    if (!h.url) { setHubState('off'); return; }
    if (S.syncing) return;
    S.syncing = true;
    try {
      const sentAt = {};
      const out = S.dirty.slice(0, 25).map(id => S.visits[id]).filter(Boolean);
      out.forEach(v => { sentAt[v.id] = v.updatedAt; });
      const res = await hubFetch('/api/visits/sync', { method: 'POST', body: { since: S.cursor, visits: out } });
      let changed = false;
      (res.visits || []).forEach(inc => {
        const cur = S.visits[inc.id];
        const next = mergeVisit(cur, inc);
        if (!cur || JSON.stringify(cur) !== JSON.stringify(next)) {
          S.visits[inc.id] = next;
          if (!S.cdirty.includes(inc.id)) S.cdirty.push(inc.id);
          changed = true;
        }
      });
      S.dirty = S.dirty.filter(id => !(sentAt[id] && S.visits[id] && S.visits[id].updatedAt === sentAt[id]));
      S.cursor = Number(res.seq) || S.cursor;
      saveVisits();
      saveDirty();
      store.write(K.cursor(), S.cursor);
      setHubState('ok');
      if (changed) {
        saveCloudMeta();
        render();
        cloudSync();
      }
    } catch (e) {
      setHubState(e && (e.status === 401 || e.status === 403) ? 'denied' : 'down');
    } finally {
      S.syncing = false;
    }
  }

  function startPolling() {
    clearInterval(S.pollTimer);
    clearInterval(S.cloudTimer);
    S.pollTimer = setInterval(() => { if (!document.hidden) hubSync(); }, POLL_MS);
    S.cloudTimer = setInterval(() => { if (!document.hidden) { cloudSync(); loadExpected(); } }, CLOUD_POLL_MS);
  }

  function loadLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LIB;
      s.onload = resolve;
      s.onerror = () => reject(new Error('lib'));
      document.head.appendChild(s);
    });
  }

  async function ensureCloud() {
    if (S.sb && S.uid) return true;
    if (!navigator.onLine) return false;
    try {
      await loadLib();
      const sb = RC.sbClient();
      if (!sb) return false;
      const got = await sb.auth.getSession();
      const uid = got && got.data && got.data.session ? got.data.session.user.id : '';
      if (!uid) return false;
      S.sb = sb;
      S.uid = uid;
      return true;
    } catch (e) {
      return false;
    }
  }

  function bindCloudRealtime() {
    if (S.rt || !S.sb || !S.uid) return;
    try {
      S.rt = true;
      S.sb.channel('rc-visits-' + S.uid)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'hospital_visits', filter: 'user_id=eq.' + S.uid }, () => {
          clearTimeout(S.rtTimer);
          S.rtTimer = setTimeout(cloudSync, 600);
        })
        .subscribe();
    } catch (e) {
      S.rt = false;
    }
  }

  async function cloudSync() {
    if (S.cloudBusy) return;
    S.cloudBusy = true;
    try {
      if (!(await ensureCloud())) {
        setCloudState(navigator.onLine ? 'off' : 'down');
        return;
      }
      const sb = S.sb;
      const pulled = [];
      for (let from = 0; ; from += 500) {
        const res = await sb.from('hospital_visits').select('id,data,server_ts').gt('server_ts', S.ccursor).order('server_ts', { ascending: true }).range(from, from + 499);
        if (res.error) throw res.error;
        const page = res.data || [];
        page.forEach(r => pulled.push(r));
        if (page.length < 500) break;
      }
      let changed = false;
      let maxTs = 0;
      pulled.forEach(r => {
        maxTs = Math.max(maxTs, Date.parse(r.server_ts) || 0);
        const inc = r.data && r.data.id ? r.data : null;
        if (!inc) return;
        const cur = S.visits[inc.id];
        const next = mergeVisit(cur, inc);
        if (!cur || canon(cur) !== canon(next)) {
          S.visits[inc.id] = next;
          changed = true;
        }
        if (cur && canon(next) !== canon(inc) && !S.cdirty.includes(inc.id)) S.cdirty.push(inc.id);
      });
      const out = S.cdirty.map(id => S.visits[id]).filter(Boolean);
      const sent = {};
      for (let i = 0; i < out.length; i += 50) {
        const batch = out.slice(i, i + 50);
        const res = await sb.from('hospital_visits').upsert(
          batch.map(v => {
            sent[v.id] = v.updatedAt;
            return { user_id: S.uid, id: v.id, data: v, updated_at: v.updatedAt };
          }),
          { onConflict: 'user_id,id' }
        );
        if (res.error) throw res.error;
      }
      S.cdirty = S.cdirty.filter(id => !(sent[id] && S.visits[id] && S.visits[id].updatedAt === sent[id]));
      if (maxTs > 0) {
        const next = new Date(maxTs - 5000).toISOString();
        if (next > S.ccursor) S.ccursor = next;
      }
      saveVisits();
      saveCloudMeta();
      setCloudState('ok');
      bindCloudRealtime();
      if (changed) render();
    } catch (e) {
      const code = e && e.code ? String(e.code) : '';
      if (code === '42P01' || code === 'PGRST205') setCloudState('setup');
      else if (e && (e.status === 401 || e.status === 403)) setCloudState('off');
      else setCloudState('down');
    } finally {
      S.cloudBusy = false;
    }
  }

  async function flushActions() {
    if (!S.sb || !S.uid || !navigator.onLine) return;
    const list = store.read(K.actions(), []);
    if (!list.length) return;
    const keep = [];
    for (const a of list) {
      try {
        const r = await S.sb.rpc('mark_patient_arrived', { p_id: a.id });
        if (r.error) {
          const m = String(r.error.message || '');
          if (!['invalid_state', 'forbidden', 'not_found'].includes(m)) keep.push(a);
        }
      } catch (e) {
        keep.push(a);
      }
    }
    store.write(K.actions(), keep);
  }

  async function loadExpected() {
    if (!navigator.onLine) return;
    try {
      await loadLib();
      const sb = RC.sbClient();
      if (!sb) return;
      const got = await sb.auth.getSession();
      const uid = got && got.data && got.data.session ? got.data.session.user.id : '';
      if (!uid) return;
      S.sb = sb;
      S.uid = uid;
      const mem = await sb.from('facility_members').select('facility_id').eq('user_id', uid);
      if (mem.error) throw mem.error;
      const ids = (mem.data || []).map(x => x.facility_id);
      let list = [];
      if (ids.length) {
        const refs = await sb.from('referrals')
          .select('id,ref_code,client_ref,status,urgency,reason,patient,care_summary,from_facility_id,arrived_at,created_at')
          .in('to_facility_id', ids)
          .in('status', ['sent', 'received', 'accepted', 'redirected'])
          .order('created_at', { ascending: false })
          .limit(100);
        if (refs.error) throw refs.error;
        const fromIds = Array.from(new Set((refs.data || []).map(r => r.from_facility_id)));
        const names = {};
        if (fromIds.length) {
          const fac = await sb.from('facilities').select('id,name').in('id', fromIds);
          (fac.data || []).forEach(f => { names[f.id] = f.name; });
        }
        list = (refs.data || []).map(r => ({
          id: r.id,
          code: r.ref_code,
          clientRef: r.client_ref || '',
          status: r.status,
          urgency: r.urgency,
          reason: r.reason,
          patient: r.patient || {},
          care: r.care_summary || {},
          from: names[r.from_facility_id] || 'Referring facility',
          arrived: !!r.arrived_at,
          at: r.created_at
        }));
      }
      const builtin = S.expected.filter(e => e.builtin);
      S.expected = builtin.concat(list);
      store.write(K.expected(), { at: Date.now(), list: S.expected });
      await flushActions();
      render();
    } catch (e) {}
  }

  function modal(html, wide) {
    const root = $('#modal-root');
    root.className = '';
    root.innerHTML = '<div class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-4"><div data-close class="absolute inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm"></div>' +
      '<div id="modal-card" class="relative w-full ' + (wide ? 'sm:max-w-[820px]' : 'sm:max-w-[500px]') + ' max-h-[94vh] overflow-y-auto card rounded-t-2xl sm:rounded-2xl">' + html + '</div></div>';
    icons();
    return $('#modal-card');
  }

  function closeModal() {
    const root = $('#modal-root');
    root.innerHTML = '';
    root.className = 'hidden';
  }

  function inp(name, label, value, ph, type) {
    return '<div><label class="lbl">' + label + '</label><input name="' + name + '" type="' + (type || 'text') + '" class="input-field" value="' + esc(value) + '" placeholder="' + esc(ph || '') + '" autocomplete="off"></div>';
  }

  function area(name, label, value, ph, rows) {
    return '<div><label class="lbl">' + label + '</label><textarea name="' + name + '" rows="' + (rows || 3) + '" class="input-field resize-y" placeholder="' + esc(ph || '') + '">' + esc(value) + '</textarea></div>';
  }

  function select(name, label, options, value) {
    return '<div><label class="lbl">' + label + '</label><select name="' + name + '" class="input-field">' +
      options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === value ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select></div>';
  }

  function rowHtml(kind, vals) {
    vals = vals || {};
    return '<div class="row-' + kind + ' grid grid-cols-2 sm:grid-cols-12 gap-2 items-center">' +
      ROWS[kind].map(c => '<input data-k="' + c[0] + '" class="input-field sm:col-span-' + c[2] + '" placeholder="' + esc(c[1]) + '" value="' + esc(vals[c[0]]) + '">').join('') +
      '<button type="button" data-del class="text-[12px] font-semibold text-[#DC2626] sm:col-span-2 text-left sm:text-center py-2">Remove</button></div>';
  }

  function rowsBlock(kind, title, addLabel, list) {
    const items = list && list.length ? list : [{}];
    return '<div><p class="lbl">' + title + '</p><div id="rows-' + kind + '" class="space-y-2">' + items.map(x => rowHtml(kind, x)).join('') +
      '</div><button type="button" data-add="' + kind + '" class="mt-2 text-[12.5px] font-semibold text-[#52B788]">' + addLabel + '</button></div>';
  }

  function readRows(form, kind) {
    return $$('.row-' + kind, form).map(r => {
      const o = {};
      ROWS[kind].forEach(c => {
        const el = r.querySelector('[data-k="' + c[0] + '"]');
        const t = el ? el.value.trim() : '';
        if (t) o[c[0]] = t;
      });
      return o;
    }).filter(o => Object.keys(o).length);
  }

  const val = (form, name) => { const el = form.elements[name]; return el ? String(el.value == null ? '' : el.value).trim() : ''; };

  function deptForm(v, d, init) {
    const x = init || {};
    if (d === 'registration') {
      return area('complaint', 'Reason for visit *', x.complaint || '', 'What brought the patient?', 2) +
        select('payer', 'Payment', Object.keys(PAYERS).map(k => [k, PAYERS[k]]), x.payer || 'cash');
    }
    if (d === 'consultation') {
      return area('diagnosis', 'Diagnosis *', x.diagnosis || '', 'Working diagnosis', 2) + area('notes', 'Examination and plan', x.notes || '', 'Findings and what to do next', 2) +
        rowsBlock('rx', 'Prescription', '+ Add drug', x.prescriptions || []) +
        inp('physio', 'Physiotherapy needed? Say why (leave empty if not)', x.physio || '', 'e.g. Weakness after stroke, knee pain') +
        area('labRequests', 'Lab tests requested (separate with commas)', (x.labRequests || []).join(', '), 'e.g. Malaria RDT, Full blood count', 2);
    }
    if (d === 'lab') return rowsBlock('results', 'Test results', '+ Add result', init ? (x.results || []) : pendingLab(v).map(t => ({ test: t })));
    if (d === 'pharmacy') return rowsBlock('dispense', 'Drugs dispensed', '+ Add drug', init ? (x.items || []) : pendingRx(v).map(p => ({ drug: p.drug })));
    if (d === 'physiotherapy') {
      const asked = stagesOf(v, 'consultation').map(st => st.data.physio).filter(Boolean).slice(-1)[0] || (v.referral && v.referral.reason) || '';
      return (asked && !init ? '<p class="text-[12.5px] text-slate-500">Referred for: ' + esc(asked) + '</p>' : '') +
        area('assessment', 'Assessment *', x.assessment || '', 'Findings, movement, strength, pain score', 3) + area('treatment', 'Treatment given', x.treatment || '', 'Exercises, manual therapy, other treatment', 2) +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + inp('sessions', 'Sessions planned', x.sessions || '', 'e.g. 6 over 3 weeks') + inp('next', 'Next appointment', x.next || '', 'e.g. Monday 10am') + '</div>';
    }
    return select('disposition', 'Outcome of this visit', (isPhysioRole() ? PHYSIO_OUTCOMES : Object.keys(OUTCOMES)).map(k => [k, OUTCOMES[k]]), isPhysioRole() ? 'continuing_physiotherapy' : 'treated_and_discharged') +
      area('note', 'Follow-up advice (optional)', '', 'e.g. Return in 3 days if fever persists', 2);
  }

  function buildSummary(v, disposition, note) {
    const parts = [];
    const c = stagesOf(v, 'consultation').slice(-1)[0];
    if (c && c.data.diagnosis) parts.push('Diagnosis: ' + c.data.diagnosis + '.');
    else if (v.referral && v.referral.care && v.referral.care.assessment) parts.push('Referred with: ' + v.referral.care.assessment + '.');
    const labs = [];
    stagesOf(v, 'lab').forEach(st => (st.data.results || []).forEach(r => labs.push(r.test + ': ' + r.result)));
    if (labs.length) parts.push('Investigations: ' + labs.join('; ') + '.');
    const rx = prescribed(v).map(p => [p.drug, p.dose, p.freq, p.days ? p.days + ' days' : ''].filter(Boolean).join(' '));
    if (rx.length) parts.push('Treatment: ' + rx.join('; ') + '.');
    const ph = stagesOf(v, 'physiotherapy').slice(-1)[0];
    if (ph) parts.push('Physiotherapy: ' + [ph.data.assessment, ph.data.treatment ? 'treated with ' + ph.data.treatment : '', ph.data.sessions ? 'plan ' + ph.data.sessions : ''].filter(Boolean).join('; ') + '.');
    parts.push('Outcome: ' + (OUTCOMES[disposition] || disposition) + '.');
    if (note) parts.push(note);
    return parts.join('\n');
  }

  function submitDept(v, d, form, editId) {
    if (d === 'registration') {
      const complaint = val(form, 'complaint');
      if (complaint.length < 3) return 'Enter the reason for the visit.';
      putStage(v, 'registration', { complaint, payer: val(form, 'payer') }, editId);
    } else if (d === 'consultation') {
      const diagnosis = val(form, 'diagnosis');
      if (diagnosis.length < 3) return 'Enter the diagnosis.';
      putStage(v, 'consultation', {
        diagnosis,
        notes: val(form, 'notes'),
        prescriptions: readRows(form, 'rx').filter(r => r.drug),
        labRequests: val(form, 'labRequests').split(',').map(x => x.trim()).filter(Boolean),
        physio: val(form, 'physio')
      }, editId);
    } else if (d === 'lab') {
      const results = readRows(form, 'results').filter(r => r.test && r.result);
      if (!results.length) return 'Add at least one test with its result.';
      putStage(v, 'lab', { results }, editId);
    } else if (d === 'pharmacy') {
      const items = readRows(form, 'dispense').filter(r => r.drug);
      if (!items.length) return 'Add at least one dispensed drug.';
      putStage(v, 'pharmacy', { items }, editId);
    } else if (d === 'physiotherapy') {
      const assessment = val(form, 'assessment');
      if (assessment.length < 3) return 'Enter the physiotherapy assessment.';
      putStage(v, 'physiotherapy', { assessment, treatment: val(form, 'treatment'), sessions: val(form, 'sessions'), next: val(form, 'next') }, editId);
    } else {
      if (isPhysioRole() ? !stagesOf(v, 'physiotherapy').length : !stagesOf(v, 'consultation').length) return isPhysioRole() ? 'A physiotherapy entry is needed before the visit can be closed.' : 'A doctor entry is needed before the visit can be closed.';
      v.closed = true;
      v.closedAt = new Date().toISOString();
      v.summary = buildSummary(v, val(form, 'disposition'), val(form, 'note'));
    }
    commit(v);
    return '';
  }

  function stageLines(s) {
    const d = s.data || {};
    const out = [];
    if (s.dept === 'registration') {
      if (d.complaint) out.push('Complaint: ' + d.complaint);
      if (d.payer) out.push('Payer: ' + (PAYERS[d.payer] || d.payer));
    } else if (s.dept === 'consultation') {
      if (d.diagnosis) out.push('Diagnosis: ' + d.diagnosis);
      if (d.notes) out.push(d.notes);
      (d.prescriptions || []).forEach(p => out.push('Prescribed: ' + [p.drug, p.dose, p.freq, p.days ? p.days + ' days' : ''].filter(Boolean).join(' ')));
      if ((d.labRequests || []).length) out.push('Lab requested: ' + d.labRequests.join(', '));
      if (d.physio) out.push('Physiotherapy requested: ' + d.physio);
    } else if (s.dept === 'lab') {
      (d.results || []).forEach(r => out.push(r.test + ': ' + r.result));
    } else if (s.dept === 'pharmacy') {
      (d.items || []).forEach(i => out.push('Dispensed: ' + i.drug + (i.qty ? ' (' + i.qty + ')' : '')));
    } else if (s.dept === 'physiotherapy') {
      if (d.assessment) out.push('Assessment: ' + d.assessment);
      if (d.treatment) out.push('Treatment: ' + d.treatment);
      if (d.sessions) out.push('Sessions planned: ' + d.sessions);
      if (d.next) out.push('Next appointment: ' + d.next);
    }
    return out;
  }

  function printVisitReport(id) {
    const v = S.visits[id];
    if (!v) return;
    const p = v.patient || {};
    const r = v.referral;
    const w = window.open('', '_blank');
    if (!w) return;
    const timelineHtml = (v.stages || []).map(st => {
      const meta = DEPTS[st.dept] || [st.dept, 'circle'];
      return '<div style="margin-bottom: 20px; padding-bottom: 14px; border-bottom: 1px solid #e2e8f0;">' +
        '<div style="font-weight: bold; font-size: 15px; color: #0f172a; display: flex; justify-content: space-between;"><span>' + esc(meta[0]) + '</span><span style="font-size:11.5px; font-weight:normal; color:#64748b;">' + esc(fmt(st.at)) + '</span></div>' +
        '<div style="font-size: 12px; color: #475569; margin-bottom: 6px;">Attending: <strong>' + esc(st.by || 'Clinician') + '</strong></div>' +
        stageLines(st).map(l => '<div style="font-size: 13px; margin-top: 4px; color: #1e293b; background: #f8fafc; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #52B788;">' + esc(l) + '</div>').join('') +
        '</div>';
    }).join('');

    w.document.write('<!DOCTYPE html><html><head><title>Clinical Report - ' + esc(v.id) + '</title>' +
      '<style>body{font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;padding:32px;color:#0f172a;max-width:800px;margin:auto;line-height:1.5;}h1{font-size:22px;color:#0f172a;margin-bottom:2px;font-weight:800;}h2{font-size:15px;margin-top:24px;color:#0f172a;border-bottom:2px solid #52B788;padding-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;}.meta-box{background:#f8fafc;padding:18px;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:20px;}</style>' +
      '</head><body>' +
      '<div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:16px; margin-bottom:24px;">' +
      '<div><h1>RuralCare</h1><div style="font-size:13px; color:#475569; font-weight:600; margin-top:2px;">Clinical Visit & Referral Report</div></div>' +
      '<div style="text-align:right; font-size:12px; color:#64748b;"><strong>Facility:</strong> ' + esc(v.facility) + '<br><strong>Printed:</strong> ' + esc(fmt(new Date().toISOString())) + '</div>' +
      '</div>' +
      '<div class="meta-box">' +
      '<table style="width:100%; border-collapse:collapse; font-size:13px; color:#334155;">' +
      '<tr><td style="padding:4px 0; width:50%;"><strong>Patient Name:</strong> ' + esc(p.name || 'Unnamed Patient') + '</td><td style="padding:4px 0;"><strong>Visit ID:</strong> <span style="font-family:monospace;">' + esc(v.id) + '</span></td></tr>' +
      '<tr><td style="padding:4px 0;"><strong>Age / Sex:</strong> ' + esc([p.age, p.gender].filter(Boolean).join(' · ') || 'N/A') + '</td><td style="padding:4px 0;"><strong>Status:</strong> ' + (v.closed ? 'Closed' : 'Active / In Hospital') + '</td></tr>' +
      '<tr><td style="padding:4px 0;"><strong>Phone:</strong> ' + esc(p.contact || 'N/A') + '</td><td style="padding:4px 0;"><strong>Urgency:</strong> ' + esc(isUrgent(v.urgency) ? 'URGENT' : 'ROUTINE') + '</td></tr>' +
      '<tr><td style="padding:4px 0;" colspan="2"><strong>Community / Address:</strong> ' + esc(p.community || 'N/A') + '</td></tr>' +
      '</table>' +
      (v.summary ? '<div style="margin-top:12px; padding-top:12px; border-top:1px solid #e2e8f0;"><strong>Visit Summary / Outcome:</strong><div style="white-space:pre-wrap; margin-top:4px; font-size:13.5px;">' + esc(v.summary) + '</div></div>' : '') +
      '</div>' +
      (r ? '<h2>Referral Information</h2><div class="meta-box" style="background:#f0fdf4; border-color:#bbf7d0;">' +
        '<table style="width:100%; border-collapse:collapse; font-size:13px; color:#334155;">' +
        '<tr><td style="padding:4px 0; width:50%;"><strong>Referring Facility:</strong> ' + esc(r.from) + '</td><td style="padding:4px 0;"><strong>Ref Code:</strong> <span style="font-family:monospace;">' + esc(r.code || r.clientRef) + '</span></td></tr>' +
        '<tr><td style="padding:4px 0;" colspan="2"><strong>Reason for Referral:</strong> ' + esc(r.reason) + '</td></tr>' +
        (r.care && r.care.assessment ? '<tr><td style="padding:4px 0;" colspan="2"><strong>Initial Assessment:</strong> ' + esc(r.care.assessment) + '</td></tr>' : '') +
        '</table>' +
        '</div>' : '') +
      '<h2>Clinical Timeline & Department Entries</h2>' + (timelineHtml || '<div style="color:#64748b; font-style:italic; font-size:13px;">No clinical entries recorded yet.</div>') +
      '<div style="margin-top:40px; padding-top:20px; border-top:1px solid #cbd5e1; display:grid; grid-template-columns: 1fr 1fr; gap:32px; font-size:12px; color:#64748b;">' +
      '<div>' +
      '<div style="margin-bottom:24px;">Clinician Signature: ___________________________</div>' +
      '<div>Date: _________________________________________</div>' +
      '</div>' +
      '<div style="text-align:center; border: 2px dashed #94a3b8; border-radius: 8px; padding: 14px; height: 75px; display: flex; flex-direction: column; justify-content: center; align-items: center;">' +
      '<span style="font-size:11px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.05em;">Official Facility Stamp</span>' +
      '<span style="font-size:10px; color:#94a3b8; margin-top:3px;">(Stamp & Date Here)</span>' +
      '</div>' +
      '</div>' +
      '<script>window.print();</script></body></html>');
    w.document.close();
  }

  function detailHtml(v) {
    const p = v.patient || {};
    const r = v.referral;
    const flags = flagsOf(v);
    const vt = vitalText(p.vitals);
    const care = (r && r.care) || {};
    const timeline = (v.stages || []).map(st => {
      const meta = DEPTS[st.dept] || [st.dept, 'circle'];
      return '<div class="flex gap-3"><span class="w-7 h-7 rounded-full bg-[#52B788]/15 text-[#52B788] flex items-center justify-center shrink-0"><i data-lucide="' + meta[1] + '" class="w-3.5 h-3.5"></i></span><div class="min-w-0">' +
        '<p class="text-[13px] font-semibold text-headingDark dark:text-white">' + esc(meta[0]) + '</p>' +
        '<p class="text-[11.5px] text-slate-500">' + esc(st.by || '') + ' · ' + esc(fmt(st.at)) + (st.editedAt ? ' · edited by ' + esc(st.editedBy || '') + ' ' + esc(fmt(st.editedAt)) : '') + '</p>' +
        stageLines(st).map(l => '<p class="text-[12.5px] mt-0.5 whitespace-pre-wrap">' + esc(l) + '</p>').join('') +
        (v.closed || !(st.dept === 'registration' || formDepts().includes(st.dept)) ? '' : '<button type="button" data-edit-stage="' + esc(st.id) + '" class="mt-1 text-[12px] font-semibold text-[#52B788] inline-flex items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3"></i><span>Edit</span></button>') + '</div></div>';
    }).join('');
    const w = waiting(v).filter(x => formDepts().includes(x));
    const def = w.length ? w[0] : 'close';
    let editId = '';
    const action = v.closed
      ? '<div class="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 p-4"><p class="sec-title">Visit summary</p><p class="text-[13.5px] whitespace-pre-wrap mt-1">' + esc(v.summary) + '</p>' +
        '<div class="flex flex-wrap gap-2 mt-3"><button type="button" data-print-report="' + esc(v.id) + '" class="btn-primary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="printer" class="w-3.5 h-3.5"></i><span>Print report / referral summary</span></button>' +
        '<button type="button" data-reopen class="btn-secondary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i><span>Reopen to make changes</span></button></div></div>'
      : '<div class="flex justify-between items-center mb-3"><button type="button" data-print-report="' + esc(v.id) + '" class="btn-secondary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="printer" class="w-3.5 h-3.5"></i><span>Print visit / referral sheet</span></button>' + (isPhysioRole() ? '<a href="referrals.html?new=1" class="btn-primary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="send" class="w-3.5 h-3.5"></i><span>Refer to medical or radiology</span></a>' : '') + '</div>' +
        '<form id="stage-form" class="space-y-3 rounded-xl border border-[#E5E7EB] dark:border-white/10 p-4" novalidate>' +
        '<div id="edit-banner" class="hidden flex items-center justify-between gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/40 px-3 py-2"><span id="edit-label" class="text-[12.5px] font-semibold text-amber-900 dark:text-amber-200"></span><button type="button" data-cancel-edit class="text-[12px] font-semibold text-slate-600 dark:text-slate-300">Cancel edit</button></div>' +
        '<div class="flex flex-wrap items-end gap-3"><div class="grow"><label class="lbl">Add an entry as</label><select id="dept-pick" class="input-field">' +
        formDepts().map(d => '<option value="' + d + '"' + (d === def ? ' selected' : '') + '>' + esc(d === 'close' ? 'Close the visit' : DEPTS[d][0]) + '</option>').join('') + '<option value="registration" hidden>GOPD</option></select></div></div>' +
        '<div id="dept-fields" class="space-y-3">' + deptForm(v, def) + '</div>' +
        '<p id="stage-err" class="hidden text-[12.5px] font-semibold text-[#DC2626]"></p>' +
        '<div class="flex justify-end"><button type="submit" id="stage-save" class="btn-primary px-5 py-2.5 text-[13px]">Save entry</button></div></form>';
    return '<div class="p-5 sm:p-6 space-y-5">' +
      '<div class="flex items-start justify-between gap-3"><div class="space-y-2"><div class="flex flex-wrap items-center gap-2"><span class="rc-badge rc-badge-id">' + esc(v.id) + '</span>' + (!v.closed && isUrgent(v.urgency) ? pill(URGENCY, 'urgent') : '') + statusPill(v) + '</div>' +
      '<h3 class="text-[19px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + '</h3>' +
      '<p class="text-[12.5px] text-slate-500">' + esc([p.age, p.gender, p.community, p.contact].filter(Boolean).join(' · ')) + '</p>' +
      (vt ? '<p class="text-[12.5px] font-semibold">' + esc(vt) + '</p>' : '') +
      (v.closed ? '' : '<button type="button" data-edit-patient class="text-[12px] font-semibold text-[#52B788] inline-flex items-center gap-1"><i data-lucide="edit-3" class="w-3 h-3"></i><span>Edit patient details</span></button>') + '</div>' +
      '<button type="button" data-close class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0" aria-label="Close"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      (flags.length ? '<div class="flex items-start gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200"><div class="p-2 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0"><i data-lucide="alert-triangle" class="w-4 h-4"></i></div><div class="min-w-0 flex-1"><p class="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">Clinical Triage Flag</p><p class="text-[13px] font-medium mt-0.5">' + esc(flags.join('; ')) + '</p></div></div>' : '') +
      (r ? '<div class="rounded-xl border border-[#52B788]/40 bg-[#52B788]/5 p-4 space-y-2"><p class="sec-title">Referred patient</p>' +
        '<p class="text-[12.5px]"><span class="font-semibold">' + esc(r.from) + '</span> · <span class="font-mono">' + esc(r.code || r.clientRef) + '</span></p>' +
        '<p class="text-[13px] whitespace-pre-wrap">' + esc(r.reason) + '</p>' +
        (care.assessment ? '<p class="text-[12.5px]"><span class="font-semibold">Assessment:</span> ' + esc(care.assessment) + '</p>' : '') +
        (care.findings ? '<p class="text-[12.5px] whitespace-pre-wrap"><span class="font-semibold">Findings:</span> ' + esc(care.findings) + '</p>' : '') +
        ((care.treatments_given || []).length ? '<p class="text-[12.5px]"><span class="font-semibold">Given before referral:</span> ' + esc(care.treatments_given.map(t => [t.item, t.dose, t.route, t.at ? 'at ' + t.at : ''].filter(Boolean).join(' ')).join('; ')) + '</p>' : '') +
        ((care.investigations || []).length ? '<p class="text-[12.5px]"><span class="font-semibold">Investigations:</span> ' + esc(care.investigations.map(t => t.test + (t.result ? ': ' + t.result : '')).join('; ')) + '</p>' : '') +
        (care.allergies ? '<p class="text-[12.5px]"><span class="font-semibold">Allergies:</span> ' + esc(care.allergies) + '</p>' : '') + '</div>' : '') +
      '<div><p class="sec-title mb-2">Visit record</p><div class="space-y-3">' + (timeline || '<p class="text-[12.5px] text-slate-500">No entries yet.</p>') + '</div></div>' +
      action + '</div>';
  }

  function openVisit(id) {
    const v0 = S.visits[id];
    if (!v0) return;
    const card = modal(detailHtml(v0), true);
    card.addEventListener('click', ev => {
      if (ev.target.closest('[data-edit-patient]')) { editPatientForm(id); return; }
      if (ev.target.closest('[data-reopen]')) { reopenVisit(id); return; }
      const pr = ev.target.closest('[data-print-report]');
      if (pr) { printVisitReport(pr.dataset.printReport); return; }
    });
    const form = $('#stage-form', card);
    if (!form) return;
    const pick = $('#dept-pick', form);
    const box = $('#dept-fields', form);
    const banner = $('#edit-banner', form);
    const save = $('#stage-save', form);
    const first = waiting(v0).filter(x => formDepts().includes(x))[0] || 'close';
    let editId = '';
    const show = (dept, st) => {
      editId = st ? st.id : '';
      pick.value = dept;
      pick.disabled = !!st;
      box.innerHTML = deptForm(S.visits[id], dept, st ? st.data : null);
      banner.classList.toggle('hidden', !st);
      if (st) $('#edit-label', form).textContent = 'Editing the ' + DEPTS[dept][0] + ' entry';
      save.textContent = st ? 'Save changes' : 'Save entry';
      $('#stage-err', form).classList.add('hidden');
    };
    pick.addEventListener('change', () => show(pick.value, null));
    card.addEventListener('click', ev => {
      const es = ev.target.closest('[data-edit-stage]');
      if (es) {
        const st = (S.visits[id].stages || []).find(x => x.id === es.dataset.editStage);
        if (st) { show(st.dept, st); form.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        return;
      }
      if (ev.target.closest('[data-cancel-edit]')) show(first, null);
    });
    form.addEventListener('click', ev => {
      const add = ev.target.closest('[data-add]');
      const del = ev.target.closest('[data-del]');
      if (add) $('#rows-' + add.dataset.add, form).insertAdjacentHTML('beforeend', rowHtml(add.dataset.add));
      if (del) {
        const row = del.closest('[class^="row-"]');
        if (row.parentNode.children.length > 1) row.remove();
        else $$('input', row).forEach(i => { i.value = ''; });
      }
    });
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const err = $('#stage-err', form);
      const msg = submitDept(S.visits[id], pick.value, form, editId);
      if (msg) { err.textContent = msg; err.classList.remove('hidden'); return; }
      toast(editId ? 'Changes saved' : 'Entry saved', 'check-circle');
      openVisit(id);
    });
  }

  function editPatientForm(id) {
    const v = S.visits[id];
    if (!v) return;
    const p = v.patient || {};
    const vt = p.vitals || {};
    const card = modal('<form id="patient-form" class="p-5 sm:p-6 space-y-4" novalidate><div class="flex items-start justify-between gap-3"><h3 class="text-[18px] font-bold text-headingDark dark:text-white">Edit patient details</h3>' +
      '<button type="button" data-close class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + inp('name', 'Full name *', p.name) + inp('age', 'Age', p.age) +
      select('gender', 'Sex', [['', 'Select'], ['Female', 'Female'], ['Male', 'Male']], p.gender || '') + inp('contact', 'Phone', p.contact, '', 'tel') +
      inp('community', 'Community or address', p.community) + select('urgency', 'Urgency', URGENCY_CHOICES, normUrgency(v.urgency)) + '</div>' +
      '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">' + inp('bpSys', 'BP sys', vt.bpSys) + inp('bpDia', 'BP dia', vt.bpDia) + inp('temp', 'Temp °C', vt.temp) + inp('hr', 'Pulse', vt.hr) + inp('spo2', 'SpO2 %', vt.spo2) + '</div>' +
      '<p id="patient-err" class="hidden text-[12.5px] font-semibold text-[#DC2626]"></p>' +
      '<div class="flex justify-end gap-2"><button type="button" data-close class="btn-secondary px-4 py-2.5 text-[13px]">Cancel</button><button type="submit" class="btn-primary px-5 py-2.5 text-[13px]">Save changes</button></div></form>');
    const form = $('#patient-form', card);
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const name = val(form, 'name');
      if (name.length < 2) { const err = $('#patient-err', form); err.textContent = 'Enter the patient name.'; err.classList.remove('hidden'); return; }
      const vitals = {};
      ['bpSys', 'bpDia', 'temp', 'hr', 'spo2'].forEach(k => { const t = val(form, k); if (t) vitals[k] = t; });
      const cur = S.visits[id];
      cur.patient = Object.assign({}, cur.patient, { name, age: val(form, 'age'), gender: val(form, 'gender'), contact: val(form, 'contact'), community: val(form, 'community'), vitals });
      cur.urgency = val(form, 'urgency') || 'routine';
      closeModal();
      commit(cur);
      toast('Patient details updated', 'check-circle');
      openVisit(id);
    });
  }

  function reopenVisit(id) {
    const v = S.visits[id];
    if (!v) return;
    v.closed = false;
    v.reopenedAt = new Date().toISOString();
    v.summary = '';
    commit(v);
    toast('Visit reopened', 'rotate-ccw');
    openVisit(id);
  }

  function newVisitForm(pre) {
    pre = pre || {};
    const p = pre.patient || {};
    const vt = p.vitals || {};
    const card = modal('<form id="visit-form" class="p-5 sm:p-6 space-y-4" novalidate><div class="flex items-start justify-between gap-3"><h3 class="text-[18px] font-bold text-headingDark dark:text-white">Register patient visit</h3>' +
      '<button type="button" data-close class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + inp('name', 'Full name *', p.name) + inp('age', 'Age', p.age, 'e.g. 34 y') +
      select('gender', 'Sex', [['', 'Select'], ['Female', 'Female'], ['Male', 'Male']], p.gender || '') + inp('contact', 'Phone', p.contact, '', 'tel') +
      inp('community', 'Community or address', p.community) + select('payer', 'Payment', Object.keys(PAYERS).map(k => [k, PAYERS[k]]), 'cash') + '</div>' +
      area('complaint', 'Reason for visit *', pre.reason || '', 'What brought the patient?', 2) +
      '<div class="grid grid-cols-2 sm:grid-cols-5 gap-2">' + inp('bpSys', 'BP sys', vt.bpSys) + inp('bpDia', 'BP dia', vt.bpDia) + inp('temp', 'Temp °C', vt.temp) + inp('hr', 'Pulse', vt.hr) + inp('spo2', 'SpO2 %', vt.spo2) + '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + select('urgency', 'Urgency', URGENCY_CHOICES, normUrgency(pre.urgency)) +
      inp('refcode', 'Referral code from the paper form (optional)', pre.code || '', 'CB-... or LC-...') + '</div>' +
      '<p id="visit-err" class="hidden text-[12.5px] font-semibold text-[#DC2626]"></p>' +
      '<div class="flex justify-end gap-2"><button type="button" data-close class="btn-secondary px-4 py-2.5 text-[13px]">Cancel</button><button type="submit" class="btn-primary px-5 py-2.5 text-[13px]">Register</button></div></form>');
    const form = $('#visit-form', card);
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      const err = $('#visit-err', form);
      const name = val(form, 'name');
      const complaint = val(form, 'complaint');
      if (name.length < 2) { err.textContent = 'Enter the patient name.'; err.classList.remove('hidden'); return; }
      if (complaint.length < 3) { err.textContent = 'Enter the reason for the visit.'; err.classList.remove('hidden'); return; }
      const vitals = {};
      ['bpSys', 'bpDia', 'temp', 'hr', 'spo2'].forEach(k => { const t = val(form, k); if (t) vitals[k] = t; });
      const code = val(form, 'refcode');
      const match = !pre.referral && code ? S.expected.find(x => [x.code, x.clientRef].some(c => c && c.toLowerCase() === code.toLowerCase())) : null;
      const referral = pre.referral || (match ? referralFrom(match) : code ? { id: '', code: /^CB-/i.test(code) ? code : '', clientRef: /^LC-/i.test(code) ? code : '', from: '', reason: '', care: {} } : null);
      const dup = referral ? Object.values(S.visits).find(x => sameRef(x, { id: referral.id, code: referral.code, clientRef: referral.clientRef })) : null;
      if (dup) { closeModal(); toast('This referral already has a visit', 'info'); openVisit(dup.id); return; }
      const v = newVisit({
        urgency: val(form, 'urgency') || 'routine',
        patient: { name, age: val(form, 'age'), gender: val(form, 'gender'), contact: val(form, 'contact'), community: val(form, 'community'), vitals },
        referral
      });
      addStage(v, 'registration', { complaint, payer: val(form, 'payer') });
      closeModal();
      if (referral && referral.id) queueArrival(referral.id);
      S.tab = 'active';
      S.dept = defaultDeptForRole() === 'all' ? 'all' : defaultDeptForRole();
      commit(v);
      toast('Visit registered', 'user-plus');
      openVisit(v.id);
    });
  }

  const referralFrom = e => ({ id: e.id, code: e.code, clientRef: e.clientRef || '', from: e.from, reason: e.reason, care: e.care || {} });

  function queueArrival(id) {
    if (String(id).startsWith('seed-')) return;
    const list = store.read(K.actions(), []);
    if (!list.some(a => a.id === id)) list.push({ id, type: 'arrived' });
    store.write(K.actions(), list);
    flushActions();
  }

  const sameRef = (v, e) => !!v.referral && ((!!v.referral.id && v.referral.id === e.id) ||
    [e.code, e.clientRef].some(c => c && [v.referral.code, v.referral.clientRef].some(x => x && String(x).toLowerCase() === String(c).toLowerCase())));

  async function registerArrival(id) {
    const e = S.expected.find(x => x.id === id);
    if (!e) return;
    let existing = Object.values(S.visits).find(v => sameRef(v, e));
    if (!existing && e.arrived) {
      await cloudSync();
      existing = Object.values(S.visits).find(v => sameRef(v, e));
    }
    if (existing) { openVisit(existing.id); return; }
    newVisitForm({
      patient: e.patient,
      reason: e.reason,
      urgency: e.urgency,
      code: e.code,
      referral: referralFrom(e)
    });
  }

  const PHYSIO_VISIT_IDS = { '1': 'V-P2A7KD', '2': 'V-P3B8LE', '3': 'V-P4C9MF', '4': 'V-P5D2NG', '5': 'V-P6E3QH', '6': 'V-P7F4RJ', '7': 'V-P8G5SK' };

  function physioData() {
    const ago = m => new Date(Date.now() - m * 60000).toISOString();
    const stage = (id, dept, m, by, data) => ({ id, dept, at: ago(m), by, data });
    const reg = (n, m, complaint, payer) => stage('S-PHY' + n + '01', 'registration', m, 'GOPD Officer', { complaint, payer });
    const phy = (n, m, data) => stage('S-PHY' + n + '02', 'physiotherapy', m, 'Physiotherapist', data);
    const referral = (clientRef, from, reason, assessment, findings) => ({ id: '', code: '', clientRef, from, reason, care: { assessment, findings } });
    const visit = (n, m, urgency, patient, stages, ref, extra) => Object.assign({
      id: PHYSIO_VISIT_IDS[n],
      facility: hub().facility || 'Oredo General Hospital',
      createdAt: ago(m),
      updatedAt: SEED_EPOCH,
      urgency,
      patient,
      referral: ref,
      closed: false,
      summary: '',
      stages
    }, extra || {});
    const visits = [
      visit('1', 35, 'urgent',
        { name: 'Ehimare Osayande', age: '55 y', gender: 'Male', community: 'Auchi', contact: '08030000031', vitals: { bpSys: '146', bpDia: '90', hr: '78', spo2: '97' } },
        [reg('1', 35, 'Weakness of the left arm and leg four weeks after a stroke', 'nhis')],
        referral('LC-2611-A1X4KM', 'Auchi Specialist Hospital', 'Weakness of the left arm and leg four weeks after a stroke. Needs rehabilitation.', 'Post-stroke weakness, left side', 'Walks only with a stick. Left hand grip is weak.')),
      visit('2', 80, 'routine',
        { name: 'Patience Oboh', age: '38 y', gender: 'Female', community: 'Ikpoba Hill', contact: '08030000032', vitals: { bpSys: '118', bpDia: '76', hr: '72', spo2: '99' } },
        [reg('2', 80, 'Right shoulder pain and stiffness for three months', 'cash')],
        referral('LC-2611-B2Y5LN', 'Benin Central Hospital', 'Right shoulder pain and stiffness for three months. Needs mobility treatment.', 'Frozen shoulder, right side', 'Cannot lift the arm above shoulder height. No fracture seen on X-ray.')),
      visit('3', 120, 'routine',
        { name: 'Kingsley Edokpayi', age: '24 y', gender: 'Male', community: 'Igueben', contact: '08030000033', vitals: { bpSys: '120', bpDia: '78', hr: '68', spo2: '99' } },
        [reg('3', 120, 'Weak and stiff left ankle after the plaster was removed', 'cash')],
        referral('LC-2611-C3Z6MP', 'Igueben General Hospital', 'Weak and stiff left ankle after plaster removal. Needs strengthening exercises.', 'Healed ankle fracture with stiffness', 'Swelling reduced. Ankle movement limited. Walks with a limp.')),
      visit('4', 200, 'routine',
        { name: 'Rosemary Ikponmwosa', age: '47 y', gender: 'Female', community: 'Ubiaja', contact: '08030000034', vitals: { bpSys: '126', bpDia: '82', hr: '76', spo2: '98' } },
        [reg('4', 200, 'Neck pain and stiffness after a road accident', 'hmo'),
          phy('4', 150, { assessment: 'Reduced neck rotation, muscle spasm, pain score 6/10', treatment: 'Soft tissue release and neck mobility exercises', sessions: '6 over 3 weeks', next: 'Thursday 9am' })],
        referral('LC-2611-D4A7NQ', 'Ubiaja Comprehensive Health Centre', 'Neck pain and stiffness after a road accident. Needs physiotherapy.', 'Whiplash neck injury', 'No numbness or weakness. Neck movement limited by pain.')),
      visit('5', 300, 'routine',
        { name: 'Osarumwense Idemudia', age: '3 y', gender: 'Male', community: 'Agbor', contact: '08030000035', vitals: { hr: '98', temp: '36.7', spo2: '99', weight: '13' } },
        [reg('5', 300, 'Not walking steadily, walks on tiptoes', 'cash'),
          phy('5', 240, { assessment: 'Tight calf muscles, toe-walking, walks without support', treatment: 'Calf stretching and gait training. Parent taught the home exercises', sessions: '12 over 6 weeks', next: 'Monday 10am' })],
        referral('LC-2611-E5B8PR', 'Agbor General Hospital', 'Toddler who walks on tiptoes and is not steady. Needs gait training.', 'Delayed walking with tight calf muscles', 'Normal strength. Tight calves on both sides.')),
      visit('6', 1500, 'routine',
        { name: 'Mercy Ogie', age: '61 y', gender: 'Female', community: 'Ugbegun', contact: '08030000036', vitals: { bpSys: '130', bpDia: '84', hr: '74', spo2: '98' } },
        [reg('6', 1500, 'Knee stiffness after a knee replacement', 'hmo'),
          phy('6', 1440, { assessment: 'Knee bends to 110 degrees, walks with a frame', treatment: 'Strengthening and walking exercises', sessions: '8 over 4 weeks', next: 'In 2 weeks' })],
        referral('LC-2611-F6C9QS', 'Ugbegun Primary Health Centre', 'Knee stiffness after a knee replacement. Needs rehabilitation.', 'After right total knee replacement', 'Wound healed. Knee swollen and stiff.'),
        { closed: true, closedAt: ago(1400), summary: 'Referred with: After right total knee replacement.\nPhysiotherapy: Knee bends to 110 degrees, walks with a frame; treated with Strengthening and walking exercises; plan 8 over 4 weeks.\nOutcome: Continuing physiotherapy.\nReview in 2 weeks.' }),
      visit('7', 2900, 'routine',
        { name: 'Samson Aghedo', age: '49 y', gender: 'Male', community: 'Sabongida-Ora', contact: '08030000037', vitals: { bpSys: '134', bpDia: '86', hr: '72', spo2: '98' } },
        [reg('7', 2900, 'Sudden low back pain after lifting a heavy load', 'cash'),
          phy('7', 2860, { assessment: 'Muscle strain in the lower back, pain free walking restored', treatment: 'Gentle mobilisation and core exercises', sessions: '4 sessions', next: '' })],
        referral('LC-2611-G7D2RT', 'Sabongida-Ora Primary Health Centre', 'Sudden low back pain after lifting a heavy load.', 'Acute lower back muscle strain', 'No leg weakness. Pain on bending.'),
        { closed: true, closedAt: ago(2800), summary: 'Referred with: Acute lower back muscle strain.\nPhysiotherapy: Muscle strain in the lower back, pain free walking restored; treated with Gentle mobilisation and core exercises; plan 4 sessions.\nOutcome: Treated and discharged.\nContinue the home exercises daily.' })
    ];
    const expectedItem = (n, code, from, urgency, status, mins, patient, reason, care) => ({
      id: 'seed-p-' + n,
      builtin: true,
      code,
      clientRef: '',
      status,
      urgency,
      reason,
      patient,
      care,
      from,
      arrived: false,
      at: ago(mins)
    });
    const expected = [
      expectedItem(1, 'CB-2611-P6F8', 'Ekpoma Community Health Centre', 'routine', 'sent', 25,
        { name: 'Osagie Idahosa', age: '67 y', gender: 'Male', contact: '08030000016', community: 'Ekpoma', vitals: { bpSys: '140', bpDia: '88', hr: '78', spo2: '97' } },
        'Weakness of the right arm and leg three weeks after a stroke. Needs rehabilitation.',
        { assessment: 'Post-stroke weakness, right side', findings: 'Stroke three weeks ago. Right arm and leg weak. Walks with support.', allergies: 'None known' }),
      expectedItem(2, 'CB-2611-P7G5', 'Irrua Specialist Teaching Hospital', 'urgent', 'sent', 70,
        { name: 'Esohe Aigbe', age: '58 y', gender: 'Female', contact: '08030000026', community: 'Irrua', vitals: { bpSys: '128', bpDia: '82', hr: '80', temp: '36.7', spo2: '98' } },
        'Two weeks after surgery for a broken hip. Needs early walking and strengthening exercises.',
        { assessment: 'After surgery to fix a right hip fracture', findings: 'Wound healed. Walks only with a frame. May put weight on the leg as tolerated.', allergies: 'None known' }),
      expectedItem(3, 'CB-2611-P8H1', 'Uromi General Hospital', 'routine', 'received', 240,
        { name: 'Chukwudi Obi', age: '34 y', gender: 'Male', contact: '08030000027', community: 'Uromi', vitals: { bpSys: '122', bpDia: '78', hr: '70', temp: '36.6', spo2: '99' } },
        'Six weeks after knee ligament surgery. Needs a structured rehabilitation programme.',
        { assessment: 'After left knee ligament reconstruction', findings: 'Swelling reduced. Cannot fully straighten the knee.', allergies: 'None known' })
    ];
    return { visits, expected };
  }

  function defaultData() {
    if (isPhysioRole()) return physioData();
    const ago = m => new Date(Date.now() - m * 60000).toISOString();
    const stage = (id, dept, m, by, data) => ({ id, dept, at: ago(m), by, data });
    const reg = (n, m, complaint, payer) => stage('S-SD' + n + '01', 'registration', m, 'GOPD Officer', { complaint, payer });
    const visit = (n, m, urgency, patient, stages, extra) => Object.assign({
      id: SEED_IDS[n],
      facility: hub().facility || 'Oredo General Hospital',
      createdAt: ago(m),
      updatedAt: SEED_EPOCH,
      urgency,
      patient,
      referral: null,
      closed: false,
      summary: '',
      stages
    }, extra || {});
    const clinic = 'Ugbegun Primary Health Centre';
    const visits = [
      visit('01', 12, 'urgent',
        { name: 'Tunde Adebayo', age: '45 y', gender: 'Male', community: 'Ugbegun', contact: '08030000013', vitals: { bpSys: '168', bpDia: '104', temp: '36.8', hr: '96', spo2: '97' } },
        [reg('01', 12, 'Severe headache and dizziness for two days', 'cash')]),
      visit('02', 95, 'routine',
        { name: 'Chinedu Okoro', age: '31 y', gender: 'Male', community: 'Irrua', contact: '08030000014', vitals: { bpSys: '118', bpDia: '76', temp: '38.9', hr: '102', spo2: '98' } },
        [reg('02', 95, 'Fever and stomach pain for five days', 'nhis'),
          stage('S-SD0202', 'consultation', 70, 'Dr Bello', {
            diagnosis: 'Suspected typhoid fever',
            notes: 'Tender abdomen and coated tongue. Start treatment while tests are pending.',
            prescriptions: [{ drug: 'Ciprofloxacin', dose: '500 mg', freq: 'Twice daily', days: '7' }, { drug: 'Paracetamol', dose: '1 g', freq: 'Three times daily', days: '3' }],
            labRequests: ['Widal test', 'Full blood count'],
            physio: ''
          })]),
      visit('03', 180, 'routine',
        { name: 'Blessing Eze', age: '52 y', gender: 'Female', community: 'Irrua', contact: '08030000015', vitals: { bpSys: '150', bpDia: '94', hr: '80', spo2: '98' } },
        [reg('03', 180, 'Follow-up for high blood pressure', 'cash'),
          stage('S-SD0302', 'consultation', 160, 'Dr Bello', {
            diagnosis: 'Hypertension, review',
            notes: 'Blood pressure improving on treatment.',
            prescriptions: [{ drug: 'Amlodipine', dose: '5 mg', freq: 'Once daily', days: '30' }],
            labRequests: ['Fasting blood sugar'],
            physio: ''
          }),
          stage('S-SD0303', 'lab', 140, 'Lab Scientist', { results: [{ test: 'Fasting blood sugar', result: '5.4 mmol/L' }] }),
          stage('S-SD0304', 'pharmacy', 120, 'Pharmacist', { items: [{ drug: 'Amlodipine', qty: '30 tablets' }] })]),
      visit('04', 60, 'routine',
        { name: 'Osagie Idahosa', age: '67 y', gender: 'Male', community: 'Ekpoma', contact: '08030000016', vitals: { bpSys: '140', bpDia: '88', hr: '78', spo2: '97' } },
        [reg('04', 60, 'Weakness of the right arm and leg three weeks after a stroke', 'hmo'),
          stage('S-SD0402', 'consultation', 40, 'Dr Bello', {
            diagnosis: 'Post-stroke weakness, right side',
            notes: 'Stable. Needs rehabilitation.',
            prescriptions: [],
            labRequests: [],
            physio: 'Right arm and leg rehabilitation'
          })]),
      visit('05', 1500, 'urgent',
        { name: 'Ruth Imoudu', age: '8 months', gender: 'Female', community: 'Ugbegun', contact: '08030000012', vitals: { temp: '38.8', hr: '158', spo2: '92', rr: '58' } },
        [reg('05', 1500, 'Referred with fast breathing and fever', 'cash'),
          stage('S-SD0502', 'consultation', 1470, 'Dr Bello', {
            diagnosis: 'Pneumonia',
            notes: 'Chest indrawing. Oxygen started.',
            prescriptions: [{ drug: 'Amoxicillin', dose: '125 mg', freq: 'Three times daily', days: '5' }],
            labRequests: [],
            physio: ''
          }),
          stage('S-SD0503', 'pharmacy', 1440, 'Pharmacist', { items: [{ drug: 'Amoxicillin', qty: '1 bottle' }] })],
        {
          referral: { id: '', code: '', clientRef: 'LC-2611-R7H3XM', from: clinic, reason: 'Fast breathing and fever in an 8 month old baby. Possible pneumonia.', care: { assessment: 'Suspected pneumonia', findings: 'Fast breathing, chest indrawing, fever for 2 days.', treatments_given: [{ item: 'Amoxicillin', dose: 'first dose', route: 'oral', at: '09:15' }] } },
          closed: true,
          closedAt: ago(1400),
          summary: 'Diagnosis: Pneumonia.\nTreatment: Amoxicillin 125 mg three times daily for 5 days, oxygen given for 6 hours.\nOutcome: Treated and discharged. Please review the baby at the clinic in 3 days.'
        }),
      visit('06', 200, 'urgent',
        { name: 'Amina Yusuf', age: '6 y', gender: 'Female', community: 'Ugbegun', contact: '08030000011', vitals: { bpSys: '90', bpDia: '60', temp: '39.4', hr: '132', spo2: '96', rr: '34' } },
        [reg('06', 200, 'Referred with severe malaria and repeated vomiting', 'cash'),
          stage('S-SD0602', 'consultation', 185, 'Dr Bello', {
            diagnosis: 'Severe malaria',
            notes: 'Drowsy but responds. Start IV treatment and admit.',
            prescriptions: [{ drug: 'Artesunate injection', dose: '2.4 mg/kg', freq: 'At 0, 12 and 24 hours', days: '1' }],
            labRequests: ['Malaria RDT'],
            physio: ''
          }),
          stage('S-SD0603', 'lab', 170, 'Lab Scientist', { results: [{ test: 'Malaria RDT', result: 'Positive' }] }),
          stage('S-SD0604', 'pharmacy', 160, 'Pharmacist', { items: [{ drug: 'Artesunate injection', qty: '3 vials' }] })],
        {
          referral: { id: '', code: '', clientRef: 'LC-2611-A5K9QD', from: clinic, reason: 'Severe malaria with repeated vomiting. Needs inpatient care and IV treatment.', care: { assessment: 'Severe malaria', findings: 'Fever for 3 days, repeated vomiting, drowsy but responds to voice.', treatments_given: [{ item: 'Artesunate injection', dose: '2.4 mg/kg', route: 'IM', at: '10:40' }] } },
          closed: true,
          closedAt: ago(150),
          summary: 'Diagnosis: Severe malaria.\nInvestigations: Malaria RDT: Positive.\nTreatment: Artesunate injection 2.4 mg/kg at 0, 12 and 24 hours.\nOutcome: Admitted. Admitted to the paediatric ward and responding well to treatment.'
        })
    ];
    const expected = [{
      id: 'seed-grace',
      builtin: true,
      code: 'CB-2611-G4N8',
      clientRef: '',
      status: 'sent',
      urgency: 'urgent',
      reason: 'Severe asthma attack not responding to the inhaler. Needs oxygen and a doctor.',
      patient: { name: 'Grace Ojo', age: '35 y', gender: 'Female', contact: '08030000017', community: 'Ugbegun', vitals: { hr: '118', spo2: '90', rr: '30', temp: '37.2' } },
      care: {
        assessment: 'Acute severe asthma',
        findings: 'Wheezing, speaking in short sentences, using neck muscles to breathe.',
        treatments_given: [{ item: 'Salbutamol inhaler', dose: '4 puffs', route: 'inhaled', at: '13:10' }],
        allergies: 'None known'
      },
      from: clinic,
      arrived: false,
      at: ago(20)
    }];
    return { visits, expected };
  }

  function seedDefaults() {
    const data = defaultData();
    data.visits.forEach(v => {
      if (S.visits[v.id]) return;
      S.visits[v.id] = v;
      if (!S.dirty.includes(v.id)) S.dirty.push(v.id);
      if (!S.cdirty.includes(v.id)) S.cdirty.push(v.id);
    });
    data.expected.forEach(e => { if (!S.expected.some(x => x.id === e.id)) S.expected.unshift(e); });
    saveVisits();
    saveDirty();
    saveCloudMeta();
    store.write(K.expected(), { at: Date.now(), list: S.expected });
    store.write(K.seeded(), seedTag());
    render();
    hubSync();
    cloudSync();
  }

  function outcomeOf(v) {
    const m = /^Outcome: (.+?)\.?$/m.exec(v.summary || '');
    return m ? m[1] : '';
  }

  function visitCard(v) {
    const p = v.patient || {};
    const r = v.referral;
    const unsent = S.cdirty.includes(v.id) || (!!hub().url && S.dirty.includes(v.id));
    const complaint = ((stagesOf(v, 'registration')[0] || {}).data || {}).complaint || '';
    const outcome = v.closed ? outcomeOf(v) : '';
    return '<button type="button" data-open="' + esc(v.id) + '" class="ref-card card w-full text-left p-4 block">' +
      '<div class="flex flex-wrap items-center gap-2 justify-between">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="rc-badge rc-badge-id">' + esc(v.id) + '</span>' +
          (!v.closed && isUrgent(v.urgency) ? pill(URGENCY, 'urgent') : '') +
          statusPill(v) +
          (v.closed ? '<span class="rc-badge rc-badge-neutral"><span class="rc-badge-dot"></span>Closed</span>' : '') +
          (r ? '<span class="rc-badge rc-badge-waiting"><span class="rc-badge-dot"></span>Referred</span>' : '') +
        '</div>' +
        '<span class="text-[11.5px] text-slate-500">' + esc(v.closed ? 'Closed ' + fmt(v.closedAt || v.updatedAt) : fmt(v.createdAt)) + '</span>' +
      '</div>' +
      '<p class="mt-2.5 text-[15px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + '<span class="font-medium text-slate-500 text-[12.5px]"> ' + esc([p.age, p.gender].filter(Boolean).join(' · ')) + '</span></p>' +
      '<p class="mt-1 text-[12.5px] text-slate-600 dark:text-slate-400 line-clamp-2">' + esc(complaint) + '</p>' +
      (outcome ? '<p class="mt-1 text-[12px] font-semibold text-[#1F7A55] dark:text-[#52B788]">Outcome: ' + esc(outcome) + '</p>' : '') +
      (unsent ? '<p class="mt-1.5 text-[11.5px] font-semibold text-amber-600">Not yet synced to your other devices</p>' : '') + '</button>';
  }

  function expectedCard(e) {
    const p = e.patient || {};
    return '<div class="card p-4 space-y-2.5"><div class="flex flex-wrap items-center gap-2">' +
      '<span class="rc-badge rc-badge-id">' + esc(e.code || e.clientRef) + '</span>' +
      (isUrgent(e.urgency) ? pill(URGENCY, 'urgent') : '') +
      (e.arrived ? '<span class="rc-badge rc-badge-ready"><span class="rc-badge-dot"></span>Arrived</span>' : '<span class="rc-badge rc-badge-waiting"><span class="rc-badge-dot"></span>Expected</span>') +
      '</div>' +
      '<p class="text-[15px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + '<span class="font-medium text-slate-500 text-[12.5px]"> ' + esc([p.age, p.gender].filter(Boolean).join(' · ')) + '</span></p>' +
      '<p class="text-[12.5px] text-slate-600 dark:text-slate-400 line-clamp-2">' + esc(e.reason) + '</p>' +
      '<p class="text-[12px] text-slate-500">From <span class="font-semibold">' + esc(e.from) + '</span> · ' + esc(fmt(e.at)) + '</p>' +
      '<div class="pt-1"><button type="button" data-arrive="' + esc(e.id) + '" class="btn-primary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="map-pin" class="w-4 h-4"></i><span>Register arrival</span></button></div></div>';
  }

  function empty(icon, title, text, extra) {
    return '<div class="card p-8 text-center"><div class="w-12 h-12 mx-auto rounded-full bg-[#52B788]/15 text-[#52B788] flex items-center justify-center"><i data-lucide="' + icon + '" class="w-6 h-6"></i></div>' +
      '<p class="mt-3 text-[15px] font-bold text-headingDark dark:text-white">' + esc(title) + '</p>' +
      '<p class="mt-1 text-[12.5px] text-slate-500 max-w-[420px] mx-auto">' + esc(text) + '</p>' + (extra || '') + '</div>';
  }

  const urgentFirst = (a, b) => (isUrgent(b.urgency) ? 1 : 0) - (isUrgent(a.urgency) ? 1 : 0);
  const byPriority = (a, b) => urgentFirst(a, b) || (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
  const byArrival = (a, b) => urgentFirst(a, b) || (Date.parse(a.at) || 0) - (Date.parse(b.at) || 0);
  const byClosed = (a, b) => (Date.parse(b.closedAt) || Date.parse(b.updatedAt) || 0) - (Date.parse(a.closedAt) || Date.parse(a.updatedAt) || 0);

  const deskQueue = (v, d) => (d === 'registration' ? !stagesOf(v, 'registration').length || !waiting(v).length : waiting(v).includes(d));

  function render() {
    const all = Object.values(S.visits).filter(x => !(isPhysioRole() && LEGACY_SEED_IDS.includes(x.id)));
    const active = all.filter(v => !v.closed).sort(byPriority);
    const closed = all.filter(v => v.closed).sort(byClosed);
    const arriving = S.expected.filter(e => !all.some(v => sameRef(v, e))).sort(byArrival);
    const waitingCount = d => active.filter(v => deskQueue(v, d)).length;
    const filters = getAvailableDeptFilters();
    const isRestricted = filters.length === 1;
    if (isRestricted && S.dept === 'all') {
      S.dept = filters[0][0];
    }

    const alertDesk = S.dept === 'all' || S.dept === 'registration';
    const deskActive = S.dept === 'all' ? active.length : waitingCount(S.dept);
    $('#tabs').innerHTML = VIEWS.map(t => {
      const n = t[0] === 'expected' ? arriving.length : t[0] === 'active' ? deskActive : closed.length;
      const isActive = S.tab === t[0];
      const badgeClass = t[0] === 'expected' && alertDesk ? ' alert' : (isActive ? ' active-badge' : '');
      const countHtml = n > 0 ? '<span class="tab-count' + badgeClass + '">' + n + '</span>' : '';
      return '<div class="tab-wrap"><button type="button" class="tab-btn' + (isActive ? ' active' : '') + '" data-tab="' + t[0] + '" role="tab"><span>' + esc(t[1]) + '</span></button>' + countHtml + '</div>';
    }).join('');

    const bar = $('#dept-bar');
    if (bar) {
      bar.classList.toggle('hidden', S.tab !== 'active');
      bar.innerHTML = '<label for="dept-select" class="text-[12.5px] font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">Your Desk View</label>' +
        (isRestricted
          ? '<span class="text-[13px] font-bold text-[#52B788] px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-300 dark:border-emerald-500/40 inline-flex items-center gap-2"><i data-lucide="shield-check" class="w-4 h-4"></i><span>' + esc(filters[0][1]) + '</span></span>'
          : '<select id="dept-select" class="input-field w-full sm:w-auto min-w-[160px] sm:min-w-[200px] !py-2 !px-3.5 text-[13px] font-semibold cursor-pointer">' +
            filters.map(d => {
              const count = d[0] === 'all' ? active.length : waitingCount(d[0]);
              return '<option value="' + esc(d[0]) + '"' + (S.dept === d[0] ? ' selected' : '') + '>' + esc(d[1]) + ' (' + count + ')</option>';
            }).join('') +
            '</select>');
    }

    const panel = $('#panel');
    const hint = '<p class="text-[12.5px] text-slate-600 dark:text-slate-400">' + esc(HINTS[S.tab]) + '</p>';
    if (S.tab === 'expected') {
      panel.innerHTML = hint + (arriving.length
        ? arriving.map(expectedCard).join('')
        : empty('inbox', 'No patients expected', 'Referrals sent to your facility appear here once this device has been online. You can also register a patient directly with New visit.'));
    } else {
      const base = S.tab === 'closed' ? closed : active;
      const list = S.tab === 'active' && S.dept !== 'all' ? base.filter(v => deskQueue(v, S.dept)) : base;
      const none = S.tab === 'closed'
        ? empty('archive', 'No closed visits yet', 'Visits appear here after you close them.')
        : S.dept === 'all'
          ? empty('clipboard-list', 'Nobody is in the hospital', 'Use New visit when a patient arrives.')
          : empty('clipboard-list', 'Nobody is waiting at this desk', 'Patients appear here when it is their turn.');
      panel.innerHTML = hint + (list.length ? list.map(visitCard).join('') : none);
    }
    icons();
  }

  function bind() {
    document.addEventListener('click', ev => {
      const t = ev.target;
      const tab = t.closest('[data-tab]');
      if (tab) { S.tab = tab.dataset.tab; render(); return; }
      const dp = t.closest('[data-dept]');
      if (dp) { S.dept = dp.dataset.dept; render(); return; }
      const open = t.closest('[data-open]');
      if (open) { openVisit(open.dataset.open); return; }
      const arrive = t.closest('[data-arrive]');
      if (arrive) { registerArrival(arrive.dataset.arrive); return; }
      if (t.closest('#new-visit-btn')) { newVisitForm(); return; }
      if (t.closest('[data-close]')) { closeModal(); return; }
    });
    document.addEventListener('change', ev => {
      if (ev.target && ev.target.id === 'dept-select') {
        S.dept = ev.target.value;
        render();
      }
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && !$('#modal-root').classList.contains('hidden')) closeModal();
    });
    window.addEventListener('online', () => { hubSync(); cloudSync(); loadExpected(); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { hubSync(); cloudSync(); loadExpected(); } });
  }

  async function boot() {
    if (typeof RC === 'undefined' || !RC.requireSession()) return;
    loadLocal();
    S.dept = defaultDeptForRole();
    bind();
    setHubState(hub().url ? 'down' : 'off');
    render();
    startPolling();
    hubSync();
    loadExpected();
    await cloudSync();
    if (SEED_DEFAULT_PATIENTS && store.read(K.seeded(), 0) !== seedTag()) seedDefaults();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();