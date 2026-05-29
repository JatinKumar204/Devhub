// src/app/features/settings/settings.component.ts
// Proper placeholder — previous version re-exported PayrollComponent which is
// from a different project template and has no relevance to DevHub.
// This stub renders a "coming soon" UI until settings are implemented.
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
        <p class="page-sub">Platform configuration and preferences</p>
      </div>
      <div class="coming-soon">
        <span class="cs-icon">⚙️</span>
        <h2>Settings — Coming Soon</h2>
        <p>Platform settings will be available in a future release.</p>
        <a routerLink="/dashboard" class="btn-back">← Back to Dashboard</a>
      </div>
    </div>
  `,
  styles: [`
    .settings-page  { max-width: 800px; margin: 0 auto; padding: 24px; }
    .page-header    { margin-bottom: 32px; }
    .page-title     { font-size: 24px; font-weight: 700; color: var(--text-primary, #e6edf3); margin: 0 0 4px; }
    .page-sub       { font-size: 14px; color: #8b949e; margin: 0; }
    .coming-soon    { text-align: center; padding: 80px 20px; background: #161b22; border: 1px solid #21262d; border-radius: 12px; }
    .cs-icon        { font-size: 56px; display: block; margin-bottom: 16px; }
    .coming-soon h2 { font-size: 20px; font-weight: 700; color: #e6edf3; margin: 0 0 8px; }
    .coming-soon p  { font-size: 14px; color: #8b949e; margin: 0 0 24px; }
    .btn-back       { display: inline-block; padding: 10px 20px; background: #21262d; border: 1px solid #30363d; border-radius: 8px; color: #e6edf3; text-decoration: none; font-size: 14px; }
    .btn-back:hover { background: #30363d; }
  `]
})
export class SettingsComponent {}
