import { inject } from '@angular/core';
import {
  HttpInterceptorFn, HttpRequest, HttpHandlerFn,
  HttpEvent, HttpErrorResponse
} from '@angular/common/http';
import {
  Observable, throwError, BehaviorSubject, switchMap,
  filter, take, catchError
} from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing       = false;
const refreshDone$     = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {

  const auth = inject(AuthService);

  if (req.url.includes('/api/auth/refresh') || req.url.includes('/api/auth/login')) {
    return next(req);
  }

  const token = auth.getToken();

  // Proactive refresh: if the token is about to expire, refresh before sending
  if (token && auth.isExpiringSoon() && !isRefreshing) {
    return _doRefresh(auth).pipe(
      switchMap(newToken => next(_attachToken(req, newToken)))
    );
  }

  // Normal path: attach token if available
  const reqWithToken = token ? _attachToken(req, token) : req;

  return next(reqWithToken).pipe(
    catchError((error: HttpErrorResponse) => {
      // Reactive refresh: 401 received — try once to refresh
      if (error.status === 401 && token && !req.url.includes('/api/auth/')) {
        return _handleUnauthorized(req, next, auth);
      }
      return throwError(() => error);
    })
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function _attachToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function _doRefresh(auth: AuthService): Observable<string> {
  if (isRefreshing) {
    // Another request already started a refresh — wait for it to complete
    return refreshDone$.pipe(
      filter((t): t is string => t !== null),
      take(1)
    );
  }

  isRefreshing = true;
  refreshDone$.next(null);

  return auth.refreshTokens().pipe(
    switchMap(() => {
      const newToken = auth.getToken()!;
      isRefreshing = false;
      refreshDone$.next(newToken);
      return refreshDone$.pipe(
        filter((t): t is string => t !== null),
        take(1)
      );
    }),
    catchError(err => {
      isRefreshing = false;
      refreshDone$.next(null);
      return throwError(() => err);
    })
  );
}

function _handleUnauthorized(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService
): Observable<HttpEvent<unknown>> {
  return _doRefresh(auth).pipe(
    switchMap(newToken => next(_attachToken(req, newToken))),
    catchError(err => throwError(() => err))
  );
}
