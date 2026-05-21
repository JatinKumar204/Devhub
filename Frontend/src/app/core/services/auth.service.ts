// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';

export interface AuthUser {
  id: number;
  userId: number;        // FIXED: backend returns both 'id' and 'userId' — normalize to userId
  userName: string;
  role: string;
  roles?: string[];
  email?: string;
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  expiresAt: number;
}

const TOKEN_KEY = 'devhub_auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _http = inject(HttpClient);
  private readonly _router = inject(Router);

  private readonly _user = signal<AuthUser | null>(this._loadStored());

  readonly currentUser = this._user.asReadonly();
  readonly isAuthenticated = computed(() => {
    const u = this._user();
    return !!u && Date.now() < u.expiresAt;
  });

  // FIXED: computed role checks — role can come from .role (backend plain field) or .roles[]
  readonly isAdmin  = computed(() => this._hasRole('Admin'));
  readonly isSeller = computed(() => this._hasRole('Seller'));
  readonly isBuyer  = computed(() => this._hasRole('Buyer'));

  /** Returns the numeric user id, or 0 if not authenticated */
  readonly userId = computed(() => this._user()?.userId ?? this._user()?.id ?? 0);

  login(email: string, password: string) {
    return this._http.post<any>('ms://users/api/auth/login', { email, password }).pipe(
      tap(response => {
        const user: AuthUser = this._mapResponse(response);
        this._user.set(user);
        localStorage.setItem(TOKEN_KEY, JSON.stringify(user));
      }),
      catchError(err => throwError(() => err))
    );
  }

  register(name: string, email: string, password: string, role: 'Buyer' | 'Seller') {
    return this._http.post<any>('ms://users/api/auth/register', { name, email, password, role }).pipe(
      tap(response => {
        const user: AuthUser = this._mapResponse(response);
        this._user.set(user);
        localStorage.setItem(TOKEN_KEY, JSON.stringify(user));
      }),
      catchError(err => throwError(() => err))
    );
  }

  logout(): void {
    this._user.set(null);
    localStorage.removeItem(TOKEN_KEY);
    this._router.navigate(['/login']);
  }

  getToken(): string | null {
    const u = this._user();
    if (!u || Date.now() >= u.expiresAt) return null;
    return u.accessToken;
  }

  private _hasRole(role: string): boolean {
    const u = this._user();
    if (!u) return false;
    // role field from backend TokenResponse
    if (u.role === role) return true;
    // roles array (older format)
    return u.roles?.includes(role) ?? false;
  }

  // FIXED: normalize both 'userId' and 'id' response fields
  private _mapResponse(response: any): AuthUser {
    const userId = response.userId ?? response.id ?? 0;
    return {
      id:              userId,
      userId:          userId,
      userName:        response.userName,
      role:            response.role,
      roles:           response.roles,
      email:           response.email,
      accessToken:     response.accessToken,
      tokenType:       response.tokenType ?? 'Bearer',
      expiresInSeconds: response.expiresInSeconds ?? 3600,
      expiresAt:       Date.now() + (response.expiresInSeconds ?? 3600) * 1000
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
