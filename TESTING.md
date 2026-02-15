# 🧪 Testing Guide - Wearo

## Test Stratejisi

Bu rehber Wearo platformunun test edilmesi için gerekli tüm bilgileri içerir.

---

## 🚀 Hızlı Başlangıç

### Demo Verisi Oluştur

```bash
npm run seed
```

Bu komut şunları oluşturur:
- 4 test kullanıcısı (admin, 2 satıcı, 1 alıcı)
- 40 ürün (her satıcıdan 20)
- 10 kombin koleksiyonu
- ~30 ürün yorumu
- 4 kupon kodu

### Test Kullanıcıları

```
Admin:  admin@wearo.com / Admin123!
Seller: seller1@wearo.com / Seller123!
Seller: seller2@wearo.com / Seller123!
Buyer:  buyer@wearo.com / Buyer123!
```

---

## 📋 Manuel Test Checklist

### 1. Kullanıcı Kaydı ve Girişi

#### Kayıt Testi
- [ ] Yeni kullanıcı kaydı oluşturulabiliyor
- [ ] Email validasyonu çalışıyor
- [ ] Şifre gereksinimleri kontrol ediliyor (min 8 karakter)
- [ ] Telefon formatı validasyonu çalışıyor
- [ ] Kayıt sonrası otomatik giriş yapılıyor

#### Giriş Testi
- [ ] Doğru bilgilerle giriş yapılabiliyor
- [ ] Yanlış şifre hata veriyor
- [ ] Olmayan email hata veriyor
- [ ] Session korunuyor (sayfa yenileme sonrası)
- [ ] Çıkış yapma çalışıyor

### 2. Ürün İşlemleri

#### Ürün Listeleme
- [ ] Ana sayfada ürünler görünüyor
- [ ] Mağaza sayfasında filtreleme çalışıyor
- [ ] Kategori filtreleri doğru çalışıyor
- [ ] Fiyat aralığı filtreleme çalışıyor
- [ ] Arama çalışıyor
- [ ] Sıralama (fiyat, yeni) çalışıyor

#### Ürün Detay
- [ ] Ürün detay sayfası açılıyor
- [ ] Görseller görüntülenebiliyor
- [ ] Beden seçimi yapılabiliyor
- [ ] Stok durumu gösteriliyor
- [ ] Yorumlar gösteriliyor
- [ ] Satıcı bilgileri gösteriliyor

#### Ürün Yorum Sistemi
- [ ] Yorum yazılabiliyor
- [ ] Yıldız seçimi çalışıyor
- [ ] Faydalı butonu çalışıyor
- [ ] Verified purchase rozeti gösteriliyor
- [ ] Ortalama rating güncelleniyor

### 3. Sepet İşlemleri

#### Sepete Ekleme
- [ ] Ürün sepete eklenebiliyor
- [ ] Aynı üründen birden fazla eklenebiliyor
- [ ] Sepet ikonunda miktar gösteriliyor
- [ ] Sepet sayfasında ürünler listeleniyor

#### Sepet Yönetimi
- [ ] Ürün miktarı artırılabiliyor/azaltılabiliyor
- [ ] Ürün silinebiliyor
- [ ] Toplam fiyat doğru hesaplanıyor
- [ ] Kupon kodu uygulanabiliyor
- [ ] İndirim hesaplaması doğru

### 4. Checkout ve Ödeme

#### Checkout Sayfası
- [ ] Teslimat adresi girişi çalışıyor
- [ ] Sipariş özeti gösteriliyor
- [ ] Toplam hesaplama doğru
- [ ] "Ödemeye Geç" butonu çalışıyor

#### Stripe Ödeme
```
Test Kartları:
✅ Başarılı: 4242 4242 4242 4242
❌ Reddedilen: 4000 0000 0000 0002
🔐 3D Secure: 4000 0025 0000 3155
```

- [ ] Stripe checkout ekranı açılıyor
- [ ] Başarılı ödeme sonrası yönlendirme çalışıyor
- [ ] Sipariş onay sayfası gösteriliyor
- [ ] Sipariş email'i gönderiliyor
- [ ] Sipariş database'e kaydediliyor

#### Sipariş Yönetimi
- [ ] Siparişler profilde listeleniyor
- [ ] Sipariş detayları görünüyor
- [ ] Sipariş durumu gösteriliyor
- [ ] Kargo takip numarası gösteriliyor (varsa)

### 5. Wishlist (İstek Listesi)

- [ ] Ürün wishlist'e eklenebiliyor
- [ ] Wishlist ikonunda miktar gösteriliyor
- [ ] Wishlist sayfasında ürünler listeleniyor
- [ ] Ürün wishlist'ten çıkarılabiliyor
- [ ] Wishlist'ten sepete eklenebiliyor

### 6. Bildirimler

#### Bildirim Oluşturma
- [ ] Sipariş sonrası bildirim geliyor
- [ ] Kargo güncellemesi bildirimi geliyor
- [ ] Yorum yapıldığında satıcıya bildirim geliyor

#### Bildirim Yönetimi
- [ ] Bildirim sayısı gösteriliyor
- [ ] Bildirimler listeleniyor
- [ ] Okunmamış bildirimler işaretli
- [ ] "Okundu işaretle" çalışıyor
- [ ] "Tümünü sil" çalışıyor
- [ ] Bildirime tıklayınca ilgili sayfaya yönlendirme

### 7. Satıcı Özellikleri

#### Satıcı Başvurusu
- [ ] Başvuru formu doldurulabiliyor
- [ ] Mağaza bilgileri kaydediliyor
- [ ] Admin onayı bekliyor durumuna geçiyor

#### Satıcı Paneli (Onaylı Satıcı)
- [ ] Satıcı dashboard'a erişim var
- [ ] İstatistikler gösteriliyor
- [ ] Ürün ekleme formu çalışıyor
- [ ] Görsel yükleme çalışıyor
- [ ] Ürün güncellenebiliyor
- [ ] Ürün silinebiliyor

#### Kombin Koleksiyonları
- [ ] Yeni kombin oluşturulabiliyor
- [ ] Ürün seçimi çalışıyor
- [ ] Kombin kaydediliyor
- [ ] Kombin ana sayfada gösteriliyor
- [ ] Kombin detay sayfası çalışıyor

#### Satıcı Siparişleri
- [ ] Gelen siparişler listeleniyor
- [ ] Sipariş detayları görünüyor
- [ ] Sipariş durumu güncellenebiliyor
- [ ] Kargo bilgisi eklenebiliyor

### 8. Admin Özellikleri

#### Ürün Moderasyonu
- [ ] Bekleyen ürünler listeleniyor
- [ ] Ürün onaylanabiliyor
- [ ] Ürün reddedilebiliyor
- [ ] Red nedeni girilip email gönderiliyor

#### Satıcı Yönetimi
- [ ] Bekleyen satıcılar listeleniyor
- [ ] Satıcı onaylanabiliyor
- [ ] Satıcı reddedilebiliyor
- [ ] Onay/red email'i gönderiliyor

#### İstatistikler
- [ ] Toplam kullanıcı sayısı gösteriliyor
- [ ] Toplam ürün sayısı gösteriliyor
- [ ] Toplam sipariş sayısı gösteriliyor
- [ ] Gelir gösteriliyor

### 9. İade ve İptal Sistemi

#### İade Talebi
- [ ] Sipariş detayından iade talebi oluşturulabiliyor
- [ ] İade nedeni seçilebiliyor
- [ ] Açıklama eklenebiliyor
- [ ] İade talebi kaydediliyor

#### İade Yönetimi (Satıcı)
- [ ] İade talepleri listeleniyor
- [ ] İade onaylanabiliyor/reddedilebiliyor
- [ ] İade durumu güncellenebiliyor

### 10. Kupon Sistemi

#### Kupon Kullanımı
- [ ] Sepette kupon kodu girişi var
- [ ] Geçerli kupon uygulanıyor
- [ ] İndirim tutarı hesaplanıyor
- [ ] Minimum tutar kontrolü çalışıyor
- [ ] Kullanım limiti kontrolü çalışıyor

#### Kupon Yönetimi (Satıcı)
- [ ] Yeni kupon oluşturulabiliyor
- [ ] Kupon tipi (yüzde/sabit) seçilebiliyor
- [ ] Geçerlilik tarihleri ayarlanabiliyor
- [ ] Kupon aktif/pasif yapılabiliyor

---

## 🤖 Otomatik Test Örnekleri

### API Test

```typescript
import { APITestHelper } from '@/lib/test-helpers'

const api = new APITestHelper('http://localhost:3000')

// Health check testi
const { data, error } = await api.call('/api/health')
console.log('Health:', data?.status)

// Rate limit testi
await api.testRateLimit('/api/products', 10)

// Auth flow testi
await api.testAuth('test@example.com', 'Test123!')
```

### Performance Test

```typescript
import { PerformanceTestHelper } from '@/lib/test-helpers'

const perf = new PerformanceTestHelper()

// Database query testi
await perf.measure('fetch-products', async () => {
  const response = await fetch('/api/products')
  return response.json()
})

// Rapor
perf.report()
```

### Database Test

```typescript
import { DatabaseTestHelper } from '@/lib/test-helpers'

const db = new DatabaseTestHelper()

// Test user oluştur
const user = await db.createTestUser('test@example.com')

// Test ürün oluştur
const product = await db.createTestProduct(sellerId)

// Test sipariş oluştur
const order = await db.createTestOrder(userId, [
  { product_id: productId, quantity: 2, price: 99.99 }
])

// Temizlik
await db.cleanup(user.id)
```

---

## 🔍 Edge Case Testleri

### Stok Yönetimi
- [ ] Stokta olmayan ürün sepete eklenmiyor
- [ ] Sipariş sonrası stok azalıyor
- [ ] Stok tükenince "Tükendi" yazıyor

### Paralel İşlemler
- [ ] Aynı anda 2 kişi son ürünü alsın (sadece biri başarılı olmalı)
- [ ] Kupon kullanım limiti aşılmasın

### Hatalı Girişler
- [ ] SQL injection koruması var
- [ ] XSS koruması var
- [ ] CSRF koruması var
- [ ] Rate limiting çalışıyor

### Özel Durumlar
- [ ] Satıcı kendi ürününü satın alamıyor
- [ ] Onaylanmamış ürünler listelenmiyor
- [ ] Silinen ürünler sipariş geçmişinde görünüyor (veri kaybı yok)

---

## 📊 Performance Test Kriterleri

### API Response Times
```
✅ GET /api/products: <500ms
✅ GET /api/products/[id]: <300ms
✅ POST /api/orders: <1000ms
✅ GET /api/orders: <500ms
```

### Page Load Times
```
✅ Ana Sayfa: <2s (LCP)
✅ Ürün Detay: <2s
✅ Checkout: <2s
✅ Dashboard: <3s
```

### Database Queries
```
✅ Product list: <100ms
✅ Order creation: <200ms
✅ Review submission: <150ms
```

---

## 🚨 Kritik Test Senaryoları

### Senaryo 1: Tam E-ticaret Akışı
1. Yeni kullanıcı kayıt ol
2. Ürünleri gez
3. 3 ürünü sepete ekle
4. Kupon kodu uygula
5. Checkout yap
6. Stripe ile ödeme yap
7. Sipariş onay email'ini kontrol et
8. Profilde siparişi gör

### Senaryo 2: Satıcı İşlem Akışı
1. Satıcı başvurusu yap
2. Admin olarak onayla
3. Satıcı paneline gir
4. Yeni ürün ekle
5. Kombin oluştur
6. Gelen siparişi görüntüle
7. Kargo bilgisi ekle

### Senaryo 3: İade Süreci
1. Sipariş oluştur
2. Sipariş durumunu "delivered" yap
3. İade talebi oluştur
4. Satıcı olarak iade talebi onayla
5. İade durumu güncellensin

---

## 🔧 Debugging Tips

### Database Issues
```bash
# Supabase logs
# Supabase Dashboard > Logs

# Local log check
npm run dev
# Check console for SQL errors
```

### API Issues
```bash
# API route logs
# Check terminal where "npm run dev" runs

# Network tab
# Chrome DevTools > Network
```

### Performance Issues
```bash
# Lighthouse audit
# Chrome DevTools > Lighthouse

# Bundle analyzer
npm run build
# Check .next/analyze
```

---

## ✅ Production Readiness Checklist

### Pre-Launch
- [ ] Tüm manuel testler başarılı
- [ ] Performance kriterleri sağlanıyor
- [ ] Security testleri geçti
- [ ] Email gönderimi çalışıyor
- [ ] Stripe webhook'u test edildi
- [ ] Database migration'ları çalıştırıldı

### Launch Day
- [ ] Production deployment başarılı
- [ ] Health check endpoint çalışıyor
- [ ] SSL sertifikası aktif
- [ ] Monitoring araçları aktif (Sentry, Analytics)
- [ ] Gerçek bir test siparişi verildi

### Post-Launch
- [ ] İlk 24 saat error rate normal
- [ ] Kullanıcı feedback'leri olumlu
- [ ] Performance metrikleri hedefte
- [ ] Backup stratejisi çalışıyor

---

## 📞 Test Sırasında Sorun mu?

### Support Kanalları
- GitHub Issues: [Repository Link]
- Email: dev@wearo.com
- Slack: #wearo-dev

### Hata Raporlama
Lütfen şunları ekleyin:
- Hangi adımda hata oluştu
- Beklenen sonuç
- Gerçekleşen sonuç
- Ekran görüntüsü (varsa)
- Console error'ları

---

**Happy Testing! 🎉**
