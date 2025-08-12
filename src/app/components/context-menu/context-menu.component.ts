import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileInfo } from '../../services/file.service';

@Component({
  selector: 'app-context-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="context-menu" 
         [style.left.px]="x" 
         [style.top.px]="y"
         (click)="$event.stopPropagation()">
      <div class="context-menu-item" (click)="onRename.emit(file)" *ngIf="file">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
        {{ t('rename') }}
      </div>
      <div class="context-menu-item" (click)="onDelete.emit($event)" *ngIf="file">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
        </svg>
        {{ t('delete') }}
      </div>
    </div>
  `,
  styles: [`
         .context-menu {
       position: fixed;
       background: #ffffff;
       border: 1px solid #e2e8f0;
       border-radius: 8px;
       box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
       z-index: 99999;
       min-width: 160px;
       overflow: hidden;
       pointer-events: auto;
       animation: contextMenuFadeIn 0.15s ease-out;
     }

    @keyframes contextMenuFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-5px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .context-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      color: #374151;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: none;
      background: none;
      width: 100%;
      text-align: left;
    }

    .context-menu-item:hover {
      background: #f8fafc;
      color: #1f2937;
    }

    .context-menu-item .icon {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      stroke-width: 2;
      fill: none;
      flex-shrink: 0;
    }

         /* Dark theme context menu */
     body.dark-theme .context-menu {
       background: #1f2937;
       border-color: #374151;
       box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.2);
       z-index: 99999;
     }

    body.dark-theme .context-menu-item {
      color: #e5e7eb;
    }

    body.dark-theme .context-menu-item:hover {
      background: #374151;
      color: #f9fafb;
    }
  `]
})
export class ContextMenuComponent {
  @Input() x: number = 0;
  @Input() y: number = 0;
  @Input() file: FileInfo | null = null;
  @Output() onRename = new EventEmitter<FileInfo>();
  @Output() onDelete = new EventEmitter<Event>();

  get currentLang(): 'tr' | 'en' {
    return document.body.classList.contains('lang-en') ? 'en' : 'tr';
  }

  private readonly dict: Record<'tr' | 'en', Record<string, string>> = {
    tr: { rename: 'Yeniden Adlandır', delete: 'Sil' },
    en: { rename: 'Rename', delete: 'Delete' }
  };

  t(key: string): string { return this.dict[this.currentLang][key] ?? key; }
} 