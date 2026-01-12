import db from '../database/db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function migrateInventoryCounts() {
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../database/migrations/add_inventory_counts.sql'),
      'utf8'
    )

    // Split by semicolon and execute each statement
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)

    for (const statement of statements) {
      if (statement) {
        await db.execute(statement)
        console.log('Executed:', statement.substring(0, 50) + '...')
      }
    }

    console.log('✅ Inventory counts migration completed successfully')
    process.exit(0)
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

migrateInventoryCounts()
