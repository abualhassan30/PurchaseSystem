# Quick Fix: Branches Endpoint Not Found

## The Problem
The branches endpoint returns 404 because the backend server hasn't been restarted after adding the new route.

## Immediate Solution

### Step 1: Stop the Backend Server
- Find the terminal/command prompt where the backend is running
- Press `Ctrl+C` to stop it

### Step 2: Restart the Backend Server
```bash
cd backend
npm start
```

**OR if you're using nodemon:**
```bash
npm run dev
```

### Step 3: Look for This in Console Output
When the server starts, you MUST see:
```
✅ Branches route file verified: [path]
📦 Branches router created
  🔍 Checking branchesRoutes...
     Type: function
     Value: defined
  ✅ /api/branches - REGISTERED SUCCESSFULLY
```

### Step 4: Verify It's Working
Open your browser and go to:
```
http://localhost:3000/api/test-branches
```

You should see:
```json
{
  "message": "Branches route test endpoint",
  "routeExists": true,
  "timestamp": "..."
}
```

## If You Still Get 404 After Restart

### Check 1: Database Table Exists
Run this SQL in your MySQL client:
```sql
USE purchasesystem;
SHOW TABLES LIKE 'branches';
```

If it returns empty, create the table:
```sql
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
```

### Check 2: Backend Console Errors
Look at the backend console for any red error messages. Common issues:
- Import errors
- Database connection errors
- Port already in use

### Check 3: File Exists
Verify the file exists:
```bash
ls backend/routes/branches.js
```

Should show the file exists.

## Still Not Working?

1. **Check backend console** - Look for any error messages when starting
2. **Check browser console** - Look for the actual HTTP status code (404, 500, etc.)
3. **Test the endpoint directly** - Use Postman or curl:
   ```bash
   curl http://localhost:3000/api/test-branches
   ```

## Files Created/Modified
- ✅ `backend/routes/branches.js` - Route file created
- ✅ `backend/server.js` - Route registered
- ✅ `backend/database/schema.sql` - Table schema added
- ✅ `backend/database/migrations/add_branches_table.sql` - Migration file

All code is correct. **You just need to restart the backend server!**
