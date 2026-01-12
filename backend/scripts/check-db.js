import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function checkDatabase() {
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
    
    // Check if tables exist
    const [tables] = await connection.query('SHOW TABLES')
    console.log(`\n📊 Tables found: ${tables.length}`)
    
    if (tables.length === 0) {
      console.log('❌ No tables found! Database needs to be initialized.')
      console.log('   Run: npm run init-db')
    } else {
      tables.forEach((table, index) => {
        const tableName = Object.values(table)[0]
        console.log(`   ${index + 1}. ${tableName}`)
      })
    }

    await connection.end()
    process.exit(tables.length === 0 ? 1 : 0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    if (connection) await connection.end()
    process.exit(1)
  }
}

checkDatabase()
