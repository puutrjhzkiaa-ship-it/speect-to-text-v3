// js/auth.js
// Menangani register, login, Google Sign-In, logout, dan pemulihan sesi.

const { apiFetch, getToken, setToken, getCachedUser, setCachedUser } = window.speechTexterApi;

let currentUser = getCachedUser();
let googleEnabled = false;
let googleClientId = null;

function isUserLoggedIn() {
    return Boolean(getToken() && currentUser);
}

function getCurrentUser() {
    return currentUser;
}

function showAlert(elId, message, type = 'error') {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = message;
    el.className = `auth-alert show ${type}`;
}

function clearAlert(elId) {
    const el = document.getElementById(elId);
    if (el) el.className = 'auth-alert';
}

function setButtonLoading(btn, loading, loadingText) {
    if (!btn) return;
    if (loading) {
        btn.dataset.originalText = btn.textContent;
        btn.textContent = loadingText || 'Memproses...';
        btn.dataset.loading = 'true';
    } else {
        btn.textContent = btn.dataset.originalText || btn.textContent;
        btn.dataset.loading = 'false';
    }
}

// ======================
// REGISTER
// ======================
async function handleRegisterSubmit(event) {
    event.preventDefault();
    clearAlert('register-alert');

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;

    if (password !== confirm) {
        showAlert('register-alert', 'Password dan konfirmasi tidak sama.');
        return;
    }

    const btn = document.getElementById('register-submit-btn');
    setButtonLoading(btn, true, 'Membuat akun...');
    try {
        const data = await apiFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        });
        onAuthSuccess(data.token, data.user);
    } catch (err) {
        showAlert('register-alert', err.message);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ======================
// LOGIN
// ======================
async function handleLoginSubmit(event) {
    event.preventDefault();
    clearAlert('login-alert');

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const btn = document.getElementById('login-submit-btn');
    setButtonLoading(btn, true, 'Masuk...');
    try {
        const data = await apiFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
        onAuthSuccess(data.token, data.user);
    } catch (err) {
        showAlert('login-alert', err.message);
    } finally {
        setButtonLoading(btn, false);
    }
}

// ======================
// GOOGLE SIGN-IN
// ======================
async function handleGoogleCredential(response) {
    try {
        const data = await apiFetch('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential: response.credential }),
        });
        onAuthSuccess(data.token, data.user);
    } catch (err) {
        const targetAlert = document.getElementById('login-page').classList.contains('active')
            ? 'login-alert' : 'register-alert';
        showAlert(targetAlert, err.message || 'Login dengan Google gagal.');
    }
}

function initGoogleSignIn() {
    if (!googleEnabled || typeof google === 'undefined' || !google.accounts) return;

    google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredential,
        ux_mode: 'popup',
    });

    ['google-signin-button-login', 'google-signin-button-register'].forEach((id) => {
        const el = document.getElementById(id);
        if (el) {
            google.accounts.id.renderButton(el, { theme: 'outline', size: 'large', width: 300 });
        }
    });
}

// ======================
// SESSION HELPERS
// ======================
function onAuthSuccess(token, user) {
    setToken(token);
    setCachedUser(user);
    currentUser = user;
    updateUserProfileUI();
    goToApp();
    if (window.onLoggedIn) window.onLoggedIn();
}

async function restoreSession() {
    if (!getToken()) return false;
    try {
        const data = await apiFetch('/api/auth/me');
        currentUser = data.user;
        setCachedUser(data.user);
        return true;
    } catch {
        return false;
    }
}

function updateUserProfileUI() {
    const btn = document.getElementById('user-profile-btn');
    const greeting = document.getElementById('dashboard-greeting');
    if (btn && currentUser) {
        btn.textContent = `👤 Hai, ${currentUser.name}`;
        btn.title = currentUser.email;
    }
    if (greeting && currentUser) {
        greeting.textContent = `Halo, ${currentUser.name}! Siap mengonversi suara hari ini?`;
    }
}

function handleLogout() {
    if (!confirm('Anda yakin ingin keluar?')) return;
    setToken(null);
    setCachedUser(null);
    currentUser = null;
    goToLanding();
}

// ======================
// INIT
// ======================
document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('register-form')?.addEventListener('submit', handleRegisterSubmit);
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);

    // Ambil konfigurasi publik dari server (apakah Google Sign-In aktif)
    try {
        const config = await fetch(`${(window.BACKEND_URL || '')}/api/config`).then((r) => r.json());
        googleEnabled = Boolean(config.googleEnabled);
        googleClientId = config.googleClientId;
    } catch {
        googleEnabled = false;
    }

    if (googleEnabled) {
        // Script Google dimuat async, tunggu sebentar sebelum init
        const tryInit = () => {
            if (typeof google !== 'undefined' && google.accounts) initGoogleSignIn();
            else setTimeout(tryInit, 300);
        };
        tryInit();
    }

    // Coba pulihkan sesi (misal setelah refresh halaman)
    if (getToken()) {
        const ok = await restoreSession();
        if (ok) {
            updateUserProfileUI();
        } else {
            currentUser = null;
        }
    }
});
