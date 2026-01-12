-- Migration: Add branchId to custody_closures table
-- Run this SQL script manually in your MySQL client to add branch support at closure level

USE purchasesystem;

-- Check if column already exists before adding
SET @dbname = DATABASE();
SET @tablename = 'custody_closures';
SET @columnname = 'branchId';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1', -- Column exists, do nothing
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT NULL AFTER closedById, ADD FOREIGN KEY (', @columnname, ') REFERENCES branches(id) ON DELETE SET NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
