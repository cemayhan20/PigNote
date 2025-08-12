# PigNote

![PigNote Icon](src-tauri/icons/Pignote.ico)

PigNote, Angular 20 ve Tauri 2 ile geliştirilmiş, masaüstünde çalışan hızlı ve sade bir Markdown not editörüdür. Monaco Editor ile güçlü düzenleme, anlık önizleme, dosya gezgini ve PDF/HTML/DOCX dışa aktarma özellikleri sunar.

## Özellikler

- Monaco Editor tabanlı Markdown düzenleyici
- Canlı önizleme ve panel boyutlandırma
- Dosya gezgini ile klasör/dosya yönetimi (oluşturma, silme, yeniden adlandırma)
- Dışa aktarma: PDF, HTML, DOCX
- Koyu/Açık tema geçişi
- Klavye kısayolları (Ctrl+S, Ctrl+B, Ctrl+I, Ctrl+K, Ctrl+Z, Ctrl+Shift+Z)
- Checklist desteği ve glyph margin tıklaması ile işaretleme
- Otomatik kaydetme (kısa gecikme ile)
- Sürükle-bırak dosya açma (Tauri)
- TR/EN arayüz dili ve yazı tipi boyutu ayarları

## Teknoloji Yığını

- Angular 20 (standalone bileşenler)
- Tauri 2 (Rust) masaüstü kabuğu
- Monaco Editor, ngx-markdown
- RxJS

## Gereksinimler

- Node.js 18+ (öneri: 20+) ve npm
- Rust stable toolchain
- Tauri bağımlılıkları (Windows):
  - Microsoft Visual C++ Build Tools veya Visual Studio ile Desktop development with C++
  - WebView2 Runtime
- Tauri CLI: `npm i -D @tauri-apps/cli` (projede mevcut)

## Kurulum

```bash
# Bağımlılıkları yükleyin
npm install
```

## Geliştirme

```bash
# Sadece web olarak Angular dev sunucusu (4300)
npm run dev

# Tauri ile masaüstü uygulaması olarak geliştirme
# (Angular dev sunucusunu otomatik başlatır)
npm run tauri
```

- Tauri dev yapılandırması `src-tauri/tauri.conf.json` içinde:
  - devUrl: `http://localhost:4300`
  - beforeDevCommand: `npm run dev`

## Üretim Derlemesi

```bash
# Web derlemesi
npm run build
# Çıktı: dist/frontend/browser

# Masaüstü (Tauri) derlemesi
# (Tauri CLI kurulu olmalı)
npm run build         # Angular'ı üretime alır
cargo tauri build     # Tauri paketlemesini yapar
```

- Paketlenen Tauri çıktıları platforma göre `src-tauri/target/release` altında yer alır.
- Tauri, `dist/frontend/browser` dizinini uygulama frontend’i olarak kullanır.

## Komutlar

`package.json`:
- `npm run dev`: Angular dev sunucusu (4300)
- `npm run start`: Angular dev sunucusu (varsayılan port)
- `npm run build`: Angular üretim derlemesi
- `npm run tauri`: Tauri dev (Angular dev’i otomatik başlatır)
- `npm test`: Angular test

## Kullanım İpuçları

- Kısayollar:
  - Kaydet: Ctrl+S
  - Kalın: Ctrl+B
  - İtalik: Ctrl+I
  - Bağlantı: Ctrl+K
  - Geri al/Yinele: Ctrl+Z / Ctrl+Shift+Z
- Checklist: Satır kenarındaki glyph margin’e tıklayarak “- [ ]” ↔ “- [x]” geçişi
- Tema: Sağ üstten Koyu/Açık
- Önizleme ve sol panel: Araç çubuğundan aç/kapat
- Dışa aktarma: Üst çubuktaki “Dışa Aktar” → PDF/HTML/DOCX

## Yapılandırma

- Ortam dosyaları:
  - Kök: `.env`, `.env.*` (örnek: `.env.example`)
  - Tauri: `src-tauri/.env`, `src-tauri/.env.*` (örnek: `src-tauri/.env.example`)
- .gitignore önemli girdiler:
  - `dist/`, `src-tauri/target/`, `src-tauri/gen/`, `node_modules/`
  - `.env` dosyaları, editor/temp dosyaları

## Dizin Yapısı (özet)

```
src/
  app/
    editor/                 # Monaco tabanlı editör
    components/             # Dialoglar, gezgin, bildirimler, ayarlar
    services/               # Tauri komutlarıyla dosya ve export servisleri
src-tauri/
  src/                      # Rust kodları
  tauri.conf.json           # Tauri yapılandırması
  Cargo.toml                # Rust bağımlılıkları
  target/ (ignore)          # Tauri derleme çıktıları
  gen/ (ignore)             # Tauri tarafından üretilen dosyalar
```

## Sorun Giderme

- Port çakışması (4300): `angular.json` veya komutta portu değiştirin (`ng serve --port 4301`).
- Tauri bağımlılıkları eksik: Windows için C++ derleme araçları ve WebView2 Runtime kurulu olmalı.
- Monaco yüklenemiyor uyarısı: Uygulama basit textarea moduna düşer; ağ/senkronizasyon sorunlarını kontrol edin.

## Lisans

Bu proje Apache 2.0 lisansı ile lisanslanmıştır. Ayrıntılar için `LICENSE` dosyasına bakın.
