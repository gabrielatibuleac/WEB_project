document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('authForm');
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const registerFields = document.getElementById('registerFields');
    const authTitle = document.querySelector('.auth-header h2');
    const authSubtitle = document.getElementById('authSubtitle');
    const nameInput = document.getElementById('name');
    
    let isLoginMode = true;
    tabLogin.addEventListener('click', () => {
        isLoginMode = true;
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        registerFields.style.display = 'none';
        authTitle.textContent = 'Welcome back';
        authSubtitle.textContent = 'Sign in to continue to LittleSteps';
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

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 

        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        if (!isLoginMode) {
            formData.name = nameInput.value;
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

            if (!response.ok) throw new Error('Network response was not ok');

            const result = await response.json();

            if (result.status === 'success') {
                alert(result.message);
                if (isLoginMode) {
                    window.location.href = '../dashboard/index.html';
                } else {
                    tabLogin.click();
                }
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('AJAX Error:', error);
            alert('Serverul nu a putut fi contactat. Verifica daca XAMPP este pornit.');
        }
    });
});