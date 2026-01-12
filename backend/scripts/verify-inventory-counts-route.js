import db from '../database/db.js'

async function verifyInventoryCounts() {
  try {
    console.log('🔍 Verifying Inventory Counts setup...\n')
    
    // Check if tables exist
    console.log('1. Checking database tables...')
    try {
      const [tables] = await db.execute(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME IN ('inventory_counts', 'inventory_count_items')
      `)
      
      const tableNames = tables.map(t => t.TABLE_NAME)
      console.log('   Found tables:', tableNames)
      
      if (!tableNames.includes('inventory_counts')) {
        console.error('   ❌ inventory_counts table does NOT exist!')
        console.error('   Run: npm run migrate-inventory-counts')
        process.exit(1)
      }
      
      if (!tableNames.includes('inventory_count_items')) {
        console.error('   ❌ inventory_count_items table does NOT exist!')
        console.error('   Run: npm run migrate-inventory-counts')
        process.exit(1)
      }
      
      console.log('   ✅ Both tables exist')
    } catch (error) {
      console.error('   ❌ Error checking tables:', error.message)
      process.exit(1)
    }
    
    // Check route file exists
    console.log('\n2. Checking route file...')
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const routePath = path.join(__dirname, '../routes/inventoryCounts.js')
    
    if (fs.existsSync(routePath)) {
      console.log('   ✅ Route file exists:', routePath)
    } else {
      console.error('   ❌ Route file does NOT exist:', routePath)
      process.exit(1)
    }
    
    console.log('\n✅ All checks passed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Make sure backend server is running: npm start')
    console.log('   2. Check backend console for: ✅ /api/inventory-counts - REGISTERED SUCCESSFULLY')
    console.log('   3. Test endpoint: http://localhost:3000/api/test-inventory-counts')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Verification error:', error)
    process.exit(1)
  }
}

verifyInventoryCounts()
