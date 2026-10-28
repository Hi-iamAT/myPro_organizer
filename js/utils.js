/**
 * General utility functions used across the application.
 */
import { Store } from './store.js';

export function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

export function showToast(msg, type = 'info') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.className = 'toast show ' + type;
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.className = 'toast', 2500);
}

/** 'YYYY-MM-DD' for a Date — shared by timer reminders, goals & prayer caches. */
export function dayKeyStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** localStorage JSON wrapper (kept for modules that relied on saveData). */
export function saveData(key, data) { Store.save(key, data); }
