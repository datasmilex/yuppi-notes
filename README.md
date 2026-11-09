# Dertleş

Anonim, kayıtsız birebir dertleşme platformu. Next.js 16 + Supabase.

- 3 temsilci (İlayda, Yunus, Gizem); ziyaretçi istediğini seçer ve isteği temsilci kabul eder.
- Her temsilci aynı anda en fazla **1** sohbet alır (veritabanında benzersiz indeksle zorunlu).
- Ziyaretçi sırasını, tahmini bekleme süresini ve geçen süreyi görür (bekleme süresi sınırsız).
- **Mesajlar kaydedilmez:** Supabase Realtime Broadcast ile iletilir; hiçbir tabloya yazılmaz.
  Kaydedilenler yalnızca görüşmenin meta verisi: durum, zamanlar ve iki taraflı 1–5 puan.
- Temsilci paneli (`/panel`): çevrimiçi anahtarı, bekleyenler, kabul/ret, sohbet, bitirme,
  engelleme, puanlama, tarayıcı bildirimi. Profil (`/panel/profil`): fotoğraf, ad, hakkımda,
  özellikler/etiketler, haftalık çalışma saatleri, şifre değişikliği.

## Kurulum

1. Supabase'de yeni bir proje aç ve `supabase/migrations/001_init.sql` dosyasını çalıştır.
2. `.env.local` dosyasına `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` değerlerini yaz (örnek için `.env.example`).
3. Supabase → Authentication → Sign In / Providers: **"Allow new users to sign up" kapalı** olsun.
4. Supabase → Authentication → URL Configuration: Site URL `https://yuppinotes.tr`,
   Redirect URL'lere `https://yuppinotes.tr/panel/sifre` ekle.
5. Temsilci hesabı: Authentication → Users → **Add user** (e-posta + şifre). Ardından
   SQL Editor'da hesabı onayla:
   ```sql
   update public.agents set approved = true, sort_order = 1 where display_name ilike 'ilayda%';
   ```
   (Onaylanmamış hesaplar ziyaretçilere görünmez.)
6. `npm install && npm run dev`
