# How to Restart the Backend Server

## The Issue
The categories endpoint returns 404 because the backend server needs to be restarted to load the new route.

## Solution

### Step 1: Stop the Current Server
1. Go to the terminal/command prompt where your backend server is running
2. Press `Ctrl + C` to stop the server

### Step 2: Restart the Server

**Option A: Using npm run dev (with auto-reload)**
```bash
cd backend
npm run dev
```

**Option B: Using npm start**
```bash
cd backend
npm start
```

### Step 3: Verify the Server Started
You should see:
```
Server is running on port 3000
Database: purchasesystem on localhost:3306

📋 Available routes:
  - /api/auth
  - /api/users
  - /api/units
  - /api/items
  - /api/categories  ← This should appear
  - /api/purchase-orders
  - /api/health
```

### Step 4: Test the Categories Endpoint
After restarting, try creating a category again. It should work now!

## Troubleshooting

If you still get a 404 error after restarting:

1. **Check if the server is running:**
   - Open browser: http://localhost:3000/api/health
   - Should return: `{"status":"ok","message":"Server is running"}`

2. **Check the backend terminal for errors:**
   - Look for any import errors or syntax errors
   - Make sure `categories.js` exists in `backend/routes/` folder

3. **Verify the route is registered:**
   - Check `backend/server.js` line 26 should have: `app.use('/api/categories', categoriesRoutes)`

4. **Clear browser cache:**
   - Hard refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
