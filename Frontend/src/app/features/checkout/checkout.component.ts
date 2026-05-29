// src/app/features/shop/checkout/checkout.component.ts
// CHANGES from previous version:
//   - createOrder payload now includes sellerId + sellerName per line
//     (read from the cart item — CartItem needs these fields too, see note below)
//   - All existing form logic, address form, payment method, order success state UNCHANGED
//
// NOTE: CartItem in ecommerce.models.ts needs sellerId + sellerName fields.
//       CartService/backend should include these when adding to cart.
//       If not yet available, they default to null/empty and shipments
//       will be created without seller assignment (unassignedLines in OrderDetail).

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/order.service';
import { AuthService } from '../../core/services/auth.service';
import { CartItem } from '../../core/models/ecommerce.models';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="checkout-page">
      <div class="checkout-header">
        <a routerLink="/shop/cart" class="back-link">← Back to Cart</a>
        <h1>Checkout</h1>
      </div>

      @if (orderPlaced()) {
        <div class="order-success">
          <div class="success-icon">✅</div>
          <h2>Order Placed Successfully!</h2>
          <p>Your order <strong>#{{ placedOrderId() }}</strong> has been confirmed.</p>
          <p class="est-delivery">Estimated delivery: 3–5 business days</p>
          <div class="success-actions">
            <a routerLink="/shop/orders" class="btn-track">Track Order</a>
            <a routerLink="/shop" class="btn-home">Continue Shopping</a>
          </div>
        </div>
      } @else {
        <div class="checkout-layout">

          <!-- Left: Address + Payment -->
          <div class="checkout-left">

            <div class="section-card">
              <h2 class="section-title">📍 Delivery Address</h2>
              <form [formGroup]="addressForm">
                <div class="form-row">
                  <div class="form-group">
                    <label>Full Name *</label>
                    <input formControlName="fullName" placeholder="John Doe"
                      [class.error]="isInvalid('fullName')" />
                    @if (isInvalid('fullName')) { <span class="err">Full name is required</span> }
                  </div>
                  <div class="form-group">
                    <label>Phone *</label>
                    <input formControlName="phone" placeholder="03XX-XXXXXXX"
                      [class.error]="isInvalid('phone')" />
                    @if (isInvalid('phone')) { <span class="err">Valid phone is required</span> }
                  </div>
                </div>
                <div class="form-group">
                  <label>Address *</label>
                  <input formControlName="addressLine1" placeholder="Street / Building"
                    [class.error]="isInvalid('addressLine1')" />
                  @if (isInvalid('addressLine1')) { <span class="err">Address is required</span> }
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City *</label>
                    <input formControlName="city" placeholder="Karachi"
                      [class.error]="isInvalid('city')" />
                    @if (isInvalid('city')) { <span class="err">City is required</span> }
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input formControlName="postalCode" placeholder="75500" />
                  </div>
                </div>
              </form>
            </div>

            <div class="section-card">
              <h2 class="section-title">💳 Payment Method</h2>
              <div class="payment-options">
                @for (opt of paymentOptions; track opt.value) {
                  <label class="payment-option" [class.selected]="paymentMethod === opt.value">
                    <input type="radio" [(ngModel)]="paymentMethod" [value]="opt.value" />
                    <span class="opt-icon">{{ opt.icon }}</span>
                    <span>{{ opt.label }}</span>
                  </label>
                }
              </div>
            </div>

          </div>

          <!-- Right: Order summary -->
          <div class="checkout-right">
            <div class="summary-card">
              <h2 class="section-title">Order Summary</h2>

              @if (cartLoading()) {
                <div class="loading">Loading cart…</div>
              } @else if (cartItems().length === 0) {
                <div class="empty-cart">
                  <p>Your cart is empty.</p>
                  <a routerLink="/shop/products">Browse Products</a>
                </div>
              } @else {
                <div class="summary-lines">
                  @for (item of cartItems(); track item.id) {
                    <div class="summary-line">
                      <div class="line-info">
                        <span class="line-name">{{ item.productName }}</span>
                        @if (item.sellerName) {
                          <span class="line-seller">by {{ item.sellerName }}</span>
                        }
                      </div>
                      <span class="line-qty">× {{ item.quantity }}</span>
                      <span class="line-price">PKR {{ item.lineTotal | number:'1.0-0' }}</span>
                    </div>
                  }
                </div>

                <div class="summary-totals">
                  <div class="total-row">
                    <span>Subtotal</span>
                    <span>PKR {{ subtotal() | number:'1.0-0' }}</span>
                  </div>
                  <div class="total-row">
                    <span>Shipping</span>
                    <span>{{ shippingFee() === 0 ? 'Free' : 'PKR ' + shippingFee() }}</span>
                  </div>
                  <div class="total-row grand">
                    <span>Total</span>
                    <span>PKR {{ grandTotal() | number:'1.0-0' }}</span>
                  </div>
                </div>

                @if (placeError()) {
                  <div class="alert-error">{{ placeError() }}</div>
                }

                <button class="btn-place-order"
                  [disabled]="placing() || addressForm.invalid || cartItems().length === 0"
                  (click)="placeOrder()">
                  {{ placing() ? 'Placing order…' : 'Place Order — PKR ' + (grandTotal() | number:'1.0-0') }}
                </button>

                <p class="secure-note">🔒 Your order is secure and encrypted</p>
              }
            </div>
          </div>

        </div>
      }
    </div>
  `,
  styles: [`
    .checkout-page   { max-width: 1000px; margin: 0 auto; padding: 24px; }
    .checkout-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .back-link { font-size: 13px; color: #60a5fa; text-decoration: none; }
    .checkout-header h1 { font-size: 22px; font-weight: 700; color: #e6edf3; margin: 0; }

    .checkout-layout { display: grid; grid-template-columns: 1fr 380px; gap: 20px; align-items: start; }
    .section-card    { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .section-title   { font-size: 15px; font-weight: 600; color: #e6edf3; margin: 0 0 16px; }
    .form-row  { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .form-group label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; color: #8b949e; }
    .form-group input { background: #0d1117; border: 1px solid #21262d; color: #e6edf3; border-radius: 7px; padding: 9px 12px; font-size: 14px; outline: none; }
    .form-group input:focus { border-color: #6366f1; }
    .form-group input.error { border-color: #ef4444; }
    .err { font-size: 11px; color: #ef4444; }

    .payment-options { display: flex; flex-direction: column; gap: 8px; }
    .payment-option { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #0d1117; border: 1px solid #21262d; border-radius: 8px; cursor: pointer; font-size: 14px; color: #8b949e; }
    .payment-option.selected { border-color: #f05537; color: #e6edf3; background: rgba(240,85,55,.06); }
    .payment-option input { display: none; }
    .opt-icon { font-size: 18px; }

    .summary-card { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; position: sticky; top: 24px; }
    .loading, .empty-cart { font-size: 13px; color: #8b949e; padding: 10px 0; }
    .summary-lines { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
    .summary-line  { display: flex; align-items: flex-start; gap: 8px; font-size: 13px; }
    .line-info  { flex: 1; display: flex; flex-direction: column; }
    .line-name  { color: #e6edf3; }
    .line-seller { font-size: 11px; color: #64748b; }
    .line-qty   { color: #8b949e; white-space: nowrap; }
    .line-price { font-weight: 600; color: #e6edf3; white-space: nowrap; }
    .summary-totals { border-top: 1px solid #21262d; padding-top: 12px; display: flex; flex-direction: column; gap: 6px; }
    .total-row  { display: flex; justify-content: space-between; font-size: 13px; color: #8b949e; }
    .total-row.grand { font-size: 16px; font-weight: 700; color: #e6edf3; margin-top: 6px; padding-top: 8px; border-top: 1px solid #21262d; }

    .alert-error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: #ef4444; border-radius: 7px; padding: 10px 12px; font-size: 13px; margin: 12px 0; }
    .btn-place-order { width: 100%; margin-top: 16px; padding: 14px; background: #f05537; color: #fff; border: none; border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; }
    .btn-place-order:disabled { opacity: .5; cursor: not-allowed; }
    .secure-note { font-size: 11px; color: #64748b; text-align: center; margin-top: 10px; }

    .order-success { max-width: 480px; margin: 60px auto; text-align: center; }
    .success-icon  { font-size: 56px; margin-bottom: 16px; }
    .order-success h2 { font-size: 22px; font-weight: 700; color: #e6edf3; margin: 0 0 8px; }
    .order-success p  { font-size: 14px; color: #8b949e; margin: 0 0 6px; }
    .est-delivery  { font-size: 13px; color: #22c55e; }
    .success-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
    .btn-track { padding: 12px 24px; background: #f05537; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn-home  { padding: 12px 24px; background: #21262d; color: #e6edf3; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }

    @media (max-width: 700px) {
      .checkout-layout { grid-template-columns: 1fr; }
      .summary-card    { position: static; }
      .form-row        { grid-template-columns: 1fr; }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  private readonly _cartSvc  = inject(CartService);
  private readonly _orderSvc = inject(OrderService);
  private readonly _auth     = inject(AuthService);
  private readonly _router   = inject(Router);
  private readonly _fb       = inject(FormBuilder);

  readonly cartLoading  = signal(true);
  readonly cartItems    = signal<CartItem[]>([]);
  readonly placing      = signal(false);
  readonly orderPlaced  = signal(false);
  readonly placedOrderId = signal<number | null>(null);
  readonly placeError   = signal<string | null>(null);

  paymentMethod = 'COD';

  readonly paymentOptions = [
    { value: 'COD',       label: 'Cash on Delivery', icon: '💵' },
    { value: 'EasyPaisa', label: 'EasyPaisa',        icon: '📱' },
    { value: 'JazzCash',  label: 'JazzCash',         icon: '📲' },
    { value: 'Card',      label: 'Credit / Debit Card', icon: '💳' },
  ];

  readonly addressForm = this._fb.group({
    fullName:    ['', Validators.required],
    phone:       ['', [Validators.required, Validators.pattern(/^03\d{9}$/)]],
    addressLine1:['', Validators.required],
    city:        ['', Validators.required],
    postalCode:  ['']
  });

  readonly subtotal   = () => this.cartItems().reduce((s, i) => s + i.lineTotal, 0);
  readonly shippingFee = () => this.subtotal() >= 2000 ? 0 : 200;
  readonly grandTotal  = () => this.subtotal() + this.shippingFee();

  ngOnInit(): void {
    this._cartSvc.loadCart().subscribe({
      next:  cart => { this.cartItems.set(cart?.items ?? []); this.cartLoading.set(false); },
      error: ()   => this.cartLoading.set(false)
    });
  }

  isInvalid(field: string): boolean {
    const c = this.addressForm.get(field);
    return !!(c?.invalid && c?.touched);
  }

  placeOrder(): void {
    if (this.addressForm.invalid) {
      this.addressForm.markAllAsTouched();
      return;
    }

    this.placeError.set(null);
    this.placing.set(true);

    const user = this._auth.currentUser();

    this._orderSvc.createOrder({
      customerId:   user?.userId ?? user?.id ?? 0,
      customerName: user?.userName ?? '',
      paymentMethod: this.paymentMethod,
      shippingFee:  this.shippingFee(),
      // CHANGED: now includes sellerId + sellerName per line
      // Cart items carry these fields if the backend populates them
      lines: this.cartItems().map(item => ({
        productId:   item.productId,
        productName: item.productName,
        quantity:    item.quantity,
        unitPrice:   item.unitPrice,
        sellerId:    item.sellerId   ?? null,
        sellerName:  (item as any).sellerName ?? ''
      }))
    }).subscribe({
      next: order => {
        // Clear cart after successful order
        this._cartSvc.clearCart().subscribe();
        this.placedOrderId.set(order.id);
        this.orderPlaced.set(true);
        this.placing.set(false);
      },
      error: err => {
        this.placeError.set(err?.error?.message ?? 'Failed to place order. Please try again.');
        this.placing.set(false);
      }
    });
  }
}
