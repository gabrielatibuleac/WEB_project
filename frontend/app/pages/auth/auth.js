document.addEventListener('DOMContentLoaded', () => {
    const AUTH_TOKEN_KEY = 'bain_auth_token';

    const authForm = document.getElementById('authForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const registerFields = document.getElementById('registerFields');
    const authTitle = document.querySelector('.auth-header h2');
    const authSubtitle = document.getElementById('authSubtitle');
    const nameInput = document.getElementById('name');
    const adminCodeInput = document.getElementById('adminCode');

    let isLoginMode = true;

    sessionStorage.removeItem(AUTH_TOKEN_KEY);

    tabLogin.addEventListener('click', () => {
        isLoginMode = true;
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        registerFields.style.display = 'none';
        authTitle.textContent = 'Welcome back';
        authSubtitle.textContent = 'Sign in to continue to BaIn';
        nameInput.required = false;
    });

    tabRegister.addEventListener('click', () => {
        isLoginMode = false;
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerFields.style.display = 'block';
        authTitle.textContent = 'Create account';
        authSubtitle.textContent = 'Start your family journey today';
        nameInput.required = true;
    });

    authForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        if (!isLoginMode) {
            formData.name = nameInput.value.trim();
            formData.admin_code = adminCodeInput ? adminCodeInput.value.trim() : '';
        }

        const endpoint = isLoginMode
            ? '/WEB_project/backend/api/login.php'
            : '/WEB_project/backend/api/register.php';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
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

            if (result.status !== 'success') {
                alert('Error: ' + result.message);
                return;
            }

            alert(result.message);

            if (isLoginMode) {
                if (!result.token) {
                    alert('Autentificarea nu a returnat token.');
                    return;
                }

                sessionStorage.setItem(AUTH_TOKEN_KEY, result.token);
                window.location.href = '../dashboard/index.html';
                return;
            }

            tabLogin.click();
        } catch (error) {
            console.error('AJAX Error:', error);
            alert('Serverul nu a putut fi contactat. Verifica daca XAMPP este pornit.');
        }
    });
});