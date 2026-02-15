# 📦 Kargo Takip Sistemi

## Nasıl Çalışır?

Bu sistem **API'siz** çalışır - tamamen ücretsiz!

### 1. Satıcı Kargoya Verir

```
Satıcı Dashboard → Sipariş → "Kargoya Ver"
├─ Takip numarası girer: 123456789012
├─ Kargo şirketi seçer: DHL / DPD / Hermes
└─ Gönder
```

**Sistem ne yapar:**
1. ✅ Takip numarası formatını kontrol eder
2. ✅ Siparişi `SHIPPED` durumuna geçirir
3. ✅ Müşteriye **email** gönderir (takip linki ile)
4. ✅ Müşteriye **in-app bildirim** gönderir
5. ✅ Database'e kaydeder

### 2. Müşteri Kargo Takip Eder

**Email'den:**
- "📍 Sendung verfolgen" butonuna basar
- DHL/DPD/Hermes web sitesi açılır
- Gerçek kargo durumunu görür

**Uygulamadan:**
- Siparişler sayfasında tracking numarasını görür
- "Verfolgen" butonuna basar
- Kargo şirketinin sitesine gider

### 3. Desteklenen Kargo Şirketleri

| Kargo | Format | Örnek |
|-------|--------|-------|
| **DHL** | 12-14 rakam veya JJD... | `123456789012` |
| **DPD** | 14 rakam | `12345678901234` |
| **Hermes** | 16 rakam | `1234567890123456` |
| **UPS** | 1Z + 16 karakter | `1Z12345678901234` |
| **FedEx** | 12-14 rakam | `123456789012` |
| **Manuel** | Herhangi | `ABC123` |

### 4. Email Örneği

```
📦 Gute Nachrichten!

Hallo Max,
Ihre Bestellung wurde versandt!

━━━━━━━━━━━━━━━━━━━━
Bestellnummer: WR-ABC123
Versanddienstleister: DHL
Sendungsnummer: 123456789012
Voraussichtliche Lieferung: Freitag, 7. Februar 2026
━━━━━━━━━━━━━━━━━━━━

[📍 Sendung verfolgen] → DHL Link
```

## Tracking URL'leri

Sistem otomatik olarak doğru tracking URL'i oluşturur:

```typescript
// DHL
https://www.dhl.de/de/privatkunden/pakete-empfangen/verfolgen.html?piececode=123456789012

// DPD
https://tracking.dpd.de/parcelstatus?query=12345678901234&locale=de_DE

// Hermes
https://www.myhermes.de/empfangen/sendungsverfolgung/sendungsinformation/#1234567890123456
```

## Neden API Yok?

❌ **DHL/DPD/Hermes API'leri:**
- Ücretli
- Zor onay süreci
- Bireysel geliştiricilere vermiyorlar

✅ **Bizim Çözüm:**
- Tamamen ücretsiz
- API key gerektirmez
- Müşteri zaten kargo şirketinin sitesinde takip ediyor (daha güvenilir)
- Gerçek zamanlı veri (kargo şirketinin kendi sitesi)

## Database Alanları

```sql
-- orders tablosu
tracking_number VARCHAR(255)          -- Takip numarası
shipping_carrier VARCHAR(50)          -- DHL, DPD, Hermes, etc.
estimated_delivery TIMESTAMP          -- Tahmini teslimat
shipped_at TIMESTAMP                  -- Kargoya verilme zamanı
```

## Gelecek İyileştirmeler (Opsiyonel)

Eğer ileride API kullanmak istersen:

1. **TrackingMore API** (100 takip/ay ücretsiz)
   - https://www.trackingmore.com/

2. **17Track API** (100 takip/ay ücretsiz)
   - https://www.17track.net/

3. **AfterShip API** (50 takip/ay ücretsiz)
   - https://www.aftership.com/

Ama şimdilik **gerek yok** - mevcut sistem çalışıyor! ✅
