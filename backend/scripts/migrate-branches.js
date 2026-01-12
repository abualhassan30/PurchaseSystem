import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function migrateBranches() {
  let connection

  try {
    const dbName = process.env.DB_NAME || 'purchasesystem'
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: dbName,
    })

    console.log(`✅ Connected to database: ${dbName}`)
    console.log('🔄 Starting branches migration...\n')

    // 1. Create branches table
    console.log('1. Creating branches table...')
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS branches (
          id INT AUTO_INCREMENT PRIMARY KEY,
          nameAr VARCHAR(255) NOT NULL,
          nameEn VARCHAR(255) NOT NULL,
          code VARCHAR(50) NOT NULL UNIQUE,
          city VARCHAR(100) NULL,
          isActive BOOLEAN NOT NULL DEFAULT TRUE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('   ✅ Branches table created/verified\n')
    } catch (error) {
      if (error.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('   ℹ️  Branches table already exists\n')
      } else {
        throw error
      }
    }

    // 2. Check if branchId column exists in purchase_orders
    console.log('2. Checking purchase_orders table...')
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'branchId'
    `, [dbName])

    if (columns.length === 0) {
      console.log('   Adding branchId column to purchase_orders...')
      await connection.execute(`
        ALTER TABLE purchase_orders 
        ADD COLUMN branchId INT NULL
      `)
      console.log('   ✅ branchId column added\n')
    } else {
      console.log('   ℹ️  branchId column already exists\n')
    }

    // 3. Check if notes column exists in purchase_orders
    const [notesColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_orders' AND COLUMN_NAME = 'notes'
    `, [dbName])

    if (notesColumns.length === 0) {
      console.log('   Adding notes column to purchase_orders...')
      await connection.execute(`
        ALTER TABLE purchase_orders 
        ADD COLUMN notes TEXT NULL
      `)
      console.log('   ✅ notes column added\n')
    } else {
      console.log('   ℹ️  notes column already exists\n')
    }

    // 4. Add foreign key constraint if it doesn't exist
    console.log('3. Checking foreign key constraint...')
    const [constraints] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'purchase_orders' 
      AND CONSTRAINT_NAME = 'purchase_orders_ibfk_2'
    `, [dbName])

    if (constraints.length === 0) {
      console.log('   Adding foreign key constraint...')
      try {
        await connection.execute(`
          ALTER TABLE purchase_orders 
          ADD CONSTRAINT purchase_orders_ibfk_2 
          FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL
        `)
        console.log('   ✅ Foreign key constraint added\n')
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log('   ℹ️  Foreign key constraint already exists\n')
        } else {
          console.warn('   ⚠️  Could not add foreign key constraint:', error.message)
          console.log('   (This is okay if branches table is empty)\n')
        }
      }
    } else {
      console.log('   ℹ️  Foreign key constraint already exists\n')
    }

    // 5. Verify the migration
    console.log('4. Verifying migration...')
    const [branchesTable] = await connection.execute(`
      SELECT COUNT(*) as count FROM branches
    `)
    console.log(`   ✅ Branches table exists with ${branchesTable[0].count} records`)

    const [purchaseOrdersColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'purchase_orders' 
      AND COLUMN_NAME IN ('branchId', 'notes')
    `, [dbName])
    
    console.log(`   ✅ purchase_orders table has ${purchaseOrdersColumns.length} new columns (branchId, notes)`)

    await connection.end()
    console.log('\n✅ Branches migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Restart the backend server: npm start')
    console.log('   2. Test the branches endpoint in the frontend')
    console.log('   3. Create your first branch through the UI\n')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    console.error('Full error:', error)
    
    if (connection) {
      await connection.end()
    }
    
    process.exit(1)
  }
}

migrateBranches()
