// src/app/features/admin/verification-queue/admin-verification-queue.component.ts
// NEW FILE
// Route: /admin/verification  (Admin role only)
//
// Shows pending/resubmitted seller verifications in a sortable list.
// Clicking a row opens the detail panel (AdminVerificationDetailComponent).

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { SellerVerificationService } from '../../../core/services/seller-verification.service';
import {
  VerificationQueueItem,
  VerificationStatus
} from '../../../core/models/ecommerce.models';

const STATUS_FILTERS: { label: string; value: VerificationStatus | '' }[] = [
  { label: 'Needs Review',    value: '' },
  { label: 'Pending',         value: 'PendingApproval' },
  { label: 'Resubmitted',     value: 'Resubmitted' },
  { label: 'Under Review',    value: 'UnderReview' },
  { label: 'Approved',        value: 'Approved' },
  { label: 'Rejected',        value: 'Rejected' },
  { label: 'Info Requested',  value: 'InfoRequested' },
];

@Component({
  selector: 'app-admin-verification-queue',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="queue-page">

      <div class="page-header">
        <div>
          <h1 class="page-title">Seller Verification Queue</h1>
          <p class="page-sub">Review and approve seller accounts</p>
        </div>
        <button class="btn-refresh" (click)="loadQueue()" [disabled]="loading()">
          <span [class.spin]="loading()">↻</span> Refresh
        </button>
      </div>

      <!-- Status filter tabs -->
      <div class="filter-tabs">
        @for (f of statusFilters; track f.value) {
          <button class="filter-tab"
            [class.active]="activeFilter() === f.value"
            (click)="setFilter(f.value)">
            {{ f.label }}
            @if (f.value === '' && pendingCount() > 0) {
              <span class="badge">{{ pendingCount() }}</span>
            }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="loading-rows">
          @for (i of [1,2,3,4,5]; track i) {
            <div class="skeleton-row"></div>
          }
        </div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div class="empty-title">No verifications to review</div>
          <p class="empty-sub">All caught up!</p>
        </div>
      } @else {
        <div class="queue-table">
          <div class="table-header">
            <span>Seller</span>
            <span>Store</span>
            <span>Location</span>
            <span>Submitted</span>
            <span>Status</span>
            <span></span>
          </div>

          @for (item of items(); track item.verificationId) {
            <div class="table-row" (click)="openDetail(item.verificationId)">
              <div class="cell-seller">
                <div class="seller-name">{{ item.sellerName }}</div>
                <div class="seller-email">{{ item.sellerEmail }}</div>
              </div>
              <div class="cell-store">
                <div class="store-name">{{ item.storeName }}</div>
                @if (item.submissionCount > 1) {
                  <span class="resubmit-badge">{{ item.submissionCount }}x submitted</span>
                }
              </div>
              <div class="cell-location">{{ item.city }}, {{ item.province }}</div>
              <div class="cell-date">{{ item.lastResubmittedAt ?? item.submittedAt | date:'mediumDate' }}</div>
              <div class="cell-status">
                <span class="status-chip" [class]="'chip-' + item.status.toLowerCase()">
                  {{ item.statusLabel }}
                </span>
              </div>
              <div class="cell-action">
                <a [routerLink]="['/admin/verification', item.verificationId]"
                  class="btn-review" (click)="$event.stopPropagation()">
                  Review →
                </a>
              </div>
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
    .queue-page { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
    .page-title  { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub    { font-size: 14px; color: var(--text-secondary, #8b949e); margin: 0; }
    .btn-refresh { padding: 8px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .btn-refresh:disabled { opacity: .5; }
    .spin { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .filter-tabs { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 20px; }
    .filter-tab {
      padding: 6px 14px; background: #161b22; border: 1px solid #21262d;
      border-radius: 99px; color: #8b949e; font-size: 12px; cursor: pointer;
      display: flex; align-items: center; gap: 6px; transition: all .15s;
    }
    .filter-tab:hover  { border-color: #6366f1; color: #e6edf3; }
    .filter-tab.active { border-color: #f05537; color: #f05537; background: rgba(240,85,55,.08); }
    .badge { background: #f05537; color: #fff; border-radius: 99px; padding: 0 6px; font-size: 10px; font-weight: 700; }

    .loading-rows { display: flex; flex-direction: column; gap: 8px; }
    .skeleton-row { height: 60px; background: linear-gradient(90deg, #161b22 25%, #21262d 50%, #161b22 75%); background-size: 200%; animation: shimmer 1.5s infinite; border-radius: 8px; }
    @keyframes shimmer { to { background-position: -200% 0; } }

    .queue-table { border: 1px solid #21262d; border-radius: 10px; overflow: hidden; }
    .table-header {
      display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 80px;
      padding: 10px 16px; background: #0d1117; font-size: 11px;
      font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px;
    }
    .table-row {
      display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr 80px;
      padding: 14px 16px; border-top: 1px solid #21262d;
      background: #161b22; cursor: pointer; transition: background .15s; align-items: center;
    }
    .table-row:hover { background: #1c2128; }
    .seller-name  { font-size: 14px; font-weight: 600; color: #e6edf3; }
    .seller-email { font-size: 12px; color: #64748b; margin-top: 1px; }
    .store-name   { font-size: 13px; color: #e6edf3; }
    .resubmit-badge { font-size: 10px; color: #f59e0b; background: rgba(245,158,11,.1); padding: 1px 6px; border-radius: 4px; }
    .cell-location { font-size: 13px; color: #8b949e; }
    .cell-date     { font-size: 12px; color: #8b949e; }

    .status-chip { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .chip-pendingapproval  { background: rgba(234,179,8,.12); color: #eab308; }
    .chip-resubmitted      { background: rgba(245,158,11,.12); color: #f59e0b; }
    .chip-underreview      { background: rgba(168,85,247,.12); color: #a855f7; }
    .chip-approved         { background: rgba(34,197,94,.12);  color: #22c55e; }
    .chip-rejected         { background: rgba(239,68,68,.12);  color: #ef4444; }
    .chip-inforequested    { background: rgba(59,130,246,.12); color: #60a5fa; }

    .btn-review { font-size: 12px; color: #60a5fa; text-decoration: none; white-space: nowrap; }
    .btn-review:hover { color: #93c5fd; }

    .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
    .page-btn { padding: 7px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .page-info { font-size: 13px; color: #64748b; }

    .empty-state { text-align: center; padding: 60px; }
    .empty-icon  { font-size: 48px; margin-bottom: 12px; }
    .empty-title { font-size: 18px; font-weight: 600; color: #e6edf3; }
    .empty-sub   { font-size: 14px; color: #8b949e; margin-top: 6px; }
  `]
})
export class AdminVerificationQueueComponent implements OnInit {
  private readonly _svc    = inject(SellerVerificationService);
  private readonly _router = inject(Router);

  readonly loading      = signal(true);
  readonly items        = signal<VerificationQueueItem[]>([]);
  readonly page         = signal(1);
  readonly totalPages   = signal(1);
  readonly pendingCount = signal(0);
  readonly activeFilter = signal<VerificationStatus | ''>('');

  readonly statusFilters = STATUS_FILTERS;

  ngOnInit(): void { this.loadQueue(); }

  setFilter(value: VerificationStatus | ''): void {
    this.activeFilter.set(value);
    this.page.set(1);
    this.loadQueue();
  }

  goPage(p: number): void {
    this.page.set(p);
    this.loadQueue();
  }

  loadQueue(): void {
    this.loading.set(true);
    const status = this.activeFilter() || undefined;

    this._svc.getQueue(this.page(), 20, status as VerificationStatus).subscribe({
      next: data => {
        this.items.set(data.items);
        this.totalPages.set(data.totalPages);
        if (!status) this.pendingCount.set(data.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  openDetail(id: number): void {
    this._router.navigate(['/admin/verification', id]);
  }
}
