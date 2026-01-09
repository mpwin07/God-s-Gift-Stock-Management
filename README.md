# God's Gift - Stock Management & Billing System

A modern, full-stack inventory management and billing application built for God's Gift Soaps and Food.

## 🚀 Live Demo

- **Backend API**: [https://god-s-gift-stock-management-8bz6.onrender.com](https://god-s-gift-stock-management-8bz6.onrender.com)
- **Mobile App**: [Download APK](https://expo.dev/accounts/mpwin07/projects/gods-gift-app/builds/56e99eee-c968-47d8-97e0-854ab113fb5f)

## 📱 Features

- **Product Management**: Add, edit, and track products with rates and inventory
- **Inventory Tracking**: Real-time stock monitoring with low-stock alerts
- **Billing System**: Create bills, manage customer payments, and track pending amounts
- **Expense Management**: Record and categorize business expenses
- **Analytics Dashboard**: Visual insights into sales, revenue, and business metrics
- **Mobile-First**: React Native app for on-the-go access

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB Atlas
- **Authentication**: JWT tokens
- **Hosting**: Render

### Frontend
- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: Context API
- **UI**: Custom components with modern design
- **Build**: EAS Build

## 📋 Prerequisites

- Python 3.10+
- Node.js 16+
- MongoDB Atlas account
- Expo account (for mobile builds)

## 🚀 Getting Started

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/mpwin07/God-s-Gift-Stock-Management.git
   cd God-s-Gift-Stock-Management/backend
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET_KEY=your_secret_key
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ADMIN_USERNAME=your_admin_username
   ADMIN_PASSWORD=your_admin_password
   ADMIN_FULL_NAME=Admin Name
   APP_NAME=God's Gift Soaps and Food
   DEBUG=True
   ```

4. **Run the development server**
   ```bash
   uvicorn app.main:app --reload
   ```

   API will be available at `http://localhost:8000`
   - API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Update API endpoint**
   
   Edit `src/config/api.js`:
   ```javascript
   export const API_BASE_URL = 'http://your-backend-url';
   ```

4. **Start Expo development server**
   ```bash
   npx expo start
   ```

5. **Run on device**
   - Scan QR code with Expo Go app (iOS/Android)
   - Or press `a` for Android emulator / `i` for iOS simulator

## 📦 Building for Production

### Backend Deployment (Render)

The backend is configured for automatic deployment to Render:

1. Push code to GitHub
2. Render will auto-deploy from the `backend` directory
3. Set environment variables in Render dashboard

### Mobile App Build

Build production APK using EAS:

```bash
cd frontend
eas build --platform android --profile preview
```

## 🔐 Default Credentials

```
Username: godsgiftadmin
Password: godsgift1234
```

⚠️ **Important**: Change these credentials in production!

## 📁 Project Structure

```
God-s-Gift-Stock-Management/
├── backend/
│   ├── app/
│   │   ├── routes/          # API endpoints
│   │   ├── models/          # Data models
│   │   ├── database.py      # MongoDB connection
│   │   ├── config.py        # Configuration
│   │   └── main.py          # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── render.yaml          # Render deployment config
│
└── frontend/
    ├── src/
    │   ├── screens/         # App screens
    │   ├── components/      # Reusable components
    │   ├── context/         # State management
    │   ├── api/             # API client
    │   └── config/          # Configuration
    ├── assets/              # Images and icons
    ├── app.json             # Expo configuration
    └── package.json         # Dependencies
```

## 🔧 Key API Endpoints

- `POST /auth/login` - User authentication
- `GET /products` - List all products
- `POST /products` - Create new product
- `GET /inventory` - Get inventory status
- `POST /bills` - Create new bill
- `GET /dashboard/stats` - Dashboard statistics
- `GET /expenses` - List expenses

Full API documentation available at `/docs` when running the backend.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software for God's Gift Soaps and Food.

## 👤 Author

**Manish P**
- GitHub: [@mpwin07](https://github.com/mpwin07)

## 🙏 Acknowledgments

- Built for God's Gift Soaps and Food business management
- Deployed on Render free tier
- Mobile app built with Expo EAS
