document.addEventListener('DOMContentLoaded', async () => {
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

    let children = [];
    let currentChild = null;

    const apiBase = '/WEB_project/backend/api/children.php';

    async function checkSession() {
        try {
            const response = await fetch('/WEB_project/backend/api/check_session.php', {
                method: 'GET',
                credentials: 'same-origin'
            });

            const result = await response.json();

            if (result.status !== 'success') {
                window.location.href = '../auth/login.html';
                return;
            }

            const fullName = result.user.name || 'User';
            topUserName.textContent = fullName;
            userInitial.textContent = fullName.charAt(0).toUpperCase();
        } catch (error) {
            window.location.href = '../auth/login.html';
        }
    }

    async function apiRequest(url, method = 'GET', data = null) {
        const options = {
            method: method,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        return await response.json();
    }

    async function loadChildren() {
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

        await loadProfile(children[0].id);
    }

    async function loadProfile(childId) {
        const result = await apiRequest(`${apiBase}?action=profile&id=${childId}`);

        if (result.status !== 'success') {
            alert(result.message);
            return;
        }

        currentChild = result.child;
        childSelect.value = currentChild.id;

        renderChild(currentChild);
        renderMilestones(result.milestones || []);
        renderCaregivers(result.caregivers || []);
    }

    function renderChild(child) {
        document.getElementById('childName').textContent = child.name || '-';
        document.getElementById('childAge').textContent = `${getAge(child.birth_date)} ani`;
        document.getElementById('childBirthDate').textContent = formatDate(child.birth_date);
        document.getElementById('childExactAge').textContent = getExactAge(child.birth_date);
        document.getElementById('childBloodType').textContent = child.blood_type || '-';
        document.getElementById('childAllergies').textContent = child.allergies || 'Nu are alergii cunoscute';
        document.getElementById('kindergartenName').textContent = child.kindergarten_name || '-';
        document.getElementById('kindergartenGroup').textContent = child.kindergarten_group || '-';
        document.getElementById('educatorName').textContent = child.educator_name ? `Educatoare: ${child.educator_name}` : 'Educatoare: -';
        document.getElementById('childDescription').textContent = child.description || 'Nu exista descriere.';
        document.getElementById('heightValue').textContent = child.height_cm || '0';
        document.getElementById('weightValue').textContent = child.weight_kg || '0';
        document.getElementById('bmiValue').textContent = child.bmi || '0';

        const favoriteActivities = document.getElementById('favoriteActivities');
        favoriteActivities.innerHTML = '';

        const activities = (child.favorite_activities || '').split(',').map((item) => item.trim()).filter(Boolean);

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
        document.getElementById('blood_type').value = currentChild.blood_type || '';
        document.getElementById('allergies').value = currentChild.allergies || '';
        document.getElementById('kindergarten_name').value = currentChild.kindergarten_name || '';
        document.getElementById('kindergarten_group').value = currentChild.kindergarten_group || '';
        document.getElementById('educator_name').value = currentChild.educator_name || '';
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
            blood_type: document.getElementById('blood_type').value,
            allergies: document.getElementById('allergies').value,
            kindergarten_name: document.getElementById('kindergarten_name').value,
            kindergarten_group: document.getElementById('kindergarten_group').value,
            educator_name: document.getElementById('educator_name').value,
            height_cm: document.getElementById('height_cm').value,
            weight_kg: document.getElementById('weight_kg').value,
            bmi: document.getElementById('bmi').value,
            favorite_activities: document.getElementById('favorite_activities_input').value,
            description: document.getElementById('description').value
        };
    }

    function getAge(dateString) {
        if (!dateString) {
            return 0;
        }

        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }

        return Math.max(age, 0);
    }

    function getExactAge(dateString) {
        if (!dateString) {
            return '-';
        }

        const age = getAge(dateString);
        return `${age} ani`;
    }

    function formatDate(dateString) {
        if (!dateString) {
            return '-';
        }

        const date = new Date(dateString);
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
            await loadChildren();

            if (data.id) {
                await loadProfile(data.id);
            }
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

    logoutBtn.addEventListener('click', async () => {
        await fetch('/WEB_project/backend/api/logout.php', {
            method: 'POST',
            credentials: 'same-origin'
        });

        window.location.href = '../auth/login.html';
    });

    await checkSession();
    await loadChildren();

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        openAddChildModal();
    }
});