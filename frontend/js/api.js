// js/api.js
// Helper kecil untuk semua komunikasi ke backend.
// Backend & frontend di-serve dari origin yang sama, jadi BACKEND_URL boleh kosong.

const API_BASE = (window.BACKEND_URL || '').replace(/\/$/, '');

function getToken() {
    return localStorage.getItem('st_token');
}

function setToken(token) {
    if (token) localStorage.setItem('st_token', token);
    else localStorage.removeItem('st_token');
}

function getCachedUser() {
    try {
        const raw = localStorage.getItem('st_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function setCachedUser(user) {
    if (user) localStorage.setItem('st_user', JSON.stringify(user));
    else localStorage.removeItem('st_user');
}

/**
 * apiFetch: wrapper fetch yang otomatis menambahkan Authorization header
 * dan melempar Error dengan pesan yang jelas jika request gagal.
 */
async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch (networkErr) {
        setSyncStatus(false);
        throw new Error('Tidak bisa terhubung ke server. Periksa koneksi internet Anda.');
    }

    let data = null;
    try {
        data = await response.json();
    } catch {
        // response tanpa body (mis. 204)
    }

    if (!response.ok) {
        if (response.status === 401) {
            // Sesi kedaluwarsa: bersihkan sesi lokal
            setToken(null);
            setCachedUser(null);
        }
        setSyncStatus(response.status < 500);
        throw new Error((data && data.error) || `Terjadi kesalahan (${response.status})`);
    }

    setSyncStatus(true);
    return data;
}

function setSyncStatus(ok) {
    const el = document.getElementById('sync-status');
    if (!el) return;
    if (ok) {
        el.classList.remove('offline');
        el.innerHTML = '<span class="dot"></span> Tersinkron';
    } else {
        el.classList.add('offline');
        el.innerHTML = '<span class="dot"></span> Offline';
    }
}

window.speechTexterApi = {
    getToken, setToken, getCachedUser, setCachedUser, apiFetch, setSyncStatus,
};
