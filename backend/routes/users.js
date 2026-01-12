import express from 'express'
import bcrypt from 'bcryptjs'
import db from '../database/db.js'
import { authenticateToken, authorizeRole } from '../middleware/auth.js'

const router = express.Router()

// Get all users (Admin only)
router.get(
  '/',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const [users] = await db.execute(
        'SELECT id, firstName, lastName, email, role FROM users ORDER BY createdAt DESC'
      )
      res.json(users)
    } catch (error) {
      console.error('Get users error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Create user (Admin only)
router.post(
  '/',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { firstName, lastName, email, password, role } = req.body

      if (!firstName || !lastName || !email || !password) {
        return res.status(400).json({ message: 'All fields required' })
      }

      const hashedPassword = await bcrypt.hash(password, 10)

      const [result] = await db.execute(
        'INSERT INTO users (firstName, lastName, email, password, role) VALUES (?, ?, ?, ?, ?)',
        [firstName, lastName, email, hashedPassword, role || 'viewer']
      )

      res.status(201).json({
        id: result.insertId,
        firstName,
        lastName,
        email,
        role: role || 'viewer',
      })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Email already exists' })
      }
      console.error('Create user error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Update user (Admin only)
router.put(
  '/:id',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { id } = req.params
      const { firstName, lastName, email, role } = req.body

      await db.execute(
        'UPDATE users SET firstName = ?, lastName = ?, email = ?, role = ? WHERE id = ?',
        [firstName, lastName, email, role, id]
      )

      res.json({ message: 'User updated successfully' })
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ message: 'Email already exists' })
      }
      console.error('Update user error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

// Delete user (Admin only)
router.delete(
  '/:id',
  authenticateToken,
  authorizeRole('admin'),
  async (req, res) => {
    try {
      const { id } = req.params
      await db.execute('DELETE FROM users WHERE id = ?', [id])
      res.json({ message: 'User deleted successfully' })
    } catch (error) {
      console.error('Delete user error:', error)
      res.status(500).json({ message: 'Server error' })
    }
  }
)

export default router
