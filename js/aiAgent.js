/*----- RURALCARE AI AGENT WIDGET -----*/
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
      <div id="rc-ai-chatbox" class="hidden absolute bottom-16 right-0 w-[340px] sm:w-[380px] h-[480px] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#EDF1F7] dark:border-white/10 flex flex-col overflow-hidden">
        <div class="bg-[#2F80ED] text-white p-4 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <i data-lucide="bot" class="w-5 h-5"></i>
            <div>
              <h4 class="font-bold text-[14px]">RuralCare AI Assistant</h4>
              <p class="text-[11px] text-blue-100">Offline Triage Helper</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>
        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Hello! I am your RuralCare AI assistant. I can check your patient queue or look up triage tips. How can I help you?
            </div>
          </div>
        </div>
        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Type a question..." class="input-field flex-1 text-[12.5px] py-2">
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
        const reply = getAIResponse(query);
        messages.innerHTML += `<div class="flex justify-start"><div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%] whitespace-pre-wrap">${reply}</div></div>`;
        messages.scrollTop = messages.scrollHeight;
        if (window.lucide) lucide.createIcons();
      }, 400);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getAIResponse(query) {
    const q = query.toLowerCase();
    const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];

    if (q.includes('patient') || q.includes('queue') || q.includes('total')) {
      return `You currently have ${patients.length} patient record(s) stored in your local queue.`;
    }
    if (q.includes('fever') || q.includes('temperature')) {
      return 'For high fever (>= 38.5°C): Check for malaria risk, ensure adequate hydration, and monitor vitals closely.';
    }
    return 'I am your offline RuralCare assistant. Try asking me about your patient queue or fever management guidelines!';
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  RCAgent.init();
});