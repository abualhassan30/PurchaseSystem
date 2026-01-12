import db from '../database/db.js'

console.log('🔍 Verifying Dashboard Route Setup...\n')

// Check if dashboard route file exists
import { existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const dashboardRoutePath = join(__dirname, '..', 'routes', 'dashboard.js')

console.log('1. Checking dashboard route file...')
if (existsSync(dashboardRoutePath)) {
  console.log('   ✅ dashboard.js exists')
} else {
  console.log('   ❌ dashboard.js NOT FOUND')
  process.exit(1)
}

// Check if we can import it
console.log('\n2. Testing dashboard route import...')
try {
  const dashboardRoutes = await import('../routes/dashboard.js')
  if (dashboardRoutes.default) {
    console.log('   ✅ Dashboard route can be imported')
    console.log('   ✅ Route type:', typeof dashboardRoutes.default)
  } else {
    console.log('   ❌ Dashboard route default export not found')
    process.exit(1)
  }
} catch (error) {
  console.log('   ❌ Error importing dashboard route:', error.message)
  process.exit(1)
}

// Test database connection
console.log('\n3. Testing database connection...')
try {
  const [result] = await db.execute('SELECT 1 as test')
  console.log('   ✅ Database connection successful')
} catch (error) {
  console.log('   ❌ Database connection failed:', error.message)
  process.exit(1)
}

// Test a simple query
console.log('\n4. Testing dashboard queries...')
try {
  const [purchaseOrdersCount] = await db.execute('SELECT COUNT(*) as count FROM purchase_orders')
  const [itemsCount] = await db.execute('SELECT COUNT(*) as count FROM items')
  console.log('   ✅ Purchase Orders:', purchaseOrdersCount[0]?.count || 0)
  console.log('   ✅ Items:', itemsCount[0]?.count || 0)
} catch (error) {
  console.log('   ❌ Query failed:', error.message)
  process.exit(1)
}

console.log('\n✅ All checks passed!')
console.log('\n📋 Next steps:')
console.log('   1. Make sure the backend server is running')
console.log('   2. Restart the backend server: npm start')
console.log('   3. Check the console for: "✅ /api/dashboard - REGISTERED SUCCESSFULLY"')
console.log('   4. Test the endpoint: http://localhost:3000/api/test-dashboard')
console.log('   5. Refresh the frontend dashboard page\n')

process.exit(0)
