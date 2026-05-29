// src/app/features/seller/shipments/seller-shipments.component.ts
// NEW FILE — Route: /seller/shipments  (Seller role only)
//
// Shows all shipments belonging to the logged-in seller.
// Seller can update status, add tracking number, and carrier per shipment.

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/order.service';
import { SellerShipment, ShipmentStatus, UpdateShipmentStatusPayload } from '../../../core/models/ecommerce.models';

const STATUS_FLOW: ShipmentStatus[] = [
  'Preparing', 'ReadyToShip', 'Shipped', 'OutForDelivery', 'Delivered'
];

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  Preparing:      '📦 Preparing',
  ReadyToShip:    '✅ Ready to Ship',
  Shipped:        '🚚 Shipped',
  OutForDelivery: '🏃 Out for Delivery',
  Delivered:      '✔️ Delivered',
  Failed:         '❌ Failed',
  Returned:       '↩️ Returned'
};

const STATUS_FILTERS: { label: string; value: string }[] = [
  { label: 'All',             value: '' },
  { label: '📦 Preparing',   value: 'Preparing' },
  { label: '✅ Ready',       value: 'ReadyToShip' },
  { label: '🚚 Shipped',     value: 'Shipped' },
  { label: '🏃 Out for Del.', value: 'OutForDelivery' },
  { label: '✔️ Delivered',   value: 'Delivered' },
];

@Component({
  selector: 'app-seller-shipments',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="shipments-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Shipments</h1>
          <p class="page-sub">Manage shipments for your orders</p>
        </div>
        <button class="btn-refresh" (click)="loadShipments()" [disabled]="loading()">↻ Refresh</button>
      </div>

      <!-- Filter tabs -->
      <div class="filter-tabs">
        @for (f of filters; track f.value) {
          <button class="filter-tab"
            [class.active]="activeFilter() === f.value"
            (click)="setFilter(f.value)">
            {{ f.label }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-state">Loading shipments…</div>
      } @else if (shipments().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <div class="empty-title">No shipments found</div>
          <p class="empty-sub">Shipments appear here when buyers place orders with your products.</p>
        </div>
      } @else {
        <div class="shipment-list">
          @for (shipment of shipments(); track shipment.id) {
            <div class="shipment-card" [class.expanded]="expandedId() === shipment.id">

              <!-- Card header -->
              <div class="card-header" (click)="toggleExpand(shipment.id)">
                <div class="card-left">
                  <span class="order-ref">Order #{{ shipment.orderId }}</span>
                  <span class="customer-name">{{ shipment.customerName }}</span>
                  <span class="item-count">{{ shipment.lines.length }} item(s)</span>
                </div>
                <div class="card-right">
                  <span class="status-badge" [class]="'badge-' + shipment.status.toLowerCase()">
                    {{ STATUS_LABELS[shipment.status] }}
                  </span>
                  <span class="order-total">PKR {{ shipment.orderTotal | number:'1.0-0' }}</span>
                  <span class="expand-icon">{{ expandedId() === shipment.id ? '▲' : '▼' }}</span>
                </div>
              </div>

              <!-- Expanded detail -->
              @if (expandedId() === shipment.id) {
                <div class="card-body">

                  <!-- Order lines for this seller -->
                  <div class="lines-section">
                    <div class="section-label">Your Items</div>
                    <div class="lines-list">
                      @for (line of shipment.lines; track line.productId) {
                        <div class="line-row">
                          <span class="line-name">{{ line.productName }}</span>
                          <span class="line-qty">× {{ line.quantity }}</span>
                          <span class="line-price">PKR {{ line.lineTotal | number:'1.0-0' }}</span>
                        </div>
                      }
                    </div>
                  </div>

                  <!-- Current tracking info -->
                  @if (shipment.trackingNumber) {
                    <div class="tracking-info">
                      <span class="tracking-label">Tracking:</span>
                      <span class="tracking-value">{{ shipment.trackingNumber }}</span>
                      @if (shipment.carrier) {
                        <span class="carrier-badge">{{ shipment.carrier }}</span>
                      }
                    </div>
                  }

                  <!-- Status progress bar -->
                  <div class="progress-bar">
                    @for (step of statusFlow; track step) {
                      <div class="progress-step"
                        [class.done]="isStepDone(shipment.status, step)"
                        [class.current]="shipment.status === step">
                        <div class="step-dot"></div>
                        <div class="step-label">{{ step }}</div>
                      </div>
                    }
                  </div>

                  <!-- Update form — not shown for delivered/returned/failed -->
                  @if (!['Delivered', 'Returned', 'Failed'].includes(shipment.status)) {
                    <div class="update-form">
                      <div class="section-label">Update Shipment</div>

                      @if (updateError()[shipment.id]) {
                        <div class="alert-error">{{ updateError()[shipment.id] }}</div>
                      }
                      @if (updateSuccess()[shipment.id]) {
                        <div class="alert-success">{{ updateSuccess()[shipment.id] }}</div>
                      }

                      <div class="form-row">
                        <div class="field">
                          <label>New Status</label>
                          <select class="form-input"
                            [(ngModel)]="updateForms[shipment.id].status"
                            [name]="'status-' + shipment.id">
                            @for (s of getNextStatuses(shipment.status); track s) {
                              <option [value]="s">{{ STATUS_LABELS[s] }}</option>
                            }
                          </select>
                        </div>
                        <div class="field">
                          <label>Carrier</label>
                          <select class="form-input"
                            [(ngModel)]="updateForms[shipment.id].carrier"
                            [name]="'carrier-' + shipment.id">
                            <option value="">Select carrier…</option>
                            <option>TCS</option>
                            <option>Leopards</option>
                            <option>BlueEx</option>
                            <option>Trax</option>
                            <option>OCS</option>
                            <option>Pakistan Post</option>
                          </select>
                        </div>
                      </div>
                      <div class="form-row">
                        <div class="field">
                          <label>Tracking Number</label>
                          <input class="form-input"
                            [(ngModel)]="updateForms[shipment.id].trackingNumber"
                            [name]="'tracking-' + shipment.id"
                            placeholder="e.g. TCS-12345678" />
                        </div>
                        <div class="field">
                          <label>Est. Delivery Date</label>
                          <input type="date" class="form-input"
                            [(ngModel)]="updateForms[shipment.id].estimatedDelivery"
                            [name]="'eta-' + shipment.id" />
                        </div>
                      </div>
                      <div class="field">
                        <label>Notes (optional)</label>
                        <input class="form-input"
                          [(ngModel)]="updateForms[shipment.id].notes"
                          [name]="'notes-' + shipment.id"
                          placeholder="Any notes for the buyer…" />
                      </div>

                      <button class="btn-update"
                        [disabled]="updating()[shipment.id]"
                        (click)="updateShipment(shipment.id)">
                        {{ updating()[shipment.id] ? 'Updating…' : 'Update Shipment' }}
                      </button>
                    </div>
                  }

                </div>
              }

            </div>
          }
        </div>

        <!-- Pagination -->
        @if (totalPages() > 1) {
          <div class="pagination">
            <button class="page-btn" [disabled]="page() === 1" (click)="goPage(page() - 1)">← Prev</button>
            <span class="page-info">Page {{ page() }} of {{ totalPages() }}</span>
            <button class="page-btn" [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">Next →</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .shipments-page { max-width: 900px; margin: 0 auto; padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title  { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub    { font-size: 14px; color: #8b949e; margin: 0; }
    .btn-refresh { padding: 8px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .loading-state { text-align: center; padding: 60px; color: #8b949e; }

    .filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-tab { padding: 6px 14px; background: #161b22; border: 1px solid #21262d; border-radius: 99px; color: #8b949e; font-size: 12px; cursor: pointer; transition: all .15s; }
    .filter-tab:hover  { border-color: #6366f1; color: #e6edf3; }
    .filter-tab.active { border-color: #f05537; color: #f05537; background: rgba(240,85,55,.08); }

    .shipment-list { display: flex; flex-direction: column; gap: 12px; }
    .shipment-card { background: #161b22; border: 1px solid #21262d; border-radius: 12px; overflow: hidden; transition: border-color .15s; }
    .shipment-card:hover, .shipment-card.expanded { border-color: #30363d; }

    .card-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; cursor: pointer; }
    .card-left   { display: flex; align-items: center; gap: 12px; }
    .order-ref   { font-size: 14px; font-weight: 700; color: #e6edf3; font-family: monospace; }
    .customer-name { font-size: 13px; color: #8b949e; }
    .item-count  { font-size: 11px; color: #64748b; background: #21262d; padding: 2px 8px; border-radius: 99px; }
    .card-right  { display: flex; align-items: center; gap: 12px; }
    .status-badge { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 99px; }
    .badge-preparing      { background: rgba(234,179,8,.12); color: #eab308; }
    .badge-readytoship    { background: rgba(99,102,241,.12); color: #818cf8; }
    .badge-shipped        { background: rgba(59,130,246,.12); color: #60a5fa; }
    .badge-outfordelivery { background: rgba(168,85,247,.12); color: #a855f7; }
    .badge-delivered      { background: rgba(34,197,94,.12);  color: #22c55e; }
    .badge-failed         { background: rgba(239,68,68,.12);  color: #ef4444; }
    .badge-returned       { background: rgba(156,163,175,.12); color: #9ca3af; }
    .order-total { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .expand-icon { font-size: 11px; color: #64748b; }

    .card-body { padding: 0 20px 20px; border-top: 1px solid #21262d; }

    .section-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #64748b; margin: 16px 0 8px; }
    .lines-list { display: flex; flex-direction: column; gap: 6px; }
    .line-row { display: flex; align-items: center; gap: 10px; font-size: 13px; padding: 6px 0; border-bottom: 1px solid #21262d; }
    .line-row:last-child { border-bottom: none; }
    .line-name  { flex: 1; color: #e6edf3; }
    .line-qty   { color: #8b949e; }
    .line-price { font-weight: 600; color: #e6edf3; }

    .tracking-info { display: flex; align-items: center; gap: 8px; margin-top: 12px; padding: 8px 12px; background: rgba(59,130,246,.06); border-radius: 7px; font-size: 13px; }
    .tracking-label { color: #64748b; }
    .tracking-value { color: #60a5fa; font-family: monospace; }
    .carrier-badge  { font-size: 11px; background: #21262d; padding: 2px 8px; border-radius: 4px; color: #8b949e; }

    .progress-bar { display: flex; align-items: flex-start; gap: 0; margin: 16px 0; position: relative; }
    .progress-bar::before { content: ''; position: absolute; top: 7px; left: 7px; right: 7px; height: 2px; background: #21262d; z-index: 0; }
    .progress-step { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; position: relative; z-index: 1; }
    .step-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #334155; background: #0d1117; }
    .progress-step.done    .step-dot { border-color: #22c55e; background: #22c55e; }
    .progress-step.current .step-dot { border-color: #f05537; background: #f05537; }
    .step-label { font-size: 9px; color: #64748b; text-align: center; }
    .progress-step.current .step-label { color: #f05537; font-weight: 700; }

    .update-form { background: #0d1117; border-radius: 8px; padding: 14px; margin-top: 14px; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #64748b; }
    .form-input { background: #161b22; border: 1px solid #21262d; color: #e6edf3; border-radius: 6px; padding: 8px 10px; font-size: 13px; outline: none; }
    .form-input:focus { border-color: #6366f1; }
    .btn-update { margin-top: 12px; padding: 10px 20px; background: #f05537; color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-update:disabled { opacity: .5; cursor: not-allowed; }

    .alert-error   { background: rgba(239,68,68,.1);  border: 1px solid rgba(239,68,68,.3);  color: #ef4444; border-radius: 7px; padding: 8px 12px; font-size: 12px; margin-bottom: 10px; }
    .alert-success { background: rgba(34,197,94,.1);  border: 1px solid rgba(34,197,94,.3);  color: #22c55e; border-radius: 7px; padding: 8px 12px; font-size: 12px; margin-bottom: 10px; }

    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon  { font-size: 48px; margin-bottom: 12px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #e6edf3; }
    .empty-sub   { font-size: 14px; color: #8b949e; margin-top: 6px; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
    .page-btn  { padding: 7px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-info { font-size: 13px; color: #64748b; }

    @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
  `]
})
export class SellerShipmentsComponent implements OnInit {
  private readonly _orderSvc = inject(OrderService);

  readonly loading      = signal(true);
  readonly shipments    = signal<SellerShipment[]>([]);
  readonly page         = signal(1);
  readonly totalPages   = signal(1);
  readonly activeFilter = signal('');
  readonly expandedId   = signal<number | null>(null);
  readonly updating     = signal<Record<number, boolean>>({});
  readonly updateError  = signal<Record<number, string>>({});
  readonly updateSuccess = signal<Record<number, string>>({});

  readonly filters    = STATUS_FILTERS;
  readonly statusFlow = STATUS_FLOW;
  readonly STATUS_LABELS = STATUS_LABELS;

  // Per-shipment update forms
  updateForms: Record<number, UpdateShipmentStatusPayload & { estimatedDelivery?: string }> = {};

  ngOnInit(): void { this.loadShipments(); }

  setFilter(value: string): void {
    this.activeFilter.set(value);
    this.page.set(1);
    this.loadShipments();
  }

  goPage(p: number): void { this.page.set(p); this.loadShipments(); }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
    // Init form if not already
    if (!this.updateForms[id]) {
      const s = this.shipments().find(sh => sh.id === id);
      this.updateForms[id] = {
        status:            s?.status ?? 'Preparing',
        trackingNumber:    s?.trackingNumber ?? '',
        carrier:           s?.carrier ?? '',
        notes:             '',
        estimatedDelivery: ''
      };
    }
  }

  loadShipments(): void {
    this.loading.set(true);
    this._orderSvc.getSellerShipments({
      page:     this.page(),
      pageSize: 20,
      status:   this.activeFilter() || undefined
    }).subscribe({
      next: data => {
        this.shipments.set(data.items);
        this.totalPages.set(data.totalPages);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  getNextStatuses(current: ShipmentStatus): ShipmentStatus[] {
    const idx  = STATUS_FLOW.indexOf(current);
    const next = idx >= 0 ? STATUS_FLOW.slice(idx) : STATUS_FLOW;
    return [...next, 'Failed' as ShipmentStatus, 'Returned' as ShipmentStatus];
  }

  isStepDone(current: ShipmentStatus, step: ShipmentStatus): boolean {
    const currentIdx = STATUS_FLOW.indexOf(current);
    const stepIdx    = STATUS_FLOW.indexOf(step);
    return stepIdx < currentIdx;
  }

  updateShipment(shipmentId: number): void {
    const form = this.updateForms[shipmentId];
    if (!form) return;

    this.updating.set({ ...this.updating(), [shipmentId]: true });
    this.updateError.set({ ...this.updateError(), [shipmentId]: '' });
    this.updateSuccess.set({ ...this.updateSuccess(), [shipmentId]: '' });

    const payload: UpdateShipmentStatusPayload = {
      status:           form.status,
      trackingNumber:   form.trackingNumber || undefined,
      carrier:          form.carrier || undefined,
      notes:            form.notes   || undefined,
      estimatedDelivery: form.estimatedDelivery || undefined
    };

    this._orderSvc.updateShipmentStatus(shipmentId, payload).subscribe({
      next: result => {
        this.updateSuccess.set({ ...this.updateSuccess(), [shipmentId]: 'Shipment updated successfully.' });
        this.updating.set({ ...this.updating(), [shipmentId]: false });
        // Update the shipment in the list
        this.shipments.update(list =>
          list.map(s => s.id === shipmentId ? { ...s, ...result } : s)
        );
      },
      error: err => {
        this.updateError.set({ ...this.updateError(), [shipmentId]: err?.error?.message ?? 'Update failed.' });
        this.updating.set({ ...this.updating(), [shipmentId]: false });
      }
    });
  }
}
