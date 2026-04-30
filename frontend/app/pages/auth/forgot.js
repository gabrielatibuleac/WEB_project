document.addEventListener('DOMContentLoaded', () => {
    const forgotForm = document.getElementById('forgotForm');
    
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault(); 
            
            const email = document.getElementById('resetEmail').value;
            const password = document.getElementById('newPassword').value;

            try {
                const response = await fetch('/WEB_project/backend/api/forgot_password.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });

                const result = await response.json();
                alert(result.message); 

                if(result.status === 'success') {
                    window.location.href = 'login.html';
                }
                
            } catch (error) {
                console.error("Eroare:", error);
                alert("Eroare: Nu s-a putut contacta serverul.");
            }
        });
    }
});