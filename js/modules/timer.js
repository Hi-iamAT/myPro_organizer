import { Store } from '../store.js';
import { showToast } from '../utils.js';
import { dayKeyStr } from '../utils.js';

/* FlowDesk Focus Timer + live-time reminders.
 * Ported 1:1 from the original app:
 *  - ticking is wall-clock based (timerEndTime), so background tabs
 *    and throttled intervals never pause or drift the countdown;
 *  - interval alerts fire ON matching wall-clock slots (:15/:30/:00 …);
 *  - custom reminders fire once per day at their exact time (with a
 *    5-minute catch-up window, e.g. after the laptop was asleep).
 * Legacy localStorage keys from the original app are preserved:
 *   sessionCount (number) · timerNotifications ('true'/'false')
 *   flowdesk_interval_alerts {enabled, interval, lastFiredSlot}
 *   flowdesk_reminders [{id, time, message, firedOn}]
 */
const CIRC = 2 * Math.PI * 60; // timer ring circumference (r = 60)

let timerInterval = null;
let timeLeft = 25 * 60;
let totalTime = 25 * 60;
let isRunning = false;
let timerEndTime = null;
let currentMode = 25;
let currentModeLabel = 'Work';
let sessionCount = parseInt(localStorage.getItem('sessionCount') || '0');
let timerNotificationsEnabled = localStorage.getItem('timerNotifications') !== 'false';
let titleFlashInterval = null;

/* ── Notifications ──────────────────────────────────────────────── */
function requestTimerNotificationPermission() {
    if (!('Notification' in window)) return Promise.resolve(false);
    if (Notification.permission === 'granted') return Promise.resolve(true);
    if (Notification.permission !== 'denied') {
        return Notification.requestPermission().then(r => r === 'granted');
    }
    return Promise.resolve(false);
}

function playTimerSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        setTimeout(() => {
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.frequency.value = 1100;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.3, ctx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc2.start(ctx.currentTime);
            osc2.stop(ctx.currentTime + 0.5);
        }, 200);
    } catch (_) { }
}

function flashDocumentTitle(message) {
    if (titleFlashInterval) clearInterval(titleFlashInterval);
    const original = document.title;
    let showAlt = true;
    titleFlashInterval = setInterval(() => {
        document.title = showAlt ? message : original;
        showAlt = !showAlt;
    }, 800);
    setTimeout(() => {
        clearInterval(titleFlashInterval);
        titleFlashInterval = null;
        document.title = original;
    }, 8000);
}

function notifyTimerComplete(message) {
    showToast(message, 'success');
    playTimerSound();
    flashDocumentTitle('⏰ Timer Done!');
    showBrowserNotification(message);
}

function showBrowserNotification(message, title = 'Focus Timer') {
    if (!timerNotificationsEnabled || !('Notification' in window)) return;
    if (Notification.permission === 'granted') {
        // Unique tag per alert so every chime posts its own notification
        // (a constant tag can get swallowed by some Linux daemons).
        const n = new Notification(title, {
            body: message,
            icon: 'favicon.svg',
            tag: 'flowdesk-timer-' + Date.now(),
            requireInteraction: false
        });
        n.onclick = () => { window.focus(); n.close(); };
    } else if (Notification.permission !== 'denied') {
        requestTimerNotificationPermission().then(granted => {
            if (granted) showBrowserNotification(message, title);
        });
    }
}

/* ── Countdown (wall-clock based) ───────────────────────────────── */
function updateTimerDisplay() {
    const timerDisplay = document.getElementById('timerDisplay');
    const timerRing = document.getElementById('timerRing');
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const timeStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    if (timerDisplay) timerDisplay.textContent = timeStr;
    if (timerRing) timerRing.style.strokeDashoffset = CIRC * (1 - timeLeft / totalTime);
    if (isRunning) {
        document.title = `(${timeStr}) FlowDesk — ${currentModeLabel}`;
    }
}

function tickTimer() {
    if (!isRunning || !timerEndTime) return;
    const now = Date.now();
    timeLeft = Math.max(0, Math.round((timerEndTime - now) / 1000));
    updateTimerDisplay();

    if (timeLeft <= 0) {
        clearInterval(timerInterval);
        isRunning = false;
        timerEndTime = null;
        setStartPauseButtons(false);
        if (currentModeLabel === 'Work') {
            sessionCount++;
            localStorage.setItem('sessionCount', sessionCount);
            const sc = document.getElementById('sessionCount');
            if (sc) sc.textContent = sessionCount;
            if (window.FlowEnh) FlowEnh.logFocus(Math.round(totalTime / 60));
        }
        notifyTimerComplete(currentModeLabel + ' session complete! 🎉');
        resetTimer();
    }
}

function startTimer() {
    if (isRunning) return;
    if (timerNotificationsEnabled) requestTimerNotificationPermission();
    isRunning = true;
    timerEndTime = Date.now() + timeLeft * 1000;
    setStartPauseButtons(true);

    // Immediate update and start interval
    tickTimer();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(tickTimer, 500);
}

function pauseTimer() {
    if (isRunning && timerEndTime) {
        timeLeft = Math.max(0, Math.round((timerEndTime - Date.now()) / 1000));
    }
    isRunning = false;
    timerEndTime = null;
    if (timerInterval) clearInterval(timerInterval);
    setStartPauseButtons(false);
    updateTabTitle(); // falls back to next-alert / default title
}

function setStartPauseButtons(running) {
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    if (startBtn) startBtn.style.display = running ? 'none' : 'inline-flex';
    if (pauseBtn) pauseBtn.style.display = running ? 'inline-flex' : 'none';
}

function resetTimer() {
    pauseTimer();
    totalTime = currentMode * 60;
    timeLeft = totalTime;
    updateTimerDisplay();
    updateTabTitle();
}

function setTimerMode(min, label, chip) {
    pauseTimer();
    currentMode = min; currentModeLabel = label; totalTime = min * 60; timeLeft = totalTime;
    updateTimerDisplay();
    const modeBadge = document.getElementById('modeBadge');
    const timerLabel = document.getElementById('timerLabel');
    if (modeBadge) modeBadge.textContent = label;
    if (timerLabel) timerLabel.textContent = label === 'Work' ? 'Focus' : label;
    document.querySelectorAll('.mode-chip').forEach(c => c.classList.remove('active'));
    if (chip) chip.classList.add('active');
    updateTabTitle();
}

function openCustomTimerModal() {
    const modal = document.getElementById('customTimerModal');
    const input = document.getElementById('customTimerInput');
    if (modal) modal.style.display = 'flex';
    if (input) {
        input.value = currentModeLabel === 'Custom' ? currentMode : '';
        input.focus();
    }
}

function closeCustomTimerModal() {
    const modal = document.getElementById('customTimerModal');
    if (modal) modal.style.display = 'none';
}

function applyCustomTimer() {
    const input = document.getElementById('customTimerInput');
    const min = parseInt(input.value);
    if (isNaN(min) || min < 1 || min > 1440) {
        showToast('Please enter a valid duration between 1 and 1440 minutes.', 'error');
        return;
    }

    setTimerMode(min, 'Custom', document.getElementById('chip-custom'));
    const chip = document.getElementById('chip-custom');
    if (chip) chip.textContent = `Custom · ${min}m`;
    closeCustomTimerModal();
    showToast(`Custom timer set to ${min} minutes!`, 'success');
}

/* ── LIVE-TIME INTERVAL ALERTS & CUSTOM REMINDERS ──────────────── */
let intervalAlerts = (() => {
    try {
        const v = JSON.parse(localStorage.getItem('flowdesk_interval_alerts'));
        return (v && typeof v === 'object') ? v : { enabled: false, interval: 30 };
    } catch (_) { return { enabled: false, interval: 30 }; }
})();
let customReminders = (() => {
    try {
        const v = JSON.parse(localStorage.getItem('flowdesk_reminders'));
        return Array.isArray(v) ? v : [];
    } catch (_) { return []; }
})();

let lastReminderMinute = null; // minute-of-day last processed

const saveIntervalAlerts = () => localStorage.setItem('flowdesk_interval_alerts', JSON.stringify(intervalAlerts));
const saveReminders = () => localStorage.setItem('flowdesk_reminders', JSON.stringify(customReminders));
const timeStr = d => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).slice(0, 5);
const fmtTime12 = hhmm => {
    const [h, m] = hhmm.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 === 0 ? 12 : h % 12;
    return `${hh}:${String(m).padStart(2, '0')} ${ampm}`;
};

function toggleTimerNotifications(enabled) {
    timerNotificationsEnabled = enabled;
    localStorage.setItem('timerNotifications', String(enabled));
    if (enabled) requestTimerNotificationPermission();
}

function toggleIntervalAlerts(enabled) {
    intervalAlerts.enabled = enabled;
    intervalAlerts.lastFiredSlot = null; // reset so the next slot after enabling fires cleanly
    saveIntervalAlerts();
    renderIntervalAlerts();
    if (enabled) {
        requestTimerNotificationPermission().then(granted => {
            showToast(granted
                ? `Interval alerts ON — every ${intervalAlerts.interval < 60 ? intervalAlerts.interval + ' min' : 'hour'} ⏰`
                : 'Interval alerts ON — allow notifications in your browser for desktop pings', granted ? 'success' : 'warn');
        });
    } else {
        showToast('Interval alerts off', 'info');
    }
}

function setIntervalChoice(min, chip) {
    intervalAlerts.interval = min;
    intervalAlerts.lastFiredSlot = null;
    saveIntervalAlerts();
    renderIntervalAlerts();
    if (intervalAlerts.enabled) showToast(`Now alerting every ${min === 60 ? 'hour' : min + ' minutes'}`, 'success');
}

function renderIntervalAlerts() {
    const toggle = document.getElementById('intervalAlertToggle');
    if (toggle) toggle.checked = intervalAlerts.enabled;
    document.querySelectorAll('#intervalChips .mode-chip').forEach(c =>
        c.classList.toggle('active', intervalAlerts.enabled && +c.dataset.min === intervalAlerts.interval));
    const nextEl = document.getElementById('intervalNext');
    if (!nextEl) return;
    if (!intervalAlerts.enabled) {
        nextEl.textContent = 'Turn on to start receiving alerts';
        return;
    }
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
    const step = intervalAlerts.interval;
    const nextSlot = (Math.floor(nowMin / step) + 1) * step;
    let nextDate;
    if (nextSlot >= 1440) {
        nextDate = new Date(now); nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0, 0, 0, 0);
    } else {
        nextDate = new Date(now); nextDate.setHours(Math.floor(nextSlot / 60), nextSlot % 60, 0, 0);
    }
    const minsTo = Math.round((nextDate - now) / 60000);
    nextEl.textContent =
        `Next alert at ${timeStr(nextDate)} (${minsTo < 1 ? '<1' : minsTo} min from now) · every ${step === 60 ? 'hour' : step + ' min'}`;
    updateTabTitle();
}

function addReminder(e) {
    e.preventDefault();
    const timeInput = document.getElementById('reminderTime');
    const msgInput = document.getElementById('reminderMsg');
    const msg = msgInput.value.trim();
    if (!timeInput.value || !msg) { showToast('Please set a time and message', 'warn'); return; }
    customReminders.push({
        id: 'r' + Date.now(),
        time: timeInput.value,      // "HH:MM"
        message: msg,
        firedOn: null               // last "YYYY-MM-DD" it fired on
    });
    saveReminders();
    timeInput.value = ''; msgInput.value = '';
    renderReminders();
    requestTimerNotificationPermission();
    showToast('Reminder added ✓', 'success');
}

function deleteReminder(id) {
    customReminders = customReminders.filter(r => r.id !== id);
    saveReminders();
    renderReminders();
    showToast('Reminder deleted', 'info');
}

function renderReminders() {
    const list = document.getElementById('reminderList');
    const empty = document.getElementById('reminderEmpty');
    const countEl = document.getElementById('reminderCount');
    if (!list) return;
    if (countEl) countEl.textContent = customReminders.length;
    if (empty) empty.style.display = customReminders.length ? 'none' : 'block';
    list.innerHTML = '';
    const sorted = [...customReminders].sort((a, b) => a.time.localeCompare(b.time));
    sorted.forEach(r => {
        const today = dayKeyStr(new Date());
        const fired = r.firedOn === today;
        const li = document.createElement('li');
        li.className = 'reminder-item' + (fired ? ' fired' : '');

        const timeChip = document.createElement('span');
        timeChip.className = 'reminder-item-time';
        timeChip.textContent = fmtTime12(r.time);

        const msg = document.createElement('span');
        msg.className = 'reminder-item-msg';
        msg.textContent = r.message;
        msg.title = r.message;

        const status = document.createElement('span');
        status.className = 'reminder-item-status';
        status.textContent = fired ? '✓ done today' : nextInLabel(r.time, fired);

        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'reminder-item-del';
        del.innerHTML = '&#10005;';
        del.title = 'Delete reminder';
        del.setAttribute('aria-label', 'Delete reminder');
        del.onclick = () => deleteReminder(r.id);

        li.append(timeChip, msg, status, del);
        list.appendChild(li);
    });
    updateTabTitle();
}

function nextInLabel(remTime, fired) {
    if (fired) return '';
    const [h, m] = remTime.split(':').map(Number);
    const now = new Date();
    let remDate = new Date(); remDate.setHours(h, m, 0, 0);
    if (remDate < now) remDate.setDate(remDate.getDate() + 1);
    const mins = Math.round((remDate - now) / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `in ${hrs}h ${mins % 60}m`;
}

/* Clock-driven checker: runs every second alongside the navbar clock tick */
function checkReminders() {
    const now = new Date();
    const minuteOfDay = now.getHours() * 60 + now.getMinutes();
    if (minuteOfDay === lastReminderMinute) { // only evaluate new minutes
        renderIntervalAlerts(); // keep the "next alert" countdown fresh
        return;
    }
    lastReminderMinute = minuteOfDay;
    const today = dayKeyStr(now);

    // 1) Interval alerts — fire exactly when minuteOfDay is a multiple of the interval
    if (intervalAlerts.enabled) {
        const slotKey = `${today}#${minuteOfDay}`;
        if (minuteOfDay % intervalAlerts.interval === 0 && intervalAlerts.lastFiredSlot !== slotKey) {
            intervalAlerts.lastFiredSlot = slotKey;
            saveIntervalAlerts();
            const msg = intervalAlertMessage(now);
            fireReminder(msg, msg);
        }
    }

    // 2) Custom reminders — fire at exact time, or catch-up within 5 min
    customReminders.forEach(r => {
        if (r.firedOn === today) return;
        const [h, m] = r.time.split(':').map(Number);
        const rMin = h * 60 + m;
        const late = minuteOfDay - rMin;
        if (late >= 0 && late <= 5) {
            r.firedOn = today;
            saveReminders();
            fireReminder(`⏰ ${fmtTime12(r.time)} — ${r.message}`, r.message);
        }
    });

    renderReminders(); // refresh countdowns / fired states
}

/* Clock-chime style interval message */
function intervalAlertMessage(now) {
    const h = now.getHours(), m = now.getMinutes();
    const h12 = h % 12 === 0 ? 12 : h % 12;
    if (m === 0) return `It's ${h12} o'clock`;
    return `It's ${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/* Shared firing pipeline: toast + sound + title flash + browser notification */
function fireReminder(toastMsg, notifBody) {
    showToast(toastMsg, 'success');
    playTimerSound();
    flashDocumentTitle('⏰ Reminder!');
    showFlowNotification('FlowDesk Reminder', notifBody);
}

function showFlowNotification(title, body) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
        body,
        icon: 'favicon.svg',
        tag: 'flowdesk-reminder-' + Date.now(),
        requireInteraction: false
    });
    n.onclick = () => { window.focus(); n.close(); };
}

/* Live tab title:
 * - Timer running → countdown + mode (handled by updateTimerDisplay)
 * - Idle → next interval alert or custom reminder
 * - Nothing scheduled → default title
 */
function updateTabTitle() {
    if (isRunning || titleFlashInterval) return; // countdown/flash titles take precedence
    let nextDate = null;

    if (intervalAlerts.enabled) {
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
        const step = intervalAlerts.interval;
        const slot = (Math.floor(nowMin / step) + 1) * step;
        nextDate = new Date(now);
        if (slot >= 1440) { nextDate.setDate(nextDate.getDate() + 1); nextDate.setHours(0, 0, 0, 0); }
        else nextDate.setHours(Math.floor(slot / 60), slot % 60, 0, 0);
    }

    const today = dayKeyStr(new Date());
    customReminders.forEach(r => {
        if (r.firedOn === today) return;
        const [h, m] = r.time.split(':').map(Number);
        const rDate = new Date(); rDate.setHours(h, m, 0, 0);
        if (rDate <= new Date()) rDate.setDate(rDate.getDate() + 1);
        if (!nextDate || rDate < nextDate) nextDate = rDate;
    });

    let title;
    if (nextDate) {
        const mins = Math.max(1, Math.round((nextDate - new Date()) / 60000));
        title = `⏰ ${fmtTime12(timeStr(nextDate))} · ${mins < 60 ? mins + 'm' : Math.floor(mins / 60) + 'h' + (mins % 60 ? ' ' + (mins % 60) + 'm' : '')} — FlowDesk`;
    } else {
        title = 'FlowDesk — Your Personal Productivity Hub';
    }
    if (document.title !== title) document.title = title;
}

/* ── Module API ────────────────────────────────────────────────── */
export const TimerModule = {
    init() {
        const CIRC_SVG = document.getElementById('timerRing');
        if (CIRC_SVG) CIRC_SVG.style.strokeDasharray = CIRC;

        const sc = document.getElementById('sessionCount');
        if (sc) sc.textContent = sessionCount;

        const notifToggle = document.getElementById('timerNotifToggle');
        if (notifToggle) notifToggle.checked = timerNotificationsEnabled;

        document.addEventListener('visibilitychange', () => {
            if (isRunning) tickTimer();
        });

        updateTimerDisplay();
        setInterval(checkReminders, 1000);
        renderIntervalAlerts();
        renderReminders();
    },

    isRunning: () => isRunning,
    startTimer, pauseTimer, resetTimer, setTimerMode,
    openCustomTimerModal, closeCustomTimerModal, applyCustomTimer,
    toggleTimerNotifications, toggleIntervalAlerts, setIntervalChoice,
    addReminder, deleteReminder
};
