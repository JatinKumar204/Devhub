// src/app/features/shop/cart/cart.component.ts
import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { CartItem } from '../../../core/models/ecommerce.models';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="cart-page">
      <div class="cart-header">
        <h1>Shopping Cart</h1>
        <span class="item-count">{{ cart.itemCount() }} item(s)</span>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading your cart...</div>
      } @else if ((cart.cart()?.items?.length ?? 0) === 0) {
        <div class="empty-cart">
          <span class="empty-icon">🛒</span>
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added anything yet.</p>
          <a routerLink="/shop/products" class="btn-continue">Continue Shopping</a>
        </div>
      } @else {
        <div class="cart-layout">
          <!-- Items -->
          <div class="cart-items">
            <div class="items-header">
              <label>
                <input type="checkbox" [(ngModel)]="allSelected" (change)="toggleSelectAll()" />
                Select All ({{ selectedItems().length }}/{{ cart.cart()!.items.length }})
              </label>
              @if (selectedItems().length > 0) {
                <button class="btn-delete-selected" (click)="deleteSelected()">
                  🗑 Delete Selected
                </button>
              }
            </div>

            @for (item of cart.cart()!.items; track item.id) {
              <div class="cart-item" [class.selected]="isSelected(item.productId)">
                <input type="checkbox" [checked]="isSelected(item.productId)"
                  (change)="toggleSelect(item.productId)" class="item-checkbox" />

                <div class="item-image">
                  <img [src]="item.productImage || 'assets/no-image.svg'" [alt]="item.productName" />
                </div>

                <div class="item-details">
                  <p class="item-name">{{ item.productName }}</p>
                  <p class="item-price">PKR {{ item.unitPrice | number:'1.0-0' }}</p>
                </div>

                <div class="item-qty">
                  <button (click)="updateQty(item, item.quantity - 1)" [disabled]="item.quantity <= 1">−</button>
                  <span>{{ item.quantity }}</span>
                  <button (click)="updateQty(item, item.quantity + 1)">+</button>
                </div>

                <div class="item-total">
                  <p>PKR {{ item.lineTotal | number:'1.0-0' }}</p>
                </div>

                <button class="btn-remove" (click)="removeItem(item.productId)" title="Remove">✕</button>
              </div>
            }
          </div>

          <!-- Order summary -->
          <div class="order-summary">
            <h2>Order Summary</h2>

            <div class="coupon-row">
              <input [(ngModel)]="couponCode" placeholder="Enter coupon code" class="coupon-input" />
              <button class="btn-apply" (click)="applyCoupon()">Apply</button>
            </div>
            @if (couponApplied()) {
              <div class="coupon-success">✓ Coupon applied: {{ couponCode }}</div>
            }

            <div class="summary-lines">
              <div class="summary-line">
                <span>Subtotal ({{ cart.itemCount() }} items)</span>
                <span>PKR {{ cart.subTotal() | number:'1.0-0' }}</span>
              </div>
              <div class="summary-line">
                <span>Shipping</span>
                <span class="free">Free</span>
              </div>
              @if (couponDiscount() > 0) {
                <div class="summary-line discount">
                  <span>Coupon Discount</span>
                  <span>- PKR {{ couponDiscount() | number:'1.0-0' }}</span>
                </div>
              }
              <div class="summary-line total">
                <span>Total</span>
                <span>PKR {{ finalTotal() | number:'1.0-0' }}</span>
              </div>
            </div>

            <button class="btn-checkout" (click)="checkout()">
              Proceed to Checkout →
            </button>
            <a routerLink="/shop/products" class="continue-link">← Continue Shopping</a>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .cart-page { background: #f4f5f7; min-height: 100vh; padding: 20px; max-width: 1200px; margin: 0 auto; }
    .cart-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
    .cart-header h1 { font-size: 24px; font-weight: 700; color: #1f2937; margin: 0; }
    .item-count { font-size: 14px; color: #6b7280; background: #e5e7eb; padding: 3px 10px; border-radius: 12px; }

    .loading-state { text-align: center; padding: 60px; color: #6b7280; font-size: 15px; }

    .empty-cart { text-align: center; padding: 80px 20px; background: #fff; border-radius: 12px; }
    .empty-icon { font-size: 60px; display: block; margin-bottom: 20px; }
    .empty-cart h2 { font-size: 22px; color: #1f2937; margin: 0 0 8px; }
    .empty-cart p { color: #6b7280; margin-bottom: 24px; }
    .btn-continue {
      display: inline-block; padding: 12px 28px; background: #f05537; color: #fff;
      border-radius: 8px; text-decoration: none; font-weight: 700;
    }

    .cart-layout { display: grid; grid-template-columns: 1fr 340px; gap: 20px; align-items: flex-start; }

    /* Cart items */
    .cart-items { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,.06); }
    .items-header {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 12px; border-bottom: 1px solid #f3f4f6; margin-bottom: 12px;
      font-size: 13px; color: #374151;
    }
    .items-header label { display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .btn-delete-selected {
      color: #dc2626; background: none; border: none; font-size: 13px; cursor: pointer; font-weight: 600;
    }

    .cart-item {
      display: flex; align-items: center; gap: 14px; padding: 14px 0;
      border-bottom: 1px solid #f3f4f6; transition: background .15s;
    }
    .cart-item.selected { background: #fff5f3; border-radius: 8px; padding-left: 8px; }
    .item-checkbox { accent-color: #f05537; width: 16px; height: 16px; cursor: pointer; }

    .item-image { width: 80px; height: 80px; flex-shrink: 0; background: #f9fafb; border-radius: 8px; overflow: hidden; }
    .item-image img { width: 100%; height: 100%; object-fit: contain; padding: 8px; }

    .item-details { flex: 1; min-width: 0; }
    .item-name { font-size: 14px; color: #1f2937; margin: 0 0 4px; font-weight: 500;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-price { font-size: 13px; color: #6b7280; margin: 0; }

    .item-qty { display: flex; align-items: center; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
    .item-qty button {
      width: 30px; height: 30px; border: none; background: #f9fafb;
      font-size: 16px; cursor: pointer; color: #374151;
    }
    .item-qty button:disabled { opacity: .3; cursor: not-allowed; }
    .item-qty button:hover:not(:disabled) { background: #f05537; color: #fff; }
    .item-qty span { min-width: 36px; text-align: center; font-size: 14px; font-weight: 600; }

    .item-total { min-width: 100px; text-align: right; font-size: 15px; font-weight: 700; color: #1f2937; }

    .btn-remove {
      color: #9ca3af; background: none; border: none; font-size: 16px; cursor: pointer;
      padding: 4px 8px; border-radius: 4px; transition: color .15s;
    }
    .btn-remove:hover { color: #dc2626; }

    /* Summary */
    .order-summary {
      background: #fff; border-radius: 12px; padding: 20px;
      box-shadow: 0 1px 6px rgba(0,0,0,.06); position: sticky; top: 20px;
    }
    .order-summary h2 { font-size: 16px; font-weight: 700; color: #1f2937; margin: 0 0 16px; }

    .coupon-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .coupon-input {
      flex: 1; padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 6px;
      font-size: 13px; text-transform: uppercase;
    }
    .coupon-input:focus { outline: none; border-color: #f05537; }
    .btn-apply {
      padding: 8px 14px; background: #1f2937; color: #fff; border: none;
      border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .coupon-success { font-size: 12px; color: #16a34a; margin-bottom: 10px; }

    .summary-lines { margin: 16px 0; }
    .summary-line {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;
    }
    .summary-line .free { color: #16a34a; font-weight: 600; }
    .summary-line.discount { color: #dc2626; }
    .summary-line.total {
      border-bottom: none; font-size: 16px; font-weight: 700; color: #1f2937;
      padding-top: 12px; margin-top: 4px; border-top: 2px solid #1f2937;
    }

    .btn-checkout {
      width: 100%; padding: 14px; background: #f05537; color: #fff; border: none;
      border-radius: 8px; font-size: 15px; font-weight: 700; cursor: pointer;
      transition: background .15s; margin-bottom: 12px;
    }
    .btn-checkout:hover { background: #d44a2d; }
    .continue-link { display: block; text-align: center; font-size: 13px; color: #6b7280; text-decoration: none; }
    .continue-link:hover { color: #f05537; }

    @media (max-width: 768px) {
      .cart-layout { grid-template-columns: 1fr; }
    }
  `]
})
export class CartComponent implements OnInit {
  readonly router = inject(Router);
  readonly cart = inject(CartService);
  private readonly _toast = inject(ToastService);

  readonly loading = signal(true);
  readonly couponApplied = signal(false);
  couponCode = '';
  allSelected = false;
  private _selectedIds = new Set<number>();

  readonly couponDiscount = signal(0);
  readonly finalTotal = computed(() => Math.max(0, this.cart.subTotal() - this.couponDiscount()));

  ngOnInit() {
    this.cart.loadCart().subscribe({ next: () => this.loading.set(false), error: () => this.loading.set(false) });
  }

  selectedItems() { return Array.from(this._selectedIds); }
  isSelected(id: number) { return this._selectedIds.has(id); }

  toggleSelect(id: number) {
    if (this._selectedIds.has(id)) this._selectedIds.delete(id);
    else this._selectedIds.add(id);
  }

  toggleSelectAll() {
    if (this.allSelected) {
      this.cart.cart()?.items.forEach(i => this._selectedIds.add(i.productId));
    } else {
      this._selectedIds.clear();
    }
  }

  deleteSelected() {
    const ids = [...this._selectedIds];
    ids.forEach(id => this.cart.removeItem(id).subscribe());
    this._selectedIds.clear();
    this.allSelected = false;
  }

  updateQty(item: CartItem, qty: number) {
    if (qty < 1) return;
    this.cart.updateQuantity(item.productId, qty).subscribe({
      error: () => this._toast.error('Could not update quantity')
    });
  }

  removeItem(productId: number) {
    this.cart.removeItem(productId).subscribe({
      error: () => this._toast.error('Could not remove item')
    });
  }

  applyCoupon() {
    const validCoupons: Record<string, number> = {
      'WELCOME10': this.cart.subTotal() * 0.1,
      'FLAT200': 200,
      'SAVE15': this.cart.subTotal() * 0.15,
    };
    const discount = validCoupons[this.couponCode.toUpperCase()];
    if (discount) {
      this.couponDiscount.set(discount);
      this.couponApplied.set(true);
      this._toast.success('Coupon applied!');
    } else {
      this._toast.error('Invalid or expired coupon code');
    }
  }

  checkout() {
    this.router.navigate(['/shop/checkout']);
  }
}
