import { captureMessage, setTag } from '@/lib/monitoring/sentry'

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'payment' | 'suspicious_activity'
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId?: string
  companyId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  timestamp: Date
}

export interface SecurityRule {
  id: string
  name: string
  description: string
  type: 'rate_limit' | 'pattern_match' | 'threshold' | 'blacklist'
  conditions: Record<string, any>
  action: 'log' | 'alert' | 'block' | 'flag'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

class SecurityAuditor {
  private events: SecurityEvent[] = []
  private rules: SecurityRule[] = []
  private blacklistedIPs: Set<string> = new Set()
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map()

  constructor() {
    this.initializeDefaultRules()
  }

  private initializeDefaultRules() {
    this.rules = [
      {
        id: 'rate_limit_auth',
        name: 'Authentication Rate Limit',
        description: 'Limit authentication attempts to prevent brute force attacks',
        type: 'rate_limit',
        conditions: {
          window: 300000, // 5 minutes
          maxAttempts: 5,
          endpoint: '/api/auth'
        },
        action: 'block',
        severity: 'high'
      },
      {
        id: 'suspicious_payment',
        name: 'Suspicious Payment Activity',
        description: 'Detect unusual payment patterns',
        type: 'threshold',
        conditions: {
          maxAmount: 10000,
          maxFrequency: 10 // per hour
        },
        action: 'flag',
        severity: 'medium'
      },
      {
        id: 'data_access_pattern',
        name: 'Unusual Data Access Pattern',
        description: 'Detect unusual data access patterns',
        type: 'pattern_match',
        conditions: {
          maxRequestsPerMinute: 100,
          suspiciousEndpoints: ['/api/admin', '/api/users']
        },
        action: 'alert',
        severity: 'medium'
      }
    ]
  }

  recordEvent(event: SecurityEvent) {
    this.events.push(event)
    
    // Apply security rules
    this.applySecurityRules(event)
    
    // Log high severity events
    if (['high', 'critical'].includes(event.severity)) {
      captureMessage(`Security event: ${event.type}`, 'warning')
      setTag('security_event_type', event.type)
      setTag('security_severity', event.severity)
    }

    // Keep only last 1000 events in memory
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }
  }

  private applySecurityRules(event: SecurityEvent) {
    for (const rule of this.rules) {
      if (this.matchesRule(event, rule)) {
        this.executeRuleAction(rule, event)
      }
    }
  }

  private matchesRule(event: SecurityEvent, rule: SecurityRule): boolean {
    switch (rule.type) {
      case 'rate_limit':
        return this.checkRateLimit(event, rule.conditions)
      case 'pattern_match':
        return this.checkPatternMatch(event, rule.conditions)
      case 'threshold':
        return this.checkThreshold(event, rule.conditions)
      case 'blacklist':
        return this.checkBlacklist(event, rule.conditions)
      default:
        return false
    }
  }

  private checkRateLimit(event: SecurityEvent, conditions: any): boolean {
    const key = `${event.ipAddress}:${conditions.endpoint}`
    const now = Date.now()
    
    if (!this.rateLimitMap.has(key)) {
      this.rateLimitMap.set(key, { count: 1, resetTime: now + conditions.window })
      return false
    }

    const rateLimit = this.rateLimitMap.get(key)!
    
    if (now > rateLimit.resetTime) {
      rateLimit.count = 1
      rateLimit.resetTime = now + conditions.window
      return false
    }

    rateLimit.count++
    return rateLimit.count > conditions.maxAttempts
  }

  private checkPatternMatch(event: SecurityEvent, conditions: any): boolean {
    // Check if user is accessing suspicious endpoints too frequently
    if (event.details.endpoint && conditions.suspiciousEndpoints?.includes(event.details.endpoint)) {
      const key = `${event.ipAddress}:suspicious_endpoints`
      const now = Date.now()
      
      if (!this.rateLimitMap.has(key)) {
        this.rateLimitMap.set(key, { count: 1, resetTime: now + 60000 }) // 1 minute
        return false
      }

      const rateLimit = this.rateLimitMap.get(key)!
      
      if (now > rateLimit.resetTime) {
        rateLimit.count = 1
        rateLimit.resetTime = now + 60000
        return false
      }

      rateLimit.count++
      return rateLimit.count > conditions.maxRequestsPerMinute
    }
    
    return false
  }

  private checkThreshold(event: SecurityEvent, conditions: any): boolean {
    if (event.type === 'payment') {
      const amount = event.details.amount || 0
      return amount > conditions.maxAmount
    }
    return false
  }

  private checkBlacklist(event: SecurityEvent, conditions: any): boolean {
    return event.ipAddress ? this.blacklistedIPs.has(event.ipAddress) : false
  }

  private executeRuleAction(rule: SecurityRule, event: SecurityEvent) {
    switch (rule.action) {
      case 'log':
        console.log(`Security rule triggered: ${rule.name}`, { event, rule })
        break
      case 'alert':
        captureMessage(`Security alert: ${rule.name}`, 'warning')
        break
      case 'block':
        this.blacklistedIPs.add(event.ipAddress!)
        captureMessage(`IP blocked: ${event.ipAddress}`, 'error')
        break
      case 'flag':
        captureMessage(`User flagged: ${event.userId}`, 'warning')
        break
    }
  }

  isIPBlocked(ipAddress: string): boolean {
    return this.blacklistedIPs.has(ipAddress)
  }

  getSecurityEvents(filters?: {
    type?: string
    severity?: string
    userId?: string
    companyId?: string
    startDate?: Date
    endDate?: Date
  }) {
    let filteredEvents = this.events

    if (filters?.type) {
      filteredEvents = filteredEvents.filter(e => e.type === filters.type)
    }
    if (filters?.severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === filters.severity)
    }
    if (filters?.userId) {
      filteredEvents = filteredEvents.filter(e => e.userId === filters.userId)
    }
    if (filters?.companyId) {
      filteredEvents = filteredEvents.filter(e => e.companyId === filters.companyId)
    }
    if (filters?.startDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp >= filters.startDate!)
    }
    if (filters?.endDate) {
      filteredEvents = filteredEvents.filter(e => e.timestamp <= filters.endDate!)
    }

    return filteredEvents
  }

  getSecurityMetrics() {
    const now = Date.now()
    const oneHourAgo = new Date(now - 3600000)
    const oneDayAgo = new Date(now - 86400000)

    const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo)
    const dailyEvents = this.events.filter(e => e.timestamp >= oneDayAgo)

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      blockedIPs: this.blacklistedIPs.size,
      eventsByType: this.groupEventsByType(this.events),
      eventsBySeverity: this.groupEventsBySeverity(this.events),
      recentAlerts: recentEvents.filter(e => ['high', 'critical'].includes(e.severity))
    }
  }

  private groupEventsByType(events: SecurityEvent[]) {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  private groupEventsBySeverity(events: SecurityEvent[]) {
    return events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  addRule(rule: SecurityRule) {
    this.rules.push(rule)
  }

  removeRule(ruleId: string) {
    this.rules = this.rules.filter(r => r.id !== ruleId)
  }

  clear() {
    this.events = []
    this.rateLimitMap.clear()
  }
}

export const securityAuditor = new SecurityAuditor()

// Utility functions for common security events
export const securityEvents = {
  authenticationAttempt: (userId: string, success: boolean, ipAddress: string, userAgent: string) => {
    securityAuditor.recordEvent({
      type: 'authentication',
      severity: success ? 'low' : 'medium',
      userId,
      ipAddress,
      userAgent,
      details: { success },
      timestamp: new Date()
    })
  },

  dataAccess: (userId: string, companyId: string, resource: string, action: string, ipAddress: string) => {
    securityAuditor.recordEvent({
      type: 'data_access',
      severity: 'low',
      userId,
      companyId,
      ipAddress,
      details: { resource, action },
      timestamp: new Date()
    })
  },

  paymentProcessed: (userId: string, companyId: string, amount: number, ipAddress: string) => {
    securityAuditor.recordEvent({
      type: 'payment',
      severity: amount > 10000 ? 'high' : 'medium',
      userId,
      companyId,
      ipAddress,
      details: { amount },
      timestamp: new Date()
    })
  },

  suspiciousActivity: (ipAddress: string, userAgent: string, details: Record<string, any>) => {
    securityAuditor.recordEvent({
      type: 'suspicious_activity',
      severity: 'high',
      ipAddress,
      userAgent,
      details,
      timestamp: new Date()
    })
  }
}
