// src/app/features/shop/product-list/product-list.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { ToastService } from '../../../core/services/toast.service';
import { Product, ProductPage, ProductFilterState } from '../../../core/models/ecommerce.models';
import { debounceTime, Subject } from 'rxjs';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="product-list-page">

      <!-- Top bar -->
      <div class="top-bar">
        <div class="breadcrumb">
          <a routerLink="/shop">Home</a>
          <span> / </span>
          <span>{{ activeCategory || 'All Products' }}</span>
        </div>
        <div class="top-controls">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input [(ngModel)]="filters.search" (ngModelChange)="onSearchChange($event)"
              placeholder="Search products..." class="search-input" />
          </div>
          <select [(ngModel)]="filters.sortBy" (ngModelChange)="applyFilters()" class="sort-select">
            <option value="">Sort: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="newest">Newest First</option>
          </select>
        </div>
      </div>

      <div class="main-layout">

        <!-- Filters Sidebar -->
        <aside class="filters-sidebar">
          <div class="filter-section">
            <h3 class="filter-title">Category</h3>
            <!-- FIX: categories is a signal, call categories() to get the array -->
            @for (cat of categories(); track cat) {
              <label class="filter-option">
                <input type="radio" [(ngModel)]="filters.category" [value]="cat" (change)="applyFilters()" />
                <span>{{ cat }}</span>
              </label>
            }
            <label class="filter-option">
              <input type="radio" [(ngModel)]="filters.category" value="" (change)="applyFilters()" />
              <span>All Categories</span>
            </label>
          </div>

          <div class="filter-section">
            <h3 class="filter-title">Price Range</h3>
            <div class="price-inputs">
              <input type="number" [(ngModel)]="filters.minPrice" placeholder="Min" class="price-input"
                (change)="applyFilters()" />
              <span class="to">to</span>
              <input type="number" [(ngModel)]="filters.maxPrice" placeholder="Max" class="price-input"
                (change)="applyFilters()" />
            </div>
          </div>

          <div class="filter-section">
            <h3 class="filter-title">Availability</h3>
            <label class="filter-option">
              <input type="checkbox" [(ngModel)]="inStockOnly" (change)="applyFilters()" />
              <span>In Stock Only</span>
            </label>
          </div>

          <button class="clear-filters" (click)="clearFilters()">✕ Clear Filters</button>
        </aside>

        <!-- Products area -->
        <div class="products-area">
          <div class="results-info">
            @if (!loading()) {
              <span>{{ page().total }} results</span>
            }
          </div>

          @if (loading()) {
            <div class="products-grid">
              @for (i of [1,2,3,4,5,6,7,8]; track i) {
                <div class="product-card skeleton">
                  <div class="skeleton-img"></div>
                  <div class="skeleton-line"></div>
                  <div class="skeleton-line short"></div>
                </div>
              }
            </div>
          } @else if (page().items.length === 0) {
            <div class="empty-state">
              <span class="empty-icon">🔍</span>
              <h3>No products found</h3>
              <p>Try adjusting your filters</p>
              <button (click)="clearFilters()">Clear Filters</button>
            </div>
          } @else {
            <div class="products-grid">
              @for (p of page().items; track p.id) {
                <div class="product-card" (click)="router.navigate(['/shop/product', p.id])">
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
                    @if (p.brand) { <p class="product-brand">{{ p.brand }}</p> }
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
                    @if (p.stock < 10 && p.stock > 0) {
                      <p class="low-stock">Only {{ p.stock }} left!</p>
                    }
                    <button class="btn-add-cart" (click)="addToCart($event, p)" [disabled]="p.stock === 0">
                      {{ p.stock === 0 ? 'Out of Stock' : '+ Add to Cart' }}
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Pagination -->
            @if (page().totalPages > 1) {
              <div class="pagination">
                <button [disabled]="filters.page === 1" (click)="goPage(filters.page - 1)">‹ Prev</button>
                @for (pg of pageNums(); track pg) {
                  <button [class.active]="pg === filters.page" (click)="goPage(pg)">{{ pg }}</button>
                }
                <button [disabled]="filters.page === page().totalPages" (click)="goPage(filters.page + 1)">Next ›</button>
              </div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .product-list-page { background: #f4f5f7; min-height: 100vh; padding: 16px 20px; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; background: #fff; padding: 12px 20px; border-radius: 10px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
    .breadcrumb { font-size: 13px; color: #6b7280; }
    .breadcrumb a { color: #f05537; text-decoration: none; }
    .top-controls { display: flex; gap: 12px; align-items: center; }
    .search-box { position: relative; }
    .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 13px; }
    .search-input { padding: 8px 12px 8px 32px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; width: 260px; background: #f9fafb; }
    .search-input:focus { outline: none; border-color: #f05537; background: #fff; }
    .sort-select { padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 13px; background: #fff; cursor: pointer; }
    .main-layout { display: flex; gap: 16px; }
    .filters-sidebar { width: 220px; flex-shrink: 0; background: #fff; border-radius: 10px; padding: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.06); align-self: flex-start; position: sticky; top: 16px; }
    .filter-section { margin-bottom: 20px; }
    .filter-title { font-size: 13px; font-weight: 700; color: #1f2937; margin: 0 0 10px; text-transform: uppercase; letter-spacing: .4px; }
    .filter-option { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #374151; cursor: pointer; margin-bottom: 6px; }
    .filter-option input { accent-color: #f05537; }
    .price-inputs { display: flex; align-items: center; gap: 8px; }
    .price-input { width: 80px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 12px; }
    .to { font-size: 12px; color: #9ca3af; }
    .clear-filters { width: 100%; padding: 8px; border: 1px solid #f05537; border-radius: 6px; color: #f05537; background: none; cursor: pointer; font-size: 13px; font-weight: 600; transition: all .15s; }
    .clear-filters:hover { background: #f05537; color: #fff; }
    .products-area { flex: 1; min-width: 0; }
    .results-info { font-size: 13px; color: #6b7280; margin-bottom: 12px; }
    .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px; }
    .product-card { background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.06); cursor: pointer; transition: box-shadow .2s, transform .15s; }
    .product-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.1); transform: translateY(-2px); }
    .product-img-wrap { position: relative; padding-top: 100%; background: #f9fafb; }
    .product-img-wrap img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; padding: 12px; }
    .discount-badge { position: absolute; top: 8px; left: 8px; background: #f05537; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; }
    .wishlist-btn { position: absolute; top: 8px; right: 8px; background: rgba(255,255,255,.9); border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 4px rgba(0,0,0,.15); }
    .product-info { padding: 12px; }
    .product-brand { font-size: 10px; color: #6b7280; margin: 0 0 2px; text-transform: uppercase; letter-spacing: .4px; }
    .product-name { font-size: 13px; color: #1f2937; margin: 0 0 6px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .price-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 4px; }
    .price { font-size: 15px; font-weight: 700; color: #f05537; }
    .original-price { font-size: 11px; color: #9ca3af; text-decoration: line-through; }
    .rating-row { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
    .stars { font-size: 11px; color: #f59e0b; }
    .review-count { font-size: 10px; color: #9ca3af; }
    .low-stock { font-size: 11px; color: #ef4444; margin: 0 0 6px; font-weight: 600; }
    .btn-add-cart { width: 100%; padding: 7px; border: none; border-radius: 6px; background: #f05537; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; transition: background .15s; }
    .btn-add-cart:hover:not(:disabled) { background: #d44a2d; }
    .btn-add-cart:disabled { background: #d1d5db; cursor: not-allowed; }
    .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 16px; }
    .empty-state h3 { font-size: 18px; color: #374151; margin: 0 0 8px; }
    .empty-state button { margin-top: 16px; padding: 10px 24px; background: #f05537; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .pagination { display: flex; justify-content: center; gap: 6px; margin-top: 24px; }
    .pagination button { padding: 7px 12px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; color: #374151; }
    .pagination button.active { background: #f05537; color: #fff; border-color: #f05537; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    .skeleton { pointer-events: none; }
    .skeleton-img { padding-top: 100%; background: #e5e7eb; }
    .skeleton-line { height: 12px; background: #e5e7eb; border-radius: 4px; margin: 8px 12px; }
    .skeleton-line.short { width: 60%; }
  `]
})
export class ProductListComponent implements OnInit {
  readonly router = inject(Router);
  private readonly _route = inject(ActivatedRoute);
  private readonly _productSvc = inject(ProductService);
  readonly cart = inject(CartService);
  readonly wishlist = inject(WishlistService);
  private readonly _toast = inject(ToastService);

  readonly loading = signal(true);
  readonly page = signal<ProductPage>({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  // FIX: categories is a WritableSignal<string[]> — accessed as categories() in template
  readonly categories = signal<string[]>([]);

  filters: ProductFilterState = { page: 1, pageSize: 20 };
  activeCategory = '';
  inStockOnly = false;

  private readonly _searchDebounce = new Subject<string>();

  ngOnInit() {
    this._searchDebounce.pipe(debounceTime(400)).subscribe(() => this.applyFilters());

    this._productSvc.getCategories().subscribe(cats => this.categories.set(cats));

    this._route.queryParams.subscribe(params => {
      if (params['category']) {
        this.filters.category = params['category'];
        this.activeCategory = params['category'];
      } else {
        this.filters.category = undefined;
        this.activeCategory = '';
      }
      if (params['sortBy']) this.filters.sortBy = params['sortBy'];
      if (params['search']) this.filters.search = params['search'];
      if (params['isFeatured']) this.filters.isFeatured = true;
      this.applyFilters();
    });
  }

  onSearchChange(val: string) {
    this._searchDebounce.next(val);
  }

  applyFilters() {
    this.loading.set(true);
    this.filters.page = 1;
    this._productSvc.getProducts(this.filters).subscribe({
      next: p => { this.page.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  clearFilters() {
    this.filters = { page: 1, pageSize: 20 };
    this.inStockOnly = false;
    this.activeCategory = '';
    this.applyFilters();
  }

  goPage(pg: number) {
    this.filters.page = pg;
    this.loading.set(true);
    this._productSvc.getProducts(this.filters).subscribe({
      next: p => { this.page.set(p); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  pageNums(): number[] {
    const total = this.page().totalPages;
    const cur = this.filters.page;
    const nums: number[] = [];
    for (let i = Math.max(1, cur - 2); i <= Math.min(total, cur + 2); i++) nums.push(i);
    return nums;
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
    this.wishlist.toggleWishlist(p.id, p.name, p.imageUrl, p.price).subscribe({
      error: () => this._toast.error('Could not update wishlist')
    });
  }

  starsFor(rating: number): string {
    const full = Math.floor(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }
}