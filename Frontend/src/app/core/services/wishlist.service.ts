// src/app/core/services/wishlist.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, of } from 'rxjs';
import { WishlistItem } from '../models/ecommerce.models';

@Injectable({ providedIn: 'root' })
export class WishlistService {
  private readonly _http = inject(HttpClient);
  private readonly base = 'ms://wishlist/api/wishlist';

  private readonly _items = signal<WishlistItem[]>([]);

  readonly items = this._items.asReadonly();

  isWishlisted(productId: number): boolean {
    return this._items().some(i => i.productId === productId);
  }

  loadWishlist(): Observable<WishlistItem[]> {
    return this._http.get<WishlistItem[]>(this.base).pipe(
      tap(items => this._items.set(items))
    );
  }

  /**
   * Always returns Observable<void> — fixes the TS2349 union-type incompatibility
   * that occurred when one branch returned Observable<void> and the other Observable<WishlistItem>.
   */
  toggleWishlist(
    productId: number,
    productName: string,
    productImage: string | undefined,
    productPrice: number
  ): Observable<void> {
    if (this.isWishlisted(productId)) {
      return this._http.delete<void>(`${this.base}/${productId}`).pipe(
        tap(() => this._items.update(items => items.filter(i => i.productId !== productId)))
      );
    }
    return this._http
      .post<WishlistItem>(this.base, { productId, productName, productImage, productPrice })
      .pipe(
        tap(item => this._items.update(items => [item, ...items])),
        map(() => void 0)
      );
  }

  removeItem(productId: number): Observable<void> {
    return this._http.delete<void>(`${this.base}/${productId}`).pipe(
      tap(() => this._items.update(items => items.filter(i => i.productId !== productId)))
    );
  }
}