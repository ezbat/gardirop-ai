# Rate Limiting Implementation Guide

## Overview
Rate limiting has been implemented to protect APIs from abuse and ensure fair usage.

## Implementation

### Rate Limit Library (`lib/rate-limit.ts`)
- In-memory sliding window algorithm
- Automatic cleanup of expired entries
- Configurable limits per endpoint

### Presets Available

```typescript
RateLimitPresets.strict    // 5 req/min
RateLimitPresets.standard  // 10 req/min
RateLimitPresets.moderate  // 30 req/min
RateLimitPresets.generous  // 100 req/min
RateLimitPresets.auth      // 5 req/15min (login/signup)
RateLimitPresets.api       // 1000 req/hour
```

## Usage Example

```typescript
import { withRateLimit, RateLimitPresets } from '@/lib/rate-limit'

async function myHandler(req: NextRequest) {
  // Your logic here
  return NextResponse.json({ success: true })
}

// Apply rate limiting
export const POST = withRateLimit(myHandler, RateLimitPresets.standard)
```

## Applied Endpoints

### Auth APIs (5 req/15min)
- ✅ `/api/auth/signup`
- ✅ `/api/auth/[...nextauth]` (handled by NextAuth)

### Review APIs (10 req/min)
- ✅ `/api/reviews` POST
- ✅ `/api/reviews/helpful` POST

### Recommended for Future Implementation

#### User-Generated Content (10 req/min)
- `/api/polls/create`
- `/api/polls/vote`
- `/api/polls/comment`

#### Order APIs (30 req/min)
- `/api/orders/create`
- `/api/stripe/create-checkout-session`

#### Wishlist/Favorites (30 req/min)
- `/api/wishlist` POST/DELETE
- `/api/favorites` POST/DELETE

#### Notifications (100 req/min)
- `/api/notifications/mark-read`
- `/api/notifications/delete`

#### Seller APIs (30 req/min)
- `/api/seller/products/create`
- `/api/seller/outfits/create`

## Response Headers

Rate-limited responses include:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1704067200
Retry-After: 45 (on 429 errors)
```

## 429 Response Format

```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

## Performance

- In-memory store (fast)
- Auto-cleanup every 5 minutes
- Max 10,000 entries before forced cleanup
- Sliding window algorithm prevents bursts

## Production Considerations

For production with multiple servers, consider:
1. Redis-based rate limiting (distributed)
2. Upstash Rate Limit
3. Vercel Edge Config
4. CloudFlare rate limiting

## Testing

Test rate limiting:
```bash
# Send multiple requests
for i in {1..15}; do
  curl -X POST http://localhost:3000/api/reviews \
    -H "Content-Type: application/json" \
    -d '{"productId":"123","userId":"456","rating":5}' \
    & done
```

You should see 429 errors after the limit is reached.
