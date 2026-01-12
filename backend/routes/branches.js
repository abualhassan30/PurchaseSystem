import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Debug: Log when router is created
console.log('📦 Branches router created')

// Get all branches
router.get('/', authenticateToken, async (req, res) => {
  console.log('📥 GET /api/branches - Request received')
  try {
    const [branches] = await db.execute(
      'SELECT id, nameAr, nameEn, code, city, isActive FROM branches ORDER BY nameEn'
    )
    res.json(branches)
  } catch (error) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        message: 'Branches table does not exist. Please create the branches table in the database.' 
      })
    }
    console.error('Get branches error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    })
  }
})

// Create branch
router.post('/', authenticateToken, async (req, res) => {
  console.log('📥 POST /api/branches - Request received', req.body)
  try {
    const { nameAr, nameEn, code, city, isActive } = req.body

    if (!nameAr || !nameEn) {
      return res.status(400).json({ message: 'Arabic and English names are required' })
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Branch code is required' })
    }

    const [result] = await db.execute(
      'INSERT INTO branches (nameAr, nameEn, code, city, isActive) VALUES (?, ?, ?, ?, ?)',
      [nameAr.trim(), nameEn.trim(), code.trim().toUpperCase(), city?.trim() || null, isActive !== undefined ? isActive : true]
    )

    res.status(201).json({
      id: result.insertId,
      nameAr,
      nameEn,
      code: code.trim().toUpperCase(),
      city: city?.trim() || null,
      isActive: isActive !== undefined ? isActive : true,
    })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Branch code already exists. Please use a different code.' })
    }
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        message: 'Branches table does not exist. Please create the branches table in the database.' 
      })
    }
    console.error('Create branch error:', error)
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

// Update branch
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { nameAr, nameEn, code, city, isActive } = req.body

    if (!nameAr || !nameEn) {
      return res.status(400).json({ message: 'Arabic and English names are required' })
    }

    if (!code || !code.trim()) {
      return res.status(400).json({ message: 'Branch code is required' })
    }

    await db.execute(
      'UPDATE branches SET nameAr = ?, nameEn = ?, code = ?, city = ?, isActive = ? WHERE id = ?',
      [nameAr.trim(), nameEn.trim(), code.trim().toUpperCase(), city?.trim() || null, isActive !== undefined ? isActive : true, id]
    )

    res.json({ message: 'Branch updated successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Branch code already exists. Please use a different code.' })
    }
    console.error('Update branch error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    })
  }
})

// Delete branch
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM branches WHERE id = ?', [id])
    res.json({ message: 'Branch deleted successfully' })
  } catch (error) {
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({ message: 'Cannot delete branch. It is being used in purchase orders.' })
    }
    console.error('Delete branch error:', error)
    res.status(500).json({ 
      message: error.message || 'Server error',
      details: process.env.NODE_ENV === 'development' ? error.sqlMessage : undefined
    })
  }
})

export default router
