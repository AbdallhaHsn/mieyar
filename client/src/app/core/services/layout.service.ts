import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LayoutService {
  isMobileSidebarOpen = signal<boolean>(false);

  toggleMobileSidebar() {
    this.isMobileSidebarOpen.set(!this.isMobileSidebarOpen());
  }

  closeMobileSidebar() {
    this.isMobileSidebarOpen.set(false);
  }

  openMobileSidebar() {
    this.isMobileSidebarOpen.set(true);
  }
}
