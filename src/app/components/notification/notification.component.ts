import { Component, EventEmitter, Output, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NotificationOptions {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  showIcon?: boolean;
}

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-overlay" *ngIf="isVisible">
      <div class="notification" [class]="'notification-' + options.type" (click)="onClick()">
        <div class="notification-icon" *ngIf="options.showIcon !== false">
          <svg *ngIf="options.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"></polyline>
          </svg>
          <svg *ngIf="options.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg *ngIf="options.type === 'warning'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <svg *ngIf="options.type === 'info'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        
        <div class="notification-content">
          <div class="notification-message">{{ options.message }}</div>
        </div>
        
        <button class="notification-close" (click)="onClose($event)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <div class="notification-progress" *ngIf="options.duration && options.duration > 0">
          <div class="progress-bar" [style.animation-duration]="options.duration + 'ms'"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 10000;
      display: flex;
      align-items: flex-start;
      justify-content: flex-end;
      padding: 20px;
    }
    
    .notification {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 10px 38px rgba(2, 8, 23, 0.14);
      padding: 14px 18px;
      min-width: 320px;
      max-width: 520px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      pointer-events: auto;
      position: relative;
      overflow: hidden;
      animation: slideIn 220ms cubic-bezier(.2,.8,.2,1);
      border: 1px solid #e5e7eb;
    }
    
    .notification-icon {
      flex-shrink: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notification-icon svg {
      width: 20px;
      height: 20px;
    }
    
    .notification-content {
      flex: 1;
      min-width: 0;
    }
    
    .notification-message {
      font-size: 14px;
      font-weight: 600;
      letter-spacing: -0.1px;
      line-height: 1.45;
      color: #0f172a;
    }
    
    .notification-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      color: #9ca3af;
      transition: all 0.2s;
      flex-shrink: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .notification-close:hover {
      background: #f3f4f6;
      color: #374151;
    }
    
    .notification-close svg {
      width: 16px;
      height: 16px;
    }
    
    .notification-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(2, 8, 23, 0.08);
    }
    
    .progress-bar {
      height: 100%;
      background: currentColor;
      animation: progressShrink linear forwards;
    }
    
    /* Notification Types */
    .notification-success {
      border-left: 4px solid #10b981;
      color: #065f46;
    }
    
    .notification-error {
      border-left: 4px solid #ef4444;
      color: #7f1d1d;
    }
    
    .notification-warning {
      border-left: 4px solid #f59e0b;
      color: #7c2d12;
    }
    
    .notification-info {
      border-left: 4px solid var(--accent-500);
      color: #831843;
    }
    
    /* Animations */
    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
    
    @keyframes progressShrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }
    
    /* Dark theme support */
    body.dark-theme .notification {
      background: #0b0f19; /* koyu lacivert arka plan */
      border-color: #1f2a44;
      color: #f3f4f6;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
      backdrop-filter: saturate(120%) blur(4px);
    }

    body.dark-theme .notification-message {
      color: #f3f4f6;
      text-shadow: 0 1px 0 rgba(0, 0, 0, 0.4);
    }
    
    body.dark-theme .notification-close {
      color: #cbd5e1;
    }
    
    body.dark-theme .notification-close:hover {
      background: #0f172a;
      color: #ffffff;
    }
    
    body.dark-theme .notification-progress {
      background: rgba(255, 255, 255, 0.12);
    }
    
    body.dark-theme .notification-success {
      background: #052e2b;
      border-color: #34d399;
      color: #d1fae5;
    }
    
    body.dark-theme .notification-error {
      background: #2a0b0b;
      border-color: #f87171;
      color: #fee2e2;
    }
    
    body.dark-theme .notification-warning {
      background: #2b1705;
      border-color: #fbbf24;
      color: #fef3c7;
    }
    
    body.dark-theme .notification-info {
      background: #1a0b13;
      border-color: var(--accent-500);
      color: #ffe4f1;
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() click = new EventEmitter<void>();

  @Input() options: NotificationOptions = {
    message: '',
    type: 'info',
    duration: 3000,
    showIcon: true
  };

  isVisible = true;
  private timeoutId?: number;

  ngOnInit() {
    if (this.options.duration && this.options.duration > 0) {
      this.timeoutId = window.setTimeout(() => {
        this.onClose();
      }, this.options.duration);
    }
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }

  onClose(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.isVisible = false;
    this.close.emit();
  }

  onClick() {
    this.click.emit();
  }
} 