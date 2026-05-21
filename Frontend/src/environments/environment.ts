import { CartService } from "../app/core/services/cart.service";

export const environment = {
  production: false,
  envName: 'DEV' as 'DEV' | 'QA' | 'PROD',
  showConfigLink: true,
  enableDevTools: true,
  apiBase: 'http://localhost:4200',
  defaultLiveUrls: {
    users:    'http://devhub-userservice:3001',
    products: 'http://devhub-productservice:3002',
    orders:   'http://devhub-orderservice:3003',
    cart:     'http://devhub-cartservice:3004',
    category: 'http://devhub-categoryservice:3005',
    wishlist: 'http://devhub-wishlistservice:3006',
  }
};
