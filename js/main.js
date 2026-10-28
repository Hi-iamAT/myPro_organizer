import { Store } from './store.js';
import { dayKeyStr } from './utils.js';
import { TodoModule } from './modules/todo.js';
import { NotesModule } from './modules/notes.js';
import { TimerModule } from './modules/timer.js';
import { BmiModule } from './modules/bmi.js';
import { WeatherModule } from './modules/weather.js';
import { CalendarModule } from './modules/calendar.js';
import { GoalsModule } from './modules/goals.js';

// Global App State
let currentTool = 'dashboard';
const tools = ['dashboard', 'todo', 'notes', 'calc', 'timer', 'bmi', 'weather', 'calendar', 'daily-goals'];

export function initApp() {
    // Initialize Modules (calendar also boots the prayer engine & FlowPrayer bridge)
    TimerModule.init();
    CalendarModule.init();
    GoalsModule.init();
    BmiModule.init();
    TodoModule.loadTodos();
    NotesModule.renderNotesList();

    // Expose utility functions for plain scripts (calc.js, enhance.js)
    window.showToast = showToastCompat;
    window.showWeatherError = (m) => WeatherModule.showWeatherError(m);

    // Attach to Window for HTML onclick handlers (NO-BREAK STRATEGY)
    window.switchTool = switchTool;
    window.toggleTheme = toggleTheme;
    window.exportData = exportData;
    window.handleImportFile = handleImportFile;
    window.closeImportModal = closeImportModal;
    window.applyImport = applyImport;

    window.toggleTodo = (i) => TodoModule.toggleTodo(i);
    window.deleteTodo = (i) => TodoModule.deleteTodo(i);
    window.openAddTask = () => TodoModule.openAddTask();
    window.openEditTask = (i) => TodoModule.openEditTask(i);
    window.saveTodo = () => TodoModule.saveTodo();
    window.closeTaskEditor = () => TodoModule.closeTaskEditor();
    window.setPriority = (p, b) => TodoModule.setPriority(p, b);
    window.setSegment = (s, b) => TodoModule.setSegment(s, b);
    window.toggleDoneTasksPanel = () => TodoModule.toggleDoneTasksPanel();
    window.clearCompleted = () => TodoModule.clearCompleted();
    window.loadTodos = () => TodoModule.loadTodos();

    window.addNewNote = () => NotesModule.addNewNote();
    window.openNote = (id) => NotesModule.openNote(id);
    window.closeNoteMobile = () => NotesModule.closeNoteMobile();
    window.updateActiveNoteTitle = (v) => NotesModule.updateActiveNoteTitle(v);
    window.updateActiveNoteContent = (v) => NotesModule.updateActiveNoteContent(v);
    window.changeActiveNoteTheme = (v) => NotesModule.changeActiveNoteTheme(v);
    window.deleteActiveNote = () => NotesModule.deleteActiveNote();
    window.execNoteCmd = (c, v) => NotesModule.execNoteCmd(c, v);
    window.renderNotesList = () => NotesModule.renderNotesList();

    window.startTimer = () => TimerModule.startTimer();
    window.pauseTimer = () => TimerModule.pauseTimer();
    window.resetTimer = () => TimerModule.resetTimer();
    window.setTimerMode = (m, l, b) => TimerModule.setTimerMode(m, l, b);
    window.openCustomTimerModal = (b) => TimerModule.openCustomTimerModal(b);
    window.closeCustomTimerModal = () => TimerModule.closeCustomTimerModal();
    window.applyCustomTimer = () => TimerModule.applyCustomTimer();
    window.toggleTimerNotifications = (e) => TimerModule.toggleTimerNotifications(e);
    window.toggleIntervalAlerts = (v) => TimerModule.toggleIntervalAlerts(v);
    window.setIntervalChoice = (m, b) => TimerModule.setIntervalChoice(m, b);
    window.addReminder = (e) => TimerModule.addReminder(e);
    window.deleteReminder = (i) => TimerModule.deleteReminder(i);

    window.calcBMI = () => BmiModule.calcBMI();
    window.setBmiHeightUnit = (u, b) => BmiModule.setBmiHeightUnit(u, b);
    window.setBmiWeightUnit = (u, b) => BmiModule.setBmiWeightUnit(u, b);
    window.resetBMI = () => BmiModule.resetBMI();
    window.convConvert = () => BmiModule.convConvert();
    window.convSwap = () => BmiModule.convSwap();
    window.convRefreshRates = () => BmiModule.convRefreshRates();

    window.fetchWeather = () => WeatherModule.fetchWeather();

    window.prevCalendarMonth = () => CalendarModule.prevCalendarMonth();
    window.nextCalendarMonth = () => CalendarModule.nextCalendarMonth();
    window.jumpToToday = () => CalendarModule.jumpToToday();
    window.changeCalendarMonthYear = () => CalendarModule.changeCalendarMonthYear();
    window.prayerSetMethod = (v) => CalendarModule.prayerSetMethod(v);
    window.prayerRefresh = () => CalendarModule.prayerRefresh();

    window.prevDgMonth = () => GoalsModule.prevDgMonth();
    window.nextDgMonth = () => GoalsModule.nextDgMonth();
    window.openDgDay = (d) => GoalsModule.openDgDay(d);
    window.closeDgDay = () => GoalsModule.closeDgDay();
    window.addDgGoal = () => GoalsModule.addDgGoal();
    window.toggleDgGoal = (id) => GoalsModule.toggleDgGoal(id);
    window.deleteDgGoal = (id) => GoalsModule.deleteDgGoal(id);

    // Expose live state getters for enhance.js (IIFE) which reads these directly
    Object.defineProperties(window, {
        todos:        { get: () => TodoModule.getTodos(),      configurable: true },
        notesArr:     { get: () => NotesModule.getNotes(),     configurable: true },
        activeNoteId: { get: () => NotesModule.getActiveId(),  configurable: true },
        dgGoals:      { get: () => GoalsModule.getAllGoals(),  configurable: true },
        isRunning:    { get: () => TimerModule.isRunning(),    configurable: true },
        currentTool:  { get: () => currentTool,                configurable: true }, // used by calc.js / enhance.js keyboard guards
    });

    setupClock();
    setupFooter();
    setupThemeIcons();
    setupSwipes();
}

// compat shim: plain scripts (calc/enhance) call showToast(...) directly
function showToastCompat(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.className = 'toast', 2500);
}

function setupClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;
    const update = () => {
        clockEl.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    };
    setInterval(update, 1000);
    update();
}

function setupFooter() {
    const yr = document.getElementById('footerYear');
    if (yr) yr.textContent = new Date().getFullYear();
}

// Sync the moon/sun icons with the theme the boot snippet applied
// (index.html toggles via onclick="toggleTheme()" — do NOT bind a second handler).
function setupThemeIcons() {
    const dark = document.body.classList.contains('dark-mode');
    const moon = document.querySelector('.icon-moon');
    const sun = document.querySelector('.icon-sun');
    if (moon) moon.style.display = dark ? 'none' : 'block';
    if (sun) sun.style.display = dark ? 'block' : 'none';
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const dark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    const moon = document.querySelector('.icon-moon');
    const sun = document.querySelector('.icon-sun');
    if (moon) moon.style.display = dark ? 'none' : 'block';
    if (sun) sun.style.display = dark ? 'block' : 'none';
}

function switchTool(tool, btn) {
    if (currentTool === tool) return;
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('panel-' + tool);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
    currentTool = tool;
    if (tool === 'weather' && !WeatherModule.weatherFetched) WeatherModule.fetchWeather();
    if (window.FlowEnh) window.FlowEnh.onToolChange(tool);
}

/* ─── EXPORT (full format: todos · notes · daily goals · focus log) ─── */
function exportData() {
    let focusLog = {};
    try { focusLog = JSON.parse(localStorage.getItem('flowdesk_focus_log') || '{}'); } catch (_) { }
    const blob = new Blob(
        [JSON.stringify({
            todos: TodoModule.getTodos(),
            notes: NotesModule.getNotes(),
            dgGoals: GoalsModule.getAllGoals() || {},
            focusLog, exported: new Date().toISOString()
        }, null, 2)],
        { type: 'application/json' }
    );
    const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: `flowdesk-${dayKeyStr(new Date())}.json`
    });
    a.click();
    URL.revokeObjectURL(a.href);
    window.showToast('Data exported!', 'success');
}

/* ─── IMPORT (merge / replace, tolerant of older backups) ─────────── */
let _pendingImport = null;

function handleImportFile(event) {
    const file = event.target.files[0];
    event.target.value = ''; // reset so the same file can be re-imported
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        let parsed;
        try {
            parsed = JSON.parse(e.target.result);
        } catch {
            window.showToast('Invalid JSON file.', 'error');
            return;
        }
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            window.showToast('Unrecognised file format.', 'error');
            return;
        }
        _pendingImport = parsed;
        showImportModal(parsed);
    };
    reader.readAsText(file);
}

function showImportModal(data) {
    const todoCount = Array.isArray(data.todos) ? data.todos.length : 0;
    const noteCount = Array.isArray(data.notes) ? data.notes.length : 0;
    const dgCount = (data.dgGoals && typeof data.dgGoals === 'object') ? Object.keys(data.dgGoals).length : 0;
    const exportedOn = data.exported ? new Date(data.exported).toLocaleString() : 'Unknown';

    let modal = document.getElementById('importModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'importModal';
        modal.style.cssText = `
            position:fixed; inset:0; z-index:9999;
            display:flex; align-items:center; justify-content:center;
            background:rgba(0,0,0,0.55); backdrop-filter:blur(6px);
        `;
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div style="
            background:var(--surface-2,var(--surface));
            border:1px solid var(--border);
            border-radius:16px;
            padding:28px 32px;
            width:min(440px,90vw);
            box-shadow:0 24px 64px rgba(0,0,0,0.45);
        ">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">
                <svg viewBox="0 0 24 24" fill="none" style="width:26px;height:26px;color:var(--brand);flex-shrink:0">
                    <path d="M12 16V7M9 10l3-3 3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5 17v1a2 2 0 002 2h10a2 2 0 002-2v-1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:var(--text)">Import Data</h2>
            </div>

            <p style="margin:0 0 14px;font-size:0.82rem;color:var(--text-muted)">Exported on: <strong>${exportedOn}</strong></p>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;">
                ${[
                    ['📝 To-Dos', todoCount],
                    ['🗒️ Notes', noteCount],
                    ['🎯 Daily Goals', dgCount + ' days'],
                ].map(([label, val]) => `
                    <div style="background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:10px 14px;">
                        <div style="font-size:0.75rem;color:var(--text-muted);margin-bottom:3px">${label}</div>
                        <div style="font-size:1.1rem;font-weight:700;color:var(--text)">${val}</div>
                    </div>
                `).join('')}
            </div>

            <p style="margin:0 0 20px;font-size:0.83rem;color:var(--text-muted);
                background:rgba(255,165,0,0.1);border:1px solid rgba(255,165,0,0.3);
                border-radius:8px;padding:10px 12px;">
                ⚠️ <strong>Merge</strong> will add imported items alongside your existing data.<br>
                <strong>Replace</strong> will overwrite everything with the imported file.
            </p>

            <div style="display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                <button onclick="closeImportModal()" style="
                    padding:9px 18px;border-radius:8px;border:1px solid var(--border);
                    background:transparent;color:var(--text);cursor:pointer;font-size:0.88rem;
                ">Cancel</button>
                <button onclick="applyImport('replace')" style="
                    padding:9px 18px;border-radius:8px;border:none;
                    background:var(--danger,#e74c3c);color:#fff;cursor:pointer;font-size:0.88rem;font-weight:600;
                ">Replace All</button>
                <button onclick="applyImport('merge')" style="
                    padding:9px 18px;border-radius:8px;border:none;
                    background:var(--brand);color:#fff;cursor:pointer;font-size:0.88rem;font-weight:600;
                ">Merge</button>
            </div>
        </div>
    `;
    modal.style.display = 'flex';
}

function closeImportModal() {
    const modal = document.getElementById('importModal');
    if (modal) modal.style.display = 'none';
    _pendingImport = null;
}

function applyImport(mode) {
    if (!_pendingImport) return;
    const data = _pendingImport;

    if (Array.isArray(data.todos)) TodoModule.importTodos(data.todos, mode);
    if (Array.isArray(data.notes)) NotesModule.importNotes(data.notes, mode);

    if (data.dgGoals && typeof data.dgGoals === 'object') GoalsModule.importGoals(data.dgGoals, mode);

    // Focus log (optional so older backups still import)
    if (data.focusLog && typeof data.focusLog === 'object' && !Array.isArray(data.focusLog)) {
        let log = {};
        try { log = JSON.parse(localStorage.getItem('flowdesk_focus_log')) || {}; } catch (_) { }
        if (mode === 'replace') log = {};
        Object.entries(data.focusLog).forEach(([d, v]) => {
            if (!v || typeof v !== 'object') return;
            const cur = log[d] || { sessions: 0, minutes: 0 };
            log[d] = mode === 'replace' ? { sessions: +v.sessions || 0, minutes: +v.minutes || 0 }
                : { sessions: Math.max(cur.sessions, +v.sessions || 0), minutes: Math.max(cur.minutes, +v.minutes || 0) };
        });
        localStorage.setItem('flowdesk_focus_log', JSON.stringify(log));
    }

    closeImportModal();
    TodoModule.loadTodos();
    NotesModule.renderNotesList();
    if (window.FlowEnh) window.FlowEnh.refreshDashboard();
    const modeLabel = mode === 'replace' ? 'replaced' : 'merged';
    window.showToast(`Data ${modeLabel} successfully! ✓`, 'success');
}

function setupSwipes() {
    let touchStartX = 0;
    let touchStartY = 0;
    document.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    document.addEventListener('touchend', e => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) < 60 || Math.abs(diffY) > Math.abs(diffX) * 0.8) return;
        let idx = tools.indexOf(currentTool);
        if (diffX > 0 && idx > 0) {
            const t = tools[idx - 1];
            switchTool(t, document.getElementById('nav-' + t));
        } else if (diffX < 0 && idx < tools.length - 1) {
            const t = tools[idx + 1];
            switchTool(t, document.getElementById('nav-' + t));
        }
    }, { passive: true });
}
