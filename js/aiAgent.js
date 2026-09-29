/*----- RURALCARE OFFLINE AI AGENT -----*/
const RCAgent = (() => {
  let worker = null;
  let isModelReady = false;

  function init() {
    if (document.getElementById('rc-ai-widget')) return;

    // Inject widget HTML
    const container = document.createElement('div');
    container.id = 'rc-ai-widget';
    container.className = 'fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50';
    container.innerHTML = `
      <button id="rc-ai-toggle" aria-label="Toggle AI Assistant" class="w-12 h-12 rounded-full bg-[#2F80ED] text-white shadow-lg flex items-center justify-center hover:bg-[#1C64F2] transition-transform hover:scale-105 cursor-pointer">
        <i data-lucide="sparkles" class="w-6 h-6"></i>
      </button>
      <div id="rc-ai-chatbox" class="hidden absolute bottom-16 right-0 w-[340px] sm:w-[400px] h-[520px] bg-white dark:bg-[#131A2A] rounded-2xl shadow-2xl border border-[#EDF1F7] dark:border-white/10 flex flex-col overflow-hidden">
        <div class="bg-[#2F80ED] text-white p-4 flex justify-between items-center">
          <div class="flex items-center gap-2">
            <i data-lucide="bot" class="w-5 h-5"></i>
            <div>
              <h4 class="font-bold text-[14px]">RuralCare Offline AI</h4>
              <p id="rc-ai-subtitle" class="text-[11px] text-blue-100">Initializing AI model...</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <!-- Chat Messages Area -->
        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Hello! I am downloading my offline AI model automatically in the background (~360MB, cached locally once). Once ready, we can chat and review clinical protocols instantly!
            </div>
          </div>
        </div>

        <!-- Input Form -->
        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Preparing AI model..." disabled class="input-field flex-1 text-[12.5px] py-2 disabled:opacity-50">
          <button type="submit" id="rc-ai-send-btn" disabled class="bg-[#2F80ED] text-white px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#1C64F2] disabled:opacity-50 cursor-pointer">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(container);
    if (window.lucide) lucide.createIcons();

    // Bind UI Elements
    const toggleBtn = document.getElementById('rc-ai-toggle');
    const chatbox = document.getElementById('rc-ai-chatbox');
    const closeBtn = document.getElementById('rc-ai-close');
    const form = document.getElementById('rc-ai-form');
    const input = document.getElementById('rc-ai-input');
    const subtitle = document.getElementById('rc-ai-subtitle');
    const sendBtn = document.getElementById('rc-ai-send-btn');

    toggleBtn.addEventListener('click', () => chatbox.classList.toggle('hidden'));
    closeBtn.addEventListener('click', () => chatbox.classList.add('hidden'));

    // Initialize Web Worker and Auto-Start Model Download
    try {
      worker = new Worker('./js/aiWorker.js', { type: 'module' });

      worker.onmessage = (e) => {
        const { status, message, progress, reply } = e.data;

        if (status === 'loading' || status === 'progress') {
          if (progress && progress.progress) {
            const pct = Math.round(progress.progress);
            subtitle.textContent = `Downloading AI: ${pct}%`;
          } else {
            subtitle.textContent = message || 'Loading model...';
          }
        } else if (status === 'ready') {
          isModelReady = true;
          subtitle.textContent = 'Active (100% Offline)';
          input.removeAttribute('disabled');
          sendBtn.removeAttribute('disabled');
          input.placeholder = "Ask about clinical SOPs or queue status...";
          appendMessage('ai', 'AI model is fully loaded and ready offline!');
        } else if (status === 'complete') {
          appendMessage('ai', reply);
          input.removeAttribute('disabled');
          sendBtn.removeAttribute('disabled');
        } else if (status === 'error') {
          subtitle.textContent = 'Model error';
          appendMessage('ai', `Error loading AI: ${message}`);
        }
      };

      // Automatically trigger model loading on startup
      worker.postMessage({ type: 'LOAD_MODEL' });
    } catch (err) {
      subtitle.textContent = 'Worker failed';
      console.error('[RuralCare AI] Worker initialization failed:', err);
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const query = input.value.trim();
      if (!query || !isModelReady) return;

      appendMessage('user', query);
      input.value = '';
      input.setAttribute('disabled', 'true');
      sendBtn.setAttribute('disabled', 'true');

      // Gather local patient context (RAG)
      const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];
      const criticals = patients.filter(p => typeof RC !== 'undefined' && RC.overallSeverity(p) === 'critical');
      const patientContext = JSON.stringify({
        totalPatients: patients.length,
        pendingSync: patients.filter(p => p.status === 'queued').length,
        criticalCasesCount: criticals.length,
        criticalCases: criticals.map(p => ({ id: p.id, vitals: p.vitals }))
      });

      worker.postMessage({ type: 'GENERATE_AI', data: { prompt: query, patientContext } });
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

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => {
  RCAgent.init();
});