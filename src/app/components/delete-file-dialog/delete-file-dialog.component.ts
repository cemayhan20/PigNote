import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DeleteFileOptions {
  fileName: string;
  filePath: string;
  isDirectory: boolean;
}

@Component({
  selector: 'app-delete-file-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="delete-file-dialog-overlay" (click)="onCancel()">
      <div class="delete-file-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>Dosya Sil</h3>
          <button class="close-btn" (click)="onCancel()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="dialog-content">
          <div class="warning-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
            </svg>
          </div>
          
          <div class="warning-message">
            <h4>{{ options.isDirectory ? 'Klasörü' : 'Dosyayı' }} silmek istediğinizden emin misiniz?</h4>
            <p class="file-name">{{ options.fileName }}</p>
            <p class="warning-text">
              {{ options.isDirectory ? 'Bu klasör ve içindeki tüm dosyalar kalıcı olarak silinecektir.' : 'Bu dosya kalıcı olarak silinecektir.' }}
            </p>
            <p class="irreversible-warning">
              <strong>Bu işlem geri alınamaz.</strong>
            </p>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="onCancel()">Vazgeç</button>
          <button class="btn btn-danger" (click)="onDelete()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3,6 5,6 21,6"></polyline>
              <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
            </svg>
            {{ options.isDirectory ? 'Klasörü Sil' : 'Dosyayı Sil' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .delete-file-dialog-overlay {
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
      z-index: 1000;
    }
    
    .delete-file-dialog {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06);
      width: min(520px, 92vw);
      overflow-x: hidden;
      border: 1px solid #e5e7eb;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 22px 24px;
      border-bottom: 1px solid #e5e7eb;
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
      cursor: pointer;
      padding: 6px;
      border-radius: 6px;
      color: #6b7280;
      transition: all 0.2s;
    }
    
    .close-btn:hover {
      background: #f3f4f6;
      color: #374151;
    }
    
    .close-btn svg {
      width: 18px;
      height: 18px;
    }
    
    .dialog-content {
      padding: 24px;
      text-align: center;
      line-height: 1.6;
    }
    
    .warning-icon {
      margin-bottom: 16px;
    }
    
    .warning-icon svg {
      width: 48px;
      height: 48px;
      color: #ef4444;
    }
    
    .warning-message h4 {
      margin: 0 0 12px 0;
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      letter-spacing: -0.1px;
    }
    
    .file-name {
      margin: 0 0 12px 0;
      font-size: 16px;
      font-weight: 600;
      color: #ef4444;
      background: #fef2f2;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid #fecaca;
      display: inline-block;
    }
    
    .warning-text {
      margin: 0;
      font-size: 15px;
      color: #6b7280;
      line-height: 1.5;
    }
    
    .warning-text strong {
      color: #ef4444;
    }

    .irreversible-warning {
      margin-top: 8px;
      font-size: 15px;
      color: #ef4444;
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px 22px;
      border-top: 1px solid #e5e7eb;
    }
    
    .btn {
      padding: 12px 16px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }
    
    .btn-secondary:hover {
      background: #e5e7eb;
    }
    
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    
    .btn-danger:hover {
      background: #dc2626;
    }
    
    .btn-danger svg {
      width: 16px;
      height: 16px;
    }
    
    /* Dark theme support */
    body.dark-theme .delete-file-dialog {
      background: #0a0a0a;
      color: #f8fafc;
      border: 1px solid #2a2a2a;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    
    body.dark-theme .dialog-header {
      border-bottom-color: #2a2a2a;
      background: #0a0a0a;
    }
    
    body.dark-theme .dialog-header h3 {
      color: #ffffff;
    }
    
    body.dark-theme .close-btn {
      color: #9ca3af;
    }
    
    body.dark-theme .close-btn:hover {
      background: #1f2937;
      color: #ffffff;
    }
    
    body.dark-theme .warning-message h4 {
      color: #ffffff;
    }
    
    body.dark-theme .file-name {
      background: #450a0a;
      border-color: #dc2626;
      color: #fca5a5;
    }
    
    body.dark-theme .warning-text {
      color: #9ca3af;
    }

    body.dark-theme .irreversible-warning {
      color: #ef4444;
    }
    
    body.dark-theme .dialog-actions {
      border-top-color: #2a2a2a;
      background: #0a0a0a;
    }
    
    body.dark-theme .btn-secondary {
      background: #374151;
      border: 1px solid #4b5563;
      color: #f8fafc;
    }
    
    body.dark-theme .btn-secondary:hover {
      background: #4b5563;
      border-color: #6b7280;
    }
    
    body.dark-theme .btn-danger {
      background: #dc2626;
      border: 1px solid #ef4444;
      color: #ffffff;
    }
    
    body.dark-theme .btn-danger:hover {
      background: #b91c1c;
      border-color: #f87171;
    }
  `]
})
export class DeleteFileDialogComponent implements OnInit {
  @Output() delete = new EventEmitter<DeleteFileOptions>();
  @Output() cancel = new EventEmitter<void>();

  @Input() options: DeleteFileOptions = {
    fileName: '',
    filePath: '',
    isDirectory: false
  };

  ngOnInit() {
    // Component başlatıldığında varsayılan değerleri ayarla
  }

  onDelete() {
    this.delete.emit(this.options);
  }

  onCancel() {
    this.cancel.emit();
  }
} 