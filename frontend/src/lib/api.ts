import axios, { AxiosError } from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout to prevent hanging
})

// Request interceptor - Add auth token to all requests
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    try {
      const token = localStorage.getItem('token')
      
      // If token exists, add it to request headers
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.warn('Failed to read token from localStorage:', error)
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors and authentication
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized errors
    if (error.response?.status === 401) {
      console.warn('Authentication failed - clearing token and redirecting to login')
      
      // Clear stored auth data
      try {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
      } catch (storageError) {
        console.warn('Failed to clear localStorage:', storageError)
      }
      
      // Remove auth header
      delete api.defaults.headers.common['Authorization']
      
      // Redirect to login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    // Log error for debugging
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        hasAuth: !!error.config?.headers?.Authorization,
      })
    } else if (error.request) {
      // Request made but no response received
      console.error('API Request Error: No response received (backend might be down)', {
        url: error.config?.url,
      })
    } else {
      // Error setting up request
      console.error('API Setup Error:', error.message)
    }
    return Promise.reject(error)
  }
)

export default api
