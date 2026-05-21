// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Usage: canActivate: [roleGuard(['Admin', 'Seller'])]
 *
 * Checks both user.role (singular, from backend TokenResponse) and user.roles[]
 * (array format, fallback). Redirects to the right home page on access denied
 * rather than back to login (which is confusing when the user IS authenticated,
 * just the wrong role).
 */
export function roleGuard(allowedRoles: string[]): CanActivateFn {
  return () => {
    const auth   = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    const user = auth.currentUser();
    if (!user) {
      router.navigate(['/login']);
      return false;
    }

    const userRole  = user.role ?? '';
    const userRoles = user.roles ?? [];
    const hasRole   = allowedRoles.some(r => r === userRole || userRoles.includes(r));

    if (!hasRole) {
      // Send the user somewhere useful instead of a blank page
      if (userRole === 'Admin' || userRole === 'Seller') {
        router.navigate(['/dashboard']);
      } else {
        router.navigate(['/shop']);
      }
      return false;
    }

    return true;
  };
}