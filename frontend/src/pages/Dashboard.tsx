import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import api from '@/lib/api'
import { formatNumber, formatDate } from '@/lib/format'
import { getLocalizedName } from '@/lib/i18n-utils'
import { 
  ShoppingCart, 
  Package, 
  Ruler, 
  Users, 
  Building2, 
  ClipboardList,
  FolderTree,
  DollarSign,
  FileText
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import i18n from '@/i18n/config'

interface DashboardStats {
  counts: {
    purchaseOrders: number
    items: number
    units: number
    users: number
    branches: number
    inventoryCounts: number
    categories: number
  }
  totals: {
    purchaseOrderValue: number
    inventoryValue: number
  }
  ordersByStatus: Record<string, number>
  inventoryByStatus: Record<string, number>
  recentOrders: Array<{
    id: number
    poNumber: string
    orderDate: string
    totalAmount: number
    status: string
    branchNameAr?: string
    branchNameEn?: string
    createdByName: string
  }>
  monthlyOrders: Array<{
    month: string
    count: number
    totalAmount: number
  }>
}

export default function Dashboard() {
  const { t, ready } = useTranslation()
  const { user } = useAuth()
  const isArabic = i18n.language === 'ar'
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  // Debug: Log stats when they change
  useEffect(() => {
    if (stats) {
      console.log('Dashboard stats state updated:', stats)
      console.log('Counts:', stats.counts)
      console.log('Totals:', stats.totals)
      console.log('Orders by status:', stats.ordersByStatus)
      console.log('Inventory by status:', stats.inventoryByStatus)
    }
  }, [stats])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      console.log('Loading dashboard stats...')
      const res = await api.get('/dashboard/stats')
      console.log('=== FRONTEND: Dashboard stats API response ===')
      console.log('Full response object:', res)
      console.log('Response data:', res.data)
      console.log('Response data type:', typeof res.data)
      console.log('Response data keys:', res.data ? Object.keys(res.data) : 'null')
      
      if (res.data) {
        console.log('Counts object:', res.data.counts)
        console.log('Counts type:', typeof res.data.counts)
        console.log('Counts keys:', res.data.counts ? Object.keys(res.data.counts) : 'null')
        console.log('Purchase Orders count:', res.data.counts?.purchaseOrders, 'type:', typeof res.data.counts?.purchaseOrders)
        console.log('Items count:', res.data.counts?.items, 'type:', typeof res.data.counts?.items)
        console.log('Units count:', res.data.counts?.units, 'type:', typeof res.data.counts?.units)
        
        console.log('Totals object:', res.data.totals)
        console.log('Orders by status:', res.data.ordersByStatus)
        console.log('Inventory by status:', res.data.inventoryByStatus)
        console.log('Recent orders:', res.data.recentOrders)
        
        // Verify data structure
        if (!res.data.counts) {
          console.warn('⚠️ Response missing counts object')
        } else {
          console.log('✅ Counts object exists')
        }
        if (!res.data.totals) {
          console.warn('⚠️ Response missing totals object')
        } else {
          console.log('✅ Totals object exists')
        }
        
        console.log('Setting stats with:', JSON.stringify(res.data, null, 2))
        setStats(res.data)
        console.log('=== END FRONTEND RESPONSE ===')
      } else {
        console.error('❌ Empty response from API')
        throw new Error('Empty response from API')
      }
    } catch (error: any) {
      console.error('Failed to load dashboard stats:', error)
      console.error('Error response:', error.response)
      console.error('Error details:', error.response?.data || error.message)
      console.error('Error status:', error.response?.status)
      
      // Set default stats on error but keep trying
      setStats({
        counts: {
          purchaseOrders: 0,
          items: 0,
          units: 0,
          users: 0,
          branches: 0,
          inventoryCounts: 0,
          categories: 0,
        },
        totals: {
          purchaseOrderValue: 0,
          inventoryValue: 0,
        },
        ordersByStatus: {},
        inventoryByStatus: {},
        recentOrders: [],
        monthlyOrders: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'PENDING_REVIEW':
        return 'bg-yellow-100 text-yellow-800'
      case 'PENDING_APPROVAL':
        return 'bg-orange-100 text-orange-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      case 'REJECTED':
        return 'bg-red-100 text-red-800'
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    if (!status) return t('purchaseOrders.statusDraft')
    const statusMap: Record<string, string> = {
      'DRAFT': t('purchaseOrders.statusDraft'),
      'PENDING_REVIEW': t('purchaseOrders.statusPendingReview'),
      'PENDING_APPROVAL': t('purchaseOrders.statusPendingApproval'),
      'APPROVED': t('purchaseOrders.statusApproved'),
      'REJECTED': t('purchaseOrders.statusRejected'),
      'COMPLETED': t('purchaseOrders.statusCompleted'),
      'CANCELLED': t('purchaseOrders.statusCancelled'),
    }
    return statusMap[status] || status
  }

  const getInventoryStatusLabel = (status: string) => {
    if (!status) return t('inventoryCounts.statusDraft')
    const statusMap: Record<string, string> = {
      'DRAFT': t('inventoryCounts.statusDraft'),
      'COMPLETED': t('inventoryCounts.statusCompleted'),
      'APPROVED': t('inventoryCounts.statusApproved'),
    }
    return statusMap[status] || status
  }

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div>{t('common.loadingTranslations')}</div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('common.welcome')}, {user?.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">{t('nav.dashboard')}</p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div>{t('common.loading')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('common.welcome')}, {user?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">{t('nav.dashboard')}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.purchaseOrders')}
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.purchaseOrders ?? 0}</div>
            <p className="text-xs text-gray-500">{t('common.totalOrders')}</p>
            {stats && stats.totals.purchaseOrderValue > 0 && (
              <p className="text-xs text-green-600 mt-1">
                {formatNumber(stats.totals.purchaseOrderValue)} {t('dashboard.totalValue')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.items')}
            </CardTitle>
            <Package className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.items ?? 0}</div>
            <p className="text-xs text-gray-500">{t('common.totalItems')}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.units')}
            </CardTitle>
            <Ruler className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.units ?? 0}</div>
            <p className="text-xs text-gray-500">{t('common.totalUnits')}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.users')}
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.users ?? 0}</div>
            <p className="text-xs text-gray-500">{t('common.totalUsers')}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.branches')}
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.branches ?? 0}</div>
            <p className="text-xs text-gray-500">{t('dashboard.activeBranches')}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.inventoryCounts')}
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.inventoryCounts ?? 0}</div>
            <p className="text-xs text-gray-500">{t('dashboard.totalInventoryCounts')}</p>
            {stats && stats.totals.inventoryValue > 0 && (
              <p className="text-xs text-blue-600 mt-1">
                {formatNumber(stats.totals.inventoryValue)} {t('dashboard.totalValue')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('nav.categories')}
            </CardTitle>
            <FolderTree className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.counts?.categories ?? 0}</div>
            <p className="text-xs text-gray-500">{t('dashboard.totalCategories')}</p>
          </CardContent>
        </Card>

        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('dashboard.totalValue')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatNumber((stats?.totals.purchaseOrderValue || 0) + (stats?.totals.inventoryValue || 0))}
            </div>
            <p className="text-xs text-gray-500">{t('dashboard.combinedValue')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Overview and Recent Orders */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Purchase Orders by Status */}
        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader>
            <CardTitle>{t('dashboard.purchaseOrdersByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && Object.keys(stats.ordersByStatus).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.ordersByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{getStatusLabel(status)}</span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('dashboard.noData')}</p>
            )}
          </CardContent>
        </Card>

        {/* Inventory Counts by Status */}
        <Card className="hover:border-red-500 transition-colors duration-200">
          <CardHeader>
            <CardTitle>{t('dashboard.inventoryCountsByStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats && Object.keys(stats.inventoryByStatus).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.inventoryByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {getInventoryStatusLabel(status)}
                    </span>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('dashboard.noData')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Purchase Orders */}
      <Card className="hover:border-red-500 transition-colors duration-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('dashboard.recentPurchaseOrders')}</CardTitle>
          <Link 
            to="/purchase-orders" 
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {t('dashboard.viewAll')} →
          </Link>
        </CardHeader>
        <CardContent>
          {stats && stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {t('purchaseOrders.orderNumber')}
                    </TableHead>
                    <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {t('purchaseOrders.branch')}
                    </TableHead>
                    <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {t('purchaseOrders.orderDate')}
                    </TableHead>
                    <TableHead style={{ textAlign: isArabic ? 'left' : 'right' }}>
                      {t('purchaseOrders.orderTotal')}
                    </TableHead>
                    <TableHead style={{ textAlign: 'center' }}>
                      {t('purchaseOrders.status')}
                    </TableHead>
                    <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      {t('purchaseOrders.createdBy')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                        <Link 
                          to={`/purchase-orders`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {order.poNumber}
                        </Link>
                      </TableCell>
                      <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                        {getLocalizedName({ nameAr: order.branchNameAr, nameEn: order.branchNameEn }) || '-'}
                      </TableCell>
                      <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                        {formatDate(order.orderDate)}
                      </TableCell>
                      <TableCell style={{ textAlign: isArabic ? 'left' : 'right', fontWeight: 'medium' }}>
                        {formatNumber(order.totalAmount)}
                      </TableCell>
                      <TableCell style={{ textAlign: 'center' }}>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </TableCell>
                      <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                        {order.createdByName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>{t('dashboard.noRecentOrders')}</p>
              <Link 
                to="/purchase-orders" 
                className="text-blue-600 hover:text-blue-800 mt-2 inline-block"
              >
                {t('dashboard.createFirstOrder')}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
