import { Store } from '../store.js';
import { escapeHtml, showToast } from '../utils.js';

let notesArr = Store.get('advancedNotes', []);
let activeNoteId = null;

const notesList = document.getElementById('notesList');
const noteCount = document.getElementById('noteCount');
const activeNoteEditor = document.getElementById('activeNoteEditor');
const noteEditorEmpty = document.getElementById('noteEditorEmpty');
const activeNoteTitle = document.getElementById('activeNoteTitle');
const activeNoteContent = document.getElementById('activeNoteContent');
const activeNoteThemeColor = document.getElementById('activeNoteThemeColor');

export const NotesModule = {
    renderNotesList() {
        if (!notesList) return;
        document.getElementById('noteCount').textContent = notesArr.length;
        notesList.innerHTML = '';
        if (!notesArr.length) {
            notesList.innerHTML = `<div class="empty-state" style="display:flex">
                <svg viewBox="0 0 48 48" fill="none"><path d="M12 8h24v28l-6 6H12V8z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M30 36v6l6-6h-6z" fill="currentColor"/></svg>
                <p>No notes yet.<br>Click <strong>New Note</strong>!</p></div>`;
            return;
        }
        const q = (document.getElementById('notesSearch')?.value || '').trim().toLowerCase();
        const strip = h => { const d = document.createElement('div'); d.innerHTML = h || ''; return d.textContent; };
        const visible = notesArr
            .map((n, i) => [n, i]).sort((a, b) => (!!b[0].pinned - !!a[0].pinned) || (a[1] - b[1])).map(x => x[0])
            .filter(n => !q || (n.title || '').toLowerCase().includes(q) || strip(n.content).toLowerCase().includes(q));
        if (!visible.length) { notesList.innerHTML = '<div class="notes-empty-state" style="padding:16px;text-align:center;opacity:.7">No matching notes.</div>'; }
        visible.forEach(note => {
            const btn = document.createElement('button');
            btn.className = 'note-list-item' + (note.id === activeNoteId ? ' active' : '');
            btn.style.setProperty('--nc', note.theme || '#6C63FF');
            btn.innerHTML = `
                <span class="note-list-accent"></span>
                <div class="note-list-info">
                    <span class="note-list-title">${note.pinned ? '<span class="pin-mark" title="Pinned">📌</span> ' : ''}${escapeHtml((note.title || '').trim()) || '<span class="untitled-note">Untitled Note</span>'}</span>
                </div>`;
            btn.title = (note.title || '').trim() || 'Untitled Note';
            btn.onclick = () => this.openNote(note.id);
            notesList.appendChild(btn);
        });
    },

    openNote(id) {
        if (activeNoteId === id) {
            activeNoteId = null;
            this.renderNotesList();
            if (activeNoteEditor) activeNoteEditor.style.display = 'none';
            if (noteEditorEmpty) noteEditorEmpty.style.display = 'flex';
            document.querySelector('.panel-split')?.classList.remove('mobile-editor-active');
            return;
        }
        activeNoteId = id;
        const note = notesArr.find(n => n.id === id);
        if (!note) return;
        this.renderNotesList();
        if (noteEditorEmpty) noteEditorEmpty.style.display = 'none';
        if (activeNoteEditor) {
            activeNoteEditor.style.display = 'flex';
            activeNoteEditor.style.setProperty('--nc', note.theme || '#6C63FF');
        }
        if (activeNoteTitle) activeNoteTitle.value = note.title || '';
        if (activeNoteContent) activeNoteContent.innerHTML = note.content || '';
        if (activeNoteThemeColor) activeNoteThemeColor.value = note.theme || '#6C63FF';
        document.querySelector('.panel-split')?.classList.add('mobile-editor-active');
    },

    addNewNote() {
        const newNote = { id: Date.now(), title: '', content: '', theme: '#6C63FF', updatedAt: new Date().toISOString() };
        notesArr.unshift(newNote);
        Store.save('advancedNotes', notesArr);
        this.openNote(newNote.id);
        this.renderNotesList();
        setTimeout(() => {
            const t = document.getElementById('activeNoteTitle');
            if (t) t.focus();
        }, 50);
    },

    closeNoteMobile() {
        activeNoteId = null;
        if (activeNoteEditor) activeNoteEditor.style.display = 'none';
        if (noteEditorEmpty) noteEditorEmpty.style.display = 'flex';
        document.querySelector('.panel-split')?.classList.remove('mobile-editor-active');
        this.renderNotesList();
    },

    updateActiveNoteTitle(v) {
        const n = notesArr.find(n => n.id === activeNoteId);
        if (n) { n.title = v; n.updatedAt = new Date().toISOString(); Store.save('advancedNotes', notesArr); this.renderNotesList(); }
    },

    updateActiveNoteContent(v) {
        const n = notesArr.find(n => n.id === activeNoteId);
        if (n) { n.content = v; n.updatedAt = new Date().toISOString(); Store.save('advancedNotes', notesArr); }
    },

    changeActiveNoteTheme(v) {
        const n = notesArr.find(n => n.id === activeNoteId);
        if (n) { n.theme = v; Store.save('advancedNotes', notesArr); this.renderNotesList(); if (activeNoteEditor) activeNoteEditor.style.setProperty('--nc', v); }
    },

    deleteActiveNote() {
        if (!activeNoteId) return;
        notesArr = notesArr.filter(n => n.id !== activeNoteId);
        Store.save('advancedNotes', notesArr);
        this.closeNoteMobile();
        this.renderNotesList();
        showToast('Note deleted', 'info');
    },

    execNoteCmd(cmd, val = null) {
        document.execCommand(cmd, false, val);
    },

    /* ─── IMPORT (called by main.js applyImport) ────────────── */
    importNotes(items, mode) {
        if (!Array.isArray(items)) return;
        const norm = n => ({
            id: n.id || (Date.now() + Math.floor(Math.random() * 1000)),
            title: n.title || '',
            content: n.content || '',
            theme: n.theme || '#6C63FF',
            pinned: !!n.pinned,
            updatedAt: n.updatedAt || new Date().toISOString()
        });

        if (mode === 'replace') {
            notesArr = items.filter(n => n && typeof n === 'object').map(norm);
            activeNoteId = null; // the open editor may point at a removed note
        } else {
            items.forEach(n => {
                if (!n || typeof n !== 'object') return;
                if (!notesArr.some(e => e.id === n.id)) notesArr.push(norm(n));
            });
        }

        Store.save('advancedNotes', notesArr);
    },

    /** Getters for enhance.js (accessed via window.notesArr / window.activeNoteId) */
    getNotes() { return notesArr; },
    getActiveId() { return activeNoteId; }
};
