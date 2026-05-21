// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  // ─── Shop (public storefront — visible to everyone) ──────────────────────
  {
    path: 'shop',
    loadComponent: () => import('./features/shop/shop-layout/shop-layout.component')
      .then(m => m.ShopLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/shop/home/home.component')
          .then(m => m.HomeComponent)
      },
      {
        path: 'products',
        loadComponent: () => import('./features/shop/product-list/product-list.component')
          .then(m => m.ProductListComponent)
      },
      {
        path: 'product/:id',
        loadComponent: () => import('./features/shop/product-detail/product-detail.component')
          .then(m => m.ProductDetailComponent)
      },
      {
        // Cart is buyer-only. Sellers hitting /shop/cart are redirected to /products.
        path: 'cart',
        canActivate: [roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/cart/cart.component')
          .then(m => m.CartComponent)
      },
      {
        path: 'wishlist',
        canActivate: [authGuard, roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/wishlist/wishlist.component')
          .then(m => m.WishlistComponent)
      },
      {
        path: 'checkout',
        canActivate: [authGuard, roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/checkout/checkout.component')
          .then(m => m.CheckoutComponent)
      },
      {
        path: 'orders',
        canActivate: [authGuard, roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/my-orders/my-orders.component')
          .then(m => m.MyOrdersComponent)
      },
    ]
  },

  // ─── Auth ────────────────────────────────────────────────────────────────
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component')
      .then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component')
      .then(m => m.RegisterComponent)
  },

  // ─── User profile (any authenticated user) ───────────────────────────────
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent)
  },

  // ─── Seller + Admin shared dashboard ─────────────────────────────────────
  {
    // FIX: was roleGuard(['Admin']) only — Sellers had no dashboard to land on after login
    path: 'dashboard',
    canActivate: [authGuard, roleGuard(['Admin', 'Seller'])],
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },

  // ─── Product management (Seller manages own products; Admin manages all) ──
  {
    path: 'products',
    canActivate: [authGuard, roleGuard(['Admin', 'Seller'])],
    loadComponent: () => import('./features/products/products.component')
      .then(m => m.ProductsComponent)
  },

  // ─── Admin-only routes ────────────────────────────────────────────────────
  {
    path: 'orders',
    canActivate: [authGuard, roleGuard(['Admin'])],
    loadComponent: () => import('./features/orders/orders.component')
      .then(m => m.OrdersComponent)
  },
  {
    path: 'users',
    canActivate: [authGuard, roleGuard(['Admin'])],
    loadComponent: () => import('./features/users/users.component')
      .then(m => m.UsersComponent)
  },

  // ─── Service config (standalone DEV page, no auth required) ──────────────
  {
    path: 'config',
    loadComponent: () => import('./features/config/config.component')
      .then(m => m.ConfigComponent),
    data: { standalone: true }
  },

  // ─── Default redirects ────────────────────────────────────────────────────
  { path: '',   redirectTo: 'shop', pathMatch: 'full' },
  { path: '**', redirectTo: 'shop' }
];