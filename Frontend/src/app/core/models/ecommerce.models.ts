// src/app/core/models/ecommerce.models.ts

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId?: number;
  sku: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  discountPercent: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  imageUrl?: string;
  images?: ProductImage[];
  rating: number;
  reviewCount: number;
  tags?: string;
  createdDate: string;
}

export interface ProductImage {
  id: number;
  productId: number;
  url: string;
  altText?: string;
  sortOrder: number;
  isMain: boolean;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: number;
  children?: Category[];
  sortOrder: number;
  isActive: boolean;
}

export interface CartItem {
  id: number;
  cartId: number;
  productId: number;
  productName: string;
  productImage?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  addedDate: string;
}

export interface Cart {
  id: number;
  userId: number;
  items: CartItem[];
  subTotal: number;
  totalItems: number;
}

export interface WishlistItem {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productImage?: string;
  productPrice: number;
  addedDate: string;
}

export interface Order {
  id: number;
  customerId: number;
  customerName: string;
  status: OrderStatus;
  total: number;
  shippingFee: number;
  discount: number;
  itemCount?: number;          // optional — may not be returned on list endpoints
  paymentMethod?: string;      // optional — fixes NG8102 nullish-coalescing warning
  paymentStatus?: string;      // optional — fixes NG8102 nullish-coalescing warning
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  notes?: string;
  lines?: OrderLine[];
  createdDate: string;
}

export type OrderStatus = 'Pending' | 'Processing' | 'Completed' | 'Cancelled';

export interface OrderLine {
  id: number;
  orderId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Address {
  id: number;
  userId: number;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CheckoutPayload {
  customerId: number;
  customerName: string;
  lines: { productId: number; productName: string; quantity: number; unitPrice: number }[];
  paymentMethod: string;
  shippingFee: number;
  notes?: string;
}

export interface ProductFilterState {
  search?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  isFeatured?: boolean;
  page: number;
  pageSize: number;
}