import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config()

async function migrateAddBranchToCustodyClosures() {
  let connection
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'purchasesystem',
    })
    
    console.log('✅ Connected to database')
    console.log('📋 Adding branchId column to custody_closures table...\n')

    const migrationPath = join(__dirname, '../database/migrations/add_branch_to_custody_closures.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    await connection.query(migrationSQL)

    console.log('✅ Branch column added successfully to custody_closures table')
    console.log('\n✅ Migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Column may already exist. Migration may have already been run.')
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

migrateAddBranchToCustodyClosures().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
