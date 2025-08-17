#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class TestMonitor {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      summary: {},
      details: {},
      performance: {},
      coverage: {}
    }
  }

  async runTestSuite() {
    console.log('🧪 Starting comprehensive test monitoring...')
    
    try {
      // Run unit tests
      console.log('📋 Running unit tests...')
      const unitResults = this.runCommand('npm run test:unit -- --json --coverage')
      this.results.details.unit = this.parseJestResults(unitResults)
      
      // Run integration tests
      console.log('🔗 Running integration tests...')
      const integrationResults = this.runCommand('npm run test:integration -- --json')
      this.results.details.integration = this.parseJestResults(integrationResults)
      
      // Run API tests
      console.log('🌐 Running API tests...')
      const apiResults = this.runCommand('npm run test:api -- --json')
      this.results.details.api = this.parseJestResults(apiResults)
      
      // Run performance tests
      console.log('⚡ Running performance tests...')
      const perfResults = this.runCommand('npm run test -- __tests__/performance/ --json')
      this.results.details.performance = this.parseJestResults(perfResults)
      
      // Generate summary
      this.generateSummary()
      
      // Generate reports
      this.generateHtmlReport()
      this.generateJsonReport()
      
      console.log('✅ Test monitoring complete!')
      
    } catch (error) {
      console.error('❌ Test monitoring failed:', error.message)
      this.results.error = error.message
    }
  }

  runCommand(command) {
    try {
      return execSync(command, { 
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      })
    } catch (error) {
      console.warn(`⚠️ Command failed: ${command}`)
      return JSON.stringify({ 
        success: false, 
        numTotalTests: 0, 
        numPassedTests: 0, 
        numFailedTests: 0,
        testResults: []
      })
    }
  }

  parseJestResults(output) {
    try {
      const result = JSON.parse(output)
      return {
        success: result.success,
        numTotalTests: result.numTotalTests || 0,
        numPassedTests: result.numPassedTests || 0,
        numFailedTests: result.numFailedTests || 0,
        numPendingTests: result.numPendingTests || 0,
        testResults: result.testResults || [],
        coverageMap: result.coverageMap || null
      }
    } catch (error) {
      return {
        success: false,
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        error: 'Failed to parse test results'
      }
    }
  }

  generateSummary() {
    const { unit, integration, api, performance } = this.results.details
    
    this.results.summary = {
      totalTests: (unit?.numTotalTests || 0) + (integration?.numTotalTests || 0) + 
                  (api?.numTotalTests || 0) + (performance?.numTotalTests || 0),
      passedTests: (unit?.numPassedTests || 0) + (integration?.numPassedTests || 0) + 
                   (api?.numPassedTests || 0) + (performance?.numPassedTests || 0),
      failedTests: (unit?.numFailedTests || 0) + (integration?.numFailedTests || 0) + 
                   (api?.numFailedTests || 0) + (performance?.numFailedTests || 0),
      successRate: 0,
      suites: {
        unit: { status: unit?.success ? 'PASS' : 'FAIL', tests: unit?.numTotalTests || 0 },
        integration: { status: integration?.success ? 'PASS' : 'FAIL', tests: integration?.numTotalTests || 0 },
        api: { status: api?.success ? 'PASS' : 'FAIL', tests: api?.numTotalTests || 0 },
        performance: { status: performance?.success ? 'PASS' : 'FAIL', tests: performance?.numTotalTests || 0 }
      }
    }
    
    if (this.results.summary.totalTests > 0) {
      this.results.summary.successRate = Math.round(
        (this.results.summary.passedTests / this.results.summary.totalTests) * 100
      )
    }
  }

  generateHtmlReport() {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchwarmers Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; border-left: 4px solid #2563eb; }
        .metric-value { font-size: 2rem; font-weight: bold; color: #1e293b; }
        .metric-label { color: #64748b; margin-top: 5px; }
        .suite { margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .suite-header { background: #f1f5f9; padding: 15px; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
        .suite-content { padding: 15px; }
        .status-pass { color: #059669; }
        .status-fail { color: #dc2626; }
        .timestamp { color: #64748b; font-size: 0.9rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Benchwarmers Test Report</h1>
            <div class="timestamp">Generated: ${this.results.timestamp}</div>
        </div>
        <div class="content">
            <div class="summary">
                <div class="metric">
                    <div class="metric-value">${this.results.summary.totalTests || 0}</div>
                    <div class="metric-label">Total Tests</div>
                </div>
                <div class="metric">
                    <div class="metric-value status-pass">${this.results.summary.passedTests || 0}</div>
                    <div class="metric-label">Passed</div>
                </div>
                <div class="metric">
                    <div class="metric-value status-fail">${this.results.summary.failedTests || 0}</div>
                    <div class="metric-label">Failed</div>
                </div>
                <div class="metric">
                    <div class="metric-value">${this.results.summary.successRate || 0}%</div>
                    <div class="metric-label">Success Rate</div>
                </div>
            </div>
            
            ${Object.entries(this.results.summary.suites || {}).map(([name, suite]) => `
                <div class="suite">
                    <div class="suite-header">
                        <span>${name.charAt(0).toUpperCase() + name.slice(1)} Tests</span>
                        <span class="status-${suite.status.toLowerCase()}">${suite.status} (${suite.tests} tests)</span>
                    </div>
                </div>
            `).join('')}
            
            <div style="margin-top: 30px; padding: 20px; background: #f8fafc; border-radius: 8px;">
                <h3>📊 Coverage & Performance</h3>
                <p>• Code coverage reports available in <code>coverage/</code> directory</p>
                <p>• Performance benchmarks: API responses &lt; 500ms, DB queries &lt; 200ms</p>
                <p>• Integration tests validate end-to-end workflows</p>
                <p>• E2E tests ensure complete user journey functionality</p>
            </div>
        </div>
    </div>
</body>
</html>`

    fs.writeFileSync('test-report.html', html)
    console.log('📊 HTML report generated: test-report.html')
  }

  generateJsonReport() {
    fs.writeFileSync('test-results.json', JSON.stringify(this.results, null, 2))
    console.log('📄 JSON report generated: test-results.json')
  }
}

// Run if called directly
if (require.main === module) {
  const monitor = new TestMonitor()
  monitor.runTestSuite().then(() => {
    process.exit(this.results.summary.failedTests > 0 ? 1 : 0)
  }).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

module.exports = TestMonitor
