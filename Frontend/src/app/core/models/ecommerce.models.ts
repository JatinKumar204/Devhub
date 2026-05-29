// src/app/core/models/ecommerce.models.ts
// CHANGES: Added seller verification types at the bottom.
// All existing interfaces (Product, Cart, Order, etc.) are UNCHANGED.

export interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  categoryId?: number;
  sellerId: number;
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
  sellerId: number;
  sellerName: string;
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
  itemCount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
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
  sellerId: number;
  sellerName: string;
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
  lines: { productId: number; productName: string; quantity: number; unitPrice: number}[];
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

// ── NEW: Seller Verification types (Phase 2) ──────────────────────────────────

export type VerificationStatus =
  | 'PendingApproval'
  | 'UnderReview'
  | 'Approved'
  | 'Rejected'
  | 'InfoRequested'
  | 'Resubmitted';

export type DocumentType =
  | 'CnicFront'
  | 'CnicBack'
  | 'BusinessRegistration'
  | 'TaxCertificate'
  | 'BankStatement'
  | 'Other';

export interface SellerProfileForm {
  storeName: string;
  phoneNumber: string;
  storeDescription?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  bankName?: string;
  accountTitle?: string;
  accountNumber?: string;
  ibanNumber?: string;
  ntnNumber?: string;
  salesTaxNumber?: string;
}

export interface VerificationDocument {
  id: number;
  documentType: string;
  status: string;
  filePath: string;
  originalFileName: string;
  fileSizeBytes: number;
  uploadedAt: string;
  notes?: string;
}

export interface VerificationHistoryEntry {
  fromStatus: string;
  toStatus: string;
  changedBy: string;
  changedAt: string;
  comment?: string;
}

export interface SellerVerificationStatus {
  status: VerificationStatus;
  submissionCount: number;
  submittedAt: string;
  reviewedAt?: string;
  storeName?: string;
  documents: VerificationDocument[];
  history: VerificationHistoryEntry[];
}

export interface VerificationQueueItem {
  verificationId: number;
  userId: number;
  sellerName: string;
  sellerEmail: string;
  storeName: string;
  phoneNumber: string;
  city: string;
  province: string;
  status: VerificationStatus;
  statusLabel: string;
  submissionCount: number;
  submittedAt: string;
  lastResubmittedAt?: string;
  reviewedAt?: string;
  documents: VerificationDocument[];
  history: VerificationHistoryEntry[];
}

export interface VerificationQueuePage {
  items: VerificationQueueItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminReviewPayload {
  decision: 'Approved' | 'Rejected' | 'InfoRequested';
  comment?: string;
}

// Extended AuthUser — adds verificationStatus for sellers
export interface AuthUser {
  id:                number;
  userId:            number;
  userName:          string;
  role:              string;
  roles?:            string[];
  email?:            string;
  accessToken:       string;
  refreshToken?:     string | null;      // ADD — stored for silent renewal
  refreshExpiresAt?: string | null;      // ADD — ISO datetime string
  tokenType:         string;
  expiresInSeconds:  number;
  expiresAt:         number;             // milliseconds timestamp (Date.now() based)
  verificationStatus?: VerificationStatus | null;
}

// Shipment tracking 

export type ShipmentStatus =
  | 'Preparing'
  | 'ReadyToShip'
  | 'Shipped'
  | 'OutForDelivery'
  | 'Delivered'
  | 'Failed'
  | 'Returned';

export interface ShipmentGroup {
  shipmentId:        number;
  sellerId:          number;
  sellerName:        string;
  status:            ShipmentStatus;
  trackingNumber?:   string;
  carrier?:          string;
  estimatedDelivery?: string;
  shippedAt?:        string;
  deliveredAt?:      string;
  notes?:            string;
  lines:             OrderLineDetail[];
}

export interface OrderLineDetail {
  id:          number;
  productId:   number;
  productName: string;
  quantity:    number;
  unitPrice:   number;
  lineTotal:   number;
  sellerId?:   number;
  sellerName:  string;
}

// Replaces the flat Order for detail view — includes shipment groups
export interface OrderDetail {
  id:                number;
  customerId:        number;
  customerName:      string;
  status:            OrderStatus;
  total:             number;
  shippingFee:       number;
  discount:          number;
  paymentMethod:     string;
  paymentStatus:     string;
  trackingNumber?:   string;
  estimatedDelivery?: string;
  deliveredAt?:      string;
  notes?:            string;
  createdDate:       string;
  itemCount:         number;
  shipments:         ShipmentGroup[];
  unassignedLines:   OrderLineDetail[];  // legacy orders without seller assignment
}

export interface SellerShipment {
  id:                number;
  orderId:           number;
  sellerId:          number;
  sellerName:        string;
  status:            ShipmentStatus;
  trackingNumber?:   string;
  carrier?:          string;
  estimatedDelivery?: string;
  shippedAt?:        string;
  deliveredAt?:      string;
  notes?:            string;
  createdDate:       string;
  customerName:      string;
  orderTotal:        number;
  lines:             OrderLineDetail[];
}

export interface SellerShipmentPage {
  items:      SellerShipment[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPages: number;
}

export interface UpdateShipmentStatusPayload {
  status:             ShipmentStatus;
  trackingNumber?:    string;
  carrier?:           string;
  notes?:             string;
  estimatedDelivery?: string;
}
