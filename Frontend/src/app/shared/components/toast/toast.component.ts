// src/app/shared/components/toast/toast.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(120%)', opacity: 0 }),
        animate('220ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('180ms ease-in', style({ transform: 'translateX(120%)', opacity: 0 }))
      ])
    ])
  ],
  template: `
    <div class="toast-container">
      @for (toast of toastSvc.toasts(); track toast.id) {
        <div class="toast" [@slideIn] [class]="'toast-' + toast.type">
          <span class="toast-icon">{{ iconFor(toast.type) }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-dismiss" (click)="toastSvc.dismiss(toast.id)">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 10px;
      min-width: 280px;
      max-width: 380px;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 4px 20px rgba(0,0,0,.2);
      pointer-events: all;
    }
    .toast-success { background: #166534; color: #dcfce7; border: 1px solid #16a34a; }
    .toast-error   { background: #7f1d1d; color: #fee2e2; border: 1px solid #dc2626; }
    .toast-info    { background: #1e3a5f; color: #dbeafe; border: 1px solid #3b82f6; }
    .toast-warning { background: #78350f; color: #fef3c7; border: 1px solid #f59e0b; }
    .toast-icon { font-size: 16px; flex-shrink: 0; }
    .toast-msg { flex: 1; line-height: 1.4; }
    .toast-dismiss {
      background: none;
      border: none;
      color: inherit;
      opacity: .6;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 4px;
      flex-shrink: 0;
    }
    .toast-dismiss:hover { opacity: 1; }

    @media (max-width: 480px) {
      .toast-container { left: 16px; right: 16px; bottom: 16px; }
      .toast { min-width: unset; max-width: unset; }
    }
  `]
})
export class ToastComponent {
  readonly toastSvc = inject(ToastService);

  iconFor(type: string): string {
    return { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' }[type] ?? 'ℹ️';
  }
}
