import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';
import { UserStickyNotesService } from '../../core/services/user-sticky-notes.service';
import { UserCalendarTasksService } from '../../core/services/user-calendar-tasks.service';
import { FloatingStickyNoteComponent } from '../sticky-notes/floating-sticky-note.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [
    CommonModule, 
    FloatingStickyNoteComponent
  , TranslatePipe],
  template: `
    <header class="erp-topbar">
      <!-- Search Input -->
      <div class="topbar-search">
        <i class="pi pi-search search-icon"></i>
        <input 
          type="text" 
          [placeholder]="('layout.topbar.searchAccountsEntriesCtrlK' | translate)" 
        />
      </div>

      <!-- Right Action Items -->
      <div class="topbar-actions">

        <!-- Personal Feature 1: Sticky Notes (الملاحظات اللاصقة الملونة مع الدبوس) -->
        <button 
          type="button" 
          class="topbar-tool-btn" 
          [class.active]="isNotesActive()"
          (click)="openNotesPage()"
          [title]="('layout.topbar.myPrivateStickyNotes' | translate)"
        >
          <div class="tool-icon-wrapper">
            <i class="pi pi-bookmark text-amber"></i>
            <span class="tool-badge badge-amber" *ngIf="notesService.totalCount() > 0">
              {{ notesService.totalCount() }}
            </span>
          </div>
          <span class="tool-label">{{ 'layout.topbar.notes' | translate }}</span>
        </button>

        <!-- Personal Feature 2: Calendar & Agenda (التقويم وأجندة المهام والمناسبات) -->
        <button 
          type="button" 
          class="topbar-tool-btn" 
          [class.active]="isCalendarActive()"
          (click)="openCalendarPage()"
          [title]="('layout.topbar.calendarWorkAgenda' | translate)"
        >
          <div class="tool-icon-wrapper">
            <i class="pi pi-calendar text-emerald"></i>
            <span class="tool-badge badge-emerald" *ngIf="calendarService.pendingTodayCount() > 0">
              {{ calendarService.pendingTodayCount() }}
            </span>
          </div>
          <span class="tool-label">{{ 'layout.topbar.calendar' | translate }}</span>
        </button>

        <!-- Language Switcher in Navbar -->
        <button 
          class="lang-btn" 
          (click)="langService.toggleLanguage()"
          [title]="('layout.topbar.switchToArabic' | translate)"
        >
          <svg class="lang-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span class="lang-text">{{ 'layout.topbar.label' | translate }}</span>
        </button>

        <!-- User Profile -->
        <div class="user-pill">
          <div class="user-avatar">
            <i class="pi pi-user"></i>
          </div>
          <span class="user-name">
            {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
          </span>
          <button class="logout-btn" (click)="authService.logout()" [title]="'ui.topbar.a8bdc0' | translate">
            <i class="pi pi-sign-out"></i>
          </button>
        </div>
      </div>
    </header>

    <!-- On-screen Floating Pinned Note (if user selected Float on Screen) -->
    <app-floating-sticky-note></app-floating-sticky-note>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, input, span {
      font-family: var(--font-arabic) !important;
    }

    .erp-topbar {
      height: 60px;
      background: #FFFFFF;
      border-bottom: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.75rem;
      position: sticky;
      top: 0;
      z-index: 80;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
    }

    .topbar-search {
      position: relative;
      width: 320px;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        inset-inline-start: 0.85rem;
        color: #94A3B8;
        font-size: 0.85rem;
      }

      input {
        width: 100%;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        color: #0F172A;
        font-size: 0.825rem;
        padding: 0.45rem 2.25rem;
        outline: none;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;

        &:focus {
          border-color: #10B981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
          background: #FFFFFF;
        }

        &::placeholder {
          color: #94A3B8;
        }
      }
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    /* Topbar Tool Buttons (Notes & Calendar) */
    .topbar-tool-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #334155;
      padding: 0.35rem 0.75rem;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background: #F1F5F9;
        border-color: #CBD5E1;
        color: #0F172A;
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.04);
      }

      &.active {
        background: #ECFDF5;
        border-color: #A7F3D0;
        color: #047857;
        box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.15);
      }
    }

    .tool-icon-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        font-size: 0.95rem;
      }
    }

    .text-amber {
      color: #D97706;
    }

    .text-emerald {
      color: #047857;
    }

    .tool-badge {
      position: absolute;
      top: -7px;
      inset-inline-end: -9px;
      min-width: 16px;
      height: 16px;
      border-radius: 999px;
      font-size: 0.62rem;
      font-weight: 800;
      font-family: var(--font-latin) !important;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 0.25rem;
      line-height: 1;
      border: 1.5px solid #FFFFFF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
    }

    .badge-amber {
      background: #D97706;
      color: #FFFFFF;
    }

    .badge-emerald {
      background: #047857;
      color: #FFFFFF;
    }

    .tool-label {
      font-size: 0.78rem;
      font-weight: 700;
    }

    /* Lang Btn */
    .lang-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      color: #334155;
      padding: 0.35rem 0.75rem;
      border-radius: 7px;
      font-size: 0.8rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

      .lang-icon {
        width: 15px;
        height: 15px;
        color: #0284C7;
        flex-shrink: 0;
      }

      .lang-text {
        font-family: var(--font-latin), sans-serif;
      }

      &:hover {
        border-color: #10B981;
        color: #059669;
        background: #ECFDF5;
        box-shadow: 0 1px 3px rgba(16, 185, 129, 0.12);

        .lang-icon {
          color: #059669;
        }
      }
    }

    /* User Pill */
    .user-pill {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 0.25rem 0.65rem;
      border-radius: 8px;
    }

    .user-avatar {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #ECFDF5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
    }

    .user-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #0F172A;
      max-width: 130px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .logout-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 0.15rem;
      display: flex;
      align-items: center;
      transition: color 0.15s ease;

      &:hover {
        color: #EF4444;
      }
    }
  `]
})
export class TopbarComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  router = inject(Router);

  notesService = inject(UserStickyNotesService);
  calendarService = inject(UserCalendarTasksService);

  isNotesActive(): boolean {
    return this.router.url.includes('/workspace/notes') || (this.router.url.includes('/workspace/agenda') && this.router.url.includes('tab=notes'));
  }

  isCalendarActive(): boolean {
    return this.router.url.includes('/workspace/agenda') && !this.router.url.includes('tab=notes');
  }

  openNotesPage() {
    this.router.navigate(['/workspace/notes'], { queryParams: { tab: 'notes' } });
  }

  openCalendarPage() {
    this.router.navigate(['/workspace/agenda'], { queryParams: { tab: 'calendar' } });
  }
}
