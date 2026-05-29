document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const childrenApiBase = '/WEB_project/backend/api/children.php';
    const medicalApiBase = '/WEB_project/backend/api/medical.php';

    const childSelect = document.getElementById('childSelect');
    const childBirthText = document.getElementById('childBirthText');
    const medicalTitle = document.getElementById('medicalTitle');
    const logoutBtn = document.getElementById('logoutBtn');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const openNotificationsBtn = document.getElementById('openNotificationsBtn');
    const notificationsModal = document.getElementById('notificationsModal');
    const notificationsList = document.getElementById('notificationsList');

    const vaccineStatus = document.getElementById('vaccineStatus');
    const vaccineInfo = document.getElementById('vaccineInfo');
    const nextVisitDate = document.getElementById('nextVisitDate');
    const nextVisitInfo = document.getElementById('nextVisitInfo');
    const medicationCount = document.getElementById('medicationCount');
    const medicationInfo = document.getElementById('medicationInfo');
    const emergencyCount = document.getElementById('emergencyCount');
    const emergencyInfo = document.getElementById('emergencyInfo');

    const vaccinesList = document.getElementById('vaccinesList');
    const visitsList = document.getElementById('visitsList');
    const medicationsList = document.getElementById('medicationsList');
    const allergiesList = document.getElementById('allergiesList');
    const notesList = document.getElementById('notesList');
    const emergencyContactsList = document.getElementById('emergencyContactsList');

    const medicalModal = document.getElementById('medicalModal');
    const medicalForm = document.getElementById('medicalForm');
    const medicalType = document.getElementById('medicalType');
    const medicalModalTitle = document.getElementById('medicalModalTitle');
    const medicalTitleInput = document.getElementById('medicalTitleInput');
    const medicalDateInput = document.getElementById('medicalDateInput');
    const medicalDescriptionInput = document.getElementById('medicalDescriptionInput');

    let children = [];
    let currentChild = null;
    let currentProfile = null;
    let currentMedicalData = normalizeMedicalData({});

    const recordTypeMap = {
        vaccines: 'vaccine',
        visits: 'visit',
        medications: 'medication',
        allergies: 'allergy',
        notes: 'note'
    };

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

            childBirthText.textContent = 'Adauga primul copil din Profil copil.';
            currentChild = null;
            currentMedicalData = normalizeMedicalData({});
            renderMedical();
            return;
        }

        const savedChildId = localStorage.getItem('selectedChildId');
        currentChild = children[0];

        children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
            childSelect.appendChild(option);

            if (savedChildId && String(child.id) === String(savedChildId)) {
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
        childBirthText.textContent = `Nascut pe ${formatDate(currentChild.birth_date)}`;
        medicalTitle.textContent = `Fisa medicala - ${currentChild.name}`;

        currentProfile = await loadProfile(currentChild.id);
        currentMedicalData = await loadMedicalData(currentChild.id);

        renderMedical();
    }

    async function loadProfile(childId) {
        const result = await requestJson(`${childrenApiBase}?action=profile&id=${childId}`, {
            method: 'GET'
        });

        return result.status === 'success' ? result : null;
    }

    async function loadMedicalData(childId) {
        const result = await requestJson(`${medicalApiBase}?action=list&child_id=${childId}`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            return normalizeMedicalData({});
        }

        return normalizeMedicalData(result.data || {});
    }

    function renderMedical() {
        if (!currentChild) {
            renderEmpty();
            return;
        }

        const data = normalizeMedicalData(currentMedicalData);
        const today = getTodayIso();
        const displayVisits = data.visits.filter((visit) => visit.date >= today);

        renderList(vaccinesList, data.vaccines, '🛡️');
        renderList(visitsList, displayVisits, '📅');
        renderList(medicationsList, data.medications, '💊');
        renderList(allergiesList, data.allergies, '⚠️');
        renderList(notesList, data.notes, '✚');
        renderEmergencyContacts(data.emergency);

        vaccineStatus.textContent = data.vaccines.length > 0 ? 'In evidenta' : 'Fara date';
        vaccineInfo.textContent = data.vaccines.length > 0 ? `${data.vaccines.length} vaccinari adaugate.` : `Nu exista vaccinari pentru ${currentChild.name}.`;

        const nextVisit = getNextVisit(displayVisits);
        nextVisitDate.textContent = nextVisit ? formatDate(nextVisit.date) : '-';
        nextVisitInfo.textContent = nextVisit ? nextVisit.title : `Nu exista programari pentru ${currentChild.name}.`;

        medicationCount.textContent = data.medications.length;
        medicationInfo.textContent = data.medications.length > 0 ? `${data.medications.length} tratamente active.` : `Nu exista medicatie activa pentru ${currentChild.name}.`;

        emergencyCount.textContent = data.emergency.length;
        emergencyInfo.textContent = data.emergency.length > 0 ? `${data.emergency.length} contacte urgente.` : `Nu exista contacte urgente pentru ${currentChild.name}.`;

        if (currentProfile && currentProfile.child && currentProfile.child.allergies && data.allergies.length === 0) {
            allergiesList.innerHTML = `
                <div class="medical-item">
                    <div class="medical-item-icon">⚠️</div>
                    <div>
                        <strong>Alergii din profil</strong>
                        <p>${escapeHtml(currentProfile.child.allergies)}</p>
                        <small>Profil copil</small>
                    </div>
                    <small>Profil</small>
                </div>
            `;
        }
    }

    function renderEmpty() {
        vaccinesList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
        visitsList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
        medicationsList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
        allergiesList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
        notesList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
        emergencyContactsList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';

        vaccineStatus.textContent = 'Fara date';
        vaccineInfo.textContent = 'Nu exista copil selectat.';
        nextVisitDate.textContent = '-';
        nextVisitInfo.textContent = 'Nu exista copil selectat.';
        medicationCount.textContent = '0';
        medicationInfo.textContent = 'Nu exista copil selectat.';
        emergencyCount.textContent = '0';
        emergencyInfo.textContent = 'Nu exista copil selectat.';
    }

    function renderList(container, items, icon) {
        container.innerHTML = '';

        if (!items || items.length === 0) {
            container.innerHTML = '<p class="empty-text">Nu exista date adaugate.</p>';
            return;
        }

        items
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .forEach((item) => {
                const row = document.createElement('div');
                row.className = 'medical-item';

                row.innerHTML = `
                    <div class="medical-item-icon">${icon}</div>
                    <div>
                        <strong>${escapeHtml(item.title)}</strong>
                        <p>${escapeHtml(item.description || '')}</p>
                        <small>${formatDate(item.date)}</small>
                    </div>
                    <button class="delete-medical-btn" data-id="${escapeHtml(item.id)}">Sterge</button>
                `;

                const deleteBtn = row.querySelector('.delete-medical-btn');
                deleteBtn.addEventListener('click', () => deleteMedicalRecord(deleteBtn.dataset.id));

                container.appendChild(row);
            });
    }

    function renderEmergencyContacts(items) {
        emergencyContactsList.innerHTML = '';

        if (!items || items.length === 0) {
            emergencyContactsList.innerHTML = '<p class="empty-text">Nu exista contacte urgente salvate.</p>';
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'emergency-contact';

            row.innerHTML = `
                <div class="emergency-contact-icon">☎</div>
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <p>${escapeHtml(item.description || '')}</p>
                    <small>Contact urgent</small>
                </div>
                <button class="delete-emergency-btn" data-id="${escapeHtml(item.id)}">Sterge</button>
            `;

            const deleteBtn = row.querySelector('.delete-emergency-btn');
            deleteBtn.addEventListener('click', () => deleteEmergencyContact(deleteBtn.dataset.id));

            emergencyContactsList.appendChild(row);
        });
    }

    async function deleteMedicalRecord(id) {
        if (!currentChild) {
            return;
        }

        const result = await requestJson(`${medicalApiBase}?action=delete_record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                id: id
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            currentMedicalData = await loadMedicalData(currentChild.id);
            renderMedical();
        }
    }

    async function deleteEmergencyContact(id) {
        if (!currentChild) {
            return;
        }

        const result = await requestJson(`${medicalApiBase}?action=delete_emergency`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                id: id
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            currentMedicalData = await loadMedicalData(currentChild.id);
            renderMedical();
        }
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

    function openMedicalModal(type, title) {
        if (!currentChild) {
            alert('Adauga mai intai un copil.');
            return;
        }

        medicalForm.reset();
        medicalType.value = type;
        medicalModalTitle.textContent = title;

        const today = getTodayIso();

        medicalDateInput.value = today;
        medicalDateInput.removeAttribute('min');

        const titleLabel = document.querySelector('label[for="medicalTitleInput"]');
        const dateLabel = document.querySelector('label[for="medicalDateInput"]');
        const descriptionLabel = document.querySelector('label[for="medicalDescriptionInput"]');

        if (type === 'visits') {
            medicalDateInput.min = today;
            titleLabel.textContent = 'Motiv programare';
            dateLabel.textContent = 'Data programarii';
            descriptionLabel.textContent = 'Detalii programare';
            medicalTitleInput.placeholder = 'Ex: Control pediatru';
            medicalDescriptionInput.placeholder = 'Ex: Vizita pentru control periodic';
        } else if (type === 'emergency') {
            titleLabel.textContent = 'Nume contact';
            dateLabel.textContent = 'Data adaugarii';
            descriptionLabel.textContent = 'Telefon si detalii';
            medicalTitleInput.placeholder = 'Ex: Dr. Andreea Ionescu';
            medicalDescriptionInput.placeholder = 'Ex: 0722 555 777, pediatru';
        } else {
            titleLabel.textContent = 'Titlu';
            dateLabel.textContent = 'Data';
            descriptionLabel.textContent = 'Descriere';
            medicalTitleInput.placeholder = '';
            medicalDescriptionInput.placeholder = '';
        }

        medicalModal.classList.add('active');
    }

    async function saveMedicalForm() {
        const type = medicalType.value;

        if (!currentChild) {
            return;
        }

        if (type === 'emergency') {
            await saveEmergencyContact();
            return;
        }

        if (type === 'visits' && medicalDateInput.value < getTodayIso()) {
            alert('Nu poti adauga o programare medicala in trecut.');
            return;
        }

        const result = await requestJson(`${medicalApiBase}?action=create_record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                record_type: recordTypeMap[type],
                title: medicalTitleInput.value.trim(),
                description: medicalDescriptionInput.value.trim(),
                record_date: medicalDateInput.value,
                record_time: null
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            medicalModal.classList.remove('active');
            currentMedicalData = await loadMedicalData(currentChild.id);
            renderMedical();
        }
    }

    async function saveEmergencyContact() {
        const name = medicalTitleInput.value.trim();
        const description = medicalDescriptionInput.value.trim();
        const phone = extractPhone(description);

        if (!phone) {
            alert('Introdu un numar de telefon valid in descriere.');
            return;
        }

        const result = await requestJson(`${medicalApiBase}?action=create_emergency`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: currentChild.id,
                name: name,
                phone: phone,
                relation: '',
                details: description
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            medicalModal.classList.remove('active');
            currentMedicalData = await loadMedicalData(currentChild.id);
            renderMedical();
        }
    }

    function renderNotifications() {
        notificationsList.innerHTML = '';

        if (!currentChild) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
            return;
        }

        const data = normalizeMedicalData(currentMedicalData);
        const items = [...data.visits, ...data.medications, ...data.notes, ...data.vaccines, ...data.allergies]
            .filter((item) => item.date)
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 5);

        if (items.length === 0) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista notificari medicale.</p>';
            return;
        }

        items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'notification-item';

            row.innerHTML = `
                <span>✚</span>
                <div>
                    <strong>${escapeHtml(item.title)}</strong>
                    <small>${formatDate(item.date)}</small>
                </div>
            `;

            notificationsList.appendChild(row);
        });
    }

    function getNextVisit(visits) {
        const today = getTodayIso();

        return visits
            .filter((visit) => visit.date >= today)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
    }

    function getTodayIso() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    }

    function normalizePhone(value) {
        let phone = String(value).replace(/\D/g, '');

        if (phone.startsWith('0040')) {
            phone = `0${phone.slice(4)}`;
        }

        if (phone.startsWith('40') && phone.length === 11) {
            phone = `0${phone.slice(2)}`;
        }

        return phone;
    }

    function extractPhone(value) {
        const match = String(value).match(/(\+?4?0?7[\d\s.-]{8,})/);

        if (!match) {
            return '';
        }

        return normalizePhone(match[0]);
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

    document.getElementById('openVaccineBtn').addEventListener('click', () => openMedicalModal('vaccines', 'Adauga vaccin'));
    document.getElementById('openVisitBtn').addEventListener('click', () => openMedicalModal('visits', 'Adauga vizita'));
    document.getElementById('openMedicationBtn').addEventListener('click', () => openMedicalModal('medications', 'Adauga medicatie'));
    document.getElementById('openAllergyBtn').addEventListener('click', () => openMedicalModal('allergies', 'Adauga alergie'));
    document.getElementById('openEmergencyBtn').addEventListener('click', () => openMedicalModal('emergency', 'Adauga contact urgent'));
    document.getElementById('openMedicalNoteBtn').addEventListener('click', () => openMedicalModal('notes', 'Adauga nota medicala'));

    medicalForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await saveMedicalForm();
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            const modal = document.getElementById(button.dataset.close);

            if (modal) {
                modal.classList.remove('active');
            }
        });
    });

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
    });

    logoutBtn.addEventListener('click', logoutUser);

    const ok = await checkAuth();

    if (ok) {
        await loadChildren();
    }

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        setTimeout(() => document.getElementById('openMedicalNoteBtn').click(), 300);
    }
});