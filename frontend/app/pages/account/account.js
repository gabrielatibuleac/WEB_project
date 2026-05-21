document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '/WEB_project/backend/api/children.php';

    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const topUserAvatar = document.getElementById('topUserAvatar');
    const profileAvatar = document.getElementById('profileAvatar');
    const profileInitial = document.getElementById('profileInitial');
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileLocation = document.getElementById('profileLocation');
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
    const editPhone = document.getElementById('editPhone');
    const editLocation = document.getElementById('editLocation');
    const editPhotoInput = document.getElementById('editPhotoInput');
    const editPhotoPreview = document.getElementById('editPhotoPreview');
    const editPhotoInitial = document.getElementById('editPhotoInitial');
    const removePhotoBtn = document.getElementById('removePhotoBtn');
    const languageSelect = document.getElementById('languageSelect');
    const themeSelect = document.getElementById('themeSelect');
    const timezoneSelect = document.getElementById('timezoneSelect');
    const defaultPageSelect = document.getElementById('defaultPageSelect');
    const twoFactorBtn = document.getElementById('twoFactorBtn');
    const twoFactorStatus = document.getElementById('twoFactorStatus');
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    const downloadDataBtn = document.getElementById('downloadDataBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const openNotificationsBtn = document.getElementById('openNotificationsBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');

    let sessionUser = null;
    let children = [];
    let profiles = [];
    let selectedPhoto = '';

    const translations = {
        ro: {
            navHome: '⌂ Acasa',
            navChild: '♙ Profil copil',
            navFeeding: '🍼 Hranire',
            navSleep: '☾ Somn',
            navTimeline: '◷ Timeline',
            navGallery: '▧ Galerie',
            navMedical: '✚ Medical',
            navRelations: '♧ Relatii',
            navSharing: '⌯ Partajare',
            navAccount: '👤 Contul meu',
            sideMessage: 'Fiecare zi conteaza.',
            pageTitle: 'Contul meu',
            pageSubtitle: 'Gestioneaza datele tale, securitatea contului si setarile familiei.',
            parentBadge: 'Parinte',
            editProfile: 'Editeaza profilul',
            familyTitle: 'Familia',
            caregiverCountText: 'ingrijitori conectati',
            childrenCountText: 'copii activi',
            childrenTitle: 'Copiii asociati contului',
            addChild: '+ Adauga copil',
            permissionsTitle: 'Roluri si permisiuni',
            permMeals: 'poate adauga mese',
            permSleep: 'poate adauga somn',
            permGallery: 'poate incarca in galerie',
            permMedical: 'poate edita fisa medicala',
            permShare: 'poate partaja momente',
            notificationTitle: 'Setari notificari',
            notifFeeding: 'Reminder hranire',
            notifMedical: 'Programari medicale',
            notifGallery: 'Actualizari din galerie',
            notifSharing: 'Distribuiri de familie',
            notifWeekly: 'Raport saptamanal',
            securityTitle: 'Securitate',
            changePassword: 'Schimba parola',
            twoFactor: 'Autentificare in doi pasi',
            downloadData: 'Descarca datele contului',
            preferencesTitle: 'Preferinte aplicatie',
            languageLabel: 'Limba',
            themeLabel: 'Tema',
            timezoneLabel: 'Fus orar',
            defaultPageLabel: 'Pagina preferata',
            bottomTitle: 'Familia incepe cu un cont bine organizat!',
            bottomText: 'Controlezi accesul, notificarile si siguranta datelor dintr-un singur loc.',
            nameLabel: 'Nume',
            phoneLabel: 'Telefon',
            locationLabel: 'Locatie',
            saveBtn: 'Salveaza',
            notificationsModalTitle: 'Notificari',
            profilePhotoLabel: 'Alege poza de profil',
            removePhoto: 'Sterge poza',
            photoHint: 'Poza ramane salvata local in browser.',
            active: 'Activ',
            inactive: 'Inactiv',
            phoneUnset: 'Telefon nesetat',
            locationUnset: 'Locatie nesetata',
            emailUnset: 'Email nesetat',
            caregiver: 'ingrijitor',
            child: 'copil',
            children: 'copii',
            year: 'an',
            years: 'ani',
            noChildren: 'Nu exista copii asociati contului.',
            noCaregivers: 'Nu exista ingrijitori adaugati.',
            noNotifications: 'Nu exista notificari momentan.',
            profileSaved: 'Profil salvat.',
            imageTooLarge: 'Poza este prea mare. Alege o imagine sub 2 MB.',
            invalidImage: 'Fisierul ales nu este o imagine valida.',
            twoFactorEnabled: 'Autentificarea in doi pasi a fost activata.',
            twoFactorDisabled: 'Autentificarea in doi pasi a fost dezactivata.'
        },
        en: {
            navHome: '⌂ Home',
            navChild: '♙ Child profile',
            navFeeding: '🍼 Feeding',
            navSleep: '☾ Sleep',
            navTimeline: '◷ Timeline',
            navGallery: '▧ Gallery',
            navMedical: '✚ Medical',
            navRelations: '♧ Relations',
            navSharing: '⌯ Sharing',
            navAccount: '👤 My account',
            sideMessage: 'Every day matters.',
            pageTitle: 'My account',
            pageSubtitle: 'Manage your data, account security and family settings.',
            parentBadge: 'Parent',
            editProfile: 'Edit profile',
            familyTitle: 'Family',
            caregiverCountText: 'connected caregivers',
            childrenCountText: 'active children',
            childrenTitle: 'Children linked to this account',
            addChild: '+ Add child',
            permissionsTitle: 'Roles and permissions',
            permMeals: 'can add meals',
            permSleep: 'can add sleep',
            permGallery: 'can upload to gallery',
            permMedical: 'can edit medical file',
            permShare: 'can share moments',
            notificationTitle: 'Notification settings',
            notifFeeding: 'Feeding reminders',
            notifMedical: 'Medical appointments',
            notifGallery: 'Gallery updates',
            notifSharing: 'Family sharing',
            notifWeekly: 'Weekly report',
            securityTitle: 'Security',
            changePassword: 'Change password',
            twoFactor: 'Two-factor authentication',
            downloadData: 'Download account data',
            preferencesTitle: 'Application preferences',
            languageLabel: 'Language',
            themeLabel: 'Theme',
            timezoneLabel: 'Time zone',
            defaultPageLabel: 'Preferred page',
            bottomTitle: 'Family starts with an organized account!',
            bottomText: 'Control access, notifications and data safety from one place.',
            nameLabel: 'Name',
            phoneLabel: 'Phone',
            locationLabel: 'Location',
            saveBtn: 'Save',
            notificationsModalTitle: 'Notifications',
            profilePhotoLabel: 'Choose profile photo',
            removePhoto: 'Remove photo',
            photoHint: 'The photo stays saved locally in this browser.',
            active: 'Active',
            inactive: 'Inactive',
            phoneUnset: 'Phone not set',
            locationUnset: 'Location not set',
            emailUnset: 'Email not set',
            caregiver: 'caregiver',
            child: 'child',
            children: 'children',
            year: 'year',
            years: 'years',
            noChildren: 'No children linked to this account.',
            noCaregivers: 'No caregivers added.',
            noNotifications: 'No notifications yet.',
            profileSaved: 'Profile saved.',
            imageTooLarge: 'The photo is too large. Choose an image under 2 MB.',
            invalidImage: 'The selected file is not a valid image.',
            twoFactorEnabled: 'Two-factor authentication enabled.',
            twoFactorDisabled: 'Two-factor authentication disabled.'
        }
    };

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

        sessionUser = result.user;
        return true;
    }

    async function loadChildren() {
        const result = await requestJson(`${apiBase}?action=list`, {
            method: 'GET',
            credentials: 'same-origin'
        });

        children = result.status === 'success' ? result.children || [] : [];
        profiles = [];

        for (const child of children) {
            const profile = await requestJson(`${apiBase}?action=profile&id=${child.id}`, {
                method: 'GET',
                credentials: 'same-origin'
            });

            if (profile.status === 'success') {
                profiles.push(profile);
            }
        }
    }

    function renderAccount() {
        const account = getAccountData();
        const settings = getSettings();
        const lang = settings.language;

        applyTheme(settings.theme);
        applyLanguage(lang);

        topUserName.textContent = account.name;
        topUserInitial.textContent = getInitial(account.name);
        profileInitial.textContent = getInitial(account.name);
        profileName.textContent = account.name;
        profileEmail.textContent = account.email || translations[lang].emailUnset;
        profilePhone.textContent = account.phone || translations[lang].phoneUnset;
        profileLocation.textContent = account.location || translations[lang].locationUnset;

        applyAvatar(topUserAvatar, account.photo);
        applyAvatar(profileAvatar, account.photo);

        renderChildren(lang);
        renderCaregivers(lang);
        renderSettings(settings);
        renderNotifications();
    }

    function renderChildren(lang) {
        childrenCount.textContent = children.length;
        childrenList.innerHTML = '';

        if (children.length === 0) {
            childrenList.innerHTML = `<p class="empty-text">${translations[lang].noChildren}</p>`;
            return;
        }

        children.forEach((child) => {
            const age = getAge(child.birth_date);
            const card = document.createElement('div');
            card.className = 'child-card';

            card.innerHTML = `
                <span>👶</span>
                <strong>${escapeHtml(child.name)}</strong>
                <p>${age} ${age === 1 ? translations[lang].year : translations[lang].years}</p>
            `;

            card.addEventListener('click', () => {
                localStorage.setItem('selectedChildId', child.id);
                window.location.href = '../childProfile/childProfile.html';
            });

            childrenList.appendChild(card);
        });
    }

    function renderCaregivers(lang) {
        const caregivers = getUniqueCaregivers();

        caregiverCount.textContent = caregivers.length;
        familyMembersList.innerHTML = '';

        if (caregivers.length === 0) {
            familyMembersList.innerHTML = `<p class="empty-text">${translations[lang].noCaregivers}</p>`;
            return;
        }

        caregivers.forEach((caregiver) => {
            const card = document.createElement('div');
            card.className = 'mini-card';

            card.innerHTML = `
                <span>👤</span>
                <strong>${escapeHtml(caregiver.name)}</strong>
                <p>${escapeHtml(caregiver.role || translations[lang].caregiver)}</p>
                <p>${caregiver.childrenCount} ${caregiver.childrenCount === 1 ? translations[lang].child : translations[lang].children}</p>
            `;

            familyMembersList.appendChild(card);
        });
    }

    function getUniqueCaregivers() {
        const map = new Map();

        profiles.forEach((profile) => {
            const caregivers = profile.caregivers || [];
            const childName = profile.child && profile.child.name ? profile.child.name : '';

            caregivers.forEach((caregiver) => {
                const name = caregiver.name || caregiver.full_name || caregiver.caregiver_name || 'Ingrijitor';
                const role = caregiver.role || caregiver.access_level || caregiver.relation || 'Ingrijitor';
                const email = caregiver.email || '';
                const phone = caregiver.phone || '';
                const key = normalizeKey(`${name}_${role}_${email}_${phone}`);

                if (!map.has(key)) {
                    map.set(key, {
                        name,
                        role,
                        email,
                        phone,
                        children: new Set()
                    });
                }

                if (childName) {
                    map.get(key).children.add(childName);
                }
            });
        });

        return Array.from(map.values()).map((caregiver) => ({
            name: caregiver.name,
            role: caregiver.role,
            email: caregiver.email,
            phone: caregiver.phone,
            childrenCount: caregiver.children.size
        }));
    }

    function renderSettings(settings) {
        languageSelect.value = settings.language;
        themeSelect.value = settings.theme;
        timezoneSelect.value = settings.timezone;
        defaultPageSelect.value = settings.defaultPage;

        document.querySelectorAll('[data-setting]').forEach((input) => {
            const path = input.dataset.setting;
            input.checked = Boolean(getByPath(settings, path));
        });

        twoFactorStatus.textContent = settings.security.twoFactor
            ? translations[settings.language].active
            : translations[settings.language].inactive;
    }

    function applyLanguage(lang) {
        document.documentElement.lang = lang;

        document.querySelectorAll('[data-i18n]').forEach((element) => {
            const key = element.dataset.i18n;

            if (translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
    }

    function applyTheme(theme) {
        document.body.classList.toggle('dark-mode', theme === 'dark');
    }

    function applyAvatar(element, photo) {
        if (photo) {
            element.classList.add('has-photo');
            element.style.backgroundImage = `url("${photo}")`;
        } else {
            element.classList.remove('has-photo');
            element.style.backgroundImage = '';
        }
    }

    function renderNotifications() {
        const settings = getSettings();
        const lang = settings.language;
        const activeNotifications = Object.entries(settings.notifications)
            .filter((entry) => entry[1])
            .map((entry) => entry[0]);

        notificationsList.innerHTML = '';

        if (activeNotifications.length === 0) {
            notificationsList.innerHTML = `<p class="empty-text">${translations[lang].noNotifications}</p>`;
            return;
        }

        activeNotifications.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>🔔</span>
                <div>
                    <strong>${escapeHtml(getNotificationName(item, lang))}</strong>
                    <small>${translations[lang].active}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    function getNotificationName(key, lang) {
        const names = {
            feeding: translations[lang].notifFeeding,
            medical: translations[lang].notifMedical,
            gallery: translations[lang].notifGallery,
            sharing: translations[lang].notifSharing,
            weekly: translations[lang].notifWeekly
        };

        return names[key] || key;
    }

    function getAccountData() {
        const stored = getStore('bain_account_profile', {});
        const fallbackName = sessionUser && sessionUser.name ? sessionUser.name : 'User';
        const fallbackEmail = sessionUser && sessionUser.email ? sessionUser.email : '';

        return {
            name: stored.name || fallbackName,
            email: stored.email || fallbackEmail,
            phone: stored.phone || '',
            location: stored.location || '',
            photo: stored.photo || ''
        };
    }

    function saveAccountData(data) {
        setStore('bain_account_profile', data);
    }

    function getSettings() {
        const defaults = {
            language: 'ro',
            theme: 'light',
            timezone: 'Europe/Bucharest',
            defaultPage: 'dashboard',
            notifications: {
                feeding: true,
                medical: true,
                gallery: true,
                sharing: false,
                weekly: true
            },
            security: {
                twoFactor: false
            }
        };

        const saved = getStore('bain_account_settings', {});
        return mergeObjects(defaults, saved);
    }

    function saveSettings(settings) {
        setStore('bain_account_settings', settings);
    }

    function savePreference(key, value) {
        const settings = getSettings();
        settings[key] = value;
        saveSettings(settings);
        renderAccount();
    }

    function saveNestedSetting(path, value) {
        const settings = getSettings();
        setByPath(settings, path, value);
        saveSettings(settings);
        renderAccount();
    }

    editProfileBtn.addEventListener('click', () => {
        const account = getAccountData();

        selectedPhoto = account.photo || '';

        editName.value = account.name;
        editEmail.value = account.email;
        editPhone.value = account.phone;
        editLocation.value = account.location;
        editPhotoInput.value = '';
        editPhotoInitial.textContent = getInitial(account.name);
        applyAvatar(editPhotoPreview, selectedPhoto);

        profileModal.classList.add('active');
    });

    editPhotoInput.addEventListener('change', () => {
        const file = editPhotoInput.files[0];
        const lang = getSettings().language;

        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            alert(translations[lang].invalidImage);
            editPhotoInput.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert(translations[lang].imageTooLarge);
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

    removePhotoBtn.addEventListener('click', () => {
        selectedPhoto = '';
        editPhotoInput.value = '';
        applyAvatar(editPhotoPreview, '');
    });

    profileForm.addEventListener('submit', (event) => {
        event.preventDefault();

        saveAccountData({
            name: editName.value.trim(),
            email: editEmail.value.trim(),
            phone: editPhone.value.trim(),
            location: editLocation.value.trim(),
            photo: selectedPhoto
        });

        profileModal.classList.remove('active');
        renderAccount();
        alert(translations[getSettings().language].profileSaved);
    });

    addChildBtn.addEventListener('click', () => {
        window.location.href = '../childProfile/childProfile.html?action=add';
    });

    languageSelect.addEventListener('change', () => {
        savePreference('language', languageSelect.value);
    });

    themeSelect.addEventListener('change', () => {
        savePreference('theme', themeSelect.value);
    });

    timezoneSelect.addEventListener('change', () => {
        savePreference('timezone', timezoneSelect.value);
    });

    defaultPageSelect.addEventListener('change', () => {
        savePreference('defaultPage', defaultPageSelect.value);
    });

    document.querySelectorAll('[data-setting]').forEach((input) => {
        input.addEventListener('change', () => {
            saveNestedSetting(input.dataset.setting, input.checked);
        });
    });

    twoFactorBtn.addEventListener('click', () => {
        const settings = getSettings();
        settings.security.twoFactor = !settings.security.twoFactor;
        saveSettings(settings);
        renderAccount();

        alert(settings.security.twoFactor
            ? translations[settings.language].twoFactorEnabled
            : translations[settings.language].twoFactorDisabled);
    });

    changePasswordBtn.addEventListener('click', () => {
        window.location.href = '../auth/forgotpassword.html';
    });

    downloadDataBtn.addEventListener('click', () => {
        const data = {
            account: getAccountData(),
            settings: getSettings(),
            children,
            profiles
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json'
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'bain-account-data.json';
        link.click();
        URL.revokeObjectURL(url);
    });

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

    function normalizeKey(value) {
        return String(value)
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ');
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

    function mergeObjects(base, saved) {
        const result = { ...base };

        Object.keys(saved || {}).forEach((key) => {
            if (
                saved[key] &&
                typeof saved[key] === 'object' &&
                !Array.isArray(saved[key]) &&
                base[key]
            ) {
                result[key] = mergeObjects(base[key], saved[key]);
            } else {
                result[key] = saved[key];
            }
        });

        return result;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    const ok = await checkSession();

    if (ok) {
        await loadChildren();
        renderAccount();
    }
});