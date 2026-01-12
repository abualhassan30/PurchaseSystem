import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import i18n from '@/i18n/config'
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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Plus, Edit, Trash2, Search } from 'lucide-react'

interface Branch {
  id?: number
  nameAr: string
  nameEn: string
  code: string
  city: string
  isActive?: boolean
}

export default function Branches() {
  const { t } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState<Branch>({
    nameAr: '',
    nameEn: '',
    code: '',
    city: '',
    isActive: true,
  })

  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    try {
      const res = await api.get('/branches')
      setBranches(Array.isArray(res.data) ? res.data : [])
    } catch (error: any) {
      console.error('Failed to load branches:', error)
      if (error.response?.status === 404) {
        toast({
          title: 'Error',
          description: 'Branches endpoint not found. Please ensure the backend API is configured.',
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
          description: 'Failed to load branches. Please check if the backend server is running.',
          variant: 'destructive',
        })
      }
      setBranches([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.nameAr.trim() || !formData.nameEn.trim()) {
      toast({
        title: 'Error',
        description: t('branches.nameRequired'),
        variant: 'destructive',
      })
      return
    }

    if (!formData.code.trim()) {
      toast({
        title: 'Error',
        description: t('branches.codeRequired'),
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Prepare data for API - ensure all fields are properly formatted
      const submitData = {
        nameAr: formData.nameAr.trim(),
        nameEn: formData.nameEn.trim(),
        code: formData.code.trim().toUpperCase(),
        city: formData.city?.trim() || '',
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      }

      console.log('Submitting branch data:', submitData)

      if (editingId) {
        await api.put(`/branches/${editingId}`, submitData)
        toast({
          title: t('common.success'),
          description: t('branches.branchUpdated'),
        })
      } else {
        await api.post('/branches', submitData)
        toast({
          title: t('common.success'),
          description: t('branches.branchCreated'),
        })
      }
      setShowForm(false)
      setEditingId(null)
      setFormData({
        nameAr: '',
        nameEn: '',
        code: '',
        city: '',
        isActive: true,
      })
      loadBranches()
    } catch (error: any) {
      console.error('Error saving branch:', error)
      console.error('Error response:', error.response?.data)
      console.error('Request URL:', error.config?.url)
      console.error('Status:', error.response?.status)
      console.error('Request data:', error.config?.data)
      
      let errorMessage = t('branches.saveError')
      
      if (error.response?.status === 404) {
        errorMessage = 'Branches endpoint not found. Please ensure the backend API is configured and the server is running.'
      } else if (error.response?.status === 400) {
        errorMessage = error.response?.data?.message || 'Invalid data. Please check all fields are filled correctly.'
      } else if (error.response?.status === 409) {
        errorMessage = error.response?.data?.message || 'Branch code already exists. Please use a different code.'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (branch: Branch) => {
    setEditingId(branch.id || null)
    setFormData({
      nameAr: branch.nameAr,
      nameEn: branch.nameEn,
      code: branch.code,
      city: branch.city || '',
      isActive: branch.isActive !== undefined ? branch.isActive : true,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('branches.confirmDelete'))) {
      return
    }

    try {
      await api.delete(`/branches/${id}`)
      toast({
        title: t('common.success'),
        description: t('branches.branchDeleted'),
      })
      loadBranches()
    } catch (error: any) {
      console.error('Error deleting branch:', error)
      toast({
        title: 'Error',
        description: error.response?.data?.message || t('branches.deleteError'),
        variant: 'destructive',
      })
    }
  }

  const filteredBranches = branches.filter(branch => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      branch.nameAr.toLowerCase().includes(term) ||
      branch.nameEn.toLowerCase().includes(term) ||
      branch.code.toLowerCase().includes(term) ||
      (branch.city && branch.city.toLowerCase().includes(term))
    )
  })

  const activeBranches = filteredBranches.filter(b => b.isActive !== false)
  const inactiveBranches = filteredBranches.filter(b => b.isActive === false)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{t('branches.title')}</h1>
        <Button onClick={() => {
          setShowForm(true)
          setEditingId(null)
          setFormData({
            nameAr: '',
            nameEn: '',
            code: '',
            city: '',
            isActive: true,
          })
        }}>
          <Plus className="w-4 h-4 me-2" />
          {t('branches.newBranch')}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t('branches.editBranch') : t('branches.newBranch')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('branches.nameAr')} *</Label>
                  <Input
                    value={formData.nameAr}
                    onChange={(e) => setFormData({ ...formData, nameAr: e.target.value })}
                    required
                    dir="rtl"
                    style={{ textAlign: 'right' }}
                  />
                </div>
                <div>
                  <Label>{t('branches.nameEn')} *</Label>
                  <Input
                    value={formData.nameEn}
                    onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
                    required
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('branches.code')} *</Label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    dir="ltr"
                    style={{ textAlign: 'left' }}
                    placeholder="BR001"
                  />
                </div>
                <div>
                  <Label>{t('branches.city')}</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    dir={isArabic ? 'rtl' : 'ltr'}
                    style={{ textAlign: isArabic ? 'right' : 'left' }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingId(null)
                    setFormData({
                      nameAr: '',
                      nameEn: '',
                      code: '',
                      city: '',
                      isActive: true,
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
          <div className="flex justify-between items-center">
            <CardTitle>{t('branches.branchList')}</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('branches.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                dir={isArabic ? 'rtl' : 'ltr'}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('branches.code')}</TableHead>
                <TableHead>{t('branches.nameAr')}</TableHead>
                <TableHead>{t('branches.nameEn')}</TableHead>
                <TableHead>{t('branches.city')}</TableHead>
                <TableHead className="text-center">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeBranches.length === 0 && inactiveBranches.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    {searchTerm ? t('branches.noResults') : t('branches.noBranches')}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {activeBranches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-mono">{branch.code}</TableCell>
                      <TableCell dir="rtl" style={{ textAlign: 'right' }}>
                        {branch.nameAr}
                      </TableCell>
                      <TableCell dir="ltr" style={{ textAlign: 'left' }}>
                        {branch.nameEn}
                      </TableCell>
                      <TableCell>{branch.city || '-'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(branch)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => branch.id && handleDelete(branch.id)}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {inactiveBranches.length > 0 && (
                    <>
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50 font-semibold">
                          {t('branches.inactiveBranches')}
                        </TableCell>
                      </TableRow>
                      {inactiveBranches.map((branch) => (
                        <TableRow key={branch.id} className="opacity-60">
                          <TableCell className="font-mono">{branch.code}</TableCell>
                          <TableCell dir="rtl" style={{ textAlign: 'right' }}>
                            {branch.nameAr}
                          </TableCell>
                          <TableCell dir="ltr" style={{ textAlign: 'left' }}>
                            {branch.nameEn}
                          </TableCell>
                          <TableCell>{branch.city || '-'}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(branch)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => branch.id && handleDelete(branch.id)}
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
