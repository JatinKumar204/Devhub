// src/app/features/dashboard/dashboard.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

interface DashStat {
  label: string;
  value: string | number;
  sub: string;
  icon: string;
  color: string;
  trend?: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="dashboard">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            {{ auth.isAdmin() ? 'Admin Dashboard' : 'Seller Dashboard' }}
          </h1>
          <p class="page-sub">Welcome back, {{ auth.currentUser()?.userName }} 👋
            <span class="role-chip" [class.seller]="auth.isSeller()">
              {{ auth.isAdmin() ? 'Admin' : 'Seller' }}
            </span>
          </p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="btn-refresh" (click)="loadAll()" [disabled]="loading()">
            <span [class.spin]="loading()">↻</span> Refresh
          </button>
          @if (auth.isSeller()) {
            <a routerLink="/products" class="btn-primary">+ Add Product</a>
          }
          <button class="btn-logout" (click)="auth.logout()">Sign Out</button>
        </div>
      </div>

      <!-- Stats -->
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

      <!-- Main grid -->
      <div class="main-grid">
        <!-- Recent Orders -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Recent Orders</span>
            @if (auth.isAdmin()) {
              <a routerLink="/orders" class="panel-link">View All →</a>
            }
          </div>
          @if (ordersLoading()) {
            @for (i of [1,2,3,4,5]; track i) {
              <div class="skeleton-row"></div>
            }
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

        <!-- Low Stock Alert -->
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
                <span class="stock-qty" [class.critical]="p.stock === 0" [class.low]="p.stock > 0 && p.stock < 5">
                  {{ p.stock === 0 ? 'Out of Stock' : p.stock + ' left' }}
                </span>
              </div>
            }
          }
        </div>

        <!-- Order Status Breakdown -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Order Status</span>
          </div>
          @for (s of orderStatusBreakdown(); track s.label) {
            <div class="status-bar-row">
              <span class="sb-label">{{ s.label }}</span>
              <div class="sb-track">
                <div class="sb-fill" [style.width.%]="s.pct" [style.background]="s.color"></div>
              </div>
              <span class="sb-count">{{ s.count }}</span>
            </div>
          }
        </div>

        <!-- Top Products -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">{{ auth.isSeller() ? 'My Top Products' : 'Top Products' }}</span>
            <a routerLink="/products" class="panel-link">All Products →</a>
          </div>
          @if (productsLoading()) {
            @for (i of [1,2,3]; track i) { <div class="skeleton-row"></div> }
          } @else {
            @for (p of topProducts(); track p.id) {
              <div class="top-product-row">
                <span class="tp-name">{{ p.name }}</span>
                <span class="tp-price">PKR {{ p.price | number:'1.0-0' }}</span>
                <span class="tp-stock">Stock: {{ p.stock }}</span>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard { padding: 28px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-sub { font-size: 14px; color: var(--text-muted); margin: 0; display: flex; align-items: center; gap: 8px; }
    .role-chip { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 10px;
      background: rgba(99,102,241,.15); color: #818cf8; }
    .role-chip.seller { background: rgba(240,85,55,.12); color: #f05537; }
    .btn-refresh, .btn-logout, .btn-primary {
      padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: none; text-decoration: none; display: inline-block;
    }
    .btn-refresh { background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border); }
    .btn-logout  { background: #ef4444; color: #fff; }
    .btn-primary { background: #f05537; color: #fff; }
    .btn-refresh:disabled { opacity: .5; }
    .spin { display: inline-block; animation: spin .6s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 18px; border-top: 3px solid var(--card-color, #6366f1); }
    .stat-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .stat-icon { font-size: 22px; }
    .stat-trend { font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
    .stat-trend.up   { background: rgba(34,197,94,.1); color: #22c55e; }
    .stat-trend.down { background: rgba(239,68,68,.1); color: #ef4444; }
    .stat-value { font-size: 28px; font-weight: 800; color: var(--text-primary); }
    .stat-label { font-size: 13px; font-weight: 600; color: var(--text-secondary); margin: 2px 0; }
    .stat-sub   { font-size: 11px; color: var(--text-muted); }
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
    .panel { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 18px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
    .panel-title { font-size: 14px; font-weight: 700; color: var(--text-primary); }
    .panel-link { font-size: 12px; color: #818cf8; text-decoration: none; }
    .panel-empty { font-size: 13px; color: var(--text-muted); text-align: center; padding: 20px; }
    .skeleton-row { height: 36px; background: var(--bg-hover); border-radius: 6px; margin-bottom: 8px; }
    .order-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .order-row:last-child { border-bottom: none; }
    .order-id { font-family: monospace; color: var(--text-muted); min-width: 50px; }
    .order-customer { flex: 1; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .order-total { font-weight: 700; color: var(--text-primary); white-space: nowrap; }
    .status-chip { font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 8px; white-space: nowrap; }
    .status-pending    { background: rgba(245,158,11,.15); color: #f59e0b; }
    .status-processing { background: rgba(99,102,241,.1); color: #818cf8; }
    .status-completed  { background: rgba(34,197,94,.1); color: #22c55e; }
    .status-cancelled  { background: rgba(239,68,68,.1); color: #ef4444; }
    .stock-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .stock-row:last-child { border-bottom: none; }
    .stock-name { flex: 1; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .stock-cat  { color: var(--text-muted); font-size: 11px; }
    .stock-qty  { font-weight: 700; white-space: nowrap; }
    .stock-qty.critical { color: #ef4444; }
    .stock-qty.low      { color: #f59e0b; }
    .status-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .sb-label { font-size: 12px; color: var(--text-muted); width: 80px; }
    .sb-track { flex: 1; height: 6px; background: var(--bg-hover); border-radius: 3px; overflow: hidden; }
    .sb-fill  { height: 100%; border-radius: 3px; transition: width .6s; }
    .sb-count { font-size: 12px; font-weight: 700; color: var(--text-secondary); min-width: 24px; text-align: right; }
    .top-product-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .top-product-row:last-child { border-bottom: none; }
    .tp-name  { flex: 1; color: var(--text-primary); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tp-price { color: #f05537; font-weight: 700; white-space: nowrap; }
    .tp-stock { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
  `]
})
export class DashboardComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly _http = inject(HttpClient);

  readonly loading         = signal(false);
  readonly ordersLoading   = signal(true);
  readonly productsLoading = signal(true);
  readonly recentOrders    = signal<any[]>([]);
  readonly allOrders       = signal<any[]>([]);
  readonly allProducts     = signal<any[]>([]);
  readonly stats           = signal<DashStat[]>([]);

  readonly lowStockProducts = computed(() =>
    this.allProducts().filter(p => p.stock < 10).sort((a, b) => a.stock - b.stock).slice(0, 6)
  );

  readonly topProducts = computed(() =>
    [...this.allProducts()].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5)
  );

  readonly orderStatusBreakdown = computed(() => {
  const orders = this.allOrders();
  console.log(orders);

  const total = orders.length || 1;

  const statuses = [
    { label: 'Pending',    color: '#f59e0b', count: 0 },
    { label: 'Processing', color: '#6366f1', count: 0 },
    { label: 'Completed',  color: '#22c55e', count: 0 },
    { label: 'Cancelled',  color: '#ef4444', count: 0 },
  ];

  orders.forEach(o => {
    const statusText = this.getStatusText(o.status);
    const s = statuses.find(x => x.label === statusText);
    if (s) s.count++;
  });

  return statuses.map(s => ({
      ...s,
      pct: Math.round((s.count / total) * 100)
    }));
  });

  getStatusText(status: any): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Processing';
      case 2: return 'Completed';
      case 3: return 'Cancelled';
      default: return String(status);
    }
  }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.ordersLoading.set(true);
    this.productsLoading.set(true);

    // FIXED: Sellers only see their own products via /products/my-products endpoint
    const productsUrl = this.auth.isSeller()
      ? 'ms://products/api/products/my-products?page=1&pageSize=100'
      : 'ms://products/api/products?page=1&pageSize=100';

    // FIXED: Sellers see orders filtered by their customerId (orders they fulfilled)
    // Admin sees all orders
    const ordersUrl = 'ms://orders/api/orders?page=1&pageSize=100';

    forkJoin({
      orders:   this._http.get<any[]>(ordersUrl).pipe(catchError(() => of([]))),
      products: this._http.get<any>(productsUrl).pipe(catchError(() => of({ items: [], total: 0 }))),
    }).subscribe({
      next: ({ orders, products }) => {
        const orderList   = Array.isArray(orders) ? orders : [];
        const productList = products?.items ?? [];

        this.allOrders.set(orderList);
        this.recentOrders.set(orderList.slice(0, 8));
        this.allProducts.set(productList);

        const revenue = orderList
          .filter((o: any) => o.status === 2)
          .reduce((s: number, o: any) => s + (o.total ?? 0), 0);

        this.stats.set([
          { label: 'Total Orders',   value: orderList.length,     sub: 'All time',         icon: '🛒', color: '#6366f1', trend: 12 },
          { label: 'Revenue',        value: `PKR ${Math.round(revenue).toLocaleString()}`, sub: 'Completed orders', icon: '💰', color: '#22c55e', trend: 8 },
          { label: this.auth.isSeller() ? 'My Products' : 'Products', value: productList.length, sub: 'In catalog', icon: '📦', color: '#f59e0b' },
          { label: 'Pending Orders', value: orderList.filter((o: any) => o.status === 0).length, sub: 'Need attention', icon: '⏳', color: '#ef4444' },
        ]);

        this.loading.set(false);
        this.ordersLoading.set(false);
        this.productsLoading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.ordersLoading.set(false);
        this.productsLoading.set(false);
      }
    });
  }
}