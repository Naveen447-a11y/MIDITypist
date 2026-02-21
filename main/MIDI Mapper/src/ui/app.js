/**
 * MIDITypist - Core Frontend Engine
 * Handles State, Bridge Communication, and UI Orchestration.
 */

// --- State ---
let mappings = [];
let currentView = 'mappings';
let learnPhase = 0; // 0: Idle, 1: Waiting for MIDI, 2: Waiting for Key
let searchQuery = ''; // For mapping search filter
const MAX_LOG_ENTRIES = 500;

// --- Bridge: Send commands to C++ ---
function send(action, data = {}) {
    if (window.chrome?.webview) {
        window.chrome.webview.postMessage(JSON.stringify({ action, ...data }));
    }
}

// --- Bridge: Receive messages from C++ ---
if (window.chrome?.webview) {
    window.chrome.webview.addEventListener('message', e => {
        const msg = e.data;
        switch (msg.type) {
            case 'mappings': updateMappings(msg.mappings); break;
            case 'midi_note': handleMidiEvent('Note', msg.note, msg.velocity); break;
            case 'midi_cc': handleMidiEvent('CC', msg.cc, msg.value); break;
            case 'status': setStatus(msg.text); break;
            case 'app_changed': updateContext(msg.app, msg.title); break;
            case 'learn_phase':
                learnPhase = msg.phase;
                const promptEl = document.getElementById('learnPrompt');
                if (promptEl) promptEl.textContent = msg.text;
                updateHUDContextStyle();
                break;
            case 'learn_done':
                learnPhase = 0;
                const overlay = document.getElementById('learnOverlay');
                if (overlay) overlay.style.display = 'none';
                updateHUDContextStyle();
                break;
            case 'log': addLog(msg.text, msg.category); break;
            case 'run_ai': handleAiRequest(msg.prompt); break;
            case 'ports': updatePorts(msg.ports, msg.selected); break;
            case 'config': syncConfig(msg.config); break;
            case 'toast': showToast(msg.text, msg.level || 'info'); break;
        }
    });
}

// --- UI Logic ---
function setView(viewId) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const targetView = document.getElementById('view-' + viewId);
    if (targetView) targetView.classList.add('active');

    // Update nav item state (find by text or id if we add them)
    document.querySelectorAll('.nav-item').forEach(n => {
        if (n.textContent.toLowerCase().includes(viewId)) n.classList.add('active');
    });

    currentView = viewId;
}

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('miditypist-theme', newTheme);
}

function initTheme() {
    const savedTheme = localStorage.getItem('miditypist-theme');
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
        if (typeof updateHUDContextStyle === 'function') updateHUDContextStyle();
    };

    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(systemDark.matches ? 'dark' : 'light');
    }

    // Listen for system changes
    systemDark.addEventListener('change', e => {
        if (!localStorage.getItem('miditypist-theme')) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });
}

function updateMappings(list) {
    mappings = list;
    const grid = document.getElementById('mapGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (mappings.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                        <line x1="6" y1="8" x2="6" y2="16"></line>
                        <line x1="10" y1="8" x2="10" y2="16"></line>
                        <line x1="14" y1="8" x2="14" y2="16"></line>
                        <line x1="18" y1="8" x2="18" y2="16"></line>
                    </svg>
                </div>
                <h3>No automation profiles yet.</h3>
                <p>Start by capturing your first MIDI-to-Keyboard mapping.</p>
                <button class="btn btn-primary" onclick="startLearn()">Capture Mapping</button>
            </div>
        `;
        return;
    }
    mappings.forEach((m, i) => {
        // Search filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const searchable = [
                m.midi_type === 2 ? `chord ${(m.midi_chord || []).join(',')}` : `${m.midi_type === 1 ? 'cc' : 'note'} ${m.midi_num}`,
                `key ${m.key_vk}`,
                m.app_pattern || '',
                m.title_pattern || '',
                m.macro_text || '',
                m.ai_prompt || ''
            ].join(' ').toLowerCase();
            if (!searchable.includes(q)) return;
        }

        const card = document.createElement('div');
        card.className = 'mapping-card';
        card.onclick = () => openEditor(i);

        let target = 'HUD';
        if (m.midi_type === 0) target = 'Key ' + m.key_vk;
        else if (m.midi_type === 4) target = 'Macro';
        else if (m.midi_type === 5) target = 'AI';
        else if (m.midi_type === 2) target = 'Chord Key ' + m.key_vk;

        let gesture = m.gesture_id === 1 ? 'DBL' : (m.gesture_id === 2 ? 'HLD' : 'TAP');
        let titleLine = m.midi_type === 2 ? `Chord [${(m.midi_chord || []).join(',')}]` : `${m.midi_type === 1 ? 'CC' : 'Note'} ${m.midi_num}`;

        // Safe DOM construction (no innerHTML for user strings)
        const header = document.createElement('div');
        header.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start;';
        const titleSpan = document.createElement('span');
        titleSpan.style.cssText = 'font-weight:700; font-size:14px;';
        titleSpan.textContent = titleLine;
        const badgeDiv = document.createElement('div');
        badgeDiv.className = 'badge';
        badgeDiv.textContent = gesture;
        header.appendChild(titleSpan);
        header.appendChild(badgeDiv);

        const targetDiv = document.createElement('div');
        targetDiv.style.cssText = 'font-size:18px; font-weight:600; color:var(--accent);';
        targetDiv.textContent = target;

        const footer = document.createElement('div');
        footer.className = 'mapping-footer';
        footer.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-top:8px;';
        const badgeRow = document.createElement('div');
        badgeRow.className = 'badge-row';
        if (m.app_pattern) {
            const pill = document.createElement('span');
            pill.className = 'context-pill';
            pill.textContent = m.app_pattern;
            badgeRow.appendChild(pill);
        }
        const delBtn = document.createElement('button');
        delBtn.className = 'btn';
        delBtn.style.cssText = 'padding:4px; color:var(--error);';
        delBtn.innerHTML = `<svg style="width:14px; height:14px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        delBtn.onclick = (e) => { e.stopPropagation(); deleteMapping(i); };
        footer.appendChild(badgeRow);
        footer.appendChild(delBtn);

        card.appendChild(header);
        card.appendChild(targetDiv);
        card.appendChild(footer);
        // 3D Tilt Effect Logic
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            // Calculate tilt limits
            const rotateX = ((y - centerY) / centerY) * -5; // max 5 deg
            const rotateY = ((x - centerX) / centerX) * 5;  // max 5 deg

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        });
        grid.appendChild(card);
    });
}

function handleMidiEvent(type, num, val) {
    if (val > 0) {
        addLog(`${type} ${num} (Val: ${val})`, 'midi-active');
        const key = document.getElementById(`key-${num}`);
        if (key) key.classList.add('active');
    } else {
        const key = document.getElementById(`key-${num}`);
        if (key) key.classList.remove('active');
    }
}

// --- Piano Widget ---
function initPiano() {
    const dashboard = document.getElementById('pianoDashboard');
    if (!dashboard) return;
    dashboard.innerHTML = '';

    for (let i = 0; i < 128; i++) {
        const key = document.createElement('div');
        key.className = 'piano-key';
        key.id = `key-${i}`;

        // Simple black key logic
        const octave = i % 12;
        if ([1, 3, 6, 8, 10].includes(octave)) {
            key.classList.add('black');
        }

        dashboard.appendChild(key);
    }
}

function clearMappings() {
    if (confirm("Are you sure you want to clear all mappings? This cannot be undone.")) {
        send('clear_mappings');
    }
}

function addLog(text, cat) {
    const body = document.getElementById('logBody');
    if (!body) return;
    const div = document.createElement('div');

    let color = 'var(--text-secondary)';
    if (cat === 'error') color = 'var(--error)';
    if (cat === 'midi-active' || cat === 'mapping') color = 'var(--accent)';

    div.style.color = color;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;

    // Circular buffer: cap log entries
    while (body.children.length > MAX_LOG_ENTRIES) {
        body.removeChild(body.firstChild);
    }

    const countEl = document.getElementById('logCount');
    if (countEl) countEl.textContent = body.children.length;
}

function updateContext(app, title) {
    if (title === "Task Switching") return;
    if (app === "explorer.exe" && !title) return;

    const ctxEl = document.getElementById('activeContext');
    const appEl = document.getElementById('contextApp');
    const titleEl = document.getElementById('contextTitle');

    if (!appEl || !titleEl) return;

    // Check if it's actually changing to avoid unnecessary flashing
    if (appEl.textContent === (app || 'Desktop') && titleEl.textContent === (title || 'Untitled')) {
        return;
    }

    // 1. Start transition (fade out, scale down)
    if (ctxEl) ctxEl.classList.add('context-transition');

    // 2. Wait for fade out, swap text, fade back in
    setTimeout(() => {
        appEl.textContent = app || 'Desktop';
        titleEl.textContent = title || 'Untitled';

        if (ctxEl) {
            // Force a reflow so the browser registers the text change before removing the class
            void ctxEl.offsetWidth;
            ctxEl.classList.remove('context-transition');
        }
    }, 150); // Match this roughly to the CSS transition time

    addLog(`Context: ${app} | ${title}`, 'system');
}

function setStatus(text) {
    const dot = document.getElementById('statusDot');
    const hudBtn = document.getElementById('hudBtnConnect');
    const mainBtn = document.getElementById('btnConnect');

    const connected = text.includes('Connected') || text.includes('Ready');

    if (dot) {
        dot.style.background = connected ? 'var(--success)' : 'var(--error)';
        dot.style.boxShadow = connected ? '0 0 8px var(--success)' : '0 0 8px var(--error)';
    }

    if (hudBtn) {
        hudBtn.style.color = connected ? 'var(--success)' : 'var(--text-secondary)';
        hudBtn.style.background = connected ? 'color-mix(in srgb, var(--success) 20%, transparent)' : 'rgba(255,255,255,0.05)';
        hudBtn.classList.toggle('active', connected);
    }

    if (mainBtn) mainBtn.textContent = connected ? 'Disconnect' : 'Connect';

    addLog(`System Status: ${text}`, connected ? 'mapping' : 'system');
    showToast(text, connected ? 'success' : 'warning');
    updateHUDContextStyle();
}

function updatePorts(ports, selectedIdx) {
    const sel = document.getElementById('selectMidiPort');
    const hudSel = document.getElementById('hudMidiPort');
    if (!sel || !hudSel) return;

    const populate = (el) => {
        el.innerHTML = '';
        if (ports.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.selected = true;
            opt.textContent = 'No Devices';
            el.appendChild(opt);
            return;
        }
        ports.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p;
            if (i === selectedIdx) opt.selected = true;
            el.appendChild(opt);
        });
    };

    populate(sel);
    populate(hudSel);
}

function syncConfig(cfg) {
    const ids = {
        'checkReconnect': cfg.auto_reconnect,
        'checkAppSwitch': cfg.app_switching,
        'checkVelocity': cfg.velocity_zones,
        'checkTray': cfg.minimize_to_tray,
        'inputApiKey': cfg.ai_api_key || '',
        'inputAiGlobal': cfg.ai_global_prompt || ''
    };

    for (const [id, val] of Object.entries(ids)) {
        const el = document.getElementById(id);
        if (el) {
            if (el.type === 'checkbox') el.checked = val;
            else el.value = val;
        }
    }
}

// --- Editor Functions ---
let activeIdx = -1;
function openEditor(i) {
    activeIdx = i;
    const m = mappings[i];
    const modal = document.getElementById('modalEditor');
    if (!modal) return;
    modal.style.display = 'flex';

    document.getElementById('editMidiType').value = m.midi_type;
    document.getElementById('editKeyVk').value = m.key_vk;
    document.getElementById('editGestureId').value = m.gesture_id || 0;
    document.getElementById('editMacroText').value = m.macro_text || '';
    document.getElementById('editAiPrompt').value = m.ai_prompt || '';
    document.getElementById('editMidiChord').value = (m.midi_chord || []).join(', ');
    document.getElementById('editAppPattern').value = m.app_pattern || '';
    document.getElementById('editTitlePattern').value = m.title_pattern || '';
    toggleEditFields();
}

function closeEditor() {
    const modal = document.getElementById('modalEditor');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = 'fadeIn 0.2s ease';
        }, 200);
    }
}

function toggleEditFields() {
    const type = document.getElementById('editMidiType').value;
    const fields = {
        'editFieldMacro': type == 4,
        'editFieldAi': type == 5,
        'editFieldKey': (type != 4 && type != 5),
        'editFieldChord': type == 2
    };

    for (const [id, visible] of Object.entries(fields)) {
        const el = document.getElementById(id);
        if (el) el.style.display = visible ? 'block' : 'none';
    }
}

function saveEdit() {
    const chordStr = document.getElementById('editMidiChord').value;
    const chordArr = chordStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

    send('update_mapping', {
        index: activeIdx,
        midi_type: parseInt(document.getElementById('editMidiType').value),
        key_vk: parseInt(document.getElementById('editKeyVk').value),
        gesture_id: parseInt(document.getElementById('editGestureId').value),
        macro_text: document.getElementById('editMacroText').value,
        ai_prompt: document.getElementById('editAiPrompt').value,
        midi_chord: chordArr,
        app_pattern: document.getElementById('editAppPattern').value,
        title_pattern: document.getElementById('editTitlePattern').value
    });
    closeEditor();
}

// --- Actions ---
function startLearn() {
    learnPhase = 1;
    const prompt = document.getElementById('learnPrompt');
    if (prompt) prompt.textContent = "Waiting for MIDI...";
    const overlay = document.getElementById('learnOverlay');
    if (overlay) overlay.style.display = 'flex';
    send('start_learn');
}

function cancelLearn() {
    learnPhase = 0;
    send('cancel_learn');
    const overlay = document.getElementById('learnOverlay');
    if (overlay) overlay.style.display = 'none';
}

function addMapping() { send('add_mapping'); }
function deleteMapping(i) { send('delete_mapping', { index: i }); }
function loadProfile() { send('load_profile'); }
function saveProfile() { send('save_profile'); }
function clearLog() { const log = document.getElementById('logBody'); if (log) log.innerHTML = ''; }
function toggleConnect() {
    const hudPort = document.getElementById('hudMidiPort');
    const mainPort = document.getElementById('selectMidiPort');

    // Choose whichever is available, prioritizing HUD for quick actions
    const portEl = hudPort || mainPort;
    if (!portEl || portEl.value === "" || isNaN(parseInt(portEl.value))) {
        addLog("Please select a MIDI device first.", "error");
        return;
    }

    const port = parseInt(portEl.value);
    send('toggle_connect', { port });
}

function updateSettings() {
    send('update_config', {
        auto_reconnect: document.getElementById('checkReconnect').checked,
        app_switching: document.getElementById('checkAppSwitch').checked,
        minimize_to_tray: document.getElementById('checkTray').checked,
        velocity_zones: document.getElementById('checkVelocity').checked,
        ai_api_key: document.getElementById('inputApiKey').value,
        ai_global_prompt: document.getElementById('inputAiGlobal').value
    });
}

async function handleAiRequest(prompt) {
    const key = document.getElementById('inputApiKey').value;
    const global = document.getElementById('inputAiGlobal').value;
    if (!key) { addLog("AI Error: No API Key", "error"); return; }

    addLog("AI Thinking (Gemini Flash 1.5)...", "system");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        const fullPrompt = global.replace('{prompt}', prompt);
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: fullPrompt }]
                }]
            })
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
            const errorJson = await resp.json().catch(() => ({}));
            const errorMsg = errorJson.error?.message || `HTTP ${resp.status}`;
            throw new Error(errorMsg);
        }

        const json = await resp.json();
        const result = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
        addLog("AI Action: " + result, "system");
        send('simulate_text', { text: result });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            addLog("AI Failed: Request timed out (15s)", "error");
        } else {
            addLog("AI Failed: " + err.message, "error");
        }
    }
}

// --- macOS Style Settings Modal ---
function openSettings() {
    const modal = document.getElementById('modalSettings');
    if (modal) modal.style.display = 'flex';
}

function closeSettings() {
    const modal = document.getElementById('modalSettings');
    if (modal) {
        modal.style.animation = 'fadeOut 0.2s ease forwards';
        setTimeout(() => {
            modal.style.display = 'none';
            modal.style.animation = 'fadeIn 0.2s ease';
        }, 200);
    }
}

// --- Toast Notification System ---
function showToast(message, level = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed; bottom:24px; right:24px; z-index:9999; display:flex; flex-direction:column; gap:8px; pointer-events:none;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    const colors = { info: 'var(--accent)', success: 'var(--system-green)', error: 'var(--error)', warning: 'var(--system-yellow)' };
    const borderColor = colors[level] || colors.info;
    toast.style.cssText = `
        pointer-events:auto; background:rgba(30,30,30,0.9); backdrop-filter:blur(20px);
        border:1px solid ${borderColor}; border-left:3px solid ${borderColor};
        border-radius:10px; padding:12px 18px; color:var(--text-primary);
        font-size:13px; font-weight:500; box-shadow:0 8px 32px rgba(0,0,0,0.4);
        animation:toastIn 0.3s cubic-bezier(0.16,1,0.3,1); max-width:360px;
    `;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// --- Mapping Search ---
function filterMappings(query) {
    searchQuery = query;
    updateMappings(mappings);
}

// --- Keyboard Shortcut Capture ---
let capturingKey = false;
function startKeyCapture() {
    const btn = document.getElementById('btnCaptureKey');
    const input = document.getElementById('editKeyVk');
    if (!btn || !input) return;
    capturingKey = true;
    btn.textContent = 'Press any key...';
    btn.style.background = 'var(--accent)';
    btn.style.color = '#fff';

    const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        input.value = e.keyCode;
        capturingKey = false;
        btn.textContent = 'Capture Key';
        btn.style.background = '';
        btn.style.color = '';
        document.removeEventListener('keydown', handler, true);
        showToast(`Captured key: ${e.key} (VK ${e.keyCode})`, 'success');
    };
    document.addEventListener('keydown', handler, true);
}

// --- Window Dragging ---
document.addEventListener('mousedown', (e) => {
    // Check if clicked element or its parents have webkit-app-region: drag
    let el = e.target;
    while (el) {
        const style = window.getComputedStyle(el);
        if (style.webkitAppRegion === 'no-drag') {
            return; // Clicked on an interactive element inside a drag region
        }
        if (style.webkitAppRegion === 'drag') {
            // Prevent default to stop text selection, but allow interaction with inputs
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
            send('drag_window');
            return;
        }
        el = el.parentElement;
    }
});
// Initial Boot
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initPiano();
    send('init');

    // Sync HUD and Settings port selectors
    document.addEventListener('change', e => {
        if (e.target.id === 'hudMidiPort') {
            const sel = document.getElementById('selectMidiPort');
            if (sel) sel.value = e.target.value;
        } else if (e.target.id === 'selectMidiPort') {
            const hudSel = document.getElementById('hudMidiPort');
            if (hudSel) hudSel.value = e.target.value;
        }
    });
});
function updateHUDContextStyle() {
    const iconWrapper = document.querySelector('.hud-icon');
    if (!iconWrapper) return;

    let colorVar = 'var(--accent)';
    let bgPulse = false;
    const statusLabel = document.getElementById('statusLabel');
    const isDisconnected = statusLabel ? statusLabel.textContent.includes('Disconnected') : false;

    if (learnPhase > 0) {
        colorVar = 'var(--system-red)';
        bgPulse = true;
    } else if (isDisconnected) {
        colorVar = 'var(--system-yellow)';
    }

    // Apply color and glow
    iconWrapper.style.backgroundColor = `color-mix(in srgb, ${colorVar} 20%, transparent)`;
    if (bgPulse) {
        iconWrapper.classList.add('hud-pulse');
        iconWrapper.style.boxShadow = `0 0 16px ${colorVar}`;
    } else {
        iconWrapper.classList.remove('hud-pulse');
        iconWrapper.style.boxShadow = 'none';
    }
}
