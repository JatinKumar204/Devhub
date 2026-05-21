// src/app/features/shop/my-orders/my-orders.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="orders-page">
      <h1 class="page-title">My Orders</h1>

      <!-- Filter tabs -->
      <div class="status-tabs">
        @for (tab of tabs; track tab.value) {
          <button class="tab" [class.active]="activeTab === tab.value" (click)="setTab(tab.value)">
            {{ tab.label }}
            @if (tab.value !== '' && countByStatus(tab.value) > 0) {
              <span class="tab-count">{{ countByStatus(tab.value) }}</span>
            }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">Loading orders...</div>
      } @else if (filteredOrders().length === 0) {
        <div class="empty-state">
          <span>📦</span>
          <p>No {{ activeTab || '' }} orders found</p>
          <a routerLink="/shop/products">Start Shopping</a>
        </div>
      } @else {
        <div class="orders-list">
          @for (order of filteredOrders(); track order.id) {
            <div class="order-card">
              <div class="order-card-header">
                <div class="order-meta">
                  <span class="order-id">#{{ order.id }}</span>
                  <span class="order-date">{{ order.createdDate | date:'mediumDate' }}</span>
                </div>
                <span class="status-chip" [class]="'status-' + getStatusText(order.status).toLowerCase()">
                  {{ getStatusText(order.status) }}
                </span>
              </div>

              <div class="order-items-preview">
                @for (line of (order.lines ?? []).slice(0, 3); track line.id) {
                  <div class="line-item">
                    <span class="line-name">{{ line.productName }}</span>
                    <span class="line-qty">× {{ line.quantity }}</span>
                    <span class="line-price">PKR {{ line.lineTotal | number:'1.0-0' }}</span>
                  </div>
                }
                @if ((order.lines?.length ?? 0) > 3) {
                  <p class="more-items">+ {{ (order.lines?.length ?? 0) - 3 }} more items</p>
                }
              </div>

              <div class="order-card-footer">
                <div class="order-totals">
                  <span class="total-label">Total</span>
                  <span class="total-value">PKR {{ order.total | number:'1.0-0' }}</span>
                </div>
                <div class="order-actions">
                  @if (order.trackingNumber) {
                    <span class="tracking">📦 {{ order.trackingNumber }}</span>
                  }
                  @if (order.status === 'Pending') {
                    <button class="btn-cancel" (click)="cancelOrder(order)">Cancel</button>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .orders-page { background: #f4f5f7; min-height: 100vh; padding: 20px; max-width: 900px; margin: 0 auto; }
    .page-title { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 20px; }

    .status-tabs { display: flex; gap: 4px; background: #fff; border-radius: 10px; padding: 6px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow-x: auto; }
    .tab {
      flex-shrink: 0; padding: 8px 16px; border: none; border-radius: 7px;
      background: none; color: #6b7280; font-size: 13px; font-weight: 500; cursor: pointer;
      transition: all .15s; display: flex; align-items: center; gap: 6px;
    }
    .tab.active { background: #f05537; color: #fff; }
    .tab-count { background: rgba(255,255,255,.3); border-radius: 10px; padding: 1px 6px; font-size: 11px; font-weight: 700; }

    .loading-state { text-align: center; padding: 60px; color: #6b7280; }
    .empty-state { text-align: center; padding: 60px; color: #6b7280; }
    .empty-state span { font-size: 40px; display: block; margin-bottom: 12px; }
    .empty-state a { color: #f05537; }

    .orders-list { display: flex; flex-direction: column; gap: 12px; }
    .order-card { background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 6px rgba(0,0,0,.06); }

    .order-card-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid #f3f4f6; }
    .order-meta { display: flex; align-items: center; gap: 12px; }
    .order-id { font-size: 15px; font-weight: 700; color: #1f2937; }
    .order-date { font-size: 13px; color: #9ca3af; }

    .status-chip { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 12px; }
    .status-pending   { background: rgba(245,158,11,.15); color: #d97706; }
    .status-processing { background: rgba(99,102,241,.1); color: #6366f1; }
    .status-completed { background: rgba(22,163,74,.1); color: #16a34a; }
    .status-cancelled { background: rgba(220,38,38,.1); color: #dc2626; }

    .order-items-preview { padding: 12px 16px; }
    .line-item { display: flex; align-items: center; gap: 8px; font-size: 13px; padding: 4px 0; }
    .line-name { flex: 1; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .line-qty { color: #9ca3af; white-space: nowrap; }
    .line-price { font-weight: 600; color: #1f2937; white-space: nowrap; }
    .more-items { font-size: 12px; color: #9ca3af; margin: 4px 0 0; }

    .order-card-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid #f3f4f6; background: #fafafa; }
    .order-totals { display: flex; align-items: center; gap: 8px; }
    .total-label { font-size: 13px; color: #6b7280; }
    .total-value { font-size: 16px; font-weight: 700; color: #f05537; }
    .order-actions { display: flex; align-items: center; gap: 12px; }
    .tracking { font-size: 12px; color: #6b7280; }
    .btn-cancel {
      padding: 6px 14px; border: 1px solid #dc2626; border-radius: 6px;
      color: #dc2626; background: none; cursor: pointer; font-size: 13px;
    }
    .btn-cancel:hover { background: #dc2626; color: #fff; }
  `]
})
export class MyOrdersComponent implements OnInit {
  private readonly _orderSvc = inject(OrderService);
  private readonly _auth = inject(AuthService);

  readonly loading = signal(true);
  readonly orders = signal<Order[]>([]);
  activeTab = '';

  readonly tabs = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Cancelled', value: 'Cancelled' },
  ];

  ngOnInit() {
    this._orderSvc.getOrders(1, 50).subscribe({
      next: orders => { this.orders.set(orders); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  setTab(val: string) { this.activeTab = val; }

  getStatusText(status: any): string {
    switch (status) {
      case 0: return 'Pending';
      case 1: return 'Processing';
      case 2: return 'Completed';
      case 3: return 'Cancelled';
      default: return String(status);
    }
  }
  filteredOrders(): Order[] {
    if (!this.activeTab) return this.orders();

    return this.orders().filter(
      o => this.getStatusText(o.status) === this.activeTab
    );
  }

  countByStatus(status: string): number {
    return this.orders().filter(
      o => this.getStatusText(o.status) === status
    ).length;
  }

  cancelOrder(order: Order) {
    this._orderSvc.updateStatus(order.id, 'Cancelled').subscribe({
      next: updated => this.orders.update(list => list.map(o => o.id === updated.id ? updated : o))
    });
  }
}
