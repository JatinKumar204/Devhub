// src/app/features/analytics/analytics.component.ts
// REPLACES the existing stub (67-byte placeholder)
// Route: /analytics  (Admin and approved Seller)

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AnalyticsService, RevenueData, OrderStats, TopProduct } from '../../core/services/analytics.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="analytics-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Analytics</h1>
          <p class="page-sub">{{ auth.isAdmin() ? 'Platform-wide statistics' : 'Your store performance' }}</p>
        </div>
        <div class="header-controls">
          <select class="period-select" [(ngModel)]="selectedDays" (change)="load()">
            <option [value]="7">Last 7 days</option>
            <option [value]="30">Last 30 days</option>
            <option [value]="90">Last 90 days</option>
            <option [value]="365">Last 12 months</option>
          </select>
          <button class="btn-export" (click)="exportCsv()">⬇ Export CSV</button>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-state">Loading analytics…</div>
      } @else {

        <!-- Summary cards -->
        <div class="summary-grid">
          <div class="summary-card">
            <div class="card-icon">💰</div>
            <div class="card-value">PKR {{ (revenue()?.totalRevenue ?? 0) | number:'1.0-0' }}</div>
            <div class="card-label">Total Revenue</div>
          </div>
          <div class="summary-card">
            <div class="card-icon">🛒</div>
            <div class="card-value">{{ orderStats()?.totalOrders ?? 0 }}</div>
            <div class="card-label">Total Orders</div>
          </div>
          <div class="summary-card">
            <div class="card-icon">📊</div>
            <div class="card-value">PKR {{ (orderStats()?.avgOrderValue ?? 0) | number:'1.0-0' }}</div>
            <div class="card-label">Avg Order Value</div>
          </div>
          <div class="summary-card">
            <div class="card-icon">✅</div>
            <div class="card-value">{{ orderStats()?.completionRate ?? 0 }}%</div>
            <div class="card-label">Completion Rate</div>
          </div>
        </div>

        <!-- Revenue chart (SVG bar chart — no external library needed) -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">Daily Revenue</span>
            <span class="chart-hint">Last {{ selectedDays }} days</span>
          </div>
          <div class="chart-wrapper">
            @if (revenue() && chartBars().length > 0) {
              <div class="bar-chart">
                @for (bar of chartBars(); track bar.date) {
                  <div class="bar-col" [title]="bar.date + ': PKR ' + bar.revenue">
                    <div class="bar-fill" [style.height.%]="bar.heightPct"></div>
                    @if (selectedDays <= 30) {
                      <div class="bar-label">{{ bar.dayLabel }}</div>
                    }
                  </div>
                }
              </div>
              <div class="chart-y-labels">
                <span>PKR {{ (maxRevenue() | number:'1.0-0') }}</span>
                <span>PKR {{ ((maxRevenue() / 2) | number:'1.0-0') }}</span>
                <span>0</span>
              </div>
            } @else {
              <div class="no-data">No revenue data for this period</div>
            }
          </div>
        </div>

        <!-- Orders by status + monthly trend -->
        <div class="two-col">

          <!-- Status breakdown donut-style -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">Orders by Status</span>
            </div>
            @if (orderStats()) {
              <div class="status-breakdown">
                @for (entry of statusEntries(); track entry.status) {
                  <div class="status-row">
                    <div class="status-bar-wrap">
                      <span class="status-name">{{ entry.status }}</span>
                      <div class="status-track">
                        <div class="status-fill" [class]="'fill-' + entry.status.toLowerCase()"
                          [style.width.%]="entry.pct"></div>
                      </div>
                    </div>
                    <span class="status-count">{{ entry.count }}</span>
                    <span class="status-pct">{{ entry.pct }}%</span>
                  </div>
                }
              </div>
            }
          </div>

          <!-- Monthly trend table -->
          <div class="panel">
            <div class="panel-header">
              <span class="panel-title">Monthly Trend</span>
            </div>
            @if (orderStats()?.monthlyTrend) {
              <div class="trend-table">
                <div class="trend-header">
                  <span>Month</span>
                  <span>Orders</span>
                  <span>Revenue</span>
                </div>
                @for (row of orderStats()!.monthlyTrend.slice(-6); track row.month) {
                  <div class="trend-row">
                    <span class="trend-month">{{ row.month }}</span>
                    <span class="trend-orders">{{ row.orders }}</span>
                    <span class="trend-revenue">PKR {{ row.revenue | number:'1.0-0' }}</span>
                  </div>
                }
              </div>
            }
          </div>

        </div>

        <!-- Top products -->
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">🏆 Top Products by Revenue</span>
          </div>
          @if (topProducts().length === 0) {
            <div class="no-data">No completed orders yet</div>
          } @else {
            <div class="top-table">
              <div class="top-header">
                <span>#</span>
                <span>Product</span>
                <span>Units Sold</span>
                <span>Revenue</span>
              </div>
              @for (p of topProducts(); track p.productId; let i = $index) {
                <div class="top-row" [class.gold]="i === 0" [class.silver]="i === 1" [class.bronze]="i === 2">
                  <span class="top-rank">
                    {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) }}
                  </span>
                  <span class="top-name">{{ p.productName }}</span>
                  <span class="top-units">{{ p.unitsSold }}</span>
                  <span class="top-revenue">PKR {{ p.revenue | number:'1.0-0' }}</span>
                </div>
              }
            </div>
          }
        </div>

      }
    </div>
  `,
  styles: [`
    .analytics-page { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .page-header  { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; }
    .page-title   { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub     { font-size: 14px; color: #8b949e; margin: 0; }
    .header-controls { display: flex; gap: 10px; align-items: center; }
    .period-select { background: #161b22; border: 1px solid #21262d; color: #e6edf3; border-radius: 7px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
    .btn-export { padding: 8px 14px; background: #21262d; border: 1px solid #30363d; border-radius: 7px; color: #e6edf3; font-size: 13px; cursor: pointer; }
    .btn-export:hover { background: #30363d; }
    .loading-state { text-align: center; padding: 80px; color: #8b949e; }

    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
    .summary-card { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; text-align: center; }
    .card-icon  { font-size: 28px; margin-bottom: 8px; }
    .card-value { font-size: 22px; font-weight: 800; color: #e6edf3; }
    .card-label { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: .5px; }

    .panel { background: #161b22; border: 1px solid #21262d; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .panel-title  { font-size: 15px; font-weight: 600; color: #e6edf3; }
    .chart-hint   { font-size: 12px; color: #64748b; }
    .no-data      { text-align: center; padding: 30px; color: #64748b; font-size: 13px; }

    /* Bar chart */
    .chart-wrapper { position: relative; display: flex; gap: 8px; }
    .bar-chart { display: flex; align-items: flex-end; gap: 3px; height: 180px; flex: 1; padding-bottom: 20px; }
    .bar-col   { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; flex: 1; height: 100%; gap: 4px; cursor: default; }
    .bar-fill  { width: 100%; background: linear-gradient(to top, #f05537, #f87171); border-radius: 3px 3px 0 0; min-height: 2px; transition: height .3s; }
    .bar-label { font-size: 9px; color: #64748b; white-space: nowrap; overflow: hidden; }
    .chart-y-labels { display: flex; flex-direction: column; justify-content: space-between; font-size: 10px; color: #64748b; padding-bottom: 20px; width: 80px; text-align: right; }

    /* Status breakdown */
    .status-breakdown { display: flex; flex-direction: column; gap: 12px; }
    .status-row { display: flex; align-items: center; gap: 10px; }
    .status-bar-wrap { flex: 1; display: flex; flex-direction: column; gap: 3px; }
    .status-name  { font-size: 12px; color: #8b949e; }
    .status-track { height: 8px; background: #21262d; border-radius: 4px; overflow: hidden; }
    .status-fill  { height: 100%; border-radius: 4px; transition: width .5s; }
    .fill-pending    { background: #f59e0b; }
    .fill-processing { background: #6366f1; }
    .fill-completed  { background: #22c55e; }
    .fill-cancelled  { background: #ef4444; }
    .status-count { font-size: 13px; font-weight: 600; color: #e6edf3; width: 36px; text-align: right; }
    .status-pct   { font-size: 12px; color: #64748b; width: 36px; text-align: right; }

    /* Monthly trend */
    .trend-table  { font-size: 13px; }
    .trend-header { display: grid; grid-template-columns: 2fr 1fr 1.5fr; gap: 8px; padding: 6px 8px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #21262d; }
    .trend-row    { display: grid; grid-template-columns: 2fr 1fr 1.5fr; gap: 8px; padding: 8px 8px; border-bottom: 1px solid rgba(255,255,255,.03); }
    .trend-row:last-child { border-bottom: none; }
    .trend-month   { color: #e6edf3; }
    .trend-orders  { color: #8b949e; }
    .trend-revenue { color: #22c55e; font-weight: 600; }

    /* Top products */
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .top-table  { font-size: 13px; }
    .top-header { display: grid; grid-template-columns: 40px 1fr 100px 120px; gap: 10px; padding: 6px 10px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #21262d; }
    .top-row    { display: grid; grid-template-columns: 40px 1fr 100px 120px; gap: 10px; padding: 10px 10px; border-bottom: 1px solid rgba(255,255,255,.03); align-items: center; }
    .top-row:last-child { border-bottom: none; }
    .top-row.gold   { background: rgba(245,158,11,.06); }
    .top-row.silver { background: rgba(156,163,175,.04); }
    .top-row.bronze { background: rgba(180,100,60,.04); }
    .top-rank   { font-size: 16px; }
    .top-name   { color: #e6edf3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .top-units  { color: #8b949e; }
    .top-revenue { color: #22c55e; font-weight: 600; }

    @media (max-width: 800px) {
      .summary-grid { grid-template-columns: 1fr 1fr; }
      .two-col { grid-template-columns: 1fr; }
      .top-header, .top-row { grid-template-columns: 40px 1fr 80px; }
      .top-revenue { display: none; }
    }
  `]
})
export class AnalyticsComponent implements OnInit {
  readonly auth         = inject(AuthService);
  readonly analyticsSvc = inject(AnalyticsService);

  readonly loading     = signal(true);
  readonly revenue     = signal<RevenueData | null>(null);
  readonly orderStats  = signal<OrderStats | null>(null);
  readonly topProducts = signal<TopProduct[]>([]);
  readonly maxRevenue  = signal(0);

  selectedDays = 30;

  readonly chartBars = () => {
    const data = this.revenue();
    if (!data) return [];
    const max = Math.max(...data.daily.map(d => d.revenue), 1);
    this.maxRevenue.set(max);
    return data.daily.map(d => ({
      date:      d.date,
      revenue:   d.revenue,
      heightPct: Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0),
      dayLabel:  new Date(d.date).toLocaleDateString('en', { day: '2-digit', month: 'short' })
    }));
  };

  readonly statusEntries = () => {
    const stats = this.orderStats();
    if (!stats) return [];
    const total = stats.totalOrders || 1;
    return Object.entries(stats.byStatus).map(([status, count]) => ({
      status,
      count,
      pct: Math.round((count / total) * 100)
    }));
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    let completed = 0;
    const done = () => { if (++completed === 3) this.loading.set(false); };

    this.analyticsSvc.getRevenue(this.selectedDays).subscribe({
      next: d => { this.revenue.set(d); done(); },
      error: () => done()
    });

    this.analyticsSvc.getOrderStats().subscribe({
      next: d => { this.orderStats.set(d); done(); },
      error: () => done()
    });

    this.analyticsSvc.getTopProducts(10).subscribe({
      next: d => { this.topProducts.set(d.products); done(); },
      error: () => done()
    });
  }

  exportCsv(): void {
    const data = this.revenue();
    if (!data) return;

    const rows = [
      ['Date', 'Revenue (PKR)', 'Orders'],
      ...data.daily.map(d => [d.date, d.revenue.toString(), d.orders.toString()])
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `revenue-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
