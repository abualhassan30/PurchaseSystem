-- Migration: Add branches table and update purchase_orders table
-- Run this SQL script if your database already exists

USE purchasesystem;

-- Create branches table
CREATE TABLE IF NOT EXISTS branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nameAr VARCHAR(255) NOT NULL,
    nameEn VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    city VARCHAR(100) NULL,
    isActive BOOLEAN NOT NULL DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add branchId and notes columns to purchase_orders table if they don't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS branchId INT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Add foreign key constraint for branchId
-- First, check if the foreign key already exists before adding
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = 'purchasesystem' 
    AND TABLE_NAME = 'purchase_orders' 
    AND CONSTRAINT_NAME = 'purchase_orders_ibfk_2'
);

SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_ibfk_2 FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
