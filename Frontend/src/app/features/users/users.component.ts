// src/app/features/users/users.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../core/services/toast.service';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  department: string;
  lastLoginAt?: string;
  createdDate: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">User Management</h1>
          <p class="page-subtitle">{{ filtered().length }} users</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" (input)="applyFilter()"
            placeholder="Search by name or email..." />
          <select class="filter-select" [(ngModel)]="roleFilter" (change)="applyFilter()">
            <option value="">All Roles</option>
            <option value="Admin">Admin</option>
            <!-- FIX: was 'Customer' — backend role is 'Buyer' -->
            <option value="Buyer">Buyer</option>
            <option value="Seller">Seller</option>
          </select>
          <select class="filter-select" [(ngModel)]="statusFilter" (change)="applyFilter()">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading users...</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">No users match your filters</div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (u of filtered(); track u.id) {
                <tr [class.inactive-row]="!u.isActive">
                  <td>{{ u.id }}</td>
                  <td class="cell-name">{{ u.name }}</td>
                  <td>{{ u.email }}</td>
                  <td>
                    <span class="role-badge role-{{ u.role.toLowerCase() }}">{{ u.role }}</span>
                  </td>
                  <td>{{ u.department || '—' }}</td>
                  <td>
                    <span class="status-badge" [class.active]="u.isActive" [class.inactive]="!u.isActive">
                      {{ u.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>{{ u.lastLoginAt ? (u.lastLoginAt | date:'mediumDate') : 'Never' }}</td>
                  <td>{{ u.createdDate | date:'mediumDate' }}</td>
                  <td class="cell-actions">
                    <button class="btn-sm"
                      [class.btn-danger]="u.isActive"
                      [class.btn-success]="!u.isActive"
                      (click)="toggleActive(u)">
                      {{ u.isActive ? 'Deactivate' : 'Activate' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary,#e6edf3); margin: 0; }
    .page-subtitle { font-size: 13px; color: var(--text-muted,#64748b); margin: 4px 0 0; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
    .search-input, .filter-select { background: var(--bg-secondary,#161b22); border: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none; }
    .search-input { width: 240px; }
    .loading-state, .empty-state { text-align: center; padding: 60px; color: var(--text-muted,#64748b); font-size: 14px; }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border,#21262d); color: var(--text-muted,#64748b); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
    .data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); vertical-align: middle; }
    .data-table tr:hover td { background: rgba(255,255,255,.02); }
    .inactive-row td { opacity: .5; }
    .cell-name { font-weight: 500; }
    .role-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
    .role-admin  { background: rgba(239,68,68,.15);  color: #ef4444; }
    .role-seller { background: rgba(234,179,8,.15);  color: #eab308; }
    .role-buyer  { background: rgba(99,102,241,.15); color: #6366f1; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-badge.active   { background: rgba(34,197,94,.15); color: #22c55e; }
    .status-badge.inactive { background: rgba(107,114,128,.15); color: #6b7280; }
    .cell-actions { white-space: nowrap; }
    .btn-sm { padding: 4px 10px; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
    .btn-sm:hover { opacity: .85; }
    .btn-danger  { background: rgba(239,68,68,.15); color: #ef4444; }
    .btn-success { background: rgba(34,197,94,.15);  color: #22c55e; }
  `]
})
export class UsersComponent implements OnInit {
  private readonly _http  = inject(HttpClient);
  private readonly _toast = inject(ToastService);

  readonly loading  = signal(true);
  readonly users    = signal<AdminUser[]>([]);
  readonly filtered = signal<AdminUser[]>([]);

  search       = '';
  roleFilter   = '';
  statusFilter = '';

  ngOnInit() {
    this._http.get<any>('ms://users/api/users').subscribe({
      next: res => {
        // Backend may return a paged object or a plain array
        const list: AdminUser[] = Array.isArray(res) ? res : (res.items ?? []);
        this.users.set(list);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => {
        this._toast.error('Failed to load users');
        this.loading.set(false);
      }
    });
  }

  applyFilter() {
    let list = this.users();

    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    }

    if (this.roleFilter) {
      list = list.filter(u => u.role === this.roleFilter);
    }

    if (this.statusFilter === 'active')   list = list.filter(u => u.isActive);
    if (this.statusFilter === 'inactive') list = list.filter(u => !u.isActive);

    this.filtered.set(list);
  }

  toggleActive(user: AdminUser) {
    const dto = { isActive: !user.isActive };
    this._http.put<AdminUser>(`ms://users/api/users/${user.id}`, dto).subscribe({
      next: updated => {
        this.users.update(list => list.map(u => u.id === updated.id ? updated : u));
        this.applyFilter();
        this._toast.success(`User ${updated.isActive ? 'activated' : 'deactivated'}`);
      },
      error: () => this._toast.error('Failed to update user')
    });
  }
}