# God's Gift Bath Soap - Frontend

React Native mobile application for internal stock management and billing.

## Features

- 🔐 **Authentication**: Secure login with JWT tokens
- 📊 **Dashboard**: Real-time sales stats and analytics
- 📦 **Product Management**: Add, edit, and manage products with rates
- 🧾 **Billing**: Create bills with automatic stock deduction
- 💰 **Payment Tracking**: Track and update payment status
- 📈 **Stock Management**: Monitor inventory and low stock alerts

## Tech Stack

- **Framework**: React Native (Expo)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **API Client**: Axios
- **Charts**: React Native Chart Kit

## Prerequisites

- Node.js 16+
- npm or yarn
- Expo CLI
- Expo Go app (for testing on physical device)

## Setup Instructions

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure API Endpoint

Edit `src/config/api.js` and update the `API_BASE_URL`:

```javascript
export const API_BASE_URL = 'http://YOUR_COMPUTER_IP:8000';
```

**Important**: 
- Replace `YOUR_COMPUTER_IP` with your actual IP address
- For Android emulator, use `http://10.0.2.2:8000`
- For iOS simulator, use `http://localhost:8000`
- For physical device, use your computer's local IP (e.g., `http://192.168.1.100:8000`)

### 3. Start the App

```bash
npm start
```

This will start the Expo development server. You can then:
- Scan the QR code with Expo Go app (Android/iOS)
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator
- Press `w` to open in web browser

## Project Structure

```
frontend/
├── App.js                    # Main app entry point
├── src/
│   ├── config/
│   │   ├── theme.js          # God's Gift color palette & design tokens
│   │   └── api.js            # API configuration
│   ├── api/
│   │   ├── client.js         # Axios instance with interceptors
│   │   └── endpoints.js      # All API functions
│   ├── context/
│   │   └── AuthContext.js    # Authentication state management
│   ├── components/
│   │   ├── Button.js         # Reusable button component
│   │   ├── Card.js           # Card container
│   │   ├── Input.js          # Input field with label
│   │   ├── Header.js         # Screen header
│   │   ├── StatsCard.js      # Dashboard stats card
│   │   ├── ProductCard.js    # Product list item
│   │   └── BillItem.js       # Bill item display
│   ├── screens/
│   │   ├── LoginScreen.js
│   │   ├── DashboardScreen.js
│   │   ├── ProductsScreen.js
│   │   ├── NewBillScreen.js
│   │   ├── BillsHistoryScreen.js
│   │   ├── BillDetailScreen.js
│   │   └── StockAlertsScreen.js
│   └── navigation/
│       └── AppNavigator.js   # Navigation structure
└── package.json
```

## Color Palette

The app uses God's Gift brand colors:

| Color | Hex | Usage |
|-------|-----|-------|
| Light Pink | `#FDEAEF` | Background |
| Coral | `#FF8F8F` | Secondary accents |
| Red | `#D72F3F` | Primary buttons |
| Dark Red | `#941A1D` | Text, headers |
| Deep Maroon | `#5F1010` | Dark emphasis |

## Screens

### Login
- Admin authentication
- JWT token storage
- Auto-login on app restart

### Dashboard
- Today's sales and bill count
- Pending payments summary
- Low stock alerts count
- Top 5 products (last 30 days)
- Quick action buttons

### Products
- List all products
- Add new products
- Edit product details (name, rate, min stock)
- View by category

### New Bill
- Select customer details
- Add multiple items
- Auto-calculate totals
- Automatic stock deduction
- Generate bill number

### Bills History
- View all bills
- Filter by date, customer, payment status
- Tap to view details

### Bill Details
- View complete bill information
- See all items
- Update payment status
- Track balance due

### Stock Management
- View all inventory levels
- Low stock alerts (horizontal scroll)
- Update stock manually
- Real-time stock tracking

## Default Credentials

```
Username: admin
Password: admin123
```

## Development

### Run on Physical Device

1. Install Expo Go app from App Store / Play Store
2. Ensure phone and computer are on same WiFi network
3. Run `npm start`
4. Scan QR code with Expo Go

### Run on Emulator

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

## API Integration

All API calls are centralized in `src/api/endpoints.js`. The app automatically:
- Adds JWT token to all requests
- Handles 401 errors (auto-logout)
- Manages loading states
- Shows error alerts

## State Management

- **Authentication**: Context API (`AuthContext`)
- **Screen State**: Local state with `useState`
- **Data Fetching**: `useFocusEffect` for auto-refresh on screen focus

## Notes

- All monetary values displayed in Indian Rupees (₹)
- Dates formatted in Indian locale
- Pull-to-refresh on all list screens
- Offline-first approach (bills marked as "offline")
- Stock is automatically reduced when bills are created
- Payment status auto-calculated based on amount paid

## Troubleshooting

### Cannot connect to backend
- Verify backend is running on port 8000
- Check `API_BASE_URL` in `src/config/api.js`
- Ensure firewall allows connections
- For physical device, use computer's local IP

### Login fails
- Verify backend is seeded with admin user
- Check network connection
- View console logs for error details

### App crashes on startup
- Clear Expo cache: `expo start -c`
- Delete `node_modules` and reinstall
- Check for syntax errors in recent changes

## Production Build

### Android APK
```bash
expo build:android
```

### iOS IPA
```bash
expo build:ios
```

## Support

For issues or questions, refer to the backend README and schema documentation.
