(function () {
  'use strict';

  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.9/dist/umd/supabase.js';
  const FAC = 'id,name,facility_type,state,lga,address,phone,services,active,verified';

  const TYPES = {
    phc: 'Primary health centre',
    clinic: 'Clinic',
    general_hospital: 'General hospital',
    teaching_hospital: 'Teaching hospital',
    private_hospital: 'Private hospital',
    other: 'Health post / outreach / other'
  };
  const ROLES = { provider: 'Provider', referral_coordinator: 'Referral coordinator', facility_admin: 'Facility admin' };
  const STATUS = {
    sent: ['Sent', 'pill-info'],
    received: ['Received', 'pill-warning'],
    accepted: ['Accepted', 'pill-success'],
    rejected: ['Rejected', 'pill-reject'],
    redirected: ['Redirected', 'pill-warning'],
    completed: ['Completed', 'pill-success'],
    cancelled: ['Cancelled', 'pill-neutral']
  };
  const URGENCY = { routine: ['Routine', 'pill-neutral'], urgent: ['Urgent', 'pill-warning'], emergency: ['Emergency', 'pill-critical'] };
  const OUTCOMES = {
    treated_and_discharged: 'Treated and discharged',
    admitted: 'Admitted',
    referred_onward: 'Referred onward',
    patient_did_not_arrive: 'Patient did not arrive',
    other: 'Other'
  };
  const CONDITIONS = { improving: 'Improving', stable: 'Stable', deteriorating: 'Deteriorating', critical: 'Critical' };
  const EVENT_LABELS = {
    created: 'Referral sent',
    received: 'Receipt acknowledged',
    accepted: 'Accepted',
    rejected: 'Rejected',
    redirected: 'Redirected to another facility',
    completed: 'Completed with feedback',
    cancelled: 'Cancelled by sender',
    care_updated: 'Clinical summary updated',
    patient_arrived: 'Patient arrived at facility'
  };
  const ERRORS = {
    not_authenticated: 'Please sign in again.',
    forbidden: 'You do not have permission to do that.',
    same_facility: 'The receiving facility must be different from yours.',
    receiver_unavailable: 'That facility is not available to receive referrals.',
    invalid_urgency: 'Choose a valid urgency.',
    care_summary_invalid: 'Add the assessment: your working diagnosis or impression.',
    payload_too_large: 'The form is too long. Shorten the notes and try again.',
    patient_name_required: 'Enter the patient name.',
    not_found: 'That referral could not be found.',
    invalid_state: 'This referral has already moved on. Refresh and check its status.',
    reason_required: 'Please give a short reason.',
    invalid_redirect: 'Choose a different facility. It cannot be the sender or one that already handled this referral.',
    invalid_decision: 'Choose a valid decision.',
    invalid_outcome: 'Choose the outcome.',
    feedback_required: 'Add a short feedback note for the referring facility.',
    facility_limit_reached: 'You can register up to 3 facilities.',
    user_not_found: 'No account uses that email. Ask the person to sign up first.',
    invalid_role: 'Choose a valid role.',
    last_admin: 'A facility must keep at least one admin.',
    duplicate: 'A facility with that name already exists in that LGA. Ask its admin to add your email instead.',
    setup: 'Referral setup is incomplete. Run the referral SQL in Supabase first.'
  };

  const S = {
    sb: null,
    uid: '',
    memberships: [],
    facilities: new Map(),
    referrals: [],
    teams: {},
    tab: 'inbox',
    filter: 'open',
    seen: null,
    channel: null,
    timer: 0,
    q: ''
  };

  const HUB_KEY = 'ruralcare_hub';
  const CLIENT_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

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

  const who = () => { try { return String(RC.getCurrentUser() || 'anon').toLowerCase(); } catch (e) { return 'anon'; } };
  const cacheKey = () => 'ruralcare_ref_cache:' + who();
  const outboxKey = () => 'ruralcare_ref_outbox:' + who();
  const outbox = () => store.read(outboxKey(), []);
  const saveOutbox = list => store.write(outboxKey(), list);
  const roleAt = fid => { const m = S.memberships.find(x => x.facility_id === fid); return m ? m.member_role : ''; };
  const canDecide = fid => ['referral_coordinator', 'facility_admin'].includes(roleAt(fid));

  function newClientRef() {
    const bytes = new Uint8Array(6);
    try { crypto.getRandomValues(bytes); } catch (e) { for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256); }
    const d = new Date();
    const stamp = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
    return 'LC-' + stamp + '-' + Array.from(bytes).map(b => CLIENT_ALPHABET[b % 32]).join('');
  }

  function saveCache() {
    store.write(cacheKey(), { at: Date.now(), memberships: S.memberships, facilities: Array.from(S.facilities.values()) });
  }

  function loadCache() {
    const c = store.read(cacheKey(), null);
    if (!c) return false;
    S.memberships = c.memberships || [];
    S.facilities = new Map();
    (c.facilities || []).forEach(f => S.facilities.set(f.id, f));
    S.memberships.forEach(m => { if (m.facility) S.facilities.set(m.facility_id, m.facility); });
    return S.memberships.length > 0;
  }

  function isTransient(e) {
    if (!e) return false;
    const m = String(e.message || '');
    return !navigator.onLine || e.name === 'TypeError' || e.code === 'PGRST301' || m === 'not_authenticated' ||
      /failed to fetch|network|timeout|load failed|jwt/i.test(m) || (Number(e.status) >= 500);
  }

  let flushing = false;

  async function flushOutbox() {
    if (flushing || !S.sb || !S.uid || !navigator.onLine) return 0;
    const list = outbox();
    if (!list.length) return 0;
    flushing = true;
    const done = new Set();
    const failed = {};
    try {
      for (const item of list) {
        if (item.failed) continue;
        try {
          rpcOrThrow(await S.sb.rpc('create_referral', {
            p_from: item.from,
            p_to: item.to,
            p_urgency: item.urgency,
            p_required_service: item.service || null,
            p_reason: item.reason,
            p_patient: item.patient,
            p_care: item.care,
            p_client_ref: item.cref
          }));
          done.add(item.cref);
        } catch (e) {
          if (isTransient(e)) break;
          failed[item.cref] = errText(e);
        }
      }
      saveOutbox(outbox().filter(x => !done.has(x.cref)).map(x => (failed[x.cref] ? Object.assign({}, x, { failed: failed[x.cref] }) : x)));
    } finally {
      flushing = false;
    }
    if (done.size) toast(done.size === 1 ? 'Saved referral sent' : done.size + ' saved referrals sent', 'send');
    return done.size;
  }

  function modelFromPending(item) {
    return {
      ref: item.cref,
      date: item.at,
      status: '',
      urgency: item.urgency,
      from: facModel(S.facilities.get(item.from) || fallbackFrom()),
      to: facModel(S.facilities.get(item.to)),
      patient: item.patient,
      reason: item.reason,
      service: item.service,
      care: item.care,
      clinician: (item.care && item.care.clinician) || {},
      pending: true
    };
  }

  function pendingHtml() {
    const list = outbox();
    if (!list.length) return '';
    return list.map(x => {
      const p = x.patient || {};
      const tag = x.failed
        ? '<span class="pill pill-critical"><span class="pill-dot"></span>Not sent</span>'
        : '<span class="pill pill-warning"><span class="pill-dot offline-pulse"></span>Waiting to upload</span>';
      return '<div class="card p-4 space-y-2">' +
        '<div class="flex flex-wrap items-center gap-2 justify-between"><div class="flex items-center gap-2 flex-wrap"><span class="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">' + esc(x.cref) + '</span>' + pill(URGENCY, x.urgency) + tag + '</div>' +
        '<span class="text-[11.5px] text-slate-500">' + esc(fmt(x.at)) + '</span></div>' +
        '<p class="text-[15px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + '</p>' +
        '<p class="text-[12.5px] text-slate-600 dark:text-slate-400 line-clamp-2">' + esc(x.reason) + '</p>' +
        '<p class="text-[12px] text-slate-500 flex items-center gap-1.5 flex-wrap"><span class="font-semibold">' + esc(facName(x.from)) + '</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i><span class="font-semibold">' + esc(facName(x.to)) + '</span></p>' +
        (x.failed ? '<p class="text-[12px] font-semibold text-[#DC2626]">' + esc(x.failed) + '</p>' : '<p class="text-[12px] text-slate-500">Saved on this device. It sends automatically when you are online.</p>') +
        '<div class="flex flex-wrap gap-2 pt-1"><button type="button" data-pend="print" data-cref="' + esc(x.cref) + '" class="btn-secondary px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5"><i data-lucide="printer" class="w-3.5 h-3.5"></i><span>Print form</span></button>' +
        (x.failed ? '<button type="button" data-pend="retry" data-cref="' + esc(x.cref) + '" class="btn-secondary px-3 py-1.5 text-[12px]">Try again</button>' : '') +
        '<button type="button" data-pend="del" data-cref="' + esc(x.cref) + '" class="text-[12px] font-semibold text-[#DC2626] px-2 py-1">Remove</button></div></div>';
    }).join('');
  }

  function pendingAction(kind, cref) {
    const item = outbox().find(x => x.cref === cref);
    if (!item) return;
    if (kind === 'print') { printReferral(modelFromPending(item)); return; }
    if (kind === 'retry') {
      saveOutbox(outbox().map(x => (x.cref === cref ? Object.assign({}, x, { failed: '' }) : x)));
      render();
      refresh(true);
      return;
    }
    ask({
      title: 'Remove saved referral',
      intro: 'This referral has not been sent. Remove it from this device?',
      fields: [],
      confirm: 'Remove',
      submit: async () => {
        saveOutbox(outbox().filter(x => x.cref !== cref));
        render();
      }
    });
  }

  function queueReferral(form, d, cref) {
    const item = { cref, from: d.from, to: d.to, urgency: d.urgency, service: d.service, reason: d.reason, patient: d.patient, care: d.care, at: new Date().toISOString() };
    const list = outbox().filter(x => x.cref !== cref);
    list.push(item);
    if (!saveOutbox(list)) return formFail(form, 'This device has no space left to save the referral. Print the form instead.');
    closeModal();
    toast('Saved on this device. It sends when you are online.', 'cloud-off');
    S.tab = 'sent';
    S.filter = 'open';
    render();
    printReferral(modelFromPending(item));
  }

  async function hubSummary(r) {
    const h = store.read(HUB_KEY, null);
    if (!h || !h.url) return '';
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 3000);
    try {
      const codes = [r.ref_code, r.client_ref].filter(Boolean).map(encodeURIComponent).join(',');
      const res = await fetch(String(h.url).replace(/\/+$/, '') + '/api/visits?ref=' + codes, {
        headers: h.token ? { Authorization: 'Bearer ' + h.token } : {},
        signal: ctl.signal
      });
      if (!res.ok) return '';
      const body = await res.json();
      const v = (body.visits || []).find(x => x.summary);
      return v ? String(v.summary) : '';
    } catch (e) {
      return '';
    } finally {
      clearTimeout(timer);
    }
  }

  async function connect() {
    if (S.sb && S.uid) return true;
    try {
      await loadLib();
      S.sb = RC.sbClient();
      if (!S.sb) throw new Error('lib');
      const got = await S.sb.auth.getSession();
      S.uid = got && got.data && got.data.session ? got.data.session.user.id : '';
      if (!S.uid) {
        notice('warn', 'You are not signed in to the online service. You can still prepare a referral. It is saved on this device and sent once you sign in online.');
        return false;
      }
      return true;
    } catch (e) {
      notice('warn', 'Could not reach the online service. You can still prepare a referral. It is saved on this device and sent when you are online.');
      return false;
    }
  }

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icons = () => { try { if (window.lucide) window.lucide.createIcons(); } catch (e) {} };
  const fmt = v => (v ? new Date(v).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' }) : '');
  const fmtDay = v => (v ? new Date(v).toLocaleDateString('en-NG', { dateStyle: 'long' }) : '');
  const sess = () => { try { return RC.getSession() || {}; } catch (e) { return {}; } };
  const toast = (m, i) => { try { RC.toast(m, i); } catch (e) {} };
  const myIds = () => new Set(S.memberships.map(m => m.facility_id));
  const facName = id => { const f = S.facilities.get(id); return f ? f.name : 'Another facility'; };
  const pill = (map, key) => {
    const m = map[key] || [key, 'pill-neutral'];
    return '<span class="pill ' + m[1] + '"><span class="pill-dot"></span>' + esc(m[0]) + '</span>';
  };

  function errText(e) {
    if (!e) return 'Something went wrong.';
    const m = String(e.message || '');
    if (ERRORS[m]) return ERRORS[m];
    if (e.code === '23505') return ERRORS.duplicate;
    if (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST202') return ERRORS.setup;
    if (!navigator.onLine) return 'You are offline. Try again when you have a connection.';
    return 'Could not complete that. ' + m;
  }

  function notice(kind, html) {
    const el = $('#notice');
    const tone = kind === 'error'
      ? 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950/20 dark:border-red-500/40 dark:text-red-200'
      : 'border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/20 dark:border-amber-500/40 dark:text-amber-200';
    el.className = 'rounded-xl border p-3.5 text-[13px] font-semibold flex items-start gap-2.5 ' + tone;
    el.innerHTML = '<i data-lucide="alert-triangle" class="w-4 h-4 mt-0.5 shrink-0"></i><div>' + html + '</div>';
    icons();
  }

  function clearNotice() {
    const el = $('#notice');
    el.className = 'hidden';
    el.innerHTML = '';
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

  async function refresh(quiet) {
    if (!S.sb || !S.uid) { render(); return; }
    try {
      await flushOutbox();
      const sb = S.sb;
      const res = await Promise.all([
        sb.from('facility_members').select('facility_id,member_role,facilities(' + FAC + ')').eq('user_id', S.uid),
        sb.from('facilities').select(FAC).eq('active', true).order('name').limit(1000),
        sb.from('referrals').select('*').order('created_at', { ascending: false }).limit(300)
      ]);
      res.forEach(x => { if (x.error) throw x.error; });
      S.memberships = (res[0].data || []).filter(x => x.facilities).map(x => ({ facility_id: x.facility_id, member_role: x.member_role, facility: x.facilities }));
      S.facilities = new Map();
      (res[1].data || []).forEach(f => S.facilities.set(f.id, f));
      S.memberships.forEach(m => S.facilities.set(m.facility_id, m.facility));
      S.referrals = res[2].data || [];
      saveCache();
      announceIncoming(quiet);
      clearNotice();
    } catch (e) {
      notice('error', esc(errText(e)));
    }
    render();
  }

  function announceIncoming(quiet) {
    const ids = myIds();
    const incoming = S.referrals.filter(r => ids.has(r.to_facility_id) && (r.status === 'sent' || r.status === 'redirected'));
    const keys = new Set(incoming.map(r => r.id + ':' + r.status));
    if (S.seen && quiet) {
      const fresh = incoming.filter(r => !S.seen.has(r.id + ':' + r.status));
      if (fresh.length) toast(fresh.length === 1 ? 'New referral received' : fresh.length + ' new referrals received', 'inbox');
    }
    S.seen = keys;
  }

  function inboxList() {
    const ids = myIds();
    return S.referrals.filter(r => ids.has(r.to_facility_id) || (r.previous_facility_ids || []).some(x => ids.has(x)));
  }

  function sentList() {
    const ids = myIds();
    return S.referrals.filter(r => ids.has(r.from_facility_id));
  }

  const isOpen = r => !['completed', 'rejected', 'cancelled'].includes(r.status);

  function filtered(list) {
    const q = S.q.trim().toLowerCase();
    if (q) return list.filter(r => [r.ref_code, r.client_ref, (r.patient || {}).name].join(' ').toLowerCase().includes(q));
    if (S.filter === 'open') return list.filter(isOpen);
    if (S.filter === 'closed') return list.filter(r => !isOpen(r));
    return list;
  }

  function refCard(r) {
    const p = r.patient || {};
    const awayFromMe = S.tab === 'inbox' && !myIds().has(r.to_facility_id);
    const meta = [p.age, p.gender].filter(Boolean).join(' \u00B7 ');
    return '<button type="button" data-open="' + esc(r.id) + '" class="ref-card card w-full text-left p-4 block">' +
      '<div class="flex flex-wrap items-center gap-2 justify-between">' +
        '<div class="flex items-center gap-2 flex-wrap"><span class="font-mono text-[12px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">' + esc(r.ref_code) + '</span>' + pill(URGENCY, r.urgency) + pill(STATUS, r.status) + '</div>' +
        '<span class="text-[11.5px] text-slate-500">' + esc(fmt(r.created_at)) + '</span>' +
      '</div>' +
      '<p class="mt-2 text-[15px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + (meta ? '<span class="font-medium text-slate-500 text-[12.5px]"> ' + esc(meta) + '</span>' : '') + '</p>' +
      '<p class="mt-1 text-[12.5px] text-slate-600 dark:text-slate-400 line-clamp-2">' + esc(r.reason) + '</p>' +
      '<p class="mt-2 text-[12px] text-slate-500 flex items-center gap-1.5 flex-wrap"><span class="font-semibold">' + esc(facName(r.from_facility_id)) + '</span><i data-lucide="arrow-right" class="w-3.5 h-3.5"></i><span class="font-semibold">' + esc(facName(r.to_facility_id)) + '</span></p>' +
      (awayFromMe ? '<p class="mt-1.5 text-[11.5px] font-semibold text-amber-600">You redirected this referral to another facility.</p>' : '') +
    '</button>';
  }

  function emptyState(icon, title, text) {
    return '<div class="card p-8 text-center"><div class="w-12 h-12 mx-auto rounded-full bg-[#52B788]/15 text-[#52B788] flex items-center justify-center"><i data-lucide="' + icon + '" class="w-6 h-6"></i></div>' +
      '<p class="mt-3 text-[15px] font-bold text-headingDark dark:text-white">' + esc(title) + '</p>' +
      '<p class="mt-1 text-[12.5px] text-slate-500 max-w-[420px] mx-auto">' + esc(text) + '</p></div>';
  }

  function render() {
    $$('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === S.tab));
    $$('#filter-bar .chip').forEach(b => b.classList.toggle('active', b.dataset.filter === S.filter));
    $('#filter-bar').classList.toggle('hidden', S.tab === 'facility');
    const ids = myIds();
    const inbox = inboxList();
    const sent = sentList();
    const need = inbox.filter(r => ids.has(r.to_facility_id) && (r.status === 'sent' || r.status === 'redirected')).length;
    const ci = $('#count-inbox');
    ci.textContent = need || inbox.filter(isOpen).length;
    ci.classList.toggle('alert', need > 0);
    $('#count-sent').textContent = sent.filter(isOpen).length + outbox().length;

    const panel = $('#panel');
    if (S.tab === 'facility') {
      panel.innerHTML = facilityPanel();
    } else if (!S.uid) {
      panel.innerHTML = emptyState('log-in', 'Sign in online to use referrals', 'You can still start a new referral and print the form to send with the patient.');
    } else if (!S.memberships.length) {
      panel.innerHTML = emptyState('building-2', 'Set up your facility first', 'Open the My facility tab to register your facility or ask its admin to add your email.');
    } else {
      const list = filtered(S.tab === 'inbox' ? inbox : sent);
      panel.innerHTML = list.length
        ? list.map(refCard).join('')
        : emptyState(S.tab === 'inbox' ? 'inbox' : 'send', S.tab === 'inbox' ? 'No referrals to show' : 'Nothing sent yet', S.tab === 'inbox' ? 'Referrals sent to your facility will appear here.' : 'Use New referral to send a patient to another facility.');
    }
    if (S.tab === 'sent') {
      const pend = pendingHtml();
      if (pend) panel.innerHTML = pend + panel.innerHTML;
    }
    icons();
  }

  function facilityPanel() {
    if (!S.uid) return emptyState('log-in', 'Sign in online first', 'Facility setup needs an online account session.');
    if (!S.memberships.length) {
      return '<div class="card p-6 space-y-3"><p class="text-[16px] font-bold text-headingDark dark:text-white">You are not linked to a facility yet</p>' +
        '<p class="text-[13px] text-slate-500">Register your facility to send and receive referrals. If it is already registered, ask its admin to add your email address.</p>' +
        '<button type="button" data-act="new-facility" class="btn-primary px-4 py-2.5 text-[13px] inline-flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Register my facility</span></button></div>';
    }
    const cards = S.memberships.map(facCard).join('');
    const more = S.memberships.length < 3
      ? '<button type="button" data-act="new-facility" class="btn-secondary px-4 py-2.5 text-[13px] inline-flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i><span>Register another facility</span></button>'
      : '';
    return cards + more;
  }

  function facCard(m) {
    const f = m.facility;
    const admin = m.member_role === 'facility_admin';
    const team = S.teams[f.id];
    if (!team) loadTeam(f.id);
    const services = (f.services || []).map(s => '<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[11.5px] font-semibold">' + esc(s) + '</span>').join(' ') || '<span class="text-[12.5px] text-slate-500">No services listed yet.</span>';
    const rows = team === undefined
      ? '<p class="text-[12.5px] text-slate-500">Loading team...</p>'
      : (team.length ? team.map(t => teamRow(f.id, t, admin)).join('') : '<p class="text-[12.5px] text-slate-500">No team members found.</p>');
    const addForm = admin
      ? '<div class="flex flex-col sm:flex-row gap-2 pt-1"><input type="email" data-member-email="' + esc(f.id) + '" class="input-field" placeholder="Staff email (must already have an account)">' +
        '<select data-member-role="' + esc(f.id) + '" class="input-field sm:max-w-[200px]">' + Object.keys(ROLES).map(k => '<option value="' + k + '">' + esc(ROLES[k]) + '</option>').join('') + '</select>' +
        '<button type="button" data-act="add-member" data-fid="' + esc(f.id) + '" class="btn-primary px-4 py-2.5 text-[13px] shrink-0">Add</button></div>'
      : '';
    return '<div class="card p-5 sm:p-6 space-y-4">' +
      '<div class="flex flex-wrap items-start justify-between gap-3"><div>' +
        '<p class="text-[17px] font-bold text-headingDark dark:text-white">' + esc(f.name) + '</p>' +
        '<p class="text-[12.5px] text-slate-500 mt-0.5">' + esc(TYPES[f.facility_type] || f.facility_type) + ' \u00B7 ' + esc(f.lga) + ', ' + esc(f.state) + '</p></div>' +
        '<div class="flex items-center gap-2 flex-wrap">' + (f.verified ? '<span class="pill pill-success"><span class="pill-dot"></span>Verified</span>' : '<span class="pill pill-neutral"><span class="pill-dot"></span>Not verified</span>') +
        '<span class="pill pill-info"><span class="pill-dot"></span>' + esc(ROLES[m.member_role]) + '</span>' +
        (admin ? '<button type="button" data-act="edit-facility" data-fid="' + esc(f.id) + '" class="btn-secondary px-3 py-1.5 text-[12px]">Edit details</button>' : '') + '</div></div>' +
      '<dl class="dl-grid"><div><dt>Address / community</dt><dd>' + esc(f.address || '\u2014') + '</dd></div><div><dt>Phone</dt><dd>' + esc(f.phone || '\u2014') + '</dd></div></dl>' +
      '<div><p class="sec-title mb-2">Services offered</p><div class="flex flex-wrap gap-1.5">' + services + '</div></div>' +
      '<div><p class="sec-title mb-2">Team</p><div class="space-y-2">' + rows + '</div></div>' + addForm +
    '</div>';
  }

  function teamRow(fid, t, admin) {
    const who = t.name || t.email || 'Team member';
    const sub = t.name && t.email ? '<p class="text-[11.5px] text-slate-500">' + esc(t.email) + '</p>' : '';
    const controls = admin
      ? '<div class="flex items-center gap-2"><select data-role-change data-fid="' + esc(fid) + '" data-email="' + esc(t.email || '') + '" class="input-field !py-1.5 !text-[12px] sm:max-w-[190px]">' +
        Object.keys(ROLES).map(k => '<option value="' + k + '"' + (k === t.member_role ? ' selected' : '') + '>' + esc(ROLES[k]) + '</option>').join('') + '</select>' +
        '<button type="button" data-act="rm-member" data-fid="' + esc(fid) + '" data-uid="' + esc(t.user_id) + '" data-name="' + esc(who) + '" class="text-[12px] font-semibold text-[#DC2626] px-2 py-1">Remove</button></div>'
      : '<span class="pill pill-neutral"><span class="pill-dot"></span>' + esc(ROLES[t.member_role] || t.member_role) + '</span>';
    return '<div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-[#E5E7EB] dark:border-white/10"><div class="min-w-0"><p class="text-[13px] font-semibold truncate">' + esc(who) + '</p>' + sub + '</div>' + controls + '</div>';
  }

  async function loadTeam(fid) {
    if (!S.sb) return;
    S.teams[fid] = undefined;
    const r = await S.sb.rpc('facility_team', { p_facility: fid });
    S.teams[fid] = r.error ? [] : (r.data || []);
    if (S.tab === 'facility') render();
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

  function pickerHtml() {
    return '<div data-picker class="space-y-2"><input type="search" data-picker-q class="input-field" placeholder="Search by name, LGA, state or service" autocomplete="off">' +
      '<div data-picker-list class="max-h-[230px] overflow-y-auto rounded-xl border border-[#E5E7EB] dark:border-white/10 divide-y divide-[#E5E7EB] dark:divide-white/10"></div>' +
      '<input type="hidden" data-picker-value></div>';
  }

  function initPicker(root, opts) {
    const q = $('[data-picker-q]', root);
    const list = $('[data-picker-list]', root);
    const val = $('[data-picker-value]', root);
    const home = () => (opts.home ? opts.home() : null);
    const draw = () => {
      const term = q.value.trim().toLowerCase();
      const skip = opts.exclude ? opts.exclude() : new Set();
      const h = home();
      let rows = Array.from(S.facilities.values()).filter(f => f.active !== false && !skip.has(f.id));
      if (term) rows = rows.filter(f => [f.name, f.lga, f.state, (f.services || []).join(' '), TYPES[f.facility_type]].join(' ').toLowerCase().includes(term));
      const want = opts.service ? opts.service() : '';
      const offers = f => !!want && (f.services || []).some(s => { const x = String(s).toLowerCase(); return x.includes(want) || want.includes(x); });
      const rank = f => (h && f.lga === h.lga && f.state === h.state ? 0 : h && f.state === h.state ? 1 : 2);
      rows.sort((a, b) => (offers(b) ? 1 : 0) - (offers(a) ? 1 : 0) || rank(a) - rank(b) || (b.verified ? 1 : 0) - (a.verified ? 1 : 0) || a.name.localeCompare(b.name));
      rows = rows.slice(0, 40);
      if (val.value && !rows.some(f => f.id === val.value)) val.value = '';
      list.innerHTML = rows.length
        ? rows.map(f => '<label class="flex items-start gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5"><input type="radio" name="picked_' + esc(root.dataset.pid || 'x') + '" value="' + esc(f.id) + '"' + (val.value === f.id ? ' checked' : '') + ' class="mt-1 accent-[#52B788]">' +
          '<span class="min-w-0"><span class="text-[13.5px] font-semibold">' + esc(f.name) + '</span>' + (f.verified ? ' <span class="pill pill-success !py-0 !px-1.5">Verified</span>' : ' <span class="pill pill-neutral !py-0 !px-1.5">Not verified</span>') + (offers(f) ? ' <span class="pill pill-info !py-0 !px-1.5">Offers this service</span>' : '') +
          '<span class="block text-[12px] text-slate-500">' + esc(TYPES[f.facility_type] || '') + ' \u00B7 ' + esc(f.lga) + ', ' + esc(f.state) + '</span>' +
          ((f.services || []).length ? '<span class="block text-[11.5px] text-slate-500 mt-0.5">' + esc(f.services.slice(0, 6).join(', ')) + '</span>' : '') + '</span></label>').join('')
        : '<p class="p-3 text-[12.5px] text-slate-500">' + (S.facilities.size ? 'No matching facility.' : 'No facilities loaded. Connect to the internet to see the directory.') + '</p>';
    };
    root.dataset.pid = String(Math.random()).slice(2, 8);
    q.addEventListener('input', draw);
    list.addEventListener('change', ev => {
      if (ev.target && ev.target.type === 'radio') val.value = ev.target.value;
    });
    draw();
    return { redraw: draw };
  }

  function fieldHtml(f) {
    let ctl;
    if (f.type === 'textarea') ctl = '<textarea name="' + f.name + '" rows="' + (f.rows || 3) + '" class="input-field resize-y" placeholder="' + esc(f.placeholder || '') + '">' + esc(f.value || '') + '</textarea>';
    else if (f.type === 'select') ctl = '<select name="' + f.name + '" class="input-field">' + f.options.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === f.value ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
    else if (f.type === 'picker') ctl = pickerHtml();
    else ctl = '<input name="' + f.name + '" type="' + (f.type || 'text') + '" class="input-field" value="' + esc(f.value || '') + '" placeholder="' + esc(f.placeholder || '') + '" autocomplete="off">';
    return '<div><label class="lbl">' + esc(f.label) + (f.required ? ' *' : '') + '</label>' + ctl + (f.hint ? '<p class="text-[11.5px] text-slate-500 mt-1">' + esc(f.hint) + '</p>' : '') + '</div>';
  }

  function ask(cfg) {
    const card = modal('<form id="ask-form" class="p-5 sm:p-6 space-y-4" novalidate><h3 class="text-[17px] font-bold text-headingDark dark:text-white">' + esc(cfg.title) + '</h3>' +
      (cfg.intro ? '<p class="text-[13px] text-slate-500">' + esc(cfg.intro) + '</p>' : '') + cfg.fields.map(fieldHtml).join('') +
      '<p id="ask-err" class="hidden text-[12.5px] font-semibold text-[#DC2626]"></p>' +
      '<div class="flex gap-2 justify-end pt-1"><button type="button" data-cancel class="btn-secondary px-4 py-2.5 text-[13px]">Cancel</button>' +
      '<button type="submit" class="btn-primary px-4 py-2.5 text-[13px]">' + esc(cfg.confirm || 'Save') + '</button></div></form>');
    const form = $('#ask-form', card);
    const pk = $('[data-picker]', form);
    if (pk) initPicker(pk, cfg.picker || {});
    $('[data-cancel]', form).addEventListener('click', () => { closeModal(); if (cfg.back) cfg.back(); });
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const err = $('#ask-err', form);
      const vals = {};
      for (const f of cfg.fields) {
        if (f.type === 'picker') vals[f.name] = $('[data-picker-value]', form).value;
        else { const el = form.elements[f.name]; vals[f.name] = el ? String(el.value || '').trim() : ''; }
        if (f.required && !vals[f.name]) { err.textContent = f.requiredMsg || ('Please fill in: ' + f.label); err.classList.remove('hidden'); return; }
        if (f.min && vals[f.name].length < f.min) { err.textContent = 'Please add a little more detail: ' + f.label; err.classList.remove('hidden'); return; }
      }
      const btn = $('button[type=submit]', form);
      btn.disabled = true;
      try {
        await cfg.submit(vals);
        closeModal();
      } catch (e) {
        err.textContent = errText(e);
        err.classList.remove('hidden');
        btn.disabled = false;
      }
    });
    return form;
  }

  function rpcOrThrow(r) {
    if (r && r.error) throw r.error;
    return r ? r.data : null;
  }

  function servicesList(text) {
    const seen = new Set();
    return String(text || '').split(',').map(s => s.trim().toLowerCase()).filter(s => s && !seen.has(s) && seen.add(s)).slice(0, 40);
  }

  function facilityFields(f) {
    const s = sess();
    return [
      { name: 'name', label: 'Facility name', required: true, value: f ? f.name : (s.clinic || '') },
      { name: 'type', label: 'Facility type', type: 'select', value: f ? f.facility_type : 'phc', options: Object.keys(TYPES).map(k => [k, TYPES[k]]) },
      { name: 'state', label: 'State', required: true, value: f ? f.state : (s.state || '') },
      { name: 'lga', label: 'Local government area (LGA)', required: true, value: f ? f.lga : (s.lga || '') },
      { name: 'address', label: 'Address or community', value: f ? (f.address || '') : '', placeholder: 'Street, town or rural community' },
      { name: 'phone', label: 'Facility phone', type: 'tel', value: f ? (f.phone || '') : '' },
      { name: 'services', label: 'Services offered', type: 'textarea', rows: 2, value: f ? (f.services || []).join(', ') : '', hint: 'Separate with commas, for example: maternity, surgery, paediatrics, laboratory' }
    ];
  }

  function newFacility() {
    if (!S.uid) { toast('Sign in online first', 'log-in'); return; }
    ask({
      title: 'Register your facility',
      intro: 'You become the admin of this facility and can add your staff by email.',
      fields: facilityFields(null),
      confirm: 'Register facility',
      submit: async v => {
        rpcOrThrow(await S.sb.rpc('create_facility', {
          p_name: v.name, p_type: v.type, p_state: v.state, p_lga: v.lga,
          p_address: v.address || null, p_phone: v.phone || null, p_services: servicesList(v.services)
        }));
        toast('Facility registered', 'building-2');
        S.teams = {};
        await refresh(true);
      }
    });
  }

  function editFacility(fid) {
    const f = S.facilities.get(fid);
    if (!f) return;
    ask({
      title: 'Edit facility details',
      fields: facilityFields(f),
      confirm: 'Save changes',
      submit: async v => {
        const r = await S.sb.from('facilities').update({
          name: v.name, facility_type: v.type, state: v.state, lga: v.lga,
          address: v.address || null, phone: v.phone || null, services: servicesList(v.services)
        }).eq('id', fid).select('id');
        if (r.error) throw r.error;
        if (!r.data || !r.data.length) throw new Error('forbidden');
        toast('Facility updated', 'check-circle');
        await refresh(true);
      }
    });
  }

  async function addMember(fid) {
    const emailEl = $('[data-member-email="' + fid + '"]');
    const roleEl = $('[data-member-role="' + fid + '"]');
    const email = emailEl ? emailEl.value.trim() : '';
    if (!email) { toast('Enter the staff email first', 'mail'); return; }
    try {
      rpcOrThrow(await S.sb.rpc('add_facility_member', { p_facility: fid, p_email: email, p_role: roleEl.value }));
      toast('Team member added', 'user-plus');
      emailEl.value = '';
      S.teams[fid] = undefined;
      loadTeam(fid);
    } catch (e) {
      toast(errText(e), 'alert-triangle');
    }
  }

  async function changeRole(sel) {
    const fid = sel.dataset.fid;
    if (!sel.dataset.email) { toast('That member has no email on record', 'alert-triangle'); loadTeam(fid); return; }
    try {
      rpcOrThrow(await S.sb.rpc('add_facility_member', { p_facility: fid, p_email: sel.dataset.email, p_role: sel.value }));
      toast('Role updated', 'check-circle');
    } catch (e) {
      toast(errText(e), 'alert-triangle');
    }
    S.teams[fid] = undefined;
    loadTeam(fid);
  }

  function removeMember(fid, uid, name) {
    ask({
      title: 'Remove team member',
      intro: 'Remove ' + name + ' from this facility? They will no longer see its referrals.',
      fields: [],
      confirm: 'Remove',
      submit: async () => {
        rpcOrThrow(await S.sb.rpc('remove_facility_member', { p_facility: fid, p_user: uid }));
        toast('Team member removed', 'user-minus');
        S.teams[fid] = undefined;
        await refresh(true);
      }
    });
  }

  function patientPrefill(pid) {
    let p = null;
    try { p = RC.getPatientById(pid); } catch (e) {}
    if (!p) return null;
    const v = p.vitals || {};
    const flags = (function () { try { return RC.getFlags(p).map(f => f.text); } catch (e) { return []; } })();
    const sym = (p.symptoms || []).join(', ');
    const parts = [];
    if (sym) parts.push('Presenting symptoms: ' + sym + '.');
    if (flags.length) parts.push('Triage flags: ' + flags.join('; ') + '.');
    if (p.notes) parts.push('Clinical notes: ' + p.notes);
    let severity = 'clear';
    try { severity = RC.overallSeverity(p); } catch (e) {}
    let age = '';
    try { age = RC.ageLabel(p); } catch (e) {}
    const out = {
      pid: p.id,
      patient: {
        name: p.name || '', age: age || p.age || '', gender: p.gender || '', contact: p.contact || '', community: p.community || '',
        vitals: { bpSys: v.bpSys || '', bpDia: v.bpDia || '', temp: v.temp || '', hr: v.hr || '', spo2: v.spo2 || '', rr: v.rr || '', weight: p.weight || '' }
      },
      care: { findings: parts.join('\n'), pregnant: !!p.pregnant },
      urgency: severity === 'urgent' ? 'urgent' : 'routine'
    };
    try {
      const raw = sessionStorage.getItem('ruralcare_ref_draft');
      const dr = raw ? JSON.parse(raw) : null;
      if (dr && dr.pid === p.id && Date.now() - dr.at < 3600000) {
        if (dr.assessment) out.care.assessment = dr.assessment;
        if (dr.findings) out.care.findings = dr.findings;
        if (dr.reason) out.reason = dr.reason;
        if (dr.service) out.service = dr.service;
        if (dr.urgency) out.urgency = dr.urgency;
        out.ai = true;
        sessionStorage.removeItem('ruralcare_ref_draft');
      }
    } catch (e) {}
    return out;
  }

  function invRow(r) {
    r = r || {};
    return '<div class="inv-row grid grid-cols-2 sm:grid-cols-12 gap-2 items-center"><input data-k="test" class="input-field sm:col-span-5" placeholder="Test, e.g. Malaria RDT" value="' + esc(r.test) + '">' +
      '<input data-k="result" class="input-field sm:col-span-5" placeholder="Result" value="' + esc(r.result) + '">' +
      '<button type="button" data-del class="text-[12px] font-semibold text-[#DC2626] sm:col-span-2 text-left sm:text-center py-2">Remove</button></div>';
  }

  function trtRow(r) {
    r = r || {};
    return '<div class="trt-row grid grid-cols-2 sm:grid-cols-12 gap-2 items-center"><input data-k="item" class="input-field col-span-2 sm:col-span-4" placeholder="Drug or action given" value="' + esc(r.item) + '">' +
      '<input data-k="dose" class="input-field sm:col-span-2" placeholder="Dose" value="' + esc(r.dose) + '">' +
      '<input data-k="route" class="input-field sm:col-span-2" placeholder="Route" value="' + esc(r.route) + '">' +
      '<input data-k="at" class="input-field sm:col-span-2" placeholder="Time given" value="' + esc(r.at) + '">' +
      '<button type="button" data-del class="text-[12px] font-semibold text-[#DC2626] sm:col-span-2 text-left sm:text-center py-2">Remove</button></div>';
  }

  function inp(name, label, value, ph, type) {
    return '<div><label class="lbl">' + label + '</label><input name="' + name + '" type="' + (type || 'text') + '" class="input-field" value="' + esc(value) + '" placeholder="' + esc(ph || '') + '" autocomplete="off"></div>';
  }

  function area(name, label, value, ph, rows) {
    return '<div><label class="lbl">' + label + '</label><textarea name="' + name + '" rows="' + (rows || 3) + '" class="input-field resize-y" placeholder="' + esc(ph || '') + '">' + esc(value) + '</textarea></div>';
  }

  function formHtml(mode, d) {
    const careOnly = mode === 'care';
    const c = d.care || {};
    const p = d.patient || {};
    const v = p.vitals || {};
    const cl = c.clinician || {};
    const s = sess();
    const fromSel = S.memberships.length > 1
      ? '<div><label class="lbl">Referring from *</label><select name="from" class="input-field">' + S.memberships.map(m => '<option value="' + esc(m.facility_id) + '"' + (m.facility_id === d.fromId ? ' selected' : '') + '>' + esc(m.facility.name) + '</option>').join('') + '</select></div>'
      : S.memberships.length === 1
        ? '<div><label class="lbl">Referring from</label><input type="hidden" name="from" value="' + esc(S.memberships[0].facility_id) + '"><p class="text-[14px] font-semibold">' + esc(S.memberships[0].facility.name) + '</p><p class="text-[12px] text-slate-500">' + esc(S.memberships[0].facility.lga) + ', ' + esc(S.memberships[0].facility.state) + '</p></div>'
        : '<div class="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/40 p-3 text-[12.5px] font-semibold text-amber-900 dark:text-amber-200">You are not linked to a facility yet. You can print this form now, but register your facility under My facility before sending.</div>';

    const head = careOnly ? '' :
      '<section class="space-y-3"><p class="sec-title">1. From and to</p>' + fromSel +
      '<div><label class="lbl">Receiving facility *</label>' + pickerHtml() + '</div>' +
      inp('to_manual', 'Facility not listed or you are offline? Type its name (printed form only)', d.toManual || '', 'Receiving facility name') +
      '</section>' +
      '<section class="space-y-3"><p class="sec-title">2. Referral details</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      '<div><label class="lbl">Urgency *</label><select name="urgency" class="input-field">' + Object.keys(URGENCY).map(k => '<option value="' + k + '"' + (k === d.urgency ? ' selected' : '') + '>' + URGENCY[k][0] + '</option>').join('') + '</select></div>' +
      '<div><label class="lbl">Service needed</label><input name="service" list="svc-list" class="input-field" value="' + esc(d.service || '') + '" placeholder="e.g. surgery, maternity" autocomplete="off"><datalist id="svc-list">' + serviceOptions() + '</datalist></div></div>' +
      area('reason', 'Reason for referral *', d.reason || '', 'Why is this patient being referred?', 3) + '</section>' +
      '<section class="space-y-3"><p class="sec-title">3. Patient</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' +
      inp('p_name', 'Full name *', p.name) + inp('p_age', 'Age', p.age, 'e.g. 54 y or 6 months') +
      '<div><label class="lbl">Sex</label><select name="p_gender" class="input-field">' + ['', 'Female', 'Male'].map(g => '<option value="' + g + '"' + (g === (p.gender || '') ? ' selected' : '') + '>' + (g || 'Select') + '</option>').join('') + '</select></div>' +
      inp('p_contact', 'Contact phone', p.contact, '', 'tel') + inp('p_community', 'Community / village', p.community) + '</div>' +
      '<p class="lbl !mb-0 pt-1">Vital signs</p><div class="grid grid-cols-3 sm:grid-cols-7 gap-2">' +
      inp('v_bpSys', 'BP sys', v.bpSys) + inp('v_bpDia', 'BP dia', v.bpDia) + inp('v_temp', 'Temp \u00B0C', v.temp) + inp('v_hr', 'Pulse', v.hr) + inp('v_spo2', 'SpO2 %', v.spo2) + inp('v_rr', 'Resp/min', v.rr) + inp('v_weight', 'Weight kg', v.weight) + '</div></section>';

    const care =
      '<section class="space-y-3"><p class="sec-title">' + (careOnly ? '1' : '4') + '. What has been done so far</p>' +
      area('assessment', 'Assessment: working diagnosis or impression *', c.assessment || '', 'What do you think is wrong?', 2) +
      area('findings', 'Examination findings and history', c.findings || '', 'Key findings, symptoms and how long', 3) +
      '<div><p class="lbl">Investigations done</p><div id="inv-rows" class="space-y-2">' + ((c.investigations && c.investigations.length ? c.investigations : [{}]).map(invRow).join('')) + '</div><button type="button" data-add="inv" class="mt-2 text-[12.5px] font-semibold text-[#52B788]">+ Add investigation</button></div>' +
      '<div><p class="lbl">Treatment and drugs given before referral</p><div id="trt-rows" class="space-y-2">' + ((c.treatments_given && c.treatments_given.length ? c.treatments_given : [{}]).map(trtRow).join('')) + '</div><button type="button" data-add="trt" class="mt-2 text-[12.5px] font-semibold text-[#52B788]">+ Add treatment</button></div>' +
      area('procedures', 'Procedures done (one per line)', (c.procedures || []).join('\n'), 'e.g. IV line placed, wound dressed', 2) +
      area('response', 'Response to treatment so far', c.response || '', 'Better, same or worse after treatment?', 2) +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="lbl">Condition at time of referral</label><select name="current_condition" class="input-field"><option value="">Select</option>' + Object.keys(CONDITIONS).map(k => '<option value="' + k + '"' + (k === c.current_condition ? ' selected' : '') + '>' + CONDITIONS[k] + '</option>').join('') + '</select></div>' +
      inp('transport', 'Transport and escort', c.transport, 'e.g. ambulance with nurse') + '</div>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">' + inp('allergies', 'Known allergies', c.allergies) + inp('ongoing_medications', 'Ongoing medications', c.ongoing_medications) + '</div>' +
      '<label class="flex items-center gap-2 text-[13px] font-semibold"><input type="checkbox" name="pregnant" class="w-4 h-4 accent-[#52B788]"' + (c.pregnant ? ' checked' : '') + '>Patient is pregnant</label></section>' +
      '<section class="space-y-3"><p class="sec-title">' + (careOnly ? '2' : '5') + '. Referring clinician</p><div class="grid grid-cols-1 sm:grid-cols-3 gap-3">' +
      inp('c_name', 'Name', cl.name || s.name || '') + inp('c_role', 'Designation', cl.designation || s.role || '') + inp('c_lic', 'Licence / registration no.', cl.licence || s.licenseNo || '') + '</div></section>';

    return '<form id="ref-form" class="p-5 sm:p-6 space-y-6" novalidate><div class="flex items-start justify-between gap-3"><div><h3 class="text-[18px] font-bold text-headingDark dark:text-white">' + (careOnly ? 'Update clinical summary' : 'New referral') + '</h3>' +
      '<p class="text-[12.5px] text-slate-500 mt-0.5">' + (careOnly ? 'The receiving team sees the latest version.' : 'Fill in what you have done so the receiving team can continue care without repeating it.') + '</p></div>' +
      '<button type="button" data-cancel class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5" aria-label="Close"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      head + care +
      '<p id="form-err" class="hidden text-[12.5px] font-semibold text-[#DC2626]"></p>' +
      '<div class="flex flex-col-reverse sm:flex-row sm:justify-between gap-2 pt-1"><button type="button" data-act="print-draft" class="btn-secondary px-4 py-2.5 text-[13px] inline-flex items-center justify-center gap-2"><i data-lucide="printer" class="w-4 h-4"></i><span>Print form</span></button>' +
      '<button type="submit" class="btn-primary px-5 py-2.5 text-[13px]">' + (careOnly ? 'Save update' : 'Send referral') + '</button></div></form>';
  }

  function serviceOptions() {
    const set = new Set();
    S.facilities.forEach(f => (f.services || []).forEach(x => set.add(x)));
    return Array.from(set).sort().map(x => '<option value="' + esc(x) + '">').join('');
  }

  function readForm(form) {
    const g = n => { const el = form.elements[n]; return el ? String(el.value == null ? '' : el.value).trim() : ''; };
    const rows = (sel, keys) => $$(sel, form).map(r => {
      const o = {};
      keys.forEach(k => { const x = r.querySelector('[data-k="' + k + '"]'); const t = x ? x.value.trim() : ''; if (t) o[k] = t; });
      return o;
    }).filter(o => Object.keys(o).length);
    const care = {
      assessment: g('assessment'),
      findings: g('findings'),
      investigations: rows('.inv-row', ['test', 'result']),
      treatments_given: rows('.trt-row', ['item', 'dose', 'route', 'at']),
      procedures: g('procedures').split(/\n+/).map(x => x.trim()).filter(Boolean),
      response: g('response'),
      allergies: g('allergies'),
      ongoing_medications: g('ongoing_medications'),
      transport: g('transport'),
      clinician: { name: g('c_name'), designation: g('c_role'), licence: g('c_lic') }
    };
    const cc = g('current_condition');
    if (cc) care.current_condition = cc;
    if (form.elements.pregnant && form.elements.pregnant.checked) care.pregnant = true;
    ['findings', 'response', 'allergies', 'ongoing_medications', 'transport'].forEach(k => { if (!care[k]) delete care[k]; });
    if (!care.procedures.length) delete care.procedures;
    if (!care.investigations.length) delete care.investigations;
    if (!care.treatments_given.length) delete care.treatments_given;
    Object.keys(care.clinician).forEach(k => { if (!care.clinician[k]) delete care.clinician[k]; });
    if (!Object.keys(care.clinician).length) delete care.clinician;

    const vitals = {};
    ['bpSys', 'bpDia', 'temp', 'hr', 'spo2', 'rr', 'weight'].forEach(k => { const t = g('v_' + k); if (t) vitals[k] = t; });
    const patient = { name: g('p_name'), age: g('p_age'), gender: g('p_gender'), contact: g('p_contact'), community: g('p_community'), vitals };
    if (form.dataset.pid) patient.source_patient_id = form.dataset.pid;
    const pk = $('[data-picker-value]', form);
    return {
      from: g('from'),
      to: pk ? pk.value : '',
      toManual: g('to_manual'),
      urgency: g('urgency') || 'routine',
      service: g('service'),
      reason: g('reason'),
      patient,
      care
    };
  }

  function fallbackFrom() {
    const s = sess();
    return { name: s.clinic || '', state: s.state || '', lga: s.lga || '', address: '', phone: '', facility_type: '' };
  }

  function openForm(opts) {
    opts = opts || {};
    const mode = opts.mode || 'new';
    let d;
    if (mode === 'care') {
      const r = opts.referral;
      d = { care: r.care_summary || {}, patient: r.patient || {} };
    } else {
      const pre = opts.pid ? patientPrefill(opts.pid) : null;
      d = pre || { care: {}, patient: {}, urgency: 'routine' };
      d.fromId = S.memberships.length ? S.memberships[0].facility_id : '';
    }
    const card = modal(formHtml(mode, d), true);
    const form = $('#ref-form', card);
    if (d.pid) form.dataset.pid = d.pid;
    if (d.ai) form.insertAdjacentHTML('afterbegin', '<div class="rounded-xl border border-[#52B788]/40 bg-[#52B788]/10 px-3 py-2 mb-3 text-[12.5px] font-semibold text-[#0F8B8D] dark:text-[#52B788]">The AI drafted the reason, assessment and findings from the patient record. Check and edit them before sending.</div>');
    const fromEl = form.elements.from;
    let picker = null;
    const pk = $('[data-picker]', form);
    if (pk) {
      picker = initPicker(pk, {
        exclude: () => new Set(fromEl && fromEl.value ? [fromEl.value] : []),
        home: () => (fromEl && S.facilities.get(fromEl.value)) || fallbackFrom(),
        service: () => { const el = form.elements.service; return el ? String(el.value || '').trim().toLowerCase() : ''; }
      });
      if (fromEl && fromEl.tagName === 'SELECT') fromEl.addEventListener('change', picker.redraw);
      if (form.elements.service) form.elements.service.addEventListener('input', picker.redraw);
    }
    $('[data-cancel]', form).addEventListener('click', closeModal);
    form.addEventListener('click', ev => {
      const add = ev.target.closest('[data-add]');
      const del = ev.target.closest('[data-del]');
      if (add) {
        const box = $(add.dataset.add === 'inv' ? '#inv-rows' : '#trt-rows', form);
        box.insertAdjacentHTML('beforeend', add.dataset.add === 'inv' ? invRow() : trtRow());
      }
      if (del) {
        const row = del.closest('.inv-row, .trt-row');
        const box = row.parentNode;
        if (box.children.length > 1) row.remove();
        else $$('input', row).forEach(i => { i.value = ''; });
      }
      if (ev.target.closest('[data-act="print-draft"]')) printDraft(form);
    });
    form.addEventListener('submit', ev => {
      ev.preventDefault();
      if (mode === 'care') submitCare(form, opts.referral);
      else submitNew(form);
    });
    return form;
  }

  function formFail(form, msg) {
    const err = $('#form-err', form);
    err.textContent = msg;
    err.classList.remove('hidden');
    err.scrollIntoView({ block: 'center' });
  }

  async function submitNew(form) {
    const d = readForm(form);
    if (!d.from) return formFail(form, navigator.onLine ? 'Register your facility first, under the My facility tab.' : 'Open this page once while online so your facility details are saved on this device.');
    if (!d.to) return formFail(form, 'Choose the receiving facility from the list.');
    if (d.patient.name.length < 2) return formFail(form, 'Enter the patient name.');
    if (d.reason.length < 3) return formFail(form, 'Give the reason for referral.');
    if (d.care.assessment.length < 3) return formFail(form, 'Add the assessment: your working diagnosis or impression.');
    const cref = newClientRef();
    if (!S.uid || !S.sb || !navigator.onLine) { queueReferral(form, d, cref); return; }
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      const id = rpcOrThrow(await S.sb.rpc('create_referral', {
        p_from: d.from,
        p_to: d.to,
        p_urgency: d.urgency,
        p_required_service: d.service || null,
        p_reason: d.reason,
        p_patient: d.patient,
        p_care: d.care,
        p_client_ref: cref
      }));
      closeModal();
      toast('Referral sent', 'send');
      S.tab = 'sent';
      S.filter = 'open';
      await refresh(true);
      if (id) openDetail(id);
    } catch (e) {
      if (isTransient(e)) { queueReferral(form, d, cref); return; }
      formFail(form, errText(e));
      btn.disabled = false;
    }
  }

  async function submitCare(form, r) {
    const d = readForm(form);
    if (!navigator.onLine) return formFail(form, 'You are offline. Try again when you have a connection.');
    if (d.care.assessment.length < 3) return formFail(form, 'Add the assessment: your working diagnosis or impression.');
    const btn = $('button[type=submit]', form);
    btn.disabled = true;
    try {
      rpcOrThrow(await S.sb.rpc('update_referral_care', { p_id: r.id, p_care: d.care }));
      closeModal();
      toast('Clinical summary updated', 'check-circle');
      await refresh(true);
      openDetail(r.id);
    } catch (e) {
      formFail(form, errText(e));
      btn.disabled = false;
    }
  }

  function facModel(f) {
    f = f || {};
    return { name: f.name || '', type: TYPES[f.facility_type] || '', address: f.address || '', lga: f.lga || '', state: f.state || '', phone: f.phone || '' };
  }

  function modelFromReferral(r) {
    const care = r.care_summary || {};
    const cl = care.clinician || {};
    return {
      ref: r.ref_code,
      date: r.created_at,
      status: r.status,
      urgency: r.urgency,
      from: facModel(S.facilities.get(r.from_facility_id)),
      to: facModel(S.facilities.get(r.to_facility_id)),
      patient: r.patient || {},
      reason: r.reason,
      service: r.required_service || '',
      care,
      clinician: { name: cl.name || r.created_by_name || '', designation: cl.designation || r.created_by_role || '', licence: cl.licence || '' },
      outcome: r.outcome ? OUTCOMES[r.outcome] : '',
      feedback: r.feedback || ''
    };
  }

  function printDraft(form) {
    const d = readForm(form);
    const picked = d.to ? S.facilities.get(d.to) : null;
    const fromFac = d.from && S.facilities.get(d.from) ? S.facilities.get(d.from) : fallbackFrom();
    const toFac = picked ? facModel(picked) : { name: d.toManual, type: '', address: '', lga: '', state: '', phone: '' };
    printReferral({
      ref: '',
      date: new Date().toISOString(),
      status: '',
      urgency: d.urgency,
      from: facModel(fromFac),
      to: toFac,
      patient: d.patient,
      reason: d.reason,
      service: d.service,
      care: d.care,
      clinician: d.care.clinician || {},
      draft: true
    });
  }

  function printReferral(m) {
    const root = $('#print-root');
    root.innerHTML = printHtml(m);
    const logo = $('.ps-logo', root);
    const logoReady = logo
      ? new Promise(resolve => {
          if (logo.complete) {
            if (!logo.naturalWidth) logo.remove();
            resolve();
            return;
          }
          logo.addEventListener('load', resolve, { once: true });
          logo.addEventListener('error', () => { logo.remove(); resolve(); }, { once: true });
          setTimeout(resolve, 1500);
        })
      : Promise.resolve();
    const clear = () => {
      root.innerHTML = '';
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
    logoReady.then(() => window.print());
  }

  function psf(label, value, full) {
    return '<div class="ps-f' + (full ? ' full' : '') + '"><span class="ps-k">' + esc(label) + '</span><span class="ps-v">' + esc(value) + '</span></div>';
  }

  function psTable(headers, rows, minRows) {
    const body = rows.slice();
    while (body.length < minRows) body.push(headers.map(() => ''));
    return '<table class="ps-table"><thead><tr>' + headers.map(h => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
      body.map(r => '<tr>' + r.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  }

  function printHtml(m) {
    const p = m.patient || {};
    const v = p.vitals || {};
    const c = m.care || {};
    const cl = m.clinician || {};
    const mark = key => (m.urgency === key ? '\u2612' : '\u2610');
    const fromSub = [m.from.type, m.from.address, [m.from.lga, m.from.state].filter(Boolean).join(', '), m.from.phone ? 'Tel: ' + m.from.phone : ''].filter(Boolean).join('  \u00B7  ');
    const invRows = (c.investigations || []).map(x => [x.test || '', x.result || '']);
    const trtRows = (c.treatments_given || []).map(x => [x.item || '', x.dose || '', x.route || '', x.at || '']);
    const loc = x => [x.address, x.lga, x.state].filter(Boolean).join(', ');
    return '<div class="ps">' +
      (m.draft ? '<div class="ps-draft">DRAFT \u2014 NOT YET SENT THROUGH THE SYSTEM</div>' : m.pending ? '<div class="ps-draft">PENDING UPLOAD \u2014 NOT YET RECEIVED BY THE SYSTEM. KEEP THIS PAPER WITH THE PATIENT.</div>' : '') +
      '<div class="ps-head"><img class="ps-logo" src="./img/logo-icon-color.png" alt="">' +
        '<div class="ps-org"><div class="ps-org-name">' + esc(m.from.name || 'Referring facility') + '</div><div class="ps-org-sub">' + esc(fromSub) + '</div></div>' +
        '<div class="ps-ref"><div>Referral No.</div><strong>' + esc(m.ref || '________') + '</strong><div>Date: ' + esc(fmtDay(m.date)) + '</div></div></div>' +
      '<div class="ps-title">Patient Referral Form</div>' +
      '<div class="ps-urg"><span>' + mark('routine') + ' Routine</span><span>' + mark('urgent') + ' Urgent</span><span>' + mark('emergency') + ' Emergency</span></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">A. Referred from</div><div class="ps-body"><div class="ps-grid">' +
        psf('Facility / health centre', m.from.name) + psf('Facility type', m.from.type) +
        psf('Address / community', m.from.address) + psf('LGA and state', [m.from.lga, m.from.state].filter(Boolean).join(', ')) +
        psf('Facility phone', m.from.phone) + psf('Patient\u2019s community / village', p.community) + '</div></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">B. Referred to</div><div class="ps-body"><div class="ps-grid">' +
        psf('Receiving facility', m.to.name) + psf('Service needed', m.service) +
        psf('Location', loc(m.to)) + psf('Facility phone', m.to.phone) + '</div></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">C. Patient details</div><div class="ps-body"><div class="ps-grid three">' +
        psf('Full name', p.name) + psf('Age', p.age) + psf('Sex', p.gender) +
        psf('Contact phone', p.contact) + psf('Pregnant', c.pregnant ? 'Yes' : '') + psf('Patient ID', p.source_patient_id) + '</div></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">D. Reason for referral</div><div class="ps-body"><span class="ps-v">' + esc(m.reason) + '</span></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">E. Clinical summary: what has been done so far</div><div class="ps-body">' +
        psTable(['BP (mmHg)', 'Temp (\u00B0C)', 'Pulse (bpm)', 'SpO2 (%)', 'Resp. (/min)', 'Weight (kg)'], [[v.bpSys && v.bpDia ? v.bpSys + '/' + v.bpDia : '', v.temp || '', v.hr || '', v.spo2 || '', v.rr || '', v.weight || '']], 0) +
        '<div class="ps-grid" style="margin-top:6px">' +
        psf('Assessment (working diagnosis)', c.assessment, true) +
        psf('Examination findings and history', c.findings, true) + '</div>' +
        '<span class="ps-k" style="margin-top:6px">Investigations done</span>' + psTable(['Test', 'Result'], invRows, 2) +
        '<span class="ps-k" style="margin-top:6px">Treatment and drugs given before referral</span>' + psTable(['Treatment / drug', 'Dose', 'Route', 'Time given'], trtRows, 3) +
        '<div class="ps-grid" style="margin-top:6px">' +
        psf('Procedures done', (c.procedures || []).join('; '), true) +
        psf('Response to treatment', c.response, true) +
        psf('Condition at referral', CONDITIONS[c.current_condition] || '') + psf('Transport and escort', c.transport) +
        psf('Known allergies', c.allergies) + psf('Ongoing medications', c.ongoing_medications) + '</div></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">F. Referring clinician</div><div class="ps-body"><div class="ps-sign"><div class="ps-grid">' +
        psf('Name of clinician', cl.name) + psf('Designation', cl.designation) + psf('Licence / registration no.', cl.licence) + psf('Date and time', fmt(m.date)) +
        '<div class="ps-f full"><span class="ps-k">Signature</span><div class="ps-line"></div></div></div>' +
        '<div class="ps-stamp">Facility stamp</div></div></div></div>' +
      '<div class="ps-sec"><div class="ps-sec-h">G. For the receiving facility</div><div class="ps-body"><div class="ps-grid">' +
        '<div class="ps-f"><span class="ps-k">Received by (name and designation)</span><div class="ps-line"></div></div>' +
        '<div class="ps-f"><span class="ps-k">Date and time received</span><div class="ps-line"></div></div>' +
        '<div class="ps-f"><span class="ps-k">Signature</span><div class="ps-line"></div></div>' +
        '<div class="ps-f"><span class="ps-k">Outcome / feedback to referring facility</span>' + (m.outcome || m.feedback ? '<span class="ps-v">' + esc([m.outcome, m.feedback].filter(Boolean).join(' \u2014 ')) + '</span>' : '<div class="ps-line"></div>') + '</div>' +
        '</div></div></div>' +
      '<div class="ps-foot"><span>Confidential: contains patient health information. If received in error, return it to the sender.</span><span>RuralCare \u00B7 CareBridge referral' + (m.ref ? ' \u00B7 ' + esc(m.ref) : '') + ' \u00B7 Printed ' + esc(fmt(new Date().toISOString())) + '</span></div>' +
    '</div>';
  }

  function dl(label, value) {
    return '<div><dt>' + esc(label) + '</dt><dd>' + (value ? esc(value) : '\u2014') + '</dd></div>';
  }

  function detailHtml(r) {
    const ids = myIds();
    const recv = ids.has(r.to_facility_id);
    const send = ids.has(r.from_facility_id);
    const p = r.patient || {};
    const v = p.vitals || {};
    const c = r.care_summary || {};
    const from = S.facilities.get(r.from_facility_id) || {};
    const to = S.facilities.get(r.to_facility_id) || {};
    const acts = [];
    const decide = recv && canDecide(r.to_facility_id);
    if (recv && (r.status === 'sent' || r.status === 'redirected')) acts.push(['ack', 'Acknowledge receipt', 'check', 'btn-secondary']);
    if (recv && !r.arrived_at && ['sent', 'received', 'accepted', 'redirected'].includes(r.status)) acts.push(['arrived', 'Mark patient arrived', 'map-pin', 'btn-secondary']);
    if (decide && ['sent', 'received', 'redirected'].includes(r.status)) {
      acts.push(['accept', 'Accept', 'check-circle', 'btn-primary']);
      acts.push(['reject', 'Reject', 'x-circle', 'btn-secondary']);
      acts.push(['redirect', 'Redirect', 'corner-up-right', 'btn-secondary']);
    }
    if (decide && r.status === 'accepted') acts.push(['complete', 'Complete and give feedback', 'clipboard-check', 'btn-primary']);
    if (send && ['sent', 'received', 'redirected', 'accepted'].includes(r.status)) acts.push(['care', 'Update clinical summary', 'edit-3', 'btn-secondary']);
    if (send && ['sent', 'received', 'redirected'].includes(r.status)) acts.push(['cancel', 'Cancel referral', 'ban', 'btn-secondary']);
    const roleNote = recv && !decide && isOpen(r) ? '<p class="w-full text-[12px] text-slate-500">Only a referral coordinator or facility admin can accept, reject, redirect or complete this referral.</p>' : '';
    const actions = acts.map(a => '<button type="button" data-do="' + a[0] + '" data-id="' + esc(r.id) + '" class="' + a[3] + ' px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5"><i data-lucide="' + a[2] + '" class="w-4 h-4"></i><span>' + a[1] + '</span></button>').join('');
    const vit = [v.bpSys && v.bpDia ? 'BP ' + v.bpSys + '/' + v.bpDia : '', v.temp ? 'Temp ' + v.temp + '\u00B0C' : '', v.hr ? 'Pulse ' + v.hr : '', v.spo2 ? 'SpO2 ' + v.spo2 + '%' : '', v.rr ? 'RR ' + v.rr : '', v.weight ? v.weight + ' kg' : ''].filter(Boolean).join('  \u00B7  ');
    const inv = (c.investigations || []).map(x => '<li>' + esc(x.test || '') + (x.result ? ': <b>' + esc(x.result) + '</b>' : '') + '</li>').join('');
    const trt = (c.treatments_given || []).map(x => '<li>' + esc([x.item, x.dose, x.route, x.at ? 'at ' + x.at : ''].filter(Boolean).join(' \u00B7 ')) + '</li>').join('');
    const block = (title, body) => body ? '<div><p class="sec-title mb-1">' + title + '</p>' + body + '</div>' : '';
    const text = t => t ? '<p class="text-[13.5px] whitespace-pre-wrap">' + esc(t) + '</p>' : '';
    return '<div class="p-5 sm:p-6 space-y-5">' +
      '<div class="flex items-start justify-between gap-3"><div class="space-y-2"><div class="flex flex-wrap items-center gap-2"><span class="font-mono text-[12.5px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5">' + esc(r.ref_code) + '</span>' + pill(URGENCY, r.urgency) + pill(STATUS, r.status) + '</div>' +
      '<h3 class="text-[19px] font-bold text-headingDark dark:text-white">' + esc(p.name || 'Unnamed patient') + '</h3>' +
      '<p class="text-[12.5px] text-slate-500">' + esc([p.age, p.gender, p.community, p.contact].filter(Boolean).join(' \u00B7 ')) + '</p></div>' +
      '<button type="button" data-cancel class="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 shrink-0" aria-label="Close"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      '<dl class="dl-grid">' + dl('From', r.from_facility_id ? (from.name || 'Another facility') : '') + dl('Sender location', [from.lga, from.state].filter(Boolean).join(', ')) +
        dl('To', to.name || 'Another facility') + dl('Receiver location', [to.lga, to.state].filter(Boolean).join(', ')) +
        dl('Sent by', [r.created_by_name, r.created_by_role].filter(Boolean).join(', ')) + dl('Sent', fmt(r.created_at)) + dl('Service needed', r.required_service) + dl('Patient arrived', fmt(r.arrived_at)) + dl('Paper reference', r.client_ref) + dl('Last update', fmt(r.updated_at)) + '</dl>' +
      block('Reason for referral', text(r.reason)) +
      '<div class="space-y-4 rounded-xl border border-[#E5E7EB] dark:border-white/10 p-4"><p class="text-[13px] font-bold text-headingDark dark:text-white">What has been done so far</p>' +
        block('Vital signs', text(vit)) +
        block('Assessment', text(c.assessment)) + block('Examination findings and history', text(c.findings)) +
        block('Investigations', inv ? '<ul class="list-disc pl-5 text-[13.5px] space-y-0.5">' + inv + '</ul>' : '') +
        block('Treatment and drugs given', trt ? '<ul class="list-disc pl-5 text-[13.5px] space-y-0.5">' + trt + '</ul>' : '') +
        block('Procedures', text((c.procedures || []).join('; '))) + block('Response to treatment', text(c.response)) +
        '<dl class="dl-grid">' + dl('Condition at referral', CONDITIONS[c.current_condition]) + dl('Transport and escort', c.transport) + dl('Allergies', c.allergies) + dl('Ongoing medications', c.ongoing_medications) + dl('Pregnant', c.pregnant ? 'Yes' : '') + '</dl></div>' +
      (r.response_reason ? block(r.status === 'rejected' ? 'Reason for rejection' : r.status === 'redirected' ? 'Reason for redirect' : 'Note from receiving facility', text(r.response_reason)) : '') +
      (r.status === 'completed' ? '<div class="rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-1"><p class="sec-title">Outcome and feedback</p><p class="text-[13.5px] font-semibold">' + esc(OUTCOMES[r.outcome] || r.outcome || '') + '</p>' + text(r.feedback) + '</div>' : '') +
      '<div><p class="sec-title mb-2">History</p><div id="timeline" class="space-y-2 text-[12.5px] text-slate-500">Loading history...</div></div>' +
      '<div class="flex flex-wrap gap-2 pt-1 border-t border-[#E5E7EB] dark:border-white/10 pt-4">' + roleNote + actions +
      '<button type="button" data-do="print" data-id="' + esc(r.id) + '" class="btn-secondary px-3.5 py-2 text-[12.5px] inline-flex items-center gap-1.5 sm:ml-auto"><i data-lucide="printer" class="w-4 h-4"></i><span>Print referral form</span></button></div>' +
    '</div>';
  }

  async function openDetail(id) {
    const r = S.referrals.find(x => x.id === id);
    if (!r) return;
    const card = modal(detailHtml(r), true);
    $('[data-cancel]', card).addEventListener('click', closeModal);
    if (!S.sb) return;
    const res = await S.sb.from('referral_events').select('*').eq('referral_id', id).order('at', { ascending: true });
    const box = $('#timeline');
    if (!box) return;
    if (res.error || !res.data) { box.textContent = 'History is not available right now.'; return; }
    box.innerHTML = res.data.map(e => {
      const d = e.detail || {};
      const extra = [d.reason ? 'Reason: ' + d.reason : '', d.outcome ? 'Outcome: ' + (OUTCOMES[d.outcome] || d.outcome) : '', d.redirect_to ? 'New facility: ' + facName(d.redirect_to) : '', d.to_facility && e.action === 'created' ? 'To: ' + facName(d.to_facility) : ''].filter(Boolean).join(' \u00B7 ');
      return '<div class="flex gap-3"><span class="w-2 h-2 rounded-full bg-[#52B788] mt-1.5 shrink-0"></span><div><p class="text-[13px] font-semibold text-headingDark dark:text-white">' + esc(EVENT_LABELS[e.action] || e.action) + '</p>' +
        '<p>' + esc(fmt(e.at)) + (e.actor_facility_id ? ' \u00B7 ' + esc(facName(e.actor_facility_id)) : '') + '</p>' + (extra ? '<p>' + esc(extra) + '</p>' : '') + '</div></div>';
    }).join('') || 'No history yet.';
  }

  async function runAction(kind, id) {
    const r = S.referrals.find(x => x.id === id);
    if (!r) return;
    const back = () => openDetail(id);
    const done = async msg => { toast(msg, 'check-circle'); await refresh(true); openDetail(id); };
    if (kind === 'print') { printReferral(modelFromReferral(r)); return; }
    if (kind === 'care') { openForm({ mode: 'care', referral: r }); return; }
    if (kind === 'ack') {
      try { rpcOrThrow(await S.sb.rpc('acknowledge_referral', { p_id: id })); await done('Receipt acknowledged'); }
      catch (e) { toast(errText(e), 'alert-triangle'); }
      return;
    }
    if (kind === 'arrived') {
      try { rpcOrThrow(await S.sb.rpc('mark_patient_arrived', { p_id: id })); await done('Patient marked as arrived'); }
      catch (e) { toast(errText(e), 'alert-triangle'); }
      return;
    }
    if (kind === 'accept') {
      ask({ title: 'Accept this referral', intro: 'The referring facility will see that the patient is expected.', back, confirm: 'Accept referral',
        fields: [{ name: 'note', label: 'Note to the referring facility (optional)', type: 'textarea', placeholder: 'e.g. Send the patient to the emergency ward' }],
        submit: async v => { rpcOrThrow(await S.sb.rpc('respond_referral', { p_id: id, p_decision: 'accepted', p_reason: v.note || null })); await done('Referral accepted'); } });
      return;
    }
    if (kind === 'reject') {
      ask({ title: 'Reject this referral', intro: 'Say why, so the referring facility can act quickly.', back, confirm: 'Reject referral',
        fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true, min: 3, placeholder: 'e.g. No bed available, service not offered' }],
        submit: async v => { rpcOrThrow(await S.sb.rpc('respond_referral', { p_id: id, p_decision: 'rejected', p_reason: v.reason })); await done('Referral rejected'); } });
      return;
    }
    if (kind === 'redirect') {
      const skip = new Set([r.from_facility_id, r.to_facility_id].concat(r.previous_facility_ids || []));
      ask({ title: 'Redirect to another facility', intro: 'The referral moves to the facility you choose. You will still be able to see it.', back, confirm: 'Redirect',
        picker: { exclude: () => skip, home: () => S.facilities.get(r.to_facility_id) || null },
        fields: [
          { name: 'target', label: 'New receiving facility', type: 'picker', required: true, requiredMsg: 'Choose the facility to redirect to.' },
          { name: 'reason', label: 'Reason for redirecting', type: 'textarea', required: true, min: 3, placeholder: 'e.g. We do not offer this service' }
        ],
        submit: async v => { rpcOrThrow(await S.sb.rpc('respond_referral', { p_id: id, p_decision: 'redirected', p_reason: v.reason, p_redirect_to: v.target })); toast('Referral redirected', 'corner-up-right'); await refresh(true); closeModal(); } });
      return;
    }
    if (kind === 'complete') {
      const hubText = await hubSummary(r);
      ask({ title: 'Complete this referral', intro: hubText ? 'The feedback was filled in from the hospital desk visit. Check it before completing.' : 'Tell the referring facility what happened to the patient.', back, confirm: 'Complete referral',
        fields: [
          { name: 'outcome', label: 'Outcome', type: 'select', value: 'treated_and_discharged', options: Object.keys(OUTCOMES).map(k => [k, OUTCOMES[k]]) },
          { name: 'feedback', label: 'Feedback to the referring facility', type: 'textarea', required: true, min: 3, value: hubText, rows: 5, placeholder: 'Diagnosis, treatment given and any follow-up needed' }
        ],
        submit: async v => { rpcOrThrow(await S.sb.rpc('complete_referral', { p_id: id, p_outcome: v.outcome, p_feedback: v.feedback })); await done('Referral completed'); } });
      return;
    }
    if (kind === 'cancel') {
      ask({ title: 'Cancel this referral', intro: 'The receiving facility will see that it was cancelled.', back, confirm: 'Cancel referral',
        fields: [{ name: 'reason', label: 'Reason (optional)', type: 'textarea', placeholder: 'e.g. Patient was treated here instead' }],
        submit: async v => { rpcOrThrow(await S.sb.rpc('cancel_referral', { p_id: id, p_reason: v.reason || null })); await done('Referral cancelled'); } });
    }
  }

  function subscribe() {
    try {
      S.channel = S.sb.channel('rc-referrals').on('postgres_changes', { event: '*', schema: 'public', table: 'referrals' }, () => {
        clearTimeout(S.timer);
        S.timer = setTimeout(() => refresh(true), 500);
      }).subscribe();
    } catch (e) {}
  }

  function bind() {
    document.addEventListener('click', ev => {
      const t = ev.target;
      const tab = t.closest('[data-tab]');
      if (tab) { S.tab = tab.dataset.tab; render(); return; }
      const pend = t.closest('[data-pend]');
      if (pend) { pendingAction(pend.dataset.pend, pend.dataset.cref); return; }
      const flt = t.closest('[data-filter]');
      if (flt) { S.filter = flt.dataset.filter; render(); return; }
      const open = t.closest('[data-open]');
      if (open) { openDetail(open.dataset.open); return; }
      const doBtn = t.closest('[data-do]');
      if (doBtn) { runAction(doBtn.dataset.do, doBtn.dataset.id); return; }
      if (t.closest('#new-referral-btn')) { openForm({ mode: 'new' }); return; }
      if (t.hasAttribute && t.hasAttribute('data-close')) { closeModal(); return; }
      const act = t.closest('[data-act]');
      if (!act) return;
      const k = act.dataset.act;
      if (k === 'new-facility') newFacility();
      else if (k === 'edit-facility') editFacility(act.dataset.fid);
      else if (k === 'add-member') addMember(act.dataset.fid);
      else if (k === 'rm-member') removeMember(act.dataset.fid, act.dataset.uid, act.dataset.name);
    });
    document.addEventListener('change', ev => {
      const sel = ev.target.closest && ev.target.closest('[data-role-change]');
      if (sel) changeRole(sel);
    });
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && !$('#modal-root').classList.contains('hidden')) closeModal();
    });
    document.addEventListener('input', ev => {
      if (ev.target && ev.target.id === 'search-box') { S.q = ev.target.value; render(); }
    });
    window.addEventListener('online', () => {
      connect().then(() => {
        if (S.sb && S.uid && !S.channel) subscribe();
        return refresh(true);
      });
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(true); });
  }

  async function boot() {
    if (typeof RC === 'undefined' || !RC.requireSession()) return;
    bind();
    if (loadCache()) render();
    render();
    const params = new URLSearchParams(window.location.search);
    const wantNew = params.get('new');
    const wantOpen = params.get('open');
    if (wantNew || wantOpen) { try { history.replaceState(null, '', window.location.pathname); } catch (e) {} }
    await connect();
    if (wantNew) openForm({ mode: 'new', pid: wantNew === '1' ? '' : wantNew });
    await refresh(false);
    if (wantOpen) openDetail(wantOpen);
    if (S.sb && S.uid && !S.channel) subscribe();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();