// src/app/core/services/seller-verification.service.ts
// New service — handles all seller verification API calls.
// Used by:
//   - SellerVerificationComponent  (seller-facing status + re-submission)
//   - AdminVerificationQueueComponent (admin review panel)

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  SellerVerificationStatus,
  VerificationQueuePage,
  VerificationQueueItem,
  AdminReviewPayload,
  SellerProfileForm,
  VerificationStatus
} from '../models/ecommerce.models';

@Injectable({ providedIn: 'root' })
export class SellerVerificationService {
  private readonly _http = inject(HttpClient);
  private readonly BASE  = 'ms://users/api/seller-verification';

  // ── Seller-facing ─────────────────────────────────────────────────────────

  /** Get own verification status, documents, and history */
  getMyStatus(): Observable<SellerVerificationStatus> {
    return this._http.get<SellerVerificationStatus>(`${this.BASE}/my-status`);
  }

  /** Re-submit after rejection / info request */
  resubmit(dto: Partial<SellerProfileForm>): Observable<{ message: string; status: string }> {
    return this._http.put<{ message: string; status: string }>(`${this.BASE}/resubmit`, dto);
  }

  /** Upload a verification document */
  uploadDocument(file: File, documentType: string): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    return this._http.post(`${this.BASE}/documents`, form);
  }

  // ── Admin-facing ──────────────────────────────────────────────────────────

  /** Get the review queue — pending, resubmitted, or filtered by status */
  getQueue(
    page = 1,
    pageSize = 20,
    status?: VerificationStatus
  ): Observable<VerificationQueuePage> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    return this._http.get<VerificationQueuePage>(`${this.BASE}/queue`, { params });
  }

  /** Get full detail for one verification (all docs + full history) */
  getById(verificationId: number): Observable<VerificationQueueItem> {
    return this._http.get<VerificationQueueItem>(`${this.BASE}/${verificationId}`);
  }

  /** Admin approves, rejects, or requests more information */
  review(verificationId: number, payload: AdminReviewPayload): Observable<any> {
    return this._http.put(`${this.BASE}/${verificationId}/review`, payload);
  }
}
