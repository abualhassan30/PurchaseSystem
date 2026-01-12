import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Debug: Log when router is created
console.log('📦 Categories router created')

// Get all categories
router.get('/', authenticateToken, async (req, res) => {
  console.log('📥 GET /api/categories - Request received')
  try {
    const [categories] = await db.execute(
      'SELECT id, nameAr, nameEn FROM categories ORDER BY nameEn'
    )
    res.json(categories)
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        message: 'Categories table does not exist. Please run the migration: npm run migrate-multilingual' 
      })
    }
    console.error('Get categories error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    })
  }
})

// Create category
router.post('/', authenticateToken, async (req, res) => {
  console.log('📥 POST /api/categories - Request received', req.body)
  try {
    const { nameAr, nameEn } = req.body

    if (!nameAr || !nameEn) {
      return res.status(400).json({ message: 'Arabic and English names required' })
    }

    const [result] = await db.execute(
      'INSERT INTO categories (nameAr, nameEn) VALUES (?, ?)',
      [nameAr, nameEn]
    )

    res.status(201).json({
      id: result.insertId,
      nameAr,
      nameEn,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category already exists' })
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        message: 'Categories table does not exist. Please run the migration: npm run migrate-multilingual' 
      })
    }
    console.error('Create category error:', error)
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      sqlMessage: error.sqlMessage,
    })
    res.status(500).json({ 
      message: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    })
  }
})

// Update category
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { nameAr, nameEn } = req.body

    if (!nameAr || !nameEn) {
      return res.status(400).json({ message: 'Arabic and English names required' })
    }

    await db.execute(
      'UPDATE categories SET nameAr = ?, nameEn = ? WHERE id = ?',
      [nameAr, nameEn, id]
    )

    res.json({ message: 'Category updated successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Category already exists' })
    }
    console.error('Update category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete category
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM categories WHERE id = ?', [id])
    res.json({ message: 'Category deleted successfully' })
  } catch (error) {
    console.error('Delete category error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
