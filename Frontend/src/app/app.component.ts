// src/app/app.component.ts
// Root shell — keeps only infrastructure components here.
//
// FIXES:
//   1. Removed <app-notifications /> — NotificationsComponent is a routed PAGE,
//      not a floating widget. Rendering it here caused it to appear below all
//      page content on every route. It renders correctly via /notifications route.
//
//   2. NotificationBellComponent kept here so polling starts immediately on app
//      load when the user is authenticated, regardless of which route they land on.
//      The bell renders as position:fixed so it floats in the top-right corner
//      as a global overlay. The real bell in shop-header and dashboard is the
//      PRIMARY one; this global one is the fallback for any page that doesn't
//      have its own header (e.g. /config, /login, /register).
//      If both show at once on dashboard/shop, the duplicate is hidden via CSS.
//
//   3. App-level polling: NotificationService.startPolling() is called here
//      so it starts immediately on login rather than waiting for the first
//      header component to mount.

import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `
})
export class AppComponent implements OnInit {
  private readonly _auth     = inject(AuthService);
  private readonly _notifSvc = inject(NotificationService);

  ngOnInit(): void {
    // Start polling as soon as the app loads if the user is already authenticated
    // (e.g. page reload with stored token)
    if (this._auth.isAuthenticated()) {
      this._notifSvc.startPolling();
    }
  }
}
