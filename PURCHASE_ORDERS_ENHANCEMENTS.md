# Purchase Orders List/Management Enhancements

## ✅ Completed Features

### 1. **Status Management**
   - Added `status` field to `purchase_orders` table with values: `draft`, `pending`, `approved`, `rejected`, `completed`, `cancelled`
   - Status dropdown in the orders table for quick status updates
   - Color-coded status badges
   - Status filter dropdown in the list header

### 2. **View Functionality**
   - "View" button (eye icon) for each order
   - Modal dialog displaying complete order details:
     - Order number, branch, dates, officer
     - Status with color badge
     - Complete items table with all details
     - Notes (if any)
     - Order total
   - Print and Download PDF buttons in the view modal

### 3. **Edit Functionality**
   - "Edit" button (pencil icon) for each order
   - Opens the same form used for creating orders
   - Pre-populates all fields with existing order data
   - Updates existing order via PUT endpoint
   - Form title changes to "Edit Purchase Order" when editing

### 4. **Delete Functionality**
   - "Delete" button (trash icon) for each order
   - Confirmation dialog before deletion
   - Success/error toast notifications
   - Automatic list refresh after deletion

### 5. **Print Functionality**
   - "Print" button (printer icon) for each order
   - Opens browser print dialog
   - Formatted print layout with all order details
   - Supports both LTR and RTL layouts
   - Includes company header, order details, items table, and totals

### 6. **Download PDF Functionality**
   - "Download PDF" button (download icon) for each order
   - Generates PDF using `html2pdf.js`
   - Professional formatting with proper Arabic font support
   - Filename format: `PO_[OrderNumber]_[Date].pdf`
   - Includes all order information, items table, notes, and totals

### 7. **Search Functionality**
   - Search input field in the list header
   - Real-time filtering by:
     - Order number
     - Purchasing officer name
     - Branch name
   - Search icon for better UX

### 8. **Filter Functionality**
   - Status filter dropdown
   - Filter by: All, Draft, Pending, Approved, Rejected, Completed, Cancelled
   - Combined with search for powerful filtering

## 📋 Database Changes

### Migration Required
Run the migration script to add the `status` field to existing databases:

```bash
cd backend
npm run migrate-purchase-orders-status
```

Or manually run the SQL:
```sql
ALTER TABLE purchase_orders 
ADD COLUMN status ENUM('draft', 'pending', 'approved', 'rejected', 'completed', 'cancelled') 
NOT NULL DEFAULT 'draft' 
AFTER notes;
```

## 🔧 Backend API Changes

### New Endpoints
1. **PUT `/api/purchase-orders/:id`** - Update purchase order
   - Updates order details, items, status, notes
   - Requires authentication and admin/purchasingOfficer role

2. **DELETE `/api/purchase-orders/:id`** - Delete purchase order
   - Deletes order and all associated items (CASCADE)
   - Requires authentication and admin/purchasingOfficer role

3. **PATCH `/api/purchase-orders/:id/status`** - Update status only
   - Quick status update endpoint
   - Requires authentication and admin/purchasingOfficer role

### Updated Endpoints
1. **GET `/api/purchase-orders`** - Now includes:
   - `status` field
   - `branchNameAr` and `branchNameEn` fields
   - `notes` field

2. **GET `/api/purchase-orders/:id`** - Now includes:
   - `status` field
   - `branchNameAr` and `branchNameEn` fields
   - `notes` field
   - Multilingual item and unit names (`nameAr`, `nameEn`)

3. **POST `/api/purchase-orders`** - Now accepts:
   - `status` field (optional, defaults to 'draft')

## 🎨 Frontend Changes

### New Components/Features
- View modal dialog with complete order details
- Status dropdown in table rows
- Search input with icon
- Status filter dropdown
- Action buttons (View, Edit, Print, Download PDF, Delete)
- Enhanced table with status column
- Edit mode in the form (reuses create form)

### UI/UX Improvements
- Color-coded status badges
- Responsive action buttons
- Confirmation dialogs for destructive actions
- Toast notifications for all operations
- Proper RTL/LTR support for all new features
- Search and filter work together
- Empty state messages

## 📝 Translations Added

### English (`en.json`)
- `status`, `statusDraft`, `statusPending`, `statusApproved`, `statusRejected`, `statusCompleted`, `statusCancelled`
- `view`, `edit`, `delete`
- `viewOrder`, `editOrder`
- `confirmDelete`, `orderDeleted`, `orderUpdated`
- `updateStatus`, `searchOrders`, `filterByStatus`, `allStatuses`
- `orderDetails`, `close`, `saveChanges`, `cancel`

### Arabic (`ar.json`)
- All corresponding Arabic translations

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

## 🎯 Usage

### Viewing an Order
1. Click the eye icon (👁️) next to any order
2. View complete details in the modal
3. Use Print or Download PDF buttons if needed
4. Click "Close" to dismiss

### Editing an Order
1. Click the edit icon (✏️) next to any order
2. Form opens with pre-filled data
3. Make changes
4. Click "Save" to update

### Updating Status
1. Click the status dropdown in any order row
2. Select new status
3. Status updates immediately

### Searching/Filtering
1. Type in the search box to filter by order number, officer, or branch
2. Use the status filter dropdown to filter by status
3. Both filters work together

### Printing/Downloading
1. Click printer icon for print dialog
2. Click download icon for PDF download
3. Available from both the table and view modal

### Deleting
1. Click trash icon (🗑️)
2. Confirm deletion
3. Order is permanently deleted

## ⚠️ Notes

- Status updates are immediate (no confirmation needed)
- Delete requires confirmation
- Edit mode reuses the create form
- All operations show toast notifications
- Search and filter are case-insensitive
- PDF generation requires internet connection for font loading (Arabic)

## 🔒 Security

- All endpoints require authentication
- Update/Delete operations require `admin` or `purchasingOfficer` role
- Status updates require `admin` or `purchasingOfficer` role
- View operations require authentication only
