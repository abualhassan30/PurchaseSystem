-- Migration: Add Purchase Custody Closure tables
-- Run this SQL script to add custody closure management

USE purchasesystem;

-- Purchase Custody Closures table
CREATE TABLE IF NOT EXISTS custody_closures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    closureDate DATE NOT NULL,
    custodyManagerId INT NOT NULL,
    closedById INT NOT NULL,
    totalExclTax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    totalDiscount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    totalTax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    grandTotal DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (custodyManagerId) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (closedById) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custody Closure Invoices table
CREATE TABLE IF NOT EXISTS custody_closure_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    custodyClosureId INT NOT NULL,
    invoiceDate DATE NOT NULL,
    invoiceNumber VARCHAR(100) NOT NULL,
    amountWithoutTax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    amountAfterDiscount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    tax DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    description TEXT NULL,
    branchId INT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (custodyClosureId) REFERENCES custody_closures(id) ON DELETE CASCADE,
    FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Custody Closure Attachments table
CREATE TABLE IF NOT EXISTS custody_closure_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    custodyClosureId INT NOT NULL,
    fileName VARCHAR(255) NOT NULL,
    filePath VARCHAR(500) NOT NULL,
    fileSize INT NOT NULL,
    mimeType VARCHAR(100) NULL,
    uploadedBy INT NOT NULL,
    uploadedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (custodyClosureId) REFERENCES custody_closures(id) ON DELETE CASCADE,
    FOREIGN KEY (uploadedBy) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
