const { execSync } = require('child_process')

module.exports = async () => {
  console.log('🧹 Cleaning up global test environment...')
  
  try {
    // Stop and remove test containers
    console.log('📦 Stopping test containers...')
    execSync('docker-compose -f docker-compose.test.yml down -v', { stdio: 'inherit' })
    
    console.log('✅ Global test cleanup complete!')
  } catch (error) {
    console.error('❌ Global test cleanup failed:', error)
    // Don't throw error to avoid masking test failures
  }
}
