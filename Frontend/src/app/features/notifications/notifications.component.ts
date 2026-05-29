// src/app/features/notifications/notifications.component.ts
// NEW FILE — Route: /notifications (any authenticated user)

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationItem } from '../../core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notif-page">
      <div class="page-header">
        <h1 class="page-title">Notifications</h1>
        @if (unreadCount() > 0) {
          <button class="btn-mark-all" (click)="markAllRead()">Mark all as read</button>
        }
      </div>

      <div class="filter-tabs">
        <button class="tab" [class.active]="!unreadOnly()" (click)="setFilter(false)">All</button>
        <button class="tab" [class.active]="unreadOnly()" (click)="setFilter(true)">
          Unread @if (unreadCount() > 0) { <span class="badge">{{ unreadCount() }}</span> }
        </button>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading…</div>
      } @else if (items().length === 0) {
        <div class="empty-state">
          <span>🔕</span>
          <p>{{ unreadOnly() ? 'No unread notifications' : 'No notifications yet' }}</p>
        </div>
      } @else {
        <div class="notif-list">
          @for (n of items(); track n.id) {
            <div class="notif-card" [class.unread]="!n.isRead" (click)="onNotifClick(n)">
              <div class="notif-dot-col">
                <div class="dot" [class.visible]="!n.isRead"></div>
              </div>
              <div class="notif-body-col">
                <div class="notif-title">{{ n.title }}</div>
                <div class="notif-body">{{ n.body }}</div>
                <div class="notif-meta">
                  <span class="notif-time">{{ n.timeAgo }}</span>
                  <span class="notif-type-tag">{{ formatType(n.type) }}</span>
                </div>
              </div>
            </div>
          }
        </div>

        @if (totalPages() > 1) {
          <div class="pagination">
            <button [disabled]="page() === 1" (click)="goPage(page() - 1)">← Prev</button>
            <span>{{ page() }} / {{ totalPages() }}</span>
            <button [disabled]="page() === totalPages()" (click)="goPage(page() + 1)">Next →</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .notif-page   { max-width: 680px; margin: 0 auto; padding: 24px; }
    .page-header  { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .page-title   { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0; }
    .btn-mark-all { font-size: 13px; color: #60a5fa; background: none; border: none; cursor: pointer; }
    .btn-mark-all:hover { text-decoration: underline; }
    .filter-tabs  { display: flex; gap: 6px; margin-bottom: 20px; }
    .tab { padding: 6px 16px; background: #161b22; border: 1px solid #21262d; border-radius: 99px; color: #8b949e; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; }
    .tab.active { border-color: #f05537; color: #f05537; background: rgba(240,85,55,.08); }
    .badge { background: #ef4444; color: #fff; border-radius: 99px; padding: 0 6px; font-size: 10px; font-weight: 700; }
    .loading-state { padding: 60px; text-align: center; color: #8b949e; }
    .empty-state   { padding: 60px; text-align: center; color: #64748b; }
    .empty-state span { font-size: 40px; display: block; margin-bottom: 10px; }
    .notif-list   { display: flex; flex-direction: column; gap: 2px; }
    .notif-card   { display: flex; gap: 12px; padding: 14px 16px; background: #161b22; border-radius: 8px; cursor: pointer; transition: background .12s; border: 1px solid transparent; }
    .notif-card:hover { background: #1c2128; }
    .notif-card.unread { background: rgba(99,102,241,.06); border-color: rgba(99,102,241,.15); }
    .notif-dot-col { width: 10px; display: flex; align-items: flex-start; padding-top: 5px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: transparent; }
    .dot.visible { background: #6366f1; }
    .notif-body-col { flex: 1; }
    .notif-title { font-size: 14px; font-weight: 600; color: #e6edf3; margin-bottom: 3px; }
    .notif-body  { font-size: 13px; color: #8b949e; }
    .notif-meta  { display: flex; align-items: center; gap: 10px; margin-top: 5px; }
    .notif-time  { font-size: 11px; color: #64748b; }
    .notif-type-tag { font-size: 10px; background: #21262d; color: #64748b; padding: 1px 7px; border-radius: 99px; }
    .pagination  { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 20px; }
    .pagination button { padding: 6px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .pagination span { font-size: 13px; color: #64748b; }
  `]
})
export class NotificationsComponent implements OnInit {
  private readonly _notifSvc = inject(NotificationService);
  private readonly _router   = inject(Router);

  readonly loading     = signal(true);
  readonly items       = signal<NotificationItem[]>([]);
  readonly page        = signal(1);
  readonly totalPages  = signal(1);
  readonly unreadOnly  = signal(false);
  readonly unreadCount = this._notifSvc.unreadCount;

  ngOnInit(): void { this._load(); }

  setFilter(unreadOnly: boolean): void {
    this.unreadOnly.set(unreadOnly);
    this.page.set(1);
    this._load();
  }

  goPage(p: number): void { this.page.set(p); this._load(); }

  markAllRead(): void {
    this._notifSvc.markAllRead().subscribe(() =>
      this.items.update(list => list.map(n => ({ ...n, isRead: true })))
    );
  }

  onNotifClick(n: NotificationItem): void {
    if (!n.isRead) {
      this._notifSvc.markRead(n.id).subscribe();
      this.items.update(list =>
        list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
    }
    if (n.actionUrl) this._router.navigateByUrl(n.actionUrl);
  }

  formatType(type: string): string {
    return type.replace(/([A-Z])/g, ' $1').trim();
  }

  private _load(): void {
    this.loading.set(true);
    this._notifSvc.getNotifications(this.page(), 20, this.unreadOnly()).subscribe({
      next: data => {
        this.items.set(data.items);
        this.totalPages.set(Math.ceil(data.total / 20));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }
}
