import axios from 'axios';

// Create a configured axios instance
const api = axios.create({
  baseURL: 'http://localhost:5001',
});

// Interceptor to add auth token
api.interceptors.request.use((config) => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    const user = JSON.parse(userStr);
    if (user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// API calls specifically for Expenses
export const getExpensesAPI = () => api.get('/api/expenses');
export const addExpenseAPI = (expenseData) => api.post('/api/expenses', expenseData);
export const editExpenseAPI = (id, expenseData) => api.put(`/api/expenses/${id}`, expenseData);
export const removeExpenseAPI = (id) => api.delete(`/api/expenses/${id}`);

// API calls for Chat
export const getChatAPI = () => api.get('/api/chat');
export const sendChatAPI = (message) => api.post('/api/chat', { message });
export const getLatestInsightAPI = () => api.get('/api/chat/latest-insight');

// API calls for Auth Profile
export const getProfileAPI = () => api.get('/api/auth/me');
export const updateProfileAPI = (data) => api.put('/api/auth/profile', data);

// API calls for Portfolio
export const getPortfolioAPI = () => api.get('/api/portfolio');
export const addPortfolioAPI = (data) => api.post('/api/portfolio', data);
export const editPortfolioAPI = (id, data) => api.put(`/api/portfolio/${id}`, data);
export const removePortfolioAPI = (id) => api.delete(`/api/portfolio/${id}`);

// API calls for Stock Search & Quotes
export const searchStocksAPI = (q) => api.get('/api/stock/search', { params: { q } });
export const getStockQuoteAPI = (symbol) => api.get('/api/stock/quote', { params: { symbol } });

export default api;
