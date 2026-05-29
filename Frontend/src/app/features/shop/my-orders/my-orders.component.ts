// src/app/features/shop/my-orders/my-orders.component.ts
// CHANGES: order detail now shows per-seller shipment groups with tracking info
// List view unchanged. Added expandable order detail with ShipmentGroupDto rendering.

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order, OrderDetail, ShipmentGroup } from '../../../core/models/ecommerce.models';

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
        <div class="loading-state">Loading orders…</div>
      } @else if (filteredOrders().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🛒</span>
          <p>No {{ activeTab || '' }} orders found</p>
          <a routerLink="/shop/products" class="btn-shop">Start Shopping</a>
        </div>
      } @else {
        <div class="orders-list">
          @for (order of filteredOrders(); track order.id) {
            <div class="order-card" [class.expanded]="expandedOrderId() === order.id">

              <!-- Order card header -->
              <div class="order-card-header" (click)="toggleOrderDetail(order.id)">
                <div class="order-meta">
                  <span class="order-id">#{{ order.id }}</span>
                  <span class="order-date">{{ order.createdDate | date:'mediumDate' }}</span>
                  <span class="item-count">{{ order.itemCount ?? (order.lines?.length ?? 0) }} item(s)</span>
                </div>
                <div class="order-right">
                  <span class="status-chip" [class]="'status-' + getStatusText(order.status).toLowerCase()">
                    {{ getStatusText(order.status) }}
                  </span>
                  <span class="order-total">PKR {{ order.total | number:'1.0-0' }}</span>
                  <span class="expand-caret">{{ expandedOrderId() === order.id ? '▲' : '▼' }}</span>
                </div>
              </div>

              <!-- Expanded detail: shipment groups -->
              @if (expandedOrderId() === order.id) {
                @if (detailLoading()) {
                  <div class="detail-loading">Loading shipment details…</div>
                } @else if (orderDetail()) {
                  <div class="order-detail">

                    <!-- Payment info -->
                    <div class="detail-meta">
                      <span>Payment: <strong>{{ orderDetail()!.paymentMethod }}</strong></span>
                      <span>Status: <strong>{{ orderDetail()!.paymentStatus }}</strong></span>
                      @if (orderDetail()!.notes) {
                        <span>Note: {{ orderDetail()!.notes }}</span>
                      }
                    </div>

                    <!-- Per-seller shipment groups -->
                    @for (shipment of orderDetail()!.shipments; track shipment.shipmentId) {
                      <div class="shipment-group">
                        <div class="shipment-header">
                          <div class="seller-info">
                            <span class="seller-icon">🏪</span>
                            <span class="seller-name">{{ shipment.sellerName }}</span>
                          </div>
                          <span class="shipment-status-badge"
                            [class]="'sbadge-' + shipment.status.toLowerCase()">
                            {{ shipmentStatusLabel(shipment.status) }}
                          </span>
                        </div>

                        <!-- Tracking info -->
                        @if (shipment.trackingNumber) {
                          <div class="tracking-row">
                            <span class="t-label">Tracking</span>
                            <span class="t-value">{{ shipment.trackingNumber }}</span>
                            @if (shipment.carrier) {
                              <span class="t-carrier">via {{ shipment.carrier }}</span>
                            }
                          </div>
                        }
                        @if (shipment.estimatedDelivery) {
                          <div class="tracking-row">
                            <span class="t-label">Est. Delivery</span>
                            <span class="t-value">{{ shipment.estimatedDelivery | date:'mediumDate' }}</span>
                          </div>
                        }
                        @if (shipment.deliveredAt) {
                          <div class="tracking-row delivered">
                            <span class="t-label">Delivered</span>
                            <span class="t-value">{{ shipment.deliveredAt | date:'mediumDate' }}</span>
                          </div>
                        }

                        <!-- Lines for this seller -->
                        <div class="shipment-lines">
                          @for (line of shipment.lines; track line.id) {
                            <div class="line-item">
                              <span class="line-name">{{ line.productName }}</span>
                              <span class="line-qty">× {{ line.quantity }}</span>
                              <span class="line-price">PKR {{ line.lineTotal | number:'1.0-0' }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Unassigned lines (legacy orders) -->
                    @if (orderDetail()!.unassignedLines.length > 0) {
                      <div class="shipment-group unassigned">
                        <div class="shipment-header">
                          <span class="seller-name">Other Items</span>
                        </div>
                        <div class="shipment-lines">
                          @for (line of orderDetail()!.unassignedLines; track line.id) {
                            <div class="line-item">
                              <span class="line-name">{{ line.productName }}</span>
                              <span class="line-qty">× {{ line.quantity }}</span>
                              <span class="line-price">PKR {{ line.lineTotal | number:'1.0-0' }}</span>
                            </div>
                          }
                        </div>
                      </div>
                    }

                    <!-- Order total -->
                    <div class="order-total-row">
                      @if (orderDetail()!.shippingFee > 0) {
                        <span>Shipping: PKR {{ orderDetail()!.shippingFee | number:'1.0-0' }}</span>
                      }
                      @if (orderDetail()!.discount > 0) {
                        <span class="discount">- PKR {{ orderDetail()!.discount | number:'1.0-0' }}</span>
                      }
                      <span class="grand-total">Total: PKR {{ orderDetail()!.total | number:'1.0-0' }}</span>
                    </div>

                  </div>
                }
              }

            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .orders-page  { max-width: 820px; margin: 0 auto; padding: 24px; }
    .page-title   { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 20px; }
    .loading-state { text-align: center; padding: 60px; color: #8b949e; }

    .status-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
    .tab { padding: 7px 16px; background: #161b22; border: 1px solid #21262d; border-radius: 99px; color: #8b949e; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .tab.active { border-color: #f05537; color: #f05537; background: rgba(240,85,55,.08); }
    .tab-count { background: #f05537; color: #fff; border-radius: 99px; padding: 0 6px; font-size: 10px; font-weight: 700; }

    .orders-list { display: flex; flex-direction: column; gap: 12px; }
    .order-card  { background: #161b22; border: 1px solid #21262d; border-radius: 12px; overflow: hidden; }
    .order-card.expanded { border-color: #30363d; }

    .order-card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; }
    .order-meta  { display: flex; align-items: center; gap: 12px; }
    .order-id    { font-size: 14px; font-weight: 700; color: #e6edf3; font-family: monospace; }
    .order-date  { font-size: 12px; color: #8b949e; }
    .item-count  { font-size: 11px; color: #64748b; background: #21262d; padding: 2px 8px; border-radius: 99px; }
    .order-right { display: flex; align-items: center; gap: 10px; }
    .order-total { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .expand-caret { font-size: 11px; color: #64748b; }

    .status-chip { font-size: 11px; padding: 3px 10px; border-radius: 99px; font-weight: 600; }
    .status-pending    { background: rgba(234,179,8,.12); color: #eab308; }
    .status-processing { background: rgba(59,130,246,.12); color: #60a5fa; }
    .status-completed  { background: rgba(34,197,94,.12);  color: #22c55e; }
    .status-cancelled  { background: rgba(239,68,68,.12);  color: #ef4444; }

    .detail-loading { padding: 20px; text-align: center; font-size: 13px; color: #8b949e; border-top: 1px solid #21262d; }
    .order-detail { border-top: 1px solid #21262d; }

    .detail-meta { display: flex; gap: 16px; padding: 12px 20px; background: rgba(255,255,255,.02); font-size: 12px; color: #8b949e; flex-wrap: wrap; }
    .detail-meta strong { color: #e6edf3; }

    .shipment-group { border-top: 1px solid #21262d; padding: 14px 20px; }
    .shipment-group.unassigned { opacity: .7; }
    .shipment-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .seller-info  { display: flex; align-items: center; gap: 7px; }
    .seller-icon  { font-size: 16px; }
    .seller-name  { font-size: 14px; font-weight: 600; color: #e6edf3; }

    .shipment-status-badge { font-size: 11px; font-weight: 600; padding: 2px 10px; border-radius: 99px; }
    .sbadge-preparing      { background: rgba(234,179,8,.12); color: #eab308; }
    .sbadge-readytoship    { background: rgba(99,102,241,.12); color: #818cf8; }
    .sbadge-shipped        { background: rgba(59,130,246,.12); color: #60a5fa; }
    .sbadge-outfordelivery { background: rgba(168,85,247,.12); color: #a855f7; }
    .sbadge-delivered      { background: rgba(34,197,94,.12);  color: #22c55e; }
    .sbadge-failed, .sbadge-returned { background: rgba(239,68,68,.12); color: #ef4444; }

    .tracking-row { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 4px; }
    .tracking-row.delivered { color: #22c55e; }
    .t-label   { color: #64748b; width: 90px; flex-shrink: 0; }
    .t-value   { color: #e6edf3; font-family: monospace; }
    .t-carrier { font-size: 11px; color: #64748b; background: #21262d; padding: 1px 7px; border-radius: 4px; }

    .shipment-lines { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
    .line-item  { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
    .line-item:last-child { border-bottom: none; }
    .line-name  { flex: 1; color: #e6edf3; }
    .line-qty   { color: #8b949e; }
    .line-price { font-weight: 600; color: #e6edf3; }

    .order-total-row { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 12px 20px; border-top: 1px solid #21262d; font-size: 13px; color: #8b949e; }
    .discount    { color: #22c55e; }
    .grand-total { font-size: 15px; font-weight: 700; color: #e6edf3; }

    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon  { font-size: 48px; display: block; margin-bottom: 12px; }
    .empty-state p { color: #8b949e; margin: 0 0 16px; }
    .btn-shop { padding: 10px 20px; background: #f05537; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; }
  `]
})
export class MyOrdersComponent implements OnInit {
  private readonly _orderSvc = inject(OrderService);
  readonly auth = inject(AuthService);

  readonly loading        = signal(true);
  readonly detailLoading  = signal(false);
  readonly allOrders      = signal<Order[]>([]);
  readonly expandedOrderId = signal<number | null>(null);
  readonly orderDetail    = signal<OrderDetail | null>(null);

  activeTab = '';

  readonly tabs = [
    { label: 'All',        value: '' },
    { label: 'Pending',    value: 'Pending' },
    { label: 'Processing', value: 'Processing' },
    { label: 'Completed',  value: 'Completed' },
    { label: 'Cancelled',  value: 'Cancelled' },
  ];

  readonly filteredOrders = () =>
    !this.activeTab
      ? this.allOrders()
      : this.allOrders().filter(o => this.getStatusText(o.status) === this.activeTab);

  ngOnInit(): void { this.loadOrders(); }

  setTab(tab: string): void { this.activeTab = tab; }

  loadOrders(): void {
    this.loading.set(true);
    this._orderSvc.getOrders({ page: 1, pageSize: 100 }).subscribe({
      next:  data => { this.allOrders.set(data.items); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  toggleOrderDetail(orderId: number): void {
    if (this.expandedOrderId() === orderId) {
      this.expandedOrderId.set(null);
      this.orderDetail.set(null);
      return;
    }

    this.expandedOrderId.set(orderId);
    this.orderDetail.set(null);
    this.detailLoading.set(true);

    this._orderSvc.getOrderDetail(orderId).subscribe({
      next:  detail => { this.orderDetail.set(detail); this.detailLoading.set(false); },
      error: ()     => this.detailLoading.set(false)
    });
  }

  countByStatus(status: string): number {
    return this.allOrders().filter(o => this.getStatusText(o.status) === status).length;
  }

  getStatusText(status: any): string {
    if (typeof status === 'string') return status;
    return ['Pending', 'Processing', 'Completed', 'Cancelled'][status] ?? 'Unknown';
  }

  shipmentStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      Preparing:      '📦 Preparing',
      ReadyToShip:    '✅ Ready to Ship',
      Shipped:        '🚚 Shipped',
      OutForDelivery: '🏃 Out for Delivery',
      Delivered:      '✔️ Delivered',
      Failed:         '❌ Delivery Failed',
      Returned:       '↩️ Returned'
    };
    return labels[status] ?? status;
  }
}
