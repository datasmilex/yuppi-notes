# 📝 YuPPi Notes 2.0

**YuPPi Notes**, modern post-it kartları konseptinde tasarlanmış; **Web**, **Mobil (PWA)** ve **Windows Masaüstü (.EXE)** platformlarında çalışan, cıvıl cıvıl ve gerçek zamanlı işbirlikçi bir not panosu uygulamasıdır.

---

## 🌟 Öne Çıkan Özellikler

### 1. Not Kartları ve Pano
* 📌 **Izgara & Liste Görünümü:** Notlar 1-5 sütunlu post-it ızgarasında ya da yoğun, taranabilir bir liste halinde gösterilir. Kart yoğunluğu (Rahat / Sıkışık) ayarlanabilir.
* 🎨 **Pastel Renk Paleti:** Pastel Sarı, Lavanta, Pudra Pembe, Nane Yeşili, Bebek Mavisi, Şeftali, Mercan Pembesi, Kar Beyazı.
* 🖐️ **Sürükle-Bırak & Boyutlandırma:** Kartlar tutma kulpuyla sıralanır, sağ alt köşeden genişletilir/uzatılır; sıralama anında tüm bağlı kullanıcılara yansır.
* ✅ **Toplu Seçim & İşlemler:** `Shift + Tık` ya da seçim modu ile birden çok notu seç; tek seferde sabitle, renk değiştir, klasöre taşı, arşivle, Markdown olarak indir veya sil.
* 🔍 **Arama Vurgusu:** Aranan ifade kart başlıklarında fosforlu kalemle işaretlenir.

### 2. Organizasyon
* 📁 **Klasörler:** Her klasöre özel emoji ve renk; not sayıları kenar çubuğunda.
* 🏷️ **Etiketler:** `#etiket` ile süzme, öneri listesi.
* ⏰ **Hatırlatıcılar:** "1 saat sonra", "Bu akşam", "Yarın sabah", "Hafta sonu" gibi hızlı seçenekler veya istenen tarih/saat. Zamanı gelince uygulama içi bildirim, sistem bildirimi (izin verilirse) ve kısa bir "ding". Hatırlatıcılar görünümü notları *Zamanı Geçenler / Bugün / Yarın / Bu Hafta / Daha Sonra* olarak gruplar.
* 📦 **Arşiv:** Panoyu kalabalıklaştırmayan ama silinmeyen notlar.
* 🗑️ **Çöp Kutusu:** Silinen notlar 30 gün bekler, sonra kendiliğinden temizlenir. Geri yükleme, kalıcı silme ve "Çöpü Boşalt".

### 3. Zengin Editör
* ✍️ **Biçimlendirme:** Kalın, italik, altı/üstü çizili, 9 yazı rengi, 5 fosforlu vurgu, H1/H2/H3, alıntı, kod bloğu, ayırıcı çizgi, bağlantı, sola/ortaya/sağa hizalama.
* ☑️ **Listeler:** Madde imli, numaralı ve tıklanabilir yapılacaklar listesi (iç içe listeler `Tab` / `Shift+Tab`).
* ⚡ **Markdown Kısayolları:** Satır başında `# ` `## ` `### ` başlık, `- ` liste, `1. ` numaralı liste, `[] ` yapılacak, `> ` alıntı, ` ``` ` kod; `---` + Enter ayırıcı.
* 📸 **Görseller:** Fotoğraf yükle, **yapıştır** ya da editöre **sürükle-bırak**; tam ekran galeri ve indirme.
* 🖌️ **Çizim:** Parmak, kalem veya fareyle eskiz; nota görsel olarak eklenir.
* 🎤 **Sesle Yazma:** Türkçe dikte (Chrome / Edge).
* 🔊 **Sesli Okuma:** Notu Türkçe seslendirme.
* 🎯 **Odak Modu:** Dikkat dağıtıcıları gizleyen sade yazım ekranı.
* 🕰️ **Sürüm Geçmişi:** Her düzenleme oturumundan önceki hal saklanır (son 30 sürüm); önizle ve tek tıkla geri yükle.
* 🔤 **Not Bazında Font:** Modern Sans, El Yazısı (*Caveat*), Daktilo (*Space Mono*), Zarif Roman (*Playfair Display*).

### 4. Hızlı Başlangıç
* 🧩 **10 Şablon:** Yapılacaklar, Toplantı Notu, Günlük, Alışveriş Listesi, Haftalık Plan, Proje Fikri, Tarif, Kitap Notu, Seyahat Planı, Hedef Takibi.
* ⌨️ **Komut Paleti (`Ctrl + K`):** Notlarda ara ve aç, şablondan not oluştur, görünüm/tema değiştir, klasörlere git, yedek al — hepsi klavyeden.

### 5. Dışa Aktarma & Yedekleme
* ⬇️ Not bazında **Markdown (.md)**, **Web sayfası (.html)**, **düz metin (.txt)** ve **Yazdır / PDF**.
* 📚 Tüm notları tek Markdown dosyası olarak indirme; JSON yedek alma/geri yükleme; depolama kullanım göstergesi.

### 6. İstatistikler
* 📊 Toplam not, kelime sayısı, bu hafta düzenlenenler, üretkenlik serisi, son 15 haftalık etkinlik ısı haritası, görev tamamlama oranı, renk/klasör/etiket dağılımları.

### 7. Ortak Çalışma
* ⚡ **Canlı Eşitleme:** Dahili Socket.IO sunucusu ile not ekleme, düzenleme, arşivleme, çöp kutusu ve sıralama anında eşzamanlanır. Aynı tarayıcıdaki sekmeler BroadcastChannel ile eşitlenir.
* 🔗 **Davet:** Oda bağlantısı, QR kod ve paylaşım menüsü.
* 👑 **Not İmzası:** Kartın altında notu en son kimin düzenlediği (`👤 Yunus • Az önce`).

### 8. Kişiselleştirme
* 🌗 **Temalar:** Açık Bej, Koyu Gece, Pudra Pembe, Bebek Mavisi ve cihazı takip eden **Sistem** teması.
* ⚙️ **Varsayılanlar:** Yeni notların rengi, yazı tipi ve türü; yazım denetimi; bildirim sesi.

---

## ⌨️ Klavye Kısayolları

| Kısayol | İşlev |
|---|---|
| `Ctrl + K` | Komut paleti |
| `/` | Panodaki aramaya odaklan |
| `Alt + N` | Yeni not |
| `?` | Kısayol listesi |
| `Esc` | Açık pencereyi kapat / editörü kaydedip kapat |
| `Ctrl + S` | (Editörde) hemen kaydet |
| `Ctrl + K` | (Editörde) bağlantı ekle |
| `Ctrl + Shift + X` | Üstü çizili |
| `Ctrl + Shift + 7 / 8 / 9` | Numaralı / madde / yapılacak listesi |
| `Shift + Tık` | Notu seç |
| `Ctrl + A` / `Delete` | (Seçim modunda) tümünü seç / çöpe taşı |

---

## 🚀 Çalıştırma ve Kurulum

### 1. Web ve Canlı Sunucu (Dev / Prod)
```bash
# Canlı Socket.IO + Next.js sunucusunu başlatmak için:
npm run dev

# Tarayıcıda açın:
# Web: http://localhost:3000
# Mobil (Aynı Wi-Fi ağındaki telefon/tablet için): http://<YEREL_IP>:3000
```

### 2. Mobil Kullanım (PWA - Progressive Web App)
1. Telefonunuzun tarayıcısından (Safari veya Chrome) yerel ağ adresine (`http://<YEREL_IP>:3000`) veya sunucu adresinize girin.
2. iOS'ta **Paylaş > Ana Ekrana Ekle**, Android'de **Seçenekler > Uygulamayı Yükle** butonuna dokunun.
3. YuPPi Notes telefonunuzda tam ekran, yerel bir mobil uygulama gibi çalışır.

### 3. Windows Masaüstü (.EXE) Çalıştırma ve Derleme

#### Masaüstü Geliştirici Modunda Açma:
```bash
npm run electron:dev
```

#### Windows .EXE Paketini Üretme:
```bash
npm run electron:build
```
> Derleme tamamlandığında `build-exe/` klasörü içinde hem taşınabilir bağımsız **`YuPPi Notes.exe` (Portable)** hem de **Kurulum Dosyası (NSIS Installer)** hazır olacaktır.

---

## 🗂️ Proje Yapısı (özet)

```
src/
  app/            Sayfa, yerleşim ve genel stiller (tema değişkenleri)
  context/        NotesContext (veri, eşitleme), UIContext (tercihler, seçim), ThemeContext, UserContext
  components/
    Board/        Pano, araç çubuğu, toplu işlem çubuğu, hızlı post-it
    Card/         Not kartı, liste satırı, galeri
    Editor/       Tam sayfa editör, zengin metin, hatırlatıcı, çizim, sürüm geçmişi, şablonlar
    Common/       Komut paleti, istatistikler, kısayollar, onay penceresi, bildirimler
    Sidebar/      Kenar çubuğu, ayarlar, klasör ve davet pencereleri
  utils/          Depolama (IndexedDB), güvenli HTML, dışa aktarma, şablonlar, hatırlatıcılar, geçmiş
server.js         Next.js + Socket.IO sunucusu (ortak odalar data/rooms altında saklanır)
electron/         Masaüstü kabuğu
```
