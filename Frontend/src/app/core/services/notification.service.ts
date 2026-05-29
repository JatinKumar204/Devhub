// src/app/core/services/notification.service.ts
// NEW FILE
//
// Polls /api/notifications/unread-count every 30 seconds while the user is logged in.
// Other components subscribe to unreadCount$ to show the bell badge.

import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { interval, Subscription, switchMap, catchError, of, tap } from 'rxjs';
import { AuthService } from './auth.service';

export interface NotificationItem {
  id:          number;
  type:        string;
  title:       string;
  body:        string;
  actionUrl?:  string;
  isRead:      boolean;
  createdDate: string;
  timeAgo:     string;
}

export interface NotificationPage {
  items:       NotificationItem[];
  total:       number;
  unreadCount: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _http = inject(HttpClient);
  private readonly _auth = inject(AuthService);
  private readonly BASE  = 'ms://users/api/notifications';

  // Reactive unread count — drives the bell badge everywhere
  readonly unreadCount = signal(0);

  private _pollSub: Subscription | null = null;

  // ── Polling ───────────────────────────────────────────────────────────────

  startPolling(): void {
    if (this._pollSub) return;
    // Poll immediately, then every 30 seconds
    this._pollSub = interval(30_000).pipe(
      switchMap(() => this._fetchUnreadCount())
    ).subscribe();
    // Also fetch immediately on start
    this._fetchUnreadCount().subscribe();
  }

  stopPolling(): void {
    this._pollSub?.unsubscribe();
    this._pollSub = null;
  }

  private _fetchUnreadCount() {
    return this._http.get<{ count: number }>(`${this.BASE}/unread-count`).pipe(
      tap(r => this.unreadCount.set(r.count)),
      catchError(() => of({ count: 0 }))
    );
  }

  // ── Data fetching ─────────────────────────────────────────────────────────

  getNotifications(page = 1, pageSize = 20, unreadOnly = false) {
    let params = new HttpParams()
      .set('page',       page)
      .set('pageSize',   pageSize)
      .set('unreadOnly', unreadOnly);
    return this._http.get<NotificationPage>(this.BASE, { params });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  markRead(id: number) {
    return this._http.patch(`${this.BASE}/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCount();
        if (current > 0) this.unreadCount.set(current - 1);
      })
    );
  }

  markAllRead() {
    return this._http.patch(`${this.BASE}/read-all`, {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }
}
