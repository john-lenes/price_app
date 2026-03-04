import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
  },
}

// ── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
}

// ── Products ─────────────────────────────────────────────────────────────────
export const productsApi = {
  search: (query, retailer) =>
    api.get('/products/search', { params: { q: query, retailer } }),
  list: (skip = 0, limit = 50) =>
    api.get('/products/', { params: { skip, limit } }),
  get: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  checkNow: (id) => api.post(`/products/${id}/check-now`),
}

// ── Price History ─────────────────────────────────────────────────────────────
export const priceHistoryApi = {
  get: (productId, limit = 500) =>
    api.get(`/price-history/${productId}`, { params: { limit } }),
}

// ── Alerts ────────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: (productId, skip = 0, limit = 100) =>
    api.get('/alerts/', { params: { product_id: productId, skip, limit } }),
}

export default api
