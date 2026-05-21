// src/app/core/services/product.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Product, ProductPage, ProductFilterState } from '../models/ecommerce.models';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly _http = inject(HttpClient);
  private readonly base  = 'ms://products/api/products';

  getProducts(filters: Partial<ProductFilterState> = {}): Observable<ProductPage> {
    let params = new HttpParams();
    if (filters.search)              params = params.set('search',      filters.search);
    if (filters.category)            params = params.set('category',    filters.category);
    if (filters.brand)               params = params.set('brand',       filters.brand);
    if (filters.minPrice != null)    params = params.set('minPrice',    filters.minPrice);
    if (filters.maxPrice != null)    params = params.set('maxPrice',    filters.maxPrice);
    if (filters.sortBy)              params = params.set('sortBy',      filters.sortBy);
    if (filters.isFeatured != null)  params = params.set('isFeatured',  filters.isFeatured);
    params = params.set('page',     filters.page     ?? 1);
    params = params.set('pageSize', filters.pageSize ?? 20);
    return this._http.get<ProductPage>(this.base, { params });
  }

  getMyProducts(page = 1, pageSize = 20): Observable<ProductPage> {
    const params = new HttpParams()
      .set('page',     page)
      .set('pageSize', pageSize);
    return this._http.get<ProductPage>(`${this.base}/my-products`, { params });
  }

  getProduct(id: number): Observable<Product> {
    return this._http.get<Product>(`${this.base}/${id}`);
  }

  getFeatured(count = 8): Observable<Product[]> {
    return this._http.get<Product[]>(`${this.base}/featured?count=${count}`);
  }

  getRelated(id: number, count = 6): Observable<Product[]> {
    return this._http.get<Product[]>(`${this.base}/${id}/related?count=${count}`);
  }

  getCategories(): Observable<string[]> {
    return this._http.get<string[]>(`${this.base}/categories`);
  }

  createProduct(dto: any): Observable<Product> {
    return this._http.post<Product>(this.base, dto);
  }

  updateProduct(id: number, dto: any): Observable<Product> {
    return this._http.put<Product>(`${this.base}/${id}`, dto);
  }

  deleteProduct(id: number): Observable<void> {
    return this._http.delete<void>(`${this.base}/${id}`);
  }

  // Upload one or more images for a product.
  // The backend stores files in wwwroot/uploads/products/{id}/ and returns
  // the relative URL paths which are saved to the ProductImages table.
  uploadImages(productId: number, files: File[]): Observable<{ uploaded: number; images: any[] }> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f, f.name));
    return this._http.post<any>(`${this.base}/${productId}/images`, formData);
  }

  deleteImage(productId: number, imageId: number): Observable<void> {
    return this._http.delete<void>(`${this.base}/${productId}/images/${imageId}`);
  }
}