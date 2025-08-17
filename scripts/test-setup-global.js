const { execSync } = require('child_process')

module.exports = async () => {
  console.log('🚀 Setting up global test environment...')
  
  try {
    // Start test containers
    console.log('📦 Starting test containers...')
    execSync('docker-compose -f docker-compose.test.yml up -d', { stdio: 'inherit' })
    
    // Wait for containers to be ready
    console.log('⏳ Waiting for containers to be healthy...')
    execSync('docker-compose -f docker-compose.test.yml exec -T postgres-test pg_isready -U test -d benchwarmers_test', { stdio: 'inherit' })
    
    // Set environment variables
    process.env.TEST_DATABASE_URL = 'postgresql://test:test@localhost:5433/benchwarmers_test'
    process.env.NODE_ENV = 'test'
    
    console.log('✅ Global test setup complete!')
  } catch (error) {
    console.error('❌ Global test setup failed:', error)
    throw error
  }
}
