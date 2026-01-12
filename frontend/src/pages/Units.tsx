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

interface Unit {
  id?: number
  name?: string // For backward compatibility
  nameAr?: string
  nameEn?: string
  baseUnitId: number | null
  conversionFactor: number
  isBaseUnit?: boolean // Helper for UI
}

export default function Units() {
  const { t } = useTranslation()
  const [units, setUnits] = useState<Unit[]>([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isBaseUnit, setIsBaseUnit] = useState(true)
  const [formData, setFormData] = useState<Unit>({
    nameAr: '',
    nameEn: '',
    baseUnitId: null,
    conversionFactor: 1,
  })

  useEffect(() => {
    loadUnits()
  }, [])

  const loadUnits = async () => {
    try {
      const res = await api.get('/units')
      const unitsData = Array.isArray(res.data) ? res.data : []
      console.log('Loaded units:', unitsData) // Debug log
      setUnits(unitsData)
    } catch (error) {
      console.error('Failed to load units:', error)
      setUnits([]) // Set empty array on error
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate non-base unit has baseUnitId and conversion factor
    if (!isBaseUnit) {
      if (!formData.baseUnitId) {
        toast({
          title: 'Error',
          description: t('units.selectUnitError'),
          variant: 'destructive',
        })
        return
      }
      if (!formData.conversionFactor || formData.conversionFactor <= 0) {
        toast({
          title: 'Error',
          description: t('units.conversionFactorError'),
          variant: 'destructive',
        })
        return
      }
    }
    
    setLoading(true)
    try {
      const submitData = {
        nameAr: formData.nameAr || '',
        nameEn: formData.nameEn || '',
        baseUnitId: isBaseUnit ? null : formData.baseUnitId,
        conversionFactor: isBaseUnit ? 1 : formData.conversionFactor,
      }
      
      if (editingId) {
        await api.put(`/units/${editingId}`, submitData)
        toast({ title: 'Success', description: 'Unit updated' })
      } else {
        await api.post('/units', submitData)
        toast({ title: 'Success', description: 'Unit created' })
      }
      setShowForm(false)
      setEditingId(null)
      setIsBaseUnit(true)
      setFormData({
        nameAr: '',
        nameEn: '',
        baseUnitId: null,
        conversionFactor: 1,
      })
      loadUnits()
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

  const handleEdit = (unit: Unit) => {
    setEditingId(unit.id!)
    setIsBaseUnit(unit.baseUnitId === null)
    setFormData({
      ...unit,
      nameAr: unit.nameAr || unit.name || '',
      nameEn: unit.nameEn || unit.name || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this unit?')) return
    try {
      await api.delete(`/units/${id}`)
      toast({ title: 'Success', description: 'Unit deleted' })
      loadUnits()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Delete failed',
        variant: 'destructive',
      })
    }
  }

  // Helper function to get unit hierarchy path
  const getUnitPath = (unit: Unit): string => {
    if (!unit.baseUnitId) return getLocalizedName(unit)
    const baseUnit = units.find((u) => u.id === unit.baseUnitId)
    if (!baseUnit) return getLocalizedName(unit)
    return `${getUnitPath(baseUnit)} → ${getLocalizedName(unit)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('units.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('units.example')}</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setIsBaseUnit(true)
            setFormData({
              name: '',
              baseUnitId: null,
              conversionFactor: 1,
            })
          }}
        >
          <Plus className="w-4 h-4 me-2" />
          {t('units.newUnit')}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-secondary-50 border-secondary-200">
        <CardContent className="pt-6">
          <div className="text-sm text-secondary-900">
            <p className="font-semibold mb-2">📋 {t('units.howItWorks')}</p>
            <ul className="list-disc list-inside space-y-1 text-secondary-800">
              <li>
                <strong>{t('units.baseUnit')}:</strong> {t('units.baseUnitDesc')}
              </li>
              <li>
                <strong>{t('units.nonBaseUnit')}:</strong> {t('units.nonBaseUnitDesc')}
              </li>
              <li>
                <strong>{t('units.conversionFactor')}:</strong> {t('units.conversionFactorDesc')}
              </li>
              <li>
                <strong>{t('common.example')}:</strong> {t('units.example')}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingId ? t('common.edit') : t('units.newUnit')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Unit Type Selection */}
              <div>
                <Label className="mb-3 block">{t('units.unitType')}</Label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="unitType"
                      checked={isBaseUnit}
                      onChange={() => {
                        setIsBaseUnit(true)
                        setFormData({
                          ...formData,
                          baseUnitId: null,
                          conversionFactor: 1,
                        })
                      }}
                      className="w-4 h-4 text-secondary-600"
                    />
                    <span className="font-medium">{t('units.baseUnit')}</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="unitType"
                      checked={!isBaseUnit}
                      onChange={() => {
                        setIsBaseUnit(false)
                        setFormData({
                          ...formData,
                          conversionFactor: 1,
                        })
                      }}
                      className="w-4 h-4 text-secondary-600"
                    />
                    <span className="font-medium">{t('units.nonBaseUnit')}</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {isBaseUnit
                    ? t('units.baseUnitDesc')
                    : t('units.nonBaseUnitDesc')}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('units.unitName')} - {t('common.welcome') === 'مرحباً' ? 'العربية' : 'Arabic'}</Label>
                  <Input
                    value={formData.nameAr || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label>{t('units.unitName')} - English</Label>
                  <Input
                    value={formData.nameEn || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, nameEn: e.target.value })
                    }
                    required
                  />
                </div>

                {/* Show base unit selector only for non-base units */}
                {!isBaseUnit && (
                  <div>
                    <Label>{t('units.linkToUnit')}</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={formData.baseUnitId || ''}
                      onChange={(e) => {
                        const selectedId = e.target.value
                          ? parseInt(e.target.value)
                          : null
                        setFormData({
                          ...formData,
                          baseUnitId: selectedId,
                          conversionFactor: selectedId ? formData.conversionFactor : 1,
                        })
                      }}
                      required={!isBaseUnit}
                    >
                      <option value="">{t('units.selectUnit')}</option>
                      {units
                        .filter((u) => u.id !== editingId)
                        .map((unit) => (
                          <option key={unit.id} value={unit.id}>
                            {getLocalizedName(unit)}
                            {unit.baseUnitId === null && ' (Base Unit)'}
                          </option>
                        ))}
                    </select>
                    {formData.baseUnitId && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('units.linkedToHint')}
                      </p>
                    )}
                  </div>
                )}

                {/* Show conversion factor only for non-base units */}
                {!isBaseUnit && (
                  <div>
                    <Label>{t('units.conversionFactor')}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.conversionFactor}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          conversionFactor: parseFloat(e.target.value) || 1,
                        })
                      }
                      required={!isBaseUnit}
                    />
                    {formData.baseUnitId && (formData.nameAr || formData.nameEn) && (
                      <p className="text-xs text-gray-500 mt-1">
                        {`${formData.conversionFactor || 1} ${getLocalizedName(formData)} = 1 ${
                          getLocalizedName(units.find((u) => u.id === formData.baseUnitId) || {}) || ''
                        }`}
                      </p>
                    )}
                  </div>
                )}
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
          <CardTitle>{t('units.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('units.unitName')}</TableHead>
                <TableHead>{t('units.baseUnit')}</TableHead>
                <TableHead>{t('units.conversion')}</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {units.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">
                    No units found
                  </TableCell>
                </TableRow>
              ) : (
                units.map((unit) => {
                  const isBase = unit.baseUnitId === null
                  const unitName = getLocalizedName(unit) || unit.nameAr || unit.nameEn || unit.name || 'N/A'
                  return (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium" style={{ minHeight: '20px', display: 'block' }}>{unitName}</span>
                          {isBase && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-secondary-100 text-secondary-800 rounded">
                              {t('units.baseUnit')}
                            </span>
                          )}
                          {!isBase && (
                            <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 rounded">
                              {t('units.nonBaseUnit')}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {!isBase ? (
                          <div>
                            <div className="font-medium">
                              {(() => {
                                const baseUnit = units.find((u) => u.id === unit.baseUnitId)
                                if (!baseUnit) return '-'
                                return getLocalizedName(baseUnit) || baseUnit.nameAr || baseUnit.nameEn || (baseUnit as any).name || '-'
                              })()}
                            </div>
                            <div className="text-xs text-gray-500">
                              {`${unit.conversionFactor} ${unitName} = 1 ${
                                (() => {
                                  const baseUnit = units.find((u) => u.id === unit.baseUnitId)
                                  if (!baseUnit) return ''
                                  return getLocalizedName(baseUnit) || baseUnit.nameAr || baseUnit.nameEn || (baseUnit as any).name || ''
                                })()
                              }`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!isBase ? (
                          <span className="font-medium">
                            {unit.conversionFactor}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 font-mono">
                          {getUnitPath(unit)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(unit)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(unit.id!)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
