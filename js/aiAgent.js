/*----- RURALCARE INTERACTIVE CLINICAL AI AGENT (STABLE) -----*/
const RCAgent = (() => {
  let conversationState = { lastTopic: null };

  const KNOWLEDGE_BASE = {
    fever: {
      title: "Fever and Malaria Management Protocol",
      details: [
        "Temperature >= 38.0°C indicates a fever. Evaluate for chills, headache, and body aches.",
        "Endemic Context: Suspect uncomplicated or severe malaria for sudden fever spikes in endemic zones.",
        "Immediate Action: Ensure oral hydration, administer antipyretics (e.g., Paracetamol), and perform an RDT if available."
      ]
    },
    hypertension: {
      title: "Blood Pressure Triage Guidelines",
      details: [
        "Normal Range: Below 120/80 mmHg.",
        "Elevated / Warning: Systolic 130-159 or Diastolic 85-99 mmHg. Recheck after 5 minutes of rest.",
        "Critical / Urgent: Systolic >= 160 or Diastolic >= 100 mmHg with headache or dizziness indicates hypertensive urgency."
      ]
    },
    respiratory: {
      title: "Respiratory Distress and SpO2 Protocol",
      details: [
        "Normal SpO2: 95% - 100% on room air.",
        "Mild Hypoxia (92% - 94%): Evaluate for respiratory infection or chest congestion. Monitor closely.",
        "Critical (< 92%): High hypoxemia risk. Check airway and breathing, position upright, and prioritize for urgent escalation."
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
              <p class="text-[11px] text-blue-100">Interactive Triage Assistant</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Hello! I am your clinical assistant. I can help you review patient queues or walk through healthcare protocols. What are we looking at today?
            </div>
          </div>
        </div>
        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Type a message or ask a clinical question..." class="input-field flex-1 text-[12.5px] py-2">
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

      appendMessage('user', query);
      input.value = '';

      setTimeout(() => {
        const reply = processInteractiveQuery(query);
        appendMessage('ai', reply);
      }, 300);
    });
  }

  function appendMessage(sender, text) {
    const messages = document.getElementById('rc-ai-messages');
    if (!messages) return;
    const align = sender === 'user' ? 'justify-end' : 'justify-start';
    const bg = sender === 'user' ? 'bg-[#2F80ED] text-white' : 'bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] shadow-sm border border-[#EDF1F7] dark:border-white/5';
    
    messages.innerHTML += `
      <div class="flex ${align}">
        <div class="${bg} p-3 rounded-xl max-w-[85%] whitespace-pre-wrap">${escapeHtml(text)}</div>
      </div>
    `;
    messages.scrollTop = messages.scrollHeight;
    if (window.lucide) lucide.createIcons();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function processInteractiveQuery(query) {
    const q = query.toLowerCase();
    const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];
    const pending = patients.filter(p => p.status === 'queued').length;
    const criticals = patients.filter(p => typeof RC !== 'undefined' && RC.overallSeverity(p) === 'critical');

    if (q.includes('hi') || q.includes('hello') || q.includes('hey')) {
      return "Hello! How can I help you with your patient evaluations or clinical records today?";
    }

    if (q.includes('critical') || q.includes('urgent') || q.includes('flag') || q.includes('emergency')) {
      if (criticals.length === 0) {
        return "Good news—there are currently no patient records flagged with critical vitals in your active queue. Would you like to review the general queue summary instead?";
      }
      let output = `I found ${criticals.length} patient record(s) requiring immediate attention:\n\n`;
      criticals.forEach(p => {
        output += `• ${p.name} (${p.id}) - Community: ${p.community || 'N/A'}\n  Vitals: BP ${p.vitals.bpSys}/${p.vitals.bpDia}, Temp ${p.vitals.temp}°C, SpO2 ${p.vitals.spo2}%\n\n`;
      });
      return output;
    }

    if (q.includes('patient') || q.includes('queue') || q.includes('summary') || q.includes('status')) {
      return `Here is your current queue overview:\n` +
             `• Total Registered: ${patients.length}\n` +
             `• Awaiting Sync: ${pending}\n` +
             `• Critical Flags: ${criticals.length}\n\n` +
             `Are you looking to register someone new, or should we check the records for any specific symptoms?`;
    }

    if (q.includes('fever') || q.includes('temperature') || q.includes('malaria')) {
      conversationState.lastTopic = 'fever';
      return `[ ${KNOWLEDGE_BASE.fever.title.toUpperCase()} ]\n\n` +
             KNOWLEDGE_BASE.fever.details.map(d => `• ${d}`).join('\n') +
             `\n\nIs the patient reporting any accompanying symptoms like a cough or headache?`;
    }

    if (q.includes('bp') || q.includes('pressure') || q.includes('hypertension') || q.includes('headache')) {
      conversationState.lastTopic = 'hypertension';
      return `[ ${KNOWLEDGE_BASE.hypertension.title.toUpperCase()} ]\n\n` +
             KNOWLEDGE_BASE.hypertension.details.map(d => `• ${d}`).join('\n') +
             `\n\nWould you like me to check if any patients in your queue have elevated blood pressure right now?`;
    }

    if (q.includes('spo2') || q.includes('oxygen') || q.includes('breath') || q.includes('cough')) {
      conversationState.lastTopic = 'respiratory';
      return `[ ${KNOWLEDGE_BASE.respiratory.title.toUpperCase()} ]\n\n` +
             KNOWLEDGE_BASE.respiratory.details.map(d => `• ${d}`).join('\n') +
             `\n\nLet me know if you need help evaluating other vitals for this case.`;
    }

    if (q.includes('diarrhea') || q.includes('dehydration') || q.includes('nausea') || q.includes('vomit')) {
      conversationState.lastTopic = 'dehydration';
      return `[ ${KNOWLEDGE_BASE.dehydration.title.toUpperCase()} ]\n\n` +
             KNOWLEDGE_BASE.dehydration.details.map(d => `• ${d}`).join('\n') +
             `\n\nDo you need guidance on administering ORS or checking skin turgor?`;
    }

    return "I want to make sure I give you the right information. You can ask me about your patient queue status, critical flags, or clinical guidelines for fever, blood pressure, SpO2, or dehydration. What would you like to check?";
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  RCAgent.init();
});