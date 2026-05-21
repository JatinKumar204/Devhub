// src/app/core/services/order.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Order, CheckoutPayload } from '../models/ecommerce.models';

export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly _http = inject(HttpClient);
  private readonly base = 'ms://orders/api/orders';

  getOrders(page = 1, pageSize = 20, status?: string, customerId?: number): Observable<Order[]> {
    let params = new HttpParams()
      .set('page', page)
      .set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    if (customerId) params = params.set('customerId', customerId);
    return this._http.get<Order[]>(this.base, { params });
  }

  getOrder(id: number): Observable<Order> {
    return this._http.get<Order>(`${this.base}/${id}`);
  }

  createOrder(payload: CheckoutPayload): Observable<Order> {
    return this._http.post<Order>(this.base, payload);
  }

  updateStatus(id: number, status: string): Observable<Order> {
    return this._http.patch<Order>(`${this.base}/${id}/status`, { status });
  }

  deleteOrder(id: number): Observable<void> {
    return this._http.delete<void>(`${this.base}/${id}`);
  }
}
