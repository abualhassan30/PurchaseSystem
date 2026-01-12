# Quick Setup Guide

## Step 1: Database Setup

1. Open MySQL command line or MySQL Workbench
2. Run the schema file:
```bash
mysql -u root -p < backend/database/schema.sql
```

Or manually execute the SQL in `backend/database/schema.sql`

## Step 2: Backend Setup

1. Navigate to backend folder:
```bash
cd backend
```

2. Create `.env` file (copy from the configuration below):
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=purchasesystem

PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

3. Install dependencies:
```bash
npm install
```

4. Run setup script to create admin user:
```bash
node scripts/setup.js
```

5. Start the server:
```bash
npm start
# or for development:
npm run dev
```

## Step 3: Frontend Setup

1. Navigate to frontend folder:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Step 4: Access the Application

1. Open browser: `http://localhost:5173`
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`

## Troubleshooting

### Database Connection Issues
- Verify MySQL is running on port 3307
- Check `.env` file has correct database credentials
- Ensure database `purchasesystem` exists

### Port Already in Use
- Backend: Change `PORT` in `.env` file
- Frontend: Change port in `vite.config.ts`

### CORS Issues
- Ensure backend is running on port 3000
- Check proxy configuration in `vite.config.ts`

### Build Errors
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- Clear npm cache: `npm cache clean --force`
