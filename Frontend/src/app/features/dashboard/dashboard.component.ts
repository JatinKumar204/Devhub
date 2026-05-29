// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationBellComponent } from '../../shared/components/notification-bell/notification-bell.component';

interface DashStat {
  label: string; value: string | number;
  sub: string; icon: string; color: string; trend?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, NotificationBellComponent],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            {{ auth.isAdmin() ? 'Admin Dashboard' : 'Seller Dashboard' }}
          </h1>
          <p class="page-sub">
            Welcome back, {{ auth.currentUser()?.userName }} 👋
            <span class="role-chip" [class.seller]="auth.isSeller()">
              {{ auth.isAdmin() ? 'Admin' : 'Seller' }}
            </span>
          </p>
        </div>

        <div class="header-right">
          <app-notification-bell />

          <button class="btn-refresh" (click)="loadAll()" [disabled]="loading()">
            <span [class.spin]="loading()">↻</span> Refresh
          </button>

          <a routerLink="/analytics" class="btn-analytics">📈 Analytics</a>

          @if (auth.isSeller() && auth.isSellerApproved()) {
            <a routerLink="/products" class="btn-primary">+ Add Product</a>
          }
          @if (auth.isAdmin()) {
            <a routerLink="/admin/verification" class="btn-verify-queue">
              🔍 Verification Queue
              @if (pendingVerifications() > 0) {
                <span class="queue-badge">{{ pendingVerifications() }}</span>
              }
            </a>
          }
          <button class="btn-logout" (click)="logout()">Sign Out</button>
        </div>
      </div>

      @if (auth.isSeller() && !auth.isSellerApproved()) {
        <div class="verification-banner" [class]="'vbanner-' + (auth.verificationStatus() ?? 'PendingApproval').toLowerCase()">
          <span class="vbanner-icon">{{ verificationIcon() }}</span>
          <div class="vbanner-content">
            <div class="vbanner-title">{{ verificationTitle() }}</div>
            <div class="vbanner-desc">{{ verificationDesc() }}</div>
          </div>
          <a routerLink="/seller/verification" class="btn-vbanner">
            {{ auth.verificationStatus() === 'Rejected' || auth.verificationStatus() === 'InfoRequested'
               ? 'Re-submit →' : 'View Status →' }}
          </a>
        </div>
      }

      <div class="stats-grid">
        @for (card of stats(); track card.label) {
          <div class="stat-card" [style.--card-color]="card.color">
            <div class="stat-top">
              <span class="stat-icon">{{ card.icon }}</span>
              @if (card.trend !== undefined) {
                <span class="stat-trend" [class.up]="card.trend >= 0" [class.down]="card.trend < 0">
                  {{ card.trend >= 0 ? '↑' : '↓' }} {{ card.trend | number:'1.0-0' }}%
                </span>
              }
            </div>
            <div class="stat-value">{{ card.value }}</div>
            <div class="stat-label">{{ card.label }}</div>
            <div class="stat-sub">{{ card.sub }}</div>
          </div>
        }
      </div>

      <div class="main-grid">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Recent Orders</span>
            @if (auth.isAdmin()) {
              <a routerLink="/orders" class="panel-link">View All →</a>
            }
          </div>
          @if (ordersLoading()) {
            @for (i of [1,2,3,4,5]; track i) { <div class="skeleton-row"></div> }
          } @else if (recentOrders().length === 0) {
            <div class="panel-empty">No orders yet</div>
          } @else {
            @for (order of recentOrders(); track order.id) {
              <div class="order-row">
                <span class="order-id">#{{ order.id }}</span>
                <span class="order-customer">{{ order.customerName }}</span>
                <span class="status-chip" [class]="'status-' + order.status">{{ order.status }}</span>
                <span class="order-total">PKR {{ order.total | number:'1.0-0' }}</span>
              </div>
            }
          }
        </div>

        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">⚠ Low Stock Alerts</span>
            <a routerLink="/products" class="panel-link">Manage →</a>
          </div>
          @if (productsLoading()) {
            @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
          } @else if (lowStockProducts().length === 0) {
            <div class="panel-empty">✓ All products well stocked</div>
          } @else {
            @for (p of lowStockProducts(); track p.id) {
              <div class="stock-row">
                <span class="stock-name">{{ p.name }}</span>
                <span class="stock-cat">{{ p.category }}</span>
                <span class="stock-qty"
                  [class.critical]="p.stock === 0"
                  [class.low]="p.stock > 0 && p.stock < 5">
                  {{ p.stock === 0 ? 'Out of Stock' : p.stock + ' left' }}
                </span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard   { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
    .page-title  { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub    { font-size: 14px; color: var(--text-secondary, #8b949e); margin: 0; display: flex; align-items: center; gap: 8px; }
    .role-chip   { font-size: 11px; padding: 2px 8px; border-radius: 99px; background: rgba(99,102,241,.15); color: #818cf8; font-weight: 600; }
    .role-chip.seller { background: rgba(240,85,55,.1); color: #f05537; }
    .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .btn-refresh  { padding: 8px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .btn-analytics { padding: 8px 14px; background: rgba(34,197,94,.1); border: 1px solid rgba(34,197,94,.3); border-radius: 7px; color: #22c55e; font-size: 13px; font-weight: 600; text-decoration: none; }
    .btn-primary  { padding: 8px 16px; background: #f05537; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; text-decoration: none; }
    .btn-logout   { padding: 8px 14px; background: transparent; border: 1px solid #30363d; border-radius: 7px; color: #8b949e; font-size: 13px; cursor: pointer; }
    .btn-verify-queue { padding: 8px 14px; background: rgba(99,102,241,.12); border: 1px solid rgba(99,102,241,.3); border-radius: 7px; color: #818cf8; font-size: 13px; font-weight: 600; text-decoration: none; display: flex; align-items: center; gap: 7px; }
    .queue-badge  { background: #ef4444; color: #fff; border-radius: 99px; padding: 1px 7px; font-size: 11px; font-weight: 700; }
    .spin { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .verification-banner { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-radius: 10px; margin-bottom: 24px; border: 1px solid transparent; }
    .vbanner-pendingapproval, .vbanner-resubmitted { background: rgba(234,179,8,.07); border-color: rgba(234,179,8,.25); }
    .vbanner-rejected      { background: rgba(239,68,68,.07);  border-color: rgba(239,68,68,.25); }
    .vbanner-inforequested { background: rgba(59,130,246,.07); border-color: rgba(59,130,246,.25); }
    .vbanner-underreview   { background: rgba(168,85,247,.07); border-color: rgba(168,85,247,.25); }
    .vbanner-icon    { font-size: 28px; flex-shrink: 0; }
    .vbanner-content { flex: 1; }
    .vbanner-title   { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .vbanner-desc    { font-size: 12px; color: #8b949e; margin-top: 2px; }
    .btn-vbanner { padding: 7px 14px; border-radius: 7px; font-size: 12px; font-weight: 600; text-decoration: none; background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1); color: #e6edf3; white-space: nowrap; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card  { background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 12px; padding: 18px; }
    .stat-top   { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
    .stat-icon  { font-size: 22px; }
    .stat-trend { font-size: 12px; font-weight: 600; padding: 2px 7px; border-radius: 99px; }
    .stat-trend.up   { background: rgba(34,197,94,.12); color: #22c55e; }
    .stat-trend.down { background: rgba(239,68,68,.12); color: #ef4444; }
    .stat-value { font-size: 26px; font-weight: 700; color: var(--card-color, #e6edf3); }
    .stat-label { font-size: 13px; font-weight: 600; color: #8b949e; margin-top: 2px; }
    .stat-sub   { font-size: 11px; color: #64748b; margin-top: 3px; }
    .main-grid  { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .panel      { background: var(--bg-secondary, #161b22); border: 1px solid var(--border, #21262d); border-radius: 12px; padding: 18px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
    .panel-title  { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .panel-link   { font-size: 12px; color: #60a5fa; text-decoration: none; }
    .panel-empty  { font-size: 13px; color: #64748b; padding: 10px 0; }
    .order-row    { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
    .order-row:last-child { border-bottom: none; }
    .order-id     { color: #8b949e; font-family: monospace; font-size: 12px; width: 40px; }
    .order-customer { flex: 1; color: #e6edf3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .order-total  { color: #e6edf3; font-weight: 600; font-size: 12px; }
    .status-chip  { font-size: 10px; padding: 2px 8px; border-radius: 99px; font-weight: 600; }
    .status-Pending    { background: rgba(234,179,8,.12); color: #eab308; }
    .status-Processing { background: rgba(59,130,246,.12); color: #60a5fa; }
    .status-Completed  { background: rgba(34,197,94,.12);  color: #22c55e; }
    .status-Cancelled  { background: rgba(239,68,68,.12);  color: #ef4444; }
    .stock-row  { display: flex; gap: 10px; align-items: center; padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
    .stock-row:last-child { border-bottom: none; }
    .stock-name { flex: 1; color: #e6edf3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stock-cat  { font-size: 11px; color: #64748b; }
    .stock-qty  { font-size: 12px; font-weight: 600; }
    .stock-qty.critical { color: #ef4444; }
    .stock-qty.low      { color: #f59e0b; }
    .skeleton-row { height: 36px; background: linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%); background-size: 200%; animation: shimmer 1.5s infinite; border-radius: 6px; margin-bottom: 6px; }
    @keyframes shimmer { to { background-position: -200% 0; } }
    @media (max-width: 700px) {
      .main-grid   { grid-template-columns: 1fr; }
      .stats-grid  { grid-template-columns: 1fr 1fr; }
      .header-right { gap: 6px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly _http     = inject(HttpClient);
  private readonly _notifSvc = inject(NotificationService);

  readonly loading          = signal(false);
  readonly ordersLoading    = signal(true);
  readonly productsLoading  = signal(true);
  readonly stats            = signal<DashStat[]>([]);
  readonly recentOrders     = signal<any[]>([]);
  readonly lowStockProducts = signal<any[]>([]);
  readonly pendingVerifications = signal(0);

  readonly verificationIcon  = () => ({ PendingApproval:'⏳', Resubmitted:'🔄', UnderReview:'🔍', Rejected:'❌', InfoRequested:'ℹ️', Approved:'✅' }[this.auth.verificationStatus() ?? 'PendingApproval'] ?? '⏳');
  readonly verificationTitle = () => ({ PendingApproval:'Account Pending Approval', Resubmitted:'Re-submitted — Awaiting Review', UnderReview:'Under Review', Rejected:'Verification Rejected', InfoRequested:'Additional Information Required', Approved:'Verification Approved' }[this.auth.verificationStatus() ?? 'PendingApproval'] ?? 'Pending');
  readonly verificationDesc  = () => ({ PendingApproval:'Your account is in the review queue. Upload documents while you wait.', Resubmitted:'Your updated documents are under admin review.', UnderReview:'An admin is reviewing your submission.', Rejected:'Your verification was not approved. Check the reason and re-submit.', InfoRequested:'Admin needs more documents. Please re-submit with the requested information.', Approved:'Your verification has been approved.' }[this.auth.verificationStatus() ?? 'PendingApproval'] ?? '');

  ngOnInit(): void {
    this._notifSvc.startPolling();
    this.loadAll();
  }

  logout(): void {
    this._notifSvc.stopPolling();
    this.auth.logout();
  }

  loadAll(): void {
    this.loading.set(true);
    const sellerId = this.auth.isSeller() ? this.auth.userId() : undefined;

    forkJoin({
      orders: this._http.get<any>(
        this.auth.isSeller()
          ? `ms://orders/api/orders?sellerId=${sellerId}&page=1&pageSize=5`
          : 'ms://orders/api/orders?page=1&pageSize=5'
      ).pipe(catchError(() => of({ items: [], total: 0 }))),
      products: this._http.get<any>(
        this.auth.isSeller()
          ? 'ms://products/api/products/my-products?page=1&pageSize=100'
          : 'ms://products/api/products?page=1&pageSize=100'
      ).pipe(catchError(() => of({ items: [], total: 0 }))),
      ...(this.auth.isAdmin() ? {
        verifications: this._http.get<any>('ms://users/api/seller-verification/queue?pageSize=1')
          .pipe(catchError(() => of({ total: 0 })))
      } : {})
    }).subscribe({
      next: (data: any) => {
        const orders   = data.orders?.items   ?? [];
        const products = data.products?.items ?? [];

        if (this.auth.isAdmin() && data.verifications)
          this.pendingVerifications.set(data.verifications.total ?? 0);

        this.recentOrders.set(orders.slice(0, 5));
        this.ordersLoading.set(false);

        const lowStock = products.filter((p: any) => p.stock < 5);
        this.lowStockProducts.set(lowStock.slice(0, 8));
        this.productsLoading.set(false);

        const totalRevenue = orders
          .filter((o: any) => o.status === 'Completed')
          .reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);

        this.stats.set([
          { label: 'Total Products', value: data.products?.total ?? products.length, sub: `${lowStock.length} low stock`, icon: '📦', color: '#60a5fa' },
          { label: 'Total Orders',   value: data.orders?.total ?? orders.length,     sub: 'All time',          icon: '🛒', color: '#34d399' },
          { label: 'Revenue',        value: `PKR ${(totalRevenue / 1000).toFixed(1)}k`, sub: 'Completed orders', icon: '💰', color: '#f59e0b', trend: 12 },
          { label: 'Out of Stock',   value: products.filter((p: any) => p.stock === 0).length, sub: 'Need restocking', icon: '⚠️', color: '#f87171' },
        ]);

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
