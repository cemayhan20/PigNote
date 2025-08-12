// frontend/src/app/editor/editor.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  Input,
  Output,
  EventEmitter,
  signal,
  effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarkdownModule } from 'ngx-markdown';
import { HttpClientModule } from '@angular/common/http';

declare const monaco: any;

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownModule, HttpClientModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss'],
})
export class EditorComponent implements AfterViewInit, OnDestroy {
  @ViewChild('monacoContainer', { static: true }) container!: ElementRef;
  @ViewChild('resizer', { static: true }) resizer!: ElementRef;
  @ViewChild('previewRoot', { static: false }) previewRoot?: ElementRef<HTMLDivElement>;
  @Input() set markdownText(content: string) {
    if (content !== this._markdownText()) {
      this._markdownText.set(content);
      if (this.editor && !this.isSettingValue) {
        const position = this.editor.getPosition();
        this.editor.setValue(content);
        if (position) {
          this.editor.setPosition(position);
        }
      }
    }
  }
  @Input() showPreview: boolean = true;
  @Input() set editorFontSize(size: number) {
    this._editorFontSize = size || 14;
    if (this.editor) {
      this.editor.updateOptions({
        fontSize: this._editorFontSize,
        lineHeight: Math.max(18, this._editorFontSize + 6)
      });
      this.editor.layout();
    }
  }
  @Input() previewFontSize: number = 14;
  @Output() contentChanged = new EventEmitter<string>();
  @Output() saveRequested = new EventEmitter<string>();
  @Output() saveNotification = new EventEmitter<string>();

  _markdownText = signal('');
  saveNotificationText = signal('');
  editorWidth = 50; // Editor genişliği yüzde olarak
  private editor: any = null;
  private isSettingValue = false;
  private isResizing = false;
  private _editorFontSize = 14;
  // Inline toolbar style to guarantee dark theme color application
  toolbarStyle = '';
  private checklistDecorationIds: string[] = [];

  constructor() {
    // Monaco editörün koyu tema için özel tema tanımları
    if (typeof monaco !== 'undefined') {
      monaco.editor.defineTheme('pink-vs-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [],
        colors: {
          'editor.background': '#0f172a',
          'editor.foreground': '#f8fafc',
          'editor.lineHighlightBackground': '#1e293b',
          'editor.selectionBackground': '#475569',
          'editor.inactiveSelectionBackground': '#334155',
          'editor.findMatchBackground': '#475569',
          'editor.findMatchHighlightBackground': '#334155',
          'editor.lineHighlightBorder': '#1e293b',
          'editorLineNumber.foreground': '#64748b',
          'editorLineNumber.activeForeground': '#94a3b8',
          'editorGutter.background': '#0f172a',
          'editorGutter.modifiedBackground': '#0f172a',
          'editorGutter.addedBackground': '#0f172a',
          'editorGutter.deletedBackground': '#0f172a',
          'scrollbarSlider.background': '#475569',
          'scrollbarSlider.hoverBackground': '#64748b',
          'scrollbarSlider.activeBackground': '#94a3b8'
        }
      });
    }
    
    // Markdown içeriği değiştiğinde parent'a bildir
    effect(() => {
      const content = this._markdownText();
      if (content !== undefined && !this.isSettingValue) {
        this.contentChanged.emit(content);
      }
    });
  }

  ngAfterViewInit() {
    this.initMonacoEditor().catch(console.error);
    this.initResizablePanels();
    this.syncToolbarStyle();
    
    // Monaco editor'ın layout'unu yeniden hesapla
    setTimeout(() => {
      if (this.editor) {
        this.editor.layout();
      }
    }, 100);
    
    // Tema değişimi sonrası editör layout'unu yeniden hesapla
    const observer = new MutationObserver(() => {
      if (this.editor && typeof this.editor.layout === 'function') {
        setTimeout(() => {
          this.editor.layout();
        }, 100);
      }
      // Also keep toolbar style in sync with theme
      this.syncToolbarStyle();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  ngOnDestroy() {
    this.editor?.dispose();
  }

  private initResizablePanels() {
    console.log('Kaydırılabilir panel sistemi başlatıldı');
  }

  startResize(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
    
    const startX = event.clientX;
    const startWidth = this.editorWidth;
    
    const doDrag = (e: MouseEvent) => {
      if (!this.isResizing) return;
      
      // .editor-preview genişliğini referans al
      const editorPreviewEl = this.container.nativeElement.parentElement?.parentElement;
      const containerWidth = editorPreviewEl?.offsetWidth || this.container.nativeElement.parentElement.offsetWidth;
      const deltaX = e.clientX - startX;
      const deltaPercent = (deltaX / containerWidth) * 100;
      
      let newWidth = startWidth + deltaPercent;
      
      // Minimum ve maximum sınırlar
      newWidth = Math.max(20, Math.min(80, newWidth));
      
      this.editorWidth = newWidth;
      
      // Monaco Editor'ü yeniden boyutlandır
      if (this.editor) {
        this.editor.layout();
      }
    };
    
    const stopDrag = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  }

  private async initMonacoEditor(): Promise<void> {
    try {
      await this.loadMonacoLoader();
      
      if (!(window as any).require) {
        console.warn('Monaco Editor yüklenemedi, basit textarea gösterilecek');
        this.createFallbackEditor();
        return;
      }
      
      (window as any).require.config({
        paths: { vs: 'assets/monaco-editor/min/vs' },
      });

      return new Promise((resolve) => {
        (window as any).require(['vs/editor/editor.main'], () => {
        // Pembe tema tanımları
        const pinkRules = [
          // Genel sözdizimi
          { token: 'keyword', foreground: 'ec4899' },
          { token: 'type', foreground: 'ec4899' },
          { token: 'function', foreground: 'ec4899' },
          { token: 'tag', foreground: 'ec4899' },
          { token: 'attribute.name', foreground: 'ec4899' },
          { token: 'number', foreground: 'ec4899' },
          { token: 'regexp', foreground: 'ec4899' },
          { token: 'variable', foreground: 'ec4899' },
          { token: 'variable.predefined', foreground: 'ec4899' },
          // Operatör ve noktalama/semboller
          { token: 'operator', foreground: 'ec4899' },
          { token: 'delimiter', foreground: 'ec4899' },
          { token: 'delimiter.bracket', foreground: 'ec4899' },
          { token: 'delimiter.parenthesis', foreground: 'ec4899' },
          { token: 'delimiter.square', foreground: 'ec4899' },
          { token: 'delimiter.curly', foreground: 'ec4899' },
          { token: 'delimiter.angle', foreground: 'ec4899' },
          { token: 'punctuation', foreground: 'ec4899' },
          { token: 'punctuation.separator', foreground: 'ec4899' },
          { token: 'punctuation.definition', foreground: 'ec4899' },
          { token: 'punctuation.bracket', foreground: 'ec4899' },
          { token: 'punctuation.parenthesis', foreground: 'ec4899' },
          { token: 'punctuation.square', foreground: 'ec4899' },
          { token: 'punctuation.curly', foreground: 'ec4899' },
          { token: 'punctuation.angle', foreground: 'ec4899' },
          // Markdown vurguları
          { token: 'markup.heading', foreground: 'ec4899', fontStyle: 'bold' },
          { token: 'heading', foreground: 'ec4899', fontStyle: 'bold' },
          { token: 'markup.bold', foreground: 'ec4899' },
          { token: 'markup.underline', foreground: 'ec4899' },
          { token: 'markup.list', foreground: 'ec4899' }
        ];

        const themeColors = {
          // Parantez eşleşme/renklendirme de pembe
          'editorBracketMatch.border': '#ec4899',
          'editorBracketMatch.background': '#ec489933',
          'editorBracketHighlight.foreground1': '#ec4899',
          'editorBracketHighlight.foreground2': '#ec4899',
          'editorBracketHighlight.foreground3': '#ec4899',
          'editorBracketHighlight.foreground4': '#ec4899',
          'editorBracketHighlight.foreground5': '#ec4899',
          'editorBracketHighlight.foreground6': '#ec4899'
        } as any;

        monaco.editor.defineTheme('pink-vs', { base: 'vs', inherit: true, rules: pinkRules, colors: themeColors });
        monaco.editor.defineTheme('pink-vs-dark', { base: 'vs-dark', inherit: true, rules: pinkRules, colors: themeColors });

        const isDark = document.body.classList.contains('dark-theme');
        const initialTheme = isDark ? 'pink-vs-dark' : 'pink-vs';

        // Monaco editörü oluştur
        this.editor = monaco.editor.create(this.container.nativeElement, {
          value: this._markdownText(),
          language: 'markdown',
          theme: initialTheme,
          fontSize: this._editorFontSize,
          fontFamily: 'JetBrains Mono, Consolas, Monaco, monospace',
          lineHeight: Math.max(18, this._editorFontSize + 6),
          wordWrap: 'on',
          minimap: { enabled: false },
          fixedOverflowWidgets: true,
          automaticLayout: true,
          scrollBeyondLastLine: true,
          roundedSelection: false,
          readOnly: false,
          selectOnLineNumbers: true,
          glyphMargin: true,
          folding: true,
          lineNumbers: 'on',
          // Satır başı hizalama problemlerini önlemek için bazı güvenli ayarlar
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 12,
          renderLineHighlight: 'line',
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false
          },
          padding: {
            top: 10,
            bottom: 40
          },
          unicodeHighlight: {
            nonBasicASCII: false,
            ambiguousCharacters: false,
            invisibleCharacters: false
          },
          cursorWidth: 2,
          // Koyu tema için ek ayarlar
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          overviewRulerLanes: 0,
          // Scroll pozisyonunu korumak için
          preserveScrollPosition: true
        });

        // İçerik değişikliklerini dinle
        this.editor.onDidChangeModelContent(() => {
          if (!this.isSettingValue) {
            const value = this.editor.getValue();
            this._markdownText.set(value);
          }
          this.updateChecklistDecorations();
        });

        // Klavye kısayolları
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
          this.saveContent();
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
          this.undo();
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
          this.redo();
        });

        // Markdown için özel kısayollar
        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyB, () => {
          this.insertMarkdown('**', '**');
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
          this.insertMarkdown('*', '*');
        });

        this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
          this.insertMarkdown('[', '](url)');
        });

        // Glyph margin tıklaması ile checklist toggle
        this.editor.onMouseDown((e: any) => {
          if (e.target && e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && e.target.position) {
            const lineNumber = e.target.position.lineNumber;
            this.toggleChecklistAtLine(lineNumber);
            e.event.preventDefault();
          }
        });

        // İlk dekorasyonları uygula
        this.updateChecklistDecorations();

        // Tema değişimini dinle ve Monaco temasını güncelle
        const observer = new MutationObserver(() => {
          const nowDark = document.body.classList.contains('dark-theme');
          monaco.editor.setTheme(nowDark ? 'pink-vs-dark' : 'pink-vs');
          
                  // Tema değişimi sonrası editörü yeniden düzenle
        setTimeout(() => {
          // Editör layout'unu yeniden hesapla
          this.editor.layout();
          
          // Scroll pozisyonunu koru
          const scrollPosition = this.editor.getScrollPosition();
          
          // Editör ayarlarını güncelle
          this.editor.updateOptions({
            minimap: { enabled: false },
            fixedOverflowWidgets: true,
            automaticLayout: true,
            // Koyu tema için ek ayarlar
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            overviewRulerLanes: 0,
            lineNumbersMinChars: 3,
            lineDecorationsWidth: 12,
            renderLineHighlight: 'line'
          });
          
          // Scroll pozisyonunu geri yükle
          this.editor.setScrollPosition(scrollPosition);
          
          // Force layout update
          setTimeout(() => {
            this.editor.layout();
            // Ek layout update
            setTimeout(() => {
              this.editor.layout();
            }, 25);
          }, 50);
        }, 100);
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

        // Editor'ı fokusla ve tıklanabilir hale getir
        this.editor.focus();
        
        // Container'a click event ekle
        this.container.nativeElement.addEventListener('click', () => {
          this.editor.focus();
        });

        resolve();
      });
    });
    } catch (error) {
      console.error('Monaco Editor yüklenemedi:', error);
      this.createFallbackEditor();
    }
  }

  private createFallbackEditor() {
    // Fallback: basit textarea
    const textarea = document.createElement('textarea');
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = 'monospace';
    textarea.style.fontSize = '14px';
    textarea.style.padding = '10px';
    textarea.style.backgroundColor = '#f5f5f5';
    textarea.style.color = '#333333';
    textarea.value = this._markdownText();
    
    textarea.addEventListener('input', (e) => {
      const value = (e.target as HTMLTextAreaElement).value;
      this._markdownText.set(value);
    });
    
    this.container.nativeElement.appendChild(textarea);
  }

  // Markdown ekleme yardımcı metodu
  private insertMarkdown(before: string, after: string) {
    const selection = this.editor.getSelection();
    if (selection) {
      const selectedText = this.editor.getModel().getValueInRange(selection);
      const newText = before + selectedText + after;
      this.editor.executeEdits('markdown-insert', [{
        range: selection,
        text: newText
      }]);
    }
  }

  // Araç çubuğu eylemleri
  toggleBold() {
    this.toggleWrap('**', '**');
  }

  toggleItalic() {
    this.toggleWrap('*', '*');
  }

  toggleList() {
    this.toggleLinePrefix(/^[\t ]*[-*]\s+/u, '- ');
  }

  toggleOrderedList() {
    // Seçili satırlar numaralı listeye çevrilir; zaten numaralı ise kaldırılır
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!selection) return;
    const range = this.expandToFullLines(selection);
    const lines = this.getLinesInRange(range);
    const orderedRegex = /^[\t ]*\d+\.\s+/u;
    const allHave = lines.every((l) => orderedRegex.test(l));
    const newLines = lines.map((l, idx) => {
      if (allHave) return l.replace(orderedRegex, '');
      if (l.trim().length === 0) return l;
      // mevcut numarayı temizleyip yeniden numaralandır
      const normalized = l.replace(orderedRegex, '');
      return `${idx + 1}. ${normalized}`;
    });
    const newText = newLines.join('\n');
    this.editor.executeEdits('markdown-toggle-ordered', [{ range, text: newText }]);
  }

  toggleChecklist() {
    // Önce mevcut checklist'i kaldır, yoksa ekle
    const checklistRegex = /^[\t ]*- \[( |x|X)\]\s+/u;
    this.toggleLinePrefix(checklistRegex, '- [ ] ');
  }

  toggleHeading(level: 1 | 2 | 3) {
    const hashes = '#'.repeat(level) + ' ';
    const headingRegex = new RegExp(`^[\\t ]*#{1,6}\\s+`, 'u');
    this.applyOnSelectedLines((line) => {
      const trimmedRemoved = line.replace(headingRegex, '');
      if (line.startsWith(hashes)) {
        // Kapalı hale getir (başlığı kaldır)
        return trimmedRemoved;
      }
      return hashes + trimmedRemoved;
    });
  }

  // Yardımcılar
  private toggleWrap(before: string, after: string) {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!selection) return;
    const selectedText = model.getValueInRange(selection);
    const startsWith = selectedText.startsWith(before);
    const endsWith = selectedText.endsWith(after);
    if (selectedText && startsWith && endsWith) {
      const unwrapped = selectedText.substring(before.length, selectedText.length - after.length);
      this.editor.executeEdits('markdown-toggle-wrap', [{ range: selection, text: unwrapped }]);
      return;
    }
    const wrapped = before + (selectedText || '') + after;
    this.editor.executeEdits('markdown-toggle-wrap', [{ range: selection, text: wrapped }]);
  }

  insertLink() {
    const placeholder = '[metin](https://)';
    this.insertSnippet(placeholder);
  }

  insertCodeBlock() {
    const snippet = '\n```\n// kod\n```\n';
    this.insertSnippet(snippet);
  }

  insertImage() {
    const snippet = '![](https://)';
    this.insertSnippet(snippet);
  }

  private insertSnippet(snippet: string) {
    const selection = this.editor.getSelection();
    if (selection) {
      this.editor.executeEdits('markdown-insert-snippet', [{ range: selection, text: snippet }]);
    } else {
      const position = this.editor.getPosition();
      this.editor.executeEdits('markdown-insert-snippet', [{ range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column), text: snippet }]);
    }
    this.editor.focus();
  }

  // Satır bazlı checklist toggle: "- [ ]" <-> "- [x]"
  private toggleChecklistAtLine(lineNumber: number) {
    const model = this.editor.getModel();
    const lineContent: string = model.getLineContent(lineNumber);
    const unchecked = /^(\s*-\s*\[\s\]\s+)/u;
    const checked = /^(\s*-\s*\[x\]\s+)/iu;
    let newLine = lineContent;
    if (checked.test(lineContent)) {
      newLine = lineContent.replace(checked, (m) => m.replace(/\[x\]/i, '[ ]'));
    } else if (unchecked.test(lineContent)) {
      newLine = lineContent.replace(unchecked, (m) => m.replace('[ ]', '[x]'));
    } else {
      return; // checklist değilse işlem yapma
    }
    const range = new monaco.Range(lineNumber, 1, lineNumber, lineContent.length + 1);
    this.editor.executeEdits('toggle-checklist', [{ range, text: newLine }]);
  }

  // Checklist dekorasyonlarını güncelle (glyph margin'e tıklanabilir ikon ekler)
  private updateChecklistDecorations() {
    if (!this.editor) return;
    const model = this.editor.getModel();
    const lineCount = model.getLineCount();
    const newDecorations: any[] = [];
    const uncheckedRe = /^(\s*-\s*\[\s\]\s+)/u;
    const checkedRe = /^(\s*-\s*\[x\]\s+)/iu;
    for (let line = 1; line <= lineCount; line++) {
      const text = model.getLineContent(line);
      const isUnchecked = uncheckedRe.test(text);
      const isChecked = checkedRe.test(text);
      if (!isUnchecked && !isChecked) continue;
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: isChecked ? 'pn-checkbox-checked' : 'pn-checkbox-unchecked',
          glyphMarginHoverMessage: { value: isChecked ? 'Checklist: işaretli (tıklayınca kaldırılır)' : 'Checklist: işaretsiz (tıklayınca işaretlenir)' }
        }
      });
    }
    this.checklistDecorationIds = this.editor.deltaDecorations(this.checklistDecorationIds, newDecorations);
  }

  private toggleLinePrefix(existingRegex: RegExp, addPrefix: string) {
    // Seçili satırların hepsi ilgili desenle başlıyorsa kaldır, aksi halde ekle
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!selection) return;
    const range = this.expandToFullLines(selection);
    const lines = this.getLinesInRange(range);
    const allHave = lines.every((l) => existingRegex.test(l));
    const newLines = lines.map((l) => {
      if (allHave) {
        return l.replace(existingRegex, (m) => {
          // m eşleşmesini kaldır
          return '';
        });
      }
      // boş satırı listeye çevirmeyelim
      if (l.trim().length === 0) return l;
      // mevcut liste işareti varsa normalize et
      const normalized = l.replace(/^[\t ]*[-*]\s+/u, '');
      return addPrefix + normalized;
    });
    const newText = newLines.join('\n');
    this.editor.executeEdits('markdown-toggle-prefix', [{ range, text: newText }]);
  }

  private applyOnSelectedLines(mapper: (line: string) => string) {
    const model = this.editor.getModel();
    const selection = this.editor.getSelection();
    if (!selection) return;
    const range = this.expandToFullLines(selection);
    const lines = this.getLinesInRange(range);
    const newText = lines.map(mapper).join('\n');
    this.editor.executeEdits('markdown-lines-map', [{ range, text: newText }]);
  }

  private expandToFullLines(selection: any) {
    const model = this.editor.getModel();
    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;
    const startColumn = 1;
    const endColumn = model.getLineMaxColumn(endLine);
    return new monaco.Range(startLine, startColumn, endLine, endColumn);
  }

  private getLinesInRange(range: any): string[] {
    const model = this.editor.getModel();
    const lines: string[] = [];
    for (let ln = range.startLineNumber; ln <= range.endLineNumber; ln++) {
      lines.push(model.getLineContent(ln));
    }
    return lines;
  }

  private syncToolbarStyle() {
    const isDark = document.body.classList.contains('dark-theme');
    // Force inline style with highest priority
    this.toolbarStyle = isDark
      ? 'background: rgb(31, 29, 29) !important; border-bottom: 1px solid #2a2a2a !important;'
      : '';
  }

  private loadMonacoLoader(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).require) {
        resolve();
        return;
      }
      
      // Monaco loader Angular'da scripts olarak yüklü
      if ((window as any).monaco) {
        resolve();
        return;
      }
      
      // Fallback: manuel yükleme
      const script = document.createElement('script');
      script.src = 'assets/monaco-editor/min/vs/loader.js';
      script.onload = () => resolve();
      script.onerror = (err) => {
        console.warn('Monaco loader yüklenemedi, basit textarea kullanılacak');
        resolve(); // Hata olsa bile devam et
      };
      document.body.appendChild(script);
    });
  }

  // Geri alma
  undo() {
    if (this.editor) {
      this.editor.trigger('keyboard', 'undo', null);
    }
  }

  // Yineleme
  redo() {
    if (this.editor) {
      this.editor.trigger('keyboard', 'redo', null);
    }
  }

  // Klavye kısayolları için metodlar
  saveContent() {
    const content = this._markdownText();
    this.saveRequested.emit(content);
    this.saveNotificationText.set('Kaydedildi!');
    this.saveNotification.emit('Kaydedildi!');
    
    // 3 saniye sonra bildirimi kaldır
    setTimeout(() => {
      this.saveNotificationText.set('');
      this.saveNotification.emit('');
    }, 3000);
  }

  // Editör içeriğini temizle
  clearContent() {
    this.isSettingValue = true;
    this._markdownText.set('');
    if (this.editor) {
      this.editor.setValue('');
    }
    this.isSettingValue = false;
  }

  // Editör odağını al
  focus() {
    if (this.editor) {
      this.editor.focus();
    }
  }
}
