import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function seedTestData() {
  console.log('🌱 Seeding test database...')

  try {
    // Clean existing data
    await prisma.$executeRaw`TRUNCATE TABLE "User", "Company", "TalentProfile", "TalentRequest", "Offer", "Engagement", "Transaction", "EscrowPayment", "Dispute" RESTART IDENTITY CASCADE;`

    // Create test companies
    const seekerCompany = await prisma.company.create({
      data: {
        id: randomUUID(),
        name: 'TechCorp Solutions',
        email: 'admin@techcorp.com',
        type: 'seeker',
        status: 'active',
        domainVerified: true,
        domain: 'techcorp.com',
        description: 'Leading technology solutions provider',
        website: 'https://techcorp.com',
        industry: 'Technology',
        size: 'medium',
        location: 'San Francisco, CA'
      }
    })

    const providerCompany = await prisma.company.create({
      data: {
        id: randomUUID(),
        name: 'Creative Agency',
        email: 'hello@creativeagency.com',
        type: 'provider',
        status: 'active',
        domainVerified: true,
        domain: 'creativeagency.com',
        description: 'Full-service creative and marketing agency',
        website: 'https://creativeagency.com',
        industry: 'Marketing',
        size: 'small',
        location: 'New York, NY'
      }
    })

    // Create test users
    const seekerUser = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: 'john.manager@techcorp.com',
        name: 'John Manager',
        role: 'company_admin',
        companyId: seekerCompany.id,
        isActive: true,
        lastLoginAt: new Date(),
        preferences: {
          notifications: { email: true, push: true },
          timezone: 'America/Los_Angeles'
        }
      }
    })

    const providerUser1 = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: 'sarah.developer@example.com',
        name: 'Sarah Developer',
        role: 'talent',
        isActive: true,
        lastLoginAt: new Date(),
        preferences: {
          notifications: { email: true, push: false },
          timezone: 'America/New_York'
        }
      }
    })

    const providerUser2 = await prisma.user.create({
      data: {
        id: randomUUID(),
        email: 'mike.designer@example.com',
        name: 'Mike Designer',
        role: 'talent',
        isActive: true,
        lastLoginAt: new Date(),
        preferences: {
          notifications: { email: true, push: true },
          timezone: 'America/Chicago'
        }
      }
    })

    // Create talent profiles
    const talentProfile1 = await prisma.talentProfile.create({
      data: {
        id: randomUUID(),
        userId: providerUser1.id,
        title: 'Senior Full-Stack Developer',
        bio: 'Experienced developer with 8+ years in React, Node.js, and cloud technologies. Specialized in building scalable web applications.',
        skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'Docker'],
        experienceLevel: 'senior',
        hourlyRate: 85,
        availability: 'available',
        location: 'Remote',
        yearsOfExperience: 8,
        languages: ['English', 'Spanish'],
        timezone: 'EST',
        isActive: true,
        portfolio: {
          website: 'https://sarahdev.com',
          github: 'https://github.com/sarahdev',
          linkedin: 'https://linkedin.com/in/sarahdev'
        }
      }
    })

    const talentProfile2 = await prisma.talentProfile.create({
      data: {
        id: randomUUID(),
        userId: providerUser2.id,
        title: 'Senior UI/UX Designer',
        bio: 'Creative designer with 6+ years experience in user interface and user experience design. Expert in Figma, Adobe Creative Suite.',
        skills: ['UI Design', 'UX Design', 'Figma', 'Adobe Creative Suite', 'Prototyping', 'User Research'],
        experienceLevel: 'senior',
        hourlyRate: 75,
        availability: 'available',
        location: 'Chicago, IL',
        yearsOfExperience: 6,
        languages: ['English'],
        timezone: 'CST',
        isActive: true,
        portfolio: {
          website: 'https://mikedesign.com',
          dribbble: 'https://dribbble.com/mikedesign',
          behance: 'https://behance.net/mikedesign'
        }
      }
    })

    // Create talent requests
    const talentRequest1 = await prisma.talentRequest.create({
      data: {
        id: randomUUID(),
        companyId: seekerCompany.id,
        title: 'Senior React Developer for E-commerce Platform',
        description: 'We need an experienced React developer to help build our new e-commerce platform. The project involves creating responsive UI components, integrating with APIs, and implementing payment processing.',
        budget: 15000,
        duration: 90,
        skillsRequired: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
        experienceLevel: 'senior',
        projectType: 'contract',
        urgency: 'medium',
        location: 'Remote',
        status: 'active',
        requirements: [
          'Minimum 5 years React experience',
          'Experience with e-commerce platforms',
          'Strong TypeScript skills',
          'API integration experience'
        ],
        deliverables: [
          'Responsive web application',
          'Component library',
          'API integration',
          'Documentation'
        ]
      }
    })

    const talentRequest2 = await prisma.talentRequest.create({
      data: {
        id: randomUUID(),
        companyId: seekerCompany.id,
        title: 'UI/UX Designer for Mobile App Redesign',
        description: 'Looking for a talented UI/UX designer to redesign our mobile application. Need someone with experience in mobile design patterns and user research.',
        budget: 8000,
        duration: 45,
        skillsRequired: ['UI Design', 'UX Design', 'Mobile Design', 'Figma'],
        experienceLevel: 'mid',
        projectType: 'contract',
        urgency: 'high',
        location: 'Remote',
        status: 'active',
        requirements: [
          'Mobile app design experience',
          'User research skills',
          'Figma proficiency',
          'Portfolio of mobile designs'
        ],
        deliverables: [
          'Mobile app wireframes',
          'High-fidelity designs',
          'Interactive prototypes',
          'Design system'
        ]
      }
    })

    // Create offers
    const offer1 = await prisma.offer.create({
      data: {
        id: randomUUID(),
        talentRequestId: talentRequest1.id,
        providerUserId: providerUser1.id,
        proposedRate: 80,
        proposedDuration: 90,
        message: 'I am very interested in this e-commerce project. With my 8+ years of React experience and previous work on similar platforms, I can deliver a high-quality solution within your timeline.',
        status: 'accepted',
        timeline: [
          { phase: 'Planning & Setup', duration: 7, deliverables: ['Project setup', 'Architecture design'] },
          { phase: 'Core Development', duration: 60, deliverables: ['Component development', 'API integration'] },
          { phase: 'Testing & Deployment', duration: 23, deliverables: ['Testing', 'Documentation', 'Deployment'] }
        ]
      }
    })

    const offer2 = await prisma.offer.create({
      data: {
        id: randomUUID(),
        talentRequestId: talentRequest2.id,
        providerUserId: providerUser2.id,
        proposedRate: 70,
        proposedDuration: 45,
        message: 'This mobile app redesign project aligns perfectly with my expertise. I have extensive experience in mobile UX design and can provide user research insights to improve the app.',
        status: 'pending',
        timeline: [
          { phase: 'Research & Analysis', duration: 10, deliverables: ['User research', 'Competitive analysis'] },
          { phase: 'Design & Prototyping', duration: 25, deliverables: ['Wireframes', 'High-fidelity designs'] },
          { phase: 'Handoff & Documentation', duration: 10, deliverables: ['Design system', 'Developer handoff'] }
        ]
      }
    })

    // Create engagement from accepted offer
    const engagement1 = await prisma.engagement.create({
      data: {
        id: randomUUID(),
        offerId: offer1.id,
        seekerCompanyId: seekerCompany.id,
        providerUserId: providerUser1.id,
        title: 'E-commerce Platform Development',
        description: 'Development of responsive e-commerce platform with React and TypeScript',
        totalAmount: 7200, // 90 days * 80/hour (assuming 1 hour per day for calculation)
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'active',
        milestones: [
          {
            id: randomUUID(),
            title: 'Project Setup & Planning',
            description: 'Initial project setup and architecture planning',
            amount: 2400,
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            status: 'completed'
          },
          {
            id: randomUUID(),
            title: 'Core Development',
            description: 'Main application development and API integration',
            amount: 3600,
            dueDate: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000),
            status: 'in_progress'
          },
          {
            id: randomUUID(),
            title: 'Testing & Deployment',
            description: 'Final testing, documentation, and deployment',
            amount: 1200,
            dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            status: 'pending'
          }
        ]
      }
    })

    // Create sample transactions
    const transaction1 = await prisma.transaction.create({
      data: {
        id: randomUUID(),
        engagementId: engagement1.id,
        amount: 2400,
        type: 'milestone',
        status: 'completed',
        stripePaymentIntentId: 'pi_test_milestone1',
        metadata: {
          milestoneId: engagement1.milestones[0].id,
          description: 'Payment for milestone 1 completion'
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      }
    })

    // Create escrow payment
    await prisma.escrowPayment.create({
      data: {
        id: randomUUID(),
        transactionId: transaction1.id,
        amount: 3600,
        status: 'held',
        releaseConditions: {
          milestoneCompleted: true,
          approvalRequired: true
        },
        holdUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: {
          milestoneId: engagement1.milestones[1].id,
          description: 'Escrow for milestone 2'
        }
      }
    })

    // Create sample messages
    await prisma.conversation.create({
      data: {
        id: randomUUID(),
        engagementId: engagement1.id,
        participants: [seekerUser.id, providerUser1.id],
        lastMessageAt: new Date(),
        messages: {
          create: [
            {
              id: randomUUID(),
              senderId: seekerUser.id,
              content: 'Hi Sarah! Welcome to the project. Looking forward to working with you.',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: randomUUID(),
              senderId: providerUser1.id,
              content: 'Thank you! I\'m excited to get started. I\'ve reviewed the requirements and have some initial questions.',
              type: 'text',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60000)
            }
          ]
        }
      }
    })

    console.log('✅ Test data seeded successfully!')
    console.log(`📊 Created:`)
    console.log(`   - 2 Companies (1 seeker, 1 provider)`)
    console.log(`   - 3 Users (1 seeker admin, 2 talent providers)`)
    console.log(`   - 2 Talent Profiles`)
    console.log(`   - 2 Talent Requests`)
    console.log(`   - 2 Offers (1 accepted, 1 pending)`)
    console.log(`   - 1 Active Engagement`)
    console.log(`   - 1 Transaction with Escrow`)
    console.log(`   - Sample Messages`)

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  seedTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export default seedTestData
