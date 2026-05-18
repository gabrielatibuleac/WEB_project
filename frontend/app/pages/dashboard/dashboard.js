document.addEventListener('DOMContentLoaded', async () => {
    const welcomeName = document.getElementById('welcomeName');
    const topUserName = document.getElementById('topUserName');
    const logoutBtn = document.getElementById('logoutBtn');

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
        const firstName = fullName.split(' ')[0];

        welcomeName.textContent = firstName;
        topUserName.textContent = fullName;
    } catch (error) {
        window.location.href = '../auth/login.html';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await fetch('/WEB_project/backend/api/logout.php', {
                method: 'POST',
                credentials: 'same-origin'
            });

            window.location.href = '../auth/login.html';
        });
    }

    document.querySelectorAll('[data-route]').forEach((element) => {
        element.addEventListener('click', () => {
            window.location.href = element.dataset.route;
        });
    });
});