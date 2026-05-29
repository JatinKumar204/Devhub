// src/app/features/orders/orders.component.ts
// FIXES applied:
//   1. ngOnInit: getOrders(1, 200) → getOrders({ page: 1, pageSize: 200 })
//   2. ngOnInit: response is now { items, total } not Order[] — read .items
//   3. toggleExpand: getOrder(id) → getOrderDetail(id) (correct method name)
//   4. toggleExpand: detail.lines → flatten lines from detail.shipments + detail.unassignedLines
//      since OrderDetail no longer has a top-level .lines array
//   5. Order[] signal type: Order already has lines?: OrderLine[] from existing model,
//      so spreading flattened lines into the order object is valid
// Everything else (template, styles, summaryChips, updateStatus, applyFilter) is UNCHANGED.

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../core/services/order.service';
import { ToastService } from '../../core/services/toast.service';
import { Order, OrderLine } from '../../core/models/ecommerce.models';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Orders</h1>
          <p class="page-subtitle">{{ orders().length }} total orders</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" (input)="applyFilter()"
            placeholder="Search by ID or customer..." />
          <select class="filter-select" [(ngModel)]="statusFilter" (change)="applyFilter()">
            <option value="">All Statuses</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      <!-- Summary chips -->
      <div class="summary-chips">
        @for (chip of summaryChips; track chip.label) {
          <div class="chip" [style.--chip-color]="chip.color">
            <span class="chip-val">{{ countByStatus(chip.status) }}</span>
            <span class="chip-label">{{ chip.label }}</span>
          </div>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">Loading orders...</div>
      } @else if (filtered().length === 0) {
        <div class="empty-state">No orders match your filters</div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (o of filtered(); track o.id) {
                <tr [class.expanded-row]="expandedId() === o.id">
                  <td class="cell-id">#{{ o.id }}</td>
                  <td>
                    <span class="cell-customer">{{ o.customerName }}</span>
                  </td>
                  <td class="cell-date">{{ o.createdDate | date:'dd MMM yyyy' }}</td>
                  <td>{{ o.itemCount ?? (o.lines?.length ?? '—') }}</td>
                  <td><strong>PKR {{ o.total | number:'1.0-0' }}</strong></td>
                  <td>
                    <span class="pay-method">{{ o.paymentMethod }}</span>
                    <span class="pay-status" [class]="'pay-' + (o.paymentStatus ?? 'pending').toLowerCase()">
                      {{ o.paymentStatus ?? 'Pending' }}
                    </span>
                  </td>
                  <td>
                    <select class="status-select"
                      [value]="getStatusText(o.status)"
                      (change)="updateStatus(o, $any($event.target).value)"
                      [class]="'sel-' + getStatusText(o.status).toLowerCase()">
                      <option value="Pending">Pending</option>
                      <option value="Processing">Processing</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td class="cell-actions">
                    <button class="btn-expand" (click)="toggleExpand(o.id)"
                      [title]="expandedId() === o.id ? 'Collapse' : 'View lines'">
                      {{ expandedId() === o.id ? '▲' : '▼' }}
                    </button>
                  </td>
                </tr>

                @if (expandedId() === o.id) {
                  <tr class="detail-row">
                    <td colspan="8">
                      <div class="order-detail">
                        @if (detailLoading()) {
                          <p class="no-lines">Loading order lines…</p>
                        } @else if (!o.lines || o.lines.length === 0) {
                          <p class="no-lines">No line items loaded.</p>
                        } @else {
                          <table class="lines-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Seller</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Line Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              @for (line of o.lines; track line.id) {
                                <tr>
                                  <td>{{ line.productName }}</td>
                                  <td>{{ line.sellerName || '—' }}</td>
                                  <td>{{ line.quantity }}</td>
                                  <td>PKR {{ line.unitPrice | number:'1.0-0' }}</td>
                                  <td>PKR {{ line.lineTotal | number:'1.0-0' }}</td>
                                </tr>
                              }
                            </tbody>
                          </table>
                        }
                        <div class="order-meta-detail">
                          @if (o.trackingNumber) {
                            <span>🔍 Tracking: <strong>{{ o.trackingNumber }}</strong></span>
                          }
                          @if (o.notes) {
                            <span>📝 Notes: {{ o.notes }}</span>
                          }
                          @if (o.estimatedDelivery) {
                            <span>📅 Est. Delivery: {{ o.estimatedDelivery | date:'mediumDate' }}</span>
                          }
                        </div>
                      </div>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 1400px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; flex-wrap: wrap; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .header-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .search-input { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 7px; padding: 8px 14px; color: var(--text-primary); font-size: 13px; width: 240px; }
    .search-input:focus { outline: none; border-color: #6366f1; }
    .filter-select { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 7px; padding: 8px 12px; color: var(--text-primary); font-size: 13px; }
    .loading-state { padding: 60px; text-align: center; color: var(--text-muted); }
    .empty-state { padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-secondary); border-radius: 10px; }
    .summary-chips { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .chip { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 12px 18px; display: flex; flex-direction: column; align-items: center; border-top: 3px solid var(--chip-color, #6366f1); min-width: 100px; }
    .chip-val { font-size: 22px; font-weight: 800; color: var(--text-primary); }
    .chip-label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
    .table-wrapper { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    thead th { padding: 11px 14px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: .5px; background: var(--bg-primary); border-bottom: 1px solid var(--border); white-space: nowrap; }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,.03); transition: background .12s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover:not(.detail-row) { background: var(--bg-hover); }
    td { padding: 11px 14px; vertical-align: middle; color: var(--text-secondary); }
    .cell-id { font-family: monospace; color: var(--text-muted); font-size: 12px; }
    .cell-customer { font-weight: 600; color: var(--text-primary); }
    .cell-date { white-space: nowrap; }
    .pay-method { display: block; font-size: 12px; color: var(--text-secondary); }
    .pay-status { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 6px; }
    .pay-paid    { background: rgba(34,197,94,.1);   color: #22c55e; }
    .pay-pending { background: rgba(245,158,11,.1);  color: #f59e0b; }
    .pay-failed  { background: rgba(239,68,68,.1);   color: #ef4444; }
    .pay-refunded { background: rgba(99,102,241,.1); color: #818cf8; }
    .status-select { padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); font-size: 12px; font-weight: 600; cursor: pointer; background: transparent; }
    .sel-pending    { color: #f59e0b; border-color: rgba(245,158,11,.4); }
    .sel-processing { color: #818cf8; border-color: rgba(99,102,241,.4); }
    .sel-completed  { color: #22c55e; border-color: rgba(34,197,94,.4); }
    .sel-cancelled  { color: #ef4444; border-color: rgba(239,68,68,.4); }
    .cell-actions { white-space: nowrap; }
    .btn-expand { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 5px; padding: 3px 8px; cursor: pointer; color: var(--text-muted); font-size: 11px; }
    .btn-expand:hover { color: var(--text-primary); }
    .detail-row td { background: var(--bg-primary); border-bottom: 2px solid var(--border); padding: 0 !important; }
    .order-detail { padding: 16px 20px; }
    .no-lines { color: var(--text-muted); font-size: 13px; }
    .lines-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .lines-table th { text-align: left; padding: 6px 10px; font-size: 11px; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border); }
    .lines-table td { padding: 7px 10px; color: var(--text-secondary); border-bottom: 1px solid rgba(255,255,255,.03); }
    .order-meta-detail { display: flex; gap: 20px; margin-top: 12px; font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
  `]
})
export class OrdersComponent implements OnInit {
  private readonly _orderSvc = inject(OrderService);
  private readonly _toast    = inject(ToastService);

  readonly loading       = signal(true);
  readonly detailLoading = signal(false);
  readonly orders        = signal<Order[]>([]);
  readonly filtered      = signal<Order[]>([]);
  readonly expandedId    = signal<number | null>(null);

  search       = '';
  statusFilter = '';

  readonly summaryChips = [
    { label: 'Pending',    status: 'Pending',    color: '#f59e0b' },
    { label: 'Processing', status: 'Processing', color: '#6366f1' },
    { label: 'Completed',  status: 'Completed',  color: '#22c55e' },
    { label: 'Cancelled',  status: 'Cancelled',  color: '#ef4444' },
  ];

  // ── FIX 1 + 2: getOrders now takes options object, returns { items, total } ──
  ngOnInit() {
    this._orderSvc.getOrders({ page: 1, pageSize: 200 }).subscribe({
      next: response => {
        // FIX 2: response is { items: Order[], total, ... } not Order[]
        this.orders.set(response.items);
        this.applyFilter();
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilter() {
    let list = this.orders();
    if (this.search.trim()) {
      const q = this.search.toLowerCase();
      list = list.filter(o =>
        String(o.id).includes(q) ||
        o.customerName?.toLowerCase().includes(q)
      );
    }
    if (this.statusFilter) {
      list = list.filter(o => this.getStatusText(o.status) === this.statusFilter);
    }
    this.filtered.set(list);
  }

  countByStatus(status: string): number {
    return this.orders().filter(o => this.getStatusText(o.status) === status).length;
  }

  getStatusText(status: any): string {
    if (typeof status === 'string') return status;
    return ['Pending', 'Processing', 'Completed', 'Cancelled'][status] ?? 'Unknown';
  }

  // ── FIX 3 + 4: getOrderDetail returns OrderDetail (shipments[].lines, not .lines) ──
  toggleExpand(id: number) {
    if (this.expandedId() === id) {
      this.expandedId.set(null);
      return;
    }

    this.expandedId.set(id);

    const order = this.orders().find(o => o.id === id);
    if (order && order.lines && order.lines.length > 0) {
      // Lines already loaded — nothing to do
      return;
    }

    this.detailLoading.set(true);

    // FIX 3: correct method is getOrderDetail, not getOrder
    this._orderSvc.getOrderDetail(id).subscribe({
      next: detail => {
        // FIX 4: OrderDetail has .shipments[].lines + .unassignedLines, not a top-level .lines
        // Flatten all lines from shipment groups + any unassigned lines into one flat array
        // so the existing admin table (which shows a flat lines list) continues to work
        const flatLines: OrderLine[] = [
          // Lines from each seller shipment group
          ...detail.shipments.flatMap(s => s.lines.map(l => ({
            id:          l.id,
            orderId:     id,
            productId:   l.productId,
            productName: l.productName,
            quantity:    l.quantity,
            unitPrice:   l.unitPrice,
            lineTotal:   l.lineTotal,
            sellerName:  l.sellerName,
            sellerId:    l.sellerId
          } as OrderLine))),
          // Legacy lines with no seller assignment
          ...detail.unassignedLines.map(l => ({
            id:          l.id,
            orderId:     id,
            productId:   l.productId,
            productName: l.productName,
            quantity:    l.quantity,
            unitPrice:   l.unitPrice,
            lineTotal:   l.lineTotal,
            sellerName:  l.sellerName ?? '',
            sellerId:    l.sellerId
          } as OrderLine))
        ];

        this.orders.update(list =>
          list.map(o => o.id === id ? { ...o, lines: flatLines } : o)
        );
        this.applyFilter();
        this.detailLoading.set(false);
      },
      error: () => this.detailLoading.set(false)
    });
  }

  updateStatus(order: Order, newStatus: string) {
    this._orderSvc.updateStatus(order.id, newStatus).subscribe({
      next: updated => {
        this.orders.update(list =>
          list.map(o => o.id === updated.id
            ? { ...o, status: updated.status }
            : o
          )
        );
        this.applyFilter();
        this._toast.success(`Order #${order.id} → ${newStatus}`);
      },
      error: () => this._toast.error('Failed to update status')
    });
  }
}