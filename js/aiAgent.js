/*----- RURALCARE CLINICAL AI AGENT -----*/
const RCAgent = (() => {
  
  // Structured Clinical Knowledge Base (Lookup Dictionary)
  const KNOWLEDGE_BASE = {
    fever: {
      title: "Fever and Malaria Management Protocol",
      details: [
        "Assessment: Temperature >= 38.0°C indicates a fever. Evaluate for chills, headache, and body aches.",
        "Endemic Context: Suspect uncomplicated or severe malaria for sudden fever spikes in endemic zones.",
        "Immediate Action: Ensure oral hydration, administer antipyretics (e.g., Paracetamol), perform RDT if available, and queue for clinician review."
      ]
    },
    hypertension: {
      title: "Blood Pressure Triage Guidelines",
      details: [
        "Normal Range: Below 120/80 mmHg.",
        "Elevated / Warning: Systolic 130-159 or Diastolic 85-99 mmHg. Recheck after 5 minutes of rest.",
        "Critical / Urgent: Systolic >= 160 or Diastolic >= 100 mmHg with headache or dizziness indicates hypertensive urgency. Escalate immediately."
      ]
    },
    respiratory: {
      title: "Respiratory Distress and SpO2 Protocol",
      details: [
        "Normal SpO2: 95% - 100% on room air.",
        "Mild Hypoxia (92% - 94%): Evaluate for respiratory infection or chest congestion. Monitor closely.",
        "Critical (< 92%): High hypoxemia risk. Check airway and breathing, position upright, and prioritize for urgent medical escalation."
      ]
    },
    dehydration: {
      title: "Gastrointestinal and Dehydration Management",
      details: [
        "Assessment: Check skin turgor, mucous membranes, and patient alertness.",
        "Immediate Action: Administer Oral Rehydration Salts (ORS) solution immediately.",
        "Escalation: Flag as urgent if persistent vomiting, blood in stool, or severe lethargy is present."
      ]
    }
  };

  function init() {
    if (document.getElementById('rc-ai-widget')) return;

    const container = document.createElement('div');
    container.id = 'rc-ai-widget';
    container.className = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50';
    container.innerHTML = `
      <button id="rc-ai-toggle" aria-label="Toggle AI Assistant" class="w-12 h-12 rounded-full bg-[#2F80ED] text-white shadow-lg flex items-center justify-center hover:bg-[#1C64F2] transition-transform hover:scale-105 cursor-pointer">
        <i data-lucide="sparkles" class="w-6 h-6"></i>
      </button>
      <div id="rc-ai-chatbox" class="hidden absolute bottom-16 right-0 w-[340px] sm:w-[380px] h-[500px] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#EDF1F7] dark:border-white/10 flex flex-col overflow-hidden">
        <div class="bg-[#2F80ED] text-white p-4 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <i data-lucide="bot" class="w-5 h-5"></i>
            <div>
              <h4 class="font-bold text-[14px]">RuralCare Clinical AI</h4>
              <p class="text-[11px] text-blue-100">Offline Triage Assistant</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Clinical assistant active. Ask about queue status, vital sign thresholds, or primary healthcare protocols.
            </div>
          </div>
        </div>
        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Query patients, fever, BP, or SpO2..." class="input-field flex-1 text-[12.5px] py-2">
          <button type="submit" class="bg-[#2F80ED] text-white px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#1C64F2] cursor-pointer">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(container);
    if (window.lucide) lucide.createIcons();

    const toggleBtn = document.getElementById('rc-ai-toggle');
    const chatbox = document.getElementById('rc-ai-chatbox');
    const closeBtn = document.getElementById('rc-ai-close');
    const form = document.getElementById('rc-ai-form');
    const input = document.getElementById('rc-ai-input');
    const messages = document.getElementById('rc-ai-messages');

    toggleBtn.addEventListener('click', () => chatbox.classList.toggle('hidden'));
    closeBtn.addEventListener('click', () => chatbox.classList.add('hidden'));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query) return;

      messages.innerHTML += `<div class="flex justify-end"><div class="bg-[#2F80ED] text-white p-3 rounded-xl max-w-[85%]">${escapeHtml(query)}</div></div>`;
      input.value = '';
      messages.scrollTop = messages.scrollHeight;

      setTimeout(() => {
        const reply = processQuery(query);
        messages.innerHTML += `<div class="flex justify-start"><div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%] whitespace-pre-wrap">${reply}</div></div>`;
        messages.scrollTop = messages.scrollHeight;
        if (window.lucide) lucide.createIcons();
      }, 300);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function processQuery(query) {
    const q = query.toLowerCase();
    const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];
    const pending = patients.filter(p => p.status === 'queued').length;
    const criticals = patients.filter(p => typeof RC !== 'undefined' && RC.overallSeverity(p) === 'critical');

    // 1. Local Queue & Patient Checks
    if (q.includes('critical') || q.includes('urgent') || q.includes('flag')) {
      if (criticals.length === 0) return 'Status: No patients currently flagged with critical vitals in the active queue.';
      let output = `Found ${criticals.length} critical patient record(s):\n`;
      criticals.forEach(p => {
        output += `• ${p.name} (${p.id}) | BP: ${p.vitals.bpSys}/${p.vitals.bpDia} | Temp: ${p.vitals.temp}°C | SpO2: ${p.vitals.spo2}%\n`;
      });
      return output;
    }

    if (q.includes('patient') || q.includes('queue') || q.includes('summary')) {
      return `Queue Overview:\n• Total Registered: ${patients.length}\n• Awaiting Sync: ${pending}\n• Critical Flags: ${criticals.length}`;
    }

    // 2. Dynamic Knowledge Base Lookup
    if (q.includes('fever') || q.includes('temperature') || q.includes('malaria')) {
      return formatKnowledge(KNOWLEDGE_BASE.fever);
    }
    if (q.includes('bp') || q.includes('pressure') || q.includes('hypertension') || q.includes('headache')) {
      return formatKnowledge(KNOWLEDGE_BASE.hypertension);
    }
    if (q.includes('spo2') || q.includes('oxygen') || q.includes('breath') || q.includes('cough')) {
      return formatKnowledge(KNOWLEDGE_BASE.respiratory);
    }
    if (q.includes('diarrhea') || q.includes('dehydration') || q.includes('nausea') || q.includes('vomit')) {
      return formatKnowledge(KNOWLEDGE_BASE.dehydration);
    }

    // Default Guidance
    return `Available Clinical Protocols & Queries:\n` +
           `• Request patient summary or critical flags\n` +
           `• Query "fever protocol"\n` +
           `• Query "blood pressure guidelines"\n` +
           `• Query "SpO2 protocol"`;
  }

  function formatKnowledge(item) {
    return `[ ${item.title.toUpperCase()} ]\n` + item.details.map(d => `• ${d}`).join('\n');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  RCAgent.init();
});