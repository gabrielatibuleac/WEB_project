document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const topUserName = document.getElementById('topUserName');
    const userInitial = document.getElementById('userInitial');
    const logoutBtn = document.getElementById('logoutBtn');
    const childSelect = document.getElementById('childSelect');
    const emptyState = document.getElementById('emptyState');
    const profileContent = document.getElementById('profileContent');

    const childModal = document.getElementById('childModal');
    const milestoneModal = document.getElementById('milestoneModal');
    const caregiverModal = document.getElementById('caregiverModal');

    const childForm = document.getElementById('childForm');
    const milestoneForm = document.getElementById('milestoneForm');
    const caregiverForm = document.getElementById('caregiverForm');

    const openAddChildBtn = document.getElementById('openAddChildBtn');
    const emptyAddChildBtn = document.getElementById('emptyAddChildBtn');
    const editChildBtn = document.getElementById('editChildBtn');
    const deleteChildBtn = document.getElementById('deleteChildBtn');
    const openMilestoneBtn = document.getElementById('openMilestoneBtn');
    const openCaregiverBtn = document.getElementById('openCaregiverBtn');

    const apiBase = '/WEB_project/backend/api/children.php';

    let children = [];
    let currentChild = null;

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

    async function apiRequest(url, method = 'GET', data = null) {
        const options = {
            method: method
        };

        if (data) {
            options.headers = {
                'Content-Type': 'application/json'
            };

            options.body = JSON.stringify(data);
        }

        return await requestJson(url, options);
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

        topUserName.textContent = fullName;
        userInitial.textContent = fullName.charAt(0).toUpperCase();

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

    async function loadChildren(selectedId = null) {
        const result = await apiRequest(`${apiBase}?action=list`);

        if (result.status !== 'success') {
            alert(result.message || 'Eroare la incarcarea copiilor.');
            return;
        }

        children = result.children || [];
        childSelect.innerHTML = '';

        if (children.length === 0) {
            emptyState.style.display = 'block';
            profileContent.style.display = 'none';
            currentChild = null;
            localStorage.removeItem('selectedChildId');
            return;
        }

        emptyState.style.display = 'none';
        profileContent.style.display = 'block';

        children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
            childSelect.appendChild(option);
        });

        const savedChildId = selectedId || localStorage.getItem('selectedChildId');
        const selectedChild = children.find((child) => String(child.id) === String(savedChildId)) || children[0];

        await loadProfile(selectedChild.id);
    }

    async function loadProfile(childId) {
        const result = await apiRequest(`${apiBase}?action=profile&id=${childId}`);

        if (result.status !== 'success') {
            alert(result.message);
            return;
        }

        currentChild = result.child;
        childSelect.value = currentChild.id;
        localStorage.setItem('selectedChildId', currentChild.id);

        renderChild(currentChild);
        renderMilestones(result.milestones || []);
        renderCaregivers(result.caregivers || []);
    }

    function renderChild(child) {
        document.getElementById('childName').textContent = child.name || '-';
        document.getElementById('childAge').textContent = `${getAge(child.birth_date)} ani`;
        document.getElementById('childBirthDate').textContent = formatDate(child.birth_date);
        document.getElementById('childExactAge').textContent = getExactAge(child.birth_date);
        document.getElementById('childGender').textContent = child.gender || '-';
        document.getElementById('childBloodType').textContent = child.blood_type || '-';
        document.getElementById('childAllergies').textContent = child.allergies || 'Nu are alergii cunoscute';

        document.getElementById('educationLevel').textContent = child.education_level || '-';
        document.getElementById('institutionName').textContent = child.institution_name || '-';
        document.getElementById('groupOrClass').textContent = child.group_or_class || '-';
        document.getElementById('responsiblePerson').textContent = child.responsible_person || '-';

        document.getElementById('childDescription').textContent = child.description || 'Nu exista descriere.';
        document.getElementById('heightValue').textContent = child.height_cm || '0';
        document.getElementById('weightValue').textContent = child.weight_kg || '0';
        document.getElementById('bmiValue').textContent = child.bmi || '0';

        const favoriteActivities = document.getElementById('favoriteActivities');
        favoriteActivities.innerHTML = '';

        const activities = (child.favorite_activities || '')
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean);

        if (activities.length === 0) {
            const span = document.createElement('span');
            span.textContent = 'Fara activitati';
            favoriteActivities.appendChild(span);
            return;
        }

        activities.forEach((activity) => {
            const span = document.createElement('span');
            span.textContent = activity;
            favoriteActivities.appendChild(span);
        });
    }

    function renderMilestones(milestones) {
        const milestoneList = document.getElementById('milestoneList');
        milestoneList.innerHTML = '';

        if (milestones.length === 0) {
            milestoneList.innerHTML = '<p class="muted">Nu exista repere adaugate.</p>';
            return;
        }

        milestones.forEach((milestone) => {
            const item = document.createElement('div');
            item.className = 'milestone-item';

            item.innerHTML = `
                <span>✓</span>
                <div>
                    <strong>${escapeHtml(milestone.title)}</strong>
                    <small>${formatDate(milestone.milestone_date)}</small>
                </div>
                <small>Finalizat</small>
            `;

            milestoneList.appendChild(item);
        });
    }

    function renderCaregivers(caregivers) {
        const caregiversGrid = document.getElementById('caregiversGrid');
        caregiversGrid.innerHTML = '';

        if (caregivers.length === 0) {
            caregiversGrid.innerHTML = '<p class="muted">Nu exista ingrijitori adaugati.</p>';
            return;
        }

        caregivers.forEach((caregiver) => {
            const card = document.createElement('div');
            card.className = 'caregiver-card';

            card.innerHTML = `
                <div class="caregiver-avatar">👤</div>
                <div>
                    <h4>${escapeHtml(caregiver.role)}</h4>
                    <p>${escapeHtml(caregiver.name)}</p>
                    <small>${escapeHtml(caregiver.access_level)}</small>
                </div>
            `;

            caregiversGrid.appendChild(card);
        });
    }

    function openModal(modal) {
        modal.classList.add('active');
    }

    function closeModal(modal) {
        modal.classList.remove('active');
    }

    function openAddChildModal() {
        document.getElementById('childModalTitle').textContent = 'Adauga copil';
        childForm.reset();
        document.getElementById('childId').value = '';
        openModal(childModal);
    }

    function openEditChildModal() {
        if (!currentChild) {
            return;
        }

        document.getElementById('childModalTitle').textContent = 'Editeaza copil';
        document.getElementById('childId').value = currentChild.id;
        document.getElementById('name').value = currentChild.name || '';
        document.getElementById('birth_date').value = currentChild.birth_date || '';
        document.getElementById('gender').value = currentChild.gender || '';
        document.getElementById('blood_type').value = currentChild.blood_type || '';
        document.getElementById('allergies').value = currentChild.allergies || '';
        document.getElementById('education_level').value = currentChild.education_level || '';
        document.getElementById('institution_name').value = currentChild.institution_name || '';
        document.getElementById('group_or_class').value = currentChild.group_or_class || '';
        document.getElementById('responsible_person').value = currentChild.responsible_person || '';
        document.getElementById('height_cm').value = currentChild.height_cm || '';
        document.getElementById('weight_kg').value = currentChild.weight_kg || '';
        document.getElementById('bmi').value = currentChild.bmi || '';
        document.getElementById('favorite_activities_input').value = currentChild.favorite_activities || '';
        document.getElementById('description').value = currentChild.description || '';

        openModal(childModal);
    }

    function collectChildForm() {
        return {
            id: document.getElementById('childId').value,
            name: document.getElementById('name').value,
            birth_date: document.getElementById('birth_date').value,
            gender: document.getElementById('gender').value,
            blood_type: document.getElementById('blood_type').value,
            allergies: document.getElementById('allergies').value,
            education_level: document.getElementById('education_level').value,
            institution_name: document.getElementById('institution_name').value,
            group_or_class: document.getElementById('group_or_class').value,
            responsible_person: document.getElementById('responsible_person').value,
            height_cm: document.getElementById('height_cm').value,
            weight_kg: document.getElementById('weight_kg').value,
            bmi: document.getElementById('bmi').value,
            favorite_activities: document.getElementById('favorite_activities_input').value,
            description: document.getElementById('description').value
        };
    }

    openAddChildBtn.addEventListener('click', openAddChildModal);
    emptyAddChildBtn.addEventListener('click', openAddChildModal);
    editChildBtn.addEventListener('click', openEditChildModal);
    openMilestoneBtn.addEventListener('click', () => openModal(milestoneModal));
    openCaregiverBtn.addEventListener('click', () => openModal(caregiverModal));

    childSelect.addEventListener('change', async () => {
        await loadProfile(childSelect.value);
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            closeModal(document.getElementById(button.dataset.close));
        });
    });

    childForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const data = collectChildForm();
        const action = data.id ? 'update' : 'create';
        const result = await apiRequest(`${apiBase}?action=${action}`, 'POST', data);

        alert(result.message);

        if (result.status === 'success') {
            closeModal(childModal);
            await loadChildren(data.id || null);
        }
    });

    deleteChildBtn.addEventListener('click', async () => {
        if (!currentChild) {
            return;
        }

        if (!confirm('Sigur vrei sa stergi acest copil?')) {
            return;
        }

        const result = await apiRequest(`${apiBase}?action=delete`, 'POST', {
            id: currentChild.id
        });

        alert(result.message);

        if (result.status === 'success') {
            currentChild = null;
            await loadChildren();
        }
    });

    milestoneForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentChild) {
            return;
        }

        const result = await apiRequest(`${apiBase}?action=add_milestone`, 'POST', {
            child_id: currentChild.id,
            title: document.getElementById('milestoneTitle').value,
            milestone_date: document.getElementById('milestoneDate').value
        });

        alert(result.message);

        if (result.status === 'success') {
            milestoneForm.reset();
            closeModal(milestoneModal);
            await loadProfile(currentChild.id);
        }
    });

    caregiverForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!currentChild) {
            return;
        }

        const result = await apiRequest(`${apiBase}?action=add_caregiver`, 'POST', {
            child_id: currentChild.id,
            name: document.getElementById('caregiverName').value,
            role: document.getElementById('caregiverRole').value,
            access_level: document.getElementById('accessLevel').value
        });

        alert(result.message);

        if (result.status === 'success') {
            caregiverForm.reset();
            closeModal(caregiverModal);
            await loadProfile(currentChild.id);
        }
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

    function getExactAge(dateString) {
        const age = getAge(dateString);
        return `${age} ani`;
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

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    const isLoggedIn = await checkSession();

    if (isLoggedIn) {
        await loadChildren();
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        openAddChildModal();
    }
});