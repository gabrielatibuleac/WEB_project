document.addEventListener('DOMContentLoaded', async () => {
    const apiBase = '/WEB_project/backend/api/children.php';
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
        renderMedical();
    }

    async function loadProfile(childId) {
        const result = await requestJson(`${apiBase}?action=profile&id=${childId}`, {
            method: 'GET',
            credentials: 'same-origin'
        });

        return result.status === 'success' ? result : null;
    }

    function renderMedical() {
        if (!currentChild) {
            renderEmpty();
            return;
        }

        const data = getMedicalData();
        const today = getTodayIso();

        data.visits = data.visits.filter((visit) => visit.date >= today);
        saveMedicalData(data);
        syncAllMedicalItemsToTimeline(data);

        renderList(vaccinesList, data.vaccines, '🛡️');
        renderList(visitsList, data.visits, '📅');
        renderList(medicationsList, data.medications, '💊');
        renderList(allergiesList, data.allergies, '⚠️');
        renderList(notesList, data.notes, '✚');
        renderEmergencyContacts(data.emergency);

        vaccineStatus.textContent = data.vaccines.length > 0 ? 'In evidenta' : 'Fara date';
        vaccineInfo.textContent = data.vaccines.length > 0 ? `${data.vaccines.length} vaccinari adaugate.` : `Nu exista vaccinari pentru ${currentChild.name}.`;

        const nextVisit = getNextVisit(data.visits);
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
                        <p>${escapeHtml(item.description)}</p>
                        <small>${formatDate(item.date)}</small>
                    </div>
                    <small>Salvat</small>
                `;
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
                    <p>${escapeHtml(item.description)}</p>
                    <small>Contact urgent</small>
                </div>
                <button class="delete-emergency-btn" data-id="${escapeHtml(item.id)}">Sterge</button>
            `;

            emergencyContactsList.appendChild(row);
        });

        document.querySelectorAll('.delete-emergency-btn').forEach((button) => {
            button.addEventListener('click', () => {
                deleteEmergencyContact(button.dataset.id);
            });
        });
    }

    function deleteEmergencyContact(id) {
        const data = getMedicalData();

        data.emergency = data.emergency.filter((item) => String(item.id) !== String(id));

        saveMedicalData(data);
        renderMedical();
    }

    function getMedicalData() {
        return normalizeMedicalData(getStore(`bain_medical_${currentChild.id}`, {}));
    }

    function saveMedicalData(data) {
        setStore(`bain_medical_${currentChild.id}`, normalizeMedicalData(data));
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

    function syncAllMedicalItemsToTimeline(data) {
        const timelineItems = getStore(`bain_timeline_${currentChild.id}`, []);
        const cleanTimelineItems = timelineItems.filter((item) => item.source !== 'medical');

        const medicalItems = [];

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

                medicalItems.push({
                    id: `medical_${source.key}_${item.id}`,
                    title: item.title,
                    type: 'medical',
                    date: item.date,
                    time: item.time || '00:00',
                    description: `${source.label}: ${item.description}`,
                    likes: 0,
                    comments: 0,
                    source: 'medical',
                    medicalType: source.key,
                    sourceLabel: source.label,
                    icon: source.icon
                });
            });
        });

        setStore(`bain_timeline_${currentChild.id}`, [...cleanTimelineItems, ...medicalItems]);
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

    function getNextVisit(visits) {
        const today = getTodayIso();

        return visits
            .filter((visit) => visit.date >= today)
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0] || null;
    }

    function renderNotifications() {
        notificationsList.innerHTML = '';

        if (!currentChild) {
            notificationsList.innerHTML = '<p class="empty-text">Nu exista copil selectat.</p>';
            return;
        }

        const data = getMedicalData();
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

    function isDuplicateEmergencyPhone(data, description) {
        const newPhone = normalizePhone(description);

        if (!newPhone) {
            return false;
        }

        return data.emergency.some((item) => {
            const existingPhone = normalizePhone(item.description);
            return existingPhone && existingPhone === newPhone;
        });
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

    medicalForm.addEventListener('submit', (event) => {
        event.preventDefault();

        const data = getMedicalData();
        const type = medicalType.value;

        if (!Array.isArray(data[type])) {
            data[type] = [];
        }

        if (type === 'emergency' && isDuplicateEmergencyPhone(data, medicalDescriptionInput.value)) {
            alert('Acest numar de telefon exista deja la contactele urgente.');
            return;
        }

        if (type === 'visits' && medicalDateInput.value < getTodayIso()) {
            alert('Nu poti adauga o programare medicala in trecut.');
            return;
        }

        const item = {
            id: String(Date.now()),
            title: medicalTitleInput.value.trim(),
            date: medicalDateInput.value,
            description: medicalDescriptionInput.value.trim()
        };

        data[type].push(item);

        saveMedicalData(data);
        syncAllMedicalItemsToTimeline(data);

        medicalModal.classList.remove('active');
        renderMedical();

        if (type === 'emergency') {
            alert('Contact urgent salvat.');
        } else {
            alert('Informatie medicala salvata.');
        }
    });

    document.querySelectorAll('.close-modal').forEach((button) => {
        button.addEventListener('click', () => {
            document.getElementById(button.dataset.close).classList.remove('active');
        });
    });

    openNotificationsBtn.addEventListener('click', () => {
        renderNotifications();
        notificationsModal.classList.add('active');
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

    const params = new URLSearchParams(window.location.search);

    if (params.get('action') === 'add') {
        setTimeout(() => document.getElementById('openMedicalNoteBtn').click(), 300);
    }
});