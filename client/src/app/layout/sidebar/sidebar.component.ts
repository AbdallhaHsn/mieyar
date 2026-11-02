import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { CompanyContextService } from '../../core/services/company-context.service';

export interface NavItem {
  labelAr: string;
  labelEn: string;
  icon: string;
  route: string;
  queryParams?: Record<string, string>;
  superAdminOnly?: boolean;
}

export interface NavSubGroup {
  id: string;
  titleAr: string;
  titleEn: string;
  icon: string;
  isOpen: boolean;
  items: NavItem[];
  superAdminOnly?: boolean;
}

export interface NavSection {
  id: string;
  titleAr: string;
  titleEn: string;
  shortTitleAr?: string;
  shortTitleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  icon: string;
  theme?: 'emerald' | 'blue' | 'purple';
  collapsible?: boolean;
  isOpen?: boolean;
  items?: NavItem[];
  subGroups?: NavSubGroup[];
  superAdminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslatePipe],
  template: `
    <aside class="erp-dual-sidebar">
      
      <!-- ======================================================== -->
      <!-- 1. PRIMARY APP RAIL (Odoo-Style Slim App Switcher 68px)  -->
      <!-- ======================================================== -->
      <div class="primary-rail">
        <!-- Logo Icon Block -->
        <div 
          class="rail-brand-box" 
          (click)="selectSectionById('main-overview', true)" 
          [title]="('layout.sidebar.meyarErp' | translate)">
          <img src="/meyar-logo.jpg" alt="Meyar Logo" class="rail-brand-logo" />
        </div>

        <!-- Vertical Module Apps Stack -->
        <div class="rail-apps-stack custom-scrollbar">
          <button 
            *ngFor="let section of visibleSections"
            type="button" 
            class="rail-app-btn" 
            [class.active]="selectedSectionId() === section.id"
            (click)="selectSection(section)"
            [title]="langService.currentLang() === 'ar' ? section.titleAr : section.titleEn">
            
            <div class="rail-icon-box">
              <i [class]="section.icon"></i>
            </div>
            
            <span class="rail-app-label">
              {{ langService.currentLang() === 'ar' ? (section.shortTitleAr || section.titleAr) : (section.shortTitleEn || section.titleEn) }}
            </span>
            
            <span class="rail-active-pill" *ngIf="selectedSectionId() === section.id"></span>
          </button>
        </div>

        <!-- Rail Bottom Utility Actions -->
        <div class="rail-bottom-actions">
          <button 
            type="button" 
            class="rail-action-btn"
            (click)="toggleSubRail()"
            [title]="isSubRailCollapsed() 
              ? ('layout.sidebar.expandSubmenu' | translate)
              : ('layout.sidebar.collapseSubmenu' | translate)">
            <i class="pi" [ngClass]="isSubRailCollapsed() 
              ? ('layout.sidebar.pibars' | translate) 
              : ('layout.sidebar.pichevronleft' | translate)"></i>
          </button>

          <button 
            type="button" 
            class="rail-action-btn logout-action"
            (click)="authService.logout()"
            [title]="('layout.sidebar.signOut' | translate)">
            <i class="pi pi-power-off"></i>
          </button>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- 2. SECONDARY CONTEXTUAL SUB-SIDEBAR (Focused on Active)   -->
      <!-- ======================================================== -->
      <div class="secondary-rail" [class.collapsed]="isSubRailCollapsed()">
        
        <!-- Active Module Header -->
        <div class="sub-rail-header" *ngIf="activeSection">
          <div class="module-identity">
            <div class="module-icon-badge" [ngClass]="'theme-' + (activeSection.theme || 'emerald')">
              <i [class]="activeSection.icon"></i>
            </div>
            <div class="module-text-wrap">
              <h2 class="module-main-title">
                {{ langService.currentLang() === 'ar' ? activeSection.titleAr : activeSection.titleEn }}
              </h2>
              <span class="module-sub-title">
                {{ getSubItemsCount(activeSection) }} {{ 'layout.sidebar.screensActions' | translate }}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            class="sub-rail-close-btn" 
            (click)="toggleSubRail()" 
            [title]="('layout.sidebar.collapseSidebar' | translate)">
            <i class="pi" [ngClass]="langService.currentLang() === 'ar' ? 'pi-angle-right' : 'pi-angle-left'"></i>
          </button>
        </div>

        <!-- Tenant Badge Strip -->
        <div class="sub-rail-tenant">
          <div class="tenant-tag-icon">
            <i class="pi pi-building"></i>
          </div>
          <div class="tenant-tag-details">
            <span class="tenant-label">
              {{ authService.isSuperAdmin() 
                ? ('layout.sidebar.platformOwner' | translate)
                : ('layout.sidebar.activeTenant' | translate) }}
            </span>
            <strong class="tenant-org" [title]="companyContext.companyName()(langService.currentLang())">
              {{ companyContext.companyName()(langService.currentLang()) }}
            </strong>
          </div>
        </div>

        <!-- Sub-menus and Navigation Links -->
        <div class="sub-rail-nav custom-scrollbar" *ngIf="activeSection">
          
          <!-- Case A: Standalone Section Direct Items (Dashboard / Workspace) -->
          <div class="direct-nav-group" *ngIf="activeSection.items">
            <ul class="nav-links-list">
              <li *ngFor="let item of activeSection.items">
                <a 
                  [routerLink]="item.route" 
                  [queryParams]="item.queryParams"
                  [class.active]="isItemActive(item)" 
                  class="nav-entry-link"
                  *ngIf="isItemVisible(item)">
                  <div class="entry-icon-box">
                    <i [class]="item.icon"></i>
                  </div>
                  <span class="entry-label">
                    {{ langService.currentLang() === 'ar' ? item.labelAr : item.labelEn }}
                  </span>
                  <i class="pi pi-arrow-left entry-arrow" *ngIf="langService.currentLang() === 'ar'"></i>
                  <i class="pi pi-arrow-right entry-arrow" *ngIf="langService.currentLang() !== 'ar'"></i>
                </a>
              </li>
            </ul>
          </div>

          <!-- Case B: Master Section with Grouped Subgroups -->
          <div class="subgroups-stack" *ngIf="activeSection.subGroups">
            <div class="subgroup-card" *ngFor="let group of activeSection.subGroups">
              
              <!-- Subgroup Header Toggle -->
              <button 
                type="button" 
                class="subgroup-toggle"
                [class.open]="group.isOpen"
                [class.has-active]="isSubGroupActive(group)"
                (click)="toggleSubGroup(group)">
                <div class="group-title-side">
                  <i [class]="group.icon + ' group-icon'"></i>
                  <span class="group-name">
                    {{ langService.currentLang() === 'ar' ? group.titleAr : group.titleEn }}
                  </span>
                </div>
                <div class="group-meta-side">
                  <span class="group-badge">{{ group.items.length }}</span>
                  <i class="pi pi-chevron-down group-chevron" [class.rotated]="!group.isOpen"></i>
                </div>
              </button>

              <!-- Subgroup Links List -->
              <ul class="subgroup-links-list" *ngIf="group.isOpen">
                <li *ngFor="let item of group.items">
                  <a 
                    [routerLink]="item.route" 
                    [queryParams]="item.queryParams"
                    [class.active]="isItemActive(item)" 
                    class="nav-entry-link child-link"
                    *ngIf="isItemVisible(item)">
                    <div class="entry-icon-box">
                      <i [class]="item.icon"></i>
                    </div>
                    <span class="entry-label">
                      {{ langService.currentLang() === 'ar' ? item.labelAr : item.labelEn }}
                    </span>
                  </a>
                </li>
              </ul>

            </div>
          </div>

        </div>

        <!-- Secondary Rail Bottom User Profile -->
        <div class="sub-rail-footer">
          <div class="user-profile-badge">
            <div class="user-avatar-circle">
              <i class="pi" [ngClass]="authService.isSuperAdmin() ? 'pi-shield' : 'pi-user'"></i>
            </div>
            <div class="user-meta-column">
              <strong class="user-fullname">
                {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
              </strong>
              <span class="user-login-name">{{ authService.currentUser()?.userName }}</span>
            </div>
          </div>
        </div>

      </div>

    </aside>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, a, span, strong, h2, h3 {
      font-family: var(--font-arabic) !important;
    }

    .erp-dual-sidebar {
      display: flex;
      height: 100vh;
      position: sticky;
      top: 0;
      z-index: 90;
      user-select: none;
    }

    /* ======================================================== */
    /* 1. PRIMARY APP RAIL STYLING                              */
    /* ======================================================== */
    .primary-rail {
      width: 70px;
      min-width: 70px;
      height: 100vh;
      background: #0F172A; /* Deep modern executive slate */
      border-inline-end: 1px solid #1E293B;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0.65rem 0.35rem;
      gap: 0.5rem;
      z-index: 92;
      box-shadow: 2px 0 10px rgba(0, 0, 0, 0.15);
    }

    .rail-brand-box {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: #1E293B;
      border: 1px solid #334155;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      margin-bottom: 0.35rem;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);

      &:hover {
        transform: scale(1.05);
        border-color: #10B981;
        box-shadow: 0 0 14px rgba(16, 185, 129, 0.3);
      }

      .rail-brand-logo {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        object-fit: cover;
      }
    }

    .rail-apps-stack {
      flex: 1;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.2rem 0;
    }

    .rail-app-btn {
      width: 100%;
      min-height: 52px;
      background: transparent;
      border: none;
      border-radius: 10px;
      color: #94A3B8;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0.35rem 0.15rem;
      position: relative;
      transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);

      .rail-icon-box {
        width: 30px;
        height: 30px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.05rem;
        transition: all 0.18s ease;
      }

      .rail-app-label {
        font-size: 0.62rem;
        font-weight: 700;
        margin-top: 0.2rem;
        white-space: nowrap;
        text-align: center;
        letter-spacing: -0.2px;
        line-height: 1.1;
        transition: color 0.18s ease;
      }

      .rail-active-pill {
        position: absolute;
        inset-inline-start: 0;
        top: 20%;
        bottom: 20%;
        width: 3.5px;
        background: #10B981;
        border-radius: 0 4px 4px 0;
        box-shadow: 0 0 8px #10B981;
      }

      &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #F8FAFC;

        .rail-icon-box {
          color: #34D399;
          transform: translateY(-1px);
        }
      }

      &.active {
        background: rgba(16, 185, 129, 0.12);
        color: #FFFFFF;

        .rail-icon-box {
          color: #10B981;
          background: rgba(16, 185, 129, 0.2);
          box-shadow: 0 0 10px rgba(16, 185, 129, 0.3);
        }

        .rail-app-label {
          color: #34D399;
          font-weight: 800;
        }
      }
    }

    .rail-bottom-actions {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.35rem;
      padding-top: 0.4rem;
      border-top: 1px solid #1E293B;
    }

    .rail-action-btn {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: #1E293B;
      border: 1px solid #334155;
      color: #94A3B8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      transition: all 0.18s ease;

      &:hover {
        background: #334155;
        color: #FFFFFF;
        border-color: #475569;
      }

      &.logout-action:hover {
        background: #DC2626;
        color: #FFFFFF;
        border-color: #EF4444;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
      }
    }

    /* ======================================================== */
    /* 2. SECONDARY CONTEXTUAL SUB-SIDEBAR STYLING              */
    /* ======================================================== */
    .secondary-rail {
      width: 245px;
      min-width: 245px;
      height: 100vh;
      background: #FFFFFF;
      border-inline-end: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1),
                  opacity 0.18s ease,
                  transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      box-shadow: 3px 0 14px rgba(15, 23, 42, 0.03);
      z-index: 91;

      &.collapsed {
        width: 0;
        min-width: 0;
        border-inline-end: none;
        opacity: 0;
        transform: translateX(15px);
        pointer-events: none;
      }
    }

    .sub-rail-header {
      padding: 0.85rem 0.95rem;
      border-bottom: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      background: #FAFAFA;
    }

    .module-identity {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
    }

    .module-icon-badge {
      width: 34px;
      height: 34px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;

      &.theme-emerald {
        background: linear-gradient(135deg, #059669 0%, #10B981 100%);
        color: #FFFFFF;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
      }

      &.theme-blue {
        background: linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%);
        color: #FFFFFF;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
      }

      &.theme-purple {
        background: linear-gradient(135deg, #7E22CE 0%, #A855F7 100%);
        color: #FFFFFF;
        box-shadow: 0 2px 8px rgba(147, 51, 234, 0.25);
      }
    }

    .module-text-wrap {
      display: flex;
      flex-direction: column;
      min-width: 0;

      .module-main-title {
        font-size: 0.86rem;
        font-weight: 800;
        color: #0F172A;
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .module-sub-title {
        font-size: 0.65rem;
        font-weight: 600;
        color: #64748B;
        white-space: nowrap;
      }
    }

    .sub-rail-close-btn {
      width: 26px;
      height: 26px;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #94A3B8;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      transition: all 0.15s ease;
      flex-shrink: 0;

      &:hover {
        background: #F1F5F9;
        color: #0F172A;
        border-color: #CBD5E1;
      }
    }

    .sub-rail-tenant {
      padding: 0.45rem 0.85rem;
      background: #F8FAFC;
      border-bottom: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      .tenant-tag-icon {
        width: 22px;
        height: 22px;
        border-radius: 5px;
        background: #EEF2F6;
        color: #059669;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.72rem;
        flex-shrink: 0;
      }

      .tenant-tag-details {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .tenant-label {
          font-size: 0.58rem;
          font-weight: 600;
          color: #94A3B8;
        }

        .tenant-org {
          font-size: 0.72rem;
          font-weight: 750;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }
    }

    /* Sub-Rail Nav Container */
    .sub-rail-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 0.6rem 0.55rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .nav-links-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .nav-entry-link {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.45rem 0.65rem;
      border-radius: 8px;
      color: #334155;
      text-decoration: none;
      font-size: 0.79rem;
      font-weight: 650;
      transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);

      .entry-icon-box {
        width: 26px;
        height: 26px;
        border-radius: 6px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748B;
        font-size: 0.8rem;
        flex-shrink: 0;
        transition: all 0.15s ease;
      }

      .entry-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .entry-arrow {
        font-size: 0.68rem;
        color: #94A3B8;
        opacity: 0;
        transform: translateX(4px);
        transition: all 0.15s ease;
      }

      &:hover {
        background: #F8FAFC;
        color: #0F172A;

        .entry-icon-box {
          background: #FFFFFF;
          border-color: #CBD5E1;
          color: #0F172A;
        }

        .entry-arrow {
          opacity: 1;
          transform: translateX(0);
        }
      }

      &.active {
        background: #ECFDF5;
        color: #059669;
        font-weight: 800;

        .entry-icon-box {
          background: #10B981;
          border-color: #10B981;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }

        .entry-arrow {
          opacity: 1;
          color: #059669;
          transform: translateX(0);
        }
      }

      &.child-link {
        font-size: 0.76rem;
        padding: 0.38rem 0.55rem;
      }
    }

    /* Subgroup Cards */
    .subgroups-stack {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .subgroup-card {
      display: flex;
      flex-direction: column;
      background: #FAFAFA;
      border: 1px solid #F1F5F9;
      border-radius: 9px;
      overflow: hidden;
      transition: all 0.15s ease;

      &:hover {
        border-color: #E2E8F0;
      }
    }

    .subgroup-toggle {
      width: 100%;
      background: transparent;
      border: none;
      padding: 0.5rem 0.65rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.4rem;
      transition: all 0.15s ease;

      .group-title-side {
        display: flex;
        align-items: center;
        gap: 0.45rem;
        min-width: 0;

        .group-icon {
          font-size: 0.8rem;
          color: #64748B;
        }

        .group-name {
          font-size: 0.75rem;
          font-weight: 750;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .group-meta-side {
        display: flex;
        align-items: center;
        gap: 0.35rem;

        .group-badge {
          font-size: 0.6rem;
          font-weight: 700;
          background: #EEF2F6;
          color: #64748B;
          padding: 0.05rem 0.35rem;
          border-radius: 999px;
        }

        .group-chevron {
          font-size: 0.62rem;
          color: #94A3B8;
          transition: transform 0.18s ease;

          &.rotated {
            transform: rotate(90deg);
          }
        }
      }

      &:hover {
        background: #F1F5F9;
      }

      &.open {
        background: #F8FAFC;
        border-bottom: 1px solid #F1F5F9;

        .group-title-side .group-icon {
          color: #059669;
        }

        .group-title-side .group-name {
          color: #0F172A;
          font-weight: 800;
        }
      }

      &.has-active {
        background: #F0FDF4;

        .group-title-side .group-icon {
          color: #10B981;
        }

        .group-title-side .group-name {
          color: #065F46;
          font-weight: 800;
        }
      }
    }

    .subgroup-links-list {
      list-style: none;
      padding: 0.25rem 0.45rem 0.35rem;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      background: #FFFFFF;
      animation: fadeInSubLinks 0.15s ease-out;
    }

    @keyframes fadeInSubLinks {
      from {
        opacity: 0;
        transform: translateY(-3px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Sub-Rail Footer */
    .sub-rail-footer {
      padding: 0.65rem 0.85rem;
      background: #FAFAFA;
      border-top: 1px solid #F1F5F9;
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      min-width: 0;

      .user-avatar-circle {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #ECFDF5;
        border: 1px solid #A7F3D0;
        color: #059669;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        flex-shrink: 0;
      }

      .user-meta-column {
        display: flex;
        flex-direction: column;
        min-width: 0;

        .user-fullname {
          font-size: 0.74rem;
          font-weight: 750;
          color: #0F172A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-login-name {
          font-size: 0.62rem;
          font-weight: 600;
          color: #94A3B8;
          white-space: nowrap;
        }
      }
    }

    /* Custom Slim Scrollbar */
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
      height: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: #CBD5E1;
      border-radius: 4px;
    }

    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: #94A3B8;
    }
  `]
})
export class SidebarComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  // Active module selected on the primary rail
  selectedSectionId = signal<string>('main-overview');
  
  // Collapse toggle for the contextual secondary rail
  isSubRailCollapsed = signal<boolean>(false);

  toggleSubRail() {
    this.isSubRailCollapsed.set(!this.isSubRailCollapsed());
  }

  get activeSection(): NavSection | undefined {
    return this.navSections.find(s => s.id === this.selectedSectionId());
  }

  get visibleSections(): NavSection[] {
    return this.navSections.filter(s => this.isSectionVisible(s));
  }

  selectSection(section: NavSection) {
    this.selectedSectionId.set(section.id);
    this.isSubRailCollapsed.set(false);

    // Strict Accordion: Ensure only one subgroup is open when selecting section
    this.openSingleSubgroupForSection(section);

    // If current route does not belong to this section, navigate to first available route
    if (!this.isCurrentRouteInSection(section)) {
      const targetRoute = this.getFirstRouteOfSection(section);
      if (targetRoute) {
        this.router.navigateByUrl(targetRoute);
      }
    }
  }

  selectSectionById(sectionId: string, navigate: boolean = false) {
    const sec = this.navSections.find(s => s.id === sectionId);
    if (sec) {
      this.selectedSectionId.set(sec.id);
      this.isSubRailCollapsed.set(false);
      this.openSingleSubgroupForSection(sec);
      if (navigate) {
        const targetRoute = this.getFirstRouteOfSection(sec);
        if (targetRoute) {
          this.router.navigateByUrl(targetRoute);
        }
      }
    }
  }

  private openSingleSubgroupForSection(section: NavSection) {
    if (!section.subGroups || section.subGroups.length === 0) return;
    const fullUrl = this.router.url;
    const currentUrl = fullUrl.split('?')[0];
    const queryStr = fullUrl.split('?')[1] || '';
    const urlParams = new URLSearchParams(queryStr);

    const matchesItem = (item: NavItem) => {
      if (item.queryParams) {
        for (const [key, value] of Object.entries(item.queryParams)) {
          if (urlParams.get(key) !== value) return false;
        }
      }
      return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
    };

    const matchedGroup = section.subGroups.find(g => g.items.some(matchesItem));
    for (const g of section.subGroups) {
      g.isOpen = false;
    }
    if (matchedGroup) {
      matchedGroup.isOpen = true;
    } else {
      section.subGroups[0].isOpen = true;
    }
  }

  getFirstRouteOfSection(section: NavSection): string | null {
    if (section.items && section.items.length > 0) {
      const visibleItem = section.items.find(i => this.isItemVisible(i));
      return visibleItem ? visibleItem.route : section.items[0].route;
    }
    if (section.subGroups && section.subGroups.length > 0) {
      for (const group of section.subGroups) {
        const visibleItem = group.items.find(i => this.isItemVisible(i));
        if (visibleItem) return visibleItem.route;
      }
    }
    return null;
  }

  isCurrentRouteInSection(section: NavSection): boolean {
    const fullUrl = this.router.url;
    const currentUrl = fullUrl.split('?')[0];
    const queryStr = fullUrl.split('?')[1] || '';
    const urlParams = new URLSearchParams(queryStr);

    const matchesItem = (item: NavItem) => {
      if (item.queryParams) {
        for (const [key, value] of Object.entries(item.queryParams)) {
          if (urlParams.get(key) !== value) return false;
        }
      }
      return currentUrl === item.route || currentUrl.startsWith(item.route + '/');
    };

    if (section.items && section.items.some(matchesItem)) {
      return true;
    }
    if (section.subGroups) {
      for (const group of section.subGroups) {
        if (group.items.some(matchesItem)) {
          return true;
        }
      }
    }
    return false;
  }

  syncActiveSectionFromUrl(url: string) {
    const basePath = url.split('?')[0];
    const queryStr = url.split('?')[1] || '';
    const urlParams = new URLSearchParams(queryStr);

    const matchesItem = (i: NavItem) => {
      if (i.queryParams) {
        for (const [key, value] of Object.entries(i.queryParams)) {
          if (urlParams.get(key) !== value) return false;
        }
      }
      return basePath === i.route || basePath.startsWith(i.route + '/');
    };

    // Find section that owns this route
    for (const section of this.navSections) {
      if (this.isSectionVisible(section)) {
        if (this.isCurrentRouteInSection(section)) {
          this.selectedSectionId.set(section.id);
          
          // Strict Accordion: ONLY open the single matched subgroup, collapse all others
          if (section.subGroups) {
            const matchedGroup = section.subGroups.find(group =>
              group.items.some(matchesItem)
            );
            for (const group of section.subGroups) {
              group.isOpen = false;
            }
            if (matchedGroup) {
              matchedGroup.isOpen = true;
            } else if (section.subGroups.length > 0) {
              section.subGroups[0].isOpen = true;
            }
          }
          return;
        }
      }
    }
  }

  toggleSubGroup(group: NavSubGroup) {
    const isCurrentlyOpen = group.isOpen;
    // Strict Accordion Rule: Close ALL subgroups in the current active section
    if (this.activeSection?.subGroups) {
      for (const g of this.activeSection.subGroups) {
        g.isOpen = false;
      }
    }
    // Only toggle the clicked one (if closed -> opens, if open -> collapses)
    group.isOpen = !isCurrentlyOpen;
  }

  isSectionVisible(section: NavSection): boolean {
    if (section.superAdminOnly && !this.authService.isSuperAdmin()) {
      return false;
    }
    if (this.authService.isSalesperson()) {
      return section.id === 'main-overview' || section.id === 'sales-customers';
    }
    return true;
  }

  isItemVisible(item: NavItem): boolean {
    if (item.superAdminOnly && !this.authService.isSuperAdmin()) {
      return false;
    }
    if (this.authService.isSalesperson()) {
      if (item.route === '/invoicing/salespersons') {
        return false;
      }
    }
    return true;
  }

  getSubItemsCount(section?: NavSection): number {
    if (!section) return 0;
    if (section.items) return section.items.filter(i => this.isItemVisible(i)).length;
    if (section.subGroups) {
      return section.subGroups.reduce((acc, g) => acc + g.items.filter(i => this.isItemVisible(i)).length, 0);
    }
    return 0;
  }

  private _flatNavItems: NavItem[] | null = null;
  get allNavItems(): NavItem[] {
    if (!this._flatNavItems) {
      if (!this.navSections) return [];
      const items: NavItem[] = [];
      for (const s of this.navSections) {
        if (s.items) items.push(...s.items);
        if (s.subGroups) {
          for (const g of s.subGroups) {
            items.push(...g.items);
          }
        }
      }
      this._flatNavItems = items;
    }
    return this._flatNavItems;
  }

  isItemActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    const urlParts = currentUrl.split('?');
    const basePath = urlParts[0];
    const queryStr = urlParts[1] || '';
    const urlParams = new URLSearchParams(queryStr);

    const tabParam = urlParams.get('tab');
    if (basePath === '/projects' && tabParam) {
      if (tabParam === 'billings') {
        if (item.route !== '/projects/billings') return false;
      } else if (tabParam === 'guarantees') {
        if (item.route !== '/projects/guarantees') return false;
      } else if (tabParam === 'planning') {
        if (item.route !== '/projects/planning') return false;
      } else if (tabParam === 'timesheet') {
        if (item.route !== '/projects/timesheet') return false;
      } else if (tabParam === 'settings') {
        if (item.route !== '/projects/settings') return false;
      } else if (tabParam === 'projects') {
        if (item.route !== '/projects') return false;
      }
    } else {
      const hasExactRouteItem = this.allNavItems.some(i => i.route === basePath);
      if (hasExactRouteItem) {
        if (basePath !== item.route) {
          return false;
        }
      } else {
        if (basePath !== item.route && !basePath.startsWith(item.route + '/')) {
          return false;
        }
      }
    }

    if (item.queryParams) {
      for (const [key, value] of Object.entries(item.queryParams)) {
        if (urlParams.get(key) !== value) {
          return false;
        }
      }
    } else if (queryStr) {
      const hasSiblingWithMatchingParams = this.allNavItems.some(i =>
        i.route === item.route && i.queryParams && Object.entries(i.queryParams).every(([k, v]) => urlParams.get(k) === v)
      );
      if (hasSiblingWithMatchingParams) {
        return false;
      }
    }

    return true;
  }

  isSubGroupActive(group: NavSubGroup): boolean {
    return group.items.some(item => this.isItemActive(item));
  }

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.syncActiveSectionFromUrl(event.urlAfterRedirects || event.url);
    });

    setTimeout(() => {
      this.syncActiveSectionFromUrl(this.router.url);
    }, 60);
  }

  navSections: NavSection[] = [
    // 0. لوحة التحكم والوصول السريع
    {
      id: 'main-overview',
      titleAr: 'لوحة التحكم والرئيسية',
      titleEn: 'Overview & Dashboard',
      shortTitleAr: 'الرئيسية',
      shortTitleEn: 'Overview',
      icon: 'pi pi-home',
      collapsible: false,
      isOpen: true,
      items: [
        {
          labelAr: 'لوحة المؤشرات العامة',
          labelEn: 'Executive Dashboard',
          icon: 'pi pi-chart-pie',
          route: '/dashboard'
        },
        {
          labelAr: 'مساحة العمل والمهام الشخصية',
          labelEn: 'Workspace & Tasks',
          icon: 'pi pi-calendar',
          route: '/workspace/agenda'
        }
      ]
    },

    // 1. القسم: المبيعات والعملاء (Sales & Partners)
    {
      id: 'sales-customers',
      titleAr: 'المبيعات والعملاء',
      titleEn: 'Sales & Customers',
      shortTitleAr: 'المبيعات',
      shortTitleEn: 'Sales',
      subtitleAr: 'الفواتير ونقاط البيع والعملاء',
      subtitleEn: 'Invoices, POS & Customers',
      icon: 'pi pi-shopping-bag',
      theme: 'purple',
      isOpen: true,
      subGroups: [
        {
          id: 'sales-billing',
          titleAr: 'فواتير ومردودات المبيعات',
          titleEn: 'Sales Invoices & Billing',
          icon: 'pi pi-file',
          isOpen: true,
          items: [
            {
              labelAr: 'فواتير المبيعات الضريبية',
              labelEn: 'Sales Tax Invoices',
              icon: 'pi pi-file',
              route: '/invoicing/tax-invoices'
            },
            {
              labelAr: 'مردودات المبيعات (إشعارات دائنة)',
              labelEn: 'Sales Returns (Credit Notes)',
              icon: 'pi pi-replay',
              route: '/invoicing/credit-notes'
            },
            {
              labelAr: 'عروض الأسعار والتسعير',
              labelEn: 'Price Quotations',
              icon: 'pi pi-file-edit',
              route: '/invoicing/quotations'
            },
            {
              labelAr: 'فواتير نقاط البيع (POS)',
              labelEn: 'POS Cash Invoices',
              icon: 'pi pi-receipt',
              route: '/invoicing/simplified'
            },
            {
              labelAr: 'فريق ومناديب المبيعات',
              labelEn: 'Salespersons Management',
              icon: 'pi pi-id-card',
              route: '/invoicing/salespersons'
            }
          ]
        },
        {
          id: 'customers-management',
          titleAr: 'سجل العملاء والشركاء',
          titleEn: 'Customers & CRM',
          icon: 'pi pi-users',
          isOpen: false,
          items: [
            {
              labelAr: 'دليل العملاء المعتمدين',
              labelEn: 'Customers Directory',
              icon: 'pi pi-users',
              route: '/accounting/partners',
              queryParams: { type: 'customer' }
            },
            {
              labelAr: 'إضافة عميل جديد',
              labelEn: 'Register New Customer',
              icon: 'pi pi-user-plus',
              route: '/accounting/partners/create',
              queryParams: { type: 'customer' }
            }
          ]
        },
        {
          id: 'sales-settings',
          titleAr: 'إعدادات وسياسات المبيعات',
          titleEn: 'Sales Settings & ZATCA',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'تهيئة وربط زكاة (ZATCA)',
              labelEn: 'ZATCA Phase 2 Integration',
              icon: 'pi pi-verified',
              route: '/invoicing/zatca-onboarding'
            },
            {
              labelAr: 'إعدادات المبيعات ونقاط البيع',
              labelEn: 'Sales & POS Settings',
              icon: 'pi pi-shopping-cart',
              route: '/settings/modules',
              queryParams: { tab: 'pos' }
            },
            {
              labelAr: 'سياسات الفوترة والربط المحاسبي',
              labelEn: 'Invoicing & GL Policies',
              icon: 'pi pi-file-edit',
              route: '/settings/modules',
              queryParams: { tab: 'invoicing' }
            }
          ]
        }
      ]
    },

    // 2. القسم: المحاسبة والمالية (Financial Accounting)
    {
      id: 'financial-accounting',
      titleAr: 'المحاسبة والمالية',
      titleEn: 'Accounting & Finance',
      shortTitleAr: 'المحاسبة',
      shortTitleEn: 'Accounting',
      subtitleAr: 'الدفاتر، التقارير والسياسات',
      subtitleEn: 'Ledgers, Reports & Policies',
      icon: 'pi pi-calculator',
      theme: 'emerald',
      isOpen: true,
      subGroups: [
        {
          id: 'gl',
          titleAr: 'القيود والأستاذ العام',
          titleEn: 'General Ledger',
          icon: 'pi pi-book',
          isOpen: true,
          items: [
            {
              labelAr: 'دليل الحسابات المعتمد (IFRS)',
              labelEn: 'Chart of Accounts',
              icon: 'pi pi-sitemap',
              route: '/accounting/chart-of-accounts'
            },
            {
              labelAr: 'قيود اليومية العامة',
              labelEn: 'Journal Entries',
              icon: 'pi pi-book',
              route: '/accounting/journal-entries'
            },
            {
              labelAr: 'دفتر الأستاذ العام',
              labelEn: 'General Ledger Book',
              icon: 'pi pi-list',
              route: '/accounting/general-ledger'
            },
            {
              labelAr: 'كشف حساب تفصيلي',
              labelEn: 'Account Statement',
              icon: 'pi pi-file-edit',
              route: '/accounting/account-statement'
            },
            {
              labelAr: 'ميزان المراجعة بالمجاميع والأرصدة',
              labelEn: 'Trial Balance',
              icon: 'pi pi-chart-bar',
              route: '/accounting/trial-balance'
            }
          ]
        },
        {
          id: 'treasury',
          titleAr: 'الخزينة والمقبوضات والأصول',
          titleEn: 'Treasury & Fixed Assets',
          icon: 'pi pi-wallet',
          isOpen: false,
          items: [
            {
              labelAr: 'سندات القبض والصرف',
              labelEn: 'Receipt & Payment Vouchers',
              icon: 'pi pi-wallet',
              route: '/accounting/vouchers'
            },
            {
              labelAr: 'مطابقة وتسوية البنك',
              labelEn: 'Bank Reconciliation',
              icon: 'pi pi-sync',
              route: '/accounting/bank-reconciliation'
            },
            {
              labelAr: 'محفظة الشيكات وأوراق القبض',
              labelEn: 'Checks & PDC Portfolio',
              icon: 'pi pi-credit-card',
              route: '/accounting/checks'
            },
            {
              labelAr: 'سجل وإهلاك الأصول الثابتة',
              labelEn: 'Fixed Assets Register',
              icon: 'pi pi-database',
              route: '/accounting/fixed-assets'
            }
          ]
        },
        {
          id: 'statements',
          titleAr: 'التقارير المالية ومراكز التكلفة',
          titleEn: 'Financial Statements & Costs',
          icon: 'pi pi-chart-line',
          isOpen: false,
          items: [
            {
              labelAr: 'القوائم المالية الختامية',
              labelEn: 'Financial Statements',
              icon: 'pi pi-file-edit',
              route: '/accounting/financial-statements'
            },
            {
              labelAr: 'شجرة مراكز التكلفة',
              labelEn: 'Cost Centers Tree',
              icon: 'pi pi-tags',
              route: '/accounting/cost-centers'
            }
          ]
        },
        {
          id: 'accounting-settings',
          titleAr: 'الإعدادات والسياسات المالية',
          titleEn: 'Accounting Policies & Closing',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'الإعدادات والسياسات المالية للمحاسبة',
              labelEn: 'Financial Settings',
              icon: 'pi pi-sliders-h',
              route: '/accounting/financial-settings'
            },
            {
              labelAr: 'معالج إقفال السنة المالية',
              labelEn: 'Year-End Closing Wizard',
              icon: 'pi pi-lock',
              route: '/accounting/year-end-closing'
            },
            {
              labelAr: 'إعدادات المحاسبة وضريبة القيمة المضافة',
              labelEn: 'Accounting & VAT Settings',
              icon: 'pi pi-cog',
              route: '/settings/modules',
              queryParams: { tab: 'accounting' }
            }
          ]
        }
      ]
    },

    // 3. القسم: إدارة المستودعات والمخزون والمشتريات (Inventory & Purchasing)
    {
      id: 'inventory-warehousing',
      titleAr: 'المستودعات والمشتريات',
      titleEn: 'Inventory & Purchasing',
      shortTitleAr: 'المخزون',
      shortTitleEn: 'Inventory',
      subtitleAr: 'المخزون والتوريد وسلاسل الإمداد',
      subtitleEn: 'Stock, Supply Chain & Logistics',
      icon: 'pi pi-box',
      theme: 'blue',
      isOpen: true,
      subGroups: [
        {
          id: 'warehouse-ops',
          titleAr: 'إدارة وحركات المستودعات',
          titleEn: 'Warehouse Movements',
          icon: 'pi pi-box',
          isOpen: true,
          items: [
            {
              labelAr: 'دليل الأصناف والباركود',
              labelEn: 'Item Catalog & Barcodes',
              icon: 'pi pi-box',
              route: '/purchasing/items'
            },
            {
              labelAr: 'دليل المستودعات وسجل المواقع',
              labelEn: 'Warehouses Register',
              icon: 'pi pi-building',
              route: '/purchasing/warehouses'
            },
            {
              labelAr: 'أرصدة المستودعات والتقييم',
              labelEn: 'Multi-Warehouse Balances',
              icon: 'pi pi-database',
              route: '/purchasing/inventory/stocks'
            },
            {
              labelAr: 'تسويات الجرد والعجز/الفائض',
              labelEn: 'Stock Adjustments',
              icon: 'pi pi-sliders-h',
              route: '/purchasing/inventory/adjustments'
            },
            {
              labelAr: 'التحويلات المخزنية بين الفروع',
              labelEn: 'Inter-Branch Stock Transfers',
              icon: 'pi pi-arrows-h',
              route: '/purchasing/inventory/transfers'
            }
          ]
        },
        {
          id: 'purchasing-supply',
          titleAr: 'دورة المشتريات والتوريد',
          titleEn: 'Procurement Lifecycle',
          icon: 'pi pi-shopping-bag',
          isOpen: false,
          items: [
            {
              labelAr: 'دورة الشراء (طلبات، أوامر، استلام)',
              labelEn: 'Procurement Workflow',
              icon: 'pi pi-sitemap',
              route: '/purchasing/procurement'
            },
            {
              labelAr: 'فواتير المشتريات والموردين',
              labelEn: 'Purchase Invoices',
              icon: 'pi pi-file-check',
              route: '/purchasing/invoices'
            },
            {
              labelAr: 'دليل الموردين المعتمدين',
              labelEn: 'Suppliers Directory',
              icon: 'pi pi-truck',
              route: '/accounting/partners',
              queryParams: { type: 'supplier' }
            }
          ]
        },
        {
          id: 'inventory-settings',
          titleAr: 'إعدادات المستودعات والمشتريات',
          titleEn: 'Inventory & Supply Settings',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'سياسات تقييم المخزون والتوريد',
              labelEn: 'Inventory & Valuation Settings',
              icon: 'pi pi-sliders-h',
              route: '/settings/modules',
              queryParams: { tab: 'purchasing' }
            }
          ]
        }
      ]
    },

    // 4. القسم: الموارد البشرية والرواتب (HR & Saudi Payroll / WPS مدد)
    {
      id: 'human-resources',
      titleAr: 'الموارد البشرية والرواتب',
      titleEn: 'HR & Payroll (Mudad WPS)',
      shortTitleAr: 'الموظفون',
      shortTitleEn: 'HR',
      subtitleAr: 'شؤون الموظفين، السلف، العهد والرواتب',
      subtitleEn: 'Personnel, Advances, Custody & Payroll',
      icon: 'pi pi-id-card',
      theme: 'emerald',
      isOpen: true,
      subGroups: [
        {
          id: 'hr-workforce',
          titleAr: 'شؤون الموظفين والعهد',
          titleEn: 'Employees & Custody',
          icon: 'pi pi-users',
          isOpen: true,
          items: [
            {
              labelAr: 'سجل وملفات الموظفين',
              labelEn: 'Employees Directory',
              icon: 'pi pi-users',
              route: '/hr/employees'
            },
            {
              labelAr: 'إدارة عهد الموظفين وإبراء الذمة',
              labelEn: 'Employee Custody & Clearance',
              icon: 'pi pi-box',
              route: '/hr/custody'
            }
          ]
        },
        {
          id: 'hr-payroll-wps',
          titleAr: 'الرواتب ومسير نظام مدد',
          titleEn: 'Payroll & Mudad WPS',
          icon: 'pi pi-wallet',
          isOpen: false,
          items: [
            {
              labelAr: 'مسيّر الرواتب الشهري وحماية الأجور',
              labelEn: 'Monthly Payroll Worksheet',
              icon: 'pi pi-wallet',
              route: '/hr/payroll'
            },
            {
              labelAr: 'طلبات السلف والاعتمادات',
              labelEn: 'Loans & Advances Requests',
              icon: 'pi pi-credit-card',
              route: '/hr/advances'
            }
          ]
        },
        {
          id: 'hr-settings-group',
          titleAr: 'لوائح وإعدادات الموارد البشرية',
          titleEn: 'HR Governance & Settings',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'سياسات وقواعد السلف والعهد',
              labelEn: 'Advances & Custody Policies',
              icon: 'pi pi-sliders-h',
              route: '/hr/settings'
            },
            {
              labelAr: 'إعدادات الرواتب والتأمينات (GOSI)',
              labelEn: 'Payroll & GOSI Settings',
              icon: 'pi pi-cog',
              route: '/settings/modules',
              queryParams: { tab: 'hr' }
            }
          ]
        }
      ]
    },

    // 5. القسم: عقود المقاولات وإدارة المشاريع (Project Costing & Contracts)
    {
      id: 'projects-contracts',
      titleAr: 'إدارة المشاريع والمقاولات',
      titleEn: 'Projects & Contracts Hub',
      shortTitleAr: 'المشاريع',
      shortTitleEn: 'Projects',
      subtitleAr: 'المستخلصات، الضمانات وجداول جانت',
      subtitleEn: 'Progress Billings, Guarantees & Gantt',
      icon: 'pi pi-building',
      theme: 'blue',
      isOpen: true,
      subGroups: [
        {
          id: 'projects-hub-group',
          titleAr: 'المشاريع والمستخلصات الميدانية',
          titleEn: 'Projects & Operations',
          icon: 'pi pi-folder',
          isOpen: true,
          items: [
            {
              labelAr: 'لوحة المشاريع والعقود',
              labelEn: 'Projects Hub',
              icon: 'pi pi-briefcase',
              route: '/projects'
            },
            {
              labelAr: 'المستخلصات الدورية للمقاولين',
              labelEn: 'Progress Billings',
              icon: 'pi pi-file-edit',
              route: '/projects/billings'
            },
            {
              labelAr: 'خطابات الضمان البنكية',
              labelEn: 'Letters of Bank Guarantee',
              icon: 'pi pi-shield',
              route: '/projects/guarantees'
            },
            {
              labelAr: 'التخطيط ومخطط جانت (Gantt)',
              labelEn: 'Gantt Planning & Scheduling',
              icon: 'pi pi-chart-bar',
              route: '/projects/planning'
            },
            {
              labelAr: 'سجل ساعات وعمالة الميدان',
              labelEn: 'Field Timesheets',
              icon: 'pi pi-clock',
              route: '/projects/timesheet'
            }
          ]
        },
        {
          id: 'projects-settings-group',
          titleAr: 'إعدادات وسياسات المشاريع',
          titleEn: 'Project Settings & Costing',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'إعدادات وسياسات المشاريع',
              labelEn: 'Project Settings',
              icon: 'pi pi-sliders-h',
              route: '/projects/settings'
            },
            {
              labelAr: 'معايير تكاليف العقود والمقاولات',
              labelEn: 'Contract Costing Standards',
              icon: 'pi pi-cog',
              route: '/settings/modules',
              queryParams: { tab: 'projects' }
            }
          ]
        }
      ]
    },

    // 6. القسم: التصنيع والإنتاج والتجميع (Manufacturing & Production)
    {
      id: 'manufacturing-master',
      titleAr: 'التصنيع والإنتاج والتجميع',
      titleEn: 'Manufacturing & Production',
      shortTitleAr: 'التصنيع',
      shortTitleEn: 'Production',
      subtitleAr: 'أوامر التشغيل، وقوائم المواد (BOM)',
      subtitleEn: 'Work Orders & Bill of Materials',
      icon: 'pi pi-cog',
      theme: 'emerald',
      isOpen: true,
      subGroups: [
        {
          id: 'manufacturing-ops',
          titleAr: 'أوامر التشغيل وشجرة المنتج',
          titleEn: 'Work Orders & BOM',
          icon: 'pi pi-cog',
          isOpen: true,
          items: [
            {
              labelAr: 'أوامر التشغيل والإنتاج الميداني',
              labelEn: 'Manufacturing Work Orders',
              icon: 'pi pi-list',
              route: '/manufacturing'
            },
            {
              labelAr: 'شجرة المنتج وقوائم المواد (BOM)',
              labelEn: 'Bill of Materials (BOM)',
              icon: 'pi pi-sitemap',
              route: '/manufacturing/bom'
            }
          ]
        },
        {
          id: 'manufacturing-settings-group',
          titleAr: 'إعدادات ومعايير التصنيع',
          titleEn: 'Manufacturing Settings',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'إعدادات التكاليف ومراكز العمل الصناعية',
              labelEn: 'Costing & Work Center Settings',
              icon: 'pi pi-sliders-h',
              route: '/settings/modules',
              queryParams: { tab: 'general' }
            }
          ]
        }
      ]
    },

    // 7. القسم: إدارة النظام والأمان والمستخدمين (Administration & Users)
    {
      id: 'admin-security',
      titleAr: 'إدارة النظام والإعدادات',
      titleEn: 'Administration & Security',
      shortTitleAr: 'الإعدادات',
      shortTitleEn: 'Settings',
      subtitleAr: 'لوحة الإعدادات، المستخدمين والأذونات',
      subtitleEn: 'System Settings, Users & Matrix',
      icon: 'pi pi-sliders-h',
      theme: 'purple',
      isOpen: true,
      subGroups: [
        {
          id: 'admin-settings-group',
          titleAr: 'إعدادات النظام والمنشأة',
          titleEn: 'System & Modules Settings',
          icon: 'pi pi-sliders-h',
          isOpen: true,
          items: [
            {
              labelAr: 'لوحة إعدادات الموديولات المركزية',
              labelEn: 'Central Modules Settings',
              icon: 'pi pi-sliders-h',
              route: '/settings/modules',
              queryParams: { tab: 'general' }
            },
            {
              labelAr: 'فروع الشركة والمستودعات',
              labelEn: 'Branches & Warehouses Matrix',
              icon: 'pi pi-building',
              route: '/settings/branches'
            },
            {
              labelAr: 'إدارة الشركات والمستأجرين',
              labelEn: 'Companies Management',
              icon: 'pi pi-building',
              route: '/companies',
              superAdminOnly: true
            }
          ]
        },
        {
          id: 'admin-users-group',
          titleAr: 'المستخدمين ومصفوفة الصلاحيات',
          titleEn: 'Users & Permissions Matrix',
          icon: 'pi pi-shield',
          isOpen: false,
          items: [
            {
              labelAr: 'مستخدمو المنشأة ومصفوفة الأذونات',
              labelEn: 'Users & Roles Matrix',
              icon: 'pi pi-users',
              route: '/settings/users-and-roles'
            },
            {
              labelAr: 'سياسات الأمان وحماية النظام',
              labelEn: 'System Security Policies',
              icon: 'pi pi-lock',
              route: '/settings/modules',
              queryParams: { tab: 'system' }
            }
          ]
        }
      ]
    }
  ];
}
