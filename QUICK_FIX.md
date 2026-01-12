# Quick Fix: Categories 404 Error

## The Problem
You're getting "Categories endpoint not found" because the backend server is still running the old code without the categories route.

## The Solution (3 Simple Steps)

### Step 1: Stop the Backend Server
1. Go to the terminal/command prompt where your backend is running
2. Press `Ctrl + C` to stop it

### Step 2: Restart the Backend Server
```bash
cd backend
npm run dev
```

### Step 3: Verify It Worked
When the server starts, you should see:
```
Server is running on port 3000
Database: purchasesystem on localhost:3306

📋 Available routes:
  - /api/auth
  - /api/users
  - /api/units
  - /api/items
  - /api/categories    ← This confirms the route is loaded!
  - /api/purchase-orders
  - /api/health
```

If you see `/api/categories` in the list, the route is loaded and ready to use!

## Why This Happens
When you add a new file (like `categories.js`), Node.js doesn't automatically reload it. The server must be restarted to load new routes.

## Still Not Working?
1. Check the backend terminal for any error messages (red text)
2. Make sure you're in the `backend` folder when running `npm run dev`
3. Verify the file exists: `backend/routes/categories.js`
