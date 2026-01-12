-- Migration: Add closureNumber to custody_closures table
USE purchasesystem;

-- Add closureNumber column
ALTER TABLE custody_closures
ADD COLUMN closureNumber VARCHAR(50) NULL UNIQUE AFTER id;

-- Create index for faster lookups
CREATE INDEX idx_closure_number ON custody_closures(closureNumber);
