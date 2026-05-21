import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

const PAYROLL_DATA = [
  { id: 1, name: 'Alice Johnson', department: 'Engineering', baseSalary: 120000, bonus: 12000, tax: 29400, netPay: 102600, period: 'May 2025' },
  { id: 2, name: 'Bob Martinez', department: 'Engineering', baseSalary: 95000, bonus: 5000, tax: 22500, netPay: 77500, period: 'May 2025' },
  { id: 3, name: 'Carol White', department: 'Product', baseSalary: 88000, bonus: 4000, tax: 20400, netPay: 71600, period: 'May 2025' },
  { id: 4, name: 'David Kim', department: 'Operations', baseSalary: 105000, bonus: 8000, tax: 25200, netPay: 87800, period: 'May 2025' },
  { id: 5, name: 'Eva Chen', department: 'Engineering', baseSalary: 92000, bonus: 6000, tax: 21600, netPay: 76400, period: 'May 2025' },
  { id: 6, name: 'Frank Lee', department: 'Finance', baseSalary: 82000, bonus: 3000, tax: 19200, netPay: 65800, period: 'May 2025' },
  { id: 7, name: 'Grace Osei', department: 'HR', baseSalary: 97000, bonus: 5500, tax: 22800, netPay: 79700, period: 'May 2025' },
];

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Payroll</h1>
          <p class="page-subtitle">May 2025 · Total net payroll: \${{ totalNet() | number:'1.0-0' }}</p>
        </div>
        <div class="period-chip">May 2025</div>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Department</th>
              <th>Base Salary</th>
              <th>Bonus</th>
              <th>Tax</th>
              <th>Net Pay</th>
            </tr>
          </thead>
          <tbody>
            @for (p of payroll; track p.id) {
              <tr>
                <td class="cell-name">{{ p.name }}</td>
                <td>{{ p.department }}</td>
                <td>\${{ p.baseSalary | number:'1.0-0' }}</td>
                <td class="bonus">\${{ p.bonus | number:'1.0-0' }}</td>
                <td class="tax">(\${{ p.tax | number:'1.0-0' }})</td>
                <td class="net">\${{ p.netPay | number:'1.0-0' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .period-chip { background: rgba(99,102,241,.12); color: #818cf8; border: 1px solid rgba(99,102,241,.25); border-radius: 20px; padding: 6px 16px; font-size: 13px; font-weight: 600; }
    .table-wrapper { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    thead th { padding: 11px 16px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
    tbody tr { border-bottom: 1px solid rgba(255,255,255,.03); transition: background 0.12s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: var(--bg-hover); }
    td { padding: 10px 16px; vertical-align: middle; color: var(--text-secondary); }
    .cell-name { font-weight: 600; color: var(--text-primary); }
    .bonus { color: #22c55e; font-weight: 600; }
    .tax { color: #ef4444; }
    .net { color: var(--text-primary); font-weight: 700; }
  `]
})
export class PayrollComponent {
  readonly payroll = PAYROLL_DATA;
  totalNet() { return this.payroll.reduce((s, p) => s + p.netPay, 0); }
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Reports</h1>
        <p class="page-subtitle">Export and schedule business reports</p>
      </div>
      <div class="reports-grid">
        @for (r of reports; track r.id) {
          <div class="report-card">
            <div class="report-icon">{{ r.icon }}</div>
            <div class="report-info">
              <div class="report-name">{{ r.name }}</div>
              <div class="report-desc">{{ r.desc }}</div>
            </div>
            <div class="report-actions">
              <button class="btn-export">Export CSV</button>
              <button class="btn-export pdf">Export PDF</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 900px; margin: 0 auto; }
    .page-header { margin-bottom: 28px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .reports-grid { display: flex; flex-direction: column; gap: 10px; }
    .report-card { display: flex; align-items: center; gap: 16px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px; }
    .report-icon { font-size: 24px; width: 36px; text-align: center; flex-shrink: 0; }
    .report-info { flex: 1; }
    .report-name { font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .report-desc { font-size: 12px; color: var(--text-muted); }
    .report-actions { display: flex; gap: 8px; }
    .btn-export { background: var(--bg-primary); border: 1px solid var(--border); color: var(--text-secondary); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; transition: all 0.15s; }
    .btn-export:hover { border-color: #6366f1; color: #818cf8; }
    .btn-export.pdf { border-color: rgba(239,68,68,.3); color: #ef4444; }
    .btn-export.pdf:hover { background: rgba(239,68,68,.05); }
  `]
})
export class ReportsComponent {
  readonly reports = [
    { id: 1, icon: '👤', name: 'User Activity Report', desc: 'Active users, new signups, and role distribution' },
    { id: 2, icon: '🛒', name: 'Sales & Orders Report', desc: 'Revenue breakdown, order volume, and trends' },
    { id: 3, icon: '📦', name: 'Inventory Report', desc: 'Stock levels, low inventory alerts, and movements' },
    { id: 4, icon: '👷', name: 'Employee Headcount Report', desc: 'Workforce by department, tenure, and salary bands' },
    { id: 5, icon: '💰', name: 'Payroll Summary', desc: 'Monthly payroll breakdown with tax and bonus details' },
    { id: 6, icon: '🤝', name: 'Customer Acquisition Report', desc: 'New customers, churn rate, and LTV analysis' },
  ];
}

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Analytics</h1>
        <p class="page-subtitle">Business intelligence and trend analysis</p>
      </div>
      <div class="metrics-grid">
        @for (m of metrics; track m.label) {
          <div class="metric-card" [style.--mc]="m.color">
            <div class="metric-top">
              <span class="metric-icon">{{ m.icon }}</span>
              <span class="metric-trend" [class.up]="m.trend > 0" [class.dn]="m.trend < 0">
                {{ m.trend > 0 ? '↑' : '↓' }} {{ m.trend | number:'1.1-1' }}%
              </span>
            </div>
            <div class="metric-value">{{ m.value }}</div>
            <div class="metric-label">{{ m.label }}</div>
            <div class="metric-bar-wrap">
              <div class="metric-bar" [style.width.%]="m.fill"></div>
            </div>
            <div class="metric-sub">vs. last month</div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 1300px; margin: 0 auto; }
    .page-header { margin-bottom: 28px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .metric-card { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 20px; border-top: 3px solid var(--mc, #6366f1); }
    .metric-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .metric-icon { font-size: 22px; }
    .metric-trend { font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; }
    .metric-trend.up { color: #22c55e; background: rgba(34,197,94,.1); }
    .metric-trend.dn { color: #ef4444; background: rgba(239,68,68,.1); }
    .metric-value { font-size: 30px; font-weight: 700; color: var(--text-primary); margin-bottom: 4px; }
    .metric-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 14px; }
    .metric-bar-wrap { height: 4px; background: rgba(255,255,255,.06); border-radius: 4px; margin-bottom: 8px; }
    .metric-bar { height: 100%; background: var(--mc, #6366f1); border-radius: 4px; transition: width 0.6s ease; }
    .metric-sub { font-size: 11px; color: var(--text-muted); }
  `]
})
export class AnalyticsComponent {
  readonly metrics = [
    { icon: '💰', label: 'Monthly Revenue', value: '$84,200', trend: 12.4, fill: 74, color: '#6366f1' },
    { icon: '🛒', label: 'Total Orders', value: '1,340', trend: 8.1, fill: 58, color: '#10b981' },
    { icon: '👤', label: 'Active Users', value: '892', trend: 5.3, fill: 62, color: '#f59e0b' },
    { icon: '📦', label: 'Products Sold', value: '3,102', trend: -2.1, fill: 43, color: '#ec4899' },
    { icon: '🤝', label: 'New Customers', value: '214', trend: 18.7, fill: 81, color: '#3b82f6' },
    { icon: '📈', label: 'Conversion Rate', value: '3.8%', trend: 0.6, fill: 38, color: '#8b5cf6' },
  ];
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-subtitle">Application preferences and configuration</p>
      </div>
      <div class="settings-sections">
        @for (section of sections; track section.title) {
          <div class="settings-section">
            <div class="section-title">{{ section.title }}</div>
            @for (item of section.items; track item.label) {
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-label">{{ item.label }}</div>
                  <div class="setting-desc">{{ item.desc }}</div>
                </div>
                @if (item.type === 'toggle') {
                  <label class="toggle-switch">
                    <input type="checkbox" [checked]="item.value" />
                    <span class="slider"></span>
                  </label>
                } @else {
                  <input class="setting-input" [value]="item.value" />
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { padding: 28px; max-width: 760px; margin: 0 auto; }
    .page-header { margin-bottom: 28px; }
    .page-title { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0 0 4px; }
    .page-subtitle { font-size: 13px; color: var(--text-muted); margin: 0; }
    .settings-sections { display: flex; flex-direction: column; gap: 20px; }
    .settings-section { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
    .section-title { padding: 14px 20px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text-muted); background: var(--bg-primary); border-bottom: 1px solid var(--border); }
    .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,.03); }
    .setting-row:last-child { border-bottom: none; }
    .setting-info { flex: 1; }
    .setting-label { font-size: 13.5px; font-weight: 500; color: var(--text-primary); margin-bottom: 2px; }
    .setting-desc { font-size: 12px; color: var(--text-muted); }
    .setting-input { background: var(--bg-primary); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; color: var(--text-primary); font-size: 13px; width: 180px; }
    .setting-input:focus { outline: none; border-color: #6366f1; }
    .toggle-switch { position: relative; display: inline-block; width: 36px; height: 20px; flex-shrink: 0; }
    .toggle-switch input { opacity: 0; width: 0; height: 0; }
    .slider { position: absolute; cursor: pointer; inset: 0; background: #374151; border-radius: 20px; transition: 0.2s; }
    .slider::before { content: ''; position: absolute; width: 14px; height: 14px; left: 3px; top: 3px; background: white; border-radius: 50%; transition: 0.2s; }
    .toggle-switch input:checked + .slider { background: #6366f1; }
    .toggle-switch input:checked + .slider::before { transform: translateX(16px); }
  `]
})
export class SettingsComponent {
  readonly sections = [
    {
      title: 'General',
      items: [
        { label: 'Application Name', desc: 'Display name shown in the browser tab', type: 'text', value: 'DevHub' },
        { label: 'Timezone', desc: 'Used for all date and time displays', type: 'text', value: 'UTC+0' },
      ]
    },
    {
      title: 'Notifications',
      items: [
        { label: 'Service health alerts', desc: 'Notify when a service goes offline', type: 'toggle', value: true },
        { label: 'Order notifications', desc: 'Alert on new or updated orders', type: 'toggle', value: false },
        { label: 'Low stock warnings', desc: 'Alert when product stock falls below threshold', type: 'toggle', value: true },
      ]
    },
    {
      title: 'Security',
      items: [
        { label: 'Session timeout', desc: 'Auto-logout after inactivity (minutes)', type: 'text', value: '60' },
        { label: 'Require 2FA', desc: 'Enforce two-factor authentication for all users', type: 'toggle', value: false },
      ]
    }
  ];
}
