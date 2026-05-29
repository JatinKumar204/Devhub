// src/app/core/services/service-discovery.service.ts
// FIX: Updated to use the correct ServiceRegistryService API:
//   - resolveUrl(serviceId) instead of resolve()
//   - updateLocalEndpoint(id, "machineName:port") instead of separate updateLocalPort/updateMachineName
//   - toggleService(id, boolean) — unchanged, this was already correct

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { ServiceRegistryService } from './service-registry.service';

export interface RegistryResponse {
  serviceId: string;
  serviceName: string;
  version: string;
  port: number;
  host: string;
  status: string;
  timestamp: string;
}

export interface DiscoveryResult {
  serviceId: string;
  port: number;
  discovered: boolean;
  error?: string;
}

// Base ports per service — must match DynamicPort.Resolve() base ports in backend
const SERVICE_BASE_PORTS: Record<string, number> = {
  users:    3001,
  products: 3002,
  orders:   3003,
  cart:     3004,
  category: 3006,   // Note: 'category' not 'categories' — matches DEFAULT_SERVICES id
  wishlist: 3005,
};

const SCAN_WINDOW = 25;

@Injectable({ providedIn: 'root' })
export class ServiceDiscoveryService {
  private readonly _http     = inject(HttpClient);
  private readonly _registry = inject(ServiceRegistryService);

  async discoverAll(): Promise<DiscoveryResult[]> {
    const results: DiscoveryResult[] = [];

    for (const svc of this._registry.services()) {
      const basePort = SERVICE_BASE_PORTS[svc.id] ?? 3001;
      const result   = await this._discoverService(svc.id, basePort);
      results.push(result);

      if (result.discovered) {
        // updateLocalEndpoint takes "machineName:port" — the original API
        this._registry.updateLocalEndpoint(svc.id, `localhost:${result.port}`);
        // toggleService enables local routing for this service
        this._registry.toggleService(svc.id, true);
      }
    }

    return results;
  }

  async discoverService(serviceId: string): Promise<DiscoveryResult> {
    const basePort = SERVICE_BASE_PORTS[serviceId] ?? 3001;
    const result   = await this._discoverService(serviceId, basePort);

    if (result.discovered) {
      this._registry.updateLocalEndpoint(serviceId, `localhost:${result.port}`);
      this._registry.toggleService(serviceId, true);
    }

    return result;
  }

  async probePort(port: number): Promise<RegistryResponse | null> {
    return this._probeRegistryEndpoint(port);
  }

  private async _discoverService(serviceId: string, basePort: number): Promise<DiscoveryResult> {
    for (let port = basePort; port <= basePort + SCAN_WINDOW; port++) {
      const info = await this._probeRegistryEndpoint(port);

      if (info && info.serviceId === serviceId) {
        return { serviceId, port, discovered: true };
      }
    }

    return {
      serviceId,
      port:       basePort,
      discovered: false,
      error:      `No ${serviceId} service found in range ${basePort}–${basePort + SCAN_WINDOW}`
    };
  }

  private async _probeRegistryEndpoint(port: number): Promise<RegistryResponse | null> {
    try {
      return await firstValueFrom(
        this._http.get<RegistryResponse>(`http://localhost:${port}/api/registry`).pipe(
          timeout(1500),
          catchError(() => of(null))
        )
      );
    } catch {
      return null;
    }
  }
}