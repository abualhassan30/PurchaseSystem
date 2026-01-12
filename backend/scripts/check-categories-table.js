import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkCategoriesTable() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'purchasesystem',
    })

    console.log('✅ Connected to database:', process.env.DB_NAME || 'purchasesystem')
    console.log('')

    // Check if categories table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories'
    `, [process.env.DB_NAME || 'purchasesystem'])

    if (tables.length === 0) {
      console.log('❌ Categories table does NOT exist!')
      console.log('')
      console.log('📝 To create it, run:')
      console.log('   npm run migrate-multilingual')
      return
    }

    console.log('✅ Categories table exists!')
    console.log('')

    // Check table structure
    const [columns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'categories'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'purchasesystem'])

    console.log('📊 Table structure:')
    columns.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`)
    })
    console.log('')

    // Check if there are any categories
    const [rows] = await connection.execute('SELECT COUNT(*) as count FROM categories')
    console.log(`📦 Total categories: ${rows[0].count}`)

    if (rows[0].count > 0) {
      const [categories] = await connection.execute('SELECT id, nameAr, nameEn FROM categories LIMIT 5')
      console.log('')
      console.log('📋 Sample categories:')
      categories.forEach(cat => {
        console.log(`   - ID: ${cat.id}, Arabic: ${cat.nameAr}, English: ${cat.nameEn}`)
      })
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('   Database access denied. Check your .env file credentials.')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('   Database does not exist. Run: npm run init-db')
    }
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

checkCategoriesTable()
