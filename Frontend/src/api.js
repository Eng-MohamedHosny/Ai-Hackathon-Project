import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sehatek_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api

export const authApi = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
  logout: () => api.post('/logout'),
}

export const conversationsApi = {
  list: () => api.get('/conversations'),
  create: () => api.post('/conversations'),
  get: (id) => api.get(`/conversations/${id}`),
  delete: (id) => api.delete(`/conversations/${id}`),
}

export const messagesApi = {
  send: (text, signal) =>
    fetch(`${API_BASE_URL}/messages?stream=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${localStorage.getItem('sehatek_token')}`,
      },
      body: JSON.stringify({ message: text }),
      signal,
    }),

  sendToConversation: (conversationId, text, signal) =>
    fetch(`${API_BASE_URL}/conversations/${conversationId}/messages?stream=1`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${localStorage.getItem('sehatek_token')}`,
      },
      body: JSON.stringify({ message: text }),
      signal,
    }),
}
