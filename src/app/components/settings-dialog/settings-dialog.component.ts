import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type SettingsTab = 'about' | 'appearance' | 'language' | 'shortcuts';

@Component({
  selector: 'app-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-overlay" (click)="close.emit()">
      <div class="settings-dialog" (click)="$event.stopPropagation()">
        <div class="dialog-header">
          <h3>{{ t('settings') }}</h3>
          <button class="close-btn" (click)="close.emit()" [title]="t('close')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="dialog-body">
          <nav class="tabs">
            <button class="tab" [class.active]="activeTab==='about'" (click)="activeTab='about'">
              {{ t('about') }}
            </button>
            <button class="tab" [class.active]="activeTab==='appearance'" (click)="activeTab='appearance'">
              {{ t('appearance') }}
            </button>
            <button class="tab" [class.active]="activeTab==='language'" (click)="activeTab='language'">
              {{ t('language') }}
            </button>
            <button class="tab" [class.active]="activeTab==='shortcuts'" (click)="activeTab='shortcuts'">
              {{ t('mdShortcuts') }}
            </button>
          </nav>

          <section class="content">
            <ng-container [ngSwitch]="activeTab">
              <div *ngSwitchCase="'about'" class="about">
                <h4>{{ t('app') }}</h4>
                <p><strong>PigNote</strong></p>
                <p>{{ t('version') }}: <code>{{ appVersion }}</code></p>
                <h4>{{ t('developer') }}</h4>
                <p class="license">Developed by Cem Ayhan</p>
              </div>

              <div *ngSwitchCase="'appearance'" class="appearance">
                <label for="fontScale">{{ t('textSize') }}</label>
                <div class="size-control">
                  <div class="slider-row">
                    <span class="min">12</span>
                    <input id="fontScale" type="range" min="12" max="22" [ngModel]="fontSizeInternal" (ngModelChange)="onFontSizeChanged($event)" [style.background]="sliderBackground"/>
                    <span class="max">22</span>
                    <span class="value">{{ fontSizeInternal }} px</span>
                  </div>
                </div>
                <div class="font-preview" [ngStyle]="{ 'font-size.px': fontSizeInternal }">Aa {{ t('textPreview') }}</div>
              </div>

              <div *ngSwitchCase="'language'" class="language">
                <label for="lang">{{ t('language') }}</label>
                <div class="select-wrapper">
                  <select id="lang" [ngModel]="language" (ngModelChange)="languageChange.emit($event)">
                    <option value="tr">{{ t('turkish') }}</option>
                    <option value="en">{{ t('english') }}</option>
                  </select>
                  <span class="select-arrow" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6,9 12,15 18,9"></polyline>
                    </svg>
                  </span>
                </div>
              </div>

              <div *ngSwitchCase="'shortcuts'" class="shortcuts">
                <h4>{{ t('mdShortcuts') }}</h4>
                <ul>
                  <li><code>Ctrl/Cmd + B</code> — {{ t('bold') }}</li>
                  <li><code>Ctrl/Cmd + I</code> — {{ t('italic') }}</li>
                  <li><code>Ctrl/Cmd + K</code> — {{ t('link') }}</li>
                  <li><code>Ctrl/Cmd + S</code> — {{ t('save') }}</li>
                  <li><code>Ctrl/Cmd + Z</code> — {{ t('undo') }}</li>
                  <li><code>Ctrl/Cmd + Shift + Z</code> — {{ t('redo') }}</li>
                  <li><code>#</code> + {{ t('space') }} — {{ t('heading') }}</li>
                  <li><code>-</code> {{ t('or') }} <code>*</code> + {{ t('space') }} — {{ t('list') }}</li>
                  <li><code>></code> + {{ t('space') }} — {{ t('quote') }}</li>
                  <li><code>&#96;&#96;&#96;</code> — {{ t('codeblock') }}</li>
                  <li><code>Ctrl/Cmd + /</code> — {{ t('toggleComment') }}</li>
                </ul>
              </div>
            </ng-container>
          </section>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./settings-dialog.component.scss']
})
export class SettingsDialogComponent {
  @Input() appVersion = '0.1.0';
  @Input() language: 'tr' | 'en' = 'tr';
  @Input() fontSize = 14;
  @Output() close = new EventEmitter<void>();
  @Output() languageChange = new EventEmitter<'tr' | 'en'>();
  @Output() fontSizeChange = new EventEmitter<number>();

  activeTab: SettingsTab = 'about';
  fontSizeInternal = this.fontSize;
  marks: number[] = [12, 14, 16, 18, 20, 22];
  sliderBackground = '';
  private readonly minFont = 12;
  private readonly maxFont = 22;

  private readonly dict: Record<'tr' | 'en', Record<string, string>> = {
    tr: {
      close: 'Kapat',
      about: 'Hakkında',
      appearance: 'Görünüm',
      settings: 'Ayarlar',
      app: 'Uygulama',
      version: 'Sürüm',
      developer: 'Geliştirici',
      textSize: 'Metin boyutu',
      textPreview: 'Metin Önizleme',
      language: 'Dil',
      turkish: 'Türkçe',
      english: 'English',
      mdShortcuts: 'Markdown Kısayolları',
      bold: 'Kalın',
      italic: 'İtalik',
      link: 'Bağlantı',
      save: 'Kaydet',
      undo: 'Geri al',
      redo: 'Yinele',
      heading: 'Başlık',
      list: 'Liste',
      quote: 'Alıntı',
      codeblock: 'Kod bloğu',
      toggleComment: 'Yorum satırı',
      space: 'boşluk',
      or: 'veya'
    },
    en: {
      close: 'Close',
      about: 'About',
      appearance: 'Appearance',
      settings: 'Settings',
      app: 'Application',
      version: 'Version',
      developer: 'Developer',
      textSize: 'Text size',
      textPreview: 'Text Preview',
      language: 'Language',
      turkish: 'Turkish',
      english: 'English',
      mdShortcuts: 'Markdown Shortcuts',
      bold: 'Bold',
      italic: 'Italic',
      link: 'Link',
      save: 'Save',
      undo: 'Undo',
      redo: 'Redo',
      heading: 'Heading',
      list: 'List',
      quote: 'Quote',
      codeblock: 'Code block',
      toggleComment: 'Toggle comment',
      space: 'space',
      or: 'or'
    }
  };

  t(key: string): string { return this.dict[this.language]?.[key] ?? key; }

  ngOnChanges() {
    this.fontSizeInternal = this.fontSize;
    this.updateSliderBackground();
  }

  onFontSizeChanged(size: number) {
    this.fontSizeInternal = size;
    this.fontSizeChange.emit(size);
    this.updateSliderBackground();
  }

  incrementFont() {
    const next = Math.min(22, (this.fontSizeInternal || 14) + 1);
    this.onFontSizeChanged(next);
  }

  decrementFont() {
    const prev = Math.max(12, (this.fontSizeInternal || 14) - 1);
    this.onFontSizeChanged(prev);
  }

  private updateSliderBackground() {
    const value = Math.min(this.maxFont, Math.max(this.minFont, this.fontSizeInternal || this.minFont));
    const percent = ((value - this.minFont) / (this.maxFont - this.minFont)) * 100;
    const isDark = document.body.classList.contains('dark-theme');
    const active = 'var(--accent-500)';
    const rest = isDark ? '#334155' : '#e5e7eb';
    this.sliderBackground = `linear-gradient(90deg, ${active} 0%, ${active} ${percent}%, ${rest} ${percent}%, ${rest} 100%)`;
  }
}


