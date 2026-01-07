# God's Gift Bath Soap - Backend API

Internal stock management and billing system backend built with FastAPI and MongoDB.

## Features

- 🔐 **Authentication**: Admin login with JWT tokens
- 📦 **Product Management**: CRUD operations for products (Food & Soap categories)
- 📊 **Inventory Management**: Real-time stock tracking with low-stock alerts
- 🧾 **Billing System**: Create bills with automatic stock deduction
- 💰 **Payment Tracking**: Track payment status (Pending/Partial/Completed)
- 📈 **Dashboard Analytics**: Sales statistics and product-wise analysis

## Tech Stack

- **Framework**: FastAPI
- **Database**: MongoDB
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt

## Prerequisites

- Python 3.8+
- MongoDB Atlas account (or local MongoDB instance)
- pip (Python package manager)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Edit the `.env` file and update the MongoDB URI:

```env
MONGODB_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/gods_gift?retryWrites=true&w=majority
```

**Important**: Replace with your actual MongoDB connection string from MongoDB Atlas.

### 3. Seed the Database

Run the seed script to populate products:

```bash
python seed.py
```

This will:
- Create 15 products (4 Food items + 11 Soap items)
- Create inventory records for each product
- Create database indexes

### 4. Run the Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Default Admin Credentials

```
Username: admin
Password: admin123
```

**⚠️ Change these in production!** Update the `.env` file.

## API Endpoints

### Authentication
- `POST /auth/login` - Login and get JWT token

### Products
- `GET /products` - List all products
- `POST /products` - Create new product
- `GET /products/{id}` - Get product by ID
- `PUT /products/{id}` - Update product (including rate)
- `DELETE /products/{id}` - Soft delete product

### Inventory
- `GET /inventory` - List all inventory
- `GET /inventory/{product_id}` - Get stock for product
- `PUT /inventory/{product_id}` - Update stock manually
- `GET /inventory/low-stock` - Get low stock alerts

### Bills
- `GET /bills` - List all bills (with filters)
- `POST /bills` - Create new bill
- `GET /bills/{id}` - Get bill details

### Payments
- `GET /payments` - List all payments
- `GET /payments/{id}` - Get payment by ID
- `GET /payments/bill/{bill_id}` - Get payment for bill
- `PUT /payments/{id}` - Update payment

### Dashboard
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/analytics` - Get product-wise sales

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration settings
│   ├── database.py          # MongoDB connection
│   ├── models/              # Pydantic models
│   ├── routes/              # API endpoints
│   ├── services/            # Business logic
│   └── utils/               # Utilities (security, etc.)
├── seed.py                   # Database seed script
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
└── README.md                 # This file
```

## MongoDB Collections

- **users**: Admin authentication
- **products**: Product catalog
- **inventory**: Stock levels (single source of truth)
- **bills**: Sales transactions
- **payments**: Payment tracking
- **bill_sequences**: Auto-incrementing bill numbers

## Development

### Run with Auto-Reload

```bash
uvicorn app.main:app --reload
```

### View API Documentation

Open http://localhost:8000/docs in your browser for interactive API documentation.

## Production Deployment

1. Set `DEBUG=False` in `.env`
2. Use strong `JWT_SECRET_KEY`
3. Change admin credentials
4. Configure specific CORS origins in `main.py`
5. Use production-grade ASGI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Notes

- Product rates are manually configurable (not preset)
- Stock is automatically reduced when bills are created
- Payment status is automatically calculated based on amount paid
- Bill numbers are auto-generated: `BILL-YYYYMMDD-XXXX`

## Support

For issues or questions, refer to the `backend_schema_and_structure.txt` file for detailed database schema documentation.
