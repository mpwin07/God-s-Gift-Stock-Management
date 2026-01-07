/**
 * API Configuration
 * Update API_BASE_URL with your backend server address
 */

// For development:
// - If testing on physical device, use your computer's IP address
// - If using Android emulator, use 10.0.2.2
// - If using iOS simulator, use localhost

// For web browser: use localhost
// For physical device (Expo Go): use your computer's IP
export const API_BASE_URL = 'http://192.168.31.157:8000';
export const API_ENDPOINTS = {
    // Auth
    LOGIN: '/auth/login',

    // Products
    PRODUCTS: '/products',
    PRODUCT_BY_ID: (id) => `/products/${id}`,

    // Inventory
    INVENTORY: '/inventory',
    INVENTORY_BY_PRODUCT: (productId) => `/inventory/${productId}`,
    LOW_STOCK: '/inventory/low-stock',

    // Bills
    BILLS: '/bills',
    BILL_BY_ID: (id) => `/bills/${id}`,

    // Payments
    PAYMENTS: '/payments',
    PAYMENT_BY_ID: (id) => `/payments/${id}`,
    PAYMENT_BY_BILL: (billId) => `/payments/bill/${billId}`,

    // Dashboard
    DASHBOARD_STATS: '/dashboard/stats',
    DASHBOARD_ANALYTICS: '/dashboard/analytics',

    // Expenses
    EXPENSES: '/expenses',
    EXPENSE_BY_ID: (id) => `/expenses/${id}`,
    EXPENSES_MONTHLY: '/expenses/monthly-totals',
};

export default {
    API_BASE_URL,
    API_ENDPOINTS,
};
