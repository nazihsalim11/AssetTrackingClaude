import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
export const api = axios.create({ baseURL: apiBaseUrl });

// Uploaded files (QR codes, documents) come back as paths relative to the
// server (e.g. /uploads/qrcodes/x.png), not the API prefix, so they need the
// server's origin rather than the API base URL when client and server are
// deployed to different domains (client on Vercel, server on Railway).
const serverOrigin = apiBaseUrl.replace(/\/api\/?$/, '');
export function resolveFileUrl(url: string): string {
  if (!url || /^https?:\/\//.test(url)) return url;
  return `${serverOrigin}${url}`;
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);
