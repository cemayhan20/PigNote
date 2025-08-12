import { Component, OnInit, Output, EventEmitter, Input, OnChanges, SimpleChanges, ComponentRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FileService, FileInfo } from '../../services/file.service';
import { DeleteFileOptions } from '../delete-file-dialog/delete-file-dialog.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { RenameDialogComponent } from '../rename-dialog/rename-dialog.component';
import { PortalService } from '../../services/portal.service';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { desktopDir } from '@tauri-apps/api/path';

@Component({
  selector: 'app-file-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="file-explorer" [class.collapsed]="!isOpen">
      <div class="toggle-button" (click)="togglePanel()">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline *ngIf="isOpen" points="15,18 9,12 15,6"></polyline>
          <polyline *ngIf="!isOpen" points="9,18 15,12 9,6"></polyline>
        </svg>
      </div>
      
      <div class="panel-content" *ngIf="isOpen">
        <div class="folder-header">
          <div class="folder-title" [attr.aria-label]="t('explorer')">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            {{ t('explorer') }}
          </div>
                     <div class="header-actions">
             <button (click)="goBack()" class="action-btn" *ngIf="canGoBack()" [title]="t('back')">
               <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <polyline points="15,18 9,12 15,6"></polyline>
               </svg>
             </button>
             <button (click)="goHome()" class="action-btn" [title]="t('home')">
               <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                 <polyline points="9,22 9,12 15,12 15,22"></polyline>
               </svg>
             </button>
             <button (click)="createNewFile()" class="action-btn" [title]="t('newFile')">
               <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <line x1="12" y1="5" x2="12" y2="19"></line>
                 <line x1="5" y1="12" x2="19" y2="12"></line>
               </svg>
             </button>
             <button (click)="createNewFolder()" class="action-btn" [title]="t('newFolder')">
               <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                 <line x1="12" y1="9" x2="12" y2="15"></line>
                 <line x1="9" y1="12" x2="15" y2="12"></line>
               </svg>
             </button>
             <button (click)="refreshFiles()" class="action-btn" [title]="t('refresh')">
               <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M23 4v6h-6"></path>
                 <path d="M1 20v-6h6"></path>
                 <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
               </svg>
             </button>
           </div>
        </div>

        <div class="path-bar">
          <div class="path-navigation">
            <span class="path-segment" *ngFor="let segment of pathSegments; let i = index" 
                  (click)="navigateToPathSegment(i)" 
                  [class.active]="i === pathSegments.length - 1">
              {{ segment }}
              <svg *ngIf="i < pathSegments.length - 1" class="path-separator" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="9,18 15,12 9,6"></polyline>
              </svg>
            </span>
          </div>
        </div>

        <div class="file-list">
            <div *ngIf="loading" class="loading">
            <svg class="loading-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
              {{ t('loading') }}
          </div>
          
          <div *ngIf="error" class="error">
            <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            {{ error }}
          </div>

                     <ng-container *ngIf="files$ | async as files">
             <div *ngIf="!loading && !error && getFilteredFiles(files).length === 0" class="empty-state">
             <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
               <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
             </svg>
              <p>{{ t('emptyFolder') }}</p>
           </div>

                       <div *ngFor="let file of getFilteredFiles(files)" 
                  class="file-item"
                  [class.directory]="file.is_directory"
                  [class.selected]="file.path === currentFilePath"
                  (click)="selectFile(file)"
                  (dblclick)="openFileItem(file)"
                  (contextmenu)="showContextMenu($event, file)">
            
                         <div class="file-icon">
               <svg *ngIf="file.is_directory" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
               </svg>
               <svg *ngIf="!file.is_directory && isTextFile(file.name) && file.name.toLowerCase().endsWith('.txt')" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                 <polyline points="14,2 14,8 20,8"></polyline>
                 <line x1="16" y1="13" x2="8" y2="13"></line>
                 <line x1="16" y1="17" x2="8" y2="17"></line>
                 <polyline points="10,9 9,9 8,9"></polyline>
               </svg>
               <svg *ngIf="!file.is_directory && isTextFile(file.name) && file.name.toLowerCase().endsWith('.md')" class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                 <polyline points="14,2 14,8 20,8"></polyline>
                 <line x1="16" y1="13" x2="8" y2="13"></line>
                 <line x1="16" y1="17" x2="8" y2="17"></line>
                 <polyline points="10,9 9,9 8,9"></polyline>
                 <circle cx="12" cy="12" r="3"></circle>
               </svg>
             </div>
            
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-details" *ngIf="!file.is_directory">
                <span *ngIf="file.size">{{ formatFileSize(file.size) }}</span>
                <span *ngIf="file.modified">{{ formatDate(file.modified) }}</span>
              </div>
            </div>
            
            <div class="file-actions" *ngIf="!file.is_directory">
              <button (click)="deleteFile(file, $event)" class="btn-delete" [title]="t('deleteFile')">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"></polyline>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
                </svg>
              </button>
                         </div>
           </div>
         </ng-container>
       </div>
     </div>

     
   `,
  styleUrls: ['./file-explorer.component.scss']
})
export class FileExplorerComponent implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = true;
  @Input() refreshTrigger = 0;
  @Output() fileSelected = new EventEmitter<{ path: string, content: string }>();
  @Output() saveRequested = new EventEmitter<string>();
  @Output() newFileRequested = new EventEmitter<void>();
  @Output() newFolderRequested = new EventEmitter<void>();
  @Output() deleteFileRequested = new EventEmitter<DeleteFileOptions>();
  @Output() currentPathChanged = new EventEmitter<string>();
  @Output() refreshRequested = new EventEmitter<void>();
  @Output() panelToggled = new EventEmitter<boolean>();

  files$: Observable<FileInfo[]> = of([]);
  currentPath = '';
  currentFilePath = '';
  loading = false;
  error = '';
  pathHistory: string[] = [];
  pathHistoryIndex = -1;
  // Basit çeviri - üst bileşendeki dil bilgisini alamadığımız için şimdilik TR/EN varsayımı
  // Uygulama dili AppComponent'te tutulduğundan ileride Input ile geçirilebilir.
  get currentLang(): 'tr' | 'en' {
    return document.body.classList.contains('lang-en') ? 'en' : 'tr';
  }

  private readonly dict: Record<'tr' | 'en', Record<string, string>> = {
    tr: {
      explorer: 'Gezgin',
      back: 'Geri',
      home: 'Ana Klasör',
      newFile: 'Yeni Dosya',
      newFolder: 'Yeni Klasör',
      refresh: 'Yenile',
      loading: 'Yükleniyor...',
      emptyFolder: 'Bu klasör boş',
      deleteFile: 'Dosyayı Sil'
    },
    en: {
      explorer: 'Explorer',
      back: 'Back',
      home: 'Home',
      newFile: 'New File',
      newFolder: 'New Folder',
      refresh: 'Refresh',
      loading: 'Loading...',
      emptyFolder: 'This folder is empty',
      deleteFile: 'Delete File'
    }
  };

  t(key: string): string { return this.dict[this.currentLang][key] ?? key; }



  private contextMenuRef: ComponentRef<ContextMenuComponent> | null = null;
  private renameDialogRef: ComponentRef<RenameDialogComponent> | null = null;

  constructor(
    private fileService: FileService,
    private portalService: PortalService
  ) {}

  ngOnInit() {
    // Başlangıçta mevcut kullanıcının Masaüstü klasörüne git
    this.initHomeDirectory();
  }

  private async initHomeDirectory() {
    try {
      const desktopPath = this.normalizeWindowsPath(await desktopDir());
      this.navigateToDirectoryInternal(desktopPath, false);
      this.currentPathChanged.emit(desktopPath);
    } catch {
      const fallback = 'C\\Users\\Public\\Desktop';
      this.navigateToDirectoryInternal(fallback, false);
      this.currentPathChanged.emit(fallback);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['refreshTrigger']) {
      this.refreshFiles();
    }
  }

  async loadNotesDirectory() {
    try {
      this.loading = true;
      this.error = '';
      
      // Mevcut kullanıcının Masaüstü altındaki notes klasörü
      const desktopPath = this.normalizeWindowsPath(await desktopDir());
      const notesPath = `${desktopPath}\\notes`;
      
      console.log('Notes path ayarlanıyor:', notesPath);
      this.currentPath = notesPath;
      console.log('Current path set:', this.currentPath);
      
      // Direkt olarak notes klasörünü yükle
      this.files$ = this.fileService.listDirectory(notesPath).pipe(
        tap(() => {
          console.log('Notes klasörü başarıyla yüklendi');
          this.loading = false;
        }),
        catchError(error => {
          console.error('Notes klasörü yükleme hatası:', error);
          this.error = `Notes klasörü bulunamadı: ${notesPath}`;
          this.loading = false;
          return of([]);
        })
      );
      
    } catch (error) {
      console.error('Notes klasörü yüklenemedi:', error);
      this.error = 'Notes klasörü bulunamadı';
      this.loading = false;
    }
  }

  togglePanel() {
    this.isOpen = !this.isOpen;
    this.panelToggled.emit(this.isOpen);
  }

  async createNewFolder() {
    this.showNewFolderDialog();
  }

  async createNewFile() {
    this.showNewFileDialog();
  }

  async loadCurrentDirectory() {
    // Mevcut dizini yeniden yükle
    this.refreshFiles();
  }

  openFile() {
    this.fileService.openFileDialog().subscribe(path => {
      if (path) {
        this.loadFileContent(path);
      }
    });
  }

  saveFile() {
    if (this.currentFilePath) {
      this.saveRequested.emit(this.currentFilePath);
    } else {
      this.saveFileAs();
    }
  }

  saveFileAs() {
    // Bu metod editor component'inden çağrılacak
    this.saveRequested.emit('');
  }

  refreshFiles() {
    this.loading = true;
    this.error = '';
    this.files$ = this.fileService.listDirectory(this.currentPath).pipe(
      tap(() => {
        this.loading = false;
      }),
      catchError(error => {
        this.error = error;
        this.loading = false;
        return of([]);
      })
    );
  }

  selectFile(file: FileInfo) {
    if (!file.is_directory) {
      this.currentFilePath = file.path;
    }
  }

  openFileItem(file: FileInfo) {
    if (file.is_directory) {
      this.navigateToDirectory(file.path);
    } else {
      this.loadFileContent(file.path);
    }
  }

  navigateToDirectory(path: string) {
    // Herhangi bir klasöre giriş yapabilir
    this.navigateToDirectoryInternal(path, true);
  }

  loadFileContent(path: string) {
    this.fileService.readFile(path).subscribe({
      next: (content) => {
        this.currentFilePath = path;
        this.fileSelected.emit({ path, content });
      },
      error: (error) => {
        this.error = `Dosya okunamadı: ${error}`;
      }
    });
  }

  deleteFile(file: FileInfo | null, event: Event) {
    if (!file) return;
    
    event.stopPropagation();
    
    const deleteOptions: DeleteFileOptions = {
      fileName: file.name,
      filePath: file.path,
      isDirectory: file.is_directory
    };
    
    this.deleteFileRequested.emit(deleteOptions);
  }

  isTextFile(filename: string): boolean {
    // Sadece .txt ve .md dosyalarını göster
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.')).toLowerCase();
    return ext === '.txt' || ext === '.md';
  }

  shouldShowFile(file: FileInfo): boolean {
    // Klasörler her zaman gösterilsin
    if (file.is_directory) {
      return true;
    }
    
    // Dosyalar için sadece .txt ve .md uzantıları gösterilsin
    return this.isTextFile(file.name);
  }

  getVisibleFiles(): FileInfo[] {
    // Bu metod template'de kullanılamayacağı için boş array döndürüyoruz
    // Template'de async pipe ile filtreleme yapacağız
    return [];
  }

  getVisibleFilesCount(): number {
    // Bu metod template'de kullanılamayacağı için 0 döndürüyoruz
    // Template'de async pipe ile kontrol yapacağız
    return 0;
  }

  getFilteredFiles(files: FileInfo[]): FileInfo[] {
    return files
      .filter(file => this.shouldShowFile(file))
      .sort((a, b) => {
        // Önce klasörler, sonra dosyalar
        if (a.is_directory && !b.is_directory) return -1;
        if (!a.is_directory && b.is_directory) return 1;
        // Aynı türde ise alfabetik sıralama
        return a.name.localeCompare(b.name);
      });
  }



  isMarkdownFile(filename: string): boolean {
    return this.fileService.isMarkdownFile(filename);
  }

  formatFileSize(bytes: number): string {
    return this.fileService.formatFileSize(bytes);
  }

  formatDate(timestamp: string): string {
    return this.fileService.formatDate(timestamp);
  }

  // Path navigation methods
  get pathSegments(): string[] {
    return this.currentPath.split(/[\\\/]/).filter(segment => segment.length > 0);
  }

  canGoBack(): boolean {
    return this.pathHistoryIndex > 0;
  }

  goBack() {
    if (this.canGoBack()) {
      this.pathHistoryIndex--;
      const targetPath = this.pathHistory[this.pathHistoryIndex];
      this.navigateToDirectoryInternal(targetPath, false);
    }
  }

  async goHome() {
    // Ana dizine git (mevcut kullanıcının Masaüstü)
    try {
      const homePath = this.normalizeWindowsPath(await desktopDir());
      this.navigateToDirectoryInternal(homePath, true);
    } catch {
      const fallback = 'C\\Users\\Public\\Desktop';
      this.navigateToDirectoryInternal(fallback, true);
    }
    // History'yi temizle
    this.pathHistory = [];
    this.pathHistoryIndex = -1;
  }

  navigateToPathSegment(index: number) {
    const segments = this.pathSegments;
    if (index < segments.length) {
      const targetPath = segments.slice(0, index + 1).join('\\');
      this.navigateToDirectoryInternal(targetPath, true);
    }
  }

  private addToHistory(path: string) {
    // Remove any paths after current index
    this.pathHistory = this.pathHistory.slice(0, this.pathHistoryIndex + 1);
    this.pathHistory.push(path);
    this.pathHistoryIndex = this.pathHistory.length - 1;
  }

  private navigateToDirectoryInternal(path: string, addToHistory: boolean = true) {
    if (addToHistory) {
      this.addToHistory(path);
    }
    
    this.currentPath = path;
    this.currentPathChanged.emit(path); // Mevcut path'i emit et
    this.loading = true;
    this.error = '';
    
    this.files$ = this.fileService.listDirectory(path).pipe(
      tap(() => {
        this.loading = false;
      }),
      catchError(error => {
        this.error = error;
        this.loading = false;
        return of([]);
      })
    );
  }

  private normalizeWindowsPath(path: string): string {
    return path.replace(/\//g, '\\');
  }

  showNewFileDialog() {
    this.newFileRequested.emit();
  }

  showNewFolderDialog() {
    this.newFolderRequested.emit();
  }

  // Context menu metodları
  showContextMenu(event: MouseEvent, file: FileInfo) {
    event.preventDefault();
    event.stopPropagation();
    
    this.closeContextMenu(); // Önceki context menu'yü kapat
    
    // Context menu'yü body'ye append et
    this.contextMenuRef = this.portalService.createComponent(ContextMenuComponent);
    this.contextMenuRef.instance.x = event.clientX;
    this.contextMenuRef.instance.y = event.clientY;
    this.contextMenuRef.instance.file = file;
    
    // Event listener'ları ekle
    this.contextMenuRef.instance.onRename.subscribe((file: FileInfo) => {
      this.renameFile(file);
    });
    
    this.contextMenuRef.instance.onDelete.subscribe((event: Event) => {
      this.deleteFile(file, event);
    });
    
    // Context menu'yü kapatmak için global click listener ekle
    setTimeout(() => {
      document.addEventListener('click', this.closeContextMenu.bind(this), { once: true });
    }, 0);
    
    // Context menu'nun ekran dışına taşmasını önle
    setTimeout(() => {
      if (this.contextMenuRef) {
        const contextMenu = this.contextMenuRef.location.nativeElement.querySelector('.context-menu') as HTMLElement;
        if (contextMenu) {
          const rect = contextMenu.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          
          if (rect.right > viewportWidth) {
            this.contextMenuRef.instance.x = viewportWidth - rect.width - 10;
          }
          
          if (rect.bottom > viewportHeight) {
            this.contextMenuRef.instance.y = viewportHeight - rect.height - 10;
          }
        }
      }
    }, 10);
  }

  closeContextMenu() {
    if (this.contextMenuRef) {
      this.portalService.destroyComponent(this.contextMenuRef);
      this.contextMenuRef = null;
    }
  }

  // Rename metodları
  renameFile(file: FileInfo | null) {
    if (!file) return;
    
    this.closeContextMenu();
    this.closeRenameDialog(); // Önceki dialog'u kapat
    
    // Rename dialog'u body'ye append et
    this.renameDialogRef = this.portalService.createComponent(RenameDialogComponent);
    this.renameDialogRef.instance.file = file;
    
    // Event listener'ları ekle
    this.renameDialogRef.instance.onConfirm.subscribe((newFileName: string) => {
      this.confirmRename(file, newFileName);
    });
    
    this.renameDialogRef.instance.onCancel.subscribe(() => {
      this.closeRenameDialog();
    });
  }

  closeRenameDialog() {
    if (this.renameDialogRef) {
      this.portalService.destroyComponent(this.renameDialogRef);
      this.renameDialogRef = null;
    }
  }

  confirmRename(file: FileInfo, newFileName: string) {
    if (!file || !newFileName.trim()) {
      return;
    }

    const oldPath = file.path;
    const newName = newFileName.trim();

    this.fileService.renameFile(oldPath, newName).subscribe({
      next: (newPath) => {
        console.log('Dosya başarıyla yeniden adlandırıldı:', newPath);
        this.closeRenameDialog();
        this.refreshFiles(); // Dosya listesini yenile
      },
      error: (error) => {
        console.error('Dosya yeniden adlandırma hatası:', error);
        alert('Dosya yeniden adlandırılırken hata oluştu: ' + error);
      }
    });
  }

  ngOnDestroy() {
    this.closeContextMenu();
    this.closeRenameDialog();
  }
} 