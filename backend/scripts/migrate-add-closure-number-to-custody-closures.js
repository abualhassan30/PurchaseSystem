import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import mysql from 'mysql2/promise'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function runMigration() {
  let connection

  try {
    // Read database config from environment or use defaults
    const config = {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'purchasesystem',
      multipleStatements: true,
    }

    console.log('Connecting to database...')
    connection = await mysql.createConnection(config)
    console.log('Connected successfully!')

    // Read SQL file
    const sqlPath = path.join(
      __dirname,
      '../database/migrations/add_closure_number_to_custody_closures.sql'
    )
    const sql = fs.readFileSync(sqlPath, 'utf8')

    console.log('Running migration...')
    await connection.query(sql)
    console.log('Migration completed successfully!')

    // Verify the column was added
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'custody_closures' 
      AND COLUMN_NAME = 'closureNumber'
    `, [config.database])

    if (columns.length > 0) {
      console.log('✅ Verification: closureNumber column exists')
    } else {
      console.log('⚠️  Warning: closureNumber column not found after migration')
    }
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Database connection closed')
    }
  }
}

runMigration()
