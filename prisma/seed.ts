import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create a test company
  const testCompany = await prisma.company.upsert({
    where: { domain: 'example.com' },
    update: {},
    create: {
      name: 'Example Company',
      domain: 'example.com',
      type: 'both',
      status: 'active',
      verifiedAt: new Date(),
    },
  })

  // Create a test user
  await prisma.user.upsert({
    where: { phoneNumber: '+1234567890' },
    update: {},
    create: {
      phoneNumber: '+1234567890',
      email: 'admin@example.com', // Optional for notifications
      name: 'Admin User',
      role: 'admin',
      companyId: testCompany.id,
      phoneVerified: true,
      phoneVerifiedAt: new Date(),
    },
  })

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })