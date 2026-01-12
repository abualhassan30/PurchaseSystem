import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get all items
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'nameAr'
    `)
    
    if (columns.length > 0) {
      // Use multilingual columns
      const [items] = await db.execute(`
        SELECT i.id, i.code, i.nameAr, i.nameEn, i.defaultUnitId, i.price, i.categoryId,
               c.nameAr as categoryNameAr, c.nameEn as categoryNameEn
        FROM items i
        LEFT JOIN categories c ON i.categoryId = c.id
        ORDER BY i.nameEn
      `)
      res.json(items)
    } else {
      // Fallback to old schema
      const [items] = await db.execute(
        'SELECT id, code, name, defaultUnitId, price, category FROM items ORDER BY name'
      )
      res.json(items)
    }
  } catch (error) {
    console.error('Get items error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create item
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { code, nameAr, nameEn, name, defaultUnitId, price, categoryId, category } = req.body

    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'nameAr'
    `)

    if (columns.length > 0) {
      // Use multilingual schema
      if (!code || !nameAr || !nameEn || !defaultUnitId) {
        return res
          .status(400)
          .json({ message: 'Code, Arabic name, English name, and default unit required' })
      }

      const [result] = await db.execute(
        'INSERT INTO items (code, nameAr, nameEn, defaultUnitId, price, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
        [code, nameAr, nameEn, defaultUnitId, price || 0, categoryId || null]
      )

      res.status(201).json({
        id: result.insertId,
        code,
        nameAr,
        nameEn,
        defaultUnitId,
        price: price || 0,
        categoryId: categoryId || null,
      })
    } else {
      // Fallback to old schema
      const itemName = nameAr || nameEn || name
      if (!code || !itemName || !defaultUnitId) {
        return res
          .status(400)
          .json({ message: 'Code, name, and default unit required' })
      }

      const [result] = await db.execute(
        'INSERT INTO items (code, name, defaultUnitId, price, category) VALUES (?, ?, ?, ?, ?)',
        [code, itemName, defaultUnitId, price || 0, category || null]
      )

      res.status(201).json({
        id: result.insertId,
        code,
        name: itemName,
        defaultUnitId,
        price: price || 0,
        category: category || null,
      })
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Item code already exists' })
    }
    console.error('Create item error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Update item
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { code, nameAr, nameEn, name, defaultUnitId, price, categoryId, category } = req.body

    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'nameAr'
    `)

    if (columns.length > 0) {
      // Use multilingual schema
      if (!nameAr || !nameEn) {
        return res.status(400).json({ message: 'Arabic and English names required' })
      }

      await db.execute(
        'UPDATE items SET code = ?, nameAr = ?, nameEn = ?, defaultUnitId = ?, price = ?, categoryId = ? WHERE id = ?',
        [code, nameAr, nameEn, defaultUnitId, price, categoryId || null, id]
      )
    } else {
      // Fallback to old schema
      const itemName = nameAr || nameEn || name
      await db.execute(
        'UPDATE items SET code = ?, name = ?, defaultUnitId = ?, price = ?, category = ? WHERE id = ?',
        [code, itemName, defaultUnitId, price, category || null, id]
      )
    }

    res.json({ message: 'Item updated successfully' })
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Item code already exists' })
    }
    console.error('Update item error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    await db.execute('DELETE FROM items WHERE id = ?', [id])
    res.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Delete item error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

export default router
