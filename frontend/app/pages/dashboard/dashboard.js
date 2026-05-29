document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

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

    const openNotificationsBtn = document.getElementById('openNotificationsBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');

    const childrenApiBase = '/WEB_project/backend/api/children.php';
    const dashboardApiBase = '/WEB_project/backend/api/dashboard.php';

    let dashboardNotifications = [];

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

    async function checkSession() {
        const result = await requestJson('/WEB_project/backend/api/check_auth.php', {
            method: 'GET'
        });

        if (result.status !== 'success') {
            redirectToLogin();
            return false;
        }

        const fullName = result.user.name || result.user.full_name || 'User';
        const firstName = fullName.split(' ')[0];

        if (welcomeName) {
            welcomeName.textContent = firstName;
        }

        if (topUserName) {
            topUserName.textContent = fullName;
        }

        if (topUserInitial) {
            topUserInitial.textContent = fullName.charAt(0).toUpperCase();
        }

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

    async function loadChildrenOnDashboard() {
        const result = await requestJson(`${childrenApiBase}?action=list`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            renderEmptyDashboard();
            return;
        }

        const children = result.children || [];
        dashboardChildSelect.innerHTML = '';

        if (children.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nu ai copil adaugat';
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
    }

    async function updateDashboardChild(child) {
        localStorage.setItem('selectedChildId', child.id);
        dashboardChildBirth.textContent = `Nascut pe ${formatDate(child.birth_date)}`;

        const result = await requestJson(`${dashboardApiBase}?action=summary&child_id=${child.id}`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            renderEmptyDashboard(child);
            return;
        }

        renderDashboardData(child, result.summary || {});
    }

    function renderDashboardData(child, summary) {
        feedingCount.textContent = summary.feeding_count || 0;
        feedingInfo.textContent = summary.feeding_count > 0
            ? `${summary.feeding_count} mese adaugate azi pentru ${child.name}.`
            : `Nu exista mese adaugate azi pentru ${child.name}.`;

        sleepTotal.textContent = formatMinutes(summary.sleep_minutes || 0);
        sleepInfo.textContent = summary.sleep_minutes > 0
            ? `Somn inregistrat azi pentru ${child.name}.`
            : `Nu exista somn adaugat azi pentru ${child.name}.`;

        memoryCount.textContent = summary.memory_count || 0;
        memoryInfo.textContent = summary.memory_count === 1
            ? '1 moment adaugat.'
            : `${summary.memory_count || 0} momente adaugate.`;

        medicalCount.textContent = summary.medical_count || 0;
        medicalInfo.textContent = summary.medical_count > 0
            ? `${summary.medical_count} informatii medicale salvate pentru ${child.name}.`
            : `Nu exista informatii medicale pentru ${child.name}.`;

        relationsCount.textContent = summary.caregivers_count || 0;
        relationsChildName.textContent = `cu ${child.name}`;

        renderSchedule(child, summary.today_schedule || []);
        renderMoments(summary.recent_moments || []);

        dashboardNotifications = summary.notifications || [];
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
        dashboardNotifications = [];
    }

    function renderSchedule(child, items) {
        scheduleList.innerHTML = '';

        if (!items || items.length === 0) {
            scheduleList.innerHTML = `<p class="empty-panel-message">Nu exista activitati programate pentru azi pentru ${escapeHtml(child.name)}.</p>`;
            return;
        }

        items.slice(0, 6).forEach((item) => {
            const row = document.createElement('div');
            row.className = 'schedule-item';

            row.innerHTML = `
                <span>${escapeHtml(item.time || 'Astazi')}</span>
                <div>
                    <strong>${escapeHtml(item.title || 'Activitate')}</strong>
                    <p>${escapeHtml(item.description || '')}</p>
                </div>
                <b>✓</b>
            `;

            scheduleList.appendChild(row);
        });
    }

    function renderMoments(items) {
        momentsList.innerHTML = '';

        if (!items || items.length === 0) {
            momentsList.innerHTML = '<p class="empty-panel-message">Nu exista momente recente.</p>';
            return;
        }

        items.slice(0, 3).forEach((moment) => {
            const item = document.createElement('div');
            item.className = 'moment-item';

            item.innerHTML = `
                <div class="moment-placeholder">${moment.icon || getTypeIcon(moment.type)}</div>
                <div>
                    <strong>${escapeHtml(moment.title)}</strong>
                    <p>${escapeHtml(moment.description || '')}</p>
                    <small>${formatDate(moment.date)}</small>
                </div>
                <span>♥ ${moment.likes || 0}</span>
            `;

            momentsList.appendChild(item);
        });
    }

    function renderNotifications() {
        if (!notificationsList) {
            return;
        }

        notificationsList.innerHTML = '';

        if (!dashboardNotifications || dashboardNotifications.length === 0) {
            notificationsList.innerHTML = '<p class="empty-panel-message">Nu exista notificari momentan.</p>';
            return;
        }

        dashboardNotifications.forEach((notification) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>${getNotificationIcon(notification.notification_type)}</span>
                <div>
                    <strong>${escapeHtml(notification.title)}</strong>
                    <p>${escapeHtml(notification.message || '')}</p>
                    <small>${formatDateTime(notification.created_at)}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    function getNotificationIcon(type) {
        const icons = {
            medical: '✚',
            feeding: '🍼',
            sleep: '☾',
            sharing: '⌯',
            gallery: '▧',
            account: '👤'
        };

        return icons[type] || '🔔';
    }

    function formatMinutes(minutes) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;

        return `${h}h ${m}m`;
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

    function formatDateTime(dateString) {
        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleString('ro-RO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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
        logoutBtn.addEventListener('click', logoutUser);
    }

    document.querySelectorAll('[data-route]').forEach((element) => {
        element.addEventListener('click', () => {
            window.location.href = element.dataset.route;
        });
    });

    if (openNotificationsBtn && notificationsModal) {
        openNotificationsBtn.addEventListener('click', () => {
            renderNotifications();
            notificationsModal.classList.add('active');
        });
    }

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.close);

            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    const isLoggedIn = await checkSession();

    if (isLoggedIn) {
        await loadChildrenOnDashboard();
    }
});