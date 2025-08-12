import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileInfo } from '../../services/file.service';

@Component({
  selector: 'app-rename-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rename-dialog-overlay" (click)="onCancel.emit()">
      <div class="rename-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>Dosyayı Yeniden Adlandır</h3>
          <button class="close-btn" (click)="onCancel.emit()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="dialog-content">
          <div class="form-group">
            <label>Yeni Ad:</label>
            <input type="text" 
                   [(ngModel)]="newFileName" 
                   (keyup.enter)="onConfirm.emit(newFileName)"
                   (keyup.escape)="onCancel.emit()"
                   class="filename-input"
                   [placeholder]="file?.name || ''"
                   autofocus>
          </div>
        </div>
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="onCancel.emit()">İptal</button>
          <button class="btn btn-primary" (click)="onConfirm.emit(newFileName)" [disabled]="!newFileName.trim()">Yeniden Adlandır</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .rename-dialog-overlay {
       position: fixed;
       top: 0;
       left: 0;
       right: 0;
       bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
       display: flex;
       align-items: center;
       justify-content: center;
       z-index: 999999;
       width: 100vw;
       height: 100vh;
       pointer-events: auto;
     }

     .rename-dialog {
       background: #ffffff;
       border-radius: 16px;
       box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06);
       width: min(520px, 92vw);
       border: 1px solid #e2e8f0;
       overflow: hidden;
       transform: scale(1);
       animation: dialogFadeIn 0.2s ease-out;
       z-index: 1000000;
       position: relative;
     }

    @keyframes dialogFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 22px 24px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .dialog-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: #111827;
    }

    .close-btn {
      background: none;
      border: none;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      background: #e5e7eb;
      color: #374151;
    }

    .close-btn svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
    }

    .dialog-content {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 0;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }

    .filename-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      font-size: 15px;
      color: #374151;
      background: #ffffff;
      transition: all 0.2s ease;
      box-sizing: border-box;
    }

    .filename-input:focus {
      outline: none;
      border-color: var(--accent-500);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12);
    }

    .filename-input::placeholder {
      color: #9ca3af;
    }

    .dialog-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      padding: 16px 24px 22px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }

    .btn {
      padding: 12px 16px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 1px solid;
    }

    .btn-secondary {
      background: #f8fafc;
      border-color: #e2e8f0;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
      border-color: #d1d5db;
    }

    .btn-primary {
      background: var(--accent-600);
      border-color: var(--accent-500);
      color: #ffffff;
    }

    .btn-primary:hover:not(:disabled) {
      background: var(--accent-700);
      border-color: var(--accent-500);
    }

    .btn-primary:disabled {
      background: #9ca3af;
      border-color: #9ca3af;
      color: #6b7280;
      cursor: not-allowed;
    }

    /* Dark theme rename dialog */
    body.dark-theme .rename-dialog {
      background: #1f2937;
      border-color: #374151;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
    }

    body.dark-theme .dialog-header {
      border-bottom-color: #374151;
      background: #111827;
    }

    body.dark-theme .dialog-header h3 {
      color: #f9fafb !important;
    }

    body.dark-theme .close-btn {
      color: #9ca3af;
    }

    body.dark-theme .close-btn:hover {
      background: #374151;
      color: #f9fafb;
    }

    body.dark-theme .form-group label {
      color: #e5e7eb;
    }

    body.dark-theme .filename-input {
      background: #374151;
      border-color: #4b5563;
      color: #f9fafb;
    }

    body.dark-theme .filename-input:focus {
      border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.2);
    }

    body.dark-theme .filename-input::placeholder {
      color: #6b7280;
    }

    body.dark-theme .dialog-actions {
      border-top-color: #374151;
      background: #111827;
    }

    body.dark-theme .btn-secondary {
      background: #374151;
      border-color: #4b5563;
      color: #e5e7eb;
    }

    body.dark-theme .btn-secondary:hover {
      background: #4b5563;
      border-color: #6b7280;
    }

    body.dark-theme .btn-primary {
      background: var(--accent-600);
      border-color: var(--accent-500);
      color: #ffffff;
    }

    body.dark-theme .btn-primary:hover:not(:disabled) {
      background: var(--accent-700);
      border-color: var(--accent-500);
    }

    body.dark-theme .btn-primary:disabled {
      background: #6b7280;
      border-color: #6b7280;
      color: #9ca3af;
    }
  `]
})
export class RenameDialogComponent {
  @Input() file: FileInfo | null = null;
  @Output() onConfirm = new EventEmitter<string>();
  @Output() onCancel = new EventEmitter<void>();

  newFileName = '';

  ngOnInit() {
    if (this.file) {
      this.newFileName = this.file.name;
    }
  }
} 