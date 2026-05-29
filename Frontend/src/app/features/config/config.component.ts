// src/app/features/config/config.component.ts
// Changes from previous version:
//   - Added ServiceDiscoveryService injection
//   - Added "Discover Services" button that calls discoverAll()
//   - Added per-service "Discover" button for individual discovery
//   - Added discovery status display (what was found / what wasn't)
//   - All existing manual machine/port entry workflow preserved exactly
//   - All existing toggle, health check, add/remove service logic unchanged

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRegistryService } from '../../core/services/service-registry.service';
import { ServiceDiscoveryService, DiscoveryResult } from '../../core/services/service-discovery.service';
import { HealthCheckService } from '../../core/services/health-check.service';
import { ServiceConfig, ServiceStatus } from '../../core/models/service-config.model';
import { DEFAULT_SERVICES } from '../../core/services/service-registry.service';

@Component({
  selector: 'app-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="config-standalone">
      <header class="config-header">
        <div class="header-brand">
          <span class="brand-icon">⚡</span>
          <span class="brand-name">DevHub</span>
          <span class="header-divider">|</span>
          <span class="header-title">Service Configuration</span>
        </div>
        <div class="header-meta">
          <span class="machine-chip">
            <span class="chip-dot"></span>
            {{ registry.currentMachine }}
          </span>
          <button class="btn btn-sm btn-ghost" (click)="runHealthChecks()" [disabled]="checking()">
            {{ checking() ? '⏳' : '↻' }} Health Check
          </button>
          <!-- NEW: Discover button -->
          <button class="btn btn-sm btn-discover" (click)="discoverAll()" [disabled]="discovering()">
            {{ discovering() ? '🔍 Scanning...' : '🔍 Discover' }}
          </button>
          <button class="btn btn-sm btn-primary" (click)="openAddModal()">
            + Add Service
          </button>
        </div>
      </header>

      <!-- NEW: Discovery results banner -->
      @if (discoveryResults().length > 0) {
        <div class="discovery-banner">
          <div class="discovery-summary">
            <span class="disc-found">✓ {{ foundCount() }} found</span>
            @if (missedCount() > 0) {
              <span class="disc-missed">✗ {{ missedCount() }} not found</span>
            }
            <button class="btn-clear" (click)="clearDiscoveryResults()">✕</button>
          </div>
          <div class="discovery-details">
            @for (r of discoveryResults(); track r.serviceId) {
              <span class="disc-tag" [class.disc-ok]="r.discovered" [class.disc-fail]="!r.discovered">
                {{ r.serviceId }}{{ r.discovered ? ' :' + r.port : ' ✗' }}
              </span>
            }
          </div>
        </div>
      }

      <div class="config-body">
        <table class="services-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Machine Name</th>
              <th>Port</th>
              <th>Status</th>
              <th class="col-toggle">Active</th>
              <th class="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            @for (svc of registry.services(); track svc.id) {
              <tr [class.row-active]="svc.useLocal">
                <td class="cell-service">
                  <span class="svc-icon">{{ svc.icon }}</span>
                  <div class="svc-info">
                    <span class="svc-name">{{ svc.displayName }}</span>
                    <span class="svc-path">{{ svc.apiPath || '—' }}</span>
                  </div>
                </td>
                <td class="cell-machine">
                  <input
                    class="table-input"
                    [class.matched]="isMachineMatch(svc)"
                    [value]="svc.localMachineName"
                    placeholder="e.g. DEV-MACHINE-01"
                    (blur)="onMachineChange(svc.id, $any($event.target).value)"
                  />
                </td>
                <td class="cell-port">
                  <input
                    class="table-input port-input"
                    type="number"
                    min="1024"
                    max="65535"
                    [value]="svc.localPort || ''"
                    placeholder="3001"
                    (blur)="onPortChange(svc.id, +$any($event.target).value)"
                  />
                  <!-- Auto-assign stays for manual cases -->
                  @if (svc.localPort === 0 && svc.localMachineName) {
                    <button class="btn-auto-port" (click)="autoAssignPort(svc.id)" title="Auto-assign port">
                      auto
                    </button>
                  }
                  <!-- NEW: per-service discover button -->
                  @if (svc.localPort === 0) {
                    <button
                      class="btn-auto-port btn-discover-sm"
                      (click)="discoverSingle(svc.id)"
                      [disabled]="discoveringSingle() === svc.id"
                      title="Scan localhost for this service">
                      {{ discoveringSingle() === svc.id ? '...' : '🔍' }}
                    </button>
                  }
                </td>
                <td class="cell-status">
                  @if (getStatus(svc.id); as status) {
                    <span class="status-dot" [class.healthy]="status.isReachable" [class.unhealthy]="!status.isReachable"></span>
                    <span class="status-text">{{ status.isReachable ? status.responseTimeMs + 'ms' : 'offline' }}</span>
                  } @else {
                    <span class="status-dot idle"></span>
                    <span class="status-text muted">—</span>
                  }
                </td>
                <td class="cell-toggle">
                  <label class="toggle-switch">
                    <input type="checkbox" [checked]="svc.useLocal" (change)="toggle(svc.id, $event)" />
                    <span class="slider"></span>
                  </label>
                </td>
                <td class="cell-actions">
                  @if (!isDefault(svc.id)) {
                    <button class="btn-icon danger" (click)="removeService(svc.id)" title="Remove">✕</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>

        @if (registry.services().length === 0) {
          <div class="empty-state">No services configured. Add your first service above.</div>
        }
      </div>

      <!-- Add Service Modal (unchanged) -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal" (click)="$event.stopPropagation()">
            <h2 class="modal-title">Add Service</h2>
            <p class="modal-hint">Only the service name is required. Port and machine can be configured after.</p>
            <div class="form-field">
              <label>Service Name <span class="required">*</span></label>
              <input
                class="form-input"
                [(ngModel)]="newServiceName"
                placeholder="e.g. PaymentService"
                (keydown.enter)="addService()"
                autofocus
              />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="addService()" [disabled]="!newServiceName.trim()">
                Add Service
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <style>
      /* ── Discovery additions (all other styles are unchanged from original) ── */
      .btn-discover {
        background: #0ea5e9;
        color: #fff;
        border: none;
        padding: 6px 12px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        transition: opacity .15s;
      }
      .btn-discover:disabled { opacity: .55; cursor: not-allowed; }

      .btn-discover-sm {
        margin-left: 4px;
        padding: 2px 6px;
        font-size: 12px;
      }

      .discovery-banner {
        background: #f0fdf4;
        border: 1px solid #86efac;
        border-radius: 8px;
        padding: 10px 16px;
        margin: 0 24px 16px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .discovery-summary {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        font-weight: 500;
      }

      .disc-found  { color: #16a34a; }
      .disc-missed { color: #dc2626; }

      .btn-clear {
        background: none;
        border: none;
        cursor: pointer;
        color: #6b7280;
        margin-left: auto;
        font-size: 14px;
        padding: 0 4px;
      }

      .discovery-details {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .disc-tag {
        font-size: 11px;
        padding: 2px 8px;
        border-radius: 99px;
        font-family: monospace;
      }

      .disc-ok   { background: #dcfce7; color: #166534; }
      .disc-fail { background: #fee2e2; color: #991b1b; }

      /* ── Original styles preserved below ───────────────────────────────────── */
      .config-standalone {
        min-height: 100vh;
        background: #f8fafc;
        font-family: system-ui, sans-serif;
      }

      .config-header {
        background: #1e293b;
        color: #f1f5f9;
        padding: 14px 24px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .header-brand { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
      .brand-icon { font-size: 20px; }
      .header-divider { opacity: .35; }
      .header-title { opacity: .7; font-weight: 400; }
      .header-meta { display: flex; align-items: center; gap: 10px; }

      .machine-chip {
        display: flex; align-items: center; gap: 5px;
        background: rgba(255,255,255,.08);
        border: 1px solid rgba(255,255,255,.12);
        border-radius: 6px;
        padding: 4px 10px;
        font-size: 12px;
        font-family: monospace;
      }
      .chip-dot { width: 6px; height: 6px; border-radius: 50%; background: #22d3ee; }

      .btn { padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: opacity .15s; }
      .btn:disabled { opacity: .55; cursor: not-allowed; }
      .btn-sm { padding: 5px 10px; font-size: 12px; }
      .btn-ghost { background: rgba(255,255,255,.1); color: #f1f5f9; }
      .btn-ghost:hover { background: rgba(255,255,255,.18); }
      .btn-primary { background: #3b82f6; color: #fff; }
      .btn-primary:hover { opacity: .9; }

      .config-body { padding: 20px 24px; }

      .services-table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
      .services-table th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
      .services-table td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
      .services-table tr:last-child td { border-bottom: none; }
      .row-active { background: #f0fdf4; }

      .cell-service { display: flex; align-items: center; gap: 10px; }
      .svc-icon { font-size: 20px; }
      .svc-info { display: flex; flex-direction: column; gap: 2px; }
      .svc-name { font-size: 13px; font-weight: 600; color: #0f172a; }
      .svc-path { font-size: 11px; color: #94a3b8; font-family: monospace; }

      .table-input { border: 1px solid #e2e8f0; border-radius: 5px; padding: 5px 8px; font-size: 13px; width: 100%; outline: none; transition: border-color .15s; }
      .table-input:focus { border-color: #3b82f6; }
      .table-input.matched { border-color: #22c55e; background: #f0fdf4; }
      .port-input { width: 80px; }

      .btn-auto-port { background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px; padding: 3px 7px; font-size: 11px; cursor: pointer; margin-left: 4px; }
      .btn-auto-port:hover { background: #e2e8f0; }

      .cell-status { display: flex; align-items: center; gap: 6px; }
      .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #cbd5e1; }
      .status-dot.healthy { background: #22c55e; }
      .status-dot.unhealthy { background: #ef4444; }
      .status-dot.idle { background: #cbd5e1; }
      .status-text { font-size: 12px; color: #64748b; }
      .status-text.muted { color: #cbd5e1; }

      .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; cursor: pointer; }
      .toggle-switch input { opacity: 0; width: 0; height: 0; }
      .slider { position: absolute; inset: 0; background: #cbd5e1; border-radius: 10px; transition: .2s; }
      .slider:before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: #fff; border-radius: 50%; transition: .2s; }
      .toggle-switch input:checked + .slider { background: #3b82f6; }
      .toggle-switch input:checked + .slider:before { transform: translateX(16px); }

      .btn-icon { background: none; border: none; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 13px; transition: background .15s; }
      .btn-icon.danger:hover { background: #fee2e2; color: #dc2626; }

      .empty-state { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }

      .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 100; }
      .modal { background: #fff; border-radius: 12px; padding: 24px; width: 360px; box-shadow: 0 20px 60px rgba(0,0,0,.2); }
      .modal-title { font-size: 16px; font-weight: 600; margin: 0 0 6px; }
      .modal-hint { font-size: 13px; color: #64748b; margin: 0 0 16px; }
      .form-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 20px; }
      .form-field label { font-size: 13px; font-weight: 500; }
      .form-input { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; font-size: 14px; outline: none; }
      .form-input:focus { border-color: #3b82f6; }
      .required { color: #ef4444; }
      .modal-actions { display: flex; justify-content: flex-end; gap: 10px; }

      .col-toggle { width: 60px; text-align: center; }
      .col-actions { width: 40px; }

      @media (prefers-color-scheme: dark) {
        .config-standalone { background: #0f172a; }
        .services-table { background: #1e293b; box-shadow: none; }
        .services-table th { background: #0f172a; color: #94a3b8; border-color: #334155; }
        .services-table td { border-color: #1e293b; }
        .row-active { background: #064e3b22; }
        .svc-name { color: #f1f5f9; }
        .table-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
        .table-input.matched { background: #064e3b33; }
        .btn-auto-port { background: #334155; border-color: #475569; color: #f1f5f9; }
        .modal { background: #1e293b; }
        .form-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
        .discovery-banner { background: #064e3b33; border-color: #166534; }
      }
    </style>
  `
})
export class ConfigComponent implements OnInit {
  readonly registry  = inject(ServiceRegistryService);
  readonly discovery = inject(ServiceDiscoveryService);
  readonly health    = inject(HealthCheckService);

  readonly checking          = signal(false);
  readonly discovering       = signal(false);
  readonly discoveringSingle = signal<string | null>(null);
  readonly showModal         = signal(false);
  readonly discoveryResults  = signal<DiscoveryResult[]>([]);
  readonly statuses          = signal<Map<string, ServiceStatus>>(new Map());

  newServiceName = '';

  readonly foundCount  = () => this.discoveryResults().filter(r => r.discovered).length;
  readonly missedCount = () => this.discoveryResults().filter(r => !r.discovered).length;

  ngOnInit() {
    // Run a quick health check on load for services that have ports configured
    this.runHealthChecks();
  }

  // ── Discovery ──────────────────────────────────────────────────────────────

  async discoverAll() {
    this.discovering.set(true);
    this.discoveryResults.set([]);
    try {
      const results = await this.discovery.discoverAll();
      this.discoveryResults.set(results);
      // Run health checks on newly discovered services
      if (results.some(r => r.discovered)) {
        await this.runHealthChecks();
      }
    } finally {
      this.discovering.set(false);
    }
  }

  async discoverSingle(serviceId: string) {
    this.discoveringSingle.set(serviceId);
    try {
      const result = await this.discovery.discoverService(serviceId);
      // Merge into existing results
      const existing = this.discoveryResults().filter(r => r.serviceId !== serviceId);
      this.discoveryResults.set([...existing, result]);
      if (result.discovered) {
        await this._checkOne(serviceId);
      }
    } finally {
      this.discoveringSingle.set(null);
    }
  }

  clearDiscoveryResults() {
    this.discoveryResults.set([]);
  }

  // ── Health checks (unchanged logic, same as original) ─────────────────────

  async runHealthChecks() {
    this.checking.set(true);
    const map = new Map<string, ServiceStatus>();
    const checks = this.registry.services()
      .filter(s => s.useLocal && s.localPort > 0)
      .map(async svc => {
        const baseUrl = `http://localhost:${svc.localPort}`;
        const status  = await this._checkUrl(svc.id, baseUrl);
        map.set(svc.id, status);
      });
    await Promise.all(checks);
    this.statuses.set(new Map(map));
    this.checking.set(false);
  }

  private async _checkOne(serviceId: string) {
    const svc = this.registry.services().find(s => s.id === serviceId);
    if (!svc || !svc.localPort) return;
    const status = await this._checkUrl(serviceId, `http://localhost:${svc.localPort}`);
    const map = new Map(this.statuses());
    map.set(serviceId, status);
    this.statuses.set(map);
  }

  private _checkUrl(serviceId: string, baseUrl: string): Promise<ServiceStatus> {
    return new Promise(resolve => {
      this.health.check(serviceId, baseUrl).subscribe({
        next:  s => resolve(s),
        error: () => resolve({ serviceId, isReachable: false, lastChecked: new Date() })
      });
    });
  }

  getStatus(serviceId: string): ServiceStatus | undefined {
    return this.statuses().get(serviceId);
  }

  // ── Registry mutations (unchanged from original) ──────────────────────────

  toggle(id: string, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.registry.toggleService(id, checked);
  }

  onMachineChange(id: string, value: string) {
    this.registry.updateMachineName(id, value.trim());
  }

  onPortChange(id: string, port: number) {
    if (port > 0) this.registry.updateLocalPort(id, port);
  }

  autoAssignPort(id: string) {
    // Simple sequential allocation from 3001 for manual cases
    const used = new Set(this.registry.services().map(s => s.localPort).filter(p => p > 0));
    let port = 3001;
    while (used.has(port)) port++;
    this.registry.updateLocalPort(id, port);
  }

  isMachineMatch(svc: ServiceConfig): boolean {
    return !!svc.localMachineName &&
      svc.localMachineName.toLowerCase() === this.registry.currentMachine.toLowerCase();
  }

  openAddModal()  { this.showModal.set(true); this.newServiceName = ''; }
  closeModal()    { this.showModal.set(false); }
  removeService(id: string) { this.registry.removeService(id); }
  isDefault(id: string)     { return DEFAULT_SERVICES.some(s => s.id === id); }

  addService() {
    const name = this.newServiceName.trim();
    if (!name) return;
    this.registry.addService(name);
    this.closeModal();
  }
}
