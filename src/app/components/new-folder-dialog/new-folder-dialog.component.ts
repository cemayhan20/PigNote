import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NewFolderOptions {
  folderName: string;
}

@Component({
  selector: 'app-new-folder-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="new-folder-dialog-overlay" (click)="onCancel()">
      <div class="new-folder-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ t('newFolderTitle') }}</h3>
          <button class="close-btn" (click)="onCancel()" [title]="t('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="dialog-content">
          <div class="form-group">
            <label for="folderName">{{ t('folderName') }}</label>
            <input 
              type="text" 
              id="folderName" 
              [(ngModel)]="options.folderName" 
              [placeholder]="t('folderNamePlaceholder')"
              class="folder-name-input"
              (keyup.enter)="onCreate()">
          </div>
          
          <div class="folder-info">
            <div class="info-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div class="info-text">
              <p>{{ t('folderInfoLine1') }}</p>
              <small>{{ t('folderInfoLine2') }}</small>
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="onCancel()">{{ t('cancel') }}</button>
          <button class="btn btn-primary" (click)="onCreate()" [disabled]="!options.folderName.trim()">
            {{ t('create') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .new-folder-dialog-overlay {
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
    
    .new-folder-dialog {
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 30px 80px -20px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.06);
      width: min(520px, 92vw);
      border: 1px solid #e2e8f0;
      overflow: hidden;
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
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
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      color: #64748b;
      transition: all 0.2s;
    }
    
    .close-btn:hover {
      background: #e2e8f0;
      color: #475569;
    }
    
    .close-btn svg {
      width: 20px;
      height: 20px;
    }
    
    .dialog-content {
      padding: 24px;
      line-height: 1.6;
    }
    
    .form-group {
      margin-bottom: 24px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }
    
    .folder-name-input {
      width: 100%;
      padding: 14px 16px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      font-size: 15px;
      transition: all 0.2s;
      box-sizing: border-box;
      background: #ffffff;
      line-height: 1.45;
    }
    
    .folder-name-input:focus {
      outline: none;
      border-color: var(--accent-500);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12);
    }
    
    .folder-info {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      background: rgba(236, 72, 153, 0.08); /* açık pembe zemin */
      border-radius: 12px;
      border: 1px solid var(--accent-600); /* koyu pembe border */
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
    }
    
    .info-icon {
      flex-shrink: 0;
    }
    
    .info-icon svg {
      width: 24px;
      height: 24px;
      color: var(--accent-700);
    }
    
    .info-text p {
      margin: 0 0 4px 0;
      font-size: 14px;
      color: #374151; /* light: uygun koyu gri */
      font-weight: 700;
    }
    
    .info-text small {
      color: var(--accent-700);
      font-size: 12px;
      line-height: 1.4;
    }
    
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 22px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    
    .btn {
      padding: 12px 16px;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      font-size: 14px;
    }
    
    .btn-secondary {
      background: #ffffff;
      color: #374151;
      border: 1px solid #d1d5db;
    }
    
    .btn-secondary:hover {
      background: #f8fafc;
      border-color: #9ca3af;
    }
    
    .btn-primary {
      background: var(--accent-600);
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background: var(--accent-700);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.25);
    }
    
    .btn-primary:disabled {
      background: #9ca3af;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
    
    /* Dark theme support */
    body.dark-theme .new-folder-dialog {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
    }
    
    body.dark-theme .dialog-header {
      border-bottom-color: #334155;
      background: #0f172a;
    }
    
    body.dark-theme .dialog-header h3 {
      color: #f8fafc !important;
    }
    
    body.dark-theme .close-btn {
      color: #94a3b8;
    }
    
    body.dark-theme .close-btn:hover {
      background: #334155;
      color: #f1f5f9;
    }
    
    body.dark-theme .form-group label {
      color: #f1f5f9;
    }
    
    :host-context(.dark-theme) .folder-name-input {
      background: #1f2937 !important; /* istenen koyu arka plan */
      border-color: #475569 !important;
      color: #f8fafc !important;
      transition: all 0.2s ease;
    }
    
    :host-context(.dark-theme) .folder-name-input:focus {
      border-color: var(--accent-400) !important; /* diğer pencerelerle aynı vurgu */
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.2) !important;
      background: #1f2937 !important; /* focus'ta da aynı arka plan */
    }
    
    body.dark-theme .folder-name-input::placeholder {
      color: #64748b;
    }
    
    body.dark-theme .folder-info {
      background: rgba(236, 72, 153, 0.12); /* dark için biraz daha doygun pembe zemin */
      border-color: var(--accent-500);
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.25), 0 4px 12px rgba(0, 0, 0, 0.35);
    }
    
    body.dark-theme .info-text p {
      color: #e5e7eb; /* dark: yumuşak açık gri */
      font-weight: 700;
    }
    
    body.dark-theme .info-text small {
      color: #f5d0ea;
      opacity: 0.95;
    }
    
    body.dark-theme .info-icon svg {
      color: #ffffff;
      filter: none;
    }
    
    body.dark-theme .dialog-actions {
      border-top-color: #334155;
      background: #0f172a;
    }
    
    body.dark-theme .btn-secondary {
      background: #334155;
      border: 1px solid #475569;
      color: #f1f5f9;
    }
    
    body.dark-theme .btn-secondary:hover {
      background: #475569;
      border-color: #64748b;
    }
    
    body.dark-theme .btn-primary {
      background: var(--accent-600);
      border: 1px solid var(--accent-500);
      color: #ffffff;
    }
    
    body.dark-theme .btn-primary:hover:not(:disabled) {
      background: var(--accent-700);
      border-color: var(--accent-500);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.3);
    }
    
    body.dark-theme .btn-primary:disabled {
      background: #1e293b;
      border-color: #334155;
      color: #64748b;
      transform: none;
      box-shadow: none;
    }
  `]
})
export class NewFolderDialogComponent implements OnInit {
  @Output() create = new EventEmitter<NewFolderOptions>();
  @Output() cancel = new EventEmitter<void>();

  options: NewFolderOptions = {
    folderName: ''
  };

  get currentLang(): 'tr' | 'en' {
    return document.body.classList.contains('lang-en') ? 'en' : 'tr';
  }

  private readonly dict: Record<'tr' | 'en', Record<string, string>> = {
    tr: {
      newFolderTitle: 'Yeni Klasör Oluştur',
      close: 'Kapat',
      folderName: 'Klasör Adı:',
      folderNamePlaceholder: 'Klasör adını girin',
      folderInfoLine1: 'Yeni klasör mevcut konumda oluşturulacak',
      folderInfoLine2: 'Klasör adı boşluk ve özel karakterler içerebilir',
      cancel: 'İptal',
      create: 'Oluştur'
    },
    en: {
      newFolderTitle: 'Create New Folder',
      close: 'Close',
      folderName: 'Folder Name:',
      folderNamePlaceholder: 'Enter folder name',
      folderInfoLine1: 'The new folder will be created in the current location',
      folderInfoLine2: 'Folder name may include spaces and special characters',
      cancel: 'Cancel',
      create: 'Create'
    }
  };

  t(key: string): string { return this.dict[this.currentLang][key] ?? key; }

  ngOnInit() {
    // Component başlatıldığında varsayılan değerleri ayarla
  }

  onCreate() {
    if (this.options.folderName.trim()) {
      this.create.emit(this.options);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
} 