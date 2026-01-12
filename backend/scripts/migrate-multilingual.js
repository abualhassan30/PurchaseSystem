import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function migrateMultilingual() {
  let connection

  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'purchasesystem',
    })

    console.log('Connected to database. Starting migration...')

    // 1. Create categories table
    console.log('Creating categories table...')
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nameAr VARCHAR(255) NOT NULL,
        nameEn VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_names (nameAr, nameEn)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `)
    console.log('✓ Categories table created')

    // 2. Add multilingual fields to units table
    console.log('Migrating units table...')
    
    // Check if nameAr column exists
    const [unitColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'units' AND COLUMN_NAME = 'nameAr'
    `, [process.env.DB_NAME || 'purchasesystem'])

    if (unitColumns.length === 0) {
      // Add new columns
      await connection.execute(`
        ALTER TABLE units 
        ADD COLUMN nameAr VARCHAR(100) NULL AFTER name,
        ADD COLUMN nameEn VARCHAR(100) NULL AFTER nameAr
      `)

      // Migrate existing data: copy name to both nameAr and nameEn
      await connection.execute(`
        UPDATE units 
        SET nameAr = name, nameEn = name 
        WHERE nameAr IS NULL OR nameEn IS NULL
      `)

      // Make columns NOT NULL after migration
      await connection.execute(`
        ALTER TABLE units 
        MODIFY COLUMN nameAr VARCHAR(100) NOT NULL,
        MODIFY COLUMN nameEn VARCHAR(100) NOT NULL
      `)

      // Drop old unique constraint on name and add new ones
      try {
        await connection.execute(`ALTER TABLE units DROP INDEX name`)
      } catch (e) {
        // Index might not exist or have different name
        console.log('Note: Could not drop old name index (may not exist)')
      }

      await connection.execute(`
        ALTER TABLE units 
        ADD UNIQUE KEY unique_nameAr (nameAr),
        ADD UNIQUE KEY unique_nameEn (nameEn)
      `)

      // Optionally drop old name column (comment out if you want to keep it for now)
      // await connection.execute(`ALTER TABLE units DROP COLUMN name`)
      
      console.log('✓ Units table migrated')
    } else {
      console.log('✓ Units table already migrated')
    }

    // 3. Add multilingual fields to items table
    console.log('Migrating items table...')
    
    const [itemColumns] = await connection.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'items' AND COLUMN_NAME = 'nameAr'
    `, [process.env.DB_NAME || 'purchasesystem'])

    if (itemColumns.length === 0) {
      // Add new columns
      await connection.execute(`
        ALTER TABLE items 
        ADD COLUMN nameAr VARCHAR(255) NULL AFTER name,
        ADD COLUMN nameEn VARCHAR(255) NULL AFTER nameAr,
        ADD COLUMN categoryId INT NULL AFTER category
      `)

      // Migrate existing data
      await connection.execute(`
        UPDATE items 
        SET nameAr = name, nameEn = name 
        WHERE nameAr IS NULL OR nameEn IS NULL
      `)

      // Make columns NOT NULL after migration
      await connection.execute(`
        ALTER TABLE items 
        MODIFY COLUMN nameAr VARCHAR(255) NOT NULL,
        MODIFY COLUMN nameEn VARCHAR(255) NOT NULL
      `)

      // Add foreign key for categoryId
      await connection.execute(`
        ALTER TABLE items 
        ADD CONSTRAINT fk_item_category 
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
      `)

      console.log('✓ Items table migrated')
    } else {
      console.log('✓ Items table already migrated')
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\nNext steps:')
    console.log('1. Update backend routes to use nameAr/nameEn')
    console.log('2. Update frontend forms to input both names')
    console.log('3. Update display logic to use current language')

  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
      console.log('\nDatabase connection closed.')
    }
  }
}

migrateMultilingual()
