// src/app/core/models/service-config.model.ts
// Unchanged structure — adding JSDoc for clarity only
export interface ServiceConfig {
  id: string;
  displayName: string;
  icon: string;
  localEndpoint: string;
  localMachineName: string;
  localPort: number;
  liveUrl: string;
  apiPath: string;
  useLocal: boolean;
  description: string;
  color: string;
  isActive: boolean;
  createdAt: string;
}

export interface ServiceStatus {
  serviceId: string;
  isReachable: boolean;
  responseTimeMs?: number;
  lastChecked: Date;
  error?: string;
}

export interface ResolvedEndpoint {
  serviceId: string;
  baseUrl: string;
  isLocal: boolean;
}


export function parseLocalEndpoint(raw: string): { machineName: string; port: number } | null {
  if (!raw?.trim()) return null;
  const colonIdx = raw.lastIndexOf(':');
  if (colonIdx === -1) return null;
  const machineName = raw.slice(0, colonIdx).trim();
  const port = parseInt(raw.slice(colonIdx + 1).trim(), 10);
  if (!machineName || isNaN(port) || port <= 0 || port > 65535) return null;
  return { machineName, port };
}
export function generateServiceId(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
export function generateColor(index: number): string {
  const palette = ['#6366f1','#10b981','#f59e0b','#ec4899','#3b82f6','#8b5cf6','#ef4444','#06b6d4'];
  return palette[index % palette.length];
}

export const ICON_MAP: Record<string, string> = {
  user: '👤', product: '📦', order: '🛒', employee: '👷',
  payroll: '💰', customer: '🤝', ledger: '📒', inventory: '🏭',
  frontend: '🖥️', gateway: '🔀', auth: '🔐', report: '📊',
  default: '⚙️'
};

export function inferIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(ICON_MAP)) {
    if (lower.includes(key)) return icon;
  }
  return ICON_MAP['default'];
}
export function generateApiPath(id: string): string {
  return `/api/${id}`;
}