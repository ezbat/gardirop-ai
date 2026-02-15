# 🚀 YAPILACAKLAR LİSTESİ - ÖNEMLİ!

## ✅ Tamamlanan İşler
- ✅ Sipariş state machine entegrasyonu tamamlandı
- ✅ Checkout'a `state: 'CREATED'` eklendi
- ✅ Ödeme beklerken `state: 'PAYMENT_PENDING'` ayarlandı
- ✅ Hamburger menüye "Gizlilik & Yasal" bölümü eklendi
- ✅ Datenschutz, AGB, Impressum, Widerrufsrecht linkleri menüye eklendi

## 🔥 ŞİMDİ YAPMAN GEREKENLER (SIRAYLA)

### 1. Veritabanı Migrasyonlarını Çalıştır (ÇOK ÖNEMLİ!)
```bash
# Supabase Dashboard'a git
# SQL Editor'ü aç
# Sırayla şu dosyaları çalıştır:

1. supabase/migrations/019_order_state_machine.sql
2. supabase/migrations/020_stripe_connect.sql
3. supabase/migrations/021_automatic_balances.sql
```

**NASIL YAPILIR:**
1. https://supabase.com/dashboard adresine git
2. Projenizi seçin
3. Sol menüden "SQL Editor" tıklayın
4. "New query" tıklayın
5. Migration dosyasının içeriğini kopyala-yapıştır yap
6. "Run" butonuna bas
7. Hata yoksa bir sonraki migration'a geç

### 2. Environment Variables Ekle (.env.local)

Şu değişkenleri `.env.local` dosyana ekle:

```env
# Stripe Connect Webhook Secret
# Stripe Dashboard > Developers > Webhooks'tan al
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...

# Cron Job Secret (kendın olustur - rastgele gizli anahtar)
CRON_SECRET=super_gizli_rastgele_anahtar_123456

# Varsa kontrol et, yoksa ekle:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Stripe Webhook'larını Ayarla

**Stripe Dashboard:**
1. https://dashboard.stripe.com/test/webhooks adresine git
2. "Add endpoint" tıkla
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe/webhook`
4. Events to send seç:
   - ✅ checkout.session.completed
   - ✅ checkout.session.expired
   - ✅ payment_intent.succeeded
   - ✅ payment_intent.payment_failed

5. "Add endpoint" tıkla
6. Webhook signing secret'ı kopyala (whsec_...) → `.env.local`'a ekle

**Stripe Connect Webhook (İkinci webhook):**
1. Yine "Add endpoint" tıkla
2. Endpoint URL: `https://your-domain.vercel.app/api/stripe/connect-webhook`
3. Events to send seç:
   - ✅ account.updated
   - ✅ account.application.deauthorized
   - ✅ capability.updated
   - ✅ transfer.created
   - ✅ transfer.failed
   - ✅ transfer.reversed
   - ✅ payout.created
   - ✅ payout.failed
   - ✅ payout.paid

4. Signing secret'ı al → `STRIPE_CONNECT_WEBHOOK_SECRET` olarak kaydet

### 4. Uygulamayı Test Et

**Test Senaryosu 1: Sipariş Verme**
1. Sepete ürün ekle
2. Checkout yap
3. Test kartı ile öde: `4242 4242 4242 4242`, CVC: `123`, Tarih: `12/34`
4. Sipariş başarılı olmalı
5. Supabase'de kontrol et:
   - orders tablosunda yeni sipariş `state = 'PAID'` olmalı
   - order_items'da `seller_payout_amount` ve `platform_commission` dolu olmalı
   - seller_balances'ta `pending_balance` artmış olmalı

**Test Senaryosu 2: State Machine**
1. Bir siparişi al (orders tablosundan)
2. State'ini kontrol et
3. `/api/orders/transition` API'sine POST isteği at:
```json
{
  "orderId": "siparis-id-buraya",
  "toState": "SHIPPED",
  "metadata": {
    "tracking_number": "TEST123456",
    "carrier": "DHL"
  }
}
```
4. State SHIPPED'e geçmeli

**Test Senaryosu 3: Satıcı Onboarding**
1. Satıcı hesabına giriş yap
2. `/seller/dashboard` sayfasına git
3. "Stripe Connect'i Kur" butonuna tıkla
4. Stripe onboarding'i tamamla
5. `sellers` tablosunda `stripe_account_id` dolmalı

### 5. Production Deploy (Vercel)

```bash
# Terminal'de:
vercel --prod
```

Ya da Vercel Dashboard'dan:
1. https://vercel.com/dashboard
2. Projenı seç
3. Settings > Environment Variables
4. Tüm env variable'ları ekle
5. Redeploy

### 6. Cron Job'u Aktif Et

Vercel'de cron job otomatik çalışacak (`vercel.json` zaten ayarlı).

**Manuel test etmek için:**
```bash
curl -X GET "https://your-domain.vercel.app/api/cron/process-escrow" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🔍 Hata Ayıklama

### Sipariş veremiyorsan:
1. Browser Console'u aç (F12)
2. Network tab'ına bak
3. `/api/stripe/create-checkout-session` çağrısını kontrol et
4. Hata mesajını oku

**Olası hatalar:**
- "state column does not exist" → Migration çalıştırılmamış
- "violates foreign key constraint" → seller_id yanlış
- "stripe account not found" → Satıcı Stripe onboarding yapmamış

### Webhook çalışmıyorsa:
1. Stripe Dashboard > Webhooks > Recent events
2. Failed events varsa tıkla
3. Hata mesajını oku
4. Webhook URL'nin doğru olduğundan emin ol

### Balance güncellenmiyor mu:
1. Supabase > SQL Editor'de çalıştır:
```sql
SELECT * FROM orders WHERE id = 'siparis-id';
-- state = 'PAID' mi kontrol et

SELECT * FROM seller_balances;
-- pending_balance artmış mı kontrol et
```

## 📞 Sorun Olursa

1. Browser console'u kontrol et (F12)
2. Supabase Logs'u kontrol et (Database > Logs)
3. Vercel Logs'u kontrol et (Deployment > Logs)
4. Terminal'de `npm run dev` çalıştır, konsoldaki hataları oku

## 🎯 Başarı Kriterleri

✅ Sipariş verilebiliyor
✅ Ödeme alınıyor
✅ Order state PAID oluyor
✅ Seller balance otomatik artıyor
✅ Commission hesaplanıyor
✅ Hamburger menüde gizlilik linkleri görünüyor

## 📚 Faydalı Komutlar

```bash
# Development server
npm run dev

# Production build test
npm run build

# Supabase types generate (eğer type hataları varsa)
npx supabase gen types typescript --local > types/supabase.ts

# Deploy to Vercel
vercel --prod
```

## 🚨 UYARILAR

1. **ASLA production Stripe key'lerini git'e commit etme!**
2. **Migration'ları sırayla çalıştır** (019 → 020 → 021)
3. **Webhook secret'ları .env.local'da sakla**
4. **Test kartı: 4242 4242 4242 4242** (production'da gerçek kart kullan)

## 🎉 Tamamlandığında

Tebrikler! Şu özelliklere sahip olacaksın:
- ✅ Çalışan marketplace
- ✅ Multi-seller checkout
- ✅ Otomatik komisyon hesaplama
- ✅ Satıcı ödemelerı (escrow ile)
- ✅ 12 durumlu sipariş takibi
- ✅ Gizlilik sayfaları hamburger menüde

---

**Son Güncelleme:** 1 Şubat 2026
**Durum:** Migration'lar oluşturuldu, hamburger menü güncellendi
**Sonraki Adım:** Migration'ları Supabase'de çalıştır!
