// Simple script to check if server is running and branches route is accessible
import http from 'http'

const BASE_URL = 'http://localhost:3000'

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const req = http.request(url, { method: 'GET' }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })
    req.on('error', reject)
    req.setTimeout(3000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    req.end()
  })
}

async function checkServer() {
  console.log('\n🔍 Checking Backend Server Status...\n')

  // Test 1: Health check
  console.log('1. Testing /api/health...')
  try {
    const health = await makeRequest('/api/health')
    console.log(`   ✅ Server is running (Status: ${health.status})`)
    console.log(`   Response:`, health.data)
  } catch (error) {
    console.error('   ❌ Server is NOT running or not accessible')
    console.error('   Error:', error.message)
    console.log('\n💡 Start the server:')
    console.log('   cd backend && npm start\n')
    process.exit(1)
  }

  // Test 2: Test branches endpoint
  console.log('\n2. Testing /api/test-branches...')
  try {
    const test = await makeRequest('/api/test-branches')
    console.log(`   Status: ${test.status}`)
    console.log(`   Response:`, test.data)
    
    if (test.data.routeExists) {
      console.log('   ✅ Branches route IS registered!')
    } else {
      console.log('   ❌ Branches route is NOT registered')
      console.log('   💡 Restart the backend server\n')
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message)
  }

  // Test 3: Try branches endpoint (should get 401, not 404)
  console.log('\n3. Testing /api/branches (should return 401, not 404)...')
  try {
    const branches = await makeRequest('/api/branches')
    console.log(`   Status: ${branches.status}`)
    if (branches.status === 200) {
      console.log('   ⚠️  Got 200 (unexpected - should require auth)')
    }
  } catch (error) {
    // Expected to fail
  }

  try {
    const branches = await makeRequest('/api/branches')
    if (branches.status === 404) {
      console.error('   ❌ Got 404 - Route NOT FOUND!')
      console.error('   💡 The branches route is not registered.')
      console.error('   💡 Restart the backend server after ensuring:')
      console.error('      1. backend/routes/branches.js exists')
      console.error('      2. backend/server.js imports and registers it')
      console.error('      3. No errors in server startup console\n')
    } else if (branches.status === 401) {
      console.log('   ✅ Got 401 - Route EXISTS and requires auth (correct!)')
    } else {
      console.log(`   Status: ${branches.status}`)
    }
  } catch (error) {
    console.error('   Error:', error.message)
  }

  console.log('\n✅ Check completed!\n')
}

checkServer().catch(console.error)
