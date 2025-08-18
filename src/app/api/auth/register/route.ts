import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS, formatPhoneNumber, validatePhoneNumber } from '@/lib/twilio'
import { registrationSchema } from '@/lib/validations/auth'
import logger, { logRequest, logError, logInfo, logAuth, logDb, logPerformance, logBusiness, logSecurity, logWarning } from '@/lib/logger'
import { sendDomainVerificationEmail } from '@/lib/email'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestLogger = logRequest(request, startTime)

  try {
    let body
    try {
      body = await request.json()
    } catch (jsonError) {
      logError('Company registration failed: Invalid JSON', jsonError, {
        requestBody: 'malformed'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    if (!body) {
      logError('Company registration failed: Missing request body', null, {
        requestBody: 'missing'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }
    
    // Validate input data
    const validationResult = registrationSchema.safeParse(body)
    if (!validationResult.success) {
      logError('Company registration failed: Validation error', null, {
        validationErrors: validationResult.error.issues,
        requestBody: body
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid input data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { companyName, companyEmail, phoneNumber, contactName, companyType } = validationResult.data

    logInfo('Company registration started', {
      companyName,
      companyEmail,
      phoneNumber,
      contactName,
      companyType
    })

    // Extract domain from email
    const domain = companyEmail.split('@')[1]
    if (!domain) {
      logError('Company registration failed: Invalid email format', null, { companyEmail })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)
    if (!validatePhoneNumber(formattedPhone)) {
      logError('Company registration failed: Invalid phone number', null, { 
        originalPhone: phoneNumber, 
        formattedPhone 
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'Invalid phone number format. Please use international format (+1234567890)' },
        { status: 400 }
      )
    }

    // Check if company domain already exists
    const companyCheckStartTime = Date.now()
    const existingCompany = await prisma.company.findUnique({
      where: { domain }
    })
    logDb('Company domain check', 'company', { 
      domain, 
      exists: !!existingCompany,
      duration: Date.now() - companyCheckStartTime
    })

    if (existingCompany) {
      logSecurity('Company registration failed: Duplicate domain', {
        domain,
        companyName,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'A company with this domain is already registered' },
        { status: 400 }
      )
    }

    // Generate domain verification token
    const domainVerificationToken = 'test-uuid'

    // Check if phone number is already registered
    const phoneCheckStartTime = Date.now()
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: formattedPhone }
    })
    logDb('User phone check', 'user', { 
      phoneNumber: formattedPhone, 
      exists: !!existingUser,
      duration: Date.now() - phoneCheckStartTime
    })

    if (existingUser) {
      logSecurity('Company registration failed: Duplicate phone number', {
        phoneNumber: formattedPhone,
        companyName,
        ip: request.headers.get('x-forwarded-for') || 'unknown'
      })
      requestLogger.end(400)
      return NextResponse.json(
        { error: 'This phone number is already registered' },
        { status: 400 }
      )
    }

    // Create company and user in transaction
    const transactionStartTime = Date.now()
    const result = await prisma.$transaction(async (tx) => {
      // Create company
      const companyCreateStartTime = Date.now()
      const company = await tx.company.create({
        data: {
          name: companyName,
          domain,
          type: companyType,
          status: 'pending',
          domainVerificationToken,
        }
      })
      logDb('Company creation', 'company', { 
        companyId: company.id, 
        companyName,
        domain,
        type: companyType,
        duration: Date.now() - companyCreateStartTime
      })

      // Create user
      const userCreateStartTime = Date.now()
      const user = await tx.user.create({
        data: {
          name: contactName,
          email: companyEmail,
          phoneNumber: formattedPhone,
          role: 'admin',
          companyId: company.id,
          phoneVerified: false,
        }
      })
      logDb('User creation', 'user', { 
        userId: user.id, 
        companyId: company.id,
        role: 'admin',
        duration: Date.now() - userCreateStartTime
      })

      return { company, user }
    })
    logDb('Registration transaction', 'transaction', { 
      companyId: result.company.id,
      userId: result.user.id,
      duration: Date.now() - transactionStartTime
    })

    // Send welcome SMS and domain verification email
    const smsStartTime = Date.now()
    let smsSent = false
    let emailSent = false
    
    try {
      const welcomeMessage = `Welcome to BenchWarmers! Your company ${companyName} has been registered. Please check your email at ${companyEmail} to verify your domain ownership.`
      smsSent = await sendSMS(formattedPhone, welcomeMessage)
      logPerformance('Welcome SMS send', Date.now() - smsStartTime, {
        phoneNumber: formattedPhone,
        success: smsSent
      })

      if (!smsSent) {
        logWarning('Welcome SMS failed to send', {
          phoneNumber: formattedPhone,
          companyId: result.company.id
        })
      }
    } catch (smsError) {
      logError('Welcome SMS error', smsError, {
        phoneNumber: formattedPhone,
        companyId: result.company.id
      })
    }

    // Send domain verification email
    try {
      const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-domain?token=${domainVerificationToken}`
      emailSent = await sendDomainVerificationEmail(
        companyEmail,
        companyName,
        domain,
        verificationUrl
      )
      
      if (emailSent) {
        logBusiness('Domain verification email sent during registration', 'company', {
          companyId: result.company.id,
          companyName,
          domain,
          email: companyEmail,
          verificationUrl
        })
      }
    } catch (emailError) {
      logError('Domain verification email error during registration', emailError, {
        companyId: result.company.id,
        email: companyEmail
      })
    }

    // Log successful registration
    logBusiness('Company registered successfully', 'company', {
      companyId: result.company.id,
      companyName,
      domain,
      companyType,
      userId: result.user.id,
      contactName,
      phoneNumber: formattedPhone
    })

    logAuth('Company admin user created', result.user.id, {
      companyId: result.company.id,
      companyName,
      role: 'admin'
    })

    const totalDuration = Date.now() - startTime
    logPerformance('Company registration total operation', totalDuration, {
      companyId: result.company.id,
      userId: result.user.id
    })

    requestLogger.end(200)
    return NextResponse.json({
      message: 'Company registered successfully',
      company: {
        id: result.company.id,
        name: result.company.name,
        domain: result.company.domain,
        type: result.company.type,
        status: result.company.status,
      },
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
      },
      warnings: [
        ...(smsSent ? [] : ['Welcome SMS could not be sent']),
        ...(emailSent ? [] : ['Domain verification email could not be sent'])
      ]
    })

    } catch (error) {
    logError('Company registration unexpected error', error, {
      requestBody: 'unknown'
    })
    logger.error(error as Error, 500)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

