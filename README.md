# 📝 YuPPi Notes

**YuPPi Notes**, modern post-it kartları konseptinde tasarlanmış; **Web**, **Mobil (PWA)** ve **Windows Masaüstü (.EXE)** platformlarında sorunsuz çalışan, cıvıl cıvıl ve gerçek zamanlı işbirlikçi bir not panosu uygulamasıdır.

---

## 🌟 Öne Çıkan Özellikler

### 1. Not Kartları ve Görsel Tasarım
* 📌 **Mini Pano (Masonry Grid) Düzeni:** Notlar ekran boyutuna göre 1-5 sütunlu, ferah ve post-it kartları şeklinde yan yana/alt alta listelenir.
* 🎨 **Cıvıl Cıvıl Pastel Renk Paleti:** Her nota özel arka plan rengi:
  - 💛 Pastel Sarı
  - 💜 Lavanta
  - 🌸 Pudra Pembe
  - 🌿 Nane Yeşili
  - 🌊 Bebek Mavisi
  - 🍑 Şeftali
  - 🍉 Mercan Pembesi
  - 🤍 Kar Beyazı
* 🖐️ **Sürükle-Bırak (Drag-and-Drop):** Not kartları tutma kulpu (grip) ile fareyle veya mobilde parmakla tutularak istenilen sıraya sürüklenebilir. Sıralama anında tüm bağlı kullanıcılara yansır.
* 📋 **Tek Tıkla Kopyalama:** Her kartın üst köşesindeki pratik kopyalama butonuna tıklandığı an notun tüm içeriği panoya kopyalanır ve bildirim gösterilir.
* 📸 **Fotoğraf Ekleme & Galeri:** Notlara tek veya çoklu görsel yüklenebilir; görseller kartın üstünde estetik polaroid/çerçeve düzeniyle önizlenir ve tıklandığında tam ekran lightbox açılır.

### 2. Metin Düzenleme ve Tipografi
* ✍️ **Zengin Metin Editörü (Rich Text):**
  - **Kalın (Bold)**, *İtalik*, ~~Üstü Çizili~~
  - 🖍️ **Fosforlu Vurgu (Highlight):** Sarı, yeşil ve pembe fosforlu kalem etkisi
  - 🔘 **Madde İmleri (Bullet List)** ve 🔢 **Numaralı Liste**
  - ☑️ **Yapılacaklar Kutusu (Interactive Checklist)**
* 🔤 **Not Bazında Font Seçimi:**
  - **Modern Sans:** Temiz ve okunaklı
  - **El Yazısı (Handwriting):** Samimi ve doğal günlük el yazısı (*Caveat*)
  - **Daktilo (Monospace):** Retro daktilo ve kod fontu (*Space Mono*)
  - **Zarif Roman (Serif):** Klasik ve estetik edebi kitap stili (*Playfair Display*)

### 3. Klasörleme ve Organizasyon
* 📁 **Sol Kenar Çubuğu (Sidebar):**
  - Masaüstünde daraltılabilir/genişletilebilir, mobilde yumuşak açılır çekmece (drawer).
  - Varsayılan klasörler: *Gezilecek Yerler, Alışveriş, Tatlı Notlar, İzlenecekler, Fikirler & Projeler*.
* 🎨 **Klasör Özelleştirme:** Her klasöre özel emoji ve tema rengi atanabilir.
* ⚡ **Hızlı Filtreleme:** Tek tıkla sadece seçili klasördeki notlar listelenir. Üst barda anlık arama çubuğu ve pastel renk filtre çipleri bulunur.

### 4. Ortak Çalışma ve İşlevler
* ⚡ **Canlı Eşitleme (Real-time Sync):** Dahili Socket.IO sunucusu ve BroadcastChannel sayesinde iki veya daha fazla kullanıcı/cihaz bağlandığında not ekleme, güncelleme, silme ve sıralama anında eşzamanlanır.
* 👑 **Not İmzası:** Kartın altında notu en son kimin düzenlediğini gösteren minik isim ve avatar rozeti (`👤 Yunus • Az önce`).
* 📌 **Sabitleme (Pin):** Önemli notları en üstteki "Sabitlenen Notlar" bölümüne sabitleme özelliği.

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
> Derleme tamamlandığında `dist-electron/` klasörü içinde hem taşınabilir bağımsız **`YuPPi Notes.exe` (Portable)** hem de **Kurulum Dosyası (NSIS Installer)** hazır olacaktır.
