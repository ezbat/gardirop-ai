# 🚀 Production Checklist - Wearo

## ✅ Deployment Öncesi Kontroller

### 1. Database (Supabase)
- [ ] Production database oluşturuldu
- [ ] Tüm migration'lar çalıştırıldı (007-012)
- [ ] RLS (Row Level Security) politikaları aktif
- [ ] Indexler oluşturuldu
- [ ] Backup ayarlandı

### 2. Environment Variables
- [ ] `.env.local` dosyası production değerleriyle güncellendi
- [ ] Supabase URL ve Anon Key
- [ ] Stripe Live keys
- [ ] NextAuth secret
- [ ] Sentry DSN (opsiyonel)
- [ ] OpenAI API key (AI özellikler için)

### 3. API Konfigürasyonu
- [ ] Stripe webhook endpoint eklendi
- [ ] Webhook secret alındı
- [ ] Rate limiting yapılandırıldı
- [ ] CORS ayarları yapıldı

### 4. Güvenlik
- [ ] Security headers aktif (`next.config.ts`)
- [ ] `.env` dosyaları `.gitignore`'da
- [ ] API route'ları auth kontrolü yapıyor
- [ ] Rate limiting aktif
- [ ] XSS ve CSRF koruması aktif

### 5. Performance
- [ ] Image optimization yapılandırıldı
- [ ] Bundle size kontrol edildi
- [ ] Lazy loading aktif
- [ ] Caching stratejisi belirlendi

### 6. SEO
- [ ] Meta tags eklendi
- [ ] Sitemap.xml oluşturuldu
- [ ] Robots.txt eklendi
- [ ] Open Graph tags var

### 7. Monitoring
- [ ] Sentry kuruldu (error tracking)
- [ ] Vercel Analytics aktif
- [ ] Uptime monitoring ayarlandı

## 🧪 Test Checklist

### Temel Fonksiyonlar
- [ ] Ana sayfa yükleniyor
- [ ] Kullanıcı kaydı çalışıyor
- [ ] Giriş yapma çalışıyor
- [ ] Ürünler listeleniyor
- [ ] Ürün detay sayfası çalışıyor

### E-ticaret Akışı
- [ ] Sepete ürün ekleme
- [ ] Sepet görüntüleme
- [ ] Checkout sayfası
- [ ] Stripe ödeme
- [ ] Sipariş onayı
- [ ] Email bildirimi geldi

### Seller Özellikleri
- [ ] Satıcı başvurusu
- [ ] Ürün ekleme
- [ ] Sipariş görüntüleme
- [ ] Analytics dashboard

### Admin Özellikleri
- [ ] Admin girişi
- [ ] Ürün moderasyonu
- [ ] Satıcı onaylama
- [ ] İstatistikler

### Yeni Özellikler
- [ ] Ürün yorumları yapılabiliyor
- [ ] Yorum faydalı butonu çalışıyor
- [ ] Wishlist'e ekleme/çıkarma
- [ ] Bildirimler gösteriliyor
- [ ] Bildirim okuma/silme çalışıyor
- [ ] Kargo takibi görünüyor

## 🔧 Performance Kontrolleri

### Lighthouse Skorları (Target)
- [ ] Performance: >90
- [ ] Accessibility: >90
- [ ] Best Practices: >90
- [ ] SEO: >90

### Core Web Vitals
- [ ] LCP (Largest Contentful Paint): <2.5s
- [ ] FID (First Input Delay): <100ms
- [ ] CLS (Cumulative Layout Shift): <0.1

### Bundle Size
```bash
npm run build
# Total size < 500KB ideal
```

## 📊 Deployment Sonrası

### İlk 24 Saat
- [ ] Error rate kontrol et (Sentry)
- [ ] API response times (Vercel)
- [ ] Database performance (Supabase)
- [ ] Uptime monitoring (99.9%+)

### İlk Hafta
- [ ] User feedback topla
- [ ] Bug reports kontrol et
- [ ] Performance metrics analiz et
- [ ] Conversion rate takip et

### Aylık
- [ ] Security audit
- [ ] Dependency updates
- [ ] Database cleanup
- [ ] Backup verification

## 🚨 Acil Durum Planı

### Rollback Prosedürü
```bash
# Vercel'de önceki deployment'a dön
vercel promote <previous-deployment-url>

# Git'te geri al
git revert HEAD
git push origin main
```

### Kritik Hatalar
1. Database bağlantı hatası → Supabase status kontrol et
2. Payment hatası → Stripe dashboard kontrol et
3. Email gitmiyor → SMTP ayarları kontrol et
4. High error rate → Sentry'de hataları incele

## 📝 Notlar

### Önemli Linkler
- Vercel Dashboard: https://vercel.com/dashboard
- Supabase Dashboard: https://app.supabase.com
- Stripe Dashboard: https://dashboard.stripe.com
- Sentry Dashboard: https://sentry.io

### İletişim
- Development Team: dev@wearo.com
- Support: support@wearo.com
- Emergency: +90 XXX XXX XXXX

---

## ✅ Deployment Onayı

- [ ] Tüm checklistler tamamlandı
- [ ] Testler başarılı
- [ ] Stakeholder onayı alındı
- [ ] Backup plan hazır

**Onaylayan**: _______________
**Tarih**: _______________
**Versiyon**: v1.0.0

---

🎉 **PRODUCTION'A HAZIR!**
