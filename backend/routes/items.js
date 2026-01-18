import express from 'express'
import db from '../database/db.js'
import { authenticateToken } from '../middleware/auth.js'
import multer from 'multer'
import XLSX from 'xlsx'

const router = express.Router()

// Configure multer for Excel file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/vnd.ms-excel.sheet.macroEnabled.12', // .xlsm
    ]
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'))
    }
  }
})

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

// Download Excel template for bulk upload
router.get('/template', authenticateToken, async (req, res) => {
  try {
    // Create template with headers and example row
    const templateData = [
      {
        'Item Code': 'ITEM001',
        'Item Name': 'Sample Item',
        'Unit': 'Piece',
        'Price': '10.00',
        'Category': 'Electronics'
      },
      {
        'Item Code': 'ITEM002',
        'Item Name': 'Another Item',
        'Unit': 'Box',
        'Price': '25.50',
        'Category': 'Office Supplies'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Items')

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Item Code
      { wch: 30 }, // Item Name
      { wch: 15 }, // Unit
      { wch: 12 }, // Price
      { wch: 20 }  // Category
    ]

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename=items_template.xlsx')
    res.send(buffer)
  } catch (error) {
    console.error('Template download error:', error)
    res.status(500).json({ message: 'Failed to generate template' })
  }
})

// Bulk upload items from Excel
router.post('/bulk-upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' })
    }

    // Check if multilingual columns exist
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'items' AND COLUMN_NAME = 'nameAr'
    `)
    const isMultilingual = columns.length > 0

    // Parse Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

    if (data.length < 2) {
      return res.status(400).json({ message: 'Excel file is empty or has no data rows' })
    }

    // Get headers (first row)
    const headers = data[0].map((h) => String(h || '').trim())
    
    // Validate headers
    const requiredHeaders = ['Item Code', 'Item Name', 'Unit', 'Price', 'Category']
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      return res.status(400).json({ 
        message: `Missing required columns: ${missingHeaders.join(', ')}` 
      })
    }

    // Get column indices
    const codeIndex = headers.indexOf('Item Code')
    const nameIndex = headers.indexOf('Item Name')
    const unitIndex = headers.indexOf('Unit')
    const priceIndex = headers.indexOf('Price')
    const categoryIndex = headers.indexOf('Category')

    // Load existing data for validation
    const [existingItems] = await db.execute('SELECT code FROM items')
    const existingCodes = new Set(existingItems.map((item) => (item.code || '').toLowerCase()))

    const [units] = await db.execute(
      isMultilingual 
        ? 'SELECT id, nameAr, nameEn FROM units'
        : 'SELECT id, name FROM units'
    )
    const unitMap = new Map()
    units.forEach((unit) => {
      const unitName = isMultilingual 
        ? (unit.nameEn || unit.nameAr || '').toLowerCase()
        : (unit.name || '').toLowerCase()
      unitMap.set(unitName, unit.id)
    })

    const [categories] = await db.execute(
      'SELECT id, nameAr, nameEn FROM categories'
    )
    const categoryMap = new Map()
    categories.forEach((cat: any) => {
      const catName = (cat.nameEn || cat.nameAr || '').toLowerCase()
      categoryMap.set(catName, cat.id)
    })

    const results = {
      successful: [],
      failed: []
    }

    // Process each row (skip header row)
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      const rowNumber = i + 1

      // Skip empty rows
      if (!row || row.every((cell) => !cell || String(cell).trim() === '')) {
        continue
      }

      const code = String(row[codeIndex] || '').trim()
      const itemName = String(row[nameIndex] || '').trim()
      const unitName = String(row[unitIndex] || '').trim()
      const priceStr = String(row[priceIndex] || '').trim()
      const categoryName = String(row[categoryIndex] || '').trim()

      const errors: string[] = []

      // Validate Item Code
      if (!code) {
        errors.push('Item Code is required')
      } else if (existingCodes.has(code.toLowerCase())) {
        errors.push('Item Code already exists')
      }

      // Validate Item Name
      if (!itemName) {
        errors.push('Item Name is required')
      }

      // Validate Unit
      let unitId = null
      if (!unitName) {
        errors.push('Unit is required')
      } else {
        const unitKey = unitName.toLowerCase()
        unitId = unitMap.get(unitKey)
        if (!unitId) {
          errors.push(`Unit "${unitName}" not found`)
        }
      }

      // Validate Price
      let price = 0
      if (!priceStr) {
        errors.push('Price is required')
      } else {
        const parsedPrice = parseFloat(priceStr)
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          errors.push('Price must be a valid positive number')
        } else {
          price = parsedPrice
        }
      }

      // Validate/Create Category
      let categoryId = null
      if (categoryName) {
        const catKey = categoryName.toLowerCase()
        categoryId = categoryMap.get(catKey)
        
        // If category doesn't exist, create it
        if (!categoryId) {
          try {
            const [result] = await db.execute(
              'INSERT INTO categories (nameAr, nameEn) VALUES (?, ?)',
              [categoryName, categoryName]
            )
            categoryId = result.insertId
            categoryMap.set(catKey, categoryId)
            // Add to categories array for future lookups
            categories.push({ id: categoryId, nameAr: categoryName, nameEn: categoryName })
          } catch (error) {
            errors.push(`Failed to create category "${categoryName}": ${error.message}`)
          }
        }
      }

      // If there are errors, add to failed list
      if (errors.length > 0) {
        results.failed.push({
          row: rowNumber,
          code: code || 'N/A',
          name: itemName || 'N/A',
          errors: errors
        })
        continue
      }

      // Try to insert the item
      try {
        if (isMultilingual) {
          // For multilingual: use the same name for both Arabic and English
          // Users can edit later if they need different names
          await db.execute(
            'INSERT INTO items (code, nameAr, nameEn, defaultUnitId, price, categoryId) VALUES (?, ?, ?, ?, ?, ?)',
            [code, itemName, itemName, unitId, price, categoryId]
          )
        } else {
          await db.execute(
            'INSERT INTO items (code, name, defaultUnitId, price, category) VALUES (?, ?, ?, ?, ?)',
            [code, itemName, unitId, price, categoryName || null]
          )
        }

        existingCodes.add(code.toLowerCase())
        results.successful.push({
          row: rowNumber,
          code,
          name: itemName
        })
      } catch (error: any) {
        if (error.code === 'ER_DUP_ENTRY') {
          results.failed.push({
            row: rowNumber,
            code: code || 'N/A',
            name: itemName || 'N/A',
            errors: ['Item Code already exists']
          })
        } else {
          results.failed.push({
            row: rowNumber,
            code: code || 'N/A',
            name: itemName || 'N/A',
            errors: [error.message || 'Database error']
          })
        }
      }
    }

    res.json({
      message: `Import completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      results
    })
  } catch (error) {
    console.error('Bulk upload error:', error)
    res.status(500).json({ 
      message: 'Failed to process Excel file',
      error: error.message 
    })
  }
})

export default router
