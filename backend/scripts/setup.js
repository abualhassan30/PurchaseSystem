import bcrypt from 'bcryptjs'
import db from '../database/db.js'
import dotenv from 'dotenv'

dotenv.config()

async function setup() {
  try {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      ['admin@example.com']
    )

    if (existing.length === 0) {
      await db.execute(
        'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
        ['Admin', 'User', 'admin@example.com', hashedPassword, 'admin']
      )
      console.log('✅ Default admin user created:')
      console.log('   Email: admin@example.com')
      console.log('   Password: admin123')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    // Create some default units
    const [existingUnits] = await db.execute('SELECT id FROM units LIMIT 1')
    
    if (existingUnits.length === 0) {
      await db.execute(
        'INSERT INTO units (name, baseUnitId, conversionFactor) VALUES (?, ?, ?)',
        ['Piece', null, 1]
      )
      console.log('✅ Default units created')
    }

    console.log('✅ Setup completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setup()
