// js/history.js
// Fitur baru: Riwayat STT/TTS tersimpan di backend, per akun.

var { apiFetch } = window.speechTexterApi;

let historyCache = [];
let activeFilter = 'all';

function formatDate(isoString) {
    try {
        const date = new Date(isoString.replace(' ', 'T') + 'Z');
        return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
        return isoString;
    }
}

function renderHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;

    const filtered = activeFilter === 'all'
        ? historyCache
        : historyCache.filter((item) => item.type === activeFilter);

    if (filtered.length === 0) {
        listEl.innerHTML = '<div class="history-empty">Belum ada riwayat. Simpan hasil STT/TTS untuk melihatnya di sini.</div>';
        return;
    }

    listEl.innerHTML = filtered.map((item) => `
        <div class="history-item" data-id="${item.id}">
            <div class="history-item-content">
                <div class="history-item-meta">
                    ${item.type === 'stt' ? '🎙️ Speech to Text' : '📢 Text to Speech'}
                    ${item.language ? ` · ${item.language}` : ''}
                    · ${formatDate(item.created_at)}
                </div>
                <div class="history-item-text">${escapeHtml(item.content)}</div>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-small copy-history-btn" data-id="${item.id}">📋 Salin</button>
                <button class="btn btn-small btn-danger delete-history-btn" data-id="${item.id}">🗑️ Hapus</button>
            </div>
        </div>
    `).join('');

    listEl.querySelectorAll('.copy-history-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const item = historyCache.find((h) => h.id === btn.dataset.id);
            if (item) navigator.clipboard.writeText(item.content);
        });
    });
    listEl.querySelectorAll('.delete-history-btn').forEach((btn) => {
        btn.addEventListener('click', () => deleteHistoryItem(btn.dataset.id));
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function loadHistory() {
    const listEl = document.getElementById('history-list');
    if (!listEl) return;
    if (!isUserLoggedIn()) return;

    listEl.innerHTML = '<div class="history-empty">Memuat riwayat...</div>';
    try {
        const data = await apiFetch('/api/history');
        historyCache = data.history;
        renderHistory();
    } catch (err) {
        listEl.innerHTML = `<div class="history-empty">Gagal memuat riwayat: ${err.message}</div>`;
    }
}

async function deleteHistoryItem(id) {
    try {
        await apiFetch(`/api/history/${id}`, { method: 'DELETE' });
        historyCache = historyCache.filter((h) => h.id !== id);
        renderHistory();
    } catch (err) {
        alert(`Gagal menghapus: ${err.message}`);
    }
}

async function clearAllHistory() {
    if (!confirm('Hapus SEMUA riwayat? Tindakan ini tidak bisa dibatalkan.')) return;
    try {
        await apiFetch('/api/history', { method: 'DELETE' });
        historyCache = [];
        renderHistory();
    } catch (err) {
        alert(`Gagal menghapus riwayat: ${err.message}`);
    }
}

function exportHistory() {
    if (historyCache.length === 0) {
        alert('Tidak ada riwayat untuk diekspor.');
        return;
    }
    const lines = historyCache.map((item) => {
        const label = item.type === 'stt' ? 'Speech to Text' : 'Text to Speech';
        return `[${formatDate(item.created_at)}] (${label}${item.language ? `, ${item.language}` : ''})\n${item.content}\n`;
    });
    const blob = new Blob([lines.join('\n---\n\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speech-texter-riwayat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.history-filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.history-filter-btn').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderHistory();
        });
    });
    document.getElementById('refresh-history-btn')?.addEventListener('click', loadHistory);
    document.getElementById('export-history-btn')?.addEventListener('click', exportHistory);
    document.getElementById('clear-history-btn')?.addEventListener('click', clearAllHistory);
});

window.loadHistory = loadHistory;
