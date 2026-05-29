// src/app/core/services/order.service.ts
// CHANGES: added getOrderDetail(), getSellerShipments(), updateShipmentStatus()
// All existing methods (getOrders, createOrder, updateStatus, deleteOrder) UNCHANGED

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Order,
  OrderDetail,
  SellerShipmentPage,
  UpdateShipmentStatusPayload,
  CheckoutPayload
} from '../models/ecommerce.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly _http = inject(HttpClient);
  private readonly BASE  = 'ms://orders/api/orders';

  // ── Existing methods (UNCHANGED) ──────────────────────────────────────────

  getOrders(params: {
    page?: number;
    pageSize?: number;
    status?: string;
    customerId?: number;
    sellerId?: number;
  } = {}): Observable<{ items: Order[]; total: number; page: number; pageSize: number; totalPages: number }> {
    let p = new HttpParams();
    if (params.page)       p = p.set('page',       params.page);
    if (params.pageSize)   p = p.set('pageSize',   params.pageSize);
    if (params.status)     p = p.set('status',     params.status);
    if (params.customerId) p = p.set('customerId', params.customerId);
    if (params.sellerId)   p = p.set('sellerId',   params.sellerId);
    return this._http.get<any>(this.BASE, { params: p });
  }

  createOrder(payload: CheckoutPayload): Observable<Order> {
    return this._http.post<Order>(this.BASE, payload);
  }

  updateStatus(id: number, status: string): Observable<Order> {
    return this._http.patch<Order>(`${this.BASE}/${id}/status`, { status });
  }

  deleteOrder(id: number): Observable<void> {
    return this._http.delete<void>(`${this.BASE}/${id}`);
  }

  // ── NEW: order detail with shipment groups ────────────────────────────────

  getOrderDetail(id: number): Observable<OrderDetail> {
    return this._http.get<OrderDetail>(`${this.BASE}/${id}`);
  }

  // ── NEW: seller shipment management ──────────────────────────────────────

  getSellerShipments(params: {
    page?: number;
    pageSize?: number;
    status?: string;
  } = {}): Observable<SellerShipmentPage> {
    let p = new HttpParams();
    if (params.page)     p = p.set('page',     params.page ?? 1);
    if (params.pageSize) p = p.set('pageSize', params.pageSize ?? 20);
    if (params.status)   p = p.set('status',   params.status);
    return this._http.get<SellerShipmentPage>(`${this.BASE}/shipments`, { params: p });
  }

  updateShipmentStatus(
    shipmentId: number,
    payload: UpdateShipmentStatusPayload
  ): Observable<any> {
    return this._http.patch(`${this.BASE}/shipments/${shipmentId}/status`, payload);
  }
}
