# Restart Backend Server for Branches Feature

## Issue
The branches endpoint is not found because the backend server needs to be restarted to load the new route.

## Solution

### Step 1: Stop the Current Backend Server
- If running in terminal, press `Ctrl+C` to stop it
- If running as a service, stop the service

### Step 2: Restart the Backend Server
Navigate to the backend directory and start the server:

```bash
cd backend
npm start
```

Or if using nodemon:
```bash
npm run dev
```

### Step 3: Verify the Route is Loaded
When the server starts, you should see in the console:
```
✅ Branches route file verified: [path]
📦 Branches router created
🔧 Registering routes...
  ✅ /api/branches - REGISTERED SUCCESSFULLY
```

### Step 4: Test the Endpoint
You can test if the route is working by visiting:
- `http://localhost:3000/api/test-branches` (should return JSON with routeExists: true)

### Step 5: Create the Database Table
If you haven't already, run the migration to create the branches table:

**Option A: Run the migration SQL file**
```bash
mysql -u your_username -p purchasesystem < backend/database/migrations/add_branches_table.sql
```

**Option B: Run SQL manually in MySQL client**
```sql
USE purchasesystem;

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

-- Add branchId and notes to purchase_orders if they don't exist
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS branchId INT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL;

-- Add foreign key (if not exists)
ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_ibfk_2 
FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL;
```

## Troubleshooting

### If you still get "endpoint not found":
1. Check the backend console for any import errors
2. Verify `backend/routes/branches.js` exists
3. Check that the server console shows "✅ /api/branches - REGISTERED SUCCESSFULLY"
4. Try accessing `http://localhost:3000/api/test-branches` to verify the route

### If you get database errors:
1. Make sure the `branches` table exists in your database
2. Run the migration SQL above
3. Check database connection in `.env` file
