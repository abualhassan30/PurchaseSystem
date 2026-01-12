# 🚀 Quick Start Guide

## Servers Status

Both servers are starting up:

- **Backend API**: http://localhost:3000
- **Frontend App**: http://localhost:5173

## ⚠️ Important: Database Setup Required

Before you can use the application, you need to:

### 1. Set up the MySQL Database

Run the SQL schema file in your MySQL client:

```bash
mysql -u root -p < backend/database/schema.sql
```

Or manually execute the SQL file `backend/database/schema.sql` in MySQL Workbench or command line.

### 2. Create Admin User

After the database is set up, run the setup script:

```bash
cd backend
node scripts/setup.js
```

This will create:
- **Email**: admin@example.com
- **Password**: admin123

### 3. Access the Application

1. Open your browser and go to: **http://localhost:5173**
2. Login with the admin credentials above
3. Start using the system!

## 📝 Notes

- Make sure MySQL is running on port **3307** (or update `.env` file)
- The backend server must be running before the frontend can make API calls
- If you see connection errors, verify your database credentials in `backend/.env`

## 🛠️ Troubleshooting

### Database Connection Error
- Verify MySQL is running
- Check `backend/.env` has correct database credentials
- Ensure database `purchasesystem` exists

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Change port in `frontend/vite.config.ts`

### Can't Login
- Make sure you ran `node scripts/setup.js` to create the admin user
- Verify the database has the users table populated
