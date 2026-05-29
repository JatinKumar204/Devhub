// src/app/app.routes.ts
// FIXES applied:
//   1. Shop home + product list: added roleGuard(['Buyer']) so Admin/Seller
//      are redirected to /dashboard instead of browsing the buyer storefront
//   2. Product detail page: kept public (no auth) — anyone can view a product
//   3. /orders route: changed from roleGuard(['Admin','Seller']) to roleGuard(['Admin'])
//      Sellers have /seller/shipments for their orders
//   4. Added /analytics route for Admin and approved Seller
//   5. All stale comments cleaned up

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [

  // ─── Shop (buyer storefront) ──────────────────────────────────────────────
  {
    path: 'shop',
    loadComponent: () => import('./features/shop/shop-layout/shop-layout.component')
      .then(m => m.ShopLayoutComponent),
    children: [
      // FIX 1: home and product-list now Buyer-only
      // Admin/Seller are redirected to /dashboard by roleGuard
      {
        path: '',
        canActivate: [roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/home/home.component')
          .then(m => m.HomeComponent)
      },
      {
        path: 'products',
        canActivate: [roleGuard(['Buyer'])],
        loadComponent: () => import('./features/shop/product-list/product-list.component')
          .then(m => m.ProductListComponent)
      },
      // Product detail stays public — shareable product links work for everyone
      {
        path: 'product/:id',
        loadComponent: () => import('./features/shop/product-detail/product-detail.component')
          .then(m => m.ProductDetailComponent)
      },
      {
        path: 'cart',
        canActivate: [authGuard, roleGuard(['Buyer'])],
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

  // ─── Auth ─────────────────────────────────────────────────────────────────
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

  // ─── Profile + notifications (any authenticated user) ─────────────────────
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./features/profile/profile.component')
      .then(m => m.ProfileComponent)
  },
  {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./features/notifications/notifications.component')
      .then(m => m.NotificationsComponent)
  },

  // ─── Seller routes ─────────────────────────────────────────────────────────
  {
    path: 'seller',
    canActivate: [authGuard, roleGuard(['Seller'])],
    children: [
      {
        path: 'verification',
        loadComponent: () => import('./features/seller/verification/seller-verification.component')
          .then(m => m.SellerVerificationComponent)
      },
      {
        path: 'shipments',
        loadComponent: () => import('./features/seller/shipments/seller-shipments.component')
          .then(m => m.SellerShipmentsComponent)
      },
      {
        path: 'reviews',
        loadComponent: () => import('./features/seller/reviews/seller-reviews.component')
          .then(m => m.SellerReviewsComponent)
      },
      {
        path: '',
        redirectTo: 'verification',
        pathMatch: 'full'
      }
    ]
  },

  // ─── Shared dashboard (Admin + Seller) ────────────────────────────────────
  {
    path: 'dashboard',
    canActivate: [authGuard, roleGuard(['Admin', 'Seller'])],
    loadComponent: () => import('./features/dashboard/dashboard.component')
      .then(m => m.DashboardComponent)
  },

  // ─── Analytics (Admin + Seller) ───────────────────────────────────────────
  // FIX 4: analytics route was missing entirely
  {
    path: 'analytics',
    canActivate: [authGuard, roleGuard(['Admin', 'Seller'])],
    loadComponent: () => import('./features/analytics/analytics.component')
      .then(m => m.AnalyticsComponent)
  },

  // ─── Product management (Admin + Seller) ──────────────────────────────────
  {
    path: 'products',
    canActivate: [authGuard, roleGuard(['Admin', 'Seller'])],
    loadComponent: () => import('./features/products/products.component')
      .then(m => m.ProductsComponent)
  },

  // ─── Admin-only routes ─────────────────────────────────────────────────────
  // FIX 3: /orders was incorrectly allowing Seller; changed to Admin only
  // Sellers manage orders via /seller/shipments
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
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['Admin'])],
    children: [
      {
        path: 'verification',
        loadComponent: () => import('./features/admin/verification-queue/admin-verification-queue.component')
          .then(m => m.AdminVerificationQueueComponent)
      },
      {
        path: 'verification/:id',
        loadComponent: () => import('./features/admin/verification-detail/admin-verification-detail.component')
          .then(m => m.AdminVerificationDetailComponent)
      }
    ]
  },

  // ─── Config (developer tool — no auth guard intentionally) ────────────────
  {
    path: 'config',
    loadComponent: () => import('./features/config/config.component')
      .then(m => m.ConfigComponent)
  },

  // ─── Defaults ─────────────────────────────────────────────────────────────
  { path: '',   redirectTo: 'shop', pathMatch: 'full' },
  { path: '**', redirectTo: 'shop' }
];
