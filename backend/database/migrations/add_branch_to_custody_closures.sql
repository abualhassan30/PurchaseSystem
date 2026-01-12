-- Migration: Add branchId to custody_closures table
-- Run this SQL script to add branch support at closure level

USE purchasesystem;

-- Add branchId column to custody_closures table
ALTER TABLE custody_closures
ADD COLUMN branchId INT NULL AFTER closedById,
ADD FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL;
