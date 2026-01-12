import express from 'express'
import db from '../database/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Generate inventory number (IN-1001, IN-1002, etc.)
async function generateInventoryNumber() {
  try {
    // Get the last inventory number
    const [results] = await db.execute(
      'SELECT inventoryNumber FROM inventory_counts ORDER BY id DESC LIMIT 1'
    )
    
    if (results.length === 0) {
      return 'IN-1001'
    }
    
    const lastNumber = results[0].inventoryNumber
    // Extract the numeric part (e.g., "IN-1001" -> 1001)
    const match = lastNumber.match(/IN-(\d+)/)
    
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1
      return `IN-${nextNum}`
    }
    
    // Fallback if format doesn't match
    return `IN-${Date.now()}`
  } catch (error) {
    console.error('Error generating inventory number:', error)
    // Fallback
    return `IN-${Date.now()}`
  }
}

// Get all inventory counts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [inventoryCounts] = await db.execute(`
      SELECT 
        ic.id,
        ic.inventoryNumber,
        ic.inventoryDate,
        ic.branchId,
        b.nameAr as branchNameAr,
        b.nameEn as branchNameEn,
        ic.status,
        ic.notes,
        ic.createdBy,
        CONCAT(u.firstName, ' ', u.lastName) as createdByName,
        ic.createdAt,
        ic.updatedAt
      FROM inventory_counts ic
      LEFT JOIN branches b ON ic.branchId = b.id
      LEFT JOIN users u ON ic.createdBy = u.id
      ORDER BY ic.id DESC
    `)
    
    res.json(inventoryCounts)
  } catch (error) {
    console.error('Get inventory counts error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get single inventory count with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // Get inventory count header
    const [inventoryCounts] = await db.execute(`
      SELECT 
        ic.id,
        ic.inventoryNumber,
        ic.inventoryDate,
        ic.branchId,
        b.nameAr as branchNameAr,
        b.nameEn as branchNameEn,
        ic.status,
        ic.notes,
        ic.createdBy,
        CONCAT(u.firstName, ' ', u.lastName) as createdByName,
        ic.createdAt,
        ic.updatedAt
      FROM inventory_counts ic
      LEFT JOIN branches b ON ic.branchId = b.id
      LEFT JOIN users u ON ic.createdBy = u.id
      WHERE ic.id = ?
    `, [id])
    
    if (inventoryCounts.length === 0) {
      return res.status(404).json({ message: 'Inventory count not found' })
    }
    
    const inventoryCount = inventoryCounts[0]
    
    // Get items
    const [items] = await db.execute(`
      SELECT 
        ici.id,
        ici.itemId,
        i.nameAr as itemNameAr,
        i.nameEn as itemNameEn,
        i.price as itemCost,
        ici.quantity,
        ici.unitId,
        u.nameAr as unitNameAr,
        u.nameEn as unitNameEn,
        ici.cost,
        ici.total
      FROM inventory_count_items ici
      JOIN items i ON ici.itemId = i.id
      JOIN units u ON ici.unitId = u.id
      WHERE ici.inventoryCountId = ?
      ORDER BY ici.id
    `, [id])
    
    res.json({
      ...inventoryCount,
      items: items || []
    })
  } catch (error) {
    console.error('Get inventory count error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create inventory count
router.post(
  '/',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const {
        inventoryDate,
        branchId,
        items,
        notes,
        status
      } = req.body

      if (!inventoryDate || !items || items.length === 0) {
        return res
          .status(400)
          .json({ message: 'Inventory date and items are required' })
      }
      
      // Validate items
      const validItems = items.filter(
        (item) => 
          item.itemId && 
          item.itemId > 0 && 
          item.unitId && 
          item.unitId > 0 &&
          item.quantity &&
          parseFloat(item.quantity) > 0
      )
      
      if (validItems.length === 0) {
        return res
          .status(400)
          .json({ message: 'At least one valid item is required' })
      }

      const inventoryNumber = await generateInventoryNumber()
      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const [result] = await connection.execute(
          'INSERT INTO inventory_counts (inventoryNumber, inventoryDate, branchId, status, notes, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
          [
            inventoryNumber,
            inventoryDate,
            branchId || null,
            status || 'DRAFT',
            notes || null,
            req.user.id
          ]
        )

        const inventoryCountId = result.insertId

        // Insert items
        for (const item of validItems) {
          const quantity = parseFloat(item.quantity) || 0
          const cost = parseFloat(item.cost) || 0
          const total = quantity * cost
          
          await connection.execute(
            'INSERT INTO inventory_count_items (inventoryCountId, itemId, quantity, unitId, cost, total) VALUES (?, ?, ?, ?, ?, ?)',
            [
              inventoryCountId,
              item.itemId,
              quantity,
              item.unitId,
              cost,
              total
            ]
          )
        }

        await connection.commit()
        connection.release()

        res.status(201).json({
          id: inventoryCountId,
          inventoryNumber,
          message: 'Inventory count created successfully',
        })
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error('Create inventory count error:', error)
      res.status(500).json({ 
        message: error.message || 'Server error'
      })
    }
  }
)

// Update inventory count (only if status is DRAFT)
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params
      const {
        inventoryDate,
        branchId,
        items,
        notes,
        status
      } = req.body

      // Check if inventory count exists and is DRAFT
      const [existing] = await db.execute(
        'SELECT status FROM inventory_counts WHERE id = ?',
        [id]
      )

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Inventory count not found' })
      }

      if (existing[0].status !== 'DRAFT') {
        return res.status(400).json({ 
          message: 'Only DRAFT inventory counts can be edited' 
        })
      }

      if (!inventoryDate || !items || items.length === 0) {
        return res
          .status(400)
          .json({ message: 'Inventory date and items are required' })
      }
      
      // Validate items
      const validItems = items.filter(
        (item) => 
          item.itemId && 
          item.itemId > 0 && 
          item.unitId && 
          item.unitId > 0 &&
          item.quantity &&
          parseFloat(item.quantity) > 0
      )
      
      if (validItems.length === 0) {
        return res
          .status(400)
          .json({ message: 'At least one valid item is required' })
      }

      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Update header
        await connection.execute(
          'UPDATE inventory_counts SET inventoryDate = ?, branchId = ?, status = ?, notes = ? WHERE id = ?',
          [
            inventoryDate,
            branchId || null,
            status || 'DRAFT',
            notes || null,
            id
          ]
        )

        // Delete existing items
        await connection.execute(
          'DELETE FROM inventory_count_items WHERE inventoryCountId = ?',
          [id]
        )

        // Insert new items
        for (const item of validItems) {
          const quantity = parseFloat(item.quantity) || 0
          const cost = parseFloat(item.cost) || 0
          const total = quantity * cost
          
          await connection.execute(
            'INSERT INTO inventory_count_items (inventoryCountId, itemId, quantity, unitId, cost, total) VALUES (?, ?, ?, ?, ?, ?)',
            [
              id,
              item.itemId,
              quantity,
              item.unitId,
              cost,
              total
            ]
          )
        }

        await connection.commit()
        connection.release()

        res.json({ message: 'Inventory count updated successfully' })
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error('Update inventory count error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Delete inventory count (only if status is DRAFT)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params

      // Check if inventory count exists and is DRAFT
      const [existing] = await db.execute(
        'SELECT status FROM inventory_counts WHERE id = ?',
        [id]
      )

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Inventory count not found' })
      }

      if (existing[0].status !== 'DRAFT') {
        return res.status(400).json({ 
          message: 'Only DRAFT inventory counts can be deleted' 
        })
      }

      await db.execute('DELETE FROM inventory_counts WHERE id = ?', [id])
      res.json({ message: 'Inventory count deleted successfully' })
    } catch (error) {
      console.error('Delete inventory count error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Update status only
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { status } = req.body

      const validStatuses = ['DRAFT', 'COMPLETED', 'APPROVED']
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: 'Invalid status' })
      }

      await db.execute(
        'UPDATE inventory_counts SET status = ? WHERE id = ?',
        [status, id]
      )

      res.json({ message: 'Status updated successfully' })
    } catch (error) {
      console.error('Update status error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

export default router
