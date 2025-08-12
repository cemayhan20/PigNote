use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::process::{Child, Command, Stdio};
use regex::Regex;
use base64::{engine::general_purpose, Engine as _};
use once_cell::sync::Lazy;
use std::sync::{atomic::{AtomicBool, Ordering}, Mutex};
use lopdf::{Document as LoDocument, Object as LoObject};

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub is_directory: bool,
    pub size: Option<u64>,
    pub modified: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SaveFileRequest {
    pub content: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ExportRequest {
    pub content: String,
    pub format: String, // "pdf"
    pub filename: String,
    pub dark: bool,
    #[serde(rename = "base_dir")]
    pub base_dir: Option<String>,
}

// Basit dosya okuma
#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

// Basit dosya yazma
#[tauri::command]
async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| e.to_string())
}

// Klasör listeme
#[tauri::command]
async fn list_directory(path: String) -> Result<Vec<FileInfo>, String> {
    let mut files = Vec::new();
    
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;
    
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        
        let file_info = FileInfo {
            name: entry.file_name().to_string_lossy().to_string(),
            path: entry.path().to_string_lossy().to_string(),
            is_directory: metadata.is_dir(),
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
            modified: None, // Basit tutalım
        };
        
        files.push(file_info);
    }
    
    Ok(files)
}

// Dosya silme
#[tauri::command]
async fn delete_file(path: String) -> Result<(), String> {
    if Path::new(&path).is_dir() {
        fs::remove_dir_all(&path).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&path).map_err(|e| e.to_string())
    }
}

// Placeholder dialog fonksiyonları
#[tauri::command]
async fn open_file_dialog() -> Result<Option<String>, String> {
    // Şimdilik None döndür - dialog impl daha sonra
    Ok(None)
}

#[tauri::command]
async fn save_file_dialog(_content: String) -> Result<Option<String>, String> {
    // Şimdilik None döndür - dialog impl daha sonra
    Ok(None)
}

#[tauri::command]
async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| e.to_string())
}

// Dosya yeniden adlandırma
#[tauri::command]
async fn rename_file(old_path: String, new_name: String) -> Result<String, String> {
    let path = Path::new(&old_path);
    let parent = path.parent().ok_or("Geçersiz dosya yolu")?;
    let new_path = parent.join(&new_name);
    
    // Yeni dosya adının geçerli olup olmadığını kontrol et
    if new_name.is_empty() || new_name.contains(['<', '>', ':', '"', '|', '?', '*']) {
        return Err("Geçersiz dosya adı".to_string());
    }
    
    // Yeni dosya zaten var mı kontrol et
    if new_path.exists() {
        return Err("Bu isimde bir dosya zaten mevcut".to_string());
    }
    
    // Dosyayı yeniden adlandır
    fs::rename(path, &new_path).map_err(|e| e.to_string())?;
    
    Ok(new_path.to_string_lossy().to_string())
}

// Export işlevselliği
#[tauri::command]
async fn export_to_pdf(content: String, filename: String, dark: Option<bool>, base_dir: Option<String>) -> Result<String, String> {
    // HTML içeriği oluştur
    let is_dark = dark.unwrap_or(false);
    // İptal kontrolü
    if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
    let html_body_raw = if content.trim_start().starts_with("<") { content } else { markdown_to_html(&content)? };
    // İptal kontrolü
    if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
    // Görsellerin PDF'te görünmesi için <img src="..."> yollarını düzelt: file:/// mutlak yol veya base64 inline
    let html_body = inline_or_fix_images_cancellable(&html_body_raw, base_dir.as_deref())?;
    // PigNote marka ikonu (PDF'e gömülü base64)
    let brand_img_b64: String = general_purpose::STANDARD.encode(include_bytes!("../icons/icon.png"));
    let brand_data_uri = format!("data:image/png;base64,{}", brand_img_b64);
    let html_content = if is_dark { format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{}</title>
            <style>
                :root {{
                    --accent-500: #ec4899;
                }}
                 @media print {{
                    @page {{ margin: 12mm; }}
                     body {{ 
                        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.6;
                        margin: 12mm;
                        background: #0f172a;
                        color: #d1d5db;
                        font-size: 11pt;
                        font-weight: 400;
                    }}
                    /* Linklerin yazdırmada URL'lerini ekleyen UA kuralını geçersiz kıl */
                    a[href]::after, a[href]::before {{ content: none !important; }}
                     h1, h2, h3, h4, h5, h6 {{ page-break-after: avoid; break-after: avoid-page; }}
                     h1 + *, h2 + *, h3 + *, h4 + *, h5 + * , h6 + * {{ break-before: avoid-page; }}
                     p, ul, ol, pre, table {{ orphans: 3; widows: 3; }}
                    h1, h2, h3, h4, h5, h6 {{ color: #e5e7eb; margin-top: 18pt; margin-bottom: 10pt; font-weight: 700; }}
                    h1 {{ font-size: 18pt; border-bottom: 1pt solid #374151; padding-bottom: 5pt; }}
                    h2 {{ font-size: 16pt; border-bottom: 1pt solid #374151; padding-bottom: 3pt; }}
                    code {{ background: #0b1220; padding: 1pt 2pt; border-radius: 2pt; font-family: 'Courier New', monospace; color: #f59e0b; }}
                    pre {{ background: #0b1220; padding: 10pt; border-radius: 3pt; overflow-x: auto; border: 1pt solid #2a2a2a; color: #cbd5e1; page-break-inside: avoid; break-inside: avoid; }}
                    blockquote {{ border-left: 3pt solid var(--accent-500); margin: 0; padding-left: 15pt; color: #cbd5e1; background: #111827; }}
                    img {{ display: block; margin: 6pt auto; width: auto; height: auto; max-width: 17cm; max-height: 16cm; object-fit: contain; page-break-inside: avoid; break-inside: avoid; break-before: avoid-page; page-break-after: auto; }}
                    ul, ol {{ padding-left: 15pt; }}
                    li {{ margin-bottom: 3pt; }}
                    p {{ margin-bottom: 10pt; }}
                     table {{ border-collapse: collapse; width: 100%; margin: 15pt 0; font-size: 10pt; page-break-inside: avoid; break-inside: avoid; }}
                    th, td {{ 
                        border: 1pt solid #2a2a2a; 
                        padding: 6pt; 
                        text-align: left; 
                        vertical-align: top;
                        word-wrap: break-word;
                    }}
                    th {{ 
                        background-color: #111827; 
                        font-weight: 600;
                        color: #e5e7eb;
                    }}
                    thead {{ 
                        background-color: #111827;
                    }}
                    tbody tr:nth-child(even) {{ background-color: #0f172a; }}
                     tbody tr:hover {{ background-color: #0f172a; }}
                    .watermark {{ position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 64pt; font-weight: 700; color: rgba(255,255,255,0.06); z-index: 9999; white-space: nowrap; pointer-events: none; }}
                    .brand-footer {{ position: fixed; bottom: 12mm; left: 12mm; font-size: 9pt; color: #9ca3af; display: flex; align-items: center; gap: 6pt; z-index: 10001; }}
                    .brand-footer img {{ width: 12pt; height: 12pt; display: inline-block; }}
                    /* Alt yazıların tamamını maskeleyen örtü */
                    .print-mask-bottom {{ position: fixed; left: 0; right: 0; bottom: 0; height: 12mm; background: #0f172a; z-index: 10000; }}
                }}
                 body {{ 
                    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    line-height: 1.6;
                    background: #0f172a;
                    color: #d1d5db;
                    max-width: 860px;
                    margin: 32px auto;
                    font-weight: 400;
                }}
                 .watermark {{ display: none; }}
                 .brand-footer {{ display: none; }}
                 .print-mask-bottom {{ display: none; }}
                h1, h2, h3, h4, h5, h6 {{ color: #e5e7eb; margin-top: 24px; margin-bottom: 12px; font-weight: 700; }}
                h1 {{ font-size: 24px; border-bottom: 2px solid #374151; padding-bottom: 10px; }}
                h2 {{ font-size: 20px; border-bottom: 1px solid #374151; padding-bottom: 6px; }}
                code {{ background: #0b1220; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; color: #f59e0b; }}
                pre {{ background: #0b1220; padding: 15px; border-radius: 5px; overflow-x: auto; border: 1px solid #2a2a2a; color: #cbd5e1; }}
                blockquote {{ border-left: 4px solid var(--accent-500); margin: 0; padding-left: 20px; color: #cbd5e1; background: #111827; }}
                img {{ 
                    max-width: 100%; 
                    height: auto; 
                    max-height: 70vh; 
                    object-fit: contain; 
                    display: block; 
                    margin: 12px auto; 
                }}
                ul, ol {{ padding-left: 20px; }}
                li {{ margin-bottom: 5px; }}
                p {{ margin-bottom: 15px; }}
                table {{ 
                    border-collapse: collapse; 
                    width: 100%; 
                    margin: 20px 0; 
                    font-size: 14px;
                }}
                th, td {{ 
                    border: 1px solid #2a2a2a; 
                    padding: 8px; 
                    text-align: left; 
                    vertical-align: top;
                    word-wrap: break-word;
                }}
                th {{ 
                    background-color: #111827; 
                    font-weight: 600;
                    color: #e5e7eb;
                }}
                thead {{ 
                    background-color: #111827;
                }}
                tbody tr:nth-child(even) {{ background-color: #0f172a; }}
                tbody tr:hover {{ background-color: #0f172a; }}
            </style>
        </head>
        <body>
            <div class="print-container">{}</div>
             <div class="watermark">PigNote</div>
             <div class="brand-footer"><img src="{}" alt="PigNote" /><span>PigNote</span></div>
             <div class="print-mask-bottom"></div>
        </body>
        </html>
        "#,
        filename,
        html_body,
        brand_data_uri
    )} else { format!(
        r#"
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>{}</title>
            <style>
                :root {{ --accent-500: #ec4899; }}
                 @media print {{
                    @page {{ margin: 12mm; }}
                    body {{ 
                        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                        line-height: 1.6; 
                        color: #111827; 
                        margin: 12mm; 
                        font-size: 11pt; 
                        font-weight: 400; 
                        background: #ffffff;
                    }}
                    /* Linklerin yazdırmada URL'lerini ekleyen UA kuralını geçersiz kıl */
                    a[href]::after, a[href]::before {{ content: none !important; }}
                     h1, h2, h3, h4, h5, h6 {{ page-break-after: avoid; break-after: avoid-page; }}
                     h1 + *, h2 + *, h3 + *, h4 + *, h5 + * , h6 + * {{ break-before: avoid-page; }}
                     p, ul, ol, pre, table {{ orphans: 3; widows: 3; }}
                    img {{
                        display: block !important;
                        margin: 6pt auto !important;
                        width: auto !important;
                        height: auto !important;
                        max-width: 17cm !important;
                        max-height: 16cm !important;
                        object-fit: contain !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        break-before: avoid-page !important;
                        page-break-after: auto !important;
                    }}
                    table {{ 
                        border-collapse: collapse; 
                        width: 100%; 
                        margin: 15pt 0; 
                        font-size: 10pt;
                        page-break-inside: avoid; break-inside: avoid;
                    }}
                    th, td {{ 
                        border: 1pt solid #e5e7eb; 
                        padding: 6pt; 
                        text-align: left; 
                        vertical-align: top;
                        word-wrap: break-word;
                    }}
                    th {{ 
                        background-color: #f3f4f6; 
                        font-weight: 600;
                        color: #111827;
                    }}
                    pre {{ page-break-inside: avoid; break-inside: avoid; }}
                    .watermark {{ position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 64pt; font-weight: 700; color: rgba(0,0,0,0.06); z-index: 9999; white-space: nowrap; pointer-events: none; }}
                    .brand-footer {{ position: fixed; bottom: 12mm; left: 12mm; font-size: 9pt; color: #6b7280; display: flex; align-items: center; gap: 6pt; z-index: 10001; }}
                    .brand-footer img {{ width: 12pt; height: 12pt; display: inline-block; }}
                    .print-mask-bottom {{ position: fixed; left: 0; right: 0; bottom: 0; height: 12mm; background: #ffffff; z-index: 10000; }}
                }}
                body {{ font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; max-width: 860px; margin: 32px auto; font-weight: 400; }}
                .watermark {{ display: none; }}
                .brand-footer {{ display: none; }}
                .print-mask-bottom {{ display: none; }}
                h1, h2, h3, h4, h5, h6 {{ color: #111827; margin-top: 24px; margin-bottom: 12px; font-weight: 700; }}
                h1 {{ font-size: 24px; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }}
                h2 {{ font-size: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }}
                code {{ background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-family: 'Courier New', monospace; }}
                pre {{ background: #f3f4f6; padding: 15px; border-radius: 5px; overflow-x: auto; border-left: 4px solid var(--accent-500); }}
                blockquote {{ border-left: 4px solid var(--accent-500); margin: 0; padding-left: 20px; color: #6b7280; background: #fafafa; }}
                img {{ display:block; margin:12px auto; width:auto; height:auto; max-width: 860px; max-height: 70vh; object-fit: contain; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; font-size: 14px; }}
                th, td {{ border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; word-wrap: break-word; }}
                th {{ background-color: #f3f4f6; font-weight: 600; color: #111827; }}
            </style>
        </head>
        <body><div class="print-container">{}</div><div class="watermark">PigNote</div><div class="brand-footer"><img src="{}" alt="PigNote" /><span>PigNote</span></div><div class="print-mask-bottom"></div></body>
        </html>
        "#,
        filename,
        html_body,
        brand_data_uri
    )};
    
    // Masaüstü yoluna kaydet
    let desktop_dir = dirs::desktop_dir().ok_or("Masaüstü klasörü bulunamadı")?;
    let output_path = desktop_dir.join(format!("{}.pdf", filename));
    
    // Geçici HTML dosyasını sistemin temp klasöründe oluştur
    let temp_dir = std::env::temp_dir();
    let temp_html_path = temp_dir.join(format!("{}_pignote_export.html", filename));
    fs::write(&temp_html_path, &html_content).map_err(|e| e.to_string())?;
    
    // Uygun Chromium tabanlı tarayıcı yürütülebilirini bul
    let candidates = [
        r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        r"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        r"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        r"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
    let browser = candidates
        .iter()
        .find(|p| Path::new(p).exists())
        .ok_or_else(|| "PDF oluşturulamadı: Headless modda çalışacak Chrome/Edge bulunamadı.".to_string())?;

    // URL'yi file:/// formatına çevir
    let url = format!(
        "file:///{}",
        temp_html_path
            .to_string_lossy()
            .replace('\\', "/")
    );

    // İptal mekanizması için global child referansı ve flag kullan
    CANCEL_REQUESTED.store(false, Ordering::SeqCst);
    {
        let mut guard = CURRENT_EXPORT_PROCESS.lock().unwrap();
        // Her ihtimale karşı önceki bir süreç kalmışsa öldür
        if let Some(prev) = guard.as_mut() {
            let _ = prev.kill();
        }
        *guard = None;
    }

    // Headless export sürecini başlat
    let child_result: Result<Child, std::io::Error> = Command::new(browser)
        .arg("--headless")
        .arg("--disable-gpu")
        .arg("--disable-features=PrintingPDFHeaderFooter")
        .arg("--no-pdf-header-footer")
        .arg("--print-to-pdf-no-header")
        .arg(format!("--print-to-pdf={}", output_path.to_string_lossy()))
        .arg(url)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();

    let child = child_result.map_err(|e| e.to_string())?;

    {
        let mut guard = CURRENT_EXPORT_PROCESS.lock().unwrap();
        *guard = Some(child);
    }

    // Child referansını tekrar alabilmek için ayrı scope
    let status = {
        let mut opt = CURRENT_EXPORT_PROCESS.lock().unwrap();
        let ch = opt.as_mut().unwrap();
        ch.wait().map_err(|e| e.to_string())?
    };

    // Süreç bitti, referansı temizle
    {
        let mut guard = CURRENT_EXPORT_PROCESS.lock().unwrap();
        *guard = None;
    }

    // Geçici HTML dosyasını sil
    let _ = fs::remove_file(&temp_html_path);

    // İptal isteği geldiyse iptal olarak dön
    if CANCEL_REQUESTED.load(Ordering::SeqCst) {
        // Dosya oluştuysa da temizlemeye çalış
        if output_path.exists() {
            let _ = fs::remove_file(&output_path);
        }
        CANCEL_REQUESTED.store(false, Ordering::SeqCst);
        return Err("İşlem iptal edildi".to_string());
    }

    // Başarı kontrolü
    if status.success() && output_path.exists() {
        // Güvenlik için: Bazı Chromium sürümleri header/footer'ı yine de basabilir.
        // Alt kenardan daha agresif kırp: ~140pt (yaklaşık 49mm) – olası file:/// yolu ve sayfa numarası tamamen kalkar.
        let _ = remove_pdf_footer_by_cropping(&output_path, 140.0);
        Ok(output_path.to_string_lossy().to_string())
    } else {
        Err("PDF oluşturulamadı".to_string())
    }
}

// HTML export: Markdown veya verilen HTML içeriğini tek dosyalık şık bir sayfaya dönüştür ve masaüstüne kaydet
#[tauri::command]
async fn export_to_html(content: String, filename: String, dark: Option<bool>, base_dir: Option<String>) -> Result<String, String> {
    let is_dark = dark.unwrap_or(false);
    if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }

    let html_body_raw = if content.trim_start().starts_with("<") { content } else { markdown_to_html(&content)? };
    if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
    let html_body = inline_or_fix_images_cancellable(&html_body_raw, base_dir.as_deref())?;

    let page_html = if is_dark { format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{}</title>
  <style>
    :root {{ --accent-500: #ec4899; }}
    body {{ font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px auto; max-width: 860px; line-height: 1.7; color: #e5e7eb; background: #0f172a; }}
    h1, h2, h3, h4, h5, h6 {{ color: #fff; margin-top: 28px; margin-bottom: 12px; font-weight: 700; }}
    h1 {{ border-bottom: 1px solid #374151; padding-bottom: 6px; }}
    h2 {{ border-bottom: 1px solid #374151; padding-bottom: 4px; }}
    p {{ margin: 12px 0; }}
    code {{ background: #111827; border: 1px solid #334155; color: #f59e0b; padding: 2px 6px; border-radius: 6px; }}
    pre {{ background: #0b1220; border: 1px solid #334155; color: #cbd5e1; padding: 16px; border-radius: 12px; overflow: auto; }}
    blockquote {{ border-left: 4px solid var(--accent-500); margin: 1em 0; padding: 8px 16px; background: #111827; color: #cbd5e1; }}
    a {{ color: #f472b6; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    table {{ border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }}
    th, td {{ border: 1px solid #334155; padding: 10px; text-align: left; }}
    th {{ background: #111827; color: #e5e7eb; }}
    img {{ max-width: 100%; height: auto; display: block; margin: 8px auto; }}
  </style>
</head>
<body>
{html}
</body>
</html>"#, filename, html = html_body)
    } else { format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{}</title>
  <style>
    :root {{ --accent-500: #ec4899; }}
    body {{ font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px auto; max-width: 860px; line-height: 1.7; color: #374151; background: #fff; }}
    h1, h2, h3, h4, h5, h6 {{ color: #111827; margin-top: 28px; margin-bottom: 12px; font-weight: 700; }}
    h1 {{ border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }}
    h2 {{ border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }}
    p {{ margin: 12px 0; }}
    code {{ background: #f8f9fa; border: 1px solid #e5e7eb; color: #e83e8c; padding: 2px 6px; border-radius: 6px; }}
    pre {{ background: #f8f9fa; border: 1px solid #e5e7eb; color: #374151; padding: 16px; border-radius: 12px; overflow: auto; }}
    blockquote {{ border-left: 4px solid var(--accent-500); margin: 1em 0; padding: 8px 16px; background: #f8f9fa; color: #6b7280; }}
    a {{ color: #ec4899; text-decoration: none; }}
    a:hover {{ text-decoration: underline; }}
    table {{ border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }}
    th, td {{ border: 1px solid #e5e7eb; padding: 10px; text-align: left; }}
    th {{ background: #f8f9fa; color: #111827; }}
    img {{ max-width: 100%; height: auto; display: block; margin: 8px auto; }}
  </style>
</head>
<body>
{html}
</body>
</html>"#, filename, html = html_body) };

    let desktop_dir = dirs::desktop_dir().ok_or("Masaüstü dizini bulunamadı")?;
    let output_path = desktop_dir.join(format!("{}.html", filename));
    std::fs::write(&output_path, page_html).map_err(|e| e.to_string())?;
    Ok(output_path.to_string_lossy().to_string())
}

// Minimal DOCX export: Markdown'ı düz paragraflara dönüştürerek OOXML yapısında ziple
#[tauri::command]
async fn export_to_docx(content: String, filename: String, dark: Option<bool>, base_dir: Option<String>) -> Result<String, String> {
    use std::io::Write as _;
    let desktop_dir = dirs::desktop_dir().ok_or("Masaüstü dizini bulunamadı")?;
    let output_path = desktop_dir.join(format!("{}.docx", filename));

    let file = std::fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let opts = zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    // İçerik: HTML mi geldi, Markdown mı? HTML değilse Markdown'u HTML'e çevir ve görselleri düzelt
    let html_raw = if content.trim_start().starts_with("<") { content } else { markdown_to_html(&content)? };
    let html_body = inline_or_fix_images_cancellable(&html_raw, base_dir.as_deref())?;
    let is_dark = dark.unwrap_or(false);
    let afchunk_html = if is_dark {
        format!(
            "{}{}{}{}{}",
            "<!DOCTYPE html>\n<html><head><meta charset=\"UTF-8\"/><style>",
            "body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#e5e7eb;background:#0f172a;}",
            "h1,h2,h3{font-weight:700;margin:1em 0 .6em;color:#fff;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #334155;padding:8px;text-align:left;color:#e5e7eb;} th{background:#111827;} code{background:#0b1220;border:1px solid #334155;color:#f59e0b;padding:2px 6px;border-radius:6px;} pre{background:#0b1220;border:1px solid #334155;color:#cbd5e1;padding:12px;border-radius:8px;}",
            "blockquote{border-left:4px solid #ec4899;padding:8px 12px;background:#111827;color:#cbd5e1;}",
            "</style></head><body>") + &html_body + "</body></html>"
    } else {
        format!(
            "{}{}{}{}{}",
            "<!DOCTYPE html>\n<html><head><meta charset=\"UTF-8\"/><style>",
            "body{font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;line-height:1.6;color:#111827;background:#ffffff;}",
            "h1,h2,h3{font-weight:700;margin:1em 0 .6em;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #e5e7eb;padding:8px;text-align:left;} code{background:#f8f9fa;border:1px solid #e5e7eb;padding:2px 6px;border-radius:6px;} pre{background:#f8f9fa;border:1px solid #e5e7eb;padding:12px;border-radius:8px;}",
            "blockquote{border-left:4px solid #ec4899;padding:8px 12px;background:#f8f9fa;color:#374151;}",
            "</style></head><body>") + &html_body + "</body></html>"
    };

    // [Content_Types].xml
    zip.start_file("[Content_Types].xml", opts).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  <Override PartName="/word/afchunk1.html" ContentType="text/html"/>
</Types>"#).map_err(|e| e.to_string())?;

    // _rels/.rels
    zip.add_directory("_rels/", opts).map_err(|e| e.to_string())?;
    zip.start_file("_rels/.rels", opts).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>"#).map_err(|e| e.to_string())?;

    // docProps/app.xml
    zip.add_directory("docProps/", opts).map_err(|e| e.to_string())?;
    zip.start_file("docProps/app.xml", opts).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>PigNote</Application>
  <DocSecurity>0</DocSecurity>
  <ScaleCrop>false</ScaleCrop>
  <Company></Company>
  <LinksUpToDate>false</LinksUpToDate>
  <SharedDoc>false</SharedDoc>
  <HyperlinksChanged>false</HyperlinksChanged>
  <AppVersion>16.0000</AppVersion>
</Properties>"#).map_err(|e| e.to_string())?;

    // docProps/core.xml
    let now = chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string();
    zip.start_file("docProps/core.xml", opts).map_err(|e| e.to_string())?;
    let core_xml = format!(
        "{}{}{}{}{}{}{}",
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n",
        "<cp:coreProperties ",
        "xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" ",
        "xmlns:dc=\"http://purl.org/dc/elements/1.1/\" xmlns:dcterms=\"http://purl.org/dc/terms/\" xmlns:dcmitype=\"http://purl.org/dc/dcmitype/\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\">\n",
        format!("  <dcterms:created xsi:type=\"dcterms:W3CDTF\">{}</dcterms:created>\n", now),
        format!("  <dcterms:modified xsi:type=\"dcterms:W3CDTF\">{}</dcterms:modified>\n", now),
        "  <dc:creator>PigNote</dc:creator>\n  <cp:lastModifiedBy>PigNote</cp:lastModifiedBy>\n</cp:coreProperties>"
    );
    zip.write_all(core_xml.as_bytes()).map_err(|e| e.to_string())?;

    // word/_rels/document.xml.rels (aFChunk – dikkat: 'F' büyük)
    zip.add_directory("word/_rels/", opts).map_err(|e| e.to_string())?;
    zip.start_file("word/_rels/document.xml.rels", opts).map_err(|e| e.to_string())?;
    zip.write_all(br#"<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdHtml1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/aFChunk" Target="afchunk1.html"/>
</Relationships>"#).map_err(|e| e.to_string())?;

    // word/document.xml
    zip.add_directory("word/", opts).map_err(|e| e.to_string())?;
    zip.start_file("word/document.xml", opts).map_err(|e| e.to_string())?;

    // Basit paragraf üretimi: boş satıra göre paragraflara böl
    fn xml_escape(input: &str) -> String {
        input
            .replace('&', "&amp;")
            .replace('<', "&lt;")
            .replace('>', "&gt;")
            .replace('"', "&quot;")
            .replace('\'', "&apos;")
    }
    let mut doc_xml = String::from("<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n");
    doc_xml.push_str("<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\"><w:body>\n");
    doc_xml.push_str("<w:altChunk r:id=\"rIdHtml1\"/>\n");
    doc_xml.push_str("<w:sectPr><w:pgSz w:w=\"11906\" w:h=\"16838\"/><w:pgMar w:top=\"1440\" w:right=\"1440\" w:bottom=\"1440\" w:left=\"1440\"/></w:sectPr>");
    doc_xml.push_str("</w:body></w:document>");

    zip.write_all(doc_xml.as_bytes()).map_err(|e| e.to_string())?;
    // HTML chunk
    zip.start_file("word/afchunk1.html", opts).map_err(|e| e.to_string())?;
    zip.write_all(afchunk_html.as_bytes()).map_err(|e| e.to_string())?;
    zip.finish().map_err(|e| e.to_string())?;

    Ok(output_path.to_string_lossy().to_string())
}

// Global export süreci ve iptal flag'i
static CURRENT_EXPORT_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));
static CANCEL_REQUESTED: AtomicBool = AtomicBool::new(false);

// Export iptal komutu
#[tauri::command]
async fn cancel_export() -> Result<(), String> {
    CANCEL_REQUESTED.store(true, Ordering::SeqCst);
    let mut guard = CURRENT_EXPORT_PROCESS.lock().unwrap();
    if let Some(child) = guard.as_mut() {
        let _ = child.kill();
    }
    Ok(())
}

// Gelişmiş markdown to HTML converter
fn markdown_to_html(markdown: &str) -> Result<String, String> {
    let mut html = String::new();
    let lines: Vec<&str> = markdown.lines().collect();
    let mut i = 0;
    
    while i < lines.len() {
        if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
        let line = lines[i].trim();
        
        if line.is_empty() {
            i += 1;
            continue;
        }
        
        // Tablo parsing
        if line.starts_with("|") && line.ends_with("|") {
            html.push_str("<table>\n");
            
            // Tablo başlığı
            let header_cells: Vec<&str> = line.split("|").filter(|s| !s.trim().is_empty()).collect();
            html.push_str("<thead>\n<tr>\n");
            for cell in &header_cells {
                html.push_str(&format!("<th>{}</th>\n", cell.trim()));
            }
            html.push_str("</tr>\n</thead>\n");
            
            i += 1;
            
            // Ayırıcı satırı atla (| --- | --- |)
            if i < lines.len() && lines[i].trim().starts_with("|") && lines[i].trim().contains("---") {
                i += 1;
            }
            
            // Tablo gövdesi
            html.push_str("<tbody>\n");
            while i < lines.len() && lines[i].trim().starts_with("|") && lines[i].trim().ends_with("|") {
                if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
                let row_cells: Vec<&str> = lines[i].split("|").filter(|s| !s.trim().is_empty()).collect();
                html.push_str("<tr>\n");
                for cell in &row_cells {
                    html.push_str(&format!("<td>{}</td>\n", process_inline_markdown(cell.trim())));
                }
                html.push_str("</tr>\n");
                i += 1;
            }
            html.push_str("</tbody>\n</table>\n");
            continue;
        }
        
        // Başlıklar
        if line.starts_with("###### ") {
            html.push_str(&format!("<h6>{}</h6>\n", &line[7..]));
        } else if line.starts_with("##### ") {
            html.push_str(&format!("<h5>{}</h5>\n", &line[6..]));
        } else if line.starts_with("#### ") {
            html.push_str(&format!("<h4>{}</h4>\n", &line[5..]));
        } else if line.starts_with("### ") {
            html.push_str(&format!("<h3>{}</h3>\n", &line[4..]));
        } else if line.starts_with("## ") {
            html.push_str(&format!("<h2>{}</h2>\n", &line[3..]));
        } else if line.starts_with("# ") {
            html.push_str(&format!("<h1>{}</h1>\n", &line[2..]));
        }
        // Kod blokları
        else if line.starts_with("```") {
            html.push_str("<pre><code>");
            i += 1;
            while i < lines.len() && !lines[i].trim().starts_with("```") {
                html.push_str(&format!("{}\n", lines[i]));
                i += 1;
            }
            html.push_str("</code></pre>\n");
        }
        // Liste öğeleri
        else if line.starts_with("- ") || line.starts_with("* ") {
            html.push_str("<ul>\n");
            while i < lines.len() && (lines[i].trim().starts_with("- ") || lines[i].trim().starts_with("* ")) {
                if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
                let content = &lines[i].trim()[2..];
                html.push_str(&format!("<li>{}</li>\n", process_inline_markdown(content)));
                i += 1;
            }
            html.push_str("</ul>\n");
            continue;
        }
        // Numaralı liste
        else if line.matches(char::is_numeric).next().is_some() && line.contains(". ") {
            html.push_str("<ol>\n");
            while i < lines.len() && lines[i].trim().matches(char::is_numeric).next().is_some() && lines[i].trim().contains(". ") {
                if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
                let parts: Vec<&str> = lines[i].trim().splitn(2, ". ").collect();
                if parts.len() == 2 {
                    html.push_str(&format!("<li>{}</li>\n", process_inline_markdown(parts[1])));
                }
                i += 1;
            }
            html.push_str("</ol>\n");
            continue;
        }
        // Alıntılar
        else if line.starts_with("> ") {
            html.push_str("<blockquote>\n");
            while i < lines.len() && lines[i].trim().starts_with("> ") {
                if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
                let content = &lines[i].trim()[2..];
                html.push_str(&format!("<p>{}</p>\n", process_inline_markdown(content)));
                i += 1;
            }
            html.push_str("</blockquote>\n");
            continue;
        }
        // Normal paragraflar
        else {
            html.push_str(&format!("<p>{}</p>\n", process_inline_markdown(line)));
        }
        
        i += 1;
    }
    
    Ok(html)
}

// HTML içindeki <img src> yollarını düzeltir:
// - Eğer src data: ile başlıyorsa olduğu gibi bırak
// - Eğer src mutlak bir yol veya http(s) değilse ve base_dir verilmişse, file:/// ile mutlaklaştır
// - Eğer dosya okunabiliyorsa base64 inline (data:image/...) olarak gömer
fn inline_or_fix_images_cancellable(html: &str, base_dir: Option<&str>) -> Result<String, String> {
    let img_re = Regex::new(r#"<img\s+[^>]*src=[\"']([^\"'>]+)[\"'][^>]*>"#).unwrap();
    let mut result = String::with_capacity(html.len());
    let mut last_end = 0usize;
    for caps in img_re.captures_iter(html) {
        if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
        let m = caps.get(0).unwrap();
        let src = caps.get(1).map(|m| m.as_str()).unwrap_or("");
        // önceki segmenti ekle
        result.push_str(&html[last_end..m.start()]);

        let replacement = if src.starts_with("data:") {
            m.as_str().to_string()
        } else if src.starts_with("http://") || src.starts_with("https://") || src.starts_with("file:///") {
            m.as_str().to_string()
        } else if let Some(base) = base_dir {
            let path = std::path::Path::new(base).join(src);
            if let Ok(bytes) = std::fs::read(&path) {
                if CANCEL_REQUESTED.load(Ordering::SeqCst) { return Err("İşlem iptal edildi".to_string()); }
                let b64 = general_purpose::STANDARD.encode(bytes);
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                let mime = match ext.as_str() {
                    "png" => "image/png",
                    "jpg" | "jpeg" => "image/jpeg",
                    "gif" => "image/gif",
                    "svg" => "image/svg+xml",
                    "webp" => "image/webp",
                    _ => "application/octet-stream",
                };
                m.as_str().replacen(src, &format!("data:{};base64,{}", mime, b64), 1)
            } else {
                let abs = path.to_string_lossy().replace('\\', "/");
                m.as_str().replacen(src, &format!("file:///{}", abs), 1)
            }
        } else {
            m.as_str().to_string()
        };

        result.push_str(&replacement);
        last_end = m.end();
    }
    result.push_str(&html[last_end..]);
    Ok(result)
}

fn remove_pdf_footer_by_cropping(path: &std::path::Path, trim_bottom_pt: f64) -> Result<(), String> {
    let mut doc = LoDocument::load(path).map_err(|e| e.to_string())?;
    let pages = doc.get_pages();
    for (_num, page_id) in pages {
        // 1) Okuma aşaması (immut borrow)
        let media_box: LoObject = {
            let page_obj_ro = doc.get_object(page_id).map_err(|e| e.to_string())?;
            let page_dict_ro = match page_obj_ro {
                LoObject::Dictionary(ref dict) => dict,
                _ => continue,
            };

            // Sayfada MediaBox var mı?
            if let Ok(mb) = page_dict_ro.get(b"MediaBox").cloned() {
                mb
            } else {
                // Parent'ta var mı?
                if let Ok(parent_ref) = page_dict_ro.get(b"Parent").and_then(|o| o.as_reference()) {
                    if let Ok(parent_obj) = doc.get_object(parent_ref) {
                        if let LoObject::Dictionary(ref parent_dict) = parent_obj {
                            if let Ok(mb2) = parent_dict.get(b"MediaBox").cloned() {
                                mb2
                            } else {
                                LoObject::Array(vec![
                                    LoObject::Integer(0),
                                    LoObject::Integer(0),
                                    LoObject::Integer(595),
                                    LoObject::Integer(842),
                                ])
                            }
                        } else {
                            LoObject::Array(vec![
                                LoObject::Integer(0),
                                LoObject::Integer(0),
                                LoObject::Integer(595),
                                LoObject::Integer(842),
                            ])
                        }
                    } else {
                        LoObject::Array(vec![
                            LoObject::Integer(0),
                            LoObject::Integer(0),
                            LoObject::Integer(595),
                            LoObject::Integer(842),
                        ])
                    }
                } else {
                    LoObject::Array(vec![
                        LoObject::Integer(0),
                        LoObject::Integer(0),
                        LoObject::Integer(595),
                        LoObject::Integer(842),
                    ])
                }
            }
        };

        // MediaBox değerlerini oku
        let arr = match media_box {
            LoObject::Array(arr) => arr,
            _ => continue,
        };
        if arr.len() != 4 { continue; }

        let to_f64 = |o: &LoObject| -> Option<f64> {
            match o {
                LoObject::Integer(i) => Some(*i as f64),
                LoObject::Real(r) => Some((*r) as f64),
                _ => None,
            }
        };
        let llx = to_f64(&arr[0]).unwrap_or(0.0);
        let lly = to_f64(&arr[1]).unwrap_or(0.0);
        let urx = to_f64(&arr[2]).unwrap_or(595.0);
        let ury = to_f64(&arr[3]).unwrap_or(842.0);

        let trim = trim_bottom_pt.max(0.0);
        let new_lly = (lly + trim).min(ury - 1.0);
        let new_crop = LoObject::Array(vec![
            LoObject::Real(llx as f32),
            LoObject::Real(new_lly as f32),
            LoObject::Real(urx as f32),
            LoObject::Real(ury as f32),
        ]);

        // 2) Yazma aşaması (mut borrow)
        let page_obj_mut = doc.get_object_mut(page_id).map_err(|e| e.to_string())?;
        let page_dict_mut = match page_obj_mut {
            LoObject::Dictionary(ref mut dict) => dict,
            _ => continue,
        };
        page_dict_mut.set(b"MediaBox", new_crop.clone());
        page_dict_mut.set(b"CropBox", new_crop.clone());
        page_dict_mut.set(b"TrimBox", new_crop.clone());
        page_dict_mut.set(b"BleedBox", new_crop.clone());
        page_dict_mut.set(b"ArtBox", new_crop.clone());
    }
    doc.save(path).map_err(|e| e.to_string())?;
    Ok(())
}

fn process_inline_markdown(text: &str) -> String {
    let mut result = text.to_string();

    // Linkler [text](url)
    let link_pattern = Regex::new(r"\[([^\]]+)\]\(([^)]+)\)").unwrap();
    result = link_pattern
        .replace_all(&result, "<a href=\"$2\">$1</a>")
        .to_string();

    // Satır içi kod `code`
    let code_re = Regex::new(r"`([^`]+)`").unwrap();
    result = code_re
        .replace_all(&result, "<code>$1</code>")
        .to_string();

    // Kalın **bold**
    let bold_re = Regex::new(r"\*\*([^*]+)\*\*").unwrap();
    result = bold_re
        .replace_all(&result, "<strong>$1</strong>")
        .to_string();

    // İtalik *italic* (çift yıldız hariç tutmaya çalış)
    let italic_re = Regex::new(r"(?<!\*)\*([^*]+)\*(?!\*)").unwrap();
    result = italic_re
        .replace_all(&result, "<em>$1</em>")
        .to_string();

    result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
        read_file,
        write_file,
        list_directory,
        delete_file,
        open_file_dialog,
        save_file_dialog,
        create_directory,
        rename_file,
        export_to_pdf,
        export_to_html,
        export_to_docx,
        cancel_export
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
