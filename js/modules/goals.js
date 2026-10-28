import { Store } from '../store.js';

/* ─── DAILY GOALS (1:1 port of main.html) ───────────────────── */
let dgGoals = Store.get('flowdesk_daily_goals', {}) || {};
let dgCurrentYear = new Date().getFullYear();
let dgCurrentMonth = new Date().getMonth();
let dgSelectedDateStr = null;

function saveDgGoals() {
    Store.save('flowdesk_daily_goals', dgGoals);
}

function initDailyGoals() {
    renderDailyGoals();
}

function prevDgMonth() {
    if (dgCurrentMonth === 0) {
        dgCurrentMonth = 11;
        dgCurrentYear--;
    } else {
        dgCurrentMonth--;
    }
    renderDailyGoals();
}

function nextDgMonth() {
    if (dgCurrentMonth === 11) {
        dgCurrentMonth = 0;
        dgCurrentYear++;
    } else {
        dgCurrentMonth++;
    }
    renderDailyGoals();
}

function getDgDayCompletionLevel(dateStr) {
    const goals = dgGoals[dateStr] || [];
    if (goals.length === 0) return 0;
    const completed = goals.filter(g => g.completed).length;
    if (completed === 0) return 0;
    if (completed === 1) return 1;
    if (completed === 2) return 2;
    if (completed === 3) return 3;
    return 4;
}

function renderDailyGoals() {
    const container = document.getElementById('dgHeatmapContainer');
    if (!container) return;
    container.innerHTML = '';
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const display = document.getElementById('dgMonthYearDisplay');
    if (display) display.textContent = `${monthNames[dgCurrentMonth]} ${dgCurrentYear}`;

    const dObjToday = new Date();
    const todayStr = [dObjToday.getFullYear(), String(dObjToday.getMonth() + 1).padStart(2, '0'), String(dObjToday.getDate()).padStart(2, '0')].join('-');

    const m = dgCurrentMonth;
    const monthWrapper = document.createElement('div');
    monthWrapper.className = 'dg-month-wrapper';

    const header = document.createElement('div');
    header.className = 'dg-month-header';

    const weekdays = document.createElement('div');
    weekdays.className = 'dg-weekdays';
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
        const d = document.createElement('div');
        d.className = 'dg-weekday';
        d.textContent = day;
        weekdays.appendChild(d);
    });
    monthWrapper.appendChild(weekdays);

    const grid = document.createElement('div');
    grid.className = 'dg-month-grid';

    const firstDayIndex = new Date(dgCurrentYear, m, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(dgCurrentYear, m + 1, 0).getDate();

    for (let i = 0; i < firstDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'dg-day-cell empty-cell';
        grid.appendChild(emptyCell);
    }

    let monthCompleted = 0;
    let monthTotal = 0;

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        const dStr = [dgCurrentYear, String(m + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-');

        const level = getDgDayCompletionLevel(dStr);
        cell.className = `dg-day-cell dg-level-${level}`;
        if (dStr === todayStr) {
            cell.classList.add('is-today');
        }
        cell.textContent = day;

        const goalsForDay = dgGoals[dStr] || [];
        const compCount = goalsForDay.filter(g => g.completed).length;
        const totCount = goalsForDay.length;

        monthCompleted += compCount;
        monthTotal += totCount;

        const pct = totCount > 0 ? Math.round((compCount / totCount) * 100) : 0;

        if (totCount === 0) {
            cell.title = `${monthNames[m]} ${day}, ${dgCurrentYear}\nNo goals`;
        } else {
            cell.title = `${monthNames[m]} ${day}, ${dgCurrentYear}\n${compCount} of ${totCount} goals completed (${pct}%)`;
        }

        cell.onclick = () => openDgDay(dStr);
        grid.appendChild(cell);
    }

    const subtitle = document.createElement('div');
    subtitle.className = 'dg-month-subtitle';
    const mPct = monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0;
    subtitle.textContent = `${monthCompleted} completed / ${monthTotal} goals · ${mPct}%`;
    header.appendChild(subtitle);

    monthWrapper.insertBefore(header, monthWrapper.firstChild);
    monthWrapper.appendChild(grid);
    container.appendChild(monthWrapper);

    updateDgStats();
}

function updateDgStats() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

    let totalGoals = 0;
    let completedGoals = 0;

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    const todayStr = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');

    // Generate all days in selected year
    const startDate = new Date(dgCurrentYear, 0, 1);
    const endDate = new Date(dgCurrentYear, 11, 31);

    let foundData = false;

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
        const goals = dgGoals[dStr] || [];
        const totCount = goals.length;
        const compCount = goals.filter(g => g.completed).length;

        if (totCount > 0) {
            foundData = true;
            totalGoals += totCount;
            completedGoals += compCount;

            if ((compCount / totCount) >= 0.8) {
                tempStreak++;
                if (tempStreak > bestStreak) bestStreak = tempStreak;
            } else {
                tempStreak = 0;
            }
        } else {
            tempStreak = 0;
        }

        if (dStr === todayStr) {
            currentStreak = tempStreak;
        }
    }

    const pct = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

    set('dgTotalGoals', totalGoals);
    set('dgCompletedGoals', completedGoals);
    set('dgCompletionRate', `${pct}%`);
    set('dgCurrentStreak', `${currentStreak} days`);
    set('dgBestStreak', `${bestStreak} days`);

    const emptyState = document.getElementById('dgEmptyState');
    if (emptyState) emptyState.style.display = (!foundData && dgCurrentYear === today.getFullYear()) ? 'flex' : 'none';
}

function openDgDay(dateStr) {
    dgSelectedDateStr = dateStr;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const title = document.getElementById('dgDrawerTitle');
    if (title) title.textContent = `${monthNames[month]} ${day}, ${year}`;

    const drawer = document.getElementById('dgDayDrawer');
    if (drawer) drawer.classList.add('open');
    renderDgDrawerGoals();
}

function closeDgDay() {
    const drawer = document.getElementById('dgDayDrawer');
    if (drawer) drawer.classList.remove('open');
    dgSelectedDateStr = null;
}

function renderDgDrawerGoals() {
    if (!dgSelectedDateStr) return;
    const list = document.getElementById('dgDrawerGoalsList');
    if (!list) return;
    list.innerHTML = '';

    const goals = dgGoals[dgSelectedDateStr] || [];

    const totCount = goals.length;
    const compCount = goals.filter(g => g.completed).length;
    const pct = totCount > 0 ? Math.round((compCount / totCount) * 100) : 0;
    const subtitle = document.getElementById('dgDrawerSubtitle');
    if (subtitle) subtitle.textContent = `${compCount} / ${totCount} completed · ${pct}%`;

    goals.forEach(g => {
        const item = document.createElement('div');
        item.className = `dg-goal-item ${g.completed ? 'completed' : ''}`;

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'dg-goal-checkbox';
        chk.checked = g.completed;
        chk.onchange = () => toggleDgGoal(g.id);

        const title = document.createElement('span');
        title.className = 'dg-goal-title';
        title.textContent = g.title;
        title.onclick = () => {
            const newTitle = prompt("Edit goal:", g.title);
            if (newTitle !== null && newTitle.trim() !== "") {
                g.title = newTitle.trim();
                saveDgGoals();
                renderDgDrawerGoals();
                renderDailyGoals();
            }
        };

        const delBtn = document.createElement('button');
        delBtn.className = 'dg-goal-delete';
        delBtn.innerHTML = '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>';
        delBtn.onclick = () => deleteDgGoal(g.id);

        item.appendChild(chk);
        item.appendChild(title);
        item.appendChild(delBtn);
        list.appendChild(item);
    });

    setTimeout(() => {
        const input = document.getElementById('dgNewGoalInput');
        if (input) input.focus();
    }, 100);
}

function addDgGoal() {
    if (!dgSelectedDateStr) return;
    const input = document.getElementById('dgNewGoalInput');
    const title = input.value.trim();
    if (!title) return;

    if (!dgGoals[dgSelectedDateStr]) {
        dgGoals[dgSelectedDateStr] = [];
    }

    dgGoals[dgSelectedDateStr].push({
        id: 'goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: title,
        completed: false,
        createdAt: new Date().toISOString()
    });

    input.value = '';
    saveDgGoals();
    renderDgDrawerGoals();
    renderDailyGoals();
}

function toggleDgGoal(goalId) {
    if (!dgSelectedDateStr) return;
    const goals = dgGoals[dgSelectedDateStr];
    const goal = goals.find(g => g.id === goalId);
    if (goal) {
        goal.completed = !goal.completed;
        saveDgGoals();
        renderDgDrawerGoals();
        renderDailyGoals();
    }
}

function deleteDgGoal(goalId) {
    if (!dgSelectedDateStr) return;
    let goals = dgGoals[dgSelectedDateStr];
    goals = goals.filter(g => g.id !== goalId);
    if (goals.length === 0) {
        delete dgGoals[dgSelectedDateStr];
    } else {
        dgGoals[dgSelectedDateStr] = goals;
    }
    saveDgGoals();
    renderDgDrawerGoals();
    renderDailyGoals();
}

/* ─── IMPORT (called by main.js applyImport) ────────────────── */
function importGoals(items, mode) {
    if (!items || typeof items !== 'object' || Array.isArray(items)) return;

    if (mode === 'replace') {
        dgGoals = JSON.parse(JSON.stringify(items));
        // The drawer may be showing a date that no longer exists
        if (dgSelectedDateStr) closeDgDay();
    } else {
        Object.entries(items).forEach(([date, goals]) => {
            if (!Array.isArray(goals)) return;
            if (!dgGoals[date]) dgGoals[date] = [];
            goals.forEach(g => {
                if (!g || dgGoals[date].some(e => e.id === g.id)) return;
                dgGoals[date].push({
                    id: g.id || ('goal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
                    title: String(g.title || 'Goal').trim() || 'Goal',
                    completed: !!g.completed,
                    createdAt: g.createdAt || new Date().toISOString()
                });
            });
        });
    }

    saveDgGoals();
    renderDailyGoals();
}

/* ─── Module API ────────────────────────────────────────────── */
export const GoalsModule = {
    init: initDailyGoals,
    prevDgMonth, nextDgMonth,
    openDgDay, closeDgDay,
    addDgGoal, toggleDgGoal, deleteDgGoal,
    importGoals,
    getAllGoals() { return dgGoals; }
};
