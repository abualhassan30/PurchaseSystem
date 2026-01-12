import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get all units
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'units' AND COLUMN_NAME = 'nameAr'
    `)
    
    if (columns.length > 0) {
      // Use multilingual columns
      const [units] = await db.execute(
        'SELECT id, nameAr, nameEn, baseUnitId, conversionFactor FROM units ORDER BY nameEn'
      )
      res.json(units)
    } else {
      // Fallback to old schema
      const [units] = await db.execute(
        'SELECT id, name, baseUnitId, conversionFactor FROM units ORDER BY name'
      )
      res.json(units)
    }
  } catch (error) {
    console.error('Get units error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create unit
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { nameAr, nameEn, name, baseUnitId, conversionFactor } = req.body

    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'units' AND COLUMN_NAME = 'nameAr'
    `)

    if (columns.length > 0) {
      // Use multilingual schema
      if (!nameAr || !nameEn) {
        return res.status(400).json({ message: 'Arabic and English names required' })
      }

      const [result] = await db.execute(
        'INSERT INTO units (nameAr, nameEn, baseUnitId, conversionFactor) VALUES (?, ?, ?, ?)',
        [nameAr, nameEn, baseUnitId || null, conversionFactor || 1]
      )

      res.status(201).json({
        id: result.insertId,
        nameAr,
        nameEn,
        baseUnitId: baseUnitId || null,
        conversionFactor: conversionFactor || 1,
      })
    } else {
      // Fallback to old schema
      const unitName = nameAr || nameEn || name
      if (!unitName) {
        return res.status(400).json({ message: 'Unit name required' })
      }

      const [result] = await db.execute(
        'INSERT INTO units (name, baseUnitId, conversionFactor) VALUES (?, ?, ?)',
        [unitName, baseUnitId || null, conversionFactor || 1]
      )

      res.status(201).json({
        id: result.insertId,
        name: unitName,
        baseUnitId: baseUnitId || null,
        conversionFactor: conversionFactor || 1,
      })
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Unit name already exists' })
    }
    console.error('Create unit error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update unit
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { nameAr, nameEn, name, baseUnitId, conversionFactor } = req.body

    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'units' AND COLUMN_NAME = 'nameAr'
    `)

    if (columns.length > 0) {
      // Use multilingual schema
      if (!nameAr || !nameEn) {
        return res.status(400).json({ message: 'Arabic and English names required' })
      }

      await db.execute(
        'UPDATE units SET nameAr = ?, nameEn = ?, baseUnitId = ?, conversionFactor = ? WHERE id = ?',
        [nameAr, nameEn, baseUnitId || null, conversionFactor || 1, id]
      )
    } else {
      // Fallback to old schema
      const unitName = nameAr || nameEn || name
      await db.execute(
        'UPDATE units SET name = ?, baseUnitId = ?, conversionFactor = ? WHERE id = ?',
        [unitName, baseUnitId || null, conversionFactor || 1, id]
      )
    }

    res.json({ message: 'Unit updated successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Unit name already exists' })
    }
    console.error('Update unit error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete unit
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM units WHERE id = ?', [id])
    res.json({ message: 'Unit deleted successfully' })
  } catch (error) {
    console.error('Delete unit error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
