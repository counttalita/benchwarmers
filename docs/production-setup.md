# Production Setup Guide

## Environment Configuration

Create a `.env.production` file with the following variables:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@host:port/database"
DIRECT_URL="postgresql://username:password@host:port/database"

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-nextauth-secret-key"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Twilio Configuration
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Pusher Configuration
PUSHER_APP_ID="your-pusher-app-id"
PUSHER_KEY="your-pusher-key"
PUSHER_SECRET="your-pusher-secret"
PUSHER_CLUSTER="us2"

# Resend Configuration
RESEND_API_KEY="your-resend-api-key"

# Monitoring and Analytics
SENTRY_DSN="your-sentry-dsn"
VERCEL_ANALYTICS_ID="your-vercel-analytics-id"

# Security
ENCRYPTION_KEY="your-32-character-encryption-key"
JWT_SECRET="your-jwt-secret"

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_MONITORING=true
ENABLE_CACHE=true
ENABLE_RATE_LIMITING=true

# Performance
CACHE_TTL=3600
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Deployment Steps

### 1. Database Setup (PlanetScale)

1. Create a PlanetScale account and database
2. Run database migrations:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

### 2. Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy the application

### 3. Domain Configuration

1. Add custom domain in Vercel
2. Configure DNS records
3. Set up SSL certificate

### 4. Monitoring Setup

1. Configure Sentry for error tracking
2. Set up Vercel Analytics
3. Configure log aggregation

## Security Checklist

- [ ] All environment variables are properly set
- [ ] Database connection is secure
- [ ] API keys are rotated and secure
- [ ] SSL/TLS is enabled
- [ ] Rate limiting is configured
- [ ] CORS is properly configured
- [ ] Input validation is in place
- [ ] SQL injection protection is active
- [ ] XSS protection is enabled
- [ ] CSRF protection is configured

## Performance Optimization

- [ ] Database indexes are optimized
- [ ] API response caching is enabled
- [ ] Static assets are optimized
- [ ] CDN is configured
- [ ] Image optimization is enabled
- [ ] Bundle size is optimized

## Monitoring and Alerting

- [ ] Error tracking is configured
- [ ] Performance monitoring is active
- [ ] Business metrics are tracked
- [ ] Alerting rules are set up
- [ ] Log aggregation is configured
- [ ] Health checks are implemented
