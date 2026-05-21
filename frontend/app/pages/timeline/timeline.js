document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '/WEB_project/backend/api/children.php';
    const childSelect = document.getElementById('childSelect');
    const childBirthText = document.getElementById('childBirthText');
    const timelineTitle = document.getElementById('timelineTitle');
    const timelineList = document.getElementById('timelineList');
    const momentForm = document.getElementById('momentForm');
    const momentModal = document.getElementById('momentModal');
    const detailsModal = document.getElementById('detailsModal');
    const detailsTitle = document.getElementById('detailsTitle');
    const detailsContent = document.getElementById('detailsContent');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');
    const logoutBtn = document.getElementById('logoutBtn');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const openAddMomentBtn = document.getElementById('openAddMomentBtn');
    const openNotificationsBtn = document.getElementById('openNotificationsBtn');

    let children = [];
    let currentChild = null;
    let currentProfile = null;
    let currentFilter = 'all';

    async function requestJson(url, options = {}) {
        const response = await fetch(url, options);
        const text = await response.text();

        try {
            return JSON.parse(text);
        } catch (error) {
            console.error(text);
            return { status: 'error', message: 'Raspuns invalid de la server.' };
        }
    }

    async function checkSession() {
        const result = await requestJson('/WEB_project/backend/api/check_session.php', {
            method: 'GET',
            credentials: 'same-origin'
        });

        if (result.status !== 'success') {
            window.location.href = '../auth/login.html';
            return false;
        }

        const fullName = result.user.name || 'User';
        topUserName.textContent = fullName;
        topUserInitial.textContent = fullName.charAt(0).toUpperCase();

        return true;
    }

    async function loadChildren() {
        const result = await requestJson(`${apiBase}?action=list`, {
            method: 'GET',
            credentials: 'same-origin'
        });

        children = result.status === 'success' ? result.children || [] : [];
        childSelect.innerHTML = '';

        if (children.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nu ai copil adaugat';
            childSelect.appendChild(option);
            timelineTitle.textContent = 'Momentele copilului';
            childBirthText.textContent = 'Adauga primul copil din Profil copil.';
            renderTimeline();
            return;
        }

        const savedChildId = localStorage.getItem('selectedChildId');
        currentChild = children[0];

        children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
            childSelect.appendChild(option);

            if (savedChildId && String(savedChildId) === String(child.id)) {
                currentChild = child;
            }
        });

        childSelect.value = currentChild.id;
        await selectChild(currentChild.id);
    }

    async function selectChild(childId) {
        currentChild = children.find((child) => String(child.id) === String(childId));

        if (!currentChild) {
            return;
        }

        localStorage.setItem('selectedChildId', currentChild.id);
        childBirthText.textContent = `Nascut pe ${formatDate(currentChild.birth_date)}`;
        timelineTitle.textContent = `Momentele ${currentChild.name}`;
        currentProfile = await loadProfile(currentChild.id);
        renderTimeline();
    }

    async function loadProfile(childId) {
        const result = await requestJson(`${apiBase}?action=profile&id=${childId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });

        return result.status === 'success' ? result : null;
    }

    function getTimelineItems() {
        if (!currentChild) {
            return [];
        }

        const localItems = getStore(`bain_timeline_${currentChild.id}`, []);
        const cleanLocalItems = localItems.filter((item) => item.source !== 'medical');

        const milestones = currentProfile && currentProfile.milestones ? currentProfile.milestones : [];

        const milestoneItems = milestones.map((item) => ({
            id: `milestone_${item.id}`,
            title: item.title,
            description: 'Reper important adaugat in profilul copilului.',
            type: 'progress',
            date: item.milestone_date,
            time: '00:00',
            likes: 0,
            comments: 0,
            source: 'milestone'
        }));

        const medicalItems = getMedicalTimelineItems(currentChild.id);

        return [...cleanLocalItems, ...milestoneItems, ...medicalItems].sort((a, b) => {
            const aTime = `${a.date || ''} ${a.time || '00:00'}`;
            const bTime = `${b.date || ''} ${b.time || '00:00'}`;
            return bTime.localeCompare(aTime);
        });
    }

    function getMedicalTimelineItems(childId) {
        const data = normalizeMedicalData(getStore(`bain_medical_${childId}`, {}));
        const items = [];

        const sources = [
            { key: 'vaccines', list: data.vaccines, label: 'Vaccin', icon: '🛡️' },
            { key: 'visits', list: data.visits, label: 'Programare medicala', icon: '📅' },
            { key: 'medications', list: data.medications, label: 'Medicatie', icon: '💊' },
            { key: 'allergies', list: data.allergies, label: 'Alergie', icon: '⚠️' },
            { key: 'notes', list: data.notes, label: 'Nota medicala', icon: '✚' }
        ];

        sources.forEach((source) => {
            source.list.forEach((item) => {
                if (!item.date) {
                    return;
                }

                items.push({
                    id: `medical_${source.key}_${item.id}`,
                    title: item.title,
                    description: `${source.label}: ${item.description}`,
                    type: 'medical',
                    date: item.date,
                    time: item.time || '00:00',
                    likes: 0,
                    comments: 0,
                    source: 'medical',
                    medicalType: source.key,
                    sourceLabel: source.label,
                    icon: source.icon
                });
            });
        });

        return items;
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

    function renderTimeline() {
        const allItems = getTimelineItems();
        const items = currentFilter === 'all'
            ? allItems
            : allItems.filter((item) => String(item.type).toLowerCase() === currentFilter);

        timelineList.innerHTML = '';

        if (!currentChild) {
            timelineList.innerHTML = '<p class="timeline-empty">Nu exista copil selectat.</p>';
            return;
        }

        if (items.length === 0) {
            timelineList.innerHTML = `<p class="timeline-empty">Nu exista momente pentru ${escapeHtml(currentChild.name)} in categoria selectata.</p>`;
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('article');
            row.className = 'timeline-item';

            const icon = item.icon || getTypeIcon(item.type);

            row.innerHTML = `
                <div class="timeline-date">
                    ${getDayMonth(item.date)}
                    <span>${getYear(item.date)}</span>
                </div>
                <div class="timeline-icon">${icon}</div>
                <div class="timeline-preview">${icon}</div>
                <div class="timeline-info">
                    <small>${formatDate(item.date)}, ${item.time || '00:00'}</small>
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.description)}</p>
                    <small>♥ ${item.likes || 0}   ◌ ${item.comments || 0}</small>
                </div>
                <div class="timeline-actions">
                    <button type="button" data-details="${item.id}">Vezi detalii</button>
                    <button type="button" data-share="${item.id}">⌯</button>
                </div>
            `;

            timelineList.appendChild(row);
        });

        document.querySelectorAll('[data-details]').forEach((button) => {
            button.addEventListener('click', () => openDetails(button.dataset.details));
        });

        document.querySelectorAll('[data-share]').forEach((button) => {
            button.addEventListener('click', () => {
                localStorage.setItem(`bain_selected_share_${currentChild.id}`, button.dataset.share);
                window.location.href = '../sharing/sharing.html';
            });
        });
    }

    function openDetails(itemId) {
        const item = getTimelineItems().find((entry) => String(entry.id) === String(itemId));

        if (!item) {
            return;
        }

        detailsTitle.textContent = item.title;
        detailsContent.innerHTML = `
            <p class="muted">${escapeHtml(item.description)}</p>
            <p><strong>Categorie:</strong> ${escapeHtml(item.sourceLabel || getTypeLabel(item.type))}</p>
            <p><strong>Data:</strong> ${formatDate(item.date)}</p>
            <p><strong>Ora:</strong> ${item.time || '00:00'}</p>
        `;

        detailsModal.classList.add('active');
    }

    function renderNotifications() {
        const items = getTimelineItems().slice(0, 5);
        notificationsList.innerHTML = '';

        if (items.length === 0) {
            notificationsList.innerHTML = '<p class="muted">Nu exista notificari momentan.</p>';
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'notification-item';
            row.innerHTML = `
                <span>${item.icon || getTypeIcon(item.type)}</span>
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${formatDate(item.date)}</small>
                </div>
            `;
            notificationsList.appendChild(row);
        });
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

    function setStore(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
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

    function getDayMonth(dateString) {
        const date = parseDate(dateString);

        if (!date) {
            return '-';
        }

        return date.toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: 'short'
        });
    }

    function getYear(dateString) {
        const date = parseDate(dateString);
        return date ? date.getFullYear() : '-';
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

    function getTypeLabel(type) {
        const labels = {
            feeding: 'Hranire',
            sleep: 'Somn',
            progress: 'Progres',
            medical: 'Medical',
            social: 'Social'
        };

        return labels[type] || 'Moment';
    }

    function getTodayIso() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function uid() {
        return String(Date.now()) + String(Math.floor(Math.random() * 100000));
    }

    childSelect.addEventListener('change', async () => {
        await selectChild(childSelect.value);
    });

    document.querySelectorAll('.timeline-tabs button').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.timeline-tabs button').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            currentFilter = String(button.dataset.filter || 'all').toLowerCase();
            renderTimeline();
        });
    });

    openAddMomentBtn.addEventListener('click', () => {
        if (!currentChild) {
            alert('Adauga mai intai un copil.');
            return;
        }

        momentForm.reset();
        document.getElementById('momentDate').value = getTodayIso();
        document.getElementById('momentTime').value = new Date().toTimeString().slice(0, 5);
        momentModal.classList.add('active');
    });

    momentForm.addEventListener('submit', (event) => {
        event.preventDefault();

        if (!currentChild) {
            return;
        }

        const items = getStore(`bain_timeline_${currentChild.id}`, []);

        items.push({
            id: uid(),
            title: document.getElementById('momentTitle').value,
            type: document.getElementById('momentType').value,
            date: document.getElementById('momentDate').value,
            time: document.getElementById('momentTime').value,
            description: document.getElementById('momentDescription').value,
            likes: 0,
            comments: 0,
            source: 'local'
        });

        setStore(`bain_timeline_${currentChild.id}`, items);
        momentModal.classList.remove('active');
        renderTimeline();
        alert('Moment adaugat cu succes.');
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            document.getElementById(button.dataset.close).classList.remove('active');
        });
    });

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/WEB_project/backend/api/logout.php', {
            method: 'POST',
            credentials: 'same-origin'
        });

        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    });

    const ok = await checkSession();

    if (ok) {
        await loadChildren();
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        setTimeout(() => openAddMomentBtn.click(), 300);
    }
});