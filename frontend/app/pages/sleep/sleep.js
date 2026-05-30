document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const sleepChildSelect = document.getElementById('sleepChildSelect');
    const sleepChildAge = document.getElementById('sleepChildAge');
    const sleepModal = document.getElementById('sleepModal');
    const showAddSleepFormBtn = document.getElementById('showAddSleepFormBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const sleepForm = document.getElementById('sleepForm');
    const formSleepType = document.getElementById('formSleepType');
    const modalTitle = document.getElementById('modalTitle');
    const endTimeGroup = document.getElementById('endTimeGroup');
    const qualityGroup = document.getElementById('qualityGroup');
    const logoutBtn = document.getElementById('logoutBtn');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');

    const API_CHILDREN = '/WEB_project/backend/api/children.php';
    const API_SLEEP = '/WEB_project/backend/api/sleep.php';

    // ── Auth helpers (identice cu childProfile.js) ──────────────────────────

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
    }

    function redirectToLogin() {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    function showAdminLinkIfNeeded(user) {
        const adminLink = document.getElementById('adminNavLink');
        if (!adminLink) return;
        adminLink.hidden = !user || user.role !== 'admin';
    }

    function getAuthHeaders(extraHeaders = {}) {
        return {
            ...extraHeaders,
            Authorization: `Bearer ${getAuthToken()}`
        };
    }

    async function requestJson(url, options = {}) {
        if (!getAuthToken()) {
            redirectToLogin();
            return { status: 'error', message: 'Token lipsa.' };
        }

        const response = await fetch(url, {
            ...options,
            headers: getAuthHeaders(options.headers || {})
        });

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch (error) {
            console.error(text);
            return { status: 'error', message: 'Raspuns invalid de la server.' };
        }

        if (response.status === 401) {
            redirectToLogin();
            return result;
        }

        return result;
    }

    async function apiRequest(url, method = 'GET', data = null) {
        const options = { method };

        if (data) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(data);
        }

        return await requestJson(url, options);
    }

   async function checkSession() {
    const result = await requestJson(`/WEB_project/backend/api/check_auth.php?_=${Date.now()}`, {
        method: 'GET'
    });

    if (result.status !== 'success') {
        redirectToLogin();
        return false;
    }

    const user = result.user;
    const fullName = user.name || user.full_name || 'User';

    if (topUserName) topUserName.textContent = fullName;
    if (topUserInitial) topUserInitial.textContent = fullName.charAt(0).toUpperCase();

    showAdminLinkIfNeeded(user);

    // ← ADAUGĂ ASTA:
    await loadUserPhoto();

    return true;
}

async function loadUserPhoto() {
    const result = await apiRequest('/WEB_project/backend/api/account.php?action=get');

    if (result.status === 'success') {
        const photoUrl = result.profile?.photo || null;
        const avatarDiv = document.getElementById('topUserInitial');

        if (avatarDiv && photoUrl) {
            avatarDiv.classList.add('has-photo');
            avatarDiv.style.backgroundImage = `url("${photoUrl}")`;
            avatarDiv.style.backgroundSize = 'cover';
            avatarDiv.style.backgroundPosition = 'center';
            avatarDiv.textContent = '';
        }
    }
}

    async function logoutUser() {
        await requestJson('/WEB_project/backend/api/logout.php', { method: 'POST' });
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    // ── Children ─────────────────────────────────────────────────────────────

    async function loadChildren() {
        const result = await apiRequest(`${API_CHILDREN}?action=list`);

        if (result.status !== 'success' || !result.children?.length) {
            sleepChildSelect.innerHTML = '<option value="">Fără copii</option>';
            sleepChildAge.textContent = 'Adaugă un profil de copil';
            return;
        }

        sleepChildSelect.innerHTML = '';
        result.children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = child.name;
            option.setAttribute('data-birth', child.birth_date || '');
            sleepChildSelect.appendChild(option);
        });

        const savedId = localStorage.getItem('selectedChildId');
        const selectedChild = result.children.find(c => String(c.id) === String(savedId)) || result.children[0];

        sleepChildSelect.value = selectedChild.id;
        localStorage.setItem('selectedChildId', selectedChild.id);

        updateChildAgeDisplay(selectedChild.birth_date);
        await loadSleepDataForChild(selectedChild.id);

        sleepChildSelect.addEventListener('change', (e) => {
            const childId = e.target.value;
            const child = result.children.find(c => String(c.id) === String(childId));

            if (child) {
                localStorage.setItem('selectedChildId', childId);
                updateChildAgeDisplay(child.birth_date);
                loadSleepDataForChild(childId);
            }
        });
    }

    function updateChildAgeDisplay(birthDateString) {
        if (!birthDateString) {
            sleepChildAge.textContent = 'Vârstă necunoscută';
            return;
        }

        const parts = birthDateString.split('-').map(Number);
        const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();

        let ageYears = today.getFullYear() - birthDate.getFullYear();
        let ageMonths = today.getMonth() - birthDate.getMonth();

        if (ageMonths < 0 || (ageMonths === 0 && today.getDate() < birthDate.getDate())) {
            ageYears--;
            ageMonths += 12;
        }

        if (ageYears === 0) {
            sleepChildAge.textContent = `${ageMonths} luni`;
        } else {
            sleepChildAge.textContent = `${ageYears} ani, ${ageMonths} luni`;
        }
    }

    // ── Modal ────────────────────────────────────────────────────────────────

    function openModal(type) {
        formSleepType.value = type;
        sleepModal.classList.add('open');

        if (type === 'noapte') {
            modalTitle.textContent = 'Înregistrează Somn de Noapte ☾';
            endTimeGroup.style.display = 'block';
            qualityGroup.style.display = 'block';
        } else if (type === 'zi') {
            modalTitle.textContent = 'Înregistrează Somn de Zi ☀️';
            endTimeGroup.style.display = 'block';
            qualityGroup.style.display = 'block';
        } else if (type === 'nota') {
            modalTitle.textContent = 'Adaugă o notiță privind somnul 📄';
            endTimeGroup.style.display = 'none';
            qualityGroup.style.display = 'none';
        } else if (type === 'rutina') {
            modalTitle.textContent = 'Bifează realizarea Rutinei ⭐';
            endTimeGroup.style.display = 'none';
            qualityGroup.style.display = 'none';
        }
    }

    function closeModal() {
        sleepModal.classList.remove('open');
        sleepForm.reset();
    }

    showAddSleepFormBtn.addEventListener('click', () => openModal('noapte'));
    closeModalBtn.addEventListener('click', closeModal);
    cancelModalBtn.addEventListener('click', closeModal);

    document.querySelectorAll('.tile-btn').forEach(button => {
        button.addEventListener('click', () => openModal(button.getAttribute('data-type')));
    });

    // ── Form submit ──────────────────────────────────────────────────────────

    sleepForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const result = await apiRequest(`${API_SLEEP}?action=add`, 'POST', {
            child_id: sleepChildSelect.value,
            type: formSleepType.value,
            start_time: document.getElementById('startTime').value,
            end_time: document.getElementById('endTime').value,
            notes: document.getElementById('sleepNotes').value,
            quality: document.getElementById('sleepQuality').value
        });

        if (result.status === 'success') {
            closeModal();
            await loadSleepDataForChild(sleepChildSelect.value);
        } else {
            alert('Eroare: ' + result.message);
        }
    });

    // ── Sleep data ───────────────────────────────────────────────────────────

    async function loadSleepDataForChild(childId) {
        const notesFeed = document.getElementById('sleepNotesFeed');
        notesFeed.innerHTML = '<p class="loading-text">Se încarcă datele...</p>';

        const result = await apiRequest(`${API_SLEEP}?action=getMetrics&child_id=${childId}`);

        if (result.status !== 'success') {
            notesFeed.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Eroare la încărcare.</p>';
            return;
        }

        const sleepLogs = result.data || [];

        notesFeed.innerHTML = '';
        if (sleepLogs.length === 0) {
            notesFeed.innerHTML = '<p style="color: #888; font-size: 0.9rem;">Nu există înregistrări.</p>';
        } else {
            sleepLogs.slice(0, 5).forEach(log => {
                const notaText = log.notes || 'Înregistrare adăugată.';
                const cardClass = log.sleep_type === 'zi' ? 'card-day' : (log.sleep_type === 'rutina' ? '' : 'card-night');
                const dataFormatata = new Date(log.created_at).toLocaleDateString('ro-RO', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                });

                notesFeed.innerHTML += `
                    <div class="note-box-card ${cardClass}">
                        <div class="note-box-header">
                            <span class="note-type-tag">${log.sleep_type}</span>
                            <span class="note-date">${dataFormatata}</span>
                        </div>
                        <p class="note-text">"${notaText}"</p>
                    </div>
                `;
            });
        }

        function getMinutesSlept(start, end) {
            if (!start || !end) return 0;
            const [h1, m1] = start.split(':').map(Number);
            const [h2, m2] = end.split(':').map(Number);
            let min1 = h1 * 60 + m1;
            let min2 = h2 * 60 + m2;
            if (min2 < min1) min2 += 24 * 60;
            return min2 - min1;
        }

        function formatTime(totalMinutes) {
            const h = Math.floor(totalMinutes / 60);
            const m = totalMinutes % 60;
            return `${h}h ${m}m`;
        }

        let totalNoapteMins = 0;
        let totalZiMins = 0;
        let rutineSalvate = [];
        let sumaCalitate = 0;
        let cateCalitati = 0;

        sleepLogs.forEach(log => {
            if (log.sleep_type === 'noapte') {
                totalNoapteMins += getMinutesSlept(log.start_time, log.end_time);
            } else if (log.sleep_type === 'zi') {
                totalZiMins += getMinutesSlept(log.start_time, log.end_time);
            } else if (log.sleep_type === 'rutina') {
                rutineSalvate.push(log);
            }

            if (log.quality && parseInt(log.quality) > 0) {
                sumaCalitate += parseInt(log.quality);
                cateCalitati++;
            }
        });

        const doarSomnuri = sleepLogs.filter(log => log.sleep_type === 'noapte' || log.sleep_type === 'zi');

        const statTotalAzi = document.getElementById('statTotalAzi');
        if (statTotalAzi) statTotalAzi.textContent = doarSomnuri.length + ' ses.';

        const statNoapteAzi = document.getElementById('statNoapteAzi');
        if (statNoapteAzi) statNoapteAzi.textContent = formatTime(totalNoapteMins);

        const statZiAzi = document.getElementById('statZiAzi');
        if (statZiAzi) statZiAzi.textContent = formatTime(totalZiMins);

        const statOraMedieCulcare = document.getElementById('statOraMedieCulcare');
        if (statOraMedieCulcare) {
            statOraMedieCulcare.textContent = doarSomnuri.length > 0
                ? doarSomnuri[0].start_time.substring(0, 5)
                : '--:--';
        }

        const statOraMedieTrezire = document.getElementById('statOraMedieTrezire');
        if (statOraMedieTrezire) {
            const ultimulComplet = doarSomnuri.find(log => log.end_time);
            statOraMedieTrezire.textContent = ultimulComplet
                ? ultimulComplet.end_time.substring(0, 5)
                : '--:--';
        }

        const statCalitateText = document.getElementById('statCalitateText');
        const statCalitateStele = document.getElementById('statCalitateStele');

        if (statCalitateText && statCalitateStele) {
            if (cateCalitati > 0) {
                const media = Math.round(sumaCalitate / cateCalitati);
                const labels = { 5: 'Excelent', 4: 'Foarte bun', 3: 'Bun', 2: 'Agitat', 1: 'Foarte greu' };
                statCalitateText.textContent = labels[media] || 'Fără date';

                let steleHTML = '';
                for (let i = 1; i <= 5; i++) {
                    steleHTML += i <= media
                        ? '<span style="color: #f59e0b;">★</span> '
                        : '<span style="color: #e5e7eb;">★</span> ';
                }
                statCalitateStele.innerHTML = steleHTML;
            } else {
                statCalitateText.textContent = 'Fără date';
                statCalitateStele.innerHTML = '<span style="color: #e5e7eb;">★ ★ ★ ★ ★</span>';
            }
        }

        const routineContainer = document.getElementById('routineContainer');
        if (routineContainer) {
            routineContainer.innerHTML = '';
            if (rutineSalvate.length === 0) {
                routineContainer.innerHTML = '<p style="color:gray; font-size:13px;">Încă nu ai bifat nicio rutină astăzi.</p>';
            } else {
                rutineSalvate.slice(0, 3).forEach(rutina => {
                    routineContainer.innerHTML += `
                        <div class="timeline-step done">
                            <span class="step-time">${rutina.start_time.substring(0, 5)}</span>
                            <div class="step-icon">🧸</div>
                            <span class="step-name">${rutina.notes || 'Activitate rutină'}</span>
                            <span style="color: #10b981; font-size: 1.1rem;">☑</span>
                        </div>
                    `;
                });
            }
        }

        const btnVeziNotite = document.getElementById('viewAllNotesBtn');
        if (btnVeziNotite) {
            btnVeziNotite.onclick = (e) => {
                e.preventDefault();
                const modalContainer = document.getElementById('allNotesContainer');
                modalContainer.innerHTML = '';
                sleepLogs.forEach(log => {
                    const dataObj = new Date(log.created_at).toLocaleDateString('ro-RO', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    });
                    modalContainer.innerHTML += `
                        <div class="note-box-card" style="margin-bottom: 10px; background: #f9fafb; border: 1px solid #e5e7eb;">
                            <p>"${log.notes || 'Fără notiță'}"</p>
                            <div class="note-box-header">
                                <span>Tip: ${log.sleep_type}</span>
                                <span>${dataObj}</span>
                            </div>
                        </div>
                    `;
                });
                document.getElementById('allNotesModal').classList.add('open');
            };
        }

        const btnVeziRutine = document.getElementById('viewAllRoutinesBtn');
        if (btnVeziRutine) {
            btnVeziRutine.onclick = (e) => {
                e.preventDefault();
                const modalContainer = document.getElementById('allRoutinesContainer');
                modalContainer.innerHTML = '';
                rutineSalvate.forEach(rutina => {
                    const dataObj = new Date(rutina.created_at).toLocaleDateString('ro-RO', {
                        month: 'short', day: 'numeric'
                    });
                    modalContainer.innerHTML += `
                        <div class="timeline-step done" style="margin-bottom: 15px; background: #f9fafb; padding: 10px; border-radius: 8px;">
                            <span class="step-time">${rutina.start_time.substring(0, 5)}</span>
                            <div class="step-icon">🧸</div>
                            <div style="flex:1;">
                                <span class="step-name" style="display:block;">${rutina.notes || 'Activitate rutină'}</span>
                                <span style="font-size:0.7rem; color:gray;">${dataObj}</span>
                            </div>
                            <span style="color: #10b981; font-size: 1.1rem;">☑</span>
                        </div>
                    `;
                });
                document.getElementById('allRoutinesModal').classList.add('open');
            };
        }

        const chartBarsContainer = document.getElementById('chartBars');
        chartBarsContainer.innerHTML = '';

        if (doarSomnuri.length === 0) {
            chartBarsContainer.innerHTML = '<p style="color: #888; font-size: 0.9rem; margin: auto;">Încă nu ai adăugat somnuri.</p>';
        } else {
            doarSomnuri.slice(0, 7).reverse().forEach(log => {
                const isNight = log.sleep_type === 'noapte';
                const pillarClass = isNight ? 'pillar-night' : 'pillar-day';
                const barHeight = isNight ? '80%' : '45%';
                const dayName = new Date(log.created_at).toLocaleDateString('ro-RO', { weekday: 'short' });

                chartBarsContainer.innerHTML += `
                    <div class="chart-bar-node">
                        <span class="bar-val-hint">${log.start_time.substring(0, 5)}</span>
                        <div class="bar-graphic-pillar">
                            <div class="${pillarClass}" style="height: ${barHeight};"></div>
                        </div>
                        <span class="bar-day-name">${dayName}</span>
                    </div>
                `;
            });
        }
    }

    // ── Logout ───────────────────────────────────────────────────────────────

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    // ── Init ─────────────────────────────────────────────────────────────────

    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        await loadChildren();
    }
});