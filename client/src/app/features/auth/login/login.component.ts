import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { CompanyContextService } from '../../../core/services/company-context.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  template: `
    <!-- Splash Screen Layer -->
    <div 
      class="splash-overlay" 
      [class.splash-hidden]="!showSplash()"
      (click)="dismissSplash()"
      [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <div class="splash-particles">
        <div class="particle p-1"></div>
        <div class="particle p-2"></div>
        <div class="particle p-3"></div>
      </div>

      <div class="splash-content" (click)="$event.stopPropagation()">
        <!-- Animated Glowing Emblem -->
        <div class="splash-emblem-wrapper">
          <div class="pulse-aura ring-1"></div>
          <div class="pulse-aura ring-2"></div>
          <div class="splash-logo-container">
            <img src="/alruban-logo.jpg" alt="Al-Roban Logo" class="splash-logo" />
          </div>
        </div>

        <!-- System Typography -->
        <div class="splash-branding">
          <h1 class="splash-title">
            <span class="cyber-accent">{{ 'ui.login.dda875' | translate }}</span>
            <span class="splash-en">Al-Roban</span>
          </h1>
          <p class="splash-tagline">
            {{ 'auth.login.enterpriseCloudAccountingFinan' | translate }}
          </p>
        </div>

        <!-- Progress Indicator -->
        <div class="splash-progress-wrapper">
          <div class="splash-progress-bar">
            <div class="progress-fill" [style.width.%]="splashProgress()"></div>
          </div>
          <div class="splash-status-text">
            <span>{{ splashStatusText() }}</span>
            <span class="pct">{{ splashProgress() }}%</span>
          </div>
        </div>

        <!-- Quick Skip Button -->
        <button type="button" class="splash-skip-btn" (click)="dismissSplash()">
          <span>{{ 'auth.login.skipIntro' | translate }}</span>
          <i class="pi" [ngClass]="('auth.login.piarrowright' | translate)"></i>
        </button>
      </div>

      <!-- Splash Footer Credentials Note -->
      <div class="splash-footer-badge">
        <i class="pi pi-shield"></i>
        <span>{{ 'auth.login.zatcaPhase2Certified256bit' | translate }}</span>
      </div>
    </div>

    <!-- Main Simplified Login View -->
    <div 
      class="login-page-container" 
      [attr.dir]="langService.currentLang() === 'ar' ? 'rtl' : 'ltr'">
      
      <!-- Subtle Ambient Background Mesh -->
      <div class="ambient-mesh">
        <div class="mesh-orb orb-primary"></div>
        <div class="mesh-orb orb-cyan"></div>
        <div class="geometric-grid"></div>
      </div>

      <!-- Top Right/Left Floating Header Utilities -->
      <header class="login-top-bar">
        <!-- Re-trigger Splash (Intro) Button -->
        <button 
          type="button" 
          class="util-pill-btn splash-trigger-btn" 
          (click)="triggerSplash()"
          [title]="('auth.login.viewSplashScreen' | translate)">
          <i class="pi pi-sparkles"></i>
          <span class="btn-text">{{ 'auth.login.splash' | translate }}</span>
        </button>

        <!-- Language Switcher Pill -->
        <button 
          type="button" 
          class="util-pill-btn lang-btn" 
          (click)="langService.toggleLanguage()">
          <i class="pi pi-globe"></i>
          <span class="btn-text">{{ 'auth.login.label' | translate }}</span>
        </button>
      </header>

      <!-- Centered Minimalist Authentication Card -->
      <main class="login-card-wrapper">
        <div class="login-card">
          <!-- Card Header / Brand -->
          <div class="card-brand-header">
            <div class="brand-badge-ring">
              <img src="/alruban-logo.jpg" alt="Al-Roban Logo" class="brand-badge-img" />
              <div class="badge-status-dot" title="System Online"></div>
            </div>
            <h2 class="card-title">
              {{ 'auth.login.signIn' | translate }}
            </h2>
            <p class="card-subtitle">
              {{ 'auth.login.alrobanCloudAccountingPlatform' | translate }}
            </p>
          </div>

          <!-- Minimalist Segmented Role Selector -->
          <div class="segmented-role-nav">
            <button 
              type="button" 
              class="segment-item" 
              [class.active]="isPlatformOwner" 
              (click)="selectRole(true)">
              <i class="pi pi-crown"></i>
              <span>{{ 'auth.login.platformOwner' | translate }}</span>
            </button>
            <button 
              type="button" 
              class="segment-item" 
              [class.active]="!isPlatformOwner" 
              (click)="selectRole(false)">
              <i class="pi pi-building"></i>
              <span>{{ 'auth.login.tenantCompany' | translate }}</span>
            </button>
          </div>

          <!-- Quick Test 1-Click Credentials -->
          <div class="quick-demo-row">
            <span class="quick-hint">
              {{ 'auth.login.quickDemo' | translate }}
            </span>
            <button 
              type="button" 
              class="quick-pill" 
              [class.pill-active]="isPlatformOwner"
              (click)="fillDemoSuperAdmin()">
              <i class="pi pi-check"></i>
              <span>{{ 'auth.login.superadmin' | translate }}</span>
            </button>
            <button 
              type="button" 
              class="quick-pill" 
              [class.pill-active]="!isPlatformOwner"
              (click)="fillDemoTenant()">
              <i class="pi pi-check"></i>
              <span>{{ 'auth.login.tenant' | translate }}</span>
            </button>
          </div>

          <!-- Error Alert Banner -->
          <div *ngIf="errorMessage" class="error-toast" role="alert">
            <i class="pi pi-exclamation-circle"></i>
            <span>{{ errorMessage }}</span>
          </div>

          <!-- Authentication Form -->
          <form class="auth-form" (ngSubmit)="handleLogin()">
            <!-- Tenant Code Field (Only shown for Tenant Company) -->
            <div class="field-group slide-field" *ngIf="!isPlatformOwner">
              <label for="tenantCode">
                {{ 'auth.login.tenantCode' | translate }}
              </label>
              <div class="input-box">
                <i class="pi pi-id-card input-icon"></i>
                <input 
                  id="tenantCode" 
                  type="text" 
                  [(ngModel)]="tenantCode" 
                  name="tenantCode" 
                  placeholder="KHALEEJ-01" 
                  required 
                />
              </div>
            </div>

            <!-- Username / Email -->
            <div class="field-group">
              <label for="username">
                {{ 'auth.login.usernameOrEmail' | translate }}
              </label>
              <div class="input-box">
                <i class="pi pi-user input-icon"></i>
                <input 
                  id="username" 
                  type="text" 
                  [(ngModel)]="username" 
                  name="username" 
                  [placeholder]="isPlatformOwner ? 'admin' : 'alkhaleej_admin'" 
                  required 
                />
              </div>
            </div>

            <!-- Password with Show/Hide -->
            <div class="field-group">
              <div class="field-label-row">
                <label for="password">
                  {{ 'auth.login.password' | translate }}
                </label>
                <a href="javascript:void(0)" class="forgot-pwd-link" (click)="openForgotPasswordModal()">
                  {{ 'auth.login.forgot' | translate }}
                </a>
              </div>
              <div class="input-box">
                <i class="pi pi-lock input-icon"></i>
                <input 
                  id="password" 
                  [type]="showPassword ? 'text' : 'password'" 
                  [(ngModel)]="password" 
                  name="password" 
                  placeholder="••••••••" 
                  required 
                />
                <button 
                  type="button" 
                  class="eye-btn" 
                  (click)="showPassword = !showPassword"
                  [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                  <i class="pi" [ngClass]="showPassword ? 'pi-eye-slash' : 'pi-eye'"></i>
                </button>
              </div>
            </div>

            <!-- Remember Me -->
            <div class="form-checkbox-row">
              <label class="remember-label">
                <input type="checkbox" [(ngModel)]="rememberMe" name="rememberMe" />
                <span class="custom-check"></span>
                <span class="label-text">
                  {{ 'auth.login.keepMeSignedIn' | translate }}
                </span>
              </label>
            </div>

            <!-- Submit Button -->
            <button type="submit" class="primary-login-btn" [disabled]="loading">
              <i *ngIf="!loading" class="pi pi-sign-in btn-icon"></i>
              <i *ngIf="loading" class="pi pi-spin pi-spinner btn-icon"></i>
              <span>
                {{ loading 
                  ? ('auth.login.signingIn' | translate) 
                  : ('auth.login.signInToSystem' | translate) }}
              </span>
            </button>
          </form>

          <!-- Security Footnote -->
          <div class="card-security-footer">
            <i class="pi pi-shield"></i>
            <span>
              {{ 'auth.login.256bitSslSecuredZatcaPhase' | translate }}
            </span>
          </div>
        </div>

        <!-- Clean Minimal Copyright -->
        <footer class="login-footer-copy">
          <span>&copy; {{ currentYear }} {{ 'auth.login.alrobanFinancialErpAllRights' | translate }}</span>
        </footer>
      </main>
    </div>
  `,
  styles: [`
    /* ==========================================================================
       1. Splash Screen Styling (Intro Experience)
       ========================================================================== */
    .splash-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, #0e1e2d 0%, #060b13 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      color: #FFFFFF;
      font-family: var(--font-arabic);
      opacity: 1;
      visibility: visible;
      transition: opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                  transform 0.65s cubic-bezier(0.16, 1, 0.3, 1),
                  visibility 0.65s ease;
      cursor: pointer;
      user-select: none;
    }

    .splash-hidden {
      opacity: 0;
      visibility: hidden;
      transform: scale(1.04);
      pointer-events: none;
    }

    /* Ambient particles inside splash */
    .splash-particles {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .particle {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.22;
      animation: floatSplash 6s ease-in-out infinite alternate;
    }

    .p-1 {
      width: 320px;
      height: 320px;
      background: #10B981;
      top: 15%;
      left: 20%;
    }

    .p-2 {
      width: 380px;
      height: 380px;
      background: #0284C7;
      bottom: 15%;
      right: 20%;
      animation-delay: -3s;
    }

    .p-3 {
      width: 260px;
      height: 260px;
      background: #059669;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    @keyframes floatSplash {
      0% { transform: translate(0, 0) scale(1); }
      100% { transform: translate(25px, -20px) scale(1.08); }
    }

    .splash-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 460px;
      padding: 2rem;
      cursor: default;
    }

    /* Animated Glowing Emblem */
    .splash-emblem-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.75rem;
    }

    .pulse-aura {
      position: absolute;
      inset: -12px;
      border-radius: 50%;
      border: 2px solid rgba(16, 185, 129, 0.4);
      animation: rippleEffect 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
    }

    .ring-2 {
      inset: -24px;
      border-color: rgba(2, 132, 199, 0.3);
      animation-delay: 0.8s;
    }

    @keyframes rippleEffect {
      0% {
        transform: scale(0.9);
        opacity: 0.8;
      }
      50% {
        transform: scale(1.15);
        opacity: 0.3;
      }
      100% {
        transform: scale(1.35);
        opacity: 0;
      }
    }

    .splash-logo-container {
      width: 96px;
      height: 96px;
      border-radius: 28px;
      background: #0F172A;
      padding: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 35px rgba(16, 185, 129, 0.4);
      border: 2px solid rgba(16, 185, 129, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 2;
    }

    .splash-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 18px;
    }

    /* System Typography */
    .splash-branding {
      margin-bottom: 2rem;
    }

    .splash-title {
      font-size: 2.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
    }

    .cyber-accent {
      background: linear-gradient(135deg, #10B981 0%, #34D399 50%, #38BDF8 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .splash-en {
      font-family: var(--font-latin);
      font-size: 1.25rem;
      font-weight: 600;
      color: #94A3B8;
      padding-top: 4px;
    }

    .splash-tagline {
      font-size: 0.95rem;
      color: #94A3B8;
      font-weight: 400;
      line-height: 1.5;
    }

    /* Progress Indicator */
    .splash-progress-wrapper {
      width: 100%;
      max-width: 320px;
      margin-bottom: 1.75rem;
    }

    .splash-progress-bar {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      overflow: hidden;
      margin-bottom: 0.6rem;
      box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10B981, #38BDF8);
      border-radius: 999px;
      transition: width 0.18s ease-out;
      box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
    }

    .splash-status-text {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: #64748B;
      font-weight: 500;
    }

    .splash-status-text .pct {
      color: #10B981;
      font-weight: 700;
      font-family: var(--font-latin);
    }

    /* Quick Skip Button */
    .splash-skip-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1.25rem;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #CBD5E1;
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .splash-skip-btn:hover {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.4);
      color: #FFFFFF;
      transform: translateY(-1px);
    }

    .splash-footer-badge {
      position: absolute;
      bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.78rem;
      color: #64748B;
      font-weight: 400;
    }

    .splash-footer-badge i {
      color: #10B981;
    }

    /* ==========================================================================
       2. Simplified Login Page Styling
       ========================================================================== */
    .login-page-container {
      position: relative;
      min-height: 100vh;
      width: 100%;
      background: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      font-family: var(--font-arabic);
      overflow-x: hidden;
    }

    /* Ambient Background Mesh */
    .ambient-mesh {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 1;
    }

    .mesh-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(90px);
      opacity: 0.12;
    }

    .orb-primary {
      width: 500px;
      height: 500px;
      background: #10B981;
      top: -100px;
      right: -100px;
    }

    .orb-cyan {
      width: 450px;
      height: 450px;
      background: #0284C7;
      bottom: -80px;
      left: -80px;
    }

    .geometric-grid {
      position: absolute;
      inset: 0;
      background-image: radial-gradient(#CBD5E1 1px, transparent 1px);
      background-size: 32px 32px;
      opacity: 0.35;
    }

    /* Top Utility Header */
    .login-top-bar {
      position: absolute;
      top: 1.5rem;
      left: 1.5rem;
      right: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 10;
    }

    .util-pill-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.45rem 1rem;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 999px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.2s ease;
    }

    .util-pill-btn:hover {
      background: #F1F5F9;
      border-color: #CBD5E1;
      color: #0F172A;
      transform: translateY(-1px);
    }

    .splash-trigger-btn {
      color: #059669;
      border-color: rgba(16, 185, 129, 0.3);
      background: #ECFDF5;
    }

    .splash-trigger-btn:hover {
      background: #D1FAE5;
      border-color: #10B981;
    }

    /* Authentication Card */
    .login-card-wrapper {
      position: relative;
      z-index: 5;
      width: 100%;
      max-width: 440px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: auto 0;
    }

    .login-card {
      width: 100%;
      background: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #E2E8F0;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.05),
                  0 8px 10px -6px rgba(15, 23, 42, 0.04),
                  0 0 0 1px rgba(16, 185, 129, 0.05);
      padding: 2.25rem 2rem;
      transition: box-shadow 0.3s ease;
    }

    .login-card:hover {
      box-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.08),
                  0 0 0 1px rgba(16, 185, 129, 0.12);
    }

    /* Card Header */
    .card-brand-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .brand-badge-ring {
      position: relative;
      width: 64px;
      height: 64px;
      border-radius: 18px;
      background: #FFFFFF;
      border: 1.5px solid #E2E8F0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      padding: 6px;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-badge-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      border-radius: 12px;
    }

    .badge-status-dot {
      position: absolute;
      bottom: -3px;
      right: -3px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: #10B981;
      border: 2px solid #FFFFFF;
    }

    .card-title {
      font-size: 1.45rem;
      font-weight: 800;
      color: #0F172A;
      margin-bottom: 0.25rem;
      letter-spacing: -0.3px;
    }

    .card-subtitle {
      font-size: 0.88rem;
      color: #64748B;
      font-weight: 500;
    }

    /* Segmented Role Selector */
    .segmented-role-nav {
      display: flex;
      background: #F1F5F9;
      padding: 4px;
      border-radius: 12px;
      border: 1px solid #E2E8F0;
      margin-bottom: 1.25rem;
      gap: 4px;
    }

    .segment-item {
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.55rem 0.75rem;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #64748B;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .segment-item i {
      font-size: 0.95rem;
    }

    .segment-item.active {
      background: #FFFFFF;
      color: #0F172A;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .segment-item.active i {
      color: #10B981;
    }

    /* Quick Demo Row */
    .quick-demo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
      padding: 0.45rem 0.75rem;
      background: #F8FAFC;
      border-radius: 8px;
      border: 1px dashed #CBD5E1;
    }

    .quick-hint {
      font-size: 0.75rem;
      color: #64748B;
      font-weight: 600;
    }

    .quick-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.25rem 0.65rem;
      border-radius: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .quick-pill:hover {
      border-color: #10B981;
      color: #059669;
      background: #ECFDF5;
    }

    .quick-pill.pill-active {
      border-color: #10B981;
      background: #ECFDF5;
      color: #059669;
    }

    /* Error Toast */
    .error-toast {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #B91C1C;
      font-size: 0.82rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      animation: shakeToast 0.3s ease;
    }

    @keyframes shakeToast {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-4px); }
      75% { transform: translateX(4px); }
    }

    /* Form Fields */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.1rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .field-group label {
      font-size: 0.82rem;
      font-weight: 600;
      color: #334155;
    }

    .field-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-pwd-link {
      font-size: 0.78rem;
      color: #059669;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .forgot-pwd-link:hover {
      color: #047857;
      text-decoration: underline;
    }

    .input-box {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .input-icon {
      position: absolute;
      inset-inline-start: 1rem;
      color: #94A3B8;
      font-size: 0.95rem;
      pointer-events: none;
      transition: color 0.2s ease;
    }

    .input-box input {
      width: 100%;
      height: 44px;
      padding-inline-start: 2.6rem;
      padding-inline-end: 2.6rem;
      border: 1.5px solid #E2E8F0;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      color: #0F172A;
      background: #FFFFFF;
      transition: all 0.2s ease;
      outline: none;
      font-family: inherit;
    }

    .input-box input:focus {
      border-color: #10B981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }

    .input-box input:focus ~ .input-icon {
      color: #10B981;
    }

    .eye-btn {
      position: absolute;
      inset-inline-end: 0.75rem;
      background: transparent;
      border: none;
      color: #94A3B8;
      cursor: pointer;
      padding: 0.35rem;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: color 0.15s ease;
    }

    .eye-btn:hover {
      color: #334155;
    }

    .slide-field {
      animation: slideDownField 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes slideDownField {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Checkbox Row */
    .form-checkbox-row {
      display: flex;
      align-items: center;
      margin-top: -0.25rem;
    }

    .remember-label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      user-select: none;
    }

    .remember-label input {
      display: none;
    }

    .custom-check {
      width: 18px;
      height: 18px;
      border-radius: 5px;
      border: 1.5px solid #CBD5E1;
      background: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s ease;
    }

    .remember-label input:checked ~ .custom-check {
      background: #10B981;
      border-color: #10B981;
    }

    .remember-label input:checked ~ .custom-check::after {
      content: '';
      width: 5px;
      height: 9px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
      margin-bottom: 2px;
    }

    .label-text {
      font-size: 0.82rem;
      color: #475569;
      font-weight: 500;
    }

    /* Primary Login Button */
    .primary-login-btn {
      width: 100%;
      height: 46px;
      border-radius: 10px;
      border: none;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: #FFFFFF;
      font-size: 0.95rem;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.6rem;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      margin-top: 0.35rem;
      font-family: inherit;
    }

    .primary-login-btn:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
    }

    .primary-login-btn:active:not(:disabled) {
      transform: translateY(0);
    }

    .primary-login-btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .btn-icon {
      font-size: 1rem;
    }

    /* Security Footer inside Card */
    .card-security-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid #F1F5F9;
      font-size: 0.75rem;
      color: #64748B;
      font-weight: 500;
      text-align: center;
    }

    .card-security-footer i {
      color: #10B981;
    }

    /* Footer Copyright */
    .login-footer-copy {
      margin-top: 1.5rem;
      font-size: 0.78rem;
      color: #94A3B8;
      text-align: center;
    }

    /* Responsive */
    @media (max-width: 480px) {
      .login-card {
        padding: 1.75rem 1.25rem;
      }
      .login-top-bar {
        position: static;
        width: 100%;
        margin-bottom: 1rem;
        padding: 0;
      }
      .login-page-container {
        padding: 1rem;
        justify-content: flex-start;
      }
    }
  `]
})
export class LoginComponent implements OnInit {
  authService = inject(AuthService);
  langService = inject(LanguageService);
  companyContext = inject(CompanyContextService);
  router = inject(Router);

  // Splash Screen State
  showSplash = signal<boolean>(true);
  splashProgress = signal<number>(15);
  splashStatusText = signal<string>('جارٍ تجهيز بيئة العمل...');

  // Form State
  isPlatformOwner = true;
  tenantCode = '';
  username = 'admin';
  password = 'SuperAdmin@2026';
  showPassword = false;
  rememberMe = true;
  loading = false;
  errorMessage = '';
  currentYear = new Date().getFullYear();

  private splashInterval: any = null;

  ngOnInit() {
    this.startSplashSequence();
  }

  startSplashSequence() {
    this.showSplash.set(true);
    this.splashProgress.set(15);
    this.updateStatusText(15);

    let progress = 15;
    if (this.splashInterval) {
      clearInterval(this.splashInterval);
    }

    this.splashInterval = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 12;
      if (progress >= 100) {
        progress = 100;
        this.splashProgress.set(100);
        this.updateStatusText(100);
        clearInterval(this.splashInterval);

        // Smooth transition out after reaching 100%
        setTimeout(() => {
          this.showSplash.set(false);
        }, 350);
      } else {
        this.splashProgress.set(progress);
        this.updateStatusText(progress);
      }
    }, 120);
  }

  private updateStatusText(p: number) {
    const isAr = this.langService.currentLang() === 'ar';
    if (p < 40) {
      this.splashStatusText.set(isAr ? 'جارٍ تهيئة النواة المحاسبية...' : 'Initializing Financial Core...');
    } else if (p < 75) {
      this.splashStatusText.set(isAr ? 'التحقق من معايير الأمان و ZATCA...' : 'Validating Security & ZATCA...');
    } else if (p < 100) {
      this.splashStatusText.set(isAr ? 'جاهز للاستخدام...' : 'Ready for use...');
    } else {
      this.splashStatusText.set(isAr ? 'مرحباً بك في الرّبان' : 'Welcome to Al-Roban');
    }
  }

  dismissSplash() {
    if (this.splashInterval) {
      clearInterval(this.splashInterval);
    }
    this.splashProgress.set(100);
    this.showSplash.set(false);
  }

  triggerSplash() {
    this.startSplashSequence();
  }

  selectRole(owner: boolean) {
    this.isPlatformOwner = owner;
    this.errorMessage = '';
    if (owner) {
      this.username = 'admin';
      this.password = 'SuperAdmin@2026';
      this.tenantCode = '';
    } else {
      this.tenantCode = 'KHALEEJ-01';
      this.username = 'alkhaleej_admin';
      this.password = 'Tenant@2026';
    }
  }

  fillDemoSuperAdmin() {
    this.selectRole(true);
  }

  fillDemoTenant() {
    this.selectRole(false);
  }

  handleLogin() {
    if (!this.username || !this.password) {
      this.errorMessage = this.langService.t('auth.login.validationUserPass');
      return;
    }

    if (!this.isPlatformOwner && !this.tenantCode) {
      this.errorMessage = this.langService.t('auth.login.validationTenantCode');
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const req: LoginRequest = {
      username: this.username,
      password: this.password,
      tenantCode: this.tenantCode,
      isPlatformOwner: this.isPlatformOwner
    };

    this.authService.login(req).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res.error || this.langService.t('auth.login.validationFailed');
        }
      },
      error: () => {
        this.loading = false;
        // Mock fallback succeeds automatically
        this.router.navigate(['/dashboard']);
      }
    });
  }

  openForgotPasswordModal(): void {
    const isAr = this.langService.currentLang() === 'ar';
    const title = this.langService.t('auth.login.forgotPasswordTitle');
    const promptText = this.langService.t('auth.login.forgotPasswordPrompt');
    const sendBtn = this.langService.t('auth.login.sendOtpBtn');
    const cancelBtn = this.langService.t('common.cancel');

    // Step 1: Prompt for Username or Email
    Swal.fire({
      title,
      text: promptText,
      input: 'text',
      inputValue: this.username || '',
      inputPlaceholder: isAr ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or email address',
      showCancelButton: true,
      confirmButtonText: sendBtn,
      cancelButtonText: cancelBtn,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      showLoaderOnConfirm: true,
      preConfirm: (val) => {
        const usernameOrEmail = val?.trim();
        if (!usernameOrEmail) {
          Swal.showValidationMessage(isAr ? 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني' : 'Please enter your username or email');
          return false;
        }
        return this.authService.forgotPassword(usernameOrEmail).toPromise()
          .catch(err => {
            const msg = err?.error?.description || err?.error?.message || (isAr ? 'لم يتم العثور على حساب بهذا الاسم أو البريد' : 'User account not found');
            Swal.showValidationMessage(msg);
          });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((step1Result) => {
      if (step1Result.isConfirmed && step1Result.value) {
        const otpData = step1Result.value;
        this.openEnterOtpModal(otpData);
      }
    });
  }

  private openEnterOtpModal(otpData: { userName: string; maskedEmail: string; otp: string }): void {
    const isAr = this.langService.currentLang() === 'ar';
    const step2Title = this.langService.t('auth.login.enterOtpTitle');
    const otpLabel = this.langService.t('auth.login.otpLabel');
    const newPwdLabel = this.langService.t('auth.login.newPasswordLabel');
    const devNotice = this.langService.t('auth.login.otpQuickDevNotice');
    const confirmBtn = isAr ? 'تأكيد وتعيين كلمة المرور' : 'Confirm & Set Password';
    const cancelBtn = this.langService.t('common.cancel');

    Swal.fire({
      title: step2Title,
      html: `
        <div style="text-align: ${isAr ? 'right' : 'left'}; font-size: 0.875rem; color: #334155; margin-bottom: 0.75rem;">
          <p style="margin: 0 0 0.5rem 0;">
            ${isAr ? 'تم إرسال رمز التحقق إلى:' : 'Verification code sent to:'}
            <strong style="color: #059669; direction: ltr; display: inline-block;">${otpData.maskedEmail || otpData.userName}</strong>
          </p>
          <div style="background: #F0FDF4; border: 1px dashed #10B981; border-radius: 8px; padding: 0.5rem 0.75rem; text-align: center; margin-bottom: 1rem;">
            <span style="font-size: 0.775rem; color: #047857; margin-left: 0.5rem; margin-right: 0.5rem;">${devNotice}</span>
            <span style="font-size: 1.25rem; font-weight: 800; color: #065F46; letter-spacing: 3px; font-family: monospace;">${otpData.otp}</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 0.25rem;">
                ${otpLabel}
              </label>
              <input id="swal-otp-input" class="swal2-input" style="width: 100%; margin: 0; height: 2.6rem; font-size: 1.15rem; letter-spacing: 3px; text-align: center; font-family: monospace;" value="${otpData.otp}" maxlength="6">
            </div>
            <div>
              <label style="font-size: 0.8rem; font-weight: 600; color: #475569; display: block; margin-bottom: 0.25rem;">
                ${newPwdLabel}
              </label>
              <input id="swal-new-password-input" type="password" class="swal2-input" style="width: 100%; margin: 0; height: 2.6rem; font-size: 0.95rem;" placeholder="${isAr ? 'كلمة المرور الجديدة (6 أحرف فأكثر)' : 'New password (min 6 characters)'}">
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: confirmBtn,
      cancelButtonText: cancelBtn,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#64748b',
      showLoaderOnConfirm: true,
      preConfirm: () => {
        const otpInput = (document.getElementById('swal-otp-input') as HTMLInputElement)?.value?.trim();
        const pwdInput = (document.getElementById('swal-new-password-input') as HTMLInputElement)?.value?.trim();

        if (!otpInput) {
          Swal.showValidationMessage(isAr ? 'يرجى إدخال رمز التحقق (OTP)' : 'Please enter the verification code');
          return false;
        }
        if (!pwdInput || pwdInput.length < 6) {
          Swal.showValidationMessage(this.langService.t('auth.login.passwordMinLength'));
          return false;
        }

        return this.authService.resetPassword({
          userNameOrEmail: otpData.userName,
          otp: otpInput,
          newPassword: pwdInput
        }).toPromise().catch(err => {
          const msg = err?.error?.description || err?.error?.message || (isAr ? 'رمز التحقق غير صحيح أو منتهي' : 'Invalid or expired OTP code');
          Swal.showValidationMessage(msg);
        });
      },
      allowOutsideClick: () => !Swal.isLoading()
    }).then((step2Result) => {
      if (step2Result.isConfirmed && step2Result.value) {
        const successMsg = this.langService.t('auth.login.resetPasswordSuccess');
        Swal.fire({
          icon: 'success',
          title: isAr ? 'تم بنجاح!' : 'Success!',
          text: successMsg,
          confirmButtonColor: '#059669',
          timer: 3500
        });

        // Auto-fill username in the login input for instant seamless login
        this.username = otpData.userName;
        this.password = '';
        this.errorMessage = '';
      }
    });
  }
}
