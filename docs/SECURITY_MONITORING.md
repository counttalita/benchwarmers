# Security and Monitoring

## Overview

BenchWarmers is a B2B talent marketplace connecting companies with benched professionals to organisations seeking specialised skills. The platform implements comprehensive security measures and monitoring systems to protect user data, prevent unauthorized access, and ensure platform integrity. The security architecture follows industry best practices and compliance requirements.

## Security Architecture

### Authentication System

#### NextAuth.js Integration (`src/lib/auth.ts`)
```typescript
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new AuthenticationError('Missing credentials')
        }

        const user = await authenticateUser(credentials.email, credentials.password)
        if (!user) {
          throw new AuthenticationError('Invalid credentials')
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.companyId = user.companyId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub!
      session.user.role = token.role as UserRole
      session.user.companyId = token.companyId as string
      return session
    }
  }
}
```

#### Multi-Factor Authentication
```typescript
// Two-Factor Authentication Setup
export class TwoFactorAuth {
  static async generateSecret(userId: string): Promise<{
    secret: string
    qrCode: string
    backupCodes: string[]
  }> {
    const secret = speakeasy.generateSecret({
      name: `Benchwarmers (${userId})`,
      issuer: 'Benchwarmers'
    })

    const backupCodes = Array.from({ length: 10 }, () => 
      crypto.randomBytes(4).toString('hex').toUpperCase()
    )

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret.base32,
        backupCodes: backupCodes
      }
    })

    return {
      secret: secret.base32,
      qrCode: secret.otpauth_url!,
      backupCodes
    }
  }

  static async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true, backupCodes: true }
    })

    if (!user?.twoFactorSecret) {
      return false
    }

    // Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token,
      window: 2
    })

    if (verified) {
      return true
    }

    // Check backup codes
    if (user.backupCodes.includes(token.toUpperCase())) {
      // Remove used backup code
      const updatedCodes = user.backupCodes.filter(code => code !== token.toUpperCase())
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes }
      })
      return true
    }

    return false
  }
}
```

### Authorization System

#### Role-Based Access Control (RBAC)
```typescript
export enum UserRole {
  ADMIN = 'admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_MEMBER = 'company_member',
  TALENT = 'talent'
}

export enum Permission {
  // Company permissions
  MANAGE_COMPANY = 'manage_company',
  VIEW_COMPANY_DATA = 'view_company_data',
  MANAGE_USERS = 'manage_users',
  
  // Request permissions
  CREATE_REQUESTS = 'create_requests',
  VIEW_REQUESTS = 'view_requests',
  MANAGE_REQUESTS = 'manage_requests',
  
  // Offer permissions
  CREATE_OFFERS = 'create_offers',
  VIEW_OFFERS = 'view_offers',
  MANAGE_OFFERS = 'manage_offers',
  
  // Payment permissions
  VIEW_PAYMENTS = 'view_payments',
  PROCESS_PAYMENTS = 'process_payments',
  
  // Admin permissions
  ADMIN_ACCESS = 'admin_access',
  SYSTEM_MONITORING = 'system_monitoring'
}

const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.ADMIN_ACCESS,
    Permission.SYSTEM_MONITORING,
    Permission.MANAGE_COMPANY,
    Permission.VIEW_COMPANY_DATA,
    Permission.MANAGE_USERS,
    Permission.VIEW_REQUESTS,
    Permission.MANAGE_REQUESTS,
    Permission.VIEW_OFFERS,
    Permission.MANAGE_OFFERS,
    Permission.VIEW_PAYMENTS,
    Permission.PROCESS_PAYMENTS
  ],
  [UserRole.COMPANY_ADMIN]: [
    Permission.MANAGE_COMPANY,
    Permission.VIEW_COMPANY_DATA,
    Permission.MANAGE_USERS,
    Permission.CREATE_REQUESTS,
    Permission.VIEW_REQUESTS,
    Permission.MANAGE_REQUESTS,
    Permission.CREATE_OFFERS,
    Permission.VIEW_OFFERS,
    Permission.MANAGE_OFFERS,
    Permission.VIEW_PAYMENTS
  ],
  [UserRole.COMPANY_MEMBER]: [
    Permission.VIEW_COMPANY_DATA,
    Permission.CREATE_REQUESTS,
    Permission.VIEW_REQUESTS,
    Permission.CREATE_OFFERS,
    Permission.VIEW_OFFERS,
    Permission.VIEW_PAYMENTS
  ],
  [UserRole.TALENT]: [
    Permission.VIEW_OFFERS,
    Permission.VIEW_PAYMENTS
  ]
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return rolePermissions[userRole]?.includes(permission) || false
}

export function requirePermission(permission: Permission) {
  return (req: NextRequest, context: { params: any }) => {
    const session = getServerSession(authOptions)
    if (!session?.user) {
      throw new AuthenticationError()
    }

    if (!hasPermission(session.user.role, permission)) {
      throw new AuthorizationError(`Missing permission: ${permission}`)
    }

    return { session, ...context }
  }
}
```

### Data Protection

#### Encryption at Rest
```typescript
import crypto from 'crypto'

export class DataEncryption {
  private static readonly algorithm = 'aes-256-gcm'
  private static readonly keyLength = 32
  private static readonly ivLength = 16
  private static readonly tagLength = 16

  static encrypt(text: string, key: string): string {
    const iv = crypto.randomBytes(this.ivLength)
    const cipher = crypto.createCipher(this.algorithm, key)
    cipher.setAAD(Buffer.from('benchwarmers'))

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const tag = cipher.getAuthTag()
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  }

  static decrypt(encryptedText: string, key: string): string {
    const parts = encryptedText.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const tag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipher(this.algorithm, key)
    decipher.setAAD(Buffer.from('benchwarmers'))
    decipher.setAuthTag(tag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }

  // Encrypt sensitive fields before storing in database
  static encryptSensitiveData(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['ssn', 'taxId', 'bankAccount', 'routingNumber']
    const encryptionKey = process.env.DATA_ENCRYPTION_KEY!

    const encrypted = { ...data }
    sensitiveFields.forEach(field => {
      if (encrypted[field]) {
        encrypted[field] = this.encrypt(encrypted[field], encryptionKey)
      }
    })

    return encrypted
  }
}
```

#### PII Data Handling
```typescript
export class PIIHandler {
  private static readonly piiFields = [
    'email', 'phone', 'address', 'ssn', 'taxId', 'bankAccount'
  ]

  static sanitizeForLogging(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data }
    
    this.piiFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = this.maskValue(sanitized[field])
      }
    })

    return sanitized
  }

  private static maskValue(value: string): string {
    if (value.includes('@')) {
      // Email masking
      const [local, domain] = value.split('@')
      return `${local.charAt(0)}***@${domain}`
    }
    
    if (value.length > 4) {
      // General masking (show first and last 2 characters)
      return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`
    }
    
    return '***'
  }

  static async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: 'read' | 'write' | 'delete'
  ): Promise<void> {
    await prisma.dataAccessLog.create({
      data: {
        userId,
        resource,
        resourceId,
        action,
        timestamp: new Date(),
        ipAddress: getClientIP(),
        userAgent: getUserAgent()
      }
    })
  }
}
```

### Rate Limiting (`src/lib/security/rate-limiter.ts`)

#### API Rate Limiting
```typescript
import { RateLimiterRedis } from 'rate-limiter-flexible'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!)

// Different rate limits for different endpoints
const rateLimiters = {
  auth: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'auth_limit',
    points: 5, // Number of attempts
    duration: 900, // Per 15 minutes
    blockDuration: 900, // Block for 15 minutes
  }),
  
  api: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'api_limit',
    points: 100, // Number of requests
    duration: 60, // Per minute
    blockDuration: 60, // Block for 1 minute
  }),
  
  payment: new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'payment_limit',
    points: 10, // Number of payment attempts
    duration: 3600, // Per hour
    blockDuration: 3600, // Block for 1 hour
  })
}

export async function checkRateLimit(
  type: keyof typeof rateLimiters,
  identifier: string
): Promise<void> {
  try {
    await rateLimiters[type].consume(identifier)
  } catch (rejRes) {
    const remainingPoints = rejRes.remainingPoints || 0
    const msBeforeNext = rejRes.msBeforeNext || 0
    
    throw new RateLimitError(
      rateLimiters[type].points,
      rateLimiters[type].duration * 1000
    )
  }
}

// Middleware for rate limiting
export function withRateLimit(type: keyof typeof rateLimiters) {
  return async (req: NextRequest) => {
    const identifier = getClientIP(req) || 'anonymous'
    await checkRateLimit(type, identifier)
  }
}
```

### Input Validation and Sanitization

#### Zod Schema Validation
```typescript
import { z } from 'zod'

// Common validation schemas
export const emailSchema = z.string().email().max(255)
export const passwordSchema = z.string().min(8).max(128).regex(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
)

export const phoneSchema = z.string().regex(
  /^\+?[1-9]\d{1,14}$/,
  'Invalid phone number format'
)

// Input sanitization
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
}

// SQL injection prevention (using Prisma ORM)
export function validateSQLInput(input: string): boolean {
  const sqlInjectionPattern = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi
  return !sqlInjectionPattern.test(input)
}
```

## Security Monitoring

### Vulnerability Scanner (`src/lib/security/vulnerability-scanner.ts`)

#### Automated Security Scanning
```typescript
export class VulnerabilityScanner {
  static async scanDependencies(): Promise<{
    vulnerabilities: Vulnerability[]
    riskLevel: 'low' | 'medium' | 'high' | 'critical'
  }> {
    // Integration with npm audit or Snyk
    const auditResult = await this.runNpmAudit()
    const vulnerabilities = this.parseAuditResults(auditResult)
    
    const riskLevel = this.calculateRiskLevel(vulnerabilities)
    
    if (riskLevel === 'critical' || riskLevel === 'high') {
      await this.alertSecurityTeam(vulnerabilities)
    }
    
    return { vulnerabilities, riskLevel }
  }
  
  static async scanCodebase(): Promise<{
    issues: SecurityIssue[]
    score: number
  }> {
    const issues: SecurityIssue[] = []
    
    // Check for hardcoded secrets
    const secretIssues = await this.scanForSecrets()
    issues.push(...secretIssues)
    
    // Check for insecure patterns
    const patternIssues = await this.scanForInsecurePatterns()
    issues.push(...patternIssues)
    
    // Calculate security score
    const score = this.calculateSecurityScore(issues)
    
    return { issues, score }
  }
  
  private static async scanForSecrets(): Promise<SecurityIssue[]> {
    const secretPatterns = [
      /sk_live_[a-zA-Z0-9]{24}/, // Stripe live keys
      /sk_test_[a-zA-Z0-9]{24}/, // Stripe test keys
      /AKIA[0-9A-Z]{16}/, // AWS access keys
      /[a-zA-Z0-9]{32}/, // Generic API keys
    ]
    
    // Scan codebase for patterns
    // Implementation would scan files for these patterns
    return []
  }
}
```

### Security Audit (`src/lib/security/security-audit.ts`)

#### Comprehensive Security Auditing
```typescript
export class SecurityAudit {
  static async performSecurityAudit(): Promise<SecurityAuditReport> {
    const report: SecurityAuditReport = {
      timestamp: new Date(),
      checks: [],
      overallScore: 0,
      recommendations: []
    }
    
    // Authentication security check
    const authCheck = await this.auditAuthentication()
    report.checks.push(authCheck)
    
    // Authorization security check
    const authzCheck = await this.auditAuthorization()
    report.checks.push(authzCheck)
    
    // Data protection check
    const dataCheck = await this.auditDataProtection()
    report.checks.push(dataCheck)
    
    // Network security check
    const networkCheck = await this.auditNetworkSecurity()
    report.checks.push(networkCheck)
    
    // Calculate overall score
    report.overallScore = this.calculateOverallScore(report.checks)
    
    // Generate recommendations
    report.recommendations = this.generateRecommendations(report.checks)
    
    return report
  }
  
  private static async auditAuthentication(): Promise<SecurityCheck> {
    const checks = [
      await this.checkPasswordPolicy(),
      await this.checkSessionSecurity(),
      await this.checkTwoFactorAuth(),
      await this.checkAccountLockout()
    ]
    
    return {
      category: 'Authentication',
      checks,
      score: this.calculateCategoryScore(checks),
      status: this.getCategoryStatus(checks)
    }
  }
  
  private static async checkPasswordPolicy(): Promise<SecuritySubCheck> {
    // Check if password policy meets requirements
    const policy = await this.getPasswordPolicy()
    
    const score = (
      (policy.minLength >= 8 ? 25 : 0) +
      (policy.requireUppercase ? 25 : 0) +
      (policy.requireLowercase ? 25 : 0) +
      (policy.requireNumbers ? 25 : 0) +
      (policy.requireSpecialChars ? 25 : 0)
    ) / 5
    
    return {
      name: 'Password Policy',
      score,
      status: score >= 80 ? 'pass' : 'fail',
      details: `Password policy score: ${score}%`
    }
  }
}
```

## Monitoring Systems

### Real-time Monitoring

#### System Health Dashboard
```typescript
export class MonitoringDashboard {
  static async getSystemMetrics(): Promise<SystemMetrics> {
    const [
      healthStatus,
      performanceMetrics,
      securityMetrics,
      businessMetrics
    ] = await Promise.all([
      HealthChecker.getSystemHealth(),
      PerformanceMonitor.getMetrics(),
      this.getSecurityMetrics(),
      this.getBusinessMetrics()
    ])
    
    return {
      health: healthStatus,
      performance: performanceMetrics,
      security: securityMetrics,
      business: businessMetrics,
      timestamp: new Date()
    }
  }
  
  private static async getSecurityMetrics(): Promise<SecurityMetrics> {
    const [
      failedLogins,
      suspiciousActivity,
      vulnerabilities,
      complianceStatus
    ] = await Promise.all([
      this.getFailedLoginAttempts(),
      this.getSuspiciousActivity(),
      VulnerabilityScanner.scanDependencies(),
      this.getComplianceStatus()
    ])
    
    return {
      failedLogins,
      suspiciousActivity,
      vulnerabilities: vulnerabilities.vulnerabilities.length,
      riskLevel: vulnerabilities.riskLevel,
      complianceScore: complianceStatus.score
    }
  }
  
  private static async getFailedLoginAttempts(): Promise<number> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
    
    return await prisma.auditLog.count({
      where: {
        action: 'login_failed',
        timestamp: { gte: since }
      }
    })
  }
}
```

### Alerting System

#### Security Incident Alerts
```typescript
export class SecurityAlerts {
  static async checkForSecurityIncidents(): Promise<void> {
    const incidents = await this.detectIncidents()
    
    for (const incident of incidents) {
      await this.processIncident(incident)
    }
  }
  
  private static async detectIncidents(): Promise<SecurityIncident[]> {
    const incidents: SecurityIncident[] = []
    
    // Check for brute force attacks
    const bruteForceIncidents = await this.detectBruteForceAttacks()
    incidents.push(...bruteForceIncidents)
    
    // Check for suspicious login patterns
    const suspiciousLogins = await this.detectSuspiciousLogins()
    incidents.push(...suspiciousLogins)
    
    // Check for data access anomalies
    const dataAnomalies = await this.detectDataAccessAnomalies()
    incidents.push(...dataAnomalies)
    
    return incidents
  }
  
  private static async detectBruteForceAttacks(): Promise<SecurityIncident[]> {
    const threshold = 10 // Failed attempts threshold
    const timeWindow = 15 * 60 * 1000 // 15 minutes
    const since = new Date(Date.now() - timeWindow)
    
    const failedAttempts = await prisma.auditLog.groupBy({
      by: ['metadata'],
      where: {
        action: 'login_failed',
        timestamp: { gte: since }
      },
      _count: true,
      having: {
        _count: { gte: threshold }
      }
    })
    
    return failedAttempts.map(attempt => ({
      type: 'brute_force_attack',
      severity: 'high',
      source: attempt.metadata?.ip || 'unknown',
      details: `${attempt._count} failed login attempts`,
      timestamp: new Date()
    }))
  }
  
  private static async processIncident(incident: SecurityIncident): Promise<void> {
    // Log the incident
    logError(new Error(`Security incident: ${incident.type}`), {
      correlationId: generateCorrelationId(),
      incidentType: incident.type,
      severity: incident.severity,
      source: incident.source
    })
    
    // Send alert based on severity
    if (incident.severity === 'critical' || incident.severity === 'high') {
      await this.sendImmediateAlert(incident)
    }
    
    // Store incident in database
    await prisma.securityIncident.create({
      data: {
        type: incident.type,
        severity: incident.severity,
        source: incident.source,
        details: incident.details,
        timestamp: incident.timestamp,
        status: 'open'
      }
    })
    
    // Auto-remediation for certain incident types
    await this.attemptAutoRemediation(incident)
  }
  
  private static async attemptAutoRemediation(incident: SecurityIncident): Promise<void> {
    switch (incident.type) {
      case 'brute_force_attack':
        // Temporarily block the source IP
        await this.blockIP(incident.source, 60 * 60 * 1000) // 1 hour
        break
        
      case 'suspicious_data_access':
        // Require additional authentication for the user
        await this.requireReauth(incident.source)
        break
        
      default:
        // No auto-remediation available
        break
    }
  }
}
```

## Compliance and Governance

### GDPR Compliance (`src/lib/compliance/gdpr-manager.ts`)

#### Data Subject Rights
```typescript
export class GDPRManager {
  static async handleDataSubjectRequest(
    type: 'access' | 'rectification' | 'erasure' | 'portability',
    userId: string,
    requestDetails: any
  ): Promise<DataSubjectResponse> {
    const correlationId = generateCorrelationId()
    
    // Log the request
    await AuditLogger.logEvent({
      action: `gdpr_${type}_request`,
      resource: 'user_data',
      resourceId: userId,
      userId,
      metadata: requestDetails,
      correlationId
    })
    
    switch (type) {
      case 'access':
        return await this.handleAccessRequest(userId)
        
      case 'rectification':
        return await this.handleRectificationRequest(userId, requestDetails)
        
      case 'erasure':
        return await this.handleErasureRequest(userId)
        
      case 'portability':
        return await this.handlePortabilityRequest(userId)
        
      default:
        throw new BusinessLogicError(`Unsupported GDPR request type: ${type}`)
    }
  }
  
  private static async handleAccessRequest(userId: string): Promise<DataSubjectResponse> {
    // Collect all user data from various sources
    const userData = await this.collectUserData(userId)
    
    // Anonymize sensitive data
    const anonymizedData = this.anonymizeSensitiveData(userData)
    
    return {
      type: 'access',
      status: 'completed',
      data: anonymizedData,
      timestamp: new Date()
    }
  }
  
  private static async handleErasureRequest(userId: string): Promise<DataSubjectResponse> {
    // Check if user can be deleted (no active contracts, etc.)
    const canDelete = await this.canDeleteUser(userId)
    
    if (!canDelete.allowed) {
      return {
        type: 'erasure',
        status: 'rejected',
        reason: canDelete.reason,
        timestamp: new Date()
      }
    }
    
    // Perform soft delete (anonymize data)
    await this.anonymizeUserData(userId)
    
    return {
      type: 'erasure',
      status: 'completed',
      timestamp: new Date()
    }
  }
}
```

### SOC 2 Compliance

#### Access Controls and Audit Trails
```typescript
export class SOC2Compliance {
  static async generateAccessReport(
    startDate: Date,
    endDate: Date
  ): Promise<AccessReport> {
    const accessLogs = await prisma.dataAccessLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    })
    
    return {
      period: { start: startDate, end: endDate },
      totalAccesses: accessLogs.length,
      uniqueUsers: new Set(accessLogs.map(log => log.userId)).size,
      accessByResource: this.groupByResource(accessLogs),
      accessByUser: this.groupByUser(accessLogs),
      suspiciousActivity: this.identifySuspiciousActivity(accessLogs)
    }
  }
  
  static async validateSecurityControls(): Promise<SecurityControlsReport> {
    const controls = [
      await this.validateAccessControls(),
      await this.validateEncryption(),
      await this.validateLogging(),
      await this.validateBackups(),
      await this.validateIncidentResponse()
    ]
    
    return {
      timestamp: new Date(),
      controls,
      overallCompliance: this.calculateComplianceScore(controls)
    }
  }
}
```

## Configuration and Environment

### Security Configuration
```bash
# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
SESSION_TIMEOUT=86400

# Encryption
DATA_ENCRYPTION_KEY=your-encryption-key
JWT_SECRET=your-jwt-secret

# Rate Limiting
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
SENTRY_DSN=https://your-sentry-dsn
LOG_LEVEL=info
SECURITY_ALERT_WEBHOOK=https://your-webhook-url

# Compliance
GDPR_RETENTION_PERIOD=2555
SOC2_AUDIT_MODE=true
```

### Security Headers
```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
]
```

## Best Practices

### Security Development Lifecycle
1. **Threat Modeling**: Identify potential security threats
2. **Secure Coding**: Follow secure coding practices
3. **Code Review**: Security-focused code reviews
4. **Testing**: Security testing and penetration testing
5. **Monitoring**: Continuous security monitoring
6. **Incident Response**: Rapid incident response procedures

### Monitoring Best Practices
1. **Real-time Alerts**: Set up real-time security alerts
2. **Log Analysis**: Regular log analysis and anomaly detection
3. **Performance Monitoring**: Monitor system performance metrics
4. **Compliance Reporting**: Regular compliance reporting
5. **Incident Documentation**: Document all security incidents

---

**Last Updated**: August 2025  
**Version**: 1.0  
**Maintainer**: Security Team
