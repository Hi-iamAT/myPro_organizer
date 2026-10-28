import { Store } from '../store.js';
import { escapeHtml, showToast } from '../utils.js';

let todos = Store.get('todos', []);
let editingTodoIndex = -1;
let selectedPriority = 'low';
let selectedSegment = 'Other';
let showDoneTasksPanel = false;

const todoList = document.getElementById('todoList');
const emptyState = document.getElementById('emptyState');

export const TodoModule = {
    loadTodos() {
        let hasChanges = false;
        const now = new Date();

        // Auto-complete tasks that are past due
        todos.forEach(t => {
            if (!t.completed && t.date) {
                const due = new Date(t.date);
                if (now > due) {
                    t.completed = true;
                    hasChanges = true;
                }
            }
        });

        if (hasChanges) {
            Store.save('todos', todos);
        }

        // Sort by date: tasks with dates first (earliest to latest), then tasks without dates.
        todos.sort((a, b) => {
            if (a.date && b.date) return new Date(a.date) - new Date(b.date);
            if (a.date) return -1;
            if (b.date) return 1;
            return 0;
        });
        Store.save('todos', todos);

        const activeTodos = todos.filter(t => !t.completed);
        const doneTodos = todos.filter(t => t.completed);

        if (!todoList) return;

        todoList.innerHTML = '';
        const viewTodos = (showDoneTasksPanel ? doneTodos : activeTodos)
            .filter(t => !window.FlowEnh || FlowEnh.todoMatches(t));

        const isEmpty = viewTodos.length === 0;
        if (emptyState) emptyState.style.display = isEmpty ? 'flex' : 'none';

        viewTodos.forEach((todo) => {
            const originalIndex = todos.indexOf(todo);
            this.addTodoElement(todo, originalIndex, todoList);
        });

        this.updateStats();
    },

    addTodoElement(todo, index, targetList) {
        const li = document.createElement('li');
        const pColors = { low: 'var(--brand)', medium: 'var(--warn)', high: 'var(--danger)' };
        const pColor = pColors[todo.priority || 'low'];

        const segment = todo.segment || 'Other';
        const sColors = { 'CT': '#8b5cf6', 'Mid': '#ec4899', 'Final': '#f59e0b', 'Other': '#6b7280', 'Custom': '#10b981' };
        const sColor = sColors[segment] || sColors['Custom'];
        const segmentBadge = `<span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${sColor}20; color: ${sColor}; font-weight: 600; margin-right: 6px;">${segment}</span>`;

        let dateHtml = '';
        let isUrgent = false;

        if (todo.date) {
            const due = new Date(todo.date);
            const today = new Date();
            const diffMs = due - today;
            const totalHoursLeft = Math.floor(diffMs / (1000 * 60 * 60));
            const totalMinsLeft = Math.floor(diffMs / (1000 * 60));
            const daysLeft = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            const remainingHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const remainingMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

            let countdownLabel = '';
            let badgeClass = '';

            if (diffMs < 0) {
                countdownLabel = `Overdue`;
                badgeClass = 'overdue-badge';
                isUrgent = true;
            } else if (totalMinsLeft < 60) {
                countdownLabel = `${totalMinsLeft} min left`;
                badgeClass = 'urgent-badge';
                isUrgent = true;
            } else if (totalHoursLeft < 24) {
                countdownLabel = remainingMins > 0
                    ? `${totalHoursLeft} hr${totalHoursLeft !== 1 ? 's' : ''} ${remainingMins} min left`
                    : `${totalHoursLeft} hr${totalHoursLeft !== 1 ? 's' : ''} left`;
                badgeClass = 'urgent-badge';
                isUrgent = true;
            } else if (totalHoursLeft < 72) {
                countdownLabel = `${totalHoursLeft} hrs left`;
                badgeClass = 'warning-badge';
                isUrgent = true;
            } else {
                countdownLabel = `${daysLeft} days left`;
                badgeClass = 'safe-badge';
            }

            const countdownBadge = `<span class="todo-countdown ${badgeClass}">${countdownLabel}</span>`;

            dateHtml = `<span class="todo-date-preview" style="font-size:0.75rem; color:var(--brand); display:flex; align-items:center; gap:4px; margin-top:2px; flex-wrap:wrap;">
                <svg viewBox="0 0 20 20" fill="currentColor" style="width:12px; height:12px;"><path fill-rule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clip-rule="evenodd"/></svg>
                ${due.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                ${due.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}${countdownBadge}
            </span>`;
        }

        li.className = 'todo-item' + (todo.completed ? ' completed' : '') + (isUrgent && !todo.completed ? ' urgent' : '') + (segment !== 'Other' ? ' has-segment' : '');
        if (segment !== 'Other') {
            li.style.setProperty('--seg-color', sColor);
        }
        li.innerHTML = `
            <label class="check-label">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${index})">
                <span class="checkmark"></span>
            </label>
            <div class="todo-content" onclick="openEditTask(${index})">
                <div style="display: flex; align-items: center; margin-bottom: 4px;">
                    ${segmentBadge}
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                </div>
                ${dateHtml}
                ${todo.note ? `<span class="todo-note-preview">${escapeHtml(todo.note.substring(0, 60))}${todo.note.length > 60 ? '…' : ''}</span>` : ''}
            </div>
            <span class="priority-dot" style="background:${pColor}" title="${escapeHtml(todo.priority || 'low')} priority"></span>
            <button class="del-btn" onclick="deleteTodo(${index})" title="Delete task">
                <svg viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 4l1 10h8l1-10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>`;
        targetList.appendChild(li);
    },

    toggleDoneTasksPanel() {
        showDoneTasksPanel = !showDoneTasksPanel;
        const btn = document.getElementById('doneTasksToggleBtn');
        const titleEl = document.getElementById('listViewTitle');
        const addBtn = document.getElementById('addTaskBtn');
        const emptyMsg = document.getElementById('emptyStateMsg');
        if (showDoneTasksPanel) {
            btn?.classList.add('active');
            if (titleEl) titleEl.textContent = 'Completed Tasks';
            if (addBtn) addBtn.style.display = 'none';
            if (emptyMsg) emptyMsg.innerHTML = 'No completed tasks yet.<br>Check off a task to see it here!';
        } else {
            btn?.classList.remove('active');
            if (titleEl) titleEl.textContent = 'Active Tasks';
            if (addBtn) addBtn.style.display = '';
            if (emptyMsg) emptyMsg.innerHTML = 'No active tasks.<br>Click <strong>+</strong> to add one!';
        }
        this.loadTodos();
    },

    openAddTask() {
        editingTodoIndex = -1;
        selectedPriority = 'low';
        selectedSegment = 'Other';
        document.getElementById('todoInput').value = '';
        document.getElementById('todoNote').value = '';
        document.getElementById('todoDate').value = '';
        document.getElementById('customSegmentInput').value = '';
        document.getElementById('customSegmentInput').style.display = 'none';
        document.getElementById('taskEditorBadge').textContent = 'New Task';
        document.getElementById('taskSaveBtn').innerHTML = `
            <svg viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            Add Task`;
        document.querySelectorAll('.priority-chip[data-priority]').forEach(c => c.classList.toggle('active', c.dataset.priority === 'low'));
        document.querySelectorAll('.priority-chip[data-segment]').forEach(c => c.classList.toggle('active', c.dataset.segment === 'Other'));
        document.getElementById('taskModal').style.display = 'flex';
        setTimeout(() => document.getElementById('todoInput').focus(), 50);
    },

    openEditTask(index) {
        editingTodoIndex = index;
        const todo = todos[index];
        selectedPriority = todo.priority || 'low';

        const rawSegment = todo.segment || 'Other';
        const isStandard = ['Other', 'CT', 'Mid', 'Final'].includes(rawSegment);
        selectedSegment = isStandard ? rawSegment : 'Custom';

        document.getElementById('todoInput').value = todo.text;
        document.getElementById('todoNote').value = todo.note || '';
        document.getElementById('todoDate').value = todo.date || '';
        document.getElementById('customSegmentInput').value = isStandard ? '' : rawSegment;
        document.getElementById('customSegmentInput').style.display = isStandard ? 'none' : 'block';

        document.getElementById('taskEditorBadge').textContent = 'Edit Task';
        document.getElementById('taskSaveBtn').innerHTML = `
            <svg viewBox="0 0 20 20" fill="none"><path d="M16 4L8 14l-4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Save Changes`;
        document.querySelectorAll('.priority-chip[data-priority]').forEach(c => c.classList.toggle('active', c.dataset.priority === selectedPriority));
        document.querySelectorAll('.priority-chip[data-segment]').forEach(c => c.classList.toggle('active', c.dataset.segment === selectedSegment));
        document.getElementById('taskModal').style.display = 'flex';
        setTimeout(() => document.getElementById('todoInput').focus(), 50);
    },

    closeTaskEditor() {
        document.getElementById('taskModal').style.display = 'none';
        editingTodoIndex = -1;
    },

    setPriority(p, btn) {
        selectedPriority = p;
        document.querySelectorAll('.priority-chip[data-priority]').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    },

    setSegment(s, btn) {
        selectedSegment = s;
        document.querySelectorAll('.priority-chip[data-segment]').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        if (s === 'Custom') {
            document.getElementById('customSegmentInput').style.display = 'block';
            document.getElementById('customSegmentInput').focus();
        } else {
            document.getElementById('customSegmentInput').style.display = 'none';
        }
    },

    saveTodo() {
        const text = document.getElementById('todoInput').value.trim();
        if (!text) { showToast('Please enter a task!', 'warn'); return; }
        const note = document.getElementById('todoNote').value.trim();
        const date = document.getElementById('todoDate').value;

        let finalSegment = selectedSegment;
        if (finalSegment === 'Custom') {
            finalSegment = document.getElementById('customSegmentInput').value.trim() || 'Custom';
        }

        if (editingTodoIndex >= 0) {
            todos[editingTodoIndex] = { ...todos[editingTodoIndex], text, note, date, priority: selectedPriority, segment: finalSegment };
            showToast('Task updated ✓', 'success');
        } else {
            todos.push({ text, note, date, priority: selectedPriority, segment: finalSegment, completed: false });
            showToast('Task added ✓', 'success');
        }
        this.closeTaskEditor();
        Store.save('todos', todos);
        this.loadTodos();
    },

    toggleTodo(i) {
        todos[i].completed = !todos[i].completed;
        Store.save('todos', todos);
        this.loadTodos();
    },

    deleteTodo(i) {
        if (editingTodoIndex === i) this.closeTaskEditor();
        todos.splice(i, 1);
        Store.save('todos', todos);
        this.loadTodos();
        showToast('Task removed', 'info');
    },

    clearCompleted() {
        const n = todos.filter(t => t.completed).length;
        if (!n) { showToast('No completed tasks', 'warn'); return; }
        todos = todos.filter(t => !t.completed);
        if (showDoneTasksPanel) {
            showDoneTasksPanel = false;
            document.getElementById('doneTasksToggleBtn').classList.remove('active');
            document.getElementById('listViewTitle').textContent = 'Active Tasks';
            document.getElementById('addTaskBtn').style.display = '';
            document.getElementById('emptyStateMsg').innerHTML = 'No active tasks.<br>Click <strong>+</strong> to add one!';
        }
        Store.save('todos', todos);
        this.loadTodos();
        showToast(`Cleared ${n} task${n > 1 ? 's' : ''}`, 'success');
    },

    updateStats() {
        const done = todos.filter(t => t.completed).length;
        const totalCount = document.getElementById('totalCount');
        const completedCount = document.getElementById('completedCount');
        const remainingCount = document.getElementById('remainingCount');
        const doneCountBadge = document.getElementById('doneCountBadge');

        if (totalCount) totalCount.textContent = todos.length;
        if (completedCount) completedCount.textContent = done;
        if (remainingCount) remainingCount.textContent = todos.length - done;
        if (doneCountBadge) {
            doneCountBadge.textContent = done;
            doneCountBadge.style.display = done > 0 ? 'inline-flex' : 'none';
        }
    },

    /* ─── IMPORT (called by main.js applyImport) ────────────── */
    importTodos(items, mode) {
        if (!Array.isArray(items)) return;
        const sig = t => [(t.text || ''), (t.date || ''), (t.priority || 'low'), (t.segment || 'Other')].join('|');

        if (mode === 'replace') {
            todos = items
                .filter(t => t && typeof t === 'object' && (t.text || '').trim())
                .map(t => ({ text: t.text, note: t.note || '', date: t.date || '', priority: t.priority || 'low', segment: t.segment || 'Other', completed: !!t.completed }));
        } else {
            const existing = new Set(todos.map(sig));
            items.forEach(t => {
                if (!t || typeof t !== 'object' || !(t.text || '').trim() || existing.has(sig(t))) return;
                const norm = { text: t.text, note: t.note || '', date: t.date || '', priority: t.priority || 'low', segment: t.segment || 'Other', completed: !!t.completed };
                todos.push(norm);
                existing.add(sig(norm));
            });
        }

        Store.save('todos', todos);
        this.loadTodos();
    },

    /** Getter for enhance.js (accessed via window.todos) */
    getTodos() { return todos; }
};
