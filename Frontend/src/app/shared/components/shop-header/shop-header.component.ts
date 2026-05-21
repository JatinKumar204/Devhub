// src/app/shared/components/shop-header/shop-header.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { CartService } from '../../../core/services/cart.service';
import { WishlistService } from '../../../core/services/wishlist.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-shop-header',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  template: `
    <header class="shop-header">
      <!-- Top bar -->
      <div class="top-bar">
        <span>Free delivery on orders over PKR 2,000 🚚</span>
        <span>Pakistan's trusted eCommerce platform</span>
      </div>

      <!-- Main header -->
      <div class="main-header">
        <a routerLink="/shop" class="logo">
          <span class="logo-d">Dev</span><span class="logo-hub">Hub</span>
          <span class="logo-tag">Store</span>
        </a>

        <div class="search-bar">
          <select class="search-category" [(ngModel)]="searchCategory">
            <option value="">All</option>
            @for (cat of categories; track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <input class="search-input" [(ngModel)]="searchQuery"
            placeholder="Search products, brands and more..."
            (keydown.enter)="doSearch()" />
          <button class="search-btn" (click)="doSearch()">🔍</button>
        </div>

        <div class="header-actions">
          @if (auth.isAuthenticated()) {
            <div class="action-item" (click)="toggleUserMenu()" style="position:relative;">
              <span class="action-icon">👤</span>
              <span class="action-label">{{ auth.currentUser()?.userName }}</span>

              <!-- FIXED: role-aware dropdown — shows different links for Admin, Seller, Buyer -->
              @if (showUserMenu()) {
                <div class="dropdown-menu">

                  <!-- Buyer-specific links -->
                  @if (!auth.isAdmin() && !auth.isSeller()) {
                    <a routerLink="/shop/orders" (click)="showUserMenu.set(false)">📦 My Orders</a>
                    <a routerLink="/shop/wishlist" (click)="showUserMenu.set(false)">🤍 Wishlist</a>
                    <a routerLink="/shop/cart" (click)="showUserMenu.set(false)">🛒 Cart</a>
                  }

                  <!-- Seller-specific links -->
                  @if (auth.isSeller()) {
                    <div class="dropdown-label">Seller Tools</div>
                    <a routerLink="/dashboard" (click)="showUserMenu.set(false)">📊 Seller Dashboard</a>
                    <a routerLink="/products" (click)="showUserMenu.set(false)">📦 My Products</a>
                    <div class="dropdown-divider"></div>
                    <a routerLink="/shop" (click)="showUserMenu.set(false)">🛍️ Visit Shop</a>
                  }

                  <!-- Admin-specific links -->
                  @if (auth.isAdmin()) {
                    <div class="dropdown-label">Admin Panel</div>
                    <a routerLink="/dashboard" (click)="showUserMenu.set(false)">📊 Dashboard</a>
                    <a routerLink="/products" (click)="showUserMenu.set(false)">📦 Products</a>
                    <a routerLink="/orders" (click)="showUserMenu.set(false)">🧾 Orders</a>
                    <a routerLink="/users" (click)="showUserMenu.set(false)">👥 Users</a>
                  }

                  <div class="dropdown-divider"></div>
                  <a routerLink="/profile" (click)="showUserMenu.set(false)">⚙️ Profile</a>
                  <button (click)="logout()">🚪 Sign Out</button>
                </div>
              }
            </div>
          } @else {
            <a routerLink="/login" class="action-item">
              <span class="action-icon">👤</span>
              <span class="action-label">Sign In</span>
            </a>
          }

          <!-- Wishlist & Cart only meaningful for Buyers (also visible when not logged in) -->
          @if (!auth.isSeller() && !auth.isAdmin()) {
            <a routerLink="/shop/wishlist" class="action-item">
              <span class="action-icon">🤍</span>
              <span class="action-label">Wishlist</span>
              @if (wishlist.items().length > 0) {
                <span class="badge">{{ wishlist.items().length }}</span>
              }
            </a>

            <a routerLink="/shop/cart" class="action-item cart-action">
              <span class="action-icon">🛒</span>
              <span class="action-label">Cart</span>
              @if (cart.itemCount() > 0) {
                <span class="badge cart-badge">{{ cart.itemCount() }}</span>
              }
            </a>
          }

          <!-- Seller: quick link to add a product -->
          @if (auth.isSeller()) {
            <a routerLink="/products" class="action-item seller-btn">
              <span class="action-icon">➕</span>
              <span class="action-label">Add Product</span>
            </a>
          }
        </div>
      </div>

      <!-- Category nav -->
      <nav class="category-nav">
        <a routerLink="/shop/products" class="nav-link"
          routerLinkActive="active" [routerLinkActiveOptions]="{exact: false}"
          [class.active]="activeCategorySlug === ''">All</a>
        @for (cat of navCategories; track cat.slug) {
          <a class="nav-link"
            [routerLink]="['/shop/products']"
            [queryParams]="{category: cat.slug}"
            [class.active]="activeCategorySlug === cat.slug">
            {{ cat.label }}
          </a>
        }
      </nav>
    </header>

    @if (showUserMenu()) {
      <div class="overlay" (click)="showUserMenu.set(false)"></div>
    }
  `,
  styles: [`
    .shop-header { background: #f05537; position: sticky; top: 0; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,.15); }
    .top-bar { background: #d44a2d; padding: 5px 20px; display: flex; justify-content: space-between; font-size: 11px; color: rgba(255,255,255,.85); }
    .main-header { display: flex; align-items: center; gap: 20px; padding: 12px 20px; }
    .logo { text-decoration: none; display: flex; align-items: baseline; gap: 2px; flex-shrink: 0; }
    .logo-d   { font-size: 22px; font-weight: 900; color: #fff; }
    .logo-hub { font-size: 22px; font-weight: 900; color: #ffd700; }
    .logo-tag { font-size: 10px; font-weight: 700; color: rgba(255,255,255,.8); margin-left: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .search-bar { flex: 1; display: flex; border-radius: 8px; overflow: hidden; background: #fff; max-width: 700px; }
    .search-category { padding: 0 12px; border: none; border-right: 1px solid #e5e7eb; background: #f9fafb; font-size: 12px; color: #374151; cursor: pointer; min-width: 90px; }
    .search-input { flex: 1; padding: 11px 14px; border: none; font-size: 14px; color: #1f2937; background: #fff; }
    .search-input::placeholder { color: #9ca3af; }
    .search-input:focus { outline: none; }
    .search-btn { padding: 0 18px; background: #ffd700; border: none; font-size: 16px; cursor: pointer; transition: background .15s; }
    .search-btn:hover { background: #ecc900; }
    .header-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .action-item { display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px 10px; border-radius: 8px; cursor: pointer; text-decoration: none; color: #fff; position: relative; transition: background .15s; }
    .action-item:hover { background: rgba(255,255,255,.15); }
    .action-icon { font-size: 18px; }
    .action-label { font-size: 10px; font-weight: 600; white-space: nowrap; }
    .badge { position: absolute; top: 4px; right: 4px; background: #ffd700; color: #1f2937; font-size: 9px; font-weight: 800; min-width: 16px; height: 16px; border-radius: 8px; display: flex; align-items: center; justify-content: center; padding: 0 3px; }
    .cart-badge { background: #fff; color: #f05537; }
    .cart-action { background: rgba(255,255,255,.15); }
    .seller-btn { background: rgba(255,215,0,.2); border: 1px solid rgba(255,215,0,.4); }
    .dropdown-menu { position: absolute; top: calc(100% + 8px); right: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; min-width: 210px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,.15); z-index: 200; }
    .dropdown-label { padding: 6px 14px 4px; font-size: 10px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .5px; }
    .dropdown-menu a, .dropdown-menu button { display: block; width: 100%; text-align: left; padding: 9px 14px; border-radius: 7px; font-size: 13px; color: #374151; text-decoration: none; background: none; border: none; cursor: pointer; }
    .dropdown-menu a:hover, .dropdown-menu button:hover { background: #f3f4f6; color: #f05537; }
    .dropdown-divider { height: 1px; background: #f3f4f6; margin: 4px 0; }
    .category-nav { background: rgba(0,0,0,.15); display: flex; gap: 0; padding: 0 16px; overflow-x: auto; scrollbar-width: none; }
    .category-nav::-webkit-scrollbar { display: none; }
    .nav-link { padding: 9px 14px; color: rgba(255,255,255,.85); text-decoration: none; font-size: 13px; font-weight: 500; white-space: nowrap; border-bottom: 2px solid transparent; transition: all .15s; }
    .nav-link:hover, .nav-link.active { color: #fff; border-bottom-color: #ffd700; }
    .overlay { position: fixed; inset: 0; z-index: 99; }
  `]
})
export class ShopHeaderComponent implements OnInit {
  readonly router   = inject(Router);
  readonly auth     = inject(AuthService);
  readonly cart     = inject(CartService);
  readonly wishlist = inject(WishlistService);

  readonly showUserMenu = signal(false);
  activeCategorySlug    = '';
  searchQuery           = '';
  searchCategory        = '';

  readonly categories = ['Electronics', 'Fashion', 'Home & Kitchen', 'Sports', 'Books', 'Beauty', 'Toys'];
  readonly navCategories = [
    { slug: 'electronics',    label: 'Electronics'  },
    { slug: 'fashion',        label: 'Fashion'       },
    { slug: 'home-kitchen',   label: 'Home & Kitchen'},
    { slug: 'sports-outdoors',label: 'Sports'        },
    { slug: 'books',          label: 'Books'         },
    { slug: 'beauty',         label: 'Beauty'        },
    { slug: 'toys-games',     label: 'Toys'          },
  ];

  ngOnInit() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const urlTree = this.router.parseUrl(this.router.url);
      this.activeCategorySlug = urlTree.queryParams['category'] ?? '';
      this.showUserMenu.set(false);
    });
  }

  toggleUserMenu() { this.showUserMenu.update(v => !v); }

  doSearch() {
    if (!this.searchQuery.trim()) return;
    this.router.navigate(['/shop/products'], {
      queryParams: {
        search: this.searchQuery.trim(),
        ...(this.searchCategory ? { category: this.searchCategory } : {})
      }
    });
  }

  logout() {
    this.auth.logout();
    this.showUserMenu.set(false);
  }
}