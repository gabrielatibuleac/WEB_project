document.addEventListener('DOMContentLoaded', async () => {
    const feedingChildSelect = document.getElementById('feedingChildSelect');
    const childNameText = document.getElementById('childNameText');
    const childBirthText = document.getElementById('feedingChildBirth');
    const calendarStrip = document.getElementById('calendarStrip');
    const journalTableBody = document.getElementById('journalTableBody');
    const favoriteFoods = document.getElementById('favoriteFoods');
    const preferencesList = document.getElementById('preferencesList');
    const lastMealContainer = document.getElementById('lastMealContainer');
    const nutritionalNotesContainer = document.getElementById('nutritionalNotes'); 
    
    const apiChildren = '/WEB_project/backend/api/children.php';
    const apiFeeding = '/WEB_project/backend/api/feeding.php';

    function setupModalEvents() {
        const btnAddMeal = document.getElementById('btnAddMeal');
        const mealModal = document.getElementById('mealModal');
        const closeMealModal = document.getElementById('closeMealModal');
        const addMealForm = document.getElementById('addMealForm');

        if (btnAddMeal && mealModal) {
            btnAddMeal.addEventListener('click', () => {
                const now = new Date();
                document.getElementById('mealTime').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                mealModal.classList.add('show');
            });
            closeMealModal.addEventListener('click', () => mealModal.classList.remove('show'));
            
            addMealForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const childId = feedingChildSelect.value;
                const payload = {
                    child_id: childId,
                    time: document.getElementById('mealTime').value,
                    type: document.getElementById('mealType').value,
                    qty: document.getElementById('mealQty').value,
                    obs: document.getElementById('mealObs').value
                };
                await submitFormData(`${apiFeeding}?action=add_meal`, payload, mealModal, addMealForm, childId);
            });
        }

        const btnAddFavorite = document.getElementById('btnAddFavorite');
        const favoriteModal = document.getElementById('favoriteModal');
        const closeFavoriteModal = document.getElementById('closeFavoriteModal');
        const addFavoriteForm = document.getElementById('addFavoriteForm');

        if (btnAddFavorite && favoriteModal) {
            btnAddFavorite.addEventListener('click', () => favoriteModal.classList.add('show'));
            closeFavoriteModal.addEventListener('click', () => favoriteModal.classList.remove('show'));
            
            addFavoriteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const childId = feedingChildSelect.value;
                const payload = {
                    child_id: childId,
                    food_name: document.getElementById('favoriteFoodName').value
                };
                await submitFormData(`${apiFeeding}?action=add_favorite`, payload, favoriteModal, addFavoriteForm, childId);
            });
        }

        const btnAddPreference = document.getElementById('btnAddPreference');
        const preferenceModal = document.getElementById('preferenceModal');
        const closePreferenceModal = document.getElementById('closePreferenceModal');
        const addPreferenceForm = document.getElementById('addPreferenceForm');

        if (btnAddPreference && preferenceModal) {
            btnAddPreference.addEventListener('click', () => preferenceModal.classList.add('show'));
            closePreferenceModal.addEventListener('click', () => preferenceModal.classList.remove('show'));
            
            addPreferenceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const childId = feedingChildSelect.value;
                const payload = {
                    child_id: childId,
                    type: document.getElementById('preferenceType').value,
                    text: document.getElementById('preferenceText').value
                };
                await submitFormData(`${apiFeeding}?action=add_preference`, payload, preferenceModal, addPreferenceForm, childId);
            });
        }

           const btnEditNote = document.getElementById('btnEditNote');
        const noteModal = document.getElementById('noteModal');
        const closeNoteModal = document.getElementById('closeNoteModal');
        const editNoteForm = document.getElementById('editNoteForm');
        const noteContentInput = document.getElementById('noteContent');
        
        if (btnEditNote && noteModal) {
            btnEditNote.addEventListener('click', () => {
                noteContentInput.value = ""; 
                noteModal.classList.add('show');
            });

            closeNoteModal.addEventListener('click', () => noteModal.classList.remove('show'));

            editNoteForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const childId = feedingChildSelect.value;
                const payload = {
                    child_id: childId,
                    content: noteContentInput.value
                };
                await submitFormData(`${apiFeeding}?action=save_note`, payload, noteModal, editNoteForm, childId);
            });
        }

        window.addEventListener('click', (e) => { 
            if (mealModal && e.target === mealModal) mealModal.classList.remove('show'); 
            if (favoriteModal && e.target === favoriteModal) favoriteModal.classList.remove('show');
            if (preferenceModal && e.target === preferenceModal) preferenceModal.classList.remove('show');
            if (noteModal && e.target === noteModal) noteModal.classList.remove('show');
        });
    }

    async function submitFormData(url, payload, modalElement, formElement, childId) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                credentials: 'same-origin'
            });
            const resData = await response.json();

            if (resData.status === 'success') {
                modalElement.classList.remove('show');
                formElement.reset();
                await loadFeedingData(childId); 
            } else {
                alert('Eroare: ' + (resData.message || 'Eroare la server.'));
            }
        } catch (error) {
            alert("Eroare de rețea.");
        }
    }

    async function init() {
        renderCalendar();
        await loadChildrenForFeeding();
        setupModalEvents();
    }

    async function loadChildrenForFeeding() {
        try {
            const response = await fetch(`${apiChildren}?action=list`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            const result = await response.json();

            if (result.status !== 'success' || !result.children || result.children.length === 0) {
                renderEmptyState();
                return;
            }

            feedingChildSelect.innerHTML = '';
            const savedChildId = localStorage.getItem('selectedChildId');
            let selectedChild = result.children[0];

            result.children.forEach((child) => {
                const option = document.createElement('option');
                option.value = child.id;
                option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
                feedingChildSelect.appendChild(option);

                if (savedChildId && String(child.id) === String(savedChildId)) {
                    selectedChild = child;
                }
            });

            feedingChildSelect.value = selectedChild.id;
            localStorage.setItem('selectedChildId', selectedChild.id);
            
            childNameText.textContent = selectedChild.name;
            childBirthText.textContent = `Născut(ă) pe ${formatDate(selectedChild.birth_date)}`;

            await loadFeedingData(selectedChild.id);

            feedingChildSelect.addEventListener('change', async () => {
                const currentChild = result.children.find(item => String(item.id) === String(feedingChildSelect.value));
                if (currentChild) {
                    localStorage.setItem('selectedChildId', currentChild.id);
                    childNameText.textContent = currentChild.name;
                    childBirthText.textContent = `Născut(ă) pe ${formatDate(currentChild.birth_date)}`;
                    await loadFeedingData(currentChild.id);
                }
            });

        } catch (error) {
            renderEmptyState();
        }
    }

    async function loadFeedingData(childId) {
        try {
            const response = await fetch(`${apiFeeding}?action=get_feeding_data&child_id=${childId}`, {
                method: 'GET',
                credentials: 'same-origin'
            });
            const result = await response.json();

            if (result.status === 'success' && result.data) {
                renderFeedingContent(result.data);
            } else {
                renderNoFeedingDataState();
            }
        } catch (error) {
            renderNoFeedingDataState();
        }
    }

    function renderFeedingContent(data) {
        document.getElementById('sumMealsCount').textContent = data.summary?.meals || '0';
        document.getElementById('sumLiquids').textContent = `${data.summary?.liquids || '0'} ml`;
        document.getElementById('sumCalories').textContent = `${data.summary?.calories || '0'} kcal`;

        if (data.journal && data.journal.length > 0) {
            journalTableBody.innerHTML = data.journal.map(row => `
                <tr>
                    <td>${escapeHtml(row.time)}</td>
                    <td>
                        <div class="meal-type">
                            <span>${escapeHtml(row.icon || '🍼')}</span> ${escapeHtml(row.type)}
                        </div>
                    </td>
                    <td>${escapeHtml(row.qty)}</td>
                    <td><span style="color: var(--text-gray); font-size: 0.85rem">${escapeHtml(row.obs || '')}</span></td>
                </tr>
            `).join('');
        } else {
            renderNoMealsRow();
        }

        if (data.lastMeal) {
            lastMealContainer.innerHTML = `
                <div class="last-meal-info">
                    <p><span>${escapeHtml(data.lastMeal.icon || '🍼')}</span> ${escapeHtml(data.lastMeal.type)}</p>
                    <small>Azi, ${escapeHtml(data.lastMeal.time)}</small>
                </div>
                <strong>${escapeHtml(data.lastMeal.qty)}</strong>
            `;
        } else {
            lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        }

        if (data.notes && data.notes.length > 0) {
            nutritionalNotesContainer.innerHTML = data.notes.map(note => `<div class="note-item">👉 ${escapeHtml(note)}</div>`).join('');
        } else {
            nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe pentru azi.</p>';
        }
        
        if (data.favorites && data.favorites.length > 0) {
            favoriteFoods.innerHTML = data.favorites.map(food => `<div class="chip">${escapeHtml(food)}</div>`).join('');
        } else {
            favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        }

        if (data.preferences && data.preferences.length > 0) {
            preferencesList.innerHTML = data.preferences.map(pref => {
                const icon = pref.type === 'check' ? '<span class="pref-check">✓</span>' : '<span class="pref-warn">⚠️</span>';
                return `<li>${icon} ${escapeHtml(pref.text)}</li>`;
            }).join('');
        } else {
            preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe/reacții speciale declarate.</li>';
        }
    }

    function renderNoFeedingDataState() {
        document.getElementById('sumMealsCount').textContent = '0';
        document.getElementById('sumLiquids').textContent = '0 ml';
        document.getElementById('sumCalories').textContent = '0 kcal';
        renderNoMealsRow();
        lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe pentru azi.</p>';
        favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe.</li>';
    }

    function renderEmptyState() {
        childNameText.textContent = 'copilul selectat';
        childBirthText.textContent = '-';
        feedingChildSelect.innerHTML = '<option>Fără copii înregistrați</option>';
        renderNoFeedingDataState();
    }

    function renderNoMealsRow() {
        journalTableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-gray); padding: 24px;">Nu există mese înregistrate pentru ziua de azi.</td></tr>`;
    }
    function renderCalendar() {
        const today = new Date();
        const dayNames = ['Dum', 'Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm'];
        let html = '';
        for (let i = 2; i >= -4; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            html += `
                <div class="cal-day ${i === 0 ? 'active' : ''}">
                    <span>${dayNames[d.getDay()]}</span>
                    <div class="day-circle">${d.getDate()}</div>
                </div>`;
        }
        calendarStrip.innerHTML = html;
    }

    function getAge(dateString) {
        if(!dateString) return 0;
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) { age--; }
        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        if(!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    function escapeHtml(value) {
        return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }

    init();
});