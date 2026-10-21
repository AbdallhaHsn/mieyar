import { Component, inject, signal } from '@angular/core';
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
  icon: string;
  collapsible?: boolean;
  isOpen: boolean;
  items?: NavItem[];
  subGroups?: NavSubGroup[];
  superAdminOnly?: boolean;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="erp-sidebar" [class.collapsed]="isCollapsed()">
      <!-- Official Al-Roban Brand Header -->
      <div class="sidebar-header">
        <div class="brand-box" (click)="router.navigate(['/dashboard'])">
          <div class="brand-logo-frame">
            <img src="/alruban-logo.jpg" alt="Al-Roban Logo" class="official-logo" />
          </div>
          <div class="brand-text" *ngIf="!isCollapsed()">
            <h2 class="brand-title">الرّبــــان</h2>
            <span class="brand-edition">نظام ERP السحابي</span>
          </div>
        </div>

        <button class="collapse-toggle-btn" (click)="toggleCollapse()" [title]="isCollapsed() ? 'توسيع' : 'طي'">
          <i class="pi" [ngClass]="isCollapsed() ? 'pi-angle-right' : 'pi-angle-left'"></i>
        </button>
      </div>

      <!-- Active Tenant Pill -->
      <div class="tenant-indicator" *ngIf="!isCollapsed()">
        <div class="tenant-icon">
          <i class="pi pi-building"></i>
        </div>
        <div class="tenant-meta">
          <span class="tenant-role">
            {{ authService.isSuperAdmin() 
              ? (langService.currentLang() === 'ar' ? 'الشركة المالكة' : 'Platform Owner')
              : (langService.currentLang() === 'ar' ? 'الشركة المستأجرة' : 'Tenant Company') }}
          </span>
          <strong class="tenant-name" [title]="companyContext.companyName()(langService.currentLang())">
            {{ companyContext.companyName()(langService.currentLang()) }}
          </strong>
        </div>
      </div>

      <!-- Navigation Tree with Grouped Collapsible Clusters -->
      <nav class="sidebar-nav">
        <ng-container *ngFor="let section of navSections">
          
          <!-- 1. Standalone Section with direct items (e.g. Main & Workspace) -->
          <div class="nav-section" *ngIf="section.items && (!section.superAdminOnly || authService.isSuperAdmin())">
            
            <!-- Standard Header (non-collapsible e.g. Main) -->
            <div class="section-title" *ngIf="!isCollapsed() && !section.collapsible">
              <span class="title-text">{{ langService.currentLang() === 'ar' ? section.titleAr : section.titleEn }}</span>
              <span class="title-line"></span>
            </div>

            <!-- Group Header with Accordion Toggle & Item Badge (if collapsible) -->
            <button 
              type="button" 
              class="section-accordion-btn" 
              *ngIf="!isCollapsed() && section.collapsible"
              [class.open]="section.isOpen"
              [class.has-active]="isSectionActive(section)"
              (click)="toggleSection(section)">
              <div class="acc-title-side">
                <i [class]="section.icon + ' acc-section-icon'"></i>
                <span class="acc-title-text">{{ langService.currentLang() === 'ar' ? section.titleAr : section.titleEn }}</span>
              </div>
              <div class="acc-meta-side">
                <span class="acc-count-pill">{{ section.items.length }}</span>
                <i class="pi pi-chevron-down acc-arrow-icon" [class.rotated]="!section.isOpen"></i>
              </div>
            </button>

            <!-- Nav Items List -->
            <ul class="nav-list" *ngIf="isCollapsed() || !section.collapsible || section.isOpen">
              <li *ngFor="let item of section.items">
                <a 
                  [routerLink]="item.route" 
                  [queryParams]="item.queryParams"
                  routerLinkActive="active" 
                  class="nav-link"
                  [title]="isCollapsed() ? (langService.currentLang() === 'ar' ? item.labelAr : item.labelEn) : ''"
                  *ngIf="!item.superAdminOnly || authService.isSuperAdmin()">
                  <div class="nav-icon-box">
                    <i [class]="item.icon + ' nav-icon'"></i>
                  </div>
                  <span class="nav-label" *ngIf="!isCollapsed()">
                    {{ langService.currentLang() === 'ar' ? item.labelAr : item.labelEn }}
                  </span>
                </a>
              </li>
            </ul>
          </div>

          <!-- 2. Master Section with Grouped Sub-sections (e.g. Financial Accounting) -->
          <div class="master-section-box" *ngIf="section.subGroups && (!section.superAdminOnly || authService.isSuperAdmin())">
            
            <!-- Master Accordion Header (Collapses ALL sub-groups at once) -->
            <button 
              type="button" 
              class="master-accordion-btn" 
              *ngIf="!isCollapsed()"
              [class.open]="section.isOpen"
              [class.has-active]="isSectionActive(section)"
              (click)="toggleSection(section)">
              <div class="master-title-side">
                <div class="master-icon-frame">
                  <i [class]="section.icon"></i>
                </div>
                <div class="master-text-block">
                  <span class="master-title">{{ langService.currentLang() === 'ar' ? section.titleAr : section.titleEn }}</span>
                  <span class="master-subtitle">{{ section.subGroups.length }} {{ langService.currentLang() === 'ar' ? 'أقسام محاسبية' : 'accounting clusters' }}</span>
                </div>
              </div>
              <div class="master-meta-side">
                <span class="master-total-badge">{{ getTotalItemsCount(section) }}</span>
                <i class="pi pi-chevron-down master-arrow-icon" [class.rotated]="!section.isOpen"></i>
              </div>
            </button>

            <!-- Sub-groups Tree (Visible when Master Section is Open) -->
            <div class="subgroups-tree" *ngIf="!isCollapsed() && section.isOpen">
              <div class="subgroup-node" *ngFor="let group of section.subGroups">
                
                <!-- Subgroup Accordion Header -->
                <button 
                  type="button" 
                  class="subgroup-btn" 
                  [class.open]="group.isOpen"
                  [class.has-active]="isSubGroupActive(group)"
                  (click)="toggleSubGroup(group)">
                  <div class="sub-title-side">
                    <i [class]="group.icon + ' sub-icon'"></i>
                    <span class="sub-title-text">{{ langService.currentLang() === 'ar' ? group.titleAr : group.titleEn }}</span>
                  </div>
                  <div class="sub-meta-side">
                    <span class="sub-count-pill">{{ group.items.length }}</span>
                    <i class="pi pi-chevron-down sub-arrow-icon" [class.rotated]="!group.isOpen"></i>
                  </div>
                </button>

                <!-- Subgroup Items List -->
                <ul class="sub-items-list" *ngIf="group.isOpen">
                  <li *ngFor="let item of group.items">
                    <a 
                      [routerLink]="item.route" 
                      [queryParams]="item.queryParams"
                      routerLinkActive="active" 
                      class="sub-item-link"
                      *ngIf="!item.superAdminOnly || authService.isSuperAdmin()">
                      <div class="item-icon-box">
                        <i [class]="item.icon"></i>
                      </div>
                      <span class="item-label">
                        {{ langService.currentLang() === 'ar' ? item.labelAr : item.labelEn }}
                      </span>
                    </a>
                  </li>
                </ul>

              </div>
            </div>

            <!-- When Sidebar is Collapsed to 72px: Show flat icons with tooltips -->
            <ul class="nav-list" *ngIf="isCollapsed()">
              <ng-container *ngFor="let group of section.subGroups">
                <li *ngFor="let item of group.items">
                  <a 
                    [routerLink]="item.route" 
                    [queryParams]="item.queryParams"
                    routerLinkActive="active" 
                    class="nav-link"
                    [title]="langService.currentLang() === 'ar' ? item.labelAr : item.labelEn"
                    *ngIf="!item.superAdminOnly || authService.isSuperAdmin()">
                    <div class="nav-icon-box">
                      <i [class]="item.icon + ' nav-icon'"></i>
                    </div>
                  </a>
                </li>
              </ng-container>
            </ul>

          </div>
        </ng-container>
      </nav>

      <!-- Bottom User Profile Strip -->
      <div class="sidebar-footer">
        <div class="user-card" *ngIf="!isCollapsed()">
          <div class="user-avatar">
            <i class="pi" [ngClass]="authService.isSuperAdmin() ? 'pi-shield' : 'pi-user'"></i>
          </div>
          <div class="user-details">
            <strong class="user-name">
              {{ langService.currentLang() === 'ar' ? authService.currentUser()?.fullNameAr : authService.currentUser()?.fullNameEn }}
            </strong>
            <span class="user-role">{{ authService.currentUser()?.userName }}</span>
          </div>
        </div>

        <button class="logout-btn" (click)="authService.logout()" [title]="langService.currentLang() === 'ar' ? 'تسجيل الخروج' : 'Sign Out'">
          <i class="pi pi-power-off"></i>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    :host {
      display: block;
      font-family: var(--font-arabic) !important;
    }

    button, a, span, strong {
      font-family: var(--font-arabic) !important;
    }

    .erp-sidebar {
      width: 275px;
      min-width: 275px;
      height: 100vh;
      background: #FFFFFF;
      border-inline-end: 1px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      position: sticky;
      top: 0;
      z-index: 90;
      color: #64748B;
      overflow-y: auto;
      overflow-x: hidden;
      box-shadow: 2px 0 12px rgba(15, 23, 42, 0.02);

      &.collapsed {
        width: 72px;
        min-width: 72px;

        .brand-box {
          justify-content: center;
        }

        .nav-link {
          justify-content: center;
          padding: 0.65rem 0.5rem;
        }

        .sidebar-header {
          padding: 1rem 0.5rem;
          justify-content: center;
        }

        .collapse-toggle-btn {
          display: none;
        }

        .sidebar-footer {
          justify-content: center;
          padding: 0.85rem 0.5rem;
        }
      }

      &::-webkit-scrollbar {
        width: 4px;
      }
      &::-webkit-scrollbar-thumb {
        background: #CBD5E1;
        border-radius: 4px;
      }
    }

    /* Header */
    .sidebar-header {
      padding: 1.15rem 1.25rem 0.95rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F1F5F9;
    }

    .brand-box {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
    }

    .brand-logo-frame {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0B1528;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
      flex-shrink: 0;

      .official-logo {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.25rem;
      font-weight: 800;
      color: #0F172A;
      margin: 0;
      letter-spacing: -0.02em;
      line-height: 1.2;
    }

    .brand-edition {
      font-size: 0.7rem;
      color: #059669;
      font-weight: 600;
    }

    .collapse-toggle-btn {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #64748B;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #ECFDF5;
        border-color: #10B981;
        color: #059669;
      }
    }

    /* Active Tenant Indicator */
    .tenant-indicator {
      margin: 0.85rem 0.85rem 0.35rem 0.85rem;
      padding: 0.55rem 0.75rem;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }

    .tenant-icon {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #ECFDF5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.82rem;
      flex-shrink: 0;
    }

    .tenant-meta {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      overflow: hidden;
    }

    .tenant-role {
      font-size: 0.65rem;
      color: #0284C7;
      font-weight: 700;
    }

    .tenant-name {
      font-size: 0.76rem;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Nav Tree */
    .sidebar-nav {
      flex: 1;
      padding: 0.65rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .nav-section {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding-inline: 0.5rem;
      margin-bottom: 0.25rem;

      .title-text {
        font-size: 0.68rem;
        font-weight: 750;
        text-transform: uppercase;
        color: #94A3B8;
        letter-spacing: 0.04em;
        white-space: nowrap;
      }

      .title-line {
        flex: 1;
        height: 1px;
        background: #F1F5F9;
      }
    }

    /* Standard Group Accordion Button */
    .section-accordion-btn {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      outline: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.4rem 0.6rem;
      border-radius: 7px;
      margin-bottom: 0.15rem;
      transition: all 0.18s ease;

      &:hover {
        background: #F8FAFC;
        border-color: #E2E8F0;
      }

      &.has-active {
        background: #ECFDF5;
        border-color: rgba(16, 185, 129, 0.2);

        .acc-title-text {
          color: #047857;
          font-weight: 800;
        }

        .acc-section-icon {
          color: #059669;
        }
      }

      .acc-title-side {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }

      .acc-section-icon {
        font-size: 0.8rem;
        color: #059669;
      }

      .acc-title-text {
        font-size: 0.73rem;
        font-weight: 750;
        color: #334155;
        white-space: nowrap;
      }

      .acc-meta-side {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .acc-count-pill {
        font-size: 0.62rem;
        font-weight: 700;
        background: #F1F5F9;
        color: #64748B;
        padding: 0.05rem 0.4rem;
        border-radius: 999px;
      }

      .acc-arrow-icon {
        font-size: 0.65rem;
        color: #94A3B8;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.rotated {
          transform: rotate(90deg);
        }
      }
    }

    /* Master Section Header (Tier 1: المحاسبة المالية) */
    .master-section-box {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .master-accordion-btn {
      width: 100%;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 9px;
      padding: 0.55rem 0.7rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.03);

      &:hover {
        background: #F1F5F9;
        border-color: #CBD5E1;
      }

      &.open, &.has-active {
        background: #ECFDF5;
        border-color: #A7F3D0;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);

        .master-icon-frame {
          background: linear-gradient(135deg, #059669 0%, #10B981 100%);
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
          border-color: transparent;
        }

        .master-title {
          color: #065F46;
          font-weight: 800;
        }

        .master-subtitle {
          color: #047857;
        }

        .master-total-badge {
          background: #FFFFFF;
          color: #047857;
          border-color: #6EE7B7;
        }
      }

      .master-title-side {
        display: flex;
        align-items: center;
        gap: 0.6rem;
      }

      .master-icon-frame {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #F1F5F9;
        border: 1px solid #E2E8F0;
        color: #475569;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .master-text-block {
        display: flex;
        flex-direction: column;
        text-align: start;
        gap: 0.05rem;
      }

      .master-title {
        font-size: 0.82rem;
        font-weight: 800;
        color: #1E293B;
        line-height: 1.2;
      }

      .master-subtitle {
        font-size: 0.64rem;
        color: #64748B;
        font-weight: 600;
      }

      .master-meta-side {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .master-total-badge {
        font-size: 0.65rem;
        font-weight: 750;
        background: #F1F5F9;
        color: #64748B;
        border: 1px solid #E2E8F0;
        padding: 0.1rem 0.45rem;
        border-radius: 999px;
        transition: all 0.2s ease;
      }

      .master-arrow-icon {
        font-size: 0.68rem;
        color: #64748B;
        transition: transform 0.22s cubic-bezier(0.4, 0, 0.2, 1);

        &.rotated {
          transform: rotate(90deg);
        }
      }
    }

    /* Sub-groups nested container */
    .subgroups-tree {
      margin-inline-start: 0.45rem;
      padding-inline-start: 0.55rem;
      border-inline-start: 2px solid #E2E8F0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin-top: 0.2rem;
      margin-bottom: 0.2rem;
      animation: fadeInDown 0.2s cubic-bezier(0, 0, 0.2, 1);
    }

    .subgroup-node {
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
    }

    .subgroup-btn {
      width: 100%;
      background: transparent;
      border: 1px solid transparent;
      outline: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.38rem 0.55rem;
      border-radius: 7px;
      transition: all 0.15s ease;

      &:hover {
        background: #F8FAFC;
        border-color: #E2E8F0;
      }

      &.has-active {
        background: #ECFDF5;
        border-color: rgba(16, 185, 129, 0.2);

        .sub-title-text {
          color: #047857;
          font-weight: 800;
        }

        .sub-icon {
          color: #059669;
        }
      }

      .sub-title-side {
        display: flex;
        align-items: center;
        gap: 0.45rem;
      }

      .sub-icon {
        font-size: 0.8rem;
        color: #059669;
      }

      .sub-title-text {
        font-size: 0.73rem;
        font-weight: 750;
        color: #334155;
        white-space: nowrap;
      }

      .sub-meta-side {
        display: flex;
        align-items: center;
        gap: 0.35rem;
      }

      .sub-count-pill {
        font-size: 0.62rem;
        font-weight: 700;
        background: #F1F5F9;
        color: #64748B;
        padding: 0.05rem 0.4rem;
        border-radius: 999px;
      }

      .sub-arrow-icon {
        font-size: 0.65rem;
        color: #94A3B8;
        transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.rotated {
          transform: rotate(90deg);
        }
      }
    }

    .sub-items-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.12rem;
      padding-inline-start: 0.6rem;
      border-inline-start: 1px dashed #CBD5E1;
      margin-inline-start: 0.6rem;
      animation: fadeInDown 0.18s ease;
    }

    .sub-item-link {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.38rem 0.55rem;
      border-radius: 6px;
      color: #475569;
      text-decoration: none;
      font-size: 0.78rem;
      font-weight: 600;
      transition: all 0.15s ease;

      .item-icon-box {
        width: 24px;
        height: 24px;
        border-radius: 5px;
        background: #F8FAFC;
        border: 1px solid #E2E8F0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #64748B;
        font-size: 0.75rem;
        transition: all 0.15s ease;
        flex-shrink: 0;
      }

      &:hover {
        background: #F8FAFC;
        color: #0F172A;

        .item-icon-box {
          background: #FFFFFF;
          border-color: #CBD5E1;
          color: #0F172A;
        }
      }

      &.active {
        background: #ECFDF5;
        color: #059669;
        font-weight: 750;

        .item-icon-box {
          background: #10B981;
          border-color: #10B981;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }
      }

      .item-label {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    @keyframes fadeInDown {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.42rem 0.65rem;
      border-radius: 7px;
      color: #475569;
      text-decoration: none;
      font-size: 0.82rem;
      font-weight: 600;
      transition: all 0.15s ease;

      &:hover {
        background: #F8FAFC;
        color: #0F172A;

        .nav-icon-box {
          background: #FFFFFF;
          border-color: #CBD5E1;
          color: #0F172A;
        }
      }

      &.active {
        background: #ECFDF5;
        color: #059669;
        font-weight: 700;

        .nav-icon-box {
          background: #10B981;
          border-color: #10B981;
          color: #FFFFFF;
          box-shadow: 0 2px 6px rgba(16, 185, 129, 0.25);
        }
      }
    }

    .nav-icon-box {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748B;
      transition: all 0.15s ease;
      flex-shrink: 0;

      .nav-icon {
        font-size: 0.85rem;
      }
    }

    .nav-label {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Footer */
    .sidebar-footer {
      padding: 0.75rem 0.85rem;
      border-top: 1px solid #F1F5F9;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: #FFFFFF;
    }

    .user-card {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      overflow: hidden;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #ECFDF5;
      color: #059669;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.85rem;
      flex-shrink: 0;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .user-name {
      font-size: 0.78rem;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.65rem;
      color: #64748B;
    }

    .logout-btn {
      width: 30px;
      height: 30px;
      border-radius: 6px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      color: #64748B;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;

      &:hover {
        background: #FEF2F2;
        border-color: #FCA5A5;
        color: #EF4444;
      }
    }
  `]
})
export class SidebarComponent {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  isCollapsed = signal<boolean>(false);

  toggleCollapse() {
    this.isCollapsed.set(!this.isCollapsed());
  }

  toggleSection(section: NavSection) {
    section.isOpen = !section.isOpen;
  }

  toggleSubGroup(group: NavSubGroup) {
    group.isOpen = !group.isOpen;
  }

  getTotalItemsCount(section: NavSection): number {
    if (section.items) return section.items.length;
    if (section.subGroups) {
      return section.subGroups.reduce((acc, g) => acc + g.items.length, 0);
    }
    return 0;
  }

  isItemActive(item: NavItem): boolean {
    const currentUrl = this.router.url;
    if (item.queryParams && item.queryParams['tab']) {
      return currentUrl.includes(item.route) && currentUrl.includes(`tab=${item.queryParams['tab']}`);
    }
    return currentUrl.startsWith(item.route);
  }

  isSubGroupActive(group: NavSubGroup): boolean {
    return group.items.some(item => this.isItemActive(item));
  }

  isSectionActive(section: NavSection): boolean {
    if (section.items) {
      return section.items.some(item => this.isItemActive(item));
    }
    if (section.subGroups) {
      return section.subGroups.some(group => this.isSubGroupActive(group));
    }
    return false;
  }

  autoExpandActive() {
    for (const section of this.navSections) {
      if (section.subGroups) {
        let hasActiveInGroup = false;
        for (const group of section.subGroups) {
          if (this.isSubGroupActive(group)) {
            group.isOpen = true;
            hasActiveInGroup = true;
          }
        }
        if (hasActiveInGroup) {
          section.isOpen = true;
        }
      }
    }
  }

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.autoExpandActive();
    });
    setTimeout(() => this.autoExpandActive(), 50);
  }

  navSections: NavSection[] = [

    {
      id: 'financial-accounting',
      titleAr: 'المحاسبة المالية',
      titleEn: 'Financial Accounting',
      icon: 'pi pi-calculator',
      collapsible: true,
      isOpen: true,
      subGroups: [
        {
          id: 'treasury',
          titleAr: 'الخزينة والعمليات البنكية',
          titleEn: 'Treasury & Banking',
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
              labelAr: 'التسويات ومطابقة البنك',
              labelEn: 'Bank Reconciliation',
              icon: 'pi pi-sync',
              route: '/accounting/bank-reconciliation'
            },
            {
              labelAr: 'سجل الأصول والإهلاك الآلي',
              labelEn: 'Fixed Assets & Depreciation',
              icon: 'pi pi-database',
              route: '/accounting/fixed-assets'
            },
            {
              labelAr: 'أوراق القبض والدفع والشيكات',
              labelEn: 'PDC & Notes Receivable/Payable',
              icon: 'pi pi-credit-card',
              route: '/accounting/checks'
            }
          ]
        },
        {
          id: 'gl',
          titleAr: 'الأستاذ والقيود المحاسبية',
          titleEn: 'General Ledger & Journal',
          icon: 'pi pi-book',
          isOpen: true,
          items: [
            {
              labelAr: 'دليل الحسابات (الشجرة)',
              labelEn: 'Chart of Accounts',
              icon: 'pi pi-sitemap',
              route: '/accounting/chart-of-accounts'
            },
            {
              labelAr: 'قيود اليومية المحاسبية',
              labelEn: 'Journal Entries',
              icon: 'pi pi-book',
              route: '/accounting/journal-entries'
            },
            {
              labelAr: 'القيود الدورية المتكررة',
              labelEn: 'Recurring Journal Entries',
              icon: 'pi pi-sync',
              route: '/accounting/journal-entries',
              queryParams: { tab: 'recurring' }
            },
            {
              labelAr: 'العملاء والموردون وأعمار الديون',
              labelEn: 'Partners & Debt Aging',
              icon: 'pi pi-users',
              route: '/accounting/partners'
            },
            {
              labelAr: 'دفتر الأستاذ العام',
              labelEn: 'General Ledger',
              icon: 'pi pi-list',
              route: '/accounting/general-ledger'
            },
            {
              labelAr: 'ميزان المراجعة بالأرصدة',
              labelEn: 'Trial Balance',
              icon: 'pi pi-chart-bar',
              route: '/accounting/trial-balance'
            }
          ]
        },
        {
          id: 'statements',
          titleAr: 'القوائم والتقارير المالية',
          titleEn: 'Statements & Reports',
          icon: 'pi pi-chart-line',
          isOpen: false,
          items: [
            {
              labelAr: 'القوائم الختامية (الدخل والمركز)',
              labelEn: 'Financial Statements',
              icon: 'pi pi-file-edit',
              route: '/accounting/financial-statements'
            },
            {
              labelAr: 'التغير في حقوق الملكية (IAS 1)',
              labelEn: 'Changes in Equity',
              icon: 'pi pi-users',
              route: '/accounting/financial-statements',
              queryParams: { tab: 'equity' }
            },
            {
              labelAr: 'قائمة التدفقات النقدية (IAS 7)',
              labelEn: 'Cash Flow Statement',
              icon: 'pi pi-money-bill',
              route: '/accounting/financial-statements',
              queryParams: { tab: 'cash-flow' }
            },
            {
              labelAr: 'مراكز التكلفة والربحية',
              labelEn: 'Cost Centers Analysis',
              icon: 'pi pi-tags',
              route: '/accounting/cost-centers'
            }
          ]
        },
        {
          id: 'einvoicing',
          titleAr: 'الفوترة والامتثال (ZATCA)',
          titleEn: 'E-Invoicing & Compliance',
          icon: 'pi pi-shield',
          isOpen: false,
          items: [
            {
              labelAr: 'الفواتير الضريبية (B2B)',
              labelEn: 'Tax Invoices (B2B)',
              icon: 'pi pi-file',
              route: '/invoicing/tax-invoices'
            },
            {
              labelAr: 'الفواتير المبسطة (B2C)',
              labelEn: 'Simplified Invoices',
              icon: 'pi pi-receipt',
              route: '/invoicing/simplified'
            },
            {
              labelAr: 'إقرار ضريبة القيمة المضافة ZATCA',
              labelEn: 'VAT Return (16 Boxes)',
              icon: 'pi pi-percentage',
              route: '/accounting/financial-statements',
              queryParams: { tab: 'vat-return' }
            }
          ]
        },
        {
          id: 'settings',
          titleAr: 'الإعدادات والفترات المالية',
          titleEn: 'Settings & Periods',
          icon: 'pi pi-sliders-h',
          isOpen: false,
          items: [
            {
              labelAr: 'الفترات المالية والإقفال السنوي',
              labelEn: 'Fiscal Periods & Year Closing',
              icon: 'pi pi-sliders-h',
              route: '/accounting/financial-settings'
            },
            {
              labelAr: 'أسعار العملات وإعادة التقييم (IAS 21)',
              labelEn: 'Currency Rates & FX (IAS 21)',
              icon: 'pi pi-dollar',
              route: '/accounting/financial-settings',
              queryParams: { tab: 'currencies' }
            },
            {
              labelAr: 'إدارة الشركات والمستأجرين',
              labelEn: 'Companies & Tenants',
              icon: 'pi pi-building',
              route: '/companies',
              superAdminOnly: true
            }
          ]
        }
      ]
    }
  ];
}
