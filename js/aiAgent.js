/*----- RURALCARE AI AGENT WITH CLINICAL KNOWLEDGE BASE -----*/
const RCAgent = (() => {
  function init() {
    if (document.getElementById('rc-ai-widget')) return;

    // 1. Inject widget HTML into the page
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
              <p class="text-[11px] text-blue-100">Offline Triage &amp; Protocols</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Hello! I am your RuralCare clinical assistant. Ask me about patient queue status, vital sign benchmarks, or rural primary healthcare protocols offline.
            </div>
          </div>
        </div>
        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Ask about fever, BP, SpO2, or patients..." class="input-field flex-1 text-[12.5px] py-2">
          <button type="submit" class="bg-[#2F80ED] text-white px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#1C64F2] cursor-pointer">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(container);
    if (window.lucide) lucide.createIcons();

    // 2. Button and Chat Logic
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
        const reply = getClinicalAIResponse(query);
        messages.innerHTML += `<div class="flex justify-start"><div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%] whitespace-pre-wrap">${reply}</div></div>`;
        messages.scrollTop = messages.scrollHeight;
        if (window.lucide) lucide.createIcons();
      }, 400);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getClinicalAIResponse(query) {
    const q = query.toLowerCase();
    const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];
    const pending = patients.filter(p => p.status === 'queued').length;
    const criticals = patients.filter(p => typeof RC !== 'undefined' && RC.overallSeverity(p) === 'critical');

    // 1. Patient Queue & Critical Flags Queries
    if (q.includes('critical') || q.includes('urgent') || q.includes('flag')) {
      if (criticals.length === 0) return '✅ There are currently no patients flagged with critical vitals in the active queue.';
      let res = `⚠️ Found ${criticals.length} critical patient(s) requiring attention:\n`;
      criticals.forEach(p => {
        res += `• ${p.name} (${p.id}) - Community: ${p.community || 'N/A'}\n  Vitals: BP ${p.vitals.bpSys}/${p.vitals.bpDia}, Temp ${p.vitals.temp}°C, SpO2 ${p.vitals.spo2}%\n`;
      });
      return res;
    }

    if (q.includes('patient') || q.includes('queue') || q.includes('total') || q.includes('summary')) {
      return `📊 Queue Status Summary:\n• Total Registered: ${patients.length}\n• Awaiting Sync: ${pending}\n• Critical Flags: ${criticals.length}`;
    }

    // 2. Clinical Knowledge Base (Fever / Malaria)
    if (q.includes('fever') || q.includes('temperature') || q.includes('malaria')) {
      return `🌡️ **Fever & Malaria Protocol (Rural Primary Care):**\n` +
             `• **Assessment:** Temp ≥ 38.0°C is considered a fever. Check for chills, headache, or body aches.\n` +
             `• **Endemic Areas:** Suspect uncomplicated or severe malaria if patient presents with sudden fever spikes.\n` +
             `• **Immediate Action:** Ensure oral hydration, administer antipyretics (e.g., Paracetamol), perform RDT (Rapid Diagnostic Test) if available, and queue for clinician review.`;
    }

    // 3. Blood Pressure / Hypertension
    if (q.includes('bp') || q.includes('pressure') || q.includes('hypertension') || q.includes('headache')) {
      return `🩺 **Blood Pressure Triage Guidelines:**\n` +
             `• **Normal:** Less than 120/80 mmHg.\n` +
             `• **Elevated/Warning:** Systolic 130–159 or Diastolic 85–99 mmHg. Recheck after 5 minutes of rest.\n` +
             `• **Critical / Urgent:** Systolic ≥ 160 mmHg or Diastolic ≥ 100 mmHg, especially if accompanied by a severe headache or dizziness. Consider hypertensive urgency and refer immediately.`;
    }

    // 4. Respiratory / SpO2 / Oxygen
    if (q.includes('spo2') || q.includes('oxygen') || q.includes('breath') || q.includes('cough')) {
      return `🫁 **Respiratory Distress & SpO2 Protocol:**\n` +
             `• **Normal SpO2:** 95%–100% on room air.\n` +
             `• **Warning (92%–94%):** Mild hypoxia. Evaluate for respiratory infection or chest congestion. Monitor closely.\n` +
             `• **Critical (< 92%):** Severe hypoxemia risk. Check airway and breathing urgently, position upright, and prioritize for emergency evacuation or oxygen therapy.`;
    }

    // 5. Dehydration / Diarrhea / Nausea
    if (q.includes('diarrhea') || q.includes('nausea') || q.includes('dehydration') || q.includes('vomit')) {
      return `💧 **Gastrointestinal & Dehydration Protocol:**\n` +
             `• **Assessment:** Check skin turgor, mucous membranes, and level of alertness.\n` +
             `• **Immediate Action:** Administer Oral Rehydration Salts (ORS) solution immediately.\n` +
             `• **Referral Criteria:** If signs of severe dehydration, persistent vomiting, or blood in stool appear, flag as urgent for clinical rehydration.`;
    }

    // Default Fallback
    return `💡 **RuralCare Health Guide:** I can help you look up patient stats or check primary healthcare triage guidelines. Try asking about:\n` +
           `• *"Show critical patients"* \n` +
           `• *"Fever protocol"* \n` +
           `• *"Blood pressure guidelines"* \n` +
           `• *"SpO2 benchmarks"*\n`;
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  RCAgent.init();
});