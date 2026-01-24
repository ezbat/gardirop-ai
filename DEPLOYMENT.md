# 🚀 Production Deployment Rehberi

## Genel Bakış

Bu rehber, Wearo platformunun Vercel'e production deployment sürecini adım adım açıklar.

---

## 📋 Ön Gereksinimler

### 1. Servis Hesapları
- ✅ Vercel hesabı
- ✅ Stripe hesabı (Live mode)
- ✅ Supabase projesi (Production database)
- ✅ Resend hesabı (Email servisi)
- ✅ GitHub repository

### 2. Domain (Opsiyonel ama önerilen)
- Custom domain (örn: wearo.com)
- DNS erişimi

---

## 🗄️ Database Setup (Supabase)

### 1. Production Database Oluşturun

1. [Supabase Dashboard](https://app.supabase.com) > New Project
2. Proje ayarları:
   - **Name**: wearo-production
   - **Database Password**: Güçlü bir şifre
   - **Region**: En yakın bölge (Europe West için)

### 2. Database Migration'ları Çalıştırın

Supabase SQL Editor'da tüm migration SQL dosyalarını sırayla çalıştırın:

1. **Users & Auth Tables**
2. **Sellers Table**
3. **Products Table**
4. **Orders & Order Items Tables**
5. **Outfits & Outfit Items Tables**
6. **Favorites Tables** (product_favorites, outfit_favorites, seller_follows)

### 3. API Anahtarlarını Alın

Settings > API bölümünden:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Bu key'i asla client-side'da kullanmayın!)

---

## 💳 Stripe Setup (Live Mode)

### 1. Live Mode'a Geçin

1. Stripe Dashboard > Sağ üst toggle'dan **Live mode**'u aktifleştirin
2. Business bilgilerini tamamlayın (Stripe bunu zorunlu kılıyor)

### 2. API Anahtarlarını Alın

Developers > API Keys:
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (pk_live_...)
- ✅ `STRIPE_SECRET_KEY` (sk_live_...)

### 3. Webhook Endpoint Ekleyin

1. Developers > Webhooks > Add endpoint
2. **Endpoint URL**: `https://yourdomain.com/api/stripe/webhook`
3. **Events**:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. **Webhook Secret'ı** kopyalayın (`whsec_...`)

⚠️ **NOT**: İlk deployment'tan sonra domain'iniz değişebilir, o zaman webhook URL'ini güncelleyin.

---

## 📧 Resend Email Setup

### 1. Domain Verify

1. [Resend Dashboard](https://resend.com/domains) > Add Domain
2. DNS kayıtlarını ekleyin (MX, TXT, CNAME)
3. Verification tamamlanana kadar bekleyin (~24 saat)

### 2. API Key Alın

1. API Keys bölümüne gidin
2. Create API Key > **Full Access**
3. Key'i kopyalayın (`re_...`)

### 3. From Email Ayarlayın

Domain verify edildikten sonra:
```
RESEND_FROM_EMAIL=orders@yourdomain.com
```

⚠️ **Geliştirme için**: Verify edilmemiş domain'de `onboarding@resend.dev` kullanabilirsiniz.

---

## 🚀 Vercel Deployment

### 1. GitHub'a Push Edin

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### 2. Vercel'e Import Edin

1. [Vercel Dashboard](https://vercel.com/new)
2. **Import Git Repository** > GitHub'dan projenizi seçin
3. **Framework Preset**: Next.js (otomatik algılanır)
4. **Root Directory**: `./` (default)

### 3. Environment Variables Ekleyin

Vercel > Settings > Environment Variables bölümünde **tüm** şu değişkenleri ekleyin:

#### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # ⚠️ Production, Preview, Development hepsinde olmalı
```

#### Stripe
```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx # ⚠️ Sadece Production ve Preview'de
STRIPE_WEBHOOK_SECRET=whsec_xxxxx # Domain'den sonra eklenecek
```

#### Resend
```bash
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=orders@yourdomain.com
```

#### NextAuth (Eğer kullanıyorsanız)
```bash
NEXTAUTH_SECRET=random-32-char-secret-here
NEXTAUTH_URL=https://yourdomain.com
```

### 4. Deploy Edin

**Deploy** butonuna tıklayın ve deployment tamamlanana kadar bekleyin (~2-3 dakika).

### 5. Domain Bağlayın (Opsiyonel)

1. Vercel Dashboard > Settings > Domains
2. **Add Domain** > domain'inizi girin (örn: wearo.com)
3. DNS ayarlarınızı yapın:
   - **A Record**: Vercel IP'si
   - **CNAME**: www subdomain için
4. SSL sertifikası otomatik oluşturulacak

---

## 🔧 Deployment Sonrası Setup

### 1. Stripe Webhook'u Güncelleyin

Artık production domain'iniz hazır:

1. Stripe Dashboard > Webhooks
2. Endpoint URL'i güncelleyin: `https://yourdomain.com/api/stripe/webhook`
3. **Webhook Secret**'ı kopyalayıp Vercel environment variables'a ekleyin:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```
4. Vercel'de **Redeploy** edin (Settings > Deployments > ... > Redeploy)

### 2. Test Edin

#### ✅ Temel Fonksiyonellik
- [ ] Ana sayfa yükleniyor
- [ ] Store sayfası çalışıyor
- [ ] Ürünler görünüyor
- [ ] Auth sistemi çalışıyor (giriş/kayıt)

#### ✅ E-ticaret Akışı
- [ ] Sepete ürün ekleme
- [ ] Checkout sayfası
- [ ] Stripe ödeme ekranı
- [ ] Ödeme sonrası yönlendirme
- [ ] Sipariş confirmation email geldi mi?

#### ✅ Seller İşlemleri
- [ ] Satıcı başvurusu
- [ ] Satıcı paneli erişimi
- [ ] Ürün ekleme
- [ ] Sipariş görüntüleme
- [ ] Analytics dashboard

#### ✅ Admin İşlemleri
- [ ] Admin paneline giriş
- [ ] Ürün moderasyonu
- [ ] Satıcı onaylama
- [ ] Email gönderimi (onay/red)

### 3. Monitoring Setup (Önerilen)

#### Vercel Analytics
- Vercel Dashboard > Analytics tab
- Otomatik aktif, ekstra setup gerektirmez

#### Error Tracking (Sentry)
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

#### Uptime Monitoring
- [UptimeRobot](https://uptimerobot.com) - Ücretsiz
- [Better Uptime](https://betteruptime.com) - Daha gelişmiş

---

## 🔒 Güvenlik Kontrolleri

### Pre-Launch Checklist:
- [ ] Tüm API endpoint'leri auth kontrolü yapıyor
- [ ] CORS ayarları doğru
- [ ] Rate limiting var (opsiyonel)
- [ ] SQL injection koruması (Supabase RLS aktif)
- [ ] XSS koruması (React otomatik hallediyor)
- [ ] HTTPS zorunlu
- [ ] Environment variables güvenli
- [ ] Admin paneli yetkili kişilere açık
- [ ] Webhook signature doğrulaması aktif
- [ ] Email sender domain verify edildi

---

## 📊 Performance Optimization

### 1. Image Optimization
Next.js Image component kullanıyoruz, otomatik optimize ediyor.

### 2. Database Indexing
Supabase'de önemli kolonlarda index var mı kontrol edin:
```sql
-- Örnek index'ler
CREATE INDEX idx_products_seller_id ON products(seller_id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
```

### 3. Caching
Vercel otomatik edge caching yapıyor, ekstra setup gerekmez.

---

## 🚨 Troubleshooting

### Problem: Webhook çalışmıyor
**Çözüm**:
1. Stripe Dashboard > Webhooks > Event logs kontrol edin
2. Endpoint URL doğru mu? (HTTPS olmalı)
3. Webhook secret Vercel'de doğru mu?
4. Vercel function logs kontrol edin

### Problem: Email gitmiyor
**Çözüm**:
1. Resend domain verify edildi mi?
2. API key doğru mu?
3. From email doğru mu?
4. Resend logs kontrol edin

### Problem: Database connection hatası
**Çözüm**:
1. Supabase environment variables doğru mu?
2. Service role key client-side'da kullanılmamış mı?
3. Supabase project pauselanmış olabilir (free tier)

### Problem: Build hatası
**Çözüm**:
1. Vercel deployment logs'u inceleyin
2. TypeScript hatası varsa düzeltin
3. `npm run build` local'de test edin

---

## 📈 Post-Launch

### 1. SEO
- Google Search Console'a ekleyin
- Sitemap submit edin (`/sitemap.xml`)
- Meta tags optimize edin

### 2. Analytics
- Google Analytics entegrasyonu
- Conversion tracking
- User behavior analysis

### 3. Marketing
- Social media hesapları açın
- Email marketing listesi başlatın
- Influencer iş birlikleri

---

## 🔄 Continuous Deployment

Artık her `git push origin main` ile otomatik deploy olacak:

```bash
git add .
git commit -m "Feature: Added new analytics"
git push origin main
# Vercel otomatik deploy edecek
```

Preview deployments: Her PR için otomatik preview URL oluşur.

---

## 📚 Faydalı Linkler

- [Vercel Docs](https://vercel.com/docs)
- [Next.js Production Checklist](https://nextjs.org/docs/going-to-production)
- [Supabase Production Checklist](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Going Live](https://stripe.com/docs/keys#test-live-modes)
- [Resend Docs](https://resend.com/docs)

---

## ✅ DEPLOYMENT TAMAMLANDI!

🎉 Tebrikler! Wearo platformu artık production'da canlı.

**Son kontrol**:
- [ ] Gerçek bir ödeme yapın (küçük tutar)
- [ ] Email bildirimlerini kontrol edin
- [ ] Tüm sayfaları gezin
- [ ] Mobile'da test edin
- [ ] Farklı tarayıcılarda test edin

**Support için**: legal@wearo.com
