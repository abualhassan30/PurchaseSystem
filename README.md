# Purchasing Management System

A bilingual (Arabic/English) purchasing management system built with React, TypeScript, and MySQL.

## Features

- 🌐 **Bilingual Support**: Arabic (default) and English with RTL/LTR support
- 📦 **Purchase Order Management**: Create and manage purchase orders with automatic calculations
- 📋 **Item Management**: Manage items with default units and pricing
- 📏 **Unit Management**: Flexible unit conversion system
- 👥 **User Management**: Role-based access control (Admin, Purchasing Officer, Viewer)
- 🔐 **Authentication**: Secure JWT-based authentication
- 🎨 **Modern UI**: Built with shadcn/ui and Tailwind CSS

## Technology Stack

### Frontend
- React.js with TypeScript
- Tailwind CSS
- shadcn/ui components
- i18next for internationalization
- React Router for navigation

### Backend
- Node.js with Express
- MySQL database
- JWT authentication
- bcrypt for password hashing

## Prerequisites

- Node.js (v18 or higher)
- MySQL (v8.0 or higher)
- npm or yarn

## Installation

### 1. Database Setup

1. Create the database and tables by running the SQL schema:

```bash
mysql -u root -p < backend/database/schema.sql
```

Or manually execute the SQL file in your MySQL client.

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=purchasesystem

PORT=3000
JWT_SECRET=your-secret-key-change-in-production
```

4. Run the setup script to create default admin user:
```bash
node scripts/setup.js
```

5. Start the backend server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend will run on `http://localhost:3000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
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

The frontend will run on `http://localhost:5173`

## Default Login Credentials

- **Email**: admin@example.com
- **Password**: admin123

⚠️ **Important**: Change the default password after first login!

## Project Structure

```
PurchaseSystem/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── contexts/     # React contexts (Auth, etc.)
│   │   ├── i18n/         # Internationalization files
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main app component
│   └── package.json
├── backend/           # Express backend API
│   ├── database/        # Database schema and connection
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── scripts/         # Setup and utility scripts
│   └── server.js        # Main server file
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - Get all users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Units
- `GET /api/units` - Get all units
- `POST /api/units` - Create unit
- `PUT /api/units/:id` - Update unit
- `DELETE /api/units/:id` - Delete unit

### Items
- `GET /api/items` - Get all items
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Purchase Orders
- `GET /api/purchase-orders` - Get all orders
- `GET /api/purchase-orders/:id` - Get order details
- `POST /api/purchase-orders` - Create order (Admin/Purchasing Officer)

## User Roles

- **Admin**: Full access to all features
- **Purchasing Officer**: Can create and manage purchase orders
- **Viewer**: Read-only access

## Development

### Frontend Development
```bash
cd frontend
npm run dev
```

### Backend Development
```bash
cd backend
npm run dev
```

## Building for Production

### Frontend
```bash
cd frontend
npm run build
```

### Backend
The backend is ready for production. Make sure to:
- Set a strong `JWT_SECRET` in `.env`
- Use environment variables for all sensitive data
- Enable HTTPS in production
- Set up proper database backups

## Notes

- The database uses `utf8mb4` encoding to fully support Arabic characters
- All foreign keys are properly configured for data integrity
- The system automatically calculates line totals and order totals
- Purchase order numbers are auto-generated in the format: `PO-YYYYMMDD-XXXX`

## License

This project is for educational purposes.
