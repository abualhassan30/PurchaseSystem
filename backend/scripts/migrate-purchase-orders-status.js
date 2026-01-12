// Migration script to add status field to purchase_orders table
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

async function migrateStatus() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'purchasesystem',
      multipleStatements: true,
    })

    console.log('✅ Connected to database')
    console.log('📋 Adding status field to purchase_orders table...\n')

    // Check if status column already exists
    const [columns] = await connection.execute(
      `SELECT COLUMN_NAME 
       FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
       AND TABLE_NAME = 'purchase_orders' 
       AND COLUMN_NAME = 'status'`,
      [process.env.DB_NAME || 'purchasesystem']
    )

    if (columns.length > 0) {
      console.log('⚠️  Status column already exists. Skipping migration.')
      return
    }

    // Add status column
    await connection.execute(`
      ALTER TABLE purchase_orders 
      ADD COLUMN status ENUM('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') 
      NOT NULL DEFAULT 'DRAFT' 
      AFTER notes
    `)

    console.log('✅ Status column added successfully')

    // Update existing orders
    await connection.execute(`
      UPDATE purchase_orders 
      SET status = CASE 
        WHEN expectedDeliveryDate < CURDATE() THEN 'COMPLETED'
        ELSE 'PENDING_REVIEW'
      END
      WHERE status = 'DRAFT'
    `)

    console.log('✅ Updated existing orders with appropriate status')

    // Verify
    const [verify] = await connection.execute(
      'SELECT COUNT(*) as count, status FROM purchase_orders GROUP BY status'
    )
    console.log('\n📊 Status distribution:')
    verify.forEach((row) => {
      console.log(`   ${row.status}: ${row.count}`)
    })

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Status column already exists. Migration may have already been run.')
    } else {
      throw error
    }
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Database connection closed')
    }
  }
}

migrateStatus().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
