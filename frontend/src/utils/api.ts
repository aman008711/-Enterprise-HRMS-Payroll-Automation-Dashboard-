import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Enables sending secure HTTP-only cookies automatically
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
