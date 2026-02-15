# 👗 Wearo - AI Destekli Moda Platformu

Modern, lüks ve kullanıcı dostu bir e-ticaret platformu. Next.js 15, Supabase ve Stripe ile geliştirilmiştir.

## ✨ Özellikler

### 🛍️ E-Ticaret
- **Ürün Mağazası**: Kategorilere göre filtreleme, arama, favorilere ekleme
- **Gelişmiş Filtreleme**: Fiyat aralığı, renk, beden, marka filtreleri
- **Sepet Yönetimi**: Gerçek zamanlı sepet, beden seçimi, stok kontrolü
- **Güvenli Ödeme**: Stripe entegrasyonu ile PCI-DSS uyumlu ödeme
- **Sipariş Takibi**: Detaylı sipariş geçmişi ve durum güncellemeleri
- **Email Bildirimleri**: Sipariş onayı, kargo bildirimleri
- **Ürün Yorumları**: 5-star rating, verified purchase badge, faydalı oylama
- **Wish List**: İstek listesi oluşturma ve yönetme
- **Kupon Sistemi**: İndirim kodları ve kampanyalar
- **İade Sistemi**: İade talebi oluşturma ve takibi
- **Kargo Takibi**: Gerçek zamanlı kargo durumu ve timeline

### 👔 Kombin Sistemi
- **Outfit Koleksiyonları**: Satıcılar ürünlerinden kombin oluşturabilir
- **Kombin Detayları**: Sezon, durum, fiyat bilgileri
- **Tek Tıkla Alışveriş**: Tüm kombini sepete ekle

### 🏪 Satıcı Paneli
- **Başvuru Sistemi**: Satıcı olma başvurusu ve admin onayı
- **Ürün Yönetimi**: Ürün ekleme, düzenleme, stok takibi
- **Sipariş Takibi**: Gelen siparişleri görüntüleme ve yönetme
- **Analytics Dashboard**:
  - Toplam gelir ve satış istatistikleri
  - 7 günlük satış grafiği (Recharts)
  - En çok satan ürünler
  - Düşük stok uyarıları
  - Son siparişler

### 🔐 Admin Paneli
- **Ürün Moderasyonu**: Ürünleri onaylama/reddetme
- **Satıcı Yönetimi**: Satıcı başvurularını değerlendirme, email bildirimleri
- **Kombin Moderasyonu**: Outfit koleksiyonlarını kontrol
- **Kullanıcı Yönetimi**: Tüm kullanıcıları görüntüleme
- **İstatistikler**: Platform geneli analytics

### 🌍 Çok Dilli Destek
- Türkçe 🇹🇷
- İngilizce 🇬🇧
- Almanca 🇩🇪

### 📱 Kullanıcı Deneyimi
- **Responsive Design**: Mobil, tablet ve desktop optimizasyonu
- **Dark Mode**: Göz yormayan karanlık tema
- **Glass Morphism**: Modern ve lüks arayüz tasarımı
- **Pagination**: Performanslı sayfalama (12 ürün/sayfa)
- **Favori Sistemi**: Ürünleri favorilere ekleme
- **Cookie Consent**: KVKK/GDPR uyumlu çerez onayı
- **Real-time Notifications**: Otomatik bildirimler (sipariş, kargo, yorumlar)
- **Image Optimization**: AVIF/WebP formatları, lazy loading
- **SEO Optimized**: Dynamic sitemap, meta tags, Open Graph

### ⚖️ Yasal Uyumluluk
- **Gizlilik Politikası**: KVKK ve GDPR uyumlu
- **Kullanım Şartları**: Detaylı hizmet koşulları
- **Çerez Politikası**: Kullanıcı onay sistemi
- **Footer Linkleri**: Tüm yasal sayfalara kolay erişim

## 🛠️ Teknoloji Stack

### Frontend
- **Next.js 15**: React framework (App Router)
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS
- **Lucide Icons**: Modern icon seti
- **Recharts**: Grafik ve chart'lar

### Backend
- **Next.js API Routes**: Serverless API
- **Supabase**: PostgreSQL database, auth, storage
- **Stripe**: Ödeme altyapısı
- **Resend**: Email servisi
- **Rate Limiting**: API koruma (in-memory sliding window)
- **Sentry**: Error tracking ve performance monitoring

### Altyapı
- **Vercel**: Hosting ve deployment
- **GitHub**: Version control
- **Edge Functions**: Global performans
- **Security Headers**: HSTS, CSP, XSS protection

## 📁 Proje Yapısı

```
my-app/
├── app/
│   ├── api/                    # API routes
│   │   ├── admin/             # Admin endpoints
│   │   ├── seller/            # Seller endpoints
│   │   ├── stripe/            # Payment endpoints
│   │   └── favorites/         # Favorites endpoints
│   ├── admin/                 # Admin panel pages
│   ├── seller/                # Seller dashboard pages
│   ├── store/                 # Store pages
│   ├── cart/                  # Cart & checkout
│   ├── orders/                # Order pages
│   ├── privacy/               # Privacy policy
│   └── terms/                 # Terms of service
├── components/                # React components
│   ├── navbar.tsx
│   ├── footer.tsx
│   ├── cookie-consent.tsx
│   └── ...
├── lib/
│   ├── supabase.ts           # Supabase client
│   ├── stripe.ts             # Stripe client
│   ├── email-templates.ts    # Email templates
│   └── i18n/                 # Translations
│       ├── tr.ts
│       ├── en.ts
│       └── de.ts
├── public/                    # Static assets
├── DEPLOYMENT.md             # Deployment guide
├── STRIPE_SETUP.md           # Stripe setup guide
└── README.md
```

## 🚀 Kurulum

### 1. Repository'i Clone Edin

```bash
git clone https://github.com/yourusername/wearo.git
cd wearo/my-app
```

### 2. Dependencies Kurun

```bash
npm install
```

### 3. Environment Variables

`.env.local` dosyası oluşturun:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx

# Stripe (Test Mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Resend
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=orders@yourdomain.com
```

### 4. Database Setup

Supabase SQL Editor'da migration dosyalarını çalıştırın:
- Users & Auth
- Sellers
- Products
- Orders
- Outfits
- Favorites

### 5. Development Server

```bash
npm run dev
```

Tarayıcıda: http://localhost:3000

### 6. Stripe Webhook (Local)

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 📖 Dokümantasyon

- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Production deployment rehberi
- **[STRIPE_SETUP.md](STRIPE_SETUP.md)**: Stripe entegrasyon rehberi

## 🧪 Test Etme

### Test Kart Numaraları (Stripe Test Mode)

✅ **Başarılı Ödeme**:
- Kart: `4242 4242 4242 4242`
- Tarih: `12/34`
- CVC: `123`

❌ **Başarısız Ödeme**:
- Kart: `4000 0000 0000 0002`

### Test Kullanıcıları

Admin kullanıcısı oluşturmak için Supabase'de:
```sql
UPDATE users SET role = 'admin' WHERE email = 'admin@example.com';
```

## 🎨 Özelleştirme

### Renkler

`app/globals.css` dosyasında tema renklerini değiştirebilirsiniz:
```css
--primary: oklch(0.78 0.14 85);  /* Altın */
--background: oklch(0.05 0.01 260);  /* Lacivert */
```

### Dil Eklemek

1. `lib/i18n/` klasörüne yeni dil dosyası ekleyin (örn: `fr.ts`)
2. `lib/language-context.tsx`'de yeni dili ekleyin
3. Navbar'da dil seçeneğine ekleyin

## 📊 Veritabanı Şeması

### Temel Tablolar

- **users**: Kullanıcı bilgileri
- **sellers**: Satıcı profilleri
- **products**: Ürün kataloğu
- **orders**: Siparişler
- **order_items**: Sipariş detayları
- **outfits**: Kombin koleksiyonları
- **outfit_items**: Kombin ürünleri
- **product_favorites**: Favori ürünler
- **outfit_favorites**: Favori kombinler
- **seller_follows**: Takip edilen satıcılar

## 🔐 Güvenlik

- ✅ Supabase Row Level Security (RLS)
- ✅ Stripe webhook signature verification
- ✅ Environment variables for secrets
- ✅ HTTPS only (production)
- ✅ Input validation
- ✅ XSS protection (React)
- ✅ SQL injection protection (Supabase)

## 🚢 Production Deployment

Detaylı deployment rehberi için: **[DEPLOYMENT.md](DEPLOYMENT.md)**

Kısa özet:
1. Vercel'e deploy edin
2. Environment variables'ı ayarlayın
3. Stripe webhook'u production URL'e ekleyin
4. Domain'i bağlayın
5. SSL sertifikası otomatik

## 📈 Performance

- Next.js Image Optimization
- Edge Functions (Vercel)
- Database Indexing
- Lazy Loading
- Code Splitting
- Cache Optimization

## 🐛 Troubleshooting

### Webhook çalışmıyor
1. Stripe CLI çalışıyor mu?
2. Webhook secret doğru mu?
3. Event logs'u kontrol edin

### Email gitmiyor
1. Resend domain verify edildi mi?
2. API key doğru mu?
3. From email doğru mu?

### Build hatası
1. `npm run build` ile local test edin
2. TypeScript hatalarını düzeltin
3. Environment variables eksiksiz mi?

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altındadır.

## 📞 İletişim

- **Email**: wearo.product@gmail.com
- **Website**: https://wearo.com

## 🙏 Teşekkürler

- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Stripe](https://stripe.com)
- [Vercel](https://vercel.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)

---

**⭐ Projeyi beğendiyseniz yıldız atmayı unutmayın!**

🚀 **WEARO - Tarzınızı Keşfedin**
