import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://enterprise-hrms-payroll-automation-2jio.onrender.com/api',
  withCredentials: true, // Enables sending secure HTTP-only cookies automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

// Automatically attach JWT token from localStorage to satisfy cross-domain browser security
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
