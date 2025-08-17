import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test companies
  const seekerCompany = await prisma.company.upsert({
    where: { domain: 'techcorp.com' },
    update: {},
    create: {
      name: 'TechCorp Solutions',
      domain: 'techcorp.com',
      type: 'seeker',
      status: 'active',
      domainVerified: true,
      domainVerifiedAt: new Date(),
      verifiedAt: new Date(),
    },
  })

  const providerCompany = await prisma.company.upsert({
    where: { domain: 'devstudio.com' },
    update: {},
    create: {
      name: 'DevStudio Inc',
      domain: 'devstudio.com',
      type: 'provider',
      status: 'active',
      domainVerified: true,
      domainVerifiedAt: new Date(),
      verifiedAt: new Date(),
    },
  })

  const bothCompany = await prisma.company.upsert({
    where: { domain: 'fullstack.com' },
    update: {},
    create: {
      name: 'FullStack Agency',
      domain: 'fullstack.com',
      type: 'both',
      status: 'active',
      domainVerified: true,
      domainVerifiedAt: new Date(),
      verifiedAt: new Date(),
    },
  })

  // Create test users
  const seekerUser = await prisma.user.upsert({
    where: { phoneNumber: '+1234567890' },
    update: {},
    create: {
      phoneNumber: '+1234567890',
      email: 'admin@techcorp.com',
      name: 'John Seeker',
      role: 'admin',
      companyId: seekerCompany.id,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    },
  })

  const providerUser = await prisma.user.upsert({
    where: { phoneNumber: '+1234567891' },
    update: {},
    create: {
      phoneNumber: '+1234567891',
      email: 'admin@devstudio.com',
      name: 'Jane Provider',
      role: 'admin',
      companyId: providerCompany.id,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    },
  })

  // Create talent profiles
  const seniorDeveloper = await prisma.talentProfile.create({
    data: {
      companyId: providerCompany.id,
      name: 'Alice Johnson',
      title: 'Senior Full-Stack Developer',
      seniorityLevel: 'senior',
      skills: [
        { name: 'React', level: 'expert', yearsExperience: 5 },
        { name: 'Node.js', level: 'expert', yearsExperience: 6 },
        { name: 'TypeScript', level: 'senior', yearsExperience: 4 },
        { name: 'PostgreSQL', level: 'senior', yearsExperience: 4 },
        { name: 'AWS', level: 'mid', yearsExperience: 3 }
      ],
      experience: [
        {
          role: 'Senior Developer',
          company: 'TechStart Inc',
          duration: 24,
          industry: 'fintech'
        },
        {
          role: 'Full-Stack Developer',
          company: 'WebCorp',
          duration: 18,
          industry: 'e-commerce'
        }
      ],
      location: 'San Francisco, CA',
      timezone: 'America/Los_Angeles',
      remotePreference: 'remote',
      rateMin: 120,
      rateMax: 180,
      availabilityCalendar: [
        {
          startDate: '2024-01-01',
          endDate: '2024-12-31',
          utilizationPercent: 0
        }
      ],
      preferences: {
        preferredCompanySize: 'startup',
        workStyle: 'collaborative'
      },
      pastProjects: [
        { completedOnTime: true, qualityRating: 4.8, clientSatisfaction: 5.0 },
        { completedOnTime: true, qualityRating: 4.9, clientSatisfaction: 4.8 }
      ],
      languages: ['English', 'Spanish'],
      rating: 4.85,
      reviewCount: 12
    }
  })

  const midDeveloper = await prisma.talentProfile.create({
    data: {
      companyId: bothCompany.id,
      name: 'Bob Smith',
      title: 'Mid-Level Backend Developer',
      seniorityLevel: 'mid',
      skills: [
        { name: 'Python', level: 'expert', yearsExperience: 4 },
        { name: 'Django', level: 'senior', yearsExperience: 3 },
        { name: 'PostgreSQL', level: 'senior', yearsExperience: 3 },
        { name: 'Docker', level: 'mid', yearsExperience: 2 },
        { name: 'Redis', level: 'mid', yearsExperience: 2 }
      ],
      experience: [
        {
          role: 'Backend Developer',
          company: 'DataFlow Systems',
          duration: 30,
          industry: 'healthcare'
        }
      ],
      location: 'Austin, TX',
      timezone: 'America/Chicago',
      remotePreference: 'hybrid',
      rateMin: 80,
      rateMax: 120,
      availabilityCalendar: [
        {
          startDate: '2024-02-01',
          endDate: '2024-12-31',
          utilizationPercent: 25
        }
      ],
      preferences: {
        preferredCompanySize: 'medium',
        workStyle: 'independent'
      },
      pastProjects: [
        { completedOnTime: true, qualityRating: 4.5, clientSatisfaction: 4.7 }
      ],
      languages: ['English'],
      rating: 4.6,
      reviewCount: 8
    }
  })

  // Create talent requests
  const urgentRequest = await prisma.talentRequest.create({
    data: {
      companyId: seekerCompany.id,
      title: 'Senior React Developer for E-commerce Platform',
      description: 'We need an experienced React developer to help build our new e-commerce platform. Must have experience with modern React patterns, TypeScript, and state management.',
      requiredSkills: [
        { name: 'React', level: 'senior', weight: 10, mandatory: true },
        { name: 'TypeScript', level: 'mid', weight: 8, mandatory: true },
        { name: 'Redux', level: 'mid', weight: 6, mandatory: false }
      ],
      preferredSkills: [
        { name: 'Next.js', level: 'mid', weight: 5 },
        { name: 'GraphQL', level: 'junior', weight: 3 }
      ],
      budgetMin: 100,
      budgetMax: 160,
      budgetIdeal: 130,
      startDate: new Date('2024-01-15'),
      durationWeeks: 12,
      hoursPerWeek: 40,
      locationPreference: 'remote',
      urgency: 'high',
      companySize: 'startup',
      industry: 'e-commerce',
      customWeights: {
        skills: 0.35,
        experience: 0.25,
        availability: 0.20,
        budget: 0.20
      }
    }
  })

  const backendRequest = await prisma.talentRequest.create({
    data: {
      companyId: seekerCompany.id,
      title: 'Python Backend Developer for API Development',
      description: 'Looking for a skilled Python developer to build and maintain our REST APIs. Experience with Django/FastAPI and database optimization required.',
      requiredSkills: [
        { name: 'Python', level: 'senior', weight: 10, mandatory: true },
        { name: 'Django', level: 'mid', weight: 8, mandatory: true },
        { name: 'PostgreSQL', level: 'mid', weight: 7, mandatory: true }
      ],
      preferredSkills: [
        { name: 'Redis', level: 'junior', weight: 4 },
        { name: 'Docker', level: 'junior', weight: 3 }
      ],
      budgetMin: 70,
      budgetMax: 110,
      budgetIdeal: 90,
      startDate: new Date('2024-02-01'),
      durationWeeks: 16,
      hoursPerWeek: 40,
      locationPreference: 'remote',
      urgency: 'medium',
      companySize: 'startup',
      industry: 'fintech'
    }
  })

  // Create matches
  const match1 = await prisma.match.create({
    data: {
      requestId: urgentRequest.id,
      profileId: seniorDeveloper.id,
      score: 92.5,
      scoreBreakdown: {
        skillsScore: 95,
        experienceScore: 90,
        availabilityScore: 100,
        budgetScore: 85,
        locationScore: 100,
        cultureScore: 90,
        velocityScore: 95,
        reliabilityScore: 98
      },
      status: 'viewed'
    }
  })

  const match2 = await prisma.match.create({
    data: {
      requestId: backendRequest.id,
      profileId: midDeveloper.id,
      score: 88.0,
      scoreBreakdown: {
        skillsScore: 92,
        experienceScore: 85,
        availabilityScore: 90,
        budgetScore: 95,
        locationScore: 80,
        cultureScore: 85,
        velocityScore: 80,
        reliabilityScore: 85
      },
      status: 'interested'
    }
  })

  console.log('✅ Database seeded successfully!')
  console.log(`Created ${2} companies, ${2} users, ${2} talent profiles, ${2} requests, and ${2} matches`)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })