document.addEventListener('DOMContentLoaded', async () => {
    const feedingChildSelect = document.getElementById('feedingChildSelect');
    const childNameText = document.getElementById('childNameText');
    const childBirthText = document.getElementById('feedingChildBirth');
    const journalTableBody = document.getElementById('journalTableBody');
    const favoriteFoods = document.getElementById('favoriteFoods');
    const preferencesList = document.getElementById('preferencesList');
    const lastMealContainer = document.getElementById('lastMealContainer');
    const nutritionalNotesContainer = document.getElementById('nutritionalNotes');
    const logoutBtn = document.getElementById('logoutBtn');
    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');

    const API_CHILDREN = '/WEB_project/backend/api/children.php';
    const API_FEEDING = '/WEB_project/backend/api/feeding.php';

    function setupTopbar() {
        topUserName.textContent = window.authManager.getUserName();
        topUserInitial.textContent = window.authManager.getUserInitial();
        window.authManager.showAdminLinkIfNeeded();

        logoutBtn.addEventListener('click', async () => {
            await window.authManager.logout();
        });
    }

    async function loadChildren() {
        const result = await window.authManager.get(`${API_CHILDREN}?action=list`);

        if (result.status !== 'success' || !result.children?.length) {
            feedingChildSelect.innerHTML = '<option>Fără copii</option>';
            return;
        }

        feedingChildSelect.innerHTML = '';
        result.children.forEach((child) => {
            const option = document.createElement('option');
            option.value = child.id;
            option.textContent = `${child.name}, ${getAge(child.birth_date)} ani`;
            feedingChildSelect.appendChild(option);
        });

        const savedId = window.authManager.selectedChildId;
        const selectedChild = result.children.find(c => String(c.id) === String(savedId)) || result.children[0];

        feedingChildSelect.value = selectedChild.id;
        window.authManager.setSelectedChild(selectedChild.id);

        childNameText.textContent = selectedChild.name;
        childBirthText.textContent = `Născut(ă) pe ${formatDate(selectedChild.birth_date)}`;

        await loadFeedingData(selectedChild.id);

        feedingChildSelect.addEventListener('change', async (e) => {
            const childId = e.target.value;
            const child = result.children.find(c => String(c.id) === String(childId));
            if (child) {
                window.authManager.setSelectedChild(child.id);
                childNameText.textContent = child.name;
                childBirthText.textContent = `Născut(ă) pe ${formatDate(child.birth_date)}`;
                await loadFeedingData(child.id);
            }
        });
    }

    async function loadFeedingData(childId) {
        const result = await window.authManager.get(`${API_FEEDING}?action=get_feeding_data&child_id=${childId}`);

        if (result.status === 'success' && result.data) {
            renderFeeding(result.data);
        } else {
            renderEmpty();
        }
    }

    function renderFeeding(data) {
        document.getElementById('sumMealsCount').textContent = data.summary?.meals || '0';
        document.getElementById('sumLiquids').textContent = `${data.summary?.liquids || '0'} ml`;
        document.getElementById('sumCalories').textContent = `${data.summary?.calories || '0'} kcal`;

        if (data.journal?.length > 0) {
            journalTableBody.innerHTML = data.journal.map(row => `
                <tr>
                    <td>${row.time}</td>
                    <td><div class="meal-type"><span>${row.icon || '🍼'}</span> ${row.type}</div></td>
                    <td>${row.qty}</td>
                    <td><span style="color: var(--text-gray); font-size: 0.85rem">${row.obs || ''}</span></td>
                </tr>
            `).join('');
        } else {
            journalTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-gray); padding: 24px;">Nu există mese.</td></tr>';
        }

        if (data.lastMeal) {
            lastMealContainer.innerHTML = `
                <div class="last-meal-info">
                    <p><span>${data.lastMeal.icon || '🍼'}</span> ${data.lastMeal.type}</p>
                    <small>Azi, ${data.lastMeal.time}</small>
                </div>
                <strong>${data.lastMeal.qty}</strong>
            `;
        } else {
            lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        }

        if (data.notes?.length > 0) {
            nutritionalNotesContainer.innerHTML = data.notes.map(n => `<div class="note-item">👉 ${n}</div>`).join('');
        } else {
            nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe.</p>';
        }

        if (data.favorites?.length > 0) {
            favoriteFoods.innerHTML = data.favorites.map(f => `<div class="chip">${f}</div>`).join('');
        } else {
            favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        }

        if (data.preferences?.length > 0) {
            preferencesList.innerHTML = data.preferences.map(p => {
                const icon = p.type === 'check' ? '✓' : '⚠️';
                return `<li><span class="pref-${p.type}">${icon}</span> ${p.text}</li>`;
            }).join('');
        } else {
            preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe.</li>';
        }
    }

    function renderEmpty() {
        document.getElementById('sumMealsCount').textContent = '0';
        document.getElementById('sumLiquids').textContent = '0 ml';
        document.getElementById('sumCalories').textContent = '0 kcal';
        journalTableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-gray); padding: 24px;">Nu există mese.</td></tr>';
        lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe.</p>';
        favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe.</li>';
    }

    function setupModals() {
        const mealModal = document.getElementById('mealModal');
        const favModal = document.getElementById('favoriteModal');
        const prefModal = document.getElementById('preferenceModal');
        const noteModal = document.getElementById('noteModal');

        document.getElementById('btnAddMeal')?.addEventListener('click', () => {
            const now = new Date();
            document.getElementById('mealTime').value = now.toTimeString().slice(0, 5);
            mealModal?.classList.add('show');
        });

        document.getElementById('closeMealModal')?.addEventListener('click', () => mealModal?.classList.remove('show'));

        document.getElementById('addMealForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await window.authManager.post(`${API_FEEDING}?action=add_meal`, {
                child_id: feedingChildSelect.value,
                time: document.getElementById('mealTime').value,
                type: document.getElementById('mealType').value,
                qty: document.getElementById('mealQty').value,
                obs: document.getElementById('mealObs').value
            });
            if (result.status === 'success') {
                mealModal?.classList.remove('show');
                document.getElementById('addMealForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            }
        });

        document.getElementById('btnAddFavorite')?.addEventListener('click', () => favModal?.classList.add('show'));
        document.getElementById('closeFavoriteModal')?.addEventListener('click', () => favModal?.classList.remove('show'));

        document.getElementById('addFavoriteForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await window.authManager.post(`${API_FEEDING}?action=add_favorite`, {
                child_id: feedingChildSelect.value,
                food_name: document.getElementById('favoriteFoodName').value
            });
            if (result.status === 'success') {
                favModal?.classList.remove('show');
                document.getElementById('addFavoriteForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            }
        });

        document.getElementById('btnAddPreference')?.addEventListener('click', () => prefModal?.classList.add('show'));
        document.getElementById('closePreferenceModal')?.addEventListener('click', () => prefModal?.classList.remove('show'));

        document.getElementById('addPreferenceForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await window.authManager.post(`${API_FEEDING}?action=add_preference`, {
                child_id: feedingChildSelect.value,
                type: document.getElementById('preferenceType').value,
                text: document.getElementById('preferenceText').value
            });
            if (result.status === 'success') {
                prefModal?.classList.remove('show');
                document.getElementById('addPreferenceForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            }
        });

        document.getElementById('btnEditNote')?.addEventListener('click', () => noteModal?.classList.add('show'));
        document.getElementById('closeNoteModal')?.addEventListener('click', () => noteModal?.classList.remove('show'));

        document.getElementById('editNoteForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const result = await window.authManager.post(`${API_FEEDING}?action=save_note`, {
                child_id: feedingChildSelect.value,
                content: document.getElementById('noteContent').value
            });
            if (result.status === 'success') {
                noteModal?.classList.remove('show');
                document.getElementById('editNoteForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            }
        });

        window.addEventListener('click', (e) => {
            if (e.target?.classList?.contains('modal')) {
                e.target.classList.remove('show');
            }
        });
    }

    function renderCalendar() {
        const calendarStrip = document.getElementById('calendarStrip');
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
        if (!dateString) return 0;
        const birthDate = new Date(dateString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('ro-RO', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    }

    setupTopbar();
    renderCalendar();
    loadChildren();
    setupModals();
});