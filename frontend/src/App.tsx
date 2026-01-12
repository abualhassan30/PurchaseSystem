import { Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import PurchaseOrders from '@/pages/PurchaseOrders'
import Items from '@/pages/Items'
import Categories from '@/pages/Categories'
import Units from '@/pages/Units'
import Users from '@/pages/Users'
import Branches from '@/pages/Branches'
import InventoryCounts from '@/pages/InventoryCounts'
import CustodyClosures from '@/pages/CustodyClosures'
import Layout from '@/components/Layout'
import { Toaster } from '@/components/ui/toaster'
import i18n from '@/i18n/config'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const { t } = useTranslation()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="items" element={<Items />} />
        <Route path="categories" element={<Categories />} />
        <Route path="units" element={<Units />} />
        <Route path="users" element={<Users />} />
        <Route path="branches" element={<Branches />} />
        <Route path="inventory-counts" element={<InventoryCounts />} />
        <Route path="custody-closures" element={<CustodyClosures />} />
      </Route>
    </Routes>
  )
}

function AppContent() {
  const { t } = useTranslation()
  
  // Ensure direction is set on mount
  useEffect(() => {
    const lang = i18n.language || 'ar'
    const html = document.documentElement
    const dir = lang === 'ar' ? 'rtl' : 'ltr'
    html.setAttribute('dir', dir)
    html.setAttribute('lang', lang)
  }, [])

  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f9fafb',
          }}
        >
          <div>{t('common.loading')}</div>
        </div>
      }
    >
      <ErrorBoundary>
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
          <AppRoutes />
          <Toaster />
        </div>
      </ErrorBoundary>
    </Suspense>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
