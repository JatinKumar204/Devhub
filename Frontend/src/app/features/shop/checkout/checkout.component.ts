// src/app/features/shop/checkout/checkout.component.ts
import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { OrderService } from '../../../core/services/order.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

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
        <!-- Success state -->
        <div class="order-success">
          <div class="success-icon">✅</div>
          <h2>Order Placed Successfully!</h2>
          <p>Your order #{{ placedOrderId() }} has been confirmed.</p>
          <p class="est-delivery">Estimated delivery: 3-5 business days</p>
          <div class="success-actions">
            <a routerLink="/shop/orders" class="btn-track">Track Order</a>
            <a routerLink="/shop" class="btn-home">Continue Shopping</a>
          </div>
        </div>
      } @else {
        <div class="checkout-layout">

          <!-- Left: Address + Payment -->
          <div class="checkout-left">

            <!-- Delivery Address -->
            <div class="section-card">
              <h2 class="section-title">📍 Delivery Address</h2>
              <form [formGroup]="addressForm">
                <div class="form-row">
                  <div class="form-group">
                    <label>Full Name *</label>
                    <input formControlName="fullName" placeholder="John Doe" [class.error]="isInvalid('fullName')" />
                    @if (isInvalid('fullName')) { <span class="err">Full name is required</span> }
                  </div>
                  <div class="form-group">
                    <label>Phone *</label>
                    <input formControlName="phone" placeholder="03XX-XXXXXXX" [class.error]="isInvalid('phone')" />
                    @if (isInvalid('phone')) { <span class="err">Valid phone is required</span> }
                  </div>
                </div>
                <div class="form-group">
                  <label>Address Line 1 *</label>
                  <input formControlName="addressLine1" placeholder="House / Building / Street" [class.error]="isInvalid('addressLine1')" />
                  @if (isInvalid('addressLine1')) { <span class="err">Address is required</span> }
                </div>
                <div class="form-group">
                  <label>Address Line 2</label>
                  <input formControlName="addressLine2" placeholder="Landmark / Area (optional)" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>City *</label>
                    <input formControlName="city" placeholder="Karachi" [class.error]="isInvalid('city')" />
                    @if (isInvalid('city')) { <span class="err">City is required</span> }
                  </div>
                  <div class="form-group">
                    <label>Province *</label>
                    <select formControlName="state" [class.error]="isInvalid('state')">
                      <option value="">Select Province</option>
                      <option>Sindh</option>
                      <option>Punjab</option>
                      <option>KPK</option>
                      <option>Balochistan</option>
                      <option>Islamabad</option>
                      <option>AJK</option>
                    </select>
                    @if (isInvalid('state')) { <span class="err">Province is required</span> }
                  </div>
                  <div class="form-group">
                    <label>Postal Code</label>
                    <input formControlName="postalCode" placeholder="75500" />
                  </div>
                </div>
              </form>
            </div>

            <!-- Payment Method -->
            <div class="section-card">
              <h2 class="section-title">💳 Payment Method</h2>
              <div class="payment-options">
                @for (method of paymentMethods; track method.value) {
                  <label class="payment-option" [class.selected]="selectedPayment === method.value">
                    <input type="radio" [(ngModel)]="selectedPayment" [value]="method.value" name="payment" />
                    <span class="pay-icon">{{ method.icon }}</span>
                    <div class="pay-info">
                      <span class="pay-label">{{ method.label }}</span>
                      <span class="pay-desc">{{ method.desc }}</span>
                    </div>
                  </label>
                }
              </div>
            </div>

            <!-- Notes -->
            <div class="section-card">
              <h2 class="section-title">📝 Order Notes (Optional)</h2>
              <textarea [(ngModel)]="orderNotes" rows="3" placeholder="Any special instructions..."></textarea>
            </div>
          </div>

          <!-- Right: Order Summary -->
          <div class="checkout-right">
            <div class="order-summary-card">
              <h2>Order Summary</h2>

              <div class="summary-items">
                @for (item of cart.cart()?.items ?? []; track item.id) {
                  <div class="summary-item">
                    <div class="sum-img">
                      <img [src]="item.productImage || 'assets/no-image.svg'" [alt]="item.productName" />
                      <span class="qty-badge">{{ item.quantity }}</span>
                    </div>
                    <div class="sum-details">
                      <p>{{ item.productName }}</p>
                    </div>
                    <p class="sum-price">PKR {{ item.lineTotal | number:'1.0-0' }}</p>
                  </div>
                }
              </div>

              <div class="price-breakdown">
                <div class="price-row">
                  <span>Subtotal</span>
                  <span>PKR {{ cart.subTotal() | number:'1.0-0' }}</span>
                </div>
                <div class="price-row">
                  <span>Shipping</span>
                  <span class="free">FREE</span>
                </div>
                <div class="price-row total-row">
                  <span>Total</span>
                  <span>PKR {{ cart.subTotal() | number:'1.0-0' }}</span>
                </div>
              </div>

              <button class="btn-place-order" (click)="placeOrder()" [disabled]="placing()">
                @if (placing()) { <span class="spinner"></span> Placing... }
                @else { 🛒 Place Order — PKR {{ cart.subTotal() | number:'1.0-0' }} }
              </button>

              <p class="secure-note">🔒 Secure & Encrypted Checkout</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .checkout-page { background: #f4f5f7; min-height: 100vh; padding: 20px; max-width: 1100px; margin: 0 auto; }
    .checkout-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .checkout-header h1 { font-size: 22px; font-weight: 700; color: #1f2937; margin: 0; }
    .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
    .back-link:hover { color: #f05537; }

    .checkout-layout { display: grid; grid-template-columns: 1fr 360px; gap: 20px; align-items: flex-start; }
    .checkout-left { display: flex; flex-direction: column; gap: 16px; }

    .section-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .section-title { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 16px; }

    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .form-group { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
    .form-group label { font-size: 13px; font-weight: 600; color: #374151; }
    .form-group input, .form-group select, .form-group textarea {
      padding: 9px 12px; border: 1px solid #e5e7eb; border-radius: 7px;
      font-size: 13px; background: #fff; transition: border-color .15s;
    }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #f05537; }
    .form-group input.error, .form-group select.error { border-color: #dc2626; }
    .err { font-size: 11px; color: #dc2626; }
    textarea { width: 100%; padding: 9px 12px; border: 1px solid #e5e7eb; border-radius: 7px; font-size: 13px; resize: vertical; }
    textarea:focus { outline: none; border-color: #f05537; }

    /* Payment */
    .payment-options { display: flex; flex-direction: column; gap: 10px; }
    .payment-option {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: border-color .15s;
    }
    .payment-option.selected { border-color: #f05537; background: #fff5f3; }
    .payment-option input { accent-color: #f05537; }
    .pay-icon { font-size: 22px; }
    .pay-info { display: flex; flex-direction: column; }
    .pay-label { font-size: 14px; font-weight: 600; color: #1f2937; }
    .pay-desc { font-size: 12px; color: #6b7280; }

    /* Summary */
    .order-summary-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,.06); position: sticky; top: 20px; }
    .order-summary-card h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 14px; }

    .summary-items { margin-bottom: 14px; }
    .summary-item { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .sum-img { position: relative; width: 48px; height: 48px; background: #f9fafb; border-radius: 6px; flex-shrink: 0; }
    .sum-img img { width: 100%; height: 100%; object-fit: contain; padding: 4px; }
    .qty-badge {
      position: absolute; top: -6px; right: -6px;
      background: #1f2937; color: #fff; font-size: 10px; font-weight: 700;
      width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    }
    .sum-details { flex: 1; }
    .sum-details p { font-size: 13px; color: #374151; margin: 0;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .sum-price { font-size: 13px; font-weight: 700; color: #1f2937; white-space: nowrap; }

    .price-breakdown { border-top: 1px solid #f3f4f6; padding-top: 12px; }
    .price-row { display: flex; justify-content: space-between; font-size: 14px; color: #374151; margin-bottom: 8px; }
    .price-row .free { color: #16a34a; font-weight: 600; }
    .total-row { font-size: 16px; font-weight: 700; color: #1f2937; border-top: 2px solid #1f2937; padding-top: 10px; margin-top: 4px; }

    .btn-place-order {
      width: 100%; padding: 14px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer;
      transition: background .15s; margin: 14px 0 8px; display: flex; align-items: center; justify-content: center; gap: 8px;
    }
    .btn-place-order:hover:not(:disabled) { background: #d44a2d; }
    .btn-place-order:disabled { opacity: .6; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .secure-note { text-align: center; font-size: 12px; color: #9ca3af; margin: 0; }

    /* Success */
    .order-success { background: #fff; border-radius: 12px; padding: 60px 40px; text-align: center; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .success-icon { font-size: 60px; display: block; margin-bottom: 20px; }
    .order-success h2 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0 0 10px; }
    .order-success p { font-size: 15px; color: #6b7280; margin: 0 0 6px; }
    .est-delivery { color: #16a34a !important; font-weight: 600; }
    .success-actions { display: flex; gap: 12px; justify-content: center; margin-top: 24px; }
    .btn-track { padding: 12px 24px; background: #f05537; color: #fff; border-radius: 8px; text-decoration: none; font-weight: 700; }
    .btn-home { padding: 12px 24px; border: 2px solid #e5e7eb; color: #374151; border-radius: 8px; text-decoration: none; font-weight: 600; }

    @media (max-width: 768px) {
      .checkout-layout { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }
  `]
})
export class CheckoutComponent implements OnInit {
  readonly router = inject(Router);
  readonly cart = inject(CartService);
  private readonly _orderSvc = inject(OrderService);
  private readonly _auth = inject(AuthService);
  private readonly _toast = inject(ToastService);
  private readonly _fb = inject(FormBuilder);

  readonly placing = signal(false);
  readonly orderPlaced = signal(false);
  readonly placedOrderId = signal<number | null>(null);

  selectedPayment = 'COD';
  orderNotes = '';

  readonly paymentMethods = [
    { value: 'COD', icon: '💵', label: 'Cash on Delivery', desc: 'Pay when your order arrives' },
    { value: 'EasyPaisa', icon: '📱', label: 'EasyPaisa', desc: 'Pay via EasyPaisa mobile wallet' },
    { value: 'JazzCash', icon: '📲', label: 'JazzCash', desc: 'Pay via JazzCash mobile wallet' },
    { value: 'Card', icon: '💳', label: 'Credit / Debit Card', desc: 'Visa, Mastercard accepted' },
  ];

  addressForm = this._fb.group({
    fullName:     ['', Validators.required],
    phone:        ['', [Validators.required, Validators.pattern(/^[0-9+\- ]{10,15}$/)]],
    addressLine1: ['', Validators.required],
    addressLine2: [''],
    city:         ['', Validators.required],
    state:        ['', Validators.required],
    postalCode:   [''],
  });

  ngOnInit() {
    this.cart.loadCart().subscribe();

    // Pre-fill name from auth user
    const user = this._auth.currentUser();
    if (user) {
      this.addressForm.patchValue({ fullName: user.userName });
    }
  }

  isInvalid(field: string): boolean {
    const c = this.addressForm.get(field);
    return !!(c?.invalid && (c.touched || c.dirty));
  }

  placeOrder() {
    this.addressForm.markAllAsTouched();
    if (this.addressForm.invalid) {
      this._toast.error('Please fill in all required fields');
      return;
    }

    const cartData = this.cart.cart();
    if (!cartData || cartData.items.length === 0) {
      this._toast.error('Your cart is empty');
      return;
    }

    const user = this._auth.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.placing.set(true);

    const payload = {
      customerId: 0, // resolved server-side from JWT
      customerName: user.userName,
      paymentMethod: this.selectedPayment,
      shippingFee: 0,
      notes: this.orderNotes || undefined,
      lines: cartData.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice
      }))
    };

    this._orderSvc.createOrder(payload).subscribe({
      next: order => {
        this.placedOrderId.set(order.id);
        this.orderPlaced.set(true);
        this.cart.clearCart().subscribe();
        this.placing.set(false);
      },
      error: () => {
        this._toast.error('Failed to place order. Please try again.');
        this.placing.set(false);
      }
    });
  }
}
