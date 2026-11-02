import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';

export type TaskPriority = 'urgent' | 'medium' | 'normal';
export type TaskCategory = 'accounting' | 'audit' | 'tax' | 'meeting' | 'general';

export type TaskItemType = 'task' | 'occasion';

export interface CalendarTask {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  priority: TaskPriority;
  category: TaskCategory;
  itemType?: TaskItemType; // 'task' | 'occasion'
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserCalendarTasksService {
  private authService = inject(AuthService);

  tasks = signal<CalendarTask[]>([]);
  selectedDate = signal<string>(new Date().toISOString().substring(0, 10));

  // Today string YYYY-MM-DD
  todayStr = new Date().toISOString().substring(0, 10);

  // Computeds
  todayTasks = computed(() => {
    return this.tasks().filter(t => t.date === this.todayStr);
  });

  pendingTodayCount = computed(() => {
    return this.tasks().filter(t => t.date === this.todayStr && !t.completed).length;
  });

  urgentCount = computed(() => {
    return this.tasks().filter(t => t.priority === 'urgent' && !t.completed).length;
  });

  tasksForSelectedDate = computed(() => {
    const sel = this.selectedDate();
    return this.tasks().filter(t => t.date === sel);
  });

  completionRate = computed(() => {
    const total = this.tasks().length;
    if (total === 0) return 0;
    const done = this.tasks().filter(t => t.completed).length;
    return Math.round((done / total) * 100);
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.loadUserTasks(user?.id || user?.userName || 'guest');
    });
  }

  private getStorageKey(userId: string): string {
    return `alroban_calendar_tasks_user_${userId}`;
  }

  private loadUserTasks(userId: string) {
    try {
      const key = this.getStorageKey(userId);
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = (JSON.parse(data) as CalendarTask[])
          // Drop untouched sample tasks that were auto-seeded by earlier versions
          .filter(t => !(t.id.startsWith('task_def_') && !t.completed));
        this.tasks.set(parsed);
        this.saveToStorage(userId, parsed);
      } else {
        this.tasks.set([]);
      }
    } catch {
      this.tasks.set([]);
    }
  }

  private saveCurrent() {
    const user = this.authService.currentUser();
    const userId = user?.id || user?.userName || 'guest';
    this.saveToStorage(userId, this.tasks());
  }

  private saveToStorage(userId: string, items: CalendarTask[]) {
    try {
      localStorage.setItem(this.getStorageKey(userId), JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save calendar tasks', e);
    }
  }

  addTask(task: {
    title: string;
    description?: string;
    date: string;
    time?: string;
    priority: TaskPriority;
    category: TaskCategory;
    itemType?: TaskItemType;
  }): CalendarTask {
    const newTask: CalendarTask = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: task.title.trim(),
      description: task.description?.trim(),
      date: task.date || this.selectedDate(),
      time: task.time,
      priority: task.priority || 'medium',
      category: task.category || 'accounting',
      itemType: task.itemType || 'task',
      completed: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newTask, ...this.tasks()];
    this.tasks.set(updated);
    this.saveCurrent();
    return newTask;
  }

  getTasksForDate(dateStr: string): CalendarTask[] {
    return this.tasks().filter(t => t.date === dateStr);
  }

  toggleTask(id: string) {
    const updated = this.tasks().map(t => {
      if (t.id === id) {
        return {
          ...t,
          completed: !t.completed,
          completedAt: !t.completed ? new Date().toISOString() : undefined
        };
      }
      return t;
    });
    this.tasks.set(updated);
    this.saveCurrent();
  }

  deleteTask(id: string) {
    const updated = this.tasks().filter(t => t.id !== id);
    this.tasks.set(updated);
    this.saveCurrent();
  }

  updateTask(id: string, updates: Partial<CalendarTask>) {
    const updated = this.tasks().map(t => {
      if (t.id === id) {
        return { ...t, ...updates };
      }
      return t;
    });
    this.tasks.set(updated);
    this.saveCurrent();
  }

  setSelectedDate(dateStr: string) {
    this.selectedDate.set(dateStr);
  }

  getDatesWithTasks(year: number, month: number): Set<string> {
    const monthStr = String(month).padStart(2, '0');
    const prefix = `${year}-${monthStr}`;
    const dates = new Set<string>();
    for (const t of this.tasks()) {
      if (t.date.startsWith(prefix) && !t.completed) {
        dates.add(t.date);
      }
    }
    return dates;
  }
}
