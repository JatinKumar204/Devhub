// src/app/core/services/review.service.ts
// NEW FILE

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ReviewItem {
  id:              number;
  productId:       number;
  buyerId:         number;
  buyerName:       string;
  rating:          number;
  title:           string;
  body:            string;
  isVerifiedBuyer: boolean;
  sellerReply?:    string;
  sellerRepliedAt?: string;
  createdDate:     string;
  updatedDate?:    string;
}

export interface ReviewPage {
  items:      ReviewItem[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface RatingStats {
  averageRating:  number;
  totalReviews:   number;
  distribution:   Record<number, number>;  // { 5: 40, 4: 30, ... }
}

export interface CreateReviewPayload {
  rating:   number;
  title:    string;
  body:     string;
  orderId?: number;
}

export interface UpdateReviewPayload {
  rating?: number;
  title?:  string;
  body?:   string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly _http = inject(HttpClient);

  // ── Public ─────────────────────────────────────────────────────────────

  getReviews(productId: number, page = 1, pageSize = 10): Observable<ReviewPage> {
    const params = new HttpParams()
      .set('page',     page)
      .set('pageSize', pageSize);
    return this._http.get<ReviewPage>(
      `ms://products/api/products/${productId}/reviews`, { params });
  }

  getRatingStats(productId: number): Observable<RatingStats> {
    return this._http.get<RatingStats>(
      `ms://products/api/products/${productId}/reviews/stats`);
  }

  // ── Buyer ──────────────────────────────────────────────────────────────

  createReview(productId: number, payload: CreateReviewPayload): Observable<any> {
    return this._http.post(
      `ms://products/api/products/${productId}/reviews`, payload);
  }

  updateReview(
    productId: number, reviewId: number, payload: UpdateReviewPayload
  ): Observable<any> {
    return this._http.put(
      `ms://products/api/products/${productId}/reviews/${reviewId}`, payload);
  }

  deleteReview(productId: number, reviewId: number): Observable<void> {
    return this._http.delete<void>(
      `ms://products/api/products/${productId}/reviews/${reviewId}`);
  }

  // ── Seller ─────────────────────────────────────────────────────────────

  getSellerReviews(page = 1, pageSize = 20, pendingReplyOnly = false): Observable<ReviewPage> {
    const params = new HttpParams()
      .set('page',             page)
      .set('pageSize',         pageSize)
      .set('pendingReplyOnly', pendingReplyOnly);
    return this._http.get<ReviewPage>('ms://products/api/seller/reviews', { params });
  }

  replyToReview(productId: number, reviewId: number, reply: string): Observable<any> {
    return this._http.post(
      `ms://products/api/products/${productId}/reviews/${reviewId}/reply`,
      { reply });
  }

  // ── Admin ──────────────────────────────────────────────────────────────

  moderateReview(
    productId: number, reviewId: number,
    isVisible: boolean, note?: string
  ): Observable<any> {
    return this._http.put(
      `ms://products/api/products/${productId}/reviews/${reviewId}/moderate`,
      { isVisible, note });
  }
}
