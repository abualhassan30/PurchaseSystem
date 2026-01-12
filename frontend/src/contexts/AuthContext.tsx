import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import api from '@/lib/api'
import { toast } from '@/components/ui/toaster'

interface User {
  id: number
  firstName: string
  lastName: string
  email: string
  role: 'admin' | 'purchasingOfficer' | 'viewer'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safe localStorage access
    const getToken = (): string | null => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem('token')
        }
      } catch (error) {
        console.warn('localStorage access failed:', error)
      }
      return null
    }

    const removeToken = (): void => {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('token')
        }
      } catch (error) {
        console.warn('localStorage remove failed:', error)
      }
    }

    const token = getToken()
    
    if (token) {
      // Token will be added automatically by the request interceptor in api.ts
      // Verify token and get user - with timeout to prevent blocking
      const timeoutId = setTimeout(() => {
        setLoading(false)
      }, 5000) // 5 second timeout

      api
        .get('/auth/me')
        .then((res) => {
          clearTimeout(timeoutId)
          if (res.data && res.data.id) {
            setUser(res.data)
          } else {
            throw new Error('Invalid user data received')
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId)
          console.error('Auth check failed:', error)
          removeToken()
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      // Set loading to false immediately if no token
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, user } = res.data
      
      if (!token || !user) {
        throw new Error('Invalid response from server')
      }

      // Safe localStorage access
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('token', token)
          window.localStorage.setItem('user', JSON.stringify(user))
        }
      } catch (storageError) {
        console.warn('Failed to save token to localStorage:', storageError)
        // Continue even if localStorage fails
      }

      // Token will be added automatically by the request interceptor in api.ts
      setUser(user)
      return true
    } catch (error: any) {
      console.error('Login error:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Login failed',
        variant: 'destructive',
      })
      return false
    }
  }

  const logout = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('token')
        window.localStorage.removeItem('user')
      }
    } catch (error) {
      console.warn('Failed to remove token from localStorage:', error)
    }
    // Auth header will be removed automatically by the interceptor
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
