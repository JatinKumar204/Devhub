import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, timeout, catchError, map } from 'rxjs';
import { ServiceStatus } from '../models/service-config.model';

@Injectable({ providedIn: 'root' })
export class HealthCheckService {
  private readonly _http = inject(HttpClient);

  check(serviceId: string, baseUrl: string): Observable<ServiceStatus> {
    const started = Date.now();
    return this._http.get(`${baseUrl}/api/health`, { observe: 'response' }).pipe(
      timeout(4000),
      map(res => ({
        serviceId,
        isReachable: res.status >= 200 && res.status < 300,
        responseTimeMs: Date.now() - started,
        lastChecked: new Date()
      })),
      catchError(err => of({
        serviceId,
        isReachable: false,
        lastChecked: new Date(),
        error: err?.message ?? 'Unreachable'
      }))
    );
  }
}
