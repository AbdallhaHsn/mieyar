import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserCalendarTasksService, CalendarTask, TaskPriority, TaskCategory } from '../../core/services/user-calendar-tasks.service';
import { LanguageService } from '../../core/services/language.service';
import { output } from '@angular/core';

interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasTasks: boolean;
}

@Component({
  selector: 'app-calendar-agenda-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Backdrop -->
    <div class="drawer-backdrop" (click)="close()">
      <!-- Drawer Panel -->
      <aside class="drawer-panel" (click)="$event.stopPropagation()" [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
        
        <!-- Header -->
        <div class="drawer-header">
          <div class="header-info">
            <div class="header-icon-badge">
              <i class="pi pi-calendar"></i>
            </div>
            <div>
              <div class="header-title-row">
                <h3 class="header-title">
                  {{ langService.currentLang() === 'ar' ? 'التقويم وأجندة تنظيم العمل' : 'Calendar & Work Agenda' }}
                </h3>
                <span class="private-badge" title="مهام خاصة بك فقط">
                  <i class="pi pi-lock"></i>
                  <span>{{ langService.currentLang() === 'ar' ? 'خاصة بك فقط' : 'Private' }}</span>
                </span>
              </div>
              <p class="header-subtitle">
                {{ langService.currentLang() === 'ar' ? 'جدول مهامك المحاسبية اليومية، المواعيد والإقفالات لتنظيم يومك' : 'Schedule and track your personal accounting tasks and deadlines' }}
              </p>
            </div>
          </div>

          <button type="button" class="btn-close-drawer" (click)="close()" title="إغلاق">
            <i class="pi pi-times"></i>
          </button>
        </div>

        <!-- KPI Summary Cards -->
        <div class="agenda-kpi-strip">
          <div class="kpi-mini-card">
            <span class="kpi-num text-emerald">{{ tasksService.pendingTodayCount() }}</span>
            <span class="kpi-lbl">{{ langService.currentLang() === 'ar' ? 'مهام اليوم المتبقية' : "Today's Pending" }}</span>
          </div>

          <div class="kpi-mini-card">
            <span class="kpi-num text-rose">{{ tasksService.urgentCount() }}</span>
            <span class="kpi-lbl">{{ langService.currentLang() === 'ar' ? 'مهام عاجلة' : 'Urgent Tasks' }}</span>
          </div>

          <div class="kpi-mini-card">
            <span class="kpi-num text-cyan">{{ tasksService.completionRate() }}%</span>
            <span class="kpi-lbl">{{ langService.currentLang() === 'ar' ? 'نسبة الإنجاز' : 'Completion Rate' }}</span>
          </div>
        </div>

        <div class="drawer-scroll-body">
          <!-- Calendar Month Widget -->
          <div class="calendar-widget-card">
            <!-- Calendar Month Header Navigation -->
            <div class="cal-nav-header">
              <div class="month-title-box">
                <strong class="month-title">{{ getMonthName() }} {{ currentYear() }}</strong>
              </div>

              <div class="cal-nav-actions">
                <button type="button" class="btn-today-jump" (click)="jumpToToday()">
                  {{ langService.currentLang() === 'ar' ? 'اليوم' : 'Today' }}
                </button>

                <div class="nav-arrows">
                  <button type="button" class="btn-cal-arrow" (click)="prevMonth()" title="الشهر السابق">
                    <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-chevron-right' : 'pi-chevron-left'"></i>
                  </button>
                  <button type="button" class="btn-cal-arrow" (click)="nextMonth()" title="الشهر التالي">
                    <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-chevron-left' : 'pi-chevron-right'"></i>
                  </button>
                </div>
              </div>
            </div>

            <!-- Days of Week Header -->
            <div class="week-days-row">
              <span *ngFor="let dayName of weekDays">{{ dayName }}</span>
            </div>

            <!-- Days Grid -->
            <div class="days-grid">
              <button 
                type="button"
                *ngFor="let day of calendarDays()"
                class="day-cell"
                [class.other-month]="!day.isCurrentMonth"
                [class.is-today]="day.isToday"
                [class.is-selected]="day.isSelected"
                (click)="selectDay(day.dateStr)"
              >
                <span class="day-number">{{ day.dayNum }}</span>
                <span class="task-dot" *ngIf="day.hasTasks"></span>
              </button>
            </div>
          </div>

          <!-- Quick Add Task Bar -->
          <div class="quick-add-task-box">
            <div class="add-box-header">
              <span class="add-box-title">
                <i class="pi pi-plus-circle text-emerald"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'إضافة مهمة جديدة ليوم:' : 'Add Task for:' }}</span>
                <strong class="target-date-tag">{{ tasksService.selectedDate() }}</strong>
              </span>
            </div>

            <div class="add-form-row">
              <input 
                type="text" 
                class="task-input-title" 
                [(ngModel)]="newTitle" 
                [placeholder]="langService.currentLang() === 'ar' ? 'عنوان المهمة (مثال: مراجعة قيود التسوية، مطابقة البنك)...' : 'Task title...'" 
                (keydown.enter)="saveNewTask()"
              />
            </div>

            <div class="add-form-controls">
              <!-- Time input -->
              <div class="control-group">
                <i class="pi pi-clock"></i>
                <input type="time" [(ngModel)]="newTime" class="control-time" />
              </div>

              <!-- Priority Select -->
              <select [(ngModel)]="newPriority" class="control-select priority-sel">
                <option value="urgent">🔴 {{ langService.currentLang() === 'ar' ? 'عاجل' : 'Urgent' }}</option>
                <option value="medium">🟡 {{ langService.currentLang() === 'ar' ? 'متوسط' : 'Medium' }}</option>
                <option value="normal">🔵 {{ langService.currentLang() === 'ar' ? 'عادي' : 'Normal' }}</option>
              </select>

              <!-- Category Select -->
              <select [(ngModel)]="newCategory" class="control-select">
                <option value="accounting">💼 {{ langService.currentLang() === 'ar' ? 'قيود وحسابات' : 'Accounting' }}</option>
                <option value="audit">🔍 {{ langService.currentLang() === 'ar' ? 'تدقيق ومطابقة' : 'Audit' }}</option>
                <option value="tax">📊 {{ langService.currentLang() === 'ar' ? 'زكاة وضريبة' : 'Zakat & Tax' }}</option>
                <option value="meeting">👥 {{ langService.currentLang() === 'ar' ? 'اجتماع' : 'Meeting' }}</option>
                <option value="general">📌 {{ langService.currentLang() === 'ar' ? 'عام' : 'General' }}</option>
              </select>

              <!-- Add Button -->
              <button 
                type="button" 
                class="btn-submit-task" 
                (click)="saveNewTask()" 
                [disabled]="!newTitle.trim()">
                <i class="pi pi-plus"></i>
                <span>{{ langService.currentLang() === 'ar' ? 'إضافة' : 'Add' }}</span>
              </button>
            </div>
          </div>

          <!-- Tasks Filter Tabs -->
          <div class="tasks-filter-tabs">
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="filterTab === 'selectedDay'" 
              (click)="filterTab = 'selectedDay'">
              {{ langService.currentLang() === 'ar' ? 'يوم ' : 'Day ' }} ({{ tasksService.selectedDate() }})
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="filterTab === 'today'" 
              (click)="filterTab = 'today'">
              {{ langService.currentLang() === 'ar' ? 'مهام اليوم' : "Today's Tasks" }}
            </button>
            <button 
              type="button" 
              class="tab-btn" 
              [class.active]="filterTab === 'all'" 
              (click)="filterTab = 'all'">
              {{ langService.currentLang() === 'ar' ? 'جميع المهام' : 'All Tasks' }}
            </button>
          </div>

          <!-- Tasks List -->
          <div class="tasks-list">
            <div class="empty-tasks" *ngIf="filteredTasks().length === 0">
              <i class="pi pi-check-circle empty-check-icon"></i>
              <h4>{{ langService.currentLang() === 'ar' ? 'لا توجد مهام في هذه القائمة' : 'No tasks scheduled' }}</h4>
              <p>{{ langService.currentLang() === 'ar' ? 'أنت جاهز تماماً! أضف مهمة جديدة لتنظيم عملك' : 'All clear! Add a task to keep yourself organized' }}</p>
            </div>

            <div 
              *ngFor="let task of filteredTasks()" 
              class="task-item-card" 
              [class.completed]="task.completed"
            >
              <!-- Checkbox -->
              <button 
                type="button" 
                class="task-check-btn" 
                [class.checked]="task.completed" 
                (click)="tasksService.toggleTask(task.id)"
                title="تحديد كمكتمل"
              >
                <i class="pi" [ngClass]="task.completed ? 'pi-check' : ''"></i>
              </button>

              <!-- Content -->
              <div class="task-details">
                <div class="task-title-line">
                  <strong class="task-title">{{ task.title }}</strong>
                </div>

                <p class="task-desc" *ngIf="task.description">{{ task.description }}</p>

                <div class="task-badges-line">
                  <!-- Priority Badge -->
                  <span class="badge priority-badge" [ngClass]="'prio-' + task.priority">
                    {{ getPriorityLabel(task.priority) }}
                  </span>

                  <!-- Category Badge -->
                  <span class="badge category-badge">
                    <i class="pi" [ngClass]="getCategoryIcon(task.category)"></i>
                    <span>{{ getCategoryLabel(task.category) }}</span>
                  </span>

                  <!-- Time / Date Badge -->
                  <span class="badge time-badge" *ngIf="task.time">
                    <i class="pi pi-clock"></i>
                    <span>{{ task.time }}</span>
                  </span>

                  <span class="badge date-badge" *ngIf="filterTab === 'all'">
                    <i class="pi pi-calendar"></i>
                    <span>{{ task.date }}</span>
                  </span>
                </div>
              </div>

              <!-- Delete Action -->
              <button 
                type="button" 
                class="btn-delete-task" 
                (click)="tasksService.deleteTask(task.id)" 
                title="حذف المهمة"
              >
                <i class="pi pi-trash"></i>
              </button>
            </div>
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
      width: 480px;
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
      background: #ECFDF5;
      border: 1px solid #A7F3D0;
      color: #047857;
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

    /* KPI Strip */
    .agenda-kpi-strip {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.65rem;
      padding: 0.85rem 1.5rem;
      background: #F8FAFC;
      border-bottom: 1px solid #E2E8F0;
    }

    .kpi-mini-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      padding: 0.5rem 0.65rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 0.15rem;
    }

    .kpi-num {
      font-size: 1.25rem;
      font-weight: 900;
      font-family: var(--font-latin) !important;
      line-height: 1;
    }

    .kpi-lbl {
      font-size: 0.68rem;
      color: #64748B;
      font-weight: 700;
    }

    .drawer-scroll-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    /* Calendar Widget Card */
    .calendar-widget-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    .cal-nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }

    .month-title {
      font-size: 0.95rem;
      color: #0F172A;
      font-weight: 800;
    }

    .cal-nav-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-today-jump {
      background: #F1F5F9;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.25rem 0.55rem;
      font-size: 0.72rem;
      font-weight: 700;
      color: #334155;
      cursor: pointer;
    }

    .btn-today-jump:hover {
      background: #E2E8F0;
    }

    .nav-arrows {
      display: flex;
      gap: 0.25rem;
    }

    .btn-cal-arrow {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #475569;
      font-size: 0.75rem;
      cursor: pointer;
    }

    .btn-cal-arrow:hover {
      background: #F8FAFC;
      color: #0F172A;
    }

    .week-days-row {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748B;
      margin-bottom: 0.5rem;
      padding-bottom: 0.35rem;
      border-bottom: 1px solid #F1F5F9;
    }

    .days-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 0.3rem;
    }

    .day-cell {
      aspect-ratio: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      font-size: 0.8rem;
      font-weight: 600;
      color: #1E293B;
      cursor: pointer;
      position: relative;
      transition: all 0.15s ease;
      font-family: var(--font-latin) !important;
    }

    .day-cell:hover:not(.is-selected) {
      background: #F1F5F9;
    }

    .day-cell.other-month {
      color: #CBD5E1;
    }

    .day-cell.is-today {
      border: 1.5px solid #047857;
      font-weight: 800;
      color: #047857;
    }

    .day-cell.is-selected {
      background: #047857;
      color: #FFFFFF;
      font-weight: 800;
      box-shadow: 0 3px 8px rgba(4, 120, 87, 0.3);
    }

    .task-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: #D97706;
      position: absolute;
      bottom: 4px;
    }

    .day-cell.is-selected .task-dot {
      background: #FFFFFF;
    }

    /* Quick Add Task Box */
    .quick-add-task-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .add-box-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .add-box-title {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: #334155;
    }

    .target-date-tag {
      background: #E2E8F0;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
      font-family: var(--font-latin) !important;
      font-size: 0.75rem;
      color: #0F172A;
    }

    .task-input-title {
      width: 100%;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.45rem 0.65rem;
      font-size: 0.82rem;
      color: #0F172A;
      box-sizing: border-box;
    }

    .task-input-title:focus {
      outline: none;
      border-color: #047857;
    }

    .add-form-controls {
      display: flex;
      gap: 0.45rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .control-group {
      display: flex;
      align-items: center;
      gap: 0.3rem;
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      color: #64748B;
    }

    .control-time {
      border: none;
      font-size: 0.75rem;
      font-family: var(--font-latin) !important;
      color: #0F172A;
      outline: none;
      background: transparent;
    }

    .control-select {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 6px;
      padding: 0.35rem 0.5rem;
      font-size: 0.74rem;
      color: #1E293B;
      outline: none;
      cursor: pointer;
    }

    .btn-submit-task {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #047857;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      padding: 0.4rem 0.85rem;
      font-size: 0.78rem;
      font-weight: 700;
      cursor: pointer;
      margin-inline-start: auto;
      transition: background 0.15s ease;
    }

    .btn-submit-task:hover:not(:disabled) {
      background: #065F46;
    }

    .btn-submit-task:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Filter Tabs */
    .tasks-filter-tabs {
      display: flex;
      gap: 0.35rem;
      border-bottom: 1px solid #E2E8F0;
      padding-bottom: 0.5rem;
    }

    .tab-btn {
      background: transparent;
      border: none;
      font-size: 0.78rem;
      font-weight: 700;
      color: #64748B;
      padding: 0.35rem 0.65rem;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .tab-btn:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .tab-btn.active {
      background: #ECFDF5;
      color: #047857;
      border: 1px solid #A7F3D0;
    }

    /* Tasks List */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .empty-tasks {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1rem;
      text-align: center;
      color: #94A3B8;
    }

    .empty-check-icon {
      font-size: 2.5rem;
      color: #A7F3D0;
      margin-bottom: 0.5rem;
    }

    .empty-tasks h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.92rem;
      color: #334155;
    }

    .empty-tasks p {
      margin: 0;
      font-size: 0.76rem;
      color: #64748B;
    }

    .task-item-card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 0.75rem 0.85rem;
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      transition: all 0.15s ease;
    }

    .task-item-card:hover {
      border-color: #CBD5E1;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
    }

    .task-item-card.completed {
      background: #F8FAFC;
      opacity: 0.75;
    }

    .task-item-card.completed .task-title {
      text-decoration: line-through;
      color: #94A3B8;
    }

    .task-check-btn {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      border: 1.5px solid #CBD5E1;
      background: #FFFFFF;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.7rem;
      color: #FFFFFF;
      flex-shrink: 0;
      margin-top: 0.1rem;
      transition: all 0.15s ease;
    }

    .task-check-btn.checked {
      background: #047857;
      border-color: #047857;
    }

    .task-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-width: 0;
    }

    .task-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.35;
      word-break: break-word;
    }

    .task-desc {
      margin: 0;
      font-size: 0.74rem;
      color: #64748B;
      line-height: 1.4;
    }

    .task-badges-line {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.68rem;
      font-weight: 700;
      padding: 0.1rem 0.45rem;
      border-radius: 4px;
    }

    .priority-badge.prio-urgent {
      background: #FEE2E2;
      color: #991B1B;
      border: 1px solid #FCA5A5;
    }

    .priority-badge.prio-medium {
      background: #FEF3C7;
      color: #92400E;
      border: 1px solid #FDE68A;
    }

    .priority-badge.prio-normal {
      background: #E0F2FE;
      color: #075985;
      border: 1px solid #BAE6FD;
    }

    .category-badge {
      background: #F1F5F9;
      color: #475569;
      border: 1px solid #E2E8F0;
    }

    .time-badge {
      background: #F8FAFC;
      color: #64748B;
      border: 1px solid #E2E8F0;
      font-family: var(--font-latin) !important;
    }

    .date-badge {
      background: #F8FAFC;
      color: #64748B;
      border: 1px solid #E2E8F0;
      font-family: var(--font-latin) !important;
    }

    .btn-delete-task {
      background: transparent;
      border: none;
      color: #CBD5E1;
      cursor: pointer;
      padding: 0.2rem;
      font-size: 0.8rem;
      transition: color 0.15s ease;
      flex-shrink: 0;
    }

    .btn-delete-task:hover {
      color: #DC2626;
    }
  `]
})
export class CalendarAgendaDrawerComponent implements OnInit {
  tasksService = inject(UserCalendarTasksService);
  langService = inject(LanguageService);

  closed = output<void>();

  currentYear = signal<number>(new Date().getFullYear());
  currentMonth = signal<number>(new Date().getMonth() + 1); // 1-12

  filterTab: 'selectedDay' | 'today' | 'all' = 'selectedDay';

  // New task form state
  newTitle = '';
  newTime = '';
  newPriority: TaskPriority = 'medium';
  newCategory: TaskCategory = 'accounting';

  weekDays = ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'];

  monthNamesAr = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    if (this.langService.currentLang() === 'en') {
      this.weekDays = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    }
  }

  getMonthName(): string {
    const idx = this.currentMonth() - 1;
    return this.langService.currentLang() === 'ar' ? this.monthNamesAr[idx] : this.monthNamesEn[idx];
  }

  calendarDays = computed<CalendarDay[]>(() => {
    const year = this.currentYear();
    const month = this.currentMonth();
    const selectedDate = this.tasksService.selectedDate();
    const todayStr = this.tasksService.todayStr;

    const datesWithTasks = this.tasksService.getDatesWithTasks(year, month);

    const days: CalendarDay[] = [];
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const numDays = lastDay.getDate();

    // In Arabic accounting / Saudi week: Saturday is day 0 (Sunday is day 1, etc.)
    // JS getDay(): 0 = Sun, 1 = Mon ... 6 = Sat
    // Convert to Saturday-first offset: Sat=0, Sun=1, Mon=2, Tue=3, Wed=4, Thu=5, Fri=6
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
        isSelected: dStr === selectedDate,
        hasTasks: datesWithTasks.has(dStr)
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
        isSelected: dStr === selectedDate,
        hasTasks: datesWithTasks.has(dStr)
      });
    }

    // Next month padding (complete grid to 35 or 42)
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
        isSelected: dStr === selectedDate,
        hasTasks: false
      });
    }

    return days;
  });

  filteredTasks = computed<CalendarTask[]>(() => {
    if (this.filterTab === 'selectedDay') {
      return this.tasksService.tasksForSelectedDate();
    } else if (this.filterTab === 'today') {
      return this.tasksService.todayTasks();
    } else {
      return this.tasksService.tasks();
    }
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
    this.tasksService.setSelectedDate(this.tasksService.todayStr);
  }

  selectDay(dateStr: string) {
    this.tasksService.setSelectedDate(dateStr);
    this.filterTab = 'selectedDay';
  }

  saveNewTask() {
    if (!this.newTitle.trim()) return;

    this.tasksService.addTask({
      title: this.newTitle,
      date: this.tasksService.selectedDate(),
      time: this.newTime || undefined,
      priority: this.newPriority,
      category: this.newCategory
    });

    this.newTitle = '';
    this.newTime = '';
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
      case 'general': return 'pi-bookmark';
    }
  }

  close() {
    this.closed.emit();
  }
}
