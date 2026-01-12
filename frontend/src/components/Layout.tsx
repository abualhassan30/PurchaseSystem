import { Outlet, Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from './ui/button'
import LanguageSwitcher from './LanguageSwitcher'
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Ruler,
  Users,
  LogOut,
  FolderTree,
  Building2,
  ClipboardList,
  FileCheck,
} from 'lucide-react'

export default function Layout() {
  const { t, ready } = useTranslation()
  const { user, logout } = useAuth()
  const location = useLocation()

  // Wait for i18n to be ready before rendering
  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '10px' }}>{t('common.loadingTranslations')}</div>
        </div>
      </div>
    )
  }

  const navItems = [
    { path: '/', label: t('nav.dashboard'), icon: LayoutDashboard },
    {
      path: '/purchase-orders',
      label: t('nav.purchaseOrders'),
      icon: ShoppingCart,
    },
    {
      path: '/inventory-counts',
      label: t('nav.inventoryCounts'),
      icon: ClipboardList,
    },
    {
      path: '/custody-closures',
      label: t('nav.custodyClosures'),
      icon: FileCheck,
    },
    { path: '/items', label: t('nav.items'), icon: Package },
    { path: '/categories', label: t('nav.categories'), icon: FolderTree },
    { path: '/units', label: t('nav.units'), icon: Ruler },
    { path: '/branches', label: t('nav.branches'), icon: Building2 },
    { path: '/users', label: t('nav.users'), icon: Users },
  ]

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">
            {t('nav.dashboard')}
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-secondary-50 text-secondary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <div className="mb-4 px-4 py-2 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-500 mt-1">
              {t(`users.roles.${user?.role}`)}
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 me-2" />
            {t('common.logout')}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">
            {navItems.find((item) => item.path === location.pathname)?.label ||
              t('nav.dashboard')}
          </h2>
          <LanguageSwitcher />
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
