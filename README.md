# God's Gift Bath Soap - Complete Application

Complete internal stock management and billing system with FastAPI backend and React Native frontend.

## 📁 Project Structure

```
God's Gift/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── main.py                   # FastAPI app entry
│   │   ├── config.py                 # Configuration
│   │   ├── database.py               # MongoDB connection
│   │   ├── models/                   # Pydantic models
│   │   ├── routes/                   # API endpoints
│   │   ├── services/                 # Business logic
│   │   └── utils/                    # Security utilities
│   ├── seed.py                       # Database seeding
│   ├── requirements.txt
│   ├── .env                          # Environment variables
│   └── README.md
│
├── frontend/                         # React Native Frontend
│   ├── src/
│   │   ├── config/                   # Theme & API config
│   │   ├── api/                      # API client
│   │   ├── context/                  # Auth context
│   │   ├── components/               # Reusable components
│   │   ├── screens/                  # All screens
│   │   └── navigation/               # Navigation setup
│   ├── App.js
│   ├── package.json
│   └── README.md
│
└── backend_schema_and_structure.txt  # Database schema docs
```

## 🚀 Quick Start

### Backend Setup

1. **Install Python dependencies**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Configure MongoDB**
   
   Edit `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/gods_gift
   ```

3. **Seed the database**
   ```bash
   python seed.py
   ```

4. **Start the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   API will be available at: http://localhost:8000

### Frontend Setup

1. **Install Node dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure API endpoint**
   
   Edit `frontend/src/config/api.js`:
   ```javascript
   export const API_BASE_URL = 'http://YOUR_IP:8000';
   ```

3. **Start Expo**
   ```bash
   npm start
   ```

4. **Run on device**
   - Scan QR code with Expo Go app
   - Or press `a` for Android emulator
   - Or press `i` for iOS simulator

## 🔑 Default Credentials

```
Username: admin
Password: admin123
```

## 📦 Pre-seeded Products

### Food Products (4)
- ABC Supersip
- Red Banana Supersip
- Kavuni Arisi Drink
- Amla Candy

### Soap Products (11)
- Neem Soap
- Kuppameni Soap
- Charcoal Soap
- Carrot Soap
- Beetroot Soap
- Turmeric Soap
- Nalangumavu Soap
- Aloe Vera Soap
- Paneer Rose Soap
- Rosemary Soap
- Customized Soap

**Note**: Product rates are NOT preset - admin must set them manually through the Products screen.

## 🎨 Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Light Pink | `#FDEAEF` | Background |
| Coral | `#FF8F8F` | Secondary |
| Red | `#D72F3F` | Primary |
| Dark Red | `#941A1D` | Text |
| Deep Maroon | `#5F1010` | Emphasis |

## ✨ Features

### ✅ Implemented

- [x] Admin authentication with JWT
- [x] Product CRUD with manual rate setting
- [x] Real-time inventory tracking
- [x] Bill creation with auto stock deduction
- [x] Payment status tracking (Pending/Partial/Completed)
- [x] Dashboard with sales analytics
- [x] Low stock alerts
- [x] Product-wise sales analysis
- [x] Bills history with filtering
- [x] Mobile-first responsive design

### 🔮 Future Enhancements

- [ ] E-commerce integration (schema ready)
- [ ] Barcode scanning
- [ ] Receipt printing
- [ ] Multi-user roles
- [ ] Advanced reporting
- [ ] Customer management

## 📊 Database Collections

- **users**: Admin authentication
- **products**: Product catalog (Food & Soap)
- **inventory**: Stock levels (single source of truth)
- **bills**: Sales transactions
- **payments**: Payment tracking
- **bill_sequences**: Auto-incrementing bill numbers

## 🔗 API Endpoints

### Authentication
- `POST /auth/login`

### Products
- `GET /products`
- `POST /products`
- `PUT /products/{id}`
- `DELETE /products/{id}`

### Inventory
- `GET /inventory`
- `PUT /inventory/{product_id}`
- `GET /inventory/low-stock`

### Bills
- `GET /bills`
- `POST /bills`
- `GET /bills/{id}`

### Payments
- `GET /payments`
- `PUT /payments/{id}`

### Dashboard
- `GET /dashboard/stats`
- `GET /dashboard/analytics`

## 📱 Mobile Screens

1. **Login** - Admin authentication
2. **Dashboard** - Sales stats & quick actions
3. **Products** - Product management
4. **New Bill** - Create sales bills
5. **Bills History** - View all bills
6. **Bill Details** - View & update payments
7. **Stock Alerts** - Manage inventory

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python)
- MongoDB
- JWT Authentication
- Pydantic validation

**Frontend:**
- React Native (Expo)
- React Navigation
- Axios
- AsyncStorage

## 📝 Important Notes

1. **Stock Management**: Inventory is the single source of truth. Stock automatically reduces when bills are created.

2. **Bill Numbers**: Auto-generated in format `BILL-YYYYMMDD-XXXX`

3. **Payment Status**: Automatically calculated:
   - Pending: No payment
   - Partial: Some payment made
   - Completed: Fully paid

4. **E-commerce Ready**: Database schema supports future online orders without redesign.

5. **Rates**: Product rates are manually configurable - NOT preset during seeding.

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens for authentication
- Input validation with Pydantic
- CORS configured for mobile app
- Stock validation before bill creation

## 📖 Documentation

- **Backend**: See `backend/README.md`
- **Frontend**: See `frontend/README.md`
- **Database Schema**: See `backend_schema_and_structure.txt`

## 🐛 Troubleshooting

### Backend won't start
- Check MongoDB URI in `.env`
- Verify Python dependencies installed
- Check port 8000 is available

### Frontend can't connect
- Verify backend is running
- Check `API_BASE_URL` in `frontend/src/config/api.js`
- Ensure phone and computer on same network
- Check firewall settings

### Login fails
- Run `python seed.py` to create admin user
- Verify credentials: admin / admin123
- Check backend logs for errors

## 📞 Support

This is a production-ready application built for daily business use. All features are fully functional and tested.

For questions about:
- **Database schema**: See `backend_schema_and_structure.txt`
- **API usage**: Visit http://localhost:8000/docs
- **Frontend setup**: See `frontend/README.md`

---

**Built for God's Gift Bath Soap** 🧼
