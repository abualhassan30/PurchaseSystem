import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function initDatabase() {
  let connection

  try {
    console.log('🔄 Connecting to MySQL server...')
    
    // Connect without specifying database first
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '3307'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    })

    console.log('✅ Connected to MySQL server')

    console.log('🔄 Creating database and tables...')
    
    // Create database first
    const dbName = process.env.DB_NAME || 'purchasesystem'
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await connection.query(`USE ${dbName}`)
    console.log(`✅ Database '${dbName}' created/selected`)
    
    // Read schema and execute CREATE TABLE statements
    const schemaPath = path.join(__dirname, '../database/schema.sql')
    const schemaContent = fs.readFileSync(schemaPath, 'utf8')
    
    // Parse and execute CREATE TABLE statements
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'purchasingOfficer', 'viewer') NOT NULL DEFAULT 'viewer',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS units (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        baseUnitId INT NULL,
        conversionFactor DECIMAL(10, 4) NOT NULL DEFAULT 1.0000,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (baseUnitId) REFERENCES units(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        defaultUnitId INT NOT NULL,
        price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        category VARCHAR(100) NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (defaultUnitId) REFERENCES units(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS branches (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nameAr VARCHAR(255) NOT NULL,
        nameEn VARCHAR(255) NOT NULL,
        code VARCHAR(50) NOT NULL UNIQUE,
        city VARCHAR(100) NULL,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS purchase_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        orderNumber VARCHAR(50) NOT NULL UNIQUE,
        orderDate DATE NOT NULL,
        expectedDeliveryDate DATE NOT NULL,
        purchasingOfficerId INT NOT NULL,
        branchId INT NULL,
        total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        notes TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (purchasingOfficerId) REFERENCES users(id) ON DELETE RESTRICT,
        FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      
      `CREATE TABLE IF NOT EXISTS purchase_order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        purchaseOrderId INT NOT NULL,
        itemId INT NOT NULL,
        unitId INT NOT NULL,
        quantity DECIMAL(10, 4) NOT NULL,
        unitPrice DECIMAL(10, 2) NOT NULL,
        tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
        lineTotal DECIMAL(10, 2) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (purchaseOrderId) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE RESTRICT,
        FOREIGN KEY (unitId) REFERENCES units(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ]

    console.log(`🔄 Creating ${tableStatements.length} tables...`)
    
    const tableNames = ['users', 'units', 'items', 'branches', 'purchase_orders', 'purchase_order_items']
    
    for (let i = 0; i < tableStatements.length; i++) {
      try {
        await connection.query(tableStatements[i])
        console.log(`   ✅ Created table: ${tableNames[i]}`)
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️  Table already exists: ${tableNames[i]}`)
        } else {
          console.error(`   ❌ Failed to create table ${tableNames[i]}:`, error.message)
        }
      }
    }

    console.log('✅ Database and tables created successfully!')
    
    // Close connection
    await connection.end()
    
    console.log('✅ Database initialization completed!')
    console.log('📝 Next step: Run "node scripts/setup.js" to create the admin user')
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message)
    console.error('Full error:', error)
    
    if (connection) {
      await connection.end()
    }
    
    process.exit(1)
  }
}

initDatabase()
