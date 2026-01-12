import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { formatNumber } from '@/lib/format'
import { getLocalizedName, getLocalizedCategoryName } from '@/lib/i18n-utils'
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
import { Plus, Edit, Trash2, Search, Download } from 'lucide-react'
import * as XLSX from 'xlsx'

interface Item {
  id?: number
  code: string
  name?: string // For backward compatibility
  nameAr?: string
  nameEn?: string
  defaultUnitId: number
  price: number
  category?: string // For backward compatibility
  categoryId?: number
  categoryNameAr?: string
  categoryNameEn?: string
}

export default function Items() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Item[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<Item>({
    code: '',
    nameAr: '',
    nameEn: '',
    defaultUnitId: 0,
    price: 0,
    categoryId: 0,
  })

  useEffect(() => {
    loadItems()
    loadUnits()
    loadCategories()
  }, [])

  const loadItems = async () => {
    try {
      const res = await api.get('/items')
      const itemsData = Array.isArray(res.data) ? res.data : []
      // Ensure price is a number
      const normalizedItems = itemsData.map((item: any) => ({
        ...item,
        price: typeof item.price === 'number' ? item.price : parseFloat(String(item.price || '0')) || 0,
      }))
      setItems(normalizedItems)
    } catch (error) {
      console.error('Failed to load items:', error)
      setItems([]) // Set empty array on error
    }
  }

  const loadUnits = async () => {
    try {
      const res = await api.get('/units')
      setUnits(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to load units:', error)
      setUnits([]) // Set empty array on error
    }
  }

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.error('Failed to load categories:', error)
      setCategories([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingId) {
        await api.put(`/items/${editingId}`, formData)
        toast({ title: 'Success', description: 'Item updated' })
      } else {
        await api.post('/items', formData)
        toast({ title: 'Success', description: 'Item created' })
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        code: '',
        nameAr: '',
        nameEn: '',
        defaultUnitId: 0,
        price: 0,
        categoryId: 0,
      })
      loadItems()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Operation failed',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (item: Item) => {
    setEditingId(item.id!)
    setFormData({
      ...item,
      nameAr: item.nameAr || item.name || '',
      nameEn: item.nameEn || item.name || '',
      categoryId: item.categoryId || 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    try {
      await api.delete(`/items/${id}`)
      toast({ title: 'Success', description: 'Item deleted' })
      loadItems()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  // Filter items by search term (item code or name)
  const filteredItems = items.filter((item) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    const itemCode = item.code?.toLowerCase() || ''
    const itemNameAr = item.nameAr?.toLowerCase() || ''
    const itemNameEn = item.nameEn?.toLowerCase() || ''
    const itemName = item.name?.toLowerCase() || ''
    
    return (
      itemCode.includes(searchLower) ||
      itemNameAr.includes(searchLower) ||
      itemNameEn.includes(searchLower) ||
      itemName.includes(searchLower)
    )
  })

  // Export to Excel
  const handleExportExcel = () => {
    try {
      // Prepare data for export
      const exportData = filteredItems.map((item) => {
        const unit = units.find((u) => u.id === item.defaultUnitId)
        const unitName = unit ? getLocalizedName(unit) || unit.nameAr || unit.nameEn || unit.name || '-' : '-'
        const categoryName = getLocalizedCategoryName(item) || '-'
        
        return {
          [t('items.itemCode')]: item.code,
          [t('items.itemName') + ' (AR)']: item.nameAr || '',
          [t('items.itemName') + ' (EN)']: item.nameEn || '',
          [t('items.defaultUnit')]: unitName,
          [t('items.price')]: item.price || 0,
          [t('items.category')]: categoryName,
        }
      })

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Items')

      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0]
      const filename = `Items_${date}.xlsx`

      // Write and download
      XLSX.writeFile(wb, filename)
      
      toast({
        title: 'Success',
        description: `Exported ${filteredItems.length} items to Excel`,
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('items.title')}</h1>
        <Button onClick={() => {
          setShowForm(true)
          setEditingId(null)
          setFormData({
            code: '',
            name: '',
            defaultUnitId: 0,
            price: 0,
            category: '',
          })
        }}>
          <Plus className="w-4 h-4 me-2" />
          {t('items.newItem')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t('common.edit') : t('items.newItem')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('items.itemCode')}</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('items.itemName')} - {t('common.welcome') === 'مرحباً' ? 'العربية' : 'Arabic'}</Label>
                  <Input
                    value={formData.nameAr || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('items.itemName')} - English</Label>
                  <Input
                    value={formData.nameEn || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('items.defaultUnit')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={formData.defaultUnitId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        defaultUnitId: parseInt(e.target.value),
                      })
                    }
                    required
                  >
                    <option value={0}>{t('items.selectUnit')}</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {getLocalizedName(unit)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t('items.price')}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>{t('items.category')}</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={formData.categoryId || 0}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: parseInt(e.target.value) || 0,
                      })
                    }
                  >
                    <option value={0}>No category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {getLocalizedName(category)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
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

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('items.title')}</CardTitle>
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={filteredItems.length === 0}
            >
              <Download className="w-4 h-4 me-2" />
              {t('items.exportExcel')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder={t('items.searchItems')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">{t('items.itemCode')}</TableHead>
                <TableHead className="text-right">{t('items.itemName')}</TableHead>
                <TableHead className="text-right">{t('items.defaultUnit')}</TableHead>
                <TableHead className="text-right">{t('items.price')}</TableHead>
                <TableHead className="text-right">{t('items.category')}</TableHead>
                <TableHead className="text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    {searchTerm ? t('items.noItemsFound') : t('items.noItems')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-right">{item.code}</TableCell>
                    <TableCell className="text-right">{getLocalizedName(item)}</TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const unit = units.find((u) => u.id === item.defaultUnitId)
                        return unit ? getLocalizedName(unit) || unit.nameAr || unit.nameEn || unit.name || '-' : '-'
                      })()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(item.price)}
                    </TableCell>
                    <TableCell className="text-right">{getLocalizedCategoryName(item) || '-'}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
