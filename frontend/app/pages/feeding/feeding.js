document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

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

    const menuToggle = document.getElementById("menuToggle");
    const sidebar = document.querySelector(".sidebar");

    if (menuToggle && sidebar) {
        menuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            sidebar.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (sidebar.classList.contains("active") && !sidebar.contains(e.target) && e.target !== menuToggle) {
                sidebar.classList.remove("active");
            }
        });
    }

    let editingMealId = null;

    function escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            background: ${type === 'success' ? '#63c982' : '#ff6b6b'};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 3000;
            animation: slideIn 0.3s ease;
            font-weight: 600;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    }

    function showConfirmDialog(message) {
        return new Promise((resolve) => {
            const dialog = document.createElement('div');
            dialog.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 4000;
            `;

            dialog.innerHTML = `
                <div style="background: white; padding: 24px; border-radius: 16px; max-width: 400px; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
                    <p style="margin: 0 0 24px; font-size: 1rem; color: var(--text-dark);">${message}</p>
                    <div style="display: flex; gap: 12px; justify-content: flex-end;">
                        <button id="confirmNo" style="padding: 10px 18px; border: 1px solid var(--border); background: white; color: var(--text-dark); border-radius: 8px; font-weight: 600; cursor: pointer;">Anulează</button>
                        <button id="confirmYes" style="padding: 10px 18px; background: #ff6b6b; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Șterge</button>
                    </div>
                </div>
            `;

            document.body.appendChild(dialog);

            document.getElementById('confirmYes').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(true);
            });

            document.getElementById('confirmNo').addEventListener('click', () => {
                document.body.removeChild(dialog);
                resolve(false);
            });
        });
    }

    function validateChildId(childId) {
        return /^\d+$/.test(childId) && parseInt(childId) > 0;
    }

    function validateTime(time) {
        return /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
    }

    function validateMealType(type) {
        const validTypes = ['Mic dejun', 'Gustare', 'Prânz', 'Cină', 'Apă'];
        return validTypes.includes(type);
    }

    function validateQuantity(qty) {
        return qty && qty.trim().length > 0 && qty.length <= 100;
    }

    function validatePreferenceType(type) {
        return type === 'check' || type === 'warn';
    }

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
    }

    function redirectToLogin() {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
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
            console.error('Invalid JSON response:', text);
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

    async function checkSession() {
        const result = await requestJson(`/WEB_project/backend/api/check_auth.php?_=${Date.now()}`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            redirectToLogin();
            return false;
        }

        const user = result.user;
        const fullName = user.name || user.full_name || 'User';

        if (topUserName) topUserName.textContent = fullName;
        if (topUserInitial) topUserInitial.textContent = fullName.charAt(0).toUpperCase();

        await loadUserPhoto();

        return true;
    }

    async function loadUserPhoto() {
        const result = await apiRequest('/WEB_project/backend/api/account.php?action=get');

        if (result.status === 'success') {
            const photoUrl = result.profile?.photo || null;
            const avatarDiv = document.getElementById('topUserInitial');

            if (avatarDiv && photoUrl) {
                avatarDiv.classList.add('has-photo');
                avatarDiv.style.backgroundImage = `url("${photoUrl}")`;
                avatarDiv.style.backgroundSize = 'cover';
                avatarDiv.style.backgroundPosition = 'center';
                avatarDiv.textContent = '';
            }
        }
    }

    async function logoutUser() {
        await requestJson('/WEB_project/backend/api/logout.php', { method: 'POST' });
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    async function loadChildren() {
        const result = await apiRequest(`${API_CHILDREN}?action=list`);

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

        const savedId = localStorage.getItem('selectedChildId');
        const selectedChild = result.children.find(c => String(c.id) === String(savedId)) || result.children[0];

        feedingChildSelect.value = selectedChild.id;
        localStorage.setItem('selectedChildId', selectedChild.id);

        if (childNameText) childNameText.textContent = escapeHtml(selectedChild.name);
        if (childBirthText) childBirthText.textContent = `Născut(ă) pe ${formatDate(selectedChild.birth_date)}`;

        await loadFeedingData(selectedChild.id);

        feedingChildSelect.addEventListener('change', async (e) => {
            const childId = e.target.value;
            const child = result.children.find(c => String(c.id) === String(childId));
            if (child) {
                localStorage.setItem('selectedChildId', child.id);
                if (childNameText) childNameText.textContent = escapeHtml(child.name);
                if (childBirthText) childBirthText.textContent = `Născut(ă) pe ${formatDate(child.birth_date)}`;
                await loadFeedingData(child.id);
            }
        });
    }

    async function loadFeedingData(childId) {
        if (!validateChildId(childId)) {
            showNotification('ID copil invalid', 'error');
            renderEmpty();
            return;
        }

        const result = await apiRequest(`${API_FEEDING}?action=get_feeding_data&child_id=${childId}`);

        if (result.status === 'success' && result.data) {
            renderFeeding(result.data);
        } else {
            showNotification(result.message || 'Eroare la încărcare date', 'error');
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
                    <td>${escapeHtml(row.time)}</td>
                    <td>
                        <div class="meal-type">
                            <span>${escapeHtml(row.icon)}</span> 
                            ${escapeHtml(row.type)}
                        </div>
                    </td>
                    <td>${escapeHtml(row.qty)}</td>
                    <td>
                        <span style="color: var(--text-gray); font-size: 0.85rem">
                            ${escapeHtml(row.obs || '')}
                        </span>
                    </td>
                    <td style="text-align: center; white-space: nowrap;">
                        <button class="btn-edit-meal" data-meal-id="${row.id}" data-meal-time="${escapeHtml(row.time)}" data-meal-type="${escapeHtml(row.type)}" data-meal-qty="${escapeHtml(row.qty)}" data-meal-obs="${escapeHtml(row.obs)}" title="Editează masă" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; margin-right: 12px; transition: transform 0.2s ease;">✏️</button>
                        <button class="btn-delete-meal" data-meal-id="${row.id}" title="Șterge masă" style="background: none; border: none; cursor: pointer; font-size: 1.2rem; transition: transform 0.2s ease;">🗑️</button>
                    </td>
                </tr>
            `).join('');
            document.querySelectorAll('.btn-edit-meal').forEach(btn => {
                btn.addEventListener('click', handleEditMeal);
                btn.addEventListener('mouseover', () => btn.style.transform = 'scale(1.2)');
                btn.addEventListener('mouseout', () => btn.style.transform = 'scale(1)');
            });
            document.querySelectorAll('.btn-delete-meal').forEach(btn => {
                btn.addEventListener('click', handleDeleteMeal);
                btn.addEventListener('mouseover', () => btn.style.transform = 'scale(1.2)');
                btn.addEventListener('mouseout', () => btn.style.transform = 'scale(1)');
            });
        } else {
            journalTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-gray); padding: 24px;">Nu există mese.</td></tr>';
        }

        if (data.lastMeal) {
            lastMealContainer.innerHTML = `
                <div class="last-meal-info">
                    <p><span>${escapeHtml(data.lastMeal.icon)}</span> ${escapeHtml(data.lastMeal.type)}</p>
                    <small>Azi, ${escapeHtml(data.lastMeal.time)}</small>
                </div>
                <strong>${escapeHtml(data.lastMeal.qty)}</strong>
            `;
        } else {
            lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        }

        if (data.notes?.length > 0) {
            nutritionalNotesContainer.innerHTML = data.notes.map(n => 
                `<div class="note-item">👉 ${escapeHtml(n)}</div>`
            ).join('');
        } else {
            nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe.</p>';
        }

        if (data.favorites?.length > 0) {
            favoriteFoods.innerHTML = data.favorites.map(f => 
                `<div class="chip">${escapeHtml(f)}</div>`
            ).join('');
        } else {
            favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        }

        if (data.preferences?.length > 0) {
            preferencesList.innerHTML = data.preferences.map(p => {
                const icon = p.type === 'check' ? '✓' : '⚠️';
                return `<li><span class="pref-${p.type}">${icon}</span> ${escapeHtml(p.text)}</li>`;
            }).join('');
        } else {
            preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe.</li>';
        }
    }

    function renderEmpty() {
        document.getElementById('sumMealsCount').textContent = '0';
        document.getElementById('sumLiquids').textContent = '0 ml';
        document.getElementById('sumCalories').textContent = '0 kcal';
        journalTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-gray); padding: 24px;">Nu există mese.</td></tr>';
        lastMealContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nicio masă azi.</p>';
        nutritionalNotesContainer.innerHTML = '<p style="color: var(--text-gray); font-size: 0.9rem; margin:0;">Nu există notițe.</p>';
        favoriteFoods.innerHTML = '<span style="color: var(--text-gray); font-size: 0.9rem;">Nespecificate</span>';
        preferencesList.innerHTML = '<li style="color: var(--text-gray); font-size: 0.9rem;">Fără preferințe.</li>';
    }

    async function handleEditMeal(e) {
        const mealId = e.target.dataset.mealId;
        const mealTime = e.target.dataset.mealTime;
        const mealType = e.target.dataset.mealType;
        const mealQty = e.target.dataset.mealQty;
        const mealObs = e.target.dataset.mealObs;

        editingMealId = mealId;

        const mealModal = document.getElementById('mealModal');
        const mealForm = document.getElementById('addMealForm');
        const modalHeader = mealModal.querySelector('.modal-header h3');

    
        modalHeader.textContent = '✏️ Editează masă';

    
        document.getElementById('mealTime').value = mealTime;
        document.getElementById('mealType').value = mealType;
        document.getElementById('mealQty').value = mealQty;
        document.getElementById('mealObs').value = mealObs;

        const submitBtn = mealForm.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Salvează modificări';

        mealModal.classList.add('show');
    }

    async function handleDeleteMeal(e) {
        const mealId = e.target.dataset.mealId;

        const confirmed = await showConfirmDialog('Ești sigur că vrei să ștergi această masă?');

        if (!confirmed) return;

        const result = await apiRequest(`${API_FEEDING}?action=delete_meal&meal_id=${mealId}`, 'DELETE');

        if (result.status === 'success') {
            showNotification('Masă ștearsă cu succes');
            await loadFeedingData(feedingChildSelect.value);
        } else {
            showNotification(result.message || 'Eroare la ștergere masă', 'error');
        }
    }

    function setupModals() {
        const mealModal = document.getElementById('mealModal');
        const favModal = document.getElementById('favoriteModal');
        const prefModal = document.getElementById('preferenceModal');
        const noteModal = document.getElementById('noteModal');


        document.getElementById('btnAddMeal')?.addEventListener('click', () => {
            editingMealId = null;
            const now = new Date();
            document.getElementById('mealTime').value = now.toTimeString().slice(0, 5);
            document.getElementById('mealType').value = '';
            document.getElementById('mealQty').value = '';
            document.getElementById('mealObs').value = '';

            const modalHeader = mealModal.querySelector('.modal-header h3');
            modalHeader.textContent = '🍼 Înregistrează o masă';

            const submitBtn = document.getElementById('addMealForm').querySelector('button[type="submit"]');
            submitBtn.textContent = 'Salvează în jurnal';

            mealModal?.classList.add('show');
        });

        document.getElementById('closeMealModal')?.addEventListener('click', () => {
            editingMealId = null;
            mealModal?.classList.remove('show');
        });

        document.getElementById('addMealForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const mealTime = document.getElementById('mealTime').value;
            const mealType = document.getElementById('mealType').value;
            const mealQty = document.getElementById('mealQty').value;
            const mealObs = document.getElementById('mealObs').value;
            const childId = feedingChildSelect.value;

    
            if (!validateTime(mealTime)) {
                showNotification('Format timp invalid (HH:MM)', 'error');
                return;
            }
            if (!validateMealType(mealType)) {
                showNotification('Tip masă invalid', 'error');
                return;
            }
            if (!validateQuantity(mealQty)) {
                showNotification('Cantitate invalidă', 'error');
                return;
            }

            const endpoint = editingMealId 
                ? `${API_FEEDING}?action=update_meal&meal_id=${editingMealId}`
                : `${API_FEEDING}?action=add_meal`;

            const method = editingMealId ? 'PUT' : 'POST';

            const result = await apiRequest(endpoint, method, {
                child_id: childId,
                time: mealTime,
                type: mealType,
                qty: mealQty,
                obs: mealObs
            });

            if (result.status === 'success') {
                showNotification(editingMealId ? 'Masă actualizată cu succes' : 'Masă adăugată cu succes');
                mealModal?.classList.remove('show');
                editingMealId = null;
                document.getElementById('addMealForm')?.reset();
                await loadFeedingData(childId);
            } else {
                showNotification(result.message || 'Eroare la salvare masă', 'error');
            }
        });

        document.getElementById('btnAddFavorite')?.addEventListener('click', () => {
            document.getElementById('favoriteFoodName').value = '';
            favModal?.classList.add('show');
        });

        document.getElementById('closeFavoriteModal')?.addEventListener('click', () => 
            favModal?.classList.remove('show')
        );

        document.getElementById('addFavoriteForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const foodName = document.getElementById('favoriteFoodName').value;

            if (!validateQuantity(foodName)) {
                showNotification('Nume aliment invalid', 'error');
                return;
            }

            const result = await apiRequest(`${API_FEEDING}?action=add_favorite`, 'POST', {
                child_id: feedingChildSelect.value,
                food_name: foodName
            });

            if (result.status === 'success') {
                showNotification('Aliment adăugat cu succes');
                favModal?.classList.remove('show');
                document.getElementById('addFavoriteForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            } else {
                showNotification(result.message || 'Eroare la adăugare aliment', 'error');
            }
        });

        document.getElementById('btnAddPreference')?.addEventListener('click', () => {
            document.getElementById('preferenceType').value = '';
            document.getElementById('preferenceText').value = '';
            prefModal?.classList.add('show');
        });

        document.getElementById('closePreferenceModal')?.addEventListener('click', () => 
            prefModal?.classList.remove('show')
        );

        document.getElementById('addPreferenceForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const prefType = document.getElementById('preferenceType').value;
            const prefText = document.getElementById('preferenceText').value;

            if (!validatePreferenceType(prefType)) {
                showNotification('Tip preferință invalid', 'error');
                return;
            }
            if (!prefText || prefText.trim().length === 0) {
                showNotification('Descriere nu poate fi goală', 'error');
                return;
            }

            const result = await apiRequest(`${API_FEEDING}?action=add_preference`, 'POST', {
                child_id: feedingChildSelect.value,
                type: prefType,
                text: prefText
            });

            if (result.status === 'success') {
                showNotification('Preferință adăugată cu succes');
                prefModal?.classList.remove('show');
                document.getElementById('addPreferenceForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            } else {
                showNotification(result.message || 'Eroare la adăugare preferință', 'error');
            }
        });


        document.getElementById('btnEditNote')?.addEventListener('click', () => {
            document.getElementById('noteContent').value = '';
            noteModal?.classList.add('show');
        });

        document.getElementById('closeNoteModal')?.addEventListener('click', () => 
            noteModal?.classList.remove('show')
        );

        document.getElementById('editNoteForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();

            const noteContent = document.getElementById('noteContent').value;

            if (!noteContent || noteContent.trim().length === 0) {
                showNotification('Notă nu poate fi goală', 'error');
                return;
            }

            const result = await apiRequest(`${API_FEEDING}?action=save_note`, 'POST', {
                child_id: feedingChildSelect.value,
                content: noteContent
            });

            if (result.status === 'success') {
                showNotification('Notă salvată cu succes');
                noteModal?.classList.remove('show');
                document.getElementById('editNoteForm')?.reset();
                await loadFeedingData(feedingChildSelect.value);
            } else {
                showNotification(result.message || 'Eroare la salvare notă', 'error');
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
        if (!calendarStrip) return;

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
        const parts = dateString.split('-').map(Number);
        const birthDate = new Date(parts[0], parts[1] - 1, parts[2]);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const month = today.getMonth() - birthDate.getMonth();
        if (month < 0 || (month === 0 && today.getDate() < birthDate.getDate())) age--;
        return Math.max(age, 0);
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const parts = dateString.split('-').map(Number);
        return new Date(parts[0], parts[1] - 1, parts[2])
            .toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
    }

    if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

    const isLoggedIn = await checkSession();
    if (isLoggedIn) {
        renderCalendar();
        await loadChildren();
        setupModals();
    }
});
