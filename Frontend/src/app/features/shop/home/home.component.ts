// src/app/features/shop/home/home.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="shop-home">

      <!-- Hero Banner -->
      <section class="hero-banner">
        <div class="hero-content">
          <h1>Shop the Best Deals</h1>
          <p>Millions of products. Unbeatable prices. Fast delivery.</p>
          <button class="btn-shop" (click)="router.navigate(['/shop/products'])">
            Shop Now →
          </button>
        </div>
      </section>

      <!-- Category Pills -->
      <section class="category-pills">
        <div class="pills-scroll">
          @for (cat of categories; track cat.slug) {
            <button class="pill" (click)="browseCat(cat.slug)">
              <span class="pill-icon">{{ cat.icon }}</span>
              <span>{{ cat.label }}</span>
            </button>
          }
        </div>
      </section>

      <!-- Flash Sale Row -->
      <section class="flash-sale">
        <div class="flash-header">
          <span class="flash-tag">⚡ Flash Sale</span>
          <span class="flash-title">Today's Best Deals</span>
          <a routerLink="/shop/products" [queryParams]="{sortBy:'price_asc'}" class="see-all">See All →</a>
        </div>
        <div class="products-row">
          @for (p of flashProducts(); track p.id) {
            <div class="product-card" (click)="viewProduct(p.id)">
              <div class="product-img-wrap">
                <img [src]="p.imageUrl || 'assets/no-image.svg'" [alt]="p.name" loading="lazy" />
                @if (p.discountPercent > 0) {
                  <span class="discount-badge">-{{ p.discountPercent }}%</span>
                }
                <button class="wishlist-btn" (click)="toggleWishlist($event, p)"
                  [class.wishlisted]="wishlist.isWishlisted(p.id)">
                  {{ wishlist.isWishlisted(p.id) ? '❤️' : '🤍' }}
                </button>
              </div>
              <div class="product-info">
                <p class="product-name">{{ p.name }}</p>
                <div class="price-row">
                  <span class="price">PKR {{ p.price | number:'1.0-0' }}</span>
                  @if (p.originalPrice) {
                    <span class="original-price">{{ p.originalPrice | number:'1.0-0' }}</span>
                  }
                </div>
                <div class="rating-row">
                  <span class="stars">{{ starsFor(p.rating) }}</span>
                  <span class="review-count">({{ p.reviewCount }})</span>
                </div>
                <button class="btn-add-cart"
                  (click)="addToCart($event, p)"
                  [disabled]="p.stock === 0">
                  {{ p.stock === 0 ? 'Out of Stock' : '+ Add to Cart' }}
                </button>
              </div>
            </div>
          }
          @if (loadingFeatured()) {
            @for (i of [1,2,3,4]; track i) {
              <div class="product-card skeleton">
                <div class="skeleton-img"></div>
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
              </div>
            }
          }
        </div>
      </section>

      <!-- Featured Products Grid -->
      <section class="featured-section">
        <div class="section-header">
          <h2>Featured Products</h2>
          <a routerLink="/shop/products" [queryParams]="{isFeatured:true}" class="see-all">See All</a>
        </div>
        <div class="products-grid">
          @for (p of featuredProducts(); track p.id) {
            <div class="product-card" (click)="viewProduct(p.id)">
              <div class="product-img-wrap">
                <img [src]="p.imageUrl || 'assets/no-image.svg'" [alt]="p.name" loading="lazy" />
                @if (p.discountPercent > 0) {
                  <span class="discount-badge">-{{ p.discountPercent }}%</span>
                }
                <button class="wishlist-btn" (click)="toggleWishlist($event, p)"
                  [class.wishlisted]="wishlist.isWishlisted(p.id)">
                  {{ wishlist.isWishlisted(p.id) ? '❤️' : '🤍' }}
                </button>
              </div>
              <div class="product-info">
                @if (p.brand) {
                  <p class="product-brand">{{ p.brand }}</p>
                }
                <p class="product-name">{{ p.name }}</p>
                <div class="price-row">
                  <span class="price">PKR {{ p.price | number:'1.0-0' }}</span>
                  @if (p.originalPrice) {
                    <span class="original-price">{{ p.originalPrice | number:'1.0-0' }}</span>
                  }
                </div>
                <div class="rating-row">
                  <span class="stars">{{ starsFor(p.rating) }}</span>
                  <span class="review-count">({{ p.reviewCount }})</span>
                </div>
                <button class="btn-add-cart" (click)="addToCart($event, p)" [disabled]="p.stock === 0">
                  {{ p.stock === 0 ? 'Out of Stock' : '+ Add to Cart' }}
                </button>
              </div>
            </div>
          }
        </div>
      </section>

    </div>
  `,
  styles: [`
    .shop-home { background: #f4f5f7; min-height: 100vh; }
    .hero-banner { background: linear-gradient(135deg, #f05537 0%, #f77f3a 100%); padding: 60px 40px; }
    .hero-content { max-width: 600px; }
    .hero-content h1 { font-size: 38px; font-weight: 800; color: #fff; margin: 0 0 12px; }
    .hero-content p { font-size: 16px; color: rgba(255,255,255,.85); margin: 0 0 24px; }
    .btn-shop { background: #fff; color: #f05537; font-weight: 700; font-size: 15px; border: none; border-radius: 24px; padding: 12px 28px; cursor: pointer; transition: transform .15s; }
    .btn-shop:hover { transform: scale(1.04); }
    .category-pills { background: #fff; padding: 16px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .pills-scroll { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; }
    .pills-scroll::-webkit-scrollbar { display: none; }
    .pill { display: flex; align-items: center; gap: 7px; flex-shrink: 0; background: #f4f5f7; border: 1px solid #e5e7eb; border-radius: 20px; padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 500; color: #374151; transition: all .15s; white-space: nowrap; }
    .pill:hover { background: #f05537; color: #fff; border-color: #f05537; }
    .pill-icon { font-size: 16px; }
    .flash-sale, .featured-section { max-width: 1400px; margin: 24px auto; padding: 0 20px; }
    .flash-header, .section-header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
    .flash-tag { background: #f05537; color: #fff; font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 4px; }
    .flash-title, .section-header h2 { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; flex: 1; }
    .see-all { font-size: 13px; color: #f05537; text-decoration: none; font-weight: 600; }
    .see-all:hover { text-decoration: underline; }
    .products-row { display: flex; gap: 14px; overflow-x: auto; padding-bottom: 8px; scrollbar-width: none; }
    .products-row::-webkit-scrollbar { display: none; }
    .products-row .product-card { flex-shrink: 0; width: 200px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .product-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); cursor: pointer; transition: box-shadow .2s, transform .15s; }
    .product-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
    .product-img-wrap { position: relative; padding-top: 100%; background: #f9fafb; }
    .product-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 12px; }
    .discount-badge { position: absolute; top: 8px; left: 8px; background: #f05537; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .wishlist-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,.9); border: none; border-radius: 50%; width: 30px; height: 30px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,.15); transition: transform .15s; }
    .wishlist-btn:hover { transform: scale(1.15); }
    .product-info { padding: 12px; }
    .product-brand { font-size: 11px; color: #6b7280; margin: 0 0 3px; text-transform: uppercase; letter-spacing: .4px; }
    .product-name { font-size: 13px; color: #1f2937; margin: 0 0 8px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
    .price { font-size: 15px; font-weight: 700; color: #f05537; }
    .original-price { font-size: 12px; color: #9ca3af; text-decoration: line-through; }
    .rating-row { display: flex; align-items: center; gap: 4px; margin-bottom: 10px; }
    .stars { font-size: 12px; color: #f59e0b; }
    .review-count { font-size: 11px; color: #9ca3af; }
    .btn-add-cart { width: 100%; padding: 8px; border: none; border-radius: 6px; background: #f05537; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-add-cart:hover:not(:disabled) { background: #d44a2d; }
    .btn-add-cart:disabled { background: #d1d5db; cursor: not-allowed; }
    .skeleton { pointer-events: none; }
    .skeleton-img { width: 100%; padding-top: 100%; background: #e5e7eb; border-radius: 8px; }
    .skeleton-line { height: 12px; background: #e5e7eb; border-radius: 4px; margin: 8px 12px; }
    .skeleton-line.short { width: 60%; }
  `]
})
export class HomeComponent implements OnInit {
  readonly router = inject(Router);
  private readonly _productSvc = inject(ProductService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  private readonly _toast = inject(ToastService);

  readonly featuredProducts = signal<Product[]>([]);
  readonly flashProducts    = signal<Product[]>([]);
  readonly loadingFeatured  = signal(true);

  readonly categories = [
    { slug: 'electronics',    label: 'Electronics',    icon: '📱' },
    { slug: 'fashion',        label: 'Fashion',        icon: '👗' },
    { slug: 'home-kitchen',   label: 'Home & Kitchen', icon: '🏠' },
    { slug: 'sports-outdoors',label: 'Sports',         icon: '🏃' },
    { slug: 'books',          label: 'Books',          icon: '📚' },
    { slug: 'beauty',         label: 'Beauty',         icon: '💄' },
    { slug: 'toys-games',     label: 'Toys',           icon: '🎮' },
    { slug: 'automotive',     label: 'Automotive',     icon: '🚗' },
  ];

  ngOnInit() {
    this._productSvc.getFeatured(12).subscribe({
      next: products => {
        this.flashProducts.set(products.slice(0, 6));
        this.featuredProducts.set(products.slice(6));
        this.loadingFeatured.set(false);
      },
      error: () => this.loadingFeatured.set(false)
    });

    this.cart.loadCart().subscribe();
    this.wishlist.loadWishlist().subscribe();
  }

  browseCat(slug: string) {
    this.router.navigate(['/shop/products'], { queryParams: { category: slug } });
  }

  viewProduct(id: number) {
    this.router.navigate(['/shop/product', id]);
  }

  addToCart(event: Event, p: Product) {
    event.stopPropagation();
    this.cart.addItem(p.id, p.name, p.imageUrl, 1, p.price).subscribe({
      next: () => this._toast.success(`${p.name} added to cart!`),
      error: () => this._toast.error('Could not add to cart')
    });
  }

  toggleWishlist(event: Event, p: Product) {
    event.stopPropagation();
    // Capture current state BEFORE the toggle so the message is accurate
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