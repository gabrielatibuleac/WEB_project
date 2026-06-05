document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';
    const accountApiBase = '/WEB_project/backend/api/account.php';

    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const topUserAvatar = document.getElementById('topUserAvatar');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileInitial = document.getElementById('profileInitial');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');

    const caregiverCount = document.getElementById('caregiverCount');
    const childrenCount = document.getElementById('childrenCount');
    const familyMembersList = document.getElementById('familyMembersList');
    const childrenList = document.getElementById('childrenList');

    const editProfileBtn = document.getElementById('editProfileBtn');
    const addChildBtn = document.getElementById('addChildBtn');
    const profileModal = document.getElementById('profileModal');
    const profileForm = document.getElementById('profileForm');

    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const editPhotoInput = document.getElementById('editPhotoInput');
    const editPhotoPreview = document.getElementById('editPhotoPreview');
    const editPhotoInitial = document.getElementById('editPhotoInitial');
    const removePhotoBtn = document.getElementById('removePhotoBtn');

    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');

    const logoutBtn = document.getElementById('logoutBtn');
    const openNotificationsBtn = document.getElementById('openNotificationsBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');

    let accountData = null;
    let selectedPhoto = '';

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

    async function logoutUser() {
        await requestJson('/WEB_project/backend/api/logout.php', {
            method: 'POST'
        });

        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    async function loadAccount() {
        const result = await requestJson(`${accountApiBase}?action=get`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            redirectToLogin();
            return;
        }

        accountData = result;
        renderAccount();
    }

    function renderAccount() {
        const user = accountData.user || {};
        const profile = accountData.profile || {};
        const settings = accountData.settings || {};

        showAdminLinkIfNeeded(user);
        applyTheme(settings.theme || 'light');

        if (topUserName) {
            topUserName.textContent = user.name || 'User';
        }

        if (topUserInitial) {
            topUserInitial.textContent = getInitial(user.name);
        }

        if (profileInitial) {
            profileInitial.textContent = getInitial(user.name);
        }

        if (profileName) {
            profileName.textContent = user.name || 'User';
        }

        if (profileEmail) {
            profileEmail.textContent = user.email || 'Email nesetat';
        }

        applyAvatar(topUserAvatar, profile.photo);
        applyAvatar(profileAvatar, profile.photo);

        renderChildren(accountData.children || []);
        renderCaregivers(accountData.caregivers || []);
        renderSettings(settings);
        renderNotifications();
    }

    function renderChildren(children) {
        if (childrenCount) {
            childrenCount.textContent = children.length;
        }

        if (!childrenList) {
            return;
        }

        childrenList.innerHTML = '';

        if (children.length === 0) {
            childrenList.innerHTML = '<p class="empty-text">Nu exista copii asociati contului.</p>';
            return;
        }

        children.forEach((child) => {
            const card = document.createElement('div');
            card.className = 'child-card';

            const age = getAge(child.birth_date);

            card.innerHTML = `
                <span>${escapeHtml(getInitial(child.name))}</span>
                <strong>${escapeHtml(child.name)}</strong>
                <p>${age} ${age === 1 ? 'an' : 'ani'}</p>
            `;

            card.addEventListener('click', () => {
                localStorage.setItem('selectedChildId', child.id);
                window.location.href = '../childProfile/childProfile.html';
            });

            childrenList.appendChild(card);
        });
    }

    function renderCaregivers(caregivers) {
        const uniqueCaregivers = getUniqueCaregivers(caregivers);

        if (caregiverCount) {
            caregiverCount.textContent = uniqueCaregivers.length;
        }

        if (!familyMembersList) {
            return;
        }

        familyMembersList.innerHTML = '';

        if (uniqueCaregivers.length === 0) {
            familyMembersList.innerHTML = '<p class="empty-text">Nu exista ingrijitori adaugati.</p>';
            return;
        }

        uniqueCaregivers.forEach((caregiver) => {
            const card = document.createElement('div');
            card.className = 'mini-card';

            card.innerHTML = `
                <span>👤</span>
                <strong>${escapeHtml(caregiver.name)}</strong>
                <p>${escapeHtml(caregiver.role || 'Ingrijitor')}</p>
                <p>${caregiver.childrenCount} ${caregiver.childrenCount === 1 ? 'copil' : 'copii'}</p>
            `;

            familyMembersList.appendChild(card);
        });
    }

    function getUniqueCaregivers(caregivers) {
        const map = new Map();

        caregivers.forEach((caregiver) => {
            const name = caregiver.name || 'Ingrijitor';
            const role = caregiver.role || 'Ingrijitor';
            const key = `${name}_${role}`.toLowerCase();

            if (!map.has(key)) {
                map.set(key, {
                    name,
                    role,
                    children: new Set()
                });
            }

            if (caregiver.child_name) {
                map.get(key).children.add(caregiver.child_name);
            }
        });

        return Array.from(map.values()).map((caregiver) => ({
            name: caregiver.name,
            role: caregiver.role,
            childrenCount: caregiver.children.size
        }));
    }

    function renderSettings(settings) {
        if (languageSelect) {
            languageSelect.value = settings.language || settings.language_code || 'ro';
        }

        if (themeSelect) {
            themeSelect.value = settings.theme || 'light';
        }

        document.querySelectorAll('[data-setting]').forEach((input) => {
            input.checked = Boolean(getByPath(settings, input.dataset.setting));
        });
    }

    function renderNotifications() {
        if (!notificationsList) {
            return;
        }

        const notifications = accountData.notifications || [];
        notificationsList.innerHTML = '';

        if (notifications.length === 0) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista notificari momentan.</p>';
            return;
        }

        notifications.slice(0, 10).forEach((notification) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>🔔</span>
                <div>
                    <strong>${escapeHtml(notification.title)}</strong>
                    <small>${escapeHtml(notification.message || '')}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    async function saveProfile() {
    const result = await requestJson(`${accountApiBase}?action=update_profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: editName.value.trim(),
            email: editEmail.value.trim(),
            photo: selectedPhoto
        })
    });

    alert(result.message);

    if (result.status === 'success') {
        // ✅ ACTUALIZEAZA authManager
        if (window.authManager) {
            window.authManager.setUserName(editName.value.trim());
            window.authManager.setUserPhoto(selectedPhoto);
            window.authManager.setUserInitial(getInitial(editName.value.trim()));
        }
        
        profileModal.classList.remove('active');
        await loadAccount();
    }
}

    async function saveSettings(settings) {
        const result = await requestJson(`${accountApiBase}?action=update_settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });

        if (result.status === 'success') {
            await loadAccount();
        } else {
            alert(result.message);
        }
    }

    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    function applyAvatar(element, photo) {
        if (!element) {
            return;
        }

        if (photo) {
            element.classList.add('has-photo');
            element.style.backgroundImage = `url("${photo}")`;
        } else {
            element.classList.remove('has-photo');
            element.style.backgroundImage = '';
        }
    }

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            const user = accountData.user || {};
            const profile = accountData.profile || {};

            selectedPhoto = profile.photo || '';

            editName.value = user.name || '';
            editEmail.value = user.email || '';

            if (editPhotoInput) {
                editPhotoInput.value = '';
            }

            if (editPhotoInitial) {
                editPhotoInitial.textContent = getInitial(user.name);
            }

            applyAvatar(editPhotoPreview, selectedPhoto);
            profileModal.classList.add('active');
        });
    }

    if (editPhotoInput) {
        editPhotoInput.addEventListener('change', () => {
            const file = editPhotoInput.files[0];

            if (!file) {
                return;
            }

            if (!file.type.startsWith('image/')) {
                alert('Fisierul ales nu este o imagine valida.');
                editPhotoInput.value = '';
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                alert('Poza este prea mare. Alege o imagine sub 2 MB.');
                editPhotoInput.value = '';
                return;
            }

            const reader = new FileReader();

            reader.onload = () => {
                selectedPhoto = reader.result;
                applyAvatar(editPhotoPreview, selectedPhoto);
            };

            reader.readAsDataURL(file);
        });
    }

    if (removePhotoBtn) {
        removePhotoBtn.addEventListener('click', () => {
            selectedPhoto = '';
            editPhotoInput.value = '';
            applyAvatar(editPhotoPreview, '');
        });
    }

    if (profileForm) {
        profileForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            await saveProfile();
        });
    }

    if (addChildBtn) {
        addChildBtn.addEventListener('click', () => {
            window.location.href = '../childProfile/childProfile.html?action=add';
        });
    }

    if (languageSelect) {
        languageSelect.addEventListener('change', async () => {
            const settings = clone(accountData.settings || {});
            settings.language = languageSelect.value;
            await saveSettings(settings);
        });
    }

    if (themeSelect) {
        themeSelect.addEventListener('change', async () => {
            const settings = clone(accountData.settings || {});
            settings.theme = themeSelect.value;
            await saveSettings(settings);
        });
    }

    document.querySelectorAll('[data-setting]').forEach((input) => {
        input.addEventListener('change', async () => {
            const settings = clone(accountData.settings || {});
            setByPath(settings, input.dataset.setting, input.checked);
            await saveSettings(settings);
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

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function getByPath(object, path) {
        return path.split('.').reduce((current, key) => current && current[key], object);
    }

    function setByPath(object, path, value) {
        const parts = path.split('.');
        let current = object;

        parts.slice(0, -1).forEach((key) => {
            if (!current[key]) {
                current[key] = {};
            }

            current = current[key];
        });

        current[parts[parts.length - 1]] = value;
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

    function getInitial(name) {
        return String(name || 'U').trim().charAt(0).toUpperCase();
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    await loadAccount();
});