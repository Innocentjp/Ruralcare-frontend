document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('intake-form');
    const patientList = document.getElementById('patient-list');
    const queuedCount = document.getElementById('queued-count');
    const syncedCount = document.getElementById('synced-count');
    const syncBtn = document.getElementById('sync-btn');

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const patientData = {
                id: 'P-' + Math.floor(Math.random() * 10000),
                name: document.getElementById('patient-name').value,
                age: document.getElementById('patient-age').value,
                sex: document.getElementById('patient-sex').value,
                vitals: {
                    bp: document.getElementById('vital-bp').value,
                    temp: document.getElementById('vital-temp').value,
                    hr: document.getElementById('vital-hr').value
                },
                symptoms: document.getElementById('symptoms').value,
                timestamp: new Date().toISOString(),
                status: 'queued'
            };

            let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
            syncQueue.push(patientData);
            localStorage.setItem('ruralcare_sync_queue', JSON.stringify(syncQueue));

            alert(`Patient ${patientData.name} saved offline!`);
            window.location.href = 'dashboard.html';
        });
    }

    if (patientList && queuedCount) {
        function renderDashboard() {
            let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
            let syncHistory = JSON.parse(localStorage.getItem('ruralcare_sync_history')) || 0;
            
            queuedCount.textContent = syncQueue.length;
            if(syncedCount) syncedCount.textContent = syncHistory;
            
            patientList.innerHTML = '';

            if (syncQueue.length === 0) {
                patientList.innerHTML = `
                    <div class="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center py-10">
                        <i data-lucide="inbox" class="w-10 h-10 text-slate-300 mx-auto mb-3"></i>
                        <p class="text-slate-500 text-sm">No offline patients queued.</p>
                    </div>
                `;
            } else {
                syncQueue.forEach(patient => {
                    const card = document.createElement('div');
                    card.className = 'bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center';
                    card.innerHTML = `
                        <div>
                            <h4 class="font-semibold text-slate-800">${patient.name}</h4>
                            <p class="text-xs text-slate-500 mt-1">${patient.age} yrs • ${patient.sex} • ID: ${patient.id}</p>
                        </div>
                        <span class="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full border border-amber-200">
                            Queued
                        </span>
                    `;
                    patientList.appendChild(card);
                });
            }
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
        
        renderDashboard();

        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                let syncQueue = JSON.parse(localStorage.getItem('ruralcare_sync_queue')) || [];
                if (syncQueue.length === 0) {
                    alert("No patients in queue to sync.");
                    return;
                }

                const originalText = syncBtn.innerHTML;
                syncBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 mr-1 animate-spin"></i> Syncing...`;
                if (typeof lucide !== 'undefined') lucide.createIcons();

                setTimeout(() => {
                    let syncHistory = JSON.parse(localStorage.getItem('ruralcare_sync_history')) || 0;
                    syncHistory += syncQueue.length;
                    
                    localStorage.setItem('ruralcare_sync_history', JSON.stringify(syncHistory));
                    localStorage.removeItem('ruralcare_sync_queue');
                    
                    syncBtn.innerHTML = originalText;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                    
                    alert(`${syncQueue.length} patient(s) successfully synced to the cloud!`);
                    renderDashboard();
                }, 1500);
            });
        }
    }
});