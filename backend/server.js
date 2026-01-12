import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Verify route files exist before importing
const categoriesRoutePath = join(__dirname, 'routes', 'categories.js')
const branchesRoutePath = join(__dirname, 'routes', 'branches.js')

if (!existsSync(categoriesRoutePath)) {
  console.error('❌ CRITICAL ERROR: categories.js route file not found!')
  console.error('   Expected path:', categoriesRoutePath)
  process.exit(1)
}
console.log('✅ Categories route file verified:', categoriesRoutePath)

if (!existsSync(branchesRoutePath)) {
  console.error('❌ CRITICAL ERROR: branches.js route file not found!')
  console.error('   Expected path:', branchesRoutePath)
  process.exit(1)
}
console.log('✅ Branches route file verified:', branchesRoutePath)

dotenv.config()

// Import routes after dotenv.config() to ensure environment variables are loaded
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import unitsRoutes from './routes/units.js'
import itemsRoutes from './routes/items.js'
import categoriesRoutes from './routes/categories.js'
import purchaseOrdersRoutes from './routes/purchaseOrders.js'
import branchesRoutes from './routes/branches.js'
import inventoryCountsRoutes from './routes/inventoryCounts.js'
import dashboardRoutes from './routes/dashboard.js'
import custodyClosuresRoutes from './routes/custodyClosures.js'

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Routes
console.log('\n🔧 Registering routes...')
app.use('/api/auth', authRoutes)
console.log('  ✅ /api/auth')
app.use('/api/users', usersRoutes)
console.log('  ✅ /api/users')
app.use('/api/units', unitsRoutes)
console.log('  ✅ /api/units')
app.use('/api/items', itemsRoutes)
console.log('  ✅ /api/items')

// Categories route - with explicit check and detailed logging
console.log('  🔍 Checking categoriesRoutes...')
console.log('     Type:', typeof categoriesRoutes)
console.log('     Value:', categoriesRoutes ? 'defined' : 'undefined')

if (categoriesRoutes) {
  try {
    app.use('/api/categories', categoriesRoutes)
    console.log('  ✅ /api/categories - REGISTERED SUCCESSFULLY')
    
    // Test the route registration
    app._router.stack.forEach((middleware, index) => {
      if (middleware.route) {
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase()
        if (middleware.route.path.includes('categories')) {
          console.log(`     Route found in stack: ${methods} ${middleware.route.path}`)
        }
      } else if (middleware.name === 'router' && middleware.regexp) {
        if (middleware.regexp.toString().includes('categories')) {
          console.log(`     Router middleware found for categories`)
        }
      }
    })
  } catch (error) {
    console.error('  ❌ Error registering categories route:', error)
    console.error('     Stack:', error.stack)
  }
} else {
  console.error('  ❌ /api/categories - FAILED: categoriesRoutes is undefined!')
  console.error('     This means the import failed. Check backend/routes/categories.js')
  console.error('     File exists:', existsSync(categoriesRoutePath))
}

app.use('/api/purchase-orders', purchaseOrdersRoutes)
console.log('  ✅ /api/purchase-orders')

// Inventory Counts route - with explicit check and detailed logging
console.log('  🔍 Checking inventoryCountsRoutes...')
console.log('     Type:', typeof inventoryCountsRoutes)
console.log('     Value:', inventoryCountsRoutes ? 'defined' : 'undefined')

if (inventoryCountsRoutes) {
  try {
    app.use('/api/inventory-counts', inventoryCountsRoutes)
    console.log('  ✅ /api/inventory-counts - REGISTERED SUCCESSFULLY')
    
    // Verify route is in the stack
    let foundInStack = false
    app._router.stack.forEach((middleware) => {
      if (middleware.name === 'router' && middleware.regexp) {
        const regexStr = middleware.regexp.toString()
        if (regexStr.includes('inventory-counts') || regexStr.includes('inventory_counts')) {
          foundInStack = true
          console.log(`     Router middleware found for inventory-counts`)
        }
      }
    })
    if (!foundInStack) {
      console.warn('     ⚠️  Warning: Route not found in stack immediately after registration')
    }
  } catch (error) {
    console.error('  ❌ Error registering inventory-counts route:', error)
    console.error('     Stack:', error.stack)
  }
} else {
  console.error('  ❌ /api/inventory-counts - FAILED: inventoryCountsRoutes is undefined!')
  console.error('     This means the import failed. Check backend/routes/inventoryCounts.js')
}

// Dashboard route - register independently
console.log('  🔍 Checking dashboardRoutes...')
console.log('     Type:', typeof dashboardRoutes)
console.log('     Value:', dashboardRoutes ? 'defined' : 'undefined')

if (dashboardRoutes) {
  try {
    app.use('/api/dashboard', dashboardRoutes)
    console.log('  ✅ /api/dashboard - REGISTERED SUCCESSFULLY')
  } catch (error) {
    console.error('  ❌ Error registering dashboard route:', error)
    console.error('     Stack:', error.stack)
  }
} else {
  console.error('  ❌ /api/dashboard - FAILED: dashboardRoutes is undefined!')
  console.error('     This means the import failed. Check backend/routes/dashboard.js')
}

// Custody Closures route
console.log('  🔍 Checking custodyClosuresRoutes...')
console.log('     Type:', typeof custodyClosuresRoutes)
console.log('     Value:', custodyClosuresRoutes ? 'defined' : 'undefined')

if (custodyClosuresRoutes) {
  try {
    app.use('/api/custody-closures', custodyClosuresRoutes)
    console.log('  ✅ /api/custody-closures - REGISTERED SUCCESSFULLY')
  } catch (error) {
    console.error('  ❌ Error registering custody-closures route:', error)
    console.error('     Stack:', error.stack)
  }
} else {
  console.error('  ❌ /api/custody-closures - FAILED: custodyClosuresRoutes is undefined!')
  console.error('     This means the import failed. Check backend/routes/custodyClosures.js')
}

// Branches route - with explicit check and detailed logging
console.log('  🔍 Checking branchesRoutes...')
console.log('     Type:', typeof branchesRoutes)
console.log('     Value:', branchesRoutes ? 'defined' : 'undefined')
console.log('     Is Router:', branchesRoutes && typeof branchesRoutes === 'function' ? 'Yes' : 'No')

if (branchesRoutes) {
  try {
    app.use('/api/branches', branchesRoutes)
    console.log('  ✅ /api/branches - REGISTERED SUCCESSFULLY')
    
    // Verify route is in the stack
    let foundInStack = false
    app._router.stack.forEach((middleware) => {
      if (middleware.name === 'router' && middleware.regexp) {
        const regexStr = middleware.regexp.toString()
        if (regexStr.includes('branches')) {
          foundInStack = true
          console.log('     ✅ Route found in Express router stack')
        }
      }
    })
    
    if (!foundInStack) {
      console.warn('     ⚠️  Route not found in stack (might be registered but not visible)')
    }
  } catch (error) {
    console.error('  ❌ Error registering branches route:', error)
    console.error('     Message:', error.message)
    console.error('     Stack:', error.stack)
  }
} else {
  console.error('  ❌ /api/branches - FAILED: branchesRoutes is undefined!')
  console.error('     This means the import failed. Check backend/routes/branches.js')
  console.error('     File exists:', existsSync(branchesRoutePath))
  console.error('     File path:', branchesRoutePath)
}
console.log('')

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Test endpoints to verify routes exist (no auth required for testing)
app.get('/api/test-categories', (req, res) => {
  res.json({ 
    message: 'Categories route test endpoint',
    routeExists: !!categoriesRoutes,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/test-branches', (req, res) => {
  res.json({ 
    message: 'Branches route test endpoint',
    routeExists: !!branchesRoutes,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/test-inventory-counts', (req, res) => {
  res.json({
    message: 'Inventory Counts route test endpoint',
    routeExists: !!inventoryCountsRoutes,
    timestamp: new Date().toISOString()
  })
})

app.get('/api/test-dashboard', (req, res) => {
  res.json({
    message: 'Dashboard route test endpoint',
    routeExists: !!dashboardRoutes,
    timestamp: new Date().toISOString()
  })
})

// 404 handler - MUST be after all routes but before error handler
app.use((req, res) => {
  console.log(`\n⚠️  404 - Route not found:`)
  console.log(`   Method: ${req.method}`)
  console.log(`   URL: ${req.originalUrl}`)
  console.log(`   Path: ${req.path}`)
  console.log(`   Registered routes check:`)
  console.log(`   - categoriesRoutes exists: ${!!categoriesRoutes}`)
  console.log(`   - branchesRoutes exists: ${!!branchesRoutes}`)
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    hint: 'Make sure the backend server was restarted after adding new routes'
  })
})

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  })
})

// Verify all routes are registered before starting server
const registeredRoutes = []
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    registeredRoutes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`)
  } else if (middleware.name === 'router' && middleware.regexp) {
    const regexStr = middleware.regexp.toString()
    if (regexStr.includes('/api/')) {
      const match = regexStr.match(/\/api\/(\w+)/)
      if (match) {
        registeredRoutes.push(`/api/${match[1]}`)
      }
    }
  }
})

app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`)
  console.log(`📊 Database: ${process.env.DB_NAME} on ${process.env.DB_HOST}:${process.env.DB_PORT}`)
  console.log('\n📋 Available routes:')
  console.log('  - /api/auth')
  console.log('  - /api/users')
  console.log('  - /api/units')
  console.log('  - /api/items')
  console.log('  - /api/categories')
  console.log('  - /api/purchase-orders')
  if (inventoryCountsRoutes) {
    console.log('  - /api/inventory-counts ✅')
  } else {
    console.log('  - /api/inventory-counts ❌ (NOT REGISTERED - check console above)')
  }
  if (branchesRoutes) {
    console.log('  - /api/branches ✅')
  } else {
    console.log('  - /api/branches ❌ (NOT REGISTERED - check console above)')
  }
  if (dashboardRoutes) {
    console.log('  - /api/dashboard ✅')
  } else {
    console.log('  - /api/dashboard ❌ (NOT REGISTERED - check console above)')
  }
  if (custodyClosuresRoutes) {
    console.log('  - /api/custody-closures ✅')
  } else {
    console.log('  - /api/custody-closures ❌ (NOT REGISTERED - check console above)')
  }
  console.log('  - /api/health')
  console.log('  - /api/test-categories (test endpoint)')
  console.log('  - /api/test-branches (test endpoint)')
  console.log('  - /api/test-inventory-counts (test endpoint)')
  console.log('  - /api/test-dashboard (test endpoint)')
  console.log('')
  
  // Final verification
  if (!branchesRoutes) {
    console.error('⚠️  WARNING: Branches route is NOT registered!')
    console.error('   The /api/branches endpoint will return 404.')
    console.error('   Check the console output above for import errors.')
    console.error('')
  }
  if (!inventoryCountsRoutes) {
    console.error('⚠️  WARNING: Inventory Counts route is NOT registered!')
    console.error('   The /api/inventory-counts endpoint will return 404.')
    console.error('   Check the console output above for import errors.')
    console.error('')
  }
})
