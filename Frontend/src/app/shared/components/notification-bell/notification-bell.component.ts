// src/app/shared/notification-bell/notification-bell.component.ts
// NEW FILE — add to app header template as:  <app-notification-bell />
//
// Shows unread badge on the bell icon.
// Click opens an inline dropdown with the 10 most recent notifications.
// Clicking a notification marks it read and navigates to actionUrl.

import { Component, inject, signal, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, NotificationItem } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bell-wrapper">
      <button class="bell-btn" (click)="toggleDropdown()" [class.active]="open()">
        🔔
        @if (notifSvc.unreadCount() > 0) {
          <span class="badge">
            {{ notifSvc.unreadCount() > 99 ? '99+' : notifSvc.unreadCount() }}
          </span>
        }
      </button>

      @if (open()) {
        <div class="dropdown">
          <div class="dropdown-header">
            <span class="dropdown-title">Notifications</span>
            @if (notifSvc.unreadCount() > 0) {
              <button class="btn-mark-all" (click)="markAllRead()">Mark all read</button>
            }
          </div>

          @if (loading()) {
            <div class="notif-loading">Loading…</div>
          } @else if (items().length === 0) {
            <div class="notif-empty">
              <span>🔕</span>
              <p>No notifications yet</p>
            </div>
          } @else {
            <div class="notif-list">
              @for (n of items(); track n.id) {
                <div class="notif-item" [class.unread]="!n.isRead"
                  (click)="onNotifClick(n)">
                  <div class="notif-dot" [class.visible]="!n.isRead"></div>
                  <div class="notif-content">
                    <div class="notif-title">{{ n.title }}</div>
                    <div class="notif-body">{{ n.body }}</div>
                    <div class="notif-time">{{ n.timeAgo }}</div>
                  </div>
                </div>
              }
            </div>
            <div class="dropdown-footer">
              <button class="btn-view-all" (click)="viewAll()">
                View all notifications
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .bell-wrapper { position: relative; }

    .bell-btn {
      background: none; border: none; cursor: pointer;
      font-size: 18px; padding: 6px; border-radius: 8px;
      position: relative; line-height: 1; color: var(--text-secondary, #8b949e);
      transition: background .15s;
    }
    .bell-btn:hover, .bell-btn.active {
      background: var(--bg-hover, rgba(255,255,255,.08));
    }

    .badge {
      position: absolute; top: 0; right: 0;
      background: #ef4444; color: #fff;
      border-radius: 99px; font-size: 9px; font-weight: 800;
      padding: 1px 4px; line-height: 1.4; min-width: 16px;
      text-align: center; border: 2px solid var(--bg-primary, #0d1117);
    }

    .dropdown {
      position: absolute; top: calc(100% + 8px); right: 0;
      width: 340px; background: var(--bg-secondary, #161b22);
      border: 1px solid var(--border, #21262d); border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4); z-index: 200;
      overflow: hidden;
    }

    .dropdown-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid var(--border, #21262d);
    }
    .dropdown-title { font-size: 13px; font-weight: 700; color: var(--text-primary, #e6edf3); }
    .btn-mark-all {
      font-size: 11px; color: #60a5fa; background: none;
      border: none; cursor: pointer; padding: 0;
    }
    .btn-mark-all:hover { text-decoration: underline; }

    .notif-loading { padding: 24px; text-align: center; font-size: 13px; color: #64748b; }
    .notif-empty   { padding: 32px 16px; text-align: center; color: #64748b; }
    .notif-empty span { font-size: 28px; display: block; margin-bottom: 8px; }
    .notif-empty p    { font-size: 13px; margin: 0; }

    .notif-list { max-height: 360px; overflow-y: auto; }
    .notif-item {
      display: flex; gap: 10px; padding: 12px 16px;
      cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.04);
      transition: background .12s;
    }
    .notif-item:last-child { border-bottom: none; }
    .notif-item:hover { background: var(--bg-hover, rgba(255,255,255,.04)); }
    .notif-item.unread { background: rgba(99,102,241,.06); }

    .notif-dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: transparent; flex-shrink: 0; margin-top: 5px;
    }
    .notif-dot.visible { background: #6366f1; }

    .notif-content { flex: 1; min-width: 0; }
    .notif-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #e6edf3); margin-bottom: 2px; }
    .notif-body  { font-size: 12px; color: #8b949e; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .notif-time  { font-size: 11px; color: #64748b; margin-top: 3px; }

    .dropdown-footer { padding: 10px 16px; border-top: 1px solid var(--border, #21262d); }
    .btn-view-all {
      width: 100%; padding: 7px; background: transparent;
      border: 1px solid var(--border, #21262d); border-radius: 7px;
      color: #8b949e; font-size: 12px; cursor: pointer; transition: all .15s;
    }
    .btn-view-all:hover { border-color: #6366f1; color: #e6edf3; }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  readonly notifSvc = inject(NotificationService);
  private readonly _auth   = inject(AuthService);
  private readonly _router = inject(Router);

  readonly open    = signal(false);
  readonly loading = signal(false);
  readonly items   = signal<NotificationItem[]>([]);

  ngOnInit(): void {
    if (this._auth.isAuthenticated()) {
      this.notifSvc.startPolling();
    }
  }

  ngOnDestroy(): void {
    // Don't stop polling here — other components may need it.
    // Polling is stopped in app-level logout.
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    const host = (e.target as HTMLElement).closest('app-notification-bell');
    if (!host) this.open.set(false);
  }

  toggleDropdown(): void {
    const willOpen = !this.open();
    this.open.set(willOpen);
    if (willOpen && this.items().length === 0) {
      this._loadNotifications();
    }
  }

  markAllRead(): void {
    this.notifSvc.markAllRead().subscribe(() => {
      this.items.update(list => list.map(n => ({ ...n, isRead: true })));
    });
  }

  onNotifClick(n: NotificationItem): void {
    if (!n.isRead) {
      this.notifSvc.markRead(n.id).subscribe();
      this.items.update(list =>
        list.map(item => item.id === n.id ? { ...item, isRead: true } : item)
      );
    }
    this.open.set(false);
    if (n.actionUrl) {
      this._router.navigateByUrl(n.actionUrl);
    }
  }

  viewAll(): void {
    this.open.set(false);
    this._router.navigate(['/notifications']);
  }

  private _loadNotifications(): void {
    this.loading.set(true);
    this.notifSvc.getNotifications(1, 10).subscribe({
      next:  data => { this.items.set(data.items); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }
}
