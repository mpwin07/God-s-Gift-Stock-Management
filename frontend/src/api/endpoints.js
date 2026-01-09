import apiClient from './client';
import { API_ENDPOINTS } from '../config/api';

/**
 * API Service Functions
 * All API calls are centralized here
 */

// ============ AUTH ============
export const login = async (username, password) => {
    const response = await apiClient.post(API_ENDPOINTS.LOGIN, { username, password });
    return response.data;
};

// ============ PRODUCTS ============
export const getProducts = async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCTS, { params });
    return response.data;
};

export const createProduct = async (productData) => {
    const response = await apiClient.post(API_ENDPOINTS.PRODUCTS, productData);
    return response.data;
};

export const getProductById = async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.PRODUCT_BY_ID(id));
    return response.data;
};

export const updateProduct = async (id, productData) => {
    const response = await apiClient.put(API_ENDPOINTS.PRODUCT_BY_ID(id), productData);
    return response.data;
};

export const deleteProduct = async (id) => {
    await apiClient.delete(API_ENDPOINTS.PRODUCT_BY_ID(id));
};

// ============ INVENTORY ============
export const getInventory = async () => {
    const response = await apiClient.get(API_ENDPOINTS.INVENTORY);
    return response.data;
};

export const getInventoryByProduct = async (productId) => {
    const response = await apiClient.get(API_ENDPOINTS.INVENTORY_BY_PRODUCT(productId));
    return response.data;
};

export const updateInventory = async (productId, stockData) => {
    const response = await apiClient.put(API_ENDPOINTS.INVENTORY_BY_PRODUCT(productId), stockData);
    return response.data;
};

export const getLowStockAlerts = async () => {
    const response = await apiClient.get(API_ENDPOINTS.LOW_STOCK);
    return response.data;
};

// ============ BILLS ============
export const getBills = async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.BILLS, { params });
    return response.data;
};

export const createBill = async (billData) => {
    const response = await apiClient.post(API_ENDPOINTS.BILLS, billData);
    return response.data;
};

export const getBillById = async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.BILL_BY_ID(id));
    return response.data;
};

export const deleteBill = async (id) => {
    await apiClient.delete(API_ENDPOINTS.BILL_BY_ID(id));
};

export const deleteBillItem = async (billId, itemIndex) => {
    const response = await apiClient.delete(`${API_ENDPOINTS.BILL_BY_ID(billId)}/items/${itemIndex}`);
    return response.data;
};

// ============ PAYMENTS ============
export const getPayments = async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENTS, { params });
    return response.data;
};

export const getPaymentById = async (id) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENT_BY_ID(id));
    return response.data;
};

export const getPaymentByBill = async (billId) => {
    const response = await apiClient.get(API_ENDPOINTS.PAYMENT_BY_BILL(billId));
    return response.data;
};

export const updatePayment = async (id, paymentData) => {
    const response = await apiClient.put(API_ENDPOINTS.PAYMENT_BY_ID(id), paymentData);
    return response.data;
};

// ============ DASHBOARD ============
export const getDashboardStats = async () => {
    const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_STATS);
    return response.data;
};

export const getDashboardAnalytics = async (days = 30) => {
    const response = await apiClient.get(API_ENDPOINTS.DASHBOARD_ANALYTICS, { params: { days } });
    return response.data;
};

// ============ EXPENSES ============
export const getExpenses = async (params = {}) => {
    const response = await apiClient.get(API_ENDPOINTS.EXPENSES, { params });
    return response.data;
};

export const createExpense = async (expenseData) => {
    const response = await apiClient.post(API_ENDPOINTS.EXPENSES, expenseData);
    return response.data;
};

export const deleteExpense = async (id) => {
    await apiClient.delete(API_ENDPOINTS.EXPENSE_BY_ID(id));
};

export const getExpenseMonthlyTotals = async () => {
    const response = await apiClient.get(API_ENDPOINTS.EXPENSES_MONTHLY);
    return response.data;
};

export default {
    login,
    getProducts,
    createProduct,
    getProductById,
    updateProduct,
    deleteProduct,
    getInventory,
    getInventoryByProduct,
    updateInventory,
    getLowStockAlerts,
    getBills,
    createBill,
    getBillById,
    deleteBill,
    deleteBillItem,
    getPayments,
    getPaymentById,
    getPaymentByBill,
    updatePayment,
    getDashboardStats,
    getDashboardAnalytics,
    getExpenses,
    createExpense,
    deleteExpense,
    getExpenseMonthlyTotals,
};
