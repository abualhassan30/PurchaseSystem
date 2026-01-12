// Test script to verify branches endpoint is accessible
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = process.env.API_URL || 'http://localhost:3000'

async function testBranchesEndpoint() {
  console.log('\n🔍 Testing Branches Endpoint...\n')
  console.log(`Base URL: ${BASE_URL}\n`)

  // Test 1: Health check
  console.log('1. Testing health endpoint...')
  try {
    const healthRes = await axios.get(`${BASE_URL}/api/health`)
    console.log('   ✅ Server is running')
    console.log('   Response:', healthRes.data)
  } catch (error) {
    console.error('   ❌ Server is not running or not accessible')
    console.error('   Error:', error.message)
    console.log('\n💡 Make sure the backend server is running:')
    console.log('   cd backend && npm start\n')
    process.exit(1)
  }

  // Test 2: Test branches endpoint (no auth)
  console.log('\n2. Testing /api/test-branches endpoint...')
  try {
    const testRes = await axios.get(`${BASE_URL}/api/test-branches`)
    console.log('   ✅ Test endpoint accessible')
    console.log('   Response:', testRes.data)
    
    if (testRes.data.routeExists) {
      console.log('   ✅ Branches route is registered!')
    } else {
      console.log('   ❌ Branches route is NOT registered')
      console.log('   💡 Restart the backend server\n')
    }
  } catch (error) {
    if (error.response) {
      console.error('   ❌ Error:', error.response.status, error.response.data)
    } else {
      console.error('   ❌ Error:', error.message)
    }
  }

  // Test 3: Try to access branches endpoint (will fail without auth, but should not be 404)
  console.log('\n3. Testing /api/branches endpoint (without auth)...')
  try {
    const branchesRes = await axios.get(`${BASE_URL}/api/branches`)
    console.log('   ✅ Endpoint exists (unexpected - should require auth)')
  } catch (error) {
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        console.log('   ✅ Endpoint exists and requires authentication (expected)')
        console.log('   Status: 401 Unauthorized')
      } else if (status === 404) {
        console.error('   ❌ Endpoint NOT FOUND (404)')
        console.error('   💡 The route is not registered. Restart the backend server!')
      } else {
        console.error('   ⚠️  Unexpected status:', status)
        console.error('   Response:', error.response.data)
      }
    } else {
      console.error('   ❌ Network error:', error.message)
    }
  }

  console.log('\n✅ Testing completed!\n')
}

testBranchesEndpoint().catch(console.error)
