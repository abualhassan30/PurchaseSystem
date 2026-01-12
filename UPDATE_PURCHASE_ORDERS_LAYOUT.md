# Purchase Orders Page Layout Update

## ✅ Completed Changes

### 1. **Page Layout Reorganization**
   - ✅ Page Title: "Purchase Orders" (top-left)
   - ✅ Add New Purchase Order button (top-right)
   - ✅ Separate Search and Filter section (above table)
   - ✅ Table/grid view of all purchase orders
   - ✅ Pagination controls (bottom of table)

### 2. **Table Columns Updated**
   - ✅ **PO Number** - Order number (left-aligned, bold)
   - ✅ **Branch** - Branch name (left-aligned)
   - ✅ **Order Date** - Order date (right-aligned)
   - ✅ **Total Amount** - Order total (right-aligned, bold)
   - ✅ **Status** - Status dropdown (center-aligned)
   - ✅ **Created By** - Purchasing officer name (left-aligned)
   - ✅ **Actions** - View, Edit, Print, Download PDF, Delete buttons (center-aligned)

### 3. **Status Values Updated**
   - ✅ **DRAFT** - Draft status
   - ✅ **PENDING_REVIEW** - Pending Review status
   - ✅ **PENDING_APPROVAL** - Pending Approval status
   - ✅ **APPROVED** - Approved status
   - ✅ **REJECTED** - Rejected status
   - ✅ **CANCELLED** - Cancelled status
   - ✅ **COMPLETED** - Completed status

### 4. **Pagination Features**
   - ✅ Page navigation (Previous/Next buttons)
   - ✅ Page number buttons (shows up to 5 pages)
   - ✅ Rows per page selector (5, 10, 25, 50)
   - ✅ Results counter ("Showing X to Y of Z results")
   - ✅ Auto-reset to page 1 when filters change

## 📋 Database Migration Required

**IMPORTANT:** You must run the migration to update the status enum values:

```bash
cd backend
npm run migrate-purchase-orders-status
```

This will:
1. Update the status column enum to use the new uppercase values
2. Convert existing statuses:
   - `draft` → `DRAFT`
   - `pending` → `PENDING_REVIEW`
   - `approved` → `APPROVED`
   - `rejected` → `REJECTED`
   - `completed` → `COMPLETED`
   - `cancelled` → `CANCELLED`

## 🎨 UI/UX Improvements

### Search and Filter Section
- Separate card above the table
- Search input with icon
- Status filter dropdown
- Responsive layout (stacks on mobile)

### Table Layout
- Clean column organization
- Proper alignment (text left, numbers right, status/actions center)
- Status dropdown in each row for quick updates
- Action buttons with icons and tooltips

### Pagination
- Smart page number display (shows 5 pages, adjusts based on current page)
- Previous/Next buttons with disabled states
- Rows per page selector
- Results counter showing current range

## 🔧 Technical Changes

### Backend
- Updated `schema.sql` with new status enum
- Updated migration script with new status values
- Updated route validation to accept new status values
- Default status changed to `DRAFT`

### Frontend
- Updated TypeScript interface for status type
- Updated status color mapping
- Updated status label mapping
- Updated filter dropdown options
- Updated table row status dropdown
- Added pagination state and logic
- Reorganized component structure

### Translations
- Added `statusPendingReview` and `statusPendingApproval`
- Added pagination-related translations:
  - `page`, `of`, `rowsPerPage`, `showing`, `to`, `results`
  - `createdBy`

## 🚀 Setup Instructions

1. **Run Database Migration:**
   ```bash
   cd backend
   npm run migrate-purchase-orders-status
   ```

2. **Restart Backend Server:**
   ```bash
   cd backend
   npm start
   ```

3. **Frontend is Ready:**
   - No additional setup needed
   - All features are immediately available

## 📊 Status Color Mapping

- **DRAFT** - Gray (`bg-gray-100 text-gray-800`)
- **PENDING_REVIEW** - Yellow (`bg-yellow-100 text-yellow-800`)
- **PENDING_APPROVAL** - Orange (`bg-orange-100 text-orange-800`)
- **APPROVED** - Green (`bg-green-100 text-green-800`)
- **REJECTED** - Red (`bg-red-100 text-red-800`)
- **COMPLETED** - Blue (`bg-blue-100 text-blue-800`)
- **CANCELLED** - Gray (`bg-gray-200 text-gray-600`)

## ⚠️ Important Notes

- **Status values are now UPPERCASE** (DRAFT, PENDING_REVIEW, etc.)
- **Migration is required** - existing orders will be converted
- **Pagination resets** when search or filter changes
- **Default rows per page** is 10
- **All status operations** use the new uppercase values

## 🎯 Usage

### Searching
- Type in the search box to filter by PO number, branch, or created by
- Search is case-insensitive and real-time

### Filtering
- Use the status dropdown to filter by specific status
- Select "All Statuses" to show all orders

### Pagination
- Click page numbers to navigate
- Use Previous/Next buttons
- Change rows per page to adjust table size
- View results counter for current range

### Status Updates
- Click status dropdown in any row
- Select new status
- Status updates immediately via API
