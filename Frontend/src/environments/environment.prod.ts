export const environment = {
  production: true,
  envName: 'PROD' as 'DEV' | 'QA' | 'PROD',
  showConfigLink: false,
  enableDevTools: false,
  apiBase: 'https://api.example.com',
  defaultLiveUrls: {
    users:    'https://api.example.com',
    products: 'https://api.example.com',
    orders:   'https://api.example.com',
  }
};
