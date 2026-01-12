import express from 'express'
import db from '../database/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const router = express.Router()

// Generate closure number (CC1001, CC1002, etc.)
async function generateClosureNumber() {
  try {
    // Get the last closure number
    const [results] = await db.execute(
      'SELECT closureNumber FROM custody_closures WHERE closureNumber IS NOT NULL ORDER BY id DESC LIMIT 1'
    )
    
    if (results.length === 0) {
      return 'CC1001'
    }
    
    const lastNumber = results[0].closureNumber
    // Extract the numeric part (e.g., "CC1001" -> 1001)
    const match = lastNumber.match(/CC(\d+)/)
    
    if (match) {
      const nextNum = parseInt(match[1], 10) + 1
      return `CC${nextNum}`
    }
    
    // Fallback if format doesn't match
    return `CC${Date.now()}`
  } catch (error) {
    console.error('Error generating closure number:', error)
    // Fallback
    return `CC${Date.now()}`
  }
}

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads/custody-closures')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + '-' + file.originalname)
  }
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept all file types
    cb(null, true)
  }
})

// Get all custody closures
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Check if branchId column exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custody_closures' 
      AND COLUMN_NAME = 'branchId'
    `)
    const hasBranchId = columns.length > 0
    
    // Check if closureNumber column exists
    const [closureNumberColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custody_closures' 
      AND COLUMN_NAME = 'closureNumber'
    `)
    const hasClosureNumber = closureNumberColumns.length > 0
    
    let query
    if (hasBranchId && hasClosureNumber) {
      query = `
        SELECT 
          cc.id,
          cc.closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          cc.branchId,
          b.nameAr as branchNameAr,
          b.nameEn as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        LEFT JOIN branches b ON cc.branchId = b.id
        ORDER BY cc.closureDate DESC, cc.createdAt DESC
      `
    } else if (hasBranchId) {
      query = `
        SELECT 
          cc.id,
          NULL as closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          cc.branchId,
          b.nameAr as branchNameAr,
          b.nameEn as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        LEFT JOIN branches b ON cc.branchId = b.id
        ORDER BY cc.closureDate DESC, cc.createdAt DESC
      `
    } else if (hasClosureNumber) {
      query = `
        SELECT 
          cc.id,
          cc.closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          NULL as branchId,
          NULL as branchNameAr,
          NULL as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        ORDER BY cc.closureDate DESC, cc.createdAt DESC
      `
    } else {
      query = `
        SELECT 
          cc.id,
          NULL as closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          NULL as branchId,
          NULL as branchNameAr,
          NULL as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        ORDER BY cc.closureDate DESC, cc.createdAt DESC
      `
    }
    
    const [closures] = await db.execute(query)
    
    // Format branch names
    const formattedClosures = closures.map(closure => ({
      ...closure,
      branchName: closure.branchNameAr || closure.branchNameEn || null
    }))
    
    res.json(formattedClosures)
  } catch (error) {
    console.error('Get custody closures error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Get single custody closure with invoices and attachments
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    // Check if branchId column exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custody_closures' 
      AND COLUMN_NAME = 'branchId'
    `)
    const hasBranchId = columns.length > 0
    
    // Check if closureNumber column exists
    const [closureNumberColumns] = await db.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'custody_closures' 
      AND COLUMN_NAME = 'closureNumber'
    `)
    const hasClosureNumber = closureNumberColumns.length > 0
    
    let query
    if (hasBranchId && hasClosureNumber) {
      query = `
        SELECT 
          cc.id,
          cc.closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          cc.branchId,
          b.nameAr as branchNameAr,
          b.nameEn as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        LEFT JOIN branches b ON cc.branchId = b.id
        WHERE cc.id = ?
      `
    } else if (hasBranchId) {
      query = `
        SELECT 
          cc.id,
          NULL as closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          cc.branchId,
          b.nameAr as branchNameAr,
          b.nameEn as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        LEFT JOIN branches b ON cc.branchId = b.id
        WHERE cc.id = ?
      `
    } else if (hasClosureNumber) {
      query = `
        SELECT 
          cc.id,
          cc.closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          NULL as branchId,
          NULL as branchNameAr,
          NULL as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        WHERE cc.id = ?
      `
    } else {
      query = `
        SELECT 
          cc.id,
          NULL as closureNumber,
          cc.closureDate,
          cc.custodyManagerId,
          CONCAT(cm.firstName, ' ', cm.lastName) as custodyManagerName,
          cc.closedById,
          CONCAT(cb.firstName, ' ', cb.lastName) as closedByName,
          NULL as branchId,
          NULL as branchNameAr,
          NULL as branchNameEn,
          cc.totalExclTax,
          cc.totalDiscount,
          cc.totalTax,
          cc.grandTotal,
          cc.notes,
          cc.createdAt,
          cc.updatedAt
        FROM custody_closures cc
        LEFT JOIN users cm ON cc.custodyManagerId = cm.id
        LEFT JOIN users cb ON cc.closedById = cb.id
        WHERE cc.id = ?
      `
    }
    
    const [closures] = await db.execute(query, [id])
    
    if (closures.length === 0) {
      return res.status(404).json({ message: 'Custody closure not found' })
    }
    
    const closure = closures[0]
    
    // Get invoices
    const [invoices] = await db.execute(`
      SELECT 
        cci.id,
        cci.invoiceDate,
        cci.invoiceNumber,
        cci.amountWithoutTax,
        cci.discount,
        cci.amountAfterDiscount,
        cci.tax,
        cci.total,
        cci.description
      FROM custody_closure_invoices cci
      WHERE cci.custodyClosureId = ?
      ORDER BY cci.id
    `, [id])
    
    // Get attachments
    const [attachments] = await db.execute(`
      SELECT 
        cca.id,
        cca.fileName,
        cca.filePath,
        cca.fileSize,
        cca.mimeType,
        cca.uploadedBy,
        CONCAT(u.firstName, ' ', u.lastName) as uploadedByName,
        cca.uploadedAt
      FROM custody_closure_attachments cca
      LEFT JOIN users u ON cca.uploadedBy = u.id
      WHERE cca.custodyClosureId = ?
      ORDER BY cca.uploadedAt DESC
    `, [id])
    
    // Format branch name
    const branchName = closure.branchNameAr || closure.branchNameEn || null
    
    res.json({
      ...closure,
      branchName: branchName,
      invoices: invoices || [],
      attachments: attachments || []
    })
  } catch (error) {
    console.error('Get custody closure error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Create custody closure
router.post(
  '/',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  upload.array('attachments', 10),
  async (req, res) => {
    const connection = await db.getConnection()
    
    try {
      await connection.beginTransaction()
      
      const {
        closureDate,
        custodyManagerId,
        closedById,
        branchId,
        invoices,
        notes
      } = req.body
      
      // Debug logging
      console.log('POST /custody-closures - Request body:', {
        closureDate,
        custodyManagerId,
        closedById,
        branchId,
        branchIdType: typeof branchId,
        branchIdValue: branchId,
        branchIdString: String(branchId),
        hasInvoices: !!invoices,
        notes: notes ? 'present' : 'missing',
        allBodyKeys: Object.keys(req.body)
      })
      
      // Log all form fields to see what multer parsed
      console.log('All req.body fields:', JSON.stringify(req.body, null, 2))
      
      if (!closureDate || !custodyManagerId || !closedById) {
        return res.status(400).json({ 
          message: 'Closure date, custody manager, and closed by are required' 
        })
      }
      
      // Parse invoices if string
      const invoicesArray = typeof invoices === 'string' ? JSON.parse(invoices) : invoices
      
      if (!invoicesArray || invoicesArray.length === 0) {
        return res.status(400).json({ 
          message: 'At least one invoice is required' 
        })
      }
      
      // Calculate financial summary
      let totalExclTax = 0
      let totalDiscount = 0
      let totalTax = 0
      let grandTotal = 0
      
      invoicesArray.forEach(invoice => {
        const amountWithoutTax = parseFloat(invoice.amountWithoutTax || 0)
        const discount = parseFloat(invoice.discount || 0)
        const amountAfterDiscount = amountWithoutTax - discount
        const tax = parseFloat(invoice.tax || 0)
        const total = amountAfterDiscount + tax
        
        totalExclTax += amountWithoutTax
        totalDiscount += discount
        totalTax += tax
        grandTotal += total
      })
      
      // Check if branchId column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'custody_closures' 
        AND COLUMN_NAME = 'branchId'
      `)
      const hasBranchId = columns.length > 0
      
      // Check if closureNumber column exists
      const [closureNumberColumns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'custody_closures' 
        AND COLUMN_NAME = 'closureNumber'
      `)
      const hasClosureNumber = closureNumberColumns.length > 0
      
      // Generate closure number if column exists
      let closureNumber = null
      if (hasClosureNumber) {
        closureNumber = await generateClosureNumber()
      }
      
      // Insert custody closure
      let insertQuery, insertValues
      if (hasBranchId && hasClosureNumber) {
        insertQuery = `INSERT INTO custody_closures 
         (closureNumber, closureDate, custodyManagerId, closedById, branchId, totalExclTax, totalDiscount, totalTax, grandTotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        // Handle branchId: if it's provided and > 0, use it; otherwise set to null
        let branchIdValue = null
        if (branchId !== undefined && branchId !== null && branchId !== '') {
          const parsedBranchId = parseInt(branchId)
          if (!isNaN(parsedBranchId) && parsedBranchId > 0) {
            branchIdValue = parsedBranchId
          }
        }
        
        console.log('POST - Processing branchId:', {
          original: branchId,
          parsed: branchIdValue,
          willSave: branchIdValue
        })
        
        insertValues = [
          closureNumber,
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          branchIdValue,
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null
        ]
      } else if (hasBranchId) {
        // Handle branchId: if it's provided and > 0, use it; otherwise set to null
        let branchIdValue = null
        if (branchId !== undefined && branchId !== null && branchId !== '') {
          const parsedBranchId = parseInt(branchId)
          if (!isNaN(parsedBranchId) && parsedBranchId > 0) {
            branchIdValue = parsedBranchId
          }
        }
        
        console.log('POST - Processing branchId (no closureNumber):', {
          original: branchId,
          parsed: branchIdValue,
          willSave: branchIdValue
        })
        
        insertQuery = `INSERT INTO custody_closures 
         (closureDate, custodyManagerId, closedById, branchId, totalExclTax, totalDiscount, totalTax, grandTotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        insertValues = [
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          branchIdValue,
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null
        ]
      } else if (hasClosureNumber) {
        insertQuery = `INSERT INTO custody_closures 
         (closureNumber, closureDate, custodyManagerId, closedById, totalExclTax, totalDiscount, totalTax, grandTotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        insertValues = [
          closureNumber,
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null
        ]
      } else {
        insertQuery = `INSERT INTO custody_closures 
         (closureDate, custodyManagerId, closedById, totalExclTax, totalDiscount, totalTax, grandTotal, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        insertValues = [
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null
        ]
      }
      
      console.log('POST - Executing insert query:', insertQuery)
      console.log('POST - Insert values:', insertValues)
      
      const [result] = await connection.execute(insertQuery, insertValues)
      
      const custodyClosureId = result.insertId
      
      // Verify the insert
      const [inserted] = await connection.execute(
        'SELECT branchId FROM custody_closures WHERE id = ?',
        [custodyClosureId]
      )
      console.log('POST - Inserted closure branchId:', inserted[0]?.branchId)
      
      // Insert invoices
      for (const invoice of invoicesArray) {
        const amountWithoutTax = parseFloat(invoice.amountWithoutTax || 0)
        const discount = parseFloat(invoice.discount || 0)
        const amountAfterDiscount = amountWithoutTax - discount
        const tax = parseFloat(invoice.tax || 0)
        const total = amountAfterDiscount + tax
        
        await connection.execute(
          `INSERT INTO custody_closure_invoices 
           (custodyClosureId, invoiceDate, invoiceNumber, amountWithoutTax, discount, 
            amountAfterDiscount, tax, total, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            custodyClosureId,
            invoice.invoiceDate,
            invoice.invoiceNumber || '',
            amountWithoutTax,
            discount,
            amountAfterDiscount,
            tax,
            total,
            invoice.description || null
          ]
        )
      }
      
      // Handle file uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await connection.execute(
            `INSERT INTO custody_closure_attachments 
             (custodyClosureId, fileName, filePath, fileSize, mimeType, uploadedBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              custodyClosureId,
              file.originalname,
              file.path,
              file.size,
              file.mimetype,
              req.user.id
            ]
          )
        }
      }
      
      await connection.commit()
      connection.release()
      
      res.status(201).json({
        id: custodyClosureId,
        message: 'Custody closure created successfully'
      })
    } catch (error) {
      await connection.rollback()
      connection.release()
      console.error('Create custody closure error:', error)
      res.status(500).json({ 
        message: error.message || 'Server error'
      })
    }
  }
)

// Update custody closure
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  upload.array('attachments', 10),
  async (req, res) => {
    const connection = await db.getConnection()
    
    try {
      await connection.beginTransaction()
      
      const { id } = req.params
      const {
        closureDate,
        custodyManagerId,
        closedById,
        branchId,
        invoices,
        notes
      } = req.body
      
      // Debug logging
      console.log('PUT /custody-closures/:id - Request body:', {
        id,
        closureDate,
        custodyManagerId,
        closedById,
        branchId,
        branchIdType: typeof branchId,
        branchIdValue: branchId,
        branchIdString: String(branchId),
        hasInvoices: !!invoices,
        notes: notes ? 'present' : 'missing',
        allBodyKeys: Object.keys(req.body)
      })
      
      // Log all form fields to see what multer parsed
      console.log('All req.body fields:', JSON.stringify(req.body, null, 2))
      
      // Check if closure exists
      const [existing] = await connection.execute(
        'SELECT id FROM custody_closures WHERE id = ?',
        [id]
      )
      
      if (existing.length === 0) {
        return res.status(404).json({ message: 'Custody closure not found' })
      }
      
      if (!closureDate || !custodyManagerId || !closedById) {
        return res.status(400).json({ 
          message: 'Closure date, custody manager, and closed by are required' 
        })
      }
      
      // Parse invoices if string
      const invoicesArray = typeof invoices === 'string' ? JSON.parse(invoices) : invoices
      
      if (!invoicesArray || invoicesArray.length === 0) {
        return res.status(400).json({ 
          message: 'At least one invoice is required' 
        })
      }
      
      // Calculate financial summary
      let totalExclTax = 0
      let totalDiscount = 0
      let totalTax = 0
      let grandTotal = 0
      
      invoicesArray.forEach(invoice => {
        const amountWithoutTax = parseFloat(invoice.amountWithoutTax || 0)
        const discount = parseFloat(invoice.discount || 0)
        const amountAfterDiscount = amountWithoutTax - discount
        const tax = parseFloat(invoice.tax || 0)
        const total = amountAfterDiscount + tax
        
        totalExclTax += amountWithoutTax
        totalDiscount += discount
        totalTax += tax
        grandTotal += total
      })
      
      // Check if branchId column exists
      const [columns] = await connection.execute(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'custody_closures' 
        AND COLUMN_NAME = 'branchId'
      `)
      const hasBranchId = columns.length > 0
      
      // Update custody closure
      let updateQuery, updateValues
      if (hasBranchId) {
        updateQuery = `UPDATE custody_closures 
         SET closureDate = ?, custodyManagerId = ?, closedById = ?, branchId = ?,
             totalExclTax = ?, totalDiscount = ?, totalTax = ?, grandTotal = ?, notes = ?
         WHERE id = ?`
        // Handle branchId: if it's provided and > 0, use it; otherwise set to null
        let branchIdValue = null
        if (branchId !== undefined && branchId !== null && branchId !== '') {
          const parsedBranchId = parseInt(branchId)
          if (!isNaN(parsedBranchId) && parsedBranchId > 0) {
            branchIdValue = parsedBranchId
          }
        }
        
        console.log('Processing branchId:', {
          original: branchId,
          parsed: branchIdValue,
          willSave: branchIdValue
        })
        
        updateValues = [
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          branchIdValue,
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null,
          id
        ]
      } else {
        updateQuery = `UPDATE custody_closures 
         SET closureDate = ?, custodyManagerId = ?, closedById = ?,
             totalExclTax = ?, totalDiscount = ?, totalTax = ?, grandTotal = ?, notes = ?
         WHERE id = ?`
        updateValues = [
          closureDate,
          parseInt(custodyManagerId),
          parseInt(closedById),
          totalExclTax,
          totalDiscount,
          totalTax,
          grandTotal,
          notes || null,
          id
        ]
      }
      
      console.log('Executing update query:', updateQuery)
      console.log('Update values:', updateValues)
      
      await connection.execute(updateQuery, updateValues)
      
      // Verify the update
      const [updated] = await connection.execute(
        'SELECT branchId FROM custody_closures WHERE id = ?',
        [id]
      )
      console.log('Updated closure branchId:', updated[0]?.branchId)
      
      // Delete existing invoices
      await connection.execute(
        'DELETE FROM custody_closure_invoices WHERE custodyClosureId = ?',
        [id]
      )
      
      // Insert updated invoices
      for (const invoice of invoicesArray) {
        const amountWithoutTax = parseFloat(invoice.amountWithoutTax || 0)
        const discount = parseFloat(invoice.discount || 0)
        const amountAfterDiscount = amountWithoutTax - discount
        const tax = parseFloat(invoice.tax || 0)
        const total = amountAfterDiscount + tax
        
        await connection.execute(
          `INSERT INTO custody_closure_invoices 
           (custodyClosureId, invoiceDate, invoiceNumber, amountWithoutTax, discount, 
            amountAfterDiscount, tax, total, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            invoice.invoiceDate,
            invoice.invoiceNumber || '',
            amountWithoutTax,
            discount,
            amountAfterDiscount,
            tax,
            total,
            invoice.description || null
          ]
        )
      }
      
      // Handle new file uploads
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          await connection.execute(
            `INSERT INTO custody_closure_attachments 
             (custodyClosureId, fileName, filePath, fileSize, mimeType, uploadedBy)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              file.originalname,
              file.path,
              file.size,
              file.mimetype,
              req.user.id
            ]
          )
        }
      }
      
      await connection.commit()
      connection.release()
      
      res.json({ message: 'Custody closure updated successfully' })
    } catch (error) {
      await connection.rollback()
      connection.release()
      console.error('Update custody closure error:', error)
      res.status(500).json({ 
        message: error.message || 'Server error'
      })
    }
  }
)

// Delete custody closure
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id } = req.params
      
      // Get attachments to delete files
      const [attachments] = await db.execute(
        'SELECT filePath FROM custody_closure_attachments WHERE custodyClosureId = ?',
        [id]
      )
      
      // Delete files from filesystem
      attachments.forEach(attachment => {
        try {
          if (fs.existsSync(attachment.filePath)) {
            fs.unlinkSync(attachment.filePath)
          }
        } catch (error) {
          console.error('Error deleting file:', error)
        }
      })
      
      // Delete from database (cascade will handle related records)
      const [result] = await db.execute(
        'DELETE FROM custody_closures WHERE id = ?',
        [id]
      )
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Custody closure not found' })
      }
      
      res.json({ message: 'Custody closure deleted successfully' })
    } catch (error) {
      console.error('Delete custody closure error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Download attachment
router.get('/:id/attachments/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const { id, attachmentId } = req.params
    
    const [attachments] = await db.execute(
      'SELECT fileName, filePath, mimeType FROM custody_closure_attachments WHERE id = ? AND custodyClosureId = ?',
      [attachmentId, id]
    )
    
    if (attachments.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' })
    }
    
    const attachment = attachments[0]
    const filePath = attachment.filePath
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'File not found' })
    }
    
    // Set appropriate content type for preview
    const mimeType = attachment.mimeType || 'application/octet-stream'
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Content-Disposition', `inline; filename="${attachment.fileName}"`)
    
    // Send file for preview (inline display)
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('File send error:', err)
        res.status(500).json({ message: 'Error loading file' })
      }
    })
  } catch (error) {
    console.error('Download attachment error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Delete attachment
router.delete(
  '/:id/attachments/:attachmentId',
  authenticateToken,
  authorizeRole('admin', 'purchasingOfficer'),
  async (req, res) => {
    try {
      const { id, attachmentId } = req.params
      
      // Get attachment info
      const [attachments] = await db.execute(
        'SELECT filePath FROM custody_closure_attachments WHERE id = ? AND custodyClosureId = ?',
        [attachmentId, id]
      )
      
      if (attachments.length === 0) {
        return res.status(404).json({ message: 'Attachment not found' })
      }
      
      const filePath = attachments[0].filePath
      
      // Delete from database
      await db.execute(
        'DELETE FROM custody_closure_attachments WHERE id = ? AND custodyClosureId = ?',
        [attachmentId, id]
      )
      
      // Delete file from filesystem
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (error) {
        console.error('Error deleting file:', error)
      }
      
      res.json({ message: 'Attachment deleted successfully' })
    } catch (error) {
      console.error('Delete attachment error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

export default router
