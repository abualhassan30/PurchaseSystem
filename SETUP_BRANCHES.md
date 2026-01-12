# Complete Setup Guide for Branches Feature

## ✅ All Code Changes Completed

The following files have been created/updated:

### Backend Files:
- ✅ `backend/routes/branches.js` - Full CRUD API routes
- ✅ `backend/server.js` - Route registered
- ✅ `backend/database/schema.sql` - Branches table added
- ✅ `backend/database/migrations/add_branches_table.sql` - Migration SQL
- ✅ `backend/scripts/migrate-branches.js` - Migration script

### Frontend Files:
- ✅ `frontend/src/pages/Branches.tsx` - Branch management page
- ✅ `frontend/src/pages/PurchaseOrders.tsx` - Branch selection added
- ✅ `frontend/src/App.tsx` - Route added
- ✅ `frontend/src/components/Layout.tsx` - Navigation link added
- ✅ `frontend/src/lib/api.ts` - Authentication interceptor added
- ✅ `frontend/src/contexts/AuthContext.tsx` - Token storage updated
- ✅ Translation files updated (en.json, ar.json)

---

## 🚀 Setup Steps

### Step 1: Run Database Migration

**Option A: Using the migration script (Recommended)**
```bash
cd backend
npm run migrate-branches
```

**Option B: Manual SQL execution**
```bash
mysql -u your_username -p purchasesystem < backend/database/migrations/add_branches_table.sql
```

**Option C: Run SQL directly in MySQL client**
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

ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS branchId INT NULL,
ADD COLUMN IF NOT EXISTS notes TEXT NULL;

ALTER TABLE purchase_orders 
ADD CONSTRAINT purchase_orders_ibfk_2 
FOREIGN KEY (branchId) REFERENCES branches(id) ON DELETE SET NULL;
```

### Step 2: Restart Backend Server

**Stop the current server:**
- Press `Ctrl+C` in the terminal where backend is running

**Start the server:**
```bash
cd backend
npm start
```

**Verify in console output:**
```
✅ Branches route file verified: [path]
📦 Branches router created
  ✅ /api/branches - REGISTERED SUCCESSFULLY
```

### Step 3: Verify Authentication is Working

1. **Login to the application**
2. **Open browser DevTools (F12) → Console**
3. **Check token exists:**
   ```javascript
   localStorage.getItem('token')
   ```
   Should return a JWT token string

4. **Test the endpoint:**
   - Visit: `http://localhost:3000/api/test-branches`
   - Should return: `{"message":"Branches route test endpoint","routeExists":true}`

### Step 4: Test Branches Feature

1. **Navigate to Branches page** in the application
2. **Click "New Branch"**
3. **Fill in the form:**
   - Arabic Name (required)
   - English Name (required)
   - Branch Code (required, unique)
   - City (optional)
4. **Click Save**
5. **Verify branch appears in the list**

### Step 5: Test Branch Selection in Purchase Orders

1. **Navigate to Purchase Orders**
2. **Click "New Purchase Order"**
3. **Verify Branch dropdown appears** at the top of the form
4. **Select a branch** (should be searchable)
5. **Complete the purchase order**
6. **Verify branch is saved** with the order

---

## 🔍 Troubleshooting

### Issue: "Branches endpoint not found"

**Solution:**
1. ✅ Restart backend server
2. ✅ Check console for: `✅ /api/branches - REGISTERED SUCCESSFULLY`
3. ✅ Verify `backend/routes/branches.js` exists

### Issue: "Branches table does not exist"

**Solution:**
1. ✅ Run migration: `npm run migrate-branches`
2. ✅ Or run SQL manually (see Step 1)

### Issue: "401 Unauthorized"

**Solution:**
1. ✅ Logout and login again to get fresh token
2. ✅ Check browser console for token in localStorage
3. ✅ Verify Network tab shows `Authorization: Bearer ...` header

### Issue: "Branch code already exists"

**Solution:**
- Use a different branch code (must be unique)

---

## 📋 Verification Checklist

- [ ] Database migration completed successfully
- [ ] Backend server restarted and shows branches route registered
- [ ] Token is stored in localStorage after login
- [ ] `/api/test-branches` endpoint returns success
- [ ] Can create a new branch through UI
- [ ] Can edit a branch
- [ ] Can delete a branch
- [ ] Branch dropdown appears in Purchase Orders form
- [ ] Can select a branch when creating purchase order
- [ ] Branch is saved with purchase order

---

## 🎉 Success Indicators

When everything is working, you should see:

1. **Backend Console:**
   ```
   ✅ /api/branches - REGISTERED SUCCESSFULLY
   📥 GET /api/branches - Request received
   📥 POST /api/branches - Request received
   ```

2. **Browser Network Tab:**
   - Requests to `/api/branches` show status 200
   - Request headers include `Authorization: Bearer ...`

3. **Frontend:**
   - Branches page loads and shows branch list
   - Can create/edit/delete branches
   - Purchase Orders form has branch dropdown

---

## 📝 Next Steps After Setup

1. Create your first branch
2. Test creating a purchase order with branch selection
3. Verify branch appears in PDF when downloading
4. Test search and filter functionality in branches list

All code is ready! Just run the migration and restart the server! 🚀
