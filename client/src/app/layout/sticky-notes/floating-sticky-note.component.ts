import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserStickyNotesService } from '../../core/services/user-sticky-notes.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
  selector: 'app-floating-sticky-note',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      *ngIf="notesService.floatingNote() as note" 
      class="floating-note-card"
      [ngClass]="['color-' + note.color, isMinimized ? 'minimized' : '']"
      [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'"
    >
      <!-- Pin Header -->
      <div class="note-pin-header">
        <div class="pin-title-zone" (click)="toggleMinimize()">
          <i class="pi pi-thumbtack text-red-600 pin-icon"></i>
          <strong class="floating-title">{{ note.title }}</strong>
        </div>

        <div class="floating-actions">
          <button type="button" class="btn-float-tool" (click)="toggleMinimize()" [title]="isMinimized ? 'تكبير' : 'تصغير'">
            <i class="pi" [ngClass]="isMinimized ? 'pi-window-maximize' : 'pi-minus'"></i>
          </button>
          <button type="button" class="btn-float-tool" (click)="notesService.closeFloat()" title="إغلاق التعليق">
            <i class="pi pi-times"></i>
          </button>
        </div>
      </div>

      <!-- Note Body -->
      <div class="note-body" *ngIf="!isMinimized">
        <p class="floating-content">{{ note.content }}</p>
      </div>

      <!-- Footer -->
      <div class="note-foot" *ngIf="!isMinimized">
        <span class="foot-tag">ملاحظة معلقة على الشاشة</span>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    .floating-note-card {
      position: fixed;
      bottom: 24px;
      inset-inline-end: 24px;
      width: 300px;
      max-width: 90vw;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18), 0 4px 10px rgba(0, 0, 0, 0.1);
      z-index: 999;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      animation: popUp 0.25s ease-out;
    }

    .floating-note-card.minimized {
      width: 220px;
      padding: 0.5rem 0.85rem;
    }

    @keyframes popUp {
      from { transform: translateY(20px) scale(0.9); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }

    .note-pin-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }

    .pin-title-zone {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      overflow: hidden;
      flex: 1;
    }

    .pin-icon {
      font-size: 0.95rem;
      transform: rotate(-35deg);
      filter: drop-shadow(0 2px 2px rgba(220, 38, 38, 0.4));
      color: #DC2626;
    }

    .floating-title {
      font-size: 0.82rem;
      font-weight: 800;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .floating-actions {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }

    .btn-float-tool {
      background: rgba(255, 255, 255, 0.6);
      border: none;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      color: #475569;
      cursor: pointer;
    }

    .btn-float-tool:hover {
      background: #FFFFFF;
      color: #0F172A;
    }

    .note-body {
      max-height: 200px;
      overflow-y: auto;
      padding-top: 0.2rem;
    }

    .floating-content {
      margin: 0;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #1E293B;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .note-foot {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid rgba(0, 0, 0, 0.06);
      padding-top: 0.3rem;
      margin-top: 0.2rem;
    }

    .foot-tag {
      font-size: 0.62rem;
      color: #64748B;
      font-weight: 700;
    }

    /* Colors */
    .color-yellow { background-color: #FEF9C3; border-color: #FDE047; }
    .color-emerald { background-color: #DCFCE7; border-color: #86EFAC; }
    .color-sky { background-color: #E0F2FE; border-color: #7DD3FC; }
    .color-rose { background-color: #FFE4E6; border-color: #FDA4AF; }
    .color-purple { background-color: #F3E8FF; border-color: #D8B4FE; }
    .color-amber { background-color: #FFEDD5; border-color: #FDBA74; }
  `]
})
export class FloatingStickyNoteComponent {
  notesService = inject(UserStickyNotesService);
  langService = inject(LanguageService);

  isMinimized = false;

  toggleMinimize() {
    this.isMinimized = !this.isMinimized;
  }
}
