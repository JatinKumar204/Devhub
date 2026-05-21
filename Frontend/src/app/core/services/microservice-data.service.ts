import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class MicroserviceDataService {
  private readonly _http = inject(HttpClient);

  get<T>(url: string): Observable<T> {
    return this._http.get<T>(url);
  }

  post<T>(url: string, body: unknown): Observable<T> {
    return this._http.post<T>(url, body);
  }

  put<T>(url: string, body: unknown): Observable<T> {
    return this._http.put<T>(url, body);
  }

  delete<T>(url: string): Observable<T> {
    return this._http.delete<T>(url);
  }
}
