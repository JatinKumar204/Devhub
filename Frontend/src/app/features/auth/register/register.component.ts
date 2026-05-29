// src/app/features/auth/register/register.component.ts
// CHANGES from previous version:
//   - Added Step 3 for Seller role: store profile form (storeName, phone, address)
//   - submit() sends sellerProfile when role=Seller
//   - Buyer flow is completely unchanged (step 1 → step 2 → submit)
//   - Seller flow: step 1 → step 2 → step 3 → submit
//   - After seller registration: routed to /seller/verification with pending banner
//   - All existing styles preserved; new styles appended

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SellerProfileForm } from '../../../core/models/ecommerce.models';

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

        <!-- Step indicator for sellers -->
        @if (selectedRole() === 'Seller' && step() > 1) {
          <div class="step-indicator">
            <span class="step-dot" [class.active]="step() >= 2" [class.done]="step() > 2">
              <span>1</span>
            </span>
            <span class="step-line"></span>
            <span class="step-dot" [class.active]="step() >= 3" [class.done]="step() > 3">
              <span>2</span>
            </span>
            <span class="step-line"></span>
            <span class="step-dot" [class.active]="step() === 3">
              <span>3</span>
            </span>
            <div class="step-labels">
              <span>Account</span>
              <span>Store</span>
              <span>Done</span>
            </div>
          </div>
        }

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

        <!-- Step 2: Account credentials -->
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

          <form (ngSubmit)="selectedRole() === 'Seller' ? step.set(3) : submit()">
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

            <div class="terms">
              <label>
                <input type="checkbox" [(ngModel)]="agreedToTerms" name="terms" />
                I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
              </label>
            </div>

            <button type="submit" class="btn-register"
              [disabled]="!agreedToTerms || !name || !email || !password">
              {{ selectedRole() === 'Seller' ? 'Continue to Store Details →' : 'Create Buyer Account' }}
            </button>
          </form>
        }

        <!-- Step 3: Seller store profile (NEW) -->
        @if (step() === 3) {
          @if (error()) {
            <div class="alert-error">{{ error() }}</div>
          }

          <div class="section-title">Store Information</div>
          <p class="section-sub">This will be reviewed by our admin team before you can list products.</p>

          <form (ngSubmit)="submit()">
            <div class="field">
              <label>Store / Business Name <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="profile.storeName"
                name="storeName" placeholder="e.g. TechMart Official" required />
            </div>

            <div class="field">
              <label>Phone Number <span class="required">*</span></label>
              <input type="tel" class="form-input" [(ngModel)]="profile.phoneNumber"
                name="phoneNumber" placeholder="03XX XXXXXXX" required />
            </div>

            <div class="field">
              <label>Store Description <span class="optional">(optional)</span></label>
              <textarea class="form-input" [(ngModel)]="profile.storeDescription"
                name="storeDesc" rows="2"
                placeholder="Brief description of what you sell..."></textarea>
            </div>

            <div class="section-title" style="margin-top:16px">Address</div>

            <div class="field">
              <label>Address Line 1 <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="profile.addressLine1"
                name="addr1" placeholder="Street address" required />
            </div>
            <div class="field">
              <label>Address Line 2 <span class="optional">(optional)</span></label>
              <input type="text" class="form-input" [(ngModel)]="profile.addressLine2"
                name="addr2" placeholder="Apartment, suite, etc." />
            </div>
            <div class="field-row">
              <div class="field">
                <label>City <span class="required">*</span></label>
                <input type="text" class="form-input" [(ngModel)]="profile.city"
                  name="city" placeholder="Karachi" required />
              </div>
              <div class="field">
                <label>Province <span class="required">*</span></label>
                <select class="form-input" [(ngModel)]="profile.province" name="province" required>
                  <option value="">Select...</option>
                  <option>Punjab</option>
                  <option>Sindh</option>
                  <option>KPK</option>
                  <option>Balochistan</option>
                  <option>Islamabad</option>
                  <option>AJK</option>
                  <option>Gilgit-Baltistan</option>
                </select>
              </div>
            </div>
            <div class="field">
              <label>Postal Code <span class="required">*</span></label>
              <input type="text" class="form-input" [(ngModel)]="profile.postalCode"
                name="postal" placeholder="75500" required />
            </div>

            <div class="section-title" style="margin-top:16px">Bank Details <span class="optional">(optional)</span></div>
            <p class="section-sub">Required for receiving payments. You can add this later.</p>

            <div class="field">
              <label>Bank Name</label>
              <input type="text" class="form-input" [(ngModel)]="profile.bankName"
                name="bankName" placeholder="e.g. HBL, MCB, Meezan" />
            </div>
            <div class="field-row">
              <div class="field">
                <label>Account Title</label>
                <input type="text" class="form-input" [(ngModel)]="profile.accountTitle"
                  name="accountTitle" placeholder="Name on account" />
              </div>
              <div class="field">
                <label>Account Number</label>
                <input type="text" class="form-input" [(ngModel)]="profile.accountNumber"
                  name="accountNumber" placeholder="XXXX-XXXXXXX-X" />
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-back" (click)="step.set(2)">← Back</button>
              <button type="submit" class="btn-register"
                [disabled]="loading() || !isProfileValid()">
                @if (loading()) { Creating account… }
                @else { Create Seller Account }
              </button>
            </div>
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
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
    }
    .register-card {
      width: 100%; max-width: 480px;
      background: var(--bg-secondary, #161b22);
      border: 1px solid var(--border, #21262d);
      border-radius: 14px; padding: 36px 32px;
    }
    .brand { display: flex; align-items: baseline; gap: 1px; margin-bottom: 24px; }
    .brand-d   { font-size: 22px; font-weight: 900; color: #f05537; }
    .brand-hub { font-size: 22px; font-weight: 900; color: #ffd700; }
    .brand-tag { font-size: 11px; color: #64748b; margin-left: 6px; text-transform: uppercase; letter-spacing: 1px; }
    .title { font-size: 20px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .sub   { font-size: 13px; color: var(--text-secondary, #8b949e); margin: 0 0 24px; }

    /* Step indicator */
    .step-indicator {
      display: flex; align-items: center; margin-bottom: 24px; position: relative;
    }
    .step-dot {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2px solid #334155; background: #0d1117;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; color: #64748b; flex-shrink: 0; z-index: 1;
    }
    .step-dot.active { border-color: #f05537; color: #f05537; }
    .step-dot.done   { border-color: #22c55e; background: #22c55e; color: #fff; }
    .step-line { flex: 1; height: 2px; background: #334155; }
    .step-labels {
      position: absolute; bottom: -18px; left: 0; right: 0;
      display: flex; justify-content: space-between;
      font-size: 10px; color: #64748b;
    }

    .alert-error {
      background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3);
      color: #ef4444; border-radius: 7px; padding: 10px 14px;
      font-size: 13px; margin-bottom: 16px;
    }
    .role-step { display: flex; flex-direction: column; gap: 16px; }
    .role-prompt { font-size: 14px; color: #e6edf3; font-weight: 600; margin: 0; }
    .role-cards { display: flex; flex-direction: column; gap: 10px; }
    .role-card {
      display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
      padding: 16px; border: 2px solid #21262d; border-radius: 10px;
      background: #0d1117; cursor: pointer; text-align: left; transition: all .15s;
    }
    .role-card:hover   { border-color: #6366f1; }
    .role-card.selected { border-color: #f05537; background: rgba(240,85,55,.06); }
    .role-icon  { font-size: 24px; }
    .role-title { font-size: 15px; font-weight: 700; color: #e6edf3; }
    .role-desc  { font-size: 12px; color: #8b949e; }
    .btn-next {
      padding: 12px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .btn-next:disabled { opacity: .4; cursor: not-allowed; }
    .selected-role-tag {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; padding: 10px 14px;
      background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.2); border-radius: 8px;
    }
    .role-badge { font-size: 13px; font-weight: 600; color: #e6edf3; }
    .role-badge.seller { color: #ffd700; }
    .btn-change-role { font-size: 12px; color: #8b949e; background: none; border: none; cursor: pointer; text-decoration: underline; }
    .field { margin-bottom: 14px; display: flex; flex-direction: column; gap: 5px; position: relative; }
    .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field label { font-size: 11px; font-weight: 600; color: #8b949e; text-transform: uppercase; letter-spacing: .5px; }
    .required { color: #ef4444; text-transform: none; }
    .optional  { text-transform: none; font-weight: 400; font-size: 10px; color: #64748b; }
    .form-input {
      background: #0d1117; border: 1px solid #21262d;
      color: #e6edf3; border-radius: 7px; padding: 10px 13px;
      font-size: 14px; outline: none; transition: border-color .15s;
      width: 100%; box-sizing: border-box;
    }
    .form-input:focus { border-color: #6366f1; }
    textarea.form-input { resize: vertical; min-height: 60px; }
    .toggle-pwd {
      position: absolute; right: 10px; bottom: 10px;
      background: none; border: none; color: #8b949e; font-size: 11px; cursor: pointer;
    }
    .section-title { font-size: 13px; font-weight: 700; color: #e6edf3; margin: 0 0 4px; }
    .section-sub   { font-size: 12px; color: #8b949e; margin: 0 0 14px; }
    .terms { margin: 16px 0 4px; }
    .terms label { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #8b949e; cursor: pointer; }
    .terms a { color: #f05537; }
    .form-actions { display: flex; gap: 10px; margin-top: 20px; }
    .btn-back {
      padding: 12px 18px; background: #21262d; color: #e6edf3; border: none;
      border-radius: 8px; font-size: 14px; cursor: pointer; flex-shrink: 0;
    }
    .btn-register {
      flex: 1; padding: 12px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .btn-register:disabled { opacity: .4; cursor: not-allowed; }
    .login-link { text-align: center; font-size: 13px; color: #64748b; margin-top: 20px; }
    .login-link a { color: #f05537; text-decoration: none; font-weight: 600; }
  `]
})
export class RegisterComponent {
  private readonly _auth   = inject(AuthService);
  private readonly _router = inject(Router);

  readonly step         = signal<1 | 2 | 3>(1);
  readonly selectedRole = signal<'Buyer' | 'Seller' | null>(null);
  readonly loading      = signal(false);
  readonly error        = signal<string | null>(null);
  readonly showPassword = signal(false);

  // Step 2 fields
  name            = '';
  email           = '';
  password        = '';
  confirmPassword = '';
  agreedToTerms   = false;

  // Step 3 fields — seller profile
  profile: SellerProfileForm = {
    storeName:    '',
    phoneNumber:  '',
    addressLine1: '',
    city:         '',
    province:     '',
    postalCode:   '',
    country:      'Pakistan'
  };

  togglePassword(): void { this.showPassword.set(!this.showPassword()); }

  isProfileValid(): boolean {
    return !!(
      this.profile.storeName?.trim() &&
      this.profile.phoneNumber?.trim() &&
      this.profile.addressLine1?.trim() &&
      this.profile.city?.trim() &&
      this.profile.province?.trim() &&
      this.profile.postalCode?.trim()
    );
  }

  submit(): void {
    this.error.set(null);

    if (this.password !== this.confirmPassword) {
      this.error.set('Passwords do not match');
      if (this.step() === 3) this.step.set(2);
      return;
    }
    if (this.password.length < 6) {
      this.error.set('Password must be at least 6 characters');
      if (this.step() === 3) this.step.set(2);
      return;
    }
    if (this.selectedRole() === 'Seller' && !this.isProfileValid()) {
      this.error.set('Please fill in all required store fields.');
      return;
    }

    this.loading.set(true);

    const sellerProfile = this.selectedRole() === 'Seller' ? this.profile : undefined;

    this._auth.register(
      this.name.trim(), this.email.trim(), this.password,
      this.selectedRole()!, sellerProfile
    ).subscribe({
      next: () => {
        const role               = this._auth.currentUser()?.role;
        const verificationStatus = this._auth.verificationStatus();
        if (role === 'Seller') {
          // Send seller to their verification status page
          this._router.navigate(['/seller/verification']);
        } else {
          this._router.navigate(['/shop']);
        }
      },
      error: (err: any) => {
        this.error.set(err?.error?.message ?? 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
