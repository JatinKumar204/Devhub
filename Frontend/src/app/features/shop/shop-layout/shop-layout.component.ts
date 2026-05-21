// src/app/features/shop/shop-layout/shop-layout.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ShopHeaderComponent } from '../../../shared/components/shop-header/shop-header.component';
import { ToastComponent } from '../../../shared/components/toast/toast.component';

@Component({
  selector: 'app-shop-layout',
  standalone: true,
  imports: [RouterOutlet, ShopHeaderComponent, ToastComponent],
  template: `
    <app-shop-header />
    <main class="shop-main">
      <router-outlet />
    </main>
    <footer class="shop-footer">
      <div class="footer-inner">
        <div class="footer-col">
          <h4>DevHub Store</h4>
          <p>Pakistan's trusted online shopping destination. Millions of products, unbeatable prices.</p>
        </div>
        <div class="footer-col">
          <h4>Customer Service</h4>
          <a href="#">Help Center</a>
          <a href="#">Returns</a>
          <a href="#">Track Order</a>
          <a href="#">Contact Us</a>
        </div>
        <div class="footer-col">
          <h4>About Us</h4>
          <a href="#">About DevHub</a>
          <a href="#">Careers</a>
          <a href="#">Press</a>
          <a href="#">Sustainability</a>
        </div>
        <div class="footer-col">
          <h4>Sell With Us</h4>
          <a href="#">Become a Seller</a>
          <a href="#">Seller Center</a>
          <a href="#">Seller Portal</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2025 DevHub Store. All rights reserved.</span>
        <div class="payment-icons">
          <span>💳</span><span>📱</span><span>🏦</span>
        </div>
      </div>
    </footer>
    <app-toast />
  `,
  styles: [`
    .shop-main { min-height: calc(100vh - 200px); }
    .shop-footer { background: #1a1a2e; color: rgba(255,255,255,.7); margin-top: 40px; }
    .footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; padding: 40px 40px 20px; max-width: 1400px; margin: 0 auto; }
    .footer-col h4 { font-size: 14px; font-weight: 700; color: #fff; margin: 0 0 14px; }
    .footer-col p { font-size: 13px; line-height: 1.6; margin: 0; }
    .footer-col a { display: block; font-size: 13px; color: rgba(255,255,255,.6); text-decoration: none; margin-bottom: 7px; }
    .footer-col a:hover { color: #f05537; }
    .footer-bottom { border-top: 1px solid rgba(255,255,255,.08); padding: 16px 40px; display: flex; justify-content: space-between; align-items: center; max-width: 1400px; margin: 0 auto; font-size: 12px; }
    .payment-icons { display: flex; gap: 10px; font-size: 20px; }

    @media (max-width: 768px) {
      .footer-inner { grid-template-columns: 1fr 1fr; gap: 24px; padding: 24px 20px 10px; }
    }
  `]
})
export class ShopLayoutComponent {}
