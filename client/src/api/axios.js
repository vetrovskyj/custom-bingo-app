import axios from 'axios';

const resolveBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!envUrl) return '/api';
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
};

const api = axios.create({
  baseURL: resolveBaseURL(),
});

// Add token to every request and set content type for JSON requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (config.data instanceof FormData) {
    // Let the browser set the multipart boundary header for FormData uploads
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
  } else {
    config.headers = config.headers || {};
    if (!config.headers['Content-Type'] && !config.headers['content-type']) {
      config.headers['Content-Type'] = 'application/json';
    }
  }

  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
