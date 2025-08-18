# Production Setup Guide

## Environment Configuration

### Database Configuration
```bash
DATABASE_URL="postgresql://user:password@host:5432/benchwarmers_prod"
REDIS_URL="redis://host:6379"
```

### Authentication Configuration
```bash
NEXTAUTH_SECRET="your-production-secret"
NEXTAUTH_URL="https://your-domain.com"
```

### Paystack Configuration
```bash
PAYSTACK_PUBLIC_KEY="pk_live_..."
PAYSTACK_SECRET_KEY="sk_live_..."
PAYSTACK_WEBHOOK_SECRET="whsec_..."
PAYSTACK_PLAN_CODE="PLN_..."
```

### Email Configuration
```bash
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="noreply@your-domain.com"
```

### SMS Configuration
```bash
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="..."
```

### Real-time Configuration
```bash
PUSHER_APP_ID="your-app-id"
PUSHER_KEY="your-key"
PUSHER_SECRET="your-secret"
```

### Monitoring Configuration
```bash
SENTRY_DSN="https://..."
LOG_LEVEL="info"
```

## Server Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker (optional)

### Installation Steps

1. **Clone Repository**
```bash
git clone <repository-url>
cd benchwarmers
```

2. **Install Dependencies**
```bash
npm ci --only=production
```

3. **Environment Setup**
```bash
cp .env.example .env.production
# Edit .env.production with production values
```

4. **Database Setup**
```bash
npm run db:generate
npm run db:push
```

5. **Build Application**
```bash
npm run build
```

6. **Start Application**
```bash
npm start
```

## Docker Deployment

### Docker Compose Production
```yaml
version: '3.8'
services:
  app:
    image: benchwarmers:latest
    environment:
      - NODE_ENV=production
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: benchwarmers_prod
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## SSL Configuration

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Performance Optimization

### Database Optimization
- Enable connection pooling
- Configure proper indexes
- Set up read replicas for scaling

### Caching Strategy
- Redis for session storage
- CDN for static assets
- Application-level caching

### Monitoring Setup
- Sentry for error tracking
- Application performance monitoring
- Database performance monitoring

## Security Hardening

### Environment Security
- Use strong, unique passwords
- Enable firewall rules
- Regular security updates
- SSL/TLS encryption

### Application Security
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection

### Data Protection
- Encrypt sensitive data
- Regular backups
- Access control
- Audit logging
