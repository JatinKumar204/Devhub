export const environment = {
  production: false,
  envName: 'QA' as 'DEV' | 'QA' | 'PROD',
  showConfigLink: false,
  enableDevTools: false,
  apiBase: 'https://qa-api.example.com',
  defaultLiveUrls: {
    users:    'https://qa-api.example.com',
    products: 'https://qa-api.example.com',
    orders:   'https://qa-api.example.com',
  }
};
