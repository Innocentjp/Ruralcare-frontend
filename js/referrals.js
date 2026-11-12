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
  const URGENCY = { 
    routine: ['Routine', 'pill-neutral'], 
    urgent: ['Urgent', 'pill-critical offline-pulse'], 
    emergency: ['Emergency', 'pill-critical offline-pulse'] 
  };
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
    edited: 'Referral details edited',
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
          await S.sb.rpc('create_referral', {
            p_from: item.from,
            p_to: item.to,
            p_urgency: item.urgency,
            p_required_service: item.service || null,
            p_reason: item.reason,
            p_patient: item.patient,
            p_care: item.care,
            p_client_ref: item.cref
          });
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
      from: facModel(S.facilities.get(item.from) || { name: 'Local Facility' }),
      to: facModel(S.facilities.get(item.to)),
      patient: item.patient,
      reason: item.reason,
      service: item.service,
      care: item.care,
      clinician: (item.care && item.care.clinician) || {},
      pending: true
    };
  }

  function facModel(f) {
    return f ? { name: f.name, type: f.facility_type, lga: f.lga, state: f.state, phone: f.phone } : { name: 'Facility' };
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
        '<div class="flex flex-wrap gap-2 pt-1"><button type="button" data-pend="edit" data-cref="' + esc(x.cref) + '" class="btn-secondary px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i><span>Edit</span></button><button type="button" data-pend="print" data-cref="' + esc(x.cref) + '" class="btn-secondary px-3 py-1.5 text-[12px] inline-flex items-center gap-1.5"><i data-lucide="printer" class="w-3.5 h-3.5"></i><span>Print form</span></button>' +
        (x.failed ? '<button type="button" data-pend="retry" data-cref="' + esc(x.cref) + '" class="btn-secondary px-3 py-1.5 text-[12px]">Try again</button>' : '') +
        '<button type="button" data-pend="del" data-cref="' + esc(x.cref) + '" class="text-[12px] font-semibold text-[#DC2626] px-2 py-1">Remove</button></div></div>';
    }).join('');
  }

  function pendingAction(kind, cref) {
    const item = outbox().find(x => x.cref === cref);
    if (!item) return;
    if (kind === 'print') { printReferral(modelFromPending(item)); return; }
    if (kind === 'edit') { openForm({ edit: item }); return; }
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
  const toast = (m, i) => { try { RC.toast(m, i); } catch (e) {} };
  const myIds = () => new Set(S.memberships.map(m => m.facility_id));
  const facGet = id => S.facilities.get(id) || null;
  const facName = id => { const f = facGet(id); return f ? f.name : 'Another facility'; };
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
      $('#notice').className = 'hidden';
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
    } else {
      const gate = !S.uid
        ? emptyState('log-in', 'Sign in online to use referrals', 'You can still start a new referral and print the form to send with the patient.')
        : !S.memberships.length
          ? emptyState('building-2', 'Set up your facility first', 'Open the My facility tab to register your facility or ask its admin to add your email.')
          : '';
      const list = filtered(S.tab === 'inbox' ? inbox : sent);
      panel.innerHTML = gate + (list.length
        ? list.map(refCard).join('')
        : gate ? '' : emptyState(S.tab === 'inbox' ? 'inbox' : 'send', S.tab === 'inbox' ? 'No referrals to show' : 'Nothing sent yet', S.tab === 'inbox' ? 'Referrals sent to your facility will appear here.' : 'Use New referral to send a patient to another facility.'));
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
    const services = (f.services || []).map(s => '<span class="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-[11.5px] font-semibold">' + esc(s) + '</span>').join(' ') || '<span class="text-[12.5px] text-slate-500">No services listed yet.</span>';
    return '<div class="card p-5 sm:p-6 space-y-4">' +
      '<div class="flex flex-wrap items-start justify-between gap-3"><div>' +
        '<p class="text-[17px] font-bold text-headingDark dark:text-white">' + esc(f.name) + '</p>' +
        '<p class="text-[12.5px] text-slate-500 mt-0.5">' + esc(TYPES[f.facility_type] || f.facility_type) + ' \u00B7 ' + esc(f.lga) + ', ' + esc(f.state) + '</p></div>' +
        '<div class="flex items-center gap-2 flex-wrap">' + (f.verified ? '<span class="pill pill-success"><span class="pill-dot"></span>Verified</span>' : '<span class="pill pill-neutral"><span class="pill-dot"></span>Not verified</span>') +
        '<span class="pill pill-info"><span class="pill-dot"></span>' + esc(ROLES[m.member_role]) + '</span>' +
        (admin ? '<button type="button" data-act="edit-facility" data-fid="' + esc(f.id) + '" class="btn-secondary px-3 py-1.5 text-[12px]">Edit details</button>' : '') + '</div></div>' +
      '<dl class="dl-grid"><div><dt>Address / community</dt><dd>' + esc(f.address || '\u2014') + '</dd></div><div><dt>Phone</dt><dd>' + esc(f.phone || '\u2014') + '</dd></div></dl>' +
      '<div><p class="sec-title mb-2">Services offered</p><div class="flex flex-wrap gap-1.5">' + services + '</div></div>' +
    '</div>';
  }

  document.addEventListener('DOMContentLoaded', async () => {
    RC.requireSession();
    bindEvents();
    loadCache();
    render();
    await connect();
    await refresh(true);
    const p = new URLSearchParams(location.search);
    if (p.get('new')) openForm({ patientId: p.get('new') });
  });

  function bindEvents() {
    $$('.tab-btn').forEach(b => b.addEventListener('click', () => { S.tab = b.dataset.tab; render(); }));
    $$('#filter-bar .chip').forEach(b => b.addEventListener('click', () => { S.filter = b.dataset.filter; render(); }));
    $('#search-box').addEventListener('input', e => { S.q = e.target.value; render(); });
    $('#new-referral-btn').addEventListener('click', () => openForm());
    document.addEventListener('click', e => {
      const card = e.target.closest('[data-open]');
      if (card) { openDetail(card.dataset.open); return; }
      const act = e.target.closest('[data-act]');
      if (act) { handleAction(act.dataset.act, act); return; }
      const pend = e.target.closest('[data-pend]');
      if (pend) { pendingAction(pend.dataset.pend, pend.dataset.cref); return; }
    });
  }

  function handleAction(act, el) {
    if (act === 'new-facility') openFacilityForm();
  }

  function openFacilityForm() {
    const fields = [
      { id: 'f-name', label: 'Facility name', type: 'text', required: true },
      { id: 'f-type', label: 'Type', type: 'select', options: Object.keys(TYPES).map(k => ({ value: k, label: TYPES[k] })) },
      { id: 'f-state', label: 'State', type: 'select', options: ['Enugu', 'Lagos', 'Anambra', 'Oyo', 'Rivers'].map(s => ({ value: s, label: s })) },
      { id: 'f-lga', label: 'LGA / District', type: 'text', required: true },
      { id: 'f-phone', label: 'Phone', type: 'tel' },
      { id: 'f-address', label: 'Address', type: 'text' }
    ];
    ask({
      title: 'Register facility',
      intro: 'Register your primary health centre or hospital to send and receive referrals.',
      fields,
      confirm: 'Register',
      submit: async d => {
        if (!d['f-name'] || !d['f-lga']) throw new Error('Fill in facility name and LGA.');
        const sb = S.sb;
        const res = await sb.from('facilities').insert({
          name: d['f-name'],
          facility_type: d['f-type'],
          state: d['f-state'],
          lga: d['f-lga'],
          phone: d['f-phone'],
          address: d['f-address'],
          services: ['General Outpatient', 'Emergency', 'Maternal Health']
        }).select(FAC).single();
        if (res.error) throw res.error;
        await sb.from('facility_members').insert({ facility_id: res.data.id, user_id: S.uid, member_role: 'facility_admin' });
        toast('Facility registered', 'building-2');
        closeModal();
        refresh();
      }
    });
  }

  function openForm(opts) {
    opts = opts || {};
    const patients = RC.getPatients();
    let sel = opts.patientId ? patients.find(p => p.id === opts.patientId) : patients[0];
    const editing = opts.edit;
    const d = editing || {
      patient: sel ? { name: sel.name, age: sel.age, gender: sel.gender, contact: sel.contact, id: sel.id } : {},
      urgency: 'routine',
      service: '',
      reason: '',
      care: { vitals: sel ? sel.vitals : {}, symptoms: sel ? sel.symptoms : [] }
    };
    const modal = $('#modal-root');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center';
    modal.innerHTML = '<div class="absolute inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm" onclick="closeModal()"></div>' +
      '<div class="relative w-full max-w-[700px] px-4 max-h-[92vh] overflow-y-auto"><div class="card p-6 space-y-5">' +
      '<div class="flex justify-between items-center"><h3 class="text-[17px] font-bold text-headingDark dark:text-white">New referral</h3><button onclick="closeModal()" class="text-slate-400 hover:text-headingDark"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      '<form id="ref-form" class="space-y-4">' +
        '<div><label class="lbl">Patient</label><select id="rf-pat" class="input-field"><option value="">Select patient or enter manually</option>' +
        patients.map(p => '<option value="' + esc(p.id) + '"' + (sel && sel.id === p.id ? ' selected' : '') + '>' + esc(p.name) + ' (' + esc(p.id) + ')</option>').join('') + '</select></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="lbl">Patient name</label><input type="text" id="rf-name" class="input-field" value="' + esc(d.patient.name || '') + '" required></div>' +
        '<div><label class="lbl">Age & gender</label><div class="grid grid-cols-2 gap-2"><input type="text" id="rf-age" class="input-field" placeholder="Age" value="' + esc(d.patient.age || '') + '">' +
        '<input type="text" id="rf-gender" class="input-field" placeholder="Gender" value="' + esc(d.patient.gender || '') + '"></div></div></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="lbl">Sending facility</label><select id="rf-from" class="input-field">' +
        S.memberships.map(m => '<option value="' + esc(m.facility_id) + '">' + esc(m.facility.name) + '</option>').join('') + '</select></div>' +
        '<div><label class="lbl">Receiving facility</label><select id="rf-to" class="input-field">' +
        Array.from(S.facilities.values()).map(f => '<option value="' + esc(f.id) + '">' + esc(f.name) + ' (' + esc(f.lga) + ')</option>').join('') + '</select></div></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label class="lbl">Urgency</label><select id="rf-urgency" class="input-field">' +
        Object.keys(URGENCY).map(k => '<option value="' + k + '"' + (d.urgency === k ? ' selected' : '') + '>' + URGENCY[k][0] + '</option>').join('') + '</select></div>' +
        '<div><label class="lbl">Required service</label><input type="text" id="rf-service" class="input-field" placeholder="e.g. Surgery, Obstetrics" value="' + esc(d.service || '') + '"></div></div>' +
        '<div><label class="lbl">Reason for referral &amp; clinical findings</label><textarea id="rf-reason" rows="3" class="input-field" required>' + esc(d.reason || '') + '</textarea></div>' +
        '<div class="flex gap-3 pt-2"><button type="button" onclick="closeModal()" class="flex-1 py-3 rounded-xl border text-[13px] font-semibold">Cancel</button>' +
        '<button type="submit" class="flex-1 btn-primary py-3 text-[13px]">Send referral</button></div>' +
      '</form></div></div>';
    icons();

    $('#rf-pat').addEventListener('change', e => {
      const p = patients.find(x => x.id === e.target.value);
      if (!p) return;
      $('#rf-name').value = p.name || '';
      $('#rf-age').value = p.age || '';
      $('#rf-gender').value = p.gender || '';
    });

    $('#ref-form').addEventListener('submit', async e => {
      e.preventDefault();
      const patient = { name: $('#rf-name').value, age: $('#rf-age').value, gender: $('#rf-gender').value, id: $('#rf-pat').value || 'MANUAL' };
      const from = $('#rf-from').value;
      const to = $('#rf-to').value;
      const urgency = $('#rf-urgency').value;
      const service = $('#rf-service').value;
      const reason = $('#rf-reason').value;
      const care = { vitals: sel ? sel.vitals : {}, symptoms: sel ? sel.symptoms : [] };
      const cref = editing ? editing.cref : newClientRef();

      if (!S.uid || !navigator.onLine) {
        queueReferral($('#ref-form'), { from, to, urgency, service, reason, patient, care }, cref);
        return;
      }
      try {
        await S.sb.rpc('create_referral', {
          p_from: from,
          p_to: to,
          p_urgency: urgency,
          p_required_service: service || null,
          p_reason: reason,
          p_patient: patient,
          p_care: care,
          p_client_ref: cref
        });
        closeModal();
        toast('Referral sent', 'send');
        refresh();
      } catch (err) {
        toast(errText(err), 'alert-triangle');
      }
    });
  }

  function openDetail(id) {
    const r = S.referrals.find(x => x.id === id);
    if (!r) return;
    const p = r.patient || {};
    const modal = $('#modal-root');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center';
    modal.innerHTML = '<div class="absolute inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm" onclick="closeModal()"></div>' +
      '<div class="relative w-full max-w-[700px] px-4 max-h-[92vh] overflow-y-auto"><div class="card p-6 space-y-5">' +
      '<div class="flex justify-between items-center"><div class="flex items-center gap-2 flex-wrap"><span class="font-mono text-[13px] font-bold px-2.5 py-1 rounded bg-slate-100 dark:bg-white/5">' + esc(r.ref_code) + '</span>' + pill(URGENCY, r.urgency) + pill(STATUS, r.status) + '</div>' +
      '<button onclick="closeModal()" class="text-slate-400 hover:text-headingDark"><i data-lucide="x" class="w-5 h-5"></i></button></div>' +
      '<div class="card p-4 space-y-2"><p class="text-[17px] font-bold text-headingDark dark:text-white">' + esc(p.name) + '</p>' +
      '<p class="text-[13px] text-slate-600 dark:text-slate-400">From <strong>' + esc(facName(r.from_facility_id)) + '</strong> to <strong>' + esc(facName(r.to_facility_id)) + '</strong></p>' +
      '<p class="text-[13px] text-slate-700 dark:text-slate-300 mt-2">' + esc(r.reason) + '</p></div>' +
      '<div class="flex gap-2"><button type="button" onclick="printReferral(\'' + esc(r.id) + '\')" class="btn-secondary px-4 py-2.5 text-[13px] inline-flex items-center gap-2"><i data-lucide="printer" class="w-4 h-4"><span>Print form</span></button></div>' +
      '</div></div>';
    icons();
  }

  function printReferral(r) {
    if (typeof r === 'string') r = S.referrals.find(x => x.id === r);
    if (!r) return;
    const p = r.patient || {};
    const f = r.from || {};
    const t = r.to || {};
    const html = '<div class="ps p-8"><h2 class="text-xl font-bold">RURALCARE REFERRAL FORM</h2>' +
      '<p class="mt-2">Ref: ' + esc(r.ref_code || r.ref) + '</p>' +
      '<p class="mt-4"><strong>Patient:</strong> ' + esc(p.name) + '</p>' +
      '<p class="mt-2"><strong>From:</strong> ' + esc(f.name) + '</p>' +
      '<p class="mt-2"><strong>To:</strong> ' + esc(t.name) + '</p>' +
      '<p class="mt-4"><strong>Reason:</strong> ' + esc(r.reason) + '</p></div>';
    $('#print-root').innerHTML = html;
    window.print();
  }

  function closeModal() {
    const modal = $('#modal-root');
    modal.className = 'hidden';
    modal.innerHTML = '';
  }

  function ask(opts) {
    const modal = $('#modal-root');
    modal.className = 'fixed inset-0 z-[60] flex items-center justify-center';
    modal.innerHTML = '<div class="absolute inset-0 bg-[#0D1B2A]/60 backdrop-blur-sm" onclick="closeModal()"></div>' +
      '<div class="relative w-full max-w-[440px] px-4"><div class="card p-6 space-y-4">' +
      '<h3 class="text-[17px] font-bold text-headingDark dark:text-white">' + esc(opts.title) + '</h3>' +
      '<p class="text-[13px] text-slate-500">' + esc(opts.intro) + '</p>' +
      '<form id="ask-form" class="space-y-3">' +
      (opts.fields || []).map(f => '<div><label class="lbl">' + esc(f.label) + '</label>' +
        (f.type === 'select' ? '<select id="' + f.id + '" class="input-field">' + f.options.map(o => '<option value="' + o.value + '">' + esc(o.label) + '</option>').join('') + '</select>'
        : '<input type="' + (f.type || 'text') + '" id="' + f.id + '" class="input-field" ' + (f.required ? 'required' : '') + '>') + '</div>').join('') +
      '<div class="flex gap-3 pt-2"><button type="button" onclick="closeModal()" class="flex-1 py-2.5 rounded-xl border text-[13px] font-semibold">Cancel</button>' +
      '<button type="submit" class="flex-1 btn-primary py-2.5 text-[13px]">' + esc(opts.confirm || 'Submit') + '</button></div>' +
      '</form></div></div>';
    icons();
    $('#ask-form').addEventListener('submit', e => {
      e.preventDefault();
      const d = {};
      (opts.fields || []).forEach(f => { d[f.id] = $('#' + f.id).value; });
      opts.submit(d);
    });
  }

  window.closeModal = closeModal;
  window.printReferral = printReferral;
})();