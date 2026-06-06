document.addEventListener('DOMContentLoaded', async () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const adminApiBase = '/WEB_project/backend/api/admin.php';

    const topUserName = document.getElementById('topUserName');
    const topUserInitial = document.getElementById('topUserInitial');
    const logoutBtn = document.getElementById('logoutBtn');

    const usersCount = document.getElementById('usersCount');
    const childrenCount = document.getElementById('childrenCount');
    const medicalCount = document.getElementById('medicalCount');
    const timelineCount = document.getElementById('timelineCount');
    const sharesCount = document.getElementById('sharesCount');

    const usersTable = document.getElementById('usersTable');
    const childrenTable = document.getElementById('childrenTable');

    const dataTableSelect = document.getElementById('dataTableSelect');
    const exportJsonBtn = document.getElementById('exportJsonBtn');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const importJsonInput = document.getElementById('importJsonInput');
    const importCsvInput = document.getElementById('importCsvInput');

    let currentUser = null;
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

    function getAuthToken() {
        return sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
    }

    function redirectToLogin() {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('selectedChildId');
        window.location.href = '../auth/login.html';
    }

    function getAuthHeaders(extraHeaders = {}) {
        const token = getAuthToken();

        return {
            ...extraHeaders,
            Authorization: `Bearer ${token}`
        };
    }

    async function requestJson(url, options = {}) {
        const token = getAuthToken();

        if (!token) {
            redirectToLogin();

            return {
                status: 'error',
                message: 'Token lipsa.'
            };
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

            return {
                status: 'error',
                message: 'Raspuns invalid de la server.'
            };
        }

        if (response.status === 401) {
            redirectToLogin();
            return result;
        }

        if (response.status === 403) {
            alert(result.message || 'Nu ai drepturi de administrator.');
            window.location.href = '../dashboard/index.html';
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

        currentUser = result.user;

        if (currentUser.role !== 'admin') {
            alert('Nu ai drepturi de administrator.');
            window.location.href = '../dashboard/index.html';
            return false;
        }

        const fullName = currentUser.name || 'Admin';

        topUserName.textContent = fullName;
        topUserInitial.textContent = fullName.charAt(0).toUpperCase();

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

    async function loadAdminDashboard() {
        const result = await requestJson(`${adminApiBase}?action=dashboard`, {
            method: 'GET'
        });

        if (result.status !== 'success') {
            alert(result.message || 'Eroare la incarcarea modulului admin.');
            return;
        }

        renderStats(result.stats || {});
        renderUsers(result.users || []);
        renderChildren(result.children || []);
    }

    function renderStats(stats) {
        usersCount.textContent = stats.users || 0;
        childrenCount.textContent = stats.children || 0;
        medicalCount.textContent = stats.medical || 0;
        timelineCount.textContent = stats.timeline || 0;
        sharesCount.textContent = stats.shares || 0;
    }

    function renderUsers(users) {
        usersTable.innerHTML = '';

        if (users.length === 0) {
            usersTable.innerHTML = '<tr><td colspan="6">Nu exista utilizatori.</td></tr>';
            return;
        }

        users.forEach((user) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${escapeHtml(user.full_name)}</td>
                <td>${escapeHtml(user.email)}</td>
                <td>
                    <select class="role-select" data-user-id="${escapeHtml(user.id)}">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>user</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>admin</option>
                    </select>
                </td>
                <td>${escapeHtml(user.children_count || 0)}</td>
                <td>${formatDateTime(user.created_at)}</td>
                <td>
                    <button class="delete-btn" data-delete-user="${escapeHtml(user.id)}">Sterge</button>
                </td>
            `;

            usersTable.appendChild(row);
        });

        document.querySelectorAll('.role-select').forEach((select) => {
            select.addEventListener('change', async () => {
                await updateRole(select.dataset.userId, select.value);
            });
        });

        document.querySelectorAll('[data-delete-user]').forEach((button) => {
            button.addEventListener('click', async () => {
                await deleteUser(button.dataset.deleteUser);
            });
        });
    }

    function renderChildren(children) {
        childrenTable.innerHTML = '';

        if (children.length === 0) {
            childrenTable.innerHTML = '<tr><td colspan="6">Nu exista copii inregistrati.</td></tr>';
            return;
        }

        children.forEach((child) => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${escapeHtml(child.name)}</td>
                <td>${escapeHtml(child.parent_name)}</td>
                <td>${escapeHtml(child.parent_email)}</td>
                <td>${escapeHtml(child.education_level || '-')}</td>
                <td>${formatDateTime(child.created_at)}</td>
                <td>
                    <button class="delete-btn" data-delete-child="${escapeHtml(child.id)}">Sterge</button>
                </td>
            `;

            childrenTable.appendChild(row);
        });

        document.querySelectorAll('[data-delete-child]').forEach((button) => {
            button.addEventListener('click', async () => {
                await deleteChild(button.dataset.deleteChild);
            });
        });
    }

    async function updateRole(userId, role) {
        const result = await requestJson(`${adminApiBase}?action=update_role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId,
                role: role
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            await loadAdminDashboard();
        }
    }

    async function deleteUser(userId) {
        if (!confirm('Sigur vrei sa stergi acest utilizator?')) {
            return;
        }

        const result = await requestJson(`${adminApiBase}?action=delete_user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            await loadAdminDashboard();
        }
    }

    async function deleteChild(childId) {
        if (!confirm('Sigur vrei sa stergi acest profil de copil?')) {
            return;
        }

        const result = await requestJson(`${adminApiBase}?action=delete_child`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                child_id: childId
            })
        });

        alert(result.message);

        if (result.status === 'success') {
            await loadAdminDashboard();
        }
    }

    async function exportJson() {
        const table = dataTableSelect.value || 'all';
        await downloadFile(`${adminApiBase}?action=export_json&table=${encodeURIComponent(table)}`, `bain_export_${table}.json`);
    }

    async function exportCsv() {
        const table = dataTableSelect.value || '';

        if (!table || table === 'all') {
            alert('Pentru export CSV selecteaza o singura tabela, nu "Toate tabelele".');
            return;
        }

        await downloadFile(`${adminApiBase}?action=export_csv&table=${encodeURIComponent(table)}`, `bain_export_${table}.csv`);
    }

    async function downloadFile(url, filename) {
        const token = getAuthToken();

        if (!token) {
            redirectToLogin();
            return;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            redirectToLogin();
            return;
        }

        if (response.status === 403) {
            alert('Nu ai drepturi de administrator.');
            return;
        }

        if (!response.ok) {
            const text = await response.text();
            console.error(text);
            alert('Exportul a esuat.');
            return;
        }

        const blob = await response.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(downloadUrl);
    }

    async function importJsonFile(file) {
        const table = dataTableSelect.value || 'all';

        if (!file) {
            return;
        }

        const result = await uploadImportFile('import_json', table, file);
        alert(result.message || 'Import JSON finalizat.');

        if (result.status === 'success') {
            await loadAdminDashboard();
        }

        importJsonInput.value = '';
    }

    async function importCsvFile(file) {
        const table = dataTableSelect.value || '';

        if (!file) {
            return;
        }

        if (!table || table === 'all') {
            alert('Pentru import CSV selecteaza o singura tabela.');
            importCsvInput.value = '';
            return;
        }

        const result = await uploadImportFile('import_csv', table, file);
        alert(result.message || 'Import CSV finalizat.');

        if (result.status === 'success') {
            await loadAdminDashboard();
        }

        importCsvInput.value = '';
    }

    async function uploadImportFile(action, table, file) {
        const token = getAuthToken();

        if (!token) {
            redirectToLogin();

            return {
                status: 'error',
                message: 'Token lipsa.'
            };
        }

        const formData = new FormData();

        formData.append('file', file);
        formData.append('table', table);

        const response = await fetch(`${adminApiBase}?action=${action}&table=${encodeURIComponent(table)}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        const text = await response.text();
        let result;

        try {
            result = JSON.parse(text);
        } catch (error) {
            console.error(text);

            return {
                status: 'error',
                message: 'Raspuns invalid de la server.'
            };
        }

        if (response.status === 401) {
            redirectToLogin();
            return result;
        }

        if (response.status === 403) {
            alert(result.message || 'Nu ai drepturi de administrator.');
            return result;
        }

        return result;
    }

    function formatDateTime(dateString) {
        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toLocaleString('ro-RO', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
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

    logoutBtn.addEventListener('click', logoutUser);

    exportJsonBtn.addEventListener('click', exportJson);
    exportCsvBtn.addEventListener('click', exportCsv);

    importJsonInput.addEventListener('change', async () => {
        await importJsonFile(importJsonInput.files[0]);
    });

    importCsvInput.addEventListener('change', async () => {
        await importCsvFile(importCsvInput.files[0]);
    });

    const ok = await checkAuth();

    if (ok) {
        await loadAdminDashboard();
    }
});