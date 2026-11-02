import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';

export type StickyNoteColor = 'yellow' | 'emerald' | 'sky' | 'rose' | 'purple' | 'amber';

export interface StickyNote {
  id: string;
  title: string;
  content: string;
  color: StickyNoteColor;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserStickyNotesService {
  private authService = inject(AuthService);

  notes = signal<StickyNote[]>([]);
  floatingNoteId = signal<string | null>(null);

  // Computeds
  pinnedCount = computed(() => this.notes().filter(n => n.isPinned).length);
  totalCount = computed(() => this.notes().length);
  floatingNote = computed(() => this.notes().find(n => n.id === this.floatingNoteId()) || null);

  constructor() {
    // React to user changes and load private user storage
    effect(() => {
      const user = this.authService.currentUser();
      this.loadUserNotes(user?.id || user?.userName || 'guest');
    });
  }

  private getStorageKey(userId: string): string {
    return `alroban_notes_user_${userId}`;
  }

  private loadUserNotes(userId: string) {
    try {
      const key = this.getStorageKey(userId);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = (JSON.parse(data) as StickyNote[])
          // Drop untouched sample notes that were auto-seeded by earlier versions
          .filter(n => !(n.id.startsWith('note_def_') && n.createdAt === n.updatedAt));
        this.notes.set(this.sortNotes(parsed));
        this.saveToStorage(userId, parsed);
      } else {
        this.notes.set([]);
      }
    } catch {
      this.notes.set([]);
    }
  }

  private saveCurrent() {
    const user = this.authService.currentUser();
    const userId = user?.id || user?.userName || 'guest';
    this.saveToStorage(userId, this.notes());
  }

  private saveToStorage(userId: string, items: StickyNote[]) {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save sticky notes', e);
    }
  }

  private sortNotes(items: StickyNote[]): StickyNote[] {
    return [...items].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  addNote(title: string, content: string, color: StickyNoteColor = 'yellow', isPinned: boolean = false): StickyNote {
    const newNote: StickyNote = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: title.trim() || 'ملاحظة جديدة',
      content: content.trim(),
      color,
      isPinned,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = this.sortNotes([newNote, ...this.notes()]);
    this.notes.set(updated);
    this.saveCurrent();
    return newNote;
  }

  updateNote(id: string, updates: Partial<Pick<StickyNote, 'title' | 'content' | 'color' | 'isPinned'>>) {
    const list = this.notes().map(n => {
      if (n.id === id) {
        return {
          ...n,
          ...updates,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    this.notes.set(this.sortNotes(list));
    this.saveCurrent();
  }

  togglePin(id: string) {
    const note = this.notes().find(n => n.id === id);
    if (!note) return;
    this.updateNote(id, { isPinned: !note.isPinned });
  }

  changeColor(id: string, color: StickyNoteColor) {
    this.updateNote(id, { color });
  }

  deleteNote(id: string) {
    const updated = this.notes().filter(n => n.id !== id);
    this.notes.set(updated);
    if (this.floatingNoteId() === id) {
      this.floatingNoteId.set(null);
    }
    this.saveCurrent();
  }

  toggleFloat(id: string) {
    if (this.floatingNoteId() === id) {
      this.floatingNoteId.set(null);
    } else {
      this.floatingNoteId.set(id);
    }
  }

  closeFloat() {
    this.floatingNoteId.set(null);
  }
}
