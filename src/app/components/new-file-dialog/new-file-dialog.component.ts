import { Component, EventEmitter, Output, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface NewFileOptions {
  filename: string;
  fileType: 'txt' | 'md';
}

@Component({
  selector: 'app-new-file-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="new-file-dialog-overlay" (click)="onCancel()">
      <div class="new-file-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ t('newFileTitle') }}</h3>
          <button class="close-btn" (click)="onCancel()" [title]="t('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="dialog-content">
          <div class="form-group">
            <label for="filename">{{ t('fileName') }}</label>
            <input 
              type="text" 
              id="filename" 
              [(ngModel)]="options.filename" 
              [placeholder]="t('fileNamePlaceholder')"
              class="filename-input"
              (input)="updateFullFilename()">
          </div>
          
          <div class="form-group">
            <label>{{ t('fileType') }}</label>
            <div class="file-type-options">
              <label class="file-type-option">
                <input type="radio" name="fileType" value="txt" [(ngModel)]="options.fileType" (change)="updateFullFilename()">
                <div class="file-type-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                  <span>TXT</span>
                   <small>{{ t('txtDesc') }}</small>
                </div>
              </label>
              
              <label class="file-type-option">
                <input type="radio" name="fileType" value="md" [(ngModel)]="options.fileType" (change)="updateFullFilename()">
                <div class="file-type-card">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                  </svg>
                  <span>MD</span>
                   <small>{{ t('mdDesc') }}</small>
                </div>
              </label>
            </div>
          </div>
          
          <div class="form-group">
            <label>{{ t('fullFileName') }}</label>
            <div class="full-filename-display">
              {{ getFullFilename() }}
            </div>
          </div>
        </div>
        
        <div class="dialog-actions">
          <button class="btn btn-secondary" (click)="onCancel()">{{ t('cancel') }}</button>
          <button class="btn btn-primary" (click)="onCreate()" [disabled]="!options.filename.trim()">
            {{ t('create') }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .new-file-dialog-overlay {
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
    
    .new-file-dialog {
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
    
    .form-group:last-child {
      margin-bottom: 0;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }
    
    .filename-input {
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
    
    .filename-input:focus {
      outline: none;
      border-color: var(--accent-500);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.12);
    }
    
    .file-type-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    
    .file-type-option {
      cursor: pointer;
    }
    
    .file-type-option input[type="radio"] {
      display: none;
    }
    
    .file-type-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 18px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      transition: all 0.2s;
      background: #f8fafc;
    }
    
    .file-type-card:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    }
    
    .file-type-card svg {
      width: 28px;
      height: 28px;
      margin-bottom: 8px;
      color: #64748b;
    }
    
    .file-type-card span {
      font-weight: 700;
      color: #111827;
      font-size: 14px;
      margin-bottom: 4px;
      letter-spacing: -0.1px;
    }
    
    .file-type-card small {
      color: #64748b;
      font-size: 12px;
      line-height: 1.3;
    }
    
    .file-type-option input[type="radio"]:checked + .file-type-card {
      border-color: var(--accent-600);
      background: rgba(236, 72, 153, 0.08); /* açık pembe vurgu */
      transform: translateY(-2px);
      box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15), 0 8px 25px rgba(var(--accent-rgb), 0.18);
    }
    
    .file-type-option input[type="radio"]:checked + .file-type-card svg,
    .file-type-option input[type="radio"]:checked + .file-type-card span {
      color: var(--accent-700);
    }
    
    .file-type-option input[type="radio"]:checked + .file-type-card small {
      color: var(--accent-600);
    }
    
    .full-filename-display {
      padding: 12px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-size: 15px;
      color: #374151;
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
      color: #ffffff;
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
    body.dark-theme .new-file-dialog {
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
    
    :host-context(.dark-theme) .file-type-card {
      background: #334155 !important;
      border-color: rgba(var(--accent-rgb), 0.35) !important; /* pembe tonlu ince çerçeve */
      color: #f8fafc;
    }
    
    :host-context(.dark-theme) .file-type-card:hover {
      background: #475569 !important;
      border-color: #64748b !important;
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }
    
    :host-context(.dark-theme) .file-type-card span {
      color: #f1f5f9;
    }
    
    :host-context(.dark-theme) .file-type-card small {
      color: #94a3b8;
    }
    
    :host-context(.dark-theme) .file-type-card svg {
      color: #94a3b8;
    }
    
    :host-context(.dark-theme) .file-type-option input[type="radio"]:checked + .file-type-card {
      background: rgba(236, 72, 153, 0.10);
      border-color: var(--accent-500);
      color: #f8fafc;
      transform: translateY(-2px);
      box-shadow:
        0 12px 32px rgba(var(--accent-rgb), 0.20),
        0 0 0 2px rgba(var(--accent-rgb), 0.28),
        0 0 24px rgba(var(--accent-rgb), 0.35);
    }
    
    :host-context(.dark-theme) .file-type-option input[type="radio"]:checked + .file-type-card svg,
    :host-context(.dark-theme) .file-type-option input[type="radio"]:checked + .file-type-card span {
      color: var(--accent-400);
    }
    
    :host-context(.dark-theme) .file-type-option input[type="radio"]:checked + .file-type-card small {
      color: var(--accent-200);
    }

    /* Basma efekti - kartlar */
    .file-type-card:active {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }
    :host-context(.dark-theme) .file-type-card:active {
      transform: translateY(-1px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.22);
    }
    
    body.dark-theme .filename-input {
      background: #334155;
      border-color: #475569;
      color: #f8fafc;
    }
    
    body.dark-theme .filename-input:focus {
      border-color: var(--accent-400);
      box-shadow: 0 0 0 3px rgba(var(--accent-rgb), 0.2);
    }
    
    body.dark-theme .full-filename-display {
      background: #334155;
      border-color: #475569;
      color: #f8fafc;
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
      border-color: var(--accent-400);
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
export class NewFileDialogComponent implements OnInit {
  @Output() create = new EventEmitter<NewFileOptions>();
  @Output() cancel = new EventEmitter<void>();

  options: NewFileOptions = {
    filename: '',
    fileType: 'md'
  };

  get currentLang(): 'tr' | 'en' {
    return document.body.classList.contains('lang-en') ? 'en' : 'tr';
  }

  private readonly dict: Record<'tr' | 'en', Record<string, string>> = {
    tr: {
      newFileTitle: 'Yeni Dosya Oluştur',
      close: 'Kapat',
      fileName: 'Dosya Adı:',
      fileNamePlaceholder: 'Dosya adını girin',
      fileType: 'Dosya Türü:',
      txtDesc: 'Metin dosyası',
      mdDesc: 'Markdown dosyası',
      fullFileName: 'Tam Dosya Adı:',
      cancel: 'İptal',
      create: 'Oluştur'
    },
    en: {
      newFileTitle: 'Create New File',
      close: 'Close',
      fileName: 'File Name:',
      fileNamePlaceholder: 'Enter file name',
      fileType: 'File Type:',
      txtDesc: 'Plain text file',
      mdDesc: 'Markdown file',
      fullFileName: 'Full File Name:',
      cancel: 'Cancel',
      create: 'Create'
    }
  };

  t(key: string): string { return this.dict[this.currentLang][key] ?? key; }

  ngOnInit() {
    // Component başlatıldığında varsayılan değerleri ayarla
  }

  updateFullFilename() {
    // Kullanıcı dosya adını yazarken uzantıyı otomatik olarak ekle
    const filename = this.options.filename;
    if (filename && !filename.includes('.')) {
      // Uzantı yoksa ekle
      this.options.filename = filename;
    } else if (filename && filename.includes('.')) {
      // Uzantı varsa, sadece dosya adını al
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      this.options.filename = nameWithoutExt;
    }
  }

  getFullFilename(): string {
    const filename = this.options.filename.trim();
    if (!filename) return '';
    return `${filename}.${this.options.fileType}`;
  }

  onCreate() {
    if (this.options.filename.trim()) {
      this.create.emit(this.options);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
} 