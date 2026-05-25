document.addEventListener('DOMContentLoaded', async () => {
    const welcomeName = document.getElementById('welcomeName');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const logoutBtn = document.getElementById('logoutBtn');
    const dashboardChildSelect = document.getElementById('dashboardChildSelect');
    const dashboardChildBirth = document.getElementById('dashboardChildBirth');

    const feedingCount = document.getElementById('feedingCount');
    const feedingInfo = document.getElementById('feedingInfo');
    const sleepTotal = document.getElementById('sleepTotal');
    const sleepInfo = document.getElementById('sleepInfo');
    const memoryCount = document.getElementById('memoryCount');
    const memoryInfo = document.getElementById('memoryInfo');
    const medicalCount = document.getElementById('medicalCount');
    const medicalInfo = document.getElementById('medicalInfo');
    const relationsCount = document.getElementById('relationsCount');
    const relationsChildName = document.getElementById('relationsChildName');
    const scheduleList = document.getElementById('scheduleList');
    const momentsList = document.getElementById('momentsList');

    const apiBase = '/WEB_project/backend/api/children.php';

    async function checkSession() {
        try {
            const response = await fetch('/WEB_project/backend/api/check_session.php', {
                method: 'GET',
                credentials: 'same-origin'
            });

            const result = await response.json();

            if (result.status !== 'success') {
                window.location.href = '../auth/login.html';
                return false;
            }

            const fullName = result.user.name || 'User';
            const firstName = fullName.split(' ')[0];

            welcomeName.textContent = firstName;
            topUserName.textContent = fullName;
            topUserInitial.textContent = fullName.charAt(0).toUpperCase();

            return true;
        } catch (error) {
            window.location.href = '../auth/login.html';
            return false;
        }
    }

    async function loadChildrenOnDashboard() {
        try {
            const response = await fetch(`${apiBase}?action=list`, {
                method: 'GET',
                credentials: 'same-origin'
            });

            const result = await response.json();

            if (result.status !== 'success') {
                renderEmptyDashboard();
                return;
            }

            const children = result.children || [];
            dashboardChildSelect.innerHTML = '';

            if (children.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'Nu ai copil adaugat';
                option.value = '';
                dashboardChildSelect.appendChild(option);

                dashboardChildBirth.textContent = 'Adauga primul copil din Profil copil.';
                renderEmptyDashboard();
                return;
            }

            const savedChildId = localStorage.getItem('selectedChildId');
            let selectedChild = children[0];

            children.forEach((child) => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
                dashboardChildSelect.appendChild(option);

                if (savedChildId && String(child.id) === String(savedChildId)) {
                    selectedChild = child;
                }
            });

            dashboardChildSelect.value = selectedChild.id;
            await updateDashboardChild(selectedChild);

            dashboardChildSelect.addEventListener('change', async () => {
                const child = children.find((item) => String(item.id) === String(dashboardChildSelect.value));

                if (child) {
                    await updateDashboardChild(child);
                }
            });
        } catch (error) {
            console.error(error);
            renderEmptyDashboard();
        }
    }

    async function updateDashboardChild(child) {
        localStorage.setItem('selectedChildId', child.id);
        dashboardChildBirth.textContent = `Nascut pe ${formatDate(child.birth_date)}`;

        const profile = await loadChildProfile(child.id);

        if (!profile) {
            renderEmptyDashboard(child);
            return;
        }

        renderDashboardData(child, profile.milestones || [], profile.caregivers || []);
    }

    async function loadChildProfile(childId) {
        try {
            const response = await fetch(`${apiBase}?action=profile&id=${childId}`, {
                method: 'GET',
                credentials: 'same-origin'
            });

            const result = await response.json();

            if (result.status !== 'success') {
                return null;
            }

            return result;
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function renderDashboardData(child, milestones, caregivers) {
        const medicalData = getMedicalData(child.id);
        const medicalTotal = countMedicalItems(medicalData);
        const timelineItems = getTimelineItems(child.id, milestones);

        feedingCount.textContent = '0';
        feedingInfo.textContent = `Nu exista mese adaugate azi pentru ${child.name}.`;

        sleepTotal.textContent = '0h 0m';
        sleepInfo.textContent = `Nu exista somn adaugat azi pentru ${child.name}.`;

        memoryCount.textContent = timelineItems.length;
        memoryInfo.textContent = timelineItems.length === 1 ? '1 moment adaugat.' : `${timelineItems.length} momente adaugate.`;

        medicalCount.textContent = medicalTotal;
        medicalInfo.textContent = medicalTotal === 0
            ? `Nu exista informatii medicale pentru ${child.name}.`
            : `${medicalTotal} informatii medicale salvate pentru ${child.name}.`;

        relationsCount.textContent = caregivers.length;
        relationsChildName.textContent = `cu ${child.name}`;

        renderSchedule(child, medicalData, timelineItems);
        renderMoments(timelineItems);
    }

    function renderEmptyDashboard(child = null) {
        const childName = child ? child.name : 'copilul selectat';

        feedingCount.textContent = '0';
        feedingInfo.textContent = `Nu exista mese adaugate azi pentru ${childName}.`;

        sleepTotal.textContent = '0h 0m';
        sleepInfo.textContent = `Nu exista somn adaugat azi pentru ${childName}.`;

        memoryCount.textContent = '0';
        memoryInfo.textContent = `Nu exista amintiri pentru ${childName}.`;

        medicalCount.textContent = '0';
        medicalInfo.textContent = `Nu exista informatii medicale pentru ${childName}.`;

        relationsCount.textContent = '0';
        relationsChildName.textContent = child ? `cu ${child.name}` : 'Fara copil selectat';

        scheduleList.innerHTML = '<p class="empty-panel-message">Nu exista activitati programate pentru azi.</p>';
        momentsList.innerHTML = '<p class="empty-panel-message">Nu exista momente recente.</p>';
    }

    function renderSchedule(child, medicalData, timelineItems) {
        const today = getTodayIso();
        const items = [];

        const medicalSources = [
            { list: medicalData.visits || [], label: 'Programare medicala', icon: '📅' },
            { list: medicalData.medications || [], label: 'Medicatie', icon: '💊' },
            { list: medicalData.vaccines || [], label: 'Vaccin', icon: '🛡️' },
            { list: medicalData.allergies || [], label: 'Alergie', icon: '⚠️' },
            { list: medicalData.notes || [], label: 'Nota medicala', icon: '✚' }
        ];

        medicalSources.forEach((source) => {
            source.list.forEach((item) => {
                if (item.date === today) {
                    items.push({
                        time: 'Astazi',
                        title: item.title,
                        description: `${source.icon} ${source.label}: ${item.description}`
                    });
                }
            });
        });

        timelineItems.forEach((item) => {
            if (item.date === today && item.source !== 'medical') {
                items.push({
                    time: item.time || 'Astazi',
                    title: item.title,
                    description: item.description
                });
            }
        });

        scheduleList.innerHTML = '';

        if (items.length === 0) {
            scheduleList.innerHTML = `
                <p class="empty-panel-message">Nu exista activitati programate pentru azi pentru ${escapeHtml(child.name)}.</p>
            `;
            return;
        }

        items.slice(0, 5).forEach((item) => {
            const row = document.createElement('div');
            row.className = 'schedule-item';

            row.innerHTML = `
                <span>${escapeHtml(item.time)}</span>
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.description)}</p>
                </div>
                <b>✓</b>
            `;

            scheduleList.appendChild(row);
        });
    }

    function renderMoments(items) {
        momentsList.innerHTML = '';

        if (items.length === 0) {
            momentsList.innerHTML = '<p class="empty-panel-message">Nu exista momente recente.</p>';
            return;
        }

        items.slice(0, 3).forEach((moment) => {
            const item = document.createElement('div');
            item.className = 'moment-item';

            item.innerHTML = `
                <div class="moment-placeholder">${getTypeIcon(moment.type)}</div>
                <div>
                    <strong>${escapeHtml(moment.title)}</strong>
                    <p>${escapeHtml(moment.description)}</p>
                    <small>${formatDate(moment.date)}</small>
                </div>
                <span>♥ ${moment.likes || 0}</span>
            `;

            momentsList.appendChild(item);
        });
    }

    function getTimelineItems(childId, milestones) {
        const localItems = getStore(`bain_timeline_${childId}`, []);

        const milestoneItems = milestones.map((item) => ({
            id: `milestone_${item.id}`,
            title: item.title,
            description: 'Reper important adaugat in profil',
            type: 'progress',
            date: item.milestone_date,
            time: '00:00',
            likes: 0,
            source: 'milestone'
        }));

        return [...localItems, ...milestoneItems].sort((a, b) => {
            const aTime = `${a.date || ''} ${a.time || '00:00'}`;
            const bTime = `${b.date || ''} ${b.time || '00:00'}`;
            return bTime.localeCompare(aTime);
        });
    }

    function getMedicalData(childId) {
        return normalizeMedicalData(getStore(`bain_medical_${childId}`, {}));
    }

    function normalizeMedicalData(data) {
        return {
            vaccines: Array.isArray(data.vaccines) ? data.vaccines : [],
            visits: Array.isArray(data.visits) ? data.visits : [],
            medications: Array.isArray(data.medications) ? data.medications : [],
            allergies: Array.isArray(data.allergies) ? data.allergies : [],
            notes: Array.isArray(data.notes) ? data.notes : [],
            emergency: Array.isArray(data.emergency) ? data.emergency : []
        };
    }

    function countMedicalItems(data) {
        return (data.vaccines || []).length
            + (data.visits || []).length
            + (data.medications || []).length
            + (data.allergies || []).length
            + (data.notes || []).length;
    }

    function getStore(key, fallback) {
        const raw = localStorage.getItem(key);

        if (!raw) {
            return fallback;
        }

        try {
            return JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
    }

    function getTypeIcon(type) {
        const icons = {
            feeding: '🍼',
            sleep: '☾',
            progress: '☆',
            medical: '✚',
            social: '♧'
        };

        return icons[type] || '☆';
    }

    function getTodayIso() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function parseDate(dateString) {
        if (!dateString) {
            return null;
        }

        const parts = dateString.split('-').map(Number);

        if (parts.length !== 3) {
            return null;
        }

        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function getAge(dateString) {
        const birthDate = parseDate(dateString);

        if (!birthDate) {
            return 0;
        }

        const today = new Date();

        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        const date = parseDate(dateString);

        if (!date) {
            return '-';
        }

        return date.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/WEB_project/backend/api/logout.php', {
                method: 'POST',
                credentials: 'same-origin'
            });

            localStorage.removeItem('selectedChildId');
            window.location.href = '../auth/login.html';
        });
    }

    document.querySelectorAll('[data-route]').forEach((element) => {
        element.addEventListener('click', () => {
            window.location.href = element.dataset.route;
        });
    });

    const isLoggedIn = await checkSession();

    if (isLoggedIn) {
        await loadChildrenOnDashboard();
    }
});