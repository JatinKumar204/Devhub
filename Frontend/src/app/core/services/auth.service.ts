import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import { AuthUser, SellerProfileForm, VerificationStatus } from '../models/ecommerce.models';
import { SellerVerificationService } from './seller-verification.service';

export { AuthUser };

const TOKEN_KEY = 'devhub_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _http   = inject(HttpClient);
  private readonly _router = inject(Router);
  private readonly _sellerVerificationService = inject(SellerVerificationService);
  private readonly _user   = signal<AuthUser | null>(this._loadStored());

  readonly currentUser      = this._user.asReadonly();
  readonly isAuthenticated  = computed(() => {
    const u = this._user();
    return !!u && Date.now() < u.expiresAt;
  });
  readonly isExpiringSoon = computed(() => {
    const u = this._user();
    if (!u) return false;
    return u.expiresAt - Date.now() < 5 * 60 * 1000;
  });
  readonly isAdmin   = computed(() => this._hasRole('Admin'));
  readonly isSeller  = computed(() => this._hasRole('Seller'));
  readonly isBuyer   = computed(() => this._hasRole('Buyer'));
  readonly userId    = computed(() => this._user()?.userId ?? this._user()?.id ?? 0);

  // NEW: true only when seller AND approved — used to gate product management UI
  readonly isSellerApproved = computed(() =>
    this._hasRole('Seller') && this._user()?.verificationStatus === 'Approved'
  );

  // NEW: returns the raw verification status string for display in UI
  readonly verificationStatus = computed<VerificationStatus | null>(() =>
    (this._user()?.verificationStatus as VerificationStatus) ?? null
  );
  constructor() {
    const user = this._user();
    if (
      user && this.isAuthenticated() && this._hasRole('Seller') &&
      user.verificationStatus !== 'Approved'
    ) {
      this.refreshSellerVerificationStatus();
    }
  }
  // ── Auth actions ──────────────────────────────────────────────────────────

  login(email: string, password: string) {
    return this._http.post<any>('ms://users/api/auth/login', { email, password }).pipe(
      tap(response => this._setUser(response)),
      catchError(err => throwError(() => err))
    );
  }

  register(
    name: string,
    email: string,
    password: string,
    role: 'Buyer' | 'Seller',
    sellerProfile?: SellerProfileForm
  ) {
    const body: any = { name, email, password, role };
    if (role === 'Seller' && sellerProfile) {
      body.sellerProfile = sellerProfile;
    }

    return this._http.post<any>('ms://users/api/auth/register', body).pipe(
      tap(response => {
        // Response shape: { message, role, verificationStatus, token: { accessToken, ... } }
        // The token is nested under response.token when verificationStatus is present
        const tokenData = response.token ?? response;
        this._setUser(tokenData, response.verificationStatus);
      }),
      catchError(err => throwError(() => err))
    );
  }
  refreshTokens() {
    const stored = this._user();
    const refreshToken = stored?.refreshToken;

    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this._http.post<any>('ms://users/api/auth/refresh', { refreshToken }).pipe(
      tap(response => this._setUser(response)),
      catchError(err => {
        // Refresh failed — force logout
        this._clearUser();
        this._router.navigate(['/login']);
        return throwError(() => err);
      })
    );
  }
  logout(): void {
    const stored = this._user();
    // Revoke server-side tokens (best-effort — don't wait for response)
    if (stored?.accessToken) {
      this._http.post('ms://users/api/auth/logout', {
        refreshToken: stored.refreshToken ?? ''
      }).subscribe({ error: () => {} });
    }
    this._clearUser();
    this._router.navigate(['/login']);
  }

  getToken(): string | null {
    const u = this._user();
    if (!u || Date.now() >= u.expiresAt) return null;
    return u.accessToken;
  }
  refreshSellerVerificationStatus(): void {
    this._sellerVerificationService.getMyStatus().subscribe({
        next: (res) => {
          this.updateVerificationStatus(res.status);
        },
        error: () => {
        }
      });
  }
  updateVerificationStatus(status: VerificationStatus): void {
    const u = this._user();
    if (!u) return;
    const updated = { ...u, verificationStatus: status };
    this._user.set(updated);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _setUser(response: any, verificationStatus?: string): void {
    const user = this._mapResponse(response, verificationStatus);
    this._user.set(user);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(user));
  }
  private _clearUser(): void {
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
  }
  private _hasRole(role: string): boolean {
    const u = this._user();
    if (!u) return false;
    if (u.role === role) return true;
    return u.roles?.includes(role) ?? false;
  }

  private _mapResponse(response: any, overrideVerificationStatus?: string): AuthUser {
    const userId = response.userId ?? response.id ?? 0;
    return {
      id:                 userId,
      userId:             userId,
      userName:           response.userName,
      role:               response.role,
      roles:              response.roles,
      email:              response.email,
      accessToken:        response.accessToken,
      tokenType:          response.tokenType ?? 'Bearer',
      expiresInSeconds:   response.expiresInSeconds ?? 3600,
      expiresAt:          Date.now() + (response.expiresInSeconds ?? 3600) * 1000,
      // verificationStatus: comes from the JWT claim (backend embeds it),
      // or from the override passed during register response
      verificationStatus: (overrideVerificationStatus ?? response.verificationStatus) as VerificationStatus ?? null
    };
  }

  private _loadStored(): AuthUser | null {
    try {
      const raw = localStorage.getItem(TOKEN_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw) as AuthUser;
      if (Date.now() >= user.expiresAt) {
        localStorage.removeItem(TOKEN_KEY);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }
}
