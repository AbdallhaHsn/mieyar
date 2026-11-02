import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserStickyNotesService, StickyNote, StickyNoteColor } from '../../core/services/user-sticky-notes.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-sticky-notes-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <!-- Backdrop -->
    <div class="drawer-backdrop" (click)="close()">
      <!-- Drawer Panel -->
      <aside class="drawer-panel" (click)="$event.stopPropagation()" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
        
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-info">
            <div class="header-icon-badge">
              <i class="pi pi-bookmark"></i>
            </div>
            <div>
              <div class="header-title-row">
                <h3 class="header-title">
                  {{ 'layout.stickyNotes.myStickyNotes' | translate }}
                </h3>
                <span class="private-badge" [title]="'ui.stickyNotesDrawer.be8c8e' | translate">
                  <i class="pi pi-lock"></i>
                  <span>{{ 'layout.stickyNotes.private' | translate }}</span>
                </span>
              </div>
              <p class="header-subtitle">
                {{ 'layout.stickyNotes.writeAndPinPersonalAccounting' | translate }}
              </p>
            </div>
          </div>

          <div class="header-actions">
            <button type="button" class="btn-new-note" (click)="toggleCreateForm()">
              <i class="pi" [ngClass]="showCreate() ? 'pi-minus' : 'pi-plus'"></i>
              <span>{{ showCreate() ? ('layout.stickyNotes.cancel' | translate) : ('layout.stickyNotes.newNote' | translate) }}</span>
            </button>
            <button type="button" class="btn-close-drawer" (click)="close()" [title]="'common.close' | translate">
              <i class="pi pi-times"></i>
            </button>
          </div>
        </div>

        <!-- Create Note Box (Collapsible) -->
        <div class="create-note-box" *ngIf="showCreate()">
          <div class="create-header">
            <span class="create-lbl">{{ 'layout.stickyNotes.addNewStickyNote' | translate }}</span>
            <!-- Color Selector -->
            <div class="color-palette">
              <button 
                type="button" 
                *ngFor="let c of colorList" 
                class="color-dot" 
                [ngClass]="['color-' + c, newColor === c ? 'active-color' : '']"
                (click)="newColor = c"
                [title]="c">
              </button>
            </div>
          </div>

          <input 
            type="text" 
            class="note-title-input" 
            [(ngModel)]="newTitle" 
            [placeholder]="('layout.stickyNotes.noteTitleOptional' | translate)" 
          />

          <textarea 
            rows="3" 
            class="note-content-input" 
            [(ngModel)]="newContent" 
            [placeholder]="('layout.stickyNotes.writeNoteContentHere' | translate)">
          </textarea>

          <div class="create-footer">
            <label class="pin-checkbox-lbl">
              <input type="checkbox" [(ngModel)]="newIsPinned" />
              <i class="pi pi-thumbtack text-amber"></i>
              <span>{{ 'layout.stickyNotes.pinNoteToTop' | translate }}</span>
            </label>

            <button type="button" class="btn-save-note" (click)="saveNewNote()" [disabled]="!newContent.trim() && !newTitle.trim()">
              <i class="pi pi-check"></i>
              <span>{{ 'layout.stickyNotes.saveNote' | translate }}</span>
            </button>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="filter-bar">
          <div class="search-box">
            <i class="pi pi-search"></i>
            <input 
              type="text" 
              [(ngModel)]="searchTerm" 
              [placeholder]="('layout.stickyNotes.searchNotes' | translate)" 
            />
            <button *ngIf="searchTerm" type="button" class="clear-search" (click)="searchTerm = ''">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="color-filter-pills">
            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="selectedColorFilter === 'all'" 
              (click)="selectedColorFilter = 'all'">
              {{ 'layout.stickyNotes.all' | translate }} ({{ notesService.totalCount() }})
            </button>

            <button 
              type="button" 
              class="pill-btn" 
              [class.active]="selectedColorFilter === 'pinned'" 
              (click)="selectedColorFilter = 'pinned'">
              <i class="pi pi-thumbtack"></i>
              {{ 'layout.stickyNotes.pinned' | translate }} ({{ notesService.pinnedCount() }})
            </button>

            <button 
              type="button" 
              *ngFor="let c of colorList" 
              class="color-filter-dot" 
              [ngClass]="['color-' + c, selectedColorFilter === c ? 'selected-filter' : '']"
              (click)="selectedColorFilter = selectedColorFilter === c ? 'all' : c"
              [title]="c">
            </button>
          </div>
        </div>

        <!-- Notes Masonry Grid -->
        <div class="notes-content-scroll">
          <div class="empty-notes" *ngIf="filteredNotes().length === 0">
            <div class="empty-icon-box">
              <i class="pi pi-file-edit"></i>
            </div>
            <h4>{{ 'layout.stickyNotes.noNotesFound' | translate }}</h4>
            <p>{{ 'layout.stickyNotes.clickNewNoteToCreate' | translate }}</p>
          </div>

          <div class="notes-grid" *ngIf="filteredNotes().length > 0">
            <article 
              *ngFor="let note of filteredNotes()" 
              class="sticky-card" 
              [ngClass]="['color-' + note.color, note.isPinned ? 'is-pinned' : '']"
            >
              <!-- Pin Emblem -->
              <div class="pin-zone">
                <button 
                  type="button" 
                  class="pin-btn" 
                  [class.pinned]="note.isPinned"
                  (click)="notesService.togglePin(note.id)" 
                  [title]="note.isPinned ? ('layout.stickyNotes.unpin' | translate) : ('layout.stickyNotes.pinToTop' | translate)"
                >
                  <i class="pi pi-thumbtack"></i>
                </button>
              </div>

              <!-- Note Header -->
              <div class="card-header">
                <strong class="card-title" *ngIf="!editingNoteId || editingNoteId !== note.id">
                  {{ note.title || ('layout.stickyNotes.note' | translate) }}
                </strong>
                <input 
                  type="text" 
                  *ngIf="editingNoteId === note.id" 
                  class="edit-title-input" 
                  [(ngModel)]="editTitle" 
                />
              </div>

              <!-- Note Content Body -->
              <div class="card-body">
                <p class="card-text" *ngIf="!editingNoteId || editingNoteId !== note.id">
                  {{ note.content }}
                </p>
                <textarea 
                  *ngIf="editingNoteId === note.id" 
                  rows="3" 
                  class="edit-content-input" 
                  [(ngModel)]="editContent">
                </textarea>
              </div>

              <!-- Card Footer & Tools -->
              <div class="card-footer">
                <div class="card-meta">
                  <span class="card-date">{{ note.updatedAt | date:'MM/dd HH:mm' }}</span>
                </div>

                <div class="card-actions" *ngIf="!editingNoteId || editingNoteId !== note.id">
                  <!-- Floating Pin on Screen Toggle -->
                  <button 
                    type="button" 
                    class="action-icon-btn" 
                    [class.active-float]="notesService.floatingNoteId() === note.id"
                    (click)="notesService.toggleFloat(note.id)" 
                    [title]="notesService.floatingNoteId() === note.id ? ('layout.stickyNotes.unfloat' | translate) : ('layout.stickyNotes.floatOnScreen' | translate)"
                  >
                    <i class="pi pi-external-link"></i>
                  </button>

                  <!-- Color Swatches Drop -->
                  <div class="color-quick-picker">
                    <button 
                      type="button" 
                      *ngFor="let c of colorList" 
                      class="mini-color-dot" 
                      [ngClass]="'color-' + c"
                      (click)="notesService.changeColor(note.id, c)"
                      [title]="c">
                    </button>
                  </div>

                  <!-- Edit -->
                  <button type="button" class="action-icon-btn" (click)="startEdit(note)" [title]="'common.edit' | translate">
                    <i class="pi pi-pencil"></i>
                  </button>

                  <!-- Delete -->
                  <button type="button" class="action-icon-btn delete-btn" (click)="notesService.deleteNote(note.id)" [title]="'common.delete' | translate">
                    <i class="pi pi-trash"></i>
                  </button>
                </div>

                <!-- Editing mode actions -->
                <div class="card-actions" *ngIf="editingNoteId === note.id">
                  <button type="button" class="btn-edit-save" (click)="saveEdit(note.id)">
                    <i class="pi pi-check"></i>
                  </button>
                  <button type="button" class="btn-edit-cancel" (click)="cancelEdit()">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>

            </article>
          </div>
        </div>

      </aside>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    .drawer-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(3px);
      z-index: 1000;
      display: flex;
      justify-content: flex-end;
      animation: fadeIn 0.2s ease-out;
    }

    [dir="ltr"] .drawer-backdrop {
      justify-content: flex-start;
    }

    .drawer-panel {
      width: 460px;
      max-width: 95vw;
      height: 100vh;
      background: #FFFFFF;
      box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    [dir="ltr"] .drawer-panel {
      animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 10px 0 30px rgba(0, 0, 0, 0.15);
    }

    @keyframes slideInRight {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    @keyframes slideInLeft {
      from { transform: translateX(-100%); }
      to { transform: translateX(0); }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* Header */
    .drawer-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E2E8F0;
      background: #FAFAFA;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .header-info {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }

    .header-icon-badge {
      width: 42px;
      height: 42px;
      border-radius: 10px;
      background: #FEF3C7;
      border: 1px solid #FDE68A;
      color: #D97706;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      flex-shrink: 0;
    }

    .header-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .header-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: #0F172A;
    }

    .private-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #ECFDF5;
      color: #059669;
      border: 1px solid #A7F3D0;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
    }

    .header-subtitle {
      margin: 0.25rem 0 0 0;
      font-size: 0.76rem;
      color: #64748B;
      line-height: 1.4;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-new-note {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #047857;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.5rem 0.85rem;
      font-size: 0.82rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-new-note:hover {
      background: #065F46;
      transform: translateY(-1px);
    }

    .btn-close-drawer {
      background: transparent;
      border: 1px solid #E2E8F0;
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748B;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-close-drawer:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    /* Create Note Box */
    .create-note-box {
      margin: 1rem 1.5rem 0.5rem 1.5rem;
      padding: 1rem;
      background: #FEFCE8;
      border: 1.5px dashed #FDE047;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      box-shadow: 0 4px 12px rgba(234, 179, 8, 0.1);
      animation: fadeIn 0.2s ease-out;
    }

    .create-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .create-lbl {
      font-size: 0.8rem;
      font-weight: 800;
      color: #713F12;
    }

    .color-palette {
      display: flex;
      gap: 0.35rem;
    }

    .color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }

    .color-dot:hover {
      transform: scale(1.15);
    }

    .color-dot.active-color {
      border: 2px solid #0F172A;
      transform: scale(1.2);
    }

    .note-title-input {
      width: 100%;
      padding: 0.45rem 0.65rem;
      background: #FFFFFF;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #0F172A;
      box-sizing: border-box;
    }

    .note-title-input:focus {
      outline: none;
      border-color: #D97706;
    }

    .note-content-input {
      width: 100%;
      padding: 0.5rem 0.65rem;
      background: #FFFFFF;
      border: 1px solid #FDE68A;
      border-radius: 6px;
      font-size: 0.82rem;
      color: #1E293B;
      resize: vertical;
      box-sizing: border-box;
      line-height: 1.5;
    }

    .note-content-input:focus {
      outline: none;
      border-color: #D97706;
    }

    .create-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .pin-checkbox-lbl {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.76rem;
      font-weight: 700;
      color: #713F12;
      cursor: pointer;
    }

    .btn-save-note {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #D97706;
      color: #FFFFFF;
      border: none;
      padding: 0.45rem 0.85rem;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-save-note:hover:not(:disabled) {
      background: #B45309;
    }

    .btn-save-note:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Filter Bar */
    .filter-bar {
      padding: 0.75rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box i {
      position: absolute;
      inset-inline-start: 0.75rem;
      color: #94A3B8;
      font-size: 0.82rem;
    }

    .search-box input {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.45rem 2rem;
      font-size: 0.8rem;
      color: #0F172A;
      box-sizing: border-box;
    }

    .search-box input:focus {
      outline: none;
      border-color: #047857;
      background: #FFFFFF;
    }

    .clear-search {
      position: absolute;
      inset-inline-end: 0.65rem;
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
    }

    .color-filter-pills {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #F1F5F9;
      border: 1px solid #E2E8F0;
      border-radius: 999px;
      padding: 0.2rem 0.6rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .pill-btn.active {
      background: #047857;
      border-color: #047857;
      color: #FFFFFF;
    }

    .color-filter-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }

    .color-filter-dot.selected-filter {
      border: 2px solid #0F172A;
      transform: scale(1.2);
    }

    /* Notes Content Scroll */
    .notes-content-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 1.5rem;
    }

    .empty-notes {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      color: #64748B;
    }

    .empty-icon-box {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      background: #FEF3C7;
      color: #D97706;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      margin-bottom: 0.85rem;
    }

    .empty-notes h4 {
      margin: 0 0 0.35rem 0;
      font-size: 0.95rem;
      color: #1E293B;
    }

    .empty-notes p {
      margin: 0;
      font-size: 0.8rem;
      line-height: 1.5;
      max-width: 280px;
    }

    /* Notes Grid & Sticky Cards */
    .notes-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .sticky-card {
      position: relative;
      border-radius: 10px;
      padding: 1.1rem 1.1rem 0.85rem 1.1rem;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.08);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid rgba(0, 0, 0, 0.07);
    }

    .sticky-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 18px rgba(0, 0, 0, 0.1);
    }

    .sticky-card.is-pinned {
      border-top: 4px solid #EF4444;
      box-shadow: 0 6px 16px rgba(239, 68, 68, 0.15), 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    /* Pin Zone */
    .pin-zone {
      position: absolute;
      top: 0.6rem;
      inset-inline-end: 0.75rem;
    }

    .pin-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      font-size: 1.05rem;
      cursor: pointer;
      padding: 0.2rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .pin-btn:hover {
      color: #EF4444;
      transform: scale(1.15);
    }

    .pin-btn.pinned {
      color: #DC2626;
      transform: rotate(-35deg) scale(1.2);
      filter: drop-shadow(0 2px 3px rgba(220, 38, 38, 0.35));
    }

    /* Card Details */
    .card-header {
      padding-inline-end: 2rem;
    }

    .card-title {
      font-size: 0.92rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.35;
      display: block;
    }

    .card-body {
      margin: 0.2rem 0;
    }

    .card-text {
      margin: 0;
      font-size: 0.82rem;
      line-height: 1.6;
      color: #1E293B;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .edit-title-input {
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 0.3rem 0.5rem;
      font-size: 0.85rem;
      font-weight: 700;
      box-sizing: border-box;
    }

    .edit-content-input {
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 4px;
      padding: 0.4rem 0.5rem;
      font-size: 0.8rem;
      line-height: 1.5;
      box-sizing: border-box;
      resize: vertical;
    }

    /* Card Footer */
    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.35rem;
      padding-top: 0.45rem;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
    }

    .card-date {
      font-size: 0.68rem;
      color: #64748B;
      font-family: var(--font-latin) !important;
      font-weight: 600;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .action-icon-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.6);
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.72rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .action-icon-btn:hover {
      background: #FFFFFF;
      color: #0F172A;
      transform: scale(1.08);
    }

    .action-icon-btn.active-float {
      background: #047857;
      color: #FFFFFF;
    }

    .action-icon-btn.delete-btn:hover {
      color: #DC2626;
      background: #FEE2E2;
    }

    .color-quick-picker {
      display: flex;
      gap: 0.2rem;
      background: rgba(255, 255, 255, 0.5);
      padding: 0.15rem 0.3rem;
      border-radius: 999px;
    }

    .mini-color-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .mini-color-dot:hover {
      transform: scale(1.3);
    }

    .btn-edit-save {
      background: #047857;
      color: #FFFFFF;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-edit-cancel {
      background: #E2E8F0;
      color: #475569;
      border: none;
      border-radius: 4px;
      padding: 0.25rem 0.55rem;
      font-size: 0.75rem;
      cursor: pointer;
    }

    /* Note Color Variations */
    .color-yellow { background-color: #FEF9C3; border-color: #FDE047; }
    .color-emerald { background-color: #DCFCE7; border-color: #86EFAC; }
    .color-sky { background-color: #E0F2FE; border-color: #7DD3FC; }
    .color-rose { background-color: #FFE4E6; border-color: #FDA4AF; }
    .color-purple { background-color: #F3E8FF; border-color: #D8B4FE; }
    .color-amber { background-color: #FFEDD5; border-color: #FDBA74; }
  `]
})
export class StickyNotesDrawerComponent {
  notesService = inject(UserStickyNotesService);
  langService = inject(LanguageService);

  showCreate = signal<boolean>(false);
  searchTerm = '';
  selectedColorFilter: string = 'all';

  // New Note Form
  newTitle = '';
  newContent = '';
  newColor: StickyNoteColor = 'yellow';
  newIsPinned = false;

  // Edit Mode
  editingNoteId: string | null = null;
  editTitle = '';
  editContent = '';

  colorList: StickyNoteColor[] = ['yellow', 'emerald', 'sky', 'rose', 'purple', 'amber'];

  filteredNotes = computed(() => {
    let list = this.notesService.notes();

    // Color filter
    if (this.selectedColorFilter === 'pinned') {
      list = list.filter(n => n.isPinned);
    } else if (this.selectedColorFilter !== 'all') {
      list = list.filter(n => n.color === this.selectedColorFilter);
    }

    // Search query
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(n => 
        (n.title && n.title.toLowerCase().includes(term)) || 
        (n.content && n.content.toLowerCase().includes(term))
      );
    }

    return list;
  });

  toggleCreateForm() {
    this.showCreate.set(!this.showCreate());
    if (this.showCreate()) {
      this.newTitle = '';
      this.newContent = '';
      this.newColor = 'yellow';
      this.newIsPinned = false;
    }
  }

  saveNewNote() {
    if (!this.newContent.trim() && !this.newTitle.trim()) return;
    this.notesService.addNote(this.newTitle, this.newContent, this.newColor, this.newIsPinned);
    this.showCreate.set(false);
    this.newTitle = '';
    this.newContent = '';
  }

  startEdit(note: StickyNote) {
    this.editingNoteId = note.id;
    this.editTitle = note.title;
    this.editContent = note.content;
  }

  saveEdit(id: string) {
    this.notesService.updateNote(id, {
      title: this.editTitle,
      content: this.editContent
    });
    this.editingNoteId = null;
  }

  cancelEdit() {
    this.editingNoteId = null;
  }

  closed = output<void>();

  close() {
    this.closed.emit();
  }
}
