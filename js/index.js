document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('intake-form');
    const patientList = document.getElementById('patient-list');
    const queuedCount = document.getElementById('queued-count');
    const syncBtn = document.getElementById('sync-btn');
    const queuedIndicator = document.getElementById('queued-indicator');
    const navSyncBadge = document.getElementById('nav-sync-badge');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const patientData = {
                id: '#P-' + Math.floor(1000 + Math.random() * 9000),
                name: document.getElementById('patient-name').value,
                age: document.getElementById('patient-age').value,
                sex: document.getElementById('patient-sex').value,
                vitals: {
                    bp: document.getElementById('vital-bp').value || '120/80',
                    temp: document.getElementById('vital-temp').value || '36.6',
                    hr: document.getElementById('vital-hr').value || '72'
                },
                symptoms: document.getElementById('symptoms').value,
                timestamp: new Date().toISOString(),
                status: 'queued'
            };

            let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
            syncQueue.push(patientData);
            localStorage.setItem('ruralcare_sync_queue', JSON.stringify(syncQueue));

            window.location.href = 'dashboard.html';
        });
    }

    if (patientList && queuedCount) {
        function renderDashboard() {
            let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
            
            let flaggedCount = 0;
            
            patientList.innerHTML = '';

            if (syncQueue.length === 0) {
                patientList.innerHTML = `
                    <div class="px-5 py-8 text-center bg-white rounded-b-xl">
                        <i data-lucide="check-circle" class="w-8 h-8 text-emerald-400 mx-auto mb-2"></i>
                        <p class="text-slate-400 font-medium text-[12px]">All records are synced.</p>
                    </div>
                `;
            } else {
                syncQueue.forEach((patient, index) => {
                    const row = document.createElement('div');
                    row.className = `grid grid-cols-4 gap-2 px-5 py-3 items-center bg-white ${index !== syncQueue.length - 1 ? 'dashed-divider' : 'rounded-b-xl'}`;
                    
                    const sysBP = parseInt(patient.vitals.bp.split('/')[0]);
                    const isHighBP = !isNaN(sysBP) && sysBP > 130;
                    
                    if (isHighBP) flaggedCount++;
                    
                    const statusHtml = isHighBP 
                        ? `<div class="bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-1.5 rounded-full border border-amber-100 flex items-center justify-center gap-1 w-full"><i data-lucide="sparkles" class="w-3 h-3 fill-amber-100"></i> Flagged</div>`
                        : `<div class="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1.5 rounded-full border border-emerald-100 flex items-center justify-center gap-1 w-full"><i data-lucide="check-circle" class="w-3 h-3"></i> Clear</div>`;

                    row.innerHTML = `
                        <div class="col-span-1 text-[11px] font-semibold text-slate-500">${patient.id}</div>
                        <div class="col-span-1 text-[13px] font-bold text-slate-900 truncate pr-2">${patient.name}</div>
                        <div class="col-span-1 text-[11px] font-medium text-slate-500 leading-tight">
                            <div class="text-slate-800 font-bold">${patient.vitals.bp}</div>
                            <div>${patient.vitals.temp}°C | ${patient.vitals.hr}</div>
                        </div>
                        <div class="col-span-1 flex justify-end">
                            ${statusHtml}
                        </div>
                    `;
                    patientList.appendChild(row);
                });
            }
            
            queuedCount.textContent = flaggedCount;

            if (syncQueue.length > 0) {
                if(queuedIndicator) queuedIndicator.classList.remove('hidden');
                if(navSyncBadge) navSyncBadge.classList.remove('hidden');
            } else {
                if(queuedIndicator) queuedIndicator.classList.add('hidden');
                if(navSyncBadge) navSyncBadge.classList.add('hidden');
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        renderDashboard();

        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
                if (syncQueue.length === 0) return;

                const originalHTML = syncBtn.innerHTML;
                syncBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();

                setTimeout(() => {
                    let syncHistory = JSON.parse(localStorage.getItem('ruralcare_sync_history')) || 0;
                    syncHistory += syncQueue.length;
                    
                    localStorage.setItem('ruralcare_sync_history', JSON.stringify(syncHistory));
                    localStorage.removeItem('ruralcare_sync_queue');
                    
                    syncBtn.innerHTML = originalHTML;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    
                    renderDashboard();
                }, 1500);
            });
        }
    }
});