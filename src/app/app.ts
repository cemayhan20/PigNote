// frontend/src/app/app.ts
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { EditorComponent } from './editor/editor.component';
import { FileExplorerComponent } from './components/file-explorer/file-explorer.component';
import { ExportDialogComponent, ExportOptions } from './components/export-dialog/export-dialog.component';
import { NewFileDialogComponent, NewFileOptions } from './components/new-file-dialog/new-file-dialog.component';
import { NewFolderDialogComponent, NewFolderOptions } from './components/new-folder-dialog/new-folder-dialog.component';
import { DeleteFileDialogComponent, DeleteFileOptions } from './components/delete-file-dialog/delete-file-dialog.component';
import { NotificationComponent, NotificationOptions } from './components/notification/notification.component';
import { FileService } from './services/file.service';
import { SettingsDialogComponent } from 'app/components/settings-dialog/settings-dialog.component';
import { listen } from '@tauri-apps/api/event';
// Not: file-drop için pencere API'sine gerek yok; global event ile dinleyeceğiz

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    EditorComponent, 
    FileExplorerComponent, 
    ExportDialogComponent,
    NewFileDialogComponent,
    NewFolderDialogComponent,
    DeleteFileDialogComponent,
    NotificationComponent,
    SettingsDialogComponent
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  protected readonly title = signal('Pignote');
  currentContent = signal('# Hoş Geldiniz\n\nMarkdown editörünüze hoş geldiniz!\n\n## Özellikler\n\n- ✏️ Monaco Editor ile zengin editing\n- 👁️ Anlık markdown önizleme\n- 📁 Dosya yönetimi\n- 💾 Otomatik kaydetme\n- 🔍 Metin arama');
  currentFilePath = signal('');
  isFilePanelOpen = signal(true);
  showPreview = signal(true);
  isDarkMode = signal(false);
  showExportDialog = signal(false);
  showNewFileDialog = signal(false);
  showNewFolderDialog = signal(false);
  showDeleteFileDialog = signal(false);
  isExporting = signal(false);
  isSaving = signal(false);
  currentDirectoryPath = signal('');
  refreshTrigger = signal(0);
  showSettingsDialog = signal(false);
  appVersion = '0.1.0';
  uiLanguage: 'tr' | 'en' = 'tr';
  private readonly i18n: Record<'tr' | 'en', Record<string, string>> = {
    tr: {
      export: 'Dışa Aktar',
      exporting: 'Dışa Aktarılıyor...',
      pleaseWait: 'Lütfen bekleyin',
      save: 'Kaydet',
      preview: 'Önizleme',
      previewToggle: 'Önizleme Aç/Kapat',
      settings: 'Ayarlar',
      cancel: 'Vazgeç',
      themeDark: 'Koyu Tema',
      themeLight: 'Açık Tema',
      toggleFilePanel: 'Sol Panel Aç/Kapat'
    },
    en: {
      export: 'Export',
      exporting: 'Exporting...',
      pleaseWait: 'Please wait',
      save: 'Save',
      preview: 'Preview',
      previewToggle: 'Toggle Preview',
      settings: 'Settings',
      cancel: 'Cancel',
      themeDark: 'Dark Theme',
      themeLight: 'Light Theme',
      toggleFilePanel: 'Toggle Left Panel'
    }
  };

  t(key: string): string { return this.i18n[this.uiLanguage][key] ?? key; }
  editorFontSize = signal(14);
  deleteFileOptions = signal<DeleteFileOptions>({
    fileName: '',
    filePath: '',
    isDirectory: false
  });
  notifications = signal<NotificationOptions[]>([]);

  private autoSaveTimer: any = null;
  private readonly autoSaveDelayMs = 1000; // içerik durduktan 1 sn sonra kaydet
  private unlistenFileDrop?: () => void;
  private unlistenFileDropHover?: () => void;
  private unlistenFileDropCancel?: () => void;

  constructor(private fileService: FileService, private titleService: Title) {
    this.titleService.setTitle('Pignote');
    // Tauri dosya sürükle-bırak dinleyicileri
    this.initializeFileDropListeners();
  }

  ngOnInit(): void {
    this.applyDesktopGuards();
    this.preventBrowserDefaultDrop();
  }

  onFileSelected(event: { path: string, content: string }) {
    this.currentContent.set(event.content);
    this.currentFilePath.set(event.path);
  }

  onContentChanged(content: string) {
    this.currentContent.set(content);
    // Otomatik kaydet: mevcut timer'ı sıfırla ve yeniden başlat
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }
    this.autoSaveTimer = setTimeout(() => {
      const path = this.currentFilePath();
      if (!path) {
        return; // isimsiz dosya için otomatik kaydetme tetiklenmez
      }
      this.autoSaveFile(path, this.currentContent());
    }, this.autoSaveDelayMs);
  }

  onSaveRequested(content: string) {
    const path = this.currentFilePath();
    if (path) {
      this.saveFile(path, content);
    } else {
      this.saveFileAs(content);
    }
  }

  toggleFilePanel() {
    this.isFilePanelOpen.set(!this.isFilePanelOpen());
  }

  togglePreview() {
    this.showPreview.set(!this.showPreview());
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
    this.applyTheme();
  }

  toggleSettings() {
    this.showSettingsDialog.set(true);
  }

  private applyTheme() {
    const isDark = this.isDarkMode();
    document.body.classList.toggle('dark-theme', isDark);
    
    // Monaco Editor temasını da değiştir
    if ((window as any).monaco && (window as any).monaco.editor) {
      const theme = isDark ? 'pink-vs-dark' : 'pink-vs';
      (window as any).monaco.editor.setTheme(theme);
      
      // Tema değişimi sonrası tüm editörlerin layout'unu yeniden hesapla
      setTimeout(() => {
        const editors = (window as any).monaco.editor.getEditors();
        editors.forEach((editor: any) => {
          if (editor && typeof editor.layout === 'function') {
            editor.layout();
          }
        });
      }, 150);
    }
  }

  exportContent() {
    // Yeni export akışı: diyalogu aç
    const content = this.currentContent();
    if (!content || content.trim() === '') {
      this.showToast('❌ Dışa aktarılacak içerik bulunamadı!');
      return;
    }
    this.showExportDialog.set(true);
  }

  cancelExport() {
    if (!this.isExporting()) return;
    // Kullanıcı algısı için anında kapat
    this.isExporting.set(false);
    this.showToast('İşlem iptal ediliyor...');
    // Arkaplanda iptal komutunu gönder
    this.fileService.cancelExport().subscribe({
      next: () => {
        this.showToast('İşlem iptal edildi');
      },
      error: () => {
        this.showToast('İşlem iptal edildi');
      }
    });
  }

  onExport(options: ExportOptions) {
    const content = this.currentContent();
    if (!content) {
      this.showToast('❌ Dışa aktarılacak içerik bulunamadı');
      return;
    }

    const filename = options.filename || 'export';
    const fullPath = filename;

    this.isExporting.set(true);
    this.showExportDialog.set(false);

    const isDark = this.isDarkMode();
    const previewHtml = (document.querySelector('.preview-container div') as HTMLElement)?.innerHTML || '';
    const currentPath = this.currentFilePath();
    const baseDir = currentPath ? currentPath.split(/\\|\//).slice(0, -1).join('\\') : this.currentDirectoryPath();

    if (options.format === 'pdf') {
      this.fileService.exportToPdf(previewHtml || content, fullPath, isDark, baseDir).subscribe({
        next: (outputPath) => {
          this.isExporting.set(false);
          this.showToast(`✅ PDF dosyası başarıyla oluşturuldu: ${outputPath}`);
        },
        error: (error) => {
          this.isExporting.set(false);
          this.showToast(`❌ PDF oluşturma hatası: ${error}`);
        }
      });
    } else if (options.format === 'html') {
      this.fileService.exportToHtml(previewHtml || content, fullPath, isDark, baseDir).subscribe({
        next: (outputPath) => {
          this.isExporting.set(false);
          this.showToast(`✅ HTML dosyası başarıyla oluşturuldu: ${outputPath}`);
        },
        error: (error) => {
          this.isExporting.set(false);
          this.showToast(`❌ HTML oluşturma hatası: ${error}`);
        }
      });
    } else if (options.format === 'docx') {
      // DOCX için önizleme HTML'sini gönder ki görünüm birebir ayni olsun
      this.fileService.exportToDocx(previewHtml || content, fullPath, isDark, baseDir).subscribe({
        next: (outputPath) => {
          this.isExporting.set(false);
          this.showToast(`✅ DOCX dosyası başarıyla oluşturuldu: ${outputPath}`);
        },
        error: (error) => {
          this.isExporting.set(false);
          this.showToast(`❌ DOCX oluşturma hatası: ${error}`);
        }
      });
    }
  }

  onExportCancel() {
    this.showExportDialog.set(false);
  }

  onNewFileRequested() {
    this.showNewFileDialog.set(true);
  }

  onNewFolderRequested() {
    this.showNewFolderDialog.set(true);
  }

  onCurrentPathChanged(path: string) {
    this.currentDirectoryPath.set(path);
  }

  onRefreshRequested() {
    // File explorer'ı yenilemek için trigger'ı artır
    this.refreshTrigger.update(trigger => trigger + 1);
  }

  onNewFileCreate(options: NewFileOptions) {
    // Mevcut dizin path'ini kullan
    const currentPath = this.currentDirectoryPath();
    const fileName = `${options.filename}.${options.fileType}`;
    const filePath = `${currentPath}\\${fileName}`;
    const defaultContent = options.fileType === 'md' 
      ? `# ${options.filename}\n\nBuraya notlarınızı yazabilirsiniz...\n`
      : `${options.filename}\n\nBuraya notlarınızı yazabilirsiniz...\n`;
    
    this.fileService.writeFile(filePath, defaultContent).subscribe({
      next: () => {
        this.showToast(`✅ Dosya başarıyla oluşturuldu: ${fileName}`);
        this.showNewFileDialog.set(false);
        // Dosyayı aç
        this.currentContent.set(defaultContent);
        this.currentFilePath.set(filePath);
        // File explorer'ı yenile
        this.onRefreshRequested();
      },
      error: (error) => {
        this.showToast(`❌ Dosya oluşturma hatası: ${error}`);
      }
    });
  }

  onNewFileCancel() {
    this.showNewFileDialog.set(false);
  }

  onNewFolderCreate(options: NewFolderOptions) {
    // Mevcut dizin path'ini kullan
    const currentPath = this.currentDirectoryPath();
    const folderPath = `${currentPath}\\${options.folderName}`;
    
    this.fileService.createDirectory(folderPath).subscribe({
      next: () => {
        this.showToast(`✅ Klasör başarıyla oluşturuldu: ${options.folderName}`);
        this.showNewFolderDialog.set(false);
        // File explorer'ı yenile
        this.onRefreshRequested();
      },
      error: (error) => {
        this.showToast(`❌ Klasör oluşturma hatası: ${error}`);
      }
    });
  }

  onNewFolderCancel() {
    this.showNewFolderDialog.set(false);
  }

  onDeleteFileRequested(options: DeleteFileOptions) {
    this.deleteFileOptions.set(options);
    this.showDeleteFileDialog.set(true);
  }

  onDeleteFileConfirm(options: DeleteFileOptions) {
    this.fileService.deleteFile(options.filePath).subscribe({
      next: () => {
        this.showToast(`✅ ${options.isDirectory ? 'Klasör' : 'Dosya'} başarıyla silindi: ${options.fileName}`);
        this.showDeleteFileDialog.set(false);
        // File explorer'ı yenile
        this.onRefreshRequested();
      },
      error: (error) => {
        this.showToast(`❌ ${options.isDirectory ? 'Klasör' : 'Dosya'} silme hatası: ${error}`);
      }
    });
  }

  onDeleteFileCancel() {
    this.showDeleteFileDialog.set(false);
  }

  showNotification(options: NotificationOptions) {
    const currentNotifications = this.notifications();
    this.notifications.set([...currentNotifications, options]);
  }

  removeNotification(index: number) {
    const currentNotifications = this.notifications();
    currentNotifications.splice(index, 1);
    this.notifications.set([...currentNotifications]);
  }

  showToast(message: string) {
    // Eski toast sistemini yeni notification sistemi ile değiştir
    const type = message.includes('❌') ? 'error' : 
                 message.includes('✅') ? 'success' : 
                 message.includes('⚠️') ? 'warning' : 'info';
    
    const cleanMessage = message.replace(/[❌✅⚠️]/g, '').trim();
    
    this.showNotification({
      message: cleanMessage,
      type: type,
      duration: 3000,
      showIcon: true
    });
  }

  getDefaultExportFilename(): string {
    const currentFile = this.currentFilePath();
    if (currentFile) {
      const pathParts = currentFile.split(/[\\\/]/);
      const fileName = pathParts[pathParts.length - 1];
      return fileName.replace(/\.(md|txt)$/, '');
    }
    return 'export';
  }

  saveCurrentFile() {
    const path = this.currentFilePath();
    const content = this.currentContent();
    
    if (path) {
      this.saveFile(path, content);
    } else {
      this.saveFileAs(content);
    }
  }

  private saveFile(path: string, content: string) {
    this.isSaving.set(true);
    this.fileService.writeFile(path, content).subscribe({
      next: () => {
        this.showSaveNotification('Kaydedildi!');
        // kısa süreli spinner
        setTimeout(() => this.isSaving.set(false), 500);
      },
      error: (error) => {
        this.showToast(`❌ Kaydetme hatası: ${error}`);
        this.isSaving.set(false);
      }
    });
  }

  private saveFileAs(content: string) {
    this.isSaving.set(true);
    this.fileService.saveFileDialog(content).subscribe({
      next: (path) => {
        if (path) {
          this.currentFilePath.set(path);
          this.showSaveNotification('Kaydedildi!');
          setTimeout(() => this.isSaving.set(false), 500);
        }
      },
      error: (error) => {
        this.showToast(`❌ Kaydetme hatası: ${error}`);
        this.isSaving.set(false);
      }
    });
  }

  // Otomatik kaydet (sessiz, bildirim göstermeden)
  private autoSaveFile(path: string, content: string) {
    this.isSaving.set(true);
    this.fileService.writeFile(path, content).subscribe({
      next: () => {
        // Sessiz başarı, sadece kısa süreli spinner göster
        setTimeout(() => this.isSaving.set(false), 400);
      },
      error: (error) => {
        this.showToast(`❌ Otomatik kaydetme hatası: ${error}`);
        this.isSaving.set(false);
      }
    });
  }

  private showSaveNotification(message: string) {
    this.showNotification({
      message: message,
      type: 'success',
      duration: 2000,
      showIcon: true
    });
  }

  onSettingsClose() {
    this.showSettingsDialog.set(false);
  }

  onLanguageChange(lang: 'tr' | 'en') {
    this.uiLanguage = lang;
    document.body.classList.toggle('lang-en', lang === 'en');
  }

  onFontSizeChange(size: number) {
    this.editorFontSize.set(size);
  }

  ngOnDestroy(): void {
    try { this.unlistenFileDrop?.(); } catch {}
    try { this.unlistenFileDropHover?.(); } catch {}
    try { this.unlistenFileDropCancel?.(); } catch {}

    // Global dinleyicileri kaldır
    try { window.removeEventListener('contextmenu', this.onContextMenuCapture as any, true); } catch {}
    try { window.removeEventListener('wheel', this.onWheelWithCtrl as any, true); } catch {}
    try { window.removeEventListener('keydown', this.onKeydownIntercept as any, true); } catch {}
  }

  private isTauriEnv(): boolean {
    // Tauri dev ve prod ortamlarında mevcut özel alanlar
    const w: any = window as any;
    return !!(w && (w.__TAURI_IPC__ || w.__TAURI_INTERNALS__));
  }

  private async initializeFileDropListeners() {
    if (!this.isTauriEnv()) {
      return; // tarayıcıda çalışırken atla
    }

    try {
      // Global Tauri event: 'tauri://file-drop'
      this.unlistenFileDrop = await listen<string[] | { paths: string[] }>('tauri://file-drop', (e) => {
        const payload: any = e.payload;
        const paths: string[] = Array.isArray(payload) ? payload : payload?.paths || [];
        if (!paths || paths.length === 0) return;
        const firstPath = paths[0];
        if (!this.isSupportedTextOrMarkdown(firstPath)) {
          this.showToast('⚠️ Yalnızca .md ve .txt dosyaları desteklenir');
          return;
        }
        this.fileService.readFile(firstPath).subscribe({
          next: (content) => {
            this.currentFilePath.set(firstPath);
            this.currentContent.set(content);
          },
          error: (error) => {
            this.showToast(`❌ Dosya açılamadı: ${error}`);
          }
        });
      });

      // Hover ve iptal event'lerini de bağla (isteğe bağlı)
      this.unlistenFileDropHover = await listen('tauri://file-drop-hover', () => {});
      this.unlistenFileDropCancel = await listen('tauri://file-drop-cancelled', () => {});
    } catch (err) {
      console.warn('File drop listener kurulamadı:', err);
    }
  }

  // Tarayıcıda dosya bırakıldığında varsayılan açma davranışını engelle
  // (Tauri event'i ayrı çalışır; bu sadece dev server'da link açılmasını önler)
  private preventBrowserDefaultDrop() {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
  }

  // Masaüstü uygulama gibi davranması için web davranışlarını kapat
  private onContextMenuCapture = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    // Monaco editör içinde sağ tık menüsüne izin ver, diğer her yerde engelle
    const isInMonaco = !!target?.closest('.monaco-editor');
    if (!isInMonaco) {
      e.preventDefault();
    }
  };

  private onWheelWithCtrl = (e: WheelEvent) => {
    // Ctrl/Cmd ile zoom/pinch yapılmasını engelle
    if (e.ctrlKey || (e as any).metaKey) {
      e.preventDefault();
    }
  };

  private onKeydownIntercept = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    // Devtools / yenileme / yazdırma / pencere kapama gibi tarayıcı kısayollarını engelle
    if (
      key === 'f5' ||
      key === 'f12' ||
      (ctrlOrMeta && key === 'r') ||
      (ctrlOrMeta && key === 'p') ||
      (ctrlOrMeta && key === 'w') ||
      (ctrlOrMeta && e.shiftKey && (key === 'i' || key === 'c' || key === 'j')) ||
      (ctrlOrMeta && (key === '=' || key === '+' || key === '-' || key === '0')) ||
      (e.altKey && (key === 'arrowleft' || key === 'arrowright'))
    ) {
      // Ctrl+S bilinçli olarak bloklanmaz (uygulama kaydı için kullanılabilir)
      e.preventDefault();
      e.stopPropagation();
    }
  };

  private applyDesktopGuards() {
    if (!this.isTauriEnv()) {
      return;
    }
    // Sağ tık menüsünü (Monaco harici) kapat
    window.addEventListener('contextmenu', this.onContextMenuCapture, { capture: true });
    // Ctrl/Cmd ile zoom/pinch engelle
    window.addEventListener('wheel', this.onWheelWithCtrl, { capture: true, passive: false });
    // Tarayıcı kısayollarını engelle
    window.addEventListener('keydown', this.onKeydownIntercept, { capture: true });
  }

  private isSupportedTextOrMarkdown(path: string): boolean {
    const ext = path?.split('.').pop()?.toLowerCase();
    return ext === 'md' || ext === 'markdown' || ext === 'txt';
  }
}
