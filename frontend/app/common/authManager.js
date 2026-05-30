class AuthManager {
    constructor() {
        this.TOKEN_KEY = 'bain_auth_token';
        this.USER_DATA_KEY = 'bain_user_data';
        this.SELECTED_CHILD_KEY = 'bain_selected_child';
        this.token = this.loadToken();
        this.userData = this.loadUserData();
        this.selectedChildId = this.loadSelectedChild();
        
        console.log(' AuthManager initialized');
        console.log('Token present:', !!this.token);
        console.log('User data:', this.userData?.name || 'NONE');
    }

    loadToken() {
        const token = sessionStorage.getItem(this.TOKEN_KEY) || 
                     localStorage.getItem(this.TOKEN_KEY) || '';
        if (token) {
            console.log(' Token found:', token.substring(0, 20) + '...');
        }
        return token;
    }

    setToken(token, persistent = false) {
        this.token = token;
        if (persistent) {
            localStorage.setItem(this.TOKEN_KEY, token);
            sessionStorage.removeItem(this.TOKEN_KEY);
        } else {
            sessionStorage.setItem(this.TOKEN_KEY, token);
        }
    }

    loadUserData() {
        try {
            const data = localStorage.getItem(this.USER_DATA_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                console.log(' User data loaded:', parsed.name);
                return parsed;
            }
        } catch (e) {
            console.error('Error loading user data:', e);
        }
        return null;
    }

    setUserData(userData) {
        this.userData = userData;
        console.log(' Saving user data:', userData.name);
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
    }

    loadSelectedChild() {
        const childId = localStorage.getItem(this.SELECTED_CHILD_KEY) || null;
        if (childId) {
            console.log(' Selected child loaded:', childId);
        }
        return childId;
    }

    setSelectedChild(childId) {
        this.selectedChildId = childId;
        if (childId) {
            localStorage.setItem(this.SELECTED_CHILD_KEY, childId);
            console.log(' Selected child saved:', childId);
        } else {
            localStorage.removeItem(this.SELECTED_CHILD_KEY);
        }
        window.dispatchEvent(new CustomEvent('selectedChildChanged', { detail: { childId } }));
    }

    isAuthenticated() {
        const auth = !!this.token;
        console.log(' isAuthenticated():', auth);
        return auth;
    }

    getAuthHeaders(extraHeaders = {}) {
        return {
            ...extraHeaders,
            'Authorization': `Bearer ${this.token}`
        };
    }

    async request(url, options = {}) {
        if (!this.isAuthenticated()) {
            console.error(' Not authenticated');
            this.clearAuth();
            return { status: 'error', message: 'Not authenticated' };
        }

        try {
            console.log(' Request:', options.method || 'GET', url);

            const response = await fetch(url, {
                ...options,
                headers: this.getAuthHeaders(options.headers || {})
            });

            console.log(' Response status:', response.status);

            const text = await response.text();
            let result;

            try {
                result = JSON.parse(text);
            } catch (error) {
                console.error(' Invalid JSON:', text);
                return { status: 'error', message: 'Invalid server response' };
            }

            if (response.status === 401) {
                console.error(' 401 Unauthorized');
                this.clearAuth();
                return result;
            }

            console.log('Response success');
            return result;
        } catch (error) {
            console.error(' Request error:', error);
            return { status: 'error', message: 'Network error: ' + error.message };
        }
    }

    async get(url) {
        return this.request(url, { method: 'GET' });
    }

    async post(url, data) {
        return this.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
    }

    async validateToken() {
        console.log(' validateToken()');
        if (!this.isAuthenticated()) {
            console.warn('No token to validate');
            return false;
        }

        const result = await this.get('/WEB_project/backend/api/check_auth.php');
        console.log('Validate result:', result);
        
        if (result.status === 'success' && result.user) {
            this.setUserData(result.user);
            console.log('Token valid, user:', result.user.name);
            return true;
        }

        console.error(' Token validation failed');
        return false;
    }

    async logout() {
        console.log(' Logging out...');
        try {
            await this.post('/WEB_project/backend/api/logout.php', {});
        } catch (e) {
            console.error('Logout error:', e);
        }
        this.clearAuth();
    }

    clearAuth() {
        console.log(' Clearing auth, redirecting to login');
        sessionStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_DATA_KEY);
        localStorage.removeItem(this.SELECTED_CHILD_KEY);
        this.token = '';
        this.userData = null;
        this.selectedChildId = null;
        window.location.href = '../auth/login.html';
    }

    showAdminLinkIfNeeded(selector = '#adminNavLink') {
        const adminLink = document.querySelector(selector);
        if (!adminLink) return;
        const isAdmin = this.userData?.role === 'admin';
        adminLink.hidden = !isAdmin;
        console.log(' Admin link visible:', isAdmin);
    }

    getUserName() {
        const name = this.userData?.name || this.userData?.full_name || 'User';
        return name;
    }

    getUserInitial() {
        return this.getUserName().charAt(0).toUpperCase();
    }
}

window.authManager = new AuthManager();
console.log(' authManager created globally');