# Logging System Documentation

## Overview

The BenchWarmers marketplace implements a comprehensive logging system using Winston for structured logging, error tracking, and performance monitoring. The system provides different log levels, file rotation, and specialized logging for different types of events.

## Architecture

### Core Components

1. **Logger Instance** (`src/lib/logger.ts`)
   - Winston-based structured logging
   - Multiple transport layers (console, files)
   - Request context tracking
   - Specialized logging methods

2. **Middleware** (`src/middleware.ts`)
   - Automatic request logging
   - Security event detection
   - Request ID generation
   - Performance tracking

3. **Configuration** (`src/lib/logging-config.ts`)
   - Environment-specific settings
   - Performance thresholds
   - Security configurations

## Log Levels

- **ERROR** (0): Critical errors that require immediate attention
- **WARN** (1): Warning conditions that should be monitored
- **INFO** (2): General information about application flow
- **HTTP** (3): HTTP request/response logging
- **DEBUG** (4): Detailed debugging information (development only)

## Log Files

### Production Logs
- `logs/error-YYYY-MM-DD.log`: Error-level logs only
- `logs/combined-YYYY-MM-DD.log`: All log levels
- `logs/security-YYYY-MM-DD.log`: Security-related events
- `logs/exceptions-YYYY-MM-DD.log`: Uncaught exceptions
- `logs/rejections-YYYY-MM-DD.log`: Unhandled promise rejections

### Development Logs
- Console output with colorized formatting
- All log files as in production

## Usage Examples

### Basic Logging

```typescript
import { logInfo, logError, logWarning, logDebug } from '@/lib/logger'

// Info logging
logInfo('User action completed', { userId: '123', action: 'profile_update' })

// Error logging
logError('Database connection failed', error, { retryCount: 3 })

// Warning logging
logWarning('Rate limit approaching', { ip: '192.168.1.1', requests: 95 })

// Debug logging (development only)
logDebug('Database query executed', { query: 'SELECT * FROM users', duration: 150 })
```

### Specialized Logging

```typescript
import { 
  logAuth, 
  logSecurity, 
  logDb, 
  logApi, 
  logPayment, 
  logPerformance,
  logBusiness 
} from '@/lib/logger'

// Authentication events
logAuth('User logged in', 'user-123', { method: 'otp', ip: '192.168.1.1' })

// Security events
logSecurity('Failed login attempt', { 
  ip: '192.168.1.1', 
  attempts: 5, 
  userId: 'user-123' 
})

// Database operations
logDb('User lookup', 'users', { userId: '123', duration: 45 })

// API requests
logApi('POST', '/api/auth/login', 200, 150, { userId: '123' })

// Payment events
logPayment('Payment processed', 1000, 'USD', { 
  paymentId: 'pay_123', 
  userId: 'user-123' 
})

// Performance monitoring
logPerformance('Database query', 1200, { table: 'users', operation: 'select' })

// Business events
logBusiness('Company registered', 'company', { 
  companyId: 'comp-123', 
  companyName: 'Acme Corp' 
})
```

### Request Logging

```typescript
import { logRequest } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // Your API logic here
    
    requestLogger.end(200) // Log successful response
    return NextResponse.json({ success: true })
  } catch (error) {
    requestLogger.error(error, 500) // Log error response
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

## Configuration

### Environment Variables

```bash
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable/disable console logging
ENABLE_CONSOLE_LOGGING=true

# Log file retention (days)
LOG_RETENTION_DAYS=30
```

### Performance Thresholds

```typescript
// Configured in logging-config.ts
performance: {
  slowQueryThreshold: 1000, // 1 second
  slowApiThreshold: 2000,   // 2 seconds
  criticalThreshold: 5000,  // 5 seconds
}
```

## Security Logging

### Sensitive Endpoints
The system automatically logs access to sensitive endpoints:
- `/api/auth/*`
- `/api/payments/*`
- `/api/admin/*`
- `/api/companies/register`

### Security Events
- Failed authentication attempts
- Rate limit violations
- Unauthorized access attempts
- Suspicious IP addresses

## Monitoring and Alerting

### Log Analysis
- **Error Rate**: Monitor error logs for increased frequency
- **Performance**: Track slow operations (>2 seconds)
- **Security**: Monitor security logs for suspicious activity
- **Business Metrics**: Track user registrations, payments, etc.

### Health Checks
- Database connectivity
- External service availability
- Environment variable validation
- System uptime monitoring

## Best Practices

### 1. Structured Logging
Always include relevant context in log messages:

```typescript
// Good
logInfo('User profile updated', { 
  userId: '123', 
  changes: ['name', 'email'], 
  duration: 150 
})

// Avoid
logInfo('Profile updated') // Too vague
```

### 2. Error Logging
Include full error context:

```typescript
// Good
logError('Payment processing failed', error, {
  paymentId: 'pay_123',
  userId: 'user-123',
  amount: 1000,
  retryCount: 3
})
```

### 3. Performance Logging
Log slow operations for optimization:

```typescript
const startTime = Date.now()
// ... operation
const duration = Date.now() - startTime
logPerformance('Database query', duration, { table: 'users' })
```

### 4. Security Logging
Log all security-relevant events:

```typescript
logSecurity('Failed login attempt', {
  ip: request.ip,
  userId: attemptedUserId,
  attempts: currentAttempts
})
```

## File Rotation

Log files are automatically rotated:
- **Max Size**: 20MB per file
- **Retention**: 
  - Error logs: 14 days
  - Combined logs: 30 days
  - Security logs: 90 days
  - Exception logs: 30 days

## Development vs Production

### Development
- Console logging enabled
- Debug level logging
- Detailed error stacks
- Request/response logging

### Production
- File-based logging only
- Info level and above
- Structured JSON format
- Performance monitoring
- Security event tracking

## Troubleshooting

### Common Issues

1. **Log files not created**
   - Check `logs/` directory permissions
   - Verify Winston configuration

2. **High log volume**
   - Adjust log levels
   - Review logging frequency
   - Check for infinite loops

3. **Performance impact**
   - Use async logging where possible
   - Monitor log file sizes
   - Implement log sampling for high-volume endpoints

### Debug Commands

```bash
# Check log file sizes
ls -lh logs/

# Monitor logs in real-time
tail -f logs/combined-$(date +%Y-%m-%d).log

# Search for errors
grep "ERROR" logs/combined-*.log

# Check security events
grep "SECURITY" logs/security-*.log
```

## Integration with Monitoring Tools

The logging system can be integrated with:
- **Sentry**: Error tracking and alerting
- **DataDog**: Log aggregation and monitoring
- **ELK Stack**: Log analysis and visualization
- **Grafana**: Metrics and dashboarding

## Future Enhancements

- **Log Sampling**: Reduce volume for high-traffic endpoints
- **Correlation IDs**: Track requests across services
- **Metrics Export**: Export logs to monitoring systems
- **Audit Trail**: Comprehensive audit logging for compliance
