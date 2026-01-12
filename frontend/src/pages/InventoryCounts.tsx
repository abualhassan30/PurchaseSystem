import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
import { formatNumber, formatDate as formatDateUtil } from '@/lib/format'
import { getLocalizedName } from '@/lib/i18n-utils'
import api from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
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
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'

interface InventoryCountItem {
  id?: number
  itemId: number
  itemName: string
  quantity: number
  quantityInput?: string // Store raw input for better UX
  unitId: number
  unitName: string
  cost: number
  total: number
}

interface InventoryCount {
  id?: number
  inventoryNumber: string
  inventoryDate: string
  branchId?: number
  branchName?: string
  branchNameAr?: string
  branchNameEn?: string
  status?: 'DRAFT' | 'COMPLETED' | 'APPROVED'
  notes?: string
  createdBy?: number
  createdByName?: string
  createdAt?: string
  items: InventoryCountItem[]
}

export default function InventoryCounts() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isArabic = i18n.language === 'ar'
  const [inventoryCounts, setInventoryCounts] = useState<InventoryCount[]>([])
  const [items, setItems] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [viewingCount, setViewingCount] = useState<InventoryCount | null>(null)
  const [editingCount, setEditingCount] = useState<InventoryCount | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [formData, setFormData] = useState<InventoryCount>({
    inventoryNumber: '',
    inventoryDate: new Date().toISOString().split('T')[0],
    branchId: 0,
    branchName: '',
    status: 'DRAFT',
    notes: '',
    items: [],
  })

  // Helper function to create an empty item
  const createEmptyItem = (): InventoryCountItem => ({
    itemId: 0,
    itemName: '',
    quantity: 0,
    quantityInput: '',
    unitId: 0,
    unitName: '',
    cost: 0,
    total: 0,
  })

  useEffect(() => {
    loadInventoryCounts()
    loadItems()
    loadUnits()
    loadBranches()
  }, [])

  // Auto-select branch if only one exists
  useEffect(() => {
    if (branches.length === 1 && !formData.branchId) {
      setFormData(prev => ({
        ...prev,
        branchId: branches[0].id,
        branchName: getLocalizedName(branches[0]),
      }))
    }
  }, [branches])

  const loadInventoryCounts = async () => {
    try {
      const res = await api.get('/inventory-counts')
      const countsData = Array.isArray(res.data) ? res.data : []
      // Map branch names properly
      const mappedCounts = countsData.map((count: any) => ({
        ...count,
        branchName: getLocalizedName({ nameAr: count.branchNameAr, nameEn: count.branchNameEn }) || '-',
      }))
      setInventoryCounts(mappedCounts)
    } catch (error) {
      console.error('Failed to load inventory counts:', error)
      setInventoryCounts([])
    }
  }

  const loadItems = async () => {
    try {
      const res = await api.get('/items')
      const itemsData = Array.isArray(res.data) ? res.data : []
      // Ensure price and defaultUnitId are properly set
      const normalizedItems = itemsData.map((item: any) => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
        defaultUnitId: item.defaultUnitId || 0,
      }))
      console.log('Loaded items:', normalizedItems.slice(0, 3)) // Debug log first 3 items
      setItems(normalizedItems)
    } catch (error) {
      console.error('Failed to load items:', error)
      setItems([])
    }
  }

  const loadUnits = async () => {
    try {
      const res = await api.get('/units')
      const unitsData = Array.isArray(res.data) ? res.data : []
      console.log('Loaded units:', unitsData) // Debug log
      setUnits(unitsData)
    } catch (error) {
      console.error('Failed to load units:', error)
      setUnits([])
    }
  }

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches')
      const branchesData = Array.isArray(res.data) ? res.data.filter((b: any) => b.isActive) : []
      setBranches(branchesData)
    } catch (error) {
      console.error('Failed to load branches:', error)
      setBranches([])
    }
  }

  const loadCountDetails = async (id: number) => {
    try {
      const response = await api.get(`/inventory-counts/${id}`)
      const count = response.data
      
      const mappedItems = (count.items || []).map((item: any) => ({
        id: item.id,
        itemId: item.itemId,
        itemName: getLocalizedName({ nameAr: item.itemNameAr, nameEn: item.itemNameEn }),
        quantity: parseFloat(item.quantity) || 0,
        unitId: item.unitId,
        unitName: getLocalizedName({ nameAr: item.unitNameAr, nameEn: item.unitNameEn }),
        cost: parseFloat(item.cost) || 0,
        total: parseFloat(item.total) || 0,
      }))
      
      return {
        ...count,
        items: mappedItems,
        branchName: count.branchNameAr || count.branchNameEn || '',
        status: count.status || 'DRAFT',
      }
    } catch (error: any) {
      console.error('Error loading count details:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load inventory count details',
        variant: 'destructive',
      })
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const validItems = formData.items.filter(
        item => item.itemId && item.itemId > 0 && item.unitId && item.unitId > 0 && item.quantity > 0
      )

      if (validItems.length === 0) {
        toast({
          title: 'Error',
          description: 'Please add at least one item',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      const submitData = {
        inventoryDate: formData.inventoryDate,
        branchId: formData.branchId || null,
        items: validItems.map((item) => ({
          itemId: item.itemId,
          unitId: item.unitId,
          quantity: item.quantity,
          cost: item.cost,
        })),
        notes: formData.notes || '',
        status: formData.status || 'DRAFT',
      }

      if (editingCount && editingCount.id) {
        const response = await api.put(`/inventory-counts/${editingCount.id}`, submitData)
        console.log('Update response:', response.data)
        toast({ title: 'Success', description: 'Inventory count updated successfully' })
      } else {
        const response = await api.post('/inventory-counts', submitData)
        console.log('Create response:', response.data)
        toast({ title: 'Success', description: 'Inventory count created successfully' })
      }

      setShowForm(false)
      setEditingCount(null)
      setFormData({
        inventoryNumber: '',
        inventoryDate: new Date().toISOString().split('T')[0],
        branchId: branches.length === 1 ? branches[0].id : 0,
        branchName: branches.length === 1 ? getLocalizedName(branches[0]) : '',
        status: 'DRAFT',
        notes: '',
        items: Array.from({ length: 4 }, () => createEmptyItem()),
      })
      loadInventoryCounts()
      loadBranches()
    } catch (error: any) {
      console.error('Error saving inventory count:', error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url,
      })
      toast({
        title: 'Error',
        description: error.response?.data?.message || error.message || 'Failed to save inventory count. Please ensure the backend server is running and the route is registered.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (count: InventoryCount) => {
    if (count.status !== 'DRAFT') {
      toast({
        title: 'Error',
        description: 'Only DRAFT inventory counts can be edited',
        variant: 'destructive',
      })
      return
    }

    const details = await loadCountDetails(count.id!)
    if (details) {
      setEditingCount(details)
      setFormData({
        ...details,
        items: details.items.length > 0 ? details.items : [createEmptyItem()],
      })
      setShowForm(true)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/inventory-counts/${id}`)
      toast({ title: 'Success', description: 'Inventory count deleted successfully' })
      loadInventoryCounts()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  const handleView = async (count: InventoryCount) => {
    const details = await loadCountDetails(count.id!)
    if (details) {
      setViewingCount(details)
    }
  }

  // Filter inventory counts
  const filteredCounts = inventoryCounts.filter((count) => {
    const matchesSearch = 
      count.inventoryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (count.branchName && count.branchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (count.createdByName && count.createdByName.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === 'all' || count.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800'
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800'
      case 'APPROVED':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status label
  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'DRAFT':
        return t('inventoryCounts.statusDraft')
      case 'COMPLETED':
        return t('inventoryCounts.statusCompleted')
      case 'APPROVED':
        return t('inventoryCounts.statusApproved')
      default:
        return status || 'DRAFT'
    }
  }

  // Helper function to format input values
  const formatInputValue = (item: InventoryCountItem, field: 'quantity'): string => {
    if (field === 'quantity') {
      // Always use quantityInput if it exists (even if empty string) - this preserves what user is typing
      if (item.quantityInput !== undefined && item.quantityInput !== null) {
        return item.quantityInput
      }
      // Fallback to quantity value only if quantityInput is not set
      return item.quantity !== undefined && item.quantity !== null && item.quantity !== 0 
        ? item.quantity.toString() 
        : ''
    }
    return ''
  }

  // Helper function to calculate cost based on unit conversion
  // Returns the cost for the selected unit based on the item's primary unit cost
  // Logic: conversionFactor means "X of this unit = 1 of baseUnitId"
  // Example: Piece has baseUnitId=Carton, conversionFactor=12 means "12 Pieces = 1 Carton"
  // So cost per Piece = Carton cost / 12
  const calculateCostByUnit = (item: any, selectedUnitId: number): number => {
    if (!item || !item.price) {
      console.log('calculateCostByUnit: No item or price', { item, selectedUnitId })
      return 0
    }
    
    const primaryUnitId = item.defaultUnitId || 0
    const primaryCost = parseFloat(item.price) || 0
    
    console.log('calculateCostByUnit:', {
      itemId: item.id,
      itemName: item.nameAr || item.nameEn,
      primaryUnitId,
      primaryCost,
      selectedUnitId,
      unitsCount: units.length
    })
    
    // If selected unit is the primary unit, return primary cost
    if (selectedUnitId === primaryUnitId || selectedUnitId === 0) {
      console.log('Selected unit is primary unit, returning primary cost:', primaryCost)
      return primaryCost
    }
    
    // Find the selected unit and primary unit
    const selectedUnit = units.find(u => u.id === selectedUnitId)
    const primaryUnit = units.find(u => u.id === primaryUnitId)
    
    if (!selectedUnit) {
      console.warn('Selected unit not found:', selectedUnitId)
      return primaryCost
    }
    
    if (!primaryUnit) {
      console.warn('Primary unit not found:', primaryUnitId)
      return primaryCost
    }
    
    console.log('Selected unit:', {
      id: selectedUnit.id,
      name: selectedUnit.nameAr || selectedUnit.nameEn,
      baseUnitId: selectedUnit.baseUnitId,
      conversionFactor: selectedUnit.conversionFactor
    })
    
    console.log('Primary unit:', {
      id: primaryUnit.id,
      name: primaryUnit.nameAr || primaryUnit.nameEn,
      baseUnitId: primaryUnit.baseUnitId,
      conversionFactor: primaryUnit.conversionFactor
    })
    
    // Strategy: Try both directions - down from primary, and up from selected
    // The unit hierarchy works like this:
    // - If unit A has baseUnitId = B and conversionFactor = X, it means "1 A = X B" (A contains X of B)
    // - Example: Carton has baseUnitId = Kg, conversionFactor = 10 means "1 Carton = 10 Kg"
    // - So to convert from Carton (primary) to Kg (selected), we go UP the hierarchy
    // - Cost per Kg = Cost per Carton / 10 = 25 / 10 = 2.5
    
    // First, try going UP from primary unit to selected unit (if selected is a base unit of primary)
    let totalConversionFactorUp = 1
    let currentUnitUp: any = primaryUnit
    const visitedUp = new Set<number>()
    const pathUp: any[] = []
    
    // Traverse UP from primary unit to selected unit
    console.log(`Attempting to traverse UP from primary unit ${primaryUnitId} to selected unit ${selectedUnitId}`)
    while (currentUnitUp && currentUnitUp.id !== selectedUnitId) {
      if (visitedUp.has(currentUnitUp.id!)) {
        console.warn('Circular unit reference detected (up)', pathUp)
        break
      }
      visitedUp.add(currentUnitUp.id!)
      pathUp.push({ id: currentUnitUp.id, name: currentUnitUp.nameAr || currentUnitUp.nameEn, baseUnitId: currentUnitUp.baseUnitId, conversionFactor: currentUnitUp.conversionFactor })
      
      // If current unit has a base unit, we're going to a smaller unit
      if (currentUnitUp.baseUnitId) {
        const factor = parseFloat(currentUnitUp.conversionFactor) || 1
        // If 1 Carton = 10 Kg, then cost per Kg = cost per Carton / 10
        totalConversionFactorUp *= factor
        console.log(`  Converting (up from primary): 1 ${currentUnitUp.nameAr || currentUnitUp.nameEn} = ${factor} base unit, total factor: ${totalConversionFactorUp}`)
        // Move to the base unit
        currentUnitUp = units.find((u: any) => u.id === currentUnitUp.baseUnitId)
      } else {
        // Reached a base unit that's not the selected unit
        console.warn('Reached base unit that is not selected unit', currentUnitUp)
        break
      }
    }
    
    // If we successfully reached the selected unit going up
    if (currentUnitUp && currentUnitUp.id === selectedUnitId) {
      // Cost = primary cost / total conversion factor
      // Example: Primary = Carton (25), Selected = Kg, factor = 10
      // totalConversionFactorUp = 10, so cost = 25 / 10 = 2.5
      const calculatedCost = totalConversionFactorUp > 0 ? primaryCost / totalConversionFactorUp : primaryCost
      console.log(`Cost calculation (up from primary): ${primaryCost} / ${totalConversionFactorUp} = ${calculatedCost}`)
      return calculatedCost
    }
    console.log(`Up traversal from primary did not find path from ${primaryUnitId} to ${selectedUnitId}`)
    
    // If not found going up from primary, try going up from selected unit to primary unit
    let totalConversionFactorDown = 1
    let currentUnitDown: any = selectedUnit
    const visitedDown = new Set<number>()
    const pathDown: any[] = []
    
    // Traverse up from selected unit to primary unit
    console.log(`Attempting to traverse UP from selected unit ${selectedUnitId} to primary unit ${primaryUnitId}`)
    while (currentUnitDown && currentUnitDown.id !== primaryUnitId) {
      if (visitedDown.has(currentUnitDown.id!)) {
        console.warn('Circular unit reference detected (down)', pathDown)
        break
      }
      visitedDown.add(currentUnitDown.id!)
      pathDown.push({ id: currentUnitDown.id, name: currentUnitDown.nameAr || currentUnitDown.nameEn, baseUnitId: currentUnitDown.baseUnitId, conversionFactor: currentUnitDown.conversionFactor })
      
      // If current unit has a base unit, multiply by its conversion factor
      if (currentUnitDown.baseUnitId) {
        const factor = parseFloat(currentUnitDown.conversionFactor) || 1
        // If current unit has baseUnitId and conversionFactor = X,
        // The display shows "X current = 1 base", but logically it means "1 current = X base"
        // Example: Kg with baseUnitId=Gram, conversionFactor=1000 means "1 Kg = 1000 Gram"
        // When going UP from Kg to Gram, we multiply by the factor
        totalConversionFactorDown *= factor
        console.log(`  Converting (up from selected): ${factor} ${currentUnitDown.nameAr || currentUnitDown.nameEn} = 1 base unit, total factor: ${totalConversionFactorDown}`)
        // Move to the base unit
        currentUnitDown = units.find((u: any) => u.id === currentUnitDown.baseUnitId)
      } else {
        // Reached a base unit that's not the primary unit
        console.warn('Reached base unit that is not primary unit', currentUnitDown)
        break
      }
    }
    
    // If we successfully reached the primary unit going up from selected
    if (currentUnitDown && currentUnitDown.id === primaryUnitId) {
      // Cost = primary cost / total conversion factor
      // Example: Primary = Carton (48), Selected = Piece (conversionFactor = 12)
      // totalConversionFactorDown = 12, so cost = 48 / 12 = 4
      const calculatedCost = totalConversionFactorDown > 0 ? primaryCost / totalConversionFactorDown : primaryCost
      console.log(`Cost calculation (up from selected): ${primaryCost} / ${totalConversionFactorDown} = ${calculatedCost}`)
      return calculatedCost
    }
    
    // No conversion path found, return primary cost as fallback
    console.warn(`No conversion path found from unit ${selectedUnitId} to primary unit ${primaryUnitId}`, {
      pathDown,
      selectedUnit,
      primaryUnit
    })
    return primaryCost
  }

  // Helper function to handle number input changes
  const handleNumberInputChange = (index: number, field: 'quantity', value: string) => {
    const newItems = [...formData.items]
    const item = newItems[index]
    
    if (field === 'quantity') {
      // Store the raw input value for better UX (allows typing "0", "6.780", etc.)
      const quantityInput = value
      
      // Convert to number for calculation, but allow empty string and "0"
      let numValue = 0
      if (value !== '' && value !== null && value !== undefined && value !== '-') {
        // Allow negative numbers to be typed (will be validated on blur/submit)
        const parsed = parseFloat(value)
        if (!isNaN(parsed)) {
          numValue = parsed
        }
      }
      
      // Calculate total
      const total = numValue * item.cost
      
      // Update item with both raw input and numeric value
      newItems[index] = { 
        ...item, 
        quantity: numValue,
        quantityInput: quantityInput, // Always store the raw input, even if empty
        total 
      }
    }
    
    setFormData({ ...formData, items: newItems })
  }

  // Handle item selection - auto-populate unit and cost
  const handleItemSelect = (itemIndex: number, itemId: number) => {
    const selectedItem = items.find(i => i.id === itemId)
    if (!selectedItem) return

    const newItems = [...formData.items]
    const item = newItems[itemIndex]

    // Check for duplicate
    const duplicateIndex = newItems.findIndex((it, idx) => 
      idx !== itemIndex && it.itemId === itemId && it.itemId > 0
    )

    if (duplicateIndex >= 0) {
      toast({
        title: t('inventoryCounts.duplicateItem') || 'Duplicate Item',
        description: t('inventoryCounts.duplicateItemMessage', { row: duplicateIndex + 1 }) || `This item is already added in row ${duplicateIndex + 1}`,
        variant: 'destructive',
      })
      // Still allow selection but show warning
    }

    // Auto-populate unit (use default unit)
    const defaultUnitId = selectedItem.defaultUnitId || 0
    const defaultUnit = units.find(u => u.id === defaultUnitId)
    
    // Calculate cost based on unit conversion
    const cost = calculateCostByUnit(selectedItem, defaultUnitId)
    
    console.log('handleItemSelect - Cost calculated:', {
      itemId: itemId,
      itemName: getLocalizedName(selectedItem),
      primaryUnitId: defaultUnitId,
      primaryCost: parseFloat(selectedItem.price) || 0,
      calculatedCost: cost
    })

    const updatedItem = {
      ...item,
      itemId: itemId,
      itemName: getLocalizedName(selectedItem),
      unitId: defaultUnitId,
      unitName: defaultUnit ? getLocalizedName(defaultUnit) : '',
      cost: Number(cost.toFixed(4)), // Store with precision but display with 2 decimals
      quantityInput: item.quantityInput || (item.quantity ? item.quantity.toString() : ''),
      total: Number(((item.quantity || 0) * cost).toFixed(2)),
    }
    
    console.log('Setting item with cost:', updatedItem)
    
    newItems[itemIndex] = updatedItem

    setFormData({ ...formData, items: newItems })
  }

  // Handle unit change - recalculate cost based on new unit
  const handleUnitChange = (itemIndex: number, unitId: number) => {
    console.log('handleUnitChange called:', { itemIndex, unitId, currentItem: formData.items[itemIndex] })
    const newItems = [...formData.items]
    const item = newItems[itemIndex]
    
    if (!item.itemId || item.itemId === 0) {
      // No item selected yet, just update the unit
      const unit = units.find(u => u.id === unitId)
      newItems[itemIndex] = {
        ...item,
        unitId: unitId,
        unitName: unit ? getLocalizedName(unit) : '',
      }
      setFormData({ ...formData, items: newItems })
      return
    }
    
    const unit = units.find(u => u.id === unitId)
    
    // Find the item to get its primary unit and cost
    const selectedItem = items.find(i => i.id === item.itemId)
    
    if (!selectedItem) {
      console.warn('Item not found for unit change:', item.itemId)
      newItems[itemIndex] = {
        ...item,
        unitId: unitId,
        unitName: unit ? getLocalizedName(unit) : '',
      }
      setFormData({ ...formData, items: newItems })
      return
    }
    
    // Calculate new cost based on unit conversion
    const newCost = calculateCostByUnit(selectedItem, unitId)
    console.log('New cost calculated:', {
      itemId: item.itemId,
      itemName: getLocalizedName(selectedItem),
      oldCost: item.cost,
      newCost: newCost,
      selectedUnitId: unitId,
      primaryUnitId: selectedItem.defaultUnitId,
      quantity: item.quantity
    })
    
    const newTotal = (item.quantity || 0) * newCost
    
    const updatedItem = {
      ...item,
      unitId: unitId,
      unitName: unit ? getLocalizedName(unit) : '',
      cost: Number(newCost.toFixed(4)), // Store with precision but display with 2 decimals
      quantityInput: item.quantityInput || (item.quantity ? item.quantity.toString() : ''),
      total: Number(newTotal.toFixed(2)), // Recalculate total with new cost
    }
    
    console.log('Updated item with new cost:', updatedItem)
    
    newItems[itemIndex] = updatedItem
    setFormData({ ...formData, items: newItems })
  }

  // Add new item row
  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, createEmptyItem()],
    })
  }

  // Remove item row
  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index)
    setFormData({ ...formData, items: newItems.length > 0 ? newItems : [createEmptyItem()] })
  }

  // Calculate grand total
  const grandTotal = formData.items.reduce((sum, item) => sum + (item.total || 0), 0)

  // Print inventory count
  const handlePrint = () => {
    if (!viewingCount) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const isArabic = i18n.language === 'ar'
    const htmlContent = `
      <!DOCTYPE html>
      <html dir="${isArabic ? 'rtl' : 'ltr'}" lang="${isArabic ? 'ar' : 'en'}">
        <head>
          <meta charset="UTF-8">
          <title>${viewingCount.inventoryNumber}</title>
          ${isArabic ? '<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap" rel="stylesheet">' : ''}
          <style>
            body {
              font-family: ${isArabic ? "'Cairo', 'Arial'" : "'Arial'"}, sans-serif;
              direction: ${isArabic ? 'rtl' : 'ltr'};
              padding: 20px;
              color: #111827;
            }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 20px; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .info-item { margin-bottom: 10px; }
            .info-label { font-weight: bold; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: ${isArabic ? 'left' : 'right'}; }
            .notes { margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>${t('inventoryCounts.title')} - ${viewingCount.inventoryNumber}</h1>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.inventoryNumber')}:</div>
              <div>${viewingCount.inventoryNumber}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.inventoryDate')}:</div>
              <div>${formatDateUtil(viewingCount.inventoryDate)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.branch')}:</div>
              <div>${viewingCount.branchName || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.status')}:</div>
              <div>${getStatusLabel(viewingCount.status)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.createdBy')}:</div>
              <div>${viewingCount.createdByName || '-'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">${t('inventoryCounts.createdDate')}:</div>
              <div>${viewingCount.createdAt ? formatDateUtil(viewingCount.createdAt) : '-'}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>${t('inventoryCounts.itemName')}</th>
                <th class="text-center">${t('inventoryCounts.quantity')}</th>
                <th>${t('inventoryCounts.unit')}</th>
                <th class="text-right">${t('inventoryCounts.cost')}</th>
                <th class="text-right">${t('inventoryCounts.total')}</th>
              </tr>
            </thead>
            <tbody>
              ${viewingCount.items.map((item) => `
                <tr>
                  <td>${item.itemName}</td>
                  <td class="text-center">${formatNumber(item.quantity)}</td>
                  <td>${item.unitName}</td>
                  <td class="text-right">${formatNumber(item.cost)}</td>
                  <td class="text-right">${formatNumber(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">
            ${t('inventoryCounts.grandTotal')}: ${formatNumber(viewingCount.items.reduce((sum, item) => sum + item.total, 0))}
          </div>
          ${viewingCount.notes ? `
            <div class="notes">
              <strong>${t('inventoryCounts.notes')}:</strong><br>
              ${viewingCount.notes}
            </div>
          ` : ''}
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.print()
    }, 500)
  }

  // Download PDF
  const handleDownloadPDF = async () => {
    if (!viewingCount) return

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
      pdfContent.style.color = '#111827'

      if (isArabic) {
        const fontLink = document.createElement('link')
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700&display=swap'
        fontLink.rel = 'stylesheet'
        document.head.appendChild(fontLink)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      pdfContent.innerHTML = `
        <div style="margin-bottom: 20px;">
          <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 20px;">${t('inventoryCounts.title')} - ${viewingCount.inventoryNumber}</h1>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div><strong>${t('inventoryCounts.inventoryNumber')}:</strong> ${viewingCount.inventoryNumber}</div>
            <div><strong>${t('inventoryCounts.inventoryDate')}:</strong> ${formatDateUtil(viewingCount.inventoryDate)}</div>
            <div><strong>${t('inventoryCounts.branch')}:</strong> ${viewingCount.branchName || '-'}</div>
            <div><strong>${t('inventoryCounts.status')}:</strong> ${getStatusLabel(viewingCount.status)}</div>
            <div><strong>${t('inventoryCounts.createdBy')}:</strong> ${viewingCount.createdByName || '-'}</div>
            <div><strong>${t('inventoryCounts.createdDate')}:</strong> ${viewingCount.createdAt ? formatDateUtil(viewingCount.createdAt) : '-'}</div>
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">${t('inventoryCounts.itemName')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">${t('inventoryCounts.quantity')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'right' : 'left'};">${t('inventoryCounts.unit')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${t('inventoryCounts.cost')}</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${t('inventoryCounts.total')}</th>
            </tr>
          </thead>
          <tbody>
            ${viewingCount.items.map((item) => `
              <tr>
                <td style="border: 1px solid #000; padding: 8px;">${item.itemName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center; direction: ltr;">${formatNumber(item.quantity)}</td>
                <td style="border: 1px solid #000; padding: 8px;">${item.unitName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${formatNumber(item.cost)}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: ${isArabic ? 'left' : 'right'}; direction: ltr;">${formatNumber(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; font-size: 18px; font-weight: bold; text-align: ${isArabic ? 'left' : 'right'};">
          ${t('inventoryCounts.grandTotal')}: ${formatNumber(viewingCount.items.reduce((sum, item) => sum + item.total, 0))}
        </div>
        ${viewingCount.notes ? `
          <div style="margin-top: 20px; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
            <strong>${t('inventoryCounts.notes')}:</strong><br>
            ${viewingCount.notes}
          </div>
        ` : ''}
      `

      document.body.appendChild(pdfContent)

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `InventoryCount_${viewingCount.inventoryNumber}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, allowTaint: true, backgroundColor: '#ffffff', windowWidth: 1200, windowHeight: 1600 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }

      await html2pdf().set(opt).from(pdfContent).save()
      document.body.removeChild(pdfContent)

      toast({
        title: 'Success',
        description: 'PDF downloaded successfully',
      })
    } catch (error) {
      console.error('PDF generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate PDF',
        variant: 'destructive',
      })
    }
  }

  // Export to Excel
  const handleExportExcel = () => {
    if (!viewingCount) return

    try {
      const exportData = viewingCount.items.map((item) => ({
        [t('inventoryCounts.itemName')]: item.itemName,
        [t('inventoryCounts.quantity')]: item.quantity,
        [t('inventoryCounts.unit')]: item.unitName,
        [t('inventoryCounts.cost')]: item.cost,
        [t('inventoryCounts.total')]: item.total,
      }))

      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Items')

      const filename = `InventoryCount_${viewingCount.inventoryNumber}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, filename)

      toast({
        title: 'Success',
        description: `Exported ${viewingCount.items.length} items to Excel`,
      })
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Error',
        description: 'Failed to export to Excel',
        variant: 'destructive',
      })
    }
  }

  // Initialize form with 4 empty rows
  useEffect(() => {
    if (showForm && !editingCount && formData.items.length === 0) {
      setFormData(prev => ({
        ...prev,
        items: Array.from({ length: 4 }, () => createEmptyItem()),
      }))
    }
  }, [showForm])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('inventoryCounts.title')}</h1>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingCount(null)
            setFormData({
              inventoryNumber: '',
              inventoryDate: new Date().toISOString().split('T')[0],
              branchId: branches.length === 1 ? branches[0].id : 0,
              branchName: branches.length === 1 ? getLocalizedName(branches[0]) : '',
              status: 'DRAFT',
              notes: '',
              items: Array.from({ length: 4 }, () => createEmptyItem()),
            })
          }}
        >
          <Plus className="w-4 h-4 me-2" />
          {t('inventoryCounts.newInventoryCount')}
        </Button>
      </div>

      {/* Search and Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[220px] max-w-[280px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('inventoryCounts.searchInventoryCounts')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <div className="min-w-[200px] max-w-[240px]">
              <SearchableSelect
                options={[
                  { value: 'all', label: t('inventoryCounts.allStatuses') },
                  { value: 'DRAFT', label: t('inventoryCounts.statusDraft') },
                  { value: 'COMPLETED', label: t('inventoryCounts.statusCompleted') },
                  { value: 'APPROVED', label: t('inventoryCounts.statusApproved') },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter(value as string)}
                placeholder={t('inventoryCounts.filterByStatus')}
                className="h-12"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCount ? t('inventoryCounts.editInventoryCount') : t('inventoryCounts.newInventoryCount')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('inventoryCounts.inventoryDate')}</Label>
                  <Input
                    type="date"
                    value={formData.inventoryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, inventoryDate: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('inventoryCounts.branch')}</Label>
                  <SearchableSelect
                    options={branches.map((branch) => ({
                      value: branch.id,
                      label: getLocalizedName(branch),
                    }))}
                    value={formData.branchId || 0}
                    onChange={(value) => {
                      const branch = branches.find(b => b.id === value)
                      setFormData({
                        ...formData,
                        branchId: value as number,
                        branchName: branch ? getLocalizedName(branch) : '',
                      })
                    }}
                    placeholder={t('inventoryCounts.selectBranch')}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('inventoryCounts.status')}</Label>
                  <SearchableSelect
                    options={[
                      { value: 'DRAFT', label: t('inventoryCounts.statusDraft') },
                      { value: 'COMPLETED', label: t('inventoryCounts.statusCompleted') },
                      { value: 'APPROVED', label: t('inventoryCounts.statusApproved') },
                    ]}
                    value={formData.status || 'DRAFT'}
                    onChange={(value) =>
                      setFormData({ ...formData, status: value as 'DRAFT' | 'COMPLETED' | 'APPROVED' })
                    }
                    className="h-10"
                  />
                </div>
              </div>

              {/* Items Table */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label className="text-base font-semibold">{t('inventoryCounts.items')}</Label>
                  <Button type="button" onClick={handleAddItem} size="sm">
                    <Plus className="w-4 h-4 me-2" />
                    {t('inventoryCounts.addItem')}
                  </Button>
                </div>
                {formData.items.length === 0 ? (
                  <div className="border border-gray-200 rounded-md p-8 text-center text-gray-500">
                    {t('inventoryCounts.noItems') || 'No items'}
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-md overflow-visible">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="text-center !text-xs w-[30%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('inventoryCounts.itemName')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[15%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('inventoryCounts.quantity')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[20%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('inventoryCounts.unit')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[15%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('inventoryCounts.cost')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[15%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('inventoryCounts.total')}
                          </TableHead>
                          <TableHead 
                            className="text-center !text-xs w-[5%] whitespace-nowrap" 
                            style={{ padding: '0.75rem 0.5rem', verticalAlign: 'middle' }}
                          >
                            {t('common.actions')}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {formData.items.map((item, index) => {
                          const isDuplicate = formData.items.some((it, idx) => 
                            idx !== index && it.itemId === item.itemId && item.itemId > 0
                          )
                          const hasItem = item.itemId > 0
                          
                          return (
                            <TableRow 
                              key={index}
                              className={cn(
                                isDuplicate && 'bg-red-50 border-l-4 border-l-red-500',
                                hasItem && !isDuplicate && 'bg-green-50/30 transition-colors duration-300'
                              )}
                            >
                              {/* Item Name - Right aligned for Arabic, Left for English */}
                              <TableCell 
                                className="!p-0"
                                style={{ 
                                  textAlign: isArabic ? 'right' : 'left',
                                  padding: '0.625rem 0.5rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                <SearchableSelect
                                  options={items.map((it) => ({
                                    value: it.id,
                                    label: getLocalizedName(it),
                                    code: it.code || '',
                                    searchText: isArabic ? it.nameEn : it.nameAr
                                  }))}
                                  value={item.itemId}
                                  onChange={(value) => handleItemSelect(index, value as number)}
                                  placeholder={t('inventoryCounts.selectItem')}
                                  required
                                  dir={isArabic ? 'rtl' : 'ltr'}
                                  className="h-8"
                                />
                              </TableCell>
                              {/* Quantity - Right aligned numeric */}
                              <TableCell 
                                className="!p-0"
                                style={{ 
                                  textAlign: isArabic ? 'left' : 'right',
                                  padding: '0.625rem 0.5rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                <Input
                                  type="text"
                                  inputMode="decimal"
                                  value={formatInputValue(item, 'quantity')}
                                  onChange={(e) => {
                                    // Allow digits, decimal point, and minus sign
                                    const inputValue = e.target.value
                                    // Allow empty string, numbers, decimals, and negative numbers
                                    if (inputValue === '' || /^-?\d*\.?\d*$/.test(inputValue)) {
                                      handleNumberInputChange(index, 'quantity', inputValue)
                                    }
                                  }}
                                  onBlur={(e) => {
                                    // On blur, normalize the value (remove trailing zeros if needed)
                                    const value = e.target.value.trim()
                                    if (value === '' || value === '-') {
                                      handleNumberInputChange(index, 'quantity', '')
                                    } else {
                                      const numValue = parseFloat(value)
                                      if (!isNaN(numValue)) {
                                        // Store the normalized value
                                        const newItems = [...formData.items]
                                        newItems[index] = {
                                          ...item,
                                          quantity: numValue,
                                          quantityInput: numValue.toString(),
                                          total: numValue * item.cost
                                        }
                                        setFormData({ ...formData, items: newItems })
                                      }
                                    }
                                  }}
                                  data-row-index={index}
                                  data-field="quantity"
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
                              {/* Unit - Right aligned for Arabic, Left for English */}
                              <TableCell 
                                className="!p-0"
                                style={{ 
                                  textAlign: isArabic ? 'right' : 'left',
                                  padding: '0.625rem 0.5rem',
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
                                  onChange={(value) => handleUnitChange(index, value as number)}
                                  placeholder={t('inventoryCounts.selectUnit')}
                                  required
                                  dir={isArabic ? 'rtl' : 'ltr'}
                                  className="h-8"
                                  disabled={!item.itemId}
                                />
                              </TableCell>
                              {/* Cost - Right aligned numeric (read-only) */}
                              <TableCell 
                                className="!p-0"
                                style={{ 
                                  textAlign: isArabic ? 'left' : 'right',
                                  padding: '0.625rem 0.5rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                <Input
                                  key={`cost-${index}-${item.cost}-${item.unitId}`}
                                  type="number"
                                  step="0.01"
                                  value={item.cost !== undefined && item.cost !== null ? Number(item.cost).toFixed(2) : '0.00'}
                                  readOnly
                                  placeholder="0.00"
                                  className="h-8 w-full text-xs border border-gray-300 bg-gray-50"
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
                              {/* Total - Right aligned numeric (read-only) */}
                              <TableCell 
                                className="!p-0 font-medium text-xs"
                                style={{ 
                                  textAlign: isArabic ? 'left' : 'right',
                                  padding: '0.625rem 0.5rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                {formatNumber(item.total)}
                              </TableCell>
                              {/* Actions - Center aligned */}
                              <TableCell 
                                className="!p-0 text-center"
                                style={{ 
                                  textAlign: 'center',
                                  padding: '0.625rem 0.5rem',
                                  verticalAlign: 'middle'
                                }}
                              >
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(index)}
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

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="flex items-center gap-4">
                  <div className="text-lg font-bold text-gray-900">
                    {t('inventoryCounts.grandTotal')}:
                  </div>
                  <div className={`text-xl font-bold text-secondary-600 ${isArabic ? 'text-right' : 'text-left'}`}>
                    {formatNumber(grandTotal)}
                  </div>
                </div>
              </div>

              {/* Notes Field */}
              <div className="mt-4">
                <Label htmlFor="notes">{t('inventoryCounts.notes')}</Label>
                <textarea
                  id="notes"
                  rows={3}
                  maxLength={500}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder={t('inventoryCounts.notesPlaceholder')}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:ring-secondary-600 focus:border-transparent"
                  style={{
                    direction: isArabic ? 'rtl' : 'ltr',
                    textAlign: isArabic ? 'right' : 'left'
                  }}
                />
                <div className={`text-xs text-gray-500 mt-1 ${isArabic ? 'text-right' : 'text-left'}`}>
                  {(formData.notes || '').length} / 500 {t('purchaseOrders.characters') || 'characters'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingCount(null)
                  }}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? t('common.loading') : t('common.save')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* List Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('inventoryCounts.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.inventoryNumber')}</TableHead>
                <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.branch')}</TableHead>
                <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.inventoryDate')}</TableHead>
                <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.status')}</TableHead>
                <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.createdBy')}</TableHead>
                <TableHead className="text-center" style={{ textAlign: 'center' }}>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    {t('inventoryCounts.noInventoryCounts')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCounts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{count.inventoryNumber}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{count.branchName || '-'}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{formatDateUtil(count.inventoryDate)}</TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(count.status)}`}>
                        {getStatusLabel(count.status)}
                      </span>
                    </TableCell>
                    <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{count.createdByName || '-'}</TableCell>
                    <TableCell className="text-center" style={{ textAlign: 'center' }}>
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(count)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {count.status === 'DRAFT' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(count)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(t('inventoryCounts.confirmDelete'))) {
                                  handleDelete(count.id!)
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Modal */}
      {viewingCount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('inventoryCounts.inventoryCountDetails')}</CardTitle>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handlePrint}>
                    <Printer className="w-4 h-4 me-2" />
                    {t('common.print')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                    <Download className="w-4 h-4 me-2" />
                    {t('common.downloadPDF')}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportExcel}>
                    <Download className="w-4 h-4 me-2" />
                    {t('inventoryCounts.exportExcel')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setViewingCount(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.inventoryNumber')}</Label>
                    <p>{viewingCount.inventoryNumber}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.inventoryDate')}</Label>
                    <p>{formatDateUtil(viewingCount.inventoryDate)}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.branch')}</Label>
                    <p>{viewingCount.branchName || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.status')}</Label>
                    <p>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(viewingCount.status)}`}>
                        {getStatusLabel(viewingCount.status)}
                      </span>
                    </p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.createdBy')}</Label>
                    <p>{viewingCount.createdByName || '-'}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">{t('inventoryCounts.createdDate')}</Label>
                    <p>{viewingCount.createdAt ? formatDateUtil(viewingCount.createdAt) : '-'}</p>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold mb-2 block">{t('inventoryCounts.items')}</Label>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.itemName')}</TableHead>
                          <TableHead className="text-center" style={{ textAlign: 'center' }}>{t('inventoryCounts.quantity')}</TableHead>
                          <TableHead style={{ textAlign: isArabic ? 'right' : 'left' }}>{t('inventoryCounts.unit')}</TableHead>
                          <TableHead className="text-end" style={{ textAlign: isArabic ? 'left' : 'right' }}>{t('inventoryCounts.cost')}</TableHead>
                          <TableHead className="text-end" style={{ textAlign: isArabic ? 'left' : 'right' }}>{t('inventoryCounts.total')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingCount.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{item.itemName}</TableCell>
                            <TableCell className="text-center" style={{ textAlign: 'center' }}>{formatNumber(item.quantity)}</TableCell>
                            <TableCell style={{ textAlign: isArabic ? 'right' : 'left' }}>{item.unitName}</TableCell>
                            <TableCell className="text-end" style={{ textAlign: isArabic ? 'left' : 'right' }}>{formatNumber(item.cost)}</TableCell>
                            <TableCell className="text-end" style={{ textAlign: isArabic ? 'left' : 'right' }}>{formatNumber(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="mt-4">
                  <Label className="font-semibold mb-2 block">{t('inventoryCounts.grandTotal')}</Label>
                  <p className="text-lg font-bold">
                    {formatNumber(viewingCount.items.reduce((sum, item) => sum + item.total, 0))}
                  </p>
                </div>
                {viewingCount.notes && (
                  <div className="mt-4">
                    <Label className="font-semibold mb-2 block">{t('inventoryCounts.notes')}</Label>
                    <div className="p-3 border rounded-md bg-gray-50">
                      <p className="whitespace-pre-wrap">{viewingCount.notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
