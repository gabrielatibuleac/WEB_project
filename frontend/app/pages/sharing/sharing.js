document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const childrenApiBase = '/WEB_project/backend/api/children.php';
    const timelineApiBase = '/WEB_project/backend/api/timeline.php';
    const sharingApiBase = '/WEB_project/backend/api/sharing.php';

    const childSelect = document.getElementById('childSelect');
    const childBirthText = document.getElementById('childBirthText');
    const sharingTitle = document.getElementById('sharingTitle');
    const sharingSubtitle = document.getElementById('sharingSubtitle');
    const momentSelect = document.getElementById('momentSelect');
    const momentPreview = document.getElementById('momentPreview');
    const recentSharesList = document.getElementById('recentSharesList');
    const rssLinkBox = document.getElementById('rssLinkBox');
    const rssItemsList = document.getElementById('rssItemsList');
    const clearSharesBtn = document.getElementById('clearSharesBtn');
    const refreshSharingBtn = document.getElementById('refreshSharingBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');
    const openNotificationsBtn = document.getElementById('openNotificationsBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');

    let children = [];
    let currentChild = null;
    let currentMoments = [];
    let currentShares = [];
    let initialMomentId = null;
    const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');

if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', (event) => {
        event.stopPropagation();
        sidebar.classList.toggle('active');
    });

    document.addEventListener('click', (event) => {
        if (
            sidebar.classList.contains('active') &&
            !sidebar.contains(event.target) &&
            event.target !== menuToggle
        ) {
            sidebar.classList.remove('active');
        }
    });
}

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
        const params = new URLSearchParams(window.location.search);
        const urlChildId = params.get('child_id');
        initialMomentId = params.get('moment_id');

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
            currentMoments = [];
            currentShares = [];
            childBirthText.textContent = 'Adauga primul copil din Profil copil.';
            renderPage();
            return;
        }

        const savedChildId = urlChildId || localStorage.getItem('selectedChildId');
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
        await selectChild(currentChild.id, initialMomentId);
    }

    async function selectChild(childId, selectedMomentId = null) {
        currentChild = children.find((child) => String(child.id) === String(childId));

        if (!currentChild) {
            return;
        }

        localStorage.setItem('selectedChildId', currentChild.id);
        childBirthText.textContent = `Nascut pe ${formatDate(currentChild.birth_date)}`;

        if (sharingTitle) {
            sharingTitle.textContent = 'Partajare';
        }

        if (sharingSubtitle) {
            sharingSubtitle.textContent = `Distribuie momentele importante din viata lui ${currentChild.name}.`;
        }

        await loadMoments();
        await loadShares();
        renderPage(selectedMomentId);
    }

    async function loadMoments() {
        if (!currentChild) {
            currentMoments = [];
            return;
        }

        const result = await requestJson(`${timelineApiBase}?action=list&child_id=${currentChild.id}`, {
            method: 'GET'
        });

        currentMoments = result.status === 'success' ? result.items || [] : [];
    }

    async function loadShares() {
        if (!currentChild) {
            currentShares = [];
            return;
        }

        const result = await requestJson(`${sharingApiBase}?action=list&child_id=${currentChild.id}`, {
            method: 'GET'
        });

        currentShares = result.status === 'success' ? result.shares || [] : [];
    }

    function renderPage(selectedMomentId = null) {
        renderMomentOptions(selectedMomentId);
        renderPreview();
        renderShares();
        renderRss();
    }

    function renderMomentOptions(selectedMomentId = null) {
        momentSelect.innerHTML = '';

        if (!currentChild || currentMoments.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nu exista momente disponibile';
            momentSelect.appendChild(option);
            return;
        }

        currentMoments.forEach((moment) => {
            const option = document.createElement('option');
            option.value = moment.id;
            option.textContent = `${moment.title} - ${getTypeLabel(moment.type)} - ${formatDate(moment.date)}`;
            momentSelect.appendChild(option);
        });

        if (selectedMomentId) {
            const exists = currentMoments.some((moment) => String(moment.id) === String(selectedMomentId));

            if (exists) {
                momentSelect.value = selectedMomentId;
            }
        }
    }

    function renderPreview() {
        const moment = getSelectedMoment();

        if (!moment) {
            momentPreview.innerHTML = '<p class="empty-text">Nu exista moment selectat.</p>';
            return;
        }

        momentPreview.innerHTML = `
            <div class="preview-icon">${moment.icon || getTypeIcon(moment.type)}</div>
            <div class="preview-info">
                <h4>${escapeHtml(moment.title)}</h4>
                <p>${escapeHtml(moment.description || '')}</p>
                <small>${formatDate(moment.date)} ${moment.time || '00:00'} · ${escapeHtml(getPrivacyLabel(getSelectedPrivacy()))}</small>
            </div>
        `;
    }

    function renderShares() {
        recentSharesList.innerHTML = '';

        if (currentShares.length === 0) {
            recentSharesList.innerHTML = '<p class="empty-text">Nu exista distribuiri salvate.</p>';
            return;
        }

        currentShares.slice(0, 6).forEach((share) => {
            const row = document.createElement('div');
            row.className = 'share-row';

            row.innerHTML = `
                <span>${getChannelIcon(share.channel)}</span>
                <div>
                    <strong>${escapeHtml(share.title)}</strong>
                    <p>${escapeHtml(share.status || '')}</p>
                    <small>${formatDateTime(share.created_at)}</small>
                </div>
                <small class="share-tag">${escapeHtml(getChannelLabel(share.channel))}</small>
            `;

            recentSharesList.appendChild(row);
        });
    }

    function renderRss() {
        const rssShares = currentShares.filter((share) => share.channel === 'rss');
        const lastRss = rssShares[0];

        rssLinkBox.textContent = lastRss && lastRss.share_link ? lastRss.share_link : 'Nu exista flux generat.';
        rssItemsList.innerHTML = '';

        if (rssShares.length === 0) {
            rssItemsList.innerHTML = '<p class="empty-text">Nu exista elemente in fluxul RSS.</p>';
            return;
        }

        rssShares.slice(0, 5).forEach((share) => {
            const row = document.createElement('div');
            row.className = 'rss-row';

            row.innerHTML = `
                <span>🟧</span>
                <div>
                    <strong>${escapeHtml(share.title)}</strong>
                    <p>${escapeHtml(share.status || '')}</p>
                    <small>${formatDateTime(share.created_at)}</small>
                </div>
                <small>RSS</small>
            `;

            rssItemsList.appendChild(row);
        });
    }

    function getSelectedMoment() {
        return currentMoments.find((moment) => String(moment.id) === String(momentSelect.value)) || null;
    }

    async function handleShare(channel) {
        const moment = getSelectedMoment();

        if (!currentChild || !moment) {
            alert('Nu exista moment selectat.');
            return;
        }

        const privacy = getSelectedPrivacy();
        const momentDbId = moment.db_id || (moment.source === 'timeline' ? moment.id : null);

        const result = await requestJson(`${sharingApiBase}?action=create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                moment_id: momentDbId,
                moment_db_id: momentDbId,
                moment_source: moment.source || 'timeline',
                title: moment.title,
                channel: channel,
                privacy: privacy
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            await loadShares();
            renderPage(moment.id);

            if (result.share && result.share.share_link) {
                copyText(result.share.share_link);
            }
        }
    }

    function renderNotifications() {
        notificationsList.innerHTML = '';

        if (currentShares.length === 0) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista notificari de partajare.</p>';
            return;
        }

        currentShares.slice(0, 5).forEach((share) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>${getChannelIcon(share.channel)}</span>
                <div>
                    <strong>${escapeHtml(share.title)}</strong>
                    <small>${escapeHtml(getChannelLabel(share.channel))} · ${formatDateTime(share.created_at)}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    function getSelectedPrivacy() {
        const input = document.querySelector('input[name="privacy"]:checked');
        return input ? input.value : 'only_me';
    }

    function copyText(text) {
        if (!text) {
            return;
        }

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            return;
        }

        const input = document.createElement('input');
        input.value = text;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
    }

    function getChannelIcon(channel) {
        const icons = {
            family: '♧',
            link: '🔗',
            social: '📷',
            rss: '🟧'
        };

        return icons[channel] || '⌯';
    }

    function getChannelLabel(channel) {
        const labels = {
            family: 'Familie',
            link: 'Link',
            social: 'Social',
            rss: 'RSS'
        };

        return labels[channel] || 'Partajare';
    }

    function getPrivacyLabel(value) {
        const labels = {
            only_me: 'Doar eu',
            family: 'Familie',
            private_link: 'Link privat',
            public: 'Public'
        };

        return labels[value] || 'Doar eu';
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

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    childSelect.addEventListener('change', async () => {
        await selectChild(childSelect.value);
    });

    momentSelect.addEventListener('change', renderPreview);

    document.querySelectorAll('input[name="privacy"]').forEach((input) => {
        input.addEventListener('change', renderPreview);
    });

    document.querySelectorAll('[data-share-action]').forEach((button) => {
        button.addEventListener('click', () => {
            handleShare(button.dataset.shareAction);
        });
    });

    clearSharesBtn.addEventListener('click', async () => {
        if (!currentChild) {
            return;
        }

        if (!confirm('Stergi istoricul distribuirilor pentru copilul selectat?')) {
            return;
        }

        const result = await requestJson(`${sharingApiBase}?action=clear`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            await loadShares();
            renderPage();
        }
    });

    refreshSharingBtn.addEventListener('click', async () => {
        await loadMoments();
        await loadShares();
        renderPage(momentSelect.value);
    });

    rssLinkBox.addEventListener('click', () => {
        const text = rssLinkBox.textContent;

        if (text && !text.includes('Nu exista')) {
            copyText(text);
            alert('Link RSS copiat.');
        }
    });

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.close);

            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    logoutBtn.addEventListener('click', logoutUser);

    const ok = await checkAuth();

    if (ok) {
        await loadChildren();
    }
});