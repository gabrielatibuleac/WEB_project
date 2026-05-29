document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const childrenApiBase = '/WEB_project/backend/api/children.php';
    const timelineApiBase = '/WEB_project/backend/api/timeline.php';

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
    let currentItems = [];
    let currentFilter = 'all';

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

        if (!adminLink) {
            return;
        }

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

    async function checkAuth() {
        const result = await requestJson('/WEB_project/backend/api/check_auth.php', {
            method: 'GET'
        });

        if (result.status !== 'success') {
            redirectToLogin();
            return false;
        }

        const fullName = result.user.name || result.user.full_name || 'User';

        topUserName.textContent = fullName;
        topUserInitial.textContent = fullName.charAt(0).toUpperCase();

        showAdminLinkIfNeeded(result.user);

        return true;
    }

    async function logoutUser() {
        await requestJson('/WEB_project/backend/api/logout.php', {
            method: 'POST'
        });

        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    async function loadChildren() {
        const result = await requestJson(`${childrenApiBase}?action=list`, {
            method: 'GET'
        });

        children = result.status === 'success' ? result.children || [] : [];
        childSelect.innerHTML = '';

        if (children.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nu ai copil adaugat';
            childSelect.appendChild(option);

            currentChild = null;
            currentItems = [];
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

        await loadTimelineItems();
        renderTimeline();
    }

    async function loadTimelineItems() {
        if (!currentChild) {
            currentItems = [];
            return;
        }

        const result = await requestJson(`${timelineApiBase}?action=list&child_id=${currentChild.id}`, {
            method: 'GET'
        });

        currentItems = result.status === 'success' ? result.items || [] : [];
    }

    function renderTimeline() {
        const items = currentFilter === 'all'
            ? currentItems
            : currentItems.filter((item) => String(item.type).toLowerCase() === currentFilter);

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
                    <p>${escapeHtml(item.description || '')}</p>
                    <small>♥ ${item.likes || 0}   ◌ ${item.comments || 0}</small>
                </div>
                <div class="timeline-actions">
                    <button type="button" data-details="${escapeHtml(item.id)}">Vezi detalii</button>
                    <button type="button" data-share="${escapeHtml(item.id)}">⌯</button>
                </div>
            `;

            timelineList.appendChild(row);
        });

        document.querySelectorAll('[data-details]').forEach((button) => {
            button.addEventListener('click', () => openDetails(button.dataset.details));
        });

        document.querySelectorAll('[data-share]').forEach((button) => {
            button.addEventListener('click', () => {
                window.location.href = `../sharing/sharing.html?child_id=${encodeURIComponent(currentChild.id)}&moment_id=${encodeURIComponent(button.dataset.share)}`;
            });
        });
    }

    function openDetails(itemId) {
        const item = currentItems.find((entry) => String(entry.id) === String(itemId));

        if (!item) {
            return;
        }

        detailsTitle.textContent = item.title;

        detailsContent.innerHTML = `
            <p class="muted">${escapeHtml(item.description || '')}</p>
            <p><strong>Categorie:</strong> ${escapeHtml(item.sourceLabel || getTypeLabel(item.type))}</p>
            <p><strong>Data:</strong> ${formatDate(item.date)}</p>
            <p><strong>Ora:</strong> ${escapeHtml(item.time || '00:00')}</p>
        `;

        detailsModal.classList.add('active');
    }

    function renderNotifications() {
        const items = currentItems.slice(0, 5);
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

    momentForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentChild) {
            return;
        }

        const result = await requestJson(`${timelineApiBase}?action=create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                title: document.getElementById('momentTitle').value,
                type: document.getElementById('momentType').value,
                date: document.getElementById('momentDate').value,
                time: document.getElementById('momentTime').value,
                description: document.getElementById('momentDescription').value
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            momentModal.classList.remove('active');
            await loadTimelineItems();
            renderTimeline();
        }
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.close);

            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
    });

    logoutBtn.addEventListener('click', logoutUser);

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

    const ok = await checkAuth();

    if (ok) {
        await loadChildren();
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        setTimeout(() => openAddMomentBtn.click(), 300);
    }
});