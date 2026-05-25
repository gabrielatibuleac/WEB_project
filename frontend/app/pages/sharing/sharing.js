document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '/WEB_project/backend/api/children.php';

    const childSelect = document.getElementById('childSelect');
    const childBirthText = document.getElementById('childBirthText');
    const sharingTitle = document.getElementById('sharingTitle');
    const sharingSubtitle = document.getElementById('sharingSubtitle');
    const momentSelect = document.getElementById('momentSelect');
    const momentPreview = document.getElementById('momentPreview');
    const recentSharesList = document.getElementById('recentSharesList');
    const rssLinkBox = document.getElementById('rssLinkBox');
    const rssItemsList = document.getElementById('rssItemsList');
    const rssMarkedOnly = document.getElementById('rssMarkedOnly');
    const rssPhotos = document.getElementById('rssPhotos');
    const rssAuto = document.getElementById('rssAuto');
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
    let currentProfile = null;

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
            childBirthText.textContent = 'Adauga primul copil din Profil copil.';
            renderPage();
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
        currentProfile = await loadProfile(currentChild.id);
        childBirthText.textContent = `Nascut pe ${formatDate(currentChild.birth_date)}`;
        sharingTitle.textContent = 'Partajare';
        sharingSubtitle.textContent = `Distribuie momentele importante din viata lui ${currentChild.name} cu cei dragi.`;
        renderPage();
    }

    async function loadProfile(childId) {
        const result = await requestJson(`${apiBase}?action=profile&id=${childId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });

        return result.status === 'success' ? result : null;
    }

    function renderPage() {
        renderMomentOptions();
        renderPreview();
        renderShares();
        renderRss();
    }

    function renderMomentOptions() {
        const moments = getAllMoments();
        momentSelect.innerHTML = '';

        if (!currentChild || moments.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nu exista momente disponibile';
            momentSelect.appendChild(option);
            return;
        }

        const selectedId = localStorage.getItem(`bain_selected_share_${currentChild.id}`) || moments[0].id;

        moments.forEach((moment) => {
            const option = document.createElement('option');
            option.value = moment.id;
            option.textContent = `${moment.title} - ${getTypeLabel(moment.type)} - ${formatDate(moment.date)}`;
            momentSelect.appendChild(option);
        });

        const exists = moments.some((moment) => String(moment.id) === String(selectedId));
        momentSelect.value = exists ? selectedId : moments[0].id;
        localStorage.setItem(`bain_selected_share_${currentChild.id}`, momentSelect.value);
        loadPrivacyForSelectedMoment();
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
                <p>${escapeHtml(moment.description)}</p>
                <small>${formatDate(moment.date)} ${moment.time || '00:00'} · ${escapeHtml(getPrivacyLabel(getSelectedPrivacy()))}</small>
            </div>
        `;
    }

    function renderShares() {
        const shares = getShares();
        recentSharesList.innerHTML = '';

        if (shares.length === 0) {
            recentSharesList.innerHTML = '<p class="empty-text">Nu exista distribuiri salvate.</p>';
            return;
        }

        shares
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
            .slice(0, 6)
            .forEach((share) => {
                const row = document.createElement('div');
                row.className = 'share-row';

                row.innerHTML = `
                    <span>${getChannelIcon(share.channel)}</span>
                    <div>
                        <strong>${escapeHtml(share.title)}</strong>
                        <p>${escapeHtml(share.status)}</p>
                        <small>${formatDateTime(share.createdAt)}</small>
                    </div>
                    <small class="share-tag">${escapeHtml(getChannelLabel(share.channel))}</small>
                `;

                recentSharesList.appendChild(row);
            });
    }

    function renderRss() {
        const rssSettings = getRssSettings();
        const shares = getShares().filter((share) => share.channel === 'rss');
        const rssLink = rssSettings.link || '';

        rssMarkedOnly.checked = rssSettings.markedOnly;
        rssPhotos.checked = rssSettings.photos;
        rssAuto.checked = rssSettings.auto;

        rssLinkBox.textContent = rssLink || 'Nu exista flux generat. Apasa pe Adauga in fluxul RSS.';
        rssItemsList.innerHTML = '';

        if (shares.length === 0) {
            rssItemsList.innerHTML = '<p class="empty-text">Nu exista elemente in fluxul RSS.</p>';
            return;
        }

        shares
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
            .slice(0, 5)
            .forEach((share) => {
                const row = document.createElement('div');
                row.className = 'rss-row';

                row.innerHTML = `
                    <span>🟧</span>
                    <div>
                        <strong>${escapeHtml(share.title)}</strong>
                        <p>${escapeHtml(share.status)}</p>
                        <small>${formatDateTime(share.createdAt)}</small>
                    </div>
                    <small>RSS</small>
                `;

                rssItemsList.appendChild(row);
            });
    }

    function getSelectedMoment() {
        const moments = getAllMoments();
        return moments.find((moment) => String(moment.id) === String(momentSelect.value)) || null;
    }

    function getAllMoments() {
        if (!currentChild) {
            return [];
        }

        const timelineItems = getStore(`bain_timeline_${currentChild.id}`, []);
        const medicalItems = getMedicalTimelineItems(currentChild.id);
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
            source: 'milestone',
            icon: '☆'
        }));

        const all = [...timelineItems, ...medicalItems, ...milestoneItems];
        const map = new Map();

        all.forEach((item) => {
            if (item && item.id && !map.has(String(item.id))) {
                map.set(String(item.id), item);
            }
        });

        return Array.from(map.values()).sort((a, b) => {
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

    function handleShare(channel) {
        const moment = getSelectedMoment();

        if (!currentChild || !moment) {
            alert('Nu exista moment selectat.');
            return;
        }

        const privacy = getSelectedPrivacy();

        if (channel === 'public' && privacy !== 'public') {
            alert('Pentru publicare publica, seteaza confidentialitatea pe Public.');
            return;
        }

        const shares = getShares();
        const link = channel === 'link' || channel === 'rss' ? generateShareLink(moment) : '';

        if (channel === 'link') {
            const existing = shares.find((share) => share.channel === 'link' && String(share.momentId) === String(moment.id));

            if (existing && existing.link) {
                copyText(existing.link);
                alert('Linkul exista deja si a fost copiat.');
                return;
            }
        }

        if (channel === 'rss') {
            saveRssSettings({
                ...getRssSettings(),
                link: generateRssLink()
            });
        }

        shares.push({
            id: uid(),
            childId: currentChild.id,
            momentId: moment.id,
            title: moment.title,
            description: moment.description,
            date: moment.date,
            channel,
            privacy,
            link,
            status: getShareStatus(channel, link),
            createdAt: new Date().toISOString()
        });

        setStore(`bain_shares_${currentChild.id}`, shares);

        if (link) {
            copyText(link);
        }

        renderShares();
        renderRss();
        renderNotifications();

        alert(getShareMessage(channel));
    }

    function getShares() {
        if (!currentChild) {
            return [];
        }

        return getStore(`bain_shares_${currentChild.id}`, []);
    }

    function getRssSettings() {
        if (!currentChild) {
            return {
                link: '',
                markedOnly: true,
                photos: true,
                auto: true
            };
        }

        return getStore(`bain_rss_${currentChild.id}`, {
            link: '',
            markedOnly: true,
            photos: true,
            auto: true
        });
    }

    function saveRssSettings(settings) {
        if (!currentChild) {
            return;
        }

        setStore(`bain_rss_${currentChild.id}`, settings);
    }

    function getSelectedPrivacy() {
        const input = document.querySelector('input[name="privacy"]:checked');
        return input ? input.value : 'only_me';
    }

    function savePrivacyForSelectedMoment() {
        const moment = getSelectedMoment();

        if (!currentChild || !moment) {
            return;
        }

        localStorage.setItem(`bain_privacy_${currentChild.id}_${moment.id}`, getSelectedPrivacy());
        renderPreview();
    }

    function loadPrivacyForSelectedMoment() {
        const moment = getSelectedMoment();

        if (!currentChild || !moment) {
            return;
        }

        const saved = localStorage.getItem(`bain_privacy_${currentChild.id}_${moment.id}`) || 'only_me';
        const input = document.querySelector(`input[name="privacy"][value="${saved}"]`);

        if (input) {
            input.checked = true;
        }
    }

    function generateShareLink(moment) {
        const token = btoa(`${currentChild.id}_${moment.id}_${Date.now()}`).replaceAll('=', '');
        return `${window.location.origin}/WEB_project/frontend/app/pages/sharing/shared.html?child=${currentChild.id}&moment=${encodeURIComponent(moment.id)}&token=${token}`;
    }

    function generateRssLink() {
        const slug = currentChild.name.toLowerCase().replaceAll(' ', '-').replace(/[^a-z0-9-]/g, '');
        return `${window.location.origin}/WEB_project/rss/${slug || 'copil'}-${currentChild.id}.xml`;
    }

    function getShareStatus(channel, link) {
        const statuses = {
            family: 'Distribuit familiei',
            link: `Link privat generat: ${link}`,
            social: 'Publicare sociala salvata local',
            rss: 'Adaugat in fluxul RSS'
        };

        return statuses[channel] || 'Distribuire salvata';
    }

    function getShareMessage(channel) {
        const messages = {
            family: 'Moment distribuit familiei.',
            link: 'Link generat si copiat.',
            social: 'Moment publicat local in aplicatia sociala.',
            rss: 'Moment adaugat in fluxul RSS.'
        };

        return messages[channel] || 'Distribuire salvata.';
    }

    function renderNotifications() {
        notificationsList.innerHTML = '';

        const shares = getShares()
            .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
            .slice(0, 5);

        if (shares.length === 0) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista notificari de partajare.</p>';
            return;
        }

        shares.forEach((share) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>${getChannelIcon(share.channel)}</span>
                <div>
                    <strong>${escapeHtml(share.title)}</strong>
                    <small>${escapeHtml(getChannelLabel(share.channel))} · ${formatDateTime(share.createdAt)}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    function copyText(text) {
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

    function uid() {
        return String(Date.now()) + String(Math.floor(Math.random() * 100000));
    }

    childSelect.addEventListener('change', async () => {
        await selectChild(childSelect.value);
    });

    momentSelect.addEventListener('change', () => {
        if (!currentChild) {
            return;
        }

        localStorage.setItem(`bain_selected_share_${currentChild.id}`, momentSelect.value);
        loadPrivacyForSelectedMoment();
        renderPreview();
    });

    document.querySelectorAll('input[name="privacy"]').forEach((input) => {
        input.addEventListener('change', savePrivacyForSelectedMoment);
    });

    document.querySelectorAll('[data-share-action]').forEach((button) => {
        button.addEventListener('click', () => {
            handleShare(button.dataset.shareAction);
        });
    });

    rssMarkedOnly.addEventListener('change', () => {
        saveRssSettings({
            ...getRssSettings(),
            markedOnly: rssMarkedOnly.checked
        });
        renderRss();
    });

    rssPhotos.addEventListener('change', () => {
        saveRssSettings({
            ...getRssSettings(),
            photos: rssPhotos.checked
        });
        renderRss();
    });

    rssAuto.addEventListener('change', () => {
        saveRssSettings({
            ...getRssSettings(),
            auto: rssAuto.checked
        });
        renderRss();
    });

    rssLinkBox.addEventListener('click', () => {
        const text = rssLinkBox.textContent;

        if (text && !text.includes('Nu exista')) {
            copyText(text);
            alert('Link RSS copiat.');
        }
    });

    clearSharesBtn.addEventListener('click', () => {
        if (!currentChild) {
            return;
        }

        if (!confirm('Stergi istoricul distribuirilor pentru copilul selectat?')) {
            return;
        }

        localStorage.removeItem(`bain_shares_${currentChild.id}`);
        renderShares();
        renderRss();
    });

    refreshSharingBtn.addEventListener('click', renderPage);

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            document.getElementById(button.dataset.close).classList.remove('active');
        });
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
});