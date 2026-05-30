document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    let myChildren = [];
    let myRelationships = [];
    let currentSelectedChildId = localStorage.getItem('selectedChildId');

    const API_CHILDREN = '/WEB_project/backend/api/children.php';
    const API_RELATIONS = '/WEB_project/backend/api/relations.php';

    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const logoutBtn = document.getElementById('logoutBtn');

    const dashboardChildSelect = document.getElementById('dashboardChildSelect');
    const dashboardChildBirth = document.getElementById('dashboardChildBirth');

    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const container = document.getElementById('relationshipsContainer');

    const statTotal = document.getElementById('statTotal');
    const statSiblings = document.getElementById('statSiblings');
    const statCousins = document.getElementById('statCousins');
    const statFriends = document.getElementById('statFriends');

    const modal = document.getElementById('relationModal');
    const openModalBtn = document.getElementById('openModalBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const addRelationForm = document.getElementById('addRelationForm');

    // ── Auth helpers ─────────────────────────────────────────────────────────

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
        if (!adminLink) return;
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

    async function apiRequest(url, method = 'GET', data = null) {
        const options = { method };

        if (data) {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(data);
        }

        return await requestJson(url, options);
    }

    // ── checkSession ─────────────────────────────────────────────────────────

    async function checkSession() {
        const result = await requestJson('/WEB_project/backend/api/check_auth.php', {
            method: 'GET'
        });

        if (result.status !== 'success') {
            redirectToLogin();
            return false;
        }

        const user = result.user;
        const fullName = user.name || user.full_name || 'User';

        if (topUserName) topUserName.textContent = fullName;

        // Setează initiala pe span (nu pe div)
        const initialSpan = document.getElementById('topUserInitialText');
        if (initialSpan) {
            initialSpan.textContent = fullName.charAt(0).toUpperCase();
        } else if (topUserInitial) {
            topUserInitial.textContent = fullName.charAt(0).toUpperCase();
        }

        showAdminLinkIfNeeded(user);

        // Încarcă poza de profil din API
        await loadUserPhoto();

        return true;
    }

    async function loadUserPhoto() {
        const result = await apiRequest('/WEB_project/backend/api/account.php?action=get');

        if (result.status === 'success') {
            const photoUrl = result.profile?.photo || null;
            const avatarDiv = document.getElementById('topUserInitial');
            const initialSpan = document.getElementById('topUserInitialText');

            if (avatarDiv && photoUrl) {
                avatarDiv.classList.add('has-photo');
                avatarDiv.style.backgroundImage = `url("${photoUrl}")`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';
                if (initialSpan) initialSpan.style.display = 'none';
            }
        }
    }

    async function logoutUser() {
        await requestJson('/WEB_project/backend/api/logout.php', { method: 'POST' });
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    // ── Children ─────────────────────────────────────────────────────────────

    async function loadChildren() {
        const result = await apiRequest(`${API_CHILDREN}?action=list`);

        if (result.status === 'success' && result.children?.length > 0) {
            myChildren = result.children;
            dashboardChildSelect.innerHTML = '';
            document.getElementById('childSelect').innerHTML = '';

            myChildren.forEach((child) => {
                const age = getAge(child.birth_date);

                const opt1 = document.createElement('option');
                opt1.value = child.id;
                opt1.textContent = `${child.name}, ${age} ani`;
                dashboardChildSelect.appendChild(opt1);

                const opt2 = document.createElement('option');
                opt2.value = child.id;
                opt2.textContent = child.name;
                document.getElementById('childSelect').appendChild(opt2);
            });

            if (!currentSelectedChildId || !myChildren.find(c => String(c.id) === String(currentSelectedChildId))) {
                currentSelectedChildId = myChildren[0].id;
            }

            dashboardChildSelect.value = currentSelectedChildId;
            localStorage.setItem('selectedChildId', currentSelectedChildId);
            updateChildBirthText(currentSelectedChildId);
        } else {
            dashboardChildSelect.innerHTML = '<option value="">Niciun copil</option>';
        }
    }

    function handleChildSelectionChange() {
        currentSelectedChildId = dashboardChildSelect.value;
        localStorage.setItem('selectedChildId', currentSelectedChildId);
        updateChildBirthText(currentSelectedChildId);
        renderPage();
    }

    function updateChildBirthText(childId) {
        const child = myChildren.find(c => String(c.id) === String(childId));
        if (child) {
            dashboardChildBirth.textContent = `Nascut pe ${formatDate(child.birth_date)}`;
        }
    }

    // ── Relations ────────────────────────────────────────────────────────────

    async function fetchRelationships() {
        const result = await apiRequest(API_RELATIONS);
        if (result.status === 'success') {
            myRelationships = result.relationships || [];
            renderPage();
        }
    }

    async function handleAddRelation(e) {
        e.preventDefault();

        const result = await apiRequest(`${API_RELATIONS}?action=add`, 'POST', {
            child_id: document.getElementById('childSelect').value,
            related_name: document.getElementById('relatedPersonName').value,
            relation_type: document.getElementById('relationType').value,
            notes: document.getElementById('relationNotes').value
        });

        if (result.status === 'success') {
            addRelationForm.reset();
            modal.classList.remove('active');
            await fetchRelationships();
        } else {
            alert('Eroare: ' + result.message);
        }
    }

    // ── Render ───────────────────────────────────────────────────────────────

    function renderPage() {
        if (!currentSelectedChildId || myChildren.length === 0) {
            container.innerHTML = `<article class="panel empty-state"><h3>Niciun copil selectat.</h3></article>`;
            return;
        }

        const query = searchInput.value.toLowerCase();
        const filter = typeFilter.value;

        const childRelations = myRelationships.filter(r => String(r.child_id) === String(currentSelectedChildId));

        statTotal.textContent = childRelations.length;
        statSiblings.textContent = childRelations.filter(r => r.relation_type === 'sibling').length;
        statCousins.textContent = childRelations.filter(r => r.relation_type === 'cousin').length;
        statFriends.textContent = childRelations.filter(r => r.relation_type === 'friend' || r.relation_type === 'classmate').length;

        const filteredToDisplay = childRelations.filter(rel => {
            const matchName = rel.related_name.toLowerCase().includes(query);
            const matchType = filter === 'all' || rel.relation_type === filter;
            return matchName && matchType;
        });

        if (filteredToDisplay.length === 0) {
            container.innerHTML = `
                <article class="panel empty-state">
                    <span>👥</span>
                    <h3>Nicio relatie</h3>
                    <p>Acest copil nu are relatii adaugate sau nu corespund filtrului.</p>
                </article>
            `;
            return;
        }

        const currentChild = myChildren.find(c => String(c.id) === String(currentSelectedChildId));

        let html = `
            <article class="panel">
                <div class="child-group-header">
                    <div class="child-avatar-large">👶</div>
                    <div>
                        <h3>Relatiile lui ${escapeHtml(currentChild.name)}</h3>
                    </div>
                </div>
                <div class="relations-grid">
        `;

        filteredToDisplay.forEach(rel => {
            const typeInfo = getRelationLabelAndClass(rel.relation_type);
            const initial = rel.related_name.charAt(0).toUpperCase();
            html += `
                <div class="relation-item">
                    <div class="relation-avatar">${initial}</div>
                    <div class="relation-info">
                        <h4>${escapeHtml(rel.related_name)}</h4>
                        <span class="badge ${typeInfo.class}">${typeInfo.label}</span>
                        ${rel.notes ? `<p class="relation-notes">${escapeHtml(rel.notes)}</p>` : ''}
                    </div>
                </div>
            `;
        });

        html += `</div></article>`;
        container.innerHTML = html;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    function getRelationLabelAndClass(type) {
        switch (type) {
            case 'sibling':   return { label: 'Frate/Sora',    class: 'sibling' };
            case 'cousin':    return { label: 'Var/Verisoara', class: 'cousin' };
            case 'friend':    return { label: 'Prieten',       class: 'friend' };
            case 'classmate': return { label: 'Coleg',         class: 'classmate' };
            default:          return { label: type,            class: '' };
        }
    }

    function getAge(dateString) {
        if (!dateString) return 0;
        const parts = dateString.split('-').map(Number);
        const bDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let age = today.getFullYear() - bDate.getFullYear();
        if (today.getMonth() < bDate.getMonth() ||
           (today.getMonth() === bDate.getMonth() && today.getDate() < bDate.getDate())) age--;
        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const parts = dateString.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2])
            .toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe.toString()
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    // ── Event listeners ──────────────────────────────────────────────────────

    dashboardChildSelect.addEventListener('change', handleChildSelectionChange);
    searchInput.addEventListener('input', renderPage);
    typeFilter.addEventListener('change', renderPage);

    openModalBtn.addEventListener('click', () => {
        if (currentSelectedChildId) document.getElementById('childSelect').value = currentSelectedChildId;
        modal.classList.add('active');
    });

    closeModalBtn.addEventListener('click', () => modal.classList.remove('active'));
    addRelationForm.addEventListener('submit', handleAddRelation);

    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    // ── Init ─────────────────────────────────────────────────────────────────

    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        await loadChildren();
        await fetchRelationships();
    }
});