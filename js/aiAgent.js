const RCAgent = (() => {
  let ready = false;
  let busy = false;

  const T = {
    fever: 38.0,
    bpCritSys: 160,
    bpCritDia: 100,
    bpWarnSys: 130,
    bpWarnDia: 85,
    spo2Crit: 92,
    spo2Warn: 95
  };

  const SOP = {
    fever: {
      title: 'Fever and Malaria Protocol',
      keys: ['fever', 'temperature', 'temp', 'malaria', 'rdt', 'hot', 'chills'],
      lines: [
        'Fever threshold: axillary or oral temperature of 38.0 C or higher.',
        'Ask about duration, chills, headache, body aches, vomiting and recent travel or mosquito exposure.',
        'Perform a malaria RDT for every fever case in an endemic area. Treat a positive result per national guidelines.',
        'Give oral fluids and continue feeding. Give paracetamol for comfort at the correct weight-based dose.',
        'Refer urgently if any danger sign is present: convulsions, lethargy or unconsciousness, unable to drink or breastfeed, repeated vomiting, stiff neck, severe pallor, or dark urine.',
        'Refer any febrile infant under 2 months. Reassess within 24 hours if fever persists.'
      ]
    },
    hypertension: {
      title: 'Blood Pressure Triage',
      keys: ['bp', 'blood pressure', 'pressure', 'hypertension', 'hypertensive', 'systolic', 'diastolic'],
      lines: [
        'Normal: below 120/80 mmHg.',
        'Elevated: systolic 130 to 159 or diastolic 85 to 99 mmHg. Rest the patient for 5 minutes and measure again on the other arm.',
        'Severe: systolic 160 or higher or diastolic 100 or higher. Confirm with a repeat reading.',
        'Hypertensive urgency: severe reading with headache, dizziness or blurred vision. Keep the patient calm and seated, and refer the same day.',
        'Hypertensive emergency: 180/120 or higher with chest pain, confusion, weakness, speech difficulty, seizure or breathlessness. Refer immediately as an emergency.',
        'In pregnancy, any severe reading needs urgent referral because of pre-eclampsia risk.'
      ]
    },
    respiratory: {
      title: 'Respiratory Distress and SpO2 Protocol',
      keys: ['spo2', 'oxygen', 'saturation', 'breath', 'breathing', 'respiratory', 'cough', 'pneumonia', 'hypoxia', 'hypoxemia'],
      lines: [
        'Normal SpO2: 95 to 100 percent on room air.',
        'Mild hypoxia: 92 to 94 percent. Look for chest infection or congestion, keep the patient upright and monitor closely.',
        'Critical: below 92 percent. Check airway and breathing, sit the patient upright, give oxygen if available and prioritise urgent referral.',
        'Fast breathing thresholds: under 2 months 60 or more per minute, 2 to 11 months 50 or more, 1 to 5 years 40 or more.',
        'Danger signs: chest indrawing, stridor at rest, cyanosis, grunting, inability to speak in full sentences.',
        'Recheck the probe placement and warm the finger before trusting a low reading.'
      ]
    },
    dehydration: {
      title: 'Dehydration and ORS Guidelines',
      keys: ['dehydration', 'dehydrated', 'ors', 'diarrhea', 'diarrhoea', 'vomiting', 'rehydration', 'zinc'],
      lines: [
        'Assess alertness, sunken eyes, ability to drink, skin pinch return and mucous membranes.',
        'No dehydration: give extra fluids and continue feeding at home, and advise on danger signs.',
        'Some dehydration: give ORS about 75 ml per kg over 4 hours, then reassess.',
        'Severe dehydration: lethargy, unable to drink, very slow skin pinch. Start IV fluids if trained and equipped, and refer urgently.',
        'Give zinc for 10 to 14 days in children with diarrhea: 10 mg daily under 6 months, 20 mg daily from 6 months.',
        'Escalate for blood in stool, persistent vomiting, severe lethargy or diarrhea lasting over 14 days.'
      ]
    }
  };

  const CHIPS = [
    { label: 'Queue summary', q: 'queue summary' },
    { label: 'Critical patients', q: 'critical patients' },
    { label: 'Fever protocol', q: 'fever protocol' },
    { label: 'BP guidelines', q: 'blood pressure guidelines' },
    { label: 'SpO2 protocol', q: 'spo2 protocol' },
    { label: 'ORS guidelines', q: 'dehydration ors' }
  ];

  function num(v) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }

  function vitalsOf(p) {
    const v = (p && p.vitals) || {};
    return {
      sys: num(v.bpSys),
      dia: num(v.bpDia),
      temp: num(v.temp),
      spo2: num(v.spo2 !== undefined ? v.spo2 : v.spO2 !== undefined ? v.spO2 : v.oxygen),
      hr: num(v.hr !== undefined ? v.hr : v.heartRate !== undefined ? v.heartRate : v.pulse)
    };
  }

  function flagsOf(p) {
    const v = vitalsOf(p);
    const flags = [];
    if (v.temp !== null && v.temp >= T.fever) flags.push({ kind: 'fever', level: v.temp >= 39.5 ? 'critical' : 'warning', text: 'Fever ' + v.temp + ' C' });
    if (v.sys !== null && v.dia !== null) {
      if (v.sys >= T.bpCritSys || v.dia >= T.bpCritDia) flags.push({ kind: 'bp', level: 'critical', text: 'Severe BP ' + v.sys + '/' + v.dia });
      else if (v.sys >= T.bpWarnSys || v.dia >= T.bpWarnDia) flags.push({ kind: 'bp', level: 'warning', text: 'Elevated BP ' + v.sys + '/' + v.dia });
    }
    if (v.spo2 !== null) {
      if (v.spo2 < T.spo2Crit) flags.push({ kind: 'spo2', level: 'critical', text: 'Low SpO2 ' + v.spo2 + '%' });
      else if (v.spo2 < T.spo2Warn) flags.push({ kind: 'spo2', level: 'warning', text: 'Borderline SpO2 ' + v.spo2 + '%' });
    }
    return flags;
  }

  function severityOf(p) {
    try {
      if (typeof RC !== 'undefined' && typeof RC.overallSeverity === 'function') {
        const s = RC.overallSeverity(p);
        if (s) return s;
      }
    } catch (e) {}
    const f = flagsOf(p);
    if (f.some(x => x.level === 'critical')) return 'critical';
    if (f.length) return 'warning';
    return 'normal';
  }

  function getPatients() {
    try {
      if (typeof RC !== 'undefined' && typeof RC.getPatients === 'function') {
        const list = RC.getPatients();
        return Array.isArray(list) ? list : [];
      }
    } catch (e) {}
    return [];
  }

  function fmtVitals(p) {
    const v = vitalsOf(p);
    const parts = [];
    if (v.sys !== null && v.dia !== null) parts.push('BP ' + v.sys + '/' + v.dia);
    if (v.temp !== null) parts.push('Temp ' + v.temp + ' C');
    if (v.spo2 !== null) parts.push('SpO2 ' + v.spo2 + '%');
    if (v.hr !== null) parts.push('HR ' + v.hr);
    return parts.length ? parts.join(' | ') : 'No vitals recorded';
  }

  function label(p) {
    return (p.name || 'Unnamed patient') + (p.id ? ' (' + p.id + ')' : '');
  }

  function listPatients(title, list, withFlags) {
    if (!list.length) return null;
    const shown = list.slice(0, 8);
    let out = title + ' (' + list.length + '):\n';
    shown.forEach(p => {
      out += '- ' + label(p) + '\n  ' + fmtVitals(p) + '\n';
      if (withFlags) {
        const f = flagsOf(p);
        if (f.length) out += '  Flags: ' + f.map(x => x.text).join('; ') + '\n';
      }
    });
    if (list.length > shown.length) out += '...and ' + (list.length - shown.length) + ' more. Open the dashboard for the full list.\n';
    return out.trim();
  }

  function has(q, words) {
    return words.some(w => q.includes(w));
  }

  function sopReply(key) {
    const s = SOP[key];
    return s.title.toUpperCase() + '\n' + s.lines.map(l => '- ' + l).join('\n') +
      '\n\nThis is decision support based on primary healthcare triage guidance. It does not replace clinical judgement or local protocols.';
  }

  function findPatient(q, patients) {
    const tokens = q.split(/[^a-z0-9\-]+/).filter(t => t.length > 2);
    let best = null;
    let bestScore = 0;
    patients.forEach(p => {
      const name = String(p.name || '').toLowerCase();
      const id = String(p.id || '').toLowerCase();
      let score = 0;
      if (id && q.includes(id)) score += 10;
      name.split(/\s+/).forEach(part => {
        if (part.length > 2 && tokens.includes(part)) score += 3;
      });
      if (name && q.includes(name)) score += 5;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    });
    return bestScore >= 3 ? best : null;
  }

  function patientReply(p) {
    const f = flagsOf(p);
    const sev = severityOf(p);
    let out = 'PATIENT SUMMARY\n' + label(p) + '\n';
    if (p.age !== undefined && p.age !== null && p.age !== '') out += 'Age: ' + p.age + '\n';
    out += 'Status: ' + (p.status === 'queued' ? 'Awaiting sync' : (p.status || 'Recorded')) + '\n';
    out += 'Triage level: ' + sev + '\n';
    out += 'Vitals: ' + fmtVitals(p) + '\n';
    if (f.length) {
      out += '\nFlags:\n' + f.map(x => '- ' + x.text + ' (' + x.level + ')').join('\n');
      const kinds = [...new Set(f.map(x => x.kind))];
      const map = { fever: 'fever', bp: 'hypertension', spo2: 'respiratory' };
      out += '\n\nRecommended protocol' + (kinds.length > 1 ? 's' : '') + ': ' + kinds.map(k => SOP[map[k]].title).join('; ') + '. Ask me for any of these by name.';
    } else {
      out += '\nNo vital sign flags against the standard thresholds.';
    }
    return out;
  }

  function queueReply(patients) {
    const queued = patients.filter(p => p.status === 'queued').length;
    const sev = { critical: 0, warning: 0, normal: 0 };
    patients.forEach(p => {
      const s = severityOf(p);
      if (s === 'critical') sev.critical++;
      else if (s === 'warning' || s === 'elevated' || s === 'moderate') sev.warning++;
      else sev.normal++;
    });
    return 'QUEUE OVERVIEW\n' +
      '- Total registered: ' + patients.length + '\n' +
      '- Awaiting sync: ' + queued + '\n' +
      '- Synced: ' + (patients.length - queued) + '\n' +
      '- Critical: ' + sev.critical + '\n' +
      '- Warning: ' + sev.warning + '\n' +
      '- Stable: ' + sev.normal;
  }

  function respond(raw) {
    const q = String(raw || '').toLowerCase().trim();
    const patients = getPatients();

    if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(q)) {
      return 'Hello. I can report on your local patient queue, flag critical vitals and walk you through triage protocols for fever and malaria, blood pressure, low oxygen saturation and dehydration. Everything runs on this device.';
    }

    if (has(q, ['help', 'what can you', 'commands', 'options'])) {
      return 'You can ask me:\n- "Queue summary" or "how many patients"\n- "Critical patients" or "who is urgent"\n- "High blood pressure patients", "low oxygen patients", "patients with fever"\n- "Show patient <name or ID>"\n- "Fever protocol", "BP guidelines", "SpO2 protocol", "ORS guidelines"';
    }

    const patient = patients.length ? findPatient(q, patients) : null;
    if (patient) return patientReply(patient);

    if (has(q, ['critical', 'urgent', 'emergency', 'flagged', 'flag', 'priority', 'danger'])) {
      const list = patients.filter(p => severityOf(p) === 'critical');
      if (!patients.length) return 'No patient records found on this device yet.';
      return listPatients('CRITICAL PATIENTS', list, true) || 'No patients are currently flagged critical in the local queue.';
    }

    const wantsList = has(q, ['patients', 'who', 'list', 'show', 'any', 'which', 'how many']);

    if (wantsList && has(q, ['high bp', 'hypertens', 'blood pressure', 'bp'])) {
      const list = patients.filter(p => flagsOf(p).some(f => f.kind === 'bp'));
      if (!patients.length) return 'No patient records found on this device yet.';
      return listPatients('PATIENTS WITH BP FLAGS', list, true) || 'No patients have elevated or severe blood pressure readings.';
    }

    if (wantsList && has(q, ['spo2', 'oxygen', 'saturation', 'hypox'])) {
      const list = patients.filter(p => flagsOf(p).some(f => f.kind === 'spo2'));
      if (!patients.length) return 'No patient records found on this device yet.';
      return listPatients('PATIENTS WITH SPO2 FLAGS', list, true) || 'No patients have low or borderline oxygen saturation.';
    }

    if (wantsList && has(q, ['fever', 'temperature', 'temp', 'malaria'])) {
      const list = patients.filter(p => flagsOf(p).some(f => f.kind === 'fever'));
      if (!patients.length) return 'No patient records found on this device yet.';
      return listPatients('PATIENTS WITH FEVER', list, true) || 'No patients currently meet the fever threshold of 38.0 C.';
    }

    if (has(q, ['pending', 'sync', 'queued', 'unsynced', 'offline queue'])) {
      const list = patients.filter(p => p.status === 'queued');
      if (!patients.length) return 'No patient records found on this device yet.';
      return listPatients('AWAITING SYNC', list, false) || 'All patient records on this device have been synced.';
    }

    if (has(q, ['queue', 'summary', 'overview', 'total', 'how many', 'statistics', 'stats', 'count', 'patients'])) {
      return patients.length ? queueReply(patients) : 'No patient records found on this device yet.';
    }

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

    if (has(q, ['diagnose', 'prescribe', 'dose', 'dosage'])) {
      return 'I provide triage guidance only. I cannot diagnose or prescribe. Please follow your national treatment guidelines and consult a supervising clinician for dosing decisions.';
    }

    return 'I did not understand that. Try "queue summary", "critical patients", "show patient <name>", or a protocol such as "fever protocol", "blood pressure guidelines", "spo2 protocol" or "ORS guidelines".';
  }

  function addMessage(sender, text) {
    const box = document.getElementById('rc-ai-messages');
    if (!box) return null;
    const row = document.createElement('div');
    row.className = 'flex ' + (sender === 'user' ? 'justify-end' : 'justify-start');
    const bubble = document.createElement('div');
    bubble.className = (sender === 'user'
      ? 'bg-[#2F80ED] text-white'
      : 'bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] shadow-sm border border-[#EDF1F7] dark:border-white/5') +
      ' px-3 py-2.5 rounded-xl max-w-[88%] whitespace-pre-wrap break-words leading-relaxed';
    bubble.textContent = text;
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
    addMessage('user', query);
    if (input) input.value = '';
    const typing = addMessage('ai', 'Reviewing local data...');
    setTimeout(() => {
      let reply;
      try {
        reply = respond(query);
      } catch (err) {
        reply = 'Something went wrong while reading local data. The rest of the app is unaffected. Please try again.';
      }
      if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
      addMessage('ai', reply);
      busy = false;
      if (input) input.focus();
    }, 250);
  }

  function open() {
    const box = document.getElementById('rc-ai-chatbox');
    const btn = document.getElementById('rc-ai-toggle');
    if (!box) return;
    box.classList.remove('hidden');
    box.classList.add('flex');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    const input = document.getElementById('rc-ai-input');
    if (input) setTimeout(() => input.focus(), 50);
  }

  function close() {
    const box = document.getElementById('rc-ai-chatbox');
    const btn = document.getElementById('rc-ai-toggle');
    if (!box) return;
    box.classList.add('hidden');
    box.classList.remove('flex');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function toggle() {
    const box = document.getElementById('rc-ai-chatbox');
    if (!box) return;
    if (box.classList.contains('hidden')) open();
    else close();
  }

  function build() {
    const container = document.createElement('div');
    container.id = 'rc-ai-widget';
    container.className = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[55]';
    container.innerHTML =
      '<button id="rc-ai-toggle" type="button" aria-label="Open clinical assistant" aria-expanded="false" aria-controls="rc-ai-chatbox" class="w-12 h-12 rounded-full bg-[#2F80ED] text-white shadow-lg flex items-center justify-center hover:bg-[#1C64F2] transition-transform hover:scale-105 cursor-pointer">' +
        '<i data-lucide="stethoscope" class="w-6 h-6"></i>' +
      '</button>' +
      '<div id="rc-ai-chatbox" role="dialog" aria-label="RuralCare clinical assistant" class="hidden absolute bottom-16 right-0 w-[calc(100vw-2rem)] max-w-[380px] h-[min(520px,calc(100vh-9rem))] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#EDF1F7] dark:border-white/10 flex-col overflow-hidden">' +
        '<div class="bg-[#2F80ED] text-white px-4 py-3 flex justify-between items-center shrink-0">' +
          '<div class="flex items-center gap-2.5 min-w-0">' +
            '<i data-lucide="stethoscope" class="w-5 h-5 shrink-0"></i>' +
            '<div class="min-w-0">' +
              '<h4 class="font-semibold text-[14px] leading-tight truncate">RuralCare Clinical Assistant</h4>' +
              '<p class="text-[11px] text-blue-100 leading-tight">On-device triage support. No data leaves this phone.</p>' +
            '</div>' +
          '</div>' +
          '<button id="rc-ai-close" type="button" aria-label="Close assistant" class="text-white hover:opacity-80 cursor-pointer shrink-0 ml-2"><i data-lucide="x" class="w-5 h-5"></i></button>' +
        '</div>' +
        '<div id="rc-ai-messages" aria-live="polite" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]"></div>' +
        '<div id="rc-ai-chips" class="px-3 py-2 flex gap-2 overflow-x-auto shrink-0 bg-[#F8FAFD] dark:bg-[#0A0E17] border-t border-[#EDF1F7] dark:border-white/5"></div>' +
        '<form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2 shrink-0">' +
          '<input type="text" id="rc-ai-input" autocomplete="off" placeholder="Ask about the queue or a protocol" class="input-field flex-1 text-[12.5px] py-2">' +
          '<button type="submit" class="bg-[#2F80ED] text-white px-3.5 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#1C64F2] cursor-pointer">Send</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(container);

    const chips = document.getElementById('rc-ai-chips');
    CHIPS.forEach(c => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = c.label;
      b.className = 'shrink-0 text-[11.5px] font-semibold px-3 py-1.5 rounded-full border border-[#2F80ED]/30 text-[#2F80ED] dark:text-[#6DA5F5] hover:bg-[#2F80ED]/10 transition-colors cursor-pointer whitespace-nowrap';
      b.addEventListener('click', () => submit(c.q));
      chips.appendChild(b);
    });

    document.getElementById('rc-ai-toggle').addEventListener('click', toggle);
    document.getElementById('rc-ai-close').addEventListener('click', close);
    document.getElementById('rc-ai-form').addEventListener('submit', e => {
      e.preventDefault();
      submit(document.getElementById('rc-ai-input').value);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });

    addMessage('ai', 'Hello. I am your offline clinical assistant. I can summarise your local patient queue, flag critical vitals and guide you through triage protocols. Choose a topic below or type a question.');

    try {
      if (window.lucide && typeof window.lucide.createIcons === 'function') window.lucide.createIcons();
    } catch (e) {}
  }

  function init() {
    if (ready || document.getElementById('rc-ai-widget') || !document.body) return;
    try {
      build();
      ready = true;
    } catch (err) {
      const stale = document.getElementById('rc-ai-widget');
      if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
      console.warn('[RCAgent] Skipped safely:', err);
    }
  }

  return { init, open, close, ask: submit };
})();

window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      RCAgent.init();
    } catch (e) {}
  }, 300);
});