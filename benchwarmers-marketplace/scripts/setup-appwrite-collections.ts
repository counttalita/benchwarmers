#!/usr/bin/env tsx

import { Client, Databases, Permission, Role, ID } from 'appwrite'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const client = new Client()

client
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)

// Set API key using headers for server-side operations
if (process.env.APPWRITE_API_KEY) {
  client.headers['X-Appwrite-Key'] = process.env.APPWRITE_API_KEY
}

const databases = new Databases(client)

const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!

// Collection IDs (you can customize these)
const COLLECTIONS = {
  COMPANIES: 'companies',
  USERS: 'users',
  TALENT_PROFILES: 'talent_profiles',
  TALENT_REQUESTS: 'talent_requests',
  MATCHES: 'matches',
  OFFERS: 'offers',
  PAYMENTS: 'payments',
  ENGAGEMENTS: 'engagements',
  REVIEWS: 'reviews',
}

async function checkCollectionExists(collectionId: string): Promise<boolean> {
  try {
    await databases.listDocuments(DATABASE_ID, collectionId, [])
    return true
  } catch (error: any) {
    if (error.code === 404) {
      return false
    }
    throw error
  }
}

async function createSampleDocument(collectionId: string, data: any) {
  try {
    const document = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      ID.unique(),
      data
    )
    console.log(`  ✅ Created sample document in ${collectionId}`)
    return document
  } catch (error: any) {
    console.error(`  ❌ Error creating sample document in ${collectionId}:`, error.message)
  }
}

async function setupCollections() {
  console.log('🚀 Checking Appwrite collections...\n')

  const collectionStatus: Array<{ name: string; id: string; exists: boolean }> = []

  for (const [key, collectionId] of Object.entries(COLLECTIONS)) {
    const exists = await checkCollectionExists(collectionId)
    collectionStatus.push({ name: key, id: collectionId, exists })
    
    if (exists) {
      console.log(`✅ Collection exists: ${key} (${collectionId})`)
    } else {
      console.log(`❌ Collection missing: ${key} (${collectionId})`)
    }
  }

  console.log('\n📋 Collection Setup Instructions:')
  console.log('=====================================')
  console.log('Since Appwrite SDK v18 doesn\'t support programmatic collection creation,')
  console.log('you need to create these collections manually in your Appwrite console:')
  console.log('')
  console.log('1. Go to your Appwrite Console: https://cloud.appwrite.io/console')
  console.log('2. Navigate to your project')
  console.log('3. Go to Databases > Your Database')
  console.log('4. Create the following collections:')
  console.log('')

  const missingCollections = collectionStatus.filter(c => !c.exists)
  
  if (missingCollections.length === 0) {
    console.log('🎉 All collections already exist!')
  } else {
    missingCollections.forEach((collection, index) => {
      console.log(`${index + 1}. Collection ID: ${collection.id}`)
      console.log(`   Name: ${collection.name}`)
      console.log('')
    })

    console.log('📝 Required Attributes for each collection:')
    console.log('============================================')
    
    // Companies Collection
    console.log('\n🏢 Companies Collection:')
    console.log('- name (string, required, max 255)')
    console.log('- domain (string, required, max 255)')
    console.log('- type (enum: provider, seeker, both, required)')
    console.log('- status (enum: pending, active, suspended, default: pending)')
    console.log('- stripeAccountId (string, optional, max 255)')
    console.log('- verifiedAt (datetime, optional)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Users Collection
    console.log('\n👥 Users Collection:')
    console.log('- companyId (string, required, max 255)')
    console.log('- email (email, required)')
    console.log('- name (string, required, max 255)')
    console.log('- passwordHash (string, required, max 255)')
    console.log('- role (enum: admin, member, required)')
    console.log('- twoFactorEnabled (boolean, required, default: false)')
    console.log('- twoFactorSecret (string, optional, max 255)')
    console.log('- emailVerified (datetime, optional)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Talent Profiles Collection
    console.log('\n👨‍💼 Talent Profiles Collection:')
    console.log('- companyId (string, required, max 255)')
    console.log('- name (string, required, max 255)')
    console.log('- title (string, required, max 255)')
    console.log('- seniorityLevel (enum: junior, mid, senior, lead, principal, required)')
    console.log('- skills (string, required, max 10000) - JSON as string')
    console.log('- certifications (string, optional, max 10000) - JSON as string')
    console.log('- location (string, required, max 255)')
    console.log('- remotePreference (string, required, max 255)')
    console.log('- rateMin (float, optional)')
    console.log('- rateMax (float, optional)')
    console.log('- currency (string, required, max 10, default: USD)')
    console.log('- availabilityCalendar (string, optional, max 10000) - JSON as string')
    console.log('- isVisible (boolean, required, default: true)')
    console.log('- rating (float, required, default: 0)')
    console.log('- reviewCount (integer, required, default: 0)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Talent Requests Collection
    console.log('\n🔍 Talent Requests Collection:')
    console.log('- companyId (string, required, max 255)')
    console.log('- title (string, required, max 255)')
    console.log('- description (string, required, max 10000)')
    console.log('- requiredSkills (string, required, max 10000) - JSON as string')
    console.log('- preferredSkills (string, optional, max 10000) - JSON as string')
    console.log('- budgetMin (float, optional)')
    console.log('- budgetMax (float, optional)')
    console.log('- currency (string, required, max 10, default: USD)')
    console.log('- startDate (datetime, required)')
    console.log('- durationWeeks (integer, required)')
    console.log('- locationPreference (string, required, max 255)')
    console.log('- status (enum: open, matching, closed, default: open)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Matches Collection
    console.log('\n🎯 Matches Collection:')
    console.log('- requestId (string, required, max 255)')
    console.log('- profileId (string, required, max 255)')
    console.log('- score (float, required)')
    console.log('- scoreBreakdown (string, required, max 10000) - JSON as string')
    console.log('- status (enum: pending, viewed, interested, not_interested, default: pending)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Offers Collection
    console.log('\n💰 Offers Collection:')
    console.log('- matchId (string, required, max 255)')
    console.log('- seekerCompanyId (string, required, max 255)')
    console.log('- providerCompanyId (string, required, max 255)')
    console.log('- rate (float, required)')
    console.log('- currency (string, required, max 10, default: USD)')
    console.log('- startDate (datetime, required)')
    console.log('- durationWeeks (integer, required)')
    console.log('- terms (string, optional, max 10000)')
    console.log('- totalAmount (float, required)')
    console.log('- platformFee (float, required)')
    console.log('- providerAmount (float, required)')
    console.log('- status (enum: pending, accepted, declined, countered, default: pending)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Payments Collection
    console.log('\n💳 Payments Collection:')
    console.log('- offerId (string, required, max 255)')
    console.log('- stripePaymentIntentId (string, optional, max 255)')
    console.log('- amount (float, required)')
    console.log('- currency (string, required, max 10, default: USD)')
    console.log('- platformFeeAmount (float, required)')
    console.log('- providerAmount (float, required)')
    console.log('- status (enum: pending, held_in_escrow, released, refunded, default: pending)')
    console.log('- heldAt (datetime, optional)')
    console.log('- releasedAt (datetime, optional)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Engagements Collection
    console.log('\n🤝 Engagements Collection:')
    console.log('- offerId (string, required, max 255)')
    console.log('- status (enum: active, completed, terminated, disputed, default: active)')
    console.log('- startDate (datetime, required)')
    console.log('- endDate (datetime, optional)')
    console.log('- totalHours (float, optional)')
    console.log('- totalAmount (float, required)')
    console.log('- completionVerified (boolean, required, default: false)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    // Reviews Collection
    console.log('\n⭐ Reviews Collection:')
    console.log('- engagementId (string, required, max 255)')
    console.log('- profileId (string, required, max 255)')
    console.log('- rating (integer, required, min: 1, max: 5)')
    console.log('- comment (string, optional, max 10000)')
    console.log('- isPublic (boolean, required, default: true)')
    console.log('- createdAt (datetime, required)')
    console.log('- updatedAt (datetime, required)')

    console.log('\n🔧 After creating collections, run this script again to verify setup.')
  }

  console.log('\n📝 Collection IDs:')
  Object.entries(COLLECTIONS).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`)
  })
}

async function main() {
  try {
    await setupCollections()
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { COLLECTIONS, setupCollections }