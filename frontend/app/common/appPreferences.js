const APP_AUTH_TOKEN_KEY = 'bain_auth_token';

async function loadGlobalPreferences() {
    const token = sessionStorage.getItem(APP_AUTH_TOKEN_KEY);

    if (!token) {
        return;
    }

    try {
        const response = await fetch('/WEB_project/backend/api/account.php?action=get', {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        const result = await response.json();

        if (result.status !== 'success') {
            return;
        }

        applyGlobalPreferences(result.settings || {});
        applyGlobalUserData(result.user || {}, result.profile || {});
    } catch (error) {
        console.error('Preferences error:', error);
    }
}

function applyGlobalPreferences(settings) {
    const theme = settings.theme || 'light';
    const language = settings.language || settings.language_code || 'ro';
    const timezone = settings.timezone || 'Europe/Bucharest';

    document.body.classList.toggle('dark-mode', theme === 'dark');
    document.documentElement.lang = language;

    window.BAIN_PREFERENCES = {
        theme,
        language,
        timezone
    };

    window.dispatchEvent(new CustomEvent('bainPreferencesLoaded', {
        detail: window.BAIN_PREFERENCES
    }));
}

function applyGlobalUserData(user, profile) {
    const fullName = user.name || user.full_name || 'User';
    const initial = fullName.charAt(0).toUpperCase();
    const photo = profile.photo || profile.profile_photo || '';

    const nameElements = document.querySelectorAll('#topUserName');

    nameElements.forEach((element) => {
        element.textContent = fullName;
    });

    const avatarElements = document.querySelectorAll('#topUserInitial, #topUserAvatar, .user-menu .avatar');

    avatarElements.forEach((avatar) => {
        if (photo) {
            avatar.classList.add('has-photo');
            avatar.style.backgroundImage = `url("${photo.replaceAll('"', '\\"')}")`;
            avatar.textContent = '';
        } else {
            avatar.classList.remove('has-photo');
            avatar.style.backgroundImage = '';
            avatar.textContent = initial;
        }
    });
}

loadGlobalPreferences();