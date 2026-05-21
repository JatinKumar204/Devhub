import { Injectable } from '@angular/core';

const PORT_STORAGE_KEY = 'devhub_port_allocations';
const PORT_START = 3001;
const PORT_END = 3999;

interface PortAllocation {
  serviceId: string;
  port: number;
  machineName: string;
  allocatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PortAllocatorService {

  private _allocations: Map<string, PortAllocation> = this._load();

  getOrAllocate(serviceId: string, machineName: string): number {
    const key = this._key(serviceId, machineName);
    const existing = this._allocations.get(key);
    if (existing) return existing.port;

    const port = this._nextAvailablePort();
    const allocation: PortAllocation = {
      serviceId,
      port,
      machineName,
      allocatedAt: new Date().toISOString()
    };
    this._allocations.set(key, allocation);
    this._save();
    return port;
  }

  release(serviceId: string, machineName: string): void {
    this._allocations.delete(this._key(serviceId, machineName));
    this._save();
  }

  getPort(serviceId: string, machineName: string): number | null {
    return this._allocations.get(this._key(serviceId, machineName))?.port ?? null;
  }

  listAllocations(): PortAllocation[] {
    return Array.from(this._allocations.values());
  }

  isPortInUse(port: number): boolean {
    return Array.from(this._allocations.values()).some(a => a.port === port);
  }

  private _nextAvailablePort(): number {
    const used = new Set(Array.from(this._allocations.values()).map(a => a.port));
    for (let p = PORT_START; p <= PORT_END; p++) {
      if (!used.has(p)) return p;
    }
    throw new Error('No available ports in range 3001–3999');
  }

  private _key(serviceId: string, machineName: string): string {
    return `${serviceId}::${machineName.toLowerCase()}`;
  }

  private _load(): Map<string, PortAllocation> {
    try {
      const raw = localStorage.getItem(PORT_STORAGE_KEY);
      if (!raw) return new Map();
      const arr = JSON.parse(raw) as PortAllocation[];
      return new Map(arr.map(a => [this._key(a.serviceId, a.machineName), a]));
    } catch {
      return new Map();
    }
  }

  private _save(): void {
    try {
      localStorage.setItem(PORT_STORAGE_KEY, JSON.stringify(Array.from(this._allocations.values())));
    } catch {
      console.warn('DevHub: failed to persist port allocations');
    }
  }
}
