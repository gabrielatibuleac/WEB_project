document.addEventListener('DOMContentLoaded', () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const forgotForm = document.getElementById('forgotForm');
    const resetEmail = document.getElementById('resetEmail');
    const newPassword = document.getElementById('newPassword');

    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('selectedChildId');

    if (!forgotForm) {
        return;
    }

    forgotForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = resetEmail.value.trim();
        const password = newPassword.value;

        if (!email || !password) {
            alert('Completeaza emailul si noua parola.');
            return;
        }

        try {
            const response = await fetch('/WEB_project/backend/api/forgot_password.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const text = await response.text();
            let result;

            try {
                result = JSON.parse(text);
            } catch (error) {
                console.error(text);
                alert('Raspuns invalid de la server.');
                return;
            }

            alert(result.message);

            if (result.status === 'success') {
                window.location.href = 'login.html';
            }
        } catch (error) {
            console.error('Eroare:', error);
            alert('Eroare: Nu s-a putut contacta serverul.');
        }
    });
});