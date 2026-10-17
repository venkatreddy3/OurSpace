import axios from 'axios';
import { isFirebaseMocked } from './firebase.js';

// Create pre-configured Axios client
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request Interceptor: Attach authentication tokens or log payloads if needed
api.interceptors.request.use(
  (config) => {
    const isMock = isFirebaseMocked || import.meta.env.VITE_ENABLE_MOCK_AUTH === 'true';
    if (isMock) {
      config.headers.Authorization = 'Bearer mock-dev-token';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Parse errors or session timeouts
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized.');
    }
    return Promise.reject(error);
  }
);

export default api;
