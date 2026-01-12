import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/lib/api'
import { getLocalizedName } from '@/lib/i18n-utils'
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
import { Plus, Edit, Trash2 } from 'lucide-react'

interface Category {
  id?: number
  nameAr: string
  nameEn: string
}

export default function Categories() {
  const { t } = useTranslation()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Category>({
    nameAr: '',
    nameEn: '',
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const res = await api.get('/categories')
      setCategories(Array.isArray(res.data) ? res.data : [])
    } catch (error: any) {
      console.error('Failed to load categories:', error)
      console.error('Error response:', error.response?.data)
      console.error('Request URL:', error.config?.url)
      console.error('Status:', error.response?.status)
      
      if (error.response?.status === 404) {
        toast({
          title: 'Error',
          description: 'Categories endpoint not found. Please restart the backend server.',
          variant: 'destructive',
        })
      } else if (error.response?.data?.message) {
        toast({
          title: 'Error',
          description: error.response.data.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load categories. Please check if the backend server is running.',
          variant: 'destructive',
        })
      }
      setCategories([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nameAr || !formData.nameEn) {
      toast({
        title: 'Error',
        description: 'Both Arabic and English names are required',
        variant: 'destructive',
      })
      return
    }
    
    setLoading(true)
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData)
        toast({ title: 'Success', description: 'Category updated' })
      } else {
        await api.post('/categories', formData)
        toast({ title: 'Success', description: 'Category created' })
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        nameAr: '',
        nameEn: '',
      })
      loadCategories()
    } catch (error: any) {
      console.error('Category operation error:', error)
      console.error('Error response:', error.response?.data)
      console.error('Request URL:', error.config?.url)
      console.error('Status:', error.response?.status)
      
      if (error.response?.status === 404) {
        toast({
          title: 'Error',
          description: 'Categories endpoint not found. Please restart the backend server.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.message || error.message || 'Operation failed',
          variant: 'destructive',
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id!)
    setFormData(category)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this category?')) return
    
    try {
      await api.delete(`/categories/${id}`)
      toast({ title: 'Success', description: 'Category deleted' })
      loadCategories()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('categories.title')}</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 me-2" />
          {t('categories.newCategory')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t('categories.editCategory') : t('categories.newCategory')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('categories.nameAr')}</Label>
                  <Input
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('categories.nameEn')}</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({
                      nameAr: '',
                      nameEn: '',
                    })
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
          <CardTitle>{t('categories.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">{t('categories.nameAr')}</TableHead>
                <TableHead className="text-start">{t('categories.nameEn')}</TableHead>
                <TableHead className="text-start">{t('categories.displayName')}</TableHead>
                <TableHead className="text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-gray-500">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="text-start">{category.nameAr}</TableCell>
                    <TableCell className="text-start">{category.nameEn}</TableCell>
                    <TableCell className="text-start font-medium">
                      {getLocalizedName(category)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(category.id!)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
