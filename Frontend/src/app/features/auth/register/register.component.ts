// src/app/features/auth/register/register.component.ts
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="register-page">
      <div class="register-card">
        <div class="brand">
          <span class="brand-d">Dev</span><span class="brand-hub">Hub</span>
          <span class="brand-tag">Store</span>
        </div>

        <h1 class="title">Create Account</h1>
        <p class="sub">Join thousands of shoppers and sellers.</p>

        <!-- Step 1: Role selection -->
        @if (step() === 1) {
          <div class="role-step">
            <p class="role-prompt">How do you want to use DevHub Store?</p>
            <div class="role-cards">
              <button class="role-card" [class.selected]="selectedRole() === 'Buyer'"
                (click)="selectedRole.set('Buyer')">
                <span class="role-icon">🛍️</span>
                <span class="role-title">Shop as Buyer</span>
                <span class="role-desc">Browse products, add to cart, place orders</span>
              </button>
              <button class="role-card" [class.selected]="selectedRole() === 'Seller'"
                (click)="selectedRole.set('Seller')">
                <span class="role-icon">🏪</span>
                <span class="role-title">Sell as Seller</span>
                <span class="role-desc">List products, manage orders, grow your store</span>
              </button>
            </div>
            <button class="btn-next" [disabled]="!selectedRole()" (click)="step.set(2)">
              Continue as {{ selectedRole() || '…' }} →
            </button>
          </div>
        }

        <!-- Step 2: Account details -->
        @if (step() === 2) {
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <div class="selected-role-tag">
            <span class="role-badge" [class.seller]="selectedRole() === 'Seller'">
              {{ selectedRole() === 'Seller' ? '🏪 Registering as Seller' : '🛍️ Registering as Buyer' }}
            </span>
            <button class="btn-change-role" (click)="step.set(1)">Change</button>
          </div>

          <form (ngSubmit)="submit()">
            <div class="field">
              <label>Full Name</label>
              <input type="text" class="form-input" [(ngModel)]="name" name="name"
                placeholder="John Doe" autocomplete="name" required />
            </div>
            <div class="field">
              <label>Email</label>
              <input type="email" class="form-input" [(ngModel)]="email" name="email"
                placeholder="john@example.com" autocomplete="email" required />
            </div>
            <div class="field">
              <label>Password</label>
              <!-- FIXED: arrow function (v => !v) moved to togglePassword() method — Angular templates don't support => syntax -->
              <input [type]="showPassword() ? 'text' : 'password'" class="form-input"
                [(ngModel)]="password" name="password"
                placeholder="Min 6 characters" autocomplete="new-password" required />
              <button type="button" class="toggle-pwd" (click)="togglePassword()">
                {{ showPassword() ? 'Hide' : 'Show' }}
              </button>
            </div>
            <div class="field">
              <label>Confirm Password</label>
              <input [type]="showPassword() ? 'text' : 'password'" class="form-input"
                [(ngModel)]="confirmPassword" name="confirmPassword"
                placeholder="Repeat password" autocomplete="new-password" required />
            </div>

            @if (selectedRole() === 'Seller') {
              <div class="field">
                <label>Store / Business Name <span class="optional">(optional)</span></label>
                <input type="text" class="form-input" [(ngModel)]="storeName" name="storeName"
                  placeholder="e.g. TechMart Official" />
              </div>
            }

            <div class="terms">
              <label>
                <input type="checkbox" [(ngModel)]="agreedToTerms" name="terms" />
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button type="submit" class="btn-register"
              [disabled]="loading() || !agreedToTerms || !name || !email || !password">
              @if (loading()) {
                Creating account…
              } @else {
                Create {{ selectedRole() }} Account
              }
            </button>
          </form>
        }

        <p class="login-link">
          Already have an account? <a routerLink="/login">Sign in</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .register-page {
      min-height: 100vh;
      background: var(--bg-primary, #0d1117);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .register-card {
      width: 100%;
      max-width: 440px;
      background: var(--bg-secondary, #161b22);
      border: 1px solid var(--border, #21262d);
      border-radius: 14px;
      padding: 36px 32px;
    }
    .brand { display: flex; align-items: baseline; gap: 1px; margin-bottom: 24px; }
    .brand-d   { font-size: 22px; font-weight: 900; color: #f05537; }
    .brand-hub { font-size: 22px; font-weight: 900; color: #ffd700; }
    .brand-tag { font-size: 11px; color: var(--text-muted, #64748b); margin-left: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 20px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .sub   { font-size: 13px; color: var(--text-secondary, #8b949e); margin: 0 0 24px; }
    .alert-error {
      background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
      color: #ef4444; border-radius: 7px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px;
    }
    .role-step { display: flex; flex-direction: column; gap: 16px; }
    .role-prompt { font-size: 14px; color: var(--text-primary, #e6edf3); font-weight: 600; margin: 0; }
    .role-cards { display: flex; flex-direction: column; gap: 10px; }
    .role-card {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      padding: 16px; border: 2px solid var(--border, #21262d);
      border-radius: 10px; background: var(--bg-primary, #0d1117);
      cursor: pointer; text-align: left; transition: all .15s;
    }
    .role-card:hover   { border-color: #6366f1; }
    .role-card.selected { border-color: #f05537; background: rgba(240,85,55,.06); }
    .role-icon  { font-size: 24px; }
    .role-title { font-size: 15px; font-weight: 700; color: var(--text-primary, #e6edf3); }
    .role-desc  { font-size: 12px; color: var(--text-secondary, #8b949e); }
    .btn-next {
      padding: 12px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
      transition: background .15s;
    }
    .btn-next:hover:not(:disabled) { background: #d44a2d; }
    .btn-next:disabled { opacity: .4; cursor: not-allowed; }
    .selected-role-tag {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; padding: 10px 14px;
      background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.2);
      border-radius: 8px;
    }
    .role-badge { font-size: 13px; font-weight: 600; color: #e6edf3; }
    .role-badge.seller { color: #ffd700; }
    .btn-change-role {
      font-size: 12px; color: #8b949e; background: none; border: none;
      cursor: pointer; text-decoration: underline;
    }
    .btn-change-role:hover { color: #f05537; }
    .field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 5px; position: relative; }
    .field label { font-size: 11px; font-weight: 600; color: var(--text-secondary, #8b949e); text-transform: uppercase; letter-spacing: .5px; }
    .optional { text-transform: none; font-weight: 400; font-size: 10px; }
    .form-input {
      background: var(--bg-primary, #0d1117); border: 1px solid var(--border, #21262d);
      color: var(--text-primary, #e6edf3); border-radius: 7px; padding: 10px 13px;
      font-size: 14px; outline: none; transition: border-color .15s; width: 100%; box-sizing: border-box;
    }
    .form-input:focus { border-color: #6366f1; }
    .toggle-pwd {
      position: absolute; right: 10px; bottom: 10px; background: none; border: none;
      color: #8b949e; font-size: 11px; cursor: pointer;
    }
    .terms { margin: 16px 0 4px; }
    .terms label { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #8b949e; cursor: pointer; }
    .terms a { color: #f05537; }
    .btn-register {
      width: 100%; padding: 12px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
      transition: background .15s; margin-top: 12px;
    }
    .btn-register:hover:not(:disabled) { background: #d44a2d; }
    .btn-register:disabled { opacity: .4; cursor: not-allowed; }
    .login-link { text-align: center; font-size: 13px; color: #64748b; margin-top: 20px; }
    .login-link a { color: #f05537; text-decoration: none; font-weight: 600; }
  `]
})
export class RegisterComponent {
  private readonly _auth   = inject(AuthService);
  private readonly _router = inject(Router);

  readonly step         = signal<1 | 2>(1);
  readonly selectedRole = signal<'Buyer' | 'Seller' | null>(null);
  readonly loading      = signal(false);
  readonly error        = signal<string | null>(null);
  readonly showPassword = signal(false);

  name            = '';
  email           = '';
  password        = '';
  confirmPassword = '';
  storeName       = '';
  agreedToTerms   = false;

  // FIXED: was (click)="showPassword.update(v => !v)" — arrow functions are not
  // allowed inside Angular template event bindings. Extracted to a plain method.
  togglePassword(): void {
    this.showPassword.set(!this.showPassword());
  }

  submit(): void {
    this.error.set(null);

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }
    if (!this.selectedRole()) {
      this.error.set('Please select a role');
      return;
    }

    this.loading.set(true);
    const displayName = this.selectedRole() === 'Seller' && this.storeName.trim()
      ? this.storeName.trim()
      : this.name.trim();

    this._auth.register(displayName, this.email, this.password, this.selectedRole()!).subscribe({
      next: () => {
        const role = this._auth.currentUser()?.role;
        this._router.navigate([role === 'Seller' ? '/dashboard' : '/shop']);
      },
      error: (err: any) => {
        this.error.set(err?.error?.message ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
