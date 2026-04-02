// admin.js - Login logic
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const uInput = document.getElementById('username');
    const pInput = document.getElementById('password');
    const errorMsg = document.getElementById('errorMsg');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simple authentication check
        if (uInput.value === 'admin' && pInput.value === '123456') {
            localStorage.setItem('adminAuth', 'true');
            window.location.href = 'dashboard.html';
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة!';
        }
    });

    // Check if already logged in
    if (localStorage.getItem('adminAuth') === 'true') {
        window.location.href = 'dashboard.html';
    }
});

function logout() {
    localStorage.removeItem('adminAuth');
    window.location.href = 'admin.html';
}
