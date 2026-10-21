import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { UserCalendarTasksService, CalendarTask, TaskPriority, TaskCategory, TaskItemType } from '../../core/services/user-calendar-tasks.service';
import { UserStickyNotesService, StickyNote, StickyNoteColor } from '../../core/services/user-sticky-notes.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../../core/services/auth.service';

interface FullCalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tasks: CalendarTask[];
}

@Component({
  selector: 'app-personal-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="workspace-page" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Top Breadcrumb & Hero Header -->
      <header class="workspace-header">
        <div class="header-breadcrumb">
          <a routerLink="/dashboard" class="bc-link">
            <i class="pi pi-home"></i>
            <span>{{ langService.currentLang() === 'ar' ? 'الرئيسية' : 'Home' }}</span>
          </a>
          <span class="bc-sep">/</span>
          <span class="bc-current">{{ langService.currentLang() === 'ar' ? 'مكتب العمل والأجندة الشخصية' : 'Personal Workspace & Agenda' }}</span>
        </div>

        <div class="header-main-row">
          <div class="header-titles">
            <div class="title-with-badge">
              <h1 class="page-title">
                {{ langService.currentLang() === 'ar' ? 'مكتب العمل الشخصي: التقويم والملاحظات' : 'My Personal Desk: Calendar & Notes' }}
              </h1>
              <span class="private-shield-badge" title="هذه البيانات مشفرة وخاصة بحسابك فقط">
                <i class="pi pi-shield"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'خاص وسري بحسابك فقط' : 'Private to your account' }}</span>
              </span>
            </div>
            <p class="page-subtitle">
              {{ langService.currentLang() === 'ar' 
                ? 'تنظيم وجدولة مهامك ومواعيدك المحاسبية، وتدوين الملاحظات اللاصقة الملونة مع إمكانية تثبيتها بالدبوس' 
                : 'Manage your daily accounting tasks, schedule occasions, and pin colorful sticky notes' }}
            </p>
          </div>

          <!-- Main Tab Switcher -->
          <div class="workspace-tabs-pill">
            <button 
              type="button" 
              class="tab-pill-btn" 
              [class.active]="activeTab() === 'calendar'" 
              (click)="switchTab('calendar')">
              <i class="pi pi-calendar"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'التقويم وأجندة العمل' : 'Calendar & Agenda' }}</span>
              <span class="tab-badge badge-emerald" *ngIf="calendarService.pendingTodayCount() > 0">
                {{ calendarService.pendingTodayCount() }}
              </span>
            </button>

            <button 
              type="button" 
              class="tab-pill-btn" 
              [class.active]="activeTab() === 'notes'" 
              (click)="switchTab('notes')">
              <i class="pi pi-bookmark"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'الملاحظات اللاصقة' : 'Sticky Notes' }}</span>
              <span class="tab-badge badge-amber" *ngIf="notesService.totalCount() > 0">
                {{ notesService.totalCount() }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <!-- ========================================== -->
      <!-- TAB 1: CALENDAR & WORK AGENDA (FULL PAGE)  -->
      <!-- ========================================== -->
      <section class="tab-content-area" *ngIf="activeTab() === 'calendar'">
        
        <!-- Calendar Control Strip -->
        <div class="cal-control-strip">
          <div class="month-nav-box">
            <div class="month-label">
              <h2>{{ getMonthName() }} {{ currentYear() }}</h2>
            </div>

            <div class="nav-buttons-cluster">
              <button type="button" class="btn-cal-jump-today" (click)="jumpToToday()">
                <i class="pi pi-compass"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'اليوم' : 'Today' }}</span>
              </button>

              <div class="arrows-pair">
                <button type="button" class="btn-cal-nav" (click)="prevMonth()" title="الشهر السابق">
                  <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
                </button>
                <button type="button" class="btn-cal-nav" (click)="nextMonth()" title="الشهر التالي">
                  <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-chevron-left' : 'pi-chevron-right'"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- KPI Summary Strip -->
          <div class="cal-kpi-row">
            <div class="cal-kpi-pill">
              <span class="kpi-bullet bullet-emerald"></span>
              <span class="kpi-num">{{ calendarService.pendingTodayCount() }}</span>
              <span class="kpi-text">{{ langService.currentLang() === 'ar' ? 'مهام اليوم المتبقية' : "Today's Pending" }}</span>
            </div>

            <div class="cal-kpi-pill">
              <span class="kpi-bullet bullet-rose"></span>
              <span class="kpi-num">{{ calendarService.urgentCount() }}</span>
              <span class="kpi-text">{{ langService.currentLang() === 'ar' ? 'مهام عاجلة' : 'Urgent' }}</span>
            </div>

            <div class="cal-kpi-pill">
              <span class="kpi-bullet bullet-cyan"></span>
              <span class="kpi-num">{{ calendarService.completionRate() }}%</span>
              <span class="kpi-text">{{ langService.currentLang() === 'ar' ? 'نسبة الإنجاز' : 'Completion' }}</span>
            </div>

            <!-- Primary Add Button -->
            <button type="button" class="btn-primary-add" (click)="openDirectAddModal(calendarService.todayStr)">
              <i class="pi pi-plus"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إضافة مهمة / مناسبة' : 'Add Task / Event' }}</span>
            </button>
          </div>
        </div>

        <!-- Hint Banner -->
        <div class="calendar-hint-banner">
          <i class="pi pi-info-circle text-emerald"></i>
          <span>
            {{ langService.currentLang() === 'ar' 
              ? 'تلميح: انقر على أي تاريخ لاستعراض مهامه ومناسباته، أو انقر على تاريخ فارغ لإضافة موعد جديد مباشرة.' 
              : 'Tip: Click any date to view scheduled tasks/occasions, or click an empty date to schedule a new one directly.' }}
          </span>
        </div>

        <!-- Full Month Grid Table -->
        <div class="large-calendar-board">
          <!-- Weekday Headers -->
          <div class="cal-week-headers">
            <div class="week-header-cell" *ngFor="let w of weekDays">{{ w }}</div>
          </div>

          <!-- Days Grid Cells -->
          <div class="cal-days-matrix">
            <div 
              *ngFor="let day of fullCalendarDays()" 
              class="matrix-day-cell" 
              [class.other-month]="!day.isCurrentMonth"
              [class.is-today]="day.isToday"
              [class.has-items]="day.tasks.length > 0"
              (click)="onDateCellClicked(day)"
            >
              <!-- Cell Top Row -->
              <div class="day-cell-top">
                <span class="day-num-badge" [class.today-badge]="day.isToday">{{ day.dayNum }}</span>
                
                <span class="quick-plus-btn" title="إضافة مهمة لهذا اليوم">
                  <i class="pi pi-plus"></i>
                </span>
              </div>

              <!-- Cell Content / Chips -->
              <div class="day-cell-items">
                <!-- Up to 3 task chips -->
                <div 
                  *ngFor="let item of day.tasks.slice(0, 3)" 
                  class="task-chip" 
                  [ngClass]="[item.completed ? 'chip-completed' : '', 'prio-' + item.priority, item.itemType === 'occasion' ? 'chip-occasion' : '']"
                  [title]="item.title"
                >
                  <i class="pi" [ngClass]="item.itemType === 'occasion' ? 'pi-flag' : (item.completed ? 'pi-check' : 'pi-circle-fill')"></i>
                  <span class="chip-text">{{ item.title }}</span>
                  <small class="chip-time" *ngIf="item.time">{{ item.time }}</small>
                </div>

                <!-- More items indicator -->
                <div class="more-items-chip" *ngIf="day.tasks.length > 3">
                  +{{ day.tasks.length - 3 }} {{ langService.currentLang() === 'ar' ? 'أخرى' : 'more' }}
                </div>
              </div>

            </div>
          </div>
        </div>

      </section>

      <!-- ========================================== -->
      <!-- TAB 2: STICKY NOTES PINBOARD (FULL PAGE)   -->
      <!-- ========================================== -->
      <section class="tab-content-area" *ngIf="activeTab() === 'notes'">
        
        <!-- Sticky Notes Toolbar -->
        <div class="notes-page-toolbar">
          <div class="notes-search-box">
            <i class="pi pi-search"></i>
            <input 
              type="text" 
              [(ngModel)]="notesSearchTerm" 
              [placeholder]="langService.currentLang() === 'ar' ? 'بحث في نصوص وعناوين الملاحظات...' : 'Search sticky notes...'" 
            />
            <button *ngIf="notesSearchTerm" type="button" class="clear-search-btn" (click)="notesSearchTerm = ''">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <div class="notes-filter-cluster">
            <button 
              type="button" 
              class="filter-pill-btn" 
              [class.active]="selectedColorFilter === 'all'" 
              (click)="selectedColorFilter = 'all'">
              {{ langService.currentLang() === 'ar' ? 'الكل' : 'All' }} ({{ notesService.totalCount() }})
            </button>

            <button 
              type="button" 
              class="filter-pill-btn" 
              [class.active]="selectedColorFilter === 'pinned'" 
              (click)="selectedColorFilter = 'pinned'">
              <i class="pi pi-thumbtack text-rose"></i>
              {{ langService.currentLang() === 'ar' ? 'المثبتة' : 'Pinned' }} ({{ notesService.pinnedCount() }})
            </button>

            <div class="color-swatches-row">
              <button 
                type="button" 
                *ngFor="let c of colorList" 
                class="swatch-btn" 
                [ngClass]="['color-' + c, selectedColorFilter === c ? 'swatch-active' : '']"
                (click)="selectedColorFilter = selectedColorFilter === c ? 'all' : c"
                [title]="c">
              </button>
            </div>
          </div>

          <!-- Add Note Button -->
          <button type="button" class="btn-primary-add" (click)="toggleNoteCreateBox()">
            <i class="pi" [ngClass]="showNoteCreateBox ? 'pi-times' : 'pi-plus'"></i>
            <span>{{ showNoteCreateBox ? (langService.currentLang() === 'ar' ? 'إلغاء' : 'Cancel') : (langService.currentLang() === 'ar' ? 'ملاحظة لاصقة جديدة' : 'New Sticky Note') }}</span>
          </button>
        </div>

        <!-- Inline Note Creator Form (Expanded) -->
        <div class="note-creator-banner" *ngIf="showNoteCreateBox">
          <div class="creator-header">
            <strong>{{ langService.currentLang() === 'ar' ? 'قصاصة ملاحظة جديدة' : 'New Note Card' }}</strong>
            <div class="color-picker-row">
              <button 
                type="button" 
                *ngFor="let c of colorList" 
                class="color-pick-circle" 
                [ngClass]="['color-' + c, newNoteColor === c ? 'active' : '']"
                (click)="newNoteColor = c">
              </button>
            </div>
          </div>

          <div class="creator-fields">
            <input 
              type="text" 
              class="creator-title-input" 
              [(ngModel)]="newNoteTitle" 
              [placeholder]="langService.currentLang() === 'ar' ? 'عنوان الملاحظة (مثال: أرقام هواتف الموردين، حسابات وسيطة)...' : 'Note Title...'" 
            />

            <textarea 
              rows="3" 
              class="creator-text-input" 
              [(ngModel)]="newNoteContent" 
              [placeholder]="langService.currentLang() === 'ar' ? 'اكتب ملاحظتك، أفكارك، أو بنود المراجعة هنا...' : 'Write note content here...'">
            </textarea>
          </div>

          <div class="creator-footer">
            <label class="pin-checkbox-label">
              <input type="checkbox" [(ngModel)]="newNoteIsPinned" />
              <i class="pi pi-thumbtack text-rose"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'تثبيت الملاحظة بالدبوس في أعلى اللوحة (Pin)' : 'Pin Note to Top' }}</span>
            </label>

            <button type="button" class="btn-save-note-action" (click)="saveStickyNote()" [disabled]="!newNoteTitle.trim() && !newNoteContent.trim()">
              <i class="pi pi-check"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'حفظ الملاحظة' : 'Save Note' }}</span>
            </button>
          </div>
        </div>

        <!-- Notes Corkboard Grid -->
        <div class="notes-pinboard-grid">
          <div class="empty-board-state" *ngIf="filteredStickyNotes().length === 0">
            <div class="empty-icon-wrapper">
              <i class="pi pi-file-edit"></i>
            </div>
            <h3>{{ langService.currentLang() === 'ar' ? 'لا توجد ملاحظات لاصقة تطابق اختيارك' : 'No sticky notes found' }}</h3>
            <p>{{ langService.currentLang() === 'ar' ? 'انقر على "ملاحظة لاصقة جديدة" لتدوين أفكارك وتثبيتها بالألوان' : 'Click "New Sticky Note" to add your thoughts' }}</p>
          </div>

          <!-- Card -->
          <article 
            *ngFor="let note of filteredStickyNotes()" 
            class="full-sticky-card" 
            [ngClass]="['color-' + note.color, note.isPinned ? 'pinned-card' : '']"
          >
            <!-- 3D Metallic Pin -->
            <div class="pin-thumbtack-wrapper">
              <button 
                type="button" 
                class="thumbtack-btn" 
                [class.pinned]="note.isPinned"
                (click)="notesService.togglePin(note.id)" 
                [title]="note.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى بالدبوس'"
              >
                <i class="pi pi-thumbtack"></i>
              </button>
            </div>

            <!-- Card Header -->
            <div class="card-top">
              <h4 class="note-card-title" *ngIf="editingNoteId !== note.id">
                {{ note.title || (langService.currentLang() === 'ar' ? 'ملاحظة' : 'Note') }}
              </h4>
              <input 
                type="text" 
                *ngIf="editingNoteId === note.id" 
                class="edit-input-field" 
                [(ngModel)]="editNoteTitle" 
              />
            </div>

            <!-- Card Body -->
            <div class="card-middle">
              <p class="note-card-text" *ngIf="editingNoteId !== note.id">
                {{ note.content }}
              </p>
              <textarea 
                *ngIf="editingNoteId === note.id" 
                rows="4" 
                class="edit-textarea-field" 
                [(ngModel)]="editNoteContent">
              </textarea>
            </div>

            <!-- Card Footer -->
            <div class="card-bottom">
              <span class="note-timestamp font-mono">{{ note.updatedAt | date:'yyyy-MM-dd HH:mm' }}</span>

              <div class="note-actions-strip" *ngIf="editingNoteId !== note.id">
                <!-- Float on Screen Button -->
                <button 
                  type="button" 
                  class="card-tool-btn" 
                  [class.active-float]="notesService.floatingNoteId() === note.id"
                  (click)="notesService.toggleFloat(note.id)" 
                  [title]="notesService.floatingNoteId() === note.id ? 'إلغاء التعليق على الشاشة' : 'تعليق ومتابعة على الشاشة'"
                >
                  <i class="pi pi-external-link"></i>
                </button>

                <!-- Color dots -->
                <div class="mini-swatches">
                  <button 
                    type="button" 
                    *ngFor="let c of colorList" 
                    class="mini-swatch" 
                    [ngClass]="'color-' + c"
                    (click)="notesService.changeColor(note.id, c)"
                    [title]="c">
                  </button>
                </div>

                <!-- Edit -->
                <button type="button" class="card-tool-btn" (click)="startEditNote(note)" title="تعديل">
                  <i class="pi pi-pencil"></i>
                </button>

                <!-- Delete -->
                <button type="button" class="card-tool-btn delete-btn" (click)="notesService.deleteNote(note.id)" title="حذف">
                  <i class="pi pi-trash"></i>
                </button>
              </div>

              <!-- Editing action buttons -->
              <div class="note-actions-strip" *ngIf="editingNoteId === note.id">
                <button type="button" class="btn-save-edit" (click)="saveEditNote(note.id)">
                  <i class="pi pi-check"></i>
                </button>
                <button type="button" class="btn-cancel-edit" (click)="cancelEditNote()">
                  <i class="pi pi-times"></i>
                </button>
              </div>
            </div>

          </article>
        </div>

      </section>

      <!-- ============================================================== -->
      <!-- MODAL A: DAY DETAILS (عند الضغط على تاريخ يحتوي على مهام/مناسبات) -->
      <!-- ============================================================== -->
      <div class="modal-backdrop" *ngIf="showDayDetailsModal" (click)="closeDayDetailsModal()">
        <div class="day-details-dialog" (click)="$event.stopPropagation()">
          
          <div class="dialog-header">
            <div class="dialog-title-info">
              <div class="dialog-icon-badge">
                <i class="pi pi-calendar"></i>
              </div>
              <div>
                <h3 class="dialog-title">
                  {{ langService.currentLang() === 'ar' ? 'مهام ومناسبات يوم:' : 'Tasks & Occasions on:' }}
                  <span class="highlight-date font-mono">{{ activeModalDate }}</span>
                </h3>
                <span class="dialog-subtitle">
                  {{ activeModalTasks.length }} {{ langService.currentLang() === 'ar' ? 'مواعيد ومهام مجدولة' : 'scheduled items' }}
                </span>
              </div>
            </div>

            <button type="button" class="btn-dialog-close" (click)="closeDayDetailsModal()">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Dialog Body: List of Items -->
          <div class="dialog-body-scroll">
            <div class="items-list-container">
              <div 
                *ngFor="let item of activeModalTasks" 
                class="agenda-item-row" 
                [class.completed]="item.completed"
              >
                <!-- Checkbox -->
                <button 
                  type="button" 
                  class="item-checkbox" 
                  [class.checked]="item.completed" 
                  (click)="calendarService.toggleTask(item.id); refreshActiveModalTasks()"
                  title="تحديد كمكتمل"
                >
                  <i class="pi" [ngClass]="item.completed ? 'pi-check' : ''"></i>
                </button>

                <!-- Details -->
                <div class="item-main-details">
                  <div class="item-title-row">
                    <strong class="item-title">{{ item.title }}</strong>
                    
                    <span class="type-pill" [class.type-occasion]="item.itemType === 'occasion'">
                      <i class="pi" [ngClass]="item.itemType === 'occasion' ? 'pi-flag' : 'pi-check-square'"></i>
                      <span>{{ item.itemType === 'occasion' ? (langService.currentLang() === 'ar' ? 'مناسبة / موعد' : 'Occasion') : (langService.currentLang() === 'ar' ? 'مهمة محاسبية' : 'Task') }}</span>
                    </span>
                  </div>

                  <p class="item-desc" *ngIf="item.description">{{ item.description }}</p>

                  <div class="item-tags-row">
                    <!-- Priority -->
                    <span class="badge priority-badge" [ngClass]="'prio-' + item.priority">
                      {{ getPriorityLabel(item.priority) }}
                    </span>

                    <!-- Category -->
                    <span class="badge category-badge">
                      <i class="pi" [ngClass]="getCategoryIcon(item.category)"></i>
                      <span>{{ getCategoryLabel(item.category) }}</span>
                    </span>

                    <!-- Time -->
                    <span class="badge time-badge font-mono" *ngIf="item.time">
                      <i class="pi pi-clock"></i>
                      <span>{{ item.time }}</span>
                    </span>
                  </div>
                </div>

                <!-- Delete -->
                <button 
                  type="button" 
                  class="btn-delete-item" 
                  (click)="calendarService.deleteTask(item.id); refreshActiveModalTasks()" 
                  title="حذف">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- Dialog Footer with Add Button -->
          <div class="dialog-footer">
            <button type="button" class="btn-add-more-to-day" (click)="transitionToAddModal()">
              <i class="pi pi-plus"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'إضافة مهمة أو مناسبة جديدة لهذا اليوم' : 'Add New Task or Occasion for this Day' }}</span>
            </button>

            <button type="button" class="btn-dialog-secondary" (click)="closeDayDetailsModal()">
              {{ langService.currentLang() === 'ar' ? 'إغلاق' : 'Close' }}
            </button>
          </div>

        </div>
      </div>

      <!-- ============================================================== -->
      <!-- MODAL B: ADD TASK OR OCCASION (نافذة الإضافة عند الضغط على فارغ) -->
      <!-- ============================================================== -->
      <div class="modal-backdrop" *ngIf="showAddModal" (click)="closeAddModal()">
        <div class="add-task-dialog" (click)="$event.stopPropagation()">
          
          <div class="dialog-header">
            <div class="dialog-title-info">
              <div class="dialog-icon-badge badge-green">
                <i class="pi pi-plus-circle"></i>
              </div>
              <div>
                <h3 class="dialog-title">
                  {{ langService.currentLang() === 'ar' ? 'إضافة مهمة أو مناسبة جديدة' : 'Add New Task or Occasion' }}
                </h3>
                <span class="dialog-subtitle">
                  {{ langService.currentLang() === 'ar' ? 'تاريخ الموعد:' : 'Date:' }}
                  <strong class="highlight-date font-mono">{{ addFormDate }}</strong>
                </span>
              </div>
            </div>

            <button type="button" class="btn-dialog-close" (click)="closeAddModal()">
              <i class="pi pi-times"></i>
            </button>
          </div>

          <!-- Form Body -->
          <div class="dialog-body-form">
            <!-- Item Type Selector (مهمة أم مناسبة) -->
            <div class="form-field-group">
              <label class="field-label">{{ langService.currentLang() === 'ar' ? 'نوع الإدخال:' : 'Type:' }}</label>
              <div class="item-type-toggle">
                <button 
                  type="button" 
                  class="type-btn" 
                  [class.active]="addFormType === 'task'" 
                  (click)="addFormType = 'task'">
                  <i class="pi pi-check-square"></i>
                  <span>{{ langService.currentLang() === 'ar' ? 'مهمة عمل محاسبية' : 'Accounting Task' }}</span>
                </button>

                <button 
                  type="button" 
                  class="type-btn" 
                  [class.active]="addFormType === 'occasion'" 
                  (click)="addFormType = 'occasion'">
                  <i class="pi pi-flag"></i>
                  <span>{{ langService.currentLang() === 'ar' ? 'مناسبة أو موعد / إقفال' : 'Occasion / Event / Deadline' }}</span>
                </button>
              </div>
            </div>

            <!-- Title -->
            <div class="form-field-group">
              <label class="field-label required">{{ langService.currentLang() === 'ar' ? 'العنوان:' : 'Title:' }}</label>
              <input 
                type="text" 
                class="modal-text-input" 
                [(ngModel)]="addFormTitle" 
                [placeholder]="addFormType === 'task' 
                  ? (langService.currentLang() === 'ar' ? 'مثال: مراجعة قيود التسوية، مطابقة البنك، إقفال الصندوق...' : 'e.g. Bank reconciliation, closing entries...') 
                  : (langService.currentLang() === 'ar' ? 'مثال: موعد رفع الإقرار الضريبي، اجتماع مجلس الإدارة...' : 'e.g. VAT filing deadline, Board meeting...') "
                autofocus
              />
            </div>

            <!-- Date & Time Row -->
            <div class="form-grid-two">
              <div class="form-field-group">
                <label class="field-label">{{ langService.currentLang() === 'ar' ? 'التاريخ:' : 'Date:' }}</label>
                <input type="date" class="modal-text-input font-mono" [(ngModel)]="addFormDate" />
              </div>

              <div class="form-field-group">
                <label class="field-label">{{ langService.currentLang() === 'ar' ? 'الوقت (اختياري):' : 'Time (Optional):' }}</label>
                <input type="time" class="modal-text-input font-mono" [(ngModel)]="addFormTime" />
              </div>
            </div>

            <!-- Priority & Category Row -->
            <div class="form-grid-two">
              <div class="form-field-group">
                <label class="field-label">{{ langService.currentLang() === 'ar' ? 'درجة الأهمية:' : 'Priority:' }}</label>
                <select class="modal-select-input" [(ngModel)]="addFormPriority">
                  <option value="urgent">🔴 {{ langService.currentLang() === 'ar' ? 'عاجل جداً' : 'Urgent' }}</option>
                  <option value="medium">🟡 {{ langService.currentLang() === 'ar' ? 'متوسط الأهمية' : 'Medium' }}</option>
                  <option value="normal">🔵 {{ langService.currentLang() === 'ar' ? 'عادي / روتيني' : 'Normal' }}</option>
                </select>
              </div>

              <div class="form-field-group">
                <label class="field-label">{{ langService.currentLang() === 'ar' ? 'التصنيف المحاسبي:' : 'Category:' }}</label>
                <select class="modal-select-input" [(ngModel)]="addFormCategory">
                  <option value="accounting">💼 {{ langService.currentLang() === 'ar' ? 'قيود وحسابات عامة' : 'Accounting & Entries' }}</option>
                  <option value="audit">🔍 {{ langService.currentLang() === 'ar' ? 'تدقيق ومطابقة' : 'Audit & Reconciliations' }}</option>
                  <option value="tax">📊 {{ langService.currentLang() === 'ar' ? 'زكاة وضريبة (ZATCA)' : 'Zakat & Tax' }}</option>
                  <option value="meeting">👥 {{ langService.currentLang() === 'ar' ? 'اجتماع عمل' : 'Meeting' }}</option>
                  <option value="general">📌 {{ langService.currentLang() === 'ar' ? 'عام / أخرى' : 'General' }}</option>
                </select>
              </div>
            </div>

            <!-- Description -->
            <div class="form-field-group">
              <label class="field-label">{{ langService.currentLang() === 'ar' ? 'ملاحظات وتفاصيل إضافية:' : 'Description:' }}</label>
              <textarea 
                rows="3" 
                class="modal-textarea-input" 
                [(ngModel)]="addFormDescription" 
                [placeholder]="langService.currentLang() === 'ar' ? 'اكتب أي تفاصيل مساعدة أو أرقام قيود ومراجع...' : 'Additional notes...'">
              </textarea>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="dialog-footer">
            <button 
              type="button" 
              class="btn-submit-add" 
              (click)="saveNewTaskFromModal()" 
              [disabled]="!addFormTitle.trim()">
              <i class="pi pi-check"></i>
              <span>{{ langService.currentLang() === 'ar' ? 'حفظ وإضافة للأجندة' : 'Save to Agenda' }}</span>
            </button>

            <button type="button" class="btn-dialog-secondary" (click)="closeAddModal()">
              {{ langService.currentLang() === 'ar' ? 'إلغاء' : 'Cancel' }}
            </button>
          </div>

        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, input, textarea, select, span, strong {
      font-family: var(--font-arabic) !important;
    }

    .workspace-page {
      max-width: 1400px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 3rem;
    }

    /* Header */
    .workspace-header {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 1.5rem 1.75rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .header-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #64748B;
    }

    .bc-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      color: #64748B;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .bc-link:hover {
      color: #047857;
    }

    .bc-sep {
      color: #CBD5E1;
    }

    .bc-current {
      color: #0F172A;
      font-weight: 700;
    }

    .header-main-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .header-titles {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .title-with-badge {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .page-title {
      margin: 0;
      font-size: 1.45rem;
      font-weight: 900;
      color: #0F172A;
    }

    .private-shield-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #ECFDF5;
      color: #047857;
      border: 1px solid #A7F3D0;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 800;
    }

    .page-subtitle {
      margin: 0;
      color: #64748B;
      font-size: 0.86rem;
      line-height: 1.5;
    }

    /* Tabs Pill */
    .workspace-tabs-pill {
      display: flex;
      background: #F1F5F9;
      padding: 0.35rem;
      border-radius: 12px;
      gap: 0.45rem;
      border: 1px solid #E2E8F0;
    }

    .tab-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      padding: 0.6rem 1.25rem;
      border-radius: 9px;
      font-size: 0.88rem;
      font-weight: 700;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .tab-pill-btn:hover:not(.active) {
      color: #0F172A;
      background: rgba(255, 255, 255, 0.5);
    }

    .tab-pill-btn.active {
      background: #FFFFFF;
      color: #047857;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    }

    .tab-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      font-weight: 800;
      font-family: var(--font-latin) !important;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      color: #FFFFFF;
    }

    .badge-emerald { background: #047857; }
    .badge-amber { background: #D97706; }

    /* Control Strip */
    .cal-control-strip {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 1rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .month-nav-box {
      display: flex;
      align-items: center;
      gap: 1.25rem;
    }

    .month-label h2 {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 800;
      color: #0F172A;
    }

    .nav-buttons-cluster {
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .btn-cal-jump-today {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      padding: 0.45rem 0.85rem;
      font-size: 0.8rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cal-jump-today:hover {
      background: #ECFDF5;
      border-color: #86EFAC;
      color: #047857;
    }

    .arrows-pair {
      display: flex;
      gap: 0.25rem;
    }

    .btn-cal-nav {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-cal-nav:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    /* KPI Row */
    .cal-kpi-row {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .cal-kpi-pill {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
    }

    .kpi-bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .bullet-emerald { background: #10B981; }
    .bullet-rose { background: #F43F5E; }
    .bullet-cyan { background: #06B6D4; }

    .kpi-num {
      font-weight: 900;
      font-size: 0.95rem;
      color: #0F172A;
      font-family: var(--font-latin) !important;
    }

    .kpi-text {
      font-size: 0.76rem;
      color: #64748B;
      font-weight: 600;
    }

    .btn-primary-add {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 0.55rem 1.15rem;
      font-size: 0.86rem;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(4, 120, 87, 0.25);
      transition: all 0.2s ease;
    }

    .btn-primary-add:hover {
      background: linear-gradient(135deg, #047857 0%, #064E3B 100%);
      transform: translateY(-1px);
    }

    /* Hint Banner */
    .calendar-hint-banner {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-radius: 10px;
      padding: 0.65rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.82rem;
      color: #065F46;
      font-weight: 600;
    }

    /* Large Calendar Board */
    .large-calendar-board {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
    }

    .cal-week-headers {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #F8FAFC;
      border-bottom: 2px solid #E2E8F0;
    }

    .week-header-cell {
      padding: 0.85rem 0.5rem;
      text-align: center;
      font-size: 0.84rem;
      font-weight: 800;
      color: #475569;
    }

    .cal-days-matrix {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      background: #CBD5E1;
      gap: 1px;
    }

    .matrix-day-cell {
      min-height: 120px;
      background: #FFFFFF;
      padding: 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      cursor: pointer;
      transition: background 0.15s ease;
      position: relative;
    }

    .matrix-day-cell:hover {
      background: #F8FAFC;
    }

    .matrix-day-cell.other-month {
      background: #FAFAFA;
      color: #CBD5E1;
    }

    .matrix-day-cell.is-today {
      background: #F0FDF4;
    }

    .day-cell-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .day-num-badge {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.86rem;
      font-weight: 800;
      font-family: var(--font-latin) !important;
      color: #1E293B;
    }

    .day-num-badge.today-badge {
      background: #047857;
      color: #FFFFFF;
      box-shadow: 0 2px 6px rgba(4, 120, 87, 0.35);
    }

    .quick-plus-btn {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.04);
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      opacity: 0;
      transition: all 0.15s ease;
    }

    .matrix-day-cell:hover .quick-plus-btn {
      opacity: 1;
    }

    .quick-plus-btn:hover {
      background: #047857;
      color: #FFFFFF;
    }

    .day-cell-items {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .task-chip {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #1E40AF;
      border-radius: 5px;
      padding: 0.2rem 0.4rem;
      font-size: 0.72rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 0.3rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .task-chip.chip-completed {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #94A3B8;
      text-decoration: line-through;
    }

    .task-chip.prio-urgent {
      background: #FEF2F2;
      border-color: #FECACA;
      color: #B91C1C;
    }

    .task-chip.chip-occasion {
      background: #FAF5FF;
      border-color: #E9D5FF;
      color: #6B21A8;
    }

    .chip-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chip-time {
      font-family: var(--font-latin) !important;
      opacity: 0.85;
      font-size: 0.65rem;
    }

    .more-items-chip {
      font-size: 0.68rem;
      font-weight: 800;
      color: #047857;
      padding: 0.1rem 0.3rem;
    }

    /* Notes Studio Toolbar */
    .notes-page-toolbar {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 14px;
      padding: 1rem 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .notes-search-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 320px;
    }

    .notes-search-box i {
      position: absolute;
      inset-inline-start: 0.85rem;
      color: #94A3B8;
      font-size: 0.85rem;
    }

    .notes-search-box input {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.5rem 2.25rem;
      font-size: 0.84rem;
      color: #0F172A;
      box-sizing: border-box;
    }

    .notes-search-box input:focus {
      outline: none;
      border-color: #047857;
      background: #FFFFFF;
    }

    .clear-search-btn {
      position: absolute;
      inset-inline-end: 0.75rem;
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
    }

    .notes-filter-cluster {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .filter-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 999px;
      padding: 0.3rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .filter-pill-btn.active {
      background: #047857;
      border-color: #047857;
      color: #FFFFFF;
    }

    .color-swatches-row {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0 0.4rem;
    }

    .swatch-btn {
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }

    .swatch-btn:hover {
      transform: scale(1.18);
    }

    .swatch-btn.swatch-active {
      border: 2px solid #0F172A;
      transform: scale(1.25);
    }

    /* Note Creator Banner */
    .note-creator-banner {
      background: #FEFCE8;
      border: 1.5px dashed #FDE047;
      border-radius: 14px;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      box-shadow: 0 6px 18px rgba(234, 179, 8, 0.12);
      animation: fadeIn 0.2s ease-out;
    }

    .creator-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: #713F12;
      font-size: 0.95rem;
    }

    .color-picker-row {
      display: flex;
      gap: 0.4rem;
    }

    .color-pick-circle {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid #FFFFFF;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,0.15);
      transition: transform 0.15s ease;
    }

    .color-pick-circle.active {
      border: 2px solid #0F172A;
      transform: scale(1.2);
    }

    .creator-fields {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .creator-title-input {
      width: 100%;
      padding: 0.55rem 0.85rem;
      background: #FFFFFF;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      font-size: 0.92rem;
      font-weight: 700;
      box-sizing: border-box;
    }

    .creator-text-input {
      width: 100%;
      padding: 0.65rem 0.85rem;
      background: #FFFFFF;
      border: 1px solid #FDE68A;
      border-radius: 8px;
      font-size: 0.88rem;
      line-height: 1.55;
      box-sizing: border-box;
      resize: vertical;
    }

    .creator-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pin-checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.84rem;
      font-weight: 700;
      color: #713F12;
      cursor: pointer;
    }

    .btn-save-note-action {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: #D97706;
      color: #FFFFFF;
      border: none;
      padding: 0.55rem 1.25rem;
      border-radius: 8px;
      font-size: 0.86rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-save-note-action:hover:not(:disabled) {
      background: #B45309;
    }

    .btn-save-note-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Notes Pinboard Grid */
    .notes-pinboard-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .empty-board-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 1rem;
      text-align: center;
      color: #64748B;
    }

    .empty-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 20px;
      background: #FEF3C7;
      color: #D97706;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .empty-board-state h3 {
      margin: 0 0 0.45rem 0;
      font-size: 1.15rem;
      color: #1E293B;
    }

    .empty-board-state p {
      margin: 0;
      font-size: 0.85rem;
    }

    /* Sticky Cards */
    .full-sticky-card {
      position: relative;
      border-radius: 12px;
      padding: 1.35rem 1.25rem 1rem 1.25rem;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06), 0 2px 4px rgba(0, 0, 0, 0.04);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      border: 1px solid rgba(0, 0, 0, 0.08);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .full-sticky-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 12px 26px rgba(0, 0, 0, 0.1);
    }

    .full-sticky-card.pinned-card {
      border-top: 5px solid #EF4444;
      box-shadow: 0 8px 22px rgba(239, 68, 68, 0.18);
    }

    /* 3D Pin Button */
    .pin-thumbtack-wrapper {
      position: absolute;
      top: 0.65rem;
      inset-inline-end: 0.85rem;
    }

    .thumbtack-btn {
      background: transparent;
      border: none;
      color: #94A3B8;
      font-size: 1.2rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .thumbtack-btn:hover {
      color: #EF4444;
      transform: scale(1.2);
    }

    .thumbtack-btn.pinned {
      color: #DC2626;
      transform: rotate(-35deg) scale(1.25);
      filter: drop-shadow(0 2px 4px rgba(220, 38, 38, 0.4));
    }

    .card-top {
      padding-inline-end: 2rem;
    }

    .note-card-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 800;
      color: #0F172A;
      line-height: 1.35;
    }

    .card-middle {
      flex: 1;
    }

    .note-card-text {
      margin: 0;
      font-size: 0.86rem;
      line-height: 1.6;
      color: #1E293B;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      padding-top: 0.65rem;
      margin-top: 0.25rem;
    }

    .note-timestamp {
      font-size: 0.7rem;
      color: #64748B;
      font-weight: 600;
    }

    .note-actions-strip {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .card-tool-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      background: rgba(255, 255, 255, 0.65);
      color: #475569;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .card-tool-btn:hover {
      background: #FFFFFF;
      color: #0F172A;
      transform: scale(1.1);
    }

    .card-tool-btn.active-float {
      background: #047857;
      color: #FFFFFF;
    }

    .card-tool-btn.delete-btn:hover {
      color: #DC2626;
      background: #FEE2E2;
    }

    .mini-swatches {
      display: flex;
      gap: 0.2rem;
      background: rgba(255, 255, 255, 0.5);
      padding: 0.15rem 0.35rem;
      border-radius: 999px;
    }

    .mini-swatch {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
      transition: transform 0.15s ease;
    }

    .mini-swatch:hover {
      transform: scale(1.3);
    }

    .edit-input-field {
      width: 100%;
      padding: 0.35rem 0.55rem;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 800;
      box-sizing: border-box;
    }

    .edit-textarea-field {
      width: 100%;
      padding: 0.45rem 0.65rem;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      font-size: 0.85rem;
      line-height: 1.5;
      box-sizing: border-box;
      resize: vertical;
    }

    .btn-save-edit {
      background: #047857;
      color: #FFFFFF;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
    }

    .btn-cancel-edit {
      background: #E2E8F0;
      color: #475569;
      border: none;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      cursor: pointer;
    }

    /* Modal Backdrop & Dialogs */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.6);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 1.5rem;
      animation: fadeIn 0.2s ease-out;
    }

    .day-details-dialog,
    .add-task-dialog {
      width: 100%;
      max-width: 580px;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      overflow: hidden;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleUp {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .dialog-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid #E2E8F0;
      background: #FAFAFA;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .dialog-title-info {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .dialog-icon-badge {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      color: #2563EB;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .dialog-icon-badge.badge-green {
      background: #ECFDF5;
      border-color: #A7F3D0;
      color: #047857;
    }

    .dialog-title {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
      color: #0F172A;
    }

    .highlight-date {
      color: #047857;
      margin-inline-start: 0.35rem;
    }

    .dialog-subtitle {
      font-size: 0.78rem;
      color: #64748B;
    }

    .btn-dialog-close {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: transparent;
      border: 1px solid #E2E8F0;
      color: #64748B;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-dialog-close:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .dialog-body-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
    }

    .dialog-body-form {
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
      overflow-y: auto;
    }

    .items-list-container {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .agenda-item-row {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      display: flex;
      align-items: flex-start;
      gap: 0.85rem;
      transition: all 0.15s ease;
    }

    .agenda-item-row:hover {
      border-color: #CBD5E1;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }

    .agenda-item-row.completed {
      background: #F8FAFC;
      opacity: 0.75;
    }

    .agenda-item-row.completed .item-title {
      text-decoration: line-through;
      color: #94A3B8;
    }

    .item-checkbox {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 1.5px solid #CBD5E1;
      background: #FFFFFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #FFFFFF;
      font-size: 0.7rem;
      flex-shrink: 0;
      margin-top: 0.15rem;
      transition: all 0.15s ease;
    }

    .item-checkbox.checked {
      background: #047857;
      border-color: #047857;
    }

    .item-main-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 0;
    }

    .item-title-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      flex-wrap: wrap;
    }

    .item-title {
      font-size: 0.92rem;
      font-weight: 800;
      color: #0F172A;
      word-break: break-word;
    }

    .type-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      background: #F1F5F9;
      color: #475569;
      padding: 0.1rem 0.5rem;
      border-radius: 999px;
      font-size: 0.68rem;
      font-weight: 700;
    }

    .type-pill.type-occasion {
      background: #F3E8FF;
      color: #7E22CE;
      border: 1px solid #D8B4FE;
    }

    .item-desc {
      margin: 0;
      font-size: 0.8rem;
      color: #64748B;
      line-height: 1.45;
    }

    .item-tags-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.12rem 0.45rem;
      border-radius: 4px;
    }

    .priority-badge.prio-urgent { background: #FEE2E2; color: #991B1B; border: 1px solid #FCA5A5; }
    .priority-badge.prio-medium { background: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .priority-badge.prio-normal { background: #E0F2FE; color: #075985; border: 1px solid #BAE6FD; }

    .category-badge { background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; }
    .time-badge { background: #F8FAFC; color: #64748B; border: 1px solid #E2E8F0; }

    .btn-delete-item {
      background: transparent;
      border: none;
      color: #CBD5E1;
      cursor: pointer;
      padding: 0.35rem;
      font-size: 0.85rem;
      transition: color 0.15s ease;
    }

    .btn-delete-item:hover {
      color: #DC2626;
    }

    /* Dialog Footers */
    .dialog-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #E2E8F0;
      background: #F8FAFC;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-add-more-to-day {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #047857;
      color: #FFFFFF;
      border: none;
      padding: 0.6rem 1.15rem;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 800;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .btn-add-more-to-day:hover {
      background: #065F46;
    }

    .btn-dialog-secondary {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      color: #475569;
      padding: 0.55rem 1rem;
      border-radius: 8px;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
    }

    .btn-dialog-secondary:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    /* Form Fields */
    .form-field-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .field-label {
      font-size: 0.82rem;
      font-weight: 700;
      color: #334155;
    }

    .field-label.required::after {
      content: ' *';
      color: #DC2626;
    }

    .item-type-toggle {
      display: flex;
      gap: 0.5rem;
    }

    .type-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.55rem;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
      background: #F8FAFC;
      color: #475569;
      font-size: 0.84rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .type-btn.active {
      background: #ECFDF5;
      border-color: #047857;
      color: #047857;
      box-shadow: 0 0 0 2px rgba(4, 120, 87, 0.12);
    }

    .form-grid-two {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.85rem;
    }

    .modal-text-input,
    .modal-select-input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #0F172A;
      box-sizing: border-box;
    }

    .modal-text-input:focus,
    .modal-select-input:focus {
      outline: none;
      border-color: #047857;
      box-shadow: 0 0 0 3px rgba(4, 120, 87, 0.12);
    }

    .modal-textarea-input {
      width: 100%;
      padding: 0.55rem 0.75rem;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 8px;
      font-size: 0.85rem;
      color: #0F172A;
      box-sizing: border-box;
      resize: vertical;
    }

    .btn-submit-add {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: #047857;
      color: #FFFFFF;
      border: none;
      padding: 0.6rem 1.35rem;
      border-radius: 8px;
      font-size: 0.86rem;
      font-weight: 800;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn-submit-add:hover:not(:disabled) {
      background: #065F46;
    }

    .btn-submit-add:disabled {
      opacity: 0.5;
      cursor: not-allowed;
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
export class PersonalWorkspaceComponent implements OnInit {
  calendarService = inject(UserCalendarTasksService);
  notesService = inject(UserStickyNotesService);
  langService = inject(LanguageService);
  authService = inject(AuthService);
  route = inject(ActivatedRoute);
  router = inject(Router);

  activeTab = signal<'calendar' | 'notes'>('calendar');

  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth() + 1);

  weekDays = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

  monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Modals state
  showDayDetailsModal = false;
  activeModalDate = '';
  activeModalTasks: CalendarTask[] = [];

  showAddModal = false;
  addFormType: TaskItemType = 'task';
  addFormTitle = '';
  addFormDate = '';
  addFormTime = '';
  addFormPriority: TaskPriority = 'medium';
  addFormCategory: TaskCategory = 'accounting';
  addFormDescription = '';

  // Sticky Notes state
  notesSearchTerm = '';
  selectedColorFilter: string = 'all';
  showNoteCreateBox = false;
  newNoteTitle = '';
  newNoteContent = '';
  newNoteColor: StickyNoteColor = 'yellow';
  newNoteIsPinned = false;

  editingNoteId: string | null = null;
  editNoteTitle = '';
  editNoteContent = '';

  colorList: StickyNoteColor[] = ['yellow', 'emerald', 'sky', 'rose', 'purple', 'amber'];

  ngOnInit() {
    if (this.langService.currentLang() === 'en') {
      this.weekDays = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    }

    // Check query params for tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'notes') {
        this.activeTab.set('notes');
      } else {
        this.activeTab.set('calendar');
      }
    });
  }

  switchTab(tab: 'calendar' | 'notes') {
    this.activeTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  getMonthName(): string {
    const idx = this.currentMonth() - 1;
    return this.langService.currentLang() === 'ar' ? this.monthNamesAr[idx] : this.monthNamesEn[idx];
  }

  fullCalendarDays = computed<FullCalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const todayStr = this.calendarService.todayStr;

    const days: FullCalendarDay[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const numDays = lastDay.getDate();

    // Saturday-based offset: 0=Sat, 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri
    const startDayOfWeek = (firstDay.getDay() + 1) % 7;

    // Previous month padding
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: dNum,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: false,
        tasks: this.calendarService.getTasksForDate(dStr)
      });
    }

    // Current month days
    for (let d = 1; d <= numDays; d++) {
      const dStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: false,
        tasks: this.calendarService.getTasksForDate(dStr)
      });
    }

    // Next month padding to complete matrix
    const remaining = (7 - (days.length % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(j).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: j,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: false,
        tasks: this.calendarService.getTasksForDate(dStr)
      });
    }

    return days;
  });

  prevMonth() {
    if (this.currentMonth() === 1) {
      this.currentMonth.set(12);
      this.currentYear.set(this.currentYear() - 1);
    } else {
      this.currentMonth.set(this.currentMonth() - 1);
    }
  }

  nextMonth() {
    if (this.currentMonth() === 12) {
      this.currentMonth.set(1);
      this.currentYear.set(this.currentYear() + 1);
    } else {
      this.currentMonth.set(this.currentMonth() + 1);
    }
  }

  jumpToToday() {
    const today = new Date();
    this.currentYear.set(today.getFullYear());
    this.currentMonth.set(today.getMonth() + 1);
  }

  // =========================================================================
  // CORE CLICK BEHAVIOR:
  // إذا كانت هنالك مهمة أو مناسبة يتم عرضها وفي العرض زر إضافة جديد.
  // وإذا كان التاريخ فارغاً تظهر نافذة للإضافة مباشرة.
  // =========================================================================
  onDateCellClicked(day: FullCalendarDay) {
    const tasks = this.calendarService.getTasksForDate(day.dateStr);

    if (tasks && tasks.length > 0) {
      // CASE 1: Date has items -> Display details modal with Add New button inside
      this.activeModalDate = day.dateStr;
      this.activeModalTasks = [...tasks];
      this.showDayDetailsModal = true;
    } else {
      // CASE 2: Date is empty -> Immediately open Add Task/Event modal prefilled
      this.openDirectAddModal(day.dateStr);
    }
  }

  openDirectAddModal(dateStr: string) {
    this.addFormDate = dateStr;
    this.addFormTitle = '';
    this.addFormTime = '';
    this.addFormType = 'task';
    this.addFormPriority = 'medium';
    this.addFormCategory = 'accounting';
    this.addFormDescription = '';
    this.showAddModal = true;
  }

  transitionToAddModal() {
    const date = this.activeModalDate;
    this.closeDayDetailsModal();
    this.openDirectAddModal(date);
  }

  closeDayDetailsModal() {
    this.showDayDetailsModal = false;
  }

  closeAddModal() {
    this.showAddModal = false;
  }

  refreshActiveModalTasks() {
    this.activeModalTasks = this.calendarService.getTasksForDate(this.activeModalDate);
    if (this.activeModalTasks.length === 0) {
      this.closeDayDetailsModal();
    }
  }

  saveNewTaskFromModal() {
    if (!this.addFormTitle.trim()) return;

    this.calendarService.addTask({
      title: this.addFormTitle,
      description: this.addFormDescription || undefined,
      date: this.addFormDate,
      time: this.addFormTime || undefined,
      priority: this.addFormPriority,
      category: this.addFormCategory,
      itemType: this.addFormType
    });

    this.closeAddModal();
  }

  getPriorityLabel(priority: TaskPriority): string {
    const isAr = this.langService.currentLang() === 'ar';
    switch (priority) {
      case 'urgent': return isAr ? 'عاجل' : 'Urgent';
      case 'medium': return isAr ? 'متوسط' : 'Medium';
      case 'normal': return isAr ? 'عادي' : 'Normal';
    }
  }

  getCategoryLabel(cat: TaskCategory): string {
    const isAr = this.langService.currentLang() === 'ar';
    switch (cat) {
      case 'accounting': return isAr ? 'قيود وحسابات' : 'Accounting';
      case 'audit': return isAr ? 'تدقيق ومطابقة' : 'Audit';
      case 'tax': return isAr ? 'زكاة وضريبة' : 'Tax';
      case 'meeting': return isAr ? 'اجتماع' : 'Meeting';
      case 'general': return isAr ? 'عام' : 'General';
    }
  }

  getCategoryIcon(cat: TaskCategory): string {
    switch (cat) {
      case 'accounting': return 'pi-wallet';
      case 'audit': return 'pi-check-circle';
      case 'tax': return 'pi-percentage';
      case 'meeting': return 'pi-users';
      case 'general': return 'pi-calendar';
    }
  }

  // ==========================
  // STICKY NOTES LOGIC
  // ==========================
  filteredStickyNotes = computed(() => {
    let list = this.notesService.notes();

    if (this.selectedColorFilter === 'pinned') {
      list = list.filter(n => n.isPinned);
    } else if (this.selectedColorFilter !== 'all') {
      list = list.filter(n => n.color === this.selectedColorFilter);
    }

    const term = this.notesSearchTerm.trim().toLowerCase();
    if (term) {
      list = list.filter(n => 
        (n.title && n.title.toLowerCase().includes(term)) || 
        (n.content && n.content.toLowerCase().includes(term))
      );
    }

    return list;
  });

  toggleNoteCreateBox() {
    this.showNoteCreateBox = !this.showNoteCreateBox;
    if (this.showNoteCreateBox) {
      this.newNoteTitle = '';
      this.newNoteContent = '';
      this.newNoteColor = 'yellow';
      this.newNoteIsPinned = false;
    }
  }

  saveStickyNote() {
    if (!this.newNoteTitle.trim() && !this.newNoteContent.trim()) return;
    this.notesService.addNote(this.newNoteTitle, this.newNoteContent, this.newNoteColor, this.newNoteIsPinned);
    this.showNoteCreateBox = false;
    this.newNoteTitle = '';
    this.newNoteContent = '';
  }

  startEditNote(note: StickyNote) {
    this.editingNoteId = note.id;
    this.editNoteTitle = note.title;
    this.editNoteContent = note.content;
  }

  saveEditNote(id: string) {
    this.notesService.updateNote(id, {
      title: this.editNoteTitle,
      content: this.editNoteContent
    });
    this.editingNoteId = null;
  }

  cancelEditNote() {
    this.editingNoteId = null;
  }
}
