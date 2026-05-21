// src/app/features/products/products.component.ts
import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ProductService } from '../../core/services/product.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { Product, ProductPage } from '../../core/models/ecommerce.models';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">
            {{ auth.isSeller() ? 'My Products' : 'Product Management' }}
          </h1>
          <p class="page-subtitle">{{ page().total }} products</p>
        </div>
        <div class="header-actions">
          <input class="search-input" [(ngModel)]="search" (ngModelChange)="onSearch()"
            placeholder="Search products..." />
          <select class="filter-select" [(ngModel)]="categoryFilter" (ngModelChange)="loadProducts()">
            <option value="">All Categories</option>
            @for (cat of categories(); track cat) {
              <option [value]="cat">{{ cat }}</option>
            }
          </select>
          <button class="btn-primary" (click)="openModal()">+ Add Product</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading products...</div>
      } @else {
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Stock</th>
                <th>SKU</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (p of page().items; track p.id) {
                <tr>
                  <td class="cell-product">
                    <img [src]="p.imageUrl || 'assets/no-image.svg'" [alt]="p.name" class="product-thumb" />
                    <div>
                      <span class="cell-name">{{ p.name }}</span>
                      @if (p.brand) { <span class="cell-brand">{{ p.brand }}</span> }
                    </div>
                  </td>
                  <td>{{ p.category }}</td>
                  <td>
                    <div class="price-cell">
                      <span>PKR {{ p.price | number:'1.0-0' }}</span>
                      @if (p.discountPercent > 0) {
                        <span class="discount-badge">-{{ p.discountPercent }}%</span>
                      }
                    </div>
                  </td>
                  <td>
                    <span class="stock-val"
                      [class.low-stock]="p.stock < 10 && p.stock > 0"
                      [class.out-stock]="p.stock === 0">
                      {{ p.stock }}
                    </span>
                  </td>
                  <td class="cell-sku">{{ p.sku }}</td>
                  <td>
                    <span class="status-badge" [class.active]="p.isActive" [class.inactive]="!p.isActive">
                      {{ p.isActive ? 'Active' : 'Inactive' }}
                    </span>
                  </td>
                  <td>{{ p.rating | number:'1.1-1' }} ⭐</td>
                  <td class="cell-actions">
                    <button class="btn-sm btn-secondary" (click)="openUploadModal(p)">📷</button>
                    <button class="btn-sm btn-secondary" (click)="openEditModal(p)">Edit</button>
                    <button class="btn-sm btn-danger" (click)="deleteProduct(p)">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        @if (page().totalPages > 1) {
          <div class="pagination">
            <button [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">‹ Prev</button>
            <span>Page {{ currentPage }} of {{ page().totalPages }}</span>
            <button [disabled]="currentPage === page().totalPages" (click)="goToPage(currentPage + 1)">Next ›</button>
          </div>
        }
      }
    </div>

    <!-- Add / Edit Product Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>{{ editingId() ? 'Edit Product' : 'Add Product' }}</h2>
            <button class="modal-close" (click)="closeModal()">✕</button>
          </div>
          <form [formGroup]="form" (ngSubmit)="saveProduct()" class="modal-body">
            <div class="form-row">
              <div class="field">
                <label>Name *</label>
                <input formControlName="name" class="form-input" placeholder="Product name" />
              </div>
              <div class="field">
                <label>SKU *</label>
                <input formControlName="sku" class="form-input" placeholder="Unique SKU" [readonly]="!!editingId()" />
              </div>
            </div>
            <div class="field">
              <label>Description</label>
              <textarea formControlName="description" class="form-input" rows="3" placeholder="Product description"></textarea>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Category *</label>
                <input formControlName="category" class="form-input" placeholder="Electronics, Fashion..." />
              </div>
              <div class="field">
                <label>Brand</label>
                <input formControlName="brand" class="form-input" placeholder="Brand name" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Price (PKR) *</label>
                <input type="number" formControlName="price" class="form-input" min="0" />
              </div>
              <div class="field">
                <label>Original Price</label>
                <input type="number" formControlName="originalPrice" class="form-input" min="0" placeholder="For discount display" />
              </div>
              <div class="field">
                <label>Stock *</label>
                <input type="number" formControlName="stock" class="form-input" min="0" />
              </div>
            </div>
            <div class="form-row">
              <div class="field">
                <label>Image URL</label>
                <input formControlName="imageUrl" class="form-input" placeholder="https://..." />
              </div>
              <div class="field check-field">
                <label class="checkbox-label">
                  <input type="checkbox" formControlName="isFeatured" />
                  Featured on homepage
                </label>
                @if (!editingId()) {
                  <!-- isActive only shown when editing -->
                } @else {
                  <label class="checkbox-label">
                    <input type="checkbox" formControlName="isActive" />
                    Active (visible in shop)
                  </label>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-secondary" (click)="closeModal()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Saving…' : (editingId() ? 'Update' : 'Create') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Image Upload Modal -->
    @if (showUploadModal()) {
      <div class="modal-overlay" (click)="closeUploadModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Upload Images — {{ uploadProduct()?.name }}</h2>
            <button class="modal-close" (click)="closeUploadModal()">✕</button>
          </div>
          <div class="modal-body">
            <!-- Existing images -->
            @if ((uploadProduct()?.images?.length ?? 0) > 0) {
              <div class="existing-images">
                <p class="field-label">Existing Images</p>
                <div class="image-grid">
                  @for (img of uploadProduct()!.images; track img.id) {
                    <div class="img-thumb-wrap">
                      <img [src]="img.url" [alt]="img.altText || ''" class="img-thumb" />
                      @if (img.isMain) { <span class="main-badge">Main</span> }
                      <button class="img-del-btn" (click)="deleteImage(img.id)">✕</button>
                    </div>
                  }
                </div>
              </div>
            }

            <div class="field">
              <label class="field-label">Add New Images (JPG, PNG, WebP — max 5 MB each)</label>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                multiple (change)="onFilesSelected($event)" class="file-input" />
            </div>

            @if (selectedFiles().length > 0) {
              <div class="selected-preview">
                @for (f of selectedFiles(); track f.name) {
                  <span class="file-tag">{{ f.name }}</span>
                }
              </div>
            }

            <div class="modal-footer">
              <button class="btn-secondary" (click)="closeUploadModal()">Close</button>
              <button class="btn-primary"
                [disabled]="selectedFiles().length === 0 || uploading()"
                (click)="uploadImages()">
                {{ uploading() ? 'Uploading…' : 'Upload' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page { padding: 24px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary,#e6edf3); margin: 0; }
    .page-subtitle { font-size: 13px; color: var(--text-muted,#64748b); margin: 4px 0 0; }
    .header-actions { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
    .search-input, .filter-select { background: var(--bg-secondary,#161b22); border: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); border-radius: 6px; padding: 8px 12px; font-size: 13px; outline: none; }
    .search-input { width: 200px; }
    .btn-primary { background: #6366f1; color: #fff; border: none; border-radius: 7px; padding: 9px 18px; font-size: 13px; font-weight: 600; cursor: pointer; white-space: nowrap; }
    .btn-primary:hover:not(:disabled) { background: #4f46e5; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .btn-secondary { background: var(--bg-secondary,#161b22); color: var(--text-primary,#e6edf3); border: 1px solid var(--border,#21262d); border-radius: 7px; padding: 9px 18px; font-size: 13px; cursor: pointer; }
    .loading-state { text-align: center; padding: 60px; color: var(--text-muted,#64748b); }
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table th { text-align: left; padding: 10px 14px; border-bottom: 1px solid var(--border,#21262d); color: var(--text-muted,#64748b); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; white-space: nowrap; }
    .data-table td { padding: 10px 14px; border-bottom: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); vertical-align: middle; }
    .cell-product { display: flex; align-items: center; gap: 10px; min-width: 200px; }
    .product-thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border,#21262d); }
    .cell-name { font-weight: 500; display: block; }
    .cell-brand { font-size: 11px; color: var(--text-muted,#64748b); }
    .cell-sku { font-family: monospace; font-size: 12px; color: var(--text-muted,#64748b); }
    .price-cell { display: flex; align-items: center; gap: 6px; }
    .discount-badge { background: rgba(239,68,68,.15); color: #ef4444; border-radius: 4px; padding: 1px 5px; font-size: 11px; font-weight: 700; }
    .stock-val { font-weight: 600; }
    .low-stock { color: #f59e0b; }
    .out-stock  { color: #ef4444; }
    .status-badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; }
    .status-badge.active   { background: rgba(34,197,94,.15); color: #22c55e; }
    .status-badge.inactive { background: rgba(107,114,128,.15); color: #6b7280; }
    .cell-actions { display: flex; gap: 6px; white-space: nowrap; }
    .btn-sm { padding: 4px 10px; border: none; border-radius: 5px; font-size: 12px; font-weight: 600; cursor: pointer; }
    .btn-sm.btn-secondary { background: rgba(99,102,241,.1); color: #6366f1; }
    .btn-sm.btn-danger { background: rgba(239,68,68,.1); color: #ef4444; }
    .pagination { display: flex; align-items: center; gap: 12px; justify-content: center; margin-top: 24px; font-size: 13px; color: var(--text-secondary,#8b949e); }
    .pagination button { background: var(--bg-secondary,#161b22); border: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); border-radius: 6px; padding: 6px 14px; cursor: pointer; }
    .pagination button:disabled { opacity: .4; cursor: not-allowed; }
    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
    .modal { background: var(--bg-secondary,#161b22); border: 1px solid var(--border,#21262d); border-radius: 12px; width: 100%; max-width: 640px; max-height: 90vh; overflow-y: auto; }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px 0; }
    .modal-header h2 { font-size: 18px; font-weight: 700; color: var(--text-primary,#e6edf3); margin: 0; }
    .modal-close { background: none; border: none; color: var(--text-muted,#64748b); font-size: 18px; cursor: pointer; padding: 4px; }
    .modal-body { padding: 20px 24px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border,#21262d); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field label, .field-label { font-size: 12px; font-weight: 600; color: var(--text-secondary,#8b949e); text-transform: uppercase; letter-spacing: .4px; }
    .form-input { background: var(--bg-primary,#0d1117); border: 1px solid var(--border,#21262d); color: var(--text-primary,#e6edf3); border-radius: 7px; padding: 9px 12px; font-size: 13px; outline: none; resize: vertical; }
    .form-input:focus { border-color: #6366f1; }
    .check-field { justify-content: center; gap: 10px; }
    .checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary,#8b949e); cursor: pointer; text-transform: none; letter-spacing: 0; }
    /* Upload modal */
    .existing-images { margin-bottom: 16px; }
    .image-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .img-thumb-wrap { position: relative; }
    .img-thumb { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid var(--border,#21262d); }
    .main-badge { position: absolute; top: 4px; left: 4px; background: #6366f1; color: #fff; font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 5px; }
    .img-del-btn { position: absolute; top: 2px; right: 2px; background: rgba(239,68,68,.9); color: #fff; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center; }
    .file-input { color: var(--text-secondary,#8b949e); font-size: 13px; }
    .selected-preview { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .file-tag { background: rgba(99,102,241,.1); color: #6366f1; border-radius: 20px; padding: 3px 10px; font-size: 12px; }
  `]
})
export class ProductsComponent implements OnInit {
  readonly auth    = inject(AuthService);
  private readonly _svc   = inject(ProductService);
  private readonly _http  = inject(HttpClient);
  private readonly _toast = inject(ToastService);
  private readonly _fb    = inject(FormBuilder);

  readonly loading       = signal(true);
  readonly saving        = signal(false);
  readonly uploading     = signal(false);
  readonly showModal     = signal(false);
  readonly showUploadModal = signal(false);
  readonly editingId     = signal<number | null>(null);
  readonly categories    = signal<string[]>([]);
  readonly uploadProduct = signal<Product | null>(null);
  readonly selectedFiles = signal<File[]>([]);

  readonly page = signal<ProductPage>({
    items: [], total: 0, page: 1, pageSize: 20, totalPages: 1
  });

  search         = '';
  categoryFilter = '';
  currentPage    = 1;
  private _searchTimer: any;

  form = this._fb.group({
    name:          ['', Validators.required],
    sku:           ['', Validators.required],
    description:   [''],
    category:      ['', Validators.required],
    brand:         [''],
    price:         [0, [Validators.required, Validators.min(0)]],
    originalPrice: [null as number | null],
    stock:         [0, [Validators.required, Validators.min(0)]],
    imageUrl:      [''],
    isFeatured:    [false],
    isActive:      [true],
  });

  ngOnInit() {
    this.loadProducts();
    this._svc.getCategories().subscribe(cats => this.categories.set(cats));
  }

  loadProducts() {
    this.loading.set(true);
    const req = this.auth.isSeller()
      ? this._svc.getMyProducts(this.currentPage)
      : this._svc.getProducts({ search: this.search, category: this.categoryFilter, page: this.currentPage, pageSize: 20 });

    req.subscribe({
      next: p => { this.page.set(p); this.loading.set(false); },
      error: () => { this._toast.error('Failed to load products'); this.loading.set(false); }
    });
  }

  onSearch() {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => { this.currentPage = 1; this.loadProducts(); }, 400);
  }

  goToPage(p: number) { this.currentPage = p; this.loadProducts(); }

  openModal() {
    this.editingId.set(null);
    this.form.reset({ isFeatured: false, isActive: true, price: 0, stock: 0 });
    this.showModal.set(true);
  }

  openEditModal(p: Product) {
    this.editingId.set(p.id);
    this.form.patchValue({
      name: p.name, sku: p.sku, description: p.description,
      category: p.category, brand: p.brand ?? '',
      price: p.price, originalPrice: p.originalPrice ?? null,
      stock: p.stock, imageUrl: p.imageUrl ?? '',
      isFeatured: p.isFeatured, isActive: p.isActive
    });
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); }

  saveProduct() {
    if (this.form.invalid) return;
    this.saving.set(true);
    const v = this.form.value;
    const dto: any = {
      name: v.name, sku: v.sku, description: v.description,
      category: v.category, brand: v.brand || null,
      price: v.price, originalPrice: v.originalPrice || null,
      stock: v.stock, imageUrl: v.imageUrl || null,
      isFeatured: v.isFeatured
    };
    if (this.editingId()) dto.isActive = v.isActive;

    const req = this.editingId()
      ? this._svc.updateProduct(this.editingId()!, dto)
      : this._svc.createProduct(dto);

    req.subscribe({
      next: () => {
        this._toast.success(this.editingId() ? 'Product updated' : 'Product created');
        this.closeModal();
        this.loadProducts();
        this.saving.set(false);
      },
      error: err => {
        this._toast.error(err?.error?.message ?? 'Save failed');
        this.saving.set(false);
      }
    });
  }

  deleteProduct(p: Product) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    this._svc.deleteProduct(p.id).subscribe({
      next: () => { this._toast.success('Product deleted'); this.loadProducts(); },
      error: () => this._toast.error('Delete failed')
    });
  }

  openUploadModal(p: Product) {
    this.uploadProduct.set(p);
    this.selectedFiles.set([]);
    this.showUploadModal.set(true);
  }

  closeUploadModal() { this.showUploadModal.set(false); }

  onFilesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFiles.set(Array.from(input.files ?? []));
  }

  uploadImages() {
    const product = this.uploadProduct();
    if (!product || this.selectedFiles().length === 0) return;
    this.uploading.set(true);

    const formData = new FormData();
    this.selectedFiles().forEach(f => formData.append('files', f, f.name));

    this._http.post<any>(`ms://products/api/products/${product.id}/images`, formData).subscribe({
      next: res => {
        this._toast.success(`${res.uploaded} image(s) uploaded`);
        this.selectedFiles.set([]);
        // Refresh the product in the list so thumbnails update
        this._svc.getProduct(product.id).subscribe(updated => {
          this.uploadProduct.set(updated);
          this.page.update(pg => ({
            ...pg,
            items: pg.items.map(i => i.id === updated.id ? updated : i)
          }));
        });
        this.uploading.set(false);
      },
      error: err => {
        this._toast.error(err?.error?.message ?? 'Upload failed');
        this.uploading.set(false);
      }
    });
  }

  deleteImage(imageId: number) {
    const product = this.uploadProduct();
    if (!product || !confirm('Remove this image?')) return;

    this._http.delete(`ms://products/api/products/${product.id}/images/${imageId}`).subscribe({
      next: () => {
        this._toast.success('Image removed');
        this._svc.getProduct(product.id).subscribe(updated => {
          this.uploadProduct.set(updated);
          this.page.update(pg => ({
            ...pg,
            items: pg.items.map(i => i.id === updated.id ? updated : i)
          }));
        });
      },
      error: () => this._toast.error('Failed to remove image')
    });
  }
}