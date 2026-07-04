// js/app.js
// Navigasi halaman, fitur Speech-to-Text, Text-to-Speech, Bahasa Isyarat,
// dark mode, dan sinkronisasi preferensi ke backend.

const { apiFetch } = window.speechTexterApi;

// ======================
// PAGE NAVIGATION
// ======================
function showPage(pageId) {
    document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
    document.getElementById(pageId)?.classList.add('active');
}

function goToLanding() { showPage('landing-page'); }
function goToLogin() { showPage('login-page'); }
function goToRegister() { showPage('register-page'); }

async function goToApp() {
    if (!isUserLoggedIn()) {
        goToLogin();
        return;
    }
    showPage('app-page');
    updateUserProfileUI();
    await loadAndApplyPreferences();
    if (window.loadHistory) window.loadHistory();
}

// ======================
// APP TAB SWITCHING
// ======================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab)?.classList.add('active');
            if (btn.dataset.tab === 'history-tab' && window.loadHistory) window.loadHistory();
        });
    });

    document.querySelectorAll('.demo-tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.demo-tab-btn').forEach((b) => b.classList.remove('active'));
            document.querySelectorAll('.demo-content').forEach((c) => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.demo)?.classList.add('active');
        });
    });
});

// ======================
// SPEECH RECOGNITION SETUP
// ======================
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
const supportsSTT = Boolean(SpeechRecognitionAPI);
const supportsTTS = 'speechSynthesis' in window;

function createRecognizer(lang) {
    if (!supportsSTT) return null;
    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    return rec;
}

// ---------- DEMO STT ----------
(function setupDemoStt() {
    const startBtn = document.getElementById('demo-start-btn');
    const stopBtn = document.getElementById('demo-stop-btn');
    const clearBtn = document.getElementById('demo-clear-btn');
    const transcriptEl = document.getElementById('demo-transcript');
    const statusEl = document.getElementById('demo-status');
    const langSelect = document.getElementById('demo-stt-lang');
    if (!startBtn) return;

    let recognizer = null;
    let finalText = '';

    function setStatus(msg, cls) {
        statusEl.textContent = msg;
        statusEl.className = `demo-status ${cls || ''}`;
    }

    if (!supportsSTT) {
        setStatus('Browser Anda tidak mendukung Speech Recognition. Coba Chrome/Edge terbaru.', 'error');
        startBtn.disabled = true;
        return;
    }

    startBtn.addEventListener('click', () => {
        recognizer = createRecognizer(langSelect.value);
        recognizer.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const text = event.results[i][0].transcript;
                if (event.results[i].isFinal) finalText += text + ' ';
                else interim += text;
            }
            transcriptEl.value = finalText + interim;
        };
        recognizer.onerror = (e) => setStatus(`Error: ${e.error}`, 'error');
        recognizer.onend = () => {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            setStatus('Selesai mendengarkan.', 'success');
        };
        recognizer.start();
        startBtn.disabled = true;
        stopBtn.disabled = false;
        setStatus('🎙️ Mendengarkan...', 'listening');
    });

    stopBtn.addEventListener('click', () => recognizer?.stop());
    clearBtn.addEventListener('click', () => {
        finalText = '';
        transcriptEl.value = '';
        setStatus('', '');
    });
})();

// ---------- DEMO TTS ----------
(function setupDemoTts() {
    const speakBtn = document.getElementById('demo-speak-btn');
    const pauseBtn = document.getElementById('demo-pause-btn');
    const resumeBtn = document.getElementById('demo-resume-btn');
    const stopBtn = document.getElementById('demo-stop-tts-btn');
    const textInput = document.getElementById('demo-text-input');
    const langSelect = document.getElementById('demo-tts-lang');
    const statusEl = document.getElementById('demo-tts-status');
    if (!speakBtn) return;

    function setStatus(msg, cls) {
        statusEl.textContent = msg;
        statusEl.className = `demo-status ${cls || ''}`;
    }

    if (!supportsTTS) {
        setStatus('Browser Anda tidak mendukung Text-to-Speech.', 'error');
        speakBtn.disabled = true;
        return;
    }

    speakBtn.addEventListener('click', () => {
        const utter = new SpeechSynthesisUtterance(textInput.value);
        utter.lang = langSelect.value;
        utter.onend = () => {
            speakBtn.disabled = false;
            pauseBtn.disabled = true;
            resumeBtn.disabled = true;
            stopBtn.disabled = true;
            setStatus('Selesai.', 'success');
        };
        speechSynthesis.speak(utter);
        speakBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        setStatus('🔊 Berbicara...', 'speaking');
    });
    pauseBtn.addEventListener('click', () => { speechSynthesis.pause(); pauseBtn.disabled = true; resumeBtn.disabled = false; });
    resumeBtn.addEventListener('click', () => { speechSynthesis.resume(); pauseBtn.disabled = false; resumeBtn.disabled = true; });
    stopBtn.addEventListener('click', () => {
        speechSynthesis.cancel();
        speakBtn.disabled = false;
        pauseBtn.disabled = true;
        resumeBtn.disabled = true;
        stopBtn.disabled = true;
        setStatus('Dihentikan.', '');
    });
})();

// ======================
// MAIN APP: SPEECH TO TEXT
// ======================
let mainRecognizer = null;
let mainFinalText = '';

const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const clearSttBtn = document.getElementById('clear-stt-btn');
const copySttBtn = document.getElementById('copy-stt-btn');
const saveSttBtn = document.getElementById('save-stt-btn');
const transcriptEl = document.getElementById('transcript');
const statusMessageEl = document.getElementById('status-message');
const sttLanguageSelect = document.getElementById('stt-language');

function showSttStatus(message, className) {
    if (!statusMessageEl) return;
    statusMessageEl.textContent = message;
    statusMessageEl.className = `status-message ${className || ''}`;
}

if (startBtn) {
    if (!supportsSTT) {
        showSttStatus('Browser Anda tidak mendukung Speech Recognition.', 'error');
        startBtn.disabled = true;
    } else {
        startBtn.addEventListener('click', () => {
            mainRecognizer = createRecognizer(sttLanguageSelect.value);
            mainRecognizer.onresult = (event) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const text = event.results[i][0].transcript;
                    if (event.results[i].isFinal) mainFinalText += text + ' ';
                    else interim += text;
                }
                transcriptEl.value = mainFinalText + interim;
            };
            mainRecognizer.onerror = (e) => showSttStatus(`Error: ${e.error}`, 'error');
            mainRecognizer.onend = () => {
                startBtn.disabled = false;
                stopBtn.disabled = true;
                showSttStatus('✓ Selesai mendengarkan.', 'success');
            };
            mainRecognizer.start();
            startBtn.disabled = true;
            stopBtn.disabled = false;
            showSttStatus('🎙️ Mendengarkan...', 'listening');
        });

        stopBtn.addEventListener('click', () => mainRecognizer?.stop());
        clearSttBtn.addEventListener('click', () => {
            mainFinalText = '';
            transcriptEl.value = '';
            showSttStatus('', '');
        });
        copySttBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(transcriptEl.value);
            showSttStatus('📋 Disalin ke clipboard!', 'success');
        });
        saveSttBtn?.addEventListener('click', async () => {
            if (!transcriptEl.value.trim()) {
                showSttStatus('Tidak ada teks untuk disimpan.', 'error');
                return;
            }
            try {
                await apiFetch('/api/history', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'stt', language: sttLanguageSelect.value, content: transcriptEl.value }),
                });
                showSttStatus('💾 Tersimpan ke riwayat!', 'success');
            } catch (err) {
                showSttStatus(`Gagal menyimpan: ${err.message}`, 'error');
            }
        });
    }
}

// ======================
// MAIN APP: TEXT TO SPEECH
// ======================
const textInput = document.getElementById('text-input');
const speakBtn = document.getElementById('speak-btn');
const pauseBtn = document.getElementById('pause-btn');
const resumeBtn = document.getElementById('resume-btn');
const stopTtsBtn = document.getElementById('stop-tts-btn');
const ttsLanguageSelect = document.getElementById('tts-language');
const speechRate = document.getElementById('speech-rate');
const speechPitch = document.getElementById('speech-pitch');
const speechVolume = document.getElementById('speech-volume');
const charNumber = document.getElementById('char-number');
const rateDisplay = document.getElementById('rate-display');
const pitchDisplay = document.getElementById('pitch-display');
const volumeDisplay = document.getElementById('volume-display');

if (textInput) {
    textInput.addEventListener('input', () => {
        const len = textInput.value.length;
        if (len > 5000) textInput.value = textInput.value.slice(0, 5000);
        charNumber.textContent = textInput.value.length;
    });
    speechRate?.addEventListener('input', () => { rateDisplay.textContent = `${speechRate.value}x`; });
    speechPitch?.addEventListener('input', () => { pitchDisplay.textContent = speechPitch.value; });
    speechVolume?.addEventListener('input', () => { volumeDisplay.textContent = `${Math.round(speechVolume.value * 100)}%`; });

    if (!supportsTTS) {
        speakBtn.disabled = true;
    } else {
        speakBtn.addEventListener('click', async () => {
            if (!textInput.value.trim()) return;
            const utter = new SpeechSynthesisUtterance(textInput.value);
            utter.lang = ttsLanguageSelect.value;
            utter.rate = parseFloat(speechRate.value);
            utter.pitch = parseFloat(speechPitch.value);
            utter.volume = parseFloat(speechVolume.value);
            utter.onend = () => {
                speakBtn.disabled = false;
                pauseBtn.disabled = true;
                resumeBtn.disabled = true;
                stopTtsBtn.disabled = true;
            };
            speechSynthesis.speak(utter);
            speakBtn.disabled = true;
            pauseBtn.disabled = false;
            stopTtsBtn.disabled = false;

            try {
                await apiFetch('/api/history', {
                    method: 'POST',
                    body: JSON.stringify({ type: 'tts', language: ttsLanguageSelect.value, content: textInput.value }),
                });
            } catch {
                // Gagal menyimpan riwayat TTS tidak menghentikan pemutaran suara
            }
        });
        pauseBtn.addEventListener('click', () => { speechSynthesis.pause(); pauseBtn.disabled = true; resumeBtn.disabled = false; });
        resumeBtn.addEventListener('click', () => { speechSynthesis.resume(); pauseBtn.disabled = false; resumeBtn.disabled = true; });
        stopTtsBtn.addEventListener('click', () => {
            speechSynthesis.cancel();
            speakBtn.disabled = false;
            pauseBtn.disabled = true;
            resumeBtn.disabled = true;
            stopTtsBtn.disabled = true;
        });
    }
}

// ======================
// SIGN LANGUAGE ANIMATION
// ======================
const signLanguageMap = {
    a: '🤟', b: '🤘', c: '🤌', d: '☝️', e: '✋', f: '🖐️', g: '👇', h: '👈', i: '👉', j: '☝️',
    k: '🤝', l: '🙌', m: '👏', n: '🙏', o: '👋', p: '✋', q: '🤟', r: '👐', s: '🤲', t: '✊',
    u: '✌️', v: '🤞', w: '🖖', x: '❌', y: '🤙', z: '⭐',
};

const commonWords = {
    hello: '👋🤟💬', thank: '🙏❤️✨', love: '❤️❤️❤️', yes: '👍✅👌', no: '❌🚫👎',
    good: '👍✨🌟', bad: '👎❌🔥', help: '🙏💪🤝', sorry: '🙏😔💔', please: '🙏🥺❤️',
};

let currentSignAnimation = null;

function startSignAnimation() {
    const textInputEl = document.getElementById('sign-text-input');
    const signFrame = document.getElementById('sign-frame');
    const signInfo = document.getElementById('sign-info');
    const text = textInputEl.value.trim().toLowerCase();

    if (!text) {
        signInfo.textContent = 'Silakan masukkan teks terlebih dahulu';
        return;
    }
    if (currentSignAnimation) clearTimeout(currentSignAnimation);
    signFrame.innerHTML = '';
    signInfo.textContent = 'Menampilkan animasi...';

    let sequence = [];
    if (commonWords[text]) {
        sequence = commonWords[text].split('');
    } else {
        for (const char of text) {
            if (signLanguageMap[char]) sequence.push(signLanguageMap[char]);
            else if (char !== ' ') sequence.push('❓');
        }
    }
    playSignAnimation(sequence, signFrame, signInfo);
}

function playSignAnimation(sequence, signFrame, signInfo) {
    let index = 0;
    const delay = 600;
    function showNext() {
        if (index < sequence.length) {
            signFrame.innerHTML = sequence[index];
            signFrame.style.animation = 'none';
            setTimeout(() => { signFrame.style.animation = 'sign-animate 0.6s ease-in-out'; }, 10);
            index++;
            currentSignAnimation = setTimeout(showNext, delay);
        } else {
            signInfo.textContent = '✓ Animasi selesai';
        }
    }
    showNext();
}

function resetSignAnimation() {
    if (currentSignAnimation) clearTimeout(currentSignAnimation);
    document.getElementById('sign-text-input').value = '';
    document.getElementById('sign-frame').innerHTML = '';
    document.getElementById('sign-info').textContent = 'Masukkan teks untuk melihat animasi';
}

// ======================
// DARK MODE
// ======================
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    ['theme-toggle-landing', 'theme-toggle-app'].forEach((id) => {
        const btn = document.getElementById(id);
        if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
}

async function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
    localStorage.setItem('st_theme', newTheme);
    if (isUserLoggedIn()) {
        try {
            await apiFetch('/api/preferences', { method: 'PUT', body: JSON.stringify({ theme: newTheme }) });
        } catch {
            // preferensi tema gagal sync, tidak masalah — tetap tersimpan secara lokal
        }
    }
}

document.getElementById('theme-toggle-landing')?.addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-app')?.addEventListener('click', toggleTheme);

// Terapkan tema tersimpan segera saat halaman dimuat (hindari "flash" tema salah)
applyTheme(localStorage.getItem('st_theme') || 'light');

// ======================
// PREFERENCES SYNC (dipanggil saat goToApp)
// ======================
async function loadAndApplyPreferences() {
    try {
        const data = await apiFetch('/api/preferences');
        const prefs = data.preferences;

        if (sttLanguageSelect) sttLanguageSelect.value = prefs.stt_language || 'id-ID';
        if (ttsLanguageSelect) ttsLanguageSelect.value = prefs.tts_language || 'id-ID';
        if (speechRate) { speechRate.value = prefs.tts_rate || 1; rateDisplay.textContent = `${speechRate.value}x`; }
        if (speechPitch) { speechPitch.value = prefs.tts_pitch || 1; pitchDisplay.textContent = speechPitch.value; }
        if (speechVolume) { speechVolume.value = prefs.tts_volume ?? 1; volumeDisplay.textContent = `${Math.round(speechVolume.value * 100)}%`; }
        const signLangSelect = document.getElementById('sign-lang');
        if (signLangSelect && prefs.sign_language) signLangSelect.value = prefs.sign_language.toLowerCase();

        applyTheme(prefs.theme || 'light');
        localStorage.setItem('st_theme', prefs.theme || 'light');
    } catch (err) {
        console.warn('Gagal memuat preferensi:', err.message);
    }
}

function debounce(fn, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

const savePreferences = debounce(async (partial) => {
    if (!isUserLoggedIn()) return;
    try {
        await apiFetch('/api/preferences', { method: 'PUT', body: JSON.stringify(partial) });
    } catch (err) {
        console.warn('Gagal menyimpan preferensi:', err.message);
    }
}, 600);

sttLanguageSelect?.addEventListener('change', () => savePreferences({ stt_language: sttLanguageSelect.value }));
ttsLanguageSelect?.addEventListener('change', () => savePreferences({ tts_language: ttsLanguageSelect.value }));
speechRate?.addEventListener('change', () => savePreferences({ tts_rate: parseFloat(speechRate.value) }));
speechPitch?.addEventListener('change', () => savePreferences({ tts_pitch: parseFloat(speechPitch.value) }));
speechVolume?.addEventListener('change', () => savePreferences({ tts_volume: parseFloat(speechVolume.value) }));
document.getElementById('sign-lang')?.addEventListener('change', (e) => savePreferences({ sign_language: e.target.value.toUpperCase() }));
