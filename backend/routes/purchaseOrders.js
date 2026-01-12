import express from 'express'
import db from '../database/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Generate order number
function generateOrderNumber() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `PO-${year}${month}${day}-${random}`
}

// Get all purchase orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [orders] = await db.execute(
      `SELECT 
        po.id,
        po.orderNumber,
        po.orderDate,
        po.expectedDeliveryDate,
        po.total,
        po.branchId,
        po.status,
        po.notes,
        b.nameAr as branchNameAr,
        b.nameEn as branchNameEn,
        u.firstName,
        u.lastName,
        CONCAT(u.firstName, ' ', u.lastName) as purchasingOfficerName
      FROM purchase_orders po
      JOIN users u ON po.purchasingOfficerId = u.id
      LEFT JOIN branches b ON po.branchId = b.id
      ORDER BY po.createdAt DESC`
    )
    res.json(orders)
  } catch (error) {
    console.error('Get purchase orders error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get single purchase order with items
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const [orders] = await db.execute(
      `SELECT 
        po.id,
        po.orderNumber,
        po.orderDate,
        po.expectedDeliveryDate,
        po.total,
        po.status,
        po.notes,
        po.branchId,
        b.nameAr as branchNameAr,
        b.nameEn as branchNameEn,
        u.firstName,
        u.lastName,
        CONCAT(u.firstName, ' ', u.lastName) as purchasingOfficerName
      FROM purchase_orders po
      JOIN users u ON po.purchasingOfficerId = u.id
      LEFT JOIN branches b ON po.branchId = b.id
      WHERE po.id = ?`,
      [id]
    )

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' })
    }

    const [items] = await db.execute(
      `SELECT 
        poi.id,
        poi.itemId,
        i.nameAr as itemNameAr,
        i.nameEn as itemNameEn,
        i.defaultUnitId,
        poi.unitId,
        u.nameAr as unitNameAr,
        u.nameEn as unitNameEn,
        u_avail.nameAr as availableUnitNameAr,
        u_avail.nameEn as availableUnitNameEn,
        poi.quantity,
        poi.unitPrice,
        poi.tax,
        poi.lineTotal
      FROM purchase_order_items poi
      JOIN items i ON poi.itemId = i.id
      JOIN units u ON poi.unitId = u.id
      LEFT JOIN units u_avail ON i.defaultUnitId = u_avail.id
      WHERE poi.purchaseOrderId = ?
      ORDER BY poi.id`,
      [id]
    )

    res.json({ ...orders[0], items })
  } catch (error) {
    console.error('Get purchase order error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create purchase order
router.post(
  '/',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const {
        orderDate,
        expectedDeliveryDate,
        items,
        purchasingOfficerId,
      } = req.body

      if (!orderDate || !expectedDeliveryDate || !items || items.length === 0) {
        return res
          .status(400)
          .json({ message: 'Order date, delivery date, and items required' })
      }
      
      // Validate items structure
      const validItems = items.filter(
        (item) => 
          item.itemId && 
          item.itemId > 0 && 
          item.unitId && 
          item.unitId > 0 &&
          item.quantity &&
          parseFloat(item.quantity) > 0 &&
          item.unitPrice &&
          parseFloat(item.unitPrice) > 0
      )
      
      if (validItems.length === 0) {
        return res
          .status(400)
          .json({ message: 'At least one valid item with item, unit, quantity > 0, and price > 0 is required' })
      }
      
      if (validItems.length !== items.length) {
        return res
          .status(400)
          .json({ message: 'Some items are incomplete. Please ensure all items have item, unit, quantity > 0, and price > 0.' })
      }
      
      // Use only valid items
      const itemsToProcess = validItems

      const orderNumber = generateOrderNumber()
      const total = validItems.reduce(
        (sum, item) => {
          const qty = parseFloat(item.quantity) || 0
          const price = parseFloat(item.unitPrice) || 0
          const tax = parseFloat(item.tax) || 0
          return sum + (qty * price) + tax
        },
        0
      )

      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        const [orderResult] = await connection.execute(
          'INSERT INTO purchase_orders (orderNumber, orderDate, expectedDeliveryDate, purchasingOfficerId, branchId, total, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            orderNumber,
            orderDate,
            expectedDeliveryDate,
            purchasingOfficerId || req.user.id,
            req.body.branchId || null,
            total,
            req.body.notes || null,
            req.body.status || 'draft',
          ]
        )

        const orderId = orderResult.insertId

        for (const item of itemsToProcess) {
          const quantity = parseFloat(item.quantity) || 0
          const unitPrice = parseFloat(item.unitPrice) || 0
          const tax = parseFloat(item.tax) || 0
          const lineTotal = quantity * unitPrice + tax
          
          await connection.execute(
            'INSERT INTO purchase_order_items (purchaseOrderId, itemId, unitId, quantity, unitPrice, tax, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
              orderId,
              item.itemId,
              item.unitId,
              quantity,
              unitPrice,
              tax,
              lineTotal,
            ]
          )
        }

        await connection.commit()
        connection.release()

        res.status(201).json({
          id: orderId,
          orderNumber,
          message: 'Purchase order created successfully',
        })
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error('Create purchase order error:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        body: req.body,
      })
      res.status(500).json({ 
        message: error.message || 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

// Update purchase order
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params
      const {
        orderDate,
        expectedDeliveryDate,
        items,
        branchId,
        notes,
        status,
      } = req.body

      // Check if order exists
      const [existingOrders] = await db.execute(
        'SELECT id, status FROM purchase_orders WHERE id = ?',
        [id]
      )

      if (existingOrders.length === 0) {
        return res.status(404).json({ message: 'Order not found' })
      }

      // Validate items if provided
      let itemsToProcess = []
      let total = existingOrders[0].total

      if (items && Array.isArray(items)) {
        const validItems = items.filter(
          (item) => 
            item.itemId && 
            item.itemId > 0 && 
            item.unitId && 
            item.unitId > 0 &&
            item.quantity &&
            parseFloat(item.quantity) > 0 &&
            item.unitPrice &&
            parseFloat(item.unitPrice) > 0
        )
        
        if (validItems.length === 0) {
          return res
            .status(400)
            .json({ message: 'At least one valid item is required' })
        }
        
        itemsToProcess = validItems
        total = validItems.reduce(
          (sum, item) => {
            const qty = parseFloat(item.quantity) || 0
            const price = parseFloat(item.unitPrice) || 0
            const tax = parseFloat(item.tax) || 0
            return sum + (qty * price) + tax
          },
          0
        )
      }

      const connection = await db.getConnection()
      await connection.beginTransaction()

      try {
        // Update order
        const updateFields = []
        const updateValues = []

        if (orderDate) {
          updateFields.push('orderDate = ?')
          updateValues.push(orderDate)
        }
        if (expectedDeliveryDate) {
          updateFields.push('expectedDeliveryDate = ?')
          updateValues.push(expectedDeliveryDate)
        }
        if (branchId !== undefined) {
          updateFields.push('branchId = ?')
          updateValues.push(branchId || null)
        }
        if (notes !== undefined) {
          updateFields.push('notes = ?')
          updateValues.push(notes || null)
        }
        if (status) {
          updateFields.push('status = ?')
          updateValues.push(status)
        }
        if (itemsToProcess.length > 0) {
          updateFields.push('total = ?')
          updateValues.push(total)
        }

        if (updateFields.length > 0) {
          updateValues.push(id)
          await connection.execute(
            `UPDATE purchase_orders SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
          )
        }

        // Update items if provided
        if (itemsToProcess.length > 0) {
          // Delete existing items
          await connection.execute(
            'DELETE FROM purchase_order_items WHERE purchaseOrderId = ?',
            [id]
          )

          // Insert new items
          for (const item of itemsToProcess) {
            const quantity = parseFloat(item.quantity) || 0
            const unitPrice = parseFloat(item.unitPrice) || 0
            const tax = parseFloat(item.tax) || 0
            const lineTotal = quantity * unitPrice + tax
            
            await connection.execute(
              'INSERT INTO purchase_order_items (purchaseOrderId, itemId, unitId, quantity, unitPrice, tax, lineTotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [
                id,
                item.itemId,
                item.unitId,
                quantity,
                unitPrice,
                tax,
                lineTotal,
              ]
            )
          }
        }

        await connection.commit()
        connection.release()

        res.json({
          id: parseInt(id),
          message: 'Purchase order updated successfully',
        })
      } catch (error) {
        await connection.rollback()
        connection.release()
        throw error
      }
    } catch (error) {
      console.error('Update purchase order error:', error)
      res.status(500).json({ 
        message: error.message || 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

// Delete purchase order
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params

      // Check if order exists
      const [orders] = await db.execute(
        'SELECT id FROM purchase_orders WHERE id = ?',
        [id]
      )

      if (orders.length === 0) {
        return res.status(404).json({ message: 'Order not found' })
      }

      // Delete order (items will be deleted automatically due to CASCADE)
      await db.execute('DELETE FROM purchase_orders WHERE id = ?', [id])

      res.json({ message: 'Purchase order deleted successfully' })
    } catch (error) {
      console.error('Delete purchase order error:', error)
      res.status(500).json({ 
        message: error.message || 'Server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    }
  }
)

// Update order status only
router.patch(
  '/:id/status',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { status } = req.body

      const validStatuses = ['DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED']
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ 
          message: `Status must be one of: ${validStatuses.join(', ')}` 
        })
      }

      const [result] = await db.execute(
        'UPDATE purchase_orders SET status = ? WHERE id = ?',
        [status, id]
      )

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Order not found' })
      }

      res.json({ message: 'Order status updated successfully', status })
    } catch (error) {
      console.error('Update order status error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

export default router
