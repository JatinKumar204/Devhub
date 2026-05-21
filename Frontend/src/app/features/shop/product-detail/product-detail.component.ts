// src/app/features/shop/product-detail/product-detail.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="detail-page">

      @if (loading()) {
        <div class="loading-skeleton">
          <div class="skel-img"></div>
          <div class="skel-body">
            <div class="skel-line wide"></div>
            <div class="skel-line medium"></div>
            <div class="skel-line short"></div>
          </div>
        </div>
      } @else if (!product()) {
        <div class="not-found">
          <span>😕</span>
          <h2>Product not found</h2>
          <a routerLink="/shop/products">Back to products</a>
        </div>
      } @else {
        <!-- Breadcrumb -->
        <nav class="breadcrumb">
          <a routerLink="/shop">Home</a>
          <span> / </span>
          <a routerLink="/shop/products" [queryParams]="{category: product()!.category}">
            {{ product()!.category }}
          </a>
          <span> / </span>
          <span>{{ product()!.name }}</span>
        </nav>

        <div class="product-layout">

          <!-- Images -->
          <div class="images-panel">
            <div class="main-image">
              <img [src]="activeImage() || 'assets/no-image.svg'" [alt]="product()!.name" />
              @if (product()!.discountPercent > 0) {
                <span class="big-badge">-{{ product()!.discountPercent }}%</span>
              }
            </div>
            @if ((product()!.images?.length ?? 0) > 1) {
              <div class="thumbnails">
                @for (img of product()!.images; track img.id) {
                  <img [src]="img.url" [alt]="img.altText" class="thumb"
                    [class.active]="activeImage() === img.url"
                    (click)="activeImage.set(img.url)" />
                }
              </div>
            }
          </div>

          <!-- Info panel -->
          <div class="info-panel">
            @if (product()!.brand) {
              <p class="brand">{{ product()!.brand }}</p>
            }
            <h1 class="product-name">{{ product()!.name }}</h1>

            <div class="rating-row">
              <span class="stars">{{ starsFor(product()!.rating) }}</span>
              <span class="rating-val">{{ product()!.rating | number:'1.1-1' }}</span>
              <span class="review-count">({{ product()!.reviewCount }} reviews)</span>
            </div>

            <div class="price-section">
              <span class="main-price">PKR {{ product()!.price | number:'1.0-0' }}</span>
              @if (product()!.originalPrice) {
                <span class="was-price">Was: PKR {{ product()!.originalPrice | number:'1.0-0' }}</span>
                <span class="you-save">
                  You save PKR {{ (product()!.originalPrice! - product()!.price) | number:'1.0-0' }}
                  ({{ product()!.discountPercent }}%)
                </span>
              }
            </div>

            <div class="stock-status">
              @if (product()!.stock === 0) {
                <span class="out-stock">✕ Out of Stock</span>
              } @else if (product()!.stock < 10) {
                <span class="low-stock">⚠ Only {{ product()!.stock }} left in stock</span>
              } @else {
                <span class="in-stock">✓ In Stock</span>
              }
            </div>

            @if (product()!.stock > 0) {
              <div class="qty-row">
                <label class="qty-label">Quantity</label>
                <div class="qty-control">
                  <button (click)="decreaseQty()">−</button>
                  <span>{{ quantity }}</span>
                  <button (click)="increaseQty()">+</button>
                </div>
              </div>
            }

            <div class="action-buttons">
              <button class="btn-cart" [disabled]="product()!.stock === 0" (click)="addToCart()">
                🛒 Add to Cart
              </button>
              <button class="btn-buy" [disabled]="product()!.stock === 0" (click)="buyNow()">
                ⚡ Buy Now
              </button>
              <button class="btn-wish" (click)="toggleWishlist()"
                [class.wishlisted]="wishlist.isWishlisted(product()!.id)">
                {{ wishlist.isWishlisted(product()!.id) ? '❤️' : '🤍' }}
              </button>
            </div>

            <!-- Details -->
            <div class="detail-section">
              <h3>Product Details</h3>
              <p class="description">{{ product()!.description }}</p>
              <table class="specs-table">
                <tr><td>SKU</td><td>{{ product()!.sku }}</td></tr>
                @if (product()!.brand) {
                  <tr><td>Brand</td><td>{{ product()!.brand }}</td></tr>
                }
                <tr><td>Category</td><td>{{ product()!.category }}</td></tr>
                @if (product()!.tags) {
                  <tr><td>Tags</td><td>{{ product()!.tags }}</td></tr>
                }
              </table>
            </div>
          </div>
        </div>

        <!-- Related Products -->
        @if (related().length > 0) {
          <section class="related-section">
            <h2>You might also like</h2>
            <div class="related-row">
              @for (p of related(); track p.id) {
                <div class="related-card" (click)="router.navigate(['/shop/product', p.id])">
                  <img [src]="p.imageUrl || 'assets/no-image.svg'" [alt]="p.name" />
                  <p class="related-name">{{ p.name }}</p>
                  <p class="related-price">PKR {{ p.price | number:'1.0-0' }}</p>
                </div>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .detail-page { background: #f4f5f7; min-height: 100vh; padding: 20px; }
    .breadcrumb { font-size: 13px; color: #6b7280; margin-bottom: 16px; }
    .breadcrumb a { color: #f05537; text-decoration: none; }
    .breadcrumb a:hover { text-decoration: underline; }
    .product-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; background: #fff; border-radius: 12px; padding: 28px; box-shadow: 0 1px 6px rgba(0,0,0,.06); margin-bottom: 24px; }
    .main-image { position: relative; background: #f9fafb; border-radius: 10px; overflow: hidden; aspect-ratio: 1; margin-bottom: 10px; }
    .main-image img { width: 100%; height: 100%; object-fit: contain; padding: 20px; }
    .big-badge { position: absolute; top: 12px; left: 12px; background: #f05537; color: #fff; font-size: 14px; font-weight: 700; padding: 4px 10px; border-radius: 6px; }
    .thumbnails { display: flex; gap: 8px; flex-wrap: wrap; }
    .thumb { width: 64px; height: 64px; object-fit: contain; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; padding: 4px; transition: border-color .15s; }
    .thumb.active { border-color: #f05537; }
    .brand { font-size: 13px; color: #f05537; font-weight: 600; margin: 0 0 6px; text-transform: uppercase; letter-spacing: .5px; }
    .product-name { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0 0 12px; line-height: 1.3; }
    .rating-row { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .stars { font-size: 16px; color: #f59e0b; }
    .rating-val { font-weight: 700; color: #1f2937; }
    .review-count { font-size: 13px; color: #9ca3af; }
    .price-section { margin-bottom: 16px; }
    .main-price { font-size: 28px; font-weight: 800; color: #f05537; display: block; }
    .was-price { font-size: 14px; color: #9ca3af; text-decoration: line-through; display: block; }
    .you-save { font-size: 13px; color: #16a34a; font-weight: 600; display: block; }
    .stock-status { margin-bottom: 16px; font-size: 14px; font-weight: 600; }
    .in-stock { color: #16a34a; } .low-stock { color: #d97706; } .out-stock { color: #dc2626; }
    .qty-row { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .qty-label { font-size: 14px; font-weight: 600; color: #374151; }
    .qty-control { display: flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
    .qty-control button { width: 36px; height: 36px; border: none; background: #f9fafb; font-size: 18px; cursor: pointer; color: #374151; transition: background .15s; }
    .qty-control button:hover { background: #f05537; color: #fff; }
    .qty-control span { min-width: 36px; text-align: center; font-size: 15px; font-weight: 600; padding: 0 8px; }
    .action-buttons { display: flex; gap: 10px; margin-bottom: 24px; }
    .btn-cart { flex: 1; padding: 13px; border: 2px solid #f05537; border-radius: 8px; background: #fff; color: #f05537; font-size: 15px; font-weight: 700; cursor: pointer; transition: all .15s; }
    .btn-cart:hover:not(:disabled) { background: #fff5f3; }
    .btn-buy { flex: 1; padding: 13px; border: none; border-radius: 8px; background: #f05537; color: #fff; font-size: 15px; font-weight: 700; cursor: pointer; transition: background .15s; }
    .btn-buy:hover:not(:disabled) { background: #d44a2d; }
    .btn-cart:disabled, .btn-buy:disabled { opacity: .5; cursor: not-allowed; }
    .btn-wish { width: 48px; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; font-size: 20px; cursor: pointer; transition: border-color .15s; }
    .btn-wish:hover { border-color: #f05537; }
    .detail-section h3 { font-size: 15px; font-weight: 700; color: #1f2937; margin: 0 0 10px; }
    .description { font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 14px; }
    .specs-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .specs-table td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; }
    .specs-table td:first-child { font-weight: 600; color: #374151; width: 100px; background: #f9fafb; }
    .specs-table td:last-child { color: #4b5563; }
    .related-section { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .related-section h2 { font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 16px; }
    .related-row { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 6px; }
    .related-card { flex-shrink: 0; width: 160px; cursor: pointer; text-align: center; padding: 12px; border-radius: 8px; border: 1px solid #f3f4f6; transition: box-shadow .2s; }
    .related-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.1); }
    .related-card img { width: 100%; aspect-ratio: 1; object-fit: contain; border-radius: 6px; background: #f9fafb; }
    .related-name { font-size: 12px; color: #374151; margin: 6px 0 3px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .related-price { font-size: 13px; font-weight: 700; color: #f05537; margin: 0; }
    .loading-skeleton { display: flex; gap: 32px; background: #fff; border-radius: 12px; padding: 28px; }
    .skel-img { width: 50%; aspect-ratio: 1; background: #e5e7eb; border-radius: 10px; }
    .skel-body { flex: 1; }
    .skel-line { height: 16px; background: #e5e7eb; border-radius: 4px; margin-bottom: 12px; }
    .skel-line.wide { width: 100%; } .skel-line.medium { width: 70%; } .skel-line.short { width: 40%; }
    .not-found { text-align: center; padding: 80px 20px; }
    .not-found span { font-size: 48px; display: block; margin-bottom: 16px; }
    .not-found a { color: #f05537; }
    @media (max-width: 768px) { .product-layout { grid-template-columns: 1fr; } }
  `]
})
export class ProductDetailComponent implements OnInit {
  readonly router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _productSvc = inject(ProductService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  private readonly _toast = inject(ToastService);

  readonly loading = signal(true);
  readonly product = signal<Product | null>(null);
  readonly related = signal<Product[]>([]);
  readonly activeImage = signal<string>('');
  quantity = 1;

  ngOnInit() {
    this._route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) { this.loading.set(false); return; }
      this._loadProduct(id);
    });
  }

  private _loadProduct(id: number) {
    this.loading.set(true);
    this._productSvc.getProduct(id).subscribe({
      next: p => {
        this.product.set(p);
        this.activeImage.set(p.imageUrl ?? p.images?.[0]?.url ?? '');
        this.loading.set(false);
        this._productSvc.getRelated(id).subscribe(rel => this.related.set(rel));
      },
      error: () => this.loading.set(false)
    });
  }

  increaseQty() { if (this.quantity < (this.product()?.stock ?? 1)) this.quantity++; }
  decreaseQty() { if (this.quantity > 1) this.quantity--; }

  addToCart() {
    const p = this.product()!;
    this.cart.addItem(p.id, p.name, p.imageUrl, this.quantity, p.price).subscribe({
      next: () => this._toast.success(`${p.name} added to cart!`),
      error: () => this._toast.error('Could not add to cart')
    });
  }

  buyNow() {
    const p = this.product()!;
    this.cart.addItem(p.id, p.name, p.imageUrl, this.quantity, p.price).subscribe({
      next: () => this.router.navigate(['/shop/cart']),
      error: () => this._toast.error('Could not add to cart')
    });
  }

  toggleWishlist() {
    const p = this.product()!;
    const wasWishlisted = this.wishlist.isWishlisted(p.id);
    this.wishlist.toggleWishlist(p.id, p.name, p.imageUrl, p.price).subscribe({
      next: () => this._toast.success(wasWishlisted ? 'Removed from wishlist' : 'Added to wishlist'),
      error: () => this._toast.error('Could not update wishlist')
    });
  }

  starsFor(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }
}