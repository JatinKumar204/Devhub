// src/app/core/services/analytics.service.ts
// NEW FILE

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RevenueData {
  period:        string;
  totalRevenue:  number;
  totalOrders:   number;
  daily:         { date: string; revenue: number; orders: number }[];
  weekly:        { week: number; revenue: number; orders: number }[];
}

export interface OrderStats {
  totalOrders:    number;
  byStatus:       Record<string, number>;
  avgOrderValue:  number;
  completionRate: number;
  monthlyTrend:   { month: string; orders: number; revenue: number }[];
}

export interface TopProduct {
  productId:   number;
  productName: string;
  unitsSold:   number;
  revenue:     number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly _http = inject(HttpClient);
  private readonly BASE  = 'ms://orders/api/analytics';

  getRevenue(days = 30, sellerId?: number): Observable<RevenueData> {
    let p = new HttpParams().set('days', days);
    if (sellerId) p = p.set('sellerId', sellerId);
    return this._http.get<RevenueData>(`${this.BASE}/revenue`, { params: p });
  }

  getOrderStats(sellerId?: number): Observable<OrderStats> {
    let p = new HttpParams();
    if (sellerId) p = p.set('sellerId', sellerId);
    return this._http.get<OrderStats>(`${this.BASE}/orders`, { params: p });
  }

  getTopProducts(count = 10, sellerId?: number): Observable<{ count: number; products: TopProduct[] }> {
    let p = new HttpParams().set('count', count);
    if (sellerId) p = p.set('sellerId', sellerId);
    return this._http.get<any>(`${this.BASE}/top-products`, { params: p });
  }
}
