-- Migration: Add status field to purchase_orders table
-- Run this SQL script to add status management to purchase orders

USE purchasesystem;

-- Add status column to purchase_orders table if it doesn't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS status ENUM('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED') 
NOT NULL DEFAULT 'DRAFT' 
AFTER notes;

-- Update existing orders to have 'PENDING_REVIEW' status (or 'COMPLETED' if delivery date has passed)
UPDATE purchase_orders 
SET status = CASE 
  WHEN expectedDeliveryDate < CURDATE() THEN 'COMPLETED'
  ELSE 'PENDING_REVIEW'
END
WHERE status = 'DRAFT' OR status IS NULL;
