/*----- RURALCARE OFFLINE LLM UI WIDGET -----*/
const RCAgent = (() => {
  let worker = null;
  let isModelReady = false;

  function init() {
    if (document.getElementById('rc-ai-widget')) return;

    // 1. Inject Widget UI
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
              <p id="rc-ai-subtitle" class="text-[11px] text-blue-100">Model not loaded</p>
            </div>
          </div>
          <button id="rc-ai-close" aria-label="Close chat" class="text-white hover:opacity-80 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
        </div>

        <!-- Model Loader Banner -->
        <div id="rc-ai-loader-banner" class="bg-blue-50 dark:bg-white/5 p-3 border-b border-[#EDF1F7] dark:border-white/10 text-center">
          <p id="rc-ai-status-text" class="text-[12px] font-medium text-[#5B6472] dark:text-[#8B94A7] mb-2">Offline AI requires a one-time download (~360MB).</p>
          <div id="rc-ai-progress-bar-wrap" class="hidden w-full bg-blue-200 dark:bg-white/10 rounded-full h-1.5 mb-2">
            <div id="rc-ai-progress-bar" class="bg-[#2F80ED] h-1.5 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
          <button id="rc-ai-load-btn" class="bg-[#2F80ED] text-white text-[12px] font-semibold py-1.5 px-4 rounded-lg hover:bg-[#1C64F2] transition cursor-pointer">Load Offline AI Model</button>
        </div>

        <div id="rc-ai-messages" class="flex-1 p-3 overflow-y-auto space-y-3 text-[13px] bg-[#F8FAFD] dark:bg-[#0A0E17]">
          <div class="flex justify-start">
            <div class="bg-white dark:bg-[#1A233A] text-[#141A29] dark:text-[#E7EBF3] p-3 rounded-xl shadow-sm border border-[#EDF1F7] dark:border-white/5 max-w-[85%]">
              Hello! I am your offline clinical assistant. Load the model above to begin chatting, checking queue stats, or reviewing medical protocols.
            </div>
          </div>
        </div>

        <form id="rc-ai-form" class="p-3 bg-white dark:bg-[#131A2A] border-t border-[#EDF1F7] dark:border-white/10 flex gap-2">
          <input type="text" id="rc-ai-input" placeholder="Load AI model first..." disabled class="input-field flex-1 text-[12.5px] py-2 disabled:opacity-50">
          <button type="submit" id="rc-ai-send-btn" disabled class="bg-[#2F80ED] text-white px-3 py-2 rounded-xl text-[12.5px] font-semibold hover:bg-[#1C64F2] disabled:opacity-50 cursor-pointer">Send</button>
        </form>
      </div>
    `;
    document.body.appendChild(container);
    if (window.lucide) lucide.createIcons();

    // 2. Initialize Web Worker
    worker = new Worker('./js/aiWorker.js', { type: 'module' });

    worker.onmessage = (e) => {
      const { status, message, progress, reply } = e.data;
      const statusText = document.getElementById('rc-ai-status-text');
      const subtitle = document.getElementById('rc-ai-subtitle');
      const progressBarWrap = document.getElementById('rc-ai-progress-bar-wrap');
      const progressBar = document.getElementById('rc-ai-progress-bar');
      const loadBtn = document.getElementById('rc-ai-load-btn');
      const input = document.getElementById('rc-ai-input');
      const sendBtn = document.getElementById('rc-ai-send-btn');
      const loaderBanner = document.getElementById('rc-ai-loader-banner');

      if (status === 'loading') {
        statusText.textContent = message;
        loadBtn.classList.add('hidden');
        progressBarWrap.classList.remove('hidden');
      } else if (status === 'progress') {
        if (progress && progress.progress) {
          const pct = Math.round(progress.progress);
          progressBar.style.width = pct + '%';
          statusText.textContent = `Downloading model: ${pct}%`;
        }
      } else if (status === 'ready') {
        isModelReady = true;
        subtitle.textContent = 'Active (100% Offline)';
        loaderBanner.classList.add('hidden');
        input.removeAttribute('disabled');
        sendBtn.removeAttribute('disabled');
        input.placeholder = "Ask about clinical SOPs or queue status...";
      } else if (status === 'complete') {
        appendMessage('ai', reply);
        input.removeAttribute('disabled');
        sendBtn.removeAttribute('disabled');
      } else if (status === 'error') {
        statusText.textContent = `Error: ${message}`;
        loadBtn.classList.remove('hidden');
      }
    };

    // 3. DOM Event Listeners
    document.getElementById('rc-ai-toggle').addEventListener('click', () => {
      document.getElementById('rc-ai-chatbox').classList.toggle('hidden');
    });
    document.getElementById('rc-ai-close').addEventListener('click', () => {
      document.getElementById('rc-ai-chatbox').classList.add('hidden');
    });

    document.getElementById('rc-ai-load-btn').addEventListener('click', () => {
      worker.postMessage({ type: 'LOAD_MODEL' });
    });

    document.getElementById('rc-ai-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('rc-ai-input');
      const query = input.value.trim();
      if (!query || !isModelReady) return;

      appendMessage('user', query);
      input.value = '';
      input.setAttribute('disabled', 'true');
      document.getElementById('rc-ai-send-btn').setAttribute('disabled', 'true');

      // Gather local patient context (RAG)
      const patients = typeof RC !== 'undefined' ? RC.getPatients() : [];
      const criticals = patients.filter(p => typeof RC !== 'undefined' && RC.overallSeverity(p) === 'critical');
      const patientContext = JSON.stringify({
        totalPatients: patients.length,
        pendingSync: patients.filter(p => p.status === 'queued').length,
        criticalCasesCount: criticals.length,
        criticalCases: criticals.map(p => ({ id: p.id, vitals: p.vitals }))
      });

      // Send to worker
      worker.postMessage({ type: 'GENERATE_AI', data: { prompt: query, patientContext } });
    });
  }

  function appendMessage(sender, text) {
    const messages = document.getElementById('rc-ai-messages');
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