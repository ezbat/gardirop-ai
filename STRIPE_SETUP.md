# 🔐 Stripe Entegrasyonu - Kurulum Rehberi

## ✅ TAMAMLANAN İŞLEMLER

1. ✅ Stripe SDK kuruldu (`stripe` & `@stripe/stripe-js`)
2. ✅ Stripe checkout session API oluşturuldu
3. ✅ Webhook handler eklendi
4. ✅ Checkout sayfası güncellendi
5. ✅ Orders tablosuna payment tracking alanları eklendi
6. ✅ Order confirmation sayfası oluşturuldu

---

## 🚀 KURULUM ADIMLARI

### 1. Stripe Hesabı Oluşturun

1. [https://dashboard.stripe.com/register](https://dashboard.stripe.com/register) adresinden kayıt olun
2. Test mode'da kalın (sağ üstte "Test mode" yazdığından emin olun)

### 2. API Anahtarlarını Alın

1. Dashboard'da **Developers > API keys** bölümüne gidin
2. Aşağıdaki anahtarları kopyalayın:
   - **Publishable key** (pk_test_... ile başlar)
   - **Secret key** (sk_test_... ile başlar)

### 3. `.env.local` Dosyasını Güncelleyin

```bash
# Stripe Keys (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Bu adımda henüz yok, webhook kurulduktan sonra eklenecek
```

### 4. Supabase'de Veritabanı Güncelleme

Supabase SQL Editor'da aşağıdaki komutu çalıştırın:

```sql
-- Add payment tracking fields to orders table
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent_id ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- Add check constraint for payment_status
ALTER TABLE orders
ADD CONSTRAINT check_payment_status
CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));
```

### 5. Webhook Kurulumu (Önemli!)

Webhooklar Stripe'ın ödeme durumunu bildirmesi için kritiktir.

#### Geliştirme (Local) için:

1. Stripe CLI'yi indirin: [https://stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli)
2. Terminal'de giriş yapın:
   ```bash
   stripe login
   ```
3. Webhook'u local'e yönlendirin:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Terminal'de çıkan `whsec_...` webhook secret'ı `.env.local`'e ekleyin:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

#### Production için:

1. **Stripe Dashboard'a gidin ve Live mode'a geçin** (sağ üstteki toggle)
2. **Developers > API keys** bölümünden Live API anahtarlarınızı alın:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_... ile başlar)
   - `STRIPE_SECRET_KEY` (sk_live_... ile başlar)
3. **Developers > Webhooks** bölümüne gidin
4. **Add endpoint** butonuna tıklayın
5. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
   - ⚠️ **ÖNEMLİ**: Mutlaka HTTPS kullanın!
   - Örnek: `https://wearo.vercel.app/api/stripe/webhook`
6. **Events to send** (Dinlenecek event'ler):
   - ✅ `checkout.session.completed` - Ödeme tamamlandığında
   - ✅ `checkout.session.expired` - Checkout session süresi dolduğunda
   - ✅ `payment_intent.succeeded` - Ödeme başarılı olduğunda
   - ✅ `payment_intent.payment_failed` - Ödeme başarısız olduğunda
7. **Webhook secret'ı** kopyalayın (whsec_... ile başlar)
8. Production environment variables'a ekleyin:
   ```bash
   # Vercel'de: Settings > Environment Variables
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

#### Production Checklist:
- [ ] Live mode API anahtarları `.env.production` veya Vercel'de ayarlandı
- [ ] Webhook endpoint HTTPS ile erişilebilir
- [ ] Webhook secret production'da doğru
- [ ] Resend API key production'da doğru (email için)
- [ ] Test ödeme yapıldı ve başarılı oldu
- [ ] Webhook event'leri Stripe Dashboard'da görünüyor

### 6. Dev Server'ı Yeniden Başlatın

```bash
npm run dev
```

---

## 🧪 TEST ETME

### Test Kart Numaraları

Stripe test mode'da aşağıdaki kartları kullanabilirsiniz:

✅ **Başarılı ödeme:**
- Kart: `4242 4242 4242 4242`
- Tarih: Gelecekteki herhangi bir tarih (örn: 12/34)
- CVC: Herhangi 3 rakam (örn: 123)
- ZIP: Herhangi 5 rakam (örn: 12345)

❌ **Başarısız ödeme:**
- Kart: `4000 0000 0000 0002`
- (Diğer bilgiler aynı)

### Test Akışı

1. **Ürün sepete ekleyin**
2. **Checkout sayfasına gidin** (`/checkout`)
3. **Teslimat bilgilerini doldurun**
4. **"Siparişi Tamamla"** butonuna tıklayın
5. **Stripe checkout sayfasına yönlendirileceksiniz**
6. **Test kartıyla ödeme yapın**
7. **Order confirmation sayfasına yönlendirileceksiniz**
8. **Webhook çalışacak ve sipariş "processing" durumuna geçecek**

### Kontrol Noktaları

✅ Stripe checkout sayfası açılıyor mu?
✅ Ödeme sonrası confirmation page'e yönlendiriliyor mu?
✅ Orders tablosunda `payment_status` "paid" olarak güncelleniyor mu?
✅ Webhook'tan gelen event'ler Stripe Dashboard > Developers > Webhooks bölümünde görünüyor mu?

---

## 📊 ÖDEME AKIŞI

```
1. User clicks "Siparişi Tamamla"
   ↓
2. API: /api/stripe/create-checkout-session
   - Order oluşturulur (status: pending, payment_status: pending)
   - Order items eklenir
   - Stripe checkout session oluşturulur
   ↓
3. User Stripe'a yönlendirilir
   ↓
4. User ödeme yapar
   ↓
5. Stripe webhook tetiklenir: checkout.session.completed
   ↓
6. API: /api/stripe/webhook
   - Order güncellenir (status: processing, payment_status: paid)
   - paid_at timestamp eklenir
   ↓
7. User confirmation page'e yönlendirilir
```

---

## 🔒 GÜVENLİK

- ✅ Webhook signature doğrulaması aktif
- ✅ Ödeme bilgileri asla sunucuda saklanmıyor
- ✅ Stripe tarafından PCI-DSS uyumlu
- ✅ Secret key'ler environment variable'da
- ⚠️ **ÖNEMLİ:** Production'da mutlaka HTTPS kullanın

---

## 🚨 SORUN GİDERME

### "Invalid signature" hatası
- `.env.local`'deki `STRIPE_WEBHOOK_SECRET` doğru mu kontrol edin
- Stripe CLI çalışıyor mu? (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)

### Ödeme başarılı ama order güncell enmiyor
- Webhook event'leri Stripe Dashboard'da kontrol edin
- Console log'larını inceleyin
- `orders` tablosunda `stripe_session_id` doğru kaydedilmiş mi?

### "Order not found" hatası
- Order oluşturuldu mu kontrol edin
- Supabase'de migration çalıştırıldı mı?

---

## 🎯 TAMAMLANAN ÖZELLİKLER

1. ✅ Stripe payment entegrasyonu
2. ✅ Email notifications (Resend)
3. ✅ Admin paneli (ürün/satıcı moderasyonu)
4. ✅ Pagination & performans optimizasyonu
5. ✅ User engagement (favorites sistemi)
6. ✅ Seller analytics dashboard
7. ✅ Legal compliance (KVKK/GDPR sayfaları)
8. ✅ Cookie consent banner
9. ✅ Footer ile yasal linkler

## 📋 PRODUCTION DEPLOYMENT CHECKLIST

### Stripe Production Setup:
- [ ] Stripe Dashboard'da Live mode'a geçildi
- [ ] Live API anahtarları alındı (pk_live_... ve sk_live_...)
- [ ] Production webhook endpoint eklendi
- [ ] Webhook secret production environment'a eklendi
- [ ] Test ödeme yapıldı ve doğrulandı

### Environment Variables (Vercel):
```bash
# Stripe (Live)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Resend (Email)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=orders@yourdomain.com

# NextAuth (Optional if using)
NEXTAUTH_SECRET=xxxxx
NEXTAUTH_URL=https://yourdomain.com
```

### Genel Production Checklist:
- [ ] Database migrations çalıştırıldı
- [ ] HTTPS aktif ve çalışıyor
- [ ] Email servisi test edildi
- [ ] Tüm API endpoint'leri test edildi
- [ ] Error logging aktif
- [ ] Analytics entegre edildi (opsiyonel)
- [ ] SEO meta tag'leri optimize edildi
- [ ] Performance test yapıldı

## 🚀 DEPLOYMENT ADIMLARI (Vercel)

1. **GitHub'a push edin**
2. **Vercel'e import edin**: https://vercel.com/new
3. **Environment variables'ı ayarlayın** (yukarıdaki liste)
4. **Deploy edin**
5. **Domain'i Stripe webhook'a ekleyin**
6. **Test edin**:
   - Ürün satın alma
   - Email gönderimi
   - Webhook event'leri
   - Admin paneli
   - Satıcı dashboard'u

## 💡 ÖNEMLİ NOTLAR

- **STRIPE_WEBHOOK_SECRET**: Her environment için farklı (local, staging, production)
- **Email Sender**: Resend'de domain verify edilmeli
- **Database**: Production'da connection pooling aktif olmalı
- **Rate Limiting**: API endpoint'lerine rate limit eklenebilir
- **Monitoring**: Sentry veya benzer hata takip sistemi önerilir

---

## 📚 KAYNAKLAR

- [Stripe Docs](https://stripe.com/docs)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Cards](https://stripe.com/docs/testing)
- [Webhooks](https://stripe.com/docs/webhooks)
