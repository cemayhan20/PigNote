import { Injectable } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';
import { Observable, from } from 'rxjs';

export interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  modified?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor() { }

  // Dosya açma dialog'u
  openFileDialog(): Observable<string | null> {
    return from(invoke<string | null>('open_file_dialog'));
  }

  // Dosya kaydetme dialog'u
  saveFileDialog(content: string): Observable<string | null> {
    return from(invoke<string | null>('save_file_dialog', { content }));
  }

  // Dosya okuma
  readFile(path: string): Observable<string> {
    return from(invoke<string>('read_file', { path }));
  }

  // Dosya yazma
  writeFile(path: string, content: string): Observable<void> {
    return from(invoke<void>('write_file', { path, content }));
  }

  // Klasör listeleme
  listDirectory(path: string): Observable<FileInfo[]> {
    return from(invoke<FileInfo[]>('list_directory', { path }));
  }

  // Klasör oluşturma
  createDirectory(path: string): Observable<void> {
    return from(invoke<void>('create_directory', { path }));
  }

  // Dosya/klasör silme
  deleteFile(path: string): Observable<void> {
    return from(invoke<void>('delete_file', { path }));
  }

  // Dosya yeniden adlandırma
  renameFile(oldPath: string, newName: string): Observable<string> {
    return from(invoke<string>('rename_file', { oldPath, newName }));
  }

  // PDF export (dark param: preview teması ile eşleşsin)
  exportToPdf(content: string, filename: string, dark: boolean = false, baseDir?: string): Observable<string> {
    return from(invoke<string>('export_to_pdf', { content, filename, dark, base_dir: baseDir }));
  }

  // HTML export
  exportToHtml(content: string, filename: string, dark: boolean = false, baseDir?: string): Observable<string> {
    return from(invoke<string>('export_to_html', { content, filename, dark, base_dir: baseDir }));
  }

  // DOCX export (preview HTML ile birebir görünüm)
  exportToDocx(htmlOrMarkdown: string, filename: string, dark?: boolean, baseDir?: string): Observable<string> {
    return from(invoke<string>('export_to_docx', { content: htmlOrMarkdown, filename, dark, base_dir: baseDir }));
  }

  // Export iptali
  cancelExport(): Observable<void> {
    return from(invoke<void>('cancel_export'));
  }

  // Dosya uzantısını kontrol etme
  isMarkdownFile(filename: string): boolean {
    const ext = filename.toLowerCase().split('.').pop();
    return ext === 'md' || ext === 'markdown';
  }

  // Dosya boyutunu formatlama
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Tarih formatlama
  formatDate(timestamp: string): string {
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
} 