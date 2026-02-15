# Sentry Error Logging Setup Guide

## Installation

Sentry has been installed and configured for error tracking and performance monitoring.

```bash
npm install @sentry/nextjs
```

## Configuration Files

### 1. Client Config (`sentry.client.config.ts`)
- Browser-side error tracking
- Session replay
- Performance monitoring
- Error filtering

### 2. Server Config (`sentry.server.config.ts`)
- Server-side error tracking
- API error logging
- Database error tracking

### 3. Edge Config (`sentry.edge.config.ts`)
- Edge runtime error tracking
- Middleware errors

## Environment Variables

Add to your `.env.local`:

```env
# Sentry Error Logging
SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/your-project-id
SENTRY_AUTH_TOKEN=your_auth_token
SENTRY_ORG=your_organization
SENTRY_PROJECT=your_project
```

## Get Sentry DSN

1. Go to [sentry.io](https://sentry.io/)
2. Create account / Sign in
3. Create new project
4. Select "Next.js" as platform
5. Copy your DSN from project settings

## Usage

### Basic Error Logging

```typescript
import { logError } from '@/lib/error-logger'

try {
  // Your code
} catch (error) {
  logError(error, {
    userId: user.id,
    endpoint: '/api/products',
    method: 'POST'
  })
}
```

### Log Messages

```typescript
import { logMessage } from '@/lib/error-logger'

logMessage('User completed onboarding', 'info', {
  userId: user.id,
  plan: 'premium'
})
```

### Performance Tracking

```typescript
import { startTransaction } from '@/lib/error-logger'

const transaction = startTransaction('Database Query', 'db.query')
// Your code
transaction.finish()
```

### API Error Wrapper

```typescript
import { withErrorLogging } from '@/lib/error-logger'

const handler = withErrorLogging(
  async (req: NextRequest) => {
    // Your API logic
    return NextResponse.json({ success: true })
  },
  '/api/products'
)

export const POST = handler
```

## Features Enabled

### ✅ Error Tracking
- Automatic error capture
- Stack traces
- User context
- Custom tags

### ✅ Performance Monitoring
- API response times
- Database query times
- Page load metrics
- 10% sampling in production

### ✅ Session Replay
- User interaction recording
- Error reproduction
- Masked sensitive data
- 10% session sampling

### ✅ Error Filtering
- Network errors ignored
- Rate limit errors filtered
- localStorage errors ignored
- Custom filters available

## Production Setup

### 1. Create Sentry Project
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Login
sentry-cli login

# Create project
sentry-cli projects create wearo-production
```

### 2. Configure Source Maps (Optional)
```bash
# In next.config.js
module.exports = {
  sentry: {
    widenClientFileUpload: true,
    hideSourceMaps: true,
  }
}
```

### 3. Deploy
Sentry will automatically upload source maps on build.

## Monitoring Dashboard

Access your errors at:
```
https://sentry.io/organizations/[your-org]/issues/
```

## Alert Rules

Set up alerts in Sentry:
1. Go to Settings > Alerts
2. Create alert rule
3. Set conditions (e.g., >10 errors in 1 hour)
4. Configure notifications (Email, Slack, etc.)

## Development Mode

In development, errors are logged to console instead of Sentry:
```
🔴 Error: Something went wrong
📝 Context: { userId: '123', endpoint: '/api/products' }
```

## Best Practices

1. **Always add context**
   ```typescript
   logError(error, {
     userId: user?.id,
     action: 'checkout',
     orderTotal: total
   })
   ```

2. **Filter sensitive data**
   - Don't log passwords
   - Don't log credit cards
   - Don't log API keys

3. **Use appropriate log levels**
   - `error`: Critical errors
   - `warning`: Potential issues
   - `info`: Informational
   - `debug`: Debugging only

4. **Set up alerts**
   - High error rate
   - Critical API failures
   - Payment failures

## Testing

Test Sentry integration:
```typescript
// Trigger test error
import * as Sentry from '@sentry/nextjs'

Sentry.captureException(new Error('Test error from Wearo'))
```

Check Sentry dashboard to see the error.

## Cost Optimization

- Use 10% sampling for performance monitoring
- Filter out non-critical errors
- Set data retention limits
- Use Sentry's free tier (5K errors/month)

## Troubleshooting

### Errors not showing in Sentry?
1. Check SENTRY_DSN is set
2. Verify environment is 'production'
3. Check network connectivity
4. Review error filters

### Too many errors?
1. Increase error filtering
2. Fix recurring bugs
3. Reduce sampling rate
4. Check for spam/bots

## Resources

- [Sentry Next.js Docs](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Error Handling Guide](https://docs.sentry.io/platforms/javascript/guides/nextjs/usage/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/guides/nextjs/performance/)
