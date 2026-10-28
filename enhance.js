/* FlowDesk v3 enhancements: dashboard, command palette & shortcuts, todo search/filters,
 * note pinning, weather forecast, focus statistics, BMI healthy-weight range.
 * Additive only: existing localStorage keys/formats are unchanged. New key: 'flowdesk_focus_log'
 *   { "YYYY-MM-DD": { sessions: number, minutes: number } }
 * Notes gain an optional boolean `pinned` field (older data simply lacks it).
 */
(function () {
    'use strict';
    const $ = id => document.getElementById(id);
    // The active tool lives in main.html's script scope or, in the modular app,
    // on window via a getter from main.js. (Do NOT name this `currentTool` —
    // that would shadow the global and always read as undefined.)
    const getTool = () => (typeof currentTool !== 'undefined') ? currentTool : window.currentTool;
    const FOCUS_KEY = 'flowdesk_focus_log';
    const pad = n => String(n).padStart(2, '0');
    const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    };
    const readJSON = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (_) { return def; } };

    const TOOL_META = {
        dashboard: { label: 'Dashboard', icon: '◫' },
        todo: { label: 'To-Do', icon: '☑' },
        notes: { label: 'Notes', icon: '✎' },
        calc: { label: 'Calculator', icon: '∑' },
        timer: { label: 'Focus Timer', icon: '◔' },
        bmi: { label: 'BMI', icon: '⚖' },
        weather: { label: 'Weather', icon: '☁' },
        calendar: { label: 'Calendar', icon: '▦' },
        'daily-goals': { label: 'Daily Goals', icon: '◎' }
    };
    const go = t => switchTool(t, $('nav-' + t));

    // ── Focus log ────────────────────────────────────────────
    function focusLog() { const l = readJSON(FOCUS_KEY, {}); return (l && typeof l === 'object') ? l : {}; }
    function logFocus(minutes) {
        const log = focusLog(), k = dayKey(new Date());
        const cur = log[k] || { sessions: 0, minutes: 0 };
        log[k] = { sessions: cur.sessions + 1, minutes: cur.minutes + (minutes || 0) };
        localStorage.setItem(FOCUS_KEY, JSON.stringify(log));
        renderFocusStats();
    }
    function focusSummary() {
        const log = focusLog(), today = new Date();
        let weekMin = 0, weekSes = 0, streak = 0;
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const v = log[dayKey(d)] || { sessions: 0, minutes: 0 };
            weekMin += v.minutes; weekSes += v.sessions;
            days.push({ d, ...v });
        }
        for (let i = 0; ; i++) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const v = log[dayKey(d)];
            if (v && v.sessions > 0) streak++;
            else if (i === 0) continue; // today not done yet doesn't break the streak
            else break;
            if (i > 3650) break;
        }
        const t = log[dayKey(today)] || { sessions: 0, minutes: 0 };
        return { today: t, weekMin, weekSes, streak, days };
    }
    function renderFocusStats() {
        const host = $('focusStats');
        if (!host) return;
        const s = focusSummary();
        host.textContent = '';
        [['Today', `${s.today.sessions} · ${s.today.minutes}m`], ['7 days', `${s.weekSes} · ${s.weekMin}m`], ['Streak', `${s.streak}d`]]
            .forEach(([l, v]) => { const c = el('div', 'fs-item'); c.append(el('span', 'fs-val', v), el('span', 'fs-lbl', l)); host.appendChild(c); });
        const bars = el('div', 'fs-bars');
        const max = Math.max(1, ...s.days.map(d => d.minutes));
        s.days.forEach(d => {
            const b = el('div', 'fs-bar');
            b.style.setProperty('--h', Math.round((d.minutes / max) * 100));
            b.title = `${d.d.toLocaleDateString(undefined, { weekday: 'short' })}: ${d.minutes} min`;
            b.appendChild(el('span', '', d.d.toLocaleDateString(undefined, { weekday: 'narrow' })));
            bars.appendChild(b);
        });
        host.appendChild(bars);
    }

    // ── Todo filters ─────────────────────────────────────────
    let todoFilter = 'all';
    function todoMatches(t) {
        const q = ($('todoSearch')?.value || '').trim().toLowerCase();
        if (q && !((t.text || '').toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) ||
            (t.segment || '').toLowerCase().includes(q))) return false;
        const now = new Date();
        const due = t.date ? new Date(t.date) : null;
        switch (todoFilter) {
            case 'today': return !!due && dayKey(due) === dayKey(now);
            case 'week': { if (!due) return false; const lim = new Date(now); lim.setDate(lim.getDate() + 7); return due <= lim; }
            case 'high': return (t.priority || 'low') === 'high';
            case 'nodate': return !due;
            default: return true;
        }
    }
    function setTodoFilter(f, btn) {
        todoFilter = f;
        document.querySelectorAll('#todoToolbar .filter-chip').forEach(c => c.classList.toggle('active', c === btn));
        loadTodos();
    }

    // ── Notes pin ────────────────────────────────────────────
    function injectPinButton() {
        const ctr = document.querySelector('#activeNoteEditor .note-editor-controls');
        if (!ctr || $('notePinBtn')) return;
        const b = el('button', 'pin-btn', '📌');
        b.id = 'notePinBtn'; b.type = 'button';
        b.title = 'Pin / unpin note'; b.setAttribute('aria-label', 'Pin note'); b.setAttribute('aria-pressed', 'false');
        b.addEventListener('click', () => {
            const notes = window.notesArr || [];
            const n = notes.find(x => x.id === window.activeNoteId);
            if (!n) return;
            n.pinned = !n.pinned;
            localStorage.setItem('advancedNotes', JSON.stringify(notes));
            if (window.renderNotesList) renderNotesList();
            syncPin();
            showToast(n.pinned ? 'Note pinned' : 'Note unpinned', 'info');
        });
        ctr.insertBefore(b, ctr.firstChild);
    }
    function syncPin() {
        const b = $('notePinBtn'); if (!b) return;
        const notes = window.notesArr || [];
        const n = notes.find(x => x.id === window.activeNoteId);
        const on = !!(n && n.pinned);
        b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
    }

    // ── Weather extras ───────────────────────────────────────
    function renderWeatherExtra(data, WMO, city) {
        const host = $('weatherExtra');
        if (!host) return;
        host.textContent = '';
        const d = data && data.daily;
        if (!d || !Array.isArray(d.time)) return;
        const fmtT = iso => iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '--';
        const sun = el('div', 'wx-sun');
        sun.append(el('span', '', `🌅 Sunrise ${fmtT(d.sunrise?.[0])}`), el('span', '', `🌇 Sunset ${fmtT(d.sunset?.[0])}`));
        if (d.temperature_2m_max) sun.append(el('span', '', `↑ ${Math.round(d.temperature_2m_max[0])}° ↓ ${Math.round(d.temperature_2m_min[0])}°`));
        host.appendChild(sun);
        const row = el('div', 'wx-forecast');
        d.time.slice(1, 6).forEach((t, i) => {
            const j = i + 1;
            const w = WMO[d.weather_code?.[j]] || { label: '—', icon: '🌡️' };
            const c = el('div', 'wx-day');
            c.title = w.label;
            c.append(
                el('span', 'wx-dname', new Date(t + 'T00:00').toLocaleDateString(undefined, { weekday: 'short' })),
                el('span', 'wx-icon', w.icon),
                el('span', 'wx-temp', `${Math.round(d.temperature_2m_max[j])}° / ${Math.round(d.temperature_2m_min[j])}°`),
                el('span', 'wx-rain', `💧 ${d.precipitation_probability_max?.[j] ?? '--'}%`)
            );
            row.appendChild(c);
        });
        host.appendChild(row);
        try {
            sessionStorage.setItem('flowdesk_wx_snapshot', JSON.stringify({
                city, temp: Math.round(data.current.temperature_2m), icon: (WMO[data.current.weather_code] || {}).icon || '🌡️',
                label: (WMO[data.current.weather_code] || {}).label || ''
            }));
        } catch (_) { }
    }

    // ── BMI extra ────────────────────────────────────────────
    function bmiExtra(bmi) {
        const desc = $('bmiClassDesc');
        if (!desc) return;
        let x = $('bmiHealthy');
        if (!x) { x = el('p', 'bmi-healthy'); x.id = 'bmiHealthy'; desc.after(x); }
        let cm = 0;
        try {
            const cmWrap = document.getElementById('bmiHeightCmWrap');
            if (cmWrap && cmWrap.style.display !== 'none') {
                cm = parseFloat(document.getElementById('bmiHeight')?.value) || 0;
            } else {
                const ft = parseFloat(document.getElementById('bmiHeightFt')?.value) || 0;
                const inch = parseFloat(document.getElementById('bmiHeightIn')?.value) || 0;
                cm = (ft * 30.48) + (inch * 2.54);
            }
        } catch (_) { }
        if (!cm || !isFinite(cm)) { x.textContent = ''; return; }
        const m = cm / 100, lo = 18.5 * m * m, hi = 24.9 * m * m;
        const lbs = document.getElementById('unitLb')?.classList.contains('active');
        const f = v => lbs ? `${Math.round(v * 2.20462)} lb` : `${v.toFixed(1)} kg`;
        x.textContent = `Healthy weight for your height: ${f(lo)} – ${f(hi)}`;
    }

    // ── Dashboard ────────────────────────────────────────────
    function card(title, tool, cls = '') {
        const c = el('section', 'dash-card ' + cls);
        const h = el('header', 'dash-card-head');
        h.appendChild(el('h2', '', title));
        if (tool) {
            const b = el('button', 'dash-link', 'Open →'); b.type = 'button';
            b.addEventListener('click', () => go(tool));
            h.appendChild(b);
        }
        c.appendChild(h);
        return c;
    }
    function stat(value, label, accent) {
        const s = el('div', 'dash-stat');
        if (accent) s.style.setProperty('--acc', accent);
        s.append(el('span', 'dash-stat-val', String(value)), el('span', 'dash-stat-lbl', label));
        return s;
    }
    function ring(pct, label) {
        const w = el('div', 'dash-ring');
        w.style.setProperty('--p', pct);
        w.setAttribute('role', 'img'); w.setAttribute('aria-label', `${label}: ${pct}%`);
        w.append(el('span', 'dash-ring-val', pct + '%'));
        return w;
    }
    function refreshDashboard() {
        const body = $('dashBody');
        if (!body) return;
        const now = new Date(), todayK = dayKey(now);
        const h = now.getHours();
        $('dashGreeting').textContent = (h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening') + ' 👋';
        $('dashDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
        body.textContent = '';

        // KPI strip
        const active = todos.filter(t => !t.completed);
        const done = todos.filter(t => t.completed);
        const dueToday = active.filter(t => t.date && dayKey(new Date(t.date)) === todayK);
        const fs = focusSummary();
        const goals = (dgGoals && dgGoals[todayK]) || [];
        const gDone = goals.filter(g => g.completed).length;
        const gPct = goals.length ? Math.round(gDone / goals.length * 100) : 0;
        const kpi = el('div', 'dash-kpis');
        kpi.append(
            stat(active.length, 'Open tasks', '#6C63FF'),
            stat(dueToday.length, 'Due today', '#f59e0b'),
            stat(`${gDone}/${goals.length}`, 'Goals today', '#10b981'),
            stat(`${fs.today.minutes}m`, 'Focus today', '#22d3ee'),
            stat(notesArr.length, 'Notes', '#a78bfa')
        );
        body.appendChild(kpi);

        const grid = el('div', 'dash-grid');

        // Upcoming tasks
        const tc = card('Up next', 'todo', 'span-2');
        const up = active.slice().sort((a, b) => (a.date ? new Date(a.date) : Infinity) - (b.date ? new Date(b.date) : Infinity)).slice(0, 5);
        const ul = el('ul', 'dash-list');
        if (!up.length) ul.appendChild(el('li', 'dash-empty', 'All clear — no open tasks 🎉'));
        up.forEach(t => {
            const li = el('li', 'dash-item');
            const dot = el('span', 'dash-dot'); dot.dataset.p = t.priority || 'low';
            const txt = el('span', 'dash-item-text', t.text || '(untitled)');
            const when = el('span', 'dash-item-meta', t.date ? new Date(t.date).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'No date');
            li.append(dot, txt, when);
            ul.appendChild(li);
        });
        tc.appendChild(ul);
        const prog = el('div', 'dash-progress');
        const total = todos.length, pct = total ? Math.round(done.length / total * 100) : 0;
        const bar = el('div', 'dash-bar'); bar.style.setProperty('--w', pct + '%');
        prog.append(el('span', '', `${done.length} of ${total} tasks completed`), bar);
        tc.appendChild(prog);
        grid.appendChild(tc);

        // Goals
        const gc = card('Today\'s goals', 'daily-goals');
        const gw = el('div', 'dash-ring-wrap');
        gw.append(ring(gPct, 'Goals completed'));
        const gl = el('div', 'dash-ring-side');
        gl.append(el('strong', '', goals.length ? `${gDone} of ${goals.length} done` : 'No goals set'),
            el('span', '', $('dgCurrentStreak') ? `Streak: ${$('dgCurrentStreak').textContent}` : ''));
        gw.appendChild(gl); gc.appendChild(gw);
        grid.appendChild(gc);

        // Focus
        const fc = card('Focus', 'timer');
        const fw = el('div', 'dash-mini-stats');
        fw.append(stat(fs.today.sessions, 'Sessions today'), stat(`${fs.weekMin}m`, 'This week'), stat(`${fs.streak}d`, 'Streak'));
        fc.appendChild(fw);
        const spark = el('div', 'fs-bars');
        const max = Math.max(1, ...fs.days.map(d => d.minutes));
        fs.days.forEach(d => { const b = el('div', 'fs-bar'); b.style.setProperty('--h', Math.round(d.minutes / max * 100)); b.appendChild(el('span', '', d.d.toLocaleDateString(undefined, { weekday: 'narrow' }))); spark.appendChild(b); });
        fc.appendChild(spark);
        grid.appendChild(fc);

        // Next Prayer (live; powered by the calendar panel's prayer engine via window.FlowPrayer)
        // Whole card opens the Live Calendar & prayer side, not just the "Open →" link.
        const pc = card('Next Prayer', 'calendar');
        const hp = (window.FlowPrayer && FlowPrayer.ready()) ? FlowPrayer.next() : null;
        pc.classList.add('dash-card-clickable');
        pc.addEventListener('click', e => {
            if (e.target.closest('button')) return;
            go('calendar');
            setTimeout(() => {
                const p = document.getElementById('prayerTimesSection');
                if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 90);
        });
        pc.title = 'Open Live Calendar & prayer times';
        if (hp) {
            const pw = el('div', 'dash-weather');
            const side = el('div', 'dash-ring-side');
            const sub = el('span', 'dash-prayer-sub');
            sub.append(`at ${hp.at} · `, Object.assign(el('span', '', hp.countdown), { id: 'dashPrayerCountdown' }));
            side.append(el('strong', '', hp.name), sub);
            pw.append(el('span', 'dash-wx-icon', hp.icon), side);
            pc.appendChild(pw);
        } else {
            pc.appendChild(el('div', 'dash-empty', 'Loading prayer times…'));
        }
        grid.appendChild(pc);

        // Weather snapshot
        const wc = card('Weather', 'weather');
        let snap = null; try { snap = JSON.parse(sessionStorage.getItem('flowdesk_wx_snapshot')); } catch (_) { }
        if (snap) {
            const w = el('div', 'dash-weather');
            w.append(el('span', 'dash-wx-icon', snap.icon), el('span', 'dash-wx-temp', `${snap.temp}°C`));
            const side = el('div', 'dash-ring-side'); side.append(el('strong', '', snap.city || ''), el('span', '', snap.label || ''));
            w.appendChild(side); wc.appendChild(w);
        } else {
            const b = el('button', 'ghost-btn', 'Load local weather'); b.type = 'button';
            b.addEventListener('click', () => go('weather'));
            wc.appendChild(b);
        }
        grid.appendChild(wc);

        // Recent notes
        const nc = card('Notes', 'notes');
        const nl = el('ul', 'dash-list');
        const notes = notesArr.slice().sort((a, b) => (!!b.pinned - !!a.pinned) || (new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))).slice(0, 4);
        if (!notes.length) nl.appendChild(el('li', 'dash-empty', 'No notes yet'));
        notes.forEach(n => {
            const li = el('li', 'dash-item clickable');
            li.tabIndex = 0;
            li.append(el('span', 'dash-item-text', (n.pinned ? '📌 ' : '') + (n.title || 'Untitled Note')));
            const open = () => { go('notes'); if (activeNoteId !== n.id) openNote(n.id); };
            li.addEventListener('click', open);
            li.addEventListener('keydown', e => { if (e.key === 'Enter') open(); });
            nl.appendChild(li);
        });
        nc.appendChild(nl);
        grid.appendChild(nc);

        // Quick actions
        const qc = card('Quick actions', null);
        const qa = el('div', 'dash-actions');
        [['+ New task', () => { go('todo'); openAddTask(); }], ['+ New note', () => { go('notes'); addNewNote(); }],
         ['▶ Start focus', () => { go('timer'); if (!isRunning) startTimer(); }], ['∑ Calculator', () => go('calc')],
         ['⌘ Commands', () => openPalette()]].forEach(([l, f]) => {
            const b = el('button', 'dash-action', l); b.type = 'button'; b.addEventListener('click', f); qa.appendChild(b);
        });
        qc.appendChild(qa);
        grid.appendChild(qc);

        body.appendChild(grid);
    }

    // ── Command palette ─────────────────────────────────────
    let palette, palInput, palList, palItems = [], palSel = 0, lastFocus = null;
    function commands() {
        const list = Object.entries(TOOL_META).map(([k, m], i) => ({ label: `Go to ${m.label}`, hint: `Alt+${i + 1}`, icon: m.icon, run: () => go(k) }));
        return list.concat([
            { label: 'New task', icon: '+', hint: 'N', run: () => { go('todo'); openAddTask(); } },
            { label: 'New note', icon: '+', run: () => { go('notes'); addNewNote(); } },
            { label: 'Start / pause focus timer', icon: '▶', run: () => { go('timer'); isRunning ? pauseTimer() : startTimer(); } },
            { label: 'Reset focus timer', icon: '↺', run: () => { go('timer'); resetTimer(); } },
            { label: 'Calendar: jump to today', icon: '▦', run: () => { go('calendar'); jumpToToday(); } },
            { label: 'Refresh weather', icon: '☁', run: () => { go('weather'); fetchWeather(); } },
            { label: 'Toggle dark / light theme', icon: '◐', run: () => toggleTheme() },
            { label: 'Export data (JSON backup)', icon: '⇩', run: () => exportData() },
            { label: 'Import data…', icon: '⇧', run: () => $('importFileInput').click() },
            { label: 'Keyboard shortcuts', icon: '⌨', hint: '?', run: () => showShortcuts() }
        ]);
    }
    function buildPalette() {
        palette = el('div', 'cmdk-overlay');
        palette.id = 'cmdPalette';
        palette.setAttribute('role', 'dialog'); palette.setAttribute('aria-modal', 'true'); palette.setAttribute('aria-label', 'Command palette');
        const box = el('div', 'cmdk-box');
        palInput = el('input', 'cmdk-input');
        palInput.type = 'text'; palInput.placeholder = 'Type a command or tool…'; palInput.setAttribute('aria-label', 'Command');
        palInput.setAttribute('role', 'combobox'); palInput.setAttribute('aria-controls', 'cmdkList'); palInput.setAttribute('aria-expanded', 'true');
        palList = el('ul', 'cmdk-list'); palList.id = 'cmdkList'; palList.setAttribute('role', 'listbox');
        const foot = el('div', 'cmdk-foot', '↑↓ navigate · Enter run · Esc close');
        box.append(palInput, palList, foot);
        palette.appendChild(box);
        palette.addEventListener('mousedown', e => { if (e.target === palette) closePalette(); });
        palInput.addEventListener('input', () => { palSel = 0; renderPalette(); });
        palInput.addEventListener('keydown', e => {
            if (e.key === 'ArrowDown') { palSel = Math.min(palItems.length - 1, palSel + 1); renderPalette(); e.preventDefault(); }
            else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); renderPalette(); e.preventDefault(); }
            else if (e.key === 'Enter') { e.preventDefault(); runPal(palSel); }
            else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
            else if (e.key === 'Tab') e.preventDefault();
        });
        document.body.appendChild(palette);
    }
    function fuzzy(q, s) {
        q = q.toLowerCase(); s = s.toLowerCase();
        if (!q) return true;
        let i = 0; for (const ch of s) if (ch === q[i]) i++;
        return i === q.length;
    }
    function renderPalette() {
        const q = palInput.value.trim();
        palItems = commands().filter(c => fuzzy(q, c.label));
        palList.textContent = '';
        if (!palItems.length) palList.appendChild(el('li', 'cmdk-empty', 'No matching commands'));
        palItems.forEach((c, i) => {
            const li = el('li', 'cmdk-item' + (i === palSel ? ' sel' : ''));
            li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === palSel)); li.id = 'cmdk-' + i;
            li.append(el('span', 'cmdk-icon', c.icon), el('span', 'cmdk-label', c.label));
            if (c.hint) li.appendChild(el('span', 'kbd', c.hint));
            li.addEventListener('mousemove', () => { if (palSel !== i) { palSel = i; renderPalette(); } });
            li.addEventListener('click', () => runPal(i));
            palList.appendChild(li);
        });
        palInput.setAttribute('aria-activedescendant', palItems.length ? 'cmdk-' + palSel : '');
        palList.querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
    }
    function openPalette() {
        if (!palette) buildPalette();
        lastFocus = document.activeElement;
        palette.classList.add('open');
        palInput.value = ''; palSel = 0; renderPalette();
        palInput.focus();
    }
    function closePalette() {
        if (!palette) return;
        palette.classList.remove('open');
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function runPal(i) { const c = palItems[i]; if (!c) return; closePalette(); c.run(); }
    function showShortcuts() {
        showToast('Ctrl+K commands · Alt+1–9 tools · / search · N new task (To-Do) · T theme', 'info');
    }

    // ── Global shortcuts ─────────────────────────────────────
    document.addEventListener('keydown', e => {
        const a = document.activeElement;
        const typing = a && a.matches('input, textarea, select, [contenteditable="true"]');
        if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            palette && palette.classList.contains('open') ? closePalette() : openPalette();
            return;
        }
        if (palette && palette.classList.contains('open')) return;
        if (e.altKey && !e.ctrlKey && !e.metaKey && /^Digit[1-9]$/.test(e.code)) {
            const k = Object.keys(TOOL_META)[+e.code.slice(5) - 1];
            if (k) { e.preventDefault(); go(k); }
            return;
        }
        if (typing || e.ctrlKey || e.metaKey || e.altKey || getTool() === 'calc') return;
        if (e.key === '/') {
            const s = getTool() === 'notes' ? $('notesSearch') : getTool() === 'todo' ? $('todoSearch') : null;
            if (s) { e.preventDefault(); s.focus(); }
        } else if ((e.key === 'n' || e.key === 'N') && getTool() === 'todo') {
            e.preventDefault(); openAddTask();
        } else if (e.key === '?') {
            showShortcuts();
        }
    });

    function onToolChange(tool) {
        if (tool === 'dashboard') refreshDashboard();
        if (tool === 'timer') renderFocusStats();
        if (tool === 'notes') syncPin();
    }

    window.FlowEnh = {
        todoMatches, setTodoFilter, renderWeatherExtra, logFocus, bmiExtra,
        refreshDashboard, onToolChange, openPalette, closePalette, focusSummary
    };

    function init() {
        injectPinButton();
        renderFocusStats();
        refreshDashboard();
        // Wrap window.openNote here, not at script eval: this defer script runs
        // before the module that defines window.openNote, but window load
        // fires after it.
        const origOpenNote = window.openNote;
        if (typeof origOpenNote === 'function') {
            window.openNote = function (id) { const r = origOpenNote.apply(this, arguments); syncPin(); return r; };
        }
        setInterval(() => { if (getTool() === 'dashboard' && !document.hidden) refreshDashboard(); }, 60000);
    }
    if (document.readyState === 'complete') init(); else window.addEventListener('load', init);
})();
