// src/app/features/shop/wishlist/wishlist.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WishlistService } from '../../../core/services/wishlist.service';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { WishlistItem } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-wishlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="wishlist-page">
      <div class="page-header">
        <h1>My Wishlist</h1>
        <span class="count">{{ wishlist.items().length }} items</span>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading wishlist...</div>
      } @else if (wishlist.items().length === 0) {
        <div class="empty-state">
          <span class="empty-icon">🤍</span>
          <h2>Your wishlist is empty</h2>
          <p>Save items you love for later</p>
          <a routerLink="/shop/products" class="btn-shop">Start Shopping</a>
        </div>
      } @else {
        <div class="wishlist-grid">
          @for (item of wishlist.items(); track item.id) {
            <div class="wish-card">
              <button class="remove-btn" (click)="remove(item)" title="Remove from wishlist">✕</button>
              <div class="wish-img" (click)="goToProduct(item.productId)">
                <img [src]="item.productImage || 'assets/no-image.svg'" [alt]="item.productName" />
              </div>
              <div class="wish-info">
                <p class="wish-name" (click)="goToProduct(item.productId)">{{ item.productName }}</p>
                <p class="wish-price">PKR {{ item.productPrice | number:'1.0-0' }}</p>
                <p class="wish-date">Added {{ item.addedDate | date:'mediumDate' }}</p>
                <button class="btn-add-cart" (click)="addToCart(item)">
                  🛒 Add to Cart
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .wishlist-page { background: #f4f5f7; min-height: 100vh; padding: 20px; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .page-header h1 { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0; }
    .count { font-size: 13px; color: #6b7280; background: #e5e7eb; padding: 3px 10px; border-radius: 12px; }

    .loading-state { text-align: center; padding: 60px; color: #6b7280; }
    .empty-state { text-align: center; padding: 80px 20px; background: #fff; border-radius: 12px; }
    .empty-icon { font-size: 56px; display: block; margin-bottom: 16px; }
    .empty-state h2 { font-size: 20px; color: #1f2937; margin: 0 0 8px; }
    .empty-state p { color: #6b7280; margin-bottom: 20px; }
    .btn-shop {
      display: inline-block; padding: 11px 24px; background: #f05537;
      color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700;
    }

    .wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }

    .wish-card {
      background: #fff; border-radius: 12px; overflow: hidden; position: relative;
      box-shadow: 0 1px 6px rgba(0,0,0,.06); transition: box-shadow .2s;
    }
    .wish-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); }

    .remove-btn {
      position: absolute; top: 10px; right: 10px; z-index: 2;
      background: rgba(255,255,255,.9); border: none; border-radius: 50%;
      width: 28px; height: 28px; font-size: 13px; cursor: pointer; color: #6b7280;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 1px 4px rgba(0,0,0,.15); transition: color .15s;
    }
    .remove-btn:hover { color: #dc2626; }

    .wish-img { height: 200px; background: #f9fafb; cursor: pointer; }
    .wish-img img { width: 100%; height: 100%; object-fit: contain; padding: 16px; }

    .wish-info { padding: 14px; }
    .wish-name {
      font-size: 14px; font-weight: 500; color: #1f2937; margin: 0 0 8px; cursor: pointer;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .wish-name:hover { color: #f05537; }
    .wish-price { font-size: 16px; font-weight: 700; color: #f05537; margin: 0 0 4px; }
    .wish-date { font-size: 12px; color: #9ca3af; margin: 0 0 12px; }
    .btn-add-cart {
      width: 100%; padding: 9px; border: none; border-radius: 7px;
      background: #f05537; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-add-cart:hover { background: #d44a2d; }
  `]
})
export class WishlistComponent implements OnInit {
  readonly wishlist = inject(WishlistService);
  private readonly _cart = inject(CartService);
  private readonly _toast = inject(ToastService);

  readonly loading = signal(true);

  ngOnInit() {
    this.wishlist.loadWishlist().subscribe({ next: () => this.loading.set(false), error: () => this.loading.set(false) });
  }

  goToProduct(id: number) {
    window.location.href = `/shop/product/${id}`;
  }

  remove(item: WishlistItem) {
    this.wishlist.removeItem(item.productId).subscribe({
      next: () => this._toast.info('Removed from wishlist'),
      error: () => this._toast.error('Could not remove item')
    });
  }

  addToCart(item: WishlistItem) {
    this._cart.addItem(item.productId, item.productName, item.productImage, 1, item.productPrice).subscribe({
      next: () => this._toast.success(`${item.productName} added to cart!`),
      error: () => this._toast.error('Could not add to cart')
    });
  }
}
