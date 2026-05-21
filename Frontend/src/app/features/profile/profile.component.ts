// src/app/features/profile/profile.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="profile-page">
      <div class="profile-layout">

        <!-- Sidebar nav -->
        <aside class="profile-sidebar">
          <div class="user-avatar">
            <span class="avatar-circle">{{ initials() }}</span>
            <div>
              <p class="user-name">{{ auth.currentUser()?.userName }}</p>
              <p class="user-email">{{ auth.currentUser()?.email }}</p>
            </div>
          </div>
          <nav class="profile-nav">
            @for (tab of tabs; track tab.id) {
              <button class="nav-item" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
                <span>{{ tab.icon }}</span>
                {{ tab.label }}
              </button>
            }
          </nav>
        </aside>

        <!-- Content -->
        <div class="profile-content">

          @if (activeTab() === 'info') {
            <div class="content-card">
              <h2>Personal Information</h2>
              <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <div class="form-row">
                  <div class="form-group">
                    <label>Username</label>
                    <input formControlName="userName" />
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input formControlName="email" type="email" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Phone</label>
                    <input formControlName="phone" placeholder="03XX-XXXXXXX" />
                  </div>
                  <div class="form-group">
                    <label>Date of Birth</label>
                    <input formControlName="dateOfBirth" type="date" />
                  </div>
                </div>
                <div class="form-group">
                  <label>Gender</label>
                  <select formControlName="gender">
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div class="form-actions">
                  <button type="submit" class="btn-save" [disabled]="saving()">
                    {{ saving() ? 'Saving...' : 'Save Changes' }}
                  </button>
                </div>
              </form>
            </div>
          }

          @if (activeTab() === 'password') {
            <div class="content-card">
              <h2>Change Password</h2>
              <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                <div class="form-group">
                  <label>Current Password</label>
                  <input formControlName="currentPassword" type="password" />
                </div>
                <div class="form-group">
                  <label>New Password</label>
                  <input formControlName="newPassword" type="password" />
                  @if (passwordForm.get('newPassword')?.errors?.['minlength'] && passwordForm.get('newPassword')?.touched) {
                    <span class="err">Minimum 6 characters</span>
                  }
                </div>
                <div class="form-group">
                  <label>Confirm New Password</label>
                  <input formControlName="confirmPassword" type="password" />
                  @if (passwordMismatch()) {
                    <span class="err">Passwords do not match</span>
                  }
                </div>
                <div class="form-actions">
                  <button type="submit" class="btn-save" [disabled]="saving()">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          }

          @if (activeTab() === 'addresses') {
            <div class="content-card">
              <div class="card-header">
                <h2>Saved Addresses</h2>
                <button class="btn-add" (click)="showAddressForm.set(!showAddressForm())">+ Add Address</button>
              </div>

              @if (showAddressForm()) {
                <form [formGroup]="addressForm" (ngSubmit)="saveAddress()" class="address-form">
                  <div class="form-row">
                    <div class="form-group">
                      <label>Label</label>
                      <select formControlName="label">
                        <option>Home</option>
                        <option>Work</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Full Name *</label>
                      <input formControlName="fullName" />
                    </div>
                    <div class="form-group">
                      <label>Phone *</label>
                      <input formControlName="phone" />
                    </div>
                  </div>
                  <div class="form-group">
                    <label>Address *</label>
                    <input formControlName="addressLine1" placeholder="Street / House #" />
                  </div>
                  <div class="form-row">
                    <div class="form-group">
                      <label>City *</label>
                      <input formControlName="city" />
                    </div>
                    <div class="form-group">
                      <label>Province *</label>
                      <select formControlName="state">
                        <option>Sindh</option><option>Punjab</option>
                        <option>KPK</option><option>Balochistan</option>
                        <option>Islamabad</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label>Postal Code</label>
                      <input formControlName="postalCode" />
                    </div>
                  </div>
                  <div class="form-row form-actions">
                    <button type="button" class="btn-cancel" (click)="showAddressForm.set(false)">Cancel</button>
                    <button type="submit" class="btn-save">Save Address</button>
                  </div>
                </form>
              }

              <div class="addresses-list">
                @if (addresses().length === 0) {
                  <div class="empty-addresses">No saved addresses yet</div>
                }
                @for (addr of addresses(); track addr.id) {
                  <div class="address-card" [class.default]="addr.isDefault">
                    <div class="addr-header">
                      <span class="addr-label">🏠 {{ addr.label }}</span>
                      @if (addr.isDefault) { <span class="default-badge">Default</span> }
                    </div>
                    <p class="addr-name">{{ addr.fullName }} · {{ addr.phone }}</p>
                    <p class="addr-text">{{ addr.addressLine1 }}{{ addr.addressLine2 ? ', ' + addr.addressLine2 : '' }}</p>
                    <p class="addr-text">{{ addr.city }}, {{ addr.state }} {{ addr.postalCode }}</p>
                    <div class="addr-actions">
                      @if (!addr.isDefault) {
                        <button class="btn-set-default" (click)="setDefault(addr.id)">Set as Default</button>
                      }
                      <button class="btn-delete-addr" (click)="deleteAddress(addr.id)">Delete</button>
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          @if (activeTab() === 'orders') {
            <div class="content-card">
              <h2>Recent Orders</h2>
              <p class="redirect-note">
                <a routerLink="/shop/orders" class="btn-view-orders">View All Orders →</a>
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { background: #f4f5f7; min-height: 100vh; padding: 20px; max-width: 1000px; margin: 0 auto; }
    .profile-layout { display: grid; grid-template-columns: 240px 1fr; gap: 20px; align-items: flex-start; }

    /* Sidebar */
    .profile-sidebar { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,.06); position: sticky; top: 20px; }
    .user-avatar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
    .avatar-circle { width: 48px; height: 48px; border-radius: 50%; background: #f05537; color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .user-name { font-size: 14px; font-weight: 700; color: #1f2937; margin: 0 0 2px; }
    .user-email { font-size: 12px; color: #6b7280; margin: 0; word-break: break-all; }

    .profile-nav { display: flex; flex-direction: column; gap: 2px; }
    .nav-item {
      display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
      background: none; border: none; cursor: pointer; font-size: 13px; color: #374151;
      text-align: left; transition: all .15s;
    }
    .nav-item:hover { background: #f9fafb; color: #f05537; }
    .nav-item.active { background: #fff5f3; color: #f05537; font-weight: 600; }

    /* Content */
    .profile-content {}
    .content-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .content-card h2 { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 20px; }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .card-header h2 { margin: 0; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
    .form-group label { font-size: 12px; font-weight: 600; color: #374151; }
    .form-group input, .form-group select { padding: 9px 12px; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; background: #fff; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #f05537; }
    .err { font-size: 11px; color: #dc2626; }

    .form-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
    .btn-save { padding: 10px 22px; background: #f05537; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-save:disabled { opacity: .5; cursor: not-allowed; }
    .btn-cancel { padding: 10px 18px; border: 1px solid #e5e7eb; border-radius: 8px; background: none; color: #374151; cursor: pointer; font-size: 13px; }
    .btn-add { padding: 8px 16px; background: #f05537; color: #fff; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; }

    /* Address cards */
    .address-form { background: #f9fafb; border-radius: 10px; padding: 16px; margin-bottom: 20px; border: 1px solid #e5e7eb; }
    .addresses-list { display: flex; flex-direction: column; gap: 12px; }
    .empty-addresses { text-align: center; padding: 30px; color: #9ca3af; font-size: 14px; }
    .address-card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; position: relative; }
    .address-card.default { border-color: #f05537; background: #fff5f3; }
    .addr-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .addr-label { font-size: 13px; font-weight: 600; color: #374151; }
    .default-badge { background: #f05537; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; }
    .addr-name { font-size: 13px; color: #1f2937; font-weight: 500; margin: 0 0 4px; }
    .addr-text { font-size: 12px; color: #6b7280; margin: 0 0 3px; }
    .addr-actions { display: flex; gap: 8px; margin-top: 10px; }
    .btn-set-default { padding: 5px 12px; border: 1px solid #f05537; border-radius: 6px; color: #f05537; background: none; font-size: 12px; cursor: pointer; }
    .btn-delete-addr { padding: 5px 12px; border: 1px solid #e5e7eb; border-radius: 6px; color: #dc2626; background: none; font-size: 12px; cursor: pointer; }

    .redirect-note { text-align: center; padding: 20px; }
    .btn-view-orders { display: inline-block; padding: 11px 24px; background: #f05537; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; }

    @media (max-width: 768px) {
      .profile-layout { grid-template-columns: 1fr; }
      .profile-sidebar { position: static; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly _http = inject(HttpClient);
  private readonly _toast = inject(ToastService);
  private readonly _fb = inject(FormBuilder);

  readonly activeTab = signal('info');
  readonly saving = signal(false);
  readonly showAddressForm = signal(false);
  readonly addresses = signal<any[]>([]);

  readonly tabs = [
    { id: 'info',      icon: '👤', label: 'Personal Info' },
    { id: 'password',  icon: '🔒', label: 'Password' },
    { id: 'addresses', icon: '📍', label: 'Addresses' },
    { id: 'orders',    icon: '📦', label: 'Orders' },
  ];

  profileForm = this._fb.group({
    userName:    ['', Validators.required],
    email:       ['', [Validators.required, Validators.email]],
    phone:       [''],
    dateOfBirth: [''],
    gender:      [''],
  });

  passwordForm = this._fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  addressForm = this._fb.group({
    label:        ['Home'],
    fullName:     ['', Validators.required],
    phone:        ['', Validators.required],
    addressLine1: ['', Validators.required],
    addressLine2: [''],
    city:         ['', Validators.required],
    state:        ['', Validators.required],
    postalCode:   [''],
  });

  initials(): string {
    return (this.auth.currentUser()?.userName ?? 'U').slice(0, 2).toUpperCase();
  }

  passwordMismatch(): boolean {
    const f = this.passwordForm;
    return f.get('newPassword')?.value !== f.get('confirmPassword')?.value
      && !!f.get('confirmPassword')?.touched;
  }

  ngOnInit() {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({ userName: user.userName, email: user.email });
    }
    this._loadAddresses();
  }

  private _loadAddresses() {
    this._http.get<any[]>('ms://users/api/addresses').subscribe({
      next: a => this.addresses.set(a),
      error: () => {}
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    const userId = this.auth.currentUser()?.id;
    this._http.put(`ms://users/api/users/${userId}`, this.profileForm.value).subscribe({
      next: () => { this._toast.success('Profile updated!'); this.saving.set(false); },
      error: () => { this._toast.error('Failed to update profile'); this.saving.set(false); }
    });
  }

  changePassword() {
    if (this.passwordForm.invalid || this.passwordMismatch()) return;
    this.saving.set(true);
    this._http.post('ms://users/api/auth/change-password', this.passwordForm.value).subscribe({
      next: () => { this._toast.success('Password changed!'); this.passwordForm.reset(); this.saving.set(false); },
      error: () => { this._toast.error('Incorrect current password'); this.saving.set(false); }
    });
  }

  saveAddress() {
    if (this.addressForm.invalid) return;
    this._http.post('ms://users/api/addresses', this.addressForm.value).subscribe({
      next: () => {
        this._toast.success('Address saved!');
        this.showAddressForm.set(false);
        this.addressForm.reset({ label: 'Home' });
        this._loadAddresses();
      },
      error: () => this._toast.error('Failed to save address')
    });
  }

  setDefault(id: number) {
    this._http.patch(`ms://users/api/addresses/${id}/default`, {}).subscribe({
      next: () => { this._loadAddresses(); this._toast.success('Default address updated'); },
      error: () => this._toast.error('Failed to update')
    });
  }

  deleteAddress(id: number) {
    if (!confirm('Delete this address?')) return;
    this._http.delete(`ms://users/api/addresses/${id}`).subscribe({
      next: () => { this._loadAddresses(); this._toast.success('Address deleted'); },
      error: () => this._toast.error('Failed to delete')
    });
  }
}
