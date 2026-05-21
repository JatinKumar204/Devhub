import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: string;
  totalOrders: number;
  totalSpend: number;
  joinedAt: string;
}

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Customers</h1>
          <p class="page-subtitle">{{ customers().length }} total customers</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" placeholder="Search customers..." />
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading customers...</div>
      } @else if (error()) {
        <div class="error-state">{{ error() }}</div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Company</th>
                <th>Phone</th>
                <th>Orders</th>
                <th>Total Spend</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              @for (c of filtered(); track c.id) {
                <tr>
                  <td class="cell-primary">
                    <div class="avatar">{{ c.name.charAt(0) }}</div>
                    <div>
                      <div class="cell-name">{{ c.name }}</div>
                      <div class="cell-sub">{{ c.email }}</div>
                    </div>
                  </td>
                  <td>{{ c.company }}</td>
                  <td>{{ c.phone }}</td>
                  <td>{{ c.totalOrders }}</td>
                  <td>\${{ c.totalSpend | number:'1.2-2' }}</td>
                  <td><span class="badge" [class]="'badge-' + c.status.toLowerCase()">{{ c.status }}</span></td>
                  <td>{{ c.joinedAt | date:'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 1300px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .search-input {
      background: var(--bg-secondary); border: 1px solid var(--border);
      border-radius: 7px; padding: 8px 14px; color: var(--text-primary);
      font-size: 13px; width: 240px;
    }
    .search-input:focus { outline: none; border-color: #6366f1; }
    .loading-state, .error-state { padding: 40px; text-align: center; color: var(--text-muted); font-size: 14px; }
    .error-state { color: #ef4444; }
    .table-wrapper { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,.03); transition: background 0.12s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--bg-hover); }
    td { padding: 10px 16px; vertical-align: middle; color: var(--text-secondary); }
    .cell-primary { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(99,102,241,.2); color: #818cf8; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; flex-shrink: 0; }
    .cell-name { font-weight: 600; color: var(--text-primary); }
    .cell-sub { font-size: 11px; color: var(--text-muted); }
    .badge { display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .badge-active { background: rgba(34,197,94,.1); color: #22c55e; }
    .badge-inactive { background: rgba(107,114,128,.1); color: #6b7280; }
    .badge-vip { background: rgba(245,158,11,.1); color: #f59e0b; }
  `]
})
export class CustomersComponent implements OnInit {
  private readonly _http = inject(HttpClient);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly customers = signal<Customer[]>([]);
  search = '';

  filtered() {
    const q = this.search.toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this._http.get<Customer[]>('/api/customers').pipe(
      catchError(() => {
        this.error.set('Customer service unavailable. Showing sample data.');
        return of(SAMPLE_CUSTOMERS);
      })
    ).subscribe(data => {
      this.customers.set(data ?? SAMPLE_CUSTOMERS);
      this.loading.set(false);
    });
  }
}

const SAMPLE_CUSTOMERS: Customer[] = [
  { id: 1, name: 'Sarah Mitchell', email: 'sarah.m@acme.com', phone: '+1 555-0101', company: 'Acme Corp', status: 'VIP', totalOrders: 42, totalSpend: 18500, joinedAt: '2023-03-15' },
  { id: 2, name: 'James Thornton', email: 'jthornton@globex.com', phone: '+1 555-0102', company: 'Globex Inc', status: 'Active', totalOrders: 17, totalSpend: 6200, joinedAt: '2023-07-22' },
  { id: 3, name: 'Priya Patel', email: 'priya@initech.io', phone: '+1 555-0103', company: 'Initech', status: 'Active', totalOrders: 8, totalSpend: 2400, joinedAt: '2024-01-10' },
  { id: 4, name: 'Marcus Webb', email: 'mwebb@umbrella.co', phone: '+1 555-0104', company: 'Umbrella Co', status: 'Inactive', totalOrders: 3, totalSpend: 890, joinedAt: '2023-11-05' },
  { id: 5, name: 'Elena Vasquez', email: 'e.vasquez@soylent.com', phone: '+1 555-0105', company: 'Soylent Corp', status: 'VIP', totalOrders: 61, totalSpend: 31200, joinedAt: '2022-09-18' },
];
