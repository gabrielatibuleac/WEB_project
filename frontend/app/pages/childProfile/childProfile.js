document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const topUserName = document.getElementById('topUserName');
    const userInitial = document.getElementById('userInitial') || document.getElementById('topUserInitial');
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

        if (topUserName) {
            topUserName.textContent = fullName;
        }

        if (userInitial) {
            userInitial.textContent = fullName.charAt(0).toUpperCase();
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

    async function loadChildren(selectedId = null) {
        const result = await apiRequest(`${apiBase}?action=list`);

        if (result.status !== 'success') {
            alert(result.message || 'Eroare la incarcarea copiilor.');
            return;
        }

        children = result.children || [];

        if (childSelect) {
            childSelect.innerHTML = '';
        }

        if (children.length === 0) {
            if (emptyState) {
                emptyState.style.display = 'block';
            }

            if (profileContent) {
                profileContent.style.display = 'none';
            }

            currentChild = null;
            localStorage.removeItem('selectedChildId');
            return;
        }

        if (emptyState) {
            emptyState.style.display = 'none';
        }

        if (profileContent) {
            profileContent.style.display = 'block';
        }

        children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;

            if (childSelect) {
                childSelect.appendChild(option);
            }
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

        if (childSelect) {
            childSelect.value = currentChild.id;
        }

        localStorage.setItem('selectedChildId', currentChild.id);

        renderChild(currentChild);
        renderMilestones(result.milestones || []);
        renderCaregivers(result.caregivers || []);
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    function renderChild(child) {
        setText('childName', child.name || '-');
        setText('childAge', `${getAge(child.birth_date)} ani`);
        setText('childBirthDate', formatDate(child.birth_date));
        setText('childExactAge', getExactAge(child.birth_date));
        setText('childGender', child.gender || '-');
        setText('childBloodType', child.blood_type || '-');
        setText('childAllergies', child.allergies || 'Nu are alergii cunoscute');

        setText('educationLevel', child.education_level || '-');
        setText('institutionName', child.institution_name || '-');
        setText('groupOrClass', child.group_or_class || '-');
        setText('responsiblePerson', child.responsible_person || '-');

        setText('childDescription', child.description || 'Nu exista descriere.');
        setText('heightValue', child.height_cm || '0');
        setText('weightValue', child.weight_kg || '0');
        setText('bmiValue', child.bmi || '0');

        const favoriteActivities = document.getElementById('favoriteActivities');

        if (!favoriteActivities) {
            return;
        }

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

        if (!milestoneList) {
            return;
        }

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

        if (!caregiversGrid) {
            return;
        }

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
        if (modal) {
            modal.classList.add('active');
        }
    }

    function closeModal(modal) {
        if (modal) {
            modal.classList.remove('active');
        }
    }

    function openAddChildModal() {
        setText('childModalTitle', 'Adauga copil');

        if (childForm) {
            childForm.reset();
        }

        const childIdInput = document.getElementById('childId');

        if (childIdInput) {
            childIdInput.value = '';
        }

        openModal(childModal);
    }

    function openEditChildModal() {
        if (!currentChild) {
            return;
        }

        setText('childModalTitle', 'Editeaza copil');

        setInputValue('childId', currentChild.id);
        setInputValue('name', currentChild.name || '');
        setInputValue('birth_date', currentChild.birth_date || '');
        setInputValue('gender', currentChild.gender || '');
        setInputValue('blood_type', currentChild.blood_type || '');
        setInputValue('allergies', currentChild.allergies || '');
        setInputValue('education_level', currentChild.education_level || '');
        setInputValue('institution_name', currentChild.institution_name || '');
        setInputValue('group_or_class', currentChild.group_or_class || '');
        setInputValue('responsible_person', currentChild.responsible_person || '');
        setInputValue('height_cm', currentChild.height_cm || '');
        setInputValue('weight_kg', currentChild.weight_kg || '');
        setInputValue('bmi', currentChild.bmi || '');
        setInputValue('favorite_activities_input', currentChild.favorite_activities || '');
        setInputValue('description', currentChild.description || '');

        openModal(childModal);
    }

    function setInputValue(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.value = value;
        }
    }

    function getInputValue(id) {
        const element = document.getElementById(id);
        return element ? element.value : '';
    }

    function collectChildForm() {
        return {
            id: getInputValue('childId'),
            name: getInputValue('name'),
            birth_date: getInputValue('birth_date'),
            gender: getInputValue('gender'),
            blood_type: getInputValue('blood_type'),
            allergies: getInputValue('allergies'),
            education_level: getInputValue('education_level'),
            institution_name: getInputValue('institution_name'),
            group_or_class: getInputValue('group_or_class'),
            responsible_person: getInputValue('responsible_person'),
            height_cm: getInputValue('height_cm'),
            weight_kg: getInputValue('weight_kg'),
            bmi: getInputValue('bmi'),
            favorite_activities: getInputValue('favorite_activities_input'),
            description: getInputValue('description')
        };
    }

    if (openAddChildBtn) {
        openAddChildBtn.addEventListener('click', openAddChildModal);
    }

    if (emptyAddChildBtn) {
        emptyAddChildBtn.addEventListener('click', openAddChildModal);
    }

    if (editChildBtn) {
        editChildBtn.addEventListener('click', openEditChildModal);
    }

    if (openMilestoneBtn) {
        openMilestoneBtn.addEventListener('click', () => openModal(milestoneModal));
    }

    if (openCaregiverBtn) {
        openCaregiverBtn.addEventListener('click', () => openModal(caregiverModal));
    }

    if (childSelect) {
        childSelect.addEventListener('change', async () => {
            await loadProfile(childSelect.value);
        });
    }

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            closeModal(document.getElementById(button.dataset.close));
        });
    });

    if (childForm) {
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
    }

    if (deleteChildBtn) {
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
    }

    if (milestoneForm) {
        milestoneForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!currentChild) {
                return;
            }

            const result = await apiRequest(`${apiBase}?action=add_milestone`, 'POST', {
                child_id: currentChild.id,
                title: getInputValue('milestoneTitle'),
                milestone_date: getInputValue('milestoneDate')
            });

            alert(result.message);

            if (result.status === 'success') {
                milestoneForm.reset();
                closeModal(milestoneModal);
                await loadProfile(currentChild.id);
            }
        });
    }

    if (caregiverForm) {
        caregiverForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            if (!currentChild) {
                return;
            }

            const result = await apiRequest(`${apiBase}?action=add_caregiver`, 'POST', {
                child_id: currentChild.id,
                name: getInputValue('caregiverName'),
                role: getInputValue('caregiverRole'),
                access_level: getInputValue('accessLevel')
            });

            alert(result.message);

            if (result.status === 'success') {
                caregiverForm.reset();
                closeModal(caregiverModal);
                await loadProfile(currentChild.id);
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutUser);
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