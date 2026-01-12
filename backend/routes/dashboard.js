import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'

const router = express.Router()

// Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    console.log('=== DASHBOARD STATS REQUEST ===')
    console.log('Requested by user:', req.user?.email || req.user?.id)
    console.log('Database pool:', db ? 'Connected' : 'NOT CONNECTED')
    
    // Get counts for different entities
    console.log('Fetching counts...')
    
    // Get counts for different entities - wrap each in try-catch to identify failures
    let purchaseOrdersCount, itemsCount, unitsCount, usersCount, branchesCount, inventoryCountsCount, categoriesCount
    
    try {
      [purchaseOrdersCount] = await db.execute('SELECT COUNT(*) as count FROM purchase_orders')
      console.log('Purchase Orders query result:', purchaseOrdersCount)
    } catch (error) {
      console.error('Error fetching purchase orders count:', error.message)
      throw error
    }
    
    try {
      [itemsCount] = await db.execute('SELECT COUNT(*) as count FROM items')
      console.log('Items query result:', itemsCount)
    } catch (error) {
      console.error('Error fetching items count:', error.message)
      throw error
    }
    
    try {
      [unitsCount] = await db.execute('SELECT COUNT(*) as count FROM units')
      console.log('Units query result:', unitsCount)
    } catch (error) {
      console.error('Error fetching units count:', error.message)
      throw error
    }
    
    try {
      [usersCount] = await db.execute('SELECT COUNT(*) as count FROM users')
      console.log('Users query result:', usersCount)
    } catch (error) {
      console.error('Error fetching users count:', error.message)
      throw error
    }
    
    try {
      [branchesCount] = await db.execute('SELECT COUNT(*) as count FROM branches WHERE isActive = 1')
      console.log('Branches query result:', branchesCount)
    } catch (error) {
      console.error('Error fetching branches count:', error.message)
      throw error
    }
    
    try {
      [inventoryCountsCount] = await db.execute('SELECT COUNT(*) as count FROM inventory_counts')
      console.log('Inventory Counts query result:', inventoryCountsCount)
    } catch (error) {
      console.error('Error fetching inventory counts count:', error.message)
      throw error
    }
    
    try {
      [categoriesCount] = await db.execute('SELECT COUNT(*) as count FROM categories')
      console.log('Categories query result:', categoriesCount)
    } catch (error) {
      console.error('Error fetching categories count:', error.message)
      throw error
    }
    
    // Log raw counts with detailed inspection
    console.log('\n--- RAW COUNTS FROM DATABASE ---')
    console.log('purchaseOrdersCount[0]:', JSON.stringify(purchaseOrdersCount[0], null, 2))
    console.log('itemsCount[0]:', JSON.stringify(itemsCount[0], null, 2))
    console.log('unitsCount[0]:', JSON.stringify(unitsCount[0], null, 2))
    console.log('usersCount[0]:', JSON.stringify(usersCount[0], null, 2))
    console.log('branchesCount[0]:', JSON.stringify(branchesCount[0], null, 2))
    console.log('inventoryCountsCount[0]:', JSON.stringify(inventoryCountsCount[0], null, 2))
    console.log('categoriesCount[0]:', JSON.stringify(categoriesCount[0], null, 2))
    
    // Parse counts (MySQL returns BigInt for COUNT, need to convert)
    // Handle both BigInt and regular numbers
    const poCount = purchaseOrdersCount[0]?.count != null ? Number(purchaseOrdersCount[0].count) : 0
    const itemsCountNum = itemsCount[0]?.count != null ? Number(itemsCount[0].count) : 0
    const unitsCountNum = unitsCount[0]?.count != null ? Number(unitsCount[0].count) : 0
    const usersCountNum = usersCount[0]?.count != null ? Number(usersCount[0].count) : 0
    const branchesCountNum = branchesCount[0]?.count != null ? Number(branchesCount[0].count) : 0
    const inventoryCountsCountNum = inventoryCountsCount[0]?.count != null ? Number(inventoryCountsCount[0].count) : 0
    const categoriesCountNum = categoriesCount[0]?.count != null ? Number(categoriesCount[0].count) : 0
    
    console.log('\n--- PARSED COUNTS ---')
    console.log('Purchase Orders:', poCount, `(type: ${typeof poCount}, original: ${purchaseOrdersCount[0]?.count})`)
    console.log('Items:', itemsCountNum, `(type: ${typeof itemsCountNum}, original: ${itemsCount[0]?.count})`)
    console.log('Units:', unitsCountNum, `(type: ${typeof unitsCountNum}, original: ${unitsCount[0]?.count})`)
    console.log('Users:', usersCountNum, `(type: ${typeof usersCountNum}, original: ${usersCount[0]?.count})`)
    console.log('Branches:', branchesCountNum, `(type: ${typeof branchesCountNum}, original: ${branchesCount[0]?.count})`)
    console.log('Inventory Counts:', inventoryCountsCountNum, `(type: ${typeof inventoryCountsCountNum}, original: ${inventoryCountsCount[0]?.count})`)
    console.log('Categories:', categoriesCountNum, `(type: ${typeof categoriesCountNum}, original: ${categoriesCount[0]?.count})`)

    // Get total purchase order value
    console.log('Fetching total purchase order value...')
    let totalValue
    try {
      [totalValue] = await db.execute(`
        SELECT COALESCE(SUM(total), 0) as totalValue 
        FROM purchase_orders
      `)
      console.log('Total value raw:', totalValue[0])
    } catch (error) {
      console.error('Error fetching total purchase order value:', error.message)
      console.error('SQL:', error.sql)
      throw error
    }

    // Get purchase orders by status
    console.log('Fetching orders by status...')
    let ordersByStatus = []
    try {
      [ordersByStatus] = await db.execute(`
        SELECT 
          status,
          COUNT(*) as count
        FROM purchase_orders
        GROUP BY status
      `)
      console.log('Orders by status raw:', ordersByStatus)
    } catch (error) {
      console.warn('Status column may not exist in purchase_orders table:', error.message)
      console.warn('Returning empty status breakdown. Run migration to add status column.')
      ordersByStatus = []
    }

    // Get recent purchase orders (last 5)
    let recentOrders = []
    try {
      [recentOrders] = await db.execute(`
        SELECT 
          po.id,
          po.orderNumber as poNumber,
          po.orderDate,
          po.total as totalAmount,
          COALESCE(po.status, 'DRAFT') as status,
          b.nameAr as branchNameAr,
          b.nameEn as branchNameEn,
          CONCAT(u.firstName, ' ', u.lastName) as createdByName
        FROM purchase_orders po
        LEFT JOIN branches b ON po.branchId = b.id
        LEFT JOIN users u ON po.purchasingOfficerId = u.id
        ORDER BY po.createdAt DESC
        LIMIT 5
      `)
    } catch (error) {
      console.warn('Error fetching recent orders (status column may not exist):', error.message)
      // Try without status column
      try {
        [recentOrders] = await db.execute(`
          SELECT 
            po.id,
            po.orderNumber as poNumber,
            po.orderDate,
            po.total as totalAmount,
            'DRAFT' as status,
            b.nameAr as branchNameAr,
            b.nameEn as branchNameEn,
            CONCAT(u.firstName, ' ', u.lastName) as createdByName
          FROM purchase_orders po
          LEFT JOIN branches b ON po.branchId = b.id
          LEFT JOIN users u ON po.purchasingOfficerId = u.id
          ORDER BY po.createdAt DESC
          LIMIT 5
        `)
      } catch (error2) {
        console.error('Error fetching recent orders:', error2.message)
        recentOrders = []
      }
    }

    // Get inventory counts by status
    console.log('Fetching inventory by status...')
    const [inventoryByStatus] = await db.execute(`
      SELECT 
        status,
        COUNT(*) as count
      FROM inventory_counts
      GROUP BY status
    `)
    console.log('Inventory by status raw:', inventoryByStatus)

    // Get total inventory value
    console.log('Fetching total inventory value...')
    const [totalInventoryValue] = await db.execute(`
      SELECT COALESCE(SUM(ici.total), 0) as totalValue
      FROM inventory_count_items ici
      JOIN inventory_counts ic ON ici.inventoryCountId = ic.id
    `)
    console.log('Total inventory value raw:', totalInventoryValue[0])

    // Get monthly purchase orders (last 6 months)
    const [monthlyOrders] = await db.execute(`
      SELECT 
        DATE_FORMAT(orderDate, '%Y-%m') as month,
        COUNT(*) as count,
        COALESCE(SUM(total), 0) as totalAmount
      FROM purchase_orders
      WHERE orderDate >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(orderDate, '%Y-%m')
      ORDER BY month ASC
    `)

    const response = {
      counts: {
        purchaseOrders: poCount,
        items: itemsCountNum,
        units: unitsCountNum,
        users: usersCountNum,
        branches: branchesCountNum,
        inventoryCounts: inventoryCountsCountNum,
        categories: categoriesCountNum,
      },
      totals: {
        purchaseOrderValue: Number(totalValue[0]?.totalValue || 0),
        inventoryValue: Number(totalInventoryValue[0]?.totalValue || 0),
      },
      ordersByStatus: ordersByStatus.reduce((acc, row) => {
        const count = Number(row.count || 0)
        acc[row.status] = count
        console.log(`Status ${row.status}: ${count}`)
        return acc
      }, {}),
      inventoryByStatus: inventoryByStatus.reduce((acc, row) => {
        const count = Number(row.count || 0)
        acc[row.status] = count
        console.log(`Inventory status ${row.status}: ${count}`)
        return acc
      }, {}),
      recentOrders: recentOrders,
      monthlyOrders: monthlyOrders,
    }
    
    console.log('\n=== FINAL RESPONSE ===')
    console.log('Response object:', JSON.stringify(response, null, 2))
    console.log('Response counts object:', JSON.stringify(response.counts, null, 2))
    console.log('Response totals object:', JSON.stringify(response.totals, null, 2))
    console.log('Response ordersByStatus:', JSON.stringify(response.ordersByStatus, null, 2))
    console.log('Response inventoryByStatus:', JSON.stringify(response.inventoryByStatus, null, 2))
    console.log('Recent orders count:', response.recentOrders?.length || 0)
    console.log('=== END RESPONSE ===\n')
    
    res.json(response)
  } catch (error) {
    console.error('\n❌ DASHBOARD STATS ERROR ❌')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    if (error.code) {
      console.error('Error code:', error.code)
    }
    if (error.sql) {
      console.error('SQL query:', error.sql)
    }
    if (error.sqlMessage) {
      console.error('SQL error message:', error.sqlMessage)
    }
    console.error('================================\n')
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        code: error.code,
        sqlMessage: error.sqlMessage
      } : undefined
    })
  }
})

export default router
