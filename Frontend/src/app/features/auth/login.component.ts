// src/app/features/auth/login.component.ts
import { Component, inject, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <span class="brand-d">Dev</span><span class="brand-hub">Hub</span>
          <span class="brand-tag">Store</span>
        </div>
        <h1 class="login-title">Sign In</h1>
        <p class="login-sub">Welcome back! Please enter your details.</p>

        @if (error()) {
          <div class="login-error">{{ error() }}</div>
        }

        <form (ngSubmit)="submit()">
          <div class="field">
            <label>EMAIL</label>
            <input type="email" class="form-input" [(ngModel)]="email" name="email"
              placeholder="alice@example.com" autocomplete="email" required />
          </div>
          <div class="field">
            <label>PASSWORD</label>
            <input type="password" class="form-input" [(ngModel)]="password" name="password"
              placeholder="••••••••" autocomplete="current-password" required />
          </div>
          <button type="submit" class="btn-login" [disabled]="loading()">
            @if (loading()) { Signing in… } @else { Sign In }
          </button>
        </form>

        <p class="register-link">
          Don't have an account? <a routerLink="/register">Create one</a>
        </p>

        @if (showDevHints) {
          <div class="dev-hint">
            <span class="hint-label">Dev Quick Fill</span>
            <button type="button" class="hint-btn" (click)="fill('alice@example.com','Admin@123')">
              👑 Admin — alice&#64;example.com
            </button>
            <button type="button" class="hint-btn" (click)="fill('bob@example.com','User@123')">
              🏪 Seller — bob&#64;example.com
            </button>
            <button type="button" class="hint-btn" (click)="fill('carol@example.com','User@123')">
              🛍️ Buyer — carol&#64;example.com
            </button>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .login-page { min-height: 100vh; background: var(--bg-primary,#0d1117); display: flex; align-items: center; justify-content: center; padding: 24px; }
    .login-card { width: 100%; max-width: 400px; background: var(--bg-secondary,#161b22); border: 1px solid var(--border,#21262d); border-radius: 14px; padding: 36px 32px; }
    .login-brand { display: flex; align-items: baseline; gap: 1px; margin-bottom: 28px; }
    .brand-d   { font-size: 24px; font-weight: 900; color: #f05537; }
    .brand-hub { font-size: 24px; font-weight: 900; color: #ffd700; }
    .brand-tag { font-size: 11px; color: var(--text-muted,#64748b); margin-left: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .login-title { font-size: 22px; font-weight: 700; color: var(--text-primary,#e6edf3); margin: 0 0 6px; }
    .login-sub   { font-size: 13px; color: var(--text-secondary,#8b949e); margin: 0 0 24px; }
    .login-error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; border-radius: 7px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
    .field { margin-bottom: 16px; display: flex; flex-direction: column; gap: 6px; }
    .field label { font-size: 12px; font-weight: 600; color: var(--text-secondary,#8b949e); text-transform: uppercase; letter-spacing: .5px; }
    .form-input { background: var(--bg-primary,#0d1117); border: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); border-radius: 7px; padding: 10px 13px; font-size: 14px; outline: none; transition: border-color .15s; }
    .form-input:focus { border-color: #6366f1; }
    .form-input::placeholder { color: var(--text-muted,#484f58); }
    .btn-login { width: 100%; background: #f05537; color: #fff; border: none; border-radius: 7px; padding: 12px; font-size: 14px; font-weight: 700; cursor: pointer; margin-top: 6px; transition: background .15s; }
    .btn-login:hover:not(:disabled) { background: #d44a2d; }
    .btn-login:disabled { opacity: .5; cursor: not-allowed; }
    .register-link { text-align: center; font-size: 13px; color: var(--text-muted,#64748b); margin-top: 18px; }
    .register-link a { color: #f05537; text-decoration: none; font-weight: 600; }
    .register-link a:hover { text-decoration: underline; }
    .dev-hint { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border,#21262d); display: flex; flex-direction: column; gap: 6px; }
    .hint-label { font-size: 11px; color: var(--text-muted,#484f58); text-transform: uppercase; letter-spacing: .5px; }
    .hint-btn { background: none; border: 1px solid var(--border,#21262d); color: var(--text-secondary,#8b949e); border-radius: 6px; padding: 6px 10px; font-size: 12px; text-align: left; cursor: pointer; transition: border-color .15s, color .15s; }
    .hint-btn:hover { border-color: #6366f1; color: var(--text-primary,#e6edf3); }
  `]
})
export class LoginComponent {
  private readonly _auth   = inject(AuthService);
  private readonly _router = inject(Router);
  private readonly _route  = inject(ActivatedRoute);
  // NgZone ensures Angular's change detection runs after the navigation
  private readonly _zone   = inject(NgZone);

  email    = '';
  password = ''
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  get showDevHints(): boolean {
    return window.location.hostname === 'localhost';
  }

  fill(email: string, password: string): void {
    this.email    = email;
    this.password = password;
  }

  submit(): void {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.error.set(null);

    this._auth.login(this.email, this.password).subscribe({
      next: () => {
        // FIX: Run navigation inside NgZone so Angular's change detection
        // picks up the router state change immediately. Without this, the
        // signal update from the HTTP response can land outside the zone
        // and leave the router in a pending state — the page only updates
        // after a second user action (like opening a new tab).
        this._zone.run(() => {
          const returnUrl = this._route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl) {
            this._router.navigateByUrl(returnUrl);
            return;
          }

          const user = this._auth.currentUser();
          const role = user?.role ?? '';
          if (role === 'Admin' || role === 'Seller') {
            this._router.navigate(['/dashboard']);
          } else {
            this._router.navigate(['/shop']);
          }
        });
      },
      error: err => {
        this.error.set(err?.error?.message ?? 'Invalid email or password');
        this.loading.set(false);
      }
    });
  }
}