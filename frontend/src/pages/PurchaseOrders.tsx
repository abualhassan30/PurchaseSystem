import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
import { formatNumber, formatDate as formatDateUtil } from '@/lib/format'
import { getLocalizedName } from '@/lib/i18n-utils'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from '@/components/ui/toaster'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Plus, Trash2, Printer, Download, Eye, Edit, X, Search } from 'lucide-react'

interface PurchaseOrderItem {
  id?: number
  itemId: number
  itemName: string
  availableQuantity: number
  availableQuantityUnitId: number
  availableQuantityUnitName: string
  unitId: number
  unitName: string
  quantity: number
  unitPrice: number
  tax: number
  lineTotal: number
}

interface PurchaseOrder {
  id?: number
  orderNumber: string
  orderDate: string
  expectedDeliveryDate: string
  purchasingOfficerId: number
  purchasingOfficerName: string
  branchId?: number
  branchName?: string
  branchNameAr?: string
  branchNameEn?: string
  items: PurchaseOrderItem[]
  total: number
  notes?: string
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
}

export default function PurchaseOrders() {
  const { t } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [items, setItems] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null)
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<string>('')
  const [dateTo, setDateTo] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [deletingOrderId, setDeletingOrderId] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [orderToDelete, setOrderToDelete] = useState<PurchaseOrder | null>(null)
  const [formData, setFormData] = useState<PurchaseOrder>({
    orderNumber: '',
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 86400000)
      .toISOString()
      .split('T')[0],
    purchasingOfficerId: 0,
    purchasingOfficerName: '',
    branchId: 0,
    branchName: '',
    items: [],
    total: 0,
    notes: '',
  })

  // Helper function to create an empty item
  const createEmptyItem = (): PurchaseOrderItem => ({
    itemId: 0,
    itemName: '',
    availableQuantity: 0,
    availableQuantityUnitId: 0,
    availableQuantityUnitName: '',
    unitId: 0,
    unitName: '',
    quantity: 0,
    unitPrice: 0,
    tax: 0,
    lineTotal: 0,
  })

  useEffect(() => {
    loadOrders()
    loadItems()
    loadUnits()
    loadBranches()
  }, [])

  // Initialize form with 4 default rows when form is shown
  useEffect(() => {
    if (showForm && formData.items.length === 0) {
      const defaultItems = Array.from({ length: 4 }, () => createEmptyItem())
      setFormData(prev => ({
        ...prev,
        items: defaultItems,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm])

  const loadOrders = async () => {
    try {
      const response = await api.get('/purchase-orders')
      const ordersData = response.data.map((order: any) => ({
        ...order,
        branchName: order.branchNameAr || order.branchNameEn || '',
        status: order.status || 'DRAFT',
      }))
      setOrders(ordersData)
    } catch (error: any) {
      console.error('Error loading orders:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load purchase orders',
        variant: 'destructive',
      })
    }
  }

  const loadOrderDetails = async (id: number) => {
    try {
      const response = await api.get(`/purchase-orders/${id}`)
      const order = response.data
      // Map items to match our interface
      const mappedItems = (order.items || []).map((item: any) => {
        // Get item name with fallback - preserve raw values for debugging
        const itemNameLocalized = getLocalizedName({ nameAr: item.itemNameAr, nameEn: item.itemNameEn })
        const itemName = itemNameLocalized || item.itemNameAr || item.itemNameEn || item.itemName || 'N/A'
        
        // Get unit names with fallback
        const unitNameLocalized = getLocalizedName({ nameAr: item.unitNameAr, nameEn: item.unitNameEn })
        const unitName = unitNameLocalized || item.unitNameAr || item.unitNameEn || 'N/A'
        
        // Get available unit names with fallback
        const availUnitNameLocalized = getLocalizedName({ 
          nameAr: item.availableUnitNameAr, 
          nameEn: item.availableUnitNameEn 
        })
        const availUnitName = availUnitNameLocalized || item.availableUnitNameAr || item.availableUnitNameEn || unitName || 'N/A'
        
        const mapped = {
          id: item.id,
          itemId: item.itemId,
          itemName: itemName,
          itemNameAr: item.itemNameAr, // Keep raw values for fallback
          itemNameEn: item.itemNameEn,
          availableQuantity: 0, // Not stored in database, show as 0
          availableQuantityUnitId: item.defaultUnitId || item.unitId,
          availableQuantityUnitName: availUnitName,
          availableQuantityUnitNameAr: item.availableUnitNameAr, // Keep raw values
          availableQuantityUnitNameEn: item.availableUnitNameEn,
          unitId: item.unitId,
          unitName: unitName,
          unitNameAr: item.unitNameAr, // Keep raw values
          unitNameEn: item.unitNameEn,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          tax: parseFloat(item.tax) || 0,
          lineTotal: parseFloat(item.lineTotal) || 0,
        }
        
        // Debug log to help identify issues
        if (!mapped.itemName || mapped.itemName === 'N/A') {
          console.warn('Item name missing for item:', item, 'mapped:', mapped)
        }
        if (!mapped.unitName || mapped.unitName === 'N/A') {
          console.warn('Unit name missing for item:', item, 'mapped:', mapped)
        }
        
        return mapped
      })
      
      return {
        ...order,
        items: mappedItems,
        branchName: order.branchNameAr || order.branchNameEn || '',
        status: order.status || 'DRAFT',
      }
    } catch (error: any) {
      console.error('Error loading order details:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load order details',
        variant: 'destructive',
      })
      return null
    }
  }

  const handleViewOrder = async (id: number) => {
    const order = await loadOrderDetails(id)
    if (order) {
      setViewingOrder(order)
    }
  }

  const handleEditOrder = async (id: number) => {
    const order = await loadOrderDetails(id)
    if (order) {
      setEditingOrder(order)
      setFormData({
        ...order,
        orderDate: order.orderDate.split('T')[0],
        expectedDeliveryDate: order.expectedDeliveryDate.split('T')[0],
      })
      setShowForm(true)
    }
  }

  const handleDeleteClick = (order: PurchaseOrder) => {
    setOrderToDelete(order)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!orderToDelete || !orderToDelete.id) return
    
    setDeletingOrderId(orderToDelete.id)
    try {
      await api.delete(`/purchase-orders/${orderToDelete.id}`)
      toast({
        title: t('common.success'),
        description: t('purchaseOrders.orderDeleted'),
      })
      setShowDeleteConfirm(false)
      setOrderToDelete(null)
      loadOrders()
    } catch (error: any) {
      console.error('Error deleting order:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete purchase order',
        variant: 'destructive',
      })
    } finally {
      setDeletingOrderId(null)
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setOrderToDelete(null)
    setDeletingOrderId(null)
  }

  const _handleUpdateStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/purchase-orders/${id}/status`, { status })
      toast({
        title: t('common.success'),
        description: t('purchaseOrders.orderUpdated'),
      })
      loadOrders()
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        variant: 'destructive',
      })
    }
  }

  const handlePrintOrder = async (order: PurchaseOrder) => {
    const orderDetails = await loadOrderDetails(order.id!)
    if (!orderDetails) return
    
    // Create print content
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const printContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${orderDetails.orderNumber}</title>
          ${isArabic ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">' : ''}
          <style>
            body { font-family: ${isArabic ? "'Cairo', 'Arial'" : "'Arial'"}, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
            th, td { border: 1px solid #000; padding: 8px; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: ${isArabic ? 'left' : 'right'}; direction: ltr; }
            .text-center { text-align: center; }
            .text-start { text-align: ${isArabic ? 'right' : 'left'}; }
          </style>
        </head>
        <body>
          <h1>${t('purchaseOrders.newOrder')}</h1>
          <p><strong>${t('purchaseOrders.orderNumber')}:</strong> ${orderDetails.orderNumber}</p>
          <p><strong>${t('purchaseOrders.branch')}:</strong> ${orderDetails.branchName || 'N/A'}</p>
          <p><strong>${t('purchaseOrders.orderDate')}:</strong> ${formatDateUtil(orderDetails.orderDate)}</p>
          <p><strong>${t('purchaseOrders.expectedDelivery')}:</strong> ${formatDateUtil(orderDetails.expectedDeliveryDate)}</p>
          <p><strong>${t('purchaseOrders.purchasingOfficer')}:</strong> ${orderDetails.purchasingOfficerName}</p>
          <p><strong>${t('purchaseOrders.status')}:</strong> ${getStatusLabel(orderDetails.status)}</p>
          <table>
            <thead>
              <tr>
                <th>${t('purchaseOrders.itemNameShort')}</th>
                <th class="text-center">${t('purchaseOrders.availableQuantityShort')}</th>
                <th>${t('purchaseOrders.availableQuantityUnitShort')}</th>
                <th class="text-center">${t('purchaseOrders.requiredQuantityShort')}</th>
                <th>${t('purchaseOrders.unit')}</th>
                <th class="text-right">${t('purchaseOrders.unitPriceShort')}</th>
                <th class="text-right">${t('purchaseOrders.tax')}</th>
                <th class="text-right">${t('purchaseOrders.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${orderDetails.items.map((item: PurchaseOrderItem) => `
                <tr>
                  <td>${item.itemName}</td>
                  <td class="text-center">${formatNumber(item.availableQuantity || 0)}</td>
                  <td>${item.availableQuantityUnitName || item.unitName}</td>
                  <td class="text-center">${formatNumber(item.quantity)}</td>
                  <td>${item.unitName}</td>
                  <td class="text-right">${formatNumber(item.unitPrice)}</td>
                  <td class="text-right">${formatNumber(item.tax)}</td>
                  <td class="text-right">${formatNumber(item.lineTotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top: 20px; margin-bottom: 20px;">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${t('purchaseOrders.notes')}:</h3>
            <p style="white-space: pre-wrap; ${orderDetails.notes ? '' : 'color: #999; font-style: italic;'}">${orderDetails.notes || (t('purchaseOrders.noNotes') || 'No notes')}</p>
          </div>
          <p><strong>${t('purchaseOrders.orderTotal')}:</strong> <span class="text-right">${formatNumber(orderDetails.total)}</span></p>
        </body>
      </html>
    `
    printWindow.document.write(printContent)
    printWindow.document.close()
    
    // Wait for fonts to load before printing (especially for Arabic)
    if (isArabic) {
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    printWindow.print()
  }

  const handleDownloadPDFOrder = async (order: PurchaseOrder) => {
    const orderDetails = await loadOrderDetails(order.id!)
    if (!orderDetails) return

    try {
      const html2pdf = (await import('html2pdf.js')).default
      await document.fonts.ready

      const pdfContent = document.createElement('div')
      pdfContent.style.position = 'absolute'
      pdfContent.style.left = '-9999px'
      pdfContent.style.width = '210mm'
      pdfContent.style.padding = '20mm'
      pdfContent.style.fontFamily = isArabic ? "'Cairo', 'Arial', sans-serif" : "'Arial', sans-serif"
      pdfContent.style.direction = isArabic ? 'rtl' : 'ltr'
      pdfContent.style.backgroundColor = 'white'

      if (isArabic) {
        const fontLink = document.createElement('link')
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap'
        fontLink.rel = 'stylesheet'
        document.head.appendChild(fontLink)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      pdfContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: ${isArabic ? 'right' : 'left'};">
            ${t('purchaseOrders.newOrder')}
          </h1>
          <div style="margin-bottom: 15px; text-align: ${isArabic ? 'right' : 'left'};">
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.orderNumber')}:</strong> ${orderDetails.orderNumber}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.branch')}:</strong> ${orderDetails.branchName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.orderDate')}:</strong> ${formatDateUtil(orderDetails.orderDate)}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.expectedDelivery')}:</strong> ${formatDateUtil(orderDetails.expectedDeliveryDate)}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.purchasingOfficer')}:</strong> ${orderDetails.purchasingOfficerName}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.status')}:</strong> ${getStatusLabel(orderDetails.status)}</p>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold;">${t('purchaseOrders.itemNameShort')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${t('purchaseOrders.availableQuantityShort')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold;">${t('purchaseOrders.availableQuantityUnitShort')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center; font-weight: bold;">${t('purchaseOrders.requiredQuantityShort')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold;">${t('purchaseOrders.unit')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">${t('purchaseOrders.unitPriceShort')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">${t('purchaseOrders.tax')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">${t('purchaseOrders.total')}</th>
            </tr>
          </thead>
          <tbody>
            ${orderDetails.items.map((item: PurchaseOrderItem) => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">${item.itemName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; direction: ltr;">${formatNumber(item.availableQuantity || 0)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">${item.availableQuantityUnitName || item.unitName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; direction: ltr;">${formatNumber(item.quantity)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">${item.unitName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${formatNumber(item.unitPrice)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${formatNumber(item.tax)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${formatNumber(item.lineTotal)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-bottom: 20px; text-align: ${isArabic ? 'right' : 'left'};">
          <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">${t('purchaseOrders.notes')}:</h3>
          <p style="white-space: pre-wrap; ${orderDetails.notes ? '' : 'color: #999; font-style: italic;'}">${orderDetails.notes || (t('purchaseOrders.noNotes') || 'No notes')}</p>
        </div>
        <div style="margin-top: 20px; text-align: ${isArabic ? 'right' : 'left'};">
          <p style="font-size: 18px; font-weight: bold;">
            <strong>${t('purchaseOrders.orderTotal')}:</strong> 
            <span style="direction: ltr; display: inline-block;">${formatNumber(orderDetails.total)}</span>
          </p>
        </div>
      `

      document.body.appendChild(pdfContent)

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: `PO_${orderDetails.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          windowHeight: 1123
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
      }

      await html2pdf().set(opt).from(pdfContent).save()
      document.body.removeChild(pdfContent)

      toast({
        title: t('common.success'),
        description: t('purchaseOrders.pdfDownloaded')
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: t('purchaseOrders.pdfError'),
        variant: 'destructive'
      })
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800'
      case 'PENDING_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'PENDING_APPROVAL': return 'bg-orange-100 text-orange-800'
      case 'APPROVED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'COMPLETED': return 'bg-blue-100 text-blue-800'
      case 'CANCELLED': return 'bg-gray-200 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status?: string) => {
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
    return statusMap[status] || t('purchaseOrders.statusDraft')
  }

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.purchasingOfficerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.branchName && order.branchName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    // Date range filtering
    let matchesDateRange = true
    if (dateFrom || dateTo) {
      const orderDate = new Date(order.orderDate)
      if (dateFrom) {
        const fromDate = new Date(dateFrom)
        fromDate.setHours(0, 0, 0, 0)
        if (orderDate < fromDate) {
          matchesDateRange = false
        }
      }
      if (dateTo) {
        const toDate = new Date(dateTo)
        toDate.setHours(23, 59, 59, 999)
        if (orderDate > toDate) {
          matchesDateRange = false
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesDateRange
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, statusFilter, dateFrom, dateTo])

  const loadItems = async () => {
    try {
      const response = await api.get('/items')
      setItems(response.data)
    } catch (error: any) {
      console.error('Error loading items:', error)
    }
  }

  const loadUnits = async () => {
    try {
      const response = await api.get('/units')
      setUnits(response.data)
    } catch (error: any) {
      console.error('Error loading units:', error)
    }
  }

  const loadBranches = async () => {
    try {
      const response = await api.get('/branches')
      const branchesData = Array.isArray(response.data) ? response.data : []
      // Filter only active branches
      const activeBranches = branchesData.filter((b: any) => b.isActive !== false)
      setBranches(activeBranches)
      
      // Auto-select if only one branch
      if (activeBranches.length === 1 && !formData.branchId) {
        setFormData(prev => ({
          ...prev,
          branchId: activeBranches[0].id,
          branchName: getLocalizedName(activeBranches[0])
        }))
      }
    } catch (error: any) {
      console.error('Error loading branches:', error)
      setBranches([])
    }
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()],
    })
  }

  const removeItem = (index: number) => {
    if (window.confirm(t('purchaseOrders.confirmDeleteItem'))) {
      const updatedItems = formData.items.filter((_, i) => i !== index)
      const newTotal = updatedItems.reduce((sum, item) => {
        const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal || '0')) || 0
        return sum + lineTotal
      }, 0)
      setFormData({ ...formData, items: updatedItems, total: newTotal })
      toast({ title: t('common.success'), description: t('purchaseOrders.itemDeleted') })
    }
  }

  // Check for duplicate items
  const checkDuplicateItem = (itemId: number, currentIndex: number): number | null => {
    if (!itemId || itemId === 0) return null
    const duplicateIndex = formData.items.findIndex(
      (item, idx) => item.itemId === itemId && idx !== currentIndex && item.itemId !== 0
    )
    return duplicateIndex >= 0 ? duplicateIndex : null
  }

  const updateItem = (index: number, field: keyof PurchaseOrderItem, value: any) => {
    const updatedItems = [...formData.items]
    updatedItems[index] = { ...updatedItems[index], [field]: value }

    if (field === 'itemId') {
      const itemId = typeof value === 'number' ? value : parseInt(String(value))
      
      // Check for duplicates
      const duplicateIndex = checkDuplicateItem(itemId, index)
      if (duplicateIndex !== null && itemId !== 0) {
        toast({
          title: t('purchaseOrders.duplicateItem'),
          description: t('purchaseOrders.duplicateItemMessage', { 
            itemName: getLocalizedName(items.find(it => it.id === itemId) || {}),
            row: duplicateIndex + 1
          }),
          variant: 'destructive',
        })
        // Still allow selection but show warning
      }

      const item = items.find((it) => it.id === itemId)
      if (item) {
        updatedItems[index].itemName = getLocalizedName(item)
        updatedItems[index].unitId = item.defaultUnitId || 0
        updatedItems[index].unitPrice = item.price || 0
        const defaultUnit = units.find((u) => u.id === item.defaultUnitId)
        if (defaultUnit) {
          updatedItems[index].unitName = getLocalizedName(defaultUnit)
          updatedItems[index].availableQuantityUnitId = item.defaultUnitId || 0
          updatedItems[index].availableQuantityUnitName = getLocalizedName(defaultUnit)
        }
        // Auto-populate available quantity (can be set to 0 or fetched from inventory)
        updatedItems[index].availableQuantity = 0
      } else {
        // Clear fields if no item selected
        updatedItems[index].itemName = ''
        updatedItems[index].unitId = 0
        updatedItems[index].unitName = ''
        updatedItems[index].availableQuantityUnitId = 0
        updatedItems[index].availableQuantityUnitName = ''
        updatedItems[index].availableQuantity = 0
        updatedItems[index].quantity = 0
        updatedItems[index].unitPrice = 0
        updatedItems[index].tax = 0
        updatedItems[index].lineTotal = 0
      }
    }

    if (field === 'unitId') {
      const unit = units.find((u) => u.id === value)
      if (unit) {
        updatedItems[index].unitName = getLocalizedName(unit)
      }
    }

    if (field === 'availableQuantityUnitId') {
      const unit = units.find((u) => u.id === value)
      if (unit) {
        updatedItems[index].availableQuantityUnitName = getLocalizedName(unit)
      }
    }

    if (field === 'quantity' || field === 'unitPrice' || field === 'tax') {
      const item = updatedItems[index]
      // Ensure all values are numbers
      const quantity = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || '0')) || 0
      const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice || '0')) || 0
      const tax = typeof item.tax === 'number' ? item.tax : parseFloat(String(item.tax || '0')) || 0
      item.lineTotal = quantity * unitPrice + tax
    }

    const newTotal = updatedItems.reduce((sum, item) => {
      const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal || '0')) || 0
      return sum + lineTotal
    }, 0)
    setFormData({ ...formData, items: updatedItems, total: newTotal })
  }

  const _calculateTotal = () => {
    const total = formData.items.reduce((sum, item) => {
      const lineTotal = typeof item.lineTotal === 'number' ? item.lineTotal : parseFloat(String(item.lineTotal || '0')) || 0
      return sum + lineTotal
    }, 0)
    setFormData({ ...formData, total })
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate items
    if (formData.items.length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one item to the order',
        variant: 'destructive',
      })
      return
    }
    
    // Validate all items have required fields
    const invalidItems = formData.items.filter(
      (item) => 
        !item.itemId || 
        item.itemId === 0 || 
        !item.unitId || 
        item.unitId === 0 ||
        !item.quantity || 
        item.quantity <= 0 ||
        !item.unitPrice || 
        item.unitPrice <= 0
    )
    
    if (invalidItems.length > 0) {
      toast({
        title: 'Error',
        description: 'Please complete all item fields. Each item must have: item, unit, quantity > 0, and price > 0',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    try {
      // Prepare data for API - only send what backend needs
      const submitData = {
        orderDate: formData.orderDate,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        items: formData.items.map((item) => ({
          itemId: item.itemId,
          unitId: item.unitId,
          quantity: typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity || '0')) || 0,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : parseFloat(String(item.unitPrice || '0')) || 0,
          tax: typeof item.tax === 'number' ? item.tax : parseFloat(String(item.tax || '0')) || 0,
        })),
        notes: formData.notes || '',
      }
      
      console.log('Submitting purchase order:', submitData)
      
      if (editingOrder && editingOrder.id) {
        // Update existing order
        const updateData = {
          ...submitData,
          branchId: formData.branchId || null,
        }
        await api.put(`/purchase-orders/${editingOrder.id}`, updateData)
        toast({ title: t('common.success'), description: t('purchaseOrders.orderUpdated') })
      } else {
        // Create new order
        const response = await api.post('/purchase-orders', submitData)
        console.log('Purchase order response:', response.data)
        toast({ title: t('common.success'), description: 'Purchase order created successfully' })
      }
      
      setShowForm(false)
      setEditingOrder(null)
      // Reset form with 4 default rows
      const defaultItems = Array.from({ length: 4 }, () => createEmptyItem())
      setFormData({
        orderNumber: '',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 86400000)
          .toISOString()
          .split('T')[0],
        purchasingOfficerId: 0,
        purchasingOfficerName: '',
        branchId: 0,
        branchName: '',
        items: defaultItems,
        total: 0,
        notes: '',
      })
      // Reload branches to auto-select if only one
      loadBranches()
      loadOrders()
    } catch (error: any) {
      console.error('Error creating purchase order:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create purchase order',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const html2pdf = (await import('html2pdf.js')).default
      
      // Wait for fonts to load
      await document.fonts.ready
      
      // Create a temporary container for PDF content
      const pdfContent = document.createElement('div')
      pdfContent.style.position = 'absolute'
      pdfContent.style.left = '-9999px'
      pdfContent.style.top = '0'
      pdfContent.style.width = '210mm' // A4 width
      pdfContent.style.padding = '20mm'
      pdfContent.style.fontFamily = isArabic ? "'Cairo', 'Arial', sans-serif" : "'Arial', sans-serif"
      pdfContent.style.direction = isArabic ? 'rtl' : 'ltr'
      pdfContent.style.backgroundColor = 'white'
      pdfContent.style.color = '#111827'
      pdfContent.style.fontSize = '14px'
      pdfContent.style.lineHeight = '1.6'
      pdfContent.setAttribute('dir', isArabic ? 'rtl' : 'ltr')
      pdfContent.setAttribute('lang', isArabic ? 'ar' : 'en')
      
      // Ensure Cairo font is loaded
      if (isArabic) {
        const fontLink = document.createElement('link')
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap'
        fontLink.rel = 'stylesheet'
        document.head.appendChild(fontLink)
        // Wait a bit for font to load
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      // Build HTML content
      const validItems = formData.items.filter(item => item.itemId && item.itemId !== 0)
      
      pdfContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: ${isArabic ? 'right' : 'left'};">
            ${t('purchaseOrders.newOrder')}
          </h1>
          
          <div style="margin-bottom: 15px; ${isArabic ? 'text-align: right;' : 'text-align: left;'}">
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.orderNumber')}:</strong> ${formData.orderNumber || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.branch')}:</strong> ${formData.branchName || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.orderDate')}:</strong> ${formatDateUtil(formData.orderDate)}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.expectedDelivery')}:</strong> ${formatDateUtil(formData.expectedDeliveryDate)}</p>
            <p style="margin: 5px 0;"><strong>${t('purchaseOrders.purchasingOfficer')}:</strong> ${formData.purchasingOfficerName || 'N/A'}</p>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; ${isArabic ? 'direction: rtl;' : 'direction: ltr;'}">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="border: 1px solid #000; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold;">
                ${t('purchaseOrders.itemNameShort')}
              </th>
              <th style="border: 1px solid #000; padding: 10px; text-align: center; font-weight: bold;">
                ${t('purchaseOrders.requiredQuantity')}
              </th>
              <th style="border: 1px solid #000; padding: 10px; text-align: ${isArabic ? 'right' : 'left'}; font-weight: bold;">
                ${t('purchaseOrders.unit')}
              </th>
              <th style="border: 1px solid #000; padding: 10px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">
                ${t('purchaseOrders.unitPrice')}
              </th>
              <th style="border: 1px solid #000; padding: 10px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">
                ${t('purchaseOrders.tax')}
              </th>
              <th style="border: 1px solid #000; padding: 10px; text-align: ${isArabic ? 'left' : 'right'}; font-weight: bold;">
                ${t('purchaseOrders.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            ${validItems.map(item => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">
                  ${item.itemName || 'N/A'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">
                  ${formatNumber(item.quantity)}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">
                  ${item.unitName || 'N/A'}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">
                  ${formatNumber(item.unitPrice)}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">
                  ${formatNumber(item.tax)}
                </td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">
                  ${formatNumber(item.lineTotal)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${formData.notes ? `
          <div style="margin-bottom: 20px; ${isArabic ? 'text-align: right;' : 'text-align: left;'}">
            <h3 style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
              ${t('purchaseOrders.notes')}:
            </h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">
              ${formData.notes}
            </p>
          </div>
        ` : ''}

        <div style="margin-top: 20px; ${isArabic ? 'text-align: right;' : 'text-align: left;'}">
          <p style="font-size: 18px; font-weight: bold;">
            <strong>${t('purchaseOrders.orderTotal')}:</strong> 
            <span style="direction: ltr; display: inline-block;">${formatNumber(formData.total)}</span>
          </p>
        </div>
      `

      // Append to body temporarily
      document.body.appendChild(pdfContent)

      // Configure html2pdf options
      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename: formData.orderNumber 
          ? `PO_${formData.orderNumber}_${new Date().toISOString().split('T')[0]}.pdf`
          : `Purchase_Order_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          allowTaint: true,
          backgroundColor: '#ffffff',
          windowWidth: 794, // A4 width in pixels at 96 DPI
          windowHeight: 1123 // A4 height in pixels at 96 DPI
        },
        jsPDF: { 
          unit: 'mm', 
          format: 'a4', 
          orientation: 'portrait',
          compress: true
        },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      }

      // Generate and download PDF
      await html2pdf().set(opt).from(pdfContent).save()

      // Clean up
      document.body.removeChild(pdfContent)

      toast({
        title: t('common.success'),
        description: t('purchaseOrders.pdfDownloaded')
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: 'Error',
        description: t('purchaseOrders.pdfError'),
        variant: 'destructive'
      })
    }
  }

  // Format number input value - return empty string for 0 or empty values
  const formatInputValue = (value: number | string | undefined): string => {
    if (value === undefined || value === null || value === '') return ''
    const num = typeof value === 'number' ? value : parseFloat(String(value)) || 0
    return num === 0 ? '' : String(num)
  }

  // Handle number input change with proper formatting
  const handleNumberInputChange = (index: number, field: 'availableQuantity' | 'quantity' | 'unitPrice' | 'tax', value: string) => {
    const numValue = value === '' ? 0 : (parseFloat(value) || 0)
    updateItem(index, field, numValue)
  }

  // Auto-focus next field after item selection
  const handleItemSelect = (index: number) => {
    // Focus on available quantity field after a short delay
    setTimeout(() => {
      const nextInput = document.querySelector(
        `input[data-row-index="${index}"][data-field="availableQuantity"]`
      ) as HTMLInputElement
      if (nextInput) {
        nextInput.focus()
        nextInput.select()
      }
    }, 150)
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Title and Add Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('purchaseOrders.title')}</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 me-2" />
            {t('purchaseOrders.newOrder')}
          </Button>
        )}
      </div>

      {showForm && (
        <Card id="purchase-order-form">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{editingOrder ? t('purchaseOrders.editOrder') : t('purchaseOrders.newOrder')}</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrint}
                  disabled={loading || formData.items.length === 0}
                  className="flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  {t('purchaseOrders.print')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDownloadPDF}
                  disabled={loading || formData.items.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('purchaseOrders.downloadPDF')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Branch Selection */}
              <div>
                <Label>{t('purchaseOrders.branch')} *</Label>
                <SearchableSelect
                  options={branches.map((branch) => ({
                    value: branch.id,
                    label: getLocalizedName(branch),
                    code: branch.code || '',
                    searchText: isArabic ? branch.nameEn : branch.nameAr
                  }))}
                  value={formData.branchId || 0}
                  onChange={(value) => {
                    const branchId = typeof value === 'number' ? value : parseInt(String(value))
                    const selectedBranch = branches.find(b => b.id === branchId)
                    setFormData({
                      ...formData,
                      branchId: branchId,
                      branchName: selectedBranch ? getLocalizedName(selectedBranch) : ''
                    })
                  }}
                  placeholder={t('purchaseOrders.selectBranch')}
                  required
                  dir={isArabic ? 'rtl' : 'ltr'}
                  className="h-10 mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('purchaseOrders.orderDate')}</Label>
                  <Input
                    type="date"
                    value={formData.orderDate}
                    onChange={(e) =>
                      setFormData({ ...formData, orderDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('purchaseOrders.expectedDelivery')}</Label>
                  <Input
                    type="date"
                    value={formData.expectedDeliveryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedDeliveryDate: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <Label className="text-base font-semibold">{t('purchaseOrders.items')}</Label>
                  <Button type="button" onClick={addItem} size="sm">
                    <Plus className="w-4 h-4 me-2" />
                    {t('purchaseOrders.addItem')}
                  </Button>
                </div>
                {formData.items.length === 0 ? (
                  <div className="border border-gray-200 rounded-md p-8 text-center text-gray-500">
                    {t('purchaseOrders.noItems')}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-visible">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="text-center !text-xs w-[22%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.itemNameShort')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[10%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.availableQuantityShort')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[12%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.availableQuantityUnitShort')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[10%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.requiredQuantityShort')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[12%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.unit')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[10%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.unitPriceShort')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[8%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.tax')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[10%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('purchaseOrders.total')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[4%] whitespace-nowrap" 
                            style={{ padding: '1rem 0.75rem', verticalAlign: 'middle' }}
                          >
                            {t('common.actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => {
                          // Check if this row has a duplicate item
                          const duplicateIndex = checkDuplicateItem(item.itemId, index)
                          const isDuplicate = duplicateIndex !== null && item.itemId !== 0
                          const hasItem = item.itemId && item.itemId !== 0
                          
                          return (
                          <TableRow 
                            key={index}
                            className={cn(
                              isDuplicate && 'bg-red-50 border-l-4 border-l-red-500',
                              hasItem && !isDuplicate && 'bg-green-50/30 transition-colors duration-300'
                            )}
                          >
                            {/* Item Name - Left aligned text */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'right' : 'left',
                                padding: '0.875rem 0.5rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <SearchableSelect
                                options={items.map((it) => ({
                                  value: it.id,
                                  label: getLocalizedName(it),
                                  code: it.code || '',
                                  searchText: isArabic ? it.nameEn : it.nameAr // Include alternate language for search
                                }))}
                                value={item.itemId}
                                onChange={(value) => {
                                  updateItem(
                                    index,
                                    'itemId',
                                    typeof value === 'number' ? value : parseInt(String(value))
                                  )
                                  handleItemSelect(index)
                                }}
                                onSelect={() => handleItemSelect(index)}
                                placeholder={t('purchaseOrders.selectItem')}
                                required
                                dir={isArabic ? 'rtl' : 'ltr'}
                                className="h-8"
                              />
                            </TableCell>
                            {/* Available Quantity - Right aligned numeric */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'left' : 'right',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <Input
                                type="number"
                                step="0.01"
                                value={formatInputValue(item.availableQuantity)}
                                onChange={(e) =>
                                  handleNumberInputChange(index, 'availableQuantity', e.target.value)
                                }
                                data-row-index={index}
                                data-field="availableQuantity"
                                placeholder="0"
                                className="h-8 w-full text-xs border border-gray-300"
                                style={isArabic ? { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                } : { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                }}
                              />
                            </TableCell>
                            {/* Available Unit - Left aligned text */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'right' : 'left',
                                padding: '0.875rem 0.5rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <SearchableSelect
                                options={units.map((unit) => ({
                                  value: unit.id,
                                  label: getLocalizedName(unit),
                                  searchText: isArabic ? unit.nameEn : unit.nameAr
                                }))}
                                value={item.availableQuantityUnitId}
                                onChange={(value) =>
                                  updateItem(
                                    index,
                                    'availableQuantityUnitId',
                                    typeof value === 'number' ? value : parseInt(String(value))
                                  )
                                }
                                placeholder={t('purchaseOrders.selectUnit')}
                                dir={isArabic ? 'rtl' : 'ltr'}
                                className="h-8"
                              />
                            </TableCell>
                            {/* Required Quantity - Right aligned numeric */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'left' : 'right',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <Input
                                type="number"
                                step="0.01"
                                value={formatInputValue(item.quantity)}
                                onChange={(e) =>
                                  handleNumberInputChange(index, 'quantity', e.target.value)
                                }
                                required
                                placeholder="0"
                                className="h-8 w-full text-xs border border-gray-300"
                                style={isArabic ? { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                } : { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                }}
                              />
                            </TableCell>
                            {/* Unit - Left aligned text */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'right' : 'left',
                                padding: '0.875rem 0.5rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <SearchableSelect
                                options={units.map((unit) => ({
                                  value: unit.id,
                                  label: getLocalizedName(unit),
                                  searchText: isArabic ? unit.nameEn : unit.nameAr
                                }))}
                                value={item.unitId}
                                onChange={(value) =>
                                  updateItem(
                                    index,
                                    'unitId',
                                    typeof value === 'number' ? value : parseInt(String(value))
                                  )
                                }
                                placeholder={t('purchaseOrders.selectUnit')}
                                required
                                dir={isArabic ? 'rtl' : 'ltr'}
                                className="h-8"
                              />
                            </TableCell>
                            {/* Price - Right aligned numeric */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'left' : 'right',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <Input
                                type="number"
                                step="0.01"
                                value={formatInputValue(item.unitPrice)}
                                onChange={(e) =>
                                  handleNumberInputChange(index, 'unitPrice', e.target.value)
                                }
                                required
                                placeholder="0.00"
                                className="h-8 w-full text-xs border border-gray-300"
                                style={isArabic ? { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                } : { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                }}
                              />
                            </TableCell>
                            {/* Tax - Right aligned numeric */}
                            <TableCell 
                              className="!p-0"
                              style={{ 
                                textAlign: isArabic ? 'left' : 'right',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <Input
                                type="number"
                                step="0.01"
                                value={formatInputValue(item.tax)}
                                onChange={(e) =>
                                  handleNumberInputChange(index, 'tax', e.target.value)
                                }
                                placeholder="0.00"
                                className="h-8 w-full text-xs border border-gray-300"
                                style={isArabic ? { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                } : { 
                                  textAlign: 'right', 
                                  direction: 'ltr',
                                  paddingLeft: '0.5rem',
                                  paddingRight: '0.5rem'
                                }}
                              />
                            </TableCell>
                            {/* Total - Right aligned numeric */}
                            <TableCell 
                              className="!p-0 font-medium text-xs"
                              style={{ 
                                textAlign: isArabic ? 'left' : 'right',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              {formatNumber(item.lineTotal)}
                            </TableCell>
                            {/* Actions - Center aligned */}
                            <TableCell 
                              className="!p-0 text-center"
                              style={{ 
                                textAlign: 'center',
                                padding: '0.875rem 0.75rem',
                                verticalAlign: 'middle'
                              }}
                            >
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-6 border-t mt-6">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-gray-900">
                    {t('purchaseOrders.orderTotal')}:
                  </div>
                  <div className={`text-xl font-bold text-secondary-600 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {formatNumber(formData.total)}
                  </div>
                </div>
              </div>

              {/* Notes Field */}
              <div className="mt-6">
                <Label htmlFor="notes">{t('purchaseOrders.notes')}</Label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={500}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('purchaseOrders.notesPlaceholder')}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-secondary-600 focus:border-transparent"
                  style={{
                    direction: isArabic ? 'rtl' : 'ltr',
                    textAlign: isArabic ? 'right' : 'left'
                  }}
                />
                <div className={`text-xs text-gray-500 mt-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {(formData.notes || '').length} / 500 {t('purchaseOrders.characters')}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingOrder(null)
                    // Reset form
                    const defaultItems = Array.from({ length: 4 }, () => createEmptyItem())
                    setFormData({
                      orderNumber: '',
                      orderDate: new Date().toISOString().split('T')[0],
                      expectedDeliveryDate: new Date(Date.now() + 86400000)
                        .toISOString()
                        .split('T')[0],
                      purchasingOfficerId: 0,
                      purchasingOfficerName: '',
                      branchId: 0,
                      branchName: '',
                      items: defaultItems,
                      total: 0,
                      notes: '',
                    })
                    loadBranches()
                  }}
                  className="min-w-[100px]"
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={loading} className="min-w-[100px]">
                  {loading ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6 items-end">
            <div className="flex-1 min-w-[300px]">
              <Label className="mb-3 block text-sm font-semibold">{t('purchaseOrders.searchOrders')}</Label>
              <div className="relative">
                <Search className={`absolute ${isArabic ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
                <Input
                  type="text"
                  placeholder={t('purchaseOrders.searchOrders')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${isArabic ? 'pr-12 text-right' : 'pl-12 text-left'} text-base`}
                  style={{ direction: isArabic ? 'rtl' : 'ltr', height: '48px', minHeight: '48px' }}
                />
              </div>
            </div>
            <div className="min-w-[300px]">
              <Label className="mb-3 block text-sm font-semibold">{t('purchaseOrders.filterByStatus')}</Label>
              <SearchableSelect
                options={[
                  { value: 'all', label: t('purchaseOrders.allStatuses') },
                  { value: 'DRAFT', label: t('purchaseOrders.statusDraft') },
                  { value: 'PENDING_REVIEW', label: t('purchaseOrders.statusPendingReview') },
                  { value: 'PENDING_APPROVAL', label: t('purchaseOrders.statusPendingApproval') },
                  { value: 'APPROVED', label: t('purchaseOrders.statusApproved') },
                  { value: 'REJECTED', label: t('purchaseOrders.statusRejected') },
                  { value: 'COMPLETED', label: t('purchaseOrders.statusCompleted') },
                  { value: 'CANCELLED', label: t('purchaseOrders.statusCancelled') },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(typeof value === 'string' ? value : String(value))}
                placeholder={t('purchaseOrders.filterByStatus')}
                dir={isArabic ? 'rtl' : 'ltr'}
                className="w-full h-12 text-base"
              />
            </div>
            <div className="min-w-[200px]">
              <Label className="mb-3 block text-sm font-semibold">{t('purchaseOrders.dateFrom')}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-base"
                style={{ height: '48px', minHeight: '48px' }}
              />
            </div>
            <div className="min-w-[200px]">
              <Label className="mb-3 block text-sm font-semibold">{t('purchaseOrders.dateTo')}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-base"
                style={{ height: '48px', minHeight: '48px' }}
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="min-w-[100px]">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="h-12 text-base"
                  title={t('purchaseOrders.clearDateFilter')}
                >
                  {t('purchaseOrders.clearDateFilter')}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('purchaseOrders.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('purchaseOrders.orderNumber')}</TableHead>
                <TableHead className="text-start">{t('purchaseOrders.branch')}</TableHead>
                <TableHead className="text-end">{t('purchaseOrders.orderDate')}</TableHead>
                <TableHead className="text-end">{t('purchaseOrders.orderTotal')}</TableHead>
                <TableHead className="text-start">{t('purchaseOrders.createdBy')}</TableHead>
                <TableHead className="text-center">{t('purchaseOrders.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    {t('purchaseOrders.noOrdersFound')}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="text-start font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-start">{order.branchName || 'N/A'}</TableCell>
                    <TableCell className="text-end">{formatDateUtil(order.orderDate)}</TableCell>
                    <TableCell className="text-end font-medium">{formatNumber(order.total)}</TableCell>
                    <TableCell className="text-start">{order.purchasingOfficerName}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewOrder(order.id!)}
                          className="h-8 w-8 p-0"
                          title={t('purchaseOrders.view')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditOrder(order.id!)}
                          className="h-8 w-8 p-0"
                          title={t('purchaseOrders.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintOrder(order)}
                          className="h-8 w-8 p-0"
                          title={t('purchaseOrders.print')}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDFOrder(order)}
                          className="h-8 w-8 p-0"
                          title={t('purchaseOrders.downloadPDF')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(order)}
                          disabled={deletingOrderId === order.id}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                          title={t('purchaseOrders.delete')}
                        >
                          {deletingOrderId === order.id ? (
                            <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                {t('purchaseOrders.showing')} {startIndex + 1} {t('purchaseOrders.to')} {Math.min(endIndex, filteredOrders.length)} {t('purchaseOrders.of')} {filteredOrders.length} {t('purchaseOrders.results')}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  {isArabic ? '←' : '←'} {isArabic ? 'السابق' : 'Previous'}
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[40px]"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  {isArabic ? 'التالي' : 'Next'} {isArabic ? '→' : '→'}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">{t('purchaseOrders.rowsPerPage')}:</Label>
                <SearchableSelect
                  options={[
                    { value: '5', label: '5' },
                    { value: '10', label: '10' },
                    { value: '25', label: '25' },
                    { value: '50', label: '50' },
                  ]}
                  value={String(rowsPerPage)}
                  onChange={(value) => {
                    setRowsPerPage(parseInt(String(value)))
                    setCurrentPage(1)
                  }}
                  dir={isArabic ? 'rtl' : 'ltr'}
                  className="w-20"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && orderToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-red-600">{t('purchaseOrders.delete')}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteCancel}
                  className="h-8 w-8 p-0"
                  disabled={deletingOrderId !== null}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-red-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-red-900">{t('purchaseOrders.confirmDelete')}</p>
                    <p className="text-sm text-red-700 mt-1">
                      {t('purchaseOrders.deleteWarning') || 'This action cannot be undone. All items associated with this order will also be deleted.'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 p-4 bg-gray-50 rounded-md">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{t('purchaseOrders.orderNumber')}:</span>
                    <span className="text-gray-900">{orderToDelete.orderNumber}</span>
                  </div>
                  {orderToDelete.branchName && (
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">{t('purchaseOrders.branch')}:</span>
                      <span className="text-gray-900">{orderToDelete.branchName}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{t('purchaseOrders.orderDate')}:</span>
                    <span className="text-gray-900">{formatDateUtil(orderToDelete.orderDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">{t('purchaseOrders.orderTotal')}:</span>
                    <span className="text-gray-900 font-semibold">{formatNumber(orderToDelete.total)}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleDeleteCancel}
                    disabled={deletingOrderId !== null}
                    className="min-w-[100px]"
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteConfirm}
                    disabled={deletingOrderId !== null}
                    className="min-w-[100px]"
                  >
                    {deletingOrderId !== null ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin me-2"></div>
                        {t('common.loading')}
                      </>
                    ) : (
                      t('purchaseOrders.delete')
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Order Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('purchaseOrders.viewOrder')}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewingOrder(null)}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.orderNumber')}</Label>
                    <p>{viewingOrder.orderNumber}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.status')}</Label>
                    <p>
                      <span className={`px-2 py-1 rounded text-sm ${getStatusColor(viewingOrder.status)}`}>
                        {getStatusLabel(viewingOrder.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.branch')}</Label>
                    <p>{viewingOrder.branchName || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.orderDate')}</Label>
                    <p>{formatDateUtil(viewingOrder.orderDate)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.expectedDelivery')}</Label>
                    <p>{formatDateUtil(viewingOrder.expectedDeliveryDate)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('purchaseOrders.purchasingOfficer')}</Label>
                    <p>{viewingOrder.purchasingOfficerName}</p>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold mb-2 block">{t('purchaseOrders.items')}</Label>
                  {viewingOrder.items && viewingOrder.items.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-start">{t('purchaseOrders.itemNameShort')}</TableHead>
                            <TableHead className="text-center">{t('purchaseOrders.availableQuantityShort')}</TableHead>
                            <TableHead className="text-start">{t('purchaseOrders.availableQuantityUnitShort')}</TableHead>
                            <TableHead className="text-center">{t('purchaseOrders.requiredQuantityShort')}</TableHead>
                            <TableHead className="text-start">{t('purchaseOrders.unit')}</TableHead>
                            <TableHead className="text-end">{t('purchaseOrders.unitPriceShort')}</TableHead>
                            <TableHead className="text-end">{t('purchaseOrders.tax')}</TableHead>
                            <TableHead className="text-end">{t('purchaseOrders.total')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {viewingOrder.items.map((item: PurchaseOrderItem, idx: number) => {
                            // Debug: log item data
                            if (idx === 0) {
                              console.log('First item in view modal:', item)
                            }
                            
                            const itemName = item.itemName || (item as any).itemNameAr || (item as any).itemNameEn || 'N/A'
                            const availUnitName = item.availableQuantityUnitName || item.unitName || (item as any).availableQuantityUnitNameAr || (item as any).availableQuantityUnitNameEn || (item as any).unitNameAr || (item as any).unitNameEn || 'N/A'
                            const unitName = item.unitName || (item as any).unitNameAr || (item as any).unitNameEn || 'N/A'
                            
                            return (
                              <TableRow key={idx}>
                                <TableCell className="text-start" style={{ minWidth: '150px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {itemName}
                                </TableCell>
                                <TableCell className="text-center" style={{ minWidth: '80px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {formatNumber(item.availableQuantity || 0)}
                                </TableCell>
                                <TableCell className="text-start" style={{ minWidth: '100px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {availUnitName}
                                </TableCell>
                                <TableCell className="text-center" style={{ minWidth: '80px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {formatNumber(item.quantity)}
                                </TableCell>
                                <TableCell className="text-start" style={{ minWidth: '100px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {unitName}
                                </TableCell>
                                <TableCell className="text-end" style={{ minWidth: '80px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {formatNumber(item.unitPrice)}
                                </TableCell>
                                <TableCell className="text-end" style={{ minWidth: '60px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {formatNumber(item.tax)}
                                </TableCell>
                                <TableCell className="text-end" style={{ minWidth: '80px', padding: '12px', verticalAlign: 'middle', color: '#111827' }}>
                                  {formatNumber(item.lineTotal)}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="border border-gray-200 rounded-md p-8 text-center text-gray-500">
                      {t('purchaseOrders.noItems')}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Label className="font-semibold mb-2 block">{t('purchaseOrders.notes')}</Label>
                  <div className={`p-3 border rounded-md bg-gray-50 ${!viewingOrder.notes ? 'text-gray-500 italic' : ''}`}>
                    <p className="whitespace-pre-wrap">{viewingOrder.notes || (t('purchaseOrders.noNotes') || 'No notes')}</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-lg font-bold">
                    {t('purchaseOrders.orderTotal')}: {formatNumber(viewingOrder.total)}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handlePrintOrder(viewingOrder)}
                  >
                    <Printer className="w-4 h-4 me-2" />
                    {t('purchaseOrders.print')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPDFOrder(viewingOrder)}
                  >
                    <Download className="w-4 h-4 me-2" />
                    {t('purchaseOrders.downloadPDF')}
                  </Button>
                  <Button onClick={() => setViewingOrder(null)}>
                    {t('purchaseOrders.close')}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
