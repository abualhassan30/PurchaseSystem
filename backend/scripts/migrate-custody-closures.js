// Migration script to add custody closures tables
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

async function migrateCustodyClosures() {
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
    console.log('📋 Creating custody closures tables...\n')

    // Read and execute migration SQL
    const migrationPath = join(__dirname, '../database/migrations/add_custody_closures.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')

    await connection.query(migrationSQL)

    console.log('✅ Custody closures tables created successfully')

    // Verify tables exist
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME IN ('custody_closures', 'custody_closure_invoices', 'custody_closure_attachments')
    `, [process.env.DB_NAME || 'purchasesystem'])

    console.log('\n📊 Created tables:')
    tables.forEach(table => {
      console.log(`   ✅ ${table.TABLE_NAME}`)
    })

    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log('⚠️  Tables may already exist. Migration may have already been run.')
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

migrateCustodyClosures().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
