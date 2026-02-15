# 🚀 Wearo - Quick Reference Guide

## Hızlı Başlangıç

### Development
```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
npm run check-prod   # Production readiness check
npm run type-check   # TypeScript check
```

### Health Check
```bash
curl http://localhost:3000/api/health
```

---

## 🗄️ Database Migration'lar

### Supabase SQL Editor'da Sırayla Çalıştır:

```
1. supabase/migrations/007_product_reviews.sql
2. supabase/migrations/008_refund_system.sql
3. supabase/migrations/009_shipping_tracking.sql
4. supabase/migrations/010_coupon_system.sql
5. supabase/migrations/011_wishlist_system.sql
6. supabase/migrations/012_notifications_system.sql
```

---

## 🔑 Environment Variables

### Minimum Gereksinimler

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# NextAuth
NEXTAUTH_SECRET=xxx (openssl rand -base64 32)
NEXTAUTH_URL=http://localhost:3000

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Opsiyonel

```env
# Live Streaming (Agora.io)
NEXT_PUBLIC_AGORA_APP_ID=xxx
AGORA_APP_CERTIFICATE=xxx

# AI Features
OPENAI_API_KEY=sk-xxx

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx

# Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=xxx@gmail.com
SMTP_PASSWORD=xxx
```

---

## 📁 Önemli Dosyalar

### Konfigürasyon
- `next.config.ts` - Next.js config (images, security headers)
- `.env.local` - Environment variables
- `tailwind.config.ts` - Tailwind CSS
- `tsconfig.json` - TypeScript

### Utilities
- `lib/rate-limit.ts` - API rate limiting
- `lib/error-logger.ts` - Error tracking (Sentry)
- `lib/analytics.ts` - Analytics tracking
- `lib/performance.ts` - Performance utilities
- `lib/maintenance.ts` - Maintenance mode

### Scripts
- `scripts/check-production-ready.js` - Production check

---

## 🎯 Özellik Kullanımı

### Rate Limiting
```typescript
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit'

export const POST = withRateLimit(
  async (req) => { /* handler */ },
  RateLimitPresets.standard // 10 req/min
)
```

### Error Logging
```typescript
import { logError, logMessage } from '@/lib/error-logger'

try {
  // code
} catch (error) {
  logError(error, {
    userId: user.id,
    endpoint: '/api/products'
  })
}
```

### Analytics
```typescript
import { trackEvent, trackPurchase } from '@/lib/analytics'

trackEvent('product_view', { product_id: '123' })
trackPurchase(orderId, total, items)
```

### Performance Monitoring
```typescript
import { measureAsync, Cache } from '@/lib/performance'

const result = await measureAsync(
  'database-query',
  () => fetchData(),
  1000 // threshold
)

const cache = new Cache<Product>()
cache.set('product-123', product, 60000) // 60s TTL
```

---

## 🔒 Security Features

### Active Protections
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ XSS Protection
- ✅ CSRF Protection (NextAuth)
- ✅ Rate Limiting
- ✅ Security Headers
- ✅ SQL Injection Protection (Supabase RLS)

### Best Practices
```typescript
// ❌ Bad
const query = `SELECT * FROM users WHERE id = ${userId}`

// ✅ Good
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
```

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Manual
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

---

## 🐛 Debugging

### Common Issues

**Build Error**
```bash
npm run build          # Check errors
npm run type-check     # TypeScript errors
```

**Database Error**
- Check Supabase URL/Keys
- Verify RLS policies
- Check migrations

**Payment Error**
- Verify Stripe keys (test vs live)
- Check webhook secret
- Review Stripe logs

**Email Error**
- Verify SMTP credentials
- Check from email
- Review email logs

---

## 📊 Monitoring

### Logs
```bash
# Vercel logs (production)
vercel logs --follow

# Local logs
npm run dev
```

### Dashboards
- Vercel: https://vercel.com/dashboard
- Supabase: https://app.supabase.com
- Stripe: https://dashboard.stripe.com
- Sentry: https://sentry.io

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration/login
- [ ] Onboarding screens (5 swipe screens)
- [ ] Reels/Shorts feed (vertical video scroll)
- [ ] Video upload with product tagging
- [ ] Live streaming (start, view, chat)
- [ ] Product listing/filtering
- [ ] Add to cart
- [ ] Express checkout (swipe-to-confirm)
- [ ] Payment (use Stripe test cards)
- [ ] Order confirmation email
- [ ] Seller application
- [ ] Product reviews
- [ ] Notifications
- [ ] Wishlist

### Stripe Test Cards
```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
3D Secure: 4000 0025 0000 3155
```

---

## 📚 Useful Commands

### Database
```bash
# Export database
pg_dump -h db.xxx.supabase.co -U postgres > backup.sql

# Import database
psql -h db.xxx.supabase.co -U postgres < backup.sql
```

### Git
```bash
# Commit with all features
git add .
git commit -m "feat: Add all production features"
git push origin main

# Create tag
git tag -a v1.0.0 -m "Production ready"
git push --tags
```

### NPM
```bash
# Update dependencies
npm outdated              # Check outdated
npm update               # Update minor/patch
npm install package@latest  # Major update

# Security audit
npm audit
npm audit fix
```

---

## 🆘 Support

### Documentation
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Vercel Docs](https://vercel.com/docs)

### Internal Docs
- `DEPLOYMENT.md` - Deployment guide
- `PRODUCTION_CHECKLIST.md` - Production checklist
- `RATE_LIMITING.md` - Rate limiting docs
- `SENTRY_SETUP.md` - Sentry setup

---

## 🎉 Production Checklist

```bash
# 1. Check production readiness
npm run check-prod

# 2. Run migrations
# Go to Supabase SQL Editor

# 3. Build locally
npm run build

# 4. Deploy
vercel --prod

# 5. Test everything
# Use PRODUCTION_CHECKLIST.md
```

---

**Last Updated**: 2025-01-25
**Version**: 1.0.0
**Status**: ✅ Production Ready
