import { Injectable, signal, computed } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ServiceConfig, ServiceStatus, ResolvedEndpoint,
  parseLocalEndpoint, generateServiceId, generateApiPath,
  generateColor, inferIcon
} from '../models/service-config.model';

const STORAGE_KEY = 'devhub_config_v3';

@Injectable({ providedIn: 'root' })
export class ServiceRegistryService {

  readonly currentMachine: string = this._detectMachine();
  readonly services = signal<ServiceConfig[]>(this._loadFromStorage());

  readonly resolvedEndpoints = computed<Map<string, ResolvedEndpoint>>(() => {
    const map = new Map<string, ResolvedEndpoint>();
    for (const svc of this.services()) {
      map.set(svc.id, {
        serviceId: svc.id,
        baseUrl: svc.useLocal && svc.localPort > 0
          ? `http://localhost:${svc.localPort}`
          : svc.liveUrl,
        isLocal: svc.useLocal && svc.localPort > 0
      });
    }
    return map;
  });

  readonly activeLocalCount = computed(() =>
    this.services().filter(s => s.useLocal && s.localPort > 0).length
  );

  resolveUrl(serviceId: string): ResolvedEndpoint | undefined {
    return this.resolvedEndpoints().get(serviceId);
  }

  toggleService(id: string, useLocal: boolean): void {
    this.services.update(svcs =>
      svcs.map(s =>
        s.id === id
          ? { ...s, useLocal: useLocal }
          : s
      )
    );

    this._persist();
  }

  updateLocalEndpoint(id: string, rawEndpoint: string): void {
    const parsed = parseLocalEndpoint(rawEndpoint);
    this.services.update(svcs => svcs.map(s => {
      if (s.id !== id) return s;
      const machineName = parsed?.machineName ?? '';
      const localPort = parsed?.port ?? 0;
      const machineMatches = machineName.toLowerCase() === this.currentMachine.toLowerCase();
      return {
        ...s,
        localEndpoint: rawEndpoint,
        localMachineName: machineName,
        localPort,
        useLocal: machineMatches && localPort > 0
      };
    }));
    this._persist();
  }

  updateMachineName(id: string, machineName: string): void {
    this.services.update(svcs => svcs.map(s => {
      if (s.id !== id) return s;
      const machineMatches = machineName.toLowerCase() === this.currentMachine.toLowerCase();
      const localEndpoint = machineName && s.localPort > 0 ? `${machineName}:${s.localPort}` : s.localEndpoint;
      return {
        ...s,
        localMachineName: machineName,
        localEndpoint,
        useLocal: machineMatches && s.localPort > 0
      };
    }));
    this._persist();
  }

  updateLocalPort(id: string, port: number): void {
    this.services.update(svcs => svcs.map(s => {
      if (s.id !== id) return s;
      const machineMatches = s.localMachineName.toLowerCase() === this.currentMachine.toLowerCase();
      const localEndpoint = s.localMachineName && port > 0 ? `${s.localMachineName}:${port}` : s.localEndpoint;
      return {
        ...s,
        localPort: port,
        localEndpoint,
        useLocal: machineMatches && port > 0
      };
    }));
    this._persist();
  }

  addService(displayName: string): ServiceConfig {
    const existing = this.services();
    const id = this._uniqueId(generateServiceId(displayName), existing.map(s => s.id));
    const color = generateColor(existing.length);
    const newService: ServiceConfig = {
      id,
      displayName,
      icon: inferIcon(displayName),
      localEndpoint: '',
      localMachineName: '',
      localPort: 0,
      liveUrl: environment.defaultLiveUrls.users,
      apiPath: generateApiPath(id),
      useLocal: false,
      description: '',
      color,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.services.update(svcs => [...svcs, newService]);
    this._persist();
    return newService;
  }

  updateService(id: string, updates: Partial<ServiceConfig>): void {
    this.services.update(svcs =>
      svcs.map(s => s.id === id ? { ...s, ...updates } : s)
    );
    this._persist();
  }

  removeService(id: string): void {
    this.services.update(svcs => svcs.filter(s => s.id !== id));
    this._persist();
  }

  resetToDefaults(): void {
    this.services.set(this._applyMachineDetection(DEFAULT_SERVICES));
    this._persist();
  }

  private _persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.services()));
    } catch {
      console.warn('DevHub: failed to persist config');
    }
  }

  private _loadFromStorage(): ServiceConfig[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ServiceConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge stored config with defaults to pick up any new default services
          return this._mergeWithDefaults(parsed);
        }
      }
    } catch {
      console.warn('DevHub: corrupt config, using defaults');
    }
    return this._applyMachineDetection(DEFAULT_SERVICES);
  }

  // Merge stored services with defaults: preserve stored state, add new defaults that don't exist yet
  private _mergeWithDefaults(stored: ServiceConfig[]): ServiceConfig[] {
    const storedIds = new Set(stored.map(s => s.id));
    const missing = DEFAULT_SERVICES.filter(d => !storedIds.has(d.id));
    const merged = [
      ...stored.map(svc => ({
        ...svc,
        // Re-evaluate useLocal based on stored machineName/port vs current machine
        // But preserve explicit user toggles: if machine matches and port is set, allow useLocal as stored
        useLocal: svc.useLocal &&
          !!svc.localMachineName &&
          svc.localPort > 0
      })),
      ...this._applyMachineDetection(missing)
    ];
    return merged;
  }

  private _applyMachineDetection(services: ServiceConfig[]): ServiceConfig[] {
    return services.map(svc => ({
      ...svc,
      useLocal:
        !!svc.localMachineName &&
        svc.localMachineName.toLowerCase() === this.currentMachine.toLowerCase() &&
        svc.localPort > 0
    }));
  }

  private _detectMachine(): string {
    const meta = document.querySelector('meta[name="devhub-machine"]') as HTMLMetaElement;
    if (meta?.content && meta.content !== 'DEVHUB_MACHINE_PLACEHOLDER') return meta.content;
    const param = new URLSearchParams(window.location.search).get('machine');
    if (param) return param;
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
    return 'localhost';
  }

  private _uniqueId(base: string, existing: string[]): string {
    if (!existing.includes(base)) return base;
    let i = 2;
    while (existing.includes(`${base}-${i}`)) i++;
    return `${base}-${i}`;
  }
}

export const DEFAULT_SERVICES: ServiceConfig[] = [
  {
    id: 'users',
    displayName: 'User Service',
    icon: '👤',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.users,
    apiPath: '/api/users',
    useLocal: false,
    description: 'Manages user accounts, roles, and authentication',
    color: '#10b981',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'products',
    displayName: 'Product Service',
    icon: '📦',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.products,
    apiPath: '/api/products',
    useLocal: false,
    description: 'Manages product catalog and inventory',
    color: '#3b82f6',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'orders',
    displayName: 'Order Service',
    icon: '🛒',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.orders,
    apiPath: '/api/orders',
    useLocal: false,
    description: 'Manages customer orders and fulfillment',
    color: '#f59e0b',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cart',
    displayName: 'Cart Service',
    icon: '🛒',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.cart,
    apiPath: '/api/cart',
    useLocal: false,
    description: 'Manages user shopping cart',
    color: '#8b5cf6',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'category',
    displayName: 'Category Service',
    icon: '🏷️',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.category,
    apiPath: '/api/category',
    useLocal: false,
    description: 'Manages product categories',
    color: '#ef4444',
    isActive: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'wishlist',
    displayName: 'Wishlist Service',
    icon: '❤️',
    localEndpoint: '',
    localMachineName: '',
    localPort: 0,
    liveUrl: environment.defaultLiveUrls.wishlist,
    apiPath: '/api/wishlist',
    useLocal: false,
    description: 'Manages user wishlists',
    color: '#10b981',
    isActive: true,
    createdAt: new Date().toISOString()
  }
];
