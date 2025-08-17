#!/usr/bin/env tsx

import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

const ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!
const PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID!
const API_KEY = process.env.APPWRITE_API_KEY!

// Minimal collections with only essential attributes to fit free tier limits
const MINIMAL_COLLECTIONS = {
  talent_requests: {
    name: 'Talent Requests',
    attributes: [
      { id: 'companyId', type: 'string', required: true, size: 255 },
      { id: 'title', type: 'string', required: true, size: 255 },
      { id: 'description', type: 'string', required: true, size: 1000 },
      { id: 'requiredSkills', type: 'string', required: true, size: 1000 },
      { id: 'budgetMin', type: 'float', required: false },
      { id: 'budgetMax', type: 'float', required: false },
      { id: 'currency', type: 'string', required: true, size: 10 },
      { id: 'startDate', type: 'datetime', required: true },
      { id: 'durationWeeks', type: 'integer', required: true },
      { id: 'locationPreference', type: 'string', required: true, size: 255 },
      { id: 'status', type: 'enum', required: true, enumValues: ['open', 'matching', 'closed'] },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  },
  matches: {
    name: 'Matches',
    attributes: [
      { id: 'requestId', type: 'string', required: true, size: 255 },
      { id: 'profileId', type: 'string', required: true, size: 255 },
      { id: 'score', type: 'float', required: true },
      { id: 'scoreBreakdown', type: 'string', required: true, size: 1000 },
      { id: 'status', type: 'enum', required: true, enumValues: ['pending', 'viewed', 'interested', 'not_interested'] },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  },
  offers: {
    name: 'Offers',
    attributes: [
      { id: 'matchId', type: 'string', required: true, size: 255 },
      { id: 'seekerCompanyId', type: 'string', required: true, size: 255 },
      { id: 'providerCompanyId', type: 'string', required: true, size: 255 },
      { id: 'rate', type: 'float', required: true },
      { id: 'currency', type: 'string', required: true, size: 10 },
      { id: 'startDate', type: 'datetime', required: true },
      { id: 'durationWeeks', type: 'integer', required: true },
      { id: 'totalAmount', type: 'float', required: true },
      { id: 'platformFee', type: 'float', required: true },
      { id: 'providerAmount', type: 'float', required: true },
      { id: 'status', type: 'enum', required: true, enumValues: ['pending', 'accepted', 'declined', 'countered'] },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  },
  payments: {
    name: 'Payments',
    attributes: [
      { id: 'offerId', type: 'string', required: true, size: 255 },
      { id: 'stripePaymentIntentId', type: 'string', required: false, size: 255 },
      { id: 'amount', type: 'float', required: true },
      { id: 'currency', type: 'string', required: true, size: 10 },
      { id: 'platformFeeAmount', type: 'float', required: true },
      { id: 'providerAmount', type: 'float', required: true },
      { id: 'status', type: 'enum', required: true, enumValues: ['pending', 'held_in_escrow', 'released', 'refunded'] },
      { id: 'heldAt', type: 'datetime', required: false },
      { id: 'releasedAt', type: 'datetime', required: false },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  },
  engagements: {
    name: 'Engagements',
    attributes: [
      { id: 'offerId', type: 'string', required: true, size: 255 },
      { id: 'status', type: 'enum', required: true, enumValues: ['active', 'completed', 'terminated', 'disputed'] },
      { id: 'startDate', type: 'datetime', required: true },
      { id: 'endDate', type: 'datetime', required: false },
      { id: 'totalHours', type: 'float', required: false },
      { id: 'totalAmount', type: 'float', required: true },
      { id: 'completionVerified', type: 'boolean', required: true },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  },
  reviews: {
    name: 'Reviews',
    attributes: [
      { id: 'engagementId', type: 'string', required: true, size: 255 },
      { id: 'profileId', type: 'string', required: true, size: 255 },
      { id: 'rating', type: 'integer', required: true, min: 1, max: 5 },
      { id: 'comment', type: 'string', required: false, size: 1000 },
      { id: 'isPublic', type: 'boolean', required: true },
      { id: 'createdAt', type: 'datetime', required: true },
      { id: 'updatedAt', type: 'datetime', required: true }
    ]
  }
}

async function makeRequest(url: string, method: string, data?: any) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': PROJECT_ID,
    'X-Appwrite-Key': API_KEY
  }

  const options: RequestInit = {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  }

  try {
    const response = await fetch(url, options)
    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result.message || 'Unknown error'}`)
    }
    
    return result
  } catch (error) {
    throw error
  }
}

async function createCollection(collectionId: string, name: string) {
  const url = `${ENDPOINT}/databases/${DATABASE_ID}/collections`
  const data = {
    collectionId,
    name,
    permissions: [
      'read("users")',
      'write("users")',
      'update("users")',
      'delete("users")'
    ]
  }

  try {
    const result = await makeRequest(url, 'POST', data)
    console.log(`✅ Created collection: ${name} (${collectionId})`)
    return result
  } catch (error: any) {
    if (error.message.includes('409')) {
      console.log(`⚠️  Collection already exists: ${name} (${collectionId})`)
      return null
    } else {
      console.error(`❌ Error creating collection ${name}:`, error.message)
      throw error
    }
  }
}

async function createAttribute(collectionId: string, attribute: any) {
  let url: string
  let data: any

  switch (attribute.type) {
    case 'string':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`
      data = {
        key: attribute.id,
        size: attribute.size || 255,
        required: attribute.required,
        default: attribute.defaultValue
      }
      break
    case 'integer':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`
      data = {
        key: attribute.id,
        required: attribute.required,
        min: attribute.min,
        max: attribute.max,
        default: attribute.defaultValue
      }
      break
    case 'float':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`
      data = {
        key: attribute.id,
        required: attribute.required,
        min: attribute.min,
        max: attribute.max,
        default: attribute.defaultValue
      }
      break
    case 'boolean':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`
      data = {
        key: attribute.id,
        required: attribute.required,
        default: attribute.defaultValue
      }
      break
    case 'datetime':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/datetime`
      data = {
        key: attribute.id,
        required: attribute.required,
        default: attribute.defaultValue
      }
      break
    case 'email':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/email`
      data = {
        key: attribute.id,
        required: attribute.required,
        default: attribute.defaultValue
      }
      break
    case 'enum':
      url = `${ENDPOINT}/databases/${DATABASE_ID}/collections/${collectionId}/attributes/enum`
      data = {
        key: attribute.id,
        elements: attribute.enumValues,
        required: attribute.required,
        default: attribute.defaultValue
      }
      break
    default:
      throw new Error(`Unsupported attribute type: ${attribute.type}`)
  }

  try {
    const result = await makeRequest(url, 'POST', data)
    console.log(`  ✅ Created ${attribute.type} attribute: ${attribute.id}`)
    return result
  } catch (error: any) {
    if (error.message.includes('409')) {
      console.log(`  ⚠️  Attribute already exists: ${attribute.id}`)
      return null
    } else {
      console.error(`  ❌ Error creating attribute ${attribute.id}:`, error.message)
      throw error
    }
  }
}

async function createMinimalCollections() {
  console.log('🚀 Creating minimal Appwrite collections (optimized for free tier)...\n')

  for (const [collectionId, config] of Object.entries(MINIMAL_COLLECTIONS)) {
    console.log(`📦 Creating collection: ${config.name}`)
    
    // Create collection
    await createCollection(collectionId, config.name)
    
    // Wait a bit for collection to be ready
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Create attributes
    for (const attribute of config.attributes) {
      await createAttribute(collectionId, attribute)
      // Small delay between attributes
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`✅ Completed: ${config.name}\n`)
  }

  console.log('🎉 All minimal collections created successfully!')
  console.log('\n📝 Created Collections:')
  Object.entries(MINIMAL_COLLECTIONS).forEach(([id, config]) => {
    console.log(`  ${config.name}: ${id}`)
  })
}

async function main() {
  try {
    await createMinimalCollections()
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { MINIMAL_COLLECTIONS, createMinimalCollections }
