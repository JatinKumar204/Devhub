// src/app/core/services/cart.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { Cart, CartItem } from '../models/ecommerce.models';

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly _http = inject(HttpClient);
  private readonly base = 'ms://cart/api/cart';

  private readonly _cart = signal<Cart | null>(null);

  readonly cart = this._cart.asReadonly();
  readonly itemCount = computed(() => this._cart()?.totalItems ?? 0);
  readonly subTotal  = computed(() => this._cart()?.subTotal ?? 0);

  loadCart() {
    return this._http.get<Cart>(this.base).pipe(
      tap(cart => this._cart.set(cart))
    );
  }

  addItem(productId: number, productName: string, productImage: string | undefined, quantity: number, unitPrice: number) {
    return this._http.post<Cart>(`${this.base}/items`, {
      productId, productName, productImage, quantity, unitPrice
    }).pipe(tap(cart => this._cart.set(cart)));
  }

  updateQuantity(productId: number, quantity: number) {
    return this._http.put<Cart>(`${this.base}/items/${productId}`, { quantity }).pipe(
      tap(cart => this._cart.set(cart))
    );
  }

  removeItem(productId: number) {
    return this._http.delete<Cart>(`${this.base}/items/${productId}`).pipe(
      tap(cart => this._cart.set(cart))
    );
  }

  clearCart() {
    return this._http.delete<void>(this.base).pipe(
      tap(() => this._cart.set(null))
    );
  }
}
