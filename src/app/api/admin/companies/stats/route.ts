import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logRequest, logError, logInfo, logDb } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    // TODO: Add admin authentication check here
    // For now, we'll skip auth but this should be implemented

    logInfo('Admin company stats request')

    const statsStartTime = Date.now()
    
    // Get all stats in parallel for better performance
    const [
      totalCompanies,
      pendingCompanies,
      activeCompanies,
      suspendedCompanies,
      domainVerifiedCompanies,
      domainPendingCompanies,
      providerCompanies,
      seekerCompanies,
      bothCompanies,
      recentRegistrations
    ] = await Promise.all([
      // Total companies
      prisma.company.count(),
      
      // Pending companies
      prisma.company.count({
        where: { status: 'pending' }
      }),
      
      // Active companies
      prisma.company.count({
        where: { status: 'active' }
      }),
      
      // Suspended companies
      prisma.company.count({
        where: { status: 'suspended' }
      }),
      
      // Domain verified companies
      prisma.company.count({
        where: { domainVerified: true }
      }),
      
      // Domain pending companies
      prisma.company.count({
        where: { domainVerified: false }
      }),
      
      // Provider companies
      prisma.company.count({
        where: { type: 'provider' }
      }),
      
      // Seeker companies
      prisma.company.count({
        where: { type: 'seeker' }
      }),
      
      // Both type companies
      prisma.company.count({
        where: { type: 'both' }
      }),
      
      // Recent registrations (last 7 days)
      prisma.company.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    logDb('Company stats query', 'company', {
      totalCompanies,
      pendingCompanies,
      activeCompanies,
      domainVerifiedCompanies,
      duration: Date.now() - statsStartTime
    })

    const stats = {
      total: totalCompanies,
      pending: pendingCompanies,
      active: activeCompanies,
      suspended: suspendedCompanies,
      domainVerified: domainVerifiedCompanies,
      domainPending: domainPendingCompanies,
      providers: providerCompanies,
      seekers: seekerCompanies,
      both: bothCompanies,
      recentRegistrations: recentRegistrations
    }

    logInfo('Company stats retrieved', stats)

    requestLogger.end(200)
    return NextResponse.json({ stats })

  } catch (error) {
    logError('Company stats error', error)
    logger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}