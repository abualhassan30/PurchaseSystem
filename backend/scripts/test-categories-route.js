import axios from 'axios'

// Test if the categories endpoint is accessible
async function testCategoriesRoute() {
  try {
    console.log('Testing categories endpoint...')
    console.log('URL: http://localhost:3000/api/categories')
    console.log('')
    
    // First test health endpoint
    try {
      const healthRes = await axios.get('http://localhost:3000/api/health')
      console.log('✅ Backend server is running')
      console.log('   Health check:', healthRes.data)
      console.log('')
    } catch (error) {
      console.log('❌ Backend server is NOT running!')
      console.log('   Please start the server: cd backend && npm run dev')
      return
    }

    // Test categories endpoint (will fail without auth, but we can see if route exists)
    try {
      const res = await axios.get('http://localhost:3000/api/categories', {
        validateStatus: () => true // Don't throw on any status
      })
      
      if (res.status === 401) {
        console.log('✅ Categories route EXISTS! (401 = authentication required, which is expected)')
        console.log('   The route is working, you just need to be logged in.')
      } else if (res.status === 404) {
        console.log('❌ Categories route NOT FOUND (404)')
        console.log('   The backend server needs to be restarted!')
        console.log('   Steps:')
        console.log('   1. Stop the server (Ctrl+C)')
        console.log('   2. Restart: npm run dev')
      } else {
        console.log(`Response status: ${res.status}`)
        console.log('Response:', res.data)
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('❌ Cannot connect to backend server')
        console.log('   Make sure the server is running on port 3000')
      } else {
        console.log('Error:', error.message)
      }
    }
  } catch (error) {
    console.error('Test failed:', error.message)
  }
}

testCategoriesRoute()
