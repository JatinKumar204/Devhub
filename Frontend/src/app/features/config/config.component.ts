import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ServiceRegistryService } from '../../core/services/service-registry.service';
import { PortAllocatorService } from '../../core/services/port-allocator.service';
import { HealthCheckService } from '../../core/services/health-check.service';
import { ServiceConfig, ServiceStatus } from '../../core/models/service-config.model';

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
          <button class="btn btn-sm btn-ghost" (click)="runHealthChecks()">
            {{ checking() ? '⏳' : '↻' }} Health Check
          </button>
          <button class="btn btn-sm btn-primary" (click)="openAddModal()">
            + Add Service
          </button>
        </div>
      </header>

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
                  @if (svc.localPort === 0 && svc.localMachineName) {
                    <button class="btn-auto-port" (click)="autoAssignPort(svc.id)" title="Auto-assign port">
                      auto
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
                placeholder="e.g. Inventory Service"
                (keyup.enter)="saveService()"
                autofocus
              />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" (click)="closeModal()">Cancel</button>
              <button class="btn btn-primary" (click)="saveService()" [disabled]="!newServiceName.trim()">
                Create Service
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; font-family: 'Inter', sans-serif; }

    .config-standalone {
      min-height: 100vh;
      background: var(--bg-primary, #0f1117);
      color: var(--text-primary, #f1f5f9);
      display: flex;
      flex-direction: column;
    }

    .config-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 28px;
      background: var(--bg-secondary, #161b22);
      border-bottom: 1px solid var(--border, #30363d);
      flex-shrink: 0;
    }

    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
    }
    .brand-icon { font-size: 18px; }
    .brand-name { font-weight: 700; color: var(--text-primary); font-family: 'Space Grotesk', sans-serif; }
    .header-divider { color: var(--border); }
    .header-title { color: var(--text-secondary, #94a3b8); font-weight: 500; }

    .header-meta {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .machine-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #818cf8;
      background: rgba(99,102,241,.1);
      border: 1px solid rgba(99,102,241,.2);
      padding: 4px 10px;
      border-radius: 20px;
      font-family: 'JetBrains Mono', monospace;
    }
    .chip-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 5px #22c55e88;
    }

    .config-body {
      padding: 24px 28px;
      flex: 1;
    }

    .services-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--bg-secondary, #161b22);
      border: 1px solid var(--border, #30363d);
      border-radius: 10px;
      overflow: hidden;
      font-size: 13.5px;
    }

    thead th {
      padding: 11px 14px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted, #64748b);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: var(--bg-primary, #0f1117);
      border-bottom: 1px solid var(--border, #30363d);
    }
    .col-toggle, .col-actions { width: 80px; text-align: center; }

    tbody tr {
      border-bottom: 1px solid var(--border, #30363d);
      transition: background 0.12s;
    }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--bg-hover, #1e2530); }
    tbody tr.row-active { background: rgba(99,102,241,.05); }

    td { padding: 10px 14px; vertical-align: middle; }

    .cell-service {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .svc-icon { font-size: 18px; width: 24px; text-align: center; }
    .svc-info { display: flex; flex-direction: column; gap: 1px; }
    .svc-name { font-weight: 600; color: var(--text-primary); }
    .svc-path { font-size: 11px; color: var(--text-muted); font-family: monospace; }

    .table-input {
      background: var(--bg-primary, #0f1117);
      border: 1px solid var(--border, #30363d);
      border-radius: 6px;
      padding: 6px 10px;
      color: var(--text-primary);
      font-size: 13px;
      width: 100%;
      font-family: 'JetBrains Mono', monospace;
      transition: border-color 0.15s;
    }
    .table-input:focus { outline: none; border-color: #6366f1; }
    .table-input.matched { border-color: #22c55e; }
    .port-input { width: 90px; }

    .btn-auto-port {
      background: rgba(99,102,241,.15);
      color: #818cf8;
      border: 1px solid rgba(99,102,241,.25);
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 10px;
      cursor: pointer;
      margin-left: 4px;
      white-space: nowrap;
    }
    .btn-auto-port:hover { background: rgba(99,102,241,.25); }

    .cell-status {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #374151;
      flex-shrink: 0;
    }
    .status-dot.healthy { background: #22c55e; box-shadow: 0 0 5px #22c55e66; }
    .status-dot.unhealthy { background: #ef4444; }
    .status-dot.idle { background: #374151; }
    .status-text { font-size: 12px; color: var(--text-secondary); }
    .status-text.muted { color: var(--text-muted); }

    .cell-toggle { text-align: center; }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 36px;
      height: 20px;
    }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute;
      cursor: pointer;
      inset: 0;
      background: #374151;
      border-radius: 20px;
      transition: 0.2s;
    }
    .slider::before {
      content: '';
      position: absolute;
      width: 14px;
      height: 14px;
      left: 3px;
      top: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.2s;
    }
    .toggle-switch input:checked + .slider { background: #6366f1; }
    .toggle-switch input:checked + .slider::before { transform: translateX(16px); }

    .cell-actions { text-align: center; }
    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px 7px;
      border-radius: 5px;
      font-size: 13px;
      color: var(--text-muted);
      transition: all 0.12s;
    }
    .btn-icon.danger:hover { color: #ef4444; background: rgba(239,68,68,.1); }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: var(--text-muted);
      font-size: 14px;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.15s;
    }
    .btn-sm { padding: 5px 10px; font-size: 12px; }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { background: transparent; border-color: var(--border); color: var(--text-secondary); }
    .btn-ghost:hover { background: var(--bg-hover); color: var(--text-primary); }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(3px);
    }
    .modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 28px;
      width: 400px;
      box-shadow: 0 20px 60px rgba(0,0,0,.5);
    }
    .modal-title { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
    .modal-hint { font-size: 13px; color: var(--text-muted); margin: 0 0 20px; }

    .form-field { margin-bottom: 18px; }
    .form-field label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.4px; }
    .required { color: #ef4444; }
    .form-input {
      width: 100%;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 7px;
      padding: 9px 12px;
      color: var(--text-primary);
      font-size: 14px;
      box-sizing: border-box;
    }
    .form-input:focus { outline: none; border-color: #6366f1; }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 6px;
    }
  `]
})
export class ConfigComponent implements OnInit {
  readonly registry = inject(ServiceRegistryService);
  private readonly _portAllocator = inject(PortAllocatorService);
  private readonly _healthCheck = inject(HealthCheckService);

  readonly showModal = signal(false);
  readonly checking = signal(false);
  newServiceName = '';

  private readonly _statuses = signal<Map<string, ServiceStatus>>(new Map());

  private readonly _defaultIds = new Set(['frontend', 'users']);

  ngOnInit(): void {
    this.runHealthChecks();
  }

  toggle(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.registry.toggleService(id, checked);
  }

  onMachineChange(id: string, value: string): void {
    this.registry.updateMachineName(id, value.trim());
  }

  onPortChange(id: string, port: number): void {
    if (!isNaN(port) && port > 0) {
      this.registry.updateLocalPort(id, port);
    }
  }

  autoAssignPort(id: string): void {
    const svc = this.registry.services().find(s => s.id === id);
    if (!svc) return;
    const machine = svc.localMachineName || this.registry.currentMachine;
    const port = this._portAllocator.getOrAllocate(id, machine);
    this.registry.updateLocalPort(id, port);
  }

  isMachineMatch(svc: ServiceConfig): boolean {
    return !!svc.localMachineName &&
      svc.localMachineName.toLowerCase() === this.registry.currentMachine.toLowerCase();
  }

  isDefault(id: string): boolean {
    return this._defaultIds.has(id);
  }

  getStatus(id: string): ServiceStatus | undefined {
    return this._statuses().get(id);
  }

  openAddModal(): void {
    this.newServiceName = '';
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
  }

  saveService(): void {
    const name = this.newServiceName.trim();
    if (!name) return;
    this.registry.addService(name);
    this.closeModal();
  }

  removeService(id: string): void {
    if (confirm('Remove this service from configuration?')) {
      this.registry.removeService(id);
      this._portAllocator.release(id, this.registry.currentMachine);
    }
  }

  runHealthChecks(): void {
    this.checking.set(true);
    const svcs = this.registry.services().filter(s => s.localPort > 0 && s.useLocal);
    let remaining = svcs.length;
    if (remaining === 0) { this.checking.set(false); return; }

    for (const svc of svcs) {
      const baseUrl = `http://localhost:${svc.localPort}`;
      this._healthCheck.check(svc.id, baseUrl).subscribe(status => {
        this._statuses.update(m => new Map(m).set(svc.id, status));
        remaining--;
        if (remaining === 0) this.checking.set(false);
      });
    }
  }
}
